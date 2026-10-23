import glob, os, subprocess, shutil
from PIL import Image
OUT = "out"
def frames(name): return sorted(glob.glob(f"film/{name}_*.jpg"))
def enc(src_pattern, out, fps=24, crf=23, extra=None):
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", src_pattern]
    if extra: cmd += extra
    cmd += ["-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out]
    subprocess.run(cmd, check=True)
def loop_clip(name, fade=24, crf=23):
    fs = frames(name); n = len(fs)
    d = f"loopf/{name}"; shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    # body: frames fade..n-1; the last `fade` frames are blended toward frames 0..fade-1 so the loop closes
    body = fs[fade:]
    for k, f in enumerate(body):
        im = Image.open(f)
        j = k - (len(body) - fade)
        if j >= 0:
            im = Image.blend(im, Image.open(fs[j]), (j + 1) / (fade + 1))
        im.save(f"{d}/f_{k:04d}.jpg", quality=92)
    enc(f"{d}/f_%04d.jpg", f"{OUT}/{name}.mp4", crf=crf)
    Image.open(f"{d}/f_0000.jpg").save(f"{OUT}/{name}.jpg", quality=84)
for name in ["hero", "fragment", "xray", "apart", "back", "pinslot"]:
    loop_clip(name)
# the sky's trails accumulate, so it plays once and holds rather than looping through a crossfade
fs = frames("sky")
enc("film/sky_%04d.jpg", f"{OUT}/sky.mp4", extra=["-vf", "tpad=stop_mode=clone:stop_duration=2"])
Image.open(fs[-1]).save(f"{OUT}/sky.jpg", quality=84)
# scroll scrub: 73 frames
for k, f in enumerate(frames("scrub")):
    Image.open(f).save(f"{OUT}/scrub/f{k:02d}.jpg", quality=76, optimize=True, progressive=True)
for n in ["vitrine", "manuscript"]:
    Image.open(f"film/ui_{n}.jpg").resize((1280, 800), Image.LANCZOS).save(f"{OUT}/{n}.jpg", quality=84, optimize=True)
# social card 1200x630 from the hero's first frame, centred
im = Image.open(frames("hero")[24]); W, H = im.size
im.crop(((W - 1371) // 2, 0, (W - 1371) // 2 + 1371, 720)).resize((1200, 630), Image.LANCZOS).save(f"{OUT}/og.jpg", quality=86)
print("done")
