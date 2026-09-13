/** Guided tour: narrated clips with camera moves, plus optional gear sounds. */
export interface TourClip { id: string; view: string; text: string; file: string; duration: number | null }
export interface TourManifest { voice: string; clips: TourClip[] }

export class Tour {
  private audio = new Audio();
  private clips: TourClip[] = [];
  private index = -1;
  private sfxEnabled = false;
  private crank: HTMLAudioElement | null = null;
  onView: ((view: string) => void) | null = null;
  onClip: ((clip: TourClip | null, index: number, total: number) => void) | null = null;

  async load(base = "./audio"): Promise<boolean> {
    try {
      const r = await fetch(`${base}/tour.json`);
      if (!r.ok) return false;
      const m = (await r.json()) as TourManifest;
      this.clips = m.clips;
      this.audio.addEventListener("ended", () => this.next());
      this.crank = new Audio(`${base}/sfx_crank_loop.mp3`);
      this.crank.loop = true;
      this.crank.volume = 0.35;
      return this.clips.length > 0;
    } catch {
      return false;
    }
  }

  get available(): boolean { return this.clips.length > 0; }
  get playing(): boolean { return !this.audio.paused && this.index >= 0; }

  start(): void { this.index = -1; this.next(); }
  stop(): void { this.audio.pause(); this.index = -1; this.onClip?.(null, 0, this.clips.length); }
  next(): void {
    this.index++;
    if (this.index >= this.clips.length) { this.stop(); return; }
    const c = this.clips[this.index];
    this.audio.src = `./${c.file}`;
    this.audio.play().catch(() => undefined);
    this.onView?.(c.view);
    this.onClip?.(c, this.index, this.clips.length);
  }
  prev(): void { this.index = Math.max(-1, this.index - 2); this.next(); }

  setSfx(on: boolean): void {
    this.sfxEnabled = on;
    if (!on) this.crank?.pause();
  }
  /** Call every frame with whether the crank is turning. */
  crankRunning(running: boolean): void {
    if (!this.crank || !this.sfxEnabled) return;
    if (running && this.crank.paused) this.crank.play().catch(() => undefined);
    if (!running && !this.crank.paused) this.crank.pause();
  }
  chime(): void {
    if (!this.sfxEnabled) return;
    const a = new Audio("./audio/sfx_eclipse_chime.mp3");
    a.volume = 0.5;
    a.play().catch(() => undefined);
  }
}
