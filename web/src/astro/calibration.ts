/**
 * "Setting the machine": pointer assembly offsets at the epoch, read off the
 * real sky with astronomy-engine, plus the calendar-dial cells at the epoch.
 *
 * At years = 0 every gear sits at its zero, so each pointer needs a fixed
 * rotation on its arbor equal to what the real sky showed on the epoch date.
 * That is exactly how the ancient maker calibrated it, and it means the
 * mechanism's error is zero at the epoch and grows away from it.
 */
import * as Astronomy from "astronomy-engine";
import { timeFromJd, moonApogeeLon, moonNodeLon } from "./truth";
import { julianToJdn } from "./jd";
import { RATE } from "../mech/mechanism";
import { EYU_PER_MONTH, FULL_MOON_OFFSET, NEW_MOON_OFFSET } from "./eym";

/** Where the full moon falls in a Saros cell (Freeth 2014: a month opens at the first crescent, 0 EYu; full moon 17; new moon 36). */
export const CELL_FULL_MOON = FULL_MOON_OFFSET / EYU_PER_MONTH;
/** How far past a new moon a month opens: the first crescent, 2 EYu after the previous month's new moon at 36. */
const CRESCENT_AFTER_NEW = (EYU_PER_MONTH - NEW_MOON_OFFSET) / EYU_PER_MONTH;

export interface CalibrationSet {
  /** dial angles at the epoch, degrees clockwise from the zodiac zero (Aries 0) */
  pointers: Record<string, number>;
  metonicMonth0: number;   // 1..236, fractional: the pointer's place in its cell
  metonicYear0: number;    // 1..19
  callippicQuarter0: number;
  gamesYear0: number;      // 1..4
  sarosMonth0: number;     // 1..224, fractional
  exeligmos0: number;      // 0..2
  /** where each spiral follower stands at the epoch, in turns of its pointer from the spiral's start */
  spiralPhase: { metonic: number; saros: number };
  egyptianDay0: number;    // 1..365
  sunLon0: number; moonLon0: number; apogee0: number; node0: number;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/**
 * The back dials are read from behind, so a pointer that should stand at back-view angle
 * `backDeg` (anticlockwise from the 3 o'clock of someone facing the back) is set to
 * backDeg - 180 in the front-view terms setCalibration takes.
 */
export const backPointerDeg = (backDeg: number) => backDeg - 180;

/** Back-view angles, anticlockwise from 3 o'clock seen from behind, as dials.py and gen_dial_textures.py draw them. */
export const BACK_DIAL = {
  spiralStart: 90,       // Metonic and Saros spirals begin at the top (Freeth); both pointers turn clockwise from behind
  gamesStart: 278,       // year 1 opens at the divider 8 degrees past the bottom, then anticlockwise (Freeth et al. 2008 SI)
  callippicStart: 270,   // first quarter opens at the bottom, then clockwise
  exeligmosStart: 60,    // the blank sector opens at 60 degrees and is centred on 3 o'clock, then 8 and 16 clockwise
} as const;

function geoLon(body: Astronomy.Body, t: Astronomy.AstroTime): number {
  const v = Astronomy.GeoVector(body, t, true);
  return Astronomy.Ecliptic(v).elon;
}

/** Synodic months between two JDs using the machine's own ratio. */
const SYNODIC_DAYS = 365.24218967 / RATE.moonSynodic;

export function calibrate(epochJdn: number, sarosEpochJdn = 1646679): CalibrationSet {
  const jd = epochJdn;                         // noon of the epoch day
  const t = timeFromJd(jd);
  const sun = Astronomy.SunPosition(t).elon;
  const moon = Astronomy.EclipticGeoMoon(t).lon;
  const apogee = moonApogeeLon(jd);
  const node = moonNodeLon(jd);
  const planets = {
    mercury: geoLon(Astronomy.Body.Mercury, t),
    venus: geoLon(Astronomy.Body.Venus, t),
    mars: geoLon(Astronomy.Body.Mars, t),
    jupiter: geoLon(Astronomy.Body.Jupiter, t),
    saturn: geoLon(Astronomy.Body.Saturn, t),
  };
  // Saros dial: Carman & Evans and Freeth (both 2014) put the full moon of month 1 at 12 May 205 BC, with the
  // Exeligmos at 0. The glyphs stay where they put them for any epoch; the epoch only says where the pointer
  // stands, as a fraction of a cell, so an epoch at a new moon (Voulgaris) lands late in its month, not on a boundary.
  const sarosPos = (epochJdn - sarosEpochJdn) / SYNODIC_DAYS + CELL_FULL_MOON;   // cells since cell 1 opened
  const sarosIdx = mod(sarosPos, 223);
  const exeligmos0 = mod(Math.floor(sarosPos / 223), 3);
  // Metonic: cycle 1 began at the new moon of 27 June 432 BC (Meton); 235 months per cycle, each opening at the crescent
  const metonStart = julianToJdn(-431, 6, 27);
  const metMonths = (epochJdn - metonStart) / SYNODIC_DAYS - CRESCENT_AFTER_NEW;
  const metonicIdx = mod(metMonths, 235);
  const metonicYear0 = Math.floor(mod((epochJdn - metonStart) / 365.25, 19)) + 1;
  // Callippic: 76-year period from 28 June 330 BC
  const callStart = julianToJdn(-329, 6, 28);
  const callippicPos = mod((epochJdn - callStart) / 365.25, 76) / 19;
  const callippicQuarter0 = Math.floor(callippicPos);
  // Olympiads: year 1 of Olympiad 1 began mid-summer 776 BC
  const olStart = julianToJdn(-775, 7, 1);
  const gamesPos = mod((epochJdn - olStart) / 365.25, 4);
  const gamesYear0 = Math.floor(gamesPos) + 1;
  const exeligmosPos = mod(sarosPos / 223, 3);
  // Egyptian civil calendar: 1 Thoth of the Nabonassar era = 26 Feb 747 BC, 365-day years
  const nab = julianToJdn(-746, 2, 26);
  const egyptianDay0 = mod(epochJdn - nab, 365) + 1;
  return {
    pointers: {
      date: sun, true_sun: sun, moon, nodes: node,
      ...planets,
      // back dials: each pointer's back-view angle, turned into the front-view angle setCalibration takes
      metonic: backPointerDeg(BACK_DIAL.spiralStart - (metonicIdx / 47) * 360),
      saros: backPointerDeg(BACK_DIAL.spiralStart - (sarosIdx / 55.75) * 360),
      exeligmos: backPointerDeg(BACK_DIAL.exeligmosStart - exeligmosPos * 120),
      games: backPointerDeg(BACK_DIAL.gamesStart + gamesPos * 90),
      callippic: backPointerDeg(BACK_DIAL.callippicStart - callippicPos * 90),
    },
    spiralPhase: { metonic: metonicIdx / 47, saros: sarosIdx / 55.75 },
    metonicMonth0: metonicIdx + 1, metonicYear0, callippicQuarter0, gamesYear0,
    sarosMonth0: sarosIdx + 1, exeligmos0, egyptianDay0,
    sunLon0: sun, moonLon0: moon, apogee0: apogee, node0: node,
  };
}
