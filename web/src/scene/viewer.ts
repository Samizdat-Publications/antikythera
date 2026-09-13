/**
 * three.js scene for the mechanism GLB. Coordinates are Blender's (mm, +Z = front,
 * +Y = up); the GLB is exported with Z-up preserved, so +Z faces the default camera.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GearGraph } from "../mech/gearGraph";

export interface ViewerOptions {
  canvas: HTMLCanvasElement;
  url: string;
  onReady?: (graph: GearGraph) => void;
}

export class Viewer {
  readonly renderer: THREE.WebGLRenderer;
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

  constructor(private opts: ViewerOptions) {
    this.renderer = new THREE.WebGLRenderer({ canvas: opts.canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.scene.background = new THREE.Color(0x0b0d12);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.32;

    this.camera = new THREE.PerspectiveCamera(38, 1, 1, 5000);
    this.camera.position.set(140, -120, 520);
    this.controls = new OrbitControls(this.camera, opts.canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);

    const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
    key.position.set(200, 150, 400);
    const fill = new THREE.DirectionalLight(0xb9c8ff, 0.5);
    fill.position.set(-300, -100, 200);
    const back = new THREE.DirectionalLight(0xffd9a8, 1.2);
    back.position.set(0, 200, -400);
    const backKey = new THREE.DirectionalLight(0xfff1dc, 1.6);      // lights the back dials
    backKey.position.set(-200, 120, -420);
    this.scene.add(key, fill, back, backKey);

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(opts.url, (gltf) => {
      this.root = gltf.scene;
      // material pass: the GLB carries flat PBR values; give every family a tuned look
      const bronze = new THREE.MeshStandardMaterial({ color: 0xa8763a, metalness: 0.95, roughness: 0.4, envMapIntensity: 1.0 });
      const plate = new THREE.MeshStandardMaterial({ color: 0x7a5426, metalness: 0.9, roughness: 0.55, envMapIntensity: 0.8 });
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
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        const out = mats.map((mat) => {
          const name = mat.name.replace(/\.\d+$/, "");
          if (byName[name]) return byName[name];
          const std = mat as THREE.MeshStandardMaterial;
          if ("envMapIntensity" in std) {
            std.envMapIntensity = 0.8;
            if (std.map) {                                   // engraved dial faces and wood
              std.metalness = name === "Wood" ? 0.0 : 0.55;
              std.roughness = name === "Wood" ? 0.7 : 0.55;
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
  }

  resize(): void {
    const c = this.opts.canvas;
    const w = c.clientWidth || 800;
    const h = c.clientHeight || 600;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setYears(years: number): void {
    this.graph?.setYears(years);
  }

  /** Camera presets, Blender coordinates. */
  view(name: "front" | "back" | "iso" | "crank" | "top"): void {
    const p: Record<string, [number, number, number]> = {
      front: [0, -30, 560], back: [0, -30, -560], iso: [300, -220, 420], crank: [520, 0, 80], top: [0, 560, 1],
    };
    const [x, y, z] = p[name];
    this.camera.position.set(x, y, z);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private pick(): void {
    if (!this.root) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.root, true);
    let id: string | null = null;
    let obj: THREE.Object3D | null = null;
    for (const h of hits) {
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
    if (!keep.size || this.isolated) {
      this.root.traverse((o) => { o.visible = true; });
      this.isolated = false;
      return;
    }
    this.root.traverse((o) => {
      const id = o.userData.am_id as string | undefined;
      const role = o.userData.am_role as string | undefined;
      if (id && this.graph!.nodes.has(id)) o.visible = keep.has(id);
      else if (role) o.visible = false;
    });
    this.isolated = true;
  }
  private isolated = false;

  render(): void {
    this.controls.update();
    this.pick();
    this.renderer.render(this.scene, this.camera);
  }
}
