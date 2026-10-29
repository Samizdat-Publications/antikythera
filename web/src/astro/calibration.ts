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
import { RATE, metonicCellInfo } from "../mech/mechanism";
import { TROPICAL_YEAR } from "./jd";
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
  callippicYears0: number; // years into the 76-year period, fractional
  gamesYear0: number;      // 1..4
  sarosMonth0: number;     // 1..224, fractional
  exeligmos0: number;      // 0..2
  egyptianDay0: number;    // 1..365
  sunLon0: number; moonLon0: number; apogee0: number; node0: number;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

function geoLon(body: Astronomy.Body, t: Astronomy.AstroTime): number {
  const v = Astronomy.GeoVector(body, t, true);
  return Astronomy.Ecliptic(v).elon;
}

/** Synodic months between two JDs using the machine's own ratio. */
const SYNODIC_DAYS = 365.24218967 / RATE.moonSynodic;

/** Julian Day of the first new Moon after the autumnal equinox of astronomical year `year`: the start of a
 *  Corinthian year (Phoinikaios), since Apellaios, the last month, "normally" began "with the last new Moon
 *  before the autumnal equinox" (Freeth et al. 2008 SI 3.5). */
function corinthianNewYear(year: number): number {
  const equinox = Astronomy.SearchSunLongitude(180, timeFromJd(julianToJdn(year, 9, 1)), 40);
  const newMoon = equinox && Astronomy.SearchMoonPhase(0, equinox, 40);
  if (!newMoon) throw new Error("no new moon after the equinox");
  return newMoon.ut + 2451545.0;
}

/** A Metonic cycle begins in autumn 221 BC (astronomical -220). The 2008 SI (3.5) has the Olympiad pointer pointing
 *  straight down at the start of Metonic year 1, so year 1 of the Games dial is year 1 of the Metonic cycle;
 *  for the dial's Olympia to fall in real Olympic years, a cycle must begin in the autumn before an Olympic
 *  summer. Of those cycles (every 19 years from this one) this is the one that contains both epochs. */
const METONIC_CYCLE_START = corinthianNewYear(-220);

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
  // Metonic: 235 months to a cycle from METONIC_CYCLE_START, each month opening at the crescent
  const cycleDays = 235 * SYNODIC_DAYS;
  const metMonths = (epochJdn - METONIC_CYCLE_START) / SYNODIC_DAYS - CRESCENT_AFTER_NEW;
  const metonicIdx = mod(metMonths, 235);
  const metonicYear0 = metonicCellInfo(Math.floor(metonicIdx) + 1).year;
  // Games: set once, pointing straight down at the start of that Metonic cycle, then a quarter turn a solar year
  // (later cycles do not restart it: 19 years is not a whole number of Olympiads)
  const gamesU = (epochJdn - METONIC_CYCLE_START) / TROPICAL_YEAR;         // years since the pointer pointed down
  const gamesYear0 = mod(gamesU - 8 / 90, 4) + 1;                          // fractional: year 1 opens 8 degrees later
  // Callippic (conjectural): four Metonic cycles, counted from the cycle nearest Callippus's first period of 330 BC
  const callStart = METONIC_CYCLE_START - 6 * cycleDays;
  const callippicF = mod((epochJdn - callStart) / cycleDays, 4);            // quarters, 0..4
  const callippicQuarter0 = Math.floor(callippicF);
  // Egyptian civil calendar: 1 Thoth of the Nabonassar era = 26 Feb 747 BC, 365-day years
  const nab = julianToJdn(-746, 2, 26);
  const egyptianDay0 = mod(epochJdn - nab, 365) + 1;
  return {
    pointers: {
      date: sun, true_sun: sun, moon, nodes: node, calendar_day0: egyptianDay0,
      ...planets,
      // Back dials (tools/gen_dial_textures.py, drawn seen from the back): a pointer set to `deg` faces the
      // front-view angle -deg, and a back-view angle a is the front-view angle 180 - a. Both spirals open
      // at the top and run clockwise seen from the back. The Exeligmos dial's blank sector opens at 60
      // degrees (back view) and its sectors run clockwise. The Games dial's year 1 opens at -82 degrees
      // and its years run anticlockwise; the Callippic dial, its mirror, opens at 262 and runs clockwise.
      metonic: -(90 + (metonicIdx / 47) * 360), saros: -(90 + (sarosIdx / 55.75) * 360),
      exeligmos: -(120 + mod(sarosPos / 223, 3) * 120),
      games: 90 * gamesU - 270,
      callippic: 82 - callippicF * 90,
    },
    metonicMonth0: metonicIdx + 1, metonicYear0, callippicQuarter0, callippicYears0: callippicF * 19, gamesYear0,
    sarosMonth0: sarosIdx + 1, exeligmos0, egyptianDay0,
    sunLon0: sun, moonLon0: moon, apogee0: apogee, node0: node,
  };
}
