import { describe, test, expect } from 'vitest';
import { planHome, buildRoomConfig } from './helpers.js';

const area = r => r.rect.w * r.rect.h;
const find = (lay, name) => lay.leaves.find(l => l.room.name === name);

describe('room list is decided by plot area', () => {
  test.each([[450, 1], [600, 2], [1200, 3], [2400, 4]])('%i sq ft -> %i BHK', (a, bhk) => {
    expect(buildRoomConfig(a).bhk).toBe(bhk);
  });
});

describe('small Indian home (15 x 25 = 375 sq ft)', () => {
  const { layout } = planHome(15, 25, 'N');
  test('plan has no issues', () => expect(layout.issues).toEqual([]));
  test('kitchen is smaller than the bedroom', () => expect(area(find(layout, 'Kitchen'))).toBeLessThan(area(find(layout, 'Bedroom'))));
  test('hall is not bigger than the bedroom', () => expect(area(find(layout, 'Hall'))).toBeLessThanOrEqual(area(find(layout, 'Bedroom')) * 1.1));
});

describe('budget plots 500-750 sq ft work for every facing', () => {
  test.each([[25, 25], [30, 20], [35, 20], [40, 18]])('%i x %i', (l, w) => {
    for (const f of ['N', 'S', 'E', 'W']) expect(planHome(l, w, f).layout.issues).toEqual([]);
  });
});

describe('large plot (villa, 3500+ sq ft)', () => {
  test.each([[60, 60, 'N'], [80, 60, 'N'], [100, 80, 'N'], [75, 75, 'E']])('%i x %i %s', (l, w, f) => {
    const { layout, config } = planHome(l, w, f);
    expect(layout.issues).toEqual([]);
    expect(config.villa).toBe(true);
    expect(find(layout, 'Garden')).toBeTruthy();
    expect(layout.leaves.some(x => x.room.kind === 'passage')).toBe(false); // no corridor
  });
});

describe('determinism', () => {
  test('same input gives the same plan', () => {
    expect(JSON.stringify(planHome(30, 20, 'N').layout.leaves)).toBe(JSON.stringify(planHome(30, 20, 'N').layout.leaves));
  });
});
