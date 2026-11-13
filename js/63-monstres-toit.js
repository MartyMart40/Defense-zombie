'use strict';
/* ================= Monstres du toit : hurleur, fouisseur, revenant ================= */
// Trois monstres de plus pour le toit (campagne et mode infini). Chacun change ce que le joueur doit faire :
//   screamer (Hurleur)  : s'arrête loin dans la rue et hurle ; chaque hurlement rend les zombies autour de lui plus
//                         rapides (×MT_HURLE.k pendant MT_HURLE.dur s). Tout se calme dès qu'il meurt : cible prioritaire.
//                         Fragile, il ne frappe jamais la barricade.
//   burrower (Fouisseur): s'enfonce sous l'asphalte au milieu de la rue (intouchable, une bosse de terre le suit),
//                         puis ressort près de la barricade. Pendant qu'il sort, il prend des dégâts doublés.
//                         Parade : l'abattre avant qu'il creuse, ou l'attendre là où la bosse s'arrête.
//   revenant (Revenant) : tué au corps, il tombe à genoux puis se relève une fois (avec la moitié de sa vie).
//                         Parade : viser la tête (crâne pâle, bien visible), ou l'achever pendant qu'il est à terre.
// Ils remplacent des marcheurs dans les vagues (le total ne change pas) : jamais à Saint-Clou ; revenant dès
// Val-des-Cendres vague 2, hurleur dès Val-des-Cendres vague 4, fouisseur dès Banlieue Nord vague 2. Mode infini :
// revenant dès la vague 3, hurleur dès la 5, fouisseur dès la 7.
// Première rencontre de chaque type : un bandeau qui dit la parade, une seule fois (P.mtVus).
// Même contrat que 18-zombies-types.js (ZKINDS[type] = { build, init, update, onKill }), matériaux zmat / zfix :
// rendu par instances. Crochets par réaffectation (comme 19-boss.js et 35-monstres.js) : wavePlan, damage et defHit
// (immunité du fouisseur sous terre, dégâts doublés à sa sortie, chute du revenant). Effets : Jeu.on('image').

/* ---------- Données ---------- */
Object.assign(ZTYPES, {
  screamer: { name:'Hurleur',   hp:85,  speed:1.6, dmg:4, reward:30, scale:1.05, skin:0x6a6a5a },
  burrower: { name:'Fouisseur', hp:120, speed:1.9, dmg:9, reward:28, scale:1,    skin:0x8a7a60 },
  revenant: { name:'Revenant',  hp:130, speed:1.3, dmg:8, reward:32, scale:1.08, skin:0x9aa585 }
});
Object.assign(ZXP, { screamer:9, burrower:8, revenant:10 });
try { Object.assign(SCRAP_Z, { screamer:1.2, burrower:1, revenant:1.3 }); } catch (e) { errNote(e); }
const MT_TYPES = ['screamer', 'burrower', 'revenant'];
// Hurleur : rayon du hurlement (m), multiplicateur de vitesse, durée de l'effet (s), temps entre deux hurlements (s)
const MT_HURLE = { r:16, k:1.4, dur:6, every:3.2 };
// Fouisseur : vitesse sous terre (m/s), durée pour creuser et pour sortir (s), dégâts reçus pendant la sortie
const MT_FOUIS = { spd:7, dig:.9, emerge:1.5, vuln:2 };
// Revenant : temps à terre (s), part de sa vie quand il se relève
const MT_REV = { down:2.8, vie:.5 };
const MT = { f:-1, cris:0, enrages:0, fouilles:0, sorties:0, chutes:0, releves:0, acheves:0, annonces:0 };
// Bandeau de la première rencontre : nom et parade
const MT_ANNONCE = {
  screamer: ['Hurleur !', 'Il rend les zombies autour de lui plus rapides tant qu’il vit : abats-le en premier.'],
  burrower: ['Fouisseur !', 'Il passe sous la rue et ressort près de la barricade : tire quand il sort, il prend double.'],
  revenant: ['Revenant !', 'Il se relève si tu ne vises pas la tête. À terre, achève-le.']
};
const mtV = new THREE.Vector3();

/* ---------- Matériaux : seulement ceux de la palette des zombies (aucun matériau de plus pour la foule) ---------- */
// Couleurs déjà présentes (SHIRTS, PANTS, ZC) et matériaux lumineux de 18-zombies-types.js (ZKM.core : point du colosse).
const MT_M = {
  onde: ZKM.core,        // ondes du hurlement, gueule du hurleur, yeux du revenant : lumineux, se voient dans le brouillard
  os:   zmat(ZC.blanc),  // crâne du revenant
  terre: new THREE.MeshLambertMaterial({ color:0x4a3c2a }) // bosse de terre (hors zombies)
};
const MT_G = { onde:new THREE.TorusGeometry(1, .05, 4, 28) };
MT_G.onde.rotateX(Math.PI / 2); // à plat sur le sol

// Profil : rencontres déjà annoncées (valeur par défaut, règle 5)
function mtNorm(){
  if (typeof P !== 'object' || !P) return {};
  if (!P.mtVus || typeof P.mtVus !== 'object' || Array.isArray(P.mtVus)) P.mtVus = {};
  return P.mtVus;
}
mtNorm();
const mtToit = () => state === 'playing' && !(typeof Jeu === 'object' && Jeu.actif && Jeu.actif());
function mtAnnonce(type){
  const A = MT_ANNONCE[type]; if (!A || !mtToit()) return false;
  const V = mtNorm(); if (V[type]) return false;
  V[type] = true; MT.annonces++;
  if (typeof saveP === 'function') saveP();
  if (typeof banner === 'function') banner(A[0], A[1], 4200);
  return true;
}
const mtSnd = (f, d, t, v, s, dl) => { try { if (typeof Snd === 'object' && Snd.tone) Snd.tone(f, d, t, v, s, dl); } catch (e) { errNote(e); } };
const mtBruit = (f, d, v, dl) => { try { if (typeof Snd === 'object' && Snd.burst) Snd.burst(f, d, v, dl); } catch (e) { errNote(e); } };

/* ---------- Hurleur : grand, maigre, cou tendu, gueule qui brille ; bras levés quand il hurle ---------- */
ZKINDS.screamer = {
  build(T){
    const skin = zmat(T.skin), rag = zmat(0x3a3a44);
    const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), PT = [];
    zkMesh(body, ZKG.box, rag, .44, .7, .26, 0, 1.36, 0, PT);                    // torse étroit (haillons)
    zkMesh(body, ZKG.box, skin, .36, .2, .24, 0, 1.78, 0, PT);                   // épaules osseuses
    zkMesh(body, ZKG.box, skin, .14, .42, .14, 0, 2.02, .04, PT);               // long cou
    const neck = zkGroup(body, 0, 2.2, .06);
    const head = zkMesh(neck, ZKG.box, skin, .3, .36, .3, 0, .16, 0, PT);
    zkMesh(neck, ZKG.box, ZKM.core, .2, .24, .05, 0, .1, .15);                  // gueule grande ouverte, lumineuse
    zkMesh(neck, ZKG.box, eyeMat, .07, .05, .02, -.08, .28, .155); zkMesh(neck, ZKG.box, eyeMat, .07, .05, .02, .08, .28, .155);
    const armL = zkGroup(body, -.3, 1.74, 0), armR = zkGroup(body, .3, 1.74, 0);
    zkMesh(armL, ZKG.top, skin, .1, 1.05, .1, 0, 0, 0, PT); zkMesh(armR, ZKG.top, skin, .1, 1.05, .1, 0, 0, 0, PT); // bras très longs
    zkMesh(armL, ZKG.box, skin, .16, .12, .16, 0, -1.08, 0); zkMesh(armR, ZKG.box, skin, .16, .12, .16, 0, -1.08, 0);
    const legL = zkGroup(body, -.13, 1.02, 0), legR = zkGroup(body, .13, 1.02, 0);
    zkMesh(legL, ZKG.top, rag, .14, 1.02, .15, 0, 0, 0, PT); zkMesh(legR, ZKG.top, rag, .14, 1.02, .15, 0, 0, 0, PT);
    // Ondes du hurlement : anneaux à plat autour de lui (pas des cibles)
    const ondes = [0, 1].map(() => { const m = new THREE.Mesh(MT_G.onde, MT_M.onde); m.position.y = .15; m.visible = false; g.add(m); return m; });
    g.scale.setScalar(T.scale); g.userData.rig = { neck, ondes };
    return { g, body, head, armL, armR, legL, legR, parts:PT, mats:[skin, rag], aimY:1.3 * T.scale };
  },
  init(z){
    z.rig = z.g.userData.rig; z.stopZ = BAR_Z - rand(40, 50); z.mtCri = rand(.4, 1.2); z.mtOnde = -1;
    mtAnnonce('screamer');
  },
  update(z, dt){
    const R = z.rig;
    mtFrame(dt);
    if (z.st === 'walk'){ R.neck.rotation.x = .25; return false; } // marche par défaut, la tête en avant
    // Arrivé : il reste là et hurle (jamais de coups sur la barricade)
    z.phase += dt * 3; z.mtCri -= dt;
    const k = z.mtCri < .6 ? clamp(1 - z.mtCri / .6, 0, 1) : 0; // il se cambre avant de hurler
    R.neck.rotation.x = -.2 - .7 * k; z.body.rotation.x = -.05 - .12 * k; z.body.position.y = 0;
    if (z.armL){ z.armL.rotation.x = -2.6 * (.3 + .7 * k) + Math.sin(z.phase) * .1; z.armR.rotation.x = -2.6 * (.3 + .7 * k) - Math.sin(z.phase) * .1; z.armL.rotation.z = -.35; z.armR.rotation.z = .35; }
    if (z.legL){ z.legL.rotation.x = 0; z.legR.rotation.x = 0; }
    if (z.mtCri <= 0){ z.mtCri = MT_HURLE.every * rand(.9, 1.1); z.mtOnde = 0; mtCri(z); }
    // Ondes : deux anneaux qui s'élargissent jusqu'au rayon du hurlement
    const sc = z.g.scale.x || 1;
    R.ondes.forEach((o, i) => {
      const u = z.mtOnde < 0 ? -1 : z.mtOnde - i * .25;
      if (u < 0 || u > 1){ o.visible = false; return; }
      const r = Math.max(.2, MT_HURLE.r * u) / sc; o.visible = true; o.scale.set(r, 1 + 2 * u, r);
    });
    if (z.mtOnde >= 0){ z.mtOnde += dt / 1.1; if (z.mtOnde > 1.3) z.mtOnde = -1; }
    return true;
  },
  onKill(){ if (!mtHurleurVivant()) mtCalme(); }
};
const mtHurleurVivant = () => { for (let i = 0; i < zombies.length; i++){ const o = zombies[i]; if (o.type === 'screamer' && !o.dead) return o; } return null; };
// Un hurlement : les zombies autour accélèrent (une seule fois chacun : la durée est remise à neuf)
function mtCri(z){
  MT.cris++;
  const gp = z.g.position, r2 = MT_HURLE.r * MT_HURLE.r;
  for (const o of zombies){
    if (o === z || o.dead || o.type === 'screamer' || o.type === 'boss') continue;
    const dx = o.g.position.x - gp.x, dz = o.g.position.z - gp.z;
    if (dx * dx + dz * dz > r2) continue;
    if (!(o.mtRage > 0)){ o.speed *= MT_HURLE.k; MT.enrages++; }
    o.mtRage = MT_HURLE.dur;
  }
  if (gp.z > -75){ mtSnd(rand(780, 900), .7, 'sawtooth', .045, 380); mtSnd(rand(1150, 1300), .5, 'square', .02, 600, .05); mtBruit(2600, .5, .06); }
  mtV.set(gp.x, 2.4 * (z.g.scale.y || 1), gp.z); burst(mtV, 'dust', 4, 2);
}
// Une fois par image (appelé par chaque hurleur vivant) : l'effet s'use
function mtFrame(dt){
  if (MT.f === zFrame) return; MT.f = zFrame;
  for (const o of zombies){
    if (!(o.mtRage > 0)) continue;
    o.mtRage -= dt;
    if (o.mtRage <= 0 || o.dead){ o.mtRage = 0; o.speed /= MT_HURLE.k; }
  }
}
// Le dernier hurleur est mort : tout le monde se calme tout de suite
function mtCalme(){ for (const o of zombies) if (o.mtRage > 0){ o.mtRage = 0; o.speed /= MT_HURLE.k; } }

/* ---------- Fouisseur : trapu, carapace sur le dos, grosses griffes pour creuser ---------- */
ZKINDS.burrower = {
  build(T){
    const skin = zmat(T.skin), dos = zmat(0x3a3226), griffe = zmat(ZC.blanc);
    const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), PT = [];
    zkMesh(body, ZKG.box, skin, .7, .55, .5, 0, 1.05, .05, PT);                    // torse large et bas
    zkMesh(body, ZKG.box, dos, .86, .3, .74, 0, 1.36, -.06, PT);                   // carapace (dos voûté)
    zkMesh(body, ZKG.box, dos, .6, .2, .5, 0, 1.56, -.12, PT);
    [-.22, 0, .22].forEach(x => zkMesh(body, ZKG.box, dos, .1, .2, .12, x, 1.72, -.18)); // piquants
    const head = zkMesh(body, ZKG.box, skin, .36, .3, .4, 0, 1.18, .44, PT);       // tête basse, rentrée
    zkEyes(body, 1.24, .645, .09);
    zkMesh(body, ZKG.box, ZKM.mouth, .22, .06, .03, 0, 1.1, .645);
    const armL = zkGroup(body, -.44, 1.22, .1), armR = zkGroup(body, .44, 1.22, .1);
    [armL, armR].forEach(a => {
      zkMesh(a, ZKG.top, skin, .17, .62, .17, 0, 0, 0, PT);
      zkMesh(a, ZKG.box, griffe, .3, .1, .34, 0, -.66, .08, PT);                   // pelle de griffes
      [-.1, 0, .1].forEach(x => zkMesh(a, ZKG.box, griffe, .05, .05, .22, x, -.68, .32));
    });
    const legL = zkGroup(body, -.2, .78, 0), legR = zkGroup(body, .2, .78, 0);
    zkMesh(legL, ZKG.top, dos, .24, .78, .26, 0, 0, 0, PT); zkMesh(legR, ZKG.top, dos, .24, .78, .26, 0, 0, 0, PT);
    g.scale.setScalar(T.scale);
    return { g, body, head, armL, armR, legL, legR, parts:PT, mats:[skin, dos], aimY:1.05 * T.scale };
  },
  init(z){
    z.mtSt = 'walk'; z.mtT = 0; z.mtDust = 0;
    z.mtDigZ = rand(-62, -50); z.mtEmerZ = BAR_Z - rand(9, 15); z.mtTx = clamp(z.g.position.x + rand(-5, 5), -10, 10);
    mtAnnonce('burrower');
  },
  update(z, dt){
    const gp = z.g.position;
    if (z.mtSt === 'walk'){
      if (z.st === 'walk' && gp.z >= z.mtDigZ && gp.z < z.mtEmerZ){ z.mtSt = 'dig'; z.mtT = 0; MT.fouilles++; mtBruit(260, .6, .18); }
      else return false;
    }
    if (z.mtSt === 'dig'){ // il plonge dans l'asphalte (encore touchable)
      z.mtT += dt; const k = clamp(z.mtT / MT_FOUIS.dig, 0, 1);
      gp.y = -2.4 * k * k; z.body.rotation.x = .3 + .9 * k; z.body.position.y = 0;
      if (z.armL){ z.armL.rotation.x = -2.2 + Math.sin(z.mtT * 22) * .6; z.armR.rotation.x = -2.2 - Math.sin(z.mtT * 22) * .6; }
      mtPoussiere(z, dt, .08, 5);
      if (k >= 1) mtSous(z);
      return true;
    }
    if (z.mtSt === 'under'){ // sous la rue : intouchable, une bosse de terre le trahit
      gp.y = -2.5; gp.z = Math.min(z.mtEmerZ, gp.z + MT_FOUIS.spd * dt);
      gp.x += clamp(z.mtTx - gp.x, -2 * dt, 2 * dt);
      mtPoussiere(z, dt, .22, 3);
      if (gp.z >= z.mtEmerZ) mtSort(z);
      return true;
    }
    if (z.mtSt === 'emerge'){ // il sort : vulnérable, dégâts doublés
      z.mtT += dt; const k = clamp(z.mtT / MT_FOUIS.emerge, 0, 1);
      gp.y = -2.2 * (1 - k) * (1 - k); z.body.rotation.x = -.4 * (1 - k); z.body.position.y = 0;
      if (z.armL){ z.armL.rotation.x = -2.8 + Math.sin(z.mtT * 9) * .5; z.armR.rotation.x = -2.8 - Math.sin(z.mtT * 9) * .5; }
      mtPoussiere(z, dt, .12, 3);
      if (k >= 1){ z.mtSt = 'done'; z.mtVuln = false; gp.y = 0; z.st = 'walk'; }
      return true;
    }
    return false; // sorti : il marche jusqu'à la barricade (code par défaut)
  }
};
function mtPoussiere(z, dt, every, n){
  z.mtDust -= dt; if (z.mtDust > 0) return; z.mtDust = every;
  mtV.set(z.g.position.x, .25, z.g.position.z); burst(mtV, 'dust', n, 2.2);
}
function mtSous(z){
  z.mtSt = 'under'; z.mtUnder = true; z.g.visible = false; z.g.position.y = -2.5;
  removeZombieMeshes(z); // plus de cible pour les tirs
}
function mtSort(z){
  z.mtSt = 'emerge'; z.mtT = 0; z.mtUnder = false; z.mtVuln = true; z.g.visible = true; MT.sorties++;
  if (z.proxy && hitMeshes.indexOf(z.proxy) < 0) hitMeshes.push(z.proxy);
  mtV.set(z.g.position.x, .4, z.g.position.z); burst(mtV, 'dust', 16, 4); burst(mtV, 'wood', 4, 3);
  shake = Math.max(shake, .12); mtBruit(320, .55, .3); mtSnd(90, .4, 'sine', .12, 50);
}
// Bosses de terre : un petit lot de maillages réutilisés (aucun créé pendant la partie)
const MT_BOSSES = [];
(function(){
  for (let i = 0; i < 8; i++){
    const m = new THREE.Mesh(ZKG.sph, MT_M.terre); m.scale.set(.9, .32, 1.3); m.visible = false; m.userData.keep = true; scene.add(m);
    MT_BOSSES.push(m);
  }
})();
function mtBossesImage(){
  let n = 0;
  for (let i = 0; i < zombies.length && n < MT_BOSSES.length; i++){
    const z = zombies[i]; if (!z.mtUnder || z.dead) continue;
    const m = MT_BOSSES[n++]; m.visible = true;
    m.position.set(z.g.position.x, 0, z.g.position.z);
    m.scale.y = .28 + Math.abs(Math.sin((typeof time === 'number' ? time : 0) * 9 + z.uid)) * .1;
  }
  for (; n < MT_BOSSES.length; n++) MT_BOSSES[n].visible = false;
}

/* ---------- Revenant : silhouette encapuchonnée, crâne pâle, côtes à nu ; se relève une fois ---------- */
ZKINDS.revenant = {
  build(T){
    const skin = zmat(T.skin), robe = zmat(ZC.noir), robe2 = zmat(ZC.navy), cote = zmat(ZC.blanc);
    const g = new THREE.Group(), body = new THREE.Group(), PT = []; g.add(body);
    const mk = (geo, mat, x, y, zz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, zz); body.add(m); PT.push(m); return m; };
    const torso = mk(ZG.torso, robe, 0, 1.32, 0); torso.scale.set(.82, 1.1, .9);
    [.12, 0, -.12].forEach(y => zkMesh(body, ZKG.box, cote, .36, .045, .03, 0, 1.38 + y, .165)); // côtes
    zkMesh(body, ZKG.box, robe2, .7, .62, .42, 0, .72, 0, PT);                    // bas de la robe en lambeaux
    [-.24, 0, .24].forEach(x => zkMesh(body, ZKG.box, robe2, .14, .2, .4, x, .34, 0)); // franges
    const head = mk(ZG.head, MT_M.os, 0, 2.0, .04); head.scale.set(.85, .95, .85);  // crâne
    zkMesh(body, ZKG.box, MT_M.onde, .09, .07, .02, -.08, 2.04, .225); zkMesh(body, ZKG.box, MT_M.onde, .09, .07, .02, .08, 2.04, .225);
    zkMesh(body, ZKG.box, ZKM.mouth, .2, .05, .02, 0, 1.9, .225);
    zkMesh(body, ZKG.box, robe, .52, .3, .44, 0, 2.2, -.08);                     // capuchon
    zkMesh(body, ZKG.box, robe, .1, .44, .44, -.27, 2.0, -.06); zkMesh(body, ZKG.box, robe, .1, .44, .44, .27, 2.0, -.06);
    const armL = mk(ZG.arm, skin, -.34, 1.66, 0), armR = mk(ZG.arm, skin, .34, 1.66, 0);
    armL.scale.set(.75, 1.25, .75); armR.scale.set(.75, 1.25, .75);              // bras longs et décharnés
    const legL = mk(ZG.leg, robe2, -.15, .86, 0), legR = mk(ZG.leg, robe2, .15, .86, 0);
    legL.scale.set(.7, 1, .7); legR.scale.set(.7, 1, .7);
    g.scale.setScalar(T.scale);
    return { g, body, head, armL, armR, legL, legR, parts:PT, mats:[skin, robe, robe2], aimY:1.15 * T.scale };
  },
  init(z){ z.mtRose = false; mtAnnonce('revenant'); },
  update(z, dt){
    if (z.st !== 'down') return false; // marche et frappe comme un marcheur
    z.mtT -= dt; z.phase += dt * 2;
    const k = clamp(z.mtT / .5, 0, 1); // dans la dernière demi-seconde, il se redresse
    z.body.position.y = -.55 * k; z.body.rotation.x = .55 * k; z.body.rotation.z = Math.sin(z.phase) * .05 * k;
    if (z.armL){ z.armL.rotation.x = -.2 * k + -1.35 * (1 - k); z.armR.rotation.x = -.1 * k + -1.35 * (1 - k); }
    if (z.legL){ z.legL.rotation.x = -1.2 * k; z.legR.rotation.x = -1.1 * k; }
    if (Math.random() < dt * 3){ mtV.set(z.g.position.x, .9, z.g.position.z); burst(mtV, 'dust', 1, 1); }
    if (z.mtT <= 0) mtReleve(z);
    return true;
  }
};
// Coup mortel au corps (pas à la tête) : il tombe à genoux au lieu de mourir. Touché à terre : il meurt pour de bon.
function mtChute(z, point){
  MT.chutes++;
  z.hp = 1; z.flashT = .08; z.mtSt0 = z.st; z.st = 'down'; z.mtT = MT_REV.down;
  if (point) zBurst(point, 'blood', 6, 2);
  if (typeof ecrPush === 'function') ecrPush('Revenant à terre : achève-le !', 'weak');
  if (z.g.position.z > -70) mtSnd(140, .5, 'triangle', .06, 70);
}
function mtReleve(z){
  MT.releves++;
  z.mtRose = true; z.hp = Math.max(z.hp, z.maxHp * MT_REV.vie);
  z.st = z.mtSt0 === 'attack' ? 'attack' : 'walk'; z.body.position.y = 0; z.body.rotation.set(.06, 0, 0);
  if (z.legL){ z.legL.rotation.x = 0; z.legR.rotation.x = 0; }
  if (typeof ecrPush === 'function') ecrPush('Le revenant se relève !', 'weak');
  mtV.set(z.g.position.x, 1.4, z.g.position.z); burst(mtV, 'dust', 8, 2.5);
  if (z.g.position.z > -70){ mtSnd(110, .8, 'sine', .1, 240); mtSnd(165, .7, 'triangle', .04, 330, .1); }
}

/* ---------- Dégâts : fouisseur sous terre ou qui sort, revenant qui tombe ---------- */
// Retourne les dégâts à infliger, ou -1 : coup absorbé (sous terre, ou le revenant tombe au lieu de mourir).
// Sert aux tirs et explosions (damage) comme aux défenses de l'atelier (defHit, 17-defenses.js).
function mtFiltre(z, amt, head, point){
  if (!z || z.dead) return amt;
  if (z.mtUnder) return -1;                // sous l'asphalte : rien ne l'atteint
  if (z.mtVuln) amt *= MT_FOUIS.vuln;      // il sort du trou : dégâts doublés
  if (z.type === 'revenant' && z.hp - amt <= 0){
    if (z.st === 'down') MT.acheves++;
    else if (!head && !z.mtRose){ mtChute(z, point); return -1; }
  }
  return amt;
}
try {
  const _d = damage;
  damage = function(z, amt, head, point){
    const a = mtFiltre(z, amt, head, point); if (a < 0) return;
    return _d.call(this, z, a, head, point);
  };
} catch (e) { errNote(e); }
try {
  if (typeof defHit === 'function'){
    const _h = defHit;
    defHit = function(z, amt, blood){
      const a = mtFiltre(z, amt, false, null); if (a < 0) return;
      return _h.call(this, z, a, blood);
    };
  }
} catch (e) { errNote(e); }

/* ---------- Vagues : ils remplacent des marcheurs ---------- */
// Nombre de chaque monstre pour la vague w de la ville L (total : zombies de la vague, sans le boss)
function mtCounts(w, L, total){
  const o = { screamer:0, burrower:0, revenant:0 };
  if (!L || !(total > 0)) return o;
  const n = (min, par, k) => Math.max(min, Math.round(total / par * k));
  if (L.inf){ // mode infini : même règle dans toutes les villes
    if (w >= 3) o.revenant = n(1, 80, 1);
    if (w >= 5) o.screamer = n(1, 180, 1);
    if (w >= 7) o.burrower = n(1, 100, 1);
    return o;
  }
  const off = L.off || 0; // 0 : Saint-Clou (jamais), 1 : Val-des-Cendres, 2 : Banlieue Nord...
  if (off >= 1 && w >= 2) o.revenant = n(1, 80, 1 + .25 * (off - 1));
  if (off >= 1 && w >= 4) o.screamer = n(1, 180, 1 + .25 * (off - 1));
  if (off >= 2 && w >= 2) o.burrower = n(1, 100, 1 + .25 * (off - 2));
  return o;
}
function mtReplace(q, type, n){
  if (!(n > 0)) return 0;
  const idx = []; for (let i = 0; i < q.length; i++) if (q[i] === 'walker') idx.push(i);
  for (let i = idx.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  n = Math.min(n, Math.floor(idx.length * .5)); // il reste toujours des marcheurs
  for (let i = 0; i < n; i++) q[idx[i]] = type;
  return n;
}
try {
  const _wp = wavePlan;
  wavePlan = function(w, L){
    const p = _wp.apply(this, arguments);
    try {
      const LL = L || curLoc;
      // Mode infini : hordePlan demande d'abord un échantillon du mélange (INF.mix) ; on n'ajoute qu'à la vraie vague
      if (p && p.queue && LL && !(typeof INF === 'object' && INF && INF.mix)){
        const tot = p.queue.filter(t => t !== 'boss').length, c = mtCounts(w, LL, tot);
        p.mt = {};
        MT_TYPES.forEach(t => { p.mt[t] = mtReplace(p.queue, t, c[t]); });
      }
    } catch (e) { errNote(e); }
    return p;
  };
} catch (e) { errNote(e); }

/* ---------- Chaque image : bosses de terre ---------- */
try { Jeu.on('image', () => { mtBossesImage(); }); } catch (e) { errNote(e); }

// Accès pour les tests automatiques
window.__mt = { MT, MT_TYPES, MT_HURLE, MT_FOUIS, MT_REV, MT_ANNONCE, MT_BOSSES, mtCounts, mtAnnonce, mtNorm, mtCalme, mtBossesImage };
