'use strict';
/* ================= Mode RTS : « Guerre des robots », base militaire dans une vallée du désert ================= */
// Vue de dessus. La base est au fond d'une vallée : montagnes au sud et sur les côtés, ouverture au nord (90°).
// Les zombies arrivent du nord en suivant une vieille route d'asphalte à moitié détruite ; des nids sont plantés le long.
//   Bâtiments à placer dans la zone de la base (elle s'agrandit à chaque nid détruit) : usines de robots, usine lourde,
//   garage de blindés, héliport, aérodrome, récupérateur, atelier de réparation, barricades, 5 tourelles améliorables.
//   Unités : 6 robots, un tank, un hélicoptère, un chasseur, un bombardier et un avion d'appui (Warthog) ;
//   améliorations par type (armes, blindage, cadence, moteurs).
//   Boss avec les hordes : Titan (piétine), Mère pondeuse (pond), Béhémoth ailé (crache de l'acide).
//   Pilotage : n'importe quelle unité choisie peut être pilotée à la première personne (bouton Piloter, touche F).
//   Gagné quand tous les nids sont détruits ; perdu si le QG tombe.
// Mêmes zombies (spawnZombie, damage, kill : argent, XP et ferraille pour de vrai), menés ici (rtsZombies).
// État du jeu : 'rts' (rtsStep est appelé dans visuals), 'rtsover' à la fin.

/* ---------- Données ---------- */
// kind : 'ground' (au sol), 'heli' (vole sur place), 'air' (avion : vole en rond, ne s'arrête jamais)
const RTS_UNITS = {
  rifle:   { name:'Fantassin',       cost:150,  hp:320,  dmg:26,  rate:3,   range:18, speed:6,   r:.8,  snd:'pistol',  col:0x4a6fa5, beam:0xffd890, fac:'factory', kind:'ground', cat:'rob' },
  gunner:  { name:'Mitrailleur',     cost:400,  hp:520,  dmg:12,  rate:12,  range:16, speed:5,   r:.9,  snd:'rifle',   col:0x3d6a4a, beam:0xffd890, fac:'factory', kind:'ground', cat:'rob' },
  sniper:  { name:'Tireur d’élite',  cost:500,  hp:300,  dmg:150, rate:.6,  range:42, speed:5.5, r:.8,  snd:'sniper',  col:0x5a5a3a, beam:0xfff0c0, pierce:true, fac:'factory', kind:'ground', cat:'rob' },
  flamebot:{ name:'Robot lance-flammes', cost:450, hp:600, dmg:18, rate:9,  range:11, speed:5,   r:.9,  snd:'flamer',  col:0x8a3a20, flame:true, fac:'factory', kind:'ground', cat:'rob' },
  rocket:  { name:'Lance-roquettes', cost:700,  hp:420,  dmg:170, rate:.8,  range:26, speed:4.5, r:.9,  snd:'gl',      col:0x8a6a2a, splash:3.5, fac:'heavyfac', kind:'ground', cat:'rob' },
  heavy:   { name:'Mech lourd',      cost:1500, hp:1600, dmg:95,  rate:1.6, range:22, speed:3.6, r:1.4, snd:'laser',   col:0x6a3a6a, beam:0x50f0ff, pierce:true, fac:'heavyfac', kind:'ground', cat:'rob' },
  tank:    { name:'Tank',            cost:1800, hp:3200, dmg:240, rate:.7,  range:30, speed:5.5, r:2.2, snd:'mg50',    col:0x5a6040, splash:4, fac:'vehdepot', kind:'ground', cat:'veh' },
  heli:    { name:'Hélicoptère',     cost:2200, hp:1200, dmg:90,  rate:2.2, range:28, speed:12,  r:2.6, snd:'gl',      col:0x3a4a3a, splash:3, fac:'heliport', kind:'heli', alt:11, cat:'veh' },
  jet:     { name:'Chasseur',        cost:3000, hp:800,  dmg:280, rate:1.2, range:34, speed:32,  r:3,   snd:'rocket',  col:0x6a7080, splash:3.5, fac:'airfield', kind:'air', alt:20, orbit:30, turn:1.3, cat:'veh' },
  warthog: { name:'Warthog',         cost:3800, hp:1500, dmg:40,  rate:22,  range:30, speed:18,  r:3,   snd:'mg50',    col:0x6a7058, beam:0xffd890, fac:'airfield', kind:'air', alt:14, orbit:22, turn:1, cat:'veh' },
  mech:    { name:'⭐ Mech de combat', w1:'Minigun',  cost:6000, hp:5000, dmg:16,  rate:20,  range:26, speed:4.5, r:2.6, snd:'minigun', col:0x5a5d50, beam:0xffd890, fac:'heavyfac', kind:'ground', cat:'rob', big:true,
             w2:{ name:'Roquettes', dmg:260, rate:1.5, range:34, splash:4.5, snd:'rocket' } },
  bomber:  { name:'AC-130',          cost:4500, hp:2400, dmg:110, rate:2.5, range:62, speed:16,  r:4,   snd:'sniper',  col:0x5a6068, splash:3, gunship:true, fac:'airfield', kind:'air', alt:30, orbit:40, turn:.7, cat:'veh',
             w1:'40 mm', w2:{ name:'105 mm', dmg:650, rate:.33, range:62, splash:8, snd:'rocket' } }
};
const RTS_ORDER = Object.keys(RTS_UNITS);
const RTS_HOTKEY = ['rifle', 'gunner', 'sniper', 'flamebot', 'rocket', 'heavy', 'mech', 'tank', 'heli'];
const RTS_SC = 1.5; // échelle des robots (lisibles de haut ; le Mech de combat est déjà à sa vraie taille)
// IA : distance à laquelle l'unité recule devant un zombie (0 : elle tient sa place), laisse autour de son poste
const RTS_KITE = { rifle:6, gunner:5, sniper:14, flamebot:0, rocket:8, heavy:4, tank:0, heli:0, mech:5 };
const RTS_LEASH = 18;
const RTS_UPG = {
  arm:  { name:'Armes',    max:5, k:.18, desc:'+18 % de dégâts' },
  hp:   { name:'Blindage', max:5, k:.22, desc:'+22 % de vie' },
  rate: { name:'Cadence',  max:5, k:.1,  desc:'+10 % de cadence' },
  spd:  { name:'Moteurs',  max:3, k:.1,  desc:'+10 % de vitesse et +6 % de portée' }
};
// Améliorations propres à une unité (en plus des 4 de base)
const RTS_UPG_SPEC = {
  bomber: {
    g25:    { name:'Gatling de 25 mm',     max:3, desc:'Ajoute une gatling (rafales traçantes), plus forte à chaque niveau' },
    cal105: { name:'Obusier : rechargement', max:4, desc:'+20 % de cadence du 105 mm par niveau' },
    fire:   { name:'Obus incendiaires',    max:1, desc:'Le 105 mm met le feu aux zombies touchés' },
    sensor: { name:'Capteurs infrarouges', max:3, desc:'+15 % de portée et +10 % de zone d’explosion par niveau' }
  },
  tank: {
    coax:     { name:'Mitrailleuse coaxiale', max:3, desc:'Une mitrailleuse qui arrose les zombies proches, plus forte à chaque niveau' },
    he:       { name:'Obus explosifs',        max:3, desc:'+25 % de zone d’explosion par niveau' },
    apfsds:   { name:'Obus perforants',       max:1, desc:'L’obus traverse toute la file avant d’exploser' },
    reactive: { name:'Blindage réactif',      max:3, desc:'-15 % de dégâts reçus par niveau' }
  },
  heli: {
    chaingun: { name:'Canon de 30 mm',        max:3, desc:'Un canon rotatif sous le nez, plus fort à chaque niveau' },
    hellfire: { name:'Missiles Hellfire',     max:3, desc:'Un gros missile guidé toutes les 3 s, plus fort à chaque niveau' },
    reactive: { name:'Leurres et blindage',   max:3, desc:'-15 % de dégâts reçus par niveau' },
    sensor:   { name:'Viseur infrarouge',     max:3, desc:'+15 % de portée par niveau' }
  }
};
// Arme d'appoint achetée en amélioration (tir rapide) et missile lourd
const RTS_GUNS = { bomber:{ k:'g25', dmg:22, rate:10, snd:'minigun' }, tank:{ k:'coax', dmg:14, rate:8, snd:'rifle' }, heli:{ k:'chaingun', dmg:30, rate:6, snd:'mg50' } };
const rtsUpgDef = (type, k) => RTS_UPG[k] || (RTS_UPG_SPEC[type] || {})[k];
const RTS_BLD = {
  hq:       { name:'QG',                     hp:6000, size:6,   cost:0,    fixed:true },
  factory:  { name:'Usine de robots',        hp:2000, size:4,   cost:500,  desc:'Fantassins, mitrailleurs, tireurs d’élite, lance-flammes.' },
  heavyfac: { name:'Usine lourde',           hp:2600, size:5,   cost:1200, desc:'Lance-roquettes et mechs lourds.' },
  vehdepot: { name:'Garage de blindés',      hp:3000, size:5.5, cost:1500, desc:'Fabrique des tanks.' },
  heliport: { name:'Héliport',               hp:2000, size:5,   cost:1800, desc:'Fabrique des hélicoptères.' },
  airfield: { name:'Aérodrome',              hp:3200, size:9,   cost:3000, desc:'Chasseurs, Warthogs et bombardiers.' },
  scrap:    { name:'Récupérateur',           hp:1200, size:3,   cost:400,  income:15, desc:'+15 $ toutes les 5 s.' },
  repair:   { name:'Atelier de réparation',  hp:1500, size:3.5, cost:700,  heal:45, healR:15, desc:'Répare robots, véhicules et bâtiments autour.' },
  wall:     { name:'Barricade',              hp:2500, size:2.2, cost:60,   desc:'Bloc de béton qui retient les zombies.' },
  t_mg:     { name:'Tourelle mitrailleuse',  hp:900,  size:1.8, cost:250,  turret:{ dmg:14,  rate:8,   range:20, snd:'rifle',  beam:0xffd890 }, desc:'Tir rapide.' },
  t_cannon: { name:'Tourelle canon',         hp:1300, size:2,   cost:450,  turret:{ dmg:130, rate:.9,  range:28, snd:'sniper', beam:0xffc060, pierce:true }, desc:'Obus qui traverse une file.' },
  t_flame:  { name:'Tourelle lance-flammes', hp:1100, size:1.8, cost:400,  turret:{ dmg:16,  rate:10,  range:12, snd:'flamer', flame:true }, desc:'Brûle tout ce qui approche.' },
  t_mortar: { name:'Mortier',                hp:900,  size:2,   cost:600,  turret:{ dmg:150, rate:.5,  range:44, snd:'gl',     splash:5, min:8 }, desc:'Longue portée, explosions.' },
  t_tesla:  { name:'Tourelle Tesla',         hp:1000, size:1.8, cost:700,  turret:{ dmg:60,  rate:1.3, range:18, snd:'arc',    chain:4 }, desc:'L’éclair saute de zombie en zombie.' }
};
const RTS_BUILD_TABS = { bat:['factory', 'heavyfac', 'vehdepot', 'heliport', 'airfield', 'scrap', 'repair', 'wall'], tour:['t_mg', 't_cannon', 't_flame', 't_mortar', 't_tesla'] };
const RTS_TMAX = 6;
const RTS_CFG = { money:900, nests:6, nestHp:4500, hordeEvery:45, bounty:500, maxUnits:40, baseR0:30, baseRStep:8, bossEvery:3, bossHp:.25, maxZ:500, maxZTouch:300, chunk:100 };
// Vieille route : de la base (index 0) jusqu'au bout de la vallée, au nord
const RTS_ROAD = [[0, -8], [6, -48], [-10, -84], [-2, -124], [20, -164], [32, -204], [16, -244], [-4, -292]];
const RTS_ROAD0 = RTS_ROAD.map(p => p.slice());
// Carte sans fin : la route se prolonge vers le nord à mesure que de nouveaux nids apparaissent
function rtsRoadReset(){ RTS_ROAD.length = 0; RTS_ROAD0.forEach(p => RTS_ROAD.push(p.slice())); }
function rtsRoadTo(z){ while (RTS_ROAD[RTS_ROAD.length - 1][1] > z){ const L = RTS_ROAD[RTS_ROAD.length - 1]; RTS_ROAD.push([clamp(L[0] + rand(-16, 16), -70, 70), L[1] - 40]); } }
function rtsRoadX(z){
  rtsRoadTo(z - 40);
  for (let i = 0; i < RTS_ROAD.length - 1; i++){ const A = RTS_ROAD[i], B2 = RTS_ROAD[i + 1]; if (z <= A[1] && z >= B2[1]) return A[0] + (B2[0] - A[0]) * (A[1] - z) / (A[1] - B2[1]); }
  return RTS_ROAD[0][0];
}
const RTS_BOSS = ['titan', 'broodmother', 'behemoth'];
const RTS = { on:false, paused:false, units:[], nests:[], blds:[], base:null, sel:[], bsel:null, place:null, tab:'rob', upg:{}, t:0, kills:0, threat:1,
  hordeT:0, hordeN:0, bossN:0, bossKills:0, nestN:0, placeRot:0, ruins:[], shells:[], chunks:0, zMin:-300, spin:0, lost:0, baseR:30, incT:5, cam:{ x:0, z:-10, h:56 }, keys:{}, drag:null, pinch:null, sndT:0, pilot:null,
  pv:{ yaw:0, pitch:-.1, joy:{ id:null, dx:0, dy:0 }, aim:{ id:null, lx:0, ly:0 }, fire:false, fire2:false, mv:{ f:0, b:0, l:0, r:0 } }, best:+store.get('dt_rts_bestN', 0) || 0 };
const rtsRoot = new THREE.Group(); scene.add(rtsRoot);
const rtsMat = new THREE.MeshLambertMaterial({ vertexColors:true }); rtsMat.userData.keep = true;
const rtsRingMat = new THREE.MeshBasicMaterial({ color:0x6aff8a, transparent:true, opacity:.8, depthWrite:false, side:THREE.DoubleSide });
const rtsHpBg = new THREE.SpriteMaterial({ color:0x111111, depthTest:false, transparent:true, opacity:.7 });
const rtsHpG = new THREE.SpriteMaterial({ color:0x6aff8a, depthTest:false });
const rtsHpR = new THREE.SpriteMaterial({ color:0xff5a3a, depthTest:false });
const rtsGhostOk = new THREE.MeshBasicMaterial({ color:0x6aff8a, transparent:true, opacity:.4, depthWrite:false });
const rtsGhostNo = new THREE.MeshBasicMaterial({ color:0xff4a3a, transparent:true, opacity:.4, depthWrite:false });
const rtsV = new THREE.Vector3(), rtsV2 = new THREE.Vector3(), rtsV3 = new THREE.Vector3(), rtsRay = new THREE.Raycaster();
const rtsLv = (type, k) => ((RTS.upg[type] || {})[k] || 0);
// La vallée : fermée au sud (z > 26) et sur les côtés (elle s'élargit vers le nord, ouverture de 90°)
const rtsValleyX = z => Math.min(150, 36 + Math.max(0, -z) * .95); // 90° près de la base, puis un long couloir
function rtsClampValley(p, air){
  if (air){ p.x = clamp(p.x, -175, 175); p.z = clamp(p.z, RTS.zMin - 20, 60); return p; }
  if (p.z > 26) p.z = 26; if (p.z < RTS.zMin) p.z = RTS.zMin;
  const m = rtsValleyX(p.z) - 2; p.x = clamp(p.x, -m, m);
  return p;
}

/* ---------- Modèles (géométries fusionnées, gardées en cache) ---------- */
const RTS_GEO = {};
function rtsGeo(key, draw){ if (!RTS_GEO[key]){ const b = vmNew(); draw(b); RTS_GEO[key] = vmGeo(b); } return RTS_GEO[key]; }
const RTS_SAND = 0xc8a46a, RTS_CONC = 0x8a8478, RTS_DARK = 0x3a3630, RTS_KAKI = 0x6a6a46, RTS_Y = [2.6, 1.6, .3], RTS_GLASS = [.5, 1.5, 2.4];
function rtsUnitGeo(type){
  return rtsGeo('u_' + type, b => {
    const U = RTS_UNITS[type], c = U.col;
    if (type === 'mech'){ // le robot du mode « Robot de combat », vu de l'extérieur : minigun au bras gauche, roquettes au bras droit
      const G = c, D = VC.blue;
      for (const sd of [-1, 1]){
        vmBox(b, .9, 2.1, 1.1, G, sd * 1.15, 3.2, -.1, .15, 0, 0, .1); vmBox(b, .8, 2.3, 1, D, sd * 1.15, 1.25, .15, -.1, 0, 0, .1);
        vmBox(b, 1.3, .45, 2.1, D, sd * 1.15, .22, .35, 0, 0, 0, .08); vmCyl(b, .45, 1.2, VC.steel, sd * 1.15, 2.25, 0, 0, Math.PI / 2, 0, 10);
      }
      vmBox(b, 3, .8, 1.7, D, 0, 4.4, 0, 0, 0, 0, .1);
      vmBox(b, 3.8, 2.3, 2.8, G, 0, 5.8, 0, 0, 0, 0, .25); vmBox(b, 3.9, .3, 2.9, RTS_Y, 0, 4.85, 0, 0, 0, 0, 0);
      vmBox(b, 2.2, .75, .12, RTS_GLASS, 0, 6.3, 1.42, -.2, 0, 0, .05);                                    // verrière du cockpit
      vmBox(b, 2.6, .5, 1.6, D, 0, 7.15, -.3, 0, 0, 0, .1); vmCyl(b, .05, 1.6, VC.light, 1.1, 7.9, -.8, Math.PI / 2, 0, 0, 6);
      for (let i = 0; i < 4; i++) vmBox(b, .14, .14, .14, [3, i % 2 ? .4 : 2.2, .2], -1.5 + i, 6.95, 1.4, 0, 0, 0, 0);
      // Bras gauche : minigun à six canons
      vmBox(b, 1, 1, 1.3, G, -2.35, 6, 0, 0, 0, 0, .1); vmBox(b, .9, .9, 1.8, D, -2.35, 5.1, .6, 0, 0, 0, .08);
      for (let i = 0; i < 6; i++){ const t = i / 6 * Math.PI * 2; vmCyl(b, .08, 1.9, VC.blue, -2.35 + Math.cos(t) * .22, 5.1 + Math.sin(t) * .22, 2.4, 0, 0, 0, 6); }
      vmCyl(b, .34, .1, VC.park, -2.35, 5.1, 3.3, 0, 0, 0, 12);
      // Bras droit : nacelle de six roquettes, bande d'avertissement
      vmBox(b, 1, 1, 1.3, G, 2.35, 6, 0, 0, 0, 0, .1); vmBox(b, 1.4, 1.2, 1.9, VC.olive, 2.45, 5.3, .5, 0, 0, 0, .08);
      for (let i = 0; i < 6; i++) vmCyl(b, .16, .1, VC.port, 2.05 + (i % 3) * .4, 5.55 - Math.floor(i / 3) * .45, 1.46, 0, 0, 0, 10);
      vmBox(b, 1.42, .2, .4, [3, .6, .2], 2.45, 5.95, -.2, 0, 0, 0, 0);
      return;
    }
    if (type === 'tank'){
      vmBox(b, 2.6, .9, 4.4, c, 0, .9, 0, 0, 0, 0, .15);
      for (const s of [-1, 1]){ vmBox(b, .7, .9, 4.6, RTS_DARK, s * 1.55, .45, 0, 0, 0, 0, .1); for (let i = 0; i < 5; i++) vmCyl(b, .32, .72, 0x2a2a28, s * 1.55, .4, -1.7 + i * .85, 0, Math.PI / 2, 0, 8); }
      vmBox(b, 2.7, .12, 4.5, RTS_Y, 0, 1.36, 0, 0, 0, 0, 0);
      vmBox(b, 1.7, .7, 1.9, c, 0, 1.75, -.1, 0, 0, 0, .12); vmCyl(b, .14, 3, RTS_DARK, 0, 1.8, 2.1, 0, 0, 0, 8); vmCyl(b, .22, .4, RTS_DARK, 0, 1.8, 3.5, 0, 0, 0, 8);
      vmBox(b, .4, .3, .4, VC.steel, .5, 2.2, -.6, 0, 0, 0, .04);
      return;
    }
    if (type === 'heli'){
      vmCyl(b, .9, 3.6, c, 0, 0, .6, 0, 0, 0, 10, .7); vmBox(b, 1.4, 1, 1.2, RTS_GLASS, 0, .15, 2.1, .25, 0, 0, .2); // cabine vitrée
      vmCyl(b, .3, 4, c, 0, .2, -2.8, 0, 0, 0, 8, .5); vmBox(b, .12, 1.3, .9, c, 0, .8, -4.7, 0, 0, 0, .05); vmBox(b, 1.6, .1, .5, c, 0, .3, -4.6, 0, 0, 0, 0);
      for (const s of [-1, 1]){ vmBox(b, .12, .12, 3, RTS_DARK, s * .8, -1.05, .6, 0, 0, 0, 0); vmBox(b, .1, .7, .1, RTS_DARK, s * .8, -.7, 1.2, 0, 0, 0, 0); vmBox(b, .1, .7, .1, RTS_DARK, s * .8, -.7, -.2, 0, 0, 0, 0); }
      for (const s of [-1, 1]){ vmBox(b, 1.4, .12, .4, c, s * 1.1, -.2, .6, 0, 0, 0, 0); vmCyl(b, .2, 1.1, VC.oliveD, s * 1.7, -.35, .7, 0, 0, 0, 8); } // nacelles de roquettes
      vmBox(b, .5, .5, .5, RTS_DARK, 0, .95, .6, 0, 0, 0, .05);
      return;
    }
    if (type === 'jet'){
      vmCyl(b, .7, 8, c, 0, 0, 0, 0, 0, 0, 10, .25); vmBox(b, .8, .55, 1.6, RTS_GLASS, 0, .55, 2, 0, 0, 0, .2);
      vmBox(b, 7, .14, 3, c, 0, 0, -.8, 0, 0, 0, .05);                                                                               // ailes
      for (const s of [-1, 1]) vmBox(b, .14, 1.6, 1.4, c, s * .7, .9, -3.3, 0, 0, s * .3, .03);                                    // dérives
      vmBox(b, 2.6, .1, 1.1, c, 0, 0, -3.5, 0, 0, 0, 0);
      vmCyl(b, .5, .5, [3, 1.2, .3], 0, 0, -4.1, 0, 0, 0, 10);                                                                     // réacteur rougeoyant
      for (const s of [-1, 1]) vmCyl(b, .14, 1.6, VC.light, s * 2.4, -.2, -.6, 0, 0, 0, 6);                                        // missiles
      return;
    }
    if (type === 'warthog'){
      vmCyl(b, .75, 8.5, c, 0, 0, 0, 0, 0, 0, 10, .5); vmBox(b, .8, .55, 1.3, RTS_GLASS, 0, .6, 2.2, 0, 0, 0, .2);
      vmBox(b, 11, .2, 1.9, c, 0, -.1, .2, 0, 0, 0, .05);                                                                            // ailes droites
      for (const s of [-1, 1]){ vmCyl(b, .5, 1.8, RTS_DARK, s * 1.1, .8, -2.2, 0, 0, 0, 10); vmBox(b, .12, 1.6, 1, c, s * 1.6, .9, -4, 0, 0, 0, .03); } // réacteurs et dérives jumelles
      vmBox(b, 3.6, .12, .9, c, 0, .5, -4, 0, 0, 0, 0);
      vmCyl(b, .14, 1.2, RTS_DARK, 0, -.25, 4.6, 0, 0, 0, 8);                                                                       // canon rotatif
      for (let i = 0; i < 6; i++) vmCyl(b, .1, .5, VC.olive, -4 + i * 1.6, -.4, .4, 0, 0, 0, 6);                                    // bombes sous les ailes
      vmBox(b, .7, .05, .4, [3, .3, .2], 0, .4, 3.9, 0, 0, 0, 0);                                                                   // dents peintes
      return;
    }
    if (type === 'bomber'){ // AC-130 : avion-canonnière, aile haute, 4 hélices, canons sur le flanc gauche
      vmCyl(b, 1.35, 14, c, 0, 0, 0, 0, 0, 0, 12, .55); vmCyl(b, 1.3, 2.4, c, 0, .1, 7.6, 0, 0, 0, 12, .35);       // fuselage et nez
      vmBox(b, 1.6, .5, 1.2, RTS_GLASS, 0, .95, 7.6, .3, 0, 0, .2);                                                 // vitres du poste
      vmBox(b, 22, .3, 2.6, c, 0, 1.35, 1.2, 0, 0, 0, .08);                                                        // aile haute
      for (const sd of [-1, 1]) for (const x of [3.6, 7.2]){
        vmCyl(b, .5, 2.6, RTS_DARK, sd * x, 1, 2.4, 0, 0, 0, 10);                                                  // moteur
      }
      vmBox(b, .2, 4, 2.8, c, 0, 2.6, -7, -.15, 0, 0, .05); vmBox(b, 8, .18, 2, c, 0, .9, -7, 0, 0, 0, .04);         // dérive et stabilisateur
      // Flanc gauche : obusier de 105, canon de 40 et gatling de 25
      vmCyl(b, .2, 2, RTS_DARK, -1.8, -.3, -2, 0, Math.PI / 2, 0, 10); vmCyl(b, .3, .4, RTS_DARK, -2.7, -.3, -2, 0, Math.PI / 2, 0, 10);
      vmCyl(b, .12, 1.4, RTS_DARK, -1.7, -.4, 1, 0, Math.PI / 2, 0, 8);
      for (let i = 0; i < 5; i++) vmCyl(b, .04, 1.1, VC.blue, -1.6, -.5 + Math.sin(i * 1.26) * .1, 3.4 + Math.cos(i * 1.26) * .1, 0, Math.PI / 2, 0, 6);
      vmBox(b, 1.2, .12, 4, [.6, 2.6, .8], -1.36, .3, 0, 0, 0, Math.PI / 2, 0);                                        // capteurs
      vmBox(b, .4, .4, .4, [2.6, .5, .3], 0, -1.3, 4, 0, 0, 0, .1);                                                 // tourelle infrarouge
      return;
    }
    const k = type === 'heavy' ? 1.5 : 1;
    vmBox(b, .9 * k, .7 * k, .8 * k, c, 0, 1.55 * k, 0, 0, 0, 0, .08);
    vmBox(b, .5 * k, .3 * k, .4 * k, VC.blue, 0, 1.95 * k, .2 * k, 0, 0, 0, .05);
    vmBox(b, .52 * k, .08 * k, .05, [.6, 2.4, 3], 0, 1.98 * k, .42 * k, 0, 0, 0, 0);
    vmBox(b, .95 * k, .1 * k, .85 * k, RTS_Y, 0, 1.22 * k, 0, 0, 0, 0, 0);
    for (const s of [-1, 1]){
      vmBox(b, .22 * k, .75 * k, .26 * k, VC.park, s * .3 * k, .78 * k, 0, 0, 0, 0, .03);
      vmBox(b, .2 * k, .7 * k, .22 * k, VC.blue, s * .3 * k, .32 * k, .05 * k, 0, 0, 0, .03);
      vmBox(b, .3 * k, .08 * k, .45 * k, VC.park, s * .3 * k, .04, .12 * k, 0, 0, 0, 0);
    }
    if (type === 'rifle') vmBox(b, .14, .14, .9, VC.park, .55, 1.6, .35, 0, 0, 0, .02);
    else if (type === 'gunner'){ for (let i = 0; i < 4; i++) vmCyl(b, .045, .9, VC.blue, .58 + (i % 2) * .08, 1.55 + Math.floor(i / 2) * .08, .4, 0, 0, 0, 6); vmBox(b, .25, .25, .4, VC.oliveD, -.6, 1.55, 0, 0, 0, 0, .03); }
    else if (type === 'sniper'){ vmBox(b, .12, .12, 1.8, RTS_DARK, .55, 1.65, .8, 0, 0, 0, .02); vmCyl(b, .08, .5, VC.blue, .55, 1.82, .4, 0, 0, 0, 8); vmBox(b, .4, .2, .3, RTS_Y, 0, 2.15, -.1, 0, 0, 0, 0); }
    else if (type === 'flamebot'){ vmCyl(b, .22, .8, VC.red, -.1, 1.75, -.6, Math.PI / 2, 0, 0, 10); vmCyl(b, .1, 1, VC.steel, .55, 1.5, .5, 0, 0, 0, 8); vmCyl(b, .05, .1, [3, 1.3, .3], .55, 1.5, 1.05, 0, 0, 0, 6); }
    else if (type === 'rocket'){ vmBox(b, .45, .4, .6, VC.olive, .62, 1.9, 0, 0, 0, 0, .04); for (let i = 0; i < 4; i++) vmCyl(b, .07, .05, VC.port, .52 + (i % 2) * .2, 1.82 + Math.floor(i / 2) * .16, .31, 0, 0, 0, 8); }
    else { vmCyl(b, .16, 1.6, ARS_C.whiteD, .95, 2.3, .55, 0, 0, 0, 10); for (let i = 0; i < 3; i++) vmRing(b, .2, .16, .06, ARS_C.cyan, .95, 2.3, .1 + i * .3, 0, 0, 0, 10); vmBox(b, .5, .6, .7, VC.blue, -.95, 2.3, 0, 0, 0, 0, .05); }
  });
}
function rtsPropGeo(){ // hélice à 4 pales (AC-130), tourne sur elle-même
  return rtsGeo('prop', b => { for (let i = 0; i < 4; i++){ const a = i * Math.PI / 2; vmBox(b, .24, 1.6, .1, 0x2a2a2a, Math.sin(a) * .8, Math.cos(a) * .8, 0, 0, 0, -a, 0); } vmCyl(b, .22, .4, VC.steel, 0, 0, 0, 0, 0, 0, 8, .4); });
}
const rtsPropBlur = new THREE.MeshBasicMaterial({ color:0x9a9a9a, transparent:true, opacity:.22, depthWrite:false, side:THREE.DoubleSide });
function rtsRotorGeo(big){
  return rtsGeo(big ? 'rotorB' : 'rotor', b => { const L = big ? 9 : 2.2; vmBox(b, L, .06, .35, RTS_DARK, 0, 0, 0, 0, 0, 0, 0); vmBox(b, .35, .06, L, RTS_DARK, 0, 0, 0, 0, 0, 0, 0); });
}
function rtsBldGeo(type){
  return rtsGeo('b_' + type, b => {
    if (type === 'hq'){
      vmBox(b, 10, 4.5, 8, RTS_KAKI, 0, 2.25, 0, 0, 0, 0, .3); vmBox(b, 6, 2.5, 5, 0x5a5d64, 0, 5.7, 0, 0, 0, 0, .2);
      vmBox(b, 10.2, .4, 8.2, [.6, 1.4, 3], 0, 4.6, 0, 0, 0, 0, 0);
      for (const s of [-1, 1]){ vmBox(b, 1.4, 6, 1.4, RTS_CONC, s * 5, 3, s * 4, 0, 0, 0, .1); vmBox(b, 1.6, .5, 1.6, RTS_DARK, s * 5, 6.2, s * 4, 0, 0, 0, 0); }
      vmCyl(b, .12, 7, 0x9a9aa0, 2, 10, 1, Math.PI / 2, 0, 0, 6); vmBox(b, .6, .6, .6, [3, .4, .3], 2, 13.4, 1, 0, 0, 0, 0);
      vmCyl(b, 1.4, .4, 0x9a9aa0, -2, 7.4, 0, Math.PI / 2, 0, 0, 12);
      vmBox(b, 3, 2.6, .2, RTS_DARK, 0, 1.3, 4.05, 0, 0, 0, 0);
    } else if (type === 'factory' || type === 'heavyfac' || type === 'vehdepot'){
      const k = type === 'factory' ? 1 : type === 'heavyfac' ? 1.25 : 1.35;
      vmBox(b, 7 * k, 3.5 * k, 6 * k, type === 'vehdepot' ? 0x5a6040 : RTS_KAKI, 0, 1.75 * k, 0, 0, 0, 0, .2);
      vmCyl(b, 3 * k, 6 * k, 0x7a7a6a, 0, 3.5 * k, 0, 0, Math.PI / 2, 0, 12, 1);
      vmBox(b, 4 * k, 3 * k, .2, RTS_Y, 0, 1.5 * k, 3.05 * k, 0, 0, 0, 0);
      vmBox(b, 3.6 * k, 2.6 * k, .22, RTS_DARK, 0, 1.4 * k, 3.06 * k, 0, 0, 0, 0);
      vmCyl(b, .5, 3, RTS_CONC, 2.5 * k, 5.5 * k, -1.5 * k, Math.PI / 2, 0, 0, 8);
      if (type === 'heavyfac'){ vmBox(b, .4, 7, .4, RTS_Y, -4.6, 3.5, -3, 0, 0, 0, 0); vmBox(b, 5, .4, .4, RTS_Y, -2.4, 7, -3, 0, 0, 0, 0); }
      if (type === 'vehdepot') for (let i = 0; i < 3; i++) vmBox(b, .5, .5, 7.8, RTS_Y, -3.5 + i * 3.5, .05, 0, 0, 0, 0, 0); // rails au sol
    } else if (type === 'heliport'){
      vmCyl(b, 5, .3, RTS_CONC, 0, .15, 0, Math.PI / 2, 0, 0, 20); vmRing(b, 4.4, 4, .32, RTS_Y, 0, .16, 0, Math.PI / 2, 0, 0, 24);
      vmBox(b, .6, .32, 3.4, [2.8, 2.8, 2.6], -1.1, .17, 0, 0, 0, 0, 0); vmBox(b, .6, .32, 3.4, [2.8, 2.8, 2.6], 1.1, .17, 0, 0, 0, 0, 0); vmBox(b, 1.6, .32, .6, [2.8, 2.8, 2.6], 0, .17, 0, 0, 0, 0, 0); // H
      vmBox(b, 1.6, 6, 1.6, RTS_KAKI, 4, 3, -4, 0, 0, 0, .1); vmBox(b, 2.4, 1.4, 2.4, RTS_GLASS, 4, 6.6, -4, 0, 0, 0, .1);           // tour de contrôle
    } else if (type === 'airfield'){
      vmBox(b, 5, .12, 20, 0x3a3836, 0, .06, 0, 0, 0, 0, 0);                                                                         // piste
      for (let i = 0; i < 6; i++) vmBox(b, .4, .13, 1.6, [2.8, 2.8, 2.6], 0, .07, -8 + i * 3.2, 0, 0, 0, 0);
      vmBox(b, 6, 4, 7, RTS_KAKI, -6.5, 2, 3, 0, 0, 0, .2); vmCyl(b, 3, 7, 0x7a7a6a, -6.5, 4, 3, 0, 0, 0, 12, 1);                     // hangar
      vmBox(b, 1.4, 7, 1.4, RTS_KAKI, 5, 3.5, -6, 0, 0, 0, .1); vmBox(b, 2.4, 1.4, 2.4, RTS_GLASS, 5, 7.6, -6, 0, 0, 0, .1);
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) vmBox(b, .25, .2, .25, [3, 2.4, .5], s * 2.8, .1, -9 + i * 4.5, 0, 0, 0, 0); // balises
    } else if (type === 'scrap'){
      vmBox(b, 4, 2.4, 3.6, 0x6a5a40, 0, 1.2, 0, 0, 0, 0, .15);
      for (let i = 0; i < 5; i++) vmBox(b, .6 + (i % 3) * .3, .4 + (i % 2) * .4, .8, [VC.steel, 0x7a3a2a, RTS_DARK][i % 3], -2 + i, 2.7, (i % 2 ? 1 : -1) * .8, .2 * i, i, -.2, .05);
      vmCyl(b, .1, 4, 0x9a9aa0, 1.5, 4, 1.2, Math.PI / 2, 0, 0, 6); vmBox(b, .4, .4, .4, [2.6, 2, .3], 1.5, 6, 1.2, 0, 0, 0, 0);
    } else if (type === 'repair'){
      vmCyl(b, 3.4, .25, RTS_CONC, 0, .12, 0, Math.PI / 2, 0, 0, 16);
      vmBox(b, 2.4, .3, .6, [.4, 2.6, .6], 0, .3, 0, 0, 0, 0, 0); vmBox(b, .6, .3, 2.4, [.4, 2.6, .6], 0, .3, 0, 0, 0, 0, 0);
      vmBox(b, .5, 5, .5, RTS_Y, -2.8, 2.5, -2.4, 0, 0, 0, 0); vmBox(b, 3, .4, .4, RTS_Y, -1.4, 5, -2.4, 0, 0, 0, 0);
      vmBox(b, .3, 1.5, .3, VC.steel, 0, 4.2, -2.4, 0, 0, 0, 0);
    } else if (type === 'wall'){
      vmBox(b, 4.4, 2, 1.2, RTS_CONC, 0, 1, 0, 0, 0, 0, .1);
      for (let i = 0; i < 4; i++) vmBox(b, .5, .3, 1.22, i % 2 ? RTS_Y : RTS_DARK, -1.5 + i, 1.6, 0, 0, 0, 0, 0);
    } else {
      vmCyl(b, 1.5, 1, RTS_CONC, 0, .5, 0, Math.PI / 2, 0, 0, 10); vmCyl(b, 1.1, .5, RTS_DARK, 0, 1.25, 0, Math.PI / 2, 0, 0, 10);
      for (let i = 0; i < 4; i++){ const a = i * Math.PI / 2 + .78; vmBox(b, .5, .6, .5, RTS_Y, Math.cos(a) * 1.4, .3, Math.sin(a) * 1.4, 0, 0, 0, 0); }
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

/* ---------- La vallée : montagnes, vieille route, ruines (remplace la ville le temps de la partie) ---------- */
function rtsRoadDist(x, z){
  let best = 1e9;
  for (let i = 0; i < RTS_ROAD.length - 1; i++){
    const A = RTS_ROAD[i], B2 = RTS_ROAD[i + 1], dx = B2[0] - A[0], dz = B2[1] - A[1], L2 = dx * dx + dz * dz;
    const t = clamp(((x - A[0]) * dx + (z - A[1]) * dz) / L2, 0, 1), qx = A[0] + dx * t - x, qz = A[1] + dz * t - z;
    best = Math.min(best, Math.hypot(qx, qz));
  }
  return best;
}
function rtsDesert(){
  disposeWorld(); fires.length = 0;
  world = new THREE.Group(); scene.add(world);
  const fogC = 0xc8a878;
  scene.fog.color.setHex(fogC); scene.background.setHex(fogC); scene.fog.near = 150; scene.fog.far = 360;
  world.add(new THREE.HemisphereLight(0xffe8c8, 0x6a5030, .55));
  const sun = new THREE.DirectionalLight(0xffd8a0, .65); sun.position.set(-60, 80, 40); world.add(sun);
  world.add(new THREE.AmbientLight(0x503820, .2));
  const skyTex = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); [[0, '#3a6aa8'], [.35, '#7aa4cc'], [.47, '#e8d4a8'], [.5, '#f0d8a0'], [.53, '#d8b888'], [1, '#a88a5a']].forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  RTS.sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), new THREE.MeshBasicMaterial({ map:skyTex, side:THREE.BackSide, fog:false, depthWrite:false })); world.add(RTS.sky);
  const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0xfff2d0, fog:false, depthWrite:false, blending:THREE.AdditiveBlending }));
  sunSpr.position.set(-90, 60, -250); sunSpr.scale.set(60, 60, 1); RTS.sky.add(sunSpr);
  RTS.chunks = 0; RTS.ruins = []; rtsChunk(-1); rtsEnsureChunks(-300);
  RTS.pad = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshLambertMaterial({ color:0x8a867c })); RTS.pad.rotation.x = -Math.PI / 2; RTS.pad.position.y = .04; world.add(RTS.pad);
  RTS.edge = new THREE.Mesh(new THREE.RingGeometry(.97, 1, 64), new THREE.MeshBasicMaterial({ color:0xffd040, transparent:true, opacity:.7, side:THREE.DoubleSide, depthWrite:false })); RTS.edge.rotation.x = -Math.PI / 2; RTS.edge.position.y = .07; world.add(RTS.edge);
  try { if (typeof ambReset === 'function') ambReset(); if (typeof __amb === 'object') __amb.set(pick(['clair', 'clair', 'vent', 'coucher', 'poussiere', 'nuitClaire', 'canicule'])); } catch (e) {}
  try { if (typeof gfxPlaceDebris === 'function') gfxPlaceDebris(); if (typeof gfxPlaceHalos === 'function') gfxPlaceHalos(); } catch (e) {}
}
// La carte est faite de tronçons de 100 m (sable, montagnes des côtés, route, ruines, épaves), ajoutés au nord au besoin
function rtsEnsureChunks(z){
  if (!world) return;
  while (-RTS.chunks * RTS_CFG.chunk > z - 150) rtsChunk(RTS.chunks++);
  RTS.zMin = -RTS.chunks * RTS_CFG.chunk + 10;
}
function rtsChunk(k){
  const L = RTS_CFG.chunk, z1 = k < 0 ? 90 : -k * L, z0 = k < 0 ? 0 : -(k + 1) * L, zc = (z0 + z1) / 2;
  rtsRoadTo(z0 - 40);
  // Sable
  const gg = new THREE.PlaneGeometry(480, z1 - z0, 48, 10); gg.rotateX(-Math.PI / 2);
  const pos = gg.attributes.position, col = new Float32Array(pos.count * 3), c1 = new THREE.Color(0xb08a52), c2 = new THREE.Color(0x8e6c3e), cc = new THREE.Color();
  for (let i = 0; i < pos.count; i++){
    const x = pos.getX(i), z = pos.getZ(i) + zc;
    pos.setY(i, Math.sin(x * .05) * Math.cos(z * .043) * .12 + Math.sin((x + z) * .11) * .08);
    cc.copy(c1).lerp(c2, .5 + .5 * Math.sin(x * .07 + z * .05)); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
  }
  gg.setAttribute('color', new THREE.BufferAttribute(col, 3)); gg.computeVertexNormals();
  const gm = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ vertexColors:true })); gm.position.z = zc; world.add(gm);
  const b = vmNew(), ROCK = [0x8a6a4a, 0x7a5a3e, 0x9a7a56, 0x6a4e36];
  const peak = (x, z, s) => {
    vmCyl(b, s, s * rand(1.6, 2.6), pick(ROCK), x, s * .9, z, Math.PI / 2, rand(0, 3), 0, 7, rand(.08, .25));
    vmCyl(b, s * .7, s * 1.2, pick(ROCK), x + rand(-s, s) * .5, s * .5, z + rand(-s, s) * .5, Math.PI / 2, rand(0, 3), 0, 6, .3);
    vmBox(b, s * 1.4, s * .4, s * 1.2, pick(ROCK), x + rand(-s, s) * .4, s * .15, z + rand(-s, s) * .4, rand(-.2, .2), rand(0, 3), rand(-.2, .2), s * .1);
  };
  // Montagnes : au sud (premier tronçon) et sur les deux côtés
  if (k < 0) for (let x = -66; x <= 66; x += 9) peak(x + rand(-3, 3), 40 + rand(-4, 8), rand(9, 15));
  for (let z = (k < 0 ? 30 : z1); z > z0; z -= 9){ const m = rtsValleyX(z); for (const sd of [-1, 1]) peak(sd * (m + 9 + rand(0, 6)), z + rand(-3, 3), rand(8, 14)); }
  // Vieille route d'asphalte, à moitié détruite : dalles qui manquent, bandes effacées, gravats
  for (let i = 0; i < RTS_ROAD.length - 1; i++){
    const A = RTS_ROAD[i], B2 = RTS_ROAD[i + 1]; if (A[1] < z0 || B2[1] > z1) continue;
    const dx = B2[0] - A[0], dz = B2[1] - A[1], Ln = Math.hypot(dx, dz), rot = Math.atan2(dx, dz);
    for (let t = 0; t < Ln; t += 3.2){
      const x = A[0] + dx * t / Ln, z = A[1] + dz * t / Ln; if (z > z1 || z <= z0) continue;
      for (const off of [-2.6, 0, 2.6]){
        if (Math.random() < .14) continue;
        const ox = Math.cos(rot) * off, oz = -Math.sin(rot) * off;
        vmBox(b, rand(2.2, 2.7), .08, rand(2.8, 3.3), Math.random() < .25 ? 0x4a4642 : 0x34322f, x + ox + rand(-.15, .15), .05, z + oz + rand(-.15, .15), 0, rot + rand(-.06, .06), 0, 0);
      }
      if (Math.random() < .5) vmBox(b, .25, .09, 1.3, [1.6, 1.3, .4], x, .07, z, 0, rot, 0, 0);
      if (Math.random() < .3) vmBox(b, rand(.5, 1.2), .3, rand(.5, 1.2), RTS_DARK, x + rand(-3, 3), .12, z + rand(-1, 1), 0, rand(0, 3), 0, .05);
    }
  }
  // Ruines (loin de la route, là où les nids ne vont jamais)
  for (let i = 0; i < (k < 0 ? 0 : 8); i++){
    const z = rand(z0, z1); if (z > -50) continue;
    const m = rtsValleyX(z) - 8, x = rand(-m, m);
    if (rtsRoadDist(x, z) < 26) continue;
    const w = rand(5, 11), d = rand(5, 9); RTS.ruins.push([x, z, Math.max(w, d) * .6]);
    vmPush(b, x, 0, z, 0, rand(0, 3), 0);
    for (let q = 0; q < 4; q++){ const h = rand(1.5, 7); vmBox(b, w / 4, h, .5, q % 2 ? RTS_CONC : 0x9a9080, -w / 2 + w / 8 + q * w / 4, h / 2, -d / 2, 0, 0, 0, .05); }
    for (let q = 0; q < 3; q++){ const h = rand(1, 5); vmBox(b, .5, h, d / 3, 0x9a9080, -w / 2, h / 2, -d / 2 + d / 6 + q * d / 3, 0, 0, 0, .05); }
    for (let q = 0; q < 4; q++) vmBox(b, rand(.6, 1.6), rand(.4, 1), rand(.6, 1.6), 0x8a8070, rand(-w / 2, w / 2), .3, rand(-d / 2, d / 2), rand(-.4, .4), rand(0, 3), rand(-.4, .4), .05);
    for (let q = 0; q < 3; q++) vmBox(b, .08, rand(1, 3), .08, RTS_DARK, rand(-w / 2, w / 2), rand(4, 6), -d / 2, rand(-.5, .5), 0, rand(-.5, .5), 0);
    vmPop(b);
  }
  // Épaves de blindés au bord de la route (les plus proches brûlent encore)
  for (let i = 2; i < RTS_ROAD.length - 1; i++){
    const P2 = RTS_ROAD[i]; if (P2[1] > z1 || P2[1] <= z0) continue;
    const sd = i % 2 ? 1 : -1, x = P2[0] + sd * rand(6, 9), z = P2[1] + rand(-4, 4);
    vmPush(b, x, 0, z, 0, rand(0, 3), .12);
    vmBox(b, 3.4, 1.2, 6, 0x4a4a36, 0, .9, 0, 0, 0, 0, .15); vmBox(b, 2, .9, 2.4, 0x3a3a2a, 0, 1.9, -.4, 0, 0, 0, .1); vmCyl(b, .15, 3, RTS_DARK, 0, 1.9, 1.8, 0, 0, 0, 6);
    for (const q of [-1, 1]) vmBox(b, .6, .9, 6.2, RTS_DARK, q * 1.8, .45, 0, 0, 0, 0, .05);
    vmPop(b);
    if (i % 2 && k < 4) makeFire(x, 1.6, z, 1.1);
  }
  world.add(new THREE.Mesh(vmGeo(b), rtsMat));
}
function rtsBaseSize(){ if (!RTS.pad) return; RTS.pad.scale.set(RTS.baseR, RTS.baseR, 1); RTS.edge.scale.set(RTS.baseR, RTS.baseR, 1); }

/* ---------- Unités, bâtiments, nids ---------- */
const rtsStat = (u, k) => {
  const U = u.U, t = u.type;
  if (k === 'dmg') return U.dmg * (1 + RTS_UPG.arm.k * rtsLv(t, 'arm'));
  if (k === 'hp') return U.hp * (1 + RTS_UPG.hp.k * rtsLv(t, 'hp'));
  if (k === 'rate') return U.rate * (1 + RTS_UPG.rate.k * rtsLv(t, 'rate'));
  if (k === 'speed') return U.speed * (1 + RTS_UPG.spd.k * rtsLv(t, 'spd'));
  if (k === 'range') return U.range * (1 + .06 * rtsLv(t, 'spd') + .15 * rtsLv(t, 'sensor'));
  return U[k];
};
const rtsIsAir = u => u.U.kind !== 'ground';
function rtsSpawnUnit(type, x, z){
  const U = RTS_UNITS[type], g = new THREE.Group(), ground = U.kind === 'ground', robot = U.cat === 'rob' && !U.big;
  g.position.set(x, ground ? 0 : U.alt, z); if (robot) g.scale.setScalar(RTS_SC); rtsRoot.add(g);
  const m = new THREE.Mesh(rtsUnitGeo(type), rtsMat); g.add(m);
  let rotor = null;
  if (type === 'heli'){ rotor = new THREE.Mesh(rtsRotorGeo(true), rtsMat); rotor.position.set(0, 1.3, .6); g.add(rotor); const tr = new THREE.Mesh(rtsRotorGeo(false), rtsMat); tr.rotation.z = Math.PI / 2; tr.position.set(.25, .9, -4.6); g.add(tr); g.userData.tail = tr; }
  if (type === 'bomber'){ // 4 hélices et leur disque flou
    g.userData.props = [];
    for (const sd of [-1, 1]) for (const x of [3.6, 7.2]){
      const pr = new THREE.Mesh(rtsPropGeo(), rtsMat); pr.position.set(sd * x, 1, 3.8); g.add(pr); g.userData.props.push(pr);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.65, 20), rtsPropBlur); disc.position.set(sd * x, 1, 3.85); g.add(disc);
    }
  }
  const rr = ground ? U.r : U.r * .8;
  const ring = new THREE.Mesh(new THREE.RingGeometry(rr * 1.3, rr * 1.6, 24), rtsRingMat); ring.rotation.x = -Math.PI / 2; ring.position.y = ground ? .06 : -U.alt + .1; ring.visible = false; g.add(ring);
  const hp = rtsHpBar(g, U.big ? 9 : robot ? (type === 'heavy' ? 4.4 : 3) : ground ? 3.4 : 2.8, robot ? (type === 'heavy' ? 2.2 : 1.6) : 3.2);
  const u = { type, U, g, m, ring, rotor, hpb:hp, hp:0, maxHp:0, tx:x, tz:z, cmd:'idle', nest:null, tgt:null, cd:rand(0, .5), cd2:rand(0, .5), scanT:0, step:0, dead:false, hx:x, hz:z, retreat:false, r:robot ? U.r * RTS_SC : U.r, head:rand(0, 6.28) };
  u.maxHp = u.hp = rtsStat(u, 'hp');
  m.userData.rtsUnit = u; RTS.units.push(u); rtsHpSet(hp, 1);
  return u;
}
function rtsPlaceBld(type, x, z, free, rot){
  const B = RTS_BLD[type], g = new THREE.Group(); g.position.set(x, 0, z); rtsRoot.add(g);
  const m = new THREE.Mesh(rtsBldGeo(type), rtsMat); m.rotation.y = ((rot || 0) % 4) * Math.PI / 2; g.add(m); // rotation par quarts de tour
  let head = null; if (B.turret){ head = new THREE.Mesh(rtsHeadGeo(type), rtsMat); head.position.y = 1.5; g.add(head); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(B.size + .3, B.size + .7, 32), rtsRingMat); ring.rotation.x = -Math.PI / 2; ring.position.y = .1; ring.visible = false; g.add(ring);
  const hpb = rtsHpBar(g, type === 'hq' ? 15 : B.turret ? 4.2 : 7, Math.max(2.2, Math.min(8, B.size * 1.2)));
  const o = { type, B, g, m, head, ring, hpb, hp:B.hp, maxHp:B.hp, x, z, rot:(rot || 0) % 4, r:B.size, lv:1, cd:rand(0, .5), tgt:null, scanT:0, spent:free ? 0 : B.cost, dead:false };
  m.userData.rtsBld = o; if (head) head.userData.rtsBld = o;
  RTS.blds.push(o); rtsHpSet(hpb, 1);
  if (type === 'hq') RTS.base = o;
  return o;
}
function rtsBldOk(type, x, z){
  const B = RTS_BLD[type]; if (!B) return 'Bâtiment inconnu';
  if (Math.hypot(x, z) + B.size > RTS.baseR) return 'Hors de la base : détruis des nids pour l’agrandir';
  if (z + B.size > 26 || Math.abs(x) + B.size > rtsValleyX(z) - 2) return 'Trop près de la montagne';
  for (const o of RTS.blds) if (!o.dead && Math.hypot(o.x - x, o.z - z) < o.r + B.size + .5) return 'Trop près d’un autre bâtiment';
  return '';
}
function rtsBuild(type, x, z, rot){
  const B = RTS_BLD[type]; if (!B || B.fixed) return null;
  if (S.money < B.cost){ if (typeof toast === 'function') toast('Pas assez d’argent : ' + B.name + ' (' + fmt(B.cost) + ')'); return null; }
  const why = rtsBldOk(type, x, z); if (why){ if (typeof toast === 'function') toast(why); return null; }
  S.money -= B.cost;
  const o = rtsPlaceBld(type, x, z, false, rot);
  rtsV.set(x, .5, z); burst(rtsV, 'dust', 12, 3);
  if (typeof Snd === 'object' && Snd.buy) Snd.buy();
  return o;
}
function rtsFactoryFor(type){
  const need = RTS_UNITS[type].fac; let best = null;
  for (const o of RTS.blds) if (!o.dead && o.type === need){ best = o; if (Math.random() < .5) break; }
  return best;
}
const RTS_FAC_NAME = { factory:'une Usine de robots', heavyfac:'une Usine lourde', vehdepot:'un Garage de blindés', heliport:'un Héliport', airfield:'un Aérodrome' };
function rtsBuy(type){
  const U = RTS_UNITS[type]; if (!U || !RTS.on || state !== 'rts') return null;
  rtsCancelPlace();
  const f = rtsFactoryFor(type);
  if (!f){ if (typeof toast === 'function') toast('Construis d’abord ' + RTS_FAC_NAME[U.fac]); return null; }
  if (S.money < U.cost){ if (typeof toast === 'function') toast('Pas assez d’argent pour : ' + U.name + ' (' + fmt(U.cost) + ')'); return null; }
  if (RTS.units.filter(u => !u.dead).length >= RTS_CFG.maxUnits){ if (typeof toast === 'function') toast('Plein : ' + RTS_CFG.maxUnits + ' unités au plus'); return null; }
  S.money -= U.cost;
  const a = Math.atan2(-f.z - 20, -f.x) + rand(-.4, .4), out = f.r + 3;
  const u = rtsSpawnUnit(type, f.x + Math.cos(a) * out, f.z + Math.sin(a) * out);
  u.tx = u.hx = f.x + Math.cos(a) * (out + 4); u.tz = u.hz = f.z + Math.sin(a) * (out + 4); u.cmd = U.kind === 'air' ? 'idle' : 'move';
  if (U.kind === 'air') u.head = Math.PI; // décolle vers le nord
  if (typeof Snd === 'object' && Snd.buy) Snd.buy();
  return u;
}
const rtsUpgCost = (type, k) => Math.round(RTS_UNITS[type].cost * .8 * Math.pow(1.6, rtsLv(type, k)) * (RTS_UPG[k] ? 1 : 1.25));
function rtsUpgBuy(type, k){
  const U = rtsUpgDef(type, k), C = RTS_UNITS[type]; if (!U || !C) return false;
  const l = rtsLv(type, k), cost = rtsUpgCost(type, k);
  if (l >= U.max || S.money < cost) return false;
  S.money -= cost; RTS.upg[type] = RTS.upg[type] || {}; RTS.upg[type][k] = l + 1;
  if (k === 'hp') RTS.units.forEach(u => { if (u.type === type && !u.dead){ const k2 = rtsStat(u, 'hp') / u.maxHp; u.maxHp *= k2; u.hp *= k2; rtsHpSet(u.hpb, u.hp / u.maxHp); } });
  if (typeof Snd === 'object' && Snd.buy) Snd.buy();
  return true;
}
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
// Nids : le long de la vieille route, de chaque côté, de plus en plus loin au nord
function rtsAddNest(x, z){
  const i = RTS.nestN++;
  rtsEnsureChunks(z);
  if (x == null){ // n'importe où dans le secteur de 90°, loin des ruines et des autres nids
    const w = Math.max(15, Math.min(-z * .95, rtsValleyX(z) - 10));
    for (let k = 0; k < 16; k++){
      x = rand(-w, w);
      const near = RTS.ruins.some(r => Math.hypot(r[0] - x, r[1] - z) < r[2] + 8) || RTS.nests.some(n => !n.dead && Math.hypot(n.x - x, n.z - z) < 28);
      if (!near) break;
    }
  }
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); rtsRoot.add(g);
  const mm = new THREE.Mesh(rtsNestGeo(), rtsMat); g.add(mm);
  // Chaque nouveau nid est plus solide et pond plus vite que le précédent
  const hp = rtsHpBar(g, 10.5, 6), mx = Math.round(RTS_CFG.nestHp * (1 + .3 * i) * Math.pow(1.08, Math.max(0, i - 5)));
  const o = { g, m:mm, hpb:hp, hp:mx, maxHp:mx, x, z, r:4.5, spawnT:rand(3, 7), dead:false, idx:i, pow:1 + .12 * i };
  mm.userData.rtsNest = o; RTS.nests.push(o);
  return o;
}
function rtsMakeNests(){
  // Six nids étalés dans tout le secteur de 90° au nord (de 85 à 290 m environ)
  const zs = [-84, -124, -164, -204, -244, -292];
  for (let i = 0; i < RTS_CFG.nests; i++) rtsAddNest(null, zs[i] + rand(-5, 5));
}
const rtsNestsAlive = () => RTS.nests.filter(n => !n.dead);
const rtsFront = () => { let z = 0; RTS.nests.forEach(n => { if (n.z < z) z = n.z; }); return z; };

/* ---------- Démarrer, quitter ---------- */
function rtsClearAll(){
  rtsUnpilot();
  while (rtsRoot.children.length) rtsRoot.remove(rtsRoot.children[0]);
  RTS.units.length = 0; RTS.nests.length = 0; RTS.blds.length = 0; RTS.sel.length = 0; RTS.bsel = null; RTS.base = null; rtsCancelPlace();
}
function rtsStart(){
  if (typeof Snd === 'object') Snd.init();
  if (typeof infLeave === 'function') try { infLeave(); } catch (e) {}
  newGame(); clearZombies(); rtsClearAll();
  curLoc = LOCS[0];
  Object.assign(RTS, { on:true, paused:false, t:0, kills:0, threat:1, hordeT:RTS_CFG.hordeEvery, hordeN:0, bossN:0, bossKills:0, nestN:0, lost:0, upg:{}, baseR:RTS_CFG.baseR0, incT:5, tab:'rob', xp0:P.xp || 0, scr0:P.scrap || 0, zMin:-300, spin:0, shells:[] });
  rtsRoadReset(); rtsDesert(); rtsMakeNests(); rtsBaseSize();
  S.money = RTS_CFG.money; S.wave = 1;
  RTS.cam.x = 0; RTS.cam.z = -10; RTS.cam.h = isTouch ? 64 : 56;
  plan = { queue:[], total:0, hpMult:1, spdMult:1, dmgMult:1, cashMult:1.6, xp:1.5, maxAlive:isTouch ? RTS_CFG.maxZTouch : RTS_CFG.maxZ, interval:1 };
  rtsPlaceBld('hq', 0, 0, true);
  rtsPlaceBld('factory', -12, 6, true);
  rtsPlaceBld('t_mg', 7, -12, true); rtsPlaceBld('t_mg', -7, -13, true); rtsPlaceBld('t_mg', 14, -3, true);
  for (let i = 0; i < 3; i++){ const u = rtsSpawnUnit('rifle', -3 + i * 3, -12); u.tx = -3 + i * 3; u.tz = -16; u.cmd = 'move'; }
  state = 'rts';
  showScreen(null); rtsPanel.classList.add('hide');
  $('hud').classList.add('hide'); $('touch').classList.add('hide'); $('cross').classList.add('hide');
  document.body.classList.add('rts');
  rtsUI.classList.remove('hide'); rtsUI.classList.toggle('touch', isTouch); rtsTab('rob');
  if (typeof unlockPointer === 'function') unlockPointer();
  banner('Base assiégée', 'Ils arrivent de partout au nord : défends tout l’avant de la base. Chaque nid détruit en fait apparaître un plus fort, plus loin.', 3200);
}
function rtsQuit(){
  RTS.on = false; RTS.paused = false;
  rtsClearAll();
  rtsUI.classList.add('hide'); rtsPanel.classList.add('hide'); rtsBox.style.display = 'none'; rtsInfo.classList.add('hide');
  document.body.classList.remove('rts');
  clearZombies(); RTS.pad = RTS.edge = null;
  camera.position.copy(EYE); camera.rotation.order = 'YXZ'; camera.rotation.set(0, 0, 0);
  state = 'menu'; curLoc = LOCS[0]; buildWorld(curLoc); newGame(); plan = wavePlan(1);
  if (typeof saveP === 'function') saveP();
  showScreen('scrTitle'); $('hud').classList.add('hide');
}
function rtsEnd(won){
  if (state === 'rtsover') return;
  rtsUnpilot();
  state = 'rtsover'; RTS.paused = false; rtsCancelPlace();
  const min = Math.floor(RTS.t / 60), sec = Math.floor(RTS.t % 60), nd = RTS.nests.filter(n => n.dead).length;
  const rec = nd > RTS.best; if (rec){ RTS.best = nd; store.set('dt_rts_bestN', nd); }
  if (typeof Snd === 'object' && Snd.boom) Snd.boom(2.2);
  if (typeof saveP === 'function') saveP();
  const xp = Math.max(0, Math.round((P.xp || 0) - RTS.xp0)), scr = Math.max(0, Math.round((P.scrap || 0) - RTS.scr0));
  setTimeout(() => rtsShowPanel('<h2 class="title sm">' + (won ? 'Fin de la partie' : 'Le QG est tombé') + '</h2><div class="stats">'
    + '<span>Nids détruits : <strong>' + nd + '</strong>' + (rec ? ' · nouveau record !' : ' · record : ' + RTS.best) + ' · Boss abattus : <strong>' + RTS.bossKills + '</strong></span>'
    + '<span>Temps tenu : <strong>' + min + ' min ' + String(sec).padStart(2, '0') + ' s</strong></span>'
    + '<span>Zombies abattus : <strong>' + fmtN(RTS.kills) + '</strong> · Unités perdues : <strong>' + RTS.lost + '</strong></span>'
    + '<span>Expérience : <strong>+' + fmtN(xp) + '</strong> · Ferraille : <strong>+' + fmtN(scr) + ' ⚙</strong></span></div>',
    [['Rejouer', rtsStart], ['Menu', rtsQuit]]), 1000);
}
function rtsPause(){
  if (state !== 'rts' || RTS.paused) return;
  RTS.paused = true; if (typeof unlockPointer === 'function') unlockPointer();
  rtsShowPanel('<h2 class="title sm">Pause</h2><p class="lead">Menace ' + RTS.threat.toFixed(1).replace('.', ',') + ' · ' + fmtN(RTS.kills) + ' zombies abattus</p>',
    [['Reprendre', () => { RTS.paused = false; rtsPanel.classList.add('hide'); if (RTS.pilot && !isTouch && typeof lockPointer === 'function') lockPointer(); }]]
      .concat(RTS.pilot ? [['Retour à la carte', () => { rtsUnpilot(); RTS.paused = false; rtsPanel.classList.add('hide'); }]] : []).concat([['Abandonner', rtsQuit]]));
}

/* ---------- Zombies : la route, les cibles, les boss ---------- */
const RTS_SPAWN = [['walker', 0], ['runner', 1.2], ['crawler', 1.4], ['spider', 2], ['bloater', 2.2], ['brute', 2.6], ['stalker', 3], ['shield', 3.4], ['spitter', 1.8], ['flyer', 2.4], ['abomination', 4.2]];
function rtsPickType(){
  const ok = RTS_SPAWN.filter(e => RTS.threat >= e[1] && ZTYPES[e[0]]);
  return Math.random() < .45 ? 'walker' : ok[Math.floor(Math.random() * ok.length)][0];
}
function rtsSpawnAt(x, z, n, spread, type){
  let alive = zAliveCount(), k = 0; spread = spread || 3;
  for (let i = 0; i < n && (alive < plan.maxAlive || type); i++){
    const t = type || rtsPickType(), zz = spawnZombie(t); if (!zz) continue;
    zz.g.position.set(x + rand(-spread, spread), zz.g.position.y, z + rand(-spread, spread)); zz.rtsT = 0; zz.wp = null; zz.useRoad = Math.random() < .3; alive++; k++; // 3 sur 10 suivent la vieille route, les autres coupent tout droit
    if (RTS_BOSS.indexOf(t) >= 0){ zz.maxHp = zz.hp = zz.maxHp * RTS_CFG.bossHp; zz.rtsBoss = true; zz.abT = 3; }
  }
  return k;
}
function rtsThreat(){
  const killed = RTS.nests.filter(n => n.dead).length;
  RTS.threat = 1 + RTS.kills / 160 + RTS.t / 150 + killed * .4;
  plan.hpMult = 1 + .55 * (RTS.threat - 1); plan.dmgMult = 1 + .4 * (RTS.threat - 1); plan.spdMult = Math.min(1.5, 1 + .05 * (RTS.threat - 1));
}
const RTS_FLY = { flyer:1, gargoyle:1, crow:1, behemoth:1 };
// Cible d'un zombie : unité ou bâtiment le plus proche (à 16 m) ; seuls les volants s'en prennent aux hélicoptères et aux avions
function rtsTargetOfZombie(z){
  const gp = z.g.position, fly = RTS_FLY[z.type]; let best = null, bd = 16 * 16;
  for (const u of RTS.units){ if (u.dead || (rtsIsAir(u) && !fly)) continue; const dx = u.g.position.x - gp.x, dz = u.g.position.z - gp.z, d = dx * dx + dz * dz; if (d < bd){ bd = d; best = u; } }
  for (const o of RTS.blds){ if (o.dead) continue; const dx = o.x - gp.x, dz = o.z - gp.z, d = Math.max(0, Math.hypot(dx, dz) - o.r); if (d * d < bd){ bd = d * d; best = o; } }
  return best;
}
const rtsPos = T => (T.B ? rtsV2.set(T.x, 0, T.z) : T.g.position);
// Prochain point de la route vers la base (la route va du nord, index élevé, vers la base, index 0)
function rtsRoadNext(z){
  const gp = z.g.position;
  if (z.wp == null){
    let bi = 0, bd = 1e9; RTS_ROAD.forEach((p, i) => { const d = Math.hypot(p[0] - gp.x, p[1] - gp.z); if (d < bd){ bd = d; bi = i; } });
    if (bi > 0 && RTS_ROAD[bi][1] < gp.z - 2) bi--;                  // ce point est derrière lui (plus au nord) : on prend le suivant
    z.wp = bi;
  }
  const P2 = RTS_ROAD[z.wp];
  if (P2 && Math.hypot(P2[0] - gp.x, P2[1] - gp.z) < 4) z.wp--;
  return z.wp >= 0 ? RTS_ROAD[z.wp] : null;
}
function rtsDmgTarget(T, dmg){
  if (T.type && T.U) dmg *= Math.max(.4, 1 - .15 * rtsLv(T.type, 'reactive'));
  T.hp -= dmg; if (T.hpb) rtsHpSet(T.hpb, T.hp / T.maxHp);
  if (T.hp <= 0){ if (T.B) rtsBldDie(T); else rtsUnitDie(T); }
}
function rtsBossAbility(z, dt){
  z.abT -= dt; if (z.abT > 0) return;
  const gp = z.g.position;
  if (z.type === 'titan'){                        // piétinement : tout ce qui est au sol autour
    z.abT = rand(4.5, 6);
    shake = Math.max(shake, .5); rtsV.set(gp.x, .3, gp.z); burst(rtsV, 'dust', 26, 8); if (typeof Snd === 'object' && Snd.boom) Snd.boom(1.2);
    RTS.units.slice().forEach(u => { if (!u.dead && !rtsIsAir(u) && Math.hypot(u.g.position.x - gp.x, u.g.position.z - gp.z) < 12) rtsDmgTarget(u, z.dmg * .5); });
    RTS.blds.slice().forEach(o => { if (!o.dead && Math.hypot(o.x - gp.x, o.z - gp.z) < 12 + o.r) rtsDmgTarget(o, z.dmg * .5); });
  } else if (z.type === 'broodmother'){           // elle pond des araignées ou des rampants
    z.abT = rand(5, 7); rtsSpawnAt(gp.x, gp.z, 3, 3, Math.random() < .5 && ZTYPES.spider ? 'spider' : 'crawler');
  } else if (z.type === 'behemoth'){              // crachat d'acide sur la cible la plus proche (avions compris)
    z.abT = rand(2.5, 3.5);
    let best = null, bd = 34 * 34;
    RTS.units.forEach(u => { if (u.dead) return; const d = (u.g.position.x - gp.x) ** 2 + (u.g.position.z - gp.z) ** 2; if (d < bd){ bd = d; best = u; } });
    RTS.blds.forEach(o => { if (o.dead) return; const d = (o.x - gp.x) ** 2 + (o.z - gp.z) ** 2; if (d < bd){ bd = d; best = o; } });
    if (best){
      const tp = rtsPos(best), to = new THREE.Vector3(tp.x, best.B ? 2 : best.g.position.y + 1, tp.z);
      if (typeof arsBeam === 'function') arsBeam(rtsV.set(gp.x, gp.y + 2, gp.z), to, 0x8aff40, .35, .25);
      burst(to, PMATS.acid ? 'acid' : 'dust', 9, 2.4);
      rtsDmgTarget(best, z.dmg * .6);
    }
  }
}
function rtsZombies(dt){
  for (let i = zombies.length - 1; i >= 0; i--){
    const z = zombies[i];
    if (z.flashT > 0) z.flashT -= dt;
    if (z.dead){
      z.deadT += dt; z.body.rotation.x = -Math.min(1, z.deadT / .45) * Math.PI / 2;
      if (z.deadT <= 1.6 && z.g.position.y > 0){ z.fallV = (z.fallV || 0) + 22 * dt; z.g.position.y = Math.max(0, z.g.position.y - z.fallV * dt); }
      if (z.deadT > 1.6) z.g.position.y -= dt * 1.2;
      if (z.deadT > (z.rtsBoss ? 5 : 2.8)){ disposeZombie(z); zombies.splice(i, 1); }
      continue;
    }
    if (z.burnT > 0){ z.burnT -= dt; z.burnTick = (z.burnTick || .25) - dt; if (z.burnTick <= 0){ z.burnTick = .25; damage(z, (z.burnDps || 20) * .25, false, z.g.position); if (z.dead) continue; } }
    if (z.rtsBoss){ rtsBossAbility(z, dt); if (state !== 'rts') return; }
    z.rtsT = (z.rtsT || 0) - dt;
    if (z.rtsT <= 0 || (z.rtsTgt && z.rtsTgt.dead)){ z.rtsT = rand(.3, .6); z.rtsTgt = rtsTargetOfZombie(z); }
    const gp = z.g.position, fly = !!RTS_FLY[z.type];
    // Sans cible proche, il suit la vieille route jusqu'à la base, puis va vers le QG
    let T = z.rtsTgt, tp;
    if (T) tp = rtsPos(T);
    else { const P2 = fly || !z.useRoad ? null : rtsRoadNext(z); if (P2) tp = rtsV3.set(P2[0], 0, P2[1]); else { T = RTS.base; if (!T) continue; tp = rtsPos(T); } }
    const dx = tp.x - gp.x, dz = tp.z - gp.z, d = Math.hypot(dx, dz);
    const reach = T ? (T.r || 1) + .9 * ((ZTYPES[z.type] || {}).scale || 1) : 0;
    z.g.rotation.y = Math.atan2(dx, dz);
    z.phase += dt * Math.max(2, z.speed * 3);
    const s = Math.sin(z.phase);
    if (z.legL){ z.legL.rotation.x = s * .6; z.legR.rotation.x = -s * .6; }
    if (z.armL){ z.armL.rotation.x = -1.35 + s * .2; z.armR.rotation.x = -1.35 - s * .2; }
    const R = z.rig;
    if (R && R.legs) R.legs.forEach((l, k) => { l.rotation.x = Math.sin(z.phase + k * 1.3) * .5; });
    if (R && R.wing){ const a = Math.sin(z.phase * 2.5); R.wing[0].rotation.z = -a * .7; R.wing[1].rotation.z = a * .7; }
    if (fly){ const want = T && !T.B && rtsIsAir(T) ? T.g.position.y : (z.alt || 5) * .6; gp.y += (want - gp.y) * Math.min(1, dt * 2); }
    if (!T || d > reach){ const v = z.speed * dt / Math.max(d, .01); gp.x += dx * v; gp.z += dz * v; }
    else {
      z.atkT -= dt;
      if (z.atkT <= 0){
        z.atkT = rand(.9, 1.3);
        rtsV.set(tp.x, 1.2, tp.z); burst(rtsV, 'wood', 2, 1.5);
        rtsDmgTarget(T, z.dmg);
        if (state !== 'rts') return;
      }
    }
    if (!fly) rtsClampValley(gp, false);
  }
  zFrame++;
}
function rtsUnitDie(u){
  if (u.dead) return; u.dead = true; RTS.lost++;
  rtsV.copy(u.g.position); rtsV.y = Math.max(1.5, rtsV.y);
  if (typeof rueBoom === 'function') rueBoom(rtsV.x, rtsV.y, rtsV.z, rtsIsAir(u) ? 12 : 7);
  burst(rtsV, 'dust', 12, 4); if (typeof Snd === 'object' && Snd.boom) Snd.boom(rtsIsAir(u) ? 1 : .6);
  rtsRoot.remove(u.g); const i = RTS.sel.indexOf(u); if (i >= 0) RTS.sel.splice(i, 1);
  if (RTS.pilot === u){ rtsUnpilot(); if (typeof toast === 'function') toast('Ton unité est détruite : retour à la carte'); }
}
function rtsBldDie(o, sold){
  if (o.dead) return; o.dead = true;
  rtsV.set(o.x, 2, o.z);
  if (!sold){ if (typeof rueBoom === 'function') rueBoom(o.x, 2.5, o.z, o.r * 4); if (typeof Snd === 'object' && Snd.boom) Snd.boom(1); burst(rtsV, 'dust', 20, 6); }
  if (RTS.pilot === o) rtsUnpilot();
  rtsRoot.remove(o.g); if (RTS.bsel === o){ RTS.bsel = null; rtsInfoShow(); }
  if (o.type === 'hq' && state === 'rts') rtsEnd(false);
}
function rtsShotSnd(id){ if (RTS.sndT > 0 || typeof Snd !== 'object') return; RTS.sndT = .07; try { Snd.shot(id); } catch (e) {} }
// Explosion au sol (roquettes, obus, bombes)
function rtsBlast(x, z, S2){
  for (const zz of zombies){ if (zz.dead) continue; const d = Math.hypot(zz.g.position.x - x, zz.g.position.z - z); if (d < S2.splash){ damage(zz, S2.dmg * (1 - .5 * d / S2.splash), false, zz.g.position.clone()); if (S2.burn && !zz.dead){ zz.burnT = 5; zz.burnDps = 45; } } }
  if (S2.burn) burst(rtsV.set(x, .6, z), PMATS.ember ? 'ember' : 'dust', 10, 3);
  for (const n of RTS.nests){ if (n.dead) continue; if (Math.hypot(n.x - x, n.z - z) < S2.splash + n.r){ n.hp -= S2.dmg * .8; rtsHpSet(n.hpb, n.hp / n.maxHp); if (n.hp <= 0) rtsNestDie(n); } }
  if (typeof rueBoom === 'function') rueBoom(x, 1.2, z, S2.splash * 2.4);
  if (typeof Snd === 'object' && Snd.boom && Math.random() < .5) Snd.boom(S2.bomb ? 1 : .45);
}
// En pilotage, une traînée qui passe à moins de 2,5 m des yeux boucherait tout l'écran : on ne la dessine pas
function rtsBeamOk(a, b){
  if (!RTS.pilot) return true;
  const c = camera.position, abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z, L2 = abx * abx + aby * aby + abz * abz || 1;
  const t = clamp(((c.x - a.x) * abx + (c.y - a.y) * aby + (c.z - a.z) * abz) / L2, 0, 1);
  return Math.hypot(a.x + abx * t - c.x, a.y + aby * t - c.y, a.z + abz * t - c.z) > 2.5;
}
// Un tir (robot, véhicule, avion ou tourelle) vers un zombie ('z'), un nid ('nest') ou un point du sol ('pt', { x, z })
function rtsHit(from, tgt, kind, S2){
  const to = kind === 'nest' ? rtsV2.set(tgt.x, 3 + rand(-1, 2), tgt.z) : kind === 'pt' ? rtsV2.set(tgt.x, .5, tgt.z) : rtsV2.set(tgt.g.position.x, tgt.g.position.y + (tgt.aimY || 1.1), tgt.g.position.z);
  const clear = rtsBeamOk(from, to);
  if (S2.beam && clear && typeof arsBeam === 'function') arsBeam(from, to, S2.beam, S2.pierce ? .14 : .05, S2.pierce ? .12 : .05);
  if (S2.chain && typeof arsBolt === 'function') arsBolt(from, to);
  if (!S2.beam && !S2.chain && !S2.flame && clear && typeof arsBeam === 'function') arsBeam(from, to, 0xffa040, .12, .08); // traînée de roquette, d'obus ou de bombe
  rtsShotSnd(S2.snd);
  if (kind === 'nest'){
    tgt.hp -= S2.dmg * (S2.splash ? 1.6 : 1); rtsHpSet(tgt.hpb, tgt.hp / tgt.maxHp); burst(to, 'dust', 2, 2);
    if (S2.splash && typeof rueBoom === 'function') rueBoom(to.x, to.y, to.z, 6);
    if (tgt.hp <= 0) rtsNestDie(tgt);
    return;
  }
  if (S2.splash){
    if (S2.pierce2 && kind === 'z'){ // obus perforant : il traverse la file, puis explose
      const ax = from.x, az = from.z, bx = to.x - ax, bz = to.z - az, L2 = bx * bx + bz * bz || 1;
      for (const z of zombies){ if (z.dead || z === tgt) continue; const px = z.g.position.x - ax, pz = z.g.position.z - az, t = clamp((px * bx + pz * bz) / L2, 0, 1.6), qx = px - bx * t, qz = pz - bz * t; if (qx * qx + qz * qz < 1.6) damage(z, S2.dmg * .7, false, z.g.position.clone()); }
    }
    rtsBlast(to.x, to.z, S2); return;
  }
  if (kind === 'pt'){ burst(to, 'dust', 2, 1.5); return; }
  if (S2.pierce){
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
      if (typeof arsBolt === 'function') arsBolt(rtsV.set(cur.g.position.x, 1.2, cur.g.position.z), rtsV3.set(best.g.position.x, 1.2, best.g.position.z));
      damage(best, S2.dmg * .8, false, best.g.position.clone()); hit.push(best); cur = best;
    }
  } else if (S2.flame){
    for (const z of zombies){ if (z.dead) continue; const d = Math.hypot(z.g.position.x - from.x, z.g.position.z - from.z); if (d < S2.range + 1 && (z.g.position.x - from.x) * (to.x - from.x) + (z.g.position.z - from.z) * (to.z - from.z) > 0){ damage(z, S2.dmg, false, z.g.position.clone()); z.burnT = 3; z.burnDps = S2.dmg * 2; } }
    // Jet de flammes bien visible : deux traits (orange large, jaune au cœur) et des braises le long
    if (clear && typeof arsBeam === 'function'){ arsBeam(from, to, 0xff6a1a, .9, .1); arsBeam(from, to, 0xffd040, .35, .07); }
    for (let k = 0; k < 2; k++){ rtsV.copy(from).lerp(to, rand(.3, 1)); burst(rtsV, PMATS.ember ? 'ember' : 'dust', 2, 2.5); }
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
  RTS.baseR = Math.min(70, RTS.baseR + RTS_CFG.baseRStep); rtsBaseSize();
  // Toujours RTS_CFG.nests nids actifs : un nouveau apparaît plus loin au nord, plus fort
  P.scrap = (P.scrap || 0) + 40 + 10 * n.idx; addXP(30 + 5 * n.idx);
  let nn = null; while (rtsNestsAlive().length < RTS_CFG.nests) nn = rtsAddNest(null, rtsFront() - rand(35, 55));
  const nd = RTS.nests.filter(x => x.dead).length;
  banner('Nid détruit ! (' + nd + ')', '+' + fmt(bounty) + (nn ? ' · nouveau nid repéré au nord, niveau ' + (nn.idx + 1) : ''), 2600);
}
const rtsS2 = u => ({ dmg:rtsStat(u, 'dmg'), snd:u.U.snd, beam:u.U.beam, pierce:u.U.pierce, splash:u.U.splash && u.U.splash * (1 + .1 * rtsLv(u.type, 'sensor') + .25 * rtsLv(u.type, 'he')), pierce2:rtsLv(u.type, 'apfsds') > 0, flame:u.U.flame, bomb:u.U.bomb, range:rtsStat(u, 'range') });
const rtsMuzzle = (u, out) => { const p = u.g.position; return out.set(p.x, u.U.big ? 5.2 : u.U.kind === 'ground' ? (u.U.cat === 'rob' ? (u.type === 'heavy' ? 3.4 : 2.2) * RTS_SC : 2) : p.y - .5, p.z); };
// Arme secondaire (roquettes du Mech de combat) : mêmes améliorations d'armes et de cadence
const rtsS2b = u => { const W = u.U.w2, k = 1 + RTS_UPG.arm.k * rtsLv(u.type, 'arm'), se = rtsLv(u.type, 'sensor'); return { dmg:W.dmg * k, snd:W.snd, splash:W.splash * (1 + .1 * se), range:W.range * (1 + .06 * rtsLv(u.type, 'spd') + .15 * se), burn:rtsLv(u.type, 'fire') > 0 }; };
const rtsRate2 = u => u.U.w2.rate * (1 + RTS_UPG.rate.k * rtsLv(u.type, 'rate')) * (1 + .2 * rtsLv(u.type, 'cal105'));
// Gatling de 25 mm de l'AC-130 (amélioration) : rafales traçantes rapides
const rtsS25 = u => { const G = RTS_GUNS[u.type], l = rtsLv(u.type, G.k); return { dmg:G.dmg * (1 + .35 * (l - 1)) * (1 + RTS_UPG.arm.k * rtsLv(u.type, 'arm')), snd:G.snd, beam:0xffd890, range:rtsStat(u, 'range') }; };
// Missile Hellfire de l'hélicoptère (amélioration)
function rtsHellfire(u, dt, tgt, pilot){
  const l = rtsLv(u.type, 'hellfire'); if (!l) return;
  u.cd4 = (u.cd4 || 0) - dt; if (u.cd4 > 0 || !tgt) return;
  u.cd4 = 3; const S4 = { dmg:300 * (1 + .4 * (l - 1)) * (1 + RTS_UPG.arm.k * rtsLv(u.type, 'arm')), splash:4, snd:'rocket', range:rtsStat(u, 'range') + 8 };
  if (pilot) rtsPilotShot(u, S4, 1.5); else rtsHit(rtsMuzzle(u, new THREE.Vector3()), tgt, tgt.g ? 'z' : 'nest', S4);
}
function rtsGat(u, dt, tgt, pilot){
  const G = RTS_GUNS[u.type]; if (!G || !rtsLv(u.type, G.k)) return;
  u.cd3 = (u.cd3 || 0) - dt; if (u.cd3 > 0 || !tgt) return;
  u.cd3 = 1 / (G.rate * (1 + RTS_UPG.rate.k * rtsLv(u.type, 'rate')));
  if (pilot) rtsPilotShot(u, rtsS25(u), -1); else rtsHit(rtsMuzzle(u, new THREE.Vector3()), tgt, tgt.g ? 'z' : 'nest', rtsS25(u));
}
// Choix de la cible : tireur d'élite = le plus gros ; explosifs = là où ils sont le plus serrés ; sinon le plus proche
function rtsPickTarget(u, r, splash){
  const gp = u.g.position, r2 = r * r; let best = null, bs = -1e9, n = 0;
  for (const q of zombies){
    if (q.dead) continue; const dx = q.g.position.x - gp.x, dz = q.g.position.z - gp.z, d2 = dx * dx + dz * dz; if (d2 > r2) continue;
    let sc = -d2;
    if (u.type === 'sniper') sc = q.maxHp * 10 - Math.sqrt(d2);
    else if (splash && n++ < 14){ let c = 0; for (const o of zombies) if (!o.dead && Math.abs(o.g.position.x - q.g.position.x) < splash && Math.abs(o.g.position.z - q.g.position.z) < splash) c++; sc = c * 100 - Math.sqrt(d2); }
    if (sc > bs){ bs = sc; best = q; }
  }
  return best;
}
// Lieu de réparation le plus proche (atelier, sinon le QG)
function rtsHealSpot(u){
  const gp = u.g.position; let best = null, bd = 1e9;
  for (const o of RTS.blds){ if (o.dead || !o.B.heal) continue; const d = Math.hypot(o.x - gp.x, o.z - gp.z); if (d < bd){ bd = d; best = o; } }
  return best || RTS.base;
}
function rtsNearestZ(x, z, r, fwdX, fwdZ, cos){
  let best = null, bd = r * r;
  for (const q of zombies){
    if (q.dead) continue; const dx = q.g.position.x - x, dz = q.g.position.z - z, d = dx * dx + dz * dz;
    if (d >= bd) continue;
    if (fwdX != null){ const L = Math.sqrt(d) || 1; if ((dx * fwdX + dz * fwdZ) / L < cos) continue; }
    bd = d; best = q;
  }
  return best;
}
// Avions : ils tournent autour d'un point (ordre, nid visé, ou au-dessus de la route) et attaquent ce qui passe devant
function rtsAir(u, dt){
  const U = u.U, gp = u.g.position, spd = rtsStat(u, 'speed');
  let cx = 0, cz = -40;
  if (u.nest && !u.nest.dead){ cx = u.nest.x; cz = u.nest.z; } else if (u.cmd === 'move' || u.cmd === 'patrol'){ cx = u.tx; cz = u.tz; u.cmd = 'patrol'; }
  else { // sans ordre : il va tourner au-dessus des zombies les plus proches de la base
    u.huntT = (u.huntT || 0) - dt;
    if (u.huntT <= 0){ u.huntT = 1; const q = rtsNearestZ(0, -10, 150); u.hunt = q ? [q.g.position.x, q.g.position.z] : null; }
    if (u.hunt){ cx = u.hunt[0]; cz = u.hunt[1]; }
  }
  u.oc = [cx, cz];
  if (U.gunship){ rtsGunship(u, dt, cx, cz); return; }
  const dx = cx - gp.x, dz = cz - gp.z, d = Math.hypot(dx, dz), R = U.orbit;
  let want = Math.atan2(dx, dz);
  if (d < R) want += Math.PI / 2 * (1 - d / R) * 1.1;                     // tangente : il tourne en rond (le bombardier, lui, repasse droit dessus)
  const df = Math.atan2(Math.sin(want - u.head), Math.cos(want - u.head));
  u.head += clamp(df, -U.turn * dt, U.turn * dt);
  const fx = Math.sin(u.head), fz = Math.cos(u.head);
  gp.x += fx * spd * dt; gp.z += fz * spd * dt; gp.y += (U.alt - gp.y) * Math.min(1, dt);
  u.g.rotation.set(0, u.head, -clamp(df, -.6, .6) * .8);
  rtsClampValley(gp, true);
  if (u.cd > 0) return;
  const S2 = rtsS2(u);
  if (U.bomb){ // bombes : quand il passe au-dessus de zombies ou du nid visé
    const n = u.nest && !u.nest.dead && Math.hypot(u.nest.x - gp.x, u.nest.z - gp.z) < 8 ? u.nest : null;
    if (rtsNearestZ(gp.x, gp.z, 8) || n){ u.cd = 1 / rtsStat(u, 'rate'); rtsHit(rtsMuzzle(u, new THREE.Vector3()), { x:gp.x + rand(-1, 1), z:gp.z + rand(-1, 1) }, 'pt', S2); }
    return;
  }
  const t = rtsNearestZ(gp.x, gp.z, rtsStat(u, 'range') + U.alt, fx, fz, -.3);
  if (t){ u.cd = 1 / rtsStat(u, 'rate'); rtsHit(rtsMuzzle(u, new THREE.Vector3()), t, 'z', S2); }
  else if (u.nest && !u.nest.dead){ const n = u.nest, nd = Math.hypot(n.x - gp.x, n.z - gp.z) || 1; if (nd < S2.range + n.r + U.alt && ((n.x - gp.x) * fx + (n.z - gp.z) * fz) / nd > -.3){ u.cd = 1 / rtsStat(u, 'rate'); rtsHit(rtsMuzzle(u, new THREE.Vector3()), n, 'nest', S2); } }
}
// AC-130 : il tourne en virage à gauche autour d'un point, les canons du flanc gauche pointés vers le centre
function rtsGunshipFly(u, dt, cx, cz){
  const U = u.U, gp = u.g.position, spd = rtsStat(u, 'speed'), R = U.orbit;
  const a = Math.atan2(gp.x - cx, gp.z - cz), d = Math.hypot(gp.x - cx, gp.z - cz);
  const aim = d > R * 1.6 ? null : a - .35;            // un point un peu plus loin sur le cercle (sens des aiguilles vu de haut = virage à gauche)
  const tx = aim == null ? cx : cx + Math.sin(aim) * R, tz = aim == null ? cz : cz + Math.cos(aim) * R;
  const want = Math.atan2(tx - gp.x, tz - gp.z), df = Math.atan2(Math.sin(want - u.head), Math.cos(want - u.head));
  u.head += clamp(df, -U.turn * dt, U.turn * dt);
  gp.x += Math.sin(u.head) * spd * dt; gp.z += Math.cos(u.head) * spd * dt; gp.y += (U.alt - gp.y) * Math.min(1, dt);
  u.g.rotation.set(0, u.head, d < R * 1.6 ? .32 : 0);    // il penche vers le centre
  rtsClampValley(gp, true);
}
function rtsGunship(u, dt, cx, cz){
  rtsGunshipFly(u, dt, cx, cz);
  const gp = u.g.position, from = rtsMuzzle(u, new THREE.Vector3());
  u.scanT = (u.scanT || 0) - dt;
  if (u.scanT <= 0){ u.scanT = .3; u.tgt = rtsPickTarget(u, rtsStat(u, 'range'), 6); }
  const t = u.tgt && !u.tgt.dead ? u.tgt : null, n = u.nest && !u.nest.dead && Math.hypot(u.nest.x - gp.x, u.nest.z - gp.z) < rtsStat(u, 'range') ? u.nest : null;
  if (u.cd <= 0 && (t || n)){ u.cd = 1 / rtsStat(u, 'rate'); rtsHit(from, t || n, t ? 'z' : 'nest', rtsS2(u)); }
  if (u.cd2 <= 0 && (t || n)){ u.cd2 = 1 / rtsRate2(u); rtsHit(from, t || n, t ? 'z' : 'nest', rtsS2b(u)); }
  rtsGat(u, dt, t || n, false);
}
function rtsUnits(dt){
  for (const u of RTS.units){
    if (u.dead) continue;
    u.ring.visible = RTS.sel.indexOf(u) >= 0 && RTS.pilot !== u;
    if (u.rotor){ u.rotor.rotation.y += dt * 30; if (u.g.userData.tail) u.g.userData.tail.rotation.x += dt * 40; }
    if (u.g.userData.props) u.g.userData.props.forEach((pr, i) => { pr.rotation.z += dt * (i % 2 ? 23 : 25); });
    u.cd -= dt; u.cd2 -= dt;
    if (RTS.pilot === u) continue;                           // piloté par le joueur
    if (u.U.kind === 'air'){ rtsAir(u, dt); continue; }
    const U = u.U, gp = u.g.position, rng = rtsStat(u, 'range'), spd = rtsStat(u, 'speed');
    u.scanT -= dt;
    let nest = u.nest && !u.nest.dead ? u.nest : null;
    if (u.scanT <= 0){
      u.scanT = rand(.2, .35);
      u.tgt = rtsPickTarget(u, rng + (u.cmd === 'idle' ? 6 : 0), U.splash); u.autoNest = null;
      if (!nest && !u.tgt && u.cmd === 'idle') for (const n of RTS.nests){ if (!n.dead && Math.hypot(n.x - gp.x, n.z - gp.z) < rng + n.r){ u.autoNest = n; break; } }
      // Danger : le zombie au sol le plus proche (les hélicoptères ne craignent que les volants)
      u.near = null; u.nearD = 1e9;
      for (const q of zombies){ if (q.dead || (U.kind === 'heli') !== !!RTS_FLY[q.type]) continue; const d = Math.hypot(q.g.position.x - gp.x, q.g.position.z - gp.z); if (d < u.nearD){ u.nearD = d; u.near = q; } }
      // Trop abîmé : retraite vers l'atelier (ou le QG) ; il revient au combat une fois réparé
      const shop = RTS.blds.some(o => !o.dead && o.B.heal);
      if (!u.retreat && u.hp < u.maxHp * .3 && shop) u.retreat = true;
      else if (u.retreat && (u.hp > u.maxHp * .75 || !shop)) u.retreat = false;
    }
    nest = nest || (u.autoNest && !u.autoNest.dead ? u.autoNest : null);
    // Où aller : retraite > recul devant un zombie trop proche > nid visé > ordre de marche > garde de son poste
    let tx = u.tx, tz = u.tz, go = false, back = false;
    const kite = RTS_KITE[u.type] || 0;
    if (u.retreat){ const h = rtsHealSpot(u); if (h){ const want = (h.B.heal ? h.B.healR * .5 : h.r + 5); if (Math.hypot(h.x - gp.x, h.z - gp.z) > want){ tx = h.x; tz = h.z; go = true; } } }
    else if (kite && u.near && !u.near.dead && u.nearD < kite){
      // Recule : à l'opposé du zombie, un peu vers son poste (et vers la base)
      const ax = gp.x - u.near.g.position.x, az = gp.z - u.near.g.position.z, al = Math.hypot(ax, az) || 1;
      const hx = u.hx - gp.x, hz = u.hz + 6 - gp.z, hl = Math.hypot(hx, hz) || 1;
      tx = gp.x + (ax / al + hx / hl * .35) * 4; tz = gp.z + (az / al + hz / hl * .35) * 4; go = true; back = true;
    }
    else if (u.nest && !u.nest.dead){ const dn = Math.hypot(u.nest.x - gp.x, u.nest.z - gp.z); if (dn > rng + u.nest.r - 2){ tx = u.nest.x; tz = u.nest.z; go = true; } }
    else if (u.cmd === 'move'){ go = true; }
    else if (u.tgt && !u.tgt.dead){
      // Garde : il ne poursuit pas trop loin de son poste
      const tp = u.tgt.g.position, dz = Math.hypot(tp.x - gp.x, tp.z - gp.z);
      if (dz > rng && Math.hypot(tp.x - u.hx, tp.z - u.hz) < RTS_LEASH + rng){ tx = tp.x; tz = tp.z; go = true; }
    } else if (Math.hypot(u.hx - gp.x, u.hz - gp.z) > 2.5){ tx = u.hx; tz = u.hz; go = true; }
    if (go){
      const dx = tx - gp.x, dz = tz - gp.z, d = Math.hypot(dx, dz);
      if (d < .8){ if (u.cmd === 'move'){ u.cmd = 'idle'; u.hx = u.tx; u.hz = u.tz; } }
      else {
        const v = Math.min(d, spd * (back ? .85 : 1) * dt); gp.x += dx / d * v; gp.z += dz / d * v;
        if (!back){ u.head = Math.atan2(dx, dz); u.g.rotation.y = u.head; }
        const was = Math.sin(u.step); u.step += dt * U.speed * 1.6;
        if (U.big && was > 0 !== Math.sin(u.step) > 0 && camera.position.distanceTo(gp) < 45 && typeof mechStomp === 'function') mechStomp();
      }
    }
    if (U.kind === 'ground'){
      for (const o of RTS.units){ if (o === u || o.dead || o.U.kind !== 'ground') continue; const dx = gp.x - o.g.position.x, dz = gp.z - o.g.position.z, d = Math.hypot(dx, dz), m = u.r + o.r; if (d > 0 && d < m){ gp.x += dx / d * (m - d) * .5; gp.z += dz / d * (m - d) * .5; } }
      for (const o of RTS.blds){ if (o.dead) continue; const dx = gp.x - o.x, dz = gp.z - o.z, d = Math.hypot(dx, dz), m = u.r + o.r; if (d > 0 && d < m){ gp.x += dx / d * (m - d); gp.z += dz / d * (m - d); } }
      rtsClampValley(gp, false);
      if (U.cat === 'rob'){ u.m.position.y = Math.abs(Math.sin(u.step * 2)) * (U.big ? .15 : .08); u.m.rotation.z = Math.sin(u.step) * .04; }
    } else { gp.y = U.alt + Math.sin(RTS.t * 1.5 + u.head) * .3; rtsClampValley(gp, true); }
    const tgt = u.tgt && !u.tgt.dead ? u.tgt : null;
    if (u.cd <= 0){
      const S2 = rtsS2(u);
      if (tgt && Math.hypot(tgt.g.position.x - gp.x, tgt.g.position.z - gp.z) <= rng){ u.cd = 1 / rtsStat(u, 'rate'); u.head = Math.atan2(tgt.g.position.x - gp.x, tgt.g.position.z - gp.z); u.g.rotation.y = u.head; rtsHit(rtsMuzzle(u, new THREE.Vector3()), tgt, 'z', S2); }
      else if (nest && Math.hypot(nest.x - gp.x, nest.z - gp.z) <= rng + nest.r){ u.cd = 1 / rtsStat(u, 'rate'); u.head = Math.atan2(nest.x - gp.x, nest.z - gp.z); u.g.rotation.y = u.head; rtsHit(rtsMuzzle(u, new THREE.Vector3()), nest, 'nest', S2); }
    }
    if (RTS_GUNS[u.type] && u.type !== 'bomber'){ const g2 = rtsNearestZ(gp.x, gp.z, rng); rtsGat(u, dt, g2, false); rtsHellfire(u, dt, tgt || g2 || nest, false); }
    // Arme secondaire : roquettes là où les zombies sont serrés, sinon sur le nid
    if (U.w2 && u.cd2 <= 0){
      const S3 = rtsS2b(u), t2 = rtsPickTarget(u, S3.range, S3.splash);
      if (t2){ u.cd2 = 1 / rtsRate2(u); rtsHit(rtsMuzzle(u, new THREE.Vector3()), t2, 'z', S3); }
      else if (nest && Math.hypot(nest.x - gp.x, nest.z - gp.z) <= S3.range + nest.r){ u.cd2 = 1 / rtsRate2(u); rtsHit(rtsMuzzle(u, new THREE.Vector3()), nest, 'nest', S3); }
    }
  }
}
function rtsBuildings(dt){
  for (const o of RTS.blds){
    if (o.dead) continue;
    o.ring.visible = RTS.bsel === o;
    const B = o.B;
    if (B.turret && RTS.pilot === o) continue;
    if (B.turret){
      o.cd -= dt; o.scanT -= dt;
      const rng = rtsTStat(o, 'range'), mn = B.turret.min || 0;
      if (o.scanT <= 0){ o.scanT = rand(.15, .3); let best = null, bd = rng * rng; for (const z of zombies){ if (z.dead) continue; const d = (z.g.position.x - o.x) ** 2 + (z.g.position.z - o.z) ** 2; if (d < bd && d > mn * mn){ bd = d; best = z; } } o.tgt = best; }
      const t = o.tgt && !o.tgt.dead ? o.tgt : null;
      if (t){
        const want = Math.atan2(t.g.position.x - o.x, t.g.position.z - o.z), cur = o.head.rotation.y, df = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
        o.head.rotation.y = cur + clamp(df, -dt * 5, dt * 5);
        if (o.cd <= 0 && Math.abs(df) < .3){ o.cd = 1 / rtsTStat(o, 'rate'); rtsHit(new THREE.Vector3(o.x, 2.2, o.z), t, 'z', Object.assign({}, B.turret, { dmg:rtsTStat(o, 'dmg'), range:rng })); }
      }
    } else if (B.heal){
      o.healT = (o.healT || 0) - dt;
      if (o.healT <= 0){ o.healT = .5; const h = B.heal * .5;
        RTS.units.forEach(u => { if (!u.dead && u.hp < u.maxHp && Math.hypot(u.g.position.x - o.x, u.g.position.z - o.z) < B.healR){ u.hp = Math.min(u.maxHp, u.hp + h); rtsHpSet(u.hpb, u.hp / u.maxHp); } });
        RTS.blds.forEach(b => { if (!b.dead && b !== o && b.hp < b.maxHp && Math.hypot(b.x - o.x, b.z - o.z) < B.healR + b.r){ b.hp = Math.min(b.maxHp, b.hp + h * 2); rtsHpSet(b.hpb, b.hp / b.maxHp); } });
      }
    }
  }
  RTS.incT -= dt;
  if (RTS.incT <= 0){ RTS.incT = 5; const n = RTS.blds.filter(o => !o.dead && o.B.income).length; if (n) S.money += n * RTS_BLD.scrap.income; }
}
function rtsStep(dt){
  if (!RTS.on || RTS.paused || state !== 'rts') return;
  RTS.t += dt; RTS.sndT -= dt;
  rtsThreat();
  for (const n of RTS.nests){
    if (n.dead) continue;
    n.spawnT -= dt;
    if (n.spawnT <= 0){ n.spawnT = Math.max(1.6, rand(6, 9) / Math.sqrt(RTS.threat) / n.pow); const a = Math.atan2(-n.z, -n.x); rtsSpawnAt(n.x + Math.cos(a) * 6, n.z + Math.sin(a) * 6, 1 + Math.floor(RTS.threat * .8 + n.idx / 3)); }
    n.m.scale.setScalar(1 + Math.sin(RTS.t * 2.2 + n.idx) * .015);
  }
  // Hordes : du nord, réparties sur tout le secteur de 90° ; un boss toutes les RTS_CFG.bossEvery hordes
  RTS.hordeT -= dt;
  if (RTS.hordeT <= 0){
    RTS.hordeT = RTS_CFG.hordeEvery; RTS.hordeN++;
    // Plusieurs groupes répartis sur tout le secteur de 90° devant la base (pas seulement par la route)
    const R0 = -rtsFront() + 30, tot = 10 + Math.round(RTS.threat * 5), ng = 3 + Math.floor(Math.random() * 3); let n = 0, E = null;
    for (let gi = 0; gi < ng; gi++){
      const a = (-1 + 2 * (gi + rand(.15, .85)) / ng) * Math.PI / 4, zz = -R0 * Math.cos(a), m = rtsValleyX(zz) - 6, xx = clamp(R0 * Math.sin(a), -m, m);
      n += rtsSpawnAt(xx, zz, Math.ceil(tot / ng), 7); if (!E || Math.random() < .4) E = [xx, zz];
    }
    let sub = n + ' zombies arrivent de partout au nord';
    if (RTS.hordeN % RTS_CFG.bossEvery === 0){ const bt = RTS_BOSS[RTS.bossN++ % RTS_BOSS.length]; if (ZTYPES[bt] && rtsSpawnAt(E[0], E[1] + 6, 1, 2, bt)) sub = 'Un boss arrive : ' + ZTYPES[bt].name + ' !'; }
    banner('Horde n° ' + RTS.hordeN + ' !', sub, 2400);
    if (typeof Snd === 'object' && Snd.groan) Snd.groan();
  }
  for (let i = RTS.shells.length - 1; i >= 0; i--){ const sh = RTS.shells[i]; sh.t -= dt; if (sh.t <= 0){ RTS.shells.splice(i, 1); rtsBlast(sh.x, sh.z, sh.S2); } }
  rtsUnits(dt); rtsBuildings(dt); rtsZombies(dt);
  if (RTS.pilot && state === 'rts') rtsPilotStep(dt);
  groanT -= dt; if (groanT <= 0){ groanT = rand(1.5, 3.5); if (zAliveCount() > 0 && typeof Snd === 'object') Snd.groan(); }
}
function rtsCamStep(dt){
  const C = RTS.cam, k = RTS.keys, sp = C.h * .9 * dt;
  C.x += ((k.r ? 1 : 0) - (k.l ? 1 : 0)) * sp; C.z += ((k.b ? 1 : 0) - (k.f ? 1 : 0)) * sp;
  C.x = clamp(C.x, -170, 170); C.z = clamp(C.z, RTS.zMin, 30); C.h = clamp(C.h, 24, 100);
  camera.position.set(C.x, C.h, C.z + C.h * .38);
  camera.lookAt(C.x, 0, C.z);
}
function rtsFrame(dt){
  if (!RTS.on) return;
  if (RTS.pilot) rtsPilotCam(); else if (state === 'rts' || state === 'rtsover') rtsCamStep(dt);
  if (RTS.pilot && RTS.pilot.U && RTS.pilot.U.gunship && camera.fov !== 38){ camera.fov = 38; camera.updateProjectionMatrix(); } // zoom du canonnier (le zoom du jeu ne s'en mêle pas)
  if (RTS.sky) RTS.sky.position.set(camera.position.x, 0, camera.position.z); // le ciel suit la caméra
  // En pilotage, les barres de vie trop proches des yeux sont cachées (sinon elles bouchent la vue)
  if (RTS.pilot || RTS.hpHid){
    RTS.hpHid = !!RTS.pilot;
    for (const u of RTS.units){ if (u.dead || u === RTS.pilot) continue; const v = !RTS.pilot || camera.position.distanceTo(u.g.position) > 12; u.hpb.bg.visible = u.hpb.fg.visible = v; }
    for (const o of RTS.blds){ if (o.dead) continue; const v = !RTS.pilot || Math.hypot(camera.position.x - o.x, camera.position.z - o.z) > 12 + o.r; o.hpb.bg.visible = o.hpb.fg.visible = v; }
  }
  if (RTS.pilot && RTS.pilot.U && RTS.pilot.U.big && typeof mechCk !== 'undefined'){ // même cockpit que le mode « Robot de combat »
    mechCk.visible = true; Object.keys(mechArmsG).forEach(k => { mechArmsG[k].visible = k === 'minigun' || k === 'rocket'; });
    mechBarrels.rotation.z += dt * 28 * RTS.spin; mechCk.position.y = -Math.sin(RTS.pilot.step * 2) * .03;
    mechFlashL.visible = RTS.spin >= 1 && (RTS.pv.fire || (isTouch && RTS.pv.aim.id !== null)); if (mechFlashL.visible) mechFlashL.material.rotation = Math.random() * 6;
  }
  Object.keys(VMS).forEach(k => { VMS[k].visible = false; });
  rtsHUD();
}

/* ---------- Pilotage à la première personne ---------- */
// Robots, tank et hélicoptère : on avance dans la direction du regard ; avions : toujours en avant, on vire à gauche ou à droite.
const RTS_EYE = { rob:2.6, tank:3.1, heli:.4, air:.6, big:5.4, gun:-1.6 };
function rtsPilot(u){
  if (!u || u.dead || state !== 'rts' || !RTS.on) return false;
  if (RTS.pilot) rtsUnpilot();
  rtsCancelPlace(); RTS.pilot = u; RTS.sel.length = 0; RTS.sel.push(u); RTS.bsel = null;
  const P2 = RTS.pv; P2.yaw = u.head + Math.PI; P2.pitch = u.U.kind === 'air' ? -.35 : u.U.kind === 'heli' ? -.4 : -.12; P2.fire = P2.fire2 = false; RTS.spin = 0;
  P2.joy.dx = P2.joy.dy = 0; P2.joy.id = P2.aim.id = null; Object.keys(P2.mv).forEach(k => { P2.mv[k] = 0; });
  u.m.visible = false; if (u.rotor) u.rotor.visible = false; if (u.g.userData.tail) u.g.userData.tail.visible = false;
  u.hpb.bg.visible = u.hpb.fg.visible = false; u.ring.visible = false;
  rtsInfo.classList.add('hide');
  document.body.classList.add('piloting'); rtsUI.classList.add('piloting'); rtsPilotUI.classList.remove('hide'); rtsPilotUI.classList.toggle('touch', isTouch); $('cross').classList.remove('hide');
  $('rtrpName').textContent = '🎮 ' + u.U.name;
  rtsPilotUI.classList.toggle('w2', !!u.U.w2); $('rtrpFire').textContent = u.U.w1 || 'Tir'; $('rtrpFire2').textContent = u.U.w2 ? u.U.w2.name : '';
  rtsPilotUI.classList.toggle('ac', !!u.U.gunship);
  if (u.U.gunship){
    const c = u.oc || [u.g.position.x, u.g.position.z - 30]; RTS.acC = { x:c[0], z:c[1] };
    const gp = u.g.position, dx = RTS.acC.x - gp.x, dz = RTS.acC.z - gp.z;
    P2.yaw = Math.atan2(-dx, -dz); P2.pitch = -Math.atan2(gp.y, Math.hypot(dx, dz) || 1);
    RTS.fov0 = camera.fov; camera.fov = 38; camera.updateProjectionMatrix(); canvas.classList.add('rt-ac');
  }
  rtsPilotUI.classList.toggle('rp-mech', !!u.U.big);
  if (!isTouch && typeof lockPointer === 'function') lockPointer();
  return true;
}
// Contrôle d'une tourelle (ou du mortier) : vue derrière la tête de la tourelle, on vise et on tire
function rtsTurretPilot(o){
  if (!o || o.dead || !o.B.turret || state !== 'rts') return false;
  if (RTS.pilot) rtsUnpilot();
  rtsCancelPlace(); RTS.pilot = o; RTS.sel.length = 0; RTS.bsel = null; o.ring.visible = false;
  const P2 = RTS.pv; P2.yaw = (o.head ? o.head.rotation.y : 0) + Math.PI; P2.pitch = o.B.turret.splash ? -.45 : -.08; P2.fire = P2.fire2 = false;
  P2.joy.dx = P2.joy.dy = 0; P2.joy.id = P2.aim.id = null;
  rtsInfo.classList.add('hide');
  document.body.classList.add('piloting'); rtsUI.classList.add('piloting'); rtsPilotUI.classList.remove('hide'); rtsPilotUI.classList.toggle('touch', isTouch); $('cross').classList.remove('hide');
  rtsPilotUI.classList.remove('w2', 'ac'); rtsPilotUI.classList.add('tur'); $('rtrpFire').textContent = 'Tir'; $('rtrpName').textContent = '🎮 ' + o.B.name;
  if (o.B.turret.splash){ RTS.mortRing = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 40), new THREE.MeshBasicMaterial({ color:0xffd040, transparent:true, opacity:.9, depthWrite:false, side:THREE.DoubleSide })); RTS.mortRing.rotation.x = -Math.PI / 2; scene.add(RTS.mortRing); }
  if (!isTouch && typeof lockPointer === 'function') lockPointer();
  return true;
}
// Où tombera l'obus du mortier : là où vise le centre de l'écran, entre la portée mini et maxi
function rtsMortarSpot(o){
  rtsTurretCam(); camera.updateMatrixWorld(); rtsRay.setFromCamera(new THREE.Vector2(0, 0), camera);
  const O = rtsRay.ray.origin, d = rtsRay.ray.direction, rng = rtsTStat(o, 'range'), mn = o.B.turret.min || 0;
  let x, z;
  if (d.y < -1e-3){ const t = -O.y / d.y; x = O.x + d.x * t; z = O.z + d.z * t; } else { x = O.x + d.x * rng; z = O.z + d.z * rng; }
  let dx = x - o.x, dz = z - o.z, L = Math.hypot(dx, dz) || 1; const k = clamp(L, mn, rng) / L;
  return { x:o.x + dx * k, z:o.z + dz * k };
}
function rtsTurretStep(dt){
  const o = RTS.pilot, P2 = RTS.pv, T = o.B.turret;
  P2.pitch = clamp(P2.pitch, -1.1, .35);
  if (o.head) o.head.rotation.y = P2.yaw + Math.PI;
  o.cd -= dt;
  const firing = P2.fire || (isTouch && P2.aim.id !== null);
  const S2 = Object.assign({}, T, { dmg:rtsTStat(o, 'dmg'), range:rtsTStat(o, 'range') });
  if (T.splash){
    const sp = rtsMortarSpot(o); RTS.mortSpot = sp;
    if (RTS.mortRing){ RTS.mortRing.position.set(sp.x, .15, sp.z); RTS.mortRing.scale.setScalar(S2.splash); RTS.mortRing.material.opacity = .55 + .35 * Math.sin(RTS.t * 8); }
    if (firing && o.cd <= 0){
      o.cd = 1 / rtsTStat(o, 'rate'); rtsShotSnd('gl'); burst(rtsV.set(o.x, 3, o.z), 'dust', 6, 3);
      RTS.shells.push({ x:sp.x, z:sp.z, t:1 + Math.hypot(sp.x - o.x, sp.z - o.z) / 40, S2 }); // l'obus met un peu de temps à retomber
    }
    return;
  }
  if (firing && o.cd <= 0){ o.cd = 1 / rtsTStat(o, 'rate'); rtsPilotShot({ U:{}, g:{ position:new THREE.Vector3(o.x, 0, o.z) }, type:o.type }, S2); }
}
function rtsTurretCam(){
  const o = RTS.pilot, P2 = RTS.pv, mort = !!o.B.turret.splash, back = mort ? 7 : 2.2, up = mort ? 7 : 3.4;
  camera.position.set(o.x + Math.sin(P2.yaw) * back, up, o.z + Math.cos(P2.yaw) * back);
  camera.rotation.order = 'YXZ'; camera.rotation.set(P2.pitch, P2.yaw, 0);
}
function rtsUnpilot(){
  const u = RTS.pilot; RTS.pilot = null;
  if (u && u.B){ // c'était une tourelle
    if (RTS.mortRing){ scene.remove(RTS.mortRing); RTS.mortRing.geometry.dispose(); RTS.mortRing = null; }
    rtsPilotUI.classList.remove('tur');
    RTS.pv.fire = RTS.pv.fire2 = false; RTS.pv.joy.id = RTS.pv.aim.id = null;
    RTS.cam.x = u.x; RTS.cam.z = u.z; RTS.sel.length = 0; RTS.bsel = null; rtsInfo.classList.add('hide');
    document.body.classList.remove('piloting'); rtsUI.classList.remove('piloting'); rtsPilotUI.classList.add('hide');
    const cr = $('cross'); if (cr) cr.classList.add('hide');
    if (typeof unlockPointer === 'function') unlockPointer();
    return;
  }
  RTS.pv.fire = RTS.pv.fire2 = false; RTS.pv.joy.id = RTS.pv.aim.id = null; RTS.pv.joy.dx = RTS.pv.joy.dy = 0; RTS.spin = 0;
  if (u && u.U.big){ try { if (typeof Snd === 'object' && Snd.mg) Snd.mgTick(0, false); if (typeof mechCk !== 'undefined') mechCk.visible = false; if (typeof mechArms === 'function') mechArms(); } catch (e) {} }
  if (u && !u.dead){
    u.m.visible = true; if (u.rotor) u.rotor.visible = true; if (u.g.userData.tail) u.g.userData.tail.visible = true;
    u.hpb.bg.visible = u.hpb.fg.visible = true; u.cmd = 'idle'; u.nest = null; u.retreat = false; u.tx = u.hx = u.g.position.x; u.tz = u.hz = u.g.position.z;
    RTS.cam.x = u.g.position.x; RTS.cam.z = u.g.position.z;
  }
  if (RTS.fov0){ camera.fov = RTS.fov0; camera.updateProjectionMatrix(); RTS.fov0 = 0; } canvas.classList.remove('rt-ac');
  RTS.sel.length = 0; RTS.bsel = null; if (typeof rtsInfo !== 'undefined' && rtsInfo) rtsInfo.classList.add('hide');
  document.body.classList.remove('piloting');
  if (rtsUI){ rtsUI.classList.remove('piloting'); rtsPilotUI.classList.add('hide'); }
  const cr = $('cross'); if (cr) cr.classList.add('hide');
  if (typeof unlockPointer === 'function') unlockPointer();
  camera.rotation.z = 0;
}
function rtsPilotStep(dt){
  if (RTS.pilot && RTS.pilot.B){ rtsTurretStep(dt); return; }
  const u = RTS.pilot, P2 = RTS.pv; if (!u || u.dead) return;
  const U = u.U, gp = u.g.position, spd = rtsStat(u, 'speed');
  P2.pitch = clamp(P2.pitch, -1.2, .5);
  const fwdIn = clamp(P2.mv.f - P2.mv.b - P2.joy.dy, -1, 1), sideIn = clamp(P2.mv.r - P2.mv.l + P2.joy.dx, -1, 1);
  if (U.gunship){
    const C = RTS.acC, sy = Math.sin(P2.yaw), cy = Math.cos(P2.yaw), mv = 14 * dt;
    C.x += (-sy * fwdIn + cy * sideIn) * mv; C.z += (-cy * fwdIn - sy * sideIn) * mv;
    C.x = clamp(C.x, -160, 160); C.z = clamp(C.z, RTS.zMin, 20);
    const b0 = Math.atan2(-(C.x - gp.x), -(C.z - gp.z));
    rtsGunshipFly(u, dt, C.x, C.z);
    // La vue reste accrochée au sol pendant que l'avion tourne
    const b1 = Math.atan2(-(C.x - gp.x), -(C.z - gp.z)); P2.yaw += Math.atan2(Math.sin(b1 - b0), Math.cos(b1 - b0));
  } else if (U.kind === 'air'){
    P2.yaw -= sideIn * U.turn * dt * 1.3;                                       // on vire
    const k = 1 + Math.max(0, fwdIn) * .4 - Math.max(0, -fwdIn) * .4;           // un peu plus ou moins vite
    gp.x += -Math.sin(P2.yaw) * spd * k * dt; gp.z += -Math.cos(P2.yaw) * spd * k * dt; gp.y += (U.alt - gp.y) * Math.min(1, dt);
    u.head = P2.yaw + Math.PI; u.g.rotation.set(0, u.head, sideIn * .5);
    rtsClampValley(gp, true);
  } else {
    const sy = Math.sin(P2.yaw), cy = Math.cos(P2.yaw), f = fwdIn * spd, s = sideIn * spd * .8;
    gp.x += (-sy * f + cy * s) * dt; gp.z += (-cy * f - sy * s) * dt;
    u.head = P2.yaw + Math.PI; u.g.rotation.y = u.head;
    if (U.kind === 'ground'){
      for (const o of RTS.blds){ if (o.dead) continue; const dx = gp.x - o.x, dz = gp.z - o.z, d = Math.hypot(dx, dz), m = u.r + o.r; if (d > 0 && d < m){ gp.x += dx / d * (m - d); gp.z += dz / d * (m - d); } }
      rtsClampValley(gp, false);
      if (Math.abs(fwdIn) + Math.abs(sideIn) > .1){ const was = Math.sin(u.step); u.step += dt * U.speed * 1.6; if (U.big && was > 0 !== Math.sin(u.step) > 0 && typeof mechStomp === 'function') mechStomp(); }
    } else { gp.y = U.alt; rtsClampValley(gp, true); }
  }
  // Tir : vers ce qui est au centre de l'écran (zombie, nid, sinon le sol)
  const firing = P2.fire || (isTouch && P2.aim.id !== null);
  const trig = (P2.fire || (isTouch && P2.aim.id !== null)) ? true : null;
  if (U.gunship || u.type === 'tank' || u.type === 'heli') rtsGat(u, dt, trig, true);
  if (u.type === 'heli') rtsHellfire(u, dt, P2.fire2 || trig ? true : null, true);
  if (U.gunship && P2.fire2 && u.cd2 <= 0){ u.cd2 = 1 / rtsRate2(u); rtsPilotShot(u, rtsS2b(u)); shake = Math.max(shake, .25); }
  if (U.big){ // minigun : elle monte en régime avant de tirer, avec le vrai son continu du mode robot
    RTS.spin = clamp(RTS.spin + (firing ? dt / .35 : -dt / .8), 0, 1);
    try { if (typeof Snd === 'object' && Snd.mgTick) Snd.mgTick(RTS.spin, firing && RTS.spin >= 1); } catch (e) {}
    if (P2.fire2 && u.cd2 <= 0){ u.cd2 = 1 / rtsRate2(u); rtsPilotShot(u, rtsS2b(u), 1.8); try { Snd.shot('rocket'); } catch (e) {} if (typeof mechFlashR !== 'undefined'){ mechFlashR.visible = true; setTimeout(() => { mechFlashR.visible = false; }, 70); } }
    if (firing && RTS.spin < 1) return;
  }
  if (!firing || u.cd > 0) return;
  u.cd = 1 / rtsStat(u, 'rate');
  const S2 = rtsS2(u);
  if (U.bomb){ rtsHit(rtsMuzzle(u, new THREE.Vector3()), { x:gp.x + rand(-1, 1), z:gp.z + rand(-1, 1) }, 'pt', S2); return; }
  if (U.gunship){ rtsPilotShot(u, S2); return; }
  if (U.big) S2.snd = null; // le son vient de mgTick
  rtsPilotShot(u, S2, U.big ? -1.8 : 0);
}
// Un tir du joueur vers le centre de l'écran : zombie visé, nid, aide à la visée, sinon le sol
function rtsPilotShot(u, S2, side){
  // Le départ du tir est devant et sous les yeux (sinon la traînée passe dans la caméra) ; bras gauche ou droit pour le Mech
  rtsPilotCam(); camera.updateMatrixWorld();
  const from = new THREE.Vector3(), fw = new THREE.Vector3(); camera.getWorldDirection(fw);
  from.copy(camera.position).addScaledVector(fw, 2.5); from.y -= u.U.big ? 1.2 : .8;
  if (side) from.add(rtsV3.set(-fw.z, 0, fw.x).normalize().multiplyScalar(side)); camera.updateMatrixWorld(); rtsRay.setFromCamera(new THREE.Vector2(0, 0), camera); rtsRay.far = 240;
  const hz = rtsRay.intersectObjects(hitMeshes, false).find(h => h.object.userData.z && !h.object.userData.z.dead);
  if (hz){ rtsHit(from, hz.object.userData.z, 'z', S2); return; }
  rtsRoot.updateMatrixWorld(true);
  const hn = rtsRay.intersectObjects(RTS.nests.filter(n => !n.dead).map(n => n.m), false)[0];
  if (hn){ rtsHit(from, hn.object.userData.rtsNest, 'nest', S2); return; }
  const o = rtsRay.ray.origin, d = rtsRay.ray.direction;
  // Aide à la visée : le zombie le plus proche de la ligne de mire (moins de 4°)
  let best = null, bc = Math.cos(.07);
  for (const q of zombies){
    if (q.dead) continue; rtsV3.set(q.g.position.x - o.x, q.g.position.y + (q.aimY || 1.1) - o.y, q.g.position.z - o.z);
    const L = rtsV3.length(); if (L > 200 || L < .5) continue;
    const c = rtsV3.dot(d) / L; if (c > bc){ bc = c; best = q; }
  }
  if (best){ rtsHit(from, best, 'z', S2); return; }
  const t = d.y < -1e-3 ? Math.min(-o.y / d.y, 200) : 120, px = o.x + d.x * t, pz = o.z + d.z * t;
  // Coup au sol : les zombies tout près du point visé sont touchés aussi (tir un peu imprécis)
  const near = rtsNearestZ(px, pz, S2.splash ? 0 : 2.2);
  if (near) rtsHit(from, near, 'z', S2); else rtsHit(from, { x:px, z:pz }, 'pt', S2);
}
function rtsPilotCam(){
  const u = RTS.pilot; if (!u) return;
  if (u.B){ rtsTurretCam(); return; }
  const P2 = RTS.pv, gp = u.g.position, U = u.U, cat = U.cat === 'rob' ? 'rob' : u.type === 'tank' ? 'tank' : U.kind === 'heli' ? 'heli' : 'air';
  const bob = cat === 'rob' ? Math.abs(Math.sin(u.step * 2)) * .12 : 0;
  const ey = U.gunship ? gp.y + RTS_EYE.gun : U.big ? RTS_EYE.big + Math.sin(u.step * 2) * .09 : (U.kind === 'ground' ? RTS_EYE[cat] * (cat === 'rob' ? RTS_SC * (u.type === 'heavy' ? 1.5 : 1) : 1) : gp.y + RTS_EYE[cat]) + bob;
  camera.position.set(gp.x - Math.sin(P2.yaw) * .4, ey, gp.z - Math.cos(P2.yaw) * .4);
  camera.rotation.order = 'YXZ'; camera.rotation.set(P2.pitch, P2.yaw, U.gunship ? 0 : U.kind === 'air' ? u.g.rotation.z * .5 : 0);
}

/* ---------- Affichage ---------- */
const rtsUI = document.createElement('div'); rtsUI.id = 'rtsUI'; rtsUI.className = 'hide';
rtsUI.innerHTML = '<div id="rtTop"><span id="rtMoney"></span><span id="rtThreat"></span><span id="rtNests"></span><span id="rtSel"></span></div>'
  + '<div id="rtBase"><span>QG</span><div class="mk-bar"><i id="rtBaseFill"></i></div></div>'
  + '<div id="rtBoss" class="hide"><span id="rtBossName"></span><div class="mk-bar"><i id="rtBossFill"></i></div></div>'
  + '<button id="rtPause" type="button" aria-label="Pause">❚❚</button>'
  + '<div id="rtPlace" class="hide"><span id="rtPlaceTxt"></span><button type="button" id="rtRot">↻ Tourner</button><button type="button" id="rtOk">Poser ici</button><button type="button" id="rtCancel">Annuler</button></div>'
  + '<div id="rtDock"><div id="rtTabs"><button type="button" data-tab="rob">Robots</button><button type="button" data-tab="veh">Véhicules</button><button type="button" data-tab="bat">Bâtiments</button><button type="button" data-tab="tour">Tourelles</button><button type="button" data-tab="upg">Améliorations</button></div><div id="rtBar"></div></div>';
document.body.appendChild(rtsUI);
const rtsPilotUI = document.createElement('div'); rtsPilotUI.id = 'rtPilot'; rtsPilotUI.className = 'hide';
rtsPilotUI.innerHTML = '<div id="rtrpTop"><span id="rtrpName"></span><button type="button" id="rtrpExit">Retour à la carte</button></div>'
  + '<div id="rtrpAc"><i></i><i></i><i></i><i></i><span>AC-130 · manette : déplacer la zone visée</span></div>'
  + '<div id="rtrpJoy"><div id="rtrpKnob"></div></div><div id="rtrpAim"></div><button type="button" id="rtrpFire">Tir</button><button type="button" id="rtrpFire2">Roquettes</button>'
  + '<div id="rtrpHelp">ZQSD ou WASD : bouger · souris : viser · clic : tirer · clic droit : arme lourde (Mech, AC-130) · F ou Échap : retour à la carte</div>';
document.body.appendChild(rtsPilotUI);
const rtsInfo = document.createElement('div'); rtsInfo.id = 'rtInfo'; rtsInfo.className = 'hide'; document.body.appendChild(rtsInfo);
const rtsPanel = document.createElement('div'); rtsPanel.id = 'rtsPanel'; rtsPanel.className = 'hide'; document.body.appendChild(rtsPanel);
const rtsBox = document.createElement('div'); rtsBox.id = 'rtsBox'; document.body.appendChild(rtsBox);
function rtsShowPanel(html, btns){
  rtsPanel.innerHTML = '<div class="panel">' + html + '<div class="mk-btns">' + btns.map((b, i) => '<button class="' + (i ? 'ghost' : 'big') + '" data-i="' + i + '" type="button">' + b[0] + '</button>').join('') + '</div></div>';
  rtsPanel.querySelectorAll('button[data-i]').forEach(el => el.addEventListener('click', () => { const f = btns[+el.dataset.i][1]; if (f) f(); }));
  rtsPanel.classList.remove('hide');
}
function rtsTab(t){
  if (RTS.tab !== t){ rtsCancelPlace(); if (RTS.bsel){ RTS.bsel = null; rtsInfoShow(); } }
  RTS.tab = t;
  rtsUI.querySelectorAll('#rtTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  const bar = $('rtBar'); let h = '';
  if (t === 'rob' || t === 'veh'){
    h = RTS_ORDER.filter(k => RTS_UNITS[k].cat === t).map(k => { const i = RTS_HOTKEY.indexOf(k); return '<button type="button" class="rt-buy' + (RTS_UNITS[k].big ? ' rt-star' : '') + '" data-t="' + k + '">' + RTS_UNITS[k].name + '<b>' + fmt(RTS_UNITS[k].cost) + '</b><em></em>' + (isTouch || i < 0 ? '' : '<i>' + (i + 1) + '</i>') + '</button>'; }).join('')
      + '<button type="button" id="rtAll">Tout choisir</button><button type="button" id="rtStop">Arrêt</button><button type="button" id="rtPil">🎮 Piloter</button>';
  } else if (t === 'bat' || t === 'tour'){
    h = RTS_BUILD_TABS[t].map(k => '<button type="button" class="rt-bld" data-b="' + k + '">' + RTS_BLD[k].name + '<b>' + fmt(RTS_BLD[k].cost) + '</b></button>').join('');
  } else h = '<button type="button" id="rtUpg">Améliorer les unités…</button>';
  bar.innerHTML = h;
  bar.querySelectorAll('.rt-buy').forEach(b => b.addEventListener('click', () => rtsBuy(b.dataset.t)));
  bar.querySelectorAll('.rt-bld').forEach(b => b.addEventListener('click', () => rtsStartPlace(b.dataset.b)));
  const all = $('rtAll'); if (all) all.addEventListener('click', () => rtsSelect(RTS.units.filter(u => !u.dead && u.U.cat === t), false));
  const st = $('rtStop'); if (st) st.addEventListener('click', () => { RTS.sel.forEach(u => { u.cmd = 'idle'; u.nest = null; u.retreat = false; u.tx = u.hx = u.g.position.x; u.tz = u.hz = u.g.position.z; }); });
  const pl = $('rtPil'); if (pl) pl.addEventListener('click', () => rtsPilotSel());
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
    h = '<div class="nm">' + one.U.name + '</div><div class="ds">' + Math.ceil(one.hp) + ' / ' + Math.ceil(one.maxHp) + ' de vie · ' + Math.round(rtsStat(one, 'dmg')) + ' dégâts · portée ' + Math.round(rtsStat(one, 'range')) + ' m</div>'
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
  const left = RTS.nests.filter(n => !n.dead).length, alive = RTS.units.filter(u => !u.dead).length;
  set('rtMoney', '💰 ' + fmt(Math.floor(S.money)));
  set('rtThreat', '☣ Menace ' + RTS.threat.toFixed(1).replace('.', ','));
  set('rtNests', '🏚 Nids : ' + left + ' actifs · ' + (RTS.nests.length - left) + ' détruits');
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
function rtsPick(cx, cy){
  camera.updateMatrixWorld(); rtsRoot.updateMatrixWorld(true); rtsRay.setFromCamera(rtsNdc(cx, cy), camera); rtsRay.far = Infinity;
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
function rtsTap(cx, cy, add){
  const p = rtsPick(cx, cy);
  if (RTS.place){ if (p.x != null){ if (isTouch) rtsGhostAt(p.x, p.z); else rtsPlaceAt(p.x, p.z); } return; }
  if (p.unit){ if (isTouch){ const i = RTS.sel.indexOf(p.unit); if (i >= 0){ RTS.sel.splice(i, 1); rtsInfoShow(); } else rtsSelect([p.unit], true); } else rtsSelect([p.unit], add); return; }
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
  if (RTS.pilot){ if (e.button === 0) RTS.pv.fire = true; if (e.button === 2) RTS.pv.fire2 = true; if (!plock && typeof lockPointer === 'function') lockPointer(); return; }
  if (e.button === 2){ if (RTS.place){ rtsCancelPlace(); return; } rtsOrder(rtsPick(e.clientX, e.clientY)); return; }
  if (e.button === 0) RTS.drag = { x:e.clientX, y:e.clientY, add:e.shiftKey, box:false };
});
document.addEventListener('pointermove', e => {
  if (state !== 'rts' || e.pointerType === 'touch') return;
  if (RTS.pilot){ if (!RTS.paused){ RTS.pv.yaw -= (e.movementX || 0) * .0022 * sens; RTS.pv.pitch -= (e.movementY || 0) * .0022 * sens; } return; }
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
  else if (e.code === 'Space'){ if (RTS.pilot) RTS.pv.fire = true; else rtsSelect(RTS.units.filter(u => !u.dead), false); e.preventDefault(); }
  else if (e.code === 'Escape' || e.code === 'KeyP'){
    if (RTS.place) rtsCancelPlace();
    else if (RTS.pilot && !RTS.paused) rtsUnpilot();
    else if (RTS.paused){ RTS.paused = false; rtsPanel.classList.add('hide'); }
    else rtsPause();
  }
});
document.addEventListener('keyup', e => { if (RTS_KEYS[e.code]){ RTS.keys[RTS_KEYS[e.code]] = 0; RTS.pv.mv[RTS_KEYS[e.code]] = 0; } if (e.code === 'Space') RTS.pv.fire = false; });
(function(){
  const pts = new Map(); let tap = null;
  canvas.addEventListener('touchstart', e => {
    if (state !== 'rts' || RTS.paused || RTS.pilot) return;
    e.preventDefault(); if (typeof Snd === 'object') Snd.init();
    for (const t of e.changedTouches) pts.set(t.identifier, { x:t.clientX, y:t.clientY });
    if (pts.size === 1){
      const t = e.changedTouches[0]; tap = { x:t.clientX, y:t.clientY, moved:false };
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
    if (tap && !tap.moved && pts.size === 0 && e.changedTouches.length && !RTS.pilot){ const t = e.changedTouches[0]; rtsTap(t.clientX, t.clientY, true); }
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
rtsUI.querySelectorAll('#rtTabs button').forEach(b => b.addEventListener('click', () => rtsTab(b.dataset.tab)));
$('rtPause').addEventListener('click', () => rtsPause());
$('rtCancel').addEventListener('click', () => rtsCancelPlace());
$('rtRot').addEventListener('click', () => rtsRotate());
$('rtOk').addEventListener('click', () => { if (RTS.ghost) rtsPlaceAt(RTS.ghost.x, RTS.ghost.z); });
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
try { const _k = kill; kill = function(z){ const was = z && !z.dead; const r = _k.apply(this, arguments); if (RTS.on && was){ RTS.kills++; if (z.rtsBoss){ RTS.bossKills++; S.money += 1500; banner(ZTYPES[z.type].name + ' abattu !', 'Le boss est tombé · +' + fmt(1500), 2200); } } return r; }; } catch (e) {}
try { if (typeof ambMusicState === 'function'){ const _a = ambMusicState; ambMusicState = function(){ if (state === 'rts'){ for (const z of zombies) if (!z.dead && z.rtsBoss) return 'boss'; return RTS.threat > 3.5 ? 'boss' : 'wave'; } if (state === 'rtsover') return 'menu'; return _a.apply(this, arguments); }; } } catch (e) {}
// Le pointeur est relâché (Échap) pendant qu'on pilote : pause
document.addEventListener('pointerlockchange', () => { if (state === 'rts' && RTS.pilot && !isTouch && !document.pointerLockElement && !RTS.paused) rtsUnpilot(); });

// Accès pour les tests automatiques
window.__rts = { RTS, RTS_UNITS, RTS_CFG, RTS_BLD, RTS_UPG, RTS_ROAD, RTS_BOSS, rtsStart, rtsQuit, rtsBuy, rtsStep, rtsSelect, rtsOrder, rtsPick, rtsSpawnUnit, rtsSpawnAt, rtsNestDie, rtsEnd, rtsPause,
  rtsBuild, rtsBldOk, rtsPlaceBld, rtsTurretUp, rtsSell, rtsUpgBuy, rtsUpgCost, rtsStat, rtsTStat, rtsStartPlace, rtsPlaceAt, rtsTap, rtsTab, rtsInfoShow,
  rtsGhostAt, rtsSnap, rtsRotate, rtsGunship, RTS_UPG_SPEC, rtsUpgPanel, rtsTurretPilot, rtsMortarSpot, rtsPilot, rtsUnpilot, rtsPilotSel, rtsPilotStep, rtsValleyX, rtsRoadDist, rtsClampValley, rtsRoadNext, rtsRoadX, rtsAddNest, rtsFront, rtsPickTarget, RTS_KITE };
