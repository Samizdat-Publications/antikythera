# Antikythera Cosmos

**The oldest geared computer in the world, rebuilt from its tooth counts and turned by one crank in
your browser.**

[**Open the exhibit**](https://antikythera.stewartgregerson.workers.dev) ·
[The project page](https://samizdat-publications.github.io/antikythera/) ·
[How it is built](#how-it-is-built) ·
[How the numbers are checked](#how-the-numbers-are-checked)

<p align="center">
  <a href="https://antikythera.stewartgregerson.workers.dev/?inside=1">
    <img src="docs/landing/clips/view-inside.webp" width="800" alt="The reconstruction with its case and plates lifted away, the gearwork turning" />
  </a>
</p>

A working 3D reconstruction of the Antikythera mechanism, after the 2021 "Cosmos" model by Tony
Freeth's team at UCL: 69 gears, the eight nested outputs of the front dial, and the Metonic,
Callippic, Games, Saros and Exeligmos dials on the back. It is built parametrically in Blender 5.1
from a single gear table, exported as glTF, and driven date by date in the browser, beside a column
that holds what the machine predicts against what really happened.

| | |
|---|---|
| **69** gears, every one cut from `data/gears.json` | **30** of them survive in the bronze fragments |
| **223** teeth on the main wheel, one turn a year | **254/19**, the Moon's ratio, exact in the gearing |
| **51** eclipse glyphs, held against NASA's canon | **14** leaves in the narrated walkthrough |

Thirty of the wheels are the ones found in the fragments and thirty-nine follow the 2021 model; the
pointers go where that model says the bronze would have put them. Nothing in the picture is
decorative: every rate is an exact fraction, and every number on screen names the paper or the
dataset it came from. When the machine is wrong, the exhibit says so.

## The walkthrough

The exhibit opens with fourteen leaves, narrated by Arthur, each setting the machine to show one
idea. The [project page](https://samizdat-publications.github.io/antikythera/#walkthrough) plays
each one as it runs; here they are as stills.

| | |
|---|---|
| ![1](docs/landing/clips/leaf01.jpg) **1. A machine that models the sky.** Sixty-nine gears on one crank: thirty from the fragments, thirty-nine from the 2021 model. | ![2](docs/landing/clips/leaf02.jpg) **2. What the divers found.** Fragment A, the largest piece, from a CT scan of the original. |
| ![3](docs/landing/clips/leaf03.jpg) **3. Seeing inside the corrosion.** The reconstruction laid inside the scan, so the wheels show through. | ![4](docs/landing/clips/leaf04.jpg) **4. One crank, one year.** A 48-tooth crown wheel against the 223-tooth main wheel. |
| ![5](docs/landing/clips/leaf05.jpg) **5. Why everything is counted from an epoch.** The machine has no clock; it was set once, by hand. | ![6](docs/landing/clips/leaf06.jpg) **6. The front dial is the sky.** The zodiac, the Egyptian calendar and the parapegma. |
| ![7](docs/landing/clips/leaf07.jpg) **7. The Moon and its phase.** Exactly 254/19, and a half-dark ball that turns once a month. | ![8](docs/landing/clips/leaf08.jpg) **8. The pin and slot.** Two gears 1.1 mm off axis make the Moon speed up and slow down. |
| ![9](docs/landing/clips/leaf09.jpg) **9. The calendars on the back.** The Metonic spiral, the games, the Callippic cycle. | ![10](docs/landing/clips/leaf10.jpg) **10. Predicting eclipses.** The Saros spiral, its glyphs checked against NASA. |
| ![11](docs/landing/clips/leaf11.jpg) **11. The planets.** Five rings, each with its own epicyclic gearing and a coloured stone. | ![12](docs/landing/clips/leaf12.jpg) **12. The sky it tracks.** Each body on its epicycle, looping backwards. |
| ![13](docs/landing/clips/leaf13.jpg) **13. How good was it?** The Moon within about two degrees, and the caveat about hand-filed teeth. | ![14](docs/landing/clips/leaf14.jpg) **14. Explore.** Drag, zoom, click a gear, wind the crank, send the view as a link. |

## Seven ways to look at it

Every view is a switch in the exhibit and every one can be sent as a link. These are filmed from the
running page; each opens the exhibit in that view.

| | |
|---|---|
| [![The front dial](docs/landing/clips/view-front.webp)](https://antikythera.stewartgregerson.workers.dev/?view=front) **The front dial.** The zodiac, the Egyptian calendar (drawn with 365 days; a 2024 hole count suggests 354), and pointers for the Sun, the Moon and the five planets. | [![The back dials](docs/landing/clips/view-back.webp)](https://antikythera.stewartgregerson.workers.dev/?view=back) **The back dials.** The Metonic and Saros spirals, cut as slots for the pointers' pins to ride in, with the games, Callippic and Exeligmos dials. |
| [![Taken apart](docs/landing/clips/view-apart.webp)](https://antikythera.stewartgregerson.workers.dev/?apart=1) **Taken apart.** Every wheel slides out along its arbor and keeps turning, so the trains that share the great b1 wheel can be told apart. | [![Only what survives](docs/landing/clips/view-survives.webp)](https://antikythera.stewartgregerson.workers.dev/?survives=1) **Only what survives.** The thirty gears found in the fragments, solid; the thirty-nine reconstructed ones as ghosts. |
| [![The sky it tracks](docs/landing/clips/view-sky.webp)](https://antikythera.stewartgregerson.workers.dev/?sky=1) **The sky it tracks.** The machine's cosmos drawn from its own gears; bronze is what the machine shows, verdigris the real sky. | [![The manuscript](docs/landing/clips/view-manuscript.webp)](https://antikythera.stewartgregerson.workers.dev/?theme=manuscript&view=front) **The manuscript.** The same exhibit as a scholar's copy of Ptolemy: parchment, iron-gall ink, red ochre, gold leaf for the Sun. |

## What a visitor can do

* Turn the crank at a day, a month, a year or ten years a second, drag the handle to wind it by hand,
  or press the space bar; jump to the next eclipse, type a year, or press **today** and see how far
  twenty-two centuries have carried the pointers (the Sun a few degrees, the Moon over a hundred).
* Hover a gear for its tooth count and rate; click it to see its train alone. **Inside** lifts the
  plates away; **Taken apart** spreads all 69 wheels along their arbors, still turning; **only what
  survives** shows the thirty gears found in the fragments with the reconstructed ones as ghosts; the
  Fragment A slider crossfades to the CT scan of the real bronze.
* **Sky** draws the machine's own cosmos with the retrograde loops and the true sky beside it; the
  Moon panel is lit from where the machine's Sun pointer stands, and can be turned to the real Moon's
  libration.
* A narrated fourteen-leaf walkthrough; **Share** copies a link to whatever is set up, and on a phone
  opens the share sheet; **save this view** keeps the stage as a picture; the exhibit installs as an
  app and opens offline once visited.
* Two versions of the same exhibit, switchable in the top bar: the **vitrine** (a museum gallery at
  night, the default) and the **manuscript** (`?theme=manuscript`). They share every gear, number and
  panel; only the room, the page and the inks differ.

Every state is in the address: `?view=front|back|iso|crank|pinslot|front-close|back-upper|back-lower`,
`&years=`, `&epoch=`, `&inside=1`, `&apart=1`, `&survives=1`, `&sky=1`, `&expose=1`, `&lib=1`.

## How the numbers are checked

* `python/tests/test_ratios.py` asserts every pointer rate as an exact fraction
  (254/19, 940/4237, −5/93, 1513/480 …) from the tooth counts alone.
* `blender/build_all.py` re-verifies the Blender rig by driving it and reading back every gear, and
  checks the pin-and-slot amplitudes against asin(d/r); `build/rig_dump.json` holds the report.
* `web/src/astro/eym.test.ts` reproduces the 51 / 38 / 28 glyph counts and every glyph observed on
  the surviving Saros dial (Freeth 2014 Tables S1, S2).
* The eclipse ledger holds each month the machine predicts against 23,962 rows of NASA's Five
  Millennium Canon, and says plainly when the machine is wrong.
* 70 tests in all: `cd python && python -m pytest` (36), `cd web && npx vitest run` (34).

## How it is built

```
data/gears.json          every gear: teeth, module (Freeth 2021 Table S8), arbor, layer, couplings
data/eclipses_*.json     NASA Five Millennium Canon (Espenak & Meeus), slimmed
python/mech/             exact rational ratio solver, arbor layout, tooth outlines,
                         Freeth 2014 eclipse-year glyph model, Julian Day maths  (pytest)
tools/gen_dial_textures.py   dial faces drawn in millimetres (zodiac, calendar, spirals, glyphs)
tools/narration.py       the walkthrough's narration (ElevenLabs, the voice "Arthur")
tools/gen_icons.py       launch icons, the share image and the no-WebGL still
tools/landing_clips.py   the project page's clips, from frames filmed off the running exhibit
blender/build_all.py     gears + drivers (one master property drives everything)
blender/dials.py         plates, dials, pointers, rings, tubes, case, crank
blender/surface.py       UVs, textured bronze, baked ambient occlusion
blender/export_glb.py    static GLB with the driver rules as node extras
web/                     Vite + TypeScript + three.js exhibit
docs/                    the project page, renders, screenshots, clips, plans and research digests
```

Rates are rotations per year of b1, clockwise seen from the front positive. The same rule is written
three times, in Python, in the Blender drivers and in the web `GearGraph`, and the three are held
together by the tests: the glTF carries every driver rule as `am_*` node extras, so the browser turns
the machine from the same arithmetic Blender did.

Time is Julian Day throughout, on the proleptic Julian calendar for BC dates and astronomical years
(205 BC is −204). The epoch is the full moon of 12 May 205 BC (Carman & Evans), with 22 Dec 178 BC
(Voulgaris) as a switch; nothing in the exhibit uses a JavaScript `Date`.

## Running

The exhibit alone needs nothing but Node:

```
cd web && npm install && npm run dev        # http://localhost:5177
```

The machine rebuilds headless with Blender 5.1 closed, in two invocations:

```
python tools/gen_dial_textures.py
python tools/gen_surface_maps.py
blender -b --factory-startup --python-exit-code 1 --python blender/build_all.py -- --out build
blender -b build/antikythera.blend --python-exit-code 1 --python blender/dials.py --python blender/surface.py --python blender/export_glb.py
cd web && npx gltf-transform optimize ../dist/antikythera.glb public/models/antikythera.glb --texture-size 2048 --compress meshopt --texture-compress false --palette false --join false --flatten false
cd web && npx gltf-transform webp public/models/antikythera.glb public/models/antikythera.glb --quality 90
cd web && npx gltf-transform meshopt public/models/antikythera.glb public/models/antikythera.glb --level medium
```

Hero renders (Cycles): `blender -b build/antikythera.blend --python blender/hero_render.py` writes
`docs/renders/*.jpg`; then `python tools/gen_icons.py` refreshes the share image.

Deploy: `cd web && npm run build && cd .. && npx wrangler deploy --assets web/dist`. If the GLB or a
texture changed, bump `CACHE` in `web/public/sw.js` first so the service worker lets the new copy
through. The project page is `docs/index.html`, served by GitHub Pages from `main` `/docs`.

`NEXT_STEPS.md` is the maintenance guide, `NOTES.md` the decisions in order, `CLAUDE.md` the rebuild
order and the conventions that must not drift.

## Attributions

* Reconstruction: Freeth, Higgon, Dacanalis, MacDonald, Georgakopoulou & Wojcik, *A Model of the
  Cosmos in the ancient Greek Antikythera Mechanism*, Sci. Rep. 11:5821 (2021), CC BY 4.0, and the
  earlier AMRP papers (Freeth et al. 2006, 2008, 2012, 2014).
* Eclipse ground truth: "Eclipse Predictions by Fred Espenak and Jean Meeus (NASA's GSFC)", Five
  Millennium Canon of Solar and Lunar Eclipses. Ephemeris: astronomy-engine (Don Cross, MIT).
* Parapegma and front dial inscriptions: Bitsakis and Jones, "The Front Dial and Parapegma
  Inscriptions", Almagest 7.1 (2016), CC BY-NC 4.0.
* The games and the calendar: Iversen 2017, Hesperia 86. The calendar ring's holes: Woan & Bayley 2024.
  The teeth: Szigety & Arenas 2025 (a preprint).
* Epochs: Carman & Evans 2014 (12 May 205 BC); Voulgaris, Mouratidis & Vossinakis 2023 (22 Dec 178 BC).
* Fragment A's CT scan: Ashkan Pakzad, CC BY 4.0. The Moon's face: NASA's CGI Moon Kit (LROC colour
  mosaic), public domain. Rooms: Poly Haven HDRIs `studio_small_09` and `artist_workshop`, CC0.
  Layout reference: Thomas Weibel's CC BY reconstruction (thomasweibel.ch).
* Narration: ElevenLabs, the library voice "Arthur".

The parapegma's Greek wording and the Saros glyph hours beyond the surviving cells are schematic
reconstructions; the index letters stand where Bitsakis and Jones 2016 place them (see NOTES.md).
Built by Stewart Gregerson with Claude Code.
