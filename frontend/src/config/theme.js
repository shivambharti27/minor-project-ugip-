// Floor-plan drawing palette (warm, matches the website). The rest of the page uses CSS variables.
const T = {
  stage: "#F6ECE3", wall: "#231A15", boundary: "#231A15", text: "#231A15", dim: "#6B5E55", door: "#FFF6F0", fLine: "#231A15",
  rooms: { bed: "#EAD9C8", hall: "#F7E3B8", bath: "#CFE3E6", kitchen: "#DCE8CC", dining: "#F2D9BE", garden: "#BFDDA6", parking: "#DAD3CB", study: "#E3D9EC", pooja: "#F5D2C2", lounge: "#F3E7B6", store: "#E6DFD6", other: "#EDE5DC" }
};
export function theme() { return T; }
export function categoryOf(room) {
  const n = (room.name || '').toLowerCase(), k = room.kind || '';
  if (k === 'garden') return 'garden'; if (k === 'parking') return 'parking';
  if (k === 'bed' || /bedroom|guest|servant|master/.test(n)) return 'bed';
  if (k === 'bath' || /bath|toilet/.test(n)) return 'bath';
  if (k === 'dining' || /dining/.test(n)) return 'dining';
  if (k === 'lounge' || /lounge|theatre/.test(n)) return 'lounge';
  if (k === 'pooja' || /pooja/.test(n)) return 'pooja';
  if (k === 'study' || /study/.test(n)) return 'study';
  if (k === 'store' || /store|utility/.test(n)) return 'store';
  if (/kitchen/.test(n)) return 'kitchen';
  if (/hall/.test(n)) return 'hall';
  return 'other';
}
export function roomFill(room) { return T.rooms[categoryOf(room)]; }
