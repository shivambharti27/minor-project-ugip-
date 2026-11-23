import { SEARCH_CLIMB, SEARCH_RANDOM, SEARCH_RESTARTS } from '../config/constants.js';
import { buildRoomConfig } from '../config/rooms.js';
import { hashStr, mulberry32 } from './rng.js';
import { annotateT, cloneTree, layoutTree, mutateTree, randomTree, randomTreeDir } from './tree.js';
import { evaluateLayout, onBoundary, sizeDeficit } from './evaluate.js';


// Plans a home for a plot. Normal case: every room opens into the Hall/Dining.
// Very long, narrow plots (e.g. 15x40) can't give every room a Hall wall, so
// only then a short 3-4 ft "Passage" is added as a second hub (last resort).
// A plan's "design signature" = which plot sides each room touches + which room each door opens into.
// Two plans with the same signature are the same design (small size differences don't count). A left-right
// mirror image (across the entrance direction) is also counted as the same design.
export function planSignature(items, W, H, facing) {
  const acrossX = facing === "N" || facing === "S";
  const build = flip => {
    const side = r => {
      let t = [r.y < 0.2 ? "T" : "", r.y + r.h > H - 0.2 ? "B" : "", r.x < 0.2 ? "L" : "", r.x + r.w > W - 0.2 ? "R" : ""].join("");
      if (flip) t = t.split("").map(c => acrossX ? (c === "L" ? "R" : c === "R" ? "L" : c) : (c === "T" ? "B" : c === "B" ? "T" : c)).join("");
      return t.split("").sort().join("");
    };
    return items.map(it => it.name + "@" + side(it.rect) + ">" + (it.door || "")).sort().join("|");
  };
  const a = build(false), b = build(true);
  return a < b ? a : b;
}

export function planHome(lengthFt, widthFt, facing, variant, avoid) {
  variant = variant || 0;
  let config = buildRoomConfig(lengthFt * widthFt);
  if (config.villa) { // narrow frontage: only as many bedroom suites as fit side by side in one row (about 12.5 ft each + a common bathroom)
    const across = facing === "N" || facing === "S" ? widthFt : lengthFt;
    let cap = Math.max(2, Math.floor((across - 6) / 12.5)), beds = config.units.filter(u => u.kind === "bed").length;
    const drop = [];
    ["Guest Room 2", "Bedroom 6", "Bedroom 5", "Bedroom 4", "Guest Room"].forEach(nm => { if (beds > cap && config.units.some(u => u.name === nm)) { drop.push(nm); beds--; } });
    if (drop.length) {
      const units = config.units.filter(u => !drop.includes(u.name) && !drop.includes(u.attach));
      config = Object.assign({}, config, { units, dropped: drop, bhk: units.filter(r => r.kind === "bed").length, baths: units.filter(r => r.kind === "bath").length });
    }
  }
  const layout = computeLayoutFt(lengthFt, widthFt, config, facing, variant, avoid);
  if (!layout.issues.length) return { config, layout };
  let best = { config, layout };
  const passage = { name: "Passage", kind: "passage", t: 36, minW: 3, minH: 6 };
  const withPassage = c => Object.assign({}, c, { units: c.units.concat([passage]), usedPassage: true });
  const attempt = cfg => {
    const lay = computeLayoutFt(lengthFt, widthFt, cfg, facing, variant, avoid);
    if (lay.issues.length < best.layout.issues.length) best = { config: cfg, layout: lay };
    return lay.issues.length === 0;
  };
  // 1) very long/narrow plots: add a short passage as a second hub
  if (config.villa) {
    for (let sd = 1; sd <= 2 && best.layout.issues.length; sd++) { // keep the parking if another seed can place it
      const lay = computeLayoutFt(lengthFt, widthFt, config, facing, (variant || 0) + 7 * sd, avoid);
      if (lay.issues.length < best.layout.issues.length) best = { config, layout: lay };
    }
    if (best.layout.issues.length && config.cars) attempt(Object.assign({}, config, { units: config.units.filter(u => u.kind !== "parking"), noParking: true, cars: 0 }));
    // optional extras that do not fit this plot shape are left out (never core rooms)
    if (config.cars && Math.min(lengthFt, widthFt) < 50 && !best.config.noParking) { // narrow plot: parking cannot sit beside the Hall
      const np0 = Object.assign({}, config, { units: config.units.filter(u => u.kind !== "parking"), noParking: true, cars: 0 });
      best = { config: np0, layout: computeLayoutFt(lengthFt, widthFt, np0, facing, variant, avoid) };
    }
    const OPT = /^(Home Theatre|Servant Room|Gym|Library|Sitting Lounge|Yoga Room|Party Hall|Guest Room 2?|Store Room|Utility Room|Bedroom [4-9])$/;
    let cur = best;
    for (let k = 0; k < 12 && cur.layout.issues.length; k++) {
      const names = new Set(cur.layout.issues.map(i => i.room));
      const CORE = /^(Hall|Garden|Kitchen|Dining Room|Family Lounge|Car Porch)$/;
      let drop = cur.config.units.filter(u => names.has(u.name) && (OPT.test(u.name) || (k >= 3 && !CORE.test(u.name) && u.kind !== "bath" || /^Common Bathroom/.test(u.name)))).map(u => u.name);
      const nonBed = drop.filter(n => !/^(Bedroom|Guest Room)/.test(n));
      if (nonBed.length && k < 6) drop = nonBed; // leave out extras first; bedrooms only as a last resort
      if (!drop.length) { // a core room is the problem: try another random seed on the same rooms
        const lay = computeLayoutFt(lengthFt, widthFt, cur.config, facing, (variant || 0) + 13 * (k + 1), avoid);
        cur = { config: cur.config, layout: lay };
      } else {
        const units = cur.config.units.filter(u => !drop.includes(u.name) && !drop.includes(u.attach));
        const cfg = Object.assign({}, cur.config, { units, dropped: (cur.config.dropped || []).concat(drop),
          bhk: units.filter(r => r.kind === "bed").length, baths: units.filter(r => r.kind === "bath").length });
        cur = { config: cfg, layout: computeLayoutFt(lengthFt, widthFt, cfg, facing, variant, avoid) };
      }
      if (cur.layout.issues.length < best.layout.issues.length) best = cur;
    }
    // still not clean: re-run the best configuration with other random seeds (the search is stochastic)
    for (let sd = 1; sd <= 4 && best.layout.issues.length; sd++) {
      const lay = computeLayoutFt(lengthFt, widthFt, best.config, facing, (variant || 0) + 31 * sd, avoid);
      if (lay.issues.length < best.layout.issues.length) best = { config: best.config, layout: lay };
    }
    return best;
  }
  if (!attempt(withPassage(config)) && config.cars) {
    // 2) frontage too narrow for a car porch beside the Hall: drop the parking and say so
    const np = Object.assign({}, config, { units: config.units.filter(u => u.kind !== "parking"), noParking: true, cars: 0 });
    if (!attempt(np)) attempt(withPassage(np));
  }
  return best;
}

export function computeLayoutFt(lengthFt, widthFt, config, facing, variant, avoid) {
  const W = widthFt, L = lengthFt;
  const acrossIsX = facing === "N" || facing === "S", frontFirst = facing === "N" || facing === "W";
  const fs = { N: "top", S: "bottom", W: "left", E: "right" }[facing]; // side of the plot that faces the road
  // villa: the road-side band (Garden + Car Porch) is ~20 ft deep whatever the plot depth; Garden gets the remaining area of that band
  const sumOthers = config.units.reduce((a, u) => a + (u.kind === "garden" ? 0 : u.t), 0);
  const gf = Math.min(0.24, 20 / (acrossIsX ? L : W));
  const porchT = (config.units.find(u => u.kind === "parking") || { t: 0 }).t;
  const units = config.villa ? config.units.map(u => u.kind === "garden" ? Object.assign({}, u, { t: Math.max(120, sumOthers * gf / (1 - gf) - porchT) }) : u) : config.units;
  const rnd = mulberry32(hashStr(`${W}x${L}${facing}${units.length}v${variant || 0}`));
  const root = { x: 0, y: 0, w: W, h: L };
  const avoidSet = new Set(avoid || []);
  const tryTree = tree => {
    const placed = []; annotateT(tree, units); layoutTree(tree, root, units, placed, fs);
    const ev = evaluateLayout(placed, units, W, L, facing);
    const sig = planSignature(placed.map(p => ({ name: units[p.u].name, rect: p.rect, door: ev.doorTo[p.u] !== null ? units[ev.doorTo[p.u]].name : null })), W, L, facing);
    if (avoidSet.has(sig)) ev.cost += 1000; // "show another design": steer the search away from designs already shown
    return { tree, placed, ev, sig };
  };
  // a bathroom always follows its bedroom in the shuffle so they often end up as neighbours
  const groups = [];
  units.forEach((u, i) => { if (u.attach === undefined) groups.push([i]); });
  units.forEach((u, i) => { if (u.attach !== undefined) { const bi = units.findIndex(x => x.name === u.attach); groups.find(g => g[0] === bi).push(i); } });
  let best = null;
  const heavy = units.length > 14;
  const stopCost = 30 + Math.max(0, units.length - 12) * 6;
  const clampAdj = v => Math.max(-0.6, Math.min(0.9, v));
  const shuffle = arr => { const o = arr.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = o[i]; o[i] = o[j]; o[j] = t; } return o; };
  if (config.villa) {
    // ---- Large plots: fixed zoning "bands" from the road to the back, the search only tunes room order + proportions ----
    //  G  road side : Garden + Car Porch (gate on the road)
    //  A  front rooms: Hall (main entrance from the garden), Pooja, Study, Kitchen, Utility/Store
    //  B  hubs      : Dining, Family/Sitting Lounge (+ extra rooms) — every bedroom below opens into one of these (no corridor)
    //  D  bedrooms  : suites (bedroom + attached bath behind it), common bathrooms, extra rooms
    const acrossDir = acrossIsX ? "V" : "H", depthDir = acrossIsX ? "H" : "V";
    const shallow = (acrossIsX ? L : W) < 66; // not deep enough for a separate hub row: hubs share the front-rooms row
    const items = { G: [], A: [], B1: [], D: [] };
    const extras = [];
    units.forEach((u, i) => {
      if (u.attach !== undefined) return;
      if (u.kind === "parking" || u.kind === "garden") items.G.push({ leaf: i });
      else if (u.kind === "hall" || u.kind === "study" || u.kind === "pooja" || u.kind === "kitchen" || u.kind === "store") items.A.push({ leaf: i });
      else if (u.kind === "lounge" || u.kind === "dining") (shallow ? items.A : items.B1).push({ leaf: i });
      else if (u.kind === "bed") { const bi = units.findIndex(x => x.attach === u.name); items.D.push(bi >= 0 ? { leaf: i, pair: bi } : { leaf: i }); }
      else extras.push({ leaf: i, kind0: u.kind }); // rooms + common bathrooms: go to whichever side of the passage has fewer rooms
    });
    extras.forEach(x => { (x.kind0 === "bath" ? items.D : shallow ? (items.A.length < items.D.length ? items.A : items.D) : items.B1.length + 1 < items.D.length ? items.B1 : items.D).push(x); });
    const bandItems = ["G", "A", "B1", "D"].map(k => items[k]).filter(x => x.length);
    const nb = bandItems.length;
    const bandKeys = ["G", "A", "B1", "D"].filter(k => items[k].length);
    const canStack = bandKeys.map(k => k === "A"); // only the living row may stack small rooms (utility over store); every room in the other rows must touch a hub
    const fixDirs = n => { if (n.leaf === undefined) { n.dir = acrossDir; fixDirs(n.a); fixDirs(n.b); } };
    const bandTree = (list, k) => randomTreeDir(shuffle(list), acrossDir, rnd, true, canStack[k]);
    const assemble = st => {
      const order = []; for (let k = 0; k < nb; k++) order.push(k);
      if (!frontFirst) order.reverse(); // first child = smaller coordinate
      let t = st.trees[order[0]];
      for (let k = 1; k < nb; k++) t = { dir: depthDir, flip: false, adj: st.genes[order[k]], a: t, b: st.trees[order[k]] };
      return t;
    };
    const tryState = st => { const c = tryTree(assemble(st)); c.st = st; return c; };
    const mutateState = st => {
      const o = { trees: st.trees.map(cloneTree), genes: st.genes.slice() };
      const multi = []; bandItems.forEach((b, k) => { if (b.length > 1) multi.push(k); });
      if (rnd() < 0.3 || !multi.length) { const k = Math.floor(rnd() * nb); o.genes[k] = clampAdj(o.genes[k] + (rnd() - 0.5) * 0.3); }
      else { const k = multi[Math.floor(rnd() * multi.length)]; o.trees[k] = mutateTree(o.trees[k], rnd); if (!canStack[k]) fixDirs(o.trees[k]); }
      return o;
    };
    const vRestarts = variant ? 4 : 6, vRandom = 200, vClimb = 3200;
    for (let rs = 0; rs < vRestarts; rs++) {
      let cur = null;
      for (let it = 0; it < vRandom; it++) {
        const cand = tryState({ trees: bandItems.map((b, k) => bandTree(b, k)), genes: bandItems.map(() => (rnd() - 0.5) * 0.4) });
        if (!cur || cand.ev.cost < cur.ev.cost) cur = cand;
      }
      let top = cur;
      for (let it = 0; it < vClimb; it++) {
        const cand = tryState(mutateState(cur.st));
        const T = 25 * (1 - it / vClimb) + 0.5;
        if (cand.ev.cost <= cur.ev.cost || rnd() < Math.exp(-(cand.ev.cost - cur.ev.cost) / T)) cur = cand;
        if (cur.ev.cost < top.ev.cost) top = cur;
      }
      cur = top;
      if (!best || cur.ev.cost < best.ev.cost) best = cur;
      if (best.ev.issues.length === 0 && best.ev.cost < stopCost) break;
    }
  } else {
    // a bathroom always follows its bedroom in the shuffle so they often end up as neighbours
    const groups = [];
    units.forEach((u, i) => { if (u.attach === undefined) groups.push([i]); });
    units.forEach((u, i) => { if (u.attach !== undefined) { const bi = units.findIndex(x => x.name === u.attach); groups.find(g => g[0] === bi).push(i); } });
    const restarts = variant ? 8 : SEARCH_RESTARTS;
    // several independent restarts (random trees, then hill-climb); stop early once a clean, low-cost plan is found
    for (let rs = 0; rs < restarts; rs++) {
      let cur = null;
      for (let it = 0; it < SEARCH_RANDOM; it++) {
        const order = groups.map(g => g.slice());
        for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
        const cand = tryTree(randomTree(order.flat(), rnd));
        if (!cur || cand.ev.cost < cur.ev.cost) cur = cand;
      }
      let top = cur;
      for (let it = 0; it < SEARCH_CLIMB; it++) {
        const cand = tryTree(mutateTree(cur.tree, rnd));
        const T = 25 * (1 - it / SEARCH_CLIMB) + 0.5; // simulated-annealing temperature
        if (cand.ev.cost <= cur.ev.cost || rnd() < Math.exp(-(cand.ev.cost - cur.ev.cost) / T)) cur = cand;
        if (cur.ev.cost < top.ev.cost) top = cur;
      }
      cur = top;
      if (!best || cur.ev.cost < best.ev.cost) best = cur;
      if (best.ev.issues.length === 0 && best.ev.cost < stopCost) break;
    }
  }
  const leaves = best.placed.map(p => {
    const u = units[p.u];
    const leaf = { room: { name: u.name, kind: u.kind, minW: u.minW, minH: u.minH, exterior: u.kind !== "parking" && u.kind !== "garden" && onBoundary(p.rect, W, L) }, rect: p.rect, doorTo: best.ev.doorTo[p.u] !== null ? units[best.ev.doorTo[p.u]].name : null };
    return leaf;
  });
  leaves.forEach(l => {
    const u = units.find(x => x.name === l.room.name);
    if (u.kind === "bath" && u.attach && l.doorTo === u.attach) { l.ensuiteOf = u.attach; const bed = leaves.find(x => x.room.name === u.attach); bed.ensuiteWith = u.name; }
  });
  const isPub = l => l.room.kind === "passage" || l.room.kind === "hall" || l.room.kind === "kitchen" || l.room.kind === "dining";
  const order = ["hall", "dining", "kitchen", "passage"];
  const pubLeaves = leaves.filter(isPub).sort((a, b) => order.indexOf(a.room.kind) - order.indexOf(b.room.kind));
  const privLeaves = leaves.filter(l => !isPub(l));
  const failing = leaves.filter(l => sizeDeficit(l.rect, l.room) > 0.1);
  return { leaves, pubLeaves, privLeaves, facing, issues: best.ev.issues, cost: best.ev.cost, failing, sig: best.sig };
}


