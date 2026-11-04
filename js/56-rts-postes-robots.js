'use strict';
/* ================= RTS : postes de pilotage des petits robots ================= */
// Quand on pilote un petit robot, on voit sa visière et son bras droit avec SON arme :
//   fantassin = fusil, mitrailleur = 4 canons qui tournent, tireur d'élite = long fusil à lunette,
//   robot lance-flammes = buse avec sa veilleuse, lance-roquettes = boîtier à 4 tubes, Mech lourd = canon laser à anneaux.
// Au départ c'est simple ; les améliorations (Armes, Cadence) ajoutent des détails à 3 paliers, plus de recul et un plus
// gros éclair (même système que les véhicules, js/55-rts-niveaux.js). Le bras se balance quand le robot marche.
// Branché sur js/54-rts-postes.js (rtsPosteId, rtsPosteMuzzle, rtsPosteFrame).

const RTS_ROBOTS = ['rifle', 'gunner', 'sniper', 'flamebot', 'rocket', 'heavy'];
// Niveau visuel des robots : Armes et Cadence ; sons du plus léger au plus lourd
Object.assign(RTS_TIER, {
  'rifle:w1':    { keys:['arm', 'rate'], snd:['pistol', 'rifle', 'rifle'] },
  'gunner:w1':   { keys:['arm', 'rate'], snd:['pistol', 'rifle', 'minigun'] },
  'sniper:w1':   { keys:['arm', 'rate'], snd:['rifle', 'sniper', 'sniper'] },
  'flamebot:w1': { keys:['arm', 'rate'], snd:null },
  'rocket:w1':   { keys:['arm', 'rate'], snd:['crossbow', 'rocket', 'rocket'] },
  'heavy:w1':    { keys:['arm', 'rate'], snd:null }
});
PT.rob = {};
(function robBuild(){
  const C = { d:0x0e1622, p:0x22344c, b:0x1a3356, s:0x4a5e78, o:VC.olive, r:VC.red || 0x7c2016 }; // métal froid (la lumière de la caméra d'arme est chaude)
  const cyanGlow = new THREE.MeshBasicMaterial({ color:0x50f0ff, transparent:true, opacity:.8, blending:THREE.AdditiveBlending, depthWrite:false, fog:false });
  RTS_ROBOTS.forEach(type => {
    const id = 'rob_' + type, g = ptGroup(id);
    // Visière : bords haut et bas, petits coins, voyants
    const v = vmNew();
    vmBox(v, 3.0, .16, .2, C.p, 0, .76, -1, -.3, 0, 0, .02); vmBox(v, 3.0, .16, .34, C.p, 0, -.86, -.95, .3, 0, 0, .02); // haut et bas de la visière
    for (const s of [-1, 1]){ vmBox(v, .14, 1.9, .14, C.p, s * 1.3, -.05, -1, 0, 0, s * .12, .02); vmBox(v, .07, .55, .07, C.d, s * 1.12, .5, -.98, 0, 0, s * .45, .01); vmBox(v, .07, .55, .07, C.d, s * 1.12, -.62, -.98, 0, 0, -s * .45, .01); }
    vmBox(v, .08, .05, .02, [.3, 2, .6], -.4, -.79, -.82, -.4, 0, 0, 0); vmBox(v, .08, .05, .02, [2.2, 1.4, .2], -.25, -.79, -.82, -.4, 0, 0, 0);
    vmMesh(g, v);
    // Bras droit et arme : le groupe recule au tir
    const gun = new THREE.Group(); gun.position.set(.6, -.58, -1.15); gun.scale.setScalar(.85); g.add(gun);
    const a = vmNew(); vmBox(a, .24, .24, .75, C.p, 0, -.05, .15, 0, 0, 0, .03); vmBox(a, .3, .3, .2, C.b, 0, -.05, -.25, 0, 0, 0, .03); // avant-bras, poignet
    let bout = -1.0, spin = null;
    if (type === 'rifle'){ vmBox(a, .1, .12, 1.0, C.d, 0, .05, -.75, 0, 0, 0, .01); vmBox(a, .08, .2, .12, C.d, 0, -.08, -.45, 0, 0, 0, .01); bout = -1.27; }
    else if (type === 'gunner'){ vmBox(a, .26, .24, .3, C.d, 0, .02, -.45, 0, 0, 0, .02); bout = -1.35; }
    else if (type === 'sniper'){ vmBox(a, .09, .1, 1.5, C.d, 0, .05, -1.0, 0, 0, 0, .01); vmCyl(a, .06, .45, C.b, 0, .18, -.55, 0, 0, 0, 8); bout = -1.77; }
    else if (type === 'flamebot'){ vmCyl(a, .07, .6, C.s, 0, .02, -.6, 0, 0, 0, 8); vmCyl(a, .12, .5, C.r, 0, -.2, -.4, 0, 0, 0, 10); bout = -.92; }
    else if (type === 'rocket'){ vmBox(a, .4, .34, .6, C.o, 0, .05, -.6, 0, 0, 0, .03); for (let i = 0; i < 4; i++) vmCyl(a, .06, .04, 0x0b0b0d, -.09 + (i % 2) * .18, -.03 + Math.floor(i / 2) * .16, -.91, 0, 0, 0, 8); bout = -.95; }
    else { vmCyl(a, .1, 1.2, 0xd8dadf, 0, .05, -.85, 0, 0, 0, 10); bout = -1.48; }
    vmMesh(gun, a);
    if (type === 'gunner'){ spin = new THREE.Group(); spin.position.set(0, .02, -.6); gun.add(spin); const sb = vmNew(); for (let i = 0; i < 4; i++){ const t = i / 4 * Math.PI * 2; vmCyl(sb, .03, .75, C.s, Math.cos(t) * .06, Math.sin(t) * .06, -.37, 0, 0, 0, 6); } vmMesh(spin, sb); }
    if (type === 'heavy') for (let i = 0; i < 3; i++){ const r = new THREE.Mesh(new THREE.TorusGeometry(.12, .02, 6, 16), cyanGlow); r.position.set(0, .05, -.5 - i * .3); gun.add(r); }
    const flash = ptFlash(gun, 0, .05, bout - .1, type === 'rocket' ? .7 : type === 'sniper' ? .6 : .45);
    if (type === 'heavy' || type === 'flamebot') flash.material.color.setHex(type === 'heavy' ? 0x80f8ff : 0xff9a40);
    let veille = null;
    if (type === 'flamebot'){ veille = ptFlash(gun, 0, .02, -.95, .12); veille.material.color.setHex(0x60a0ff); veille.visible = true; } // veilleuse bleue
    PT.rob[type] = { gun, flash, spin, veille, z0:-1.15 };
    // Détails des améliorations : plaque de blindage, chargeur ou réserve, bouche rougie
    let d = ptdNiv(id, gun, 0), b = vmNew(); vmBox(b, .3, .1, .55, C.s, 0, .14, .1, 0, 0, 0, .02); vmMesh(d, b);
    d = ptdNiv(id, gun, 1); b = vmNew();
    if (type === 'flamebot') vmCyl(b, .1, .45, C.r, 0, -.2, .15, 0, 0, 0, 10); else if (type === 'heavy') vmBox(b, .2, .26, .4, 0x2a6a8a, 0, -.25, .05, 0, 0, 0, .03); else vmBox(b, .14, .3, .22, C.d, 0, -.28, -.35, .2, 0, 0, .02);
    vmMesh(d, b);
    d = ptdNiv(id, gun, 2); const m = new THREE.Mesh(new THREE.CylinderGeometry(type === 'rocket' ? .22 : .08, type === 'rocket' ? .22 : .08, .15, 10), type === 'heavy' ? cyanGlow : ptdGlow); m.rotation.x = Math.PI / 2; m.position.set(0, .05, bout + .1); d.add(m);
  });
})();
// Chaque image, si on pilote un petit robot : recul, éclair, canons qui tournent, bras qui se balance en marchant
function rtsRobPosteFrame(dt, A, firing){
  const id = PT.cur; if (!id || id.indexOf('rob_') !== 0) return;
  const R = PT.rob[id.slice(4)], u = RTS.pilot; if (!R || !u) return;
  const k = PT.k[id] || 0;
  R.gun.position.z = R.z0 + k * .14 * A;
  R.gun.position.y = -.58 + Math.sin((u.step || 0) * 2) * .025;   // balancement de la marche
  R.gun.rotation.x = k * .08 * A;
  R.flash.visible = k > .55; if (R.flash.visible){ R.flash.material.rotation = Math.random() * 6; const s = (.35 + .8 * A) * (id === 'rob_rocket' ? 1.6 : 1); R.flash.scale.set(s, s, 1); }
  if (R.spin){ PT.spinR = clamp((PT.spinR || 0) + (firing ? dt * 4 : -dt * 1.5), 0, 1); R.spin.rotation.z += dt * 40 * PT.spinR; }
  if (R.veille){ const s = .1 + Math.random() * .05 + (firing ? .25 : 0); R.veille.scale.set(s, s, 1); }
}

// Accès pour les tests automatiques
window.__rtsPostesRobots = { RTS_ROBOTS, rtsRobPosteFrame };
