import { planHome } from './engine/planner.js';
import { computeDoors } from './engine/doors.js';
import { render2D } from './render/render2d.js';
import { initThreeIfNeeded, render3D, resizeThree } from './render/render3d.js';

// =========================================================
// ORCHESTRATION
// =========================================================
import { current, addProject, thumbSVG } from './state.js';
import { api } from './api.js';
import './styles/app.css';
import { route, startRouter } from './router.js';
import * as pages from './pages/index.js';
let currentTab = '2d';

export function switchTab(tab) {
  currentTab = tab;
  document.getElementById('tab2dBtn').classList.toggle('active', tab === '2d');
  document.getElementById('tab3dBtn').classList.toggle('active', tab === '3d');
  document.getElementById('view2dCard').style.display = tab === '2d' ? 'block' : 'none';
  document.getElementById('view3dCard').style.display = tab === '3d' ? 'block' : 'none';
  document.getElementById('view3dHint').style.display = tab === '3d' ? 'block' : 'none';
  if (tab === '3d') {
    initThreeIfNeeded();
    // container was hidden (display:none) during init, so size it properly now
    setTimeout(() => resizeThree(), 30);
  }
}

// ---- "Show another design": each click runs a new seeded search that must differ from every design already shown.
// Plans are cached so Previous/Next (and the roof toggle) show exactly the same design again, instantly.
let designs = [], variantIdx = 0, shownSigs = [], nextSeed = 1, designBusy = false;
export function resetDesigns() { designs = []; variantIdx = 0; shownSigs = []; nextSeed = 1; }
export function setDesignBusy(busy, msg) {
  designBusy = busy;
  document.getElementById('nextDesignBtn').disabled = busy;
  document.getElementById('prevDesignBtn').disabled = busy || variantIdx === 0;
  if (msg) document.getElementById('designLabel').textContent = msg;
}
export function otherDesign(dir) {
  if (designBusy) return;
  const length = parseFloat(document.getElementById('lengthInput').value) || 0;
  const width = parseFloat(document.getElementById('widthInput').value) || 0;
  const facing = document.getElementById('entranceInput').value;
  if (length <= 0 || width <= 0) return;
  if (dir < 0) { if (variantIdx > 0) variantIdx--; generateLayout(); return; }
  if (variantIdx + 1 < designs.length) { variantIdx++; generateLayout(); return; }
  // new design: run the search in small steps (one try per timer tick) so the page shows "Finding..." and never looks frozen
  setDesignBusy(true, "⏳ Finding another design…");
  let tries = 0, base = null;
  const step = () => {
    try {
      base = base || designs[0] || (designs[0] = planHome(length, width, facing, 0));
      if (!shownSigs.length) shownSigs.push(base.layout.sig);
      if (tries++ >= 6) { setDesignBusy(false, "No more good designs for this plot — try changing size or facing"); return; }
      const pl = planHome(length, width, facing, nextSeed++, shownSigs);
      // accept only a valid plan that is genuinely different and not much worse than the best one
      if (pl.layout.issues.length === 0 && pl.layout.cost <= base.layout.cost + 90 && !shownSigs.includes(pl.layout.sig)) {
        shownSigs.push(pl.layout.sig); designs.push(pl); variantIdx = designs.length - 1;
        generateLayout(); setDesignBusy(false); return;
      }
      setTimeout(step, 20);
    } catch (e) { setDesignBusy(false, "Error: " + e.message); console.error(e); }
  };
  setTimeout(step, 40);
}

export function generateLayout() {
  const length = parseFloat(document.getElementById('lengthInput').value) || 0;
  const width = parseFloat(document.getElementById('widthInput').value) || 0;
  const facing = document.getElementById('entranceInput').value;
  if (length <= 0 || width <= 0) return;

  const totalArea = length * width;
  document.getElementById('totalAreaText').textContent = totalArea.toFixed(0) + " sq.ft";

  Object.assign(current, { length, width, facing });
  const plan = designs[variantIdx] || (designs[variantIdx] = planHome(length, width, facing, 0));
  current.plan = plan;
  const config = plan.config, layout = plan.layout;
  { const b = document.getElementById('saveBtn'); if (b) b.textContent = 'Save to Projects'; }
  document.getElementById('designLabel').textContent = `Design ${variantIdx + 1} of ${designs.length}`;
  document.getElementById('prevDesignBtn').disabled = variantIdx === 0;
  document.getElementById('planSummary').textContent = `Auto-planned: ${config.bhk} BHK, ${config.baths} bathroom${config.baths > 1 ? "s" : ""}${config.cars ? `, parking for ${config.cars} cars` : ""}`;

  if (layout.issues.length > 0) {
    document.getElementById('validLayoutView').style.display = "none";
    const inv = document.getElementById('invalidView');
    inv.style.display = "block";
    inv.innerHTML = `<strong>⚠ Plot not suitable</strong>
      A ${length}×${width} ft plot (${totalArea.toFixed(0)} sq.ft, ${facing}-facing) could not be planned as a ${config.bhk} BHK with every room at a usable size and opening into the Hall.<br><br>
      Problem rooms: <strong>${[...new Set(layout.issues.map(i => i.room))].join(", ")}</strong><br>
      Suggested minimum for this size: <strong>~${config.minArea} sq.ft</strong> and a width of at least ~15 ft.<br><br>
      Try a wider / larger plot or a different entrance facing — very long, narrow plots (e.g. 10 ft wide) cannot hold a Hall plus rooms side by side.`;
    return;
  }
  document.getElementById('validLayoutView').style.display = "block";
  document.getElementById('invalidView').style.display = "none";

  const doors = computeDoors(layout, length, width, facing);
  const hubNames = ["Hall"].concat(layout.leaves.filter(l => l.room.kind === "dining").map(() => "Dining"), layout.leaves.filter(l => l.room.kind === "lounge").map(() => "Lounge"));
  document.getElementById('patternText').textContent =
    `Entrance facing ${({N:"North",S:"South",E:"East",W:"West"})[facing]}. Planned as ${config.bhk} BHK with ${config.baths} bathroom${config.baths > 1 ? "s" : ""} for a ${totalArea.toFixed(0)} sq.ft plot. Every room opens into the ${[...new Set(hubNames)].join(" / ")} — no corridors, as in typical Indian homes.` +
    (config.villa ? ` Large-plot (villa) plan: ${config.cars}-car porch on the road side, pooja room, family lounge, study, guest room${config.bhk >= 5 ? ", servant room, home theatre" : ""} and more.` : "") +
    (config.dropped && config.dropped.length ? ` (Left out because they do not fit this plot shape: ${config.dropped.join(", ")}.)` : "") +
    (config.noParking ? " (Plot frontage is too narrow for a car porch beside the Hall, so parking was left out.)" : "") +
    (config.usedPassage ? " (This long, narrow plot needed a short passage so every room can reach the Hall.)" : "");

  render2D(layout, doors, length, width, facing);
  try { render3D(layout, doors, length, width); } catch (e) { console.warn('3D view unavailable:', e.message); }
}

let genTimer = null;
export function generateLayoutSoon() { resetDesigns(); clearTimeout(genTimer); genTimer = setTimeout(generateLayout, 180); }

export function initDesigner() {
  resetDesigns();
  const $ = id => document.getElementById(id), on = (id, ev, fn) => $(id).addEventListener(ev, fn);
  $('lengthInput').value = current.length; $('widthInput').value = current.width; $('entranceInput').value = current.facing;
  const syncFacing = () => document.querySelectorAll('.facing button').forEach(b => b.classList.toggle('on', b.dataset.f === $('entranceInput').value));
  document.querySelectorAll('.facing button').forEach(b => b.addEventListener('click', () => { $('entranceInput').value = b.dataset.f; syncFacing(); generateLayoutSoon(); }));
  on('generateBtn', 'click', generateLayout);
  on('prevDesignBtn', 'click', () => otherDesign(-1));
  on('nextDesignBtn', 'click', () => otherDesign(1));
  on('tab2dBtn', 'click', () => switchTab('2d'));
  on('tab3dBtn', 'click', () => switchTab('3d'));
  on('showRoofInput', 'change', generateLayout);
  on('saveBtn', 'click', async () => {
    const pl = current.plan; if (!pl || pl.layout.issues.length) return;
    const rec = { length: current.length, width: current.width, facing: current.facing, bhk: pl.config.bhk || 0, villa: !!pl.config.villa, thumb: thumbSVG(pl.layout, current.length, current.width) };
    try { await api.addProject({ name: (rec.villa ? 'Villa ' : (rec.bhk + ' BHK home ')) + rec.length + '×' + rec.width, ...rec }); }
    catch { addProject(rec); }   // backend not running: keep it in this browser instead
    $('saveBtn').textContent = '✓ Saved';
  });
  ['lengthInput', 'widthInput'].forEach(id => on(id, 'input', generateLayoutSoon));
  syncFacing(); generateLayout();
}

// ---- app shell: routes
Object.entries(pages.routes).forEach(([n, p]) => route(n, p));
startRouter(document.getElementById('app'));
