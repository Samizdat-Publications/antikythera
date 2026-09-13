/**
 * Analytics: how well does the ancient machine track the real sky?
 *  - moon / sun longitude error over time (mechanism minus ephemeris)
 *  - Saros glyphs versus NASA's eclipse canon, cell by cell (hit / false alarm / missed)
 */
import { Chart, type ChartConfiguration } from "chart.js/auto";
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

/** Chart colours follow the version: bronze and verdigris on lamp-black, or inks on parchment. */
function palette() {
  return document.documentElement.dataset.theme === "manuscript"
    ? { grid: "rgba(60, 45, 30, 0.10)", tick: "#5a4a3a", font: "Cardo, Georgia, serif", moon: "#a8462c", moonMean: "rgba(168,70,44,0.35)", sun: "#3f7d6b" }
    : { grid: "rgba(230, 210, 170, 0.08)", tick: "#a89c86", font: "Alegreya, Georgia, serif", moon: "#e8c27a", moonMean: "rgba(232,194,122,0.35)", sun: "#7fb8a8" };
}

export function drawErrorChart(canvas: HTMLCanvasElement, series: ErrorSeries, existing?: Chart): Chart {
  existing?.destroy();
  const DARK = palette();
  const cfg: ChartConfiguration = {
    type: "line",
    data: {
      labels: series.years.map((y) => y.toFixed(1)),
      datasets: [
        { label: "Moon, with the pin-and-slot", data: series.moonErr, borderColor: DARK.moon, borderWidth: 1.2, pointRadius: 0, tension: 0 },
        { label: "Moon, mean motion only", data: series.moonMeanErr, borderColor: DARK.moonMean, borderWidth: 1, pointRadius: 0, tension: 0 },
        { label: "Sun", data: series.sunErr, borderColor: DARK.sun, borderWidth: 1.2, pointRadius: 0, tension: 0 },
      ],
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: DARK.tick, boxWidth: 14, boxHeight: 2, font: { size: 12, family: DARK.font } } }, tooltip: { enabled: true } },
      scales: {
        x: { ticks: { color: DARK.tick, maxTicksLimit: 8, font: { size: 11, family: DARK.font } }, grid: { color: DARK.grid }, title: { display: true, text: "years from the epoch", color: DARK.tick, font: { size: 12, family: DARK.font, style: "italic" } } },
        y: { ticks: { color: DARK.tick, font: { size: 11, family: DARK.font } }, grid: { color: DARK.grid }, title: { display: true, text: "machine minus sky, degrees", color: DARK.tick, font: { size: 12, family: DARK.font, style: "italic" } } },
      },
    },
  };
  return new Chart(canvas, cfg);
}
