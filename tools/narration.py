"""Guided-tour narration and sound effects via ElevenLabs.

    python tools/narration.py            # writes web/public/audio/*.mp3 + tour.json

Reads ELEVENLABS_API_KEY from the environment and never prints it.
"""
import base64
import json
import os
import sys
import urllib.request

KEY = os.environ.get("ELEVENLABS_API_KEY")
if not KEY:
    sys.exit("ELEVENLABS_API_KEY not set")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "web", "public", "audio")
os.makedirs(OUT, exist_ok=True)

# One clip per walkthrough leaf, in the order of STEPS in web/src/ui/onboarding.ts. Each is the
# leaf's body said aloud: keep the two in step when either changes.
TOUR = [
    ("welcome", "iso",
     "Welcome. This is a working reconstruction of the Antikythera mechanism, the geared astronomical calculator "
     "recovered from a Roman-era shipwreck in 1901. Thirty of its gears survive in the fragments, most with their tooth counts "
     "estimated from broken rims in the X-ray scans. The other thirty-nine follow the model Tony Freeth's team published in 2021. "
     "All sixty-nine turn here at the ratios their teeth give, so every pointer moves as that model says the bronze would have."),
    ("discovery", "front",
     "In 1901, sponge divers working a Roman-era wreck off the island of Antikythera brought up a corroded lump of bronze. "
     "It lay unregarded until May 1902, when the archaeologist Valerios Stais saw a gearwheel in it. "
     "Today it is eighty-two fragments, about a third of the machine, in the National Archaeological Museum in Athens. "
     "This is Fragment A, the largest, from a CT scan of the original. Two thousand years of seawater have turned the metal to a crust of corrosion, "
     "but the four spokes of the main wheel still show through it."),
    ("xray", "front",
     "In 2005 an eight-tonne X-ray machine was shipped to Athens, and scanned the fragments slice by slice. "
     "Inside the crust were the gears, their teeth countable where the rims survive, and thousands of letters of Greek, "
     "many of them read for the first time since antiquity. "
     "Here the reconstruction is laid inside the scan, so the wheels show through the corrosion."),
    ("crank", "crank",
     "Everything begins at the crank on the right-hand side. It turns a forty-eight-tooth crown wheel against the great "
     "two-hundred-and-twenty-three-tooth main wheel. "
     "About four and two-thirds turns of the crank carry the main wheel once around: one year. "
     "Every other pointer is geared off that single rotation."),
    ("epoch", "front",
     "The machine has no clock inside it. It was set by hand once, on one particular day, and after that it only ever counts turns. "
     "That day is the epoch. Nothing on the bronze states it, so scholars worked it out from the eclipse glyphs on the Saros dial: "
     "the pattern of fifty-one glyphs fits only certain starting months. "
     "Carman and Evans found the full moon of the twelfth of May, 205 BC; Voulgaris and his colleagues argue for the eclipse of December 178 BC. "
     "Switch between them, and every dial re-sets. The epoch is a setting, not the day it was made: the wreck went down around 70 to 60 BC. "
     "Because the machine only knows turns, dates here are written as years since the epoch, and its errors grow the further you crank from it."),
    ("zodiac", "front",
     "The front dial is the sky. The inner ring is the zodiac, twelve signs of thirty degrees. "
     "The outer ring names the months of the Egyptian calendar, drawn here with its 365 days as the 2021 model has it, "
     "so the owner could slip it round a day every four years. A 2024 recount of the holes beneath the ring points to 354, a lunar year, "
     "so how it was kept in step is still argued over. "
     "The date pointer reads this ring; the true-sun pointer, with its golden ball, reads the zodiac. "
     "The plates above and below carry the parapegma, a list of star risings and settings, keyed to letters on the dial."),
    ("moon", "front",
     "The moon pointer is driven through three pairs of gears: sixty-four on thirty-eight, forty-eight on twenty-four, "
     "and a hundred and twenty-seven on thirty-two. "
     "Multiplied out, they give exactly 254 over 19: in nineteen years the Moon circles the zodiac 254 times, the Metonic relation. "
     "The little ball, half pale and half dark, turns once a lunar month, driven by the difference between the sun and moon pointers, "
     "and shows the phase. Watch it now, at a month a second. The Moon in the column is lit the way the ball is."),
    ("pinslot", "back",
     "Hidden at the back is the machine's most astonishing device. Two fifty-tooth gears sit face to face on axes offset by "
     "just over a millimetre, a pin on one riding in a slot on the other. As they turn, the slotted gear speeds up and slows down "
     "by six and a half degrees: the Moon's own acceleration near perigee. And because the pair rides on a platform that creeps "
     "round once in nine years, the swing follows the slowly turning orbit of the Moon. "
     "Nothing this intricate survives from the next thousand years."),
    ("backdials", "back",
     "Turn the machine round. The upper spiral is the Metonic calendar: 235 months in five turns, nineteen years. "
     "Its month names belong to a Corinthian family of calendars, most likely that of Epirus, in north-west Greece. "
     "Inside it, one small dial counts the seventy-six-year Callippic period, and another the four-year cycle of the games: "
     "the Isthmia, Olympia, Nemea and Pythia, and two lesser games, the Naa at Dodona and the Halieia of Rhodes. "
     "Both spiral pointers carry a pin that slides outward along the groove as the years pass."),
    ("saros", "back",
     "The lower spiral is the eclipse predictor. Its 223 cells are the months of a Saros, after which eclipses repeat. "
     "Fifty-one cells carry glyphs: sigma for an eclipse of the Moon, eta for one of the Sun, with the hour. "
     "A Saros is a third of a day longer than 6,585 days, so the small Exeligmos dial adds nought, eight or sixteen hours. "
     "The panel compares the glyph in the current cell with NASA's catalogue of real eclipses. "
     "We have jumped to the next eclipse of the Moon."),
    ("cosmos", "front",
     "The 2021 reconstruction adds a cosmos on the front: rings for Mercury, Venus, Mars, Jupiter and Saturn, "
     "each with its own epicyclic module and a coloured stone. Two periods are read on the cover inscription, "
     "462 years for Venus and 442 for Saturn; the others, and all the planetary gearing, are the 2021 team's reconstruction. "
     "Watch the red stone of Mars now. Its ring slows, stops, and runs backwards through its retrograde loop."),
    ("sky", "front",
     "This is the same machine, drawn as a sky. Earth sits in the middle, and each body is placed where its own pin and slot puts it, "
     "trailing the path it has followed. The outer planets loop backwards each time the Earth overtakes them. "
     "These are the loops a Greek epicycle predicts, the geometry of Apollonius and Hipparchus that Ptolemy later refined. "
     "The green ticks on the rim are the true sky, so you can see for yourself how close the bronze comes."),
    ("accuracy", "front",
     "How good was it? Against a modern ephemeris the mean Sun drifts a fraction of a degree a century. "
     "The Moon, thanks to the pin and slot, stays within about two degrees. "
     "Over three Saros cycles most of the lunar glyphs land on real eclipses, and every solar glyph falls in a month with an "
     "eclipse of the Sun somewhere on Earth, though many could not have been seen from Greece. "
     "One caution. These wheels are cut perfectly, and the originals were filed by hand. "
     "A 2025 study argues that teeth as uneven as those measured would have jammed, so either the maker worked finer than "
     "the corroded remains now show, or it never ran this smoothly."),
    ("explore", "iso",
     "That is the machine. Drag to orbit, scroll to zoom, hover any gear for its tooth count and rate, and click it to see its train alone. "
     "Inside lifts the plates away; Taken apart spreads every wheel along its arbor. "
     "Drag the crank handle to wind it by hand, jump to the next eclipse, type a year, "
     "or press today, and see how far twenty-two centuries have carried the pointers. "
     "Share copies a link to whatever you have set up, and save keeps the view as a picture. Enjoy the cosmos."),
]

SFX = {
    "crank_loop": ("Slow steady mechanical ratchet of a hand crank turning a bronze gear train, soft clicking, seamless loop, no music", 4.0, True),
    "gear_tick": ("Single soft click of a small bronze gear tooth engaging, dry, close, very short", 0.5, False),
    "eclipse_chime": ("Deep soft resonant bronze bowl strike, single note, long gentle decay", 4.0, False),
}


def api(path, data=None, raw=False):
    req = urllib.request.Request(
        "https://api.elevenlabs.io" + path,
        data=json.dumps(data).encode() if data is not None else None,
        headers={"xi-api-key": KEY, "Content-Type": "application/json"},
        method="POST" if data is not None else "GET",
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read() if raw else json.loads(r.read().decode())


# Arthur ("Classic, British and Steady"), an older British documentary voice from the ElevenLabs
# library, chosen by Stewart on 2026-09-24 from four auditions; added to the account's library, so
# it is found by id. The fallbacks below only matter if it is ever removed.
VOICE_ID = "8ZBQD0m1R6EIchgSltwB"


def pick_voice():
    voices = api("/v1/voices")["voices"]
    for v in voices:
        if v["voice_id"] == VOICE_ID:
            return v
    prefs = ("George", "Daniel", "Brian", "Adam", "Bill")
    for name in prefs:
        for v in voices:
            if v["name"] == name:
                return v
    for v in voices:
        labels = v.get("labels") or {}
        if "narrat" in (labels.get("use_case", "") + labels.get("description", "")).lower():
            return v
    return voices[0]


def main():
    voice = pick_voice()
    print("voice:", voice["name"])
    # the durations of clips already on disk are not re-measured: they are carried over from the
    # manifest of the last run, so regenerating one leaf does not null the other thirteen
    known = {}
    try:
        with open(os.path.join(OUT, "tour.json"), encoding="utf-8") as fh:
            known = {c["id"]: c.get("duration") for c in json.load(fh)["clips"]}
    except (OSError, ValueError, KeyError):
        pass
    manifest = {"voice": voice["name"], "clips": []}
    for key, view, text in TOUR:
        mp3 = os.path.join(OUT, f"tour_{key}.mp3")
        if not os.path.exists(mp3):
            res = api(f"/v1/text-to-speech/{voice['voice_id']}/with-timestamps",
                      {"text": text, "model_id": "eleven_multilingual_v2",
                       "voice_settings": {"stability": 0.55, "similarity_boost": 0.8, "style": 0.25}})
            with open(mp3, "wb") as fh:
                fh.write(base64.b64decode(res["audio_base64"]))
            al = res["alignment"]
            dur = al["character_end_times_seconds"][-1]
        else:
            dur = known.get(key)
        manifest["clips"].append({"id": key, "view": view, "text": text, "file": f"audio/tour_{key}.mp3", "duration": dur})
        print("clip", key, dur)
    for key, (prompt, dur, loop) in SFX.items():
        mp3 = os.path.join(OUT, f"sfx_{key}.mp3")
        if os.path.exists(mp3):
            continue
        try:
            audio = api("/v1/sound-generation", {"text": prompt, "duration_seconds": dur, "prompt_influence": 0.4, "loop": loop}, raw=True)
            with open(mp3, "wb") as fh:
                fh.write(audio)
            print("sfx", key, len(audio))
        except Exception as e:
            print("sfx", key, "FAILED", e)
    with open(os.path.join(OUT, "tour.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=1)


if __name__ == "__main__":
    main()
