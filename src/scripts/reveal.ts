export function initReveals(): () => void {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  // Elements are visible by default; observation adds a one-shot entrance animation.
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('reveal-active');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12 });
  document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
  return () => observer.disconnect();
}
