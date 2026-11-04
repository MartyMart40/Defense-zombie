'use strict';
/* ================= Compagnon sur le toit : tireur d'élite, chien de garde, mitrailleur ================= */
// Un seul compagnon actif à la fois, posté à gauche de la caméra sur le toit (visible quand on tourne la tête).
// Tout est ici. Crochets posés par réaffectation (comme 19-boss.js et 21-pouvoirs.js) :
// update (tirs, aboiements), visuals (animations, rangement des effets), newGame / startWave / clearZombies (remise à zéro),
// startReload (le chien rapporte les chargeurs), damage (bonus sur les zombies marqués par le chien),
// victory et addXP (annonce d'un déblocage), renderAtelier (section « Compagnon »).
// Les dégâts passent TOUJOURS par damage(z, ...) : armure du boss, argent, XP et ferraille normaux à l'abattage.
// Cibles : seulement le tableau zombies (jamais d'autres personnages de la rue).
// Sauvegarde : P.comp = { act:'sniper'|'dog'|'gunner'|'', own:{ id:true }, lv:{ id:{ dmg, rate, spec } } }, normalisé au chargement.

const CPN_ORDER = ['sniper', 'dog', 'gunner'];
const CPN_LINES = ['dmg', 'rate', 'spec'];
const CPN = {
  sniper: { name:'Tireur d’élite', icon:'🎯', price:0, need:{ win:'village' }, cost:60,
    desc:'Agenouillé à ta gauche derrière les sacs de sable. Tire lentement mais fort, et vise d’abord les plus dangereux : boss, colosses, cracheurs, volants.',
    lines:{ dmg:'Dégâts', rate:'Cadence', spec:'Tir à la tête' } },
  dog:    { name:'Chien de garde', icon:'🐕', price:250, need:{ level:4 }, cost:50,
    desc:'Il ne peut pas mordre du haut du toit, mais il a du flair : il aboie quand un volant ou un sauteur approche et le fait briller dans le brouillard (il prend plus de dégâts). Pendant tes recharges, il court te chercher les chargeurs.',
    lines:{ dmg:'Flair', rate:'Vigilance', spec:'Rapporteur' } },
  gunner: { name:'Mitrailleur', icon:'🔫', price:600, need:{ win:'ville' }, cost:80,
    desc:'Une mitrailleuse sur trépied, posée sur les sacs de sable. Arrose vite les zombies les plus proches de la barricade, puis recharge sa bande.',
    lines:{ dmg:'Dégâts', rate:'Cadence', spec:'Bande de munitions' } }
};
const CPN_MAX = { dmg:20, rate:10, spec:8 };
const CPN_LMULT = { dmg:1, rate:1.2, spec:1.5 };
const CPN_HEAD = 2.5;      // multiplicateur d'un tir à la tête du tireur d'élite
const CPN_MARK_T = 6;      // durée de la marque du chien (s)
const CPN_FAR = -122;      // au-delà, les zombies sortent à peine du brouillard : personne ne tire
const CPN_HOME = { x:-2.9, z:-3.25 }; // place sur le toit (la caméra est en 0, 10, -3,3)
const CPN_ROOF_Y = 8.6;

/* ---------- Statistiques ---------- */
// Dégâts : ×1,15 par niveau. Cadence : jusqu'au double. Spéciale : selon le compagnon.
const cpnSoft = (l, C) => 1 + C * (1 - Math.pow(.85, l));
function cpnStats(id, lv){
  lv = lv || {};
  const d = lv.dmg || 0, r = lv.rate || 0, s = lv.spec || 0, dm = Math.pow(1.15, d), rm = cpnSoft(r, 1);
  switch (id){
    case 'sniper': return { dmg:110 * dm, rate:.4 * rm, range:150, head:Math.min(.8, .2 + .07 * s) };
    case 'gunner': return { dmg:8 * dm, rate:7 * rm, range:55, belt:Math.round(50 * (1 + .25 * s)), reload:3, hit:.9 };
    case 'dog':    return { mark:1.2 + .05 * d, every:4 / rm, n:2 + Math.floor(r / 3), reload:Math.max(.5, 1 - (.12 + .04 * s)), range:105 };
  }
  return null;
}
// Les dégâts suivent la vie des zombies de la vague en cours (comme les pouvoirs)
const cpnPower = () => (plan && plan.hpMult > 0 ? plan.hpMult : 1);

/* ---------- Sauvegarde, déblocage, choix, améliorations ---------- */
function cpnNorm(){
  const o = P.comp && typeof P.comp === 'object' ? P.comp : {};
  const own = {}, lv = {};
  CPN_ORDER.forEach(id => {
    own[id] = !!(o.own && o.own[id]);
    const s = o.lv && o.lv[id] && typeof o.lv[id] === 'object' ? o.lv[id] : {}, l = {};
    CPN_LINES.forEach(k => { const v = +s[k]; l[k] = v > 0 ? Math.min(CPN_MAX[k], Math.floor(v)) : 0; });
    lv[id] = l;
  });
  const act = typeof o.act === 'string' && CPN[o.act] && own[o.act] ? o.act : '';
  P.comp = { act, own, lv };
}
cpnNorm();
function cpnLv(id){ if (!P.comp || !P.comp.lv || !P.comp.lv[id]) cpnNorm(); return P.comp.lv[id]; }
const cpnP = () => { if (!P.comp || !P.comp.own || !P.comp.lv) cpnNorm(); return P.comp; };
const cpnOwned = id => !!(CPN[id] && P.comp && P.comp.own && P.comp.own[id]);
function cpnActive(){ const a = P.comp && P.comp.act; return a && cpnOwned(a) ? a : ''; }
function cpnReqMet(id){
  const n = CPN[id] && CPN[id].need; if (!n) return false;
  if (n.win) return !!(P.wins && P.wins[n.win] > 0);
  if (n.level) return (P.level || 1) >= n.level;
  return true;
}
function cpnReqTxt(id){
  const n = CPN[id].need;
  if (n.win){ const L = LOCS.find(x => x.id === n.win); return 'Libère ' + (L ? L.name : n.win); }
  if (n.level) return 'Atteins le niveau ' + n.level + ' (tu es niveau ' + (P.level || 1) + ')';
  return '';
}
// Donne les compagnons gratuits dont la condition est remplie. Retourne les nouveaux.
function cpnSync(){
  cpnP(); const nw = [];
  CPN_ORDER.forEach(id => {
    if (cpnOwned(id) || CPN[id].price > 0 || !cpnReqMet(id)) return;
    P.comp.own[id] = true; nw.push(id);
    if (!cpnActive()) P.comp.act = id;
  });
  if (nw.length){ saveP(); cpnApply(); }
  return nw;
}
function cpnBuy(id){
  cpnP(); if (!CPN[id] || cpnOwned(id) || !cpnReqMet(id)) return false;
  const c = CPN[id].price; if (!(P.scrap >= c)) return false;
  P.scrap -= c; P.comp.own[id] = true;
  if (!cpnActive()) P.comp.act = id;
  saveP(); cpnApply(); return true;
}
// id = '' : aucun compagnon sur le toit
function cpnSelect(id){
  cpnP(); if (id && !cpnOwned(id)) return false;
  P.comp.act = id || ''; saveP(); cpnApply(); return true;
}
const cpnUpgCost = (id, k, l) => Math.round(CPN[id].cost * CPN_LMULT[k] * Math.pow(1.35, l));
function cpnUpgrade(id, k){
  if (!CPN[id] || CPN_LINES.indexOf(k) < 0 || !cpnOwned(id)) return false;
  const lv = cpnLv(id), l = lv[k]; if (l >= CPN_MAX[k]) return false;
  const c = cpnUpgCost(id, k, l); if (!(P.scrap >= c)) return false;
  P.scrap -= c; lv[k] = l + 1; saveP();
  if (id === 'gunner' && k === 'spec' && cpnS.belt > 0) cpnS.belt = Math.min(cpnS.belt + 10, cpnStats('gunner', lv).belt);
  return true;
}

/* ---------- Scène : modèles en boîtes et pools d'effets, créés une seule fois ---------- */
const cpnRoot = new THREE.Group(); cpnRoot.position.y = CPN_ROOF_Y; scene.add(cpnRoot); // hors de « world » : disposeWorld() n'y touche pas
const cpnFx = new THREE.Group(); scene.add(cpnFx);
const CPNG = new THREE.BoxGeometry(1, 1, 1);
const CPNM = {
  skin:lam(0xb88a68), olive:lam(0x4a5236), khaki:lam(0x6a6248), pants:lam(0x34302a), boot:lam(0x1e1c1a), helm:lam(0x3a4030),
  cap:lam(0x2a2c30), navy:lam(0x2e3a4a), gun:lam(0x1c1d22), wood:lam(0x5a3f26), steel:lam(0x4a4e54), ammo:lam(0x4a5236), brass:lam(0x9a7a2a),
  fur:lam(0x7a5434), furD:lam(0x3e2a1a), nose:lam(0x111111), tongue:lam(0xb04a4a), collar:lam(0x8a2a1e)
};
const cpnGlow = (c, o) => new THREE.MeshBasicMaterial({ color:c, transparent:true, opacity:o, blending:THREE.AdditiveBlending, depthWrite:false, fog:false });
const CPNF = { tracer:cpnGlow(0xffd27a, .95), tracerS:cpnGlow(0xfff0c0, 1) };
function cpnBox(parent, mat, sx, sy, sz, x, y, z){ const m = new THREE.Mesh(CPNG, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m); return m; }
function cpnGrp(parent, x, y, z){ const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
const cpnFlashMat = new THREE.SpriteMaterial({ map:glowTex, color:0xffc070, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true, fog:false });

// Soldat agenouillé (tireur d'élite et mitrailleur). Retourne les pivots utiles.
function cpnSoldier(parent, coat, hat, cap){
  const b = cpnGrp(parent, 0, 0, 0);
  // Jambe droite : genou au sol. Jambe gauche : pied en avant.
  cpnBox(b, CPNM.pants, .17, .14, .5, .14, .07, .12); cpnBox(b, CPNM.pants, .18, .44, .2, .14, .32, -.08); cpnBox(b, CPNM.boot, .14, .1, .2, .14, .06, .42);
  cpnBox(b, CPNM.pants, .18, .18, .44, -.14, .5, -.2); cpnBox(b, CPNM.pants, .16, .48, .18, -.14, .25, -.42); cpnBox(b, CPNM.boot, .16, .1, .26, -.14, .05, -.48);
  const torso = cpnGrp(b, 0, .58, 0); torso.rotation.order = 'YXZ';
  cpnBox(torso, coat, .5, .6, .3, 0, .3, 0);
  cpnBox(torso, CPNM.khaki, .52, .12, .32, 0, .08, 0);                 // ceinture et poches
  const head = cpnGrp(torso, 0, .76, -.02);
  cpnBox(head, CPNM.skin, .25, .27, .25, 0, 0, 0);
  if (cap){ cpnBox(head, hat, .28, .09, .3, 0, .15, 0); cpnBox(head, hat, .24, .03, .14, 0, .11, -.2); }
  else { cpnBox(head, hat, .32, .14, .34, 0, .14, 0); cpnBox(head, hat, .36, .04, .38, 0, .07, 0); }
  cpnBox(head, CPNM.boot, .2, .04, .02, 0, .03, -.13);                 // yeux dans l'ombre
  return { b, torso, head };
}
function cpnBuildSniper(){
  const g = cpnGrp(cpnRoot, CPN_HOME.x, 0, CPN_HOME.z);
  const s = cpnSoldier(g, CPNM.olive, CPNM.helm, false);
  s.torso.rotation.x = -.18;
  const aim = cpnGrp(s.torso, 0, .5, -.05); aim.rotation.order = 'YXZ';
  const rifle = cpnGrp(aim, .13, 0, 0);
  cpnBox(rifle, CPNM.wood, .07, .13, .32, 0, -.03, .08);                // crosse
  cpnBox(rifle, CPNM.wood, .07, .08, .6, 0, 0, -.38);                   // fût
  cpnBox(rifle, CPNM.gun, .035, .035, .55, 0, .01, -.92);               // canon
  cpnBox(rifle, CPNM.gun, .055, .055, .28, 0, .085, -.3);               // lunette
  cpnBox(rifle, CPNM.gun, .03, .08, .03, 0, -.02, -.98);                // bipied replié
  const bolt = cpnBox(rifle, CPNM.steel, .07, .025, .025, .05, .03, -.12);
  const mz = cpnGrp(rifle, 0, .01, -1.22);
  const armR = cpnGrp(aim, .24, -.02, .05); cpnBox(armR, CPNM.olive, .11, .11, .34, 0, -.05, -.12); cpnBox(armR, CPNM.skin, .08, .08, .08, -.06, -.06, -.3);
  const armL = cpnGrp(aim, -.22, -.02, 0); armL.rotation.y = -.35; cpnBox(armL, CPNM.olive, .11, .11, .5, 0, -.06, -.25); cpnBox(armL, CPNM.skin, .08, .08, .08, .1, -.06, -.5);
  const flash = new THREE.Sprite(cpnFlashMat); flash.visible = false; flash.scale.set(.6, .6, 1); mz.add(flash);
  g.visible = false;
  return { id:'sniper', g, torso:s.torso, head:s.head, aim, rifle, bolt, armR, mz, flash, rec:0, boltT:0, yaw:0, pitch:-.15 };
}
function cpnBuildGunner(){
  const g = cpnGrp(cpnRoot, CPN_HOME.x, 0, CPN_HOME.z);
  // Trépied posé sur les sacs de sable (le rebord est 0,5 m devant)
  const tri = cpnGrp(g, 0, 0, -.42);
  [[-.22, .1, .2], [.22, .1, -.2], [0, -.15, 0]].forEach(p => { const l = cpnBox(tri, CPNM.steel, .04, .62, .04, p[0], .28, p[1]); l.rotation.z = p[2]; l.rotation.x = p[0] === 0 ? .35 : -.2; });
  const gun = cpnGrp(tri, 0, .6, 0); gun.rotation.order = 'YXZ';
  cpnBox(gun, CPNM.gun, .16, .16, .5, 0, 0, 0);                         // boîte de culasse
  cpnBox(gun, CPNM.steel, .09, .09, .45, 0, .01, -.45);                 // manchon perforé
  cpnBox(gun, CPNM.gun, .045, .045, .3, 0, .01, -.8);                   // canon
  cpnBox(gun, CPNM.ammo, .2, .17, .24, -.19, -.03, .02);                // caisse de la bande
  const beltM = cpnBox(gun, CPNM.brass, .07, .03, .16, -.08, .07, .02); // bout de bande
  cpnBox(gun, CPNM.gun, .05, .12, .05, -.07, -.1, .25); cpnBox(gun, CPNM.gun, .05, .12, .05, .07, -.1, .25); // poignées
  const mz = cpnGrp(gun, 0, .01, -.97);
  const flash = new THREE.Sprite(cpnFlashMat); flash.visible = false; flash.scale.set(.5, .5, 1); mz.add(flash);
  const man = cpnGrp(g, 0, 0, .38);
  const s = cpnSoldier(man, CPNM.navy, CPNM.cap, true);
  s.torso.rotation.x = -.3;
  const armL = cpnGrp(s.torso, -.24, .48, -.02); cpnBox(armL, CPNM.navy, .11, .11, .46, 0, -.08, -.2); cpnBox(armL, CPNM.skin, .08, .08, .08, .05, -.1, -.44);
  const armR = cpnGrp(s.torso, .24, .48, -.02); cpnBox(armR, CPNM.navy, .11, .11, .46, 0, -.08, -.2); cpnBox(armR, CPNM.skin, .08, .08, .08, -.05, -.1, -.44);
  const belt = cpnBox(armL, CPNM.brass, .06, .03, .2, .05, -.12, -.5); belt.visible = false; // bande neuve dans la main
  g.visible = false;
  return { id:'gunner', g, gun, mz, flash, man, torso:s.torso, head:s.head, armL, armR, belt, beltM, yaw:0, pitch:-.15, jit:0 };
}
function cpnBuildDog(){
  const g = cpnGrp(cpnRoot, CPN_HOME.x + 1, 0, CPN_HOME.z + .35);
  const body = cpnGrp(g, 0, .44, 0);
  cpnBox(body, CPNM.fur, .28, .28, .66, 0, 0, 0);                         // corps
  cpnBox(body, CPNM.furD, .29, .1, .5, 0, .14, .04);                      // dos plus foncé
  cpnBox(body, CPNM.collar, .24, .06, .08, 0, .14, -.32);                 // collier
  const head = cpnGrp(body, 0, .2, -.36); head.rotation.order = 'YXZ';
  cpnBox(head, CPNM.fur, .24, .22, .24, 0, .06, -.04);
  cpnBox(head, CPNM.fur, .13, .1, .2, 0, 0, -.24);                        // museau
  cpnBox(head, CPNM.nose, .06, .05, .04, 0, .04, -.35);
  const jaw = cpnGrp(head, 0, -.05, -.14); cpnBox(jaw, CPNM.furD, .11, .04, .18, 0, -.02, -.08); cpnBox(jaw, CPNM.tongue, .05, .02, .08, 0, .01, -.1);
  const earL = cpnBox(head, CPNM.furD, .06, .12, .04, -.09, .2, .02), earR = cpnBox(head, CPNM.furD, .06, .12, .04, .09, .2, .02);
  [-.035, .035].forEach(x => cpnBox(head, CPNM.nose, .03, .03, .02, x * 2, .1, -.17));
  const mag = cpnBox(head, CPNM.gun, .2, .05, .05, 0, -.04, -.3); mag.visible = false; // chargeur rapporté
  const tail = cpnGrp(body, 0, .1, .33); tail.rotation.x = .9; cpnBox(tail, CPNM.furD, .05, .05, .32, 0, 0, .16);
  const legs = [];
  [[-.1, -.24], [.1, -.24], [-.1, .24], [.1, .24]].forEach(p => {
    const l = cpnGrp(body, p[0], -.1, p[1]); cpnBox(l, CPNM.fur, .08, .36, .08, 0, -.18, 0); cpnBox(l, CPNM.furD, .09, .05, .12, 0, -.34, -.02); legs.push(l);
  });
  // Caisse de munitions sur le toit (là où il va chercher les chargeurs)
  const crate = cpnGrp(cpnRoot, CPN_HOME.x - 1.4, 0, CPN_HOME.z + 1.6);
  cpnBox(crate, CPNM.ammo, .6, .34, .38, 0, .17, 0); cpnBox(crate, CPNM.khaki, .62, .05, .4, 0, .36, 0); cpnBox(crate, CPNM.brass, .1, .06, .02, 0, .22, -.2);
  crate.visible = false;
  g.visible = false;
  return { id:'dog', g, body, head, jaw, earL, earR, mag, tail, legs, crate, home:new THREE.Vector3(g.position.x, 0, g.position.z), barkT:0, runT:0, runD:1, yaw:0 };
}
const CPN_MOD = { sniper:cpnBuildSniper(), gunner:cpnBuildGunner(), dog:cpnBuildDog() };

// Traçantes (pool), halos des zombies marqués (pool, un seul matériau partagé)
const cpnTracers = [];
for (let i = 0; i < 18; i++){ const m = new THREE.Mesh(CPNG, CPNF.tracer); m.visible = false; cpnFx.add(m); cpnTracers.push({ m, life:0 }); }
const cpnHaloMat = new THREE.SpriteMaterial({ map:glowTex, color:0xffe066, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true, opacity:.75, fog:false });
const cpnHalos = [];
for (let i = 0; i < 8; i++){ const s = new THREE.Sprite(cpnHaloMat); s.visible = false; cpnFx.add(s); cpnHalos.push({ m:s, z:null }); }
const cpnA = new THREE.Vector3(), cpnB = new THREE.Vector3(), cpnTmp = new THREE.Vector3();
function cpnTracer(a, b, w, life, mat){
  let o = null; for (const t of cpnTracers) if (!t.m.visible){ o = t; break; }
  if (!o) return;
  o.m.material = mat || CPNF.tracer;
  o.m.position.copy(a).add(b).multiplyScalar(.5);
  o.m.scale.set(w, w, Math.max(.01, a.distanceTo(b)));
  o.m.lookAt(b); o.m.visible = true; o.life = life;
}

/* ---------- Partie en cours ---------- */
const cpnS = { cd:1, scan:0, tgt:null, belt:0, reload:0, bark:1.5, sndT:0, flashT:0 };
let cpnFxOn = false;
function cpnReset(){
  cpnClearFx();
  const g = cpnStats('gunner', cpnLv('gunner'));
  cpnS.cd = rand(.6, 1.2); cpnS.scan = 0; cpnS.tgt = null; cpnS.belt = g.belt; cpnS.reload = 0; cpnS.bark = 1.5; cpnS.sndT = 0; cpnS.flashT = 0;
  const d = CPN_MOD.dog; d.runT = 0; d.mag.visible = false; d.g.position.copy(d.home);
  CPN_MOD.gunner.belt.visible = false;
}
function cpnClearFx(){
  cpnTracers.forEach(t => { t.m.visible = false; t.life = 0; });
  cpnHalos.forEach(h => { h.m.visible = false; h.z = null; });
  CPN_MOD.sniper.flash.visible = CPN_MOD.gunner.flash.visible = false;
  zombies.forEach(z => { z.cpnMarkT = 0; });
  cpnS.tgt = null; cpnFxOn = false;
}
// Affiche le bon modèle sur le toit
function cpnApply(){
  const a = cpnActive();
  CPN_ORDER.forEach(id => { CPN_MOD[id].g.visible = id === a; });
  CPN_MOD.dog.crate.visible = a === 'dog';
  cpnS.tgt = null;
}

/* ---------- Ciblage ---------- */
const cpnAlive = z => !!z && !z.dead && z.hp > 0 && !z.civil && !z.civilian && z.g && z.g.position.z > CPN_FAR;
const CPN_DANGER = { boss:100, colossus:60, spitter:40, flyer:35, brute:30, jumper:15, runner:8, walker:4 };
// Distance horizontale depuis la place du compagnon
function cpnDist2(z){ const dx = z.g.position.x - CPN_HOME.x, dz = z.g.position.z - CPN_HOME.z; return dx * dx + dz * dz; }
// Rôle : le tireur d'élite vise les plus dangereux, le mitrailleur les plus proches de la barricade, le chien les volants et sauteurs.
function cpnPick(id, list){
  list = list || zombies;
  const s = cpnStats(id, cpnLv(id));
  let best = null, bs = -1e9;
  for (const z of list){
    if (!cpnAlive(z)) continue;
    let sc;
    if (id === 'sniper'){
      if (cpnDist2(z) > s.range * s.range) continue;
      // Danger du type, puis proximité de la barricade (ceux qui frappent déjà passent avant)
      sc = (CPN_DANGER[z.type] != null ? CPN_DANGER[z.type] : 10) * 10 + (z.g.position.z - CPN_FAR) * .5 + (z.st === 'attack' ? 30 : 0);
    } else if (id === 'gunner'){
      if (z.g.position.z < BAR_Z - s.range) continue;
      sc = z.g.position.z;
    } else if (id === 'dog'){
      if (z.type !== 'flyer' && z.type !== 'jumper') continue;
      if (z.cpnMarkT > 0 || z.g.position.z < -s.range) continue;
      sc = z.g.position.z;
    } else return null;
    if (sc > bs){ bs = sc; best = z; }
  }
  return best;
}

/* ---------- Tirs ---------- */
const cpnCenter = (z, out) => out.set(z.g.position.x, z.g.position.y + (z.aimY != null ? z.aimY : 1.1 * ((ZTYPES[z.type] || {}).scale || 1)), z.g.position.z);
// Oriente le modèle vers la cible (immédiatement si dt est absent) ; yaw et tangage dans le repère du toit
function cpnAimAt(M, p, dt){
  const ox = M.g.position.x, oz = M.g.position.z, oy = CPN_ROOF_Y + .9;
  const dx = p.x - ox, dz = p.z - oz, dy = p.y - oy;
  const wy = Math.atan2(-dx, -dz), wp = clamp(Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)), -1.1, .9);
  let d = wy - M.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
  const k = dt ? Math.min(1, dt * 9) : 1;
  M.yaw += d * k; M.pitch += (wp - M.pitch) * k;
}
function cpnMuzzle(M, out){ cpnRoot.updateMatrixWorld(true); return M.mz.getWorldPosition(out); }
function cpnShootSniper(z, s){
  const M = CPN_MOD.sniper;
  const head = !!(z.head && !z.headGone && z.head.visible !== false) && Math.random() < s.head;
  const p = new THREE.Vector3();
  if (head){ z.g.updateMatrixWorld(true); z.head.getWorldPosition(p); } else cpnCenter(z, p);
  cpnAimAt(M, p); cpnPose();
  cpnMuzzle(M, cpnA);
  cpnTracer(cpnA, p, .06, .09, CPNF.tracerS);
  M.rec = 1; M.boltT = .55; M.flash.visible = true; cpnS.flashT = .06; M.flash.material.rotation = Math.random() * 6;
  if (typeof Snd === 'object'){ Snd.burst(1100, .45, .5); Snd.tone(140, .15, 'sine', .35, 40); }
  damage(z, s.dmg * cpnPower() * (head ? CPN_HEAD : 1), head, p);
}
function cpnShootGunner(z, s){
  const M = CPN_MOD.gunner;
  const p = cpnCenter(z, new THREE.Vector3());
  cpnAimAt(M, p); cpnPose();
  cpnMuzzle(M, cpnA);
  const hit = Math.random() < s.hit;
  if (!hit){ p.x += rand(-1.2, 1.2); p.y = Math.max(.05, p.y + rand(-.8, .3)); p.z += rand(-1, 1); }
  cpnTracer(cpnA, p, .035, .045);
  M.jit = 1; M.flash.visible = true; cpnS.flashT = .04; M.flash.material.rotation = Math.random() * 6;
  if (cpnS.sndT <= 0 && typeof Snd === 'object'){ cpnS.sndT = .11; Snd.burst(2400, .07, .14); }
  if (hit) damage(z, s.dmg * cpnPower(), false, p);
  else if (p.y < .3) burst(p, 'dust', 2, 1.2);
}
function cpnBark(list){
  const d = CPN_MOD.dog;
  d.barkT = .7;
  list.forEach(z => {
    z.cpnMarkT = CPN_MARK_T;
    if (typeof floatText === 'function') floatText('Ouaf ! ' + ((ZTYPES[z.type] && ZTYPES[z.type].name) || ''), cpnCenter(z, cpnTmp), false);
  });
  if (list[0]){ cpnCenter(list[0], cpnTmp); d.lookX = cpnTmp.x; d.lookZ = cpnTmp.z; }
  if (typeof Snd === 'object'){ Snd.tone(520, .09, 'square', .1, 300); Snd.tone(480, .1, 'square', .1, 260, .2); }
}

/* ---------- Mise à jour (pendant le jeu seulement) ---------- */
function cpnUpdate(dt){
  cpnS.sndT -= dt;
  // Les marques du chien s'effacent
  for (const z of zombies) if (z.cpnMarkT > 0){ z.cpnMarkT -= dt; if (z.dead) z.cpnMarkT = 0; }
  const id = cpnActive(); if (!id) return;
  cpnFxOn = true;
  const s = cpnStats(id, cpnLv(id));
  if (id === 'sniper'){
    cpnS.cd -= dt; cpnS.scan -= dt;
    if (cpnS.scan <= 0 || !cpnAlive(cpnS.tgt)){ cpnS.tgt = cpnPick('sniper'); cpnS.scan = .25; }
    if (cpnS.cd > 0) return;
    if (!cpnS.tgt){ cpnS.cd = .2; return; }
    cpnS.cd = 1 / s.rate;
    cpnShootSniper(cpnS.tgt, s);
    if (!cpnAlive(cpnS.tgt)) cpnS.tgt = null;
  } else if (id === 'gunner'){
    if (cpnS.reload > 0){ cpnS.reload -= dt; if (cpnS.reload <= 0){ cpnS.reload = 0; cpnS.belt = s.belt; } return; }
    cpnS.cd -= dt; cpnS.scan -= dt;
    if (cpnS.scan <= 0 || !cpnAlive(cpnS.tgt)){ cpnS.tgt = cpnPick('gunner'); cpnS.scan = .2; }
    if (cpnS.cd > 0) return;
    if (!cpnS.tgt){ cpnS.cd = .15; return; }
    const iv = 1 / s.rate;
    while (cpnS.cd <= 0 && cpnS.belt > 0 && cpnAlive(cpnS.tgt)){
      cpnS.cd += iv; cpnS.belt--;
      cpnShootGunner(cpnS.tgt, s);
    }
    if (cpnS.cd < 0) cpnS.cd = 0;
    if (!cpnAlive(cpnS.tgt)) cpnS.tgt = null;
    if (cpnS.belt <= 0){ cpnS.reload = s.reload; cpnS.cd = .2; if (typeof Snd === 'object') Snd.tone(900, .06, 'square', .06, 500, .3); }
  } else if (id === 'dog'){
    cpnS.bark -= dt; if (cpnS.bark > 0) return;
    const list = [];
    for (let k = 0; k < s.n; k++){ const z = cpnPick('dog'); if (!z) break; z.cpnMarkT = CPN_MARK_T; list.push(z); }
    if (list.length){ cpnBark(list); cpnS.bark = s.every; } else cpnS.bark = .3;
  }
}

/* ---------- Animations (chaque image, même hors partie : il respire sur le toit) ---------- */
let cpnT = 0;
// Applique yaw et tangage aux pivots du modèle actif
function cpnPose(){
  const S_ = CPN_MOD.sniper, G = CPN_MOD.gunner;
  S_.torso.rotation.y = S_.yaw; S_.aim.rotation.x = S_.pitch + .18 + S_.rec * .12; S_.aim.position.z = -.05 + S_.rec * .08;
  G.gun.rotation.y = G.yaw; G.gun.rotation.x = G.pitch;
  G.man.rotation.y = G.yaw * .7; G.man.position.x = Math.sin(G.yaw) * -.3; G.man.position.z = .38 - (1 - Math.cos(G.yaw)) * .3;
}
function cpnFrame(dt){
  dt = dt || 0; cpnT += dt;
  const playing = state === 'playing' || state === 'paused';
  if (!playing && cpnFxOn) cpnClearFx();
  // Traçantes
  for (const t of cpnTracers){ if (!t.m.visible) continue; t.life -= dt; if (t.life <= 0) t.m.visible = false; }
  if (cpnS.flashT > 0){ cpnS.flashT -= dt; if (cpnS.flashT <= 0) CPN_MOD.sniper.flash.visible = CPN_MOD.gunner.flash.visible = false; }
  const a = cpnActive();
  const tg = playing && cpnAlive(cpnS.tgt) ? cpnCenter(cpnS.tgt, cpnB) : cpnB.set(CPN_HOME.x * .3, 1, -45);
  if (a === 'sniper'){
    const M = CPN_MOD.sniper;
    cpnAimAt(M, tg, dt);
    M.rec = Math.max(0, M.rec - dt * 6);
    if (M.boltT > 0){ M.boltT -= dt; const u = clamp(1 - M.boltT / .55, 0, 1); const k = Math.sin(u * Math.PI);
      M.armR.rotation.x = -.5 * k; M.bolt.position.z = -.12 + .12 * k; } else { M.armR.rotation.x = 0; M.bolt.position.z = -.12; }
    M.torso.position.y = .58 + Math.sin(cpnT * 1.7) * .006;
    M.head.rotation.y = Math.sin(cpnT * .4) * .05;
  } else if (a === 'gunner'){
    const M = CPN_MOD.gunner, rl = cpnS.reload > 0 && playing;
    cpnAimAt(M, tg, dt);
    if (rl){ const u = clamp(1 - cpnS.reload / cpnStats('gunner', cpnLv('gunner')).reload, 0, 1), k = Math.sin(u * Math.PI); M.pitch += (.3 * k - M.pitch) * Math.min(1, dt * 8);
      M.armL.rotation.x = -.9 * k; M.armL.rotation.y = .6 * k; M.belt.visible = u > .15 && u < .7; M.beltM.visible = u >= .7; M.torso.rotation.x = -.3 - .15 * k;
      M.head.rotation.x = .4 * k; }
    else { M.armL.rotation.x = M.armL.rotation.y = 0; M.belt.visible = false; M.beltM.visible = true; M.torso.rotation.x = -.3; M.head.rotation.x = 0; }
    M.jit = Math.max(0, M.jit - dt * 20);
    M.gun.position.x = (Math.random() - .5) * .025 * M.jit; M.gun.position.z = M.jit * .03;
    M.torso.position.y = .58 + Math.sin(cpnT * 1.5) * .005;
  } else if (a === 'dog') cpnDogFrame(dt, playing);
  cpnPose();
  // Halos des zombies marqués par le chien
  let hi = 0;
  if (playing){
    const k = .6 + .3 * Math.sin(cpnT * 8);
    cpnHaloMat.opacity = k;
    for (const z of zombies){
      if (hi >= cpnHalos.length) break;
      if (!(z.cpnMarkT > 0) || z.dead) continue;
      const h = cpnHalos[hi++]; cpnCenter(z, h.m.position); h.z = z;
      const sc = 2.6 * ((ZTYPES[z.type] || {}).scale || 1); h.m.scale.set(sc, sc, 1); h.m.visible = true;
    }
  }
  for (; hi < cpnHalos.length; hi++){ const h = cpnHalos[hi]; if (h.m.visible){ h.m.visible = false; h.z = null; } }
}
function cpnDogFrame(dt, playing){
  const D = CPN_MOD.dog, gp = D.g.position;
  D.tail.rotation.y = Math.sin(cpnT * (D.runT > 0 ? 18 : 9)) * .5;
  if (D.runT > 0 && playing){
    // Aller-retour jusqu'à la caisse pendant la recharge
    D.runT -= dt; const u = clamp(1 - D.runT / D.runD, 0, 1), back = u > .5, v = back ? (u - .5) * 2 : u * 2;
    const cx = D.crate.position.x + .5, cz = D.crate.position.z - .3;
    const fx = back ? cx : D.home.x, fz = back ? cz : D.home.z, tx = back ? D.home.x : cx, tz = back ? D.home.z : cz;
    const e = v * v * (3 - 2 * v);
    gp.set(fx + (tx - fx) * e, 0, fz + (tz - fz) * e);
    D.g.rotation.y = Math.atan2(-(tx - fx), -(tz - fz));
    D.mag.visible = back;
    const ph = cpnT * 22;
    D.legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? 1.2 : 0)) * .7; });
    D.body.rotation.x = 0; D.body.position.y = .44 + Math.abs(Math.sin(ph)) * .04;
    D.head.rotation.x = 0; D.jaw.rotation.x = .15;
    if (D.runT <= 0){ gp.copy(D.home); D.mag.visible = false; }
    return;
  }
  D.runT = 0; D.mag.visible = false;
  gp.lerp(D.home, Math.min(1, dt * 6));
  // Assis, tourné vers la rue ; il regarde ce qu'il signale
  let want = 0;
  if (D.barkT > 0 && D.lookX != null) want = Math.atan2(-(D.lookX - gp.x), -(D.lookZ - gp.z));
  D.g.rotation.y += (want - D.g.rotation.y) * Math.min(1, dt * 6);
  D.body.rotation.x = .45; D.body.position.y = .5;
  D.legs[0].rotation.x = D.legs[1].rotation.x = -.45;   // pattes avant droites
  D.legs[2].rotation.x = D.legs[3].rotation.x = -1.35;  // pattes arrière repliées
  if (D.barkT > 0){
    D.barkT -= dt;
    const b = Math.max(0, Math.sin((.7 - D.barkT) * 18));
    D.head.rotation.x = -.45 + .35 * b; D.jaw.rotation.x = .5 * b;
    D.earL.rotation.z = D.earR.rotation.z = 0;
  } else {
    D.head.rotation.x = -.45 + Math.sin(cpnT * 1.3) * .05; D.jaw.rotation.x = .12 + Math.max(0, Math.sin(cpnT * 6)) * .06; // il halète
    D.head.rotation.y = Math.sin(cpnT * .5) * .3;
  }
}
// Le chien rapporte les chargeurs : la recharge en cours est raccourcie
function cpnOnReload(){
  if (cpnActive() !== 'dog' || state !== 'playing' || !(reloadT > 0)) return;
  const f = cpnStats('dog', cpnLv('dog')).reload;
  reloadT *= f; reloadDur *= f;
  const D = CPN_MOD.dog; D.runD = D.runT = Math.max(.5, reloadT);
}
// Bonus de dégâts sur les zombies marqués (s'applique à tous les tirs qui passent par damage)
function cpnMarkMult(z){ return z && z.cpnMarkT > 0 && !z.dead && cpnActive() === 'dog' ? cpnStats('dog', cpnLv('dog')).mark : 1; }

/* ---------- Atelier : section « Compagnon » ---------- */
const cpnF1 = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
const cpnR0 = v => Math.round(v).toLocaleString('fr-CA');
const cpnFmtS = n => (typeof fmtS === 'function' ? fmtS(n) : Math.floor(n).toLocaleString('fr-CA') + ' ⚙');
function cpnLineTxt(id, k, s){
  if (id === 'sniper') return k === 'dmg' ? cpnR0(s.dmg) + ' dégâts par tir' : k === 'rate' ? 'un tir toutes les ' + cpnF1(1 / s.rate) + ' s' : Math.round(s.head * 100) + ' % de tirs à la tête (×' + cpnF1(CPN_HEAD) + ')';
  if (id === 'gunner') return k === 'dmg' ? cpnR0(s.dmg) + ' dégâts par balle' : k === 'rate' ? cpnF1(s.rate) + ' balles par seconde' : 'bande de ' + s.belt + ' balles';
  return k === 'dmg' ? 'les zombies marqués prennent +' + Math.round((s.mark - 1) * 100) + ' % de dégâts'
    : k === 'rate' ? 'aboie toutes les ' + cpnF1(s.every) + ' s, marque jusqu’à ' + s.n + ' zombies'
    : 'tes recharges ' + Math.round((1 - s.reload) * 100) + ' % plus rapides';
}
function cpnRenderShop(){
  const el = $('cpnShop'); if (!el) return;
  const act = cpnActive();
  let h = '<div class="ds at-note">Un seul compagnon à la fois, à ta gauche sur le toit : tourne la tête pour le voir. Ses abattus te rapportent argent, expérience et ferraille comme les tiens. Améliorations en ferraille, permanentes. Les dégâts suivent la force des zombies de la vague.</div>';
  CPN_ORDER.forEach(id => {
    const D = CPN[id], own = cpnOwned(id), met = cpnReqMet(id), on = act === id, lv = cpnLv(id), s = cpnStats(id, lv);
    h += '<div class="cpn-card' + (on ? ' on' : '') + (!own && !met ? ' locked' : '') + '"><div class="nm">' + D.icon + ' ' + D.name + (on ? ' <span class="at-lv">sur le toit</span>' : '') + '</div><div class="ds">' + D.desc + '</div>';
    if (!own){
      if (!met) h += '<div class="ds cpn-lock">🔒 ' + cpnReqTxt(id) + (D.price ? ', puis recrute-le pour ' + cpnFmtS(D.price) : ' pour le débloquer') + '.</div>';
      else h += '<div class="btns"><button data-cpn="buy" data-id="' + id + '"' + (P.scrap < D.price ? ' disabled' : '') + '>Recruter ' + cpnFmtS(D.price) + '</button></div>';
      h += '</div>'; return;
    }
    h += '<div class="btns">' + (on ? '<button data-cpn="sel" data-id="">Le laisser au repos</button>' : '<button data-cpn="sel" data-id="' + id + '">L’emmener sur le toit</button>') + '</div>';
    CPN_LINES.forEach(k => {
      const l = lv[k], max = l >= CPN_MAX[k], c = cpnUpgCost(id, k, l), nxt = Object.assign({}, lv); nxt[k] = l + 1;
      const cur = cpnLineTxt(id, k, s), aft = max ? '' : cpnLineTxt(id, k, cpnStats(id, nxt));
      h += '<div class="row"><div class="info"><div class="nm">' + D.lines[k] + ' <span class="at-lv">niv. ' + l + '</span></div><div class="ds">' + cur + (max ? ' (maximum)' : ' → ' + aft) + '</div></div>'
        + '<button data-cpn="upg" data-id="' + id + '" data-k="' + k + '"' + (max || P.scrap < c ? ' disabled' : '') + '>' + (max ? 'Max' : cpnFmtS(c)) + '</button></div>';
    });
    h += '</div>';
  });
  el.innerHTML = h;
}
function cpnClick(b){
  const act = b.dataset.cpn, id = b.dataset.id || '';
  let okA = false;
  if (act === 'buy'){ okA = cpnBuy(id); if (okA) toast(CPN[id].name + ' te rejoint sur le toit !'); }
  else if (act === 'sel') okA = cpnSelect(id);
  else if (act === 'upg') okA = cpnUpgrade(id, b.dataset.k);
  if (okA && act !== 'sel' && typeof Snd === 'object') Snd.buy();
  if (typeof renderAtelier === 'function') renderAtelier(); else cpnRenderShop();
  if (typeof atelierLabels === 'function') atelierLabels();
  return okA;
}
(function(){
  const back = $('btnAtBack');
  if (!back || !back.parentNode || !back.parentNode.insertBefore) return;
  const t = document.createElement('h3'); t.textContent = 'Compagnon';
  const d = document.createElement('div'); d.id = 'cpnShop';
  back.parentNode.insertBefore(t, back); back.parentNode.insertBefore(d, back);
  d.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button[data-cpn]'); if (!b || b.disabled) return;
    cpnClick(b);
  });
  cpnRenderShop();
})();

/* ---------- Annonces de déblocage ---------- */
function cpnNews(before){
  const out = [];
  const nw = cpnSync();
  nw.forEach(id => out.push('Nouveau compagnon : ' + CPN[id].name + ' ! Il t’attend sur le toit (atelier).'));
  CPN_ORDER.forEach(id => { if (CPN[id].price > 0 && !cpnOwned(id) && !before[id] && cpnReqMet(id)) out.push(CPN[id].name + ' peut être recruté à l’atelier (' + cpnFmtS(CPN[id].price) + ').'); });
  return out;
}
const cpnMetMap = () => { const o = {}; CPN_ORDER.forEach(id => { o[id] = cpnReqMet(id); }); return o; };

/* ---------- Crochets sur le code commun (par réaffectation) ---------- */
try { const _b = update; update = function(dt){ const r = _b.apply(this, arguments); if (state === 'playing') cpnUpdate(dt); return r; }; } catch (e) { errNote(e); }
try { const _b = visuals; visuals = function(dt){ const r = _b.apply(this, arguments); cpnFrame(dt); return r; }; } catch (e) { errNote(e); }
try { const _b = newGame; newGame = function(){ const r = _b.apply(this, arguments); cpnReset(); return r; }; } catch (e) { errNote(e); }
try { const _b = startWave; startWave = function(){ cpnReset(); return _b.apply(this, arguments); }; } catch (e) { errNote(e); }
try { const _b = clearZombies; clearZombies = function(){ cpnClearFx(); return _b.apply(this, arguments); }; } catch (e) { errNote(e); }
try {
  const _b = startReload;
  startReload = function(){ const was = reloadT; const r = _b.apply(this, arguments); if (!(was > 0) && reloadT > 0) cpnOnReload(); return r; };
} catch (e) { errNote(e); }
try {
  const _b = damage;
  damage = function(z, amt){
    const m = cpnMarkMult(z);
    if (m === 1) return _b.apply(this, arguments);
    const a = Array.prototype.slice.call(arguments); a[1] = amt * m;
    return _b.apply(this, a);
  };
} catch (e) { errNote(e); }
try {
  const _b = victory;
  victory = function(){
    const before = cpnMetMap(), r = _b.apply(this, arguments), msg = cpnNews(before);
    if (msg.length){ const el = $('overBest'); if (el) el.textContent = (el.textContent ? el.textContent + ' ' : '') + msg.join(' '); }
    return r;
  };
} catch (e) { errNote(e); }
try {
  const _b = addXP;
  addXP = function(){
    const before = cpnMetMap(), lv0 = P.level || 1, r = _b.apply(this, arguments);
    if ((P.level || 1) > lv0){ const msg = cpnNews(before); if (msg.length) setTimeout(() => toast(msg[0]), 5200); }
    return r;
  };
} catch (e) { errNote(e); }
try {
  if (typeof renderAtelier === 'function'){ const _b = renderAtelier; renderAtelier = function(){ const r = _b.apply(this, arguments); cpnRenderShop(); return r; }; }
} catch (e) { errNote(e); }

// Ancienne sauvegarde qui remplit déjà une condition : on donne le compagnon tout de suite
cpnSync(); cpnApply(); cpnReset();

// Accès pour les tests automatiques
window.__compagnon = { CPN, CPN_ORDER, CPN_LINES, CPN_MAX, CPN_HOME, cpnStats, cpnNorm, cpnLv, cpnOwned, cpnActive, cpnReqMet, cpnSync, cpnBuy, cpnSelect,
  cpnUpgCost, cpnUpgrade, cpnPick, cpnUpdate, cpnFrame, cpnReset, cpnClearFx, cpnApply, cpnRenderShop, cpnClick, cpnMarkMult, cpnS, CPN_MOD, cpnRoot, cpnFx, cpnTracers, cpnHalos,
  step(sec, dt){ dt = dt || 1 / 30; const n = Math.ceil(sec / dt); for (let i = 0; i < n; i++){ cpnUpdate(dt); cpnFrame(dt); } } };
