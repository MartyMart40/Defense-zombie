'use strict';
/* ================= Robot : bibites monstrueuses, boss, vagues constantes, carrefours à explorer ================= */
// Pour le mode robot (39-robot.js) seulement.
//   Bibites : Rôdeur (grand, griffes, bond quand il approche), Araignée (huit pattes, très rapide, zigzag),
//             Abomination (masse de chair, lente et énorme ; à sa mort, des rampants en sortent).
//   Boss (un toutes les 3 rues, à tour de rôle, plus forts à chaque tour) : Titan (géant, piétine le sol),
//             Mère pondeuse (araignée géante qui pond des petits), Béhémoth ailé (gargouille géante qui crache de l'acide).
//             Barre de vie en haut de l'écran.
//   Vagues : toutes les MW_EVERY s, une vague arrive de tous les côtés (devant, derrière, ruelles sur les côtés).
//   Carrefours : au bout de chaque rue, choix entre 3 rues (ville, météo et règle différentes) : on explore la ville.
// Matériaux : couleurs déjà présentes dans la palette des zombies (rendu par instances, aucun matériau de plus).

/* ---------- Données ---------- */
Object.assign(ZTYPES, {
  stalker:     { name:'Rôdeur',       hp:260,   speed:4.6, dmg:22,  reward:40,   scale:1.35, skin:0x6e5c70 },
  spider:      { name:'Araignée',     hp:90,    speed:6.2, dmg:8,   reward:18,   scale:1.1,  skin:0x4e5e3c },
  abomination: { name:'Abomination',  hp:1800,  speed:.75, dmg:40,  reward:260,  scale:2.3,  skin:0x748c3c, stopOff:1.6, hitShake:.8, chips:12 },
  titan:       { name:'Titan',        hp:45000, speed:.95, dmg:120, reward:3000, scale:4.2,  skin:0x5c7048, stopOff:5,   hitShake:1.4, chips:22, xp:400 },
  broodmother: { name:'Mère pondeuse', hp:35000, speed:.8, dmg:60,  reward:2500, scale:3.4,  skin:0x4e5e3c, stopOff:4,   hitShake:1, chips:16, xp:350 },
  behemoth:    { name:'Béhémoth ailé', hp:30000, speed:1.6, dmg:50, reward:2500, scale:3,    skin:0x6a6a5a, xp:350 }
});
Object.assign(ZXP, { stalker:14, spider:6, abomination:60 });
try { Object.assign(SCRAP_Z, { stalker:2.5, spider:1, abomination:12, titan:150, broodmother:120, behemoth:120 }); } catch (e) {}
const MB_BOSS = ['titan', 'broodmother', 'behemoth'];
const MB_WEAK = { coeur:{ mult:3, effet:'coeur' }, oeufs:{ mult:2.5, effet:'oeufs' } };
const MB = { waveN:0, waveT:0, routeN:0, spawned:{}, stomps:0, broods:0, spits:0 };
const MW_EVERY = 28;       // secondes entre deux vagues
// Le robot doit pouvoir poursuivre ceux qui marchent (39-robot.js : poursuite par derrière)
try { Object.assign(MECH_GROUND, { stalker:1, spider:1, abomination:1 }); } catch (e) {}
const mbV = new THREE.Vector3();
function mbRoar(big){
  if (typeof Snd !== 'object' || !Snd.ctx || !Snd._osc) return;
  try { const t = Snd.ctx.currentTime, o = Snd._fx ? Snd._fx() : null;
    Snd._osc(t, 'sawtooth', big ? 70 : 140, big ? 38 : 70, 1.4, .25, o); Snd._osc(t, 'square', big ? 105 : 190, big ? 52 : 95, 1.2, .08, o); Snd._nz(t, 'bandpass', 500, 1.5, 1.3, .18, o, 200, .1);
  } catch (e) {}
}

/* ---------- Rôdeur : grand, maigre, longues griffes ; bondit quand il arrive près ---------- */
ZKINDS.stalker = {
  build(T){
    const R = buildHumanoid(T, 'civil'), dark = zmat(ZC.noir);
    [R.armL, R.armR].forEach(a => { if (!a) return; zkMesh(a, ZKG.box, dark, .06, .45, .06, -.05, -.95, .08); zkMesh(a, ZKG.box, dark, .06, .45, .06, .05, -.95, .08); }); // griffes
    for (let i = 0; i < 4; i++) zkMesh(R.body, ZKG.box, dark, .06, .22, .06, 0, 1.75 - i * .2, -.2).rotation.x = -.6;              // épines du dos
    return R;
  },
  init(z){ z.lunge = 0; },
  update(z, dt){
    if (z.st === 'walk' && !z.lunged && z.g.position.z > z.stopZ - 14){ z.lunged = true; z.lunge = 1; z.speed0 = z.speed; z.speed *= 2.6; }
    if (z.lunge > 0){ z.lunge -= dt; if (z.lunge <= 0) z.speed = z.speed0; }
    if (z.body) z.body.rotation.x = z.st === 'walk' ? .45 : .2; // penché vers l'avant
    return false;
  }
};

/* ---------- Araignée : huit pattes, rapide, zigzag ---------- */
function mbSpiderBuild(T, sc, eggs){
  const skin = zmat(T.skin), dark = zmat(ZC.noir);
  const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), P = [];
  zkMesh(body, ZKG.sph, skin, .32, .24, .34, 0, .55, .15, P);                    // céphalothorax
  zkMesh(body, ZKG.sph, dark, .46, .38, .56, 0, .65, -.55, P);                     // abdomen
  const head = zkMesh(body, ZKG.sph, skin, .18, .16, .18, 0, .58, .48, P);
  for (let i = 0; i < 4; i++) zkMesh(body, ZKG.box, eyeMat, .05, .05, .02, -.09 + i * .06, .64 + (i % 2) * .03, .63); // quatre yeux
  zkMesh(body, ZKG.box, ZKM.mouth, .14, .06, .04, 0, .5, .64);
  if (eggs) [[-.25, .9, -.6], [.25, .85, -.45], [0, 1, -.8], [.22, .7, -.85], [-.2, .72, -.3]].forEach(p => zkWeak(zkMesh(body, ZKG.sph, ZKM.acid, .14, .14, .14, p[0], p[1], p[2], P), MB_WEAK.oeufs));
  const rig = { legs:[] };
  for (let i = 0; i < 8; i++){
    const s = i < 4 ? -1 : 1, k = i % 4, hip = zkGroup(body, s * .25, .58, .32 - k * .18);
    hip.rotation.z = s * 1.1; hip.rotation.y = s * (k - 1.5) * .35;
    zkMesh(hip, ZKG.top, skin, .06, .55, .06, 0, 0, 0, P);
    const knee = zkGroup(hip, 0, -.55, 0); knee.rotation.z = -s * 1.9;
    zkMesh(knee, ZKG.top, dark, .05, .7, .05, 0, 0, 0, P);
    rig.legs.push(hip);
  }
  g.scale.setScalar(sc); g.userData.rig = rig;
  return { g, body, head, parts:P, mats:[skin, dark], aimY:.6 * sc };
}
function mbSpiderMove(z, dt, k){
  const R = z.rig, gp = z.g.position;
  z.phase += dt * (z.st === 'walk' ? z.speed * 3 : 10) * k;
  R.legs.forEach((l, i) => { l.rotation.x = Math.sin(z.phase + i * 1.3) * .45; });
  z.body.position.y = Math.abs(Math.sin(z.phase * 2)) * .04;
  if (z.st === 'walk'){
    gp.z += z.speed * dt;
    gp.x = clamp(gp.x + Math.sin(z.phase * .2 + (z.zig || 0)) * 2.4 * dt * k, -12, 12);
    if (gp.z >= z.stopZ){ gp.z = z.stopZ; z.st = 'attack'; z.atkT = rand(.2, .5); }
  } else {
    z.atkT -= dt;
    if (z.atkT <= 0){ z.atkT = rand(.5, .8) / k; const ZT = ZTYPES[z.type] || {}; hitBarricade(z, z.dmg, ZT.hitShake || .06, ZT.chips || 1); }
  }
}
ZKINDS.spider = {
  build(T){ return mbSpiderBuild(T, T.scale, false); },
  init(z){ z.rig = z.g.userData.rig; z.zig = rand(0, 6); },
  update(z, dt){ mbSpiderMove(z, dt, 1); return true; }
};

/* ---------- Abomination : masse de chair, plusieurs têtes et bras ; des rampants en sortent à sa mort ---------- */
ZKINDS.abomination = {
  build(T){
    const skin = zmat(T.skin), flesh = zmat(0x7a2e2e), dark = zmat(0x5c7048);
    const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), P = [];
    zkMesh(body, ZKG.sph, skin, .9, .8, .8, 0, 1, 0, P);
    zkMesh(body, ZKG.sph, flesh, .55, .5, .5, .45, 1.4, .25, P); zkMesh(body, ZKG.sph, dark, .5, .45, .5, -.5, .8, .2, P);
    const head = zkMesh(body, ZKG.box, skin, .4, .42, .4, 0, 1.9, .35, P);
    zkEyes(body, 1.95, .56, .1, 1.3);
    [[-.55, 1.55, .3], [.6, 1.0, .45]].forEach(p => { zkMesh(body, ZKG.box, dark, .3, .3, .3, p[0], p[1], p[2], P); zkEyes(body, p[1] + .05, p[2] + .16, .07); }); // têtes en plus
    zkMesh(body, ZKG.box, ZKM.mouth, .5, .14, .05, 0, 1.15, .78);                     // grande gueule
    const arms = [];
    [[-.85, 1.3, .2, 1], [.85, 1.3, .2, -1], [-.6, .7, .45, 1], [.7, 1.7, -.1, -1]].forEach(p => {
      const a = zkGroup(body, p[0], p[1], p[2]); a.rotation.z = p[3] * .5; zkMesh(a, ZKG.top, p[3] > 0 ? skin : dark, .2, 1.1, .2, 0, 0, 0, P); arms.push(a);
    });
    g.scale.setScalar(T.scale); g.userData.arms = arms;
    return { g, body, head, parts:P, mats:[skin, flesh, dark], aimY:1.1 * T.scale };
  },
  init(z){ z.arms = z.g.userData.arms; },
  update(z, dt){
    const gp = z.g.position; z.phase += dt * (z.st === 'walk' ? 2 : 6);
    z.arms.forEach((a, i) => { a.rotation.x = -1 + Math.sin(z.phase + i * 1.7) * .6; });
    z.body.rotation.z = Math.sin(z.phase * .5) * .08; z.body.scale.y = 1 + Math.sin(z.phase * 1.3) * .04;
    if (z.st === 'walk'){ gp.z += z.speed * dt; if (gp.z >= z.stopZ){ gp.z = z.stopZ; z.st = 'attack'; z.atkT = rand(.4, .8); } }
    else { z.atkT -= dt; if (z.atkT <= 0){ z.atkT = rand(1.2, 1.6); const ZT = ZTYPES[z.type]; hitBarricade(z, z.dmg, ZT.hitShake, ZT.chips); } }
    return true;
  },
  onKill(z){ if (typeof mnSpawnGroup === 'function'){ MB.broods++; mnSpawnGroup(z, 'crawler', 5, 1.5); } }
};

/* ---------- Boss ---------- */
function mbBossIntro(z){
  const T = ZTYPES[z.type] || {};
  banner('⚠ ' + T.name, state === 'rts' ? 'Il arrive par la vieille route' : 'Boss de la rue ' + (typeof MECH === 'object' ? MECH.street : ''), 2600);
  mbRoar(true); shake = Math.max(shake, .6);
  if (typeof vib === 'function') vib([120, 60, 160], 40);
}
// Titan : un géant ; quand il approche, il frappe le sol (tout tremble, le robot prend des dégâts)
ZKINDS.titan = {
  build(T){
    const R = buildHumanoid(T, 'foreur'), dark = zmat(ZC.noir);
    zkWeak(zkMesh(R.body, ZKG.box, ZKM.core, .3, .3, .06, 0, 1.3, .2, R.parts), MB_WEAK.coeur);               // cœur qui brille
    [-1, 1].forEach(s => { for (let i = 0; i < 3; i++) zkMesh(R.body, ZKG.box, dark, .08, .3, .08, s * (.3 + i * .08), 1.75, -.05).rotation.z = s * -.5; }); // pointes des épaules
    return R;
  },
  init(z){ z.boss = true; z.stompT = rand(3, 5); mbBossIntro(z); },
  onWeak(z, m, amt, pt, wk){ return wk.effet === 'coeur' ? { txt:'Cœur' } : null; },
  update(z, dt){
    z.stompT -= dt;
    if (z.stompT <= 0 && z.g.position.z > z.stopZ - 30){
      z.stompT = rand(4.5, 6.5); MB.stomps++;
      shake = Math.max(shake, 1); mbV.set(z.g.position.x, .3, z.g.position.z); burst(mbV, 'dust', 26, 7);
      if (typeof Snd === 'object' && Snd.boom) Snd.boom(1.4);
      if (S && z.g.position.z > z.stopZ - 22) S.bar = Math.max(0, S.bar - z.dmg * .35);           // l'onde de choc touche le robot
      if (typeof vib === 'function') vib([90, 40, 140], 30);
    }
    return false; // marche et frappe comme un géant humanoïde
  }
};
// Mère pondeuse : araignée géante ; ses sacs d'œufs sont un point faible ; elle pond des petits
ZKINDS.broodmother = {
  build(T){ return mbSpiderBuild(T, T.scale, true); },
  init(z){ z.boss = true; z.rig = z.g.userData.rig; z.zig = rand(0, 6); z.layT = 3; mbBossIntro(z); },
  onWeak(z, m, amt, pt, wk){ return wk.effet === 'oeufs' ? { txt:'Œufs' } : null; },
  update(z, dt){
    mbSpiderMove(z, dt, .5);
    z.layT -= dt;
    if (z.layT <= 0){ z.layT = rand(4.5, 6); MB.broods++; if (typeof mnSpawnGroup === 'function') mnSpawnGroup(z, Math.random() < .5 ? 'spider' : 'crawler', 3, 2.5); mbRoar(false); }
    return true;
  }
};
// Béhémoth ailé : gargouille géante ; vole haut, crache de l'acide sur le robot, plonge
ZKINDS.behemoth = {
  build(T){ return ZKINDS.gargoyle.build(T); },
  init(z){ ZKINDS.flyer.init(z); z.boss = true; z.alt = rand(11, 14); z.g.position.y = z.alt; z.spitT = 3; mbBossIntro(z); },
  onWeak(z, m, amt, pt, wk){ return wk.effet === 'ventre' ? { txt:'Ventre' } : null; },
  update(z, dt){
    const r = ZKINDS.flyer.update(z, dt * .6);
    if (z.st === 'walk') z.g.position.z += z.speed * dt * .4;
    z.spitT -= dt;
    if (z.spitT <= 0 && z.g.position.z > -80 && typeof spitLaunch === 'function'){
      z.spitT = rand(2.2, 3.4); MB.spits++;
      const gp = z.g.position, mx = typeof MECH === 'object' ? MECH.x : 0;
      for (let i = 0; i < 3; i++) spitLaunch(gp.x, gp.y, gp.z, mx + rand(-2, 2), 3, BAR_Z + rand(-.5, .5), z.dmg * .25);
      mbRoar(false);
    }
    return r;
  }
};
const mbBossAlive = () => { for (const z of zombies) if (!z.dead && (MB_BOSS.indexOf(z.type) >= 0 || z.type === 'boss')) return z; return null; };

/* ---------- Plans des rues : bibites, boss, règles du carrefour ---------- */
function mbReplace(q, type, n){
  const idx = []; for (let i = 0; i < q.length; i++) if (q[i] === 'walker') idx.push(i);
  for (let i = idx.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  n = Math.min(n, Math.floor(idx.length * .5));
  for (let i = 0; i < n; i++) q[idx[i]] = type;
}
try {
  const _mp = mechPlan;
  mechPlan = function(){
    const p = _mp.apply(this, arguments);
    try {
      const n = MECH.street, RT = MECH.route || {}, tot = p.queue.length;
      // Bibites monstrueuses : de plus en plus nombreuses
      const nest = RT.nest ? 2.5 : 1;
      mbReplace(p.queue, 'spider', Math.round(tot * Math.min(.12, .03 + .01 * n) * nest));
      if (n >= 2) mbReplace(p.queue, 'stalker', Math.round(tot * Math.min(.08, .015 * n) * nest));
      if (n >= 2) mbReplace(p.queue, 'abomination', Math.max(1, Math.round(tot / 70 * (1 + .2 * n))));
      // Boss : les boss du robot remplacent le boss normal ; un toutes les 3 rues (et sur la Grande avenue)
      for (let i = p.queue.length - 1; i >= 0; i--) if (p.queue[i] === 'boss' || MB_BOSS.indexOf(p.queue[i]) >= 0) p.queue.splice(i, 1);
      if (!MB.spawned[n] && (n % 3 === 0 || RT.boss)){
        const b = MB_BOSS[(Math.floor(n / 3) + (RT.boss ? 1 : 0)) % MB_BOSS.length];
        p.queue.splice(Math.round(p.queue.length * .45), 0, b); MB.spawned[n] = true;
      }
      // Règle de la rue choisie au carrefour
      if (RT.zMult){ const k = RT.zMult; p.maxAlive = Math.min(DEV_CAP, Math.round(p.maxAlive * k)); p.interval /= k; }
      if (RT.spd) p.spdMult *= RT.spd;
    } catch (e) {}
    return p;
  };
} catch (e) {}

/* ---------- Vagues : de tous les côtés, régulièrement ---------- */
const MB_SIDE = ['walker', 'runner', 'crawler', 'spider', 'stalker', 'bloater', 'shield'];
function mbWave(){
  MB.waveN++;
  const n = Math.min(10 + 3 * MB.waveN + 2 * MECH.street, 60), MZ = MECH_CAM.z;
  let alive = zAliveCount(); const room = Math.max(0, Math.min(DEV_CAP, plan.maxAlive + 20) - alive);
  const tot = Math.min(n, room); let k = 0;
  banner('Vague ' + MB.waveN + ' !', 'Ils arrivent de partout', 1600);
  if (typeof Snd === 'object' && Snd.tone){ Snd.tone(330, .25, 'square', .06, 220); Snd.tone(330, .25, 'square', .06, 220, .35); }
  for (let i = 0; i < tot; i++){
    const t = pick(MB_SIDE.filter(x => MECH.street >= 2 || (x !== 'stalker' && x !== 'shield')));
    const z = spawnZombie(t); if (!z) continue; k++;
    const r = i / tot, gp = z.g.position;
    if (r < .5) gp.z = rand(-110, -70);                                         // devant, au bout de la rue
    else if (r < .8){ gp.z = MZ + rand(16, 30); gp.x = rand(-10, 10); }        // derrière
    else { gp.x = (Math.random() < .5 ? -1 : 1) * 13; gp.z = MZ - rand(10, 32); } // ruelles sur les côtés
    z.g.updateMatrixWorld(true);
  }
  return k;
}

/* ---------- Carrefours : on choisit la prochaine rue ---------- */
const MB_RULES = [
  { id:'calme',   title:'Rue calme',            desc:'Moins de zombies ; blindage réparé à fond en arrivant.', zMult:.7, repairFull:true, scrap:1 },
  { id:'ruelle',  title:'Ruelles sombres',      desc:'Nuit noire, +40 % de zombies, ferraille ×2.', weather:'nuit', zMult:1.4, scrap:2 },
  { id:'avenue',  title:'Grande avenue',        desc:'Un boss t’y attend. Prime de 500 ⚙ si tu en sors.', boss:true, scrap:1, prime:500 },
  { id:'nid',     title:'Nid de bibites',       desc:'Plein d’araignées et de rôdeurs ; ferraille ×1,5.', nest:true, scrap:1.5 },
  { id:'tempete', title:'Quartier sous l’orage', desc:'Orage ; zombies 20 % plus rapides ; ferraille ×1,5.', weather:'orage', spd:1.2, scrap:1.5 },
  { id:'soleil',  title:'Boulevard ensoleillé', desc:'Grand soleil, rue dégagée : vue de loin.', weather:'soleil', scrap:1 }
];
const MB_DIRS = ['⬅ À gauche', '⬆ Tout droit', '➡ À droite'];
function mbRoutes(){
  const rules = MB_RULES.slice().sort(() => Math.random() - .5).slice(0, 3);
  const locs = LOCS.slice().sort(() => Math.random() - .5);
  return rules.map((r, i) => Object.assign({ dir:MB_DIRS[i], loc:locs[i % locs.length] }, r));
}
function mbCrossroads(){
  if (MECH.choosing) return;
  MECH.choosing = true; MECH.paused = true; firing = false; MECH.mini = MECH.rocket = false;
  if (typeof Snd === 'object' && Snd._mgStop) Snd._mgStop();
  // Prime de la rue qu'on vient de traverser
  const RT = MECH.route;
  if (RT && RT.prime){ P.scrap = (P.scrap || 0) + RT.prime; saveP(); if (typeof toast === 'function') toast('Prime de la Grande avenue : +' + RT.prime + ' ⚙'); }
  const routes = mbRoutes(); MB.routes = routes;
  let h = '<h2 class="title sm">Carrefour</h2><p class="lead">Rue ' + MECH.street + ' nettoyée. Par où continuer ?</p><div class="mk-upg">';
  routes.forEach(r => { h += '<div class="row"><div class="info"><div class="nm">' + r.dir + ' : ' + r.title + '</div><div class="ds">' + r.loc.name + ' · ' + r.desc + '</div></div></div>'; });
  h += '</div>';
  if (typeof unlockPointer === 'function') unlockPointer();
  mechShowPanel(h, routes.map(r => [r.dir + ' : ' + r.title, () => mbGo(r)]));
}
function mbGo(r){
  MECH.route = r; MECH.choosing = false; MECH.paused = false; MB.routeN++;
  mechPanel.classList.add('hide');
  MECH.fade = 1.2; MECH.fadeTo = 'street';
  if (typeof lockPointer === 'function') lockPointer();
}

/* ---------- Barre de vie du boss ---------- */
const mbBar = document.createElement('div'); mbBar.id = 'mkBoss'; mbBar.className = 'hide';
mbBar.innerHTML = '<span id="mkBossName"></span><div class="mk-bar"><i id="mkBossFill"></i></div>';
(function(){ const ui = $('mechUI'); if (ui) ui.appendChild(mbBar); })();
function mbBossHUD(){
  const b = MECH.on ? mbBossAlive() : null;
  mbBar.classList.toggle('hide', !b); if (!b) return;
  const n = $('mkBossName'), f = $('mkBossFill'), nm = b.type === 'boss' ? 'Boss' : (ZTYPES[b.type] || {}).name;
  if (n && n.textContent !== nm) n.textContent = nm;
  if (f) f.style.width = (clamp(b.hp / b.maxHp, 0, 1) * 100).toFixed(1) + '%';
}

/* ---------- Crochets ---------- */
try {
  const _st = mechStep;
  mechStep = function(dt){
    // Au bout de la rue : carrefour (au lieu de passer tout de suite à la suivante)
    if (MECH.on && state === 'mech' && !MECH.paused && !MECH.choosing && MECH.fade <= 0 && MECH.dist >= MECH_LEN){ mbCrossroads(); return; }
    const r = _st.apply(this, arguments);
    if (MECH.on && state === 'mech' && !MECH.paused){
      MB.waveT -= dt;
      if (MB.waveT <= 0){ MB.waveT = MW_EVERY; mbWave(); }
    }
    return r;
  };
} catch (e) {}
try {
  const _s = mechStreet;
  mechStreet = function(first){
    if (first){ MB.waveN = 0; MB.spawned = {}; MECH.route = null; MECH.choosing = false; }
    MB.waveT = first ? 14 : 10;
    const r = _s.apply(this, arguments);
    if (!first && MECH.route && MECH.route.repairFull && S) S.bar = S.barMax;
    return r;
  };
} catch (e) {}
try { const _h = mechHUD; mechHUD = function(){ const r = _h.apply(this, arguments); mbBossHUD(); return r; }; } catch (e) {}
// Ferraille de la rue choisie (Ruelles sombres ×2, etc.)
try { const _sf = scrapFor; scrapFor = function(){ const v = _sf.apply(this, arguments); return MECH.on && MECH.route && MECH.route.scrap ? v * MECH.route.scrap : v; }; } catch (e) {}
// Musique de boss pour les boss du robot
try { const _a = ambMusicState; ambMusicState = function(){ if (state === 'mech' && mbBossAlive()) return 'boss'; return _a.apply(this, arguments); }; } catch (e) {}
// Pendant le choix du carrefour, la pause et la reprise ne font rien (le choix reste à l'écran)
try { const _pz = mechPause; mechPause = function(){ if (MECH.choosing) return; return _pz.apply(this, arguments); }; mechPause.again = _pz.again; } catch (e) {}
try { const _rs = mechResume; mechResume = function(){ if (MECH.choosing) return; return _rs.apply(this, arguments); }; } catch (e) {}
try { const _q = mechQuit; mechQuit = function(){ MECH.choosing = false; MECH.route = null; mbBar.classList.add('hide'); return _q.apply(this, arguments); }; } catch (e) {}

// Accès pour les tests automatiques
window.__mb = { MB, MB_BOSS, MB_RULES, MW_EVERY, mbWave, mbCrossroads, mbGo, mbRoutes, mbBossAlive };
