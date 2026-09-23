/** The machine's materials as the web shows them, promoted and tuned from what Blender exported. */
import * as THREE from "three";
import { PLATE_MIX, withVertexAO } from "./shaders";
import type { Theme } from "./room";

/** The parts that glow in the selective bloom: the golden Sun, the stones, the Moon's ball. */
export const BLOOM_NAMES = /^(sun_ball|stone_|moon_ball)/;

export interface Dressed {
  /** the plates' bronze and its colour as exported, which the theme scales */
  plate: { mat: THREE.MeshPhysicalMaterial; base: THREE.Color } | null;
  /** the case's wood and its colour as exported */
  wood: { mat: THREE.MeshStandardMaterial; base: THREE.Color } | null;
  /** each glowing mesh and the flat colour it is drawn in for the bloom pass */
  glow: Map<THREE.Mesh, THREE.Material>;
}

/**
 * The GLB carries the textured PBR materials from Blender (albedo, spun/brushed normals,
 * roughness, engraving normals on the dials). Promote the metals to MeshPhysicalMaterial
 * for clearcoat and wire in the baked AO; tune each family by name.
 */
export function dressMaterials(root: THREE.Object3D, theme: Theme): Dressed {
  const dressed: Dressed = { plate: null, wood: null, glow: new Map() };
  const cache = new Map<string, THREE.Material>();
  const physical = (src: THREE.MeshStandardMaterial, extra: Partial<THREE.MeshPhysicalMaterial> & { colorMul?: number; mapMix?: THREE.IUniform<number> }): THREE.MeshPhysicalMaterial => {
    const m = new THREE.MeshPhysicalMaterial();
    THREE.MeshStandardMaterial.prototype.copy.call(m, src);   // physical.copy() expects physical-only fields
    m.name = src.name;
    const { colorMul, mapMix, ...rest } = extra;
    m.setValues(rest);
    if (colorMul !== undefined) m.color.multiplyScalar(colorMul);
    m.vertexColors = true;
    withVertexAO(m, mapMix);
    return m;
  };
  const tune: Record<string, (src: THREE.MeshStandardMaterial) => THREE.Material> = {
    // roughness > 1 scales the roughness map up: the plates are duller than the turned gears
    Bronze: (s) => physical(s, { metalness: 1.0, roughness: 0.92, envMapIntensity: 1.0, normalScale: new THREE.Vector2(1.2, 1.2), clearcoat: 0.0, colorMul: 0.8 }),
    PlateBronze: (s) => { const m = physical(s, { metalness: 1.0, roughness: 1.35, envMapIntensity: 0.55, normalScale: new THREE.Vector2(1.6, 1.6), mapMix: PLATE_MIX }); dressed.plate = { mat: m, base: m.color.clone() }; return m; },
    DarkBronze: (s) => physical(s, { metalness: 0.9, roughness: 1.4, envMapIntensity: 0.5, normalScale: new THREE.Vector2(1.2, 1.2), colorMul: 0.7 }),
    Gold: (s) => physical(s, { color: new THREE.Color(0xffcf6e), metalness: 1.0, roughness: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.3 }),
    MoonSilver: (s) => physical(s, { color: new THREE.Color(0xeeeef4), metalness: 1.0, roughness: 0.26, clearcoat: 0.4, clearcoatRoughness: 0.15 }),
    MoonBlack: (s) => physical(s, { color: new THREE.Color(0x07070a), metalness: 0.2, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    Turquoise: (s) => physical(s, { metalness: 0, roughness: 0.28, clearcoat: 1.0, clearcoatRoughness: 0.06, ior: 1.6 }),
    Lapis: (s) => physical(s, { metalness: 0, roughness: 0.25, clearcoat: 1.0, clearcoatRoughness: 0.06, ior: 1.6 }),
    Carnelian: (s) => physical(s, { metalness: 0, roughness: 0.22, clearcoat: 1.0, clearcoatRoughness: 0.05, ior: 1.65 }),
    Crystal: (s) => physical(s, { color: new THREE.Color(0xf4f2ff), metalness: 0.05, roughness: 0.08, clearcoat: 1.0, clearcoatRoughness: 0.03, ior: 1.55, specularIntensity: 1.2 }),
    Obsidian: (s) => physical(s, { color: new THREE.Color(0x0b0b10), metalness: 0.15, roughness: 0.12, clearcoat: 1.0, clearcoatRoughness: 0.04 }),
    // the boards' baked occlusion is near zero where they meet the plates; the loader would multiply it
    // into the wood and paint the case black, so the wood ignores the bake (GTAO handles its contacts)
    Wood: (s) => { s.metalness = 0; s.roughness = 0.82; s.envMapIntensity = 0.55; s.vertexColors = false; s.needsUpdate = true; dressed.wood = { mat: s, base: s.color.clone() }; s.color.multiplyScalar(theme === "manuscript" ? 1.15 : 0.85); return s; },
  };
  const dial = (s: THREE.MeshStandardMaterial): THREE.Material => {
    s.metalness = 0.72; s.roughness = 0.66; s.envMapIntensity = 0.6; s.color.multiplyScalar(0.9);
    if (s.normalMap) s.normalScale.set(1.5, 1.5);
    return s;
  };
  root.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return;
    const m = o as THREE.Mesh;
    m.castShadow = true;
    m.receiveShadow = true;
    const hasAO = !!m.geometry.attributes.color;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const out = mats.map((mat) => {
      const name = mat.name.replace(/\.\d+$/, "");
      const polished = name === "Bronze" && /^(ring_|spoke_)/.test(m.name);
      const key = polished ? "Bronze:polished" : name;
      let made = cache.get(key);
      if (!made) {
        const std = mat as THREE.MeshStandardMaterial;
        if (polished) made = physical(std, { metalness: 1.0, roughness: 0.8, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: 0.85, normalScale: new THREE.Vector2(0.5, 0.5) });
        else if (tune[name]) made = tune[name](std);
        else if (std.map) made = dial(std);
        else made = std;
        cache.set(key, made);
      }
      if (!hasAO && (made as THREE.MeshStandardMaterial).vertexColors) {
        // a mesh without baked AO must not read a missing attribute (the AO block is behind USE_COLOR, so the shader hook can stay)
        const clone = (made as THREE.MeshPhysicalMaterial).clone(); clone.vertexColors = false; clone.onBeforeCompile = made.onBeforeCompile; clone.customProgramCacheKey = () => "novao-" + (made.customProgramCacheKey?.() ?? "");
        return clone;
      }
      return made;
    });
    m.material = Array.isArray(m.material) ? out : out[0];
    if (BLOOM_NAMES.test(m.name)) {
      const src = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
      const glow = new THREE.MeshBasicMaterial({ color: src.color.clone() });
      if (m.name === "sun_ball") glow.color.set(0xffb340).multiplyScalar(1.6);
      else if (m.name === "moon_ball") glow.color.set(0xe8e2d0).multiplyScalar(0.35);
      else glow.color.multiplyScalar(0.7);                      // the stones keep their own hue, no LED white
      dressed.glow.set(m, glow);
    }
  });
  return dressed;
}
