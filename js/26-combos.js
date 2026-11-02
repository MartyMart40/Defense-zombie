'use strict';
/* ================= Combos : abattre à la suite sans rater ================= */
// Règle :
//  - Seuls TES tirs font monter le combo : balles, plombs, carreaux, roquettes, flammes et brûlure du lance-flammes,
//    et ce qu'un de tes tirs déclenche (acide d'une poche éclatée, chute d'un volant, baril que tu fais sauter et sa chaîne).
//    Les défenses, les pouvoirs (grenade, molotov, frappe) et les barils qui sautent sans toi ne le font pas monter.
//  - Pendant un combo, TOUT l'argent des zombies abattus est multiplié (même ceux des défenses et des pouvoirs).
//  - Remise à zéro : un tir qui ne touche rien (balle, cartouche entière, carreau, roquette qui n'atteint personne ;
//    toucher un baril, une caisse ou un civil de la rue n'est pas un raté),
//    ou COMBO_DELAI secondes sans qu'un de tes tirs abatte un zombie, ou la fin de la vague.
//    Le lance-flammes ne « rate » jamais (souffle continu), mais le délai s'applique.
//  - Record : P.comboBest (profil permanent, 0 par défaut), meilleur combo de la partie : S.comboBest.
// Branchement : kill() (07-zombies.js) appelle comboKill(z) et multiplie la paie par comboMult().
const COMBO_PALIERS = [[5, 1.1], [10, 1.25], [20, 1.5], [40, 2], [70, 2.5]]; // plafond ×2,5 à 70
const COMBO_DELAI = 4;
const CB = { n:0, t:0, ctx:0, hits:0, rec:false, recStart:0, el:null, h:{} };
if (typeof P.comboBest !== 'number' || !isFinite(P.comboBest)) P.comboBest = 0;

function comboMult(n){
  if (n == null) n = CB.n;
  let m = 1; for (const p of COMBO_PALIERS) if (n >= p[0]) m = p[1];
  return m;
}
function comboTier(n){ let t = 0; COMBO_PALIERS.forEach((p, i) => { if (n >= p[0]) t = i + 1; }); return t; }
// Appelée par kill() avant le calcul de la paie
function comboKill(z){
  if (!(CB.ctx > 0 || (z && z.cbBy))) return false;
  CB.n++; CB.t = COMBO_DELAI;
  if (S) S.comboBest = Math.max(S.comboBest || 0, CB.n);
  if (CB.n > (P.comboBest || 0)){ P.comboBest = CB.n; CB.rec = true; }
  CB.pop = true;
  return true;
}
function comboEnd(){
  if (CB.n >= 5) CB.lost = true;
  CB.n = 0; CB.t = 0;
  if (CB.rec){ CB.rec = false; saveP(); }
}
function comboMiss(){ if (CB.n > 0) comboEnd(); }
function comboTick(dt){
  if (CB.n > 0){ CB.t -= dt; if (CB.t <= 0) comboEnd(); }
}

/* ---------- Affichage (créé ici, à droite sous les boutons) ---------- */
const comboFmt = m => '×' + String(m).replace('.', ',');
function comboEl(){
  if (CB.el) return CB.el;
  const hud = $('hud'); if (!hud || !document.createElement) return null;
  const el = document.createElement('div'); el.id = 'combo'; el.className = 'cb-off';
  el.innerHTML = '<div class="cb-row"><span class="cb-n">0</span><span class="cb-l">combo</span><span class="cb-m"></span></div><div class="cb-t"><i></i></div>';
  hud.appendChild(el); CB.el = el;
  CB.nEl = el.querySelector ? el.querySelector('.cb-n') : null;
  CB.mEl = el.querySelector ? el.querySelector('.cb-m') : null;
  CB.tEl = el.querySelector ? el.querySelector('.cb-t i') : null;
  return el;
}
function comboSet(k, v, f){ if (CB.h[k] !== v){ CB.h[k] = v; f(v); } }
function comboHUD(){
  const el = comboEl(); if (!el) return;
  const n = CB.n, tier = comboTier(n);
  comboSet('cls', n > 0 ? 'cb-on cb-k' + tier : 'cb-off', v => { el.className = v; });
  if (n > 0){
    comboSet('n', n, v => { if (CB.nEl) CB.nEl.textContent = v; });
    comboSet('m', tier ? comboFmt(comboMult(n)) : '', v => { if (CB.mEl) CB.mEl.textContent = v; });
    comboSet('w', Math.round(clamp(CB.t / COMBO_DELAI, 0, 1) * 50) / 50, v => { if (CB.tEl) CB.tEl.style.transform = 'scaleX(' + v + ')'; });
  }
  // Petit saut à chaque abattu, plus gros à chaque palier
  if (CB.pop){
    CB.pop = false;
    const up = tier > (CB.lastTier || 0);
    el.classList.remove('cb-pop', 'cb-up'); void el.offsetWidth; el.classList.add(up ? 'cb-up' : 'cb-pop');
  }
  CB.lastTier = tier;
  if (CB.lost){ CB.lost = false; el.classList.remove('cb-pop', 'cb-up'); }
  // Marqueur d'impact vert sur un point faible
  const wk = typeof weakT === 'number' && weakT > 0;
  comboSet('wk', wk, v => { const h = $('hitm'); if (h) h.classList.toggle('weak', v); });
}

/* ---------- Fin de partie ---------- */
function comboEndHTML(){
  const b = (S && S.comboBest) || 0;
  return '<span>Meilleur combo : <strong>' + b + '</strong></span><span>Record de combo : <strong>' + (P.comboBest || 0) + '</strong></span>';
}

/* ---------- Crochets (par réaffectation, comme 19 à 21) ---------- */
try {
  // Les dégâts portés pendant un de tes tirs comptent comme « touché »
  const _dmgCb = damage;
  damage = function(z, amt, head, point){
    if (CB.ctx > 0 && z && !z.dead) CB.hits++;
    return _dmgCb.apply(this, arguments);
  };
} catch (e) {}
try {
  // Tir à balles ou à plombs : aucun zombie touché = combo perdu
  const _fireCb = fire;
  fire = function(){
    const W = S && WEAPONS[S.cur], h0 = CB.hits, hm = hitmT;
    let r;
    hitmT = -1; // témoin : fire() le remet à 0,12 dès qu'un impact compte (zombie ou objet de la rue)
    CB.ctx++;
    try { r = _fireCb.apply(this, arguments); } finally { CB.ctx--; }
    const touche = hitmT !== -1; if (!touche) hitmT = hm;
    if (r !== false && W && !W.kind && !touche && CB.hits === h0) comboMiss();
    return r;
  };
} catch (e) {}
try {
  // Carreaux, roquettes, flammes et brûlure : ce sont tes tirs ; un carreau qui se plante sans toucher personne = raté
  if (typeof armStep === 'function'){
    const _armCb = armStep;
    armStep = function(dt){
      const B = (typeof ARM !== 'undefined' && ARM.bolts) || [];
      for (const o of B) o.cbFly = o.m.visible && !(o.stuck > 0);
      let r;
      CB.ctx++;
      try { r = _armCb.apply(this, arguments); } finally { CB.ctx--; }
      for (const o of B) if (o.cbFly && (!o.m.visible || o.stuck > 0) && !o.seen.length){ o.cbFly = false; comboMiss(); }
      return r;
    };
  }
  if (typeof armExplode === 'function'){
    const _boomCb = armExplode;
    armExplode = function(){
      const h0 = CB.hits; let r;
      CB.ctx++;
      try { r = _boomCb.apply(this, arguments); } finally { CB.ctx--; }
      if (CB.hits === h0) comboMiss(); // roquette qui n'a touché personne
      return r;
    };
  }
} catch (e) {}
try {
  // Baril que TU fais sauter (23-rue.js) : ses abattus comptent, même en chaîne
  if (typeof rueBarrelBlow === 'function'){
    const _rbCb = rueBarrelBlow;
    rueBarrelBlow = function(b, byPlayer){
      if (!byPlayer) return _rbCb.apply(this, arguments);
      CB.ctx++;
      try { return _rbCb.apply(this, arguments); } finally { CB.ctx--; }
    };
  }
} catch (e) {}
try {
  const _updCb = update;
  update = function(dt){ const r = _updCb.apply(this, arguments); if (state === 'playing') comboTick(dt); return r; };
} catch (e) {}
try {
  const _visCb = visuals;
  visuals = function(dt){ const r = _visCb.apply(this, arguments); if (weakT > 0) weakT -= dt; return r; };
} catch (e) {}
try {
  const _hudCb = updateHUD;
  updateHUD = function(){ const r = _hudCb.apply(this, arguments); comboHUD(); return r; };
} catch (e) {}
try {
  const _ngCb = newGame;
  newGame = function(){ comboEnd(); const r = _ngCb.apply(this, arguments); if (S) S.comboBest = 0; CB.recStart = P.comboBest || 0; return r; };
} catch (e) {}
try {
  const _swCb = startWave;
  startWave = function(){ comboEnd(); return _swCb.apply(this, arguments); };
} catch (e) {}
try {
  const _ewCb = endWave; // fin de vague : le combo s'arrête (pas de compteur figé pendant la boutique)
  endWave = function(){ comboEnd(); return _ewCb.apply(this, arguments); };
} catch (e) {}
try {
  const _endCb = showEnd;
  showEnd = function(won, extra){
    const nouveau = !!S && S.comboBest >= 5 && S.comboBest > (CB.recStart || 0);
    comboEnd(); saveP();
    const r = _endCb.apply(this, arguments);
    const st = $('overStats'); if (st) st.innerHTML += comboEndHTML();
    if (nouveau){
      const b = $('overBest'); if (b) b.textContent = ('Nouveau record de combo : ' + S.comboBest + ' ! ' + (b.textContent || '')).trim();
    }
    return r;
  };
} catch (e) {}

// Accès pour les tests automatiques
window.__combos = { CB, COMBO_PALIERS, COMBO_DELAI, comboMult, comboTier, comboKill, comboEnd, comboMiss, comboTick, comboHUD, comboEndHTML };
