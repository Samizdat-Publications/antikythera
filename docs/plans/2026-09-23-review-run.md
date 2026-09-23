# The review run of 2026-09-23: resume ledger

Started by Opus 5.5 after a three-reviewer audit (see NOTES.md, 2026-09-23). Stewart approved every
item below on 2026-09-23. If a session is cut off, start here: tick items as they land, commit this
file with each one, and carry on from the first unticked item. Voice: never an imitation of a real
person (no Attenborough clones).

## Done and deployed (commits f101011..3dd929e)

- [x] Copy corrected against the sources (walkthrough, narration script, README, project page)
- [x] Performance: worker after assembly, fragment meshopt 3.2 MB, lazy chart, `_headers`
- [x] Accessibility: keyboard, contrast, reduced motion, roles; HUD grounds; `?lib=1`; Safari download
- [x] Games dial and Metonic month names no longer collide (model re-exported)

## To do, in this order

1. [ ] **Narration voice.** Auditions in `.playwright-mcp/audition/` (index.html plays them; gitignored).
       Waiting on Stewart's pick: George (current), Liam Dale, AK, Arthur (added to the ElevenLabs
       library as "am Liam Dale" etc.). Then: set the voice in `tools/narration.py` `pick_voice`
       (prefer by voice_id), delete `web/public/audio/tour_*.mp3`, run `python tools/narration.py`,
       delete the unused `tour_metonic.mp3`, check tour.json has 14 clips, commit, deploy.
2. [~] **The "crank floats" report.** Found: the crank is fine (axle from the wall, knob at x 108).
       What floats is the true-Sun pointer and ball at z 65-71, 35 mm off the plate (z 30), because
       `blender/dials.py` placed the follower carriers' tubes, rings and pointer without their own
       z (true_sun_ptr 29.5, venus_ptr 11.5, mercury_ptr 10). Fixed with `HOST_Z` in dials.py
       (uncommitted until checked). Rebuild running: build_all + dials + surface + export, log in
       `build/rebuild_2026-09-23.log`. After it: `cmp dist/gears.json web/public/data/gears.json`,
       check `build/rig_dump.json`, the three gltf-transform steps, measure the stack (sun_ball z
       should be ~36-41), bump CACHE to v4, commit, deploy.
3. [x] **SEO and share cards.** (done: descriptive title, canonical, robots, og:site_name/locale/image:type,
       twitter:image:alt, JSON-LD WebApplication, robots.txt, sitemap.xml; Share opens the native
       sheet on touch devices.) Was: Absolute `og:image` (1200x630), og:title/description/url/type,
       twitter:card summary_large_image, canonical, description, robots.txt, sitemap.xml, JSON-LD.
       Share button: use `navigator.share` where it exists (phones), clipboard otherwise.
4. [ ] **Mobile pass.** View bar clipped at 390 px ("Inside" at the edge), machine small in the stage.
5. [ ] **Split viewer.ts** (1,189 lines) into scene/environment.ts, materials.ts, interaction.ts,
       animations.ts; pure refactor, tests and a visual check before and after.
6. [ ] **Bronze and lighting pass.** Gears read as flat gold foil; the plate ground reads as rust or
       burnt paper; the front plate blows out at three-quarter. Darker, varied bronze, patina in
       recesses, more contrast between layers. Before/after stills in `.playwright-mcp/`.
7. [ ] **Back spirals read at a glance.** Cut the Metonic and Saros spiral as a sunk groove, darker
       lettering (`tools/gen_dial_textures.py` bump and albedo, then headless re-export).
8. [ ] **Plinth.** Replace the grey box with a proper museum plinth.
9. [ ] **"What survives" switch.** Only the 30 surviving gears (gears.json marks them), the rest
       ghosted; in the Exhibit menu, carried by Share (`?survives=1`).
10. [ ] **Front view framing** (case top jammed under the view bar) and **one line on Rhodes**.
11. [ ] Docs: NEXT_STEPS.md, NOTES.md entry, README/project page screenshots if the look changed;
        bump `CACHE` in `web/public/sw.js` for any GLB or texture change; deploy; push.
