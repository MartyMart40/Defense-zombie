'use strict';
/* ================= Défi du jour ================= */
// Chaque jour (date locale de l'appareil), un défi tiré d'un générateur à graine (la date) : le même pour tout le monde.
// Seul le choix des règles est tiré à la graine : ville (décor seulement), nombre de vagues, 2 modificateurs.
// Les apparitions de zombies restent au hasard normal du jeu.
// Une partie de défi joue sur une COPIE de la ville (curLoc = copie avec defi:true, difficulté fixe) :
// elle ne touche jamais P.wins, P.unlocked, P.best ni P.last (sauvés avant, remis après victory / gameOver).
// Les modificateurs ne s'appliquent que si DEFI.run est actif et pas terminé : rien ne fuit dans une partie normale.
// Crochets par réaffectation (comme 19-boss.js) : wavePlan, newGame, startLocation, startWave, startReload, renderShop,
// victory, gameOver, showEnd, showScreen, goMap, banner, updateHUD, defUpdate, defHUD, ambPick.
// Sauvegarde : P.defi = { done, streak, record, wins, today:{ key, waves, won } } (valeurs par défaut au chargement).

const DEFI_LOC = { diff:1.25, off:1, xp:1.5 }; // même difficulté quelle que soit la ville du décor
const DEFI_CASH = 600;          // argent de départ (+ talent Bas de laine)
const DEFI_SCRAP = 150;         // ferraille de la prime, par vague du défi
const DEFI_XP = .3, DEFI_XP_MIN = 150; // XP de la prime, par vague : 30 % du niveau en cours, au moins 150
const DEFI_REPLAY = .1;         // rejouer un défi déjà réussi : 10 % de la ferraille, pas d'XP en prime
const DEFI_STREAK_STEP = .25, DEFI_STREAK_MAX = 3; // série : +25 % par jour d'affilée, jusqu'à ×3

// Modificateurs : grp = un seul par groupe ; no = incompatibles en plus
const DEFI_MODS = {
  sniper:     { name:'Sniper seulement', desc:'Tu commences avec le sniper. Aucune autre arme, rien d’autre à la boutique.', grp:'arme', weapon:'sniper', no:['horde', 'brouillard'] },
  shotgun:    { name:'Fusil à pompe seulement', desc:'Tu commences avec le fusil à pompe. Aucune autre arme, rien d’autre à la boutique.', grp:'arme', weapon:'shotgun' },
  rapides:    { name:'Zombies enragés', desc:'Les zombies avancent 40 % plus vite.', grp:'vitesse', spd:1.4 },
  horde:      { name:'Horde agile', desc:'La moitié des marcheurs sont remplacés par des coureurs et des sauteurs.', grp:'vitesse' },
  sansRep:    { name:'Pas de réparation', desc:'Impossible de réparer la barricade. La renforcer ajoute de la solidité, sans la réparer.', grp:'barricade' },
  fragile:    { name:'Barricade fragile', desc:'La barricade n’a que la moitié de sa solidité.', grp:'barricade' },
  richesse:   { name:'Prime de risque', desc:'Argent ×2, mais les zombies ont 50 % plus de vie.', cash:2, hp:1.5 },
  munitions:  { name:'Munitions comptées', desc:'Chaque recharge prend 70 % plus de temps.', reload:1.7 },
  nuit:       { name:'Nuit noire', desc:'Toutes les vagues se jouent en pleine nuit.', grp:'meteo', weather:'nuit' },
  brouillard: { name:'Brouillard épais', desc:'Un brouillard épais couvre la rue à chaque vague.', grp:'meteo', weather:'brouillard' },
  sansDef:    { name:'Atelier en panne', desc:'Tes défenses automatiques ne tirent pas pendant ce défi.' },
  bossTot:    { name:'Boss pressé', desc:'Un boss arrive dès la vague 3.' }
};
const DEFI_IDS = Object.keys(DEFI_MODS);
// La météo forcée demande 22-ambiance.js (ambPick) ; sinon ces modificateurs ne sont jamais tirés
const defiAvail = id => !DEFI_MODS[id].weather || (typeof ambPick === 'function' && typeof WEATHERS === 'object' && !!WEATHERS[DEFI_MODS[id].weather]);

/* ---------- Dates (date locale de l'appareil) ---------- */
const DEFI = { now:null, run:null, starting:false, back:'scrTitle', last:null };
const pad2 = n => (n < 10 ? '0' : '') + n;
function defiKeyOf(d){ return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function defiToday(){ return defiKeyOf(DEFI.now ? new Date(DEFI.now) : new Date()); }
function defiParse(k){ const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(k || '')); return m ? [+m[1], +m[2], +m[3]] : null; }
// Numéro du jour (calcul en UTC à partir de la clé : pas de surprise avec l'heure d'été)
function defiDayNum(k){ const p = defiParse(k); return p ? Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / 864e5) : NaN; }
function defiKeyAdd(k, n){
  const p = defiParse(k); if (!p) return k;
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
}
function defiDateTxt(k){
  const p = defiParse(k); if (!p) return k;
  try { const t = new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('fr-CA', { weekday:'long', day:'numeric', month:'long', year:'numeric' }); if (t) return t.charAt(0).toUpperCase() + t.slice(1); } catch (e) { errNote(e); }
  return k;
}

/* ---------- Générateur à graine ---------- */
function defiHash(s){ let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function defiRng(seed){ // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function defiCompat(id, list){
  const M = DEFI_MODS[id]; if (!M || list.indexOf(id) >= 0) return false;
  return list.every(o => { const N = DEFI_MODS[o];
    if (M.grp && M.grp === N.grp) return false;
    if ((M.no || []).indexOf(o) >= 0 || (N.no || []).indexOf(id) >= 0) return false;
    return true; });
}
const defiSig = d => d.loc + '/' + d.waves + '/' + d.mods.join('+');
function defiRaw(key, salt){
  const r = defiRng(defiHash('dernier-toit|defi|' + key + '|' + (salt || 0)));
  const loc = Math.floor(r() * LOCS.length), waves = 3 + Math.floor(r() * 3);
  const ids = DEFI_IDS.filter(defiAvail), mods = [];
  for (let g = 0; mods.length < 2 && g < 60; g++){ const id = ids[Math.floor(r() * ids.length)]; if (defiCompat(id, mods)) mods.push(id); }
  mods.sort((a, b) => DEFI_IDS.indexOf(a) - DEFI_IDS.indexOf(b));
  return { key, loc, waves, mods };
}
// Le défi du jour : jamais identique à celui de la veille
function defiOfDay(key){
  key = key || defiToday();
  const prev = defiSig(defiRaw(defiKeyAdd(key, -1), 0));
  let d = defiRaw(key, 0);
  for (let s = 1; defiSig(d) === prev && s < 12; s++) d = defiRaw(key, s);
  return d;
}

/* ---------- Sauvegarde ---------- */
function defiNorm(){
  const o = P.defi && typeof P.defi === 'object' ? P.defi : {};
  const n = v => (+v > 0 && isFinite(+v) ? Math.floor(+v) : 0);
  const t = o.today && typeof o.today === 'object' && defiParse(o.today.key) ? { key:o.today.key, waves:n(o.today.waves), won:!!o.today.won } : null;
  P.defi = { done: defiParse(o.done) ? o.done : '', streak:n(o.streak), record:n(o.record), wins:n(o.wins), today:t };
  return P.defi;
}
defiNorm();
function DP(){ return P.defi && typeof P.defi === 'object' && 'streak' in P.defi ? P.defi : defiNorm(); }
// Série en cours vue le jour "key" : gardée si le dernier défi réussi date d'aujourd'hui ou d'hier
function defiStreakNow(key){
  const D = DP(); key = key || defiToday();
  if (!D.done || !D.streak) return 0;
  const g = defiDayNum(key) - defiDayNum(D.done);
  return g === 0 || g === 1 ? D.streak : 0;
}
const defiMult = streak => Math.min(DEFI_STREAK_MAX, 1 + DEFI_STREAK_STEP * Math.max(0, streak - 1));
// Prime d'une réussite le jour "key" (sans la verser)
function defiPrize(key, waves, lvl){
  const D = DP(), first = D.done !== key;
  const streak = first ? defiStreakNow(key) + 1 : D.streak, mult = first ? defiMult(streak) : 1;
  const scrap = Math.round(DEFI_SCRAP * waves * mult * (first ? 1 : DEFI_REPLAY));
  const xp = first ? Math.round(Math.max(DEFI_XP_MIN, xpNeed(lvl || P.level || 1) * DEFI_XP) * waves * mult) : 0;
  return { first, streak, mult, scrap, xp };
}
function defiTodayRec(key){ const D = DP(); return D.today && D.today.key === key ? D.today : null; }
function defiRecord(key, waves, won){
  const D = DP(); let t = defiTodayRec(key);
  if (!t){ t = { key, waves:0, won:false }; D.today = t; }
  t.waves = Math.max(t.waves, waves); t.won = t.won || !!won;
}
// Réussite : prime pleine la première fois du jour, petite prime ensuite. Retourne ce qui a été versé.
function defiWin(key, waves, lvl){
  const D = DP(), p = defiPrize(key, waves, lvl);
  if (p.first){ D.done = key; D.streak = p.streak; D.record = Math.max(D.record, p.streak); D.wins++; }
  P.scrap = (+P.scrap || 0) + p.scrap;
  defiRecord(key, waves, true);
  saveP();
  if (p.xp) addXP(p.xp);
  return p;
}

/* ---------- État de la partie de défi ---------- */
const defiActive = () => !!(DEFI.run && !DEFI.run.over && curLoc && curLoc.defi);
const defiMod = id => defiActive() && DEFI.run.mods.indexOf(id) >= 0;
const defiWeapon = () => { if (!defiActive()) return null; for (const id of DEFI.run.mods) if (DEFI_MODS[id].weapon) return DEFI_MODS[id].weapon; return null; };
function defiLoc(d){
  return Object.assign({}, LOCS[d.loc], DEFI_LOC, { waves:d.waves, cash:DEFI_CASH, defi:true, baseIdx:d.loc });
}
// Quitte le mode défi (partie normale, carte) : plus aucun modificateur, la vraie ville revient
function defiLeave(){
  DEFI.run = null;
  if (curLoc && curLoc.defi) curLoc = LOCS[curLoc.baseIdx] || LOCS[0];
}
const _defiStartLocation = startLocation;
// d facultatif (tests) : { loc, waves, mods }. Sinon le défi d'aujourd'hui.
function defiStart(d){
  const key = defiToday();
  d = d ? Object.assign({ key, loc:0, waves:3, mods:[] }, d) : defiOfDay(key);
  d.mods = (d.mods || []).filter(id => DEFI_MODS[id]);
  const i = clamp(d.loc | 0, 0, LOCS.length - 1), L = defiLoc(Object.assign({}, d, { loc:i }));
  DEFI.run = { key:d.key || key, def:d, mods:d.mods.slice(), over:false, won:false, prize:null, maxSeen:null, barSeen:null, lvl:P.level || 1 }; // XP de la prime fixée au départ
  DEFI.last = null;
  const snap = defiSnap(), orig = LOCS[i];
  LOCS[i] = L; DEFI.starting = true; // startLocation(i) prend la copie : curLoc = L
  try { _defiStartLocation(i); }
  finally { LOCS[i] = orig; DEFI.starting = false; defiRestore(snap); }
  return DEFI.run;
}
// Champs de campagne mis de côté et remis tels quels (un défi ne compte pas dans la campagne)
function defiSnap(){ return { best:JSON.stringify(P.best || {}), wins:JSON.stringify(P.wins || {}), unlocked:P.unlocked, last:P.last }; }
function defiRestore(s){ P.best = JSON.parse(s.best); P.wins = JSON.parse(s.wins); P.unlocked = s.unlocked; P.last = s.last; saveP(); }

/* ---------- Modificateurs ---------- */
// Vagues : vitesse, résistance, argent, horde, boss tôt. Seulement pour la ville du défi en cours.
const _defiWavePlan = wavePlan;
wavePlan = function(w, L){
  const p = _defiWavePlan.apply(this, arguments);
  if (!defiActive() || (L && L !== curLoc)) return p;
  try {
    DEFI.run.mods.forEach(id => {
      const M = DEFI_MODS[id];
      if (M.spd) p.spdMult *= M.spd;
      if (M.hp) p.hpMult *= M.hp;
      if (M.cash) p.cashMult *= M.cash;
    });
    if (defiMod('horde')){
      let k = 0;
      for (let j = 0; j < p.queue.length; j++) if (p.queue[j] === 'walker' && (k++ % 2 === 0)) p.queue[j] = Math.random() < .55 ? 'runner' : 'jumper';
    }
    if (defiMod('bossTot') && w === 3 && p.queue.indexOf('boss') < 0 && typeof bossReady === 'function' && bossReady()){
      p.queue.splice(Math.round(p.queue.length * .4), 0, 'boss');
      p.total = p.queue.length; p.boss = typeof bossVariant === 'function' ? bossVariant(w, curLoc).name : 'Boss';
    }
  } catch (e) { errNote(e); }
  return p;
};
// Nouvelle partie : arme imposée, barricade fragile
const _defiNewGame = newGame;
newGame = function(){
  const r = _defiNewGame.apply(this, arguments);
  if (!defiActive() || !S) return r;
  const w = defiWeapon();
  if (w && WEAPONS[w]){ S.owned = {}; S.owned[w] = true; S.ammo = {}; equip(w); refillAll(); }
  if (defiMod('fragile')){ S.barMax = S.bar = Math.round(barMaxCalc() * .5); }
  return r;
};
// Recharges plus lentes
const _defiStartReload = startReload;
startReload = function(){
  const before = reloadT, r = _defiStartReload.apply(this, arguments);
  if (defiMod('munitions') && before <= 0 && reloadT > 0){ reloadT *= DEFI_MODS.munitions.reload; reloadDur = reloadT; }
  return r;
};
// Défenses de l'atelier en panne
if (typeof defUpdate === 'function'){
  const _defiDefUpdate = defUpdate;
  defUpdate = function(){ if (defiMod('sansDef')) return; return _defiDefUpdate.apply(this, arguments); };
}
if (typeof defHUD === 'function'){
  const _defiDefHUD = defHUD;
  defHUD = function(){ const r = _defiDefHUD.apply(this, arguments); if (defiMod('sansDef') && $('nukeH') && !$('nukeH').classList.contains('hide')) setTxt('nukeH', '☢ En panne'); return r; };
}
// Météo forcée à chaque vague
if (typeof ambPick === 'function'){
  const _defiAmbPick = ambPick;
  ambPick = function(){
    if (defiActive()) for (const id of DEFI.run.mods){ const wx = DEFI_MODS[id].weather; if (wx && typeof WEATHERS === 'object' && WEATHERS[wx]) return wx; }
    return _defiAmbPick.apply(this, arguments);
  };
}

/* ---------- Boutique pendant un défi ---------- */
function defiBarFix(){
  const R = DEFI.run; if (!S || !R) return;
  if (defiMod('fragile')){ S.barMax = Math.round(barMaxCalc() * .5); }
  if (defiMod('sansRep') && R.maxSeen != null && S.bar > R.barSeen) S.bar = Math.min(S.barMax, R.barSeen + Math.max(0, S.barMax - R.maxSeen));
  S.bar = Math.min(S.bar, S.barMax);
  R.barSeen = S.bar; R.maxSeen = S.barMax;
}
function defiShopWeapons(w){
  const W = WEAPONS[w], on = S.cur === w, i = WORDER.indexOf(w);
  const b = on ? '<button disabled>En main</button>' : '<button data-act="equip" data-id="' + w + '">Prendre en main</button>';
  $('shopWeapons').innerHTML = '<div class="card' + (on ? ' on' : '') + '"><div class="cname">' + W.name + (isTouch ? '' : ' <span class="wkey">' + (i + 1) + '</span>') + '</div><div class="cdesc">' + W.desc + ' Seule arme permise pendant ce défi.</div>' + b + '</div>';
}
function defiShopWall(){
  const U = UPG.wall, l = S.upg.wall, max = l >= U.max, c = max ? 0 : U.cost(l), add = defiMod('fragile') ? 50 : 100;
  $('shopWall').innerHTML =
    '<div class="row"><div class="info"><div class="nm">Réparer</div><div class="ds">Solidité : ' + Math.ceil(S.bar) + ' / ' + S.barMax + '. Interdit pendant ce défi.</div></div><button disabled>Interdit</button></div>' +
    '<div class="row"><div class="info"><div class="nm">' + U.name + pips(l, U.max) + '</div><div class="ds">+' + add + ' de solidité, sans réparation.</div></div><button data-act="upg" data-id="wall"' + (max || S.money < c ? ' disabled' : '') + '>' + (max ? 'Max' : fmt(c)) + '</button></div>';
}
const defiModNames = mods => mods.map(id => DEFI_MODS[id].name).join(', ');
const _defiRenderShop = renderShop;
renderShop = function(){
  const on = defiActive();
  if (on) defiBarFix();
  const r = _defiRenderShop.apply(this, arguments);
  if (!on) return r;
  try {
    const w = defiWeapon(); if (w) defiShopWeapons(w);
    if (defiMod('sansRep')) defiShopWall();
    if (S.wave === 0) $('shopTitle').textContent = 'Défi du jour';
    $('shopStats').innerHTML += '<span class="defi-tag">Défi : <strong>' + defiModNames(DEFI.run.mods) + '</strong></span>';
  } catch (e) { errNote(e); }
  return r;
};

/* ---------- Pendant les vagues ---------- */
const _defiStartWave = startWave;
startWave = function(){
  const r = _defiStartWave.apply(this, arguments);
  if (defiActive() && S && S.wave === 1) setTimeout(() => { if (defiActive()) toast('Défi : ' + defiModNames(DEFI.run.mods)); }, 2100);
  return r;
};
const _defiBanner = banner;
banner = function(t){
  if (defiActive() && curLoc && t === curLoc.name + ' libérée !'){ const a = Array.prototype.slice.call(arguments); a[0] = 'Défi réussi !'; return _defiBanner.apply(this, a); }
  return _defiBanner.apply(this, arguments);
};
const _defiUpdateHUD = updateHUD;
updateHUD = function(){
  const r = _defiUpdateHUD.apply(this, arguments);
  if (curLoc && curLoc.defi) setTxt('locName', 'Défi du jour · ' + curLoc.name);
  return r;
};

/* ---------- Fin de partie ---------- */
const _defiVictory = victory;
victory = function(){
  if (!defiActive()) return _defiVictory.apply(this, arguments);
  const R = DEFI.run; R.over = true; R.won = true;
  R.prize = defiWin(R.key, R.def.waves, R.lvl);
  const snap = defiSnap();
  try { return _defiVictory.apply(this, arguments); } finally { defiRestore(snap); defiLabels(); }
};
const _defiGameOver = gameOver;
gameOver = function(){
  if (!defiActive()) return _defiGameOver.apply(this, arguments);
  const R = DEFI.run; R.over = true; R.won = false;
  defiRecord(R.key, Math.max(0, (S ? S.wave : 1) - 1), false); saveP();
  const snap = defiSnap();
  try { return _defiGameOver.apply(this, arguments); } finally { defiRestore(snap); defiLabels(); }
};
const _defiShowEnd = showEnd;
showEnd = function(won){
  const r = _defiShowEnd.apply(this, arguments);
  const R = DEFI.run;
  if (!R || !curLoc || !curLoc.defi) return r;
  try {
    const p = R.prize, streak = defiStreakNow(R.key), sJ = n => n + ' jour' + (n > 1 ? 's' : '');
    $('overTitle').textContent = won ? 'Défi réussi !' : 'Défi échoué';
    let st = '';
    if (won && p) st += '<span>Prime du défi : <strong>+' + fmtScrap(p.scrap) + (p.xp ? ' et +' + p.xp.toLocaleString('fr-CA') + ' XP' : '') + '</strong></span>';
    st += '<span>Série : <strong>' + sJ(streak) + '</strong></span>';
    $('overStats').innerHTML += st;
    const t = defiTodayRec(R.key);
    let msg;
    if (won && p && p.first) msg = 'Prime du jour gagnée' + (p.mult > 1 ? ' (série ×' + String(p.mult).replace('.', ',') + ')' : '') + ' ! Reviens demain pour un nouveau défi et allonger ta série.';
    else if (won) msg = 'Défi déjà réussi aujourd’hui : petite prime seulement. Un nouveau défi t’attend demain.';
    else msg = 'Meilleur résultat aujourd’hui : ' + (t && t.won ? 'réussi' : (t ? t.waves : 0) + ' / ' + R.def.waves + ' vagues') + '. Tu peux réessayer autant que tu veux.';
    msg += ' Un défi ne compte pas dans la campagne.';
    const old = $('overBest').textContent;
    $('overBest').textContent = msg + (old ? ' ' + old : '');
    againNext = false;
    $('btnAgain').textContent = won ? 'Rejouer le défi' : 'Réessayer le défi';
  } catch (e) { errNote(e); }
  return r;
};
// « Rejouer » de l'écran de fin : startLocation(LOCS.indexOf(copie)) = startLocation(-1)
startLocation = function(i){
  if (i === -1 && curLoc && curLoc.defi) return defiStart();
  if (!DEFI.starting) defiLeave();
  return _defiStartLocation.apply(this, arguments);
};
const _defiGoMap = goMap;
goMap = function(){ defiLeave(); return _defiGoMap.apply(this, arguments); };
const fmtScrap = n => (typeof fmtS === 'function' ? fmtS(n) : Math.floor(n).toLocaleString('fr-CA') + ' ⚙');

/* ---------- Écran du défi ---------- */
const _defiShowScreen = showScreen;
showScreen = function(id){
  const r = _defiShowScreen.apply(this, arguments);
  const el = $('scrDefi'); if (el) el.classList.toggle('hide', id !== 'scrDefi');
  // Titre ou carte : on sort du mode défi (le bouton de la carte appelle l'ancien goMap, sans nos crochets)
  if (id === 'scrTitle' || id === 'scrMap'){ defiLeave(); defiLabels(); }
  return r;
};
function defiLabels(){
  const key = defiToday(), done = DP().done === key, s = defiStreakNow(key);
  const t = 'Défi du jour' + (done ? ' ✓' : '') + (s > 0 ? ' · série ' + s : '');
  ['btnDefiTitle', 'btnDefiMap'].forEach(id => { const el = $(id); if (el) el.textContent = t; });
}
function defiRender(){
  const key = defiToday(), d = defiOfDay(key), L = LOCS[d.loc], D = DP();
  const done = D.done === key, streak = defiStreakNow(key), p = defiPrize(key, d.waves), t = defiTodayRec(key);
  const unlocked = d.loc < (P.unlocked || 1);
  const sJ = n => n + ' jour' + (n > 1 ? 's' : '');
  $('defiDate').textContent = defiDateTxt(key);
  let h = '<div class="loc defi-city"><div class="sw" style="background:linear-gradient(' + L.sky[1] + ',' + L.sky[3] + ' 60%,' + L.sky[5] + ')"></div>'
    + '<div class="info"><div class="nm">' + L.name + '</div><div class="ds">' + L.kind + ' · ' + d.waves + ' vagues à tenir'
    + (unlocked ? '' : ' · ville pas encore libérée, ouverte pour le défi') + '</div><div class="ds">Décor seulement : la difficulté est la même pour toutes les villes.</div></div></div>';
  h += '<h3>Règles du jour</h3><ul class="defi-mods">';
  d.mods.forEach(id => { const M = DEFI_MODS[id]; h += '<li><b>' + M.name + '</b><span>' + M.desc + '</span></li>'; });
  h += '</ul><div class="defi-info">';
  h += '<b>Aujourd’hui</b><span' + (t && t.won ? ' class="defi-done"' : '') + '>' + (t ? (t.won ? 'Réussi ✓' : 'Meilleur résultat : ' + t.waves + ' / ' + d.waves + ' vagues') : 'Pas encore tenté') + '</span>';
  h += '<b>Récompense</b><span>' + (done
    ? 'Prime déjà gagnée aujourd’hui. Rejouer rapporte ' + fmtScrap(p.scrap) + '.'
    : fmtScrap(p.scrap) + ' et ' + p.xp.toLocaleString('fr-CA') + ' XP la première fois que tu le réussis aujourd’hui' + (p.mult > 1 ? ' (série ×' + String(p.mult).replace('.', ',') + ')' : '') + '.') + '</span>';
  h += '<b>Série</b><span>' + (streak ? sJ(streak) + (done ? '' : ' : réussis aujourd’hui pour la continuer') : (D.streak && D.done ? 'aucune (série de ' + sJ(D.streak) + ' cassée)' : 'aucune pour l’instant')) + (D.record > 1 ? ' · record : ' + sJ(D.record) : '') + '</span>';
  h += '</div><div class="ds defi-note">Chaque jour un nouveau défi, le même pour tout le monde. Il ne débloque pas de ville et ne compte pas dans la campagne. Chaque jour réussi d’affilée augmente la prime de 25 % (jusqu’à ×3).</div>';
  $('defiBody').innerHTML = h;
  $('btnDefiGo').textContent = done ? 'Rejouer le défi' : (t ? 'Réessayer le défi' : 'Relever le défi');
}
function defiOpen(from){ DEFI.back = from || 'scrTitle'; defiRender(); showScreen('scrDefi'); }
(function(){
  const on = (id, f) => { const el = $(id); if (el && el.addEventListener) el.addEventListener('click', f); };
  on('btnDefiTitle', () => { if (typeof Snd === 'object') Snd.init(); defiOpen('scrTitle'); });
  on('btnDefiMap', () => defiOpen('scrMap'));
  on('btnDefiGo', () => { if (typeof Snd === 'object') Snd.init(); defiStart(); });
  on('btnDefiBack', () => { if (DEFI.back === 'scrMap') renderMap(); defiLabels(); showScreen(DEFI.back); });
  defiLabels();
})();

// Accès pour les tests automatiques
window.__defi = { DEFI, DEFI_MODS, DEFI_IDS, DEFI_LOC, DEFI_SCRAP, defiOfDay, defiRaw, defiSig, defiCompat, defiToday, defiKeyOf, defiKeyAdd, defiDayNum,
  defiStreakNow, defiPrize, defiWin, defiStart, defiLeave, defiNorm, defiOpen, defiRender, defiLabels,
  setNow(d){ DEFI.now = d == null ? null : +new Date(d); }, get run(){ return DEFI.run; }, get active(){ return defiActive(); }, mod: defiMod };
