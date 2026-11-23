import { FURNITURE_COLORS, FURNITURE_LINE, KIND_COLORS, WALL_FT, roomColor } from '../config/constants.js';
import { computeFurniture } from './furniture.js';
import { theme, roomFill } from '../config/theme.js';
import { showRoomInfo } from '../ui/roominfo.js';

// =========================================================
// 2D RENDERING (HTML5 Canvas)
// =========================================================
export function render2D(layout, doors, length, width, facing) {
  const canvas = document.getElementById('planCanvas');
  const ctx = canvas.getContext('2d');
  const margin = 56;
  const maxW = canvas.width - margin * 2, maxH = canvas.height - margin * 2;
  const scale = Math.min(maxW / width, maxH / length);
  const offsetX = (canvas.width - width * scale) / 2;
  const offsetY = (canvas.height - length * scale) / 2;
  const drawW = width * scale, drawH = length * scale;
  const wallPx = WALL_FT * scale;
  const toPx = r => ({ x: offsetX + r.x * scale, y: offsetY + r.y * scale, w: r.w * scale, h: r.h * scale });
  const allLeaves = [...layout.pubLeaves, ...layout.privLeaves];

  const T = theme();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = T.stage; ctx.fillRect(0, 0, canvas.width, canvas.height);

  allLeaves.forEach(l => { const p = toPx(l.rect); ctx.fillStyle = roomFill(l.room); ctx.fillRect(p.x, p.y, p.w, p.h); });
  ctx.strokeStyle = T.wall; ctx.lineWidth = wallPx;
  allLeaves.forEach(l => {
    const p = toPx(l.rect);
    if (l.room.kind === "parking" || l.room.kind === "garden") { // open car porch / garden: dashed outline instead of walls
      ctx.save(); ctx.setLineDash([7, 5]); ctx.lineWidth = Math.max(wallPx * 0.5, 1.5); ctx.strokeRect(p.x, p.y, p.w, p.h); ctx.restore();
    } else ctx.strokeRect(p.x, p.y, p.w, p.h);
  });

  ctx.strokeStyle = T.wall; ctx.lineWidth = Math.max(wallPx * 1.4, 3);
  ctx.strokeRect(offsetX, offsetY, drawW, drawH);
  // open gate gap in the boundary wall in front of the car porch
  doors.filter(d => d.isGate).forEach(d => {
    const e = d.edge, th = Math.max(wallPx * 1.4, 3) * 1.6;
    ctx.save(); ctx.fillStyle = d.isGardenGate ? KIND_COLORS.garden : KIND_COLORS.parking;
    if (e.axis === "h") ctx.fillRect(offsetX + e.from * scale, offsetY + e.pos * scale - th / 2, (e.to - e.from) * scale, th);
    else ctx.fillRect(offsetX + e.pos * scale - th / 2, offsetY + e.from * scale, th, (e.to - e.from) * scale);
    ctx.fillStyle = T.wall;
    const post = (x, y) => ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
    if (e.axis === "h") { post(offsetX + e.from * scale, offsetY + e.pos * scale); post(offsetX + e.to * scale, offsetY + e.pos * scale); }
    else { post(offsetX + e.pos * scale, offsetY + e.from * scale); post(offsetX + e.pos * scale, offsetY + e.to * scale); }
    ctx.restore();
  });

  function drawDoorPx(edgeFt, lenFt, color) {
    const scaleLen = lenFt * scale;
    const mid = ((edgeFt.from + edgeFt.to) / 2) * scale + (edgeFt.axis === "h" ? offsetX : offsetY);
    const pos = edgeFt.pos * scale + (edgeFt.axis === "h" ? offsetY : offsetX);
    ctx.save(); ctx.fillStyle = T.door; ctx.strokeStyle = color || T.wall; ctx.lineWidth = color ? 2 : 1.2;
    if (edgeFt.axis === "h") {
      ctx.fillRect(mid - scaleLen / 2, pos - wallPx / 2, scaleLen, wallPx);
      ctx.beginPath(); ctx.arc(mid - scaleLen / 2, pos, scaleLen, 0, Math.PI / 2); ctx.stroke();
    } else {
      ctx.fillRect(pos - wallPx / 2, mid - scaleLen / 2, wallPx, scaleLen);
      ctx.beginPath(); ctx.arc(pos, mid - scaleLen / 2, scaleLen, Math.PI / 2, Math.PI); ctx.stroke();
    }
    ctx.restore();
  }
  doors.filter(d => !d.isGate).forEach(d => drawDoorPx(d.edge, Math.min(d.widthFt * 0.6, 5), d.isEntrance ? "#B8860B" : null));

  // Entrance arrow + label
  const entDoor = doors.find(d => d.isEntrance);
  if (entDoor) {
    const e = entDoor.edge;
    const midFt = (e.from + e.to) / 2;
    let ax, ay;
    if (e.axis === "h") { ax = offsetX + midFt * scale; ay = offsetY + e.pos * scale; } else { ax = offsetX + e.pos * scale; ay = offsetY + midFt * scale; }
    ctx.save(); ctx.fillStyle = "#FFC857"; ctx.strokeStyle = "#8A5A00"; ctx.lineWidth = 1; ctx.font = "700 11px sans-serif";
    const AR = 11;
    if (facing === "N") {
      ctx.beginPath(); ctx.moveTo(ax, ay - AR); ctx.lineTo(ax - 6, ay - AR - 9); ctx.lineTo(ax + 6, ay - AR - 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - AR); ctx.strokeStyle = "#FFC857"; ctx.lineWidth = 3; ctx.stroke();
      ctx.textAlign = "center"; ctx.fillText("MAIN ENTRANCE", ax, ay - AR - 15);
    } else if (facing === "S") {
      ctx.beginPath(); ctx.moveTo(ax, ay + AR); ctx.lineTo(ax - 6, ay + AR + 9); ctx.lineTo(ax + 6, ay + AR + 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay + AR); ctx.strokeStyle = "#FFC857"; ctx.lineWidth = 3; ctx.stroke();
      ctx.textAlign = "center"; ctx.fillText("MAIN ENTRANCE", ax, ay + AR + 22);
    } else if (facing === "W") {
      ctx.beginPath(); ctx.moveTo(ax - AR, ay); ctx.lineTo(ax - AR - 9, ay - 6); ctx.lineTo(ax - AR - 9, ay + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - AR, ay); ctx.strokeStyle = "#FFC857"; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.translate(ax - AR - 14, ay); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText("MAIN ENTRANCE", 0, 0); ctx.restore();
    } else {
      ctx.beginPath(); ctx.moveTo(ax + AR, ay); ctx.lineTo(ax + AR + 9, ay - 6); ctx.lineTo(ax + AR + 9, ay + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + AR, ay); ctx.strokeStyle = "#FFC857"; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.translate(ax + AR + 14, ay); ctx.rotate(Math.PI / 2); ctx.textAlign = "center"; ctx.fillText("MAIN ENTRANCE", 0, 0); ctx.restore();
    }
    ctx.restore();
  }

  // Windows drawn as a proper frame symbol: an outer double-line plus a centre mullion tick,
  // rather than a single stroke, so they read clearly as windows rather than stray marks.
  function drawWindowPx(x1, y1, x2, y2, horiz) {
    ctx.save();
    ctx.strokeStyle = "#5AA0C8"; ctx.lineWidth = Math.max(wallPx * 0.55, 2);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const midx = (x1 + x2) / 2, midy = (y1 + y2) / 2;
    ctx.strokeStyle = "#FBF9F6"; ctx.lineWidth = 1.2;
    if (horiz) { ctx.beginPath(); ctx.moveTo(midx, y1 - wallPx * 0.5); ctx.lineTo(midx, y1 + wallPx * 0.5); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(x1 - wallPx * 0.5, midy); ctx.lineTo(x1 + wallPx * 0.5, midy); ctx.stroke(); }
    ctx.restore();
  }
  allLeaves.forEach(l => {
    if (!l.room.exterior) return;
    const p = toPx(l.rect);
    if (Math.abs(l.rect.y - 0) < 0.2) { const wx = p.x + p.w * 0.3; drawWindowPx(wx, p.y, wx + p.w * 0.4, p.y, true); }
    else if (Math.abs((l.rect.y + l.rect.h) - length) < 0.2) { const wx = p.x + p.w * 0.3; drawWindowPx(wx, p.y + p.h, wx + p.w * 0.4, p.y + p.h, true); }
    else if (Math.abs(l.rect.x - 0) < 0.2) { const wy = p.y + p.h * 0.3; drawWindowPx(p.x, wy, p.x, wy + p.h * 0.4, false); }
    else if (Math.abs((l.rect.x + l.rect.w) - width) < 0.2) { const wy = p.y + p.h * 0.3; drawWindowPx(p.x + p.w, wy, p.x + p.w, wy + p.h * 0.4, false); }
  });

  // Furniture — drawn after walls/windows so it sits visually "inside" each room.
  allLeaves.forEach(l => {
    const furniture = computeFurniture(l, doors);
    furniture.forEach(f => {
      const fp = toPx(f.rect);
      ctx.fillStyle = FURNITURE_COLORS[f.type] || "#999999";
      ctx.strokeStyle = T.fLine; ctx.globalAlpha = 1; ctx.lineWidth = 1;
      if (f.type === "toilet" || f.type === "basin" || f.type === "tree") {
        ctx.beginPath();
        ctx.ellipse(fp.x + fp.w / 2, fp.y + fp.h / 2, fp.w / 2, fp.h / 2, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      } else {
        ctx.fillRect(fp.x, fp.y, fp.w, fp.h);
        ctx.strokeRect(fp.x, fp.y, fp.w, fp.h);
      }
      if (f.type === "bed") {
        ctx.strokeStyle = T.fLine; ctx.lineWidth = 0.8;
        const pillowH = Math.min(fp.h, fp.w) * 0.22;
        if (fp.h >= fp.w) ctx.strokeRect(fp.x + 2, fp.y + 2, fp.w - 4, pillowH);
        else ctx.strokeRect(fp.x + 2, fp.y + 2, pillowH, fp.h - 4);
      }
    });
  });

  ctx.textAlign = "center";
  allLeaves.forEach(l => {
    const p = toPx(l.rect);
    ctx.fillStyle = T.text;
    let fz = 12, name = l.room.name, lines = [name];
    const fit = () => { ctx.font = `600 ${fz}px Manrope, Segoe UI, sans-serif`; return Math.max(...lines.map(t => ctx.measureText(t).width)) <= p.w - 4; };
    while (!fit() && fz > 8) fz--;
    if (!fit() && name.includes(" ")) { const k = name.lastIndexOf(" "); lines = [name.slice(0, k), name.slice(k + 1)]; fz = 11; while (!fit() && fz > 7) fz--; }
    const sizeTxt = l.rect.w.toFixed(1) + "×" + l.rect.h.toFixed(1) + " ft";
    ctx.font = "10px sans-serif"; const showSize = ctx.measureText(sizeTxt).width <= p.w - 4 && p.h > 14 * (lines.length + 1);
    const lh = fz + 1, total = lines.length * lh + (showSize ? 12 : 0);
    let y = p.y + p.h / 2 - total / 2 + fz - 1;
    ctx.font = `600 ${fz}px Manrope, Segoe UI, sans-serif`;
    lines.forEach(t => { ctx.fillText(t, p.x + p.w / 2, y); y += lh; });
    if (showSize) { ctx.font = "10px sans-serif"; ctx.fillText(sizeTxt, p.x + p.w / 2, y + 2); }
  });
  ctx.strokeStyle = T.dim; ctx.fillStyle = T.dim; ctx.font = "11px sans-serif"; ctx.lineWidth = 1;
  const dimOff = 14;
  ctx.beginPath(); ctx.moveTo(offsetX, offsetY - dimOff); ctx.lineTo(offsetX + drawW, offsetY - dimOff); ctx.stroke();
  ctx.fillText(width.toFixed(0) + " ft", offsetX + drawW / 2, offsetY - dimOff - 4);
  ctx.beginPath(); ctx.moveTo(offsetX - dimOff, offsetY); ctx.lineTo(offsetX - dimOff, offsetY + drawH); ctx.stroke();
  ctx.save(); ctx.translate(offsetX - dimOff - 6, offsetY + drawH / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(length.toFixed(0) + " ft", 0, 0); ctx.restore();

  const cx = canvas.width - 34, cy = 30;
  ctx.strokeStyle = T.dim; ctx.fillStyle = T.dim; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy - 10); ctx.lineTo(cx - 4, cy - 3); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 4, cy - 3); ctx.stroke();
  ctx.font = "10px sans-serif"; ctx.fillText("N", cx, cy - 13);

  const listEl = document.getElementById('roomList');
  listEl.innerHTML = "";
  allLeaves.forEach((l, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = "room-row";
    const tag = l.ensuiteOf ? " (ensuite)" : "";
    btn.innerHTML = `<span class="sw" style="background:${roomFill(l.room)}"></span><span class="nm">${l.room.name}${tag}</span><span class="ar">${(l.rect.w * l.rect.h).toFixed(0)} sq ft</span>`;
    btn.addEventListener('click', () => { [...listEl.children].forEach(c => c.classList.remove('sel')); btn.classList.add('sel'); showRoomInfo(l); });
    listEl.appendChild(btn);
  });
  showRoomInfo(null, allLeaves);
}
