import { initMusic } from './music';
import { initReveals } from './reveal';
import { initWishes } from './wishes';

export function initInvitation() {
  const cover = document.querySelector<HTMLElement>('#cover');
  const main = document.querySelector<HTMLElement>('#invitation');
  const opener = document.querySelector<HTMLAnchorElement>('[data-open-invitation]');
  if (!cover || !main || !opener) return;
  initWishes();

  const guest = new URLSearchParams(window.location.search).get('to')?.trim().slice(0, 100);
  if (guest) document.querySelectorAll('[data-guest-name]').forEach((element) => { element.textContent = guest; });
  const music = initMusic();
  let opened = false;
  const show = () => {
    main.hidden = false;
    cover.hidden = true;
    main.focus({ preventScroll: true });
    initReveals();
  };
  const open = (playMusic: boolean) => {
    if (opened) return;
    opened = true;
    music.open(playMusic);
    show();
  };
  opener.addEventListener('click', (event) => {
    event.preventDefault();
    if (opened) return;
    opened = true;
    // Music starts inside the click gesture; the envelope animation follows.
    music.open(true);
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (animate) {
      // The welcome card gets its own entrance instead of the scroll reveal.
      main.querySelector('#welcome [data-reveal]')?.removeAttribute('data-reveal');
      main.classList.add('is-arriving');
      cover.classList.add('is-leaving');
    }
    const finish = () => {
      show();
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    if (animate) window.setTimeout(finish, 650);
    else finish();
    if (!new URLSearchParams(location.hash.slice(1)).has('token')) {
      history.replaceState(null, '', `${location.pathname}${location.search}#invitation`);
    }
  });
  document.querySelector('.skip-link')?.addEventListener('click', () => open(false));
  // Direct section links work, but never bypass the browser's music gesture rules.
  const section = document.getElementById(location.hash.slice(1));
  if (section && (section === main || main.contains(section))) {
    open(false);
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } else {
    // Applied only after the opening handler is ready. Without JS all content stays readable.
    main.hidden = true;
  }
}
