/**
 * Fit the assembly phase of every anomaly device against the real sky.
 *
 * The pointer offsets (calibration.ts) put each pointer on the true longitude at the epoch,
 * but a pin-and-slot or pin-follower has a second degree of freedom: where in its cycle the
 * pin sits when the crank reads zero. Left at the Blender zero, Mars could drift ±40° within
 * one synodic period even though it started on the right degree. Here each device's pin gear
 * is turned to the phase that minimises the RMS error of its pointer against astronomy-engine
 * over ±1.5 cycles around the epoch, with the pointer re-zeroed at the epoch for every trial.
 * This is what the ancient maker had to do too: set the epicycle to the sky on the day.
 */
import type { GearGraph } from "../mech/gearGraph";
import { TROPICAL_YEAR } from "./jd";
import { skyLongitudes } from "./truth";

const TAU = Math.PI * 2;

interface Device { display: string; pin: string; truth: string }
const DEVICES: Device[] = [
  { display: "true_sun", pin: "su56", truth: "sun" },
  { display: "mercury", pin: "me20", truth: "mercury" },
  { display: "venus", pin: "r1", truth: "venus" },
  { display: "mars", pin: "ma71", truth: "mars" },
  { display: "jupiter", pin: "ju43", truth: "jupiter" },
  { display: "saturn", pin: "sa68", truth: "saturn" },
];

export interface PhaseFit { display: string; pin: string; phaseDeg: number; rmsDeg: number; worstDeg: number }

const wrap = (d: number) => ((d + 540) % 360) - 180;

/**
 * Sets the phases on the graph and re-applies the pointer calibration. Returns the fit
 * report (RMS and worst error over the window) for the UI and the console.
 */
export function fitDevicePhases(graph: GearGraph, epochJdn: number, pointers: Record<string, number>, samples = 24): PhaseFit[] {
  const out: PhaseFit[] = [];
  for (const d of DEVICES) {
    const pin = graph.get(d.pin);
    if (!pin || !graph.get(d.display === "true_sun" ? "su56" : d.pin)) continue;
    const cycle = pin.rateRel ? 1 / Math.abs(pin.rateRel) : 1;          // years per turn of the pin relative to its carrier
    const span = 1.5 * cycle;
    const ys: number[] = [], truth: number[] = [];
    for (let i = 0; i < samples; i++) {
      const y = -span + (2 * span * i) / (samples - 1);
      ys.push(y);
      truth.push(skyLongitudes(epochJdn + y * TROPICAL_YEAR)[d.truth]);
    }
    const desired = { [d.display]: pointers[d.display] };
    const rms = (phase: number): number => {
      graph.setPhase(d.pin, phase);
      graph.setCalibration(desired);
      let s = 0;
      for (let i = 0; i < ys.length; i++) {
        graph.setYears(ys[i]);
        const e = wrap(graph.reading(d.display) - truth[i]);
        s += e * e;
      }
      return Math.sqrt(s / ys.length);
    };
    let best = 0, bestRms = Infinity;
    for (let k = 0; k < 36; k++) {
      const r = rms((k * TAU) / 36);
      if (r < bestRms) { bestRms = r; best = (k * TAU) / 36; }
    }
    for (let k = -8; k <= 8; k++) {                                     // refine within the winning 10° step
      const p = best + (k * TAU) / 36 / 8;
      const r = rms(p);
      if (r < bestRms) { bestRms = r; best = p; }
    }
    graph.setPhase(d.pin, best);
    graph.setCalibration(desired);
    let worst = 0;
    for (let i = 0; i < ys.length; i++) {
      graph.setYears(ys[i]);
      worst = Math.max(worst, Math.abs(wrap(graph.reading(d.display) - truth[i])));
    }
    out.push({ display: d.display, pin: d.pin, phaseDeg: (best * 180) / Math.PI, rmsDeg: bestRms, worstDeg: worst });
  }
  graph.setCalibration(pointers);
  return out;
}
