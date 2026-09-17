import { describe, expect, it } from "vitest";
import { snapshotName } from "./snapshot";

describe("the name a saved picture takes", () => {
  it("joins the view to the date, a hyphen for each space", () => {
    expect(snapshotName("front-close", "12 May 205 BC")).toBe("antikythera-front-close-12-May-205-BC.png");
  });
  it("drops what a filename should not carry", () => {
    expect(snapshotName("sky", "22 Dec 178 BC 06:00 UT")).toBe("antikythera-sky-22-Dec-178-BC-0600-UT.png");
  });
});
