# Antikythera — decisions log

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
