"""Minimal Gemini client. Reads GEMINI_API_KEY from the project .env and never prints it."""
import base64
import json
import os
import re
import urllib.error
import urllib.request

ROOT = r"C:\Users\stewa\OneDrive\Documents\Claude\Blender Tests\antikythera"
API = "https://generativelanguage.googleapis.com/v1beta"


def key():
    txt = open(os.path.join(ROOT, ".env"), encoding="utf-8-sig").read()
    m = re.search(r"GEMINI_API_KEY\s*=\s*(\S+)", txt)
    if not m:
        raise SystemExit("GEMINI_API_KEY not found in .env")
    return m.group(1)


def call(path, payload=None, timeout=180):
    req = urllib.request.Request(
        f"{API}/{path}",
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={"x-goog-api-key": key(), "Content-Type": "application/json"},
        method="POST" if payload is not None else "GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:600]
        raise SystemExit(f"HTTP {e.code}: {body}")


def generate_image(model, prompt, out_path, images=None, aspect=None):
    """images: list of local file paths to send alongside the prompt."""
    parts = [{"text": prompt}]
    for p in images or []:
        ext = os.path.splitext(p)[1].lower()
        mime = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                ".webp": "image/webp"}.get(ext, "image/png")
        with open(p, "rb") as fh:
            parts.append({"inline_data": {"mime_type": mime,
                                          "data": base64.b64encode(fh.read()).decode()}})
    body = {"contents": [{"parts": parts}]}
    if aspect:
        body["generationConfig"] = {"imageConfig": {"aspectRatio": aspect}}
    res = call(f"models/{model}:generateContent", body)
    saved, text = [], []
    for cand in res.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            blob = part.get("inline_data") or part.get("inlineData")
            if blob and blob.get("data"):
                with open(out_path, "wb") as fh:
                    fh.write(base64.b64decode(blob["data"]))
                saved.append(out_path)
            elif part.get("text"):
                text.append(part["text"])
    return {"saved": saved, "text": " ".join(text)[:400],
            "finish": [c.get("finishReason") for c in res.get("candidates", [])]}


if __name__ == "__main__":
    models = call("models").get("models", [])
    print(f"{len(models)} models visible\n")
    img = [m for m in models
           if "image" in m["name"].lower()
           or "IMAGE" in "".join(m.get("supportedGenerationMethods", []))]
    print("-- image-related --")
    for m in img:
        print(f"  {m['name'].replace('models/', '')}")
        print(f"      methods: {','.join(m.get('supportedGenerationMethods', []))}")
    if not img:
        print("  none")
