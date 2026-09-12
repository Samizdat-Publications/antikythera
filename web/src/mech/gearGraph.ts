/**
 * Drive the exported glTF from one scalar: `years` = turns of the main wheel b1.
 *
 * Every animated node carries the numbers the Blender build wrote as custom
 * properties (glTF extras -> Object3D.userData):
 *   am_rate_rel   rotations per year relative to the node's parent (carrier)
 *   am_kind       'spur' | 'contrate' (crown gears turn about local X)
 *   am_coupling   JSON for the non-linear devices:
 *       pin_slot      {pin, dx, dy, r}      theta = atan2(dy + r sin t, dx + r cos t), t = pin's local z
 *       pin_follower  {epicycle, cx, cy, d} theta = atan2(cy + d sin t, cx + d cos t)
 *       chain         {from, ratio, carrierFrom, carrierTo}  theta = ratio*t (+ carrier terms)
 *       differential  {a, b, axis}          theta_x = theta_a - theta_b
 *   am_order      evaluation order (0 linear, 10 devices, 20+ chains, 30 differential)
 *
 * Blender convention: rotation.z = -2*pi*rateRel*years (clockwise from the front = positive rate).
 */
import type { Object3D } from "three";

const TAU = Math.PI * 2;

export interface GearNode {
  id: string;
  object: Object3D;
  rateRel: number;
  rate: number;
  kind: string;
  order: number;
  coupling: Record<string, unknown> | null;
  teeth: number | null;
  frame: string;
}

export class GearGraph {
  readonly nodes = new Map<string, GearNode>();
  private ordered: GearNode[] = [];

  constructor(root: Object3D) {
    root.traverse((o) => {
      const u = o.userData as Record<string, unknown>;
      if (typeof u.am_id !== "string") return;
      const coupling = typeof u.am_coupling === "string" ? (JSON.parse(u.am_coupling) as Record<string, unknown>) : null;
      this.nodes.set(u.am_id, {
        id: u.am_id,
        object: o,
        rateRel: Number(u.am_rate_rel ?? 0),
        rate: Number(u.am_rate ?? 0),
        kind: String(u.am_kind ?? "empty"),
        order: Number(u.am_order ?? 0),
        coupling,
        teeth: u.am_teeth == null ? null : Number(u.am_teeth),
        frame: String(u.am_frame ?? "world"),
      });
    });
    this.ordered = [...this.nodes.values()].sort((a, b) => a.order - b.order);
  }

  get(id: string): GearNode | undefined {
    return this.nodes.get(id);
  }

  /** Set every node's rotation for the given number of b1 turns. */
  setYears(years: number): void {
    for (const n of this.ordered) {
      const c = n.coupling;
      if (!c) {
        const angle = -TAU * n.rateRel * years;
        if (n.kind === "contrate") n.object.rotation.x = angle;
        else n.object.rotation.z = angle;
        continue;
      }
      switch (c.type) {
        case "pin_slot": {
          const t = this.localZ(c.pin as string);
          const r = c.r as number;
          n.object.rotation.z = Math.atan2((c.dy as number) + r * Math.sin(t), (c.dx as number) + r * Math.cos(t));
          break;
        }
        case "pin_follower": {
          const t = this.localZ(c.epicycle as string);
          const d = c.d as number;
          n.object.rotation.z = Math.atan2((c.cy as number) + d * Math.sin(t), (c.cx as number) + d * Math.cos(t));
          break;
        }
        case "chain": {
          let angle = (c.ratio as number) * this.localZ(c.from as string);
          const cf = c.carrierFrom as string | null;
          const ct = c.carrierTo as string | null;
          if (cf && cf !== ct) angle += this.localZ(cf);
          if (ct && ct !== cf) angle -= this.localZ(ct);
          n.object.rotation.z = angle;
          break;
        }
        case "differential": {
          const a = this.localZ(c.a as string) - this.localZ(c.b as string);
          if (c.axis === "x") n.object.rotation.x = a;
          else n.object.rotation.z = a;
          break;
        }
      }
    }
  }

  /** Continuous (unwrapped) local Z rotation of a node, radians. */
  localZ(id: string): number {
    const n = this.nodes.get(id);
    return n ? n.object.rotation.z : 0;
  }

  /** World-frame angle (radians, Blender convention) of a node about Z: sum of its chain of parents. */
  worldZ(id: string): number {
    const n = this.nodes.get(id);
    if (!n) return 0;
    let a = 0;
    let o: Object3D | null = n.object;
    while (o) {
      a += o.rotation.z;
      o = o.parent;
    }
    return a;
  }
}

/** Blender's rotation to a dial angle: degrees clockwise from the +X reference, seen from the front. */
export function clockwiseDeg(rotZ: number): number {
  const d = (-rotZ * 180) / Math.PI;
  return ((d % 360) + 360) % 360;
}
