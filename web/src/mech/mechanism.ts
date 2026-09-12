/**
 * What the mechanism displays for a given number of turns of its main wheel.
 * Pure function of (years, epoch); no rendering. Mirrors python/mech and the
 * driver expressions in blender/build_all.py.
 */
import { TROPICAL_YEAR } from "../astro/jd";

const TAU = Math.PI * 2;
export const RATE = {
  moonSidereal: 254 / 19,
  moonSynodic: 235 / 19,
  apsides: -477 / 4237,
  metonic: -5 / 19,
  saros: -940 / 4237,
  exeligmos: -235 / 12711,
  games: 1 / 4,
  callippic: -1 / 76,
  nodes: -5 / 93,
} as const;

export const PIN_SLOT = { d: 1.1, r: 9.67 };

export interface Epoch {
  id: string;
  label: string;
  jdn: number;
  note: string;
}
export const EPOCHS: Epoch[] = [
  { id: "carman-evans", label: "12 May 205 BC (Carman & Evans 2014)", jdn: 1646679, note: "Full Moon of Saros month 1, Exeligmos at 0" },
  { id: "voulgaris", label: "22 Dec 178 BC (Voulgaris et al. 2022)", jdn: 1656764, note: "Annular solar eclipse, winter solstice next day" },
];

export const CORINTHIAN_MONTHS = [
  "Phoinikaios", "Kraneios", "Lanotropios", "Machaneus", "Dodekateus", "Eukleios",
  "Artemisios", "Psydreus", "Gameilios", "Agrianios", "Panamos", "Apellaios",
];
export const EGYPTIAN_MONTHS = [
  "Thoth", "Phaophi", "Athyr", "Choiak", "Tybi", "Mechir", "Phamenoth", "Pharmuthi",
  "Pachon", "Payni", "Epiphi", "Mesore", "Epagomenal",
];
export const ZODIAC = [
  "Krios (Aries)", "Tauros (Taurus)", "Didymoi (Gemini)", "Karkinos (Cancer)", "Leon (Leo)", "Parthenos (Virgo)",
  "Chelai (Libra)", "Skorpios (Scorpio)", "Toxotes (Sagittarius)", "Aigokeros (Capricorn)", "Hydrochoos (Aquarius)", "Ichthyes (Pisces)",
];
export const GAMES = [
  ["Isthmia", "Olympia"], ["Nemea", "Naa"], ["Isthmia", "Pythia"], ["Nemea", "Halieia"],
];

/** Exact pin-and-slot: angle of the slotted gear for a pin angle phi. */
export function slotAngle(phi: number, d = PIN_SLOT.d, r = PIN_SLOT.r): number {
  return Math.atan2(r * Math.sin(phi), d + r * Math.cos(phi));
}
export function anomalyCorrection(phi: number, d = PIN_SLOT.d, r = PIN_SLOT.r): number {
  const delta = slotAngle(phi, d, r) - phi;
  return ((delta + Math.PI) % TAU + TAU) % TAU - Math.PI;
}

export interface MechanismState {
  years: number;
  jd: number;
  /** ecliptic longitudes shown on the front dial, degrees, from the zodiac zero (Aries 0) */
  sunMean: number;
  moonMean: number;
  moon: number;
  moonAnomaly: number;          // degrees, the pin-and-slot correction applied
  meanAnomaly: number;          // degrees, phase of the pin in the slot (0 = apogee)
  apsides: number;              // longitude of the lunar apogee (e3 carrier), degrees
  nodes: number;                // longitude of the ascending node (dragon hand), degrees
  elongation: number;           // moon - sun, degrees (0 = new, 180 = full)
  illuminated: number;          // fraction 0..1
  moonAgeDays: number;
  phaseName: string;
  egyptianDay: number;          // 1..365 on the calendar ring (leap slip ignored)
  egyptianMonth: string;
  egyptianDayOfMonth: number;
  zodiacSign: string;
  zodiacDeg: number;
  metonicCell: number;          // 1..235
  metonicYear: number;          // 1..19
  metonicMonthName: string;
  metonicTurn: number;          // 0..4
  callippicQuarter: number;     // 0..3
  gamesYear: number;            // 1..4
  gamesNames: string[];
  sarosCell: number;            // 1..223
  sarosTurn: number;            // 0..3
  sarosMonthsElapsed: number;   // fractional
  exeligmosSector: number;      // 0,1,2
  exeligmosHours: number;       // 0, 8, 16
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

export const PHASE_NAMES = [
  "New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
  "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent",
];
export function phaseName(elongationDeg: number): string {
  const i = Math.round(mod(elongationDeg, 360) / 45) % 8;
  return PHASE_NAMES[i];
}

/**
 * Compute the display state. `calib` holds the dial readings at the epoch
 * (all zero by default = pointers at the zodiac zero, Saros month 1, Metonic month 1).
 */
export function mechanismState(years: number, epochJdn: number, calib: Partial<Calibration> = {}): MechanismState {
  const c = { ...DEFAULT_CALIBRATION, ...calib };
  const jd = epochJdn + years * TROPICAL_YEAR;
  const sunMean = mod(c.sunLon0 + 360 * years, 360);
  const moonMean = mod(c.moonLon0 + 360 * RATE.moonSidereal * years, 360);
  const apsides = mod(c.apogee0 + 360 * (-RATE.apsides) * years, 360);   // apogee advances (prograde)
  // pin angle in the slot = mean anomaly (moon relative to apogee), one turn per anomalistic month
  const meanAnomaly = mod(moonMean - apsides, 360);
  const corr = (anomalyCorrection((meanAnomaly * Math.PI) / 180) * 180) / Math.PI;
  const moon = mod(moonMean + corr, 360);
  const nodes = mod(c.node0 + 360 * RATE.nodes * years, 360);
  const elongation = mod(moon - sunMean, 360);
  const illuminated = (1 - Math.cos((elongation * Math.PI) / 180)) / 2;
  const synodicDays = TROPICAL_YEAR / RATE.moonSynodic;
  const moonAgeDays = (elongation / 360) * synodicDays;

  const egyptianDay = Math.floor(mod(c.egyptianDay0 - 1 + years * 365.25, 365)) + 1;
  const em = Math.min(12, Math.floor((egyptianDay - 1) / 30));
  const months = years * RATE.moonSynodic;                 // synodic months since epoch
  const metonicIdx = mod(c.metonicMonth0 - 1 + months, 235);
  const metonicCell = Math.floor(metonicIdx) + 1;
  const sarosIdx = mod(c.sarosMonth0 - 1 + months, 223);
  const sarosCell = Math.floor(sarosIdx) + 1;
  const exSector = Math.floor(mod((c.sarosMonth0 - 1 + months) / 223 + c.exeligmos0, 3));
  const gamesYear = Math.floor(mod(c.gamesYear0 - 1 + years, 4)) + 1;
  const zodiacDeg = sunMean;

  return {
    years, jd, sunMean, moonMean, moon, moonAnomaly: corr, meanAnomaly, apsides, nodes, elongation, illuminated,
    moonAgeDays, phaseName: phaseName(elongation),
    egyptianDay, egyptianMonth: EGYPTIAN_MONTHS[em], egyptianDayOfMonth: egyptianDay - em * 30,
    zodiacSign: ZODIAC[Math.floor(zodiacDeg / 30) % 12], zodiacDeg: zodiacDeg % 30,
    metonicCell, metonicYear: Math.floor(mod(years + c.metonicYearOffset, 19)) + 1,
    metonicMonthName: CORINTHIAN_MONTHS[(metonicCell - 1 + c.metonicMonthNameOffset) % 12],
    metonicTurn: Math.floor((metonicCell - 1) / 47),
    callippicQuarter: Math.floor(mod(years + c.callippicOffset, 76) / 19),
    gamesYear, gamesNames: GAMES[gamesYear - 1],
    sarosCell, sarosTurn: Math.floor((sarosCell - 1) / 55.75), sarosMonthsElapsed: sarosIdx,
    exeligmosSector: exSector, exeligmosHours: [0, 8, 16][exSector],
  };
}

export interface Calibration {
  sunLon0: number;
  moonLon0: number;
  apogee0: number;
  node0: number;
  egyptianDay0: number;
  metonicMonth0: number;
  metonicYearOffset: number;
  metonicMonthNameOffset: number;
  callippicOffset: number;
  sarosMonth0: number;
  exeligmos0: number;
  gamesYear0: number;
}
export const DEFAULT_CALIBRATION: Calibration = {
  sunLon0: 0, moonLon0: 180, apogee0: 180, node0: 0, egyptianDay0: 1,
  metonicMonth0: 1, metonicYearOffset: 0, metonicMonthNameOffset: 0, callippicOffset: 0,
  sarosMonth0: 1, exeligmos0: 0, gamesYear0: 1,
};
