// ---- slicing tree: leaf = {leaf: unitIndex}; node = {flip, a, b} ----
export function annotateT(n, units) {
  if (n.leaf !== undefined) {
    const u = units[n.leaf], sn = Math.min(u.minW, u.minH);
    n.t = u.t; n.nx = n.ny = sn;
    if (n.pair !== undefined) { const b = units[n.pair]; n.t += b.t; n.nx = n.ny = Math.max(sn, Math.min(b.minW, b.minH)); }
    return n.t;
  }
  n.t = annotateT(n.a, units) + annotateT(n.b, units);
  // minimum extent this subtree needs along x / y (side-by-side children add up, stacked children take the max)
  if (n.dir === "V") { n.nx = n.a.nx + n.b.nx; n.ny = Math.max(n.a.ny, n.b.ny); }
  else if (n.dir === "H") { n.ny = n.a.ny + n.b.ny; n.nx = Math.max(n.a.nx, n.b.nx); }
  return n.t;
}
export function layoutTree(n, rect, units, out, fs) {
  if (n.leaf !== undefined) {
    if (n.pair === undefined) { out.push({ u: n.leaf, rect }); return; }
    // a suite = bedroom + attached bathroom stacked; the bedroom sits on the passage (road) side `fs`
    const bu = units[n.leaf], ba = units[n.pair];
    const depth = fs === "top" || fs === "bottom" ? rect.h : rect.w;
    const bd = Math.min(depth * 0.45, Math.max(depth * ba.t / (ba.t + bu.t), Math.min(ba.minW, ba.minH) + 0.3));
    let bed, bath;
    if (fs === "top") { bed = { x: rect.x, y: rect.y, w: rect.w, h: rect.h - bd }; bath = { x: rect.x, y: rect.y + rect.h - bd, w: rect.w, h: bd }; }
    else if (fs === "bottom") { bath = { x: rect.x, y: rect.y, w: rect.w, h: bd }; bed = { x: rect.x, y: rect.y + bd, w: rect.w, h: rect.h - bd }; }
    else if (fs === "left") { bed = { x: rect.x, y: rect.y, w: rect.w - bd, h: rect.h }; bath = { x: rect.x + rect.w - bd, y: rect.y, w: bd, h: rect.h }; }
    else { bath = { x: rect.x, y: rect.y, w: bd, h: rect.h }; bed = { x: rect.x + bd, y: rect.y, w: rect.w - bd, h: rect.h }; }
    out.push({ u: n.leaf, rect: bed }); out.push({ u: n.pair, rect: bath });
    return;
  }
  const ta = n.a.t, tb = n.b.t; // (fs = side of the plot facing the road; only suites use it)
  // area-proportional split, nudged by the search gene `adj` so room widths can adapt to the plot
  let r = Math.min(0.88, Math.max(0.12, (ta / (ta + tb)) * (1 + n.adj)));
  if (n.dir) { // big plans: never squeeze a side below the minimum extent its rooms need (when the space allows it)
    const total = n.dir === "V" ? rect.w : rect.h, na = n.dir === "V" ? n.a.nx : n.a.ny, nb = n.dir === "V" ? n.b.nx : n.b.ny;
    if (na + nb <= total) r = Math.max(na / total, Math.min(1 - nb / total, r));
  }
  // cut across the longer side (keeps rooms squarish); `flip` is the search's gene to cut the other way
  if (n.dir ? n.dir === "V" : (rect.w >= rect.h) !== n.flip) {
    const wa = rect.w * r;
    layoutTree(n.a, { x: rect.x, y: rect.y, w: wa, h: rect.h }, units, out, fs);
    layoutTree(n.b, { x: rect.x + wa, y: rect.y, w: rect.w - wa, h: rect.h }, units, out, fs);
  } else {
    const ha = rect.h * r;
    layoutTree(n.a, { x: rect.x, y: rect.y, w: rect.w, h: ha }, units, out, fs);
    layoutTree(n.b, { x: rect.x, y: rect.y + ha, w: rect.w, h: rect.h - ha }, units, out, fs);
  }
}
export function randomTreeDir(list, dir, rnd, top, stack) {
  if (list.length === 1) return Object.assign({}, list[0]);
  const k = 1 + Math.floor(rnd() * (list.length - 1));
  // the top split keeps the band direction; deeper splits may stack small rooms (e.g. utility over store) instead
  const d = top !== false || !stack || rnd() >= 0.35 ? dir : (dir === "V" ? "H" : "V");
  return { dir: d, flip: false, adj: (rnd() - 0.5) * 0.4, a: randomTreeDir(list.slice(0, k), dir, rnd, false, stack), b: randomTreeDir(list.slice(k), dir, rnd, false, stack) };
}
export function randomTree(list, rnd) {
  if (list.length === 1) return { leaf: list[0] };
  const k = 1 + Math.floor(rnd() * (list.length - 1));
  return { flip: rnd() < 0.25, adj: (rnd() - 0.5) * 0.5, a: randomTree(list.slice(0, k), rnd), b: randomTree(list.slice(k), rnd) };
}
export function cloneTree(n) { return n.leaf !== undefined ? { leaf: n.leaf, pair: n.pair } : { flip: n.flip, dir: n.dir, adj: n.adj, a: cloneTree(n.a), b: cloneTree(n.b) }; }
export function collectNodes(n, leaves, inner) {
  if (n.leaf !== undefined) leaves.push(n); else { inner.push(n); collectNodes(n.a, leaves, inner); collectNodes(n.b, leaves, inner); }
}
export function mutateTree(tree, rnd) {
  const t = cloneTree(tree), leaves = [], inner = [];
  collectNodes(t, leaves, inner);
  const op = rnd();
  if (op < 0.4 && inner.length) {
    const nd = inner[Math.floor(rnd() * inner.length)];
    nd.adj = Math.max(-0.6, Math.min(0.9, nd.adj + (rnd() - 0.5) * 0.3));
  } else if (op < 0.7 && leaves.length > 1) {
    const i = Math.floor(rnd() * leaves.length); let j = Math.floor(rnd() * leaves.length);
    if (j === i) j = (j + 1) % leaves.length;
    const tl = leaves[i].leaf, tp = leaves[i].pair; leaves[i].leaf = leaves[j].leaf; leaves[i].pair = leaves[j].pair; leaves[j].leaf = tl; leaves[j].pair = tp;
  } else if (op < 0.85 && inner.length) {
    const nd = inner[Math.floor(rnd() * inner.length)];
    if (nd.dir) nd.dir = nd.dir === "V" ? "H" : "V"; else nd.flip = !nd.flip;
  } else if (inner.length) {
    const nd = inner[Math.floor(rnd() * inner.length)]; const tmp = nd.a; nd.a = nd.b; nd.b = tmp;
  }
  return t;
}

