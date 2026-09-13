# Where things stand, and what's next

_Updated 2026-09-13 (late evening). Read this first in a new session._

## Done and live

- Research digest, gear table, exact ratio solver, layout, eclipse-year glyph model (36 pytest).
- Blender build of all 69 gears with drivers, pin-and-slot devices, followers, phase-ball
  differential; verified numerically. Dials, plates, pointers, rings, case, textures.
- glTF export + three.js dashboard: crank, epochs, x-ray, isolate trains, eclipse predictor
  vs NASA canon, real-sky comparison, analytics chart + 3-Saros audit, moon disc,
  gear inspector, narrated 11-step onboarding walkthrough, sounds.
- Deployed: https://antikythera.stewartgregerson.workers.dev

## Decisions taken with Stewart (2026-09-13)

- Audience: museum-exhibit / general public; also a personal showpiece; "go all out".
- Visual direction: **Museum vitrine** (see `.impeccable.md`). He likes the
  "Hellenistic manuscript" light theme too: build it later as a second theme / A-B.
- Progressive disclosure allowed (analytics, gear trains, back dials may collapse).
- Mobile is secondary. Size of assets doesn't matter; performance does.
- CT scan of Fragment A (Pakzad, CC BY): DOWNLOADED (Sketchfab glTF, 43.6 MB) to
  `Downloads/antikythera_mechanism_main_fragment_ct.zip`, copied to `assets/raw/`
  (gitignored), imported with `blender/fragment.py` (2.78M → 180k tris) and exported to
  `dist/fragment_a.glb` (10.6 MB, tracked) and `web/public/models/fragment_a.glb`.
  The viewer crossfade ("Fragment A" slider) is being wired in this session; its
  alignment to the main wheel b1 (rotation/offset constants in `web/src/scene/viewer.ts`)
  may still need tuning by eye.

## Done since the handoff was first written (night of 2026-09-13)

- Critique run and acted on (summary in NOTES.md). Museum-vitrine restyle shipped: Marcellus +
  Alegreya, catalogue column, collapsed advanced sections, primary crank button, stable
  readouts while playing, walkthrough docked under the stage, human names on hover.
- Lighting phase (a) shipped: warm gallery PMREM environment, shadow-casting key lights front
  and back, GTAO ambient occlusion, physical bronze. Phases (b)–(e) below remain.
- Fragment A crossfade slider is live (scan pose baked in `Viewer.FRAGMENT_POSE`; in-plane
  rotation/offset could still be refined by eye against the main wheel).
- Re-run `/critique` to get a new heuristic score after the restyle.

## Backlog, in priority order

0. **Lighting and depth (Stewart, 2026-09-13: "graphic polish is particularly important on this
   piece to give it true depth").** Plan, cheapest-first:
   a. three.js: replace the flat RoomEnvironment with a warm gallery environment (a hand-built
      PMREM scene: one large warm key panel high-left, a cool dim fill, a thin rim strip behind),
      shadow-casting key light with soft PCF shadows, GTAO ambient-occlusion pass so gears
      separate from the plates, ACES tone mapping tuned for bronze. (Started in this session.)
   b. Materials: brushed-bronze micro-normal map + roughness variation baked in Blender (or a
      tileable normal generated with Pillow), clearcoat on the polished rings, deeper engraving
      bump on the dials, vertex-baked ambient occlusion from Blender (Cycles bake -> vertex colour)
      multiplied into the base colour.
   c. Cinematic touches for the hero views: subtle bloom on the golden sun ball and the stones,
      depth-of-field on the iso preset, a dust/vignette overlay on the vitrine glass.
   d. A real HDRI (Poly Haven, CC0) if the hand-built environment is not enough; ask before
      downloading.
   e. Blender hero renders: Cycles with an HDRI and area lights for the README / social images.

1. **Second design pass** (`/polish`): re-run the critique; likely leftovers are the
   segmented view buttons not tracking preset views, the moon disc styling, tablet layout,
   and the hover label when nothing is hovered.
2. **Fragment A alignment**: fine-tune `Viewer.FRAGMENT_POSE` so the scan's main wheel sits
   exactly on b1 (compare the 4 spokes); consider fading the reconstruction out gradually.
3. **Onboarding polish**: tighter close-up camera for the pin-and-slot step (target the
   k1/k2 pair at (15,-10,-25) mm from ~120 mm away), a "why epoch" diagram, keyboard hints.
4. **Manuscript theme** (light parchment/ink) as a toggle; A-B with the vitrine.
5. **3D lit moon** in the Moon panel (sphere + directional light at the elongation).
6. **Retrograde loop strip**: planet longitude vs time chart showing Mars' loops.
7. **Parapegma highlight** when the sun pointer crosses an index letter; parapegma text is
   currently schematic — transcribe Bitsakis & Jones 2016 for the real lines.
8. **Performance**: FPS overlay; merge static meshes (plates/case) into fewer draw calls.
9. **Attested-vs-reconstructed styling**: dim hypothesised gears in the inspector; add the
   Freeth 2014 Table S3 hours into the Saros dial texture (only 15 cells are attested).

## How to resume

Open Claude Code in `C:\Users\stewa\OneDrive\Documents\Claude\Blender Tests\antikythera`
(not in `2d`). Blender must be open with the MCP add-on for any rebuild. The web dev
server config is in `.claude/launch.json` here (`antikythera-web`, port 5177).
