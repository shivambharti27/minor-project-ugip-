// Writes backend/tests/fixtures.json: plan measurements + the browser engine's answers,
// so the Python backend can be tested to give identical numbers.  Run: node tests/make-fixtures.mjs
import { writeFileSync } from 'node:fs';
import { planHome, computeDoors } from './helpers.js';
import { measurePlan, estimateFromMeasurements } from '../src/estimate/engine.js';
import { PRESETS } from '../src/estimate/rates.js';
const out = [];
for (const [L, W, f, floors, grade, preset] of [[30, 20, 'N', 1, 'standard', 'dehradun'], [40, 30, 'E', 1, 'economy', 'hills'], [40, 30, 'N', 2, 'premium', 'metro'], [50, 40, 'S', 1, 'standard', 'dehradun'], [60, 60, 'N', 1, 'standard', 'metro']]) {
  const p = planHome(L, W, f, 0); const m = measurePlan(p.layout, computeDoors(p.layout, L, W, f));
  const options = { floors, grade, labourPerSqft: PRESETS[preset].labourPerSqft, rates: PRESETS[preset].rates };
  const e = estimateFromMeasurements(m, options);
  out.push({ name: `${L}x${W} ${f} G+${floors - 1} ${grade} ${preset}`, measurements: m, options, expected: { grand: e.totals.grand, perSqft: e.totals.perSqft, materials: e.materials.map(x => [x.name, x.qty, x.amount]) } });
}
writeFileSync(new URL('../../backend/tests/fixtures.json', import.meta.url), JSON.stringify(out));
console.log('fixtures:', out.length);
