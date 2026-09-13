"""Generate the few photographic textures with Gemini (wood for the case, parchment for the UI)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import gem
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "textures")
os.makedirs(OUT, exist_ok=True)
MODEL = "gemini-3.1-flash-image"
JOBS = {
    "wood_case.png": "Seamless tileable texture, top-down flat photograph of ancient dark olive wood planking with fine straight grain, aged and oiled, matte, even diffuse lighting, no shadows, no objects, no text, square, photorealistic, 4k detail",
    "parchment.png": "Seamless tileable texture, flat top-down photo of aged dark papyrus / parchment, warm brown, subtle fibres, very low contrast, no text, no objects, even lighting, square",
    "bronze_patina.png": "Seamless tileable texture, flat top-down macro photo of ancient cast bronze surface with light green-brown patina, fine pitting, mostly warm bronze, subtle, even diffuse lighting, no text, square",
}
for name, prompt in JOBS.items():
    p = os.path.join(OUT, name)
    if os.path.exists(p):
        print("exists", name); continue
    r = gem.generate_image(MODEL, prompt, p, aspect="1:1")
    print(name, r["saved"], r["finish"], r["text"][:80])
