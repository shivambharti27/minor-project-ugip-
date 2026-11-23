"""Material and cost estimate. Same formulas as the browser version (frontend/src/estimate/engine.js).

Input is a dict of plan measurements (taken from the floor plan by the frontend):
  builtArea, extLen, intLen, bathDoors, flushDoors, mainDoors,
  windows [{w,h}], winArea, wetRooms [{area,per}], kitchens [{area,per}]
"""
import math
from rates import DEFAULTS, rates_for

M3 = 0.0283168            # 1 cubic foot in m3
BAG_M3 = 0.0347           # volume of one 50 kg cement bag
CFT_PER_M3 = 35.3147
WET_TO_DRY_CONC, WET_TO_DRY_MORTAR, BRICK_MORTAR_DRY = 1.54, 1.27, 1.33
BRICKS_PER_M3, BRICK_VOL_M3 = 500, 0.19 * 0.09 * 0.09
STEEL_KG_M3 = {"footing": 70, "column": 160, "beam": 130, "slab": 90}
WASTE_BRICK, WASTE_STEEL = 1.05, 1.03
MATS = ("cement", "sand", "agg", "steel", "bricks")


def concrete(vol_m3, mix):
    s = sum(mix)
    dry = vol_m3 * WET_TO_DRY_CONC
    return {"cement": dry * mix[0] / s / BAG_M3, "sand": dry * mix[1] / s, "agg": dry * mix[2] / s}


def mortar(vol_m3, ratio, dry_factor=WET_TO_DRY_MORTAR):
    dry = vol_m3 * dry_factor
    return {"cement": dry / (1 + ratio) / BAG_M3, "sand": dry * ratio / (1 + ratio), "agg": 0}


def estimate(g, options=None):
    options = options or {}
    o = {**DEFAULTS, **{k: v for k, v in options.items() if v is not None and k != "rates"}}
    R = rates_for(o["grade"], options.get("rates"))
    F, H = int(o["floors"]), o["storeyHeightFt"]
    door_a = {"main": 4 * 7, "flush": 3 * 7, "bath": 2.5 * 7}
    int_door_a = g["flushDoors"] * door_a["flush"] + g["bathDoors"] * door_a["bath"]
    main_a = g["mainDoors"] * door_a["main"]
    win_area = g["winArea"]
    works = []

    def work(name, qty_text, mat=None, **extra):
        w = {"name": name, "qtyText": qty_text, **{k: 0 for k in MATS}, **(mat or {}), **extra}
        works.append(w)

    wall_len = g["extLen"] + g["intLen"]
    n = max(4, math.ceil(g["builtArea"] / 120))
    big = g["builtArea"] > 1500
    fs, ft, col_h = (5 if big else 4), (1.5 if big else 1.25), 4 + H * F

    exc = n * (fs + 1) ** 2 * 5 * M3
    work("Earthwork excavation", f"{exc:.1f} m³", directCost=exc * R["excavation"])
    pcc = n * (fs + 0.5) ** 2 * 0.33 * M3
    work("PCC 1:4:8 below footings", f"{pcc:.1f} m³", concrete(pcc, [1, 4, 8]))
    foot = n * fs * fs * ft * M3
    work("Footings (M20)", f"{n} nos, {fs}×{fs} ft", {**concrete(foot, [1, 1.5, 3]), "steel": foot * STEEL_KG_M3["footing"] * WASTE_STEEL})
    col = n * 0.75 * 1.0 * col_h * M3
    work("Columns 9×12 in (M20)", f"{n} nos", {**concrete(col, [1, 1.5, 3]), "steel": col * STEEL_KG_M3["column"] * WASTE_STEEL})
    plinth = wall_len * 0.75 * 0.75 * M3
    roof_b = wall_len * 0.75 * 1.0 * F * M3
    beams = plinth + roof_b
    work("Plinth & roof beams (M20)", f"{beams:.1f} m³", {**concrete(beams, [1, 1.5, 3]), "steel": beams * STEEL_KG_M3["beam"] * WASTE_STEEL})
    slab = g["builtArea"] * (5 / 12) * F * M3
    work("Roof slab 5 in (M20)", f"{round(g['builtArea'] * F)} sq ft", {**concrete(slab, [1, 1.5, 3]), "steel": slab * STEEL_KG_M3["slab"] * WASTE_STEEL})

    ext_wall_a = max(0, g["extLen"] * H - win_area - main_a) * F
    int_wall_a = max(0, g["intLen"] * H - int_door_a) * F
    parapet = g["extLen"] * 3 * F
    brick_vol = (ext_wall_a * 0.75 + int_wall_a * 0.375 + parapet * 0.375) * M3
    mort = mortar(brick_vol * (1 - BRICKS_PER_M3 * BRICK_VOL_M3), 6, BRICK_MORTAR_DRY)
    work("Brick masonry (9 in outer, 4.5 in inner, parapet)", f"{brick_vol:.1f} m³", {**mort, "bricks": brick_vol * BRICKS_PER_M3 * WASTE_BRICK})

    pl_in = max(0, (g["extLen"] + 2 * g["intLen"]) * H - 2 * int_door_a - win_area - main_a) * F
    pl_out = ext_wall_a
    ceil = g["builtArea"] * F
    t_in, t_out, t_ceil, t_bed = 0.012 / 0.3048, 0.018 / 0.3048, 0.010 / 0.3048, 0.025 / 0.3048
    p1, p2, p3 = mortar(pl_in * t_in * M3, 5), mortar(pl_out * t_out * M3, 4), mortar(ceil * t_ceil * M3, 4)
    work("Plastering (internal, external, ceiling)", f"{round(pl_in + pl_out + ceil)} sq ft",
         {"cement": p1["cement"] + p2["cement"] + p3["cement"], "sand": p1["sand"] + p2["sand"] + p3["sand"]})

    room_area = g["builtArea"] * F
    bath_floor = sum(r["area"] for r in g["wetRooms"]) * F
    dry_floor = room_area - bath_floor
    bath_wall = sum(max(0, r["per"] - 2.5) * 7 for r in g["wetRooms"]) * F
    kit_wall = sum(max(0, r["per"] - 3) * 2.5 for r in g["kitchens"]) * F
    bed = mortar(room_area * t_bed * M3, 4)
    work("Flooring & wall tiles", f"{round(room_area)} sq ft floor", {"cement": bed["cement"], "sand": bed["sand"]},
         tiles={"dry": dry_floor * 1.07, "bath": bath_floor * 1.07, "wall": (bath_wall + kit_wall) * 1.07})

    n_win = len(g["windows"]) * F
    work("Doors & windows", f"{(g['mainDoors'] + g['flushDoors'] + g['bathDoors']) * F} doors, {n_win} windows",
         directCost=F * (g["mainDoors"] * R["mainDoor"] + g["flushDoors"] * R["flushDoor"] + g["bathDoors"] * R["bathDoor"]) + win_area * F * R["window"], fixAndSupply=True)
    in_paint, out_paint = pl_in + ceil, pl_out
    putty, primer, em_in, em_out = in_paint * 0.13, (in_paint + out_paint) * 0.01, in_paint * 0.02, out_paint * 0.025
    work("Painting (putty, primer, 2 coats)", f"{round(in_paint + out_paint)} sq ft",
         directCost=putty * R["putty"] + primer * R["primer"] + em_in * R["paintIn"] + em_out * R["paintOut"],
         paint={"putty": putty, "primer": primer, "emIn": em_in, "emOut": em_out})
    n_bath = len(g["wetRooms"])
    work("Electrical wiring & fittings", f"{round(g['builtArea'] * F)} sq ft", directCost=g["builtArea"] * F * R["electrical"], fixAndSupply=True)
    work("Plumbing & sanitary", f"{n_bath} bathrooms, {len(g['kitchens'])} kitchen",
         directCost=n_bath * R["plumbBath"] + len(g["kitchens"]) * R["plumbKitchen"] + R["plumbBase"], fixAndSupply=True)

    totals = {k: 0.0 for k in MATS}
    for w in works:
        for k in MATS:
            totals[k] += w.get(k, 0)
        mat = (w["cement"] * R["cement"] + w["steel"] * R["steel"] + w["bricks"] * R["brick"]
               + w["sand"] * CFT_PER_M3 * R["sand"] + w["agg"] * CFT_PER_M3 * R["aggregate"])
        if "tiles" in w:
            t = w["tiles"]
            mat += t["dry"] * R["floorTile"] + t["bath"] * R["bathTile"] + t["wall"] * R["wallTile"]
        is_paint = w["name"].startswith("Painting")
        if w.get("directCost") and not w.get("fixAndSupply") and is_paint:
            mat += w["directCost"]
        w["material"] = mat + (w["directCost"] if w.get("fixAndSupply") else 0)
        w["labourBase"] = 0 if w.get("fixAndSupply") else (w["directCost"] if is_paint else mat)
        if w["name"].startswith("Earthwork"):
            w["material"], w["labourBase"], w["labour"] = 0, 0, w["directCost"]
    base_sum = sum(w["labourBase"] for w in works)
    built_all = g["builtArea"] * F
    lps = o.get("labourPerSqft")
    for w in works:
        if not w["name"].startswith("Earthwork"):
            if lps and lps > 0:
                w["labour"] = (w["labourBase"] / base_sum * lps * built_all) if base_sum else 0
            else:
                w["labour"] = w["labourBase"] * o["labourPct"] / 100
        w["total"] = w["material"] + w["labour"]

    sub = sum(w["total"] for w in works)
    misc = sub * o["miscPct"] / 100
    overhead = (sub + misc) * o["overheadPct"] / 100
    contingency = (sub + misc) * o["contingencyPct"] / 100
    grand = sub + misc + overhead + contingency

    def line(name, qty, unit, rate):
        return {"name": name, "qty": qty, "unit": unit, "rate": rate, "amount": qty * rate}
    tw = next(w for w in works if "tiles" in w)["tiles"]
    pw = next(w for w in works if "paint" in w)["paint"]
    materials = [
        line("Cement (50 kg bags)", math.ceil(totals["cement"]), "bags", R["cement"]),
        line("Steel (TMT Fe500)", math.ceil(totals["steel"]), "kg", R["steel"]),
        line("Bricks", math.ceil(totals["bricks"]), "nos", R["brick"]),
        line("Sand", math.ceil(totals["sand"] * CFT_PER_M3), "cu ft", R["sand"]),
        line("Aggregate (20 mm)", math.ceil(totals["agg"] * CFT_PER_M3), "cu ft", R["aggregate"]),
        line("Floor tiles (living / bedrooms)", math.ceil(tw["dry"]), "sq ft", R["floorTile"]),
        line("Anti-skid tiles (bathrooms)", math.ceil(tw["bath"]), "sq ft", R["bathTile"]),
        line("Wall tiles (bath & kitchen dado)", math.ceil(tw["wall"]), "sq ft", R["wallTile"]),
        line("Wall putty", math.ceil(pw["putty"]), "kg", R["putty"]),
        line("Primer", math.ceil(pw["primer"]), "litre", R["primer"]),
        line("Interior emulsion", math.ceil(pw["emIn"]), "litre", R["paintIn"]),
        line("Exterior emulsion", math.ceil(pw["emOut"]), "litre", R["paintOut"]),
    ]
    clean = [{k: v for k, v in w.items() if k not in ("tiles", "paint", "directCost", "fixAndSupply", "labourBase")} for w in works]
    return {
        "geometry": {"builtArea": g["builtArea"], "floors": F, "extLen": g["extLen"], "intLen": g["intLen"], "columns": n,
                     "doors": g["mainDoors"] + g["flushDoors"] + g["bathDoors"], "windows": len(g["windows"])},
        "works": clean, "materials": materials,
        "totals": {"subtotal": sub, "misc": misc, "overhead": overhead, "contingency": contingency, "grand": grand,
                   "perSqft": grand / built_all, "builtTotal": built_all},
        "options": o, "rates": R,
    }
