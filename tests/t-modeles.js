'use strict';
/* Tests des armes en main (04-arme-en-main.js) : modèles, budget, mire à l'œil, douilles, animations.
   À charger APRÈS tests.js dans tests/index.html :
   <script src="t-modeles.js"></script>
   Utilise l'API de tests.js : test(), J(), lire(), ok(), egal(), ignorer(), reset(). */
(function(){
  if (typeof test !== 'function') return;
  const BUDGET_TRIS = 1500, MAX_APPELS = 6;
  const pret = () => lire('typeof VMS === "object" && typeof vmStats === "function" && typeof vmAnim === "function" && typeof vmShells === "object"') === true;
  const exiger = () => { if (!pret()) ignorer('Armes en main détaillées absentes (vmStats, vmAnim ou vmShells introuvables)'); };
  // Partie lancée à Saint-Clou, sans apparitions, toutes les armes données
  function partie(){
    reset(); J('startLocation(0)'); J('__t.geler()');
    J(function(){ clearZombies(); WORDER.forEach(function(id){ S.owned[id] = true; S.ammo[id] = magSize(id); }); });
  }

  test('Modèles : chaque arme a un modèle visible quand elle est équipée, les autres sont cachées', () => {
    exiger(); partie();
    const r = J(function(){
      var res = {};
      WORDER.forEach(function(id){
        equip(id);
        var autres = Object.keys(VMS).filter(function(k){ return k !== id && VMS[k].visible; });
        var st = vmStats(id);
        res[id] = { vis: VMS[id].visible && vmRoot.parent === vmCam, autres: autres.length, appels: st.calls, tris: st.tris };
      });
      equip('pistol');
      return res;
    });
    Object.keys(r).forEach(id => {
      ok(r[id].vis, id + ' : modèle invisible une fois équipé');
      egal(r[id].autres, 0, id + ' : autres modèles visibles');
      ok(r[id].appels >= 1, id + ' : aucune pièce dessinée');
      ok(r[id].tris >= 300, id + ' : modèle trop simple (' + r[id].tris + ' triangles)');
    });
  });

  test('Modèles : budget de triangles et d’appels de dessin par arme', () => {
    exiger(); partie();
    const r = J(function(){
      var res = {};
      WORDER.forEach(function(id){ equip(id); vmAnim(1 / 60); var st = vmStats(id); res[id] = { tris: st.maxTris, appels: st.calls }; });
      equip('pistol');
      return res;
    });
    Object.keys(r).forEach(id => {
      ok(r[id].tris <= BUDGET_TRIS, id + ' : ' + r[id].tris + ' triangles (budget ' + BUDGET_TRIS + ')');
      ok(r[id].appels <= MAX_APPELS, id + ' : ' + r[id].appels + ' appels de dessin (max ' + MAX_APPELS + ')');
    });
  });

  test('Modèles : à l’œil, guidon et cran de mire tombent au centre de l’écran', () => {
    exiger(); partie();
    const r = J(function(){
      var res = {}, st0 = state;
      state = 'playing'; zoomed = true;
      WORDER.forEach(function(id){
        equip(id); reloadT = 0;
        for (var i = 0; i < 60; i++){ kick = 0; recoilAcc = 0; visuals(1 / 30); }
        kick = 0; visuals(1 / 30);
        vmCam.updateMatrixWorld(true); vmRoot.updateMatrixWorld(true);
        var pts = (VMS[id].userData.sight || []).map(function(p){ var q = p.clone().applyMatrix4(VMS[id].matrixWorld).project(vmCam); return [q.x, q.y, q.z]; });
        res[id] = { ads: ads, pts: pts };
      });
      zoomed = false; state = st0; equip('pistol');
      return res;
    });
    Object.keys(r).forEach(id => {
      ok(r[id].ads > .99, id + ' : l’arme n’arrive pas à l’œil (ads = ' + r[id].ads + ')');
      ok(r[id].pts.length >= 2, id + ' : points de visée absents');
      r[id].pts.forEach((q, i) => {
        const nom = i ? 'cran de mire' : 'guidon';
        ok(Math.abs(q[0]) < .02 && Math.abs(q[1]) < .02, id + ' : ' + nom + ' décentré (' + q[0].toFixed(3) + ', ' + q[1].toFixed(3) + ')');
        ok(q[2] > -1 && q[2] < 1, id + ' : ' + nom + ' hors du champ de la caméra');
      });
    });
  });

  test('Modèles : douilles éjectées par un petit pool fixe, réutilisé', () => {
    exiger(); partie();
    const r = J(function(){
      var n0 = vmShells.list.length, c0 = vmCam.children.length, actives = function(){ return vmShells.list.filter(function(s){ return s.life > 0; }).length; };
      equip('pistol'); vmAnim(1 / 60); vmShellClear();
      state = 'playing'; cool = 0; S.ammo.pistol = magSize('pistol');
      var tir = fire(); vmAnim(1 / 60);
      var apresTir = actives();
      equip('rifle');
      for (var i = 0; i < 60; i++){ vmShot(); vmAnim(1 / 60); }
      var max = actives();
      for (var k = 0; k < 60; k++) vmAnim(1 / 20);
      var fin = actives();
      state = 'test'; equip('pistol');
      return { n0: n0, n1: vmShells.list.length, c0: c0, c1: vmCam.children.length, tir: tir, apresTir: apresTir, max: max, fin: fin, cap: vmShells.mesh.count, visible: vmShells.mesh.visible };
    });
    ok(r.tir !== false, 'Le tir du pistolet a échoué');
    ok(r.apresTir >= 1, 'Aucune douille après un tir de pistolet (fire() enveloppé ?)');
    egal(r.n1, r.n0, 'Taille du pool après 60 tirs');
    egal(r.c1, r.c0, 'Objets ajoutés à la caméra de l’arme');
    ok(r.max <= r.cap, 'Plus de douilles que la capacité du pool : ' + r.max + ' / ' + r.cap);
    ok(r.max >= 2, 'Rafale : trop peu de douilles en l’air (' + r.max + ')');
    egal(r.fin, 0, 'Douilles encore en l’air après 3 s');
    ok(!r.visible, 'Le pool de douilles reste dessiné alors qu’il est vide');
  });

  test('Modèles : la glissière recule au tir, le chargeur descend à la recharge, la pompe bouge', () => {
    exiger(); partie();
    const r = J(function(){
      var o = {};
      equip('pistol'); vmAnim(1 / 60);
      var u = VMS.pistol.userData, z0 = u.slide.position.z;
      S.ammo.pistol = 5; vmShot(); vmAnim(1 / 240); o.glissiere = u.slide.position.z - z0;
      for (var i = 0; i < 30; i++) vmAnim(1 / 60); o.retour = u.slide.position.z - z0;
      var m0 = u.mag.position.y; reloadDur = 1; reloadT = .85; vmAnim(1 / 60); o.chargeur = m0 - u.mag.position.y; reloadT = 0; vmAnim(1 / 60); o.chargeurRetour = Math.abs(u.mag.position.y - m0);
      equip('shotgun'); vmAnim(1 / 60);
      var p = VMS.shotgun.userData.pump, p0 = p.position.z, maxp = 0;
      vmShot(); for (var k = 0; k < 30; k++){ vmAnim(1 / 60); maxp = Math.max(maxp, p.position.z - p0); }
      o.pompe = maxp; o.pompeRetour = Math.abs(p.position.z - p0);
      equip('flamer'); vmAnim(1 / 60); o.flammeY = flash.position.y; o.muzzleY = VMS.flamer.userData.muzzleY;
      equip('pistol');
      return o;
    });
    ok(r.glissiere > .01, 'La glissière ne recule pas (' + r.glissiere + ')');
    ok(Math.abs(r.retour) < .002, 'La glissière ne revient pas (' + r.retour + ')');
    ok(r.chargeur > .05, 'Le chargeur ne descend pas pendant la recharge (' + r.chargeur + ')');
    ok(r.chargeurRetour < .001, 'Le chargeur ne revient pas à sa place');
    ok(r.pompe > .04, 'La pompe ne bouge pas (' + r.pompe + ')');
    ok(r.pompeRetour < .002, 'La pompe ne revient pas');
    ok(Math.abs(r.flammeY - r.muzzleY) < 1e-6, 'L’éclair n’est pas au bout du canon du lance-flammes');
  });
})();
