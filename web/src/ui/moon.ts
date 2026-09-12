/**
 * 2-D moon phase disc: the terminator is an ellipse whose minor axis is
 * R*|cos(elongation)|. Elongation 0 = new, 90 = first quarter (right half lit,
 * northern-hemisphere view), 180 = full, 270 = last quarter.
 */
export function drawMoon(canvas: HTMLCanvasElement, elongationDeg: number): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 6;
  const e = ((elongationDeg % 360) + 360) % 360;
  const th = (e * Math.PI) / 180;
  ctx.clearRect(0, 0, w, h);
  // dark disc with faint earthshine
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1c22"; ctx.fill();
  // lit region: union/intersection of half-disc and ellipse
  const waxing = e < 180;                   // lit limb on the right
  const k = Math.cos(th);                   // +1 new ... -1 full
  ctx.save();
  ctx.beginPath();
  // right or left half of the limb
  ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, !waxing);
  // terminator half-ellipse back to the top
  const rx = R * Math.abs(k);
  const bulgeRight = waxing ? k < 0 : k > 0;   // gibbous when lit part crosses the centre line
  ctx.ellipse(cx, cy, rx, R, 0, Math.PI / 2, -Math.PI / 2, bulgeRight ? !waxing : waxing);
  ctx.closePath();
  const grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
  grad.addColorStop(0, "#fff7e6");
  grad.addColorStop(1, "#d9cfb8");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
  // limb
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,240,210,0.25)"; ctx.lineWidth = 1; ctx.stroke();
}
