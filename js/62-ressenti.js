'use strict';
/* ================= Ressenti du tir sur le toit (tâche 94) ================= */
// Quatre volets, sur le toit seulement (state === 'playing' et aucun mode Jeu actif) :
//   1. Recul : coup de caméra dosé par arme (montée, roulis, écart), retour par ressort amorti ; recul de l'arme en main
//      (kick de 15-boucle) et éclair de bouche dosés par arme, roulis de l'arme.
//   2. Impact : gerbe de sang dans le sens du tir et brume sur un zombie, poussière ou étincelles sur le sol et les façades
//      quand la balle ne touche rien, marqueur au réticule (normal, tête en or, tué en croix rouge) ; très court gel de
//      l'image des zombies sur un gros coup.
//   3. Réaction : sursaut du zombie touché (torse et tête vers l'arrière, petit tour), mort poussée dans le sens du tir
//      (plus forte au fusil à pompe, au sniper, aux explosions).
//   4. Son : « toc » net pour la tête, petit coup sec pour le tué, poids grave des grosses armes, impacts espacés (minigun).
// Tout est seulement visuel ou sonore : dégâts, cadence, dispersion, vitesse et vie des zombies ne changent pas.
//   - La caméra est décalée seulement pour l'image : le décalage est retiré avant update() et avant fire() (rsRestore),
//     les balles partent donc exactement comme avant.
//   - Le sursaut et la mort poussée changent la pose des zombies seulement pendant la copie des instances (zInstSync) ;
//     la pose est remise tout de suite après (zombies par instances) ou avant le prochain update()/fire() (boss).
//   - Aucun appel à Math.random (le simulateur le fixe) : petit hasard propre (rsR).
//   - Aucune allocation par tir : pools créés une fois (éclats, gouttes, sursauts).
// Crochets : enveloppes de fire, damage, update, zInstSync, armExplode, pwBlast et Snd.hit (aucune de visuals, kill ou
// ambMusicState) ; l'image passe par Jeu.on('image').
// Réglage de l'écran Pause : « Secousses » (dt_secousses, activé par défaut) coupe le coup de caméra et le gel.

/* ---------- Réglages par arme (à doser) ---------- */
// cam : montée de la caméra (radians) ; roul : roulis (radians) ; lat : écart de côté (radians) ; ret : vitesse du retour
// (plus haut = plus vite) ; vm : recul de l'arme en main (kick de 15-boucle, 1 = l'ancien recul) ; vmRoul : roulis de l'arme ;
// eclair : taille de l'éclair de bouche (×) ; lum : lumière de bouche (×) ; sursaut : force du sursaut du zombie (0 à 1) ;
// pousse : poussée du corps à la mort (mètres) ; gel : gel de l'image sur un gros coup (secondes) ; poids : couche grave du son.
const RS_ARME = {
  pistol:  { cam:.007,  roul:.006, lat:.002,  ret:24, vm:.75, vmRoul:.05, eclair:1,    lum:1,   sursaut:.45, pousse:.35, gel:0,   poids:0 },
  shotgun: { cam:.024,  roul:.02,  lat:.004,  ret:15, vm:1.35, vmRoul:.12, eclair:1.3, lum:1.5, sursaut:.9,  pousse:1.3, gel:.045, poids:.3 },
  rifle:   { cam:.0045, roul:.004, lat:.0025, ret:26, vm:.5,  vmRoul:.04, eclair:.9,   lum:.9,  sursaut:.35, pousse:.3,  gel:0,   poids:0 },
  sniper:  { cam:.032,  roul:.016, lat:.003,  ret:12, vm:1.6, vmRoul:.1,  eclair:1.35, lum:1.6, sursaut:1,   pousse:1.5, gel:.06, poids:.35 },
  crossbow:{ cam:.008,  roul:.006, lat:.001,  ret:18, vm:.8,  vmRoul:.04, eclair:0,    lum:0,   sursaut:.8,  pousse:.9,  gel:.045, poids:0 },
  flamer:  { cam:.0006, roul:.0015, lat:.0008, ret:28, vm:.12, vmRoul:.01, eclair:1,   lum:1,   sursaut:.08, pousse:.15, gel:0,   poids:0 },
  minigun: { cam:.0022, roul:.003, lat:.0022, ret:28, vm:.35, vmRoul:.03, eclair:1,    lum:1,   sursaut:.3,  pousse:.45, gel:0,   poids:0 },
  rocket:  { cam:.036,  roul:.03,  lat:.004,  ret:10, vm:1.4, vmRoul:.1,  eclair:1.2,  lum:1.6, sursaut:1,   pousse:2.4, gel:.07, poids:.3 },
  mg50:    { cam:.009,  roul:.007, lat:.003,  ret:20, vm:.5,  vmRoul:.06, eclair:1.15, lum:1.3, sursaut:.7,  pousse:.9,  gel:0,   poids:.12 },
  laser:   { cam:.0016, roul:.0015, lat:.001, ret:28, vm:.2,  vmRoul:.02, eclair:.8,   lum:.8,  sursaut:.2,  pousse:.25, gel:0,   poids:0 },
  railgun: { cam:.04,   roul:.035, lat:.003,  ret:10, vm:1.6, vmRoul:.12, eclair:1.4,  lum:2,   sursaut:1,   pousse:1.9, gel:.07, poids:.35 },
  gl:      { cam:.014,  roul:.012, lat:.003,  ret:17, vm:.9,  vmRoul:.06, eclair:1.1,  lum:1.2, sursaut:1,   pousse:2,   gel:.05, poids:.2 },
  arc:     { cam:.006,  roul:.006, lat:.002,  ret:22, vm:.3,  vmRoul:.04, eclair:1,    lum:1,   sursaut:.6,  pousse:.6,  gel:0,   poids:0 }
};
const RS_DEF = RS_ARME.pistol;            // arme inconnue (ajoutée plus tard) : comme le pistolet
const RS_CAM_MAX = .07;                   // montée de caméra la plus forte (radians), même en rafale
const RS_CAM_VISEE = .7;                  // en visée : coup de caméra × 0,7 (× 0,5 dans la lunette du sniper)
const RS_SURSAUT_VIE = .45;               // durée d'un sursaut (s)
const RS_MORT_VIE = 1.3;                  // durée de la poussée d'un corps (s)
const RS_GEL_CD = .5;                     // délai minimal entre deux gels (s)
const RS_FL_N = 40;                       // sursauts suivis à la fois (pool)
const RS_PUFF_N = isTouch ? 8 : 14;       // éclats (brume, poussière) à la fois (pool de sprites)
const RS_GOUT_N = isTouch ? 40 : 72;      // gouttes et étincelles à la fois (un seul appel de dessin)
const RS_PAR_IMAGE = { gouttes: 18, eclats: 3, sang: 5 }; // au plus, par image (avant la qualité)
const RS_SON_GAP = { tete: .08, tue: .07, chair: .05, poids: .09 }; // espacement minimal des sons (s)
const RS_MK = { touche: .12, tete: .2, tue: .3 };                 // durée du marqueur au réticule (s)

const RS = {
  on: store.get('dt_secousses', true) !== false,   // Secousses (caméra, gel)
  seed: 7919,
  // Ressorts de la caméra (montée p, écart y, roulis r) : position et vitesse, raideur w
  cp: 0, cy: 0, cr: 0, vp: 0, vy: 0, vr: 0, w: 20,
  wr: 0, wvr: 0, ww: 20,                             // roulis de l'arme en main
  camOn: false, bx: 0, by: 0, bz: 0, ax: 0, ay: 0, az: 0, // décalage posé sur la caméra (rotation d'avant, rotation posée)
  tir: false, tirTouches: 0,                         // pendant fire()
  gel: 0, gelCd: 0, boomOn: false, boomKills: 0,
  mk: 0, mkT: 0, mkD: 0, mkHead: false, mkCls: '', mkTr: '',
  sTete: false, sTue: false, sonT: { tete: -9, tue: -9, chair: -9, poids: -9 },
  ema: 1 / 60, q: 1, pend: false, actif: false,
  perImage: { gouttes: 0, eclats: 0, sang: 0 },
  n: { recul: 0, impact: 0, decor: 0, sursaut: 0, mort: 0, gel: 0, gelImages: 0, sonTete: 0, sonTue: 0, sonPoids: 0, chairSautee: 0 },
  parArme: {}                                        // tirs vus par arme (tests)
};
// Petit hasard propre (le simulateur fixe Math.random : on n'y touche pas)
function rsR(){ RS.seed = RS.seed * 16807 % 2147483647; return (RS.seed - 1) / 2147483646; }
const rsProf = id => RS_ARME[id] || RS_DEF;
function rsToit(){ return state === 'playing' && !Jeu.actif(); }

/* ---------- Ressort amorti (critique) : solution exacte, stable même avec un grand dt ---------- */
// Renvoie la nouvelle position et met la vitesse dans rsSpr.v
const rsSpr = { v: 0 };
function rsSpring(p, v, w, dt){
  const e = Math.exp(-w * dt), k = v + w * p;
  rsSpr.v = (v - w * k * dt) * e;
  return (p + k * dt) * e;
}

/* ---------- 1. Recul : caméra (image seulement) ---------- */
function rsCamKick(P){
  if (!RS.on) return;
  let k = 1;
  if (zoomed) k *= RS_CAM_VISEE;
  if (typeof ads === 'number' && ads > .85 && S && S.cur === 'sniper') k *= .7;
  RS.w = P.ret;
  const sgn = rsR() < .5 ? -1 : 1, e = 2.718 * RS.w;
  // Moitié tout de suite (coup sec), moitié en vitesse (le pic arrive en quelques millisecondes), puis retour amorti
  RS.cp += P.cam * k * .55; RS.vp += P.cam * k * .45 * e;
  RS.cy += P.lat * k * sgn * (.5 + rsR() * .5);
  RS.cr += P.roul * k * (rsR() < .5 ? -1 : 1) * (.6 + rsR() * .4);
  if (RS.cp > RS_CAM_MAX) RS.cp = RS_CAM_MAX;
  RS.wr += P.vmRoul * (rsR() < .5 ? -1 : 1) * (.6 + rsR() * .4);
  if (RS.wr > .25) RS.wr = .25; else if (RS.wr < -.25) RS.wr = -.25;
}
function rsCamStep(dt){
  const w = RS.w;
  RS.cp = rsSpring(RS.cp, RS.vp, w, dt); RS.vp = rsSpr.v;
  RS.cy = rsSpring(RS.cy, RS.vy, w * 1.2, dt); RS.vy = rsSpr.v;
  RS.cr = rsSpring(RS.cr, RS.vr, w * .9, dt); RS.vr = rsSpr.v;
  RS.wr = rsSpring(RS.wr, RS.wvr, RS.ww, dt); RS.wvr = rsSpr.v;
  if (RS.cp > RS_CAM_MAX) RS.cp = RS_CAM_MAX;
  if (Math.abs(RS.cp) + Math.abs(RS.cy) + Math.abs(RS.cr) + Math.abs(RS.vp) < 1e-6){ RS.cp = RS.cy = RS.cr = RS.vp = RS.vy = RS.vr = 0; }
}
// Pose le décalage sur la caméra pour le rendu (visuals vient de poser la vraie rotation)
function rsCamApply(){
  if (!RS.on || (!RS.cp && !RS.cy && !RS.cr)) return;
  const r = camera.rotation;
  RS.bx = r.x; RS.by = r.y; RS.bz = r.z; RS.camOn = true;
  r.set(r.x + RS.cp, r.y + RS.cy, r.z + RS.cr);
  RS.ax = r.x; RS.ay = r.y; RS.az = r.z;
}
// Avant update() et fire() : la caméra reprend la vraie rotation (les balles partent comme avant)
function rsRestore(){
  if (RS.camOn){
    RS.camOn = false;
    const r = camera.rotation; // seulement si personne n'a tourné la caméra depuis (ex. lookAt d'un test)
    if (r.x === RS.ax && r.y === RS.ay && r.z === RS.az){ r.set(RS.bx, RS.by, RS.bz); camera.updateMatrixWorld(); }
  }
  if (RS.pend) rsRestoreZ();
}

/* ---------- Petit pool d'éclats (sprites) et de gouttes (une instance chacune) ---------- */
const rsPuffTex = canvasTex(64, 64, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.65)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const RS_PUFF = [];
for (let i = 0; i < RS_PUFF_N; i++){
  const m = new THREE.SpriteMaterial({ map: rsPuffTex, transparent: true, depthWrite: false, opacity: 0, color: 0xffffff });
  const s = new THREE.Sprite(m); s.visible = false; s.renderOrder = 5; scene.add(s);
  RS_PUFF.push({ s, m, t: 0, life: 0, s0: 0, s1: 0, op: 0, rise: 0 });
}
let rsPuffI = 0;
function rsPuff(p, col, s0, s1, life, op, rise){
  if (RS.perImage.eclats >= Math.max(1, Math.round(RS_PAR_IMAGE.eclats * RS.q))) return;
  RS.perImage.eclats++;
  const e = RS_PUFF[rsPuffI]; rsPuffI = (rsPuffI + 1) % RS_PUFF_N;
  e.s.position.copy(p); e.m.color.setHex(col); e.m.opacity = op; e.m.rotation = rsR() * 6.28;
  e.t = 0; e.life = life; e.s0 = s0; e.s1 = s1; e.op = op; e.rise = rise || 0;
  e.s.scale.set(s0, s0, 1); e.s.visible = true;
}
function rsPuffStep(dt){
  for (let i = 0; i < RS_PUFF_N; i++){
    const e = RS_PUFF[i]; if (!e.s.visible) continue;
    e.t += dt; const u = e.t / e.life;
    if (u >= 1){ e.s.visible = false; continue; }
    const s = e.s0 + (e.s1 - e.s0) * (1 - (1 - u) * (1 - u));
    e.s.scale.set(s, s, 1); e.m.opacity = e.op * (1 - u); e.s.position.y += e.rise * dt;
  }
}
const rsGoutIM = new THREE.InstancedMesh(new THREE.BoxGeometry(.1, .1, .1), new THREE.MeshBasicMaterial({ color: 0xffffff }), RS_GOUT_N);
rsGoutIM.setColorAt(0, rsGoutIM.material.color);
rsGoutIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); rsGoutIM.instanceColor.setUsage(THREE.DynamicDrawUsage);
rsGoutIM.frustumCulled = false; rsGoutIM.count = 0; rsGoutIM.visible = false; scene.add(rsGoutIM);
const RS_GOUT = [];
for (let i = 0; i < RS_GOUT_N; i++) RS_GOUT.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1, r: 1, g: 1, b: 1, s: 1, grav: 1 });
let rsGoutI = 0;
const rsCol = new THREE.Color();
// n gouttes en cône autour de la direction d (vitesse spd), couleur col
function rsGouttes(p, d, n, spd, cone, col, life, s, grav){
  const max = Math.max(1, Math.round(RS_PAR_IMAGE.gouttes * RS.q)) - RS.perImage.gouttes;
  n = Math.min(n, max); if (n <= 0) return;
  RS.perImage.gouttes += n;
  rsCol.setHex(col);
  for (let i = 0; i < n; i++){
    const g = RS_GOUT[rsGoutI]; rsGoutI = (rsGoutI + 1) % RS_GOUT_N;
    g.p.copy(p);
    g.v.set(d.x + (rsR() - .5) * 2 * cone, d.y + (rsR() - .2) * 1.4 * cone, d.z + (rsR() - .5) * 2 * cone).multiplyScalar(spd * (.55 + rsR() * .7));
    g.max = g.life = life * (.7 + rsR() * .5); g.r = rsCol.r; g.g = rsCol.g; g.b = rsCol.b; g.s = s * (.6 + rsR() * .8); g.grav = grav;
  }
}
function rsGoutStep(dt){
  const A = rsGoutIM.instanceMatrix.array, C = rsGoutIM.instanceColor.array; let n = 0;
  for (let i = 0; i < RS_GOUT_N; i++){
    const g = RS_GOUT[i]; if (g.life <= 0) continue;
    g.life -= dt; if (g.life <= 0) continue;
    const q = g.p;
    if (q.y > .02){ g.v.y -= 11 * g.grav * dt; q.addScaledVector(g.v, dt); if (q.y < .02) q.y = .02; }
    const s = g.s * Math.max(.2, g.life / g.max), o = n * 16;
    A[o] = s; A[o + 1] = 0; A[o + 2] = 0; A[o + 3] = 0; A[o + 4] = 0; A[o + 5] = s; A[o + 6] = 0; A[o + 7] = 0;
    A[o + 8] = 0; A[o + 9] = 0; A[o + 10] = s; A[o + 11] = 0; A[o + 12] = q.x; A[o + 13] = q.y; A[o + 14] = q.z; A[o + 15] = 1;
    C[n * 3] = g.r; C[n * 3 + 1] = g.g; C[n * 3 + 2] = g.b; n++;
  }
  if (n || rsGoutIM.count){ rsGoutIM.count = n; rsGoutIM.visible = n > 0; rsGoutIM.instanceMatrix.needsUpdate = true; rsGoutIM.instanceColor.needsUpdate = true; }
}
function rsFxClear(){
  for (let i = 0; i < RS_PUFF_N; i++) RS_PUFF[i].s.visible = false;
  for (let i = 0; i < RS_GOUT_N; i++) RS_GOUT[i].life = 0;
  rsGoutIM.count = 0; rsGoutIM.visible = false;
}

/* ---------- 2. Impacts ---------- */
const rsD = new THREE.Vector3(), rsP = new THREE.Vector3(), rsQ = new THREE.Vector3();
const RS_SANG = 0x9a120e, RS_SANG_CLAIR = 0xc8261c, RS_BRUME = 0x8a1a14;
// Sang sur un zombie : gerbe qui sort dans le sens du tir (d), brume au point d'impact
function rsSang(p, d, head, fort){
  if (RS.perImage.sang >= Math.max(1, Math.round(RS_PAR_IMAGE.sang * RS.q))) return;
  RS.perImage.sang++; RS.n.impact++;
  const k = head ? 1.4 : 1;
  rsGouttes(p, d, Math.round((head ? 8 : 5) * (fort ? 1.5 : 1) * RS.q + .5), (head ? 5.5 : 4) * (fort ? 1.3 : 1), .45, head ? RS_SANG_CLAIR : RS_SANG, .6, 1.3, 1);
  rsPuff(p, head ? RS_SANG_CLAIR : RS_BRUME, .35 * k, (fort ? 1.9 : 1.35) * k, head ? .32 : .25, head ? .9 : .8, .3);
}
// Balle qui ne touche rien : point d'arrivée sur le sol, une façade ou le fond de la rue (calcul simple, sans rayon)
function rsDecorPoint(o, d, out){
  let best = 1e9, kind = 0;
  if (d.y < -1e-4){ const t = -o.y / d.y; if (t > 0 && t < best){ best = t; kind = 1; } }
  const L = typeof curLoc !== 'undefined' ? curLoc : null;
  const xf = !L || L.style === 'houses' ? 0 : L.style === 'port' ? 21 : 19;
  if (xf && Math.abs(d.x) > 1e-4){
    const t = ((d.x > 0 ? xf : -xf) - o.x) / d.x;
    if (t > 0 && t < best){ const y = o.y + d.y * t, z = o.z + d.z * t; if (y > 0 && y < 24 && z < BAR_Z && z > -178){ best = t; kind = 2; } }
  }
  if (d.z < -1e-4){ const t = (-178 - o.z) / d.z; if (t > 0 && t < best && o.y + d.y * t < 16){ best = t; kind = 2; } }
  if (!kind || best > 200) return 0;
  out.copy(o).addScaledVector(d, best);
  return kind;
}
function rsDecor(id, W){
  const n = (W.pellets || 1) > 1 ? 2 : 1, sp = (typeof wSpread === 'function' ? wSpread(id) : (W.spread || 0)) * (zoomed ? .45 : 1);
  for (let i = 0; i < n; i++){
    rsD.set((rsR() * 2 - 1) * sp, (rsR() * 2 - 1) * sp, -1).normalize().applyQuaternion(camera.quaternion);
    const kind = rsDecorPoint(camera.position, rsD, rsP); if (!kind) continue;
    RS.n.decor++;
    if (kind === 1){ // sol : poussière qui monte
      rsQ.set(0, 1, 0);
      rsGouttes(rsP, rsQ, Math.round(4 * RS.q + .5), 2.8, .7, 0x8a7a68, .5, 1.2, 1);
      rsPuff(rsP, 0xb0a088, .7, 2.4, .5, .7, .7);
    } else {       // façade : étincelles qui rebondissent vers nous, petite poussière
      rsQ.copy(rsD).multiplyScalar(-1);
      rsGouttes(rsP, rsQ, Math.round(4 * RS.q + .5), 4, .6, 0xffc060, .25, .8, .6);
      rsPuff(rsP, 0xfff0b0, .3, .9, .07, .95, 0);
      rsPuff(rsP, 0xa09888, .6, 1.9, .45, .6, .4);
    }
  }
}
// Marqueur au réticule : 1 touché, 2 tête, 3 tué (le plus fort l'emporte)
function rsMarque(kind, head){
  if (kind < RS.mk && RS.mkT > 0) return;
  RS.mkHead = kind === 3 ? (!!head || (RS.mk === 3 && RS.mkT > 0 && RS.mkHead)) : !!head;
  RS.mk = kind;
  RS.mkD = RS.mkT = kind === 3 ? RS_MK.tue : kind === 2 ? RS_MK.tete : RS_MK.touche;
}
function rsMarqueStep(dt){
  const el = $('hitm'); if (!el) return;
  if (RS.mkT > 0){ RS.mkT -= dt; if (RS.mkT <= 0){ RS.mkT = 0; RS.mk = 0; } }
  if (RS.mk >= 2 && typeof hitmT === 'number' && hitmT < RS.mkT) hitmT = RS.mkT; // le HUD montre le marqueur tant qu'il dure
  const cls = RS.mk === 3 ? (RS.mkHead ? 'tt' : 't') : RS.mk === 2 ? 'h' : '';
  if (cls !== RS.mkCls){
    RS.mkCls = cls;
    el.classList.toggle('rs-tete', cls === 'h' || cls === 'tt');
    el.classList.toggle('rs-tue', cls === 't' || cls === 'tt');
  }
  let tr = '';
  if (RS.mk){ const u = RS.mkD > 0 ? RS.mkT / RS.mkD : 0, pop = 1 + (RS.mk === 3 ? .55 : RS.mk === 2 ? .35 : .2) * u * u; tr = 'translate(-50%,-50%) rotate(45deg) scale(' + pop.toFixed(2) + ')'; }
  if (tr !== RS.mkTr){ RS.mkTr = tr; el.style.transform = tr; }
}

/* ---------- 3. Réaction des zombies : sursaut et mort poussée (pool fixe) ---------- */
const RS_FL = [];
for (let i = 0; i < RS_FL_N; i++) RS_FL.push({ z: null, t: 0, life: 0, a: 0, head: false, side: 0, dead: false, push: 0, dx: 0, dz: 0, up: 0, bx: 0, by: 0, bz: 0, rot: 0,
  on: false, sx: 0, sz: 0, hx: 0, ax: 0, az: 0, ahx: 0, hasH: false });
let rsFlI = 0;
function rsFlFor(z){
  const e0 = z.rsFl; if (e0 && e0.z === z) return e0;
  let e = null;
  for (let i = 0; i < RS_FL_N; i++){ const c = RS_FL[i]; if (!c.z || c.t >= c.life){ e = c; break; } }
  if (!e){ e = RS_FL[rsFlI]; rsFlI = (rsFlI + 1) % RS_FL_N; }
  if (e.on) rsPoseUndo(e);
  if (e.z && e.z.rsFl === e) e.z.rsFl = null;
  e.z = z; e.t = 0; e.life = 0; e.a = 0; e.dead = false; e.push = 0; e.up = 0; e.rot = 0; e.on = false;
  z.rsFl = e;
  return e;
}
// Forme du sursaut : monte en 0,05 s, redescend doucement
const rsFlCurve = t => t < .05 ? t / .05 : Math.exp(-(t - .05) * 9);
function rsSursaut(z, P, head, d){
  if (!z.body || z.body === z.g) return; // forme sans torse séparé : pas de sursaut
  const big = z.type === 'boss' ? .25 : ((ZTYPES[z.type] || {}).scale || 1) > 1.4 ? .45 : 1;
  const e = rsFlFor(z); if (e.dead) return;
  const cur = e.life > 0 && e.t < e.life ? e.a * rsFlCurve(e.t) : 0;
  e.a = Math.min(1.2, Math.max(cur, P.sursaut * big * (head ? 1.25 : 1)));
  e.t = 0; e.life = RS_SURSAUT_VIE; e.head = !!head;
  e.side = (d.x >= 0 ? 1 : -1) * (.5 + rsR() * .5);
  RS.n.sursaut++;
}
function rsMort(z, P, head, d){
  if (!z.body || z.type === 'boss') return;
  const e = rsFlFor(z);
  const big = ((ZTYPES[z.type] || {}).scale || 1) > 1.4 ? .4 : 1;
  e.dead = true; e.t = 0; e.life = RS_MORT_VIE; e.a = 0;
  e.push = P.pousse * big * (head ? 1.1 : 1);
  const h = Math.sqrt(d.x * d.x + d.z * d.z) || 1; e.dx = d.x / h; e.dz = d.z / h;
  e.up = RS.boomOn ? .35 * e.push : 0;
  e.rot = Math.min(.45, e.push * .18);
  if (z.body !== z.g){ e.bx = z.body.position.x; e.by = z.body.position.y; e.bz = z.body.position.z; }
  RS.n.mort++;
}
// Pose les décalages (avant la copie des instances) ; renvoie le nombre de zombies touchés
function rsPoseOn(){
  let n = 0;
  for (let i = 0; i < RS_FL_N; i++){
    const e = RS_FL[i], z = e.z; if (!z || !z.g || e.t >= e.life) continue;
    const b = z.body; if (!b) continue;
    let rx = 0, rz = 0, hx = 0;
    if (e.dead){
      const s = e.push * (1 - Math.exp(-e.t * 6));
      if (b !== z.g){
        const sc = z.g.scale;
        b.position.x = e.bx + e.dx * s / (sc.x || 1); b.position.z = e.bz + e.dz * s / (sc.z || 1);
        if (e.up) b.position.y = e.by + e.up * Math.sin(Math.PI * Math.min(1, e.t / .4)) / (sc.y || 1);
      }
      rx = -e.rot * Math.min(1, e.t / .25);
    } else {
      const f = e.a * rsFlCurve(e.t);
      if (b === z.g || f < .002) continue;
      rx = -f * .32; rz = f * e.side * .12; hx = -f * (e.head ? .6 : .18);
    }
    if (b === z.g) continue;
    e.sx = b.rotation.x; e.sz = b.rotation.z; b.rotation.x += rx; b.rotation.z += rz; e.ax = b.rotation.x; e.az = b.rotation.z;
    e.hasH = !!(z.head && hx && z.head.parent); if (e.hasH){ e.hx = z.head.rotation.x; z.head.rotation.x += hx; e.ahx = z.head.rotation.x; }
    e.on = true; z._mwF = -1; z._rel = false; n++;
  }
  return n;
}
function rsPoseUndo(e){
  const z = e.z; e.on = false; if (!z || !z.body) return;
  const r = z.body.rotation; // seulement si la pose n'a pas été changée depuis
  if (r.x === e.ax) r.x = e.sx;
  if (r.z === e.az) r.z = e.sz;
  if (e.hasH && z.head && z.head.rotation.x === e.ahx) z.head.rotation.x = e.hx;
  z._mwF = -1; z._rel = false; // les cibles des tirs seront recalculées sans le sursaut
}
// Après la copie : les zombies par instances reprennent leur vraie pose tout de suite ; les autres (boss) après le rendu
function rsPoseOff(){
  for (let i = 0; i < RS_FL_N; i++){ const e = RS_FL[i]; if (!e.on) continue; if (e.z && e.z.inst) rsPoseUndo(e); else RS.pend = true; }
}
function rsRestoreZ(){ RS.pend = false; for (let i = 0; i < RS_FL_N; i++){ const e = RS_FL[i]; if (e.on) rsPoseUndo(e); } }
function rsFlStep(dt){ for (let i = 0; i < RS_FL_N; i++){ const e = RS_FL[i]; if (!e.z) continue; e.t += dt; if (e.t >= e.life){ if (e.on) rsPoseUndo(e); if (e.z.rsFl === e) e.z.rsFl = null; e.z = null; } } }
function rsFlClear(){ rsRestoreZ(); for (let i = 0; i < RS_FL_N; i++){ const e = RS_FL[i]; if (e.z && e.z.rsFl === e) e.z.rsFl = null; e.z = null; e.t = e.life = 0; } }

/* ---------- 4. Sons ---------- */
const rsSonOk = () => typeof Snd === 'object' && Snd.on && Snd.ctx && Snd.master && rsToit();
function rsSonGap(k, now){ if (now - RS.sonT[k] < RS_SON_GAP[k]) return false; RS.sonT[k] = now; return true; }
// Tête : « toc » sec et brillant (os), petit claquement aigu
function rsSonTete(){
  const c = Snd.ctx, t = c.currentTime; if (!rsSonGap('tete', t)) return;
  RS.n.sonTete++;
  try {
    const o = Snd._fx ? Snd._fx() : null, p = .92 + rsR() * .16;
    Snd._nz(t, 'bandpass', 2600 * p, 6, .035, .16, o);
    Snd._osc(t, 'triangle', 1500 * p, 700, .06, .07, o);
    Snd._nz(t, 'highpass', 6000, 0, .015, .06, o);
  } catch (e) { errNote(e); }
}
// Tué : coup sourd court et petit « tic » qui confirme
function rsSonTue(head){
  const c = Snd.ctx, t = c.currentTime; if (!rsSonGap('tue', t)) return;
  RS.n.sonTue++;
  try {
    const p = .94 + rsR() * .12;
    Snd._osc(t, 'sine', 170 * p, 55, .1, .17);
    Snd._nz(t, 'bandpass', 1100 * p, 2, .05, .09);
    Snd._osc(t + .012, 'square', head ? 2600 : 2200, head ? 2300 : 1900, .022, .025);
  } catch (e) { errNote(e); }
}
// Poids des grosses armes : coup grave court sous le tir
function rsSonPoids(P, id){
  if (!P.poids || !rsSonOk()) return;
  if (typeof accOwned === 'function' && accOwned(id, 'rsupp')) return; // silencieux : pas de coup grave
  const t = Snd.ctx.currentTime; if (!rsSonGap('poids', t)) return;
  RS.n.sonPoids++;
  try { Snd._osc(t, 'sine', 115, 40, .16, P.poids); } catch (e) { errNote(e); }
}
function rsSonStep(){
  if (!RS.sTete && !RS.sTue) return;
  if (rsSonOk()){ if (RS.sTue) rsSonTue(RS.sTete); else rsSonTete(); if (RS.sTue && RS.sTete) rsSonTete(); }
  RS.sTete = RS.sTue = false;
}

/* ---------- Un coup porté (enveloppe de damage) ---------- */
const RS_EXPLO = { rocket: 1, gl: 1, pow: 1, rue: 1 };
const rsBoomP = new THREE.Vector3();
function rsCoup(z, head, point, tue){
  let src = S && S.cur, feu = false;
  if (typeof pkSrcNow === 'function'){ const sf = pkSrcNow(point); src = sf.s; feu = sf.f; }
  const explo = !!RS_EXPLO[src] || RS.boomOn, arme = !!WEAPONS[src];
  if (!arme && !explo) return;                                  // défenses, compagnon, autres : effets d'avant seulement
  const P = rsProf(arme ? src : 'rocket');
  const p = point && point.isVector3 ? point : (typeof pkCenter === 'function' ? pkCenter(z) : z.g.position);
  // Sens du coup : de la caméra vers le zombie, ou du centre de l'explosion vers lui
  if (RS.boomOn) rsD.copy(z.g.position).sub(rsBoomP); else rsD.copy(p).sub(camera.position);
  rsD.y = RS.boomOn ? .6 : 0; if (rsD.lengthSq() < 1e-6) rsD.set(0, 0, -1); rsD.normalize();
  if (RS.tir) RS.tirTouches++;
  if (feu){ RS.n.impact++; if (tue) rsMort(z, P, false, rsD); else rsSursaut(z, P, false, rsD); return; } // flammes : léger sursaut, pas de gerbe à chaque tic
  rsSang(p, rsD, head, explo || P.pousse >= 1.3);
  if (tue){
    rsMort(z, P, head, rsD); rsMarque(3, head); RS.sTue = true; if (head) RS.sTete = true;
    const big = ((ZTYPES[z.type] || {}).scale || 1) > 1.3;
    if (RS.boomOn) RS.boomKills++;
    if (RS.on && P.gel > 0 && RS.gelCd <= 0 && !(typeof PK === 'object' && PK.sl) && (head || big || (RS.boomOn && RS.boomKills >= 3))){
      RS.gel = P.gel * (isTouch ? .8 : 1); RS.gelCd = RS_GEL_CD; RS.n.gel++;
    }
  } else {
    rsSursaut(z, P, head, rsD); rsMarque(head ? 2 : 1, head); if (head) RS.sTete = true;
  }
}

/* ---------- Après un tir (enveloppe de fire) ---------- */
function rsApresTir(id){
  const W = WEAPONS[id]; if (!W) return;
  const P = rsProf(id);
  RS.n.recul++; RS.parArme[id] = (RS.parArme[id] || 0) + 1;
  rsCamKick(P);
  kick = P.vm * (zoomed ? .85 : 1);                              // recul de l'arme en main (15-boucle)
  if (flash.visible && P.eclair > 0 && flashT > 0){              // éclair de bouche dosé, jamais deux fois pareil
    const s = flash.scale.x * P.eclair * (.8 + rsR() * .45);
    flash.scale.set(s, s, 1);
    muzzleLight.intensity = Math.min(6, muzzleLight.intensity * P.lum);
  }
  rsSonPoids(P, id);
  // Balle qui ne touche aucun zombie : poussière ou étincelle là où elle arrive (au plus 12 par seconde)
  if (!W.kind && !W.chain && RS.tirTouches === 0 && RS.decorT <= 0){ RS.decorT = W.rate >= 8 ? .08 : 0; rsDecor(id, W); }
}
RS.decorT = 0;

/* ---------- Chaque image (Jeu.on('image'), après le rendu commun, avant le dessin) ---------- */
function rsImage(dt){
  const toit = rsToit(), pause = state === 'paused' && RS.actif;
  if (!toit && !pause){ if (RS.actif) rsStop(); return; }
  RS.actif = true;
  if (pause){ rsCamApply(); return; }                          // en pause : tout reste figé
  RS.ema += (dt - RS.ema) * .05;
  RS.q = (isTouch ? .6 : 1) * (RS.ema > 1 / 30 ? .4 : RS.ema > 1 / 42 ? .7 : 1);
  RS.perImage.gouttes = RS.perImage.eclats = RS.perImage.sang = 0;
  if (RS.gelCd > 0) RS.gelCd -= dt;
  if (RS.decorT > 0) RS.decorT -= dt;
  const gele = RS.gel > 0;
  if (gele) RS.gel -= dt;
  const k = typeof PK === 'object' && PK.ts ? PK.ts : 1, fdt = gele ? 0 : dt * k;
  if (!gele) rsCamStep(dt);
  rsCamApply();
  if (RS.wr && typeof vmRoot !== 'undefined') vmRoot.rotation.z += RS.wr;
  if (flashT > 0 && flash.visible) flash.scale.multiplyScalar(Math.exp(-dt * 9)); // l'éclair rétrécit sur ses 3 images
  rsFlStep(fdt);
  rsPuffStep(fdt); rsGoutStep(fdt);
  rsMarqueStep(dt);
  rsSonStep();
}
function rsStop(){
  RS.actif = false; RS.camOn = false; // la caméra appartient maintenant à l'écran ou au mode : on n'y touche pas
  rsFlClear(); rsFxClear();
  RS.cp = RS.cy = RS.cr = RS.vp = RS.vy = RS.vr = RS.wr = RS.wvr = 0; RS.gel = 0; RS.mk = 0; RS.mkT = 0;
  RS.sTete = RS.sTue = false;
  const el = $('hitm'); if (el){ el.classList.remove('rs-tete', 'rs-tue'); el.style.transform = ''; } RS.mkCls = ''; RS.mkTr = '';
}

/* ---------- Réglage dans l'écran Pause : Secousses ---------- */
function rsBtn(){ const b = $('btnSecousses'); if (b) b.textContent = 'Secousses : ' + (RS.on ? 'activées' : 'coupées'); }
function rsSetSecousses(on){
  RS.on = !!on; store.set('dt_secousses', RS.on);
  if (!RS.on){ RS.cp = RS.cy = RS.cr = RS.vp = RS.vy = RS.vr = 0; RS.gel = 0; rsRestore(); }
  rsBtn();
}
(function(){
  const res = $('btnResume');
  if (res && res.parentNode && res.parentNode.insertBefore && !$('btnSecousses')){
    const b = document.createElement('button'); b.className = 'ghost'; b.id = 'btnSecousses'; b.type = 'button';
    res.parentNode.insertBefore(b, res);
    b.addEventListener('click', () => rsSetSecousses(!RS.on));
  }
  rsBtn();
})();

/* ---------- Crochets ---------- */
try {
  const _b = fire;
  fire = function(){
    rsRestore();
    const toit = rsToit(), id = S && S.cur;
    if (!toit) return _b.apply(this, arguments);
    RS.tir = true; RS.tirTouches = 0;
    let r; try { r = _b.apply(this, arguments); } finally { RS.tir = false; }
    if (r !== false){ try { rsApresTir(id); } catch (e) { errNote(e); } }
    return r;
  };
} catch (e) { errNote(e); }
try {
  const _b = damage;
  damage = function(z, amt, head, point){
    if (!z || z.dead || !rsToit()) return _b.apply(this, arguments);
    const hp0 = z.hp;
    const r = _b.apply(this, arguments);
    if (hp0 - z.hp > 0 || z.dead){ try { rsCoup(z, head, point, !!z.dead); } catch (e) { errNote(e); } }
    return r;
  };
} catch (e) { errNote(e); }
try {
  const _b = update;
  update = function(){ rsRestore(); return _b.apply(this, arguments); };
} catch (e) { errNote(e); }
try {
  const _b = zInstSync;
  zInstSync = function(){
    if (RS.pend) rsRestoreZ();
    if (RS.gel > 0 && state === 'playing' && zombies.length){ RS.n.gelImages++; return; } // gel : les zombies restent figés à l'image
    const n = rsPoseOn();
    try { return _b.apply(this, arguments); } finally { if (n) rsPoseOff(); }
  };
} catch (e) { errNote(e); }
try {
  if (typeof armExplode === 'function'){
    const _b = armExplode;
    armExplode = function(pos){
      const o = RS.boomOn; if (pos && pos.isVector3){ rsBoomP.copy(pos); RS.boomOn = true; RS.boomKills = 0; }
      try { return _b.apply(this, arguments); } finally { RS.boomOn = o; }
    };
  }
} catch (e) { errNote(e); }
try {
  if (typeof pwBlast === 'function'){
    const _b = pwBlast;
    pwBlast = function(x, y, z0){
      const o = RS.boomOn; rsBoomP.set(+x || 0, +y || 0, +z0 || 0); RS.boomOn = true; RS.boomKills = 0;
      try { return _b.apply(this, arguments); } finally { RS.boomOn = o; }
    };
  }
} catch (e) { errNote(e); }
// Impact dans la chair : au plus un toutes les 0,05 s sur le toit (le minigun ne sature plus)
try {
  const _b = Snd.hit;
  Snd.hit = function(){
    if (this.on && this.ctx && rsToit()){
      const t = this.ctx.currentTime;
      if (t - RS.sonT.chair < RS_SON_GAP.chair){ RS.n.chairSautee++; return; }
      RS.sonT.chair = t;
    }
    return _b.apply(this, arguments);
  };
} catch (e) { errNote(e); }
Jeu.on('image', dt => rsImage(dt));

// Accès pour les tests automatiques
window.__ressenti = { RS, RS_ARME, RS_PUFF, RS_GOUT, RS_FL, RS_PUFF_N, RS_GOUT_N, RS_FL_N, rsSetSecousses, rsRestore, rsStop, rsDecorPoint,
  get gouttes(){ let n = 0; for (let i = 0; i < RS_GOUT_N; i++) if (RS_GOUT[i].life > 0) n++; return n; },
  get eclats(){ let n = 0; for (let i = 0; i < RS_PUFF_N; i++) if (RS_PUFF[i].s.visible) n++; return n; },
  get sursauts(){ let n = 0; for (let i = 0; i < RS_FL_N; i++) if (RS_FL[i].z) n++; return n; } };
