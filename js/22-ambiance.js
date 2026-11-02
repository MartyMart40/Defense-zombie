'use strict';
/* ================= Ambiance : météo par vague et musique dynamique ================= */
// La météo s'applique par-dessus les couleurs de la ville (LOCS) et repart à zéro à chaque buildWorld.
// Elle est choisie au début de chaque vague (startWave), selon la ville et un peu au hasard.
// Particules : un seul objet par sorte (LineSegments pour la pluie, Points pour neige et cendres),
// créés une fois et réutilisés (jamais recréés : pas de fuite), moins nombreux sur cell.
// Musique : générée par Snd (01-son.js), état choisi ici à chaque image.

const WEATHERS = {
  clair:      { name:'',                 fogN:1,   fogF:1,   light:1 },
  pluie:      { name:'Pluie',            fogN:.8,  fogF:.82, light:.8,  tint:[0x56606c, .35], sky:.75, sun:.4, rain:1 },
  orage:      { name:'Orage',            fogN:.7,  fogF:.75, light:.62, tint:[0x323a48, .45], sky:.55, sun:.15, rain:1.5, storm:true },
  brouillard: { name:'Brouillard épais', fogN:.3,  fogF:.5,  light:.9,  tint:[0x8a8884, .4],  sky:1,   sun:.3, skyOp:.3 },
  nuit:       { name:'Nuit noire',       fogN:.85, fogF:.85, light:.4,  dark:.42,             sky:.35, sun:.2, night:true },
  neige:      { name:'Neige',            fogN:.8,  fogF:.8,  light:.95, tint:[0xb4c0cc, .3],  sky:.9,  sun:.6, flakes:'neige' },
  cendres:    { name:'Pluie de cendres', fogN:.85, fogF:.85, light:.85, tint:[0x6a4434, .3],  sky:.85, sun:.7, flakes:'cendres' }
};
// Chances par ville (poids relatifs)
const WEATHER_BY_LOC = {
  village:  { clair:3, pluie:3, brouillard:2, orage:1, nuit:1 },
  ville:    { cendres:4, clair:2, pluie:1, orage:1, brouillard:1 },
  banlieue: { nuit:3, pluie:2, orage:2, neige:2, brouillard:1 },
  centre:   { cendres:3, clair:2, orage:2, pluie:1, nuit:1 },
  port:     { brouillard:4, pluie:3, orage:2, clair:1 }
};
const AMB_MIN_FAR = 58;   // le boss apparaît à environ 67 m : on le devine toujours dans le brouillard
const AMB_MIN_NEAR = 6;
const AMB_KEEP = .45;     // chance de garder la météo de la vague précédente

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
function ambFlakeKind(kind){
  if (!ambFlakes || ambFlakes.kind === kind) return;
  ambFlakes.kind = kind; const c = ambFlakes.col;
  for (let i = 0; i < AMB_NFLAKE; i++){
    let r, g, b;
    if (kind === 'neige'){ r = .95; g = .97; b = 1; }
    else if (Math.random() < .08){ r = 1; g = rand(.4, .6); b = .15; } // braises
    else { const v = rand(.35, .55); r = v; g = v * .92; b = v * .88; }
    c[i * 3] = r; c[i * 3 + 1] = g; c[i * 3 + 2] = b;
  }
  ambFlakes.o.geometry.attributes.color.needsUpdate = true;
  ambFlakes.o.material.size = kind === 'neige' ? .22 : .16;
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
      const p = ambFlakes.pos, snow = W.flakes === 'neige', t = time || 0;
      for (let i = 0; i < AMB_NFLAKE; i++){
        const j = i * 3, v = ambFlakes.spd[i];
        p[j + 1] -= (snow ? 1.8 : 1.2) * v * dt;
        p[j] += Math.sin(t * .8 + ambFlakes.ph[i]) * (snow ? .6 : .9) * dt + (snow ? 0 : .5 * dt);
        if (p[j + 1] < AMB_BOX.y0 || p[j] > AMB_BOX.x){
          p[j] = rand(-AMB_BOX.x, AMB_BOX.x); p[j + 1] = AMB_BOX.y1 + rand(0, 2); p[j + 2] = rand(AMB_BOX.z0, AMB_BOX.z1);
        }
      }
      ambFlakes.o.geometry.attributes.position.needsUpdate = true;
    }
  }
}

/* ---------- Base de la ville (lue après buildWorld) ---------- */
function ambCapture(){
  const B = { fog: scene.fog.color.getHex(), bg: scene.background && scene.background.isColor ? scene.background.getHex() : scene.fog.color.getHex(),
    near: scene.fog.near, far: scene.fog.far, hemi:null, sun:null, amb:null, sky:null, spr:null };
  if (world) world.children.forEach(o => {
    if (o.isHemisphereLight) B.hemi = { o, i:o.intensity };
    else if (o.isDirectionalLight) B.sun = { o, i:o.intensity };
    else if (o.isAmbientLight) B.amb = { o, i:o.intensity };
    else if (o.isSprite && !B.spr) B.spr = { o, op:o.material.opacity };
    else if (o.isMesh && o.geometry && o.geometry.type === 'SphereGeometry' && o.material && o.material.side === THREE.BackSide) B.sky = { o };
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
function ambSet(name, quiet){
  if (!WEATHERS[name]) name = 'clair';
  if (!AMB.base) ambCapture();
  const B = AMB.base, W = WEATHERS[name];
  AMB.weather = name; AMB.flash = 0;
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
    m.color.setScalar(W.sky || 1);
    if (m.transparent !== tr){ m.transparent = tr; m.needsUpdate = true; }
    m.opacity = op;
  }
  if (B.spr) B.spr.o.material.opacity = B.spr.op * (W.sun != null ? W.sun : 1);
  // Nuit : les feux éclairent plus, les lampadaires s'allument
  fires.forEach((f, i) => { f.base = (B.fires[i] != null ? B.fires[i] : 2) * (W.night ? 1.7 : W.storm ? 1.2 : 1); });
  AMB.heads.forEach((m, i) => m.color.setHex(W.night ? 0xffd27a : B.heads[i]));
  ambLamps(!!W.night && AMB.heads.length > 0);
  AMB.cur = { fog: ambC1.getHex(), hemi: li.hemi, sky: W.sky || 1 };
  // Particules
  if (W.rain && !ambRain) ambRain = ambMakeRain();
  if (W.flakes){ if (!ambFlakes) ambFlakes = ambMakeFlakes(); ambFlakeKind(W.flakes); }
  ambParticles(0);
  if (!quiet) Snd.rainLevel(W.rain || 0);
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
  if (typeof isBossWave === 'function' && isBossWave(wave) && tbl.orage && Math.random() < .5) return 'orage';
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
  Snd.rainLevel(st === 'off' || state === 'menu' ? 0 : (W.rain || 0) * (state === 'paused' ? .5 : 1));
}
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
  WEATHERS, WEATHER_BY_LOC, AMB_MIN_FAR, AMB,
  get weather(){ return AMB.weather; }, get strikes(){ return AMB.strikes; }, get flash(){ return AMB.flash; },
  set: ambSet, pick: ambPick, strike: ambStrike, frame: ambFrame, musicState: ambMusicState,
  forceNext(w){ AMB.force = w; }, get rain(){ return ambRain; }, get flakes(){ return ambFlakes; }
};
