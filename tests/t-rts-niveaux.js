'use strict';
/* Tests : les armes des véhicules embellissent avec les améliorations (js/55-rts-niveaux.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __rtsNiveaux === "object"') !== true) ignorer('Niveaux des armes absents (js/55-rts-niveaux.js)'); };
  const calme = 'function calme(){ __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies(); S.money = 1e8; return R; }';
  const fin = () => J(function(){ if (__rts.RTS.pilot) __rts.rtsUnpilot(); if (__rts.RTS.on) __rts.rtsQuit(); });
  const tout = "function tout(type){ var ks = ['arm'].concat(Object.keys(__rts.RTS_UPG_SPEC[type] || {})).concat(['rate']); ks.forEach(function(k){ for (var i = 0; i < 6; i++) __rts.rtsUpgBuy(type, k); }); }";

  test('RTS niveaux : le niveau visuel monte avec les améliorations de l’arme', () => {
    exiger(); reset();
    const r = J(new Function(calme + tout + `
      var R = calme(), N = __rtsNiveaux, o = {};
      var a = __rts.rtsSpawnUnit('bomber', 0, -40);
      o.zero = N.rtsTier(a, 'w2'); o.son0 = N.rtsTierSndFor(a, 'w2');
      __rts.rtsUpgBuy('bomber', 'cal105'); __rts.rtsUpgBuy('bomber', 'arm'); o.un = N.rtsTier(a, 'w2');
      tout('bomber'); o.max = N.rtsTier(a, 'w2'); o.sonMax = N.rtsTierSndFor(a, 'w2');
      o.s2 = rtsS2b(a).tier === o.max;
      return o;
    `));
    fin();
    egal(r.zero, 0, 'Sans amélioration'); ok(r.un > 0 && r.un < .5, 'Deux améliorations : ' + r.un.toFixed(2)); egal(r.max, 1, 'Tout acheté');
    ok(r.son0 !== r.sonMax, 'Le son change : ' + r.son0 + ' → ' + r.sonMax); ok(r.s2, 'Le tir porte son niveau');
  });

  test('RTS niveaux : petite explosion et petite traînée au début, grosses au maximum', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), N = __rtsNiveaux, o = {};
      var tailles = [], traits = [], rb = rueBoom, ab = arsBeam;
      rueBoom = function(x, y, z, s){ tailles.push(s); }; arsBeam = function(a, b, c, w){ traits.push(w); };
      try {
        var SB = { big:true, dmg:1, splash:11, snd:'rocket' };
        SB.tier = 0; N.rtsTierBlast(0, -60, SB); var t0 = Math.max.apply(null, tailles), n0 = tailles.length; tailles.length = 0;
        SB.tier = 1; N.rtsTierBlast(0, -60, SB); var t1 = Math.max.apply(null, tailles), n1 = tailles.length;
        var A = new THREE.Vector3(0, 30, -40), B = new THREE.Vector3(0, 0, -60);
        N.rtsTierBeam(A, B, { tier:0 }, true); var w0 = Math.max.apply(null, traits), c0 = traits.length; traits.length = 0;
        N.rtsTierBeam(A, B, { tier:1 }, true); var w1 = Math.max.apply(null, traits), c1 = traits.length;
        o = { t0:t0, t1:t1, n0:n0, n1:n1, w0:w0, w1:w1, c0:c0, c1:c1 };
      } finally { rueBoom = rb; arsBeam = ab; }
      return o;
    `));
    fin();
    ok(r.t1 > r.t0 * 2, 'Boule de feu : ' + Math.round(r.t0) + ' au début, ' + Math.round(r.t1) + ' au maximum');
    ok(r.n1 > r.n0, 'Plus d’explosions au maximum (' + r.n0 + ' puis ' + r.n1 + ')');
    ok(r.w1 > r.w0 * 2, 'Traînée : ' + r.w0.toFixed(3) + ' puis ' + r.w1.toFixed(3)); ok(r.c1 > r.c0, 'Un cœur blanc s’ajoute au maximum');
  });

  test('RTS niveaux : le modèle gagne des détails, le recul grossit', () => {
    exiger(); reset();
    const r = J(new Function(calme + tout + `
      var R = calme(), N = __rtsNiveaux, P = __rtsPostes, o = {};
      var t = __rts.rtsSpawnUnit('tank', 0, -20); __rts.rtsPilot(t); visuals(1 / 30);
      o.det0 = N.PTD.tank.filter(function(g){ return g.visible; }).length;
      t.cd = 0; R.pv.fire = true; visuals(1 / 30); R.pv.fire = false; o.recul0 = P.PT.canon.position.z;
      tout('tank'); for (var i = 0; i < 40; i++) visuals(1 / 30);
      o.det1 = N.PTD.tank.filter(function(g){ return g.visible; }).length;
      t.cd = 0; R.pv.fire = true; visuals(1 / 30); R.pv.fire = false; o.recul1 = P.PT.canon.position.z;
      var a = __rts.rtsSpawnUnit('bomber', 0, -40); __rts.rtsPilot(a); a.cd2 = 0; R.pv.fire2 = true; visuals(1 / 30); R.pv.fire2 = false; visuals(1 / 30);
      o.ac0 = N.PTD.ac105.filter(function(g){ return g.visible; }).length;
      tout('bomber'); visuals(1 / 30); o.ac1 = N.PTD.ac105.filter(function(g){ return g.visible; }).length;
      __rts.rtsUnpilot(); o.cache = !Object.keys(N.PTD).some(function(k){ return N.PTD[k].some(function(g){ return g && g.visible; }); });
      return o;
    `));
    fin();
    egal(r.det0, 0, 'Tank de base : pas de détails'); egal(r.det1, 3, 'Tank au maximum : les 3 paliers');
    ok(r.recul1 > r.recul0 * 2.5, 'Recul : ' + r.recul0.toFixed(2) + ' puis ' + r.recul1.toFixed(2));
    egal(r.ac0, 0, '105 mm de base'); egal(r.ac1, 3, '105 mm au maximum'); ok(r.cache, 'Détails cachés au retour');
  });
})();
