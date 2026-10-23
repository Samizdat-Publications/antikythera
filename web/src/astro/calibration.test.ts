import { describe, expect, it } from "vitest";
import { calibrate, CELL_FULL_MOON } from "./calibration";
import { EPOCHS, mechanismState } from "../mech/mechanism";
import { skyState, type EclipseRow } from "./truth";
import { auditSaros } from "../ui/analytics";
import solar from "../../public/data/eclipses_solar.json";
import lunar from "../../public/data/eclipses_lunar.json";

const canon = { solar: solar.rows as EclipseRow[], lunar: lunar.rows as EclipseRow[] };
const wrap = (d: number) => ((d + 540) % 360) - 180;

describe("setting the dials at the epoch", () => {
  it("puts the Carman & Evans / Freeth full moon 17 of 38 EYu into Saros cell 1, Exeligmos 0", () => {
    const c = calibrate(1646679);
    expect(c.sarosMonth0).toBeCloseTo(1 + CELL_FULL_MOON, 9);
    expect(c.exeligmos0).toBe(0);
  });

  it("lands the Voulgaris epoch, a new moon, late in its cell rather than on a boundary", () => {
    const c = calibrate(1656764);
    const into = (c.sarosMonth0 - 1) % 1;
    expect(into).toBeGreaterThan(0.85);                 // the new moon sits at 36 of 38
    expect(Math.floor(c.sarosMonth0)).toBe(119);        // a surviving solar glyph (Freeth 2014 Table S3B)
  });

  for (const epoch of EPOCHS) {
    it(`audits one Saros against NASA's canon from the ${epoch.id} epoch`, () => {
      const c = calibrate(epoch.jdn);
      const a = auditSaros(epoch.jdn, c.sarosMonth0, canon);
      expect(a.solar.hits).toBe(a.solar.predicted);
      expect(a.lunar.falseAlarms).toBeLessThanOrEqual(1);
      expect(a.lunar.hits + a.lunar.penumbralOnly).toBeGreaterThanOrEqual(36);
    });

    it(`keeps the column's Moon within 4 degrees of the sky for a year either side of ${epoch.id}`, () => {
      const c = calibrate(epoch.jdn);
      let worst = 0;
      for (let y = -1; y <= 1; y += 1 / 120) {
        const s = mechanismState(y, epoch.jdn, { sunLon0: c.sunLon0, moonLon0: c.moonLon0, apogee0: c.apogee0 });
        worst = Math.max(worst, Math.abs(wrap(s.moon - skyState(s.jd).moonLon)));
      }
      expect(worst).toBeLessThan(4);
    });
  }
});
