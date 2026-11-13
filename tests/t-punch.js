'use strict';
/* =====================================================================
   Tests du punch (31-punch.js) : ralenti, chiffres de dégâts, statistiques de fin
   À charger APRÈS tests.js dans tests/index.html :
     <script src="t-punch.js"></script>
   Réutilise test(), J(), lire(), ok(), egal(), reset(), ignorer() de tests.js.
   ===================================================================== */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __punch === "object" && typeof pkSlow === "function"') !== true) ignorer('Punch absent (31-punch.js)'); };
  // Partie à Saint-Clou, apparitions gelées, sans largage ni survivant
  const partie = () => {
    reset(); J('startLocation(0)');
    J(function(){
      __t.geler(); clearZombies(); if (typeof RUE === 'object' && RUE){ RUE.crateAt = []; RUE.civAt = -1; }
      state = 'playing'; S.bar = S.barMax = 1e9; __punch.pkSetSlow(true); __punch.pkSetNums(true); __punch.setCap(__punch.PKN_MAX);
    });
  };
  // Outils : tirer sur un point avec l'arme id
  const OUTILS = function(){
    window.__tpk = {
      tirer: function(id, cible){
        S.owned[id] = true; if (S.cur !== id) equip(id);
        camera.position.copy(EYE); camera.lookAt(cible); camera.updateMatrixWorld(true); zoomed = false; recoilAcc = 0;
        reloadT = 0; cool = 0; S.ammo[id] = 99; spin = 1; return fire();
      },
      centre: function(z){ z.g.updateMatrixWorld(true); var v = new THREE.Vector3(); z.meshes[0].getWorldPosition(v); return v; },
      tete: function(z){ z.g.updateMatrixWorld(true); var v = new THREE.Vector3(); z.head.getWorldPosition(v); return v; },
      gros: function(type, x, zp){ var z = __t.placer(type || 'brute', x || 0, zp || -30); z.hp = z.maxHp = 1e7; z.speed = 0; return z; }
    };
  };

  test('Punch : la mort du boss déclenche le ralenti, puis le temps revient à 1', () => {
    exiger(); partie();
    const r = J(function(){
      var o = {};
      var w = __t.placer('walker', 0, -60); w.speed = 2; w.sway = 0;
      var b = __t.placer('boss', 4, -80);
      var z0 = w.g.position.z; update(.1); o.normal = w.g.position.z - z0;
      damage(b, 1e9, true, b.g.position.clone());
      o.bossDead = !!b.dead; o.kind = __punch.PK.sl && __punch.PK.sl.kind;
      z0 = w.g.position.z; update(.1); o.lent = w.g.position.z - z0; o.ts = __punch.PK.ts;
      o.bossCount = S.pk.boss; o.ktBoss = S.pk.kt.boss || 0;
      // Pas d'empilement : un petit ralenti ne remplace pas celui du boss
      o.empile = __punch.pkSlow('multi');
      var mini = 1; for (var i = 0; i < 40; i++){ update(1 / 30); state = 'playing'; mini = Math.min(mini, __punch.PK.ts); if (i === 34) o.milieu = __punch.PK.ts; }
      for (var k = 0; k < 30; k++){ update(1 / 30); state = 'playing'; }
      o.fin = __punch.PK.ts; o.slFin = __punch.PK.sl;
      state = 'test';
      return o;
    });
    ok(r.bossDead, 'Le boss doit mourir');
    egal(r.kind, 'boss', 'Ralenti du boss');
    ok(Math.abs(r.ts - .25) < 1e-9, 'Échelle de temps pendant le ralenti : ' + r.ts);
    ok(r.normal > 0 && Math.abs(r.lent / r.normal - .25) < .02, 'Le jeu avance à 25 % : ' + r.lent + ' contre ' + r.normal);
    ok(!r.empile, 'Un petit ralenti ne s’empile pas sur celui du boss');
    ok(r.milieu > .25 && r.milieu < 1, 'Retour progressif : ' + r.milieu);
    egal(r.fin, 1, 'Échelle de temps après le ralenti');
    egal(r.slFin, null, 'Ralenti terminé');
    egal(r.bossCount, 1, 'Boss abattus dans les statistiques');
    egal(r.ktBoss, 1, 'Boss compté par type');
  });

  test('Punch : le réglage Ralenti le désactive et il est sauvegardé', () => {
    exiger(); partie();
    const r = J(function(){
      var b0 = document.getElementById('btnSlow');
      __punch.pkSetSlow(false);
      var b = __t.placer('boss', 0, -80);
      damage(b, 1e9, true, b.g.position.clone()); update(.1);
      var o = { sl: __punch.PK.sl, ts: __punch.PK.ts, saved: localStorage.getItem('dt_slow'), btn: b0 ? b0.textContent : null };
      if (b0 && b0.click) b0.click(); else __punch.pkSetSlow(true);
      o.apres = __punch.PK.slow; o.saved2 = localStorage.getItem('dt_slow');
      state = 'test';
      return o;
    });
    egal(r.sl, null, 'Aucun ralenti quand le réglage est coupé');
    egal(r.ts, 1, 'Échelle de temps');
    egal(r.saved, 'false', 'Réglage sauvegardé (dt_slow)');
    ok(r.btn === null || /Ralenti : désactivé/.test(r.btn), 'Texte du bouton : ' + r.btn);
    egal(r.apres, true, 'Le bouton le réactive');
    egal(r.saved2, 'true', 'Réglage réactivé sauvegardé');
  });

  test('Punch : un tir crée un chiffre, le pool ne dépasse jamais sa taille', () => {
    exiger(); partie(); J(OUTILS);
    const r = J(function(){
      var o = {};
      var z = __tpk.gros('brute', 0, -30);
      __punch.pknClear();
      __tpk.tirer('pistol', __tpk.centre(z));
      __punch.pknFrame(.01);
      o.actifs = __punch.pknActive();
      var e = __punch.PKN.filter(function(x){ return x.on; })[0];
      o.txt = e ? e.el.textContent : ''; o.z = e ? e.z === z : false;
      // Grande foule : 80 zombies touchés d'un coup
      var n0 = document.getElementById('pkNums'); var kids0 = n0 && n0.children ? n0.children.length : -1;
      for (var i = 0; i < 80; i++){ var q = __t.placer('walker', -10 + (i % 20), -20 - Math.floor(i / 20) * 6); q.hp = q.maxHp = 1e6; damage(q, 10 + i, false, q.g.position.clone()); }
      __punch.pknFrame(.01);
      o.max = __punch.PKN_MAX; o.pool = __punch.PKN.length; o.actifs2 = __punch.pknActive();
      o.kids = n0 && n0.children ? n0.children.length : -1; o.kids0 = kids0;
      // Les plus gros coups restent
      var amts = __punch.PKN.filter(function(x){ return x.on; }).map(function(x){ return x.amt; });
      o.minGarde = Math.min.apply(null, amts);
      o.fmt = [__punch.pkFmt(950), __punch.pkFmt(1234), __punch.pkFmt(3400000)];
      state = 'test';
      return o;
    });
    egal(r.actifs, 1, 'Un chiffre après le tir');
    ok(r.z, 'Chiffre accroché au zombie touché');
    ok(/\d/.test(r.txt), 'Texte du chiffre : ' + r.txt);
    egal(r.pool, r.max, 'Taille du pool');
    ok(r.actifs2 <= r.max, 'Chiffres actifs : ' + r.actifs2 + ' (max ' + r.max + ')');
    egal(r.kids, r.kids0, 'Aucun élément créé pendant le jeu');
    ok(r.minGarde >= 40, 'Foule : les plus gros coups doivent rester (plus petit gardé : ' + r.minGarde + ')');
    egal(r.fmt[0], '950', 'Format sous 1000');
    egal(r.fmt[1], '1,2 k', 'Format compact des milliers');
    ok(/^3,4\d* M$/.test(r.fmt[2]), 'Format compact des millions : ' + r.fmt[2]);
  });

  test('Punch : les plombs d’une cartouche sur le même zombie font un seul chiffre', () => {
    exiger(); partie(); J(OUTILS);
    const r = J(function(){
      var z = __tpk.gros('brute', 0, -16), hp0 = z.hp;
      __punch.pknClear();
      __tpk.tirer('shotgun', __tpk.centre(z));
      var on = __punch.PKN.filter(function(x){ return x.on && x.z === z; });
      state = 'test';
      return { n: on.length, amt: on.length ? on[0].amt : 0, perte: hp0 - z.hp, pellets: wPellets('shotgun') };
    });
    ok(r.pellets > 1, 'Le fusil à pompe tire plusieurs plombs');
    egal(r.n, 1, 'Un seul chiffre pour la cartouche');
    ok(r.perte > 0 && Math.abs(r.amt - r.perte) < 1e-6, 'Le chiffre additionne les plombs : ' + r.amt + ' contre ' + r.perte);
  });

  test('Punch : le réglage Chiffres de dégâts est sauvegardé et coupe l’affichage', () => {
    exiger(); partie(); J(OUTILS);
    const r = J(function(){
      var b = document.getElementById('btnDmgNum');
      __punch.pkSetNums(false);
      var o = { saved: localStorage.getItem('dt_dmgnum'), btn: b ? b.textContent : null };
      var z = __tpk.gros('brute', 0, -30);
      __tpk.tirer('pistol', __tpk.centre(z));
      o.actifs = __punch.pknActive();
      if (b && b.click) b.click(); else __punch.pkSetNums(true);
      o.apres = __punch.PK.nums; o.saved2 = localStorage.getItem('dt_dmgnum');
      state = 'test';
      return o;
    });
    egal(r.saved, 'false', 'Réglage sauvegardé (dt_dmgnum)');
    ok(r.btn === null || /Chiffres de dégâts : cachés/.test(r.btn), 'Texte du bouton : ' + r.btn);
    egal(r.actifs, 0, 'Aucun chiffre quand le réglage est coupé');
    egal(r.apres, true, 'Le bouton le réactive');
    egal(r.saved2, 'true', 'Réglage réactivé sauvegardé');
  });

  test('Punch : statistiques de fin (précision, tête, dégâts par arme), remises à zéro à la nouvelle partie', () => {
    exiger(); partie(); J(OUTILS);
    const r = J(function(){
      var o = {};
      var z = __tpk.gros('brute', 0, -30), hp0 = z.hp;
      for (var i = 0; i < 3; i++) __tpk.tirer('pistol', __tpk.centre(z));
      var hpP = z.hp;
      __tpk.tirer('pistol', __tpk.tete(z));
      o.pistol = hp0 - z.hp;
      __tpk.tirer('pistol', new THREE.Vector3(0, 60, -40)); // raté (vers le ciel)
      var h1 = z.hp; __tpk.tirer('sniper', __tpk.centre(z)); o.sniper = h1 - z.hp;
      var w = __t.placer('walker', 3, -25); damage(w, 1e9, false, w.g.position.clone());
      S.pk.time = 125;
      var D = __punch.pkEndData();
      o.D = { shots: D.shots, hits: D.hits, acc: D.acc, heads: D.heads, dmg: D.dmg, top: D.top.map(function(t){ return t.id + ':' + t.dmg; }), fav: D.fav, types: D.types.map(function(t){ return t.id + ':' + t.n; }) };
      o.bySrc = JSON.parse(JSON.stringify(S.pk.bySrc));
      gameOver();
      var box = document.getElementById('pkEnd'), st = document.getElementById('overStats');
      o.html = box ? box.innerHTML : ''; o.stats = st ? st.innerHTML : '';
      o.voisin = !!(box && st && box.parentNode === st.parentNode);
      newGame();
      o.reset = { shots: S.pk.shots, hits: S.pk.hits, heads: S.pk.heads, dmg: S.pk.dmg, src: Object.keys(S.pk.bySrc).length, kt: Object.keys(S.pk.kt).length, time: S.pk.time };
      state = 'test';
      return o;
    });
    const D = r.D;
    egal(D.shots, 6, 'Tirs comptés (5 au pistolet, 1 au sniper)');
    egal(D.hits, 5, 'Tirs qui touchent');
    egal(D.acc, 83, 'Précision');
    egal(D.heads, 1, 'Tirs à la tête');
    ok(Math.abs(r.bySrc.pistol - r.pistol) < 1e-6, 'Dégâts du pistolet : ' + r.bySrc.pistol + ' contre ' + r.pistol);
    ok(r.sniper > 0 && Math.abs(r.bySrc.sniper - r.sniper) < 1e-6, 'Dégâts du sniper : ' + r.bySrc.sniper + ' contre ' + r.sniper);
    ok(D.top.length >= 2 && D.top.length <= 3, 'Top des armes : ' + D.top.join(', '));
    egal(D.fav, 'pistol', 'Arme préférée (le plus de tirs)');
    ok(D.types.indexOf('walker:1') >= 0, 'Zombies par type : ' + D.types.join(', '));
    ok(/Précision/.test(r.html) && /83(&nbsp;|[\s\u00a0\u202f])*%/.test(r.html), 'Section de fin affichée : ' + r.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200));
    ok(/Dégâts par arme/.test(r.html) && /Pistolet/.test(r.html), 'Barres des armes');
    ok(/2 min 05 s/.test(r.html), 'Temps de jeu');
    ok(/Zombies abattus/.test(r.stats), 'Les statistiques existantes restent');
    ok(r.voisin, 'La section est placée à côté des statistiques existantes');
    egal(JSON.stringify(r.reset), JSON.stringify({ shots: 0, hits: 0, heads: 0, dmg: 0, src: 0, kt: 0, time: 0 }), 'Remise à zéro par newGame');
  });
  /* ---------- Sensations du tir (Effets de tir) ---------- */
  const exigerTir = () => { exiger(); if (lire('typeof pkPoseOn === "function" && typeof impactRate === "function"') !== true) ignorer('Effets de tir absents'); };

  test('Tir : un zombie touché sursaute (affiché par instances), puis revient ; les tirs visent la pose normale', () => {
    exigerTir(); partie(); J(OUTILS);
    const r = J(function(){
      __punch.pkSetTir(true);
      var o = {};
      var z = __tpk.gros('walker', 0, -30); z.sway = 0; z.speed = 0;
      update(1 / 60);
      o.ry0 = z.body.rotation.y; o.rx0 = z.body.rotation.x;
      // Coup sur le flanc droit (x +)
      var p = __tpk.centre(z); p.x += .25;
      damage(z, z.maxHp * .3, false, p);
      o.react = __punch.PK.react.indexOf(z) >= 0;
      update(1 / 60);
      o.ry1 = z.body.rotation.y; o.rx1 = z.body.rotation.x;
      // Rendu par instances : la matrice du torse dans son lot doit être celle de la pose tournée
      zInstSync();
      var torse = z.meshes[0], e = null;
      for (var i = 0; i < z.inst.length; i++) if (z.inst[i].m === torse) e = z.inst[i];
      o.inst = !!e;
      if (e){
        var a = e.b.im.instanceMatrix.array, m = torse.matrixWorld.elements, trouve = false;
        for (var k = 0; k < e.b.n && !trouve; k++){ var bon = true; for (var j = 0; j < 16; j++) if (Math.abs(a[k * 16 + j] - m[j]) > 1e-5){ bon = false; break; } trouve = bon; }
        o.trouve = trouve;
        // axe X du torse : tourné autour de la verticale (sa composante z n'est plus nulle)
        o.axeXz = m[2];
      }
      // Pendant update(), la pose est normale : pkPoseOff retire le sursaut
      __punch.pkPoseOff(); o.ryOff = z.body.rotation.y; __punch.pkPoseOn(0);
      for (var n = 0; n < 40; n++) update(1 / 60);
      o.ryFin = z.body.rotation.y; o.reactFin = __punch.PK.react.indexOf(z) >= 0;
      o.pos = z.g.position.z;
      state = 'test';
      return o;
    });
    ok(r.react, 'Le zombie touché est suivi');
    ok(r.ry1 - r.ry0 > .03, 'Torsion vers l’arrière du côté touché : ' + r.ry0 + ' puis ' + r.ry1);
    ok(r.rx1 < r.rx0, 'Le corps part un peu vers l’arrière : ' + r.rx0 + ' puis ' + r.rx1);
    ok(r.inst, 'Le zombie passe par le rendu par instances');
    ok(r.trouve, 'La matrice tournée est bien dans le lot d’instances');
    ok(Math.abs(r.axeXz) > .02, 'Rotation visible dans la matrice affichée : ' + r.axeXz);
    ok(Math.abs(r.ryOff - r.ry0) < 1e-9, 'Pose normale pendant update() (tirs) : ' + r.ryOff + ' contre ' + r.ry0);
    ok(Math.abs(r.ryFin - r.ry0) < 1e-6 && !r.reactFin, 'Retour à la pose normale : ' + r.ryFin);
    egal(r.pos, -30, 'Aucun déplacement du zombie');
  });

  test('Tir : tête touchée (tête qui part en arrière, repère au réticule, son si présent), aucun changement de dégâts', () => {
    exigerTir(); partie(); J(OUTILS);
    const r = J(function(){
      __punch.pkSetTir(true);
      var o = {}, sons = 0, avant = Snd.headPop;
      Snd.headPop = function(){ sons++; }; __punch.PK.snd.headPop = -1;
      var z = __tpk.gros('walker', 0, -30); z.speed = 0; z.sway = 0;
      update(1 / 60); var hx0 = z.head.rotation.x, hp0 = z.hp;
      __tpk.tirer('pistol', __tpk.tete(z));
      o.perte = hp0 - z.hp; o.attendu = wDmg('pistol') * headMult() * (WEAPONS.pistol.headX || 1);
      update(1 / 60);
      o.hx = z.head.rotation.x - hx0;
      o.cls = __punch.pkHmFrame(.01, true);
      o.el = !!document.getElementById('pkHm');
      o.sons = sons;
      // Même tir, effets coupés : mêmes dégâts, pas de repère
      __punch.pkSetTir(false); __punch.PK.snd.headPop = -1;
      var z2 = __tpk.gros('walker', 3, -30); z2.speed = 0; update(1 / 60); var h2 = z2.hp;
      __tpk.tirer('pistol', __tpk.tete(z2)); o.perte2 = h2 - z2.hp;
      o.cls2 = __punch.pkHmFrame(.01, true);
      __punch.pkSetTir(true);
      if (avant) Snd.headPop = avant; else delete Snd.headPop;
      state = 'test';
      return o;
    });
    ok(Math.abs(r.perte - r.attendu) < 1e-6, 'Dégâts à la tête inchangés : ' + r.perte + ' contre ' + r.attendu);
    ok(r.hx < -.1, 'La tête part vers l’arrière : ' + r.hx);
    egal(r.cls, 'on head', 'Repère « tête » au réticule');
    ok(r.el, 'Élément du repère créé');
    egal(r.sons, 1, 'Son de la tête appelé une fois (Snd.headPop)');
    ok(Math.abs(r.perte2 - r.perte) < 1e-6, 'Effets coupés : mêmes dégâts');
    egal(r.cls2, '', 'Effets coupés : pas de repère tête');
  });

  test('Tir : la chute dépend du coup (tête, corps, explosion), repère de mort, réglage sauvegardé', () => {
    exigerTir(); partie(); J(OUTILS);
    const r = J(function(){
      __punch.pkSetTir(true);
      var o = {}, sons = 0, avant = Snd.killConfirm;
      Snd.killConfirm = function(){ sons++; }; __punch.PK.snd.killConfirm = -1;
      var a = __t.placer('walker', -6, -30), b = __t.placer('walker', 0, -30), c = __t.placer('walker', 6, -30);
      [a, b, c].forEach(function(z){ z.speed = 0; z.sway = 0; });
      update(1 / 60);
      __punch.PK.src = 'pistol'; __punch.PK.dmgF = false;
      damage(a, 1e6, true, __tpk.tete(a));                 // tête
      o.cls = __punch.pkHmFrame(.01, true);
      damage(b, b.maxHp * 1.2, false, __tpk.centre(b));     // corps
      __punch.PK.boom++; damage(c, c.maxHp * 1.2, false, __tpk.centre(c)); __punch.PK.boom--; // explosion
      __punch.PK.src = null;
      o.die = [a.pkDie, b.pkDie, c.pkDie];
      for (var i = 0; i < 18; i++) update(1 / 60);          // 0,3 s
      o.ax = a.body.rotation.x; o.bx = b.body.rotation.x; o.cz = c.body.position.z;
      for (var k = 0; k < 30; k++) update(1 / 60);
      o.ax2 = a.body.rotation.x; o.bx2 = b.body.rotation.x; o.cy2 = c.body.position.y;
      o.sons = sons; o.dying = __punch.PK.dying.length;
      // Réglage
      var btn = document.getElementById('btnTirFx');
      __punch.pkSetTir(false); o.saved = localStorage.getItem('dt_tirfx'); o.btn = btn ? btn.textContent : null;
      var d = __t.placer('walker', 0, -40); update(1 / 60); damage(d, 1e6, false, __tpk.centre(d));
      o.dieOff = d.pkDie || null; o.dyingOff = __punch.PK.dying.length;
      __punch.pkSetTir(true); o.saved2 = localStorage.getItem('dt_tirfx');
      if (avant) Snd.killConfirm = avant; else delete Snd.killConfirm;
      state = 'test';
      return o;
    });
    egal(r.cls, 'on kill head', 'Repère de mort par la tête');
    egal(r.die.join(','), 'tete,corps,boom', 'Chute selon le coup');
    ok(r.ax < -1.2, 'Tête : part vers l’arrière (' + r.ax + ')');
    ok(r.bx > 0 && r.bx2 > 1.4, 'Corps : s’affaisse puis tombe vers l’avant (' + r.bx + ', ' + r.bx2 + ')');
    ok(r.cz < -1, 'Explosion : projeté vers l’arrière (' + r.cz + ')');
    ok(Math.abs(r.cy2) < .2, 'Explosion : retombe au sol (' + r.cy2 + ')');
    ok(r.ax2 < -1.4, 'Tête : reste au sol (' + r.ax2 + ')');
    ok(r.sons >= 1 && r.sons <= 3, 'Son de mort appelé (Snd.killConfirm) : ' + r.sons);
    egal(r.saved, 'false', 'Réglage sauvegardé (dt_tirfx)');
    ok(r.btn === null || /Effets de tir : désactivés/.test(r.btn), 'Texte du bouton : ' + r.btn);
    egal(r.dieOff, null, 'Effets coupés : chute d’avant');
    egal(r.dyingOff, 0, 'Effets coupés : aucune chute suivie');
    egal(r.saved2, 'true', 'Réglage réactivé');
  });

  test('Tir : balles perdues (sol et mur) et sensation propre à chaque arme, sans toucher la visée', () => {
    exigerTir(); partie(); J(OUTILS);
    const r = J(function(){
      __punch.pkSetTir(true);
      var o = {};
      o.murs = impMurs();
      var org = EYE.clone(), dir = new THREE.Vector3(0, -.3, -1).normalize();
      o.sol = impactRate(org, dir, 0);
      if (IMP.murs.length){
        var c = new THREE.Vector3(); IMP.murs[0].getCenter(c); c.y = Math.min(c.y, 3);
        o.mur = impactRate(org, c.clone().sub(org).normalize(), 0);
      }
      o.plomb = impactRate(org, dir, 1);
      // Aucun objet créé : le pool de particules garde sa taille
      o.pool = parts.length;
      // Sensation : chaque arme du toit a son profil, et ils diffèrent
      o.profils = WORDER.filter(function(id){ return !!VM_FEEL[id]; }).length; o.armes = WORDER.length;
      o.pistol = VM_FEEL.pistol; o.shotgun = VM_FEEL.shotgun; o.minigun = VM_FEEL.minigun;
      // Le recul de la visée (recoilAcc) est le même avec ou sans effets
      var rec = function(on){
        __punch.pkSetTir(on); var z = __tpk.gros('brute', 0, -60);
        __tpk.tirer('shotgun', __tpk.centre(z)); var v = recoilAcc; clearZombies(); return v;
      };
      o.recOn = rec(true); var fov0 = baseFov; o.fov = camera.fov - fov0; o.fu = VMA.fu;
      o.recOff = rec(false);
      __punch.pkSetTir(true);
      for (var i = 0; i < 40; i++) visuals(1 / 60);
      o.fovFin = Math.abs(camera.fov - baseFov);
      state = 'test';
      return o;
    });
    ok(r.murs > 0, 'Murs relevés dans la rue : ' + r.murs);
    egal(r.sol, 'sol', 'Balle au sol : impact');
    egal(r.mur, 'mur', 'Balle dans un mur : éclats');
    egal(r.plomb, null, 'Plombs : un impact sur trois');
    egal(r.pool, 180, 'Pool de particules inchangé');
    egal(r.profils, r.armes, 'Chaque arme du toit a sa sensation');
    ok(r.pistol.dec > r.shotgun.dec && r.shotgun.up > r.pistol.up, 'Pistolet sec, pompe lourd');
    ok(r.minigun.vib > 0, 'Minigun vibrant');
    ok(Math.abs(r.recOn - r.recOff) < 1e-9, 'Recul de la visée inchangé : ' + r.recOn + ' contre ' + r.recOff);
    ok(r.fov > .5 && r.fu > .05, 'Coup du pompe : champ de vision ' + r.fov + ', canon ' + r.fu);
    ok(r.fovFin < .1, 'Le champ de vision revient : ' + r.fovFin);
  });
})();
