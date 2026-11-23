import { MIN_EDGE } from '../config/constants.js';
import { sharedEdge } from './doors.js';

// ---- constraint scoring ----
export function sizeDeficit(r, u) {
  const d1 = Math.max(0, u.minW - r.w) + Math.max(0, u.minH - r.h);
  const d2 = Math.max(0, u.minH - r.w) + Math.max(0, u.minW - r.h);
  return Math.min(d1, d2);
}
export function onBoundary(r, W, L) { return r.x < 0.2 || r.y < 0.2 || r.x + r.w > W - 0.2 || r.y + r.h > L - 0.2; }
export function onFacingWall(r, W, L, facing) {
  if (facing === "N") return r.y < 0.2;
  if (facing === "S") return r.y + r.h > L - 0.2;
  if (facing === "W") return r.x < 0.2;
  return r.x + r.w > W - 0.2;
}
export function evaluateLayout(placed, units, W, L, facing) {
  const n = units.length, rect = new Array(n);
  placed.forEach(p => { rect[p.u] = p.rect; });
  const idx = {}; units.forEach((u, i) => { idx[u.name] = i; });
  const HUB = { hall: 1, dining: 1, lounge: 1, passage: 1 };
  const hubs = []; units.forEach((u, i) => { if (HUB[u.kind]) hubs.push(i); });
  const kit = idx["Kitchen"];
  const touchLen = (i, j) => { const e = sharedEdge(rect[i], rect[j]); return e ? e.to - e.from : 0; };
  const bestHub = (i, noPassage) => { let b = { j: -1, len: 0 }; hubs.forEach(h => { if (h === i || (noPassage && units[h].kind === "passage")) return; const l = touchLen(i, h); if (l > b.len + 1e-9) b = { j: h, len: l }; }); return b; };
  const scale = (W * L) / units.reduce((s, u) => s + u.t, 0);
  let cost = 0; const issues = []; const doorTo = new Array(n).fill(null);
  const heavy = n > 14; // big plans get a distance gradient on violations so the search can climb toward a valid plan
  const gap = (a, b) => Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)) + Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  const viol = (i, msg, c) => {
    if (heavy) {
      let d = Infinity;
      if (/road|entrance wall/.test(msg)) d = facing === "N" ? rect[i].y : facing === "S" ? L - rect[i].y - rect[i].h : facing === "W" ? rect[i].x : W - rect[i].x - rect[i].w;
      else hubs.forEach(h => { if (h !== i) d = Math.min(d, gap(rect[i], rect[h])); });
      c += (isFinite(d) ? d : 0) * 12;
    }
    cost += c; issues.push({ type: "adj", room: units[i].name, msg });
  };
  const ASPECT = { passage: 9, parking: 2.6, bath: 1.9, hall: 1.9, garden: 6, bed: 1.5, pooja: 1.6, kitchen: 1.7 };
  if (!units.some(u => u.kind === "parking")) { // ordinary homes: neither Hall nor Kitchen may out-size the bedrooms
    const ba = []; units.forEach((u, i) => { if (u.kind === "bed") ba.push(rect[i].w * rect[i].h); });
    if (ba.length) {
      const maxB = Math.max(...ba), minB = Math.min(...ba), ar = i => rect[i].w * rect[i].h;
      if (idx["Hall"] !== undefined) { const ex = ar(idx["Hall"]) - 1.1 * maxB; if (ex > 0) cost += ex * 6; }
      if (kit !== undefined) { const ex = ar(kit) - 0.7 * minB; if (ex > 0) cost += ex * 8; }
    }
  }
  units.forEach((u, i) => {
    const r = rect[i];
    const def = sizeDeficit(r, u);
    if (def > 0.1) { cost += 1000 + def * 200; issues.push({ type: "size", room: u.name, msg: "too small" }); }
    if (u.kind !== "passage") cost += Math.abs(Math.log((r.w * r.h) / (u.t * scale))) * 30; // stay close to the planned size
    if (u.kind === "garden" || u.kind === "parking") { // the road-side band must stay shallow (about 20 ft), not swallow the plot
      const ratio = (r.w * r.h) / (u.t * scale);
      if (u.kind === "parking") { const maxA = (u.cars || 2) * 270, ex = r.w * r.h - maxA; if (ex > 0) cost += ex * 0.8; } // an open porch fits its cars snugly
      else if (ratio > 1.4) cost += (ratio - 1.4) * 300;
      if (u.kind === "garden" && ratio < 0.7) cost += (0.7 - ratio) * 500; // a real lawn, not a sliver
    }
    if (u.kind === "bath" || u.kind === "pooja" || u.kind === "store" || u.kind === "kitchen") { // small service rooms must never balloon
      const ratio = (r.w * r.h) / (u.t * scale), cap = u.kind === "bath" ? 1.7 : 1.9;
      if (ratio > cap) cost += (ratio - cap) * 120;
    }
    const ar = Math.max(r.w, r.h) / Math.min(r.w, r.h);
    const lim = ASPECT[u.kind] || 1.8;
    if (ar > lim) cost += (ar - lim) * (u.kind === "bath" ? 200 : 60);
    const ext = onBoundary(r, W, L), front = onFacingWall(r, W, L, facing);
    const hub = bestHub(i);
    if (u.kind === "hall") {
      if (idx["Garden"] !== undefined) { if (touchLen(i, idx["Garden"]) < 5) viol(i, "Hall must open to the Garden entrance", 500); }
      else if (!front) viol(i, "Hall must touch the entrance wall", 500);
    } else if (u.kind === "passage") {
      const ph = bestHub(i, true);
      if (ph.len >= 2.5) doorTo[i] = ph.j; else viol(i, "Passage must open to Hall", 300);
      cost += 30; // a passage is a last resort, never preferred
    } else if (u.kind === "kitchen") {
      if (hub.len >= MIN_EDGE.kitchen) doorTo[i] = hub.j; else viol(i, "Kitchen must open to Hall/Dining", 400);
      if (!ext) cost += 80;
      if (front) cost += 15;
    } else if (u.kind === "dining") {
      if (touchLen(i, idx["Hall"]) >= MIN_EDGE.dining) doorTo[i] = idx["Hall"];
      else { const dh = bestHub(i, true); if (dh.len >= MIN_EDGE.dining) doorTo[i] = dh.j; else viol(i, "Dining must open to Hall", 300); }
    } else if (u.kind === "lounge") {
      const lh = bestHub(i, true);
      if (lh.len >= MIN_EDGE.dining) doorTo[i] = lh.j; else viol(i, "Lounge must open to Hall/Dining", 300);
      if (!ext) cost += 25;
    } else if (u.kind === "parking") {
      if (!front) viol(i, "Car porch must touch the road side", 500);
      if (idx["Garden"] === undefined && touchLen(i, idx["Hall"]) < MIN_EDGE.dining) viol(i, "Car porch must be next to the Hall entrance", 300);
    } else if (u.kind === "garden") {
      if (!front) viol(i, "Garden must be on the road side", 500);
    } else if (u.kind === "pooja") {
      if (hub.len >= 3) doorTo[i] = hub.j; else viol(i, "Pooja room must open to Hall/Lounge", 300);
      units.forEach((x, j) => { if (x.kind === "bath" && touchLen(i, j) > 0.5) cost += 30; }); // pooja away from bathrooms
    } else if (u.kind === "study" || u.kind === "room") {
      if (hub.len >= 3) doorTo[i] = hub.j; else viol(i, u.name + " must open to Hall/Lounge", 300);
      if (!ext) cost += u.kind === "study" ? 40 : 15;
    } else if (u.kind === "bed") {
      if (hub.len >= MIN_EDGE.bed) doorTo[i] = hub.j; else viol(i, "Bedroom must open to Hall/Dining", 300);
      if (!ext) cost += 70;
      if (front) cost += 12;
      if (kit !== undefined && touchLen(i, kit) > 0.5) cost += 8;
    } else if (u.kind === "bath") {
      const bi = u.attach !== undefined ? idx[u.attach] : undefined;
      if (bi !== undefined && touchLen(i, bi) >= MIN_EDGE.bath) doorTo[i] = bi;
      else if (hub.len >= MIN_EDGE.bath) { doorTo[i] = hub.j; if (bi !== undefined) cost += 80; }
      else viol(i, bi !== undefined ? "Bathroom must touch its bedroom" : "Bathroom must open to Hall", 300);
      if (!ext) cost += 10;
      if (front) cost += 40;
      if (kit !== undefined && touchLen(i, kit) > 0.5) cost += 25;
    } else if (u.kind === "store") {
      if (kit !== undefined && touchLen(i, kit) >= MIN_EDGE.store) doorTo[i] = kit;
      else if (hub.len >= MIN_EDGE.store) doorTo[i] = hub.j;
      else viol(i, "Store must open to Kitchen/Hall", 150);
    }
  });
  // connectivity: every room's door chain must lead back to the Hall (no two lounges that only open into each other)
  if (heavy) {
    const reach = new Array(n).fill(false); const hi = idx["Hall"]; if (hi !== undefined) reach[hi] = true;
    let changed = true;
    while (changed) { changed = false; for (let i = 0; i < n; i++) if (!reach[i] && doorTo[i] !== null && reach[doorTo[i]]) { reach[i] = true; changed = true; } }
    units.forEach((u, i) => { if (!reach[i] && doorTo[i] !== null) viol(i, u.name + " is not connected to the Hall", 400); });
  }
  return { cost, issues, doorTo };
}

