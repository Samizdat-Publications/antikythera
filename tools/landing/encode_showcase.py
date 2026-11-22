"""Encode the samizdatpublications.com showcase film and poster from the frames showcase_tpl.js wrote.

Frames 0..n-1 are one full orbit; frames n..n+fade-1 repeat the camera angles of 0..fade-1 with the gears
further on. The film starts at frame `start` (the opening view), runs to n-1, then plays frames n..n+fade-1
easing back into 0..fade-1 (only the gears crossfade, the camera never jumps), then 0..start-1. Its last frame
is start-1, so the loop closes without a seam. The poster is frame `start` as a PNG, the film's first frame.
Run from the repo root: python tools/landing/encode_showcase.py
"""
import json, os, subprocess
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = json.load(open(os.path.join(ROOT, "tools/landing/showcase_shot.json")))
SRC = os.path.join(ROOT, ".playwright-mcp/film", P["name"])
OUT = os.path.join(ROOT, "showcase")
n, fade, W, H, start = P["n"], P["fade"], P["w"], P["h"], P.get("start", 0)
os.makedirs(OUT, exist_ok=True)


def frame(i):
    with Image.open(os.path.join(SRC, f"f_{i:04d}.jpg")) as im:
        return im.convert("RGB")


with Image.open(os.path.join(SRC, f"f_{start:04d}.png")) as im:
    im.convert("RGB").save(os.path.join(OUT, "poster.png"), optimize=True)
ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                       "-r", "60", "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
                       "-profile:v", "high", "-movflags", "+faststart", "-an", os.path.join(OUT, "film.mp4")],
                      stdin=subprocess.PIPE)
for k in range(n):
    i = (start + k) % n
    im = frame(i)
    if i < fade:
        late = frame(n + i)
        im = Image.blend(late, im, i / fade)
    ff.stdin.write(im.tobytes())
    del im
ff.stdin.close()
ff.wait()
print("done", ff.returncode)
