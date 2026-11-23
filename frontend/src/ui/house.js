// Fallback illustration shown until images/hero.png and images/about.jpg are added.
export function drawHouse(svg){let o='';
const dx=70,dy=34;
function box(x,y,w,h,c,d=1){const sx=dx*d,sy=dy*d;return `<polygon points="${x+w},${y} ${x+w+sx},${y-sy} ${x+w+sx},${y+h-sy} ${x+w},${y+h}" fill="${c[2]}"/><polygon points="${x},${y} ${x+sx},${y-sy} ${x+w+sx},${y-sy} ${x+w},${y}" fill="${c[1]}"/><rect x=${x} y=${y} width=${w} height=${h} fill="${c[0]}"/>`}
const W=['#F7F4EF','#FFFFFF','#D9D3CA'],WD=['#B07C50','#C99A6B','#8A5E38'],DK=['#2A2724','#3A3632','#1C1A18'];
function glass(x,y,w,h,n=5){let s=`<rect x=${x} y=${y} width=${w} height=${h} fill="url(#gl)"/><rect x=${x} y=${y} width=${w} height=${h} fill=none stroke=#2A2724 stroke-width=3 />`;for(let i=1;i<n;i++)s+=`<line x1=${x+w*i/n} y1=${y} x2=${x+w*i/n} y2=${y+h} stroke=#2A2724 stroke-width=2 />`;return s+`<polygon points="${x+8},${y+h} ${x+w*.35},${y+h} ${x+w*.55},${y} ${x+w*.3},${y}" fill=#fff opacity=.18 />`}
o+=`<defs><linearGradient id=gl x1=0 y1=0 x2=1 y2=1><stop offset=0 stop-color=#CFE6F0 /><stop offset=.5 stop-color=#8FB9CC /><stop offset=1 stop-color=#5F8FA8 /></linearGradient><linearGradient id=lw x1=0 y1=0 x2=0 y2=1><stop offset=0 stop-color=#9DB87A /><stop offset=1 stop-color=#6F9158 /></linearGradient><linearGradient id=pl x1=0 y1=0 x2=1 y2=1><stop offset=0 stop-color=#9FD8E6 /><stop offset=1 stop-color=#4FA9C4 /></linearGradient><filter id=bl><feGaussianBlur stdDeviation=10 /></filter></defs>`;
// ground
o+=`<ellipse cx=430 cy=560 rx=360 ry=44 fill=#5B4226 opacity=.18 filter=url(#bl) />`;
o+=`<polygon points="40,520 560,520 790,450 270,450" fill=#E9E2D6 /><polygon points="40,520 560,520 560,538 40,538" fill=#CFC6B7 /><polygon points="560,520 790,450 790,468 560,538" fill=#B9AF9E />`;
o+=`<polygon points="60,500 330,500 470,458 200,458" fill=url(#lw) opacity=.0 />`;
// pool
o+=`<polygon points="140,500 340,500 420,474 220,474" fill=url(#pl) stroke=#fff stroke-width=5 />`;
// back/lower volume
o+=box(110,330,330,140,DK,1.4);
o+=glass(124,344,300,112,6);
// wood wing right
o+=box(440,350,150,120,WD,1.4);
for(let i=0;i<9;i++)o+=`<line x1=${450+i*15} y1=350 x2=${450+i*15} y2=470 stroke=#7A5230 stroke-opacity=.45 />`;
// upper volume cantilever
o+=box(190,190,430,125,W,1.5);
o+=glass(210,212,300,85,5);
o+=`<rect x=520 y=212 width=84 height=85 fill=#E6DFD2 stroke=#CFC6B7 />`;
for(let i=0;i<8;i++)o+=`<line x1=${524+i*10} y1=212 x2=${524+i*10} y2=297 stroke=#9C8F7A stroke-width=2 />`;
// roof slab
o+=box(176,176,458,16,['#FFFFFF','#F1EDE6','#CFC6B7'],1.6);
// balcony rail lower roof
o+=`<rect x=110 y=322 width=330 height=8 fill=#fff /><rect x=110 y=318 width=330 height=2 fill=#2A2724 opacity=.4 />`;
// column
o+=`<rect x=444 y=316 width=10 height=154 fill=#EDE7DC /><rect x=190 y=316 width=8 height=18 fill=#EDE7DC />`;
// stairs
for(let i=0;i<6;i++)o+=`<rect x=${600-i*6} y=${470-i*0} width=${60} height=${4} fill=#fff opacity=0 />`;
// foreground steps
for(let i=0;i<4;i++)o+=`<polygon points="${470},${500+i*6} ${620},${500+i*6} ${650},${490+i*6} ${500},${490+i*6}" fill=${i%2?'#EFEAE0':'#FFFFFF'} stroke=#D9D3CA />`;
// trees
function tree(x,y,r,c='#5E8C4F'){return `<ellipse cx=${x} cy=${y+r*1.1} rx=${r*.9} ry=${r*.22} fill=#000 opacity=.15 /><rect x=${x-4} y=${y} width=8 height=${r*1.1} fill=#6B4A30 /><circle cx=${x} cy=${y-r*.2} r=${r} fill=${c} /><circle cx=${x-r*.45} cy=${y-r*.05} r=${r*.6} fill=#78A864 /><circle cx=${x+r*.4} cy=${y-r*.5} r=${r*.55} fill=#4C7A40 />`}
o+=tree(70,470,46)+tree(115,500,30,'#6F9E5A')+tree(720,455,42)+tree(690,500,26,'#6F9E5A');
// shrubs
[[160,508],[190,512],[560,512],[600,516]].forEach(s=>o+=`<ellipse cx=${s[0]} cy=${s[1]} rx=22 ry=12 fill=#4F7F44 /><ellipse cx=${s[0]-6} cy=${s[1]-4} rx=14 ry=8 fill=#6F9E5A />`);
// loungers
o+=`<polygon points="360,486 400,486 410,482 372,482" fill=#fff stroke=#CFC6B7 /><polygon points="300,490 335,490 345,486 310,486" fill=#fff stroke=#CFC6B7 />`;
svg.innerHTML=o}
