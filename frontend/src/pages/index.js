import { initDesigner } from '../main.js';
import { current, loadProjects, removeProject, ago } from '../state.js';
import { drawHouse } from '../ui/house.js';
import { page as estimate } from './estimate.js';

// ---------- Home ----------
const ico = d => `<i><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#231A15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg></i>`;
const SAMPLES = [
  ['Family Home', '40 × 30 ft · North · 3 BHK · 2 Bath', '1,200 sq ft', 40, 30, [[0,0,9,14],[9,0,11,16],[20,0,10,19],[0,14,9,6],[9,16,11,10],[0,20,9,6],[20,19,10,7],[0,26,15,14],[15,26,15,14]]],
  ['Villa', '60 × 60 ft · South · 4 BHK · Garden', '3,600 sq ft', 60, 60, [[0,0,36,14],[36,0,24,14],[0,14,60,12],[0,26,30,14],[30,26,30,14],[0,40,15,20],[15,40,15,20],[30,40,15,20],[45,40,15,20]]]
];
const sample = (p) => { const s = 150 / Math.max(p[3], p[4]); const r = p[5].map((q, i) => `<rect x="${q[0]*s}" y="${q[1]*s}" width="${q[2]*s}" height="${q[3]*s}" fill="${['#F6EBDD','#EFDDCB','#E6CFB8'][i%3]}" stroke="#231A15" stroke-width="1.2"/>`).join('');
  return `<div class="res"><div class="th"><svg width="${p[4]*s}" height="${p[3]*s}" style="background:#fff;border:3px solid #231A15" aria-hidden="true">${r}</svg></div><div class="b"><h4>${p[0]}</h4><div class="s">${p[1]}</div><div class="row"><b>${p[2]}</b><a class="btn sm" href="#/design" data-plot="${p[3]},${p[4]}">View Plan</a></div></div></div>`; };

const home = { html: () => `
<div class="hero"><div class="wrap"><div><h1>Design Your Home Before You Build It</h1><p>Enter your plot size and entrance direction. Get a complete floor plan, a 3D model and a material estimate in seconds.</p><a class="btn" href="#/design">Start Designing</a></div>
<div class="img"><img data-fb src="/images/hero.png" alt="Modern house exterior"></div></div>
<form class="search" id="homeForm"><div><label for="hl">PLOT LENGTH (FT)</label><input id="hl" type="number" value="40" min="10" max="150"></div><div><label for="hw">PLOT WIDTH (FT)</label><input id="hw" type="number" value="30" min="10" max="150"></div><div><label for="hf">ENTRANCE FACING</label><select id="hf"><option value="N">North</option><option value="S">South</option><option value="E">East</option><option value="W">West</option></select></div><button class="btn">Generate Plan</button></form></div>
<section class="band"><div class="wrap about"><div class="img"><img data-fb src="/images/about.jpg" alt="Modern house at dusk"></div>
<div><h2>We Plan Every Room For You</h2><p>From compact 600 sq ft homes to 3,500 sq ft villas, Ghar AI sizes every room, places doors and windows, and keeps all rooms connected to the hall.</p>
<div class="stats"><div><b>1–6</b><span>BHK Layouts</span></div><div><b>5,000+</b><span>Sq Ft Plot Range</span></div><div><b>2D + 3D</b><span>Live Preview</span></div></div></div></div></section>
<div class="sec"><div class="wrap"><div class="head"><h2>Everything You Need To Plan A Home</h2><p>Why Ghar AI: tools that take you from an empty plot to a ready concept.</p></div>
<div class="g3"><div class="card">${ico('<path d="M3 3h18v18H3z"/><path d="M3 12h9M12 3v18"/>')}<h4>Smart Layouts</h4><p>Rooms are sized from plot area and every room opens to the hall, with no wasted corridors.</p></div>
<div class="card">${ico('<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 12l9-5M12 12v10M12 12L3 7"/>')}<h4>3D Preview</h4><p>Rotate and zoom a 3D model of your plan, with an optional roof.</p></div>
<div class="card">${ico('<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>')}<h4>Material Estimate</h4><p>Cement, steel, bricks and total cost, calculated from your plan.</p></div></div></div></div>
<div class="sec"><div class="wrap"><div class="head"><h2>Recent Designs</h2><p>Plans generated for different plot sizes.</p></div><div class="g2">${SAMPLES.map(sample).join('')}</div></div></div>
<div class="sec"><div class="wrap"><div class="head"><h2>Words On Design</h2><p>What architects have said about the craft.</p></div>
<div class="g2"><div class="q"><p>“A house is a machine for living in.”</p><span>Le Corbusier</span></div><div class="q"><p>“Less is more.”</p><span>Ludwig Mies van der Rohe</span></div></div></div></div>`,
  mount: root => {
    root.querySelectorAll('img[data-fb]').forEach(img => {
      const fb = () => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 820 640'); drawHouse(s); img.replaceWith(s); };
      if (img.complete && img.naturalWidth === 0) fb(); else img.addEventListener('error', fb, { once: true });
    });
    const go = (l, w, f) => { Object.assign(current, { length: l, width: w, facing: f }); location.hash = '#/design'; };
    root.querySelector('#homeForm').addEventListener('submit', e => { e.preventDefault(); go(+root.querySelector('#hl').value || 40, +root.querySelector('#hw').value || 30, root.querySelector('#hf').value); });
    root.querySelectorAll('[data-plot]').forEach(a => a.addEventListener('click', () => { const [l, w] = a.dataset.plot.split(',').map(Number); Object.assign(current, { length: l, width: w }); }));
  } };

// ---------- Design ----------
const design = { html: () => `<div class="wrap page"><h1 class="ptitle">Design your home</h1><p class="psub">Enter your plot size and entrance direction. The layout updates as you type.</p><div class="ws">
<aside class="panel"><div class="row2"><div><label for="lengthInput">LENGTH (FT)</label><input class="field" type="number" id="lengthInput" min="10" max="150"></div><div><label for="widthInput">WIDTH (FT)</label><input class="field" type="number" id="widthInput" min="10" max="150"></div></div>
<label>ENTRANCE FACING</label><div class="facing"><button data-f="N">N</button><button data-f="S">S</button><button data-f="E">E</button><button data-f="W">W</button></div>
<select id="entranceInput" hidden><option value="N">N</option><option value="S">S</option><option value="E">E</option><option value="W">W</option></select>
<div class="stack"><button class="btn primary" id="generateBtn">Generate layout</button><button class="btn light" id="saveBtn">Save to Projects</button></div>
<div class="readout">Plot area<br><b id="totalAreaText"></b><br><span id="planSummary"></span></div>
<div class="legend"><div><i style="background:#F2A33A"></i>Main entrance</div><div><i style="background:#5AA0C8"></i>Window</div></div></aside>
<section><div class="stage-head"><div class="seg"><button id="tab2dBtn" class="active">2D</button><button id="tab3dBtn">3D</button></div><label class="roof"><input type="checkbox" id="showRoofInput"> Show roof</label></div>
<div id="validLayoutView"><div class="stage" id="view2dCard"><canvas id="planCanvas" width="760" height="600"></canvas></div>
<div class="stage" id="view3dCard" style="display:none"><div id="three-container"></div></div><div class="hint" id="view3dHint" style="display:none">Drag = rotate · Scroll = zoom · Right-drag = pan</div>
<div class="nav-designs"><button class="btn light" id="prevDesignBtn" aria-label="Previous design">◀</button><button class="btn ghost" id="nextDesignBtn">Show another design</button></div><div class="label-c" id="designLabel"></div><div class="note" id="patternText"></div></div>
<div id="invalidView" class="invalid" style="display:none"></div></section>
<aside class="side-r"><div class="info" id="roomInfo"></div><div class="rooms" id="roomList"></div></aside></div></div>`, mount: () => initDesigner() };

// ---------- Coming soon ----------
const soon = (title, text) => ({ html: () => `<div class="wrap"><div class="soon"><span class="pill">Coming soon</span><h2>${title}</h2><p>${text}</p><a class="btn" href="#/design">Go to Design</a></div></div>` });
const assistant = soon('Civil assistant', 'An AI assistant for civil-engineering questions will be added in a later phase.');

// ---------- Projects ----------
const projects = { html: () => { const l = loadProjects(); return `<div class="wrap page"><div class="row" style="margin:0 0 6px"><h1 class="ptitle">Projects</h1><a class="btn" href="#/design">+ New design</a></div><p class="psub">Designs you saved on this device.</p>
<div class="pgrid">${l.map(p => `<div class="proj"><button class="del" data-id="${p.id}" aria-label="Delete design">✕</button><a href="#/design" data-open="${p.id}"><div class="th">${p.thumb}</div><div class="bd"><b>${p.villa ? 'Villa' : p.bhk + ' BHK home'}</b><div>${p.length} × ${p.width} ft · ${p.facing}-facing</div><div>${ago(p.savedAt)}</div></div></a></div>`).join('')}
<a href="#/design" class="empty"><span>+</span>Start a new design</a></div></div>`; },
  mount: root => {
    root.querySelectorAll('.del').forEach(b => b.addEventListener('click', () => { removeProject(+b.dataset.id); location.reload(); }));
    root.querySelectorAll('[data-open]').forEach(a => a.addEventListener('click', () => { const p = loadProjects().find(x => x.id === +a.dataset.open); if (p) Object.assign(current, { length: p.length, width: p.width, facing: p.facing }); }));
  } };

export const routes = { home, design, estimate, assistant, projects };
