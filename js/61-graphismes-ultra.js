'use strict';
/* ================= Style « Ultra » (ordi seulement) ================= */
// 4e choix du bouton Style (dt_style = ultra). Part de la Haute définition (js/58 à 60) et ajoute :
//   - reflets sur la rue mouillée : les flaques reflètent vraiment la scène (zombies, lampadaires, feux, ciel),
//     plus fort sous la pluie ; un miroir caché (Reflector de r128) redessine la scène vue d'en dessous ;
//   - rayons de soleil (ou de lune) dans la brume, qui passent entre les maisons et les zombies ;
//   - ombres douces (VSM) : le bord des ombres s'adoucit avec la distance, comme au vrai soleil ;
//   - ombres de contact en pleine résolution (au lieu de la moitié).
// Le bouton Style ne propose pas Ultra au cell (tactile). Coûte une scène de plus à dessiner : ordi puissant.
// Feuille de route : docs/graphismes.md. Réglages : ULT.regl.

const ULT = { refl:null, masque:null, monde:null, rayons:null, vsm:false, regl:{ refl:.5, pluie:.4, rayons:.5, ombreFlou:5, taille:.5 } };
const ultraActif = () => typeof styleUltra === 'function' && styleUltra() && !isTouch && styleToit() && typeof HD !== 'undefined' && HD.pret && !HD.casse;

/* ---------- Reflets de la rue mouillée ---------- */
function ultraMasque(){
  if (ULT.masque) return ULT.masque;
  styleGr = 2024;
  const R = styleRnd;
  ULT.masque = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#141414'; g.fillRect(0, 0, w, h); // la rue entière brille un peu
    for (let i = 0; i < 16; i++){ const x = R() * w, y = R() * h, r = 14 + R() * 40; styleTache(g, x, y, r, .95, '255,255,255'); styleTache(g, x + (R() - .5) * r, y + (R() - .5) * r, r * .7, .8, '255,255,255'); }
    for (let i = 0; i < 8; i++){ g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(R() * w, 0, 3 + R() * 6, h); } // traces de pneus mouillées
  });
  ULT.masque.wrapS = ULT.masque.wrapT = THREE.RepeatWrapping;
  return ULT.masque;
}
const ULT_REFLET = {
  uniforms: { color:{ value:null }, tDiffuse:{ value:null }, textureMatrix:{ value:null }, tMasque:{ value:null }, force:{ value:.5 }, rep:{ value:new THREE.Vector2(2, 14) } },
  vertexShader: 'uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 vUv2; varying vec3 vW; void main(){ vUv = textureMatrix * vec4(position, 1.0); vUv2 = uv; vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'uniform sampler2D tDiffuse, tMasque; uniform float force; uniform vec2 rep; varying vec4 vUv; varying vec2 vUv2; varying vec3 vW;',
    'void main(){',
    '  float m = texture2D(tMasque, vUv2 * rep).r;',
    '  vec2 ondes = vec2(sin(vW.z * 3.1 + vW.x * 1.7), cos(vW.x * 2.3 - vW.z * 1.3)) * .004 * vUv.w;', // eau qui n'est pas un miroir parfait
    '  vec3 r = texture2DProj(tDiffuse, vUv + vec4(ondes, 0.0, 0.0)).rgb;',
    '  vec3 v = normalize(cameraPosition - vW);',
    '  float fres = .3 + .7 * pow(1.0 - max(v.y, 0.0), 3.0);',
    '  float loin = 1.0 - smoothstep(55.0, 110.0, length(cameraPosition - vW));',
    '  gl_FragColor = vec4(r, clamp(m * force * fres * loin, 0.0, 1.0));',
    '}'].join('\n')
};
function ultraRefletPoser(){
  if (!THREE.Reflector || !world) return;
  const v = renderer.getDrawingBufferSize(new THREE.Vector2()), k = ULT.regl.taille;
  const geo = new THREE.PlaneGeometry(19, 130);
  const r = new THREE.Reflector(geo, { textureWidth:Math.max(256, Math.round(v.x * k)), textureHeight:Math.max(256, Math.round(v.y * k)), clipBias:.003, shader:ULT_REFLET });
  const rt = r.getRenderTarget(); rt.texture.type = THREE.HalfFloatType; rt.texture.format = THREE.RGBAFormat; // couleurs étendues
  r.material.transparent = true; r.material.depthWrite = false;
  r.material.uniforms.tMasque.value = ultraMasque();
  r.rotation.x = -Math.PI / 2; r.position.set(0, .03, -75); r.renderOrder = 2;
  r.castShadow = r.receiveShadow = false;
  world.add(r); ULT.refl = r; ULT.monde = world;
}
function ultraRefletRetirer(){
  const r = ULT.refl; if (!r) return;
  if (r.parent) r.parent.remove(r);
  r.geometry.dispose(); r.material.dispose(); r.getRenderTarget().dispose();
  ULT.refl = null; ULT.monde = null;
}
function ultraPluie(){
  if (typeof AMB === 'undefined' || typeof WEATHERS === 'undefined') return 0;
  const W = WEATHERS[AMB.weather]; return W && W.rain ? Math.min(1, W.rain) : 0;
}

/* ---------- Rayons de soleil dans la brume ---------- */
const ULT_RAYONS = {
  uniforms: { tDiffuse:{ value:null }, tDepth:{ value:null }, soleil:{ value:new THREE.Vector2(.5, .5) }, force:{ value:0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'uniform sampler2D tDiffuse, tDepth; uniform vec2 soleil; uniform float force; varying vec2 vUv;',
    'void main(){',
    '  vec4 c = texture2D(tDiffuse, vUv);',
    '  if (force < .01){ gl_FragColor = c; return; }',
    '  vec2 pas = (soleil - vUv) / 48.0, p = vUv; float poids = 1.0; vec3 acc = vec3(0.0);',
    '  for (int i = 0; i < 48; i++){',
    '    p += pas;',
    '    if (texture2D(tDepth, p).x >= .9999){ vec3 s = texture2D(tDiffuse, p).rgb; float l = dot(s, vec3(.3, .59, .11)); acc += s * smoothstep(.35, 1.4, l) * poids; }',
    '    poids *= .965;',
    '  }',
    '  gl_FragColor = vec4(c.rgb + acc / 48.0 * force * 3.0, c.a);',
    '}'].join('\n')
};
const ultraV = new THREE.Vector3();
function ultraRayons(){
  if (!HD.comp || !HD.ssao) return;
  if (!ULT.rayons){
    ULT.rayons = new THREE.ShaderPass(ULT_RAYONS);
    const i = HD.comp.passes.indexOf(HD.bloom); HD.comp.insertPass(ULT.rayons, i < 0 ? HD.comp.passes.length : i + 1);
  }
  const u = ULT.rayons.uniforms, spr = world && world.children.find(o => o.isSprite && o.material && o.material.map === glowTex);
  let f = 0;
  if (spr){
    ultraV.copy(spr.position); world.localToWorld(ultraV); ultraV.project(camera);
    if (ultraV.z < 1){
      u.soleil.value.set(ultraV.x * .5 + .5, ultraV.y * .5 + .5);
      const bord = Math.max(Math.abs(ultraV.x), Math.abs(ultraV.y));
      f = ULT.regl.rayons * (1 - THREE.MathUtils.smoothstep(bord, .9, 1.8)) * (spr.visible ? 1 : 0);
    }
  }
  u.force.value = f; u.tDepth.value = HD.ssao.normalRenderTarget.depthTexture;
  ULT.rayons.enabled = f > .01 && HD.ssao.enabled;
}

/* ---------- Ombres douces et ombres de contact pleines ---------- */
function ultraOmbres(on){
  if (on && !renderer.shadowMap.enabled) return; // pas d'ombres du tout (Actuel)
  if (ULT.vsm === on && (renderer.shadowMap.type === THREE.VSMShadowMap) === on) return; // js/57 peut avoir remis son type
  ULT.vsm = on;
  renderer.shadowMap.type = on ? THREE.VSMShadowMap : (isTouch ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap);
  scene.traverse(o => {
    if (o.isLight && o.shadow){ o.shadow.radius = on ? ULT.regl.ombreFlou : 2; if (o.shadow.map){ o.shadow.map.dispose(); o.shadow.map = null; } }
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; });
  });
}
function ultraResolution(on){
  const k = on ? 1 : 2;
  if (typeof HD !== 'undefined' && HD.aoDiv !== k){ HD.aoDiv = k; HD.w = HD.h = 0; } // la taille est refaite au prochain dessin
}

/* ---------- Chaque image ---------- */
Jeu.on('image', () => {
  try {
    const on = ultraActif();
    ultraResolution(on);
    if (!on){
      if (ULT.refl) ultraRefletRetirer();
      if (ULT.rayons) ULT.rayons.enabled = false;
      if (ULT.vsm) ultraOmbres(false);
      return;
    }
    if (ULT.monde !== world) ultraRefletRetirer();
    if (!ULT.refl) ultraRefletPoser();
    if (ULT.refl) ULT.refl.material.uniforms.force.value = ULT.regl.refl + ULT.regl.pluie * ultraPluie();
    ultraRayons();
    ultraOmbres(true);
  } catch (e) { errNote(e); }
});

// Accès pour les tests automatiques
window.__ultra = { ULT, ultraActif, ultraPluie };
