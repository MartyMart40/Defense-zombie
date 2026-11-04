'use strict';
/* ================= Pouvoirs à recharge : grenade, cocktail Molotov, frappe aérienne ================= */
// Tout le système est ici. Crochets posés par réaffectation (comme 19-boss.js), sans toucher aux autres fichiers :
// update (recharges, projectiles, feu, bombes), visuals (rangement et boutons), updateHUD (anneaux de recharge),
// newGame et startWave (charges pleines, effets rangés), addXP (annonce d'un déblocage), renderAtelier (achats).
// Les dégâts passent TOUJOURS par damage(z, ...) : armure du boss et autres crochets s'appliquent.
// Déblocage : par niveau de joueur (P.level, gardé même à la défaite). Améliorations : ferraille (P.scrap), permanentes.
// Sauvegarde : P.pow = { grenade:{ dmg, zone, cd, ch }, molotov:{...}, strike:{...} }, normalisé au chargement.

const PW_ORDER = ['grenade', 'molotov', 'strike'];
const PW_LINES = ['dmg', 'zone', 'cd', 'ch'];
const PW = {
  grenade: { name:'Grenade', key:'KeyG', keyTxt:'G', icon:'💣', level:1, cost:40,
    desc:'Lancée là où tu vises, elle explose à l’impact. Touche aussi les volants au-dessus.',
    lines:{ dmg:'Dégâts', zone:'Rayon', cd:'Recharge', ch:'Charges' } },
  molotov: { name:'Cocktail Molotov', key:'KeyF', keyTxt:'F', icon:'🔥', level:3, cost:70,
    desc:'Laisse une nappe de feu dans la rue : brûle ceux qui la traversent, et encore un peu après.',
    lines:{ dmg:'Brûlure', zone:'Taille de la nappe', cd:'Recharge', ch:'Charges' } },
  strike:  { name:'Frappe aérienne', key:'KeyQ', keyTxt:'Q', icon:'✈', level:5, cost:120,
    desc:'Fumée rouge sur la cible, puis un avion largue une ligne de bombes le long de la rue.',
    lines:{ dmg:'Dégâts par bombe', zone:'Rayon des bombes', cd:'Recharge', ch:'Charges' } }
};
const PW_MAX = { dmg:20, zone:10, cd:10, ch:5 }; // charges : 1 au départ, jusqu'à 6
const PW_LMULT = { dmg:1, zone:1, cd:1.2, ch:5 };
const PW_AFTER = 1.5;   // secondes de brûlure après avoir quitté la nappe (à 50 %)
const PW_FIRE_H = 3.2;  // hauteur des flammes : un volant qui plonge dedans brûle aussi

// Rayon : +50 % au plus. Recharge : jusqu'à moitié moins. Dégâts : ×1,15 par niveau.
const pwSoft = (l, C) => 1 + C * (1 - Math.pow(.85, l));
function pwStats(id, lv){
  lv = lv || {};
  const dm = Math.pow(1.15, lv.dmg || 0), zm = pwSoft(lv.zone || 0, .5), cm = .5 + .5 * Math.pow(.88, lv.cd || 0), ch = 1 + (lv.ch || 0);
  switch (id){
    case 'grenade': return { dmg:260 * dm, radius:4.5 * zm, cd:12 * cm, charges:ch, height:10 };
    case 'molotov': return { dps:70 * dm, radius:3.6 * zm, dur:6, cd:20 * cm, charges:ch, height:PW_FIRE_H };
    case 'strike':  return { dmg:520 * dm, radius:4.2 * zm, bombs:7, step:4, delay:2.2, cd:60 * cm, charges:ch, height:14 };
  }
  return null;
}
// Les dégâts suivent la vie des zombies de la vague en cours (sinon les pouvoirs deviendraient inutiles)
const pwPower = () => (plan && plan.hpMult > 0 ? plan.hpMult : 1);

/* ---------- Sauvegarde, déblocage, améliorations ---------- */
function pwNorm(){
  const old = P.pow && typeof P.pow === 'object' ? P.pow : {};
  const o = {};
  PW_ORDER.forEach(id => {
    const s = old[id] && typeof old[id] === 'object' ? old[id] : {}, lv = {};
    PW_LINES.forEach(k => { const v = +s[k]; lv[k] = v > 0 ? Math.min(PW_MAX[k], Math.floor(v)) : 0; });
    o[id] = lv;
  });
  P.pow = o;
}
pwNorm();
function pwLv(id){ if (!P.pow || !P.pow[id]) pwNorm(); return P.pow[id]; }
const pwUnlocked = id => !!PW[id] && (P.level || 1) >= PW[id].level;
const pwUpgCost = (id, k, l) => Math.round(PW[id].cost * PW_LMULT[k] * Math.pow(k === 'ch' ? 2 : 1.35, l)); // une charge de plus coûte le double de la précédente
function pwUpgrade(id, k){
  if (!PW[id] || PW_LINES.indexOf(k) < 0 || !pwUnlocked(id)) return false;
  const lv = pwLv(id), l = lv[k]; if (l >= PW_MAX[k]) return false;
  const c = pwUpgCost(id, k, l); if (!(P.scrap >= c)) return false;
  P.scrap -= c; lv[k] = l + 1; saveP();
  const st = pwS[id]; if (st && k === 'ch') st.ch = Math.min(st.ch + 1, pwStats(id, lv).charges);
  return true;
}

/* ---------- Charges et recharges (état de la partie) ---------- */
const pwS = {}; // id -> { ch: charges prêtes, t: secondes avant la prochaine charge }
function pwRefill(){ PW_ORDER.forEach(id => { pwS[id] = { ch:pwStats(id, pwLv(id)).charges, t:0 }; }); }
pwRefill();
function pwTickCharges(dt){
  PW_ORDER.forEach(id => {
    const st = pwS[id], s = pwStats(id, pwLv(id)); if (!st) return;
    if (st.ch > s.charges) st.ch = s.charges;
    if (st.ch >= s.charges){ st.t = 0; return; }
    if (st.t <= 0) st.t = s.cd;
    st.t -= dt;
    if (st.t <= 0){ st.ch++; st.t = st.ch < s.charges ? s.cd + st.t : 0; }
  });
}

/* ---------- Scène : pools créés une fois (rien n'est créé ni libéré pendant le jeu) ---------- */
const pwRoot = new THREE.Group(); scene.add(pwRoot); // hors de « world » : disposeWorld() n'y touche pas
const PWG = { box:new THREE.BoxGeometry(1, 1, 1), sph:new THREE.SphereGeometry(1, 10, 8), cone:new THREE.ConeGeometry(.5, 1, 6), disc:new THREE.CircleGeometry(1, 24) };
PWG.cone.translate(0, .5, 0);
const pwGlowMat = (c, o) => new THREE.MeshBasicMaterial({ color:c, transparent:true, opacity:o, blending:THREE.AdditiveBlending, depthWrite:false, fog:false });
const PWM = { gren:lam(0x3c4a2a), metal:lam(0x22241f), glass:lam(0x4f6e34), rag:pwGlowMat(0xffa040, 1), plane:lam(0x3a3f44), planeDark:lam(0x1c1f22), flare:pwGlowMat(0xff3020, .95) };
const pwPart = (parent, geo, mat, sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m); return m; };
const pwEmber = () => (PMATS.ember ? 'ember' : 'dust');

// Projectiles (grenade ou bouteille)
const pwProj = [];
for (let i = 0; i < 6; i++){
  const m = new THREE.Group();
  const gr = new THREE.Group(); pwPart(gr, PWG.sph, PWM.gren, .16, .2, .16, 0, 0, 0); pwPart(gr, PWG.box, PWM.metal, .08, .1, .08, 0, .2, 0); m.add(gr);
  const bo = new THREE.Group(); pwPart(bo, PWG.box, PWM.glass, .14, .3, .14, 0, 0, 0); pwPart(bo, PWG.box, PWM.glass, .06, .14, .06, 0, .22, 0); pwPart(bo, PWG.box, PWM.rag, .09, .1, .09, 0, .33, 0); m.add(bo);
  m.visible = false; pwRoot.add(m);
  pwProj.push({ m, gr, bo, kind:null, a:new THREE.Vector3(), b:new THREE.Vector3(), t:0, T:1, hgt:3, trail:0, s:null });
}
// Explosions : éclairs lumineux réutilisés + une seule lumière (nombre de lumières constant : pas de recompilation)
const pwBooms = [];
for (let i = 0; i < 24; i++){
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0xffa050, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true, fog:false }));
  s.visible = false; pwRoot.add(s); pwBooms.push({ m:s, life:0, max:.5, size:4 });
}
const pwLight = new THREE.PointLight(0xff9a40, 0, 40, 2); pwLight.position.set(0, 3, -30); pwRoot.add(pwLight);
// Nappes de feu
const PW_FLAMES = 10;
const pwPuddles = [];
for (let i = 0; i < 4; i++){
  const mat = pwGlowMat(0xff6a1a, .45), fmat = pwGlowMat(0xffa040, .9);
  const g = new THREE.Group(); g.visible = false; pwRoot.add(g);
  const disc = new THREE.Mesh(PWG.disc, mat); disc.rotation.x = -Math.PI / 2; disc.position.y = .06; g.add(disc);
  const flames = [];
  for (let k = 0; k < PW_FLAMES; k++){ const f = new THREE.Mesh(PWG.cone, fmat); g.add(f); flames.push({ m:f, ph:0, s:1 }); }
  pwPuddles.push({ g, disc, mat, fmat, flames, live:false, x:0, z:0, r:3, t:0, dur:6, dps:0 });
}
// Frappes aériennes : fumée rouge, fusée au sol, bombes programmées ; un seul avion
const pwStrikes = [];
for (let i = 0; i < 3; i++){
  const smoke = [];
  for (let k = 0; k < 8; k++){
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0xd0302a, transparent:true, opacity:.6, depthWrite:false, fog:true }));
    s.visible = false; pwRoot.add(s); smoke.push({ m:s, age:k * .2 });
  }
  const flare = new THREE.Mesh(PWG.box, PWM.flare); flare.scale.set(.25, .25, .25); flare.visible = false; pwRoot.add(flare);
  const bombs = []; for (let k = 0; k < 9; k++) bombs.push({ x:0, z:0, at:0, done:true });
  pwStrikes.push({ live:false, x:0, z:0, t:0, delay:2.2, dmg:0, r:4, h:14, smoke, flare, bombs, n:0 });
}
const pwPlane = new THREE.Group();
pwPart(pwPlane, PWG.box, PWM.plane, 1.3, 1.1, 9, 0, 0, 0);       // fuselage
pwPart(pwPlane, PWG.box, PWM.plane, 15, .22, 2.4, 0, .1, .3);      // ailes
pwPart(pwPlane, PWG.box, PWM.plane, 5, .2, 1.3, 0, .3, 4);         // empennage
pwPart(pwPlane, PWG.box, PWM.planeDark, .22, 1.8, 1.5, 0, 1.1, 4); // dérive
pwPart(pwPlane, PWG.box, PWM.planeDark, .9, .6, 1.6, 0, .45, -3.2); // cockpit
pwPlane.visible = false; pwRoot.add(pwPlane);
let pwPlaneS = null; // frappe suivie par l'avion

/* ---------- Visée : le point au centre de l'écran ---------- */
const pwRay = new THREE.Raycaster(), pwDir = new THREE.Vector3(), pwTgt = new THREE.Vector3(), pwOrig = new THREE.Vector3();
function pwClampPt(p){ p.x = clamp(p.x, -18, 18); p.z = clamp(p.z, -140, BAR_Z - .4); p.y = clamp(p.y, 0, 12); return p; }
function pwAimPoint(out, groundOnly){
  camera.updateMatrixWorld();
  camera.getWorldDirection(pwDir);
  const o = camera.position;
  let hit = false;
  if (!groundOnly){
    // Grenade visée sur un zombie (même un volant) : elle explose sur lui
    pwRay.set(o, pwDir); pwRay.far = 200;
    const hits = pwRay.intersectObjects(hitMeshes, false);
    for (const h of hits){ const z = h.object.userData.z; if (z && !z.dead){ out.copy(h.point); hit = true; break; } }
  }
  if (!hit){
    if (pwDir.y < -.02) out.copy(o).addScaledVector(pwDir, Math.min(200, -o.y / pwDir.y));
    else out.copy(o).addScaledVector(pwDir, 130);
    out.y = 0;
  }
  if (groundOnly) out.y = 0;
  return pwClampPt(out);
}

/* ---------- Dégâts de zone ---------- */
const pwCY = z => z.g.position.y + (z.aimY != null ? z.aimY : 1.1);
const pwPt = z => new THREE.Vector3(z.g.position.x, pwCY(z), z.g.position.z);
// Cylindre : rayon horizontal r, du sol jusqu'à la hauteur H (les volants au-dessus sont touchés)
function pwBlast(x, y, z0, r, dmg, H){
  let n = 0; const top = Math.max(H, y + 4);
  for (const z of zombies){
    if (z.dead) continue;
    const dx = z.g.position.x - x, dz = z.g.position.z - z0, d = Math.max(0, Math.sqrt(dx * dx + dz * dz) - (z.aimY != null ? z.aimY : 1.1) * .35); // largeur du corps retirée (boss, colosse)
    if (d >= r || pwCY(z) > top) continue;
    damage(z, dmg * (1 - .5 * d / r), false, pwPt(z)); n++;
  }
  return n;
}
function pwBoom(x, y, z, size){
  let o = null; for (const b of pwBooms) if (!b.m.visible){ o = b; break; }
  if (!o){ o = pwBooms[0]; for (const b of pwBooms) if (b.life < o.life) o = b; }
  o.m.position.set(x, y, z); o.size = size; o.max = o.life = .55; o.m.scale.set(.1, .1, 1); o.m.material.opacity = 1; o.m.visible = true;
  pwLight.position.set(x, y + 2, z); pwLight.intensity = Math.max(pwLight.intensity, 4);
}
function pwExplodeFx(x, y, z, r, big){
  pwBoom(x, Math.max(.8, y), z, r * 2.3);
  tmpV.set(x, Math.max(.3, y), z); burst(tmpV, 'dust', big ? 10 : 7, 3.5); burst(tmpV, pwEmber(), 5, 4);
  shake = Math.max(shake, big ? .45 : .3);
  if (typeof Snd === 'object'){ if (Snd.boom) Snd.boom(big ? 1 : .8); else { Snd.burst(650, .7, big ? .7 : .55); Snd.tone(75, .55, 'sine', .4, 30); } }
}

/* ---------- Lancer (grenade, Molotov) ---------- */
function pwThrow(kind, p, s){
  let o = null; for (const q of pwProj) if (!q.m.visible){ o = q; break; }
  if (!o) return false;
  camera.updateMatrixWorld();
  pwOrig.set(.35, -.45, -.7).applyQuaternion(camera.quaternion).add(camera.position);
  o.kind = kind; o.a.copy(pwOrig); o.b.copy(p); o.t = 0; o.s = s; o.trail = 0;
  const dist = o.a.distanceTo(o.b);
  o.T = clamp(.45 + dist / 40, .5, 2.4); o.hgt = 2 + dist * .12;
  o.gr.visible = kind === 'grenade'; o.bo.visible = kind !== 'grenade';
  o.m.position.copy(o.a); o.m.rotation.set(0, 0, 0); o.m.visible = true;
  if (typeof Snd === 'object') Snd.burst(1800, .18, .12);
  return true;
}
function pwLand(o){
  const b = o.b, s = o.s;
  if (o.kind === 'grenade'){
    pwBlast(b.x, b.y, b.z, s.radius, s.dmg * pwPower(), s.height);
    pwExplodeFx(b.x, b.y, b.z, s.radius, false);
  } else pwPuddle(b.x, b.z, s);
}
function pwPuddle(x, z, s){
  let p = null; for (const q of pwPuddles) if (!q.live){ p = q; break; }
  if (!p){ p = pwPuddles[0]; for (const q of pwPuddles) if (q.t < p.t) p = q; }
  p.live = true; p.x = x; p.z = z; p.r = s.radius; p.t = p.dur = s.dur; p.dps = s.dps * pwPower();
  p.g.position.set(x, 0, z); p.g.visible = true; p.disc.scale.set(p.r, p.r, 1);
  p.flames.forEach((f, k) => {
    const a = k / PW_FLAMES * 6.283 + rand(-.3, .3), d = k === 0 ? 0 : p.r * Math.sqrt(rand(.05, .9));
    f.m.position.set(Math.cos(a) * d, .05, Math.sin(a) * d); f.ph = rand(0, 6.3); f.s = rand(.7, 1.3);
  });
  tmpV.set(x, .4, z); burst(tmpV, pwEmber(), 10, 3.5);
  pwBoom(x, .6, z, p.r * 1.6);
  if (typeof Snd === 'object'){ Snd.tone(3200, .08, 'square', .06, 1800); Snd.burst(2400, .5, .35); Snd.burst(500, .9, .3, .05); }
}

/* ---------- Frappe aérienne ---------- */
function pwStrike(p, s){
  let k = null; for (const q of pwStrikes) if (!q.live){ k = q; break; }
  if (!k) return false;
  k.live = true; k.x = p.x; k.z = p.z; k.t = 0; k.delay = s.delay; k.dmg = s.dmg; k.r = s.radius; k.h = s.height; k.n = Math.min(s.bombs, k.bombs.length);
  for (let i = 0; i < k.bombs.length; i++){
    const b = k.bombs[i];
    if (i >= k.n){ b.done = true; continue; }
    // De la plus proche à la plus lointaine, comme l'avion qui arrive de derrière nous
    b.x = clamp(p.x + rand(-1.5, 1.5), -18, 18); b.z = Math.min(BAR_Z - 1, p.z + ((k.n - 1) / 2 - i) * s.step);
    b.at = s.delay + i * .11; b.done = false;
  }
  k.smoke.forEach((m, i) => { m.age = i * .2; m.m.visible = false; });
  k.flare.position.set(p.x, .15, p.z); k.flare.visible = true;
  pwPlaneS = k;
  if (typeof Snd === 'object'){
    Snd.burst(1500, .4, .12); // fusée fumigène
    // Avion qui approche (le bruit de base dure 0,7 s : on l'enchaîne)
    for (let i = 0; i < 5; i++) Snd.burst(900 + i * 150, .7, .06 + i * .05, .3 + i * .4);
    Snd.tone(160, 2.2, 'sawtooth', .05, 95, .4);
    Snd.tone(1600, .6, 'sine', .05, 400, s.delay - .5); // sifflement des bombes
  }
  return true;
}
function pwStrikeStep(k, dt){
  k.t += dt;
  // Fumée rouge qui monte jusqu'aux bombes, puis se dissipe
  const smokeOn = k.t < k.delay + .6;
  for (const m of k.smoke){
    m.age += dt; if (m.age > 1.6){ if (!smokeOn){ m.m.visible = false; continue; } m.age -= 1.6; }
    const u = m.age / 1.6;
    m.m.visible = true; m.m.position.set(k.x + Math.sin(m.age * 3 + k.x) * .4 * u, .4 + u * 4.5, k.z + Math.cos(m.age * 2) * .3 * u);
    const sc = 1.2 + u * 3.2; m.m.scale.set(sc, sc, 1); m.m.material.opacity = .65 * (1 - u);
  }
  k.flare.visible = smokeOn && Math.random() > .15;
  let left = false;
  for (let i = 0; i < k.n; i++){
    const b = k.bombs[i]; if (b.done) continue;
    if (k.t >= b.at){
      b.done = true;
      pwBlast(b.x, 0, b.z, k.r, k.dmg * pwPower(), k.h);
      pwExplodeFx(b.x, 0, b.z, k.r, true);
    } else left = true;
  }
  if (!left && !k.smoke.some(m => m.m.visible)){ k.live = false; k.flare.visible = false; }
}
function pwPlaneStep(){
  const k = pwPlaneS;
  if (!k || !k.live){ pwPlane.visible = false; return; }
  const tc = k.delay - .3, u = k.t - tc; // u = 0 : au-dessus de la cible
  pwPlane.visible = u > -1.8 && u < 2.2;
  if (pwPlane.visible) pwPlane.position.set(k.x * .5, 30, k.z - u * 85);
}

/* ---------- Mise à jour (pendant le jeu seulement) ---------- */
let pwActive = false, pwBurning = false;
function pwUpdate(dt){
  pwTickCharges(dt);
  let act = false;
  // Projectiles en vol (arc visible + traînée)
  for (const o of pwProj){
    if (!o.m.visible) continue; act = true;
    o.t += dt; const u = Math.min(1, o.t / o.T);
    o.m.position.lerpVectors(o.a, o.b, u); o.m.position.y += o.hgt * 4 * u * (1 - u);
    o.m.rotation.x += dt * 9; o.m.rotation.z += dt * 4;
    o.trail -= dt; if (o.trail <= 0){ o.trail = .045; burst(o.m.position, o.kind === 'grenade' ? 'dust' : pwEmber(), 1, .25); }
    if (u >= 1){ o.m.visible = false; pwLand(o); }
  }
  // Nappes de feu
  let anyFire = false;
  for (const p of pwPuddles){
    if (!p.live) continue; act = true; anyFire = true;
    p.t -= dt;
    if (p.t <= 0){ p.live = false; p.g.visible = false; continue; }
    const fade = Math.min(1, p.t / 1, (p.dur - p.t) / .2 + .3);
    p.mat.opacity = .45 * fade; p.fmat.opacity = .9 * fade;
    p.flames.forEach(f => { f.ph += dt * 9; const h = (.9 + Math.sin(f.ph) * .3 + Math.random() * .15) * f.s * (.4 + .6 * fade); f.m.scale.set(.9 * f.s, h * 1.6, .9 * f.s); });
    if (Math.random() < dt * 10){ tmpV.set(p.x + rand(-p.r, p.r) * .7, .5, p.z + rand(-p.r, p.r) * .7); burst(tmpV, pwEmber(), 1, 1.2); }
  }
  // Brûlures : dans une nappe, puis un peu après en être sorti (dégâts groupés toutes les 0,25 s)
  if (anyFire || pwBurning){
    let burning = false;
    for (const z of zombies){
      if (z.dead) continue;
      let dps = 0;
      if (anyFire){
        const cy = pwCY(z);
        for (const p of pwPuddles){
          if (!p.live || cy > PW_FIRE_H) continue;
          const dx = z.g.position.x - p.x, dz = z.g.position.z - p.z;
          if (dx * dx + dz * dz < p.r * p.r && p.dps > dps) dps = p.dps;
        }
      }
      if (dps > 0){ z.pwBurnT = PW_AFTER; z.pwDps = dps; }
      if (!(z.pwBurnT > 0)) continue;
      burning = true;
      if (dps <= 0) z.pwBurnT -= dt;
      z.pwAcc = (z.pwAcc || 0) + z.pwDps * dt * (dps > 0 ? 1 : .5);
      z.pwTick = (z.pwTick || 0) - dt;
      if (z.pwTick <= 0 || z.pwBurnT <= 0){ z.pwTick = .25; const a = z.pwAcc; z.pwAcc = 0; if (a > 0) damage(z, a, false, pwPt(z)); }
      if (!z.dead && Math.random() < dt * 5) burst(pwPt(z), pwEmber(), 1, 1);
    }
    pwBurning = burning;
    if (burning) act = true;
  }
  // Frappes aériennes
  for (const k of pwStrikes){ if (!k.live) continue; act = true; pwStrikeStep(k, dt); }
  pwPlaneStep();
  // Éclairs
  for (const b of pwBooms){
    if (!b.m.visible) continue; act = true;
    b.life -= dt; if (b.life <= 0){ b.m.visible = false; continue; }
    const k = 1 - b.life / b.max, sz = b.size * (.35 + .65 * k);
    b.m.scale.set(sz, sz, 1); b.m.material.opacity = 1 - k;
  }
  if (pwLight.intensity > 0) pwLight.intensity = Math.max(0, pwLight.intensity - dt * 14);
  pwActive = act || pwLight.intensity > 0;
}

/* ---------- Utiliser un pouvoir ---------- */
// tgt facultatif { x, y, z } (tests) ; sinon le point visé au centre de l'écran
function powUse(id, tgt){
  if (!PW[id] || state !== 'playing' || !S || !pwUnlocked(id)) return false;
  const st = pwS[id], s = pwStats(id, pwLv(id));
  if (!st || st.ch < 1) return false;
  const p = tgt ? pwClampPt(pwTgt.set(+tgt.x || 0, +tgt.y || 0, +tgt.z || 0)) : pwAimPoint(pwTgt, id !== 'grenade');
  if (id !== 'grenade') p.y = 0;
  const okL = id === 'strike' ? pwStrike(p, s) : pwThrow(id, p, s);
  if (!okL) return false;
  st.ch--; if (st.t <= 0) st.t = s.cd;
  pwActive = true;
  return true;
}
function pwTry(id){
  if (state !== 'playing') return false;
  const el = $('pw-' + id);
  if (!pwUnlocked(id)){ toast(PW[id].name + ' : se débloque au niveau ' + PW[id].level); if (typeof Snd === 'object') Snd.empty(); pwNo(el); return false; }
  const r = powUse(id);
  if (!r){ if (typeof Snd === 'object') Snd.empty(); pwNo(el); }
  return r;
}
function pwNo(el){ if (!el) return; el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); setTimeout(() => el.classList.remove('no'), 320); }

/* ---------- Rangement ---------- */
function pwClearFx(){
  pwProj.forEach(o => { o.m.visible = false; });
  pwBooms.forEach(b => { b.m.visible = false; b.life = 0; });
  pwPuddles.forEach(p => { p.live = false; p.g.visible = false; });
  pwStrikes.forEach(k => { k.live = false; k.flare.visible = false; k.smoke.forEach(m => { m.m.visible = false; }); k.bombs.forEach(b => { b.done = true; }); });
  pwPlane.visible = false; pwPlaneS = null; pwLight.intensity = 0;
  zombies.forEach(z => { z.pwBurnT = 0; z.pwAcc = 0; });
  pwBurning = false; pwActive = false;
}
function pwReset(){ pwClearFx(); pwRefill(); }

/* ---------- Boutons et anneaux de recharge ---------- */
const pwHC = {};
let pwShown = null;
function pwSet(el, prop, v){ const k = el.id + prop; if (pwHC[k] === v) return; pwHC[k] = v; if (prop === '--p') el.style.setProperty('--p', v); else if (prop === 'cls'){ ['locked', 'ready', 'empty'].forEach(c => el.classList.toggle(c, c === v)); } else { const c = el.querySelector ? el.querySelector(prop) : null; if (c) c.textContent = v; } }
function pwHUD(){
  PW_ORDER.forEach(id => {
    const el = $('pw-' + id); if (!el || !el.style) return;
    const un = pwUnlocked(id), st = pwS[id] || { ch:0, t:0 }, s = pwStats(id, pwLv(id));
    const charging = un && st.ch < s.charges, p = charging ? clamp(st.t / s.cd, 0, 1) : (un ? 0 : 1);
    pwSet(el, '--p', p.toFixed(2));
    pwSet(el, 'cls', !un ? 'locked' : st.ch > 0 ? 'ready' : 'empty');
    pwSet(el, '.pwt', un && st.ch < 1 ? String(Math.ceil(st.t)) : '');
    pwSet(el, '.pwn', un && s.charges > 1 ? '×' + st.ch : '');
    pwSet(el, '.pwk', !un ? 'Niv. ' + PW[id].level : (isTouch ? '' : PW[id].keyTxt));
  });
}
function pwFrame(){
  // Effets rangés quand on n'est plus en partie (fin de vague, fin de partie, carte, changement de ville)
  if (state !== 'playing' && state !== 'paused' && pwActive) pwClearFx();
  const show = state === 'playing' && !!S;
  if (show !== pwShown){ pwShown = show; const el = $('pows'); if (el) el.classList.toggle('hide', !show); }
}

/* ---------- Entrées ---------- */
// Capture sur window : passe avant 12-souris.js (Q y changeait d'arme ; molette et 1 à 4 restent pour ça)
window.addEventListener('keydown', e => {
  if (state !== 'playing') return;
  const id = PW_ORDER.find(k => PW[k].key === e.code); if (!id) return;
  e.stopPropagation(); if (e.cancelable) e.preventDefault();
  if (!e.repeat) pwArm(id);
}, true);
window.addEventListener('keyup', e => {
  const id = PW_ORDER.find(k => PW[k].key === e.code); if (!id) return;
  e.stopPropagation();
  if (pwArmed === id){ pwArmed = null; if (state === 'playing') pwTry(id); }
}, true);
PW_ORDER.forEach(id => {
  const el = $('pw-' + id); if (!el || !el.addEventListener) return;
  el.addEventListener('touchstart', e => {
    e.preventDefault(); e.stopPropagation();
    if (typeof Snd === 'object') Snd.init();
    el.classList.add('down'); pwArm(id); // le cercle apparaît : vise avec l'autre doigt, relâche pour lancer
  }, { passive:false });
  el.addEventListener('touchend', e => { e.preventDefault(); el.classList.remove('down'); if (pwArmed === id){ pwArmed = null; pwTry(id); } }, { passive:false });
  el.addEventListener('touchcancel', () => { el.classList.remove('down'); if (pwArmed === id) pwArmed = null; });
  el.addEventListener('mousedown', e => { e.stopPropagation(); });
  el.addEventListener('click', e => { e.preventDefault(); if (!isTouch) pwTry(id); if (el.blur) el.blur(); });
});

/* ---------- Atelier : section « Pouvoirs » (achats en ferraille) ---------- */
const pwF1 = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
const pwR0 = v => Math.round(v).toLocaleString('fr-CA');
const pwFmtS = n => (typeof fmtS === 'function' ? fmtS(n) : Math.floor(n).toLocaleString('fr-CA') + ' ⚙');
function pwLineTxt(id, k, s){
  if (k === 'dmg') return id === 'molotov' ? pwR0(s.dps) + ' dégâts par seconde' : pwR0(s.dmg) + (id === 'strike' ? ' dégâts par bombe (' + s.bombs + ' bombes)' : ' dégâts');
  if (k === 'zone') return 'rayon de ' + pwF1(s.radius) + ' m';
  if (k === 'cd') return pwF1(s.cd) + ' s';
  return s.charges + ' charge' + (s.charges > 1 ? 's' : '');
}
function pwRenderShop(){
  const el = $('pwShop'); if (!el) return;
  let h = '<div class="ds at-note">Utilisables pendant les vagues' + (isTouch ? ' (boutons ronds à gauche)' : ' (touches G, F et Q)') + '. Garde enfoncé pour voir le cercle d’impact, relâche pour lancer. Chaque vague commence avec toutes les charges (1 au départ, jusqu’à 6 avec les améliorations). Améliorations en ferraille, permanentes. Les dégâts suivent la force des zombies de la vague.</div>';
  PW_ORDER.forEach(id => {
    const D = PW[id], lv = pwLv(id), s = pwStats(id, lv), un = pwUnlocked(id);
    h += '<div class="pw-card' + (un ? '' : ' locked') + '"><div class="nm">' + D.icon + ' ' + D.name + (isTouch ? '' : ' <span class="at-lv">touche ' + D.keyTxt + '</span>') + '</div><div class="ds">' + D.desc + '</div>';
    if (!un){ h += '<div class="ds pw-lock">🔒 Se débloque au niveau ' + D.level + ' (tu es niveau ' + (P.level || 1) + ').</div></div>'; return; }
    PW_LINES.forEach(k => {
      const l = lv[k], max = l >= PW_MAX[k], c = pwUpgCost(id, k, l), nxt = Object.assign({}, lv); nxt[k] = l + 1;
      const cur = pwLineTxt(id, k, s), aft = max ? '' : pwLineTxt(id, k, pwStats(id, nxt));
      h += '<div class="row"><div class="info"><div class="nm">' + D.lines[k] + ' <span class="at-lv">niv. ' + l + '</span></div><div class="ds">' + cur + (max ? ' (maximum)' : ' → ' + aft) + '</div></div>'
        + '<button data-pw="upg" data-id="' + id + '" data-k="' + k + '"' + (max || P.scrap < c ? ' disabled' : '') + '>' + (max ? 'Max' : pwFmtS(c)) + '</button></div>';
    });
    h += '</div>';
  });
  el.innerHTML = h;
}
(function(){
  const back = $('btnAtBack');
  if (!back || !back.parentNode || !back.parentNode.insertBefore) return;
  const t = document.createElement('h3'); t.textContent = 'Pouvoirs';
  const d = document.createElement('div'); d.id = 'pwShop';
  back.parentNode.insertBefore(t, back); back.parentNode.insertBefore(d, back);
  d.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button[data-pw]'); if (!b || b.disabled) return;
    if (pwUpgrade(b.dataset.id, b.dataset.k) && typeof Snd === 'object') Snd.buy();
    if (typeof renderAtelier === 'function') renderAtelier(); else pwRenderShop();
    if (typeof atelierLabels === 'function') atelierLabels();
  });
  pwRenderShop();
})();

/* ---------- Aide de l'écran titre ---------- */
(function(){
  const el = $('ctrlHelp'); if (!el) return;
  el.innerHTML += isTouch
    ? '<b>Boutons ronds à gauche</b><span>pouvoirs à recharge : grenade, cocktail Molotov (niveau 3), frappe aérienne (niveau 5). Garde le bouton enfoncé pour voir où ça tombe, vise avec l’autre doigt, relâche pour lancer</span>'
    : '<b>G, F, Q</b><span>pouvoirs à recharge : grenade, cocktail Molotov (niveau 3), frappe aérienne (niveau 5). Garde la touche enfoncée pour voir où ça tombe, relâche pour lancer</span>';
})();

/* ---------- Crochets sur le code commun (par réaffectation) ---------- */
try { const _b = update; update = function(dt){ const r = _b.apply(this, arguments); if (state === 'playing') pwUpdate(dt); return r; }; } catch (e) { errNote(e); }
try { const _b = visuals; visuals = function(dt){ const r = _b.apply(this, arguments); pwFrame(); return r; }; } catch (e) { errNote(e); }
try { const _b = updateHUD; updateHUD = function(){ const r = _b.apply(this, arguments); pwHUD(); return r; }; } catch (e) { errNote(e); }
try { const _b = newGame; newGame = function(){ const r = _b.apply(this, arguments); pwReset(); return r; }; } catch (e) { errNote(e); }
try { const _b = startWave; startWave = function(){ pwReset(); return _b.apply(this, arguments); }; } catch (e) { errNote(e); }
try {
  const _b = addXP;
  addXP = function(){
    const before = P.level || 1, r = _b.apply(this, arguments), after = P.level || 1;
    if (after > before){
      const nw = PW_ORDER.filter(id => PW[id].level > before && PW[id].level <= after);
      if (nw.length) setTimeout(() => toast('Nouveau pouvoir : ' + nw.map(id => PW[id].name + (isTouch ? '' : ' (touche ' + PW[id].keyTxt + ')')).join(', ')), 2600);
    }
    return r;
  };
} catch (e) { errNote(e); }
try {
  if (typeof renderAtelier === 'function'){ const _b = renderAtelier; renderAtelier = function(){ const r = _b.apply(this, arguments); pwRenderShop(); return r; }; }
} catch (e) { errNote(e); }

// Accès pour les tests automatiques
window.__pouvoirs = { PW, PW_ORDER, PW_LINES, PW_MAX, pwStats, pwNorm, pwLv, pwUnlocked, pwUpgCost, pwUpgrade, powUse, pwTry, pwUpdate, pwClearFx, pwReset, pwRefill,
  pwHUD, pwFrame, pwRenderShop, pwAimPoint, pwS, pwProj, pwPuddles, pwStrikes, pwBooms, pwPlane, pwRoot,
  get actif(){ return pwActive; },
  get enCours(){ return pwProj.some(o => o.m.visible) || pwPuddles.some(p => p.live) || pwStrikes.some(k => k.live) || pwBooms.some(b => b.m.visible); },
  step(sec, dt){ dt = dt || 1 / 30; const n = Math.ceil(sec / dt); for (let i = 0; i < n; i++) pwUpdate(dt); } };


/* ---------- Aperçu de la visée : cercle d'impact et trajectoire ---------- */
// Garder G, F ou Q enfoncé (ou le bouton rond sur cell) montre où ça tombe ; relâcher lance.
let pwArmed = null;
function pwArm(id){
  if (state !== 'playing') return;
  if (!pwUnlocked(id)){ pwTry(id); return; }
  pwArmed = id;
}
const PW_PREV_COL = { grenade:0xffb040, molotov:0xff5a20, strike:0xff2a20 };
const pwPrevMat = new THREE.MeshBasicMaterial({ color:0xffb040, transparent:true, opacity:.85, depthWrite:false, depthTest:false, fog:false, side:THREE.DoubleSide });
const pwPrevFill = new THREE.MeshBasicMaterial({ color:0xffb040, transparent:true, opacity:.18, depthWrite:false, depthTest:false, fog:false, side:THREE.DoubleSide });
const pwPrev = new THREE.Group(); pwPrev.visible = false; scene.add(pwPrev); // dessiné par-dessus le sol (sinon il se confond avec la route au loin)
const pwRing = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 48), pwPrevMat); pwRing.rotation.x = -Math.PI / 2; pwPrev.add(pwRing);
const pwDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 40), pwPrevFill); pwDisc.rotation.x = -Math.PI / 2; pwPrev.add(pwDisc);
const pwDot = new THREE.Mesh(new THREE.CircleGeometry(.18, 12), pwPrevMat); pwDot.rotation.x = -Math.PI / 2; pwPrev.add(pwDot);
[pwRing, pwDisc, pwDot].forEach(m => m.renderOrder = 999);
// Frappe aérienne : bande le long de la rue
const pwBand = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pwPrevFill); pwBand.rotation.x = -Math.PI / 2; pwPrev.add(pwBand);
const pwBandEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), new THREE.LineBasicMaterial({ color:0xff2a20, transparent:true, opacity:.9, fog:false, depthWrite:false, depthTest:false }));
pwBandEdge.rotation.x = -Math.PI / 2; pwPrev.add(pwBandEdge);
// Trajectoire en pointillés (grenade, cocktail)
const PW_ARC_N = 24;
const pwArcGeo = new THREE.BufferGeometry(); pwArcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PW_ARC_N * 3), 3));
const pwArc = new THREE.Line(pwArcGeo, new THREE.LineDashedMaterial({ color:0xffd8a0, dashSize:.6, gapSize:.45, transparent:true, opacity:.85, fog:false, depthWrite:false, depthTest:false }));
pwArc.frustumCulled = false; pwArc.renderOrder = 998; scene.add(pwArc); pwArc.visible = false;
const pwPv = new THREE.Vector3(), pwHand = new THREE.Vector3();
function pwPreview(){
  const id = pwArmed;
  if (!id || state !== 'playing' || !S){ if (pwArmed && state !== 'playing' && state !== 'paused') pwArmed = null; pwPrev.visible = pwArc.visible = false; return; }
  const s = pwStats(id, pwLv(id)), st = pwS[id], ok = st && st.ch >= 1;
  const p = pwAimPoint(pwPv, id !== 'grenade');
  const col = ok ? PW_PREV_COL[id] : 0x888888;
  pwPrevMat.color.setHex(col); pwPrevFill.color.setHex(col); pwBandEdge.material.color.setHex(col);
  const pulse = 1 + Math.sin(performance.now() / 140) * .04;
  pwPrev.visible = true; pwPrev.position.set(p.x, .06, p.z);
  const strike = id === 'strike';
  pwRing.visible = pwDisc.visible = !strike; pwBand.visible = pwBandEdge.visible = strike;
  if (strike){
    // la ligne de bombes suit la rue, centrée sur le point visé
    const len = (s.bombs - 1) * s.step + s.radius * 2, w = s.radius * 2;
    pwBand.scale.set(w, len, 1); pwBandEdge.scale.set(w, len, 1);
  } else {
    const r = s.radius * pulse; pwRing.scale.set(r, r, 1); pwDisc.scale.set(r, r, 1);
  }
  // Trajectoire : de la main jusqu'au point d'impact (hauteur réelle si une grenade vise un volant)
  if (!strike){
    pwHand.set(.35, -.3, -.6).applyMatrix4(camera.matrixWorld);
    const ty = id === 'grenade' ? p.y : 0, a = pwArcGeo.attributes.position.array;
    const dist = Math.hypot(p.x - pwHand.x, p.z - pwHand.z), hgt = Math.max(1, dist * .09); // arc bas : reste dans l'écran vu du toit
    for (let i = 0; i < PW_ARC_N; i++){
      const t = .12 + .88 * i / (PW_ARC_N - 1); // part un peu devant la main
      a[i * 3] = pwHand.x + (p.x - pwHand.x) * t;
      a[i * 3 + 1] = pwHand.y + (ty - pwHand.y) * t + Math.sin(Math.PI * t) * hgt;
      a[i * 3 + 2] = pwHand.z + (p.z - pwHand.z) * t;
    }
    pwArcGeo.attributes.position.needsUpdate = true; pwArc.computeLineDistances();
    pwArc.material.color.setHex(ok ? 0xffd8a0 : 0x888888); pwArc.visible = true;
  } else pwArc.visible = false;
}
try { const _b = visuals; visuals = function(dt){ const r = _b.apply(this, arguments); pwPreview(); return r; }; } catch (e) { errNote(e); }
