// Build showcase/model.glb for samizdatpublications.com: the machine taken apart, as the exhibit shows it.
//
// Input: .playwright-mcp/apart_raw.glb, exported from the running exhibit with three's GLTFExporter
// (?view=iso&apart=1&years=0.9, gallery set hidden, onlyVisible), so the spread is exactly Viewer.buildApart's.
// COLOR_0 is the Blender AO bake: the exhibit reads its red channel on indirect light only (shaders.ts
// withVertexAO), but any glTF viewer multiplies it into the base colour and the bake's zeros turn whole wheels
// black, so it is dropped. Then centred on the origin and optimised (meshopt, WebP textures at 1024 px).
// Run from the repo root: node tools/landing/showcase_model.mjs
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const req = createRequire(path.join(ROOT, "web/package.json"));
const load = async (m) => import(pathToFileURL(req.resolve(m)).href);
const { NodeIO } = await load("@gltf-transform/core");
const { ALL_EXTENSIONS } = await load("@gltf-transform/extensions");
const { center } = await load("@gltf-transform/functions");

const RAW = path.join(ROOT, ".playwright-mcp/apart_raw.glb");
const MID = path.join(ROOT, ".playwright-mcp/apart_clean.glb");
const OUT = path.join(ROOT, "showcase/model.glb");

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(RAW);
let stripped = 0;
for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    if (prim.getAttribute("COLOR_0")) { prim.setAttribute("COLOR_0", null); stripped++; }
  }
}
await doc.transform(center({ pivot: "center" }));
await io.write(MID, doc);
console.log(`COLOR_0 dropped from ${stripped} primitives`);

const cli = path.join(ROOT, "web/node_modules/@gltf-transform/cli/bin/cli.js");
execFileSync(process.execPath, [cli, "optimize", MID, OUT, "--compress", "meshopt", "--texture-compress", "webp",
  "--texture-size", "1024", "--simplify-ratio", "0.6", "--simplify-error", "0.001"], { stdio: "inherit" });
