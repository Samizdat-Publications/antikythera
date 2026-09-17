# Antikythera: decisions log

Plan of record: `~/.claude/plans/i-would-like-to-bubbly-boot.md` (approved 2026-09-12).

## Decisions
- 2026-09-12 Baseline reconstruction = Freeth et al. 2021 "Cosmos" (CC-BY). Disputed parts parametric.
- 2026-09-12 No third-party geometry imported. Every gear generated from `data/gears.json`.
- 2026-09-12 Time coordinate = Julian Day Number; proleptic Julian calendar for BC; astronomical year numbering.
- 2026-09-12 Epochs: Carman & Evans 205 BC (JDN 1646680) default; Voulgaris 178 BC (JDN 1656764) toggle.

## Reference assets (assets/raw, gitignored)
See README "Attributions" for licences.
- 2026-09-12 Epoch JDNs verified with two independent algorithms: 12 May 205 BC = **1646679** (the
  research note said 1646680; that came from a Wikipedia formula that truncates toward zero and is off
  by one for negative years), 22 Dec 178 BC = 1656764. Cross-check: the glyph model's month-2 lunar
  glyph lands on NASA's partial lunar eclipse of 11 Jun 205 BC and month 8 on the total of 5 Dec 205 BC.
- 2026-09-12 Superior-planet trains read off Freeth 2021 Supp. Fig. S23b: Saturn 56~52+61~40~68⊕86~86,
  Jupiter 56~64+45~40~43⊕65~65, Mars 56~64+38~40~71⊕80~80, true Sun 56~52~56⊕follower. Table S9 offsets
  Mars 6.58 / Jupiter 1.58 / Saturn 1.50 mm; pin radii 10.00 / 8.22 / 14.37 mm.
- 2026-09-12 Back-train arbor directions taken from Thomas Weibel's CC-BY model (assets/raw); distances
  always recomputed from tooth counts and modules.
- 2026-09-12 Web export pipeline gotchas (all fixed): the glTF exporter must have `export_texcoords=True` or
  the dial textures have no UVs; `gltf-transform optimize` must run with `--join false --flatten false
  --palette false` or it merges the gears into one mesh and kills the node hierarchy the gear graph needs;
  Blender driver variables that read another driven object's rotation must be SINGLE_PROP
  (`rotation_euler[2]`), not TRANSFORMS/LOCAL_SPACE, which returned 0 for chain-driven objects in 5.1.
- 2026-09-12 Pointer calibration: at years = 0 every gear sits at zero and each pointer carries an
  assembly offset equal to the real sky at the epoch (astronomy-engine); the lunar pin is assumed at
  apogee at the epoch (the reason Carman & Evans / Freeth 2014 picked that full moon).
- 2026-09-12 Schematic (not attested) content: parapegma line positions and most Greek phrasing, Saros
  glyph hours outside the 15 surviving cells (Freeth 2014 Table S3), index-letter assignment, the Games
  dial 4th year (Halieia), Callippic dial existence.
- 2026-09-12 Deployed: https://antikythera.stewartgregerson.workers.dev (Cloudflare Workers static assets,
  `npx wrangler deploy --assets web/dist` after `npm run build`). Source: private repo
  github.com/Samizdat-Publications/antikythera. The Claude Design mockup round was skipped in favour of
  building the dashboard directly so Stewart can review the live thing.
- 2026-09-13 Design critique (two independent assessments: design-director review + `impeccable`
  detector) verdict on the first dashboard: generic dark-card SaaS look (Cormorant + IBM Plex Mono,
  eight identical cards, 11px text, moon glow, glassy card, chart-blue), no progressive disclosure,
  the column jittered while the crank ran, the walkthrough card covered the exhibit, no primary
  action. Heuristic total 22/40. Restyled to the museum-vitrine direction in `.impeccable.md`:
  Marcellus + Alegreya, catalogue column with hairline rules, collapsed advanced sections,
  "Turn the crank" as the one filled button, 4 Hz column updates while playing with fixed-height
  eclipse rows, walkthrough docked under the stage, human names in the hover, JD moved off the header.
  Lighting: hand-built warm gallery PMREM environment, shadow-casting key + back key, GTAO pass.
- 2026-09-13 (night) Lighting phases b–c. The glTF exporter had been shipping each dial's grey *bump*
  image as its normal texture (a Bump node has no glTF equivalent), which tilted every dial face by a
  constant ~55° and washed the engraving out; `tools/gen_surface_maps.py` now derives real tangent-space
  normals from the bump maps and `dials.py` wires a NormalMap node. Bronze gets procedural tileable maps
  (spun/concentric for turned parts, brushed+hammered for plates, roughness with sparse tarnish, faintly
  mottled albedo) drawn at 2048 px per 160 mm; `blender/surface.py` box-projects UVs on the 127 meshes
  that had none (gear UVs centred on the axis so the spun map is concentric), textures the materials in
  Blender so the GLB carries them, and bakes ambient occlusion to a vertex colour with OptiX. Moving parts
  are baked with only static parts, same-axis parts and wheels ≥ 40 mm radius as occluders, so nothing
  rotation-dependent is frozen in; the bake is honest and harsh (plates sit flush on dials, so hidden
  faces are 0) and the web shader lifts it with pow(ao, 0.6) and feeds it into *indirect* light only
  (never the albedo), at 0.9 strength, 0.45 in X-ray where the occluding plates are hidden.
  Web: spot key (decay 0) with PCF shadows, cool fill for the case volume, selective bloom (Sun ball,
  stones, moon ball painted with glow materials while everything else is black), BokehPass only on the
  idle iso preset, vignette + static per-pixel grain in the final composite (nothing animates), ACES 0.85,
  great-circle camera tweens with a slight pull-back, an intro dolly on load, picking only when the
  pointer moves (was a 9 ms raycast every frame), and an auto-quality guard that drops bloom/DoF when the
  median frame exceeds 26 ms. Cloudflare Workers caps static assets at 25 MiB; the textured GLB was 31,
  so `gltf-transform webp --quality 90` runs after `optimize` in the rebuild order.
  Phase d (Poly Haven HDRI) NOT done: it needs a download and Stewart asked to be asked first; the
  hand-built PMREM gallery (key panel + a small bright lamp disc for glints, cool fill, rim strip, floor
  bounce) is the environment. Stewart's note tonight: the dark vitrine look is "sort of bland"; he wants
  to try the Hellenistic-manuscript theme next, plus more animation, and suggested a higher-quality
  moon/cosmos simulation that shows how complex the motion being tracked is.
- 2026-09-13 (night) Second design critique, after the lighting pass. Two independent assessments
  (design-director sub-agent with fresh 1600 px screenshots; `npx impeccable --json web/index.html`).
  Heuristic total 25/40 (was 22): status 3, real-world 3, control 3, consistency 2, error prevention 2,
  recognition 2, flexibility 2, minimalism 3, error recovery 1, help 4. AI-slop verdict: no tells (the
  residue was the segmented control + pill checkboxes, carousel dots, a stock Chart.js legend and stones
  that bloomed LED-white). Detector: five typography warnings, all on uppercase panel summaries whose
  italic hints it counted as body text, and the loading label's tracking; treated as false positives
  except the tracking, which was reduced. The two P0s: (1) "the exhibit reads as a lit paper poster on
  black": no floor, plinth or contact shadow, head-on back light so the spirals cast nothing, matte
  plates; (2) the walkthrough's peak steps (pin and slot, Mars) framed the wrong gears and scrolled the
  wrong element. Acted on tonight: stone plinth + floor with the spot's pool and contact shadow; raking
  key on the back dials and a raking fill on the front; plates and dials back to metal (darker albedo
  multiplier instead of matte); "Inside" replaces the X-ray checkbox and is an animation (case boards
  part outwards, plates and dials lift ±90 mm along the axis and fade, 1.1 s, reversed on close);
  isolating a train ghosts the rest at 13 % instead of hiding it; the pin-and-slot camera targets k2's
  live world position; the walkthrough is a wall label over the lower-left of the stage (the stage keeps
  its full height), closing it keeps the scene, the last step leaves the crank turning; first visit shows
  one "Begin the walkthrough" invitation instead of autoplaying blocked narration; the crank runs at a
  month per second on arrival for returning visitors; idle 12 s → slow orbit; space bar = crank; HUD is
  Front / Back / Three-quarter / Crank / Sky + Inside + an "Exhibit" disclosure (case, Fragment A); hover
  label restyled (name in Marcellus, teeth and period in words, status as a small-caps tag); glossary
  titles on the ledger terms; loader progress and a label-voice failure message; the front-dial ledger
  collapsed; a Sources colophon; the moon disc drawn like the phase ball. Not done: pointer trails on the
  3D Mars stone (the Sky view covers it), URL state, drag-the-crank, tablet camera framing.
- 2026-09-13 (night) "The sky it tracks": `web/src/ui/cosmos.ts` draws the machine's own cosmos. Every
  planetary output is a pin-and-slot or pin-follower, i.e. the direction of q = a + r·u(t) from the slot
  axis, which is an epicycle on a deferent; each body is drawn at q, rotated so its direction equals the
  pointer's dial reading and scaled so the larger of |a| and r is its deferent radius. The mirror
  ambiguity does not matter: |q| is the same either way and the direction is forced. Trails are sampled
  from the gear graph (setYears backwards over 0.085–2.3 years per body, then restored), so Mars, Venus
  and Mercury show their real retrograde loops with the mechanism's own ratios (Mars e = 6.58/10 = 0.66,
  the Sun's equation of centre e = 1.375/32.7). Verdigris ticks are astronomy-engine truth. Shown small in
  the column and full size on the stage ("Sky" in the view segment).
- 2026-09-13 (night) The Sky view exposed a calibration gap: the pointers were set on the true longitude at
  the epoch, but each anomaly device (pin-and-slot, pin-follower) has a second degree of freedom, the
  pin's phase when the crank reads zero, which was the Blender zero, so Mars drifted up to ±40° within a
  synodic period. `web/src/astro/phases.ts` now turns each device's pin (su56, me20, r1, ma71, ju43, sa68;
  `GearGraph.setPhase`) to the phase minimising the RMS error of its pointer against astronomy-engine over
  ±1.5 cycles around the epoch (36 trial phases, then a refinement; the pointer is re-zeroed at the epoch
  for every trial), then re-applies the pointer calibration. Result at the Carman & Evans epoch: true Sun
  rms 0.3°, Saturn 1.2°, Jupiter 1.3°, Venus 1.8°, Mercury 4.9° (worst 12°), Mars 7.4° (worst 21°): the
  irreducible error of one epicycle against Mars's eccentric orbit, shown in "Against the real sky".
  The Moon's phase was already right by construction (pin at apogee at the epoch).
- 2026-09-13 (afternoon) Stewart: the vitrine is "stunning", keep it no matter what; the manuscript is a
  *separate version*, both preserved. Built as a theme in the same app so they never drift: `data-theme`
  on <html> (chosen before paint from `?theme=` or localStorage), a `[data-theme="manuscript"]` token block
  in style.css (parchment, iron-gall ink, red-ochre rubrics, gold leaf, verdigris ink; IM Fell English SC +
  Cardo; an SVG feTurbulence fibre on the page), `Viewer.setTheme` (a second PMREM "studio" environment with
  a north-light window, vellum wall texture, lighter floor/plinth/case wood, lower spot, exposure 1.0,
  vignette 0.2, bloom 0.32) and ink palettes in the Sky view, the moon disc (hatched) and the chart.
  The vitrine path is untouched: `setTheme("vitrine")` restores exactly the constructor values.
- 2026-09-13 (late afternoon) Stewart: the manuscript "turned out to be the better one, almost perfect"; push it.
  The stage is now a plate in the codex: the two canvases sit in a `.plate` wrapper (both versions;
  the vitrine draws nothing on it), the manuscript sets it in from the page inside a double rule
  (outline + box-shadow rings) and captions it underneath from `main.ts caption()`: a plate number in
  HUD order (Front I, Back II, Three-quarter III, Crank IV, Sky V; pin-and-slot VI, top VII, Fragment A
  VIII), how the machine is seen, its state ("opened", "the Mars train alone") and the date its pointers
  are set to, refreshed at the column's 4 Hz. The walkthrough card numbers its leaves in lower-case
  roman and opens each with a red-ochre versal (`::first-letter`); sections in the column are parted by
  a hedera (U+2766, the ivy leaf of Greek and Roman inscriptions) instead of a rule; every box is square.
  The front plate's "tarnish" on parchment turned out to be the *albedo* map (mean 0.78/0.55/0.28, a
  ±25 % mottle), not the roughness map: a `mapMix` uniform in the PlateBronze shader now blends each
  texel toward the map's mean (0.35 in the manuscript, 1.0 in the vitrine), with colour ×0.98 instead of
  ×0.72 and roughness 1.05 instead of 1.35. The no-AO material clones keep the shader hook now (the AO
  block is behind USE_COLOR anyway) so the plate meshes without a bake get the same blend. The vellum
  wall is a 1024 px canvas with per-pixel noise and 700 short fibres, so it no longer reads as a CG
  gradient. Motion: (1) the **overture** on load, `Viewer.assemble()`: the plates, dials and case start
  lifted (the Inside state, unanimated), every gear node is pushed out along Z by 2.8× its world depth
  (a wheel on a carrier gets the difference from its carrier's push), and slides home with an ease-out
  quint over 1.7 s after a delay of up to 0.95 s proportional to depth, so the stack builds outward from
  the main wheel; the camera starts side-on (3.3, 1.15, 0.45 × the iso preset) where the spread along
  the arbors shows and dollies in over 3.8 s; `onAssembled` hands back to main.ts, which closes the
  plates (the reveal reversed, 1.1 s) and then shows the invitation or starts the crank at a month a
  second 1.6 s later. Skipped under prefers-reduced-motion. (2) **Drag the crank**: hovering any part of
  a1 (knob, arm, axle, even through the case board) shows "drag the handle to wind it" and a grab cursor;
  pointerdown takes the pointer's angle about the crank's projected centre and each move turns the
  machine by Δangle/2π/(223/48) years, sign from which side of the crank the camera is; OrbitControls are
  off for the drag and winding by hand stops the motor. Verified in the browser: two turns of the handle
  = 0.4305 years exactly. Testing gotcha: with the Browser pane hidden, requestAnimationFrame is
  throttled and `Vector3.project(camera)` reads stale matrices; a test must call `viewer.render()`
  itself between moves, or its screen angles and the viewer's disagree; time-based tweens (the
  overture, the reveal) simply stall until something wakes the tab, so drive `render()` on an interval
  to verify a sequence (measured that way: model 2.0 s, wheels home 3.6 s, plates closed 5.0 s, crank
  running 5.1 s).
  (3) **Taken apart** (Exhibit ▾): the same spread as a state. `Viewer.setApart(on)` tweens every
  wheel's push fraction between 0 and 1 (outermost first going out, innermost first coming home,
  ease-out quint, 1.7 s + up to 0.95 s of stagger), implies Inside, and the machine keeps turning
  while apart because only `position.z` is offset and the gear graph only writes rotations (and
  `position.x` for the spiral pins). The overture is now just `setApart(true, false)` then
  `setApart(false)`; `onAssembled` fires after any slide home, and main.ts only runs the
  invitation-or-crank logic the first time (`overtureDone`). The caption says ", taken apart".
- 2026-09-13 (evening) Stewart, on the walkthrough's planets step: "this scene is broken, it spins
  around the centre axis and the shadows of the dials in the background make the geometry look weird".
  Two causes. (1) The step isolated the Mars train and ran at a year per second, and the Mars module
  rides on b1, which therefore wheeled round once a second. The step now watches the dial itself
  (plates on, front-close, four months a second: b1 turns in three seconds, Mars's loop every six)
  and the text says to watch the red stone. (2) Ghosted gears (13 % opacity) and lifting plates
  still cast full shadows, so the isolated train received the sweeping shadows of parts that were
  all but invisible; `isolate()` now turns `castShadow` off on every ghost and the reveal turns it off
  on lifted plates (back on when they close). Stewart also asked for "a view where it shows the
  original rusted metal they found and then the X-ray view showing the gears inside": two leaves
  after the welcome, "What the divers found" (Fragment A's CT scan alone, opacity 1, reusing the
  unused `discovery` narration) and "Seeing inside the corrosion" (the scan at 0.45 over the model
  with the plates lifted, crank at a month a second; new `xray` clip, 24 s), plus "The sky it tracks"
  after the planets (the Sky view on the stage, trails at four months a second; new `sky` clip,
  28 s). New step hooks `fragment(opacity)` and `sky(on)`; `showFragment()` in main.ts drives the
  Exhibit slider too; the manuscript caption distinguishes the scan alone from the scan over the
  model. Fourteen leaves now.
- 2026-09-13 (evening) Backlog batch. **URL state**: `?epoch=&years=&view=&inside=1&apart=1&sky=1`
  (with `?theme=`) written by `writeUrl()` (300 ms debounce; while the crank runs nothing is written,
  the stop writes once) and read by `readUrl()` in `onAssembled` after the overture; a link with state
  shows that state and neither the invitation nor the auto-crank runs. Gotcha found on the first try:
  `applyVisibility()` and `update()` write the URL during loading, which wiped the linked params before
  they were read, so the writer is a no-op until `overtureDone`. **Eclipse beat**: when a Saros glyph
  cell comes round and NASA's canon agrees (`glyphHit`: a non-penumbral lunar eclipse within ±1.6 d of
  the cell's full moon, or any solar within ±1.6 d of its new moon), `Viewer.eclipseBeat()` dips the key,
  the back key and the environment (×0.2, ×0.2, ×0.4 at the trough, sin^1.4 over 1.8 s) and the chime
  plays; both are gated to speeds of a month a second or slower, or a jump, so ten years a second is
  not a strobe. `lightBase` is captured at the end of `setTheme`. **Narrow stages** keep the horizontal
  view of a 6:5 stage (`resize()` widens the vertical fov, capped at 72°) so a portrait phone is not
  cut off, and below 900 px the top bar stacks (title and date, then the actions). **Inspector**: gears that are `hypothesised`/`derived` are set in italic ink-faint with a
  title, `surviving` upright (30 survive, 38 hypothesised, 1 derived). **Manuscript plinth** is oak
  (0x6b5238 / 0x7d6144) by day, a scholar's table under the case.
- 2026-09-13 (evening) The opened back in the manuscript read as rust. Tried in the live scene: AO
  strength 0.15 (no change), GTAO off (no change), the back key at 2.6 (no change), a second window
  behind in the studio environment (barely). The cause was the back key's direction: it rakes the
  spirals from the left for the vitrine's engraving, and on the bare gears from behind that is a
  grazing angle, so they showed only their albedo through a dim, blurry reflection. By day the back
  key now comes from behind (−200, 260, −560) at 1.9 and the opened back is gold; the vitrine keeps
  the rake. The second window behind stays (harmless). Also: the accuracy chart's Chart.js legend is
  gone; a `.chart-legend` line of swatches under the chart is written by `drawErrorChart`, in the
  column's own voice. The manuscript's Sky trails are pen strokes now: the line width wanders by a
  little (two slow sines on the sample index, plus a slight thickening toward the present).
- 2026-09-13 (evening) Per-leaf lighting in the walkthrough. `Viewer.setMood("room" | "spot")` tweens
  a multiplier on the environment, the key and the back key (spot: 0.42 / 1.15 / 0.9, 0.9 s ease-out);
  `stepLights()` now owns all three intensities every frame as base × mood × beat, so the eclipse
  beat and the mood compose, and `setTheme` marks the lights unsettled so the mood is re-applied over
  the new base. Leaves that drop the room: "What the divers found", "Seeing inside the corrosion",
  "The pin and slot"; the crank, back-dials, welcome and explore leaves bring it back; closing the
  walkthrough keeps the scene but restores the room (`onDone`), and `reset` does too. The explore
  leaf now names Taken apart, the crank drag and the crank & chime box (a critique leftover: the
  sounds were found by accident).
- 2026-09-13 (night) Down the backlog. **Fragment A alignment**: with b1 isolated and the scan at
  50 % from 175 mm straight on, the scan's spokes lie diagonally across b1's cross at rotation 0;
  turned −45° about the axis (`FRAGMENT_POSE.rotation = [0, π/2, −π/4]`) they fall under b1's spokes
  at the epoch, and the scan's rim follows b1's rim on the left. +45° put dark bars across the
  spokes. Judged from screenshots at a few hundred pixels; the position is untouched. **Retrograde
  strip** (`Cosmos.drawStrip`, `#retro` under the Sky panel): each body's trail as longitude against
  time, 0–360° up the strip with the twelve signs as bands, the longest span (Mars, 2.3 yr) across
  the width, the pen lifted at the 360° wrap, the present at the right edge with a dot per body.
  **Parapegma row** in the front-dial ledger: the 24 attested lines (Bitsakis & Jones 2016) with
  English glosses in main.ts; the index letters sit at 2.2° and 17.2° into each sign as the texture
  draws them (schematic), so the row names the letter under the mean-Sun pointer within ±0.6° (the
  row goes accent-coloured) or the next letter ahead and how far. **Performance**: `?fps=1` shows
  fps, median and worst frame of the last 60 (this machine: 120 fps, 8.4 ms median); the bloom pass is
  skipped when the camera is behind the machine with the plates on and nothing taken apart, since
  every glowing part is on the front (`glowVisible`). Not done: merging static meshes (an export
  job), the 3D lit moon.
- 2026-09-13 (late) Stewart: go ahead on the HDRI; Table S3 authorised; touch works on a real
  device; the walkthrough card takes too much of the viewport; the Sky leaf should scroll the whole
  Sky panel into view. **Lighting phase d**: two Poly Haven HDRIs (CC0, 1k, ~1.7 MB each) in
  `web/public/hdri/`: `studio_small_09` (a small dark photo studio with softboxes) for the vitrine,
  `artist_workshop` (big windows, warm wood) for the manuscript, loaded with RGBELoader and turned into
  the environment with `PMREMGenerator.fromEquirectangular`; the hand-built rooms stand in until the
  file arrives and stay as the fallback (`?hdri=0` keeps them). Each is rotated so its main source
  sits front-left (0.6 rad / 2.4 rad) and scaled to the old exposure (0.7 / 1.05). Judged at full
  size: the vitrine's HDRI lifts the case wood and the plinth out of the black without losing the
  plate's glow (Stewart had called the vitrine "very dark"); the manuscript's needed 1.05 to match
  the hand-built brightness. `lightBase.env` follows the HDRI so the beat and moods compose.
  **Walkthrough card**: wider and lower (760 px, 14.5 px body, 82ch), and foldable: the "–" button
  folds it to one line at the foot of the stage (leaf, title, back/next) while the narration and the
  scene go on; remembered in `am_tour_folded`. **Focus**: a whole panel now scrolls to its top
  (`block: "start"`), a row to the centre, so the Sky leaf shows diagram, legend and strip together.
  **Parity**: the two versions are the same app with the same leaves and controls; only the frame,
  caption, hederae and inks differ. Stewart still finds the manuscript easier to see and the vitrine
  "cooler"; both stay. His "gaps in the geometry" by day: measured, the plates (x ±87, y −170..150)
  sit 10 mm inside the case (inner faces x ±81, y −171..151, z −49..41), so the boards' lit inner faces
  frame each dial; in pale oak that frame read as gaps. `Viewer.lineCase()` adds four thin dark boards
  0.3 mm inside the case (role "case", so Inside, the case box and the overture treat them as boards).
  **Table S3** (done by an Opus sub-agent, ~140k tokens): `tools/gen_dial_textures.py` carries
  `OBSERVED_HOURS` (the 15 surviving cells, a copy of eym.ts's table); those cells are cut solid with
  their real hours (two-event cells as "ΣωρΒ ΗΓ  Ε", the second event without "ωρ" to fit the cell),
  every other glyph cell keeps its schematic hour in a fainter ink (`INK_FAINT`, 45 % toward the
  plate, and a shallower cut on the bump). `blender/export_glb.py` now reloads every file image
  before exporting, so a texture change needs only gen_dial_textures → export_glb → the three
  gltf-transform steps (no build_all/dials/surface): web/public/models/antikythera.glb is 9.80 MiB.
- 2026-09-13 (late night) The rest of the backlog. **Hero renders** re-done (`blender/hero_render.py`,
  95 s for five views at 256 samples): the world is now the same Poly Haven studio HDRI the web vitrine is lit
  by, the 2k file in `assets/raw/hdri` (gitignored, CC0) with the 1k copy in `web/public/hdri` as the
  fallback, kept out of the frame by a Light Path "Is Camera Ray" mix so the camera still sees the dark room.
  This model stands +Y up inside Blender's Z-up world, so the equirect is turned a quarter turn about X and
  then about the studio's own zenith by the angle that puts its brightest patch (the mean of 32x64-pixel
  blocks, a softbox rather than a hot pixel; Blender's equirect has u = 0.5 - atan2(y, x) / 2pi) high and
  front-left, where the web key is. The three-light rig stays. The pin-and-slot view, seen from inside with
  the plates stripped, is flooded by the studio and was rendered at `HDRI_STRENGTH=0.5`. **Pointer trails**
  (`web/src/scene/trails.ts`): a long exposure of the stones. While the crank runs, the Sun ball and the five
  planet stones each leave a ribbon on their own plane (a flat strip 1.1 mm wide with four-component vertex
  colours, so the alpha fades and the width tapers toward the tail) holding the last 0.55 s of wall time, so
  at ten years a second the Sun is a full ring, Saturn a short arc, and Mars doubles back on itself. The
  samples are taken from the gear graph in sub-steps between frames (no more than 10 deg of the fastest body
  per sample, at most 32 sub-steps, the graph put back afterwards), so nothing aliases into chords; a jump of
  more than 1.5 years or a sleeping tab starts the trails again. The Moon's ball sits 6.5 mm from the hub and
  gets no trail. The ribbon meshes carry `isLine = true` so GTAOPass leaves them out of its depth and normal
  passes (it hides lines and points there), or they would draw an occlusion band under themselves; in the
  bloom pass they wear a dimmer copy of their own colour. Cost at ten years a second, front-close, 1.5 dpr:
  10.2 -> 12.3 ms median; nothing at rest (the trails fade and the meshes go invisible). `?trails=0`. **The
  Moon panel** (`web/src/ui/moon.ts`) is a lit sphere now: the near side's albedo from NASA's LROC colour
  mosaic (CGI Moon Kit, public domain, 1k, `web/public/textures/moon_1k.jpg`; north up, lunar east right),
  shaded per pixel on the 2-D canvas at device resolution with the Lommel-Seeliger law (flat to the limb at
  full, brightest at the limb at quarter) and 3.5 % earthshine, the light from the machine's elongation
  (0 new, 90 first quarter lit on the right). The manuscript draws the same tone field as an engraving:
  cross-hatch below 0.11, a single hatch below 0.26, a stipple on the maria below 0.4, parchment above, with
  a small ordered dither so the steps do not band. The old discs stand in until the map has loaded, and
  `litPolygon` (tested) is kept for them. **The accuracy chart** sampled every 5 days, which aliased the
  Moon's monthly wobble into moire; it now samples daily (about 450 ms for 80 years, computed once per epoch
  in an idle callback after the first paint) and folds each year into least and most, drawn as three bands
  (Moon with the pin-and-slot, Moon mean-only, Sun), so the drift and the size of the wobble read at once.
  Monthly windows were tried first and looked like a saw at 990 windows across 260 px. **The manuscript's
  top bar** is a running head now: no boxes, the actions in the rubric face parted by hederae, the version in
  hand underlined in red ochre, and every manuscript checkbox a small square drawn in ink (the OS widget was
  the last web thing on the page). **Merging static meshes: measured and not done.** The web scene has 142
  meshes and draws 1053 calls a frame from the front (895 from the back; 1.13 M triangles), seven passes over
  the same meshes (beauty, GTAO depth and normals, two shadow maps, bloom). Only the six b1 pillars and the
  front and sub plates share a material, a parent and a reveal direction; the four case boards part in four
  directions, the nine tubes belong to different arbors and travel with their wheels when taken apart, and
  everything else is a gear or a pointer. Merging the eight would save about 50 calls, 5 %, for a 10 MB model
  churn; the frame is fill-bound (GTAO and bloom at full resolution), not call-bound. Left as is.
