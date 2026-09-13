/**
 * three.js scene for the mechanism GLB. Coordinates are Blender's (mm, +Z = front,
 * +Y = up); the GLB is exported with Z-up preserved, so +Z faces the default camera.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/**
 * A gallery at night, built as geometry so PMREM can turn it into reflections:
 * a large warm key panel high on the left, a dim cool fill on the right, a thin
 * warm rim strip behind the exhibit, and dark walls so bronze keeps its depth.
 */
function galleryEnvironment(): THREE.Scene {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshStandardMaterial({ color: 0x1a1512, side: THREE.BackSide, roughness: 1 }));
  s.add(room);
  const panel = (w: number, h: number, color: number, intensity: number, pos: [number, number, number], look: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    (m.material as THREE.MeshBasicMaterial).color.multiplyScalar(intensity);
    m.position.set(...pos);
    m.lookAt(...look);
    s.add(m);
  };
  panel(5, 6, 0xffe2b8, 7.0, [-6, 5, 5], [0, 0, 0]);       // key, warm, high left
  panel(6, 4, 0x9fb4c8, 1.4, [7, 2, 3], [0, 0, 0]);        // fill, cool, right
  panel(9, 0.6, 0xffc98a, 5.0, [0, 6, -7], [0, 0, 0]);     // rim strip, behind and above
  panel(3, 3, 0xfff1dc, 2.0, [0, -5.5, 4], [0, 0, 0]);     // floor bounce
  panel(5, 6, 0xffe2b8, 5.5, [6, 5, -5], [0, 0, 0]);       // second key for the back dials
  panel(6, 4, 0x9fb4c8, 1.2, [-7, 2, -3], [0, 0, 0]);      // cool fill behind
  return s;
}
import { GearGraph } from "../mech/gearGraph";

export interface ViewerOptions {
  canvas: HTMLCanvasElement;
  url: string;
  onReady?: (graph: GearGraph) => void;
}

export class Viewer {
  readonly renderer: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  private gtao!: GTAOPass;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  graph: GearGraph | null = null;
  root: THREE.Group | null = null;
  private highlight: THREE.Object3D | null = null;
  private highlightMats: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  hovered: string | null = null;
  onHover: ((id: string | null) => void) | null = null;
  /** The CT scan of Fragment A (Ashkan Pakzad, CC BY 4.0), loaded on demand. */
  fragment: THREE.Group | null = null;
  private fragmentMats: THREE.MeshStandardMaterial[] = [];
  private fragmentOpacity = 0;
  /** Alignment of the scan to the reconstruction (mm, radians), tuned by eye. */
  static FRAGMENT_POSE = { position: [0, 0, 0] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number], scale: 1.0 };

  constructor(private opts: ViewerOptions) {
    this.renderer = new THREE.WebGLRenderer({ canvas: opts.canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.88;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene.background = new THREE.Color(0x120f0d);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(galleryEnvironment(), 0.02).texture;
    this.scene.environmentIntensity = 0.9;
    void RoomEnvironment;

    this.camera = new THREE.PerspectiveCamera(38, 1, 1, 5000);
    this.camera.position.set(140, -120, 520);
    this.controls = new OrbitControls(this.camera, opts.canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);

    const key = new THREE.DirectionalLight(0xffe6c4, 2.1);
    key.position.set(-220, 260, 420);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.6;
    const cam = key.shadow.camera as THREE.OrthographicCamera;
    cam.left = -260; cam.right = 260; cam.top = 260; cam.bottom = -260; cam.near = 50; cam.far = 1200;
    const fill = new THREE.DirectionalLight(0xa9b8cc, 0.35);
    fill.position.set(320, -60, 240);
    const rim = new THREE.DirectionalLight(0xffc98a, 1.1);
    rim.position.set(60, 240, -420);
    const backKey = new THREE.DirectionalLight(0xffe6c4, 1.8);      // lights the back dials
    backKey.position.set(-220, 160, -460);
    backKey.castShadow = true;
    backKey.shadow.mapSize.set(2048, 2048);
    backKey.shadow.bias = -0.0004;
    backKey.shadow.normalBias = 0.6;
    const bcam = backKey.shadow.camera as THREE.OrthographicCamera;
    bcam.left = -260; bcam.right = 260; bcam.top = 260; bcam.bottom = -260; bcam.near = 50; bcam.far = 1200;
    this.scene.add(key, fill, rim, backKey);

    // post: render -> ground-truth ambient occlusion (depth between gears and plates) -> output
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.gtao = new GTAOPass(this.scene, this.camera, 1, 1);
    this.gtao.output = GTAOPass.OUTPUT.Default;
    this.gtao.blendIntensity = 0.85;
    Object.assign(this.gtao.gtaoMaterial.defines, {});
    this.gtao.updateGtaoMaterial({ radius: 6, distanceExponent: 1, thickness: 2, scale: 1.2, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 16 });
    this.composer.addPass(this.gtao);
    this.composer.addPass(new OutputPass());

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(opts.url, (gltf) => {
      this.root = gltf.scene;
      // material pass: the GLB carries flat PBR values; give every family a tuned look
      const bronze = new THREE.MeshPhysicalMaterial({ color: 0xb07d3e, metalness: 1.0, roughness: 0.38, envMapIntensity: 1.0, clearcoat: 0.15, clearcoatRoughness: 0.5 });
      const plate = new THREE.MeshPhysicalMaterial({ color: 0x7e5628, metalness: 0.95, roughness: 0.5, envMapIntensity: 0.9 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x3b2a14, metalness: 0.8, roughness: 0.6 });
      const byName: Record<string, THREE.Material> = {
        Bronze: bronze, PlateBronze: plate, DarkBronze: dark,
        Gold: new THREE.MeshStandardMaterial({ color: 0xffc866, metalness: 1.0, roughness: 0.25 }),
        MoonSilver: new THREE.MeshStandardMaterial({ color: 0xe8e8ee, metalness: 1.0, roughness: 0.3 }),
        MoonBlack: new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.2, roughness: 0.6 }),
      };
      this.root.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh) return;
        const m = o as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        const out = mats.map((mat) => {
          const name = mat.name.replace(/\.\d+$/, "");
          if (byName[name]) return byName[name];
          const std = mat as THREE.MeshStandardMaterial;
          if ("envMapIntensity" in std) {
            std.envMapIntensity = 0.9;
            if (std.map) {                                   // engraved dial faces and wood
              std.metalness = name === "Wood" ? 0.0 : 0.5;
              std.roughness = name === "Wood" ? 0.75 : 0.55;
              if (std.bumpMap) std.bumpScale = 1.4;
            }
          }
          return mat;
        });
        m.material = Array.isArray(m.material) ? out : out[0];
      });
      this.scene.add(this.root);
      this.graph = new GearGraph(this.root);
      this.graph.setYears(0);
      opts.onReady?.(this.graph);
    });

    opts.canvas.addEventListener("pointermove", (e) => {
      const r = opts.canvas.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    });
    this.resize();
    addEventListener("resize", () => this.resize());
    new ResizeObserver(() => this.resize()).observe(opts.canvas.parentElement ?? opts.canvas);
  }

  resize(): void {
    const c = this.opts.canvas;
    const w = c.clientWidth || 800;
    const h = c.clientHeight || 600;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const pr = this.renderer.getPixelRatio();
    this.composer?.setSize(w, h);
    this.gtao?.setSize(w * pr, h * pr);
  }

  setYears(years: number): void {
    this.graph?.setYears(years);
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
  }
  get fragmentShown(): boolean { return this.fragmentOpacity > 0; }

  /** Camera presets, Blender coordinates (position, target). */
  view(name: string): void {
    const p: Record<string, [[number, number, number], [number, number, number]]> = {
      "front": [[0, -30, 560], [0, -10, 0]],
      "front-close": [[30, -40, 300], [0, 0, 30]],
      "back": [[0, -30, -560], [0, -10, 0]],
      "back-upper": [[20, 40, -260], [0, 58, -40]],
      "back-lower": [[20, -110, -260], [0, -81, -40]],
      "pinslot": [[80, -90, -200], [15, -10, -25]],
      "iso": [[300, -220, 420], [0, 0, 0]],
      "crank": [[520, 0, 80], [60, 0, 0]],
      "top": [[0, 560, 1], [0, 0, 0]],
    };
    const [pos, tgt] = p[name] ?? p.front;
    this.camera.position.set(...pos);
    this.controls.target.set(...tgt);
    this.controls.update();
  }

  private pick(): void {
    if (!this.root) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.root, true);
    let id: string | null = null;
    let obj: THREE.Object3D | null = null;
    for (const h of hits) {
      if (h.object.userData.am_fragment) continue;
      let o: THREE.Object3D | null = h.object;
      while (o && typeof o.userData.am_id !== "string") o = o.parent;
      if (o) { id = o.userData.am_id as string; obj = o; break; }
    }
    if (id !== this.hovered) {
      this.hovered = id;
      this.setHighlight(obj);
      this.onHover?.(id);
    }
  }

  private setHighlight(obj: THREE.Object3D | null): void {
    for (const [m, mat] of this.highlightMats) m.material = mat;
    this.highlightMats.clear();
    this.highlight = obj;
    if (!obj) return;
    const hl = new THREE.MeshStandardMaterial({ color: 0xffc766, emissive: 0x7a4b00, metalness: 0.9, roughness: 0.3 });
    obj.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && typeof o.userData.am_id !== "string" || o === obj) {
        const m = o as THREE.Mesh;
        if (m.isMesh) { this.highlightMats.set(m, m.material); m.material = hl; }
      }
    });
  }

  /** Show only the given gear ids (plus their carriers); empty list restores everything. */
  isolate(ids: string[]): void {
    if (!this.root || !this.graph) return;
    const keep = new Set(ids);
    const same = this.isolated && ids.length === this.isolatedIds.length && ids.every((x, i) => x === this.isolatedIds[i]);
    if (!keep.size || same) {
      this.root.traverse((o) => { o.visible = true; });
      this.isolated = false;
      this.isolatedIds = [];
      return;
    }
    this.root.traverse((o) => { o.visible = true; });
    this.isolatedIds = ids;
    this.root.traverse((o) => {
      const id = o.userData.am_id as string | undefined;
      const role = o.userData.am_role as string | undefined;
      if (id && this.graph!.nodes.has(id)) o.visible = keep.has(id);
      else if (role) o.visible = false;
    });
    this.isolated = true;
  }
  private isolated = false;
  private isolatedIds: string[] = [];

  render(): void {
    this.controls.update();
    this.pick();
    this.composer.render();
  }
}
