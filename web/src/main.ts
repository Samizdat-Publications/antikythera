import { Viewer } from "./scene/viewer";
import { EPOCHS, mechanismState, type MechanismState, type Calibration } from "./mech/mechanism";
import { civilToJdn, formatJd, TROPICAL_YEAR } from "./astro/jd";
import { drawMoon } from "./ui/moon";
import { calibrate, type CalibrationSet } from "./astro/calibration";
import { loadCanon, nextEclipse, prevEclipse, eclipsesBetween, describeType, skyState, type EclipseRow } from "./astro/truth";
import { glyphByMonth, OBSERVED_HOURS } from "./astro/eym";
import { auditSaros, drawErrorChart, errorSeries } from "./ui/analytics";
import type { Chart } from "chart.js/auto";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const GLYPHS = glyphByMonth();

const canvas = $<HTMLCanvasElement>("#stage");
let years = 0;
let epoch = EPOCHS[0];
let calib: CalibrationSet = calibrate(epoch.jdn);
let playing = false;
let speed = 1; // years per second
let last = performance.now();
let canon: { solar: EclipseRow[]; lunar: EclipseRow[] } | null = null;

const viewer = new Viewer({
  canvas,
  url: "./models/antikythera.glb",
  onReady: (g) => {
    $("#loading").hidden = true;
    g.setCalibration(calib.pointers);
    applyVisibility();
    update();
  },
});
loadCanon().then((c) => { canon = c; update(); refreshAnalytics(); });
let chart: Chart | undefined;

function refreshAnalytics(): void {
  const cv = $<HTMLCanvasElement>("#chart-moon");
  if (cv) chart = drawErrorChart(cv, errorSeries(epoch.jdn, mechCalibration(), -40, 40, 5.0), chart);
  if (!canon) return;
  const a = auditSaros(epoch.jdn, calib.sarosMonth0, canon, 669);
  setDl($("#audit-dl"), [
    ["months audited", `${a.months} (3 Saros, 54 yr)`],
    ["lunar glyphs", `${a.lunar.predicted} predicted`],
    ["  hits", `${a.lunar.hits} (+${a.lunar.penumbralOnly} penumbral only)`],
    ["  false alarms", `${a.lunar.falseAlarms}`],
    ["  missed", `${a.lunar.missed}`],
    ["solar glyphs", `${a.solar.predicted} predicted`],
    ["  hits", `${a.solar.hits} (somewhere on Earth)`],
    ["  false alarms", `${a.solar.falseAlarms}`],
    ["  missed", `${a.solar.missed}`],
  ]);
}

const yearsInput = $<HTMLInputElement>("#years");
const yearsVal = $("#years-val");
const hover = $("#hover");

const fmt = (x: number, digits = 2) => x.toFixed(digits);
const signed = (x: number, digits = 2) => `${x >= 0 ? "+" : ""}${x.toFixed(digits)}`;
function wrap180(d: number): number { return ((d + 180) % 360 + 360) % 360 - 180; }

function setDl(el: HTMLElement, rows: [string, string][]): void {
  el.replaceChildren(...rows.flatMap(([k, v]) => {
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    return [dt, dd];
  }));
}

function mechCalibration(): Partial<Calibration> {
  return {
    sunLon0: calib.sunLon0, moonLon0: calib.moonLon0,
    apogee0: calib.moonLon0,            // the pin sits at apogee at the epoch (full moon near apogee, Freeth 2014)
    node0: calib.node0, egyptianDay0: calib.egyptianDay0,
    metonicMonth0: calib.metonicMonth0, metonicYearOffset: calib.metonicYear0 - 1,
    callippicOffset: calib.callippicQuarter0 * 19, sarosMonth0: calib.sarosMonth0,
    exeligmos0: calib.exeligmos0, gamesYear0: calib.gamesYear0,
  };
}

function setYears(y: number): void {
  years = Math.max(-300, Math.min(2400, y));
  yearsInput.value = String(years);
  update();
}

function eclipsePanel(s: MechanismState): void {
  const el = $("#eclipse");
  const g = GLYPHS.get(s.sarosCell);
  const parts: string[] = [];
  const SYN = TROPICAL_YEAR / (235 / 19);
  const fmJd = s.jd - (s.sarosMonthsElapsed % 1) * SYN;          // this cell's full moon (machine time)
  const nmJd = fmJd + (19 / 38) * SYN;                            // its new moon, 19 EYu later
  const mech = g
    ? `${g.lunar ? "Σ lunar" : ""}${g.lunar && g.solar ? " · " : ""}${g.solar ? "Η solar" : ""}`
    : "no glyph in this cell";
  parts.push(`<div class="ecl-row"><span class="k">Saros cell ${s.sarosCell}</span><span class="v mech">${mech}</span></div>`);
  if (g) {
    const obs = OBSERVED_HOURS[s.sarosCell];
    const hrs: string[] = [];
    if (g.lunar) hrs.push(`Σ at hour ${obs?.lunar ?? "…"}${obs?.lunar != null ? ` +${s.exeligmosHours}h` : ""}`);
    if (g.solar) hrs.push(`Η at hour ${obs?.solar ?? "…"}${obs?.solar != null ? ` +${s.exeligmosHours}h` : ""}`);
    parts.push(`<div class="ecl-row"><span class="k">glyph reads</span><span class="v">${hrs.join(" · ")}</span></div>`);
  }
  if (canon) {
    const lun = eclipsesBetween(canon.lunar, fmJd - 1.6, fmJd + 1.6);
    const sol = eclipsesBetween(canon.solar, nmJd - 1.6, nmJd + 1.6);
    const truthL = lun.length ? lun.map((r) => `${describeType(r, true)} ${formatJd(r.jd)}`).join("; ") : "none";
    const truthS = sol.length ? sol.map((r) => `${describeType(r, false)} ${formatJd(r.jd)}`).join("; ") : "none";
    const verdict = (pred: boolean, real: EclipseRow[], lunar: boolean) => {
      const realNonPen = real.filter((r) => !(lunar && r.type[0] === "N"));
      if (pred && realNonPen.length) return "hit";
      if (pred && !realNonPen.length) return real.length ? "penumbral only" : "false alarm";
      if (!pred && realNonPen.length) return "missed";
      return "quiet";
    };
    parts.push(`<div class="ecl-row"><span class="k">NASA this month</span><span class="v">lunar: ${truthL}<br/>solar: ${truthS}</span></div>`);
    parts.push(`<div class="ecl-row"><span class="k">verdict</span><span class="v ${g ? "" : "dim"}">lunar ${verdict(!!g?.lunar, lun, true)} · solar ${verdict(!!g?.solar, sol, false)}</span></div>`);
    const nl = nextEclipse(canon.lunar, s.jd), ns = nextEclipse(canon.solar, s.jd);
    parts.push(`<div class="ecl-row"><span class="k">next</span><span class="v">${nl ? `lunar ${describeType(nl, true)} ${formatJd(nl.jd)} (Saros ${nl.saros})` : ""}<br/>${ns ? `solar ${describeType(ns, false)} ${formatJd(ns.jd)} (Saros ${ns.saros})` : ""}</span></div>`);
  } else {
    parts.push(`<div class="ecl-row dim">loading NASA canon…</div>`);
  }
  el.innerHTML = parts.join("");
}

function update(): void {
  const s: MechanismState = mechanismState(years, epoch.jdn, mechCalibration());
  viewer.setYears(years);
  $("#date-main").textContent = formatJd(s.jd);
  $("#date-sub").textContent = `JD ${s.jd.toFixed(2)} · ${epoch.label}`;
  yearsVal.textContent = years.toFixed(4);
  setDl($("#front-dl"), [
    ["Sun (mean)", `${fmt(s.sunMean, 1)}° · ${s.zodiacSign.split(" ")[0]} ${fmt(s.zodiacDeg, 1)}°`],
    ["Moon", `${fmt(s.moon, 1)}°`],
    ["  anomaly", `${signed(s.moonAnomaly)}°`],
    ["Dragon hand", `${fmt(s.nodes, 1)}° (asc. node)`],
    ["Egyptian date", `${s.egyptianMonth} ${s.egyptianDayOfMonth}`],
  ]);
  setDl($("#moon-dl"), [
    ["Phase", s.phaseName],
    ["Elongation", `${fmt(s.elongation, 1)}°`],
    ["Illuminated", `${fmt(s.illuminated * 100, 0)} %`],
    ["Age", `${fmt(s.moonAgeDays, 1)} d`],
  ]);
  setDl($("#back-dl"), [
    ["Metonic", `cell ${s.metonicCell} / 235 · turn ${s.metonicTurn + 1}`],
    ["  month", s.metonicMonthName],
    ["  year", `${s.metonicYear} of 19`],
    ["Callippic", `quarter ${s.callippicQuarter + 1} of 4`],
    ["Games", `year ${s.gamesYear}: ${s.gamesNames.join(" · ")}`],
    ["Saros", `cell ${s.sarosCell} / 223 · turn ${s.sarosTurn + 1}`],
    ["Exeligmos", `+${s.exeligmosHours} h`],
  ]);
  try {
    const sky = skyState(s.jd);
    setDl($("#sky-dl"), [
      ["Sun true", `${fmt(sky.sunLon, 2)}° · Δ ${signed(wrap180(s.sunMean - sky.sunLon))}°`],
      ["Moon true", `${fmt(sky.moonLon, 2)}° · Δ ${signed(wrap180(s.moon - sky.moonLon))}°`],
      ["Moon mean-only", `Δ ${signed(wrap180(s.moonMean - sky.moonLon))}°`],
      ["Phase true", `${fmt(sky.elongation, 1)}° · Δ ${signed(wrap180(s.elongation - sky.elongation), 1)}°`],
      ["Illuminated", `${fmt(sky.illuminated * 100, 0)} %`],
    ]);
  } catch (e) {
    setDl($("#sky-dl"), [["ephemeris", String(e)]]);
  }
  drawMoon($<HTMLCanvasElement>("#moon"), s.elongation);
  eclipsePanel(s);
}

function applyVisibility(): void {
  const g = viewer.graph;
  if (!g) return;
  const xray = $<HTMLInputElement>("#xray").checked;
  const showCase = $<HTMLInputElement>("#case").checked;
  for (const r of ["plate", "plate_b1", "dial", "frame_b1"]) g.setVisible(r, !xray);
  g.setVisible("case", showCase && !xray);
}

yearsInput.addEventListener("input", () => setYears(parseFloat(yearsInput.value)));
$("#play").addEventListener("click", () => {
  playing = !playing;
  $("#play").textContent = playing ? "❚❚" : "▶";
  last = performance.now();
});
$<HTMLSelectElement>("#speed").addEventListener("change", (e) => { speed = parseFloat((e.target as HTMLSelectElement).value); });
$<HTMLSelectElement>("#epoch").addEventListener("change", (e) => {
  epoch = EPOCHS.find((x) => x.id === (e.target as HTMLSelectElement).value) ?? EPOCHS[0];
  calib = calibrate(epoch.jdn);
  viewer.graph?.setCalibration(calib.pointers);
  setYears(0);
  refreshAnalytics();
});
$("#epoch-btn").addEventListener("click", () => setYears(0));
$("#xray").addEventListener("change", applyVisibility);
$("#case").addEventListener("change", applyVisibility);
document.querySelectorAll<HTMLButtonElement>(".views button").forEach((b) =>
  b.addEventListener("click", () => viewer.view(b.dataset.view as "front")),
);
document.querySelectorAll<HTMLButtonElement>("[data-jump]").forEach((b) =>
  b.addEventListener("click", () => {
    if (!canon) return;
    const jd = epoch.jdn + years * TROPICAL_YEAR;
    const [dir, kind] = (b.dataset.jump as string).split("-");
    const rows = kind === "solar" ? canon.solar : canon.lunar;
    const r = dir === "next" ? nextEclipse(rows, jd + 0.5) : prevEclipse(rows, jd - 0.5);
    if (r) setYears((r.jd - epoch.jdn) / TROPICAL_YEAR);
  }),
);
$("#goto").addEventListener("click", () => {
  const y = parseInt($<HTMLInputElement>("#goto-year").value, 10);
  if (Number.isFinite(y)) setYears((civilToJdn(y, 1, 1) - epoch.jdn) / TROPICAL_YEAR);
});
viewer.onHover = (id) => {
  if (!id || !viewer.graph) { hover.textContent = ""; return; }
  const n = viewer.graph.get(id);
  hover.textContent = n && n.teeth ? `${id} · ${n.teeth} teeth · ${n.rate.toFixed(5)} rot/yr · ${n.status}` : id;
};

function loop(now: number): void {
  if (playing) {
    setYears(years + ((now - last) / 1000) * speed);
  }
  last = now;
  viewer.render();
  requestAnimationFrame(loop);
}
update();
requestAnimationFrame(loop);
