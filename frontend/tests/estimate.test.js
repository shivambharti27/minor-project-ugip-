import { describe, it, expect } from 'vitest';
import { planHome, computeDoors } from './helpers.js';
import { estimate, measurePlan } from '../src/estimate/engine.js';

const run = (L, W, f = 'N', opts = {}) => { const p = planHome(L, W, f, 0); return estimate(p.layout, computeDoors(p.layout, L, W, f), opts); };

describe('estimate engine', () => {
  it('gives positive quantities and a total', () => {
    const e = run(40, 30);
    e.materials.forEach(m => expect(m.qty).toBeGreaterThan(0));
    expect(e.totals.grand).toBeGreaterThan(0);
  });
  it('quantities per sq ft stay in a realistic band', () => {
    [[30, 20], [40, 30], [50, 40], [60, 60]].forEach(([L, W]) => {
      const e = run(L, W), a = e.geometry.builtArea, m = Object.fromEntries(e.materials.map(x => [x.name.split(' ')[0], x.qty]));
      expect(m.Cement / a).toBeGreaterThan(0.25); expect(m.Cement / a).toBeLessThan(0.6);
      expect(m.Steel / a).toBeGreaterThan(2); expect(m.Steel / a).toBeLessThan(5);
    });
  });
  it('a bigger plot costs more, a second floor costs more, premium costs more than economy', () => {
    expect(run(50, 40).totals.grand).toBeGreaterThan(run(40, 30).totals.grand);
    expect(run(40, 30, 'N', { floors: 2 }).totals.grand).toBeGreaterThan(run(40, 30).totals.grand * 1.5);
    expect(run(40, 30, 'N', { grade: 'premium' }).totals.grand).toBeGreaterThan(run(40, 30, 'N', { grade: 'economy' }).totals.grand);
  });
  it('a rate override changes the total', () => {
    expect(run(40, 30, 'N', { rates: { cement: 800 } }).totals.grand).toBeGreaterThan(run(40, 30).totals.grand);
  });
  it('measures walls, with inner walls inside the outer ring', () => {
    const p = planHome(40, 30, 'N', 0), g = measurePlan(p.layout, computeDoors(p.layout, 40, 30, 'N'));
    expect(g.extLen).toBeGreaterThan(2 * (40 + 30) * 0.9); expect(g.intLen).toBeGreaterThan(20);
  });
});
