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
