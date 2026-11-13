'use strict';
/* ================= Repères visuels : jouer sans le son ================= */
// 1. Flèches au bord de l'écran vers les menaces hors champ (volant, cracheur, boss, colosse, zombie qui frappe
//    la barricade sur un côté non visible). Couleur par type, intensité selon l'urgence. Au plus RP_MAX à la fois,
//    éléments créés une seule fois (pool) ; choix des menaces 10 fois par seconde, position à chaque image.
// 2. Barricade frappée : dégradé rouge sur le bord gauche, droit ou bas selon d'où vient le coup, plus fort pour les gros coups.
// 3. Sous-titres des sons (en bas au centre, 3 lignes au plus, qui s'effacent). La même légende : au plus une fois par RP_REPEAT ms.
// 4. Arrivée du boss : grosse icône au-dessus de la bannière (css, #banner.boss) et bords rouges.
// 5. Monstres du toit (js/63-monstres-toit.js, Jeu.on('monstre')) : étiquettes posées dans la rue (au plus RP_TAGS, pool) :
//    hurleur arrivé « 📢 Hurleur » (vive pendant le cri) ; fouisseur sous terre « ⛏ Sortie » à l'endroit où il va ressortir,
//    avec le temps qui reste, puis « ⛏ Tire ! ×2 » pendant qu'il sort ; revenant à genoux « 💀 Achève » avec le temps qui
//    reste et une barre qui se vide. Hors champ : flèches (📢, ⛏, 💀). Sous-titres : cri, grondement (avec l'endroit de la
//    sortie), fracas, râle, relève.
// Réglages dans l'écran Pause : « Repères visuels » (dt_cues) et « Sous-titres » (dt_subs), activés par défaut.
// Tout passe par des enveloppes de fonctions globales (aucun son ni aucune règle du jeu n'est changé).

const RP_MAX = 7;          // flèches à la fois
const RP_LINES = 3;        // lignes de sous-titres
const RP_LIFE = 3200;      // ms d'affichage d'une légende
const RP_REPEAT = 2500;    // ms avant de pouvoir répéter la même légende
const RP_EDGE = .86;       // au-delà (coordonnées écran -1 à 1), la menace est « presque hors de vue »
const RP_SEL = .1;         // s entre deux choix des menaces
const RP_KINDS = {
  boss:    { c:'#ff3a2a', ic:'☠' },
  colossus:{ c:'#ff9a2a', ic:'⚠' },
  flyer:   { c:'#c07aff', ic:'🦇' },
  spitter: { c:'#9cff3a', ic:'☣' },
  bar:     { c:'#ffd04a', ic:'✋' },
  screamer:{ c:'#ffb43a', ic:'📢' },
  burrower:{ c:'#d8a860', ic:'⛏' },
  revenant:{ c:'#dfe8c8', ic:'💀' }
};
const RP_TAGS = 6;         // étiquettes des monstres du toit à la fois
const RP = {
  cues: store.get('dt_cues', true) !== false,
  subs: store.get('dt_subs', true) !== false,
  sel: [], selT: 0, frameN: 0, camN: -1, shown: false,
  fl: { L:0, R:0, B:0 }, flShown: { L:-1, R:-1, B:-1 },
  last: {}, lines: [], order: 0, count: {}, rainV: 0
};

/* ---------- Éléments (créés une seule fois) ---------- */
const rpBox = document.createElement('div'); rpBox.id = 'rpArrows';
const rpArrows = [];
for (let i = 0; i < RP_MAX; i++){
  const el = document.createElement('div'); el.className = 'rp-ar';
  const ch = document.createElement('i'); ch.className = 'rp-chev';
  const ic = document.createElement('b'); ic.className = 'rp-ic';
  el.appendChild(ch); el.appendChild(ic); rpBox.appendChild(el);
  rpArrows.push({ el, ch, ic, on:false, kind:'', tr:'', rt:'', it:'', op:'', urg:false });
}
document.body.appendChild(rpBox);
const rpFlashEl = {};
['L', 'R', 'B'].forEach(k => { const el = document.createElement('div'); el.className = 'rp-fl rp-fl' + k; el.style.opacity = 0; document.body.appendChild(el); rpFlashEl[k] = el; });
const rpSubs = document.createElement('div'); rpSubs.id = 'rpSubs'; rpSubs.setAttribute('aria-live', 'polite');
for (let i = 0; i < RP_LINES; i++){
  const el = document.createElement('div'); el.className = 'rp-sub';
  rpSubs.appendChild(el); RP.lines.push({ el, key:'', t0:0, on:false });
}
document.body.appendChild(rpSubs);
// Étiquettes des monstres du toit (styles ici : aucun élément ni règle de plus dans css/style.css)
const rpTagBox = document.createElement('div'); rpTagBox.id = 'rpTags';
rpTagBox.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:6;overflow:hidden';
const rpTags = [];
for (let i = 0; i < RP_TAGS; i++){
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;left:0;top:0;display:none;white-space:nowrap;font-weight:700;font-size:14px;line-height:1.1;'
    + 'padding:2px 6px 3px;border-radius:4px;background:rgba(12,8,6,.66);color:#fff;text-shadow:0 1px 2px #000;border:2px solid #fff';
  const tx = document.createElement('span'), bar = document.createElement('i');
  bar.style.cssText = 'display:block;height:3px;margin-top:2px;background:#fff;transform-origin:0 50%';
  el.appendChild(tx); el.appendChild(bar); rpTagBox.appendChild(el);
  rpTags.push({ el, tx, bar, on:false, txt:'', tr:'', c:'', k:-2, op:'' });
}
document.body.appendChild(rpTagBox);

/* ---------- Caméra : passage en coordonnées écran ---------- */
const rpInv = new THREE.Matrix4(), rpV = new THREE.Vector3(), rpP = { nx:0, ny:0, behind:false };
let rpTanV = .7, rpTanH = .7;
function rpCam(){
  if (RP.camN === RP.frameN) return;
  RP.camN = RP.frameN;
  camera.updateMatrixWorld();
  rpInv.copy(camera.matrixWorld).invert();
  rpTanV = Math.tan(camera.fov * Math.PI / 360); rpTanH = rpTanV * (camera.aspect || 1);
}
// Projette un point : nx, ny de -1 à 1 à l'écran (au-delà : hors champ) ; derrière : direction seulement
function rpProj(x, y, z){
  rpV.set(x, y, z).applyMatrix4(rpInv);
  if (rpV.z < -.05){ rpP.nx = rpV.x / (-rpV.z) / rpTanH; rpP.ny = rpV.y / (-rpV.z) / rpTanV; rpP.behind = false; }
  else { const L = Math.sqrt(rpV.x * rpV.x + rpV.y * rpV.y) || 1; rpP.nx = rpV.x / L * 9; rpP.ny = (rpV.y || -.01) / L * 9; rpP.behind = true; }
  return rpP;
}
const rpOff = p => p.behind || Math.abs(p.nx) > RP_EDGE || Math.abs(p.ny) > RP_EDGE;
// D'où vient un point par rapport à la vue : 'L', 'R' ou 'B' (en bas, devant)
function rpSideOf(x, y, z){
  rpCam(); const p = rpProj(x, y, z), ax = Math.abs(p.nx);
  if (ax < .45) return 'B';
  if (!p.behind && p.ny < -1 && ax < -p.ny * .5) return 'B';
  return p.nx < 0 ? 'L' : 'R';
}
function rpDirWord(x, y, z){
  rpCam(); const p = rpProj(x, y, z);
  if (p.behind || Math.abs(p.nx) > .35) return p.nx < 0 ? 'à gauche' : 'à droite';
  return p.ny < -RP_EDGE ? 'en bas' : 'devant';
}

/* ---------- 1. Flèches vers les menaces ---------- */
const rpCands = [];
let rpNC = 0;
function rpCand(){ if (rpNC >= rpCands.length) rpCands.push({ z:null, kind:'', u:0, a:0 }); return rpCands[rpNC++]; }
// Urgence (0 à 1) et sorte de flèche d'un zombie, ou null s'il n'est pas une menace à signaler
function rpThreat(z){
  const t = z.type, st = z.st;
  if (t === 'boss') return ['boss', 1];
  if (t === 'colossus') return ['colossus', st === 'attack' ? .9 : .65 + .2 * clamp(1 - (BAR_Z - z.g.position.z) / 90, 0, 1)];
  if (t === 'flyer' && !z.downed){
    if (st === 'dive') return ['flyer', .95];
    if (st === 'attack') return ['flyer', .75];
    if (z.g.position.z > -60) return ['flyer', .45];
    return null;
  }
  // Monstres du toit : hurleur arrivé (qui hurle), fouisseur sous terre ou qui sort, revenant à genoux
  if (t === 'screamer' && st === 'attack') return ['screamer', z.mtOnde >= 0 ? .85 : .6];
  if (t === 'burrower' && (z.mtUnder || z.mtVuln)) return ['burrower', z.mtVuln ? .9 : .7];
  if (t === 'revenant' && st === 'down') return ['revenant', .85];
  if (t === 'spitter' && st === 'attack') return ['spitter', .5 + .45 * (z.spitT < .8 ? clamp(1 - z.spitT / .8, 0, 1) : 0)];
  if (st === 'attack' || (z.downed === 'crawl' && z.g.position.z > BAR_Z - 2)) return ['bar', .35 + .25 * clamp((z.dmg || 0) / 30, 0, 1)];
  return null;
}
const rpScr = { W:0, H:0, L:0, R:0, T:0, B:0 };
function rpRect(){
  const W = innerWidth, H = innerHeight, port = H > W;
  rpScr.W = W; rpScr.H = H;
  rpScr.L = 24; rpScr.R = W - 24;
  rpScr.T = isTouch && port ? 120 : 70;
  rpScr.B = H - (isTouch ? (port ? 215 : 130) : 80);
  if (rpScr.B - rpScr.T < 80){ rpScr.T = H * .2; rpScr.B = H * .8; }
}
const rpAng = p => Math.atan2(-p.ny * rpScr.H, p.nx * rpScr.W);
function rpSelect(){
  rpCam(); rpRect(); rpNC = 0;
  for (let i = 0; i < zombies.length; i++){
    const z = zombies[i]; if (z.dead || !z.g) continue;
    const th = rpThreat(z); if (!th) continue;
    const gp = z.g.position, p = rpProj(gp.x, gp.y + (z.aimY != null ? z.aimY : 1.1), gp.z);
    if (!rpOff(p)) continue;
    // Barricade : seulement si le côté n'est pas visible (dessous et devant : le flash du bas suffit)
    if (th[0] === 'bar' && !p.behind && Math.abs(p.nx) <= RP_EDGE) continue;
    const c = rpCand(); c.z = z; c.kind = th[0]; c.u = th[1]; c.a = rpAng(p);
    // Colosse qui approche : une légende, une seule fois
    if (z.type === 'colossus' && !z._rpCol && gp.z > -70){ z._rpCol = true; rpCaption('[Pas lourds : un colosse approche ' + rpDirWord(gp.x, 2, gp.z) + ']', 'colossus'); }
  }
  // Tri par urgence, puis fusion des flèches de même sorte dans la même direction
  const list = rpCands.slice(0, rpNC).sort((a, b) => b.u - a.u);
  let n = 0;
  for (let i = 0; i < list.length && n < RP_MAX; i++){
    const c = list[i]; let dup = false;
    for (let k = 0; k < n; k++){
      const s = RP.sel[k]; let d = Math.abs(s.a - c.a); if (d > Math.PI) d = 2 * Math.PI - d;
      if (s.kind === c.kind && d < .35){ dup = true; break; }
    }
    if (dup) continue;
    const s = RP.sel[n] || (RP.sel[n] = { z:null, kind:'', u:0, a:0 });
    s.z = c.z; s.kind = c.kind; s.u = c.u; s.a = c.a; n++;
  }
  for (let k = n; k < RP.sel.length; k++) RP.sel[k].z = null;
  for (let k = 0; k < rpNC; k++) rpCands[k].z = null; // pas de référence gardée sur les zombies morts
  rpTagSelect();
}
function rpHide(A){ if (A.on){ A.on = false; A.el.classList.remove('on'); } }
function rpPlace(A, s){
  const z = s.z, gp = z.g.position, p = rpProj(gp.x, gp.y + (z.aimY != null ? z.aimY : 1.1), gp.z);
  if (!rpOff(p)){ rpHide(A); return; }
  const a = rpAng(p), dx = Math.cos(a), dy = Math.sin(a), S_ = rpScr;
  const cx = (S_.L + S_.R) / 2, cy = (S_.T + S_.B) / 2;
  const tx = Math.abs(dx) > 1e-4 ? (dx > 0 ? S_.R - cx : cx - S_.L) / Math.abs(dx) : 1e9;
  const ty = Math.abs(dy) > 1e-4 ? (dy > 0 ? S_.B - cy : cy - S_.T) / Math.abs(dy) : 1e9;
  const t = Math.min(tx, ty), x = Math.round(cx + dx * t), y = Math.round(cy + dy * t);
  if (A.kind !== s.kind){ A.kind = s.kind; const K = RP_KINDS[s.kind] || RP_KINDS.bar; A.el.style.setProperty('--c', K.c); A.ic.textContent = K.ic; }
  const tr = 'translate(' + x + 'px,' + y + 'px)'; if (tr !== A.tr){ A.tr = tr; A.el.style.transform = tr; }
  const rt = 'rotate(' + a.toFixed(2) + 'rad)'; if (rt !== A.rt){ A.rt = rt; A.ch.style.transform = rt; }
  const it = 'translate(' + Math.round(-dx * 26) + 'px,' + Math.round(-dy * 26) + 'px) translate(-50%,-50%)'; if (it !== A.it){ A.it = it; A.ic.style.transform = it; }
  const op = (.45 + .55 * s.u).toFixed(2); if (op !== A.op){ A.op = op; A.el.style.opacity = op; }
  const urg = s.u >= .8; if (urg !== A.urg){ A.urg = urg; A.el.classList.toggle('urg', urg); }
  if (!A.on){ A.on = true; A.el.classList.add('on'); }
}

/* ---------- 5. Étiquettes des monstres du toit ---------- */
const rpTagSel = []; // { z, pri } choisis 10 fois par seconde
const rpSec = v => (Math.max(0, v)).toFixed(1).replace('.', ',') + ' s';
// Étiquette d'un monstre : [texte, couleur, barre de 0 à 1 ou -1, x, y, z dans la rue, vive] ou null
function rpTagOf(z){
  const gp = z.g.position, sc = z.g.scale.y || 1;
  if (z.type === 'revenant' && z.st === 'down'){
    const dn = typeof MT_REV === 'object' ? MT_REV.down : 2.8, t = +z.mtT || 0;
    return ['💀 Achève : ' + rpSec(t), RP_KINDS.revenant.c, clamp(t / dn, 0, 1), gp.x, 1.7 * sc, gp.z, t < 1];
  }
  if (z.type === 'burrower' && z.mtUnder){
    const v = typeof MT_FOUIS === 'object' ? MT_FOUIS.spd : 7, t = Math.max(0, (z.mtEmerZ - gp.z) / v);
    const x = typeof z.mtTx === 'number' ? z.mtTx : gp.x;
    return ['⛏ Sortie : ' + rpSec(t), RP_KINDS.burrower.c, -1, x, .4, z.mtEmerZ, t < 1];
  }
  if (z.type === 'burrower' && z.mtVuln){
    const e = typeof MT_FOUIS === 'object' ? MT_FOUIS.emerge : 1.5;
    return ['⛏ Tire ! ×2', RP_KINDS.burrower.c, clamp(1 - (z.mtT || 0) / e, 0, 1), gp.x, 1.9 * sc, gp.z, true];
  }
  if (z.type === 'screamer' && z.st === 'attack') return ['📢 Hurleur', RP_KINDS.screamer.c, -1, gp.x, 2.9 * sc, gp.z, z.mtOnde >= 0];
  return null;
}
function rpTagSelect(){
  rpTagSel.length = 0;
  for (let i = 0; i < zombies.length; i++){
    const z = zombies[i]; if (z.dead || !z.g) continue;
    const t = z.type;
    if (t !== 'revenant' && t !== 'burrower' && t !== 'screamer') continue;
    const pri = t === 'revenant' ? (z.st === 'down' ? 3 : 0) : t === 'burrower' ? (z.mtUnder || z.mtVuln ? 2 : 0) : (z.st === 'attack' ? 1 : 0);
    if (pri) rpTagSel.push({ z, pri, d:z.g.position.z });
  }
  rpTagSel.sort((a, b) => b.pri - a.pri || b.d - a.d); // le plus urgent, puis le plus proche
  if (rpTagSel.length > RP_TAGS) rpTagSel.length = RP_TAGS;
}
function rpTagHide(T){ if (T.on){ T.on = false; T.el.style.display = 'none'; } }
function rpTagsFrame(){
  for (let i = 0; i < RP_TAGS; i++){
    const T = rpTags[i], s = rpTagSel[i], z = s && s.z;
    const d = z && !z.dead ? rpTagOf(z) : null;
    if (!d){ rpTagHide(T); continue; }
    const p = rpProj(d[3], d[4], d[5]);
    if (p.behind || Math.abs(p.nx) > 1.05 || Math.abs(p.ny) > 1.05){ rpTagHide(T); continue; }
    const x = Math.round((p.nx + 1) / 2 * innerWidth), y = Math.round((1 - p.ny) / 2 * innerHeight);
    if (d[0] !== T.txt){ T.txt = d[0]; T.tx.textContent = d[0]; }
    if (d[1] !== T.c){ T.c = d[1]; T.el.style.borderColor = d[1]; T.bar.style.background = d[1]; T.tx.style.color = d[1]; }
    const k = d[2] < 0 ? -1 : Math.round(d[2] * 50) / 50;
    if (k !== T.k){ T.k = k; T.bar.style.display = k < 0 ? 'none' : 'block'; if (k >= 0) T.bar.style.transform = 'scaleX(' + k + ')'; }
    const tr = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-100%)'; if (tr !== T.tr){ T.tr = tr; T.el.style.transform = tr; }
    const op = d[6] ? '1' : '.8'; if (op !== T.op){ T.op = op; T.el.style.opacity = op; }
    if (!T.on){ T.on = true; T.el.style.display = 'block'; }
  }
}
function rpTagsOff(){ rpTags.forEach(rpTagHide); rpTagSel.length = 0; }

/* ---------- 2. Flash de la barricade ---------- */
function rpFlash(side, k){ if (!RP.cues) return; RP.fl[side] = Math.max(RP.fl[side], clamp(k, 0, 1)); rpFlashDraw(); }
function rpHitAt(x, y, z, k){ if (!RP.cues) return; try { rpFlash(rpSideOf(x, y, z), k); } catch (e) { errNote(e); } }
function rpFlashDraw(){
  ['L', 'R', 'B'].forEach(s => {
    const v = Math.round(RP.fl[s] * 50) / 50;
    if (v !== RP.flShown[s]){ RP.flShown[s] = v; rpFlashEl[s].style.opacity = v; }
  });
}

/* ---------- 3. Sous-titres ---------- */
function rpCaption(txt, key){
  key = key || txt;
  const now = performance.now();
  if (RP.last[key] != null && now - RP.last[key] < RP_REPEAT) return false;
  RP.last[key] = now;
  if (!RP.subs || (state !== 'playing' && state !== 'paused')) return false;
  RP.count[key] = (RP.count[key] || 0) + 1;
  // Même légende encore affichée : on la rafraîchit au lieu de la doubler
  let L = null;
  for (const l of RP.lines) if (l.on && l.key === key){ L = l; break; }
  if (!L){ for (const l of RP.lines) if (!l.on){ L = l; break; } }
  if (!L){ L = RP.lines[0]; for (const l of RP.lines) if (l.t0 < L.t0) L = l; }
  L.key = key; L.t0 = now;
  if (L.el.textContent !== txt) L.el.textContent = txt;
  L.el.style.order = ++RP.order;
  if (L.on){ L.el.classList.remove('on'); void L.el.offsetWidth; } // relance l'effacement
  L.on = true; L.el.classList.add('on');
  return true;
}
function rpSubsTick(){
  const now = performance.now();
  for (const l of RP.lines) if (l.on && now - l.t0 > RP_LIFE){ l.on = false; l.el.classList.remove('on'); }
}
function rpSubsHide(){ for (const l of RP.lines) if (l.on){ l.on = false; l.el.classList.remove('on'); } }

/* ---------- Chaque image ---------- */
function rpFrame(dt){
  RP.frameN++;
  const live = !!S && (state === 'playing' || state === 'paused');
  // Flashs : s'éteignent doucement
  const k = Math.exp(-(dt || 0) * 4.5);
  if (RP.fl.L || RP.fl.R || RP.fl.B){
    ['L', 'R', 'B'].forEach(s => { RP.fl[s] = RP.fl[s] * k < .02 ? 0 : RP.fl[s] * k; });
    if (!RP.cues || !live) RP.fl.L = RP.fl.R = RP.fl.B = 0;
    rpFlashDraw();
  }
  if (!RP.subs || !live) rpSubsHide(); else rpSubsTick();
  if (!RP.cues || !live){
    if (RP.shown){ RP.shown = false; rpArrows.forEach(rpHide); for (const s of RP.sel) s.z = null; rpTagsOff(); }
    return;
  }
  RP.shown = true;
  if (state === 'playing'){ RP.selT -= dt || 0; if (RP.selT <= 0){ RP.selT = RP_SEL; rpSelect(); } }
  rpCam(); if (rpScr.W !== innerWidth || rpScr.H !== innerHeight) rpRect();
  for (let i = 0; i < RP_MAX; i++){
    const A = rpArrows[i], s = RP.sel[i];
    if (!s || !s.z || s.z.dead) { if (s) s.z = null; rpHide(A); continue; }
    rpPlace(A, s);
  }
  rpTagsFrame();
}

/* ---------- Réglages (écran Pause) ---------- */
function rpSync(){
  const a = $('btnCues'), b = $('btnSubs');
  if (a) a.textContent = 'Repères visuels : ' + (RP.cues ? 'activés' : 'désactivés');
  if (b) b.textContent = 'Sous-titres : ' + (RP.subs ? 'activés' : 'désactivés');
}
function rpSetCues(on){
  RP.cues = !!on; store.set('dt_cues', RP.cues);
  if (!RP.cues){ RP.fl.L = RP.fl.R = RP.fl.B = 0; rpFlashDraw(); rpArrows.forEach(rpHide); for (const s of RP.sel) s.z = null; rpTagsOff(); RP.shown = false; }
  rpSync();
}
function rpSetSubs(on){ RP.subs = !!on; store.set('dt_subs', RP.subs); if (!RP.subs) rpSubsHide(); rpSync(); }
(function(){
  const res = $('btnResume');
  if (res && res.parentNode && !$('btnCues')){
    [['btnCues', () => rpSetCues(!RP.cues)], ['btnSubs', () => rpSetSubs(!RP.subs)]].forEach(d => {
      const b = document.createElement('button'); b.className = 'ghost'; b.id = d[0]; b.type = 'button';
      res.parentNode.insertBefore(b, res); b.addEventListener('click', d[1]);
    });
  }
  rpSync();
})();

/* ---------- Enveloppes (sans changer les sons ni les règles) ---------- */
const rpName = z => { const T = z && ZTYPES[z.type]; return (T && T.name ? T.name : 'zombie').toLowerCase(); };
Jeu.on('image', dt => rpFrame(dt)); // chaque image (registre, js/00-base.js)
// Coups sur la barricade (zombies ordinaires, colosse, volant)
try {
  const _b = hitBarricade;
  hitBarricade = function(z, dmg, shk){
    const r = _b.apply(this, arguments);
    if (RP.cues && z && z.g){ const big = z.type === 'colossus' || z.type === 'boss'; rpHitAt(z.g.position.x, 1, BAR_Z, big ? .95 : clamp(.3 + (shk || 0) * .55, .3, .9)); }
    return r;
  };
} catch (e) { errNote(e); }
// Crachats qui touchent la barricade
const rpSpitWas = [];
try {
  if (typeof zkFrame === 'function'){
    const _b = zkFrame;
    zkFrame = function(){
      const sp = typeof spits !== 'undefined' && RP.cues ? spits : null;
      if (sp) for (let i = 0; i < sp.length; i++) rpSpitWas[i] = sp[i].m.visible;
      const r = _b.apply(this, arguments);
      if (sp) for (let i = 0; i < sp.length; i++) if (rpSpitWas[i] && !sp[i].m.visible) rpHitAt(sp[i].b.x, sp[i].b.y, sp[i].b.z, .65);
      return r;
    };
  }
  if (typeof spitLaunch === 'function'){
    const _b = spitLaunch;
    spitLaunch = function(x, y, z){
      const o = _b.apply(this, arguments);
      if (o){ const w = rpDirWord(x, y, z); rpCaption('[Crachat d’acide' + (w === 'devant' ? '' : ' ' + w) + ']', 'spit'); }
      return o;
    };
  }
} catch (e) { errNote(e); }
// Boss : rugissement, autos lancées, coups de poing
try {
  if (typeof bossAnnounce === 'function'){
    const _b = bossAnnounce;
    bossAnnounce = function(){
      const r = _b.apply(this, arguments);
      rpCaption('[Rugissement du boss]');
      if (RP.cues){ rpFlash('L', .9); rpFlash('R', .9); rpFlash('B', .9); }
      return r;
    };
  }
  if (typeof bossThrow === 'function'){
    const _b = bossThrow;
    bossThrow = function(){ const r = _b.apply(this, arguments); if (r) rpCaption('[Le boss lance une auto]'); return r; };
  }
  if (typeof bossDown === 'function'){
    const _b = bossDown;
    bossDown = function(){ const r = _b.apply(this, arguments); rpCaption('[Le boss s’effondre]'); return r; };
  }
  if (typeof BOSS_KIND === 'object' && BOSS_KIND && typeof BOSS_KIND.update === 'function'){
    const _b = BOSS_KIND.update, was = [];
    BOSS_KIND.update = function(z){
      const b0 = S ? S.bar : 0, cars = typeof bossCars !== 'undefined' ? bossCars : [];
      for (let i = 0; i < cars.length; i++) was[i] = cars[i].m.visible && cars[i].owner === z;
      const r = _b.apply(this, arguments);
      if (RP.cues && S && S.bar < b0){
        let x = z.g.position.x, y = 1, zz = BAR_Z;
        for (let i = 0; i < cars.length; i++) if (was[i] && !cars[i].m.visible){ x = cars[i].b.x; y = cars[i].b.y; zz = cars[i].b.z; break; }
        rpHitAt(x, y, zz, 1);
      }
      return r;
    };
  }
} catch (e) { errNote(e); }
// Frappe aérienne
try { if (typeof pwStrike === 'function'){ const _b = pwStrike; pwStrike = function(){ const r = _b.apply(this, arguments); if (r) rpCaption('[Avion en approche]'); return r; }; } } catch (e) { errNote(e); }
// Tonnerre et pluie (Snd est un objet : on enveloppe ses méthodes, le son reste le même)
try {
  const _t = Snd.thunder;
  Snd.thunder = function(delay, power){ rpCaption((power || 1) >= 1.1 ? '[Tonnerre tout près]' : '[Tonnerre]', 'thunder'); return _t.apply(this, arguments); };
  const _r = Snd.rainLevel;
  Snd.rainLevel = function(v){
    v = +v || 0;
    if (v >= .05 && RP.rainV < .05) rpCaption(v >= 1.2 ? '[Pluie battante]' : '[Pluie]', 'rain');
    RP.rainV = v;
    return _r.apply(this, arguments);
  };
} catch (e) { errNote(e); }
// Chien : aboiements avec la menace et sa direction
try {
  if (typeof cpnBark === 'function'){
    const _b = cpnBark;
    cpnBark = function(list){
      const r = _b.apply(this, arguments);
      const z = list && list[0];
      if (z && z.g){ const gp = z.g.position; rpCaption('[Le chien aboie : ' + rpName(z) + ' ' + rpDirWord(gp.x, gp.y + 1, gp.z) + ']', 'dog'); }
      return r;
    };
  }
} catch (e) { errNote(e); }
// Survivant et caisses
try {
  if (typeof rueSpawnCiv === 'function'){
    const _b = rueSpawnCiv;
    rueSpawnCiv = function(x, z){
      const v = _b.apply(this, arguments);
      if (v){ const w = rpDirWord(x, 1.5, z); rpCaption('[Survivant appelle à l’aide' + (w === 'devant' ? '' : ', ' + w) + ']', 'civ'); }
      return v;
    };
  }
  if (typeof rueSpawnCrate === 'function'){
    const _b = rueSpawnCrate;
    rueSpawnCrate = function(){ const c = _b.apply(this, arguments); if (c) rpCaption('[Caisse larguée]'); return c; };
  }
} catch (e) { errNote(e); }
// Munitions : chargeur vide, recharge terminée
try {
  const _f = fire;
  fire = function(){
    const r = _f.apply(this, arguments);
    if (r !== false && S && S.ammo[S.cur] <= 0 && !(typeof RUE === 'object' && RUE.furyT > 0)) rpCaption('[Plus de munitions]');
    return r;
  };
  const _u = update;
  update = function(){
    const was = reloadT > 0;
    const r = _u.apply(this, arguments);
    if (was && reloadT <= 0 && state === 'playing' && S && S.ammo[S.cur] > 0) rpCaption('[Recharge terminée]');
    return r;
  };
} catch (e) { errNote(e); }

// Monstres du toit (js/63-monstres-toit.js) : sous-titres de leurs sons
function rpMonstre(quoi, z){
  if (!z || !z.g || state !== 'playing') return false;
  const gp = z.g.position, ou = w => w === 'devant' ? '' : ' ' + w;
  if (quoi === 'cri') return rpCaption('[Cri du hurleur' + ou(rpDirWord(gp.x, 2.5, gp.z)) + ' : les zombies autour accélèrent]', 'hurle');
  if (quoi === 'creuse'){
    const x = typeof z.mtTx === 'number' ? z.mtTx : gp.x, zz = typeof z.mtEmerZ === 'number' ? z.mtEmerZ : BAR_Z - 12;
    return rpCaption('[Grondement sous la rue : le fouisseur ressort' + ou(rpDirWord(x, .4, zz)) + ', à ' + Math.round(BAR_Z - zz) + ' m]', 'creuse');
  }
  if (quoi === 'sort') return rpCaption('[Fracas : le fouisseur sort' + ou(rpDirWord(gp.x, 1, gp.z)) + ', tire !]', 'sort');
  if (quoi === 'chute') return rpCaption('[Râle : un revenant tombe à genoux, achève-le]', 'chute');
  if (quoi === 'releve') return rpCaption('[Le revenant se relève]', 'releve');
  return false;
}
Jeu.on('monstre', (quoi, z) => rpMonstre(quoi, z));

// Accès pour les tests automatiques
window.__reperes = {
  RP, RP_MAX, RP_LINES, RP_REPEAT, RP_TAGS, rpArrows, rpFlashEl, rpSubs, rpBox, rpTagBox, rpMonstre, rpTagOf,
  tagsOn(){ return rpTags.filter(T => T.on).map(T => ({ txt:T.txt, k:T.k, x:+(T.tr.match(/translate\((-?\d+)px/) || [0, 0])[1], y:+(T.tr.match(/translate\(-?\d+px,(-?\d+)px/) || [0, 0])[1] })); },
  select: rpSelect, frame: rpFrame, caption: rpCaption, flash: rpFlash, sideOf: rpSideOf, setCues: rpSetCues, setSubs: rpSetSubs,
  arrowsOn(){ return rpArrows.filter(A => A.on).map(A => ({ kind:A.kind, x:+(A.tr.match(/translate\((-?\d+)px/) || [0, 0])[1], urg:A.urg })); },
  linesOn(){ return RP.lines.filter(l => l.on).map(l => l.el.textContent); },
  domCount(){ return rpBox.childElementCount + rpSubs.childElementCount + rpTagBox.childElementCount + 3; }
};
