'use strict';
/* ================= RTS : sauvegarde de la partie en cours ================= */
// La partie RTS est sans fin : elle est gardée dans localStorage (clé dt_rts_partie, donc aussi dans la
// sauvegarde OneDrive de js/32-sauvegarde.js) toutes les 30 s, à la pause et quand le cell met le jeu de côté.
// Gardé : argent, temps, menace, hordes, boss, améliorations, taille de la base, la route, tous les nids
// (détruits compris), les bâtiments (niveau, vie) et les unités (vie, poste). Pas gardé : les zombies en vie,
// les obus en vol, le pilotage (la partie reprend sur la carte, avec un instant de calme).
// Effacée quand le QG tombe, avec « Abandonner », ou quand on commence une nouvelle partie.
// Reprise : bouton « Continuer la guerre » sur l'écran titre (rtsStart(save) dans js/42-rts-unites.js).

const RTS_SAVE_KEY = 'dt_rts_partie';
const RTS_SAVE_V = 1;
const rtsR1 = v => Math.round(v * 10) / 10;

function rtsSaveData(){
  const R = RTS;
  return {
    v: RTS_SAVE_V, date: Date.now(),
    money: Math.round(S.money), t: rtsR1(R.t), kills: R.kills, hordeT: rtsR1(R.hordeT), hordeN: R.hordeN, bossN: R.bossN, bossKills: R.bossKills,
    lost: R.lost, upg: JSON.parse(JSON.stringify(R.upg || {})), baseR: R.baseR, rot: R.placeRot || 0,
    xpG: Math.max(0, Math.round((P.xp || 0) - R.xp0)), scrG: Math.max(0, Math.round((P.scrap || 0) - R.scr0)),
    cam: { x: rtsR1(R.cam.x), z: rtsR1(R.cam.z), h: rtsR1(R.cam.h) },
    rally: R.rally ? { x: rtsR1(R.rally.x), z: rtsR1(R.rally.z) } : null,
    road: RTS_ROAD.map(p => [rtsR1(p[0]), rtsR1(p[1])]),
    nests: R.nests.map(n => ({ x: rtsR1(n.x), z: rtsR1(n.z), hp: Math.round(n.hp), d: n.dead ? 1 : 0, st: rtsR1(n.spawnT) })),
    blds: R.blds.filter(o => !o.dead).map(o => ({ t: o.type, x: o.x, z: o.z, r: o.rot || 0, hp: Math.round(o.hp), lv: o.lv || 1, s: o.spent || 0 })),
    units: R.units.filter(u => !u.dead).map(u => ({ t: u.type, x: rtsR1(u.g.position.x), z: rtsR1(u.g.position.z), hp: Math.round(u.hp), hx: rtsR1(u.hx), hz: rtsR1(u.hz), hd: rtsR1(u.head || 0), ho: u.hold ? 1 : 0 }))
  };
}
// Sauve la partie en cours (seulement pendant une partie RTS)
function rtsSave(){
  if (!RTS.on || state !== 'rts' || !RTS.base || RTS.base.dead) return false;
  try { store.set(RTS_SAVE_KEY, rtsSaveData()); } catch (e) { return false; }
  RTS.saveT = 30;
  return true;
}
function rtsSaveGet(){ const d = store.get(RTS_SAVE_KEY, null); return rtsSaveOk(d) ? d : null; }
function rtsSaveClear(){ try { localStorage.removeItem(RTS_SAVE_KEY); } catch (e) {} rtsSaveBtn(); }
// Une sauvegarde lisible : bonne version, un QG, une route et des nids
function rtsSaveOk(d){
  return !!d && typeof d === 'object' && d.v === RTS_SAVE_V && Array.isArray(d.blds) && Array.isArray(d.units) && Array.isArray(d.nests)
    && Array.isArray(d.road) && d.road.length >= 2 && d.blds.some(b => b && b.t === 'hq') && d.nests.length > 0;
}

/* ---------- Reprise (appelée par rtsStart(save), dans cet ordre) ---------- */
function rtsLoadRoad(d){
  RTS_ROAD.length = 0;
  d.road.forEach(p => { if (Array.isArray(p) && isFinite(p[0]) && isFinite(p[1])) RTS_ROAD.push([+p[0], +p[1]]); });
  if (RTS_ROAD.length < 2) rtsRoadReset();
}
function rtsLoadNests(d){
  RTS.nestN = 0;
  for (const s of d.nests){
    if (!s || !isFinite(s.x) || !isFinite(s.z)) continue;
    const n = rtsAddNest(+s.x, +s.z);
    n.hp = clamp(+s.hp || n.maxHp, 1, n.maxHp); n.spawnT = isFinite(s.st) ? +s.st : n.spawnT;
    rtsHpSet(n.hpb, n.hp / n.maxHp);
    if (s.d){ n.dead = true; n.g.scale.y = .25; n.g.position.y = -.5; n.hpb.bg.visible = n.hpb.fg.visible = false; }
  }
  // Toujours RTS_CFG.nests nids actifs (au cas où la sauvegarde en aurait moins)
  while (rtsNestsAlive().length < RTS_CFG.nests) rtsAddNest(null, rtsFront() - rand(35, 55));
}
function rtsLoadRest(d){
  const R = RTS;
  R.t = +d.t || 0; R.kills = +d.kills || 0; R.hordeT = isFinite(d.hordeT) ? +d.hordeT : RTS_CFG.hordeEvery; R.hordeN = +d.hordeN || 0;
  R.bossN = +d.bossN || 0; R.bossKills = +d.bossKills || 0; R.lost = +d.lost || 0; R.placeRot = (+d.rot || 0) % 4;
  R.upg = d.upg && typeof d.upg === 'object' ? JSON.parse(JSON.stringify(d.upg)) : {};
  R.baseR = clamp(+d.baseR || RTS_CFG.baseR0, RTS_CFG.baseR0, 70);
  R.xp0 = (P.xp || 0) - (+d.xpG || 0); R.scr0 = (P.scrap || 0) - (+d.scrG || 0);
  S.money = Math.max(0, +d.money || 0);
  if (d.cam) Object.assign(R.cam, { x: +d.cam.x || 0, z: +d.cam.z || -10, h: +d.cam.h || R.cam.h });
  // Bâtiments (le QG d'abord), puis les unités (leur vie dépend des améliorations, déjà remises)
  const blds = d.blds.filter(b => b && RTS_BLD[b.t]).sort((a, b) => (b.t === 'hq') - (a.t === 'hq'));
  let hq = false;
  for (const b of blds){
    if (b.t === 'hq'){ if (hq) continue; hq = true; }
    const o = rtsPlaceBld(b.t, +b.x, +b.z, true, +b.r || 0);
    o.spent = +b.s || 0;
    const lv = clamp(Math.round(+b.lv || 1), 1, typeof RTS_TMAX === 'number' ? RTS_TMAX : 6);
    if (o.B.turret && lv > 1){ o.lv = lv; o.maxHp *= Math.pow(1.15, lv - 1); if (o.head) o.head.scale.setScalar(1 + .07 * (lv - 1)); }
    o.hp = clamp(+b.hp || o.maxHp, 1, o.maxHp); rtsHpSet(o.hpb, o.hp / o.maxHp);
  }
  for (const s of d.units){
    if (!s || !RTS_UNITS[s.t] || !isFinite(s.x) || !isFinite(s.z)) continue;
    if (R.units.length >= RTS_CFG.maxUnits) break;
    const u = rtsSpawnUnit(s.t, +s.x, +s.z);
    u.hp = clamp(+s.hp || u.maxHp, 1, u.maxHp); rtsHpSet(u.hpb, u.hp / u.maxHp);
    u.hx = u.tx = isFinite(s.hx) ? +s.hx : u.g.position.x; u.hz = u.tz = isFinite(s.hz) ? +s.hz : u.g.position.z;
    u.head = +s.hd || 0; u.cmd = u.U.kind === 'air' ? 'idle' : 'move'; u.hold = !!s.ho;
  }
}

/* ---------- Écran titre : bouton « Continuer la guerre » ---------- */
function rtsSaveBtn(){
  let b = $('btnRtsGo');
  const ref = $('btnRts');
  if (!b && ref && ref.parentNode){
    b = document.createElement('button'); b.className = 'ghost rts-btn'; b.id = 'btnRtsGo'; b.type = 'button';
    ref.parentNode.insertBefore(b, ref);
    b.addEventListener('click', () => { const d = rtsSaveGet(); if (d) rtsStart(d); else rtsSaveBtn(); });
  }
  if (!b) return;
  const d = rtsSaveGet();
  b.classList.toggle('hide', !d);
  if (d){
    const nd = d.nests.filter(n => n && n.d).length, min = Math.floor((+d.t || 0) / 60);
    b.textContent = '▶ Continuer la guerre (' + nd + ' nid' + (nd > 1 ? 's' : '') + ' détruit' + (nd > 1 ? 's' : '') + ', ' + min + ' min)';
  }
}
rtsSaveBtn();

/* ---------- Quand sauver ---------- */
// Toutes les 30 s de jeu (pas en pause)
Jeu.on('image', dt => {
  if (state !== 'rts' || !RTS.on || RTS.paused) return;
  RTS.saveT = (RTS.saveT || 30) - (dt || 0);
  if (RTS.saveT <= 0) rtsSave();
});
// Le cell met le jeu de côté (autre appli, écran éteint) ou la page se ferme
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'rts') rtsSave(); });
window.addEventListener('pagehide', () => { if (state === 'rts') rtsSave(); });

// Accès pour les tests automatiques
window.__rtsSave = { RTS_SAVE_KEY, rtsSave, rtsSaveGet, rtsSaveClear, rtsSaveData, rtsSaveOk, rtsSaveBtn };
