// Full regression run: node tests/full-check.js   (same as `npm run check`)
import * as L from './helpers.js';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("  FAIL:", m); } };
const ovl = (a, b) => a.x + 0.05 < b.x + b.w && b.x + 0.05 < a.x + a.w && a.y + 0.05 < b.y + b.h && b.y + 0.05 < a.y + a.h;
const unfit = [];
function runCase(l, w, f, strict) {
  const area = l * w, pl = L.planHome(l, w, f), cfg = pl.config, lay = pl.layout;
  const tag = `${l}x${w} ${f} ${cfg.bhk}BHK`;
  if (lay.issues.length) { unfit.push(tag + " :: " + lay.issues.map(i => i.room + " " + i.msg).join("; ")); if (strict) ok(false, tag + " should be feasible"); return; }
  const rs = lay.leaves;
  rs.forEach(a => { const r = a.rect; ok(r.x > -0.1 && r.y > -0.1 && r.x + r.w < w + 0.1 && r.y + r.h < l + 0.1, tag + " " + a.room.name + " in bounds"); });
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) ok(!ovl(rs[i].rect, rs[j].rect), `${tag} overlap ${rs[i].room.name}/${rs[j].room.name}`);
  ok(Math.abs(rs.reduce((s, a) => s + a.rect.w * a.rect.h, 0) - area) < 0.5, tag + " rooms fill the plot exactly (no gaps)");
  rs.forEach(a => ok(L.sizeDeficit(a.rect, a.room) <= 0.1, `${tag} ${a.room.name} meets minimum size`));
  const names = rs.map(a => a.room.name); ok(new Set(names).size === names.length, tag + " unique names");
  // doors
  const doors = L.computeDoors(lay, l, w, f);
  rs.forEach(a => { if (a.room.name === "Hall") return; ok(!!a.doorTo, `${tag} ${a.room.name} has a door`); });
  rs.forEach(a => { if (!a.doorTo) return; const t = rs.find(x => x.room.name === a.doorTo); ok(!!L.sharedEdge(a.rect, t.rect), `${tag} ${a.room.name} door target adjacent`);
    if (a.room.kind === "bed" || a.room.kind === "kitchen" || a.room.kind === "dining") ok(["hall", "dining", "passage"].includes(t.room.kind), `${tag} ${a.room.name} opens into Hall/Dining`); });
  ok(doors.filter(d => d.isEntrance).length === 1, tag + " one entrance");
  const hall = rs.find(a => a.room.name === "Hall").rect;
  const on = f === "N" ? hall.y < 0.2 : f === "S" ? hall.y + hall.h > l - 0.2 : f === "W" ? hall.x < 0.2 : hall.x + hall.w > w - 0.2;
  ok(on, tag + " Hall on entrance wall");
  // no corridors / yards in output
  ok(lay.corridorRect === undefined && lay.yardRects === undefined, tag + " no corridor/yard");
  rs.forEach(a => L.computeFurniture(a, doors).forEach(fu => ok(fu.rect.x >= a.rect.x - 0.01 && fu.rect.y >= a.rect.y - 0.01 && fu.rect.x + fu.rect.w <= a.rect.x + a.rect.w + 0.01 && fu.rect.y + fu.rect.h <= a.rect.y + a.rect.h + 0.01, `${tag} furniture in ${a.room.name}`)));
  // determinism
  if (strict === "det") { const l2 = L.planHome(l, w, f).layout; ok(JSON.stringify(l2.leaves) === JSON.stringify(lay.leaves), tag + " deterministic"); }
}
// config tiers
[[300, 1], [450, 1], [600, 2], [750, 2], [900, 2], [1200, 3], [1800, 3], [2400, 4]].forEach(([a, b]) => ok(L.buildRoomConfig(a).bhk === b, `${a} sqft => ${b} BHK`));
// Indian budget range: every plot 500-750 sq ft (width>=15) must be feasible, all facings
for (let w = 15; w <= 30; w += 1) for (let l = 20; l <= 50; l += 1) { const a = l * w; if (a >= 500 && a <= 750 && Math.max(l, w) / Math.min(l, w) <= 2.5) ["N", "S", "E", "W"].forEach(f => runCase(l, w, f, (w >= 18 || l / w <= 1.95) ? true : false)); }
// wider range, report-only
for (const w of [18, 22, 25, 30, 35, 40]) for (const l of [20, 25, 30, 40, 50, 60]) { const a = l * w; if (a >= 350 && a <= 2400 && (a < 500 || a > 750)) ["N", "E"].forEach(f => runCase(l, w, f, false)); }
runCase(30, 20, "N", "det");
console.log("\nunfit plots (report only):", unfit.length); unfit.slice(0, 20).forEach(u => console.log("  ", u));
console.log(`\nTOTAL: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
