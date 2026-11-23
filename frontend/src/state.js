// Shared app state + saved projects (localStorage). Everything is wrapped in try/catch: storage can be blocked.
export const current = { length: 40, width: 30, facing: 'N', plan: null };
const KEY = 'gharai.projects.v1';
export function loadProjects() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ } }
export function addProject(p) { const l = loadProjects(); l.unshift({ id: Date.now(), savedAt: Date.now(), ...p }); save(l.slice(0, 30)); }
export function removeProject(id) { save(loadProjects().filter(p => p.id !== id)); }
export function getTheme() { try { return localStorage.getItem('gharai.theme'); } catch { return null; } }
export function setTheme(t) { try { localStorage.setItem('gharai.theme', t); } catch { /* ignore */ } }
// thumbnail: a tiny SVG of the plan using CSS variables, stored as a string
export function thumbSVG(layout, length, width) {
  const leaves = [...layout.pubLeaves, ...layout.privLeaves];
  const S = 160 / Math.max(length, width);
  const rects = leaves.map(l => `<rect x="${(l.rect.x * S).toFixed(1)}" y="${(l.rect.y * S).toFixed(1)}" width="${(l.rect.w * S).toFixed(1)}" height="${(l.rect.h * S).toFixed(1)}" data-n="${l.room.name}"/>`).join('');
  return `<svg viewBox="0 0 ${(width * S).toFixed(1)} ${(length * S).toFixed(1)}" width="${(width * S).toFixed(0)}" height="${(length * S).toFixed(0)}" fill="#F6EBDD" stroke="#231A15" stroke-width="1.2">${rects}</svg>`;
}
export function ago(ts) {
  const d = Math.floor((Date.now() - ts) / 86400000);
  return d <= 0 ? 'Saved today' : d === 1 ? 'Saved yesterday' : `Saved ${d} days ago`;
}
