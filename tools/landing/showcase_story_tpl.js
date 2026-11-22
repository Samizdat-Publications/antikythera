// Showcase film, the story cut: the closed box, the case parting and the plates lifting (Viewer.setInside), the
// wheels flying out along their arbors (setApart), the crank turning them, then everything slowing, going home and
// closing, so the last frame flows back into the first. performance.now is replaced by a virtual clock advanced
// 1/fps per frame, so the exhibit's own tweens run frame-exact. For the last `fade` frames a second image is taken
// of the box as it was before it was ever opened (pristine: no events, the start date, the same camera), for
// encode to crossfade into: closing the case does not quite restore the page's first state (shadow flags).
// Run with the Playwright MCP browser_run_code_unsafe(filename=...) against the dev server on 5177.
async (page) => {
  const P = __PARAMS__;
  const S = 'C:/Users/stewa/Documents/Claude/Blender Tests/antikythera/.playwright-mcp/film/' + P.name + '/';
  const CSS = `body * { visibility: hidden !important; } .plate, .plate canvas { visibility: visible !important; } .plate { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; max-width: none !important; z-index: 99999 !important; margin: 0 !important; padding: 0 !important; border: 0 !important; } .plate canvas { width: 100% !important; height: 100% !important; }`;
  await page.setViewportSize({ width: P.w, height: P.h });
  await page.goto('http://127.0.0.1:5177/' + P.q);
  await page.waitForFunction(() => window.__viewer && window.__viewer.graph, null, { timeout: 60000 });
  await page.waitForTimeout(14000);                       // the overture (apart and home again) has finished
  await page.addStyleTag({ content: CSS });
  await page.evaluate(() => {
    dispatchEvent(new Event('resize'));
    const v = window.__viewer; v.holdOrbit = () => true; v.controls.autoRotate = false; window.__app.setPlaying(false);
    for (const o of v.set) o.visible = false;
    window.__vt = performance.now(); window.__t0 = window.__vt;
    performance.now = () => window.__vt;
  });
  await page.waitForTimeout(500);
  const N = Math.round(P.dur * P.fps);
  const list = P.only || [...Array(N).keys()];
  const raf = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  const last = Math.max(...list);
  for (let i = 0; i <= last; i++) {
    const t = i / P.fps;
    const want = list.includes(i);
    await page.evaluate(({ P, t, i }) => {
      const v = window.__viewer, app = window.__app;
      window.__vt = window.__t0 + t * 1000;
      for (const [k, at] of Object.entries(P.pristine ? {} : P.ev)) {            // fire each event once, on the first frame at or past its time
        if (t >= at && !(window.__fired ??= {})[k]) {
          window.__fired[k] = true;
          if (k === 'open') v.setInside(true);
          if (k === 'apart') v.setApart(true);
          if (k === 'home') v.setApart(false);
          if (k === 'close') v.setInside(false);
        }
      }
      // crank speed: 0, eased up, held, eased down; years is its integral (sampled finely so it is exact enough)
      const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
      const rate = (x) => P.rate * sm(P.spin[0], P.spin[1], x) * (1 - sm(P.spin[2], P.spin[3], x));
      let y = P.y0; const st = 1 / 600; for (let x = 0; x < t; x += st) y += rate(x) * Math.min(st, t - x);
      window.__y = y;
      app.setYears(P.pristine ? P.y0 : y, true);
      for (const o of v.set) o.visible = false;
      const a = (P.yaw0 + P.yawA * Math.cos(2 * Math.PI * (t + P.phase) / P.dur)) * Math.PI / 180, [tx, ty, tz] = P.c;
      // further back while the tall closed box is in frame, closer while the wheels are spread out along their arbors
      const shut = 1 - sm(P.near[0], P.near[1], t) * (1 - sm(P.near[2], P.near[3], t));
      const r = P.r + (P.rBox - P.r) * shut, h = r * Math.tan(P.pitch * Math.PI / 180);
      v.camera.position.set(tx + r * Math.sin(a), ty + h, tz + r * Math.cos(a));
      v.controls.target.set(tx, ty, tz); v.controls.update();
    }, { P, t, i });
    await raf(); await raf();
    if (!want) continue;
    const tag = String(i).padStart(4, '0');
    if (P.pristine) { await page.screenshot({ path: `${S}a_${tag}.jpg`, type: 'jpeg', quality: 95 }); continue; }
    await page.screenshot({ path: `${S}f_${tag}.${P.png ? 'png' : 'jpg'}`, type: P.png ? 'png' : 'jpeg', quality: P.png ? undefined : 95 });
    if (i >= N - P.fade && !P.png) {
      await page.evaluate((P) => window.__app.setYears(P.y0, true), P);
      await raf(); await raf();
      await page.screenshot({ path: `${S}a_${tag}.jpg`, type: 'jpeg', quality: 95 });
    }
  }
  return JSON.stringify({ frames: list.length, years: await page.evaluate(() => window.__y) });
}
