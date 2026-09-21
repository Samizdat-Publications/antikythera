import { describe, expect, it } from "vitest";
import { litPolygon, selenographic } from "./moon";

function area(p: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[(i + 1) % p.length];
    a += x0 * y1 - x1 * y0;
  }
  return Math.abs(a) / 2;
}

describe("moon disc", () => {
  const R = 50;
  const disc = Math.PI * R * R;
  it("new moon is dark, full moon is lit", () => {
    expect(area(litPolygon(0, 0, R, 0, 400)) / disc).toBeLessThan(0.01);
    expect(area(litPolygon(0, 0, R, 180, 400)) / disc).toBeGreaterThan(0.99);
  });
  it("quarters light half the disc on the right (waxing) and left (waning)", () => {
    const fq = litPolygon(0, 0, R, 90, 400);
    expect(area(fq) / disc).toBeCloseTo(0.5, 2);
    expect(Math.min(...fq.map((p) => p[0]))).toBeGreaterThan(-1e-6);
    const lq = litPolygon(0, 0, R, 270, 400);
    expect(area(lq) / disc).toBeCloseTo(0.5, 2);
    expect(Math.max(...lq.map((p) => p[0]))).toBeLessThan(1e-6);
  });
  it("lit area follows (1 - cos e) / 2", () => {
    for (const e of [30, 60, 120, 150, 210, 300]) {
      const want = (1 - Math.cos((e * Math.PI) / 180)) / 2;
      expect(area(litPolygon(0, 0, R, e, 800)) / disc).toBeCloseTo(want, 2);
    }
  });
});

describe("libration", () => {
  const deg = (r: number) => (r * 180) / Math.PI;
  it("with none, the disc's centre is the mean face and the right limb is lunar east", () => {
    const [l0, b0] = selenographic(0, 0, 1);
    expect(deg(l0)).toBeCloseTo(0, 9); expect(deg(b0)).toBeCloseTo(0, 9);
    expect(deg(selenographic(1, 0, 0)[0])).toBeCloseTo(90, 9);
    expect(deg(selenographic(0, 1, 0)[1])).toBeCloseTo(90, 9);
  });
  it("puts the disc's centre on the sub-Earth point", () => {
    for (const [l, b] of [[7.5, 0], [0, -6.5], [-7.9, 6.7], [4, 3]]) {
      const [lon, lat] = selenographic(0, 0, 1, l, b);
      expect(deg(lon)).toBeCloseTo(l, 9); expect(deg(lat)).toBeCloseTo(b, 9);
    }
  });
  it("moves the limb: a west libration shows past the west limb and hides the east one", () => {
    expect(deg(selenographic(1, 0, 0, -7)[0])).toBeCloseTo(83, 6);
    expect(deg(selenographic(-1, 0, 0, -7)[0])).toBeCloseTo(-97, 6);
  });
});
