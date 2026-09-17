/** Gear inspector: the trains as the papers write them, with live angles. */
import type { GearGraph } from "../mech/gearGraph";

export interface TrainSpec { name: string; gears: string[]; ratio: string; note: string }

export const TRAINS: TrainSpec[] = [
  { name: "Input", gears: ["a1", "b1"], ratio: "48 → 223", note: "crank crown wheel to the main wheel; 4.65 turns per year" },
  { name: "Sidereal Moon", gears: ["b2", "c1", "c2", "d1", "d2", "e2"], ratio: "64/38 · 48/24 · 127/32 = 254/19", note: "the Moon circles the zodiac 254 times in 19 years" },
  { name: "Lunar anomaly", gears: ["e5", "k1", "k2", "e6", "e1", "b3"], ratio: "pin-and-slot on the e3 platform", note: "k1/k2 axes 1.1 mm apart; ±6.5° swing once per anomalistic month" },
  { name: "Apsides carrier", gears: ["l1", "l2", "m1", "m3", "e3"], ratio: "−64/38 · 53/96 · 27/223 = −477/4237", note: "e3 turns once in 8.88 years, carrying the pin-and-slot round with the Moon's orbit" },
  { name: "Metonic", gears: ["l1", "l2", "m1", "m2", "n1"], ratio: "64/38 · 53/96 · 15/53 = 5/19", note: "5 turns of the spiral in 19 years, 235 months" },
  { name: "Games", gears: ["n2", "o1"], ratio: "57/60 of 5/19 = 1/4", note: "one turn in 4 years, the only dial that runs the other way" },
  { name: "Callippic", gears: ["n3", "p1", "p2", "cal1"], ratio: "15/60 · 12/60 of 5/19 = 1/76", note: "four Metonic cycles minus one day" },
  { name: "Saros", gears: ["e3", "e4", "f1", "f2", "g1"], ratio: "188/53 · 30/54 of the e3 rate = 940/4237", note: "4 turns of the spiral in 223 months: 18 years 11⅓ days" },
  { name: "Exeligmos", gears: ["g2", "h1", "h2", "i1"], ratio: "20/60 · 15/60 = 1/12", note: "one turn in three Saros = 54 years; adds 0, 8 or 16 hours" },
  { name: "Phase ball", gears: ["b0", "q1"], ratio: "differential: 254/19 − 1 = 235/19", note: "the crown gear on the Moon pointer turns once a synodic month" },
  { name: "Nodes (Dragon hand)", gears: ["nod49", "nod62", "nod64", "nod48"], ratio: "1 − 49·64/(62·48) = −5/93", note: "the lunar nodes regress once in 18.6 years" },
  { name: "Mercury", gears: ["fix51", "me72", "me89", "me40", "me20"], ratio: "51·89/(72·20) = 1513/480", note: "1513 synodic cycles in 480 years; pin-and-follower" },
  { name: "Venus", gears: ["fix51", "ve44", "ve34", "ve26", "r1"], ratio: "51·34/(44·63) = 289/462", note: "462 years read on the front cover inscription; r1 is the Fragment D gear" },
  { name: "True Sun", gears: ["fix56", "sa52", "su56"], ratio: "56 ~ 52 ~ 56, follower", note: "an eccentric pin gives the Sun its unequal seasons" },
  { name: "Mars", gears: ["fix56", "ju64", "ma38", "ma40", "ma71", "ma80a", "ma80b"], ratio: "56·38/(64·71) = 133/284", note: "pin-and-slot offset 6.58 mm: the largest retrograde loops" },
  { name: "Jupiter", gears: ["fix56", "ju64", "ju45", "ju40", "ju43", "ju65a", "ju65b"], ratio: "56·45/(64·43) = 315/344", note: "offset 1.58 mm" },
  { name: "Saturn", gears: ["fix56", "sa52", "sa61", "sa40", "sa68", "sa86a", "sa86b"], ratio: "56·61/(52·68) = 427/442", note: "442 years read on the front cover inscription; offset 1.50 mm" },
];

/** The train a gear belongs to: the first that lists it, which is the one the exhibit shows. */
export function trainFor(id: string): TrainSpec | undefined {
  return TRAINS.find((t) => t.gears.includes(id));
}

/** The id a train's row carries in the column, so the scene and the column always mean the same row. */
export function trainRowId(t: TrainSpec): string {
  return "train-" + t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
}

export function renderInspector(el: HTMLElement, graph: GearGraph | null, onPick: (ids: string[]) => void): void {
  el.replaceChildren(
    ...TRAINS.map((t) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "train";
      row.setAttribute("aria-pressed", "false");
      row.id = trainRowId(t);
      const h = document.createElement("div");
      h.className = "train-h";
      h.textContent = t.name;
      const r = document.createElement("div");
      r.className = "train-r";
      r.textContent = t.ratio;
      const g = document.createElement("div");
      g.className = "train-g";
      t.gears.forEach((id, i) => {                                 // the gears that survive in the fragments stand upright; the reconstructed lean
        const n = graph?.get(id);
        const s = document.createElement("span");
        s.textContent = n?.teeth ? `${id} (${n.teeth})` : id;
        if (n?.status && n.status !== "surviving") { s.className = "g-hyp"; s.title = `${n.status}: not found in the fragments`; }
        else if (n?.status) s.title = "survives in the fragments";
        g.append(s);
        if (i < t.gears.length - 1) g.append("  ~  ");
      });
      const n = document.createElement("div");
      n.className = "train-n";
      n.textContent = t.note;
      row.append(h, r, g, n);
      row.addEventListener("click", () => {
        const on = row.getAttribute("aria-pressed") === "true";
        el.querySelectorAll(".train").forEach((r) => r.setAttribute("aria-pressed", "false"));
        row.setAttribute("aria-pressed", on ? "false" : "true");
        onPick(t.gears);
      });
      return row;
    }),
  );
}
