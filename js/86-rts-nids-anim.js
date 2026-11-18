'use strict';
/* ================= RTS : des nids et une Ruche qui vivent (dossier 131), seulement visuel ================= */
// Suite de js/86-rts-zombies-anim.js (réglages : RZ_REGL.nid et RZ_REGL.ruche ; même interrupteur RZ_REGL.on).
//   Nids : ils respirent (ils gonflent et se tassent), crachent une bouffée et se gonflent à chaque ponte (n.spawnT remonte),
//     tremblent sous les coups, penchent et s'affaissent à mesure qu'ils perdent leur vie, fument sous 50 % et suintent du
//     vert sous 25 %, puis crèvent en une seconde (ils se gonflent, s'écrasent, des morceaux de chair partent) avant de laisser
//     la place aux restes écrasés du jeu.
//   Ruche : elle sort de terre en tremblant dans la poussière, s'ouvre (grande inspiration et spores) une fois dehors,
//     respire, crache une bouffée à chaque ponte, et crève comme un nid, en plus gros.
// Comment : le modèle du jeu (n.m) est caché (le rayon des tirs le touche quand même : Three.js ne regarde pas la visibilité)
// et une copie à moi, dans mon groupe, est dessinée à sa place avec la même géométrie et le même matériau (style compris).
// Rien n'est changé sur l'objet du jeu sauf n.m.visible, remis à true dès que la copie part (crevaison finie, interrupteur
// coupé, partie quittée). Hasard : jamais Math.random (rzHasard de js/86-rts-zombies-anim.js).

const RZN = { m:new Map(), finis:new WeakSet(), t:0 };
const RZN_CHAIR = [[.48, .17, .17], [.36, .1, .12], [.62, .55, .42], [.35, .75, .18]];

function rznCreer(){ RZN.m.clear(); }
function rznNid(n, depart){
  const m = new THREE.Mesh(n.m.geometry, n.m.material); m.name = 'rzNid'; m.rotation.order = 'YXZ'; m.matrixAutoUpdate = true;
  RZ.root.add(m); n.m.visible = false;
  const h = rzFrac((n.idx || 0) * .7548776662 + (n.ruche ? .5 : .1));
  const s = { m, pv:n.hp, spT:n.spawnT, ponte:0, coup:0, mort:-1, sy0:1, h, sens:h < .5 ? -1 : 1, fumT:0, gouT:0, sortie:0, ouvre:0, poussT:0 };
  if (n.ruche && !depart) s.sortie = RZ_REGL.ruche.sortie;
  RZN.m.set(n, s);
  return s;
}
function rznRendre(n, s){ if (s.m.parent) s.m.parent.remove(s.m); if (n.m) n.m.visible = true; RZN.m.delete(n); }
function rznNouvelle(){ rznQuitter(); }
function rznQuitter(){ RZN.m.forEach((s, n) => { if (s.m.parent) s.m.parent.remove(s.m); if (n.m) n.m.visible = true; }); RZN.m.clear(); RZN.finis = new WeakSet(); }
const rznPres = n => { const dx = n.x - RZ.cx, dz = n.z - RZ.cz, v = (RZ.vue || 120) + 25; return dx * dx + dz * dz < v * v; };
// Morceaux de chair qui partent d'un nid qui crève
function rznCreve(n, s){
  const R = RZ_REGL, big = n.ruche ? 1.6 : 1, N = n.ruche ? R.ruche.morceaux : R.nid.morceaux, P = rzPart();
  if (!rznPres(n)) return;
  for (let i = 0; i < N; i++){
    const a = rzR(0, 6.28), r = rzR(1, 3.5) * big, c = RZN_CHAIR[i % RZN_CHAIR.length], v = rzR(5, 11);
    rzMorceau(n.x + Math.cos(a) * r, rzR(3, 7) * big, n.z + Math.sin(a) * r, Math.cos(a) * v, rzR(7, 14), Math.sin(a) * v, c[0], c[1], c[2], R.morceaux.taille * rzR(1.3, 2.6) * big);
  }
  if (P){
    for (let i = 0; i < 10; i++){ const a = rzR(0, 6.28); rfxP(P.soft, n.x + Math.cos(a) * 2 * big, rzR(2, 6) * big, n.z + Math.sin(a) * 2 * big, Math.cos(a) * 3, rzR(1, 3), Math.sin(a) * 3, rzR(1.4, 2.2), 3 * big, 8 * big, [.35, .12, .1], RV_FUM.grise, .7, 0, 1); }
    for (let i = 0; i < 14; i++) rfxP(P.glow, n.x + rzR(-3, 3) * big, rzR(3, 8) * big, n.z + rzR(-3, 3) * big, rzR(-4, 4), rzR(2, 6), rzR(-4, 4), rzR(.8, 1.4), rzR(.8, 1.4), .3, RV_FUM.nid, RV_FUM.nidF, .9, 4);
  }
}
// Bouffée de ponte, devant la bouche (côté base, là où le jeu fait naître les zombies)
function rznPonte(n){
  const P = rzPart(); if (!P || !rznPres(n)) return;
  const l = Math.hypot(n.x, n.z) || 1, dx = -n.x / l, dz = -n.z / l, d = n.ruche ? n.r + 1 : 3.8, x = n.x + dx * d, z = n.z + dz * d, big = n.ruche ? 1.5 : 1;
  for (let i = 0; i < (isTouch ? 4 : 7); i++) rfxP(P.soft, x + rzR(-.8, .8), rzR(.6, 2) * big, z + rzR(-.8, .8), dx * rzR(2, 4) + rzR(-1, 1), rzR(.5, 1.6), dz * rzR(2, 4) + rzR(-1, 1), rzR(1, 1.6), 1.6 * big, 4.5 * big, [.4, .3, .22], [.5, .45, .35], .6, 0, 1.4);
  for (let i = 0; i < 3; i++) rfxP(P.glow, x, rzR(1, 2.5) * big, z, dx * rzR(1, 3) + rzR(-1, 1), rzR(1, 2.5), dz * rzR(1, 3) + rzR(-1, 1), rzR(.8, 1.3), .9, .3, RV_FUM.nid, RV_FUM.nidF, .8, 1);
}
function rznPas(n, s, dt){
  const R = n.ruche ? RZ_REGL.ruche : RZ_REGL.nid, N = RZ_REGL.nid, m = s.m, P = rzPart();
  m.material = n.m.material; m.castShadow = n.m.castShadow; m.receiveShadow = n.m.receiveShadow;
  const base = n.m.scale.x || 1, ry = n.g.rotation.y + n.m.rotation.y;
  let sxz = 1, sy = 1, y = 0, rx = 0, rz = 0, jx = 0, jz = 0;
  if (n.dead){
    if (s.mort < 0){ s.mort = 0; rznCreve(n, s); }
    s.mort += dt; const k = Math.min(1, s.mort / N.mort);
    if (k >= 1){ rznRendre(n, s); RZN.finis.add(n); return; }
    const e = k * k * (3 - 2 * k), fin = n.ruche ? .2 : .25;
    sy = s.sy0 + (fin - s.sy0) * e; sxz = 1 + .22 * Math.sin(Math.PI * Math.min(1, k * 1.3)); y = -.5 * e; rz = s.rz0 || 0; rx = s.rx0 || 0;
    jx = Math.sin(s.mort * 47) * .15 * (1 - k); jz = Math.cos(s.mort * 41) * .15 * (1 - k);
  } else {
    if (n.hp < s.pv - 1e-6 && dt > 0) s.coup = 1; s.pv = n.hp;
    if (n.spawnT > s.spT + .5 && dt > 0){ s.ponte = 1; rznPonte(n); }
    s.spT = n.spawnT;
    if (dt > 0){ s.coup *= Math.exp(-dt / .2); s.ponte *= Math.exp(-dt / N.ponteT); }
    const k = Math.max(0, Math.min(1, 1 - n.hp / (n.maxHp || 1))), so = Math.sin(RZN.t * R.vitesse * Math.PI * 2 / 3 + s.h * 6.28);
    const tr = s.coup * .06 * Math.sin(RZN.t * 55);
    sxz = 1 + so * R.souffle + s.ponte * N.ponte + tr + s.ouvre * (R.ouvre || 0);
    sy = 1 - so * R.souffle * .7 - s.ponte * N.ponte * .45 - N.affaisse * k + s.ouvre * (R.ouvre || 0) * .6;
    rz = s.sens * N.penche * k * (n.ruche ? .4 : 1); rx = -s.sens * N.penche * .5 * k * (n.ruche ? .4 : 1);
    if (k > 1 - N.gouttes){ rz += Math.sin(RZN.t * 23 + s.h * 9) * .025; sxz += Math.sin(RZN.t * 31) * .015; } // il tressaille
    s.sy0 = sy; s.rz0 = rz; s.rx0 = rx;
    // Fumée sous 50 %, gouttes vertes sous 25 %
    if (P && dt > 0 && rznPres(n)){
      const big = n.ruche ? 1.8 : 1, haut = n.ruche ? 14 : 7;
      if (k > N.fumee){ s.fumT -= dt * (1 + 4 * (k - N.fumee) / (1 - N.fumee)) * (isTouch ? .6 : 1); if (s.fumT <= 0){ s.fumT = .45; rfxP(P.soft, n.x + rzR(-2, 2) * big, haut, n.z + rzR(-2, 2) * big, RV_REGL.vent.x * .7, rzR(1.2, 2.2), RV_REGL.vent.z * .7, rzR(2.6, 3.8), 2.5 * big, 6 * big, RV_FUM.noire, RV_FUM.grise, .55, 0, .15); } }
      if (k > 1 - N.gouttes){ s.gouT -= dt * (isTouch ? .6 : 1); if (s.gouT <= 0){ s.gouT = .12; const a = rzR(0, 6.28), r = rzR(2.5, 3.6) * big; rfxP(P.glow, n.x + Math.cos(a) * r, rzR(3, 6) * big, n.z + Math.sin(a) * r, 0, -.5, 0, rzR(.6, 1), .7, .35, RV_FUM.nid, RV_FUM.nidF, .9, 9); } }
    }
    // Ruche : sortie de terre, puis elle s'ouvre
    if (s.sortie > 0){
      if (dt > 0) s.sortie = Math.max(0, s.sortie - dt);
      const q = 1 - s.sortie / RZ_REGL.ruche.sortie, e = 1 - Math.pow(1 - q, 2);
      y -= RZ_REGL.ruche.prof * (1 - e); jx = Math.sin(RZN.t * 37) * .35 * (1 - q); jz = Math.cos(RZN.t * 29) * .35 * (1 - q);
      if (P && dt > 0 && rznPres(n)){ s.poussT -= dt * (isTouch ? 14 : 28); while (s.poussT <= 0){ s.poussT += 1; const a = rzR(0, 6.28), r = rzR(8, 11); rfxP(P.soft, n.x + Math.cos(a) * r, .5, n.z + Math.sin(a) * r, Math.cos(a) * rzR(2, 5), rzR(1, 3), Math.sin(a) * rzR(2, 5), rzR(1.2, 2), 3, 7, RV_FUM.sable, RV_FUM.sableC, .6, 0, 1); } }
      if (s.sortie === 0){ s.ouvre = 1; if (P && rznPres(n)) for (let i = 0; i < 24; i++){ const a = rzR(0, 6.28); rfxP(P.glow, n.x + Math.cos(a) * 3, rzR(12, 16), n.z + Math.sin(a) * 3, Math.cos(a) * rzR(3, 7), rzR(3, 7), Math.sin(a) * rzR(3, 7), rzR(1, 1.8), rzR(1, 1.8), .4, RV_FUM.ruche, RV_FUM.nidF, .9, 3); } }
    }
    if (dt > 0 && s.ouvre > 0){ s.ouvre *= Math.exp(-dt / .7); if (s.ouvre < .01) s.ouvre = 0; }
  }
  m.position.set(n.x + jx, n.g.position.y + y, n.z + jz);
  m.rotation.set(rx, ry, rz);
  m.scale.set(base * sxz, base * sy, base * sxz);
}
function rznImage(dt, depart){
  RZN.t += dt;
  for (const n of RTS.nests){
    let s = RZN.m.get(n);
    if (!s){
      if (RZN.finis.has(n)) continue;
      if (n.dead || !n.m || !n.g){ RZN.finis.add(n); continue; } // déjà crevé : comme avant
      s = rzCalme(() => rznNid(n, depart));
    }
    rznPas(n, s, dt);
  }
  // Un nid sorti de la liste du jeu (ne devrait pas arriver en cours de partie) : sa copie part
  if (RZN.m.size > RTS.nests.length) RZN.m.forEach((s, n) => { if (RTS.nests.indexOf(n) < 0) rznRendre(n, s); });
}
