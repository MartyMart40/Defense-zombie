'use strict';
/* ================= Missions et succès (récompensés en ferraille) ================= */
// Succès : permanents, une fois chacun, certains par paliers (bronze, argent, or). Ferraille versée à l'obtention.
// Missions : 3 actives à la fois, tirées au hasard, elles avancent d'une partie à l'autre ; finie = ferraille + remplacée.
// Compteurs À VIE dans P.st (indépendants des statistiques par partie de 31-punch.js).
// Sauvegarde (valeurs par défaut au chargement, anciennes sauvegardes OK) :
//   P.st = { kills, heads, boss, surv, barrels, combo, wins, waves, noRep, noDmg, bossFlame, bossHead, syn4, arsenal, inf, clown }
//   P.ach = { id: paliers obtenus }, P.achScrap = ferraille gagnée par les succès
//   P.miss = { act:[{ id, n }], done, scrap }
// Rien n'est sauvé à chaque zombie : saveP() en fin de vague, en fin de partie et quand un succès tombe
// (addXP sauve déjà le profil au fil du jeu, nos compteurs suivent avec lui).
// Branchement par réaffectation (comme 19 à 26) : fire, armFlame, armStep, armExplode, rueBarrelBlow, rueCivSaved,
// damage, kill, newGame, startWave, endWave, update, showEnd, showScreen.

const MS_STATS = ['kills', 'heads', 'boss', 'surv', 'barrels', 'combo', 'wins', 'waves', 'noRep', 'noDmg', 'bossFlame', 'bossHead', 'syn4', 'arsenal', 'inf', 'clown'];
const MS_TIER = ['Bronze', 'Argent', 'Or'];
// Valeur d'un compteur (certains reprennent ce que le jeu savait déjà : record de combo, série du défi, villes libérées)
function msVal(stat){
  const st = MS(); let v = +st[stat] || 0;
  if (stat === 'combo') v = Math.max(v, +P.comboBest || 0);
  else if (stat === 'defi') v = Math.max(v, (P.defi && +P.defi.record) || 0);
  else if (stat === 'cities') v = LOCS.filter(L => P.wins && P.wins[L.id] > 0).length;
  return v;
}
const msInfOk = () => typeof window !== 'undefined' && !!window.__infini;
const msN = n => Math.round(n).toLocaleString('fr-CA');
// Succès. tiers : [objectif, ferraille]. hide : caché tant que la condition est fausse. secret : « ??? » tant qu'il n'est pas obtenu.
const ACH = [
  { id:'heads',   name:'Tireur d’élite',      stat:'heads',   tiers:[[100, 60], [1000, 350], [10000, 1800]], desc:g => msN(g) + ' tirs à la tête' },
  { id:'kills',   name:'Nettoyeur de rue',    stat:'kills',   tiers:[[1000, 80], [10000, 450], [100000, 2500]], desc:g => msN(g) + ' zombies abattus' },
  { id:'boss',    name:'Chasseur de géants',  stat:'boss',    tiers:[[1, 100], [10, 600], [50, 2500]], desc:g => msN(g) + ' boss abattu' + (g > 1 ? 's' : '') },
  { id:'surv',    name:'Sauveteur',           stat:'surv',    tiers:[[1, 50], [10, 300], [50, 1500]], desc:g => msN(g) + ' survivant' + (g > 1 ? 's' : '') + ' sauvé' + (g > 1 ? 's' : '') },
  { id:'barrels', name:'Artificier',          stat:'barrels', tiers:[[10, 50], [100, 300], [500, 1200]], desc:g => msN(g) + ' barils que tu fais sauter' },
  { id:'combo',   name:'Enchaîneur',          stat:'combo',   tiers:[[20, 80], [40, 400], [70, 1500]], desc:g => 'Combo de ' + g },
  { id:'waves',   name:'Mur vivant',          stat:'waves',   tiers:[[25, 60], [250, 350], [1000, 1500]], desc:g => msN(g) + ' vagues tenues' },
  { id:'wins',    name:'Libérateur',          stat:'wins',    tiers:[[1, 60], [10, 350], [50, 1500]], desc:g => msN(g) + ' victoire' + (g > 1 ? 's' : '') + ' (ville ou défi)' },
  { id:'cities',  name:'Dernier toit',        stat:'cities',  tiers:[[5, 1000]], desc:() => 'Libère les 5 villes de la campagne' },
  { id:'noRep',   name:'Sans un clou',        stat:'noRep',   tiers:[[1, 300]], desc:() => 'Gagne une ville ou un défi sans jamais réparer la barricade' },
  { id:'noDmg',   name:'Forteresse',          stat:'noDmg',   tiers:[[1, 400]], desc:() => 'Gagne une ville ou un défi sans que la barricade perde plus de 25 %' },
  { id:'bossFlame', name:'Barbecue géant',    stat:'bossFlame', tiers:[[1, 300]], desc:() => 'Achève un boss au lance-flammes' },
  { id:'bossHead', name:'Chirurgien',         stat:'bossHead', tiers:[[1, 500]], desc:() => 'Abats un boss en ne lui tirant qu’à la tête' },
  { id:'syn4',    name:'Grand orchestre',     stat:'syn4',    tiers:[[1, 400]], desc:() => 'Lance une vague avec 4 défenses, toutes en synergie' },
  { id:'arsenal', name:'Arsenal complet',     stat:'arsenal', tiers:[[1, 300]], desc:() => 'Possède les 8 armes dans une même partie' },
  { id:'defi3',   name:'Habitué du défi',     stat:'defi',    tiers:[[3, 300]], desc:() => 'Réussis le défi du jour 3 jours d’affilée' },
  { id:'defi7',   name:'Fidèle au poste',     stat:'defi',    tiers:[[7, 1000]], desc:() => 'Réussis le défi du jour 7 jours d’affilée' },
  { id:'inf10',   name:'Sans fin',            stat:'inf',     tiers:[[10, 250]], hide:() => !msInfOk(), desc:() => 'Tiens 10 vagues en mode infini' },
  { id:'inf25',   name:'Increvable',          stat:'inf',     tiers:[[25, 700]], hide:() => !msInfOk(), desc:() => 'Tiens 25 vagues en mode infini' },
  { id:'inf50',   name:'Légende du toit',     stat:'inf',     tiers:[[50, 2500]], hide:() => !msInfOk(), desc:() => 'Tiens 50 vagues en mode infini' },
  { id:'clown',   name:'Le dernier rire',     stat:'clown',   tiers:[[1, 750]], secret:true, desc:() => 'Abats le clown zombie' }
];
const ACH_BY = {}; ACH.forEach(a => { (ACH_BY[a.stat] = ACH_BY[a.stat] || []).push(a); });
const achShown = a => !(a.hide && a.hide());
// Nombre total de succès (chaque palier compte), sans ceux encore cachés
const achTotal = () => ACH.reduce((n, a) => n + (achShown(a) ? a.tiers.length : 0), 0);
const achGot = () => ACH.reduce((n, a) => n + (achShown(a) ? Math.min(a.tiers.length, MSA()[a.id] || 0) : 0), 0);

// Missions : ev = événement, key = précision (type de zombie, arme, palier de combo)
const ZPL = { walker:'marcheurs', runner:'coureurs', brute:'costauds', jumper:'sauteurs', flyer:'volants', spitter:'cracheurs' };
const WART = { pistol:'le pistolet', shotgun:'le fusil à pompe', rifle:'le fusil d’assaut', sniper:'le sniper', crossbow:'l’arbalète', flamer:'le lance-flammes', minigun:'le minigun', rocket:'le lance-roquettes' };
const MDEF = {
  k_walker: { ev:'kill', key:'walker', goal:200, rew:60 },
  k_runner: { ev:'kill', key:'runner', goal:80, rew:70 },
  k_jumper: { ev:'kill', key:'jumper', goal:50, rew:80 },
  k_spitter:{ ev:'kill', key:'spitter', goal:25, rew:90 },
  k_flyer:  { ev:'kill', key:'flyer', goal:30, rew:90 },
  k_brute:  { ev:'kill', key:'brute', goal:15, rew:90 },
  k_any:    { ev:'kill', goal:500, rew:100, txt:'Abats 500 zombies' },
  h_any:    { ev:'head', goal:100, rew:90, txt:'Fais 100 tirs à la tête' },
  h_pistol: { ev:'head', key:'pistol', goal:30, rew:70 },
  h_shotgun:{ ev:'head', key:'shotgun', goal:25, rew:90 },
  h_rifle:  { ev:'head', key:'rifle', goal:50, rew:90 },
  h_sniper: { ev:'head', key:'sniper', goal:25, rew:100 },
  w_flamer: { ev:'killw', key:'flamer', goal:60, rew:100 },
  w_rocket: { ev:'killw', key:'rocket', goal:40, rew:100 },
  surv:     { ev:'surv', goal:2, rew:100, txt:'Sauve 2 survivants' },
  barrels:  { ev:'barrel', goal:5, rew:70, txt:'Fais sauter 5 barils' },
  wave50:   { ev:'wave50', goal:1, rew:80, txt:'Gagne une vague sans que la barricade descende sous 50 %' },
  waves:    { ev:'wave', goal:10, rew:90, txt:'Tiens 10 vagues' },
  boss:     { ev:'boss', goal:1, rew:120, txt:'Abats un boss' },
  combo25:  { ev:'combo', key:25, goal:1, rew:100, txt:'Atteins un combo de 25' },
  defi:     { ev:'defi', goal:1, rew:150, txt:'Réussis un défi du jour' }
};
const MIDS = Object.keys(MDEF);
function mTxt(id){
  const D = MDEF[id]; if (!D) return '';
  if (D.txt) return D.txt;
  if (D.ev === 'kill') return 'Abats ' + D.goal + ' ' + (ZPL[D.key] || 'zombies');
  if (D.ev === 'head') return D.goal + ' tirs à la tête avec ' + (WART[D.key] || 'tes armes');
  if (D.ev === 'killw') return 'Abats ' + D.goal + ' zombies avec ' + (WART[D.key] || 'tes armes');
  return id;
}

/* ---------- Sauvegarde ---------- */
function msNorm(){
  const num = v => (+v > 0 && isFinite(+v) ? Math.floor(+v) : 0);
  const st = P.st && typeof P.st === 'object' ? P.st : {}, o = {};
  MS_STATS.forEach(k => { o[k] = num(st[k]); });
  P.st = o;
  const a = P.ach && typeof P.ach === 'object' ? P.ach : {}, b = {};
  ACH.forEach(x => { const v = num(a[x.id]); if (v) b[x.id] = Math.min(v, x.tiers.length); });
  P.ach = b;
  P.achScrap = num(P.achScrap);
  const m = P.miss && typeof P.miss === 'object' ? P.miss : {};
  const act = (Array.isArray(m.act) ? m.act : []).filter(x => x && MDEF[x.id]).slice(0, 3)
    .map(x => ({ id:x.id, n:Math.min(num(x.n), MDEF[x.id].goal - 1) }));
  const seen = {}; const act2 = act.filter(x => !seen[x.id] && (seen[x.id] = true));
  P.miss = { act:act2, done:num(m.done), scrap:num(m.scrap) };
  while (P.miss.act.length < 3) P.miss.act.push(mNew());
  return P.st;
}
// Accès sûr (les tests remplacent le contenu de P)
function MS(){ return P.st && P.miss && P.ach ? P.st : msNorm(); }
function MSA(){ MS(); return P.ach; }
function MSM(){ MS(); return P.miss; }
function mNew(not){
  const cur = (P.miss && Array.isArray(P.miss.act) ? P.miss.act : []).map(x => x.id).concat(not || []);
  const pool = MIDS.filter(id => cur.indexOf(id) < 0);
  const id = pool.length ? pool[Math.floor(Math.random() * pool.length)] : MIDS[0];
  return { id, n:0 };
}

/* ---------- État ---------- */
const MSX = { src:null, fid:0, run:[], q:[], el:null, busy:false, endDone:false };
function msRun(t){ MSX.run.push(t); }
function msScrap(n){ P.scrap = (+P.scrap || 0) + n; if (S) S.scrapGained = (S.scrapGained || 0) + n; }
// Vérifie les succès liés à un compteur (quelques comparaisons)
function achCheck(stat){
  const L = ACH_BY[stat]; if (!L) return 0;
  const A = MSA(); let got = 0;
  for (const a of L){
    if (a.hide && a.hide()) continue;
    let t = A[a.id] || 0; if (t >= a.tiers.length) continue;
    const v = msVal(stat);
    while (t < a.tiers.length && v >= a.tiers[t][0]){
      const rew = a.tiers[t][1];
      t++; A[a.id] = t; got++;
      msScrap(rew); P.achScrap = (P.achScrap || 0) + rew;
      const nm = a.name + (a.tiers.length > 1 ? ' (' + MS_TIER[t - 1] + ')' : '');
      msRun(nm); msNote('Succès : ' + nm, '+' + fmtS(rew));
    }
  }
  if (got){ saveP(); if (typeof atelierLabels === 'function') atelierLabels(); msLabels(); }
  return got;
}
function achCheckAll(){ let n = 0; Object.keys(ACH_BY).forEach(k => { n += achCheck(k); }); return n; }
function msAdd(stat, n){ const st = MS(); st[stat] = (st[stat] || 0) + (n == null ? 1 : n); if (ACH_BY[stat]) achCheck(stat); }
function msMax(stat, v){ const st = MS(); if (v > (st[stat] || 0)){ st[stat] = v; if (ACH_BY[stat]) achCheck(stat); } }
// Événement de mission
function mEv(ev, key, n){
  const M = MSM(), A = M.act;
  for (let i = 0; i < A.length; i++){
    const m = A[i], D = MDEF[m.id];
    if (!D || D.ev !== ev || (D.key != null && D.key !== key)) continue;
    m.n = Math.min(D.goal, m.n + (n == null ? 1 : n));
    if (m.n >= D.goal){
      M.done++; M.scrap += D.rew; msScrap(D.rew);
      msRun(mTxt(m.id)); msNote('Mission réussie : ' + mTxt(m.id), '+' + fmtS(D.rew));
      A[i] = mNew([m.id]);
      MSX.dirty = true;
    }
  }
}

/* ---------- Notification discrète (file d'attente) ---------- */
function msNote(t, sub){ MSX.q.push([t, sub || '']); if (MSX.q.length > 8) MSX.q.splice(0, MSX.q.length - 8); if (!MSX.busy) msNext(); }
function msNext(){
  const el = $('msNote'); const it = MSX.q.shift();
  if (!el || !it){ MSX.busy = false; return; }
  MSX.busy = true;
  el.innerHTML = '<b></b><span></span>';
  const b = el.querySelector ? el.querySelector('b') : null, s = el.querySelector ? el.querySelector('span') : null;
  if (b) b.textContent = it[0]; else el.textContent = it[0] + ' ' + it[1];
  if (s) s.textContent = it[1];
  el.classList.add('on');
  setTimeout(() => { el.classList.remove('on'); setTimeout(msNext, 380); }, 2600);
}

/* ---------- Mode infini (défensif : 28-infini.js peut ne pas être là) ---------- */
function msInfOn(){
  const I = typeof window !== 'undefined' && window.__infini; if (!I) return false;
  try {
    if (curLoc && (curLoc.infini || curLoc.inf)) return true;
    const v = typeof I.active === 'function' ? I.active() : I.active != null ? I.active : typeof I.actif === 'function' ? I.actif() : I.actif != null ? I.actif : typeof I.on === 'function' ? I.on() : I.on;
    return !!v;
  } catch (e) { return false; }
}

/* ---------- Arme d'où vient un coup ---------- */
// MSX.src : 'w:<arme>' pendant fire(), 'flame' (lance-flammes), 'arm' (carreaux et brûlure dans armStep), 'barrel'
function msWeapon(point){
  const s = MSX.src; if (!s) return null;
  if (s === 'flame') return 'flamer';
  if (s === 'arm') return (typeof armPt !== 'undefined' && point === armPt) ? 'flamer' : 'crossbow';
  if (s.charCodeAt(0) === 119) return s.slice(2);
  return null;
}
function msCtx(src, f, self, args){ const s0 = MSX.src; MSX.src = src; try { return f.apply(self, args); } finally { MSX.src = s0; } }

/* ---------- Crochets ---------- */
try {
  const _b = fire;
  fire = function(){ MSX.fid++; return msCtx('w:' + (S ? S.cur : ''), _b, this, arguments); };
} catch (e) { errNote(e); }
try { if (typeof armFlame === 'function'){ const _b = armFlame; armFlame = function(){ return msCtx('flame', _b, this, arguments); }; } } catch (e) { errNote(e); }
try { if (typeof armStep === 'function'){ const _b = armStep; armStep = function(){ return msCtx('arm', _b, this, arguments); }; } } catch (e) { errNote(e); }
try { if (typeof armExplode === 'function'){ const _b = armExplode; armExplode = function(){ return msCtx('w:rocket', _b, this, arguments); }; } } catch (e) { errNote(e); }
try {
  if (typeof rueBarrelBlow === 'function'){
    const _b = rueBarrelBlow;
    rueBarrelBlow = function(b, byPlayer){
      const live = !!(b && b.live), r = msCtx('barrel', _b, this, arguments);
      if (live && byPlayer && b && !b.live){ msAdd('barrels'); mEv('barrel'); }
      return r;
    };
  }
} catch (e) { errNote(e); }
try {
  if (typeof rueCivSaved === 'function'){
    const _b = rueCivSaved;
    rueCivSaved = function(){ const r = _b.apply(this, arguments); msAdd('surv'); mEv('surv'); return r; };
  }
} catch (e) { errNote(e); }
try {
  const _b = damage;
  damage = function(z, amt, head, point){
    if (MSX.src && z && !z.dead){
      const w = msWeapon(point);
      if (w){
        if (z.type === 'boss'){ if (head) z._mHead = true; else z._mBody = true; }
        if (head && !(MSX.src.charCodeAt(0) === 119 && z._mHF === MSX.fid)){ // un coup par zombie et par tir (plombs)
          z._mHF = MSX.fid; msAdd('heads'); mEv('head', w);
        }
      }
    }
    return _b.apply(this, arguments);
  };
} catch (e) { errNote(e); }
try {
  const _b = kill;
  kill = function(z, head, point){
    const was = !!z && !z.dead, r = _b.apply(this, arguments);
    if (was && z.dead) msOnKill(z, head, point);
    return r;
  };
} catch (e) { errNote(e); }
function msOnKill(z, head, point){
  msAdd('kills'); mEv('kill', z.type);
  const w = msWeapon(point); if (w) mEv('killw', w);
  if (z.type === 'boss'){
    msAdd('boss'); mEv('boss');
    if (w === 'flamer') msAdd('bossFlame');
    if (z._mHead && !z._mBody && head) msAdd('bossHead');
  }
  if (z.type === 'clown' || z.clown === true) msAdd('clown');
  const cb = typeof CB !== 'undefined' && CB ? CB.n | 0 : 0;
  if (cb > 0){ msMax('combo', cb); mEv('combo', cb); }
}
try {
  const _b = newGame;
  newGame = function(){
    const r = _b.apply(this, arguments);
    if (S){ S._mMin = 1; S._mWave = 1; S._mRep = false; }
    MSX.run = []; MSX.endDone = false;
    return r;
  };
} catch (e) { errNote(e); }
try {
  const _b = startWave;
  startWave = function(){
    const r = _b.apply(this, arguments);
    if (S){
      S._mWave = 1;
      try {
        if (WORDER.every(id => S.owned[id])) msMax('arsenal', 1);
        if (Array.isArray(P.slots) && P.slots.length >= 4 && P.slots.every(s => s && typeof defSynMods === 'function' && defSynMods(s.type).names.length > 0)) msMax('syn4', 1);
      } catch (e) { errNote(e); }
    }
    return r;
  };
} catch (e) { errNote(e); }
try {
  const _b = endWave;
  endWave = function(){
    if (S && S.wave > 0){
      msAdd('waves'); mEv('wave');
      if ((S._mWave == null ? 1 : S._mWave) >= .5) mEv('wave50');
      if (msInfOn()) msMax('inf', S.wave);
    }
    const r = _b.apply(this, arguments);
    saveP(); // sauvegarde regroupée, une fois par vague
    return r;
  };
} catch (e) { errNote(e); }
try {
  // Plus bas niveau de la barricade (partie et vague) : une division par image
  const _b = update;
  update = function(dt){
    const r = _b.apply(this, arguments);
    if (S && state === 'playing' && S.barMax > 0){
      const k = S.bar / S.barMax;
      if (k < S._mMin) S._mMin = k;
      if (k < S._mWave) S._mWave = k;
    }
    return r;
  };
} catch (e) { errNote(e); }
// Réparation à la boutique : bouton « Réparer », ou barricade renforcée alors qu'elle était abîmée (elle la répare)
(function(){
  const sh = $('scrShop'); if (!sh || !sh.addEventListener) return;
  let b0 = null;
  sh.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('button[data-act]') : null;
    b0 = b && S ? { act:b.dataset.act, id:b.dataset.id, bar:S.bar, max:S.barMax, money:S.money } : null;
  }, true);
  sh.addEventListener('click', () => {
    if (!b0 || !S) return;
    if (S.money < b0.money && ((b0.act === 'repair') || (b0.act === 'upg' && b0.id === 'wall' && b0.bar < b0.max))) S._mRep = true;
    b0 = null;
  });
})();
// Fin de partie : succès de victoire, puis une ligne sur l'écran de fin (la version précédente est toujours appelée)
function msEnd(won){
  if (MSX.endDone || !S) return;
  MSX.endDone = true;
  try {
    if (won && !msInfOn()){
      msAdd('wins');
      // un défi « Pas de réparation » ne compte pas : réparer y est interdit
      const noRepMod = !!(curLoc && curLoc.defi && typeof DEFI === 'object' && DEFI.run && (DEFI.run.mods || []).indexOf('sansRep') >= 0);
      if (!S._mRep && !noRepMod) msAdd('noRep');
      if ((S._mMin == null ? 1 : S._mMin) >= .75) msAdd('noDmg');
      if (curLoc && curLoc.defi) mEv('defi');
      achCheck('defi'); achCheck('cities');
    }
    if (msInfOn()) msMax('inf', Math.max(0, (S.wave || 1) - 1));
  } catch (e) { errNote(e); }
  saveP();
}
function msEndHTML(){
  if (!MSX.run.length) return '';
  const esc = t => String(t).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' })[c]);
  return '<div class="ms-end"><b>Réussi pendant la partie :</b> ' + MSX.run.map(esc).join(' · ') + '</div>';
}
try {
  const _b = showEnd;
  showEnd = function(won){
    msEnd(!!won);
    const r = _b.apply(this, arguments);
    try { const st = $('overStats'); if (st){ const h = msEndHTML(); if (h) st.innerHTML += h; } } catch (e) { errNote(e); }
    return r;
  };
} catch (e) { errNote(e); }

/* ---------- Écran Succès ---------- */
let msBack = 'scrTitle';
function msLabels(){
  const t = 'Succès (' + achGot() + ' / ' + achTotal() + ')';
  ['btnSuccesTitle', 'btnSuccesMap'].forEach(id => { const el = $(id); if (el) el.textContent = t; });
}
const msBar = (v, g) => '<div class="ms-bar"><i style="width:' + Math.round(clamp(v / g, 0, 1) * 100) + '%"></i></div>';
function renderSucces(){
  const A = MSA(), M = MSM();
  let h = '<div class="stats"><span>Succès : <strong>' + achGot() + ' / ' + achTotal() + '</strong></span>'
    + '<span>Ferraille des succès : <strong>' + fmtS(P.achScrap || 0) + '</strong></span>'
    + '<span>Missions réussies : <strong>' + msN(M.done) + '</strong> (' + fmtS(M.scrap) + ')</span></div>';
  h += '<h3>Missions</h3><div class="ds ms-note">Trois missions à la fois. Elles avancent d’une partie à l’autre ; une mission réussie est remplacée.</div>';
  M.act.forEach(m => {
    const D = MDEF[m.id];
    h += '<div class="row ms-row"><div class="info"><div class="nm">' + mTxt(m.id) + '</div>' + msBar(m.n, D.goal)
      + '<div class="ds">' + msN(m.n) + ' / ' + msN(D.goal) + '</div></div><div class="ms-rew">+' + fmtS(D.rew) + '</div></div>';
  });
  h += '<h3>Succès</h3>';
  ACH.forEach(a => {
    if (!achShown(a)) return;
    const t = Math.min(A[a.id] || 0, a.tiers.length), all = t >= a.tiers.length, v = msVal(a.stat);
    if (a.secret && !t){
      h += '<div class="row ms-row ms-secret"><div class="info"><div class="nm">???</div><div class="ds">Succès secret</div></div><div class="ms-rew">?</div></div>';
      return;
    }
    const nx = all ? a.tiers[a.tiers.length - 1] : a.tiers[t];
    const pal = a.tiers.length > 1 ? ' <span class="ms-tier">' + (t ? MS_TIER[t - 1] : 'Aucun palier') + '</span>' : '';
    let ds = a.desc(nx[0]);
    if (!all && nx[0] > 1) ds += ' · ' + msN(Math.min(v, nx[0])) + ' / ' + msN(nx[0]);
    h += '<div class="row ms-row' + (all ? ' ms-got' : '') + '"><div class="info"><div class="nm">' + (all ? '✓ ' : '') + a.name + pal + '</div>'
      + '<div class="ds">' + ds + '</div>' + (!all && nx[0] > 1 ? msBar(v, nx[0]) : '') + '</div>'
      + '<div class="ms-rew">' + (all ? 'Obtenu' : '+' + fmtS(nx[1])) + '</div></div>';
  });
  const el = $('msBody'); if (el) el.innerHTML = h;
  msLabels();
}
function openSucces(from){ msBack = from || 'scrTitle'; renderSucces(); showScreen('scrSucces'); }
try {
  const _b = showScreen;
  showScreen = function(id){
    const r = _b.apply(this, arguments);
    const el = $('scrSucces'); if (el) el.classList.toggle('hide', id !== 'scrSucces');
    if (id === 'scrTitle' || id === 'scrMap') msLabels();
    return r;
  };
} catch (e) { errNote(e); }
(function(){
  const on = (id, f) => { const el = $(id); if (el && el.addEventListener) el.addEventListener('click', f); };
  on('btnSuccesTitle', () => { if (typeof Snd === 'object') Snd.init(); openSucces('scrTitle'); });
  on('btnSuccesMap', () => openSucces('scrMap'));
  on('btnSuccesBack', () => { if (msBack === 'scrMap') renderMap(); showScreen(msBack); });
})();

// Ancienne sauvegarde qui remplit déjà une condition (record de combo, série du défi, villes) : succès donnés tout de suite
msNorm(); achCheckAll(); msLabels();

// Accès pour les tests automatiques
window.__missions = { ACH, MDEF, MIDS, MSX, msNorm, msVal, achCheck, achCheckAll, achTotal, achGot, msAdd, msMax, mEv, mTxt, mNew, msEnd, msEndHTML, renderSucces, openSucces, msLabels, msInfOn,
  setMissions(ids){ const M = MSM(); M.act = ids.slice(0, 3).map(id => ({ id, n:0 })); while (M.act.length < 3) M.act.push(mNew()); return M.act; } };
