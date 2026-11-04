'use strict';
/* ================= Style « Haute définition » (séance 1 : la lumière) ================= */
// Visée : un jeu de tir moderne sur un ordi puissant. Part de la rue d'Amélioré (js/57-graphismes.js) et ajoute :
//   - matériaux physiques (MeshStandardMaterial) : rugosité, cartes de relief tirées des textures dessinées,
//     taches d'huile et vitres qui reflètent, façades avec briques en relief et vitres lisses ;
//   - lumière d'ambiance et reflets tirés d'une vraie image HDR (Poly Haven, CC0, dossier hdri/), teintée par la ville ;
//   - rendu en couleurs linéaires et étendues (HDR), puis exposition et courbe filmique ACES ;
//   - ombres de contact (SSAO de Three.js r128) au pied des murs, sous les autos, dans les coins ;
//   - carte d'ombre du soleil de 4096 (réglage Graphismes : haute, ordi).
// Les morceaux de Three.js (EXRLoader, SSAOPass) sont dans lib/three-hd.js, chargé seulement quand on choisit ce style.
// Feuille de route : docs/graphismes.md. Ne touche ni Actuel, ni Amélioré, ni le robot, ni le RTS.

const HD = {
  pret:false, prom:null, casse:false, envs:{}, envCle:'', env:null, pmrem:null,
  mats:[], pour:null,            // matériaux physiques posés, et la liste d'Amélioré pour laquelle ils ont été faits
  tex:new Map(), matsEnc:new Set(), // textures passées en sRGB pendant la Haute définition (pour les remettre)
  comp:null, ssao:null, rendu:null, bloom:null, grade:null, fxaa:null, w:0, h:0,
  sv:[], vus:new Set(), mVus:new Set(), envSur:false,
  nuit:{ monde:null, lum:[], cones:[], eteintes:[], t:0 } // lampadaires qui éclairent vraiment (séance 2)
};
// Image HDR de chaque ville (toutes de Poly Haven, réduites à 512 x 256), teinte mélangée à la lumière de la ville
const HD_CIEL = { village:'sunset', ville:'dawn', banlieue:'night', centre:'sunset', port:'city' };
const HD_REGL = { expo:1.15, sansOmbre:[1.8, 1.5, 1.15], // ciel, lueurs, autres sans éclairage
   env:.55, teinte:.6, ao:{ rayon:.7, min:.00004, max:.006 }, bloom:[.5, .5, .92] };

/* ---------- Chargement (une seule fois) ---------- */
function styleHDVersion(){
  const s = document.querySelector('script[src*="57-graphismes"]'), m = s && /\?v=[0-9]+/.exec(s.getAttribute('src'));
  return m ? m[0] : '';
}
function styleHDCharger(){
  if (HD.prom) return HD.prom;
  HD.prom = new Promise((ok, non) => {
    if (THREE.SSAOPass && THREE.EXRLoader) return ok();
    const s = document.createElement('script');
    s.src = 'lib/three-hd.js' + styleHDVersion();
    s.onload = () => ok(); s.onerror = () => non(new Error('lib/three-hd.js introuvable'));
    document.head.appendChild(s);
  }).then(() => { HD.pret = !!(THREE.SSAOPass && THREE.EXRLoader); styleHDMaj(); })
    .catch(e => { HD.casse = true; errNote(e); });
  return HD.prom;
}
// Image HDR brute (flottants), gardée pour refaire la teinte d'une autre ville
function styleHDImage(nom){
  if (HD.envs[nom]) return HD.envs[nom];
  return (HD.envs[nom] = new Promise((ok, non) => {
    const ld = new THREE.EXRLoader(); ld.setDataType(THREE.FloatType);
    ld.load('hdri/' + nom + '.exr', t => ok(t), undefined, e => non(e || new Error('hdri/' + nom + '.exr')));
  }));
}
// Lumière d'ambiance de la rue : image HDR teintée par la couleur du ciel de la ville, filtrée (PMREM) pour les reflets
function styleHDEnv(){
  const L = STY.L; if (!L || !HD.pret) return;
  const nom = HD_CIEL[L.id] || 'sunset', cle = nom + ':' + L.id;
  if (HD.envCle === cle) return;
  HD.envCle = cle;
  HD.envProm = styleHDImage(nom).then(src => {
    if (HD.envCle !== cle) return;
    const d = src.image.data, c = new THREE.Color(L.hemi ? L.hemi[0] : 0xffffff).convertSRGBToLinear();
    const mx = Math.max(c.r, c.g, c.b, .001), k = HD_REGL.teinte;
    const tr = 1 - k + k * c.r / mx, tg = 1 - k + k * c.g / mx, tb = 1 - k + k * c.b / mx;
    const data = new Float32Array(d.length);
    for (let i = 0; i < d.length; i += 4){ data[i] = d[i] * tr; data[i + 1] = d[i + 1] * tg; data[i + 2] = d[i + 2] * tb; data[i + 3] = 1; }
    const t = new THREE.DataTexture(data, src.image.width, src.image.height, THREE.RGBAFormat, THREE.FloatType);
    t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.encoding = THREE.LinearEncoding; t.needsUpdate = true;
    if (!HD.pmrem) HD.pmrem = new THREE.PMREMGenerator(renderer);
    const rt = HD.pmrem.fromEquirectangular(t);
    t.dispose();
    if (HD.env) HD.env.dispose();
    HD.env = rt.texture;
    HD.envSur = false;
  }).catch(e => { HD.envCle = ''; errNote(e); });
}

/* ---------- Cartes de relief et de rugosité ---------- */
// Relief : tiré de la clarté de l'image (sombre = creux) ; rugosité : base + écart selon la clarté
function styleHDHauteur(img, w, h){
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, H = new Float32Array(w * h);
  for (let i = 0, j = 0; i < H.length; i++, j += 4) H[i] = (d[j] * .299 + d[j + 1] * .587 + d[j + 2] * .114) / 255;
  return H;
}
function styleHDNormale(H, w, h, force){
  return canvasTex(w, h, (g) => {
    const im = g.createImageData(w, h), o = im.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
      const xl = (x + w - 1) % w, xr = (x + 1) % w, yu = (y + h - 1) % h, yd = (y + 1) % h;
      const dx = (H[y * w + xr] - H[y * w + xl]) * force, dy = (H[yd * w + x] - H[yu * w + x]) * force;
      const l = Math.sqrt(dx * dx + dy * dy + 1), j = (y * w + x) * 4;
      o[j] = (-dx / l * .5 + .5) * 255; o[j + 1] = (dy / l * .5 + .5) * 255; o[j + 2] = (1 / l * .5 + .5) * 255; o[j + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  });
}
function styleHDRugo(H, w, h, base, ecart){
  return canvasTex(w, h, (g) => {
    const im = g.createImageData(w, h), o = im.data;
    for (let i = 0, j = 0; i < H.length; i++, j += 4){ const v = clamp(base + (H[i] - .5) * ecart, .04, 1) * 255; o[j] = o[j + 1] = o[j + 2] = v; o[j + 3] = 255; }
    g.putImageData(im, 0, 0);
  });
}
// Rugosité des textures d'Amélioré : [base, écart selon la clarté, force du relief, métal]
// Asphalte : les taches d'huile (sombres) sont lisses et reflètent comme une flaque.
const HD_SORTES = { asphalte:[.78, .9, 5, 0], trottoir:[.8, .3, 4, 0], gazon:[.95, .1, 3, 0], bois:[.72, .3, 3, 0], crasse:[.62, .5, 2, .08] };
const HD_CARTES = {};
function styleHDCartes(nom){
  if (HD_CARTES[nom]) return HD_CARTES[nom];
  const src = styleTex(nom), img = src.image, w = img.width, h = img.height, H = styleHDHauteur(img, w, h), s = HD_SORTES[nom];
  const n = styleHDNormale(H, w, h, s[2]), r = styleHDRugo(H, w, h, s[0], s[1]);
  [n, r].forEach(t => { t.userData = { style:true }; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = src.anisotropy; });
  return (HD_CARTES[nom] = { n, r, s });
}
// Façades : briques ou planches en relief, cadres en saillie, vitres en creux et lisses (elles reflètent le ciel)
function styleHDFacade(lm){
  const f = lm.userData.fac, w = 256, h = 512;
  const haut = canvasTex(w, h, (g) => {
    g.fillStyle = '#888'; g.fillRect(0, 0, w, h);
    if (f.briques){ g.fillStyle = '#4a4a4a'; for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 1); for (let y = 0, r = 0; y < h; y += 8, r++) for (let x = (r % 2) * -10; x < w; x += 20) g.fillRect(x, y, 1, 8); }
    else { for (let y = 0; y < h; y += 12){ const gr = g.createLinearGradient(0, y, 0, y + 12); gr.addColorStop(0, '#5a5a5a'); gr.addColorStop(1, '#b0b0b0'); g.fillStyle = gr; g.fillRect(0, y, w, 12); } }
    f.fen.forEach(([x, y]) => { g.fillStyle = '#d8d8d8'; g.fillRect(x - 4, y - 4, 44, 48); g.fillStyle = '#202020'; g.fillRect(x, y, 36, 40); g.fillStyle = '#bbb'; g.fillRect(x + 17, y, 2, 40); g.fillRect(x, y + 19, 36, 2); g.fillStyle = '#e6e6e6'; g.fillRect(x - 6, y + 44, 48, 5); });
  });
  const H = styleHDHauteur(haut.image, w, h); haut.dispose();
  const n = styleHDNormale(H, w, h, 4);
  const r = canvasTex(w, h, (g) => {
    g.fillStyle = f.briques ? '#e0e0e0' : '#c8c8c8'; g.fillRect(0, 0, w, h);
    f.fen.forEach(([x, y]) => { g.fillStyle = '#1a1a1a'; g.fillRect(x, y, 36, 40); g.fillStyle = '#b0b0b0'; g.fillRect(x - 4, y - 4, 44, 4); });
  });
  [n, r].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = lm.map.anisotropy; });
  return { n, r };
}

/* ---------- Matériaux physiques (à partir de ceux d'Amélioré) ---------- */
function styleHDSorte(lm){
  if (!lm.map || !lm.map.image) return null;
  for (const nom in HD_SORTES){ const t = STYLE_TEX[nom]; if (t && t.image === lm.map.image) return nom; }
  return null;
}
function styleHDMat(lm){
  if (!lm || lm.type !== 'MeshLambertMaterial') return null;
  const s = new THREE.MeshStandardMaterial({ color:lm.color.clone(), map:lm.map, side:lm.side, fog:lm.fog, envMapIntensity:HD_REGL.env });
  if (lm.userData.fac){
    const c = styleHDFacade(lm);
    s.emissive.setHex(0xffffff); s.emissiveMap = lm.emissiveMap; s.emissiveIntensity = lm.emissiveIntensity * 1.6;
    s.normalMap = c.n; s.roughnessMap = c.r; s.roughness = 1; s.metalness = 0; s.normalScale.set(.8, .8);
    s.userData.hdCartes = [c.n, c.r];
  } else {
    const nom = styleHDSorte(lm); if (!nom) { s.dispose(); return null; }
    const c = styleHDCartes(nom);
    s.normalMap = c.n; s.roughnessMap = c.r; s.roughness = 1; s.metalness = c.s[3];
  }
  return s;
}
// Pose ou retire les matériaux physiques selon le style (appelée par js/57-graphismes.js et au chargement)
function styleHDMaj(){
  const veut = styleHD() && HD.pret && STY.orig.length > 0;
  if (veut && HD.pour === STY.orig) { styleHDEnv(); return; }
  // Retirer les anciens (autre rue, ou style changé)
  HD.mats.forEach(([o, lm, sm]) => { if (o.material === sm) o.material = lm; sm.dispose(); (sm.userData.hdCartes || []).forEach(t => t.dispose()); });
  HD.mats = []; HD.pour = null;
  if (!veut){ if (!styleHD()) styleHDLineaire(false); if (styleHD() && !HD.pret && !HD.casse) styleHDCharger(); return; }
  const faits = new Map();
  STY.orig.forEach(([o]) => {
    const lm = o.material; let sm = faits.get(lm);
    if (sm === undefined){ try { sm = styleHDMat(lm); } catch (e) { errNote(e); sm = null; } faits.set(lm, sm); }
    if (!sm) return;
    HD.mats.push([o, lm, sm]); o.material = sm;
  });
  HD.pour = STY.orig;
  styleOmbreSoleil(true);
  styleHDEnv();
}

/* ---------- Couleurs linéaires ---------- */
// Le jeu donne ses couleurs en sRGB (comme à l'écran). En Haute définition, la lumière se calcule en linéaire :
// juste avant de dessiner, chaque couleur (matériaux, lumières, brume, fond) passe en linéaire, puis on la remet.
// Les textures de couleur sont marquées sRGB pendant ce style (remises comme avant en le quittant).
function styleHDTex(t, m){
  if (!t || t.encoding !== THREE.LinearEncoding || t.isDataTexture || t === HD.env || !t.image || t.image.nodeName === undefined) return; // images et canevas seulement
  if (!HD.tex.has(t)) HD.tex.set(t, t.encoding);
  t.encoding = THREE.sRGBEncoding; HD.matsEnc.add(m); m.needsUpdate = true;
}
function styleHDCouleur(c){
  if (!c || HD.vus.has(c)) return false;
  HD.vus.add(c); HD.sv.push(c, c.r, c.g, c.b); c.convertSRGBToLinear();
  return true;
}
function styleHDAvant(){
  HD.sv.length = 0; HD.vus.clear(); HD.mVus.clear();
  scene.traverseVisible(o => {
    if (o.isLight){ styleHDCouleur(o.color); if (o.groundColor) styleHDCouleur(o.groundColor); return; }
    const mm = o.material; if (!mm) return;
    (Array.isArray(mm) ? mm : [mm]).forEach(m => {
      if (!m || HD.mVus.has(m) || m.isShaderMaterial) return;
      HD.mVus.add(m);
      // Sans éclairage (ciel, lueurs, feux) : un peu plus forts, sinon la courbe filmique les éteint
      if (styleHDCouleur(m.color) && (m.isMeshBasicMaterial || m.isSpriteMaterial || m.isPointsMaterial))
        m.color.multiplyScalar(m.side === THREE.BackSide ? HD_REGL.sansOmbre[0] : m.blending === THREE.AdditiveBlending ? HD_REGL.sansOmbre[1] : HD_REGL.sansOmbre[2]);
      if (m.emissive) styleHDCouleur(m.emissive);
      styleHDTex(m.map, m); styleHDTex(m.emissiveMap, m);
    });
  });
  if (scene.fog) styleHDCouleur(scene.fog.color);
  if (scene.background && scene.background.isColor) styleHDCouleur(scene.background);
}
function styleHDApres(){
  const s = HD.sv;
  for (let i = 0; i < s.length; i += 4) s[i].setRGB(s[i + 1], s[i + 2], s[i + 3]);
  s.length = 0; HD.vus.clear();
}
// Quitter la Haute définition (ou le toit) : textures remises comme avant, plus de lumière HDR
function styleHDLineaire(on){
  if (on) return;
  if (HD.tex.size){ HD.tex.forEach((enc, t) => { t.encoding = enc; }); HD.tex.clear(); HD.matsEnc.forEach(m => { m.needsUpdate = true; }); HD.matsEnc.clear(); }
  if (HD.envSur){ if (scene.environment === HD.env) scene.environment = null; HD.envSur = false; }
}

/* ---------- Effets d'image ---------- */
// Exposition, courbe filmique ACES (celle de Three.js), retour en sRGB, puis les couleurs d'Amélioré
const STYLE_HD_GRADE = {
  uniforms: { tDiffuse:{ value:null }, t:{ value:0 }, expo:{ value:HD_REGL.expo }, sat:{ value:1.02 }, con:{ value:1.04 }, vig:{ value:.32 }, grain:{ value:.022 },
    ombre:{ value:new THREE.Vector3(.97, .99, 1.03) }, lumiere:{ value:new THREE.Vector3(1.04, 1.0, .95) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'uniform sampler2D tDiffuse; uniform float t, expo, sat, con, vig, grain; uniform vec3 ombre, lumiere; varying vec2 vUv;',
    'vec3 rrt(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }',
    'vec3 aces(vec3 c){',
    '  const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));',
    '  const mat3 OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));',
    '  c *= expo / 0.6; c = OUT * rrt(IN * c); return clamp(c, 0.0, 1.0);',
    '}',
    'vec3 srgb(vec3 c){ return mix(c * 12.92, pow(c, vec3(0.41666)) * 1.055 - 0.055, step(0.0031308, c)); }',
    'void main(){',
    '  vec3 c = srgb(aces(texture2D(tDiffuse, vUv).rgb));',
    '  float l = dot(c, vec3(.299, .587, .114));',
    '  c = mix(vec3(l), c, sat);',
    '  c = (c - .5) * con + .5;',
    '  c *= mix(ombre, lumiere, smoothstep(.05, .7, l));',
    '  vec2 d = vUv - .5; c *= 1.0 - vig * dot(d, d) * 2.2;',
    '  float n = fract(sin(dot(vUv * 1000.0 + t, vec2(12.9898, 78.233))) * 43758.5453);',
    '  c += (n - .5) * grain;',
    '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
    '}'].join('\n')
};
// SSAO : seuls les objets solides comptent (pas les lueurs, particules, fumée ni vitres transparentes)
function styleHDVisibilite(){
  const cache = this._visibilityCache;
  this.scene.traverse(o => {
    cache.set(o, o.visible);
    if (o.isPoints || o.isLine || o.isSprite) o.visible = false;
    else if (o.isMesh && o.material && !Array.isArray(o.material) && (o.material.transparent || o.material.isMeshBasicMaterial)) o.visible = false;
  });
}
function styleHDComposer(){
  if (HD.comp) return HD.comp;
  const rt = new THREE.WebGLRenderTarget(2, 2, { minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter, format:THREE.RGBAFormat, type:THREE.HalfFloatType });
  const c = new THREE.EffectComposer(renderer, rt);
  HD.rendu = new THREE.RenderPass(scene, camera); c.addPass(HD.rendu);
  // Le noyau du SSAO est tiré au hasard : on prend le hasard propre du style (les tests à graine restent pareils)
  const mr = Math.random; Math.random = styleRnd; styleGr = 4242;
  try { HD.ssao = new THREE.SSAOPass(scene, camera, 2, 2); } finally { Math.random = mr; }
  const p = HD.ssao;
  p.beautyRenderTarget.texture.type = THREE.HalfFloatType;           // la scène reste en couleurs étendues
  p.normalRenderTarget.depthTexture.type = THREE.UnsignedIntType;    // profondeur plus précise au loin
  p.overrideVisibility = styleHDVisibilite;
  // Le ciel (rien de dessiné) ne s'assombrit pas, et l'ombre de contact s'efface au loin (au-delà de 50 m environ)
  p.ssaoMaterial.fragmentShader = p.ssaoMaterial.fragmentShader
    .replace('float viewZ = getViewZ( depth );', 'if ( depth >= 0.99999 ) { gl_FragColor = vec4( 1.0 ); return; }\n\t\t\tfloat viewZ = getViewZ( depth );')
    .replace('gl_FragColor = vec4( vec3( 1.0 - occlusion ), 1.0 );', 'occlusion *= 1.0 - smoothstep( 30.0, 60.0, -viewZ );\n\t\t\tgl_FragColor = vec4( vec3( 1.0 - occlusion ), 1.0 );');
  p.ssaoMaterial.needsUpdate = true;
  p.kernelRadius = HD_REGL.ao.rayon; p.minDistance = HD_REGL.ao.min; p.maxDistance = HD_REGL.ao.max;
  p.setSize = function(w, h){ // l'ombre de contact se calcule à demi-résolution (puis floutée), l'image reste pleine
    this.width = w; this.height = h; this.beautyRenderTarget.setSize(w, h);
    const a = Math.max(1, Math.ceil(w / 2)), b = Math.max(1, Math.ceil(h / 2));
    this.ssaoRenderTarget.setSize(a, b); this.normalRenderTarget.setSize(a, b); this.blurRenderTarget.setSize(a, b);
    this.ssaoMaterial.uniforms.resolution.value.set(a, b); this.blurMaterial.uniforms.resolution.value.set(a, b);
  };
  c.addPass(p);
  HD.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), HD_REGL.bloom[0], HD_REGL.bloom[1], HD_REGL.bloom[2]); c.addPass(HD.bloom);
  HD.grade = new THREE.ShaderPass(STYLE_HD_GRADE); c.addPass(HD.grade);
  if (THREE.FXAAShader){ HD.fxaa = new THREE.ShaderPass(THREE.FXAAShader); c.addPass(HD.fxaa); }
  HD.comp = c; HD.w = HD.h = 0;
  return c;
}
// Appelée par styleRendu (js/57-graphismes.js) : vrai si dessiné, null si pas encore prêt (on dessine en Amélioré)
function styleHDRendu(){
  if (HD.casse) return null;
  if (!HD.pret){ styleHDCharger(); return null; }
  if (HD.pour !== STY.orig) styleHDMaj();
  try {
    const c = styleHDComposer();
    const v = renderer.getDrawingBufferSize(STY.v2);
    if (v.x !== HD.w || v.y !== HD.h){
      HD.w = v.x; HD.h = v.y; c.setPixelRatio(1); c.setSize(v.x, v.y);
      if (HD.fxaa) HD.fxaa.uniforms.resolution.value.set(1 / v.x, 1 / v.y);
    }
    const niv = typeof gfxLevel === 'function' ? gfxLevel() : 'haut';
    const ao = niv !== 'bas';
    HD.ssao.enabled = ao; HD.rendu.enabled = !ao; HD.bloom.enabled = niv !== 'bas';
    if (ao){ // la vue change (zoom, visée) : la projection suit
      const u = HD.ssao.ssaoMaterial.uniforms;
      u.cameraProjectionMatrix.value.copy(camera.projectionMatrix); u.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);
      u.cameraNear.value = camera.near; u.cameraFar.value = camera.far;
    }
    if (HD.env && !HD.envSur){ scene.environment = HD.env; HD.envSur = true; }
    HD.grade.uniforms.t.value = STY.t % 100;
    styleHDAvant();
    try { c.render(); } finally { styleHDApres(); }
    return true;
  } catch (e) { errNote(e); HD.casse = true; styleHDApres(); return null; }
}

/* ---------- Nuit : les lampadaires éclairent vraiment (séance 2, sans téléchargement) ---------- */
// Quand les lampadaires sont allumés (nuit), chaque lampadaire des 100 premiers mètres devient un projecteur
// tourné vers la rue ; les 4 plus proches projettent des ombres (zombies, autos, barricade). Un cône de lumière
// très léger montre la brume éclairée. Les lampes rondes d'origine (js/22-ambiance.js) sont éteintes pendant ce temps.
const HD_NUIT = { zs:[-20, -46, -72, -98], ombreZ:-50, force:4.5, portee:30, angle:.95, flou:.55, cone:.16 };
// Cône de brume : plus fort près de la lampe, et s'efface sur les bords (vu de côté) pour ne pas faire de triangle net
function styleHDConeMat(){
  return new THREE.ShaderMaterial({
    uniforms:{ couleur:{ value:new THREE.Color(0xffc870).convertSRGBToLinear() }, force:{ value:HD_NUIT.cone } },
    vertexShader:'varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vec4 p = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-p.xyz); gl_Position = projectionMatrix * p; }',
    fragmentShader:'uniform vec3 couleur; uniform float force; varying vec2 vUv; varying vec3 vN, vV; void main(){ float bord = pow(abs(dot(vN, vV)), 2.5); float haut = pow(vUv.y, 1.6); gl_FragColor = vec4(couleur * force * bord * haut, 1.0); }',
    transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide
  });
}
function styleHDNuitVeut(){
  const L = STY.L;
  if (!L || !L.lamps || !world || isTouch && typeof gfxLevel === 'function' && gfxLevel() === 'bas') return false;
  return (typeof AMB !== 'undefined' && AMB.lamps.length > 0) || !!L.lampGlow;
}
function styleHDNuitRetirer(){
  const N = HD.nuit;
  N.lum.forEach(l => { if (l.parent) l.parent.remove(l); if (l.target && l.target.parent) l.target.parent.remove(l.target); if (l.shadow && l.shadow.map) l.shadow.map.dispose(); });
  N.cones.forEach(c => { if (c.parent) c.parent.remove(c); c.geometry.dispose(); c.material.dispose(); });
  N.eteintes.forEach(([l, i]) => { l.intensity = i; });
  N.lum = []; N.cones = []; N.eteintes = []; N.monde = null;
}
function styleHDNuitPoser(){
  const N = HD.nuit, niv = typeof gfxLevel === 'function' ? gfxLevel() : 'haut', carte = niv === 'haut' && !isTouch ? 1024 : 512;
  HD_NUIT.zs.forEach(z => [-1, 1].forEach(sd => {
    const l = new THREE.SpotLight(0xffc870, HD_NUIT.force, HD_NUIT.portee, HD_NUIT.angle, HD_NUIT.flou, 1.6);
    l.position.set(sd * 12.7, 6.7, z); l.target.position.set(sd * 7.5, 0, z - 1.5);
    l.castShadow = z > HD_NUIT.ombreZ && niv !== 'bas';
    if (l.castShadow){ l.shadow.mapSize.set(carte, carte); l.shadow.bias = -.0008; l.shadow.normalBias = .03; l.shadow.camera.near = .5; l.shadow.camera.far = HD_NUIT.portee; }
    world.add(l); world.add(l.target); N.lum.push(l);
    const m = styleHDConeMat();
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.25, 3.6, 6.6, 20, 1, true), m);
    c.position.set(sd * 11.3, 3.4, z - .6); c.rotation.z = -sd * .4; c.castShadow = c.receiveShadow = false;
    world.add(c); N.cones.push(c);
  }));
  if (typeof AMB !== 'undefined') AMB.lamps.forEach(l => { N.eteintes.push([l, l.intensity]); l.intensity = 0; });
  N.monde = world;
}
function styleHDNuit(){
  const N = HD.nuit, veut = styleHD() && styleToit() && HD.pret && styleHDNuitVeut();
  if (!veut){ if (N.lum.length || N.eteintes.length) styleHDNuitRetirer(); return; }
  if (N.monde !== world || (typeof AMB !== 'undefined' && AMB.lamps.some(l => l.intensity > 0 && !N.eteintes.some(e => e[0] === l)))) styleHDNuitRetirer();
  if (!N.lum.length) styleHDNuitPoser();
}

/* ---------- Chaque image ---------- */
Jeu.on('image', dt => {
  HD.nuit.t -= dt || 0;
  if (HD.nuit.t <= 0){ HD.nuit.t = .25; try { styleHDNuit(); } catch (e) { errNote(e); styleHDNuitRetirer(); } }
  if (!styleHD() || !styleToit()) { if (HD.tex.size || HD.envSur) styleHDLineaire(false); return; }
  if (!HD.pret && !HD.casse) styleHDCharger();
});
// Style déjà choisi à l'ouverture : on charge tout de suite
(function(){ try { if (styleHD()) styleHDCharger(); } catch (e) { errNote(e); } })();

// Accès pour les tests automatiques
window.__styleHD = { HD, HD_CIEL, HD_REGL, HD_NUIT, styleHDNuit, styleHDCharger, styleHDMaj, styleHDRendu };
