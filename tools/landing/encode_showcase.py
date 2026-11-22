"""Encode the samizdatpublications.com showcase film and poster from captured frames.

    python tools/landing/encode_showcase.py                  # the story cut (showcase_story.json), the one in use
    python tools/landing/encode_showcase.py showcase_shot    # the turntable orbit of the machine taken apart

Story cut (showcase_story_tpl.js): frames 0..N-1 run box, open, apart, turn, home, closed. For the last `fade`
frames a second image a_*.jpg holds the same moment with the date put back to the start, and the film eases into
it, so its last frame flows into its first. The poster is frame 0 as a PNG.

Orbit (showcase_tpl.js): frames 0..n-1 are one full orbit; frames n..n+fade-1 repeat the camera angles of 0..fade-1
with the gears further on. The film starts at frame `start`, runs to n-1, then plays frames n..n+fade-1 easing back
into 0..fade-1 (only the gears crossfade), then 0..start-1. The poster is frame `start` as a PNG.
Run from the repo root.
"""
import json, os, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHOT = sys.argv[1] if len(sys.argv) > 1 else "showcase_story"
P = json.load(open(os.path.join(ROOT, "tools/landing", SHOT + ".json")))
SRC = os.path.join(ROOT, ".playwright-mcp/film", P["name"])
OUT = os.path.join(ROOT, "showcase")
W, H, fade = P["w"], P["h"], P["fade"]
fps = P.get("fps", 60)
os.makedirs(OUT, exist_ok=True)


def img(name):
    with Image.open(os.path.join(SRC, name)) as im:
        return im.convert("RGB")


if "ev" in P:                                           # story cut
    N = round(P["dur"] * fps)
    poster = 0

    def frames():
        for i in range(N):
            im = img(f"f_{i:04d}.jpg")
            j = i - (N - fade)
            if j >= 0:
                im = Image.blend(im, img(f"a_{i:04d}.jpg"), (j + 1) / fade)
            yield im
else:                                                   # orbit
    n, poster = P["n"], P.get("start", 0)

    def frames():
        for k in range(n):
            i = (poster + k) % n
            im = img(f"f_{i:04d}.jpg")
            if i < fade:
                im = Image.blend(img(f"f_{n + i:04d}.jpg"), im, i / fade)
            yield im

img(f"f_{poster:04d}.png").save(os.path.join(OUT, "poster.png"), optimize=True)
ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                       "-r", str(fps), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
                       "-profile:v", "high", "-movflags", "+faststart", "-an", os.path.join(OUT, "film.mp4")],
                      stdin=subprocess.PIPE)
for im in frames():
    ff.stdin.write(im.tobytes())
ff.stdin.close()
ff.wait()
print("done", ff.returncode)
