'use strict';
/* ================= Rendu : qualité graphique, nuages, brume, flaques, ombres, fumée ================= */
// Réglage « Graphismes » dans l'écran Pause (dt_gfx) : auto, basse, moyenne, haute.
//   auto = moyenne sur cell, haute sur ordi. La qualité règle la résolution de rendu et la quantité d'effets.
// Effets (tous créés une fois, en pools, et seulement cachés ensuite : aucune fuite, aucun objet recréé) :
//   nuages qui défilent (teintés selon la météo), brume au sol (plus épaisse au brouillard et à l'aube),
//   flaques qui brillent quand il pleut (puis sèchent), ombres sous les zombies (une tache au sol,
//   un seul appel de dessin pour toute la foule), fumée des feux et des explosions.
// Les ombres et la fumée ne coûtent presque rien : pas de calcul d'ombre, pas d'effet plein écran.

const GFX_Q = {
  bas:   { nom:'basse',   pr:1,    clouds:0,  mist:0, puddles:0,  shadows:false, smoke:0,  fireSmoke:0, debris:0, halos:false, embers:0 },
  moyen: { nom:'moyenne', pr:1.25, clouds:6,  mist:5, puddles:6,  shadows:true,  smoke:16, fireSmoke:.55, debris:45, halos:true, embers:10 },
  haut:  { nom:'haute',   pr:2,    clouds:12, mist:9, puddles:10, shadows:true,  smoke:30, fireSmoke:.3,  debris:90, halos:true, embers:24 }
};
const GFX_ORDER = ['auto', 'bas', 'moyen', 'haut'];
const GFX = { pref: store.get('dt_gfx', 'auto'), wet:0, t:0, smokeN:0, fireT:0 };
if (GFX_ORDER.indexOf(GFX.pref) < 0) GFX.pref = 'auto';
const gfxLevel = () => (GFX.pref === 'auto' ? (isTouch ? 'moyen' : 'haut') : GFX.pref);
const gfxQ = () => GFX_Q[gfxLevel()];
const gfxRoot = new THREE.Group(); scene.add(gfxRoot); // hors de « world » : disposeWorld() n'y touche pas

/* ---------- Textures (dessinées une fois) ---------- */
const gfxCloudTex = canvasTex(256, 128, (g, w, h) => {
  for (let i = 0; i < 22; i++){
    const x = w * (.18 + Math.random() * .64), y = h * (.42 + Math.random() * .25), r = h * (.16 + Math.random() * .2);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
});
const gfxSoftTex = canvasTex(64, 64, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.5, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const gfxShadowTex = canvasTex(64, 64, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(.6, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const gfxPuddleTex = canvasTex(64, 64, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.7, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,.35)';
  for (let i = 0; i < 6; i++){ g.beginPath(); g.ellipse(w * Math.random(), h * Math.random(), 6 + Math.random() * 10, 3 + Math.random() * 6, Math.random() * 3, 0, 6.3); g.fill(); }
});

/* ---------- Nuages ---------- */
const gfxClouds = [];
for (let i = 0; i < GFX_Q.haut.clouds; i++){
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:gfxCloudTex, transparent:true, depthWrite:false, fog:false, opacity:.8 }));
  const a = rand(-1.3, 1.3) - Math.PI / 2, d = rand(200, 260);
  s.position.set(Math.cos(a) * d, rand(45, 95), Math.sin(a) * d); const k = rand(70, 130); s.scale.set(k, k * .45, 1);
  s.userData.v = rand(.6, 1.6); s.visible = false; gfxRoot.add(s); gfxClouds.push(s);
}
/* ---------- Brume au sol ---------- */
const gfxMist = [];
for (let i = 0; i < GFX_Q.haut.mist; i++){
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:gfxSoftTex, transparent:true, depthWrite:false, opacity:.2 }));
  s.position.set(rand(-14, 14), rand(1, 2.2), -30 - i * 9 - rand(0, 6)); s.scale.set(rand(26, 36), rand(4, 6), 1);
  s.userData.v = rand(.3, .8) * (Math.random() < .5 ? -1 : 1); s.visible = false; gfxRoot.add(s); gfxMist.push(s);
}
/* ---------- Flaques ---------- */
const gfxPuddleGeo = new THREE.PlaneGeometry(1, 1); gfxPuddleGeo.rotateX(-Math.PI / 2);
const gfxPuddleMat = new THREE.MeshBasicMaterial({ map:gfxPuddleTex, transparent:true, depthWrite:false, opacity:0, color:0xaab4c0 });
const gfxPuddles = [];
for (let i = 0; i < GFX_Q.haut.puddles; i++){ const m = new THREE.Mesh(gfxPuddleGeo, gfxPuddleMat); m.visible = false; m.renderOrder = 1; gfxRoot.add(m); gfxPuddles.push(m); }
function gfxPlacePuddles(){
  gfxPuddles.forEach((m, i) => { m.position.set(rand(-9, 9), .025 + i * .001, rand(-80, -14)); m.scale.set(rand(1.6, 4), 1, rand(1, 2.4)); m.rotation.y = rand(0, 3); });
}
gfxPlacePuddles();
/* ---------- Ombres sous les zombies (une seule InstancedMesh) ---------- */
const GFX_SH_N = DEV_CAP + 40;
const gfxShGeo = new THREE.PlaneGeometry(1, 1); gfxShGeo.rotateX(-Math.PI / 2);
const gfxShadows = new THREE.InstancedMesh(gfxShGeo, new THREE.MeshBasicMaterial({ map:gfxShadowTex, transparent:true, depthWrite:false, fog:true }), GFX_SH_N);
gfxShadows.frustumCulled = false; gfxShadows.count = 0; gfxShadows.renderOrder = 2; gfxRoot.add(gfxShadows);
const gfxM = new THREE.Matrix4(), gfxP = new THREE.Vector3(), gfxS = new THREE.Vector3(), gfxQt = new THREE.Quaternion();
function gfxShadowStep(){
  const on = gfxQ().shadows && typeof zombies !== 'undefined';
  gfxShadows.visible = !!on; if (!on){ gfxShadows.count = 0; return; }
  let n = 0;
  for (let i = 0; i < zombies.length && n < GFX_SH_N; i++){
    const z = zombies[i]; if (!z.g) continue;
    const gp = z.g.position, T = ZTYPES[z.type] || {}, sc = (T.scale || 1) * (z.type === 'gargoyle' ? 1.8 : z.type === 'crow' ? .35 : z.type === 'flyer' ? 1.3 : z.type === 'crawler' ? .9 : 1);
    let k = sc * (1 - Math.min(.65, gp.y / 14)); // plus haut = ombre plus petite
    if (z.dead) k *= Math.max(0, 1 - z.deadT / 2.4);
    if (k < .05) continue;
    gfxP.set(gp.x, .03, gp.z); gfxS.set(1.25 * k, 1, 1.25 * k * (z.type === 'flyer' || z.type === 'gargoyle' ? .7 : 1));
    gfxM.compose(gfxP, gfxQt, gfxS); gfxShadows.setMatrixAt(n++, gfxM);
  }
  gfxShadows.count = n; gfxShadows.instanceMatrix.needsUpdate = true;
}
/* ---------- Fumée (feux et explosions) ---------- */
const gfxSmokeMat = (c) => new THREE.SpriteMaterial({ map:gfxSoftTex, transparent:true, depthWrite:false, color:c, opacity:0 });
const gfxSmoke = [];
for (let i = 0; i < GFX_Q.haut.smoke; i++){ const s = new THREE.Sprite(gfxSmokeMat(0x55504a)); s.visible = false; gfxRoot.add(s); gfxSmoke.push({ s, life:0, max:1, v:0, g:1, op:.5 }); }
let gfxSmokeNext = 0;
function gfxPuff(x, y, z, size, life, dark){
  const cap = gfxQ().smoke; if (!cap) return null;
  const o = gfxSmoke[gfxSmokeNext % cap]; gfxSmokeNext++;
  o.s.position.set(x + rand(-.4, .4), y, z + rand(-.4, .4)); o.s.scale.set(size, size, 1);
  o.s.material.color.setHex(dark ? 0x2e2a26 : 0x6a645c); o.s.material.rotation = rand(0, 6);
  o.life = o.max = life; o.v = rand(1.2, 2.2); o.g = rand(.8, 1.4) * size; o.op = dark ? .65 : .4; o.s.visible = true; GFX.smokeN++;
  return o;
}
function gfxBoomSmoke(x, y, z, r){ const n = gfxLevel() === 'haut' ? 6 : 3; for (let i = 0; i < n; i++) gfxPuff(x + rand(-r, r) * .4, y + rand(0, 1.5), z + rand(-r, r) * .4, r * rand(.6, 1), rand(2.2, 3.4), true); }
function gfxSmokeStep(dt){
  for (const o of gfxSmoke){
    if (!o.s.visible) continue;
    o.life -= dt; if (o.life <= 0){ o.s.visible = false; continue; }
    const u = 1 - o.life / o.max;
    o.s.position.y += o.v * dt; o.s.position.x += .6 * dt; // le vent pousse la fumée
    const k = o.s.scale.x + o.g * dt; o.s.scale.set(k, k, 1);
    o.s.material.opacity = o.op * Math.min(1, u * 5) * (1 - u);
  }
  // Feux du décor : une bouffée régulière
  const fs = gfxQ().fireSmoke;
  if (fs && typeof fires !== 'undefined' && fires.length && (state === 'playing' || state === 'mech' || state === 'rts')){
    GFX.fireT -= dt;
    if (GFX.fireT <= 0){
      GFX.fireT = fs;
      const f = fires[Math.floor(Math.random() * fires.length)], g = f.cones && f.cones[0] && f.cones[0].parent;
      if (g){ g.getWorldPosition(gfxP); gfxPuff(gfxP.x, gfxP.y + 1.6, gfxP.z, rand(1.4, 2.2), rand(2.5, 3.5), true); }
    }
  }
}

/* ---------- Débris dans la rue (3 InstancedMesh : planches et briques, sacs poubelle, pneus) ---------- */
// Placés au hasard à chaque ville, surtout près des trottoirs (le milieu de la rue reste dégagé pour viser).
const GFX_DEB_N = GFX_Q.haut.debris;
const gfxDebMat = new THREE.MeshLambertMaterial({ color:0xffffff });
const gfxDeb = {
  box: new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), gfxDebMat, GFX_DEB_N),
  bag: new THREE.InstancedMesh(new THREE.SphereGeometry(.5, 7, 5), new THREE.MeshLambertMaterial({ color:0x1e2a20 }), Math.ceil(GFX_DEB_N / 4)),
  tire: new THREE.InstancedMesh(new THREE.TorusGeometry(.32, .13, 5, 10), new THREE.MeshLambertMaterial({ color:0x1a1a1c }), Math.ceil(GFX_DEB_N / 6))
};
Object.keys(gfxDeb).forEach(k => { gfxDeb[k].count = 0; gfxDeb[k].frustumCulled = false; gfxRoot.add(gfxDeb[k]); });
const GFX_DEB_COL = [0x6a4a2a, 0x8a6a40, 0x7a3a2a, 0x8a3a28, 0x5a5a56, 0xd8d0b8, 0xc8c0a0]; // bois, briques, béton, papiers
const gfxE = new THREE.Euler();
function gfxPlaceDebris(){
  const n = gfxQ().debris, side = () => (Math.random() < .5 ? -1 : 1) * rand(5.5, 12.5);
  let nb = 0, ng = 0, nt = 0;
  for (let i = 0; i < n; i++){
    const r = Math.random(), x = Math.random() < .8 ? side() : rand(-5, 5), z = rand(-120, -14);
    if (r < .66 && nb < GFX_DEB_N){
      const paper = Math.random() < .3, c = paper ? pick(GFX_DEB_COL.slice(5)) : pick(GFX_DEB_COL.slice(0, 5));
      gfxP.set(x, paper ? .012 : rand(.04, .12), z); gfxE.set(paper ? 0 : rand(-.2, .2), rand(0, 6.3), paper ? 0 : rand(-.15, .15)); gfxQt.setFromEuler(gfxE);
      if (paper) gfxS.set(rand(.25, .4), .01, rand(.3, .45)); else if (Math.random() < .5) gfxS.set(rand(.9, 1.8), rand(.06, .1), rand(.14, .22)); else gfxS.set(.22, .1, .1);
      gfxM.compose(gfxP, gfxQt, gfxS); gfxDeb.box.setMatrixAt(nb, gfxM); gfxDeb.box.setColorAt(nb, gfxC.setHex(c)); nb++;
    } else if (r < .86 && ng < gfxDeb.bag.instanceMatrix.count){
      const k = rand(.7, 1.1); gfxP.set(Math.sign(x || 1) * rand(9, 13), .3 * k, z); gfxE.set(0, rand(0, 6), 0); gfxQt.setFromEuler(gfxE); gfxS.set(.9 * k, .7 * k, .8 * k);
      gfxM.compose(gfxP, gfxQt, gfxS); gfxDeb.bag.setMatrixAt(ng++, gfxM);
    } else if (nt < gfxDeb.tire.instanceMatrix.count){
      gfxP.set(x, .13, z); gfxE.set(Math.PI / 2, 0, rand(0, 6)); gfxQt.setFromEuler(gfxE); gfxS.set(1, 1, 1);
      gfxM.compose(gfxP, gfxQt, gfxS); gfxDeb.tire.setMatrixAt(nt++, gfxM);
    }
  }
  gfxDeb.box.count = Math.min(nb, GFX_DEB_N); gfxDeb.bag.count = ng; gfxDeb.tire.count = nt;
  Object.keys(gfxDeb).forEach(k => { gfxDeb[k].instanceMatrix.needsUpdate = true; if (gfxDeb[k].instanceColor) gfxDeb[k].instanceColor.needsUpdate = true; });
}
/* ---------- Halos des lampadaires (forts la nuit, très légers le jour) ---------- */
const gfxHalos = [];
const gfxHaloMat = new THREE.SpriteMaterial({ map:glowTex, color:0xffc870, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0 });
for (let i = 0; i < 12; i++){ const s = new THREE.Sprite(gfxHaloMat); s.scale.set(5, 5, 1); s.visible = false; gfxRoot.add(s); gfxHalos.push(s); }
function gfxPlaceHalos(){
  let n = 0;
  if (typeof world !== 'undefined' && world) world.children.forEach(o => {
    if (n < gfxHalos.length && o.isMesh && Math.abs(o.position.y - 6.9) < .01 && Math.abs(Math.abs(o.position.x) - 12.7) < .01){ gfxHalos[n].position.set(o.position.x, 6.75, o.position.z); gfxHalos[n].userData.on = true; n++; }
  });
  for (let i = n; i < gfxHalos.length; i++) gfxHalos[i].userData.on = false;
}
/* ---------- Braises qui montent des feux ---------- */
const gfxEmberMat = new THREE.SpriteMaterial({ map:glowTex, color:0xff8a30, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending });
const gfxEmbers = [];
for (let i = 0; i < GFX_Q.haut.embers; i++){ const s = new THREE.Sprite(gfxEmberMat); s.scale.set(.16, .16, 1); s.visible = false; gfxRoot.add(s); gfxEmbers.push({ s, life:0, vx:0, vy:0 }); }
let gfxEmberT = 0, gfxEmberI = 0;
function gfxEmberStep(dt){
  const cap = gfxQ().embers;
  if (cap && typeof fires !== 'undefined' && fires.length && (state === 'playing' || state === 'mech' || state === 'rts')){
    gfxEmberT -= dt;
    while (gfxEmberT <= 0){
      gfxEmberT += .12;
      const f = fires[Math.floor(Math.random() * fires.length)], g = f.cones && f.cones[0] && f.cones[0].parent; if (!g) break;
      const o = gfxEmbers[gfxEmberI++ % cap]; g.getWorldPosition(gfxP);
      o.s.position.set(gfxP.x + rand(-.4, .4), gfxP.y + rand(.6, 1.2), gfxP.z + rand(-.4, .4)); o.vx = rand(-.3, .6); o.vy = rand(1.5, 3); o.life = rand(1.2, 2.2); o.s.visible = true;
    }
  }
  for (const o of gfxEmbers){
    if (!o.s.visible) continue;
    o.life -= dt; if (o.life <= 0){ o.s.visible = false; continue; }
    o.s.position.x += (o.vx + Math.sin(o.life * 6) * .4) * dt; o.s.position.y += o.vy * dt;
    const k = .1 + .1 * Math.min(1, o.life); o.s.scale.set(k, k, 1);
  }
}

/* ---------- Teintes selon la météo ---------- */
const gfxC = new THREE.Color();
function gfxWeather(){ return (typeof __amb === 'object' && __amb.weather) || 'clair'; }
function gfxStep(dt){
  const Q = gfxQ(), w = gfxWeather(), W = (typeof WEATHERS === 'object' && WEATHERS[w]) || {}, live = state === 'playing' || state === 'paused' || state === 'shop' || state === 'mech' || state === 'mechover' || state === 'rts' || state === 'rtsover';
  GFX.t += dt;
  // Nuages : blancs au beau temps, gris sous la pluie, sombres la nuit, roses à l'aube et au coucher
  let cc = 0xffffff, cop = .8, nC = Q.clouds;
  if (W.storm){ cc = 0x3a3e48; cop = .95; }
  else if (W.rain || w === 'grele'){ cc = 0x6a6e76; cop = .9; }
  else if (W.night){ cc = 0x2a3040; cop = .45; }
  else if (w === 'coucher'){ cc = 0xffb090; }
  else if (w === 'aube'){ cc = 0xffd0d0; }
  else if (w === 'poussiere'){ cc = 0xb08850; cop = .7; }
  else if (w === 'canicule'){ nC = Math.ceil(nC / 3); cop = .5; }
  else if (w === 'brouillard'){ nC = 0; }
  gfxClouds.forEach((s, i) => {
    const on = live && i < nC; s.visible = on; if (!on) return;
    s.material.color.setHex(cc); s.material.opacity = cop;
    if (cc === 0xffffff && w !== 'soleil') s.material.color.lerp(scene.fog.color, .45); // temps normal : nuages teintés par le ciel de la ville
    s.position.x += s.userData.v * dt; if (s.position.x > 260) s.position.x = -260;
  });
  // Brume au sol : couleur du brouillard de la ville
  const mk = w === 'brouillard' ? 2.2 : w === 'aube' ? 1.8 : w === 'poussiere' ? 1.6 : W.rain ? 1.2 : w === 'soleil' || w === 'canicule' ? .25 : .6;
  gfxMist.forEach((s, i) => {
    const on = live && i < Q.mist; s.visible = on; if (!on) return;
    s.material.color.copy(scene.fog.color).lerp(gfxC.setHex(0xffffff), .15); s.material.opacity = Math.min(.5, .14 * mk);
    s.position.x += s.userData.v * dt; if (s.position.x > 18) s.position.x = -18; else if (s.position.x < -18) s.position.x = 18;
  });
  // Flaques : elles se remplissent sous la pluie et sèchent lentement après
  GFX.wet = clamp(GFX.wet + (W.rain ? dt / 8 : -dt / 40), 0, 1);
  gfxPuddleMat.opacity = .42 * GFX.wet;
  gfxPuddleMat.color.copy(scene.fog.color).lerp(gfxC.setHex(0xc8d2dc), .4);
  gfxPuddles.forEach((m, i) => { m.visible = live && i < Q.puddles && GFX.wet > .02; });
  gfxShadowStep();
  gfxSmokeStep(dt);
  gfxEmberStep(dt);
  // Débris et halos
  const deb = live && Q.debris > 0; Object.keys(gfxDeb).forEach(k => { gfxDeb[k].visible = deb; });
  const night = !!W.night, hop = night ? .55 : W.storm || W.rain || w === 'brouillard' ? .18 : .05;
  gfxHaloMat.opacity = hop;
  gfxHalos.forEach(h => { h.visible = live && Q.halos && !!h.userData.on && hop > .1; /* le jour : rien à dessiner */ if (h.visible){ const k = night ? 6 + Math.sin(GFX.t * 3 + h.position.z) * .3 : 4; h.scale.set(k, k, 1); } });
}

/* ---------- Réglage dans l'écran Pause ---------- */
function gfxApply(){
  try {
    const Q = gfxQ(), dpr = window.devicePixelRatio || 1;
    renderer.setPixelRatio(Math.min(dpr, Q.pr, isTouch ? 1.5 : 2));
    if (typeof resize === 'function') resize();
  } catch (e) {}
  gfxSmoke.forEach((o, i) => { if (i >= gfxQ().smoke){ o.s.visible = false; o.life = 0; } });
  gfxEmbers.forEach((o, i) => { if (i >= gfxQ().embers){ o.s.visible = false; o.life = 0; } });
  try { gfxPlaceDebris(); } catch (e) {}
  gfxBtn();
}
function gfxSet(p){ if (GFX_ORDER.indexOf(p) < 0) p = 'auto'; GFX.pref = p; store.set('dt_gfx', p); gfxApply(); }
function gfxBtn(){
  const b = $('btnGfx'); if (!b) return;
  b.textContent = 'Graphismes : ' + (GFX.pref === 'auto' ? 'auto (' + gfxQ().nom + ')' : gfxQ().nom);
}
(function(){
  const res = $('btnResume');
  if (res && res.parentNode && !$('btnGfx')){
    const b = document.createElement('button'); b.className = 'ghost'; b.id = 'btnGfx'; b.type = 'button';
    res.parentNode.insertBefore(b, res);
    b.addEventListener('click', () => gfxSet(GFX_ORDER[(GFX_ORDER.indexOf(GFX.pref) + 1) % GFX_ORDER.length]));
  }
  gfxApply();
})();

/* ---------- Crochets ---------- */
try { const _b = visuals; visuals = function(dt){ const r = _b.apply(this, arguments); try { gfxStep(dt || 0); } catch (e) {} return r; }; } catch (e) {}
try { const _b = buildWorld; buildWorld = function(){ const r = _b.apply(this, arguments); gfxPlacePuddles(); gfxPlaceDebris(); gfxPlaceHalos(); GFX.wet = 0; gfxSmoke.forEach(o => { o.s.visible = false; o.life = 0; }); return r; }; } catch (e) {}
// Explosions : un panache de fumée noire
try { if (typeof rueBoom === 'function'){ const _b = rueBoom; rueBoom = function(x, y, z, size){ const r = _b.apply(this, arguments); if (size >= 10) gfxBoomSmoke(x, y, z, size / 3); return r; }; } } catch (e) {}
try { if (typeof armExplode === 'function'){ const _b = armExplode; armExplode = function(pos, id){ const r = _b.apply(this, arguments); gfxBoomSmoke(pos.x, pos.y, pos.z, wRadius(id) * .8); return r; }; } } catch (e) {}
try { if (typeof pwBoom === 'function'){ const _b = pwBoom; pwBoom = function(x, y, z, size){ const r = _b.apply(this, arguments); gfxBoomSmoke(x, y, z, (size || 6) / 3); return r; }; } } catch (e) {}

// Accès pour les tests automatiques
window.__gfx = { gfxDeb, gfxHalos, gfxEmbers, GFX, GFX_Q, gfxLevel, gfxSet, gfxStep, gfxPuff, gfxClouds, gfxMist, gfxPuddles, gfxShadows, gfxSmoke, gfxPuddleMat };
