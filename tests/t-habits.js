'use strict';
/* =====================================================================
   Tests des tenues des zombies et du clown zombie
   (07-zombies.js : TENUES, VILLE_TENUES, zTenue, compteur P.zVus / P.clownSeuil ;
    18-zombies-types.js : ZKINDS.clown, window.__clown ; 06-donnees.js : ZTYPES.clown)
   À charger APRÈS tests.js dans tests/index.html :
     <script src="t-habits.js"></script>
   Réutilise test(), J(), lire(), ok(), egal(), reset(), ignorer() de tests.js.
   ===================================================================== */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const avant = TESTS.length;
  const exiger = () => { if (lire('typeof TENUES === "object" && typeof zTenue === "function" && typeof __zperf === "object"') !== true) ignorer('Tenues absentes (07-zombies.js)'); };
  const exigerC = () => { exiger(); if (lire('typeof __clown === "object" && !!ZTYPES.clown && !!ZKINDS.clown') !== true) ignorer('Clown absent (18-zombies-types.js)'); };
  const partie = (v) => { reset(); J('startLocation(' + (v || 0) + ')'); J(function(){ __t.geler(); clearZombies(); if (typeof RUE === 'object' && RUE){ RUE.crateAt = []; RUE.civAt = -1; } }); };

  test('Habits : plusieurs tenues différentes sur 200 zombies', () => {
    exiger(); partie(0);
    const r = J(function(){
      plan.maxAlive = 1e6; var n = {}, sans = 0;
      for (var i = 0; i < 200; i++){ var z = spawnZombie(i % 5 === 4 ? 'runner' : i % 17 === 0 ? 'brute' : 'walker'); if (z.tenue) n[z.tenue] = (n[z.tenue] || 0) + 1; else sans++; }
      var res = { tenues: n, sans: sans, inst: zombies.every(function(z){ return !!z.inst; }), err: (window.__erreurs || []).length };
      clearZombies(); return res;
    });
    const k = Object.keys(r.tenues);
    ok(k.length >= 7, 'Seulement ' + k.length + ' tenues : ' + JSON.stringify(r.tenues));
    egal(r.sans, 0, 'Humanoïdes sans tenue');
    ok((r.tenues.civil || 0) < 200 * .6, 'Trop de tenues ordinaires : ' + JSON.stringify(r.tenues));
    ok(r.inst, 'Les zombies habillés doivent rester dessinés par instances');
  });

  test('Habits : proportions selon la ville (foreurs au village et au port, complets au centre-ville)', () => {
    exiger();
    const r = J(function(){
      var parts = function(L, type){ var c = {}, N = 6000; for (var i = 0; i < N; i++){ var t = zTenue(type || 'walker', L); c[t] = (c[t] || 0) + 1; } Object.keys(c).forEach(function(k){ c[k] /= N; }); return c; };
      var out = {}; LOCS.forEach(function(L){ out[L.id] = parts(L); });
      out.coureurs = parts(LOCS[2], 'runner'); out.costauds = parts(LOCS[0], 'brute');
      return out;
    });
    const g = (v, k) => (r[v] && r[v][k]) || 0;
    ok(g('village', 'foreur') > g('centre', 'foreur') * 2, 'Foreurs : village ' + g('village', 'foreur') + ', centre-ville ' + g('centre', 'foreur'));
    ok(g('village', 'chasseur') > g('centre', 'chasseur') * 4, 'Chasseurs : village ' + g('village', 'chasseur') + ', centre-ville ' + g('centre', 'chasseur'));
    ok(g('centre', 'affaires') > g('village', 'affaires') * 4, 'Hommes d’affaires : centre-ville ' + g('centre', 'affaires') + ', village ' + g('village', 'affaires'));
    ok(g('port', 'foreur') > g('ville', 'foreur') * 2, 'Travailleurs : port ' + g('port', 'foreur') + ', petite ville ' + g('ville', 'foreur'));
    ok(g('banlieue', 'joggeur') > g('village', 'joggeur'), 'Joggeurs en banlieue');
    ok(g('coureurs', 'joggeur') > g('banlieue', 'joggeur'), 'Les coureurs sont plus souvent des joggeurs');
    egal(g('coureurs', 'mariee') + g('costauds', 'mariee') + g('costauds', 'affaires'), 0, 'Tenues réservées aux marcheurs');
    egal(g('village', 'clown') + g('port', 'clown'), 0, 'La tenue du clown ne sort jamais au hasard');
  });

  test('Habits : matériaux bornés et appels de dessin de la foule (300 zombies, clown compris)', () => {
    exigerC(); partie(3);
    const r = J(function(){
      var MIX = ['walker', 'runner', 'walker', 'jumper', 'brute', 'walker', 'spitter', 'flyer', 'runner', 'walker'];
      var remplir = function(n){ for (var i = 0; i < n; i++){ var t = i % 60 === 59 ? 'colossus' : MIX[i % MIX.length]; var z = spawnZombie(t); z.g.position.set(rand(-11, 11), z.g.position.y, rand(-105, -12)); } };
      plan.maxAlive = 1e6; remplir(299); __clown.forcer(0, -40); visuals(1 / 30);
      var a = { mats: __zperf.mats(), dessins: __zperf.draws(), lots: __zperf.batches(), enScene: __zperf.inScene(), inst: __zperf.instances() };
      clearZombies(); remplir(300); __clown.forcer(2, -50); visuals(1 / 30);
      var b = { mats: __zperf.mats(), dessins: __zperf.draws() };
      clearZombies(); return { a: a, b: b };
    });
    ok(r.a.mats <= 40, 'Trop de matériaux de zombies : ' + r.a.mats);
    egal(r.b.mats, r.a.mats, 'Les matériaux ne doivent pas grandir avec de nouveaux zombies');
    ok(r.a.dessins <= 24, 'Appels de dessin de la foule : ' + r.a.dessins);
    egal(r.a.enScene, 0, 'Zombies en vrais objets dans la scène (le clown aussi doit passer par les instances)');
    ok(r.a.inst < 300 * 20, 'Trop de morceaux par zombie : ' + r.a.inst);
  });

  test('Habits : un tir à la tête fait tomber le casque avec la tête', () => {
    exiger(); partie(0);
    const r = J(function(){
      var z = null;
      for (var i = 0; i < 60 && !z; i++){ var c = spawnZombie('walker'); if (c.tenue === 'foreur' || c.tenue === 'pompier' || c.tenue === 'cuisinier' || c.tenue === 'policier') z = c; else { removeZombieMeshes(c); disposeZombie(c); zombies.splice(zombies.indexOf(c), 1); } }
      if (!z) return null;
      z.g.position.set(0, 0, -20); z.g.updateMatrixWorld(true);
      var acc = z.head.children.length;
      kill(z, true, z.g.position.clone());
      var cache = z.head.children.every(function(o){ return !o.visible; });
      clearZombies(); return { acc: acc, cache: cache };
    });
    if (!r) ignorer('Pas de casque tiré au hasard');
    ok(r.acc >= 1, 'Le casque devrait être un enfant de la tête');
    ok(r.cache, 'Le casque reste visible sans la tête');
  });

  test('Clown : apparaît au seuil du compteur à vie, nouveau seuil tiré et sauvegardé', () => {
    exigerC(); partie(0);
    const r = J(function(){
      var res = { vus0: P.zVus, seuil0: P.clownSeuil, min: __clown.CLOWN.min, max: __clown.CLOWN.max };
      P.zVus = 0; P.clownSeuil = 50;
      var types = []; for (var i = 0; i < 49; i++) types.push(spawnZombie('walker').type);
      res.avant = types.filter(function(t){ return t === 'clown'; }).length;
      var c = spawnZombie('walker');
      res.type = c.type; res.drap = c.clown === true; res.vus = P.zVus; res.seuil = P.clownSeuil;
      var sv = {}; try { sv = JSON.parse(localStorage.getItem('dt_prof')) || {}; } catch (e) {}
      res.svSeuil = sv.clownSeuil; res.svClowns = sv.clowns;
      // Deuxième seuil atteint pendant que le clown vit : pas de deuxième clown, il attend
      P.zVus = P.clownSeuil - 1; var w = spawnZombie('runner'); res.deux = w.type; res.vivants = zombies.filter(function(z){ return z.clown && !z.dead; }).length;
      var b = spawnZombie('brute'); res.brute = b.type;
      res.direct = spawnZombie('clown').type; // même demandé directement : un seul à la fois
      kill(c, false, c.g.position.clone());
      var s2 = P.clownSeuil, n = spawnZombie('walker'); res.apres = n.type; res.nouveauSeuil = P.clownSeuil > s2;
      clearZombies(); return res;
    });
    ok(typeof r.vus0 === 'number' && r.vus0 >= 0, 'P.zVus absent du profil : ' + r.vus0);
    ok(r.seuil0 >= r.min && r.seuil0 <= r.max + r.vus0, 'Premier seuil hors de 8 000 à 12 000 : ' + r.seuil0);
    egal(r.avant, 0, 'Clowns avant le seuil');
    egal(r.type, 'clown', 'Type du zombie au seuil'); ok(r.drap, 'z.clown doit valoir true (contrat avec les missions)');
    ok(r.seuil - r.vus >= r.min && r.seuil - r.vus <= r.max, 'Nouveau seuil : ' + r.seuil + ' pour ' + r.vus + ' zombies vus');
    egal(r.svSeuil, r.seuil, 'Seuil sauvegardé dans dt_prof'); egal(r.svClowns, 1, 'Nombre de clowns sauvegardé');
    egal(r.deux, 'runner', 'Deuxième clown pendant que le premier vit'); egal(r.vivants, 1, 'Clowns en vie');
    egal(r.brute, 'brute', 'Un costaud ne devient pas un clown');
    egal(r.direct, 'walker', 'spawnZombie(\'clown\') avec un clown déjà en vie');
    egal(r.apres, 'clown', 'Le clown en attente arrive après la mort du premier'); ok(r.nouveauSeuil, 'Pas de nouveau seuil');
  });

  test('Clown : ancienne sauvegarde sans compteur, valeurs par défaut', () => {
    exigerC(); reset();
    const r = J(function(){
      delete P.zVus; delete P.clownSeuil; delete P.clowns; zClownNorm();
      var a = { vus: P.zVus, seuil: P.clownSeuil, clowns: P.clowns };
      P.zVus = 'x'; P.clownSeuil = -3; zClownNorm(); a.vus2 = P.zVus; a.seuil2 = P.clownSeuil;
      return a;
    });
    egal(r.vus, 0, 'P.zVus par défaut'); egal(r.clowns, 0, 'P.clowns par défaut');
    ok(r.seuil >= 8000 && r.seuil <= 12000, 'Seuil par défaut : ' + r.seuil);
    ok(r.vus2 === 0 && r.seuil2 >= 8000, 'Valeurs invalides corrigées : ' + r.vus2 + ', ' + r.seuil2);
  });

  test('Clown : Pouet ! quand il est touché, sautille, et gros bonus à sa mort', () => {
    exigerC(); partie(0);
    const r = J(function(){
      var c = __clown.forcer(0, -40), c2 = __clown.forcer();
      var res = { meme: c === c2, type: c.type, drap: c.clown, inst: !!c.inst, ballon: c.meshes.filter(function(m){ return m.userData.weak && m.userData.weak.effet === 'ballon'; }).length };
      var z0 = c.g.position.z, ys = [];
      for (var i = 0; i < 60; i++){ update(1 / 30); ys.push(c.body.position.y); S.bar = S.barMax; }
      res.avance = c.g.position.z - z0; res.saut = Math.max.apply(null, ys) - Math.min.apply(null, ys);
      var hp = c.hp; damage(c, 1, false, c.g.position.clone()); res.pouets = c.pouets || 0; res.hp = hp - c.hp;
      // Ballon crevé : aucun dégât au clown
      var bal = c.meshes.filter(function(m){ return m.userData.weak; })[0], hp2 = c.hp;
      if (bal){ weakHit(c, bal, 50, c.g.position.clone()); res.crevé = !bal.visible && c.meshes.indexOf(bal) < 0; res.hpBallon = hp2 - c.hp; }
      // Comparaison avec un marcheur
      var w = __t.placer('walker', 3, -30), m0 = S.money, x0 = P.xp + 0, l0 = P.level, s0 = P.scrap;
      kill(w, false, w.g.position.clone()); var wPay = S.money - m0, wScrap = P.scrap - s0;
      m0 = S.money; s0 = P.scrap; var xpAvant = S.xpGained;
      var st0 = P.st && typeof P.st.clown === 'number' ? P.st.clown : null; // succès secret (30-missions.js), s'il est là
      c.hp = 1; damage(c, 5, false, c.g.position.clone());
      res.mission = st0 === null ? null : P.st.clown - st0;
      res.mort = !!c.dead; res.pay = S.money - m0; res.wPay = wPay; res.scrap = P.scrap - s0; res.wScrap = wScrap; res.xp = S.xpGained - xpAvant;
      res.mot = c.motFin || ''; res.abattus = P.clownsAbattus || 0; res.err = (window.__erreurs || []).length;
      res.vivantApres = !!__clown.vivant;
      clearZombies(); return res;
    });
    ok(r.meme, '__clown.forcer() ne doit pas créer un deuxième clown');
    egal(r.type, 'clown', 'Type'); ok(r.drap === true, 'z.clown');
    ok(r.inst, 'Le clown doit passer par le rendu par instances');
    egal(r.ballon, 1, 'Ballon du clown');
    ok(r.avance > .5, 'Le clown n’avance pas : ' + r.avance);
    ok(r.saut > .1, 'Le clown ne sautille pas : ' + r.saut);
    ok(r.pouets >= 1, 'Pas de « Pouet ! » au coup');
    ok(r.crevé, 'Le ballon ne crève pas'); egal(r.hpBallon, 0, 'Dégâts du ballon crevé');
    ok(r.mort, 'Le clown ne meurt pas');
    ok(r.pay >= r.wPay * 50, 'Bonus d’argent du clown : ' + r.pay + ' contre ' + r.wPay + ' pour un marcheur');
    ok(r.scrap >= r.wScrap * 50, 'Bonus de ferraille : ' + r.scrap + ' contre ' + r.wScrap);
    ok(r.xp >= 50, 'Bonus d’XP : ' + r.xp);
    ok(r.mot.length > 3, 'Texte drôle à la mort'); egal(r.abattus, 1, 'Clowns abattus');
    ok(!r.vivantApres, 'Clown encore compté vivant après sa mort');
    if (r.mission !== null) ok(r.mission >= 1, 'Le succès « abattre le clown » des missions n’a pas compté');
    egal(r.err, 0, 'Erreurs JavaScript');
  });

  // Les tests ajoutés passent avant le test final « Erreurs »
  const ajoutes = TESTS.splice(avant);
  const iErr = TESTS.findIndex(t => t.nom.indexOf('Erreurs') === 0);
  TESTS.splice(iErr < 0 ? TESTS.length : iErr, 0, ...ajoutes);
})();
