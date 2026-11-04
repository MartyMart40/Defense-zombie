'use strict';
/* ================= Haute définition, séance 3 : zombies et effets (sans téléchargement) ================= */
// Les sites de modèles 3D sont bloqués dans la session de travail : on améliore par le code ce qui existe.
// Seulement en style Haute définition, sur le toit (js/58-graphismes-hd.js). Tout part en quittant le style.
//   - Zombies : matériaux physiques avec peau sale, sang séché et frais (brillant), griffures, relief ;
//     les couleurs de chaque zombie (vêtements, peau) restent les mêmes.
//   - Sang au sol : une flaque reste là où un zombie tombe (80 au plus, les plus vieilles sont réutilisées),
//     brillante comme du sang frais ; effacée à chaque nouvelle rue.
//   - Flou de profondeur en visant : ce qui est loin du point visé devient flou (comme une vraie optique) ;
//     l'arme en main reste nette. Coupé en qualité basse (avec les ombres de contact, dont il lit la profondeur).
// Réglages : ZHD.

const ZHD = { mats:new Map(), poses:[], sang:null, sangN:0, sangMax:80, sangMonde:null, dof:null, dofForce:1, flou:5, forceVise:null }; // forceVise : pour les tests (visée imposée)

/* ---------- Textures : crasse de zombie (couleur, relief, rugosité) ---------- */
let zhdTex = null;
function zhdTextures(){
  if (zhdTex) return zhdTex;
  styleGr = 31337;
  const R = styleRnd, w = 128, h = 128;
  const taches = [];
  for (let i = 0; i < 9; i++) taches.push([R() * w, R() * h, 4 + R() * 12, R() < .45]); // [x, y, rayon, frais]
  const col = canvasTex(w, h, (g) => {
    g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 10; i++) styleTache(g, R() * w, R() * h, 8 + R() * 22, .3, '40,34,24');   // crasse
    taches.forEach(([x, y, r, frais]) => { styleTache(g, x, y, r, .85, frais ? '120,8,6' : '60,14,8'); for (let k = 0; k < 5; k++) styleTache(g, x + (R() - .5) * r * 2.5, y + R() * r * 2, r * .25, .7, frais ? '110,6,4' : '55,12,8'); });
    for (let i = 0; i < 6; i++) styleFissure(g, R() * w, R() * h, 2 + R() * 2, 1, 'rgba(60,10,8,.6)'); // griffures
    styleBruit(g, w, h, .96, .25);
  });
  const H = styleHDHauteur(col.image, w, h);
  const nrm = styleHDNormale(H, w, h, 3);
  const rug = canvasTex(w, h, (g) => {
    g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, w, h);
    taches.forEach(([x, y, r, frais]) => { if (frais) styleTache(g, x, y, r, .9, '25,25,25'); }); // sang frais : lisse et brillant
  });
  [col, nrm, rug].forEach(t => { t.userData = { style:true }; t.wrapS = t.wrapT = THREE.RepeatWrapping; });
  return (zhdTex = { col, nrm, rug });
}

/* ---------- Matériaux des zombies (instances) ---------- */
function zhdMat(lm){
  let s = ZHD.mats.get(lm);
  if (s) return s;
  const T = zhdTextures();
  s = new THREE.MeshStandardMaterial({ color:lm.color.clone(), map:lm.map || T.col, normalMap:T.nrm, roughnessMap:T.rug, roughness:.9, metalness:0,
    envMapIntensity:typeof HD_REGL !== 'undefined' ? HD_REGL.env : .5 });
  s.normalScale.set(.7, .7);
  // La couleur de chaque zombie (donnée par instance, en sRGB) passe en linéaire comme le reste de la Haute définition
  s.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('vColor.xyz *= instanceColor.xyz;', 'vColor.xyz *= pow(instanceColor.xyz, vec3(2.2));'); };
  s.customProgramCacheKey = () => 'zhd-instances';
  s.userData.zinst = true; s.userData.zhd = true;
  ZHD.mats.set(lm, s);
  return s;
}
function zhdZombies(on){
  if (typeof zInstRoot === 'undefined') return;
  if (!on){
    ZHD.poses.forEach(([im, lm]) => { if (im.material && im.material.userData.zhd) im.material = lm; });
    ZHD.poses = [];
    zInstRoot.children.forEach(im => { if (im.material && im.material.userData.zhd){ const lm = [...ZHD.mats].find(p => p[1] === im.material); if (lm) im.material = lm[0]; } });
    return;
  }
  // Chaque lot d'instances (les nouveaux aussi, quand une foule grossit) reçoit sa version physique
  zInstRoot.children.forEach(im => {
    const m = im.material; if (!m || m.userData.zhd || m.type !== 'MeshLambertMaterial') return;
    ZHD.poses.push([im, m]); im.material = zhdMat(m);
  });
}

/* ---------- Sang au sol ---------- */
function zhdSangCreer(){
  styleGr = 4711;
  const R = styleRnd;
  const tex = canvasTex(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    styleTache(g, 64, 64, 40, 1, '255,255,255');
    for (let i = 0; i < 14; i++){ const a = R() * 6.3, d = 22 + R() * 34; styleTache(g, 64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 4 + R() * 9, 1, '255,255,255'); }
  });
  const m = new THREE.MeshStandardMaterial({ color:0x3a0504, alphaMap:tex, transparent:true, depthWrite:false, roughness:.32, metalness:0,
    polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2, envMapIntensity:.5 });
  m.userData.zhd = true;
  const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
  const im = new THREE.InstancedMesh(geo, m, ZHD.sangMax);
  im.count = 0; im.frustumCulled = false; im.receiveShadow = true; im.castShadow = false; im.renderOrder = 1;
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ZHD.sang = im; ZHD.sangN = 0;
  return im;
}
const zhdO = new THREE.Object3D();
function zhdSang(x, z, taille){
  const im = ZHD.sang || zhdSangCreer();
  if (!im.parent && world){ world.add(im); ZHD.sangMonde = world; }
  const i = ZHD.sangN % ZHD.sangMax; ZHD.sangN++;
  zhdO.position.set(x, .025 + (i % 7) * .002, z); zhdO.rotation.set(0, styleRnd() * 6.3, 0);
  const s = taille * (1.3 + styleRnd() * 1.1); zhdO.scale.set(s, 1, s * (.8 + styleRnd() * .4));
  zhdO.updateMatrix(); im.setMatrixAt(i, zhdO.matrix); im.instanceMatrix.needsUpdate = true;
  im.count = Math.min(ZHD.sangMax, ZHD.sangN);
}
function zhdSangVider(){
  if (!ZHD.sang) return;
  if (ZHD.sang.parent) ZHD.sang.parent.remove(ZHD.sang);
  ZHD.sang.count = 0; ZHD.sangN = 0; ZHD.sangMonde = null;
}
Jeu.on('tue', (z, was) => {
  if (!was || !z || !z.g || !zhdActif()) return;
  const p = z.g.position; if (p.z > -9.5) return; // pas sur le toit ni derrière la barricade
  zhdSang(p.x, p.z, Math.max(.6, z.g.scale.x || 1));
});

/* ---------- Flou de profondeur en visant ---------- */
const ZHD_DOF = {
  uniforms: { tDiffuse:{ value:null }, tDepth:{ value:null }, near:{ value:.05 }, far:{ value:400 }, vise:{ value:0 }, res:{ value:new THREE.Vector2(1, 1) }, flou:{ value:9 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'uniform sampler2D tDiffuse, tDepth; uniform float near, far, vise, flou; uniform vec2 res; varying vec2 vUv;',
    'float dist(vec2 uv){ float d = texture2D(tDepth, uv).x; return (near * far) / (far - d * (far - near)); }',
    'void main(){',
    '  vec4 c0 = texture2D(tDiffuse, vUv);',
    '  if (vise < .01){ gl_FragColor = c0; return; }',
    '  float f = min(dist(vec2(.5)), 150.0), z = dist(vUv);',
    '  float coc = clamp(abs(z - f) / max(z, .5) * .9 - .12, 0.0, 1.0) * vise;', // plus c'est loin du point visé, plus c'est flou
    '  if (coc < .02){ gl_FragColor = c0; return; }',
    '  vec3 s = c0.rgb; float n = 1.0;',
    '  for (int i = 0; i < 16; i++){',
    '    float a = float(i) * 2.39996, r = sqrt(float(i) + .5) / 4.0;',
    '    vec2 o = vec2(cos(a), sin(a)) * r * coc * flou / res;',
    '    s += texture2D(tDiffuse, vUv + o).rgb; n += 1.0;',
    '  }',
    '  gl_FragColor = vec4(s / n, c0.a);',
    '}'].join('\n')
};
function zhdDof(){
  if (typeof HD === 'undefined' || !HD.comp || !HD.ssao) return;
  if (!ZHD.dof){
    ZHD.dof = new THREE.ShaderPass(ZHD_DOF);
    const i = HD.comp.passes.indexOf(HD.grade); HD.comp.insertPass(ZHD.dof, i < 0 ? HD.comp.passes.length : i); // avant les couleurs
  }
  const u = ZHD.dof.uniforms, v = ZHD.forceVise != null ? ZHD.forceVise : typeof ads === 'number' ? ads : 0;
  const sniper = typeof S !== 'undefined' && S && S.cur === 'sniper' && v > .85; // la lunette a son propre cadre
  u.vise.value = sniper ? 0 : v * ZHD.dofForce; u.flou.value = ZHD.flou;
  u.tDepth.value = HD.ssao.normalRenderTarget.depthTexture;
  u.near.value = camera.near; u.far.value = camera.far;
  u.res.value.set(Math.max(1, HD.w), Math.max(1, HD.h));
  ZHD.dof.enabled = u.vise.value > .01 && HD.ssao.enabled;
}

/* ---------- Chaque image ---------- */
const zhdActif = () => typeof styleHD === 'function' && styleHD() && styleToit() && typeof HD !== 'undefined' && HD.pret && !HD.casse;
Jeu.on('image', () => {
  try {
    const on = zhdActif();
    if (!on){ if (ZHD.poses.length) zhdZombies(false); if (ZHD.sang && ZHD.sang.parent) zhdSangVider(); if (ZHD.dof) ZHD.dof.enabled = false; return; }
    zhdZombies(true);
    if (ZHD.sang && ZHD.sangMonde && ZHD.sangMonde !== world) zhdSangVider(); // nouvelle rue : sol propre
    zhdDof();
  } catch (e) { errNote(e); }
});

// Accès pour les tests automatiques
window.__zhd = { ZHD, zhdZombies, zhdSang, zhdSangVider, zhdActif, zhdDof };
