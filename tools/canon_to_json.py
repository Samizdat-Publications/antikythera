"""Slim NASA's Five Millennium Catalogs of Solar and Lunar Eclipses (Espenak &
Meeus, NASA/TP-2008-214170 and NASA/TP-2009-214173) into JSON for the web app.

  python tools/canon_to_json.py

Reads  assets/raw/5MKSEcatalog.txt and 5MKLEcatalog.txt
Writes data/eclipses_solar.json and data/eclipses_lunar.json

Each row -> {jd, y, m, d, hh, type, saros, gamma, mag, dT, lat, lon}
  jd    : JD of greatest eclipse in Terrestrial Dynamical Time (TD); the catalog
          dates are Julian calendar before 1582-10-15 and Gregorian after.
  type  : solar P/A/T/H (with NASA's suffix letters), lunar N/P/T
Attribution required: "Eclipse Predictions by Fred Espenak and Jean Meeus (NASA's GSFC)".
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))
from mech.jd import civil_to_jdn  # noqa: E402

MONTHS = {m: i + 1 for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split())}
ROW = re.compile(r"^\s*(\d+)\s+(?:(\d{3})\s+)?(-?\d+)\s+([A-Z][a-z]{2})\s+(\d+)\s+(\d\d):(\d\d):(\d\d)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(\S+)\s+(\S+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(.*)$")
LATLON = re.compile(r"(\d+(?:\.\d+)?)([NS])\s+(\d+(?:\.\d+)?)([EW])")


def parse(path, lunar):
    out = []
    for line in open(path, encoding="latin-1"):
        m = ROW.match(line)
        if not m:
            continue
        cat, plate, y, mon, d, hh, mm, ss, dT, luna, saros, typ, q, gamma, mag, rest = m.groups()
        y, d = int(y), int(d)
        jdn = civil_to_jdn(y, MONTHS[mon], d)
        frac = (int(hh) + int(mm) / 60 + int(ss) / 3600) / 24
        jd = jdn - 0.5 + frac
        row = {"jd": round(jd, 5), "y": y, "m": MONTHS[mon], "d": d,
               "hh": round(frac * 24, 3), "type": typ, "saros": int(saros),
               "gamma": float(gamma), "mag": float(mag), "dT": int(dT), "luna": int(luna)}
        if lunar:
            parts = rest.split()
            # rest: umbral mag, then durations (pen, par, total as available), then lat lng
            try:
                row["umag"] = float(parts[0])
            except (ValueError, IndexError):
                pass
        ll = LATLON.search(rest)
        if ll:
            lat = float(ll.group(1)) * (1 if ll.group(2) == "N" else -1)
            lon = float(ll.group(3)) * (1 if ll.group(4) == "E" else -1)
            row["lat"], row["lon"] = lat, lon
        out.append(row)
    return out


def main():
    raw = ROOT / "assets" / "raw"
    (ROOT / "data").mkdir(exist_ok=True)
    solar = parse(raw / "5MKSEcatalog.txt", lunar=False)
    lunar = parse(raw / "5MKLEcatalog.txt", lunar=True)
    for name, rows in (("eclipses_solar.json", solar), ("eclipses_lunar.json", lunar)):
        with open(ROOT / "data" / name, "w", encoding="utf-8") as fh:
            json.dump({"source": "Eclipse Predictions by Fred Espenak and Jean Meeus (NASA's GSFC)",
                       "catalog": "Five Millennium Catalog", "rows": rows}, fh, separators=(",", ":"))
        print(name, len(rows), "rows; first", rows[0]["y"], rows[0]["m"], rows[0]["d"], "last", rows[-1]["y"])
    # spot checks
    t2024 = [r for r in solar if r["y"] == 2024 and r["m"] == 4]
    print("2024-04 solar:", t2024)
    bc205 = [r for r in lunar if r["y"] == -204]
    print("205 BC lunar:", [(r["m"], r["d"], r["type"]) for r in bc205])


if __name__ == "__main__":
    main()
