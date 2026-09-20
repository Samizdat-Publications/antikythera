/**
 * The Moon panel: the Moon itself, lit the way the machine's phase ball says it is.
 *
 * A software-shaded sphere on a 2-D canvas. The near side's albedo is NASA's LROC colour
 * mosaic (CGI Moon Kit, public domain; north up, lunar east to the right, as seen from the
 * northern hemisphere); the light comes from the machine's elongation (0 = new, 90 = first
 * quarter with the right half lit, 180 = full); the shading follows the Lommel-Seeliger law
 * the regolith obeys (the full Moon is flat to the limb, a quarter Moon brightest at the limb),
 * with a trace of earthshine on the night side. The manuscript draws the same sphere from the
 * same photograph, taken through the page's own inks: a sepia duotone, warm parchment-white on
 * the highlands down to iron-gall brown on the night side, so it is the real Moon and not a
 * diagram. Until the map has arrived a plain disc stands in, in whichever palette is asked for.
 *
 * Elongation e (moon minus sun, degrees): the terminator is the projection of a great circle,
 * x_t(y) = side * cos(e) * sqrt(R^2 - y^2); `litPolygon` is that region, used by the stand-in
 * and by the tests.
 */
export function litPolygon(cx: number, cy: number, R: number, elongationDeg: number, n = 72): [number, number][] {
  const e = ((elongationDeg % 360) + 360) % 360;
  const side = e < 180 ? 1 : -1;           // +1: lit limb on the right
  const k = side * Math.cos((e * Math.PI) / 180);   // terminator x = k * sqrt(R^2 - y^2)
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {           // limb, top to bottom on the lit side
    const y = -R + (2 * R * i) / n;
    const x = side * Math.sqrt(Math.max(R * R - y * y, 0));
    pts.push([cx + x, cy + y]);
  }
  for (let i = n; i >= 0; i--) {           // terminator, bottom to top
    const y = -R + (2 * R * i) / n;
    const x = k * Math.sqrt(Math.max(R * R - y * y, 0));
    pts.push([cx + x, cy + y]);
  }
  return pts;
}

const MAP_URL = "./textures/moon_1k.jpg";
const EARTHSHINE = 0.035;

/**
 * The manuscript's Moon is the same photograph in the page's inks: a duotone ramp from iron-gall
 * brown through a warm mid to parchment-white. The night side stops well short of black, because
 * a black disc on a cream page reads as a hole punched in the paper rather than as an unlit limb.
 */
const SEPIA: [number, number, number][] = [
  [74, 58, 42],      // the night side: dark, but still ink on paper
  [126, 106, 82],
  [178, 158, 128],
  [222, 209, 184],
  [250, 245, 232],   // the highlands in full sun
];
/** Sample the ramp at t in 0..1. */
function sepia(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t)) * (SEPIA.length - 1);
  const i = Math.min(SEPIA.length - 2, Math.floor(x)), f = x - i;
  const a = SEPIA[i], b = SEPIA[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

interface MoonMap { w: number; h: number; data: Uint8ClampedArray }
let map: MoonMap | null = null;
let mapState: "idle" | "loading" | "ready" | "failed" = "idle";
let lastCall: [HTMLCanvasElement, number, boolean] | null = null;

function loadMap(): void {
  if (mapState !== "idle" || typeof Image === "undefined") return;
  mapState = "loading";
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (!g) { mapState = "failed"; return; }
    g.drawImage(img, 0, 0);
    map = { w: c.width, h: c.height, data: g.getImageData(0, 0, c.width, c.height).data };
    mapState = "ready";
    if (lastCall) drawMoon(...lastCall);
  };
  img.onerror = () => { mapState = "failed"; };
  img.src = MAP_URL;
}

/** Per-pixel geometry of the disc for one canvas size: normals, map texel, and the rim's coverage. */
interface Table { w: number; h: number; mapW: number; px: Int32Array; nx: Float32Array; ny: Float32Array; nz: Float32Array; tex: Int32Array; cov: Float32Array; R: number }
let table: Table | null = null;

function buildTable(w: number, h: number, R: number, m: MoonMap): Table {
  const cx = w / 2, cy = h / 2;
  const px: number[] = [], nx: number[] = [], ny: number[] = [], nz: number[] = [], tex: number[] = [], cov: number[] = [];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const dx = (i + 0.5 - cx) / R, dy = (j + 0.5 - cy) / R;
      const d = Math.hypot(dx, dy);
      const c = Math.max(0, Math.min(1, R + 0.5 - d * R));            // a one-pixel feather at the rim
      if (c <= 0) continue;
      const s = d > 1 ? 1 / d : 1;                                       // rim pixels take the limb's normal
      const x = dx * s, y = -dy * s, z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
      const lat = Math.asin(Math.max(-1, Math.min(1, y))), lon = Math.atan2(x, z);
      const u = Math.min(m.w - 1, Math.max(0, Math.floor((0.5 + lon / (2 * Math.PI)) * m.w)));
      const v = Math.min(m.h - 1, Math.max(0, Math.floor((0.5 - lat / Math.PI) * m.h)));
      px.push(j * w + i); nx.push(x); ny.push(y); nz.push(z); tex.push((v * m.w + u) * 4); cov.push(c);
    }
  }
  return { w, h, mapW: m.w, R, px: Int32Array.from(px), nx: Float32Array.from(nx), ny: Float32Array.from(ny), nz: Float32Array.from(nz), tex: Int32Array.from(tex), cov: Float32Array.from(cov) };
}

/** Lommel-Seeliger with a little earthshine, 1 at the centre of the full Moon. */
function shade(nx: number, nz: number, lx: number, lz: number): number {
  const mu0 = nx * lx + nz * lz, mu = nz;
  const ls = mu0 > 0 ? Math.min(1.45, (2 * mu0) / (mu0 + mu + 1e-4)) : 0;
  return EARTHSHINE + (1 - EARTHSHINE) * Math.pow(ls, 0.92);
}

export function drawMoon(canvas: HTMLCanvasElement, elongationDeg: number, ink = false): void {
  lastCall = [canvas, elongationDeg, ink];
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  // the canvas is drawn at device resolution; its CSS size is the size it was written with
  const dpr = Math.min(typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 2);
  const css = parseInt(canvas.dataset.size ?? "", 10) || canvas.width;
  canvas.dataset.size = String(css);
  if (canvas.style.width !== `${css}px`) { canvas.style.width = canvas.style.height = `${css}px`; }
  const w = Math.round(css * dpr), h = Math.round(css * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 6 * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  loadMap();
  if (!map) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (ink) drawMoonInk(ctx, css / 2, css / 2, css / 2 - 6, elongationDeg);
    else drawDisc(ctx, css / 2, css / 2, css / 2 - 6, elongationDeg);
    return;
  }
  if (!table || table.w !== w || table.h !== h || table.mapW !== map.w || table.R !== R) table = buildTable(w, h, R, map);
  const e = (elongationDeg * Math.PI) / 180;
  const lx = Math.sin(e), lz = -Math.cos(e);                           // from the Moon toward the Sun, in the observer's frame
  const img = ctx.createImageData(w, h);
  const D = img.data, M = map.data, T = table;
  if (!ink) {
    for (let k = 0; k < T.px.length; k++) {
      const s = shade(T.nx[k], T.nz[k], lx, lz) * 1.32, t = T.tex[k], o = T.px[k] * 4;
      D[o] = Math.min(255, M[t] * s); D[o + 1] = Math.min(255, M[t + 1] * s); D[o + 2] = Math.min(255, M[t + 2] * s);
      D[o + 3] = Math.round(255 * T.cov[k]);
    }
    ctx.putImageData(img, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.beginPath(); ctx.arc(css / 2, css / 2, css / 2 - 6, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(201,151,63,0.35)"; ctx.lineWidth = 1; ctx.stroke();      // the bronze rim of the drum
    return;
  }
  // the same photograph through the page's inks: the maria and the craters are the map's own,
  // the ramp only decides what grey means in brown. Tone = albedo x light, as in the vitrine.
  for (let k = 0; k < T.px.length; k++) {
    const p = T.px[k], t = T.tex[k];
    const grey = (M[t] * 0.299 + M[t + 1] * 0.587 + M[t + 2] * 0.114) / 255;
    const sh = shade(T.nx[k], T.nz[k], lx, lz);
    const tone = grey * sh * 1.45;                                     // no lift: the highlands clip and the maria go pale
    const lit = Math.max(0, sh - EARTHSHINE) / (1 - EARTHSHINE);       // 0 on the night side, 1 in full sun
    const c = sepia(Math.min(1, tone));
    // the night side is washed thin so the page shows through it. Against the vitrine's black
    // panel an unlit limb simply disappears; on parchment the same ink would be a mud-coloured
    // disc, and a crescent would read as a full Moon with a bright edge.
    const o = p * 4;
    D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2];
    D[o + 3] = Math.round(255 * T.cov[k] * (0.2 + 0.8 * Math.pow(lit, 0.45)));
  }
  ctx.putImageData(img, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const r = css / 2 - 6, inkc = "rgba(58, 44, 30, 0.9)";
  ctx.beginPath(); ctx.arc(css / 2, css / 2, r, 0, Math.PI * 2);
  ctx.strokeStyle = inkc; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.beginPath(); ctx.arc(css / 2, css / 2, r + 3, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(58, 44, 30, 0.35)"; ctx.lineWidth = 0.8; ctx.stroke();  // a second, lighter ring, as a compass would leave
}

/** The stand-in while the map loads: the phase ball in the model, a silvered half and a lamp-black half. */
function drawDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, elongationDeg: number): void {
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  const night = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.05, cx, cy, R);
  night.addColorStop(0, "#2a2320");
  night.addColorStop(1, "#110e0c");
  ctx.fillStyle = night; ctx.fill();
  const poly = litPolygon(cx, cy, R, elongationDeg);
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  const grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.08, cx, cy, R * 1.05);
  grad.addColorStop(0, "#f6efe1");
  grad.addColorStop(0.6, "#cfc3ad");
  grad.addColorStop(1, "#8f8470");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(201,151,63,0.35)"; ctx.lineWidth = 1; ctx.stroke();
}

/** The manuscript's stand-in: the same two tones the duotone ends at, until the map arrives. */
function drawMoonInk(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, elongationDeg: number): void {
  const ink = "rgba(58, 44, 30, 0.9)";
  const rgb = (c: [number, number, number]) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.globalAlpha = 0.2;                                               // the night side, washed thin as in the map
  ctx.fillStyle = rgb(sepia(0.06)); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.clip();
  const poly = litPolygon(cx, cy, R, elongationDeg);
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  const grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.08, cx, cy, R * 1.05);
  grad.addColorStop(0, rgb(sepia(1)));
  grad.addColorStop(0.6, rgb(sepia(0.72)));
  grad.addColorStop(1, rgb(sepia(0.45)));
  ctx.fillStyle = grad; ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R + 3, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(58, 44, 30, 0.35)"; ctx.lineWidth = 0.8; ctx.stroke();
}
