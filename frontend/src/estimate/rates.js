// Default unit rates in Indian rupees (₹). These are EDITABLE ASSUMPTIONS for a typical Indian city,
// not official prices: real rates change by city and month. The Estimate page lets the user change them.
export const BASE_RATES = {
  cement: 400,      // ₹ per 50 kg bag
  steel: 68,        // ₹ per kg (TMT Fe500)
  brick: 8,         // ₹ per brick
  sand: 55,         // ₹ per cubic foot
  aggregate: 45,    // ₹ per cubic foot (20 mm)
  excavation: 350,  // ₹ per cubic metre (labour / machine)
  putty: 40,        // ₹ per kg
  primer: 250       // ₹ per litre
};
// Rates that depend on the finishing quality chosen by the user
export const GRADE_RATES = {
  economy:  { floorTile: 40,  bathTile: 40,  wallTile: 40,  mainDoor: 15000, flushDoor: 6000,  bathDoor: 3500, window: 350, paintIn: 320, paintOut: 400, electrical: 90,  plumbBath: 22000, plumbKitchen: 12000, plumbBase: 18000 },
  standard: { floorTile: 70,  bathTile: 60,  wallTile: 55,  mainDoor: 28000, flushDoor: 9000,  bathDoor: 5500, window: 550, paintIn: 420, paintOut: 520, electrical: 130, plumbBath: 35000, plumbKitchen: 20000, plumbBase: 30000 },
  premium:  { floorTile: 130, bathTile: 110, wallTile: 100, mainDoor: 65000, flushDoor: 16000, bathDoor: 9000, window: 900, paintIn: 650, paintOut: 750, electrical: 200, plumbBath: 70000, plumbKitchen: 40000, plumbBase: 60000 }
};
// Location presets for the base material rates (editable on the Estimate page).
// Uttarakhand (Dehradun) values are rounded from public price pages (cement about 400 per bag, sand about 55 per cu ft,
// bricks about 9 per piece) and set slightly lower; hill-town values assume 10-15% extra transport. Replace with your dealer quotes.
export const PRESETS = {
  dehradun: { label: 'Uttarakhand: Dehradun / plains', note: 'Rounded from public Dehradun price pages and set slightly lower. Replace with your local dealer quotes.', labourPerSqft: 300, rates: { cement: 390, steel: 62, brick: 9, sand: 50, aggregate: 40, excavation: 300 } },
  hills:    { label: 'Uttarakhand: hill towns', note: 'Assumed 10-15% above plains for transport to hill towns. Edit to match your quotes.', labourPerSqft: 340, rates: { cement: 430, steel: 66, brick: 11, sand: 70, aggregate: 55, excavation: 380 } },
  metro:    { label: 'Other: large city (assumed)', note: 'Generic assumed rates. Edit to match your city.', labourPerSqft: 380, rates: { cement: 400, steel: 68, brick: 8, sand: 55, aggregate: 45, excavation: 350 } }
};
export const DEFAULTS = { floors: 1, grade: 'standard', labourPct: 38, labourPerSqft: null, miscPct: 5, overheadPct: 10, contingencyPct: 5, storeyHeightFt: 10 };
export function ratesFor(grade, overrides = {}) { return { ...BASE_RATES, ...GRADE_RATES[grade || 'standard'], ...overrides }; }
