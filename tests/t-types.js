'use strict';
/* =====================================================================
   Tests des types de zombies spéciaux (18-zombies-types.js)
   À charger APRÈS tests.js dans tests/index.html :
     <script src="t-types.js"></script>
   Réutilise test(), J(), ok(), egal(), reset(), ignorer() de tests.js.
   Les tests sont placés avant le test final « Erreurs ».
   ===================================================================== */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const NOUVEAUX = ['jumper', 'flyer', 'spitter', 'colossus'];
  const avant = TESTS.length;
  const present = () => J('typeof ZKINDS !== "undefined"');
  const exiger = () => { if (!present()) ignorer('ZKINDS absent (18-zombies-types.js non chargé)'); };

  test('Types : les 4 nouveaux types existent (ZTYPES, ZKINDS, ferraille)', () => {
    exiger();
    NOUVEAUX.forEach(t => {
      ok(J(function(t){ return !!ZTYPES[t]; }, t), 'ZTYPES.' + t + ' absent');
      ok(J(function(t){ return !!(ZKINDS[t] && typeof ZKINDS[t].build === 'function'); }, t), 'ZKINDS.' + t + '.build absent');
      ok(J(function(t){ return SCRAP_Z[t] > 0; }, t), 'SCRAP_Z.' + t + ' absent');
    });
  });

  test('Types : chaque type apparaît avec une forme différente', () => {
    exiger();
    reset(); J('startLocation(0)'); J('__t.geler()');
    const r = J(function(types){
      clearZombies();
      var out = {};
      types.forEach(function(t){
        var z = spawnZombie(t); z.g.position.set(0, 0, -40); z.g.updateMatrixWorld(true);
        var b = new THREE.Box3().setFromObject(z.body), s = new THREE.Vector3(); b.getSize(s);
        out[t] = { n: z.meshes.length, sig: z.meshes.length + ':' + s.x.toFixed(1) + 'x' + s.y.toFixed(1) + 'x' + s.z.toFixed(1), h: s.y, w: s.x, type: z.type, head: !!z.head && z.meshes.indexOf(z.head) >= 0 };
      });
      clearZombies();
      return out;
    }, ['walker', 'brute'].concat(NOUVEAUX));
    const sigs = {};
    Object.keys(r).forEach(t => {
      egal(r[t].type, t, 'Type du zombie créé');
      ok(r[t].head, t + ' : la tête doit être touchable');
      ok(!sigs[r[t].sig], t + ' a la même forme que ' + sigs[r[t].sig] + ' (' + r[t].sig + ')');
      sigs[r[t].sig] = t;
    });
    ok(r.colossus.h > r.brute.h * 1.3 && r.colossus.w > r.brute.w * 2, 'Le colosse doit être bien plus gros que le costaud : ' + r.colossus.w.toFixed(2) + ' x ' + r.colossus.h.toFixed(2) + ' contre ' + r.brute.w.toFixed(2) + ' x ' + r.brute.h.toFixed(2));
    ok(r.flyer.w > 2.5, 'Le volant doit avoir de grandes ailes : largeur ' + r.flyer.w.toFixed(2));
    egal(J('hitMeshes.length'), 0, 'hitMeshes après clearZombies');
  });

  test('Types : chaque nouveau type peut être tué par un tir', () => {
    exiger();
    reset(); J('startLocation(0)'); J('__t.geler()');
    const r = J(function(types){
      var out = {};
      types.forEach(function(t){
        clearZombies();
        var z = __t.placer(t, 0, -22);
        if (z.alt) z.g.position.y = z.alt; // le volant reste en l'air
        z.g.updateMatrixWorld(true);
        z.hp = Math.min(z.hp, 80);
        var hp0 = z.hp; __t.viser(z, false); S.ammo[S.cur] = 99; fire();
        var hp1 = z.hp, n = 1;
        while (!z.dead && n < 20){ __t.viser(z, false); S.ammo[S.cur] = 99; fire(); n++; }
        out[t] = { touche: hp1 < hp0, mort: !!z.dead, n: n, y: z.g.position.y };
      });
      clearZombies();
      return out;
    }, NOUVEAUX);
    NOUVEAUX.forEach(t => {
      ok(r[t].touche, t + ' : pas touché au premier tir');
      ok(r[t].mort, t + ' : pas mort après ' + r[t].n + ' tirs');
    });
  });

  test('Types : chaque nouveau type peut être tué par une tourelle', () => {
    exiger();
    if (!J('typeof defRebuild === "function" && typeof DEF_TYPES !== "undefined"')) ignorer('Défenses absentes');
    reset(); J('startLocation(0)'); J('__t.geler()');
    const r = J(function(types){
      P.slots = [{ type:'turret', paid:250, lv:{ dmg:0, rate:0, range:0, spec:0 } }, null, null, null]; defRebuild();
      var out = {};
      types.forEach(function(t){
        clearZombies();
        var z = __t.placer(t, -10, -26);
        if (ZKINDS[t] && ZKINDS[t].init) ZKINDS[t].init(z); // remet la hauteur de vol
        z.hp = 30; var y = 0;
        var s = __t.sim(12, 1 / 30, function(){ y = Math.max(y, z.g.position.y); return z.dead; });
        out[t] = { mort: !!z.dead, temps: s.temps, yMax: y };
      });
      clearZombies(); P.slots = [null, null, null, null]; defRebuild();
      return out;
    }, NOUVEAUX);
    NOUVEAUX.forEach(t => ok(r[t].mort, t + ' : la tourelle ne l’a pas tué en 12 s'));
    ok(r.flyer.yMax > 3, 'Le volant devrait être en l’air pendant le test (hauteur max ' + r.flyer.yMax.toFixed(1) + ')');
  });

  test('Types : le volant vole en hauteur puis attaque la barricade', () => {
    exiger();
    reset(); J('startLocation(0)'); J('__t.geler()');
    const r = J(function(){
      clearZombies();
      var z = spawnZombie('flyer'); z.g.position.z = -70;
      __t.sim(1.5);
      var y1 = z.g.position.y, bar0 = S.bar, st = {};
      __t.sim(30, 1 / 30, function(){ st[z.st] = 1; return S.bar < bar0 - 1; });
      return { y1: y1, bar0: bar0, bar1: S.bar, etats: Object.keys(st), vivant: !z.dead };
    });
    ok(r.y1 > 4, 'Hauteur en vol : ' + r.y1.toFixed(2));
    ok(r.etats.indexOf('dive') >= 0, 'Le volant n’a pas plongé (états : ' + r.etats.join(', ') + ')');
    ok(r.bar1 < r.bar0, 'Barricade : ' + r.bar0 + ' puis ' + r.bar1);
  });

  test('Types : le cracheur s’arrête à distance et abîme la barricade', () => {
    exiger();
    reset(); J('startLocation(0)'); J('__t.geler()');
    const r = J(function(){
      clearZombies();
      var z = spawnZombie('spitter'); z.g.position.set(0, 0, z.stopZ - 3);
      var bar0 = S.bar, vus = 0;
      __t.sim(10, 1 / 30, function(){ vus = Math.max(vus, __types.spitsActifs); return false; });
      var res = { bar0: bar0, bar1: S.bar, dist: BAR_Z - z.g.position.z, st: z.st, vus: vus };
      clearZombies();
      res.apresClear = __types.spitsActifs;
      return res;
    });
    egal(r.st, 'attack', 'État du cracheur');
    ok(r.dist >= 24 && r.dist <= 41, 'Distance à la barricade : ' + r.dist.toFixed(1) + ' m');
    ok(r.vus > 0, 'Aucun crachat visible');
    ok(r.bar1 < r.bar0, 'Barricade : ' + r.bar0 + ' puis ' + r.bar1);
    egal(r.apresClear, 0, 'Crachats encore visibles après clearZombies');
  });

  test('Types : le total par vague est inchangé, rien de nouveau en vague 1 de Saint-Clou', () => {
    const r = J(function(nv){
      var res = { faux: [], v1: null, port: {}, arrivee: {} }, base = ['walker', 'runner', 'brute'].concat(nv).concat(typeof __mn === 'object' ? __mn.MN_TYPES : []); // 35-monstres.js remplace des marcheurs
      LOCS.forEach(function(L, li){
        for (var w = 1; w <= L.waves; w++){
          // Seuls les types ordinaires comptent : un boss ajouté par-dessus (19-boss.js) n'est pas un remplaçant
          var p = wavePlan(w, L), att = Math.round(30 * w * (1 + .15 * L.off));
          var n = p.queue.filter(function(t){ return base.indexOf(t) >= 0; }).length;
          if (n !== att) res.faux.push(L.name + ' vague ' + w + ' : ' + n + ' au lieu de ' + att);
          p.queue.forEach(function(t){ if (li === 0 && nv.indexOf(t) >= 0 && !(t in res.arrivee)) res.arrivee[t] = w; });
        }
      });
      res.v1 = wavePlan(1, LOCS[0]).queue.filter(function(t){ return t !== 'walker'; }).length;
      res.v1n = wavePlan(1, LOCS[0]).queue.length;
      var last = LOCS[LOCS.length - 1];
      wavePlan(last.waves, last).queue.forEach(function(t){ res.port[t] = (res.port[t] || 0) + 1; });
      return res;
    }, NOUVEAUX);
    egal(r.faux.length, 0, r.faux.join(' | ') + '\nVagues fausses');
    egal(r.v1, 0, 'Zombies autres que marcheurs en vague 1 de Saint-Clou');
    egal(r.v1n, 30, 'Vague 1 de Saint-Clou');
    NOUVEAUX.forEach(t => ok(r.port[t] > 0, t + ' absent de la dernière vague du Port (' + JSON.stringify(r.port) + ')'));
    ok(r.arrivee.jumper >= 2, 'Le sauteur arrive trop tôt');
    ok((r.port.colossus || 0) < (r.port.brute || 0) + 10, 'Les colosses devraient rester rares');
  });

  test('Types : un type ajouté plus tard (sans ZKINDS ni ZXP) fonctionne', () => {
    reset(); J('startLocation(0)'); J('__t.geler()');
    const r = J(function(){
      clearZombies();
      ZTYPES.essaiT = { hp:50, speed:1, dmg:1, reward:5, scale:1.2, skin:0x777777, xp:4 };
      var z = spawnZombie('essaiT'), xp0 = S.xpGained, k0 = S.kills;
      __t.sim(.5);
      damage(z, 1e9, false, z.g.position.clone());
      var res = { type: z.type, mort: !!z.dead, kills: S.kills - k0, xpOk: isFinite(z.xp) && z.xp > 0 };
      clearZombies(); delete ZTYPES.essaiT;
      return res;
    });
    egal(r.type, 'essaiT', 'Type');
    ok(r.mort, 'Pas mort');
    egal(r.kills, 1, 'Abattus');
    ok(r.xpOk, 'XP invalide pour un type absent de ZXP');
  });

  // Les tests ajoutés passent avant le test final « Erreurs »
  const ajoutes = TESTS.splice(avant);
  const iErr = TESTS.findIndex(t => t.nom.indexOf('Erreurs') === 0);
  TESTS.splice(iErr < 0 ? TESTS.length : iErr, 0, ...ajoutes);
})();
