import { describe, expect, it } from "vitest";
import { glyphTable } from "./eym";

describe("eclipse year model", () => {
  const t = glyphTable();
  it("reproduces Freeth 2014 counts", () => {
    expect(t.length).toBe(51);
    expect(t.filter((g) => g.lunar).length).toBe(38);
    expect(t.filter((g) => g.solar).length).toBe(28);
  });
  it("matches the observed glyph months (Tables S1/S2)", () => {
    const m = new Map(t.map((g) => [g.month, g]));
    for (const x of [26, 120, 131, 178, 190, 20, 67, 79, 114, 125, 137, 172, 184]) expect(m.get(x)?.lunar, `lunar ${x}`).toBe(true);
    for (const x of [13, 25, 72, 119, 131, 178, 78, 125, 137, 172, 184]) expect(m.get(x)?.solar, `solar ${x}`).toBe(true);
    expect(m.get(78)?.lunar).toBe(false);
  });
});
