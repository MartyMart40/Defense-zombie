'use strict';
/* ================= Atelier : ferraille, défenses automatiques, écran ================= */
// Ferraille par zombie abattu (par n'importe qui), multipliée par la difficulté de la ville (L.diff).
// Saint-Clou complet (environ 350 marcheurs, 96 coureurs, 4 costauds) : environ 260 ferrailles.
const SCRAP_Z = { walker:.5, runner:.7, brute:4 };
function scrapFor(type, L){ return (SCRAP_Z[type] || .5) * ((L && L.diff) || 1); }
const fmtS = n => Math.floor(n).toLocaleString('fr-CA') + ' ⚙';

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
function defStats(type, lv){
  lv = lv || {}; const d = lv.dmg || 0, r = lv.rate || 0, g = lv.range || 0, s = lv.spec || 0;
  switch (type){
    case 'turret':  return { dmg:12 * defGrow(d), rate:2 * defSoft(r, DEF_CAP.rate), range:45 * defSoft(g, DEF_CAP.range), pierce:defSoft(s, DEF_CAP.pierce) };
    case 'mortar':  return { dmg:70 * defGrow(d), rate:.4 * defSoft(r, DEF_CAP.rate), range:60 * defSoft(g, DEF_CAP.range), radius:3.5 * defSoft(s, DEF_CAP.zone) };
    case 'laser':   return { dps:45 * defGrow(d), off:3 / defSoft(r, DEF_CAP.rate), range:45 * defSoft(g, DEF_CAP.range), burn:12 * defGrow(s) };
    case 'missile': return { dmg:160 * defGrow(d), rate:.25 * defSoft(r, DEF_CAP.rate), radius:4 * defSoft(g, DEF_CAP.zone), count:3 * defSoft(s, DEF_CAP.count), range:100 };
    case 'nuke':    return { dmg:4000 * defGrow(d), fallout:25 * defGrow(r), radius:60 * defSoft(g, DEF_CAP.zone), reload:30 / defSoft(s, DEF_CAP.reload) };
  }
  return null;
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
  laser:   { dmg:s => r0(s.dps) + ' dégâts par seconde', rate:s => 'pause de ' + f1(s.off) + ' s entre deux rayons', range:s => r0(s.range) + ' m', spec:s => r0(s.burn) + ' dégâts par seconde pendant ' + BURN_T + ' s' },
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
  const s = P.slots[atSel];
  h = '<h3>' + DEF_SLOTS[atSel].name + (s ? ' : ' + DEF_TYPES[s.type].name : ' : installer une défense') + '</h3>';
  if (!s){
    DEF_ORDER.forEach(k => {
      const D = DEF_TYPES[k];
      h += '<div class="row"><div class="info"><div class="nm">' + D.name + '</div><div class="ds">' + D.desc + '</div></div><button data-at="buy" data-t="' + k + '"' + (P.scrap < D.price ? ' disabled' : '') + '>' + fmtS(D.price) + '</button></div>';
    });
  } else {
    const F = DEF_FMT[s.type], D = DEF_TYPES[s.type];
    h += '<div class="ds at-note">Chaque amélioration donne environ +10 % et coûte 15 % de plus que la précédente. Les dégâts montent sans limite ; le reste plafonne doucement.</div>';
    DEF_LINES.forEach(k => {
      const l = s.lv[k], c = defUpgCost(s.type, l), nxt = Object.assign({}, s.lv); nxt[k] = l + 1;
      const cur = F[k](defStats(s.type, s.lv)), aft = F[k](defStats(s.type, nxt));
      h += '<div class="row"><div class="info"><div class="nm">' + D.lines[k] + ' <span class="at-lv">niv. ' + l + '</span></div><div class="ds">' + cur + (aft !== cur ? ' → ' + aft : ' (presque au maximum)') + '</div></div>'
        + '<button data-at="upg" data-k="' + k + '"' + (P.scrap < c ? ' disabled' : '') + '>' + fmtS(c) + '</button></div>';
    });
  }
  $('atDetail').innerHTML = h;
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
