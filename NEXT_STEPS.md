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

## In flight

- A `/critique` design review was running (two assessments: LLM design-director review
  and the `impeccable` detector). If their reports are not in NOTES.md, re-run
  `/critique web/index.html web/src/ui/style.css` from the antikythera folder.

## Backlog, in priority order

1. **Design pass to "museum vitrine"** (`/polish`, `/typeset`, `/layout`, `/colorize`):
   replace the generic dark-card look. Fonts: drop Cormorant Garamond and IBM Plex Mono
   (reflex fonts); candidates checked on Google Fonts: Marcellus or Cinzel for lapidary
   titles, Alegreya / Alegreya Sans for labels and prose (Alegreya has Greek); tabular
   lining figures for readouts. Panels as wall labels / catalogue cards; collapse
   analytics, gear trains, back dials by default; the stage gets gallery lighting.
2. **Fragment A crossfade** once the scan is downloaded (see above).
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
