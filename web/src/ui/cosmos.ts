/**
 * The sky the machine tracks, drawn geocentrically from the gear graph itself.
 *
 * Every planetary output of the mechanism is a pin-and-slot or a pin-follower: the
 * pointer's direction is the direction, seen from the slot axis, of a point
 *     q = a + r·u(t)       (a = fixed offset in the carrier frame, r = pin radius, t = pin angle)
 * which is exactly an epicycle on a deferent. So each body is drawn at the point q itself,
 * rotated so that its direction from Earth equals the pointer's dial reading, and scaled so
 * the larger of |a| and r is the body's deferent radius. The distance |q| and the reading
 * then come straight from the machine, and the trail a body leaves over a few years is the
 * path Ptolemy would draw: the outer planets loop backwards each time the Earth overtakes them.
 * Verdigris ticks on the zodiac ring mark the true longitudes (astronomy-engine) for comparison.
 *
 * Canvas convention: ecliptic longitude increases clockwise from +X, as on the front dial.
 */
import type { GearGraph } from "../mech/gearGraph";
import { skyLongitudes } from "../astro/truth";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

interface BodySpec {
  id: string; label: string; glyph: string; display: string; device: string;
  R: number;            // deferent radius as a fraction of the zodiac ring
  span: number;         // years of trail
  samples: number;      // trail samples across the span
  colour: string;       // the stone on the front dial
}

const BODIES: BodySpec[] = [
  { id: "moon", label: "Moon", glyph: "☾", display: "moon", device: "k2", R: 0.17, span: 0.085, samples: 60, colour: "#e9e5d9" },
  { id: "mercury", label: "Mercury", glyph: "☿", display: "mercury", device: "mercury_ptr", R: 0.27, span: 0.5, samples: 150, colour: "#5cc9bd" },
  { id: "venus", label: "Venus", glyph: "♀", display: "venus", device: "venus_ptr", R: 0.36, span: 1.7, samples: 190, colour: "#5d7ee6" },
  { id: "sun", label: "Sun", glyph: "☉", display: "true_sun", device: "true_sun_ptr", R: 0.45, span: 1.0, samples: 90, colour: "#ffcf6e" },
  { id: "mars", label: "Mars", glyph: "♂", display: "mars", device: "ma80a", R: 0.58, span: 2.3, samples: 230, colour: "#e0553a" },
  { id: "jupiter", label: "Jupiter", glyph: "♃", display: "jupiter", device: "ju65a", R: 0.74, span: 1.6, samples: 150, colour: "#efeaf8" },
  { id: "saturn", label: "Saturn", glyph: "♄", display: "saturn", device: "sa86a", R: 0.9, span: 1.8, samples: 150, colour: "#8d8894" },
];

const SIGNS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

interface Sample { years: number; lon: number; rho: number }

class Body {
  a: [number, number];
  r: number;
  pin: string;
  scale: number;
  trail: Sample[] = [];
  lon = 0;
  trueLon = 0;
  constructor(readonly spec: BodySpec, graph: GearGraph) {
    const n = graph.get(spec.device);
    const c = (n?.coupling ?? {}) as Record<string, number | string>;
    if (c.type === "pin_slot") { this.a = [c.dx as number, c.dy as number]; this.r = c.r as number; this.pin = c.pin as string; }
    else { this.a = [(c.cx as number) ?? 1, (c.cy as number) ?? 0]; this.r = (c.d as number) ?? 0; this.pin = (c.epicycle as string) ?? ""; }
    this.scale = spec.R / Math.max(Math.hypot(...this.a), this.r);
  }
  /**
   * The mechanism's geometry now: the pointer reading (degrees clockwise), |q| in diagram
   * units, and the two rotating vectors (offset a, pin r·u(t)) turned so that q points the
   * way the pointer does. Vectors are in the Blender frame (CCW); the canvas flips y.
   */
  measure(graph: GearGraph): { lon: number; rho: number; A: [number, number]; B: [number, number] } {
    const t = graph.localZ(this.pin);
    const bx = this.r * Math.cos(t), by = this.r * Math.sin(t);
    const qx = this.a[0] + bx, qy = this.a[1] + by;
    const lon = graph.reading(this.spec.display);
    const base = -lon * DEG - Math.atan2(qy, qx);
    const c = Math.cos(base), sn = Math.sin(base), k = this.scale;
    const rot = (x: number, y: number): [number, number] => [(x * c - y * sn) * k, (x * sn + y * c) * k];
    return { lon, rho: Math.hypot(qx, qy) * k, A: rot(this.a[0], this.a[1]), B: rot(bx, by) };
  }
}

export class Cosmos {
  private bodies: Body[] = [];
  private graph: GearGraph | null = null;
  private lastYears = NaN;
  private lastTruth = -1;
  private jd = 0;
  private hovered: string | null = null;

  constructor(private canvases: HTMLCanvasElement[], private stone: (id: string) => string = (id) => BODIES.find((b) => b.id === id)?.colour ?? "#fff") {
    for (const c of canvases) c.addEventListener("pointerleave", () => { this.hovered = null; });
  }

  attach(graph: GearGraph): void {
    this.graph = graph;
    this.bodies = BODIES.map((s) => new Body(s, graph));
    this.lastYears = NaN;
  }

  /** Call whenever the machine moves: appends to the trails, or rebuilds them after a jump. */
  tick(years: number, jd: number): void {
    const g = this.graph;
    if (!g) return;
    this.jd = jd;
    const jump = !Number.isFinite(this.lastYears) || Math.abs(years - this.lastYears) > 0.05;
    if (jump) this.rebuild(years);
    else {
      for (const b of this.bodies) {
        const m = b.measure(g);
        b.lon = m.lon;
        const step = b.spec.span / b.spec.samples;
        const last = b.trail[b.trail.length - 1];
        if (!last || Math.abs(years - last.years) >= step) b.trail.push({ years, lon: m.lon, rho: m.rho });
        while (b.trail.length && years - b.trail[0].years > b.spec.span) b.trail.shift();
        if (years < (b.trail[0]?.years ?? years)) b.trail = [];      // running backwards: start again
      }
    }
    this.lastYears = years;
    if (performance.now() - this.lastTruth > 120) {
      this.lastTruth = performance.now();
      const sky = skyLongitudes(jd);
      for (const b of this.bodies) b.trueLon = sky[b.spec.id] ?? b.trueLon;
    }
  }

  /** Sample the gear graph backwards over each body's span, then put the machine back. */
  private rebuild(years: number): void {
    const g = this.graph!;
    for (const b of this.bodies) {
      b.trail = [];
      const n = b.spec.samples;
      for (let i = 0; i < n; i++) {
        const y = years - b.spec.span * (1 - i / (n - 1));
        g.setYears(y);
        const m = b.measure(g);
        b.trail.push({ years: y, lon: m.lon, rho: m.rho });
      }
    }
    g.setYears(years);
    for (const b of this.bodies) b.lon = b.measure(g).lon;
  }

  draw(): void {
    for (const c of this.canvases) {
      if (!c.isConnected || c.clientWidth === 0 || c.closest("[hidden]")) continue;
      this.drawOn(c);
    }
  }

  private drawOn(canvas: HTMLCanvasElement): void {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const big = w > 500;
    const cx = w / 2, cy = h / 2, Rz = Math.min(w, h) / 2 - (big ? 34 : 18);
    const P = (lon: number, rho: number): [number, number] => [cx + rho * Rz * Math.cos(lon * DEG), cy + rho * Rz * Math.sin(lon * DEG)];
    const bronze = "201,151,63", vellum = "232,222,204", verdigris = "96,176,158";

    // the zodiac ring
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${bronze},0.55)`;
    ctx.beginPath(); ctx.arc(cx, cy, Rz, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(${bronze},0.3)`;
    ctx.beginPath(); ctx.arc(cx, cy, Rz * 0.94, 0, TAU); ctx.stroke();
    for (let i = 0; i < 36; i++) {
      const major = i % 3 === 0;
      const a = i * 10 * DEG;
      ctx.strokeStyle = `rgba(${bronze},${major ? 0.6 : 0.3})`;
      ctx.beginPath();
      ctx.moveTo(cx + Rz * 0.94 * Math.cos(a), cy + Rz * 0.94 * Math.sin(a));
      ctx.lineTo(cx + Rz * (major ? 1 : 0.97) * Math.cos(a), cy + Rz * (major ? 1 : 0.97) * Math.sin(a));
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(${vellum},0.75)`;
    ctx.font = `${big ? 15 : 11}px "Segoe UI Symbol", "Noto Sans Symbols", "Apple Symbols", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 + 15) * DEG;
      ctx.fillText(SIGNS[i], cx + Rz * 1.0 * Math.cos(a) + (big ? 20 : 11) * Math.cos(a), cy + Rz * Math.sin(a) + (big ? 20 : 11) * Math.sin(a));
    }

    // Earth
    ctx.fillStyle = `rgba(${vellum},0.9)`;
    ctx.beginPath(); ctx.arc(cx, cy, big ? 4 : 2.6, 0, TAU); ctx.fill();

    for (const b of this.bodies) {
      const col = this.stone(b.spec.id);
      const emph = this.hovered === null || this.hovered === b.spec.id;
      const alpha = emph ? 1 : 0.25;
      // deferent
      ctx.strokeStyle = `rgba(${bronze},${0.13 * alpha})`;
      ctx.beginPath(); ctx.arc(cx, cy, b.spec.R * Rz, 0, TAU); ctx.stroke();
      // trail, fading into the past
      const n = b.trail.length;
      if (n > 1) {
        ctx.lineWidth = big ? 1.6 : 1.1;
        for (let i = 1; i < n; i++) {
          const k = i / (n - 1);
          const [x0, y0] = P(b.trail[i - 1].lon, b.trail[i - 1].rho);
          const [x1, y1] = P(b.trail[i].lon, b.trail[i].rho);
          ctx.strokeStyle = hexToRgba(col, (0.08 + 0.72 * k * k) * alpha);
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }
        ctx.lineWidth = 1;
      }
      if (!n) continue;
      // the epicycle: the larger vector is the deferent, the smaller the circle carrying the body
      const m = b.measure(this.graph!);
      const lonNow = m.lon;
      const [px, py] = P(lonNow, m.rho);
      const big1 = Math.hypot(...m.A) >= Math.hypot(...m.B);
      const D = big1 ? m.A : m.B, E = big1 ? m.B : m.A;
      const dx = cx + D[0] * Rz, dy = cy - D[1] * Rz;                 // Blender y up -> canvas y down
      ctx.strokeStyle = `rgba(${bronze},${0.35 * alpha})`;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(dx, dy); ctx.stroke();
      ctx.strokeStyle = hexToRgba(col, 0.45 * alpha);
      ctx.beginPath(); ctx.arc(dx, dy, Math.hypot(...E) * Rz, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(px, py); ctx.stroke();
      // the pointer: Earth through the body to the ring
      const [rx, ry] = P(lonNow, 0.94);
      ctx.strokeStyle = `rgba(${bronze},${0.22 * alpha})`;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(rx, ry); ctx.stroke();
      ctx.setLineDash([]);
      // the body
      ctx.fillStyle = hexToRgba(col, alpha);
      ctx.beginPath(); ctx.arc(px, py, big ? 5 : 3.2, 0, TAU); ctx.fill();
      if (big || this.hovered === b.spec.id) {
        ctx.fillStyle = `rgba(${vellum},${0.85 * alpha})`;
        ctx.font = `${big ? 13 : 11}px Alegreya, Georgia, serif`;
        ctx.textAlign = "left";
        ctx.fillText(b.spec.label, px + 8, py - 8);
      }
      // machine tick (bronze) and true tick (verdigris) on the ring, with the error arc between
      const tick = (lon: number, rgb: string, len: number) => {
        ctx.strokeStyle = `rgba(${rgb},${0.95 * alpha})`;
        ctx.lineWidth = big ? 2 : 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + Rz * 0.94 * Math.cos(lon * DEG), cy + Rz * 0.94 * Math.sin(lon * DEG));
        ctx.lineTo(cx + Rz * (0.94 + len) * Math.cos(lon * DEG), cy + Rz * (0.94 + len) * Math.sin(lon * DEG));
        ctx.stroke();
        ctx.lineWidth = 1;
      };
      tick(lonNow, bronze, 0.06);
      tick(b.trueLon, verdigris, 0.06);
      const err = ((b.trueLon - lonNow + 540) % 360) - 180;
      if (Math.abs(err) > 0.4) {
        ctx.strokeStyle = `rgba(${verdigris},${0.7 * alpha})`;
        ctx.lineWidth = big ? 3 : 2;
        ctx.beginPath(); ctx.arc(cx, cy, Rz * 0.955, lonNow * DEG, (lonNow + err) * DEG, err < 0); ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
    if (big) {
      ctx.fillStyle = `rgba(${vellum},0.6)`;
      ctx.font = `italic 13px Alegreya, Georgia, serif`;
      ctx.textAlign = "left";
      ctx.fillText("bronze ticks: what the machine shows · verdigris: the true sky · each body sits on its own epicycle, as the gears place it", 16, h - 14);
    }
  }

  /** Which body the pointer is over (for emphasis); pass null to clear. */
  hover(id: string | null): void { this.hovered = id; }
  get list(): { id: string; label: string; colour: string }[] { return BODIES.map((b) => ({ id: b.id, label: b.label, colour: b.colour })); }
}


function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
