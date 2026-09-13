/**
 * Ground truth: NASA's Five Millennium Catalogs of Solar and Lunar Eclipses
 * (Espenak & Meeus, NASA/GSFC) slimmed to JSON by tools/canon_to_json.py, and
 * astronomy-engine (MIT) for continuous Sun/Moon positions and phases.
 *
 * Attribution required: "Eclipse Predictions by Fred Espenak and Jean Meeus (NASA's GSFC)".
 */
import * as Astronomy from "astronomy-engine";
import { J2000 } from "./jd";

export interface EclipseRow {
  jd: number;       // TD of greatest eclipse
  y: number; m: number; d: number; hh: number;
  type: string;     // solar: P A T H (+ suffix); lunar: N P T (+ suffix)
  saros: number;
  gamma: number;
  mag: number;
  dT: number;
  luna: number;
  umag?: number;
  lat?: number; lon?: number;
}
export interface Canon { source: string; rows: EclipseRow[] }

let solar: EclipseRow[] | null = null;
let lunar: EclipseRow[] | null = null;

export async function loadCanon(base = "./data"): Promise<{ solar: EclipseRow[]; lunar: EclipseRow[] }> {
  if (!solar || !lunar) {
    const [s, l] = await Promise.all([
      fetch(`${base}/eclipses_solar.json`).then((r) => r.json() as Promise<Canon>),
      fetch(`${base}/eclipses_lunar.json`).then((r) => r.json() as Promise<Canon>),
    ]);
    solar = s.rows;
    lunar = l.rows;
  }
  return { solar, lunar };
}

/** Binary search: index of the first row with jd >= x. */
export function lowerBound(rows: EclipseRow[], x: number): number {
  let lo = 0, hi = rows.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (rows[mid].jd < x) lo = mid + 1; else hi = mid;
  }
  return lo;
}

export function eclipsesBetween(rows: EclipseRow[], jd0: number, jd1: number): EclipseRow[] {
  return rows.slice(lowerBound(rows, jd0), lowerBound(rows, jd1));
}

export function nextEclipse(rows: EclipseRow[], jd: number): EclipseRow | undefined {
  return rows[lowerBound(rows, jd + 1e-6)];
}
export function prevEclipse(rows: EclipseRow[], jd: number): EclipseRow | undefined {
  const i = lowerBound(rows, jd - 1e-6);
  return rows[i - 1];
}

export function describeType(row: EclipseRow, lunar: boolean): string {
  const t = row.type[0];
  if (lunar) return { N: "penumbral", P: "partial", T: "total" }[t] ?? row.type;
  return { P: "partial", A: "annular", T: "total", H: "hybrid" }[t] ?? row.type;
}

// ---------------------------------------------------------------- astronomy-engine

/** AstroTime from a Julian Day (UT). Never build ancient dates from Date. */
export function timeFromJd(jd: number): Astronomy.AstroTime {
  return Astronomy.MakeTime(jd - J2000);
}

export interface SkyState {
  sunLon: number;        // apparent geocentric ecliptic longitude of date, degrees
  moonLon: number;
  moonLat: number;
  elongation: number;    // moon - sun, degrees 0..360
  illuminated: number;   // fraction
  moonDistanceKm: number;
}

export function skyState(jd: number): SkyState {
  const t = timeFromJd(jd);
  const sun = Astronomy.SunPosition(t);
  const moon = Astronomy.EclipticGeoMoon(t);
  const ill = Astronomy.Illumination(Astronomy.Body.Moon, t);
  const elongation = ((moon.lon - sun.elon) % 360 + 360) % 360;
  return { sunLon: sun.elon, moonLon: moon.lon, moonLat: moon.lat, elongation, illuminated: ill.phase_fraction, moonDistanceKm: moon.dist * 149597870.7 };
}

/** Geocentric ecliptic longitudes of the seven bodies the machine shows, degrees. */
export function skyLongitudes(jd: number): Record<string, number> {
  const t = timeFromJd(jd);
  const geo = (b: Astronomy.Body) => Astronomy.Ecliptic(Astronomy.GeoVector(b, t, true)).elon;
  return {
    sun: Astronomy.SunPosition(t).elon,
    moon: Astronomy.EclipticGeoMoon(t).lon,
    mercury: geo(Astronomy.Body.Mercury),
    venus: geo(Astronomy.Body.Venus),
    mars: geo(Astronomy.Body.Mars),
    jupiter: geo(Astronomy.Body.Jupiter),
    saturn: geo(Astronomy.Body.Saturn),
  };
}

/** Longitude of the Moon's apogee (from the anomaly): the mechanism's e3 carrier. */
export function moonApogeeLon(jd: number): number {
  // Meeus ch. 47 mean perigee longitude; apogee = perigee + 180
  const T = (jd - J2000) / 36525;
  const perigee = 83.3532465 + 4069.0137287 * T - 0.0103200 * T * T - (T * T * T) / 80053 + (T ** 4) / 18999000;
  return (((perigee + 180) % 360) + 360) % 360;
}

/** Mean longitude of the ascending node (Meeus ch. 47). */
export function moonNodeLon(jd: number): number {
  const T = (jd - J2000) / 36525;
  const omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441 - (T ** 4) / 60616000;
  return ((omega % 360) + 360) % 360;
}
