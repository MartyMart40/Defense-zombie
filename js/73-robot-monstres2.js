'use strict';
/* ================= Robot : trois monstres à sa taille, chacun avec sa parade ================= */
// Dossier 119. Le simulateur montrait que l'adresse comptait peu au robot (le bon joueur dépassait le moyen d'un tour au
// mieux) : tout se réglait en tirant dans le tas. Ces trois monstres demandent un geste précis du pilote :
//   belier  (Bélier)        : masse blindée qui gratte le sol (bande rouge au sol, elle suit le robot), puis charge en ligne
//                             droite. De face, il ne prend que MR2_BEL.blinde des dégâts. Parade : un pas de côté quand il
//                             fonce (la bande devient pleine) ; il passe, s'écrase contre une façade et reste sonné, le dos
//                             (bosse orange qui luit) offert. S'il touche : gros coup sur le blindage, il recule et recommence.
//   grappin (Grappin)       : petit et rapide, il bondit sur la vitre de l'habitacle (on le voit de l'intérieur, il cache une
//                             partie de la vue) et ronge le blindage. Parade : secouer le torse d'un côté à l'autre (MR2_GRA.
//                             secousses demi-tours rapides), ou le lance-flammes. On peut aussi l'abattre en plein saut.
//   mortier (Mortier vivant) : il s'enracine loin au bout de la rue et lance des obus en cloche là où le robot EST au départ du
//                             tir ; un cercle rouge au sol et l'alerte « Obus : bouge ! » pendant tout le vol. Parade : ne pas
//                             rester planté (avancer, reculer, pas de côté) ; roquettes ou canon pour l'abattre de loin.
// Ils remplacent des marcheurs de la file de la rue (total inchangé) : jamais aux rues 1 à 3 du tour 1 ; un seul genre par rue
// d'abord (rue 4 Bélier, rue 5 Grappin, rue 6 Mortier), mélangés ensuite, plus nombreux aux tours 2 et plus (MR2_PLAN).
// Seulement dans le robot : ni le toit, ni le RTS (les vagues du toit et les zombies du RTS ne passent pas par mechPlan).
// Au cell, fenêtres plus généreuses (élan et vol plus longs, charge plus lente, rayon plus petit, sonné plus longtemps,
// une secousse de moins) : valeurs « T » de chaque réglage.
// Première rencontre : bandeau qui dit la parade, une fois par profil (P.mr2Vus). Moments annoncés par
// Jeu.emit('monstre', quoi, z) : 'elan', 'charge', 'sonne', 'saut', 'accroche', 'decroche', 'tir', 'impact'.
// Repères sans son : bande et cercle au sol, alerte au centre de l'écran avec une barre de temps, bords rouges pour l'obus.
// Sons : chaque moment a son propre son dans js/70-robot-sons.js (dossier 121, il écoute Jeu.on('monstre')) ; les sons
// d'emprunt de Snd (tone, boom, _nz, mbRoar) ne jouent que si ce fichier est absent (mr2Emprunt). Seul le coup du Bélier
// sur le robot garde son boom (la coque sonne aussi, par hitBarricade).
// Crochets : mechPlan et damage par réaffectation (calcul, comme js/40-robot-monstres.js et js/63-monstres-toit.js) ;
// tout le reste par Jeu.on('image') et Jeu.on('tue').

/* ---------- Données ---------- */
Object.assign(ZTYPES, {
  belier:  { name:'Bélier',         hp:900, speed:2.2, dmg:45, reward:140, scale:2,    skin:0x5a4636 },
  grappin: { name:'Grappin',        hp:140, speed:7,   dmg:10, reward:30,  scale:.95,  skin:0xb4a23c },
  mortier: { name:'Mortier vivant', hp:650, speed:.9,  dmg:40, reward:100, scale:2.5,  skin:0x7a4a7a }
});
Object.assign(ZXP, { belier:40, grappin:8, mortier:30 });
try { Object.assign(SCRAP_Z, { belier:8, grappin:1.5, mortier:6 }); } catch (e) { errNote(e); }
const MR2_TYPES = ['belier', 'grappin', 'mortier'];
// Bélier : élan (s), vitesse de charge (m/s), rayon de la bande (m), coup (× ses dégâts), dégâts reçus de face, sonné (s),
// suivi de la bande pendant l'élan (m/s), distance où il prend son élan (m), temps entre deux charges (s)
const MR2_BEL = { elan:1.5, elanT:1.8, vit:18, vitT:15, rayon:2.6, rayonT:2.3, coup:2, blinde:.2, sonne:4, sonneT:5, suivi:3, dist:[34, 46], recharge:6 };
// Grappin : portée du saut (m), durée du saut (s), dents (× ses dégâts toutes les tick s), lâche seul au bout de duree s,
// secousses pour le décrocher, amplitude d'une secousse (radians) faite en moins de swingT s, part de sa vie perdue en tombant,
// au sol sonné (s), lance-flammes sur la vitre pour le brûler (s), temps avant de ressauter (s)
// ampT (cell, dossier 121) : amplitude d'une secousse au doigt, 0,3 rad à la sensibilité 1 et moins en dessous (× sens) : un glissé
// d'au moins 60 px quelle que soit la sensibilité. Avant : 0,4 rad, donc à la sensibilité 0,3 un va-et-vient d'un quart de
// l'écran (0,15 rad au cell vertical, 0,34 couché) ne décrochait jamais le Grappin. La souris garde amp (0,4 rad).
const MR2_GRA = { portee:13, saut:.75, ronge:.75, tick:.5, duree:10, secousses:3, secoussesT:2, amp:.4, ampT:.3, swingT:.5, chute:.5, sonne:2, sonneT:2.5, flammes:.8, recharge:4 };
// Mortier : distance où il s'enracine (m), temps entre deux tirs (s), vol de l'obus (s), rayon (m), coup (× ses dégâts),
// obus en vol à la fois (tous mortiers), pas de tir plus près que (m)
const MR2_MOR = { plante:[55, 72], tir:4.5, vol:2, volT:2.3, rayon:3.2, rayonT:2.9, coup:2, max:2, pres:8 };
// Combien de chaque monstre dans la file d'une rue : [bélier, grappin, mortier]
const MR2_PLAN = {
  t1: { 4:[2, 0, 0], 5:[0, 4, 0], 6:[0, 0, 2], 7:[2, 3, 1], 8:[2, 3, 2], 9:[1, 2, 1] },
  t2: { 2:[0, 1, 0], 3:[1, 1, 0], 4:[2, 1, 0], 5:[1, 4, 0], 6:[1, 1, 2], 7:[2, 3, 1], 8:[2, 3, 2], 9:[1, 3, 1] },
  parTour:.25 // tours 3 et plus : +25 % par tour
};
const MR2_ANNONCE = {
  belier:  ['Bélier !', 'Il charge en ligne droite : pas de côté quand il fonce, puis tire dans son dos pendant qu’il est sonné.'],
  grappin: ['Grappin !', 'Il saute sur la vitre et ronge le blindage : secoue le torse d’un côté à l’autre, ou lance-flammes. Abats-le en plein saut.'],
  mortier: ['Mortier vivant !', 'Il tire là où tu es : ne reste pas planté dans le cercle rouge. Roquettes ou canon pour l’abattre de loin.']
};
const MR2 = { evts:{}, annonces:0, tues:{}, esquives:0, coups:0, decroches:0, impacts:0, rates:0, lastDist:0, rue:-1, f:-1,
  secousse:{ n:0, dir:0, amp:0, t:0, compte:false, repos:0, lastYaw:null }, flammes:0 };
const mr2V = new THREE.Vector3();
const mr2T = () => isTouch || !!MECH.assist;   // fenêtres du cell (MECH.assist : essais du cell à l'ordi)
const mr2Rgl = (o, k) => mr2T() && o[k + 'T'] != null ? o[k + 'T'] : o[k];
const mr2Actif = () => typeof MECH === 'object' && MECH.on && state === 'mech';

// Profil : monstres déjà annoncés (valeur par défaut, règle 5)
function mr2Norm(){
  if (typeof P !== 'object' || !P) return {};
  if (!P.mr2Vus || typeof P.mr2Vus !== 'object' || Array.isArray(P.mr2Vus)) P.mr2Vus = {};
  return P.mr2Vus;
}
mr2Norm();
function mr2Annonce(type){
  const A = MR2_ANNONCE[type]; if (!A || !mr2Actif()) return false;
  const V = mr2Norm(); if (V[type]) return false;
  V[type] = true; MR2.annonces++;
  if (typeof saveP === 'function') saveP();
  if (typeof banner === 'function') banner(A[0], A[1], 4600);
  return true;
}
const mr2Evt = (quoi, z) => { MR2.evts[quoi] = (MR2.evts[quoi] || 0) + 1; if (typeof Jeu === 'object' && Jeu.emit) Jeu.emit('monstre', quoi, z); };
function mr2Son(f){ if (typeof Snd !== 'object' || !Snd.ctx) return; try { f(Snd); } catch (e) { errNote(e); } }
// Sons d'emprunt : seulement si js/70-robot-sons.js est absent (il donne à chaque moment son propre son, dossier 121)
function mr2Emprunt(f){ if (typeof rsnMonstre !== 'function') mr2Son(f); }

/* ---------- Bélier : masse basse et large, plaque frontale, deux cornes, bosse dorsale qui luit quand il est sonné ---------- */
ZKINDS.belier = {
  build(T){
    const skin = zmat(T.skin), plaque = zmat(0x4a4e56), corne = zmat(ZC.blanc), dos = zmat(0x3a2a20);
    const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), PT = [];
    zkMesh(body, ZKG.box, skin, 1.5, .9, 1.9, 0, 1.25, -.1, PT);                    // tronc massif
    zkMesh(body, ZKG.box, dos, 1.3, .35, 1.5, 0, 1.78, -.25, PT);                   // échine
    const head = zkMesh(body, ZKG.box, skin, .8, .7, .7, 0, 1.15, 1.05, PT);
    zkMesh(body, ZKG.box, plaque, 1.7, 1.3, .25, 0, 1.3, 1.45, PT);                 // plaque frontale (bouclier)
    zkMesh(body, ZKG.box, plaque, 1.1, .3, .5, 0, 2.05, 1.2, PT);
    [-1, 1].forEach(s => {
      const c = zkMesh(body, ZKG.box, corne, .22, .22, 1.1, s * .75, 2.0, 1.4, PT); c.rotation.y = s * -.45; c.rotation.x = -.35; // cornes
      zkMesh(body, ZKG.box, corne, .18, .5, .18, s * 1.1, 2.15, 1.85).rotation.z = s * .4;
    });
    zkEyes(body, 1.45, 1.585, .32, 1.6);
    const bosse = zkWeak(zkMesh(body, ZKG.sph, ZKM.core, .62, .4, .7, 0, 1.95, -.7, PT), { mult:3, effet:'dos' }); // point faible
    bosse.visible = false;
    const legs = [];
    [[-.55, .6], [.55, .6], [-.55, -.8], [.55, -.8]].forEach(p => { const l = zkGroup(body, p[0], .95, p[1]); zkMesh(l, ZKG.top, skin, .38, .95, .42, 0, 0, 0, PT); legs.push(l); });
    g.scale.setScalar(T.scale); g.userData.rig = { legs, bosse };
    return { g, body, head, parts:PT, mats:[skin, plaque, dos], aimY:1.3 * T.scale };
  },
  init(z){ z.rig = z.g.userData.rig; z.mr = 'approche'; z.mrT = 0; z.mrCd = rand(1, 3); z.mrX = z.g.position.x; z.mrDist = rand(MR2_BEL.dist[0], MR2_BEL.dist[1]); },
  onWeak(z){ return z.mr === 'sonne' ? { txt:'Dos' } : null; },
  update(z, dt){ if (!mr2Actif()) return false; mr2Belier(z, dt); return true; }
};
const mr2BelierActif = () => { for (const o of zombies) if (!o.dead && o.type === 'belier' && (o.mr === 'elan' || o.mr === 'charge' || o.mr === 'rate')) return o; return null; };
function mr2Pattes(z, k, dt){
  z.phase += dt * k;
  z.rig.legs.forEach((l, i) => { l.rotation.x = Math.sin(z.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * Math.min(.7, k * .06); });
}
function mr2Belier(z, dt){
  const gp = z.g.position, MZ = MECH_CAM.z, B = MR2_BEL;
  z.mrT += dt; z.mrCd -= dt;
  if (!z.mrVu && gp.z > MZ - 80){ z.mrVu = true; mr2Annonce('belier'); }
  const dist = MZ - gp.z;
  if (z.mr === 'approche'){
    z.g.rotation.y = 0; z.body.rotation.x = 0;
    if (dist > z.mrDist){ gp.z += z.speed * dt; mr2Pattes(z, z.speed * 3, dt); z.mrX = clamp(z.mrX + clamp(MECH.x - z.mrX, -1, 1) * dt, -9, 9); }
    else if (dist < 14){ z.mr = 'repli'; z.mrT = 0; }
    else if (z.mrCd <= 0 && !mr2BelierActif()){ z.mr = 'elan'; z.mrT = 0; mr2Evt('elan', z); mr2Emprunt(() => { if (typeof mbRoar === 'function') mbRoar(false); }); }
    else mr2Pattes(z, 2, dt);
  } else if (z.mr === 'elan'){
    // Il gratte le sol ; la bande rouge suit le robot (moins vite qu'un pas de côté)
    z.mrX = clamp(z.mrX + clamp(MECH.x - z.mrX, -B.suivi * dt, B.suivi * dt), -10, 10);
    z.body.rotation.x = .18; z.phase += dt * 12;
    z.rig.legs[0].rotation.x = -.5 + Math.sin(z.phase) * .5; z.rig.legs[1].rotation.x = 0;
    z.mrDust = (z.mrDust || 0) - dt; if (z.mrDust <= 0){ z.mrDust = .22; mr2V.set(gp.x - .5, .2, gp.z + 1); burst(mr2V, 'dust', 4, 2.4); }
    if (z.mrT >= mr2Rgl(B, 'elan')){ z.mr = 'charge'; z.mrT = 0; z.mrEsq = null; mr2Evt('charge', z); mr2Emprunt(S2 => { S2.tone(70, .6, 'sawtooth', .07, 40); if (S2._nz) S2._nz(S2.ctx.currentTime, 'lowpass', 300, 1, .7, .12); }); }
  } else if (z.mr === 'charge'){
    gp.z += mr2Rgl(B, 'vit') * dt; z.body.rotation.x = .12; mr2Pattes(z, 26, dt);
    // Décision à 10 m du robot : hors de la bande, il le rate (il dévie vers la façade de son côté) ; dedans, il frappe
    if (gp.z >= MZ - 10){
      const R = mr2Rgl(B, 'rayon');
      if (Math.abs(z.mrX - MECH.x) < R){
        gp.z = MZ - 4; hitBarricade(z, z.dmg * B.coup, 1.1, 10); MR2.coups++;
        z.mr = 'recul'; z.mrT = 0; z.mrCd = B.recharge; mr2Son(S2 => S2.boom(.9));
        if (typeof vib === 'function') vib([120, 50, 120], 30);
      } else {
        z.mr = 'rate'; z.mrT = 0; z.mrSide = Math.sign(z.mrX - MECH.x) || (z.mrX >= 0 ? 1 : -1); MR2.esquives++;
      }
    }
  } else if (z.mr === 'rate'){
    // Il dévie vers la façade de son côté et s'y écrase, la tête dans le mur, le dos vers la rue
    gp.z += 5 * dt; z.mrX += z.mrSide * 18 * dt; z.g.rotation.y = z.mrSide * Math.min(Math.PI / 2, z.mrT * 4); mr2Pattes(z, 22, dt);
    if (Math.abs(z.mrX) >= 11.2){
      z.mrX = z.mrSide * 11.2; z.g.rotation.y = z.mrSide * Math.PI / 2;
      z.mr = 'sonne'; z.mrT = 0; z.rig.bosse.visible = true; mr2Evt('sonne', z);
      shake = Math.max(shake, .5); mr2V.set(z.mrX + z.mrSide * .8, 1.2, gp.z); burst(mr2V, 'dust', 22, 5); burst(mr2V, 'wood', 6, 4);
      mr2Emprunt(S2 => { S2.boom(1.1); S2.tone(880, .5, 'triangle', .04, 660, .15); });
    }
  } else if (z.mr === 'sonne'){
    z.phase += dt * 5; z.body.rotation.z = Math.sin(z.phase) * .1; z.body.rotation.x = -.08;
    z.rig.legs.forEach((l, i) => { l.rotation.x = Math.sin(z.phase * .7 + i) * .15; });
    if (z.mrT >= mr2Rgl(B, 'sonne')){ z.mr = 'repli'; z.mrT = 0; z.rig.bosse.visible = false; z.body.rotation.z = 0; z.mrCd = B.recharge; }
  } else if (z.mr === 'recul'){
    gp.z -= 14 * Math.max(0, 1 - z.mrT / .6) * dt; z.body.rotation.x = -.2;
    if (z.mrT > 1.1){ z.mr = 'repli'; z.mrT = 0; }
  } else if (z.mr === 'repli'){
    // Il retourne vers le bout de la rue reprendre son élan
    z.g.rotation.y = Math.PI; z.body.rotation.x = 0; z.mrX = clamp(z.mrX - Math.sign(z.mrX) * 3 * dt, -9, 9);
    gp.z -= 6 * dt; mr2Pattes(z, 16, dt);
    if (dist >= z.mrDist){ z.mr = 'approche'; z.mrT = 0; z.mrDist = rand(B.dist[0], B.dist[1]); }
  }
  gp.x = z.mrX; // la file du robot attire les zombies vers lui (js/39) : le Bélier garde sa ligne
}

/* ---------- Grappin : petit, bossu, deux longs bras à crochets levés ---------- */
ZKINDS.grappin = {
  build(T){
    const skin = zmat(T.skin), crochet = zmat(ZC.noir), ventre = zmat(0x7a6a2a);
    const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), PT = [];
    zkMesh(body, ZKG.sph, skin, .42, .34, .46, 0, .72, 0, PT);                       // corps ramassé
    zkMesh(body, ZKG.sph, ventre, .3, .26, .3, 0, .62, .18, PT);
    const head = zkMesh(body, ZKG.box, skin, .34, .26, .3, 0, 1.0, .3, PT);
    zkEyes(body, 1.06, .455, .08, 1.2); zkMesh(body, ZKG.box, ZKM.mouth, .2, .06, .03, 0, .94, .455);
    const armL = zkGroup(body, -.36, .95, .1), armR = zkGroup(body, .36, .95, .1);
    [armL, armR].forEach((a, i) => {
      zkMesh(a, ZKG.top, skin, .1, .85, .1, 0, 0, 0, PT);
      const h = zkMesh(a, ZKG.box, crochet, .08, .34, .08, 0, -.92, .12, PT); h.rotation.x = .9;   // crochet
      a.rotation.x = -2.6; a.rotation.z = (i ? 1 : -1) * .35;                           // bras levés
    });
    const legs = [];
    [-.22, .22].forEach(x => { const l = zkGroup(body, x, .55, -.05); zkMesh(l, ZKG.top, crochet, .12, .55, .14, 0, 0, 0, PT); legs.push(l); });
    g.scale.setScalar(T.scale); g.userData.rig = { legs };
    return { g, body, head, armL, armR, parts:PT, mats:[skin, ventre], aimY:.8 * T.scale };
  },
  init(z){ z.rig = z.g.userData.rig; z.mr = 'course'; z.mrT = 0; z.mrCd = 0; z.mrZig = rand(0, 6); },
  update(z, dt){ if (!mr2Actif()) return false; mr2Grappin(z, dt); return true; }
};
const mr2Accroche = () => { for (const o of zombies) if (!o.dead && o.type === 'grappin' && (o.mr === 'accroche' || o.mr === 'saut')) return o; return null; };
function mr2Grappin(z, dt){
  const gp = z.g.position, MZ = MECH_CAM.z, G = MR2_GRA;
  z.mrT += dt; z.mrCd -= dt;
  if (!z.mrVu && gp.z > MZ - 80){ z.mrVu = true; mr2Annonce('grappin'); }
  const d = Math.hypot(gp.x - MECH.x, gp.z - MZ);
  if (z.mr === 'course'){
    z.phase += dt * 16; z.g.rotation.y = 0; gp.y = 0;
    z.rig.legs[0].rotation.x = Math.sin(z.phase) * .8; z.rig.legs[1].rotation.x = -Math.sin(z.phase) * .8;
    z.body.position.y = Math.abs(Math.sin(z.phase)) * .1;
    if (gp.z < MZ - 3.5){ gp.z += z.speed * dt; gp.x = clamp(gp.x + Math.sin(z.phase * .15 + z.mrZig) * 3 * dt, -11, 11); }
    if (d < G.portee && gp.z < MZ - 2 && z.mrCd <= 0 && !mr2Accroche()){
      z.mr = 'saut'; z.mrT = 0; z.mrA = { x:gp.x, z:gp.z }; mr2Evt('saut', z);
      mr2Emprunt(S2 => S2.tone(900, .35, 'sawtooth', .05, 1800));
    } else if (d < 4.5){ // au pied du robot (un autre est déjà sur la vitre) : il griffe les jambes
      z.mrHit = (z.mrHit || 0) - dt; if (z.mrHit <= 0){ z.mrHit = rand(.9, 1.2); hitBarricade(z, z.dmg, .08, 1); }
    }
  } else if (z.mr === 'saut'){
    // Bond en cloche jusqu'à la vitre (on peut l'abattre en l'air)
    const k = clamp(z.mrT / G.saut, 0, 1), e = k * k * (3 - 2 * k);
    gp.x = z.mrA.x + (MECH.x - z.mrA.x) * e; gp.z = z.mrA.z + (MZ - 1.6 - z.mrA.z) * e; gp.y = 4.6 * e + 3.2 * Math.sin(Math.PI * k);
    z.body.rotation.x = -.6 * Math.sin(Math.PI * k);
    if (k >= 1) mr2Accrocher(z);
  } else if (z.mr === 'accroche'){
    gp.set(MECH.x, 4.6, MZ - 1.6);
    z.mrTick = (z.mrTick || 0) - dt;
    if (z.mrTick <= 0){ z.mrTick = G.tick; hitBarricade(z, z.dmg * G.ronge, .05, 1); mr2Emprunt(S2 => { if (S2._nz) S2._nz(S2.ctx.currentTime, 'bandpass', 2600, 6, .12, .05); }); }
    if (z.mrT >= G.duree) mr2Decrocher(z, false);
  } else if (z.mr === 'chute'){
    const k = clamp(z.mrT / .7, 0, 1);
    gp.x = z.mrA.x + (z.mrB.x - z.mrA.x) * k; gp.z = z.mrA.z + (z.mrB.z - z.mrA.z) * k; gp.y = Math.max(0, 4.6 * (1 - k) + 2 * Math.sin(Math.PI * k));
    z.body.rotation.z += dt * 9;
    if (k >= 1){
      gp.y = 0; z.body.rotation.z = 0; z.mr = 'sonne'; z.mrT = 0;
      mr2V.set(gp.x, .3, gp.z); burst(mr2V, 'dust', 8, 3);
      if (z.mrPerd){ z.hp -= z.maxHp * G.chute; z.flashT = .1; if (z.hp <= 0){ kill(z, false, mr2V.clone()); return; } }
    }
  } else if (z.mr === 'sonne'){
    z.body.rotation.x = .7; z.phase += dt * 4; z.body.rotation.z = Math.sin(z.phase) * .15;
    if (z.mrT >= mr2Rgl(G, 'sonne')){ z.mr = 'course'; z.mrT = 0; z.mrCd = G.recharge; z.body.rotation.set(0, 0, 0); }
  }
}
function mr2Accrocher(z){
  z.mr = 'accroche'; z.mrT = 0; z.mrTick = .4; z.g.visible = false;
  removeZombieMeshes(z); // sur la vitre : les armes des bras ne peuvent pas le viser
  Object.assign(MR2.secousse, { n:0, dir:0, amp:0, t:0, compte:false, repos:0, lastYaw:yaw });
  MR2.flammes = 0; MR2.vitreX = rand(.16, .36) * (z.uid % 2 ? 1 : -1); MR2.vitreY = rand(-.06, .06);
  mr2Evt('accroche', z); shake = Math.max(shake, .3);
  mr2Emprunt(S2 => { S2.tone(1400, .12, 'square', .05, 700); if (S2.thud) S2.thud(1.2); });
  if (typeof vib === 'function') vib([60, 30, 60], 20);
}
// Décroché (secousses, flammes : il perd une part de sa vie en tombant) ou lâché tout seul au bout de MR2_GRA.duree
function mr2Decrocher(z, perd){
  const s = MR2.vitreX > 0 ? 1 : -1;
  z.mr = 'chute'; z.mrT = 0; z.mrPerd = !!perd; z.g.visible = true; z.mrCd = MR2_GRA.recharge;
  z.mrA = { x:MECH.x, z:MECH_CAM.z - 1.6 }; z.mrB = { x:clamp(MECH.x + s * rand(6, 8), -11, 11), z:MECH_CAM.z - rand(5, 8) };
  if (z.proxy && hitMeshes.indexOf(z.proxy) < 0) hitMeshes.push(z.proxy);
  if (perd){ MR2.decroches++; mr2Evt('decroche', z); }
  mr2Emprunt(S2 => S2.tone(500, .3, 'triangle', .05, 200));
}
// Secousses du torse : une secousse compte quand le torse a tourné d'au moins MR2_GRA.amp dans un sens, vite, à l'inverse
// de la précédente. Le mouvement d'une image est plafonné (un saut de visée d'un coup ne compte pas pour une secousse).
function mr2Secousses(z, dt){
  const Q = MR2.secousse, G = MR2_GRA;
  if (Q.lastYaw == null) Q.lastYaw = yaw;
  let dy = yaw - Q.lastYaw; Q.lastYaw = yaw;
  while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
  const cap = Math.max(.12, 7 * dt); dy = clamp(dy, -cap, cap);
  const dir = Math.abs(dy) < 1e-4 ? 0 : Math.sign(dy);
  if (dir && dir !== Q.dir){ Q.dir = dir; Q.amp = 0; Q.t = 0; Q.compte = false; }
  if (dir){ Q.amp += Math.abs(dy); }
  Q.t += dt;
  if (Q.t > G.swingT && !Q.compte){ Q.amp = 0; Q.t = 0; }      // trop lent : on recommence ce demi-tour
  const seuil = mr2T() ? G.ampT * Math.min(1, typeof sens === 'number' && sens > 0 ? sens : 1) : G.amp;
  if (!Q.compte && Q.amp >= seuil){ Q.compte = true; Q.n++; Q.repos = 0; MR2.vitreSec = .25; }
  Q.repos += dt; if (Q.repos > 1.5 && Q.n > 0){ Q.n--; Q.repos = 0; } // sans secousse, il se rattrape
  if (Q.n >= mr2Rgl(G, 'secousses')) mr2Decrocher(z, true);
}

/* ---------- Mortier vivant : sac violet sur des racines, un tube orange pointé vers le ciel ---------- */
ZKINDS.mortier = {
  build(T){
    const skin = zmat(T.skin), racine = zmat(0x3a2a30), pust = zmat(0x9a6a8a);
    const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), PT = [];
    zkMesh(body, ZKG.sph, skin, .8, 1.0, .8, 0, 1.3, 0, PT);                         // sac
    const head = zkMesh(body, ZKG.sph, pust, .45, .4, .45, 0, 2.1, .1, PT);
    const tube = zkGroup(body, 0, 2.3, -.1); tube.rotation.x = -.35;
    zkMesh(tube, ZKG.box, racine, .42, 1.0, .42, 0, .5, 0, PT);                      // tube
    zkMesh(tube, ZKG.box, ZKM.core, .3, .08, .3, 0, 1.02, 0);                        // bouche du tube qui luit (se voit de loin)
    zkEyes(body, 1.75, .78, .16, 1.4);
    [[.55, 1.6, .4], [-.5, 1.1, .55], [.2, .8, .7], [-.6, 1.7, -.3]].forEach(p => zkMesh(body, ZKG.sph, pust, .16, .16, .16, p[0], p[1], p[2])); // pustules
    const legs = [];
    for (let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2, l = zkGroup(body, Math.cos(a) * .5, .6, Math.sin(a) * .5); l.rotation.set(Math.sin(a) * .7, 0, -Math.cos(a) * .7); zkMesh(l, ZKG.top, racine, .16, .75, .16, 0, 0, 0, PT); legs.push(l); } // racines
    g.scale.setScalar(T.scale); g.userData.rig = { legs, tube };
    return { g, body, head, parts:PT, mats:[skin, racine, pust], aimY:1.4 * T.scale };
  },
  init(z){ z.rig = z.g.userData.rig; z.mr = 'marche'; z.mrT = 0; z.mrCd = rand(1, 2.5); z.mrPlante = rand(MR2_MOR.plante[0], MR2_MOR.plante[1]); },
  update(z, dt){ if (!mr2Actif()) return false; mr2Mortier(z, dt); return true; }
};
function mr2Mortier(z, dt){
  const gp = z.g.position, MZ = MECH_CAM.z, M = MR2_MOR;
  z.mrT += dt; z.phase += dt * 2;
  if (!z.mrVu && gp.z > MZ - 85){ z.mrVu = true; mr2Annonce('mortier'); }
  if (z.mr === 'marche'){
    gp.z += z.speed * dt; z.body.rotation.z = Math.sin(z.phase * 2) * .08;
    z.rig.legs.forEach((l, i) => { l.rotation.y = Math.sin(z.phase * 2 + i) * .3; });
    if (gp.z >= MZ - z.mrPlante){ z.mr = 'plante'; z.mrT = 0; z.mrX = gp.x; mr2V.set(gp.x, .2, gp.z); burst(mr2V, 'dust', 10, 2); }
    return;
  }
  gp.x = z.mrX; // enraciné : il ne bouge plus (la rue défile avec la marche du robot)
  z.body.rotation.z = 0;
  z.mrCd -= dt;
  const k = z.mrCd < .6 ? clamp(1 - z.mrCd / .6, 0, 1) : 0;                      // il se gonfle avant de tirer
  z.body.scale.set(1 + .12 * k, 1 - .08 * k, 1 + .12 * k); z.rig.tube.rotation.x = -.35 - .25 * k;
  const d = MZ - gp.z;
  if (z.mrCd <= 0){
    if (d > M.pres && d < 100 && mr2ObusVol() < M.max){ mr2Tirer(z); z.mrCd = M.tir * rand(.85, 1.15); }
    else z.mrCd = .4;
  }
}

/* ---------- Obus du mortier : un projectile en cloche, un cercle rouge au sol pendant tout le vol ---------- */
const MR2_OBUS = [];
const MR2_LIGNES = [];
(function(){
  const matObus = new THREE.MeshBasicMaterial({ color:0xff8a2a, fog:false });
  const matCercle = new THREE.MeshBasicMaterial({ color:0xff3020, transparent:true, opacity:.8, depthWrite:false, side:THREE.DoubleSide, fog:false });
  const matDisque = new THREE.MeshBasicMaterial({ color:0xff2a10, transparent:true, opacity:.3, depthWrite:false, side:THREE.DoubleSide, fog:false });
  const gCercle = new THREE.RingGeometry(.86, 1, 40); gCercle.rotateX(-Math.PI / 2);
  const gDisque = new THREE.CircleGeometry(1, 32); gDisque.rotateX(-Math.PI / 2);
  [matObus, matCercle, matDisque].forEach(m => { m.userData.keep = true; });
  for (let i = 0; i < 3; i++){
    const m = new THREE.Mesh(ZKG.sph, matObus), c = new THREE.Mesh(gCercle, matCercle.clone()), d = new THREE.Mesh(gDisque, matDisque);
    m.scale.setScalar(.65); [m, c, d].forEach(o => { o.visible = false; o.userData.keep = true; o.renderOrder = 2; scene.add(o); });
    c.material.userData.keep = true;
    MR2_OBUS.push({ m, c, d, actif:false, t:0, T:2, ax:0, ay:0, az:0, x:0, z:0, r:3, dmg:0, src:null, trail:0 });
  }
  // Bandes au sol du Bélier (élan : pâle et qui bat ; charge : pleine)
  const matLigne = new THREE.MeshBasicMaterial({ color:0xff2a1a, transparent:true, opacity:.35, depthWrite:false, side:THREE.DoubleSide, fog:false });
  const gLigne = new THREE.PlaneGeometry(1, 1); gLigne.rotateX(-Math.PI / 2);
  for (let i = 0; i < 2; i++){ const l = new THREE.Mesh(gLigne, matLigne.clone()); l.material.userData.keep = true; l.visible = false; l.userData.keep = true; l.renderOrder = 2; scene.add(l); MR2_LIGNES.push(l); }
})();
const mr2ObusVol = () => { let n = 0; for (const o of MR2_OBUS) if (o.actif) n++; return n; };
function mr2Tirer(z){
  const o = MR2_OBUS.find(x => !x.actif); if (!o) return null;
  const gp = z.g.position, sc = z.g.scale.y || 1;
  o.actif = true; o.id = MR2.nTir = (MR2.nTir || 0) + 1; o.t = 0; o.T = mr2Rgl(MR2_MOR, 'vol'); o.r = mr2Rgl(MR2_MOR, 'rayon'); o.dmg = z.dmg * MR2_MOR.coup; o.src = z;
  o.ax = gp.x; o.ay = 3.3 * sc; o.az = gp.z; o.x = MECH.x; o.z = MECH_CAM.z; o.trail = 0;
  o.m.visible = o.c.visible = o.d.visible = true;
  o.c.scale.setScalar(o.r); o.c.position.set(o.x, .07, o.z);
  mr2Evt('tir', z);
  mr2V.set(gp.x, 3.6 * sc, gp.z); burst(mr2V, 'dust', 6, 3);
  mr2Emprunt(S2 => { if (S2._nz) S2._nz(S2.ctx.currentTime, 'lowpass', 180, 1, .35, .2); S2.tone(1500, o.T * .9, 'sine', .025, 500, .25); });
  return o;
}
function mr2ObusPas(dt, dz){
  for (const o of MR2_OBUS){
    if (!o.actif) continue;
    o.az += dz; o.z += dz; // la rue défile avec la marche du robot
    o.t += dt;
    const k = clamp(o.t / o.T, 0, 1);
    o.m.position.set(o.ax + (o.x - o.ax) * k, o.ay * (1 - k) + 26 * Math.sin(Math.PI * k) * (1 - .25 * k), o.az + (o.z - o.az) * k);
    o.c.position.set(o.x, .07, o.z); o.d.position.set(o.x, .06, o.z); o.d.scale.setScalar(Math.max(.05, o.r * k));
    o.c.material.opacity = .55 + .4 * Math.abs(Math.sin(o.t * (6 + 10 * k)));
    o.trail -= dt; if (o.trail <= 0){ o.trail = .06; burst(o.m.position, 'ember', 1, .6); }
    if (k >= 1) mr2Impact(o);
  }
}
function mr2Impact(o){
  o.actif = false; o.m.visible = o.c.visible = o.d.visible = false; MR2.impacts++;
  mr2V.set(o.x, .4, o.z); burst(mr2V, 'dust', 18, 5); burst(mr2V, 'ember', 10, 4);
  mr2Emprunt(S2 => S2.boom(1));
  const touche = Math.hypot(MECH.x - o.x, MECH_CAM.z - o.z) < o.r;
  if (touche){
    // Coup porté par l'obus là où il tombe (hitBarricade du robot ne compte que les coups près de lui)
    hitBarricade({ type:'mortier', g:{ position:new THREE.Vector3(o.x, 0, o.z) } }, o.dmg, .7, 6);
    if (typeof vib === 'function') vib([90, 40, 90], 25);
  } else { MR2.rates++; shake = Math.max(shake, .2); }
  mr2Evt('impact', o.src);
}
function mr2ObusRien(){ MR2_OBUS.forEach(o => { o.actif = false; o.m.visible = o.c.visible = o.d.visible = false; }); MR2_LIGNES.forEach(l => { l.visible = false; }); }

/* ---------- Le Grappin vu de l'habitacle : sur la vitre, il cache une partie de la vue ---------- */
const mr2Vitre = new THREE.Group(); mr2Vitre.visible = false; vmCam.add(mr2Vitre);
const mr2VitreM = (function(){
  const b = vmNew(), J = [.62, .56, .2], Jd = [.38, .34, .12], N = [.08, .07, .06], O = [3, .5, .2];
  vmBox(b, .34, .26, .1, J, 0, 0, 0, 0, 0, 0, .04);                    // ventre plaqué sur la vitre
  vmBox(b, .26, .2, .08, Jd, 0, -.04, .04, 0, 0, 0, .03);
  vmBox(b, .22, .16, .12, J, 0, .17, .03, 0, 0, 0, .03);                // tête
  vmBox(b, .05, .03, .02, O, -.06, .19, .1, 0, 0, 0, 0); vmBox(b, .05, .03, .02, O, .06, .19, .1, 0, 0, 0, 0); // yeux
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(p => {                 // bras et pattes écartés, crochets plantés dans la vitre
    vmBox(b, .3, .05, .05, Jd, p[0] * .27, p[1] * .1, -.01, 0, 0, p[0] * p[1] * .5, .01);
    vmBox(b, .04, .1, .04, N, p[0] * .43, p[1] * .2, -.03, 0, 0, p[0] * .3, 0);
  });
  return vmMesh(mr2Vitre, b);
})();
const mr2Gueule = (function(){
  const b = vmNew(); vmBox(b, .14, .05, .03, [.1, .02, .02], 0, 0, 0, 0, 0, 0, 0); vmBox(b, .13, .015, .02, [.9, .88, .75], 0, .02, .01, 0, 0, 0, 0);
  const m = vmMesh(mr2Vitre, b); m.position.set(0, .12, .1); return m;
})();
// Place et taille sur la vitre selon la forme de l'écran (dossier 121, purement visuel) : il gêne sans couvrir plus d'environ
// un tiers de la vue, ni le viseur au centre, ni les boutons tactiles, ni l'alerte « secoue le torse ».
//   f : centre à f × la demi-largeur visible (à gauche ou à droite), y : hauteur en part de la demi-hauteur visible (+ en haut),
//   l : largeur à l'écran au plus (part de la largeur). Avant : même place et même taille partout (au cell vertical, il
//   débordait de l'écran et en couvrait près de la moitié).
const MR2_VITRE = { ordi:{ f:.45, y:-.15, l:.26 }, couche:{ f:.3, y:-.17, l:.2 }, vertical:{ f:.56, y:0, l:.38 }, larg:.92, dist:.93 };
function mr2VitreImage(dt, z){
  const on = !!z && (state === 'mech' || state === 'mechover') && MECH.on;
  mr2Vitre.visible = on; if (!on) return;
  MR2.vitreSec = Math.max(0, (MR2.vitreSec || 0) - dt);
  const t = typeof time === 'number' ? time : 0, sec = MR2.vitreSec / .25, V = MR2_VITRE;
  const forme = vmCam.aspect < 1 ? 'vertical' : (isTouch || (typeof HB === 'object' && HB.tactile)) ? 'couche' : 'ordi', D = V[forme];
  const hv = V.dist * Math.tan(vmCam.fov * Math.PI / 360), hw = hv * vmCam.aspect;                 // demi-hauteur et demi-largeur visibles
  const k = Math.min(.95, D.l * 2 * hw / V.larg), cote = (MR2.vitreX || 0) >= 0 ? 1 : -1;
  const x = cote * (D.f + (Math.abs(MR2.vitreX || .26) - .26) * .15) * hw;                         // un peu de hasard d'une fois à l'autre
  mr2Vitre.rotation.x = typeof hbRoot === 'object' ? hbRoot.rotation.x : -pitch;
  mr2Vitre.position.set(x + Math.sin(t * 40) * .02 * sec, D.y * hv + (typeof hbRoot === 'object' ? hbRoot.position.y : 0) + (MR2.vitreY || 0) * k - .12 * k * Math.sin(Math.min(1, z.mrT * 4) * Math.PI / 2) + .12 * k, -V.dist);
  mr2Vitre.rotation.z = Math.sin(t * 3) * .05 + Math.sin(t * 40) * .15 * sec;
  mr2Vitre.scale.setScalar(k * (1 + .03 * Math.sin(t * 7)));
  mr2Gueule.scale.y = 1 + 2.2 * Math.abs(Math.sin(t * 9));        // il ronge
}

/* ---------- Alerte au centre de l'écran (jouer sans son), bords rouges sous un obus ---------- */
const mr2Al = document.createElement('div'); mr2Al.id = 'mr2Alerte';
mr2Al.style.cssText = 'position:absolute;left:50%;top:30%;transform:translateX(-50%);max-width:88vw;padding:6px 12px 8px;border-radius:10px;background:rgba(90,8,4,.62);'
  + 'border:2px solid #ff4a3a;color:#fff;font:bold 15px/1.25 system-ui,sans-serif;text-align:center;pointer-events:none;display:none;z-index:6;text-shadow:0 1px 2px #000';
mr2Al.innerHTML = '<div id="mr2AlTx"></div><div style="height:5px;margin-top:5px;background:rgba(255,255,255,.18);border-radius:3px;overflow:hidden"><i id="mr2AlBar" style="display:block;height:100%;width:0;background:#ff4a3a;transform-origin:left"></i></div>';
const mr2Bord = document.createElement('div'); mr2Bord.id = 'mr2Bord';
mr2Bord.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;box-shadow:inset 0 0 70px 18px rgba(255,40,20,.85)';
(function(){ const ui = typeof mechUI === 'object' && mechUI ? mechUI : null; if (ui){ ui.appendChild(mr2Al); ui.appendChild(mr2Bord); } })();
const MR2_AL = { txt:'', k:-1, c:'', on:false, bord:-1 };
function mr2Alerte(txt, k, c){
  if (!txt){ if (MR2_AL.on){ MR2_AL.on = false; mr2Al.style.display = 'none'; } return; }
  if (!MR2_AL.on){ MR2_AL.on = true; mr2Al.style.display = 'block'; }
  if (txt !== MR2_AL.txt){ MR2_AL.txt = txt; const e = $('mr2AlTx'); if (e) e.textContent = txt; }
  c = c || '#ff4a3a';
  if (c !== MR2_AL.c){ MR2_AL.c = c; mr2Al.style.borderColor = c; const b = $('mr2AlBar'); if (b) b.style.background = c; }
  const kk = k < 0 ? -1 : Math.round(clamp(k, 0, 1) * 40) / 40;
  if (kk !== MR2_AL.k){ MR2_AL.k = kk; const b = $('mr2AlBar'); if (b) b.style.width = (kk < 0 ? 0 : kk * 100) + '%'; }
}
function mr2Bords(v){ v = Math.round(v * 20) / 20; if (v !== MR2_AL.bord){ MR2_AL.bord = v; mr2Bord.style.opacity = String(v); } }
// L'alerte la plus urgente : Grappin sur la vitre, puis Bélier qui vise le robot, puis obus qui tombe sur lui
function mr2AlerteImage(gr){
  if (!(MECH.on && state === 'mech')){ mr2Alerte(null); mr2Bords(0); return; }
  const t = typeof time === 'number' ? time : 0;
  let obus = null;
  for (const o of MR2_OBUS) if (o.actif && Math.hypot(MECH.x - o.x, MECH_CAM.z - o.z) < o.r + .5 && (!obus || o.t / o.T > obus.t / obus.T)) obus = o;
  mr2Bords(obus ? .35 + .35 * Math.abs(Math.sin(t * 8)) : 0);
  if (gr){
    const n = mr2Rgl(MR2_GRA, 'secousses'), fl = mW('L') === 'flamer';
    return mr2Alerte('Grappin sur la vitre : secoue le torse ◀ ▶ (' + Math.min(n, MR2.secousse.n) + ' / ' + n + ')' + (fl ? ' ou lance-flammes' : ''), 1 - clamp(gr.mrT / MR2_GRA.duree, 0, 1), '#e8d040');
  }
  for (const z of zombies){
    if (z.dead || z.type !== 'belier') continue;
    if (z.mr === 'elan') return mr2Alerte('⚠ Bélier : il prend son élan', clamp(z.mrT / mr2Rgl(MR2_BEL, 'elan'), 0, 1));
    if (z.mr === 'charge') return mr2Alerte('⚠ Bélier : il charge, pas de côté !', 1);
  }
  for (const z of zombies) if (!z.dead && z.type === 'belier' && z.mr === 'sonne') return mr2Alerte('Bélier sonné : tire dans le dos !', 1 - clamp(z.mrT / mr2Rgl(MR2_BEL, 'sonne'), 0, 1), '#9aff70');
  if (obus) return mr2Alerte('⚠ Obus : bouge !', 1 - obus.t / obus.T);
  mr2Alerte(null);
}
// Bandes au sol des Béliers qui prennent leur élan ou chargent
function mr2LignesImage(){
  let n = 0;
  const t = typeof time === 'number' ? time : 0, on = MECH.on && (state === 'mech' || state === 'mechover');
  if (on) for (const z of zombies){
    if (n >= MR2_LIGNES.length) break;
    if (z.dead || z.type !== 'belier' || (z.mr !== 'elan' && z.mr !== 'charge')) continue;
    const l = MR2_LIGNES[n++], z0 = z.g.position.z + 1.5, z1 = MECH_CAM.z + 2, len = Math.max(.5, z1 - z0);
    l.visible = true; l.position.set(z.mrX, .05, (z0 + z1) / 2); l.scale.set(2 * mr2Rgl(MR2_BEL, 'rayon'), 1, len);
    l.material.opacity = z.mr === 'charge' ? .62 : .16 + .2 * Math.abs(Math.sin(t * 7));
  }
  for (; n < MR2_LIGNES.length; n++) MR2_LIGNES[n].visible = false;
}

/* ---------- Dégâts : Bélier blindé de face, Grappin sur la vitre hors d'atteinte ---------- */
// Retourne les dégâts à infliger, ou -1 (coup sans effet)
function mr2Filtre(z, amt){
  if (!z || z.dead) return amt;
  if (z.type === 'belier' && z.mr !== 'sonne') return amt * MR2_BEL.blinde;
  if (z.type === 'grappin' && z.mr === 'accroche') return -1;
  return amt;
}
try {
  const _d = damage;
  damage = function(z, amt, head, point){
    if (MECH.on){ const a = mr2Filtre(z, amt); if (a < 0) return; arguments[1] = a; }
    return _d.apply(this, arguments);
  };
} catch (e) { errNote(e); }

/* ---------- File de la rue : ils remplacent des marcheurs ---------- */
function mr2Compte(rue, tour){
  const o = { belier:0, grappin:0, mortier:0 };
  tour = Math.max(1, Math.floor(tour || 1)); rue = Math.max(1, Math.floor(rue || 1));
  const tab = tour <= 1 ? MR2_PLAN.t1 : MR2_PLAN.t2, r = Math.min(rue, 9), v = tab[r];
  if (!v) return o;
  const k = tour >= 3 ? 1 + MR2_PLAN.parTour * (tour - 2) : 1;
  MR2_TYPES.forEach((t, i) => { o[t] = v[i] ? Math.round(v[i] * k) : 0; });
  return o;
}
// Le monstre le plus nombreux d'une rue (pour l'annonce du carrefour)
function mr2Dominant(rue, tour){
  const c = mr2Compte(rue, tour); let best = null;
  MR2_TYPES.forEach(t => { if (c[t] > 0 && (!best || c[t] > c[best])) best = t; });
  return best;
}
function mr2Remplace(q, type, n){
  if (!(n > 0)) return 0;
  const idx = []; for (let i = 0; i < q.length; i++) if (q[i] === 'walker') idx.push(i);
  for (let i = idx.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  n = Math.min(n, Math.floor(idx.length * .5));
  for (let i = 0; i < n; i++) q[idx[i]] = type;
  return n;
}
try {
  const _mp = mechPlan;
  mechPlan = function(){
    const p = _mp.apply(this, arguments);
    try {
      // Pendant le combat contre le boss final, la horde qui se reforme n'en amène pas d'autres
      if (p && p.queue && typeof MECH === 'object' && !(typeof finBossVivant === 'function' && finBossVivant())){
        const c = mr2Compte(MECH.street, MECH.tour || 1);
        p.mr2 = {};
        MR2_TYPES.forEach(t => { p.mr2[t] = mr2Remplace(p.queue, t, c[t]); });
      }
    } catch (e) { errNote(e); }
    return p;
  };
} catch (e) { errNote(e); }

/* ---------- Carrefour : le monstre qui attend dans la rue suivante ; garage : ceux déjà rencontrés ---------- */
const MR2_NOMS = { belier:'un Bélier (pas de côté quand il charge)', grappin:'des Grappins (secoue le torse s’ils s’accrochent)', mortier:'un Mortier vivant (ne reste pas planté)' };
function mr2Panneaux(){
  if (typeof mechPanel !== 'object' || !mechPanel || mechPanel.classList.contains('hide')) return;
  if (MECH.choosing && !$('mr2Carrefour')){
    const rue = MECH.street + 1, rues = typeof MECH_FIN === 'object' ? MECH_FIN.rues : 9;
    const t = rue <= rues ? mr2Dominant(rue, MECH.tour || 1) : null, lead = mechPanel.querySelector('.lead');
    if (t && lead){ const p = document.createElement('p'); p.id = 'mr2Carrefour'; p.className = 'ds'; p.style.cssText = 'margin:4px 0 8px;color:#ffcf6a'; p.textContent = '⚠ Rue ' + rue + ' : ' + MR2_NOMS[t] + '.'; lead.parentNode.insertBefore(p, lead.nextSibling); }
  }
  if (!MECH.on && !$('mr2Garage') && mechPanel.querySelector('button[data-k]')){
    const V = mr2Norm(), vus = MR2_TYPES.filter(t => V[t]), up = mechPanel.querySelector('.mk-upg');
    if (vus.length && up){
      const d = document.createElement('div'); d.id = 'mr2Garage';
      d.innerHTML = '<h4 class="wuh">Monstres rencontrés</h4>' + vus.map(t => '<div class="row"><div class="info"><div class="nm">' + MR2_ANNONCE[t][0].replace(' !', '') + '</div><div class="ds">' + MR2_ANNONCE[t][1] + '</div></div></div>').join('');
      up.appendChild(d);
    }
  }
}

/* ---------- Chaque image ---------- */
function mr2Image(dt){
  // Nouvelle rue ou robot quitté : plus d'obus ni de bandes (les zombies, eux, sont effacés par mechStreet)
  const rue = MECH.on ? MECH.street : -1;
  if (rue !== MR2.rue || !MECH.on){ if (rue !== MR2.rue) mr2ObusRien(); MR2.rue = rue; MR2.lastDist = MECH.dist; }
  let dz = MECH.dist - MR2.lastDist; MR2.lastDist = MECH.dist;
  if (Math.abs(dz) > 6) dz = 0;
  const jeu = MECH.on && state === 'mech' && !MECH.paused;
  let gr = null;
  if (MECH.on) for (const z of zombies) if (!z.dead && z.type === 'grappin' && z.mr === 'accroche'){ gr = z; break; }
  if (jeu){
    mr2ObusPas(dt, dz);
    if (gr){
      mr2Secousses(gr, dt);
      // Lance-flammes au bras gauche : la vitre chauffe, il lâche et brûle
      if (gr.mr === 'accroche' && mW('L') === 'flamer' && firing){ MR2.flammes += dt; if (MR2.flammes >= MR2_GRA.flammes){ mr2Decrocher(gr, true); gr.hp -= gr.maxHp * .25; } }
      if (gr.mr !== 'accroche') gr = null;
    }
  } else if (!MECH.on) mr2ObusRien();
  mr2VitreImage(dt, gr);
  mr2LignesImage();
  mr2AlerteImage(gr);
  mr2Panneaux();
}
try { Jeu.on('image', dt => { try { mr2Image(dt); } catch (e) { errNote(e); } }); } catch (e) { errNote(e); }
try { Jeu.on('tue', (z, was) => { if (was && z && MR2_TYPES.indexOf(z.type) >= 0) MR2.tues[z.type] = (MR2.tues[z.type] || 0) + 1; }); } catch (e) { errNote(e); }

// Accès pour les tests automatiques et le simulateur
window.__mr2 = { MR2, MR2_TYPES, MR2_BEL, MR2_GRA, MR2_MOR, MR2_PLAN, MR2_ANNONCE, MR2_OBUS, MR2_LIGNES, mr2Compte, mr2Dominant, mr2Norm, mr2Annonce, mr2Filtre,
  mr2Tirer, mr2Decrocher, mr2Accrocher, mr2Secousses, mr2Rgl, mr2ObusRien, mr2Vitre, mr2BelierActif, mr2Accroche, MR2_VITRE };
