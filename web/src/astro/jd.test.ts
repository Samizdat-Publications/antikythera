import { describe, expect, it } from "vitest";
import { civilToJdn, formatYear, gregorianToJdn, jdToCivil, jdnToGregorian, jdnToJulian, julianToJdn } from "./jd";

describe("julian day", () => {
  it("epochs", () => {
    expect(julianToJdn(-204, 5, 12)).toBe(1646679); // Carman & Evans: full moon 12 May 205 BC
    expect(julianToJdn(-177, 12, 22)).toBe(1656764); // Voulgaris: 22 Dec 178 BC
    expect(julianToJdn(-4712, 1, 1)).toBe(0);
    expect(gregorianToJdn(2000, 1, 1)).toBe(2451545);
  });
  it("round trips", () => {
    for (let jdn = 1600000; jdn < 2500000; jdn += 9973) {
      const [y, m, d] = jdnToJulian(jdn);
      expect(julianToJdn(y, m, d)).toBe(jdn);
    }
    for (let jdn = 2299161; jdn < 2600000; jdn += 7919) {
      const [y, m, d] = jdnToGregorian(jdn);
      expect(gregorianToJdn(y, m, d)).toBe(jdn);
    }
  });
  it("calendar switch", () => {
    expect(civilToJdn(1582, 10, 4) + 1).toBe(civilToJdn(1582, 10, 15));
    expect(jdToCivil(2299160.5).calendar).toBe("gregorian");
    expect(jdToCivil(2299159.5).calendar).toBe("julian");
  });
  it("labels", () => {
    expect(formatYear(-204)).toBe("205 BC");
    expect(formatYear(0)).toBe("1 BC");
    expect(formatYear(2026)).toBe("2026 AD");
  });
});
