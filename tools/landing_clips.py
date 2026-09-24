"""Frames filmed from the running exhibit, turned into the project page's clips.

The frames come from a capture harness run in the page (see docs/plans/2026-09-24-landing.md):
the crank is stopped, the date stepped by hand, and each frame read straight off the WebGL canvas,
so the motion is exact and does not depend on how fast a browser can take screenshots. They arrive
as JSON ({"frames": [data URLs], "dates": [...]}) in .playwright-mcp/cap_<name>.json.

    python tools/landing_clips.py hero            # docs/landing/hero/f00.jpg ... and dates.json
    python tools/landing_clips.py clip NAME [--ui SHOT.png --rect x,y,w,h --keep x,y,w,h ...]

A clip is an animated WebP (quality 72, 100 ms a frame, looping) plus a JPEG poster of its first
frame. With --ui, each frame is laid into a full-page screenshot of the exhibit at --rect (the stage
canvas), and the --keep regions of the screenshot (the walkthrough card, the view bar) are put back
on top, so the clip shows the whole page with only the machine moving.
"""
import base64
import io
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAP = os.path.join(ROOT, ".playwright-mcp")
OUT = os.path.join(ROOT, "docs", "landing")


def frames(name):
    with open(os.path.join(CAP, f"cap_{name}.json"), encoding="utf-8") as fh:
        data = json.load(fh)
    if isinstance(data, str):                                   # the tool may wrap the result as a string
        data = json.loads(data)
    ims = [Image.open(io.BytesIO(base64.b64decode(u.split(",", 1)[1]))).convert("RGB") for u in data["frames"]]
    return ims, data.get("dates", [])


def box(s):
    return tuple(int(round(float(v))) for v in s.split(","))


def hero():
    ims, dates = frames("hero")
    d = os.path.join(OUT, "hero")
    os.makedirs(d, exist_ok=True)
    for i, im in enumerate(ims):
        im.save(os.path.join(d, f"f{i:02d}.jpg"), quality=78, optimize=True, progressive=True)
    with open(os.path.join(d, "dates.json"), "w", encoding="utf-8") as fh:
        json.dump([s.split("|") for s in dates], fh)
    print("hero", len(ims), "frames", sum(os.path.getsize(os.path.join(d, f)) for f in os.listdir(d)) // 1024, "KB")


def clip(name, argv):
    ims, _ = frames(name)
    ui = rect = None
    keeps = []
    width = 960
    i = 0
    while i < len(argv):
        if argv[i] == "--ui": ui = Image.open(argv[i + 1]).convert("RGB"); i += 2
        elif argv[i] == "--rect": rect = box(argv[i + 1]); i += 2
        elif argv[i] == "--keep": keeps.append(box(argv[i + 1])); i += 2
        elif argv[i] == "--width": width = int(argv[i + 1]); i += 2
        else: raise SystemExit(f"unknown argument {argv[i]}")
    out = []
    for im in ims:
        if ui is not None:
            x, y, w, h = rect
            page = ui.copy()
            page.paste(im.resize((w, h), Image.LANCZOS), (x, y))
            for kx, ky, kw, kh in keeps:
                page.paste(ui.crop((kx, ky, kx + kw, ky + kh)), (kx, ky))
            im = page
        hgt = round(width * im.height / im.width)
        out.append(im.resize((width, hgt), Image.LANCZOS))
    os.makedirs(os.path.join(OUT, "clips"), exist_ok=True)
    webp = os.path.join(OUT, "clips", f"{name}.webp")
    out[0].save(webp, save_all=True, append_images=out[1:], duration=100, loop=0, quality=72, method=5)
    poster = os.path.join(OUT, "clips", f"{name}.jpg")
    out[0].save(poster, quality=82, optimize=True, progressive=True)
    print(name, len(out), "frames", out[0].size, os.path.getsize(webp) // 1024, "KB webp,", os.path.getsize(poster) // 1024, "KB poster")


def leaf(name):
    """A walkthrough leaf: the page screenshot .playwright-mcp/ui_<name>.png, with the stage, card and
    view bar placed from the rectangles the capture recorded."""
    with open(os.path.join(CAP, f"cap_{name}.json"), encoding="utf-8") as fh:
        data = json.load(fh)
    if isinstance(data, str):
        data = json.loads(data)
    ui_rects = os.path.join(CAP, f"ui_{name}.json")                # the page retaken later: its own rectangles win
    if os.path.exists(ui_rects):
        with open(ui_rects, encoding="utf-8") as fh:
            r = json.load(fh)
        data.update(json.loads(r) if isinstance(r, str) else r)
    argv = ["--ui", os.path.join(CAP, f"ui_{name}.png"), "--rect", data["rect"], "--width", "1200"]
    for k in ("card", "hud"):
        if data.get(k):
            x, y, w, h = box(data[k])
            argv += ["--keep", f"{x - 2},{y - 2},{w + 4},{h + 4}"]
    clip(name, argv)


if __name__ == "__main__":
    if sys.argv[1] == "hero":
        hero()
    elif sys.argv[1] == "leaf":
        for n in sys.argv[2:]:
            leaf(n)
    else:
        clip(sys.argv[2], sys.argv[3:])
