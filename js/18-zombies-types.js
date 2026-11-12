'use strict';
/* ================= Types de zombies spéciaux : formes et comportements ================= */
// Contrat (utilisé par 07-zombies.js et par d'autres fichiers, ex. un boss) :
//   ZKINDS[type] = { build(T), init(z), update(z, dt) }
//   build(T) reçoit ZTYPES[type] et retourne { g, body, head, parts, mats, aimY? } :
//     g = groupe racine (spawnZombie le positionne et l'ajoute à la scène ; build gère lui-même l'échelle),
//     body = groupe qui bascule à la mort, head = maillage de la tête, parts = maillages touchables,
//     mats = matériaux du zombie (mats[0] au minimum ; mats[0] et mats[1] font le flash rouge). Avec zmat(couleur) ou zfix(matériau)
//       (07-zombies.js), ils sont partagés et le zombie est dessiné par instances (rapide en foule) ; un matériau créé à part
//       (lam, new ...) garde l'ancien chemin : vrai groupe dans la scène, matériau libéré à la mort (le boss fait ainsi).
//     aimY = hauteur du centre du corps au-dessus de g (ciblage des défenses). Facultatif : geos = géométries propres à libérer.
//   init(z) : juste après la création de z. update(z, dt) : chaque image pour un zombie vivant ; true = saute le code par défaut.
//   Points faibles (facultatif) : un maillage de parts porte userData.weak = { mult, effet } ; un tir dessus passe par
//   weakHit (07-zombies.js) qui multiplie les dégâts et appelle onWeak(z, maillage, dégâts, point, weak).
//   onWeak retourne { done, txt } : done = les dégâts sont déjà infligés, txt = texte ajouté à « Point faible ! ».
// Géométries et matériaux partagés créés une seule fois ici : aucun n'est libéré, aucun n'est recréé.
const ZKINDS = {};
const ZKG = { box:ZG.box, top:new THREE.BoxGeometry(1, 1, 1), sph:new THREE.SphereGeometry(1, 10, 8), spit:new THREE.SphereGeometry(.24, 8, 6) };
ZKG.top.translate(0, -.5, 0); // pivot en haut : membres qui tournent à l'épaule, à la hanche, au genou
const ZKM = {
  acid:new THREE.MeshLambertMaterial({ color:0x8fdc2a, emissive:0x3e8a0c }),
  core:new THREE.MeshBasicMaterial({ color:0xffa02a, fog:false }), // point lumineux du colosse, visible dans le brouillard
  mouth:new THREE.MeshBasicMaterial({ color:0x140806 }),
  spit:new THREE.MeshBasicMaterial({ color:0x9cff3a, fog:false })
};
Object.keys(ZKM).forEach(k => zfix(ZKM[k])); // partagés : les zombies qui les portent passent par le rendu par instances (07-zombies.js)
PMATS.acid = new THREE.MeshBasicMaterial({ color:0x7ee02a });
function zkMesh(parent, geo, mat, sx, sy, sz, x, y, z, list){
  const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m); if (list) list.push(m); return m;
}
function zkGroup(parent, x, y, z){ const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
// Points faibles (objets partagés, jamais modifiés)
const WEAK = {
  acide: { mult:2,   effet:'acide' },  // cracheur : poches d'acide qui éclatent
  aile:  { mult:1.5, effet:'aile' },   // volant : ailes, il tombe au sol
  plaque:{ mult:3,   effet:'plaque' }, // colosse : point lumineux sur la poitrine
  jambe: { mult:1.3, effet:'jambe' }   // sauteur : jambes, il ne saute plus
};
const zkWeak = (m, w) => { m.userData.weak = w; return m; };
const ZK_HAILLONS = [0x5b3a2e, 0x3d4a5c, 0x7a2e2e, 0x4b5a3a, ZC.hivis, ZC.navy]; // torse du sauteur : couleurs déjà dans la palette partagée
const zkV = new THREE.Vector3();
function zkEyes(parent, y, z, dx, s){ s = s || 1; zkMesh(parent, ZKG.box, eyeMat, .08 * s, .05 * s, .02, -dx, y, z); zkMesh(parent, ZKG.box, eyeMat, .08 * s, .05 * s, .02, dx, y, z); }

/* ---------- Sauteur : maigre, longues jambes repliées, avance par bonds ---------- */
ZKINDS.jumper = {
  build(T){
    const skin = zmat(T.skin), rag = zmat(pick(PANTS)), top = Math.random() < .5 ? rag : zmat(pick(ZK_HAILLONS));
    const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), P = [];
    zkMesh(body, ZKG.box, top, .34, .55, .22, 0, 1.32, 0, P);                 // torse étroit (haillons de couleurs variées)
    zkMesh(body, ZKG.box, skin, .1, .5, .08, 0, 1.36, -.13, P);               // colonne qui ressort
    const head = zkMesh(body, ZKG.box, skin, .26, .3, .38, 0, 1.74, .1, P);   // tête allongée vers l'avant
    zkEyes(body, 1.78, .3, .07);
    zkMesh(body, ZKG.box, ZKM.mouth, .16, .05, .03, 0, 1.64, .29);
    const armL = zkGroup(body, -.22, 1.56, 0), armR = zkGroup(body, .22, 1.56, 0);
    zkMesh(armL, ZKG.top, skin, .09, .95, .09, 0, 0, 0, P); zkMesh(armR, ZKG.top, skin, .09, .95, .09, 0, 0, 0, P);
    const rig = { hip:[], knee:[] };
    [-.13, .13].forEach(x => {
      const hip = zkGroup(body, x, 1.02, 0); zkWeak(zkMesh(hip, ZKG.top, rag, .14, .72, .15, 0, 0, 0, P), WEAK.jambe);
      const knee = zkGroup(hip, 0, -.72, 0); zkWeak(zkMesh(knee, ZKG.top, skin, .1, .82, .1, 0, 0, 0, P), WEAK.jambe);
      zkMesh(knee, ZKG.box, skin, .14, .06, .3, 0, -.82, .1);                 // pied griffu
      rig.hip.push(hip); rig.knee.push(knee);
    });
    g.scale.setScalar(T.scale); g.userData.rig = rig;
    return { g, body, head, armL, armR, parts:P, mats:top === rag ? [skin, rag] : [skin, top, rag], aimY:1.25 * T.scale };
  },
  init(z){ z.rig = z.g.userData.rig; z.jst = 'crouch'; z.jt = rand(.1, .4); z.ju = 0; },
  // Jambe touchée : il ne peut plus sauter (le bond en cours se termine) et avance en boitant
  onWeak(z, m, amt){
    if (z.lame) return null;
    z.lame = true; z.limpSpd = Math.min(z.speed * .22, 1.1);
    return { txt:'Boiteux' };
  },
  update(z, dt){
    const R = z.rig, gp = z.g.position;
    const legs = (th, kn) => { for (let i = 0; i < 2; i++){ R.hip[i].rotation.x = th; R.knee[i].rotation.x = kn; } };
    if (z.st === 'attack'){ gp.y = 0; z.body.position.y = -.2; z.body.rotation.x = .3; legs(-1.25, 2.3); return false; } // griffes : code par défaut
    if (z.lame && z.jst !== 'air'){ // boite lentement vers la barricade
      gp.y = 0; gp.z += z.limpSpd * dt; z.phase += dt * 4;
      const s = Math.sin(z.phase);
      R.hip[0].rotation.x = -.5 + s * .35; R.knee[0].rotation.x = .9; R.hip[1].rotation.x = -.2; R.knee[1].rotation.x = .3 + Math.max(0, s) * .3; // une jambe traîne
      z.body.position.y = -.28 + Math.abs(s) * .04; z.body.rotation.x = .45; z.body.rotation.z = .18 + s * .06;
      if (z.armL){ z.armL.rotation.x = -.9 + s * .2; z.armR.rotation.x = -.6 - s * .2; }
      if (gp.z >= z.stopZ){ gp.z = z.stopZ; z.st = 'attack'; }
      return true;
    }
    if (z.jst === 'crouch'){
      z.jt -= dt; const k = clamp(1 - z.jt / .32, 0, 1);
      legs(-1.1 - .35 * k, 2 + .5 * k); z.body.position.y = -.38 * k; z.body.rotation.x = .35 + .2 * k;
      if (z.armL){ z.armL.rotation.x = -.3 + .6 * k; z.armR.rotation.x = -.3 + .6 * k; }
      if (z.jt <= 0){
        const d = Math.min(z.speed * .95 * rand(.85, 1.2), z.stopZ - gp.z);
        if (d <= .05){ gp.z = z.stopZ; z.st = 'attack'; return false; }
        z.jz0 = gp.z; z.jd = d; z.jx0 = gp.x; z.jdx = clamp(gp.x + rand(-1.4, 1.4), -11, 11) - gp.x;
        z.jh = Math.min(3.6, 1.4 + d * .3 + rand(0, .6)); z.jT = .55 + d * .025; z.ju = 0; z.jst = 'air'; // assez haut pour passer par-dessus les autres
      }
    } else {
      z.ju += dt / z.jT; const u = Math.min(1, z.ju);
      gp.z = z.jz0 + z.jd * u; gp.x = z.jx0 + z.jdx * u; gp.y = z.jh * 4 * u * (1 - u);
      legs(-.25 - .3 * u, .35 + .6 * u); z.body.position.y = 0; z.body.rotation.x = .55 - .5 * u;
      if (z.armL){ z.armL.rotation.x = .9 - 1.6 * u; z.armR.rotation.x = .9 - 1.6 * u; }
      if (u >= 1){
        gp.y = 0; z.jst = 'crouch'; z.jt = .32;
        if (gp.z >= z.stopZ - .05){ gp.z = z.stopZ; z.st = 'attack'; }
      }
    }
    return true;
  }
};

/* ---------- Volant : créature ailée, vol ondulé, plonge sur la barricade ---------- */
ZKINDS.flyer = {
  build(T){
    const skin = zmat(T.skin), wingM = zmat(0x3a2c34);
    const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), P = [];
    zkMesh(body, ZKG.box, skin, .36, .32, .9, 0, .4, 0, P);                    // corps allongé, horizontal
    zkMesh(body, ZKG.sph, skin, .24, .22, .28, 0, .36, .26, P);                // poitrail
    const head = zkMesh(body, ZKG.box, skin, .26, .24, .34, 0, .48, .62, P);
    zkMesh(body, ZKG.box, ZKM.mouth, .2, .07, .22, 0, .35, .66);               // gueule ouverte
    zkEyes(body, .52, .8, .07);
    zkMesh(body, ZKG.box, wingM, .05, .2, .06, -.09, .66, .5); zkMesh(body, ZKG.box, wingM, .05, .2, .06, .09, .66, .5); // cornes
    zkMesh(body, ZKG.box, skin, .14, .12, .5, 0, .42, -.66, P);                // queue
    zkMesh(body, ZKG.box, skin, .07, .06, .45, 0, .45, -1.1, P);
    [-.1, .1].forEach(x => { const l = zkMesh(body, ZKG.top, wingM, .06, .42, .06, x, .26, -.15); l.rotation.x = .6; }); // pattes pendantes
    const rig = { wing:[], tip:[] };
    [-1, 1].forEach(s => {
      const w = zkGroup(body, .18 * s, .52, .05);
      zkMesh(w, ZKG.box, wingM, .95, .07, .08, .47 * s, 0, .02);              // os de l'aile
      zkWeak(zkMesh(w, ZKG.box, wingM, .95, .06, .62, .47 * s, 0, -.3, P), WEAK.aile);    // membrane (assez épaisse pour être touchée de profil)
      const t = zkGroup(w, .94 * s, 0, 0);
      zkWeak(zkMesh(t, ZKG.box, wingM, .8, .05, .48, .4 * s, 0, -.22, P), WEAK.aile);     // bout de l’aile
      zkMesh(t, ZKG.box, wingM, .06, .06, .18, .8 * s, 0, .05);               // griffe
      rig.wing.push(w); rig.tip.push(t);
    });
    const sc = 1.15 * T.scale; g.scale.setScalar(sc); g.userData.rig = rig;
    return { g, body, head, parts:P, mats:[skin, wingM], aimY:.4 * sc };
  },
  init(z){
    z.rig = z.g.userData.rig; z.alt = rand(5.5, 9); z.g.position.y = z.alt; z.fl = rand(0, 6); z.hits = 0; z.lunge = 0;
    z.stopZ = BAR_Z - 1.3 - rand(0, .6); z.diveZ = z.stopZ - rand(9, 14);
  },
  // Aile touchée 2 fois (ou un gros coup) : il tombe, la chute le blesse gravement, puis il rampe
  onWeak(z, m, amt){
    z.wingHits = (z.wingHits || 0) + 1;
    if (z.downed || (z.wingHits < 2 && amt < .4 * z.maxHp)) return null;
    z.downed = 'fall'; z.fallV = 0; z.lunge = 0; z.body.position.z = 0;
    return { txt:'Au sol' };
  },
  downUpdate(z, dt){
    const R = z.rig, gp = z.g.position;
    if (z.downed === 'fall'){
      z.fallV += 20 * dt; gp.y = Math.max(0, gp.y - z.fallV * dt);
      z.body.rotation.x = Math.min(1.2, z.body.rotation.x + dt * 3); z.body.rotation.z += dt * 4;
      R.wing[0].rotation.z = 1.1; R.wing[1].rotation.z = -1.1;
      if (gp.y <= 0){
        z.downed = 'crawl'; z.fallV = 0; z.body.rotation.set(0, 0, 0); z.st = 'walk';
        z.crawlZ = BAR_Z - .9 - rand(0, .6); z.atkT = rand(.6, 1);
        zkV.set(gp.x, .3, gp.z); burst(zkV, 'dust', 8, 2.5);
        if (Math.random() < .6) Snd.burst(260, .25, .25);
        damage(z, z.maxHp * .45, false, zkV); // la chute fait très mal
      }
      return true;
    }
    // Rampe au sol, ailes traînantes ; à la barricade, petits coups de gueule
    z.fl += dt * 4; const a = Math.sin(z.fl);
    R.wing[0].rotation.z = .25 + a * .12; R.wing[1].rotation.z = -.25 - a * .12;
    R.tip[0].rotation.z = .3; R.tip[1].rotation.z = -.3;
    gp.y = 0; z.body.position.y = -.12; z.body.rotation.x = .12 + a * .04; z.body.rotation.z = a * .08;
    if (gp.z < z.crawlZ){ gp.z = Math.min(z.crawlZ, gp.z + z.speed * .2 * dt); gp.x += Math.sin(z.fl * .5) * .3 * dt; }
    else {
      z.atkT -= dt;
      if (z.atkT <= 0){ z.atkT = rand(1.2, 1.6); hitBarricade(z, z.dmg * .6, .1, 2); }
    }
    return true;
  },
  update(z, dt){
    const R = z.rig, gp = z.g.position;
    if (z.downed) return ZKINDS.flyer.downUpdate(z, dt);
    z.fl += dt * (z.st === 'attack' ? 15 : 10);
    const a = Math.sin(z.fl), b = Math.sin(z.fl - .7);
    R.wing[0].rotation.z = -a * .75; R.wing[1].rotation.z = a * .75;
    R.tip[0].rotation.z = -b * .55; R.tip[1].rotation.z = b * .55;
    z.phase += dt * .9;
    if (z.st === 'walk'){ // vol de croisière ondulé
      gp.z += z.speed * dt;
      gp.x = clamp(gp.x + Math.sin(z.phase) * 1.8 * dt, -11, 11);
      gp.y += (z.alt + Math.sin(z.phase * 1.7) * 1.1 - gp.y) * Math.min(1, dt * 3);
      z.body.rotation.x = .08 + Math.cos(z.phase * 1.7) * .1; z.body.rotation.z = -Math.cos(z.phase) * .25;
      if (gp.z >= z.diveZ) z.st = 'dive';
    } else if (z.st === 'dive'){ // plongeon vers la barricade
      const tx = clamp(gp.x, -11, 11), dx = tx - gp.x, dy = 1.5 - gp.y, dz = z.stopZ - gp.z, L = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const v = (z.speed * 2.2 + 3) * dt;
      if (L <= v){ gp.set(tx, 1.5, z.stopZ); z.st = 'attack'; z.atkT = rand(.25, .5); }
      else { gp.x += dx / L * v; gp.y += dy / L * v; gp.z += dz / L * v; }
      z.body.rotation.x = .75; z.body.rotation.z *= .9;
    } else if (z.st === 'attack'){ // vol stationnaire, coups de gueule sur la barricade
      gp.y = 1.5 + Math.sin(z.fl * .5) * .15;
      z.lunge = Math.max(0, z.lunge - dt * 1.5); z.body.position.z = z.lunge; z.body.rotation.x = .3 + z.lunge * 1.6;
      z.atkT -= dt;
      if (z.atkT <= 0){
        z.atkT = rand(.9, 1.2); z.lunge = .3; z.hits++;
        hitBarricade(z, z.dmg, .15, 3);
        if (z.hits >= 3 && Math.random() < .5){ z.st = 'rise'; z.hits = 0; z.riseZ = z.stopZ - rand(14, 18); z.diveZ = z.stopZ - rand(8, 12); }
      }
    } else { // 'rise' : remonte et recule, puis replonge
      gp.z -= z.speed * 1.1 * dt;
      gp.y += (z.alt - gp.y) * Math.min(1, dt * 1.8);
      z.body.position.z = 0; z.body.rotation.x = -.35;
      if (gp.z <= z.riseZ) z.st = 'walk';
    }
    return true;
  }
};

/* ---------- Cracheur : corps gonflé, gorge enflée, crache de l'acide à distance ---------- */
ZKINDS.spitter = {
  build(T){
    const skin = zmat(T.skin), rag = zmat(pick(PANTS));
    const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), P = [];
    zkMesh(body, ZKG.sph, skin, .5, .55, .46, 0, 1.12, .05, P);                // ventre gonflé
    zkMesh(body, ZKG.sph, skin, .38, .3, .34, 0, 1.52, -.08, P);               // bosse du dos
    zkWeak(zkMesh(body, ZKG.sph, ZKM.acid, .21, .21, .21, -.36, 1.22, .3, P), WEAK.acide);   // poches d'acide (points faibles)
    zkWeak(zkMesh(body, ZKG.sph, ZKM.acid, .17, .17, .17, .35, 1.04, .34, P), WEAK.acide);
    zkWeak(zkMesh(body, ZKG.sph, ZKM.acid, .15, .13, .13, .08, .9, .48, P), WEAK.acide);
    const sac = zkWeak(zkMesh(body, ZKG.sph, ZKM.acid, .25, .22, .25, 0, 1.63, .2, P), WEAK.acide); // gorge déformée
    const head = zkMesh(body, ZKG.box, skin, .3, .26, .3, 0, 1.86, .1, P);
    zkEyes(body, 1.9, .26, .08);
    zkMesh(body, ZKG.box, ZKM.mouth, .2, .1, .04, 0, 1.77, .26);
    const coiffe = Math.random(); // quelques cracheurs gardent un casque de chantier ou une tuque
    if (coiffe < .15){ zkMesh(body, ZKG.box, zmat(ZC.jaune), .36, .12, .36, 0, 2.04, .1); zkMesh(body, ZKG.box, zmat(ZC.jaune), .42, .03, .44, 0, 1.99, .12); }
    else if (coiffe < .27){ zkMesh(body, ZKG.box, zmat(ZC.hivis), .34, .13, .34, 0, 2.03, .1); }
    const armL = zkGroup(body, -.46, 1.4, 0), armR = zkGroup(body, .46, 1.4, 0);
    zkMesh(armL, ZKG.top, skin, .14, .5, .14, 0, 0, 0, P); zkMesh(armR, ZKG.top, skin, .14, .5, .14, 0, 0, 0, P);
    const legL = zkGroup(body, -.2, .72, 0), legR = zkGroup(body, .2, .72, 0);
    zkMesh(legL, ZKG.top, rag, .24, .72, .26, 0, 0, 0, P); zkMesh(legR, ZKG.top, rag, .24, .72, .26, 0, 0, 0, P);
    g.scale.setScalar(T.scale); g.userData.rig = { sac };
    return { g, body, head, armL, armR, legL, legR, parts:P, mats:[skin, rag], aimY:1.15 * T.scale };
  },
  init(z){ z.rig = z.g.userData.rig; z.stopZ = BAR_Z - rand(25, 40); z.spitT = rand(.5, 1.2); },
  // Poche d'acide touchée : elle éclate, éclabousse les zombies autour et blesse gravement le cracheur
  onWeak(z, m, amt, point){
    dropZombieMesh(z, m);
    burst(point, 'acid', 18, 3.4);
    Snd.burst(1200, .25, .35); Snd.tone(180, .25, 'sawtooth', .08, 60);
    const gp = z.g.position, r = SPIT_POP.radius, hurt = SPIT_POP.splash * z.maxHp;
    for (const o of zombies){
      if (o === z || o.dead) continue;
      const dx = o.g.position.x - gp.x, dz = o.g.position.z - gp.z, d = Math.sqrt(dx * dx + dz * dz);
      if (d >= r) continue;
      zkV.set(o.g.position.x, o.g.position.y + (o.aimY != null ? o.aimY : 1.1), o.g.position.z);
      burst(zkV, 'acid', 3, 1.5);
      damage(o, hurt * (1 - .5 * d / r), false, zkV);
    }
    damage(z, amt + SPIT_POP.self * z.maxHp, false, point);
    return { done:true, txt:'Acide' };
  },
  update(z, dt){
    const sac = z.rig.sac;
    if (z.st === 'walk'){ sac.scale.setScalar(.24 + Math.sin(z.phase * 1.3) * .015); return false; } // marche par défaut, s'arrête à mi-distance
    z.spitT -= dt;
    const w = z.spitT < .8 ? clamp(1 - z.spitT / .8, 0, 1) : 0; // la gorge enfle avant le crachat
    sac.scale.set(.25 * (1 + w * .7), .22 * (1 + w * .8), .25 * (1 + w * .7));
    z.head.rotation.x = -w * .6 + (z.snapT > 0 ? .45 : 0);
    z.body.rotation.x = .06 - w * .15; z.body.position.y = 0;
    if (z.snapT > 0) z.snapT -= dt;
    z.phase += dt * 2;
    if (z.armL){ z.armL.rotation.x = -.4 + Math.sin(z.phase) * .15; z.armR.rotation.x = -.4 - Math.sin(z.phase) * .15; }
    if (z.legL){ z.legL.rotation.x = 0; z.legR.rotation.x = 0; }
    if (z.spitT <= 0){
      z.spitT = rand(2.6, 3.4); z.snapT = .25;
      const sc = (ZTYPES[z.type] || {}).scale || 1, gp = z.g.position;
      // Robot (39-robot.js) : le crachat vise le robot là où il est ; un pas de côté l'esquive (zkFrame)
      if (typeof MECH === 'object' && MECH.on) spitLaunch(gp.x, 1.78 * sc, gp.z + .35 * sc, MECH.x + rand(-.8, .8), rand(2.5, 4), MECH_CAM.z, z.dmg);
      else spitLaunch(gp.x, 1.78 * sc, gp.z + .35 * sc, clamp(gp.x * .6 + rand(-2, 2), -11, 11), rand(.5, 1.5), BAR_Z - .1, z.dmg);
    }
    return true;
  }
};
// Éclatement d'une poche : rayon (m), dégâts aux voisins et au cracheur (en part de sa vie maximale)
const SPIT_ESQUIVE = 2.6; // robot : un crachat qui tombe à plus de 2,6 m de lui le rate
const SPIT_POP = { radius:4, splash:.6, self:.5 };
// Crachats : pool fixe de maillages, géométrie et matériau partagés
const zkRoot = new THREE.Group(); scene.add(zkRoot);
const spits = [];
for (let i = 0; i < 24; i++){ const m = new THREE.Mesh(ZKG.spit, ZKM.spit); m.visible = false; zkRoot.add(m); spits.push({ m, a:new THREE.Vector3(), b:new THREE.Vector3(), t:0, T:1, hgt:4, dmg:0, trail:0 }); }
function spitLaunch(x, y, z, tx, ty, tz, dmg){
  let o = null; for (const s of spits) if (!s.m.visible){ o = s; break; }
  if (!o) return null;
  o.a.set(x, y, z); o.b.set(tx, ty, tz); const d = o.a.distanceTo(o.b);
  o.t = 0; o.T = 1.1 + d * .008; o.hgt = 4 + d * .12; o.dmg = dmg; o.trail = 0;
  o.m.position.copy(o.a); o.m.visible = true;
  if (Math.random() < .6) Snd.tone(320, .18, 'sawtooth', .05, 120);
  return o;
}
let spitDiv = null, spitTO = 0;
function spitSplash(){ // petite éclaboussure verte sur les bords de l'écran, discrète
  if (!spitDiv){
    spitDiv = document.createElement('div');
    spitDiv.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity .9s ease-out;'
      + 'background:radial-gradient(circle at 8% 88%,rgba(140,230,40,.55),rgba(140,230,40,0) 18%),radial-gradient(circle at 93% 80%,rgba(120,210,30,.45),rgba(120,210,30,0) 14%),radial-gradient(circle at 15% 12%,rgba(150,240,60,.35),rgba(150,240,60,0) 10%)';
    document.body.appendChild(spitDiv);
  }
  spitDiv.style.transition = 'none'; spitDiv.style.opacity = .4;
  clearTimeout(spitTO); spitTO = setTimeout(() => { if (spitDiv){ spitDiv.style.transition = 'opacity .9s ease-out'; spitDiv.style.opacity = 0; } }, 60);
}
// Appelée par updateZombies() à chaque image de jeu
function zkFrame(dt){
  for (const o of spits){
    if (!o.m.visible) continue;
    o.t += dt; const u = Math.min(1, o.t / o.T);
    o.m.position.lerpVectors(o.a, o.b, u); o.m.position.y += o.hgt * 4 * u * (1 - u);
    const p = 1 + Math.sin(o.t * 30) * .15; o.m.scale.set(p, 2 - p, p);
    o.trail -= dt; if (o.trail <= 0){ o.trail = .07; burst(o.m.position, 'acid', 1, .4); }
    if (u >= 1){
      o.m.visible = false;
      // Robot : touché seulement s'il est encore à moins de SPIT_ESQUIVE mètres de l'endroit visé
      const rate = typeof MECH === 'object' && MECH.on && Math.abs(MECH.x - o.b.x) > SPIT_ESQUIVE;
      burst(o.b, 'acid', 9, 2.4); burst(o.b, 'wood', 2, 2);
      if (rate){ Snd.burst(900, .15, .1); continue; }
      if (S){ S.bar = Math.max(0, S.bar - o.dmg); }
      shake = Math.max(shake, .12); Snd.burst(900, .2, .25);
      spitSplash();
    }
  }
}
// Appelée par clearZombies() (nouvelle partie, changement de ville, retour à la carte)
function zkClear(){
  for (const o of spits){ o.m.visible = false; o.t = 0; }
  if (spitDiv){ clearTimeout(spitTO); spitDiv.style.transition = 'none'; spitDiv.style.opacity = 0; }
}

/* ---------- Colosse : énorme, épaules massives, bras géants, frappe qui secoue tout ---------- */
ZKINDS.colossus = {
  build(T){
    const skin = zmat(T.skin), dark = zmat(0x2a2620), bone = zmat(0xb5aa8a);
    const g = new THREE.Group(), body = zkGroup(g, 0, 0, 0), P = [];
    zkMesh(body, ZKG.box, skin, 1.1, .56, .62, 0, 1.42, .08, P);               // poitrine énorme
    zkMesh(body, ZKG.box, skin, .66, .42, .46, 0, 1.0, .02, P);                // ventre
    zkMesh(body, ZKG.box, dark, .62, .26, .4, 0, .74, 0, P);                   // bassin
    [-1, 1].forEach(s => { const sh = zkMesh(body, ZKG.box, skin, .48, .44, .54, .62 * s, 1.62, .04, P); sh.rotation.z = -.3 * s; }); // épaules
    [[0, 1.78, -.24], [-.26, 1.72, -.22], [.26, 1.72, -.22]].forEach(p => zkMesh(body, ZKG.box, bone, .16, .24, .3, p[0], p[1], p[2], P)); // plaques d'os
    const core = zkWeak(zkMesh(body, ZKG.box, ZKM.core, .3, .26, .06, -.2, 1.4, .41, P), WEAK.plaque); // plaie lumineuse sur la poitrine (point faible)
    zkMesh(body, ZKG.box, dark, .4, .05, .07, -.2, 1.56, .4); zkMesh(body, ZKG.box, dark, .4, .05, .07, -.2, 1.24, .4); // bords de la plaie
    const head = zkMesh(body, ZKG.box, skin, .3, .28, .32, 0, 1.66, .44, P);   // petite tête enfoncée
    zkMesh(body, ZKG.box, bone, .34, .1, .28, 0, 1.52, .47, P);                // mâchoire
    zkEyes(body, 1.7, .605, .08, .8);
    const arm = [], elbow = [];
    [-1, 1].forEach(s => {
      const a = zkGroup(body, .82 * s, 1.66, .05); zkMesh(a, ZKG.top, skin, .32, .64, .34, 0, 0, 0, P);
      const e = zkGroup(a, 0, -.62, 0); zkMesh(e, ZKG.top, skin, .42, .64, .44, 0, 0, 0, P);
      zkMesh(e, ZKG.box, skin, .5, .38, .5, 0, -.78, .02, P);                 // poing
      arm.push(a); elbow.push(e);
    });
    const legL = zkGroup(body, -.22, .7, 0), legR = zkGroup(body, .22, .7, 0);
    zkMesh(legL, ZKG.top, dark, .32, .64, .34, 0, 0, 0, P); zkMesh(legR, ZKG.top, dark, .32, .64, .34, 0, 0, 0, P);
    g.scale.setScalar(T.scale); g.userData.rig = { arm, elbow, legL, legR, core };
    return { g, body, head, parts:P, mats:[skin, dark, bone], aimY:1.2 * T.scale };
  },
  init(z){ z.rig = z.g.userData.rig; z.lastS = 0; z.slamT = 0; z.stunT = 0; },
  // Point lumineux touché : dégâts ×3 et il recule d'un pas, sonné
  onWeak(z, m, amt, point){
    burst(point, 'dust', 6, 3); Snd.tone(900, .12, 'square', .05, 300);
    if (z.st === 'walk') z.stunT = .35;
    return null;
  },
  update(z, dt){
    const R = z.rig, gp = z.g.position;
    if (R.core){ const k = 1 + Math.sin(z.phase * 2.3) * .12; R.core.scale.set(.3 * k, .26 * k, .06); }
    if (z.stunT > 0 && z.st === 'walk'){ z.stunT -= dt; gp.z -= dt * .4; z.body.rotation.x = -.12; return true; }
    const arms = (x, el) => { R.arm[0].rotation.x = x; R.arm[1].rotation.x = x; R.elbow[0].rotation.x = el; R.elbow[1].rotation.x = el; };
    if (z.st === 'walk'){
      gp.z += z.speed * dt;
      gp.x = clamp(gp.x + Math.sin(z.phase * .3) * z.sway * dt * .2, -10.5, 10.5);
      z.phase += dt * (1.2 + z.speed * 2.2);
      const s = Math.sin(z.phase);
      R.legL.rotation.x = s * .4; R.legR.rotation.x = -s * .4;
      R.arm[0].rotation.x = -.25 - s * .3; R.arm[1].rotation.x = -.25 + s * .3; R.elbow[0].rotation.x = R.elbow[1].rotation.x = -.25;
      R.arm[0].rotation.z = -.12; R.arm[1].rotation.z = .12;
      z.body.rotation.x = .18; z.body.rotation.z = s * .07; z.body.position.y = Math.abs(Math.cos(z.phase)) * .04;
      // Pas lourds : petite secousse quand il approche
      if ((s >= 0) !== (z.lastS >= 0) && gp.z > -70){
        const k = 1 - clamp((BAR_Z - gp.z) / 60, 0, 1); shake = Math.max(shake, .05 + .15 * k);
        if (k > .4 && Math.random() < .5) Snd.burst(180, .25, .2);
      }
      z.lastS = s;
      if (gp.z >= z.stopZ){ gp.z = z.stopZ; z.st = 'attack'; z.atkT = 1.4; R.legL.rotation.x = R.legR.rotation.x = 0; }
      return true;
    }
    // Attaque : lève les deux bras, puis frappe
    z.atkT -= dt;
    if (z.slamT > 0){
      z.slamT -= dt; const k = clamp(z.slamT / .25, 0, 1);
      arms(-1.1 - 1.8 * k, -.3); z.body.rotation.x = .45 - .25 * k;
    } else {
      const w = z.atkT < 1 ? clamp(1 - z.atkT, 0, 1) : 0;
      arms(-.6 - 2.3 * w, -.3 - .5 * w); z.body.rotation.x = .3 - .25 * w;
    }
    if (z.atkT <= 0){
      z.atkT = rand(1.9, 2.3); z.slamT = .25;
      const ZT = ZTYPES[z.type] || {};
      hitBarricade(z, z.dmg, ZT.hitShake != null ? ZT.hitShake : 1, ZT.chips != null ? ZT.chips : 14);
      tmpV.set(gp.x, .3, BAR_Z - .5); burst(tmpV, 'dust', 10, 3.5);
      Snd.burst(300, .5, .7); Snd.tone(60, .4, 'sine', .5, 30);
    }
    return true;
  }
};

/* ---------- Clown zombie : très rare (compteur à vie, 07-zombies.js), ridicule, gros bonus ---------- */
// Contrat avec les missions et les succès : z.type === 'clown' et z.clown === true.
// Modèle : l'humanoïde de 07 avec la tenue TENUES.clown (pois, perruque, nez, collerette, chaussures géantes, ballon).
// Tout en couleurs de la palette partagée et un motif : dessiné par instances comme les autres.
const WEAK_BALLON = { mult:1, effet:'ballon' }; // le ballon se crève (aucun dégât au clown)
PMATS.confJ = new THREE.MeshBasicMaterial({ color:0xf0c828 });
PMATS.confB = new THREE.MeshBasicMaterial({ color:0x3a7cf0 });
PMATS.confR = new THREE.MeshBasicMaterial({ color:0xe03a3a });
if (typeof SCRAP_Z === 'object' && SCRAP_Z) SCRAP_Z.clown = 60; // ferraille (× difficulté de la ville)
const CLOWN_MOTS = ['Le cirque est fermé !', 'Fin du spectacle !', 'Pouet… pouet…', 'Plus personne ne rit !', 'Rideau !'];
TENUES.clown = { nom:'Clown', poids:0, pour:[], shirt:'pois', pants:'pois', manches:'chemise', mains:ZC.blanc, tete:ZC.blanc,
  acc(h){
    const B = h.head, sph = (par, c, s, x, y, z, sy) => zkMesh(par, ZKG.sph, zCol(c), s, sy || s, s, x, y, z);
    sph(B, ZC.rouge, .09, 0, -.03, .23);                                                     // gros nez rouge
    zAcc(B, ZC.rouge, .22, .04, .02, 0, -.12, .205);                                         // grand sourire
    zAcc(B, ZC.rouge, .05, .07, .02, -.11, -.09, .205, true); zAcc(B, ZC.rouge, .05, .07, .02, .11, -.09, .205, true);
    zAcc(B, ZC.sport, .05, .1, .02, -.09, .11, .203, true); zAcc(B, ZC.sport, .05, .1, .02, .09, .11, .203, true); // losanges sur les yeux
    [[-.23, .06, -.02, ZC.rouge, .13], [.23, .06, -.02, ZC.jaune, .13], [-.19, .19, -.1, ZC.sport, .12], [.19, .19, -.1, ZC.hivis, .12],
     [0, .24, -.12, ZC.rouge, .12], [-.1, .25, .06, ZC.jaune, .1], [.1, .25, .06, ZC.sport, .1], [0, .12, -.22, ZC.hivis, .12]]
      .forEach(w => sph(B, w[3], w[4], w[0], w[1], w[2]));                                   // perruque frisée multicolore
    zAcc(h.body, ZC.blanc, .74, .07, .52, 0, 1.69, 0); zAcc(h.body, ZC.jaune, .74, .07, .52, 0, 1.71, 0).rotation.y = .785; // collerette
    sph(h.torso, ZC.jaune, .055, 0, .17, .18); sph(h.torso, ZC.rouge, .055, 0, -.06, .18);  // pompons
    zAcc(h.legL, ZC.rouge, .3, .15, .64, -.03, -.8, .18); zAcc(h.legR, ZC.rouge, .3, .15, .64, .03, -.8, .18); // chaussures géantes
    const bal = zkGroup(h.body, .55, 1.15, .3);                                              // ballon au bout d'une ficelle
    zAcc(bal, ZC.blanc, .015, 1.5, .015, 0, .75, 0);
    const ball = zkWeak(sph(bal, ZC.rouge, .27, 0, 1.78, 0, .33), WEAK_BALLON);
    zAcc(bal, ZC.rouge, .06, .06, .06, 0, 1.44, 0);
    h.parts = [ball]; h.extra.bal = bal; h.extra.ball = ball;
  } };
function clownHonk(){ if (typeof Snd === 'undefined' || !Snd.tone) return; Snd.tone(520, .09, 'square', .05, 470); Snd.tone(390, .15, 'square', .05, 350, .1); }
ZKINDS.clown = {
  build(T){ const R = buildHumanoid(T, 'clown'); R.g.userData.rig = R.extra; return R; },
  init(z){
    z.clown = true; z.rig = z.g.userData.rig; z.pouetT = -9; z.lastS = 0;
    if (typeof toast === 'function' && state === 'playing') toast('Pouet pouet ! Un clown zombie s’est glissé dans la horde.');
    clownHonk();
  },
  // Chaque coup : « Pouet ! » (au plus un toutes les 0,3 s)
  onHit(z, amt, head, point){
    const now = typeof time === 'number' ? time : 0;
    if (now >= z.pouetT && now - z.pouetT < .3) return;
    z.pouetT = now; z.pouets = (z.pouets || 0) + 1;
    if (point) weakText(head ? 'Pouet ! Pouet !' : 'Pouet !', point);
    clownHonk();
  },
  // Ballon touché : il éclate, le clown boude et ralentit
  onWeak(z, m, amt, point){
    if (!z.rig || m !== z.rig.ball) return null;
    dropZombieMesh(z, m); z.rig.bal.traverse(o => { o.visible = false; });
    if (point){ burst(point, 'confR', 10, 3); burst(point, 'confJ', 6, 2.5); }
    if (typeof Snd !== 'undefined' && Snd.burst) Snd.burst(2400, .08, .35);
    z.speed *= .8; z.balCreve = true;
    return { done:true, txt:'Ballon crevé' };
  },
  // Mort : pluie de confettis, texte drôle, trombone triste. Le bonus vient de ZTYPES.clown, ZXP.clown et SCRAP_Z.clown.
  onKill(z, head, point, pay){
    const p = point || z.g.position;
    ['confJ', 'confB', 'confR'].forEach(t => burst(p, t, 14, 4.5));
    const mot = pick(CLOWN_MOTS); z.motFin = mot;
    weakText(mot, p);
    if (typeof toast === 'function') toast('Clown zombie abattu ! ' + mot + ' Bonus : +' + fmt(pay) + (typeof scrapFor === 'function' ? ', +' + Math.round(scrapFor('clown', curLoc)) + ' ferraille' : ''));
    if (typeof P === 'object' && P) P.clownsAbattus = (P.clownsAbattus || 0) + 1; // sauvé par addXP juste après
    if (typeof Snd !== 'undefined' && Snd.tone){ Snd.tone(392, .28, 'sawtooth', .06, 370); Snd.tone(370, .28, 'sawtooth', .06, 349, .3); Snd.tone(349, .7, 'sawtooth', .06, 290, .6); }
  },
  // Démarche ridicule : il sautille en se dandinant, gros pas de chaussures qui couinent, bras qui s'agitent
  update(z, dt){
    const gp = z.g.position, R = z.rig;
    if (R && R.bal && !z.balCreve){ const t = (typeof time === 'number' ? time : 0) + z.uid; R.bal.rotation.z = Math.sin(t * 1.7) * .14; R.bal.rotation.x = Math.sin(t * 1.1) * .1; }
    if (z.st !== 'walk'){ z.body.position.y = Math.abs(Math.sin(z.phase * .5)) * .08; return false; } // tape sur la barricade comme les autres
    z.phase += dt * (3.2 + z.speed * 2.2);
    const s = Math.sin(z.phase), c = Math.cos(z.phase);
    gp.z += z.speed * dt * (.7 + .6 * Math.abs(s));
    gp.x = clamp(gp.x + Math.sin(z.phase * .21) * z.sway * dt * .7, -12, 12);
    if (z.legL){ z.legL.rotation.x = s * .85; z.legR.rotation.x = -s * .85; z.legL.rotation.z = -.16; z.legR.rotation.z = .16; }
    if (z.armL){ z.armL.rotation.x = -1.5 + c * .9; z.armR.rotation.x = -1.5 - c * .9; z.armL.rotation.z = -.35; z.armR.rotation.z = .35; }
    z.body.position.y = Math.abs(s) * .26;
    z.body.rotation.z = s * .2; z.body.rotation.x = .04;
    if ((s >= 0) !== (z.lastS >= 0) && gp.z > -45 && Math.random() < .35 && typeof Snd !== 'undefined' && Snd.tone) Snd.tone(1500, .05, 'sine', .025, 1900); // couic
    z.lastS = s;
    if (gp.z >= z.stopZ){
      gp.z = z.stopZ; z.st = 'attack';
      if (z.legL){ z.legL.rotation.x = z.legR.rotation.x = 0; } z.body.rotation.z = 0;
    }
    return true;
  }
};
// Pour les tests et le coordonnateur : window.__clown.forcer() fait apparaître le clown tout de suite (s'il n'y en a pas déjà un)
window.__clown = {
  CLOWN, forcer(x, zPos){
    let z = zClownAlive(); if (z) return z;
    z = spawnZombie('clown');
    if (x != null) z.g.position.x = x; if (zPos != null) z.g.position.z = zPos;
    return z;
  },
  get vivant(){ return zClownAlive(); }, get vus(){ return P.zVus; }, get seuil(){ return P.clownSeuil; }, check:zClownCheck, seuilApres:clownSeuilApres
};

// Accès pour les tests automatiques
window.__types ={ ZKINDS, ZKG, ZKM, WEAK, SPIT_POP, SPIT_ESQUIVE, spits, spitLaunch, zkFrame, zkClear, get spitsActifs(){ return spits.filter(o => o.m.visible).length; } };
