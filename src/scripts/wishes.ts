import type { ApiError, PublicWish, WishesPage, WishResult } from '../lib/contracts';
import { invitation } from '../content/invitation';

const tokenPattern = /^[A-Za-z0-9_-]{16}$/;
const tokenStorageKey = 'lamaran-invitation';

// Group links end in `#<code>`. Fragments are not sent in page requests or access logs.
// The code moves to this tab's session storage and leaves the address bar, so copied
// URLs and screenshots taken after opening do not reveal it.
function readInvitationToken(): string {
  const fragment = location.hash.slice(1);
  if (tokenPattern.test(fragment)) {
    try { sessionStorage.setItem(tokenStorageKey, fragment); } catch { /* storage unavailable: keep it for this page only */ }
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    return fragment;
  }
  try {
    const stored = sessionStorage.getItem(tokenStorageKey) ?? '';
    return tokenPattern.test(stored) ? stored : '';
  } catch { return ''; }
}

export function initWishes() {
  const section = document.querySelector<HTMLElement>('#wishes');
  const form = document.querySelector<HTMLFormElement>('[data-wishes-form]');
  const fieldset = form?.querySelector('fieldset');
  const status = document.querySelector<HTMLElement>('[data-wishes-status]');
  const list = document.querySelector<HTMLElement>('[data-wishes-list]');
  const listStatus = document.querySelector<HTMLElement>('[data-wishes-list-status]');
  const pagination = document.querySelector<HTMLElement>('[data-wishes-pagination]');
  const heading = document.querySelector<HTMLElement>('[data-wishes-list-heading]');
  if (!section || !form || !fieldset || !status || !list || !listStatus || !pagination || !heading) return;
  const token = readInvitationToken();
  const authorizedLink = token !== '';
  fieldset.disabled = !authorizedLink;
  // status.textContent = authorizedLink
  //   ? 'Ucapan Anda akan tampil setelah berhasil dikirim.'
  //   : 'Buka tautan undangan pribadi Anda untuk mengirim ucapan.';

  let loadVersion = 0;
  async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), 12000);
    try {
      const response = await fetch(url, { ...options, signal: abort.signal });
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Layanan ucapan sedang tidak tersedia. Silakan coba lagi nanti.');
      }
      const body = await response.json() as T & ApiError;
      if (!response.ok) throw new Error(body.error?.message ?? 'Terjadi kendala. Silakan coba lagi.');
      return body;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError' && !(error instanceof TypeError) && !(error instanceof SyntaxError)) throw error;
      throw new Error('Tidak dapat terhubung. Periksa koneksi Anda lalu coba lagi.');
    } finally { window.clearTimeout(timer); }
  }
  const createWishArticle = (wish: PublicWish) => {
    const article = document.createElement('article');
    article.dataset.wishId = wish.id;
    const name = document.createElement('h4');
    const message = document.createElement('p');
    const date = document.createElement('time');
    name.textContent = wish.name;
    message.textContent = wish.message;
    date.dateTime = wish.createdAt;
    date.textContent = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: invitation.event.timeZone }).format(new Date(wish.createdAt));
    article.append(name, message, date);
    return article;
  };
  const pageSize = 5;
  let currentPage = 1;
  let total = 0;
  const pageCount = () => Math.max(1, Math.ceil(total / pageSize));
  // Show every page when there are few; otherwise the first, last and neighbours of the current one.
  const pageNumbers = (count: number): Array<number | null> => {
    if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
    const start = Math.max(2, Math.min(currentPage - 1, count - 4));
    const end = Math.min(count - 1, Math.max(currentPage + 1, 5));
    const numbers: Array<number | null> = [1];
    if (start > 2) numbers.push(null);
    for (let n = start; n <= end; n++) numbers.push(n);
    if (end < count - 1) numbers.push(null);
    numbers.push(count);
    return numbers;
  };
  const pageButton = (label: string, target: number, accessibleName: string) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-label', accessibleName);
    button.dataset.page = String(target);
    if (target === currentPage) button.setAttribute('aria-current', 'page');
    return button;
  };
  const renderPagination = () => {
    const count = pageCount();
    if (total <= pageSize) { pagination.replaceChildren(); pagination.hidden = true; return; }
    const content = document.createDocumentFragment();
    const previous = pageButton('‹', currentPage - 1, 'Halaman sebelumnya');
    previous.disabled = currentPage === 1;
    previous.removeAttribute('aria-current');
    content.append(previous);
    for (const n of pageNumbers(count)) {
      if (n === null) {
        const gap = document.createElement('span');
        gap.textContent = '…';
        gap.setAttribute('aria-hidden', 'true');
        content.append(gap);
      } else content.append(pageButton(String(n), n, `Halaman ${n}`));
    }
    const next = pageButton('›', currentPage + 1, 'Halaman berikutnya');
    next.disabled = currentPage === count;
    next.removeAttribute('aria-current');
    content.append(next);
    pagination.replaceChildren(content);
    pagination.hidden = false;
  };
  const load = async (target = currentPage, moveFocus = false) => {
    const version = ++loadVersion;
    listStatus!.textContent = 'Memuat ucapan…';
    pagination.setAttribute('aria-busy', 'true');
    try {
      const page = await request<WishesPage>(`/api/wishes?limit=${pageSize}&page=${target}`, { cache: 'no-cache' });
      if (version !== loadVersion) return;
      if (!Array.isArray(page.items) || !Number.isSafeInteger(page.total)) throw new Error('Ucapan belum dapat dimuat. Silakan coba lagi.');
      total = page.total;
      // The requested page no longer exists (wishes were hidden): show the last one instead.
      if (!page.items.length && total > 0 && target > pageCount()) { void load(pageCount(), moveFocus); return; }
      currentPage = target;
      const content = document.createDocumentFragment();
      for (const wish of page.items.slice(0, pageSize)) content.append(createWishArticle(wish));
      list.replaceChildren(content);
      listStatus.textContent = page.items.length ? '' : 'Belum ada ucapan yang ditampilkan. Jadilah yang pertama menitipkan doa.';
      renderPagination();
      if (moveFocus) {
        heading.focus({ preventScroll: true });
        if (heading.getBoundingClientRect().top < 0) heading.scrollIntoView({ block: 'start' });
      }
    } catch (error) {
      if (version === loadVersion) listStatus.textContent = (error as Error).message;
    } finally {
      if (version === loadVersion) pagination.removeAttribute('aria-busy');
    }
  };
  pagination.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-page]');
    if (!button || button.disabled) return;
    const target = Number(button.dataset.page);
    if (target >= 1 && target <= pageCount() && target !== currentPage) void load(target, true);
  });
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
      if (result.status === 'approved') {
        if (currentPage !== 1) await load(1, true);
        ++loadVersion;
        currentPage = 1;
        pagination.removeAttribute('aria-busy');
        // Cached pages can lag behind; show the sender's wish at the top of the first page now.
        const listed = [...list.children].find((article) => (article as HTMLElement).dataset.wishId === result.wish.id);
        if (listed) listed.remove(); else total++;
        list.prepend(createWishArticle(result.wish));
        while (list.children.length > pageSize) list.lastElementChild?.remove();
        listStatus.textContent = '';
        renderPagination();
        status.textContent = 'Terima kasih! Ucapan Anda sudah tampil.';
      } else if (result.status === 'hidden') {
        status.textContent = 'Ucapan ini tersimpan, tetapi tidak ditampilkan.';
      } else throw new Error('Ucapan belum dapat ditampilkan. Silakan coba lagi.');
      form.reset();
      attempt = undefined;
    } catch (error) { status.textContent = (error as Error).message; }
    finally { pending = false; fieldset.disabled = false; }
  });
}
