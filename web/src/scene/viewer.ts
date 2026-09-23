/**
 * three.js scene for the mechanism GLB. Coordinates are Blender's (mm, +Z = front,
 * +Y = up); the GLB is exported with Z-up preserved, so +Z faces the default camera.
 *
 * Rendering: a gallery at night. A hand-built PMREM environment gives the bronze its
 * reflections, a shadow-casting spot is the exhibit light, GTAO separates gears from
 * plates, the baked per-vertex ambient occlusion (blender/surface.py, COLOR_0) darkens
 * indirect light deep in the stack, a selective bloom lifts the golden Sun and the
 * stones, a gentle depth of field softens the hero view, and a vignette plus a static
 * film grain finish the frame before AgX tone mapping (ACES in the manuscript). The room,
 * the shaders and the material dressing live in room.ts, shaders.ts and materials.ts.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { GearGraph } from "../mech/gearGraph";
import { restorePointerPivots } from "../mech/pivots";
import { Trails } from "./trails";
import { canvasToBlob } from "../ui/snapshot";
import { galleryEnvironment, studioEnvironment, wallTexture, speckleTexture, HDRI, type Theme } from "./room";
import { AO, PLATE_MIX, withVertexAO, FinalShader } from "./shaders";
import { dressMaterials } from "./materials";

export type { Theme } from "./room";

/** The visitor has asked for less motion: no idle orbit, no overture, views cut rather than fly. */
export const REDUCE_MOTION = matchMedia("(prefers-reduced-motion: reduce)");

interface RevealItem { o: THREE.Object3D; mats: THREE.Material[]; p0: THREE.Vector3; d: THREE.Vector3 }
type Mood = { env: number; key: number; back: number };

export interface ViewerOptions {
  canvas: HTMLCanvasElement;
  url: string;
  onReady?: (graph: GearGraph) => void;
  onProgress?: (loaded: number, total: number) => void;
  onError?: (err: unknown) => void;
  /** The graphics context was taken away, by a driver reset or a machine waking from sleep. */
  onContextLost?: () => void;
  /** The context came back; three.js rebuilds its own state and the page may draw again. */
  onContextRestored?: () => void;
}

type Preset = [[number, number, number], [number, number, number]];
const PRESETS: Record<string, Preset> = {
  // 670 out and aimed a little low: at 560 the case top sat under the view bar
  "front": [[0, -40, 670], [0, -32, 0]],
  "front-close": [[30, -40, 300], [0, 0, 30]],
  "back": [[0, -40, -670], [0, -32, 0]],
  "back-upper": [[20, 40, -260], [0, 58, -40]],
  "back-lower": [[20, -110, -260], [0, -81, -40]],
  "pinslot": [[75, -70, -150], [28, -32, -25]],
  // 1.18x further out than the composition alone wants: at fov 38 the case filled the frame exactly,
  // so the top corner and the plinth were shaved off at every stage wider than 6:5
  "iso": [[354, -260, 496], [0, 0, 0]],
  "crank": [[520, 0, 80], [60, 0, 0]],
  "top": [[0, 560, 1], [0, 0, 0]],
};
const CRANK_TURNS_PER_YEAR = 223 / 48;                 // the crown wheel against the main wheel
const CLICK_SLOP = 6;                                  // CSS pixels a press may travel and still be a click, not a drag
// what each quality tier costs the picture, for the console line that announces it
const TIERS = ["everything on", "bloom and depth of field off", "ambient occlusion off as well, half-size shadows, one pixel per pixel"];
const FORCED_TIERS: Record<string, 0 | 1 | 2 | undefined> = { high: 0, medium: 1, low: 2 };

export class Viewer {
  readonly renderer: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  private bloomComposer!: EffectComposer;
  private gtao!: GTAOPass;
  private bokeh!: BokehPass;
  private finalPass!: ShaderPass;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  graph: GearGraph | null = null;
  root: THREE.Group | null = null;
  private highlightMats: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(9, 9);        // off-canvas until the pointer arrives
  private pointerDirty = false;
  private lastPick = 0;
  hovered: string | null = null;
  onHover: ((id: string | null) => void) | null = null;
  /** A gear clicked rather than dragged past: the page shows the train it belongs to. */
  onSelect: ((id: string) => void) | null = null;
  /** Where a press began and what it was over, so a click can be told from an orbit drag. */
  private press: { x: number; y: number; id: string } | null = null;
  /** The CT scan of Fragment A (Ashkan Pakzad, CC BY 4.0), loaded on demand. */
  fragment: THREE.Group | null = null;
  private fragmentMats: THREE.MeshStandardMaterial[] = [];
  private fragmentOpacity = 0;
  /** Alignment of the scan to the reconstruction (mm, radians), tuned by eye. */
  static FRAGMENT_POSE = { position: [0, 0, 0] as [number, number, number], rotation: [0, Math.PI / 2, -Math.PI / 4] as [number, number, number], scale: 1.0 };   // turned by eye so the scan's four spokes lie on b1's cross at the epoch

  /** Gallery furniture (plinth, floor): hidden while the Fragment A scan is shown alone. */
  private set: THREE.Object3D[] = [];
  private setMats!: { floor: THREE.MeshStandardMaterial; plinth: THREE.MeshStandardMaterial; plinthTop: THREE.MeshStandardMaterial; plinthGap: THREE.MeshStandardMaterial };
  private lights!: { key: THREE.SpotLight; fill: THREE.DirectionalLight; rim: THREE.DirectionalLight; frontRake: THREE.DirectionalLight; backKey: THREE.DirectionalLight };
  private pmrem: THREE.PMREMGenerator;
  private envs: Partial<Record<Theme, THREE.Texture>> = {};
  private hdris: Partial<Record<Theme, THREE.Texture | "loading">> = {};
  useHdri = new URLSearchParams(location.search).get("hdri") !== "0";
  theme: Theme = "vitrine";
  private bloomBase = 0.55;
  private wood: { mat: THREE.MeshStandardMaterial; base: THREE.Color } | null = null;
  private plate: { mat: THREE.MeshPhysicalMaterial; base: THREE.Color } | null = null;
  /** Every wheel pushed out along its arbor: built once from the graph; `f` is how far out each one is (0 home, 1 apart). */
  private apartItems: { o: THREE.Object3D; z0: number; off: number; wz: number; f: number }[] | null = null;
  private apartTween: { start: number; ms: number; to: number; from: number[]; delays: number[] } | null = null;
  private apartTarget = 0;
  /** Fired when a slide home finishes (the overture, or the "taken apart" box unticked). */
  onAssembled: (() => void) | null = null;
  /** The eclipse beat: the room dims for a moment when a glyph and NASA agree. */
  private beat: number | null = null;
  private lightBase = { key: 2.2, back: 1.9, env: 0.65 };
  /** The lighting mood: 1 is the room as lit; "spot" brings the room down around the exhibit for a walkthrough leaf. */
  private mood = { env: 1, key: 1, back: 1 };
  private moodTween: { from: Mood; to: Mood; start: number } | null = null;
  /** The stones' trails on the front dial: a long exposure while the crank runs (`?trails=0` turns them off). */
  private trails: Trails | null = null;
  /** Dragging the crank handle round turns the machine: called with the years moved (signed). */
  onCrank: ((deltaYears: number) => void) | null = null;
  private crankDrag: { last: number; sign: number } | null = null;
  get cranking(): boolean { return !!this.crankDrag; }
  /** The "Inside" reveal: plates, dials and case lifting away over ~1.1 s. */
  private reveal: { on: boolean; start: number; items: RevealItem[] } | null = null;
  private insideOn = false;
  private ghostMat = new THREE.MeshPhysicalMaterial({ color: 0x8a6a3a, metalness: 0.9, roughness: 0.5, transparent: true, opacity: 0.13, depthWrite: false, envMapIntensity: 0.4 });
  private ghosted: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [];
  private lastInput = performance.now();
  /** the shared shader knobs, for tuning the look from the console (`__viewer.tuning`) */
  readonly tuning = { plateMix: PLATE_MIX, ao: AO.strength };

  // selective bloom bookkeeping
  private bloomMeshes = new Set<THREE.Mesh>();
  private glowMats = new Map<THREE.Mesh, THREE.Material>();
  private darkMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  private swapped: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [];
  private savedBackground: THREE.Texture | THREE.Color | null = null;

  /** Quality switches; the tiers below turn them off, in order, on a slow GPU. */
  quality = { bloom: true, dof: true, gtao: true };
  private qualityTier: 0 | 1 | 2 = 0;
  private basePixelRatio = Math.min(devicePixelRatio, 2);   // the tier 0 resolution, kept so a tier can give it back
  private qualityForced = false;
  private frameTimes: number[] = [];
  private qualityRounds = 0;

  // camera tween
  private tween: { p0: THREE.Vector3; p1: THREE.Vector3; t0: THREE.Vector3; t1: THREE.Vector3; start: number; ms: number } | null = null;
  currentView = "iso";
  onView: ((name: string) => void) | null = null;

  constructor(private opts: ViewerOptions) {
    this.renderer = new THREE.WebGLRenderer({ canvas: opts.canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(this.basePixelRatio);
    // AgX rather than ACES: ACES pushed lit bronze to a saturated yellow, and the gears read as gold foil
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 0.72;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene.background = wallTexture("vitrine");
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envs.vitrine = this.pmrem.fromScene(galleryEnvironment(), 0.02).texture;
    this.scene.environment = this.envs.vitrine;
    this.scene.environmentIntensity = 0.65;

    this.camera = new THREE.PerspectiveCamera(38, 1, 1, 5000);
    const [p, t] = PRESETS.iso;
    this.camera.position.set(p[0] * 2.3, p[1] * 1.6, p[2] * 2.3);
    this.controls = new OrbitControls(this.camera, opts.canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(...t);
    this.controls.addEventListener("start", () => { this.tween = null; this.controls.autoRotate = false; this.lastInput = performance.now(); this.press = null; this.setView("free"); });
    this.controls.addEventListener("change", () => { this.pointerDirty = true; });
    this.controls.autoRotateSpeed = 0.35;                         // one turn in ~3 minutes: a visitor drifting round the case
    for (const ev of ["pointerdown", "wheel", "keydown", "touchstart"]) opts.canvas.addEventListener(ev, () => { this.lastInput = performance.now(); this.controls.autoRotate = false; }, { passive: true });
    // a visitor working the column or the keyboard is not a visitor who has walked away: the idle orbit waits for them too
    for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, () => { this.lastInput = performance.now(); }, { passive: true });

    // the exhibit light: one warm spot from high left with soft shadows
    const key = new THREE.SpotLight(0xffe4bf, 2.2, 0, 0.46, 0.65, 0);
    key.position.set(-300, 360, 520);
    key.target.position.set(0, -10, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0003;
    key.shadow.normalBias = 0.5;
    key.shadow.camera.near = 100; key.shadow.camera.far = 1500;
    key.shadow.radius = 4;
    const fill = new THREE.DirectionalLight(0xb4c0d0, 0.55);      // cool fill so the case keeps its volume
    fill.position.set(380, -40, 260);
    const rim = new THREE.DirectionalLight(0xffc98a, 1.2);
    rim.position.set(60, 240, -420);
    // raking lights: low over each dial face so engraving, spirals and the brushed plate cast micro-shadows
    const frontRake = new THREE.DirectionalLight(0xffd9a8, 0.9);
    frontRake.position.set(-480, 300, 110);
    const backKey = new THREE.DirectionalLight(0xffe6c4, 1.9);      // lights the back dials, raking from upper left
    backKey.position.set(-420, 280, -170);
    backKey.target.position.set(0, -10, -40);
    backKey.castShadow = true;
    backKey.shadow.mapSize.set(2048, 2048);
    backKey.shadow.bias = -0.0004;
    backKey.shadow.normalBias = 0.8;
    const bcam = backKey.shadow.camera as THREE.OrthographicCamera;
    bcam.left = -280; bcam.right = 280; bcam.top = 280; bcam.bottom = -280; bcam.near = 50; bcam.far = 1200;
    this.scene.add(key, key.target, fill, rim, frontRake, backKey, backKey.target);
    this.lights = { key, fill, rim, frontRake, backKey };

    // the gallery set: a honed stone plinth under the case, and a floor for the light pool and the
    // contact shadow. A museum plinth, not a box: the block stands on the floor, a dark shadow gap
    // parts it from a thicker top slab, and every edge is eased so the spot rolls along it rather
    // than flaring into a white line. The case bottom is at y = -180, the floor at -252.
    const stone = speckleTexture();
    const plinth = new THREE.Mesh(new RoundedBoxGeometry(296, 58, 200, 2, 1.5), new THREE.MeshStandardMaterial({ color: 0x2a2624, map: stone, roughness: 0.85, metalness: 0.0, envMapIntensity: 0.45 }));
    plinth.position.set(0, -223, -4);
    plinth.castShadow = true; plinth.receiveShadow = true;
    const plinthGap = new THREE.Mesh(new THREE.BoxGeometry(284, 4.2, 188), new THREE.MeshStandardMaterial({ color: 0x0d0c0b, roughness: 0.95, metalness: 0.0, envMapIntensity: 0.2 }));
    plinthGap.position.set(0, -192, -4);
    plinthGap.receiveShadow = true;
    const plinthTop = new THREE.Mesh(new RoundedBoxGeometry(312, 10, 216, 3, 2.5), new THREE.MeshStandardMaterial({ color: 0x3a3330, map: stone, roughness: 0.6, metalness: 0.0, envMapIntensity: 0.55 }));
    plinthTop.position.set(0, -185, -4);
    plinthTop.castShadow = true; plinthTop.receiveShadow = true;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshStandardMaterial({ color: 0x241d18, roughness: 0.9, metalness: 0.0, envMapIntensity: 0.35 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -252;
    floor.receiveShadow = true;
    this.scene.add(plinth, plinthGap, plinthTop, floor);
    this.set.push(plinth, plinthGap, plinthTop, floor);
    this.setMats = { floor: floor.material as THREE.MeshStandardMaterial, plinth: plinth.material as THREE.MeshStandardMaterial, plinthTop: plinthTop.material as THREE.MeshStandardMaterial, plinthGap: plinthGap.material as THREE.MeshStandardMaterial };

    // post: bloom of the glowing parts only (everything else painted black) ...
    this.bloomComposer = new EffectComposer(this.renderer);
    this.bloomComposer.renderToScreen = false;
    this.bloomComposer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomComposer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 1.1, 0.7, 0.0));
    // ... then render -> ground-truth ambient occlusion -> depth of field -> bloom mix, vignette, grain -> output
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.gtao = new GTAOPass(this.scene, this.camera, 1, 1);
    this.gtao.output = GTAOPass.OUTPUT.Default;
    this.gtao.blendIntensity = 0.9;
    this.gtao.updateGtaoMaterial({ radius: 14, distanceExponent: 1, thickness: 3, scale: 1.3, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 16 });
    this.composer.addPass(this.gtao);
    this.bokeh = new BokehPass(this.scene, this.camera, { focus: 550, aperture: 0.000022, maxblur: 0.0055 });
    this.bokeh.enabled = false;
    this.composer.addPass(this.bokeh);
    this.finalPass = new ShaderPass(new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(FinalShader.uniforms), vertexShader: FinalShader.vertexShader, fragmentShader: FinalShader.fragmentShader }), "baseTexture");
    this.finalPass.material.uniforms.bloomTexture.value = this.bloomComposer.renderTarget2.texture;
    this.composer.addPass(this.finalPass);
    this.composer.addPass(new OutputPass());

    // `?quality=high`, `medium` or `low` pins a tier for testing and stands the automatic guard down
    const forced = FORCED_TIERS[new URLSearchParams(location.search).get("quality") ?? ""];
    if (forced !== undefined) {
      this.qualityForced = true;
      this.setQualityTier(forced);
      console.info(`[antikythera] quality tier ${forced} asked for: ${TIERS[forced]}; the automatic guard stands down`);
    }

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(opts.url, (gltf) => {
      this.root = gltf.scene;
      restorePointerPivots(this.root);                                // before the graph reads am_pointer
      const dressed = dressMaterials(this.root, this.theme);
      this.plate = dressed.plate;
      this.wood = dressed.wood;
      for (const [m, glow] of dressed.glow) { this.bloomMeshes.add(m); this.glowMats.set(m, glow); }
      this.tunePlate();
      this.scene.add(this.root);
      this.graph = new GearGraph(this.root);
      this.graph.setYears(0);
      this.trails = new Trails(this.graph, this.root);
      this.trails.enabled = new URLSearchParams(location.search).get("trails") !== "0";
      this.scene.add(this.trails.group);
      for (const [m, g] of this.trails.glowMats) this.glowMats.set(m, g);
      opts.onReady?.(this.graph);
      this.assemble();
      this.view("iso", this.assembling ? 3800 : 2600);              // walk up while the machine comes together
    }, (ev) => opts.onProgress?.(ev.loaded, ev.total), (err) => opts.onError?.(err));

    opts.canvas.addEventListener("pointermove", (e) => {
      const r = opts.canvas.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.pointerDirty = true;
      const p = this.press;                                          // once it has travelled it is a drag, even if it wanders back
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) >= CLICK_SLOP) this.press = null;
    });
    opts.canvas.addEventListener("pointerleave", () => { this.pointer.set(9, 9); this.pointerDirty = true; this.press = null; });
    // a touch tap comes with no pointermove before it: lay the ray on the tap and pick at once, so the crank and the press below have a gear to work with
    opts.canvas.addEventListener("pointerdown", (e) => {
      const r = opts.canvas.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.pickNow();
    });
    // the crank: take hold of the handle and wind it round; the pointer's angle about the crank's centre is the crank's angle
    opts.canvas.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || this.hovered !== "a1" || !this.graph) return;
      const sign = this.camera.position.x >= 66 ? 1 : -1;            // seen from the other side it winds the other way
      this.crankDrag = { last: this.crankAngle(e), sign };
      this.controls.enabled = false;
      try { opts.canvas.setPointerCapture(e.pointerId); } catch { /* a synthetic pointer has no capture */ }
      opts.canvas.style.cursor = "grabbing";
      e.preventDefault();
    });
    // any other gear: remember where the press began, so a click can be told from a drag when the button comes up
    opts.canvas.addEventListener("pointerdown", (e) => {
      const id = this.hovered;
      this.press = e.button === 0 && id !== null && id !== "a1" ? { x: e.clientX, y: e.clientY, id } : null;
    });
    opts.canvas.addEventListener("pointermove", (e) => {
      const d = this.crankDrag;
      if (!d) return;
      const a = this.crankAngle(e);
      let delta = a - d.last;
      if (delta > Math.PI) delta -= 2 * Math.PI; else if (delta < -Math.PI) delta += 2 * Math.PI;
      d.last = a;
      this.lastInput = performance.now();
      this.onCrank?.((d.sign * delta) / (2 * Math.PI) / CRANK_TURNS_PER_YEAR);
    });
    const release = () => {
      if (!this.crankDrag) return;
      this.crankDrag = null;
      this.controls.enabled = true;
      opts.canvas.style.cursor = this.hovered === "a1" ? "grab" : "";
    };
    opts.canvas.addEventListener("pointerup", (e) => {
      const cranking = !!this.crankDrag;
      release();
      const p = this.press;
      this.press = null;
      // a click, not a drag: the pointer went nowhere, the crank is not being wound, and the same gear is still under it
      if (p && !cranking && Math.hypot(e.clientX - p.x, e.clientY - p.y) < CLICK_SLOP && this.hovered === p.id) this.onSelect?.(p.id);
    });
    opts.canvas.addEventListener("pointercancel", () => { this.press = null; release(); });
    // the graphics context can be taken away: a driver reset, a machine waking from sleep. preventDefault leaves the browser free to give it back
    opts.canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); opts.onContextLost?.(); });
    opts.canvas.addEventListener("webglcontextrestored", () => opts.onContextRestored?.());
    this.resize();
    addEventListener("resize", () => this.resize());
    new ResizeObserver(() => this.resize()).observe(opts.canvas.parentElement ?? opts.canvas);
  }

  /**
   * The two versions of the exhibit share the machine and differ in the room around it:
   * a gallery at night with one spot, or a scholar's room by day with parchment behind.
   */
  setTheme(name: Theme): void {
    const m = name === "manuscript";
    this.theme = name;
    if (m && !this.envs.manuscript) this.envs.manuscript = this.pmrem.fromScene(studioEnvironment(), 0.02).texture;
    this.scene.environment = m ? this.envs.manuscript! : this.envs.vitrine!;
    this.scene.environmentIntensity = m ? 0.9 : 0.65;
    this.scene.environmentRotation.set(0, 0, 0);
    this.applyHdri(name);
    (this.scene.background as THREE.Texture | null)?.dispose?.();
    this.scene.background = wallTexture(name);
    // AgX for the gallery at night, where ACES had lit bronze reading as gold foil; the manuscript keeps
    // ACES, which its parchment and inks were balanced under (AgX greyed the room)
    this.renderer.toneMapping = m ? THREE.ACESFilmicToneMapping : THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = m ? 1.0 : 0.72;
    const L = this.lights;
    L.key.intensity = m ? 1.4 : 2.2;
    L.key.color.set(m ? 0xfff3e2 : 0xffe4bf);
    L.fill.intensity = m ? 0.4 : 0.55;
    L.rim.intensity = m ? 0.5 : 1.2;
    L.frontRake.intensity = m ? 0.5 : 0.9;
    L.backKey.intensity = 1.9;
    // at night the back key rakes the spirals from the left; by day it comes from behind, or the opened back is lit only at a grazing angle and reads rust
    L.backKey.position.set(...(m ? [-200, 260, -560] : [-420, 280, -170]) as [number, number, number]);
    this.setMats.floor.color.set(m ? 0xcdbfa2 : 0x241d18);
    this.setMats.floor.roughness = m ? 0.95 : 0.9;
    this.setMats.plinth.color.set(m ? 0x6b5238 : 0x2a2624);        // a scholar's oak table by day, a stone plinth at night
    this.setMats.plinth.roughness = m ? 0.75 : 0.85;
    this.setMats.plinthTop.color.set(m ? 0x7d6144 : 0x3a3330);
    this.setMats.plinthTop.roughness = m ? 0.6 : 0.6;
    this.setMats.plinthGap.color.set(m ? 0x2e2317 : 0x0d0c0b);
    this.beat = null;
    this.lightBase = { key: L.key.intensity, back: L.backKey.intensity, env: this.scene.environmentIntensity };
    this.lightsSettled = false;                                     // re-apply the mood over the new base
    const u = this.finalPass.material.uniforms;
    u.vignette.value = m ? 0.2 : 0.62;
    u.grain.value = m ? 0.02 : 0.024;
    u.saturation.value = m ? 1.0 : 1.15;
    this.bloomBase = m ? 0.32 : 0.55;
    if (this.wood) {                                               // the case reads as black lacquer against parchment otherwise
      this.wood.mat.color.copy(this.wood.base).multiplyScalar(m ? 1.15 : 0.85);
      this.wood.mat.envMapIntensity = m ? 0.8 : 0.55;
      this.wood.mat.roughness = m ? 0.72 : 0.82;
    }
    this.tunePlate();
  }

  /** Swap in the theme's HDRI once it has loaded (the hand-built room stands in until then). */
  private applyHdri(name: Theme): void {
    if (!this.useHdri) return;
    const spec = HDRI[name], have = this.hdris[name];
    if (have === "loading") return;
    if (!have) {
      this.hdris[name] = "loading";
      new HDRLoader().load(spec.file, (tex) => {
        const env = this.pmrem.fromEquirectangular(tex).texture;
        tex.dispose();
        this.hdris[name] = env;
        if (this.theme === name) this.applyHdri(name);
      }, undefined, () => { this.hdris[name] = undefined; console.info(`[antikythera] ${spec.file} did not load; hand-built room kept`); });
      return;
    }
    this.scene.environment = have;
    this.scene.environmentRotation.set(0, spec.rotation, 0);
    this.scene.environmentIntensity = spec.intensity;
    this.lightBase.env = spec.intensity;
    this.lightsSettled = false;
  }

  /** The plates' tarnish is right under a spot at night and reads as stains on parchment by day: most of it is blended out there. */
  private tunePlate(): void {
    if (!this.plate) return;
    const m = this.theme === "manuscript";
    PLATE_MIX.value = m ? 0.35 : 0.5;                              // at full strength the mottle read as rust, or clouds lit from behind
    this.plate.mat.color.copy(this.plate.base).multiplyScalar(m ? 0.98 : 0.62);
    this.plate.mat.roughness = m ? 1.05 : 1.2;
    this.plate.mat.normalScale.setScalar(m ? 1.1 : 1.6);
    this.plate.mat.envMapIntensity = m ? 0.6 : 0.5;
  }

  /**
   * The overture on load: the machine arrives in pieces, every wheel pushed out along its
   * own arbor (2.8 times its depth in the stack), and slides home layer by layer from the
   * main wheel outwards; `onAssembled` then lets the plates, dials and case close over it.
   */
  assemble(): void {
    if (!this.graph || !this.root) return;
    if (REDUCE_MOTION.matches) { setTimeout(() => this.onAssembled?.(), 0); return; }
    this.setApart(true, false);
    const [p] = PRESETS.iso;                                        // walk in from the side, where the spread along the arbors shows
    this.camera.position.set(p[0] * 3.3, p[1] * 1.15, p[2] * 0.45);
    this.setApart(false, true);
  }
  get assembling(): boolean { return !!this.apartTween; }
  get apart(): boolean { return this.apartTarget === 1; }

  /**
   * "Taken apart": every wheel out along its arbor, still turning, so all 69 can be seen at once
   * (implies Inside); off, they slide home again. Staggered by depth: outermost first going out,
   * innermost first coming home, as a hand would do it.
   */
  setApart(on: boolean, animate = true): void {
    if (!this.graph || !this.root) return;
    const to = on ? 1 : 0;
    if (to === this.apartTarget && !this.apartTween) return;
    this.apartTarget = to;
    if (on) this.setInside(true);
    const items = this.apartItems ?? (this.apartItems = this.buildApart());
    if (!animate || REDUCE_MOTION.matches) {
      for (const it of items) { it.f = to; it.o.position.z = it.z0 + it.off * it.f; }
      this.apartTween = null;
      if (!on) setTimeout(() => this.onAssembled?.(), 0);
      return;
    }
    const zmax = Math.max(1, ...items.map((it) => it.wz));
    this.apartTween = { start: performance.now(), ms: 1700, to, from: items.map((it) => it.f), delays: items.map((it) => 950 * (on ? 1 - it.wz / zmax : it.wz / zmax)) };
  }

  private buildApart(): NonNullable<typeof this.apartItems> {
    const K = 2.8, world = new THREE.Vector3();
    const isNode = new Set<THREE.Object3D>([...this.graph!.nodes.values()].map((n) => n.object));
    const want = new Map<THREE.Object3D, number>();
    const items: NonNullable<typeof this.apartItems> = [];
    this.root!.traverse((o) => {                                    // preorder: a wheel's carrier is placed before it
      if (!isNode.has(o)) return;
      o.getWorldPosition(world);
      const w = K * world.z;
      let inherited = 0;
      for (let p = o.parent; p; p = p.parent) { const v = want.get(p); if (v !== undefined) { inherited = v; break; } }
      want.set(o, w);
      items.push({ o, z0: o.position.z, off: w - inherited, wz: Math.abs(world.z), f: 0 });
    });
    return items;
  }

  private stepApart(now: number): void {
    const tw = this.apartTween, items = this.apartItems;
    if (!tw || !items) return;
    let done = true;
    items.forEach((it, i) => {
      const u = Math.max(0, Math.min(1, (now - tw.start - tw.delays[i]) / tw.ms));
      if (u < 1) done = false;
      const e = 1 - Math.pow(1 - u, 5);                            // ease-out quint: the wheel seats itself
      it.f = tw.from[i] + (tw.to - tw.from[i]) * e;
      it.o.position.z = it.z0 + it.off * it.f;
    });
    if (done) { this.apartTween = null; if (tw.to === 0) this.onAssembled?.(); }
  }

  resize(): void {
    const c = this.opts.canvas;
    const w = c.clientWidth || 800;
    const h = c.clientHeight || 600;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // a narrow stage keeps most of the width of view a 6:5 stage has, so the case is not cut off; a
    // portrait one (a phone) gives up to a quarter of it, which is plinth and room either side of a
    // tall case, so the machine can fill the height it has instead of sitting small in the middle
    const keep = aspect >= 1.2 ? 1.2 : 0.9 + 0.3 * Math.min(1, Math.max(0, (aspect - 0.75) / 0.45));
    this.camera.fov = aspect >= 1.2 ? 38 : Math.min(72, (2 * Math.atan((Math.tan((38 / 2) * Math.PI / 180) * keep) / aspect) * 180) / Math.PI);
    this.camera.updateProjectionMatrix();
    const pr = this.renderer.getPixelRatio();
    this.composer?.setSize(w, h);
    this.bloomComposer?.setSize(w, h);
    this.gtao?.setSize(w * pr, h * pr);
    this.finalPass?.material.uniforms.resolution.value.set(w * pr, h * pr);
  }

  private snapshotting = false;

  /**
   * One frame of the stage as a PNG, drawn at `scale` times the screen's resolution.
   * The drawing buffer is not preserved, so the canvas is read in the same task it is drawn in.
   */
  async snapshot(scale = 2): Promise<Blob> {
    const ratio = this.renderer.getPixelRatio();
    const raised = Math.min(3, ratio * scale);
    try {
      this.snapshotting = true;
      this.renderer.setPixelRatio(raised);
      // the composers keep the pixel ratio they were built with, so the raised one has to be handed to them
      this.composer.setPixelRatio(raised);
      this.bloomComposer.setPixelRatio(raised);
      this.resize();
      this.render();
      // the bitmap is copied in this task, so the restore below runs before the file is encoded
      return canvasToBlob(this.opts.canvas);
    } finally {
      this.renderer.setPixelRatio(ratio);
      this.composer.setPixelRatio(ratio);
      this.bloomComposer.setPixelRatio(ratio);
      this.resize();
      this.snapshotting = false;
    }
  }

  setYears(years: number): void {
    this.graph?.setYears(years);
  }

  /** How much of the baked occlusion to apply (X-ray hides the plates that cast most of it). */
  setAOStrength(x: number): void {
    AO.strength.value = Math.max(0, Math.min(1, x));
  }

  /** Load the Fragment A scan once; resolves when it is in the scene. */
  loadFragment(url: string): Promise<THREE.Group> {
    if (this.fragment) return Promise.resolve(this.fragment);
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      loader.load(url, (gltf) => {
        const g = gltf.scene;
        const pose = Viewer.FRAGMENT_POSE;
        g.position.set(...pose.position);
        g.rotation.set(...pose.rotation);
        g.scale.setScalar(pose.scale);
        g.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            const m = o as THREE.Mesh;
            const mat = (m.material as THREE.MeshStandardMaterial).clone();
            mat.transparent = true;
            mat.opacity = this.fragmentOpacity;
            mat.depthWrite = false;
            mat.roughness = 0.9;
            mat.metalness = 0.15;
            mat.envMapIntensity = 0.5;
            m.material = mat;
            m.renderOrder = 10;
            m.castShadow = true;
            m.receiveShadow = true;
            m.userData.am_fragment = true;
            this.fragmentMats.push(mat);
          }
        });
        g.visible = this.fragmentOpacity > 0;
        this.fragment = g;
        this.scene.add(g);
        resolve(g);
      }, undefined, reject);
    });
  }

  /** 0 = reconstruction only, 1 = the corroded original only. */
  setFragmentOpacity(a: number): void {
    this.fragmentOpacity = Math.max(0, Math.min(1, a));
    for (const m of this.fragmentMats) { m.opacity = this.fragmentOpacity; m.depthWrite = this.fragmentOpacity > 0.95; }
    if (this.fragment) this.fragment.visible = this.fragmentOpacity > 0;
    if (this.root) this.root.visible = this.fragmentOpacity < 0.98;
    if (this.trails) this.trails.group.visible = this.fragmentOpacity < 0.98;
    for (const o of this.set) o.visible = this.fragmentOpacity < 0.98;
  }
  get fragmentShown(): boolean { return this.fragmentOpacity > 0; }
  get fragmentAlpha(): number { return this.fragmentOpacity; }

  /** Fly the camera to a preset (Blender coordinates). `ms` = 0 snaps. */
  view(name: string, ms = 1400): void {
    const [pos, tgt] = PRESETS[name] ?? PRESETS.front;
    const p1 = new THREE.Vector3(...pos);
    const t1 = new THREE.Vector3(...tgt);
    const k2 = this.graph?.get("k2")?.object;
    if (name === "pinslot" && k2) {                                // frame the actual pin-and-slot pair, wherever it has turned to
      k2.getWorldPosition(t1);
      p1.copy(t1).add(new THREE.Vector3(55, -40, -120).normalize().multiplyScalar(135));
    }
    this.lastInput = performance.now();
    this.controls.autoRotate = false;
    if (ms <= 0) {
      this.camera.position.copy(p1);
      this.controls.target.copy(t1);
      this.controls.update();
      this.tween = null;
    } else {
      this.tween = { p0: this.camera.position.clone(), p1, t0: this.controls.target.clone(), t1, start: performance.now(), ms };
    }
    this.setView(name);
  }

  /** A glyph on the Saros dial has come round and NASA agrees: the lights dip for a breath and come back. */
  eclipseBeat(): void { this.beat = performance.now(); }
  /** "spot": the room goes down and the exhibit light stays, as a gallery does for a talk; "room": everything as lit. */
  setMood(name: "room" | "spot"): void {
    const to = name === "spot" ? { env: 0.42, key: 1.15, back: 0.9 } : { env: 1, key: 1, back: 1 };
    if (to.env === this.mood.env && to.key === this.mood.key && !this.moodTween) return;
    this.moodTween = { from: { ...this.mood }, to, start: performance.now() };
  }
  private stepLights(now: number): void {
    const tw = this.moodTween;
    if (tw) {
      const u = Math.min(1, (now - tw.start) / 900), e = 1 - Math.pow(1 - u, 3);
      this.mood = { env: tw.from.env + (tw.to.env - tw.from.env) * e, key: tw.from.key + (tw.to.key - tw.from.key) * e, back: tw.from.back + (tw.to.back - tw.from.back) * e };
      if (u >= 1) this.moodTween = null;
    }
    let f = 0;
    if (this.beat != null) {
      const u = (now - this.beat) / 1800;
      f = u >= 1 ? 0 : Math.pow(Math.sin(Math.PI * u), 1.4);
      if (u >= 1) this.beat = null;
    }
    if (!tw && this.beat == null && f === 0 && this.lightsSettled) return;
    const L = this.lights, b = this.lightBase, m = this.mood;
    L.key.intensity = b.key * m.key * (1 - 0.8 * f);
    L.backKey.intensity = b.back * m.back * (1 - 0.8 * f);
    this.scene.environmentIntensity = b.env * m.env * (1 - 0.6 * f);
    this.lightsSettled = !tw && this.beat == null;
  }
  private lightsSettled = true;

  /** Screen angle of the pointer about the crank's projected centre (clockwise positive, as on screen). */
  private crankAngle(e: PointerEvent): number {
    const c = this.graph?.get("a1")?.object;
    const r = this.opts.canvas.getBoundingClientRect();
    if (!c) return 0;
    const p = c.getWorldPosition(new THREE.Vector3()).project(this.camera);
    const cx = r.left + ((p.x + 1) / 2) * r.width, cy = r.top + ((1 - p.y) / 2) * r.height;
    return Math.atan2(e.clientY - cy, e.clientX - cx);
  }

  private setView(name: string): void {
    if (name === this.currentView) return;
    this.currentView = name;
    this.onView?.(name);
  }

  /** Great-circle camera path around the target with a slight pull-back in the middle. */
  private stepTween(now: number): void {
    const tw = this.tween;
    if (!tw) return;
    const u = Math.min(1, (now - tw.start) / tw.ms);
    const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;     // ease in-out cubic
    const target = tw.t0.clone().lerp(tw.t1, e);
    const d0 = tw.p0.clone().sub(tw.t0), d1 = tw.p1.clone().sub(tw.t1);
    const r0 = d0.length(), r1 = d1.length();
    const a = d0.clone().normalize(), b = d1.clone().normalize();
    let dir: THREE.Vector3;
    const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
    if (dot > 0.9995) dir = a.clone().lerp(b, e).normalize();
    else {
      let axis = a.clone().cross(b);
      if (axis.lengthSq() < 1e-6) axis = a.clone().cross(new THREE.Vector3(0, 1, 0));
      if (axis.lengthSq() < 1e-6) axis = new THREE.Vector3(1, 0, 0);
      axis.normalize();
      dir = a.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(axis, Math.acos(dot) * e));
    }
    const r = THREE.MathUtils.lerp(r0, r1, e) * (1 + 0.18 * Math.sin(Math.PI * e) * Math.min(1, Math.acos(dot) / 1.2));
    this.camera.position.copy(target).addScaledVector(dir, r);
    this.controls.target.copy(target);
    if (u >= 1) this.tween = null;
  }

  /** Pick this instant, throttle and all, for a press that cannot wait for the next frame. */
  private pickNow(): void {
    this.pointerDirty = true;
    this.lastPick = 0;
    this.pick(performance.now());
  }

  private pick(now: number): void {
    if (!this.root || !this.pointerDirty || now - this.lastPick < 40) return;
    this.pointerDirty = false;
    this.lastPick = now;
    let id: string | null = null;
    let obj: THREE.Object3D | null = null;
    if (Math.abs(this.pointer.x) <= 1 && Math.abs(this.pointer.y) <= 1) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObject(this.root, true);
      for (const h of hits) {
        if (h.object.userData.am_fragment || !h.object.visible) continue;
        let o: THREE.Object3D | null = h.object;
        while (o && typeof o.userData.am_id !== "string") o = o.parent;
        if (o) { id = o.userData.am_id as string; obj = o; break; }
      }
    }
    if (id !== this.hovered) {
      this.hovered = id;
      this.setHighlight(obj);
      this.onHover?.(id);
      if (!this.crankDrag) this.opts.canvas.style.cursor = id === "a1" ? "grab" : "";
    }
  }

  private setHighlight(obj: THREE.Object3D | null): void {
    for (const [m, mat] of this.highlightMats) m.material = mat;
    this.highlightMats.clear();
    if (!obj) return;
    const hl = new THREE.MeshStandardMaterial({ color: 0xffc766, emissive: 0x7a4b00, metalness: 0.9, roughness: 0.3 });
    obj.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && typeof o.userData.am_id !== "string" || o === obj) {
        const m = o as THREE.Mesh;
        if (m.isMesh) { this.highlightMats.set(m, m.material); m.material = hl; }
      }
    });
  }

  /**
   * Show the given gear ids in bronze and ghost every other gear at 13 % so the train reads
   * in context; an empty list (or the same list again) brings everything back. Isolating
   * implies looking inside, so the plates lift away.
   */
  isolate(ids: string[]): void {
    if (!this.root || !this.graph) return;
    for (const [m, mat] of this.ghosted) { m.material = mat; m.castShadow = true; }
    this.ghosted.length = 0;
    const same = this.isolated && ids.length === this.isolatedIds.length && ids.every((x, i) => x === this.isolatedIds[i]);
    if (!ids.length || same) {
      this.isolated = false;
      this.isolatedIds = [];
      this.onIsolate?.([]);
      return;
    }
    this.isolatedIds = ids;
    this.isolated = true;
    this.onIsolate?.(ids);
    this.setInside(true);
    const keep = new Set(ids);
    const ghost = (o: THREE.Object3D, rootNode: THREE.Object3D): void => {
      if (o !== rootNode && typeof o.userData.am_id === "string") return;    // another node: its own turn
      const m = o as THREE.Mesh;
      if (m.isMesh) { this.ghosted.push([m, m.material]); m.material = this.ghostMat; m.castShadow = false; }   // a ghost throws no shadow
      for (const c of o.children) ghost(c, rootNode);
    };
    for (const n of this.graph.nodes.values()) if (!keep.has(n.id)) ghost(n.object, n.object);
  }
  private isolated = false;
  private isolatedIds: string[] = [];
  /** told whenever the set of wheels shown alone changes, with the very array passed to `isolate` */
  onIsolate: ((ids: string[]) => void) | null = null;
  get isolatedTrain(): string[] { return this.isolatedIds; }

  /**
   * "Inside": the case, plates and dials lift away from the gears along their own axis and
   * fade over ~1.1 s (the reverse when closing), so looking inside is the machine moving,
   * not a checkbox flipping.
   */
  setInside(on: boolean, animate = true): void {
    if (!this.graph || on === this.insideOn) return;
    this.insideOn = on;
    if (this.reveal) this.finishReveal(this.reveal, true);
    const items: RevealItem[] = [];
    const seen = new Set<THREE.Object3D>();
    for (const role of ["plate", "plate_b1", "dial", "frame_b1", "case"]) {
      for (const o of this.graph.roles.get(role) ?? []) {
        if (seen.has(o)) continue;
        seen.add(o);
        if (role === "case" && !this.caseShown) continue;
        const w = o.getWorldPosition(new THREE.Vector3());
        const d = new THREE.Vector3();
        if (role === "case") {                                       // the boards part outwards
          const ax = Math.abs(w.x) > Math.abs(w.y) ? "x" : "y";
          d[ax] = Math.sign(w[ax] || 1) * 110;
        } else d.z = (w.z >= 0 ? 1 : -1) * 90;
        const mats: THREE.Material[] = [];
        o.traverse((c) => {
          const m = c as THREE.Mesh;
          if (!m.isMesh) return;
          m.castShadow = !on;                                       // lifted plates fade, and fading plates must not shadow the gears
          const src = Array.isArray(m.material) ? m.material : [m.material];
          const clones = src.map((s) => { const k = s.clone(); k.transparent = true; k.opacity = on ? 1 : 0; return k; });
          m.userData.am_restore = m.material;
          m.material = Array.isArray(m.material) ? clones : clones[0];
          mats.push(...clones);
        });
        o.visible = true;
        items.push({ o, mats, p0: o.position.clone(), d });
      }
    }
    this.reveal = { on, start: performance.now(), items };
    if (!animate) this.finishReveal(this.reveal, false);
  }
  get inside(): boolean { return this.insideOn; }
  private caseShown = true;
  /** The wooden case on or off (kept off while Inside is on). */
  setCase(on: boolean): void {
    this.caseShown = on;
    if (!this.graph || this.insideOn) return;
    for (const o of this.graph.roles.get("case") ?? []) o.visible = on;
  }

  private stepReveal(now: number): void {
    const rv = this.reveal;
    if (!rv) return;
    const u = Math.min(1, (now - rv.start) / 1100);
    const e = 1 - Math.pow(1 - u, 3);
    const k = rv.on ? e : 1 - e;
    for (const it of rv.items) {
      it.o.position.copy(it.p0).addScaledVector(it.d, k * k);
      for (const m of it.mats) m.opacity = 1 - k;
    }
    if (u >= 1) this.finishReveal(rv, false);
  }

  private finishReveal(rv: NonNullable<typeof this.reveal>, abort: boolean): void {
    for (const it of rv.items) {
      it.o.position.copy(it.p0);
      it.o.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.isMesh && m.userData.am_restore) { m.material = m.userData.am_restore as THREE.Material; delete m.userData.am_restore; }
      });
      for (const m of it.mats) m.dispose();
      const role = it.o.userData.am_role as string;
      it.o.visible = abort ? !this.insideOn : !rv.on;
      if (role === "case" && !this.caseShown) it.o.visible = false;
    }
    if (this.reveal === rv) this.reveal = null;
  }

  /** Paint everything but the glowing parts black, render the bloom, restore. */
  private renderBloom(): void {
    this.swapped.length = 0;
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.visible) return;
      this.swapped.push([m, m.material]);
      m.material = (m.material !== this.ghostMat && this.glowMats.get(m)) || this.darkMat;
    });
    this.savedBackground = this.scene.background;
    this.scene.background = null;
    const shadows = this.renderer.shadowMap.enabled;
    this.renderer.shadowMap.enabled = false;
    this.bloomComposer.render();
    this.renderer.shadowMap.enabled = shadows;
    this.scene.background = this.savedBackground;
    for (const [m, mat] of this.swapped) m.material = mat;
  }

  /**
   * The three tiers the exhibit runs at. Tier 0 is the machine as it was designed; tier 1 gives up
   * the cinematic passes; tier 2 gives up ambient occlusion too, halves both shadow maps and draws
   * one pixel per pixel, which is what an old laptop can hold a frame rate at.
   */
  setQualityTier(tier: 0 | 1 | 2): void {
    this.qualityTier = tier;
    this.quality.bloom = tier === 0;
    this.quality.dof = tier === 0;
    this.quality.gtao = tier < 2;
    const shadowSize = tier === 2 ? 1024 : 2048;
    for (const light of [this.lights.key, this.lights.backKey]) {
      if (light.shadow.mapSize.width === shadowSize) continue;
      light.shadow.mapSize.set(shadowSize, shadowSize);
      light.shadow.map?.dispose();                       // thrown away so the renderer builds it again at the new size
      light.shadow.map = null;
    }
    const ratio = tier === 2 ? 1 : this.basePixelRatio;
    this.renderer.setPixelRatio(ratio);
    // the composers keep the pixel ratio they were built with, so the new one has to be handed to them
    this.composer.setPixelRatio(ratio);
    this.bloomComposer.setPixelRatio(ratio);
    this.resize();
  }

  /**
   * The automatic guard: 90 frames are timed, their median picks a tier, and a second round of 90
   * confirms it on the picture the first round chose. A round may only go down a tier, never back
   * up, so the exhibit settles once and stays settled.
   */
  private autoQuality(dt: number): void {
    if (this.qualityForced || this.qualityRounds >= 2 || this.qualityTier === 2) return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    this.frameTimes.length = 0;
    this.qualityRounds++;
    const wanted = median > 45 ? 2 : median > 26 ? 1 : 0;   // well under 40 fps, then under 22
    if (wanted <= this.qualityTier) return;
    this.setQualityTier(wanted);
    console.info(`[antikythera] slow GPU (median ${median.toFixed(0)} ms); quality tier ${wanted}: ${TIERS[wanted]}`);
  }

  /** Frame-time statistics for the `?fps=1` overlay: median and worst of the last second. */
  private recent: number[] = [];
  stats(): { fps: number; medianMs: number; worstMs: number } {
    const s = [...this.recent].sort((a, b) => a - b);
    const med = s.length ? s[s.length >> 1] : 0;
    return { fps: med ? 1000 / med : 0, medianMs: med, worstMs: s.length ? s[s.length - 1] : 0 };
  }
  private lastFrame = 0;
  render(): void {
    const now = performance.now();
    // a snapshot frame is drawn larger than the screen (the pixel ratio raised to at most 3),
    // so its time says nothing about how fast the machine runs
    if (this.lastFrame && !this.snapshotting) { const dt = now - this.lastFrame; this.autoQuality(dt); this.recent.push(dt); if (this.recent.length > 60) this.recent.shift(); }
    this.lastFrame = this.snapshotting ? 0 : now;
    this.stepTween(now);
    this.stepApart(now);
    this.stepReveal(now);
    this.stepLights(now);
    this.trails?.step(now, this.theme);
    // a visitor left alone drifts slowly round the case, unless they have asked the page to keep still
    if (!REDUCE_MOTION.matches && !this.tween && !this.reveal && !this.apartTween && !this.controls.autoRotate && now - this.lastInput > 12000 && ["iso", "front", "back", "free"].includes(this.currentView)) this.controls.autoRotate = true;
    this.controls.update();
    this.pick(now);
    this.gtao.enabled = this.quality.gtao;
    const dof = this.quality.dof && this.currentView === "iso" && !this.tween;
    this.bokeh.enabled = dof;
    if (dof) (this.bokeh.uniforms as Record<string, THREE.IUniform>).focus.value = this.camera.position.distanceTo(this.controls.target) * 0.98;
    // the glowing parts (Sun ball, stones, moon ball) are all on the front: seen from behind with the plates on, the bloom pass would only re-render the scene black
    const glowVisible = this.insideOn || this.apartTarget === 1 || this.camera.position.z > -30;
    const bloom = this.quality.bloom && this.bloomMeshes.size > 0 && this.fragmentOpacity < 0.98 && glowVisible;
    this.finalPass.material.uniforms.bloomStrength.value = bloom ? this.bloomBase : 0.0;
    if (bloom) this.renderBloom();
    this.composer.render();
  }
}
