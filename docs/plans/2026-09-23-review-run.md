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
2. [x] **The "crank floats" report.** DONE: stack now 33.0-41.6 mm, order date, Saturn, Jupiter, Mars,
       Sun, Venus, Mercury, dragon, Moon; CACHE v4. FOLLOW-UP folded into item 8's rebuild: the sun ball
       (r 2.6 at z 39) is swept by the Moon pointer and dragon hand; set it r 1.9 centred 36.45; flatten
       the planet stones to inlays (scale z so they span ring mid +-0.38) and the dragon head (scale z 0.35).
       Was: Found: the crank is fine (axle from the wall, knob at x 108).
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
4. [x] **Mobile pass.** (portrait crops up to a quarter of the width: `keep` in viewer.resize; view
       bar gutter under 480 px.) Was: View bar clipped at 390 px ("Inside" at the edge), machine small in the stage.
5. [x] **Split viewer.ts** (1,240 to 962 lines: room.ts, shaders.ts, materials.ts; interaction and
       animation stay in the class, whose state they share.) Was: (1,189 lines) into scene/environment.ts, materials.ts, interaction.ts,
       animations.ts; pure refactor, tests and a visual check before and after.
6. [x] **Bronze and lighting pass.** IN CODE (uncommitted until the rebuild lands): AgX tone mapping at
       exposure 0.72 (manuscript 0.95), a saturation uniform in FinalShader (1.15 / 1.05), Bronze colorMul 0.8
       roughness 0.92 env 1.0, DarkBronze colorMul 0.7, plate mix 0.5 colour 0.62 rough 1.2, vignette 0.62,
       grain 0.024. Was: Gears read as flat gold foil; the plate ground reads as rust or
       burnt paper; the front plate blows out at three-quarter. Darker, varied bronze, patina in
       recesses, more contrast between layers. Before/after stills in `.playwright-mcp/`.
7. [x] **Back spirals read at a glance.** Slot drawn 0.8 mm SLOT ink, bump depth 8, outer turn closed,
       dividers 0.24 (textures regenerated, uncommitted). Was: Cut the Metonic and Saros spiral as a sunk groove, darker
       lettering (`tools/gen_dial_textures.py` bump and albedo, then headless re-export).
8. [x] **Plinth.** (model rebuilt, CACHE v5; hero renders and og.jpg redone headless, og ?v=2) New in viewer.ts: RoundedBox body, shadow gap, eased top slab, speckle texture.
       dials.py: sun ball r1.9 z0.25, stones flattened (scale z 0.22, z 0.3), dragon head scale z 0.35.
       NEXT: full headless rebuild, gltf-transform x3, CACHE v5, screenshots, commit, deploy. Was: Replace the grey box with a proper museum plinth.
9. [x] **"What survives" switch.** Only the 30 surviving gears (gears.json marks them), the rest
       ghosted; in the Exhibit menu, carried by Share (`?survives=1`).
10. [x] **Front view framing** (front/back at 670, target y -32) (case top jammed under the view bar) and **one line on Rhodes**.
11. [ ] Docs: NEXT_STEPS.md, NOTES.md entry, README/project page screenshots if the look changed;
        bump `CACHE` in `web/public/sw.js` for any GLB or texture change; deploy; push.
