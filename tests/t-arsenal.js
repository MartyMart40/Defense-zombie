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
    egal(r.n, 4, 'Accessoires de la .50 dans la boutique (point rouge, lunette, trépied, canon long)');
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
    ok(Object.keys(r).every(k => typeof r[k] === 'string' || r[k].indexOf('flamer') < 0), 'Aucun accessoire sur le lance-flammes');
  });
})();
