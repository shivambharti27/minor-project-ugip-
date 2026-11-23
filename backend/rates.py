"""Default unit rates in Indian rupees. EDITABLE ASSUMPTIONS, not official prices."""
BASE_RATES = {"cement": 400, "steel": 68, "brick": 8, "sand": 55, "aggregate": 45, "excavation": 350, "putty": 40, "primer": 250}
GRADE_RATES = {
    "economy":  {"floorTile": 40,  "bathTile": 40,  "wallTile": 40,  "mainDoor": 15000, "flushDoor": 6000,  "bathDoor": 3500, "window": 350, "paintIn": 320, "paintOut": 400, "electrical": 90,  "plumbBath": 22000, "plumbKitchen": 12000, "plumbBase": 18000},
    "standard": {"floorTile": 70,  "bathTile": 60,  "wallTile": 55,  "mainDoor": 28000, "flushDoor": 9000,  "bathDoor": 5500, "window": 550, "paintIn": 420, "paintOut": 520, "electrical": 130, "plumbBath": 35000, "plumbKitchen": 20000, "plumbBase": 30000},
    "premium":  {"floorTile": 130, "bathTile": 110, "wallTile": 100, "mainDoor": 65000, "flushDoor": 16000, "bathDoor": 9000, "window": 900, "paintIn": 650, "paintOut": 750, "electrical": 200, "plumbBath": 70000, "plumbKitchen": 40000, "plumbBase": 60000},
}
PRESETS = {
    "dehradun": {"label": "Uttarakhand: Dehradun / plains", "labourPerSqft": 300, "rates": {"cement": 390, "steel": 62, "brick": 9, "sand": 50, "aggregate": 40, "excavation": 300}},
    "hills":    {"label": "Uttarakhand: hill towns",        "labourPerSqft": 340, "rates": {"cement": 430, "steel": 66, "brick": 11, "sand": 70, "aggregate": 55, "excavation": 380}},
    "metro":    {"label": "Other: large city (assumed)",    "labourPerSqft": 380, "rates": {"cement": 400, "steel": 68, "brick": 8, "sand": 55, "aggregate": 45, "excavation": 350}},
}
DEFAULTS = {"floors": 1, "grade": "standard", "labourPct": 38, "labourPerSqft": None, "miscPct": 5, "overheadPct": 10, "contingencyPct": 5, "storeyHeightFt": 10}


def rates_for(grade, overrides=None):
    return {**BASE_RATES, **GRADE_RATES[grade or "standard"], **(overrides or {})}
