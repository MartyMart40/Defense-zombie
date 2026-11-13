'use strict';
/* ================= RTS : commandement ================= */
// 1. Mini-carte (coin en haut à gauche) : base, route, nids, bâtiments, unités, zombies et la zone que la caméra montre.
//    La toucher (ou glisser dessus) amène la caméra à cet endroit.
// 2. Point de ralliement : bouton « 📍 Ralliement » puis toucher la carte ; les unités achetées y vont d'elles-mêmes
//    (pas les avions, qui tournent dans le ciel). Retoucher le bouton l'enlève.
// 3. Alerte « Base attaquée » : un bâtiment perd de la vie hors de l'écran ; toucher l'alerte y amène la caméra.
//    Paliers (tâche 101), du moins grave au plus grave : tourelle perdue, zombies dans la base, QG touché, QG sous 50 %,
//    QG sous 25 %. Un palier plus grave passe tout de suite ; sinon une alerte attend que la précédente soit finie.
// 4. « ✋ Tenir » : les unités choisies tiennent leur position (ni poursuite, ni recul, ni retraite) ; retoucher pour relâcher.
//    Le comportement est dans rtsUnits (js/42-rts-unites.js, u.hold).
// 5. Mode photo (dans la pause) : jeu figé, menus cachés, caméra libre ; « 📸 Enregistrer l'image ».

/* ---------- 1. Mini-carte ---------- */
const RTS_MINI = { w:120, h:150, x0:-80, x1:80, t:0 };
const rtsMini = document.createElement('canvas'); rtsMini.id = 'rtMini'; rtsMini.className = 'hide';
rtsMini.setAttribute('aria-label', 'Mini-carte : toucher pour y aller');
document.body.appendChild(rtsMini);
const rtsMiniCtx = rtsMini.getContext ? rtsMini.getContext('2d') : null;
// Hauteur de carte montrée : du sud de la base (z = 30, en bas) jusqu'un peu au-delà du nid le plus loin (en haut), comme à l'écran
const rtsMiniZ = () => ({ z0:30, z1:Math.min(-160, rtsFront() - 30, RTS.ruche && !RTS.ruche.dead ? RTS.ruche.z - 25 : 0) });
function rtsMiniXY(x, z){ const Z = rtsMiniZ(), M = RTS_MINI; return [(x - M.x0) / (M.x1 - M.x0) * M.w, (z - Z.z1) / (Z.z0 - Z.z1) * M.h]; }
function rtsMiniWorld(px, py){ const Z = rtsMiniZ(), M = RTS_MINI; return { x:M.x0 + px / M.w * (M.x1 - M.x0), z:Z.z1 + py / M.h * (Z.z0 - Z.z1) }; }
// Coins de la zone vue par la caméra, posés sur le sol
function rtsViewCorners(){
  const out = []; camera.updateMatrixWorld();
  for (const [sx, sy] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]){
    rtsV.set(sx, sy, .5).unproject(camera).sub(camera.position).normalize();
    const t = rtsV.y < -1e-3 ? -camera.position.y / rtsV.y : 400;
    out.push([camera.position.x + rtsV.x * t, camera.position.z + rtsV.z * t]);
  }
  return out;
}
function rtsMiniDraw(){
  const g = rtsMiniCtx; if (!g) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), M = RTS_MINI;
  if (rtsMini.width !== M.w * dpr){ rtsMini.width = M.w * dpr; rtsMini.height = M.h * dpr; }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = 'rgba(40,30,18,.85)'; g.fillRect(0, 0, M.w, M.h);
  const P2 = (x, z) => rtsMiniXY(x, z);
  // Base
  let c = P2(0, 0), r = RTS.baseR / (M.x1 - M.x0) * M.w;
  g.fillStyle = 'rgba(160,150,130,.45)'; g.beginPath(); g.arc(c[0], c[1], r, 0, 6.283); g.fill();
  g.strokeStyle = 'rgba(255,208,64,.8)'; g.lineWidth = 1; g.stroke();
  // Route
  g.strokeStyle = 'rgba(30,28,26,.9)'; g.lineWidth = 2; g.beginPath();
  RTS_ROAD.forEach((p, i) => { const q = P2(p[0], p[1]); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.stroke();
  // Bâtiments, nids, zombies, unités
  g.fillStyle = '#6aa8ff'; RTS.blds.forEach(o => { if (o.dead) return; const q = P2(o.x, o.z); g.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3); });
  RTS.nests.forEach(n => { if (n.dead) return; const q = P2(n.x, n.z); g.fillStyle = '#ff3a2a'; g.fillRect(q[0] - 3, q[1] - 3, 6, 6); g.strokeStyle = '#000'; g.strokeRect(q[0] - 3, q[1] - 3, 6, 6); });
  g.fillStyle = 'rgba(255,90,60,.8)'; let k = 0;
  for (const z of zombies){ if (z.dead || !z.g) continue; if (++k > 400) break; const q = P2(z.g.position.x, z.g.position.z); g.fillRect(q[0] - .8, q[1] - .8, 1.6, 1.6); }
  RTS.units.forEach(u => { if (u.dead) return; const q = P2(u.g.position.x, u.g.position.z), on = RTS.sel.indexOf(u) >= 0; g.fillStyle = on ? '#ffffff' : '#7ee05a'; g.fillRect(q[0] - (on ? 2 : 1.5), q[1] - (on ? 2 : 1.5), on ? 4 : 3, on ? 4 : 3); });
  if (typeof rtsMiniExtra === 'function') rtsMiniExtra(g, P2); // la Ruche et le côté du siège (js/65-rts-ruche.js)
  if (RTS.rally){ const q = P2(RTS.rally.x, RTS.rally.z); g.fillStyle = '#ffd040'; g.beginPath(); g.moveTo(q[0], q[1] - 5); g.lineTo(q[0] + 4, q[1] - 3); g.lineTo(q[0], q[1] - 1); g.fill(); g.fillRect(q[0] - .5, q[1] - 5, 1, 6); }
  // Ce que la caméra montre
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1; g.beginPath();
  rtsViewCorners().forEach((p, i) => { const q = P2(p[0], p[1]); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.stroke();
}
function rtsMiniGo(cx, cy){
  const b = rtsMini.getBoundingClientRect(), w = rtsMiniWorld((cx - b.left) / b.width * RTS_MINI.w, (cy - b.top) / b.height * RTS_MINI.h);
  RTS.cam.x = clamp(w.x, -170, 170); RTS.cam.z = clamp(w.z, RTS.zMin, 30);
  return w;
}
(function(){
  let down = false;
  const go = e => { const t = e.touches ? e.touches[0] : e; if (t) rtsMiniGo(t.clientX, t.clientY); };
  rtsMini.addEventListener('mousedown', e => { if (state !== 'rts') return; down = true; go(e); e.stopPropagation(); });
  window.addEventListener('mousemove', e => { if (down) go(e); });
  window.addEventListener('mouseup', () => { down = false; });
  rtsMini.addEventListener('touchstart', e => { if (state !== 'rts') return; e.preventDefault(); e.stopPropagation(); go(e); }, { passive:false });
  rtsMini.addEventListener('touchmove', e => { e.preventDefault(); e.stopPropagation(); go(e); }, { passive:false });
})();

/* ---------- 2. Point de ralliement ---------- */
const rtsRallyMesh = new THREE.Group(); rtsRallyMesh.visible = false; scene.add(rtsRallyMesh);
(function(){
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 3.2, 6), new THREE.MeshBasicMaterial({ color:0xe8e0c8 })); pole.position.y = 1.6; rtsRallyMesh.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .9), new THREE.MeshBasicMaterial({ color:0xffd040, side:THREE.DoubleSide })); flag.position.set(.7, 2.75, 0); rtsRallyMesh.add(flag);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.5, 24), new THREE.MeshBasicMaterial({ color:0xffd040, transparent:true, opacity:.7, side:THREE.DoubleSide, depthWrite:false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .08; rtsRallyMesh.add(ring);
})();
function rtsRallySet(x, z){
  RTS.rallyPick = false;
  if (x == null){ RTS.rally = null; rtsRallyMesh.visible = false; }
  else { RTS.rally = { x, z }; rtsRallyMesh.position.set(x, 0, z); rtsRallyMesh.visible = true; if (typeof toast === 'function') toast('Point de ralliement placé : les nouvelles unités iront là'); }
  rtsCmdBtns();
  return RTS.rally;
}
function rtsRallyToggle(){
  if (RTS.rally){ rtsRallySet(null); if (typeof toast === 'function') toast('Point de ralliement enlevé'); return null; }
  RTS.rallyPick = !RTS.rallyPick; rtsCmdBtns();
  if (RTS.rallyPick && typeof toast === 'function') toast('Touche la carte pour placer le point de ralliement');
  return RTS.rallyPick;
}
// Une unité qui vient d'être achetée part vers le point de ralliement (sauf les avions)
function rtsRallyApply(u){
  if (!RTS.rally || !u || u.U.kind === 'air') return false;
  const a = Math.random() * 6.283, d = 1.5 + Math.random() * 2.5;
  u.tx = u.hx = RTS.rally.x + Math.cos(a) * d; u.tz = u.hz = RTS.rally.z + Math.sin(a) * d; u.cmd = 'move';
  return true;
}

/* ---------- 4. Tenir la position ---------- */
function rtsHold(){
  const list = RTS.sel.filter(u => !u.dead); if (!list.length){ if (typeof toast === 'function') toast('Choisis d’abord une unité, puis Tenir'); return null; }
  const on = !list.every(u => u.hold);
  list.forEach(u => { u.hold = on; if (on){ u.nest = null; u.retreat = false; if (u.cmd !== 'move'){ u.cmd = 'idle'; u.hx = u.tx = u.g.position.x; u.hz = u.tz = u.g.position.z; } } });
  if (typeof toast === 'function') toast(on ? '✋ Elles tiennent leur position' : 'Elles peuvent de nouveau bouger seules');
  rtsCmdBtns();
  return on;
}
// Boutons du bas (onglets Robots et Véhicules) : état allumé ou non
function rtsCmdBtns(){
  const r = $('rtRally'); if (r){ r.classList.toggle('on', !!RTS.rally || !!RTS.rallyPick); r.textContent = RTS.rally ? '📍 Ralliement ✕' : RTS.rallyPick ? '📍 Touche la carte' : '📍 Ralliement'; }
  const h = $('rtHold'); if (h){ const l = RTS.sel.filter(u => !u.dead); h.classList.toggle('on', l.length > 0 && l.every(u => u.hold)); }
}

/* ---------- 3. Alerte « Base attaquée » ---------- */
const rtsAlert = document.createElement('button'); rtsAlert.type = 'button'; rtsAlert.id = 'rtAlert'; rtsAlert.className = 'hide';
document.body.appendChild(rtsAlert);
const RTS_AL = { t:0, cd:0, o:null, hp:new WeakMap(), n:0, pcd:{}, baseT:0, q50:false, q25:false };
// Paliers : n (gravité), cd (secondes avant de redire le même palier), dur (secondes affichée)
const RTS_AL_P = {
  bat:      { n:0, cd:8,  dur:6 },   // un bâtiment hors de l'écran perd de la vie
  tourelle: { n:1, cd:15, dur:6 },
  base:     { n:2, cd:30, dur:6, nb:6 }, // nb : zombies dans le cercle de la base
  qg:       { n:3, cd:25, dur:6 },
  qg50:     { n:4, cd:0,  dur:8 },   // une fois, jusqu'à ce que le QG remonte au-dessus de 60 %
  qg25:     { n:5, cd:0,  dur:9 }    // une fois, jusqu'à ce que le QG remonte au-dessus de 35 %
};
function rtsOnScreen(x, z){ camera.updateMatrixWorld(); rtsV.set(x, 1, z).project(camera); return rtsV.z < 1 && Math.abs(rtsV.x) < .95 && Math.abs(rtsV.y) < .9; }
// Montre une alerte si son palier le permet ; rend vrai si elle est montrée
function rtsAlertShow(k, o, txt){
  const P2 = RTS_AL_P[k]; if (!P2 || RTS.pilot) return false;
  const actif = RTS_AL.t > 0 && !rtsAlert.classList.contains('hide');
  if ((RTS_AL.pcd[k] || 0) > 0) return false;
  if (actif && P2.n <= RTS_AL.n) return false;     // une alerte aussi grave ou plus grave est déjà là
  if (!actif && k === 'bat' && RTS_AL.cd > 0) return false;
  RTS_AL.pcd[k] = P2.cd; RTS_AL.n = P2.n; RTS_AL.t = P2.dur; RTS_AL.o = o; if (k === 'bat') RTS_AL.cd = 8;
  rtsAlert.textContent = txt; rtsAlert.dataset.p = P2.n; rtsAlert.classList.remove('hide');
  if (typeof Snd === 'object' && Snd.tone){
    const f = 520 + 60 * P2.n, n = P2.n >= 4 ? 3 : 2;
    Snd.tone(f, .12, 'square', .06, f * .73);
    for (let i = 1; i < n; i++) setTimeout(() => { try { Snd.tone(f, .12, 'square', .06, f * .73); } catch (e) { errNote(e); } }, 180 * i);
  }
  return true;
}
// Une tourelle ou un bâtiment vient d'être détruit (appelé par rtsBldDie, js/42-rts-combat.js)
function rtsAlertLost(o){
  if (!o || state !== 'rts' || o.type === 'hq') return false;
  return rtsAlertShow('tourelle', o, '💥 ' + (o.B.turret ? 'Tourelle perdue' : 'Bâtiment perdu') + ' : ' + o.B.name + ' (toucher pour y aller)');
}
function rtsAlertCheck(dt){
  RTS_AL.cd -= dt; RTS_AL.t -= dt; for (const k in RTS_AL.pcd) RTS_AL.pcd[k] -= dt;
  if (RTS_AL.t <= 0 && !rtsAlert.classList.contains('hide')) rtsAlert.classList.add('hide');
  const Q = RTS.base;
  // QG : sous 25 %, sous 50 %, touché (même à l'écran)
  if (Q && !Q.dead){
    const k = Q.hp / Q.maxHp, h0 = RTS_AL.hp.get(Q), touche = h0 != null && Q.hp < h0 - .01;
    if (k > .6) RTS_AL.q50 = false; if (k > .35) RTS_AL.q25 = false;
    if (touche && k < .25 && !RTS_AL.q25){ if (rtsAlertShow('qg25', Q, '🔥 QG sous 25 % : il va tomber ! Rappelle tout le monde')){ RTS_AL.q25 = RTS_AL.q50 = true; RTS_AL.hp.set(Q, Q.hp); return Q; } }
    if (touche && k < .5 && !RTS_AL.q50){ if (rtsAlertShow('qg50', Q, '🔥 QG sous 50 % : rappelle l’armée, répare !')){ RTS_AL.q50 = true; RTS_AL.hp.set(Q, Q.hp); return Q; } }
    if (touche && rtsAlertShow('qg', Q, '⚠ Le QG est attaqué ! (' + Math.ceil(k * 100) + ' %, toucher pour y aller)')){ RTS_AL.hp.set(Q, Q.hp); return Q; }
  }
  // Zombies dans la base (compté une fois par seconde)
  RTS_AL.baseT -= dt;
  if (RTS_AL.baseT <= 0){
    RTS_AL.baseT = 1; let n = 0, zx = 0, zz = 0; const r2 = RTS.baseR * RTS.baseR;
    for (const z of zombies){ if (z.dead) continue; const p = z.g.position; if (p.x * p.x + p.z * p.z < r2){ n++; zx += p.x; zz += p.z; } }
    if (n >= RTS_AL_P.base.nb && rtsAlertShow('base', { x:zx / n, z:zz / n, dead:false }, '⚠ ' + n + ' zombies dans la base ! (toucher pour y aller)')) return null;
  }
  for (const o of RTS.blds){
    if (o.dead) continue;
    const h0 = RTS_AL.hp.get(o); RTS_AL.hp.set(o, o.hp);
    if (h0 == null || o.hp >= h0 - .01 || RTS_AL.cd > 0 || RTS.pilot) continue;
    if (rtsOnScreen(o.x, o.z)) continue;
    if (rtsAlertShow('bat', o, '⚠ Base attaquée : ' + o.B.name + (o.type === 'hq' ? ' !' : '') + ' (toucher pour y aller)')) return o;
  }
  return null;
}
rtsAlert.addEventListener('click', () => { const o = RTS_AL.o; if (o && !o.dead){ RTS.cam.x = o.x; RTS.cam.z = o.z; } rtsAlert.classList.add('hide'); RTS_AL.t = 0; });

/* ---------- 5. Mode photo ---------- */
const rtsPhotoUI = document.createElement('div'); rtsPhotoUI.id = 'rtPhoto'; rtsPhotoUI.className = 'hide';
rtsPhotoUI.innerHTML = '<button type="button" id="rtPhotoShot">📸 Enregistrer l’image</button><button type="button" id="rtPhotoOut">Quitter le mode photo</button><span>Glisse et pince (ou ZQSD et molette) pour cadrer</span>';
document.body.appendChild(rtsPhotoUI);
function rtsPhoto(on){
  RTS.photo = !!on;
  document.body.classList.toggle('rtphoto', RTS.photo);
  rtsPhotoUI.classList.toggle('hide', !RTS.photo);
  if (RTS.photo){ RTS.paused = true; rtsPanel.classList.add('hide'); rtsInfo.classList.add('hide'); rtsAlert.classList.add('hide'); }
  else if (state === 'rts'){ RTS.paused = false; }
  return RTS.photo;
}
// L'image : on redessine la scène et on la lit tout de suite (sans réglage spécial du rendu)
function rtsPhotoData(){
  try { renderer.clear(); renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); } catch (e) { return null; }
}
function rtsPhotoShot(){
  const url = rtsPhotoData(); if (!url){ if (typeof toast === 'function') toast('Image impossible sur cet appareil'); return false; }
  const nom = 'dernier-toit-' + new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-') + '.png';
  try {
    if (navigator.canShare && typeof fetch === 'function' && isTouch){
      fetch(url).then(r => r.blob()).then(b => { const f = new File([b], nom, { type:'image/png' }); if (navigator.canShare({ files:[f] })) return navigator.share({ files:[f], title:'Dernier toit' }); throw 0; })
        .catch(() => rtsPhotoDl(url, nom));
    } else rtsPhotoDl(url, nom);
  } catch (e) { rtsPhotoDl(url, nom); }
  return true;
}
function rtsPhotoDl(url, nom){ const a = document.createElement('a'); a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); }
$('rtPhotoShot').addEventListener('click', rtsPhotoShot);
$('rtPhotoOut').addEventListener('click', () => rtsPhoto(false));
// Bouton dans la pause du RTS
function rtsPhotoPauseBtn(){
  const box = document.querySelector('#rtsPanel .mk-btns'); if (!box || $('rtPhotoGo')) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.id = 'rtPhotoGo'; b.textContent = '📷 Mode photo';
  b.addEventListener('click', () => rtsPhoto(true));
  box.appendChild(b);
}

/* ---------- Chaque image ---------- */
Jeu.on('image', dt => {
  const on = state === 'rts' && RTS.on && !RTS.pilot && !RTS.photo;
  rtsMini.classList.toggle('hide', !on);
  if (state !== 'rts' || !RTS.on){ if (RTS.photo) rtsPhoto(false); if (!rtsAlert.classList.contains('hide')) rtsAlert.classList.add('hide'); rtsRallyMesh.visible = false; return; }
  rtsRallyMesh.visible = !!RTS.rally && !RTS.pilot;
  if (rtsRallyMesh.visible) rtsRallyMesh.children[1].rotation.y = Math.sin(RTS.t * 3) * .3;
  if (!RTS.paused) rtsAlertCheck(dt || 0);
  RTS_MINI.t -= dt || 0;
  if (on && RTS_MINI.t <= 0){ RTS_MINI.t = .12; rtsMiniDraw(); rtsCmdBtns(); }
});
// Nouvelle partie : pas de ralliement, pas d'alerte (la sauvegarde remet le ralliement, js/45)
function rtsCmdReset(){ RTS.rally = null; RTS.rallyPick = false; RTS.photo = false; rtsRallyMesh.visible = false; RTS_AL.cd = 0; RTS_AL.t = 0; RTS_AL.n = 0; RTS_AL.pcd = {}; RTS_AL.q50 = RTS_AL.q25 = false; rtsAlert.classList.add('hide'); document.body.classList.remove('rtphoto'); rtsPhotoUI.classList.add('hide'); }

// Accès pour les tests automatiques
window.__rtsCmd = { RTS_MINI, rtsMiniDraw, rtsMiniXY, rtsMiniWorld, rtsMiniGo, rtsViewCorners, rtsRallySet, rtsRallyToggle, rtsRallyApply, rtsHold, rtsCmdBtns,
  rtsAlertCheck, rtsAlertShow, rtsAlertLost, RTS_AL, RTS_AL_P, rtsPhoto, rtsPhotoData, rtsPhotoShot, rtsPhotoPauseBtn, rtsCmdReset };
