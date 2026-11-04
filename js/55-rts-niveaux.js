'use strict';
/* ================= RTS : les armes embellissent avec les améliorations ================= */
// Chaque arme d'une unité a un niveau visuel T (0 à 1) tiré des améliorations achetées pour elle
// (dégâts « Armes » + ses améliorations propres). Les dégâts ne changent pas ici : seule la mise en scène suit.
//   T = 0 : petit « pew pew », traînée fine, petite explosion, presque pas de recul.
//   T monte : traînée plus large et plus brillante (un cœur blanc au-dessus de la moitié), son plus lourd,
//   explosion plus grosse avec plus de poussière et de fumée, écran qui tremble plus, recul et éclair plus forts.
//   Dans le poste de pilotage, le modèle de l'arme gagne des détails à 3 paliers (1/3, 2/3, plein).
// Branché sur js/42-rts-combat.js (rtsS2, rtsS2b, rtsS25, Hellfire : champ « tier » ; rtsHit, rtsBlast) et js/54-rts-postes.js.

// Améliorations qui comptent pour chaque arme (clé : type d'unité + arme), et sons du plus léger au plus lourd
const RTS_TIER = {
  'tank:w1':    { keys:['arm', 'he', 'apfsds'],             snd:['rifle', 'sniper', 'rocket'] },
  'tank:gat':   { keys:['arm', 'coax'],                     snd:['pistol', 'rifle', 'rifle'] },
  'heli:gat':   { keys:['arm', 'chaingun', 'rate'],          snd:['rifle', 'minigun', 'minigun'] },
  'heli:w1':    { keys:['arm'],                             snd:['crossbow', 'rocket', 'rocket'] },
  'heli:w2':    { keys:['arm', 'hellfire'],                 snd:['crossbow', 'rocket', 'rocket'] },
  'jet:w1':     { keys:['arm', 'rate'],                     snd:['pistol', 'rifle', 'minigun'] },
  'warthog:w1': { keys:['arm', 'rate'],                     snd:['rifle', 'minigun', 'minigun'] },
  'bomber:w1':  { keys:['arm', 'sensor'],                   snd:['pistol', 'rifle', 'sniper'] },
  'bomber:w2':  { keys:['arm', 'cal105', 'fire', 'sensor'], snd:['crossbow', 'sniper', 'rocket'] },
  'bomber:gat': { keys:['arm', 'g25'],                      snd:['pistol', 'rifle', 'minigun'] }
};
function rtsTier(u, w){
  if (!u || !u.type) return .5;
  const D = RTS_TIER[u.type + ':' + (w || 'w1')] || { keys:['arm'] };
  let n = 0, m = 0;
  for (const k of D.keys){ const def = typeof rtsUpgDef === 'function' ? rtsUpgDef(u.type, k) : null; if (!def) continue; n += Math.min(def.max, rtsLv(u.type, k)); m += def.max; }
  return m ? n / m : 0;
}
function rtsTierSndFor(u, w){ const D = RTS_TIER[u.type + ':' + (w || 'w1')]; if (!D || !D.snd) return null; const t = rtsTier(u, w); return D.snd[t < .34 ? 0 : t < .67 ? 1 : 2]; }
const rtsTierOf = S2 => (S2 && typeof S2.tier === 'number' ? clamp(S2.tier, 0, 1) : .5);

// Traînée : de « petite ligne » à gros trait brillant avec un cœur blanc
function rtsTierBeam(from, to, S2, clear){
  if (!clear || typeof arsBeam !== 'function') return;
  const T = rtsTierOf(S2), k = .45 + 1.1 * T;
  if (S2.beam){ arsBeam(from, to, S2.beam, (S2.pierce ? .14 : .05) * k, (S2.pierce ? .12 : .05) * (.7 + .6 * T)); if (T > .5) arsBeam(from, to, 0xffffff, .03 * k, .04); return; }
  if (S2.chain || S2.flame) return;
  arsBeam(from, to, T > .66 ? 0xffc060 : 0xffa040, .12 * k, .06 + .06 * T);           // traînée de roquette, d'obus ou de bombe
  if (T > .5) arsBeam(from, to, 0xffffff, .035 * k, .05);
}
// Explosion : taille, poussière, fumée, secousse et son selon le niveau
function rtsTierBlast(x, z, S2){
  const T = rtsTierOf(S2), k = .55 + .9 * T;
  if (typeof rueBoom === 'function') rueBoom(x, 1.2, z, S2.splash * 2.4 * k);
  if (T > .4) burst(rtsV.set(x, .8, z), 'dust', Math.round(6 + 18 * T), 3 + 5 * T);
  if (S2.big){ // obus de 105 mm : il devient une vraie boule de feu en montant de niveau
    if (T > .3 && typeof rueBoom === 'function'){ rueBoom(x, 4, z, S2.splash * 3.2 * k); if (T > .65) rueBoom(x, 9, z, S2.splash * 1.8 * k); }
    if (T > .3) burst(rtsV.set(x, 1, z), 'dust', Math.round(15 + 30 * T), 6 + 6 * T);
    if (T > .5 && typeof gfxBoomSmoke === 'function') gfxBoomSmoke(x, 2, z, S2.splash * .8 * k);
    shake = Math.max(shake, (RTS.pilot ? .25 : .12) + (RTS.pilot ? .75 : .4) * T);
    if (typeof Snd === 'object' && Snd.boom) Snd.boom(.6 + 2 * T);
  } else if (typeof Snd === 'object' && Snd.boom && Math.random() < .5) Snd.boom(S2.bomb ? 1 : .25 + .6 * T);
}

/* ---------- Détails du modèle dans le poste de pilotage ---------- */
// Trois paliers par poste : chaque groupe s'affiche quand le niveau de l'arme atteint 1/3, 2/3 puis le maximum
const PTD = {};
const ptdGlow = new THREE.MeshBasicMaterial({ color:0xff7a2a, transparent:true, opacity:.75, blending:THREE.AdditiveBlending, depthWrite:false, fog:false });
function ptdNiv(post, parent, n){ const g = new THREE.Group(); g.visible = false; parent.add(g); (PTD[post] = PTD[post] || [])[n] = g; return g; }
(function ptdBuild(){
  if (typeof PT !== 'object' || !PT.g) return;
  const C = { o:0x4a5236, d:0x1d1f22, s:0x6a6d74, b:0x9a7630 };
  // Tank : frein de bouche, manchons et blocs de blindage, puis canon rougi par la chaleur
  if (PT.canon){
    let g = ptdNiv('tank', PT.canon, 0), b = vmNew(); vmBox(b, .5, .32, .45, C.d, 0, -.55, -5.85, 0, 0, 0, .05); vmMesh(g, b);
    g = ptdNiv('tank', PT.canon, 1); b = vmNew(); for (let i = 0; i < 4; i++) vmCyl(b, .2, .14, C.o, 0, -.55, -3.2 - i * .55, 0, 0, 0, 12); vmMesh(g, b);
    b = vmNew(); for (const s of [-1, 1]) for (let i = 0; i < 3; i++) vmBox(b, .22, .16, .2, C.o, s * (.55 + i * .2), -.5, -1.0, 0, 0, 0, .02); vmMesh(g, b, null, 0, 0, 0);
    g = ptdNiv('tank', PT.canon, 2); const m = new THREE.Mesh(new THREE.CylinderGeometry(.215, .215, .5, 12), ptdGlow); m.rotation.x = Math.PI / 2; m.position.set(0, -.55, -5.4); g.add(m);
  }
  // Apache : bande de munitions, 3 canons de plus, puis bouches rougies
  if (PT.heliBar && PT.heliGun){
    let g = ptdNiv('heli', PT.heliGun, 0), b = vmNew(); vmBox(b, .12, .1, .9, C.b, .26, .1, .35, 0, 0, 0, .01); for (let i = 0; i < 6; i++) vmBox(b, .14, .06, .05, C.b, .26, .16, .0 + i * .14, 0, 0, 0, 0); vmMesh(g, b);
    g = ptdNiv('heli', PT.heliBar, 1); b = vmNew(); for (let i = 0; i < 3; i++){ const a = (i + .5) / 3 * Math.PI * 2; vmCyl(b, .026, 1.1, C.s, Math.cos(a) * .12, Math.sin(a) * .12, -.55, 0, 0, 0, 7); } vmCyl(b, .16, .06, C.d, 0, 0, -.55, 0, 0, 0, 12); vmMesh(g, b);
    g = ptdNiv('heli', PT.heliBar, 2); const m = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .25, 12), ptdGlow); m.rotation.x = Math.PI / 2; m.position.set(0, 0, -1.0); g.add(m);
  }
  // Chasseur / Warthog : sabord du canon, cadre du viseur, réticule lumineux
  if (PT.g.jet){
    let g = ptdNiv('jet', PT.g.jet, 0), b = vmNew(); vmBox(b, .3, .16, .5, C.d, -.55, -.98, -2.4, 0, 0, 0, .03); vmMesh(g, b);
    g = ptdNiv('jet', PT.g.jet, 1); b = vmNew(); vmBox(b, .56, .03, .03, C.s, 0, -.15, -1.1, 0, 0, 0, 0); vmBox(b, .56, .03, .03, C.s, 0, -.57, -1.1, 0, 0, 0, 0); vmMesh(g, b);
    g = ptdNiv('jet', PT.g.jet, 2); const r = new THREE.Mesh(new THREE.RingGeometry(.05, .065, 24), new THREE.MeshBasicMaterial({ color:0x9aff70, transparent:true, opacity:.9, fog:false, depthWrite:false })); r.position.set(0, -.36, -1.09); g.add(r);
  }
  // AC-130, 40 mm : cache-flamme, chargeur sur le dessus, chemise de refroidissement rougie
  if (PT.c40){
    let g = ptdNiv('ac40', PT.c40, 0), b = vmNew(); vmCyl(b, .11, .35, C.d, 0, 0, -3.05, 0, 0, 0, 8); vmMesh(g, b);
    g = ptdNiv('ac40', PT.c40, 1); b = vmNew(); vmBox(b, .3, .35, .5, C.b, 0, .22, -.25, 0, 0, 0, .02); for (let i = 0; i < 5; i++) vmCyl(b, .085, .08, C.s, 0, 0, -.8 - i * .4, 0, 0, 0, 10); vmMesh(g, b);
    g = ptdNiv('ac40', PT.c40, 2); const m = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 1.2, 10), ptdGlow); m.rotation.x = Math.PI / 2; m.position.set(0, 0, -2.2); g.add(m);
  }
  // AC-130, 105 mm : gros frein de bouche, cylindres de recul, culasse ; puis tube rougi
  if (PT.c105){
    let g = ptdNiv('ac105', PT.c105, 0), b = vmNew(); vmBox(b, .8, .4, .55, C.d, 0, 0, -3.5, 0, 0, 0, .05); vmMesh(g, b);
    g = ptdNiv('ac105', PT.c105, 1); b = vmNew(); for (const s of [-1, 1]) vmCyl(b, .07, 1.6, C.s, 0, s * .26, -1.0, 0, 0, 0, 8); vmBox(b, .6, .5, .5, C.d, 0, 0, .2, 0, 0, 0, .05); vmMesh(g, b);
    g = ptdNiv('ac105', PT.c105, 2); const m = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 1.6, 14), ptdGlow); m.rotation.x = Math.PI / 2; m.position.set(0, 0, -2.4); g.add(m);
  }
})();
// Quelle arme et quel niveau pour le poste visible
function rtsPosteTier(u){
  if (!u || !PT.cur) return 0;
  const w = PT.cur === 'ac105' ? 'w2' : PT.cur === 'heli' ? 'gat' : 'w1';
  return rtsTier(u, w);
}
function rtsTierDetails(){
  const u = RTS.pilot; const T = rtsPosteTier(u);
  Object.keys(PTD).forEach(post => { PTD[post].forEach((g, n) => { if (g) g.visible = PT.cur === post && T >= [.33, .66, .99][n]; }); });
  ptdGlow.opacity = .45 + .3 * Math.sin(RTS.t * 6); // le métal rougi palpite un peu
  return T;
}

// Accès pour les tests automatiques
window.__rtsNiveaux = { RTS_TIER, rtsTier, rtsTierSndFor, rtsTierBeam, rtsTierBlast, rtsPosteTier, rtsTierDetails, PTD };
