import { Object3D, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { restorePointerPivots } from "./pivots";

/**
 * The shape of what the optimiser leaves behind: an arbor that the gear train turns, and a
 * pointer node whose mesh centre has been folded into its own translation. `tip` stands for the
 * far end of the pointer, 5.8 mm beyond that centre, which is what a visitor reads.
 */
function machine(): { arbor: Object3D; pointer: Object3D; tip: Object3D; root: Object3D } {
  const root = new Object3D();
  const arbor = new Object3D();
  arbor.position.set(-26.86, 58.18, 0);                  // the Games arbor, o1
  root.add(arbor);
  const pointer = new Object3D();
  pointer.name = "ptr_games";
  pointer.position.set(4, 0, -10.55);                    // mesh centre folded in by quantize
  pointer.userData.am_pointer = "games";
  pointer.userData.am_role = "pointer";
  arbor.add(pointer);
  const tip = new Object3D();
  tip.position.set(5.8, 0, 0);
  pointer.add(tip);
  return { arbor, pointer, tip, root };
}

/** Where the machine writes a display's assembly offset, and the world point the tip reaches. */
function readTip(root: Object3D, display: string, offset: number): Vector3 {
  let turned: Object3D | null = null;
  root.traverse((o) => { if (o.userData.am_pointer === display) turned = o; });
  (turned as unknown as Object3D).rotation.z = offset;
  root.updateMatrixWorld(true);
  let tip: Object3D | null = null;
  root.traverse((o) => { if (o.children.length === 0 && o.position.x === 5.8) tip = o; });
  return (tip as unknown as Object3D).getWorldPosition(new Vector3());
}

describe("pointer pivots", () => {
  it("hangs a displaced pointer under a pivot on its arbor, keeping its offset", () => {
    const { arbor, pointer, root } = machine();
    expect(restorePointerPivots(root)).toEqual(["ptr_games"]);
    const pivot = pointer.parent as Object3D;
    expect(pivot.name).toBe("ptr_games_pivot");
    expect(pivot.parent).toBe(arbor);
    expect([pivot.position.x, pivot.position.y, pivot.position.z]).toEqual([0, 0, -10.55]);
    expect([pointer.position.x, pointer.position.y, pointer.position.z]).toEqual([4, 0, 0]);
  });

  it("gives the pivot the display, so the machine turns the pivot and not the mesh", () => {
    const { pointer, root } = machine();
    restorePointerPivots(root);
    expect((pointer.parent as Object3D).userData.am_pointer).toBe("games");
    expect(pointer.userData.am_pointer).toBeUndefined();
    expect(pointer.userData.am_role).toBe("pointer");     // the visibility groups still find the mesh
  });

  it("turns a half-turn offset on the arbor rather than swinging the pointer round it", () => {
    const halfTurn = readTip(machine().root, "games", Math.PI);
    // unmended, the body sits at bearing 0 and points back the way it came: the tip falls short
    // of the arbor, which is the pointer reading backwards on its own point
    expect(halfTurn.x - -26.86).toBeCloseTo(4 - 5.8, 6);

    const mended = machine();
    restorePointerPivots(mended.root);
    const fixed = readTip(mended.root, "games", Math.PI);
    // mended, half a turn puts the tip 9.8 mm the other side of the arbor, where it belongs
    expect(fixed.x - -26.86).toBeCloseTo(-(4 + 5.8), 6);
    expect(fixed.y - 58.18).toBeCloseTo(0, 6);
  });

  it("keeps the total angle the ledger reads, so the numbers never depended on the mend", () => {
    const mended = machine();
    restorePointerPivots(mended.root);
    let sum = 0;
    let o: Object3D | null = mended.tip;
    mended.root.traverse((n) => { if (n.userData.am_pointer === "games") n.rotation.z = 1.234; });
    while (o) { sum += o.rotation.z; o = o.parent; }
    expect(sum).toBeCloseTo(1.234, 9);                    // the pivot's angle and nothing else
  });

  it("leaves a pointer already on its arbor alone", () => {
    const root = new Object3D();
    const arbor = new Object3D();
    root.add(arbor);
    const pointer = new Object3D();
    pointer.name = "ptr_metonic";
    pointer.position.set(0, 0, -25.7);                    // the ones with a follower pin came out right
    pointer.userData.am_pointer = "metonic";
    arbor.add(pointer);
    expect(restorePointerPivots(root)).toEqual([]);
    expect(pointer.parent).toBe(arbor);
    expect(pointer.userData.am_pointer).toBe("metonic");
  });
});
