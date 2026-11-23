import { DOOR_FT } from '../config/constants.js';
export function sharedEdge(a, b) {
  const EPS = 0.15;
  const oy = () => [Math.max(a.y, b.y), Math.min(a.y + a.h, b.y + b.h)];
  const ox = () => [Math.max(a.x, b.x), Math.min(a.x + a.w, b.x + b.w)];
  if (Math.abs((a.x + a.w) - b.x) < EPS) { const [s, e] = oy(); if (e - s > EPS) return { axis: "v", pos: a.x + a.w, from: s, to: e }; }
  if (Math.abs((b.x + b.w) - a.x) < EPS) { const [s, e] = oy(); if (e - s > EPS) return { axis: "v", pos: a.x, from: s, to: e }; }
  if (Math.abs((a.y + a.h) - b.y) < EPS) { const [s, e] = ox(); if (e - s > EPS) return { axis: "h", pos: a.y + a.h, from: s, to: e }; }
  if (Math.abs((b.y + b.h) - a.y) < EPS) { const [s, e] = ox(); if (e - s > EPS) return { axis: "h", pos: a.y, from: s, to: e }; }
  return null;
}

// A single shared list of door openings — used by BOTH the 2D canvas drawing
// and the 3D wall-gap cutting, so the two views can never disagree with each other.
export function computeDoors(layout, length, width, facing) {
  const doors = [];
  // every room has exactly one door: to its Hall/Dining (or its own bedroom for an attached bath)
  layout.leaves.forEach(l => {
    if (!l.doorTo) return;
    const target = layout.leaves.find(x => x.room.name === l.doorTo);
    const e = sharedEdge(l.rect, target.rect);
    if (e) doors.push({ edge: e, widthFt: Math.min((e.to - e.from) * 0.6, DOOR_FT[l.room.kind] || 3.5), from: l.room.name, to: l.doorTo });
  });

  // main entrance: centred on the Hall's wall that lies on the plot boundary facing the road
  // (villas: the Hall opens onto the Garden, and the garden has its own gate in the boundary wall)
  const hall = layout.leaves.find(l => l.room.name === "Hall");
  const garden = layout.leaves.find(l => l.room.kind === "garden");
  const er = hall.rect;
  if (garden) {
    const e = sharedEdge(hall.rect, garden.rect);
    if (e) { const m = (e.from + e.to) / 2, hf = Math.min(2.5, (e.to - e.from) / 2 - 0.3); doors.push({ edge: { axis: e.axis, pos: e.pos, from: m - hf, to: m + hf }, widthFt: 5, isEntrance: true }); }
    const gr = garden.rect, gm = (facing === "N" || facing === "S") ? gr.x + gr.w / 2 : gr.y + gr.h / 2, gh = Math.min(3, ((facing === "N" || facing === "S") ? gr.w : gr.h) / 2 - 0.5);
    const gp = facing === "N" ? { axis: "h", pos: 0 } : facing === "S" ? { axis: "h", pos: length } : facing === "W" ? { axis: "v", pos: 0 } : { axis: "v", pos: width };
    doors.push({ edge: Object.assign({ from: gm - gh, to: gm + gh }, gp), widthFt: gh * 2, isGate: true, isGardenGate: true });
  } else {
  const half = Math.min(2.5, (facing === "N" || facing === "S" ? er.w : er.h) / 2 - 0.5);
  let entranceEdge;
  if (facing === "N") entranceEdge = { axis: "h", pos: 0, from: er.x + er.w / 2 - half, to: er.x + er.w / 2 + half };
  else if (facing === "S") entranceEdge = { axis: "h", pos: length, from: er.x + er.w / 2 - half, to: er.x + er.w / 2 + half };
  else if (facing === "W") entranceEdge = { axis: "v", pos: 0, from: er.y + er.h / 2 - half, to: er.y + er.h / 2 + half };
  else entranceEdge = { axis: "v", pos: width, from: er.y + er.h / 2 - half, to: er.y + er.h / 2 + half };
  doors.push({ edge: entranceEdge, widthFt: 5, isEntrance: true });
  }

  // car porch: an open gate gap in the boundary wall on the road side (no door arc; cars drive straight in)
  const park = layout.leaves.find(l => l.room.kind === "parking");
  if (park) {
    const r = park.rect, pad = 0.6;
    let ge;
    if (facing === "N") ge = { axis: "h", pos: 0, from: r.x + pad, to: r.x + r.w - pad };
    else if (facing === "S") ge = { axis: "h", pos: length, from: r.x + pad, to: r.x + r.w - pad };
    else if (facing === "W") ge = { axis: "v", pos: 0, from: r.y + pad, to: r.y + r.h - pad };
    else ge = { axis: "v", pos: width, from: r.y + pad, to: r.y + r.h - pad };
    doors.push({ edge: ge, widthFt: ge.to - ge.from, isGate: true });
  }
  return doors;
}

// Remove gap ranges (doors) from a wall segment, returning the remaining solid sub-segments.
export function subtractGaps(segFrom, segTo, gaps) {
  let segments = [[segFrom, segTo]];
  gaps.forEach(g => {
    const next = [];
    segments.forEach(([s, e]) => {
      const gs = Math.max(s, g.from), ge = Math.min(e, g.to);
      if (ge <= gs) { next.push([s, e]); return; }
      if (gs > s + 0.1) next.push([s, gs]);
      if (ge < e - 0.1) next.push([ge, e]);
    });
    segments = next;
  });
  return segments.filter(([s, e]) => e - s > 0.15);
}

export function doorGapsOnEdge(doors, axis, pos, segFrom, segTo) {
  const EPS = 0.25;
  return doors
    .filter(d => d.edge.axis === axis && Math.abs(d.edge.pos - pos) < EPS && d.edge.from < segTo - 0.05 && d.edge.to > segFrom + 0.05)
    .map(d => { const mid = (d.edge.from + d.edge.to) / 2; const half = d.widthFt / 2; return { from: mid - half, to: mid + half, isEntrance: d.isEntrance }; });
}

// Build the 4 perimeter wall segments of a room (with door gaps cut out).
// Returns an array of { axis, pos, from, to } solid wall pieces.
export function buildRoomWalls(rect, doors) {
  const walls = [];
  const edges = [
    { axis: "h", pos: rect.y, from: rect.x, to: rect.x + rect.w },           // top
    { axis: "h", pos: rect.y + rect.h, from: rect.x, to: rect.x + rect.w }, // bottom
    { axis: "v", pos: rect.x, from: rect.y, to: rect.y + rect.h },          // left
    { axis: "v", pos: rect.x + rect.w, from: rect.y, to: rect.y + rect.h } // right
  ];
  edges.forEach(e => {
    const gaps = doorGapsOnEdge(doors, e.axis, e.pos, e.from, e.to);
    const solids = subtractGaps(e.from, e.to, gaps);
    solids.forEach(([s, t]) => walls.push({ axis: e.axis, pos: e.pos, from: s, to: t }));
  });
  return walls;
}

