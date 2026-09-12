/**
 * Julian Day arithmetic. Mirrors python/mech/jd.py exactly.
 *
 * Conventions: astronomical years (1 BC = 0, 205 BC = -204); proleptic Julian
 * calendar before 1582-10-15, Gregorian after; JDN is the day number at noon.
 * Only Math.floor is used: truncation breaks for negative years.
 */
export const J2000 = 2451545.0;
export const GREGORIAN_START_JDN = 2299161;
export const TROPICAL_YEAR = 365.24218967;

const fd = Math.floor;

export function julianToJdn(year: number, month: number, day: number): number {
  const a = fd((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + fd((153 * m + 2) / 5) + 365 * y + fd(y / 4) - 32083;
}

export function gregorianToJdn(year: number, month: number, day: number): number {
  const a = fd((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + fd((153 * m + 2) / 5) + 365 * y + fd(y / 4) - fd(y / 100) + fd(y / 400) - 32045;
}

export function jdnToJulian(jdn: number): [number, number, number] {
  const c = jdn + 32082;
  const d = fd((4 * c + 3) / 1461);
  const e = c - fd((1461 * d) / 4);
  const m = fd((5 * e + 2) / 153);
  const day = e - fd((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * fd(m / 10);
  const year = d - 4800 + fd(m / 10);
  return [year, month, day];
}

export function jdnToGregorian(jdn: number): [number, number, number] {
  const a = jdn + 32044;
  const b = fd((4 * a + 3) / 146097);
  const c = a - fd((146097 * b) / 4);
  const d = fd((4 * c + 3) / 1461);
  const e = c - fd((1461 * d) / 4);
  const m = fd((5 * e + 2) / 153);
  const day = e - fd((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * fd(m / 10);
  const year = 100 * b + d - 4800 + fd(m / 10);
  return [year, month, day];
}

export interface CivilDate {
  year: number;
  month: number;
  day: number;
  calendar: "julian" | "gregorian";
  /** fraction of the day past midnight (0-1) */
  frac: number;
}

export function civilToJdn(year: number, month: number, day: number): number {
  const isGreg = year > 1582 || (year === 1582 && (month > 10 || (month === 10 && day >= 15)));
  return isGreg ? gregorianToJdn(year, month, day) : julianToJdn(year, month, day);
}

export function jdToCivil(jd: number): CivilDate {
  const jdn = Math.floor(jd + 0.5);
  const frac = jd + 0.5 - jdn;
  const [year, month, day] = jdn >= GREGORIAN_START_JDN ? jdnToGregorian(jdn) : jdnToJulian(jdn);
  return { year, month, day, calendar: jdn >= GREGORIAN_START_JDN ? "gregorian" : "julian", frac };
}

export function jdFromCivil(year: number, month: number, day: number, hours = 0): number {
  return civilToJdn(year, month, day) - 0.5 + hours / 24;
}

export function formatYear(year: number): string {
  return year > 0 ? `${year} AD` : `${1 - year} BC`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatJd(jd: number, withTime = false): string {
  const c = jdToCivil(jd);
  const base = `${c.day} ${MONTHS[c.month - 1]} ${formatYear(c.year)}`;
  if (!withTime) return base;
  const h = c.frac * 24;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${base} ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} UT`;
}

export function daysSinceJ2000(jd: number): number {
  return jd - J2000;
}
