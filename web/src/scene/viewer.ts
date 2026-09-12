/**
 * three.js scene for the mechanism GLB. Coordinates are Blender's (mm, +Z = front,
 * +Y = up); the GLB is exported with Z-up preserved, so +Z faces the default camera.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
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
    this.renderer.toneMappingExposure = 1.1;
    this.scene.background = new THREE.Color(0x0b0d12);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.camera = new THREE.PerspectiveCamera(38, 1, 1, 5000);
    this.camera.position.set(90, -140, 330);
    this.controls = new OrbitControls(this.camera, opts.canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);

    const key = new THREE.DirectionalLight(0xfff1dc, 2.2);
    key.position.set(200, 150, 400);
    const fill = new THREE.DirectionalLight(0xb9c8ff, 0.7);
    fill.position.set(-300, -100, 200);
    const back = new THREE.DirectionalLight(0xffd9a8, 1.2);
    back.position.set(0, 200, -400);
    this.scene.add(key, fill, back, new THREE.AmbientLight(0x404050, 0.6));

    new GLTFLoader().load(opts.url, (gltf) => {
      this.root = gltf.scene;
      this.root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          m.castShadow = false;
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat && "metalness" in mat) {
            mat.envMapIntensity = 1.0;
          }
        }
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
      front: [0, -40, 380], back: [0, -40, -380], iso: [220, -160, 300], crank: [380, 0, 60], top: [0, 380, 1],
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

  render(): void {
    this.controls.update();
    this.pick();
    this.renderer.render(this.scene, this.camera);
  }
}
