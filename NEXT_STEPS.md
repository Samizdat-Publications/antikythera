# Where things stand, and what's next

_Updated 2026-09-13, late night (the backlog worked through: trails, the lit Moon, the chart, the renders, the running head). Read this first in a new session._

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

## Done 13 Sep, late afternoon (Stewart: the manuscript is "almost perfect"; push it)

6. **The manuscript as a codex plate** (NOTES.md): the stage set in from the page inside a double
   rule with a numbered caption beneath ("Plate III · The mechanism seen three-quarter on, set to
   12 May 205 BC"; Sky = Plate V, opened / train alone / Fragment A all captioned); roman leaves and
   a red-ochre versal on the walkthrough; hederae between the column's sections; square boxes; the
   plate's tarnish blended toward bronze on parchment (a `mapMix` shader uniform); fibre in the wall.
7. **The overture**: on every load the machine arrives in pieces, every wheel spread along its
   arbor, and slides home layer by layer while the camera walks in from the side; the plates close
   over it, then the invitation or the crank. Both versions. Skipped under reduced motion.
8. **Drag the crank**: hover the handle ("drag the handle to wind it", grab cursor) and wind it
   round; the machine follows the handle, forwards or back, and the motor stops.
9. **Taken apart** (Exhibit ▾): every wheel out along its arbor and still turning, so all 69 can
   be watched at once; untick and they slide home. The overture is the same state played once.
10. **Walkthrough fixes and three new leaves** (evening): the planets step no longer spins (it
    watches the dial at four months a second) and ghosts/lifted plates cast no shadows; new leaves
    "What the divers found" (Fragment A alone), "Seeing inside the corrosion" (the scan over the
    gears) and "The sky it tracks" (the Sky view), narrated. Fourteen leaves.
11. **Backlog batch** (evening): URL state (`?view=&years=&inside=1&apart=1&sky=1&epoch=`), the
    eclipse beat (lights dip with the chime when a glyph and NASA agree, at slow speeds or on a
    jump), phone-width framing (wider fov on narrow stages), reconstructed gears in italic in the
    train list, an oak table under the case in the manuscript.
12. **Night batch**: Fragment A turned −45° onto b1's spokes; the retrograde strip under the Sky
    panel; the parapegma row in the front-dial ledger; `?fps=1`; bloom skipped from behind; per-leaf
    lighting; the manuscript's opened back lit from behind; chart legend; pen-stroke trails.

## Done 13 Sep, late night (the whole backlog, NOTES.md has the detail)

13. **Pointer trails** on the front dial (`web/src/scene/trails.ts`): a long exposure of the Sun ball
    and the five stones while the crank runs, sampled from the gear graph in sub-steps so nothing
    aliases; `?trails=0`. Costs ~2 ms only at ten years a second.
14. **The Moon panel is a lit Moon**: NASA's LROC near side, Lommel-Seeliger shading, earthshine; an
    engraving (hatch, stipple, parchment) in the manuscript.
15. **The accuracy chart** samples daily and draws yearly least-to-most bands (the 5-day sampling
    had aliased the monthly wobble into moire); computed once per epoch in idle time.
16. **Hero renders** re-done with the studio HDRI as the world (hidden from the camera), 95 s.
17. **The manuscript's top bar** is a running head: rubric face, hederae, the version underlined,
    ink-square checkboxes everywhere in the manuscript.
18. **Merging static meshes: measured, not done** (1053 draw calls a frame from 142 meshes over seven
    passes; only eight meshes are mergeable, ~5 %; the frame is fill-bound). See NOTES.md.

## Backlog, in priority order

0. ~~Manuscript theme~~, ~~plate, caption, versal~~, ~~table~~, ~~pen trails~~, ~~opened back~~,
   ~~the top bar as a running head~~ DONE.
1. ~~More motion where the machine moves~~ DONE, trails included.
2. ~~Lighting phase d~~ and ~~the hero re-renders~~ DONE.
3. ~~Tablet/mobile~~ DONE.
4. ~~Fragment A alignment~~ DONE by eye (−45°); its position could still be nudged a few mm, judged
   at full size against b1's rim (a taste call for Stewart).
5. ~~3D lit moon~~, ~~retrograde strip~~ DONE.
6. ~~Parapegma highlight~~ DONE; the letters' degree positions on the ring are still schematic (the
   attested positions would need Bitsakis & Jones 2016 Table 3 read into `gen_dial_textures.py` and
   `LETTER_OFFSETS` in main.ts), and the lines are the attested set with reconstructed Greek.
7. **Performance**: ~~FPS overlay~~, ~~bloom skipped from behind~~ DONE; ~~merge static meshes~~
   closed (see 18). If a slow GPU ever matters: the shadow maps at half resolution, or GTAO at half.
8. ~~Inspector styling~~, ~~Table S3 hours~~ DONE.
9. Critique leftovers: ~~legend~~, ~~5-day sampling~~, ~~"crank & chime" discovered by accident~~ DONE;
   the mirrored-looking glyphs on the Saros spiral are tangential text read from the wrong side (not a bug).
10. New ideas, unranked: the Moon panel could show libration (the real Moon nods ±8°; the machine
    does not know that, so it would have to be labelled as the sky's, not the machine's); a trail on the
    Sky view's stage plate at ten years a second to match the dial; the walkthrough's Moon leaf could
    point at the lit Moon now that it is worth pointing at.

## How to resume

Open Claude Code in `C:\Users\stewa\OneDrive\Documents\Claude\Blender Tests\antikythera`
(not in `2d`). Blender must be open with the MCP add-on for any rebuild (`build/antikythera.blend`
is saved with the UVs, textured materials and baked AO). The web dev server config is in
`.claude/launch.json` (`antikythera-web`, port 5177). Rebuild order and deploy command: CLAUDE.md.
