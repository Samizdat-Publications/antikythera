import { describe, expect, it } from "vitest";
import { calibrate, CELL_FULL_MOON, backPointerDeg, BACK_DIAL } from "./calibration";
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

  it("turns back-view angles into front-view pointer settings", () => {
    // seen from behind, 3 o'clock is the front's 9 o'clock and the top stays the top
    expect(wrap(backPointerDeg(0))).toBeCloseTo(-180, 9);
    expect(wrap(backPointerDeg(90))).toBeCloseTo(-90, 9);
    // the Carman & Evans / Freeth epoch: Saros cell 1 just after its full moon, pointer just clockwise of the top
    const c = calibrate(1646679);
    const sarosBack = wrap(c.pointers.saros + 180);
    expect(sarosBack).toBeLessThan(BACK_DIAL.spiralStart);
    expect(sarosBack).toBeGreaterThan(BACK_DIAL.spiralStart - 360 / 55.75);
    expect(c.spiralPhase.saros).toBeCloseTo((c.sarosMonth0 - 1) / 55.75, 9);
    // Exeligmos 0: the pointer is in the blank sector, which spans 60 to -60 from behind
    const ex = wrap(c.pointers.exeligmos + 180);
    expect(ex).toBeLessThanOrEqual(60);
    expect(ex).toBeGreaterThan(-60);
  });
});
