import { Viewer } from "./scene/viewer";
import { EPOCHS, mechanismState, type MechanismState, type Calibration } from "./mech/mechanism";
import { civilToJdn, formatJd, TROPICAL_YEAR } from "./astro/jd";
import { drawMoon } from "./ui/moon";
import { calibrate, type CalibrationSet } from "./astro/calibration";
import { loadCanon, nextEclipse, prevEclipse, eclipsesBetween, describeType, skyState, type EclipseRow } from "./astro/truth";
import { glyphByMonth, OBSERVED_HOURS } from "./astro/eym";
import { auditSaros, drawErrorChart, errorSeries } from "./ui/analytics";
import { Tour } from "./ui/tour";
import { Onboarding, firstVisit } from "./ui/onboarding";
import { renderInspector } from "./ui/inspector";
import { Cosmos } from "./ui/cosmos";
import { fitDevicePhases, type PhaseFit } from "./astro/phases";
import type { Chart } from "chart.js/auto";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const NAMES: Record<string, string> = {
  a1: "crown wheel on the crank", b1: "main wheel", b2: "main-wheel pinion", b3: "moon pointer gear", b0: "mean-sun gear",
  c1: "c1", c2: "c2", d1: "d1", d2: "d2 (127 teeth)", e1: "e1", e2: "e2", e3: "lunar-apsides platform", e4: "Saros pickup",
  e5: "anomaly input", e6: "anomaly output", k1: "pin gear", k2: "slot gear", f1: "f1", f2: "f2", g1: "Saros pointer gear",
  g2: "g2", h1: "h1", h2: "h2", i1: "Exeligmos gear", l1: "l1", l2: "l2", m1: "m1", m2: "m2", m3: "m3", n1: "Metonic pointer gear",
  n2: "games drive", n3: "Callippic drive", o1: "games dial gear", p1: "p1", p2: "p2", cal1: "Callippic gear", q1: "phase-ball crown gear",
  nod49: "fixed gear, nodes", nod62: "nodes epicycle", nod64: "nodes epicycle", nod48: "dragon-hand output",
  fix51: "fixed gear, Mercury and Venus", me72: "Mercury", me89: "Mercury", me40: "Mercury idler", me20: "Mercury epicycle",
  ve44: "Venus", ve34: "Venus", ve26: "Venus idler", r1: "Venus epicycle (Fragment D)", fix56: "fixed gear, Sun and superior planets",
  sa52: "Saturn and true Sun", sa61: "Saturn", sa40: "Saturn idler", sa68: "Saturn pin gear", sa86a: "Saturn slot gear", sa86b: "Saturn ring gear",
  ju64: "Mars and Jupiter", ju45: "Jupiter", ju40: "Jupiter idler", ju43: "Jupiter pin gear", ju65a: "Jupiter slot gear", ju65b: "Jupiter ring gear",
  ma38: "Mars", ma40: "Mars idler", ma71: "Mars pin gear", ma80a: "Mars slot gear", ma80b: "Mars ring gear", su56: "true-Sun epicycle",
  mercury_ptr: "Mercury follower", venus_ptr: "Venus follower", true_sun_ptr: "true-Sun follower", calendar_ring: "Egyptian calendar ring",
  pin_metonic: "Metonic follower pin", pin_saros: "Saros follower pin",
};
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
  onProgress: (loaded, total) => {
    const mb = (n: number) => (n / 1048576).toFixed(1);
    $("#loading").innerHTML = `loading the mechanism<span class="sub">${total ? `${mb(loaded)} of ${mb(total)} MB` : `${mb(loaded)} MB`} · 69 gears, 17 trains</span>`;
  },
  onError: () => {
    $("#loading").innerHTML = `the mechanism could not be loaded<span class="sub">the model file did not arrive. Check the connection and reload the page.</span>`;
  },
  onReady: (g) => {
    $("#loading").hidden = true;
    g.setCalibration(calib.pointers);
    fitPhases();
    cosmos.attach(g);
    applyVisibility();
    update();
    renderInspector($("#inspector"), g, (ids) => viewer.isolate(ids));
    if (firstVisit()) {
      // no autoplay: the invitation is one label over the exhibit, and narration starts from that click
      $("#begin").hidden = false;
    } else {
      setTimeout(() => { if (!playing && !onboarding.active) setPlaying(true, 0.0821918); }, 2900);   // a working model is already turning when you walk up
    }
  },
});
$("#begin-btn").addEventListener("click", () => { $("#begin").hidden = true; onboarding.start(); });
$("#begin-skip").addEventListener("click", () => {
  $("#begin").hidden = true;
  try { localStorage.setItem("am_onboarded", "1"); } catch { /* ignore */ }
  setPlaying(true, 0.0821918);
});
loadCanon().then((c) => { canon = c; update(); refreshAnalytics(); });
(window as unknown as { __viewer: Viewer }).__viewer = viewer;

// ---- the sky it tracks: the small diagram in the column and the same thing over the stage
const cosmos = new Cosmos([$<HTMLCanvasElement>("#cosmos"), $<HTMLCanvasElement>("#cosmos-stage")]);
$("#cosmos-legend").replaceChildren(...cosmos.list.map((b) => {
  const btn = document.createElement("button");
  const dot = document.createElement("i"); dot.style.background = b.colour;
  btn.append(dot, b.label);
  btn.addEventListener("pointerenter", () => cosmos.hover(b.id));
  btn.addEventListener("pointerleave", () => cosmos.hover(null));
  return btn;
}));
const stageEl = $(".stage");
function setSky(on: boolean): void {
  stageEl.classList.toggle("sky", on);
  $("#sky-btn").setAttribute("aria-pressed", String(on));
  if (on) document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((x) => x.setAttribute("aria-pressed", "false"));
}
$("#sky-btn").addEventListener("click", () => setSky(!stageEl.classList.contains("sky")));

// ---- sounds (crank loop, eclipse chime)
const tour = new Tour();
tour.load();
$("#sfx").addEventListener("change", (e) => tour.setSfx((e.target as HTMLInputElement).checked));
let lastSarosCell = -1;

// ---- onboarding walkthrough
let focused: HTMLElement | null = null;
function setPlaying(on: boolean, spd?: number): void {
  playing = on;
  if (spd !== undefined) { speed = spd; $<HTMLSelectElement>("#speed").value = String(spd); }
  $("#play").textContent = playing ? "Stop the crank" : "Turn the crank";
  $("#play").setAttribute("aria-pressed", String(playing));
  last = performance.now();
  if (!playing) update(true);
}
const onboarding = new Onboarding({
  view: (v) => viewer.view(v),
  setYears,
  play: setPlaying,
  xray: (on) => { $<HTMLInputElement>("#xray").checked = on; applyVisibility(); },
  isolate: (ids) => viewer.isolate(ids),
  focus: (sel) => {
    focused?.classList.remove("focus");
    focused = null;
    const el = sel ? document.querySelector<HTMLElement>(sel) : null;
    if (el) {
      const panel = el.closest(".panel") as HTMLElement | null;
      panel?.querySelectorAll("details").forEach((d) => { d.open = true; });
      focused = panel ?? el;
      focused.classList.add("focus");
      el.scrollIntoView({ behavior: "smooth", block: "center" });     // the row itself, not the panel it sits in
    }
  },
  jumpNextLunarEclipse: () => {
    if (!canon) return;
    const r = nextEclipse(canon.lunar, epoch.jdn + years * TROPICAL_YEAR + 0.5);
    if (r) setYears((r.jd - epoch.jdn) / TROPICAL_YEAR);
  },
  setEpoch: (id) => { $<HTMLSelectElement>("#epoch").value = id; $<HTMLSelectElement>("#epoch").dispatchEvent(new Event("change")); },
  reset: () => { viewer.isolate([]); $<HTMLInputElement>("#xray").checked = false; applyVisibility(); setPlaying(false, 1); viewer.view("iso"); },
});
addEventListener("keydown", (e) => {                                   // space turns the crank, unless a field has focus
  const t = e.target as HTMLElement | null;
  if (e.key !== " " || (t && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(t.tagName))) return;
  e.preventDefault();
  setPlaying(!playing);
});
onboarding.load();
$("#tour-btn").addEventListener("click", () => onboarding.start());
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

/** Glosses for the terms a museum label would footnote (shown on hover). */
const GLOSS: Record<string, string> = {
  "Saros": "the Saros: 223 lunar months (18 years 11 days), after which eclipses repeat; the lower back spiral counts them",
  "Exeligmos": "three Saros cycles (54 years); the small dial adds 0, 8 or 16 hours to the glyph's eclipse time",
  "Metonic": "the Metonic cycle: 235 lunar months equal 19 solar years; the upper back spiral counts them",
  "Callippic": "four Metonic cycles less one day, 76 years",
  "Games": "the four-year round of the Panhellenic games (Olympia, Nemea, Isthmia, Delphi)",
  "Dragon hand": "the pointer that tracks the Moon's nodes, where eclipses can happen (18.6-year cycle)",
  "Egyptian date": "the 365-day Egyptian civil calendar on the front ring: 12 months of 30 days and 5 extra days",
  "Sun (mean)": "the Sun's average position along the zodiac; the true Sun pointer adds the yearly wobble",
  "anomaly": "the pin-and-slot correction: the Moon runs fast near perigee and slow near apogee, up to about 6.5 degrees",
  "Julian Day": "the astronomers' day count, one number for any date, so that BC dates need no calendar arithmetic",
  "Phase": "how much of the Moon's face is lit, shown by the half-silver ball on the front dial",
};

function setDl(el: HTMLElement, rows: [string, string][]): void {
  el.replaceChildren(...rows.flatMap(([k, v]) => {
    const dt = document.createElement("dt");
    if (k.startsWith("  ")) { dt.className = "sub"; k = k.trimStart(); }
    dt.textContent = k;
    if (GLOSS[k]) dt.title = GLOSS[k];
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

function setYears(y: number, force = false): void {
  years = Math.max(-300, Math.min(2400, y));
  yearsInput.value = String(years);
  update(force);
}

function eclipsePanel(s: MechanismState): void {
  const el = $("#eclipse");
  const g = GLYPHS.get(s.sarosCell);
  const parts: string[] = [];
  const SYN = TROPICAL_YEAR / (235 / 19);
  const fmJd = s.jd - (s.sarosMonthsElapsed % 1) * SYN;          // this cell's full moon (machine time)
  const nmJd = fmJd + (19 / 38) * SYN;                            // its new moon, 19 EYu later
  const mech = g
    ? `${g.lunar ? "Σ — a lunar eclipse" : ""}${g.lunar && g.solar ? " · " : ""}${g.solar ? "Η — a solar eclipse" : ""}`
    : "no glyph: the machine expects no eclipse this month";
  parts.push(`<div class="ecl-row"><span class="k">Saros cell ${s.sarosCell}</span><span class="v ${g ? "mech" : "quiet"}">${mech}</span></div>`);
  if (g) {
    const obs = OBSERVED_HOURS[s.sarosCell];
    const hrs: string[] = [];
    const hour = (h?: number) => (h == null ? "hour not preserved" : `hour ${h}, plus ${s.exeligmosHours} from the Exeligmos dial`);
    if (g.lunar) hrs.push(`Σ ${hour(obs?.lunar)}`);
    if (g.solar) hrs.push(`Η ${hour(obs?.solar)}`);
    parts.push(`<div class="ecl-row"><span class="k">the glyph reads</span><span class="v">${hrs.join("<br/>")}</span></div>`);
  }
  if (canon) {
    const lun = eclipsesBetween(canon.lunar, fmJd - 1.6, fmJd + 1.6);
    const sol = eclipsesBetween(canon.solar, nmJd - 1.6, nmJd + 1.6);
    const truthL = lun.length ? lun.map((r) => `${describeType(r, true)} ${formatJd(r.jd)}`).join("; ") : "none";
    const truthS = sol.length ? sol.map((r) => `${describeType(r, false)} ${formatJd(r.jd)}`).join("; ") : "none";
    const verdict = (pred: boolean, real: EclipseRow[], lunar: boolean): [string, string] => {
      const realNonPen = real.filter((r) => !(lunar && r.type[0] === "N"));
      if (pred && realNonPen.length) return ["a hit", "verdict-hit"];
      if (pred && !realNonPen.length) return [real.length ? "penumbral only" : "a false alarm", "verdict-miss"];
      if (!pred && realNonPen.length) return ["missed", "verdict-miss"];
      return ["quiet, correctly", "quiet"];
    };
    const [vl, cl] = verdict(!!g?.lunar, lun, true);
    const [vs, cs] = verdict(!!g?.solar, sol, false);
    parts.push(`<div class="ecl-row"><span class="k">NASA, this month</span><span class="v two">lunar: ${truthL}<br/>solar: ${truthS}</span></div>`);
    parts.push(`<div class="ecl-row"><span class="k">verdict</span><span class="v"><span class="${cl}">lunar ${vl}</span> · <span class="${cs}">solar ${vs}</span></span></div>`);
    const nl = nextEclipse(canon.lunar, s.jd), ns = nextEclipse(canon.solar, s.jd);
    parts.push(`<div class="ecl-row"><span class="k">next, per NASA</span><span class="v two">${nl ? `lunar, ${describeType(nl, true)}, ${formatJd(nl.jd)}` : ""}<br/>${ns ? `solar, ${describeType(ns, false)}, ${formatJd(ns.jd)}` : ""}</span></div>`);
  } else {
    parts.push(`<div class="ecl-row"><span class="k"></span><span class="v quiet">loading NASA's eclipse canon…</span></div>`);
  }
  el.innerHTML = parts.join("");
}

const PLANET_DRIVERS: [string, string, string][] = [
  ["Mercury", "mercury", "mercury_ptr"], ["Venus", "venus", "venus_ptr"], ["True Sun", "true_sun", "true_sun_ptr"],
  ["Mars", "mars", "ma80b"], ["Jupiter", "jupiter", "ju65b"], ["Saturn", "saturn", "sa86b"],
];
function planetRows(): [string, string][] {
  const g = viewer.graph;
  if (!g) return [];
  return PLANET_DRIVERS.map(([label, display, driver]) => [label, `${fmt(g.reading(display, driver), 1)}°`]);
}

let lastDom = 0;
function update(force = false): void {
  const s: MechanismState = mechanismState(years, epoch.jdn, mechCalibration());
  viewer.setYears(years);
  cosmos.tick(years, s.jd);
  const now = performance.now();
  if (playing && !force && now - lastDom < 250) return;     // the column updates four times a second while the crank runs
  lastDom = now;
  $("#date-main").textContent = formatJd(s.jd);
  $("#date-sub").textContent = `${years >= 0 ? "" : "−"}${Math.abs(years).toFixed(2)} years since the epoch`;
  yearsVal.textContent = years.toFixed(4);
  setDl($("#front-dl"), [
    ["Sun (mean)", `${fmt(s.sunMean, 1)}° · ${s.zodiacSign.split(" ")[0]} ${fmt(s.zodiacDeg, 1)}°`],
    ["Moon", `${fmt(s.moon, 1)}°`],
    ["  anomaly", `${signed(s.moonAnomaly)}°`],
    ["Dragon hand", `${fmt(s.nodes, 1)}° (asc. node)`],
    ["Egyptian date", `${s.egyptianMonth} ${s.egyptianDayOfMonth}`],
    ...planetRows(),
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
      ["Julian Day", s.jd.toFixed(2)],
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
  if (s.sarosCell !== lastSarosCell) {
    if (lastSarosCell >= 0 && GLYPHS.has(s.sarosCell)) tour.chime();
    lastSarosCell = s.sarosCell;
  }
}

function applyVisibility(): void {
  const g = viewer.graph;
  if (!g) return;
  const inside = $<HTMLInputElement>("#xray").checked || viewer.fragmentShown;
  const caseBox = $<HTMLInputElement>("#case");
  viewer.setCase(caseBox.checked);
  viewer.setInside(inside);
  caseBox.disabled = inside;                                          // the case is already off the plinth
  viewer.setAOStrength(inside ? 0.45 : 0.9);
}

yearsInput.addEventListener("input", () => setYears(parseFloat(yearsInput.value), true));
$("#play").addEventListener("click", () => setPlaying(!playing));
$<HTMLSelectElement>("#speed").addEventListener("change", (e) => { speed = parseFloat((e.target as HTMLSelectElement).value); });
$<HTMLSelectElement>("#epoch").addEventListener("change", (e) => {
  epoch = EPOCHS.find((x) => x.id === (e.target as HTMLSelectElement).value) ?? EPOCHS[0];
  calib = calibrate(epoch.jdn);
  viewer.graph?.setCalibration(calib.pointers);
  fitPhases();
  setYears(0);
  refreshAnalytics();
});

/** Turn each anomaly device's pin to the phase the sky had at the epoch; report how well the machine then tracks. */
let phaseReport: PhaseFit[] = [];
function fitPhases(): void {
  const g = viewer.graph;
  if (!g) return;
  const t0 = performance.now();
  phaseReport = fitDevicePhases(g, epoch.jdn, calib.pointers);
  console.info(`[antikythera] device phases fitted in ${(performance.now() - t0).toFixed(0)} ms: ` +
    phaseReport.map((r) => `${r.display} ${r.phaseDeg.toFixed(1)}° (rms ${r.rmsDeg.toFixed(1)}°, worst ${r.worstDeg.toFixed(1)}°)`).join("; "));
  (window as unknown as { __phases: PhaseFit[] }).__phases = phaseReport;
  const label: Record<string, string> = { true_sun: "true Sun", mercury: "Mercury", venus: "Venus", mars: "Mars", jupiter: "Jupiter", saturn: "Saturn" };
  setDl($("#phase-dl"), phaseReport.map((r) => [label[r.display] ?? r.display, `rms ${r.rmsDeg.toFixed(1)}° · worst ${r.worstDeg.toFixed(1)}°`]));
}
$("#epoch-btn").addEventListener("click", () => setYears(0));
$("#xray").addEventListener("change", applyVisibility);
$<HTMLInputElement>("#fragment").addEventListener("input", (e) => {
  const a = parseInt((e.target as HTMLInputElement).value, 10) / 100;
  viewer.loadFragment("./models/fragment_a.glb").then(() => { viewer.setFragmentOpacity(a); applyVisibility(); });
});
$("#case").addEventListener("change", applyVisibility);
document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((b) =>
  b.addEventListener("click", () => { setSky(false); viewer.view(b.dataset.view as string); }),
);
viewer.onView = (name) => {
  const base = name.split("-")[0];
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.view === base)));
};
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
renderInspector($("#inspector"), null, (ids) => viewer.isolate(ids));
canvas.addEventListener("pointerleave", () => { hover.textContent = ""; });
viewer.onHover = (id) => {
  hover.replaceChildren();
  if (!id || !viewer.graph) return;
  const n = viewer.graph.get(id);
  const el = (cls: string, text: string) => { const s = document.createElement("span"); s.className = cls; s.textContent = text; return s; };
  hover.append(el("name", NAMES[id] ?? id));
  if (n?.teeth) {
    const r = Math.abs(n.rate);
    const turns = r >= 1 ? `turns ${r.toFixed(r >= 10 ? 1 : 2)} times a year` : r > 0 ? `one turn every ${(1 / r).toFixed(1)} years` : "fixed";
    hover.append(el("meta", `${n.teeth} teeth · ${turns}`));
  }
  if (n?.status) hover.append(el("tag", n.status));
  hover.append(el("id", id));
};

function loop(now: number): void {
  if (playing) {
    setYears(years + ((now - last) / 1000) * speed);
  }
  tour.crankRunning(playing);
  last = now;
  viewer.render();
  cosmos.draw();
  requestAnimationFrame(loop);
}
update();
requestAnimationFrame(loop);
