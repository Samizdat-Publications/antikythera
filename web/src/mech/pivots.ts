/**
 * Put every pointer's pivot back on its arbor.
 *
 * `gltf-transform optimize` packs mesh positions into a quantized range and makes up for it
 * with a transform on the node that carries the mesh: the mesh comes out centred on its own
 * origin, and the node is moved to where that centre belongs. For a node nothing ever turns
 * that is invisible. These nodes are turned: the machine writes each pointer's assembly
 * offset onto the node named in `am_pointer`, and with the mesh's centre living in the node's
 * own translation the offset swings the pointer bodily round the arbor instead of turning it
 * on the arbor. The pointer then reads backwards, and looks as though it pivots on its point.
 *
 * Only the pointers with nothing hanging off them were hit, because a node with children could
 * not take the compensation and had to be given a child of its own to carry it: the Metonic and
 * Saros pointers have their follower pins, the planet rings their stones, the Moon its disc. The
 * date pointer, the Games, Callippic and Exeligmos pointers have nothing, so they took it.
 *
 * Here each such node is hung under a new pivot sitting on the arbor, keeping the offset as its
 * own translation, and the pivot inherits `am_pointer`, so what the machine turns is the pivot
 * and the offset turns with it. That is the arrangement Blender exported in the first place.
 * The node keeps `am_role`, so the visibility groups still find the mesh.
 *
 * It is done at load rather than in the export because it is the optimiser's doing, and the
 * optimiser will do it again to any pointer that loses its last child.
 */
import { Object3D } from "three";

/** How far off the arbor a node has to sit before it counts as displaced, in mm. */
const SLOP = 1e-4;

/** Hangs displaced pointers under pivots on their arbors. Returns the names it moved. */
export function restorePointerPivots(root: Object3D): string[] {
  const displaced: Object3D[] = [];
  root.traverse((o) => {
    if (typeof (o.userData as Record<string, unknown>).am_pointer !== "string") return;
    if (Math.hypot(o.position.x, o.position.y) > SLOP) displaced.push(o);
  });
  const moved: string[] = [];
  for (const node of displaced) {
    const arbor = node.parent;
    if (!arbor) continue;                                   // a pointer with no arbor is not ours to move
    const pivot = new Object3D();
    pivot.name = `${node.name}_pivot`;
    pivot.position.set(0, 0, node.position.z);              // on the arbor, at the pointer's depth
    pivot.userData.am_pointer = node.userData.am_pointer;
    delete (node.userData as Record<string, unknown>).am_pointer;
    arbor.add(pivot);
    pivot.add(node);                                        // keeps the node's own x and y
    node.position.z = 0;
    moved.push(node.name);
  }
  return moved;
}
