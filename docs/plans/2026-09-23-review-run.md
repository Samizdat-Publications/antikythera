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
2. [ ] **The "crank floats" report.** Stewart's screenshot (side view) shows a stack sticking far out
       of the front plate with a glowing ball at its tip, and asks whether the crank is meant to
       float off what it turns. Measure in the scene: the front pointer stack's depth in front of the
       plate, and the crank (a1) against the case wall. Fix whatever is not by design.
3. [ ] **SEO and share cards.** Absolute `og:image` (1200x630), og:title/description/url/type,
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
