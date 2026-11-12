'use strict';
/* ================= Boss : un géant toutes les 5 vagues ================= */
// Contrat avec 07-zombies.js et 18-zombies-types.js : ZKINDS.boss = { build(T), init(z), update(z, dt) }.
// spawnZombie('boss') appelle build(T) pour le modèle, puis init(z) ; update(z, dt) remplace la marche et l'attaque.
// La mort reste au code commun (kill, chute, nettoyage). Ici : modèle, marche lourde, lancer d'auto,
// coups sur la barricade, annonce, barre de vie, récompense et le boss dans les vagues.

// Valeurs de base (multipliées ensuite par la vague, la ville et la variante)
ZTYPES.boss = { name:'Boss', hp:4500, speed:1.1, dmg:40, reward:600, scale:7, skin:0x6e7f58, xp:150 };
if (typeof SCRAP_Z === 'object' && SCRAP_Z) SCRAP_Z.boss = 80; // ferraille (multipliée par la difficulté de la ville)

const BOSS_EVERY = 5;        // un boss aux vagues 5, 10, 15...
const BOSS_ARMOR = .6;       // les tirs au corps ne font que 60 % (plaques de métal) ; la tête est la faiblesse
const BOSS_START_Z = -70;    // apparaît assez près pour être vu malgré le brouillard
const BOSS_THROW = 1.2;      // dégâts d'une auto lancée, en multiple de z.dmg
const BOSS_SLAM = 1.6;       // dégâts d'un coup de poing sur la barricade, en multiple de z.dmg
const BOSS_CAR = { hits:3, T:1.9 }; // auto lancée : 3 balles dessus la font exploser en vol (une roquette suffit) ; 1,9 s de vol

// Variantes par ville : nom, vie, taille, couleurs, récompense
const BOSS_VAR = {
  village:  { name:'Le Fossoyeur',            hp:1,    scale:6.5, skin:0x6e7f58, plate:0x4a4038, rew:1 },
  ville:    { name:'Le Colosse des Cendres',  hp:1.1,  scale:7,   skin:0x7a6a5a, plate:0x3a302b, rew:1 },
  banlieue: { name:'L’Ogre de minuit',        hp:1.2,  scale:7,   skin:0x5a6a70, plate:0x2a2c33, rew:1.1 },
  centre:   { name:'Le Titan de béton',       hp:1.3,  scale:7.5, skin:0x6a5a50, plate:0x45403e, rew:1.2 },
  port:     { name:'Le Docker',               hp:1.2,  scale:7,   skin:0x5f7a4a, plate:0x1e4a6a, rew:1.2 },
  port10:   { name:'Le Léviathan du port',    hp:1.25, scale:8.5, skin:0x4f6a3a, plate:0x8a2a1e, rew:1.6 }
};
function bossVariant(w, L){
  L = L || curLoc; const id = L && L.id;
  if (id === 'port' && w >= 10) return BOSS_VAR.port10;
  return BOSS_VAR[id] || BOSS_VAR.village;
}
const isBossWave = w => w > 0 && w % BOSS_EVERY === 0;
// Le boss n'est mis dans les vagues que si le crochet ZKINDS de spawnZombie existe (sinon il serait mal construit)
function bossReady(){
  try { return typeof ZKINDS !== 'undefined' && ZKINDS && ZKINDS.boss === BOSS_KIND && /ZKINDS/.test(String(spawnZombie)); }
  catch (e) { return false; }
}

/* ---------- Modèle (boîtes, comme le reste du jeu) ---------- */
// Une seule géométrie partagée (cube unité mis à l'échelle) : jamais libérée, pas de fuite.
const BGEO = new THREE.BoxGeometry(1, 1, 1);
function bbox(parent, mat, sx, sy, sz, x, y, z, parts){
  const m = new THREE.Mesh(BGEO, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m);
  if (parts) parts.push(m); return m;
}
function bgrp(parent, x, y, z){ const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
const darker = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return c.getHex(); };
const LEAN = .5; // le géant est voûté vers l'avant

function bossBuild(T){
  const V = bossVariant(S ? S.wave : BOSS_EVERY, curLoc);
  const skin = lam(V.skin), dark = lam(darker(V.skin, .62)), cloth = lam(0x3a2a22), plate = lam(V.plate), bone = lam(0xc8bfa6);
  const glow = new THREE.MeshBasicMaterial({ color:0xff5a1a, fog:false }); // yeux et plaie visibles dans le brouillard
  const mats = [skin, dark, cloth, plate, bone, glow];
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const P_ = [];
  // Jambes courtes et massives (hanche à 0,9, genou, pied au sol)
  const leg = side => {
    const hip = bgrp(body, side * .34, .9, 0);
    bbox(hip, cloth, .4, .52, .44, 0, -.25, 0, P_);
    const knee = bgrp(hip, 0, -.5, 0);
    bbox(knee, dark, .34, .32, .36, 0, -.15, 0, P_);
    bbox(knee, dark, .44, .12, .6, 0, -.34, .1, P_);
    return { hip, knee };
  };
  const L = leg(-1), R = leg(1);
  bbox(body, cloth, 1, .32, .58, 0, .96, 0, P_); // bassin
  // Torse penché, bosse énorme sur le dos, plaques de métal
  const chest = bgrp(body, 0, 1.05, 0); chest.rotation.x = LEAN;
  bbox(chest, skin, 1.12, .52, .72, 0, .26, .05, P_);            // ventre
  bbox(chest, skin, 1.55, .62, .88, 0, .76, 0, P_);              // poitrine
  bbox(chest, dark, 1.15, .66, .78, 0, .98, -.42, P_);           // bosse
  bbox(chest, dark, .7, .4, .5, .1, 1.3, -.5, P_);               // deuxième bosse
  [[-.35, -.25], [0, -.5], [.3, -.3], [.12, -.72], [-.2, -.65]].forEach((p, i) => {
    const s = bbox(chest, bone, .1, .42, .1, p[0], 1.38 + (i % 2) * .12, p[1], P_); s.rotation.x = -.5; s.rotation.z = p[0] * .8;
  });
  bbox(chest, plate, .82, .46, .08, -.22, .8, .45, P_);           // plaque sur la poitrine
  bbox(chest, glow, .3, .22, .04, .42, .62, .44, P_);            // plaie qui luit
  [-1, 1].forEach(sd => { const sp = bbox(chest, plate, .62, .18, .74, sd * .86, 1.1, 0, P_); sp.rotation.z = -sd * .25; });
  // Tête basse, avancée entre les épaules
  const neck = bgrp(chest, 0, .98, .48); neck.rotation.x = -LEAN;
  const head = bbox(neck, skin, .52, .46, .52, 0, 0, .12, P_);
  bbox(neck, dark, .46, .14, .42, 0, -.27, .16, P_);              // mâchoire
  bbox(neck, bone, .36, .05, .04, 0, -.19, .39);                  // dents
  [-.12, .12].forEach(x => bbox(neck, glow, .1, .06, .03, x, .05, .39));
  // Bras droit monstrueux (traîne presque au sol), poing cerclé de métal
  const armR = bgrp(chest, .98, .92, .05); armR.rotation.x = -LEAN;
  bbox(armR, skin, .44, .72, .44, 0, -.36, 0, P_);
  const elbR = bgrp(armR, 0, -.72, 0);
  bbox(elbR, dark, .52, .62, .52, 0, -.31, 0, P_);
  bbox(elbR, plate, .68, .2, .68, 0, -.6, 0, P_);
  const fist = bbox(elbR, skin, .64, .48, .64, 0, -.86, 0, P_);
  // Bras gauche plus mince, qui tient une barre d'acier
  const armL = bgrp(chest, -.9, .9, .05); armL.rotation.x = -LEAN;
  bbox(armL, skin, .28, .56, .28, 0, -.28, 0, P_);
  const elbL = bgrp(armL, 0, -.56, 0);
  bbox(elbL, dark, .24, .5, .24, 0, -.25, 0, P_);
  const bar = bbox(elbL, plate, .1, 1.3, .1, 0, -.55, .3, P_); bar.rotation.x = 1.2;
  // Petits bras en trop qui sortent du ventre
  const extra = [];
  [-1, 1].forEach(sd => {
    const a = bgrp(chest, sd * .58, .3, .3);
    bbox(a, skin, .12, .46, .12, 0, -.22, 0, P_);
    bbox(a, dark, .1, .1, .16, 0, -.47, .03, P_);
    extra.push(a);
  });
  g.scale.setScalar(V.scale);
  g.userData.boss = { legL:L.hip, legR:R.hip, kneeL:L.knee, kneeR:R.knee, chest, neck, armR, elbR, armL, elbL, fist, extra };
  return { g, body, head, parts:P_, mats, aimY:1.25 * V.scale };
}

/* ---------- Projectiles : autos lancées (pool réutilisé) ---------- */
const bossFx = new THREE.Group(); scene.add(bossFx);
const BCAR_MATS = [lam(0x6a1f1a), lam(0x2a3a4a), lam(0x5a5a52), lam(0x3a4a2a)];
const BCAR_DARK = lam(0x151515), BCAR_GLASS = lam(0x2a3640), BCAR_HIT = new THREE.MeshBasicMaterial({ visible:false });
const bossCars = [];
for (let i = 0; i < 3; i++){
  const m = new THREE.Group(), mat = BCAR_MATS[i % BCAR_MATS.length];
  bbox(m, mat, 4.2, 1.1, 2, 0, 0, 0); bbox(m, BCAR_GLASS, 2.3, .85, 1.8, -.2, .95, 0);
  [[-1.4, -1], [1.4, -1], [-1.4, 1], [1.4, 1]].forEach(p => bbox(m, BCAR_DARK, .8, .8, .3, p[0], -.55, p[1]));
  // Cible des tirs : une boîte invisible autour de l'auto, dans hitMeshes seulement pendant le vol (comme les barils de 23-rue.js)
  const cible = new THREE.Mesh(BGEO, BCAR_HIT); cible.scale.set(5, 2.6, 2.8); cible.position.y = .3; m.add(cible);
  m.visible = false; bossFx.add(m);
  const c = { m, cible, owner:null, t:0, T:1.5, a:new THREE.Vector3(), b:new THREE.Vector3(), hgt:12, dmg:0, hp:0, spin:new THREE.Vector3() };
  cible.userData.bossCar = true; cible.userData.onHit = (pt, dmg) => bossCarHit(c, pt, dmg);
  bossCars.push(c);
}
function bossCarOff(c){ c.m.visible = false; c.owner = null; const i = hitMeshes.indexOf(c.cible); if (i >= 0) hitMeshes.splice(i, 1); }
// Une balle sur l'auto en vol ; dmg >= 1e6 (roquette, explosion) la détruit d'un coup
function bossCarHit(c, pt, dmg){
  if (!c.m.visible) return;
  c.hp -= dmg >= 1e6 ? BOSS_CAR.hits : 1;
  burst(pt || c.m.position, 'dust', 4, 2);
  if (c.hp > 0){ Snd.burst(1800, .08, .25); return; }
  // Elle explose en l'air : la barricade ne prend rien
  tmpV.copy(c.m.position); bossCarOff(c); S.carsShot = (S.carsShot || 0) + 1;
  burst(tmpV, 'dust', 22, 6); burst(tmpV, 'wood', 10, 5);
  if (typeof floatText === 'function') floatText('Auto détruite !', tmpV, true);
  shake = Math.max(shake, .5); Snd.burst(420, .7, .7); Snd.tone(80, .5, 'sine', .35, 30);
}
function bossClearFx(){ bossCars.forEach(bossCarOff); }
function bossThrow(z){
  const c = bossCars.find(o => !o.m.visible); if (!c) return false;
  z.B.fist.getWorldPosition(c.a);
  c.b.set(clamp(z.g.position.x + rand(-7, 7), -10, 10), .9, BAR_Z - .4);
  c.t = 0; c.T = BOSS_CAR.T; c.hgt = 9 + rand(0, 5); c.dmg = z.dmg * BOSS_THROW; c.owner = z; c.hp = BOSS_CAR.hits;
  if (hitMeshes.indexOf(c.cible) < 0) hitMeshes.push(c.cible);
  c.spin.set(rand(-3, 3), rand(-2, 2), rand(-4, 4));
  c.m.position.copy(c.a); c.m.rotation.set(0, rand(0, 6.3), 0); c.m.visible = true;
  Snd.burst(500, .5, .4); Snd.tone(90, .6, 'sawtooth', .18, 40);
  return true;
}
function bossUpdateFx(z, dt){
  for (const c of bossCars){
    if (!c.m.visible || c.owner !== z) continue;
    c.t += dt; const u = Math.min(1, c.t / c.T);
    c.m.position.lerpVectors(c.a, c.b, u); c.m.position.y += c.hgt * 4 * u * (1 - u);
    c.m.rotation.x += c.spin.x * dt; c.m.rotation.y += c.spin.y * dt; c.m.rotation.z += c.spin.z * dt;
    c.m.updateMatrixWorld(true); // la cible des tirs suit l'auto tout de suite
    if (u >= 1){
      bossCarOff(c);
      S.bar = Math.max(0, S.bar - c.dmg);
      shake = Math.max(shake, .9);
      burst(c.b, 'wood', 14, 4); burst(c.b, 'dust', 10, 3);
      Snd.burst(380, .8, .8); Snd.tone(70, .5, 'sine', .4, 30);
      bossFlash(.75);
    }
  }
}
function bossFlash(o){ const el = $('dmgflash'); if (!el) return; el.style.opacity = o; setTimeout(() => { el.style.opacity = 0; }, 140); }

/* ---------- Comportement ---------- */
function bossInit(z){
  const V = bossVariant(S ? S.wave : BOSS_EVERY, curLoc), Tb = ZTYPES.boss, pl = plan || {};
  z.B = z.g.userData.boss; z.isBoss = true; z.bossName = V.name;
  z.bossScale = V.scale; z.g.scale.setScalar(V.scale);
  z.maxHp = z.hp = Tb.hp * (pl.hpMult || 1) * V.hp;
  z.speed = Tb.speed * Math.min(1.25, pl.spdMult || 1);
  z.dmg = Tb.dmg * (pl.dmgMult || 1);
  z.reward = Tb.reward * (pl.cashMult || 1) * V.rew;
  z.xp = Tb.xp * (pl.xp || 1);
  z.g.position.set(0, 0, BOSS_START_Z);
  z.stopZ = BAR_Z - 1.2 * V.scale; // reste au bout de son bras : le poing tombe sur la barricade
  z.st = 'walk'; z.phase = 0; z.stepC = 1; z.throwT = rand(6, 8); z.act = null; z.actT = 0; z.atkT = 1.6; z.thrown = false;
  bossAnnounce(z);
}
let bossBannerTO = 0;
function bossAnnounce(z){
  banner(z.bossName, 'Un boss approche ! Vise la tête, et tire sur les autos qu’il lance.', 3600);
  const b = $('banner'); if (b){ b.classList.add('boss'); clearTimeout(bossBannerTO); bossBannerTO = setTimeout(() => b.classList.remove('boss'), 4100); }
  shake = Math.max(shake, 1.2); bossFlash(.6);
  Snd.tone(70, 2.4, 'sawtooth', .32, 28); Snd.tone(46, 2.8, 'sine', .55, 24); Snd.burst(260, 1.8, .5);
  bossBarSync();
}
const footV = new THREE.Vector3();
function bossStep(z, foot){
  const d = Math.abs(z.g.position.z - camera.position.z), k = clamp(1 - (d - 12) / 70, 0, 1);
  shake = Math.max(shake, .15 + .4 * k);
  Snd.tone(52, .4, 'sine', .2 + .3 * k, 26); Snd.burst(220, .3, .12 + .2 * k);
  foot.getWorldPosition(footV); footV.y = .2; burst(footV, 'dust', 6, 2.5);
}
function bossUpdate(z, dt){
  const B = z.B; if (!B) return false;
  if (z.act === 'throw'){
    // Il arrache une auto et la lance sur la barricade
    z.actT -= dt; const u = clamp(1 - z.actT / 1.8, 0, 1);
    let a;
    if (u < .6) a = -LEAN - 2.5 * (u / .6);
    else if (u < .75) a = -LEAN - 2.5 + 2.1 * ((u - .6) / .15);
    else a = -LEAN - .4 + .4 * ((u - .75) / .25);
    B.armR.rotation.x = a; B.elbR.rotation.x = u < .6 ? -.6 * (u / .6) : 0;
    B.chest.rotation.x = LEAN - .25 * Math.sin(u * Math.PI);
    if (u >= .66 && !z.thrown){ z.thrown = true; bossThrow(z); shake = Math.max(shake, .4); }
    if (z.actT <= 0){ z.act = null; z.throwT = rand(11, 14); }
  } else if (z.st === 'walk'){
    z.g.position.z += z.speed * dt;
    z.g.position.x += (0 - z.g.position.x) * Math.min(1, dt * .3);
    z.phase += dt * z.speed * 1.45;
    const s2 = Math.sin(z.phase), c2 = Math.cos(z.phase);
    B.legL.rotation.x = s2 * .42; B.legR.rotation.x = -s2 * .42;
    B.kneeL.rotation.x = Math.max(0, -s2) * .5; B.kneeR.rotation.x = Math.max(0, s2) * .5;
    B.armR.rotation.x = -LEAN - s2 * .22; B.elbR.rotation.x = -.2;
    B.armL.rotation.x = -LEAN + s2 * .3; B.elbL.rotation.x = -.5;
    B.chest.rotation.x = LEAN + Math.abs(s2) * .05; B.chest.rotation.z = s2 * .07;
    z.body.position.y = -Math.abs(s2) * .05; // il s'enfonce à chaque pas
    // Un pas quand le cosinus change de signe (jambes au plus écartées)
    const sg = c2 >= 0 ? 1 : -1;
    if (sg !== z.stepC){ z.stepC = sg; bossStep(z, s2 > 0 ? B.kneeL : B.kneeR); }
    z.throwT -= dt;
    if (z.throwT <= 0 && z.g.position.z < z.stopZ - 6 && bossCars.some(o => !o.m.visible)){ z.act = 'throw'; z.actT = 1.8; z.thrown = false; }
    if (z.g.position.z >= z.stopZ){ z.g.position.z = z.stopZ; z.st = 'attack'; z.atkT = 1.6; B.legL.rotation.x = B.legR.rotation.x = 0; B.kneeL.rotation.x = B.kneeR.rotation.x = 0; }
  } else {
    // À la barricade : il lève le poing et l'écrase, onde de choc
    z.atkT -= dt; const u = clamp(1 - z.atkT / 2.4, 0, 1);
    B.armR.rotation.x = u < .75 ? -LEAN - 2.4 * (u / .75) : -LEAN - 2.4 + 1.9 * ((u - .75) / .25);
    B.chest.rotation.x = LEAN + (u < .75 ? -.15 * (u / .75) : .15);
    B.armL.rotation.x = -LEAN - .6 - Math.sin(z.phase * 3) * .2;
    z.phase += dt;
    if (z.atkT <= 0){
      z.atkT = 2.4;
      S.bar = Math.max(0, S.bar - z.dmg * BOSS_SLAM);
      shake = Math.max(shake, 1.1);
      tmpV.set(z.g.position.x, rand(.6, 1.6), BAR_Z); burst(tmpV, 'wood', 16, 4); burst(tmpV, 'dust', 10, 3.5);
      Snd.burst(300, .9, .9); Snd.tone(48, .8, 'sine', .55, 24);
      bossFlash(.8);
    }
  }
  // Petits bras qui s'agitent tout le temps
  B.extra.forEach((a, i) => { a.rotation.x = -1.1 + Math.sin(z.phase * 4 + i * 2.1 + (time || 0) * 5) * .45; a.rotation.z = (i ? -1 : 1) * .35; });
  B.neck.rotation.y = Math.sin((time || 0) * .7) * .25;
  bossUpdateFx(z, dt);
  return true;
}
const BOSS_KIND = { build:bossBuild, init:bossInit, update:bossUpdate };
if (typeof ZKINDS !== 'undefined' && ZKINDS) ZKINDS.boss = BOSS_KIND;

/* ---------- Le boss dans les vagues ---------- */
// La file est vidée avec pop() : la fin du tableau sort en premier. Le boss est placé pour sortir
// après environ 60 % de la vague. p.total compte le boss (un zombie de plus, affiché honnêtement).
const _wavePlanBase = wavePlan;
wavePlan = function(w, L){
  const p = _wavePlanBase(w, L);
  if (isBossWave(w) && bossReady()){
    const q = p.queue;
    q.splice(Math.round(q.length * .4), 0, 'boss');
    p.total = q.length; p.boss = bossVariant(w, L || curLoc).name;
  }
  return p;
};

/* ---------- Crochets légers sur le code commun (par réaffectation, sans toucher aux fichiers) ---------- */
try {
  // Corps blindé : les tirs au corps font moins mal, la tête reste pleine (×2,5 du jeu)
  const _damageBase = damage;
  damage = function(z, amt, head, point){
    if (z && z.type === 'boss' && !head) amt *= BOSS_ARMOR;
    return _damageBase(z, amt, head, point);
  };
} catch (e) { errNote(e); }
try {
  // Mort du boss : annonce et effets (la récompense est versée par kill())
  const _killBase = kill;
  kill = function(z, head, point){
    const wasBoss = !!z && z.type === 'boss' && !z.dead;
    const r = _killBase(z, head, point);
    if (wasBoss && z.dead) bossDown(z, head);
    return r;
  };
} catch (e) { errNote(e); }
try {
  // Annonce dès le début de la vague qu'un boss viendra
  const _startWaveBase = startWave;
  startWave = function(){
    const r = _startWaveBase.apply(this, arguments);
    if (plan && plan.boss){ const el = $('bSub'); if (el){ const t = el.textContent.trim(); el.textContent = !t ? 'Un boss viendra.' : /[.!?]$/.test(t) ? t + ' Un boss viendra.' : t + ', dont un boss !'; } }
    return r;
  };
} catch (e) { errNote(e); }
function bossDown(z, head){
  const pay = Math.round(z.reward * (1 + .08 * T('scavenger')) * (head ? 1.5 : 1));
  const scr = typeof scrapFor === 'function' ? scrapFor('boss', curLoc) : 0;
  banner('Boss abattu !', z.bossName + ' : +' + fmt(pay) + (scr ? ' et +' + Math.floor(scr).toLocaleString('fr-CA') + ' ⚙' : ''), 3000);
  const b = $('banner'); if (b) b.classList.remove('boss');
  shake = Math.max(shake, 1.3);
  tmpV.set(z.g.position.x, 2, z.g.position.z); burst(tmpV, 'dust', 24, 6); burst(tmpV, 'blood', 20, 5);
  Snd.burst(200, 2, .9); Snd.tone(60, 2, 'sawtooth', .3, 20);
  bossBarSync();
}

/* ---------- Barre de vie (en haut de l'écran, seulement tant qu'il est en vie) ---------- */
let bossShown = false, bossFillW = '', bossNameT = '';
function liveBoss(){ for (const z of zombies) if (z.type === 'boss' && !z.dead) return z; return null; }
function bossBarSync(){
  const el = $('bossBar'); if (!el) return;
  const z = liveBoss(), show = !!z && (state === 'playing' || state === 'paused');
  if (show !== bossShown){ bossShown = show; el.classList.toggle('hide', !show); }
  if (!show) return;
  if (z.bossName !== bossNameT){ bossNameT = z.bossName; $('bossName').textContent = z.bossName; }
  const w = (clamp(z.hp / z.maxHp, 0, 1) * 100).toFixed(1) + '%';
  if (w !== bossFillW){ bossFillW = w; $('bossFill').style.width = w; }
}
// Chaque image : barre à jour, et les autos rangées s'il n'y a plus de boss (changement de ville, fin de partie)
function bossFrame(){
  bossBarSync();
  if (!liveBoss() || (state !== 'playing' && state !== 'paused')){
    for (const c of bossCars) if (c.m.visible){ bossClearFx(); break; }
  }
}
try {
  const _visualsBase = visuals;
  visuals = function(dt){ const r = _visualsBase(dt); bossFrame(); return r; };
} catch (e) { errNote(e); }

// Accès pour les tests automatiques
window.__boss = { BOSS_VAR, BOSS_KIND, BOSS_ARMOR, BOSS_CAR, bossThrow, bossCarHit, bossUpdateFx, bossVariant, bossReady, isBossWave, bossBarSync, bossFrame, bossCars, liveBoss, bossClearFx };
