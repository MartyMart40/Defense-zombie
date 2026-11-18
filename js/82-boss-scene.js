'use strict';
/* ================= Mise en scène des boss du toit (dossier 128) ================= */
// Seulement visuel (les sons sont dans js/82-boss-sons.js) : aucun chiffre du jeu ne change (vie, dégâts, vitesse, moment
// d'apparition, récompense), aucune boîte de tir, aucune pause du jeu. Sur le toit seulement (aucun mode Jeu actif).
// Chaque boss des 5 premières villes (et le Liquidateur de la Centrale) a son arrivée, sa présence et sa mort :
//   arrivée  : contre-jour dans la brume derrière lui, oiseaux qui s'envolent, gerbe propre à chacun (mottes de terre,
//              cendres, poussière de béton, vapeur du port), lampadaires qui clignotent ou s'éteignent à son passage,
//              sous-titre de menace sous son nom dans la barre de vie. Version abrégée dès le 2e boss d'une partie
//              (mode infini surtout) : pas de contre-jour plein ni d'oiseaux, barre plus courte.
//   présence : poussière à chaque pas (le Titan et le Léviathan font trembler l'image, dosé par la distance, coupé avec
//              « Secousses »), lueur des yeux et de la plaie qui change sous 50 % et sous 25 % de vie, fumée qui monte,
//              éclats sur lui quand il prend des coups, barre qui bat sous 25 %.
//   mort     : il titube, plie les genoux ou part de côté selon le boss, s'effondre en plusieurs temps, soulève un
//              anneau de poussière, l'image tremble une fois ; le cadavre reste quelques secondes puis s'enfonce.
//              Le ralenti est celui qui existait déjà (js/31-punch.js, pkSlow('boss')) : rien de neuf sur le temps de jeu.
// Ce qui ne bouge pas : la pose d'un boss VIVANT n'est jamais touchée (sa tête est une cible) ; seule la pose du corps
// d'un boss MORT (plus une cible) l'est. La position (z.g.position), la vie et l'état des zombies ne sont jamais écrits.
// Quand js/07-zombies.js range le cadavre (z retiré de zombies), ce fichier remet le même groupe dans la scène le temps
// de finir la chute, puis le retire.
// Hasard : jamais Math.random (le simulateur le fixe). Les réserves sont faites au chargement dans bsCalme, qui prête
// Math.random au hasard propre pendant que Three.js tire les uuid. Rien n'est créé à chaque image.
// Appels de dessin en plus pendant un combat de boss : au plus 3 (poussière par instances, oiseaux par instances, halo).
// Branchements : Jeu.on('image') et Jeu.on('tue') seulement ; aucune fonction du jeu n'est réaffectée.

const BS_REGL = {
  on: true,                                     // interrupteur général (tests : faux puis vrai dans la même page)
  arrivee: 4.6, arriveeCourte: 1.6,             // durée du contre-jour (s) ; version abrégée
  halo: { taille: 26, op: .9, recul: 7, haut: 1.25 }, // contre-jour : taille (m, pour un boss d'échelle 7), opacité, recul derrière lui (m), hauteur (× échelle)
  hud: { arrivee: 2.8, court: 1.4 },            // animation du nom et du sous-titre (s)
  pas: { secousse: .0045, portee: 70, bouffees: 3 }, // secousse d'un pas (radians, × force du boss), portée (m), bouffées par pied
  lampes: { portee: 8, rallume: .35 },          // lampadaires touchés à moins de 8 m du boss ; délai entre deux qui se rallument (s)
  vie: [.5, .25],                               // paliers de vie qui changent la lueur et la fumée
  impact: { gap: .09 },                         // éclats sur lui au plus toutes les 0,09 s
  mort: { titube: .6, genoux: .65, chute: .55, rebond: .4, reste: 3, enfonce: 2.2, secousse: .02, court: .75 },
  poussiere: isTouch ? 56 : 96,                 // bouffées à la fois (une seule instance)
  oiseaux: isTouch ? 10 : 16,                   // oiseaux à la fois (une seule instance)
  // Un profil par boss (clé de BOSS_VAR). menace : sous-titre ; halo : couleur du contre-jour ; terre : poussière des pas ;
  // fumee : fumée qui monte de lui (null : seulement blessé) ; oiseaux : couleur (null : aucun) ; braise : braises qui
  // montent ; lampes : 'clignote' ou 'eteint' (il les éteint) ; pas : force des pas ; mort : façon de tomber ; gerbe : à l'arrivée.
  P: {
    village:  { id:'fossoyeur', menace:'Sorti du cimetière, il lance des autos', halo:0xd9b878, terre:0x5e4c36, fumee:null, oiseaux:0x17171b, braise:false, lampes:'clignote', pas:1, mort:'vrille', gerbe:'mottes',
      legende:'[Le Fossoyeur sort de terre, les corbeaux s’envolent]' },
    ville:    { id:'colosse', menace:'Couvert de braises, son poing enfonce la barricade', halo:0xff6a2a, terre:0x4a4644, fumee:0x2b2727, oiseaux:null, braise:true, lampes:'clignote', pas:1, mort:'arriere', gerbe:'cendres',
      legende:'[Le Colosse arrive dans un nuage de cendres]' },
    banlieue: { id:'ogre', menace:'Il éteint les lampadaires sur son passage', halo:0x8fb0ff, terre:0x3e4448, fumee:null, oiseaux:0x1d1d22, braise:false, lampes:'eteint', pas:1, mort:'cote', gerbe:'poussiere',
      legende:'[Hurlement : l’Ogre éteint les lampadaires]' },
    centre:   { id:'titan', menace:'Chaque pas fait trembler la rue', halo:0xd8cfbf, terre:0x8a8378, fumee:null, oiseaux:0x6b6b72, braise:false, lampes:'clignote', pas:2.2, mort:'genoux', gerbe:'beton',
      legende:'[La rue tremble sous les pas du Titan]' },
    port:     { id:'docker', menace:'Il arrache les autos du quai', halo:0xcfe6ff, terre:0x5a6066, fumee:0x8a98a3, oiseaux:0xe6eaee, braise:false, lampes:'clignote', pas:1.2, mort:'assis', gerbe:'vapeur',
      legende:'[Corne de brume : le Docker approche]' },
    port10:   { id:'leviathan', menace:'Le géant du port : vise la tête, tire les autos', halo:0xff4a2a, terre:0x50585e, fumee:0x2e3236, oiseaux:0xe6eaee, braise:false, lampes:'eteint', pas:2.6, mort:'lent', gerbe:'vapeur',
      legende:'[Deux cornes de brume : le Léviathan sort du brouillard]' },
    centrale: { id:'liquidateur', menace:'Il lance des autos et frappe la barricade', halo:0x9cff8a, terre:0x5a6050, fumee:0x7a8a70, oiseaux:null, braise:false, lampes:'clignote', pas:1.3, mort:'arriere', gerbe:'vapeur',
      legende:null },
    defaut:   { id:'boss', menace:'Il lance des autos et frappe la barricade', halo:0xffc070, terre:0x5a5048, fumee:null, oiseaux:null, braise:false, lampes:'clignote', pas:1, mort:'arriere', gerbe:'poussiere', legende:null }
  }
};

/* ---------- Hasard propre (Park et Miller) : jamais Math.random ---------- */
let bsGr = 4271;
const bsR = () => { bsGr = (bsGr * 16807) % 2147483647; return (bsGr - 1) / 2147483646; };
const bsH = (a, b) => a + (b - a) * bsR();
const bsHash = (a, b) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };
// Three.js tire 4 nombres de Math.random par objet créé (uuid) : on lui prête le hasard propre (comme fusionCalme)
function bsCalme(fn){ const R = Math.random; Math.random = bsR; try { return fn(); } finally { Math.random = R; } }

const BS = {
  S:null, vus:0, halo:{ z:null, t:0, D:0, op:0 }, hud:{ t:0, el:null, z:null, cls:{} }, morts:[], lampes:new Map(), eteintes:[], rallT:0,
  actif:false,
  n:{ arrivees:0, courtes:0, pas:0, impacts:0, paliers:0, morts:0, chutes:0, oiseaux:0, rendus:0, corpsRepris:0 }
};
const bsV = new THREE.Vector3(), bsV2 = new THREE.Vector3(), bsS = new THREE.Vector3(), bsM = new THREE.Matrix4(), bsC = new THREE.Color(), bsC2 = new THREE.Color();
const bsQ0 = new THREE.Quaternion();

/* ---------- Réserves faites une fois (au chargement, hasard propre) ---------- */
// Poussière, fumée, braises, éclats : un plan face à la caméra par bouffée, opacité par instance (attribut bsA)
const BSP = bsCalme(() => {
  const n = BS_REGL.poussiere;
  const geo = new THREE.PlaneGeometry(1, 1);
  const a = new THREE.InstancedBufferAttribute(new Float32Array(n), 1); a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('bsA', a);
  const mat = new THREE.MeshBasicMaterial({ map:glowTex, transparent:true, depthWrite:false, color:0xffffff });
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float bsA;\nvarying float vBsA;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBsA = bsA;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vBsA;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse, opacity * vBsA );');
  };
  mat.customProgramCacheKey = () => 'boss-scene-poussiere';
  const im = new THREE.InstancedMesh(geo, mat, n);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  im.setColorAt(0, new THREE.Color(1, 1, 1)); im.instanceColor.setUsage(THREE.DynamicDrawUsage);
  im.count = 0; im.visible = false; im.frustumCulled = false; im.renderOrder = 6;
  scene.add(im);
  const L = [];
  for (let i = 0; i < n; i++) L.push({ on:false, x:0, y:0, z:0, vx:0, vy:0, vz:0, t:0, life:1, s0:1, s1:2, r:1, g:1, b:1, op:1, grav:0, drag:0 });
  return { im, a, L, i:0 };
});
// Oiseaux : deux ailes en V, battement par l'échelle verticale de l'instance
const BSO = bsCalme(() => {
  const n = BS_REGL.oiseaux, geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, .14, 0, 0, -.14, -.62, .12, -.05,  0, 0, -.14, 0, 0, .14, .62, .12, -.05], 3));
  const mat = new THREE.MeshBasicMaterial({ color:0xffffff, side:THREE.DoubleSide });
  const im = new THREE.InstancedMesh(geo, mat, n);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  im.setColorAt(0, new THREE.Color(1, 1, 1)); im.instanceColor.setUsage(THREE.DynamicDrawUsage);
  im.count = 0; im.visible = false; im.frustumCulled = false;
  scene.add(im);
  const L = [];
  for (let i = 0; i < n; i++) L.push({ on:false, x:0, y:0, z:0, vx:0, vy:0, vz:0, t:0, life:6, ph:0, f:9, s:1, c:0 });
  return { im, L };
});
// Contre-jour : une lueur derrière le boss, sans brouillard ; le boss (opaque, devant) la découpe en silhouette
const BSH = bsCalme(() => {
  const m = new THREE.SpriteMaterial({ map:glowTex, color:0xffffff, fog:false, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0 });
  const s = new THREE.Sprite(m); s.visible = false; s.renderOrder = 1; scene.add(s);
  return { s, m };
});

/* ---------- Petits outils ---------- */
const bsToit = () => !Jeu.actif() && (state === 'playing' || state === 'paused');
function bsProfil(z){
  const V = typeof BOSS_VAR === 'object' ? BOSS_VAR : {};
  for (const k in V) if (V[k] && V[k].name === z.bossName) return BS_REGL.P[k] || BS_REGL.P.defaut;
  return BS_REGL.P.defaut;
}
const bsEchelle = z => z.bossScale || (z.g && z.g.scale.x) || 7;
const bsLoin = (x, z) => Math.hypot(x - camera.position.x, z - camera.position.z);
const bsSon = (nom, P, k, x) => { if (typeof bssJouer === 'function') try { bssJouer(nom, P, k, x); } catch (e) { errNote(e); } };
// Image seulement : petit coup de caméra par le ressort de js/62-ressenti.js (retiré avant update() et fire()) ; coupé avec « Secousses »
function bsSecoue(a){
  if (!(a > 0) || typeof RS !== 'object' || !RS.on || typeof rsToit !== 'function' || !rsToit()) return false;
  a = Math.min(a, .03);
  const w = RS.w || 20, e = 2.718 * w;
  RS.vp += a * .7 * e * (bsR() < .5 ? -1 : 1);
  RS.cr += a * .5 * (bsR() < .5 ? -1 : 1);
  RS.vy += a * .3 * e * (bsR() < .5 ? -1 : 1);
  return true;
}

/* ---------- Poussière (réserve) ---------- */
function bsPuff(x, y, z, vx, vy, vz, life, s0, s1, col, op, grav, drag){
  const R = BSP, p = R.L[R.i]; R.i = (R.i + 1) % R.L.length;
  p.on = true; p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.t = 0; p.life = life; p.s0 = s0; p.s1 = s1;
  bsC.setHex(col); p.r = bsC.r; p.g = bsC.g; p.b = bsC.b; p.op = op; p.grav = grav || 0; p.drag = drag == null ? .6 : drag;
  return p;
}
// Une gerbe autour d'un point : n bouffées, vitesse radiale v, montée vy
function bsGerbe(x, y, z, n, rayon, v, vy, life, s0, s1, col, op, grav){
  for (let i = 0; i < n; i++){
    const a = bsR() * 6.283, r = rayon * (.3 + .7 * bsR()), c = Math.cos(a), s = Math.sin(a), k = .6 + .8 * bsR();
    bsPuff(x + c * r, y + bsR() * .4, z + s * r, c * v * k, vy * (.5 + bsR()), s * v * k, life * (.75 + .5 * bsR()), s0, s1, col, op, grav);
  }
}
function bsPuffStep(dt){
  const R = BSP, A = R.im.instanceMatrix.array, C = R.im.instanceColor.array, al = R.a.array, q = camera.quaternion;
  let n = 0;
  for (let i = 0; i < R.L.length; i++){
    const p = R.L[i]; if (!p.on) continue;
    p.t += dt; if (p.t >= p.life){ p.on = false; continue; }
    const dr = Math.exp(-p.drag * dt);
    p.vx *= dr; p.vz *= dr; p.vy = p.vy * dr - p.grav * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.y < .05){ p.y = .05; p.vy = 0; }
    const u = p.t / p.life, sc = p.s0 + (p.s1 - p.s0) * Math.sqrt(u);
    bsV.set(p.x, p.y, p.z); bsS.set(sc, sc, sc); bsM.compose(bsV, q, bsS); bsM.toArray(A, n * 16);
    C[n * 3] = p.r; C[n * 3 + 1] = p.g; C[n * 3 + 2] = p.b;
    al[n] = p.op * Math.min(1, u * 6) * (1 - u) * (1 - u * .3);
    n++;
  }
  bsPuffMaj(n);
}
function bsPuffMaj(n){
  const im = BSP.im;
  if (!n && !im.count){ im.visible = false; return; }
  im.count = n; im.visible = n > 0;
  im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; BSP.a.needsUpdate = true;
}

/* ---------- Oiseaux ---------- */
function bsOiseaux(gz, col, n){
  const O = BSO; let k = 0;
  for (let i = 0; i < O.L.length && k < n; i++){
    const o = O.L[i]; if (o.on) continue;
    const sd = bsR() < .5 ? -1 : 1;
    o.on = true; o.t = -bsR() * .8; o.life = 5.5 + bsR() * 2;
    o.x = sd * bsH(9.5, 13.5); o.y = bsH(9, 16); o.z = gz + bsH(-14, 10);
    o.vx = -sd * bsH(.5, 3); o.vy = bsH(3, 5.5); o.vz = bsH(-6, -2);
    o.ph = bsR() * 6.28; o.f = bsH(9, 13); o.s = bsH(1, 1.5); bsC.setHex(col); o.c = col; o.r = bsC.r; o.g = bsC.g; o.b = bsC.b;
    k++;
  }
  BS.n.oiseaux += k;
  return k;
}
function bsOiseauxStep(dt){
  const O = BSO, A = O.im.instanceMatrix.array, C = O.im.instanceColor.array;
  let n = 0;
  for (let i = 0; i < O.L.length; i++){
    const o = O.L[i]; if (!o.on) continue;
    o.t += dt; if (o.t >= o.life){ o.on = false; continue; }
    if (o.t < 0) continue; // il attend son tour (envol en désordre)
    o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; o.vy *= Math.exp(-.25 * dt);
    const fl = Math.sin(o.t * o.f + o.ph) * 2.2, h = Math.atan2(o.vx, o.vz);
    bsQ0.setFromAxisAngle(THREE.Object3D.DefaultUp, h);
    bsV.set(o.x, o.y, o.z); bsS.set(o.s, o.s * fl, o.s); bsM.compose(bsV, bsQ0, bsS); bsM.toArray(A, n * 16);
    C[n * 3] = o.r; C[n * 3 + 1] = o.g; C[n * 3 + 2] = o.b;
    n++;
  }
  const im = O.im;
  if (!n && !im.count){ im.visible = false; return; }
  im.count = n; im.visible = n > 0; im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
}

/* ---------- Contre-jour ---------- */
function bsHaloStep(dt){
  const H = BS.halo, z = H.z;
  if (!z || z.dead || zombies.indexOf(z) < 0 || H.t >= H.D){ BSH.s.visible = false; H.z = null; return; }
  H.t += dt;
  const D = H.D, t = H.t, a = t < .7 ? t / .7 : t > D - 1.4 ? Math.max(0, (D - t) / 1.4) : 1;
  const s = bsEchelle(z), R = BS_REGL.halo, gp = z.g.position;
  BSH.s.position.set(gp.x, s * R.haut, gp.z - R.recul * s / 7);
  const k = R.taille * s / 7 * (1 + .06 * Math.sin(t * 2.3));
  BSH.s.scale.set(k * 1.25, k, 1);
  BSH.m.opacity = R.op * H.op * a;
  BSH.s.visible = BSH.m.opacity > .01;
}

/* ---------- Lampadaires (lueur de js/36 et lampes de nuit de js/22) ---------- */
// f : 1 allumé, 0 éteint ; les valeurs d'origine des lampes sont gardées et remises
function bsLampe(i, x, z, f){
  if (typeof gfxHalos !== 'undefined' && gfxHalos[i] && f < .5) gfxHalos[i].visible = false;
  if (typeof AMB === 'object' && AMB.lamps) for (const l of AMB.lamps){
    if (Math.abs(l.position.z - z) > .5 || Math.abs(l.position.x - x) > 1.5) continue;
    let b = BS.lampes.get(l); if (b == null){ b = l.intensity; BS.lampes.set(l, b); }
    l.intensity = b * f;
  }
}
function bsLampesRemettre(){
  BS.lampes.forEach((b, l) => { l.intensity = b; }); BS.lampes.clear();
  BS.eteintes.length = 0; BS.rallT = 0;
}
// Chaque image : lampes près des boss vivants (clignotent ou s'éteignent), rallumées une à une après la mort de l'Ogre
function bsLampesStep(dt, boss){
  const T = typeof world !== 'undefined' && world && world.userData.tetes;
  if (!T || !T.length){ if (BS.lampes.size) bsLampesRemettre(); return; }
  const tm = typeof time === 'number' ? time : 0, por = BS_REGL.lampes.portee;
  let touche = false;
  for (let i = 0; i < T.length; i++){
    const p = T[i]; let f = 1;
    for (let j = 0; j < boss.length; j++){
      const z = boss[j], d = Math.abs(z.g.position.z - p[2]);
      if (z.bs.P.lampes === 'eteint'){
        if (d < por && BS.eteintes.indexOf(i) < 0) BS.eteintes.push(i);
        if (d < por * 1.6) f = Math.min(f, bsHash(i, Math.floor(tm * 16)) > .55 ? .25 : 0);
      } else if (d < por){
        f = Math.min(f, bsHash(i + 7, Math.floor(tm * 13)) > .4 ? 1 : .1);
      }
    }
    if (BS.eteintes.indexOf(i) >= 0) f = Math.min(f, 0);
    if (f < 1){ bsLampe(i, p[0], p[2], f); touche = true; }
  }
  // Plus d'Ogre vivant : les lampes éteintes se rallument une à une, avec un dernier clignotement
  if (BS.eteintes.length && !boss.some(z => z.bs.P.lampes === 'eteint')){
    BS.rallT += dt;
    if (BS.rallT >= BS_REGL.lampes.rallume){ BS.rallT = 0; BS.eteintes.shift(); }
  }
  if (!touche && BS.lampes.size) bsLampesRemettre();
}

/* ---------- Barre de vie : sous-titre de menace, apparition soignée, paliers ---------- */
function bsHudEl(){
  const H = BS.hud;
  if (H.el && H.el.isConnected) return H.el;
  const bar = $('bossBar'), nom = $('bossName'); if (!bar || !nom) return null;
  let el = document.getElementById('bsMenace');
  if (!el){ el = document.createElement('div'); el.id = 'bsMenace'; nom.insertAdjacentElement('afterend', el); }
  return (H.el = el);
}
function bsHudCls(cls, on){
  const H = BS.hud; if (H.cls[cls] === on) return;
  const bar = $('bossBar'); if (!bar) return;
  H.cls[cls] = on; bar.classList.toggle(cls, on);
}
function bsHudArrivee(z){
  const el = bsHudEl(); if (!el) return;
  el.textContent = z.bs.P.menace;
  BS.hud.z = z; BS.hud.t = z.bs.court ? BS_REGL.hud.court : BS_REGL.hud.arrivee;
  BS.hud.cls.bsArrive = null; bsHudCls('bsArrive', false);
  const bar = $('bossBar'); if (bar) void bar.offsetWidth; // relance l'animation
  bsHudCls('bsArrive', true); bsHudCls('bsCourt', !!z.bs.court);
}
function bsHudStep(dt, z){
  const H = BS.hud;
  if (H.t > 0){ H.t -= dt; if (H.t <= 0){ bsHudCls('bsArrive', false); bsHudCls('bsCourt', false); } }
  if (z && H.el && H.z !== z){ H.z = z; H.el.textContent = z.bs.P.menace; }
  const st = z ? z.bs.stage : 0;
  bsHudCls('bsMoitie', st === 1); bsHudCls('bsQuart', st >= 2);
}
function bsHudFin(){ const H = BS.hud; H.t = 0; ['bsArrive', 'bsCourt', 'bsMoitie', 'bsQuart'].forEach(c => bsHudCls(c, false)); }
// Récompense : le bandeau « Boss abattu ! » de js/19-boss.js s'affiche avec une entrée soignée (CSS)
let bsButinT = 0;
function bsButin(){
  const b = $('banner'); if (!b) return;
  b.classList.remove('bsButin'); void b.offsetWidth; b.classList.add('bsButin'); bsButinT = 3;
}

/* ---------- Arrivée ---------- */
function bsNouveau(z){
  if (z.coeur || (typeof BOSS_VAR === 'object' && BOSS_VAR.coeur && z.bossName === BOSS_VAR.coeur.name)){ z.bs = { skip:true }; return; } // le Cœur a sa propre mise en scène (js/71, js/76)
  const P = bsProfil(z), court = BS.vus > 0, glow = z.mats && z.mats[5] && z.mats[5].isMeshBasicMaterial ? z.mats[5] : null;
  BS.vus++; BS.n.arrivees++; if (court) BS.n.courtes++;
  z.bs = { P, court, hp0:z.hp, stage:0, stepC:z.stepC, impT:-9, glow, glowHex:glow ? glow.color.getHex() : 0, fumT:0, t:0 };
  const gp = z.g.position, s = bsEchelle(z);
  // Contre-jour dans la brume
  BS.halo.z = z; BS.halo.t = 0; BS.halo.D = court ? BS_REGL.arriveeCourte : BS_REGL.arrivee; BS.halo.op = court ? .45 : 1;
  BSH.m.color.setHex(P.halo);
  // Gerbe propre au boss
  const n = court ? 8 : 18;
  if (P.gerbe === 'mottes'){ bsGerbe(gp.x, .3, gp.z, n, s * .5, 5, 7, 1.6, .5, 1.1, P.terre, .95, 12); bsGerbe(gp.x, .5, gp.z, n, s * .6, 2.5, 1.5, 2.4, s * .3, s * .7, P.terre, .5, 0); }
  else if (P.gerbe === 'cendres'){ bsGerbe(gp.x, 1, gp.z, n, s * .6, 2, 2.5, 3, s * .3, s * .9, 0x3a3634, .6, -.3); bsGerbe(gp.x, 2, gp.z, n >> 1, s * .5, 1.5, 4, 2.2, .25, .4, 0xff8a30, .95, -.5); }
  else if (P.gerbe === 'beton'){ bsGerbe(gp.x, .4, gp.z, n, s * .7, 4, 2, 2.6, s * .35, s * 1, P.terre, .6, 0); bsGerbe(gp.x, .6, gp.z, n >> 1, s * .4, 6, 6, 1.4, .4, .7, 0x77736c, .95, 14); }
  else if (P.gerbe === 'vapeur'){ bsGerbe(gp.x, 1.5, gp.z, n, s * .8, 1.2, 1, 3.2, s * .4, s * 1.1, 0xb8c4cc, .35, -.2); }
  else bsGerbe(gp.x, .4, gp.z, n, s * .6, 3, 1.5, 2.2, s * .3, s * .8, P.terre, .5, 0);
  if (P.oiseaux != null && !court) bsOiseaux(gp.z, P.oiseaux, BS_REGL.oiseaux);
  if (P.pas > 2) bsSecoue(BS_REGL.pas.secousse * P.pas * 1.5);
  bsHudArrivee(z);
  if (P.legende && !court && typeof rpCaption === 'function') try { rpCaption(P.legende, 'bs-' + P.id); } catch (e) { errNote(e); }
  bsSon('cri', P, court ? .7 : 1, gp.x);
}

/* ---------- Présence ---------- */
function bsPresence(z, dt){
  const B = z.bs, P = B.P, gp = z.g.position, s = bsEchelle(z);
  B.t += dt;
  // Pas : js/19-boss.js inverse z.stepC à chaque pas (lu seulement)
  if (z.stepC !== B.stepC){
    B.stepC = z.stepC; BS.n.pas++;
    const d = bsLoin(gp.x, gp.z), kd = Math.max(0, Math.min(1, 1 - (d - 12) / BS_REGL.pas.portee));
    const fx = gp.x + (z.stepC > 0 ? -1 : 1) * .34 * s, fz = gp.z + .15 * s, nb = Math.round(BS_REGL.pas.bouffees * Math.min(2, P.pas));
    for (let i = 0; i < nb; i++) bsPuff(fx + bsH(-.6, .6), .3, fz + bsH(-.6, .6), bsH(-2, 2) * P.pas, bsH(.4, 1.2), bsH(-1, 1.5) * P.pas, bsH(1.2, 1.8), s * .2, s * .55 * Math.min(1.6, P.pas), P.terre, .5, 0);
    if (P.gerbe === 'mottes' || P.gerbe === 'beton') for (let i = 0; i < 2; i++) bsPuff(fx, .4, fz, bsH(-3, 3), bsH(3, 5), bsH(-1, 2), 1, .35, .45, P.terre, .95, 14);
    if (P.pas > 2) bsSecoue(BS_REGL.pas.secousse * P.pas * kd);
    if (P.pas > 2) bsSon('pas', P, kd, gp.x);
  }
  // Paliers de vie : lueur, fumée
  const r = z.maxHp > 0 ? z.hp / z.maxHp : 1, V = BS_REGL.vie, st = r < V[1] ? 2 : r < V[0] ? 1 : 0;
  if (st > B.stage){
    B.stage = st; BS.n.paliers++;
    bsGerbe(gp.x, s * 1.5, gp.z + .3 * s, 8, s * .3, 2, 2, 1.6, s * .15, s * .4, st > 1 ? 0x2a2222 : 0x4a4440, .6, -.2);
    bsSon('palier', P, st, gp.x);
  }
  if (B.glow){
    const tm = typeof time === 'number' ? time : 0;
    if (st === 0) B.glow.color.setHex(B.glowHex);
    else {
      const pu = st === 1 ? .5 + .5 * Math.sin(tm * 3) : .5 + .5 * Math.sin(tm * 9);
      bsC.setHex(B.glowHex); bsC2.setHex(st === 1 ? 0xff2a10 : 0xfff0d0); B.glow.color.copy(bsC).lerp(bsC2, st === 1 ? .35 + .4 * pu : .2 + .8 * pu);
    }
  }
  // Fumée : la sienne (profil), plus celle des blessures sous 50 %, braises sous 25 % (et toujours pour le Colosse)
  const taux = (P.fumee != null ? 2.5 : 0) + (st >= 1 ? 3 : 0) + (st >= 2 ? 4 : 0);
  if (taux > 0){
    B.fumT -= dt * taux;
    while (B.fumT < 0){
      B.fumT += 1;
      const sd = bsR() < .5 ? -1 : 1, col = P.fumee != null && (st === 0 || bsR() < .5) ? P.fumee : 0x262222;
      bsPuff(gp.x + sd * .8 * s + bsH(-.5, .5), s * 1.85, gp.z + .2 * s, bsH(-.4, .4), bsH(1.5, 3), bsH(-.6, .2), bsH(2, 3), s * .12, s * .45, col, .45, -.15, .3);
    }
  }
  if (P.braise || st >= 2){ if (bsR() < dt * (P.braise ? 7 : 4)) bsPuff(gp.x + bsH(-.7, .7) * s, s * bsH(1, 1.9), gp.z + .4 * s, bsH(-.8, .8), bsH(2, 4), bsH(-.3, .3), bsH(1, 1.8), .25, .12, 0xff8a30, 1, -.4, .2); }
  // Coups reçus : éclats et étincelles sur sa plaque (la vie est seulement lue)
  if (z.hp < B.hp0 - 1e-9){
    if (B.t - B.impT >= BS_REGL.impact.gap){
      B.impT = B.t; BS.n.impacts++;
      const x = gp.x + bsH(-.55, .55) * s, y = s * bsH(1.05, 1.95), zz = gp.z + .5 * s;
      bsPuff(x, y, zz, bsH(-3, 3), bsH(1, 4), bsH(1, 4), .35, .5, .2, 0xffd27a, 1, 9, .5);
      bsPuff(x, y, zz, bsH(-2, 2), bsH(0, 2), bsH(1, 3), .45, .4, .15, 0xfff2c0, 1, 9, .5);
      bsPuff(x, y, zz, bsH(-1, 1), bsH(.2, 1), bsH(.5, 1.5), .9, s * .06, s * .2, P.terre, .5, 0);
    }
  }
  B.hp0 = z.hp;
}

/* ---------- Mort : chute en plusieurs temps, cadavre qui reste puis s'enfonce ---------- */
function bsMortDebut(z){
  const B = z.bs, P = B.P, court = B.court, R = BS_REGL.mort;
  BS.n.morts++;
  while (BS.morts.length >= 2) bsMortFin(BS.morts[0]);
  const k = court ? R.court : 1, lent = P.mort === 'lent', gen = P.mort !== 'arriere' && P.mort !== 'cote';
  const T1 = R.titube * k * (lent ? 1.5 : 1), T2 = T1 + (gen ? R.genoux * (lent ? 1.4 : 1) : .12), T3 = T2 + R.chute * (lent ? 1.25 : 1), T4 = T3 + R.rebond;
  const M = { z, P, t:0, sg:bsR() < .5 ? -1 : 1, T1, T2, T3, T4, fin:T4 + R.reste * k + R.enfonce, imp:false, own:false, monde:world, S, wave:S ? S.wave : 0, glow:B.glow, glowHex:B.glowHex };
  BS.morts.push(M);
  bsButin();
  bsSon('rale', P, 1, z.g.position.x);
}
function bsMortFin(M){
  const i = BS.morts.indexOf(M); if (i >= 0) BS.morts.splice(i, 1);
  if (M.own && M.z.g.parent) M.z.g.parent.remove(M.z.g);
  M.own = false;
}
function bsMortStep(M, dt){
  const z = M.z, B = z.B, b = z.body;
  if (zombies.indexOf(z) < 0 && !M.own){
    if (z.g.parent){ bsMortFin(M); return; }
    scene.add(z.g); M.own = true; BS.n.corpsRepris++; // js/07 a rangé le corps : on le garde le temps de finir la chute
  }
  M.t += dt;
  const t = M.t, P = M.P, s = bsEchelle(z), gp = z.g.position;
  if (t >= M.fin){ bsMortFin(M); return; }
  let ax = 0, ay = 0, az = 0, kneel = 0, fall = 0, bounce = 0;
  // Genoux : Titan, Léviathan, Fossoyeur (qui tourne sur lui-même) ; assis : le Docker tombe sur le derrière
  const st = P.mort, gen = st === 'genoux' || st === 'lent' || st === 'vrille', kMax = st === 'assis' ? .55 : gen ? 1 : .25;
  if (t < M.T1){ const u = t / M.T1; az = Math.sin(t * 8.5) * .09 * (1 - u * .4) * M.sg; ax = -.16 * Math.sin(u * Math.PI); }
  else if (t < M.T2){ const u = (t - M.T1) / (M.T2 - M.T1), e = u * u * (3 - 2 * u); kneel = e * kMax; az = Math.sin(t * 8.5) * .04 * (1 - e) * M.sg; }
  else {
    kneel = kMax;
    const u = Math.min(1, (t - M.T2) / (M.T3 - M.T2)); fall = u * u;
    if (t >= M.T3){ fall = 1; if (t < M.T4) bounce = Math.sin((t - M.T3) / (M.T4 - M.T3) * Math.PI) * .07; }
  }
  if (!M.imp && t >= M.T3) bsMortImpact(M);
  // Toujours vers l'arrière (loin de la caméra) : le corps ne cache jamais la rue devant la barricade.
  // Ordre XYZ de Three.js : la chute (x) s'applique après le tour (y) et la bascule de côté (z).
  if (st === 'vrille') ay = M.sg * 2.6 * Math.min(1, t / M.T3) * (2 - Math.min(1, t / M.T3));
  if (st === 'cote'){ az += M.sg * (fall * .75 - bounce * .5); ax += -fall * (Math.PI / 2 - .35) + bounce; }
  else ax += -fall * (Math.PI / 2 - .12) + bounce;
  // Enfoncement du cadavre à la fin, et compensation de la descente faite par js/07 (z.g.position.y n'est pas écrit)
  const t5 = M.fin - BS_REGL.mort.enfonce, ue = t > t5 ? (t - t5) / BS_REGL.mort.enfonce : 0;
  const comp = gp.y < 0 ? -gp.y / s : 0;
  b.rotation.set(ax, ay, az);
  b.position.set(0, -kneel * .42 + (fall > .9 ? .08 : 0) + comp - ue * ue * .75, 0);
  if (B){
    B.legL.rotation.x = B.legR.rotation.x = -kneel * 1.35;
    B.kneeL.rotation.x = B.kneeR.rotation.x = kneel * 1.9;
    const fl = t < M.T2 ? Math.sin(t * 7) : 0;
    B.armR.rotation.x = -LEAN - .5 * fl - fall * 1.2; B.armL.rotation.x = -LEAN + .6 * fl - fall * 1.4;
    B.chest.rotation.x = LEAN + .18 * Math.sin(Math.min(t, M.T2) * 6) * (1 - fall);
    B.neck.rotation.y = .4 * M.sg * Math.min(1, t / M.T3);
  }
  // Les yeux et la plaie s'éteignent
  if (M.glow){ bsC.setHex(M.glowHex); bsC2.setHex(0x1a0a06); M.glow.color.copy(bsC).lerp(bsC2, Math.min(1, t / (M.T3 + .6))); }
  // Poussière qui retombe, puis qui monte quand il s'enfonce
  if (ue > 0 && bsR() < dt * 9) bsPuff(gp.x + bsH(-1, 1) * s * .5, .3, gp.z - s * .7 + bsH(-1, 1) * s * .4, bsH(-.5, .5), bsH(.3, .9), bsH(-.5, .5), 2, s * .25, s * .6, P.terre, .45, 0);
  if (P.braise && t < M.fin - 1 && bsR() < dt * 6) bsPuff(gp.x + bsH(-1, 1) * s * .4, s * .4, gp.z + bsH(-1, 1) * s * .4, bsH(-.4, .4), bsH(1.5, 3), 0, 1.5, .25, .1, 0xff8a30, 1, -.3, .2);
}
function bsMortImpact(M){
  M.imp = true; BS.n.chutes++;
  const z = M.z, P = M.P, s = bsEchelle(z), gp = z.g.position;
  const dz = -1, dx = P.mort === 'cote' ? M.sg * .5 : 0;
  const cx = gp.x + dx * s * .9, cz = gp.z + dz * s * .9;
  // Anneau de poussière qui s'étale au ras du sol
  const n = M.z.bs && M.z.bs.court ? 12 : 20;
  for (let i = 0; i < n; i++){
    const a = i / n * 6.283 + bsR() * .2, c = Math.cos(a), sn = Math.sin(a);
    bsPuff(cx + c * s * .4, .4, cz + sn * s * .4, c * bsH(6, 9), bsH(.3, 1), sn * bsH(6, 9), bsH(1.8, 2.6), s * .25, s * .8, P.terre, .6, 0, 1.1);
  }
  bsGerbe(cx, s * .3, cz, 8, s * .5, 1.5, 2.5, 2.8, s * .3, s * .9, P.terre, .5, 0);
  if (P.gerbe === 'mottes' || P.gerbe === 'beton') bsGerbe(cx, .6, cz, 8, s * .4, 5, 6, 1.3, .4, .6, P.gerbe === 'beton' ? 0x77736c : P.terre, .95, 14);
  if (P.braise) bsGerbe(cx, s * .4, cz, 10, s * .4, 2, 5, 1.8, .3, .12, 0xff8a30, 1, -.4);
  if (P.gerbe === 'vapeur') bsGerbe(cx, s * .3, cz, 8, s * .6, 1, 1, 3, s * .4, s * 1, 0xb8c4cc, .3, -.2);
  const d = bsLoin(cx, cz), kd = Math.max(.25, Math.min(1, 1 - (d - 12) / 80));
  bsSecoue(BS_REGL.mort.secousse * kd * (P.mort === 'lent' ? 1.4 : 1));
  bsSon('chute', P, kd, cx);
}

/* ---------- Chaque image ---------- */
const bsVivants = [];
function bsCacher(){
  BSH.s.visible = false; BS.halo.z = null;
  BSP.L.forEach(p => { p.on = false; }); bsPuffMaj(0);
  BSO.L.forEach(o => { o.on = false; }); BSO.im.count = 0; BSO.im.visible = false;
  while (BS.morts.length) bsMortFin(BS.morts[0]);
  if (BS.lampes.size || BS.eteintes.length) bsLampesRemettre();
  bsHudFin();
  for (let i = 0; i < zombies.length; i++){ const z = zombies[i]; if (z.bs && z.bs.glow && !z.dead) z.bs.glow.color.setHex(z.bs.glowHex); }
  BS.actif = false;
}
function bsImage(dt){
  if (!BS_REGL.on || !bsToit() || typeof S !== 'object' || !S){ if (BS.actif) bsCacher(); return; }
  BS.actif = true; BS.n.rendus++;
  const pause = state === 'paused', k = typeof PK === 'object' && PK.ts > 0 ? PK.ts : 1, dv = pause ? 0 : dt * k;
  if (S !== BS.S){ BS.S = S; BS.vus = 0; }
  bsVivants.length = 0;
  for (let i = 0; i < zombies.length; i++){
    const z = zombies[i]; if (z.type !== 'boss') continue;
    if (!z.bs && !z.dead) bsNouveau(z);
    if (z.bs && !z.bs.skip && !z.dead){ bsVivants.push(z); if (!pause) bsPresence(z, dv); }
  }
  for (let i = BS.morts.length - 1; i >= 0; i--){
    const M = BS.morts[i];
    if (M.monde !== world || M.S !== S || S.wave !== M.wave) bsMortFin(M);
    else bsMortStep(M, dv);
  }
  bsHaloStep(dv);
  bsPuffStep(dv);
  bsOiseauxStep(dv);
  bsLampesStep(dv, bsVivants);
  bsHudStep(dt, bsVivants[0] || null);
  if (bsButinT > 0){ bsButinT -= dt; if (bsButinT <= 0){ const b = $('banner'); if (b) b.classList.remove('bsButin'); } }
}
// Sonde des tests (BS.sonde = { n:0, diff:0, appels:0, etat:fn }) : compte les tirages de Math.random faits pendant ce
// fichier et vérifie que l'état du jeu (etat() : positions, vies, argent...) est le même avant et après
function bsSonde(f){
  const O = BS.sonde; if (!O){ f(); return; }
  const R = Math.random, h0 = O.etat ? O.etat() : 0;
  Math.random = function(){ O.n++; return R.apply(this, arguments); };
  try { f(); } finally { Math.random = R; O.appels++; if (O.etat && O.etat() !== h0) O.diff++; }
}
Jeu.on('image', dt => bsSonde(() => { try { bsImage(dt || 0); } catch (e) { errNote(e); } }));
Jeu.on('tue', (z, was) => bsSonde(() => {
  try { if (BS_REGL.on && was && z && z.type === 'boss' && z.bs && !z.bs.skip && bsToit()) bsMortDebut(z); } catch (e) { errNote(e); }
}));

// Accès pour les tests automatiques
window.__bossScene = { BS, BS_REGL, bsSonde, BSP, BSO, BSH, bsR, bsProfil, bsImage, bsCacher, bsNouveau, bsMortDebut, bsSecoue, bsLampesRemettre };
