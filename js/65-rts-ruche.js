'use strict';
/* ================= RTS : la Ruche, les vallées et les sièges (tâche 101) ================= */
// 1. Un but : détruire RTS_REGL.ruche.nids nids fait sortir la Ruche (le nid mère) au fond de la vallée. Elle pond des
//    zombies tant qu'elle vit, elle a une garde (une horde et un boss qui restent autour d'elle, des renforts quand on
//    l'attaque). Détruite : « Vallée libérée ! », ferraille, vallée suivante débloquée ; ou « Continuer sans fin ».
//    La Ruche est rangée dans RTS.nests avec n.ruche = true : les tirs, les explosions, les ordres d'attaque et le
//    pilotage la traitent comme un nid ; rtsNestsAlive, rtsNestsDead et rtsFront (js/42-rts-unites.js) l'ignorent.
// 2. Les vallées : P.rtsVallee (la plus haute débloquée, 1 par défaut), P.rtsLib (la plus haute libérée, 0 par défaut).
//    Chaque vallée part avec plus de menace, monte plus vite, a des nids et une Ruche plus solides (RTS_REGL.vallee).
//    Un petit choix sous le bouton du RTS, sur l'écran titre, permet de rejouer une vallée déjà libérée.
// 3. Les sièges : toutes les RTS_REGL.siege.tous hordes (avec le boss), annoncés 10 s d'avance (bandeau, son, pastille sur
//    la mini-carte), une grosse horde d'un seul côté puis un flot fort pendant 40 s, puis un creux (ponte des nids réduite).
//    Entre les sièges, la ponte et les hordes sont un peu plus légères.
// Tous les chiffres : RTS_REGL (js/41-rts.js).

/* ---------- Vallées ---------- */
const RTS_VAL = { choix:null };
const rtsValleeMax = () => Math.max(1, Math.floor(+P.rtsVallee || 1));
const rtsValleeLib = () => Math.max(0, Math.floor(+P.rtsLib || 0));
// Vallée d'une nouvelle partie (ou celle de la sauvegarde ; une vieille sauvegarde sans le champ : vallée 1)
function rtsValleeDepart(save){
  if (save) return Math.max(1, Math.floor(+save.vallee || 1));
  const v = RTS_VAL.choix == null ? rtsValleeMax() : RTS_VAL.choix;
  return clamp(Math.floor(v), 1, rtsValleeMax());
}
// Petit choix sur l'écran titre, sous « Guerre des robots » : seulement quand au moins une vallée est libérée
function rtsValleeRow(){
  const ref = $('btnRts'); let row = $('rtValRow');
  if (!row && ref && ref.parentNode){
    row = document.createElement('div'); row.id = 'rtValRow'; row.className = 'hide';
    row.innerHTML = '<button type="button" id="rtValMoins" aria-label="Vallée précédente">◀</button><span id="rtValTxt"></span><button type="button" id="rtValPlus" aria-label="Vallée suivante">▶</button>';
    ref.parentNode.insertBefore(row, ref.nextSibling);
    $('rtValMoins').addEventListener('click', () => rtsValleeChoisir(-1));
    $('rtValPlus').addEventListener('click', () => rtsValleeChoisir(1));
  }
  if (!row) return null;
  const mx = rtsValleeMax(), v = rtsValleeDepart(null);
  row.classList.toggle('hide', mx <= 1);
  $('rtValTxt').textContent = '⛰ Vallée ' + v + (v <= rtsValleeLib() ? ' (libérée)' : ' (à libérer)');
  $('rtValMoins').disabled = v <= 1; $('rtValPlus').disabled = v >= mx;
  return row;
}
function rtsValleeChoisir(d){ RTS_VAL.choix = clamp(rtsValleeDepart(null) + d, 1, rtsValleeMax()); rtsValleeRow(); return RTS_VAL.choix; }

/* ---------- La Ruche : modèle ---------- */
// Un gros dôme de chair à étages, des pustules vertes qui luisent, des cornes en couronne et des tentacules au sol
function rtsRucheGeo(){
  return rtsGeo('ruche', b => {
    const flesh = 0x7a2e2e, dark = 0x4a1a22, bone = 0xc8b898, green = [1, 2.8, .4], vio = [1.6, .5, 2];
    vmCyl(b, 9, 2.2, 0x5a3a2a, 0, 1.1, 0, Math.PI / 2, 0, 0, 16, .9);                             // socle de terre retournée
    vmCyl(b, 7.5, 5, flesh, 0, 4.2, 0, Math.PI / 2, 0, 0, 14, .75);                                 // dôme à étages
    vmCyl(b, 5.4, 4, dark, 0, 8.4, 0, Math.PI / 2, 0, 0, 12, .6);
    vmCyl(b, 3.2, 3.4, flesh, 0, 11.8, 0, Math.PI / 2, 0, 0, 10, .45);
    vmCyl(b, 1.6, 2.2, vio, 0, 14.2, 0, Math.PI / 2, 0, 0, 8, .3);                                  // cœur violet au sommet
    for (let i = 0; i < 7; i++){ const a = i / 7 * 6.28; vmBox(b, .5, 4.2, .5, bone, Math.cos(a) * 2.2, 15.6, Math.sin(a) * 2.2, Math.sin(a) * .5, 0, -Math.cos(a) * .5, .1); } // couronne de cornes
    for (let i = 0; i < 14; i++){ const a = i / 14 * 6.28, r = i % 2 ? 6.6 : 5; vmBox(b, .9, .9, .9, green, Math.cos(a) * r, 3.4 + (i % 3) * 2.6, Math.sin(a) * r, 0, a, 0, .2); } // pustules
    for (let i = 0; i < 10; i++){ const a = i / 10 * 6.28 + .3; vmBox(b, .8, 1, 5, dark, Math.cos(a) * 9.6, .5, Math.sin(a) * 9.6, 0, -a + Math.PI / 2, 0, .2); } // tentacules
    for (let i = 0; i < 4; i++){ const a = i / 4 * 6.28 + .8; vmBox(b, 2.6, 2.4, .3, [2, .5, .2], Math.cos(a) * 7.4, 2.4, Math.sin(a) * 7.4, 0, -a + Math.PI / 2, 0, 0); } // bouches qui pondent
  });
}

/* ---------- La Ruche : apparition, vie, mort ---------- */
const rtsRucheV = () => Math.max(0, (RTS.vallee || 1) - 1);
function rtsRucheSpot(){
  const C = RTS_REGL.ruche, z = -(C.dist + 30 * rtsRucheV());
  rtsEnsureChunks(z - 30);
  let x = rtsRoadX(z) + rand(-10, 10);
  for (let k = 0; k < 12; k++){
    const m = rtsValleyX(z) - C.r - 6; x = clamp(x, -m, m);
    if (!RTS.nests.some(n => !n.dead && Math.hypot(n.x - x, n.z - z) < 26)) break;
    x += (k % 2 ? -1 : 1) * 14 * (k + 1);
  }
  return { x, z };
}
function rtsRucheSpawn(x, z, hp){
  const C = RTS_REGL.ruche, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); rtsRoot.add(g);
  const m = new THREE.Mesh(rtsRucheGeo(), rtsMat); g.add(m);
  const mx = Math.round(C.hp * (1 + RTS_REGL.vallee.rucheHp * rtsRucheV()));
  const o = { g, m, hpb:rtsHpBar(g, 21, 14), hp:mx, maxHp:mx, x, z, r:C.r, spawnT:4, gardeT:0, hitT:-99, lastHp:mx, dead:false, idx:20, pow:2, ruche:true };
  if (hp != null && isFinite(hp)) o.hp = clamp(+hp, 1, mx);
  o.lastHp = o.hp; rtsHpSet(o.hpb, o.hp / o.maxHp);
  m.userData.rtsNest = o; RTS.nests.push(o); RTS.ruche = o;
  return o;
}
// Garde : des zombies qui restent autour de la Ruche (z.rtsGarde, voir rtsZombies) ; cap : plafond de cet appel
function rtsRucheGarde(o, n, type, cap){
  const i0 = zombies.length;
  rtsSpawnAt(o.x, o.z + o.r + 4, n, 6, type, cap);
  const out = [];
  for (let i = i0; i < zombies.length; i++){
    const z = zombies[i]; if (z.dead) continue;
    const a = Math.random() * 6.283, d = o.r + rand(4, 16);
    z.rtsGarde = o; z.gx = o.x + Math.cos(a) * d; z.gz = o.z + Math.sin(a) * d; z.g.position.set(z.gx, z.g.position.y, z.gz); out.push(z);
  }
  return out;
}
// Le but, dit au joueur quand un nid tombe
function rtsRucheBut(nd){
  const N = RTS_REGL.ruche.nids;
  if (RTS.libre || RTS.gagne || RTS.ruche) return '';
  return nd >= N ? 'la Ruche sort de terre !' : (N - nd) + ' nid' + (N - nd > 1 ? 's' : '') + ' avant la Ruche';
}
// Assez de nids détruits : la Ruche sort au fond de la vallée, avec sa garde
function rtsRucheCheck(){
  if (!RTS.on || RTS.ruche || RTS.libre || RTS.gagne || rtsNestsDead() < RTS_REGL.ruche.nids) return null;
  const C = RTS_REGL.ruche, p = rtsRucheSpot(), o = rtsRucheSpawn(p.x, p.z);
  const cap = plan.maxAlive + (isTouch ? RTS_REGL.siege.extraCell : RTS_REGL.siege.extra);
  rtsRucheGarde(o, C.garde + 6 * rtsRucheV(), null, cap);
  const bt = RTS_BOSS[rtsRucheV() % RTS_BOSS.length]; if (ZTYPES[bt]) rtsRucheGarde(o, 1, bt);
  rtsV.set(o.x, 4, o.z); burst(rtsV, 'dust', 40, 12); if (typeof rueBoom === 'function') rueBoom(o.x, 3, o.z, 20);
  if (typeof Snd === 'object'){ if (Snd.boom) Snd.boom(2.4); if (Snd.groan) Snd.groan(); }
  setTimeout(() => { if (state === 'rts') banner('👑 La Ruche est sortie !', 'Au fond de la vallée, gardée par une horde et un boss. Détruis-la pour libérer la vallée (elle est sur la mini-carte).', 4200); }, 2700);
  return o;
}
function rtsRucheStep(dt){
  if (!RTS.ruche && !RTS.libre && !RTS.gagne && rtsNestsDead() >= RTS_REGL.ruche.nids) rtsRucheCheck(); // vieille sauvegarde déjà au-delà du but
  const o = RTS.ruche; if (!o || o.dead) return;
  const C = RTS_REGL.ruche;
  o.m.scale.setScalar(1 + Math.sin(RTS.t * 1.7) * .025); o.m.rotation.y += dt * .05;
  if (o.hp < o.lastHp - .01) o.hitT = RTS.t; o.lastHp = o.hp;
  // Elle pond : des zombies qui partent vers la base
  o.spawnT -= dt;
  if (o.spawnT <= 0){ o.spawnT = C.ponte; const a = Math.atan2(-o.z, -o.x); rtsSpawnAt(o.x + Math.cos(a) * (o.r + 3), o.z + Math.sin(a) * (o.r + 3), C.ponteN + Math.floor(RTS.threat * C.ponteK), 5); }
  // Attaquée : elle appelle des renforts autour d'elle
  o.gardeT -= dt;
  if (RTS.t - o.hitT < 4 && o.gardeT <= 0){ o.gardeT = C.gardeT; rtsRucheGarde(o, C.gardeN + 2 * rtsRucheV(), null, plan.maxAlive + (isTouch ? RTS_REGL.siege.extraCell : RTS_REGL.siege.extra)); }
}
function rtsRucheLoad(d){
  const s = d && d.ruche;
  if (!s || !isFinite(s.x) || !isFinite(s.z) || RTS.libre) return null;
  rtsEnsureChunks(+s.z - 30);
  const o = rtsRucheSpawn(+s.x, +s.z, +s.hp); if (isFinite(s.st)) o.spawnT = +s.st;
  rtsRucheGarde(o, Math.ceil((RTS_REGL.ruche.garde + 6 * rtsRucheV()) / 2), null); // une garde (les zombies ne sont pas gardés)
  return o;
}
// La Ruche tombe : victoire
function rtsRucheDie(o){
  if (o.dead) return; o.dead = true;
  rtsV.set(o.x, 6, o.z);
  if (typeof rueBoom === 'function'){ rueBoom(o.x, 5, o.z, 40); rueBoom(o.x, 12, o.z, 26); }
  burst(rtsV, 'dust', 50, 14); burst(rtsV, 'blood', 40, 10); shake = Math.max(shake, 1);
  if (typeof Snd === 'object' && Snd.boom) Snd.boom(3);
  o.g.scale.y = .2; o.g.position.y = -1; o.hpb.bg.visible = o.hpb.fg.visible = false;
  for (const z of zombies) if (z.rtsGarde === o) z.rtsGarde = null; // la garde se disperse
  if (RTS.gagne || RTS.libre) return;
  const C = RTS_REGL.ruche, v = RTS.vallee || 1, fer = C.ferraille + C.ferrailleV * (v - 1);
  RTS.gagne = true; RTS.gagneT = RTS.t;
  S.money += C.argent; P.scrap = (P.scrap || 0) + fer; addXP(200 + 100 * (v - 1));
  const neuve = v > rtsValleeLib();
  P.rtsLib = Math.max(rtsValleeLib(), v); P.rtsVallee = Math.max(rtsValleeMax(), v + 1);
  if (typeof saveP === 'function') saveP();
  RTS.victoire = { v, fer, neuve, t:RTS.t, nids:rtsNestsDead(), tues:RTS.kills, pertes:RTS.lost };
  banner('👑 La Ruche est détruite !', 'Vallée ' + v + ' libérée', 2600);
  setTimeout(rtsVictoire, 1800);
}
function rtsVictoire(){
  const W = RTS.victoire; if (!W || state !== 'rts' || !RTS.on) return false;
  rtsUnpilot(); rtsCancelPlace(); RTS.paused = true; if (typeof unlockPointer === 'function') unlockPointer();
  const min = Math.floor(W.t / 60), sec = Math.floor(W.t % 60);
  rtsShowPanel('<h2 class="title sm">Vallée libérée !</h2><p class="lead">La Ruche de la vallée ' + W.v + ' est détruite.' + (W.neuve ? ' La vallée ' + (W.v + 1) + ' est débloquée.' : '') + '</p><div class="stats">'
    + '<span>Temps : <strong>' + min + ' min ' + String(sec).padStart(2, '0') + ' s</strong></span>'
    + '<span>Nids détruits : <strong>' + W.nids + '</strong> · Zombies abattus : <strong>' + fmtN(W.tues) + '</strong></span>'
    + '<span>Unités perdues : <strong>' + W.pertes + '</strong></span>'
    + '<span>Récompense : <strong>+' + fmtN(W.fer) + ' ⚙</strong> de ferraille et <strong>+' + fmt(RTS_REGL.ruche.argent) + '</strong></span></div>',
    [['Vallée suivante', rtsValleeSuivante], ['Continuer sans fin', rtsSansFin]]);
  return true;
}
function rtsValleeSuivante(){
  const v = (RTS.vallee || 1) + 1;
  if (typeof rtsSaveClear === 'function') rtsSaveClear();
  RTS_VAL.choix = Math.min(v, rtsValleeMax());
  rtsStart();
  return RTS.vallee;
}
function rtsSansFin(){
  RTS.libre = true; RTS.paused = false; rtsPanel.classList.add('hide');
  banner('Sans fin', 'La vallée est libre, mais ils viennent encore : jusqu’où tiendras-tu ?', 2600);
  if (typeof rtsSave === 'function') rtsSave();
  return true;
}
// Compteur du haut de l'écran (js/44-rts-interface.js)
function rtsRucheHUD(){
  const v = RTS.vallee || 1, nd = rtsNestsDead(), N = RTS_REGL.ruche.nids, o = RTS.ruche;
  const court = isTouch && innerWidth < 600; // cell debout : texte court
  if (RTS.libre || RTS.gagne) return '⛰ V' + v + ' libérée · 🏚 ' + nd + (court ? '' : ' nids');
  if (o && !o.dead) return '⛰ V' + v + ' · 👑 Ruche ' + Math.ceil(100 * o.hp / o.maxHp) + ' %';
  return '⛰ V' + v + ' · 🏚 ' + (court ? '' : 'Nids ') + Math.min(nd, N) + '/' + N + ' → Ruche';
}

/* ---------- Sièges ---------- */
const rtsSiegeEl = document.createElement('div'); rtsSiegeEl.id = 'rtSiege'; rtsSiegeEl.className = 'hide'; rtsSiegeEl.setAttribute('role', 'status');
document.body.appendChild(rtsSiegeEl);
// Côté d'où vient le siège (vu de la caméra : le nord est en haut de l'écran, l'est à droite)
function rtsSiegeCote(S){ S = S || RTS.siege; if (!S) return ''; return S.a < -.3 ? 'par la gauche (ouest)' : S.a > .3 ? 'par la droite (est)' : 'par le nord (en face)'; }
function rtsSiegePoint(a){
  const R = RTS.baseR + RTS_REGL.siege.dist, z = -R * Math.cos(a), m = rtsValleyX(z) - 6;
  return { x:clamp(R * Math.sin(a), -m, m), z };
}
// muet : siège lancé sans annonce (partie reprise juste avant la horde)
function rtsSiegeAnnonce(muet){
  const a = rand(-1, 1) * Math.PI / 4 * .85, p = rtsSiegePoint(a);
  RTS.siege = { phase:'annonce', t:RTS_REGL.siege.annonce, a, x:p.x, z:p.z, f:0 };
  if (muet) return RTS.siege;
  banner('⚠ Siège dans ' + Math.ceil(RTS.hordeT) + ' secondes !', 'Une grosse horde va attaquer ' + rtsSiegeCote() + ' : renforce ce côté', 3000);
  if (typeof Snd === 'object' && Snd.tone){
    for (let i = 0; i < 3; i++) setTimeout(() => { try { Snd.tone(420, .4, 'sawtooth', .06, 640); } catch (e) { errNote(e); } }, i * 450);
  }
  return RTS.siege;
}
// Le moment de la horde : le siège commence (appelé par rtsStep, js/42-rts-combat.js) ; rend le point d'arrivée
function rtsSiegeGo(){
  const C = RTS_REGL.siege; let S = RTS.siege;
  if ((!S || S.phase !== 'annonce') && RTS.t < C.debut) return null; // trop tôt : une horde ordinaire
  if (!S || S.phase !== 'annonce') S = rtsSiegeAnnonce(true);
  S.phase = 'siege'; S.t = C.duree; S.f = C.flotT;
  const p = rtsSiegePoint(S.a); S.x = p.x; S.z = p.z;
  rtsSiegeSpawn(S.x, S.z, Math.round((10 + RTS.threat * 5) * C.coup), 12);
  if (typeof Snd === 'object' && Snd.groan) Snd.groan();
  return [S.x, S.z];
}
// Zombies du siège : plus solides et plus forts (RTS_REGL.siege.force), ils coupent tout droit vers la base
function rtsSiegeSpawn(x, z, n, spread){
  const C = RTS_REGL.siege, m = 1 + C.monte * Math.floor(RTS.hordeN / C.tous), i0 = zombies.length, k = C.force * m, kd = C.forceDmg;
  const nb = rtsSpawnAt(x, z, Math.round(n * m), spread, null, rtsSiegeCap());
  for (let i = i0; i < zombies.length; i++){ const q = zombies[i]; if (q.dead || q.rtsBoss) continue; q.hp *= k; q.maxHp *= k; q.dmg *= kd; q.useRoad = false; q.rtsSiege = true; }
  return nb;
}
const rtsSiegeCap = () => plan.maxAlive + (isTouch ? RTS_REGL.siege.extraCell : RTS_REGL.siege.extra);
function rtsSiegeStep(dt){
  const C = RTS_REGL.siege; let S = RTS.siege;
  if (!S && (RTS.hordeN + 1) % C.tous === 0 && RTS.hordeT <= C.annonce && RTS.t + RTS.hordeT >= C.debut) S = rtsSiegeAnnonce();
  if (S){
    if (S.phase === 'annonce') S.t = RTS.hordeT;
    else if (S.phase === 'siege'){
      S.t -= dt; S.f -= dt;
      if (S.f <= 0){ S.f = C.flotT; rtsSiegeSpawn(S.x + rand(-8, 8), S.z + rand(-4, 4), Math.ceil(2 + RTS.threat * C.flotN), 10); }
      if (S.t <= 0){ S.phase = 'creux'; S.t = C.creux; banner('Le siège faiblit', 'Accalmie : répare, rebâtis, regroupe ton armée', 2400); }
    } else if (S.phase === 'creux'){
      S.t -= dt; const Q = RTS.base; // accalmie : le QG se répare un peu
      if (Q && !Q.dead && Q.hp < Q.maxHp){ Q.hp = Math.min(Q.maxHp, Q.hp + Q.maxHp * C.repare * dt); if (Q.hpb) rtsHpSet(Q.hpb, Q.hp / Q.maxHp); }
      if (S.t <= 0){ RTS.siege = S = null; }
    }
  }
  RTS.ponteK = !S ? C.leger : S.phase === 'creux' ? C.creuxK : S.phase === 'siege' ? 1 : C.leger;
  return S;
}
function rtsSiegeBandeau(){
  const S = RTS.siege, on = state === 'rts' && RTS.on && !!S && !RTS.pilot && !RTS.photo;
  if (rtsSiegeEl.classList.contains('hide') === on) rtsSiegeEl.classList.toggle('hide', !on);
  if (!on) return;
  const t = Math.max(0, Math.ceil(S.t));
  const txt = S.phase === 'annonce' ? '⚠ Siège dans ' + t + ' s · ' + rtsSiegeCote(S) : S.phase === 'siege' ? '🔥 Siège ' + rtsSiegeCote(S) + ' · encore ' + t + ' s' : '🛠 Accalmie : répare et rebâtis · ' + t + ' s';
  if (rtsSiegeEl.textContent !== txt) rtsSiegeEl.textContent = txt;
  rtsSiegeEl.dataset.phase = S.phase;
}

/* ---------- Mini-carte : la Ruche et le côté du siège (appelé par js/49-rts-commandement.js) ---------- */
function rtsMiniExtra(g, P2){
  const o = RTS.ruche, pul = .5 + .5 * Math.sin(RTS.t * 6);
  if (o && !o.dead){
    const q = P2(o.x, o.z);
    g.fillStyle = '#c050ff'; g.beginPath(); g.arc(q[0], q[1], 6, 0, 6.283); g.fill();
    g.strokeStyle = '#ffd040'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#ffd040'; g.beginPath(); g.moveTo(q[0] - 4, q[1] - 7); g.lineTo(q[0] - 2, q[1] - 11); g.lineTo(q[0], q[1] - 8); g.lineTo(q[0] + 2, q[1] - 11); g.lineTo(q[0] + 4, q[1] - 7); g.fill(); // couronne
  }
  const S = RTS.siege;
  if (S && S.phase !== 'creux'){
    const M = RTS_MINI, q = P2(S.x, S.z), x = clamp(q[0], 6, M.w - 6), y = clamp(q[1], 6, M.h - 6);
    g.fillStyle = 'rgba(255,40,30,' + (.45 + .5 * pul).toFixed(2) + ')'; g.beginPath(); g.arc(x, y, 5 + 3 * pul, 0, 6.283); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', x, y + .5);
  }
}

/* ---------- Chaque image ---------- */
Jeu.on('image', () => rtsSiegeBandeau());
rtsValleeRow();

// Accès pour les tests automatiques
window.__rtsRuche = { RTS_REGL, RTS_VAL, rtsValleeMax, rtsValleeLib, rtsValleeDepart, rtsValleeRow, rtsValleeChoisir, rtsRucheSpot, rtsRucheSpawn, rtsRucheCheck, rtsRucheStep,
  rtsRucheDie, rtsRucheLoad, rtsRucheHUD, rtsRucheBut, rtsRucheGarde, rtsVictoire, rtsValleeSuivante, rtsSansFin, rtsSiegeStep, rtsSiegeGo, rtsSiegeAnnonce, rtsSiegeCote, rtsSiegeBandeau, rtsMiniExtra };
