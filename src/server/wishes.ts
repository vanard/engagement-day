import { createHash } from 'node:crypto';
import type { PublicWish, WishInput } from '../lib/contracts.ts';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const maxBytes = 8192;
class ApiFailure extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
function reply(body: unknown, status = 200, cache = 'no-store') {
  return Response.json(body, { status, headers: { 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' } });
}
function failure(error: unknown) {
  if (error instanceof ApiFailure) {
    const response = reply({ error: { code: error.code, message: error.message } }, error.status);
    if (error.status === 429) response.headers.set('Retry-After', '3600');
    return response;
  }
  return reply({ error: { code: 'UNAVAILABLE', message: 'Buku ucapan belum dapat diakses. Silakan coba lagi.' } }, 503);
}
async function readInput(request: Request): Promise<WishInput> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new ApiFailure(415, 'CONTENT_TYPE', 'Gunakan format JSON.');
  }
  if (Number(request.headers.get('content-length')) > maxBytes) throw new ApiFailure(413, 'TOO_LARGE', 'Ucapan terlalu panjang.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiFailure(400, 'INVALID_INPUT', 'Lengkapi nama dan ucapan.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ApiFailure(413, 'TOO_LARGE', 'Ucapan terlalu panjang.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch { throw new ApiFailure(400, 'INVALID_INPUT', 'Data ucapan tidak valid.'); }
  if (typeof body.token !== 'string' || !tokenPattern.test(body.token)) throw new ApiFailure(401, 'INVALID_TOKEN', 'Gunakan tautan undangan pribadi Anda untuk mengirim ucapan.');
  if (typeof body.idempotencyKey !== 'string' || !uuid.test(body.idempotencyKey)) throw new ApiFailure(400, 'INVALID_INPUT', 'Muat ulang halaman sebelum mengirim ucapan.');
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!name || [...name].length > 100 || !message || [...message].length > 1000) throw new ApiFailure(400, 'INVALID_INPUT', 'Isi nama (maksimal 100 karakter) dan ucapan (maksimal 1.000 karakter).');
  return { token: body.token, idempotencyKey: body.idempotencyKey, name, message };
}

export function createWishesHandlers(config: () => { url?: string; key?: string }, fetcher: typeof fetch = fetch) {
  async function database(path: string, init: RequestInit = {}) {
    const { url, key } = config();
    if (!url || !key) throw new Error('Database not configured');
    const headers = new Headers(init.headers);
    headers.set('apikey', key);
    if (!key.startsWith('sb_secret_')) headers.set('Authorization', `Bearer ${key}`);
    headers.set('Content-Type', 'application/json');
    const response = await fetcher(`${url.replace(/\/$/, '')}/rest/v1/${path}`, { ...init, headers, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Database request failed');
    return response.json();
  }
  return {
    async GET(request: Request) {
      try {
        const url = new URL(request.url);
        const limitText = url.searchParams.get('limit') ?? '3';
        if (!/^\d{1,2}$/.test(limitText) || Number(limitText) < 1 || Number(limitText) > 50) throw new ApiFailure(400, 'INVALID_PAGE', 'Ukuran halaman tidak valid.');
        const limit = Number(limitText);
        const query = new URLSearchParams({ select: 'id,name,message,created_at', approved: 'eq.true', order: 'created_at.desc,id.desc', limit: String(limit + 1) });
        const cursor = url.searchParams.get('cursor');
        if (cursor) {
          let parsed: { createdAt: string; id: string };
          try {
            if (cursor.length > 300 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error();
            parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
            if (!uuid.test(parsed.id) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|\+00:00)$/.test(parsed.createdAt) || !Number.isFinite(Date.parse(parsed.createdAt))) throw new Error();
          } catch { throw new ApiFailure(400, 'INVALID_PAGE', 'Halaman ucapan tidak valid.'); }
          query.set('or', `(created_at.lt.${parsed.createdAt},and(created_at.eq.${parsed.createdAt},id.lt.${parsed.id}))`);
        }
        const rows = await database(`wishes?${query}`) as Array<{ id: string; name: string; message: string; created_at: string }>;
        const items: PublicWish[] = rows.slice(0, limit).map((row) => ({ id: row.id, name: row.name, message: row.message, createdAt: row.created_at }));
        const last = items.at(-1);
        const nextCursor = rows.length > limit && last ? Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: last.id })).toString('base64url') : null;
        return reply({ items, nextCursor }, 200, 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
      } catch (error) { return failure(error); }
    },
    async POST(request: Request) {
      try {
        const input = await readInput(request);
        const result = await database('rpc/submit_wish', { method: 'POST', body: JSON.stringify({
          p_token_hash: createHash('sha256').update(input.token).digest('hex'),
          p_key: input.idempotencyKey, p_name: input.name, p_message: input.message,
        }) }) as { outcome: string };
        if (result.outcome === 'invalid_token') throw new ApiFailure(401, 'INVALID_TOKEN', 'Tautan undangan tidak valid. Hubungi pasangan untuk tautan pribadi Anda.');
        if (result.outcome === 'rate_limited') throw new ApiFailure(429, 'RATE_LIMITED', 'Batas pengiriman tercapai. Silakan coba lagi dalam satu jam.');
        if (result.outcome === 'conflict') throw new ApiFailure(409, 'RETRY_CONFLICT', 'Percobaan sebelumnya sudah tersimpan dengan isi berbeda. Muat ulang halaman sebelum menulis ucapan baru.');
        if (result.outcome !== 'saved') throw new Error('Unexpected save result');
        return reply({ saved: true, status: 'pending' });
      } catch (error) { return failure(error); }
    },
  };
}
