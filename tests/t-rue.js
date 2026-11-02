'use strict';
/* =====================================================================
   Tests de la vie de la rue (js/23-rue.js) : barils, caisses, civils
   À charger APRÈS tests.js dans tests/index.html :
     <script src="t-rue.js"></script>
   Réutilise test(), J(), lire(), ok(), egal(), reset(), ignorer() de tests.js.
   ===================================================================== */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __rue === "object" && typeof __rue.rueSpawnBarrel === "function"') !== true) ignorer('23-rue.js non chargé'); };
  // Partie à Saint-Clou, apparitions gelées, rue vide (ni barils ni caisses ni civil)
  function partie(profil){
    reset(profil || null); J('startLocation(0)');
    J(function(){ __t.geler(); clearZombies(); __rue.rueClear(); S.money = 1000; });
    egal(J('state'), 'playing', 'État de la partie');
  }
  // Fonction installée dans le jeu : pointe la caméra sur un maillage et tire une fois au pistolet
  const TIRER = function(m){
    m.updateMatrixWorld(true);
    var c = new THREE.Vector3(); m.getWorldPosition(c);
    camera.position.copy(EYE); camera.lookAt(c); camera.updateMatrixWorld(true);
    zoomed = false; recoilAcc = 0; reloadT = 0; S.ammo[S.cur] = magSize(S.cur);
    return fire();
  };

  test('Rue : un tir sur un baril l’explose, tue les zombies proches et pas les lointains', () => {
    exiger(); partie();
    const r = J(function(tirer){
      tirer = eval('(' + tirer + ')');
      var b = __rue.rueSpawnBarrel(0, -30);
      var a = __t.placer('walker', 1.8, -30), c = __t.placer('walker', -2, -32.5);
      var f = __t.placer('flyer', 1, -30); f.g.position.y = 6;
      var loin = __t.placer('walker', 0, -50), cote = __t.placer('walker', 11, -30);
      var dans = hitMeshes.indexOf(b.body) >= 0;
      var tir = tirer(b.body);
      __t.sim(.5);
      return { dans: dans, tir: tir, live: b.live, apres: hitMeshes.indexOf(b.body) >= 0, a: !!a.dead, c: !!c.dead, f: !!f.dead,
        loin: loin.hp === loin.maxHp && !loin.dead, cote: cote.hp === cote.maxHp && !cote.dead, feu: __rue.RUE.fires.some(function(o){ return o.g.visible; }) };
    }, TIRER.toString());
    ok(r.dans, 'Le baril n’est pas dans hitMeshes');
    ok(r.tir, 'fire() a refusé');
    ok(!r.live && !r.apres, 'Le baril n’a pas sauté (ou reste tirable)');
    ok(r.a && r.c, 'Zombies proches du baril pas tués');
    ok(r.f, 'Volant au-dessus du baril pas tué');
    ok(r.loin && r.cote, 'Zombie lointain touché par le baril');
    ok(r.feu, 'Pas de flammes après l’explosion');
  });

  test('Rue : réaction en chaîne et explosion de roquette ou de grenade proche', () => {
    exiger(); partie({ level: 5 });
    const r = J(function(){
      var b1 = __rue.rueSpawnBarrel(0, -40), b2 = __rue.rueSpawnBarrel(4, -40), b3 = __rue.rueSpawnBarrel(-8, -70);
      __rue.rueBarrelBlow(b1, true); __t.sim(.5);
      var chaine = !b2.live, reste = b3.live;
      __rue.rueNearBlast(-8, 0, -71, 4, true); __t.sim(.5);
      return { chaine: chaine, reste: reste, b3: b3.live };
    });
    ok(r.chaine, 'Le baril voisin n’a pas sauté');
    ok(r.reste, 'Un baril loin a sauté');
    ok(!r.b3, 'Une explosion proche ne fait pas sauter le baril');
  });

  test('Rue : la caisse touchée en tirant donne un bonus', () => {
    exiger(); partie();
    const r = J(function(tirer){
      tirer = eval('(' + tirer + ')');
      var out = {};
      __rue.RUE.force = 'cash';
      var c = __rue.rueSpawnCrate(0, 10, -28), m0 = S.money;
      out.dans = hitMeshes.indexOf(c.box) >= 0;
      tirer(c.box);
      out.cash = S.money - m0; out.live = c.live; out.last = __rue.RUE.last; out.apres = hitMeshes.indexOf(c.box) >= 0;
      // Réparation
      __rue.RUE.force = 'repair'; S.bar = 50;
      var c2 = __rue.rueSpawnCrate(2, 8, -25); tirer(c2.canopy);
      out.bar = S.bar; out.barMax = S.barMax;
      // Munitions
      __rue.RUE.force = 'ammo'; S.owned.shotgun = true; S.ammo.shotgun = 0;
      var c3 = __rue.rueSpawnCrate(-2, 9, -26); tirer(c3.box); out.sg = S.ammo.shotgun === magSize('shotgun');
      // Rage de tir : dégâts doublés et munitions infinies
      __rue.RUE.force = 'fury';
      var c4 = __rue.rueSpawnCrate(0, 9, -27); tirer(c4.box);
      out.fury = __rue.RUE.furyT;
      var z = __t.placer('walker', 0, -25); z.hp = z.maxHp = 1e6;
      tirer(z.meshes[0]);
      out.coup = 1e6 - z.hp; out.attendu = wDmg('pistol');
      for (var i = 0; i < 30; i++) tirer(z.meshes[0]);
      out.mun = S.ammo.pistol === magSize('pistol');
      __rue.RUE.force = null;
      return out;
    }, TIRER.toString());
    ok(r.dans, 'La caisse n’est pas dans hitMeshes');
    ok(!r.live && !r.apres, 'La caisse touchée reste en jeu');
    egal(r.last, 'cash', 'Bonus donné');
    ok(r.cash > 0, 'Pas d’argent gagné : ' + r.cash);
    ok(Math.abs(r.bar - (50 + r.barMax * .25)) < 1, 'Réparation : ' + r.bar + ' / ' + r.barMax);
    ok(r.sg, 'Munitions pas rechargées');
    ok(r.fury > 14, 'Rage de tir pas lancée : ' + r.fury);
    ok(Math.abs(r.coup - 2 * r.attendu) < 1, 'Dégâts de la rage : ' + r.coup + ' au lieu de ' + 2 * r.attendu);
    ok(r.mun, 'Munitions pas infinies pendant la rage');
  });

  test('Rue : la caisse descend en parachute puis disparaît si on la rate', () => {
    exiger(); partie();
    const r = J(function(){
      var c = __rue.rueSpawnCrate(0, 20, -30), y0 = c.y;
      __t.sim(2); var y1 = c.y;
      __t.sim(30); return { desc: y1 < y0 - 3, live: c.live, dans: hitMeshes.indexOf(c.box) >= 0 };
    });
    ok(r.desc, 'La caisse ne descend pas');
    ok(!r.live && !r.dans, 'La caisse reste après son temps au sol');
  });

  test('Rue : le civil qui arrive à la barricade donne le bonus', () => {
    exiger(); partie();
    const r = J(function(){
      var m0 = S.money, s0 = P.scrap || 0;
      var v = __rue.rueSpawnCiv(0, -30);
      var dans = hitMeshes.indexOf(v.meshes[0]) >= 0, pasZ = zombies.indexOf(v) < 0;
      __t.sim(6);
      return { dans: dans, pasZ: pasZ, st: v.st, cash: S.money - m0, scr: (P.scrap || 0) - s0, apres: hitMeshes.indexOf(v.meshes[0]) >= 0 };
    });
    ok(r.dans, 'Le civil n’est pas tirable');
    ok(r.pasZ, 'Le civil est dans le tableau zombies');
    egal(r.st, 'saved', 'État du civil');
    ok(r.cash > 0, 'Pas d’argent pour le survivant');
    ok(r.scr > 0, 'Pas de ferraille pour le survivant');
    ok(!r.apres, 'Le civil sauvé reste tirable');
  });

  test('Rue : le civil touché en tirant donne la pénalité', () => {
    exiger(); partie();
    const r = J(function(tirer){
      tirer = eval('(' + tirer + ')');
      var v = __rue.rueSpawnCiv(0, -30), m0 = S.money;
      tirer(v.meshes[0]);
      var pen = m0 - S.money, st = v.st;
      __t.sim(6);
      return { pen: pen, st: st, live: v.live, m: S.money, m0: m0 };
    }, TIRER.toString());
    egal(r.st, 'dead', 'Le civil touché n’est pas mort');
    ok(r.pen > 0, 'Pas de pénalité : ' + r.pen);
    ok(!r.live, 'Le civil mort reste affiché');
    ok(r.m < r.m0, 'Bonus donné quand même');
  });

  test('Rue : les zombies qui attrapent le civil le tuent (pas de bonus)', () => {
    exiger(); partie();
    const r = J(function(){
      var z = __t.placer('walker', 0, -26); z.hp = z.maxHp = 1e6; z.speed = 0;
      var v = __rue.rueSpawnCiv(0, -28), m0 = S.money;
      __t.sim(6);
      return { st: v.st, m: S.money - m0 };
    });
    egal(r.st, 'dead', 'Le civil agrippé n’est pas mort');
    egal(r.m, 0, 'Argent changé quand le civil meurt agrippé');
  });

  test('Rue : les défenses et les pouvoirs ne visent pas le civil', () => {
    exiger(); partie({ level: 5, scrap: 0 });
    if (lire('typeof defRebuild === "function" && typeof DEF_SLOTS === "object"') !== true) ignorer('17-defenses.js non chargé');
    const r = J(function(){
      var keep = P.slots;
      P.slots = [{ type:'turret', paid:250, lv:{ dmg:0, rate:0, range:0, spec:0 } }, { type:'mortar', paid:900, lv:{ dmg:0, rate:0, range:0, spec:0 } }, null, null].map(function(s){ return typeof defNormSlot === 'function' ? defNormSlot(s) : s; });
      defRebuild();
      var v = __rue.rueSpawnCiv(0, -45);
      var t = nearest(0, -20, 200);
      __t.sim(3);
      var vivant = v.st === 'run';
      // Mortier qui tombe sur le civil : les éclats des défenses ne le blessent pas
      splash(v.x, v.z, 4, 1e6);
      var vivant2 = v.st === 'run';
      // Grenade du joueur sur lui : il y passe (règle des explosions)
      var g = typeof __pouvoirs === 'object' ? __pouvoirs.powUse('grenade', { x: v.x, y: 0, z: v.z }) : false;
      if (g) __pouvoirs.step(3);
      var st = v.st;
      P.slots = keep; defRebuild();
      return { t: t, vivant: vivant, vivant2: vivant2, g: g, st: st };
    });
    ok(r.t === null, 'nearest() trouve une cible alors qu’il n’y a que le civil');
    ok(r.vivant, 'Le civil a été tué par les défenses');
    ok(r.vivant2, 'Les éclats du mortier ont tué le civil');
    if (r.g) egal(r.st, 'dead', 'La grenade du joueur n’a pas touché le civil');
  });

  test('Rue : tout est nettoyé au changement de ville et au retour à la carte', () => {
    exiger(); partie();
    const r = J(function(){
      function compte(){ return { b: __rue.vivants.barils, c: __rue.vivants.caisses, v: __rue.vivants.civil, h: __rue.dansHit(), vis: __rue.rueRoot.children.filter(function(o){ return o.visible && !o.isLight; }).length }; }
      __rue.rueWave(); __rue.rueSpawnCrate(0, 15, -30); __rue.rueSpawnCiv(0, -50);
      var avant = compte();
      startLocation(1); var ville = compte();
      if (state === 'shop') startWave();
      var vague = compte();
      __rue.rueSpawnCrate(0, 15, -30); __rue.rueSpawnCiv(0, -50);
      goMap(); var carte = compte();
      return { avant: avant, ville: ville, vague: vague, carte: carte };
    });
    ok(r.avant.b >= 3 && r.avant.c === 1 && r.avant.v && r.avant.h >= 3 + 2 + 6, 'Mise en place : ' + JSON.stringify(r.avant));
    ok(!r.ville.b && !r.ville.c && !r.ville.v && !r.ville.h && !r.ville.vis, 'Restes au changement de ville : ' + JSON.stringify(r.ville));
    ok(r.vague.b >= 3, 'Pas de barils à la vague suivante : ' + JSON.stringify(r.vague));
    ok(!r.carte.b && !r.carte.c && !r.carte.v && !r.carte.h && !r.carte.vis, 'Restes au retour à la carte : ' + JSON.stringify(r.carte));
  });
})();
