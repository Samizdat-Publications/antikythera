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

TOUR = [
    ("welcome", "iso",
     "Welcome. What you are looking at is a working reconstruction of the Antikythera mechanism, the geared astronomical calculator recovered from a shipwreck in 1901. "
     "Every one of its sixty-nine gears turns here with the tooth counts the researchers read from the X-ray scans, so the pointers move exactly as the bronze would have. "
     "This short walk-through shows you how to read it."),
    ("epoch", "front",
     "One idea makes everything else on this screen make sense: the machine has no clock inside it. It was set by hand once, on one particular day, and after that it only ever counts turns of the crank. "
     "That starting day is the epoch. Nothing on the bronze states it, so scholars had to work it out from the eclipse glyphs on the Saros dial: the pattern of fifty-one glyphs only fits certain starting months. "
     "Carman and Evans found the full moon of the twelfth of May, 205 BC; Voulgaris and his colleagues argue for the winter-solstice eclipse of December 178 BC. You can switch between them, and every dial re-sets. "
     "Because the machine only knows turns, every date here is written as years since epoch, and its errors grow the further you crank away from it."),
    ("zodiac", "front",
     "The front dial is the sky. The inner ring is the zodiac, twelve signs of thirty degrees; the outer ring is the Egyptian civil calendar of 365 days, which the owner could slip round by one day every four years. "
     "The date pointer reads the calendar; the true-sun pointer, with its little golden ball, reads the zodiac. Around the plate, the parapegma lists the risings and settings of stars, keyed to letters on the dial."),
    ("backdials", "back",
     "Turn the machine round. The upper spiral is the Metonic calendar: 235 months in five turns, nineteen years, named in the Corinthian dialect of north-west Greece. "
     "Inside it a small dial counts the seventy-six-year Callippic period, and another runs through the four-year cycle of the great games: Olympia, Pythia, Nemea, Isthmia. "
     "Both spiral pointers carry a pin that slides outward along the groove as the years pass."),
    ("explore", "iso",
     "That is the machine. Drag to orbit, scroll to zoom, hover any gear for its tooth count and rate, and click it to see its train alone. "
     "Inside lifts the plates away; Taken apart spreads every wheel along its arbor. "
     "Drag the crank handle to wind it by hand, jump to the next eclipse, type a year, or press today and see how far twenty-two centuries have carried the pointers. "
     "Share copies a link to whatever you have set up, and Save keeps the view as a picture. Enjoy the cosmos."),
    ("discovery", "front",
     "In 1901, sponge divers working a Roman-era shipwreck off the island of Antikythera brought up a corroded lump of bronze. "
     "Inside it were gears, thirty of them survive, cut by hand more than two thousand years ago. "
     "This is a working reconstruction of that machine, following the model published by Tony Freeth's team in 2021."),
    ("crank", "crank",
     "Everything begins at the crank on the right-hand side. One turn of the crank drives a 48-tooth crown wheel against the great 223-tooth main wheel. "
     "Four and two-thirds turns of the crank carry the main wheel once around: one year. Every pointer you see is geared off that single rotation."),
    ("moon", "front",
     "The moon pointer runs through a train of five gears whose tooth counts, 64, 38, 48, 24, 127 and 32, multiply out to exactly 254 over 19. "
     "That is the ancient Metonic relation: in 19 years the Moon circles the zodiac 254 times. The little half-silver ball turns once a lunar month, showing the phase."),
    ("pinslot", "back",
     "Hidden on the back is the machine's most astonishing device. Two 50-tooth gears sit face to face on axes offset by just over a millimetre, a pin on one riding in a slot on the other. "
     "As they turn, the slotted gear speeds up and slows down, adding a swing of six and a half degrees: the Moon's own acceleration near perigee. "
     "And because the pair rides on a great 223-tooth platform that creeps round once in nine years, the swing follows the slowly turning orbit of the Moon."),
    ("metonic", "back",
     "The upper back dial is a five-turn spiral of 235 cells, the months of the nineteen-year Metonic calendar, named in the Corinthian dialect of north-west Greece. "
     "A small pin on the pointer slides outward along the spiral, and two subsidiary dials count the seventy-six-year Callippic period and the four-year cycle of the Panhellenic games."),
    ("saros", "back",
     "The lower spiral is the eclipse predictor. Its 223 cells are the months of a Saros, after which eclipses repeat. "
     "Fifty-one cells carry glyphs: sigma for a lunar eclipse, eta for a solar one, with the hour of day. Because a Saros is a third of a day longer than 6,585 days, the small Exeligmos dial adds zero, eight or sixteen hours to the reading."),
    ("cosmos", "front",
     "On the front, the 2021 reconstruction adds a cosmos: rings for Mercury, Venus, Mars, Jupiter and Saturn, each driven by its own epicyclic module and marked with a coloured stone. "
     "The period relations come from the machine's own cover inscription, 462 years for Venus, 442 for Saturn, and reproduce the planets' retrograde loops."),
    ("xray", "front",
     "In 2005 a twelve-tonne X-ray tomography machine was carried to Athens and scanned the fragments slice by slice. "
     "Inside the crust were the gears, their teeth countable one by one, and two thousand characters of Greek that no one had read since antiquity. "
     "Here the reconstruction is laid inside the scan, so the wheels show through the corrosion. Everything that follows was built from those tooth counts."),
    ("sky", "front",
     "This is the same machine, drawn as a sky. Earth sits in the middle, and each body is placed where its own pin and slot puts it, trailing the path it has followed. "
     "The outer planets loop backwards each time the Earth overtakes them, and the loops these gears draw are the very ones Ptolemy drew, because his epicycles and these pins are the same idea. "
     "The green ticks on the rim are the true sky, so you can see for yourself how close the bronze comes."),
    ("accuracy", "front",
     "How good was it? Against a modern ephemeris the mean Sun drifts a fraction of a degree per century; the Moon, thanks to the pin and slot, stays within about two degrees. "
     "The eclipse glyphs land on real eclipses far more often than chance. Crank the handle, pick a year, and judge for yourself."),
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


def pick_voice():
    voices = api("/v1/voices")["voices"]
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
