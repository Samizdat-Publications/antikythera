// Showcase film for samizdatpublications.com: the machine taken apart, every wheel out along its arbor and
// still turning, on one full turntable orbit. Frames n..n+fade-1 repeat the camera angles of 0..fade-1 with the
// gears further on, so encode can crossfade the gears alone and the loop closes without a camera jump.
// Run with the Playwright MCP browser_run_code_unsafe(filename=...) against the dev server on 5177.
async (page) => {
  const P = __PARAMS__;
  const S = 'C:/Users/stewa/Documents/Claude/Blender Tests/antikythera/.playwright-mcp/film/' + P.name + '/';
  const CSS = `body * { visibility: hidden !important; } .plate, .plate canvas { visibility: visible !important; } .plate { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; max-width: none !important; z-index: 99999 !important; margin: 0 !important; padding: 0 !important; border: 0 !important; } .plate canvas { width: 100% !important; height: 100% !important; }`;
  await page.setViewportSize({ width: P.w, height: P.h });
  await page.goto('http://127.0.0.1:5177/' + P.q);
  await page.waitForFunction(() => window.__viewer && window.__viewer.graph, null, { timeout: 60000 });
  await page.waitForTimeout(7000);
  await page.addStyleTag({ content: CSS });
  await page.evaluate((P) => {
    dispatchEvent(new Event('resize'));
    const v = window.__viewer; v.holdOrbit = () => true; v.controls.autoRotate = false; window.__app.setPlaying(false);
    const x = document.querySelector('#apart'); if (!x.checked) { x.checked = true; x.dispatchEvent(new Event('change')); }
    if (P.setup) (new Function(P.setup))();
  }, P);
  await page.waitForTimeout(6000);
  const box = await page.evaluate(() => {
    const v = window.__viewer, mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; v.root.updateMatrixWorld(true);
    v.root.traverseVisible((o) => { if (!o.isMesh) return; o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      ['x', 'y', 'z'].forEach((k, j) => { mn[j] = Math.min(mn[j], b.min[k]); mx[j] = Math.max(mx[j], b.max[k]); }); });
    return { mn, mx };
  });
  const list = P.only || [...Array(P.n + P.fade).keys()];
  for (const i of list) {
    await page.evaluate(async ({ P, i }) => {
      const v = window.__viewer, app = window.__app;
      app.setYears((P.y0 || 0) + P.dy * i, true);
      if (P.each) (new Function(P.each))();
      const a = (P.a0 + 360 * (i % P.n) / P.n) * Math.PI / 180, [tx, ty, tz] = P.c;
      v.camera.position.set(tx + P.r * Math.sin(a), ty + P.hgt, tz + P.r * Math.cos(a));
      v.controls.target.set(tx, ty, tz); v.controls.update();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, { P, i });
    await page.screenshot({ path: `${S}f_${String(i).padStart(4, '0')}.${P.png ? 'png' : 'jpg'}`, type: P.png ? 'png' : 'jpeg', quality: P.png ? undefined : 95 });
  }
  return JSON.stringify({ frames: list.length, box });
}
