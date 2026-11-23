import { ratesFor, DEFAULTS } from './rates.js';

// Pure functions: plan geometry in, quantities and cost out. No DOM here, so it can be tested
// and later moved to the Python backend with the same formulas.
const M3 = 0.0283168;          // 1 cubic foot in m³
const BAG_M3 = 0.0347;         // volume of one 50 kg cement bag in m³
const CFT_PER_M3 = 35.3147;
const WET_TO_DRY_CONC = 1.54, WET_TO_DRY_MORTAR = 1.27, BRICK_MORTAR_DRY = 1.33;
const BRICKS_PER_M3 = 500, BRICK_VOL_M3 = 0.19 * 0.09 * 0.09;
const STEEL_KG_M3 = { footing: 70, column: 160, beam: 130, slab: 90 };
const WASTE = { brick: 1.05, steel: 1.03 };

const isOpen = l => l.room.kind === 'garden' || l.room.kind === 'parking';
const isBath = n => /bath|toilet/i.test(n || '');

// cement / sand / aggregate (m³ of sand & aggregate, bags of cement) for concrete of a mix like [1,1.5,3]
function concrete(volM3, mix) {
  const s = mix.reduce((a, b) => a + b, 0), dry = volM3 * WET_TO_DRY_CONC;
  return { cement: dry * mix[0] / s / BAG_M3, sand: dry * mix[1] / s, agg: dry * mix[2] / s };
}
function mortar(volM3, ratio, dryFactor = WET_TO_DRY_MORTAR) { // 1 : ratio cement mortar
  const dry = volM3 * dryFactor;
  return { cement: dry / (1 + ratio) / BAG_M3, sand: dry * ratio / (1 + ratio), agg: 0 };
}

export function measurePlan(layout, doors) {
  const built = [...layout.pubLeaves, ...layout.privLeaves].filter(l => !isOpen(l));
  const cells = new Map();
  const add = (axis, pos, a, b) => {
    const p = Math.round(pos * 10), s = Math.round(a * 10), e = Math.round(b * 10);
    for (let i = s; i < e; i++) { const k = axis + p + ':' + i; cells.set(k, (cells.get(k) || 0) + 1); }
  };
  built.forEach(l => { const r = l.rect; add('h', r.y, r.x, r.x + r.w); add('h', r.y + r.h, r.x, r.x + r.w); add('v', r.x, r.y, r.y + r.h); add('v', r.x + r.w, r.y, r.y + r.h); });
  let ext = 0, int = 0;
  cells.forEach(c => { if (c === 1) ext += 0.1; else int += 0.1; });
  const builtArea = built.reduce((a, l) => a + l.rect.w * l.rect.h, 0);
  // openings
  const interior = doors.filter(d => !d.isGate && !d.isEntrance);
  const bathDoors = interior.filter(d => isBath(d.from) || isBath(d.to)).length;
  const flushDoors = interior.length - bathDoors;
  const hasMain = doors.some(d => d.isEntrance) ? 1 : 1;
  const windows = [];
  built.forEach(l => { if (l.room.exterior) { const a = l.rect.w * l.rect.h; windows.push(isBath(l.room.name) ? { w: 2, h: 2 } : { w: a > 150 ? 5 : 4, h: 4 }); } });
  const winArea = windows.reduce((a, w) => a + w.w * w.h, 0);
  const wetRooms = built.filter(l => isBath(l.room.name));
  const kitchens = built.filter(l => /kitchen/i.test(l.room.name));
  return { built, builtArea, extLen: ext, intLen: int, bathDoors, flushDoors, mainDoors: hasMain, windows, winArea, wetRooms, kitchens };
}

export function estimate(layout, doors, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const R = ratesFor(o.grade, options.rates);
  const g = measurePlan(layout, doors);
  const F = o.floors, H = o.storeyHeightFt;
  const doorA = { main: 4 * 7, flush: 3 * 7, bath: 2.5 * 7 };
  const intDoorA = g.flushDoors * doorA.flush + g.bathDoors * doorA.bath, mainA = g.mainDoors * doorA.main;

  const works = [];
  const work = (name, qtyText, mat, extra = {}) => works.push({ name, qtyText, cement: 0, sand: 0, agg: 0, steel: 0, bricks: 0, ...mat, ...extra });
  const wallLen = g.extLen + g.intLen;

  // ---- structure (RCC frame): columns on a ~120 sq ft grid
  const N = Math.max(4, Math.ceil(g.builtArea / 120));
  const fs = g.builtArea > 1500 ? 5 : 4, ft = g.builtArea > 1500 ? 1.5 : 1.25, colH = 4 + H * F;
  const exc = N * (fs + 1) ** 2 * 5 * M3;
  work('Earthwork excavation', exc.toFixed(1) + ' m³', {}, { directCost: exc * R.excavation });
  const pcc = N * (fs + 0.5) ** 2 * 0.33 * M3;
  work('PCC 1:4:8 below footings', pcc.toFixed(1) + ' m³', concrete(pcc, [1, 4, 8]));
  const foot = N * fs * fs * ft * M3;
  work('Footings (M20)', `${N} nos, ${fs}×${fs} ft`, { ...concrete(foot, [1, 1.5, 3]), steel: foot * STEEL_KG_M3.footing * WASTE.steel });
  const col = N * 0.75 * 1.0 * colH * M3;
  work('Columns 9×12 in (M20)', `${N} nos`, { ...concrete(col, [1, 1.5, 3]), steel: col * STEEL_KG_M3.column * WASTE.steel });
  const plinth = wallLen * 0.75 * 0.75 * M3, roofB = wallLen * 0.75 * 1.0 * F * M3, beams = plinth + roofB;
  work('Plinth & roof beams (M20)', beams.toFixed(1) + ' m³', { ...concrete(beams, [1, 1.5, 3]), steel: beams * STEEL_KG_M3.beam * WASTE.steel });
  const slab = g.builtArea * (5 / 12) * F * M3;
  work('Roof slab 5 in (M20)', (g.builtArea * F).toFixed(0) + ' sq ft', { ...concrete(slab, [1, 1.5, 3]), steel: slab * STEEL_KG_M3.slab * WASTE.steel });

  // ---- masonry
  const extWallA = Math.max(0, g.extLen * H - g.winArea - mainA) * F, intWallA = Math.max(0, g.intLen * H - intDoorA) * F;
  const parapet = g.extLen * 3 * F;   // 3 ft high, 4.5 in thick parapet on every roof
  const brickVol = (extWallA * 0.75 + intWallA * 0.375 + parapet * 0.375) * M3;
  const mort = mortar(brickVol * (1 - BRICKS_PER_M3 * BRICK_VOL_M3), 6, BRICK_MORTAR_DRY);
  work('Brick masonry (9 in outer, 4.5 in inner, parapet)', brickVol.toFixed(1) + ' m³', { ...mort, bricks: brickVol * BRICKS_PER_M3 * WASTE.brick });

  // ---- plaster
  const plIn = (Math.max(0, (g.extLen + 2 * g.intLen) * H - 2 * intDoorA - g.winArea - mainA)) * F;
  const plOut = extWallA / 1 * 1; // external face area ≈ outer wall area net of openings
  const ceil = g.builtArea * F;
  const t = { in: 0.012 / 0.3048, out: 0.018 / 0.3048, ceil: 0.010 / 0.3048, bed: 0.025 / 0.3048 };
  const p1 = mortar(plIn * t.in * M3, 5), p2 = mortar(plOut * t.out * M3, 4), p3 = mortar(ceil * t.ceil * M3, 4);
  work('Plastering (internal, external, ceiling)', (plIn + plOut + ceil).toFixed(0) + ' sq ft', { cement: p1.cement + p2.cement + p3.cement, sand: p1.sand + p2.sand + p3.sand });

  // ---- flooring & tiles
  const roomArea = g.built.reduce((a, l) => a + l.rect.w * l.rect.h, 0) * F;
  const bathFloor = g.wetRooms.reduce((a, l) => a + l.rect.w * l.rect.h, 0) * F;
  const dryFloor = roomArea - bathFloor;
  const per = l => 2 * (l.rect.w + l.rect.h);
  const bathWall = g.wetRooms.reduce((a, l) => a + Math.max(0, per(l) - 2.5) * 7, 0) * F;
  const kitWall = g.kitchens.reduce((a, l) => a + Math.max(0, per(l) - 3) * 2.5, 0) * F;
  const bed = mortar(roomArea * t.bed * M3, 4);
  work('Flooring & wall tiles', roomArea.toFixed(0) + ' sq ft floor', { cement: bed.cement, sand: bed.sand }, { tiles: { dry: dryFloor * 1.07, bath: bathFloor * 1.07, wall: (bathWall + kitWall) * 1.07 } });

  // ---- doors, windows, paint
  const nWin = g.windows.length * F;
  work('Doors & windows', `${(g.mainDoors + g.flushDoors + g.bathDoors) * F} doors, ${nWin} windows`, {}, { directCost: F * (g.mainDoors * R.mainDoor + g.flushDoors * R.flushDoor + g.bathDoors * R.bathDoor) + g.winArea * F * R.window, fixAndSupply: true });
  const inPaintA = plIn + ceil, outPaintA = plOut;
  const putty = inPaintA * 0.13, primer = (inPaintA + outPaintA) * 0.01, emIn = inPaintA * 0.02, emOut = outPaintA * 0.025;
  work('Painting (putty, primer, 2 coats)', (inPaintA + outPaintA).toFixed(0) + ' sq ft', {}, { directCost: putty * R.putty + primer * R.primer + emIn * R.paintIn + emOut * R.paintOut, paint: { putty, primer, emIn, emOut } });
  const nBath = g.wetRooms.length;
  work('Electrical wiring & fittings', (g.builtArea * F).toFixed(0) + ' sq ft', {}, { directCost: g.builtArea * F * R.electrical, fixAndSupply: true });
  work('Plumbing & sanitary', `${nBath} bathrooms, ${g.kitchens.length} kitchen`, {}, { directCost: nBath * R.plumbBath + g.kitchens.length * R.plumbKitchen + R.plumbBase, fixAndSupply: true });

  // ---- cost per work item
  const totals = { cement: 0, sand: 0, agg: 0, steel: 0, bricks: 0 };
  works.forEach(w => {
    ['cement', 'sand', 'agg', 'steel', 'bricks'].forEach(k => totals[k] += w[k] || 0);
    const sandCft = (w.sand || 0) * CFT_PER_M3, aggCft = (w.agg || 0) * CFT_PER_M3;
    let mat = w.cement * R.cement + w.steel * R.steel + w.bricks * R.brick + sandCft * R.sand + aggCft * R.aggregate;
    if (w.tiles) mat += w.tiles.dry * R.floorTile + w.tiles.bath * R.bathTile + w.tiles.wall * R.wallTile;
    if (w.directCost && !w.fixAndSupply && w.name.startsWith('Painting')) mat += w.directCost;
    w.material = mat + (w.fixAndSupply ? w.directCost : 0);
    w.labourBase = w.fixAndSupply ? 0 : (w.name.startsWith('Painting') ? w.directCost : mat);
    if (w.name.startsWith('Earthwork')) { w.material = 0; w.labourBase = 0; w.labour = w.directCost; }
  });
  // Labour: either a rupee rate per sq ft of built-up area (spread over the works by their material weight) or a % of material
  const baseSum = works.reduce((a, w) => a + w.labourBase, 0), builtAll = g.builtArea * F;
  works.forEach(w => {
    if (!w.name.startsWith('Earthwork')) w.labour = o.labourPerSqft > 0 ? (baseSum ? w.labourBase / baseSum * o.labourPerSqft * builtAll : 0) : w.labourBase * o.labourPct / 100;
    w.total = w.material + w.labour;
  });
  const sub = works.reduce((a, w) => a + w.total, 0);
  const misc = sub * o.miscPct / 100, overhead = (sub + misc) * o.overheadPct / 100, contingency = (sub + misc) * o.contingencyPct / 100, grand = sub + misc + overhead + contingency;
  const builtTotal = g.builtArea * F;

  const sandCftT = totals.sand * CFT_PER_M3, aggCftT = totals.agg * CFT_PER_M3;
  const materials = [
    { name: 'Cement (50 kg bags)', qty: Math.ceil(totals.cement), unit: 'bags', rate: R.cement },
    { name: 'Steel (TMT Fe500)', qty: Math.ceil(totals.steel), unit: 'kg', rate: R.steel },
    { name: 'Bricks', qty: Math.ceil(totals.bricks), unit: 'nos', rate: R.brick },
    { name: 'Sand', qty: Math.ceil(sandCftT), unit: 'cu ft', rate: R.sand },
    { name: 'Aggregate (20 mm)', qty: Math.ceil(aggCftT), unit: 'cu ft', rate: R.aggregate }
  ].map(m => ({ ...m, amount: m.qty * m.rate }));
  const tw = works.find(w => w.tiles).tiles, pw = works.find(w => w.paint).paint;
  materials.push(
    { name: 'Floor tiles (living / bedrooms)', qty: Math.ceil(tw.dry), unit: 'sq ft', rate: R.floorTile, amount: Math.ceil(tw.dry) * R.floorTile },
    { name: 'Anti-skid tiles (bathrooms)', qty: Math.ceil(tw.bath), unit: 'sq ft', rate: R.bathTile, amount: Math.ceil(tw.bath) * R.bathTile },
    { name: 'Wall tiles (bath & kitchen dado)', qty: Math.ceil(tw.wall), unit: 'sq ft', rate: R.wallTile, amount: Math.ceil(tw.wall) * R.wallTile },
    { name: 'Wall putty', qty: Math.ceil(pw.putty), unit: 'kg', rate: R.putty, amount: Math.ceil(pw.putty) * R.putty },
    { name: 'Primer', qty: Math.ceil(pw.primer), unit: 'litre', rate: R.primer, amount: Math.ceil(pw.primer) * R.primer },
    { name: 'Interior emulsion', qty: Math.ceil(pw.emIn), unit: 'litre', rate: R.paintIn, amount: Math.ceil(pw.emIn) * R.paintIn },
    { name: 'Exterior emulsion', qty: Math.ceil(pw.emOut), unit: 'litre', rate: R.paintOut, amount: Math.ceil(pw.emOut) * R.paintOut }
  );
  return { geometry: { builtArea: g.builtArea, floors: F, extLen: g.extLen, intLen: g.intLen, columns: N, doors: g.mainDoors + g.flushDoors + g.bathDoors, windows: g.windows.length },
    works, materials, totals: { subtotal: sub, misc, overhead, contingency, grand, perSqft: grand / builtTotal, builtTotal }, options: o, rates: R };
}
