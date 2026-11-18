'use strict';
/* ================= La Centrale (dossier 117) : irradié, boss « le Cœur », ambiance ================= */
// La 6e ville du toit (LOCS, js/02-villes.js ; décor : centraleRue et centraleFond, js/03-scene.js). Ce fichier ajoute :
// 1. L'irradié (type 'irradie') : un ouvrier en combinaison, plaques de peau qui luisent en vert. En mourant, il laisse
//    une flaque qui luit CTR.irr.flaque.duree secondes ; si elle est à moins de CTR.irr.flaque.pres m de la barricade,
//    elle la ronge (CTR.irr.flaque.dps × ses dégâts par seconde). Parade : l'abattre loin de la barricade.
//    Seulement à la Centrale (campagne), il remplace des marcheurs (le total de la vague ne change pas). Bandeau à la
//    première rencontre (P.mtVus, comme js/63-monstres-toit.js).
// 2. Le Cœur, boss final de la vague 12 (les vagues 5 et 10 ont « le Liquidateur », un boss ordinaire) : torse fissuré
//    qui luit. Tant qu'un des 3 transformateurs de la rue tient, des arcs le relient au Cœur : il ne prend que
//    CTR.coeur.bouclier des dégâts et regagne CTR.coeur.regen de sa vie par seconde et par transformateur. Les
//    transformateurs deviennent des cibles quand il arrive (vie : CTR.coeur.transfoVie de la sienne chacun ; une roquette
//    les touche aussi). Les trois détruits : il est « à nu », son corps prend tous les dégâts (plus de plaques).
// 3. L'ambiance (seulement l'image, rien du jeu) : gyrophares qui tournent lentement, vapeur des tours de refroidissement,
//    cendres qui tombent, lueur du réacteur qui pulse, fond dans la brume (ctrBrume), silhouettes du ciel peint
//    (ctrCielSil et ctrCielApres, appelés par gfxCielTex de js/36-rendu.js).
// Branchements : Jeu.on('monde' / 'image' / 'tue'). Comme js/19-boss.js et js/63-monstres-toit.js, les calculs passent
// par réaffectation : wavePlan (irradiés, boss de la vague 12), bossVariant, damage et defHit (bouclier du Cœur),
// armExplode (roquette sur un transformateur), zkFrame et zkClear (flaques et Cœur, à chaque pas de jeu), BOSS_KIND.init.
// Rien ne change dans les 5 autres villes, ni en mode infini (décor seulement), ni au défi du jour, ni au robot.

/* ---------- Réglages ---------- */
const CTR = {
  // part des marcheurs de la vague remplacés : min(max, base + parVague × vague) du total, au moins 1
  irr: { base:.035, parVague:.0055, max:.1, flaque:{ duree:6, rayon:2.4, pres:3.2, dps:.8, tic:.5 } },
  coeur: { vague:12, bouclier:.3, regen:.006, transfoVie:.08 },
  fx: { cendres:isTouch ? 140 : 320, vapeur:isTouch ? 18 : 30 }
};
const CT = { C:null, t:0, flaques:[], coeur:null, transfos:[], arcT:0, sirT:14, chk:0, fx:null,
  stats:{ flaques:0, tics:0, regen:0, detruits:0, coeurs:0, bouclier:0, tempsCoeur:0, tempsBouclier:0 } }; // temps : secondes de combat (mesure)
const ctrV = new THREE.Vector3(), ctrV2 = new THREE.Vector3();

/* ---------- Données ajoutées aux tables des autres fichiers (sans les toucher) ---------- */
Object.assign(ZTYPES, { irradie: { name:'Irradié', hp:95, speed:1.25, dmg:7, reward:30, scale:1.05, skin:0xa6b892 } });
Object.assign(ZXP, { irradie:9 });
try { SCRAP_Z.irradie = 1.2; } catch (e) { errNote(e); }
try { MT_ANNONCE.irradie = ['Irradié !', 'Il laisse une flaque qui ronge la barricade : abats-le loin d’elle.']; } catch (e) { errNote(e); }
PMATS.irr = new THREE.MeshBasicMaterial({ color:0x9cff6a });
try {
  BOSS_VAR.centrale = { name:'Le Liquidateur', hp:1.25, scale:7.5, skin:0x7a8a6a, plate:0xb89a22, rew:1.3 };
  BOSS_VAR.coeur = { name:'Le Cœur', hp:1.8, scale:9, skin:0x56645c, plate:0x263030, rew:2.2 };
} catch (e) { errNote(e); }
try { VILLE_TENUES.centrale = { foreur:3, pompier:2.2, medecin:1.4, policier:1, affaires:.3, chasseur:.3, mariee:.2, marie:.2 }; } catch (e) { errNote(e); }
try { WEATHER_BY_LOC.centrale = { nuitClaire:3, clair:2, coucher:1.5, aube:1, vent:1.2, cendres:2, neige:1.5, brouillard:1, nuit:1.5, orage:.4 }; } catch (e) { errNote(e); }
try { if (typeof HD_CIEL === 'object') HD_CIEL.centrale = 'night'; } catch (e) { errNote(e); }
// Un joueur qui avait déjà libéré le Port (5 villes) voit la Centrale débloquée (champ existant, valeur par défaut)
function ctrDebloquer(){
  const i = LOCS.findIndex(L => L.id === 'centrale');
  if (i > 0 && P.wins && P.wins[LOCS[i - 1].id] > 0 && (P.unlocked || 1) < i + 1){ P.unlocked = i + 1; saveP(); }
}
ctrDebloquer();
const ctrEstCentrale = L => !!L && L.id === 'centrale' && !L.inf && !L.defi; // campagne seulement (pas l'infini, pas le défi)
const ctrIci = () => !!CT.C && !!world && world.userData.centrale === CT.C && !(typeof Jeu === 'object' && Jeu.actif && Jeu.actif());

/* ---------- Irradié : combinaison, masque à gaz, réservoir au dos, peau à vif qui luit ---------- */
const IRR_M = { combi:zmat(0xb8a238), masque:zmat(ZC.noir), bidon:zmat(0x6a6a5a), lueur:zfix(new THREE.MeshBasicMaterial({ color:0x9cff6a, fog:false })) };
ZKINDS.irradie = {
  build(T){
    const skin = zmat(T.skin), C = IRR_M.combi, lu = IRR_M.lueur;
    const g = new THREE.Group(), body = new THREE.Group(), PT = []; g.add(body);
    const mk = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); body.add(m); PT.push(m); return m; };
    const torso = mk(ZG.torso, C, 0, 1.28, 0); torso.scale.set(1.08, 1, 1.12);
    const head = mk(ZG.head, C, 0, 1.9, 0);                                         // cagoule de la combinaison
    zkMesh(head, ZKG.box, IRR_M.masque, .3, .22, .1, 0, -.05, .22);               // masque à gaz
    zkMesh(head, ZKG.box, lu, .22, .07, .02, 0, .05, .26);                         // visière qui luit
    zkMesh(head, ZKG.box, IRR_M.masque, .12, .12, .1, 0, -.12, .3);               // cartouche
    zkMesh(body, ZKG.box, lu, .22, .3, .03, -.1, 1.36, .195); zkMesh(body, ZKG.box, lu, .12, .16, .03, .17, 1.1, .195); // plaques de peau à vif
    zkMesh(body, ZKG.box, lu, .26, .2, .03, .06, 1.42, -.195);
    zkMesh(body, ZKG.box, IRR_M.bidon, .3, .44, .18, 0, 1.34, -.29);              // réservoir sur le dos
    const armL = mk(ZG.arm, C, -.42, 1.62, 0), armR = mk(ZG.arm, skin, .42, 1.62, 0); // la manche droite a brûlé
    zkMesh(armR, ZKG.box, lu, .19, .22, .19, 0, -.42, 0);
    const legL = mk(ZG.leg, C, -.16, .86, 0), legR = mk(ZG.leg, C, .16, .86, 0);
    g.scale.setScalar(T.scale);
    return { g, body, head, armL, armR, legL, legR, parts:PT, mats:[skin, C], aimY:1.1 * T.scale };
  },
  init(z){ z.irrT = rand(.5, 2); if (typeof mtAnnonce === 'function') mtAnnonce('irradie'); },
  update(z, dt){ // marche et frappe comme un marcheur ; de temps en temps, une goutte qui luit
    z.irrT -= dt;
    if (z.irrT <= 0){ z.irrT = rand(1.4, 2.8); if (z.g.position.z > -60){ ctrV.set(z.g.position.x, .9, z.g.position.z); burst(ctrV, 'irr', 1, .5); } }
    return false;
  },
  onKill(z){ ctrFlaque(z.g.position.x, z.g.position.z, z.dmg); ctrV.set(z.g.position.x, 1, z.g.position.z); burst(ctrV, 'irr', 10, 2.5); }
};
// Ils remplacent des marcheurs et des coureurs (à la Centrale, les autres monstres ont déjà pris presque tous les marcheurs)
function ctrRemplace(q, n){
  const idx = []; for (let i = 0; i < q.length; i++) if (q[i] === 'walker' || q[i] === 'runner') idx.push(i);
  for (let i = idx.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  n = Math.min(n, Math.floor(idx.length * .6));
  for (let i = 0; i < n; i++) q[idx[i]] = 'irradie';
  return n;
}
const ctrIrrNb = (w, tot) => Math.max(1, Math.round(tot * Math.min(CTR.irr.max, CTR.irr.base + CTR.irr.parVague * w)));

/* ---------- Flaques irradiées (réserve fixe, une seule géométrie par instances) ---------- */
const CTR_FLAQUE_TEX = canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(200,255,150,1)'); gr.addColorStop(.55, 'rgba(110,240,80,.7)'); gr.addColorStop(1, 'rgba(60,160,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 9; i++){ g.beginPath(); g.arc(14 + (i * 23) % 36, 14 + (i * 37) % 36, 2 + i % 4, 0, 7); g.fill(); }
});
const CTR_FLAQUE_N = 14;
const ctrFlaqueIM = (function(){
  const geo = new THREE.PlaneGeometry(2, 2); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map:CTR_FLAQUE_TEX, color:0x9cff6a, transparent:true, opacity:.8, blending:THREE.AdditiveBlending, depthWrite:false });
  mat.userData.keep = true;
  const im = new THREE.InstancedMesh(geo, mat, CTR_FLAQUE_N); im.count = 0; im.frustumCulled = false; im.renderOrder = 2; im.userData.keep = true; scene.add(im);
  for (let i = 0; i < CTR_FLAQUE_N; i++) CT.flaques.push({ on:false, t:0, x:0, z:0, dps:0, tic:0, ronge:false, fz:{ g:{ position:new THREE.Vector3() } } });
  return im;
})();
function ctrFlaque(x, z, dmg){
  if (!ctrIci()) return null;
  const F = CTR.irr.flaque;
  const f = CT.flaques.find(o => !o.on) || CT.flaques.reduce((a, b) => (a.t < b.t ? a : b));
  f.on = true; f.t = F.duree; f.x = x; f.z = z; f.dps = F.dps * (dmg || 0); f.tic = F.tic; f.ronge = z >= BAR_Z - F.pres; f.fz.g.position.set(x, 0, z);
  CT.stats.flaques++;
  if (f.ronge){
    if (typeof ecrPush === 'function') ecrPush('Flaque irradiée contre la barricade !', 'weak');
    if (typeof rpCaption === 'function') rpCaption('[Grésillement : une flaque irradiée ronge la barricade]', 'flaque');
  }
  return f;
}
// Un pas de jeu : les flaques rongent la barricade (par petits coups, comme une griffe), puis s'effacent
function ctrFlaquesEtape(dt){
  const F = CTR.irr.flaque;
  for (const f of CT.flaques){
    if (!f.on) continue;
    f.t -= dt; if (f.t <= 0){ f.on = false; continue; }
    if (!f.ronge) continue;
    f.tic -= dt;
    if (f.tic <= 0){ f.tic += F.tic; hitBarricade(f.fz, f.dps * F.tic, .05, 2); CT.stats.tics++; }
  }
}
const _ctrMat = new THREE.Matrix4(), _ctrCol = new THREE.Color();
function ctrFlaquesImage(){
  let n = 0;
  if (ctrIci()) for (const f of CT.flaques){
    if (!f.on) continue;
    const k = Math.min(1, f.t / 1.2, (CTR.irr.flaque.duree - f.t) * 4 + .2), r = CTR.irr.flaque.rayon * (.6 + .4 * Math.min(1, (CTR.irr.flaque.duree - f.t) * 2));
    _ctrMat.makeScale(r, 1, r); _ctrMat.setPosition(f.x, .06 + n * .002, f.z); ctrFlaqueIM.setMatrixAt(n, _ctrMat);
    const p = f.ronge ? .75 + .25 * Math.sin(CT.t * 9 + n) : .55;
    _ctrCol.setRGB(k * p, k * p, k * p); ctrFlaqueIM.setColorAt(n, _ctrCol);
    n++;
  }
  ctrFlaqueIM.count = n;
  if (n){ ctrFlaqueIM.instanceMatrix.needsUpdate = true; if (ctrFlaqueIM.instanceColor) ctrFlaqueIM.instanceColor.needsUpdate = true; }
}

/* ---------- Vagues de la Centrale : irradiés, boss de la vague 12 ---------- */
try {
  const _wp = wavePlan;
  wavePlan = function(w, L){
    const p = _wp.apply(this, arguments);
    try {
      const LL = L || curLoc;
      if (p && p.queue && ctrEstCentrale(LL) && !(typeof INF === 'object' && INF && INF.mix)){
        const tot = p.queue.filter(t => t !== 'boss').length;
        p.irr = ctrRemplace(p.queue, ctrIrrNb(w, tot));
        if (w === CTR.coeur.vague && typeof bossReady === 'function' && bossReady() && p.queue.indexOf('boss') < 0){
          p.queue.splice(Math.round(p.queue.length * .45), 0, 'boss'); p.total = p.queue.length; p.boss = BOSS_VAR.coeur.name;
        }
      }
    } catch (e) { errNote(e); }
    return p;
  };
} catch (e) { errNote(e); }
try {
  const _bv = bossVariant;
  bossVariant = function(w, L){
    const LL = L || curLoc;
    if (ctrEstCentrale(LL) && w >= CTR.coeur.vague && BOSS_VAR.coeur) return BOSS_VAR.coeur;
    return _bv.apply(this, arguments);
  };
} catch (e) { errNote(e); }

/* ---------- Le Cœur ---------- */
const CTR_COEUR_MAT = new THREE.MeshBasicMaterial({ color:0xb8ffe0, fog:false }); CTR_COEUR_MAT.userData.keep = true;
const CTR_CIBLE = new THREE.MeshBasicMaterial({ visible:false }); CTR_CIBLE.userData.keep = true;
const ctrVivants = () => { let n = 0; for (const t of CT.transfos) if (t.vivant) n++; return n; };
const ctrCoeurVivant = () => !!CT.coeur && !CT.coeur.dead && zombies.indexOf(CT.coeur) >= 0;
try {
  if (typeof BOSS_KIND === 'object' && BOSS_KIND){
    const _bi = BOSS_KIND.init;
    BOSS_KIND.init = function(z){
      const r = _bi.apply(this, arguments);
      try { if (BOSS_VAR.coeur && z.bossName === BOSS_VAR.coeur.name) ctrCoeurDebut(z); } catch (e) { errNote(e); }
      return r;
    };
  }
} catch (e) { errNote(e); }
function ctrCoeurDebut(z){
  z.coeur = true; CT.coeur = z;
  // Torse fissuré : un noyau et des fissures qui luisent (matériau partagé, géométrie partagée du boss)
  const B = z.B, fis = [];
  if (B && B.chest){
    fis.push(bbox(B.chest, CTR_COEUR_MAT, .5, .4, .06, .05, .78, .53));            // noyau à vif
    [[.62, .07, .5], [.55, .06, 2.7], [.5, .06, -.6], [.48, .06, 3.6], [.4, .05, 1.5], [.36, .05, -1.9]].forEach(([w, h, a]) => {
      const m = bbox(B.chest, CTR_COEUR_MAT, w, h, .05, .05 + Math.cos(a) * w * .55, .78 + Math.sin(a) * w * .45, .53); m.rotation.z = a; fis.push(m);
    });
    fis.push(bbox(B.chest, CTR_COEUR_MAT, .06, .5, .05, -.3, .3, .43), bbox(B.chest, CTR_COEUR_MAT, .05, .4, .05, .35, .28, .43)); // le ventre aussi
    fis.push(bbox(B.chest, CTR_COEUR_MAT, .7, .04, .05, 0, 1.0, -.44)); // fissure du dos
  }
  z.ctrFis = fis;
  CT.transfos.forEach(t => { t.max = t.hp = z.maxHp * CTR.coeur.transfoVie; ctrTransfoEtat(t, true); });
  banner(z.bossName, 'Il puise dans les 3 transformateurs de la rue : détruis-les pour percer son bouclier, puis vise la tête.', 5200);
  if (typeof rpCaption === 'function') rpCaption('[Le Cœur arrive : des arcs électriques le relient aux transformateurs]', 'coeur');
}
// Un transformateur remis à neuf (vivant) ou détruit ; cible des tirs seulement pendant le combat du Cœur
function ctrTransfoEtat(t, vivant){
  t.vivant = vivant;
  const i = hitMeshes.indexOf(t.cible);
  if (vivant && i < 0) hitMeshes.push(t.cible); else if (!vivant && i >= 0) hitMeshes.splice(i, 1);
  t.corps.rotation.set(0, 0, vivant ? 0 : -Math.sign(t.x) * .32); t.corps.position.y = vivant ? 0 : -.35;
  t.voyant.visible = vivant;
}
function ctrTransfoTouche(t, pt, dmg){
  if (!t.vivant || !ctrCoeurVivant()) return;
  t.hp -= Math.min(dmg, 1e5); t.flash = .12;
  if (pt) burst(pt, 'ember', 2, 2);
  if (t.hp <= 0) ctrTransfoDetruit(t);
}
function ctrTransfoDetruit(t){
  ctrTransfoEtat(t, false); CT.stats.detruits++;
  ctrV.set(t.x, 2, t.z); burst(ctrV, 'ember', 24, 6); burst(ctrV, 'dust', 14, 4); burst(ctrV, 'irr', 8, 3);
  shake = Math.max(shake, .45);
  if (typeof Snd === 'object'){ Snd.burst(420, .7, .7); Snd.tone(110, .6, 'sawtooth', .18, 30); }
  if (typeof floatText === 'function') floatText('Transformateur détruit !', ctrV, true);
  const n = ctrVivants();
  if (n > 0){ if (typeof ecrPush === 'function') ecrPush('Transformateur détruit : encore ' + n, 'weak'); }
  else {
    banner('Le Cœur est à nu !', 'Plus de bouclier : chaque balle porte, la tête encore plus.', 2800);
    if (typeof rpCaption === 'function') rpCaption('[Le bouclier du Cœur tombe : tire !]', 'aNu');
  }
}
// Un pas de jeu : il regagne de la vie tant que des transformateurs tiennent
function ctrCoeurEtape(dt){
  if (!ctrCoeurVivant()) return;
  const z = CT.coeur, n = ctrVivants(); CT.stats.tempsCoeur += dt; if (!n) return;
  CT.stats.tempsBouclier += dt;
  const add = Math.min(z.maxHp - z.hp, z.maxHp * CTR.coeur.regen * n * dt);
  if (add > 0){ z.hp += add; CT.stats.regen += add; }
}
// Dégâts au Cœur : bouclier tant qu'un transformateur tient ; ensuite le corps prend tout (les plaques ne servent plus)
function ctrFiltre(z, amt, head, def){
  if (!z || !z.coeur || z.dead) return amt;
  if (ctrVivants() > 0){ CT.stats.bouclier += amt * (1 - CTR.coeur.bouclier); return amt * CTR.coeur.bouclier; }
  return head || def ? amt : amt / BOSS_ARMOR;
}
try {
  const _d = damage;
  damage = function(z, amt, head, point){ return _d.call(this, z, ctrFiltre(z, amt, head, false), head, point); };
} catch (e) { errNote(e); }
try {
  if (typeof defHit === 'function'){
    const _h = defHit;
    defHit = function(z, amt, blood){ return _h.call(this, z, ctrFiltre(z, amt, false, true), blood); };
  }
} catch (e) { errNote(e); }
// Roquette ou grenade du lance-grenades : les transformateurs dans le rayon prennent les dégâts
try {
  if (typeof armExplode === 'function'){
    const _ae = armExplode;
    armExplode = function(pos, id){
      try {
        if (ctrCoeurVivant() && ctrVivants()){
          const r = wRadius(id), dmg = wDmg(id);
          CT.transfos.forEach(t => { if (!t.vivant) return; const d = Math.max(0, Math.hypot(t.x - pos.x, t.z - pos.z) - 1.5); if (d <= r) ctrTransfoTouche(t, null, dmg * (1 - .6 * d / r)); });
        }
      } catch (e) { errNote(e); }
      return _ae.apply(this, arguments);
    };
  }
} catch (e) { errNote(e); }
// Chaque pas de jeu (updateZombies, js/07-zombies.js) : flaques et Cœur. clearZombies : tout est rangé.
try {
  const _zf = zkFrame;
  zkFrame = function(dt){ const r = _zf.apply(this, arguments); try { if (ctrIci() && state === 'playing'){ ctrFlaquesEtape(dt); ctrCoeurEtape(dt); } } catch (e) { errNote(e); } return r; };
  const _zc = zkClear;
  zkClear = function(){ const r = _zc.apply(this, arguments); try { ctrRanger(); } catch (e) { errNote(e); } return r; };
} catch (e) { errNote(e); }
function ctrRanger(){
  CT.flaques.forEach(f => { f.on = false; });
  CT.coeur = null;
  CT.transfos.forEach(t => ctrTransfoEtat(t, true));
  CT.transfos.forEach(t => { const i = hitMeshes.indexOf(t.cible); if (i >= 0) hitMeshes.splice(i, 1); });
}
Jeu.on('tue', (z, was) => {
  if (!z || !z.coeur || !was) return;
  CT.stats.coeurs++;
  CT.transfos.forEach(t => { const i = hitMeshes.indexOf(t.cible); if (i >= 0) hitMeshes.splice(i, 1); });
  if (typeof msAdd === 'function') msAdd('coeur');
});
// Pour le robot-joueur du simulateur : un transformateur à abattre pendant le combat du Cœur (le plus proche)
function ctrCibleBot(){
  if (!ctrCoeurVivant()) return null;
  let best = null;
  CT.transfos.forEach(t => { if (t.vivant && (!best || t.z > best.z)) best = t; });
  if (!best) return null;
  return best.pourBot || (best.pourBot = { type:'transfo', g:best.g, head:null, meshes:[best.cible], get hp(){ return Math.max(1, best.hp); }, get dead(){ return !best.vivant; } });
}

/* ---------- Robot : ses carrefours tirent toujours parmi les 5 premières villes ---------- */
// mbRoutes (js/40-robot-monstres.js) mêle LOCS au hasard : avec 6 villes, le tirage (et toute la course) changerait.
// La Centrale est retirée de LOCS le temps de l'appel, puis remise à sa place (rien d'autre ne change pour le robot).
try {
  if (typeof mbRoutes === 'function'){
    const _mr = mbRoutes;
    mbRoutes = function(){
      const i = LOCS.findIndex(L => L.id === 'centrale'), hors = i >= 0 ? LOCS.splice(i, 1) : [];
      try { return _mr.apply(this, arguments); } finally { if (hors.length) LOCS.splice(i, 0, hors[0]); }
    };
  }
} catch (e) { errNote(e); }

/* ---------- Succès ---------- */
try {
  [{ id:'centrale', name:'Courant coupé', stat:'centrale', tiers:[[1, 1500]], desc:() => 'Libère la Centrale' },
   { id:'coeur', name:'Arrêt du cœur', stat:'coeur', tiers:[[1, 800]], desc:() => 'Abats le Cœur, le boss de la Centrale' }]
    .forEach(a => { if (!ACH.some(b => b.id === a.id)){ ACH.push(a); (ACH_BY[a.stat] = ACH_BY[a.stat] || []).push(a); } });
} catch (e) { errNote(e); }

/* ---------- Ambiance (image seulement) ---------- */
const CTR_FX_M = {
  faisceau: new THREE.MeshBasicMaterial({ map:canvasTex(64, 16, (g) => { const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(255,140,60,1)'); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 16); }),
    color:0xffffff, transparent:true, opacity:.5, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide }),
  halo: new THREE.PointsMaterial({ map:glowTex, size:2.6, vertexColors:true, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }),
  vapeur: new THREE.PointsMaterial({ map:canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.6, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }),
    size:34, vertexColors:true, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false }),
  cendre: new THREE.PointsMaterial({ color:0xb4c2bc, size:.09, transparent:true, opacity:.8, depthWrite:false }),
  lueur: new THREE.SpriteMaterial({ map:glowTex, color:0x8affc8, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false }),
  arc: new THREE.LineBasicMaterial({ color:0xb8f4ff, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, fog:false })
};
Object.keys(CTR_FX_M).forEach(k => { CTR_FX_M[k].userData.keep = true; });
// Arcs entre les transformateurs et le Cœur : un seul objet, dans la scène (pas dans la rue), caché hors du combat
const CTR_ARC_SEG = 9;
const ctrArcs = (function(){
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6 * CTR_ARC_SEG * 2 * 3), 3)); // 2 brins par transformateur
  const l = new THREE.LineSegments(g, CTR_FX_M.arc); l.frustumCulled = false; l.visible = false; l.userData.keep = true; scene.add(l); return l;
})();
const ctrPts = (n, mat, couleurs) => {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  if (couleurs) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(g, mat); p.frustumCulled = false; world.add(p); return p;
};
// Nouvelle rue : si c'est la Centrale, on pose les effets (ajoutés à la rue : libérés avec elle par disposeWorld)
function ctrMonde(L){
  CT.C = null; CT.fx = null; CT.coeur = null; CT.transfos = []; CT.flaques.forEach(f => { f.on = false; }); ctrArcs.visible = false;
  const C = world && world.userData.centrale; if (!C || !L || L.style !== 'centrale') return;
  CT.C = C;
  const fx = CT.fx = {};
  // Gyrophares : deux faisceaux en croix par lampe, qui tournent (une géométrie mise à jour à chaque image)
  const G = C.gyros, nb = G.length;
  const fg = new THREE.BufferGeometry(), pos = new Float32Array(nb * 4 * 4 * 3), uv = new Float32Array(nb * 4 * 4 * 2), idx = [];
  for (let i = 0; i < nb * 4; i++){ uv.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8); idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3); }
  fg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); fg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); fg.setIndex(idx);
  fx.faisceaux = new THREE.Mesh(fg, CTR_FX_M.faisceau); fx.faisceaux.frustumCulled = false; world.add(fx.faisceaux);
  fx.halos = ctrPts(nb, CTR_FX_M.halo, true);
  G.forEach((p, i) => fx.halos.geometry.attributes.position.array.set(p, i * 3));
  fx.ph = G.map((p, i) => i * 1.7 + p[2] * .05);
  // Vapeur des tours de refroidissement
  const nv = CTR.fx.vapeur * C.tours.length;
  fx.vapeur = ctrPts(nv, CTR_FX_M.vapeur, true);
  fx.puff = []; for (let i = 0; i < nv; i++) fx.puff.push({ tour:i % C.tours.length, age:(i / nv) * 16, vie:16, dx:rand(-1, 1), dz:rand(-1, 1) });
  // Cendres qui tombent sur la rue
  fx.cendres = ctrPts(CTR.fx.cendres, CTR_FX_M.cendre, false);
  const ca = fx.cendres.geometry.attributes.position.array;
  for (let i = 0; i < CTR.fx.cendres; i++){ ca[i * 3] = rand(-24, 24); ca[i * 3 + 1] = rand(0, 22); ca[i * 3 + 2] = rand(-72, 2); }
  fx.vit = Array.from({ length:CTR.fx.cendres }, () => rand(.5, 1.2));
  // Lueur du réacteur
  if (C.reacteur){ fx.lueur = new THREE.Sprite(CTR_FX_M.lueur); fx.lueur.position.set(C.reacteur[0], C.reacteur[1], C.reacteur[2]); fx.lueur.scale.set(46, 46, 1); world.add(fx.lueur); }
  // Les 3 transformateurs de la rue : cible invisible (dans hitMeshes seulement pendant le combat du Cœur)
  (C.transfos || []).forEach(t => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), CTR_CIBLE); c.scale.set(3, 4, 2.6); c.position.y = 1.9; t.g.add(c);
    c.userData.ctrTransfo = true; c.userData.onHit = (pt, dmg) => ctrTransfoTouche(t, pt, dmg);
    t.cible = c; t.vivant = true; t.hp = t.max = 1; t.flash = 0; CT.transfos.push(t);
  });
}
Jeu.on('monde', L => ctrMonde(L));
// Fond dans la brume : couleur mêlée à celle de la brume du moment (le fond est trop loin pour le brouillard du jeu)
const CTR_BASE = { loin:new THREE.Color(0x5a605c), tour:new THREE.Color(0x8a8e86) };
function ctrBrume(pulse){
  const f = scene.fog, k = clamp(.58 - ((f && f.far ? f.far : 100) - 100) * .004, .45, .85);
  [[CTR_LOIN, CTR_BASE.loin, k], [CTR_TOUR, CTR_BASE.tour, Math.min(.9, k + .1)]].forEach(([m, b, kk]) => {
    m.color.copy(b).multiplyScalar(1 - kk);
    m.emissive.copy(f ? f.color : b).multiplyScalar(kk);
  });
  CTR_LOIN.emissive.r += .012 * pulse; CTR_LOIN.emissive.g += .05 * pulse; CTR_LOIN.emissive.b += .035 * pulse; // la lueur du réacteur sur les murs
}
function ctrImage(dt){
  ctrFlaquesImage();
  if (!ctrIci() || !CT.fx){ ctrArcs.visible = false; return; }
  CT.t += dt || 0; const t = CT.t, C = CT.C, fx = CT.fx;
  // Lueur qui pulse : fissures du réacteur, halo, murs du fond
  const pulse = .5 + .5 * Math.sin(t * 1.3) * Math.sin(t * .37 + 1);
  CTR_FISSURE.color.setRGB(.45 + .3 * pulse, .9 + .1 * pulse, .62 + .2 * pulse);
  if (fx.lueur){ fx.lueur.material.opacity = .32 + .28 * pulse; const s = 40 + 10 * pulse; fx.lueur.scale.set(s, s, 1); }
  ctrBrume(pulse);
  // Gyrophares : lent tour (environ 4 s), ampoules qui battent, halo vif quand le faisceau regarde vers nous
  const FP = fx.faisceaux.geometry.attributes.position.array, H = fx.halos.geometry.attributes.color.array;
  const amp = .55 + .45 * Math.abs(Math.sin(t * 1.6));
  CTR_AMPOULE.color.setRGB(1, .3 + .12 * amp, .06);
  C.gyros.forEach((p, i) => {
    const a0 = t * 1.55 + fx.ph[i], vers = Math.atan2(camera.position.x - p[0], camera.position.z - p[2]);
    for (let b = 0; b < 2; b++){
      const a = a0 + b * Math.PI, cx = Math.sin(a), cz = Math.cos(a), L = 7.5, w0 = .12, w1 = 1.5;
      // faisceau à plat (q = 0) et debout (q = 1)
      for (let q = 0; q < 2; q++){
        const o = ((i * 2 + b) * 2 + q) * 12, ox = q ? 0 : -cz, oz = q ? 0 : cx, oy = q ? 1 : 0;
        FP[o] = p[0] + ox * w0; FP[o + 1] = p[1] + oy * w0; FP[o + 2] = p[2] + oz * w0;
        FP[o + 3] = p[0] + cx * L + ox * w1; FP[o + 4] = p[1] - .8 + oy * w1; FP[o + 5] = p[2] + cz * L + oz * w1;
        FP[o + 6] = p[0] + cx * L - ox * w1; FP[o + 7] = p[1] - .8 - oy * w1; FP[o + 8] = p[2] + cz * L - oz * w1;
        FP[o + 9] = p[0] - ox * w0; FP[o + 10] = p[1] - oy * w0; FP[o + 11] = p[2] - oz * w0;
      }
      if (!b){ const f = Math.pow(Math.max(Math.cos(a - vers), Math.cos(a + Math.PI - vers), 0), 6); H[i * 3] = .5 + 1.2 * f; H[i * 3 + 1] = .22 + .5 * f; H[i * 3 + 2] = .06 + .2 * f; }
    }
  });
  fx.faisceaux.geometry.attributes.position.needsUpdate = true; fx.halos.geometry.attributes.color.needsUpdate = true;
  // Vapeur : bouffées qui montent, grossissent en s'écartant et s'effacent, poussées par le vent
  const VP = fx.vapeur.geometry.attributes.position.array, VC = fx.vapeur.geometry.attributes.color.array;
  fx.puff.forEach((u, i) => {
    u.age += dt || 0; if (u.age > u.vie){ u.age -= u.vie; u.dx = rand(-1, 1); u.dz = rand(-1, 1); }
    const T = C.tours[u.tour], k = u.age / u.vie, r = T[3] * (.5 + 1.4 * k);
    VP[i * 3] = T[0] + u.dx * r + k * 34; VP[i * 3 + 1] = T[1] + 2 + k * 46; VP[i * 3 + 2] = T[2] + u.dz * r;
    const c = (k < .3 ? k / .3 : 1 - (k - .3) / .7) * .17; VC[i * 3] = c * .8; VC[i * 3 + 1] = c * .95; VC[i * 3 + 2] = c * .92;
  });
  fx.vapeur.geometry.attributes.position.needsUpdate = true; fx.vapeur.geometry.attributes.color.needsUpdate = true;
  // Cendres
  const A = fx.cendres.geometry.attributes.position.array;
  for (let i = 0; i < fx.vit.length; i++){
    A[i * 3 + 1] -= fx.vit[i] * (dt || 0); A[i * 3] += Math.sin(t * .7 + i) * .3 * (dt || 0);
    if (A[i * 3 + 1] < 0){ A[i * 3 + 1] = 22; A[i * 3] = rand(-24, 24); A[i * 3 + 2] = rand(-72, 2); }
  }
  fx.cendres.geometry.attributes.position.needsUpdate = true;
  // Transformateurs : voyant qui clignote quand on les touche, arcs vers le Cœur
  CT.transfos.forEach(tr => { if (tr.flash > 0) tr.flash -= dt || 0; tr.voyant.scale.setScalar(tr.flash > 0 ? .5 : .32 + .05 * Math.sin(t * 6 + tr.z)); });
  ctrArcsImage(dt);
  ctrCoeurImage(pulse);
  // Sirène au loin, de temps en temps (sons existants)
  if (state === 'playing' && typeof Snd === 'object' && Snd.tone){ CT.sirT -= dt || 0; if (CT.sirT <= 0){ CT.sirT = rand(22, 34); Snd.tone(430, 1.5, 'sine', .022, 610); Snd.tone(610, 1.5, 'sine', .022, 430, 1.5); } }
  // Succès de la ville libérée (une fois par seconde au plus)
  CT.chk -= dt || 0; if (CT.chk <= 0){ CT.chk = 1; if (P.wins && P.wins.centrale > 0 && typeof msMax === 'function') msMax('centrale', 1); }
}
function ctrArcsImage(dt){
  const z = CT.coeur, on = ctrCoeurVivant() && ctrVivants() > 0 && (state === 'playing' || state === 'paused');
  ctrArcs.visible = on; if (!on) return;
  CT.arcT -= dt || 0; if (CT.arcT > 0) return; CT.arcT = .06;
  const A = ctrArcs.geometry.attributes.position.array; A.fill(0);
  const ch = z.B && z.B.chest; if (ch) ch.getWorldPosition(ctrV2); else ctrV2.copy(z.g.position);
  ctrV2.y += 1 * (z.bossScale || 7) * .1;
  CT.transfos.forEach((t, k0) => { for (let brin = 0; brin < 2; brin++){
    if (!t.vivant) return;
    const k = k0 * 2 + brin, ax = t.x, ay = 4, az = t.z;
    let px = ax, py = ay, pz = az;
    for (let s = 1; s <= CTR_ARC_SEG; s++){
      const u = s / CTR_ARC_SEG, j = s === CTR_ARC_SEG ? 0 : 1.6 * Math.sin(u * Math.PI);
      const nx = ax + (ctrV2.x - ax) * u + rand(-j, j), ny = ay + (ctrV2.y - ay) * u + 3 * Math.sin(u * Math.PI) + rand(-j, j), nz = az + (ctrV2.z - az) * u + rand(-j, j);
      const o = (k * CTR_ARC_SEG + s - 1) * 6; A[o] = px; A[o + 1] = py; A[o + 2] = pz; A[o + 3] = nx; A[o + 4] = ny; A[o + 5] = nz;
      px = nx; py = ny; pz = nz;
    }
  } });
  ctrArcs.geometry.attributes.position.needsUpdate = true;
  CTR_FX_M.arc.opacity = .6 + .4 * Math.random();
}
// Le torse du Cœur : vert pâle qui bat tant que le bouclier tient, orange qui vacille quand il est à nu
function ctrCoeurImage(pulse){
  if (!ctrCoeurVivant()) return;
  if (ctrVivants() > 0) CTR_COEUR_MAT.color.setRGB(.55 + .35 * pulse, 1, .8 + .2 * pulse);
  else { const f = .7 + .3 * Math.random(); CTR_COEUR_MAT.color.setRGB(1 * f, .45 * f, .12 * f); }
}
Jeu.on('image', dt => ctrImage(dt));

/* ---------- Ciel peint (appelé par gfxCielTex, js/36-rendu.js) ---------- */
// Silhouettes au loin : blocs bas, tours de refroidissement, pylônes et cheminées. Le chemin est déjà commencé.
const CTR_CIEL = { panaches:[] };
function ctrCielSil(g, W, HZ, k, rang, rnd){
  if (!rang) CTR_CIEL.panaches = [];
  const tours = rang ? [[.18, 1], [.33, .8], [.86, 1.1]] : [[.08, .7], [.45, .6], [.62, .75], [.95, .6]];
  const pyl = rang ? [.25, .55, .72] : [.12, .38, .52, .8];
  let x = 0;
  const bloc = xe => { while (x < xe){ const w = 6 + rnd() * 14, h = (1.5 + rnd() * 4) * k; g.lineTo(x, HZ - h); g.lineTo(Math.min(xe, x + w), HZ - h); x = Math.min(xe, x + w); } };
  const items = tours.map(t => ['t', t[0] * W, t[1]]).concat(pyl.map(p => ['p', p * W, 1])).sort((a, b) => a[1] - b[1]);
  items.forEach(([sorte, cx, s]) => {
    if (sorte === 't'){
      const H = 26 * s * k, rb = 11 * s * k, rw = 6.5 * s * k, rt = 7.2 * s * k;
      bloc(cx - rb - 1); g.lineTo(cx - rb, HZ);
      for (let i = 0; i <= 8; i++){ const y = H * i / 8, r = rw * Math.sqrt(1 + Math.pow((y - H * .74) / (H * .55), 2)); g.lineTo(cx - Math.min(rb, r), HZ - y); }
      g.lineTo(cx + rt, HZ - H);
      for (let i = 8; i >= 0; i--){ const y = H * i / 8, r = rw * Math.sqrt(1 + Math.pow((y - H * .74) / (H * .55), 2)); g.lineTo(cx + Math.min(rb, r), HZ - y); }
      x = cx + rb;
      CTR_CIEL.panaches.push([cx, HZ - H, rt, rang]);
    } else {
      const H = (rang ? 22 : 15) * k, b = 3.2 * k;
      bloc(cx - b); g.lineTo(cx - b, HZ); g.lineTo(cx - .6, HZ - H * .78); g.lineTo(cx - 6 * k, HZ - H * .78); g.lineTo(cx - 6 * k, HZ - H * .8);
      g.lineTo(cx - .5, HZ - H * .8); g.lineTo(cx, HZ - H); g.lineTo(cx + .5, HZ - H * .8); g.lineTo(cx + 6 * k, HZ - H * .8); g.lineTo(cx + 6 * k, HZ - H * .78);
      g.lineTo(cx + .6, HZ - H * .78); g.lineTo(cx + b, HZ); x = cx + b;
    }
  });
  bloc(W);
}
// Après le remplissage du rang : panaches de vapeur, lueur verte du réacteur à l'horizon, feux d'alarme
function ctrCielApres(g, W, HZ, rang, rnd){
  const u = gfxCielU(0, -200) * W;
  if (!rang){ gfxCielOvale(g, W, u, HZ - 4, 120, 26, [120, 255, 200], .22); gfxCielOvale(g, W, u, HZ - 2, 50, 12, [190, 255, 225], .25); }
  CTR_CIEL.panaches.filter(p => p[3] === rang).forEach(([x, y, r]) => {
    let px = x, py = y, rr = r;
    for (let j = 0; j < 18; j++){ gfxCielOvale(g, W, px, py, rr * 1.3, rr, [170, 190, 188], (rang ? .09 : .06) * (1 - j / 18)); py -= rr * .5; px += rr * .45; rr *= 1.09; }
  });
  if (rang) for (let i = 0; i < 9; i++){ g.fillStyle = 'rgba(255,70,30,' + (.5 + rnd() * .4).toFixed(2) + ')'; g.fillRect(rnd() * W, HZ - 4 - rnd() * 14, 2, 2); }
}

// Accès pour les tests automatiques et le simulateur
window.__centrale = { CTR, CT, ctrIrrNb, ctrFlaque, ctrFlaquesEtape, ctrCoeurEtape, ctrFiltre, ctrVivants, ctrTransfoTouche, ctrTransfoDetruit, ctrCibleBot, cibleBot:ctrCibleBot,
  ctrIci, ctrEstCentrale, ctrArcs, debloquer:ctrDebloquer, ctrFlaqueIM, get idx(){ return LOCS.findIndex(L => L.id === 'centrale'); } };
