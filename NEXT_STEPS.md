# Where things stand, and how to keep it

_Updated 2026-09-23. Version 1.0 is finished, deployed and written up. Read this first in a new
session; NOTES.md has the decisions, newest entry last; CLAUDE.md has the rebuild order and the
deploy command._

## Version 1.0, done and live

The exhibit: https://antikythera.stewartgregerson.workers.dev
The project page: https://samizdat-publications.github.io/antikythera/ (GitHub Pages, served from
`docs/` on `main`; it needs Pages switched on in the repository settings, and a private repository
needs a paid plan for that. `docs/index.html` is the page, `docs/screens/` the screenshots.)

- A working 69-gear reconstruction (Freeth et al. 2021) built from one gear table in Blender, exported
  to glTF and driven date by date in three.js; every rate an exact fraction, tested in Python and TS.
- Two versions of the same exhibit: the museum vitrine (default) and the Hellenistic manuscript
  (`?theme=manuscript`), both with the overture, the walkthrough (fourteen narrated leaves), Inside,
  Taken apart, the crank drag, pointer trails, the Sky view, the lit Moon, the eclipse predictor against
  NASA's canon, the accuracy chart, the gear trains, Fragment A's CT scan.
- The finishing run of 2026-09-17 (branch `v1`, merged): launch metadata and a share image, install
  as an app and work offline, click a gear to see its train (touch too), save this view as a picture,
  today and Share, context-loss recovery and a still for browsers without WebGL, quality tiers, the
  parapegma letters where Bitsakis and Jones 2016 read them, the manuscript's running head at every
  width. The decisions are in NOTES.md under 2026-09-17.
- 2026-09-18: the deferred minors cleared, the three-quarter view pulled back so the case is not
  shaved off at wide aspects, the README rewritten around eight screenshots of the running exhibit,
  and the project page written. The decisions are in NOTES.md under 2026-09-18.
- 2026-09-20: the long exposure on the Sky stage (`long exposure` in the stage bar, `?expose=1`):
  the trails keep their whole history, so Venus's eight-year pentagram and Mars's chain of loops draw
  themselves as the crank turns. Building it turned up two bugs that were already shipped: the sky
  trails were being rebuilt from scratch every frame at ten years a second, and the manuscript's Moon
  is now the photograph in the page's inks rather than an engraving. The decisions and the numbers
  are in NOTES.md under 2026-09-20.
- 2026-09-20: the case boards were given a real box unwrap in `box_bm` (blender/dials.py), the
  model rebuilt headless and the four lining planes removed from the web layer. Both the outside and
  the inside of the case are the same wood at the same scale now. The decisions, and the two
  headless Blender commands the rebuild used, are in NOTES.md under 2026-09-20.
- 2026-09-18, after release: four pointers (date, Games, Callippic, Exeligmos) were being drawn about
  a pivot off their arbor, because `gltf-transform optimize` folds a mesh's centre into the node's own
  translation when that node has no children. `web/src/mech/pivots.ts` puts the pivot back at load.
  Watch for it: a pointer that loses its last child will be hit the same way, and the tell is a
  pointer that reads backwards or seems to turn about its point. The case lining is wood now, not a
  flat dark panel.

- 2026-09-21: the sky's libration on the Moon face (`the sky's libration` under the Moon, `?lib=1`).
  The face turns to the real Moon's libration from astronomy-engine while the light stays the
  machine's; opt-in and labelled as the sky's. NOTES.md, 2026-09-21.

- 2026-09-23: a review by three read-only agents (code, the historical claims, performance and
  accessibility) and a pass on everything it found, then the five recommendations Stewart approved:
  the copy corrected against the sources, a first visit eleven megabytes lighter, the keyboard and
  screen reader fixed, the Sun pointer brought back to its depth (it stood 35 mm off the plate), the
  bronze under AgX, a museum plinth, the spirals cut as slots, only what survives, SEO and a share
  card, the phone's framing, and viewer.ts split. NOTES.md, both 2026-09-23 entries; the ledger is
  `docs/plans/2026-09-23-review-run.md`.

## Maintenance guide (for sessions at any effort level)

**Change copy or a panel.** Edit `web/index.html` (the page), `web/src/ui/onboarding.ts` (the
walkthrough leaves), `web/src/main.ts` (ledger rows, labels). Voice: a museum label, lowercase button
labels, no em dashes anywhere (`LC_ALL=C.UTF-8 grep -rnP "\x{2014}"` must print nothing). Both versions
share every feature; only `[data-theme="manuscript"]` rules in `web/src/ui/style.css` may differ, and
the manuscript rules must come after the vitrine ones in the file (a media query adds no specificity).

**Check and build.** `cd web && npx tsc --noEmit && npx vitest run && npx vite build`; Python:
`cd python && python -m pytest`. Dev server: the `antikythera-web` entry in `.claude/launch.json`
(port 5177). Browser-pane gotchas are at the end of NOTES.md's 2026-09-17 entry.

**Change the project page or its screenshots.** `docs/index.html` is hand-written and stands alone:
no build, no framework, the vitrine's own OKLCH tokens copied into its `:root`. Preview it with the
`antikythera-docs` entry in `.claude/launch.json` (port 5178). New screenshots: run the dev server,
pin the camera (`__viewer.view(name, 0)`, `controls.autoRotate = false`, `lastInput =
performance.now()`) or the idle orbit will have wandered off, capture at 1600x1000, and save as JPEG
at quality 84 into `docs/screens/`. Keep the README's captions and the page's in step.

**Deploy.** `cd web && npm run build && cd .. && npx wrangler deploy --assets web/dist`, then push.
If the GLB or any texture changed, bump `CACHE` in `web/public/sw.js` first.

**Change the Sky stage.** `web/src/ui/cosmos.ts` draws it from the gear graph: `BODIES` holds each
body's deferent radius, trail span and colours, `advance` samples the machine between frames, and the
long exposure is `EXPOSURE_CAP` (memory) and `SUBSTEPS` (accuracy). Time anything you change from the
console with `window.__cosmos`: `c.setExposure(true)`, then step `c.tick(y, jd, true)` yourself in a
loop rather than trusting the frame rate, since a headless or hidden browser throttles rAF to about
1 fps and every fps reading you take there will be wrong.

**Re-narrate a leaf.** `tools/narration.py` holds one clip per walkthrough leaf, in the order of
`STEPS` in `web/src/ui/onboarding.ts`, each the leaf's body said aloud: change the two together.
Delete that clip's mp3 in `web/public/audio/`, run `python tools/narration.py` (needs
`ELEVENLABS_API_KEY`; it regenerates only missing clips). Never a voice that imitates a real person.

**Tune the look.** The vitrine tone-maps with AgX (exposure 0.72), the manuscript with ACES (1.0);
`setTheme` in `web/src/scene/viewer.ts` sets both, with the final pass's `saturation`, `vignette` and
`grain`. The material families are tuned by name in `web/src/scene/materials.ts`, the room in
`room.ts`, the shader hooks in `shaders.ts`. Try values live first: `__viewer.tuning.plateMix.value`,
`__viewer.plate.mat`, the materials on `__viewer.root`, `__viewer.renderer.toneMappingExposure`, and
pin the camera (`__viewer.controls.autoRotateSpeed = 0`) or the idle orbit wanders off mid-test.

**Change a dial face or the parapegma.** `python tools/gen_dial_textures.py`, then with Blender
closed: `& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" -b build/antikythera.blend
--python blender/export_glb.py`, then the three gltf-transform steps in CLAUDE.md, then bump `CACHE`.
The parapegma table lives twice, in `web/src/astro/parapegma.ts` and `tools/gen_dial_textures.py`;
change both.

**Change a gear, a board or anything else in the model.** `data/gears.json` or the script that builds
the part, then the full rebuild order in CLAUDE.md (Blender open with the Lab MCP add-on), then
`python -m pytest` and the web tests, then bump `CACHE`. With Blender closed, the same rebuild runs
headless in two invocations, and this is the easier way:

```
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" -b --factory-startup `
    --python-exit-code 1 --python blender/build_all.py -- --out build
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" -b build/antikythera.blend `
    --python-exit-code 1 --python blender/dials.py --python blender/surface.py --python blender/export_glb.py
```

Several `--python` flags run in order in one session, which is what the socket gave. Nothing prints
each script's `result`, so check the rebuild instead: `build/rig_dump.json` carries the verification
report (69 gears, worst error under 1e-4 rad), and `dist/gears.json` should come out byte for byte
the `web/public/data/gears.json` already deployed unless the gear table itself changed. Then the
three gltf-transform steps in CLAUDE.md, then `CACHE`.

**Hero renders.** Headless, with Blender closed: `& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe"
-b build/antikythera.blend --python blender/hero_render.py` (all five views, under four minutes),
then `python tools/gen_icons.py` to refresh the share image and the still, then bump the `?v=` on
`og.jpg` in `web/index.html` (three places) so the social networks fetch it again.

## Backlog (small, unranked; none blocks anything)

The finishing run's deferred minors are all cleared (2026-09-18). What is left is either a limit of
the sources or something deliberately out of scope:

- The one attested parapegma numeral (11) in PP1 col. i is not drawn, because the paper cannot place
  its line. Nothing to fix until someone publishes a placement.
- Fragment A's position could still be nudged a few mm by eye at full size (a taste call).
- If a slow GPU ever matters more, the two-round quality guard could be given a third round. (The
  other half of this line was stale: the service worker has precached the model on install since
  version 1.0.)

## Taste calls Stewart may want to reverse

- 2026-09-23: the vitrine under AgX with a little saturation given back; the plates' mottle at half
  strength; the planet stones flattened to inlays and the Sun's ball smaller (both so the pointers
  can pass over them); the new plinth; Front and Back further out. All in `viewer.ts`,
  `materials.ts` and `blender/dials.py`, each a number or two.
- The Cycles hero renders still use Blender's own plate material, which is more orange than the web
  plate now is; `blender/surface.py` could follow the web's halved mottle.

- The saved picture is capped at three times the device pixel ratio, so on a retina screen it is 1.5x
  the screen, and the label says "larger than the screen"; raising the cap to 4 costs a 23-megapixel
  frame.
- Share falls back to a `window.prompt` when the clipboard is unavailable (insecure contexts).
- The share image is the hero render cropped to 1200x630 with the dial slightly left of centre; a
  wider render would let `OG_FOCUS` in `tools/gen_icons.py` centre it.
- The eleven parapegma letters not read on the bronze are cut in the same faint ink as the schematic
  Saros hours; the colophon says so.
- The manuscript's Moon is a sepia duotone of the LROC photograph (`SEPIA` in `web/src/ui/moon.ts`),
  and its night side is washed to a fifth so the page shows through. Darker night, or a warmer or
  cooler ramp, is a five-line change; the old cross-hatched engraving is in git if it is ever wanted.
- The long exposure is opt-in, a checkbox on the Sky stage, rather than something the top speed turns
  on by itself. The Moon is left out of it on purpose (see NOTES.md, 2026-09-20).
- The sky's libration is opt-in, and off in a fresh visit, because the panel's first job is the
  machine's Moon. Turning it on by default is one `checked` attribute in `web/index.html`; the
  position-angle tilt of the lunar axis is left out on purpose (the terminator is drawn upright too).
