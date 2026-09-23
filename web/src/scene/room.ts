/**
 * The room the machine stands in: the two hand-built environments PMREM turns into reflections,
 * the HDRIs that replace them once loaded, the wall behind the exhibit, and the plinth's stone.
 */
import * as THREE from "three";

/**
 * A gallery at night, built as geometry so PMREM can turn it into reflections:
 * a large warm key panel high on the left with a small, very bright lamp inside it
 * (crisp glints on the polished parts), a dim cool fill on the right, a thin warm
 * rim strip behind the exhibit, a floor bounce, and dark walls so bronze keeps its depth.
 */
export function galleryEnvironment(): THREE.Scene {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshStandardMaterial({ color: 0x17120e, side: THREE.BackSide, roughness: 1 }));
  s.add(room);
  const panel = (geom: THREE.BufferGeometry, color: number, intensity: number, pos: [number, number, number], look: [number, number, number]) => {
    const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    (m.material as THREE.MeshBasicMaterial).color.multiplyScalar(intensity);
    m.position.set(...pos);
    m.lookAt(...look);
    s.add(m);
  };
  const plane = (w: number, h: number) => new THREE.PlaneGeometry(w, h);
  panel(plane(5, 6), 0xffe2b8, 6.0, [-6, 5, 5], [0, 0, 0]);          // key, warm, high left
  panel(new THREE.CircleGeometry(0.45, 32), 0xfff4e2, 22.0, [-5.6, 5.4, 5.4], [0, 0, 0]); // the lamp itself
  panel(plane(6, 4), 0x9fb4c8, 1.3, [7, 2, 3], [0, 0, 0]);           // fill, cool, right
  panel(plane(9, 0.6), 0xffc98a, 5.0, [0, 6, -7], [0, 0, 0]);        // rim strip, behind and above
  panel(plane(3, 3), 0xfff1dc, 1.8, [0, -5.5, 4], [0, 0, 0]);        // floor bounce
  panel(plane(5, 6), 0xffe2b8, 5.0, [6, 5, -5], [0, 0, 0]);          // second key for the back dials
  panel(new THREE.CircleGeometry(0.4, 32), 0xfff4e2, 45.0, [5.6, 5.3, -5.4], [0, 0, 0]);
  panel(plane(6, 4), 0x9fb4c8, 1.1, [-7, 2, -3], [0, 0, 0]);         // cool fill behind
  panel(plane(14, 1.2), 0x6b5a48, 0.9, [0, -5.9, 0], [0, 0, 0]);     // faint floor
  return s;
}

/**
 * The manuscript version's light: a scholar's room by day. Pale walls, a tall window of
 * north light high on the left, a skylight, a warm floor bounce, and a small bright source
 * for the glints. Bronze on parchment wants a bright, soft environment.
 */
export function studioEnvironment(): THREE.Scene {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: 0xd8ccb8, side: THREE.BackSide }));
  (room.material as THREE.MeshBasicMaterial).color.multiplyScalar(0.55);
  s.add(room);
  const panel = (geom: THREE.BufferGeometry, color: number, intensity: number, pos: [number, number, number]) => {
    const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    (m.material as THREE.MeshBasicMaterial).color.multiplyScalar(intensity);
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  panel(new THREE.PlaneGeometry(6, 8), 0xdfe9ff, 3.2, [-7, 4, 5]);            // the window, north light
  panel(new THREE.PlaneGeometry(7, 7), 0xfff6e8, 1.4, [0, 6, 0]);              // skylight
  panel(new THREE.PlaneGeometry(9, 9), 0xd9c7a8, 1.1, [0, -6, 0]);             // parchment floor bounce
  panel(new THREE.PlaneGeometry(6, 6), 0xf0e6d4, 1.2, [7, 2, -4]);             // the far wall, lit
  panel(new THREE.CircleGeometry(0.4, 32), 0xffffff, 14.0, [-6.4, 4.6, 5.2]);  // glints
  panel(new THREE.PlaneGeometry(6, 8), 0xe6edf8, 2.4, [-6, 4, -6]);            // a second window behind, so the opened back is not in its own shade
  panel(new THREE.CircleGeometry(0.4, 32), 0xffffff, 12.0, [-5.6, 4.4, -6.2]);
  return s;
}

export type Theme = "vitrine" | "manuscript";

/**
 * Real light (lighting phase d): Poly Haven HDRIs, CC0. A small dark photo studio with a few
 * softboxes for the gallery at night; an artist's workshop with big windows for the room by day.
 * Each is turned so its main source sits where the hand-built key was (high, front-left), and
 * scaled to the exposure the hand-built rooms were tuned for. `?hdri=0` keeps the hand-built rooms.
 */
export const HDRI: Record<Theme, { file: string; rotation: number; intensity: number }> = {
  vitrine: { file: "./hdri/studio_small_09_1k.hdr", rotation: 0.6, intensity: 0.7 },
  manuscript: { file: "./hdri/artist_workshop_1k.hdr", rotation: 2.4, intensity: 1.05 },
};

/** The wall behind the exhibit: a warm pool of light on a dark gallery wall, or a sheet of parchment. */
export function wallTexture(theme: Theme): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  const rg = g.createRadialGradient(256, 210, 20, 256, 256, 330);
  if (theme === "manuscript") {
    c.width = c.height = 1024;                                     // the fibre must not blur into mottling
    const rg2 = g.createRadialGradient(512, 420, 40, 512, 512, 660);
    rg2.addColorStop(0, "#f3e9d3"); rg2.addColorStop(0.55, "#e6d8bc"); rg2.addColorStop(1, "#cbb996");
    g.fillStyle = rg2;
    g.fillRect(0, 0, 1024, 1024);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const img = g.getImageData(0, 0, 1024, 1024), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 12; d[i] += n; d[i + 1] += n * 0.92; d[i + 2] += n * 0.75; }
    g.putImageData(img, 0, 0);
    g.lineWidth = 0.9;                                             // a few longer fibres in the sheet
    for (let i = 0; i < 700; i++) {
      const x = rnd() * 1024, y = rnd() * 1024, a = rnd() * Math.PI, l = 10 + rnd() * 40;
      g.strokeStyle = `rgba(110, 86, 52, ${0.04 + rnd() * 0.06})`;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  } else {
    // drawn bright: ACES with the gallery exposure crushes the low end
    rg.addColorStop(0, "#6b5443");
    rg.addColorStop(0.45, "#3a2c22");
    rg.addColorStop(1, "#17120e");
  }
  g.fillStyle = rg;
  g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A honed stone's speckle, drawn once: grey noise at two scales, faint, tiled over the plinth. */
export function speckleTexture(): THREE.CanvasTexture {
  const n = 256, c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d")!, img = g.createImageData(n, n);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n * n; i++) {
    const v = 214 + rnd() * 30 + (rnd() < 0.02 ? -40 : 0);          // a light ground, fine grain, the odd darker fleck
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  t.anisotropy = 4;
  return t;
}
