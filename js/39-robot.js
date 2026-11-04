'use strict';
/* ================= Mode robot : un mech à deux pattes qui marche de rue en rue ================= */
// Bouton « Robot de combat » sur l'écran titre. Vue du cockpit : minigun au bras gauche, lance-roquettes au bras droit.
// Le robot avance dans la rue (la rue défile vers lui : tapis roulant), se déplace sur les côtés, vise librement.
// Au bout de la rue (MECH_LEN m), fondu au noir et rue suivante (ville suivante) : plus de zombies, plus forts.
// Réutilise le jeu : buildWorld (mêmes décors et météos), spawnZombie / updateZombies (mêmes monstres), fire() et armStep
// (mêmes balles, roquettes, sons, traçantes, secousses, vibrations), kill() (XP et ferraille gagnés pour de vrai).
// Le blindage du robot est S.bar : les zombies qui frappent « la barricade » frappent le robot (s'ils sont devant lui).
// État du jeu : 'mech' (la boucle normale n'appelle pas update ; mechStep le fait), 'mechover' à la fin.
// Contrôles ordi : ZQSD / WASD / flèches pour marcher, souris pour viser, clic gauche minigun, clic droit ou Espace roquettes,
// Échap ou P pause. Cell : manette à gauche, glisser à droite pour viser, boutons Minigun et Roquettes.

const MECH_LEN = 140;          // longueur d'une rue (m)
const MECH_WALK = 5.5;         // vitesse de marche (m/s)
const MECH_STRAFE = 4;         // pas de côté (m/s)
const MECH_CAM = { y:5.4, z:-5.5 };
const MECH_ARMOR = 1500;       // blindage de départ (+250 par rue)
const MECH_HEAT = { shot:.0065, cool:.32, lock:2.2 };   // chaleur de la minigun : par balle, refroidissement par seconde, blocage
const MECH_ROCKET_CD = .65;    // secondes entre deux roquettes
const MECH = { on:false, paused:false, x:0, dist:0, street:1, heat:0, hot:0, rcd:0, kills:0, step:0, stepSide:0, mv:{ f:0, b:0, l:0, r:0 },
  joy:{ id:null, x:0, y:0, dx:0, dy:0 }, aim:{ id:null, lx:0, ly:0 }, mini:false, rocket:false, turn:0, autoFire:store.get('dt_mech_auto', true) !== false, rcdMax:.65, fade:0, fadeTo:null, pow:1, xp0:0, scr0:0, best:+store.get('dt_mech_best', 0) || 0 };

/* ---------- Déblocage et améliorations permanentes (Garage, payées en ferraille) ---------- */
// Le robot se débloque en tombant une première fois en mode infini (partie infinie terminée).
// Sauvegarde : P.mech = { unlocked, lv:{ clé: niveau } } (valeurs par défaut au chargement).
const MECH_UPG = {
  armor:  { name:'Blindage',             max:10, base:80,  desc:'+15 % de blindage par niveau.' },
  mdmg:   { name:'Bras gauche : dégâts', max:10, base:90,  desc:'+12 % de dégâts de l’arme du bras gauche par niveau.' },
  cool:   { name:'Bras gauche : refroidissement', max:8, base:70, desc:'L’arme du bras gauche chauffe 8 % moins vite par niveau.' },
  rdmg:   { name:'Bras droit : dégâts',  max:10, base:100, desc:'+12 % de dégâts de l’arme du bras droit par niveau (explosions comprises).' },
  rrate:  { name:'Bras droit : cadence', max:8,  base:90,  desc:'L’arme du bras droit tire 8 % plus souvent par niveau.' },
  salvo:  { name:'Salve',                max:2,  base:400, desc:'+1 roquette ou grenade par tir (2 puis 3 à la fois).' },
  legs:   { name:'Jambes renforcées',    max:6,  base:70,  desc:'Marche 8 % plus vite par niveau.' },
  repair: { name:'Équipe de réparation', max:5,  base:90,  desc:'+8 % de blindage réparé à chaque nouvelle rue, par niveau.' },
  regen:  { name:'Nanorobots',           max:5,  base:150, desc:'Répare 0,4 % du blindage par seconde, par niveau.' }
};
const MECH_UPG_ORDER = Object.keys(MECH_UPG);
// Armes des bras : on en achète en ferraille au garage, on en équipe une par bras.
//   cd : secondes entre deux tirs du bras droit ; salvo : la salve s'applique ; heat : chauffe (bras gauche, réglée sur la cadence)
const MECH_W = {
  minigun: { side:'L', name:'Minigun',               cost:0,    desc:'Rafale continue, chauffe.' },
  flamer:  { side:'L', name:'Lance-flammes lourd',   cost:600,  desc:'Nappe de feu devant le robot : tout ce qui brûle continue de brûler.' },
  laser:   { side:'L', name:'Laser lourd',           cost:1200, desc:'Rayon instantané qui traverse toute la file.' },
  rocket:  { side:'R', name:'Roquettes',             cost:0,    cd:.65, salvo:true, desc:'Grosses explosions.' },
  gl:      { side:'R', name:'Lance-grenades',        cost:800,  cd:.3,  salvo:true, desc:'Trois grenades par seconde.' },
  arc:     { side:'R', name:'Arc électrique',        cost:1000, cd:.35, desc:'L’éclair saute de zombie en zombie.' },
  railgun: { side:'R', name:'Canon électromagnétique', cost:1500, cd:1.3, desc:'Un trait qui traverse toute la rue.' }
};
const MECH_W_ORDER = Object.keys(MECH_W);
function mechNorm(){
  const o = P.mech && typeof P.mech === 'object' ? P.mech : {}, lv = {};
  MECH_UPG_ORDER.forEach(k => { const v = Math.floor(+((o.lv || {})[k]) || 0); lv[k] = clamp(v, 0, MECH_UPG[k].max); });
  const infDone = !!(P.inf && P.inf.best && Object.keys(P.inf.best).some(k => P.inf.best[k] > 0)); // déjà tombé en infini avant cette mise à jour
  const own = { minigun:true, rocket:true };
  MECH_W_ORDER.forEach(k => { if (o.own && o.own[k]) own[k] = true; });
  const L = own[o.L] && MECH_W[o.L] && MECH_W[o.L].side === 'L' ? o.L : 'minigun', Rr = own[o.R] && MECH_W[o.R] && MECH_W[o.R].side === 'R' ? o.R : 'rocket';
  P.mech = { unlocked: !!o.unlocked || infDone, lv, own, L, R:Rr };
  return P.mech;
}
mechNorm();
const mUp = k => ((P.mech && P.mech.lv && P.mech.lv[k]) || 0);
const mechUpgCost = (k, l) => Math.round(MECH_UPG[k].base * Math.pow(1.55, l));
const mechUnlocked = () => !!(P.mech && P.mech.unlocked);
const mW = side => (P.mech && P.mech[side]) || (side === 'L' ? 'minigun' : 'rocket');
// Acheter (si besoin) puis équiper une arme sur son bras
function mechWeapon(id){
  const W = MECH_W[id]; if (!W) return false;
  if (!P.mech.own[id]){ if ((P.scrap || 0) < W.cost) return false; P.scrap -= W.cost; P.mech.own[id] = true; }
  P.mech[W.side] = id; saveP(); mechArms();
  return true;
}
function mechUpgBuy(k){
  const U = MECH_UPG[k]; if (!U) return false;
  const l = mUp(k), c = mechUpgCost(k, l);
  if (l >= U.max || (P.scrap || 0) < c) return false;
  P.scrap -= c; P.mech.lv[k] = l + 1; saveP();
  return true;
}
function mechUnlock(){
  if (mechUnlocked()) return false;
  P.mech.unlocked = true; saveP(); mechBtn();
  setTimeout(() => { if (typeof toast === 'function') toast('🤖 Robot de combat débloqué ! Il t’attend sur l’écran titre.'); }, 1500);
  return true;
}

/* ---------- Cockpit (dans la scène de l'arme en main, mêmes outils de dessin) ---------- */
const mechCk = new THREE.Group(); mechCk.visible = false; vmCam.add(mechCk);
const mechBarrels = new THREE.Group();
const mechFlashL = new THREE.Sprite(new THREE.SpriteMaterial({ map:vmFlashTex, blending:THREE.AdditiveBlending, depthTest:false, depthWrite:false, color:0xffe0b0 }));
const mechFlashR = new THREE.Sprite(mechFlashL.material.clone());
const mechScreens = [];
const mechArmsG = {};
function mechArmG(id){ const g = new THREE.Group(); g.visible = false; mechCk.add(g); mechArmsG[id] = g; return g; }
// Montre l'arme équipée sur chaque bras ; libellés du HUD et des boutons
function mechArms(){
  const l = mW('L'), r = mW('R');
  Object.keys(mechArmsG).forEach(k => { mechArmsG[k].visible = k === l || k === r; });
  const set = (id, t) => { const el = $(id); if (el) el.textContent = t; };
  set('mkFireL', MECH_W[l].name.split(' ')[0]); set('mkFireR', MECH_W[r].name.split(' ')[0]); set('mkNameL', MECH_W[l].name); set('mkNameR', MECH_W[r].name);
}
(function mechBuild(){
  const b = vmNew(), G = VC.park, D = VC.blue, L = VC.light;
  // Cadre de la verrière : poutre haute, montants obliques, rebord bas
  vmBox(b, 2.4, .1, .12, D, 0, .62, -.85, -.3, 0, 0, .02);
  for (const s of [-1, 1]){
    vmBox(b, .1, 1.5, .12, D, s * 1.02, .05, -.85, 0, 0, s * .22, .02);
    vmBox(b, .04, 1.3, .04, L, s * .97, .05, -.79, 0, 0, s * .22, 0);
    for (let i = 0; i < 4; i++) vmBox(b, .03, .03, .03, VC.steel, s * (1.05 - i * .03), -.4 + i * .3, -.78, 0, 0, 0, 0); // rivets
  }
  // Tableau de bord
  vmBox(b, 2.2, .2, .4, G, 0, -.78, -.8, .35, 0, 0, .03);
  vmBox(b, 2.2, .03, .42, VC.steel, 0, -.675, -.86, .35, 0, 0, 0);
  for (let i = -2; i <= 2; i++) if (i){ vmBox(b, .025, .025, .025, [3, i < 0 ? 1.2 : .3, .2], i * .1, -.68, -.72, 0, 0, 0, 0); }   // voyants
  vmMesh(mechCk, b);
  // Écrans (couleur changée en jeu : vert, ambre, rouge)
  [[-.66, -.7, -.76, .3], [.66, -.7, -.76, -.3]].forEach(p => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.34, .18), new THREE.MeshBasicMaterial({ color:0x2aff8a, transparent:true, opacity:.55, fog:false }));
    m.position.set(p[0], p[1], p[2]); m.rotation.set(-.6, p[3], 0); mechCk.add(m); mechScreens.push(m);
  });
  // Bras gauche : minigun (canons qui tournent)
  const gMini = mechArmG('minigun');
  const a = vmNew();
  vmBox(a, .32, .26, .6, G, -1.05, -.92, -1.25, 0, 0, 0, .04);
  vmCyl(a, .16, .2, D, -1.05, -.9, -1.6, 0, 0, 0, 12);
  vmMesh(gMini, a);
  mechBarrels.position.set(-1.05, -.9, -1.72); gMini.add(mechBarrels);
  const br = vmNew();
  for (let i = 0; i < 6; i++){ const t = i / 6 * Math.PI * 2; vmCyl(br, .035, .9, VC.blue, Math.cos(t) * .09, Math.sin(t) * .09, -.45, 0, 0, 0, 8); }
  vmCyl(br, .14, .04, VC.park, 0, 0, -.05, 0, 0, 0, 12); vmCyl(br, .14, .04, VC.park, 0, 0, -.75, 0, 0, 0, 12);
  vmMesh(mechBarrels, br);
  mechFlashL.position.set(-1.05, -.9, -2.62); mechFlashL.scale.set(.5, .5, 1); mechFlashL.visible = false; mechCk.add(mechFlashL);
  // Bras droit : nacelle de roquettes (6 tubes)
  const gRock = mechArmG('rocket');
  const r = vmNew();
  vmBox(r, .5, .42, .8, VC.olive, 1.1, -.88, -1.4, 0, 0, 0, .05);
  for (let i = 0; i < 6; i++) vmRing(r, .07, .045, .04, VC.oliveD, .96 + (i % 3) * .14, -.8 - Math.floor(i / 3) * .15, -1.81, 0, 0, 0, 10);
  for (let i = 0; i < 6; i++) vmCyl(r, .045, .02, VC.port, .96 + (i % 3) * .14, -.8 - Math.floor(i / 3) * .15, -1.79, 0, 0, 0, 10);
  vmBox(r, .52, .06, .2, [3, .6, .2], 1.1, -.65, -1.1, 0, 0, 0, 0);                                   // bande d'avertissement
  vmMesh(gRock, r);
  // Autres armes des bras (une seule visible par bras)
  let m = vmNew();                                                                                    // lance-flammes lourd
  vmBox(m, .32, .26, .6, G, -1.05, -.92, -1.25, 0, 0, 0, .04);
  vmCyl(m, .14, .5, VC.red, -1.05, -.68, -1.2, 0, 0, 0, 12); vmCyl(m, .145, .04, VC.yellow, -1.05, -.68, -1.2, 0, 0, 0, 12);
  vmCyl(m, .07, .7, VC.steel, -1.05, -.9, -1.85, 0, 0, 0, 10); vmCyl(m, .11, .12, VC.park, -1.05, -.9, -2.2, 0, 0, 0, 10, .7);
  vmCyl(m, .03, .03, [3, 1.3, .3], -1.05, -.98, -2.24, 0, 0, 0, 6);
  vmMesh(mechArmG('flamer'), m);
  m = vmNew();                                                                                        // laser lourd
  vmBox(m, .34, .28, .7, ARS_C.white, -1.05, -.92, -1.35, 0, 0, 0, .05);
  for (let i = 0; i < 2; i++) vmBox(m, .35, .03, .6, ARS_C.cyan, -1.05, -.86 - i * .1, -1.38, 0, 0, 0, 0);
  vmCyl(m, .13, .5, ARS_C.whiteD, -1.05, -.9, -1.95, 0, 0, 0, 12, .7);
  for (let i = 0; i < 3; i++) vmRing(m, .14, .11, .04, VC.park, -1.05, -.9, -1.8 - i * .14, 0, 0, 0, 12);
  vmRing(m, .09, .05, .03, ARS_C.cyan, -1.05, -.9, -2.21, 0, 0, 0, 12);
  vmMesh(mechArmG('laser'), m);
  m = vmNew();                                                                                        // lance-grenades
  vmBox(m, .46, .36, .6, VC.olive, 1.1, -.9, -1.3, 0, 0, 0, .05);
  vmCyl(m, .24, .3, VC.oliveD, 1.1, -.85, -1.55, 0, 0, 0, 14);
  for (let i = 0; i < 6; i++){ const t = i / 6 * 6.283; vmCyl(m, .06, .31, VC.park, 1.1 + Math.cos(t) * .15, -.85 + Math.sin(t) * .15, -1.55, 0, 0, 0, 8); }
  vmCyl(m, .1, .45, VC.park, 1.1, -.85, -1.9, 0, 0, 0, 12);
  vmMesh(mechArmG('gl'), m);
  m = vmNew();                                                                                        // arc électrique
  vmBox(m, .4, .32, .6, VC.blue, 1.1, -.9, -1.25, 0, 0, 0, .05);
  vmCyl(m, .05, .8, VC.steel, 1.1, -.85, -1.75, 0, 0, 0, 8);
  for (let i = 0; i < 7; i++) vmRing(m, .14, .08, .04, ARS_C.copper, 1.1, -.85, -1.5 - i * .08, 0, 0, 0, 12);
  vmCyl(m, .16, .2, ARS_C.violet, 1.1, -.85, -2.2, 0, 0, 0, 12, .4);
  vmMesh(mechArmG('arc'), m);
  m = vmNew();                                                                                        // canon électromagnétique
  vmBox(m, .44, .34, .55, VC.blue, 1.1, -.92, -1.2, 0, 0, 0, .05);
  for (const x of [-.1, .1]) vmBox(m, .06, .2, 1.2, VC.steel, 1.1 + x, -.85, -1.85, 0, 0, 0, .01);
  for (let i = 0; i < 4; i++) vmRing(m, .2, .16, .06, ARS_C.copper, 1.1, -.85, -1.55 - i * .2, 0, 0, 0, 12);
  vmBox(m, .08, .05, 1.2, ARS_C.blueG, 1.1, -.85, -1.85, 0, 0, 0, 0);
  vmMesh(mechArmG('railgun'), m);
  mechFlashR.position.set(1.1, -.85, -2); mechFlashR.scale.set(.7, .7, 1); mechFlashR.visible = false; mechCk.add(mechFlashR);
})();

/* ---------- Affichage : HUD, manettes tactiles, écrans de pause et de fin, fondu ---------- */
const mechUI = document.createElement('div'); mechUI.id = 'mechUI'; mechUI.className = 'hide';
mechUI.innerHTML =
  '<div id="mkTop"><div id="mkStreet"></div><div id="mkKills"></div></div>'
  + '<div id="mkArmor"><span>Blindage</span><div class="mk-bar"><i id="mkArmorFill"></i></div></div>'
  + '<div id="mkBottom"><div class="mk-g"><span id="mkNameL">Minigun</span><div class="mk-bar"><i id="mkHeat"></i></div></div><div class="mk-g"><span id="mkNameR">Roquettes</span><div class="mk-bar"><i id="mkRocket"></i></div></div><div id="mkNext"></div></div>'
  + '<button id="mkPauseBtn" type="button" aria-label="Pause">❚❚</button>'
  + '<div id="mkJoy"><div id="mkKnob"></div></div><div id="mkAim"></div>'
  + '<button id="mkFireL" type="button">Minigun</button><button id="mkFireR" type="button">Roquettes</button>';
document.body.appendChild(mechUI);
const mechFade = document.createElement('div'); mechFade.id = 'mechFade'; document.body.appendChild(mechFade);
const mechPanel = document.createElement('div'); mechPanel.id = 'mechPanel'; mechPanel.className = 'hide'; document.body.appendChild(mechPanel);
function mechShowPanel(html, btns){
  mechPanel.innerHTML = '<div class="panel">' + html + '<div class="mk-btns">' + btns.map((b, i) => '<button class="' + (i ? 'ghost' : 'big') + '" data-i="' + i + '" type="button">' + b[0] + '</button>').join('') + '</div></div>';
  mechPanel.querySelectorAll('button[data-i]').forEach(el => el.addEventListener('click', () => { const f = btns[+el.dataset.i][1]; if (f) f(); }));
  mechPanel.classList.remove('hide');
}
function mechHUD(){
  if (!MECH.on || !S) return;
  const set = (id, t) => { const el = $(id); if (el && el.textContent !== t) el.textContent = t; };
  set('mkStreet', 'Rue ' + MECH.street + ' · ' + (curLoc ? curLoc.name : ''));
  set('mkKills', fmtN(MECH.kills) + ' zombies abattus');
  set('mkNext', MECH.dist < MECH_LEN ? 'Prochaine rue : ' + Math.ceil(MECH_LEN - MECH.dist) + ' m' : 'Rue suivante…');
  const a = $('mkArmorFill'); if (a){ const k = clamp(S.bar / S.barMax, 0, 1); a.style.width = (k * 100).toFixed(1) + '%'; a.parentNode.parentNode.classList.toggle('low', k < .3); }
  const h = $('mkHeat'); if (h){ h.style.width = (MECH.heat * 100).toFixed(0) + '%'; h.classList.toggle('hot', MECH.hot > 0); }
  const r = $('mkRocket'); if (r) r.style.width = ((1 - clamp(MECH.rcd / Math.max(.05, MECH.rcdMax || MECH_ROCKET_CD), 0, 1)) * 100).toFixed(0) + '%';
  const col = MECH.hot > 0 || S.bar < S.barMax * .3 ? 0xff4a3a : MECH.heat > .7 ? 0xffb030 : 0x2aff8a;
  mechScreens.forEach(m => m.material.color.setHex(col));
}

/* ---------- Démarrer, quitter ---------- */
function mechHideBarricade(){
  if (!world) return;
  world.children.forEach(o => {
    if (o.isGroup && o.children.length >= 6 && o.children.every(c => Math.abs(c.position.z - BAR_Z) < 1.4)) o.visible = !MECH.on;
  });
}
function mechPlan(){
  const n = MECH.street, w = Math.min(10, n + 1), L = curLoc;
  const p = hordePlan(60 + 35 * n, { wave:w, loc:L, maxAlive:Math.min(DEV_CAP, (isTouch ? 45 : 70) + 12 * n), interval:Math.max(.12, .55 - .04 * n), burst:Math.min(4, 1 + Math.floor(n / 2)) });
  p.hpMult *= Math.pow(1.22, n - 1); p.dmgMult *= Math.pow(1.12, n - 1);
  // Grosse baston : un boss au milieu de la rue, toutes les 3 rues
  if (n % 3 === 0 && !MECH.bossDone && typeof bossReady === 'function' && bossReady()){ p.queue.splice(Math.round(p.queue.length * .5), 0, 'boss'); MECH.bossDone = true; }
  return p;
}
function mechStreet(first){
  // MECH.route : rue choisie au carrefour (40-robot-monstres.js) ; sinon la ville suivante
  const RT = !first && MECH.route ? MECH.route : null;
  const L = (RT && RT.loc) || LOCS[(MECH.street - 1) % LOCS.length];
  curLoc = L;
  buildWorld(L);
  try { if (typeof __amb === 'object') __amb.set(RT && RT.weather ? RT.weather : first ? 'soleil' : __amb.pick(L, MECH.street + 1)); } catch (e) {}
  mechHideBarricade();
  world.position.z = 0; MECH.dist = 0; MECH.x = 0; MECH.bossDone = false;
  clearZombies();
  plan = mechPlan(); spawnT = 1.5;
  MECH.pow = 2.4 * Math.pow(1.16, MECH.street - 1);       // les armes du robot montent avec les rues
  if (!first){ S.barMax += 250; S.bar = Math.min(S.barMax, S.bar + S.barMax * (.35 + .08 * mUp('repair'))); } // réparation à chaque rue
  if (typeof saveP === 'function') saveP();
  banner('Rue ' + MECH.street, (RT && RT.title ? RT.title + ' · ' : '') + L.name + (first ? ' : avance et nettoie la rue' : ' · blindage réparé'), 2200);
}
function mechStart(){
  if (typeof Snd === 'object') Snd.init();
  if (typeof infLeave === 'function') try { infLeave(); } catch (e) {}
  newGame();
  MECH.on = true; MECH.paused = false; MECH.street = 1; MECH.kills = 0; MECH.heat = 0; MECH.hot = 0; MECH.rcd = 0; MECH.step = 0;
  MECH.mini = MECH.rocket = false; Object.keys(MECH.mv).forEach(k => { MECH.mv[k] = 0; });
  MECH.xp0 = P.xp || 0; MECH.scr0 = P.scrap || 0;
  MECH_W_ORDER.forEach(id => { S.owned[id] = true; S.ammo[id] = magSize(id); });
  mechArms();
  S.barMax = S.bar = Math.round(MECH_ARMOR * (1 + .15 * mUp('armor'))); S.cur = 'minigun'; S.wave = 1;
  yaw = 0; pitch = -.2; MECH.turn = 0; firing = false; zoomed = false; cool = 0; reloadT = 0;
  mechStreet(true);
  state = 'mech';
  showScreen(null); mechPanel.classList.add('hide');
  $('hud').classList.add('hide'); $('touch').classList.add('hide'); $('cross').classList.remove('hide');
  document.body.classList.add('mech', 'aiming');
  mechUI.classList.remove('hide'); mechUI.classList.toggle('touch', isTouch);
  mechCk.visible = true;
  if (typeof lockPointer === 'function') lockPointer();
}
function mechQuit(){
  MECH.on = false; MECH.paused = false; firing = false;
  if (typeof Snd === 'object' && Snd._mgStop) Snd._mgStop();
  mechUI.classList.add('hide'); mechPanel.classList.add('hide'); mechCk.visible = false;
  document.body.classList.remove('mech', 'aiming');
  if (world) world.position.z = 0;
  camera.position.copy(EYE); camera.rotation.z = 0;
  clearZombies();
  if (typeof unlockPointer === 'function') unlockPointer();
  state = 'menu'; curLoc = LOCS[0]; buildWorld(curLoc); newGame(); plan = wavePlan(1);
  if (typeof saveP === 'function') saveP();
  showScreen('scrTitle'); $('hud').classList.add('hide'); $('cross').classList.add('hide');
}
function mechPause(){
  if (state !== 'mech' || MECH.paused) return;
  MECH.paused = true; firing = false; MECH.mini = MECH.rocket = false;
  if (typeof unlockPointer === 'function') unlockPointer();
  const auto = () => 'Tir en visant (cell) : ' + (MECH.autoFire ? 'activé' : 'coupé');
  mechShowPanel('<h2 class="title sm">Pause</h2><p class="lead">Rue ' + MECH.street + ' · ' + fmtN(MECH.kills) + ' zombies abattus</p>',
    [['Reprendre', mechResume], [auto(), () => { MECH.autoFire = !MECH.autoFire; store.set('dt_mech_auto', MECH.autoFire); mechPause.again(); }], ['Quitter le robot', mechQuit]]);
}
mechPause.again = () => { MECH.paused = false; mechPause(); };
function mechResume(){ MECH.paused = false; mechPanel.classList.add('hide'); if (typeof lockPointer === 'function') lockPointer(); }
function mechOver(){
  state = 'mechover'; firing = false; MECH.mini = MECH.rocket = false;
  if (typeof Snd === 'object'){ if (Snd._mgStop) Snd._mgStop(); if (Snd.boom) Snd.boom(2); }
  shake = 1;
  const rec = MECH.street > MECH.best; if (rec){ MECH.best = MECH.street; store.set('dt_mech_best', MECH.best); }
  const xp = Math.max(0, Math.round((P.xp || 0) - MECH.xp0)), scr = Math.max(0, Math.round((P.scrap || 0) - MECH.scr0));
  if (typeof saveP === 'function') saveP();
  if (typeof unlockPointer === 'function') unlockPointer();
  setTimeout(() => mechShowPanel('<h2 class="title sm">Robot détruit</h2><div class="stats">'
    + '<span>Rues traversées : <strong>' + (MECH.street - 1) + '</strong>' + (rec ? ' · nouveau record !' : ' · record : ' + MECH.best) + '</span>'
    + '<span>Zombies abattus : <strong>' + fmtN(MECH.kills) + '</strong></span>'
    + '<span>Expérience : <strong>+' + fmtN(xp) + '</strong> · Ferraille : <strong>+' + fmtN(scr) + ' ⚙</strong></span></div>',
    [['Recommencer', mechStart], ['Garage', () => { mechQuit(); mechGarage(); }], ['Menu', mechQuit]]), 1200);
}

/* ---------- Chaque image ---------- */
const mkV = new THREE.Vector3(), mkR = new THREE.Vector3(), mkU = new THREE.Vector3(), mkF = new THREE.Vector3();
function mechTread(d){
  // La rue défile vers le robot : décor, zombies, roquettes, effets
  if (world) world.position.z += d;
  for (const z of zombies){
    // En avançant, le robot pousse ceux qui l'attaquent de face (ils restent devant lui)
    if (d > 0 && !z.dead && z.st === 'attack' && !z.mechBack && z.g.position.z < MECH_CAM.z) continue;
    z.g.position.z += d;
  }
  if (typeof ARM === 'object') ['rockets', 'bolts', 'flames', 'booms'].forEach(k => (ARM[k] || []).forEach(o => { if (o.m && o.m.visible) o.m.position.z += d; }));
  if (typeof __gfx === 'object'){
    const G = __gfx; Object.keys(G.gfxDeb).forEach(k => { G.gfxDeb[k].position.z += d; });
    G.gfxPuddles.forEach(m => { m.position.z += d; if (m.position.z > 0) m.position.z -= 95; });
    G.gfxHalos.forEach(h => { h.position.z += d; });
    G.gfxMist.forEach(m => { m.position.z += d; if (m.position.z > -10) m.position.z -= 90; });
    G.gfxSmoke.forEach(o => { if (o.s.visible) o.s.position.z += d; });
  }
}
function mechStep(dt){
  if (!MECH.on || MECH.paused || state !== 'mech') return;
  // Le robot tourne sur lui-même sans limite (pour revenir sur ses pas) ; visée verticale bornée
  yaw += MECH.turn * 1.9 * dt; pitch = clamp(pitch, PITCH_MIN, .45);
  if (yaw > Math.PI) yaw -= Math.PI * 2; else if (yaw < -Math.PI) yaw += Math.PI * 2;
  recoilAcc *= Math.exp(-7 * dt);
  // Déplacements dans la direction du regard (manette tactile ou clavier)
  const fwdIn = clamp(MECH.mv.f - MECH.mv.b - MECH.joy.dy, -1, 1), sideIn = clamp(MECH.mv.r - MECH.mv.l + MECH.joy.dx, -1, 1);
  const spd = MECH_WALK * (1 + .08 * mUp('legs')), fw = fwdIn > 0 ? fwdIn * spd : fwdIn * spd * .6, st = sideIn * MECH_STRAFE;
  if (mUp('regen') && S.bar > 0) S.bar = Math.min(S.barMax, S.bar + S.barMax * .004 * mUp('regen') * dt); // nanorobots
  const sy = Math.sin(yaw), cy = Math.cos(yaw);
  const vx = -sy * fw + cy * st, vz = -cy * fw - sy * st;          // vitesse dans la rue (z négatif = vers le bout de la rue)
  let d = -vz * dt; if (MECH.dist + d < 0) d = -MECH.dist;         // pas avant le début de la rue
  if (Math.abs(d) > 1e-6){ mechTread(d); MECH.dist += d; }
  MECH.x = clamp(MECH.x + vx * dt, -9, 9);
  const walk = fw;
  const moving = Math.abs(fw) > .1 || Math.abs(sideIn) > .1;
  if (moving){
    const was = Math.sin(MECH.step); MECH.step += dt * 2.6 * Math.max(Math.abs(fwdIn), Math.abs(sideIn));
    if (was > 0 !== Math.sin(MECH.step) > 0) mechStomp(); // un pied touche le sol
  }
  // Armes : bras gauche en continu (chauffe), bras droit au coup par coup
  const wl = mW('L'), wr = mW('R'), WL = WEAPONS[wl];
  const lHeld = MECH.mini || (MECH.autoFire && MECH.aim.id !== null); // cell : glisser pour viser tire aussi
  cool -= dt; MECH.rcd = Math.max(0, MECH.rcd - dt);
  if (MECH.hot > 0){ MECH.hot -= dt; if (MECH.hot <= 0) MECH.heat = .6; }
  else MECH.heat = Math.max(0, MECH.heat - MECH_HEAT.cool * dt * (lHeld ? .35 : 1));
  MECH_W_ORDER.forEach(id => { S.ammo[id] = magSize(id); }); reloadT = 0;
  if (MECH.rocket && MECH.rcd <= 0){
    S.cur = wr; const c0 = cool; cool = 0; MECH.src = 'right';
    try { fire(); if (MECH_W[wr].salvo) for (let i = 0; i < mUp('salvo'); i++) mechExtraRocket(wr); }
    finally { S.cur = wl; cool = c0; MECH.src = null; recoilAcc = Math.min(recoilAcc, .015); } // le robot absorbe le recul
    MECH.rcdMax = MECH_W[wr].cd * Math.max(.3, 1 - .08 * mUp('rrate')); MECH.rcd = MECH.rcdMax;
    mechFlashR.visible = true; setTimeout(() => { mechFlashR.visible = false; }, 70);
  }
  S.cur = wl;
  firing = lHeld && MECH.hot <= 0;
  if (typeof armStep === 'function') armStep(dt); // montée en régime, roquettes et flammes en vol
  if (firing && cool <= 0 && (wl !== 'minigun' || typeof spin === 'undefined' || spin >= 1)){
    fire(); MECH.heat += MECH_HEAT.shot * (20 / Math.max(1, WL.rate)) * Math.max(.3, 1 - .08 * mUp('cool')); recoilAcc = Math.min(recoilAcc, .012); // le robot absorbe le recul
    if (MECH.heat >= 1){ MECH.heat = 1; MECH.hot = MECH_HEAT.lock; banner('Surchauffe !', MECH_W[wl].name + ' : refroidissement', 1200); }
    mechFlashL.visible = wl !== 'flamer'; mechFlashL.material.rotation = Math.random() * 6;
  } else if (!firing) mechFlashL.visible = false;
  mechBarrels.rotation.z += dt * 28 * (typeof spin === 'number' ? spin : 0);
  // Zombies : apparitions au bout de la rue, ils se tournent vers le robot
  if (!plan.queue.length) plan = mechPlan();
  spawnT -= dt;
  let alive = zAliveCount();
  if (spawnT <= 0 && alive < plan.maxAlive){
    for (let k = plan.burst || 1; k > 0 && alive < plan.maxAlive && plan.queue.length; k--){ spawnZombie(plan.queue.pop()); alive = zAliveCount(); }
    spawnT = plan.interval * rand(.6, 1.4);
  }
  const MZ = MECH_CAM.z;
  for (const z of zombies){
    if (z.dead || !z.g) continue;
    const gp = z.g.position; if (gp.z < -45) continue;
    gp.x += clamp(MECH.x - gp.x, -1, 1) * (z.st === 'attack' ? 2.2 : .9) * dt; // ils convergent vers le robot
    // Ceux qui sont passés derrière le robot font demi-tour et le poursuivent (zombies qui marchent seulement)
    if (!MECH_GROUND[z.type]) continue;
    if (z.stopZ0 == null) z.stopZ0 = z.stopZ;
    const back = gp.z > MZ - 1;
    if (back){
      z.mechBack = true; z.stopZ = 1e6; z.g.rotation.y = Math.PI;
      const dd = Math.hypot(gp.x - MECH.x, gp.z - MZ);
      if (z.st === 'walk'){ gp.z -= z.speed * 2 * dt; if (dd < 3.2){ z.st = 'attack'; z.atkT = rand(.2, .6); } } // la marche normale avance de +speed : on inverse
      else if (z.st === 'attack' && dd > 4.5) z.st = 'walk';
    } else if (z.mechBack){ z.mechBack = false; z.stopZ = z.stopZ0; z.g.rotation.y = 0; if (gp.z > z.stopZ){ gp.z = z.stopZ; } }
  }
  updateZombies(dt);
  if (typeof comboTick === 'function') comboTick(dt); // le combo retombe comme en partie normale
  groanT -= dt;
  if (groanT <= 0){ groanT = rand(1.2, 3); if (zAliveCount() > 0) Snd.groan(); }
  // Fin de rue
  if (MECH.dist >= MECH_LEN && MECH.fade <= 0){ MECH.fade = 1.2; MECH.fadeTo = 'street'; }
  if (S.bar <= 0) mechOver();
}
function mechStomp(){
  shake = Math.max(shake, .14);
  if (typeof Snd === 'object' && Snd.ctx && Snd._nz){
    try { const t = Snd.ctx.currentTime; Snd._nz(t, 'lowpass', 260, 1, .3, .35); Snd._osc(t, 'sine', 62, 34, .28, .45); Snd._nz(t + .05, 'bandpass', 1400, 4, .06, .05); } catch (e) {}
  }
  if (typeof vib === 'function') vib(28, 2);
}
function mechFrame(dt){
  if (!MECH.on) return;
  // Fondu entre deux rues
  if (MECH.fade > 0){
    const was = MECH.fade; MECH.fade -= dt;
    if (was > .6 && MECH.fade <= .6 && MECH.fadeTo === 'street'){ MECH.street++; S.wave = MECH.street; mechStreet(false); }
    mechFade.style.opacity = String(clamp(1 - Math.abs(MECH.fade - .6) / .6, 0, 1));
  } else if (mechFade.style.opacity !== '0') mechFade.style.opacity = '0';
  // Caméra du cockpit : balancement de la marche
  const bob = Math.sin(MECH.step * 2) * .09, roll = Math.sin(MECH.step) * .012;
  camera.position.set(MECH.x + Math.sin(MECH.step) * .06, MECH_CAM.y + bob, MECH_CAM.z);
  camera.rotation.z = roll;
  // Les armes en main sont cachées : le cockpit les remplace
  Object.keys(VMS).forEach(k => { VMS[k].visible = false; });
  mechCk.visible = state === 'mech' || state === 'mechover';
  mechCk.position.y = -bob * .3;
  mechHUD();
}

// Zombies qui marchent au sol (les volants, sauteurs, cracheurs, colosses et boss gardent leur façon de faire)
const MECH_GROUND = { walker:1, runner:1, brute:1, crawler:1, bloater:1, shield:1, clown:1 };
// Salve : roquettes ou grenades en plus, légèrement écartées
function mechExtraRocket(id){
  if (typeof armLaunch !== 'function' || typeof ARM !== 'object') return;
  armLaunch(id || 'rocket');
  let o = null; for (const r of ARM.rockets) if (r.m.visible && r.life === 0) o = r;
  if (o){ const sp = o.v.length(); o.v.x += rand(-.05, .05) * sp; o.v.y += rand(-.02, .04) * sp; o.v.setLength(sp); o.m.position.x += rand(-.3, .3); }
}
/* ---------- Garage : améliorations et départ ---------- */
function mechGarage(){
  if (!mechUnlocked()){ if (typeof toast === 'function') toast('Tombe une première fois en mode infini pour débloquer le robot'); return; }
  showScreen(null);
  let h = '<h2 class="title sm">Garage du robot</h2><div class="stats"><span>Ferraille : <strong>' + fmtN(Math.floor(P.scrap || 0)) + ' ⚙</strong></span>'
    + '<span>Record : <strong>' + MECH.best + ' rue' + (MECH.best > 1 ? 's' : '') + '</strong></span></div><div class="mk-upg">';
  [['L', 'Bras gauche (en continu)'], ['R', 'Bras droit (coup par coup)']].forEach(sd => {
    h += '<h4 class="wuh">' + sd[1] + '</h4>';
    MECH_W_ORDER.filter(id => MECH_W[id].side === sd[0]).forEach(id => {
      const W = MECH_W[id], own = !!P.mech.own[id], on = mW(sd[0]) === id;
      h += '<div class="row"><div class="info"><div class="nm">' + W.name + (on ? ' ✓' : '') + '</div><div class="ds">' + W.desc + '</div></div>'
        + '<button type="button" data-w="' + id + '"' + (on || (!own && (P.scrap || 0) < W.cost) ? ' disabled' : '') + '>' + (on ? 'Équipée' : own ? 'Équiper' : fmtN(W.cost) + ' ⚙') + '</button></div>';
    });
  });
  h += '<h4 class="wuh">Améliorations</h4>';
  MECH_UPG_ORDER.forEach(k => {
    const U = MECH_UPG[k], l = mUp(k), max = l >= U.max, c = mechUpgCost(k, l);
    h += '<div class="row"><div class="info"><div class="nm">' + U.name + ' <span class="inf-lv">' + l + ' / ' + U.max + '</span></div><div class="ds">' + U.desc + '</div></div>'
      + '<button type="button" data-k="' + k + '"' + (max || (P.scrap || 0) < c ? ' disabled' : '') + '>' + (max ? 'Max' : fmtN(c) + ' ⚙') + '</button></div>';
  });
  h += '</div>';
  mechShowPanel(h, [['Partir au combat', mechStart], ['Retour', () => { mechPanel.classList.add('hide'); showScreen('scrTitle'); }]]);
  mechPanel.querySelectorAll('button[data-k]').forEach(b => b.addEventListener('click', () => { if (mechUpgBuy(b.dataset.k)){ if (typeof Snd === 'object' && Snd.buy) Snd.buy(); mechGarage(); } }));
  mechPanel.querySelectorAll('button[data-w]').forEach(b => b.addEventListener('click', () => { if (mechWeapon(b.dataset.w)){ if (typeof Snd === 'object' && Snd.buy) Snd.buy(); mechGarage(); } }));
}
function mechBtn(){
  const b = $('btnMech'); if (!b) return;
  const on = mechUnlocked();
  b.textContent = on ? '🤖 Robot de combat' : '🔒 Robot de combat (tombe en mode infini)';
  b.classList.toggle('locked', !on);
}

/* ---------- Entrées ---------- */
const MECH_KEYS = { KeyW:'f', KeyZ:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', KeyQ:'l', KeyD:'r' };
const MECH_TURN = { ArrowLeft:1, KeyE:-1, ArrowRight:-1 }; // flèches gauche et droite : tourner
document.addEventListener('keydown', e => {
  if (state !== 'mech') return;
  if (MECH_KEYS[e.code]){ MECH.mv[MECH_KEYS[e.code]] = 1; e.preventDefault(); }
  else if (MECH_TURN[e.code]){ MECH.turn = MECH_TURN[e.code]; e.preventDefault(); }
  else if (e.code === 'Space'){ MECH.rocket = true; e.preventDefault(); }
  else if (e.code === 'Escape' || e.code === 'KeyP'){ if (MECH.paused) mechResume(); else mechPause(); }
});
document.addEventListener('keyup', e => {
  if (MECH_KEYS[e.code]) MECH.mv[MECH_KEYS[e.code]] = 0;
  if (MECH_TURN[e.code] && MECH.turn === MECH_TURN[e.code]) MECH.turn = 0;
  if (e.code === 'Space') MECH.rocket = false;
});
document.addEventListener('mousemove', e => {
  if (state !== 'mech' || MECH.paused || isTouch) return;
  // Toujours en relatif : le robot peut faire un tour complet
  if ((typeof plock !== 'undefined' && plock) || e.target === canvas){ yaw -= (e.movementX || 0) * .0022 * sens; pitch -= (e.movementY || 0) * .0022 * sens; }
});
canvas.addEventListener('mousedown', e => {
  if (state !== 'mech' || MECH.paused) return;
  if (typeof Snd === 'object') Snd.init();
  if (typeof canLock !== 'undefined' && canLock && !plock) lockPointer();
  if (e.button === 0) MECH.mini = true;
  if (e.button === 2) MECH.rocket = true;
});
document.addEventListener('mouseup', e => { if (e.button === 0) MECH.mini = false; if (e.button === 2) MECH.rocket = false; });
document.addEventListener('pointerlockchange', () => { if (state === 'mech' && !document.pointerLockElement && !MECH.paused && typeof wantLock !== 'undefined' && wantLock) mechPause(); });
// Tactile : manette, visée, boutons
(function(){
  const joy = $('mkJoy'), knob = $('mkKnob'), aimZ = $('mkAim');
  const R = 46;
  const setJoy = (cx, cy) => {
    const b = joy.getBoundingClientRect(), x = cx - (b.left + b.width / 2), y = cy - (b.top + b.height / 2), d = Math.hypot(x, y), k = d > R ? R / d : 1;
    MECH.joy.dx = clamp(x * k / R, -1, 1); MECH.joy.dy = clamp(y * k / R, -1, 1);
    knob.style.transform = 'translate(' + (x * k).toFixed(0) + 'px,' + (y * k).toFixed(0) + 'px)';
  };
  joy.addEventListener('touchstart', e => { e.preventDefault(); Snd.init(); const t = e.changedTouches[0]; MECH.joy.id = t.identifier; setJoy(t.clientX, t.clientY); }, { passive:false });
  aimZ.addEventListener('touchstart', e => { e.preventDefault(); Snd.init(); const t = e.changedTouches[0]; MECH.aim.id = t.identifier; MECH.aim.lx = t.clientX; MECH.aim.ly = t.clientY; }, { passive:false });
  mechUI.addEventListener('touchmove', e => {
    for (const t of e.changedTouches){
      if (t.identifier === MECH.joy.id) setJoy(t.clientX, t.clientY);
      else if (t.identifier === MECH.aim.id){ yaw -= (t.clientX - MECH.aim.lx) * .005 * sens; pitch -= (t.clientY - MECH.aim.ly) * .005 * sens; MECH.aim.lx = t.clientX; MECH.aim.ly = t.clientY; }
    }
    if (e.cancelable) e.preventDefault();
  }, { passive:false });
  const end = e => { for (const t of e.changedTouches){ if (t.identifier === MECH.joy.id){ MECH.joy.id = null; MECH.joy.dx = MECH.joy.dy = 0; knob.style.transform = ''; } if (t.identifier === MECH.aim.id) MECH.aim.id = null; } };
  mechUI.addEventListener('touchend', end); mechUI.addEventListener('touchcancel', end);
  const hold = (id, key) => {
    const el = $(id);
    el.addEventListener('touchstart', e => { e.preventDefault(); Snd.init(); MECH[key] = true; el.classList.add('down'); }, { passive:false });
    const up = e => { e.preventDefault(); MECH[key] = false; el.classList.remove('down'); };
    el.addEventListener('touchend', up); el.addEventListener('touchcancel', up);
    el.addEventListener('mousedown', () => { MECH[key] = true; }); el.addEventListener('mouseup', () => { MECH[key] = false; });
  };
  hold('mkFireL', 'mini'); hold('mkFireR', 'rocket');
  $('mkPauseBtn').addEventListener('click', () => mechPause());
  $('mkPauseBtn').addEventListener('touchstart', e => { e.preventDefault(); mechPause(); }, { passive:false });
})();
// Bouton sur l'écran titre
(function(){
  const after = $('btnStart');
  if (after && after.parentNode && !$('btnMech')){
    const b = document.createElement('button'); b.className = 'ghost mech-btn'; b.id = 'btnMech'; b.type = 'button'; b.textContent = '🤖 Robot de combat';
    after.parentNode.insertBefore(b, after.nextSibling);
    mechBtn();
    b.addEventListener('click', () => { if (typeof Snd === 'object') Snd.init(); mechGarage(); });
  }
})();

/* ---------- Crochets ---------- */
// La boucle du jeu n'appelle update qu'en 'playing' : le robot avance dans visuals
try { const _b = visuals; visuals = function(dt){ if (state === 'mech') mechStep(dt); const r = _b.apply(this, arguments); mechFrame(dt); return r; }; } catch (e) {}
// Bras du robot : la minigun sort à gauche, les roquettes à droite
try {
  const _m = armMuzzle;
  armMuzzle = function(out){
    if (!MECH.on) return _m.apply(this, arguments);
    const side = S && MECH_W[S.cur] && MECH_W[S.cur].side === 'R' ? 1 : -1;
    mkR.set(1, 0, 0).applyQuaternion(camera.quaternion); mkU.set(0, 1, 0).applyQuaternion(camera.quaternion); mkF.set(0, 0, -1).applyQuaternion(camera.quaternion);
    return out.copy(camera.position).addScaledVector(mkF, 2.2).addScaledVector(mkR, side * 1.25).addScaledVector(mkU, -.9);
  };
} catch (e) {}
// Pas de douilles de l'arme en main (cachée) dans le cockpit
try { const _e = vmEject; vmEject = function(){ if (MECH.on) return; return _e.apply(this, arguments); }; } catch (e) {}
// Les armes du robot frappent fort (et de plus en plus fort à chaque rue)
try { const _d = damage; damage = function(z, amt){ if (MECH.on && state === 'mech') amt *= MECH.pow * (1 + .12 * mUp(MECH.src === 'rocket' || MECH.src === 'right' ? 'rdmg' : 'mdmg')); arguments[1] = amt; return _d.apply(this, arguments); }; } catch (e) {}
// Les explosions des roquettes comptent pour l'amélioration « Roquettes : dégâts »
try { if (typeof armExplode === 'function'){ const _x = armExplode; armExplode = function(){ const s0 = MECH.src; MECH.src = 'rocket'; try { return _x.apply(this, arguments); } finally { MECH.src = s0; } }; } } catch (e) {}
// Tomber en mode infini débloque le robot
try { const _g = gameOver; gameOver = function(){ const inf = typeof infActive === 'function' && infActive(); const r = _g.apply(this, arguments); if (inf) mechUnlock(); return r; }; } catch (e) {}
// Un zombie qui frappe « la barricade » frappe le robot, s'il est devant lui
try {
  const _h = hitBarricade;
  hitBarricade = function(z){ if (MECH.on && z && z.g && (Math.abs(z.g.position.x - MECH.x) > 6 || z.g.position.z > MECH_CAM.z + 5 || z.g.position.z < MECH_CAM.z - 14)) return; return _h.apply(this, arguments); };
} catch (e) {}
try { const _k = kill; kill = function(){ const r = _k.apply(this, arguments); if (MECH.on) MECH.kills++; return r; }; } catch (e) {}
// Musique et ambiance : le robot, c'est une vague
try { if (typeof ambMusicState === 'function'){ const _a = ambMusicState; ambMusicState = function(){ if (state === 'mech') return typeof liveBoss === 'function' && liveBoss() ? 'boss' : 'wave'; if (state === 'mechover') return 'menu'; return _a.apply(this, arguments); }; } } catch (e) {}

// Accès pour les tests automatiques
window.__mech = { MECH_W, mW, mechWeapon, mechArms, mechArmsG, MECH_UPG, mUp, mechUpgBuy, mechUpgCost, mechUnlocked, mechUnlock, mechGarage, mechNorm, mechBtn, MECH, MECH_LEN, MECH_HEAT, mechStart, mechQuit, mechStep, mechStreet, mechPause, mechResume, mechOver, mechPlan, mechCk };
