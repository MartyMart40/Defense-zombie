'use strict';
/* Tests du dossier 125 : image des monstres du robot (détails des modèles dans js/73-robot-monstres2.js et js/40-robot-monstres.js,
   effets dans js/78-robot-monstres-fx.js). Rien du jeu ne doit changer : boîtes de tir, hasard, rayon de l'obus. */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __mr2 === "object" && typeof __mfx === "object" && typeof __mb === "object" && typeof ZBOX === "object"') !== true) ignorer('Effets des monstres du robot absents (js/78-robot-monstres-fx.js)'); };
  const fin = () => J(function(){ if (MECH.on) mechQuit(); if (typeof __mechSave === 'object') __mechSave.mechSaveClear(); });
  const PREP = 'window.__mfxt = { prep:function(rue){ mechStart(); __mb.MB.waveT = 1e9; MECH.street = rue; mechStreet(false); clearZombies(); __mb.MB.waveT = 1e9; plan.queue = []; S.bar = S.barMax = 1e7; },'
    + ' pas:function(n){ for (var i = 0; i < n; i++){ spawnT = 1e9; plan.queue = [\'walker\']; __mb.MB.waveT = 1e9; visuals(1 / 30); } } };';

  test('Robot monstres, image : boîtes de tir et tirages du hasard identiques avec et sans les détails des modèles', () => {
    exiger();
    const r = J(function(){
      var o = { types:{} }, D = __mr2.MR2_DECO;
      var fait = function(type, deco){
        var avant = ZBOX[type], n = 0, R0 = Math.random, res;
        delete ZBOX[type]; D.on = deco;
        try {
          res = __t.graine(31, function(){
            var R1 = Math.random; Math.random = function(){ n++; return R1(); };
            try {
              var R = zkind(type).build(ZTYPES[type]); zBoxFor(type, R.g); R.g.updateMatrixWorld(true);
              var parts = (R.parts || []).slice(); if (R.head && parts.indexOf(R.head) < 0) parts.push(R.head);
              var b = parts.map(function(m){ if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); var x = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld); return x.min.toArray().concat(x.max.toArray()).map(function(v){ return Math.round(v * 1e5) / 1e5; }).join(','); });
              var Z = ZBOX[type];
              var meshes = 0; R.g.traverse(function(q){ meshes++; });
              return { parts:b.join(' | '), zbox:Z.min.toArray().concat(Z.max.toArray()).map(function(v){ return Math.round(v * 1e5) / 1e5; }).join(','), mats:R.mats.length, aimY:R.aimY, meshes:meshes, inst:zInstOk(R.g) };
            } finally { Math.random = R1; }
          });
        } finally { D.on = true; if (avant) ZBOX[type] = avant; else delete ZBOX[type]; Math.random = R0; }
        res.tirages = n; return res;
      };
      // Une construction pour rien d'abord : les matériaux partagés créés à la première (zmat) tirent aussi dans Math.random
      ['belier', 'grappin', 'mortier', 'titan'].forEach(function(t){ fait(t, true); o.types[t] = { sans:fait(t, false), avec:fait(t, true) }; });
      return o;
    });
    Object.keys(r.types).forEach(t => {
      const a = r.types[t].sans, b = r.types[t].avec;
      egal(b.parts, a.parts, t + ' : maillages de tir (parts, tête) à la même place et de la même taille');
      egal(b.zbox, a.zbox, t + ' : boîte englobante de tir (ZBOX) identique');
      egal(b.mats + ',' + b.aimY, a.mats + ',' + a.aimY, t + ' : matériaux du flash et hauteur visée identiques');
      egal(b.tirages, a.tirages, t + ' : autant de tirages de Math.random (' + a.tirages + ')');
      ok(b.meshes > a.meshes, t + ' : détails ajoutés (' + a.meshes + ' → ' + b.meshes + ' objets)');
      ok(b.inst, t + ' : toujours dessiné par instances');
    });
  });

  test('Robot monstres, image : Bélier, poussière à l’élan et à la charge, briques quand il s’écrase, sans tirage du hasard', () => {
    exiger(); reset({ mr2Vus:{ belier:true, grappin:true, mortier:true } });
    J(PREP);
    const r = J(function(){
      var o = {}, M2 = __mr2, F = __mfx.MFX, T = __mfxt; T.prep(4);
      var z = spawnZombie('belier'); z.g.position.set(0, 0, MECH_CAM.z - 36); z.mrX = 0; z.mrCd = 0; z.mrDist = 36;
      var i, nE = 0, nC = 0, tir = 0, R0 = Math.random;
      for (i = 0; i < 200 && z.mr !== 'charge'; i++) T.pas(1);
      o.elan = F.nuage.vivants;
      // Une image d'effets seule : aucun tirage de Math.random
      Math.random = function(){ tir++; return R0(); };
      try { __mfx.mfxImage(1 / 30); } finally { Math.random = R0; }
      o.tirages = tir;
      for (i = 0; i < 10; i++) T.pas(1);
      o.charge = F.nuage.vivants;
      // Pas de côté : il s'écrase contre la façade
      var dodge = false; S.bar = 1e7; z.mrCd = 0;
      for (i = 0; i < 600 && z.mr !== 'sonne'; i++){ if (z.mr === 'charge' && !dodge){ MECH.mv.r = 1; dodge = true; } if (dodge && MECH.x > 4) MECH.mv.r = 0; T.pas(1); }
      MECH.mv.r = 0; T.pas(2);
      o.sonne = z.mr === 'sonne'; o.briques = F.solide.vivants; o.bosse = z.rig.bosse.visible;
      // En pause, rien ne bouge
      MECH.paused = true; var y0 = F.solide.im.instanceMatrix.array[13]; T.pas(5); o.pause = F.solide.im.instanceMatrix.array[13] === y0; MECH.paused = false;
      mechQuit(); visuals(1 / 30);
      o.vide = !F.solide.im.visible && !F.nuage.im.visible && !F.lueur.im.visible && F.solide.im.count === 0;
      return o;
    });
    fin();
    ok(r.elan > 0, 'Il gratte le sol : poussière pendant l’élan (' + r.elan + ')'); ok(r.charge >= 5, 'En charge : nuage de poussière (' + r.charge + ', élan ' + r.elan + ')'); // le compte de l'élan dépend du hasard propre des effets : on ne compare plus les deux
    egal(r.tirages, 0, 'Effets : aucun tirage de Math.random');
    ok(r.sonne && r.bosse, 'Écrasé, sonné, dos qui luit'); ok(r.briques >= 8, 'Éclats de briques (' + r.briques + ')');
    ok(r.pause, 'En pause, les éclats ne bougent pas'); ok(r.vide, 'Plus aucun effet en quittant le robot');
  });

  test('Robot monstres, image : Grappin, traînée en plein saut, fissures et bave dans son cadre sur la vitre, morceaux au décrochage', () => {
    exiger(); reset({ mr2Vus:{ belier:true, grappin:true, mortier:true } });
    J(PREP);
    const r = J(function(){
      var o = {}, M2 = __mr2, F = __mfx.MFX, T = __mfxt; T.prep(5);
      var g = spawnZombie('grappin'); g.g.position.set(1, 0, MECH_CAM.z - 16);
      var i, trainee = 0;
      for (i = 0; i < 240 && g.mr !== 'accroche'; i++){ T.pas(1); if (g.mr === 'saut') trainee = Math.max(trainee, F.lueur.vivants); }
      o.trainee = trainee; o.accroche = g.mr === 'accroche';
      T.pas(30);
      o.fissures = !!F.fissures && F.fissures.parent === M2.mr2Vitre && M2.mr2Vitre.visible; o.echelle = F.fissures ? F.fissures.scale.x : 0;
      // Cadre : fissures et bave restent dans la boîte du Grappin de la vitre (même place et même taille : il ne cache pas plus d'écran)
      var cadre = new THREE.Box3(), b = new THREE.Box3(), dedans = true;
      [M2.mr2VitreM, M2.mr2Gueule].forEach(function(m){ m.geometry.computeBoundingBox(); b.copy(m.geometry.boundingBox); b.min.add(m.position); b.max.add(m.position); cadre.union(b); });
      [F.fissures, F.bave].forEach(function(m){ m.geometry.computeBoundingBox(); b.copy(m.geometry.boundingBox); b.min.add(m.position); b.max.add(m.position);
        if (b.min.x < cadre.min.x - 1e-6 || b.max.x > cadre.max.x + 1e-6 || b.min.y < cadre.min.y - 1e-6 || b.max.y > cadre.max.y + 1e-6) dedans = false; });
      o.dedans = dedans; o.cadre = [cadre.min.x, cadre.min.y, cadre.max.x, cadre.max.y].map(function(v){ return v.toFixed(2); }).join(',');
      o.vitreEgal = JSON.stringify(M2.MR2_VITRE) === JSON.stringify({ ordi:{ f:.45, y:-.15, l:.26 }, couche:{ f:.3, y:-.17, l:.2 }, vertical:{ f:.56, y:0, l:.38 }, larg:.92, dist:.93 });
      M2.mr2Decrocher(g, true); __mfx.mfxMonstre('decroche', g); T.pas(2);
      o.debris = F.debris.vivants; o.vitre = M2.mr2Vitre.visible;
      T.pas(60); o.debrisFin = F.debris.vivants;
      mechQuit();
      return o;
    });
    fin();
    ok(r.trainee > 0, 'Traînée qui luit pendant le saut (' + r.trainee + ')'); ok(r.accroche, 'Accroché à la vitre');
    ok(r.fissures && r.echelle > .5, 'Fissures sur la vitre (enfants du Grappin de la vitre)');
    ok(r.dedans, 'Fissures et bave dans le cadre du Grappin (' + r.cadre + ')'); ok(r.vitreEgal, 'MR2_VITRE inchangé');
    ok(r.debris > 0 && !r.vitre, 'Décroché : des morceaux glissent sur la vitre (' + r.debris + ')'); egal(r.debrisFin, 0, 'Les morceaux disparaissent');
  });

  test('Robot monstres, image : Mortier, gorge qui s’allume, traînée, anneau qui finit exactement sur le cercle, acide à l’impact', () => {
    exiger(); reset({ mr2Vus:{ belier:true, grappin:true, mortier:true } });
    J(PREP);
    const r = J(function(){
      var o = {}, M2 = __mr2, F = __mfx.MFX, T = __mfxt; T.prep(6);
      var m = spawnZombie('mortier'); m.g.position.set(-2, 0, MECH_CAM.z - 62); m.mrPlante = 61; m.mrCd = 3;
      var i, gorge = false;
      for (i = 0; i < 900 && M2.MR2_OBUS.every(function(x){ return !x.actif; }); i++){ T.pas(1); if (m.rig.gorge && m.rig.gorge.feu.visible) gorge = true; }
      o.gorge = gorge;
      var ob = M2.MR2_OBUS.filter(function(x){ return x.actif; })[0], k = M2.MR2_OBUS.indexOf(ob), A = F.anneaux[k];
      T.pas(2); o.feuApres = m.rig.gorge ? m.rig.gorge.feu.visible : null;
      o.depart = A.visible ? A.scale.x / ob.r : 0; o.r = ob.r; o.rRegl = M2.mr2Rgl(M2.MR2_MOR, 'rayon');
      T.pas(20); o.trainee = F.lueur.vivants; o.fumee = F.nuage.vivants;
      // Fin du vol : l'anneau est exactement sur le cercle (le rayon réel des dégâts)
      var t0 = ob.t; ob.t = ob.T; __mfx.mfxImage(0); o.fin = A.scale.x; o.cercle = ob.c.scale.x; ob.t = t0;
      var i0 = M2.MR2.impacts;
      for (i = 0; i < 200 && M2.MR2.impacts === i0; i++) T.pas(1);
      o.flaque = F.flaques.some(function(f){ return f.m.visible; }); o.gouttes = F.solide.vivants; o.anneau = A.visible;
      T.pas(80); o.flaqueFin = F.flaques.some(function(f){ return f.m.visible; });
      mechQuit(); visuals(1 / 30);
      o.vide = F.anneaux.every(function(a){ return !a.visible; }) && F.flaques.every(function(f){ return !f.m.visible; });
      return o;
    });
    fin();
    ok(r.gorge, 'La gorge s’allume avant le tir'); egal(r.feuApres, false, 'Puis s’éteint');
    ok(Math.abs(r.depart - 1.7) < .1, 'Anneau à 1,7 × le rayon au départ du vol (' + r.depart.toFixed(2) + ')');
    egal(r.r, r.rRegl, 'Rayon de l’obus inchangé (réglage du jeu)');
    ok(Math.abs(r.fin - r.r) < 1e-9 && Math.abs(r.cercle - r.r) < 1e-9, 'À l’impact, l’anneau a exactement le rayon du cercle (' + r.fin + ' et ' + r.cercle + ')');
    ok(r.trainee > 0 && r.fumee > 0, 'Traînée de l’obus : lueur (' + r.trainee + ') et fumée (' + r.fumee + ')');
    ok(r.flaque && r.gouttes > 0 && !r.anneau, 'Impact : flaque et gouttes d’acide, anneau retiré'); ok(!r.flaqueFin, 'La flaque s’efface');
    ok(r.vide, 'Rien ne reste en quittant le robot');
  });

  test('Robot monstres, image : couronne du Titan roi seulement, rien de créé pendant la partie', () => {
    exiger(); reset({ mr2Vus:{ belier:true, grappin:true, mortier:true } });
    J(PREP);
    const r = J(function(){
      var o = {}, T = __mfxt; T.prep(9);
      var t1 = spawnZombie('titan'); t1.g.position.set(-6, 0, MECH_CAM.z - 60);
      var roi = mechFinBoss(); T.pas(2);
      var c1 = t1.g.userData.couronne, c2 = roi.g.userData.couronne;
      o.titan = !!c1 && c1.every(function(m){ return !m.visible; }); o.roi = !!c2 && c2.every(function(m){ return m.visible; });
      // Les réserves d'effets ne grandissent jamais : même nombre d'objets dans la scène après beaucoup d'effets
      var n0 = scene.children.length, v0 = vmCam.children.length;
      for (var i = 0; i < 400; i++){ __mfx.mfxImpact({ x:0, z:MECH_CAM.z - 10, r:3 }); }
      T.pas(3);
      o.scene = scene.children.length - n0; o.vm = vmCam.children.length - v0;
      o.plein = __mfx.MFX.solide.vivants <= __mfx.MFX_REGL.solide && __mfx.MFX.lueur.vivants <= __mfx.MFX_REGL.lueur;
      mechQuit();
      return o;
    });
    fin();
    ok(r.titan, 'Titan des rues : pas de couronne'); ok(r.roi, 'Titan roi : couronne qui luit');
    egal(r.scene, 0, 'Aucun objet ajouté à la scène'); egal(r.vm, 0, 'Aucun objet ajouté à l’habitacle'); ok(r.plein, 'Réserves de taille fixe');
  });
})();
