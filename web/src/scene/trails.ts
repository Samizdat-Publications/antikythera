/**
 * Pointer trails on the front dial: a long exposure of the stones.
 *
 * While the crank runs, each stone leaves a fading ribbon behind it on its own plane, the
 * last half-second or so of wall time, so at ten years a second the blur of the pointers
 * becomes the sweep each body makes: the Sun a full ring, Saturn a short arc, Mars doubling
 * back on itself where it retrogrades. The samples come from the gear graph itself, taken in
 * sub-steps between frames (no more than 10° of the fastest body per sample), so the quick
 * pointers are not aliased into chords. When the machine stands still the trails fade out.
 */
import * as THREE from "three";
import type { GearGraph } from "../mech/gearGraph";
import { STONE_COLOURS } from "../ui/cosmos";

interface Spec { mesh: string; id: string; rate: number }
/** rate: about the fastest each stone ever moves, turns per year (the followers swing at conjunction). */
const SPECS: Spec[] = [
  { mesh: "sun_ball", id: "sun", rate: 1.1 },
  { mesh: "stone_mercury", id: "mercury", rate: 4.5 },
  { mesh: "stone_venus", id: "venus", rate: 3.0 },
  { mesh: "stone_mars", id: "mars", rate: 1.6 },
  { mesh: "stone_jupiter", id: "jupiter", rate: 0.6 },
  { mesh: "stone_saturn", id: "saturn", rate: 0.5 },
];
const SPAN_MS = 550;             // how long a trace lingers
const CAP = 1024;                // samples kept per body
const DEG_PER_SAMPLE = 10;
const WIDTH_MM = 1.1;
const MAX_SUBSTEPS = 32;

class Trail {
  readonly mesh: THREE.Mesh;
  readonly glow: THREE.MeshBasicMaterial;
  private buf = new Float32Array(CAP * 4);          // x, y, z, t as a ring
  private head = 0;
  private count = 0;
  private pos: THREE.BufferAttribute;
  private col: THREE.BufferAttribute;
  private tmp = new THREE.Vector3();

  constructor(readonly spec: Spec, readonly object: THREE.Object3D) {
    const g = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(CAP * 2 * 3), 3);
    this.col = new THREE.BufferAttribute(new Float32Array(CAP * 2 * 4), 4);     // rgba: a four-wide colour gives per-vertex alpha
    this.pos.setUsage(THREE.DynamicDrawUsage);
    this.col.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("position", this.pos);
    g.setAttribute("color", this.col);
    const idx = new Uint32Array((CAP - 1) * 6);
    for (let i = 0; i < CAP - 1; i++) {
      const a = i * 2, o = i * 6;
      idx[o] = a; idx[o + 1] = a + 1; idx[o + 2] = a + 2;
      idx[o + 3] = a + 1; idx[o + 4] = a + 3; idx[o + 5] = a + 2;
    }
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setDrawRange(0, 0);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.name = `trail_${spec.id}`;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.renderOrder = 5;
    this.mesh.visible = false;
    // GTAO hides lines and points from its depth and normal passes; a ribbon a hair above the
    // pointer ring must not cast an occlusion band under itself, so it wears that flag
    (this.mesh as unknown as { isLine: boolean }).isLine = true;
    this.glow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  }

  sample(t: number): void {
    this.object.getWorldPosition(this.tmp);
    const i = this.head * 4;
    this.buf[i] = this.tmp.x; this.buf[i + 1] = this.tmp.y; this.buf[i + 2] = this.tmp.z; this.buf[i + 3] = t;
    this.head = (this.head + 1) % CAP;
    this.count = Math.min(CAP, this.count + 1);
  }

  clear(): void {
    this.count = 0;
    this.head = 0;
    this.mesh.visible = false;
  }

  /** Rebuild the ribbon from the samples still within the span: two vertices per sample, tapering and fading toward the tail. */
  build(now: number, rgb: THREE.Color, alphaMax: number, glowMul: number): void {
    // drop what has faded
    while (this.count > 0) {
      const oldest = ((this.head - this.count + CAP) % CAP) * 4;
      if (now - this.buf[oldest + 3] <= SPAN_MS) break;
      this.count--;
    }
    const m = this.count;
    if (m < 2) { this.mesh.visible = false; return; }
    const P = this.pos.array as Float32Array, C = this.col.array as Float32Array, B = this.buf;
    let pdx = 1, pdy = 0;
    for (let k = 0; k < m; k++) {
      const s = ((this.head - m + k + CAP) % CAP) * 4;
      const sp = ((this.head - m + Math.max(0, k - 1) + CAP) % CAP) * 4;
      const sn = ((this.head - m + Math.min(m - 1, k + 1) + CAP) % CAP) * 4;
      let dx = B[sn] - B[sp], dy = B[sn + 1] - B[sp + 1];
      const len = Math.hypot(dx, dy);
      if (len > 1e-4) { dx /= len; dy /= len; pdx = dx; pdy = dy; } else { dx = pdx; dy = pdy; }
      const f = Math.max(0, 1 - (now - B[s + 3]) / SPAN_MS);          // 1 at the head, 0 at the tail
      const w = WIDTH_MM * (0.25 + 0.75 * f) * 0.5;
      const a = alphaMax * f * f;
      const x = B[s], y = B[s + 1], z = B[s + 2];
      const v = k * 2 * 3, c = k * 2 * 4;
      P[v] = x - dy * w; P[v + 1] = y + dx * w; P[v + 2] = z;
      P[v + 3] = x + dy * w; P[v + 4] = y - dx * w; P[v + 5] = z;
      C[c] = rgb.r; C[c + 1] = rgb.g; C[c + 2] = rgb.b; C[c + 3] = a;
      C[c + 4] = rgb.r; C[c + 5] = rgb.g; C[c + 6] = rgb.b; C[c + 7] = a;
    }
    this.pos.needsUpdate = true;
    this.col.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, (m - 1) * 6);
    this.mesh.visible = true;
    this.glow.opacity = glowMul;
  }
}

export class Trails {
  readonly group = new THREE.Group();
  private trails: Trail[] = [];
  private lastYears = NaN;
  private lastT = 0;
  private colour = new THREE.Color();
  enabled = true;

  constructor(private graph: GearGraph, root: THREE.Object3D) {
    this.group.name = "trails";
    for (const s of SPECS) {
      const o = root.getObjectByName(s.mesh);
      if (o) this.trails.push(new Trail(s, o));
    }
    for (const t of this.trails) this.group.add(t.mesh);
  }

  /** The ribbons in the selective bloom pass: a dimmer copy of themselves, so a fast trace glows a little. */
  get glowMats(): [THREE.Mesh, THREE.Material][] { return this.trails.map((t) => [t.mesh, t.glow]); }

  clear(): void { for (const t of this.trails) t.clear(); this.lastYears = NaN; }

  /**
   * Once a frame, after the machine has been set for it. Samples the stones' world positions along
   * the way from the previous frame's years to this one, then rebuilds every ribbon.
   */
  step(now: number, theme: "vitrine" | "manuscript"): void {
    if (!this.enabled || !this.trails.length) return;
    const y = this.graph.years;
    const jumped = !Number.isFinite(this.lastYears) || Math.abs(y - this.lastYears) > 1.5 || now - this.lastT > 1000;   // a jump, or the tab was asleep
    if (jumped) {
      for (const t of this.trails) { t.clear(); t.sample(now); }
    } else {
      const dy = y - this.lastYears;
      if (dy !== 0) {
        const need = this.trails.map((t) => Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil((Math.abs(dy) * t.spec.rate * 360) / DEG_PER_SAMPLE))));
        const N = Math.max(...need);
        for (let i = 1; i <= N; i++) {
          this.graph.setYears(this.lastYears + (dy * i) / N);
          const ti = this.lastT + ((now - this.lastT) * i) / N;
          this.trails.forEach((t, k) => { const n = need[k]; if (Math.floor((i * n) / N) > Math.floor(((i - 1) * n) / N)) t.sample(ti); });
        }
        this.graph.setYears(y);
      }
    }
    this.lastYears = y;
    this.lastT = now;
    const ms = theme === "manuscript";
    for (const t of this.trails) {
      const c = STONE_COLOURS[t.spec.id];
      this.colour.set(ms ? c.ink : c.stone);
      if (!ms) this.colour.multiplyScalar(1.35);                      // a light trace under ACES, not a dull one
      t.build(now, this.colour, ms ? 0.8 : 0.85, ms ? 0.15 : 0.45);
    }
  }
}
