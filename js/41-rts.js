'use strict';
/* ================= Mode RTS : « Guerre des robots » — défense d'une base militaire dans le désert ================= */
// Vue de dessus. Ta base est au centre d'un désert parsemé de bâtiments en ruine ; des bâtiments infectés (nids)
// tout autour font sortir des zombies, et des hordes arrivent de toutes les directions.
//   Bâtiments à acheter et à placer dans la zone de la base : usines (pour fabriquer les robots), récupérateur
//   (argent régulier), atelier de réparation, barricades, et 5 tourelles (mitrailleuse, canon, lance-flammes, mortier,
//   Tesla) qu'on améliore une à une. La zone de la base s'agrandit à chaque nid détruit.
//   Robots fabriqués dans les usines, envoyés en groupe ; améliorations par type de robot (armes, blindage, cadence).
//   Gagné quand tous les nids sont détruits ; perdu si le QG tombe.
// Mêmes zombies (spawnZombie, damage, kill : argent, XP et ferraille pour de vrai) ; menés ici (rtsZombies).
// Contrôles ordi : clic gauche (ou cadre) pour choisir, clic droit pour envoyer, ZQSD / WASD / flèches pour la vue,
//   molette pour zoomer, 1 à 4 robots, Espace tout choisir, Échap annule une construction ou met en pause.
// Cell : toucher pour choisir et envoyer, glisser pour la vue, pincer pour zoomer, onglets en bas.
// État du jeu : 'rts' (rtsStep est appelé dans visuals), 'rtsover' à la fin.

/* ---------- Données ---------- */
const RTS_UNITS = {
  rifle:   { name:'Fantassin',       cost:150,  hp:320,  dmg:26,  rate:3,   range:18, speed:6,   r:.8,  snd:'pistol', col:0x4a6fa5, beam:0xffd890, fac:'factory' },
  gunner:  { name:'Mitrailleur',     cost:400,  hp:520,  dmg:12,  rate:12,  range:16, speed:5,   r:.9,  snd:'rifle',  col:0x3d6a4a, beam:0xffd890, fac:'factory' },
  rocket:  { name:'Lance-roquettes', cost:700,  hp:420,  dmg:170, rate:.8,  range:26, speed:4.5, r:.9,  snd:'gl',     col:0x8a6a2a, splash:3.5, fac:'heavyfac' },
  heavy:   { name:'Mech lourd',      cost:1500, hp:1600, dmg:95,  rate:1.6, range:22, speed:3.6, r:1.4, snd:'laser',  col:0x6a3a6a, beam:0x50f0ff, pierce:true, fac:'heavyfac' }
};
const RTS_ORDER = ['rifle', 'gunner', 'rocket', 'heavy'];
const RTS_SC = 1.5; // échelle des robots (lisibles de haut)
// Améliorations des robots, par type (achetées pendant la partie)
const RTS_UPG = {
  arm:  { name:'Armes',    max:5, k:.18, desc:'+18 % de dégâts' },
  hp:   { name:'Blindage', max:5, k:.22, desc:'+22 % de vie' },
  rate: { name:'Cadence',  max:5, k:.1,  desc:'+10 % de cadence' },
  spd:  { name:'Moteurs',  max:3, k:.1,  desc:'+10 % de vitesse et +6 % de portée' }
};
// Bâtiments : size = rayon d'encombrement ; turret = statistiques de tir (niveau 1)
const RTS_BLD = {
  hq:       { name:'QG',                       hp:6000, size:6,   cost:0,    fixed:true },
  factory:  { name:'Usine de robots',          hp:2000, size:4,   cost:500,  desc:'Fabrique fantassins et mitrailleurs.' },
  heavyfac: { name:'Usine lourde',             hp:2600, size:5,   cost:1200, desc:'Fabrique lance-roquettes et mechs lourds.' },
  scrap:    { name:'Récupérateur',             hp:1200, size:3,   cost:400,  income:15, desc:'+15 $ toutes les 5 s.' },
  repair:   { name:'Atelier de réparation',    hp:1500, size:3.5, cost:700,  heal:45, healR:15, desc:'Répare robots et bâtiments autour.' },
  wall:     { name:'Barricade',                hp:2500, size:2.2, cost:60,   desc:'Bloc de béton qui retient les zombies.' },
  t_mg:     { name:'Tourelle mitrailleuse',    hp:900,  size:1.8, cost:250,  turret:{ dmg:14,  rate:8,   range:20, snd:'rifle',  beam:0xffd890 }, desc:'Tir rapide.' },
  t_cannon: { name:'Tourelle canon',           hp:1300, size:2,   cost:450,  turret:{ dmg:130, rate:.9,  range:28, snd:'sniper', beam:0xffc060, pierce:true }, desc:'Obus qui traverse une file.' },
  t_flame:  { name:'Tourelle lance-flammes',   hp:1100, size:1.8, cost:400,  turret:{ dmg:16,  rate:10,  range:12, snd:'flamer', flame:true }, desc:'Brûle tout ce qui approche.' },
  t_mortar: { name:'Mortier',                  hp:900,  size:2,   cost:600,  turret:{ dmg:150, rate:.5,  range:44, snd:'gl',     splash:5, min:8 }, desc:'Longue portée, explosions.' },
  t_tesla:  { name:'Tourelle Tesla',           hp:1000, size:1.8, cost:700,  turret:{ dmg:60,  rate:1.3, range:18, snd:'arc',    chain:4 }, desc:'L’éclair saute de zombie en zombie.' }
};
const RTS_BUILD_TABS = { bat:['factory', 'heavyfac', 'scrap', 'repair', 'wall'], tour:['t_mg', 't_cannon', 't_flame', 't_mortar', 't_tesla'] };
const RTS_TMAX = 6; // niveaux des tourelles
const RTS_CFG = { money:900, nests:6, nestHp:4500, hordeEvery:45, bounty:500, maxUnits:40, baseR0:24, baseRStep:9, mapR:132 };
const RTS = { on:false, paused:false, units:[], nests:[], blds:[], base:null, sel:[], bsel:null, place:null, tab:'rob', upg:{}, t:0, kills:0, threat:1,
  hordeT:0, hordeN:0, lost:0, baseR:24, incT:5, cam:{ x:0, z:0, h:52 }, keys:{}, drag:null, pinch:null, sndT:0, best:+store.get('dt_rts_best', 0) || 0 };
const rtsRoot = new THREE.Group(); scene.add(rtsRoot);
const rtsMat = new THREE.MeshLambertMaterial({ vertexColors:true }); rtsMat.userData.keep = true;
const rtsRingMat = new THREE.MeshBasicMaterial({ color:0x6aff8a, transparent:true, opacity:.8, depthWrite:false, side:THREE.DoubleSide });
const rtsHpBg = new THREE.SpriteMaterial({ color:0x111111, depthTest:false, transparent:true, opacity:.7 });
const rtsHpG = new THREE.SpriteMaterial({ color:0x6aff8a, depthTest:false });
const rtsHpR = new THREE.SpriteMaterial({ color:0xff5a3a, depthTest:false });
const rtsGhostOk = new THREE.MeshBasicMaterial({ color:0x6aff8a, transparent:true, opacity:.4, depthWrite:false });
const rtsGhostNo = new THREE.MeshBasicMaterial({ color:0xff4a3a, transparent:true, opacity:.4, depthWrite:false });
const rtsV = new THREE.Vector3(), rtsV2 = new THREE.Vector3(), rtsRay = new THREE.Raycaster();
const rtsLv = (type, k) => ((RTS.upg[type] || {})[k] || 0);

/* ---------- Modèles (géométries fusionnées, gardées en cache) ---------- */
const RTS_GEO = {};
function rtsGeo(key, draw){ if (!RTS_GEO[key]){ const b = vmNew(); draw(b); RTS_GEO[key] = vmGeo(b); } return RTS_GEO[key]; }
function rtsUnitGeo(type){
  return rtsGeo('u_' + type, b => {
    const U = RTS_UNITS[type], c = U.col, k = type === 'heavy' ? 1.5 : 1;
    vmBox(b, .9 * k, .7 * k, .8 * k, c, 0, 1.55 * k, 0, 0, 0, 0, .08);
    vmBox(b, .5 * k, .3 * k, .4 * k, VC.blue, 0, 1.95 * k, .2 * k, 0, 0, 0, .05);
    vmBox(b, .52 * k, .08 * k, .05, [.6, 2.4, 3], 0, 1.98 * k, .42 * k, 0, 0, 0, 0);
    vmBox(b, .95 * k, .1 * k, .85 * k, [2.6, 1.4, .3], 0, 1.22 * k, 0, 0, 0, 0, 0);
    for (const s of [-1, 1]){
      vmBox(b, .22 * k, .75 * k, .26 * k, VC.park, s * .3 * k, .78 * k, 0, 0, 0, 0, .03);
      vmBox(b, .2 * k, .7 * k, .22 * k, VC.blue, s * .3 * k, .32 * k, .05 * k, 0, 0, 0, .03);
      vmBox(b, .3 * k, .08 * k, .45 * k, VC.park, s * .3 * k, .04, .12 * k, 0, 0, 0, 0);
    }
    if (type === 'rifle') vmBox(b, .14, .14, .9, VC.park, .55, 1.6, .35, 0, 0, 0, .02);
    else if (type === 'gunner'){ for (let i = 0; i < 4; i++) vmCyl(b, .045, .9, VC.blue, .58 + (i % 2) * .08, 1.55 + Math.floor(i / 2) * .08, .4, 0, 0, 0, 6); vmBox(b, .25, .25, .4, VC.oliveD, -.6, 1.55, 0, 0, 0, 0, .03); }
    else if (type === 'rocket'){ vmBox(b, .45, .4, .6, VC.olive, .62, 1.9, 0, 0, 0, 0, .04); for (let i = 0; i < 4; i++) vmCyl(b, .07, .05, VC.port, .52 + (i % 2) * .2, 1.82 + Math.floor(i / 2) * .16, .31, 0, 0, 0, 8); }
    else { vmCyl(b, .16, 1.6, ARS_C.whiteD, .95, 2.3, .55, 0, 0, 0, 10); for (let i = 0; i < 3; i++) vmRing(b, .2, .16, .06, ARS_C.cyan, .95, 2.3, .1 + i * .3, 0, 0, 0, 10); vmBox(b, .5, .6, .7, VC.blue, -.95, 2.3, 0, 0, 0, 0, .05); }
  });
}
const RTS_SAND = 0xc8a46a, RTS_CONC = 0x8a8478, RTS_DARK = 0x3a3630, RTS_KAKI = 0x6a6a46;
function rtsBldGeo(type){
  return rtsGeo('b_' + type, b => {
    if (type === 'hq'){
      vmBox(b, 10, 4.5, 8, RTS_KAKI, 0, 2.25, 0, 0, 0, 0, .3); vmBox(b, 6, 2.5, 5, 0x5a5d64, 0, 5.7, 0, 0, 0, 0, .2);
      vmBox(b, 10.2, .4, 8.2, [.6, 1.4, 3], 0, 4.6, 0, 0, 0, 0, 0);
      for (const s of [-1, 1]){ vmBox(b, 1.4, 6, 1.4, RTS_CONC, s * 5, 3, s * 4, 0, 0, 0, .1); vmBox(b, 1.6, .5, 1.6, RTS_DARK, s * 5, 6.2, s * 4, 0, 0, 0, 0); }
      vmCyl(b, .12, 7, 0x9a9aa0, 2, 10, 1, Math.PI / 2, 0, 0, 6); vmBox(b, .6, .6, .6, [3, .4, .3], 2, 13.4, 1, 0, 0, 0, 0);
      vmCyl(b, 1.4, .4, 0x9a9aa0, -2, 7.4, 0, Math.PI / 2, 0, 0, 12);                                      // parabole
      vmBox(b, 3, 2.6, .2, RTS_DARK, 0, 1.3, 4.05, 0, 0, 0, 0);
    } else if (type === 'factory' || type === 'heavyfac'){
      const k = type === 'heavyfac' ? 1.25 : 1;
      vmBox(b, 7 * k, 3.5 * k, 6 * k, RTS_KAKI, 0, 1.75 * k, 0, 0, 0, 0, .2);
      vmCyl(b, 3 * k, 6 * k, 0x7a7a6a, 0, 3.5 * k, 0, 0, Math.PI / 2, 0, 12, 1);                         // toit en voûte
      vmBox(b, 4 * k, 3 * k, .2, [2.6, 1.6, .3], 0, 1.5 * k, 3.05 * k, 0, 0, 0, 0);                      // grande porte jaune
      vmBox(b, 3.6 * k, 2.6 * k, .22, RTS_DARK, 0, 1.4 * k, 3.06 * k, 0, 0, 0, 0);
      vmCyl(b, .5, 3, RTS_CONC, 2.5 * k, 5.5 * k, -1.5 * k, Math.PI / 2, 0, 0, 8);                       // cheminée
      if (type === 'heavyfac'){ vmBox(b, .4, 7, .4, [2.6, 1.6, .3], -4.6, 3.5, -3, 0, 0, 0, 0); vmBox(b, 5, .4, .4, [2.6, 1.6, .3], -2.4, 7, -3, 0, 0, 0, 0); } // grue
    } else if (type === 'scrap'){
      vmBox(b, 4, 2.4, 3.6, 0x6a5a40, 0, 1.2, 0, 0, 0, 0, .15);
      for (let i = 0; i < 5; i++) vmBox(b, rand(.6, 1.2), rand(.4, .9), rand(.6, 1.2), [VC.steel, 0x7a3a2a, RTS_DARK][i % 3], rand(-2.2, 2.2), 2.6 + rand(0, .4), rand(-1.6, 1.6), rand(-.4, .4), rand(0, 3), rand(-.4, .4), .05);
      vmCyl(b, .1, 4, 0x9a9aa0, 1.5, 4, 1.2, Math.PI / 2, 0, 0, 6); vmBox(b, .4, .4, .4, [2.6, 2, .3], 1.5, 6, 1.2, 0, 0, 0, 0);
    } else if (type === 'repair'){
      vmCyl(b, 3.4, .25, RTS_CONC, 0, .12, 0, Math.PI / 2, 0, 0, 16);
      vmBox(b, 2.4, .3, .6, [.4, 2.6, .6], 0, .3, 0, 0, 0, 0, 0); vmBox(b, .6, .3, 2.4, [.4, 2.6, .6], 0, .3, 0, 0, 0, 0, 0); // croix verte
      vmBox(b, .5, 5, .5, [2.6, 1.6, .3], -2.8, 2.5, -2.4, 0, 0, 0, 0); vmBox(b, 3, .4, .4, [2.6, 1.6, .3], -1.4, 5, -2.4, 0, 0, 0, 0); // bras de levage
      vmBox(b, .3, 1.5, .3, VC.steel, 0, 4.2, -2.4, 0, 0, 0, 0);
    } else if (type === 'wall'){
      vmBox(b, 4.4, 2, 1.2, RTS_CONC, 0, 1, 0, 0, 0, 0, .1);
      for (let i = 0; i < 4; i++) vmBox(b, .5, .3, 1.22, i % 2 ? [2.6, 1.6, .3] : RTS_DARK, -1.5 + i, 1.6, 0, 0, 0, 0, 0);
    } else { // tourelles : socle (la tête tourne à part)
      vmCyl(b, 1.5, 1, RTS_CONC, 0, .5, 0, Math.PI / 2, 0, 0, 10); vmCyl(b, 1.1, .5, RTS_DARK, 0, 1.25, 0, Math.PI / 2, 0, 0, 10);
      for (let i = 0; i < 4; i++){ const a = i * Math.PI / 2 + .78; vmBox(b, .5, .6, .5, [2.6, 1.6, .3], Math.cos(a) * 1.4, .3, Math.sin(a) * 1.4, 0, 0, 0, 0); }
    }
  });
}
function rtsHeadGeo(type){
  return rtsGeo('h_' + type, b => {
    const C = { t_mg:0x4a6a3a, t_cannon:0x5a5d64, t_flame:0x8a3a20, t_mortar:0x6a6a46, t_tesla:0x3a4a7a }[type] || 0x5a5d64;
    vmBox(b, 1.6, 1, 1.6, C, 0, .5, 0, 0, 0, 0, .1);
    if (type === 't_mg'){ for (const x of [-.3, .3]) vmCyl(b, .1, 1.8, VC.blue, x, .55, 1.2, 0, 0, 0, 8); }
    else if (type === 't_cannon'){ vmCyl(b, .22, 2.6, RTS_DARK, 0, .6, 1.6, 0, 0, 0, 10); vmCyl(b, .3, .4, RTS_DARK, 0, .6, 2.8, 0, 0, 0, 10); }
    else if (type === 't_flame'){ vmCyl(b, .5, 1, VC.red, -.5, 1.2, -.2, Math.PI / 2, 0, 0, 10); vmCyl(b, .18, 1.4, VC.steel, 0, .5, 1.2, 0, 0, 0, 8); vmCyl(b, .08, .1, [3, 1.3, .3], 0, .5, 1.95, 0, 0, 0, 6); }
    else if (type === 't_mortar'){ vmCyl(b, .4, 1.6, RTS_DARK, 0, 1.2, .4, -.8, 0, 0, 10); }
    else if (type === 't_tesla'){ vmCyl(b, .12, 2.2, VC.steel, 0, 1.6, 0, Math.PI / 2, 0, 0, 8); for (let i = 0; i < 5; i++) vmRing(b, .5 - i * .06, .3 - i * .04, .14, ARS_C.copper, 0, 1.2 + i * .3, 0, Math.PI / 2, 0, 0, 12); vmCyl(b, .35, .35, ARS_C.violet, 0, 2.8, 0, 0, 0, 0, 10, .5); }
  });
}
function rtsNestGeo(){
  return rtsGeo('nest', b => {
    const flesh = 0x7a2e2e, green = [1, 2.6, .4], dark = 0x2b2b33;
    vmBox(b, 7, 6, 7, 0x6a6458, 0, 3, 0, 0, 0, 0, .2);
    for (let i = 0; i < 6; i++) vmBox(b, 1.2, 1.4, .1, dark, -2.4 + (i % 3) * 2.4, 2 + Math.floor(i / 3) * 2.4, 3.52, 0, 0, 0, 0);
    vmCyl(b, 2.6, 3, flesh, 0, 6.2, 0, Math.PI / 2, 0, 0, 10, .6);
    for (let i = 0; i < 7; i++){ const a = i / 7 * 6.28; vmBox(b, .5, 2.6, .5, flesh, Math.cos(a) * 3.4, 1.3, Math.sin(a) * 3.4, Math.sin(a) * .4, 0, Math.cos(a) * .4, .1); }
    for (let i = 0; i < 8; i++){ const a = i / 8 * 6.28; vmBox(b, .45, .45, .45, green, Math.cos(a) * 2, 7 + (i % 2) * .6, Math.sin(a) * 2, 0, 0, 0, .1); }
    vmBox(b, 3, 2.2, .2, [2, .5, .2], 0, 1.1, 3.55, 0, 0, 0, 0);
  });
}
function rtsHpBar(parent, y, w){
  const bg = new THREE.Sprite(rtsHpBg), fg = new THREE.Sprite(rtsHpG);
  bg.scale.set(w, .22 * (w / 1.6), 1); fg.scale.set(w, .16 * (w / 1.6), 1); bg.position.y = fg.position.y = y; fg.renderOrder = bg.renderOrder + 1;
  parent.add(bg); parent.add(fg); return { bg, fg, w };
}
function rtsHpSet(h, k){ k = clamp(k, 0, 1); h.fg.scale.x = h.w * k; h.fg.position.x = -h.w * (1 - k) / 2; h.fg.material = k < .35 ? rtsHpR : rtsHpG; }

/* ---------- Le désert (remplace la ville le temps de la partie) ---------- */
function rtsDesert(){
  disposeWorld(); fires.length = 0;
  world = new THREE.Group(); scene.add(world);
  const fogC = 0xc8a878;
  scene.fog.color.setHex(fogC); scene.background.setHex(fogC); scene.fog.near = 150; scene.fog.far = 340; // vue de haut : la brume reste au loin
  world.add(new THREE.HemisphereLight(0xffe8c8, 0x6a5030, .55));
  const sun = new THREE.DirectionalLight(0xffd8a0, .65); sun.position.set(-60, 80, 40); world.add(sun);
  world.add(new THREE.AmbientLight(0x503820, .2));
  const skyTex = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); [[0, '#3a6aa8'], [.35, '#7aa4cc'], [.47, '#e8d4a8'], [.5, '#f0d8a0'], [.53, '#d8b888'], [1, '#a88a5a']].forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  world.add(new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), new THREE.MeshBasicMaterial({ map:skyTex, side:THREE.BackSide, fog:false, depthWrite:false })));
  const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0xfff2d0, fog:false, depthWrite:false, blending:THREE.AdditiveBlending }));
  sunSpr.position.set(-90, 60, -250); sunSpr.scale.set(60, 60, 1); world.add(sunSpr);
  // Sable : petites ondulations et teintes qui varient (couleurs par sommet)
  const gg = new THREE.PlaneGeometry(420, 420, 70, 70); gg.rotateX(-Math.PI / 2);
  const pos = gg.attributes.position, col = new Float32Array(pos.count * 3), c1 = new THREE.Color(0xb08a52), c2 = new THREE.Color(0x8e6c3e), cc = new THREE.Color();
  for (let i = 0; i < pos.count; i++){
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
    const dune = Math.sin(x * .05) * Math.cos(z * .043) * (r > 150 ? 6 : .25) + Math.sin((x + z) * .11) * .15;
    pos.setY(i, r > 150 ? Math.max(0, dune) * ((r - 150) / 40) : dune * .5);
    cc.copy(c1).lerp(c2, .5 + .5 * Math.sin(x * .07 + z * .05)); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
  }
  gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); gg.computeVertexNormals();
  world.add(new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ vertexColors:true })));
  // Bâtiments en ruine, rochers, épaves (une seule géométrie fusionnée)
  const b = vmNew(), nestA = RTS.nestAngles || [];
  for (let i = 0; i < 34; i++){
    const a = rand(0, 6.283), r = rand(40, 125);
    if (nestA.some(n => Math.abs(Math.atan2(Math.sin(a - n), Math.cos(a - n))) < .18)) continue;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, w = rand(5, 12), d = rand(5, 10), rot = rand(0, 3);
    vmPush(b, x, 0, z, 0, rot, 0);
    // murs cassés : hauteurs inégales
    for (let k = 0; k < 4; k++){ const h = rand(1.5, 7); vmBox(b, w / 4, h, .5, k % 2 ? RTS_CONC : 0x9a9080, -w / 2 + w / 8 + k * w / 4, h / 2, -d / 2, 0, 0, 0, .05); }
    for (let k = 0; k < 3; k++){ const h = rand(1, 5); vmBox(b, .5, h, d / 3, 0x9a9080, -w / 2, h / 2, -d / 2 + d / 6 + k * d / 3, 0, 0, 0, .05); }
    if (Math.random() < .6) for (let k = 0; k < 3; k++){ const h = rand(1, 4); vmBox(b, w / 3, h, .5, RTS_CONC, -w / 2 + w / 6 + k * w / 3, h / 2, d / 2, 0, 0, 0, .05); }
    for (let k = 0; k < 4; k++) vmBox(b, rand(.6, 1.6), rand(.4, 1), rand(.6, 1.6), 0x8a8070, rand(-w / 2, w / 2), .3, rand(-d / 2, d / 2), rand(-.4, .4), rand(0, 3), rand(-.4, .4), .05); // gravats
    for (let k = 0; k < 3; k++) vmBox(b, .08, rand(1, 3), .08, RTS_DARK, rand(-w / 2, w / 2), rand(4, 6), -d / 2, rand(-.5, .5), 0, rand(-.5, .5), 0); // fers tordus
    vmPop(b);
  }
  for (let i = 0; i < 40; i++){ const a = rand(0, 6.283), r = rand(30, 135), s = rand(.8, 3); vmBox(b, s, s * .6, s * 1.2, 0x9a7a52, Math.cos(a) * r, s * .25, Math.sin(a) * r, rand(-.3, .3), rand(0, 3), rand(-.3, .3), s * .2); } // rochers
  const wrecks = [];
  for (let i = 0; i < 7; i++){ // épaves de blindés
    const a = rand(0, 6.283), r = rand(32, 110), x = Math.cos(a) * r, z = Math.sin(a) * r;
    vmPush(b, x, 0, z, 0, rand(0, 3), .15);
    vmBox(b, 3.4, 1.2, 6, 0x4a4a36, 0, .9, 0, 0, 0, 0, .15); vmBox(b, 2, .9, 2.4, 0x3a3a2a, 0, 1.9, -.4, 0, 0, 0, .1); vmCyl(b, .15, 3, RTS_DARK, 0, 1.9, 1.8, 0, 0, 0, 6);
    for (const s of [-1, 1]) vmBox(b, .6, .9, 6.2, RTS_DARK, s * 1.8, .45, 0, 0, 0, 0, .05);
    vmPop(b);
    wrecks.push([x, z]);
  }
  world.add(new THREE.Mesh(vmGeo(b), rtsMat));
  wrecks.slice(0, 4).forEach(w => makeFire(w[0], 1.6, w[1], 1.1));
  // Dalle de la base et limite (jaune) : grandissent quand on détruit des nids
  RTS.pad = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshLambertMaterial({ color:0x8a867c })); RTS.pad.rotation.x = -Math.PI / 2; RTS.pad.position.y = .04; world.add(RTS.pad);
  RTS.edge = new THREE.Mesh(new THREE.RingGeometry(.97, 1, 64), new THREE.MeshBasicMaterial({ color:0xffd040, transparent:true, opacity:.7, side:THREE.DoubleSide, depthWrite:false })); RTS.edge.rotation.x = -Math.PI / 2; RTS.edge.position.y = .07; world.add(RTS.edge);
  try { if (typeof ambReset === 'function') ambReset(); if (typeof __amb === 'object') __amb.set(pick(['clair', 'clair', 'vent', 'coucher', 'poussiere', 'nuitClaire', 'canicule'])); } catch (e) {}
  try { if (typeof gfxPlaceDebris === 'function') gfxPlaceDebris(); if (typeof gfxPlaceHalos === 'function') gfxPlaceHalos(); } catch (e) {}
}
function rtsBaseSize(){ if (!RTS.pad) return; RTS.pad.scale.set(RTS.baseR, RTS.baseR, 1); RTS.edge.scale.set(RTS.baseR, RTS.baseR, 1); }

/* ---------- Unités, bâtiments, nids ---------- */
const rtsStat = (u, k) => {
  const U = u.U, t = u.type;
  if (k === 'dmg') return U.dmg * (1 + RTS_UPG.arm.k * rtsLv(t, 'arm'));
  if (k === 'hp') return U.hp * (1 + RTS_UPG.hp.k * rtsLv(t, 'hp'));
  if (k === 'rate') return U.rate * (1 + RTS_UPG.rate.k * rtsLv(t, 'rate'));
  if (k === 'speed') return U.speed * (1 + RTS_UPG.spd.k * rtsLv(t, 'spd'));
  if (k === 'range') return U.range * (1 + .06 * rtsLv(t, 'spd'));
  return U[k];
};
function rtsSpawnUnit(type, x, z){
  const U = RTS_UNITS[type], g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(RTS_SC); rtsRoot.add(g);
  const m = new THREE.Mesh(rtsUnitGeo(type), rtsMat); g.add(m);
  const ring = new THREE.Mesh(new THREE.RingGeometry(U.r * 1.3, U.r * 1.6, 20), rtsRingMat); ring.rotation.x = -Math.PI / 2; ring.position.y = .06; ring.visible = false; g.add(ring);
  const hp = rtsHpBar(g, type === 'heavy' ? 4.4 : 3, type === 'heavy' ? 2.2 : 1.6);
  const u = { type, U, g, m, ring, hpb:hp, hp:0, maxHp:0, tx:x, tz:z, cmd:'idle', nest:null, tgt:null, cd:rand(0, .5), scanT:0, step:0, dead:false, r:U.r * RTS_SC };
  u.maxHp = u.hp = rtsStat(u, 'hp');
  m.userData.rtsUnit = u; RTS.units.push(u); rtsHpSet(hp, 1);
  return u;
}
function rtsPlaceBld(type, x, z, free){
  const B = RTS_BLD[type], g = new THREE.Group(); g.position.set(x, 0, z); rtsRoot.add(g);
  const m = new THREE.Mesh(rtsBldGeo(type), rtsMat); g.add(m);
  let head = null; if (B.turret){ head = new THREE.Mesh(rtsHeadGeo(type), rtsMat); head.position.y = 1.5; g.add(head); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(B.size + .3, B.size + .7, 32), rtsRingMat); ring.rotation.x = -Math.PI / 2; ring.position.y = .1; ring.visible = false; g.add(ring);
  const hpb = rtsHpBar(g, type === 'hq' ? 15 : B.turret ? 4.2 : 7, Math.max(2.2, B.size * 1.2));
  const o = { type, B, g, m, head, ring, hpb, hp:B.hp, maxHp:B.hp, x, z, r:B.size, lv:1, cd:rand(0, .5), tgt:null, scanT:0, spent:free ? 0 : B.cost, dead:false };
  m.userData.rtsBld = o; if (head) head.userData.rtsBld = o;
  RTS.blds.push(o); rtsHpSet(hpb, 1);
  if (type === 'hq') RTS.base = o;
  return o;
}
function rtsBldOk(type, x, z){
  const B = RTS_BLD[type]; if (!B) return 'Bâtiment inconnu';
  if (Math.hypot(x, z) + B.size > RTS.baseR) return 'Hors de la base : détruis des nids pour l’agrandir';
  for (const o of RTS.blds) if (!o.dead && Math.hypot(o.x - x, o.z - z) < o.r + B.size + .5) return 'Trop près d’un autre bâtiment';
  return '';
}
function rtsBuild(type, x, z){
  const B = RTS_BLD[type]; if (!B || B.fixed) return null;
  if (S.money < B.cost){ if (typeof toast === 'function') toast('Pas assez d’argent : ' + B.name + ' (' + fmt(B.cost) + ')'); return null; }
  const why = rtsBldOk(type, x, z); if (why){ if (typeof toast === 'function') toast(why); return null; }
  S.money -= B.cost;
  const o = rtsPlaceBld(type, x, z);
  rtsV.set(x, .5, z); burst(rtsV, 'dust', 12, 3);
  if (typeof Snd === 'object' && Snd.buy) Snd.buy();
  return o;
}
function rtsFactoryFor(type){
  const need = RTS_UNITS[type].fac; let best = null, n = 1e9;
  for (const o of RTS.blds) if (!o.dead && o.type === need){ const q = o.queue || 0; if (q < n){ n = q; best = o; } }
  return best;
}
function rtsBuy(type){
  const U = RTS_UNITS[type]; if (!U || !RTS.on || state !== 'rts') return null;
  const f = rtsFactoryFor(type);
  if (!f){ if (typeof toast === 'function') toast('Construis d’abord ' + (U.fac === 'heavyfac' ? 'une Usine lourde' : 'une Usine de robots')); return null; }
  if (S.money < U.cost){ if (typeof toast === 'function') toast('Pas assez d’argent pour un ' + U.name + ' (' + fmt(U.cost) + ')'); return null; }
  if (RTS.units.filter(u => !u.dead).length >= RTS_CFG.maxUnits){ if (typeof toast === 'function') toast('Garage plein : ' + RTS_CFG.maxUnits + ' robots au plus'); return null; }
  S.money -= U.cost;
  const a = Math.atan2(-f.z, -f.x) + rand(-.4, .4), out = f.r + 2.5;          // il sort de l'usine côté centre
  const u = rtsSpawnUnit(type, f.x + Math.cos(a) * out, f.z + Math.sin(a) * out);
  u.tx = f.x + Math.cos(a) * (out + 3); u.tz = f.z + Math.sin(a) * (out + 3); u.cmd = 'move';
  if (typeof Snd === 'object' && Snd.buy) Snd.buy();
  return u;
}
function rtsUpgBuy(type, k){
  const U = RTS_UPG[k], C = RTS_UNITS[type]; if (!U || !C) return false;
  const l = rtsLv(type, k), cost = Math.round(C.cost * .8 * Math.pow(1.6, l));
  if (l >= U.max || S.money < cost) return false;
  S.money -= cost; RTS.upg[type] = RTS.upg[type] || {}; RTS.upg[type][k] = l + 1;
  if (k === 'hp') RTS.units.forEach(u => { if (u.type === type && !u.dead){ const k2 = rtsStat(u, 'hp') / u.maxHp; u.maxHp *= k2; u.hp *= k2; rtsHpSet(u.hpb, u.hp / u.maxHp); } });
  if (typeof Snd === 'object' && Snd.buy) Snd.buy();
  return true;
}
const rtsUpgCost = (type, k) => Math.round(RTS_UNITS[type].cost * .8 * Math.pow(1.6, rtsLv(type, k)));
// Tourelles : améliorer et vendre
const rtsTCost = o => Math.round(o.B.cost * .6 * Math.pow(1.5, o.lv - 1));
const rtsTStat = (o, k) => { const T = o.B.turret, l = o.lv - 1; return k === 'dmg' ? T.dmg * (1 + .3 * l) : k === 'rate' ? T.rate * (1 + .1 * l) : k === 'range' ? T.range * (1 + .06 * l) : T[k]; };
function rtsTurretUp(o){
  if (!o || !o.B.turret || o.dead || o.lv >= RTS_TMAX) return false;
  const c = rtsTCost(o); if (S.money < c) return false;
  S.money -= c; o.spent += c; o.lv++; o.maxHp *= 1.15; o.hp = o.maxHp; rtsHpSet(o.hpb, 1);
  o.head.scale.setScalar(1 + .07 * (o.lv - 1));
  if (typeof Snd === 'object' && Snd.buy) Snd.buy();
  return true;
}
function rtsSell(o){
  if (!o || o.dead || o.B.fixed) return false;
  S.money += Math.round(o.spent * .5); rtsBldDie(o, true);
  return true;
}
function rtsMakeNests(){
  const n = RTS_CFG.nests, a0 = rand(0, 6.283);
  RTS.nestAngles = [];
  for (let i = 0; i < n; i++){
    const a = a0 + i / n * Math.PI * 2 + rand(-.2, .2), r = 70 + (i % 3) * 18 + rand(0, 10);
    RTS.nestAngles.push(a);
    const x = Math.cos(a) * r, z = Math.sin(a) * r, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); rtsRoot.add(g);
    const m = new THREE.Mesh(rtsNestGeo(), rtsMat); g.add(m);
    const hp = rtsHpBar(g, 10.5, 6), mx = RTS_CFG.nestHp * (1 + .3 * i);
    const o = { g, m, hpb:hp, hp:mx, maxHp:mx, x, z, r:4.5, spawnT:rand(3, 7), dead:false, idx:i };
    m.userData.rtsNest = o; RTS.nests.push(o);
  }
}

/* ---------- Démarrer, quitter ---------- */
function rtsClearAll(){
  while (rtsRoot.children.length) rtsRoot.remove(rtsRoot.children[0]);
  RTS.units.length = 0; RTS.nests.length = 0; RTS.blds.length = 0; RTS.sel.length = 0; RTS.bsel = null; RTS.base = null; rtsCancelPlace();
}
function rtsStart(){
  if (typeof Snd === 'object') Snd.init();
  if (typeof infLeave === 'function') try { infLeave(); } catch (e) {}
  newGame(); clearZombies(); rtsClearAll();
  curLoc = LOCS[0];
  Object.assign(RTS, { on:true, paused:false, t:0, kills:0, threat:1, hordeT:RTS_CFG.hordeEvery, hordeN:0, lost:0, upg:{}, baseR:RTS_CFG.baseR0, incT:5, tab:'rob', xp0:P.xp || 0, scr0:P.scrap || 0 });
  rtsMakeNests(); rtsDesert(); rtsBaseSize();
  S.money = RTS_CFG.money; S.wave = 1;
  RTS.cam.x = 0; RTS.cam.z = 4; RTS.cam.h = isTouch ? 60 : 52;
  plan = { queue:[], total:0, hpMult:1, spdMult:1, dmgMult:1, cashMult:1.6, xp:1.5, maxAlive:isTouch ? 130 : 220, interval:1 };
  rtsPlaceBld('hq', 0, 0, true);
  rtsPlaceBld('factory', -10, 8, true);
  rtsPlaceBld('t_mg', 9, -9, true); rtsPlaceBld('t_mg', -9, -10, true); rtsPlaceBld('t_mg', 10, 10, true);
  for (let i = 0; i < 3; i++){ const u = rtsSpawnUnit('rifle', -3 + i * 3, 10); u.tx = -3 + i * 3; u.tz = 13; u.cmd = 'move'; }
  state = 'rts';
  showScreen(null); rtsPanel.classList.add('hide');
  $('hud').classList.add('hide'); $('touch').classList.add('hide'); $('cross').classList.add('hide');
  document.body.classList.add('rts');
  rtsUI.classList.remove('hide'); rtsUI.classList.toggle('touch', isTouch); rtsTab('rob');
  if (typeof unlockPointer === 'function') unlockPointer();
  banner('Base militaire assiégée', 'Détruis les ' + RTS.nests.length + ' bâtiments infectés autour de la base', 2800);
}
function rtsQuit(){
  RTS.on = false; RTS.paused = false;
  rtsUI.classList.add('hide'); rtsPanel.classList.add('hide'); rtsBox.style.display = 'none'; rtsInfo.classList.add('hide');
  document.body.classList.remove('rts');
  rtsClearAll(); clearZombies(); RTS.pad = RTS.edge = null;
  camera.position.copy(EYE); camera.rotation.set(0, 0, 0); camera.rotation.order = 'YXZ';
  state = 'menu'; curLoc = LOCS[0]; buildWorld(curLoc); newGame(); plan = wavePlan(1);
  if (typeof saveP === 'function') saveP();
  showScreen('scrTitle'); $('hud').classList.add('hide');
}
function rtsEnd(won){
  if (state === 'rtsover') return;
  state = 'rtsover'; RTS.paused = false; rtsCancelPlace();
  const min = Math.floor(RTS.t / 60), sec = Math.floor(RTS.t % 60);
  if (won){
    P.scrap = (P.scrap || 0) + 400; addXP(250);
    if (!RTS.best || RTS.t < RTS.best){ RTS.best = Math.round(RTS.t); store.set('dt_rts_best', RTS.best); }
    if (typeof Snd === 'object' && Snd.musFanfare) Snd.musFanfare();
  } else if (typeof Snd === 'object' && Snd.boom) Snd.boom(2.2);
  if (typeof saveP === 'function') saveP();
  const xp = Math.max(0, Math.round((P.xp || 0) - RTS.xp0)), scr = Math.max(0, Math.round((P.scrap || 0) - RTS.scr0));
  setTimeout(() => rtsShowPanel('<h2 class="title sm">' + (won ? 'Base libérée !' : 'Le QG est tombé') + '</h2><div class="stats">'
    + '<span>Nids détruits : <strong>' + RTS.nests.filter(n => n.dead).length + ' / ' + RTS.nests.length + '</strong></span>'
    + '<span>Temps : <strong>' + min + ' min ' + String(sec).padStart(2, '0') + ' s</strong>' + (won && RTS.best ? ' · record : ' + Math.floor(RTS.best / 60) + ' min ' + String(RTS.best % 60).padStart(2, '0') + ' s' : '') + '</span>'
    + '<span>Zombies abattus : <strong>' + fmtN(RTS.kills) + '</strong> · Robots perdus : <strong>' + RTS.lost + '</strong></span>'
    + '<span>Expérience : <strong>+' + fmtN(xp) + '</strong> · Ferraille : <strong>+' + fmtN(scr) + ' ⚙</strong>' + (won ? ' (dont 400 de prime)' : '') + '</span></div>',
    [['Rejouer', rtsStart], ['Menu', rtsQuit]]), 1000);
}
function rtsPause(){
  if (state !== 'rts' || RTS.paused) return;
  RTS.paused = true;
  rtsShowPanel('<h2 class="title sm">Pause</h2><p class="lead">Menace ' + RTS.threat.toFixed(1).replace('.', ',') + ' · ' + fmtN(RTS.kills) + ' zombies abattus</p>',
    [['Reprendre', () => { RTS.paused = false; rtsPanel.classList.add('hide'); }], ['Abandonner', rtsQuit]]);
}

/* ---------- Chaque image ---------- */
const RTS_SPAWN = [['walker', 0], ['runner', 1.2], ['crawler', 1.4], ['spider', 2], ['bloater', 2.2], ['brute', 2.6], ['stalker', 3], ['shield', 3.4], ['spitter', 1.8], ['abomination', 4.2]];
function rtsPickType(){
  const ok = RTS_SPAWN.filter(e => RTS.threat >= e[1] && ZTYPES[e[0]]);
  return Math.random() < .45 ? 'walker' : ok[Math.floor(Math.random() * ok.length)][0];
}
function rtsSpawnAt(x, z, n, spread){
  let alive = zAliveCount(), k = 0; spread = spread || 3;
  for (let i = 0; i < n && alive < plan.maxAlive; i++){
    const t = rtsPickType(), zz = spawnZombie(t); if (!zz) continue;
    zz.g.position.set(x + rand(-spread, spread), zz.g.position.y, z + rand(-spread, spread)); zz.rtsT = 0; alive++; k++;
  }
  return k;
}
function rtsThreat(){
  const killed = RTS.nests.filter(n => n.dead).length;
  RTS.threat = 1 + RTS.kills / 140 + RTS.t / 150 + killed * .45;
  plan.hpMult = 1 + .55 * (RTS.threat - 1); plan.dmgMult = 1 + .4 * (RTS.threat - 1); plan.spdMult = Math.min(1.5, 1 + .05 * (RTS.threat - 1));
}
// Cible d'un zombie : robot ou bâtiment le plus proche (à 16 m), sinon le QG
function rtsTargetOfZombie(z){
  const gp = z.g.position; let best = null, bd = 16 * 16;
  for (const u of RTS.units){ if (u.dead) continue; const dx = u.g.position.x - gp.x, dz = u.g.position.z - gp.z, d = dx * dx + dz * dz; if (d < bd){ bd = d; best = u; } }
  for (const o of RTS.blds){ if (o.dead) continue; const dx = o.x - gp.x, dz = o.z - gp.z, d = Math.max(0, Math.hypot(dx, dz) - o.r); if (d * d < bd){ bd = d * d; best = o; } }
  return best || RTS.base;
}
const rtsPos = T => (T.g && !T.B ? T.g.position : rtsV2.set(T.x, 0, T.z));
function rtsZombies(dt){
  for (let i = zombies.length - 1; i >= 0; i--){
    const z = zombies[i];
    if (z.flashT > 0) z.flashT -= dt;
    if (z.dead){
      z.deadT += dt; z.body.rotation.x = -Math.min(1, z.deadT / .45) * Math.PI / 2;
      if (z.deadT <= 1.6 && z.g.position.y > 0){ z.fallV = (z.fallV || 0) + 22 * dt; z.g.position.y = Math.max(0, z.g.position.y - z.fallV * dt); }
      if (z.deadT > 1.6) z.g.position.y -= dt * 1.2;
      if (z.deadT > 2.8){ disposeZombie(z); zombies.splice(i, 1); }
      continue;
    }
    if (z.burnT > 0){ z.burnT -= dt; z.burnTick = (z.burnTick || .25) - dt; if (z.burnTick <= 0){ z.burnTick = .25; damage(z, (z.burnDps || 20) * .25, false, z.g.position); if (z.dead) continue; } }
    z.rtsT = (z.rtsT || 0) - dt;
    if (z.rtsT <= 0 || !z.rtsTgt || z.rtsTgt.dead){ z.rtsT = rand(.3, .6); z.rtsTgt = rtsTargetOfZombie(z); }
    const T = z.rtsTgt; if (!T) continue;
    const gp = z.g.position, tp = rtsPos(T), dx = tp.x - gp.x, dz = tp.z - gp.z, d = Math.hypot(dx, dz);
    const reach = (T.r || 1) + .9 * ((ZTYPES[z.type] || {}).scale || 1);
    const fly = z.type === 'flyer' || z.type === 'gargoyle' || z.type === 'crow' || z.type === 'behemoth';
    z.g.rotation.y = Math.atan2(dx, dz);
    z.phase += dt * Math.max(2, z.speed * 3);
    const s = Math.sin(z.phase);
    if (z.legL){ z.legL.rotation.x = s * .6; z.legR.rotation.x = -s * .6; }
    if (z.armL){ z.armL.rotation.x = -1.35 + s * .2; z.armR.rotation.x = -1.35 - s * .2; }
    const R = z.rig;
    if (R && R.legs) R.legs.forEach((l, k) => { l.rotation.x = Math.sin(z.phase + k * 1.3) * .5; });
    if (R && R.wing){ const a = Math.sin(z.phase * 2.5); R.wing[0].rotation.z = -a * .7; R.wing[1].rotation.z = a * .7; }
    if (fly) gp.y += ((z.alt || 5) * .6 - gp.y) * Math.min(1, dt * 2);
    if (d > reach){ const v = z.speed * dt / d; gp.x += dx * v; gp.z += dz * v; }
    else {
      z.atkT -= dt;
      if (z.atkT <= 0){
        z.atkT = rand(.9, 1.3);
        T.hp -= z.dmg; if (T.hpb) rtsHpSet(T.hpb, T.hp / T.maxHp);
        rtsV.set(tp.x, 1.2, tp.z); burst(rtsV, 'wood', 2, 1.5);
        if (T.hp <= 0){ if (T.B) rtsBldDie(T); else rtsUnitDie(T); }
      }
    }
  }
  zFrame++;
}
function rtsUnitDie(u){
  if (u.dead) return; u.dead = true; RTS.lost++;
  rtsV.set(u.g.position.x, 1.5, u.g.position.z);
  if (typeof rueBoom === 'function') rueBoom(rtsV.x, 1.6, rtsV.z, 7);
  burst(rtsV, 'dust', 12, 4); if (typeof Snd === 'object' && Snd.boom) Snd.boom(.6);
  rtsRoot.remove(u.g); const i = RTS.sel.indexOf(u); if (i >= 0) RTS.sel.splice(i, 1);
}
function rtsBldDie(o, sold){
  if (o.dead) return; o.dead = true;
  rtsV.set(o.x, 2, o.z);
  if (!sold){ if (typeof rueBoom === 'function') rueBoom(o.x, 2.5, o.z, o.r * 4); if (typeof Snd === 'object' && Snd.boom) Snd.boom(1); burst(rtsV, 'dust', 20, 6); }
  rtsRoot.remove(o.g); if (RTS.bsel === o){ RTS.bsel = null; rtsInfoShow(); }
  if (o.type === 'hq' && state === 'rts') rtsEnd(false);
}
function rtsShotSnd(id){ if (RTS.sndT > 0 || typeof Snd !== 'object') return; RTS.sndT = .07; try { Snd.shot(id); } catch (e) {} }
// Un tir : robot ou tourelle (S = statistiques), vers un zombie ou un nid
function rtsHit(from, tgt, isNest, S2){
  const to = isNest ? rtsV2.set(tgt.x, 3 + rand(-1, 2), tgt.z) : rtsV2.set(tgt.g.position.x, tgt.g.position.y + (tgt.aimY || 1.1), tgt.g.position.z);
  if (S2.beam && typeof arsBeam === 'function') arsBeam(from, to, S2.beam, S2.pierce ? .14 : .04, S2.pierce ? .12 : .05);
  if (S2.chain && typeof arsBolt === 'function') arsBolt(from, to);
  rtsShotSnd(S2.snd);
  if (isNest){
    tgt.hp -= S2.dmg * (S2.splash ? 1.6 : 1); rtsHpSet(tgt.hpb, tgt.hp / tgt.maxHp); burst(to, 'dust', 2, 2);
    if (S2.splash && typeof rueBoom === 'function') rueBoom(to.x, to.y, to.z, 6);
    if (tgt.hp <= 0) rtsNestDie(tgt);
    return;
  }
  if (S2.splash){
    const sx = to.x, sz = to.z;
    for (const z of zombies){ if (z.dead) continue; const d = Math.hypot(z.g.position.x - sx, z.g.position.z - sz); if (d < S2.splash) damage(z, S2.dmg * (1 - .5 * d / S2.splash), false, z.g.position.clone()); }
    if (typeof rueBoom === 'function') rueBoom(sx, 1.2, sz, S2.splash * 2.4);
    if (typeof Snd === 'object' && Snd.boom && Math.random() < .4) Snd.boom(.4);
  } else if (S2.pierce){
    const ax = from.x, az = from.z, bx = to.x - ax, bz = to.z - az, L2 = bx * bx + bz * bz || 1;
    for (const z of zombies){
      if (z.dead) continue; const px = z.g.position.x - ax, pz = z.g.position.z - az, t = clamp((px * bx + pz * bz) / L2, 0, 1.4);
      const qx = px - bx * t, qz = pz - bz * t; if (qx * qx + qz * qz < 1.4) damage(z, S2.dmg, false, z.g.position.clone());
    }
  } else if (S2.chain){
    let cur = tgt; const hit = [tgt]; damage(tgt, S2.dmg, false, to.clone());
    for (let k = 0; k < S2.chain; k++){
      let best = null, bd = 49;
      for (const z of zombies){ if (z.dead || hit.indexOf(z) >= 0) continue; const d = (z.g.position.x - cur.g.position.x) ** 2 + (z.g.position.z - cur.g.position.z) ** 2; if (d < bd){ bd = d; best = z; } }
      if (!best) break;
      if (typeof arsBolt === 'function') arsBolt(rtsV.set(cur.g.position.x, 1.2, cur.g.position.z), rtsV2.set(best.g.position.x, 1.2, best.g.position.z));
      damage(best, S2.dmg * .8, false, best.g.position.clone()); hit.push(best); cur = best;
    }
  } else if (S2.flame){
    for (const z of zombies){ if (z.dead) continue; const d = Math.hypot(z.g.position.x - from.x, z.g.position.z - from.z); if (d < S2.range && (z.g.position.x - from.x) * (to.x - from.x) + (z.g.position.z - from.z) * (to.z - from.z) > 0){ damage(z, S2.dmg, false, z.g.position.clone()); z.burnT = 3; z.burnDps = S2.dmg * 2; } }
    if (Math.random() < .5){ rtsV.copy(to).lerp(from, rand(0, .6)); burst(rtsV, PMATS.ember ? 'ember' : 'dust', 3, 2); }
  } else damage(tgt, S2.dmg, false, to.clone());
}
function rtsNestDie(n){
  if (n.dead) return; n.dead = true;
  const bounty = RTS_CFG.bounty + 250 * n.idx; S.money += bounty;
  rtsV.set(n.x, 4, n.z);
  if (typeof rueBoom === 'function'){ rueBoom(n.x, 4, n.z, 26); rueBoom(n.x, 8, n.z, 16); }
  burst(rtsV, 'dust', 30, 8); burst(rtsV, 'blood', 20, 6);
  if (typeof Snd === 'object' && Snd.boom) Snd.boom(2);
  shake = Math.max(shake, .6);
  n.g.scale.y = .25; n.g.position.y = -.5; n.hpb.bg.visible = n.hpb.fg.visible = false;
  RTS.baseR = Math.min(RTS_CFG.mapR - 30, RTS.baseR + RTS_CFG.baseRStep); rtsBaseSize(); // la base s'agrandit
  const left = RTS.nests.filter(x => !x.dead).length;
  banner('Nid détruit ! La base s’agrandit', '+' + fmt(bounty) + ' · ' + left + ' nid' + (left > 1 ? 's' : '') + ' restant' + (left > 1 ? 's' : ''), 2400);
  if (RTS.nests.every(x => x.dead)) rtsEnd(true);
}
function rtsUnits(dt){
  for (const u of RTS.units){
    if (u.dead) continue;
    const gp = u.g.position, rng = rtsStat(u, 'range');
    u.cd -= dt; u.scanT -= dt;
    let nest = u.nest && !u.nest.dead ? u.nest : null;
    if (u.scanT <= 0){
      u.scanT = rand(.2, .35); let best = null, bd = (rng + (u.cmd === 'idle' ? 6 : 0)) ** 2;
      for (const z of zombies){ if (z.dead) continue; const dx = z.g.position.x - gp.x, dz = z.g.position.z - gp.z, d = dx * dx + dz * dz; if (d < bd){ bd = d; best = z; } }
      u.tgt = best; u.autoNest = null;
      if (!nest && !best && u.cmd === 'idle') for (const n of RTS.nests){ if (!n.dead && Math.hypot(n.x - gp.x, n.z - gp.z) < rng + n.r){ u.autoNest = n; break; } }
    }
    nest = nest || (u.autoNest && !u.autoNest.dead ? u.autoNest : null);
    let tx = u.tx, tz = u.tz, go = u.cmd === 'move';
    if (u.nest && !u.nest.dead){ const dn = Math.hypot(u.nest.x - gp.x, u.nest.z - gp.z); if (dn > rng + u.nest.r - 2){ tx = u.nest.x; tz = u.nest.z; go = true; } else go = false; }
    else if (u.cmd === 'idle' && u.tgt){ const dz = Math.hypot(u.tgt.g.position.x - gp.x, u.tgt.g.position.z - gp.z); if (dz > rng){ tx = u.tgt.g.position.x; tz = u.tgt.g.position.z; go = true; } }
    if (go){
      const dx = tx - gp.x, dz = tz - gp.z, d = Math.hypot(dx, dz);
      if (d < .6){ if (u.cmd === 'move') u.cmd = 'idle'; }
      else { const v = Math.min(d, rtsStat(u, 'speed') * dt); gp.x += dx / d * v; gp.z += dz / d * v; u.g.rotation.y = Math.atan2(dx, dz); u.step += dt * u.U.speed * 1.6; }
    }
    for (const o of RTS.units){ if (o === u || o.dead) continue; const dx = gp.x - o.g.position.x, dz = gp.z - o.g.position.z, d = Math.hypot(dx, dz), m = u.r + o.r; if (d > 0 && d < m){ gp.x += dx / d * (m - d) * .5; gp.z += dz / d * (m - d) * .5; } }
    for (const o of RTS.blds){ if (o.dead) continue; const dx = gp.x - o.x, dz = gp.z - o.z, d = Math.hypot(dx, dz), m = u.r + o.r; if (d > 0 && d < m){ gp.x += dx / d * (m - d); gp.z += dz / d * (m - d); } } // contourne les bâtiments
    const rr = Math.hypot(gp.x, gp.z); if (rr > RTS_CFG.mapR){ gp.x *= RTS_CFG.mapR / rr; gp.z *= RTS_CFG.mapR / rr; }
    u.m.position.y = Math.abs(Math.sin(u.step * 2)) * .08; u.m.rotation.z = Math.sin(u.step) * .04;
    const tgt = u.tgt && !u.tgt.dead ? u.tgt : null;
    if (u.cd <= 0){
      const S2 = { dmg:rtsStat(u, 'dmg'), snd:u.U.snd, beam:u.U.beam, pierce:u.U.pierce, splash:u.U.splash, range:rng };
      rtsV.set(gp.x, (u.type === 'heavy' ? 3.4 : 2.2) * RTS_SC, gp.z);
      if (tgt && Math.hypot(tgt.g.position.x - gp.x, tgt.g.position.z - gp.z) <= rng){ u.cd = 1 / rtsStat(u, 'rate'); u.g.rotation.y = Math.atan2(tgt.g.position.x - gp.x, tgt.g.position.z - gp.z); rtsHit(rtsV.clone(), tgt, false, S2); }
      else if (nest && Math.hypot(nest.x - gp.x, nest.z - gp.z) <= rng + nest.r){ u.cd = 1 / rtsStat(u, 'rate'); u.g.rotation.y = Math.atan2(nest.x - gp.x, nest.z - gp.z); rtsHit(rtsV.clone(), nest, true, S2); }
    }
    u.ring.visible = RTS.sel.indexOf(u) >= 0;
  }
}
function rtsBuildings(dt){
  for (const o of RTS.blds){
    if (o.dead) continue;
    o.ring.visible = RTS.bsel === o;
    const B = o.B;
    if (B.turret){
      o.cd -= dt; o.scanT -= dt;
      const rng = rtsTStat(o, 'range'), mn = B.turret.min || 0;
      if (o.scanT <= 0){ o.scanT = rand(.15, .3); let best = null, bd = rng * rng; for (const z of zombies){ if (z.dead) continue; const d = (z.g.position.x - o.x) ** 2 + (z.g.position.z - o.z) ** 2; if (d < bd && d > mn * mn){ bd = d; best = z; } } o.tgt = best; }
      const t = o.tgt && !o.tgt.dead ? o.tgt : null;
      if (t){
        const want = Math.atan2(t.g.position.x - o.x, t.g.position.z - o.z), cur = o.head.rotation.y, df = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
        o.head.rotation.y = cur + clamp(df, -dt * 5, dt * 5);
        if (o.cd <= 0 && Math.abs(df) < .3){
          o.cd = 1 / rtsTStat(o, 'rate');
          const S2 = Object.assign({}, B.turret, { dmg:rtsTStat(o, 'dmg'), range:rng });
          rtsHit(new THREE.Vector3(o.x, 2.2, o.z), t, false, S2);
        }
      }
    } else if (B.heal){
      o.healT = (o.healT || 0) - dt;
      if (o.healT <= 0){ o.healT = .5;
        const h = B.heal * .5;
        RTS.units.forEach(u => { if (!u.dead && u.hp < u.maxHp && Math.hypot(u.g.position.x - o.x, u.g.position.z - o.z) < B.healR){ u.hp = Math.min(u.maxHp, u.hp + h); rtsHpSet(u.hpb, u.hp / u.maxHp); } });
        RTS.blds.forEach(b => { if (!b.dead && b !== o && b.hp < b.maxHp && Math.hypot(b.x - o.x, b.z - o.z) < B.healR + b.r){ b.hp = Math.min(b.maxHp, b.hp + h * 2); rtsHpSet(b.hpb, b.hp / b.maxHp); } });
      }
    }
  }
  // Récupérateurs : de l'argent régulier
  RTS.incT -= dt;
  if (RTS.incT <= 0){ RTS.incT = 5; const n = RTS.blds.filter(o => !o.dead && o.B.income).length; if (n){ const g = n * RTS_BLD.scrap.income; S.money += g; } }
}
function rtsStep(dt){
  if (!RTS.on || RTS.paused || state !== 'rts') return;
  RTS.t += dt; RTS.sndT -= dt;
  rtsThreat();
  for (const n of RTS.nests){
    if (n.dead) continue;
    n.spawnT -= dt;
    if (n.spawnT <= 0){ n.spawnT = Math.max(2.2, rand(6, 9) / Math.sqrt(RTS.threat)); const a = Math.atan2(-n.z, -n.x); rtsSpawnAt(n.x + Math.cos(a) * 6, n.z + Math.sin(a) * 6, 1 + Math.floor(RTS.threat * .8)); }
    n.m.scale.setScalar(1 + Math.sin(RTS.t * 2.2 + n.idx) * .015);
  }
  // Hordes : elles arrivent de n'importe quel côté du désert
  RTS.hordeT -= dt;
  if (RTS.hordeT <= 0){
    RTS.hordeT = RTS_CFG.hordeEvery; RTS.hordeN++;
    const a = rand(0, 6.283), r = RTS_CFG.mapR, n = rtsSpawnAt(Math.cos(a) * r, Math.sin(a) * r, 10 + Math.round(RTS.threat * 5), 8);
    const dir = ['à l’est', 'au sud-est', 'au sud', 'au sud-ouest', 'à l’ouest', 'au nord-ouest', 'au nord', 'au nord-est'][Math.round(((a + 6.283) % 6.283) / (Math.PI / 4)) % 8];
    banner('Horde n° ' + RTS.hordeN + ' !', n + ' zombies arrivent ' + dir, 2200);
    if (typeof Snd === 'object' && Snd.groan) Snd.groan();
  }
  rtsUnits(dt); rtsBuildings(dt); rtsZombies(dt);
  groanT -= dt; if (groanT <= 0){ groanT = rand(1.5, 3.5); if (zAliveCount() > 0 && typeof Snd === 'object') Snd.groan(); }
}
function rtsCamStep(dt){
  const C = RTS.cam, k = RTS.keys, sp = C.h * .9 * dt;
  C.x += ((k.r ? 1 : 0) - (k.l ? 1 : 0)) * sp; C.z += ((k.b ? 1 : 0) - (k.f ? 1 : 0)) * sp;
  C.x = clamp(C.x, -125, 125); C.z = clamp(C.z, -125, 125); C.h = clamp(C.h, 24, 95);
  camera.position.set(C.x, C.h, C.z + C.h * .38);
  camera.lookAt(C.x, 0, C.z);
}
function rtsFrame(dt){
  if (!RTS.on) return;
  if (state === 'rts' || state === 'rtsover') rtsCamStep(dt);
  Object.keys(VMS).forEach(k => { VMS[k].visible = false; });
  rtsHUD();
}

/* ---------- Affichage ---------- */
const rtsUI = document.createElement('div'); rtsUI.id = 'rtsUI'; rtsUI.className = 'hide';
rtsUI.innerHTML = '<div id="rtTop"><span id="rtMoney"></span><span id="rtThreat"></span><span id="rtNests"></span><span id="rtSel"></span></div>'
  + '<div id="rtBase"><span>QG</span><div class="mk-bar"><i id="rtBaseFill"></i></div></div>'
  + '<button id="rtPause" type="button" aria-label="Pause">❚❚</button>'
  + '<div id="rtPlace" class="hide"><span id="rtPlaceTxt"></span><button type="button" id="rtCancel">Annuler</button></div>'
  + '<div id="rtDock"><div id="rtTabs"><button type="button" data-tab="rob">Robots</button><button type="button" data-tab="bat">Bâtiments</button><button type="button" data-tab="tour">Tourelles</button><button type="button" data-tab="upg">Améliorations</button></div><div id="rtBar"></div></div>';
document.body.appendChild(rtsUI);
const rtsInfo = document.createElement('div'); rtsInfo.id = 'rtInfo'; rtsInfo.className = 'hide'; document.body.appendChild(rtsInfo);
const rtsPanel = document.createElement('div'); rtsPanel.id = 'rtsPanel'; rtsPanel.className = 'hide'; document.body.appendChild(rtsPanel);
const rtsBox = document.createElement('div'); rtsBox.id = 'rtsBox'; document.body.appendChild(rtsBox);
function rtsShowPanel(html, btns){
  rtsPanel.innerHTML = '<div class="panel">' + html + '<div class="mk-btns">' + btns.map((b, i) => '<button class="' + (i ? 'ghost' : 'big') + '" data-i="' + i + '" type="button">' + b[0] + '</button>').join('') + '</div></div>';
  rtsPanel.querySelectorAll('button[data-i]').forEach(el => el.addEventListener('click', () => { const f = btns[+el.dataset.i][1]; if (f) f(); }));
  rtsPanel.classList.remove('hide');
}
function rtsTab(t){
  RTS.tab = t;
  rtsUI.querySelectorAll('#rtTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  const bar = $('rtBar'); let h = '';
  if (t === 'rob'){
    h = RTS_ORDER.map((k, i) => '<button type="button" class="rt-buy" data-t="' + k + '">' + RTS_UNITS[k].name + '<b>' + fmt(RTS_UNITS[k].cost) + '</b>' + (isTouch ? '' : '<i>' + (i + 1) + '</i>') + '</button>').join('')
      + '<button type="button" id="rtAll">Tout choisir</button><button type="button" id="rtStop">Arrêt</button>';
  } else if (t === 'bat' || t === 'tour'){
    h = RTS_BUILD_TABS[t].map(k => '<button type="button" class="rt-bld" data-b="' + k + '">' + RTS_BLD[k].name + '<b>' + fmt(RTS_BLD[k].cost) + '</b></button>').join('');
  } else {
    h = '<button type="button" id="rtUpg">Améliorer les robots…</button>';
  }
  bar.innerHTML = h;
  bar.querySelectorAll('.rt-buy').forEach(b => b.addEventListener('click', () => rtsBuy(b.dataset.t)));
  bar.querySelectorAll('.rt-bld').forEach(b => b.addEventListener('click', () => rtsStartPlace(b.dataset.b)));
  const all = $('rtAll'); if (all) all.addEventListener('click', () => rtsSelect(RTS.units.filter(u => !u.dead), false));
  const st = $('rtStop'); if (st) st.addEventListener('click', () => { RTS.sel.forEach(u => { u.cmd = 'idle'; u.nest = null; u.tx = u.g.position.x; u.tz = u.g.position.z; }); });
  const up = $('rtUpg'); if (up) up.addEventListener('click', () => rtsUpgPanel());
  if (t === 'upg') rtsUpgPanel();
}
function rtsUpgPanel(){
  if (state !== 'rts') return;
  RTS.paused = true;
  let h = '<h2 class="title sm">Améliorer les robots</h2><p class="lead">Argent : <strong>' + fmt(Math.floor(S.money)) + '</strong> · s’applique aussi aux robots déjà construits</p><div class="mk-upg">';
  RTS_ORDER.forEach(t => {
    h += '<h4 class="wuh">' + RTS_UNITS[t].name + '</h4>';
    Object.keys(RTS_UPG).forEach(k => {
      const U = RTS_UPG[k], l = rtsLv(t, k), max = l >= U.max, c = rtsUpgCost(t, k);
      h += '<div class="row"><div class="info"><div class="nm">' + U.name + ' <span class="inf-lv">' + l + ' / ' + U.max + '</span></div><div class="ds">' + U.desc + ' par niveau</div></div>'
        + '<button type="button" data-u="' + t + ':' + k + '"' + (max || S.money < c ? ' disabled' : '') + '>' + (max ? 'Max' : fmt(c)) + '</button></div>';
    });
  });
  h += '</div>';
  rtsShowPanel(h, [['Retour au combat', () => { RTS.paused = false; rtsPanel.classList.add('hide'); rtsTab('rob'); }]]);
  rtsPanel.querySelectorAll('button[data-u]').forEach(b => b.addEventListener('click', () => { const p = b.dataset.u.split(':'); if (rtsUpgBuy(p[0], p[1])) rtsUpgPanel(); }));
}
// Fenêtre d'un bâtiment choisi : vie, niveau, améliorer, vendre, fabriquer
function rtsInfoShow(){
  const o = RTS.bsel;
  if (!o || o.dead || state !== 'rts'){ rtsInfo.classList.add('hide'); return; }
  const B = o.B; let h = '<div class="nm">' + B.name + (B.turret ? ' · niveau ' + o.lv : '') + '</div><div class="ds">' + Math.ceil(o.hp) + ' / ' + Math.ceil(o.maxHp) + ' de vie' + (B.desc ? ' · ' + B.desc : '') + '</div><div class="rt-acts">';
  if (B.turret){
    const c = rtsTCost(o);
    h += o.lv < RTS_TMAX ? '<button type="button" data-a="up">Améliorer ' + fmt(c) + '</button>' : '<button type="button" disabled>Niveau max</button>';
    h += '<div class="ds">' + Math.round(rtsTStat(o, 'dmg')) + ' dégâts · ' + rtsTStat(o, 'rate').toFixed(1).replace('.', ',') + ' tirs/s · portée ' + Math.round(rtsTStat(o, 'range')) + ' m</div>';
  }
  if (B.fixed && o.type === 'hq') h += '<div class="ds">Si le QG tombe, la partie est perdue.</div>';
  RTS_ORDER.forEach(k => { if (RTS_UNITS[k].fac === o.type) h += '<button type="button" data-a="mk:' + k + '">' + RTS_UNITS[k].name + ' ' + fmt(RTS_UNITS[k].cost) + '</button>'; });
  if (!B.fixed) h += '<button type="button" class="ghost" data-a="sell">Vendre (+' + fmt(Math.round(o.spent * .5)) + ')</button>';
  h += '</div>';
  rtsInfo.innerHTML = h; rtsInfo.classList.remove('hide');
  rtsInfo.querySelectorAll('button[data-a]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.a;
    if (a === 'up') rtsTurretUp(o); else if (a === 'sell') rtsSell(o); else if (a.indexOf('mk:') === 0) rtsBuy(a.slice(3));
    rtsInfoShow();
  }));
}
function rtsHUD(){
  if (!RTS.on || !S) return;
  const set = (id, t) => { const el = $(id); if (el && el.textContent !== t) el.textContent = t; };
  const left = RTS.nests.filter(n => !n.dead).length, alive = RTS.units.filter(u => !u.dead).length;
  set('rtMoney', '💰 ' + fmt(Math.floor(S.money)));
  set('rtThreat', '☣ Menace ' + RTS.threat.toFixed(1).replace('.', ','));
  set('rtNests', '🏚 Nids : ' + left + ' / ' + RTS.nests.length);
  set('rtSel', '🤖 ' + alive + (RTS.sel.length ? ' (' + RTS.sel.length + ' choisi' + (RTS.sel.length > 1 ? 's' : '') + ')' : ''));
  const f = $('rtBaseFill'); if (f && RTS.base) f.style.width = (clamp(RTS.base.hp / RTS.base.maxHp, 0, 1) * 100).toFixed(1) + '%';
  rtsUI.querySelectorAll('.rt-buy').forEach(b => { const off = S.money < RTS_UNITS[b.dataset.t].cost || !rtsFactoryFor(b.dataset.t); if (b.classList.contains('off') !== off) b.classList.toggle('off', off); });
  rtsUI.querySelectorAll('.rt-bld').forEach(b => { const off = S.money < RTS_BLD[b.dataset.b].cost; if (b.classList.contains('off') !== off) b.classList.toggle('off', off); });
  if (RTS.bsel && !rtsInfo.classList.contains('hide') && Math.random() < .1) rtsInfoShow(); // vie à jour de temps en temps
}

/* ---------- Construire : un fantôme suit le pointeur, on pose dans la zone de la base ---------- */
let rtsGhost = null;
function rtsStartPlace(type){
  if (state !== 'rts') return;
  const B = RTS_BLD[type]; if (S.money < B.cost){ if (typeof toast === 'function') toast('Pas assez d’argent : ' + B.name + ' (' + fmt(B.cost) + ')'); return; }
  rtsCancelPlace();
  RTS.place = type; RTS.sel.length = 0; RTS.bsel = null; rtsInfoShow();
  rtsGhost = new THREE.Mesh(rtsBldGeo(type), rtsGhostOk); rtsGhost.position.set(RTS.cam.x, .05, RTS.cam.z); scene.add(rtsGhost);
  $('rtPlaceTxt').textContent = (isTouch ? 'Touche' : 'Clique') + ' un endroit dans la zone jaune pour poser : ' + B.name;
  $('rtPlace').classList.remove('hide');
}
function rtsCancelPlace(){ RTS.place = null; if (rtsGhost){ scene.remove(rtsGhost); rtsGhost = null; } const p = $('rtPlace'); if (p) p.classList.add('hide'); }
function rtsGhostAt(x, z){ if (!rtsGhost) return; rtsGhost.position.set(x, .05, z); rtsGhost.material = rtsBldOk(RTS.place, x, z) ? rtsGhostNo : rtsGhostOk; }
function rtsPlaceAt(x, z){ const t = RTS.place; if (!t) return false; const o = rtsBuild(t, x, z); if (o){ rtsCancelPlace(); return true; } return false; }

/* ---------- Commandes ---------- */
function rtsNdc(cx, cy){ return new THREE.Vector2(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); }
function rtsPick(cx, cy){
  camera.updateMatrixWorld(); rtsRoot.updateMatrixWorld(true); rtsRay.setFromCamera(rtsNdc(cx, cy), camera);
  const meshes = []; RTS.units.forEach(u => { if (!u.dead) meshes.push(u.m); }); RTS.nests.forEach(n => { if (!n.dead) meshes.push(n.m); });
  RTS.blds.forEach(o => { if (!o.dead){ meshes.push(o.m); if (o.head) meshes.push(o.head); } });
  const h = rtsRay.intersectObjects(meshes, false)[0];
  if (h && h.object.userData.rtsUnit) return { unit:h.object.userData.rtsUnit };
  if (h && h.object.userData.rtsNest) return { nest:h.object.userData.rtsNest };
  if (h && h.object.userData.rtsBld) return { bld:h.object.userData.rtsBld, x:h.object.userData.rtsBld.x, z:h.object.userData.rtsBld.z };
  const o = rtsRay.ray.origin, d = rtsRay.ray.direction; if (d.y >= -1e-4) return {};
  const t = -o.y / d.y; return { x:o.x + d.x * t, z:o.z + d.z * t };
}
function rtsSelect(list, add){
  if (!add) RTS.sel.length = 0;
  list.forEach(u => { if (!u.dead && RTS.sel.indexOf(u) < 0) RTS.sel.push(u); });
  if (list.length){ RTS.bsel = null; rtsInfoShow(); if (typeof Snd === 'object' && Snd.tone) Snd.tone(900, .05, 'square', .04, 1200); }
}
function rtsOrder(p){
  if (!RTS.sel.length) return false;
  if (p.nest){ RTS.sel.forEach(u => { u.nest = p.nest; u.cmd = 'attack'; }); if (typeof toast === 'function') toast('Attaque du nid !'); }
  else if (p.x != null){
    const n = RTS.sel.length, cols = Math.ceil(Math.sqrt(n));
    RTS.sel.forEach((u, i) => { u.nest = null; u.cmd = 'move'; u.tx = p.x + ((i % cols) - (cols - 1) / 2) * 2.6; u.tz = p.z + (Math.floor(i / cols) - (cols - 1) / 2) * 2.6; });
    rtsMarker(p.x, p.z);
  } else return false;
  if (typeof Snd === 'object' && Snd.tone) Snd.tone(600, .06, 'triangle', .05, 800);
  return true;
}
// Un toucher ou un clic gauche simple
function rtsTap(cx, cy, add){
  const p = rtsPick(cx, cy);
  if (RTS.place){ if (p.x != null) rtsPlaceAt(p.x, p.z); return; }
  if (p.unit){ if (isTouch){ const i = RTS.sel.indexOf(p.unit); if (i >= 0) RTS.sel.splice(i, 1); else rtsSelect([p.unit], true); } else rtsSelect([p.unit], add); return; }
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
canvas.addEventListener('pointerdown', e => {
  if (state !== 'rts' || RTS.paused || e.pointerType === 'touch') return;
  if (typeof Snd === 'object') Snd.init();
  if (e.button === 2){ if (RTS.place){ rtsCancelPlace(); return; } rtsOrder(rtsPick(e.clientX, e.clientY)); return; }
  if (e.button === 0) RTS.drag = { x:e.clientX, y:e.clientY, add:e.shiftKey, box:false };
});
document.addEventListener('pointermove', e => {
  if (state !== 'rts' || e.pointerType === 'touch') return;
  if (RTS.place){ const p = rtsPick(e.clientX, e.clientY); if (p.x != null) rtsGhostAt(p.x, p.z); }
  if (!RTS.drag || RTS.place) return;
  const D = RTS.drag; if (Math.hypot(e.clientX - D.x, e.clientY - D.y) > 8) D.box = true;
  if (D.box){ const s = rtsBox.style; s.display = 'block'; s.left = Math.min(D.x, e.clientX) + 'px'; s.top = Math.min(D.y, e.clientY) + 'px'; s.width = Math.abs(e.clientX - D.x) + 'px'; s.height = Math.abs(e.clientY - D.y) + 'px'; }
});
document.addEventListener('pointerup', e => {
  if (state !== 'rts' || !RTS.drag || e.pointerType === 'touch') return;
  const D = RTS.drag; RTS.drag = null; rtsBox.style.display = 'none';
  if (D.box && !RTS.place) rtsBoxSelect(D.x, D.y, e.clientX, e.clientY, D.add);
  else rtsTap(e.clientX, e.clientY, D.add);
});
document.addEventListener('wheel', e => { if (state === 'rts') RTS.cam.h = clamp(RTS.cam.h + e.deltaY * .05, 24, 95); }, { passive:true });
const RTS_KEYS = { KeyW:'f', KeyZ:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', KeyQ:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r' };
document.addEventListener('keydown', e => {
  if (state !== 'rts') return;
  if (RTS_KEYS[e.code]){ RTS.keys[RTS_KEYS[e.code]] = 1; e.preventDefault(); }
  else if (/^Digit[1-4]$/.test(e.code)) rtsBuy(RTS_ORDER[+e.code.slice(-1) - 1]);
  else if (e.code === 'Space'){ rtsSelect(RTS.units.filter(u => !u.dead), false); e.preventDefault(); }
  else if (e.code === 'Escape' || e.code === 'KeyP'){
    if (RTS.place) rtsCancelPlace();
    else if (RTS.paused){ RTS.paused = false; rtsPanel.classList.add('hide'); }
    else rtsPause();
  }
});
document.addEventListener('keyup', e => { if (RTS_KEYS[e.code]) RTS.keys[RTS_KEYS[e.code]] = 0; });
(function(){
  const pts = new Map(); let tap = null;
  canvas.addEventListener('touchstart', e => {
    if (state !== 'rts' || RTS.paused) return;
    e.preventDefault(); if (typeof Snd === 'object') Snd.init();
    for (const t of e.changedTouches) pts.set(t.identifier, { x:t.clientX, y:t.clientY });
    if (pts.size === 1){ const t = e.changedTouches[0]; tap = { x:t.clientX, y:t.clientY, moved:false }; }
    else { tap = null; const a = [...pts.values()]; RTS.pinch = { d:Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), h:RTS.cam.h }; }
  }, { passive:false });
  canvas.addEventListener('touchmove', e => {
    if (state !== 'rts') return;
    e.preventDefault();
    for (const t of e.changedTouches){
      const p = pts.get(t.identifier); if (!p) continue;
      if (pts.size === 1){
        const dx = t.clientX - p.x, dy = t.clientY - p.y;
        if (tap && Math.hypot(t.clientX - tap.x, t.clientY - tap.y) > 12) tap.moved = true;
        if (!tap || tap.moved){ const k = RTS.cam.h / innerHeight * 1.4; RTS.cam.x -= dx * k; RTS.cam.z -= dy * k; }
      }
      p.x = t.clientX; p.y = t.clientY;
    }
    if (pts.size >= 2 && RTS.pinch){ const a = [...pts.values()]; const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); RTS.cam.h = clamp(RTS.pinch.h * RTS.pinch.d / Math.max(20, d), 24, 95); }
  }, { passive:false });
  const end = e => {
    if (state !== 'rts') return;
    for (const t of e.changedTouches) pts.delete(t.identifier);
    if (pts.size < 2) RTS.pinch = null;
    if (tap && !tap.moved && pts.size === 0 && e.changedTouches.length){ const t = e.changedTouches[0]; rtsTap(t.clientX, t.clientY, true); }
    if (pts.size === 0) tap = null;
  };
  canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
})();
rtsUI.querySelectorAll('#rtTabs button').forEach(b => b.addEventListener('click', () => rtsTab(b.dataset.tab)));
$('rtPause').addEventListener('click', () => rtsPause());
$('rtCancel').addEventListener('click', () => rtsCancelPlace());
(function(){
  const ref = $('btnMech') || $('btnStart');
  if (ref && ref.parentNode && !$('btnRts')){
    const b = document.createElement('button'); b.className = 'ghost rts-btn'; b.id = 'btnRts'; b.type = 'button'; b.textContent = '⚔ Guerre des robots (stratégie)';
    ref.parentNode.insertBefore(b, ref.nextSibling);
    b.addEventListener('click', () => rtsStart());
  }
})();

/* ---------- Crochets ---------- */
try {
  const _b = visuals;
  visuals = function(dt){
    if (state === 'rts') rtsStep(dt);
    const r = _b.apply(this, arguments);
    rtsFrame(dt);
    if (rtsMarkT > 0){ rtsMarkT -= dt; rtsMark.material.opacity = rtsMarkT / .6; if (rtsMarkT <= 0) rtsMark.visible = false; }
    return r;
  };
} catch (e) {}
try { const _k = kill; kill = function(){ const r = _k.apply(this, arguments); if (RTS.on) RTS.kills++; return r; }; } catch (e) {}
try { if (typeof ambMusicState === 'function'){ const _a = ambMusicState; ambMusicState = function(){ if (state === 'rts') return RTS.threat > 3.5 ? 'boss' : 'wave'; if (state === 'rtsover') return 'menu'; return _a.apply(this, arguments); }; } } catch (e) {}

// Accès pour les tests automatiques
window.__rts = { RTS, RTS_UNITS, RTS_CFG, RTS_BLD, RTS_UPG, rtsStart, rtsQuit, rtsBuy, rtsStep, rtsSelect, rtsOrder, rtsPick, rtsSpawnUnit, rtsSpawnAt, rtsNestDie, rtsEnd, rtsPause,
  rtsBuild, rtsBldOk, rtsPlaceBld, rtsTurretUp, rtsSell, rtsUpgBuy, rtsUpgCost, rtsStat, rtsTStat, rtsStartPlace, rtsPlaceAt, rtsTap, rtsTab, rtsInfoShow };
