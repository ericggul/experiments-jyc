"""Extract the 2026 수능 국어 홀수형 PDF into DOM-ready page data.

usage: python -I extract.py <pdf> <out.json> <first> <last>
"""
import json
import math
import sys

import pymupdf

PDF, OUT, FIRST, LAST = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
SEP_X = 421.0  # column separator

FONT_CLASS = {
    "신명-중명조": "m", "한양신명조": "m", "명조": "m", "Batang": "m",
    "HaansoftBatang": "m", "BatangChe": "m", "신명-신그래픽": "gb", "옛한글": "m",
    "신명-견명조": "mb", "한양견명조": "mb",
    "신명-중고딕": "g", "신명-디나루": "d", "GulimChe": "g",
    "신명-태고딕": "gb", "#태고딕": "gb", "신명-태그래픽": "gb",
    "한양견고딕": "gx",
    "HyhwpEQ": "e",
}


# 한컴 private-use glyphs (옛한글, 겹낫표) read against the printed page.
PUA = {
    "\uf3b0": "\u110f\u1169\u11f0",  # 코ᇰ
    "\ue7c0": "\u1123\u1162",  # ᄣᅢ
    "\ued7f": "\u1140\u1175",  # ᅀᅵ
    "\ue1a7": "\u1100\u119e",  # ᄀᆞ
    "\ue38b": "\u1103\u119e\u11a8",  # ᄃᆞᆨ
    "\U000f0854": "『",
    "\U000f0855": "』",
}


# HyhwpEQ (HWP 수식) carries no ToUnicode map; glyph ids read from the embedded font.
# e: upright roman, ei: italic. Glyph 358 is the fraction bar and becomes a rule.
EQ = {}
for gid, ch in zip(range(53, 61), "ABCDEFGH"):
    EQ[gid] = (ch, "e")
EQ.update({67: ("O", "e"), 68: ("P", "e"), 69: ("Q", "e"), 74: ("V", "e"),
           85: ("a", "e"), 87: ("c", "e"), 91: ("g", "e"), 93: ("i", "e"), 96: ("l", "e"), 97: ("m", "e"),
           98: ("n", "e"), 99: ("o", "e"), 103: ("s", "e"), 104: ("t", "e"),
           124: ("∪", "e"), 156: ("≤", "e"), 157: ("≥", "e"), 166: ("→", "e"), 185: ("×", "e"), 187: ("∘", "e"),
           195: ("≠", "e"), 211: ("∞", "e"), 221: ("∠", "e"), 249: ("A", "e"), 250: ("B", "e"), 251: ("C", "e"),
           254: ("F", "e"), 267: ("S", "e"), 268: ("T", "e"), 272: ("X", "e"), 274: ("Z", "e"),
           310: ("0", "e"), 317: ("(", "e"), 318: (")", "e"), 319: ("−", "e"), 320: ("=", "e"), 321: ("+", "e"),
           324: ("{", "e"), 325: ("}", "e"), 328: (":", "e"), 331: (",", "e"), 332: (".", "e"), 334: ("<", "e"),
           335: (">", "e"), 340: ("∫", "e"), 341: ("√", "e"), 352: ("Σ", "e"), 359: ("→", "e"),
           369: ("⎧", "e"), 370: ("⎨", "e"), 371: ("⎩", "e"), 372: ("⎪", "e"), 505: ("|", "e"),
           413: ("θ", "ei"), 421: ("π", "ei")})
for gid, ch in zip(range(301, 310), "123456789"):
    EQ[gid] = (ch, "e")
for gid, ch in zip([478, 479, 480, 481, 482, 483, 484, 485, 486, 488, 489, 490, 491, 493, 494, 496, 497, 499, 501, 502, 503],
                   "abcdefghiklmnpqstvxyz"):
    EQ[gid] = (ch, "ei")
FRACTION_BAR = 358


def dec(name):
    try:
        name = name.encode("latin-1").decode("cp949")
    except Exception:
        pass
    name = name.split("+")[-1].lstrip("*").replace("-Identity-H", "")
    return name


def fclass(name):
    n = dec(name)
    if n not in FONT_CLASS:
        raise SystemExit(f"unknown font {n}")
    return FONT_CLASS[n]


def r1(v):
    return round(v, 2)


def hexcolor(c):
    if c is None:
        return None
    if isinstance(c, int):
        r, g, b = (c >> 16) & 255, (c >> 8) & 255, c & 255
    else:
        r, g, b = (round(x * 255) for x in c[:3])
    if (r, g, b) == (0, 0, 0):
        return None
    return f"#{r:02x}{g:02x}{b:02x}"


def covered(bbox, fills, seqno):
    x0, y0, x1, y1 = bbox
    for f in fills:
        if f["seqno"] > seqno and f["x0"] <= x0 + 0.5 and f["y0"] <= y0 + 0.5 and f["x1"] >= x1 - 0.5 and f["y1"] >= y1 - 0.5:
            return True
    return False


SEP_TOP = [148.0]


def column(x, y):
    if y < SEP_TOP[0] or y > 1068:
        return 2
    return 0 if x < SEP_X else 1


def extract_page(page, pno):
    drawings = page.get_drawings()
    white_fills = []
    for d in drawings:
        if d["type"] == "f" and d.get("fill") and all(v > 0.99 for v in d["fill"]):
            r = d["rect"]
            white_fills.append({"seqno": d["seqno"], "x0": r.x0, "y0": r.y0, "x1": r.x1, "y1": r.y1})

    # the cover header hides the top of the column separator
    SEP_TOP[0] = max([148.0] + [f["y1"] for f in white_fills if f["x0"] < SEP_X < f["x1"] and f["y0"] < 150])

    # ---------- text ----------
    chars = []
    bars = []
    for t in page.get_texttrace():
        if t["type"] == 3 or t["opacity"] == 0:
            continue
        if covered(t["bbox"], white_fills, t["seqno"]):
            continue
        fc = fclass(t["font"])
        color = hexcolor(t["color"])
        for (uc, gid, origin, bbox) in t["chars"]:
            if uc == 0x200B:
                continue
            if fc == "e":
                if gid == FRACTION_BAR:
                    bars.append({"x0": bbox[0], "x1": bbox[2], "oy": origin[1], "seq": t["seqno"]})
                    continue
                if gid not in EQ:
                    raise SystemExit(f"unmapped equation glyph {gid} on page {pno}")
                c, ec = EQ[gid]
                chars.append({"c": c, "x0": bbox[0], "x1": bbox[2], "ox": origin[0], "oy": origin[1],
                              "size": t["size"], "f": ec, "color": color, "seq": t["seqno"]})
                continue
            c = chr(uc)
            if c not in PUA and (0xE000 <= uc <= 0xF8FF or uc >= 0xF0000):
                raise SystemExit(f"unmapped private-use glyph U+{uc:X} on page {pno}")
            chars.append({
                "c": PUA.get(c, c), "x0": bbox[0], "x1": bbox[2], "ox": origin[0], "oy": origin[1],
                "size": t["size"], "f": fc, "color": color, "seq": t["seqno"],
            })

    # HWP sets 진하게 on some faces by overprinting each glyph slightly shifted;
    # keep one copy and mark it bold.
    kept = []
    for ch in sorted(chars, key=lambda c: (round(c["oy"]), c["ox"])):
        twin = next((k for k in kept[-6:] if k["c"] == ch["c"] and abs(k["ox"] - ch["ox"]) < 1.2 and abs(k["oy"] - ch["oy"]) < 1.0), None)
        if twin is not None:
            twin["bold"] = True
            continue
        kept.append(ch)
    for ch in kept:
        if ch.get("bold"):
            ch["f"] = {"m": "mb", "g": "gb", "d": "gb", "gb": "gh"}.get(ch["f"], ch["f"])
    chars = kept

    # group chars into lines by column + baseline
    lines = []
    for ch in sorted(chars, key=lambda c: (c["oy"], c["ox"])):
        col = column((ch["x0"] + ch["x1"]) / 2, ch["oy"])
        for ln in lines:
            if ln["col"] == col and abs(ln["oy"] - ch["oy"]) < 0.36 * max(ln["size"], ch["size"]):
                # do not merge glyphs far apart horizontally within a column if sizes differ wildly
                ln["chars"].append(ch)
                if ch["size"] > ln["size"]:
                    ln["size"], ln["oy"] = ch["size"], ch["oy"]
                break
        else:
            lines.append({"col": col, "oy": ch["oy"], "size": ch["size"], "chars": [ch]})

    # split a line where a horizontal gap is huge (separate text objects on one baseline)
    split = []
    for ln in lines:
        cs = sorted(ln["chars"], key=lambda c: c["ox"])
        cur = [cs[0]]
        for a, b in zip(cs, cs[1:]):
            if b["x0"] - a["x1"] > 0.2 * ln["size"] and a["c"] != " " and b["c"] != " ":
                split.append((ln, cur))
                cur = []
            cur.append(b)
        split.append((ln, cur))

    out_lines = []
    for ln, cs in split:
        # strip leading/trailing spaces
        while cs and cs[-1]["c"] == " ":
            cs = cs[:-1]
        while cs and cs[0]["c"] == " ":
            cs = cs[1:]
        if not cs:
            continue
        base = max(cs, key=lambda c: c["size"])
        size = base["size"]
        oy = base["oy"]
        runs = []
        for ch in cs:
            dy = round(ch["oy"] - oy, 1)
            key = (ch["f"], round(ch["size"], 2), ch["color"], dy if abs(dy) >= 0.6 else 0)
            if runs and runs[-1]["key"] == key:
                runs[-1]["t"] += ch["c"]
                runs[-1]["chars"].append(ch)
            else:
                runs.append({"key": key, "t": ch["c"], "chars": [ch]})
        out_lines.append({
            "x": cs[0]["x0"], "x1": cs[-1]["x1"], "y": oy, "size": size,
            "seq": min(c["seq"] for c in cs), "runs": runs, "chars": cs,
        })

    # ---------- vector rules ----------
    segs = []  # axis or diagonal single segments
    boxes = []  # rounded boxes
    fills = []
    for d in drawings:
        if d["type"] == "f":
            fc = d.get("fill")
            r = d["rect"]
            if fc and all(v > 0.99 for v in fc):
                # white cover: keep only if it covers something that stays visible (paint order)
                fills.append({"k": "fill", "x": r1(r.x0), "y": r1(r.y0), "w": r1(r.width), "h": r1(r.height), "color": "#ffffff", "seq": d["seqno"]})
            else:
                fills.append({"k": "fill", "x": r1(r.x0), "y": r1(r.y0), "w": r1(r.width), "h": r1(r.height), "color": hexcolor(fc) or "#000000", "seq": d["seqno"]})
            continue
        width = d.get("width") or 0.36
        color = hexcolor(d.get("color"))
        items = [it for it in d["items"] if it[0] == "l"]
        pts = [items[0][1]] + [it[2] for it in items] if items else []
        closed = len(pts) > 2 and abs(pts[0].x - pts[-1].x) < 0.5 and abs(pts[0].y - pts[-1].y) < 0.5
        diagonal_parts = sum(1 for it in items if abs(it[1].x - it[2].x) > 0.05 and abs(it[1].y - it[2].y) > 0.05)
        if closed and len(items) > 8 and diagonal_parts > 4:
            r = d["rect"]
            top = [p.x for p in pts if abs(p.y - r.y0) < 0.05]
            radius = (min(top) - r.x0) if top else 0
            if covered((r.x0, r.y0, r.x1, r.y1), white_fills, d["seqno"]):
                continue
            boxes.append({"k": "box", "x": r1(r.x0), "y": r1(r.y0), "w": r1(r.width), "h": r1(r.height), "r": r1(max(radius, 0)), "sw": r1(width), "color": color, "seq": d["seqno"]})
            continue
        for it in items:
            a, b = it[1], it[2]
            bb = (min(a.x, b.x), min(a.y, b.y), max(a.x, b.x), max(a.y, b.y))
            if covered(bb, white_fills, d["seqno"]):
                continue
            segs.append({"a": (a.x, a.y), "b": (b.x, b.y), "sw": width, "color": color, "seq": d["seqno"]})

    # The bar glyph is stretched only horizontally: its height follows the
    # equation's own size, read from the numerator set above it.
    for b in bars:
        above = [c for c in chars if c["f"] in ("e", "ei") and b["x0"] - 1 <= (c["x0"] + c["x1"]) / 2 <= b["x1"] + 1 and 0 < b["oy"] - c["oy"] < 20]
        size = max((c["size"] for c in above), default=11.04)
        y = b["oy"] - 0.604 * size
        segs.append({"a": (b["x0"], y), "b": (b["x1"], y), "sw": round(0.04 * size, 2), "color": None, "seq": b["seq"]})

    # merge collinear axis segments
    def merge(segs):
        hs, vs, ds = {}, {}, []
        for s in segs:
            (ax, ay), (bx, by) = s["a"], s["b"]
            if abs(ay - by) < 0.05:
                hs.setdefault((round(ay, 1), round(s["sw"], 2), s["color"]), []).append([min(ax, bx), max(ax, bx), s["seq"]])
            elif abs(ax - bx) < 0.05:
                vs.setdefault((round(ax, 1), round(s["sw"], 2), s["color"]), []).append([min(ay, by), max(ay, by), s["seq"]])
            else:
                ds.append(s)
        out = []
        for (y, sw, color), rs in hs.items():
            rs.sort()
            cur = rs[0][:]
            for r in rs[1:]:
                if r[0] <= cur[1] + 0.6:
                    cur[1] = max(cur[1], r[1]); cur[2] = min(cur[2], r[2])
                else:
                    out.append({"k": "h", "x": r1(cur[0]), "y": r1(y), "w": r1(cur[1] - cur[0]), "sw": sw, "color": color, "seq": cur[2]}); cur = r[:]
            out.append({"k": "h", "x": r1(cur[0]), "y": r1(y), "w": r1(cur[1] - cur[0]), "sw": sw, "color": color, "seq": cur[2]})
        for (x, sw, color), rs in vs.items():
            rs.sort()
            cur = rs[0][:]
            for r in rs[1:]:
                if r[0] <= cur[1] + 0.6:
                    cur[1] = max(cur[1], r[1]); cur[2] = min(cur[2], r[2])
                else:
                    out.append({"k": "v", "x": r1(x), "y": r1(cur[0]), "h": r1(cur[1] - cur[0]), "sw": sw, "color": color, "seq": cur[2]}); cur = r[:]
            out.append({"k": "v", "x": r1(x), "y": r1(cur[0]), "h": r1(cur[1] - cur[0]), "sw": sw, "color": color, "seq": cur[2]})
        for s in ds:
            (ax, ay), (bx, by) = s["a"], s["b"]
            out.append({"k": "d", "x": r1(ax), "y": r1(ay), "x2": r1(bx), "y2": r1(by), "sw": r1(s["sw"]), "color": s["color"], "seq": s["seq"]})
        return out

    rules = [r for r in merge(segs) if (r.get("w", 1) > 0.2 and r.get("h", 1) > 0.2)]

    # ---------- inline marks: boxes and underlines around text ----------
    def chars_in(ln, xa, xb):
        return [c for c in ln["chars"] if c["c"] != " " and xa - 0.8 <= (c["x0"] + c["x1"]) / 2 <= xb + 0.8]

    consumed = set()
    vrules = [r for r in rules if r["k"] == "v"]
    hrules = [r for r in rules if r["k"] == "h"]
    for ln in out_lines:
        top, bot = ln["y"] - ln["size"] * 1.05, ln["y"] + ln["size"] * 0.45
        cand = [v for v in vrules if v["y"] >= top - 2 and v["y"] + v["h"] <= bot + 2 and v["h"] < ln["size"] * 1.7 and id(v) not in consumed]
        cand.sort(key=lambda v: v["x"])
        for i, left in enumerate(cand):
            if id(left) in consumed:
                continue
            for right in cand[i + 1:]:
                if id(right) in consumed or abs(right["y"] - left["y"]) > 1.5:
                    continue
                inside = chars_in(ln, left["x"], right["x"])
                if not inside or right["x"] - left["x"] > 260:
                    continue
                for c in inside:
                    c["box"] = True
                consumed.add(id(left)); consumed.add(id(right))
                for h in hrules:
                    if abs(h["x"] - left["x"]) < 1.2 and abs(h["x"] + h["w"] - right["x"]) < 1.2 and left["y"] - 1.5 <= h["y"] <= left["y"] + left["h"] + 1.5:
                        consumed.add(id(h))
                break
        for h in hrules:
            if id(h) in consumed:
                continue
            if 0 <= h["y"] - ln["y"] <= ln["size"] * 0.42 and h["w"] < 330:
                inside = chars_in(ln, h["x"], h["x"] + h["w"])
                # a rule under equation glyphs is a fraction bar, not an underline
                if inside and all(c["f"] not in ("e", "ei") for c in inside) and abs(inside[0]["x0"] - h["x"]) < 2.5 and abs(inside[-1]["x1"] - (h["x"] + h["w"])) < 2.5:
                    for c in inside:
                        c["u"] = True
                    consumed.add(id(h))
    rules = [r for r in rules if id(r) not in consumed]

    # rebuild runs with marks
    page_lines = []
    for i, ln in enumerate(out_lines):
        runs = []
        for ch in ln["chars"]:
            dy = round(ch["oy"] - ln["y"], 1)
            mark = "b" if ch.get("box") else ("u" if ch.get("u") else "")
            if ch["c"] == " " and runs and runs[-1]["mark"]:
                # a space inside a marked phrase keeps the mark when the next glyph is marked
                idx = ln["chars"].index(ch)
                nxt = ln["chars"][idx + 1] if idx + 1 < len(ln["chars"]) else None
                if nxt is not None and (nxt.get("box") or nxt.get("u")):
                    mark = runs[-1]["mark"]
            key = (ch["f"], round(ch["size"], 2), ch["color"], dy if abs(dy) >= 0.6 else 0, mark)
            # every word starts a run, so each run is pinned at its printed x
            word_start = runs and runs[-1]["t"].endswith(" ") and ch["c"] != " " and not mark
            if runs and runs[-1]["key"] == key and not word_start:
                runs[-1]["t"] += ch["c"]
                runs[-1]["x1"] = ch["x1"]
                if ch["c"] != " ":
                    runs[-1]["ink"] = ch["x1"]
            else:
                runs.append({"key": key, "t": ch["c"], "mark": mark, "x": ch["x0"], "x1": ch["x1"], "ink": ch["x1"]})
        out_runs = []
        for n, r in enumerate(runs):
            f, size, color, dy, mark = r["key"]
            end = runs[n + 1]["x"] if n + 1 < len(runs) else r["x1"]
            o = {"t": r["t"], "f": f, "x": r1(r["x"] - ln["x"]), "w": r1(end - r["x"])}
            if abs(size - ln["size"]) > 0.05:
                o["s"] = r1(size)
            if color:
                o["c"] = color
            if dy:
                o["dy"] = dy
            if mark:
                o["m"] = mark
            o["e"] = r1(r["ink"] - r["x"])
            out_runs.append(o)
        page_lines.append({"k": "line", "x": r1(ln["x"]), "y": r1(ln["y"]), "w": r1(ln["x1"] - ln["x"]), "s": r1(ln["size"]), "runs": out_runs, "seq": ln["seq"]})

    # ---------- images ----------
    images = []
    log = page.get_bboxlog()
    img_seq = [i for i, (kind, _) in enumerate(log) if kind == "fill-image"]
    infos = page.get_image_info(xrefs=True)
    for n, info in enumerate(infos):
        r = pymupdf.Rect(info["bbox"])
        seq = img_seq[n] if n < len(img_seq) else 0
        if covered((r.x0, r.y0, r.x1, r.y1), white_fills, seq):
            continue
        title = abs(info["width"] - 1370) < 4 and abs(info["height"] - 354) < 4
        images.append({"k": "title" if title else "img", "x": r1(r.x0), "y": r1(r.y0), "w": r1(r.width), "h": r1(r.height), "xref": info["xref"], "seq": seq})

    items = page_lines + rules + boxes + [f for f in fills if f["color"] != "#ffffff" or any(f["seq"] < it["seq"] and False for it in [])] + images
    # keep white fills only where they paint over visible items (e.g. a label gap in a box rule)
    for f in fills:
        if f["color"] != "#ffffff":
            continue
        fx0, fy0, fx1, fy1 = f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]
        overlaps = any(
            it["seq"] < f["seq"] and it["k"] in ("h", "v", "d", "box")
            and not (it["x"] > fx1 or it["x"] + it.get("w", 0) < fx0 or it["y"] > fy1 or it["y"] + it.get("h", 0) < fy0)
            for it in rules + boxes
        )
        if overlaps:
            items.append(f)
    items.sort(key=lambda it: it["seq"])
    for n, it in enumerate(items):
        it["id"] = f"p{pno}-{n}"
        del it["seq"]
    return items


doc = pymupdf.open(PDF)
pages = []
for pno in range(FIRST, LAST + 1):
    pages.append({"n": pno, "items": extract_page(doc[pno - 1], pno)})
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(pages, f, ensure_ascii=False, separators=(",", ":"))
print("pages", len(pages), "items", sum(len(p["items"]) for p in pages))
