/**
 * The parapegma index letters, where Bitsakis and Jones read them.
 *
 * Source: Bitsakis, Y. and Jones, A. (2016), "The Front Dial and Parapegma Inscriptions",
 * Almagest 7.1, 68-137 (open access, CC BY-NC 4.0). There were two alphabetic sequences, one
 * per plate, in four columns of one season each running clockwise round the dial: PP1, the
 * plate above the dial, carries col. i (Capricorn to Pisces, Α to Θ) and col. ii (Aries to
 * Gemini, Ι to Σ); PP2, below, carries col. iii (Libra to Sagittarius, Α to Λ) and col. iv
 * (Cancer to Virgo, Μ to Ω). The same letter therefore stands in two places on the ring.
 *
 * A letter is engraved immediately clockwise of a graduation mark, and graduations are
 * numbered with the sign boundary as graduation 1, so the degree into the sign is the
 * graduation number less one: Α at the 1st graduation of Libra is the autumnal equinox, 180°.
 *
 * `status` says how a position is known: `scale`, read on the bronze of Fragment C;
 * `numeral`, from the number written after the matching parapegma line; `restored`, by the
 * editors; `lost`, a letter whose place is gone, which the dial does not carry and which this
 * module never returns. A lost letter often has no sign either, so `sign` can be null.
 *
 * `nameRestored` is separate from all of that: the letter and its place are certain, but the
 * asterism named in the line was restored or inferred by the editors rather than read.
 */
export interface ParapegmaEntry {
  plate: "PP1" | "PP2";
  column: 1 | 2 | 3 | 4;
  letter: string;
  /** 0 is Aries, 11 is Pisces; null where the letter's sign is not recoverable. */
  sign: number | null;
  graduation: number | null;
  event: string;
  status: "scale" | "numeral" | "restored" | "lost";
  /** Set where the asterism named in `event` is the editors' restoration, not read on the bronze. */
  nameRestored?: true;
}

const ARIES = 0, TAURUS = 1, GEMINI = 2, CANCER = 3, LEO = 4, VIRGO = 5;
const LIBRA = 6, SCORPIO = 7, SAGITTARIUS = 8, CAPRICORN = 9;

export const PARAPEGMA: ParapegmaEntry[] = [
  // PP1 col. i, Capricorn to Pisces. Only the first line has a place: the rest of the column
  // is lost, including the one line that keeps its numeral, 11, whose letter is uncertain.
  { plate: "PP1", column: 1, letter: "Α", sign: CAPRICORN, graduation: 1, event: "Capricorn begins to rise", status: "restored" },
  { plate: "PP1", column: 1, letter: "Β", sign: null, graduation: null, event: "its line is lost", status: "lost" },
  { plate: "PP1", column: 1, letter: "Γ", sign: null, graduation: null, event: "its line is lost", status: "lost" },
  { plate: "PP1", column: 1, letter: "Δ", sign: null, graduation: null, event: "its line is lost", status: "lost" },
  { plate: "PP1", column: 1, letter: "Ε", sign: null, graduation: null, event: "its line is lost", status: "lost" },
  { plate: "PP1", column: 1, letter: "Ζ", sign: null, graduation: null, event: "its line is lost", status: "lost" },
  { plate: "PP1", column: 1, letter: "Η", sign: null, graduation: null, event: "its line is lost", status: "lost" },
  { plate: "PP1", column: 1, letter: "Θ", sign: null, graduation: null, event: "its line is lost", status: "lost" },
  // PP1 col. ii, Aries to Gemini. The scale under these letters is gone, so the positions come
  // from the numerals written after the lines. Λ's numeral is printed ΚΑ, 21, in the paper's
  // Greek and 24 in its English; the Greek is used here.
  { plate: "PP1", column: 2, letter: "Ι", sign: ARIES, graduation: 1, event: "Aries begins to rise", status: "restored" },
  { plate: "PP1", column: 2, letter: "Κ", sign: ARIES, graduation: null, event: "the Pleiades set in the evening", status: "lost" },
  { plate: "PP1", column: 2, letter: "Λ", sign: ARIES, graduation: 21, event: "the Hyades set in the evening", status: "numeral" },
  { plate: "PP1", column: 2, letter: "Μ", sign: TAURUS, graduation: 1, event: "Taurus begins to rise", status: "numeral" },
  { plate: "PP1", column: 2, letter: "Ν", sign: TAURUS, graduation: 11, event: "Lyra rises in the evening", status: "numeral" },
  { plate: "PP1", column: 2, letter: "Ξ", sign: TAURUS, graduation: 17, event: "the Pleiades rise in the morning", status: "numeral" },
  { plate: "PP1", column: 2, letter: "Ο", sign: TAURUS, graduation: 25, event: "the Hyades rise in the morning", status: "numeral" },
  { plate: "PP1", column: 2, letter: "Π", sign: GEMINI, graduation: 1, event: "Gemini begin to rise", status: "restored" },
  { plate: "PP1", column: 2, letter: "Ρ", sign: GEMINI, graduation: null, event: "Aquila rises in the evening", status: "lost" },
  { plate: "PP1", column: 2, letter: "Σ", sign: GEMINI, graduation: 10, event: "Arcturus sets in the morning", status: "numeral" },
  // PP2 col. iii, Libra to Sagittarius: the arc that survives on Fragment C, every letter read
  // on the bronze. The text of five of them is lost even though the place is certain.
  { plate: "PP2", column: 3, letter: "Α", sign: LIBRA, graduation: 1, event: "the Claws begin to rise", status: "scale" },
  { plate: "PP2", column: 3, letter: "Β", sign: LIBRA, graduation: 11, event: "the Haedi rise in the evening", status: "scale", nameRestored: true },
  { plate: "PP2", column: 3, letter: "Γ", sign: LIBRA, graduation: 14, event: "the Pleiades rise in the evening", status: "scale", nameRestored: true },
  { plate: "PP2", column: 3, letter: "Δ", sign: LIBRA, graduation: 16, event: "Corona rises in the morning", status: "scale", nameRestored: true },
  { plate: "PP2", column: 3, letter: "Ε", sign: SCORPIO, graduation: 1, event: "Scorpio begins to rise", status: "scale" },
  { plate: "PP2", column: 3, letter: "Ζ", sign: SCORPIO, graduation: 4, event: "its line is lost", status: "scale" },
  { plate: "PP2", column: 3, letter: "Η", sign: SCORPIO, graduation: 17, event: "its line is lost", status: "scale" },
  { plate: "PP2", column: 3, letter: "Θ", sign: SCORPIO, graduation: 22, event: "its line is lost", status: "scale" },
  { plate: "PP2", column: 3, letter: "Ι", sign: SAGITTARIUS, graduation: 1, event: "Sagittarius begins to rise", status: "scale", nameRestored: true },
  { plate: "PP2", column: 3, letter: "Κ", sign: SAGITTARIUS, graduation: 3, event: "its line is lost", status: "scale" },
  { plate: "PP2", column: 3, letter: "Λ", sign: SAGITTARIUS, graduation: 7, event: "its line is lost", status: "scale" },
  // PP2 col. iv, Cancer to Virgo. Three events are known with their degrees lost, six lines are
  // gone altogether, and the last two are read on the bronze at the end of Virgo.
  { plate: "PP2", column: 4, letter: "Μ", sign: CANCER, graduation: 1, event: "Cancer begins to rise", status: "restored" },
  { plate: "PP2", column: 4, letter: "Ν", sign: CANCER, graduation: null, event: "Orion rises in the morning", status: "lost" },
  { plate: "PP2", column: 4, letter: "Ξ", sign: CANCER, graduation: null, event: "Sirius rises in the morning", status: "lost" },
  { plate: "PP2", column: 4, letter: "Ο", sign: CANCER, graduation: null, event: "Aquila sets in the morning", status: "lost" },
  { plate: "PP2", column: 4, letter: "Π", sign: LEO, graduation: 1, event: "Leo begins to rise", status: "restored" },
  { plate: "PP2", column: 4, letter: "Ρ", sign: null, graduation: null, event: "its line is lost", status: "lost" },
  { plate: "PP2", column: 4, letter: "Σ", sign: null, graduation: null, event: "its line is lost", status: "lost" },
  { plate: "PP2", column: 4, letter: "Τ", sign: null, graduation: null, event: "its line is lost", status: "lost" },
  { plate: "PP2", column: 4, letter: "Υ", sign: null, graduation: null, event: "its line is lost", status: "lost" },
  { plate: "PP2", column: 4, letter: "Φ", sign: null, graduation: null, event: "its line is lost", status: "lost" },
  { plate: "PP2", column: 4, letter: "Χ", sign: null, graduation: null, event: "its line is lost", status: "lost" },
  { plate: "PP2", column: 4, letter: "Ψ", sign: VIRGO, graduation: 19, event: "Capella rises in the evening", status: "scale", nameRestored: true },
  { plate: "PP2", column: 4, letter: "Ω", sign: VIRGO, graduation: 21, event: "Arcturus rises in the morning", status: "scale", nameRestored: true },
];

/** Where the letter stands on the ring, in degrees of ecliptic longitude, or null if its place is lost. */
export function entryLongitude(e: ParapegmaEntry): number | null {
  return e.sign === null || e.graduation === null ? null : e.sign * 30 + e.graduation - 1;
}

/**
 * What the Sun pointer is passing: the letter under it, within 0.6° either side, or else the
 * next letter clockwise, with the distance to it in degrees. Letters whose place is lost are
 * not on the ring and are never returned. The window is measured round the circle, so a Sun a
 * fraction short of Aries stands on Ι exactly as one a fraction past it does.
 */
export function parapegmaAt(sunLon: number): { letter: string; event: string; status: string; nameRestored: boolean; ahead: number } {
  const lon = ((sunLon % 360) + 360) % 360;
  const placed = PARAPEGMA.filter((e) => entryLongitude(e) !== null);
  const arc = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
  const under = placed.find((e) => arc(entryLongitude(e) as number, lon) <= 0.6);
  if (under) return { letter: under.letter, event: under.event, status: under.status, nameRestored: under.nameRestored === true, ahead: 0 };
  let next = placed[0], gap = 360;
  for (const e of placed) {
    const d = ((entryLongitude(e) as number) - lon + 360) % 360;
    if (d > 0 && d < gap) { gap = d; next = e; }
  }
  return { letter: next.letter, event: next.event, status: next.status, nameRestored: next.nameRestored === true, ahead: Math.round(gap * 10) / 10 };
}
