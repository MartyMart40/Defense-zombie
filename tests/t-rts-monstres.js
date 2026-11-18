'use strict';
/* Tests des trois monstres à parade du RTS : sapeur, pilonneur, carapace (js/74-rts-monstres.js, dossier 122) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __rtsMonstres === "object" && typeof __rtsMonstres.rmChoix === "function" && typeof __rts === "object"') !== true) ignorer('Monstres du RTS absents (js/74-rts-monstres.js)'); };
  // Partie calme : pas de ponte, pas de horde, pas de zombie ; t : secondes de jeu (la menace suit : 1 + t / 200 en vallée 1)
  const outils = 'function calme(t){ __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies(); R.t = t || 0; visuals(1 / 30); return R; }'
    + ' function pas(n){ for (var i = 0; i < n; i++){ visuals(1 / 30); if (state !== "rts") break; } }'
    + ' function sansUnites(){ var R = __rts.RTS; R.units.slice().forEach(function(u){ u.dead = true; rtsRoot.remove(u.g); }); R.units.length = 0; }'
    + ' function sansTourelles(){ __rts.RTS.blds.filter(function(o){ return !o.dead && o.B.turret; }).forEach(function(o){ rtsBldDie(o, true); }); }'
    + ' function monstre(t, x, z){ var i0 = zombies.length; __rts.rtsSpawnAt(x, z, 1, .2, t); return zombies[i0]; }'
    + ' function unite(t, x, z, tenir){ var u = __rts.rtsSpawnUnit(t, x, z); u.tx = u.hx = x; u.tz = u.hz = z; u.cmd = "idle"; if (tenir) u.hold = true; return u; }';
  const fin = () => J(function(){ if (__rts.RTS.on){ __rts.RTS.paused = false; __rts.rtsQuit(); } localStorage.removeItem('dt_rts_partie'); document.getElementById('rtsPanel').classList.add('hide'); });

  test('RTS monstres : rien avant le seuil (sans hasard), puis le plan les fait venir à la place de zombies du flot', () => {
    exiger(); reset();
    const r = J(new Function(outils + `
      var R = calme(0), M = __rtsMonstres, o = {}, n = 0, R0 = Math.random;
      // Avant le seuil : aucun tirage dans Math.random, le type tiré ne change pas
      Math.random = function(){ n++; return R0(); };
      try {
        R.t = M.rmSeuil('sapeur').temps - 1; R.kills = 1e6; // menace très haute, mais pas encore le temps
        rtsThreat(); for (var i = 0; i < 60; i++){ M.rmPlan(1); M.rmChoix('walker'); M.rmImage(1 / 30); }
        o.tirages = n; o.ouvert0 = M.RM.ouvert.sapeur; o.choix0 = M.rmChoix('walker');
        R.kills = 0; R.t = M.rmSeuil('sapeur').temps + 5; rtsThreat(); // le temps, mais pas la menace
        n = 0; M.rmPlan(1); o.tirages2 = n; o.ouvert1 = M.RM.ouvert.sapeur;
      } finally { Math.random = R0; }
      // Les deux : le sapeur est ouvert, son premier paquet attend, il remplace des zombies du flot
      R.kills = 2400 * 12; visuals(1 / 30);
      M.rmPlan(.1); o.ouvert2 = M.RM.ouvert.sapeur != null; o.pilon = M.RM.ouvert.pilonneur;
      M.rmPlan(M.RM_REGL.plan.sapeur.premier + .1); o.attente = M.RM.attente.sapeur;
      var z0 = zAliveCount(); var k = __rts.rtsSpawnAt(0, -120, 6, 4);
      o.nouveaux = zAliveCount() - z0; o.spawn = k;
      o.sapeurs = zombies.filter(function(z){ return !z.dead && z.type === 'sapeur'; }).length;
      o.attente2 = M.RM.attente.sapeur;
      o.seuils = [M.rmSeuil('sapeur'), M.rmSeuil('pilonneur'), M.rmSeuil('carapace')];
      return o;
    `));
    fin();
    egal(r.tirages, 0, 'Avant le seuil : aucun tirage dans Math.random');
    ok(r.ouvert0 == null && r.ouvert1 == null, 'Rien avant le seuil de temps, ni avant le seuil de menace');
    egal(r.choix0, 'walker', 'Avant le seuil, le type tiré passe tel quel'); egal(r.tirages2, 0, 'Toujours aucun tirage');
    ok(r.ouvert2, 'Seuil atteint : le sapeur est ouvert');
    ok(r.attente >= 2, 'Premier paquet en attente : ' + r.attente);
    egal(r.nouveaux, 6, 'Le total du flot ne change pas'); ok(r.sapeurs >= 2, 'Des sapeurs à la place de zombies : ' + r.sapeurs);
    egal(r.attente2, 0, 'Plus rien en attente');
    ok(r.seuils[0].temps >= 600 && r.seuils[0].menace >= 8, 'Sapeur pas avant 10 min et menace 8 : ' + JSON.stringify(r.seuils[0]));
    ok(r.seuils[1].temps > r.seuils[0].temps && r.seuils[2].temps > r.seuils[1].temps, 'Les suivants plus tard');
  });

  test('RTS monstres : vallée 2, seuils plus tôt ; le plafond de zombies est respecté', () => {
    exiger(); reset();
    const r = J(new Function(outils + `
      var R = calme(0), M = __rtsMonstres, o = {};
      o.v1 = M.rmSeuil('sapeur').temps; R.vallee = 2; o.v2 = M.rmSeuil('sapeur').temps; R.vallee = 1;
      // Plafond plein, monstres en attente : rien de plus
      R.t = 3000; visuals(1 / 30); M.rmPlan(.1); M.rmPlan(10);
      var mx = plan.maxAlive, nm = function(){ return zombies.filter(function(z){ return !z.dead && M.RM_TYPES.indexOf(z.type) >= 0; }).length; };
      o.k = __rts.rtsSpawnAt(0, -150, mx + 20, 30); o.mx = mx; o.m1 = nm(); o.vivants = zAliveCount();
      o.k2 = __rts.rtsSpawnAt(0, -150, 10, 5); o.apres = zAliveCount(); o.m2 = nm();
      return o;
    `));
    fin();
    ok(r.v2 < r.v1, 'Vallée 2 : seuil de temps plus court (' + r.v2 + ' s contre ' + r.v1 + ' s)');
    ok(r.k <= r.mx && r.m1 >= 1, 'Le flot s’arrête au plafond (' + r.k + ' / ' + r.mx + '), monstres compris : ' + r.m1);
    egal(r.k2, 0, 'Plafond plein : plus rien'); egal(r.apres, r.vivants, 'Aucun zombie de plus'); egal(r.m2, r.m1, 'Aucun monstre de plus');
  });

  test('RTS monstres : le sapeur ignore les unités et fait sauter la tourelle (sans parade)', () => {
    exiger(); reset();
    const r = J(new Function(outils + `
      var R = calme(1600), M = __rtsMonstres, o = {};
      sansUnites(); sansTourelles();
      var T = rtsPlaceBld('t_mg', 0, -14, true); T.cd = 1e9;   // tourelle hors service
      var leurre = unite('rifle', 4, -36); leurre.cd = 1e9;     // une unité tout près de son chemin
      var k0 = R.kills, z = monstre('sapeur', 0, -60);
      o.cible = z.rmCible === T || M.rmCibleSapeur(z) === T;
      pas(30); o.ligne = M.RM_MARQ.lignes.some(function(l){ return l.visible; }); o.anneau = M.RM_MARQ.cibles.some(function(l){ return l.visible; });
      for (var i = 0; i < 30 && !z.dead; i++) pas(15);
      o.explose = M.RM.explosions; o.tourelle = T.dead ? 0 : T.hp / T.maxHp; o.mort = z.dead; o.tues = R.kills - k0;
      o.leurre = leurre.dead ? 0 : leurre.hp / leurre.maxHp;
      __rtsCmd.rtsMiniDraw();
      return o;
    `));
    fin();
    ok(r.cible, 'Il vise la tourelle'); ok(r.ligne && r.anneau, 'Ligne rouge au sol et anneau sous la tourelle');
    egal(r.explose, 1, 'Il saute contre la tourelle'); ok(r.tourelle < .35, 'La tourelle est rasée ou presque : ' + Math.round(r.tourelle * 100) + ' %');
    ok(r.mort && r.tues === 0, 'Il disparaît sans compter comme abattu');
    egal(r.leurre, 1, 'Il n’a pas touché à l’unité sur son chemin');
  });

  test('RTS monstres : parades du sapeur (mitrailleurs près de la tourelle, barricade sur son chemin)', () => {
    exiger(); reset();
    const r = J(new Function(outils + `
      var R = calme(1600), M = __rtsMonstres, o = {};
      sansUnites(); sansTourelles();
      var T = rtsPlaceBld('t_mg', 0, -14, true); T.cd = 1e9;
      [-4, 0, 4].forEach(function(x){ unite('gunner', x, -18, true); });
      var z = monstre('sapeur', 0, -70), z0 = monstre('walker', 1.5, -70); z0.hp = 1e9; z0.maxHp = 1e9;
      for (var i = 0; i < 30 && !z.dead; i++) pas(15); pas(3);
      o.a = { explose:M.RM.explosions, abattu:M.RM.abattus, tourelle:T.hp / T.maxHp, mort:z.dead };
      // Barricade : il saute dessus, la tourelle derrière ne prend rien
      R = calme(1600); sansUnites(); sansTourelles();
      T = rtsPlaceBld('t_mg', 0, -14, true); T.cd = 1e9; var W = rtsPlaceBld('wall', 0, -28, true);
      z = monstre('sapeur', 0, -70);
      for (var j = 0; j < 30 && !z.dead; j++) pas(15);
      o.b = { explose:M.RM.explosions, tourelle:T.hp / T.maxHp, mur:W.dead ? 0 : W.hp / W.maxHp };
      return o;
    `));
    fin();
    egal(r.a.explose, 0, 'Mitrailleurs : il ne saute pas'); ok(r.a.mort && r.a.abattu >= 1, 'Abattu avant (son sac saute là où il tombe)');
    ok(r.a.tourelle > .95, 'La tourelle est intacte : ' + Math.round(r.a.tourelle * 100) + ' %');
    egal(r.b.explose, 1, 'Barricade : il saute dessus'); ok(r.b.tourelle > .95, 'La tourelle derrière est intacte : ' + Math.round(r.b.tourelle * 100) + ' %');
    ok(r.b.mur < 1, 'La barricade a pris le souffle');
  });

  test('RTS monstres : le pilonneur s’enracine hors de portée des tourelles et bombarde (sans parade)', () => {
    exiger(); reset();
    const r = J(new Function(outils + `
      var R = calme(2200), M = __rtsMonstres, o = {};
      sansUnites();
      var hp0 = R.blds.filter(function(b){ return !b.dead; }).reduce(function(s, b){ return s + b.hp; }, 0);
      var z = monstre('pilonneur', 0, -100);
      for (var i = 0; i < 60 && z.rmEtat !== 'plante' && !z.dead; i++) pas(15);
      o.plante = z.rmEtat === 'plante';
      var gp = z.g.position, tour = R.blds.filter(function(b){ return !b.dead && b.B.turret; });
      o.loin = Math.min.apply(null, tour.map(function(b){ return Math.hypot(b.x - gp.x, b.z - gp.z); }));
      o.portee = Math.max.apply(null, tour.map(function(b){ return rtsTStat(b, 'range'); }));
      o.racine = M.RM_MARQ.racines.some(function(m){ return m.visible; });
      pas(60); o.cercle = M.RM_OBUS.some(function(b){ return b.actif && b.c.visible; });
      pas(30 * 20);
      o.impacts = M.RM.impacts; o.vivant = !z.dead;
      var hp1 = R.blds.filter(function(b){ return !b.dead; }).reduce(function(s, b){ return s + b.hp; }, 0);
      o.perte = M.RM.degats.pilonneur || 0; o.mortes = R.blds.filter(function(b){ return b.dead && b.B.turret; }).length;
      return o;
    `));
    fin();
    ok(r.plante, 'Il s’enracine'); ok(r.loin > r.portee + 2, 'Hors de portée des tourelles : ' + Math.round(r.loin) + ' m (portée ' + Math.round(r.portee) + ' m)');
    ok(r.racine, 'Anneau vert sous lui'); ok(r.cercle, 'Cercle rouge au sol pendant le vol');
    ok(r.impacts >= 3, 'Il bombarde : ' + r.impacts + ' impacts en 20 s'); ok(r.vivant, 'Les tourelles ne l’atteignent pas');
    ok(r.perte > 600, 'Les bâtiments perdent de la vie : ' + Math.round(r.perte));
  });

  test('RTS monstres : parades du pilonneur (tireurs d’élite, et on peut lui tirer dessus en pilotant)', () => {
    exiger(); reset();
    const r = J(new Function(outils + `
      var R = calme(2200), M = __rtsMonstres, o = {};
      sansUnites();
      [-3, 0, 3].forEach(function(x){ unite('sniper', x, -16); });
      var z = monstre('pilonneur', 0, -100);
      for (var i = 0; i < 80 && !z.dead; i++) pas(15);
      o.mort = z.dead; o.impacts = M.RM.impacts; o.temps = i * .5;
      // En pilotant : un fantassin vise le pilonneur et tire
      R = calme(2200); sansUnites();
      var u = unite('rifle', 0, -20), p = monstre('pilonneur', 0, -50); p.rmEtat = 'plante';
      __rts.RTS.paused = false; o.pilote = rtsPilot(u);
      var gp = u.g.position, dx = p.g.position.x - gp.x, dz = p.g.position.z - gp.z;
      R.pv.yaw = Math.atan2(-dx, -dz); R.pv.pitch = -Math.atan2(RTS_EYE.rob * RTS_SC - 2.5, Math.hypot(dx, dz));
      var hp0 = p.hp; for (var k = 0; k < 6; k++){ rtsPilotShot(u, rtsS2(u), 0, 'w1'); }
      o.touche = p.hp < hp0; rtsUnpilot();
      return o;
    `));
    fin();
    ok(r.mort, 'Les tireurs d’élite l’abattent (' + r.temps + ' s)'); ok(r.impacts <= 4, 'Peu d’obus tombés : ' + r.impacts);
    ok(r.pilote && r.touche, 'En pilotant, on le touche');
  });

  test('RTS monstres : la carapace ; balles et rayons ricochent, explosifs et feu passent ; elle frappe fort', () => {
    exiger(); reset();
    const r = J(new Function(outils + `
      var R = calme(3000), M = __rtsMonstres, o = {};
      sansUnites(); sansTourelles();
      var c = monstre('carapace', 0, -60), from = new THREE.Vector3(0, 2, -30), h;
      h = c.hp; rtsHit(from, c, 'z', { dmg:100, snd:null, range:30 }); o.balle = h - c.hp;
      h = c.hp; rtsHit(from, c, 'z', { dmg:100, snd:null, beam:0x50f0ff, pierce:true, range:30 }); o.rayon = h - c.hp;
      h = c.hp; rtsHit(from, c, 'z', { dmg:100, snd:null, splash:3, range:30 }); o.explosion = h - c.hp;
      h = c.hp; rtsHit(new THREE.Vector3(0, 2, -55), c, 'z', { dmg:100, snd:null, flame:true, range:10 }); o.feu = h - c.hp;
      o.ricochets = M.RM.ricochets;
      // Banc de 12 s : 4 mitrailleurs, puis 2 robots lance-flammes, contre une carapace chacun
      var banc = function(type, n){
        var R2 = calme(3000); sansUnites(); sansTourelles();
        for (var i = 0; i < n; i++) unite(type, -3 + 2 * i, -22, true);
        var q = monstre('carapace', 0, -30); q.rtsT = 1e9; q.rtsTgt = null; q.speed = 0; // elle reste sur place
        pas(30 * 12); return q.dead ? 0 : q.hp / q.maxHp;
      };
      o.mitrailleurs = banc('gunner', 4); o.flammes = banc('flamebot', 2);
      // Sans parade : contre une tourelle mitrailleuse, elle la démolit
      R = calme(3000); sansUnites(); sansTourelles();
      var T = rtsPlaceBld('t_mg', 0, -14, true), q = monstre('carapace', 0, -24), w = monstre('walker', 3, -24);
      pas(30 * 15);
      o.tourelle = T.dead ? 0 : T.hp / T.maxHp; o.vivante = !q.dead;
      return o;
    `));
    fin();
    ok(r.balle > 0 && r.balle <= 15, 'Balle : ' + r.balle + ' sur 100'); ok(r.rayon <= 15, 'Rayon : ' + r.rayon + ' sur 100');
    ok(r.explosion >= 90, 'Explosion : ' + Math.round(r.explosion)); ok(r.feu >= 90, 'Feu : ' + Math.round(r.feu));
    ok(r.ricochets >= 2, 'Ricochets comptés');
    ok(r.mitrailleurs > .6, 'Mitrailleurs seuls : elle garde ' + Math.round(r.mitrailleurs * 100) + ' % de sa vie');
    ok(r.flammes < r.mitrailleurs - .3, 'Lance-flammes : ' + Math.round(r.flammes * 100) + ' %');
    ok(r.vivante && r.tourelle < .5, 'Sans parade, la tourelle mitrailleuse tombe : ' + Math.round(r.tourelle * 100) + ' %');
  });

  test('RTS monstres : l’IA alliée les vise, mini-carte, bandeau une fois, rien ne reste en quittant', () => {
    exiger(); reset();
    const r = J(new Function(outils + `
      var R = calme(3000), M = __rtsMonstres, o = {};
      delete P.rmVus; M.rmNorm();
      var a = monstre('sapeur', 0, -40), b = monstre('pilonneur', 8, -50), c = monstre('carapace', -10, -40);
      var u = unite('gunner', 0, -25);
      o.vise = __rts.RTS.units.length > 0 && [a, b, c].indexOf(rtsPickTarget(u, 60, 0, 60)) >= 0;
      var cv = document.createElement('canvas'), g = cv.getContext('2d'), P2 = function(x, z){ return [x, z]; };
      o.mini = M.rmMiniExtra(g, P2);
      __rtsCmd.rtsMiniDraw();
      o.b1 = M.rmAnnonce('carapace'); o.b2 = M.rmAnnonce('carapace'); o.vus = !!P.rmVus.carapace;
      b.rmEtat = 'plante'; b.rmCd = 0; pas(3); o.vol = M.RM_OBUS.some(function(x){ return x.actif; });
      __rts.rtsQuit(); visuals(1 / 30);
      o.obus = M.RM_OBUS.some(function(x){ return x.actif || x.m.visible || x.c.visible; });
      o.marques = [].concat(M.RM_MARQ.lignes, M.RM_MARQ.cibles, M.RM_MARQ.racines).some(function(m){ return m.visible; });
      o.liste = M.RM.liste.length; o.zombies = zombies.length;
      return o;
    `));
    fin();
    ok(r.vise, 'Une unité alliée vise un monstre'); egal(r.mini, 3, 'Trois points sur la mini-carte');
    ok(r.b1 && !r.b2 && r.vus, 'Bandeau une seule fois, gardé dans le profil');
    ok(r.vol, 'Un obus en vol');
    ok(!r.obus && !r.marques, 'Plus d’obus ni de repère après avoir quitté'); egal(r.liste, 0, 'Liste des monstres vide'); egal(r.zombies, 0, 'Plus de zombies');
  });

  test('RTS monstres : une vraie partie de 90 s ne voit aucun monstre (première partie inchangée)', () => {
    exiger(); reset();
    const r = J(new Function(outils + `
      var M = __rtsMonstres, o = {};
      return __t.graine(5, function(){
        __rts.rtsStart(); var R = __rts.RTS;
        for (var i = 0; i < 90 * 20 && state === 'rts'; i++) visuals(1 / 20);
        o.t = Math.round(R.t); o.monstres = zombies.filter(function(z){ return M.RM_TYPES.indexOf(z.type) >= 0; }).length;
        o.ouverts = M.RM_TYPES.filter(function(t){ return M.RM.ouvert[t] != null; }).length; o.zombies = zAliveCount();
        return o;
      });
    `));
    fin();
    ok(r.t >= 89, 'Partie jouée : ' + r.t + ' s'); egal(r.monstres, 0, 'Aucun monstre'); egal(r.ouverts, 0, 'Aucun seuil franchi');
    ok(r.zombies > 0, 'Des zombies ordinaires : ' + r.zombies);
  });
})();
