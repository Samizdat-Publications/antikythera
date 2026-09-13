/**
 * 2-D moon phase disc. Elongation e (moon minus sun, degrees): 0 = new,
 * 90 = first quarter (right half lit, northern-hemisphere view), 180 = full,
 * 270 = last quarter (left half lit).
 *
 * The terminator is the projection of a great circle: x_t(y) = side * cos(e) * sqrt(R^2 - y^2).
 * The lit region lies between the terminator and the limb on the lit side.
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

export function drawMoon(canvas: HTMLCanvasElement, elongationDeg: number, ink = false): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 6;
  ctx.clearRect(0, 0, w, h);
  if (ink) { drawMoonInk(ctx, cx, cy, R, elongationDeg); return; }
  // the phase ball in the model: a silvered half and a lamp-black half, lit from the upper left
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
  // the terminator softens with a faint glaze rather than a hard edge
  ctx.save();
  ctx.clip();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(30,24,20,0.35)"; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(201,151,63,0.35)"; ctx.lineWidth = 1; ctx.stroke();      // the bronze rim of the drum
}

/** The manuscript version: a pen diagram. Parchment for the lit part, hatching for the dark. */
function drawMoonInk(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, elongationDeg: number): void {
  const ink = "rgba(58, 44, 30, 0.9)";
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = "#f1e8d5"; ctx.fill();
  ctx.clip();
  // hatch the whole disc, then lay parchment back over the lit region
  ctx.strokeStyle = "rgba(58, 44, 30, 0.55)"; ctx.lineWidth = 0.9;
  for (let d = -2 * R; d < 2 * R; d += 4.2) {
    ctx.beginPath(); ctx.moveTo(cx + d - R, cy - R); ctx.lineTo(cx + d + R, cy + R); ctx.stroke();
  }
  const poly = litPolygon(cx, cy, R, elongationDeg);
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = "#f6efdf"; ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke();                      // the terminator, in pen
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R + 3, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(58, 44, 30, 0.35)"; ctx.lineWidth = 0.8; ctx.stroke();  // a second, lighter ring, as a compass would leave
}
