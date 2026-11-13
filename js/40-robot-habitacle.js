'use strict';
/* ================= Robot : habitacle complet, manettes et mains du pilote, jambes qui marchent ================= */
// Dossier 105 (2026-11-13), Martin : « j'aimerais des jambes visibles et un habitacle complet avec joystick qui bouge à mesure
// que tu bouges ». Après js/40-robot-fin.js. Seulement visuel : rien ici ne change le combat (pas de hasard, pas de dégâts).
//   Habitacle (scène de l'arme en main, vmScene, comme les bras du robot) : il est fixé au torse du robot. Le torse tourne
//     avec la visée de côté (yaw) ; quand on lève ou baisse les yeux, l'habitacle ne suit pas (on voit le plancher vitré
//     et les jambes en regardant vers le bas). Montants, vitre, toit vitré, tableau de bord avec deux écrans qui vivent
//     (blindage, rue, chaleur du bras gauche, chargeur du bras droit), bords, jambes du pilote, plancher vitré.
//   Manettes : la gauche suit le déplacement (MECH.joy au cell, touches à l'ordi), la droite suit la visée (vitesse à
//     laquelle le torse tourne et la vue monte ou descend). Gâchette (bras gauche) et bouton du pouce (bras droit) qui
//     s'enfoncent au tir. Les mains du pilote tiennent les manettes. Au cell vertical, les manettes se rapprochent du centre.
//   Jambes (scène de la rue, pas dans world qui défile) : bassin sous l'habitacle, deux jambes (cuisse, tibia, pied) placées
//     par cinématique inverse. Un pied posé reste collé à la rue ; l'autre fait son pas vers l'endroit où il doit se poser,
//     selon la vitesse et la direction (avant, arrière, de côté, en tournant sur place). À l'arrêt, le pas en cours se finit
//     et les pieds se remettent sous le robot. Chaque pied qui se pose : le bruit et la secousse de pas (mechStomp, js/39)
//     et un léger balancement de l'habitacle (réduit et sans secousse si « Secousses » est coupé : dt_secousses, js/62).
//   Vue : « Habitacle : complet » (par défaut) ou « dégagé » (l'ancienne vue : les bras seulement), dans la Pause, gardée
//     dans dt_mech_vue. Les jambes se voient dans les deux.
// Coût : 9 objets de plus dans l'habitacle et 7 pour les jambes (géométries fusionnées, matériau de l'arme en main
//   partagé, une seule texture d'écrans redessinée au plus 10 fois par seconde), aucune lumière de plus.

const HB = {
  vue: store.get('dt_mech_vue', 'complet') === 'degage' ? 'degage' : 'complet',
  phi:0, m:0, dip:0, yawP:0, lastDist:0, lastYaw:0, lastPitch:0, vx:0, vz:0, rate:0, pas:0, init:false,
  gL:{ x:0, z:0 }, gR:{ x:0, z:0 }, trig:0, btn:0, aspect:0, fov:0, ecrT:0, ecrK:'', dx:0
};
// Réglages : jambes (m), pas, balancement (avec et sans « Secousses »)
const HB_J = { hanche:4.35, ecart:1.35, pied:1.6, cuisse:2.35, tibia:2.45, cheville:.32, avant:.35, foulee:4.2, levee:.55 };
const HB_BAL = { on:{ haut:.11, roule:.014, cote:.06, coup:.07 }, off:{ haut:.035, roule:0, cote:.015, coup:.02 } };
// Le pas sonore et la secousse viennent des pieds qui se posent (js/39 ne les fait plus avec MECH.step quand ce fichier est là)
MECH.pasJambes = true;
const hbSec = () => (typeof RS === 'object' && RS) ? RS.on !== false : store.get('dt_secousses', true) !== false;

/* ---------- Habitacle : pièces fixes (une géométrie) ---------- */
const hbRoot = new THREE.Group(); hbRoot.visible = false; vmCam.add(hbRoot);
const hbVieux = [];   // cadre et écrans de l'ancien cockpit (js/39) : cachés en vue complète
(function(){
  const fm = mechCk.children.find(o => o.isMesh); if (fm) hbVieux.push(fm);
  mechScreens.forEach(m => hbVieux.push(m));
})();
(function hbBuild(){
  const b = vmNew(), D = VC.blue, G = VC.park, L = VC.light, St = VC.steel, Po = VC.poly;
  // Vitre avant : poutre du haut, montants, rebord bas
  vmBox(b, 1.9, .035, .05, D, 0, .27, -.95, 0, 0, 0, .01);
  for (const s of [-1, 1]){
    vmCylAB(b, [s * .82, .27, -.95], [s * 1.02, -.62, -.8], .055, D, 6);
    vmCylAB(b, [s * .79, .24, -.9], [s * .98, -.58, -.76], .015, L, 4);
    // toit vitré : deux barres qui partent vers l'arrière
    vmCylAB(b, [s * .75, .27, -.95], [s * .62, .7, -.12], .04, D, 6);
    // bords de côté (appuis) et parois basses
    vmBox(b, .14, .08, 1.15, G, s * .96, -.56, -.25, 0, 0, s * -.12, .02);
    for (let i = 0; i < 4; i++) vmBox(b, .025, .025, .025, St, s * .94, -.52, -.7 + i * .28, 0, 0, 0, 0);   // rivets
    // plancher vitré : bande de côté et barre en travers
    vmBox(b, .06, .04, 1.3, G, s * .95, -1.15, -.45, 0, 0, 0, 0);
  }
  vmBox(b, 1.4, .05, .06, D, 0, .7, -.12, 0, 0, 0, .01);           // poutre arrière du toit
  vmBox(b, 1.95, .035, .06, D, 0, -.66, -1.1, 0, 0, 0, .01);        // rebord bas de la vitre
  // Tableau de bord au centre (panneau incliné vers le pilote) et son caisson
  vmPush(b, 0, -.7, -.88, .5, 0, 0);
  vmBox(b, .96, .05, .44, G, 0, 0, 0, 0, 0, 0, .02);
  vmBox(b, .98, .02, .03, St, 0, .025, -.215, 0, 0, 0, 0);
  for (const x of [-.22, .22]) vmBox(b, .37, .02, .23, Po, x, .03, 0, 0, 0, 0, .01);              // cadres des écrans
  for (let i = -3; i <= 3; i++) vmBox(b, .02, .015, .02, i === 0 ? [3, .4, .2] : i % 2 ? [.4, 2.6, .9] : [3, 1.5, .3], i * .025, .035, .14, 0, 0, 0, 0); // voyants
  vmPop(b);
  vmBox(b, .9, .5, .34, D, 0, -.98, -.95, 0, 0, 0, .02);
  vmBox(b, 2.0, .1, .1, D, 0, -1.12, -1.12, 0, 0, 0, .02);            // lèvre avant du plancher
  vmBox(b, .24, .04, 1.0, G, 0, -1.16, -.45, 0, 0, 0, 0);             // bande du milieu (pédales)
  // Jambes du pilote (combinaison) et bottes sur les pédales
  for (const s of [-1, 1]){
    vmCylAB(b, [s * .13, -.74, .1], [s * .15, -.66, -.38], .075, VC.sleeve, 7);
    vmCylAB(b, [s * .15, -.66, -.38], [s * .17, -1.04, -.56], .06, VC.sleeve, 7);
    vmBox(b, .1, .09, .22, VC.rubber, s * .17, -1.1, -.62, .2, 0, 0, .02);
    vmBox(b, .12, .02, .2, St, s * .17, -1.15, -.63, .2, 0, 0, 0);    // pédale
  }
  vmMesh(hbRoot, b);
})();

/* ---------- Vitre : reflets légers (additifs, ne cachent rien) ---------- */
const hbVitreTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  [[18, 26, .2], [40, 10, .12], [78, 34, .16], [104, 8, .09]].forEach(r => {
    const gr = g.createLinearGradient(r[0], 0, r[0] + r[1], 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(210,235,255,' + r[2] + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.save(); g.translate(w / 2, h / 2); g.rotate(-.5); g.translate(-w / 2, -h / 2); g.fillStyle = gr; g.fillRect(r[0] - 40, -40, r[1] + 80, h + 80); g.restore();
  });
});
const hbVitre = new THREE.Mesh(new THREE.PlaneGeometry(1.9, .76), new THREE.MeshBasicMaterial({ map:hbVitreTex, transparent:true, opacity:.5, blending:THREE.AdditiveBlending, depthWrite:false, fog:false }));
hbVitre.position.set(0, -.18, -1.0); hbRoot.add(hbVitre);

/* ---------- Écrans du tableau de bord (une texture, deux écrans, une géométrie) ---------- */
const hbEcrCv = document.createElement('canvas'); hbEcrCv.width = 256; hbEcrCv.height = 80;
const hbEcrTex = new THREE.CanvasTexture(hbEcrCv);
const hbEcr = (function(){
  const pos = [], uv = [];
  [[-.22, 0, .5], [.22, .5, 1]].forEach(e => {
    const x = e[0], w = .17, d = .1, u0 = e[1], u1 = e[2];
    // deux triangles, face vers le haut (vers le pilote une fois le panneau incliné)
    const P = [[x - w, 0, d], [x + w, 0, d], [x + w, 0, -d], [x - w, 0, -d]], U = [[u0, 0], [u1, 0], [u1, 1], [u0, 1]];
    [0, 1, 2, 0, 2, 3].forEach(i => { pos.push(P[i][0], P[i][1], P[i][2]); uv.push(U[i][0], U[i][1]); });
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map:hbEcrTex, fog:false }));
  const p = new THREE.Group(); p.position.set(0, -.7, -.88); p.rotation.x = .5; p.add(m); m.position.y = .042; hbRoot.add(p);
  return m;
})();
function hbEcrans(dt){
  HB.ecrT -= dt; if (HB.ecrT > 0 || !S) return;
  HB.ecrT = .1;
  const ar = clamp(S.bar / Math.max(1, S.barMax), 0, 1), WR = MECH_W[mW('R')] || {}, ch = WR.ch || 0;
  const rch = ch ? clamp(MECH.rch || 0, 0, ch) : 1 - clamp(MECH.rcd / Math.max(.05, MECH.rcdMax || .65), 0, 1);
  const rues = typeof MECH_FIN === 'object' ? MECH_FIN.rues : 9, reste = Math.max(0, Math.ceil(MECH_LEN - MECH.dist));
  const k = [Math.round(ar * 50), MECH.street, reste, Math.round(MECH.heat * 40), MECH.hot > 0, ch ? Math.floor(rch) : Math.round(rch * 10), mW('L'), mW('R')].join(',');
  if (k === HB.ecrK) return;
  HB.ecrK = k;
  const g = hbEcrCv.getContext('2d'), W = 128, H = 80;
  const bar = (x, y, w, v, c) => { g.fillStyle = 'rgba(42,255,138,.18)'; g.fillRect(x, y, w, 9); g.fillStyle = c; g.fillRect(x, y, Math.round(w * clamp(v, 0, 1)), 9); };
  const vert = '#2aff8a', ambre = '#ffb030', rouge = '#ff4a3a';
  g.fillStyle = '#04140c'; g.fillRect(0, 0, 256, H);
  g.font = 'bold 11px monospace'; g.textBaseline = 'top';
  // Gauche : blindage et rue
  const cA = ar < .3 ? rouge : ar < .6 ? ambre : vert;
  g.fillStyle = cA; g.fillText('BLINDAGE', 6, 5); g.fillText(Math.round(ar * 100) + ' %', W - 40, 5); bar(6, 19, W - 12, ar, cA);
  g.fillStyle = vert; g.fillText('RUE ' + MECH.street + ' / ' + rues, 6, 38); g.fillText(reste + ' m', 6, 54);
  bar(56, 56, W - 62, 1 - reste / MECH_LEN, vert);
  // Droite : chaleur du bras gauche et chargeur du bras droit
  const hot = MECH.hot > 0, cH = hot ? rouge : MECH.heat > .7 ? ambre : vert;
  g.fillStyle = cH; g.fillText(hot ? 'SURCHAUFFE' : (MECH_W[mW('L')] || {}).name ? MECH_W[mW('L')].name.split(' ')[0].toUpperCase() : 'GAUCHE', W + 6, 5); bar(W + 6, 19, W - 12, MECH.heat, cH);
  const cR = ch && rch < 1 ? rouge : vert;
  g.fillStyle = cR; g.fillText(((WR.name || 'Droit').split(' ')[0]).toUpperCase(), W + 6, 38);
  if (ch){ const n = Math.min(ch, 8), w = Math.floor((W - 12 - (n - 1) * 3) / n); for (let i = 0; i < n; i++){ g.fillStyle = i < Math.floor(rch * n / ch) ? cR : 'rgba(42,255,138,.18)'; g.fillRect(W + 6 + i * (w + 3), 56, w, 12); } }
  else bar(W + 6, 58, W - 12, rch, cR);
  g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < H; y += 3) g.fillRect(0, y, 256, 1);     // lignes d'écran
  hbEcrTex.needsUpdate = true;
}

/* ---------- Manettes et mains du pilote ---------- */
// Chaque côté : un socle (accoudoir) et une manette qui pivote à sa base, avec la main et l'avant-bras du pilote.
function hbManette(s){
  const socle = new THREE.Group(); socle.scale.setScalar(.85); hbRoot.add(socle);
  const a = vmNew();
  vmBox(a, .16, .1, .2, VC.park, 0, -.07, .03, 0, 0, 0, .02);
  vmBox(a, .17, .015, .21, VC.steel, 0, -.02, .03, 0, 0, 0, 0);
  vmCyl(a, .055, .05, VC.rubber, 0, -.005, 0, Math.PI / 2, 0, 0, 10);   // soufflet
  vmMesh(socle, a);
  const piv = new THREE.Group(); socle.add(piv);
  const m = vmNew();
  vmCyl(m, .016, .14, VC.steel, 0, .07, 0, Math.PI / 2, 0, 0, 8);
  vmCyl(m, .03, .13, VC.poly, 0, .19, -.005, Math.PI / 2 - .12, 0, 0, 10);
  vmCyl(m, .034, .02, VC.polyE, 0, .26, -.01, Math.PI / 2, 0, 0, 10);
  // main gantée qui serre la poignée : paume derrière, doigts devant, pouce sur le dessus
  vmBox(m, .085, .11, .06, VC.glove, 0, .19, .035, -.12, 0, 0, .015);
  for (let i = s > 0 ? 1 : 0; i < 4; i++) vmBox(m, .075, .022, .035, VC.gloveD, 0, .225 - i * .028, -.035, -.12, 0, 0, .006);
  vmBox(m, .03, .022, .055, VC.glove, -s * .035, .255, .0, .3, 0, 0, .006);
  // avant-bras (manche) qui part vers le pilote
  vmCylAB(m, [0, .175, .07], [s * .05, .11, .26], .036, VC.sleeve, 7);
  vmCylAB(m, [0, .18, .065], [0, .17, .1], .047, VC.gloveD, 7);
  vmMesh(piv, m);
  const o = { socle, piv };
  if (s > 0){
    // gâchette (bras gauche) avec l'index, et bouton du pouce (bras droit)
    o.gach = new THREE.Group(); o.gach.position.set(0, .225, -.04); piv.add(o.gach);
    const t = vmNew(); vmBox(t, .014, .045, .014, VC.steel, 0, -.02, -.012, .3, 0, 0, 0); vmBox(t, .07, .022, .034, VC.gloveD, 0, 0, -.006, -.12, 0, 0, .006);
    vmMesh(o.gach, t);
    o.btn = new THREE.Group(); o.btn.position.set(0, .272, -.01); piv.add(o.btn);
    const bb = vmNew(); vmCyl(bb, .013, .014, [1.6, .2, .12], 0, 0, 0, Math.PI / 2, 0, 0, 10); vmMesh(o.btn, bb);
  }
  return o;
}
const hbMG = hbManette(-1), hbMD = hbManette(1);

// Place les manettes (et rapproche les bras du robot) selon la forme de l'écran : au cell vertical, le champ de vision
// est étroit, les manettes se rapprochent du centre pour rester visibles au-dessus des boutons tactiles.
function hbDisposer(){
  if (HB.aspect === vmCam.aspect && HB.fov === vmCam.fov) return;
  HB.aspect = vmCam.aspect; HB.fov = vmCam.fov;
  const hh = Math.atan(Math.tan(vmCam.fov * Math.PI / 360) * vmCam.aspect), a = Math.min(.54, hh * .72), z = -.47;
  hbMG.socle.position.set(-Math.abs(z) * Math.tan(a), -.51, z); hbMD.socle.position.set(Math.abs(z) * Math.tan(a), -.51, z);
  // Bras du robot : vers le centre si l'écran est étroit (sinon on ne les voit plus du tout)
  const cible = Math.min(.58, hh * .85), dx = Math.max(0, 1.05 - 1.6 * Math.tan(cible));
  HB.dx = dx;
  Object.keys(mechArmsG).forEach(id => { const W = MECH_W[id]; if (W) mechArmsG[id].position.x = W.side === 'L' ? dx : -dx; });
  mechFlashL.position.x = -1.05 + dx; mechFlashR.position.x = 1.1 - dx;
}

/* ---------- Jambes ---------- */
const hbMatJ = vmMat.clone();          // même texture et mêmes couleurs, dans la scène de la rue (ses propres lumières)
const hbJ = new THREE.Group(); hbJ.visible = false; scene.add(hbJ);
const hbBassin = (function(){
  const b = vmNew(), D = VC.blue, G = VC.park, St = VC.steel;
  vmBox(b, 2.2, .6, 1.0, G, 0, 0, .25, 0, 0, 0, .12);
  vmBox(b, 1.2, .5, .9, D, 0, -.45, .3, 0, 0, 0, .1);
  for (const s of [-1, 1]){ vmCyl(b, .34, .5, St, s * 1.35, -.15, 0, 0, Math.PI / 2, 0, 12); vmBox(b, .3, .06, .9, [.9, .55, .12], s * .7, .31, .25, 0, 0, 0, 0); }
  vmBox(b, 2.0, .9, .5, D, 0, .55, .75, 0, 0, 0, .08);                // dos du torse (le dessous de l'habitacle)
  const m = new THREE.Mesh(vmGeo(b), hbMatJ); hbJ.add(m); return m;
})();
function hbSegment(len, haut){
  const b = vmNew(), D = VC.blue, G = VC.park, St = VC.steel;
  if (haut){
    vmBox(b, .42, len, .55, G, 0, -len / 2, 0, 0, 0, 0, .1);
    vmBox(b, .2, len * .7, .2, St, 0, -len * .45, -.32, 0, 0, 0, .04);   // vérin
    vmCyl(b, .3, .5, D, 0, -len, 0, 0, Math.PI / 2, 0, 10);               // genou
  } else {
    vmBox(b, .36, len, .42, D, 0, -len / 2, 0, 0, 0, 0, .08);
    vmBox(b, .4, .5, .5, G, 0, -.25, -.06, 0, 0, 0, .08);                  // rotule de devant
    vmCyl(b, .22, .4, St, 0, -len, 0, 0, Math.PI / 2, 0, 10);              // cheville
  }
  const g = new THREE.Group(), m = new THREE.Mesh(vmGeo(b), hbMatJ); g.add(m); hbJ.add(g); return g;
}
function hbPiedM(){
  const b = vmNew();
  vmBox(b, .75, .2, 1.3, VC.park, 0, .1, -.15, 0, 0, 0, .06);
  for (const x of [-.24, 0, .24]) vmBox(b, .2, .16, .45, VC.blue, x, .08, -.95, 0, 0, 0, .04);   // orteils
  vmBox(b, .5, .16, .4, VC.blue, 0, .08, .62, 0, 0, 0, .04);                                       // talon
  vmBox(b, .4, .25, .4, VC.steel, 0, .32, 0, 0, 0, 0, .05);
  const g = new THREE.Group(), m = new THREE.Mesh(vmGeo(b), hbMatJ); g.add(m); hbJ.add(g); return g;
}
const HB_JAMBES = [-1, 1].map(s => ({ s, cuisse:hbSegment(HB_J.cuisse, true), tibia:hbSegment(HB_J.tibia, false), piedM:hbPiedM(),
  pos:new THREE.Vector3(), de:new THREE.Vector3(), cible:new THREE.Vector3(), yaw:0, yawDe:0, enl:false, poses:0 }));
const hbV1 = new THREE.Vector3(), hbV2 = new THREE.Vector3(), hbV3 = new THREE.Vector3(), hbV4 = new THREE.Vector3(), hbV5 = new THREE.Vector3();
const hbM4 = new THREE.Matrix4(), hbH = new THREE.Vector3(), hbA = new THREE.Vector3(), hbK = new THREE.Vector3(), hbU = new THREE.Vector3(), hbN = new THREE.Vector3();
const hbAngle = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
// Où le pied s'arrête sous le robot (sol, coordonnées de la scène) ; avance : décalage dans le sens de la marche
function hbNeutre(J, out){
  const y = HB.yawP, rx = Math.cos(y), rz = -Math.sin(y), fx = -Math.sin(y), fz = -Math.cos(y);
  return out.set(MECH.x + rx * J.s * HB_J.pied + fx * HB_J.avant * .3, 0, MECH_CAM.z + rz * J.s * HB_J.pied + fz * HB_J.avant * .3);
}
function hbRemettre(){
  HB.yawP = yaw; HB.phi = 0; HB.m = 0; HB.dip = 0; HB.lastDist = MECH.dist; HB.lastYaw = yaw; HB.lastPitch = pitch; HB.vx = HB.vz = 0; HB.init = true;
  HB_JAMBES.forEach(J => { hbNeutre(J, J.pos); J.de.copy(J.pos); J.yaw = J.yawDe = yaw; J.enl = false; });
}
// Oriente un segment (groupe dont l'axe -y va de a vers b ; genou vers l'avant f)
function hbOrienter(g, a, b, f){
  hbV1.subVectors(a, b).normalize();                       // +y local : de b vers a
  hbV2.copy(f).addScaledVector(hbV1, -f.dot(hbV1)).normalize().negate(); // +z local : vers l'arrière
  hbV3.crossVectors(hbV1, hbV2);                           // +x local
  hbM4.makeBasis(hbV3, hbV1, hbV2); g.quaternion.setFromRotationMatrix(hbM4); g.position.copy(a);
}
function hbJambes(dt, actif){
  if (!HB.init) hbRemettre();
  const d = MECH.dist - HB.lastDist; HB.lastDist = MECH.dist;
  if (Math.abs(d) > 6){ hbRemettre(); return; }             // nouvelle rue : la rue est rebâtie
  // la rue défile : les pieds posés (et le point de départ d'un pas) restent collés à la rue
  HB_JAMBES.forEach(J => { J.pos.z += d; J.de.z += d; });
  const dy = hbAngle(yaw - HB.lastYaw); HB.lastYaw = yaw;
  if (actif && dt > 0){
    const vx = (MECH.x - (HB.lastX == null ? MECH.x : HB.lastX)) / dt, vz = -d / dt, k = Math.min(1, dt * 8);
    HB.vx += (vx - HB.vx) * k; HB.vz += (vz - HB.vz) * k;
  }
  HB.lastX = MECH.x;
  HB.yawP += hbAngle(yaw - HB.yawP) * Math.min(1, dt * 4);   // le bassin suit le torse avec un peu de retard
  const v = Math.hypot(HB.vx, HB.vz), tourne = Math.abs(dy) / Math.max(dt, 1e-3) > .4, bouge = actif && (v > .35 || tourne);
  // Vitesse du pas : la foulée suit la vitesse ; en tournant sur place, de petits pas
  let rate = 0;
  if (bouge) rate = Math.max(v > .35 ? Math.PI * v / HB_J.foulee : 0, tourne ? 2.6 : 0, 1.6);
  const k0 = HB.phi / Math.PI, bord = Math.abs(k0 - Math.round(k0)) < 1e-6;
  if (bouge) HB.phi += rate * dt;
  else if (actif){
    // À l'arrêt : finir le pas en cours ; puis un pas de plus si le pied suivant est loin de sa place
    const n = Math.round(k0), J = HB_JAMBES[(n % 2 + 2) % 2], loin = bord && (hbNeutre(J, hbV4).distanceTo(J.pos) > .45 || Math.abs(hbAngle(HB.yawP - J.yaw)) > .35);
    if (!bord || loin){ const fin = bord ? HB.phi + Math.PI : Math.ceil(k0) * Math.PI; HB.phi = Math.min(fin, HB.phi + 3 * dt); rate = 3; }
  }
  HB.rate = rate;
  HB.m += ((bouge ? Math.min(1, v / 4 + (tourne ? .4 : 0)) : 0) - HB.m) * Math.min(1, dt * 5);
  const tStance = rate > 0 ? Math.PI / rate : 0;
  HB_JAMBES.forEach((J, i) => {
    const p = ((HB.phi + i * Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2), enl = p > 1e-6 && p < Math.PI - 1e-6;
    if (enl && !J.enl){ J.de.copy(J.pos); J.yawDe = J.yaw; }
    hbNeutre(J, J.cible);
    if (tStance > 0){ const r = Math.min(2.3, Math.hypot(HB.vx, HB.vz) * tStance / 2), vv = Math.max(1e-6, Math.hypot(HB.vx, HB.vz)); J.cible.x += HB.vx / vv * r; J.cible.z += HB.vz / vv * r; }
    if (enl){
      const u = p / Math.PI, e = u * u * (3 - 2 * u);
      J.pos.lerpVectors(J.de, J.cible, e); J.pos.y = (HB_J.levee + .25 * HB.m) * Math.sin(Math.PI * u);
      J.yaw = J.yawDe + hbAngle(HB.yawP - J.yawDe) * e;
    } else if (J.enl){
      J.pos.copy(J.cible); J.pos.y = 0; J.yaw = HB.yawP; J.poses++;
      hbPose();
    }
    J.enl = enl;
  });
  hbPoser();
}
// Un pied se pose : bruit et secousse de pas (js/39), petit coup dans l'habitacle
function hbPose(){
  HB.pas++;
  const sec = hbSec(), s0 = shake;
  HB.dip = (sec ? HB_BAL.on : HB_BAL.off).coup * Math.max(.4, HB.m);
  if (typeof mechStomp === 'function') try { mechStomp(); } catch (e) { errNote(e); }
  if (!sec) shake = s0;   // « Secousses » coupé : pas de secousse de la caméra
}
// Place le bassin, les cuisses, les tibias et les pieds
function hbPoser(){
  const y = HB.yawP, rx = Math.cos(y), rz = -Math.sin(y), fx = -Math.sin(y), fz = -Math.cos(y);
  const cx = MECH.x - fx * HB_J.avant, cz = MECH_CAM.z - fz * HB_J.avant, hy = HB_J.hanche + Math.abs(Math.sin(HB.phi)) * .12 * HB.m - HB.dip * .6;
  hbBassin.position.set(cx, hy + .2, cz); hbBassin.rotation.set(0, y, Math.sin(HB.phi) * .025 * HB.m);
  hbV5.set(fx, 0, fz);
  const L1 = HB_J.cuisse, L2 = HB_J.tibia;
  HB_JAMBES.forEach(J => {
    const H = hbH.set(cx + rx * J.s * HB_J.ecart, hy, cz + rz * J.s * HB_J.ecart);
    const A = hbA.set(J.pos.x, J.pos.y + HB_J.cheville, J.pos.z);
    const u = hbU.subVectors(A, H); let dd = u.length();
    const dc = clamp(dd, .4, L1 + L2 - .02); u.multiplyScalar(1 / Math.max(1e-6, dd)); A.copy(H).addScaledVector(u, dc); dd = dc;
    const ca = clamp((L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd), -1, 1), sa = Math.sqrt(1 - ca * ca);
    // genou vers l'avant du bassin
    const n = hbN.copy(hbV5).addScaledVector(u, -hbV5.dot(u)); if (n.lengthSq() < 1e-6) n.set(0, 0, -1); n.normalize();
    const K = hbK.copy(H).addScaledVector(u, L1 * ca).addScaledVector(n, L1 * sa);
    hbOrienter(J.cuisse, H, K, hbV5);
    hbOrienter(J.tibia, K, A, hbV5);
    J.piedM.position.set(J.pos.x, J.pos.y, J.pos.z); J.piedM.rotation.set(J.pos.y > .02 ? -.18 * Math.sin(Math.PI * clamp(J.pos.y / (HB_J.levee + .25), 0, 1)) : 0, J.yaw, 0, 'YXZ');
  });
}

/* ---------- Chaque image ---------- */
const hbLisse = (a, b, dt, k) => a + (b - a) * Math.min(1, dt * k);
function hbImage(dt){
  const on = MECH.on && (state === 'mech' || state === 'mechover');
  hbJ.visible = on;
  const complet = on && HB.vue === 'complet';
  hbRoot.visible = complet && mechCk.visible;
  hbVieux.forEach(o => { o.visible = !complet; });
  if (!on){ HB.init = false; if (HB.dx){ HB.aspect = 0; Object.keys(mechArmsG).forEach(id => { mechArmsG[id].position.x = 0; }); HB.dx = 0; } return; }
  hbDisposer();
  const actif = state === 'mech' && !MECH.paused && !MECH.choosing && MECH.fade <= 0;
  hbJambes(actif ? dt : 0, actif);
  // Balancement de l'habitacle : remplace celui de js/39 (lié aux pieds qui se posent, dosé par « Secousses »)
  const B = hbSec() ? HB_BAL.on : HB_BAL.off, m = HB.m, sp = Math.sin(HB.phi);
  HB.dip *= Math.exp(-9 * dt);
  const bob = m * B.haut * (Math.abs(sp) - .5) - HB.dip;
  camera.position.set(MECH.x + B.cote * m * sp, MECH_CAM.y + bob, MECH_CAM.z);
  camera.rotation.z = -B.roule * m * sp;
  mechCk.position.y = -bob * .3;
  // L'habitacle tient au torse : il ne suit pas la vue qui monte ou descend
  hbRoot.rotation.x = -pitch; hbRoot.position.y = -bob * .25;
  // Manette gauche : déplacement (touches ou manette tactile)
  const f = clamp(MECH.mv.f - MECH.mv.b - MECH.joy.dy, -1, 1), s = clamp(MECH.mv.r - MECH.mv.l + MECH.joy.dx, -1, 1);
  HB.gL.x = hbLisse(HB.gL.x, actif ? -f * .32 : 0, dt, 12); HB.gL.z = hbLisse(HB.gL.z, actif ? -s * .28 : 0, dt, 12);
  hbMG.piv.rotation.set(HB.gL.x, 0, HB.gL.z);
  // Manette droite : la visée (vitesse de rotation du torse et de la vue)
  const dYaw = hbAngle(yaw - (HB.vYaw == null ? yaw : HB.vYaw)), dPit = pitch - (HB.vPit == null ? pitch : HB.vPit);
  HB.vYaw = yaw; HB.vPit = pitch;
  const tR = actif && dt > 0 ? clamp(dYaw / dt * .14, -.32, .32) : 0, tP = actif && dt > 0 ? clamp(dPit / dt * .14, -.28, .28) : 0;
  HB.gR.z = hbLisse(HB.gR.z, tR, dt, 10); HB.gR.x = hbLisse(HB.gR.x, tP, dt, 10);
  hbMD.piv.rotation.set(HB.gR.x, 0, HB.gR.z);
  // Gâchette (bras gauche) et bouton du pouce (bras droit)
  HB.trig = hbLisse(HB.trig, actif && (firing || MECH.mini) ? 1 : 0, dt, 25);
  HB.btn = hbLisse(HB.btn, actif && (MECH.rocket || mechFlashR.visible) ? 1 : 0, dt, 25);
  hbMD.gach.rotation.x = HB.trig * .45; hbMD.btn.position.y = .272 - HB.btn * .011;
  if (complet) hbEcrans(dt);
}
Jeu.on('image', dt => { try { hbImage(dt); } catch (e) { errNote(e); } });

/* ---------- Réglage dans la Pause : habitacle complet ou dégagé ---------- */
function hbVue(v){
  HB.vue = v === 'degage' ? 'degage' : 'complet'; store.set('dt_mech_vue', HB.vue);
  const b = $('mkVue'); if (b) b.textContent = hbVueTexte();
  return HB.vue;
}
const hbVueTexte = () => 'Habitacle : ' + (HB.vue === 'complet' ? 'complet' : 'dégagé');
function hbBoutonPause(){
  if (!MECH.paused || mechPanel.classList.contains('hide') || $('mkVue')) return;
  const bs = mechPanel.querySelector('.mk-btns'); if (!bs) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.id = 'mkVue'; b.textContent = hbVueTexte();
  b.addEventListener('click', () => hbVue(HB.vue === 'complet' ? 'degage' : 'complet'));
  const q = bs.lastElementChild; bs.insertBefore(b, q);
}
try { const _p = mechPause; mechPause = function(){ const r = _p.apply(this, arguments); try { hbBoutonPause(); } catch (e) { errNote(e); } return r; }; mechPause.again = _p.again; } catch (e) { errNote(e); }

// Accès pour les tests automatiques
window.__habitacle = { HB, HB_J, HB_BAL, HB_JAMBES, hbRoot, hbJ, hbMG, hbMD, hbEcr, hbVitre, hbVieux, hbImage, hbRemettre, vue:hbVue, hbSec };
