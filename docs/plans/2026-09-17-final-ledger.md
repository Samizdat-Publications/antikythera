# SDD ledger: plan docs/plans/2026-09-17-final.md

Branch v1 from main 5707966. Base for Task 1: 8bd3d2a

Preflight scan: tasks 2,3,4,5,6 all add to main.ts and viewer.ts; each adds distinct members (onSelect / snapshot / stateUrl / onContextLost / setQualityTier), no shared interface between tasks; Task 4 depends on Task 2 (click) and Task 3 (save) only in copy, so order 1..6 is right. Task 1 gen_icons.py is extended by Task 5 (still). No task contradicts a global constraint. Clean.

Controller note: manuscript top bar overlaps on a 375 px phone (title 22px/0.22em runs under the date). Deferred to a phone-fixes batch task after Task 6.

Task 7 added (parapegma per Bitsakis and Jones 2016) after the research agent found the primary source open access with 19 attested positions; Ruling: replace the schematic 24-letter scheme with the attested model, drawing only positioned letters (scale solid, numeral/restored faint) and re-exporting the GLB headless. Cost if wrong: a 10 MB model churn and a texture that can be regenerated from git.
Task 1: review approved; Important (plan-mandated): colophon repeats line 197. Ruling: new paragraph shortened to "Version 1.0, September 2026. Built in Blender 5.1 and three.js." (cost if wrong: one line of copy). Minors taken into fix round 1: colon in the eclipse label, middle-dot placeholders, og.jpg crop centred on the dial (controller finding), sizes tuple. Deferred minors: theme colours as hex literals in three places (note for NOTES.md); manifest splash is lamp-black for a manuscript reader.
Task 1: fix round 1/5 (5 addressed, 0 open; og crop rule is a no-op on a 1920x1200 source, dial at 46% across, accepted; commits 080e040..495380d)
Task 1: complete (commits 8bd3d2a..495380d, review clean). Task 1: minor (deferred): gen_icons.py docstrings still say "centre-cropped"; OG_FOCUS only bites on a wider render.
Base for Task 2: 495380d
Task 2: review approved, 0 open. Ruling: two minors taken into fix round 1 because tablets are a real audience: pick synchronously on pointerdown so a touch tap (and the crank on touch) has a hovered id, and clear the press once a pointermove exceeds 6 px so a loop-back drag cannot select. Cost if wrong: a few lines in viewer.ts. Deferred minors: pointerId not paired; first-match trainFor names True Sun for fix56 and Mars for ju64 (spec).
Task 2: fix round 1/5 (2 addressed, 0 open; commits 291a05f..a081afd)
Task 2: complete (commits 495380d..a081afd, review clean). Task 2: minor (deferred): a second finger during a crank wind re-picks hovered; multi-touch pointerup ends a crank drag (pre-existing).
Base for Task 3: a081afd
Task 3: review approved. Important (plan-mandated): title "twice the screen's resolution" is false at dpr 2 with the cap of 3. Ruling: keep the cap (memory), soften the title to "larger than the screen"; cost if wrong: one string. Minors taken into fix round 1: restore the ratio right after toBlob is issued; one canvasToBlob helper. Deferred minors: composer fields unguarded (consistent with render()); view string unsanitised (known-safe callers).
Task 3: fix round 1/5 (3 addressed, 0 open; commits 0d26b26..deed3be)
Task 3: complete (commits a081afd..deed3be, review clean). Task 3: minor (deferred): three internal comments still say "twice" (main.ts:554, viewer.ts:765, viewer.ts:1140); viewer.ts now imports from ui/snapshot.ts.
Base for Task 4: deed3be
Task 4: complete (commits deed3be..beb956c, review clean). Ruling: narration.py nulling untouched durations is left for a NOTES.md backlog line, not a fix round, because the app never reads duration (cost if wrong: two numbers in tour.json). Minor (deferred): Share confirmation is visual only (no aria-live).
Base for Task 5: beb956c
Controller findings for the phone-fixes batch (Task 8): (1) manuscript running head overlaps the title at 800 px and 375 px now that Share is in it; (2) the no-WebGL label is hard to read over the bright still (needs a scrim or a dimmed still).
Task 5: complete (commits beb956c..35682b1, review clean). Ruling: two minors (restore hides the loading label mid-load; no scrim under the no-WebGL label) go to the Task 8 batch with the narrow-width fixes rather than a fix round (cost if wrong: one extra review seat). Minor (deferred, plan-mandated): alt text capitalised; catch-all try/catch; theme switch inert on the still page.
Base for Task 6: 35682b1
Task 6: review Needs fixes. Important: offline navigation fallback keyed on the full URL while state lives in the query. Ruling: canonical key (path only) for the stored page and the lookup; cost if wrong: one cached index per path. Minors (deferred, deploy notes): bump CACHE in sw.js whenever the GLB or textures change (Task 7 changes the GLB, first deploy carries v1 so fine); old hashed bundles accumulate until the name is bumped; shelved assets revalidate on every load; a fast machine burns a second 90-frame round.
Task 6: fix round 1/5 (1 addressed, 0 open; commits 5d595e1..c208d47); scoped re-review dispatched at the 5-hour pause, verdict to be read from the next session if it did not land.
Task 6: complete (commits 35682b1..c208d47, review clean).
Base for Task 7: cdd26cb (HEAD after the resume-notes commit). PAUSED here on 2026-09-17 at the usage limit; resume with Task 7.
Resumed 2026-09-17 after the reset. Base for Task 7 corrected to HEAD: 6244f60
Task 7: implemented (3ac02cd, f9b180a). Ruling: 24 positioned entries (13 scale + 6 numeral + 5 restored) is right; the brief miscounted 22; cost if wrong: one test number. dist/antikythera.glb was already tracked, so its churn is pre-existing.
Task 7: complete (commits 6244f60..f9b180a, review clean). Rulings: colophon overclaim and README sentence go to Task 8 as items 5 and 6 (cost if wrong: two sentences); the ΙΑ numeral of PP1 col. i stays undrawn because the paper cannot place its line (deferred minor); the 0.6 window not wrapping at 360 is accepted (brief-forced).
Base for Task 8: fda9976
Task 8: review approved. Rulings: (1) the three dead manuscript phone rules move into the appended 900 px block (visible change at phone widths, the intended design; cost if wrong: three CSS lines); (2) colophon says the eleven not read on the bronze are faint (cost: one clause); (3) NOTES.md 2026-09-12 "index-letter assignment schematic" line is corrected in the docs pass before merge. Minor (deferred): stale "context lost" text survives a restore during download until the next progress tick.
Task 8: fix round 1/5 (2 addressed, 0 open; commits 810ff5a..c7301b9)
Task 8: complete (commits fda9976..c7301b9, review clean). All eight tasks complete; docs pass then final review.
Final review: With fixes. Rulings for the fix wave: (1) "eleven short steps" becomes fourteen; (2) precache on install (page, model, fragment, data, HDRIs, moon texture, still, icons), each add failing softly, so "opens offline once visited" is true; (3) merge and deploy right after, so the past tense in the docs becomes true; (4) stateUrl drops the debug switches; (5) restored asterism names flagged in the ledger row with a second field; (6) "text lost" becomes "its line is lost"; (7,8,9) comments, docstring, aria-live; (11) dist/ untracked and ignored as its own commit; (12) left, consistent with the existing call. Cost if wrong: small copy and one worker install step.
Base for the fix wave: 1a19a3b
Final fix wave: commits 1a19a3b..addaee2 (ca75558 fixes, 9607560 dist untracked, addaee2 switches stripped only when sharing; ruling: the visitor keeps their own switches across a reload). Scoped re-review dispatched.
Final re-review: all addressed. Two residual minors (a lost space on the Begin card, two comment wordings) fixed by the controller in one commit, ruling: trivial copy, no review seat spent. Branch ready to merge.
