import { describe, expect, it } from "vitest";
import { trainFor, trainsFor, trainRowId } from "./inspector";

describe("gear trains", () => {
  it("names the train a gear belongs to", () => {
    expect(trainFor("k2")?.name).toBe("Lunar anomaly");
    expect(trainFor("b1")?.name).toBe("Input");
    expect(trainFor("ma71")?.name).toBe("Mars");
  });
  it("knows no train for a part that is not a gear", () => {
    expect(trainFor("calendar_ring")).toBeUndefined();
  });
  it("names every train a shared wheel turns in, first one first", () => {
    expect(trainsFor("fix56").map((t) => t.name)).toEqual(["True Sun", "Mars", "Jupiter", "Saturn"]);
    expect(trainsFor("ju64").map((t) => t.name)).toEqual(["Mars", "Jupiter"]);
    expect(trainsFor("fix51").map((t) => t.name)).toEqual(["Mercury", "Venus"]);
    expect(trainsFor("ma71").map((t) => t.name)).toEqual(["Mars"]);
    expect(trainsFor("calendar_ring")).toEqual([]);
  });
  it("makes the id the column's rows already carry", () => {
    const nodes = trainFor("nod49");
    expect(nodes?.name).toBe("Nodes (Dragon hand)");
    expect(nodes && trainRowId(nodes)).toBe("train-nodes-dragon-hand");
  });
});
