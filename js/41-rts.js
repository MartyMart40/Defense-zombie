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
// Fichiers : 41-rts.js (données, modèles, vallée), 42-rts-unites.js (unités, partie, zombies, boucle),
//   43-rts-pilotage.js (première personne), 44-rts-interface.js (menus, pose, commandes, crochets).

/* ---------- Données ---------- */
// kind : 'ground' (au sol), 'heli' (vole sur place), 'air' (avion : vole en rond, ne s'arrête jamais)
const RTS_UNITS = {
  rifle:   { name:'Fantassin',       cost:150,  hp:320,  dmg:26,  rate:3,   range:18, speed:6,   r:.8,  snd:'pistol',  col:0x4a6fa5, beam:0xffd890, fac:'factory', kind:'ground', cat:'rob' },
  gunner:  { name:'Mitrailleur',     cost:400,  hp:520,  dmg:12,  rate:12,  range:16, speed:5,   r:.9,  snd:'rifle',   col:0x3d6a4a, beam:0xffd890, fac:'factory', kind:'ground', cat:'rob' },
  sniper:  { name:'Tireur d’élite',  cost:500,  hp:300,  dmg:150, rate:.6,  range:42, speed:5.5, r:.8,  snd:'sniper',  col:0x5a5a3a, beam:0xfff0c0, pierce:true, fac:'factory', kind:'ground', cat:'rob' },
  flamebot:{ name:'Robot lance-flammes', cost:450, hp:600, dmg:18, rate:9,  range:11, speed:5,   r:.9,  snd:'flamer',  col:0x8a3a20, flame:true, fac:'factory', kind:'ground', cat:'rob' },
  rocket:  { name:'Lance-roquettes', cost:700,  hp:420,  dmg:170, rate:.8,  range:26, speed:4.5, r:.9,  snd:'gl',      col:0x8a6a2a, splash:3.5, fac:'heavyfac', kind:'ground', cat:'rob' },
  heavy:   { name:'Mech lourd',      cost:1500, hp:2600, dmg:140, rate:1.6, range:22, speed:3.6, r:1.4, snd:'laser',   col:0x6a3a6a, beam:0x50f0ff, pierce:true, fac:'heavyfac', kind:'ground', cat:'rob' },
  tank:    { name:'Tank',            w1:'Canon 120 mm', cost:1800, hp:8000, dmg:900, rate:.33, range:38, speed:5.5, r:2.2, snd:'mg50', col:0x5a6040, splash:6.5, fac:'vehdepot', kind:'ground', cat:'veh' },
  heli:    { name:'Apache',          w1:'30 mm + roquettes', w2n:'Hellfire', cost:2200, hp:1200, dmg:90,  rate:2.2, range:28, speed:12,  r:2.6, snd:'gl', col:0x3a4a3a, splash:3, fac:'heliport', kind:'heli', alt:11, cat:'veh' },
  jet:     { name:'Chasseur',        w1:'Canon 20 mm', cost:3000, hp:800,  dmg:150, rate:10,  range:36, speed:32,  r:3,   snd:'mg50', col:0x6a7080, beam:0xffd890, fac:'airfield', kind:'air', alt:20, orbit:30, turn:1.3, cat:'veh' },
  warthog: { name:'Warthog',         w1:'Canon 30 mm', cost:3800, hp:1500, dmg:110, rate:22,  range:30, speed:18,  r:3,   snd:'mg50',    col:0x6a7058, beam:0xffd890, fac:'airfield', kind:'air', alt:14, orbit:22, turn:1, cat:'veh' },
  mech:    { name:'⭐ Mech de combat', w1:'Minigun',  cost:6000, hp:8000, dmg:36,  rate:20,  range:26, speed:4.5, r:2.6, snd:'minigun', col:0x5a5d50, beam:0xffd890, fac:'heavyfac', kind:'ground', cat:'rob', big:true,
             w2:{ name:'Roquettes', dmg:380, rate:1.5, range:34, splash:4.5, snd:'rocket' } },
  bomber:  { name:'AC-130',          cost:4500, hp:2400, dmg:110, rate:2.5, range:95, speed:16,  r:4,   snd:'sniper',  col:0x5a6068, splash:3, gunship:true, fac:'airfield', kind:'air', alt:60, orbit:45, turn:.7, cat:'veh',
             w1:'40 mm', w2:{ name:'105 mm', dmg:1100, rate:.3, range:95, splash:11, snd:'rocket', big:true } }
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
    chaingun: { name:'Canon de 30 mm',        max:3, desc:'Le canon rotatif sous le nez (déjà là) : +35 % de dégâts par niveau' },
    hellfire: { name:'Missiles Hellfire',     max:3, desc:'Les missiles guidés (déjà là) : +40 % de dégâts par niveau' },
    reactive: { name:'Leurres et blindage',   max:3, desc:'-15 % de dégâts reçus par niveau' },
    sensor:   { name:'Viseur infrarouge',     max:3, desc:'+15 % de portée par niveau' }
  }
};
// Arme d'appoint achetée en amélioration (tir rapide) et missile lourd
const RTS_GUNS = { bomber:{ k:'g25', dmg:22, rate:10, snd:'minigun' }, tank:{ k:'coax', dmg:14, rate:8, snd:'rifle' }, heli:{ k:'chaingun', dmg:26, rate:26, snd:'mg50', base:true } }; // base : l'Apache a son canon dès l'achat
const rtsUpgDef = (type, k) => RTS_UPG[k] || (RTS_UPG_SPEC[type] || {})[k];
const RTS_BLD = {
  hq:       { name:'QG',                     hp:6000, size:6,   cost:0,    fixed:true },
  factory:  { name:'Usine de robots',        hp:2000, size:4,   cost:500,  desc:'Fantassins, mitrailleurs, tireurs d’élite, lance-flammes.' },
  heavyfac: { name:'Usine lourde',           hp:2600, size:5,   cost:1200, desc:'Lance-roquettes et mechs lourds.' },
  vehdepot: { name:'Garage de blindés',      hp:3000, size:5.5, cost:1500, desc:'Fabrique des tanks.' },
  heliport: { name:'Héliport',               hp:2000, size:5,   cost:1800, desc:'Fabrique les hélicoptères Apache.' },
  airfield: { name:'Aérodrome',              hp:3200, size:9,   cost:3000, desc:'Chasseurs, Warthogs et AC-130 : 2 avions par aérodrome, qui viennent y recharger leurs munitions.' },
  scrap:    { name:'Récupérateur',           hp:1200, size:3,   cost:400,  income:15, desc:'+15 $ toutes les 5 s.' },
  repair:   { name:'Atelier de réparation',  hp:1500, size:3.5, cost:700,  heal:45, healR:15, desc:'Répare robots, véhicules et bâtiments autour.' },
  wall:     { name:'Barricade',              hp:2500, size:2.2, cost:60,   desc:'Bloc de béton qui retient les zombies.' },
  t_mg:     { name:'Tourelle mitrailleuse',  hp:900,  size:1.8, cost:250,  turret:{ dmg:26,  rate:8,   range:24, snd:'rifle',  beam:0xffd890 }, desc:'Tir rapide.' },
  t_cannon: { name:'Tourelle canon',         hp:1300, size:2,   cost:450,  turret:{ dmg:130, rate:.9,  range:28, snd:'sniper', beam:0xffc060, pierce:true }, desc:'Obus qui traverse une file.' },
  t_flame:  { name:'Tourelle lance-flammes', hp:1100, size:1.8, cost:400,  turret:{ dmg:16,  rate:10,  range:12, snd:'flamer', flame:true }, desc:'Brûle tout ce qui approche.' },
  t_mortar: { name:'Mortier',                hp:900,  size:2,   cost:600,  turret:{ dmg:150, rate:.5,  range:44, snd:'gl',     splash:5, min:8 }, desc:'Longue portée, explosions.' },
  t_tesla:  { name:'Tourelle Tesla',         hp:1000, size:1.8, cost:700,  turret:{ dmg:80,  rate:2,   range:18, snd:'arc',    chain:4 }, desc:'L’éclair saute de zombie en zombie.' }
};
const RTS_BUILD_TABS = { bat:['factory', 'heavyfac', 'vehdepot', 'heliport', 'airfield', 'scrap', 'repair', 'wall'], tour:['t_mg', 't_cannon', 't_flame', 't_mortar', 't_tesla'] };
const RTS_TMAX = 6;
const RTS_CFG = { money:900, nests:6, nestHp:4500, hordeEvery:45, bounty:500, maxUnits:40, baseR0:30, baseRStep:8, bossEvery:3, bossHp:.25, maxZ:500, maxZTouch:300, chunk:100 };
// Réglages du but et du danger (tâche 101) : un seul endroit pour doser. Le code est dans js/65-rts-ruche.js.
const RTS_REGL = {
  // Menace = 1 + départ de la vallée + temps / t (secondes) × vitesse de la vallée + nid × nids détruits + tués / tues
  menace: { t:200, nid:.8, tues:2400 },
  // Vallée n (1, 2, 3...) : chaque vallée de plus ajoute menace0 à la menace de départ, vitesse à la vitesse du temps,
  // nidHp à la vie des nids et rucheHp à celle de la Ruche (en part de la vallée 1), argent à l'argent de départ
  vallee: { menace0:1, vitesse:.3, nidHp:.25, rucheHp:.5, argent:600 },
  // La Ruche : nids à détruire pour la débusquer, vie, rayon, distance au QG, ponte (secondes, zombies en plus de la menace),
  // garde (zombies autour d'elle à l'apparition, renfort toutes les gardeT secondes quand on l'attaque), récompense ;
  // blindage : part des dégâts des explosions qu'elle reçoit (sinon 20 tanks la rasaient en 30 secondes)
  ruche: { nids:8, hp:160000, r:9, dist:400, ponte:10, ponteN:2, ponteK:.35, garde:20, gardeT:8, gardeN:4, ferraille:300, ferrailleV:150, argent:3000, blindage:.6 },
  // Sièges : toutes les « tous » hordes (avec le boss), pas avant « debut » secondes de jeu, annoncés « annonce » s d'avance, « duree » s de flot fort depuis un côté,
  // puis un creux de « creux » s (ponte des nids × creuxK, le QG se répare de « repare » de sa vie par seconde) ; entre les sièges, ponte × leger et hordes × horde.
  // coup : la grosse horde du début (× une horde normale) ; flot : flotN × menace zombies toutes les flotT s ;
  // force et forceDmg : vie et dégâts des zombies du siège ; monte : chaque siège est plus gros et plus solide que le précédent
  // (nombre et vie × 1 + monte × numéro du siège) ; vue : ils foncent vers le QG et n'attaquent que ce qui est à moins de vue m ;
  // extra : zombies permis au-delà du plafond pendant le siège
  siege: { tous:3, debut:300, annonce:10, duree:40, coup:4, flotT:2.5, flotN:1.2, force:1.7, forceDmg:1.3, monte:.04, vue:9, dist:55, creux:30, creuxK:.3, repare:.005, leger:.6, horde:.6, extra:300, extraCell:120 },
  // Bâtiments : les dégâts d'un zombie ordinaire contre un bâtiment montent comme ceux des boss
  // (dégâts de base × multiplicateur de la menace à la puissance batPow, au lieu de 1) ; place : mètres de mur par zombie
  // qui frappe (un bâtiment ne peut pas être frappé par plus de zombies qu'il n'a de place autour) ; qgMenace : la vie du QG
  // monte de cette part par point de menace (6 000 au départ, 51 600 à menace 20)
  bat: { batPow:.6, place:2.5, qgMenace:.4 }
};
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
  hordeT:0, hordeN:0, bossN:0, bossKills:0, nestN:0, placeRot:0, vallee:1, ruche:null, libre:false, gagne:false, siege:null, ponteK:1, ruins:[], shells:[], chunks:0, zMin:-300, spin:0, lost:0, baseR:30, incT:5, cam:{ x:0, z:-10, h:56 }, keys:{}, drag:null, pinch:null, sndT:0, pilot:null,
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
    if (type === 'heli'){ // Apache : fuselage étroit, deux places l'une derrière l'autre, canon sous le nez, Hellfire et roquettes sur les ailettes
      vmBox(b, 1.1, 1.1, 4.2, c, 0, 0, .4, 0, 0, 0, .35);                                                       // fuselage
      vmBox(b, .8, .55, 1.0, RTS_GLASS, 0, .55, 2.2, .18, 0, 0, .15); vmBox(b, .85, .7, 1.1, RTS_GLASS, 0, .75, 1.1, .1, 0, 0, .15); // verrière en escalier (tireur devant, pilote derrière)
      vmBox(b, .9, .55, 1.2, c, 0, -.1, 2.9, -.1, 0, 0, .25);                                                    // nez et capteurs
      vmCyl(b, .2, .3, RTS_DARK, 0, -.05, 3.55, 0, 0, 0, 8);                                                   // tourelle de visée
      vmBox(b, .3, .3, .3, RTS_DARK, 0, -.75, 2.3, 0, 0, 0, .05); vmCyl(b, .06, 1.2, RTS_DARK, 0, -.8, 3.0, 0, 0, 0, 6); // canon de 30 mm sous le nez
      for (const s of [-1, 1]) vmBox(b, .5, .7, 1.4, c, s * .7, .2, -.1, 0, 0, 0, .15);                         // moteurs sur les flancs
      vmCyl(b, .28, 4.4, c, 0, .25, -3.6, 0, 0, 0, 8, .5); vmBox(b, .14, 1.6, 1.0, c, 0, .95, -5.6, 0, 0, 0, .05); vmBox(b, 1.8, .1, .5, c, 0, .2, -5.4, 0, 0, 0, 0); // queue
      for (const s of [-1, 1]){
        vmBox(b, 1.8, .12, .6, c, s * 1.25, -.15, .5, 0, 0, s * -.06, .02);                                    // ailette
        vmCyl(b, .24, 1.0, VC.oliveD, s * 1.25, -.5, .55, 0, 0, 0, 8);                                          // nacelle de roquettes Hydra
        vmBox(b, .5, .08, .9, RTS_DARK, s * 2.0, -.32, .5, 0, 0, 0, 0);
        for (const dx of [-.12, .12]) for (const dy of [-.5, -.72]) vmCyl(b, .07, .95, 0x8a7a58, s * 2.0 + dx, dy, .55, 0, 0, 0, 6); // 4 Hellfire
        vmBox(b, .1, .5, .1, RTS_DARK, s * .55, -.8, 1.6, 0, 0, 0, 0); vmCyl(b, .2, .14, RTS_DARK, s * .55, -1.05, 1.6, 0, Math.PI / 2, 0, 8); // roues avant
      }
      vmBox(b, .08, .5, .08, RTS_DARK, 0, -.1, -5.6, 0, 0, 0, 0);                                               // roulette de queue
      vmBox(b, .5, .5, .5, RTS_DARK, 0, .95, .4, 0, 0, 0, .05);                                                 // mât du rotor
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
    // Les jambes sont à part (rtsLegGeo) : elles bougent quand le robot marche
    if (type === 'rifle') vmBox(b, .14, .14, .9, VC.park, .55, 1.6, .35, 0, 0, 0, .02);
    else if (type === 'gunner'){ for (let i = 0; i < 4; i++) vmCyl(b, .045, .9, VC.blue, .58 + (i % 2) * .08, 1.55 + Math.floor(i / 2) * .08, .4, 0, 0, 0, 6); vmBox(b, .25, .25, .4, VC.oliveD, -.6, 1.55, 0, 0, 0, 0, .03); }
    else if (type === 'sniper'){ vmBox(b, .12, .12, 1.8, RTS_DARK, .55, 1.65, .8, 0, 0, 0, .02); vmCyl(b, .08, .5, VC.blue, .55, 1.82, .4, 0, 0, 0, 8); vmBox(b, .4, .2, .3, RTS_Y, 0, 2.15, -.1, 0, 0, 0, 0); }
    else if (type === 'flamebot'){ vmCyl(b, .22, .8, VC.red, -.1, 1.75, -.6, Math.PI / 2, 0, 0, 10); vmCyl(b, .1, 1, VC.steel, .55, 1.5, .5, 0, 0, 0, 8); vmCyl(b, .05, .1, [3, 1.3, .3], .55, 1.5, 1.05, 0, 0, 0, 6); }
    else if (type === 'rocket'){ vmBox(b, .45, .4, .6, VC.olive, .62, 1.9, 0, 0, 0, 0, .04); for (let i = 0; i < 4; i++) vmCyl(b, .07, .05, VC.port, .52 + (i % 2) * .2, 1.82 + Math.floor(i / 2) * .16, .31, 0, 0, 0, 8); }
    else { vmCyl(b, .16, 1.6, ARS_C.whiteD, .95, 2.3, .55, 0, 0, 0, 10); for (let i = 0; i < 3; i++) vmRing(b, .2, .16, .06, ARS_C.cyan, .95, 2.3, .1 + i * .3, 0, 0, 0, 10); vmBox(b, .5, .6, .7, VC.blue, -.95, 2.3, 0, 0, 0, 0, .05); }
  });
}
// Une jambe de petit robot (cuisse, tibia, pied), le pivot à la hanche : elle se balance quand le robot marche
const RTS_HIP = 1.155;
function rtsLegGeo(type){
  return rtsGeo('leg_' + type, b => {
    const k = type === 'heavy' ? 1.5 : 1, h = RTS_HIP * k;
    vmBox(b, .22 * k, .75 * k, .26 * k, VC.park, 0, .78 * k - h, 0, 0, 0, 0, .03);
    vmBox(b, .2 * k, .7 * k, .22 * k, VC.blue, 0, .32 * k - h, .05 * k, 0, 0, 0, .03);
    vmBox(b, .3 * k, .08 * k, .45 * k, VC.park, 0, .04 - h, .12 * k, 0, 0, 0, 0);
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
const RTS_FLAT_R = 74; // rayon du sable plat autour de la base (la base va jusqu'à 70 m)
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
  try { if (typeof ambReset === 'function') ambReset(); if (typeof __amb === 'object') __amb.set(pick(['clair', 'clair', 'vent', 'coucher', 'poussiere', 'nuitClaire', 'canicule'])); } catch (e) { errNote(e); }
  try { if (typeof gfxPlaceDebris === 'function') gfxPlaceDebris(); if (typeof gfxPlaceHalos === 'function') gfxPlaceHalos(); } catch (e) { errNote(e); }
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
    // Sable bosselé, mais plat sous la base (rayon max 70 m) : sinon les bosses passent par-dessus la dalle
    const flat = clamp((Math.hypot(x, z) - RTS_FLAT_R) / 12, 0, 1);
    pos.setY(i, flat ? (Math.sin(x * .05) * Math.cos(z * .043) * .12 + Math.sin((x + z) * .11) * .08) * flat : -.03);
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
