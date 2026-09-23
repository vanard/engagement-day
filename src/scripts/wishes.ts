import type { ApiError, WishesPage, WishResult } from '../lib/contracts';
import { invitation } from '../content/invitation';

export function initWishes() {
  const section = document.querySelector<HTMLElement>('#wishes');
  const form = document.querySelector<HTMLFormElement>('[data-wishes-form]');
  const fieldset = form?.querySelector('fieldset');
  const status = document.querySelector<HTMLElement>('[data-wishes-status]');
  const note = document.querySelector<HTMLElement>('[data-wishes-note]');
  const list = document.querySelector<HTMLElement>('[data-wishes-list]');
  const listStatus = document.querySelector<HTMLElement>('[data-wishes-list-status]');
  if (!section || !form || !fieldset || !status || !note || !list || !listStatus) return;
  // Fragments are not sent to the server in page requests or access logs.
  const token = new URLSearchParams(location.hash.slice(1)).get('token') ?? '';
  const authorizedLink = /^[A-Za-z0-9_-]{43}$/.test(token);
  fieldset.disabled = !authorizedLink;
  if (authorizedLink) note.textContent = 'Ucapan Anda akan ditampilkan setelah disetujui. Terima kasih atas doa baik Anda.';

  let loadVersion = 0;
  async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), 12000);
    try {
      const response = await fetch(url, { ...options, signal: abort.signal });
      const body = await response.json() as T & ApiError;
      if (!response.ok) throw new Error(body.error?.message ?? 'Terjadi kendala. Silakan coba lagi.');
      return body;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError' && !(error instanceof TypeError) && !(error instanceof SyntaxError)) throw error;
      throw new Error('Tidak dapat terhubung. Periksa koneksi Anda lalu coba lagi.');
    } finally { window.clearTimeout(timer); }
  }
  const load = async () => {
    const version = ++loadVersion;
    listStatus!.textContent = 'Memuat ucapan…';
    try {
      const page = await request<WishesPage>('/api/wishes?limit=3', { cache: 'no-cache' });
      if (version !== loadVersion) return;
      if (!Array.isArray(page.items)) throw new Error('Ucapan belum dapat dimuat. Silakan coba lagi.');
      const content = document.createDocumentFragment();
      for (const wish of page.items.slice(0, 3)) {
        const article = document.createElement('article');
        const name = document.createElement('h4');
        const message = document.createElement('p');
        const date = document.createElement('time');
        name.textContent = wish.name;
        message.textContent = wish.message;
        date.dateTime = wish.createdAt;
        date.textContent = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: invitation.event.timeZone }).format(new Date(wish.createdAt));
        article.append(name, message, date);
        content.append(article);
      }
      list.replaceChildren(content);
      listStatus.textContent = page.items.length ? '' : 'Belum ada ucapan yang ditampilkan. Jadilah yang pertama menitipkan doa.';
    } catch (error) {
      if (version === loadVersion) listStatus.textContent = (error as Error).message;
    }
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); void load(); }
    }, { rootMargin: '200px' });
    observer.observe(section);
  } else { void load(); }

  let pending = false;
  let attempt: { name: string; message: string; idempotencyKey: string } | undefined;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending || !authorizedLink || !form.reportValidity()) return;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();
    if (!name || !message) { status.textContent = 'Isi nama dan ucapan Anda terlebih dahulu.'; return; }
    // Keep the same key after a lost response, even if the visitor edits the form.
    // A changed payload with a saved key gets an explicit conflict, never a duplicate.
    attempt ??= { name, message, idempotencyKey: crypto.randomUUID() };
    pending = true;
    fieldset.disabled = true;
    status.textContent = 'Mengirim ucapan…';
    try {
      const result = await request<WishResult>('/api/wishes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, name, message, idempotencyKey: attempt.idempotencyKey }) });
      if (result.saved !== true) throw new Error('Ucapan belum tersimpan. Silakan coba lagi.');
      status.textContent = 'Terima kasih! Ucapan Anda sudah tersimpan dan menunggu persetujuan.';
      form.reset();
      attempt = undefined;
      void load();
    } catch (error) { status.textContent = (error as Error).message; }
    finally { pending = false; fieldset.disabled = false; }
  });
}
