'use strict';
/* ================= Style Amélioré dans le RTS « Guerre des robots » (dossier 118) ================= */
// Le réglage « Style » (dt_style, js/57-graphismes.js) habille aussi la vallée du RTS. Haute définition et Ultra y donnent
// Amélioré, comme dans le robot. La vallée n'est pas bâtie par buildWorld (js/41-rts.js, rtsDesert et rtsChunk) : tout ce qui
// lui est propre est ici.
//   - Sol : texture de terrain dessinée par le code (sable, cailloux, herbes sèches, taches de terre), terre battue et traces
//     de chenilles autour de la base, sol brûlé et malade (veines vertes) autour des nids et de la Ruche, cicatrice des nids
//     détruits. Un seul matériau pour tous les tronçons ; les nids (12 au plus) sont dessinés sur une petite carte
//     du sol brûlé (128 x 256), refaite seulement quand un nid change.
//   - Dalle de la base : béton en dalles, joints, taches, fissures, traces de pneus.
//   - Unités, bâtiments, tourelles, nids, Ruche : un seul matériau (rtsMat) reçoit une texture d'usure posée en
//     projection sur les 3 axes (saleté, coulures, panneaux, rivets, rayures) ; montagnes, ruines et épaves : grain de roche.
//     Aucun matériau ni appel de dessin de plus pour les unités.
//   - Ombres du soleil : unités, bâtiments, nids, Ruche, montagnes, ruines et zombies. La zone d'ombre couvre ce que la caméra
//     voit (vue de haut ou en pilotant), recalée sur les points de la carte d'ombre (pas de scintillement).
//     Cell : carte plus petite, zombies en instances sans vraie ombre (ils gardent la tache ronde de js/36-rendu.js).
//   - Effets d'image : compositeur d'Amélioré (styleComposer) avec un éclat dosé pour le RTS (traçantes, explosions, rayons,
//     éclairs, lueurs), à demi-résolution. Les barres de vie sont redessinées après les effets (nettes, sans grain).
//   - Ombres en PCF simple (le toit et le robot : PCF doux à l'ordi) : vue en pilotant, le sol remplit l'écran et le PCF
//     doux coûtait le plus cher ; la carte est fine (2048 sur 40 à 240 m), le bord reste propre.
//     L'interface en HTML (mini-carte, cadre de sélection, textes) n'est pas touchée ; le poste de pilotage est dans la
//     scène de l'arme en main, dessinée par-dessus sans effets.
//   - Bouton « Style » dans la Pause du RTS.
// Purement visuel : aucun chiffre du RTS ne change, aucun appel à Math.random. En Actuel : rien ne change.
// Tout est libéré en quittant le RTS ou en revenant à Actuel. Réglages : RST_REGL.

const RST_REGL = {
  eclat: { force:.36, seuil:.92, rayon:.35 },  // le toit : .45, .86, .4 (le toit cyan du QG ne doit pas blanchir)
  grain: .022,                                   // grain de film (le toit : .035), plus léger pour lire la carte
  soleil: 1.15, ciel: .92,                       // force du soleil et du ciel pendant le style (ombres plus lisibles)
  ombre: { pas:8, min:40, max:240, portee:120, porteePilote:85, D:220 }, // zone d'ombre en mètres
  sol: { nid:16, ruche:32, cicatrice:11 }        // rayons du sol brûlé
};
const RST = { monde:null, sun:null, pos0:null, sunI:0, hemi:null, hemiI:0, sol:null, roc:null, pad:null, padOrig:null, padTex:null, orig:[], tex:null,
  scanT:0, nBarres:0, typeOmbre:null, carte:0, taille:0, demi:false, resize:false, ov:null, pool:[], u:null, obc:false,
  v:new THREE.Vector3(), d:new THREE.Vector3(), x:new THREE.Vector3(), y:new THREE.Vector3(), c:new THREE.Vector3(), haut:new THREE.Vector3(0, 1, 0) };
const RST_NB = 12; // nids dessinés sur la carte du sol brûlé

const rstActif = () => typeof styleIci === 'function' && typeof styleRTS === 'function' && styleIci() && styleRTS() && !!RTS.on && !!world;

/* ---------- Textures dessinées une fois par partie (hasard propre : styleRnd, jamais Math.random) ---------- */
// Dessin répété aux 9 places voisines : la texture se raccorde sans couture
function rstNeuf(w, h, f){ for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) f(i * w, j * h); }
function rstTache(g, x, y, r, a, col){ if (typeof styleTache === 'function') styleTache(g, x, y, r, a, col); }
function rstCanal(w, h, f){ const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); f(g, w, h); return g.getImageData(0, 0, w, h).data; }
// Trois dessins en gris, rangés dans les canaux R, V et B d'une même texture
function rstTex3(w, h, fr, fg, fb){
  const r = rstCanal(w, h, fr), v = rstCanal(w, h, fg), b = rstCanal(w, h, fb);
  return canvasTex(w, h, g => {
    const im = g.createImageData(w, h), d = im.data;
    for (let i = 0; i < d.length; i += 4){ d[i] = r[i]; d[i + 1] = v[i]; d[i + 2] = b[i]; d[i + 3] = 255; }
    g.putImageData(im, 0, 0);
  });
}
function rstRepeter(t, rx, ry){ t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1); t.anisotropy = Math.min(isTouch ? 4 : 8, renderer.capabilities.getMaxAnisotropy()); t.needsUpdate = true; return t; }
function rstTextures(){
  if (RST.tex) return RST.tex;
  const R = () => styleRnd();
  // Sol de détail : sable clair, grain, terre plus sombre, craquelures, cailloux, touffes d'herbe sèche (multiplié par la couleur du sable)
  styleGr = 4242;
  const solA = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#e4ddcc'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++){ const x = R() * w, y = R() * h, r = 20 + R() * 70, a = .1 + R() * .14, c = R() < .55 ? '95,70,45' : '255,248,230'; rstNeuf(w, h, (ox, oy) => rstTache(g, x + ox, y + oy, r, a, c)); }
    styleBruit(g, w, h, .95, .28);
    for (let i = 0; i < 14; i++){ const x = 60 + R() * (w - 120), y = 60 + R() * (h - 120); styleFissure(g, x, y, 3 + Math.floor(R() * 4), 1, 'rgba(70,50,30,.32)'); }
    for (let i = 0; i < 300; i++){ // cailloux : ombre, pierre, reflet
      const x = R() * w, y = R() * h, r = 1.2 + R() * R() * 5, tn = 120 + R() * 110, ro = R() * 3;
      rstNeuf(w, h, (ox, oy) => {
        g.fillStyle = 'rgba(40,28,18,.45)'; g.beginPath(); g.ellipse(x + ox + r * .35, y + oy + r * .35, r, r * .7, ro, 0, 6.3); g.fill();
        g.fillStyle = 'rgb(' + (tn | 0) + ',' + (tn * .94 | 0) + ',' + (tn * .86 | 0) + ')'; g.beginPath(); g.ellipse(x + ox, y + oy, r, r * .7, ro, 0, 6.3); g.fill();
        g.fillStyle = 'rgba(255,250,235,.35)'; g.beginPath(); g.ellipse(x + ox - r * .25, y + oy - r * .25, r * .45, r * .3, ro, 0, 6.3); g.fill();
      });
    }
    for (let i = 0; i < 170; i++){ // touffes d'herbe sèche
      const x = R() * w, y = R() * h, n = 5 + Math.floor(R() * 7), v = R();
      const bl = []; for (let k = 0; k < n; k++){ const a = -Math.PI / 2 + (R() - .5) * 1.6, L = 4 + R() * 9; bl.push([Math.cos(a) * L, Math.sin(a) * L]); }
      rstNeuf(w, h, (ox, oy) => {
        g.lineWidth = 1.2; g.strokeStyle = v < .5 ? 'rgba(95,110,40,.75)' : 'rgba(150,140,70,.7)';
        bl.forEach(p => { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + p[0], y + oy + p[1]); g.stroke(); });
        g.strokeStyle = 'rgba(235,225,170,.4)'; g.lineWidth = .8;
        bl.forEach(p => { g.beginPath(); g.moveTo(x + ox + p[0] * .5, y + oy + p[1] * .5); g.lineTo(x + ox + p[0], y + oy + p[1]); g.stroke(); });
      });
    }
  });
  // Masques en gris : R = grandes taches (herbe ou terre nue), V = traces de chenilles, B = veines des nids
  styleGr = 777;
  const solB = rstTex3(256, 256,
    (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let i = 0; i < 34; i++){ const x = R() * w, y = R() * h, r = 18 + R() * 50, a = .35 + R() * .4; rstNeuf(w, h, (ox, oy) => rstTache(g, x + ox, y + oy, r, a, '255,255,255')); } },
    (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      // Une chenille : deux bandes parallèles avec les marques des patins, raccordées sur la largeur ; 2 en long, 2 en travers
      for (let k = 0; k < 4; k++){
        const tr = k >= 2, P = (x, y) => tr ? [y, x] : [x, y];
        const y0 = R() * h, A = 6 + R() * 16, ph = R() * 6.3, f = 1 + Math.floor(R() * 2), e = 9 + R() * 4, a = .55 + R() * .45;
        const ph2 = R() * 6.3, A2 = 4 + R() * 10;
        const Y = (x, s) => y0 + Math.sin(x / w * 6.283 * f + ph) * A + Math.sin(x / w * 6.283 * (f + 1) + ph2) * A2 + s * e / 2;
        rstNeuf(w, h, (ox, oy) => {
          for (const s of [-1, 1]){
            g.strokeStyle = 'rgba(255,255,255,' + a * .55 + ')'; g.lineWidth = 3.4; g.beginPath();
            for (let x = 0; x <= w; x += 4){ const q = P(x + ox, Y(x, s) + oy); if (x) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); } g.stroke();
            g.fillStyle = 'rgba(255,255,255,' + a + ')';
            for (let x = 0; x < w; x += 3){ const q = P(x + ox, Y(x, s) + oy); g.fillRect(q[0] - (tr ? 1.7 : 0), q[1] - (tr ? 0 : 1.7), tr ? 3.4 : 1.4, tr ? 1.4 : 3.4); }
          }
        });
      }
    },
    (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 22; i++){ // veines qui se ramifient
        let x = R() * w, y = R() * h, a = R() * 6.3; const pts = [[x, y]], br = [];
        for (let k = 0; k < 10; k++){ a += (R() - .5) * 1.3; x += Math.cos(a) * 8; y += Math.sin(a) * 8; pts.push([x, y]); if (R() < .3) br.push([x, y, a + (R() < .5 ? 1 : -1) * (.6 + R() * .6)]); }
        rstNeuf(w, h, (ox, oy) => {
          g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.6; g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p[0] + ox, p[1] + oy) : g.moveTo(p[0] + ox, p[1] + oy)); g.stroke();
          g.lineWidth = .9; br.forEach(b => { g.beginPath(); g.moveTo(b[0] + ox, b[1] + oy); g.lineTo(b[0] + ox + Math.cos(b[2]) * 14, b[1] + oy + Math.sin(b[2]) * 14); g.stroke(); });
        });
      }
      for (let i = 0; i < 40; i++){ const x = R() * w, y = R() * h; rstNeuf(w, h, (ox, oy) => rstTache(g, x + ox, y + oy, 3 + R() * 6, .5, '255,255,255')); } // pustules
    });
  // Usure : R = machines (saleté, coulures, panneaux, rivets, rayures), V = roche (grain, strates, fissures)
  styleGr = 3131;
  const usure = rstTex3(256, 256,
    (g, w, h) => {
      g.fillStyle = 'rgb(232,232,232)'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++){ const x = R() * w, y = R() * h, r = 10 + R() * 40; rstNeuf(w, h, (ox, oy) => rstTache(g, x + ox, y + oy, r, .3, '40,40,40')); }
      for (let i = 0; i < 30; i++){ const x = R() * w, y = R() * h, L = 10 + R() * 40, a = .1 + R() * .2; rstNeuf(w, h, (ox, oy) => { const gr = g.createLinearGradient(0, y + oy, 0, y + oy + L); gr.addColorStop(0, 'rgba(30,30,30,' + a + ')'); gr.addColorStop(1, 'rgba(30,30,30,0)'); g.fillStyle = gr; g.fillRect(x + ox, y + oy, 2 + R() * 3, L); }); } // coulures
      styleBruit(g, w, h, .97, .16);
      for (let k = 0; k < w; k += 64){ g.fillStyle = 'rgba(20,20,20,.5)'; g.fillRect(k, 0, 1, h); g.fillRect(0, k, w, 1); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(k + 1, 0, 1, h); g.fillRect(0, k + 1, w, 1); } // joints des panneaux
      for (let x = 0; x < w; x += 64) for (let y = 0; y < h; y += 64) for (const q of [[5, 5], [59, 5], [5, 59], [59, 59]]){ g.fillStyle = 'rgba(25,25,25,.55)'; g.fillRect(x + q[0], y + q[1], 2, 2); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + q[0], y + q[1], 1, 1); } // rivets
      for (let i = 0; i < 40; i++){ const x = 8 + R() * (w - 16), y = 8 + R() * (h - 16), a = R() * 6.3, L = 3 + R() * 9; g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = .7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); } // rayures
    },
    (g, w, h) => {
      g.fillStyle = 'rgb(225,225,225)'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 6){ g.fillStyle = 'rgba(' + (R() < .5 ? '0,0,0,' : '255,255,255,') + (R() * .05) + ')'; g.fillRect(0, y, w, 2 + Math.floor(R() * 5)); } // strates légères
      for (let i = 0; i < 46; i++){ const x = R() * w, y = R() * h, r = 6 + R() * 34, c = R() < .6 ? '30,30,30' : '255,255,255'; rstNeuf(w, h, (ox, oy) => rstTache(g, x + ox, y + oy, r, .26, c)); } // taches de roche
      styleBruit(g, w, h, .95, .38);
      for (let i = 0; i < 10; i++) styleFissure(g, 30 + R() * (w - 60), 30 + R() * (h - 60), 3, 1, 'rgba(15,15,15,.5)');
    },
    (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); });
  // Dalle de béton de la base : dalles de 4 m (4 par carreau), joints, tons, taches d'huile, fissures, traces de pneus
  styleGr = 9001;
  const dalle = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#dcd8d0'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 128) for (let y = 0; y < h; y += 128){ g.fillStyle = R() < .5 ? 'rgba(0,0,0,' + R() * .07 + ')' : 'rgba(255,255,255,' + R() * .08 + ')'; g.fillRect(x, y, 128, 128); }
    for (let i = 0; i < 14; i++){ const x = R() * w, y = R() * h, r = 10 + R() * 40; rstNeuf(w, h, (ox, oy) => rstTache(g, x + ox, y + oy, r, .3, '30,26,22')); }
    styleBruit(g, w, h, .94, .22);
    for (let k = 0; k < 2; k++){ const y0 = R() * h, A = 20 + R() * 30, ph = R() * 6.3; rstNeuf(w, h, (ox, oy) => { for (const s of [-1, 1]){ g.strokeStyle = 'rgba(25,22,20,.13)'; g.lineWidth = 8; g.beginPath(); for (let x = 0; x <= w; x += 8){ const yy = y0 + Math.sin(x / w * 6.283 + ph) * A + s * 14 + oy; if (x) g.lineTo(x + ox, yy); else g.moveTo(x + ox, yy); } g.stroke(); } }); }
    for (let i = 0; i < 10; i++) styleFissure(g, 20 + R() * (w - 40), 20 + R() * (h - 40), 3 + Math.floor(R() * 5), 1.2, 'rgba(25,20,16,.55)');
    for (let k = 0; k < w; k += 128){ g.fillStyle = 'rgba(30,28,25,.6)'; g.fillRect(k, 0, 3, h); g.fillRect(0, k, w, 3); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(k + 3, 0, 1, h); g.fillRect(0, k + 3, w, 1); }
  });
  [solA, solB, usure].forEach(t => rstRepeter(t));
  rstRepeter(dalle);
  return (RST.tex = { solA, solB, usure, dalle });
}

/* ---------- Matériaux ---------- */
// Uniformes partagés par le shader du sol (mis à jour à chaque image)
function rstUniformes(){
  if (RST.u) return RST.u;
  const nids = []; for (let i = 0; i < RST_NB; i++) nids.push(new THREE.Vector4(0, 0, 1, 0));
  const W = RST_BR.w, H = RST_BR.h, br = new THREE.DataTexture(new Uint8Array(W * H * 4), W, H, THREE.RGBAFormat);
  br.magFilter = br.minFilter = THREE.LinearFilter; br.wrapS = br.wrapT = THREE.ClampToEdgeWrapping; br.needsUpdate = true;
  return (RST.u = { nids:{ value:nids }, base:{ value:new THREE.Vector2(30, 0) }, brule:{ value:br }, rect:{ value:new THREE.Vector4(-192, 64, 1 / 384, 1 / 768) }, sig:'' });
}
// Carte du sol brûlé : une petite texture (128 x 256) sur la vallée, refaite seulement quand un nid change.
// (Avant : une boucle sur 12 nids pour chaque point du sol, trop chère quand le sol remplit l'écran en pilotant.)
const RST_BR = { w:128, h:256, x0:-192, larg:384 };
function rstBruleCarte(){
  const U = rstUniformes(), N = U.nids.value, ext = Math.max(768, Math.ceil((64 - (RTS.zMin || -300) + 120) / 256) * 256);
  let sig = ext + ':'; for (const n of N) if (n.w > 0) sig += (n.x | 0) + ',' + (n.y | 0) + ',' + n.z + ',' + n.w + ';';
  if (sig === U.sig) return;
  U.sig = sig;
  const W = RST_BR.w, H = RST_BR.h, d = U.brule.value.image.data, sx = RST_BR.larg / W, sz = ext / H;
  for (let j = 0; j < H; j++){
    const z = 64 - (j + .5) * sz;
    for (let i = 0; i < W; i++){
      const x = RST_BR.x0 + (i + .5) * sx;
      let b = 0;
      for (const n of N){ if (n.w <= 0) continue; const dd = Math.hypot(x - n.x, z - n.y); if (dd < n.z){ const t = clamp((dd - n.z * .35) / (n.z * .65), 0, 1); b = Math.max(b, (1 - t * t * (3 - 2 * t)) * n.w); } }
      const k = (j * W + i) * 4; d[k] = d[k + 1] = d[k + 2] = Math.round(b * 255); d[k + 3] = 255;
    }
  }
  U.rect.value.set(RST_BR.x0, 64, 1 / RST_BR.larg, 1 / ext);
  U.brule.value.needsUpdate = true;
}
const RST_SOL_FRAG = [
  // 4 lectures de texture au plus (le cell et les cartes faibles comptent chaque lecture, le sol remplit l'écran en pilotant)
  'vec2 sp = vSolW.xz;',
  'vec4 mk = texture2D(tSolB, sp * 0.0135);',                        // grandes taches, carreau de 74 m
  'vec3 dA = texture2D(tSolA, sp * 0.11 + mk.r * .23).rgb;',         // détail, carreau de 9 m, décalé par les grandes taches (casse la répétition)
  'vec3 sol = dA * (1.12 + .2 * mk.r);',
  'float herbe = smoothstep(.35, .8, mk.r);',
  'sol *= mix(vec3(1.04, 1.0, .95), vec3(.84, .98, .7), herbe * .75);', // herbe sèche ou terre nue
  'float bat = 1.0 - smoothstep(uBase.x + 2.0, uBase.x + 26.0, length(sp));', // terre battue autour de la base
  'float br = 0.0;',
  'vec2 bu = vec2((sp.x - uBrRect.x) * uBrRect.z, (uBrRect.y - sp.y) * uBrRect.w);',
  'if (bu.x > 0.0 && bu.x < 1.0 && bu.y > 0.0 && bu.y < 1.0){ br = texture2D(tBrule, bu).r; br = clamp(br + (dA.g - .8) * 1.2 * br * (1.0 - br) * 4.0, 0.0, 1.0); }', // bord rongé par le grain du sol
  'if (bat + br > 0.001){',
  '  vec4 t2 = texture2D(tSolB, sp * 0.05);',                           // V : traces de chenilles, B : veines des nids
  '  sol = mix(sol, sol * vec3(.93, .88, .82), bat * .8);',
  '  sol *= 1.0 - bat * t2.g * .26;',
  '  vec3 brule = vec3(.3, .25, .22) * (.62 + .45 * dA.r);',
  '  brule = mix(brule, vec3(.46, .85, .2), min(1.0, t2.b * 1.3) * smoothstep(.25, .8, br));', // veines malades, vertes
  '  sol = mix(sol, brule, br);',
  '}',
  'diffuseColor.rgb *= sol;'
].join('\n');
function rstSolMat(){
  const m = new THREE.MeshLambertMaterial({ vertexColors:true }); m.userData.keep = true; m.userData.rtsStyle = true;
  const T = rstTextures(), U = rstUniformes();
  m.onBeforeCompile = sh => {
    sh.uniforms.tSolA = { value:T.solA }; sh.uniforms.tSolB = { value:T.solB }; sh.uniforms.tBrule = U.brule; sh.uniforms.uBrRect = U.rect; sh.uniforms.uBase = U.base;
    sh.vertexShader = 'varying vec3 vSolW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vSolW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform sampler2D tSolA; uniform sampler2D tSolB; uniform sampler2D tBrule; uniform vec4 uBrRect; uniform vec2 uBase; varying vec3 vSolW;\n'
      + sh.fragmentShader.replace('#include <map_fragment>', RST_SOL_FRAG);
  };
  m.customProgramCacheKey = () => 'rst-sol';
  return m;
}
// Usure en projection sur l'axe le plus en face (3 axes possibles), dans le repère de l'objet (suit l'unité qui bouge). canal : 'r' machines, 'g' roche
function rstUsureOBC(canal, k, echelle){
  return sh => {
    sh.uniforms.tUsure = { value:rstTextures().usure };
    sh.vertexShader = 'varying vec3 vUsP; varying vec3 vUsN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vUsP = transformed; vUsN = objectNormal;');
    sh.fragmentShader = 'uniform sampler2D tUsure; varying vec3 vUsP; varying vec3 vUsN;\n' + sh.fragmentShader.replace('#include <color_fragment>', [
      '#include <color_fragment>',
      'vec3 an = abs(vUsN), uq = vUsP * ' + echelle.toFixed(3) + ';', // facettes planes : une seule lecture, sur l'axe le plus en face
      'vec2 uu = (an.x > an.y && an.x > an.z) ? uq.zy : (an.y > an.z ? uq.xz : uq.xy);',
      'float us = texture2D(tUsure, uu).' + canal + ';',
      'diffuseColor.rgb *= mix(1.0, us * 1.1, ' + k.toFixed(2) + ');'].join('\n'));
  };
}
const RST_OBC_MACH = rstUsureOBC('r', .8, .45);
function rstRocMat(){
  const m = new THREE.MeshLambertMaterial({ vertexColors:true }); m.userData.keep = true; m.userData.rtsStyle = true;
  m.onBeforeCompile = rstUsureOBC('g', .85, .16);
  m.customProgramCacheKey = () => 'rst-roc';
  return m;
}
function rstMachines(on){
  if (RST.obc === on) return;
  RST.obc = on;
  if (on){ rtsMat.onBeforeCompile = RST_OBC_MACH; rtsMat.customProgramCacheKey = () => 'rst-mach'; }
  else { delete rtsMat.onBeforeCompile; delete rtsMat.customProgramCacheKey; }
  rtsMat.needsUpdate = true;
}

/* ---------- Habiller la vallée, puis la déshabiller ---------- */
const rstSolDe = o => o.isMesh && o.material && o.material.isMeshLambertMaterial && o.material.vertexColors && !o.material.userData.rtsStyle
  && o.geometry && o.geometry.type === 'PlaneGeometry' && o.geometry.parameters && o.geometry.parameters.width === 480;
// Tronçons de la vallée (ajoutés au nord au fil de la partie) : sol, montagnes et route
function rstScanMonde(){
  if (!world) return;
  for (const o of world.children){
    if (!o.isMesh) continue;
    if (o.material === rtsMat){ RST.orig.push([o, rtsMat]); o.material = RST.roc; o.castShadow = o.receiveShadow = true; }
    else if (rstSolDe(o)){ RST.orig.push([o, o.material]); o.material = RST.sol; o.receiveShadow = true; o.castShadow = false; }
  }
}
// Unités, bâtiments, nids, Ruche : ombre projetée et reçue (pas les anneaux, les disques des hélices ni les barres de vie)
function rstScanRacine(on){
  rtsRoot.traverse(o => { if (o.isMesh && o.material === rtsMat){ o.castShadow = on; o.receiveShadow = on; } });
}
function rstAppliquer(){
  RST.monde = world;
  RST.sol = rstSolMat(); RST.roc = rstRocMat();
  rstMachines(true);
  RST.orig = []; rstScanMonde();
  if (RTS.pad){
    RST.padOrig = RTS.pad.material; RST.padTex = rstTextures().dalle.clone(); rstRepeter(RST.padTex, 4, 4);
    RST.pad = new THREE.MeshLambertMaterial({ color:0xa8a49a, map:RST.padTex }); RST.pad.userData.keep = true;
    RTS.pad.material = RST.pad; RTS.pad.receiveShadow = true;
  }
  // Lumières : soleil un peu plus fort, ciel un peu moins (ombres plus lisibles)
  RST.sun = world.children.find(o => o.isDirectionalLight) || null;
  RST.hemi = world.children.find(o => o.isHemisphereLight) || null;
  if (RST.sun){
    RST.pos0 = RST.sun.position.clone(); RST.sunI = RST.sun.intensity; RST.sun.intensity *= RST_REGL.soleil;
    RST.sun.castShadow = true; if (RST.sun.target.parent !== world) world.add(RST.sun.target);
  }
  if (RST.hemi){ RST.hemiI = RST.hemi.intensity; RST.hemi.intensity *= RST_REGL.ciel; }
  rstTypeOmbre(true);
  rstScanRacine(true); RST.scanT = .25;
}
// Type d'ombre : PCF simple dans le RTS, l'ancien type remis en sortant (les matériaux sont recompilés une fois)
function rstTypeOmbre(on){
  const sm = renderer.shadowMap, veut = on ? THREE.PCFShadowMap : RST.typeOmbre;
  if (on && RST.typeOmbre === null) RST.typeOmbre = sm.type;
  if (!on) RST.typeOmbre = null;
  if (veut === null || veut === undefined || sm.type === veut) return;
  sm.type = veut;
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); });
}
function rstRetirer(){
  const meme = RST.monde && RST.monde === world;
  RST.orig.forEach(([o, m]) => { if (meme) o.material = m; else if (m !== rtsMat) m.dispose(); });
  RST.orig = [];
  if (meme && RTS.pad && RST.padOrig){ RTS.pad.material = RST.padOrig; RTS.pad.receiveShadow = false; }
  else if (RST.padOrig) RST.padOrig.dispose();
  RST.padOrig = null;
  [RST.sol, RST.roc, RST.pad, RST.padTex].forEach(x => { if (x) x.dispose(); });
  RST.sol = RST.roc = RST.pad = RST.padTex = null;
  rstMachines(false);
  if (RST.sun){
    const s = RST.sun;
    if (meme){ s.castShadow = false; s.intensity = RST.sunI; if (RST.pos0) s.position.copy(RST.pos0); s.target.position.set(0, 0, 0); }
    if (s.shadow && s.shadow.map){ s.shadow.map.dispose(); s.shadow.map = null; }
  }
  if (RST.hemi && meme) RST.hemi.intensity = RST.hemiI;
  rstTypeOmbre(false);
  RST.sun = RST.hemi = RST.pos0 = null;
  if (RTS.on) rstScanRacine(false);
  if (typeof zInstRoot !== 'undefined' && isTouch) zInstRoot.children.forEach(o => { o.castShadow = true; }); // comme le toit
  RST.monde = null;
}
// Plus rien du RTS : textures, cibles de rendu, réserve des barres de vie
function rstLiberer(){
  if (RST.monde) rstRetirer();
  if (RST.tex){ Object.keys(RST.tex).forEach(k => RST.tex[k].dispose()); RST.tex = null; }
  if (RST.u){ RST.u.brule.value.dispose(); RST.u = null; }
  if (RST.ov){ RST.ov = null; RST.pool = []; }
  if (RST.resize && typeof STY === 'object'){ STY.w = STY.h = 0; RST.resize = false; } // le toit refait la taille de son éclat
}

/* ---------- Ombres : la zone suit ce que la caméra voit ---------- */
const RST_COINS = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]];
function rstCarte(){
  const niv = typeof gfxLevel === 'function' ? gfxLevel() : 'haut';
  return niv === 'bas' ? 512 : (niv === 'haut' && !isTouch) ? 2048 : 1024;
}
function rstOmbreZone(){
  const s = RST.sun; if (!s || !RST.pos0) return;
  const S2 = s.shadow, cam = S2.camera, n = rstCarte(), R = RST_REGL.ombre;
  if (S2.mapSize.x !== n){ S2.mapSize.set(n, n); if (S2.map){ S2.map.dispose(); S2.map = null; } }
  S2.bias = -.0005; S2.normalBias = .03; S2.radius = 2;
  const d = RST.d.copy(RST.pos0).normalize(), X = RST.x.crossVectors(RST.haut, d).normalize(), Y = RST.y.crossVectors(d, X);
  camera.updateMatrixWorld();
  const cp = camera.position, L = RTS.pilot ? R.porteePilote : R.portee, v = RST.v;
  let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
  const pt = (x, z) => { const a = x * X.x + z * X.z, b = x * Y.x + z * Y.z; if (a < a0) a0 = a; if (a > a1) a1 = a; if (b < b0) b0 = b; if (b > b1) b1 = b; };
  pt(cp.x, cp.z);
  for (const q of RST_COINS){
    v.set(q[0], q[1], .5).unproject(camera).sub(cp).normalize();
    const hz = Math.hypot(v.x, v.z) || 1e-4, t = v.y < -1e-3 ? -cp.y / v.y : Infinity;
    if (t * hz <= L) pt(cp.x + v.x * t, cp.z + v.z * t); else pt(cp.x + v.x / hz * L, cp.z + v.z / hz * L);
  }
  let taille = Math.max(a1 - a0, b1 - b0) + 6;
  taille = clamp(Math.ceil(taille / R.pas) * R.pas, R.min, R.max);
  if (taille !== RST.taille || cam.right !== taille / 2){
    RST.taille = taille; cam.left = cam.bottom = -taille / 2; cam.right = cam.top = taille / 2;
    cam.near = R.D - 170; cam.far = R.D + 130; cam.updateProjectionMatrix();
  }
  const tx = taille / n, ac = Math.round((a0 + a1) / 2 / tx) * tx, bc = Math.round((b0 + b1) / 2 / tx) * tx;
  const c = RST.c.set(0, 0, 0).addScaledVector(X, ac).addScaledVector(Y, bc);
  c.addScaledVector(d, -c.y / d.y); // ramené au sol, le long du soleil (même place dans la carte d'ombre)
  s.target.position.copy(c); s.position.copy(c).addScaledVector(d, R.D);
}

/* ---------- Nids et base pour le shader du sol ---------- */
function rstNids(){
  const U = rstUniformes(), N = U.nids.value, G = RST_REGL.sol;
  let i = 0;
  const put = (o, r, w) => { if (i < RST_NB) N[i++].set(o.x, o.z, r, w); };
  if (RTS.ruche && !RTS.ruche.dead) put(RTS.ruche, G.ruche, 1);
  for (const o of RTS.nests) if (!o.dead && !o.ruche) put(o, G.nid, 1);
  for (let k = RTS.nests.length - 1; k >= 0; k--){ const o = RTS.nests[k]; if (o.dead) put(o, o.ruche ? G.ruche : G.cicatrice, o.ruche ? .7 : .55); } // cicatrices, les plus récentes d'abord
  while (i < RST_NB) N[i++].set(0, 0, 1, 0);
  rstBruleCarte();
  U.base.value.set(RTS.baseR || 30, 0);
  if (RST.padTex && RTS.pad){ const k = (RTS.baseR || 30) * 2 / 16; if (RST.padTex.repeat.x !== k) RST.padTex.repeat.set(k, k); } // dalles de 4 m
}

/* ---------- Rendu : effets d'image, puis les barres de vie par-dessus ---------- */
// Les barres de vie (sprites dans les unités) sont gardées hors des effets : la vraie barre passe sur le calque 1 (la caméra
// ne voit que le calque 0) et une copie, placée au même endroit, est dessinée après les effets dans une petite scène à part.
function rstBarres(on){
  let k = 0;
  const ov = RST.ov || (RST.ov = new THREE.Scene());
  ov.fog = scene.fog;
  const une = (o) => {
    if (!o || o.dead || !o.hpb || !o.g || !o.g.parent || !o.g.visible) return;
    for (const s of [o.hpb.bg, o.hpb.fg]){
      s.layers.mask = on ? 2 : 1;
      if (!on || !s.visible) continue;
      let p = RST.pool[k];
      if (!p){ p = new THREE.Sprite(s.material); p.matrixAutoUpdate = false; ov.add(p); RST.pool.push(p); }
      p.material = s.material; p.renderOrder = s.renderOrder; p.matrix.copy(s.matrixWorld); p.visible = true; k++;
    }
  };
  for (const u of RTS.units) une(u);
  for (const b of RTS.blds) une(b);
  for (const n of RTS.nests) une(n);
  for (let i = k; i < RST.pool.length; i++) RST.pool[i].visible = false;
  return k;
}
function rstRendu(){
  if (!rstActif() || STY.casse) return false;
  let barres = false;
  try {
    const c = styleComposer(); if (!c) return false;
    const v = renderer.getDrawingBufferSize(STY.v2), demi = true;
    if (v.x !== STY.w || v.y !== STY.h || RST.demi !== demi || !RST.resize){
      STY.w = v.x; STY.h = v.y; c.setPixelRatio(1); c.setSize(v.x, v.y);
      if (STY.fxaa) STY.fxaa.uniforms.resolution.value.set(1 / v.x, 1 / v.y);
      if (demi) STY.bloom.setSize(Math.max(2, v.x >> 1), Math.max(2, v.y >> 1)); // éclat à demi-résolution (cell et ordi)
      RST.demi = demi; RST.resize = true;
    }
    const B = STY.bloom, G = STY.grade.uniforms, E = RST_REGL.eclat, b0 = [B.strength, B.threshold, B.radius], g0 = G.grain.value;
    B.strength = E.force; B.threshold = E.seuil; B.radius = E.rayon; G.grain.value = RST_REGL.grain;
    B.enabled = !(typeof gfxLevel === 'function' && gfxLevel() === 'bas');
    G.t.value = STY.t % 100;
    // Positions des barres à jour (la vraie scène les place pendant son rendu ; on prend celles de l'image d'avant sinon)
    barres = true;
    const n = rstBarres(true);
    c.render();
    B.strength = b0[0]; B.threshold = b0[1]; B.radius = b0[2]; G.grain.value = g0;
    RST.nBarres = n ? rstBarres(true) : 0; // copies recalées sur les positions de cette image
    if (RST.nBarres) renderer.render(RST.ov, camera);
    rstBarres(false); barres = false;
    return true;
  } catch (e){ errNote(e); STY.casse = true; if (barres) try { rstBarres(false); } catch (e2) { errNote(e2); } return false; }
}

/* ---------- Chaque image ---------- */
function rstImage(dt){
  const actif = rstActif();
  if (RST.monde && (!actif || RST.monde !== world)) rstRetirer();   // style coupé, partie quittée ou nouvelle vallée
  if (!actif){ if (!RTS.on && (RST.tex || RST.ov || RST.resize)) rstLiberer(); else if (RST.tex && !styleOn()) rstLiberer(); return; }
  if (!RST.monde) rstAppliquer();
  RST.scanT -= dt || 0;
  if (RST.scanT <= 0){
    RST.scanT = .25;
    rstScanMonde(); rstScanRacine(true);
    if (typeof styleOmbresZombies === 'function') styleOmbresZombies();
    if (isTouch && typeof zInstRoot !== 'undefined') zInstRoot.children.forEach(o => { o.castShadow = false; }); // cell : la foule garde ses taches rondes
  }
  if (!isTouch && typeof gfxShadows !== 'undefined') gfxShadows.visible = false; // ordi : les vraies ombres remplacent les taches
  rstNids();
  rstOmbreZone();
}
Jeu.on('image', dt => { try { rstImage(dt); } catch (e) { errNote(e); } });

/* ---------- Bouton « Style » dans la Pause du RTS ---------- */
// Le panneau est refait à chaque pause : on remet le bouton s'il manque, juste après « Reprendre »
function rstBouton(){
  if (!RTS.on || !RTS.paused || state !== 'rts' || typeof rtsPanel === 'undefined' || rtsPanel.classList.contains('hide') || $('rtStyle')) return;
  const bs = rtsPanel.querySelector('.mk-btns'); if (!bs || !bs.firstElementChild) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.id = 'rtStyle'; b.textContent = styleTexte();
  b.addEventListener('click', () => styleSuivant());
  bs.insertBefore(b, bs.firstElementChild.nextSibling);
}
Jeu.on('image', () => { try { rstBouton(); } catch (e) { errNote(e); } });

// Accès pour les tests automatiques
window.__rtsStyle = { RST, RST_REGL, rstActif, rstRendu, rstImage, rstLiberer, rstTextures, rstBouton, rstOmbreZone, rstBarres };
