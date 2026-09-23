/**
 * Analytics: how well does the ancient machine track the real sky?
 *  - moon / sun longitude error over time (mechanism minus ephemeris)
 *  - Saros glyphs versus NASA's eclipse canon, cell by cell (hit / false alarm / missed)
 * The chart itself is drawn in chart.ts, which brings Chart.js and is loaded only when the panel opens.
 */
import { mechanismState, type Calibration, RATE } from "../mech/mechanism";
import { skyState, type EclipseRow, lowerBound } from "../astro/truth";
import { TROPICAL_YEAR } from "../astro/jd";
import { glyphByMonth } from "../astro/eym";

const SYN = TROPICAL_YEAR / RATE.moonSynodic;   // the machine's synodic month, days
const GLYPHS = glyphByMonth();

export interface ErrorSeries {
  years: number[];
  moonErr: number[];
  moonMeanErr: number[];
  sunErr: number[];
  phaseErr: number[];
}

/** The pointer error folded into windows (a year each): every window's swing, least to most, as a band. */
export interface ErrorBands {
  years: number[];        // window centres
  moonMin: number[];
  moonMax: number[];
  meanMin: number[];
  meanMax: number[];
  sunMin: number[];
  sunMax: number[];
}

function wrap180(d: number): number { return ((d + 180) % 360 + 360) % 360 - 180; }

export function errorSeries(epochJdn: number, calib: Partial<Calibration>, y0 = -50, y1 = 50, stepDays = 7.3): ErrorSeries {
  const out: ErrorSeries = { years: [], moonErr: [], moonMeanErr: [], sunErr: [], phaseErr: [] };
  const step = stepDays / TROPICAL_YEAR;
  for (let y = y0; y <= y1; y += step) {
    const s = mechanismState(y, epochJdn, calib);
    const t = skyState(s.jd);
    out.years.push(y);
    out.moonErr.push(wrap180(s.moon - t.moonLon));
    out.moonMeanErr.push(wrap180(s.moonMean - t.moonLon));
    out.sunErr.push(wrap180(s.sunMean - t.sunLon));
    out.phaseErr.push(wrap180(s.elongation - t.elongation));
  }
  return out;
}

/**
 * Sampled every day (the Moon's error turns over with the anomalistic and synodic months and the
 * Sun's with the year, so a coarser step aliases them into moire on an 80-year axis), then folded
 * window by window into least and most. A year per window: eighty bands across the chart, each the
 * whole swing of that year, so the slow drift and the size of the wobble read at once.
 */
export function errorBands(epochJdn: number, calib: Partial<Calibration>, y0 = -40, y1 = 40, windowYears = 1, stepDays = 1): ErrorBands {
  const out: ErrorBands = { years: [], moonMin: [], moonMax: [], meanMin: [], meanMax: [], sunMin: [], sunMax: [] };
  const step = stepDays / TROPICAL_YEAR, win = windowYears;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  let w0 = y0, n = 0;
  const flush = () => {
    if (!n) return;
    out.years.push(w0 + win / 2);
    out.moonMin.push(lo[0]); out.moonMax.push(hi[0]); out.meanMin.push(lo[1]); out.meanMax.push(hi[1]); out.sunMin.push(lo[2]); out.sunMax.push(hi[2]);
    lo.fill(Infinity); hi.fill(-Infinity); n = 0;
  };
  for (let y = y0; y <= y1; y += step) {
    if (y >= w0 + win) { flush(); w0 += win; }
    const s = mechanismState(y, epochJdn, calib);
    const t = skyState(s.jd);
    const e = [wrap180(s.moon - t.moonLon), wrap180(s.moonMean - t.moonLon), wrap180(s.sunMean - t.sunLon)];
    for (let k = 0; k < 3; k++) { if (e[k] < lo[k]) lo[k] = e[k]; if (e[k] > hi[k]) hi[k] = e[k]; }
    n++;
  }
  flush();
  return out;
}

export interface Audit {
  months: number;
  lunar: { predicted: number; hits: number; falseAlarms: number; missed: number; penumbralOnly: number };
  solar: { predicted: number; hits: number; falseAlarms: number; missed: number };
  rows: { m: number; cell: number; jd: number; predL: boolean; predS: boolean; realL: string; realS: string }[];
}

function within(rows: EclipseRow[], jd: number, tol: number): EclipseRow | undefined {
  const i = lowerBound(rows, jd - tol);
  const r = rows[i];
  return r && r.jd <= jd + tol ? r : undefined;
}

/** Audit `months` synodic months starting at the epoch (default: one full Saros). */
export function auditSaros(epochJdn: number, sarosMonth0: number, canon: { solar: EclipseRow[]; lunar: EclipseRow[] }, months = 223): Audit {
  const a: Audit = { months, lunar: { predicted: 0, hits: 0, falseAlarms: 0, missed: 0, penumbralOnly: 0 },
    solar: { predicted: 0, hits: 0, falseAlarms: 0, missed: 0 }, rows: [] };
  for (let m = 0; m < months; m++) {
    const cell = ((sarosMonth0 - 1 + m) % 223 + 223) % 223 + 1;
    const g = GLYPHS.get(cell);
    const fm = epochJdn + m * SYN;                    // full moon of this month (machine time)
    const nm = fm + (19 / 38) * SYN;                  // new moon, 19 EYu later (Freeth 2014)
    const realL = within(canon.lunar, fm, 1.6);
    const realS = within(canon.solar, nm, 1.6);
    const predL = !!g?.lunar, predS = !!g?.solar;
    const realLnonPen = realL && realL.type[0] !== "N";
    if (predL) a.lunar.predicted++;
    if (predS) a.solar.predicted++;
    if (predL && realLnonPen) a.lunar.hits++;
    else if (predL && realL) a.lunar.penumbralOnly++;
    else if (predL) a.lunar.falseAlarms++;
    else if (realLnonPen) a.lunar.missed++;
    if (predS && realS) a.solar.hits++;
    else if (predS) a.solar.falseAlarms++;
    else if (realS) a.solar.missed++;
    a.rows.push({ m, cell, jd: fm, predL, predS, realL: realL ? realL.type : "", realS: realS ? realS.type : "" });
  }
  return a;
}
