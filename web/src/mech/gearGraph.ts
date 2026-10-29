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
 *       spiral        {rate, turns, r0, pitch} follower pin slides: x = r0 + pitch*((phase - rate*years) mod turns),
 *                     the turns its pointer has made since cell 1 (rate is negative: these pointers turn
 *                     anticlockwise seen from the front), phase the turns already made at the epoch
 *   am_order      evaluation order (0 linear, 10 devices, 20+ chains, 30 differential, 40 spiral)
 *   am_role       'pointer' | 'dial' | 'plate' | 'case' | 'tube' | 'frame_b1' ... (visibility groups)
 *   am_pointer    which display a pointer/ring belongs to (date, moon, mars, metonic, ...)
 *
 * Blender convention: rotation.z = -2*pi*rateRel*years (clockwise from the front = positive rate).
 * Pointers additionally carry an assembly offset (calibration, degrees clockwise) set at runtime.
 */
import type { Object3D } from "three";

const TAU = Math.PI * 2;
/** Where 0 degrees of Aries stands on the Zodiac dial: at the top, 90 degrees anticlockwise from +X seen from the front
 *  (ZODIAC_ZERO_DEG in tools/gen_dial_textures.py, which says why). Front pointers read from there. */
export const ZODIAC_ZERO_DEG = 90;
/** The displays read against the Zodiac (and the Date pointer, against the calendar drawn from the same zero). */
const FRONT_DISPLAYS = new Set(["date", "true_sun", "moon", "nodes", "mercury", "venus", "mars", "jupiter", "saturn"]);

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
  status: string;
}

export class GearGraph {
  readonly nodes = new Map<string, GearNode>();
  readonly pointers = new Map<string, Object3D[]>();     // display -> pointer/ring objects
  readonly roles = new Map<string, Object3D[]>();        // role -> objects
  private ordered: GearNode[] = [];
  private offsets = new Map<string, number>();           // display -> radians (Blender sense)
  private phases = new Map<string, number>();            // node -> assembly phase, radians (pin gears of the devices)
  private spiralPhase = new Map<string, number>();       // spiral follower pin -> turns its pointer had made at the epoch
  private calendar0: number | null = null;               // the calendar ring's turn at the epoch, radians (Blender sense)
  private _years = 0;
  /** Turns of the main wheel the machine is set to. */
  get years(): number { return this._years; }

  constructor(root: Object3D) {
    root.traverse((o) => {
      const u = o.userData as Record<string, unknown>;
      if (typeof u.am_role === "string") {
        const list = this.roles.get(u.am_role) ?? [];
        list.push(o);
        this.roles.set(u.am_role, list);
      }
      if (typeof u.am_pointer === "string") {
        const list = this.pointers.get(u.am_pointer) ?? [];
        list.push(o);
        this.pointers.set(u.am_pointer, list);
      }
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
        status: String(u.am_status ?? ""),
      });
    });
    this.ordered = [...this.nodes.values()].sort((a, b) => a.order - b.order);
  }

  get(id: string): GearNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Set the machine: at years = 0 each display must READ the given dial angle
   * (degrees clockwise from the zodiac zero). Followers, slot gears and the moon
   * chain do not sit at zero when the crank is at zero, so the assembly offset is
   * the desired angle minus whatever the driving node shows at the epoch.
   */
  setCalibration(desiredDeg: Record<string, number>): void {
    const saved = this._years;
    this.setYears(0);
    for (const [display, deg] of Object.entries(desiredDeg)) {
      const objs = this.pointers.get(display);
      if (!objs?.length) continue;
      const parent = objs[0].parent;
      const parent0 = parent ? this.worldZOf(parent) : 0;
      const zero = FRONT_DISPLAYS.has(display) ? ZODIAC_ZERO_DEG : 0;
      this.offsets.set(display, ((zero - deg) * Math.PI) / 180 - parent0);
    }
    // The Moon's phase ball is on q1's axle and turns with it about the Moon's arm, its black half on local +y
    // (blender/dials.py): at elongation e that half must face the front at e = 0 and the back at e = 180,
    // so q1 is set to 90 degrees less e, and its rate (235/19 a year against the lunar arbor) keeps it so.
    // q1 is turned by the difference of the lunar arbor and the mean Sun, which at the epoch is not zero (the
    // lunar arbor carries the anomaly), so that difference is taken off.
    const q1 = this.nodes.get("q1");
    if (q1 && desiredDeg.moon !== undefined && desiredDeg.true_sun !== undefined) {
      const c = q1.coupling;
      const base = c?.type === "differential" ? this.localZ(c.a as string) - this.localZ(c.b as string) : 0;
      this.phases.set("q1", Math.PI / 2 - ((desiredDeg.moon - desiredDeg.true_sun) * Math.PI) / 180 - base);
    }
    // The Egyptian calendar ring is loose on the front plate: set it so the Date pointer stands on the middle of
    // the epoch's day (calendar_day0, 1..365; the ring is drawn with 1 Thoth at the Zodiac's zero).
    if (desiredDeg.calendar_day0 !== undefined && desiredDeg.date !== undefined && this.nodes.has("calendar_ring")) {
      this.calendar0 = (((desiredDeg.calendar_day0 - 0.5) * 360) / 365 - desiredDeg.date) * Math.PI / 180;
    }
    // A spiral pointer set to read cell k (deg = -(90 + 360 k / cells-per-turn), calibration.ts) has made
    // k / cells-per-turn turns since cell 1, and its follower pin rides in that turn of the groove.
    for (const id of ["metonic", "saros"]) {
      if (desiredDeg[id] !== undefined && this.nodes.has("pin_" + id)) this.spiralPhase.set("pin_" + id, (-desiredDeg[id] - 90) / 360);
    }
    this.applyOffsets();
    this.setYears(saved);
  }

  private applyOffsets(): void {
    for (const [display, objs] of this.pointers) {
      const off = this.offsets.get(display) ?? 0;
      for (const o of objs) o.rotation.z = off;
    }
  }

  private worldZOf(o: Object3D): number {
    let a = 0;
    let p: Object3D | null = o;
    while (p) { a += p.rotation.z; p = p.parent; }
    return a;
  }

  setVisible(role: string, visible: boolean): void {
    for (const o of this.roles.get(role) ?? []) o.visible = visible;
  }

  /**
   * Assembly phase of a plainly driven node (a pin gear or epicycle): the angle it was
   * mounted at when the crank read zero. The pointers' own offsets fix where each pointer
   * points at the epoch; the phases fix where in its cycle each anomaly device is.
   */
  setPhase(id: string, radians: number): void {
    this.phases.set(id, radians);
  }
  getPhase(id: string): number { return this.phases.get(id) ?? 0; }

  /** Set every node's rotation for the given number of b1 turns. */
  setYears(years: number): void {
    this._years = years;
    for (const n of this.ordered) {
      const c = n.coupling;
      if (!c) {
        const angle = -TAU * n.rateRel * years + (this.phases.get(n.id) ?? 0);
        if (n.id === "calendar_ring" && this.calendar0 !== null) {
          // 365 days to a ring, 365.2422 to a turn of the Date pointer: the owner slips the ring back a day every four years
          n.object.rotation.z = this.calendar0 + Math.floor(years / 4) * TAU / 365;
        } else if (n.kind === "contrate") n.object.rotation.x = angle;
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
          const a = this.localZ(c.a as string) - this.localZ(c.b as string) + (this.phases.get(n.id) ?? 0);
          if (c.axis === "x") n.object.rotation.x = a;
          else n.object.rotation.z = a;
          break;
        }
        case "spiral": {
          const turns = c.turns as number;
          const t = (((this.spiralPhase.get(n.id) ?? 0) - (c.rate as number) * years) % turns + turns) % turns;
          n.object.position.x = (c.r0 as number) + (c.pitch as number) * t;
          break;
        }
      }
    }
  }

  /** Local Z rotation of a node, radians. */
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

  /** Dial reading of a display in degrees clockwise from the dial zero (includes calibration). */
  reading(display: string, _driverId?: string): number {
    const objs = this.pointers.get(display);
    if (!objs?.length) return 0;
    const deg = clockwiseDeg(this.worldZOf(objs[0]));
    return FRONT_DISPLAYS.has(display) ? (deg + ZODIAC_ZERO_DEG) % 360 : deg;
  }
}

/** Blender's rotation to a dial angle: degrees clockwise from the +X reference, seen from the front. */
export function clockwiseDeg(rotZ: number): number {
  const d = (-rotZ * 180) / Math.PI;
  return ((d % 360) + 360) % 360;
}
