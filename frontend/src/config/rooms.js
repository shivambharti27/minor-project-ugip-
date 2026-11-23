
// Room list + target sizes (sq.ft) + hard minimum dimensions (ft), the way
// Indian budget homes are actually built: more plot => more rooms, not
// just bigger ones.
// Large plots (>= 3500 sq.ft): Indian villa/bungalow list — car porch on the road side, drawing room, family lounge,
// dining, pooja room, kitchen + utility + store, study, attached-bath bedrooms, guest room, and (as area grows) servant room,
// home theatre, gym, library, sitting lounge, party hall, yoga room. Sizes follow typical Indian plans (master bedroom
// 180-260 sq.ft, bathrooms 40-55, kitchen ~150, family room ~190, utility ~60, 9 x 18 ft per car).
export function buildVillaConfig(A) {
  const mk = (name, kind, t, minW, minH, attach) => ({ name, kind, t, minW, minH, attach });
  const cars = A >= 8000 ? 4 : A >= 4500 ? 3 : 2;
  const u = [Object.assign(mk("Car Porch", "parking", 180 * cars, 10 * cars, 18), { cars }), mk("Garden", "garden", 300, 8, 10)];
  u.push(mk("Hall", "hall", 240, 14, 14), mk("Family Lounge", "lounge", 200, 12, 13), mk("Dining Room", "dining", 170, 11, 12),
         mk("Kitchen", "kitchen", 150, 10, 12), mk("Utility Room", "store", 60, 6, 8), mk("Pooja Room", "pooja", 45, 5, 6),
         mk("Store Room", "store", 50, 6, 7), mk("Study", "study", 90, 9, 10));
  let bn = 0, bd = 0;
  const suite = (name, t, minW, minH, bathT, bmW, bmH) => { u.push(mk(name, "bed", t, minW, minH)); u.push(mk("Bathroom " + (++bn), "bath", bathT, bmW, bmH, name)); };
  suite("Bedroom 1", 220, 12, 13, 55, 6, 7);
  [2, 3].forEach(i => suite("Bedroom " + i, 170, 10.5, 12, 45, 5, 6));
  suite("Guest Room", 160, 10, 11.5, 42, 5, 6);
  let nextBed = 4;
  if (A >= 4500) {
    suite("Bedroom " + (nextBed++), 170, 10.5, 12, 45, 5, 6);
    u.push(mk("Servant Room", "room", 90, 8, 10));
    u.push(mk("Home Theatre", "room", 220, 12, 15));
  }
  if (A >= 6000) {
    u.push(mk("Gym", "room", 150, 10, 12), mk("Library", "room", 150, 10, 12), mk("Sitting Lounge", "lounge", 180, 11, 13));
    u.push(mk("Common Bathroom 2", "bath", 40, 5, 7));
  }
  if (A >= 8000) {
    suite("Guest Room 2", 160, 10, 11.5, 42, 5, 6);
    u.push(mk("Party Hall", "lounge", 320, 16, 18), mk("Yoga Room", "room", 120, 10, 10));
  }
  u.push(mk("Common Bathroom", "bath", 40, 5, 7));
  const bhk = u.filter(r => r.kind === "bed" && r.name !== "Servant Room").length;
  const baths = u.filter(r => r.kind === "bath").length;
  const minArea = Math.round(u.reduce((s, r) => s + r.minW * r.minH, 0) * 1.25);
  return { units: u, bhk, baths, cars, villa: true, minArea };
}

export function buildRoomConfig(A) {
  if (A >= 3500) return buildVillaConfig(A);
  const mk = (name, kind, t, minW, minH, attach) => ({ name, kind, t, minW, minH, attach });
  const small = A < 420;
  const bed = (name, master) => mk(name, "bed", small ? 135 : master ? 120 : 100, master ? (small ? 9 : 10) : 9, 10);
  const bath = (name, attach) => mk(name, "bath", 30, 4, 6, attach);
  const big = A >= 1000;
  const u = [mk("Hall", "hall", big ? 150 : small ? 110 : 125, small ? 9 : 10, 10), mk("Kitchen", "kitchen", big ? 80 : small ? 55 : 65, 7, small ? 6 : 7)];
  if (A < 560) {
    u.push(bed("Bedroom", true), bath("Bathroom", "Bedroom"));
  } else if (A < 800) {
    u.push(bed("Bedroom 1", true), bed("Bedroom 2"), bath("Bathroom"));
  } else if (A < 1000) {
    u.push(bed("Bedroom 1", true), bath("Bathroom 1", "Bedroom 1"), bed("Bedroom 2"), bath("Common Bathroom"));
  } else {
    u.push(mk("Dining Room", "dining", 85, 8, 8));
    u.push(bed("Bedroom 1", true), bath("Bathroom 1", "Bedroom 1"));
    if (A < 1500) {
      u.push(bed("Bedroom 2"), bed("Bedroom 3"));
    } else if (A < 2200) {
      u.push(bed("Bedroom 2"), bath("Bathroom 2", "Bedroom 2"), bed("Bedroom 3"));
    } else {
      u.push(bed("Bedroom 2"), bath("Bathroom 2", "Bedroom 2"), bed("Bedroom 3"), bed("Bedroom 4"));
    }
    u.push(bath("Common Bathroom"));
    if (A >= 1200) u.push(mk("Store Room", "store", 30, 5, 5));
  }
  const bhk = u.filter(r => r.kind === "bed").length;
  const baths = u.filter(r => r.kind === "bath").length;
  const minArea = Math.round(u.reduce((s, r) => s + r.minW * r.minH, 0) * 1.25);
  return { units: u, bhk, baths, minArea };
}

