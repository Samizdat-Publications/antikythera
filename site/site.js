// Antikythera Cosmos landing page. Clips play while they are on screen; the turning year is drawn
// from 73 frames filmed off the running exhibit, one every 1/72 of a turn of the main wheel, and the
// scroll picks the frame. The dates, Saros cells and eclipse notes were read off the exhibit's own
// column as each frame was filmed. The page reads without this script; only the motion needs it.
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection;
  // only real data saver or a very slow link skips autoplay (a "3g" label is common on fine connections)
  const saveData = !!(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')));
  const still = saveData || reduced;

  // ---- clips ----
  const hero = document.getElementById('hero-video');
  if (hero && still) { hero.removeAttribute('autoplay'); hero.pause(); hero.controls = true; }
  const clips = [...document.querySelectorAll('video[data-inview]')];
  if (still || !('IntersectionObserver' in window)) {
    clips.forEach((v) => (v.controls = true));
  } else {
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        const v = e.target;
        if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => (v.controls = true)); }
        else v.pause();
      }
    }, { threshold: 0.35 });
    clips.forEach((v) => io.observe(v));
  }

  // ---- one crank, one year ----
  const DATES = ["12 May 205 BC", "17 May 205 BC", "22 May 205 BC", "27 May 205 BC", "1 Jun 205 BC", "6 Jun 205 BC", "11 Jun 205 BC", "17 Jun 205 BC", "22 Jun 205 BC", "27 Jun 205 BC", "2 Jul 205 BC", "7 Jul 205 BC", "12 Jul 205 BC", "17 Jul 205 BC", "22 Jul 205 BC", "27 Jul 205 BC", "1 Aug 205 BC", "6 Aug 205 BC", "11 Aug 205 BC", "16 Aug 205 BC", "21 Aug 205 BC", "27 Aug 205 BC", "1 Sep 205 BC", "6 Sep 205 BC", "11 Sep 205 BC", "16 Sep 205 BC", "21 Sep 205 BC", "26 Sep 205 BC", "1 Oct 205 BC", "6 Oct 205 BC", "11 Oct 205 BC", "16 Oct 205 BC", "21 Oct 205 BC", "26 Oct 205 BC", "31 Oct 205 BC", "6 Nov 205 BC", "11 Nov 205 BC", "16 Nov 205 BC", "21 Nov 205 BC", "26 Nov 205 BC", "1 Dec 205 BC", "6 Dec 205 BC", "11 Dec 205 BC", "16 Dec 205 BC", "21 Dec 205 BC", "26 Dec 205 BC", "31 Dec 205 BC", "5 Jan 204 BC", "10 Jan 204 BC", "16 Jan 204 BC", "21 Jan 204 BC", "26 Jan 204 BC", "31 Jan 204 BC", "5 Feb 204 BC", "10 Feb 204 BC", "15 Feb 204 BC", "20 Feb 204 BC", "25 Feb 204 BC", "2 Mar 204 BC", "7 Mar 204 BC", "12 Mar 204 BC", "17 Mar 204 BC", "23 Mar 204 BC", "28 Mar 204 BC", "2 Apr 204 BC", "7 Apr 204 BC", "12 Apr 204 BC", "17 Apr 204 BC", "22 Apr 204 BC", "27 Apr 204 BC", "2 May 204 BC", "7 May 204 BC", "12 May 204 BC"];
  const CELLS = [1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13];
  const NOTES = [
    { from: 4, to: 9, html: '<p><b>Saros cell 2</b> carries <span class="glyph">Σ</span>, a lunar eclipse.</p><p class="sky">NASA\'s canon: a partial lunar eclipse on 11 Jun 205 BC. A hit.</p><p>The total solar eclipse of 25 Jun 205 BC has no glyph here: a miss, and the exhibit counts it as one.</p>' },
    { from: 39, to: 43, html: '<p><b>Saros cell 8</b> carries <span class="glyph">Σ</span> and <span class="glyph">Η</span>, both kinds.</p><p class="sky">NASA\'s canon: a total lunar eclipse on 5 Dec 205 BC and a partial solar eclipse on 20 Dec 205 BC. Two hits.</p>' },
    { from: 68, to: 72, html: '<p><b>Saros cell 13</b> carries <span class="glyph">Η</span>, a solar eclipse.</p><p class="sky">NASA\'s canon: a partial solar eclipse on 17 May 204 BC. A hit.</p>' },
  ];
  const N = DATES.length;
  const track = document.querySelector('.year-track');
  const canvas = document.getElementById('year-canvas');
  if (!track || !canvas) return;
  const ctx = canvas.getContext('2d');
  const dateEl = document.getElementById('year-date');
  const turnEl = document.getElementById('year-turn');
  const cellEl = document.getElementById('year-cell');
  const wheel = document.getElementById('wheel-turn');
  const noteEl = document.getElementById('year-note');
  const frames = new Array(N);
  let shown = -1, want = 0, noteOn = -1;

  const load = (i) => {
    if (frames[i]) return frames[i];
    const im = new Image();
    im.decoding = 'async';
    im.src = 'media/scrub/f' + String(i).padStart(2, '0') + '.webp';
    im.onload = () => { if (i === want || shown < 0) draw(); };
    return (frames[i] = im);
  };
  // the first frame now, then every eighth, then the rest, so a fast scroll always has something near
  const warm = () => { for (let s of [8, 4, 2, 1]) for (let i = 0; i < N; i += s) load(i); };

  const nearestLoaded = (i) => {
    for (let d = 0; d < N; d++) {
      for (const j of [i - d, i + d]) if (j >= 0 && j < N && frames[j] && frames[j].complete && frames[j].naturalWidth) return j;
    }
    return -1;
  };

  function size() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    shown = -1; draw();
  }
  function draw() {
    const j = nearestLoaded(want);
    if (j < 0) return;
    if (j !== shown) {
      const im = frames[j], cw = canvas.width, ch = canvas.height;
      const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
      const w = im.naturalWidth * s, h = im.naturalHeight * s;
      ctx.fillStyle = '#0f0c09'; ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
      shown = j;
    }
    dateEl.textContent = DATES[want];
    turnEl.textContent = (want / (N - 1)).toFixed(2);
    cellEl.textContent = 'Saros cell ' + CELLS[want] + ' on the back';
    wheel.style.strokeDashoffset = String(1 - want / (N - 1));
    // a note lingers a few frames past its month, so a quick scroll still leaves time to read it
    const k = NOTES.findIndex((n, i) => want >= n.from && want <= Math.min(n.to + 3, (NOTES[i + 1] || { from: N }).from - 1));
    if (k !== noteOn) {
      noteOn = k;
      if (k < 0) noteEl.classList.remove('on');
      else { noteEl.innerHTML = NOTES[k].html; noteEl.classList.add('on'); }
    }
  }
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const r = track.getBoundingClientRect(), span = r.height - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / span));
      want = Math.round(p * (N - 1));
      draw();
    });
  }
  load(0);
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { warm(); near.disconnect(); } }, { rootMargin: '150% 0px' });
    near.observe(track);
  } else warm();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', size);
  size();
})();
