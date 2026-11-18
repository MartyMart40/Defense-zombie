'use strict';
/* ================= Ciel et météo du toit (dossier 127) : visuel seulement ================= */
// Par-dessus le ciel peint de la ville (js/36-rendu.js) et la météo (js/22-ambiance.js), sans rien changer au jeu :
// aucun chiffre, aucune brume, aucune lumière de la rue ne change ; aucun tirage dans Math.random (objets créés dans
// cielCalme, comme fusionCalme de js/03-scene-fusion.js, et générateur à part pour le reste).
//   - Dôme du ciel (un seul maillage, un seul shader, centré sur la caméra) : zénith plus profond (cache aussi le pli du
//     ciel peint au-dessus de la tête), deux couches de nuages qui dérivent à des vitesses différentes, éclairées par le
//     soleil (bords dorés au coucher), plus basses, plus lourdes et plus rapides par orage, couvert gris sous la pluie ;
//     étoiles qui scintillent, voie lactée par nuit claire, lune avec sa phase du jour et son halo ; rideaux de pluie au
//     loin ; lueur de l'éclair dans les nuages. Il remplace les nuages en sprites de js/36 et la lune et les étoiles de
//     js/22 (cachés pendant ce temps) : moins d'appels de dessin qu'avant.
//   - Éclair visible dans le ciel à chaque coup de tonnerre de js/22 (ruban en zigzag, un dixième de seconde, plus
//     doux quand « Secousses » est coupé). La lumière de l'éclair sur la rue reste celle de js/22.
//   - Pluie : les gouttes deviennent des traits qui s'effacent vers la queue et penchent avec le vent ; éclaboussures
//     sur la rue, le toit et les sacs (une seule géométrie, animée dans le shader).
//   - Neige, cendres, feuilles, grêle, poussière : flocons de tailles variées (même géométrie, un attribut de plus).
// Où : le toit, en Actuel et en Amélioré (pas en qualité basse). En Haute définition et Ultra, la lumière HDR et les
// couleurs linéaires ne s'accordent pas avec ce shader : tout est caché et le ciel d'avant revient. Robot et RTS : rien.
// Branché seulement par Jeu.on('image') (après js/36 et js/22, avant le rendu) : aucun autre fichier n'est touché.
const CIEL_REGL = {
  on: true,
  // Par météo : couv (part du ciel couvert, 0 à 1), dens (opacité des nuages), ech (taille : plus grand = plus bas),
  // vit (vitesse du vent), sombre (0 clair à 1 noir d'orage), rid (rideaux de pluie au loin), vent (pente des gouttes),
  // long (queue des gouttes en plus, m), zen (zénith plus profond), etoiles (0 à 1), voie (voie lactée)
  meteo: {
    clair:      { couv:.38, dens:.75, ech:.55, vit:1,   sombre:.15 },
    soleil:     { couv:.2,  dens:.7,  ech:.5,  vit:.8,  sombre:.05 },
    canicule:   { couv:.06, dens:.5,  ech:.45, vit:.4,  sombre:0 },
    coucher:    { couv:.36, dens:.8,  ech:.55, vit:.8,  sombre:.2 },
    aube:       { couv:.32, dens:.75, ech:.55, vit:.7,  sombre:.15 },
    vent:       { couv:.4,  dens:.8,  ech:.5,  vit:3.2, sombre:.2 },
    pluie:      { couv:.86, dens:.92, ech:.8,  vit:1.6, sombre:.55, rid:.7, vent:.18, long:.2 },
    orage:      { couv:.97, dens:.97, ech:1.05,vit:2.6, sombre:.85, rid:1,  vent:.45, long:.5 },
    grele:      { couv:.88, dens:.92, ech:.85, vit:2,   sombre:.6,  rid:.4, vent:.25, long:.1 },
    brouillard: { couv:.7,  dens:.4,  ech:.7,  vit:.3,  sombre:.3 },
    poussiere:  { couv:.6,  dens:.6,  ech:.6,  vit:3.6, sombre:.25 },
    nuit:       { couv:.55, dens:.85, ech:.6,  vit:.8,  sombre:.6,  etoiles:.35 },
    nuitClaire: { couv:.12, dens:.6,  ech:.5,  vit:.5,  sombre:.4,  etoiles:1, voie:1 },
    neige:      { couv:.82, dens:.88, ech:.75, vit:.9,  sombre:.35 },
    cendres:    { couv:.62, dens:.8,  ech:.65, vit:1.2, sombre:.5 },
    tornade:    { couv:.9,  dens:.95, ech:1,   vit:2.8, sombre:.75, rid:.5 }
  },
  // Par ville (ajouté à la météo) : la Centrale fume
  villes: { centrale: { couv:.12 } },
  zen: .55,            // zénith plus profond (part du mélange tout en haut)
  etoilesNuitVille: .8, // étoiles quand la ville est de nuit (Banlieue Nord, Centrale) et que la météo n'a pas son ciel
  eclair: { vu:.35, doux:.55, larg:1.1 }, // l'éclair se voit tant que AMB.flash > vu ; doux : force si Secousses est coupé
  eclab: { n:300, nCell:120, taille:.32 }, // éclaboussures
  octaves: 5, octavesCell: 4
};

// Générateur à part : le jeu ne voit aucun tirage de plus
let cielGr = 127;
const cielRnd = () => { cielGr = cielGr * 16807 % 2147483647; return (cielGr - 1) / 2147483646; };
function cielCalme(fn){ const R = Math.random; Math.random = cielRnd; try { return fn(); } finally { Math.random = R; } }

const CIEL = { t:0, d1:new THREE.Vector2(3.1, 7.7), d2:new THREE.Vector2(11.3, 2.9), strikes:0, actif:false, pluiePatch:false, flocPatch:false,
  cols:{}, v:new THREE.Vector3(), c:new THREE.Color(), c2:new THREE.Color(), c3:new THREE.Color(), eclairOp:0 };
const cielU = {
  uTemps:{ value:0 }, uPx:{ value:600 }, uOp:{ value:1 },
  uCouv:{ value:.3 }, uDens:{ value:.7 }, uEch:{ value:.55 }, uDep1:{ value:new THREE.Vector2() }, uDep2:{ value:new THREE.Vector2() },
  uNuageB:{ value:new THREE.Color() }, uNuageL:{ value:new THREE.Color() }, uSombre:{ value:0 },
  uZenith:{ value:new THREE.Color() }, uZenA:{ value:.5 },
  uSoleilDir:{ value:new THREE.Vector3(0, .1, -1) }, uSoleil:{ value:0 }, uSoleilCol:{ value:new THREE.Color(1, .9, .7) },
  uLuneDir:{ value:new THREE.Vector3(0, .3, -1) }, uLune:{ value:0 }, uPhase:{ value:.5 },
  uEtoiles:{ value:0 }, uEtR:{ value:.15 }, uVoie:{ value:0 },
  uRideaux:{ value:0 }, uEclair:{ value:0 }, uEclairDir:{ value:new THREE.Vector3(0, .3, -1) }
};
const cielOn = { value:0 }, cielVent = { value:0 }, cielLong = { value:0 }; // pluie et flocons (js/22) : 0 = comme avant

const CIEL_VERT = `
varying vec3 vDir;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const CIEL_FRAG = `
uniform float uTemps, uPx, uOp, uCouv, uDens, uEch, uSombre, uZenA, uSoleil, uLune, uPhase, uEtoiles, uEtR, uVoie, uRideaux, uEclair;
uniform vec2 uDep1, uDep2;
uniform vec3 uNuageB, uNuageL, uZenith, uSoleilDir, uSoleilCol, uLuneDir, uEclairDir;
varying vec3 vDir;
float h1(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float h3(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h1(i), h1(i + vec2(1.0, 0.0)), f.x), mix(h1(i + vec2(0.0, 1.0)), h1(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float s = 0.0, a = .5;
  for (int i = 0; i < OCT; i++){ s += a * vn(p); p = p * 2.03 + vec2(17.1, 9.2); a *= .5; }
  return s / (1.0 - pow(.5, float(OCT)));
}
void over(inout vec3 C, inout float A, vec3 c, float a){ C = c * a + C * (1.0 - a); A = a + A * (1.0 - a); }
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  if (h < -.01) discard;
  float hz = smoothstep(-.01, .09, h);
  vec3 C = vec3(0.0); float A = 0.0;
  // Zénith plus profond (et plus de pli du ciel peint au-dessus de la tête)
  over(C, A, uZenith, uZenA * smoothstep(.3, .97, h));
  // Nuages : deux couches projetées sur un plan, la seconde plus fine et plus rapide
  vec2 p = d.xz / (h + .1);
  float n1 = fbm(p * uEch + uDep1);
  float n2 = fbm(p * uEch * 2.3 + uDep2 + n1 * .8);
  float n = n1 * .62 + n2 * .38;
  float thr = mix(.8, .2, uCouv);
  float cov = smoothstep(thr - .05, thr + .09 + .08 * uSombre, n);
  float coeur = smoothstep(thr, thr + .32, n);
  float cA = cov * uDens * mix(.3, 1.0, smoothstep(.0, .28, h)) * hz;
  // Étoiles et voie lactée (derrière les nuages)
  if (uEtoiles > 0.0 && h > .04){
    vec3 q = d * 150.0, ce = floor(q), f = fract(q);
    float hs = h3(ce);
    if (hs > .86){
      vec3 sp = vec3(h3(ce + 1.7), h3(ce + 3.1), h3(ce + 5.3)) * .6 + .2;
      float s = smoothstep(uEtR, 0.0, length(f - sp)) * (.55 + .45 * sin(uTemps * (1.5 + hs * 6.0) + hs * 91.0));
      s *= smoothstep(.04, .2, h) * (hs > .985 ? 1.0 : .6) * uEtoiles * (1.0 - cA);
      over(C, A, mix(vec3(.85, .9, 1.0), vec3(1.0, .9, .78), step(.95, h3(ce + 9.1))), clamp(s, 0.0, 1.0));
    }
  }
  if (uVoie > 0.0){
    vec3 nv = normalize(vec3(.42, .55, .72));
    float b = dot(d, nv), bande = exp(-b * b * 26.0);
    float m = bande * (.35 + .65 * fbm(vec2(atan(d.x, d.z) * 4.0, d.y * 9.0))) * smoothstep(.05, .35, h);
    over(C, A, vec3(.72, .78, .95), .16 * m * uVoie * (1.0 - cA));
  }
  // Lune : disque avec sa phase, lueur cendrée, mers, halo
  if (uLune > 0.0){
    float cl = dot(d, uLuneDir), R = .026;
    float ang = acos(clamp(cl, -1.0, 1.0));
    float halo = exp(-ang * 9.0) * .32 + exp(-ang * 40.0) * .3;
    over(C, A, vec3(.62, .72, 1.0), clamp(halo * uLune * (1.0 - cA * .6), 0.0, 1.0));
    if (ang < R * 1.15){
      vec3 T = normalize(cross(uLuneDir, vec3(0.0, 1.0, 0.0))), B = cross(T, uLuneDir);
      vec2 xy = vec2(dot(d, T), dot(d, B)) / R;
      float r2 = dot(xy, xy);
      float bord = smoothstep(1.0, .9, sqrt(r2));
      vec3 nm = vec3(xy, sqrt(max(0.0, 1.0 - r2)));
      float ph = uPhase * 6.2832;
      vec3 Ld = vec3(sin(ph), 0.0, -cos(ph));
      float lit = smoothstep(-.06, .12, dot(nm, Ld));
      float mer = .82 + .18 * vn(xy * 3.2 + 4.0) - .14 * smoothstep(.55, .7, vn(xy * 1.7 + 9.0));
      vec3 c = mix(vec3(.13, .15, .2), vec3(.98, .97, .9) * mer, lit);
      over(C, A, c, bord * uLune * (1.0 - cA * .85));
    }
  }
  // Soleil haut dans le ciel : petit disque et couronne (le soleil bas reste la lueur de la ville)
  if (uSoleil > 0.0){
    float cs = dot(d, uSoleilDir), ang = acos(clamp(cs, -1.0, 1.0));
    float s = (smoothstep(.022, .016, ang) + exp(-ang * 22.0) * .35) * smoothstep(.04, .1, h);
    over(C, A, mix(uSoleilCol, vec3(1.0), .6), clamp(s * uSoleil * (1.0 - cA * .92), 0.0, 1.0));
  }
  // Couleur des nuages : base sombre au cœur, bords éclairés, côté du soleil doré, lueur de l'éclair
  float face = pow(max(dot(d, uSoleilDir), 0.0), 5.0);
  vec3 nc = mix(uNuageL, uNuageB, coeur * (.55 + .4 * uSombre));
  nc += uSoleilCol * face * (1.0 - coeur) * .55 * (1.0 - uSombre);
  float fl = uEclair * (.25 + 1.6 * exp(-(1.0 - dot(d, uEclairDir)) * 25.0));
  nc += vec3(.72, .78, 1.0) * fl * (.35 + .65 * cov);
  nc = min(nc, vec3(.82)); // sous le seuil de l'éclat d'Amélioré : pas de taches brûlées dans les nuages
  over(C, A, nc, cA);
  // Rideaux de pluie au loin : traînées verticales grises sous les nuages, par plaques
  if (uRideaux > 0.0 && h < .32){
    float az = atan(d.x, -d.z);
    float tr = vn(vec2(az * 140.0, h * 2.5 + uTemps * 1.8));
    float pl = smoothstep(.35, .75, vn(vec2(az * 2.6 + uTemps * .03, 3.7)));
    float ra = uRideaux * pl * smoothstep(.32, .04, h) * hz * (.55 + .45 * tr) * .5;
    over(C, A, uNuageB * 1.15 + vec3(.04), ra);
  }
  // Lueur de l'éclair sur tout le ciel (même s'il est dégagé)
  over(C, A, vec3(.75, .8, 1.0), clamp(uEclair * .18 * hz, 0.0, 1.0));
  A *= uOp;
  gl_FragColor = vec4(A > .001 ? C / max(A / uOp, .001) : vec3(0.0), A);
}`;

/* ---------- Objets (créés une fois, au chargement, sans tirage dans Math.random) ---------- */
const cielRoot = cielCalme(() => { const g = new THREE.Group(); g.name = 'ciel127'; scene.add(g); return g; }); // hors de world : disposeWorld n'y touche pas
const cielDome = cielCalme(() => {
  const m = new THREE.ShaderMaterial({ uniforms:cielU, vertexShader:CIEL_VERT, fragmentShader:CIEL_FRAG, transparent:true, depthWrite:false, side:THREE.BackSide, fog:false,
    defines:{ OCT:isTouch ? CIEL_REGL.octavesCell : CIEL_REGL.octaves } });
  m.userData.keep = true;
  const o = new THREE.Mesh(new THREE.SphereGeometry(280, 32, 16), m);
  o.frustumCulled = false; o.renderOrder = -10; o.visible = false; cielRoot.add(o); return o;
});
// Éclair : ruban en zigzag (branches comprises), refait à chaque coup avec le générateur à part
const CIEL_ECL_Q = 64;
const cielEclair = cielCalme(() => {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CIEL_ECL_Q * 18), 3)); g.setDrawRange(0, 0);
  const m = new THREE.MeshBasicMaterial({ color:0xe8eeff, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, fog:false, side:THREE.DoubleSide });
  const o = new THREE.Mesh(g, m); o.frustumCulled = false; o.visible = false; o.renderOrder = -9; cielRoot.add(o); return o;
});
// Éclaboussures : rue, surface du toit, dessus des sacs ; position et taille animées dans le shader
const cielEclab = cielCalme(() => {
  const N = isTouch ? CIEL_REGL.eclab.nCell : CIEL_REGL.eclab.n, pos = new Float32Array(N * 3), ph = new Float32Array(N * 2), r = cielRnd;
  for (let i = 0; i < N; i++){
    const k = i / N;
    if (k < .7){ pos[i * 3] = -12 + r() * 24; pos[i * 3 + 1] = .04; pos[i * 3 + 2] = -9 - Math.pow(r(), 1.4) * 50; }
    else if (k < .92){ pos[i * 3] = -8 + r() * 16; pos[i * 3 + 1] = 8.63; pos[i * 3 + 2] = -3.2 + r() * 4.2; }
    else { pos[i * 3] = -6 + r() * 12; pos[i * 3 + 1] = 8.9; pos[i * 3 + 2] = -3.76; }
    ph[i * 2] = r(); ph[i * 2 + 1] = .45 + r() * .5;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 2));
  const m = new THREE.ShaderMaterial({ transparent:true, depthWrite:false, fog:false,
    uniforms:{ uTemps:cielU.uTemps, uPx:cielU.uPx, uPluie:{ value:0 }, uTaille:{ value:CIEL_REGL.eclab.taille }, uCol:{ value:new THREE.Color(.75, .8, .88) },
      uFogN:{ value:20 }, uFogF:{ value:100 } },
    vertexShader:`
attribute vec2 aPh;
uniform float uTemps, uPx, uPluie, uTaille, uFogN, uFogF;
varying float vA, vT;
void main(){
  float c = uTemps / aPh.y + aPh.x * 7.0, cy = floor(c), t = fract(c);
  vec3 p = position;
  float s = position.y > 1.0 ? .5 : 1.0; // sur le toit : tout près, plus petites et moins dispersées
  p.x += (fract(sin(cy * 12.9898 + aPh.x * 78.233) * 43758.5453) - .5) * 2.4 * s * s;
  p.z += (fract(sin(cy * 39.346 + aPh.x * 11.135) * 24634.6345) - .5) * 2.4 * s * s;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float on = step(aPh.x * 1.5, uPluie);
  vT = t; vA = on * (1.0 - t) * (1.0 - smoothstep(uFogN, uFogF, -mv.z));
  gl_PointSize = on * clamp(uTaille * s * (.35 + t) * uPx / max(.5, -mv.z), 0.0, 40.0);
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader:`
uniform vec3 uCol;
varying float vA, vT;
void main(){
  vec2 q = gl_PointCoord - .5; q.y = q.y * 2.6 + .35;
  float r = length(q) * 2.0;
  float anneau = smoothstep(.5, .85, r) * smoothstep(1.0, .85, r);
  float goutte = smoothstep(.3, .0, r) * smoothstep(.25, .0, vT);
  float a = (anneau * .8 + goutte) * vA * .6;
  if (a < .01) discard;
  gl_FragColor = vec4(uCol, a);
}` });
  const o = new THREE.Points(g, m); o.frustumCulled = false; o.visible = false; cielRoot.add(o); return o;
});

/* ---------- Pluie et flocons de js/22 : un attribut et quelques lignes de shader (rien à faire si coupé) ---------- */
function cielPluiePatch(){
  if (CIEL.pluiePatch || typeof ambRain === 'undefined' || !ambRain) return;
  CIEL.pluiePatch = true;
  cielCalme(() => {
    const g = ambRain.o.geometry, n = g.attributes.position.count, b = new Float32Array(n);
    for (let i = 0; i < n; i++) b[i] = i % 2; // 0 : tête (en bas), 1 : queue
    g.setAttribute('cBout', new THREE.BufferAttribute(b, 1));
    const m = ambRain.o.material;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.cOn = cielOn; sh.uniforms.cVent = cielVent; sh.uniforms.cLong = cielLong;
      sh.vertexShader = 'attribute float cBout;\nuniform float cOn, cVent, cLong;\nvarying float vBout;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBout = cBout;\n  transformed.x += cBout * cVent * cOn;\n  transformed.y += cBout * cLong * cOn;');
      sh.fragmentShader = 'uniform float cOn;\nvarying float vBout;\n' +
        sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', 'gl_FragColor = vec4( outgoingLight, diffuseColor.a * mix(1.0, mix(1.55, .12, vBout), cOn) );');
    };
    m.customProgramCacheKey = () => 'ciel127pluie';
    m.needsUpdate = true;
  });
}
function cielFlocPatch(){
  if (CIEL.flocPatch || typeof ambFlakes === 'undefined' || !ambFlakes) return;
  CIEL.flocPatch = true;
  cielCalme(() => {
    const g = ambFlakes.o.geometry, n = g.attributes.position.count, t = new Float32Array(n);
    for (let i = 0; i < n; i++){ const r = cielRnd(); t[i] = .45 + 1.5 * r * r; } // beaucoup de petits, quelques gros
    g.setAttribute('cTaille', new THREE.BufferAttribute(t, 1));
    const m = ambFlakes.o.material;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.cOn = cielOn;
      sh.vertexShader = 'attribute float cTaille;\nuniform float cOn;\n' + sh.vertexShader.replace('gl_PointSize = size;', 'gl_PointSize = size * mix(1.0, cTaille, cOn);');
    };
    m.customProgramCacheKey = () => 'ciel127flocons';
    m.needsUpdate = true;
  });
}

/* ---------- Éclair ---------- */
function cielEclairRefaire(){
  const r = cielRnd, P = cielEclair.geometry.attributes.position, a = P.array;
  const az = (r() - .5) * 2.3, dist = 225, top = 70 + r() * 30;
  const dx = Math.sin(az), dz = -Math.cos(az), px = -dz, pz = dx; // direction et côté (perpendiculaire)
  let q = 0;
  const ruban = (pts, w) => {
    for (let i = 0; i < pts.length - 1 && q < CIEL_ECL_Q; i++){
      const A = pts[i], B = pts[i + 1], k = w * (1 - i / pts.length * .6);
      const v = [A[0] - px * k, A[1], A[2] - pz * k, A[0] + px * k, A[1], A[2] + pz * k, B[0] + px * k, B[1], B[2] + pz * k,
                 A[0] - px * k, A[1], A[2] - pz * k, B[0] + px * k, B[1], B[2] + pz * k, B[0] - px * k, B[1], B[2] - pz * k];
      for (let j = 0; j < 18; j++) a[q * 18 + j] = v[j];
      q++;
    }
  };
  const chemin = (x, y, z, n, pas, ecart) => {
    const pts = [[x, y, z]];
    for (let i = 0; i < n; i++){ const s = (r() - .5) * ecart; x += px * s; z += pz * s; y -= pas * (.6 + r() * .8); pts.push([x, y, z]); }
    return pts;
  };
  const W = CIEL_REGL.eclair.larg, cx = CIEL.cam.x + dx * dist, cz = CIEL.cam.z + dz * dist;
  const main = chemin(cx, top, cz, 18, top / 15, 14);
  ruban(main, W);
  for (let b = 0; b < 2; b++){
    const s = main[3 + Math.floor(r() * 8)];
    ruban(chemin(s[0], s[1], s[2], 6, top / 20, 12), W * .55);
  }
  P.needsUpdate = true; cielEclair.geometry.setDrawRange(0, q * 6);
  cielU.uEclairDir.value.set(dx * dist, top * .7 - CIEL.cam.y, dz * dist).normalize();
}

/* ---------- Chaque image ---------- */
function cielCol(hex){ if (!CIEL.cols[hex]) CIEL.cols[hex] = new THREE.Color(hex); return CIEL.cols[hex]; }
const cielLum = c => c.r * .299 + c.g * .587 + c.b * .114;
function cielActif(){
  if (!CIEL_REGL.on || typeof world === 'undefined' || !world) return false;
  if (typeof Jeu === 'object' && Jeu.actif && Jeu.actif()) return false;
  if (typeof styleHDPref === 'function' && styleHDPref()) return false;
  if (typeof gfxLevel === 'function' && gfxLevel() === 'bas') return false;
  return true;
}
function cielCacher(){
  if (!CIEL.actif) return;
  CIEL.actif = false; cielOn.value = 0;
  cielDome.visible = cielEclab.visible = cielEclair.visible = false;
  if (typeof AMB_X === 'object' && AMB_X.sky) AMB_X.sky.g.children.forEach(o => { o.visible = true; });
}
function cielImage(dt){
  if (!cielActif()){ cielCacher(); return; }
  CIEL.actif = true; cielOn.value = 1;
  cielPluiePatch(); cielFlocPatch();
  const nom = (typeof AMB === 'object' && AMB.weather) || 'clair', W = (typeof WEATHERS === 'object' && WEATHERS[nom]) || {}, R = CIEL_REGL;
  const M = Object.assign({ couv:.3, dens:.7, ech:.55, vit:1, sombre:.2, rid:0, vent:0, long:0, etoiles:0, voie:0 }, R.meteo[nom] || R.meteo.clair);
  const L = typeof curLoc === 'object' ? curLoc : null, V = (L && R.villes[L.id]) || {};
  const cam = CIEL.cam = camera.position, U = cielU, B = typeof AMB === 'object' ? AMB.base : null;
  CIEL.t += dt; U.uTemps.value = CIEL.t;
  cielDome.position.copy(cam); cielDome.visible = true;
  // Taille d'un pixel (étoiles, éclaboussures)
  const hpx = renderer.domElement.height || 600;
  U.uPx.value = hpx / (2 * Math.tan(camera.fov * Math.PI / 360));
  U.uEtR.value = clamp(1.4 * 150 / U.uPx.value, .06, .35);
  // Nuages
  const couv = clamp(M.couv + (V.couv || 0), 0, 1);
  U.uCouv.value = couv; U.uDens.value = M.dens; U.uEch.value = M.ech; U.uSombre.value = M.sombre;
  U.uOp.value = W.skyOp || 1;
  CIEL.d1.x -= dt * .012 * M.vit; CIEL.d1.y += dt * .002 * M.vit; CIEL.d2.x -= dt * .021 * M.vit; CIEL.d2.y += dt * .004 * M.vit;
  U.uDep1.value.copy(CIEL.d1); U.uDep2.value.copy(CIEL.d2);
  // Ciel de la météo (dégradé propre) ou de la ville
  const grad = W.skyGrad || (L && L.sky) || ['#203040', '#304860', '#6080a0', '#90a8c0', '#506070', '#304050'];
  const skyMul = B && B.sky ? B.sky.o.material.color : CIEL.c3.setScalar(1);
  const nuit = cielLum(cielCol(grad[2])) < .2 || !!W.night;
  const fog = scene.fog.color, sombre = M.sombre;
  // Base des nuages : couleur de la brume, assombrie par l'orage ; bords : plus clairs, teintés par le soleil
  const gf = cielLum(fog);
  U.uNuageB.value.copy(fog).lerp(CIEL.c.setRGB(gf * .92, gf * .97, gf * 1.12), .75 * sombre).multiplyScalar(nuit ? .75 : 1.05 - .5 * sombre);
  const solCol = B && B.sun ? B.sun.o.color : CIEL.c.setRGB(1, .9, .8);
  U.uNuageL.value.copy(cielCol(grad[3])).multiply(skyMul).lerp(fog, .3).lerp(solCol, nuit ? .05 : .25)
    .lerp(CIEL.c2.setRGB(1, .97, .92), nuit ? 0 : .2 * (1 - sombre)).multiplyScalar(nuit ? .55 : 1.15 - .55 * sombre);
  if (sombre > .3){ const gl = cielLum(U.uNuageL.value); U.uNuageL.value.lerp(CIEL.c2.setRGB(gl * .95, gl, gl * 1.08), .6 * sombre); }
  U.uSoleilCol.value.copy(solCol);
  // Zénith : la couleur du haut du ciel, multipliée comme le ciel peint
  U.uZenith.value.copy(cielCol(grad[0])).multiply(skyMul).lerp(cielCol(grad[1]), .2);
  U.uZenA.value = R.zen * (W.skyOp ? .4 : 1);
  // Soleil (ou lueur de la ville) et lune
  const spr = B && B.spr ? B.spr.o : null;
  if (spr) U.uSoleilDir.value.copy(spr.position).sub(cam).normalize();
  U.uSoleil.value = nuit ? 0 : (W.sun != null ? W.sun : 1);
  let lune = 0;
  if (W.moon && typeof AMB_X === 'object' && AMB_X.sky){
    const mo = AMB_X.sky.g.children[1];
    if (mo) U.uLuneDir.value.copy(mo.position).sub(cam).normalize();
    lune = 1;
  } else if (nuit && !W.skyGrad && L && cielLum(cielCol(L.sky[2])) < .2 && spr && couv < .7){ U.uLuneDir.value.copy(U.uSoleilDir.value); lune = .85; }
  U.uLune.value = lune;
  U.uPhase.value = cielPhase();
  if (typeof AMB_X === 'object' && AMB_X.sky) AMB_X.sky.g.children.forEach(o => { o.visible = false; }); // le dôme dessine lune, halo et étoiles
  // Étoiles et voie lactée
  U.uEtoiles.value = M.etoiles || (nuit && !W.skyGrad ? R.etoilesNuitVille : 0);
  U.uVoie.value = M.voie;
  U.uRideaux.value = M.rid;
  // Éclair (lumière de js/22, lue seulement) : un ruban dans le ciel à chaque coup de tonnerre
  const fl = typeof AMB === 'object' ? Math.max(0, AMB.flash || 0) : 0, doux = (typeof RS === 'object' && RS.on === false) ? R.eclair.doux : 1;
  if (typeof AMB === 'object' && AMB.strikes !== CIEL.strikes){ CIEL.strikes = AMB.strikes; cielEclairRefaire(); }
  U.uEclair.value = clamp(fl, 0, 1) * doux;
  const eo = clamp((fl - R.eclair.vu) / (1 - R.eclair.vu), 0, 1) * doux;
  cielEclair.visible = eo > .01; cielEclair.material.opacity = eo;
  // Nuages en sprites de js/36 : remplacés par le dôme
  if (typeof gfxClouds === 'object' && gfxClouds) for (let i = 0; i < gfxClouds.length; i++) gfxClouds[i].visible = false;
  // Pluie : traits penchés par le vent, éclaboussures
  const pl = W.rain || 0;
  cielVent.value = M.vent; cielLong.value = M.long;
  cielEclab.visible = pl > 0;
  if (pl > 0){
    const u = cielEclab.material.uniforms;
    u.uPluie.value = pl; u.uFogN.value = scene.fog.near; u.uFogF.value = scene.fog.far;
    u.uCol.value.copy(fog).lerp(CIEL.c.setRGB(.85, .9, 1), .55).multiplyScalar(.5 + .5 * clamp((B && AMB.cur ? AMB.cur.hemi / Math.max(.01, B.hemi ? B.hemi.i : 1) : 1), .3, 1.3));
  }
}
// Phase de la lune du jour (0 nouvelle, 0,5 pleine), jamais tout à fait nouvelle (on la verrait à peine)
function cielPhase(){
  const j = Date.now() / 86400000 - 10957.76; // jours depuis la nouvelle lune du 6 janvier 2000
  const ph = ((j % 29.530589) + 29.530589) % 29.530589 / 29.530589;
  return .12 + ph * .76;
}

Jeu.on('image', dt => { try { cielImage(dt || 0); } catch (e) { errNote(e); } });

// Accès pour les tests automatiques
window.__ciel = { CIEL_REGL, CIEL, cielU, cielDome, cielEclair, cielEclab, cielActif, cielImage, cielPhase, cielRnd, cielOn,
  get pluiePatch(){ return CIEL.pluiePatch; }, get flocPatch(){ return CIEL.flocPatch; } };
