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

export interface CalibrationSet {
  /** dial angles at the epoch, degrees clockwise from the zodiac zero (Aries 0) */
  pointers: Record<string, number>;
  metonicMonth0: number;   // 1..235
  metonicYear0: number;    // 1..19
  callippicQuarter0: number;
  gamesYear0: number;      // 1..4
  sarosMonth0: number;     // 1..223
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
  // Saros dial: month 1 at the Carman & Evans full moon; other epochs count on from it
  const monthsSinceSaros = (epochJdn - sarosEpochJdn) / SYNODIC_DAYS;
  const sarosIdx = mod(Math.round(monthsSinceSaros), 223);
  const exeligmos0 = Math.floor(mod(Math.round(monthsSinceSaros) / 223, 3));
  // Metonic: cycle 1 began at the new moon of 27 June 432 BC (Meton); 235 months per cycle
  const metonStart = julianToJdn(-431, 6, 27);
  const metMonths = (epochJdn - metonStart) / SYNODIC_DAYS;
  const metonicIdx = mod(Math.round(metMonths), 235);
  const metonicYear0 = Math.floor(mod((epochJdn - metonStart) / 365.25, 19)) + 1;
  // Callippic: 76-year period from 28 June 330 BC
  const callStart = julianToJdn(-329, 6, 28);
  const callippicQuarter0 = Math.floor(mod((epochJdn - callStart) / 365.25, 76) / 19);
  // Olympiads: year 1 of Olympiad 1 began mid-summer 776 BC
  const olStart = julianToJdn(-775, 7, 1);
  const gamesYear0 = Math.floor(mod((epochJdn - olStart) / 365.25, 4)) + 1;
  // Egyptian civil calendar: 1 Thoth of the Nabonassar era = 26 Feb 747 BC, 365-day years
  const nab = julianToJdn(-746, 2, 26);
  const egyptianDay0 = mod(epochJdn - nab, 365) + 1;
  return {
    pointers: {
      date: sun, true_sun: sun, moon, nodes: node,
      ...planets,
      metonic: (metonicIdx / 47) * 360, saros: (sarosIdx / 55.75) * 360,
      exeligmos: exeligmos0 * 120, games: (gamesYear0 - 1) * 90, callippic: callippicQuarter0 * 90,
    },
    metonicMonth0: metonicIdx + 1, metonicYear0, callippicQuarter0, gamesYear0,
    sarosMonth0: sarosIdx + 1, exeligmos0, egyptianDay0,
    sunLon0: sun, moonLon0: moon, apogee0: apogee, node0: node,
  };
}
