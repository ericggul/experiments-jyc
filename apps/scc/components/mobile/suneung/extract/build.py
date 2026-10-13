"""Turn extractor output into a clone's page data: figures named, the area-title raster and glyph images set as text.

usage: python -I build.py <out.json> <pages.json> <config.json>
config: {"title": "국어 영역", "figures": {"<xref>": "<figure id>"}, "glyphs": {"<xref>": "<char>"}}
"""
import json
import sys

src, dst, cfg = sys.argv[1], sys.argv[2], json.load(open(sys.argv[3]))
P = json.load(open(src))
FIG = {int(k): v for k, v in cfg["figures"].items()}
GLYPH = {int(k): v for k, v in cfg.get("glyphs", {}).items()}


def is_title(it):
    # the area name (국어 영역, 수학 영역) is a raster in the cover and running headers
    return it["k"] == "title" or (it["k"] == "img" and it["y"] < 200 and 25 < it["h"] < 46 and it["w"] > 100 and it.get("xref") not in FIG)


for page in P:
    items, figs = [], {}
    lines = [it for it in page["items"] if it["k"] == "line"]
    for it in page["items"]:
        if is_title(it):
            items.append({"k": "line", "id": it["id"], "x": it["x"], "y": round(it["y"] + it["h"] * 0.885, 2), "w": it["w"],
                          "s": round(it["h"] * 0.98, 2), "runs": [{"t": cfg["title"], "f": "gt", "x": 0, "w": it["w"], "e": it["w"]}]})
        elif it["k"] == "img" and it["xref"] in GLYPH:
            near = [l for l in lines if abs(l["y"] - (it["y"] + it["h"])) < 3]
            base = min(near, key=lambda l: abs(l["x"] - it["x"])) if near else None
            items.append({"k": "line", "id": it["id"], "x": it["x"], "y": base["y"] if base else it["y"] + it["h"],
                          "w": it["w"], "s": base["s"] if base else 10.93,
                          "runs": [{"t": GLYPH[it["xref"]], "f": "m", "x": 0, "w": it["w"], "e": it["w"]}]})
        elif it["k"] == "img":
            name = FIG[it["xref"]]
            if name in figs:
                f = figs[name]
                x1, y1 = max(f["x"] + f["w"], it["x"] + it["w"]), max(f["y"] + f["h"], it["y"] + it["h"])
                f["x"], f["y"] = min(f["x"], it["x"]), min(f["y"], it["y"])
                f["w"], f["h"] = round(x1 - f["x"], 2), round(y1 - f["y"], 2)
            else:
                f = {"k": "fig", "id": name, "x": it["x"], "y": it["y"], "w": it["w"], "h": it["h"]}
                figs[name] = f
                items.append(f)
        elif it["k"] == "line" and "".join(r["t"] for r in it["runs"]).startswith("이 문제지에 관한 저작권은"):
            continue  # the KICE copyright footer is left out of the clone
        else:
            items.append(it)
    for it in items:
        if it["k"] == "line":
            for i, run in enumerate(it["runs"]):
                run["id"] = f"{it['id']}.{i}"
    page["items"] = items
json.dump(P, open(dst, "w"), ensure_ascii=False, separators=(",", ":"))
print("ok", sum(len(p["items"]) for p in P))
