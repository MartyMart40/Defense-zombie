'use strict';
/* ================= RTS : effets des armes (tâche 106) ================= */
// Dès le niveau 0, chaque famille d'arme a un tir qui se lit de la caméra du RTS (haute) et du poste de pilotage :
//   balles (traçantes en vol, éclair de bouche, poussière ou sang), tir d'élite (longue traçante qui reste un instant),
//   obus (éclair et fumée au départ, obus brillant, explosion avec terre soulevée), mortier (arc), 105 mm (chute, onde au sol),
//   roquettes et missiles (corps, flamme, traînée de fumée qui reste, boule de feu, débris, marque au sol, onde),
//   énergie (rayon avec cœur clair et halo, point d'impact qui chauffe), Tesla (éclairs ramifiés), feu (jet de flammes
//   qui a du volume, sol qui brûle un instant), crachat d'acide du Béhémoth et piétinement du Titan.
// Les améliorations (niveau T de js/55-rts-niveaux.js, 0 à 1) ajoutent par-dessus : plus gros, plus de traînée, plus d'éclat.
// Seulement le visuel et le son : les dégâts restent instantanés et calculés dans js/42-rts-combat.js (rtsHit, rtsBlast).
// L'onde et la marque au sol d'une explosion ont le rayon réel des dégâts (S2.splash).
// Coût : 6 appels de dessin en tout (2 nuages de points, 1 maillage de rubans, 3 maillages instanciés), des réserves de
// taille fixe (rien n'est créé pendant le jeu), aucune lumière, des plafonds plus bas au cell (RFX_CAP) et un débit
// maximum par seconde pour les traçantes, les impacts et les grosses explosions (RFX_DEBIT).
// Branché sur js/42-rts-combat.js (rtsHit, rtsBlast, Tesla, Béhémoth, Titan) et js/43-rts-pilotage.js (obus du mortier piloté).

const RFX_CAP = isTouch
  ? { glow:450, soft:380, rib:220, pj:70, body:40, decal:24, ring:16 }
  : { glow:950, soft:760, rib:440, pj:150, body:80, decal:48, ring:32 };
// Débit maximum par seconde (au-delà : pas de traçante, impact sauté, explosion allégée)
const RFX_DEBIT = isTouch ? { trace:40, impact:30, boom:8, feu:24 } : { trace:90, impact:70, boom:16, feu:50 };
const RFX = { on:false, t:0, tok:{}, last:null, rib:0, pj:[], booms:0, scale:600 };
Object.keys(RFX_DEBIT).forEach(k => { RFX.tok[k] = RFX_DEBIT[k]; });
const rfxRoot = new THREE.Group(); rfxRoot.visible = false; scene.add(rfxRoot);
const rfxSz = new THREE.Vector2(), rfxV = new THREE.Vector3(), rfxW = new THREE.Vector3(), rfxD = new THREE.Vector3(), rfxO = new THREE.Object3D(), rfxC = new THREE.Color();
const rfxHex = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
// Hasard à part pour les effets : ils ne puisent pas dans Math.random, que le jeu et le simulateur utilisent (graine fixée)
let rfxGraine = 12345;
function rfxRand(a, b){ rfxGraine = rfxGraine * 16807 % 2147483647; return a + (b - a) * (rfxGraine - 1) / 2147483646; }
function rfxTok(k){ if (RFX.tok[k] >= 1){ RFX.tok[k]--; return true; } return false; }

// Textures faites une fois : tache ronde douce, marque de brûlure (multipliée sur le sol)
function rfxTex(f){ const c = document.createElement('canvas'); c.width = c.height = 64; f(c.getContext('2d')); const t = new THREE.CanvasTexture(c); return t; }
const RFX_TACHE = rfxTex(g => { const d = g.createRadialGradient(32, 32, 0, 32, 32, 32); d.addColorStop(0, 'rgba(255,255,255,1)'); d.addColorStop(.35, 'rgba(255,255,255,.7)'); d.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = d; g.fillRect(0, 0, 64, 64); });
const RFX_BRULE = rfxTex(g => { // marque de brûlure : sombre au centre, bord irrégulier, transparente autour
  const d = g.createRadialGradient(32, 32, 0, 32, 32, 30); d.addColorStop(0, 'rgba(0,0,0,.85)'); d.addColorStop(.55, 'rgba(0,0,0,.55)'); d.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = d; g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 14; i++){ const a = i / 14 * 6.28 + Math.sin(i * 7.3), r = 16 + (i % 3) * 4; g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 3 + (i % 4), 0, 6.3); g.fill(); }
});

/* ---------- Nuages de points (lueurs additives, fumée et débris) : 1 appel de dessin chacun ---------- */
const RFX_VS = 'attribute float aSize; attribute vec4 aCol; varying vec4 vCol; uniform float uScale;\n' +
  'void main(){ vCol = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(.5, -mv.z); gl_Position = projectionMatrix * mv; }';
const RFX_FS_GLOW = 'uniform sampler2D map; varying vec4 vCol;\n' +
  'void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vCol.rgb + vec3(a * a * a * .3), a * vCol.a); }';
const RFX_FS_SOFT = 'uniform sampler2D map; varying vec4 vCol;\n' +
  'void main(){ float a = texture2D(map, gl_PointCoord).a; if (a * vCol.a < .01) discard; gl_FragColor = vec4(vCol.rgb, a * vCol.a); }';
function rfxPoints(cap, glow){
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(cap * 3), siz = new Float32Array(cap), col = new Float32Array(cap * 4);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aCol', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
  geo.setDrawRange(0, 0);
  const mat = new THREE.ShaderMaterial({ uniforms:{ map:{ value:RFX_TACHE }, uScale:{ value:600 } }, vertexShader:RFX_VS, fragmentShader:glow ? RFX_FS_GLOW : RFX_FS_SOFT,
    transparent:true, depthWrite:false, blending:glow ? THREE.AdditiveBlending : THREE.NormalBlending });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = glow ? 12 : 11; pts.visible = false; rfxRoot.add(pts);
  // Données de chaque particule (tableaux simples, réserve fixe ; la plus vieille est remplacée quand c'est plein)
  const D = { cap, n:0, i:0, glow, pts, geo, pos, siz, col,
    p:new Float32Array(cap * 3), v:new Float32Array(cap * 3), life:new Float32Array(cap), max:new Float32Array(cap),
    s0:new Float32Array(cap), s1:new Float32Array(cap), c0:new Float32Array(cap * 3), c1:new Float32Array(cap * 3), a:new Float32Array(cap), g:new Float32Array(cap), dr:new Float32Array(cap) };
  return D;
}
// Une particule : position, vitesse, vie, taille (début, fin), couleur (début, fin), opacité, gravité, frein
function rfxP(D, x, y, z, vx, vy, vz, life, s0, s1, c0, c1, a, g, dr){
  const i = D.i; D.i = (D.i + 1) % D.cap; const k = i * 3;
  D.p[k] = x; D.p[k + 1] = y; D.p[k + 2] = z; D.v[k] = vx; D.v[k + 1] = vy; D.v[k + 2] = vz;
  D.life[i] = D.max[i] = life; D.s0[i] = s0; D.s1[i] = s1; D.a[i] = a; D.g[i] = g || 0; D.dr[i] = dr || 0;
  D.c0[k] = c0[0]; D.c0[k + 1] = c0[1]; D.c0[k + 2] = c0[2]; c1 = c1 || c0; D.c1[k] = c1[0]; D.c1[k + 1] = c1[1]; D.c1[k + 2] = c1[2];
}
function rfxPointsStep(D, dt){
  let n = 0; const P = D.p, V = D.v;
  for (let i = 0; i < D.cap; i++){
    if (D.life[i] <= 0) continue;
    D.life[i] -= dt; if (D.life[i] <= 0) continue;
    const k = i * 3, u = 1 - D.life[i] / D.max[i];
    if (dt > 0){
      const f = D.dr[i] ? Math.max(0, 1 - D.dr[i] * dt) : 1;
      V[k] *= f; V[k + 2] *= f; V[k + 1] = V[k + 1] * f - D.g[i] * dt;
      P[k] += V[k] * dt; P[k + 1] += V[k + 1] * dt; P[k + 2] += V[k + 2] * dt;
      if (P[k + 1] < .05 && D.g[i] > 0){ P[k + 1] = .05; V[k] *= .5; V[k + 1] = 0; V[k + 2] *= .5; }
    }
    const o = n * 3, q = n * 4;
    D.pos[o] = P[k]; D.pos[o + 1] = P[k + 1]; D.pos[o + 2] = P[k + 2];
    D.siz[n] = D.s0[i] + (D.s1[i] - D.s0[i]) * u;
    D.col[q] = D.c0[k] + (D.c1[k] - D.c0[k]) * u; D.col[q + 1] = D.c0[k + 1] + (D.c1[k + 1] - D.c0[k + 1]) * u; D.col[q + 2] = D.c0[k + 2] + (D.c1[k + 2] - D.c0[k + 2]) * u;
    D.col[q + 3] = D.a[i] * (D.glow ? (1 - u) : Math.min(1, u * 6) * (1 - u));
    n++;
  }
  D.n = n; D.geo.setDrawRange(0, n); D.pts.visible = n > 0;
  if (n){ D.geo.attributes.position.needsUpdate = true; D.geo.attributes.aSize.needsUpdate = true; D.geo.attributes.aCol.needsUpdate = true; }
}
const RFX_GLOW = rfxPoints(RFX_CAP.glow, true), RFX_SOFT = rfxPoints(RFX_CAP.soft, false);

/* ---------- Rubans (traçantes, rayons, éclairs, flammes) : refaits à chaque image, 1 appel de dessin ---------- */
const RFX_RIB = (function(){
  const cap = RFX_CAP.rib, geo = new THREE.BufferGeometry();
  const pos = new Float32Array(cap * 12), col = new Float32Array(cap * 16), uv = new Float32Array(cap * 8), idx = new Uint16Array(cap * 6);
  for (let i = 0; i < cap; i++){
    uv.set([0, -1, 0, 1, 1, -1, 1, 1], i * 8);
    const b = i * 4; idx.set([b, b + 2, b + 1, b + 2, b + 3, b + 1], i * 6);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aCol', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aUv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.setDrawRange(0, 0);
  const mat = new THREE.ShaderMaterial({ vertexShader:'attribute vec4 aCol; attribute vec2 aUv; varying vec4 vCol; varying vec2 vUv; void main(){ vCol = aCol; vUv = aUv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader:'varying vec4 vCol; varying vec2 vUv; void main(){ float e = 1.0 - vUv.y * vUv.y; gl_FragColor = vec4(vCol.rgb + vec3(e * e * e * .4), vCol.a * e); }',
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 13; m.visible = false; rfxRoot.add(m);
  return { cap, n:0, geo, pos, col, m };
})();
// Un ruban de a à b, large de w, tourné vers la caméra ; aT : opacité au bout a (traînée qui s'efface)
function rfxRib(ax, ay, az, bx, by, bz, w, c, al, aT){
  const R = RFX_RIB; if (R.n >= R.cap) return;
  const dx = bx - ax, dy = by - ay, dz = bz - az, cp = camera.position;
  const vx = cp.x - (ax + bx) * .5, vy = cp.y - (ay + by) * .5, vz = cp.z - (az + bz) * .5;
  let sx = dy * vz - dz * vy, sy = dz * vx - dx * vz, sz = dx * vy - dy * vx; const L = Math.hypot(sx, sy, sz); if (L < 1e-6) return;
  const h = w * .5 / L; sx *= h; sy *= h; sz *= h;
  const o = R.n * 12; R.pos[o] = ax - sx; R.pos[o + 1] = ay - sy; R.pos[o + 2] = az - sz; R.pos[o + 3] = ax + sx; R.pos[o + 4] = ay + sy; R.pos[o + 5] = az + sz;
  R.pos[o + 6] = bx - sx; R.pos[o + 7] = by - sy; R.pos[o + 8] = bz - sz; R.pos[o + 9] = bx + sx; R.pos[o + 10] = by + sy; R.pos[o + 11] = bz + sz;
  const q = R.n * 16, at = aT == null ? al : aT;
  for (let j = 0; j < 4; j++){ R.col[q + j * 4] = c[0]; R.col[q + j * 4 + 1] = c[1]; R.col[q + j * 4 + 2] = c[2]; R.col[q + j * 4 + 3] = j < 2 ? at : al; }
  R.n++;
}
// Rubans qui durent un peu (rayons, éclairs, traînées d'élite) : réserve fixe
const RFX_BEAMS = []; for (let i = 0; i < (isTouch ? 40 : 80); i++) RFX_BEAMS.push({ life:0, max:1, a:new THREE.Vector3(), b:new THREE.Vector3(), w:.1, c:null, al:1, bolt:0, pts:null, jT:0 });
function rfxBeam(a, b, w, c, al, life, bolt){
  let o = null, lo = 1e9; for (const x of RFX_BEAMS){ if (x.life <= 0){ o = x; break; } if (x.life < lo){ lo = x.life; o = x; } }
  o.a.copy(a); o.b.copy(b); o.w = w; o.c = c; o.al = al; o.life = o.max = life; o.bolt = bolt || 0; o.jT = 0;
  if (bolt && !o.pts) o.pts = new Float32Array(13 * 3);
  return o;
}
// Éclair : ligne brisée (12 segments) refaite toutes les 35 ms pour qu'il crépite
function rfxBoltPts(o){
  const a = o.a, b = o.b, d = a.distanceTo(b), j = Math.min(1.6, .12 * d + .2), P = o.pts;
  for (let i = 0; i <= 12; i++){ const t = i / 12, e = i === 0 || i === 12 ? 0 : j * Math.sin(t * Math.PI) ** .5; P[i * 3] = a.x + (b.x - a.x) * t + rfxRand(-e, e); P[i * 3 + 1] = a.y + (b.y - a.y) * t + rfxRand(-e, e) * .7; P[i * 3 + 2] = a.z + (b.z - a.z) * t + rfxRand(-e, e); }
}
function rfxBeamsStep(dt){
  for (const o of RFX_BEAMS){
    if (o.life <= 0) continue; o.life -= dt; if (o.life <= 0) continue;
    const u = o.life / o.max, al = o.al * u;
    if (o.bolt){
      o.jT -= dt; if (o.jT <= 0){ o.jT = .035; rfxBoltPts(o); }
      const P = o.pts, halo = [o.c[0] * .6, o.c[1] * .6, o.c[2]];
      for (let i = 0; i < 12; i++){
        const k = i * 3;
        rfxRib(P[k], P[k + 1], P[k + 2], P[k + 3], P[k + 4], P[k + 5], o.w * 4, halo, al * .6);
        rfxRib(P[k], P[k + 1], P[k + 2], P[k + 3], P[k + 4], P[k + 5], o.w, o.c, al);
      }
    } else rfxRib(o.a.x, o.a.y, o.a.z, o.b.x, o.b.y, o.b.z, o.w * (.8 + .2 * u), o.c, al);
  }
}

/* ---------- Corps des projectiles, marques au sol, ondes : 3 maillages instanciés ---------- */
function rfxInst(geo, mat, cap, order){ const m = new THREE.InstancedMesh(geo, mat, cap); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.setColorAt(0, rfxC.set(0xffffff)); m.instanceColor.setUsage(THREE.DynamicDrawUsage); m.count = 0; m.frustumCulled = false; m.renderOrder = order; m.visible = false; rfxRoot.add(m); return m; }
const RFX_BODY = rfxInst(new THREE.CylinderGeometry(.35, .5, 1, 6).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color:0xffffff }), RFX_CAP.body, 1);
// Marques au sol : petit nuanceur ; la couleur de l'instance donne la teinte, son échelle en hauteur (inutile pour un plan couché)
// donne l'opacité, qui baisse à la fin de sa vie (instanceMatrix et instanceColor sont déclarés par Three.js)
const RFX_DEC = rfxInst(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms:{ map:{ value:RFX_BRULE } },
  vertexShader:'varying vec2 vUv; varying vec3 vCol; varying float vA; void main(){ vUv = uv; vCol = instanceColor; vA = length(instanceMatrix[1].xyz); gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
  fragmentShader:'uniform sampler2D map; varying vec2 vUv; varying vec3 vCol; varying float vA; void main(){ float a = texture2D(map, vUv).a * vA; if (a < .01) discard; gl_FragColor = vec4(vCol, a); }',
  transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 }), RFX_CAP.decal, 2);
const RFX_RING = rfxInst(new THREE.RingGeometry(.84, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide }), RFX_CAP.ring, 14);
const RFX_DECS = []; for (let i = 0; i < RFX_CAP.decal; i++) RFX_DECS.push({ life:0, max:1, x:0, z:0, r:1, rot:0, c:null });
const RFX_RINGS = []; for (let i = 0; i < RFX_CAP.ring; i++) RFX_RINGS.push({ life:0, max:1, x:0, y:0, z:0, r:1, c:null, wait:0 });
let rfxDecI = 0, rfxRingI = 0;
function rfxDecal(x, z, r, life, tint){ const o = RFX_DECS[rfxDecI]; rfxDecI = (rfxDecI + 1) % RFX_DECS.length; Object.assign(o, { life, max:life, x, z, r, rot:rfxRand(0, 6.28), c:tint || [1, 1, 1] }); }
function rfxRing(x, y, z, r, life, c, wait){ const o = RFX_RINGS[rfxRingI]; rfxRingI = (rfxRingI + 1) % RFX_RINGS.length; Object.assign(o, { life, max:life, x, y, z, r, c, wait:wait || 0 }); }
function rfxInstStep(dt){
  let n = 0;
  for (const o of RFX_DECS){
    if (o.life <= 0) continue; o.life -= dt; if (o.life <= 0) continue;
    const f = Math.min(1, o.life / (o.max * .4));      // la marque pâlit pendant les derniers 40 % de sa vie
    rfxO.position.set(o.x, .06, o.z); rfxO.rotation.set(0, o.rot, 0); rfxO.scale.set(o.r, Math.max(.001, f), o.r); rfxO.updateMatrix(); RFX_DEC.setMatrixAt(n, rfxO.matrix);
    RFX_DEC.setColorAt(n, rfxC.setRGB(o.c[0], o.c[1], o.c[2])); n++;
  }
  RFX_DEC.count = n; RFX_DEC.visible = n > 0; if (n){ RFX_DEC.instanceMatrix.needsUpdate = true; RFX_DEC.instanceColor.needsUpdate = true; }
  n = 0;
  for (const o of RFX_RINGS){
    if (o.life <= 0) continue;
    if (o.wait > 0){ o.wait -= dt; continue; }
    o.life -= dt; if (o.life <= 0) continue;
    const u = 1 - o.life / o.max, s = o.r * (1 - (1 - u) * (1 - u) * (1 - u)) + .2, f = (1 - u) * (1 - u);  // s'ouvre vite jusqu'au rayon réel
    rfxO.position.set(o.x, o.y, o.z); rfxO.rotation.set(0, 0, 0); rfxO.scale.set(s, 1, s); rfxO.updateMatrix(); RFX_RING.setMatrixAt(n, rfxO.matrix);
    RFX_RING.setColorAt(n, rfxC.setRGB(o.c[0] * f, o.c[1] * f, o.c[2] * f)); n++;
  }
  RFX_RING.count = n; RFX_RING.visible = n > 0; if (n){ RFX_RING.instanceMatrix.needsUpdate = true; RFX_RING.instanceColor.needsUpdate = true; }
}

/* ---------- Couleurs ---------- */
const RC = {
  blanc:[1, 1, 1], jaune:[1, .86, .5], orange:[1, .55, .18], rouge:[.85, .2, .05], braise:[1, .42, .1], trace:[1, .78, .42], traceB:[1, .95, .8],
  fumee:[.2, .18, .16], fumeeC:[.62, .58, .54], gris:[.75, .72, .68], terre:[.34, .26, .18], sable:[.62, .52, .38], sang:[.42, .03, .03], sangC:[.6, .08, .06],
  cyan:[.35, .95, 1], cyanB:[.85, 1, 1], violet:[.7, .55, 1], violetB:[.95, .9, 1], acide:[.5, 1, .2], acideF:[.25, .5, .08],
  corpsR:[.42, .44, .32], corpsM:[.85, .86, .82], corpsO:[.55, .45, .25], corpsB:[.2, .22, .2], brule:[.1, .08, .06], bruleA:[.2, .4, .05]
};

/* ---------- Familles d'armes ---------- */
// fam est écrit par le tir quand il le faut (Hellfire : 'missile') ; sinon il vient des champs du tir
function rfxFam(S2){
  if (!S2) return 'balle';
  if (S2.fam) return S2.fam;
  if (S2.flame) return 'feu';
  if (S2.chain) return 'tesla';
  if (S2.splash){ if (S2.big) return 'obus105'; if (S2.min) return 'mortier'; if (S2.bomb) return 'bombe'; if (S2.snd === 'mg50' || S2.snd === 'sniper') return 'obus'; return 'roquette'; }
  if (S2.beam === 0x50f0ff) return 'laser';
  if (S2.pierce) return S2.beam === 0xffc060 ? 'obusp' : 'elite';
  return 'balle';
}
const rfxT = S2 => (S2 && typeof S2.tier === 'number' ? clamp(S2.tier, 0, 1) : .5);
const rfxPres = p => p.distanceToSquared(camera.position) < 30; // départ sous les yeux (poste) : le poste a déjà son éclair

// Éclair de bouche et fumée de départ
function rfxMuzzle(from, to, fam, T){
  if (rfxPres(from)) return;
  const lourd = fam === 'obus' || fam === 'obus105' || fam === 'obusp' || fam === 'roquette' || fam === 'missile' || fam === 'mortier';
  const s = (fam === 'balle' ? 1.1 : fam === 'elite' ? 1.8 : lourd ? 2.6 : 1.4) * (1 + .5 * T);
  rfxP(RFX_GLOW, from.x, from.y, from.z, 0, 0, 0, fam === 'balle' ? .06 : .1, s, s * .6, RC.jaune, RC.orange, 1);
  if (lourd){
    rfxD.subVectors(to, from).normalize();
    const n = fam === 'obus' || fam === 'obus105' ? 4 : 2;
    for (let i = 0; i < n; i++) rfxP(RFX_SOFT, from.x + rfxD.x * rfxRand(.3, 1.5), from.y + rfxRand(0, .4), from.z + rfxD.z * rfxRand(.3, 1.5), rfxD.x * rfxRand(1, 4) + rfxRand(-1, 1), rfxRand(.4, 1.2), rfxD.z * rfxRand(1, 4) + rfxRand(-1, 1), rfxRand(.8, 1.3) * (1 + T), 1.2, 3 + 2 * T, RC.fumeeC, RC.gris, .5, 0, 1.5);
    if (fam === 'obus' && from.y < 6) rfxRing(from.x, .15, from.z, 4 + 2 * T, .35, [.5, .42, .3]); // le souffle du canon soulève le sable
  }
}
// Impact sans explosion : sang, poussière, étincelles
function rfxImpact(p, kind, fam, T){
  if (!rfxTok('impact')) return;
  const gros = fam === 'elite' || fam === 'obusp', n = (gros ? 5 : 2) + Math.round(2 * T);
  if (kind === 'z'){
    for (let i = 0; i < n; i++) rfxP(RFX_SOFT, p.x, p.y, p.z, rfxRand(-2, 2), rfxRand(1, 4), rfxRand(-2, 2), rfxRand(.4, .7), gros ? 1.2 : .9, gros ? 1.8 : 1.3, RC.sangC, RC.sang, .9, 14);
    if (gros) rfxP(RFX_GLOW, p.x, p.y, p.z, 0, 0, 0, .1, 1.4 + T, .5, RC.jaune, RC.orange, .8);
  } else {
    for (let i = 0; i < n; i++) rfxP(RFX_SOFT, p.x, Math.max(.2, p.y), p.z, rfxRand(-1.5, 1.5), rfxRand(1.5, 4), rfxRand(-1.5, 1.5), rfxRand(.5, .9), .7, 1.5, RC.sable, RC.fumeeC, .7, 9);
    rfxP(RFX_GLOW, p.x, Math.max(.3, p.y), p.z, 0, 0, 0, .08, .9 + T, .3, RC.jaune, RC.orange, .7);
  }
  if (T > .5 || gros) for (let i = 0; i < 2 + Math.round(3 * T); i++) rfxP(RFX_GLOW, p.x, p.y, p.z, rfxRand(-5, 5), rfxRand(2, 7), rfxRand(-5, 5), rfxRand(.25, .45), .35, .1, RC.traceB, RC.orange, 1, 20);
}

/* ---------- Explosion : boule de feu, éclair, fumée, débris, marque au sol, onde (rayon réel R) ---------- */
function rfxBoom(x, y, z, R, T, o){
  o = o || {};
  RFX.booms++;
  const plein = rfxTok('boom'), big = !!o.big, k = .6 + .8 * T;
  const fy = Math.max(.6, y < 3 ? .6 + R * .15 : y);
  // Éclair et onde : toujours (lisibles de loin, peu coûteux)
  rfxP(RFX_GLOW, x, fy + R * .2, z, 0, 0, 0, .14 + .06 * T, R * (2.2 + .6 * T), R * 1.2, RC.blanc, RC.orange, 1);
  rfxRing(x, .2, z, R, .32 + .1 * T, o.acide ? RC.acide : [1, .62, .28]);
  if (big || T > .66) rfxRing(x, .25, z, R * 1.0, .6, [.55, .45, .32], .08); // deuxième onde (poussière)
  // Boule de feu
  const nf = (plein ? 4 + Math.round(3 * T) : 2) + (big ? 5 : 0);
  for (let i = 0; i < nf; i++){
    const a = rfxRand(0, 6.28), r = rfxRand(0, .45) * R;
    rfxP(RFX_GLOW, x + Math.cos(a) * r, fy + rfxRand(0, .35) * R, z + Math.sin(a) * r, Math.cos(a) * rfxRand(.5, 2), rfxRand(1.5, 3.5), Math.sin(a) * rfxRand(.5, 2),
      rfxRand(.35, .6) + (big ? .25 : 0) + .15 * T, R * rfxRand(.9, 1.2), R * rfxRand(1.4, 1.8), o.acide ? RC.acide : RC.orange, o.acide ? RC.acideF : RC.rouge, .8, 0, 1);
  }
  if (big) for (let i = 0; i < 3; i++) rfxP(RFX_GLOW, x + rfxRand(-1, 1), 3 + i * 2.5, z + rfxRand(-1, 1), 0, 3, 0, .7, R * .7, R * .9, RC.jaune, RC.rouge, .8, 0, 1); // colonne de feu
  // Fumée qui monte et reste
  const ns = (plein ? 3 + Math.round(3 * T) : 1) + (big ? 6 : 0);
  for (let i = 0; i < ns; i++) rfxP(RFX_SOFT, x + rfxRand(-.4, .4) * R, fy + rfxRand(0, .6) * R, z + rfxRand(-.4, .4) * R, rfxRand(-.4, .4) + .6, rfxRand(.8, 2) * (big ? 1.6 : 1), rfxRand(-.4, .4),
    rfxRand(1.4, 2.2) + 1.2 * T + (big ? 1.5 : 0), R * .8, R * (1.7 + .6 * T), o.acide ? RC.acideF : RC.fumee, o.acide ? RC.fumeeC : RC.fumeeC, .6, 0, .3);
  if (!plein){ rfxDecal(x, z, R * .9, 4, o.acide ? RC.bruleA : RC.brule); return; }
  // Étincelles et débris de terre
  const sp = Math.sqrt(R / 3);
  for (let i = 0; i < 5 + Math.round(10 * T) + (big ? 8 : 0); i++){ const a = rfxRand(0, 6.28), v = rfxRand(5, 13) * sp; rfxP(RFX_GLOW, x, fy, z, Math.cos(a) * v, rfxRand(5, 12) * sp, Math.sin(a) * v, rfxRand(.45, .85), .55 * k, .15, RC.traceB, RC.braise, 1, 22, .5); }
  const nt = 4 + Math.round(8 * T) + (o.terre ? 6 : 0) + (big ? 10 : 0);
  for (let i = 0; i < nt; i++){ const a = rfxRand(0, 6.28), v = rfxRand(3, 9) * sp; rfxP(RFX_SOFT, x + Math.cos(a) * R * .2, .4, z + Math.sin(a) * R * .2, Math.cos(a) * v, rfxRand(4, 9) * sp, Math.sin(a) * v, rfxRand(.7, 1.1), .6 + .3 * T, .4, o.acide ? RC.acideF : RC.terre, o.acide ? RC.acideF : RC.terre, .95, 24); }
  if (o.terre) for (let i = 0; i < 4; i++) rfxP(RFX_SOFT, x + rfxRand(-.3, .3) * R, .5, z + rfxRand(-.3, .3) * R, rfxRand(-1, 1), rfxRand(4, 8) * sp, rfxRand(-1, 1), rfxRand(.9, 1.4), R * .5, R * 1.2, RC.sable, RC.fumeeC, .65, 6, 1); // terre soulevée
  if (o.burn) for (let i = 0; i < 8; i++){ const a = rfxRand(0, 6.28), r = rfxRand(0, .8) * R; rfxP(RFX_GLOW, x + Math.cos(a) * r, .4, z + Math.sin(a) * r, 0, rfxRand(.3, 1), 0, rfxRand(1.6, 2.6), rfxRand(.9, 1.6), .4, RC.orange, RC.rouge, .9); } // obus incendiaire : le sol brûle
  rfxDecal(x, z, R * .9, (big ? 10 : 5) + 4 * T, o.acide ? RC.bruleA : RC.brule);
  // Deuxième boule de feu plus haut pour les armes au maximum (les paliers se voient)
  if (T > .66 && !o.acide) for (let i = 0; i < 2; i++) rfxP(RFX_GLOW, x + rfxRand(-.3, .3) * R, fy + R * rfxRand(.4, .7), z + rfxRand(-.3, .3) * R, 0, 2.5, 0, .5, R * .5, R * 1.1, RC.jaune, RC.rouge, .8, 0, 1);
}
// Secousse près de la caméra pilotée, et sons (comme js/55-rts-niveaux.js)
function rfxBoomFx(x, z, S2, T){
  const big = !!S2.big;
  if (RTS.pilot){ const d = Math.hypot(camera.position.x - x, camera.position.z - z), near = clamp(1 - d / (big ? 60 : 28), 0, 1); if (near > 0) shake = Math.max(shake, (big ? .9 : .35) * near * (.6 + .4 * T)); }
  if (big){ shake = Math.max(shake, (RTS.pilot ? .25 : .12) + (RTS.pilot ? .75 : .4) * T); if (typeof Snd === 'object' && Snd.boom) Snd.boom(.6 + 2 * T); }
  else if (typeof Snd === 'object' && Snd.boom && rfxRand(0, 1) < .5) Snd.boom(S2.bomb ? 1 : .25 + .6 * T);
}
function rfxBlastNow(x, z, S2){
  const T = rfxT(S2), fam = rfxFam(S2);
  rfxBoom(x, .5, z, S2.splash || 3, T, { big:!!S2.big, terre:fam === 'obus' || fam === 'obus105' || fam === 'mortier', burn:!!S2.burn });
  try { rfxBoomFx(x, z, S2, T); } catch (e) { errNote(e); }
}

/* ---------- Projectiles en vol ---------- */
// Vitesse (m/s), courbe, corps, traînée : le vol dure au plus quelques dixièmes de seconde (les dégâts sont déjà faits)
const RFX_VOL = {
  balle:   { v:240, tmax:.18 }, elite:{ v:420, tmax:.12 }, obusp:{ v:170, tmax:.2 },
  obus:    { v:190, tmax:.28 }, obus105:{ v:170, tmax:.42 }, mortier:{ v:70, tmax:.6, arc:.4 },
  roquette:{ v:60, tmax:.45, corps:RC.corpsR, fumee:1 }, missile:{ v:75, tmax:.45, arc:.12, corps:RC.corpsM, fumee:1.3 },
  bombe:   { v:40, tmax:.5, corps:RC.corpsB }, acide:{ v:40, tmax:.5, arc:.25 }
};
function rfxProj(fam, from, to, T, kind, S2){
  const C = RFX_VOL[fam] || RFX_VOL.balle, d = from.distanceTo(to);
  if (RFX.pj.length >= RFX_CAP.pj) return null;
  const pj = { fam, T, kind, S2, ax:from.x, ay:from.y, az:from.z, bx:to.x, by:to.y, bz:to.z, t:0, dur:clamp(d / C.v, .04, C.tmax), arc:(C.arc || 0) * d, smT:0, blast:null, x:from.x, y:from.y, z:from.z, px:from.x, py:from.y, pz:from.z };
  RFX.pj.push(pj); return pj;
}
function rfxProjStep(dt){
  let nb = 0;
  for (let i = RFX.pj.length - 1; i >= 0; i--){
    const p = RFX.pj[i], C = RFX_VOL[p.fam] || RFX_VOL.balle;
    p.t += dt; const u = Math.min(1, p.t / p.dur);
    p.px = p.x; p.py = p.y; p.pz = p.z;
    p.x = p.ax + (p.bx - p.ax) * u; p.y = p.ay + (p.by - p.ay) * u + p.arc * 4 * u * (1 - u); p.z = p.az + (p.bz - p.az) * u;
    if (u >= 1){ RFX.pj.splice(i, 1); rfxLand(p); continue; }
    // direction de vol (tangente)
    const u2 = Math.min(1, u + .02);
    rfxD.set(p.ax + (p.bx - p.ax) * u2 - p.x, p.ay + (p.by - p.ay) * u2 + p.arc * 4 * u2 * (1 - u2) - p.y, p.az + (p.bz - p.az) * u2 - p.z);
    const L = rfxD.length() || 1; rfxD.multiplyScalar(1 / L);
    const T = p.T, f = p.fam;
    if (rfxPres(rfxV.set(p.x, p.y, p.z))) continue; // encore sous les yeux du pilote
    if (f === 'balle' || f === 'elite' || f === 'obusp'){
      const len = f === 'elite' ? 12 : f === 'obusp' ? 6 : 4 + 3 * T, w = (f === 'elite' ? .32 : f === 'obusp' ? .4 : .3) * (1 + .7 * T);
      rfxRib(p.x - rfxD.x * len, p.y - rfxD.y * len, p.z - rfxD.z * len, p.x, p.y, p.z, w, f === 'obusp' ? RC.orange : RC.trace, 1, 0);
      if (T > .5 || f === 'elite') rfxRib(p.x - rfxD.x * len * .6, p.y - rfxD.y * len * .6, p.z - rfxD.z * len * .6, p.x, p.y, p.z, w * .35, RC.blanc, 1, 0); // cœur blanc
    } else if (f === 'obus' || f === 'obus105' || f === 'mortier' || f === 'acide'){
      const ac = f === 'acide', s = (f === 'obus105' ? 2.2 : f === 'obus' ? 1.5 : 1.3) * (1 + .5 * T), len = f === 'mortier' || ac ? 3 : 7;
      rfxRib(p.x - rfxD.x * len, p.y - rfxD.y * len, p.z - rfxD.z * len, p.x, p.y, p.z, s * .3, ac ? RC.acide : RC.orange, .9, 0);
      if (RFX_GLOW.n < RFX_GLOW.cap - 8) rfxP(RFX_GLOW, p.x, p.y, p.z, 0, 0, 0, .05, s, s * .8, ac ? RC.acide : RC.jaune, ac ? RC.acide : RC.orange, 1);
      if (f === 'mortier' || f === 'obus105'){ p.smT -= dt; if (p.smT <= 0){ p.smT = .04; rfxP(RFX_SOFT, p.x, p.y, p.z, 0, .3, 0, .6 + .6 * T, .5, 1.4, RC.gris, RC.fumeeC, .35); } }
    } else { // roquette, missile, bombe : un corps, une flamme derrière, une traînée de fumée qui reste
      const s = (f === 'missile' ? 1.15 : 1) * (1 + .45 * T), bl = (f === 'bombe' ? 1.1 : .95) * s;
      if (nb < RFX_CAP.body){
        rfxO.position.set(p.x, p.y, p.z); rfxO.lookAt(p.x + rfxD.x, p.y + rfxD.y, p.z + rfxD.z); rfxO.scale.set(.32 * s, .32 * s, bl); rfxO.updateMatrix();
        RFX_BODY.setMatrixAt(nb, rfxO.matrix); RFX_BODY.setColorAt(nb, rfxC.setRGB(C.corps[0], C.corps[1], C.corps[2])); nb++;
      }
      if (f !== 'bombe'){
        const bx = p.x - rfxD.x * bl * .5, by = p.y - rfxD.y * bl * .5, bz = p.z - rfxD.z * bl * .5, fl = (1.4 + 1.2 * T) * rfxRand(.8, 1.15);
        rfxRib(bx - rfxD.x * fl, by - rfxD.y * fl, bz - rfxD.z * fl, bx, by, bz, .55 * s, RC.orange, 1, 0);
        rfxRib(bx - rfxD.x * fl * .5, by - rfxD.y * fl * .5, bz - rfxD.z * fl * .5, bx, by, bz, .22 * s, RC.blanc, 1, 0);
        if (RFX_GLOW.n < RFX_GLOW.cap - 8) rfxP(RFX_GLOW, bx, by, bz, 0, 0, 0, .05, 1.7 * s + .6 * T, 1, RC.jaune, RC.orange, 1);
        // traînée : des bouffées posées le long du chemin parcouru depuis l'image d'avant
        const seg = Math.hypot(p.x - p.px, p.y - p.py, p.z - p.pz), pas = isTouch ? 1.6 : 1, nn = Math.min(8, Math.ceil(seg / pas));
        for (let j = 0; j < nn; j++){ const t = (j + rfxRand(0, 1)) / nn; rfxP(RFX_SOFT, p.px + (p.x - p.px) * t - rfxD.x * bl, p.py + (p.y - p.py) * t - rfxD.y * bl, p.pz + (p.z - p.pz) * t - rfxD.z * bl, rfxRand(-.2, .2), rfxRand(.1, .5), rfxRand(-.2, .2), (.9 + 1.4 * T) * (C.fumee || 1) * rfxRand(.8, 1.2), .7 * s, (2.2 + 1.4 * T) * (C.fumee || 1), RC.gris, RC.fumeeC, .6, 0, .8); }
      }
    }
  }
  RFX_BODY.count = nb; RFX_BODY.visible = nb > 0; if (nb){ RFX_BODY.instanceMatrix.needsUpdate = true; RFX_BODY.instanceColor.needsUpdate = true; }
}
// Arrivée : explosion (si le tir en avait une) ou impact
function rfxLand(p){
  if (p.landOnly) return; // mortier piloté : rtsBlast fait l'explosion à l'heure
  if (p.blast){ rfxBlastNow(p.blast.x, p.blast.z, p.blast.S2); return; }
  if (p.fam === 'acide'){ rfxBoom(p.bx, .5, p.bz, 2.2, .3, { acide:true }); return; }
  rfxImpact(rfxV.set(p.bx, p.by, p.bz), p.kind, p.fam, p.T);
}

/* ---------- Branchements (appelés par js/42-rts-combat.js et js/43-rts-pilotage.js) ---------- */
// Un tir : départ, vol, arrivée. La traînée trop près des yeux (clear faux) n'est pas dessinée.
function rtsFxShot(from, to, S2, clear, kind){
  RFX.last = null;
  if (!RTS.on) return;
  const fam = rfxFam(S2), T = rfxT(S2);
  if (fam === 'feu'){ rfxFlame(from, to, T); return; }
  if (fam === 'tesla'){ rtsFxBolt(from, to, T, true); return; }
  if (fam === 'laser'){
    rfxMuzzle(from, to, fam, T);
    if (clear){ rfxBeam(from, to, 1.5 + .9 * T, RC.cyan, .7, .2 + .1 * T); rfxBeam(from, to, .32 + .18 * T, RC.cyanB, 1, .15 + .08 * T); }
    rfxP(RFX_GLOW, to.x, to.y, to.z, 0, 0, 0, .25, 3 + 1.5 * T, 1, RC.cyanB, RC.cyan, 1);
    rfxP(RFX_GLOW, to.x, Math.max(.3, to.y - .6), to.z, 0, .4, 0, .6 + .4 * T, .9 + .5 * T, .5, RC.jaune, RC.rouge, .8); // le point d'impact chauffe
    if (kind !== 'z') rfxDecal(to.x, to.z, .9 + .5 * T, 3, RC.brule);
    for (let i = 0; i < 3 + Math.round(4 * T); i++) rfxP(RFX_GLOW, to.x, to.y, to.z, rfxRand(-5, 5), rfxRand(1, 6), rfxRand(-5, 5), rfxRand(.2, .4), .4, .1, RC.cyanB, RC.cyan, 1, 16);
    return;
  }
  const balle = fam === 'balle';
  if (balle && !rfxTok('trace')){ if (rfxRand(0, 1) < .35) rfxImpact(to, kind, fam, T); return; } // trop de balles à la fois : impact seulement, parfois
  rfxMuzzle(from, to, fam, T);
  if (fam === 'elite' && clear) rfxBeam(from, to, .1 + .08 * T, RC.traceB, .45, .3 + .2 * T); // la ligne du tir d'élite reste un instant
  const pj = rfxProj(fam, from, to, T, kind, S2);
  const expl = !!S2.splash;
  if (!pj){ if (!expl) rfxImpact(to, kind, fam, T); return; }
  if (expl){
    RFX.last = { S2, pj };                                   // rtsBlast (même tir) donnera le point de l'explosion
    if (kind === 'nest') pj.blast = { x:to.x, z:to.z, S2 }; // sur un nid : pas de rtsBlast, l'explosion est ici
  }
}
// Explosion au sol (rtsBlast) : au moment où l'obus ou la roquette arrive
function rtsFxBlast(x, z, S2){
  if (!RTS.on) return;
  const L = RFX.last; RFX.last = null;
  if (L && L.S2 === S2 && RFX.pj.indexOf(L.pj) >= 0){ L.pj.blast = { x, z, S2 }; L.pj.bx = x; L.pj.bz = z; L.pj.by = Math.min(L.pj.by, 1); return; }
  rfxBlastNow(x, z, S2);
}
// Tesla : éclair ramifié qui crépite, lueur au point touché
function rtsFxBolt(a, b, T, first){
  if (!RTS.on) return;
  T = T == null ? .5 : T;
  rfxBeam(a, b, (first ? .3 : .22) * (1 + .6 * T), RC.violetB, 1, .18 + .06 * T, 1);
  const nb = first ? 1 + Math.round(T * 2) : (T > .5 ? 1 : 0);
  for (let i = 0; i < nb; i++){ rfxW.copy(a).lerp(b, rfxRand(.3, .7)); rfxV.set(rfxW.x + rfxRand(-3, 3), rfxW.y + rfxRand(-1.5, 1), rfxW.z + rfxRand(-3, 3)); rfxBeam(rfxW, rfxV, .08 * (1 + .6 * T), RC.violet, .8, .12, 1); }
  rfxP(RFX_GLOW, b.x, b.y, b.z, 0, 0, 0, .22, 2.6 + 1.2 * T, 1, RC.violetB, RC.violet, 1);
  if (first) rfxP(RFX_GLOW, a.x, a.y, a.z, 0, 0, 0, .16, 1.8 + T, .6, RC.violetB, RC.violet, 1);
  for (let i = 0; i < 2 + Math.round(3 * T); i++) rfxP(RFX_GLOW, b.x, b.y, b.z, rfxRand(-4, 4), rfxRand(1, 5), rfxRand(-4, 4), rfxRand(.2, .35), .35, .1, RC.violetB, RC.violet, 1, 14);
}
// Lance-flammes : un jet de boules de feu qui grossissent en avançant, de la fumée au bout, le sol brûle un instant
function rfxFlame(from, to, T){
  if (!rfxTok('feu')) return;
  rfxD.subVectors(to, from); const d = rfxD.length() || 1; rfxD.multiplyScalar(1 / d);
  const n = 5 + Math.round(3 * T), vie = .38;
  if (!rfxPres(from)) rfxBeam(from, to, 1.1 + .6 * T, RC.orange, .45, .1); // le cœur du jet, continu d'un tir à l'autre
  for (let i = 0; i < n; i++){
    const sp = d / vie * rfxRand(.75, 1.05), j = 1.2 + .8 * T;
    rfxP(RFX_GLOW, from.x + rfxD.x * rfxRand(0, 1.2), from.y + rfxD.y * rfxRand(0, 1.2), from.z + rfxD.z * rfxRand(0, 1.2),
      rfxD.x * sp + rfxRand(-j, j), rfxD.y * sp + rfxRand(-.5, .8), rfxD.z * sp + rfxRand(-j, j), vie * rfxRand(.85, 1.1), .8, (2.8 + 1.4 * T) * rfxRand(.8, 1.2), RC.jaune, RC.rouge, .9, -1.5, .6);
  }
  if (rfxRand(0, 1) < .5) rfxP(RFX_SOFT, to.x, to.y + .5, to.z, rfxRand(-.3, .3), rfxRand(1, 2), rfxRand(-.3, .3), 1 + .6 * T, 1, 2.6 + T, RC.fumee, RC.fumeeC, .45);
  if (rfxRand(0, 1) < .35 + .3 * T) rfxP(RFX_GLOW, to.x + rfxRand(-1, 1), .35, to.z + rfxRand(-1, 1), 0, rfxRand(.2, .6), 0, rfxRand(.9, 1.5), rfxRand(1, 1.6), .5, RC.orange, RC.rouge, .8); // le sol brûle
}
// Béhémoth : crachat d'acide en arc, éclaboussure verte
function rtsFxAcid(from, to){
  if (!RTS.on) return;
  rfxP(RFX_GLOW, from.x, from.y, from.z, 0, 0, 0, .15, 2.4, 1, RC.acide, RC.acideF, .9);
  if (!rfxProj('acide', from, to, .4, 'z', null)) rfxBoom(to.x, .5, to.z, 2.2, .3, { acide:true });
}
// Titan : onde de choc au sol (rayon réel du piétinement) et anneau de poussière
function rtsFxStomp(x, z, r){
  if (!RTS.on) return;
  rfxRing(x, .2, z, r, .5, [.8, .65, .45]); rfxRing(x, .25, z, r * .6, .4, [.6, .5, .35], .06);
  for (let i = 0; i < 16; i++){ const a = i / 16 * 6.28; rfxP(RFX_SOFT, x + Math.cos(a) * 2, .5, z + Math.sin(a) * 2, Math.cos(a) * r * 1.6, rfxRand(.5, 1.5), Math.sin(a) * r * 1.6, .7, 1.5, 3.5, RC.sable, RC.fumeeC, .6, 0, 2.4); }
}
// Mortier piloté : l'obus monte en arc et tombe au bout de « t » secondes (l'explosion vient de rtsBlast)
function rtsFxMortar(fromX, fromZ, x, z, t, S2){
  if (!RTS.on) return;
  const T = rfxT(S2); rfxV.set(fromX, 3, fromZ); rfxW.set(x, .5, z);
  rfxMuzzle(rfxV, rfxW, 'mortier', T);
  const p = rfxProj('mortier', rfxV, rfxW, T, 'pt', S2); if (p){ p.dur = Math.max(.1, t - .02); p.arc = Math.max(p.arc, 8 + .5 * Math.hypot(x - fromX, z - fromZ)); p.landOnly = true; }
}

/* ---------- Chaque image ---------- */
function rfxClear(){
  RFX.pj.length = 0; RFX.last = null; Object.keys(RFX_DEBIT).forEach(k => { RFX.tok[k] = RFX_DEBIT[k] * .5; });
  [RFX_GLOW, RFX_SOFT].forEach(D => { D.life.fill(0); D.n = 0; D.geo.setDrawRange(0, 0); D.pts.visible = false; });
  RFX_BEAMS.forEach(o => { o.life = 0; }); RFX_DECS.forEach(o => { o.life = 0; }); RFX_RINGS.forEach(o => { o.life = 0; });
  RFX_BODY.count = RFX_DEC.count = RFX_RING.count = 0; RFX_BODY.visible = RFX_DEC.visible = RFX_RING.visible = false;
  RFX_RIB.n = 0; RFX_RIB.geo.setDrawRange(0, 0); RFX_RIB.m.visible = false;
}
function rtsFxFrame(dt){
  if (!RTS.on){ if (rfxRoot.visible){ rfxClear(); rfxRoot.visible = false; } return; }
  rfxRoot.visible = true;
  if (RTS.paused) dt = 0;
  dt = Math.min(dt, .1);
  Object.keys(RFX_DEBIT).forEach(k => { RFX.tok[k] = Math.min(RFX_DEBIT[k] * .5, RFX.tok[k] + RFX_DEBIT[k] * dt); }); // débit par seconde, réserve d'une demi-seconde
  const sz = renderer.getDrawingBufferSize(rfxSz); RFX.scale = sz.y * .5 * camera.projectionMatrix.elements[5];
  RFX_GLOW.pts.material.uniforms.uScale.value = RFX_SOFT.pts.material.uniforms.uScale.value = RFX.scale;
  RFX_RIB.n = 0;
  rfxProjStep(dt); rfxBeamsStep(dt);
  rfxPointsStep(RFX_GLOW, dt); rfxPointsStep(RFX_SOFT, dt); rfxInstStep(dt);
  const R = RFX_RIB; R.geo.setDrawRange(0, R.n * 6); R.m.visible = R.n > 0; RFX.rib = R.n;
  if (R.n){ R.geo.attributes.position.needsUpdate = true; R.geo.attributes.aCol.needsUpdate = true; }
}
Jeu.on('image', dt => { try { rtsFxFrame(dt); } catch (e) { errNote(e); } });

// Accès pour les tests automatiques
window.__rtsEffets = {
  RFX, RFX_CAP, RFX_DEBIT, RFX_RINGS, RFX_DECS, RFX_BEAMS, rfxFam, rfxBoom, rfxClear, rtsFxFrame,
  compte(){
    const vie = L => L.reduce((n, o) => n + (o.life > 0 ? 1 : 0), 0);
    let g = 0, s = 0; for (let i = 0; i < RFX_GLOW.cap; i++) if (RFX_GLOW.life[i] > 0) g++; for (let i = 0; i < RFX_SOFT.cap; i++) if (RFX_SOFT.life[i] > 0) s++;
    const o = { lueurs:g, fumee:s, rubans:RFX.rib, projectiles:RFX.pj.length, rayons:vie(RFX_BEAMS), marques:vie(RFX_DECS), ondes:vie(RFX_RINGS), corps:RFX_BODY.count };
    o.total = o.lueurs + o.fumee + o.projectiles + o.rayons + o.marques + o.ondes; return o;
  },
  reserves: () => ({ lueurs:RFX_GLOW.cap, fumee:RFX_SOFT.cap, rubans:RFX_RIB.cap, rayons:RFX_BEAMS.length, marques:RFX_DECS.length, ondes:RFX_RINGS.length, corps:RFX_CAP.body, projectiles:RFX_CAP.pj })
};
