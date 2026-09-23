export function initMusic() {
  const player = document.querySelector<HTMLElement>('[data-music-player]');
  const audio = document.querySelector<HTMLAudioElement>('[data-audio]');
  const button = document.querySelector<HTMLButtonElement>('[data-music-toggle]');
  const label = document.querySelector<HTMLElement>('[data-music-label]');
  const status = document.querySelector<HTMLElement>('[data-music-status]');
  if (!player || !audio || !button || !label || !status) return { open(_playMusic: boolean) {} };

  const update = () => {
    const playing = !audio.paused;
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? 'Jeda musik' : 'Putar musik');
    label.textContent = playing ? 'Jeda musik' : 'Putar musik';
  };
  const play = () => {
    if (!audio.getAttribute('src')) return;
    status.textContent = '';
    // Called synchronously from the user's click to preserve iOS activation.
    void audio.play().catch(() => {
      status.textContent = audio.error ? 'Musik tidak dapat dimuat. Coba lagi nanti.' : 'Ketuk tombol untuk memutar musik.';
      update();
    });
  };
  audio.addEventListener('play', update);
  audio.addEventListener('pause', update);
  audio.addEventListener('error', () => { status.textContent = 'Musik tidak dapat dimuat. Coba lagi nanti.'; update(); });
  button.addEventListener('click', () => { if (audio.paused) play(); else audio.pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) audio.pause(); });
  return { open(playMusic: boolean) { player.hidden = false; if (playMusic) play(); } };
}
