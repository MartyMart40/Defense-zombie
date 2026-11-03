'use strict';
/* ================= Ambiance : météo par vague et musique dynamique ================= */
// La météo s'applique par-dessus les couleurs de la ville (LOCS) et repart à zéro à chaque buildWorld.
// Elle est choisie au début de chaque vague (startWave), selon la ville et un peu au hasard.
// Particules : un seul objet par sorte (LineSegments pour la pluie, Points pour neige et cendres),
// créés une fois et réutilisés (jamais recréés : pas de fuite), moins nombreux sur cell.
// Musique : générée par Snd (01-son.js), état choisi ici à chaque image.

// snd : ambiance sonore (Snd.setAmbience) : vent, oiseaux, grêle, criquets, cigales, grondement (0 à 1)
// skyGrad : ciel propre à la météo (dégradé) ; skyRGB : teinte du ciel (multiplie la texture) ; hemiCol : couleur de la lumière d'ambiance ; sunCol : couleur du soleil ; sunSize : taille du halo du soleil
const WEATHERS = {
  clair:      { name:'',                 fogN:1,   fogF:1,   light:1,   snd:{ birds:.35, wind:.1 } },
  soleil:     { name:'Grand soleil',     fogN:1.1, fogF:1.1, light:1.3, tint:[0xa8bcd0, .7],  skyGrad:['#2a64b8','#4a8ad8','#8ab8ec','#cfe2f4','#a8b8a0','#6a7058'], hemiCol:0xfff4e0, sun:1, sunSize:1.3, sunCol:0xfff0d0, snd:{ birds:1, wind:.12 } },
  canicule:   { name:'Canicule',         fogN:.9,  fogF:.95, light:1.25,tint:[0xd8b080, .65], skyGrad:['#4a80c0','#7aa8d8','#c8d8d8','#f4e0b0','#c8a070','#806040'], hemiCol:0xffe0a0, sun:1, sunSize:1.6, sunCol:0xffc070, heat:true, snd:{ cicadas:1, wind:.06 } },
  coucher:    { name:'Coucher de soleil',fogN:1,   fogF:1,   light:.85, tint:[0xd8603a, .45], skyGrad:['#1a1a48','#5a3a78','#d0587a','#ffa050','#8a4030','#3a1a14'], hemiCol:0xffa070, sun:1, sunSize:1.8, sunCol:0xff7a3a, snd:{ birds:.35, wind:.2 } },
  aube:       { name:'Aube',             fogN:.6,  fogF:.85, light:.75, tint:[0xc0a8c0, .55], skyGrad:['#2a3a6a','#6a7aa8','#d8a8b8','#ffd0b0','#8a7a80','#4a4450'], hemiCol:0xffd8d0, sun:.9, sunSize:1.2, sunCol:0xffc0a0, snd:{ birds:.8, wind:.1 } },
  vent:       { name:'Vent fort',        fogN:1,   fogF:1,   light:1,   tint:[0x9a9080, .2],  flakes:'feuilles', snd:{ wind:1 } },
  pluie:      { name:'Pluie',            fogN:.8,  fogF:.82, light:.8,  tint:[0x56606c, .35], sky:.75, sun:.4, rain:1, snd:{ wind:.15 } },
  orage:      { name:'Orage',            fogN:.7,  fogF:.75, light:.62, tint:[0x323a48, .45], sky:.55, sun:.15, rain:1.5, storm:true, snd:{ wind:.5, rumble:.3 } },
  grele:      { name:'Grêle',            fogN:.75, fogF:.8,  light:.7,  tint:[0x7a8290, .4],  sky:.7, sun:.2, rain:.35, flakes:'grele', snd:{ hail:1, wind:.4 } },
  brouillard: { name:'Brouillard épais', fogN:.3,  fogF:.5,  light:.9,  tint:[0x8a8884, .4],  sky:1,   sun:.3, skyOp:.3, snd:{ wind:.05 } },
  poussiere:  { name:'Tempête de poussière', fogN:.4, fogF:.55, light:.8, tint:[0xb08850, .6], sky:.9, skyRGB:[1.3, 1, .7], sun:.4, flakes:'poussiere', snd:{ wind:1, rumble:.3 } },
  nuit:       { name:'Nuit noire',       fogN:.85, fogF:.85, light:.4,  dark:.42,             sky:.35, sun:.2, night:true, snd:{ crickets:.4 } },
  nuitClaire: { name:'Nuit claire',      fogN:.9,  fogF:.95, light:.55, dark:.6, tint:[0x2a3a68, .55], skyGrad:['#02040e','#06102a','#122650','#2a3e6a','#141c30','#080a14'], hemiCol:0x8aa0e0, sun:0, moon:true, night:true, snd:{ crickets:1 } },
  neige:      { name:'Neige',            fogN:.8,  fogF:.8,  light:.95, tint:[0xb4c0cc, .3],  sky:.9,  sun:.6, flakes:'neige', snd:{ wind:.25 } },
  cendres:    { name:'Pluie de cendres', fogN:.85, fogF:.85, light:.85, tint:[0x6a4434, .3],  sky:.85, sun:.7, flakes:'cendres', snd:{ wind:.2 } },
  tornade:    { name:'Tornade au loin',  fogN:.85, fogF:.9,  light:.6,  tint:[0x5a6a58, .45], sky:.6,  sun:.1, tornado:true, flakes:'feuilles', snd:{ wind:.9, rumble:1 } }
};
// Météos de beau temps (pour l'équilibre des tirages)
const AMB_NICE = ['clair', 'soleil', 'canicule', 'coucher', 'aube', 'nuitClaire', 'vent'];
// Chances par ville (poids relatifs) : le beau temps domine partout, pluie et orage sont rares, la tornade très rare
const WEATHER_BY_LOC = {
  village:  { soleil:4, clair:3, coucher:2, aube:2, nuitClaire:1.5, vent:1.5, canicule:1, brouillard:1, pluie:1, orage:.5, grele:.5, nuit:.5, tornade:.3 },
  ville:    { soleil:3, clair:2, canicule:2, coucher:2, cendres:2, poussiere:1.5, vent:1, nuitClaire:1, aube:1, pluie:.7, orage:.4, grele:.4, tornade:.3 },
  banlieue: { nuitClaire:3, clair:2, soleil:2, aube:2, coucher:1.5, nuit:1.5, vent:1, neige:1, brouillard:.8, pluie:.6, grele:.5, orage:.4, tornade:.2 },
  centre:   { soleil:3, canicule:2.5, clair:2, coucher:2, cendres:1.5, poussiere:1.5, vent:1, nuitClaire:1, aube:1, pluie:.6, orage:.5, tornade:.3 },
  port:     { soleil:2.5, clair:2, vent:2, aube:1.5, coucher:1.5, brouillard:1.5, nuitClaire:1, pluie:.8, orage:.5, grele:.4, tornade:.4 }
};
const AMB_MIN_FAR = 58;   // le boss apparaît à environ 67 m : on le devine toujours dans le brouillard
const AMB_MIN_NEAR = 6;
const AMB_KEEP = .15;     // chance de garder la météo de la vague précédente

const AMB = { weather:'clair', strikes:0, flash:0, stormT:8, force:null, base:null, cur:null, lamps:[], heads:[], mi:0, miT:0 };

/* ---------- Particules (créées une fois) ---------- */
const AMB_NRAIN = isTouch ? 260 : 700, AMB_NFLAKE = isTouch ? 220 : 600;
const AMB_BOX = { x:24, y0:0, y1:24, z0:-72, z1:2 };
let ambRain = null, ambFlakes = null;
function ambMakeRain(){
  const pos = new Float32Array(AMB_NRAIN * 6), spd = new Float32Array(AMB_NRAIN);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineBasicMaterial({ color:0xa8b8cc, transparent:true, opacity:.38, depthWrite:false });
  const o = new THREE.LineSegments(g, m); o.frustumCulled = false; o.visible = false; scene.add(o);
  for (let i = 0; i < AMB_NRAIN; i++){ spd[i] = rand(22, 30); ambDrop(pos, i, rand(AMB_BOX.y0, AMB_BOX.y1)); }
  return { o, pos, spd };
}
function ambDrop(pos, i, y){
  const x = rand(-AMB_BOX.x, AMB_BOX.x), z = rand(AMB_BOX.z0, AMB_BOX.z1), j = i * 6;
  pos[j] = x; pos[j + 1] = y; pos[j + 2] = z; pos[j + 3] = x + .12; pos[j + 4] = y + .9; pos[j + 5] = z;
}
const ambDotTex = canvasTex(32, 32, (g) => {
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
});
function ambMakeFlakes(){
  const pos = new Float32Array(AMB_NFLAKE * 3), col = new Float32Array(AMB_NFLAKE * 3), spd = new Float32Array(AMB_NFLAKE), ph = new Float32Array(AMB_NFLAKE);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size:.22, map:ambDotTex, vertexColors:true, transparent:true, depthWrite:false, opacity:.9 });
  const o = new THREE.Points(g, m); o.frustumCulled = false; o.visible = false; scene.add(o);
  for (let i = 0; i < AMB_NFLAKE; i++){
    pos[i * 3] = rand(-AMB_BOX.x, AMB_BOX.x); pos[i * 3 + 1] = rand(AMB_BOX.y0, AMB_BOX.y1); pos[i * 3 + 2] = rand(AMB_BOX.z0, AMB_BOX.z1);
    spd[i] = rand(.7, 1.3); ph[i] = rand(0, 6.28);
  }
  return { o, pos, col, spd, ph, kind:'' };
}
// Sortes de particules : chute (m/s), balancement, poussée vers la droite (m/s), taille, couleurs
const AMB_FLK = {
  neige:     { fall:1.8, sway:.6,  drift:0,  size:.22 },
  cendres:   { fall:1.2, sway:.9,  drift:.5, size:.16 },
  feuilles:  { fall:1.6, sway:1.6, drift:9,  size:.3 },
  grele:     { fall:15,  sway:0,   drift:.6, size:.13 },
  poussiere: { fall:.25, sway:.7,  drift:13, size:.38 }
};
function ambFlakeKind(kind){
  if (!ambFlakes || ambFlakes.kind === kind) return;
  ambFlakes.kind = kind; const c = ambFlakes.col;
  for (let i = 0; i < AMB_NFLAKE; i++){
    let r, g, b;
    if (kind === 'neige'){ r = .95; g = .97; b = 1; }
    else if (kind === 'grele'){ const v = rand(.85, 1); r = v; g = v; b = 1; }
    else if (kind === 'feuilles'){ const p = Math.random(); if (p < .35){ r = rand(.5, .7); g = rand(.3, .45); b = .12; } else if (p < .65){ r = rand(.75, .9); g = rand(.45, .6); b = .1; } else if (p < .85){ r = .35; g = rand(.45, .6); b = .15; } else { const v = rand(.45, .6); r = v; g = v * .9; b = v * .8; } }
    else if (kind === 'poussiere'){ const v = rand(.55, .8); r = v; g = v * .8; b = v * .55; }
    else if (Math.random() < .08){ r = 1; g = rand(.4, .6); b = .15; } // braises
    else { const v = rand(.35, .55); r = v; g = v * .92; b = v * .88; }
    c[i * 3] = r; c[i * 3 + 1] = g; c[i * 3 + 2] = b;
  }
  ambFlakes.o.geometry.attributes.color.needsUpdate = true;
  ambFlakes.o.material.size = (AMB_FLK[kind] || AMB_FLK.cendres).size;
  ambFlakes.o.material.opacity = kind === 'poussiere' ? .55 : .9;
}
function ambParticles(dt){
  const W = WEATHERS[AMB.weather] || WEATHERS.clair;
  if (ambRain){
    ambRain.o.visible = !!W.rain;
    if (W.rain){
      const p = ambRain.pos, k = W.storm ? 1.25 : 1;
      for (let i = 0; i < AMB_NRAIN; i++){
        const j = i * 6, d = ambRain.spd[i] * k * dt;
        p[j + 1] -= d; p[j + 4] -= d; p[j] -= d * .12; p[j + 3] -= d * .12;
        if (p[j + 1] < AMB_BOX.y0) ambDrop(p, i, AMB_BOX.y1 + rand(0, 3));
      }
      ambRain.o.geometry.attributes.position.needsUpdate = true;
    }
  }
  if (ambFlakes){
    ambFlakes.o.visible = !!W.flakes;
    if (W.flakes){
      const p = ambFlakes.pos, F = AMB_FLK[W.flakes] || AMB_FLK.cendres, t = time || 0, side = F.drift > 3;
      for (let i = 0; i < AMB_NFLAKE; i++){
        const j = i * 3, v = ambFlakes.spd[i];
        p[j + 1] -= F.fall * v * dt + (side ? Math.sin(t * 2 + ambFlakes.ph[i]) * .8 * dt : 0);
        p[j] += Math.sin(t * .8 + ambFlakes.ph[i]) * F.sway * dt + F.drift * v * dt;
        if (p[j + 1] < AMB_BOX.y0 || p[j] > AMB_BOX.x){
          // Poussée de côté (vent, poussière) : elles reviennent par la gauche, à toute hauteur
          if (side){ p[j] = -AMB_BOX.x - rand(0, 4); p[j + 1] = rand(AMB_BOX.y0 + .2, W.flakes === 'poussiere' ? 10 : AMB_BOX.y1); }
          else { p[j] = rand(-AMB_BOX.x, AMB_BOX.x); p[j + 1] = AMB_BOX.y1 + rand(0, 2); }
          p[j + 2] = rand(AMB_BOX.z0, AMB_BOX.z1);
        }
      }
      ambFlakes.o.geometry.attributes.position.needsUpdate = true;
    }
  }
  ambExtrasStep(dt, W);
}

/* ---------- Décors de météo (créés une fois, au premier besoin) ---------- */
// Chaleur qui ondule : quelques bandes floues au ras de la rue, qui tremblent. Lune et étoiles. Tornade lointaine.
const AMB_X = { heat:null, sky:null, tornado:null };
const ambHeatTex = canvasTex(64, 16, (g, w, h) => {
  for (let y = 0; y < h; y++){
    const a = Math.sin(y / h * Math.PI) * .5;
    for (let x = 0; x < w; x += 4){ g.fillStyle = 'rgba(255,240,210,' + (a * (.4 + .6 * Math.abs(Math.sin(x * .3 + y * .9)))).toFixed(3) + ')'; g.fillRect(x, y, 4, 1); }
  }
});
ambHeatTex.wrapS = THREE.RepeatWrapping;
function ambMakeHeat(){
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  const mat = new THREE.SpriteMaterial({ map:ambHeatTex, transparent:true, opacity:.12, depthWrite:false });
  const list = [];
  for (let i = 0; i < (isTouch ? 6 : 10); i++){
    const s = new THREE.Sprite(mat); const z = -22 - i * 5.5; s.position.set(rand(-6, 6), .7, z); s.scale.set(16, 1.4, 1);
    s.userData.ph = rand(0, 6.28); g.add(s); list.push(s);
  }
  return { g, list, mat };
}
function ambMakeSky(){
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  const moonTex = canvasTex(64, 64, (c) => {
    const gr = c.createRadialGradient(28, 28, 2, 32, 32, 30); gr.addColorStop(0, '#fbfbf0'); gr.addColorStop(.85, '#d8dccc'); gr.addColorStop(1, 'rgba(216,220,204,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(32, 32, 30, 0, 6.29); c.fill();
    c.fillStyle = 'rgba(150,155,140,.35)'; [[22, 24, 6], [38, 36, 8], [30, 44, 4]].forEach(a => { c.beginPath(); c.arc(a[0], a[1], a[2], 0, 6.29); c.fill(); });
  });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0x9ab4ff, blending:THREE.AdditiveBlending, depthWrite:false, transparent:true, opacity:.55, fog:false }));
  halo.position.set(55, 75, -250); halo.scale.set(60, 60, 1); g.add(halo);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map:moonTex, depthWrite:false, transparent:true, fog:false }));
  moon.position.set(55, 75, -249); moon.scale.set(14, 14, 1); g.add(moon);
  const n = isTouch ? 90 : 180, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++){
    const a = rand(-1.4, 1.4) - Math.PI / 2, e = rand(.18, 1.25), r = 270;
    pos[i * 3] = Math.cos(a) * Math.cos(e) * r; pos[i * 3 + 1] = Math.sin(e) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size:1.7, map:ambDotTex, color:0xdfe6ff, transparent:true, depthWrite:false, fog:false }));
  stars.frustumCulled = false; g.add(stars);
  return { g, stars };
}
function ambMakeTornado(){
  const g = new THREE.Group(); g.visible = false; g.position.set(-75, 0, -200); scene.add(g);
  const m1 = new THREE.MeshBasicMaterial({ color:0x3c4038, transparent:true, opacity:.55, depthWrite:false, fog:false, side:THREE.DoubleSide });
  const m2 = new THREE.MeshBasicMaterial({ color:0x5a5e52, transparent:true, opacity:.25, depthWrite:false, fog:false, side:THREE.DoubleSide });
  const a = new THREE.Mesh(new THREE.CylinderGeometry(15, 1.6, 70, 14, 4, true), m1); a.position.y = 35; g.add(a);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(19, 3.5, 66, 12, 4, true), m2); b.position.y = 34; g.add(b);
  const dust = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0x6a6050, transparent:true, opacity:.6, depthWrite:false, fog:false }));
  dust.position.y = 4; dust.scale.set(34, 14, 1); g.add(dust);
  return { g, a, b, dust, t:0 };
}
function ambExtrasSet(W){
  if (W.heat && !AMB_X.heat) AMB_X.heat = ambMakeHeat();
  if (W.moon && !AMB_X.sky) AMB_X.sky = ambMakeSky();
  if (W.tornado && !AMB_X.tornado) AMB_X.tornado = ambMakeTornado();
  if (AMB_X.heat) AMB_X.heat.g.visible = !!W.heat;
  if (AMB_X.sky) AMB_X.sky.g.visible = !!W.moon;
  if (AMB_X.tornado){ AMB_X.tornado.g.visible = !!W.tornado; if (W.tornado) AMB_X.tornado.g.position.x = Math.random() < .5 ? -75 : 75; }
}
function ambExtrasStep(dt, W){
  const t = time || 0;
  const H = AMB_X.heat;
  if (H && H.g.visible){
    ambHeatTex.offset.x = (ambHeatTex.offset.x + dt * .35) % 1;
    for (const s of H.list){ const ph = s.userData.ph; s.position.y = .6 + Math.sin(t * 2.3 + ph) * .12; s.scale.y = 1.2 + Math.sin(t * 3.1 + ph) * .35; }
    H.mat.opacity = .12 + Math.sin(t * 1.7) * .04;
  }
  const T = AMB_X.tornado;
  if (T && T.g.visible){
    T.t += dt; T.a.rotation.y += dt * 2.2; T.b.rotation.y -= dt * 1.4;
    T.a.rotation.z = Math.sin(T.t * .5) * .06; T.b.rotation.z = Math.sin(T.t * .5 + .6) * .08;
    T.g.position.x += Math.sin(T.t * .13) * dt * 1.5;
    T.dust.material.opacity = .45 + Math.sin(T.t * 1.9) * .15;
  }
}

/* ---------- Base de la ville (lue après buildWorld) ---------- */
function ambCapture(){
  const B = { fog: scene.fog.color.getHex(), bg: scene.background && scene.background.isColor ? scene.background.getHex() : scene.fog.color.getHex(),
    near: scene.fog.near, far: scene.fog.far, hemi:null, sun:null, amb:null, sky:null, spr:null };
  if (world) world.children.forEach(o => {
    if (o.isHemisphereLight) B.hemi = { o, i:o.intensity, c:o.color.getHex() };
    else if (o.isDirectionalLight) B.sun = { o, i:o.intensity, c:o.color.getHex() };
    else if (o.isAmbientLight) B.amb = { o, i:o.intensity };
    else if (o.isSprite && !B.spr) B.spr = { o, op:o.material.opacity, sc:o.scale.x };
    else if (o.isMesh && o.geometry && o.geometry.type === 'SphereGeometry' && o.material && o.material.side === THREE.BackSide) B.sky = { o, map:o.material.map };
  });
  // Têtes de lampadaires (mêmes positions que dans buildWorld)
  AMB.heads = [];
  if (world) world.children.forEach(o => {
    if (o.isMesh && o.material && o.material.isMeshBasicMaterial && Math.abs(o.position.y - 6.9) < .01 && Math.abs(Math.abs(o.position.x) - 12.7) < .01){
      if (AMB.heads.indexOf(o.material) < 0) AMB.heads.push(o.material);
    }
  });
  B.heads = AMB.heads.map(m => m.color.getHex());
  B.fires = fires.map(f => f.base);
  AMB.base = B; AMB.lamps = [];
}
const ambC1 = new THREE.Color(), ambC2 = new THREE.Color();
// Ciels propres à une météo (dégradé, mêmes arrêts que le ciel des villes) : créés une fois, gardés en cache
const ambSkyTex = {};
function ambSkyMap(name, grad){
  if (!ambSkyTex[name]) ambSkyTex[name] = canvasTex(4, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h), st = [0, .35, .47, .5, .53, 1];
    grad.forEach((c, i) => gr.addColorStop(st[i], c)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  return ambSkyTex[name];
}
function ambSet(name, quiet){
  if (!WEATHERS[name]) name = 'clair';
  if (!AMB.base) ambCapture();
  const B = AMB.base, W = WEATHERS[name];
  AMB.weather = name; AMB.flash = 0; AMB.flash2 = 0; AMB.flashOn = false;
  AMB.stormT = rand(3, 7);
  // Brouillard : plus proche, sans descendre sous un minimum jouable
  const far = Math.max(Math.min(B.far, AMB_MIN_FAR), B.far * W.fogF);
  const near = clamp(B.near * W.fogN, Math.min(B.near, AMB_MIN_NEAR), far - 20);
  scene.fog.near = near; scene.fog.far = far;
  ambC1.setHex(B.fog); if (W.tint) ambC1.lerp(ambC2.setHex(W.tint[0]), W.tint[1]); if (W.dark) ambC1.multiplyScalar(W.dark);
  scene.fog.color.copy(ambC1); if (scene.background && scene.background.isColor) scene.background.copy(ambC1);
  // Lumières
  const li = { hemi: B.hemi ? B.hemi.i * W.light : 0, sun: B.sun ? B.sun.i * W.light : 0, amb: B.amb ? B.amb.i * W.light : 0 };
  if (B.hemi) B.hemi.o.intensity = li.hemi; if (B.sun) B.sun.o.intensity = li.sun; if (B.amb) B.amb.o.intensity = li.amb;
  if (B.sky){
    const m = B.sky.o.material, op = W.skyOp || 1, tr = op < 1;
    const k = W.sky || 1, R = W.skyRGB;
    if (R) m.color.setRGB(R[0] * k, R[1] * k, R[2] * k); else m.color.setScalar(k);
    const map = W.skyGrad ? ambSkyMap(name, W.skyGrad) : B.sky.map;
    if (m.map !== map){ m.map = map; m.needsUpdate = true; }
    if (m.transparent !== tr){ m.transparent = tr; m.needsUpdate = true; }
    m.opacity = op;
  }
  if (B.spr){ B.spr.o.material.opacity = B.spr.op * (W.sun != null ? W.sun : 1); const sc = B.spr.sc * (W.sunSize || 1); B.spr.o.scale.set(sc, sc, 1); }
  if (B.hemi){ B.hemi.o.color.setHex(B.hemi.c); if (W.hemiCol) B.hemi.o.color.lerp(ambC2.setHex(W.hemiCol), .6); }
  if (B.sun){ B.sun.o.color.setHex(B.sun.c); if (W.sunCol) B.sun.o.color.lerp(ambC2.setHex(W.sunCol), .6); }
  // Nuit : les feux éclairent plus, les lampadaires s'allument
  fires.forEach((f, i) => { f.base = (B.fires[i] != null ? B.fires[i] : 2) * (W.night ? 1.7 : W.storm ? 1.2 : 1); });
  AMB.heads.forEach((m, i) => m.color.setHex(W.night ? 0xffd27a : B.heads[i]));
  ambLamps(!!W.night && AMB.heads.length > 0);
  AMB.cur = { fog: ambC1.getHex(), hemi: li.hemi, sky: W.sky || 1 };
  ambExtrasSet(W);
  // Particules
  if (W.rain && !ambRain) ambRain = ambMakeRain();
  if (W.flakes){ if (!ambFlakes) ambFlakes = ambMakeFlakes(); ambFlakeKind(W.flakes); }
  ambParticles(0);
  if (!quiet){ Snd.setAmbience(W.snd); Snd.rainLevel(W.rain || 0); }
  return name;
}
function ambLamps(on){
  if (!on){ AMB.lamps.forEach(l => { if (l.parent) l.parent.remove(l); }); AMB.lamps = []; return; }
  if (AMB.lamps.length || !world) return;
  const zs = isTouch ? [-20] : [-20, -46];
  zs.forEach(z => [-1, 1].forEach(sd => {
    const l = new THREE.PointLight(0xffc870, 1.6, 24, 1.6); l.position.set(sd * 12.7, 6.5, z); world.add(l); AMB.lamps.push(l);
  }));
}
function ambReset(){ AMB.base = null; AMB.lamps = []; ambCapture(); ambSet('clair'); }
function ambPick(L, wave){
  if (AMB.force && WEATHERS[AMB.force]){ const f = AMB.force; AMB.force = null; return f; }
  const tbl = WEATHER_BY_LOC[L && L.id] || { clair:1 };
  if (wave > 1 && tbl[AMB.weather] && Math.random() < AMB_KEEP) return AMB.weather;
  // Vague de boss : l'orage a plus de chances quand la ville en a
  if (typeof isBossWave === 'function' && isBossWave(wave) && tbl.orage && Math.random() < .2) return 'orage';
  let sum = 0; Object.keys(tbl).forEach(k => sum += tbl[k]);
  let r = Math.random() * sum;
  for (const k of Object.keys(tbl)){ r -= tbl[k]; if (r <= 0) return k; }
  return 'clair';
}

/* ---------- Éclairs ---------- */
function ambStrike(){
  AMB.strikes++; AMB.flash = 1; AMB.flash2 = Math.random() < .6 ? rand(.12, .25) : 0;
  const near = Math.random() < .35;
  Snd.thunder(near ? rand(.1, .4) : rand(.6, 1.8), near ? 1.2 : rand(.6, 1));
  shake = Math.max(shake, near ? .25 : .08);
}
function ambLightning(dt){
  const W = WEATHERS[AMB.weather];
  if (W && W.storm && state === 'playing'){
    AMB.stormT -= dt;
    if (AMB.stormT <= 0){ ambStrike(); AMB.stormT = rand(5, 13); }
  }
  if (AMB.flash2 > 0){ AMB.flash2 -= dt; if (AMB.flash2 <= 0) AMB.flash = Math.max(AMB.flash, .8); }
  if (AMB.flash <= 0 && !AMB.flashOn) return;
  const B = AMB.base, C = AMB.cur; if (!B || !C) return;
  const f = Math.max(0, AMB.flash), k = f * f;
  if (B.hemi) B.hemi.o.intensity = C.hemi + 2.6 * k;
  ambC1.setHex(C.fog).lerp(ambC2.setHex(0xc8d4ff), .55 * k);
  scene.fog.color.copy(ambC1); if (scene.background && scene.background.isColor) scene.background.copy(ambC1);
  if (B.sky) B.sky.o.material.color.setScalar(C.sky + 1.8 * k);
  AMB.flashOn = f > 0;
  AMB.flash = f - dt * 4.5;
}

/* ---------- Musique : état et intensité ---------- */
function ambBossAlive(){
  if (typeof liveBoss === 'function') return !!liveBoss();
  return zombies.some(z => z.type === 'boss' && !z.dead);
}
function ambMusicState(){
  if (state === 'playing' || state === 'paused') return ambBossAlive() ? 'boss' : 'wave';
  if (state === 'menu' || state === 'shop' || state === 'over') return 'menu';
  return 'off';
}
function ambMusic(dt){
  const st = ambMusicState();
  Snd.setMusic(st);
  Snd.setMusicDuck(state === 'paused' ? .45 : 1);
  if (st === 'wave' && S){
    AMB.miT -= dt;
    if (AMB.miT <= 0){
      AMB.miT = .25;
      let near = 0; for (const z of zombies) if (!z.dead && z.g.position.z > BAR_Z - 22) near++;
      const pct = S.barMax > 0 ? clamp(S.bar / S.barMax, 0, 1) : 1;
      AMB.miTarget = Math.max(clamp(near / (isTouch ? 8 : 10), 0, 1), clamp((.55 - pct) / .4, 0, 1));
    }
    AMB.mi += ((AMB.miTarget || 0) - AMB.mi) * Math.min(1, dt * .8);
  } else AMB.mi += (0 - AMB.mi) * Math.min(1, dt * .8);
  Snd.setMusicIntensity(AMB.mi);
  Snd.musTick();
  // Pluie : son seulement quand la scène est visible en jeu ou en boutique
  const W = WEATHERS[AMB.weather] || WEATHERS.clair;
  const vol = st === 'off' || state === 'menu' ? 0 : state === 'paused' ? .5 : 1;
  ambSndLvl.wind = ambSndLvl.birds = ambSndLvl.hail = ambSndLvl.crickets = ambSndLvl.cicadas = ambSndLvl.rumble = 0;
  if (vol > 0 && W.snd) Object.keys(W.snd).forEach(k => { ambSndLvl[k] = W.snd[k] * vol; });
  Snd.setAmbience(ambSndLvl);
  Snd.rainLevel((W.rain || 0) * vol);
}
const ambSndLvl = { wind:0, birds:0, hail:0, crickets:0, cicadas:0, rumble:0 };
function ambFrame(dt){
  try { ambParticles(dt); ambLightning(dt); ambMusic(dt); } catch (e) {}
}

/* ---------- Réglage « Musique » dans l'écran Pause ---------- */
function ambMusicUI(){
  const pause = $('scrPause'); if (!pause || $('musVol')) return;
  const panel = pause.querySelector ? pause.querySelector('.panel') || pause : pause;
  const lab = document.createElement('label'); lab.className = 'set'; lab.htmlFor = 'musVol'; lab.setAttribute('for', 'musVol');
  lab.innerHTML = 'Musique : <span id="musVolVal"></span>';
  const inp = document.createElement('input'); inp.type = 'range'; inp.id = 'musVol'; inp.min = '0'; inp.max = '1'; inp.step = '0.05';
  inp.value = String(Snd.musVol);
  const before = $('btnSound');
  if (before && before.parentNode === panel && panel.insertBefore){ panel.insertBefore(lab, before); panel.insertBefore(inp, before); }
  else { panel.appendChild(lab); panel.appendChild(inp); }
  const sync = () => { const v = $('musVolVal'); if (v) v.textContent = Snd.musVol > 0 ? Math.round(Snd.musVol * 100) + ' %' : 'coupée'; };
  inp.addEventListener('input', e => { Snd.setMusicVol(parseFloat(e.target.value)); sync(); });
  sync();
}

/* ---------- Crochets ---------- */
try {
  const _bwAmb = buildWorld;
  buildWorld = function(){ const r = _bwAmb.apply(this, arguments); try { ambReset(); } catch (e) {} return r; };
} catch (e) {}
try {
  const _swAmb = startWave;
  startWave = function(){
    const r = _swAmb.apply(this, arguments);
    try {
      const w = ambSet(ambPick(curLoc, S ? S.wave : 1)), nm = WEATHERS[w].name;
      if (nm){ const el = $('bSub'); if (el){ const t = String(el.textContent || '').trim(); el.textContent = t ? t + ' · ' + nm : nm; } }
    } catch (e) {}
    return r;
  };
} catch (e) {}
try {
  const _gmAmb = goMap;
  goMap = function(){ const r = _gmAmb.apply(this, arguments); try { ambSet('clair'); } catch (e) {} return r; };
} catch (e) {}
try {
  const _vicAmb = victory;
  victory = function(){ const r = _vicAmb.apply(this, arguments); try { Snd.musFanfare(); } catch (e) {} return r; };
} catch (e) {}
try {
  const _goAmb = gameOver;
  gameOver = function(){ const r = _goAmb.apply(this, arguments); try { Snd.musDefeat(); } catch (e) {} return r; };
} catch (e) {}
try {
  const _visAmb = visuals;
  visuals = function(dt){ const r = _visAmb.apply(this, arguments); ambFrame(dt); return r; };
} catch (e) {}
try { ambReset(); } catch (e) {}
try { ambMusicUI(); } catch (e) {}

// Accès pour les tests automatiques
window.__amb = {
  WEATHERS, WEATHER_BY_LOC, AMB_MIN_FAR, AMB, AMB_KEEP, AMB_NICE, AMB_FLK, AMB_X,
  get weather(){ return AMB.weather; }, get strikes(){ return AMB.strikes; }, get flash(){ return AMB.flash; },
  set: ambSet, pick: ambPick, strike: ambStrike, frame: ambFrame, musicState: ambMusicState,
  forceNext(w){ AMB.force = w; }, get rain(){ return ambRain; }, get flakes(){ return ambFlakes; }
};
