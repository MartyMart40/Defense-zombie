'use strict';
/* ================= Scène ================= */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference:'high-performance' });
renderer.autoClear = false;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x5e2e1e);
scene.fog = new THREE.Fog(0x5e2e1e, 30, 125);
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 400);
camera.rotation.order = 'YXZ';
const EYE = new THREE.Vector3(0, 10, -3.3);
camera.position.copy(EYE);
scene.add(camera);
let baseFov = 70;

function canvasTex(w, h, draw){ const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); return new THREE.CanvasTexture(cv); }
const glowTex = canvasTex(128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,220,160,1)'); gr.addColorStop(.25, 'rgba(255,150,70,.8)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const lam = c => new THREE.MeshLambertMaterial({ color: c });
let world = null;
function box(w, h, d, mat, x, y, z, parent){ const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); (parent || world).add(m); return m; }
let WALLS = ['#3a302b'], LIT = .06, WIN = '#ffb35a';
function facadeMat(seed, w, h){
  const lit = [];
  const col = canvasTex(128, 256, (g) => {
    g.fillStyle = WALLS[seed % WALLS.length]; g.fillRect(0, 0, 128, 256);
    for (let y = 10; y < 256; y += 32) for (let x = 8; x < 120; x += 30){
      const r = Math.random(); const on = r < LIT;
      g.fillStyle = on ? WIN : (r < LIT + .06 ? '#6a3e24' : '#14100e'); g.fillRect(x, y, 18, 20);
      if (on) lit.push([x, y]);
    }
  });
  const em = canvasTex(128, 256, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 128, 256); g.fillStyle = WIN; lit.forEach(p => g.fillRect(p[0], p[1], 18, 20)); });
  [col, em].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(.5, w / 8), Math.max(.25, h / 16)); });
  return new THREE.MeshLambertMaterial({ map: col, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 0.65 });
}
const fireMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
fireMat.userData.keep = true;
const fires = [];
function makeFire(x, y, z, size){
  const g = new THREE.Group(); g.position.set(x, y, z); world.add(g);
  const cones = [];
  for (let i = 0; i < 4; i++){ const c = new THREE.Mesh(new THREE.ConeGeometry(.5 * size, 1.6 * size, 6), fireMat); c.position.set(rand(-.5, .5) * size, .7 * size, rand(-.5, .5) * size); g.add(c); cones.push(c); }
  const light = new THREE.PointLight(0xff7a2a, 2, 28 * size, 1.6); light.position.y = 1.5 * size; g.add(light);
  fires.push({ cones, light, base: 2 }); return g;
}
function car(x, z, rot, mat, burnt){
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; world.add(g);
  box(2, .8, 4.3, burnt ? lam(0x1a1614) : mat, 0, .7, 0, g); box(1.8, .6, 2.2, burnt ? lam(0x141110) : mat, 0, 1.4, -.2, g);
  const wm = lam(0x111111); [[-1, -1.4], [1, -1.4], [-1, 1.4], [1, 1.4]].forEach(p => box(.3, .6, .6, wm, p[0], .3, p[1], g));
  return g;
}
function roof(x, y, z, w, d, h, col){
  const g = new THREE.Group(); g.position.set(x, y, z); world.add(g);
  const c = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), lam(col)); c.rotation.y = Math.PI / 4; c.position.y = .5; g.add(c);
  g.scale.set(w / Math.SQRT2 * 1.12, h, d / Math.SQRT2 * 1.12);
}
function house(x, z, w, d, h, roofCol, seed){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMat(seed, Math.max(w, d), h)); m.position.set(x, h / 2, z); world.add(m);
  roof(x, h, z, w, d, rand(2, 3.2), roofCol);
}
function tree(x, z, sc){
  box(.35 * sc, 2 * sc, .35 * sc, lam(0x3a2a1c), x, sc, z);
  const c = new THREE.Mesh(new THREE.ConeGeometry(1.7 * sc, 4.5 * sc, 7), lam(0x26331e)); c.position.set(x, 4.2 * sc, z); world.add(c);
}
function disposeWorld(){
  if (!world) return;
  scene.remove(world);
  world.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material){ (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      if (m.userData.keep) return;
      if (m.map && m.map !== glowTex) m.map.dispose(); if (m.emissiveMap) m.emissiveMap.dispose(); m.dispose(); }); }
  });
  world = null;
}
const BAR_Z = -9;
function buildWorld(L){
  disposeWorld(); fires.length = 0;
  world = new THREE.Group(); scene.add(world);
  scene.fog.color.setHex(L.fog); scene.background.setHex(L.fog); scene.fog.near = L.fogNear; scene.fog.far = L.fogFar;
  world.add(new THREE.HemisphereLight(L.hemi[0], L.hemi[1], L.hemi[2]));
  const sun = new THREE.DirectionalLight(L.sunCol, L.sunI); sun.position.set(-30, 25, -120); world.add(sun);
  world.add(new THREE.AmbientLight(L.amb, 0.35));
  // Ciel
  const skyTex = canvasTex(4, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); const st = [0, .35, .47, .5, .53, 1];
    L.sky.forEach((c, i) => gr.addColorStop(st[i], c)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  world.add(new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite:false })));
  const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: L.glow, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  sunSpr.position.set(-60, L.glowY, -280); const gs = L.glowY > 30 ? 40 : 80; sunSpr.scale.set(gs, gs, 1); world.add(sunSpr);
  // Sol, rue, trottoirs
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 300, 40, 50), lam(L.ground));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -120); world.add(ground);
  const lineMat = lam(0x9a7a2a);
  for (let z = -12; z > -170; z -= 7) box(0.25, 0.02, 3, lineMat, 0, 0.01, z);
  const walkMat = lam(L.walk);
  box(6, 0.2, 200, walkMat, -16, 0.1, -100); box(6, 0.2, 200, walkMat, 16, 0.1, -100);
  WALLS = L.walls; LIT = L.lit; WIN = L.win;
  let seed = 0;
  // Bâtiments le long de la rue
  if (L.style === 'houses'){
    [-1, 1].forEach(side => {
      box(60, .1, 200, lam(L.lawn), side * 49, .05, -100);
      for (let z = -8; z > -170; ){
        const w = rand(L.hw[0], L.hw[1]), d = rand(7, 10), h = rand(L.bh[0], L.bh[1]), set = rand(2, 6);
        house(side * (19 + set + w / 2), z - d / 2, w, d, h, pick(L.roofs), seed++);
        if (Math.random() < L.trees) tree(side * rand(18, 19.5), z - d - rand(1, 3), rand(.8, 1.3));
        z -= d + rand(L.gap[0], L.gap[1]);
      }
    });
  } else if (L.style === 'port'){
    [-1, 1].forEach(side => {
      for (let z = -6; z > -175; ){
        const d = rand(18, 26), w = rand(14, 20), h = rand(L.bh[0], L.bh[1]);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMat(seed++, d, h)); m.position.set(side * (21 + w / 2), h / 2, z - d / 2); world.add(m);
        z -= d + rand(2, 5);
      }
      for (let z = -16; z > -150; z -= rand(8, 13)){
        const n = 1 + Math.floor(Math.random() * 3), cm = lam(pick(L.cont));
        for (let k = 0; k < n; k++){ const c = box(2.5, 2.6, 6, cm, side * rand(16.5, 18), 1.3 + k * 2.6, z); c.rotation.y = rand(-.08, .08); }
      }
    });
  } else {
    [-1, 1].forEach(side => {
      for (let z = -6; z > -175; ){
        const d = rand(10, 18), w = rand(10, 16), h = rand(L.bh[0], L.bh[1]);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMat(seed++, d, h)); m.position.set(side * (19 + w / 2), h / 2, z - d / 2); world.add(m);
        z -= d + rand(L.gap[0], L.gap[1]);
      }
    });
  }
  // Fond de la rue
  if (L.end === 'church'){
    const m = new THREE.Mesh(new THREE.BoxGeometry(14, 10, 12), facadeMat(seed++, 14, 10)); m.position.set(0, 5, -182); world.add(m);
    roof(0, 10, -182, 14, 12, 4, 0x3a2a24);
    box(3.5, 14, 3.5, lam(0x857560), 0, 7, -174);
    roof(0, 14, -174, 3.5, 3.5, 7, 0x3a2a24);
  } else if (L.end === 'cranes'){
    const cm = lam(0xa07a1e);
    [-14, 12].forEach((x, i) => {
      const z = -150 - i * 18; box(1.2, 34, 1.2, cm, x - 3, 17, z); box(1.2, 34, 1.2, cm, x + 3, 17, z);
      box(30, 1.6, 1.6, cm, x + (i ? -8 : 8), 34, z); box(.15, 14, .15, lam(0x222222), x + (i ? -18 : 18), 27, z);
    });
    const endB = new THREE.Mesh(new THREE.BoxGeometry(70, 16, 10), facadeMat(seed++, 70, 16)); endB.position.set(0, 8, -185); world.add(endB);
  } else {
    const hh = L.style === 'houses' ? 14 : Math.max(40, L.bh[1]);
    const endB = new THREE.Mesh(new THREE.BoxGeometry(70, hh, 10), facadeMat(seed++, 70, hh)); endB.position.set(0, hh / 2, -180); world.add(endB);
  }
  // Notre immeuble et les voisins
  const ours = new THREE.Mesh(new THREE.BoxGeometry(30, 8.6, 24), facadeMat(3, 30, 8.6)); ours.position.set(0, 4.3, 8.1); world.add(ours);
  [-1, 1].forEach(sd => { const m = new THREE.Mesh(new THREE.BoxGeometry(20, 14, 22), facadeMat(seed++, 20, 14)); m.position.set(sd * 25, 7, 7.2); world.add(m); });
  // Sacs de sable sur le rebord
  const bagMat = lam(0x8b7a55), bagGeo = new THREE.BoxGeometry(0.72, 0.26, 0.4);
  for (let x = -6; x <= 6; x += 0.7){ const b = new THREE.Mesh(bagGeo.clone(), bagMat); b.position.set(x + rand(-.05, .05), 8.74, -3.75); b.rotation.y = rand(-.12, .12); world.add(b); }
  bagGeo.dispose();
  // Lampadaires
  if (L.lamps){
    const poleMat = lam(0x222224), headMat = new THREE.MeshBasicMaterial({ color: L.lampGlow ? 0xffd27a : 0x3a2a1a });
    for (let z = -20; z > -160; z -= 26) [-1, 1].forEach(sd => { box(.2, 7, .2, poleMat, sd * 14, 3.5, z); box(1.6, .15, .3, poleMat, sd * 13.3, 7, z); box(.6, .15, .4, headMat, sd * 12.7, 6.9, z); });
  }
  // Autos abandonnées
  const carMats = [lam(0x5a2a22), lam(0x2d3b4a), lam(0x5c5a50), lam(0x1f2224)];
  car(-10.5, -30, .2, carMats[1]); car(11, -64, -.4, carMats[2]); car(-9, -88, 2.9, carMats[0]);
  // Feux (certains sur des carcasses d'autos)
  L.fires.forEach(f => { if (f[4]) car(f[0], f[2], rand(0, 3), null, true); else box(.7, 1, .7, lam(0x3b2a20), f[0], .5, f[2]); makeFire(f[0], f[1], f[2], f[3]); });
  // Barricade
  const barricade = new THREE.Group(); world.add(barricade);
  const woodMat = lam(0x6b4a2c), wood2 = lam(0x55391f), concMat = lam(0x77736c);
  for (let x = -13; x <= 13; x += 3.2){
    box(.25, 1.6, .25, wood2, x, .8, BAR_Z, barricade);
    const p1 = box(3.6, .28, .1, woodMat, x + 1.6, .9, BAR_Z - .15, barricade); p1.rotation.z = rand(-.35, .35);
    const p2 = box(3.6, .28, .1, woodMat, x + 1.6, .5, BAR_Z - .2, barricade); p2.rotation.z = rand(-.25, .25);
  }
  for (let x = -12; x <= 12; x += 6) box(2.4, .8, .7, concMat, x + rand(-1, 1), .4, BAR_Z + .5, barricade);
  car(-15, BAR_Z, 1.57, carMats[3]); car(15, BAR_Z, -1.5, carMats[0]);
}
