/**
 * Onboarding walkthrough: a sequence of steps that explain the machine, each
 * driving the scene (camera, crank, x-ray, isolated trains) and pointing at the
 * relevant panel, with optional narration from web/public/audio/tour.json.
 */
export interface StepHooks {
  view(name: string): void;
  setYears(y: number): void;
  play(on: boolean, speedYearsPerSec?: number): void;
  xray(on: boolean): void;
  isolate(ids: string[]): void;
  focus(selector: string | null): void;
  jumpNextLunarEclipse(): void;
  setEpoch(id: string): void;
  /** the CT scan of Fragment A over the reconstruction: 0 = model only, 1 = the corroded original only */
  fragment(opacity: number): void;
  /** the Sky view on the stage */
  sky(on: boolean): void;
  /** the room's light: "spot" brings it down around the exhibit */
  mood(name: "room" | "spot"): void;
  /** put the scene back the way a visitor expects after the tour */
  reset(): void;
}

export interface Step {
  id: string;
  title: string;
  body: string;
  clip?: string;              // id in tour.json
  run(h: StepHooks): void;
}

const LUNAR_TRAIN = ["b2", "c1", "c2", "d1", "d2", "e2", "e5", "k1", "k2", "e6", "e1", "b3", "l1", "l2", "m1", "m3", "e3"];

export const STEPS: Step[] = [
  {
    id: "welcome", title: "A machine that models the sky", clip: "welcome",
    body: "This is a working reconstruction of the Antikythera mechanism, the geared astronomical calculator pulled from a Roman-era shipwreck in 1901. All 69 gears turn here with the tooth counts read from the X-ray scans, following the 2021 UCL reconstruction, so every pointer moves exactly as the bronze would have.",
    run: (h) => { h.mood("room"); h.sky(false); h.fragment(0); h.isolate([]); h.xray(false); h.view("iso"); h.setYears(0); h.play(false); h.focus(null); },
  },
  {
    id: "found", title: "What the divers found", clip: "discovery",
    body: "In 1901 sponge divers working a Roman-era wreck off Antikythera brought up a corroded lump of bronze that split into fragments. This is Fragment A, the largest, from a CT scan of the original: two thousand years of seawater have turned the metal to a green crust, but the four spokes of the main wheel still show through it. Thirty of the gears survive in the fragments; the rest are inferred from those.",
    run: (h) => { h.mood("spot"); h.sky(false); h.isolate([]); h.xray(false); h.play(false); h.setYears(0); h.fragment(1); h.view("front-close"); h.focus(null); },
  },
  {
    id: "xray", title: "Seeing inside the corrosion", clip: "xray",
    body: "In 2005 a twelve-tonne X-ray tomography machine was carried to Athens and scanned the fragments slice by slice. Inside the crust were the gears, their teeth countable one by one, and two thousand characters of Greek that no one had read since antiquity. Here the reconstruction is laid inside the scan so the wheels show through the corrosion: everything that follows was built from those tooth counts.",
    run: (h) => { h.mood("spot"); h.sky(false); h.isolate([]); h.fragment(0.45); h.xray(true); h.play(true, 0.0821918); h.view("front-close"); h.focus(null); },
  },
  {
    id: "crank", title: "One crank, one year", clip: "crank",
    body: "Everything starts at the crank on the right. It turns a 48-tooth crown wheel against the 223-tooth main wheel: four and two-thirds turns of the crank move the main wheel once round, which is one year. Every other pointer is geared off that single rotation.",
    run: (h) => { h.mood("room"); h.fragment(0); h.xray(false); h.view("crank"); h.play(true, 0.0821918); h.focus("#panel-crank"); },
  },
  {
    id: "epoch", title: "Why everything is counted from an epoch", clip: "epoch",
    body: "The machine has no clock inside it. It was set by hand once, on one particular day, and after that it only counts turns. That day is the epoch. Nothing on the bronze states it, so scholars inferred it from the eclipse glyphs on the Saros dial: the pattern of 51 glyphs fits only certain starting months. Carman & Evans found the full moon of 12 May 205 BC; Voulgaris argues for 22 Dec 178 BC. Switch between them and every dial re-sets. Because the machine only knows turns, dates here are written as years since epoch, and its errors grow the further you crank from it.",
    run: (h) => { h.fragment(0); h.xray(false); h.play(false); h.setYears(0); h.view("front"); h.focus("#epoch"); },
  },
  {
    id: "zodiac", title: "The front dial is the sky", clip: "zodiac",
    body: "The inner ring is the zodiac, twelve signs of 30°. The outer ring is the Egyptian civil calendar of 365 days, which the owner could slip round one day every four years to stay in step with the seasons. The date pointer reads the calendar; the true-sun pointer with its golden ball reads the zodiac. The plates above and below carry the parapegma, a list of star risings and settings keyed to letters on the dial.",
    run: (h) => { h.view("front-close"); h.play(false); h.focus("#front-dl"); },
  },
  {
    id: "moon", title: "The Moon and its phase", clip: "moon",
    body: "The moon pointer runs through five gears whose counts multiply out to exactly 254/19: in nineteen years the Moon circles the zodiac 254 times, the Metonic relation. The little half-silver ball turns once a lunar month, driven by a differential between the sun and moon pointers, showing the phase. Watch it now at a month per second. The Moon in the column is lit the way the ball is; its face is the near side as NASA's LROC cameras mapped it.",
    run: (h) => { h.view("front-close"); h.play(true, 0.0821918); h.focus("#moon"); },
  },
  {
    id: "pinslot", title: "The pin and slot", clip: "pinslot",
    body: "Hidden at the back are two 50-tooth gears face to face on axes offset by 1.1 mm, a pin on one riding in a slot on the other. As they turn, the slotted gear speeds up and slows down by ±6.5°: the Moon's own acceleration near perigee. The pair rides on a 223-tooth platform that creeps round once in nine years, so the swing follows the slowly turning lunar orbit. Nothing this sophisticated appears again for over a thousand years.",
    run: (h) => { h.mood("spot"); h.play(true, 0.0821918); h.xray(true); h.isolate(LUNAR_TRAIN); h.view("pinslot"); h.focus("#train-lunar-anomaly"); },
  },
  {
    id: "backdials", title: "The calendars on the back", clip: "backdials",
    body: "The upper spiral is the Metonic calendar: 235 months in five turns, nineteen years, named in the Corinthian dialect of north-west Greece. Inside it one small dial counts the 76-year Callippic period and another the four-year cycle of the games: Olympia, Pythia, Nemea, Isthmia. Both spiral pointers carry a pin that slides outward along the groove as the years pass.",
    run: (h) => { h.mood("room"); h.isolate([]); h.xray(false); h.view("back-upper"); h.play(true, 0.0821918); h.focus("#back-dl"); },
  },
  {
    id: "saros", title: "Predicting eclipses", clip: "saros",
    body: "The lower spiral is the Saros: 223 months, after which eclipses repeat. Fifty-one cells carry glyphs, Σ for a lunar eclipse and Η for a solar one, with the hour. A Saros is a third of a day longer than 6,585 days, so the small Exeligmos dial adds 0, 8 or 16 hours. The panel compares the glyph in the current cell with NASA's catalogue of real eclipses. We have jumped to the next lunar eclipse.",
    run: (h) => { h.play(false); h.jumpNextLunarEclipse(); h.view("back-lower"); h.focus("#eclipse"); },
  },
  {
    id: "cosmos", title: "The planets", clip: "cosmos",
    body: "The 2021 reconstruction adds a cosmos on the front: rings for Mercury, Venus, Mars, Jupiter and Saturn, each with its own epicyclic module and a coloured stone. The period relations come from the machine's cover inscription: 462 years for Venus, 442 for Saturn. Watch the red stone of Mars now, at a month a second: its pin-and-slot has the largest offset, and the ring slows, stops and runs backwards through its retrograde loop.",
    run: (h) => { h.sky(false); h.isolate([]); h.xray(false); h.view("front-close"); h.play(true, 0.0821918); h.focus("#train-mars"); },
  },
  {
    id: "sky", title: "The sky it tracks", clip: "sky",
    body: "The same machine drawn as a sky: Earth in the middle, each body where its own pin-and-slot puts it, trailing the path it has followed. The outer planets loop backwards each time the Earth overtakes them, and the loops these gears draw are the ones Ptolemy drew, because his epicycles and these pins are the same idea. The green ticks on the rim are the true sky, so you can see how close the bronze comes.",
    run: (h) => { h.isolate([]); h.xray(false); h.sky(true); h.play(true, 0.0821918); h.focus("#panel-cosmos"); },
  },
  {
    id: "accuracy", title: "How good was it?", clip: "accuracy",
    body: "Against a modern ephemeris the mean Sun drifts a fraction of a degree per century. The Moon, thanks to the pin and slot, stays within about two degrees; what remains is the evection and variation, which the machine does not model. Over three Saros cycles every solar glyph and most lunar glyphs land on real eclipses. The chart and the audit below update for whichever epoch you choose.",
    run: (h) => { h.sky(false); h.isolate([]); h.xray(false); h.play(false); h.view("front"); h.focus("#chart-moon"); },
  },
  {
    id: "explore", title: "Explore", clip: "explore",
    body: "Drag to orbit, scroll to zoom, hover a gear for its tooth count and rate, and click it to see its train alone. Inside lifts the plates away; Taken apart spreads every wheel along its arbor. Drag the crank handle to wind it by hand, or press the space bar; jump to the next eclipse, type a year, or press today and see how far twenty-two centuries have carried the pointers. Share copies a link to whatever you have set up, and save this view keeps it as a picture. Tick crank & chime in the top bar to hear it. Everything you see is computed from the gear table, and everything it claims is checked against the sky.",
    run: (h) => { h.mood("room"); h.sky(false); h.fragment(0); h.isolate([]); h.xray(false); h.view("iso"); h.play(true, 0.0821918); h.focus(null); },   // leave it turning, as a museum would
  },
];

interface Manifest { clips: { id: string; file: string }[] }

export class Onboarding {
  private el: HTMLElement;
  private index = -1;
  private audio = new Audio();
  private files = new Map<string, string>();
  narrate = true;
  onDone: (() => void) | null = null;

  constructor(private hooks: StepHooks, private steps: Step[] = STEPS) {
    this.el = document.createElement("div");
    this.el.className = "onboard";
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="onboard-card">
        <div class="onboard-head"><span class="onboard-step"></span><span class="onboard-mini-title"></span><span class="onboard-head-btns"><button class="onboard-min" title="fold the card away; the narration goes on">–</button><button class="onboard-close" title="close">✕</button></span></div>
        <h3 class="onboard-title"></h3>
        <p class="onboard-body"></p>
        <div class="onboard-foot">
          <label class="chk"><input type="checkbox" class="onboard-narrate" checked /> narration</label>
          <span class="onboard-keys small">← → keys · Esc closes</span>
          <span class="btns"><button class="mini onboard-prev">back</button><button class="mini onboard-next">next</button></span>
        </div>
        <span class="onboard-progress"><i></i></span>
      </div>`;
    (document.getElementById("onboard-slot") ?? document.body).replaceWith(this.el);
    this.el.id = "onboard-slot";
    this.el.querySelector(".onboard-close")!.addEventListener("click", () => this.close());
    this.el.querySelector(".onboard-min")!.addEventListener("click", () => this.setFolded(!this.el.classList.contains("folded")));
    try { if (localStorage.getItem("am_tour_folded") === "1") this.setFolded(true); } catch { /* ignore */ }
    this.el.querySelector(".onboard-prev")!.addEventListener("click", () => this.prev());
    this.el.querySelector(".onboard-next")!.addEventListener("click", () => this.next());
    this.el.querySelector<HTMLInputElement>(".onboard-narrate")!.addEventListener("change", (e) => {
      this.narrate = (e.target as HTMLInputElement).checked;
      if (!this.narrate) this.audio.pause(); else this.speak();
    });
    addEventListener("keydown", (e) => {
      if (this.el.hidden) return;
      if (e.key === "ArrowRight" || e.key === "Enter") this.next();
      else if (e.key === "ArrowLeft") this.prev();
      else if (e.key === "Escape") this.close();
    });
  }

  async load(base = "./audio"): Promise<void> {
    try {
      const m = (await (await fetch(`${base}/tour.json`)).json()) as Manifest;
      for (const c of m.clips) this.files.set(c.id, c.file);
    } catch { /* narration optional */ }
  }

  get active(): boolean { return !this.el.hidden; }

  /** Folded: one line (leaf, title, back/next) at the foot of the stage; the narration and the scene carry on. */
  setFolded(on: boolean): void {
    this.el.classList.toggle("folded", on);
    (this.el.querySelector(".onboard-min") as HTMLButtonElement).textContent = on ? "+" : "–";
    (this.el.querySelector(".onboard-min") as HTMLButtonElement).title = on ? "open the card" : "fold the card away; the narration goes on";
    try { localStorage.setItem("am_tour_folded", on ? "1" : "0"); } catch { /* ignore */ }
  }

  start(at = 0): void {
    this.el.hidden = false;
    this.index = at - 1;
    this.next();
  }

  next(): void {
    if (this.index + 1 >= this.steps.length) { this.close(); return; }
    this.index++;
    this.show();
  }

  prev(): void {
    if (this.index <= 0) return;
    this.index--;
    this.show();
  }

  /** Closing keeps the scene as it is: a visitor who stops at the pin and slot stays there. */
  close(): void {
    this.el.hidden = true;
    this.audio.pause();
    this.hooks.focus(null);
    try { localStorage.setItem("am_onboarded", "1"); } catch { /* ignore */ }
    this.onDone?.();
  }

  private show(): void {
    const s = this.steps[this.index];
    const ms = document.documentElement.dataset.theme === "manuscript";        // the manuscript numbers its leaves in roman
    const num = (n: number) => (ms ? roman(n) : String(n));
    this.el.querySelector(".onboard-step")!.textContent = `Walkthrough · ${num(this.index + 1)} of ${num(this.steps.length)}`;
    this.el.querySelector(".onboard-title")!.textContent = s.title;
    this.el.querySelector(".onboard-mini-title")!.textContent = s.title;
    this.el.querySelector(".onboard-body")!.textContent = s.body;
    (this.el.querySelector(".onboard-progress i") as HTMLElement).style.width = `${((this.index + 1) / this.steps.length) * 100}%`;
    (this.el.querySelector(".onboard-prev") as HTMLButtonElement).disabled = this.index === 0;
    this.el.querySelector(".onboard-next")!.textContent = this.index === this.steps.length - 1 ? "finish" : "next";
    s.run(this.hooks);
    this.speak();
  }

  private speak(): void {
    const s = this.steps[this.index];
    this.audio.pause();
    if (!this.narrate || !s?.clip) return;
    const f = this.files.get(s.clip);
    if (!f) return;
    this.audio.src = `./${f}`;
    this.audio.play().catch(() => undefined);
  }
}

/** Lower-case roman numerals, as a scribe would number a folio. */
export function roman(n: number): string {
  const t: [number, string][] = [[10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
  let out = "";
  for (const [v, s] of t) while (n >= v) { out += s; n -= v; }
  return out;
}

export function firstVisit(): boolean {
  try { return !localStorage.getItem("am_onboarded"); } catch { return true; }
}
