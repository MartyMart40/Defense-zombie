'use strict';
/* Tests du dossier 105 : aucun zombie n'apparaît derrière le robot ; habitacle complet, manettes, jambes (js/40-robot-habitacle.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __mb === "object" && typeof __mech === "object" && typeof __mechFin === "object"') !== true) ignorer('Robot absent (js/39 et js/40)'); };
  const exigerH = () => { exiger(); if (lire('typeof __habitacle === "object"') !== true) ignorer('Habitacle absent (js/40-robot-habitacle.js)'); };
  const depart = () => J(function(){ __mech.mechStart(); plan.queue = []; spawnT = 1e9; clearZombies(); __mb.MB.waveT = 1e9; });
  const fin = () => J(function(){ if (__mech.MECH.on) __mech.mechQuit(); });

  test('Robot : aucun zombie n’apparaît derrière le robot, quelle que soit la source (rue, renforts, vagues, boss, ponte, abomination)', () => {
    exiger(); reset(); depart();
    const r = J(function(){
      var M = __mech.MECH, MZ = MECH_CAM.z, o = { src: {} };
      var mesure = function(nom, fn){
        var avant = zombies.slice(); fn();
        var nv = zombies.filter(function(z){ return avant.indexOf(z) < 0 && z.g; });
        var s = o.src[nom] || (o.src[nom] = { n: 0, derriere: 0, pres: 1e9 });
        nv.forEach(function(z){ s.n++; var dz = MZ - z.g.position.z; if (dz < 0) s.derriere++; if (dz < s.pres) s.pres = dz; });
      };
      var vider = function(){ clearZombies(); };
      // 1. File de la rue, renforts et règles du carrefour : les vraies sorties de mechStep, rue par rue
      for (var rue = 1; rue <= 9; rue += 2){
        [null, 'nid', 'ruelle'].forEach(function(id){
          vider(); M.street = rue; M.route = id ? __mb.MB_RULES.filter(function(x){ return x.id === id; })[0] : null; M.renf = rue % 3; M.dist = 20;
          plan = __mech.mechPlan(); plan.maxAlive = 300; plan.interval = 0; plan.burst = 10;
          mesure('rue', function(){ for (var i = 0; i < 6; i++){ spawnT = 0; mechStep(1 / 600); } });
          // Renforts : la file vide se refait dans la même image
          plan.queue = []; plan.maxAlive = 300;
          mesure('renforts', function(){ spawnT = 0; mechStep(1 / 600); plan.interval = 0; plan.burst = 10; for (var i = 0; i < 3; i++){ spawnT = 0; mechStep(1 / 600); } });
        });
      }
      M.route = null; M.renf = 0;
      // 2. Vagues, à chaque rue
      for (rue = 1; rue <= 9; rue += 2){ for (var w = 0; w < 3; w++){ vider(); M.street = rue; plan.maxAlive = 200; mesure('vagues', function(){ __mb.mbWave(); }); } }
      // 3. Boss des rues (Titan, Mère pondeuse, Béhémoth, boss du toit) et chef de meute
      ['titan', 'broodmother', 'behemoth', 'boss', 'crawler', 'crow'].forEach(function(t){ vider(); plan.maxAlive = 200; mesure('boss et meutes', function(){ spawnZombie(t); }); });
      // 4. Boss final, puis son appel de la horde à mi-vie
      vider(); M.street = 9; plan = __mech.mechPlan(); plan.maxAlive = 300; M.finBoss = null; M.finMoitie = false; M.dist = __mech.MECH_LEN * .5;
      mesure('boss final', function(){ __mechFin.mechFinPas(); });
      var fb = __mechFin.finBossVivant(); if (fb) fb.hp = fb.maxHp * .4;
      mesure('appel du Titan roi', function(){ __mechFin.mechFinPas(); });
      // 5. Mère pondeuse et abomination : derrière le robot, rien ne sort ; devant, les petits sortent devant
      [[MZ + 12, 'ponte derrière'], [MZ - 30, 'ponte devant']].forEach(function(p){
        vider(); plan.maxAlive = 300; var b = spawnZombie('broodmother'); b.g.position.set(0, 0, p[0]); b.layT = 0; if (p[0] > MZ){ b.mechBack = true; b.stopZ = 1e6; } // passée derrière : elle se retourne (js/39)
        mesure(p[1], function(){ ZKINDS.broodmother.update(b, 1 / 600); });
      });
      [[MZ + 8, 'abomination derrière'], [MZ - 20, 'abomination devant']].forEach(function(p){
        vider(); plan.maxAlive = 300; var a = spawnZombie('abomination'); a.g.position.set(0, 0, p[0]);
        mesure(p[1], function(){ damage(a, 1e12, false, a.g.position.clone()); });
      });
      return o;
    });
    fin();
    const S = r.src;
    Object.keys(S).forEach(k => { egal(S[k].derriere, 0, k + ' : zombies apparus derrière le robot (sur ' + S[k].n + ')'); });
    ['rue', 'renforts', 'vagues', 'boss et meutes', 'boss final', 'appel du Titan roi'].forEach(k => { ok(S[k] && S[k].n > 0, k + ' : des zombies sont bien apparus (' + (S[k] ? S[k].n : 0) + ')'); });
    ['rue', 'renforts', 'vagues', 'boss final', 'appel du Titan roi'].forEach(k => { ok(S[k] && S[k].pres >= 25, k + ' : le plus proche sort à ' + (S[k] ? S[k].pres.toFixed(1) : '?') + ' m devant'); });
    egal(S['ponte derrière'].n, 0, 'La Mère pondeuse passée derrière ne pond pas');
    ok(S['ponte devant'].n > 0, 'Devant, elle pond (' + S['ponte devant'].n + ')');
    egal(S['abomination derrière'].n, 0, 'Rien ne sort d’une abomination tuée derrière');
    ok(S['abomination devant'].n > 0, 'Devant, les rampants sortent (' + S['abomination devant'].n + ')');
  });

  test('Robot : habitacle complet (vitre, tableau de bord, écrans qui vivent), manettes et mains qui bougent, vue dégagée en réglage', () => {
    exigerH(); reset();
    const r = J(function(){
      var H = __habitacle, M = __mech.MECH, o = {}, dt = 1 / 30;
      H.vue('complet'); __mech.mechStart(); plan.queue = []; spawnT = 1e9; clearZombies(); __mb.MB.waveT = 1e9;
      for (var i = 0; i < 5; i++) visuals(dt);
      o.habitacle = H.hbRoot.visible; o.vieux = H.hbVieux.some(function(x){ return x.visible; }); o.jambes = H.hbJ.visible;
      o.ecran = H.HB.ecrK; o.vitre = H.hbVitre.material.blending === THREE.AdditiveBlending && H.hbVitre.material.depthWrite === false;
      // L'habitacle ne suit pas la vue qui baisse
      window.__game.setAim(yaw, -1); visuals(dt); o.rotBas = H.hbRoot.rotation.x;
      window.__game.setAim(yaw, -.2); visuals(dt);
      // Manette gauche : en avant
      M.mv.f = 1; for (i = 0; i < 10; i++) visuals(dt); o.gAvant = H.hbMG.piv.rotation.x;
      M.mv.f = 0; M.mv.r = 1; for (i = 0; i < 10; i++) visuals(dt); o.gDroite = H.hbMG.piv.rotation.z;
      M.mv.r = 0; M.joy.dy = 1; for (i = 0; i < 10; i++) visuals(dt); o.gArriere = H.hbMG.piv.rotation.x; M.joy.dy = 0;
      for (i = 0; i < 20; i++) visuals(dt); o.gRepos = Math.abs(H.hbMG.piv.rotation.x) + Math.abs(H.hbMG.piv.rotation.z);
      // Manette droite : la visée qui tourne
      for (i = 0; i < 10; i++){ yaw -= .03; visuals(dt); } o.dDroite = H.hbMD.piv.rotation.z;
      for (i = 0; i < 20; i++) visuals(dt); o.dRepos = Math.abs(H.hbMD.piv.rotation.z);
      // Gâchette et bouton
      M.mini = true; for (i = 0; i < 6; i++) visuals(dt); o.gach = H.hbMD.gach.rotation.x; M.mini = false;
      M.rocket = true; for (i = 0; i < 6; i++) visuals(dt); o.btn = H.hbMD.btn.position.y; M.rocket = false;
      // Les écrans changent avec le blindage
      var k0 = H.HB.ecrK; S.bar = S.barMax * .2; for (i = 0; i < 6; i++) visuals(dt); o.ecranVit = H.HB.ecrK !== k0;
      // Pause : réglage « Habitacle »
      mechPause(); var b = document.getElementById('mkVue'); o.bouton = b ? b.textContent : null;
      if (b) b.click(); o.apres = b ? b.textContent : null; o.garde = store.get('dt_mech_vue');
      mechResume(); visuals(dt); o.degage = H.hbRoot.visible; o.vieuxDegage = H.hbVieux.every(function(x){ return x.visible; }); o.jambesDegage = H.hbJ.visible;
      H.vue('complet'); visuals(dt); o.retour = H.hbRoot.visible;
      // Écran étroit (cell vertical) : manettes plus près du centre
      var a0 = vmCam.aspect, f0 = vmCam.fov, xL = Math.abs(H.hbMG.socle.position.x);
      vmCam.aspect = 390 / 844; vmCam.fov = 78; visuals(dt); o.xV = Math.abs(H.hbMG.socle.position.x); o.xL = xL; o.brasV = H.HB.dx;
      vmCam.aspect = a0; vmCam.fov = f0; visuals(dt);
      __mech.mechQuit(); visuals(dt); o.cache = !H.hbRoot.visible && !H.hbJ.visible;
      return o;
    });
    fin();
    ok(r.habitacle && !r.vieux, 'Habitacle visible, ancien cadre caché');
    ok(r.jambes, 'Jambes visibles');
    ok(r.vitre, 'Vitre légère (reflets qui ne cachent rien)');
    ok(r.ecran && r.ecran.length > 5, 'Écrans du tableau de bord dessinés');
    ok(Math.abs(r.rotBas - 1) < 1e-6, 'L’habitacle tient au torse quand on regarde en bas : ' + r.rotBas);
    ok(r.gAvant < -.2, 'Manette gauche penchée en avant : ' + r.gAvant.toFixed(2));
    ok(r.gDroite < -.15, 'Manette gauche penchée à droite : ' + r.gDroite.toFixed(2));
    ok(r.gArriere > .2, 'Manette gauche tirée en arrière (manette tactile) : ' + r.gArriere.toFixed(2));
    ok(r.gRepos < .02, 'Manette gauche revenue au centre : ' + r.gRepos.toFixed(3));
    ok(Math.abs(r.dDroite) > .1, 'Manette droite penchée quand la visée tourne : ' + r.dDroite.toFixed(2));
    ok(r.dRepos < .02, 'Manette droite revenue au centre : ' + r.dRepos.toFixed(3));
    ok(r.gach > .3, 'Gâchette enfoncée au tir : ' + r.gach.toFixed(2));
    ok(r.btn < .265, 'Bouton du pouce enfoncé (bras droit) : ' + r.btn.toFixed(3));
    ok(r.ecranVit, 'Les écrans suivent le blindage');
    egal(r.bouton, 'Habitacle : complet', 'Réglage dans la Pause');
    egal(r.apres, 'Habitacle : dégagé', 'Le bouton change de vue');
    egal(r.garde, 'degage', 'Réglage gardé (dt_mech_vue)');
    ok(!r.degage && r.vieuxDegage && r.jambesDegage, 'Vue dégagée : l’ancien cockpit, les jambes toujours là');
    ok(r.retour, 'Retour à l’habitacle complet');
    ok(r.xV < r.xL && r.xV < .15, 'Cell vertical : manettes plus près du centre (' + r.xV.toFixed(2) + ' au lieu de ' + r.xL.toFixed(2) + ')');
    ok(r.brasV > .2, 'Cell vertical : bras du robot rapprochés (' + r.brasV.toFixed(2) + ')');
    ok(r.cache, 'Tout est caché en quittant le robot');
  });

  test('Robot : les jambes marchent (pas alternés, pied posé collé à la rue, arrêt propre, de côté, en tournant) ; balancement réduit sans « Secousses »', () => {
    exigerH(); reset();
    const r = J(function(){
      var H = __habitacle, M = __mech.MECH, o = {}, dt = 1 / 30, JJ = H.HB_JAMBES, L = H.HB_J;
      H.vue('complet'); __mech.mechStart(); plan.queue = []; spawnT = 1e9; clearZombies(); __mb.MB.waveT = 1e9;
      for (var i = 0; i < 3; i++) visuals(dt);
      var p0 = H.HB.pas, pz0 = JJ.map(function(J){ return J.poses; });
      // En avant : pied posé collé à la rue (il recule exactement comme la rue défile)
      M.mv.f = 1; var colle = true, alterne = true, dernier = -1, maxEnl = 0, portee = 0;
      for (i = 0; i < 120; i++){
        var avant = JJ.map(function(J){ return { enl: J.enl, z: J.pos.z, x: J.pos.x }; }), d0 = M.dist;
        visuals(dt);
        var dd = M.dist - d0;
        JJ.forEach(function(J, k){ if (!avant[k].enl && !J.enl && Math.abs(J.pos.z - (avant[k].z + dd)) > 1e-4) colle = false; if (J.enl) maxEnl = Math.max(maxEnl, J.pos.y); });
        JJ.forEach(function(J, k){ if (avant[k].enl && !J.enl){ if (dernier === k) alterne = false; dernier = k; } });
        if (JJ[0].enl && JJ[1].enl) alterne = false;
        JJ.forEach(function(J){ var h = J.cuisse.position, a = J.tibia.position; portee = Math.max(portee, h.distanceTo(a)); });
      }
      o.pas = H.HB.pas - p0; o.colle = colle; o.alterne = alterne; o.levee = maxEnl; o.portee = portee; o.genou = L.cuisse;
      o.cadence = H.HB.rate;
      // Les pieds suivent le robot : jamais à plus de 3,5 m de leur place
      var loin = 0; JJ.forEach(function(J){ var dx = J.pos.x - M.x, dz = J.pos.z - MECH_CAM.z; loin = Math.max(loin, Math.hypot(dx, dz)); }); o.loin = loin;
      // Arrêt propre : le pas en cours se finit, puis plus rien ne bouge
      M.mv.f = 0; for (i = 0; i < 90; i++) visuals(dt);
      o.arretEnl = JJ.some(function(J){ return J.enl; }); var pa = H.HB.pas; for (i = 0; i < 30; i++) visuals(dt); o.arretPas = H.HB.pas - pa;
      o.arretPlace = Math.max.apply(null, JJ.map(function(J){ var n = new THREE.Vector3(); var y = H.HB.yawP; n.set(M.x + Math.cos(y) * J.s * L.pied - Math.sin(y) * L.avant * .3, 0, MECH_CAM.z - Math.sin(y) * J.s * L.pied - Math.cos(y) * L.avant * .3); return n.distanceTo(J.pos); }));
      o.m = H.HB.m;
      // De côté : les pieds vont à droite
      var x0 = (JJ[0].pos.x + JJ[1].pos.x) / 2; M.mv.r = 1; for (i = 0; i < 60; i++) visuals(dt); M.mv.r = 0; for (i = 0; i < 60; i++) visuals(dt);
      o.cote = (JJ[0].pos.x + JJ[1].pos.x) / 2 - x0;
      // En tournant sur place : de petits pas, le bassin suit
      var pt = H.HB.pas; M.turn = 1; for (i = 0; i < 45; i++) visuals(dt); M.turn = 0; for (i = 0; i < 60; i++) visuals(dt);
      o.tournePas = H.HB.pas - pt; o.bassin = Math.abs(((H.HB.yawP - yaw) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      // « Secousses » coupé : pas de secousse au pas, pas de roulis
      var sec0 = typeof RS === 'object' ? RS.on : null; if (typeof RS === 'object') RS.on = false; else store.set('dt_secousses', false);
      M.mv.f = 1; var roule = 0, sh = 0, haut = 0; for (i = 0; i < 60; i++){ shake = 0; visuals(dt); roule = Math.max(roule, Math.abs(camera.rotation.z)); sh = Math.max(sh, shake); haut = Math.max(haut, Math.abs(camera.position.y - MECH_CAM.y)); }
      M.mv.f = 0; o.sansRoule = roule; o.sansShake = sh; o.sansHaut = haut;
      if (typeof RS === 'object') RS.on = sec0; else store.set('dt_secousses', true);
      M.mv.f = 1; roule = 0; haut = 0; for (i = 0; i < 60; i++){ visuals(dt); roule = Math.max(roule, Math.abs(camera.rotation.z)); haut = Math.max(haut, Math.abs(camera.position.y - MECH_CAM.y)); } M.mv.f = 0;
      o.avecRoule = roule; o.avecHaut = haut;
      return o;
    });
    fin();
    ok(r.pas >= 4, 'Pas en 4 s de marche : ' + r.pas);
    ok(r.colle, 'Le pied posé reste collé à la rue');
    ok(r.alterne, 'Les pieds se posent l’un après l’autre');
    ok(r.levee > .3, 'Le pied se lève pendant le pas : ' + r.levee.toFixed(2) + ' m');
    ok(r.loin < 3.6, 'Les pieds restent sous le robot : ' + r.loin.toFixed(2) + ' m');
    ok(Math.abs(r.portee - r.genou) < 1e-3, 'La cuisse garde sa longueur');
    ok(!r.arretEnl && r.arretPas === 0, 'Arrêt propre : plus de pied en l’air, plus de pas');
    ok(r.arretPlace < .5, 'À l’arrêt, les pieds sont à leur place : ' + r.arretPlace.toFixed(2) + ' m');
    ok(r.m < .05, 'Plus de balancement à l’arrêt : ' + r.m.toFixed(3));
    ok(r.cote > 1, 'De côté, les pieds suivent : ' + r.cote.toFixed(2) + ' m');
    ok(r.tournePas >= 1 && r.bassin < .2, 'En tournant sur place : ' + r.tournePas + ' pas, bassin à ' + r.bassin.toFixed(2) + ' rad');
    ok(r.sansRoule < 1e-6 && r.sansShake < 1e-6, 'Sans « Secousses » : ni roulis ni secousse au pas');
    ok(r.sansHaut < r.avecHaut && r.avecRoule > .005, 'Le balancement est réduit sans « Secousses » (' + r.sansHaut.toFixed(3) + ' contre ' + r.avecHaut.toFixed(3) + ')');
  });
})();
