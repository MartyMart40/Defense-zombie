'use strict';
/* ================= Défenses automatiques : tours 3D, ciblage, projectiles, ogive ================= */
// Tout est dans defRoot, ajouté à la scène (pas au décor « world ») : disposeWorld() n'y touche jamais.
// Une seule géométrie (cube unité mis à l'échelle) et des matériaux partagés, créés une fois : pas de fuite.
const DGEO = new THREE.BoxGeometry(1, 1, 1);
const DSPH = new THREE.SphereGeometry(1, 14, 10);
const DMAT = { steel:lam(0x4a4e54), dark:lam(0x232428), wood:lam(0x5a3f26), olive:lam(0x4a5236), bag:lam(0x8b7a55), white:lam(0xb8b8ae), red:lam(0x8a2a1e), yellow:lam(0x9a8a2a) };
const addGlow = (c, o) => new THREE.MeshBasicMaterial({ color:c, transparent:true, opacity:o == null ? 1 : o, blending:THREE.AdditiveBlending, depthWrite:false, fog:false });
const DGLOW = { tracer:addGlow(0xffd070, .95), lens:new THREE.MeshBasicMaterial({ color:0xff3020 }), laser:addGlow(0xff3a22, .85), laserCore:addGlow(0xffe0c0, .9), shell:lam(0x1b1b1b), missile:lam(0xd0d0c4), flame:addGlow(0xffa040, .95) };
PMATS.ember = new THREE.MeshBasicMaterial({ color:0xff7a2a });
const defRoot = new THREE.Group(); scene.add(defRoot);
function dpart(parent, sx, sy, sz, mat, x, y, z){ const m = new THREE.Mesh(DGEO, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m); return m; }

/* ---------- Tours ---------- */
let RT = [];
function buildTower(i, slot){
  const P0 = DEF_SLOTS[i], h = P0.h;
  const g = new THREE.Group(); g.position.set(P0.x, 0, P0.z); defRoot.add(g);
  [[-.75, -.75], [.75, -.75], [-.75, .75], [.75, .75]].forEach(p => dpart(g, .22, h, .22, DMAT.steel, p[0], h / 2, p[1]));
  dpart(g, 1.7, .12, .12, DMAT.steel, 0, h * .45, -.75); dpart(g, 1.7, .12, .12, DMAT.steel, 0, h * .45, .75);
  dpart(g, .12, .12, 1.7, DMAT.steel, -.75, h * .7, 0); dpart(g, .12, .12, 1.7, DMAT.steel, .75, h * .7, 0);
  dpart(g, 2.3, .3, 2.3, DMAT.wood, 0, h, 0);
  dpart(g, 2.3, .35, .4, DMAT.bag, 0, h + .3, -1); dpart(g, .4, .35, 1.6, DMAT.bag, P0.x < 0 ? -1 : 1, h + .3, -.1);
  const rt = { i, type:slot ? slot.type : null, g, h, x:P0.x, z:P0.z, head:null, mz:new THREE.Vector3(), cd:rand(.2, .8), st:null };
  if (!slot) return rt;
  rt.st = defStatsSyn(slot.type, slot.lv, P.slots);
  const head = new THREE.Group(); head.position.set(0, h + .15, 0); head.rotation.y = Math.PI; g.add(head); rt.head = head;
  let my = .6, mf = 1.5;
  if (slot.type === 'turret'){
    dpart(head, .9, .4, .9, DMAT.dark, 0, .2, 0); dpart(head, .7, .45, .9, DMAT.olive, 0, .6, 0); dpart(head, .12, .12, 1.3, DMAT.dark, 0, .62, .95);
    my = .62; mf = 1.6;
  } else if (slot.type === 'mortar'){
    dpart(head, 1.2, .35, 1.2, DMAT.olive, 0, .18, 0);
    const tube = dpart(head, .38, .38, 1.5, DMAT.dark, 0, .9, .3); tube.rotation.x = -.85;
    my = 1.5; mf = .8;
  } else if (slot.type === 'laser'){
    dpart(head, .8, .5, .8, DMAT.steel, 0, .25, 0); dpart(head, .4, .4, 1.3, DMAT.white, 0, .7, .35); dpart(head, .28, .28, .08, DGLOW.lens, 0, .7, 1.02);
    my = .7; mf = 1.05;
    rt.beam = new THREE.Mesh(DGEO, DGLOW.laser); rt.beam.visible = false; defRoot.add(rt.beam);
    rt.core = new THREE.Mesh(DGEO, DGLOW.laserCore); rt.core.visible = false; defRoot.add(rt.core);
    rt.beamOn = false; rt.beamT = 0; rt.tgt = null;
  } else if (slot.type === 'missile'){
    dpart(head, .6, .4, .6, DMAT.dark, 0, .2, 0); dpart(head, 1.3, .9, 1.1, DMAT.olive, 0, .85, 0);
    [[-.3, .65], [.3, .65], [-.3, 1.05], [.3, 1.05]].forEach(p => dpart(head, .26, .26, .05, DMAT.dark, p[0], p[1], .56));
    my = .85; mf = .6; rt.salvo = 0; rt.salvoT = 0;
  } else if (slot.type === 'nuke'){
    head.rotation.y = 0;
    dpart(head, 1.5, 1.6, 1.5, DMAT.steel, 0, .8, 0); dpart(head, 1.55, .25, 1.55, DMAT.yellow, 0, 1.25, 0);
    const wh = new THREE.Group(); wh.position.y = 1.6; head.add(wh);
    dpart(wh, .6, 1.2, .6, DMAT.white, 0, .6, 0); dpart(wh, .36, .36, .36, DMAT.red, 0, 1.35, 0);
    rt.warhead = wh; rt.nukeT = rt.st.reload; my = 2.6; mf = 0;
  }
  rt.my = my; rt.mf = mf;
  return rt;
}
function defRebuild(){
  while (defRoot.children.length) defRoot.remove(defRoot.children[0]);
  RT = P.slots.map((s, i) => buildTower(i, s));
  buildSynFx();
  defS = null; // les minuteries repartent au prochain update
}
/* ---------- Synergies : halo sur les tours et lien lumineux au sol ---------- */
// Matériaux partagés par couleur (créés une fois), maillages dans defRoot (vidés par defRebuild).
const SYNMAT = {};
function synMat(c){
  if (!SYNMAT[c]) SYNMAT[c] = { line:addGlow(c, .3), spr:new THREE.SpriteMaterial({ map:glowTex, color:c, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true, opacity:.4, fog:false }) };
  return SYNMAT[c];
}
let synT = 0, synLinks = 0;
function synLink(a, b, c){
  const m = new THREE.Mesh(DGEO, synMat(c).line);
  segA.set(a.x, .07, a.z); segB.set(b.x, .07, b.z);
  m.position.copy(segA).add(segB).multiplyScalar(.5); m.scale.set(.16, .02, Math.max(.01, segA.distanceTo(segB)));
  m.lookAt(segB); defRoot.add(m); synLinks++;
}
function buildSynFx(){
  synLinks = 0;
  const sy = defSynergies(), col = {};
  const byType = t => RT.filter(rt => rt.type === t);
  sy.same.forEach(s => { const g = byType(s.type); g.forEach(rt => { col[rt.i] = col[rt.i] || SYN_SAME_COLOR; }); for (let k = 1; k < g.length; k++) synLink(g[k - 1], g[k], SYN_SAME_COLOR); });
  sy.combos.forEach(c => {
    const a = byType(c.need[0]), b = byType(c.need[1]);
    a.concat(b).forEach(rt => { col[rt.i] = c.color; });
    // la paire la plus proche porte le lien
    let best = null, bd = 1e9;
    a.forEach(p => b.forEach(q => { const d = (p.x - q.x) * (p.x - q.x) + (p.z - q.z) * (p.z - q.z); if (d < bd){ bd = d; best = [p, q]; } }));
    if (best) synLink(best[0], best[1], c.color);
  });
  RT.forEach(rt => {
    if (!col[rt.i]) return;
    const sp = new THREE.Sprite(synMat(col[rt.i]).spr);
    sp.position.set(0, rt.h + .6, 0); sp.scale.set(3.4, 3.4, 1); rt.g.add(sp); rt.synGlow = sp;
  });
}
// Position de la bouche du canon, selon l'orientation de la tête
function muzzle(rt){
  const a = rt.head.rotation.y;
  rt.mz.set(rt.x + Math.sin(a) * rt.mf, rt.h + .15 + rt.my, rt.z + Math.cos(a) * rt.mf);
  return rt.mz;
}
function aimHead(rt, z, dt){
  const want = Math.atan2(z.g.position.x - rt.x, z.g.position.z - rt.z);
  let d = want - rt.head.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
  rt.head.rotation.y += dt ? d * Math.min(1, dt * 12) : d;
}

/* ---------- Effets (pools réutilisés) ---------- */
const fxRoot = new THREE.Group(); scene.add(fxRoot);
function fxPool(n, make){ const a = []; for (let i = 0; i < n; i++){ const o = make(); o.m.visible = false; fxRoot.add(o.m); a.push(o); } return a; }
const tracers = fxPool(24, () => ({ m:new THREE.Mesh(DGEO, DGLOW.tracer), life:0 }));
const shells = fxPool(14, () => ({ m:new THREE.Mesh(DGEO, DGLOW.shell), life:0, t:0, T:1, a:new THREE.Vector3(), b:new THREE.Vector3(), hgt:12, dmg:0, r:0 }));
const missiles = fxPool(40, () => {
  const m = new THREE.Group(); dpart(m, .22, .22, .9, DGLOW.missile, 0, 0, 0); dpart(m, .16, .16, .35, DGLOW.flame, 0, 0, -.6);
  return { m, life:0, age:0, v:new THREE.Vector3(), tgt:null, dmg:0, r:0, smk:0 };
});
const booms = fxPool(16, () => {
  const mat = new THREE.SpriteMaterial({ map:glowTex, color:0xffa050, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true, fog:false });
  return { m:new THREE.Sprite(mat), life:0, max:.45, size:4 };
});
const nfxMats = { ball:addGlow(0xffc070, 1), stem:addGlow(0xff8a3a, .8), ground:addGlow(0x9aff4a, .35) };
const NFX = { ball:new THREE.Mesh(DSPH, nfxMats.ball), stem:new THREE.Mesh(DGEO, nfxMats.stem), cap:new THREE.Mesh(DSPH, nfxMats.stem), ground:new THREE.Mesh(DGEO, nfxMats.ground), t:-1, x:0, z:0, r:60 };
['ball', 'stem', 'cap', 'ground'].forEach(k => { NFX[k].visible = false; fxRoot.add(NFX[k]); });
const nukeMis = new THREE.Group(); dpart(nukeMis, .7, 1.6, .7, DMAT.white, 0, 0, 0); dpart(nukeMis, .4, .4, .4, DMAT.red, 0, .95, 0); dpart(nukeMis, .5, .7, .5, DGLOW.flame, 0, -1.1, 0);
nukeMis.visible = false; fxRoot.add(nukeMis);
const nukes = [], fallouts = [];
let nukeFlash = null;
function flashScreen(){
  if (!nukeFlash){ nukeFlash = document.createElement('div'); nukeFlash.style.cssText = 'position:fixed;inset:0;pointer-events:none;background:#fff8e0;opacity:0;transition:opacity 1.4s ease-out;z-index:3'; document.body.appendChild(nukeFlash); }
  nukeFlash.style.transition = 'none'; nukeFlash.style.opacity = .95;
  requestAnimationFrame(() => requestAnimationFrame(() => { nukeFlash.style.transition = 'opacity 1.4s ease-out'; nukeFlash.style.opacity = 0; }));
}
function getFree(a){ for (const o of a) if (!o.m.visible) return o; return null; }
let fxActive = false;
function clearFx(){
  [tracers, shells, missiles, booms].forEach(a => a.forEach(o => { o.m.visible = false; o.life = 0; }));
  RT.forEach(rt => { if (rt.beam){ rt.beam.visible = rt.core.visible = false; rt.beamOn = false; } });
  ['ball', 'stem', 'cap', 'ground'].forEach(k => NFX[k].visible = false); NFX.t = -1;
  nukeMis.visible = false; nukes.length = 0; fallouts.length = 0; fxActive = false;
}
const segA = new THREE.Vector3(), segB = new THREE.Vector3();
function placeSeg(m, a, b, w){
  m.position.copy(a).add(b).multiplyScalar(.5);
  m.scale.set(w, w, Math.max(.01, a.distanceTo(b)));
  m.lookAt(b); m.visible = true;
}
function tracer(a, b){ const o = getFree(tracers); if (!o) return; placeSeg(o.m, a, b, .07); o.life = .06; }
function boom(x, y, z, size){ const o = getFree(booms); if (!o) return; o.m.position.set(x, y, z); o.size = size; o.max = o.life = .5; o.m.scale.set(.1, .1, 1); o.m.material.opacity = 1; o.m.visible = true; }

/* ---------- Dégâts ---------- */
const hitP = new THREE.Vector3();
// Centre du corps : vraie hauteur (volants, sauteurs en l'air) grâce à z.aimY posé par spawnZombie
const zc = z => hitP.set(z.g.position.x, z.g.position.y + (z.aimY != null ? z.aimY : 1.1 * ((ZTYPES[z.type] || {}).scale || 1)), z.g.position.z);
function defHit(z, amt, blood){
  if (z.dead) return;
  z.hp -= amt; z.flashT = .08;
  if (blood) burst(zc(z), 'blood', 3, 2);
  if (z.hp <= 0) kill(z, false, zc(z).clone());
}
// Brûlure : on garde la plus forte et la plus longue (laser, obus au napalm)
function setBurn(z, dps, t){
  z.dBurn = z.dBurnT > 0 ? Math.max(z.dBurn || 0, dps) : dps;
  z.dBurnT = Math.max(z.dBurnT || 0, t);
}
function splash(x, z0, r, dmg, burn, burnT){
  for (const z of zombies){
    if (z.dead) continue;
    const dx = z.g.position.x - x, dz = z.g.position.z - z0, d = Math.max(0, Math.sqrt(dx * dx + dz * dz) - (z.aimY != null ? z.aimY : 1.1) * .35); // largeur du corps retirée
    if (d < r){ defHit(z, dmg * (1 - .5 * d / r), true); if (burn > 0 && !z.dead) setBurn(z, burn, burnT); }
  }
  boom(x, 1.2, z0, r * 2.4); tmpV.set(x, .3, z0); burst(tmpV, 'dust', 6, 3);
}
let sndT = 0;
function defSnd(f){ if (sndT > 0) return; sndT = .07; f(); }

/* ---------- Ciblage ---------- */
function nearest(px, pz, range, minR){
  let best = null, bd = range * range; const mn = (minR || 0) * (minR || 0);
  for (const z of zombies){
    if (z.dead) continue;
    const dx = z.g.position.x - px, dz = z.g.position.z - pz, d2 = dx * dx + dz * dz;
    if (d2 < bd && d2 >= mn){ bd = d2; best = z; }
  }
  return best;
}
function inRange(rt, z, range){ const dx = z.g.position.x - rt.x, dz = z.g.position.z - rt.z; return !z.dead && dx * dx + dz * dz < range * range; }

/* ---------- Mise à jour (appelée par update() pendant le jeu) ---------- */
let defS = null;
function defReset(){
  clearFx();
  RT.forEach(rt => { rt.cd = rand(.2, .8); if (rt.type === 'nuke'){ rt.nukeT = rt.st.reload; } if (rt.type === 'missile') rt.salvo = 0; });
}
function defUpdate(dt){
  if (S !== defS){ defS = S; defReset(); }
  fxActive = true; sndT -= dt;
  for (const rt of RT) if (rt.type) TICK[rt.type](rt, dt);
  // Brûlures du laser (et du napalm), marques de la tourelle
  for (const z of zombies){
    if (z.dMarkT > 0) z.dMarkT -= dt;
    if (z.dead || !(z.dBurnT > 0)) continue;
    z.dBurnT -= dt; defHit(z, z.dBurn * dt, false);
    if (Math.random() < dt * 4) burst(zc(z), 'ember', 1, 1);
  }
  // Retombées de l'ogive
  for (let i = fallouts.length - 1; i >= 0; i--){
    const f = fallouts[i]; f.t -= dt;
    if (f.t <= 0){ fallouts.splice(i, 1); continue; }
    for (const z of zombies){ if (z.dead) continue; const dx = z.g.position.x - f.x, dz = z.g.position.z - f.z; if (dx * dx + dz * dz < f.r * f.r) defHit(z, f.dps * dt, false); }
  }
  updateFx(dt);
}
const TICK = {
  turret(rt, dt){
    rt.cd -= dt; const st = rt.st;
    const t = nearest(rt.x, rt.z, st.range); if (t) aimHead(rt, t, dt);
    if (rt.cd > 0) return;
    if (!t){ rt.cd = .15; return; }
    rt.cd = Math.max(0, rt.cd) + 1 / st.rate;
    aimHead(rt, t);
    const o = muzzle(rt).clone();
    // Balle perforante : la cible, puis ceux qui sont derrière elle sur la même ligne
    let n = Math.floor(st.pierce) + (Math.random() < st.pierce % 1 ? 1 : 0);
    const dx = t.g.position.x - o.x, dz = t.g.position.z - o.z, L = Math.sqrt(dx * dx + dz * dz) || 1, ux = dx / L, uz = dz / L;
    const hits = [t];
    if (n > 1){
      const cand = [];
      for (const z of zombies){
        if (z.dead || z === t) continue;
        const px = z.g.position.x - o.x, pz = z.g.position.z - o.z, s = px * ux + pz * uz;
        if (s <= L || s > st.range * 1.3) continue;
        if (Math.abs(px * uz - pz * ux) < .6) cand.push([s, z]);
      }
      cand.sort((a, b) => a[0] - b[0]);
      for (let k = 0; k < cand.length && hits.length < n; k++) hits.push(cand[k][1]);
    }
    const lastZ = hits[hits.length - 1];
    segB.copy(zc(lastZ));
    hits.forEach(z => { defHit(z, st.dmg, true); if (st.syn.mark) z.dMarkT = SYN.markT; });
    tracer(o, segB);
    defSnd(() => Snd.burst(3200, .06, .12));
  },
  mortar(rt, dt){
    rt.cd -= dt; if (rt.cd > 0) return;
    const st = rt.st, t = nearest(rt.x, rt.z, st.range, 8);
    if (!t){ rt.cd = .25; return; }
    const sh = getFree(shells); if (!sh){ rt.cd = .2; return; }
    rt.cd = 1 / st.rate; aimHead(rt, t);
    const T = 1.4, pz = t.st === 'walk' ? Math.min(t.stopZ, t.g.position.z + t.speed * T) : t.g.position.z;
    sh.a.copy(muzzle(rt)); sh.b.set(t.g.position.x, .2, pz); sh.t = 0; sh.T = T; sh.hgt = 10 + sh.a.distanceTo(sh.b) * .15;
    sh.dmg = st.dmg; sh.r = st.radius; sh.burn = st.syn.napalm ? st.dmg * SYN.napalmDps : 0; sh.burnT = st.burnT; sh.m.scale.set(.35, .35, .5); sh.m.position.copy(sh.a); sh.m.visible = true; sh.life = 1;
    boom(sh.a.x, sh.a.y, sh.a.z, 1.6);
    Snd.tone(220, .18, 'sine', .2, 70);
  },
  laser(rt, dt){
    const st = rt.st;
    if (!rt.beamOn){
      rt.cd -= dt; if (rt.cd > 0) return;
      rt.tgt = nearest(rt.x, rt.z, st.range);
      if (!rt.tgt){ rt.cd = .2; return; }
      rt.beamOn = true; rt.beamT = LASER_ON; Snd.tone(900, .25, 'sawtooth', .06, 300);
    }
    rt.beamT -= dt;
    if (!rt.tgt || !inRange(rt, rt.tgt, st.range)) rt.tgt = nearest(rt.x, rt.z, st.range);
    if (rt.beamT <= 0 || !rt.tgt){ rt.beamOn = false; rt.beam.visible = rt.core.visible = false; rt.cd = st.off; return; }
    aimHead(rt, rt.tgt, dt);
    const o = muzzle(rt);
    let dx = rt.tgt.g.position.x - o.x, dz = rt.tgt.g.position.z - o.z; const L = Math.sqrt(dx * dx + dz * dz) || 1; dx /= L; dz /= L;
    const len = Math.max(L + 4, st.range);
    // Le rayon traverse toute la file : tous ceux qui sont sur la ligne
    for (const z of zombies){
      if (z.dead) continue;
      const px = z.g.position.x - o.x, pz = z.g.position.z - o.z, s = px * dx + pz * dz;
      if (s < 0 || s > len) continue;
      if (Math.abs(px * dz - pz * dx) < .9){ defHit(z, st.dps * dt, Math.random() < dt * 3); setBurn(z, st.burn, st.burnT); }
    }
    const ty = zc(rt.tgt).y; segA.copy(o); segB.set(o.x + dx * len, Math.max(.3, o.y + (ty - o.y) * len / L), o.z + dz * len); // le rayon passe par la cible, même en l'air
    const fl = .8 + Math.random() * .4;
    placeSeg(rt.beam, segA, segB, .32 * fl); placeSeg(rt.core, segA, segB, .1);
    if (Math.random() < dt * 8) burst(zc(rt.tgt), 'ember', 2, 1.5);
  },
  missile(rt, dt){
    const st = rt.st;
    if (rt.salvo > 0){
      rt.salvoT -= dt;
      if (rt.salvoT <= 0){
        rt.salvoT = .14; rt.salvo--;
        const cand = zombies.filter(z => !z.dead && inRange(rt, z, st.range));
        // Marquage : les zombies marqués par la tourelle passent en premier
        const marked = st.syn.hunt ? cand.filter(z => z.dMarkT > 0) : [];
        const t = pick(marked.length ? marked : cand) || null;
        const m = getFree(missiles);
        if (t && m){
          if (rt.head) aimHead(rt, t);
          m.m.position.copy(muzzle(rt)); m.v.set(rand(-3, 3), 14, rand(-3, 3)); m.tgt = t; m.dmg = st.dmg * (marked.length ? SYN.markDmg : 1); m.r = st.radius; m.age = 0; m.life = 1; m.smk = 0; m.m.visible = true;
          Snd.burst(1600, .25, .14);
        }
      }
      return;
    }
    rt.cd -= dt; if (rt.cd > 0) return;
    const t = nearest(rt.x, rt.z, st.range);
    if (!t){ rt.cd = .3; return; }
    rt.cd = 1 / st.rate; aimHead(rt, t);
    rt.salvo = Math.floor(st.count) + (Math.random() < st.count % 1 ? 1 : 0); rt.salvoT = 0;
  },
  nuke(rt, dt){
    const st = rt.st;
    if (rt.nukeT > 0){ rt.nukeT -= dt; rt.warhead.visible = true; rt.warhead.scale.y = .25 + .75 * clamp(1 - rt.nukeT / st.reload, 0, 1); return; }
    rt.warhead.scale.y = 1;
    let n = 0, sx = 0, sz = 0, atk = false;
    for (const z of zombies){ if (z.dead) continue; n++; sx += z.g.position.x; sz += z.g.position.z; if (z.st === 'attack') atk = true; }
    if (!n || nukes.length) return;
    if (n < 6 && !atk && plan && plan.queue.length) return; // on attend qu'il y en ait assez
    rt.nukeT = st.reload; rt.warhead.visible = false;
    const o = muzzle(rt);
    nukes.push({ t:0, ox:o.x, oy:o.y, oz:o.z, x:sx / n * .3, z:clamp(sz / n, -95, -25), dmg:st.dmg, r:st.radius, dps:st.fallout });
    Snd.tone(300, 1.2, 'sawtooth', .12, 1200);
  }
};
function updateFx(dt){
  for (const o of tracers){ if (!o.m.visible) continue; o.life -= dt; if (o.life <= 0) o.m.visible = false; }
  for (const s of shells){
    if (!s.m.visible) continue;
    s.t += dt; const u = Math.min(1, s.t / s.T);
    s.m.position.lerpVectors(s.a, s.b, u); s.m.position.y += s.hgt * 4 * u * (1 - u);
    s.m.rotation.x += dt * 4;
    if (u >= 1){ s.m.visible = false; splash(s.b.x, s.b.z, s.r, s.dmg, s.burn, s.burnT); Snd.burst(700, .45, .35); }
  }
  for (const m of missiles){
    if (!m.m.visible) continue;
    m.age += dt;
    if (!m.tgt || m.tgt.dead){ m.tgt = nearest(m.m.position.x, m.m.position.z, 60); }
    const spd = Math.min(34, 14 + m.age * 40);
    if (m.tgt && m.age > .25){
      tmpV.copy(zc(m.tgt)).sub(m.m.position).normalize().multiplyScalar(spd);
      m.v.lerp(tmpV, Math.min(1, dt * 5));
    } else if (!m.tgt) m.v.y -= 20 * dt;
    m.m.position.addScaledVector(m.v, dt);
    tmpV.copy(m.m.position).add(m.v); m.m.lookAt(tmpV);
    m.smk -= dt; if (m.smk <= 0){ m.smk = .05; burst(m.m.position, 'dust', 1, .3); }
    const near = m.tgt && m.m.position.distanceTo(zc(m.tgt)) < 1.4;
    if (near || m.m.position.y < .25 || m.age > 5){
      m.m.visible = false; splash(m.m.position.x, m.m.position.z, m.r, m.dmg); if (Snd.boom) Snd.boom(.6); else Snd.burst(500, .6, .45);
      shake = Math.max(shake, .12);
    }
  }
  for (const b of booms){
    if (!b.m.visible) continue;
    b.life -= dt; if (b.life <= 0){ b.m.visible = false; continue; }
    const k = 1 - b.life / b.max, s = b.size * (.35 + .65 * k);
    b.m.scale.set(s, s, 1); b.m.material.opacity = 1 - k;
  }
  // Ogive : montée, chute, explosion
  for (let i = nukes.length - 1; i >= 0; i--){
    const n = nukes[i]; n.t += dt; nukeMis.visible = true;
    if (n.t < .9){ nukeMis.position.set(n.ox, n.oy + n.t * n.t * 80, n.oz); nukeMis.rotation.x = 0; }
    else if (n.t < 1.7){ const u = (n.t - .9) / .8; nukeMis.position.set(n.x, 70 * (1 - u), n.z); nukeMis.rotation.x = Math.PI; }
    else {
      nukeMis.visible = false; nukes.splice(i, 1);
      for (const z of zombies){ if (z.dead) continue; const dx = z.g.position.x - n.x, dz = z.g.position.z - n.z; if (dx * dx + dz * dz < n.r * n.r) defHit(z, n.dmg, true); }
      fallouts.push({ x:n.x, z:n.z, r:n.r, dps:n.dps, t:FALLOUT_T });
      NFX.t = 0; NFX.x = n.x; NFX.z = n.z; NFX.r = n.r;
      flashScreen(); shake = Math.max(shake, 1.4);
      if (Snd.boom) Snd.boom(2.5); else { Snd.burst(260, 2.6, 1); Snd.tone(60, 2.2, 'sine', .6, 25); }
    }
  }
  if (NFX.t >= 0){
    NFX.t += dt; const t = NFX.t, R = Math.min(NFX.r, 60);
    if (t > 4){ ['ball', 'stem', 'cap', 'ground'].forEach(k => NFX[k].visible = false); NFX.t = -1; }
    else {
      const grow = Math.min(1, t / .5), fade = t < 1 ? 1 : Math.max(0, 1 - (t - 1) / 3);
      NFX.ball.visible = t < 1.6; NFX.ball.position.set(NFX.x, R * .15 * grow, NFX.z); NFX.ball.scale.setScalar(R * .32 * grow + .1); nfxMats.ball.opacity = Math.max(0, 1 - t / 1.6);
      const up = Math.min(1, t / 1.8);
      NFX.stem.visible = true; NFX.stem.scale.set(R * .08, R * .55 * up + .1, R * .08); NFX.stem.position.set(NFX.x, R * .275 * up, NFX.z);
      NFX.cap.visible = true; NFX.cap.scale.set(R * .3 * up + .1, R * .14 * up + .1, R * .3 * up + .1); NFX.cap.position.set(NFX.x, R * .55 * up, NFX.z);
      nfxMats.stem.opacity = .8 * fade;
      NFX.ground.visible = true; NFX.ground.scale.set(Math.min(26, NFX.r * .5), .05, NFX.r * 2 * grow); NFX.ground.position.set(0, .06, NFX.z); nfxMats.ground.opacity = .35 * fade;
    }
  }
}
// Appelée à chaque image par visuals() : on range les effets quand la vague est finie
function defFrame(dt){
  if (state !== 'playing' && state !== 'paused' && fxActive) clearFx();
  // Pulsation lente et discrète des halos de synergie (quelques matériaux partagés seulement)
  synT += dt || 0; const k = .75 + .25 * Math.sin(synT * 2.4);
  for (const c in SYNMAT){ SYNMAT[c].line.opacity = .3 * k; SYNMAT[c].spr.opacity = .4 * k; }
}
// Crochet appelé par updateHUD() : ferraille et compte à rebours de l'ogive
let nukeShown = false;
function defHUD(){
  setTxt('scrapH', '⚙ ' + fmtN(Math.floor(P.scrap)) + (S && S.scrapGained ? ' (+' + fmtN(Math.floor(S.scrapGained)) + ')' : ''));
  let best = null;
  for (const rt of RT) if (rt.type === 'nuke' && (best === null || rt.nukeT < best)) best = rt.nukeT;
  const show = best !== null;
  if (show !== nukeShown){ nukeShown = show; $('nukeH').classList.toggle('hide', !show); }
  if (show) setTxt('nukeH', best <= 0 ? '☢ Prête' : '☢ ' + Math.ceil(best) + ' s');
}
defRebuild();

// Accès pour les tests automatiques
window.__atelier = { DEF_TYPES, DEF_SLOTS, DEF_ORDER, DEF_LINES, defStats, defSoft, defGrow, defUpgCost, defSellValue, defBuy, defUpgrade, defSell, scrapFor, SCRAP_Z,
  openAtelier, renderAtelier, defRebuild, defUpdate, get RT(){ return RT; }, defRoot, fxRoot, clearFx,
  SYN_SAME, SYN_SAME_NUKE, SYN_COMBOS, SYN, defSynergies, defSynMods, defStatsSyn, defSynText, TICK, splash, get synLinks(){ return synLinks; } };
window.__syn = { SYN_SAME, SYN_SAME_NUKE, SYN_COMBOS, SYN, defSynergies, defSynMods, defStatsSyn, defSynText, defSynGain, renderSynergies, TICK, updateFx, get RT(){ return RT; }, get synLinks(){ return synLinks; } };
// Les tours du toit n'ont rien à faire dans la vallée du RTS : cachées pendant la guerre des robots
Jeu.on('image', () => { defRoot.visible = !(typeof RTS !== 'undefined' && RTS.on); });
