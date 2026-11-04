'use strict';
/* Tests des nouvelles armes et des améliorations par arme (06-donnees.js, 08-tir.js, 10-boutique.js, 20-armes.js).
   À charger APRÈS tests.js dans tests/index.html :
   <script src="t-armes.js"></script>
   Utilise l'API de tests.js : test(), J(), lire(), ok(), egal(), ignorer(), reset(). */
(function(){
  if (typeof test !== 'function') return;
  const NOUVELLES = ['crossbow', 'flamer', 'minigun', 'rocket'];
  const pret = () => lire('typeof __armes === "object" && typeof WUPG === "object" && typeof wupgBuy === "function" && WORDER.length >= 8') === true;
  const exiger = () => { if (!pret()) ignorer('Nouvelles armes absentes (20-armes.js, WUPG ou wupgBuy introuvables)'); };
  // Partie lancée à Saint-Clou, sans apparitions, toutes les armes données
  function partie(){
    reset(); J('startLocation(0)'); J('__t.geler()');
    J(function(){ clearZombies(); WORDER.forEach(function(id){ S.owned[id] = true; S.ammo[id] = magSize(id); }); });
  }

  test('Armes : 4 nouvelles armes, prix croissants après le sniper', () => {
    exiger();
    const r = J(function(){ return { ordre: WORDER.slice(), prix: WORDER.map(function(id){ return WEAPONS[id].price; }), modeles: WORDER.filter(function(id){ return !!VMS[id]; }).length }; });
    NOUVELLES.forEach(id => ok(r.ordre.indexOf(id) >= 0, 'Arme absente de WORDER : ' + id));
    egal(r.modeles, r.ordre.length, 'Modèles 3D en main');
    const sniper = r.prix[r.ordre.indexOf('sniper')];
    NOUVELLES.forEach(id => ok(r.prix[r.ordre.indexOf(id)] > sniper, id + ' devrait coûter plus que le sniper'));
    for (let i = 1; i < r.prix.length; i++) ok(r.prix[i] >= r.prix[i - 1], 'Prix non croissants dans la boutique : ' + r.prix.join(', '));
  });

  test('Armes : achat de chaque nouvelle arme dans la boutique', () => {
    exiger();
    reset(); J('startLocation(0)'); J("state = 'shop'");
    const r = J(function(ids){
      S.money = 100000; renderShop();
      var res = { achats: {}, depense: 0 }, m0 = S.money;
      ids.forEach(function(id){
        var b = document.querySelector('#shopWeapons button[data-act="buy"][data-id="' + id + '"]');
        if (!b){ res.achats[id] = 'bouton absent'; return; }
        b.click(); res.achats[id] = !!S.owned[id] && S.cur === id && S.ammo[id] === magSize(id);
        res.depense += WEAPONS[id].price;
      });
      res.argent = m0 - S.money;
      // Racheter une arme possédée ne coûte rien
      var m1 = S.money; var b2 = document.querySelector('#shopWeapons button[data-act="buy"][data-id="rocket"]'); if (b2) b2.click(); res.rachat = m1 - S.money;
      return res;
    }, NOUVELLES);
    NOUVELLES.forEach(id => egal(r.achats[id], true, 'Achat de ' + id));
    egal(r.argent, r.depense, 'Argent dépensé');
    egal(r.rachat, 0, 'Une arme déjà possédée ne se rachète pas');
  });

  test('Armes : chaque arme tue un zombie', () => {
    exiger();
    partie();
    const r = J(function(){
      var res = {};
      WORDER.forEach(function(id){
        clearZombies(); equip(id);
        var z = __t.placer('walker', 0, -20), n = 0;
        while (!z.dead && n < 80){
          __t.viser(z, false); cool = 0; reloadT = 0; S.ammo[id] = magSize(id);
          if (WEAPONS[id].spin) __armes.setSpin(1);
          fire(); n++;
          __t.sim(.1, 1 / 30, function(){ return z.dead; });
        }
        res[id] = z.dead ? n : -1;
      });
      return res;
    });
    Object.keys(r).forEach(id => ok(r[id] > 0, 'Le zombie n’est pas mort avec : ' + id));
  });

  test('Armes : la roquette explose et touche plusieurs zombies, pas ceux au loin', () => {
    exiger();
    partie();
    const r = J(function(){
      equip('rocket');
      var g = [__t.placer('walker', -1.5, -25), __t.placer('walker', 0, -25), __t.placer('walker', 1.5, -25), __t.placer('brute', 0, -27)];
      var loin = __t.placer('walker', 0, -70);
      var hp = g.map(function(z){ return z.hp; }), hpLoin = loin.hp;
      __t.viser(g[1], false); cool = 0; fire();
      var vol = __armes.ARM.rockets.some(function(o){ return o.m.visible; });
      __t.sim(3, 1 / 30, function(){ return !__armes.ARM.rockets.some(function(o){ return o.m.visible; }); });
      return { vol: vol, touches: g.filter(function(z, i){ return z.dead || z.hp < hp[i]; }).length, morts: g.filter(function(z){ return z.dead; }).length,
        loin: loin.hp === hpLoin && !loin.dead, explosion: __armes.ARM.booms.some(function(b){ return b.m.visible; }) };
    });
    ok(r.vol, 'La roquette n’est pas un projectile visible');
    ok(r.explosion, 'Pas d’explosion visible');
    ok(r.touches >= 3, 'Zombies touchés par l’explosion : ' + r.touches + ' sur 4');
    ok(r.morts >= 2, 'Zombies tués par l’explosion : ' + r.morts);
    ok(r.loin, 'Un zombie à 45 m de l’explosion a été touché');
  });

  test('Armes : la roquette touche un volant en hauteur', () => {
    exiger();
    partie();
    const r = J(function(){ return __t.graine(11, function(){
      equip('rocket');
      var f = __t.placer('flyer', 0, -30); f.g.position.y = f.alt || 7; f.speed = 0; f.g.updateMatrixWorld(true);
      var y = f.g.position.y, hp = f.hp;
      __t.viser(f, false); cool = 0; var tir = fire();
      var dmin = 1e9, vis0 = __armes.ARM.rockets.filter(function(o){ return o.m.visible; }).length, pos = [];
      __t.sim(3, 1 / 30, function(){ __armes.ARM.rockets.forEach(function(o){ if (o.m.visible){ var d = o.m.position.distanceTo(f.g.position); if (d < dmin) dmin = d; } }); return !__armes.ARM.rockets.some(function(o){ return o.m.visible; }); });
      return { y: y, touche: f.dead || f.hp < hp, dbg: { tir: tir, vis0: vis0, dmin: dmin, fy: f.g.position.y, fz: f.g.position.z, st: f.st, state: state, amb: __amb.weather, nz: zombies.length, cam: camera.position.toArray().map(function(v){ return +v.toFixed(2); }), hits: hitMeshes.length, acc: JSON.stringify(S.acc || {}), cur: S.cur } };
    }); });
    ok(r.y > 3, 'Le volant devrait être en hauteur (y = ' + r.y + ')');
    ok(r.touche, 'Le volant n’a pas été touché par la roquette ' + JSON.stringify(r.dbg));
  });

  test('Armes : le carreau d’arbalète traverse plusieurs zombies', () => {
    exiger();
    partie();
    const r = J(function(){
      equip('crossbow'); ads = 1;
      var zs = [__t.placer('walker', 0, -18), __t.placer('walker', 0, -20), __t.placer('walker', 0, -22)];
      zs.forEach(function(z){ z.speed = 0; z.g.updateMatrixWorld(true); });
      camera.position.set(0, 1.3, -10); camera.lookAt(0, 1.3, -40); camera.updateMatrixWorld(true);
      cool = 0; var a0 = S.ammo.crossbow; fire();
      __t.sim(.5, 1 / 60);
      ads = 0;
      return { touches: zs.filter(function(z){ return z.dead || z.hp < z.maxHp; }).length, ammo: a0 - S.ammo.crossbow, perce: wPierce('crossbow') };
    });
    egal(r.ammo, 1, 'Carreaux utilisés');
    ok(r.perce >= 3, 'Perforation de base : ' + r.perce);
    egal(r.touches, 3, 'Zombies traversés par un seul carreau');
  });

  test('Armes : l’arbalète fait plus mal à la tête que les autres armes', () => {
    exiger();
    const r = J(function(){ return { x: WEAPONS.crossbow.headX || 1 }; });
    ok(r.x > 1, 'Bonus de tête de l’arbalète : ' + r.x);
  });

  test('Armes : le lance-flammes brûle et la brûlure continue puis s’arrête', () => {
    exiger();
    partie();
    const r = J(function(){
      equip('flamer');
      var z = __t.placer('brute', 0, -20); z.speed = 0;
      var loin = __t.placer('walker', 0, -60); loin.speed = 0;
      __t.viser(z, false); cool = 0;
      var h0 = z.hp; fire(); var h1 = z.hp, brule = z.burnT > 0, flammes = __armes.ARM.flames.some(function(f){ return f.m.visible; });
      firing = false; __t.sim(1, 1 / 30); var h2 = z.hp;
      __t.sim(6, 1 / 30); var h3 = z.hp, fin = !(z.burnT > 0);
      __t.sim(1, 1 / 30); var h4 = z.hp;
      // Trop loin : rien
      __t.viser(loin, false); cool = 0; var hl = loin.hp; fire();
      return { h0: h0, h1: h1, h2: h2, h3: h3, h4: h4, brule: brule, flammes: flammes, fin: fin, loin: loin.hp === hl };
    });
    ok(r.h1 < r.h0, 'Pas de dégâts directs');
    ok(r.brule, 'Le zombie ne brûle pas');
    ok(r.flammes, 'Pas de flammes visibles');
    ok(r.h2 < r.h1, 'La brûlure ne fait pas de dégâts après le tir (' + r.h1 + ' puis ' + r.h2 + ')');
    ok(r.fin, 'La brûlure ne s’arrête pas');
    egal(r.h4, r.h3, 'Vie après la fin de la brûlure');
    ok(r.loin, 'Le lance-flammes touche un zombie à 50 m de la barricade');
  });

  test('Armes : le minigun monte en régime avant de tirer', () => {
    exiger();
    partie();
    const r = J(function(){
      equip('minigun'); clearZombies(); cool = 0;
      var a0 = S.ammo.minigun; firing = true;
      __t.sim(.4, 1 / 30); var a1 = S.ammo.minigun, s1 = __armes.spin;
      __t.sim(1.5, 1 / 30); var a2 = S.ammo.minigun;
      firing = false;
      return { a0: a0, a1: a1, s1: s1, a2: a2, mag: magSize('minigun'), magPistol: magSize('pistol'), rel: wReload('minigun'), relPistol: wReload('pistol') };
    });
    egal(r.a1, r.a0, 'Balles tirées pendant la montée en régime');
    ok(r.s1 > 0 && r.s1 < 1, 'Montée en régime : ' + r.s1);
    ok(r.a0 - r.a2 > 15, 'Le minigun ne tire pas assez vite : ' + (r.a0 - r.a2) + ' balles en 1,5 s');
    ok(r.mag >= 5 * r.magPistol, 'Gros chargeur attendu : ' + r.mag);
    ok(r.rel > 2 * r.relPistol, 'Recharge longue attendue : ' + r.rel);
  });

  test('Armes : améliorations propres à chaque arme dans la boutique', () => {
    exiger();
    reset(); J('startLocation(0)'); J("state = 'shop'");
    const r = J(function(){
      WORDER.forEach(function(id){ S.owned[id] = true; S.ammo[id] = magSize(id); });
      S.money = 1e7; var res = { lignes: {}, avant: {}, apres: {} };
      WORDER.forEach(function(id){ res.lignes[id] = (WEAPONS[id].upg || []).length; });
      var stats = function(){ return { dmg: wDmg('pistol'), rate: wRate('pistol'), magR: magSize('rifle'), magRk: magSize('rocket'), rel: wReload('sniper'), pierce: wPierce('crossbow'), burn: wBurn('flamer'), spinT: wSpin('minigun'), rad: wRadius('rocket'), pel: wPellets('shotgun') }; };
      res.avant = stats();
      var clic = function(id, k){
        shopWSel = id; renderShop();
        var b = document.querySelector('#shopUpg button[data-act="wupg"][data-id="' + id + '"][data-k="' + k + '"]');
        if (!b) return 'absent';
        var m = S.money, c = wupgCost(id, k, wl(id, k)); b.click(); return m - S.money === c;
      };
      res.clics = [['pistol', 'dmg'], ['pistol', 'rate'], ['rifle', 'mag'], ['rocket', 'mag'], ['sniper', 'reload'], ['crossbow', 'pierce'], ['flamer', 'burn'], ['minigun', 'spin'], ['rocket', 'radius'], ['shotgun', 'pellets']].map(function(p){ return clic(p[0], p[1]); });
      res.apres = stats();
      // Sans plafond : 20 niveaux achetés, le bouton reste un prix, « niv. N » au lieu des pastilles
      S.money = 1e15; for (var i = 0; i < 20; i++) wupgBuy('pistol', 'dmg');
      res.niveauMax = wl('pistol', 'dmg'); res.max = 20;
      shopWSel = 'pistol'; renderShop();
      var bm = document.querySelector('#shopUpg button[data-act="wupg"][data-id="pistol"][data-k="dmg"]');
      res.btnMax = bm ? !bm.disabled && bm.textContent.trim() !== 'Max' : 'absent';
      res.niv = !!(bm && bm.closest('.row').querySelector('.inf-lv'));
      res.saut = wupgCost('pistol', 'dmg', 8) / wupgCost('pistol', 'dmg', 7) > wupgCost('pistol', 'dmg', 3) / wupgCost('pistol', 'dmg', 2);
      S.wupg.sniper = { reload: 12 }; res.rel12 = wReload('sniper'); S.wupg.sniper.reload = 4; res.rel4 = wReload('sniper');
      S.wupg.shotgun = { pellets: 12 }; res.pel12 = wPellets('shotgun'); res.dmgPel = wDmg('shotgun'); S.wupg.shotgun.pellets = 6; res.pel6 = wPellets('shotgun'); res.dmgPel6 = wDmg('shotgun');
      // Prix croissants
      res.prix = [0, 1, 2, 3].map(function(l){ return wupgCost('minigun', 'dmg', l); });
      // Nouvelle partie : tout repart à zéro
      newGame(); res.apresNouvelle = stats(); res.wupgVide = Object.keys(S.wupg || {}).length === 0;
      return res;
    });
    Object.keys(r.lignes).forEach(id => ok(r.lignes[id] >= 3 && r.lignes[id] <= 4, id + ' : ' + r.lignes[id] + ' lignes d’amélioration'));
    r.clics.forEach((c, i) => egal(c, true, 'Achat d’amélioration n° ' + (i + 1) + ' (bouton présent et prix payé)'));
    const a = r.avant, b = r.apres;
    ok(Math.abs(b.dmg / a.dmg - 1.15) < 1e-9, 'Dégâts du pistolet +15 % attendus, obtenu ×' + (b.dmg / a.dmg));
    ok(b.rate > a.rate, 'Cadence du pistolet'); ok(b.magR > a.magR, 'Chargeur du fusil d’assaut'); egal(b.magRk, a.magRk + 1, 'Roquettes par chargeur');
    ok(b.rel < a.rel, 'Recharge du sniper'); egal(b.pierce, a.pierce + 1, 'Perforation de l’arbalète');
    ok(b.burn > a.burn, 'Durée de brûlure'); ok(b.spinT < a.spinT, 'Montée en régime du minigun'); ok(b.rad > a.rad, 'Rayon d’explosion'); egal(b.pel, a.pel + 2, 'Plombs du fusil à pompe');
    ok(r.niveauMax >= r.max, 'Dégâts du pistolet : plus de plafond (niveau ' + r.niveauMax + ')');
    egal(r.btnMax, true, 'Le bouton reste un achat (pas de « Max »)');
    ok(r.niv, '« niv. N » affiché au-delà des pastilles');
    ok(r.saut, 'Le prix monte plus vite au-delà de l’ancien plafond');
    ok(r.rel12 < r.rel4 && r.rel12 > 0, 'Recharge : encore plus rapide au niveau 12 (' + r.rel12.toFixed(3) + ' contre ' + r.rel4.toFixed(3) + ')');
    egal(r.pel12, r.pel6, 'Plombs plafonnés à 6 niveaux (trop de rayons)'); ok(r.dmgPel > r.dmgPel6, 'Au-delà : dégâts en plus');
    for (let i = 1; i < r.prix.length; i++) ok(r.prix[i] > r.prix[i - 1], 'Prix des améliorations croissants : ' + r.prix.join(', '));
    const c = r.apresNouvelle;
    ok(r.wupgVide, 'Les améliorations des armes ne repartent pas à zéro');
    Object.keys(a).forEach(k => ok(Math.abs(c[k] - a[k]) < 1e-9, 'Après une nouvelle partie, ' + k + ' : ' + a[k] + ' attendu, obtenu ' + c[k]));
  });

  test('Armes : touches 1 à 8 et bouton Arme qui fait défiler les armes possédées', () => {
    exiger();
    partie();
    const r = J(function(){
      var res = {};
      S.owned = { pistol: true, flamer: true, rocket: true }; equip('pistol');
      var vus = []; for (var i = 0; i < 3; i++){ swapNext(1); vus.push(S.cur); }
      res.defile = vus.join(',');
      if (typeof KeyboardEvent === 'function'){
        S.owned.minigun = true;
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit' + (WORDER.indexOf('minigun') + 1) })); res.touche = S.cur;
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit' + (WORDER.indexOf('crossbow') + 1) })); res.nonPossede = S.cur;
      }
      res.aide = $('ctrlHelp').innerHTML;
      return res;
    });
    egal(r.defile, 'flamer,rocket,pistol', 'Défilement des armes possédées');
    if (r.touche !== undefined){ egal(r.touche, 'minigun', 'Touche du minigun'); egal(r.nonPossede, 'minigun', 'Touche d’une arme non achetée'); }
    ok(!/1 à 4/.test(r.aide), 'L’aide des contrôles parle encore de 1 à 4');
  });

  test('Armes : projectiles et flammes nettoyés au changement de ville', () => {
    exiger();
    partie();
    const r = J(function(){
      equip('rocket'); camera.position.copy(EYE); camera.lookAt(0, 30, -100); camera.updateMatrixWorld(true); cool = 0; fire();
      equip('crossbow'); cool = 0; fire();
      equip('flamer'); var z = __t.placer('brute', 0, -15); __t.viser(z, false); cool = 0; fire();
      var avant = __armes.actifs(), brule = z.burnT > 0;
      var pools = { b: __armes.ARM.bolts.length, r: __armes.ARM.rockets.length, f: __armes.ARM.flames.length };
      for (var i = 0; i < 300; i++){ cool = 0; S.ammo.flamer = 50; fire(); }
      var pools2 = { b: __armes.ARM.bolts.length, r: __armes.ARM.rockets.length, f: __armes.ARM.flames.length };
      startLocation(1);
      return { avant: avant, brule: brule, apres: __armes.actifs(), feux: __armes.ARM.burns.filter(function(s){ return s.visible; }).length, memePools: JSON.stringify(pools) === JSON.stringify(pools2) };
    });
    ok(r.avant >= 3, 'Projectiles et flammes actifs avant : ' + r.avant);
    ok(r.brule, 'Le zombie devrait brûler');
    egal(r.apres, 0, 'Projectiles et flammes encore visibles après le changement de ville');
    egal(r.feux, 0, 'Flammes de brûlure encore visibles');
    ok(r.memePools, 'Les pools ne doivent pas grandir');
  });

  test('Armes : le boss garde son armure contre les flammes et les roquettes', () => {
    exiger();
    if (lire('typeof __boss === "object" && typeof ZTYPES.boss === "object"') !== true) ignorer('Boss absent');
    partie();
    const r = J(function(){
      var b = __t.placer('boss', 0, -30); b.hp = b.maxHp = 1e6; b.speed = 0;
      var h = b.hp; armExplode(b.g.position.clone().setY(1), 'rocket'); var perte = h - b.hp;
      return { perte: perte, plein: wDmg('rocket'), armure: __boss.BOSS_ARMOR };
    });
    ok(r.perte > 0, 'La roquette ne fait rien au boss');
    ok(Math.abs(r.perte - r.plein * r.armure) < 1e-6 * r.plein, 'Dégâts au boss : ' + r.perte + ', attendu ' + (r.plein * r.armure) + ' (armure)');
  });
})();
