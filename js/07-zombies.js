'use strict';
/* ================= Zombies ================= */
// Modèle humanoïde par défaut (walker, runner, brute). Les autres formes sont dans 18-zombies-types.js (ZKINDS).
const ZG = { torso:new THREE.BoxGeometry(.62, .8, .34), head:new THREE.BoxGeometry(.4, .42, .4), arm:new THREE.BoxGeometry(.17, .72, .17), leg:new THREE.BoxGeometry(.22, .86, .24), eye:new THREE.BoxGeometry(.08, .05, .02) };
ZG.arm.translate(0, -.36, 0); ZG.leg.translate(0, -.43, 0);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3a1a });
const SHIRTS = [0x5b3a2e, 0x3d4a5c, 0x6a6a5a, 0x7a2e2e, 0x4b5a3a, 0x8a7a60, 0x3a3a44];
const PANTS = [0x2b2b33, 0x3a3226, 0x24303a, 0x403a32];
const zkind = type => (typeof ZKINDS !== 'undefined' && ZKINDS[type]) || null;

/* ---------- Foule : matériaux partagés, rendu par instances, cibles pré-triées ---------- */
// Réglages de performance (voir aussi BASE_ALIVE, DEV_CAP et aliveCap dans 06-donnees.js)
//   farD : au-delà (m de la caméra, à plat), modèle simplifié : sans les tout petits morceaux (yeux, gueule, griffes)
//   farPose : loin, la pose des membres est recalculée une image sur farPose (la position suit chaque image)
const ZPERF = { farD: 55, farPose: 3, smallR: .1 };
// Matériaux : un seul par couleur, partagé par tous les zombies (userData.zshared). Jamais libérés.
// Le flash rouge des coups passe par la couleur d'instance (hitC), pas par le matériau.
const ZMATS = new Map();
const zHitTint = new THREE.Color(.47, .13, .07);
function zmat(hex){
  let m = ZMATS.get(hex);
  if (!m){
    m = new THREE.MeshLambertMaterial({ color: hex });
    m.userData.zshared = true; m.userData.keep = true;
    m.userData.hitC = m.color.clone().multiplyScalar(.7).add(zHitTint);
    ZMATS.set(hex, m);
  }
  return m;
}
// Matériau fixe partagé (yeux, acide, gueule...) : utilisable par le rendu par instances
const zfix = m => { m.userData.zfixed = true; m.userData.keep = true; return m; };
zfix(eyeMat);
// Rendu par instances : un InstancedMesh par couple (géométrie, matériau). Tous les zombies dont les maillages
// utilisent seulement des matériaux zmat/zfix y passent : environ 12 appels de dessin pour toute la foule.
// Les autres (le boss, un type externe avec ses propres matériaux) restent de vrais objets dans la scène.
const zInstRoot = new THREE.Group(); scene.add(zInstRoot);
const ZI_MAT = new THREE.MeshLambertMaterial({ color: 0xffffff }); // couleur donnée par l'instance
const ZI_FIX = new Map(); // matériau fixe → sa copie réservée aux instances
const ZB = new Map(); // clé → lot { im, geo, mat, col, cap, n }
const zbList = [];
function zMakeIM(b, cap){
  const im = new THREE.InstancedMesh(b.geo, b.mat, cap);
  if (b.col) im.setColorAt(0, ZI_MAT.color); // crée instanceColor avant le premier rendu
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  if (im.instanceColor) im.instanceColor.setUsage(THREE.DynamicDrawUsage);
  im.frustumCulled = false; im.count = 0; im.visible = false; im.userData.zinst = true;
  return im;
}
function zBatch(geo, mat){
  const col = !!mat.userData.zshared, key = geo.uuid + (col ? '|c' : '|' + mat.uuid);
  let b = ZB.get(key);
  if (!b){
    let m = ZI_MAT;
    if (!col){ m = ZI_FIX.get(mat); if (!m){ m = mat.clone(); m.userData.zinst = true; ZI_FIX.set(mat, m); } }
    b = { geo, mat:m, col, cap:64, n:0, im:null };
    b.im = zMakeIM(b, b.cap); zInstRoot.add(b.im);
    ZB.set(key, b); zbList.push(b);
  }
  return b;
}
function zGrow(b){
  const old = b.im, cap = b.cap * 2, im = zMakeIM(b, cap);
  im.instanceMatrix.array.set(old.instanceMatrix.array);
  if (b.col) im.instanceColor.array.set(old.instanceColor.array);
  zInstRoot.remove(old); old.dispose();
  b.im = im; b.cap = cap; zInstRoot.add(im);
}
// Le zombie peut-il passer par les instances ? (tous ses maillages ont un matériau partagé)
function zInstOk(g){
  let ok = true;
  g.traverse(o => { if (o.isMesh){ const m = o.material; if (!m || Array.isArray(m) || !(m.userData.zshared || m.userData.zfixed)) ok = false; } });
  return ok;
}
function zInstPrep(z, mats){
  const I = []; z.g.updateMatrixWorld(true);
  z.g.traverse(o => {
    if (!o.isMesh) return;
    const mat = o.material, col = !!mat.userData.zshared;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    I.push({ m:o, b:zBatch(o.geometry, mat), mat:col ? mat : null, fl:col && (mat === mats[0] || mat === mats[1]),
      small:o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() < ZPERF.smallR });
  });
  z.inst = I;
}
let zFrame = 0, zUid = 0;
// Matrices des maillages à jour (sans attendre le rendu) : la cible d'un tir est toujours exacte
function zFresh(z){
  const p = z.g.position;
  if (z._mwF === zFrame && z._mwX === p.x && z._mwY === p.y && z._mwZ === p.z) return;
  z.g.updateMatrixWorld(true);
  z._mwF = zFrame; z._mwX = p.x; z._mwY = p.y; z._mwZ = p.z;
}
// Loin : la pose (membres) est recalculée une image sur ZPERF.farPose, relative au groupe g ; la position, elle, suit
// chaque image (g ne tourne jamais : monde = position + échelle × pose relative, sans multiplication de matrices).
function zRel(z){
  const g = z.g; g.updateMatrix(); g.matrixWorld.identity();
  const C = g.children; for (let i = 0; i < C.length; i++) C[i].updateMatrixWorld(true);
  const I = z.inst; for (let k = 0; k < I.length; k++){ const e = I[k]; (e.rel || (e.rel = new THREE.Matrix4())).copy(e.m.matrixWorld); }
  z._rel = true; z._mwF = -1; // les matrices des maillages sont relatives : zFresh les remettra au monde pour un tir
}
// Chaque image avant le rendu (crochet dans 27-perf.js) : copie les matrices dans les lots d'instances
function zInstSync(){
  zFrame++;
  for (let i = 0; i < zbList.length; i++) zbList[i].n = 0;
  const cx = camera.position.x, cz = camera.position.z, FD = ZPERF.farD * ZPERF.farD, FP = ZPERF.farPose;
  for (let i = 0; i < zombies.length; i++){
    const z = zombies[i], I = z.inst; if (!I || !z.g.visible) continue;
    const p = z.g.position, dx = p.x - cx, dz = p.z - cz, far = dx * dx + dz * dz > FD;
    if (far){ if (!z._rel || (zFrame + z.uid) % FP === 0) zRel(z); }
    else { zFresh(z); z._rel = false; }
    const fl = z.flashT > 0, s = z.g.scale, sx = s.x, sy = s.y, sz = s.z, px = p.x, py = p.y, pz = p.z;
    for (let k = 0; k < I.length; k++){
      const e = I[k], m = e.m;
      if (!m.visible || (far && e.small)) continue;
      const b = e.b; if (b.n >= b.cap) zGrow(b);
      const a = b.im.instanceMatrix.array, o = b.n * 16;
      if (far){
        const r = e.rel.elements;
        a[o] = sx * r[0]; a[o + 1] = sy * r[1]; a[o + 2] = sz * r[2]; a[o + 3] = 0;
        a[o + 4] = sx * r[4]; a[o + 5] = sy * r[5]; a[o + 6] = sz * r[6]; a[o + 7] = 0;
        a[o + 8] = sx * r[8]; a[o + 9] = sy * r[9]; a[o + 10] = sz * r[10]; a[o + 11] = 0;
        a[o + 12] = sx * r[12] + px; a[o + 13] = sy * r[13] + py; a[o + 14] = sz * r[14] + pz; a[o + 15] = 1;
      } else m.matrixWorld.toArray(a, o);
      if (b.col){ const c = fl && e.fl ? e.mat.userData.hitC : e.mat.color, ca = b.im.instanceColor.array, co = b.n * 3; ca[co] = c.r; ca[co + 1] = c.g; ca[co + 2] = c.b; }
      b.n++;
    }
  }
  for (let i = 0; i < zbList.length; i++){
    const b = zbList[i], im = b.im;
    if (!b.n && !im.count) continue;
    im.count = b.n; im.visible = b.n > 0;
    im.instanceMatrix.needsUpdate = true; im.instanceMatrix.updateRange.count = b.n * 16;
    if (b.col){ im.instanceColor.needsUpdate = true; im.instanceColor.updateRange.count = b.n * 3; }
  }
}
// Cibles des tirs : chaque zombie n'a qu'UNE entrée dans hitMeshes, une boîte englobante (proxy).
// Le rayon teste d'abord la boîte, puis seulement les vrais maillages de ce zombie (tête, points faibles exacts).
// Les intersections rendues sont celles des vrais maillages (userData.z, head, weak) : rien ne change pour 08, 20, 21.
const ZBOX = {}; // type → boîte locale (sans l'échelle de g), marge pour les animations
const zBoxW = new THREE.Box3(), zRayP = new THREE.Vector3();
function zBoxFor(type, g){
  if (ZBOX[type]) return;
  g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(g), s = g.scale, p = g.position;
  b.min.sub(p); b.max.sub(p); b.min.x /= s.x; b.min.y /= s.y; b.min.z /= s.z; b.max.x /= s.x; b.max.y /= s.y; b.max.z /= s.z;
  const sz = new THREE.Vector3(); b.getSize(sz); b.expandByScalar(Math.max(sz.x, sz.y, sz.z) * .3 + .1);
  ZBOX[type] = b;
}
function zProxyRaycast(rc, out){
  const z = this.userData.z; if (!z || z.dead) return;
  const B = ZBOX[z.type]; if (!B) return;
  const p = z.g.position, s = z.g.scale;
  zBoxW.min.set(p.x + B.min.x * s.x, p.y + B.min.y * s.y, p.z + B.min.z * s.z);
  zBoxW.max.set(p.x + B.max.x * s.x, p.y + B.max.y * s.y, p.z + B.max.z * s.z);
  // (départ dans la boîte : intersectBox donne la sortie, on garde donc ce cas à part)
  if (!zBoxW.containsPoint(rc.ray.origin) && (!rc.ray.intersectBox(zBoxW, zRayP) || rc.ray.origin.distanceTo(zRayP) > rc.far)) return;
  zFresh(z);
  const M = z.meshes; for (let i = 0; i < M.length; i++) M[i].raycast(rc, out);
}
// Vivants sans créer de tableau (appelé chaque image par 15-boucle.js)
function zAliveCount(){ let n = 0; for (let i = 0; i < zombies.length; i++) if (!zombies[i].dead) n++; return n; }
// Foule : moins de particules par coup quand il y a beaucoup de zombies (le pool de 05 tourne moins vite)
const zCrowdK = () => zombies.length > 150 ? .35 : zombies.length > 60 ? .65 : 1;
const zBurst = (pos, type, n, spd) => burst(pos, type, Math.max(1, Math.round(n * zCrowdK())), spd);

function buildHumanoid(T){
  const skin = zmat(T.skin), shirt = zmat(pick(SHIRTS)), pants = zmat(pick(PANTS));
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const mk = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); body.add(m); return m; };
  // Petites variations de proportions : pas deux zombies pareils
  const wide = rand(.88, 1.16), tall = rand(.94, 1.06), hs = rand(.88, 1.12), al = rand(.9, 1.15);
  const torso = mk(ZG.torso, shirt, 0, 1.28, 0); torso.scale.set(wide, 1, rand(.9, 1.2));
  const head = mk(ZG.head, skin, rand(-.03, .03), 1.9, 0); head.scale.setScalar(hs); head.rotation.z = rand(-.15, .15);
  mk(ZG.eye, eyeMat, -.09, 1.94, .205 * hs); mk(ZG.eye, eyeMat, .09, 1.94, .205 * hs);
  const armL = mk(ZG.arm, skin, -.4 * wide, 1.62, 0), armR = mk(ZG.arm, skin, .4 * wide, 1.62, 0);
  armL.scale.y = al; armR.scale.y = al * rand(.92, 1.05);
  const legL = mk(ZG.leg, pants, -.16, .86, 0), legR = mk(ZG.leg, pants, .16, .86, 0);
  g.scale.set(T.scale, T.scale * tall, T.scale);
  return { g, body, head, armL, armR, legL, legR, parts:[torso, head, armL, armR, legL, legR], mats:[skin, shirt, pants], aimY:1.1 * T.scale };
}
function spawnZombie(type){
  const T = ZTYPES[type] || ZTYPES.walker; if (!ZTYPES[type]) type = 'walker';
  const K = zkind(type);
  // build() d'un type de ZKINDS : il s'occupe lui-même de son échelle ; on le positionne et on l'ajoute à la scène
  const R = (K && K.build) ? K.build(T) : buildHumanoid(T);
  const g = R.g;
  zBoxFor(type, g);
  g.position.set(rand(-11, 11), 0, rand(-118, -100));
  const xp = ZXP[type] != null ? ZXP[type] : (T.xp != null ? T.xp : 5);
  const z = { type, g, body:R.body || g, head:R.head || null, armL:R.armL || null, armR:R.armR || null, legL:R.legL || null, legR:R.legR || null,
    mats:R.mats || [], geos:R.geos || [], aimY:R.aimY != null ? R.aimY : 1.1 * (T.scale || 1),
    hp: T.hp * plan.hpMult, maxHp: T.hp * plan.hpMult, speed: T.speed * plan.spdMult * rand(.85, 1.15), dmg: T.dmg * plan.dmgMult, reward: T.reward * plan.cashMult * ECO, xp: xp * plan.xp * ECO,
    phase: rand(0, 6.28), st:'walk', atkT: rand(.2, 1), stopZ: BAR_Z - .7 - rand(0, .9) - (T.stopOff || 0), flashT: 0, deadT: 0, sway: rand(.3, .9), headGone:false, meshes:[], uid: zUid++, inst:null };
  // Rendu : par instances si possible (aucun objet ajouté à la scène), sinon vrai groupe dans la scène
  if (zInstOk(g)) zInstPrep(z, z.mats); else scene.add(g);
  const parts = (R.parts || []).slice(); if (z.head && parts.indexOf(z.head) < 0) parts.push(z.head);
  parts.forEach(m => { m.userData.z = z; m.userData.head = (m === z.head); z.meshes.push(m); });
  const px = new THREE.Object3D(); px.userData.z = z; px.raycast = zProxyRaycast; z.proxy = px; hitMeshes.push(px);
  zombies.push(z);
  if (K && K.init) K.init(z);
  return z;
}
function removeZombieMeshes(z){ const i = z.proxy ? hitMeshes.indexOf(z.proxy) : -1; if (i >= 0) hitMeshes.splice(i, 1); }
function disposeZombie(z){
  if (!z.inst) scene.remove(z.g);
  z.mats.forEach(m => { if (!m.userData.zshared && !m.userData.zfixed) m.dispose(); }); z.geos.forEach(o => o.dispose());
  z.inst = null;
}
function clearZombies(){
  zombies.forEach(z => { removeZombieMeshes(z); disposeZombie(z); }); zombies.length = 0; hitMeshes.length = 0;
  if (typeof zkClear === 'function') zkClear(); // projectiles et effets des types spéciaux (18-zombies-types.js)
  zInstSync();
}
const tmpV = new THREE.Vector3();
function damage(z, amt, head, point){
  if (z.dead) return;
  z.hp -= amt; z.flashT = .08;
  zBurst(point, 'blood', head ? 10 : 5, head ? 3 : 2);
  if (z.hp <= 0) kill(z, head, point);
}
function kill(z, head, point){
  z.dead = true; z.deadT = 0; removeZombieMeshes(z);
  if (typeof comboKill === 'function') comboKill(z); // combo de tes tirs (26-combos.js)
  const cm = typeof comboMult === 'function' ? comboMult() : 1; // tout l'argent des abattus est multiplié pendant un combo
  const pay = Math.round(z.reward * (1 + .08 * T('scavenger')) * (head ? 1.5 : 1) * cm);
  if (typeof defOnKill === 'function') defOnKill(z); // ferraille (16-atelier.js)
  addXP(z.xp);
  S.money += pay; S.earned += pay; S.kills++; S.waveKills++;
  if (head && z.head){ z.head.visible = false; z.headGone = true; zBurst(point, 'blood', 14, 4); }
  floatText((head ? 'Tête ! +' : '+') + fmt(pay), point, head);
}
/* ---------- Points faibles ---------- */
// Un maillage peut porter userData.weak = { mult, effet } (posé par ZKINDS[type].build, 18-zombies-types.js).
// Tous les impacts directs (balles, plombs, carreaux) passent par weakHit : dégâts multipliés, texte « Point faible ! »,
// puis l'effet propre au type (ZKINDS[type].onWeak(z, maillage, dégâts, point, weak) ; true = l'effet a déjà infligé les dégâts).
let weakT = 0; // marqueur d'impact vert quelques instants (26-combos.js l'affiche)
function weakText(txt, pos){
  const box = $('floats'); if (!box || box.childElementCount > 18 || typeof camera === 'undefined') return;
  tmpV.copy(pos).project(camera); if (tmpV.z > 1) return;
  const el = document.createElement('div'); el.className = 'fl weak'; el.textContent = txt;
  el.style.left = ((tmpV.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - tmpV.y) / 2 * innerHeight - 44) + 'px';
  box.appendChild(el); setTimeout(() => el.remove(), 950);
}
// Retire un maillage des cibles (poche d'acide éclatée) : le rayon de Three.js touche aussi les maillages cachés.
// Les tirs passent par z.meshes (zProxyRaycast) : le retirer de z.meshes suffit ; caché, il n'est plus dessiné.
function dropZombieMesh(z, m){
  m.visible = false;
  let i = hitMeshes.indexOf(m); if (i >= 0) hitMeshes.splice(i, 1);
  i = z.meshes.indexOf(m); if (i >= 0) z.meshes.splice(i, 1);
}
function weakHit(z, m, amt, point){
  const wk = m && m.userData && m.userData.weak;
  if (!wk || !z || z.dead){ if (z) damage(z, amt, false, point); return false; }
  amt *= wk.mult || 1;
  z.wkHits = (z.wkHits || 0) + 1; weakT = .18;
  if (typeof CB !== 'undefined' && CB.ctx > 0) z.cbBy = true; // ce que l'effet abat plus tard (chute) compte pour ton combo
  const K = zkind(z.type);
  const r = K && K.onWeak ? K.onWeak(z, m, amt, point, wk) : null;
  const now = typeof time === 'number' ? time : 0;
  if (r && r.txt) weakText('Point faible ! ' + r.txt, point);
  else if (!(z.wkTxtT > now - .25)){ z.wkTxtT = now; weakText('Point faible !', point); }
  if (!(r && r.done)) damage(z, amt, false, point);
  return true;
}
// Coup porté à la barricade (utilisé aussi par les types spéciaux)
function hitBarricade(z, dmg, shk, chips){
  S.bar = Math.max(0, S.bar - dmg);
  shake = Math.max(shake, shk);
  tmpV.set(z.g.position.x, rand(.5, 1.3), BAR_Z); zBurst(tmpV, 'wood', chips, 2.2);
  if (Math.random() < .5) Snd.thud();
  $('dmgflash').style.opacity = .7; setTimeout(() => { $('dmgflash').style.opacity = 0; }, 90);
}
function updateZombies(dt){
  for (let i = zombies.length - 1; i >= 0; i--){
    const z = zombies[i];
    // Flash rouge : par instances, la couleur suit z.flashT (zInstSync) ; sinon (boss), par le matériau propre au zombie
    if (z.flashT > 0){ z.flashT -= dt; const on = z.flashT > 0; if (!z.inst) for (let k = 0; k < z.mats.length && k < 2; k++) if (z.mats[k].emissive && !z.mats[k].userData.zshared) z.mats[k].emissive.setHex(on ? 0x772211 : 0); }
    if (z.dead){
      z.deadT += dt;
      z.body.rotation.x = -Math.min(1, z.deadT / .45) * Math.PI / 2;
      const crowd = zombies.length > 150 ? .3 : zombies.length > 45 ? .45 : 1; // grosse foule : les corps partent plus vite
      // Mort en l'air (volant, sauteur en plein bond) : il tombe d'abord au sol
      if (z.deadT <= 1.6 * crowd && z.g.position.y > 0){ z.fallV = (z.fallV || 0) + 22 * dt; z.g.position.y = Math.max(0, z.g.position.y - z.fallV * dt); }
      if (z.deadT > 1.6 * crowd) z.g.position.y -= dt * 1.2 / crowd;
      if (z.deadT > 2.8 * crowd){ disposeZombie(z); zombies.splice(i, 1); }
      continue;
    }
    const K = zkind(z.type);
    if (K && K.update && K.update(z, dt) === true) continue;
    if (z.st === 'walk'){
      z.g.position.z += z.speed * dt;
      z.g.position.x += Math.sin(z.phase * .3) * z.sway * dt * .4;
      z.g.position.x = clamp(z.g.position.x, -12, 12);
      z.phase += dt * z.speed * 3.2;
      const s = Math.sin(z.phase);
      if (z.legL) z.legL.rotation.x = s * .6; if (z.legR) z.legR.rotation.x = -s * .6;
      if (z.armL) z.armL.rotation.x = -1.35 + s * .18; if (z.armR) z.armR.rotation.x = -1.35 - s * .18;
      z.body.position.y = Math.abs(Math.cos(z.phase)) * .06;
      z.body.rotation.x = z.type === 'runner' ? .25 : .06;
      z.body.rotation.z = Math.sin(z.phase * .5) * .06;
      if (z.g.position.z >= z.stopZ){ z.g.position.z = z.stopZ; z.st = 'attack'; if (z.legL) z.legL.rotation.x = 0; if (z.legR) z.legR.rotation.x = 0; }
    } else {
      z.phase += dt * 9;
      if (z.armL) z.armL.rotation.x = -1.6 + Math.sin(z.phase) * .5; if (z.armR) z.armR.rotation.x = -1.6 - Math.sin(z.phase) * .5;
      z.atkT -= dt;
      if (z.atkT <= 0){
        z.atkT = rand(.95, 1.25);
        const ZT = ZTYPES[z.type] || {};
        hitBarricade(z, z.dmg, ZT.hitShake != null ? ZT.hitShake : .15, ZT.chips != null ? ZT.chips : 3);
      }
    }
  }
  if (typeof zkFrame === 'function') zkFrame(dt); // projectiles des cracheurs (18-zombies-types.js)
  zFrame++; // les zombies ont bougé : les cibles des tirs seront remises à jour
}
