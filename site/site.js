// Antikythera Cosmos landing page: each object's clip plays while it is on screen and rests when it is not.
// The page works without this script; only the motion needs it.
(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection;
  // Only real data saver or a very slow link skips autoplay (a "3g" label is common on fine connections).
  const saveData = !!(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')));

  const play = (v) => {
    if (saveData || reduced) {
      v.controls = true;
      return;
    }
    if (v.preload === 'none') v.preload = 'auto';
    v.play().catch(() => (v.controls = true));
  };

  // the entrance loop: on reduced motion or data saver it waits for the visitor instead
  const hero = document.getElementById('hero-video');
  if (hero && (saveData || reduced)) {
    hero.removeAttribute('autoplay');
    hero.pause();
    hero.controls = true;
  }

  const inview = [...document.querySelectorAll('video[data-inview]')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) play(e.target);
          else e.target.pause();
        }
      },
      { threshold: 0.4 },
    );
    inview.forEach((v) => io.observe(v));
    if (hero && !saveData && !reduced) io.observe(hero);
  } else {
    inview.forEach((v) => (v.controls = true));
  }
})();
