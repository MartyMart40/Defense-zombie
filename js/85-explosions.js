'use strict';
/* ================= Explosions et pouvoirs du toit plus beaux (dossier 130) ================= */
// Seulement visuel (les sons sont dans js/85-explosions-sons.js) : aucun chiffre du jeu ne change (dégâts, rayons, durées,
// recharges, moments, argent). Sur le toit seulement (aucun mode Jeu actif), en jeu et figé en pause.
// Ce qui est couvert, par-dessus ce qui existait (éclair en sprite, lumière ponctuelle, particules de js/05) :
//   grenade, bombes de la frappe aérienne, roquettes et lance-grenades, barils, auto du boss abattue en l'air :
//     éclair, boule de feu qui gonfle et monte, fumée qui prend le relais et monte longtemps, étincelles en traits,
//     débris qui retombent et restent un moment au sol, poussière soufflée au ras du sol, onde de choc et lueur au sol,
//     trace brûlée qui s'efface en une quinzaine de secondes ;
//   cocktail Molotov : verre qui éclate, souffle de feu, puis langues de feu qui vivent sur la nappe, fumée, braises,
//     lueur qui bat, et des volutes quand la nappe s'éteint ; même feu (plus petit) sur ce que laisse un baril ;
//   frappe aérienne : anneau rouge qui bat sur la cible et gerbe d'étincelles de la fusée pendant l'attente,
//     traînées blanches au bout des ailes et lueur des moteurs au passage de l'avion, puis le chapelet d'explosions ;
//   canon électromagnétique : air ionisé qui scintille le long du rayon, gerbe bleue et anneau au point d'impact.
// Comment : rien n'est réaffecté et aucun fichier n'est touché. Jeu.on('image') lit à chaque image les réserves du jeu
// (pwBooms, pwPuddles, pwStrikes, pwPlane de js/21 ; ARM.booms de js/20 ; RUE.fires de js/23 ; bossCars de js/19 ;
// arsBeams de js/34) et reconnaît ce qui vient de naître (éclair dont la vie remonte, nappe qui s'allume, etc.).
// Deux appels de dessin au plus : toutes les bouffées (feu, fumée, étincelles, débris) dans une seule géométrie par
// instances (fumée d'abord, puis le feu par-dessus, en un seul mélange « prémultiplié » qui fait l'alpha et l'additif),
// et tout ce qui est posé au sol (brûlures, ondes, lueurs) dans une deuxième. Réserves de taille fixe, faites au chargement.
// Hasard : jamais Math.random (le simulateur le fixe) : générateur propre (exR) ; les objets sont créés dans exCalme,
// qui prête Math.random au générateur pendant que Three.js tire les uuid.
// Aucun mouvement de caméra n'est ajouté (les secousses d'avant restent celles du jeu, coupées par « Secousses »).

const EX_REGL = {
  on: true,                                   // interrupteur général (tests, captures avant et après)
  bouffees: isTouch ? 150 : 260,              // bouffées à la fois (une seule géométrie)
  sol: isTouch ? 24 : 40,                     // marques au sol à la fois (une seule géométrie)
  qualite: isTouch ? .6 : 1,                  // part des bouffées émises (au cell : moins)
  brulure: { vie: 16, efface: 5 },            // trace brûlée : durée (s), fondu de la fin (s)
  // Une recette par sorte d'explosion (nombres pour la qualité 1 ; taille en multiple du rayon de l'explosion)
  types: {
    grenade:  { feu: 9,  fumee: 7,  etin: 16, debris: 7,  pouss: 7, taille: 1,    fum: [.2, .19, .17],  deb: [.1, .09, .08], onde: 1,   lueur: 1 },
    bombe:    { feu: 10, fumee: 8,  etin: 14, debris: 8,  pouss: 8, taille: 1.1,  fum: [.17, .15, .13], deb: [.12, .1, .08], onde: 1.2, lueur: 1.2 },
    roquette: { feu: 9,  fumee: 6,  etin: 18, debris: 6,  pouss: 6, taille: .9,   fum: [.22, .21, .2],  deb: [.1, .09, .08], onde: 1,   lueur: 1 },
    gl:       { feu: 6,  fumee: 4,  etin: 10, debris: 4,  pouss: 4, taille: .75,  fum: [.24, .23, .21], deb: [.1, .09, .08], onde: .8,  lueur: .8 },
    baril:    { feu: 13, fumee: 10, etin: 18, debris: 8,  pouss: 7, taille: .95,  fum: [.07, .065, .06], deb: [.36, .08, .05], onde: 1.2, lueur: 1.4 },
    auto:     { feu: 12, fumee: 8,  etin: 16, debris: 12, pouss: 0, taille: 1.1,  fum: [.1, .095, .09], deb: [.12, .12, .13], onde: 0,   lueur: .8 }
  },
  rayonAuto: 3.2,                             // taille de la boule de feu d'une auto abattue (m)
  molotov: { taux: 2.4, fumee: 2.6, braises: 5, volutes: 6 }, // langues de feu par m² et par seconde ; fumée et braises par seconde
  barilFeu: 1.3,                              // rayon du feu laissé par un baril (m)
  avion: { trainee: .1, vie: 2.4, long: 8 },  // traînées des ailes : un trait de 8 m par bout d'aile toutes les 0,1 s
  rail: { pas: 1.6, max: 30 }                 // air ionisé : une étincelle tous les 1,6 m, au plus 30
};

/* ---------- Hasard propre (Park et Miller) : jamais Math.random ---------- */
let exGr = 13001;
const exR = () => { exGr = (exGr * 16807) % 2147483647; return (exGr - 1) / 2147483646; };
const exH = (a, b) => a + (b - a) * exR();
function exCalme(fn){ const R = Math.random; Math.random = exR; try { return fn(); } finally { Math.random = R; } }

const EX = { n: { grenade: 0, bombe: 0, roquette: 0, gl: 0, baril: 0, auto: 0, molotov: 0, eteint: 0, annonce: 0, avion: 0, rail: 0 },
  actif: false, cones: true, q: 1, ema: 1 / 60, t: 0, vus: 0, solVus: 0, m: 0 };

/* ---------- Couleurs (constantes : aucune allocation à l'émission) ---------- */
const EXC = {
  blanc: [1, .97, .88], jaune: [1, .86, .5], orange: [1, .5, .14], rouge: [.7, .14, .04], braise: [1, .35, .05],
  feu0: [1, .9, .62], feu1: [.85, .22, .05], etin0: [1, .88, .5], etin1: [1, .4, .08],
  verre0: [.85, .97, 1], verre1: [.55, .75, .7], pouss: [.4, .36, .31], poussClair: [.55, .52, .48],
  fumMol: [.12, .1, .09], fumGris: [.42, .41, .4], vapeur: [.86, .87, .88], blancCiel: [.95, .96, .97],
  bleu0: [.75, .92, 1], bleu1: [.18, .45, 1], rougeA: [1, .12, .08], rougeF: [1, .3, .15], couvercle: [.8, .62, .13],
  noir: [.03, .025, .02], lueur: [1, .5, .18], lueurMol: [1, .42, .1], lueurBleu: [.35, .65, 1], onde: [1, .86, .62], ondeBleu: [.6, .85, 1]
};
const EX_FEU = 0, EX_FUMEE = 1, EX_ETIN = 2, EX_DEBRIS = 3;      // formes des bouffées
const EX_BRULE = 0, EX_ANNEAU = 1, EX_LUEUR = 2;                 // formes au sol

/* ---------- Matériaux (mélange prémultiplié : une sortie à alpha 0 est additive) ---------- */
const EX_VS_FOG = 'uniform float fogNear; uniform float fogFar; varying float vFog;';
const EX_FS = `
uniform vec3 fogColor; uniform float uLin; uniform float uAdd;
varying vec2 vUv; varying vec4 vCol; varying vec3 vInfo; varying float vFog;
void main(){
  float f = vInfo.x; vec2 p = vUv; float d = length(p); float a;
  vec3 col = vCol.rgb;
  if (f > 2.5){
    vec2 q = abs(p); float m = max(q.x * 1.15 + q.y * .4, q.y * 1.05 + q.x * .25);
    a = 1.0 - smoothstep(.7, .85, m); col *= .75 + .35 * clamp(vInfo.z * .5 + .5, 0.0, 1.0);
  } else {
    if (d > 1.0) discard;
    float th = atan(p.y, p.x), e = .74 + .12 * sin(th * 3.0 + .5) + .08 * sin(th * 7.0 + 2.1);
    if (f > 1.5) a = pow(1.0 - d, 2.4);
    else if (f > .5){ a = 1.0 - smoothstep(e * .3, e, d); col *= .7 + .45 * clamp(vInfo.z * .5 + .5, 0.0, 1.0); }
    else { a = pow(1.0 - smoothstep(0.0, e + .12, d), .9); col = mix(col, vec3(1.0, .95, .8), pow(1.0 - d, 3.0) * .55 * vCol.a); }
  }
  float al = a * vCol.a; if (al < .004) discard;
  if (uLin > .5) col = pow(col, vec3(2.2));
  if (vInfo.y > .5) gl_FragColor = vec4(col * al * (1.0 - vFog * .85) * uAdd, 0.0);
  else gl_FragColor = vec4(mix(col, fogColor, vFog) * al, al);
}`;
// Bouffées face à la caméra ; les étincelles sont étirées dans le sens de leur vitesse (traînée)
const EX_VS_B = `
attribute vec2 coin; attribute vec3 iPos; attribute vec4 iVel; attribute vec4 iInfo; attribute vec4 iCol;
varying vec2 vUv; varying vec4 vCol; varying vec3 vInfo; ${EX_VS_FOG}
void main(){
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  float s = iInfo.x, r = iInfo.y, cs = cos(r), sn = sin(r);
  vec2 off; float lit;
  if (iVel.w > 0.0){
    vec2 dv = (modelViewMatrix * vec4(iVel.xyz, 0.0)).xy; float L = length(dv);
    vec2 ax = L > 1e-4 ? dv / L : vec2(1.0, 0.0), ay = vec2(-ax.y, ax.x); float l = L * iVel.w;
    off = ax * (coin.x * (s + l * .5) - l * .5) + ay * coin.y * s; lit = 1.0;
  } else { off = vec2(coin.x * cs - coin.y * sn, coin.x * sn + coin.y * cs) * s; lit = off.y / max(s, 1e-4); }
  mv.xy += off;
  gl_Position = projectionMatrix * mv;
  vUv = coin; vCol = iCol; vInfo = vec3(iInfo.z, iInfo.w, lit);
  vFog = smoothstep(fogNear, fogFar, -mv.z);
}`;
// Marques posées au sol (couchées), tournées sur elles-mêmes
const EX_VS_S = `
attribute vec2 coin; attribute vec3 iPos; attribute vec4 iInfo; attribute vec4 iCol;
varying vec2 vUv; varying vec4 vCol; varying vec3 vInfo; ${EX_VS_FOG}
void main(){
  float s = iInfo.x, r = iInfo.y, cs = cos(r), sn = sin(r);
  vec3 w = iPos + vec3(coin.x * cs - coin.y * sn, 0.0, coin.x * sn + coin.y * cs) * s;
  vec4 mv = modelViewMatrix * vec4(w, 1.0);
  gl_Position = projectionMatrix * mv;
  vUv = coin; vCol = iCol; vInfo = vec3(iInfo.z, iInfo.w, 0.0);
  vFog = smoothstep(fogNear, fogFar, -mv.z);
}`;
const EX_FS_S = `
uniform vec3 fogColor; uniform float uLin; uniform float uAdd;
varying vec2 vUv; varying vec4 vCol; varying vec3 vInfo; varying float vFog;
void main(){
  float f = vInfo.x, d = length(vUv), a;
  if (d > 1.0) discard;
  float th = atan(vUv.y, vUv.x);
  if (f > 1.5) a = pow(1.0 - d, 2.0);
  else if (f > .5) a = smoothstep(.72, .9, d) * (1.0 - smoothstep(.92, 1.0, d));
  else { float e = .8 + .1 * sin(th * 5.0 + 1.0) + .07 * sin(th * 11.0 + 2.0) + .05 * sin(th * 23.0); a = (1.0 - smoothstep(e * .5, e, d)) * (.9 + .1 * sin(th * 17.0)) * (.75 + .25 * (1.0 - d)); }
  float al = a * vCol.a; if (al < .004) discard;
  vec3 col = vCol.rgb; if (uLin > .5) col = pow(col, vec3(2.2));
  if (vInfo.y > .5) gl_FragColor = vec4(col * al * (1.0 - vFog * .85) * uAdd, 0.0);
  else gl_FragColor = vec4(mix(col, fogColor, vFog) * al, al);
}`;
function exMat(vs, fs, sol){
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uLin: { value: 0 }, uAdd: { value: 1 } }]),
    vertexShader: vs, fragmentShader: fs, fog: true, transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    toneMapped: false, side: THREE.DoubleSide, polygonOffset: !!sol, polygonOffsetFactor: sol ? -2 : 0, polygonOffsetUnits: sol ? -4 : 0
  });
}
function exGeo(N, vel){
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('coin', new THREE.BufferAttribute(new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const at = (nom, k) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(N * k), k); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(nom, a); return a; };
  const o = { g, pos: at('iPos', 3), info: at('iInfo', 4), col: at('iCol', 4), vel: vel ? at('iVel', 4) : null };
  g.instanceCount = 0;
  return o;
}
const EXB = exCalme(() => {
  const N = EX_REGL.bouffees, M = EX_REGL.sol;
  const b = exGeo(N, true), s = exGeo(M, false);
  const mb = new THREE.Mesh(b.g, exMat(EX_VS_B, EX_FS, false)), ms = new THREE.Mesh(s.g, exMat(EX_VS_S, EX_FS_S, true));
  [mb, ms].forEach(m => { m.frustumCulled = false; m.visible = false; m.matrixAutoUpdate = false; m.userData.keep = true; scene.add(m); });
  ms.renderOrder = 2; mb.renderOrder = 3;
  return { b, s, mb, ms };
});

/* ---------- Réserve des bouffées (tableaux fixes) ---------- */
const EXP = (() => {
  const N = EX_REGL.bouffees, F = () => new Float32Array(N);
  return { N, x: F(), y: F(), z: F(), vx: F(), vy: F(), vz: F(), age: F(), vie: F(), ret: F(), s0: F(), s1: F(), rot: F(), rv: F(),
    forme: new Uint8Array(N), add: new Uint8Array(N), c0: new Array(N).fill(EXC.feu0), c1: new Array(N).fill(EXC.feu1),
    a0: F(), grav: F(), frein: F(), monte: F(), tr: F(), sol: new Uint8Array(N), on: new Uint8Array(N), k: 0 };
})();
// Une bouffée : position, vitesse, vie, retard, taille de départ et d'arrivée, forme, additive, couleurs, opacité,
// gravité, freinage (par seconde), poussée vers le haut, traînée (s, étincelles), rebond au sol
function exP(x, y, z, vx, vy, vz, vie, ret, s0, s1, forme, add, c0, c1, a0, grav, frein, monte, tr, sol){
  const P = EXP, N = P.N; let i = -1;
  for (let k = 0; k < N; k++){ const j = (P.k + k) % N; if (!P.on[j]){ i = j; break; } }
  if (i < 0){ i = P.k; } // réserve pleine : la plus vieille place est reprise
  P.k = (i + 1) % N;
  P.on[i] = 1; P.x[i] = x; P.y[i] = y; P.z[i] = z; P.vx[i] = vx; P.vy[i] = vy; P.vz[i] = vz;
  P.age[i] = 0; P.vie[i] = vie; P.ret[i] = ret; P.s0[i] = s0; P.s1[i] = s1; P.rot[i] = exH(0, 6.283); P.rv[i] = forme === EX_DEBRIS ? exH(-9, 9) : exH(-.6, .6);
  P.forme[i] = forme; P.add[i] = add; P.c0[i] = c0; P.c1[i] = c1; P.a0[i] = a0; P.grav[i] = grav; P.frein[i] = frein; P.monte[i] = monte; P.tr[i] = tr; P.sol[i] = sol ? 1 : 0;
  return i;
}
/* ---------- Réserve des marques au sol ---------- */
const EXS = (() => {
  const N = EX_REGL.sol, F = () => new Float32Array(N);
  return { N, x: F(), y: F(), z: F(), age: F(), vie: F(), s0: F(), s1: F(), rot: F(), forme: new Uint8Array(N), add: new Uint8Array(N),
    c: new Array(N).fill(EXC.noir), a0: F(), on: new Uint8Array(N), k: 0 };
})();
function exSol(x, z, vie, s0, s1, forme, add, c, a0){
  const S_ = EXS, N = S_.N; let i = -1, vieux = -1, va = -1;
  for (let k = 0; k < N; k++){ const j = (S_.k + k) % N; if (!S_.on[j]){ i = j; break; } const r = S_.age[j] / S_.vie[j]; if (r > va){ va = r; vieux = j; } }
  if (i < 0) i = vieux;
  S_.k = (i + 1) % N;
  S_.on[i] = 1; S_.x[i] = x; S_.z[i] = z; S_.y[i] = forme === EX_BRULE ? .035 + (i % 7) * .002 : .05; S_.age[i] = 0; S_.vie[i] = vie;
  S_.s0[i] = s0; S_.s1[i] = s1; S_.rot[i] = exH(0, 6.283); S_.forme[i] = forme; S_.add[i] = add; S_.c[i] = c; S_.a0[i] = a0;
}
const exN = n => { const v = n * EX.q; const b = Math.floor(v); return b + (exR() < v - b ? 1 : 0); };

/* ---------- Recettes ---------- */
// Explosion de sorte « kind » au point (x, y, z), de rayon r (le rayon de dégâts du jeu, seulement pour la taille)
function exBoum(kind, x, y, z, r){
  const T = EX_REGL.types[kind] || EX_REGL.types.grenade; EX.n[kind] = (EX.n[kind] || 0) + 1;
  const R = Math.max(1.2, r * T.taille), air = y > 2.2, y0 = Math.max(air ? y : .4, .3);
  // Éclair blanc, puis boule de feu qui gonfle vite, freine et monte
  exP(x, y0 + R * .25, z, 0, 0, 0, .16, 0, R * .55, R * 1.35, EX_FEU, 1, EXC.blanc, EXC.jaune, 1, 0, 0, 0, 0, false);
  for (let i = 0, n = exN(T.feu); i < n; i++){
    const a = exH(0, 6.283), up = air ? exH(-.8, 1) : exH(.15, 1), h = Math.sqrt(1 - up * up), v = R * exH(1.6, 3);
    exP(x, y0 + R * .2, z, Math.cos(a) * h * v, up * v, Math.sin(a) * h * v, exH(.5, .85), i * .012, R * exH(.38, .5), R * exH(.8, 1.1),
      EX_FEU, 1, EXC.feu0, EXC.feu1, .95, 0, 4.2, 3, 0, false);
  }
  // Fumée qui prend le relais : grosse, sombre, monte longtemps en s'éclaircissant
  for (let i = 0, n = exN(T.fumee); i < n; i++){
    const a = exH(0, 6.283), d = R * exH(.1, .45);
    exP(x + Math.cos(a) * d, y0 + R * exH(.2, .6), z + Math.sin(a) * d, Math.cos(a) * exH(.3, 1), exH(1.4, 2.6), Math.sin(a) * exH(.3, 1),
      exH(2.6, 4), exH(.1, .32), R * exH(.45, .6), R * exH(1.5, 2.1), EX_FUMEE, 0, T.fum, EXC.fumGris, exH(.55, .72), 0, .5, .25, 0, false);
  }
  // Étincelles en traits
  for (let i = 0, n = exN(T.etin); i < n; i++){
    const a = exH(0, 6.283), up = air ? exH(-.6, 1) : exH(.1, .95), h = Math.sqrt(1 - up * up), v = exH(9, 19) * Math.min(1.25, R / 4);
    exP(x, y0 + .3, z, Math.cos(a) * h * v, up * v, Math.sin(a) * h * v, exH(.35, .8), 0, exH(.05, .09), .025, EX_ETIN, 1, EXC.etin0, EXC.etin1, 1, 14, .6, 0, .045, false);
  }
  // Débris qui retombent et restent un moment au sol
  for (let i = 0, n = exN(T.debris); i < n; i++){
    const a = exH(0, 6.283), v = exH(4, 10) * Math.min(1.2, R / 4), sz = exH(.07, .17) * (kind === 'auto' ? 1.6 : 1);
    exP(x, y0 + .4, z, Math.cos(a) * v, exH(5, 12), Math.sin(a) * v, exH(1.6, 2.6), 0, sz, sz, EX_DEBRIS, 0, T.deb, T.deb, 1, 18, .3, 0, 0, true);
  }
  if (kind === 'baril') exP(x, y0 + .5, z, exH(-1.5, 1.5), exH(15, 19), exH(-1.5, 1.5), 2.8, 0, .28, .28, EX_DEBRIS, 0, EXC.couvercle, EXC.couvercle, 1, 18, .2, 0, 0, true);
  if (air && y > 6){ exLueur(x, z, R, T.lueur * .4); return; }
  // Poussière soufflée au ras du sol, onde de choc, lueur et trace brûlée
  for (let i = 0, n = exN(T.pouss); i < n; i++){
    const a = i / Math.max(1, T.pouss) * 6.283 + exH(-.3, .3), v = exH(6, 10) * Math.min(1.2, R / 4);
    exP(x + Math.cos(a) * .6, .35, z + Math.sin(a) * .6, Math.cos(a) * v, exH(.2, .8), Math.sin(a) * v, exH(1, 1.6), .03, R * .18, R * exH(.5, .7),
      EX_FUMEE, 0, EXC.pouss, EXC.poussClair, .32, 0, 3.2, .3, 0, false);
  }
  if (T.onde) exSol(x, z, .42, R * .25, R * 2.3 * T.onde, EX_ANNEAU, 1, EXC.onde, .38);
  exLueur(x, z, R, T.lueur);
  if (!air) exSol(x, z, EX_REGL.brulure.vie, R * exH(.75, .95), R * .95, EX_BRULE, 0, EXC.noir, .78);
}
function exLueur(x, z, R, k){ exSol(x, z, .5, R * 2.2, R * 2.8, EX_LUEUR, 1, EXC.lueur, .55 * k); }
// Le cocktail éclate : verre, souffle de feu bas et large, lueur
function exMolotov(x, z, r){
  EX.n.molotov++;
  for (let i = 0, n = exN(12); i < n; i++){
    const a = exH(0, 6.283), v = exH(3, 7);
    exP(x, .3, z, Math.cos(a) * v, exH(1.5, 4), Math.sin(a) * v, exH(.25, .5), 0, .05, .02, EX_ETIN, 1, EXC.verre0, EXC.verre1, 1, 14, .5, 0, .04, false);
  }
  for (let i = 0, n = exN(12); i < n; i++){
    const a = exH(0, 6.283), d = r * exH(0, .6), v = exH(1.5, 4);
    exP(x + Math.cos(a) * d, .4, z + Math.sin(a) * d, Math.cos(a) * v, exH(1.5, 3.2), Math.sin(a) * v, exH(.45, .8), i * .01, exH(.5, .8), exH(1.3, 1.9),
      EX_FEU, 1, EXC.feu0, EXC.feu1, .9, 0, 2.5, 2, 0, false);
  }
  exSol(x, z, .45, r * 1.5, r * 2.4, EX_LUEUR, 1, EXC.lueurMol, .6);
  exSol(x, z, EX_REGL.brulure.vie + 6, r * .9, r * 1.05, EX_BRULE, 0, EXC.noir, .7);
}
// Feu qui vit sur une nappe (rayon r, force f de 0 à 1) pendant dt
function exFeu(x, z, r, f, dt){
  const M = EX_REGL.molotov, area = Math.PI * r * r;
  let n = exN(M.taux * area * f * dt * 2);
  for (; n > 0; n--){
    const a = exH(0, 6.283), d = r * Math.sqrt(exR()) * .9, h = exH(.7, 1.2) * (.5 + .5 * f);
    if (n & 1) exP(x + Math.cos(a) * d, .1, z + Math.sin(a) * d, exH(-.2, .2), exH(1.4, 2.6) * h, exH(-.2, .2), exH(.4, .7), 0, exH(.55, .9) * h, exH(.2, .35),
      EX_FEU, 1, EXC.jaune, EXC.rouge, .85, 0, .6, 1.2, 0, false);
    else exP(x + Math.cos(a) * d, .25, z + Math.sin(a) * d, exH(-.15, .15), exH(2.2, 3.6) * h, exH(-.15, .15), exH(.35, .6), 0, exH(.28, .4) * h, .08,   // langue étirée vers le haut
      EX_ETIN, 1, EXC.feu0, EXC.rouge, .8, 0, .4, 1, exH(.22, .32), false);
  }
  if (exR() < M.fumee * dt * f * Math.min(1.5, r / 2)) exP(x + exH(-r, r) * .4, 1.2, z + exH(-r, r) * .4, exH(-.3, .3), exH(1.5, 2.4), exH(-.3, .3), exH(2.6, 3.6), 0, .9, exH(2.6, 3.6),
    EX_FUMEE, 0, EXC.fumMol, EXC.fumGris, .42 * f, 0, .3, .2, 0, false);
  if (exR() < M.braises * dt * f) exP(x + exH(-r, r) * .6, .6, z + exH(-r, r) * .6, exH(-.6, .6), exH(2.5, 4.5), exH(-.6, .6), exH(.8, 1.4), 0, .05, .03, EX_ETIN, 1, EXC.etin0, EXC.braise, 1, 1.2, .4, 0, .06, false);
}
// La nappe s'éteint : volutes grises
function exEteint(x, z, r){
  EX.n.eteint++;
  for (let i = 0, n = exN(EX_REGL.molotov.volutes); i < n; i++)
    exP(x + exH(-r, r) * .5, .5, z + exH(-r, r) * .5, exH(-.3, .3), exH(.8, 1.5), exH(-.3, .3), exH(2.2, 3.2), i * .08, .6, exH(1.8, 2.6), EX_FUMEE, 0, EXC.fumGris, EXC.vapeur, .38, 0, .3, .15, 0, false);
}
// Canon électromagnétique : air ionisé le long du rayon (de a à b), gerbe bleue au bout
function exRail(ax, ay, az, bx, by, bz){
  EX.n.rail++;
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.sqrt(dx * dx + dy * dy + dz * dz), n = Math.min(EX_REGL.rail.max, Math.floor(L / EX_REGL.rail.pas * EX.q));
  for (let i = 1; i <= n; i++){
    const u = (i + exR() * .5) / (n + 1);
    exP(ax + dx * u, ay + dy * u, az + dz * u, exH(-.4, .4), exH(-.1, .5), exH(-.4, .4), exH(.7, 1.2), u * .05, exH(.25, .42), .1, EX_FEU, 1, EXC.blanc, EXC.bleu0, 1, 0, .5, 0, 0, false);
  }
  exP(bx, by, bz, 0, 0, 0, .14, 0, .6, 1.6, EX_FEU, 1, EXC.blanc, EXC.bleu0, 1, 0, 0, 0, 0, false);
  for (let i = 0, k = exN(14); i < k; i++){
    const a = exH(0, 6.283), up = exH(-.2, 1), h = Math.sqrt(1 - up * up), v = exH(6, 14);
    exP(bx, by + .1, bz, Math.cos(a) * h * v, up * v, Math.sin(a) * h * v, exH(.25, .55), 0, .05, .02, EX_ETIN, 1, EXC.bleu0, EXC.bleu1, 1, 12, .6, 0, .04, false);
  }
  if (by < .8){ exSol(bx, bz, .35, .3, 2.4, EX_ANNEAU, 1, EXC.ondeBleu, .6); exSol(bx, bz, .4, 1.6, 2.4, EX_LUEUR, 1, EXC.lueurBleu, .5); exSol(bx, bz, 9, .55, .6, EX_BRULE, 0, EXC.noir, .6); }
}

/* ---------- Ce qui vient de naître dans les réserves du jeu ---------- */
const EXV = { pw: [], arm: [], rue: [], car: [], beam: [], puddle: [], strike: [], plane: false, planeT: 0, neufMol: [], neufBombe: [] };
function exPres(L, x, z){ for (let i = 0; i < L.length; i++){ const p = L[i]; if ((p.x - x) * (p.x - x) + (p.z - z) * (p.z - z) < .5) return true; } return false; }
const exFrais = (b, pr) => b.m.visible && (!pr || !pr.vis || b.life > pr.life + 1e-6);
const exNote = (L, i, vis, life) => { const o = L[i] || (L[i] = { vis: false, life: 0, t: 0, x: 0, z: 0, r: 0 }); o.vis = vis; o.life = life; return o; };
let exRailCol = 0x60c8ff;
const exD = new THREE.Vector3(), exQ = new THREE.Quaternion();
function exLire(dt){
  // Pouvoirs (js/21) : nappes neuves, bombes tombées, puis éclairs neufs qui restent = grenades
  const neufMol = EXV.neufMol, neufBombe = EXV.neufBombe; neufMol.length = neufBombe.length = 0;
  if (typeof pwPuddles === 'object'){
    pwPuddles.forEach((p, i) => {
      const o = EXV.puddle[i] || (EXV.puddle[i] = { live: false, t: 0, x: 0, z: 0, r: 0 });
      if (p.live && (!o.live || p.t > o.t + .05)){ neufMol.push(p); exMolotov(p.x, p.z, p.r); exSonFait('molotov', p.x, .3, p.z, p.r); }
      if (!p.live && o.live && o.t < .3) exEteint(o.x, o.z, o.r);       // éteinte d'elle-même (pas rangée en pleine vie)
      if (p.live){ const f = Math.min(1, p.t / 1, (p.dur - p.t) / .2 + .3); exFeu(p.x, p.z, p.r, f, dt); }
      o.live = p.live; o.t = p.t; o.x = p.x; o.z = p.z; o.r = p.r;
    });
  }
  if (typeof pwStrikes === 'object'){
    pwStrikes.forEach((k, i) => {
      const o = EXV.strike[i] || (EXV.strike[i] = { live: false, done: [] });
      if (k.live && !o.live){ EX.n.annonce++; exSonFait('annonce', k.x, 0, k.z, k.r); }
      if (k.live){
        for (let j = 0; j < k.bombs.length; j++){
          const b = k.bombs[j];
          if (j < k.n && b.done && o.done[j] === false && k.t >= b.at){ neufBombe.push(b); exBoum('bombe', b.x, 0, b.z, k.r); exSonFait('bombe', b.x, 0, b.z, j); }
          o.done[j] = b.done;
        }
        if (k.t < k.delay){ // gerbe rouge de la fusée pendant l'attente
          if (exR() < 22 * dt * EX.q) exP(k.x, .2, k.z, exH(-1, 1), exH(3, 5.5), exH(-1, 1), exH(.4, .8), 0, .06, .03, EX_ETIN, 1, EXC.rougeF, EXC.rougeA, 1, 9, .3, 0, .05, false);
        }
      } else k.bombs.forEach((b, j) => { o.done[j] = b.done; });
      o.live = k.live;
    });
  }
  if (typeof pwBooms === 'object'){
    pwBooms.forEach((b, i) => {
      const pr = EXV.pw[i];
      if (exFrais(b, pr)){
        const x = b.m.position.x, y = b.m.position.y, z = b.m.position.z;
        if (!exPres(neufMol, x, z) && !exPres(neufBombe, x, z)){ const r = b.size / 2.3; exBoum('grenade', x, y > 1 ? y : 0, z, r); exSonFait('grenade', x, y, z, r); }
      }
      exNote(EXV.pw, i, b.m.visible, b.life);
    });
  }
  // Roquettes et lance-grenades (js/20)
  if (typeof ARM === 'object' && ARM.booms){
    ARM.booms.forEach((b, i) => {
      if (exFrais(b, EXV.arm[i])){
        const p = b.m.position, r = b.size / 2.4, k = S && S.cur === 'gl' ? 'gl' : 'roquette';
        exBoum(k, p.x, p.y < 1.2 ? 0 : p.y, p.z, r); exSonFait(k, p.x, p.y, p.z, r);
      }
      exNote(EXV.arm, i, b.m.visible, b.life);
    });
  }
  // Barils (js/23) : un feu neuf est laissé par chaque baril qui saute ; puis le feu vit sur place
  if (typeof RUE === 'object' && RUE.fires){
    RUE.fires.forEach((f, i) => {
      const o = EXV.rue[i] || (EXV.rue[i] = { vis: false, t: 0 });
      const p = f.g.position;
      if (f.g.visible && (!o.vis || f.t > o.t + .5)){ exBoum('baril', p.x, 0, p.z, typeof RUE_CFG === 'object' ? RUE_CFG.barRadius : 6); exSonFait('baril', p.x, .6, p.z, 6); }
      if (f.g.visible && f.t > 0) exFeu(p.x, p.z, EX_REGL.barilFeu, Math.min(1, f.t / 1.2), dt);
      o.vis = f.g.visible; o.t = f.t;
    });
  }
  // Auto lancée par le boss, abattue en l'air (js/19)
  if (typeof bossCars === 'object'){
    bossCars.forEach((c, i) => {
      const o = EXV.car[i] || (EXV.car[i] = { vis: false });
      if (o.vis && !c.m.visible && c.hp <= 0 && state === 'playing'){ const p = c.m.position; exBoum('auto', p.x, Math.max(p.y, 2.3), p.z, EX_REGL.rayonAuto); exSonFait('auto', p.x, p.y, p.z, 3); }
      o.vis = c.m.visible;
    });
  }
  // Canon électromagnétique (js/34) : un rayon neuf de la couleur du canon
  if (typeof arsBeams === 'object'){
    if (typeof WEAPONS === 'object' && WEAPONS.railgun && WEAPONS.railgun.beam) exRailCol = WEAPONS.railgun.beam.c;
    arsBeams.forEach((b, i) => {
      if (exFrais(b, EXV.beam[i]) && b.m.material.color.getHex() === exRailCol){
        const m = b.m, L = m.scale.z * .5; exD.set(0, 0, 1).applyQuaternion(m.quaternion);
        const ax = m.position.x - exD.x * L, ay = m.position.y - exD.y * L, az = m.position.z - exD.z * L;
        const bx = m.position.x + exD.x * L, by = m.position.y + exD.y * L, bz = m.position.z + exD.z * L;
        exRail(ax, ay, az, bx, by, bz); exSonFait('rail', bx, by, bz, 1);
      }
      exNote(EXV.beam, i, b.m.visible, b.life);
    });
  }
  // Avion de la frappe : traînées au bout des ailes, lueur des moteurs
  if (typeof pwPlane === 'object'){
    const v = pwPlane.visible;
    if (v && !EXV.plane){ EX.n.avion++; exSonFait('avion', pwPlane.position.x, pwPlane.position.y, pwPlane.position.z, 1); }
    if (v){
      EXV.planeT -= dt;
      const p = pwPlane.position;
      while (EXV.planeT <= 0){
        EXV.planeT += EX_REGL.avion.trainee;
        for (let s = -1; s <= 1; s += 2) exP(p.x + s * 7.4, p.y + .1, p.z + 1.4, 0, 0, -1, EX_REGL.avion.vie, 0, .22, exH(.9, 1.3), EX_ETIN, 0, EXC.blancCiel, EXC.vapeur, .6, 0, 0, 0, EX_REGL.avion.long, false);
      }
      exP(p.x, p.y + .1, p.z + 4.8, 0, 0, 0, .06, 0, 1.1, .9, EX_FEU, 1, EXC.jaune, EXC.orange, .8, 0, 0, 0, 0, false);
    }
    EXV.plane = v;
  }
}

/* ---------- Chaque image : avancer et remplir les deux géométries ---------- */
function exPas(dt){
  const P = EXP;
  for (let i = 0; i < P.N; i++){
    if (!P.on[i]) continue;
    if (P.ret[i] > 0){ P.ret[i] -= dt; continue; }
    P.age[i] += dt; if (P.age[i] >= P.vie[i]){ P.on[i] = 0; continue; }
    const fr = Math.exp(-P.frein[i] * dt);
    P.vx[i] *= fr; P.vz[i] *= fr; P.vy[i] = P.vy[i] * fr + (P.monte[i] - P.grav[i]) * dt;
    P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; P.z[i] += P.vz[i] * dt;
    P.rot[i] += P.rv[i] * dt;
    if (P.sol[i] && P.y[i] < .06){ P.y[i] = .06; if (P.vy[i] < -2){ P.vy[i] *= -.25; P.vx[i] *= .5; P.vz[i] *= .5; } else { P.vy[i] = 0; P.vx[i] *= .7; P.vz[i] *= .7; P.rv[i] *= .7; } }
    else if (P.y[i] < .08 && P.forme[i] !== EX_DEBRIS){ P.y[i] = .08; if (P.vy[i] < 0) P.vy[i] = 0; }
  }
  const S_ = EXS;
  for (let i = 0; i < S_.N; i++){ if (!S_.on[i]) continue; S_.age[i] += dt; if (S_.age[i] >= S_.vie[i]) S_.on[i] = 0; }
}
function exEcrire(){
  const P = EXP, B = EXB.b, pa = B.pos.array, va = B.vel.array, ia = B.info.array, ca = B.col.array;
  let n = 0;
  for (let pass = 0; pass < 2; pass++){ // fumée et débris d'abord, puis le feu par-dessus
    for (let i = 0; i < P.N; i++){
      if (!P.on[i] || P.ret[i] > 0 || P.add[i] !== pass) continue;
      const u = P.age[i] / P.vie[i], f = P.forme[i];
      let s, a;
      if (f === EX_FUMEE){ s = P.s0[i] + (P.s1[i] - P.s0[i]) * (1 - (1 - u) * (1 - u)); a = Math.min(1, u / .12) * Math.pow(1 - u, 1.3); }
      else if (f === EX_DEBRIS){ s = P.s0[i]; a = u > .8 ? (1 - u) / .2 : 1; }
      else if (f === EX_ETIN){ s = P.s0[i] + (P.s1[i] - P.s0[i]) * u; a = 1 - u * u; }
      else { s = P.s0[i] + (P.s1[i] - P.s0[i]) * (1 - (1 - u) * (1 - u)); a = Math.pow(1 - u, 1.15); }
      const c0 = P.c0[i], c1 = P.c1[i], k = f === EX_FUMEE ? u : Math.min(1, u * 1.4);
      pa[n * 3] = P.x[i]; pa[n * 3 + 1] = P.y[i]; pa[n * 3 + 2] = P.z[i];
      if (f === EX_ETIN){ va[n * 4] = P.vx[i]; va[n * 4 + 1] = P.vy[i]; va[n * 4 + 2] = P.vz[i]; va[n * 4 + 3] = P.tr[i]; }
      else { va[n * 4] = va[n * 4 + 1] = va[n * 4 + 2] = 0; va[n * 4 + 3] = 0; }
      ia[n * 4] = s; ia[n * 4 + 1] = P.rot[i]; ia[n * 4 + 2] = f; ia[n * 4 + 3] = P.add[i];
      ca[n * 4] = c0[0] + (c1[0] - c0[0]) * k; ca[n * 4 + 1] = c0[1] + (c1[1] - c0[1]) * k; ca[n * 4 + 2] = c0[2] + (c1[2] - c0[2]) * k; ca[n * 4 + 3] = P.a0[i] * a;
      n++;
    }
  }
  B.g.instanceCount = n; EXB.mb.visible = n > 0; EX.vus = n;
  if (n){ B.pos.needsUpdate = B.vel.needsUpdate = B.info.needsUpdate = B.col.needsUpdate = true; }
  // Sol : marques de la réserve, puis ce qui suit l'état du jeu (lueur des nappes, anneau de la frappe qui attend)
  const G = EXB.s, S_ = EXS, M = S_.N, met = exMet;
  EX.m = 0;
  for (let pass = 0; pass < 2; pass++){
    for (let i = 0; i < M; i++){
      if (!S_.on[i] || S_.add[i] !== pass) continue;
      const u = S_.age[i] / S_.vie[i], f = S_.forme[i];
      let s = S_.s0[i] + (S_.s1[i] - S_.s0[i]) * (f === EX_BRULE ? Math.min(1, u * 30) : 1 - (1 - u) * (1 - u)), a;
      if (f === EX_BRULE){ const ef = EX_REGL.brulure.efface, rest = S_.vie[i] - S_.age[i]; a = Math.min(1, S_.age[i] / .15) * Math.min(1, rest / ef); }
      else if (f === EX_ANNEAU) a = 1 - u;
      else a = Math.pow(1 - u, 1.6);
      met(S_.x[i], S_.y[i], S_.z[i], s, S_.rot[i], f, S_.add[i], S_.c[i], S_.a0[i] * a);
    }
    if (pass === 1){
      if (typeof pwPuddles === 'object') pwPuddles.forEach(p => {
        if (!p.live) return; const f = Math.min(1, p.t / 1, (p.dur - p.t) / .2 + .3), fl = .85 + .15 * Math.sin(EX.t * 11 + p.x) * Math.sin(EX.t * 7.3);
        met(p.x, .06, p.z, p.r * 1.9, 0, EX_LUEUR, 1, EXC.lueurMol, .42 * f * fl);
      });
      if (typeof RUE === 'object' && RUE.fires) RUE.fires.forEach(f => { if (f.g.visible && f.t > 0) met(f.g.position.x, .06, f.g.position.z, 3.2, 0, EX_LUEUR, 1, EXC.lueurMol, .38 * Math.min(1, f.t / 1.2)); });
      if (typeof pwStrikes === 'object') pwStrikes.forEach(k => {
        if (!k.live || k.t >= k.delay) return; const b = .5 + .5 * Math.sin(EX.t * 12);
        met(k.x, .07, k.z, k.r * (1 + .12 * b), 0, EX_ANNEAU, 1, EXC.rougeA, .35 + .4 * b);
        met(k.x, .06, k.z, k.r * 1.3, 0, EX_LUEUR, 1, EXC.rougeA, .18 + .15 * b);
      });
    }
  }
  const m = EX.m; G.g.instanceCount = m; EXB.ms.visible = m > 0; EX.solVus = m;
  if (m){ G.pos.needsUpdate = G.info.needsUpdate = G.col.needsUpdate = true; }
}
// Une marque au sol écrite directement dans la géométrie (réserve ou état du jeu)
function exMet(x, y, z, s, rot, f, add, c, a){
  const G = EXB.s, m = EX.m; if (m >= EXS.N) return;
  const gp = G.pos.array, gi = G.info.array, gc = G.col.array;
  gp[m * 3] = x; gp[m * 3 + 1] = y; gp[m * 3 + 2] = z; gi[m * 4] = s; gi[m * 4 + 1] = rot; gi[m * 4 + 2] = f; gi[m * 4 + 3] = add;
  gc[m * 4] = c[0]; gc[m * 4 + 1] = c[1]; gc[m * 4 + 2] = c[2]; gc[m * 4 + 3] = a; EX.m = m + 1;
}
// Les cônes de flamme d'origine des nappes (js/21) sont cachés pendant que ce fichier dessine le feu, remis sinon
function exCones(v){
  if (typeof pwPuddles !== 'object' || EX.cones === v) return;
  EX.cones = v; pwPuddles.forEach(p => p.flames.forEach(f => { f.m.visible = v; }));
}
function exVider(){
  EXP.on.fill(0); EXS.on.fill(0);
  EXB.b.g.instanceCount = 0; EXB.s.g.instanceCount = 0; EXB.mb.visible = EXB.ms.visible = false; EX.vus = EX.solVus = 0;
  EXV.puddle.forEach(o => { o.live = false; }); EXV.rue.forEach(o => { o.vis = false; });
}
// Haute définition et Ultra : rendu en couleurs linéaires (les couleurs données en sRGB sont converties dans le nuanceur)
function exHD(){ return typeof styleHD === 'function' && !!styleHD() && typeof HD === 'object' && !!HD.pret && !HD.casse; }
const exToit = () => EX_REGL.on && !(typeof Jeu === 'object' && Jeu.actif()) && !!S;
function exImage(dt){
  dt = Math.min(.1, dt || 0);
  const toit = exToit(), pause = state === 'paused';
  if (!toit || (state !== 'playing' && !pause)){
    if (EX.actif){ exVider(); EX.actif = false; exCones(true); if (typeof exSonCouper === 'function') exSonCouper(); }
    exLireSeul(); return;
  }
  EX.actif = true;
  const lin = exHD() ? 1 : 0; EXB.mb.material.uniforms.uLin.value = lin; EXB.ms.material.uniforms.uLin.value = lin;
  EXB.ms.material.uniforms.uAdd.value = lin ? .45 : 1; // en HD, l'exposition et l'éclat blanchissaient les lueurs au sol
  exCones(false);
  if (pause){ if (typeof exSonCouper === 'function') exSonCouper(); return; }   // en pause : tout reste figé, sons coupés net
  EX.ema += (dt - EX.ema) * .05;
  EX.q = EX_REGL.qualite * (EX.ema > 1 / 28 ? .55 : EX.ema > 1 / 40 ? .8 : 1);
  EX.t += dt;
  exLire(dt);
  exPas(dt);
  exEcrire();
  if (typeof exSonImage === 'function') exSonImage(dt);
}
// Hors du toit : on note seulement l'état des réserves (rien ne naîtra en retard au retour)
function exLireSeul(){
  if (typeof pwBooms === 'object') pwBooms.forEach((b, i) => exNote(EXV.pw, i, b.m.visible, b.life));
  if (typeof ARM === 'object' && ARM.booms) ARM.booms.forEach((b, i) => exNote(EXV.arm, i, b.m.visible, b.life));
  if (typeof arsBeams === 'object') arsBeams.forEach((b, i) => exNote(EXV.beam, i, b.m.visible, b.life));
  if (typeof RUE === 'object' && RUE.fires) RUE.fires.forEach((f, i) => { const o = EXV.rue[i] || (EXV.rue[i] = {}); o.vis = f.g.visible; o.t = f.t; });
  if (typeof pwPuddles === 'object') pwPuddles.forEach((p, i) => { const o = EXV.puddle[i] || (EXV.puddle[i] = {}); o.live = p.live; o.t = p.t; o.x = p.x; o.z = p.z; o.r = p.r; });
  if (typeof pwStrikes === 'object') pwStrikes.forEach((k, i) => { const o = EXV.strike[i] || (EXV.strike[i] = { done: [] }); o.live = k.live; k.bombs.forEach((b, j) => { o.done[j] = b.done; }); });
  if (typeof bossCars === 'object') bossCars.forEach((c, i) => { const o = EXV.car[i] || (EXV.car[i] = {}); o.vis = c.m.visible; });
  if (typeof pwPlane === 'object') EXV.plane = pwPlane.visible;
}
const exSonFait = (quoi, x, y, z, k) => { if (typeof exSon === 'function'){ try { exSon(quoi, x, y, z, k); } catch (e) { errNote(e); } } };
Jeu.on('image', dt => { try { exImage(dt); } catch (e) { errNote(e); } });

// Accès pour les tests automatiques et les mesures
window.__explosions = { EX, EX_REGL, EXP, EXS, EXB, EXV, exR, exBoum, exMolotov, exFeu, exRail, exVider, exImage, exHD,
  get bouffees(){ let n = 0; for (let i = 0; i < EXP.N; i++) if (EXP.on[i]) n++; return n; },
  get marques(){ let n = 0; for (let i = 0; i < EXS.N; i++) if (EXS.on[i]) n++; return n; } };
