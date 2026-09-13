# Antikythera Cosmos — project instructions

A working 3D reconstruction of the Antikythera mechanism (Freeth et al. 2021
"Cosmos" model, 69 gears) built parametrically in Blender 5.1, exported to glTF,
and driven date by date in a three.js dashboard that compares the machine with
the real sky. **This repo is standalone.** It has nothing to do with the 2D
character/animation project in the sibling `2d/` folder; never write there.

Start every session by reading `NEXT_STEPS.md` (current state, backlog) and
`NOTES.md` (decisions and gotchas). Design direction lives in `.impeccable.md`.

## Layout

```
data/gears.json          single source of truth: every gear, module, arbor, layer, coupling
data/eclipses_*.json     NASA Five Millennium Canon, slimmed (Espenak & Meeus; attribute)
python/mech/             exact ratio solver, arbor layout, tooth outlines, Freeth 2014
                         eclipse-year model, Julian Day maths   -> `cd python && python -m pytest`
tools/gen_dial_textures.py   dial faces drawn in mm (Pillow)  -> assets/textures
tools/narration.py       ElevenLabs narration + sfx -> web/public/audio (needs ELEVENLABS_API_KEY env)
tools/gem.py, gen_textures_gemini.py   Gemini image textures (key in .env, gitignored)
tools/bl.py              socket client for the live Blender session (127.0.0.1:9876)
blender/build_all.py     gears + drivers; blender/dials.py plates/dials/pointers/case;
blender/export_glb.py    -> dist/antikythera.glb + dist/gears.json; blender/fragment.py CT scan
web/                     Vite + TypeScript + three.js dashboard (`npm run dev` on port 5177,
                         `npm run build`, `npx vitest run`)
```

## Rebuild order (Blender open with the Lab MCP add-on enabled)

```
python tools/gen_dial_textures.py
python tools/gen_surface_maps.py                  # bronze normal/roughness/albedo + dial normal maps
python tools/bl.py blender/build_all.py 600
python tools/bl.py blender/dials.py 600
python tools/bl.py blender/surface.py 1800        # UVs, textured materials, AO bake (--set BAKE=0 to skip)
python tools/bl.py blender/export_glb.py 600
cd web && npx gltf-transform optimize ../dist/antikythera.glb public/models/antikythera.glb --texture-size 2048 --compress meshopt --texture-compress false --palette false --join false --flatten false
cd web && npx gltf-transform webp public/models/antikythera.glb public/models/antikythera.glb --quality 90
cd web && npx gltf-transform meshopt public/models/antikythera.glb public/models/antikythera.glb --level medium   # webp decodes meshopt; re-apply
```
Cloudflare caps each static asset at 25 MiB, so the WebP step is not optional.
Hero renders: `python tools/bl.py blender/hero_render.py 1800` -> docs/renders/*.jpg.

Deploy: `cd web && npm run build && cd .. && npx wrangler deploy --assets web/dist`
→ https://antikythera.stewartgregerson.workers.dev (Cloudflare Workers static assets).
Source: github.com/Samizdat-Publications/antikythera (private).

## Conventions that must not drift

- Every gear comes from `data/gears.json`; no imported third-party geometry.
- Rates are rotations per year of b1, clockwise seen from the front = positive;
  Blender `rotation_euler.z = -2π·rate_rel·years`. The web `GearGraph` reproduces every
  driver rule from glTF extras (`am_*` custom properties). Keep Python, Blender and TS in step.
- Time is Julian Day inside; proleptic Julian calendar for BC; astronomical years
  (205 BC = -204). Never JS `Date` for BC dates.
- Epoch default: full moon 12 May 205 BC = JDN 1646679 (Carman & Evans); toggle 22 Dec
  178 BC = JDN 1656764 (Voulgaris).
- Truth sources: NASA canon for eclipses, astronomy-engine for positions; say so in the UI.
- Commit small, push, deploy; log decisions in NOTES.md.
