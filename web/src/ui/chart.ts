/**
 * The accuracy chart. Chart.js is a third of the bundle, so this module is imported only when a
 * visitor opens "How accurate was it?" (see refreshAnalytics in main.ts).
 */
import { Chart, type ChartConfiguration } from "chart.js/auto";
import type { ErrorBands } from "./analytics";

/** Chart colours follow the version: bronze and verdigris on lamp-black, or inks on parchment. */
function palette() {
  return document.documentElement.dataset.theme === "manuscript"
    ? { grid: "rgba(60, 45, 30, 0.10)", tick: "#5a4a3a", font: "Cardo, Georgia, serif", moon: "#a8462c", moonMean: "rgba(168,70,44,0.35)", sun: "#3f7d6b" }
    : { grid: "rgba(230, 210, 170, 0.08)", tick: "#a89c86", font: "Alegreya, Georgia, serif", moon: "#e8c27a", moonMean: "rgba(232,194,122,0.35)", sun: "#7fb8a8" };
}

/** A colour with its alpha replaced, for the filled bands. */
function withAlpha(c: string, a: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (m) { const n = parseInt(m[1], 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
  const inner = /\(([^)]+)\)/.exec(c)?.[1] ?? "0,0,0";
  return `rgba(${inner.split(",").slice(0, 3).map((x) => x.trim()).join(",")},${a})`;
}

export function drawErrorChart(canvas: HTMLCanvasElement, bands: ErrorBands, existing?: Chart): Chart {
  existing?.destroy();
  const DARK = palette();
  // the legend is drawn in the column's own voice (a line of swatches under the chart), not Chart.js's boxes
  const legend = canvas.parentElement?.nextElementSibling?.classList.contains("chart-legend") ? canvas.parentElement.nextElementSibling : null;
  if (legend) {
    const rows: [string, string, boolean][] = [[DARK.moon, "Moon, with the pin-and-slot", true], [DARK.moonMean, "Moon, mean motion only", true], [DARK.sun, "Sun", true]];
    legend.replaceChildren(...rows.map(([c, t, band]) => {
      const s = document.createElement("span"); const i = document.createElement("i"); i.style.background = c; if (band) i.classList.add("band"); s.append(i, t); return s;
    }));
  }
  const band = (label: string, hi: number[], lo: number[], colour: string, edge: number, fillA: number) => [
    { label: `${label}, most`, data: hi, borderColor: withAlpha(colour, edge), backgroundColor: withAlpha(colour, fillA), borderWidth: 0.8, pointRadius: 0, tension: 0, fill: "+1" as const },
    { label: `${label}, least`, data: lo, borderColor: withAlpha(colour, edge), borderWidth: 0.8, pointRadius: 0, tension: 0, fill: false as const },
  ];
  const cfg: ChartConfiguration = {
    type: "line",
    data: {
      labels: bands.years.map((y) => y.toFixed(1)),
      datasets: [
        ...band("Moon, with the pin-and-slot", bands.moonMax, bands.moonMin, DARK.moon, 0.9, 0.38),
        ...band("Moon, mean motion only", bands.meanMax, bands.meanMin, DARK.moonMean, 0.5, 0.16),
        ...band("Sun", bands.sunMax, bands.sunMin, DARK.sun, 0.9, 0.3),
      ],
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: {
        x: { ticks: { color: DARK.tick, maxTicksLimit: 8, font: { size: 11, family: DARK.font } }, grid: { color: DARK.grid }, title: { display: true, text: "years from the epoch", color: DARK.tick, font: { size: 12, family: DARK.font, style: "italic" } } },
        y: { ticks: { color: DARK.tick, font: { size: 11, family: DARK.font } }, grid: { color: DARK.grid }, title: { display: true, text: "machine minus sky, degrees", color: DARK.tick, font: { size: 12, family: DARK.font, style: "italic" } } },
      },
    },
  };
  return new Chart(canvas, cfg);
}
