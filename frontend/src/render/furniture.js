// =========================================================
// FURNITURE LAYOUT (pure, shared by 2D and 3D)
// =========================================================
export function getEdgeDoorFlags(rect, doors) {
  const EPS = 0.25;
  const hasDoor = (axis, pos, from, to) => doors.some(d =>
    d.edge.axis === axis && Math.abs(d.edge.pos - pos) < EPS && d.edge.from < to - 0.05 && d.edge.to > from + 0.05);
  return {
    top: hasDoor("h", rect.y, rect.x, rect.x + rect.w),
    bottom: hasDoor("h", rect.y + rect.h, rect.x, rect.x + rect.w),
    left: hasDoor("v", rect.x, rect.y, rect.y + rect.h),
    right: hasDoor("v", rect.x + rect.w, rect.y, rect.y + rect.h)
  };
}
export function clampFurniture(f, rect) {
  const pad = 0.15;
  let x = Math.max(f.x, rect.x + pad), y = Math.max(f.y, rect.y + pad);
  let w = Math.min(f.w, rect.x + rect.w - x - pad), h = Math.min(f.h, rect.y + rect.h - y - pad);
  return { x, y, w, h };
}
export function furnitureForBedroom(rect, doors) {
  const flags = getEdgeDoorFlags(rect, doors);
  let doorSide = null;
  ["top", "bottom", "left", "right"].forEach(s => { if (flags[s]) doorSide = s; });
  const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" };
  let backWall = doorSide ? opposite[doorSide] : "bottom";
  if (flags[backWall]) { const c = ["top", "bottom", "left", "right"].filter(s => !flags[s]); if (c.length) backWall = c[0]; }
  const items = [];
  const WT = 0.4, bedDepth = 6.5, singleW = 3.25, doubleW = 5.0;
  const isHoriz = (backWall === "top" || backWall === "bottom");
  const available = isHoriz ? rect.w : rect.h;
  const bedWidth = available >= doubleW + 1.5 ? doubleW : singleW;
  let bedRect;
  if (backWall === "bottom") bedRect = { x: rect.x + (rect.w - bedWidth) / 2, y: rect.y + rect.h - bedDepth - WT, w: bedWidth, h: bedDepth };
  else if (backWall === "top") bedRect = { x: rect.x + (rect.w - bedWidth) / 2, y: rect.y + WT, w: bedWidth, h: bedDepth };
  else if (backWall === "left") bedRect = { x: rect.x + WT, y: rect.y + (rect.h - bedWidth) / 2, w: bedDepth, h: bedWidth };
  else bedRect = { x: rect.x + rect.w - bedDepth - WT, y: rect.y + (rect.h - bedWidth) / 2, w: bedDepth, h: bedWidth };
  items.push({ type: "bed", rect: bedRect });
  const wardrobeDepth = 2.0, wardrobeLen = Math.min(4.5, (isHoriz ? rect.h : rect.w) * 0.4);
  if ((isHoriz ? rect.h : rect.w) - bedDepth > wardrobeDepth + 1) {
    let wRect;
    if (isHoriz) {
      const side = (doorSide === "left") ? "right" : "left";
      const y0 = backWall === "bottom" ? rect.y + WT : rect.y + rect.h - wardrobeLen - WT;
      wRect = side === "left" ? { x: rect.x + WT, y: y0, w: wardrobeDepth, h: wardrobeLen } : { x: rect.x + rect.w - wardrobeDepth - WT, y: y0, w: wardrobeDepth, h: wardrobeLen };
    } else {
      const side = (doorSide === "top") ? "bottom" : "top";
      const x0 = backWall === "right" ? rect.x + rect.w - wardrobeLen - WT : rect.x + WT;
      wRect = side === "top" ? { x: x0, y: rect.y + WT, w: wardrobeLen, h: wardrobeDepth } : { x: x0, y: rect.y + rect.h - wardrobeDepth - WT, w: wardrobeLen, h: wardrobeDepth };
    }
    items.push({ type: "wardrobe", rect: wRect });
  }
  return items;
}
export function furnitureForHall(rect, doors) {
  const flags = getEdgeDoorFlags(rect, doors);
  const noDoor = ["top", "bottom", "left", "right"].filter(s => !flags[s]);
  const tvWall = noDoor.length ? noDoor[0] : "bottom";
  const isHoriz = (tvWall === "top" || tvWall === "bottom");
  const items = [];
  const tvLen = Math.min(4, (isHoriz ? rect.w : rect.h) * 0.5), tvDepth = 0.5;
  let tvRect;
  if (tvWall === "bottom") tvRect = { x: rect.x + (rect.w - tvLen) / 2, y: rect.y + rect.h - tvDepth - 0.2, w: tvLen, h: tvDepth };
  else if (tvWall === "top") tvRect = { x: rect.x + (rect.w - tvLen) / 2, y: rect.y + 0.2, w: tvLen, h: tvDepth };
  else if (tvWall === "left") tvRect = { x: rect.x + 0.2, y: rect.y + (rect.h - tvLen) / 2, w: tvDepth, h: tvLen };
  else tvRect = { x: rect.x + rect.w - tvDepth - 0.2, y: rect.y + (rect.h - tvLen) / 2, w: tvDepth, h: tvLen };
  items.push({ type: "tv_unit", rect: tvRect });
  const sofaDepth = 2.2, sofaLen = Math.min(5, (isHoriz ? rect.w : rect.h) * 0.55), gapFromTV = Math.min(3.5, (isHoriz ? rect.h : rect.w) * 0.35);
  let sofaRect, sofaArmRect;
  if (tvWall === "bottom") {
    const sy = rect.y + rect.h - gapFromTV - sofaDepth;
    sofaRect = { x: rect.x + (rect.w - sofaLen) / 2, y: sy, w: sofaLen, h: sofaDepth };
    sofaArmRect = { x: rect.x + (rect.w - sofaLen) / 2, y: sy - 2.2, w: sofaDepth, h: 2.2 };
  } else if (tvWall === "top") {
    const sy = rect.y + gapFromTV;
    sofaRect = { x: rect.x + (rect.w - sofaLen) / 2, y: sy, w: sofaLen, h: sofaDepth };
    sofaArmRect = { x: rect.x + (rect.w - sofaLen) / 2, y: sy + sofaDepth, w: sofaDepth, h: 2.2 };
  } else if (tvWall === "left") {
    const sx = rect.x + gapFromTV;
    sofaRect = { x: sx, y: rect.y + (rect.h - sofaLen) / 2, w: sofaDepth, h: sofaLen };
    sofaArmRect = { x: sx + sofaDepth, y: rect.y + (rect.h - sofaLen) / 2, w: 2.2, h: sofaDepth };
  } else {
    const sx = rect.x + rect.w - gapFromTV - sofaDepth;
    sofaRect = { x: sx, y: rect.y + (rect.h - sofaLen) / 2, w: sofaDepth, h: sofaLen };
    sofaArmRect = { x: sx - 2.2, y: rect.y + (rect.h - sofaLen) / 2, w: 2.2, h: sofaDepth };
  }
  items.push({ type: "sofa", rect: sofaRect });
  items.push({ type: "sofa", rect: sofaArmRect });
  return items;
}
export function furnitureForKitchen(rect, doors) {
  const flags = getEdgeDoorFlags(rect, doors);
  const noDoor = ["top", "bottom", "left", "right"].filter(s => !flags[s]);
  const items = [];
  const counterDepth = 2.0;
  const chosenH = noDoor.find(s => s === "top" || s === "bottom");
  const chosenV = noDoor.find(s => s === "left" || s === "right");
  if (chosenH) { const y = chosenH === "top" ? rect.y + 0.2 : rect.y + rect.h - counterDepth - 0.2; items.push({ type: "counter", rect: { x: rect.x + 0.2, y, w: rect.w - 0.4, h: counterDepth } }); }
  if (chosenV) { const x = chosenV === "left" ? rect.x + 0.2 : rect.x + rect.w - counterDepth - 0.2; items.push({ type: "counter", rect: { x, y: rect.y + 0.2, w: counterDepth, h: rect.h - 0.4 } }); }
  if (!chosenH && !chosenV) items.push({ type: "counter", rect: { x: rect.x + 0.2, y: rect.y + rect.h - counterDepth - 0.2, w: rect.w - 0.4, h: counterDepth } });
  return items;
}
export function furnitureForBathroom(rect, doors) {
  const flags = getEdgeDoorFlags(rect, doors);
  let doorSide = null;
  ["top", "bottom", "left", "right"].forEach(s => { if (flags[s]) doorSide = s; });
  const items = [];
  const toiletW = 1.4, toiletH = 2.2;
  let tx = rect.x + 0.2, ty = rect.y + rect.h - toiletH - 0.2;
  if (doorSide === "left") tx = rect.x + rect.w - toiletW - 0.2;
  if (doorSide === "bottom") ty = rect.y + 0.2;
  items.push({ type: "toilet", rect: { x: tx, y: ty, w: toiletW, h: toiletH } });
  items.push({ type: "basin", rect: { x: rect.x + 0.2, y: rect.y + 0.2, w: 1.6, h: 1.2 } });
  return items;
}
export function furnitureForDining(rect) {
  const tw = Math.min(rect.w * 0.55, 6), th = Math.min(rect.h * 0.55, 3.5);
  return [{ type: "dining_table", rect: { x: rect.x + (rect.w - tw) / 2, y: rect.y + (rect.h - th) / 2, w: tw, h: th } }];
}
export function furnitureForStore(rect) {
  return [
    { type: "shelf", rect: { x: rect.x + 0.2, y: rect.y + 0.2, w: rect.w - 0.4, h: 0.6 } },
    { type: "shelf", rect: { x: rect.x + 0.2, y: rect.y + rect.h - 0.8, w: rect.w - 0.4, h: 0.6 } }
  ];
}
export function furnitureForParking(rect) {
  const carW = 7.5, carL = 15, gap = 1.5;
  let lenAlongY;
  if (rect.h <= rect.w) lenAlongY = rect.h >= carL + 1; else lenAlongY = !(rect.w >= carL + 1);
  const len = lenAlongY ? rect.h : rect.w, span = lenAlongY ? rect.w : rect.h;
  const n = Math.min(6, Math.max(1, Math.floor((span + gap) / (carW + gap))));
  const start = (span - (n * carW + (n - 1) * gap)) / 2, off = Math.max(0, (len - carL) / 2);
  const items = [];
  for (let k = 0; k < n; k++) {
    const sp = start + k * (carW + gap);
    items.push({ type: "car", rect: lenAlongY ? { x: rect.x + sp, y: rect.y + off, w: carW, h: Math.min(carL, len) } : { x: rect.x + off, y: rect.y + sp, w: Math.min(carL, len), h: carW } });
  }
  return items;
}
export function computeFurniture(leaf, doors) {
  const name = leaf.room.name, kind = leaf.room.kind;
  let items = [];
  if (kind === "hall" || kind === "lounge" || name === "Home Theatre") items = furnitureForHall(leaf.rect, doors);
  else if (kind === "kitchen") items = furnitureForKitchen(leaf.rect, doors);
  else if (kind === "bed") items = furnitureForBedroom(leaf.rect, doors);
  else if (kind === "bath") items = furnitureForBathroom(leaf.rect, doors);
  else if (kind === "store" || kind === "pooja" || kind === "study" || name === "Library") items = furnitureForStore(leaf.rect);
  else if (kind === "dining") items = furnitureForDining(leaf.rect);
  else if (kind === "parking") items = furnitureForParking(leaf.rect);
  else if (kind === "garden") { // a few trees/shrubs along the boundary, a clear lawn and path in the middle
    const r = leaf.rect, d = 4.5, n = Math.max(1, Math.min(8, Math.floor(r.w / 12)));
    for (let k = 0; k < n; k++) { const x = r.x + (k + 0.5) * r.w / n - d / 2; items.push({ type: "tree", rect: { x, y: r.y + (k % 2 ? r.h - d - 1 : 1), w: d, h: d } }); }
  }
  return items.map(it => ({ type: it.type, rect: clampFurniture(it.rect, leaf.rect) })).filter(it => it.rect.w > 0.3 && it.rect.h > 0.3);
}

