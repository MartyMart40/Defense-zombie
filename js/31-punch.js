'use strict';
/* ================= Punch : ralenti, chiffres de dégâts, statistiques de fin ================= */
// Tout passe par des enveloppes (chaque enveloppe appelle la version précédente) :
//   update (échelle de temps), updateParts, visuals (chiffres, effet du ralenti), damage, defHit, weakHit, kill, fire,
//   armFlame, armExplode, armStep, pwUpdate, pwBlast, cpnShootSniper, cpnShootGunner, rueBarrelBlow, comboKill,
//   newGame (remise à zéro des statistiques), showEnd (section ajoutée sous les statistiques existantes).
// Réglages de l'écran Pause, sauvegardés : dt_slow (ralenti, activé par défaut), dt_dmgnum (chiffres, activés par défaut).

/* ---------- Réglages ---------- */
const PK = {
  slow: store.get('dt_slow', true) !== false,
  nums: store.get('dt_dmgnum', true) !== false,
  ts: 1, sl: null, slowCd: 0,          // échelle de temps du jeu, ralenti en cours, délai avant un petit ralenti
  src: null, fireK: 0, weak: 0,        // contexte du coup en cours : source, feu, point faible
  shotHits: 0, shotKills: 0,           // compteurs pendant un tir
  clock: 0, m0: null,
  frameEma: 1 / 60, costEma: 0, capT: 0, dropped: 0
};
// Ralenti : échelle pendant « hold » secondes, puis retour progressif en « ramp » secondes. prio : un plus fort remplace, jamais d'empilement.
const PK_SLOW = {
  boss:  { scale: .25, hold: 1,   ramp: .6,  prio: 2 },
  combo: { scale: .45, hold: .35, ramp: .35, prio: 1 },
  multi: { scale: .45, hold: .3,  ramp: .3,  prio: 1 }
};
const PK_SLOW_CD = 5;        // secondes après un ralenti avant qu'un petit (combo, tir multiple) puisse repartir
const PK_MULTI = 5;          // zombies abattus d'un seul tir pour un petit ralenti
// Chiffres de dégâts
const PKN_MAX = isTouch ? 16 : 24;     // taille du pool (éléments créés une seule fois)
const PKN_LIFE = .8;                    // durée d'un chiffre (s)
const PKN_MERGE = .15, PKN_MERGE_FIRE = .3, PKN_MERGE_AGE = .45; // regroupement sur le même zombie
const PKN_KPRIO = { n: 0, f: 1, h: 2, w: 3 };
let pknCap = PKN_MAX;                   // nombre affiché à la fois (baisse seule si les images/s chutent)

/* ---------- Format compact des grands nombres ---------- */
function pkFmt(n){
  n = Math.round(+n || 0);
  if (n < 1000) return String(n);
  if (n >= 10000 && typeof fmtN === 'function'){ try { const s = fmtN(n); if (typeof s === 'string' && s) return s; } catch (e) {} }
  const U = ['k', 'M', 'G', 'T', 'P', 'E']; let v = n, i = -1;
  while (v >= 999.5 && i < U.length - 1){ v /= 1000; i++; }
  return (v < 10 ? v.toFixed(1) : String(Math.round(v))).replace('.', ',').replace(/,0$/, '') + ' ' + U[i];
}

/* ---------- Statistiques de la partie (dans S, remises à zéro par newGame) ---------- */
function pkNew(){
  return { shots: 0, hits: 0, heads: 0, dmg: 0, bySrc: {}, sh: {}, kt: {}, boss: 0, spent: 0, time: 0,
    big: { amt: 0, src: '', head: false }, multi: { n: 0, src: '' } };
}
function pkSt(){ if (!S) return null; if (!S.pk) S.pk = pkNew(); return S.pk; }
const PK_SRC_NAMES = { def: 'Défenses', pow: 'Pouvoirs', cpn: 'Compagnon', rue: 'Barils', autre: 'Autres' };
const pkSrcName = s => (WEAPONS[s] && WEAPONS[s].name) || PK_SRC_NAMES[s] || 'Autres';
const pkIsWeapon = s => !!WEAPONS[s];

/* ---------- Ralenti ---------- */
let pkSlowEl = null;
function pkSlowFx(on){
  if (!pkSlowEl && on && document.createElement){
    pkSlowEl = document.createElement('div'); pkSlowEl.id = 'pkSlow';
    if (document.body && document.body.appendChild) document.body.appendChild(pkSlowEl);
  }
  if (pkSlowEl && pkSlowEl.classList) pkSlowEl.classList.toggle('on', !!on);
}
function pkSlow(kind){
  if (!PK.slow) return false;
  const c = PK_SLOW[kind]; if (!c) return false;
  if (PK.sl){ if (c.prio <= PK.sl.prio) return false; }   // pas de ralenti empilé
  else if (c.prio < 2 && PK.slowCd > 0) return false;
  PK.sl = { kind, scale: c.scale, hold: c.hold, ramp: c.ramp, prio: c.prio, t: 0 };
  PK.ts = c.scale;
  return true;
}
function pkSlowStop(){ PK.sl = null; PK.ts = 1; pkSlowFx(false); }
// dt réel (avant l'échelle) ; renvoie l'échelle à appliquer à cette image
function pkSlowStep(rdt){
  if (PK.slowCd > 0) PK.slowCd -= rdt;
  const s = PK.sl; if (!s){ PK.ts = 1; return 1; }
  s.t += rdt;
  if (s.t < s.hold) PK.ts = s.scale;
  else {
    const u = (s.t - s.hold) / s.ramp;
    if (u >= 1){ pkSlowStop(); PK.slowCd = PK_SLOW_CD; return 1; }
    PK.ts = s.scale + (1 - s.scale) * u * u * (3 - 2 * u);
  }
  return PK.ts;
}

/* ---------- Chiffres de dégâts : pool fixe ---------- */
const PKN = [];
let pknBox = null;
const pknV = new THREE.Vector3();
(function pknBuild(){
  if (!document.createElement) return;
  pknBox = document.createElement('div'); pknBox.id = 'pkNums';
  if (document.body && document.body.appendChild) document.body.appendChild(pknBox);
  for (let i = 0; i < PKN_MAX; i++){
    const el = document.createElement('div'); el.className = 'pkn';
    el.style.opacity = '0';
    if (pknBox.appendChild) pknBox.appendChild(el);
    PKN.push({ el, on: false, z: null, amt: 0, kind: 'n', t: 0, last: 0, x: 0, y: 0, zz: 0, jx: 0, txt: '', cls: '', dirty: false, score: 0 });
  }
})();
function pknActive(){ let n = 0; for (let i = 0; i < PKN.length; i++) if (PKN[i].on) n++; return n; }
function pknOff(e){ e.on = false; e.z = null; e.el.style.opacity = '0'; }
function pknClear(){ for (let i = 0; i < PKN.length; i++) if (PKN[i].on) pknOff(PKN[i]); }
// Un coup : regroupé avec le chiffre récent du même zombie, sinon un élément libre, sinon il remplace le plus faible (s'il est plus fort)
function pkNum(z, amt, kind, p){
  if (!PK.nums || !(amt > 0) || !p) return null;
  const now = PK.clock;
  for (let i = 0; i < PKN.length; i++){
    const e = PKN[i];
    if (!e.on || e.z !== z) continue;
    const win = (kind === 'f' && e.kind === 'f') ? PKN_MERGE_FIRE : PKN_MERGE;
    if (now - e.last <= win && e.t <= PKN_MERGE_AGE){
      e.amt += amt; e.last = now; e.dirty = true;
      if (PKN_KPRIO[kind] > PKN_KPRIO[e.kind]) e.kind = kind;
      e.score = pknScore(e.amt, e.x, e.y, e.zz);
      return e;
    }
  }
  const sc = pknScore(amt, p.x, p.y, p.z);
  let slot = null, act = 0, low = null;
  for (let i = 0; i < PKN.length; i++){
    const e = PKN[i];
    if (!e.on){ if (!slot) slot = e; continue; }
    act++;
    if (!low || e.score < low.score) low = e;
  }
  if (act >= pknCap || !slot){
    // Foule : seulement les plus gros coups (ou les plus proches)
    if (!low || sc <= low.score){ PK.dropped++; return null; }
    slot = low;
  }
  const e = slot;
  e.on = true; e.z = z; e.amt = amt; e.kind = kind; e.t = 0; e.last = now; e.dirty = true; e.score = sc;
  e.x = p.x; e.y = p.y; e.zz = p.z; e.jx = (Math.random() - .5) * 26;
  return e;
}
// Plus gros, ou plus proche de la caméra = plus important
function pknScore(amt, x, y, z){
  const c = camera.position, dx = x - c.x, dz = z - c.z;
  return amt / (1 + Math.sqrt(dx * dx + dz * dz) / 35);
}
function pknFrame(dt){
  const W = innerWidth, H = innerHeight;
  for (let i = 0; i < PKN.length; i++){
    const e = PKN[i]; if (!e.on) continue;
    e.t += dt;
    if (e.t >= PKN_LIFE){ pknOff(e); continue; }
    const el = e.el, st = el.style;
    if (e.dirty){
      e.dirty = false;
      const txt = pkFmt(e.amt); if (txt !== e.txt){ e.txt = txt; el.textContent = txt; }
      const cls = 'pkn on k' + e.kind; if (cls !== e.cls){ e.cls = cls; el.className = cls; }
    }
    pknV.set(e.x, e.y, e.zz).project(camera);
    if (pknV.z > 1 || pknV.z < -1){ st.opacity = '0'; continue; }
    const u = e.t / PKN_LIFE, rise = 46 * Math.sqrt(u), pop = e.t < .1 ? 1.35 - 3.5 * e.t : 1;
    const sx = ((pknV.x + 1) / 2 * W + e.jx) | 0, sy = ((1 - pknV.y) / 2 * H - 26 - rise) | 0;
    st.transform = 'translate3d(' + sx + 'px,' + sy + 'px,0) translate(-50%,-50%) scale(' + pop.toFixed(2) + ')';
    st.opacity = u < .6 ? '1' : (1 - (u - .6) / .4).toFixed(2);
  }
}
// Images/s qui chutent (ou chiffres trop coûteux) : moins de chiffres affichés à la fois ; ça remonte doucement ensuite
function pknAdapt(rdt){
  PK.frameEma += (rdt - PK.frameEma) * .05;
  PK.capT -= rdt; if (PK.capT > 0) return;
  if ((PK.frameEma > 1 / 40 || PK.costEma > .6) && pknCap > 6){ pknCap = Math.max(6, pknCap - 3); PK.capT = .5; }
  else if (PK.frameEma < 1 / 52 && PK.costEma < .3 && pknCap < PKN_MAX){ pknCap++; PK.capT = 1; }
  else PK.capT = .25;
}

/* ---------- Coups portés : statistiques et chiffres ---------- */
const pkCtr = new THREE.Vector3();
function pkCenter(z){ return pkCtr.set(z.g.position.x, z.g.position.y + (z.aimY != null ? z.aimY : 1.1), z.g.position.z); }
// d : dégâts réels du coup (après armure, etc.), hp0 : vie avant le coup
function pkDealt(z, d, hp0, head, point, src, kind){
  const st = pkSt();
  if (st){
    const eff = Math.min(d, Math.max(0, hp0));
    st.dmg += eff; st.bySrc[src] = (st.bySrc[src] || 0) + eff;
    if (pkIsWeapon(src) && head) st.heads++;
    if (d > st.big.amt){ st.big.amt = d; st.big.src = src; st.big.head = !!head; }
  }
  if (pkIsWeapon(src)) PK.shotHits++;
  pkNum(z, d, kind, point && point.isVector3 ? point : pkCenter(z));
}
function pkSrcNow(point){
  let s = PK.src || 'autre', f = PK.fireK > 0;
  if (s === 'arm'){ if (typeof armPt !== 'undefined' && point === armPt){ s = 'flamer'; f = true; } else s = 'crossbow'; }
  return { s, f };
}
try {
  const _dmgPk = damage;
  damage = function(z, amt, head, point){
    if (!z || z.dead) return _dmgPk.apply(this, arguments);
    const hp0 = z.hp, sf = pkSrcNow(point), w = PK.weak > 0;
    const r = _dmgPk.apply(this, arguments);
    const d = hp0 - z.hp;
    if (d > 0) pkDealt(z, d, hp0, head, point, sf.s, w ? 'w' : head ? 'h' : sf.f ? 'f' : 'n');
    return r;
  };
} catch (e) {}
try {
  if (typeof defHit === 'function'){
    const _defHitPk = defHit;
    defHit = function(z, amt){
      if (!z || z.dead) return _defHitPk.apply(this, arguments);
      const hp0 = z.hp, s0 = PK.src; PK.src = 'def';
      let r; try { r = _defHitPk.apply(this, arguments); } finally { PK.src = s0; }
      const d = hp0 - z.hp;
      if (d > 0) pkDealt(z, d, hp0, false, null, 'def', 'n');
      return r;
    };
  }
} catch (e) {}
try {
  if (typeof weakHit === 'function'){
    const _weakPk = weakHit;
    weakHit = function(){ PK.weak++; try { return _weakPk.apply(this, arguments); } finally { PK.weak--; } };
  }
} catch (e) {}
// Contexte de la source (statistiques par arme, couleur du feu) : fonctions globales réaffectées, vues partout
try { if (typeof pwUpdate === 'function'){ const _b = pwUpdate; pwUpdate = function(){ const s0 = PK.src, f0 = PK.fireK; PK.src = 'pow'; PK.fireK = 1; try { return _b.apply(this, arguments); } finally { PK.src = s0; PK.fireK = f0; } }; } } catch (e) {}
try { if (typeof pwBlast === 'function'){ const _b = pwBlast; pwBlast = function(){ const s0 = PK.src, f0 = PK.fireK; PK.src = 'pow'; PK.fireK = 0; try { return _b.apply(this, arguments); } finally { PK.src = s0; PK.fireK = f0; } }; } } catch (e) {}
try { if (typeof cpnShootSniper === 'function'){ const _b = cpnShootSniper; cpnShootSniper = function(){ const s0 = PK.src, f0 = PK.fireK; PK.src = 'cpn'; PK.fireK = 0; try { return _b.apply(this, arguments); } finally { PK.src = s0; PK.fireK = f0; } }; } } catch (e) {}
try { if (typeof cpnShootGunner === 'function'){ const _b = cpnShootGunner; cpnShootGunner = function(){ const s0 = PK.src, f0 = PK.fireK; PK.src = 'cpn'; PK.fireK = 0; try { return _b.apply(this, arguments); } finally { PK.src = s0; PK.fireK = f0; } }; } } catch (e) {}
try { if (typeof rueBarrelBlow === 'function'){ const _b = rueBarrelBlow; rueBarrelBlow = function(){ const s0 = PK.src, f0 = PK.fireK; PK.src = 'rue'; PK.fireK = 0; try { return _b.apply(this, arguments); } finally { PK.src = s0; PK.fireK = f0; } }; } } catch (e) {}
try {
  if (typeof armFlame === 'function'){
    const _b = armFlame;
    armFlame = function(id){ const s0 = PK.src, f0 = PK.fireK; PK.src = id || 'flamer'; PK.fireK = 1; try { return _b.apply(this, arguments); } finally { PK.src = s0; PK.fireK = f0; } };
  }
} catch (e) {}
// Tir multiple : plusieurs zombies abattus d'un coup (balles, plombs, roquette)
function pkMulti(n, src){
  const st = pkSt();
  if (st && n > st.multi.n){ st.multi.n = n; st.multi.src = src; }
  if (n >= PK_MULTI) pkSlow('multi');
}
try {
  if (typeof armExplode === 'function'){
    const _b = armExplode;
    armExplode = function(pos, id){
      const s0 = PK.src, f0 = PK.fireK, h0 = PK.shotHits, k0 = PK.shotKills, src = id || 'rocket';
      PK.src = src; PK.fireK = 0;
      let r; try { r = _b.apply(this, arguments); } finally { PK.src = s0; PK.fireK = f0; }
      const st = pkSt();
      if (st && pkIsWeapon(src) && PK.shotHits > h0) st.hits++;
      pkMulti(PK.shotKills - k0, src);
      return r;
    };
  }
} catch (e) {}
try {
  if (typeof armStep === 'function'){
    const _b = armStep;
    armStep = function(){
      const B = (typeof ARM !== 'undefined' && ARM.bolts) || [];
      for (let i = 0; i < B.length; i++) if (!B[i].seen.length) B[i].pkHit = false; // carreau neuf
      const s0 = PK.src, f0 = PK.fireK; PK.src = 'arm'; PK.fireK = 0;
      let r; try { r = _b.apply(this, arguments); } finally { PK.src = s0; PK.fireK = f0; }
      const st = pkSt();
      for (let i = 0; i < B.length; i++){
        const o = B[i]; if (o.pkHit || !o.seen.length) continue;
        let zh = false; for (let k = 0; k < o.seen.length; k++) if (o.seen[k] && o.seen[k].g) zh = true;
        if (zh){ o.pkHit = true; if (st) st.hits++; }
      }
      return r;
    };
  }
} catch (e) {}
try {
  const _firePk = fire;
  fire = function(){
    const id = S && S.cur, W = id && WEAPONS[id];
    const s0 = PK.src, f0 = PK.fireK, h0 = PK.shotHits, k0 = PK.shotKills;
    PK.src = id; PK.fireK = 0;
    let r; try { r = _firePk.apply(this, arguments); } finally { PK.src = s0; PK.fireK = f0; }
    const st = pkSt();
    if (r !== false && st && W){
      st.sh[id] = (st.sh[id] || 0) + 1;
      // Précision : balles et plombs (au tir), carreaux et roquettes (quand ils touchent) ; le souffle du lance-flammes n'y compte pas
      if (W.kind !== 'flame'){ st.shots++; if (!W.kind && PK.shotHits > h0) st.hits++; }
      if (!W.kind) pkMulti(PK.shotKills - k0, id);
    }
    return r;
  };
} catch (e) {}
try {
  const _killPk = kill;
  kill = function(z){
    const was = !!z && !z.dead;
    const r = _killPk.apply(this, arguments);
    if (was && z.dead){
      PK.shotKills++;
      const st = pkSt();
      if (st){ st.kt[z.type] = (st.kt[z.type] || 0) + 1; if (z.type === 'boss') st.boss++; }
      if (z.type === 'boss') pkSlow('boss');
    }
    return r;
  };
} catch (e) {}
try {
  if (typeof comboKill === 'function'){
    const _b = comboKill;
    comboKill = function(){
      const r = _b.apply(this, arguments);
      const n = typeof CB !== 'undefined' ? CB.n : 0;
      if (r && (n === 40 || n === 70 || (n >= 100 && n % 50 === 0))) pkSlow('combo');
      return r;
    };
  }
} catch (e) {}

/* ---------- Boucle : échelle de temps sur update(), chiffres et effet dans visuals() ---------- */
try {
  const _updPk = update;
  update = function(dt){
    const k = pkSlowStep(dt);
    const st = pkSt(); if (st) st.time += dt; // temps de jeu réel
    return _updPk.call(this, dt * k);
  };
} catch (e) {}
try {
  if (typeof updateParts === 'function'){
    const _b = updateParts;
    updateParts = function(dt){ return _b.call(this, state === 'playing' ? dt * PK.ts : dt); };
  }
} catch (e) {}
try {
  const _visPk = visuals;
  visuals = function(dt){
    const r = _visPk.apply(this, arguments);
    PK.clock += dt;
    const play = state === 'playing';
    if (PK.sl && !play && state !== 'paused') pkSlowStop();         // fin de vague, fin de partie, menus
    const fx = !!PK.sl && play;
    if (fx !== PK.fx){ PK.fx = fx; pkSlowFx(fx); }
    if (play){
      const t0 = performance.now();
      pknFrame(dt);
      PK.costEma += (performance.now() - t0 - PK.costEma) * .05;
      pknAdapt(dt);
    } else if (state !== 'paused' && pknActive()) pknClear();
    return r;
  };
} catch (e) {}
try {
  const _ngPk = newGame;
  newGame = function(){
    const r = _ngPk.apply(this, arguments);
    if (S) S.pk = pkNew();
    pkSlowStop(); PK.slowCd = 0; pknClear(); PK.shotHits = PK.shotKills = 0;
    return r;
  };
} catch (e) {}
try { const _b = clearZombies; clearZombies = function(){ const r = _b.apply(this, arguments); pknClear(); return r; }; } catch (e) {}

/* ---------- Argent dépensé : achats de la boutique (différence autour du clic) ---------- */
(function(){
  const shop = $('scrShop'); if (!shop || !shop.addEventListener) return;
  shop.addEventListener('click', () => { PK.m0 = S ? S.money : null; }, true);
  shop.addEventListener('click', () => {
    const st = pkSt();
    if (st && PK.m0 != null){ const d = PK.m0 - S.money; if (d > 0) st.spent += d; }
    PK.m0 = null;
  });
})();

/* ---------- Écran Pause : Ralenti, Chiffres de dégâts ---------- */
function pkSyncBtns(){
  const a = $('btnSlow'); if (a) a.textContent = 'Ralenti : ' + (PK.slow ? 'activé' : 'désactivé');
  const b = $('btnDmgNum'); if (b) b.textContent = 'Chiffres de dégâts : ' + (PK.nums ? 'affichés' : 'cachés');
}
function pkSetSlow(on){ PK.slow = !!on; store.set('dt_slow', PK.slow); if (!PK.slow) pkSlowStop(); pkSyncBtns(); }
function pkSetNums(on){ PK.nums = !!on; store.set('dt_dmgnum', PK.nums); if (!PK.nums) pknClear(); pkSyncBtns(); }
(function(){
  const res = $('btnResume');
  if (res && res.parentNode && res.parentNode.insertBefore){
    [['btnSlow', () => pkSetSlow(!PK.slow)], ['btnDmgNum', () => pkSetNums(!PK.nums)]].forEach(d => {
      const b = document.createElement('button'); b.className = 'ghost'; b.id = d[0]; b.type = 'button';
      res.parentNode.insertBefore(b, res);
      b.addEventListener('click', d[1]);
    });
  }
  pkSyncBtns();
})();

/* ---------- Écran de fin : section « Ta partie » ---------- */
function pkTime(s){
  s = Math.max(0, Math.round(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60, p = v => (v < 10 ? '0' : '') + v;
  return h ? h + ' h ' + p(m) + ' min' : m + ' min ' + p(x) + ' s';
}
function pkEndData(){
  const st = pkSt() || pkNew();
  const src = Object.keys(st.bySrc).filter(k => st.bySrc[k] > 0).sort((a, b) => st.bySrc[b] - st.bySrc[a]);
  const fav = Object.keys(st.sh).sort((a, b) => st.sh[b] - st.sh[a])[0] || '';
  const types = Object.keys(st.kt).sort((a, b) => st.kt[b] - st.kt[a]);
  return {
    shots: st.shots, hits: Math.min(st.hits, st.shots), acc: st.shots ? Math.round(100 * Math.min(st.hits, st.shots) / st.shots) : 0,
    heads: st.heads, dmg: st.dmg, top: src.slice(0, 3).map(k => ({ id: k, name: pkSrcName(k), dmg: st.bySrc[k], pct: st.dmg ? Math.round(100 * st.bySrc[k] / st.dmg) : 0 })),
    fav, favName: fav ? pkSrcName(fav) : '', favShots: fav ? st.sh[fav] : 0,
    types: types.map(t => ({ id: t, name: (ZTYPES[t] && ZTYPES[t].name) || t, n: st.kt[t] })),
    boss: st.boss, combo: (S && S.comboBest) || 0, earned: (S && S.earned) || 0, spent: st.spent, survivors: (S && S.survivors) || 0,
    time: st.time, big: st.big, multi: st.multi
  };
}
function pkEndHTML(){
  const D = pkEndData(), N = pkFmt;
  const cell = (v, l, s) => '<div class="pk-c"><b>' + v + '</b><span>' + l + '</span>' + (s ? '<small>' + s + '</small>' : '') + '</div>';
  let h = '<div class="pk-grid">'
    + cell(D.acc + ' %', 'Précision', N(D.hits) + ' / ' + N(D.shots) + ' tirs')
    + cell(N(D.heads), 'Tirs à la tête')
    + cell(N(D.dmg), 'Dégâts infligés')
    + cell(N(D.combo), 'Meilleur combo')
    + cell(N(D.boss), 'Boss abattu' + (D.boss > 1 ? 's' : ''))
    + cell(pkTime(D.time), 'Temps de jeu')
    + '</div>';
  // Meilleur moment
  const lines = [];
  if (D.multi.n >= 2) lines.push('<strong>' + D.multi.n + ' zombies d’un seul tir</strong> (' + pkSrcName(D.multi.src) + ')');
  if (D.big.amt > 0) lines.push('Plus gros coup : <strong>' + N(D.big.amt) + '</strong> (' + pkSrcName(D.big.src) + (D.big.head ? ', à la tête' : '') + ')');
  if (lines.length) h += '<div class="pk-best"><span class="pk-lbl">Meilleur moment</span>' + lines.join('<br>') + '</div>';
  const open = isTouch ? '' : ' open';
  // Armes : top 3 avec barres
  if (D.top.length){
    const mx = D.top[0].dmg || 1;
    h += '<details class="pk-sec" open><summary>Dégâts par arme</summary>';
    D.top.forEach(t => { h += '<div class="pk-bar"><span class="pk-n">' + t.name + '</span><span class="pk-v">' + N(t.dmg) + ' · ' + t.pct + ' %</span><i style="width:' + Math.max(3, Math.round(100 * t.dmg / mx)) + '%"></i></div>'; });
    if (D.fav) h += '<div class="pk-fav">Arme préférée : <strong>' + D.favName + '</strong> (' + N(D.favShots) + ' tir' + (D.favShots > 1 ? 's' : '') + ')</div>';
    h += '</details>';
  }
  if (D.types.length){
    h += '<details class="pk-sec"' + open + '><summary>Zombies par type</summary><div class="pk-types">';
    D.types.forEach(t => { h += '<span>' + t.name + ' <strong>' + N(t.n) + '</strong></span>'; });
    h += '</div></details>';
  }
  h += '<details class="pk-sec"' + open + '><summary>Argent et survivants</summary><div class="pk-types">'
    + '<span>Gagné <strong>' + fmt(D.earned) + '</strong></span><span>Dépensé <strong>' + fmt(D.spent) + '</strong></span>'
    + '<span>Survivants sauvés <strong>' + N(D.survivors) + '</strong></span></div></details>';
  return h;
}
function pkEndRender(){
  let box = $('pkEnd');
  const st = $('overStats');
  if (!box || !box.parentNode){
    if (!st || !st.parentNode || !st.parentNode.insertBefore) return null;
    box = document.createElement('div'); box.id = 'pkEnd';
    st.parentNode.insertBefore(box, st.nextSibling || null);
  }
  box.innerHTML = pkEndHTML();
  return box;
}
try {
  const _endPk = showEnd;
  showEnd = function(){
    pkSlowStop(); pknClear();
    const r = _endPk.apply(this, arguments);
    try { pkEndRender(); } catch (e) {}
    return r;
  };
} catch (e) {}

// Accès pour les tests automatiques et tests/perf.html
window.__punch = { PK, PKN, PK_SLOW, PKN_MAX, pkFmt, pkSlow, pkSlowStop, pkSlowStep, pkNum, pknFrame, pknClear, pknActive, pkSetSlow, pkSetNums,
  pkEndData, pkEndHTML, pkEndRender, pkNew, get cap(){ return pknCap; }, setCap(n){ pknCap = clamp(n | 0, 1, PKN_MAX); } };
