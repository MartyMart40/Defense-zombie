'use strict';
/* ================= Nouveaux monstres : rampant, gargouille, corbeaux, bouclier, gonflé ================= */
// Même contrat que 18-zombies-types.js (ZKINDS[type] = { build, init, update, onWeak, onKill }).
// Matériaux zmat / zfix seulement : tous passent par le rendu par instances (07-zombies.js), même en foule.
//   crawler (Rampant)  : petit, à quatre pattes, très rapide, arrive en meute de 5 (dès la vague 2 de Saint-Clou).
//   bloater (Gonflé)   : ventre énorme ; explose à la barricade (gros dégâts). Tiré avant, il explose au milieu des autres
//                        (ses pustules sont un point faible : un tir dessus le fait sauter tout de suite). Dès la vague 3.
//   gargoyle (Gargouille) : volant de pierre, lent et très résistant ; ailes blindées, ventre brûlant = point faible.
//                        Dès Val-des-Cendres.
//   crow (Corbeau)     : nuée de petits volants faibles qui tournent ensemble puis piquent sur la barricade. Dès Banlieue Nord.
//   shield (Bouclier)  : zombie anti-émeute ; le bouclier arrête les balles de face (tête et jambes exposées) ;
//                        explosions, flammes et balles perforantes passent. Dès Centre-ville.
// Ils remplacent des marcheurs dans wavePlan (le nombre de zombies par vague ne change pas, sauf les petits des meutes).

/* ---------- Données ---------- */
Object.assign(ZTYPES, {
  crawler:  { name:'Rampant',    hp:22,  speed:5.2, dmg:3,   reward:8,  scale:.85, skin:0x9aa585 },
  bloater:  { name:'Gonflé',     hp:130, speed:.95, dmg:0,   reward:35, scale:1.15, skin:0x7d9466, stopOff:.3 },
  gargoyle: { name:'Gargouille', hp:420, speed:1.7, dmg:14,  reward:70, scale:1.3, skin:0x6a6a5a },
  crow:     { name:'Corbeau',    hp:9,   speed:6.5, dmg:1.2, reward:3,  scale:1,   skin:0x2b2b33 },
  shield:   { name:'Bouclier',   hp:170, speed:1.15, dmg:10, reward:45, scale:1.08, skin:0x7d9466 }
});
Object.assign(ZXP, { crawler:2, bloater:8, gargoyle:18, crow:1, shield:12 });
try { Object.assign(SCRAP_Z, { crawler:.3, bloater:1.2, gargoyle:3, crow:.15, shield:2 }); } catch (e) {}
const MN_TYPES = ['crawler', 'bloater', 'gargoyle', 'crow', 'shield'];
const MN = { child:false, booms:0, blocks:0 };
const MN_PACK = 5, MN_FLOCK = isTouch ? 7 : 11; // petits par meute de rampants, corbeaux par nuée

// Armures et points faibles (armor : dégâts réduits, aucun texte « Point faible », étincelles)
const MN_W = {
  bouclier: { mult:.08, effet:'bouclier', armor:true },
  pierre:   { mult:.35, effet:'pierre', armor:true },
  ventre:   { mult:2.5, effet:'ventre' },
  pustule:  { mult:1,   effet:'pustule' }
};
// Couleurs et matériaux déjà présents dans la palette des zombies : aucun nouvel appel de dessin pour la foule
const MN_M = {
  belly:  ZKM.core,          // ventre brûlant de la gargouille (point lumineux du colosse)
  shield: zmat(ZC.navy),     // bouclier bleu nuit
  visor:  zmat(0x3d4a5c),    // hublot
  pus:    ZKM.acid,          // pustules du gonflé
  beak:   zmat(0x3a3226)     // bec
};
const mnV = new THREE.Vector3(), mnV2 = new THREE.Vector3();

// Petits sons (outils de Snd, rien si l'audio est coupé)
function mnSnd(kind){
  if (typeof Snd !== 'object' || !Snd.ctx || !Snd._nz) return;
  try {
    const t = Snd.ctx.currentTime;
    if (kind === 'caw'){ for (let i = 0; i < 2; i++) Snd._osc(t + i * .16, 'sawtooth', rand(780, 950), rand(520, 620), .12, .03); }
    else if (kind === 'clang'){ Snd._osc(t, 'triangle', rand(1400, 1900), 1200, .12, .05); Snd._nz(t, 'bandpass', 3200, 6, .03, .08); }
    else if (kind === 'stone'){ Snd._nz(t, 'bandpass', rand(1800, 2600), 5, .03, .06); }
    else if (kind === 'gurgle'){ Snd._osc(t, 'sine', rand(90, 130), 60, .3, .06); Snd._nz(t, 'lowpass', 500, 2, .3, .05); }
  } catch (e) {}
}
// Fait apparaître les petits d'une meute ou d'une nuée autour du chef (sans qu'ils en créent d'autres)
function mnSpawnGroup(lead, type, n, spread){
  const out = []; if (typeof spawnZombie !== 'function') return out;
  MN.child = true;
  try {
    for (let i = 0; i < n; i++){
      const c = spawnZombie(type); if (!c) continue;
      c.g.position.set(clamp(lead.g.position.x + rand(-spread, spread), -11, 11), c.g.position.y, lead.g.position.z - rand(.5, spread * 1.5));
      c.g.updateMatrixWorld(true); out.push(c);
    }
  } finally { MN.child = false; }
  return out;
}

/* ---------- Rampant : petit, à quatre pattes, très rapide ---------- */
ZKINDS.crawler = {
  build(T){
    const skin = zmat(T.skin), rag = zmat(pick(PANTS));
    const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), P = [];
    zkMesh(body, ZKG.box, rag, .36, .24, .66, 0, .46, 0, P);                   // dos, à l'horizontale
    zkMesh(body, ZKG.box, skin, .1, .08, .6, 0, .6, -.02);                       // colonne qui ressort
    const head = zkMesh(body, ZKG.box, skin, .26, .24, .28, 0, .5, .44, P);
    zkEyes(body, .54, .59, .065);
    zkMesh(body, ZKG.box, ZKM.mouth, .16, .05, .03, 0, .44, .585);
    const rig = { legs:[] };
    [[-.17, .25], [.17, .25], [-.15, -.25], [.15, -.25]].forEach(p => {
      const l = zkGroup(body, p[0], .48, p[1]);
      zkMesh(l, ZKG.top, skin, .08, .52, .08, 0, 0, 0, P);
      rig.legs.push(l);
    });
    g.scale.setScalar(T.scale); g.userData.rig = rig;
    return { g, body, head, parts:P, mats:[skin, rag], aimY:.45 * T.scale };
  },
  init(z){
    z.rig = z.g.userData.rig; z.zig = rand(0, 6);
    if (!MN.child) mnSpawnGroup(z, 'crawler', MN_PACK - 1, 2.2); // le chef arrive avec sa meute
  },
  update(z, dt){
    const R = z.rig, gp = z.g.position;
    z.phase += dt * (z.st === 'walk' ? z.speed * 3.4 : 12);
    const s = Math.sin(z.phase);
    R.legs.forEach((l, i) => { l.rotation.x = (i === 0 || i === 3 ? s : -s) * .7 + (i < 2 ? -.35 : .35); });
    z.body.position.y = Math.abs(Math.cos(z.phase)) * .05;
    if (z.st === 'walk'){
      gp.z += z.speed * dt;
      gp.x = clamp(gp.x + Math.sin(z.phase * .25 + z.zig) * 1.6 * dt, -12, 12); // court en zigzag
      z.body.rotation.z = Math.sin(z.phase * .25 + z.zig) * .15;
      if (gp.z >= z.stopZ){ gp.z = z.stopZ; z.st = 'attack'; z.atkT = rand(.2, .5); }
    } else {
      z.body.rotation.x = -.15 + s * .1; // griffe la barricade
      z.atkT -= dt;
      if (z.atkT <= 0){ z.atkT = rand(.55, .8); hitBarricade(z, z.dmg, .05, 1); }
    }
    return true;
  }
};

/* ---------- Gonflé : explose à la barricade, ou au milieu des autres si on le fait sauter avant ---------- */
const MN_BOOM = { r:4.5, dmg:260, bar:42 }; // rayon, dégâts aux zombies (× force de la vague), dégâts à la barricade (× dégâts de la vague)
ZKINDS.bloater = {
  build(T){
    const R = buildHumanoid(T, 'civil'), body = R.body, P = R.parts;
    const belly = zkMesh(body, ZKG.sph, zmat(0x748c3c), .52, .5, .48, 0, 1.02, .2, P);   // ventre énorme
    zkMesh(body, ZKG.sph, zmat(0x5c7048), .3, .22, .2, .2, 1.32, .25);                   // veines, bosse
    [[-.18, 1.1, .62], [.15, .92, .64], [.02, 1.22, .6], [-.08, .82, .6], [.26, 1.12, .52]].forEach(p => {
      zkWeak(zkMesh(body, ZKG.sph, MN_M.pus, .09, .09, .07, p[0], p[1], p[2], P), MN_W.pustule); // pustules : un tir le fait sauter
    });
    R.belly = belly;
    return R;
  },
  init(z){ z.gurT = rand(2, 5); },
  onWeak(z){ if (z.dead) return null; damage(z, z.hp + 1, false, z.g.position.clone()); return { done:true, txt:'Boum !' }; },
  update(z, dt){
    z.gurT -= dt; if (z.gurT <= 0){ z.gurT = rand(4, 8); if (z.g.position.z > -60) mnSnd('gurgle'); }
    if (z.body) z.body.scale.setScalar(1 + Math.sin((typeof time === 'number' ? time : 0) * 3 + z.phase) * .02); // il respire
    if (z.st === 'attack' && !z.dead){ // arrivé à la barricade : il explose (sans rien te rapporter)
      z.selfBoom = true; z.reward = 0; z.xp = 0;
      damage(z, z.hp + 1, false, z.g.position.clone());
      return true;
    }
    return false; // marche par défaut
  },
  onKill(z){ mnExplode(z); }
};
function mnExplode(z){
  if (z.boomed) return; z.boomed = true; MN.booms++;
  const gp = z.g.position, x = gp.x, z0 = gp.z, r = MN_BOOM.r, pw = plan && plan.hpMult > 0 ? plan.hpMult : 1;
  mnV.set(x, 1.2, z0);
  for (const o of zombies){
    if (o === z || o.dead) continue;
    const dx = o.g.position.x - x, dz = o.g.position.z - z0, d = Math.sqrt(dx * dx + dz * dz);
    if (d >= r || o.g.position.y > 6) continue;
    mnV2.set(o.g.position.x, 1, o.g.position.z);
    damage(o, MN_BOOM.dmg * pw * (1 - .5 * d / r), false, mnV2);
  }
  if (z0 > BAR_Z - 3.5 && S) hitBarricade(z, MN_BOOM.bar * (plan && plan.dmgMult > 0 ? plan.dmgMult : 1) * (z.selfBoom ? 1 : .6), .7, 16);
  if (typeof rueBoom === 'function'){ rueBoom(x, 1.4, z0, r * 2.4); rueBoom(x, 2.4, z0, r * 1.4); }
  burst(mnV, PMATS.acid ? 'acid' : 'blood', 18, 5); burst(mnV, 'blood', 10, 4);
  if (typeof rueNearBlast === 'function') rueNearBlast(x, .6, z0, r, false); // fait sauter les barils proches
  const near = clamp(1 - camera.position.distanceTo(mnV) / 60, 0, 1);
  shake = Math.max(shake, .3 + .6 * near);
  if (typeof Snd === 'object' && Snd.boom) Snd.boom(.85);
}

/* ---------- Gargouille : volant de pierre, ailes blindées, ventre brûlant ---------- */
ZKINDS.gargoyle = {
  build(T){
    const stone = zmat(T.skin), dark = zmat(ZC.noir);
    const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), P = [];
    zkMesh(body, ZKG.box, stone, .5, .44, 1, 0, .42, 0, P);                       // corps massif
    zkWeak(zkMesh(body, ZKG.box, MN_M.belly, .34, .06, .6, 0, .19, .05, P), MN_W.ventre); // ventre brûlant (dessous)
    zkMesh(body, ZKG.box, stone, .44, .36, .36, 0, .5, .4, P);                   // poitrail
    const head = zkMesh(body, ZKG.box, stone, .34, .3, .36, 0, .58, .74, P);
    zkMesh(body, ZKG.box, ZKM.mouth, .24, .07, .2, 0, .45, .82);
    zkEyes(body, .64, .93, .09, 1.2);
    [-1, 1].forEach(s => { const c = zkMesh(body, ZKG.box, dark, .07, .3, .07, .12 * s, .82, .6); c.rotation.x = -.5; c.rotation.z = -.3 * s; }); // cornes
    zkMesh(body, ZKG.box, stone, .18, .16, .6, 0, .45, -.75, P);                 // queue
    zkMesh(body, ZKG.box, dark, .26, .06, .2, 0, .45, -1.1);
    [-.16, .16].forEach(x => { const l = zkMesh(body, ZKG.top, dark, .1, .5, .1, x, .25, .2); l.rotation.x = .7; }); // pattes griffues
    const rig = { wing:[], tip:[] };
    [-1, 1].forEach(s => {
      const w = zkGroup(body, .25 * s, .6, .05);
      zkMesh(w, ZKG.box, dark, 1.05, .12, .12, .52 * s, 0, .04);
      zkWeak(zkMesh(w, ZKG.box, stone, 1.05, .09, .7, .52 * s, 0, -.34, P), MN_W.pierre);
      const t = zkGroup(w, 1.04 * s, 0, 0);
      zkWeak(zkMesh(t, ZKG.box, stone, .85, .08, .55, .42 * s, 0, -.26, P), MN_W.pierre);
      zkMesh(t, ZKG.box, dark, .08, .08, .22, .85 * s, 0, .06);
      rig.wing.push(w); rig.tip.push(t);
    });
    const sc = 1.1 * T.scale; g.scale.setScalar(sc); g.userData.rig = rig;
    return { g, body, head, parts:P, mats:[stone, dark], aimY:.42 * sc };
  },
  init(z){ ZKINDS.flyer.init(z); z.alt = rand(6, 9.5); z.g.position.y = z.alt; z.flapT = 0; },
  onWeak(z, m, amt, point, wk){ return wk.effet === 'ventre' ? { txt:'Ventre' } : null; },
  update(z, dt){
    const r = ZKINDS.flyer.update(z, dt * .75) ; // battements lourds et lents (le temps est ralenti pour l'animation)
    // Le vol de croisière est recalculé à vitesse normale : la gargouille avance quand même à sa vitesse
    if (z.st === 'walk') z.g.position.z += z.speed * dt * .25;
    z.flapT -= dt; if (z.flapT <= 0){ z.flapT = rand(1.5, 3); if (z.g.position.z > -55) mnSnd('stone'); }
    return r;
  }
};

/* ---------- Corbeaux : nuée qui tourne puis pique sur la barricade ---------- */
ZKINDS.crow = {
  build(T){
    const black = zmat(T.skin), wingM = zmat(0x3a3a44);
    const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), P = [];
    zkMesh(body, ZKG.box, black, .2, .17, .42, 0, 0, 0, P);
    const head = zkMesh(body, ZKG.box, black, .15, .14, .16, 0, .06, .27, P);
    zkMesh(body, ZKG.box, MN_M.beak, .05, .05, .14, 0, .04, .4);
    zkEyes(body, .09, .355, .05, .7);
    zkMesh(body, ZKG.box, black, .16, .03, .2, 0, .02, -.29);                    // queue
    const rig = { wing:[] };
    [-1, 1].forEach(s => { const w = zkGroup(body, .09 * s, .05, 0); zkMesh(w, ZKG.box, wingM, .5, .03, .26, .25 * s, 0, 0, P); rig.wing.push(w); });
    g.userData.rig = rig;
    return { g, body, head, parts:P, mats:[black, wingM], aimY:0 };
  },
  init(z){
    z.rig = z.g.userData.rig; z.orb = rand(0, 6.28); z.rad = rand(1, 3.2); z.oy = rand(-1, 1); z.ph = rand(0, 6); z.peck = 0;
    z.g.position.y = rand(5, 8);
    if (!MN.child){
      z.flock = { cx:z.g.position.x, cz:z.g.position.z, y:rand(5.5, 8), spd:z.speed * .55, t:-1, ph:rand(0, 6) };
      mnSpawnGroup(z, 'crow', MN_FLOCK - 1, 2.5).forEach(c => { c.flock = z.flock; c.g.position.y = z.flock.y + rand(-1, 1); });
      mnSnd('caw');
    }
    if (!z.flock) z.flock = { cx:z.g.position.x, cz:z.g.position.z, y:6.5, spd:z.speed * .55, t:-1, ph:0 };
  },
  update(z, dt){
    const F = z.flock, gp = z.g.position, tm = typeof time === 'number' ? time : 0, fr = typeof zFrame === 'number' ? zFrame : tm;
    if (F.t !== fr){ // le centre de la nuée avance une fois par image
      F.t = fr;
      if (F.cz < BAR_Z - 7){ F.cz += F.spd * dt; F.cx = clamp(F.cx + Math.sin(tm * .7 + F.ph) * 2 * dt, -9, 9); }
    }
    const fl = Math.sin(tm * 28 + z.ph) * .9; z.rig.wing[0].rotation.z = -fl; z.rig.wing[1].rotation.z = fl;
    if (z.st === 'walk'){ // tourne en nuée
      z.orb += dt * 2.6;
      mnV.set(F.cx + Math.cos(z.orb) * z.rad, F.y + Math.sin(z.orb * 2) * .6 + z.oy, F.cz + Math.sin(z.orb) * z.rad);
      gp.lerp(mnV, Math.min(1, dt * 4));
      z.g.rotation.y = Math.atan2(-Math.sin(z.orb), Math.cos(z.orb)) * .5;
      if (F.cz >= BAR_Z - 7.5 && Math.random() < dt * 1.2){ z.st = 'dive'; z.tx = clamp(gp.x + rand(-3, 3), -11, 11); z.ty = rand(.8, 2.2); }
    } else if (z.st === 'dive'){ // pique sur la barricade
      mnV.set(z.tx, z.ty, z.stopZ); const d = mnV.distanceTo(gp), v = 9 * dt;
      if (d <= v){ gp.copy(mnV); z.st = 'attack'; z.atkT = rand(.2, .5); z.peck = 0; }
      else gp.addScaledVector(mnV.sub(gp).divideScalar(d), v);
      z.g.rotation.y = 0;
    } else if (z.st === 'attack'){ // coups de bec
      gp.y = z.ty + Math.sin(tm * 9 + z.ph) * .1;
      z.atkT -= dt;
      if (z.atkT <= 0){
        z.atkT = rand(.5, .8); z.peck++; hitBarricade(z, z.dmg, .02, 1);
        if (z.peck >= 3 && Math.random() < .6){ z.st = 'rise'; z.riseZ = z.stopZ - rand(5, 8); }
      }
    } else { // remonte, puis repique
      gp.z -= 5 * dt; gp.y += (F.y - gp.y) * Math.min(1, dt * 2);
      if (gp.z <= z.riseZ){ z.st = 'dive'; z.tx = clamp(gp.x + rand(-3, 3), -11, 11); z.ty = rand(.8, 2.2); }
    }
    return true;
  }
};

/* ---------- Bouclier : zombie anti-émeute ---------- */
ZKINDS.shield = {
  build(T){
    const R = buildHumanoid(T, TENUES.policier ? 'policier' : 'civil'), body = R.body, P = R.parts;
    const sh = zkGroup(body, 0, 0, 0);
    zkWeak(zkMesh(sh, ZKG.box, MN_M.shield, .95, 1.22, .07, 0, 1.02, .44, P), MN_W.bouclier);  // bouclier
    zkWeak(zkMesh(sh, ZKG.box, MN_M.visor, .6, .2, .075, 0, 1.42, .445, P), MN_W.bouclier);    // hublot
    zkMesh(sh, ZKG.box, zmat(ZC.blanc), .8, .07, .076, 0, .78, .446);                          // bande blanche
    zkMesh(sh, ZKG.box, zmat(ZC.noir), .97, .05, .08, 0, 1.635, .44);                          // rebord
    R.shield = sh;
    return R;
  },
  init(z){ z.blockT = 0; }
};

/* ---------- Armures : balles arrêtées par le bouclier, la pierre des ailes ---------- */
try {
  const _w = weakHit;
  weakHit = function(z, m, amt, point){
    const wk = m && m.userData && m.userData.weak;
    if (!wk || !wk.armor || !z || z.dead) return _w.apply(this, arguments);
    // Balle perforante (sniper, .50, canon long...) : elle traverse le bouclier ou la pierre en perdant un quart de sa force
    const W = S && WEAPONS[S.cur], pen = W && wPierce(S.cur) >= 2 && (W.pellets || 1) === 1;
    if (pen){ damage(z, amt * .75, false, point); burst(point, 'dust', 3, 2); return true; }
    damage(z, amt * wk.mult, false, point);
    MN.blocks++;
    burst(point, PMATS.ember ? 'ember' : 'dust', 4, 2.5);
    const now = typeof time === 'number' ? time : 0;
    if (!(z.blockT > now - .6)){ z.blockT = now; if (typeof ecrPush === 'function') ecrPush(wk.effet === 'pierre' ? 'Pierre : ricochet' : 'Bloqué par le bouclier', 'weak'); mnSnd(wk.effet === 'pierre' ? 'stone' : 'clang'); }
    return true;
  };
} catch (e) {}

/* ---------- Vagues : ils remplacent des marcheurs ---------- */
function mnReplace(q, type, n){
  if (n <= 0) return 0;
  const idx = []; for (let i = 0; i < q.length; i++) if (q[i] === 'walker') idx.push(i);
  for (let i = idx.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  n = Math.min(n, Math.floor(idx.length * .6)); // garde toujours des marcheurs
  for (let i = 0; i < n; i++) q[idx[i]] = type;
  return n;
}
// Nombre de chaque nouveau monstre pour la vague w de la ville L (chefs de meute et de nuée pour rampants et corbeaux)
function mnCounts(w, L, total){
  const off = (L && L.off) || 0, ew = w + off;
  return {
    crawler:  ew >= 2 ? Math.max(1, Math.round(total / 60 * (1 + .2 * off))) : 0,
    bloater:  ew >= 3 ? Math.max(1, Math.round(total / 45 * (1 + .15 * off))) : 0,
    gargoyle: off >= 1 && w >= 2 ? Math.max(1, Math.round(total / 100 * (1 + .25 * (off - 1)))) : 0,
    crow:     off >= 2 && w >= 2 ? Math.max(1, Math.round(total / 160 * (1 + .2 * (off - 2)))) : 0,
    shield:   off >= 3 ? Math.max(1, Math.round(total / 28 * (1 + .2 * (off - 3)) * Math.min(1, w / 2))) : 0
  };
}
try {
  const _wp = wavePlan;
  wavePlan = function(w, L){
    const p = _wp.apply(this, arguments);
    try {
      L = L || curLoc;
      if (p && p.queue && L){
        const tot = p.queue.filter(t => t !== 'boss').length, c = mnCounts(w, L, tot);
        MN_TYPES.forEach(t => mnReplace(p.queue, t, c[t]));
      }
    } catch (e) {}
    return p;
  };
} catch (e) {}

/* ---------- Repères hors champ : la gargouille comme un volant, le gonflé près de la barricade ---------- */
try {
  if (typeof rpThreat === 'function'){
    const _r = rpThreat;
    rpThreat = function(z){
      if (z.type === 'gargoyle' && !z.dead) return z.st === 'attack' ? ['flyer', .8] : z.g.position.z > -60 ? ['flyer', .5] : null;
      if (z.type === 'bloater' && !z.dead && z.g.position.z > BAR_Z - 12) return ['bar', .85];
      return _r.apply(this, arguments);
    };
  }
} catch (e) {}

// Accès pour les tests automatiques
window.__mn = { MN, MN_TYPES, MN_W, MN_BOOM, MN_PACK, MN_FLOCK, mnCounts, mnExplode };
