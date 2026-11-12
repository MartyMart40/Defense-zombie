'use strict';
/* ================= Atelier : ferraille, défenses automatiques, écran ================= */
// Ferraille par zombie abattu (par n'importe qui), multipliée par la difficulté de la ville (L.diff).
// Saint-Clou complet (environ 350 marcheurs, 96 coureurs, 4 costauds) : environ 260 ferrailles.
const SCRAP_Z = { walker:.5, runner:.7, brute:4, jumper:.8, flyer:1, spitter:1.5, colossus:15 }; // type absent : .5
function scrapFor(type, L){ return (SCRAP_Z[type] || .5) * ((L && L.diff) || 1); }
const fmtS = n => fmtN(Math.floor(n)) + ' ⚙'; // forme courte au-delà de 9 999 (fmtN, 00-base.js)

// Les 4 emplacements : 2 près de la barricade (BAR_Z = -9), 2 plus loin sur les trottoirs
const DEF_SLOTS = [
  { name:'Barricade, gauche', x:-16.5, z:-14, h:4.5 },
  { name:'Barricade, droite', x:16.5,  z:-14, h:4.5 },
  { name:'Rue, gauche',       x:-15,   z:-52, h:5.5 },
  { name:'Rue, droite',       x:15,    z:-52, h:5.5 }
];
const DEF_ORDER = ['turret', 'mortar', 'laser', 'missile', 'nuke'];
const DEF_LINES = ['dmg', 'rate', 'range', 'spec'];
const DEF_TYPES = {
  turret:  { name:'Tourelle', price:250, desc:'Tire seule sur le zombie le plus proche. Faible au départ.',
    lines:{ dmg:'Dégâts', rate:'Cadence', range:'Portée', spec:'Balles perforantes' } },
  mortar:  { name:'Mortier', price:900, desc:'Obus en cloche qui explosent au milieu des groupes.',
    lines:{ dmg:'Dégâts', rate:'Cadence', range:'Portée', spec:'Rayon de zone' } },
  laser:   { name:'Laser', price:2500, desc:'Rayon continu qui traverse toute la file et laisse une brûlure.',
    lines:{ dmg:'Dégâts', rate:'Cadence', range:'Portée', spec:'Brûlure' } },
  missile: { name:'Missiles', price:6000, desc:'Salves de missiles guidés, grosses explosions.',
    lines:{ dmg:'Dégâts', rate:'Cadence', range:'Zone d’explosion', spec:'Missiles par salve' } },
  nuke:    { name:'Ogive nucléaire', price:40000, desc:'Toutes les 30 secondes, rase la rue. Compte à rebours ☢ en haut de l’écran.',
    lines:{ dmg:'Puissance', rate:'Retombées', range:'Souffle', spec:'Recharge' } }
};
// +10 % par niveau. Dégâts : sans limite (×1,1 par niveau).
// Le reste plafonne doucement : soft(l, C) vaut 1,1 au niveau 1 et tend vers 1 + C.
const defGrow = l => Math.pow(1.1, l);
function defSoft(l, C){ return 1 + C * (1 - Math.pow(1 - .1 / C, l)); }
const DEF_CAP = { rate:1.5, range:1, zone:1, pierce:4, count:2, reload:2 };
const LASER_ON = 2.5, BURN_T = 3, FALLOUT_T = 6;
// Mortier, laser et missiles renforcés le 12 novembre 2026 (70, 45 et 160 avant) : à ferraille égale, 4 tourelles de base
// améliorées les battaient presque partout (banc du simulateur, docs/conception.md).
function defStats(type, lv){
  lv = lv || {}; const d = lv.dmg || 0, r = lv.rate || 0, g = lv.range || 0, s = lv.spec || 0;
  switch (type){
    case 'turret':  return { dmg:12 * defGrow(d), rate:2 * defSoft(r, DEF_CAP.rate), range:45 * defSoft(g, DEF_CAP.range), pierce:defSoft(s, DEF_CAP.pierce) };
    case 'mortar':  return { dmg:120 * defGrow(d), rate:.4 * defSoft(r, DEF_CAP.rate), range:60 * defSoft(g, DEF_CAP.range), radius:3.5 * defSoft(s, DEF_CAP.zone) };
    case 'laser':   return { dps:80 * defGrow(d), off:3 / defSoft(r, DEF_CAP.rate), range:45 * defSoft(g, DEF_CAP.range), burn:20 * defGrow(s) };
    case 'missile': return { dmg:250 * defGrow(d), rate:.25 * defSoft(r, DEF_CAP.rate), radius:4 * defSoft(g, DEF_CAP.zone), count:3 * defSoft(s, DEF_CAP.count), range:100 };
    case 'nuke':    return { dmg:4000 * defGrow(d), fallout:25 * defGrow(r), radius:60 * defSoft(g, DEF_CAP.zone), reload:30 / defSoft(s, DEF_CAP.reload) };
  }
  return null;
}
/* ---------- Synergies (calculées à partir de P.slots, rien de plus dans la sauvegarde) ---------- */
// Même type : 2, 3 ou 4 défenses pareilles. L'ogive n'a que des dégâts en plus (pas de recharge plus courte).
const SYN_SAME = { 2:{ dmg:1.15, rate:1.10 }, 3:{ dmg:1.25, rate:1.15 }, 4:{ dmg:1.40, rate:1.25 } };
const SYN_SAME_NUKE = { 2:{ dmg:1.10, rate:1 }, 3:{ dmg:1.20, rate:1 }, 4:{ dmg:1.30, rate:1 } };
const SYN = { burnT:1.5, napalmDps:.12, markT:3, markDmg:1.25, radius:1.3 };
const SYN_COMBOS = [
  { id:'napalm', name:'Napalm', need:['laser', 'mortar'], color:0xff7a2a,
    desc:'Les obus du mortier mettent le feu aux zombies et toutes les brûlures durent 50 % plus longtemps.' },
  { id:'mark', name:'Marquage', need:['turret', 'missile'], color:0x5ad0ff,
    desc:'La tourelle marque les zombies touchés : les missiles les visent en premier et leur font +25 % de dégâts.' },
  { id:'firerain', name:'Pluie de feu', need:['mortar', 'missile'], color:0xff4a3a,
    desc:'Les explosions du mortier et des missiles sont 30 % plus larges.' }
];
const SYN_SAME_COLOR = 0xf2c060;
const pct = m => Math.round((m - 1) * 100);
function defSynergies(slots){
  slots = slots || P.slots;
  const count = {};
  slots.forEach(s => { if (s && DEF_TYPES[s.type]) count[s.type] = (count[s.type] || 0) + 1; });
  const same = [];
  DEF_ORDER.forEach(t => { const n = Math.min(4, count[t] || 0); if (n >= 2) same.push({ type:t, n, m:(t === 'nuke' ? SYN_SAME_NUKE : SYN_SAME)[n] }); });
  const combos = SYN_COMBOS.filter(c => c.need.every(t => count[t]));
  return { count, same, combos };
}
// Ce que les synergies changent pour une défense de ce type
function defSynMods(type, slots){
  const sy = defSynergies(slots), m = { dmg:1, rate:1, radius:1, burnT:1, napalm:false, mark:false, hunt:false, n:1, names:[] };
  const s = sy.same.find(x => x.type === type);
  if (s){ m.dmg = s.m.dmg; m.rate = s.m.rate; m.n = s.n; m.names.push(DEF_TYPES[type].name + ' ×' + s.n); }
  sy.combos.forEach(c => {
    if (c.need.indexOf(type) < 0) return;
    m.names.push(c.name);
    if (c.id === 'napalm'){ m.burnT = SYN.burnT; if (type === 'mortar') m.napalm = true; }
    if (c.id === 'mark'){ if (type === 'turret') m.mark = true; else m.hunt = true; }
    if (c.id === 'firerain') m.radius = SYN.radius;
  });
  return m;
}
// Stats finales d'une défense installée : defStats (améliorations) × synergies
function defStatsSyn(type, lv, slots){
  const st = defStats(type, lv); if (!st) return st;
  const m = defSynMods(type, slots);
  if (st.dmg != null) st.dmg *= m.dmg;
  if (st.dps != null) st.dps *= m.dmg;
  if (st.burn != null) st.burn *= m.dmg;
  if (st.fallout != null) st.fallout *= m.dmg;
  if (st.rate != null) st.rate *= m.rate;
  if (st.off != null) st.off /= m.rate;
  if (st.reload != null) st.reload /= m.rate;
  if (st.radius != null && type !== 'nuke') st.radius *= m.radius;
  st.burnT = BURN_T * m.burnT; st.syn = m;
  return st;
}
// Texte du bonus d'une défense, pour l'atelier
function defSynText(type, slots){
  const m = defSynMods(type, slots), p = [];
  if (m.dmg > 1) p.push('dégâts +' + pct(m.dmg) + ' %');
  if (m.rate > 1) p.push((type === 'laser' ? 'pauses ' : 'cadence +') + (type === 'laser' ? '-' + Math.round((1 - 1 / m.rate) * 100) : pct(m.rate)) + ' %');
  if (m.radius > 1) p.push('explosions +' + pct(m.radius) + ' %');
  if (m.burnT > 1) p.push('brûlures +' + pct(m.burnT) + ' %');
  if (m.napalm) p.push('obus incendiaires');
  if (m.mark) p.push('marque les zombies');
  if (m.hunt) p.push('vise les marqués, +' + pct(SYN.markDmg) + ' %');
  return m.names.length ? m.names.join(', ') + ' : ' + p.join(', ') : '';
}
const synSameTxt = (t, n) => { const m = (t === 'nuke' ? SYN_SAME_NUKE : SYN_SAME)[n]; return 'dégâts +' + pct(m.dmg) + ' %' + (m.rate > 1 ? ', cadence +' + pct(m.rate) + ' %' : ''); };
// Synergies nouvelles ou plus fortes si on installe "type" à l'emplacement i
function defSynGain(i, type){
  const a = defSynergies(), nx = P.slots.slice(); nx[i] = { type, lv:{} };
  const b = defSynergies(nx), out = [];
  b.same.forEach(s => { const o = a.same.find(x => x.type === s.type); if (!o || o.n < s.n) out.push(DEF_TYPES[s.type].name + ' ×' + s.n); });
  b.combos.forEach(c => { if (a.combos.indexOf(c) < 0) out.push(c.name); });
  return out;
}

// Chaque niveau coûte 15 % de plus que le précédent. Premier niveau : 40 % du prix de la défense.
function defUpgCost(type, l){ return Math.round(DEF_TYPES[type].price * .4 * Math.pow(1.15, l)); }
const defSellValue = slot => slot ? Math.floor(slot.paid / 2) : 0;

// Sauvegarde : P.scrap (ferraille) et P.slots (4 emplacements). Valeurs par défaut pour les anciennes sauvegardes.
function defNormSlot(s){
  if (!s || typeof s !== 'object' || !DEF_TYPES[s.type]) return null;
  const lv = {}; DEF_LINES.forEach(k => { const v = s.lv && +s.lv[k]; lv[k] = v > 0 ? Math.floor(v) : 0; });
  const paid = +s.paid >= 0 ? +s.paid : DEF_TYPES[s.type].price;
  return { type:s.type, paid, lv };
}
(function(){
  if (typeof P.scrap !== 'number' || !isFinite(P.scrap) || P.scrap < 0) P.scrap = 0;
  const old = Array.isArray(P.slots) ? P.slots : [];
  P.slots = DEF_SLOTS.map((_, i) => defNormSlot(old[i]));
})();

function defBuy(i, type){
  const D = DEF_TYPES[type]; if (!D || !DEF_SLOTS[i] || P.slots[i] || P.scrap < D.price) return false;
  P.scrap -= D.price; P.slots[i] = { type, paid:D.price, lv:{ dmg:0, rate:0, range:0, spec:0 } }; saveP(); return true;
}
function defUpgrade(i, line){
  const s = P.slots[i]; if (!s || DEF_LINES.indexOf(line) < 0) return false;
  const c = defUpgCost(s.type, s.lv[line]); if (P.scrap < c) return false;
  P.scrap -= c; s.paid += c; s.lv[line]++; saveP(); return true;
}
function defSell(i){
  const s = P.slots[i]; if (!s) return 0;
  const v = defSellValue(s); P.scrap += v; P.slots[i] = null; saveP(); return v;
}
// Crochet appelé par kill() (07-zombies.js), avant addXP qui sauve le profil
function defOnKill(z){
  const n = scrapFor(z.type, curLoc); P.scrap += n;
  if (S) S.scrapGained = (S.scrapGained || 0) + n;
}

/* ---------- Écran atelier ---------- */
const f1 = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
const r0 = v => Math.round(v).toLocaleString('fr-CA');
const DEF_FMT = {
  turret:  { dmg:s => r0(s.dmg) + ' dégâts par balle', rate:s => f1(s.rate) + ' tirs par seconde', range:s => r0(s.range) + ' m', spec:s => f1(s.pierce) + ' zombie' + (s.pierce >= 2 ? 's' : '') + ' par balle' },
  mortar:  { dmg:s => r0(s.dmg) + ' dégâts', rate:s => 'un obus toutes les ' + f1(1 / s.rate) + ' s', range:s => r0(s.range) + ' m', spec:s => 'rayon de ' + f1(s.radius) + ' m' },
  laser:   { dmg:s => r0(s.dps) + ' dégâts par seconde', rate:s => 'pause de ' + f1(s.off) + ' s entre deux rayons', range:s => r0(s.range) + ' m', spec:s => r0(s.burn) + ' dégâts par seconde pendant ' + f1(s.burnT || BURN_T) + ' s' },
  missile: { dmg:s => r0(s.dmg) + ' dégâts par missile', rate:s => 'une salve toutes les ' + f1(1 / s.rate) + ' s', range:s => 'explosion de ' + f1(s.radius) + ' m', spec:s => f1(s.count) + ' missiles par salve' },
  nuke:    { dmg:s => r0(s.dmg) + ' dégâts', rate:s => r0(s.fallout) + ' dégâts par seconde pendant ' + FALLOUT_T + ' s', range:s => 'souffle de ' + r0(s.radius) + ' m', spec:s => 'une ogive toutes les ' + f1(s.reload) + ' s' }
};
let atBack = 'scrTitle', atSel = 0, atSellArm = -1;
function atelierLabels(){
  const t = 'Atelier (' + fmtS(P.scrap) + ')';
  ['btnAtelierTitle', 'btnAtelierMap', 'btnAtelierOver'].forEach(id => { const el = $(id); if (el) el.textContent = t; });
}
function openAtelier(from){
  atBack = from; atSellArm = -1;
  const f = P.slots.findIndex(s => s); atSel = f >= 0 ? f : 0;
  renderAtelier(); showScreen('scrAtelier');
}
function renderAtelier(){
  $('atScrap').textContent = fmtS(P.scrap);
  let h = '';
  DEF_SLOTS.forEach((sl, i) => {
    const s = P.slots[i], on = i === atSel;
    h += '<div class="card slot' + (on ? ' on' : '') + '" data-at="sel" data-i="' + i + '"><div class="cname">' + sl.name + '</div>';
    if (s){
      const lv = DEF_LINES.reduce((a, k) => a + s.lv[k], 0);
      h += '<div class="cdesc"><b>' + DEF_TYPES[s.type].name + '</b>' + (lv ? ' · ' + lv + ' amélioration' + (lv > 1 ? 's' : '') : '') + '</div>'
        + '<div class="btns"><button data-at="sel" data-i="' + i + '"' + (on ? ' disabled' : '') + '>Améliorer</button>'
        + '<button class="sell" data-at="sell" data-i="' + i + '">' + (atSellArm === i ? 'Confirmer : +' : 'Vendre +') + fmtS(defSellValue(s)) + '</button></div>';
    } else {
      h += '<div class="cdesc">Emplacement vide</div><div class="btns"><button data-at="sel" data-i="' + i + '"' + (on ? ' disabled' : '') + '>Installer</button></div>';
    }
    h += '</div>';
  });
  $('atSlots').innerHTML = h;
  renderSynergies();
  const s = P.slots[atSel];
  h = '<h3>' + DEF_SLOTS[atSel].name + (s ? ' : ' + DEF_TYPES[s.type].name : ' : installer une défense') + '</h3>';
  if (!s){
    DEF_ORDER.forEach(k => {
      const D = DEF_TYPES[k];
      const gain = defSynGain(atSel, k);
      h += '<div class="row"><div class="info"><div class="nm">' + D.name + '</div><div class="ds">' + D.desc + '</div>'
        + (gain.length ? '<div class="at-syn">Active la synergie : ' + gain.join(', ') + '</div>' : '') + '</div><button data-at="buy" data-t="' + k + '"' + (P.scrap < D.price ? ' disabled' : '') + '>' + fmtS(D.price) + '</button></div>';
    });
  } else {
    const F = DEF_FMT[s.type], D = DEF_TYPES[s.type];
    h += '<div class="ds at-note">Chaque amélioration donne environ +10 % et coûte 15 % de plus que la précédente. Les dégâts montent sans limite ; le reste plafonne doucement.</div>';
    const sx = defSynText(s.type);
    if (sx) h += '<div class="at-syn">Bonus de synergie, ' + sx + '. Les valeurs ci-dessous en tiennent compte.</div>';
    DEF_LINES.forEach(k => {
      const l = s.lv[k], c = defUpgCost(s.type, l), nxt = Object.assign({}, s.lv); nxt[k] = l + 1;
      const cur = F[k](defStatsSyn(s.type, s.lv)), aft = F[k](defStatsSyn(s.type, nxt));
      h += '<div class="row"><div class="info"><div class="nm">' + D.lines[k] + ' <span class="at-lv">niv. ' + l + '</span></div><div class="ds">' + cur + (aft !== cur ? ' → ' + aft : ' (presque au maximum)') + '</div></div>'
        + '<button data-at="upg" data-k="' + k + '"' + (P.scrap < c ? ' disabled' : '') + '>' + fmtS(c) + '</button></div>';
    });
  }
  $('atDetail').innerHTML = h;
}
// Section « Synergies actives » : en cours, puis celles possibles (grisées, avec ce qu'il manque)
function renderSynergies(){
  let box = $('atSyn');
  if (!box){
    const d = $('atDetail'); if (!d || !d.parentNode) return;
    box = document.createElement('div'); box.id = 'atSyn'; d.parentNode.insertBefore(box, d);
  }
  const sy = defSynergies(), on = [], off = [];
  sy.same.forEach(s => {
    const D = DEF_TYPES[s.type];
    on.push('<b>' + D.name + ' ×' + s.n + '</b> : ' + synSameTxt(s.type, s.n) + ' pour ces ' + s.n + ' défenses.'
      + (s.n < 4 ? ' <span class="at-next">Une de plus : ' + synSameTxt(s.type, s.n + 1) + '.</span>' : ''));
  });
  sy.combos.forEach(c => on.push('<b>' + c.name + '</b> (' + c.need.map(t => DEF_TYPES[t].name).join(' + ') + ') : ' + c.desc));
  if (!sy.same.length) off.push('<b>Même type</b> : 2 défenses pareilles = ' + synSameTxt('turret', 2) + ' ; 3 = ' + synSameTxt('turret', 3) + ' ; 4 = ' + synSameTxt('turret', 4) + '. Ogive : ' + synSameTxt('nuke', 2) + ', puis +' + pct(SYN_SAME_NUKE[3].dmg) + ' et +' + pct(SYN_SAME_NUKE[4].dmg) + ' %.');
  SYN_COMBOS.forEach(c => {
    if (sy.combos.indexOf(c) >= 0) return;
    const miss = c.need.filter(t => !sy.count[t]).map(t => DEF_TYPES[t].name);
    off.push('<b>' + c.name + '</b> : ' + c.desc + ' <span class="at-need">Il faut ' + c.need.map(t => DEF_TYPES[t].name).join(' + ') + ' (il manque : ' + miss.join(', ') + ').</span>');
  });
  box.innerHTML = '<h3>Synergies actives</h3>'
    + (on.length ? on.map(t => '<div class="syn on">' + t + '</div>').join('') : '<div class="syn none">Aucune pour l’instant.</div>')
    + (off.length ? '<div class="syn-sub">Possibles</div>' + off.map(t => '<div class="syn off">' + t + '</div>').join('') : '');
}
$('scrAtelier').addEventListener('click', e => {
  const b = e.target.closest('[data-at]'); if (!b || b.disabled) return;
  const act = b.dataset.at;
  if (act === 'sel'){ const i = +b.dataset.i; if (i === atSel && b.tagName !== 'BUTTON') return; atSel = i; atSellArm = -1; }
  else if (act === 'buy'){ if (defBuy(atSel, b.dataset.t)){ Snd.buy(); defRebuild(); } atSellArm = -1; }
  else if (act === 'upg'){ if (defUpgrade(atSel, b.dataset.k)){ Snd.buy(); defRebuild(); } atSellArm = -1; }
  else if (act === 'sell'){
    e.stopPropagation();
    const i = +b.dataset.i;
    if (atSellArm !== i){ atSellArm = i; }
    else { const v = defSell(i); atSellArm = -1; atSel = i; toast('Vendu : +' + fmtS(v)); defRebuild(); }
  }
  renderAtelier(); atelierLabels();
});
$('btnAtBack').addEventListener('click', () => {
  atelierLabels();
  if (atBack === 'scrMap') renderMap();
  showScreen(atBack);
});
$('btnAtelierTitle').addEventListener('click', () => { Snd.init(); openAtelier('scrTitle'); });
$('btnAtelierMap').addEventListener('click', () => openAtelier('scrMap'));
$('btnAtelierOver').addEventListener('click', () => openAtelier('scrOver'));
// Crochet appelé par showEnd() (09-vagues.js) : ferraille gagnée pendant la partie
function scrapEndHTML(){
  atelierLabels();
  return '<span>Ferraille : <strong>+' + fmtS(S && S.scrapGained || 0) + '</strong> (' + fmtS(P.scrap) + ' en tout)</span>';
}
atelierLabels();
