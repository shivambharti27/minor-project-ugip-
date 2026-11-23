import { current } from '../state.js';
import { planHome } from '../engine/planner.js';
import { computeDoors } from '../engine/doors.js';
import { measurePlan, estimateFromMeasurements } from '../estimate/engine.js';
import { api } from '../api.js';
import { BASE_RATES, GRADE_RATES, PRESETS } from '../estimate/rates.js';

const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
const num = n => Math.round(n).toLocaleString('en-IN');
const state = { floors: 1, grade: 'standard', preset: 'dehradun', over: {}, labour: null, misc: 5 };
const BASE_KEYS = Object.keys(BASE_RATES);
const RATE_LABELS = { cement: 'Cement (₹/bag)', steel: 'Steel (₹/kg)', brick: 'Brick (₹/piece)', sand: 'Sand (₹/cu ft)', aggregate: 'Aggregate (₹/cu ft)', excavation: 'Excavation (₹/m³)',
  floorTile: 'Floor tile (₹/sq ft)', bathTile: 'Bathroom tile (₹/sq ft)', wallTile: 'Wall tile (₹/sq ft)', mainDoor: 'Main door (₹ each)', flushDoor: 'Room door (₹ each)', bathDoor: 'Bathroom door (₹ each)', window: 'Window (₹/sq ft)',
  paintIn: 'Interior paint (₹/litre)', paintOut: 'Exterior paint (₹/litre)', electrical: 'Electrical (₹/sq ft)', plumbBath: 'Plumbing per bathroom (₹)', plumbKitchen: 'Plumbing, kitchen (₹)', plumbBase: 'Water supply & drainage (₹)' };

const labour = () => state.labour ?? PRESETS[state.preset].labourPerSqft;
async function compute() {
  const { length, width, facing } = current;
  const plan = current.plan && current.plan.layout.issues.length === 0 ? current.plan : planHome(length, width, facing, 0);
  if (plan.layout.issues.length) return { error: true };
  const m = measurePlan(plan.layout, computeDoors(plan.layout, length, width, facing));
  const options = { floors: state.floors, grade: state.grade, miscPct: state.misc, labourPerSqft: labour(), rates: { ...PRESETS[state.preset].rates, ...state.over } };
  try { return { plan, est: await api.estimate(m, options), source: 'server' }; }
  catch { return { plan, est: estimateFromMeasurements(m, options), source: 'browser' }; }
}

function body(r) {
  if (r.error) return `<div class="invalid"><strong>Plot not suitable</strong>This plot size could not be planned. Go to Design and try a different size.</div>`;
  const e = r.est, t = e.totals, g = e.geometry, maxW = Math.max(...e.works.map(w => w.total));
  const band = { economy: [1400, 1900], standard: [1800, 2600], premium: [2600, 3800] }[state.grade];
  const inBand = t.perSqft >= band[0] && t.perSqft <= band[1];
  return `
<div class="kpis"><div class="kpi"><small>ESTIMATED COST</small><b>${inr(t.grand)}</b><span>${state.grade} finish, ${state.floors} floor${state.floors > 1 ? 's' : ''}</span></div>
<div class="kpi"><small>COST PER SQ FT</small><b>${inr(t.perSqft)}</b><span>${inBand ? 'within' : 'outside'} typical ₹${num(band[0])}–${num(band[1])} range</span></div>
<div class="kpi"><small>BUILT-UP AREA</small><b>${num(t.builtTotal)} sq ft</b><span>${current.length} × ${current.width} ft plot</span></div>
<div class="kpi"><small>KEY MATERIALS</small><b>${num(e.materials[0].qty)} bags</b><span>cement · ${num(e.materials[1].qty)} kg steel · ${num(e.materials[2].qty)} bricks</span></div></div>

<h2 class="h3">Cost breakdown by work</h2>
<div class="tablewrap"><table class="table"><thead><tr><th>Work item</th><th>Quantity</th><th class="r">Material</th><th class="r">Labour</th><th class="r">Total</th><th class="bar-h">Share</th></tr></thead><tbody>
${e.works.map(w => `<tr><td>${w.name}</td><td>${w.qtyText}</td><td class="r">${inr(w.material)}</td><td class="r">${inr(w.labour)}</td><td class="r"><b>${inr(w.total)}</b></td><td class="bar-c"><span class="bar" style="width:${Math.max(3, w.total / maxW * 100)}%"></span></td></tr>`).join('')}
<tr class="sub"><td colspan="4">Subtotal</td><td class="r">${inr(t.subtotal)}</td><td></td></tr>
<tr><td colspan="4">Miscellaneous (staircase, water tank, site work) · ${state.misc}%</td><td class="r">${inr(t.misc)}</td><td></td></tr>
<tr><td colspan="4">Contractor overhead & profit · ${e.options.overheadPct}%</td><td class="r">${inr(t.overhead)}</td><td></td></tr>
<tr><td colspan="4">Contingency · ${e.options.contingencyPct}%</td><td class="r">${inr(t.contingency)}</td><td></td></tr>
<tr class="grand"><td colspan="4">Estimated total</td><td class="r">${inr(t.grand)}</td><td></td></tr></tbody></table></div>

<h2 class="h3">Material list (bill of quantities)</h2>
<div class="tablewrap"><table class="table"><thead><tr><th>Material</th><th class="r">Quantity</th><th>Unit</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>
${e.materials.map(m => `<tr><td>${m.name}</td><td class="r"><b>${num(m.qty)}</b></td><td>${m.unit}</td><td class="r">${inr(m.rate)}</td><td class="r">${inr(m.amount)}</td></tr>`).join('')}
<tr class="note-r"><td colspan="5">Doors, windows, electrical and plumbing are priced as supply-and-fix allowances in the table above.</td></tr></tbody></table></div>

<details class="how"><summary>How this is calculated</summary>
<ul><li><b>Measured from your plan:</b> built-up area ${num(g.builtArea)} sq ft per floor, outer wall ${g.extLen.toFixed(0)} ft, inner wall ${g.intLen.toFixed(0)} ft, ${g.doors} doors, ${g.windows} windows. Garden and car porch are open and get no walls or roof.</li>
<li><b>Structure:</b> RCC frame with one column per about 120 sq ft (9×12 in), isolated footings, plinth and roof beams, 5 in slab. Concrete M20 (1:1.5:3), PCC 1:4:8. Steel is estimated per cubic metre of concrete: footing 70, column 160, beam 130, slab 90 kg.</li>
<li><b>Concrete materials:</b> dry volume = wet volume × 1.54. Cement bag = 0.0347 m³.</li>
<li><b>Masonry:</b> 9 in outer walls, 4.5 in inner walls, 3 ft parapet, wall height 10 ft per floor. 500 bricks per m³, 1:6 mortar, openings deducted. Waste: bricks 5%, steel 3%.</li>
<li><b>Plaster:</b> 12 mm inside (1:5), 18 mm outside (1:4), 10 mm ceiling (1:4). Tile bed 25 mm (1:4). Tiles include 7% waste.</li>
<li><b>Paint:</b> putty 0.13 kg, primer 0.01 L and emulsion 0.02–0.025 L per sq ft (two coats).</li>
<li><b>Labour</b> is a rate per sq ft of built-up area, spread over the works in proportion to their material cost. Rates start from the selected location and are assumptions you can edit on the left; real prices differ by city, supplier and season.</li>
<li><b>Limits:</b> this is a preliminary estimate from a concept plan, not a structural design. Final quantities need a structural engineer's drawings. Upper floors are assumed to repeat the same plan.</li></ul></details>`;
}

export const page = {
  html: () => `<div class="wrap page"><div class="row" style="margin:0 0 6px"><h1 class="ptitle">Cost & material estimate</h1><div class="acts"><button class="btn light" id="csvBtn">Download CSV</button><button class="btn light" id="printBtn">Print</button></div></div>
<p class="psub" id="estSub"></p>
<div class="estlayout"><aside class="panel specs"><h3>Construction specifications</h3>
<div class="row2"><div><label for="eFloors">NUMBER OF FLOORS</label><select class="field" id="eFloors"><option value="1">G (1 floor)</option><option value="2">G+1 (2 floors)</option><option value="3">G+2 (3 floors)</option></select></div>
<div><label for="eGrade">FINISH QUALITY</label><select class="field" id="eGrade"><option value="economy">Economy</option><option value="standard">Standard</option><option value="premium">Premium</option></select></div></div>
<label for="ePreset">LOCATION (STARTING RATES)</label><select class="field" id="ePreset"></select>
<h4 class="rh">LOCAL MARKET UNIT RATES (EDITABLE)</h4>
<div class="row2" id="mainRates"></div>
<details class="how mini"><summary>More rates (tiles, doors, paint, electrical…)</summary><div class="row2" id="moreRates"></div></details>
<p class="psub fine" id="presetNote"></p></aside>
<div id="estBody"></div></div></div>`,
  mount: root => {
    const $ = id => root.querySelector(id);
    const MAIN = [['cement', 'Cement (₹/50 kg bag)'], ['steel', 'TMT steel (₹/kg)'], ['brick', 'Red bricks (₹/pc)'], ['sand', 'Sand (₹/cu ft)'], ['aggregate', 'Aggregate (₹/cu ft)'], ['labour', 'Labour (₹/sq ft)']];
    let last = null;
    const eff = () => ({ ...BASE_RATES, ...PRESETS[state.preset].rates, ...GRADE_RATES[state.grade], ...state.over });
    let seq = 0;
    const run = async () => {
      const mine = ++seq, r = await compute();
      if (mine !== seq || !root.isConnected) return;   // a newer request or another page took over
      last = r;
      $('#estBody').innerHTML = body(last);
      $('#estSub').textContent = `Based on your plot: ${current.length} × ${current.width} ft, ${({ N: 'North', S: 'South', E: 'East', W: 'West' })[current.facing]}-facing. Change the plot on the Design page.` + (r.source ? (r.source === 'server' ? ' Calculated by the Python backend.' : ' Backend not running, so this was calculated in your browser.') : '');
    };
    const field = ([k, label]) => `<label>${label}<input class="field" type="number" min="0" data-k="${k}" value="${k === 'labour' ? labour() : eff()[k]}"></label>`;
    const fillRates = () => {
      const e = eff();
      $('#mainRates').innerHTML = MAIN.map(field).join('');
      $('#moreRates').innerHTML = Object.keys(RATE_LABELS).filter(k => !MAIN.some(m => m[0] === k) && k !== 'excavation').map(k => field([k, RATE_LABELS[k]])).concat(field(['excavation', RATE_LABELS.excavation])).join('');
      root.querySelectorAll('.specs input[data-k]').forEach(i => i.addEventListener('input', () => {
        const v = +i.value; if (!(v >= 0)) return;
        if (i.dataset.k === 'labour') state.labour = v; else state.over[i.dataset.k] = v;
        $('#presetNote').textContent = 'Using your edited rates.'; run();
      }));
      $('#presetNote').textContent = PRESETS[state.preset].note;
    };
    $('#ePreset').innerHTML = Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${p.label}</option>`).join('');
    $('#eFloors').value = state.floors; $('#eGrade').value = state.grade; $('#ePreset').value = state.preset;
    $('#eFloors').addEventListener('change', e => { state.floors = +e.target.value; run(); });
    $('#eGrade').addEventListener('change', e => { state.grade = e.target.value; Object.keys(GRADE_RATES.standard).forEach(k => delete state.over[k]); fillRates(); run(); });
    $('#ePreset').addEventListener('change', e => { state.preset = e.target.value; BASE_KEYS.forEach(k => delete state.over[k]); state.labour = null; fillRates(); run(); });
    fillRates(); run();
    $('#printBtn').addEventListener('click', () => window.print());
    $('#csvBtn').addEventListener('click', () => {
      if (!last || last.error) return;
      const q = x => `"${String(x).replace(/"/g, '""')}"`;
      const rows = [['Work item', 'Quantity', 'Material', 'Labour', 'Total'], ...last.est.works.map(w => [w.name, w.qtyText, Math.round(w.material), Math.round(w.labour), Math.round(w.total)]),
        [], ['Material', 'Quantity', 'Unit', 'Rate', 'Amount'], ...last.est.materials.map(m => [m.name, m.qty, m.unit, m.rate, Math.round(m.amount)]), [], ['Estimated total', '', '', '', Math.round(last.est.totals.grand)]];
      const blob = new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ghar-ai-estimate.csv'; a.click(); URL.revokeObjectURL(a.href);
    });
  }
};
