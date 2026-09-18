# Where things stand, and how to keep it

_Updated 2026-09-18. Version 1.0 is finished, deployed and written up. Read this first in a new
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

**Re-narrate a leaf.** Edit the text in `tools/narration.py`, delete that clip's mp3 in
`web/public/audio/`, run `python tools/narration.py` (needs `ELEVENLABS_API_KEY`; it regenerates only
missing clips), then put back the `duration` values of the other clips in `tour.json` if you care
(the app does not read them). Keep `onboarding.ts`'s body text in step.

**Change a dial face or the parapegma.** `python tools/gen_dial_textures.py`, then with Blender
closed: `& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" -b build/antikythera.blend
--python blender/export_glb.py`, then the three gltf-transform steps in CLAUDE.md, then bump `CACHE`.
The parapegma table lives twice, in `web/src/astro/parapegma.ts` and `tools/gen_dial_textures.py`;
change both.

**Change a gear.** `data/gears.json`, then the full rebuild order in CLAUDE.md (Blender open with the
Lab MCP add-on), then `python -m pytest` and the web tests, then bump `CACHE`.

**Hero renders.** `python tools/bl.py blender/hero_render.py 1800` (Blender open), then
`python tools/gen_icons.py` to refresh the share image and the still.

## Backlog (small, unranked; none blocks anything)

The finishing run's deferred minors are all cleared (2026-09-18). What is left is either a limit of
the sources or something deliberately out of scope:

- The one attested parapegma numeral (11) in PP1 col. i is not drawn, because the paper cannot place
  its line. Nothing to fix until someone publishes a placement.
- Fragment A's position could still be nudged a few mm by eye at full size (a taste call).
- Libration in the Moon panel (it would be the sky's, not the machine's, and would need saying so);
  a long-exposure trail on the Sky stage at ten years a second.
- If a slow GPU ever matters more: the two-round quality guard could be given a third round, or the
  service worker could precache the model on install for kiosks.
- If the repository ever goes public, the project page and the README are ready for it; check that
  `docs/plans/` and `docs/research/` read the way you want them read in the open, since Pages serves
  the whole `docs` folder.

## Taste calls Stewart may want to reverse

- The saved picture is capped at three times the device pixel ratio, so on a retina screen it is 1.5x
  the screen, and the label says "larger than the screen"; raising the cap to 4 costs a 23-megapixel
  frame.
- Share falls back to a `window.prompt` when the clipboard is unavailable (insecure contexts).
- The share image is the hero render cropped to 1200x630 with the dial slightly left of centre; a
  wider render would let `OG_FOCUS` in `tools/gen_icons.py` centre it.
- The eleven parapegma letters not read on the bronze are cut in the same faint ink as the schematic
  Saros hours; the colophon says so.
