import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createWishesHandlers } from '../../src/server/wishes.ts';

const token = randomBytes(12).toString('base64url');
const tokenHash = createHash('sha256').update(token).digest('hex');
const input = { token, idempotencyKey: randomUUID(), name: 'Guest', message: 'Selamat!' };
const post = (body: unknown) => new Request('https://invitation.test/api/wishes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const config = () => ({ url: 'https://database.test', key: 'sb_secret_test' });

test('rejects malformed, unauthorized and oversized submissions before database access', async () => {
  const api = createWishesHandlers(config, async () => { throw new Error('Unexpected database access'); });
  for (const [body, status] of [[null, 400], [{ ...input, token: '' }, 401], [{ ...input, token: randomBytes(32).toString('base64url') }, 401], [{ ...input, name: ' ' }, 400], [{ ...input, message: 'a'.repeat(1001) }, 400], [{ ...input, idempotencyKey: 'bad' }, 400], [{ ...input, extra: 'x'.repeat(9000) }, 413]] as const) {
    assert.equal((await api.POST(post(body))).status, status);
  }
  assert.equal((await api.POST(new Request('https://invitation.test/api/wishes', { method: 'POST', body: 'text' }))).status, 415);
});

test('numbered pages request approved rows only, report the total, and strip all private fields', async () => {
  let requested = '';
  let prefer = '';
  const rows = Array.from({ length: 5 }, (_, i) => ({ id: randomUUID(), name: `Guest ${i}`, message: 'Hello', created_at: '2026-09-23T12:00:00.123456+00:00', party_id: 'PRIVATE', token_hash: 'PRIVATE' }));
  const api = createWishesHandlers(config, async (url, options) => {
    requested = String(url);
    prefer = new Headers(options?.headers).get('Prefer') ?? '';
    return Response.json(rows, { headers: { 'Content-Range': '5-9/23' } });
  });
  const response = await api.GET(new Request('https://invitation.test/api/wishes'));
  const page = await response.json();
  assert.equal(page.items.length, 5);
  assert.deepEqual([page.page, page.pageSize, page.total], [1, 5, 23]);
  assert.ok(!JSON.stringify(page).includes('PRIVATE'));
  assert.equal(prefer, 'count=exact');
  let query = new URL(requested).searchParams;
  assert.equal(query.get('approved'), 'eq.true');
  assert.equal(query.get('select'), 'id,name,message,created_at');
  assert.equal(query.get('order'), 'created_at.desc,id.desc');
  assert.equal(query.get('limit'), '5');
  assert.equal(query.get('offset'), '0');
  assert.match(response.headers.get('Cache-Control')!, /s-maxage=60/);
  await api.GET(new Request('https://invitation.test/api/wishes?limit=5&page=3'));
  query = new URL(requested).searchParams;
  assert.equal(query.get('offset'), '10');
  for (const query of ['limit=51', 'limit=0', 'page=0', 'page=-1', 'page=x', 'page=10000']) assert.equal((await api.GET(new Request(`https://invitation.test/api/wishes?${query}`))).status, 400);
});

test('a page past the end returns no items with the current total', async () => {
  const requests: string[] = [];
  const api = createWishesHandlers(config, async (url) => {
    requests.push(String(url));
    return requests.length === 1
      ? Response.json({ code: 'PGRST103' }, { status: 416, headers: { 'Content-Range': '*/7' } })
      : Response.json([], { headers: { 'Content-Range': '0-0/7' } });
  });
  const page = await (await api.GET(new Request('https://invitation.test/api/wishes?page=4'))).json();
  assert.deepEqual([page.items, page.total, page.page], [[], 7, 4]);
  assert.equal(new URL(requests[1]).searchParams.get('offset'), '0');
  const broken = createWishesHandlers(config, async () => Response.json([]));
  assert.equal((await broken.GET(new Request('https://invitation.test/api/wishes'))).status, 503);
});

test('server hashes tokens, maps failures, and never caches private responses', async () => {
  for (const [outcome, expected] of [['saved', 200], ['invalid_token', 401], ['rate_limited', 429], ['conflict', 409], ['unexpected', 503]] as const) {
    const api = createWishesHandlers(config, async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      assert.equal(body.p_token_hash, tokenHash);
      assert.ok(!String(options?.body).includes(token));
      return Response.json(outcome === 'saved' ? { outcome, approved: true, wish: {
        id: randomUUID(), name: 'Guest', message: 'Selamat!', createdAt: '2026-09-23T12:00:00Z', token_hash: 'PRIVATE',
      } } : { outcome });
    });
    const response = await api.POST(post(input));
    assert.equal(response.status, expected);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    if (outcome === 'saved') {
      const result = await response.json();
      assert.equal(result.status, 'approved');
      assert.ok(!JSON.stringify(result).includes('PRIVATE'));
    }
    if (expected === 429) assert.equal(response.headers.get('Retry-After'), '3600');
  }
  const hidden = createWishesHandlers(config, async () => Response.json({ outcome: 'saved', approved: false }));
  assert.deepEqual(await (await hidden.POST(post(input))).json(), { saved: true, status: 'hidden' });
  const api = createWishesHandlers(() => ({}));
  assert.equal((await api.POST(post(input))).status, 503);
  assert.equal((await api.GET(new Request('https://invitation.test/api/wishes'))).status, 503);
});

test('database migrations auto-publish new wishes, allow manual hiding, and enforce retries, quotas and role separation', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    for (const name of ['0001_invitation.sql', '0002_wish_submission.sql']) await db.exec(await readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8'));
    await db.query('insert into public.invitation_parties(display_name, token_hash) values ($1,$2)', ['Synthetic Guest', tokenHash]);
    const olderKey = randomUUID();
    await db.query("insert into public.wishes(party_id, idempotency_key, name, message, created_at) select id, $1, 'Older wish', 'Hello', now() - interval '2 hours' from public.invitation_parties where token_hash = $2", [olderKey, tokenHash]);
    for (const name of ['0003_auto_publish_wishes.sql', '0004_group_invitation_quota.sql']) await db.exec(await readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8'));
    assert.equal((await db.query<{ approved: boolean }>('select approved from public.wishes where idempotency_key = $1', [olderKey])).rows[0].approved, false);
    await db.query('delete from public.wishes where idempotency_key = $1', [olderKey]);
    const submitResult = async (hash: string, key: string, name = 'Guest', message = 'Hello') => {
      const result = await db.query<{ result: { outcome: string; approved?: boolean; wish?: { id: string } } }>('select public.submit_wish($1,$2,$3,$4) as result', [hash, key, name, message]);
      return result.rows[0].result;
    };
    const submit = async (hash: string, key: string, name = 'Guest', message = 'Hello') => (await submitResult(hash, key, name, message)).outcome;
    assert.equal(await submit('0'.repeat(64), randomUUID()), 'invalid_token');
    assert.equal(await submit(tokenHash, randomUUID(), ' '), 'invalid_input');
    const key = randomUUID();
    const first = await submitResult(tokenHash, key);
    assert.equal(first.outcome, 'saved');
    assert.equal(first.approved, true);
    assert.ok(first.wish?.id);
    assert.equal(await submit(tokenHash, key), 'saved');
    assert.equal(await submit(tokenHash, key, 'Changed'), 'conflict');
    const rows = await db.query<{ approved: boolean }>('select approved from public.wishes');
    assert.equal(rows.rows.length, 1);
    assert.equal(rows.rows[0].approved, true);
    await db.query('update public.wishes set approved = false where idempotency_key = $1', [key]);
    assert.equal((await submitResult(tokenHash, key)).approved, false);
    assert.equal((await db.query<{ count: number }>('select count(*)::int as count from public.wishes where approved = true')).rows[0].count, 0);
    // A shared group code allows 30 new wishes per hour; the hidden wish counts too.
    for (let i = 1; i < 30; i++) assert.equal(await submit(tokenHash, randomUUID()), 'saved');
    assert.equal(await submit(tokenHash, randomUUID()), 'rate_limited');
    assert.equal(await submit(tokenHash, key), 'saved');
    await db.exec("update public.wishes set created_at = now() - interval '2 hours'");
    assert.equal(await submit(tokenHash, randomUUID()), 'saved');
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.invitation_parties'), /permission denied/);
    await assert.rejects(db.query('select * from public.wishes'), /permission denied/);
    await assert.rejects(submit(tokenHash, randomUUID()), /permission denied/);
    await db.exec('reset role; set role authenticated');
    await assert.rejects(db.query('select * from public.wishes'), /permission denied/);
    await assert.rejects(submit(tokenHash, randomUUID()), /permission denied/);
    await db.exec('reset role; set role service_role');
    assert.equal(await submit(tokenHash, key), 'saved');
  } finally { await db.close(); }
});
