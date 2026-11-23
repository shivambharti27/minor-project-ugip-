export const WALL_FT = 0.6;
export const WALL_HEIGHT_FT = 9;

// Muted, material-suggestive floor palette: warm wood for living spaces,
// cool tile-tones for wet areas, neutral utility tones for storage.
export const ROOM_COLORS = {
  Hall: "#D8C6A6", Kitchen: "#DCE1E0",
  Bedroom: "#E8E2D3", "Bedroom 1": "#E8E2D3", "Bedroom 2": "#E3DDCB", "Bedroom 3": "#DCD5C0", "Bedroom 4": "#D6CFBA", Passage: "#CDBF9F",
  Bathroom: "#C9D6DA", "Bathroom 1": "#C9D6DA", "Bathroom 2": "#BFCDD2", "Bathroom 3": "#B4C3C8",
  "Guest Room": "#E3DCC8", "Store Room": "#C7C2B8", "Common Bathroom": "#BFCDD2",
  "Dining Room": "#DCCFAE", "Family Lounge": "#D2C3A0", "Utility Room": "#C7C2B8"
};

// floor colour by room kind (names vary on big plots), falling back to the fixed name palette
export const KIND_COLORS = { garden: "#B9CC9A", bed: "#E8E2D3", bath: "#C9D6DA", lounge: "#D2C3A0", pooja: "#F0DDB0", store: "#C7C2B8", parking: "#BDBEB6", study: "#DCD3BF", room: "#D9D0BC", dining: "#DCCFAE" };
export function roomColor(room) { return ROOM_COLORS[room.name] || KIND_COLORS[room.kind] || "#CCCCCC"; }

export const FURNITURE_COLORS = {
  tree: "#6E9A55",
  bed: "#8FA6B0", wardrobe: "#5A4632", sofa: "#54504A", tv_unit: "#2E2A24",
  counter: "#E8E8E4", toilet: "#FFFFFF", basin: "#FFFFFF", shelf: "#A98F6B", dining_table: "#6B5540", car: "#7A8590"
};
export const FURNITURE_LINE = "#3E2723";
export const DOOR_FT = { bed: 4, bath: 3.5, kitchen: 4, dining: 6, store: 3.5, passage: 4, pooja: 3, study: 4, room: 4, lounge: 8 };
export const MIN_EDGE = { kitchen: 3, dining: 4, bed: 3.5, bath: 2.5, store: 2.5 };
export const SEARCH_RESTARTS = 24, SEARCH_RANDOM = 400, SEARCH_CLIMB = 1600;
