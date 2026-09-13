/**
 * Freeth 2014 "Eclipse Year Model" (PLOS ONE 9(7): e103275, CC-BY) — mirrors
 * python/mech/eym.py exactly. Generates the 223-cell Saros dial glyph table:
 * 51 glyph cells, 38 lunar (Σ) and 28 solar (Η).
 */
export const EYU_PER_MONTH = 38;
export const EYU_PER_ECLIPSE_YEAR = 446;
export const NODE_SPACING = 223;
export const FULL_MOON_OFFSET = 17;
export const NEW_MOON_OFFSET = 36;
export const LUNAR_WINDOW = 20;
export const SOLAR_NORTH = 20;
export const SOLAR_SOUTH = 7;
export const NODE1_DEFAULT = 66;
export const MONTHS = 223;

export interface Glyph {
  month: number;   // 1..223
  lunar: boolean;
  solar: boolean;
  fmDist: number;
  nmDist: number;
  fmNode: "A" | "D";
  nmNode: "A" | "D";
}

function nearestNode(pos: number, node1: number): [number, "A" | "D"] {
  let best: [number, "A" | "D"] | null = null;
  const k0 = Math.floor(pos / EYU_PER_ECLIPSE_YEAR);
  for (const k of [k0 - 1, k0, k0 + 1]) {
    const cands: [number, "A" | "D"][] = [
      [node1 + EYU_PER_ECLIPSE_YEAR * k, "D"],
      [node1 + NODE_SPACING + EYU_PER_ECLIPSE_YEAR * k, "A"],
    ];
    for (const [node, kind] of cands) {
      const d = pos - node;
      if (!best || Math.abs(d) < Math.abs(best[0])) best = [d, kind];
    }
  }
  return best!;
}

function solarHit(dist: number, node: "A" | "D"): boolean {
  const [north, south] = node === "A" ? [SOLAR_NORTH, SOLAR_SOUTH] : [SOLAR_SOUTH, SOLAR_NORTH];
  return (dist >= 0 && dist <= north) || (dist < 0 && -dist <= south);
}

export function glyphTable(node1 = NODE1_DEFAULT, dropConsecutiveLunar = true): Glyph[] {
  const out: Glyph[] = [];
  let lastLunar = -10;
  for (let m = 1; m <= MONTHS; m++) {
    const start = EYU_PER_MONTH * (m - 1);
    const [fmD, fmN] = nearestNode(start + FULL_MOON_OFFSET, node1);
    const [nmD, nmN] = nearestNode(start + NEW_MOON_OFFSET, node1);
    let lunar = Math.abs(fmD) <= LUNAR_WINDOW;
    if (lunar && dropConsecutiveLunar && m === lastLunar + 1) lunar = false;
    const solar = solarHit(nmD, nmN);
    if (lunar) lastLunar = m;
    if (lunar || solar) out.push({ month: m, lunar, solar, fmDist: fmD, nmDist: nmD, fmNode: fmN, nmNode: nmN });
  }
  return out;
}

export function glyphByMonth(table = glyphTable()): Map<number, Glyph> {
  return new Map(table.map((g) => [g.month, g]));
}

/** Observed eclipse hours on the surviving glyphs (Freeth 2014 Table S3B, 24-hour clock). */
export const OBSERVED_HOURS: Record<number, { lunar?: number; solar?: number }> = {
  20: { lunar: 18 }, 25: { solar: 6 }, 26: { lunar: 7 }, 72: { solar: 14 }, 78: { solar: 1 },
  79: { lunar: 10 }, 114: { lunar: 12 }, 119: { solar: 22 }, 125: { lunar: 2, solar: 3 },
  131: { lunar: 14, solar: 21 }, 137: { lunar: 5, solar: 12 }, 172: { lunar: 18, solar: 12 },
  178: { lunar: 21, solar: 9 }, 184: { lunar: 4, solar: 1 }, 190: { lunar: 9 },
};
