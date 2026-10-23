async (page) => {
  const P = __PARAMS__;
  const S = 'C:/Users/stewa/Documents/Claude/Blender Tests/antikythera/.playwright-mcp/film/';
  const CSS = `body * { visibility: hidden !important; } .plate, .plate canvas { visibility: visible !important; } .plate { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; max-width: none !important; z-index: 99999 !important; margin: 0 !important; padding: 0 !important; border: 0 !important; } .plate canvas { width: 100% !important; height: 100% !important; }`;
  await page.setViewportSize({ width: P.w || 1280, height: P.h || 720 });
  await page.goto('http://127.0.0.1:5177/' + P.q);
  await page.waitForFunction(() => window.__viewer && window.__viewer.graph, null, { timeout: 60000 });
  await page.waitForTimeout(P.settle || 7000);
  if (!P.ui) await page.addStyleTag({ content: CSS });
  await page.evaluate((P) => {
    dispatchEvent(new Event('resize'));
    const v = window.__viewer; v.holdOrbit = () => true; v.controls.autoRotate = false; window.__app.setPlaying(false);
    if (P.setup) (new Function(P.setup))();
  }, P);
  await page.waitForTimeout(P.after || 3000);
  const base = await page.evaluate((P) => {
    const v = window.__viewer, c = v.camera.position, t = v.controls.target;
    if (P.cam) { c.set(...P.cam[0]); t.set(...P.cam[1]); }
    if (P.dolly) c.sub(t).multiplyScalar(P.dolly).add(t);
    v.controls.update();
    return { c: c.toArray(), t: t.toArray() };
  }, P);
  const states = [];
  for (let i = 0; i < P.n; i++) {
    const st = await page.evaluate(async ({ P, i, base }) => {
      const v = window.__viewer, app = window.__app, f = P.n > 1 ? i / (P.n - 1) : 0;
      const y = (P.y0 || 0) + (P.dy || 0) * i;
      if (P.sky) window.__cosmos.tick(y, 1646679 + y * 365.24219, true);
      else if (P.dy) app.setYears(y, true);
      if (P.orbit || P.rise || P.zoom) {
        const a = (P.orbit || 0) * Math.PI / 180 * f, [cx, cy, cz] = base.c, [tx, ty, tz] = base.t;
        const k = 1 + (P.zoom || 0) * f, dx = (cx - tx) * k, dz = (cz - tz) * k;
        v.camera.position.set(tx + dx * Math.cos(a) - dz * Math.sin(a), cy + (P.rise || 0) * f, tz + dx * Math.sin(a) + dz * Math.cos(a));
        v.controls.update();
      }
      if (P.step) (new Function('i', 'f', P.step))(i, f);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (!P.record) return null;
      const rows = (sel) => [...document.querySelectorAll(sel + ' dt, ' + sel + ' .ecl-row')].map((e) => e.textContent.trim().replace(/\s+/g, ' '));
      return { i, years: y, date: document.querySelector('#date-main').textContent, ecl: [...document.querySelectorAll('#eclipse .ecl-row')].map((r) => [r.querySelector('.k')?.textContent.trim(), r.querySelector('.v')?.textContent.trim()]),
        phase: [...document.querySelectorAll('#moon-dl dt')].find((d) => d.textContent === 'Phase')?.nextElementSibling.textContent };
    }, { P, i, base });
    if (st) states.push(st);
    await page.screenshot({ path: `${S}${P.name}_${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: P.q2 || 90 });
  }
  return states.length ? JSON.stringify(states) : `ok ${P.n} frames`;
}
