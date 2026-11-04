'use strict';
/* ================= Style graphique : Actuel, Amélioré, Haute définition (plus tard : Ultra) ================= */
// Réglage « Style » dans l'écran Pause (dt_style). Feuille de route : docs/graphismes.md.
//   Actuel   : le jeu tel qu'il était (couleurs unies, pas d'effet plein écran).
//   Amélioré : visée « jeu 3D des années 2005 à 2010 » sur le toit :
//     - vraies ombres du soleil (bâtiments, autos, barricade, zombies), le soleil bas fait de longues ombres ;
//     - textures dessinées par le code : asphalte fissuré et rapiécé, trottoir en dalles, gazon, briques ou
//       planches à clin sur les façades, cadres et allèges des fenêtres, saleté au pied des murs, bois, crasse ;
//     - effets d'image : éclat lumineux (fenêtres, feux, soleil), lissage des bords (FXAA), couleurs plus
//       contrastées (ombres froides, lumières chaudes), coins assombris et grain de film.
//   Haute définition : par-dessus Amélioré, voir js/58-graphismes-hd.js (matériaux physiques, lumière HDR, ACES, SSAO).
// Ne s'applique qu'au toit pour l'instant (pas au robot ni au RTS). Revenir à « Actuel » remet les matériaux d'origine.
// Branché : Jeu.on('monde') (fin de buildWorld) pour habiller chaque nouvelle rue, styleRendu() appelé par la boucle
// (js/15-boucle.js) pour dessiner la scène avec les effets, Jeu.on('image') pour les ombres des zombies.

const STYLES = ['actuel', 'ameliore', 'hd', 'ultra'];
const STYLE_NOM = { actuel:'Actuel', ameliore:'Amélioré', hd:'Haute définition', ultra:'Ultra' };
const STY = { pref: store.get('dt_style', 'actuel'), L:null, orig:[], neufs:[], comp:null, bloom:null, grade:null, fxaa:null, w:0, h:0, t:0, ombreT:0, ombres:false, casse:false, v2:new THREE.Vector2() };
if (STYLES.indexOf(STY.pref) < 0) STY.pref = 'actuel';
const styleOn = () => STY.pref === 'ameliore' || STY.pref === 'hd' || STY.pref === 'ultra'; // Haute définition part de la rue d'Amélioré
const styleHD = () => STY.pref === 'hd' || STY.pref === 'ultra'; // Ultra part de la Haute définition (js/61)
const styleUltra = () => STY.pref === 'ultra';
const styleHDMajSur = () => { if (typeof styleHDMaj === 'function') styleHDMaj(); }; // js/58-graphismes-hd.js
const styleToit = () => styleOn() && !Jeu.actif();

/* ---------- Hasard propre (ne touche pas Math.random : les tests à graine restent pareils) ---------- */
let styleGr = 1;
const styleRnd = () => { styleGr = (styleGr * 16807) % 2147483647; return (styleGr - 1) / 2147483646; };

/* ---------- Textures dessinées une fois ---------- */
// Grain : bruit de pixels autour d'une valeur (la couleur du matériau est multipliée par la texture)
function styleBruit(g, w, h, base, amp, teinte){
  const im = g.getImageData(0, 0, w, h), d = im.data;
  for (let i = 0; i < d.length; i += 4){
    const n = (styleRnd() - .5) * amp;
    d[i] = clamp(d[i] * (base + n) * (teinte ? teinte[0] : 1), 0, 255);
    d[i + 1] = clamp(d[i + 1] * (base + n) * (teinte ? teinte[1] : 1), 0, 255);
    d[i + 2] = clamp(d[i + 2] * (base + n) * (teinte ? teinte[2] : 1), 0, 255);
  }
  g.putImageData(im, 0, 0);
}
function styleTache(g, x, y, r, a, col){
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, 'rgba(' + col + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function styleFissure(g, x, y, n, larg, col){
  g.strokeStyle = col; g.lineWidth = larg; g.beginPath(); g.moveTo(x, y);
  let a = styleRnd() * 6.3;
  for (let i = 0; i < n; i++){ a += (styleRnd() - .5) * 1.2; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); }
  g.stroke();
}
function styleRepeter(t, rx, ry){ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); t.needsUpdate = true; return t; }
const STYLE_TEX = {};
function styleTex(nom){
  if (STYLE_TEX[nom]) return STYLE_TEX[nom];
  styleGr = 7 + nom.length * 131;
  let t;
  if (nom === 'asphalte') t = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5; i++){ g.fillStyle = 'rgba(40,40,40,.18)'; const pw = 60 + styleRnd() * 140, ph = 40 + styleRnd() * 120; g.fillRect(styleRnd() * w, styleRnd() * h, pw, ph); } // rapiéçages
    for (let i = 0; i < 9; i++) styleTache(g, styleRnd() * w, styleRnd() * h, 12 + styleRnd() * 40, .35, '20,18,16'); // huile
    styleBruit(g, w, h, .92, .45);
    for (let i = 0; i < 9; i++) styleFissure(g, styleRnd() * w, styleRnd() * h, 6 + styleRnd() * 14, 1.5, 'rgba(15,12,10,.75)');
    for (let i = 0; i < 400; i++){ g.fillStyle = styleRnd() < .5 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.3)'; g.fillRect(styleRnd() * w, styleRnd() * h, 2, 2); } // gravier
  });
  else if (nom === 'trottoir') t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e6e2dc'; g.fillRect(0, 0, w, h);
    styleBruit(g, w, h, .9, .3);
    g.fillStyle = 'rgba(30,26,22,.55)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h); g.fillRect(0, 127, w, 2); // joints des dalles
    for (let i = 0; i < 3; i++) styleFissure(g, styleRnd() * w, styleRnd() * h, 4 + styleRnd() * 6, 1, 'rgba(20,16,14,.6)');
    for (let i = 0; i < 4; i++) styleTache(g, styleRnd() * w, styleRnd() * h, 10 + styleRnd() * 30, .25, '30,26,20');
  });
  else if (nom === 'gazon') t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) styleTache(g, styleRnd() * w, styleRnd() * h, 20 + styleRnd() * 40, .5, '120,95,60'); // terre
    styleBruit(g, w, h, .95, .5);
    for (let i = 0; i < 1800; i++){ const x = styleRnd() * w, y = styleRnd() * h; g.strokeStyle = styleRnd() < .5 ? 'rgba(255,255,230,.22)' : 'rgba(0,10,0,.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (styleRnd() - .5) * 3, y - 3 - styleRnd() * 4); g.stroke(); }
  });
  else if (nom === 'bois') t = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#e0e0e0'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2){ g.fillStyle = 'rgba(40,25,10,' + (styleRnd() * .25) + ')'; g.fillRect(0, y, w, 1 + (styleRnd() < .2 ? 1 : 0)); } // veines
    for (let i = 0; i < 3; i++) styleTache(g, styleRnd() * w, styleRnd() * h, 4 + styleRnd() * 5, .6, '50,30,12'); // nœuds
    styleBruit(g, w, h, .95, .2);
  });
  else t = canvasTex(256, 256, (g, w, h) => { // crasse : pour tout le reste (toits, autos, sacs, béton, poteaux)
    g.fillStyle = '#ececec'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) styleTache(g, styleRnd() * w, styleRnd() * h, 10 + styleRnd() * 50, .22, '35,30,25');
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(.6, 'rgba(30,25,20,0)'); gr.addColorStop(1, 'rgba(30,25,20,.35)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    styleBruit(g, w, h, .95, .3);
    for (let i = 0; i < 6; i++) styleFissure(g, styleRnd() * w, styleRnd() * h, 3, 1, 'rgba(20,16,12,.35)');
  });
  t.userData = { style:true };
  return (STYLE_TEX[nom] = t);
}

/* ---------- Façades redessinées en double définition ---------- */
// La façade d'origine (js/03-scene.js facadeMat) : 128 x 256, fenêtres de 18 x 20 tous les 30 x 32 pixels.
// On la redessine en 256 x 512 : briques ou planches, saleté, cadres, allèges et croisillons, reflet des vitres.
function styleFacade(m, briques){
  const src = m.map && m.map.image, em = m.emissiveMap && m.emissiveMap.image;
  if (!src || !src.getContext || !em || !em.getContext) return null;
  const sg = src.getContext('2d'), eg = em.getContext('2d');
  const fond = sg.getImageData(2, 2, 1, 1).data, mur = 'rgb(' + fond[0] + ',' + fond[1] + ',' + fond[2] + ')';
  const fen = [];
  for (let y = 10; y < 256; y += 32) for (let x = 8; x < 120; x += 30){
    const p = eg.getImageData(x + 9, y + 10, 1, 1).data;
    fen.push([x * 2, y * 2, p[0] + p[1] + p[2] > 30]);
  }
  styleGr = 1 + (fond[0] * 7 + fond[1] * 13 + fen.length) % 9973;
  const col = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = mur; g.fillRect(0, 0, w, h);
    if (briques){
      for (let y = 0, r = 0; y < h; y += 8, r++) for (let x = (r % 2) * -10; x < w; x += 20){
        const v = .82 + styleRnd() * .3; g.fillStyle = 'rgba(' + (v > 1 ? '255,235,215,' + (v - 1) * 1.5 : '20,10,5,' + (1 - v) * 1.2) + ')'; g.fillRect(x + 1, y + 1, 18, 6);
      }
      g.fillStyle = 'rgba(210,200,185,.22)'; for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 1); // mortier
    } else {
      for (let y = 0; y < h; y += 12){ g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, y + 10, w, 2); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, y, w, 2); } // planches à clin
    }
    styleBruit(g, w, h, .97, .22);
    fen.forEach(f => {
      const x = f[0], y = f[1];
      g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x - 1, y + 42, 38, 30); // coulure sous la fenêtre
      g.fillStyle = 'rgba(25,20,16,.9)'; g.fillRect(x - 4, y - 4, 44, 48); // cadre
      g.drawImage(src, x / 2, y / 2, 18, 20, x, y, 36, 40); // vitre d'origine (allumée ou non)
      if (!f[2]){ const gr = g.createLinearGradient(x, y, x + 36, y + 40); gr.addColorStop(0, 'rgba(120,140,160,.25)'); gr.addColorStop(.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(90,110,130,.15)'); g.fillStyle = gr; g.fillRect(x, y, 36, 40); }
      g.fillStyle = 'rgba(30,24,20,.95)'; g.fillRect(x + 17, y, 2, 40); g.fillRect(x, y + 19, 36, 2); // croisillons
      g.fillStyle = 'rgba(200,190,175,.75)'; g.fillRect(x - 6, y + 44, 48, 5); // allège
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x - 6, y + 49, 48, 2);
    });
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.15)'); gr.addColorStop(.12, 'rgba(0,0,0,0)'); gr.addColorStop(.8, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(25,20,10,.45)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); // saleté
  });
  const emi = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    fen.forEach(f => { if (!f[2]) return; g.drawImage(em, f[0] / 2, f[1] / 2, 18, 20, f[0], f[1], 36, 40); g.fillStyle = '#000'; g.fillRect(f[0] + 17, f[1], 2, 40); g.fillRect(f[0], f[1] + 19, 36, 2); });
  });
  [col, emi].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.copy(m.map.repeat); t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); });
  const fm = new THREE.MeshLambertMaterial({ map:col, emissiveMap:emi, emissive:0xffffff, emissiveIntensity:m.emissiveIntensity });
  fm.userData.fac = { fen, briques }; // pour la Haute définition (relief et reflets des vitres)
  return fm;
}

/* ---------- Habiller la rue (et la déshabiller) ---------- */
const STYLE_BOIS = [0x6b4a2c, 0x55391f, 0x3b2a20];
function styleMat(m, mesh, L){
  if (!m || m.type !== 'MeshLambertMaterial' || m.vertexColors || m.transparent) return null;
  const geo = mesh.geometry; if (!geo || !geo.attributes || !geo.attributes.uv) return null;
  if (m.emissiveMap) return styleFacade(m, L.style !== 'houses');
  if (m.map) return null;
  const hex = m.color.getHex(), p = geo.parameters || {};
  const nm = m.clone();
  if (hex === L.ground && geo.type === 'PlaneGeometry'){ nm.map = styleRepeter(styleTex('asphalte').clone(), (p.width || 240) / 7, (p.height || 300) / 7); nm.color.multiplyScalar(1.45); }
  else if (hex === L.walk){ nm.map = styleRepeter(styleTex('trottoir').clone(), 2, (p.depth || 200) / 3); nm.color.multiplyScalar(1.25); }
  else if (L.lawn !== undefined && hex === L.lawn){ nm.map = styleRepeter(styleTex('gazon').clone(), (p.width || 60) / 4, (p.depth || 200) / 4); nm.color.multiplyScalar(1.3); }
  else if (STYLE_BOIS.indexOf(hex) >= 0){ nm.map = styleTex('bois'); nm.color.multiplyScalar(1.15); }
  else { nm.map = styleTex('crasse'); nm.color.multiplyScalar(1.08); }
  return nm;
}
function styleOmbreSoleil(on){
  if (!world) return;
  const sun = world.children.find(o => o.isDirectionalLight); if (!sun) return;
  if (!sun.userData.pos0) sun.userData.pos0 = sun.position.clone();
  sun.castShadow = !!on;
  if (!on){ sun.position.copy(sun.userData.pos0); return; }
  // Le soleil vient du fond de la rue : la zone d'ombre couvre le toit et les 100 premiers mètres
  const cible = new THREE.Vector3(0, 0, -45), dir = sun.userData.pos0.clone().normalize();
  sun.target.position.copy(cible); if (!sun.target.parent) world.add(sun.target);
  sun.position.copy(cible).addScaledVector(dir, 150);
  const niv = typeof gfxLevel === 'function' ? gfxLevel() : 'haut';
  const S2 = sun.shadow, cam = S2.camera, n = niv === 'bas' ? 512 : (niv === 'haut' && !isTouch) ? (styleHD() ? 4096 : 2048) : 1024; // suit le réglage Graphismes (4096 en Haute définition)
  cam.left = -48; cam.right = 48; cam.top = 32; cam.bottom = -32; cam.near = 40; cam.far = 270; cam.updateProjectionMatrix();
  if (S2.mapSize.x !== n){ S2.mapSize.set(n, n); if (S2.map){ S2.map.dispose(); S2.map = null; } }
  S2.bias = -.0006; S2.normalBias = .04; S2.radius = 2;
}
function styleAppliquer(){
  if (!world || !STY.L || STY.orig.length) return;
  const L = STY.L, faits = new Map();
  world.traverse(o => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    o.castShadow = true; o.receiveShadow = true;
    const m = o.material; if (m.userData && m.userData.keep) return;
    let nm = faits.get(m);
    if (nm === undefined){ try { nm = styleMat(m, o, L); } catch (e) { errNote(e); nm = null; } faits.set(m, nm); if (nm) STY.neufs.push(nm); }
    if (!nm) return;
    STY.orig.push([o, m]); o.material = nm;
  });
  // Le ciel, le soleil et le sol ne projettent pas d'ombre (le sol en reçoit)
  world.children.forEach(o => { if (o.isMesh && o.geometry && o.geometry.type === 'SphereGeometry') { o.castShadow = false; o.receiveShadow = false; } if (o.isSprite) o.castShadow = false; });
  styleOmbreSoleil(true);
}
function styleDisposeMat(m){
  if (!m || (m.userData && m.userData.keep)) return;
  [m.map, m.emissiveMap].forEach(t => { if (t && t !== glowTex && !(t.userData && t.userData.style)) t.dispose(); });
  m.dispose();
}
function styleRetirer(){
  STY.orig.forEach(([o, m]) => { o.material = m; });
  STY.neufs.forEach(styleDisposeMat);
  STY.orig = []; STY.neufs = [];
  if (world) world.traverse(o => { if (o.isMesh){ o.castShadow = false; o.receiveShadow = false; } });
  styleOmbreSoleil(false);
}
// Nouvelle rue (fin de buildWorld) : les vieux matériaux d'origine ne servent plus, on les libère
function styleMonde(L){
  STY.orig.forEach(([o, m]) => styleDisposeMat(m));
  STY.orig = []; STY.neufs = [];
  STY.L = L;
  if (styleOn()) styleAppliquer();
  styleHDMajSur();
}

/* ---------- Ombres (le moteur) : seulement sur le toit en style Amélioré ---------- */
function styleOmbres(on){
  on = !!on; if (STY.ombres === on && renderer.shadowMap.enabled === on) return;
  STY.ombres = on;
  renderer.shadowMap.enabled = on;
  renderer.shadowMap.type = isTouch ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); });
}
// Zombies : ils projettent leur ombre (pas d'ombre reçue sur eux, pour éviter les taches)
function styleOmbresZombies(){
  if (typeof zInstRoot !== 'undefined') zInstRoot.children.forEach(o => { o.castShadow = true; o.receiveShadow = false; });
  if (typeof zombies !== 'undefined') zombies.forEach(z => { if (z && z.g && !z.g.userData.styleOmbre){ z.g.userData.styleOmbre = true; z.g.traverse(o => { if (o.isMesh) o.castShadow = true; }); } });
}

/* ---------- Effets d'image ---------- */
// Couleurs : saturation, contraste, ombres froides et lumières chaudes, coins assombris, grain de film
const STYLE_GRADE = {
  uniforms: { tDiffuse:{ value:null }, t:{ value:0 }, sat:{ value:.9 }, con:{ value:1.1 }, vig:{ value:.4 }, grain:{ value:.035 },
    ombre:{ value:new THREE.Vector3(.96, .98, 1.03) }, lumiere:{ value:new THREE.Vector3(1.06, 1.0, .93) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'uniform sampler2D tDiffuse; uniform float t, sat, con, vig, grain; uniform vec3 ombre, lumiere; varying vec2 vUv;',
    'void main(){',
    '  vec3 c = texture2D(tDiffuse, vUv).rgb;',
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
function styleComposer(){
  if (STY.comp || STY.casse) return STY.comp;
  if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.ShaderPass || !THREE.UnrealBloomPass){ STY.casse = true; return null; }
  const c = new THREE.EffectComposer(renderer);
  c.addPass(new THREE.RenderPass(scene, camera));
  STY.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), .45, .4, .86); c.addPass(STY.bloom);
  if (THREE.FXAAShader){ STY.fxaa = new THREE.ShaderPass(THREE.FXAAShader); c.addPass(STY.fxaa); }
  STY.grade = new THREE.ShaderPass(STYLE_GRADE); c.addPass(STY.grade);
  STY.comp = c; STY.w = STY.h = 0;
  return c;
}
// Appelée par la boucle (js/15-boucle.js) : vrai si la scène a été dessinée ici, avec les effets
function styleRendu(){
  if (!styleToit() || STY.casse) return false;
  if (styleHD() && typeof styleHDRendu === 'function'){ const r = styleHDRendu(); if (r !== null) return r; } // null : pas encore prêt, on dessine en Amélioré
  try {
    const c = styleComposer(); if (!c) return false;
    const v = renderer.getDrawingBufferSize(STY.v2);
    if (v.x !== STY.w || v.y !== STY.h){
      STY.w = v.x; STY.h = v.y; c.setPixelRatio(1); c.setSize(v.x, v.y);
      if (STY.fxaa) STY.fxaa.uniforms.resolution.value.set(1 / v.x, 1 / v.y);
    }
    STY.grade.uniforms.t.value = (STY.t % 100);
    STY.bloom.enabled = !(typeof gfxLevel === 'function' && gfxLevel() === 'bas'); // qualité basse : pas d'éclat (plus rapide)
    c.render();
    return true;
  } catch (e) { errNote(e); STY.casse = true; return false; }
}

/* ---------- Chaque image ---------- */
Jeu.on('image', dt => {
  STY.t += dt || 0;
  const on = styleToit();
  styleOmbres(on);
  if (!on) return;
  if (typeof gfxShadows !== 'undefined') gfxShadows.visible = false; // les vraies ombres remplacent les taches
  STY.ombreT -= dt || 0;
  if (STY.ombreT <= 0){ STY.ombreT = .25; styleOmbresZombies(); if (STY.orig.length) styleOmbreSoleil(true); }
});
Jeu.on('monde', L => styleMonde(L));

/* ---------- Réglage dans l'écran Pause ---------- */
function styleSet(p){
  if (STYLES.indexOf(p) < 0) p = 'actuel';
  const avant = STY.pref; STY.pref = p; store.set('dt_style', p);
  if (avant !== p){ if (styleOn()) styleAppliquer(); else styleRetirer(); styleOmbreSoleil(styleOn() && STY.orig.length > 0); styleHDMajSur(); }
  styleBtn();
}
function styleBtn(){ const b = $('btnStyle'); if (b) b.textContent = 'Style : ' + STYLE_NOM[STY.pref]; }
(function(){
  // En haut de la pause, juste sous le titre : visible sans faire défiler (la liste est longue au cell couché)
  const pan = document.querySelector('#scrPause .panel'), titre = pan && pan.querySelector('h2');
  if (pan && !$('btnStyle')){
    const b = document.createElement('button'); b.className = 'ghost'; b.id = 'btnStyle'; b.type = 'button';
    pan.insertBefore(b, titre ? titre.nextSibling : pan.firstChild);
    b.addEventListener('click', () => { let n = STYLES[(STYLES.indexOf(STY.pref) + 1) % STYLES.length]; if (n === 'ultra' && isTouch) n = 'actuel'; styleSet(n); }); // Ultra : ordi seulement
  }
  styleBtn();
  // La rue du titre est déjà bâtie (js/15-boucle.js) : on l'habille tout de suite
  try { if (typeof curLoc !== 'undefined' && curLoc) styleMonde(curLoc); } catch (e) { errNote(e); }
})();

// Accès pour les tests automatiques
window.__style = { STY, STYLES, styleOn, styleHD, styleUltra, styleToit, styleSet, styleRendu, styleTex, styleMonde };
