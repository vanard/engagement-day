export function initMusic() {
  const player = document.querySelector<HTMLElement>('[data-music-player]');
  const audio = document.querySelector<HTMLAudioElement>('[data-audio]');
  const button = document.querySelector<HTMLButtonElement>('[data-music-toggle]');
  const label = document.querySelector<HTMLElement>('[data-music-label]');
  const status = document.querySelector<HTMLElement>('[data-music-status]');
  if (!player || !audio || !button || !label || !status) return { open(_playMusic: boolean) {} };

  let playbackWanted = false;
  let resumeAfterAway = false;
  let playRequest = 0;

  const update = () => {
    const playing = !audio.paused;
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? 'Jeda musik' : 'Putar musik');
    label.textContent = playing ? 'Jeda musik' : 'Putar musik';
  };
  const play = () => {
    if (!audio.getAttribute('src')) return;
    playbackWanted = true;
    const request = ++playRequest;
    status.textContent = '';
    // Called synchronously from the user's click to preserve iOS activation.
    void audio.play().catch(() => {
      if (request !== playRequest || !playbackWanted || document.hidden) return;
      playbackWanted = false;
      resumeAfterAway = false;
      status.textContent = audio.error ? 'Musik tidak dapat dimuat. Coba lagi nanti.' : 'Ketuk tombol untuk memutar musik.';
      update();
    });
  };
  audio.addEventListener('play', update);
  audio.addEventListener('pause', update);
  audio.addEventListener('error', () => {
    playbackWanted = false;
    resumeAfterAway = false;
    ++playRequest;
    status.textContent = 'Musik tidak dapat dimuat. Coba lagi nanti.';
    update();
  });
  button.addEventListener('click', () => {
    if (audio.paused) play();
    else {
      playbackWanted = false;
      resumeAfterAway = false;
      ++playRequest;
      audio.pause();
    }
  });
  const suspend = () => {
    if (!playbackWanted) return;
    resumeAfterAway = true;
    ++playRequest;
    audio.pause();
  };
  const resume = () => {
    if (document.hidden || !resumeAfterAway || !playbackWanted) return;
    resumeAfterAway = false;
    if (audio.paused) play();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); else resume(); });
  window.addEventListener('pagehide', suspend);
  window.addEventListener('pageshow', resume);
  return { open(playMusic: boolean) { player.hidden = false; if (playMusic) play(); } };
}
