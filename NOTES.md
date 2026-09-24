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
- 2026-09-12 Schematic (not attested) content: most of the parapegma's Greek phrasing, Saros glyph
  hours outside the 15 surviving cells (Freeth 2014 Table S3), the Games dial 4th year (Halieia),
  Callippic dial existence. (The parapegma index letters and their positions were schematic until
  2026-09-17; they now follow Bitsakis and Jones 2016, see that entry.)
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

- 2026-09-17 **Version 1.0, the finishing run.** Fable 5.1 coordinated Opus subagents through the
  superpowers subagent-driven-development loop (plan `docs/plans/2026-09-17-final.md`; one implementer at
  a time, a task review after each, a scoped re-review after each fix round, a whole-branch review at
  the end), all on branch `v1`, merged into main at the close. What landed, and the decisions taken:
  **Launch metadata**: description, Open Graph and Twitter cards, `web/public/manifest.webmanifest`,
  icons and the share image drawn by `tools/gen_icons.py` from the favicon motif and the hero render
  (the crop rule `OG_FOCUS` only bites on a source wider than 1200 px after scaling; the 1920x1200 hero
  has no horizontal slack); `theme-color` follows the version (lamp-black `#17120e`, parchment `#efe6d3`,
  hex literals in index.html, main.ts and the manifest, not tied to the OKLCH tokens in style.css);
  three's deprecated `RGBELoader` swapped for `HDRLoader`; the last em dashes removed everywhere (the
  narration transcripts too; the audio is unchanged). **Click a gear**: `Viewer.onSelect` fires on a
  press that moved under 6 CSS px (`CLICK_SLOP`) and released over the same gear; the pick now runs
  synchronously on pointerdown (`pickNow`) so a touch tap, and the crank on touch, have a hovered id;
  main.ts routes the selection through the inspector row's own click so the column and the scene
  never disagree; `trainFor` names the first train listing a gear (fix56 reads as True Sun, ju64 as
  Mars). **Save this view**: `Viewer.snapshot()` raises the pixel ratio to min(3, 2x), which must also
  be handed to both EffectComposers (they cache the ratio at construction), renders once, issues
  `toBlob` synchronously and restores in the same task; the button's title says "larger than the
  screen" because at dpr 2 the cap makes it 1.5x, not 2x; the Sky view saves its own 2-D canvas.
  **today and Share**: today is `civilToJdn` of the UTC date (2026-09-17 = JDN 2461301, 2230.36 years
  after the epoch; the Sun then reads 2.7 deg off and the Moon 117 deg, the Metonic cycle's two hours
  per nineteen years made visible); `stateUrl()` is the one builder of the address and Share copies
  it (prompt fallback when the clipboard is unavailable); the explore clip was re-narrated (`tour_explore`,
  31.7 s). Gotcha: `tools/narration.py` writes `duration: null` for clips it does not regenerate; the
  app never reads `duration`, so the two values were put back by hand and the script left alone.
  **Resilience**: `webglcontextlost` shows a label and the machine draws again on restore (three
  rebuilds its own state; one `render()` is enough, verified with `WEBGL_lose_context`); a browser
  without WebGL (`?webgl=0` to test) shows `web/public/still/iso.jpg` under a scrim, and the module
  stops, so the column and the version switch are inert there. **Offline**: `web/public/sw.js`
  (registered only in production builds) keeps the page network-first with an offline fallback stored
  under the path alone (the app's state lives in the query string), Vite's hashed bundles cache-first,
  and models, HDRIs, textures, data, icons and the still stale-while-revalidate; `/audio/` is never
  intercepted (Range requests). Deploy rule: bump `CACHE` in sw.js whenever the GLB or a texture
  changes, or a fresh bundle can meet the previous model for one visit; old hashed bundles accumulate
  until the name is bumped. **Quality tiers**: `Viewer.setQualityTier(0|1|2)` (1 drops bloom and DoF,
  2 also GTAO, 1024 shadow maps and one pixel per pixel, the cap handed to the composers too); the
  guard measures 90 frames, may escalate once more after another 90, and stands down under
  `?quality=high|medium|low`. **The parapegma as Bitsakis and Jones 2016 read it** (Almagest 7.1,
  open access at NYU's archive; the verified digest that drove the change is
  `docs/research/parapegma-bitsakis-jones-2016.md`, and the run's ledger with every ruling is
  `docs/plans/2026-09-17-final-ledger.md`): two alphabetic sequences, one per plate, four columns of a season each running clockwise;
  a letter stands immediately clockwise of a graduation mark and graduation 1 is the sign boundary, so
  the degree into the sign is the graduation less one; 13 letters read on the bronze of Fragment C
  (Virgo 19 and 21, Libra 1, 11, 14, 16, Scorpio 1, 4, 17, 22, Sagittarius 1, 3, 7), 6 from the numerals
  after the parapegma lines (Aries 21, Taurus 1, 11, 17, 25, Gemini 10; the paper's Greek reads KA for
  Aries lambda where its English says 24, KA was taken), 5 restored at sign boundaries (Capricorn alpha,
  Aries iota, Gemini pi, Cancer mu, Leo pi), 18 lost and not drawn; solid ink for the 13, faint for the
  11, in `web/src/astro/parapegma.ts` (with `parapegmaAt`, tested) and the same table in
  `tools/gen_dial_textures.py`; the plates carry the four columns with the editors' brackets for
  restored names and a rule for lost lines, the Greek phrasing still reconstructed; the model was
  re-exported headless (`blender.exe -b build/antikythera.blend --python blender/export_glb.py`,
  exit 0, GLB 9.80 to 9.85 MiB) since Blender's socket was not open. Left as it was: the one attested
  numeral (11) in PP1 col. i is not drawn because the paper cannot say which line carries it; the
  0.6 deg "on the letter" window does not wrap past 360. **Narrow widths**: the manuscript running
  head overran the title between 900 and 1200 px once Share joined it, and the title ran under the
  date on a phone; the fixes live in two media blocks appended at the end of style.css because the
  existing blocks precede the manuscript section and a media query adds no specificity, which also
  explained three manuscript phone rules that had been dead since the manuscript was built (moved).
  Browser-pane testing gotchas: with the pane hidden, requestAnimationFrame and timers are
  throttled, so drive `window.__viewer.render()` from `javascript_tool` in loops under 30 iterations;
  pin the camera first (`__viewer.view("front")`, `controls.autoRotate = false`) or the idle orbit
  moves the target between screenshot and click; the pane's drag tool reports "page navigated"
  because the app rewrites the address with replaceState; synthetic PointerEvents with a made-up
  pointerId make OrbitControls throw a harmless NotFoundError.
- 2026-09-18 Stewart: the walkthrough ran too fast to make sense of the Moon's phases or the Sky chart. Every leaf that
  turned the crank at a year a second (crank, back dials) or four months a second (planets, sky) now runs at a
  month a second, the speed the Moon leaf already used; the planets leaf's text says so. Free exploration keeps
  a year a second as the default.
- 2026-09-18 **Version 1.0 called, and the project page written.** The last of the finishing run's
  deferred minors were cleared, so the backlog in NEXT_STEPS.md is now only taste calls and things
  deliberately left: `trainsFor` names every train a shared wheel turns in (the fixed 56 under the
  Sun and the three outer planets used to call itself True Sun, and the 64 named for Jupiter called
  itself Mars), the parapegma's 0.6 deg window is measured round the circle so 359.8 deg stands on
  iota, a context restored mid-download puts the progress line back instead of leaving the reset
  notice up, `tools/narration.py` carries over the durations of clips it does not regenerate, and a
  test in `web/src/ui/theme.test.ts` holds the two browser-chrome hexes together across index.html,
  the manifest and main.ts (they cannot be the OKLCH tokens: the colour is read before any
  stylesheet is in hand). Two earlier items were already done in the finishing run and are struck:
  the Share button carries `aria-live="polite"` and its label changes, and the "twice the screen"
  comments were corrected. **The three-quarter view was framed too tight**: at fov 38 the iso preset
  stood 561 mm out and the case filled the frame exactly, so the top corner and the plinth were
  shaved off at every stage wider than 6:5. The preset is now 1.18x further out, [354, -260, 496].
  Caught by screenshotting the app at 1600x1000 for the README, which is an argument for taking the
  pictures. **The project page** is `docs/index.html`, served by GitHub Pages from the `docs` folder
  (with `.nojekyll`): the exhibit's own palette and type, the hero render, the eight screenshots in
  `docs/screens/`, the ledger of counts, how it is built, how the numbers are checked, and the
  sources. One CSS trap worth remembering: `.hero { padding: 40px 0 8px }` reset `.wrap`'s side
  gutter to zero through the shorthand, so the hero ran to the edge on a phone; it is written as
  `padding-top`/`padding-bottom` now. The screenshots were taken with Playwright against the dev
  server, pinning the camera first (`__viewer.view(name, 0)`, `controls.autoRotate = false`,
  `lastInput = performance.now()`) because the idle orbit starts after twelve seconds and had
  wandered the camera inside the case in the first attempts.
- 2026-09-18 Stewart: the walkthrough could not be moved on because the leaf's text ran off the
  screen with nothing to scroll. The card is `position: absolute; bottom: 22px` in the stage with no
  cap on its height, so on a short window it grew upward, up behind the top bar, and the stage's
  clipping took the title and the first lines with it. Reproduced by walking all fourteen leaves at
  a set of sizes: fine at 1366x768 and 1280x620, but at 844x390 (a phone on its side, and about what
  a short window or a browser pane gives) twelve of the fourteen were cut, the Explore leaf by 81 px,
  and in the manuscript at that size every one of them. The card now caps at the stage,
  `max-height: calc(100% - var(--onboard-bottom) - 16px)`, and is a flex column so the head, the
  foot and the progress rule hold their places while `.onboard-body` scrolls (thin scrollbar,
  `scrollbar-gutter: stable` so the prose does not shift between leaves, `overscroll-behavior:
  contain` so the page behind does not move). `--onboard-bottom` carries the offset the narrow and
  manuscript blocks already set, so each keeps its own. Folded mode is untouched, and nothing
  changes on a window tall enough to have shown the whole card before.
- 2026-09-18 Stewart, on the Games dial at walkthrough leaf 9: "the dial on the right seems flipped,
  it's rotating around the pointy end." He was right, and it was four pointers, not one. **What the
  optimiser did:** `gltf-transform optimize` packs mesh positions into a quantized range and makes up
  for it with a transform on the node carrying the mesh, so the mesh comes out centred on its own
  origin and the node moves to where that centre belongs. A node with children cannot take the
  compensation and is given a child to carry it instead. The Metonic and Saros pointers have follower
  pins, the planet rings have stones, the Moon has its disc: those kept their pivots on the arbor. The
  date, Games, Callippic and Exeligmos pointers have no children, so their own translations were
  overwritten: `ptr_date` sat 33.6 mm off b1's axis, the three small ones 4 mm off theirs. The machine
  writes each pointer's assembly offset onto exactly those nodes, so the offset swung the pointer
  bodily round the arbor instead of turning it on the arbor: the body lay at bearing φ while pointing
  along φ+θ. At this epoch the Games and Callippic offsets are both a half turn (the epoch falls in
  games year 3 and Callippic quarter 2), which put the tip 1.8 mm the wrong side of the arbor and the
  blunt hub out at the 9.5 mm rim, exactly as Stewart described. Exeligmos escaped notice only because
  its offset is zero at this epoch; at another epoch it would have gone the same way.
  **The mend** is `web/src/mech/pivots.ts`, called on the loaded scene before `GearGraph` reads
  `am_pointer`: each displaced pointer is hung under a new pivot on the arbor, keeps its offset as its
  own translation, and the pivot inherits `am_pointer`, which is Blender's arrangement restored. Done
  at load rather than in the export because the optimiser will do it again to any pointer that loses
  its last child. Five tests in `pivots.test.ts` hold the geometry, including that the total angle up
  the chain is unchanged. **Nothing the exhibit reports was ever wrong**: `reading()` sums rotation.z
  up the chain and that sum was already right. Checked by reading all ten displays at 3 years from the
  deployed build and the mended one: identical to four decimals. Only the drawing was wrong.
- 2026-09-18 Stewart, on the case: "the wooden box is like a two way mirror, on the outside it's
  textured but from the inside it looks like there's no wall there." The boards are solid and
  double-sided, so nothing was missing; what he was seeing was `lineCase`'s lining. The boards' inner
  faces take the box unwrap's narrow 9 mm strip of u across their 90 mm of depth, so the grain smears
  into vertical streaks, and the lining was added (2026-09-13) to cover that with a dark panel. Flat,
  untextured and near-black in the vitrine, the panel read as a hole. The lining is now the wood's own
  material cloned and taken to half its light, with the plane's UVs scaled to the boards' own 120 mm
  to the UV unit, so the grain runs on at the right size and follows the theme through `tuneLining`.
  The deeper fix, giving the case boards a proper box unwrap in `box_bm`, would want a Blender rebuild
  and is in NEXT_STEPS.
- 2026-09-20: **the case boards got a real box unwrap, and the lining went.** The deeper fix left in
  NEXT_STEPS on 2026-09-18. `box_bm` in `blender/dials.py` projected x for u on every face, which is
  right for a thin plate lying in the xy plane and wrong for a board standing on edge: `case_left` and
  `case_right` are 9 mm thick in x, so their broad faces took a 9 mm strip of u across 340 mm of
  height and the grain smeared into vertical streaks. It now picks, per face, the two axes the face
  actually spans, which is the same rule `surface.py`'s `box_uvs` already used for meshes arriving
  without UVs; the span stays the boards' own 120 mm, so the outside is pixel for pixel what it was.
  Only faces whose normal is dominantly x change. Rebuilt headless in two invocations, no Blender
  session and no MCP: `blender -b --factory-startup --python blender/build_all.py -- --out build`,
  then `blender -b build/antikythera.blend --python blender/dials.py --python blender/surface.py
  --python blender/export_glb.py` (Blender takes several `--python` flags and runs them in order,
  which is the headless equivalent of the socket's one long session). The AO bake fell back to the
  CPU, the Intel Arc driver being older than oneAPI wants, and still finished inside three minutes.
  **The rebuild is faithful:** the rig verified at 69 gears and a worst error of 5.3e-05 rad, and
  `dist/gears.json` came out byte for byte the file already deployed. `case_left`'s UVs now run
  -1.000..1.833 in u and -0.833..2.000 in v where they used to be a line. The optimiser displaced
  exactly the four childless pointers again (date, Games, Callippic, Exeligmos) and `pivots.ts` mended
  all four at load, as it was written to; all fourteen displays at three years read identical to six
  decimals against the deployed build. **The lining is gone**: `lineCase` and `tuneLining` are removed
  from `web/src/scene/viewer.ts` with the four planes and the cloned material, because the boards'
  own inner faces now carry the grain at the right scale and the baked AO keeps the inside of the box
  darker than the outside. Checked in both versions at the front, close to the dial and from inside
  the case; the manuscript's pale oak was where the old panel read as a hole, and it reads as a wall
  now. `CACHE` bumped to `antikythera-v2`.
- 2026-09-20: the project page now links the plan and the ledger from "How it is built". Pages serves
  the whole `docs` folder, so `docs/plans/` was already public; linking it makes that a decision
  rather than an accident. Read them first for anything private: there is nothing in them but the
  work, and the only key they mention is `ELEVENLABS_API_KEY` by name, never its value.
- 2026-09-20 Stewart, two asks: the long exposure on the Sky stage, and "on the lighter version can
  we have the moon still look like the moon like the dark version".
  **The Moon in the manuscript** was an engraving: the photograph thresholded into cross-hatching on
  the night side, a stipple on the maria, bare parchment on the highlands. It is the same photograph
  now, taken through the page's inks instead: a sepia duotone (`SEPIA` in `web/src/ui/moon.ts`) from
  iron-gall brown to parchment-white, with the map's own greys deciding everything between, so the
  craters and the maria are the LROC mosaic's and not a pattern. Two things had to be got right.
  **Contrast**: the first pass boosted the albedo and lifted the gamma, which clipped the highlands
  and left the maria pale, a flat biscuit disc; `grey * shade * 1.45` with no lift separates them.
  **The night side**: against the vitrine's black panel an unlit limb simply disappears, but the same
  ink on cream is a mud-coloured disc, and a twelve-per-cent crescent read as a full Moon with a
  bright edge. The night side is washed thin instead (alpha `0.2 + 0.8 * lit^0.45`), so the page shows
  through it and a crescent is a crescent. Checked at full, gibbous, quarter and a thin crescent. The
  vitrine is untouched.
  **The long exposure** (`long exposure` in the stage bar, on the Sky stage only, `?expose=1`, carried
  by Share): the trails keep their whole history instead of the last `span`, so the figure each body
  makes draws itself. Venus's eight-year pentagram, Mars's chain of retrograde loops, Saturn's
  rosette. Three things came out of building it, and two of them were bugs that were already shipped:
  - **The trails were being rebuilt from scratch sixty times a second.** `tick` called any move of
    more than 0.05 years a jump, and a frame at ten years a second is 0.167 years, so every frame at
    the top speed threw all seven trails away and re-sampled them, about a thousand evaluations of
    the gear graph per frame. `tick` now takes a `continuous` flag, which `main.ts` sets from
    `playing || viewer.cranking`, because only the caller knows whether the crank is turning or the
    visitor jumped. Measured: tick 5.78 ms -> 0.45 ms a frame at that speed. Then the sub-stepping
    below put some of it back deliberately, to 1.38 ms, and the whole Sky stage is still cheaper than
    it was.
  - **A tight continuity ceiling fails silently on a slow machine.** With the ceiling at 2 years a
    frame, anything under 5 fps read as a jump every frame and the exposure quietly accumulated
    nothing. It is 25 now, so a slow machine gets a coarse exposure rather than none.
  - **The sub-step cap was too mean.** Drawing frame to frame joins a body to itself by chords across
    its own circle (a sixth of a year is 240 degrees of Mercury), so `advance` walks the machine
    between frames as `trails.ts` does. At 32 steps a slow frame put Mars across the sky in straight
    lines; a sub-step costs about a hundredth of a millisecond and the work per year of crank is the
    same whatever the cap, so it is 128, which also took the Sun's ring from a visible polygon to a
    circle at ordinary speeds.
  **What it cost and what bounds it.** Memory is bounded by thinning: at `EXPOSURE_CAP` = 3000 samples
  a trail drops every other sample and doubles its step, so an exposure runs as long as you like at a
  resolution that falls off slowly (600 years still sits at ~1800 samples). Drawing thousands of
  segments one `stroke()` at a time is 1 fps, so everything older than the last span is one path at
  one faint weight and only the head keeps the per-segment fade; each sample also carries its own
  cosine and sine, since the trigonometry was most of the redraw. Measured at 120 years, both canvases:
  tick 1.45 ms, draw 5.26 ms a frame, against 1.38 and 3.39 with the exposure shut.
  **The Moon is never held open** (`hold: false`). It goes round twelve times a year, so as the
  thinning coarsens its step the chords cut across its own circle and a century of it is a spiked star
  through the middle of the diagram: an artefact of the sampling that says something false about where
  the Moon goes. Its month-long loop is still there at rest, which is where it means anything.
  The retrograde strip skips samples older than its own width, or an open exposure would draw outside
  its box. `window.__cosmos` is exposed alongside `__viewer`, which is how all of the above was timed.
- 2026-09-21: **the sky's libration on the Moon face** (`the sky's libration` under the Moon, `?lib=1`,
  carried by Share). The last buildable line of the backlog. The machine's phase ball shows one face
  always, so this is the sky's, not the machine's, and the panel says so twice: the box is named for
  the sky, and the foot says the face is turned to where the real Moon stood that day under the
  machine's light. The light, the terminator and every number above the new row stay the machine's;
  only which part of the map falls on the disc changes. `moonLibration` in `web/src/astro/truth.ts`
  takes the sub-Earth point from astronomy-engine's `Libration` (Meeus ch. 53, through `timeFromJd`,
  so no JS `Date` ever touches a BC date); `selenographic` in `web/src/ui/moon.ts` tilts the view by
  the latitude and turns it by the longitude before the map lookup, and three tests hold it (no
  libration is the mean face, the disc's centre lands on the sub-Earth point, the limbs move the
  right way). The position angle of the axis is left out: the Moon is drawn north up, as its
  terminator already is. Checked by eye at the extremes (7.9 W 6.7 S against 7.9 E 6.7 N): Mare
  Crisium sits on the limb in one and well inside it in the other. **Cost**: the map lookup is now
  cached per libration to a tenth of a degree (under a texel of the 1k map); a draw is 1.07 ms with
  the face still and 2.45 ms when the libration changes every call, and the panel only redraws four
  times a second while the crank turns. Off by default, because the panel's first job is to show
  the machine's Moon.
- 2026-09-23: **the review before calling it final** (Opus 5.5, with three read-only reviewers:
  code, the historical claims, performance and accessibility). What was wrong, and is fixed:
  **The copy claimed more than the sources.** The Moon leaf said "five gears" and listed six (three
  meshing pairs, 64/38 x 48/24 x 127/32); the X-ray machine was eight tonnes, not twelve; the Games
  gloss named Delphi (a place) for the Pythia and left out the Naa and the Halieia that the dial model
  already had; the welcome said every tooth count was read from the scans when 39 of the 69 gears
  are the 2021 model's and most surviving counts are estimated from broken rims; only Venus's 462
  and Saturn's 442 are read on the cover inscription; the loops are an epicycle's, which Ptolemy
  refined, not Ptolemy's; the month names are a Corinthian-family calendar, probably Epirus, not a
  dialect; the solar hits count an eclipse anywhere on Earth; Voulgaris et al. is Almagest 14.1
  (2023). Added: Stais in 1902 and the 82 fragments, the epoch is not the date it was made (wreck
  c. 70-60 BC), the 2024 recount of the calendar ring's holes points to 354 not 365 (the ring is still
  drawn with 365 as Freeth 2021 has it, and says so), and the 2025 argument (Szigety and Arenas, a
  preprint) that teeth as uneven as the measured ones would have jammed. `tools/narration.py` is now
  one clip per leaf in walkthrough order, each the leaf said aloud; the unused `metonic` clip is gone.
  "A green crust" became "a crust of corrosion", since the CT texture renders terracotta.
  **Performance** (measured by the reviewer, 10 Mbps): a first visit moved 35.8 MB because the worker
  registered on `load` and fetched the model a second time alongside the page, plus the fragment and
  both rooms; it now registers three seconds after the machine assembles, when its fetch of the model
  is a revalidation, and `/models/` and `/hdri/` are cache-first with no background refresh (CACHE v3;
  they change only with a CACHE bump anyway). `fragment_a.glb` was raw float geometry: meshopt takes it
  from 10.64 to 3.16 MB (a WebP pass on top saved 60 KB and meant quantising twice, so not done).
  `errorBands` ran in an idle callback with a 3 s timeout whether or not anyone looked: 1.3 s of main
  thread on desktop and about 6 s on a throttled phone. The chart, the bands and the Saros audit now
  wait until "How accurate was it?" is opened, and Chart.js is its own chunk (`web/src/ui/chart.ts`,
  70 KB gzip out of the first load). `web/public/_headers` gives `/assets/*` a year, immutable.
  **Accessibility.** Enter on the walkthrough's next button went two leaves and back did nothing (the
  card's global key handler also fired); arrows on the years slider turned leaves; Space on a panel
  header turned the crank; the Manuscript theme button carried `data-theme="manuscript"` and so took
  the manuscript's whole token block (2.29:1 in the vitrine), now `data-set-theme`; `--ink-faint` was
  3.2:1 and 3.7:1, now 4.5:1 or better on every ground (vitrine L 0.60, manuscript 0.48); reduced
  motion now also stops the idle orbit and the crank starting on a return visit, and smooth scrolling;
  the canvases are `role="img"`, the chart is labelled, the title is an `h1`; the card is a labelled
  region whose body is a polite live region; the sky legend lights a body on focus.
  **Also:** the view buttons and the Exhibit menu had no ground and vanished over lit bronze in the
  close views; a `?lib=1` link at the epoch left the Moon's column without the libration row
  (`readUrl` now ends with `update(true)`); a saved picture's object URL is revoked after 4 s, not at
  once (Safari). **The back dial texture:** the Games dial's second lines ran across the divider and
  into each other, and the Metonic spiral's long month names ran into the next cell on the inner
  turns; the Games names now sit level at the middle of each quarter and `Dial.text` takes a `fit`
  width so a name is set smaller to fit its cell. Model re-exported headless; 10.28 MB.
  **Environment gotcha:** OneDrive was not running, and 1,589 files in `web/node_modules` and four
  reflogs in `.git/logs/refs` were cloud-only stubs that nothing could read (tsc, vitest and git commit
  all failed with UNKNOWN or "unable to append"). `npm ci` rewrote `node_modules`; the four reflogs
  were renamed `*.onedrive-stub` (not deleted) so git could start new ones. Check with
  `attrib` for an `O` flag if a tool fails to read a file for no reason.
- 2026-09-23, later: **Stewart approved the review's five recommendations**; the ledger is
  `docs/plans/2026-09-23-review-run.md`.
  **The "floating crank" was the Sun pointer.** Stewart's side view showed a stack standing far out
  of the front with a glowing ball at its tip. The crank itself was right (axle from the wall, knob at
  x 108). `blender/dials.py` placed the tubes, rings and pointers of the three pin-follower carriers
  (`mercury_ptr` z 10, `venus_ptr` 11.5, `true_sun_ptr` 29.5 in `followers`) as if they sat at zero,
  because it looked their depth up in the gears alone: the Sun's pointer and ball stood at z 65-71,
  35 mm off the plate (z 30), and Mercury and Venus 10 mm too far out, out of the intended order.
  `HOST_Z` now holds gears and followers alike. The stack runs date 33, Saturn 33.8, Jupiter 34.6,
  Mars 35.4, Sun 36.2, Venus 37, Mercury 37.8, dragon 38.6, Moon 40. Stacked that tight, the old
  round stones (3.6 mm high on rings 0.8 mm apart) and the Sun's 2.6 mm ball were swept by the
  pointers above them, so the stones are inlays (scale z 0.22), the ball is r 1.9 inside its
  pointer's layer, and the dragon's head is flattened to 0.35.
  **The bronze.** ACES pushed lit bronze to saturated yellow, which is why the gears read as gold
  foil whatever the albedo; the vitrine now tone-maps with AgX at exposure 0.72, gives colour back
  with a `saturation` uniform in the final pass (1.15, applied in linear light before the tone map),
  and the gear bronze is 0.8 of its exported colour with roughness 0.92, the plates' mottle halved
  (`PLATE_MIX` 0.5, colour 0.62), vignette 0.62, grain 0.024. The manuscript keeps ACES at 1.0:
  under AgX its parchment went grey, and it was balanced under ACES in the first place. Tuned live
  through `__viewer.tuning` (the shared shader uniforms) and the materials on `__viewer.root`.
  **The plinth** is a RoundedBoxGeometry block, a dark shadow gap and an eased top slab with a
  canvas speckle, so the spot rolls along its edges instead of flaring into a white line.
  **The spirals** are cut as slots in `tools/gen_dial_textures.py`: 0.8 mm of `SLOT` ink, bump depth
  8, with one more turn drawn as a rule to close the outside; at 2048 px the old 0.2 mm hairline had
  vanished. The model grew from 10.3 to 11.0 MB with the busier normal maps.
  **Only what survives** (Exhibit menu, `?survives=1`) isolates the 30 gears whose `am_status` is
  `surviving`; `Viewer.onIsolate` hands back the very array passed to `isolate`, so a train a
  visitor clicks unticks the box by itself. **Front and Back** stand at 670 mm aimed at y -32: at
  560 the case top sat under the view bar. **A phone's portrait stage** keeps only 0.9 of the 6:5
  width of view (`keep` in `resize`), so the machine fills the height. **The colophon** says the
  Halieia points to Rhodes and the months to Epirus (Iversen 2017), and names no maker.
  **SEO and sharing:** a descriptive `<title>`, canonical, robots, `og:site_name`, `og:locale`,
  `og:image:type`, `twitter:image:alt`, a JSON-LD WebApplication, `robots.txt` and `sitemap.xml`
  (the root only: `?theme=manuscript` canonicalises to it). The share image is recut from new hero
  renders under `og.jpg?v=2`, since Facebook and the rest cache by address. Share uses
  `navigator.share` where the pointer is coarse (phones, tablets) and the clipboard elsewhere.
  **The hero renders run headless** now: `blender -b build/antikythera.blend --python
  blender/hero_render.py` (all five views in under four minutes on this machine), then
  `python tools/gen_icons.py`. **viewer.ts** is 962 lines: the room, the shaders and the material
  dressing moved to `room.ts`, `shaders.ts` and `materials.ts`; interaction and animation stay in
  the class, whose state they share.
- 2026-09-24: **the walkthrough card, Arthur, and the landing page.** Stewart could not reach the
  card's back and next: the stage ran past what his window showed and the card was pinned 22 px off
  the stage's foot. It is a lower third now (`--onboard-bottom: max(22px, 9%)`), and
  `Onboarding.fit()` lifts it by however much would fall below `visualViewport` on every leaf,
  resize and fold; `#app` takes `100dvh`. Measured with the page forced 300 px taller than the window:
  the card still ends at 891 of 903. **Narration** re-recorded in full in Arthur, an older British
  documentary voice from the ElevenLabs library that Stewart chose from four auditions (George, Liam
  Dale, AK, Arthur); `narration.py` finds him by id. Imitations of real people were ruled out.
  **Found while filming:** unticking taken apart under only what survives closed the case over the
  survivors; `applyVisibility` now keeps it open while any wheels are isolated. **The landing page**
  (`docs/index.html`) is filmed from the running exhibit, frame by frame off the WebGL canvas with the
  date stepped by hand (`docs/plans/2026-09-24-landing.md`, `tools/landing_clips.py`), since no ffmpeg
  was at hand and animated WebP plays in a README too: a hero that scrolls a year of the crank (40
  frames, with dials for the crank's 4.65 turns against the main wheel's one), the fourteen leaves in
  a sticky stage whose address bar is a real link to that state and which Arthur reads on request,
  seven views, the exhibit itself in an iframe on request, and phones. 24 MB of clips, loaded as they
  come into view. **OneDrive** came back overnight and put stale cloud copies of nine files over the
  committed ones, keeping ours as `*-StewartPC`; every copy matched HEAD, so HEAD was restored.
