import { describe, expect, it } from "vitest";
import { PARAPEGMA, entryLongitude, parapegmaAt } from "./parapegma";

describe("the parapegma index letters", () => {
  it("puts Α at the autumnal equinox, read on the bronze", () => {
    const a = parapegmaAt(180);
    expect(a.letter).toBe("Α");
    expect(a.event).toBe("the Claws begin to rise");
    expect(a.status).toBe("scale");
    expect(a.ahead).toBe(0);
  });
  it("keeps a letter under the pointer for 0.6° either side", () => {
    expect(parapegmaAt(190.2).letter).toBe("Β");
    expect(parapegmaAt(190.2).ahead).toBe(0);
  });
  it("says when the asterism in the line was restored rather than read", () => {
    expect(parapegmaAt(190.2).nameRestored).toBe(true);        // Β, where the Haedi are the editors'
    expect(parapegmaAt(180).nameRestored).toBe(false);         // Α, the Claws read on the bronze
  });
  it("reads the vernal equinox as Ι, restored by the editors", () => {
    expect(parapegmaAt(0).letter).toBe("Ι");
    expect(parapegmaAt(0).status).toBe("restored");
  });
  it("looks ahead across a stretch whose letters are lost", () => {
    const a = parapegmaAt(100);              // Cancer 10°, where Ν, Ξ and Ο have no place
    expect(a.letter).toBe("Π");
    expect(a.event).toBe("Leo begins to rise");
    expect(a.ahead).toBe(20);
  });
  it("keeps the window round the end of the circle, where Ι stands at 0°", () => {
    const on = parapegmaAt(359.8);                 // a fifth of a degree short of Aries, still under Ι
    expect(on.letter).toBe("Ι");
    expect(on.ahead).toBe(0);
    const before = parapegmaAt(359);               // a degree short, and now running up to it
    expect(before.letter).toBe("Ι");
    expect(before.ahead).toBe(1);
  });
  it("counts the positions the publication gives", () => {
    expect(PARAPEGMA.filter((e) => entryLongitude(e) !== null).length).toBe(24);
    expect(PARAPEGMA.filter((e) => e.status === "scale").length).toBe(13);
  });
  it("carries both alphabets, so a letter can stand in two places", () => {
    const pi = PARAPEGMA.filter((e) => e.letter === "Π").map(entryLongitude);
    expect(pi).toEqual([60, 120]);
  });
});
