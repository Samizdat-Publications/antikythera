# Where things stand, and what's next

_Updated 2026-09-13, afternoon (manuscript version added). Read this first in a new session._

## Done and live

- Research digest, gear table, exact ratio solver, layout, eclipse-year glyph model (36 pytest).
- Blender build of all 69 gears with drivers, pin-and-slot devices, followers, phase-ball
  differential; verified numerically. Dials, plates, pointers, rings, case, textures.
- glTF export + three.js dashboard: crank, epochs, Inside reveal, ghosted trains, eclipse
  predictor vs NASA canon, real-sky comparison, analytics chart + 3-Saros audit, moon disc,
  gear inspector, narrated 11-step walkthrough, sounds, the Sky view.
- Deployed: https://antikythera.stewartgregerson.workers.dev

## Decisions taken with Stewart (2026-09-13)

- Audience: museum-exhibit / general public; also a personal showpiece; "go all out".
- Visual direction: **Museum vitrine** (see `.impeccable.md`). Late on the 13th he said the
  dark vitrine is "sort of bland" and he wants to try the **Hellenistic manuscript** light theme
  next as an A/B, plus more animation and a "dynamic, interactive presentation that shows how
  old and how complex this is". He also suggested a higher-quality moon/cosmos simulation
  (the Sky view is the first answer to that).
- Progressive disclosure allowed. Mobile is secondary. Asset size doesn't matter; performance does.
- Phase (d) of the lighting plan (a Poly Haven HDRI) needs a download: **ask him first**.
- CT scan of Fragment A (Pakzad, CC BY) is imported and crossfades in the Exhibit menu; its
  in-plane alignment to b1 (`Viewer.FRAGMENT_POSE`) could still be refined by eye.

## Done overnight (13 → 14 Sep), in order

1. Lighting phases b–c (NOTES.md has the detail): procedural bronze maps, box-projected UVs,
   OptiX-baked vertex AO, real dial normal maps (the exporter had been shipping the height
   map as a normal map), spot key with shadows, selective bloom, depth of field on the idle
   three-quarter view, vignette + grain, great-circle camera tweens, intro dolly, WebP textures
   (Cloudflare's 25 MiB asset cap), auto-quality on slow GPUs.
2. Phase e: `blender/hero_render.py` (Cycles, OptiX, AgX) → `docs/renders/*.jpg`, in the README.
3. Second `/critique`: 25/40 (from 22). Acted on: gallery set (plinth, floor, contact shadow),
   raking lights on both faces, metal plates again, the animated **Inside** reveal, ghosted
   trains, pin-and-slot camera on k2's live position, the walkthrough as a wall label over the
   stage (closing keeps the scene; the last step leaves the crank running), first-visit
   invitation instead of blocked autoplay, crank running on arrival, idle orbit, space bar,
   HUD regrouped (Front / Back / Three-quarter / Crank / Sky, Inside, Exhibit ▾), hover label,
   glossary titles, loader progress + failure copy, front-dial ledger collapsed, Sources colophon,
   moon disc like the phase ball.
4. **The Sky view** (`web/src/ui/cosmos.ts`): geocentric diagram drawn from the gear graph's own
   pin-and-slot geometry, trails with the real retrograde loops, truth ticks. Small in the
   column, full-size on the stage.
5. **Device phase fitting** (`web/src/astro/phases.ts`): the Sky view showed Mars ±40° off; each
   anomaly device's pin is now turned to the phase that matches the sky at the epoch. Residuals
   (true Sun 0.3°, Saturn 1.2°, Jupiter 1.3°, Venus 1.8°, Mercury 4.9°, Mars 7.4° rms) are shown
   in "Against the real sky".

## Backlog, in priority order

0. ~~Manuscript theme~~ DONE 2026-09-13 afternoon: `?theme=manuscript`, top-bar switch; both
   versions kept (NOTES.md). Still to taste: the front plate's tarnish reads heavier on parchment;
   a ruled frame and a caption under the stage would make it more of a plate in a codex; the
   walkthrough card could carry a rubricated initial.
1. **More motion where the machine moves**: an exploded "assembly" on first load (gears sliding
   onto arbors along Z; `gears.json` has the layers), pointer trails on the front dial at ten
   years per second, a dimmed-gallery beat with the chime when a Saros glyph and NASA agree,
   per-step lighting changes in the walkthrough, drag-the-crank scrubbing, URL state.
2. **Lighting phase d**: a real HDRI (Poly Haven, CC0) if he wants it; ask before downloading.
   Also re-render the hero images after any material change (`blender/hero_render.py`, ~3 min).
3. **Tablet/mobile**: aspect-aware camera framing per preset; the Sky view on narrow screens.
4. **Fragment A alignment** by eye against b1's four spokes.
5. **3D lit moon** in the Moon panel; **retrograde strip** (longitude vs time) beside the Sky view.
6. **Parapegma highlight** when the Sun pointer crosses an index letter; transcribe Bitsakis &
   Jones 2016 for the real lines (currently schematic).
7. **Performance**: FPS overlay; merge static meshes; the bloom pass re-renders the scene (skip it
   when no glowing part is on screen).
8. **Attested-vs-reconstructed styling** in the inspector; Freeth 2014 Table S3 hours into the
   Saros dial texture.
9. Critique leftovers: the accuracy chart's stock legend and 5-day sampling; "crank & chime" is
   discovered by accident; the mirrored-looking glyphs on the Saros spiral are just tangential
   text read from the wrong side (not a bug).

## How to resume

Open Claude Code in `C:\Users\stewa\OneDrive\Documents\Claude\Blender Tests\antikythera`
(not in `2d`). Blender must be open with the MCP add-on for any rebuild (`build/antikythera.blend`
is saved with the UVs, textured materials and baked AO). The web dev server config is in
`.claude/launch.json` (`antikythera-web`, port 5177). Rebuild order and deploy command: CLAUDE.md.
