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

export function drawMoon(canvas: HTMLCanvasElement, elongationDeg: number): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 6;
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = "#15171d"; ctx.fill();                       // night side + earthshine
  const poly = litPolygon(cx, cy, R, elongationDeg);
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  const grad = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.25, R * 0.1, cx, cy, R);
  grad.addColorStop(0, "#fff8ea");
  grad.addColorStop(1, "#d6ccb4");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,240,210,0.22)"; ctx.lineWidth = 1; ctx.stroke();
}
