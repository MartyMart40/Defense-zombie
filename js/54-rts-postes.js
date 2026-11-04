'use strict';
/* ================= RTS : postes de pilotage et munitions des avions ================= */
// 1. Munitions des avions : le chasseur (canon de 20 mm) et le Warthog (canon de 30 mm) tirent fort mais vident vite
//    leur réserve ; l'AC-130 en a beaucoup plus. À sec, l'avion retourne à l'aérodrome le plus proche, tourne au-dessus
//    quelques secondes et repart plein. Piloté : on y retourne soi-même (le viseur dit à quelle distance).
//    Chaque aérodrome reçoit 2 avions : pour plus d'avions, il faut plus d'aérodromes.
// 2. Postes : quand on pilote, on voit son poste (dans la caméra de l'arme en main, comme le cockpit du Mech) :
//    tank = le gros canon qui recule à chaque obus ; Apache = vue du casque : verrière, écrans, canon rotatif sous le nez
//    (il tourne quand il tire) et Hellfire sur les ailes ; chasseur et Warthog = habitacle et viseur tête haute ;
//    AC-130 = trois postes (cockpit, canon de 40 mm, obusier de 105 mm) : la caméra passe au poste de l'arme qui tire,
//    le bouton « Vue » (touche V) les fait défiler.
// Branché sur js/42-rts-combat.js (rtsAir, rtsGunship, rtsGat, rtsHellfire, rtsFrame) et js/43-rts-pilotage.js.

/* ---------- 1. Munitions et aérodromes ---------- */
const RTS_AMMO = { jet:{ w1:200 }, warthog:{ w1:660 }, bomber:{ w1:100, w2:20 } };
const RTS_REARM_T = { jet:3, warthog:4, bomber:6 };   // secondes au-dessus de l'aérodrome pour refaire le plein
const RTS_AIR_CAP = 2;                                 // avions par aérodrome
const rtsAmmoMax = (u, k) => { const A = RTS_AMMO[u.type]; return A && A[k] != null ? A[k] : null; };
function rtsAmmoInit(u){ if (u.ammo) return u.ammo; u.ammo = {}; const A = RTS_AMMO[u.type]; if (A) Object.keys(A).forEach(k => { u.ammo[k] = A[k]; }); return u.ammo; }
// Un tir : faux s'il n'y a plus de munitions (l'avion part alors refaire le plein)
function rtsAmmoUse(u, k){
  if (rtsAmmoMax(u, k) == null) return true;
  const a = rtsAmmoInit(u);
  if (a[k] <= 0){ if (k === 'w1') u.rearm = true; return false; }
  a[k]--; if (k === 'w1' && a[k] <= 0) u.rearm = true;
  return true;
}
function rtsAmmoFill(u){ u.ammo = null; rtsAmmoInit(u); u.rearm = false; u.rearmT = 0; }
const rtsAirfields = () => RTS.blds.filter(o => !o.dead && o.type === 'airfield');
const rtsAirCount = () => RTS.units.filter(u => !u.dead && u.U.kind === 'air').length;
const rtsAirRoom = () => rtsAirfields().length * RTS_AIR_CAP - rtsAirCount();
function rtsNearAirfield(x, z){ let best = null, bd = 1e9; for (const o of rtsAirfields()){ const d = Math.hypot(o.x - x, o.z - z); if (d < bd){ bd = d; best = o; } } return best ? { o:best, d:bd } : null; }
// IA : à sec, l'avion va tourner au-dessus de l'aérodrome le plus proche puis repart plein. Vrai pendant le retour.
function rtsRearmAI(u, dt){
  if (!u.rearm) return false;
  const gp = u.g.position, U = u.U, A = rtsNearAirfield(gp.x, gp.z);
  if (!A){ u.rearmT = (u.rearmT || 0) + dt * .3; if (u.rearmT >= RTS_REARM_T[u.type]) rtsAmmoFill(u); return false; } // pas d'aérodrome : plein très lent, il continue
  const cx = A.o.x, cz = A.o.z;
  if (U.gunship) rtsGunshipFly(u, dt, cx, cz);
  else {
    const spd = rtsStat(u, 'speed'), dx = cx - gp.x, dz = cz - gp.z, d = Math.hypot(dx, dz), R = 14;
    let want = Math.atan2(dx, dz); if (d < R) want += Math.PI / 2 * (1 - d / R) * 1.1;
    const df = Math.atan2(Math.sin(want - u.head), Math.cos(want - u.head));
    u.head += clamp(df, -U.turn * dt, U.turn * dt);
    gp.x += Math.sin(u.head) * spd * dt; gp.z += Math.cos(u.head) * spd * dt; gp.y += (U.alt - gp.y) * Math.min(1, dt);
    u.g.rotation.set(0, u.head, -clamp(df, -.6, .6) * .8); rtsClampValley(gp, true);
  }
  if (Math.hypot(cx - gp.x, cz - gp.z) < (U.gunship ? U.orbit + 12 : 22)){ u.rearmT = (u.rearmT || 0) + dt; if (u.rearmT >= RTS_REARM_T[u.type]) rtsAmmoFill(u); }
  return true;
}
// Piloté : le plein se fait en passant au-dessus d'un aérodrome
function rtsRearmPilot(u, dt){
  if (rtsAmmoMax(u, 'w1') == null) return;
  const a = rtsAmmoInit(u), full = Object.keys(RTS_AMMO[u.type]).every(k => a[k] >= RTS_AMMO[u.type][k]);
  const A = rtsNearAirfield(u.g.position.x, u.g.position.z);
  if (!full && A && A.d < A.o.r + (u.U.gunship ? u.U.orbit + 10 : 18)){
    u.rearmT = (u.rearmT || 0) + dt;
    if (u.rearmT >= RTS_REARM_T[u.type]){ rtsAmmoFill(u); if (typeof toast === 'function') toast('Munitions pleines'); }
  } else u.rearmT = 0;
}

/* ---------- 2. Postes de pilotage (dans la caméra de l'arme en main) ---------- */
const PT = { g:{}, k:{}, cur:null, acPost:'c40', spin:0, mis:[], hudT:0 };
function ptGroup(id){ const g = new THREE.Group(); g.visible = false; vmCam.add(g); PT.g[id] = g; PT.k[id] = 0; return g; }
function ptFlash(parent, x, y, z, s){ const f = new THREE.Sprite(new THREE.SpriteMaterial({ map:vmFlashTex, blending:THREE.AdditiveBlending, depthTest:false, depthWrite:false, color:0xffd8a0 })); f.position.set(x, y, z); f.scale.set(s, s, 1); f.visible = false; parent.add(f); return f; }
const PTC = { olive:0x4a5236, oliveD:0x343a26, dark:0x1d1f22, steel:0x5a5d64, sand:0x8a7a58, glass:0x2aff8a };
(function ptBuild(){
  // Tank : on regarde par l'écoutille ; le canon de 120 mm part devant, la mitrailleuse coaxiale à côté
  { const g = ptGroup('tank'), b = vmNew();
    vmBox(b, 1.4, .42, .7, PTC.olive, 0, -.74, -1.2, 0, 0, 0, .05);            // masque du canon
    vmBox(b, 2.6, .14, .5, PTC.oliveD, 0, -.98, -.75, 0, 0, 0, .03);           // rebord de la tourelle
    for (const s of [-1, 1]) vmBox(b, .16, .5, .18, PTC.dark, s * 1.2, -.85, -.62, 0, 0, s * .15, .02); // bords de l'écoutille
    vmMesh(g, b);
    const canon = new THREE.Group(); g.add(canon); PT.canon = canon;
    const c = vmNew();
    vmCyl(c, .17, 4.6, PTC.oliveD, 0, -.55, -3.4, 0, 0, 0, 12);                // tube
    vmCyl(c, .25, .8, PTC.olive, 0, -.55, -2.3, 0, 0, 0, 12);                  // évacuateur de fumée
    vmCyl(c, .21, .35, PTC.dark, 0, -.55, -5.65, 0, 0, 0, 10);                 // bouche
    vmCyl(c, .035, .9, PTC.dark, .38, -.66, -1.7, 0, 0, 0, 8);                 // coaxiale
    vmMesh(canon, c);
    PT.fTank = ptFlash(g, 0, -.55, -5.95, 1.6);
    PT.mCoax = new THREE.Object3D(); PT.mCoax.position.set(.38, -.66, -2.2); canon.add(PT.mCoax);
  }
  // Apache : vue du casque du pilote (place avant), verrière, écrans, canon rotatif sous le nez, Hellfire sur les ailes
  { const g = ptGroup('heli'), b = vmNew();
    vmBox(b, 2.6, .045, .07, PTC.dark, 0, .78, -1.0, -.35, 0, 0, .01);         // arceau du haut
    for (const s of [-1, 1]){ vmBox(b, .045, 1.7, .06, PTC.dark, s * 1.12, -.05, -1.0, 0, 0, s * .28, .01); vmBox(b, .025, 1.0, .03, PTC.dark, s * .62, .3, -1.05, 0, 0, s * .1, .005); }
    vmBox(b, 2.2, .3, .45, PTC.oliveD, 0, -.7, -.85, .45, 0, 0, .04);         // tableau de bord
    vmBox(b, .1, .4, .1, PTC.dark, 0, -.78, -.6, -.2, 0, 0, .02);               // manche
    vmMesh(g, b);
    [[-.55, -.55], [.55, -.55]].forEach(p => { const m = new THREE.Mesh(new THREE.PlaneGeometry(.42, .26), new THREE.MeshBasicMaterial({ color:PTC.glass, transparent:true, opacity:.5, fog:false })); m.position.set(p[0], p[1], -.72); m.rotation.x = -.6; g.add(m); });
    // Canon rotatif sous le nez : il suit le regard, ses canons tournent quand il tire
    const tur = new THREE.Group(); tur.position.set(0, -1.0, -1.9); g.add(tur); PT.heliGun = tur;
    const t = vmNew(); vmBox(t, .34, .26, .34, PTC.dark, 0, .06, 0, 0, 0, 0, .04); vmMesh(tur, t);
    const bar = new THREE.Group(); bar.position.set(0, 0, -.25); tur.add(bar); PT.heliBar = bar;
    const br = vmNew(); for (let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2; vmCyl(br, .028, 1.1, PTC.steel, Math.cos(a) * .07, Math.sin(a) * .07, -.55, 0, 0, 0, 7); }
    vmCyl(br, .1, .05, PTC.dark, 0, 0, -.1, 0, 0, 0, 10); vmCyl(br, .1, .05, PTC.dark, 0, 0, -.95, 0, 0, 0, 10); vmMesh(bar, br);
    PT.fHeli = ptFlash(tur, 0, 0, -1.45, 1.1); PT.fHeli2 = ptFlash(tur, 0, 0, -1.7, .6);
    PT.mPod = [-1, 1].map(s => { const o = new THREE.Object3D(); o.position.set(s * 1.3, -1.05, -2.0); g.add(o); return o; }); PT.podI = 0;
    // Ailettes avec deux Hellfire de chaque côté (un missile tiré disparaît, il revient au rechargement)
    for (const s of [-1, 1]){
      const w = vmNew(); vmBox(w, .9, .06, .3, PTC.olive, s * 1.55, -1.05, -1.45, 0, 0, 0, .02); vmBox(w, .06, .24, .9, PTC.dark, s * 1.75, -1.18, -1.5, 0, 0, 0, .01); vmMesh(g, w);
      for (const dz of [-.12, .12]){ const m = vmNew(); vmCyl(m, .07, .9, PTC.sand, 0, 0, 0, 0, 0, 0, 8); vmCyl(m, .05, .12, PTC.red || 0x7c2016, 0, 0, -.5, 0, 0, 0, 8); const mm = vmMesh(g, m); mm.position.set(s * 1.75 + dz * 2, -1.3, -1.5); PT.mis.push(mm); }
    }
  }
  // Chasseur et Warthog : habitacle, viseur tête haute (lame verte), nez de l'avion
  { const g = ptGroup('jet'), b = vmNew();
    for (const s of [-1, 1]) vmBox(b, .07, 1.5, .08, PTC.dark, s * 1.05, .1, -1.0, 0, 0, s * .4, .02);
    vmBox(b, 2.4, .06, .08, PTC.dark, 0, .82, -1.1, -.5, 0, 0, .02);
    vmBox(b, 2.0, .34, .5, PTC.dark, 0, -.86, -.82, .4, 0, 0, .04);
    vmBox(b, .5, .06, .3, PTC.steel, 0, -.62, -1.05, -.3, 0, 0, .01);
    vmCyl(b, .55, 1.6, 0x6a7080, 0, -1.25, -2.2, -.06, 0, 0, 10, .4);              // nez
    vmMesh(g, b);
    const hud = new THREE.Mesh(new THREE.PlaneGeometry(.5, .4), new THREE.MeshBasicMaterial({ color:PTC.glass, transparent:true, opacity:.14, fog:false, depthWrite:false })); hud.position.set(0, -.36, -1.1); g.add(hud);
    PT.fJet = ptFlash(g, -.55, -.95, -2.6, .9);
  }
  // AC-130, cockpit : vitres en trois panneaux, tableau de bord, manche
  { const g = ptGroup('acCk'), b = vmNew();
    vmBox(b, 3.0, .1, .1, PTC.dark, 0, .55, -1.0, 0, 0, 0, .02);
    for (const x of [-1.3, -.45, .45, 1.3]) vmBox(b, .08, 1.3, .08, PTC.dark, x, -.05, -1.0, 0, 0, x * .06, .02);
    vmBox(b, 3.0, .45, .6, 0x2a2d30, 0, -.74, -.85, .35, 0, 0, .04);
    for (let i = -3; i <= 3; i++) vmBox(b, .12, .08, .02, [.2, 1.6, .7], i * .32, -.55, -.62, -.6, 0, 0, 0);
    vmBox(b, .5, .08, .08, PTC.dark, 0, -.58, -.5, 0, 0, 0, .02);                 // manche
    vmMesh(g, b);
  }
  // AC-130, poste du 40 mm : le canon Bofors sort par le sabord, en bas à droite
  { const g = ptGroup('ac40'), b = vmNew();
    vmBox(b, 1.2, .6, .4, PTC.dark, .9, -.95, -.9, 0, 0, 0, .04);
    vmMesh(g, b);
    const c = new THREE.Group(); c.position.set(.55, -.62, -1.0); c.rotation.set(0, -.18, 0); g.add(c); PT.c40 = c;
    const cb = vmNew(); vmCyl(cb, .06, 3.0, PTC.steel, 0, 0, -1.5, 0, 0, 0, 10); vmCyl(cb, .1, .5, PTC.dark, 0, 0, -.2, 0, 0, 0, 10); vmCyl(cb, .085, .25, PTC.dark, 0, 0, -2.9, 0, 0, 0, 10); vmMesh(c, cb);
    PT.f40 = ptFlash(c, 0, 0, -3.15, .9);
  }
  // AC-130, poste du 105 mm : le gros obusier, en bas à gauche
  { const g = ptGroup('ac105'), b = vmNew();
    vmBox(b, 1.6, .8, .5, PTC.dark, -.9, -1.05, -.9, 0, 0, 0, .05);
    vmMesh(g, b);
    const c = new THREE.Group(); c.position.set(-.55, -.7, -1.0); c.rotation.set(0, .16, 0); g.add(c); PT.c105 = c;
    const cb = vmNew(); vmCyl(cb, .16, 3.4, PTC.olive, 0, 0, -1.7, 0, 0, 0, 14); vmCyl(cb, .26, .6, PTC.oliveD, 0, 0, -.25, 0, 0, 0, 14); vmBox(cb, .62, .3, .4, PTC.dark, 0, 0, -3.45, 0, 0, 0, .04); vmMesh(c, cb);
    PT.f105 = ptFlash(c, 0, 0, -3.8, 2.2);
  }
})();
// Quel poste pour cette unité
function rtsPosteId(u){
  if (!u || !u.U) return null;
  if (u.U.gunship) return PT.acPost === 'ck' ? 'acCk' : PT.acPost === 'c105' ? 'ac105' : 'ac40';
  if (u.type === 'tank') return 'tank';
  if (u.type === 'heli') return 'heli';
  if (u.U.kind === 'air' && !u.U.bomb) return 'jet';
  return null;
}
function rtsPosteShow(){ const id = rtsPosteId(RTS.pilot); PT.cur = id; Object.keys(PT.g).forEach(k => { PT.g[k].visible = k === id; }); rtsPilotUI.classList.toggle('casque', id === 'heli' || id === 'jet'); rtsPilotUI.classList.toggle('ck', id === 'acCk'); }
function rtsPosteOn(u){
  PT.acPost = 'c40'; PT.spin = 0; PT.mis.forEach(m => { m.visible = true; });
  rtsAmmoInit(u); rtsPosteShow();
  const v = $('rtrpView'); if (v) v.classList.toggle('hide', !u.U.gunship);
  rtsPosteHud(true);
}
function rtsPosteOff(){ PT.cur = null; Object.keys(PT.g).forEach(k => { PT.g[k].visible = false; }); if (typeof rtsTierDetails === 'function') rtsTierDetails(); rtsPilotUI.classList.remove('casque', 'ck'); canvas.classList.remove('rt-ac105'); }
// AC-130 : changer de poste (bouton Vue, touche V) ; tirer une arme y amène aussi
function rtsPosteSet(p){
  const u = RTS.pilot; if (!u || !u.U || !u.U.gunship || PT.acPost === p) return false;
  PT.acPost = p; rtsPosteShow(); return true;
}
function rtsPosteNext(){ const L = ['ck', 'c40', 'c105']; return rtsPosteSet(L[(L.indexOf(PT.acPost) + 1) % L.length]); }
// Un tir du joueur : recul, éclair, missile qui part
function rtsPosteShot(u, kind){
  if (!u || RTS.pilot !== u) return;
  if (u.U.gunship){ rtsPosteSet(kind === 'w2' ? 'c105' : 'c40'); PT.k[kind === 'w2' ? 'ac105' : 'ac40'] = 1; if (kind === 'w2') shake = Math.max(shake, .08 + .35 * ptAmp()); return; }
  const id = rtsPosteId(u); if (!id) return;
  if (id === 'heli' && kind === 'w2'){ const m = PT.mis.find(x => x.visible); if (m){ m.visible = false; setTimeout(() => { m.visible = true; }, 2800); } return; }
  PT.k[id] = 1; if (id === 'tank') shake = Math.max(shake, .06 + .3 * ptAmp());
}
// Chaque image : animations du poste visible
// Force du recul et de l'éclair : de 0,25 (arme de base) à 1 (arme au maximum)
const ptAmp = () => .25 + .75 * (typeof rtsPosteTier === 'function' ? rtsPosteTier(RTS.pilot) : 1);
function rtsPosteFrame(dt){
  const u = RTS.pilot; if (!PT.cur || !u || !u.U) return;
  Object.keys(PT.k).forEach(k => { PT.k[k] = Math.max(0, PT.k[k] - dt * (k === 'tank' || k === 'ac105' ? 2.2 : 9)); });
  const firing = RTS.pv.fire || (isTouch && RTS.pv.aim.id !== null);
  const A = ptAmp(); // recul et éclair selon le niveau de l'arme (js/55-rts-niveaux.js)
  if (PT.cur === 'tank'){ PT.canon.position.z = PT.k.tank * .7 * A; PT.canon.rotation.x = PT.k.tank * .05 * A; PT.fTank.scale.setScalar(.6 + 1.4 * A); PT.fTank.visible = PT.k.tank > .85; if (PT.fTank.visible) PT.fTank.material.rotation = Math.random() * 6; }
  if (PT.cur === 'heli'){
    PT.heliBar.rotation.z += dt * 75 * PT.spin;                                        // les canons tournent à toute vitesse
    PT.heliGun.rotation.y = 0; PT.heliGun.rotation.x = clamp(-RTS.pv.pitch * .3, -.3, .5) - .15;
    const feu = firing && PT.spin >= .35;
    PT.fHeli.visible = feu && Math.random() < .9; PT.fHeli2.visible = feu && Math.random() < .6;
    if (feu){ const k = 1 + Math.random() * .8; PT.fHeli.scale.set(1.1 * k, 1.1 * k, 1); PT.fHeli.material.rotation = Math.random() * 6; PT.fHeli2.material.rotation = Math.random() * 6; }
    const vib = feu ? .012 * PT.spin : 0;                                              // tout le poste vibre quand il tire
    PT.g.heli.position.set((Math.random() - .5) * vib, Math.sin(RTS.t * 2.3) * .02 + (Math.random() - .5) * vib, 0);
    PT.heliGun.position.z = -1.9 + (feu ? (Math.random() - .5) * .05 : 0);
  }
  if (PT.cur === 'jet'){ PT.fJet.visible = PT.k.jet > .3 && Math.random() < .8; if (PT.fJet.visible) PT.fJet.material.rotation = Math.random() * 6; PT.g.jet.rotation.z = -(u.g.rotation.z || 0) * .15; }
  if (PT.cur === 'ac40'){ PT.c40.position.z = -1.0 + PT.k.ac40 * .35 * A; PT.f40.scale.setScalar(.4 + .9 * A); PT.f40.visible = PT.k.ac40 > .6; }
  if (PT.cur === 'ac105'){ PT.c105.position.z = -1.0 + PT.k.ac105 * .9 * A; PT.f105.scale.setScalar(.6 + 2.6 * A); PT.f105.visible = PT.k.ac105 > .8; if (PT.f105.visible) PT.f105.material.rotation = Math.random() * 6; }
  if (typeof rtsTierDetails === 'function') rtsTierDetails(); // détails du modèle selon le niveau
  rtsPosteHud(false, dt);
}
// AC-130 : la caméra du poste (appelée par rtsPilotCam) et le champ de vision
function rtsPosteCam(u){
  if (!u.U.gunship || PT.acPost !== 'ck') return;
  const gp = u.g.position, f = u.head;
  camera.position.set(gp.x + Math.sin(f) * 9, gp.y + 1.2, gp.z + Math.cos(f) * 9);
  camera.rotation.order = 'YXZ'; camera.rotation.set(-.16, f + Math.PI, -(u.g.rotation.z || 0) * .6);
}
function rtsPosteFov(u){ if (!u.U.gunship) return null; return PT.acPost === 'ck' ? 62 : PT.acPost === 'c105' ? 26 : 38; }

/* ---------- AC-130 : les canons sont sur le flanc gauche ---------- */
// Le champ de tir est fixé à l'avion : 34° de chaque côté de la perpendiculaire gauche, et une plage de hauteur.
// La visée reste là où on l'a mise (au sol) pendant que l'avion tourne ; au bord du champ, elle est entraînée avec lui.
const AC_CONE = { yaw:.6, pMin:-1.25, pMax:-.28, flanc:.34 };
// Direction du flanc gauche (vers le centre du virage à gauche) : forward = (sin h, cos h), gauche = (-cos h, sin h)
const rtsAcLeft = u => [-Math.cos(u.head), Math.sin(u.head)];
function rtsAcCone(u){
  if (PT.acPost === 'ck') return;
  const P2 = RTS.pv, L = rtsAcLeft(u), b = Math.atan2(-L[0], -L[1]);
  const off = clamp(Math.atan2(Math.sin(P2.yaw - b), Math.cos(P2.yaw - b)), -AC_CONE.yaw, AC_CONE.yaw);
  P2.yaw = b + off; P2.pitch = clamp(P2.pitch, AC_CONE.pMin, AC_CONE.pMax);
}
// L'ordinateur ne tire que sur ce qui est du côté des canons (à moins de 70° du flanc gauche)
function rtsAcFlanc(u, x, z){
  const gp = u.g.position, L = rtsAcLeft(u), dx = x - gp.x, dz = z - gp.z, d = Math.hypot(dx, dz) || 1;
  return (dx * L[0] + dz * L[1]) / d > AC_CONE.flanc;
}

/* ---------- Les tirs partent du bout du canon qu'on voit ---------- */
// Le bout du canon est dessiné dans la caméra de l'arme : on prend sa place à l'écran, puis le point du monde
// qui est à cette place, à 4 m devant les yeux (assez loin pour que la traînée reste visible).
const ptV = new THREE.Vector3(), ptD = new THREE.Vector3();
function ptEcran(obj, depth){
  obj.updateMatrixWorld(true); obj.getWorldPosition(ptV);
  vmCam.updateMatrixWorld(); ptV.project(vmCam); if (ptV.z > 1 || !isFinite(ptV.x)) return null;
  camera.updateMatrixWorld(); ptD.set(ptV.x, ptV.y, .5).unproject(camera).sub(camera.position).normalize();
  return camera.position.clone().addScaledVector(ptD, depth || 4);
}
function rtsPosteMuzzle(u, kind){
  if (!u || RTS.pilot !== u || !PT.cur) return null;
  let o = null;
  if (PT.cur === 'tank') o = kind === 'gat' ? PT.mCoax : PT.fTank;
  else if (PT.cur === 'heli'){
    if (kind === 'gat') o = PT.fHeli;
    else if (kind === 'w2'){ const m = PT.mis.find(x => x.visible) || PT.mis[0]; o = m; }
    else { PT.podI = 1 - PT.podI; o = PT.mPod[PT.podI]; } // roquettes : une nacelle puis l'autre
  }
  else if (PT.cur === 'jet') o = PT.fJet;
  else if (PT.cur === 'ac40') o = PT.f40;
  else if (PT.cur === 'ac105') o = PT.f105;
  return o ? ptEcran(o, PT.cur === 'ac105' || PT.cur === 'ac40' ? 6 : 4) : null;
}

/* ---------- Apache : le canon rotatif ---------- */
// Il monte en régime (les canons tournent de plus en plus vite), puis crache 26 obus par seconde avec le grondement
// continu du minigun du robot ; l'écran et le poste vibrent, les éclairs se suivent.
function rtsApacheGun(u, dt, firing){
  PT.spin = clamp(PT.spin + (firing ? dt / .4 : -dt / .9), 0, 1);
  try { if (typeof Snd === 'object' && Snd.mgTick) Snd.mgTick(PT.spin, firing && PT.spin >= .35); } catch (e) { errNote(e); }
  if (firing && PT.spin >= .35){ shake = Math.max(shake, .16 * PT.spin); if (navigator.vibrate && Math.random() < .08) try { navigator.vibrate(18); } catch (e) { errNote(e); } }
}

/* ---------- Viseur (texte du poste) ---------- */
const rtsPosteHudEl = document.createElement('div'); rtsPosteHudEl.id = 'rtrpHud'; rtsPilotUI.appendChild(rtsPosteHudEl);
const rtsViewBtn = document.createElement('button'); rtsViewBtn.type = 'button'; rtsViewBtn.id = 'rtrpView'; rtsViewBtn.className = 'hide'; rtsViewBtn.textContent = '🎥 Vue';
rtsViewBtn.addEventListener('click', () => rtsPosteNext()); rtsViewBtn.addEventListener('touchstart', e => { e.preventDefault(); rtsPosteNext(); }, { passive:false });
rtsPilotUI.appendChild(rtsViewBtn);
document.addEventListener('keydown', e => { if (state === 'rts' && RTS.pilot && !RTS.paused && e.code === 'KeyV') rtsPosteNext(); });
function rtsPosteHud(now, dt){
  PT.hudT -= dt || 0; if (!now && PT.hudT > 0) return; PT.hudT = .15;
  const u = RTS.pilot; if (!u || !u.U){ rtsPosteHudEl.textContent = ''; return; }
  const s = x => Math.max(0, x).toFixed(1).replace('.', ',') + ' s';
  let t = '';
  if (u.type === 'tank') t = 'CANON 120 MM · ' + (u.cd > 0 ? 'CHARGEMENT ' + s(u.cd) : 'OBUS PRÊT') + (rtsLv('tank', 'coax') ? ' · COAXIALE' : '');
  else if (u.type === 'heli') t = '30 MM · ROQUETTES · HELLFIRE ' + ((u.cd4 || 0) > 0 ? s(u.cd4) : 'PRÊT');
  else if (rtsAmmoMax(u, 'w1') != null){
    const a = rtsAmmoInit(u), A = RTS_AMMO[u.type];
    t = (u.U.gunship ? (PT.acPost === 'ck' ? 'COCKPIT · ' : PT.acPost === 'c105' ? 'POSTE 105 MM · ' : 'POSTE 40 MM · ') + '40 MM ' + a.w1 + ' / ' + A.w1 + ' · 105 MM ' + a.w2 + ' / ' + A.w2
      : (u.U.w1 || 'Canon').toUpperCase() + ' · ' + a.w1 + ' / ' + A.w1);
    if (a.w1 <= 0){ const N = rtsNearAirfield(u.g.position.x, u.g.position.z); t += ' · À SEC : ' + (N ? 'retourne à l’aérodrome (' + Math.round(N.d) + ' m)' : 'aucun aérodrome'); }
    if (u.rearmT > 0) t += ' · PLEIN EN COURS';
  }
  rtsPosteHudEl.textContent = t;
}

// Accès pour les tests automatiques
window.__rtsPostes = { AC_CONE, rtsAcCone, rtsAcFlanc, rtsAcLeft, rtsPosteMuzzle, rtsApacheGun, RTS_AMMO, RTS_AIR_CAP, PT, rtsAmmoUse, rtsAmmoInit, rtsAmmoFill, rtsAirRoom, rtsRearmAI, rtsRearmPilot, rtsNearAirfield, rtsPosteId, rtsPosteOn, rtsPosteOff, rtsPosteSet, rtsPosteNext, rtsPosteShot, rtsPosteFrame, rtsPosteFov };
