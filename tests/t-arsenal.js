'use strict';
/* Tests de l'arsenal (js/34-arsenal.js) : 5 armes lourdes et accessoires physiques */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __ars === "object" && typeof __ars.accBuy === "function"') !== true) ignorer('Arsenal absent (js/34-arsenal.js)'); };
  const NOUV = ['mg50', 'laser', 'railgun', 'gl', 'arc'];
  function partie(){
    reset(); J('startLocation(0)');
    J(function(){ __t.geler(); clearZombies(); S.money = 1e7; WORDER.forEach(function(id){ S.owned[id] = true; S.ammo[id] = magSize(id); }); });
  }
  // Pointe la caméra au ras de la rue, vers le fond, et tire une fois avec l'arme demandée
  const TIR = function(id){ equip(id); camera.position.set(0, 1.3, -6); camera.lookAt(0, 1.3, -60); camera.updateMatrixWorld(true); zoomed = false; recoilAcc = 0; reloadT = 0; cool = 0; spin = 1; S.ammo[id] = magSize(id); return fire(); };

  test('Arsenal : 5 nouvelles armes, plus chères et plus fortes que le lance-roquettes, avec modèle et son', () => {
    exiger();
    const r = J(function(n){
      var R = WEAPONS.rocket, o = {};
      n.forEach(function(id){ var W = WEAPONS[id]; o[id] = { rang: WORDER.indexOf(id), prix: W && W.price, nom: W && W.name, vm: !!VMS[id], son: !!Snd.GUNS[id], upg: W && W.upg && W.upg.length,
        dps: W ? W.dmg * W.rate * Math.max(1, Math.min(W.pierce, 3)) * (W.radius ? 3 : 1) * (W.chain ? 2 : 1) : 0 }; });
      return { o: o, prixR: R.price, dpsR: R.dmg * R.rate * 3, rangR: WORDER.indexOf('rocket') };
    }, NOUV);
    NOUV.forEach(id => {
      const w = r.o[id];
      ok(w.rang > r.rangR, id + ' : après le lance-roquettes dans la boutique');
      ok(w.prix > r.prixR, id + ' : prix ' + w.prix);
      ok(!!w.nom && w.vm && w.son, id + ' : nom, modèle ou son manquant');
      egal(w.upg, 4, id + ' : 4 améliorations');
      ok(w.dps > r.dpsR * .9, id + ' : plus forte que le lance-roquettes (' + Math.round(w.dps) + ' contre ' + Math.round(r.dpsR) + ')');
    });
  });

  test('Arsenal : laser et canon électromagnétique traversent toute la file, avec un rayon visible', () => {
    exiger(); partie();
    const r = J(function(tir){
      tir = eval('(' + tir + ')'); var o = {};
      ['laser', 'railgun'].forEach(function(id){
        clearZombies();
        var zs = [0, 1, 2, 3, 4, 5].map(function(i){ var z = __t.placer('walker', 0, -16 - i * 3); z.hp = z.maxHp = 1e6; z.speed = 0; z.g.updateMatrixWorld(true); return z; });
        var b0 = __ars.beams; tir(id);
        o[id] = { touches: zs.filter(function(z){ return z.hp < 1e6; }).length, rayon: __ars.beams - b0 };
      });
      return o;
    }, TIR.toString());
    ['laser', 'railgun'].forEach(id => { egal(r[id].touches, 6, id + ' : zombies traversés'); egal(r[id].rayon, 1, id + ' : rayon'); });
  });

  test('Arsenal : la .50 traverse 3 zombies, l’arc saute sur les voisins, les grenades explosent', () => {
    exiger(); partie();
    const r = J(function(tir){
      tir = eval('(' + tir + ')'); var o = {};
      clearZombies();
      var zs = [0, 1, 2, 3, 4].map(function(i){ var z = __t.placer('walker', 0, -16 - i * 3); z.hp = z.maxHp = 1e6; z.speed = 0; z.g.updateMatrixWorld(true); return z; });
      tir('mg50'); o.mg = zs.filter(function(z){ return z.hp < 1e6; }).length;
      clearZombies();
      var a = [[0, -25], [2, -27], [-2, -28], [3, -31], [-3, -22], [11, -60]].map(function(p){ var z = __t.placer('walker', p[0], p[1]); z.hp = z.maxHp = 1e6; z.speed = 0; z.g.updateMatrixWorld(true); return z; });
      var e0 = __ars.arcs; tir('arc');
      o.arc = a.slice(0, 5).filter(function(z){ return z.hp < 1e6; }).length; o.loin = a[5].hp < 1e6; o.eclairs = __ars.arcs - e0;
      clearZombies();
      var g = [[0, -25], [1.5, -26], [-1.5, -24]].map(function(p){ var z = __t.placer('walker', p[0], p[1]); z.hp = z.maxHp = 1e6; z.speed = 0; z.g.updateMatrixWorld(true); return z; });
      tir('gl'); __t.sim(1.5, 1 / 30);
      o.gl = g.filter(function(z){ return z.hp < 1e6; }).length;
      return o;
    }, TIR.toString());
    egal(r.mg, 3, '.50 : zombies traversés');
    ok(r.arc >= 4, 'Arc : zombies touchés dans le groupe (' + r.arc + ')');
    ok(!r.loin, 'Arc : un zombie à 30 m ne doit pas être touché');
    ok(r.eclairs >= 4, 'Arc : éclairs visibles (' + r.eclairs + ')');
    ok(r.gl >= 2, 'Grenade : zombies blessés par l’explosion (' + r.gl + ')');
  });

  test('Arsenal : accessoires achetés, effets sur l’arme, une seule optique, visibles sur le modèle', () => {
    exiger(); partie();
    const r = J(function(){
      var o = {}, sp0 = wSpread('rifle'), m0 = S.money, mag0 = magSize('rifle'), p0 = wPierce('rifle'), d0 = wDmg('rifle'), rl0 = wReload('rifle');
      var tris0 = vmStats('rifle').tris;
      o.dot = __ars.accBuy('rifle', 'reddot'); o.cout = m0 - S.money; o.sp = wSpread('rifle') / sp0; o.zoom = accK('rifle', 'zoom');
      o.scope = __ars.accBuy('rifle', 'scope'); o.optiques = ['reddot', 'scope'].filter(function(k){ return __ars.accOwned('rifle', k); });
      o.deux = __ars.accBuy('rifle', 'scope');
      o.bipodFusil = __ars.accBuy('rifle', 'bipod');
      ['laserp', 'drum', 'grip', 'barrel'].forEach(function(k){ __ars.accBuy('rifle', k); });
      o.mag = magSize('rifle') / mag0; o.pierce = wPierce('rifle') - p0; o.dmg = wDmg('rifle') / d0; o.reload = wReload('rifle') / rl0;
      equip('rifle'); var st = vmStats('rifle'); o.tris = st.tris - tris0; o.appels = st.calls;
      o.pasCompat = __ars.accBuy('pistol', 'scope');
      o.muz = VMS.rifle.userData.muzzle < VMS.rifle.userData.muzzleBase;
      var ft = flash.position.z; o.flash = Math.abs(ft - VMS.rifle.userData.muzzle) < 1e-9;
      S.money = 0; o.pauvre = __ars.accBuy('shotgun', 'grip');
      newGame(); o.apres = { acc: Object.keys(S.acc || {}).length, mesh: !!VMS.rifle.userData.accMesh, muz: VMS.rifle.userData.muzzle === VMS.rifle.userData.muzzleBase };
      return o;
    });
    ok(r.dot, 'Achat du point rouge'); ok(r.cout > 0, 'Le point rouge doit coûter de l’argent');
    ok(Math.abs(r.sp - .65) < 1e-9, 'Point rouge : dispersion ×' + r.sp);
    ok(r.zoom < 1, 'Point rouge : zoom plus fort');
    ok(r.scope, 'Achat de la lunette'); egal(r.optiques.join(','), 'scope', 'Une seule optique à la fois');
    ok(!r.deux, 'Un accessoire déjà monté ne se rachète pas');
    ok(Math.abs(r.mag - 1.5) < .05, 'Tambour : chargeur ×' + r.mag);
    egal(r.pierce, 1, 'Canon long : perforation +1');
    ok(r.dmg > 1.25, 'Lunette et canon long : dégâts ×' + r.dmg.toFixed(2));
    ok(Math.abs(r.reload - .85) < 1e-9, 'Poignée : recharge ×' + r.reload);
    ok(r.tris > 100, 'Accessoires visibles sur le modèle (' + r.tris + ' triangles de plus)');
    ok(r.appels <= 7, 'Appels de dessin avec accessoires : ' + r.appels);
    ok(!r.pasCompat, 'Lunette refusée sur le pistolet');
    ok(!r.bipodFusil, 'Pas de trépied sur le fusil d’assaut');
    ok(r.muz && r.flash, 'Canon long : l’éclair part du bout du nouveau canon');
    ok(!r.pauvre, 'Achat refusé sans argent');
    ok(!r.apres.acc && !r.apres.mesh && r.apres.muz, 'Nouvelle partie : accessoires enlevés ' + JSON.stringify(r.apres));
  });

  test('Arsenal : le trépied réduit le recul, la boutique montre les accessoires de l’arme choisie', () => {
    exiger(); partie();
    const r = J(function(){
      equip('mg50'); camera.position.copy(EYE); recoilAcc = 0; reloadT = 0; cool = 0; fire(); var sans = recoilAcc;
      __ars.accBuy('mg50', 'bipod'); recoilAcc = 0; cool = 0; fire(); var avec = recoilAcc;
      state = 'shop'; shopWSel = 'mg50'; renderShop();
      var btns = Array.prototype.slice.call(document.querySelectorAll('#shopUpg button[data-act="acc"]'));
      var o = { sans: sans, avec: avec, n: btns.length, monte: btns.some(function(b){ return b.dataset.k === 'bipod' && b.disabled; }) };
      var grip = btns.filter(function(b){ return b.dataset.k === 'barrel'; })[0], m0 = S.money;
      if (grip) grip.click();
      o.clic = __ars.accOwned('mg50', 'barrel') && S.money < m0;
      state = 'test';
      return o;
    });
    ok(r.avec < r.sans * .6, 'Recul avec trépied : ' + r.avec + ' contre ' + r.sans);
    egal(r.n, 6, 'Accessoires de la .50 dans la boutique (point rouge, lunette, trépied, canon long, caisse double, bande perforante)');
    ok(r.monte, 'Le trépied acheté est marqué « Monté »');
    ok(r.clic, 'Un clic dans la boutique achète l’accessoire');
  });

  test('Arsenal : chaque accessoire seulement là où il sert dans la vraie vie', () => {
    exiger();
    const r = J(function(){ var o = {}; __ars.ACC_ORDER.forEach(function(k){ o[k] = __ars.ACC[k].on.slice(); }); o.nomSniper = __ars.accName('bipod', 'sniper'); o.nomMg = __ars.accName('bipod', 'mg50'); return o; });
    const jamais = {
      bipod: ['pistol', 'shotgun', 'rifle', 'crossbow', 'flamer', 'rocket', 'laser', 'arc', 'gl'],   // armes légères ou portées à l'épaule
      scope: ['pistol', 'shotgun', 'flamer', 'minigun', 'rocket', 'gl', 'arc', 'sniper'],           // pas de lunette sur une arme de près (le sniper a la sienne)
      reddot: ['flamer', 'sniper'],
      drum: ['mg50', 'minigun', 'laser', 'arc', 'gl', 'flamer', 'rocket', 'crossbow', 'railgun', 'sniper'], // bande, batterie, barillet, réservoir
      laserp: ['flamer', 'minigun', 'mg50', 'railgun', 'rocket'],
      grip: ['pistol', 'minigun', 'mg50', 'rocket', 'flamer'],
      barrel: ['flamer', 'rocket', 'gl', 'laser', 'arc', 'railgun', 'crossbow', 'minigun']
    };
    Object.keys(jamais).forEach(k => jamais[k].forEach(id => ok(r[k].indexOf(id) < 0, k + ' ne devrait pas aller sur ' + id)));
    egal(r.nomSniper, 'Bipied', 'Nom sur le sniper'); egal(r.nomMg, 'Trépied', 'Nom sur la .50');
    ['ftank', 'fwide', 'flong', 'fnapalm', 'fpump'].forEach(k => egal((r[k] || []).join(','), 'flamer', k + ' : seulement sur le lance-flammes'));
    ['rtandem', 'rfrag', 'rboost', 'rtwin', 'rguide'].forEach(k => egal((r[k] || []).join(','), 'rocket', k + ' : seulement sur le lance-roquettes'));
    ['reddot', 'scope', 'bipod', 'laserp', 'drum', 'grip', 'barrel'].forEach(k => ok(r[k].indexOf('flamer') < 0, k + ' ne va pas sur le lance-flammes'));
  });

  test('Arsenal : les grosses armes secouent l’écran, plus que les petites', () => {
    exiger(); partie();
    const r = J(function(){
      var o = {};
      ['pistol', 'rifle', 'minigun', 'mg50', 'gl', 'rocket', 'railgun'].forEach(function(id){
        equip(id); camera.position.copy(EYE); spin = 1; reloadT = 0; cool = 0; zoomed = false; shake = 0; S.ammo[id] = magSize(id); fire(); o[id] = shake;
      });
      equip('mg50'); __ars.accBuy('mg50', 'bipod'); shake = 0; cool = 0; fire(); o.trepied = shake;
      return o;
    });
    ok(r.pistol < .1 && r.rifle < .1, 'Petites armes : presque pas de secousse (' + r.pistol + ', ' + r.rifle + ')');
    ['minigun', 'mg50', 'gl', 'rocket', 'railgun'].forEach(id => ok(r[id] >= .25, id + ' : secousse ' + r[id]));
    ok(r.railgun > r.mg50 && r.rocket > r.minigun, 'Plus l’arme est grosse, plus ça secoue');
    ok(r.trepied < r.mg50, 'Le trépied calme la secousse');
  });

  test('Arsenal : accessoires du lance-flammes (réservoir, buses, napalm, pompe) avec leurs effets', () => {
    exiger(); partie();
    const r = J(function(){
      var o = {}, id = 'flamer', W = WEAPONS[id];
      var mag0 = magSize(id), b0 = wBurn(id), bd0 = wBurnDps(id), d0 = wDmg(id), tris0 = vmStats(id).tris;
      ['ftank', 'fnapalm', 'fpump'].forEach(function(k){ o[k] = __ars.accBuy(id, k); });
      o.mag = magSize(id) / mag0; o.burn = wBurn(id) / b0; o.bdps = wBurnDps(id) / bd0; o.dmg = wDmg(id) / d0;
      o.large = __ars.accBuy(id, 'fwide'); o.cone = accK(id, 'cone'); o.rangeL = accK(id, 'range');
      o.longue = __ars.accBuy(id, 'flong'); o.buses = ['fwide', 'flong'].filter(function(k){ return __ars.accOwned(id, k); }).join(',');
      o.range = accK(id, 'range');
      equip(id); var st = vmStats(id); o.tris = st.tris - tris0; o.appels = st.calls; o.muz = VMS[id].userData.muzzle < VMS[id].userData.muzzleBase;
      // Buse longue : un zombie à 36 m de la barricade (hors de portée normale, 30 m) est touché
      clearZombies(); var z = __t.placer('walker', 0, BAR_Z - 36); z.hp = z.maxHp = 1e6; z.speed = 0; z.g.updateMatrixWorld(true);
      camera.position.copy(EYE); camera.lookAt(0, 1, BAR_Z - 36); camera.updateMatrixWorld(true);
      reloadT = 0; cool = 0; S.ammo[id] = magSize(id); fire(); o.loin = z.hp < 1e6;
      return o;
    });
    ok(r.ftank && r.fnapalm && r.fpump, 'Achats');
    ok(Math.abs(r.mag - 1.6) < .02, 'Réservoir dorsal : carburant ×' + r.mag);
    ok(Math.abs(r.burn - 1.5) < 1e-9 && Math.abs(r.bdps - 1.3) < 1e-9, 'Napalm : brûlure ×' + r.burn + ', dégâts de brûlure ×' + r.bdps);
    ok(Math.abs(r.dmg - 1.2) < 1e-9, 'Pompe : dégâts ×' + r.dmg);
    ok(r.large && Math.abs(r.cone - 1.4) < 1e-9 && r.rangeL < 1, 'Buse large : cône ×' + r.cone + ', portée ×' + r.rangeL);
    ok(r.longue, 'Achat de la buse longue'); egal(r.buses, 'flong', 'Une seule buse à la fois');
    ok(Math.abs(r.range - 1.4) < 1e-9, 'Buse longue : portée ×' + r.range);
    ok(r.tris > 100 && r.appels <= 7 && r.muz, 'Accessoires visibles sur le lance-flammes (' + r.tris + ' triangles, ' + r.appels + ' appels)');
    ok(r.loin, 'Buse longue : un zombie à 36 m doit brûler');
  });

  test('Arsenal : accessoires du lance-roquettes (ogives, propulseur, tube jumelé, guidage)', () => {
    exiger(); partie();
    const r = J(function(){
      var o = {}, id = 'rocket', d0 = wDmg(id), r0 = wRadius(id), m0 = magSize(id), tris0 = vmStats(id).tris;
      o.tandem = __ars.accBuy(id, 'rtandem'); o.dmgT = wDmg(id) / d0;
      o.frag = __ars.accBuy(id, 'rfrag'); o.ogives = ['rtandem', 'rfrag'].filter(function(k){ return __ars.accOwned(id, k); }).join(',');
      o.rad = wRadius(id) / r0; o.dmgF = wDmg(id) / d0;
      __ars.accBuy(id, 'rtwin'); o.mag = magSize(id) - m0;
      __ars.accBuy(id, 'rboost'); __ars.accBuy(id, 'rguide');
      equip(id); var st = vmStats(id); o.tris = st.tris - tris0; o.appels = st.calls;
      // Vitesse au départ et guidage : un zombie à 5 m à droite de la ligne de tir doit être atteint
      clearZombies(); var z = __t.placer('walker', 5, -40); z.hp = z.maxHp = 1e7; z.speed = 0; z.g.updateMatrixWorld(true);
      camera.position.set(0, 1.3, -6); camera.lookAt(0, 1.3, -60); camera.updateMatrixWorld(true);
      reloadT = 0; cool = 0; S.ammo[id] = magSize(id); var g0 = __ars.guided;
      fire();
      var rk = __armes.ARM.rockets.filter(function(x){ return x.m.visible; })[0]; o.vit = rk ? rk.v.length() : 0;
      __t.sim(3, 1 / 30, function(){ return !__armes.ARM.rockets.some(function(x){ return x.m.visible; }); });
      o.touche = z.hp < 1e7; o.guide = __ars.guided - g0;
      return o;
    });
    ok(r.tandem && Math.abs(r.dmgT - 1.35) < 1e-9, 'Ogive tandem : dégâts ×' + r.dmgT);
    egal(r.ogives, 'rfrag', 'Une seule ogive à la fois');
    ok(Math.abs(r.rad - 1.35) < 1e-9 && Math.abs(r.dmgF - .9) < 1e-9, 'Fragmentation : rayon ×' + r.rad + ', dégâts ×' + r.dmgF);
    egal(r.mag, 1, 'Tube jumelé : une roquette de plus');
    ok(r.tris > 100 && r.appels <= 7, 'Accessoires visibles (' + r.tris + ' triangles, ' + r.appels + ' appels)');
    ok(Math.abs(r.vit - 42 * 1.7) < .5, 'Propulseur : vitesse ' + r.vit);
    ok(r.guide > 0, 'Le guidage doit corriger la trajectoire');
    ok(r.touche, 'La roquette guidée doit atteindre le zombie décalé');
  });

  test('Arsenal : les armes à balles éjectent leurs douilles vers la droite, en rafale pour la minigun', () => {
    exiger(); partie();
    const r = J(function(){
      var o = { types: {} };
      ['pistol', 'rifle', 'minigun', 'mg50', 'gl', 'railgun'].forEach(function(id){
        equip(id); vmAnim(1 / 60); vmShellClear();
        var n0 = vmShells.next; vmShot(); vmAnim(1 / 60);
        var s = vmShells.list[n0]; o.types[id] = { t: s.t, vx: s.v.x, vie: s.life > 0 };
      });
      equip('minigun'); vmShellClear();
      for (var i = 0; i < 20; i++){ vmShot(); vmAnim(1 / 20); }
      o.rafale = vmShells.list.filter(function(s){ return s.life > 0; }).length; o.cap = vmShells.mesh.count;
      return o;
    });
    Object.keys(r.types).forEach(id => { ok(r.types[id].vie, id + ' : pas de douille'); ok(r.types[id].vx > .3, id + ' : douille pas vers la droite (' + r.types[id].vx + ')'); });
    egal(r.types.mg50.t, 5, '.50 : grosse douille'); egal(r.types.gl.t, 6, 'Douille de grenade'); egal(r.types.railgun.t, 7, 'Sabot du canon');
    ok(r.rafale >= 15, 'Minigun : douilles en l’air pendant une seconde de rafale : ' + r.rafale);
    ok(r.cap >= 40, 'Capacité du pool : ' + r.cap);
  });
})();
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  test('Arsenal : avec une optique, les mires de la .50 se rabattent et la poignée est hors de la ligne de visée', () => {
    if (lire('typeof __ars === "object"') !== true) ignorer('Arsenal absent');
    reset(); J('startLocation(0)');
    const r = J(function(){
      __t.geler(); S.money = 1e7; S.owned.mg50 = true; S.acc = {}; __ars.accSync('mg50'); equip('mg50');
      var ud = VMS.mg50.userData, o = { avant: ud.irons && ud.irons.visible };
      __ars.accBuy('mg50', 'reddot'); o.dot = ud.irons.visible;
      __ars.accBuy('mg50', 'scope'); o.scope = ud.irons.visible;
      // Rien de l'arme ne coupe la ligne de visée entre l'œil et l'optique (rayon le long de l'axe de visée)
      VMS.mg50.updateMatrixWorld(true);
      var a = new THREE.Vector3(0, ud.sightY, .2).applyMatrix4(VMS.mg50.matrixWorld), b = new THREE.Vector3(0, ud.sightY, -.18).applyMatrix4(VMS.mg50.matrixWorld);
      var rc = new THREE.Raycaster(a, b.clone().sub(a).normalize(), 0, a.distanceTo(b));
      var hits = rc.intersectObjects(VMS.mg50.children.filter(function(m){ return m.isMesh && m.visible && m !== ud.accMesh; }), false);
      o.bloque = hits.length;
      S.acc = {}; __ars.accSync('mg50'); o.apres = ud.irons.visible;
      return o;
    });
    ok(r.avant, 'Mires visibles sans optique');
    ok(!r.dot && !r.scope, 'Mires rabattues avec le point rouge ou la lunette');
    egal(r.bloque, 0, 'Pièces qui cachent l’optique');
    ok(r.apres, 'Mires remises sans optique');
  });
})();

(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  test('Arsenal : chaque arme a au moins 2 accessoires à elle, visibles, avec leurs effets', () => {
    if (lire('typeof __ars === "object"') !== true) ignorer('Arsenal absent');
    reset(); J('startLocation(0)');
    const r = J(function(){
      __t.geler(); S.money = 1e12; WORDER.forEach(function(id){ S.owned[id] = true; S.ammo[id] = magSize(id); });
      var o = { propres: {}, vis: {}, err: [] };
      WORDER.forEach(function(id){
        var mine = __ars.ACC_ORDER.filter(function(k){ var on = __ars.ACC[k].on; return on.length <= 2 && on.indexOf(id) >= 0; });
        o.propres[id] = mine.length;
        S.acc = {}; __ars.accSync(id); equip(id); var t0 = vmStats(id).tris;
        mine.forEach(function(k){ if (!__ars.accBuy(id, k)) o.err.push(id + ':' + k); });
        var st = vmStats(id); o.vis[id] = { plus: st.tris - t0, appels: st.calls };
      });
      // Effets
      S.acc = {}; var r0 = wRate('pistol'); __ars.accBuy('pistol', 'pburst'); o.rafale = wRate('pistol') / r0;
      var s0 = wSpin('minigun'); __ars.accBuy('minigun', 'mmotor'); o.moteur = wSpin('minigun') / s0;
      o.chaine = WEAPONS.arc.chain + __ars.accAdd('arc', 'arcoil') ;
      S.acc = {}; __ars.accBuy('arc', 'arcoil'); o.chaine = __ars.accAdd('arc', 'chain');
      __ars.accBuy('rifle', 'barrel'); __ars.accBuy('rifle', 'rsupp'); o.bouche = ['barrel', 'rsupp'].filter(function(k){ return __ars.accOwned('rifle', k); }).join(',');
      return o;
    });
    egal(r.err.join(', '), '', 'Achats refusés');
    Object.keys(r.propres).forEach(id => ok(r.propres[id] >= 2, id + ' : ' + r.propres[id] + ' accessoires propres'));
    Object.keys(r.vis).forEach(id => { ok(r.vis[id].plus > 60, id + ' : accessoires pas visibles (' + r.vis[id].plus + ' triangles)'); ok(r.vis[id].appels <= 7, id + ' : ' + r.vis[id].appels + ' appels de dessin'); });
    ok(Math.abs(r.rafale - 1.4) < 1e-9, 'Kit rafale : cadence ×' + r.rafale);
    ok(Math.abs(r.moteur - .5) < 1e-9, 'Moteur renforcé : montée en régime ×' + r.moteur);
    egal(r.chaine, 2, 'Bobine Tesla : 2 sauts de plus');
    egal(r.bouche, 'rsupp', 'Un seul accessoire au bout du canon (silencieux ou canon long)');
  });
})();
