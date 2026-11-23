// Right-hand "selected room" card in the Designer page.
export function showRoomInfo(leaf, all) {
  const el = document.getElementById('roomInfo');
  if (!el) return;
  if (!leaf) {
    const total = (all || []).reduce((a, l) => a + l.rect.w * l.rect.h, 0);
    el.innerHTML = `<div class="ri-title">Rooms</div><div class="ri-sub">${(all || []).length} spaces · ${total.toFixed(0)} sq ft planned</div><div class="ri-hint">Kisi room par click karo to uska size dikhega.</div>`;
    return;
  }
  const w = leaf.rect.w, h = leaf.rect.h;
  el.innerHTML = `<div class="ri-title">${leaf.room.name}</div>
    <div class="ri-grid"><div><span>Width</span><b>${w.toFixed(1)} ft</b></div><div><span>Length</span><b>${h.toFixed(1)} ft</b></div><div><span>Area</span><b>${(w * h).toFixed(0)} sq ft</b></div></div>`;
}
