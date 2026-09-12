import { Viewer } from "./scene/viewer";
import { EPOCHS, mechanismState, type MechanismState } from "./mech/mechanism";
import { formatJd } from "./astro/jd";
import { drawMoon } from "./ui/moon";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

const canvas = $<HTMLCanvasElement>("#stage");
const viewer = new Viewer({ canvas, url: "./models/antikythera.glb" });

let years = 0;
let epoch = EPOCHS[0];
let playing = false;
let speed = 1; // years per second
let last = performance.now();

const yearsInput = $<HTMLInputElement>("#years");
const yearsVal = $("#years-val");
const hover = $("#hover");

function fmt(x: number, digits = 2): string {
  return x.toFixed(digits);
}
function dl(el: HTMLElement, rows: [string, string][]): void {
  el.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
}

function update(): void {
  const s: MechanismState = mechanismState(years, epoch.jdn);
  viewer.setYears(years);
  $("#date-main").textContent = formatJd(s.jd);
  $("#date-sub").textContent = `JD ${s.jd.toFixed(2)} · ${epoch.label}`;
  yearsVal.textContent = years.toFixed(4);
  dl($("#front-dl"), [
    ["Sun (mean)", `${fmt(s.sunMean, 1)}° · ${s.zodiacSign.split(" ")[0]} ${fmt(s.zodiacDeg, 1)}°`],
    ["Moon", `${fmt(s.moon, 1)}°`],
    ["  anomaly", `${s.moonAnomaly >= 0 ? "+" : ""}${fmt(s.moonAnomaly, 2)}°`],
    ["Apogee", `${fmt(s.apsides, 1)}°`],
    ["Dragon hand", `${fmt(s.nodes, 1)}° (asc. node)`],
    ["Egyptian date", `${s.egyptianMonth} ${s.egyptianDayOfMonth}`],
  ]);
  dl($("#moon-dl"), [
    ["Phase", s.phaseName],
    ["Elongation", `${fmt(s.elongation, 1)}°`],
    ["Illuminated", `${fmt(s.illuminated * 100, 0)} %`],
    ["Age", `${fmt(s.moonAgeDays, 1)} d`],
  ]);
  dl($("#back-dl"), [
    ["Metonic", `cell ${s.metonicCell} / 235 · turn ${s.metonicTurn + 1}`],
    ["  month", s.metonicMonthName],
    ["  year", `${s.metonicYear} of 19`],
    ["Callippic", `quarter ${s.callippicQuarter + 1} of 4`],
    ["Games", `year ${s.gamesYear}: ${s.gamesNames.join(" · ")}`],
    ["Saros", `cell ${s.sarosCell} / 223 · turn ${s.sarosTurn + 1}`],
    ["Exeligmos", `+${s.exeligmosHours} h`],
  ]);
  drawMoon($<HTMLCanvasElement>("#moon"), s.elongation);
}

yearsInput.addEventListener("input", () => {
  years = parseFloat(yearsInput.value);
  update();
});
$("#play").addEventListener("click", () => {
  playing = !playing;
  $("#play").textContent = playing ? "❚❚" : "▶";
  last = performance.now();
});
$<HTMLSelectElement>("#speed").addEventListener("change", (e) => {
  speed = parseFloat((e.target as HTMLSelectElement).value);
});
$<HTMLSelectElement>("#epoch").addEventListener("change", (e) => {
  epoch = EPOCHS.find((x) => x.id === (e.target as HTMLSelectElement).value) ?? EPOCHS[0];
  update();
});
$("#epoch-btn").addEventListener("click", () => {
  years = 0;
  yearsInput.value = "0";
  update();
});
document.querySelectorAll<HTMLButtonElement>(".views button").forEach((b) =>
  b.addEventListener("click", () => viewer.view(b.dataset.view as "front")),
);
viewer.onHover = (id) => {
  if (!id || !viewer.graph) { hover.textContent = ""; return; }
  const n = viewer.graph.get(id);
  hover.textContent = n ? `${id} · ${n.teeth ?? "—"} teeth · ${n.rate.toFixed(4)} rot/yr` : id;
};

function loop(now: number): void {
  if (playing) {
    years += ((now - last) / 1000) * speed;
    yearsInput.value = String(years);
    update();
  }
  last = now;
  viewer.render();
  requestAnimationFrame(loop);
}
update();
requestAnimationFrame(loop);
