'use strict';
/* Mode RTS « Guerre des robots », suite : affichage (menus, panneaux), pose des bâtiments, commandes, crochets et accès pour les tests */
/* ---------- Affichage ---------- */
const rtsUI = document.createElement('div'); rtsUI.id = 'rtsUI'; rtsUI.className = 'hide';
rtsUI.innerHTML = '<div id="rtTop"><span id="rtMoney"></span><span id="rtThreat"></span><span id="rtNests"></span><span id="rtSel"></span></div>'
  + '<div id="rtBase"><span>QG</span><div class="mk-bar"><i id="rtBaseFill"></i></div></div>'
  + '<div id="rtBoss" class="hide"><span id="rtBossName"></span><div class="mk-bar"><i id="rtBossFill"></i></div></div>'
  + '<button id="rtPause" type="button" aria-label="Pause">❚❚</button>'
  + '<div id="rtPlace" class="hide"><span id="rtPlaceTxt"></span><button type="button" id="rtRot">↻ Tourner</button><button type="button" id="rtOk">Poser ici</button><button type="button" id="rtCancel">Annuler</button></div>'
  + '<div id="rtDock"><div id="rtTabs"><button type="button" id="rtFold" aria-label="Cacher le menu">▾</button><button type="button" data-tab="rob">Robots</button><button type="button" data-tab="veh">Véhicules</button><button type="button" data-tab="bat">Bâtiments</button><button type="button" data-tab="tour">Tourelles</button><button type="button" data-tab="upg">Améliorations</button></div><div id="rtBar"></div></div>';
document.body.appendChild(rtsUI);
const rtsPilotUI = document.createElement('div'); rtsPilotUI.id = 'rtPilot'; rtsPilotUI.className = 'hide';
rtsPilotUI.innerHTML = '<div id="rtrpTop"><span id="rtrpName"></span><button type="button" id="rtrpExit">Retour à la carte</button></div>'
  + '<div id="rtrpAc"><i></i><i></i><i></i><i></i><span>AC-130 · manette : déplacer la zone visée</span></div>'
  + '<div id="rtrpJoy"><div id="rtrpKnob"></div></div><div id="rtrpAim"></div><button type="button" id="rtrpFire">Tir</button><button type="button" id="rtrpFire2">Roquettes</button>'
  + '<div id="rtrpHelp">ZQSD ou WASD : bouger · souris : viser · clic : tirer · clic droit ou E : 2e arme (Hellfire de l’Apache, 105 mm de l’AC-130, roquettes du Mech), même en tirant · F ou Échap : retour à la carte</div>';
document.body.appendChild(rtsPilotUI);
const rtsInfo = document.createElement('div'); rtsInfo.id = 'rtInfo'; rtsInfo.className = 'hide'; document.body.appendChild(rtsInfo);
const rtsPanel = document.createElement('div'); rtsPanel.id = 'rtsPanel'; rtsPanel.className = 'hide'; document.body.appendChild(rtsPanel);
const rtsBox = document.createElement('div'); rtsBox.id = 'rtsBox'; document.body.appendChild(rtsBox);
function rtsShowPanel(html, btns){
  rtsPanel.innerHTML = '<div class="panel">' + html + '<div class="mk-btns">' + btns.map((b, i) => '<button class="' + (i ? 'ghost' : 'big') + '" data-i="' + i + '" type="button">' + b[0] + '</button>').join('') + '</div></div>';
  rtsPanel.querySelectorAll('button[data-i]').forEach(el => el.addEventListener('click', () => { const f = btns[+el.dataset.i][1]; if (f) f(); }));
  rtsPanel.classList.remove('hide');
}
// Menu du bas repliable (pour voir la carte, surtout au cell couché) ; le choix est gardé pour la prochaine fois
function rtsFold(v){
  RTS.fold = v === undefined ? !RTS.fold : !!v;
  rtsUI.classList.toggle('fold', RTS.fold);
  const b = $('rtFold'); if (b){ b.textContent = RTS.fold ? '▴ Menu' : '▾'; b.setAttribute('aria-label', RTS.fold ? 'Montrer le menu' : 'Cacher le menu'); }
  store.set('dt_rtsFold', RTS.fold);
  return RTS.fold;
}
function rtsTab(t){
  if (RTS.tab !== t){ rtsCancelPlace(); if (RTS.bsel){ RTS.bsel = null; rtsInfoShow(); } }
  RTS.tab = t;
  rtsUI.querySelectorAll('#rtTabs button[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  const bar = $('rtBar'); let h = '';
  if (t === 'rob' || t === 'veh'){
    h = RTS_ORDER.filter(k => RTS_UNITS[k].cat === t).map(k => { const i = RTS_HOTKEY.indexOf(k); return '<button type="button" class="rt-buy' + (RTS_UNITS[k].big ? ' rt-star' : '') + '" data-t="' + k + '">' + RTS_UNITS[k].name + '<b>' + fmt(RTS_UNITS[k].cost) + '</b><em></em>' + (isTouch || i < 0 ? '' : '<i>' + (i + 1) + '</i>') + '</button>'; }).join('')
      + '<button type="button" id="rtAll">Tout choisir</button><button type="button" id="rtStop">Arrêt</button><button type="button" id="rtHold">✋ Tenir</button><button type="button" id="rtRally">📍 Ralliement</button><button type="button" id="rtPil">🎮 Piloter</button>';
  } else if (t === 'bat' || t === 'tour'){
    h = RTS_BUILD_TABS[t].map(k => '<button type="button" class="rt-bld" data-b="' + k + '">' + RTS_BLD[k].name + '<b>' + fmt(RTS_BLD[k].cost) + '</b></button>').join('');
  } else h = '<button type="button" id="rtUpg">Améliorer les unités…</button>';
  bar.innerHTML = h;
  bar.querySelectorAll('.rt-buy').forEach(b => b.addEventListener('click', () => rtsBuy(b.dataset.t)));
  bar.querySelectorAll('.rt-bld').forEach(b => b.addEventListener('click', () => rtsStartPlace(b.dataset.b)));
  const all = $('rtAll'); if (all) all.addEventListener('click', () => rtsSelect(RTS.units.filter(u => !u.dead && u.U.cat === t), false));
  const st = $('rtStop'); if (st) st.addEventListener('click', () => { RTS.sel.forEach(u => { u.cmd = 'idle'; u.nest = null; u.retreat = false; u.tx = u.hx = u.g.position.x; u.tz = u.hz = u.g.position.z; }); });
  const pl = $('rtPil'); if (pl) pl.addEventListener('click', () => rtsPilotSel());
  const ho = $('rtHold'); if (ho) ho.addEventListener('click', () => { if (typeof rtsHold === 'function') rtsHold(); });
  const ra = $('rtRally'); if (ra) ra.addEventListener('click', () => { if (typeof rtsRallyToggle === 'function') rtsRallyToggle(); });
  if (typeof rtsCmdBtns === 'function') rtsCmdBtns();
  const up = $('rtUpg'); if (up) up.addEventListener('click', () => rtsUpgPanel());
  if (t === 'upg') rtsUpgPanel();
}
function rtsPilotSel(){
  const list = RTS.sel.filter(u => !u.dead);
  if (!list.length){ if (typeof toast === 'function') toast('Choisis d’abord une unité, puis Piloter'); return false; }
  let best = list[0], bd = 1e9;
  list.forEach(u => { const d = Math.hypot(u.g.position.x - RTS.cam.x, u.g.position.z - RTS.cam.z); if (d < bd){ bd = d; best = u; } });
  return rtsPilot(best);
}
function rtsUpgPanel(){
  if (state !== 'rts') return;
  rtsCancelPlace();
  RTS.paused = true;
  let h = '<h2 class="title sm">Améliorer les unités</h2><p class="lead">Argent : <strong>' + fmt(Math.floor(S.money)) + '</strong> · vaut aussi pour les unités déjà construites</p><div class="mk-upg">';
  [['rob', 'Robots'], ['veh', 'Véhicules et avions']].forEach(c => {
    h += '<h4 class="wuh">' + c[1] + '</h4>';
    RTS_ORDER.filter(t => RTS_UNITS[t].cat === c[0]).forEach(t => {
      h += '<div class="rt-ut">' + RTS_UNITS[t].name + '</div>';
      Object.keys(RTS_UPG).concat(Object.keys(RTS_UPG_SPEC[t] || {})).forEach(k => {
        const U = rtsUpgDef(t, k), l = rtsLv(t, k), max = l >= U.max, cost = rtsUpgCost(t, k);
        h += '<div class="row"><div class="info"><div class="nm">' + U.name + ' <span class="inf-lv">' + l + ' / ' + U.max + '</span></div><div class="ds">' + U.desc + (RTS_UPG[k] ? ' par niveau' : '') + '</div></div>'
          + '<button type="button" data-u="' + t + ':' + k + '"' + (max || S.money < cost ? ' disabled' : '') + '>' + (max ? 'Max' : fmt(cost)) + '</button></div>';
      });
    });
  });
  h += '</div>';
  rtsShowPanel(h, [['Retour au combat', () => { RTS.paused = false; rtsPanel.classList.add('hide'); rtsTab('rob'); }]]);
  rtsPanel.querySelectorAll('button[data-u]').forEach(b => b.addEventListener('click', () => { const p = b.dataset.u.split(':'); if (rtsUpgBuy(p[0], p[1])){ const sc = rtsPanel.querySelector('.mk-upg'), y = sc ? sc.scrollTop : 0; rtsUpgPanel(); const sc2 = rtsPanel.querySelector('.mk-upg'); if (sc2) sc2.scrollTop = y; } }));
}
// Fenêtre de ce qui est choisi : un bâtiment (vie, niveau, améliorer, fabriquer, vendre) ou une seule unité (piloter)
function rtsInfoShow(){
  const o = RTS.bsel && !RTS.bsel.dead ? RTS.bsel : null, one = RTS.sel.length === 1 && !RTS.pilot ? RTS.sel[0] : null;
  if (state !== 'rts' || (!o && !one)){ rtsInfo.classList.add('hide'); return; }
  let h;
  if (one){
    h = '<div class="nm">' + one.U.name + '</div><div class="ds">' + Math.ceil(one.hp) + ' / ' + Math.ceil(one.maxHp) + ' de vie · ' + Math.round(rtsStat(one, 'dmg')) + ' dégâts · portée ' + Math.round(rtsStat(one, 'range')) + ' m' + (one.hold ? ' · ✋ tient sa position' : '') + '</div>'
      + '<div class="rt-acts"><button type="button" data-a="pilot">🎮 Piloter</button></div>';
  } else {
    const B = o.B; h = '<div class="nm">' + B.name + (B.turret ? ' · niveau ' + o.lv : '') + '</div><div class="ds">' + Math.ceil(o.hp) + ' / ' + Math.ceil(o.maxHp) + ' de vie' + (B.desc ? ' · ' + B.desc : '') + '</div><div class="rt-acts">';
    if (B.turret){
      h += '<button type="button" data-a="tpilot">🎮 Contrôler</button>';
      h += o.lv < RTS_TMAX ? '<button type="button" data-a="up">Améliorer ' + fmt(rtsTCost(o)) + '</button>' : '<button type="button" disabled>Niveau max</button>';
      h += '<div class="ds">' + Math.round(rtsTStat(o, 'dmg')) + ' dégâts · ' + rtsTStat(o, 'rate').toFixed(1).replace('.', ',') + ' tirs/s · portée ' + Math.round(rtsTStat(o, 'range')) + ' m</div>';
    }
    if (o.type === 'hq') h += '<div class="ds">Si le QG tombe, la partie est perdue.</div>';
    RTS_ORDER.forEach(k => { if (RTS_UNITS[k].fac === o.type) h += '<button type="button" data-a="mk:' + k + '">' + RTS_UNITS[k].name + ' ' + fmt(RTS_UNITS[k].cost) + '</button>'; });
    if (!B.fixed) h += '<button type="button" class="ghost" data-a="sell">Vendre (+' + fmt(Math.round(o.spent * .5)) + ')</button>';
    h += '</div>';
  }
  rtsInfo.innerHTML = h; rtsInfo.classList.remove('hide');
  rtsInfo.querySelectorAll('button[data-a]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.a;
    if (a === 'tpilot'){ rtsTurretPilot(o); return; }
    if (a === 'up') rtsTurretUp(o); else if (a === 'sell') rtsSell(o); else if (a === 'pilot') rtsPilot(one); else if (a.indexOf('mk:') === 0) rtsBuy(a.slice(3));
    rtsInfoShow();
  }));
}
function rtsHUD(){
  if (!RTS.on || !S) return;
  const set = (id, t) => { const el = $(id); if (el && el.textContent !== t) el.textContent = t; };
  const left = rtsNestsAlive().length, alive = RTS.units.filter(u => !u.dead).length;
  set('rtMoney', '💰 ' + fmt(Math.floor(S.money)));
  set('rtThreat', '☣ Menace ' + RTS.threat.toFixed(1).replace('.', ','));
  set('rtNests', typeof rtsRucheHUD === 'function' ? rtsRucheHUD() : '🏚 Nids : ' + left + ' actifs · ' + rtsNestsDead() + ' détruits'); // compteur vers la Ruche (js/65-rts-ruche.js)
  set('rtSel', '🤖 ' + alive + (RTS.sel.length ? ' (' + RTS.sel.length + ' choisi' + (RTS.sel.length > 1 ? 's' : '') + ')' : ''));
  const f = $('rtBaseFill'); if (f && RTS.base) f.style.width = (clamp(RTS.base.hp / RTS.base.maxHp, 0, 1) * 100).toFixed(1) + '%';
  let boss = null; for (const z of zombies) if (!z.dead && z.rtsBoss){ boss = z; break; }
  const bb = $('rtBoss'); if (bb){ if (bb.classList.contains('hide') === !!boss) bb.classList.toggle('hide', !boss); if (boss){ set('rtBossName', '☠ ' + ZTYPES[boss.type].name); $('rtBossFill').style.width = (clamp(boss.hp / boss.maxHp, 0, 1) * 100).toFixed(1) + '%'; } }
  if (RTS.pilot){ const u = RTS.pilot; set('rtrpName', '🎮 ' + (u.U ? u.U.name : u.B.name + ' · niveau ' + u.lv) + ' · ' + Math.ceil(u.hp) + ' / ' + Math.ceil(u.maxHp)); }
  rtsUI.querySelectorAll('.rt-buy').forEach(b => {
    const fac = rtsFactoryFor(b.dataset.t), off = S.money < RTS_UNITS[b.dataset.t].cost || !fac; if (b.classList.contains('off') !== off) b.classList.toggle('off', off);
    const em = b.querySelector('em'), need = fac ? '' : 'Il faut : ' + RTS_BLD[RTS_UNITS[b.dataset.t].fac].name; if (em && em.textContent !== need) em.textContent = need;
  });
  rtsUI.querySelectorAll('.rt-bld').forEach(b => { const off = S.money < RTS_BLD[b.dataset.b].cost; if (b.classList.contains('off') !== off) b.classList.toggle('off', off); });
  if ((RTS.bsel || RTS.sel.length === 1) && !RTS.pilot && !rtsInfo.classList.contains('hide') && Math.random() < .1) rtsInfoShow();
}

/* ---------- Construire : un fantôme suit le pointeur ---------- */
// Quadrillage de 2 m sur la zone de la base : le bâtiment se cale sur une case ; son emprise est verte (libre) ou rouge.
// Ordi : le fantôme suit la souris, un clic pose. Cell : toucher ou glisser le fantôme le déplace, « Poser ici » confirme.
const RTS_GRID = 2;
const rtsSnap = v => Math.round(v / RTS_GRID) * RTS_GRID;
let rtsGhost = null, rtsGridMesh = null, rtsFoot = null;
const rtsFootOk = new THREE.MeshBasicMaterial({ color:0x6aff8a, transparent:true, opacity:.35, depthWrite:false, side:THREE.DoubleSide });
const rtsFootNo = new THREE.MeshBasicMaterial({ color:0xff4a3a, transparent:true, opacity:.4, depthWrite:false, side:THREE.DoubleSide });
function rtsGridBuild(){
  if (rtsGridMesh){ scene.remove(rtsGridMesh); rtsGridMesh.geometry.dispose(); }
  const R = RTS.baseR, pts = [];
  for (let v = -Math.floor(R / RTS_GRID) * RTS_GRID; v <= R; v += RTS_GRID){
    const h = Math.sqrt(Math.max(0, R * R - v * v)); if (h <= 0) continue;
    pts.push(v, 0, -h, v, 0, h, -h, 0, v, h, 0, v);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  rtsGridMesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color:0xfff0a0, transparent:true, opacity:.45, depthWrite:false }));
  rtsGridMesh.position.y = .1; scene.add(rtsGridMesh);
  // Emprise des bâtiments déjà posés : cases occupées en gris
  RTS.blds.forEach(o => { if (o.dead) return; const m = new THREE.Mesh(new THREE.PlaneGeometry(o.r * 2, o.r * 2), new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:.22, depthWrite:false })); m.rotation.x = -Math.PI / 2; m.position.set(o.x, .02 - .1, o.z); rtsGridMesh.add(m); });
}
function rtsStartPlace(type){
  if (state !== 'rts' || RTS.pilot) return;
  const B = RTS_BLD[type]; if (S.money < B.cost){ if (typeof toast === 'function') toast('Pas assez d’argent : ' + B.name + ' (' + fmt(B.cost) + ')'); return; }
  rtsCancelPlace();
  RTS.place = type; RTS.sel.length = 0; RTS.bsel = null; rtsInfoShow();
  rtsGridBuild();
  rtsGhost = new THREE.Mesh(rtsBldGeo(type), rtsGhostOk); rtsGhost.rotation.y = RTS.placeRot * Math.PI / 2; scene.add(rtsGhost);
  rtsFoot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), rtsFootOk); rtsFoot.rotation.x = -Math.PI / 2; rtsFoot.scale.set(B.size * 2, B.size * 2, 1); scene.add(rtsFoot);
  // Départ : au centre de l'écran s'il est dans la base, sinon un peu au nord du QG
  const inB = Math.hypot(RTS.cam.x, RTS.cam.z) < RTS.baseR - B.size;
  rtsGhostAt(inB ? RTS.cam.x : 0, inB ? RTS.cam.z : -RTS.baseR * .5);
  $('rtPlace').classList.remove('hide');
}
function rtsCancelPlace(){
  RTS.place = null; RTS.ghostDrag = false;
  if (rtsGhost){ scene.remove(rtsGhost); rtsGhost = null; }
  if (rtsFoot){ scene.remove(rtsFoot); rtsFoot.geometry.dispose(); rtsFoot = null; }
  if (rtsGridMesh){ scene.remove(rtsGridMesh); rtsGridMesh.traverse(o => { if (o.geometry) o.geometry.dispose(); }); rtsGridMesh = null; }
  const p = $('rtPlace'); if (p) p.classList.add('hide');
}
function rtsGhostAt(x, z){
  if (!rtsGhost || !RTS.place) return;
  x = rtsSnap(x); z = rtsSnap(z);
  const why = rtsBldOk(RTS.place, x, z), B = RTS_BLD[RTS.place];
  rtsGhost.position.set(x, .05, z); rtsGhost.material = why ? rtsGhostNo : rtsGhostOk;
  if (rtsFoot){ rtsFoot.position.set(x, .12, z); rtsFoot.material = why ? rtsFootNo : rtsFootOk; }
  RTS.ghost = { x, z, ok:!why };
  const t = $('rtPlaceTxt'); if (t) t.textContent = B.name + ' : ' + (why || (isTouch ? 'glisse-le sur la grille, puis Poser ici' : 'clique pour poser, R pour tourner'));
  const ok = $('rtOk'); if (ok) ok.disabled = !!why;
}
// Tourner le bâtiment d'un quart de tour (bouton ou touche R) ; l'angle est gardé pour le suivant
function rtsRotate(){ RTS.placeRot = ((RTS.placeRot || 0) + 1) % 4; if (rtsGhost) rtsGhost.rotation.y = RTS.placeRot * Math.PI / 2; return RTS.placeRot; }
function rtsPlaceAt(x, z){ const t = RTS.place; if (!t) return false; const o = rtsBuild(t, rtsSnap(x), rtsSnap(z), RTS.placeRot || 0); if (o){ rtsCancelPlace(); return true; } return false; }

/* ---------- Commandes ---------- */
function rtsNdc(cx, cy){ return new THREE.Vector2(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); }
const RTS_LONG_MS = 450; // appui long (ms) : ajouter au groupe
const RTS_TAP_R = 34; // rayon (pixels) autour du doigt pour prendre une unité
function rtsUnitNear(cx, cy, r){
  camera.updateMatrixWorld(); let best = null, bd = r;
  for (const u of RTS.units){
    if (u.dead) continue;
    rtsV.copy(u.g.position).project(camera); if (rtsV.z > 1) continue;
    const d = Math.hypot((rtsV.x + 1) / 2 * innerWidth - cx, (1 - rtsV.y) / 2 * innerHeight - cy);
    if (d < bd){ bd = d; best = u; }
  }
  return best;
}
// Point du sol sous le doigt (sans s'occuper des unités ni des bâtiments)
function rtsGround(cx, cy){
  camera.updateMatrixWorld(); rtsRay.setFromCamera(rtsNdc(cx, cy), camera);
  const o = rtsRay.ray.origin, d = rtsRay.ray.direction; if (d.y >= -1e-4) return null;
  const t = -o.y / d.y; return { x:o.x + d.x * t, z:o.z + d.z * t };
}
function rtsPick(cx, cy){
  camera.updateMatrixWorld(); rtsRoot.updateMatrixWorld(true); rtsRay.setFromCamera(rtsNdc(cx, cy), camera); rtsRay.far = Infinity;
  const meshes = []; RTS.units.forEach(u => { if (!u.dead) meshes.push(u.m); }); RTS.nests.forEach(n => { if (!n.dead) meshes.push(n.m); });
  RTS.blds.forEach(o => { if (!o.dead){ meshes.push(o.m); if (o.head) meshes.push(o.head); } });
  const h = rtsRay.intersectObjects(meshes, false)[0];
  if (h && h.object.userData.rtsUnit) return { unit:h.object.userData.rtsUnit };
  // Pas besoin de toucher le modèle exactement : l'unité la plus proche du doigt (ou du pointeur) à l'écran
  // (rayon plus petit quand des unités sont déjà choisies : toucher juste à côté d'elles doit les déplacer)
  const near = rtsUnitNear(cx, cy, (isTouch ? RTS_TAP_R : RTS_TAP_R * .65) * (RTS.sel.length ? .55 : 1)); if (near) return { unit:near };
  if (h && h.object.userData.rtsNest) return { nest:h.object.userData.rtsNest };
  if (h && h.object.userData.rtsBld) return { bld:h.object.userData.rtsBld, x:h.object.userData.rtsBld.x, z:h.object.userData.rtsBld.z };
  const o = rtsRay.ray.origin, d = rtsRay.ray.direction; if (d.y >= -1e-4) return {};
  const t = -o.y / d.y; return { x:o.x + d.x * t, z:o.z + d.z * t };
}
function rtsSelect(list, add){
  if (!add) RTS.sel.length = 0;
  list.forEach(u => { if (!u.dead && RTS.sel.indexOf(u) < 0) RTS.sel.push(u); });
  if (list.length){ RTS.bsel = null; if (typeof Snd === 'object' && Snd.tone) Snd.tone(900, .05, 'square', .04, 1200); }
  rtsInfoShow();
}
function rtsOrder(p){
  if (!RTS.sel.length) return false;
  if (p.nest){ RTS.sel.forEach(u => { u.nest = p.nest; u.cmd = 'attack'; }); if (typeof toast === 'function') toast('Attaque du nid !'); }
  else if (p.x != null){
    const n = RTS.sel.length, cols = Math.ceil(Math.sqrt(n));
    RTS.sel.forEach((u, i) => { u.nest = null; u.cmd = 'move'; u.retreat = false; u.tx = p.x + ((i % cols) - (cols - 1) / 2) * 2.8; u.tz = p.z + (Math.floor(i / cols) - (cols - 1) / 2) * 2.8; });
    rtsMarker(p.x, p.z);
  } else return false;
  if (typeof Snd === 'object' && Snd.tone) Snd.tone(600, .06, 'triangle', .05, 800);
  return true;
}
// Toucher (ou cliquer) : une unité est choisie SEULE ; au doigt, un appui long (long) l'ajoute au groupe ou l'en retire.
// Toucher de nouveau la seule unité choisie la relâche. Toucher la carte envoie les unités choisies.
// Une unité touchée ou cliquée. mode : 'tap' (doigt), 'long' (appui long), 'click' (souris), 'add' (Maj+clic)
function rtsTapUnit(u, mode){
  const i = RTS.sel.indexOf(u);
  if (mode === 'long' || mode === 'add'){
    if (i >= 0){ RTS.sel.splice(i, 1); rtsInfoShow(); } else rtsSelect([u], true);
    if (mode === 'long' && navigator.vibrate) try { navigator.vibrate(25); } catch (e) { errNote(e); }
  }
  else if (mode === 'tap' && i >= 0 && RTS.sel.length === 1){ RTS.sel.length = 0; rtsInfoShow(); }
  else rtsSelect([u], false);
  return RTS.sel.slice();
}
function rtsTap(cx, cy, add, long){
  const p = rtsPick(cx, cy);
  if (RTS.rallyPick){ const g = rtsGround(cx, cy); if (g && typeof rtsRallySet === 'function') rtsRallySet(g.x, g.z); return; } // point de ralliement (js/49) : toujours le sol, même sous une unité
  if (RTS.place){ if (p.x != null){ if (isTouch) rtsGhostAt(p.x, p.z); else rtsPlaceAt(p.x, p.z); } return; }
  if (p.unit){ rtsTapUnit(p.unit, isTouch ? (long ? 'long' : 'tap') : (add ? 'add' : 'click')); return; }
  if (p.bld && !RTS.sel.length){ RTS.bsel = p.bld; rtsInfoShow(); return; }
  if (isTouch && RTS.sel.length) rtsOrder(p);
  else if (!add){ RTS.sel.length = 0; RTS.bsel = null; rtsInfoShow(); }
}
const rtsMark = new THREE.Mesh(new THREE.RingGeometry(.8, 1.2, 24), new THREE.MeshBasicMaterial({ color:0x9aff70, transparent:true, opacity:.9, depthWrite:false, side:THREE.DoubleSide }));
rtsMark.rotation.x = -Math.PI / 2; rtsMark.visible = false; scene.add(rtsMark);
let rtsMarkT = 0;
function rtsMarker(x, z){ rtsMark.position.set(x, .08, z); rtsMark.visible = true; rtsMarkT = .6; }
function rtsBoxSelect(x0, y0, x1, y1, add){
  const a = Math.min(x0, x1), b = Math.max(x0, x1), c = Math.min(y0, y1), d = Math.max(y0, y1), list = [];
  camera.updateMatrixWorld();
  RTS.units.forEach(u => { if (u.dead) return; rtsV.copy(u.g.position).project(camera); const sx = (rtsV.x + 1) / 2 * innerWidth, sy = (1 - rtsV.y) / 2 * innerHeight; if (sx >= a && sx <= b && sy >= c && sy <= d) list.push(u); });
  rtsSelect(list, add);
}
// Deux boutons à la fois : le navigateur n'envoie pas de « pointerdown » pour le 2e bouton enfoncé (clic droit pendant
// qu'on tient le clic gauche), seulement un « pointermove » ; on lit donc l'état des boutons (e.buttons : 1 = gauche, 2 = droit)
function rtsPilotBtns(e){
  if (!RTS.pilot || e.pointerType === 'touch' || typeof e.buttons !== 'number') return;
  if (e.button === 0) RTS.pv.fire = !!(e.buttons & 1) || !!RTS.pv.keyFire;      // seulement quand un bouton change (e.button vaut -1 sinon)
  if (e.button === 2) RTS.pv.fire2 = !!(e.buttons & 2) || !!RTS.pv.keyFire2;
}
canvas.addEventListener('pointerdown', e => {
  if (state !== 'rts' || RTS.paused || e.pointerType === 'touch') return;
  if (typeof Snd === 'object') Snd.init();
  if (RTS.pilot){ if (e.button === 0) RTS.pv.fire = true; if (e.button === 2) RTS.pv.fire2 = true; if (!plock && typeof lockPointer === 'function') lockPointer(); return; }
  if (e.button === 2){ if (RTS.place){ rtsCancelPlace(); return; } rtsOrder(rtsPick(e.clientX, e.clientY)); return; }
  if (e.button === 0) RTS.drag = { x:e.clientX, y:e.clientY, add:e.shiftKey, box:false };
});
document.addEventListener('pointermove', e => {
  if (state !== 'rts' || e.pointerType === 'touch') return;
  if (RTS.pilot){ rtsPilotBtns(e); if (!RTS.paused){ RTS.pv.yaw -= (e.movementX || 0) * .0022 * sens; RTS.pv.pitch -= (e.movementY || 0) * .0022 * sens; } return; }
  if (RTS.place){ const p = rtsPick(e.clientX, e.clientY); if (p.x != null) rtsGhostAt(p.x, p.z); }
  if (!RTS.drag || RTS.place) return;
  const D = RTS.drag; if (Math.hypot(e.clientX - D.x, e.clientY - D.y) > 8) D.box = true;
  if (D.box){ const s = rtsBox.style; s.display = 'block'; s.left = Math.min(D.x, e.clientX) + 'px'; s.top = Math.min(D.y, e.clientY) + 'px'; s.width = Math.abs(e.clientX - D.x) + 'px'; s.height = Math.abs(e.clientY - D.y) + 'px'; }
});
document.addEventListener('pointerup', e => {
  if (e.pointerType === 'touch') return;
  if (RTS.pilot){ if (e.button === 0) RTS.pv.fire = false; if (e.button === 2) RTS.pv.fire2 = false; return; }
  if (state !== 'rts' || !RTS.drag) return;
  const D = RTS.drag; RTS.drag = null; rtsBox.style.display = 'none';
  if (D.box && !RTS.place) rtsBoxSelect(D.x, D.y, e.clientX, e.clientY, D.add);
  else rtsTap(e.clientX, e.clientY, D.add);
});
document.addEventListener('wheel', e => { if (state === 'rts' && !RTS.pilot) RTS.cam.h = clamp(RTS.cam.h + e.deltaY * .05, 24, 100); }, { passive:true });
const RTS_KEYS = { KeyW:'f', KeyZ:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', KeyQ:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r' };
document.addEventListener('keydown', e => {
  if (state !== 'rts') return;
  if (RTS_KEYS[e.code]){ if (RTS.pilot) RTS.pv.mv[RTS_KEYS[e.code]] = 1; else RTS.keys[RTS_KEYS[e.code]] = 1; e.preventDefault(); }
  else if (e.code === 'KeyR' && RTS.place){ rtsRotate(); }
  else if (e.code === 'KeyF' && !RTS.paused){ if (RTS.pilot) rtsUnpilot(); else rtsPilotSel(); }
  else if (!RTS.pilot && /^Digit[1-9]$/.test(e.code)){ const t = RTS_HOTKEY[+e.code.slice(-1) - 1]; if (t) rtsBuy(t); }
  else if (e.code === 'KeyE' && RTS.pilot){ RTS.pv.fire2 = RTS.pv.keyFire2 = true; e.preventDefault(); } // 2e arme au clavier (Hellfire, 105 mm, roquettes du Mech)
  else if (e.code === 'Space'){ if (RTS.pilot) RTS.pv.fire = RTS.pv.keyFire = true; else rtsSelect(RTS.units.filter(u => !u.dead), false); e.preventDefault(); }
  else if (e.code === 'Escape' || e.code === 'KeyP'){
    if (RTS.photo){ if (typeof rtsPhoto === 'function') rtsPhoto(false); }
    else if (RTS.rallyPick){ RTS.rallyPick = false; if (typeof rtsCmdBtns === 'function') rtsCmdBtns(); }
    else if (RTS.place) rtsCancelPlace();
    else if (RTS.pilot && !RTS.paused) rtsUnpilot();
    else if (RTS.paused){ RTS.paused = false; rtsPanel.classList.add('hide'); }
    else rtsPause();
  }
});
document.addEventListener('keyup', e => { if (RTS_KEYS[e.code]){ RTS.keys[RTS_KEYS[e.code]] = 0; RTS.pv.mv[RTS_KEYS[e.code]] = 0; } if (e.code === 'Space') RTS.pv.fire = RTS.pv.keyFire = false; if (e.code === 'KeyE') RTS.pv.fire2 = RTS.pv.keyFire2 = false; });
(function(){
  const pts = new Map(); let tap = null;
  canvas.addEventListener('touchstart', e => {
    if (state !== 'rts' || (RTS.paused && !RTS.photo) || RTS.pilot) return; // mode photo : la caméra bouge au doigt
    e.preventDefault(); if (typeof Snd === 'object') Snd.init();
    for (const t of e.changedTouches) pts.set(t.identifier, { x:t.clientX, y:t.clientY });
    if (pts.size === 1){
      const t = e.changedTouches[0]; tap = { x:t.clientX, y:t.clientY, moved:false, t0:performance.now() };
      // Pose d'un bâtiment : un doigt posé près du fantôme le fait glisser (au lieu de déplacer la carte)
      RTS.ghostDrag = false;
      if (RTS.place && rtsGhost){ camera.updateMatrixWorld(); rtsV.copy(rtsGhost.position).project(camera); const sx = (rtsV.x + 1) / 2 * innerWidth, sy = (1 - rtsV.y) / 2 * innerHeight; if (Math.hypot(sx - t.clientX, sy - t.clientY) < 80) RTS.ghostDrag = true; }
    }
    else { tap = null; const a = [...pts.values()]; RTS.pinch = { d:Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), h:RTS.cam.h }; }
  }, { passive:false });
  canvas.addEventListener('touchmove', e => {
    if (state !== 'rts' || RTS.pilot) return;
    e.preventDefault();
    for (const t of e.changedTouches){
      const p = pts.get(t.identifier); if (!p) continue;
      if (pts.size === 1){
        const dx = t.clientX - p.x, dy = t.clientY - p.y;
        if (tap && Math.hypot(t.clientX - tap.x, t.clientY - tap.y) > 12) tap.moved = true;
        if (RTS.ghostDrag){ const q = rtsPick(t.clientX, t.clientY); if (q.x != null) rtsGhostAt(q.x, q.z); if (tap) tap.moved = true; }
        else if (!tap || tap.moved){ const k = RTS.cam.h / innerHeight * 1.4; RTS.cam.x -= dx * k; RTS.cam.z -= dy * k; }
      }
      p.x = t.clientX; p.y = t.clientY;
    }
    if (pts.size >= 2 && RTS.pinch){ const a = [...pts.values()]; const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); RTS.cam.h = clamp(RTS.pinch.h * RTS.pinch.d / Math.max(20, d), 24, 100); }
  }, { passive:false });
  const end = e => {
    if (state !== 'rts') return;
    for (const t of e.changedTouches) pts.delete(t.identifier);
    if (pts.size < 2) RTS.pinch = null;
    if (tap && !tap.moved && pts.size === 0 && e.changedTouches.length && !RTS.pilot){ const t = e.changedTouches[0]; rtsTap(t.clientX, t.clientY, true, performance.now() - tap.t0 > RTS_LONG_MS); }
    if (pts.size === 0){ tap = null; RTS.ghostDrag = false; }
  };
  canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
  // Pilotage au doigt : manette à gauche, glisser à droite pour viser (et tirer en même temps), bouton Tir
  const joy = $('rtrpJoy'), knob = $('rtrpKnob'), aimZ = $('rtrpAim'), P2 = RTS.pv, R2 = 46;
  const setJoy = (cx, cy) => { const b = joy.getBoundingClientRect(), x = cx - (b.left + b.width / 2), y = cy - (b.top + b.height / 2), d = Math.hypot(x, y), k = d > R2 ? R2 / d : 1; P2.joy.dx = clamp(x * k / R2, -1, 1); P2.joy.dy = clamp(y * k / R2, -1, 1); knob.style.transform = 'translate(' + (x * k).toFixed(0) + 'px,' + (y * k).toFixed(0) + 'px)'; };
  joy.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; P2.joy.id = t.identifier; setJoy(t.clientX, t.clientY); }, { passive:false });
  aimZ.addEventListener('touchstart', e => { e.preventDefault(); if (typeof Snd === 'object') Snd.init(); const t = e.changedTouches[0]; P2.aim.id = t.identifier; P2.aim.lx = t.clientX; P2.aim.ly = t.clientY; }, { passive:false });
  rtsPilotUI.addEventListener('touchmove', e => {
    for (const t of e.changedTouches){
      if (t.identifier === P2.joy.id) setJoy(t.clientX, t.clientY);
      else if (t.identifier === P2.aim.id){ P2.yaw -= (t.clientX - P2.aim.lx) * .005 * sens; P2.pitch -= (t.clientY - P2.aim.ly) * .005 * sens; P2.aim.lx = t.clientX; P2.aim.ly = t.clientY; }
    }
    if (e.cancelable) e.preventDefault();
  }, { passive:false });
  const pend = e => { for (const t of e.changedTouches){ if (t.identifier === P2.joy.id){ P2.joy.id = null; P2.joy.dx = P2.joy.dy = 0; knob.style.transform = ''; } if (t.identifier === P2.aim.id) P2.aim.id = null; } };
  rtsPilotUI.addEventListener('touchend', pend); rtsPilotUI.addEventListener('touchcancel', pend);
  const fb = $('rtrpFire');
  fb.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); P2.fire = true; fb.classList.add('down'); }, { passive:false });
  fb.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); P2.fire = false; fb.classList.remove('down'); });
  const fb2 = $('rtrpFire2');
  fb2.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); P2.fire2 = true; fb2.classList.add('down'); }, { passive:false });
  fb2.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); P2.fire2 = false; fb2.classList.remove('down'); });
  // Sortie : au toucher, au pointeur ou au clic (un seul suffit)
  const ex = $('rtrpExit'), out = e => { if (e){ e.preventDefault(); e.stopPropagation(); } if (RTS.pilot) rtsUnpilot(); };
  ex.addEventListener('touchstart', out, { passive:false }); ex.addEventListener('pointerdown', out); ex.addEventListener('click', out);
})();
rtsUI.querySelectorAll('#rtTabs button[data-tab]').forEach(b => b.addEventListener('click', () => rtsTab(b.dataset.tab)));
$('rtFold').addEventListener('click', () => rtsFold());
$('rtPause').addEventListener('click', () => rtsPause());
$('rtCancel').addEventListener('click', () => rtsCancelPlace());
$('rtRot').addEventListener('click', () => rtsRotate());
$('rtOk').addEventListener('click', () => { if (RTS.ghost) rtsPlaceAt(RTS.ghost.x, RTS.ghost.z); });
(function(){
  const ref = $('btnMech') || $('btnStart');
  if (ref && ref.parentNode && !$('btnRts')){
    const b = document.createElement('button'); b.className = 'ghost rts-btn'; b.id = 'btnRts'; b.type = 'button'; b.textContent = '⚔ Guerre des robots (stratégie)';
    ref.parentNode.insertBefore(b, ref.nextSibling);
    // Une partie est sauvée : il faut confirmer avant d'en commencer une nouvelle (elle effacerait la sauvegarde)
    b.addEventListener('click', () => {
      if (typeof rtsSaveGet === 'function' && rtsSaveGet() && b.dataset.ok !== '1'){
        b.dataset.ok = '1'; b.textContent = 'Confirmer : nouvelle partie (la partie sauvée sera effacée)';
        setTimeout(() => { b.dataset.ok = ''; b.textContent = '⚔ Guerre des robots (stratégie)'; }, 4000);
        return;
      }
      b.dataset.ok = ''; b.textContent = '⚔ Guerre des robots (stratégie)';
      if (typeof rtsSaveClear === 'function') rtsSaveClear();
      rtsStart();
    });
  }
})();

/* ---------- Crochets ---------- */
// Le RTS s'inscrit comme mode (js/00-base.js, branché dans js/90-branchements.js)
Jeu.mode('rts', {
  etats: { jeu:'rts', fin:'rtsover' },
  actif: () => RTS.on || state === 'rts' || state === 'rtsover',
  etape: dt => rtsStep(dt),
  image: dt => rtsFrame(dt),
  tue: (z, was) => {
    if (!RTS.on || !was) return;
    RTS.kills++;
    if (z.rtsBoss){ RTS.bossKills++; S.money += 1500; banner(ZTYPES[z.type].name + ' abattu !', 'Le boss est tombé · +' + fmt(1500), 2200); }
  },
  musique: () => {
    if (state === 'rts'){ for (const z of zombies) if (!z.dead && z.rtsBoss) return 'boss'; return RTS.threat > 3.5 ? 'boss' : 'wave'; }
    if (state === 'rtsover') return 'menu';
  },
  demarrer: () => rtsStart(), quitter: () => rtsQuit()
});
// Le marqueur d'ordre s'efface, même après la partie (événement commun 'image')
Jeu.on('image', dt => { if (rtsMarkT > 0){ rtsMarkT -= dt; rtsMark.material.opacity = rtsMarkT / .6; if (rtsMarkT <= 0) rtsMark.visible = false; } });
// Le pointeur est relâché (Échap) pendant qu'on pilote : pause
document.addEventListener('pointerlockchange', () => { if (state === 'rts' && RTS.pilot && !isTouch && !document.pointerLockElement && !RTS.paused) rtsUnpilot(); });

// Accès pour les tests automatiques
window.__rts = { RTS, RTS_UNITS, RTS_CFG, RTS_BLD, RTS_UPG, RTS_ROAD, RTS_BOSS, rtsStart, rtsQuit, rtsBuy, rtsStep, rtsSelect, rtsOrder, rtsPick, rtsSpawnUnit, rtsSpawnAt, rtsNestDie, rtsEnd, rtsPause,
  rtsBuild, rtsBldOk, rtsPlaceBld, rtsTurretUp, rtsSell, rtsUpgBuy, rtsUpgCost, rtsStat, rtsTStat, rtsStartPlace, rtsPlaceAt, rtsTap, rtsTab, rtsInfoShow,
  rtsGhostAt, rtsSnap, rtsRotate, rtsUnitNear, rtsTapUnit, rtsGround, RTS_TAP_R, RTS_LONG_MS, rtsFold, rtsCamHome, RTS_FLAT_R, rtsGunship, RTS_UPG_SPEC, rtsUpgPanel, rtsTurretPilot, rtsMortarSpot, rtsPilot, rtsUnpilot, rtsPilotSel, rtsPilotStep, rtsValleyX, rtsRoadDist, rtsClampValley, rtsRoadNext, rtsRoadX, rtsAddNest, rtsFront, rtsPickTarget, RTS_KITE };
