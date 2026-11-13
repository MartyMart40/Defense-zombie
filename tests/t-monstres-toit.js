'use strict';
/* Tests des monstres du toit (js/63-monstres-toit.js) : hurleur, fouisseur, revenant */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __mt === "object" && typeof ZKINDS === "object" && !!ZKINDS.screamer') !== true) ignorer('Monstres du toit absents (js/63-monstres-toit.js)'); };
  const NOUV = ['screamer', 'burrower', 'revenant'];
  function partie(i){ reset(); J('startLocation(' + (i || 0) + ')'); J(function(){ __t.geler(); clearZombies(); }); }

  test('Monstres du toit : les 3 existent, avec nom, XP, ferraille, rendu par instances, et meurent à la tête', () => {
    exiger(); partie(2);
    const r = J(function(n){
      var o = {};
      n.forEach(function(t){
        clearZombies(); var z = __t.placer(t, 0, -25);
        var inst = !!z.inst, cible = hitMeshes.indexOf(z.proxy) >= 0;
        damage(z, 1e9, true, z.g.position.clone());
        o[t] = { nom: ZTYPES[t].name, xp: ZXP[t], ferr: SCRAP_Z[t], inst: inst, cible: cible, mort: z.dead, tete: !!z.head, aim: z.aimY };
      });
      clearZombies();
      return o;
    }, NOUV);
    NOUV.forEach(t => {
      const o = r[t];
      ok(!!o.nom && o.xp > 0 && o.ferr > 0, t + ' : nom, XP ou ferraille manquant');
      ok(o.inst, t + ' : pas dessiné par instances (lent en foule)');
      ok(o.cible, t + ' : pas une cible des tirs');
      ok(o.tete && o.aim > 0, t + ' : tête ou hauteur de visée manquante');
      ok(o.mort, t + ' : ne meurt pas d’un tir à la tête');
    });
  });

  test('Monstres du toit : jamais à Saint-Clou, arrivée par ville, total des vagues inchangé', () => {
    exiger(); reset();
    const r = J(function(n){
      var o = { premier: {}, total: [], stClou: 0 };
      LOCS.forEach(function(L, li){
        for (var w = 1; w <= L.waves; w++){
          var q = wavePlan(w, L).queue.filter(function(t){ return t !== 'boss'; });
          o.total.push(q.length === Math.round(30 * w * (1 + .15 * L.off)));
          n.forEach(function(t){
            if (q.indexOf(t) >= 0 && !(t in o.premier)) o.premier[t] = li + ':' + w;
            if (li === 0 && q.indexOf(t) >= 0) o.stClou++;
          });
        }
      });
      // Peu nombreux au début : un seul de chaque à sa première vague
      o.debut = [wavePlan(2, LOCS[1]).queue.filter(function(t){ return t === 'revenant'; }).length,
        wavePlan(4, LOCS[1]).queue.filter(function(t){ return t === 'screamer'; }).length,
        wavePlan(2, LOCS[2]).queue.filter(function(t){ return t === 'burrower'; }).length];
      return o;
    }, NOUV);
    egal(r.stClou, 0, 'Aucun nouveau monstre à Saint-Clou');
    ok(r.total.every(Boolean), 'Le nombre de zombies par vague a changé');
    egal(r.premier.revenant, '1:2', 'Premier revenant');
    egal(r.premier.screamer, '1:4', 'Premier hurleur');
    egal(r.premier.burrower, '2:2', 'Premier fouisseur');
    egal(r.debut.join(','), '1,1,1', 'Un seul de chaque à sa première vague');
  });

  test('Monstres du toit : le mode infini en fait sortir (et pas dès la vague 1)', () => {
    exiger(); reset();
    if (lire('typeof __inf === "object" && typeof __inf.infStart === "function"') !== true) ignorer('Mode infini absent');
    const r = J(function(n){
      __inf.infStart(0, true); __t.geler();
      var compte = function(w){ var q = wavePlan(w).queue, o = {}; n.forEach(function(t){ o[t] = q.filter(function(x){ return x === t; }).length; }); o.total = q.filter(function(x){ return x !== 'boss'; }).length; return o; };
      var o = { inf: !!curLoc.inf, v1: compte(1), v3: compte(3), v8: compte(8), attendu8: Math.round(__inf.INF_BASE_N * Math.pow(__inf.INF_GROW, 7)) };
      __inf.INF.mix = true; var base = wavePlan(8).queue; __inf.INF.mix = false;
      o.base = n.filter(function(t){ return base.indexOf(t) >= 0; }).length;
      __inf.infLeave();
      return o;
    }, NOUV);
    ok(r.inf, 'La partie infinie n’a pas démarré');
    egal(r.v1.screamer + r.v1.burrower + r.v1.revenant, 0, 'Vague 1 de l’infini : aucun');
    ok(r.v3.revenant >= 1, 'Vague 3 : un revenant');
    ok(r.v8.screamer >= 1 && r.v8.burrower >= 1 && r.v8.revenant >= 1, 'Vague 8 : les trois (' + JSON.stringify(r.v8) + ')');
    ok(Math.abs(r.v8.total - r.attendu8) <= 3, 'Vague 8 : total ' + r.v8.total + ' pour ' + r.attendu8 + ' attendus');
    egal(r.base, 0, 'Échantillon du mélange (hordePlan) : pas de doublon');
  });

  test('Monstres du toit : le hurleur s’arrête loin, accélère les zombies autour, tout se calme à sa mort', () => {
    exiger(); partie(1);
    const r = J(function(){
      var h = __t.placer('screamer', 0, -40); h.g.position.z = h.stopZ - .1;
      var a = __t.placer('walker', 3, h.stopZ - 4), loin = __t.placer('walker', 0, -15);
      [a, loin].forEach(function(z){ z.hp = z.maxHp = 1e6; });
      var v0 = a.speed, l0 = loin.speed, b0 = S.bar, cris0 = __mt.MT.cris;
      for (var i = 0; i < 30 * 4; i++) update(1 / 30);
      var o = { st: h.st, z: h.g.position.z, stopZ: h.stopZ, cris: __mt.MT.cris - cris0, k: a.speed / v0, loinK: loin.speed / l0, rage: a.mtRage > 0 };
      for (var k = 0; k < 30 * 10; k++){ update(1 / 30); a.g.position.z = h.stopZ - 4; } // il reste près du hurleur
      o.bar = b0 - S.bar - 0; o.immobile = Math.abs(h.g.position.z - o.z) < .01;
      o.k2 = a.speed / v0;
      damage(h, 1e9, false, h.g.position.clone());
      o.mort = h.dead; o.calme = a.speed / v0; o.plusRage = !(a.mtRage > 0);
      return o;
    });
    egal(r.st, 'attack', 'Le hurleur est arrêté');
    ok(r.stopZ < -40, 'Il s’arrête loin de la barricade (z = ' + r.stopZ.toFixed(1) + ')');
    ok(r.cris >= 1, 'Il hurle');
    ok(Math.abs(r.k - 1.4) < .01, 'Le zombie voisin accélère (×' + r.k.toFixed(2) + ')');
    ok(Math.abs(r.loinK - 1) < .01, 'Un zombie loin de lui ne change pas (×' + r.loinK.toFixed(2) + ')');
    ok(Math.abs(r.k2 - 1.4) < .01, 'L’effet ne s’empile pas (×' + r.k2.toFixed(2) + ')');
    ok(r.immobile, 'Il reste sur place');
    ok(r.mort, 'Il meurt');
    ok(Math.abs(r.calme - 1) < .01 && r.plusRage, 'Sa mort calme les autres (×' + r.calme.toFixed(2) + ')');
  });

  test('Monstres du toit : le hurleur ne frappe jamais la barricade', () => {
    exiger(); partie(1);
    const r = J(function(){
      var h = __t.placer('screamer', 0, -40); h.g.position.z = h.stopZ - .05;
      var b0 = S.bar; for (var i = 0; i < 30 * 8; i++) update(1 / 30);
      return { bar: b0 - S.bar, st: h.st };
    });
    egal(r.bar, 0, 'Barricade intacte');
  });

  test('Monstres du toit : le fouisseur passe sous la rue (intouchable), ressort près de la barricade et prend double', () => {
    exiger(); partie(2);
    const r = J(function(){
      var f = __t.placer('burrower', 0, -48); f.hp = f.maxHp = 1e6; f.mtDigZ = -48.5;
      var o = {};
      for (var i = 0; i < 30 * 1.2 && f.mtSt !== 'under'; i++) update(1 / 30);
      o.sous = f.mtSt; o.cible = hitMeshes.indexOf(f.proxy) >= 0; o.vu = f.g.visible;
      var h = f.hp; damage(f, 500, false, f.g.position.clone()); defHit(f, 500, false); o.dmgSous = h - f.hp;
      __mt.mtBossesImage(); o.bosse = __mt.MT_BOSSES.some(function(m){ return m.visible; });
      var t = 0; while (f.mtSt === 'under' && t < 20){ update(1 / 30); t += 1 / 30; }
      o.tSous = t; o.sort = f.mtSt; o.zSort = f.g.position.z; o.cible2 = hitMeshes.indexOf(f.proxy) >= 0; o.vu2 = f.g.visible;
      h = f.hp; damage(f, 100, false, f.g.position.clone()); o.dmgSort = h - f.hp;
      __mt.mtBossesImage(); o.bosse2 = __mt.MT_BOSSES.some(function(m){ return m.visible; });
      for (var k = 0; k < 30 * 2; k++) update(1 / 30);
      h = f.hp; damage(f, 100, false, f.g.position.clone()); o.dmgApres = h - f.hp;
      var b0 = S.bar; for (var j = 0; j < 30 * 12; j++) update(1 / 30);
      o.st = f.st; o.bar = b0 - S.bar;
      return o;
    });
    egal(r.sous, 'under', 'Il creuse');
    ok(!r.cible && !r.vu, 'Sous terre : ni visible ni cible des tirs');
    egal(r.dmgSous, 0, 'Sous terre : aucun dégât (tirs ni défenses)');
    ok(r.bosse, 'Une bosse de terre le suit');
    ok(r.tSous < 8, 'Il ne reste pas longtemps sous terre (' + r.tSous.toFixed(1) + ' s)');
    egal(r.sort, 'emerge', 'Il ressort');
    ok(r.zSort > -26, 'Il ressort près de la barricade (z = ' + r.zSort.toFixed(1) + ')');
    ok(r.cible2 && r.vu2, 'En sortant, il redevient visible et touchable');
    egal(r.dmgSort, 200, 'Pendant la sortie : dégâts doublés');
    ok(!r.bosse2, 'La bosse disparaît');
    egal(r.dmgApres, 100, 'Une fois sorti : dégâts normaux');
    egal(r.st, 'attack', 'Il finit par attaquer la barricade');
    ok(r.bar > 0, 'La barricade perd de la solidité');
  });

  test('Monstres du toit : le fouisseur tué avant de creuser ne creuse pas', () => {
    exiger(); partie(2);
    const r = J(function(){
      var f = __t.placer('burrower', 0, -80); f.mtDigZ = -55;
      for (var i = 0; i < 30; i++) update(1 / 30);
      damage(f, 1e9, false, f.g.position.clone());
      return { mort: f.dead, st: f.mtSt };
    });
    ok(r.mort, 'Tué en marchant');
    egal(r.st, 'walk', 'Il n’a pas creusé');
  });

  test('Monstres du toit : le revenant se relève une fois sauf tir à la tête ; à terre, un coup l’achève', () => {
    exiger(); partie(1);
    const r = J(function(){
      var o = {};
      // Tué au corps : il tombe, puis un deuxième coup l'achève
      var a = __t.placer('revenant', 0, -30); a.speed = 0; var k0 = S.kills;
      damage(a, 1e9, false, a.g.position.clone());
      o.aTombe = a.st === 'down' && !a.dead && a.hp > 0; o.aKills = S.kills - k0;
      damage(a, 5, false, a.g.position.clone()); o.aMort = a.dead;
      // Laissé à terre : il se relève avec la moitié de sa vie, puis meurt pour de bon
      var b = __t.placer('revenant', 2, -30); b.speed = 0;
      damage(b, 1e9, false, b.g.position.clone());
      for (var i = 0; i < 30 * 3.2; i++) update(1 / 30);
      o.bDebout = b.st !== 'down' && !b.dead; o.bVie = b.hp / b.maxHp;
      damage(b, 1e9, false, b.g.position.clone()); o.bMort = b.dead;
      // Tête : mort tout de suite
      var c = __t.placer('revenant', -2, -30);
      damage(c, 1e9, true, c.g.position.clone()); o.cMort = c.dead;
      // Défenses de l'atelier : même règle
      var d = __t.placer('revenant', 4, -30);
      defHit(d, 1e9, false); o.dDefense = d.st === 'down' && !d.dead;
      return o;
    });
    ok(r.aTombe, 'Tué au corps : il tombe sans mourir');
    egal(r.aKills, 0, 'Pas compté comme tué quand il tombe');
    ok(r.aMort, 'À terre : un coup l’achève');
    ok(r.bDebout, 'Il se relève');
    ok(Math.abs(r.bVie - .5) < .01, 'Avec la moitié de sa vie (' + r.bVie + ')');
    ok(r.bMort, 'Relevé une fois : il meurt pour de bon');
    ok(r.cMort, 'Tir à la tête : mort tout de suite');
    ok(r.dDefense, 'Les défenses le font tomber aussi');
  });

  test('Monstres du toit : un tir réel abat le revenant à terre', () => {
    exiger(); partie(1);
    const r = J(function(){
      S.owned.sniper = true;
      var z = __t.placer('revenant', 0, -25); z.speed = 0;
      damage(z, 1e9, false, z.g.position.clone());
      for (var i = 0; i < 10; i++) update(1 / 30);
      equip('sniper'); __t.viser(z, false); reloadT = 0; cool = 0; S.ammo.sniper = magSize('sniper'); fire();
      return { st: z.st, mort: z.dead };
    });
    ok(r.mort, 'Le revenant à terre doit être touchable (état ' + r.st + ')');
  });

  test('Monstres du toit : bandeau de première rencontre, une seule fois par type, gardé dans le profil', () => {
    exiger(); partie(2);
    const r = J(function(n){
      var o = { avant: JSON.stringify(P.mtVus || {}), titres: [], deuxieme: 0 };
      n.forEach(function(t){
        state = 'playing'; var a0 = __mt.MT.annonces;
        __t.placer(t, 0, -60);
        o.titres.push(document.getElementById('bTitle').textContent + ' | ' + document.getElementById('bSub').textContent);
        if (__mt.MT.annonces !== a0 + 1) o.titres.push('pas annoncé : ' + t);
        var a1 = __mt.MT.annonces; __t.placer(t, 2, -60); o.deuxieme += __mt.MT.annonces - a1;
      });
      o.vus = n.map(function(t){ return !!P.mtVus[t]; });
      o.sauve = n.map(function(t){ var p = store.get('dt_prof', {}); return !!(p.mtVus && p.mtVus[t]); });
      clearZombies();
      return o;
    }, NOUV);
    egal(r.avant, '{}', 'Profil neuf : aucun type déjà vu');
    ok(r.titres.length === 3, r.titres.join(' / '));
    ok(/Hurleur/.test(r.titres[0]) && /premier/.test(r.titres[0]), 'Bandeau du hurleur : ' + r.titres[0]);
    ok(/Fouisseur/.test(r.titres[1]) && /sort/.test(r.titres[1]), 'Bandeau du fouisseur : ' + r.titres[1]);
    ok(/Revenant/.test(r.titres[2]) && /tête/.test(r.titres[2]), 'Bandeau du revenant : ' + r.titres[2]);
    egal(r.deuxieme, 0, 'Pas de deuxième bandeau');
    ok(r.vus.every(Boolean) && r.sauve.every(Boolean), 'Gardé dans le profil (P.mtVus)');
  });

  test('Monstres du toit : chaque moment qui compte est annoncé (Jeu.emit « monstre ») pour la voix et les repères', () => {
    exiger(); partie(2);
    if (lire('typeof __mt.mtEvt === "function" && typeof Jeu.emit === "function"') !== true) ignorer('Annonces des monstres absentes');
    const r = J(function(){
      var vus = [], f = Jeu.on('monstre', function(quoi, z){ vus.push(quoi + ':' + (z && z.type)); });
      var o = {};
      try {
        state = 'playing';
        // Hurleur arrivé : il hurle
        var h = __t.placer('screamer', 0, -40); h.g.position.z = h.stopZ - .05; h.mtCri = .05;
        for (var i = 0; i < 10; i++) update(1 / 30);
        // Fouisseur : creuse, puis sort
        var b = __t.placer('burrower', 3, -48); b.hp = b.maxHp = 1e6; b.mtDigZ = -48.5;
        var t = 0; while (b.mtSt !== 'emerge' && t < 15){ update(1 / 30); t += 1 / 30; }
        // Revenant : tombe, se relève
        var rv = __t.placer('revenant', -3, -30); rv.speed = 0;
        damage(rv, 1e9, false, rv.g.position.clone());
        for (var k = 0; k < 30 * 3.2; k++) update(1 / 30);
        o.evts = JSON.stringify(__mt.MT.evts);
      } finally { Jeu.off('monstre', f); state = 'test'; clearZombies(); }
      o.vus = vus;
      return o;
    });
    const a = r.vus.join(' ');
    ok(/cri:screamer/.test(a), 'Cri du hurleur annoncé : ' + a);
    ok(/creuse:burrower/.test(a) && /sort:burrower/.test(a), 'Fouisseur qui creuse et qui sort : ' + a);
    ok(a.indexOf('creuse:burrower') < a.indexOf('sort:burrower'), 'Il creuse avant de sortir');
    ok(/chute:revenant/.test(a) && /releve:revenant/.test(a), 'Revenant qui tombe et qui se relève : ' + a);
  });

  test('Monstres du toit : le hurleur se reconnaît de loin (gorge qui luit, bras pâles qui pendent) sans matériau de plus', () => {
    exiger(); partie(2);
    const r = J(function(){
      var o = {}, w = __t.placer('walker', 3, -70), n0 = ZMATS.size;
      var z = __t.placer('screamer', 0, -70);
      var mats = [], lum = [];
      z.g.traverse(function(m){ if (m.isMesh && mats.indexOf(m.material) < 0) mats.push(m.material); });
      o.partages = mats.every(function(m){ return !!(m.userData.zshared || m.userData.zfixed); });
      o.lueur = mats.indexOf(ZKM.core) >= 0;
      // Gorge lumineuse : assez grande pour se voir à 45 m (au moins 0,1 m² de face)
      var g = z.g.userData.rig && z.g.userData.rig.gorge; o.gorge = g ? g.material === ZKM.core && g.scale.x * g.scale.y >= .1 : false;
      // Bras pâles : couleur claire (pas le gris sombre des haillons)
      var c = z.armL && z.armL.children[0] && z.armL.children[0].material.color; o.bras = c ? (c.r + c.g + c.b) / 3 : 0;
      // Pose de marche : bras qui pendent (les autres zombies les tendent devant eux), même vitesse que la marche commune
      var z0 = z.g.position.z, w0 = w.g.position.z; z.speed = w.speed = 1.5;
      for (var i = 0; i < 20; i++) update(1 / 30);
      o.brasZ = z.armL.rotation.x; o.brasW = Math.min(w.armL.rotation.x, w.armR.rotation.x); // le bras tendu du marcheur (depuis la tâche 111, un marcheur sur trois a l'autre bras qui pend)
      o.avance = (z.g.position.z - z0) / (w.g.position.z - w0);
      // Aucun matériau de plus dans la foule (palette ZMATS inchangée)
      for (var k = 0; k < 6; k++) __t.placer('screamer', -6 + k * 2, -80);
      o.mats = ZMATS.size - n0;
      clearZombies();
      return o;
    });
    ok(r.partages, 'Matériaux partagés seulement (palette des zombies)');
    ok(r.lueur && r.gorge, 'Gorge lumineuse (ZKM.core) assez grande');
    ok(r.bras > .6, 'Bras pâles (clarté ' + r.bras.toFixed(2) + ')');
    ok(r.brasZ > -.7 && r.brasW < -1, 'Bras qui pendent en marchant (' + r.brasZ.toFixed(2) + ' ; marcheur ' + r.brasW.toFixed(2) + ')');
    ok(Math.abs(r.avance - 1) < .02, 'Même pas que les autres zombies (×' + r.avance.toFixed(3) + ')');
    egal(r.mats, 0, 'Matériaux de la foule en plus');
  });

  test('Monstres du toit : une vague avec les trois se termine (rien ne reste bloqué)', () => {
    exiger(); reset(); J('startLocation(2)');
    const r = J(function(){
      S.barMax = S.bar = 1e7;
      plan.queue = ['walker', 'revenant', 'burrower', 'walker', 'screamer', 'revenant', 'burrower', 'screamer', 'walker', 'walker'];
      spawnT = 0; plan.interval = .3;
      // Un joueur qui tue au hasard ce qui est à moins de 70 m, à la tête une fois sur deux
      var t = 0;
      while (state === 'playing' && t < 400){
        update(1 / 15); t += 1 / 15;
        zombies.forEach(function(z){ if (!z.dead && z.g.position.z > -70 && Math.random() < .04) damage(z, 1e9, Math.random() < .5, z.g.position.clone()); });
      }
      return { t: t, state: state, vivants: zombies.filter(function(z){ return !z.dead; }).map(function(z){ return z.type + ':' + (z.mtSt || z.st); }) };
    });
    ok(r.t < 400, 'La vague doit finir (' + Math.round(r.t) + ' s, état ' + r.state + ', en vie : ' + r.vivants.join(', ') + ')');
  });
})();
