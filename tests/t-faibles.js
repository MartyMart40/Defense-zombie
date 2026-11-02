'use strict';
/* =====================================================================
   Tests des points faibles (07-zombies.js, 18-zombies-types.js) et des combos (26-combos.js)
   À charger APRÈS tests.js dans tests/index.html :
     <script src="t-faibles.js"></script>
   Réutilise test(), J(), ok(), egal(), reset(), ignorer() de tests.js.
   Les tests sont placés avant le test final « Erreurs ».
   ===================================================================== */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const avant = TESTS.length;
  const faibles = () => J('typeof weakHit === "function" && typeof ZKINDS !== "undefined" && !!ZKINDS.spitter && !!ZKINDS.spitter.onWeak');
  const combos = () => J('typeof __combos === "object" && typeof comboMult === "function"');
  const exigerF = () => { if (!faibles()) ignorer('Points faibles absents (weakHit ou ZKINDS.*.onWeak)'); };
  const exigerC = () => { if (!combos()) ignorer('Combos absents (26-combos.js non chargé)'); };
  // Outils installés dans le jeu (une fois par chargement)
  const outils = () => J(function(){
    if (window.__tf) return;
    var o = {};
    o.faibles = function(z){ return z.meshes.filter(function(m){ return !!m.userData.weak; }); };
    o.viserM = function(m){
      m.updateMatrixWorld(true);
      var c = new THREE.Vector3(); new THREE.Box3().setFromObject(m).getCenter(c); // centre réel (certains membres pivotent en haut)
      camera.position.copy(EYE); camera.lookAt(c); camera.updateMatrixWorld(true);
      zoomed = false; recoilAcc = 0;
    };
    o.ciel = function(){ camera.position.copy(EYE); camera.lookAt(EYE.x, EYE.y + 30, EYE.z - 10); camera.updateMatrixWorld(true); zoomed = false; recoilAcc = 0; };
    // Premier zombie touché par le rayon du réticule : le maillage
    o.premier = function(){
      var f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), r = new THREE.Raycaster(camera.position, f, 0, 260);
      var hs = r.intersectObjects(hitMeshes, false);
      for (var i = 0; i < hs.length; i++){ var z = hs[i].object.userData.z; if (z && !z.dead) return hs[i].object; }
      return null;
    };
    // Vise chacun des points faibles de z jusqu'à en trouver un que le réticule touche en premier
    o.viserFaible = function(z){
      var l = o.faibles(z);
      for (var i = 0; i < l.length; i++){ o.viserM(l[i]); var p = o.premier(); if (p && p.userData.weak && p.userData.z === z) return p; }
      return null;
    };
    o.robuste = function(z, hp){ z.hp = z.maxHp = hp; };
    o.tirer = function(id){ if (id){ S.owned[id] = true; equip(id); } reloadT = 0; cool = 0; S.ammo[S.cur] = 99; spin = 1; return fire(); };
    o.projectiles = function(n){ for (var i = 0; i < (n || 90); i++){ scene.updateMatrixWorld(); armStep(1 / 60); } };
    window.__tf = o;
  });
  const partie = () => { reset(); J('startLocation(0)'); J('__t.geler()'); outils(); };

  test('Points faibles : chaque type spécial en a, pas le marcheur ni le boss', () => {
    exigerF(); partie();
    const r = J(function(){
      var out = {};
      ['walker', 'spitter', 'flyer', 'colossus', 'jumper'].forEach(function(t){
        clearZombies(); var z = __t.placer(t, 0, -30);
        out[t] = __tf.faibles(z).map(function(m){ return m.userData.weak.effet + ':' + m.userData.weak.mult; });
      });
      clearZombies();
      if (ZKINDS.boss && typeof bossReady === 'function' && bossReady()){ var b = __t.placer('boss', 0, -60); out.boss = __tf.faibles(b).length; out.bossTete = b.meshes.indexOf(b.head) >= 0 && !b.head.userData.weak; clearZombies(); }
      return out;
    });
    egal(r.walker.length, 0, 'Points faibles du marcheur');
    ok(r.spitter.length >= 3 && r.spitter.every(s => s.indexOf('acide:') === 0), 'Cracheur : poches d\'acide ' + r.spitter.join(', '));
    ok(r.flyer.length >= 2 && r.flyer.every(s => s.indexOf('aile:') === 0), 'Volant : ailes ' + r.flyer.join(', '));
    ok(r.colossus.length >= 1 && r.colossus.every(s => s.indexOf('plaque:') === 0), 'Colosse : plaque ' + r.colossus.join(', '));
    ok(r.jumper.length >= 2 && r.jumper.every(s => s.indexOf('jambe:') === 0), 'Sauteur : jambes ' + r.jumper.join(', '));
    ['spitter', 'flyer', 'colossus', 'jumper'].forEach(t => ok(r[t].every(s => +s.split(':')[1] > 1), t + ' : multiplicateur > 1'));
    if (r.boss !== undefined){ egal(r.boss, 0, 'Points faibles du boss (sa tête suffit)'); ok(r.bossTete, 'La tête du boss doit rester sa faiblesse'); }
  });

  test('Points faibles : dégâts multipliés (plaque du colosse, jambe, aile)', () => {
    exigerF(); partie();
    const r = J(function(){
      var out = {};
      ['colossus', 'jumper', 'flyer'].forEach(function(t){
        clearZombies();
        var z = __t.placer(t, 0, -30); __tf.robuste(z, 1e5);
        var m = __tf.faibles(z)[0], corps = z.meshes.filter(function(x){ return !x.userData.weak && x !== z.head; })[0];
        var h0 = z.hp; weakHit(z, m, 10, z.g.position.clone()); var dFaible = h0 - z.hp;
        h0 = z.hp; damage(z, 10, false, z.g.position.clone()); var dCorps = h0 - z.hp;
        out[t] = { ratio: dFaible / dCorps, mult: m.userData.weak.mult, corps: !!corps };
      });
      clearZombies();
      return out;
    });
    Object.keys(r).forEach(t => ok(Math.abs(r[t].ratio - r[t].mult) < 1e-6, t + ' : rapport ' + r[t].ratio.toFixed(2) + ' au lieu de ' + r[t].mult));
    ok(r.colossus.mult >= 2.5, 'Le colosse doit prendre beaucoup plus de dégâts sur sa plaque : ×' + r.colossus.mult);
  });

  test('Points faibles : un tir de pistolet sur la plaque du colosse fait ×3 et le sonne', () => {
    exigerF(); partie();
    const r = J(function(){
      clearZombies();
      var fl0 = document.getElementById('floats'); if (fl0) fl0.innerHTML = ''; // textes flottants laissés par les tests précédents
      var z = __t.placer('colossus', 0, -18); __tf.robuste(z, 1e5);
      var plaque = __tf.faibles(z)[0];
      __tf.viserM(plaque); var vise = __tf.premier() === plaque;
      var h0 = z.hp; __tf.tirer('pistol'); var dPlaque = h0 - z.hp, stun = z.stunT;
      __tf.viserM(z.meshes[1]); var corps = __tf.premier(), corpsOk = !!corps && !corps.userData.weak && !corps.userData.head;
      h0 = z.hp; __tf.tirer(); var dCorps = h0 - z.hp;
      var texte = false; var fl = document.getElementById('floats');
      if (fl && fl.children) for (var i = 0; i < fl.children.length; i++) if (/Point faible/.test(fl.children[i].textContent) && /weak/.test(fl.children[i].className)) texte = true;
      clearZombies();
      return { vise: vise, corpsOk: corpsOk, dPlaque: dPlaque, dCorps: dCorps, stun: stun, wk: weakT > 0, texte: texte };
    });
    ok(r.vise, 'Le réticule pointé sur la plaque doit la toucher en premier (plaque cachée ?)');
    ok(r.corpsOk, 'Le tir témoin doit toucher le ventre (ni tête ni plaque)');
    ok(r.dCorps > 0, 'Tir au corps sans effet');
    ok(Math.abs(r.dPlaque / r.dCorps - 3) < .01, 'Plaque : ' + r.dPlaque + ' contre ' + r.dCorps + ' au corps');
    ok(r.stun > 0, 'Le colosse doit être sonné');
    ok(r.wk, 'Marqueur de point faible (weakT) pas allumé');
    ok(r.texte, 'Texte « Point faible ! » (classe weak) absent');
  });

  test('Points faibles : la poche du cracheur éclate et l\'acide blesse les voisins', () => {
    exigerF(); partie();
    const r = J(function(){
      clearZombies();
      var s = __t.placer('spitter', 0, -18);
      var pres = __t.placer('walker', 1.2, -21), loin = __t.placer('walker', 9, -18);
      __tf.robuste(pres, 1e4); __tf.robuste(loin, 1e4);
      var cible = __tf.viserFaible(s);
      if (!cible) return { vise: false };
      var hp0 = s.hp, max = s.maxHp;
      __tf.tirer('pistol');
      return { vise: true, mort: !!s.dead, perte: hp0 - Math.max(0, s.hp), attendu: wDmg('pistol') * cible.userData.weak.mult + SPIT_POP.self * max, max: max,
        cachee: !cible.visible, retiree: hitMeshes.indexOf(cible) < 0 && s.meshes.indexOf(cible) < 0,
        pres: 1e4 - pres.hp, loin: 1e4 - loin.hp };
    });
    ok(r.vise, 'Aucune poche d\'acide visible depuis le toit');
    ok(r.mort || r.perte >= r.attendu - 1e-6, 'Le cracheur doit mourir ou être gravement blessé : perte ' + r.perte + ' sur ' + r.max);
    ok(r.cachee && r.retiree, 'La poche éclatée doit disparaître et ne plus être touchable');
    ok(r.pres > 0, 'Le zombie voisin n\'a pas reçu d\'acide');
    egal(r.loin, 0, 'Dégâts au zombie loin de l\'éclaboussure');
  });

  test('Points faibles : volant touché à l\'aile, il tombe et rampe', () => {
    exigerF(); partie();
    const r = J(function(){
      clearZombies();
      var z = __t.placer('flyer', 0, -26); z.g.position.y = z.alt; z.g.updateMatrixWorld(true); __tf.robuste(z, 1000);
      var cible = __tf.viserFaible(z);
      if (!cible) return { vise: false };
      __tf.tirer('pistol'); var apres1 = z.downed || null;
      __tf.viserFaible(z); __tf.tirer();
      var tombe = z.downed, hp0 = z.hp;
      __t.sim(2.5);
      var y = z.g.position.y, st = z.downed, perte = hp0 - z.hp, z0 = z.g.position.z;
      __t.sim(2);
      var avance = z.g.position.z - z0, vol = z.speed * 2;
      // Un gros coup suffit
      var z2 = __t.placer('flyer', 5, -40); z2.g.position.y = z2.alt; __tf.robuste(z2, 1000);
      weakHit(z2, __tf.faibles(z2)[0], 1000 * .4 / __tf.faibles(z2)[0].userData.weak.mult + 1, z2.g.position.clone());
      var gros = z2.downed;
      clearZombies();
      return { vise: true, apres1: apres1, tombe: tombe, y: y, st: st, perte: perte, avance: avance, vol: vol, gros: gros, mort: !!z.dead };
    });
    ok(r.vise, 'Aucune aile visible depuis le toit');
    egal(r.apres1, null, 'Une seule petite balle ne doit pas encore le faire tomber');
    ok(!!r.tombe, 'Deux balles dans l\'aile doivent le faire tomber');
    ok(r.y < .01, 'Il doit finir au sol : hauteur ' + r.y);
    ok(r.mort || r.st === 'crawl', 'Au sol, il rampe ou meurt : ' + r.st);
    ok(r.perte >= 400, 'La chute doit le blesser gravement : ' + r.perte);
    if (!r.mort) ok(r.avance >= 0 && r.avance < r.vol * .5, 'Il doit ramper lentement : ' + r.avance.toFixed(2) + ' m en 2 s');
    ok(!!r.gros, 'Un gros coup dans l\'aile doit suffire');
  });

  test('Points faibles : sauteur touché aux jambes, il ne saute plus et marche lentement', () => {
    exigerF(); partie();
    const r = J(function(){
      clearZombies();
      var z = __t.placer('jumper', 0, -20); __tf.robuste(z, 1000);
      var cible = __tf.viserFaible(z);
      if (!cible) return { vise: false };
      __tf.tirer('pistol');
      var lame = !!z.lame, z0 = z.g.position.z, maxY = 0;
      for (var k = 0; k < 90; k++){ update(1 / 30); if (z.g.position.y > maxY) maxY = z.g.position.y; }
      var avance = z.g.position.z - z0;
      // Un sauteur sain bondit
      var s = __t.placer('jumper', 6, -60), sy = 0, s0 = s.g.position.z;
      for (k = 0; k < 90; k++){ update(1 / 30); if (s.g.position.y > sy) sy = s.g.position.y; }
      var sain = s.g.position.z - s0;
      clearZombies();
      return { vise: true, lame: lame, maxY: maxY, avance: avance, sain: sain, sy: sy };
    });
    ok(r.vise, 'Aucune jambe visible depuis le toit');
    ok(r.lame, 'La jambe touchée doit l\'estropier');
    ok(r.maxY < .01, 'Il ne doit plus sauter : hauteur max ' + r.maxY.toFixed(2));
    ok(r.avance > 0 && r.avance < r.sain * .5, 'Il doit avancer lentement : ' + r.avance.toFixed(2) + ' m contre ' + r.sain.toFixed(2) + ' m pour un sauteur sain');
    ok(r.sy > .5, 'Le sauteur sain doit bondir (témoin)');
  });

  test('Points faibles : carreau d\'arbalète et plombs du fusil à pompe', () => {
    exigerF(); partie();
    if (!J('typeof armStep === "function" && !!WEAPONS.crossbow')) ignorer('Arbalète absente');
    const r = J(function(){
      clearZombies();
      var z = __t.placer('colossus', 0, -16); __tf.robuste(z, 1e6);
      var plaque = __tf.faibles(z)[0];
      __tf.viserM(plaque); var w0 = z.wkHits || 0, h0 = z.hp;
      __tf.tirer('crossbow'); __tf.projectiles(60);
      var carreau = (z.wkHits || 0) - w0, dC = h0 - z.hp;
      __tf.viserM(plaque); w0 = z.wkHits || 0;
      for (var k = 0; k < 4 && (z.wkHits || 0) === w0; k++){ __tf.viserM(plaque); __tf.tirer('shotgun'); } // dispersion : jusqu'à 4 cartouches
      var plombs = (z.wkHits || 0) - w0;
      clearZombies();
      return { carreau: carreau, dC: dC, attendu: wDmg('crossbow') * plaque.userData.weak.mult, plombs: plombs };
    });
    ok(r.carreau >= 1, 'Le carreau doit toucher la plaque comme point faible');
    ok(r.dC >= r.attendu - 1e-6, 'Carreau sur la plaque : ' + r.dC + ' au lieu d\'au moins ' + r.attendu);
    ok(r.plombs >= 1, 'Au moins un plomb doit toucher la plaque comme point faible');
  });

  test('Combos : le compteur monte avec tes tirs et le multiplicateur suit les paliers', () => {
    exigerC(); partie();
    const r = J(function(){
      clearZombies();
      var n = 0, mults = [];
      for (var i = 0; i < 10; i++){
        var z = __t.placer('walker', -8 + (i % 5) * 4, -20 - Math.floor(i / 5) * 3);
        var c = 0; while (!z.dead && c < 10){ __t.viser(z, true); __tf.tirer('pistol'); c++; }
        mults.push(comboMult());
      }
      n = CB.n;
      var hud = (updateHUD(), CB.el ? CB.el.className : '');
      return { n: n, m5: mults[4], m4: mults[3], m10: mults[9], best: S.comboBest, hud: hud, p: [comboMult(0), comboMult(4), comboMult(5), comboMult(10), comboMult(20), comboMult(40), comboMult(1000)] };
    });
    egal(r.n, 10, 'Combo après 10 abattus');
    egal(r.m4, 1, 'Multiplicateur à 4');
    egal(r.m5, 1.1, 'Multiplicateur à 5');
    egal(r.m10, 1.25, 'Multiplicateur à 10');
    egal(r.best, 10, 'Meilleur combo de la partie');
    egal(JSON.stringify(r.p), JSON.stringify([1, 1, 1.1, 1.25, 1.5, 2, 2.5]), 'Paliers');
    ok(/cb-on/.test(r.hud), 'Affichage du combo pas allumé : ' + r.hud);
  });

  test('Combos : l\'argent est multiplié, les défenses ne font pas monter le combo', () => {
    exigerC(); partie();
    const r = J(function(){
      clearZombies();
      CB.n = 9; CB.t = COMBO_DELAI;
      var z = __t.placer('walker', 0, -30), m0 = S.money;
      CB.ctx++; damage(z, 1e9, false, z.g.position.clone()); CB.ctx--;
      var payTir = S.money - m0, attTir = Math.round(z.reward * (1 + .08 * T('scavenger')) * 1.25), nTir = CB.n;
      var d = __t.placer('walker', 3, -30); m0 = S.money;
      kill(d, false, d.g.position.clone()); // comme une tourelle (defHit)
      var payDef = S.money - m0, attDef = Math.round(d.reward * (1 + .08 * T('scavenger')) * 1.25), nDef = CB.n;
      comboEnd();
      var e = __t.placer('walker', -3, -30); m0 = S.money;
      kill(e, false, e.g.position.clone());
      var payZero = S.money - m0, attZero = Math.round(e.reward * (1 + .08 * T('scavenger')));
      clearZombies();
      return { payTir: payTir, attTir: attTir, nTir: nTir, payDef: payDef, attDef: attDef, nDef: nDef, payZero: payZero, attZero: attZero };
    });
    egal(r.nTir, 10, 'Combo après un abattu de ton tir');
    egal(r.payTir, r.attTir, 'Paie avec ×1,25');
    egal(r.nDef, 10, 'Un abattu par une défense ne doit pas faire monter le combo');
    egal(r.payDef, r.attDef, 'Paie d\'une défense pendant le combo (multipliée)');
    egal(r.payZero, r.attZero, 'Paie sans combo');
  });

  test('Combos : un tir raté remet à zéro, un tir qui touche sans tuer non', () => {
    exigerC(); partie();
    const r = J(function(){
      clearZombies();
      for (var i = 0; i < 3; i++){ var z = __t.placer('walker', -4 + i * 4, -20); var c = 0; while (!z.dead && c < 10){ __t.viser(z, true); __tf.tirer('pistol'); c++; } }
      var n3 = CB.n;
      var g = __t.placer('walker', 0, -24); __tf.robuste(g, 1e6); __t.viser(g, false); __tf.tirer();
      var nTouche = CB.n;
      __tf.ciel(); __tf.tirer();
      var nRate = CB.n;
      // Carreau qui ne touche personne
      CB.n = 4; CB.t = COMBO_DELAI;
      var carreau = null;
      if (typeof armStep === 'function' && WEAPONS.crossbow){ __tf.ciel(); camera.lookAt(EYE.x + 8, EYE.y - 2, EYE.z - 30); camera.updateMatrixWorld(true); __tf.tirer('crossbow'); __tf.projectiles(200); carreau = CB.n; }
      clearZombies();
      return { n3: n3, nTouche: nTouche, nRate: nRate, carreau: carreau };
    });
    egal(r.n3, 3, 'Combo après 3 abattus');
    egal(r.nTouche, 3, 'Toucher sans tuer garde le combo');
    egal(r.nRate, 0, 'Combo après un tir raté');
    if (r.carreau !== null) egal(r.carreau, 0, 'Combo après un carreau raté');
  });

  test('Combos : remise à zéro après le délai sans abattre', () => {
    exigerC(); partie();
    const r = J(function(){
      clearZombies();
      for (var i = 0; i < 2; i++){ var z = __t.placer('walker', -2 + i * 4, -20); var c = 0; while (!z.dead && c < 10){ __t.viser(z, true); __tf.tirer('pistol'); c++; } }
      var n0 = CB.n;
      __t.placer('walker', 0, -110); // garde la vague ouverte
      __t.sim(COMBO_DELAI * .5);
      var mi = CB.n;
      __t.sim(COMBO_DELAI * .5 + .3);
      var fin = CB.n;
      clearZombies();
      return { n0: n0, mi: mi, fin: fin };
    });
    egal(r.n0, 2, 'Combo de départ');
    egal(r.mi, 2, 'Combo à mi-délai');
    egal(r.fin, 0, 'Combo après le délai');
  });

  test('Combos : record sauvegardé dans le profil et affiché en fin de partie', () => {
    exigerC(); partie();
    const r = J(function(){
      var defaut = P.comboBest;
      clearZombies();
      for (var i = 0; i < 6; i++){ var z = __t.placer('walker', -10 + i * 4, -20); var c = 0; while (!z.dead && c < 10){ __t.viser(z, true); __tf.tirer('pistol'); c++; } }
      var n = CB.n;
      comboEnd();
      var sauve = JSON.parse(localStorage.getItem('dt_prof') || '{}').comboBest;
      gameOver();
      var fin = document.getElementById('overStats').innerHTML, msg = document.getElementById('overBest').textContent;
      return { defaut: defaut, n: n, best: P.comboBest, sauve: sauve, fin: fin, msg: msg };
    });
    egal(r.defaut, 0, 'Record par défaut');
    egal(r.n, 6, 'Combo');
    egal(r.best, 6, 'P.comboBest');
    egal(r.sauve, 6, 'comboBest dans dt_prof');
    ok(/Meilleur combo : <strong>6<\/strong>/.test(r.fin), 'Meilleur combo absent de l\'écran de fin : ' + r.fin);
    ok(/record de combo/i.test(r.msg), 'Message de nouveau record absent : ' + r.msg);
  });

  // Les tests ajoutés passent avant le test final « Erreurs »
  const ajoutes = TESTS.splice(avant);
  const iErr = TESTS.findIndex(t => t.nom.indexOf('Erreurs') === 0);
  TESTS.splice(iErr < 0 ? TESTS.length : iErr, 0, ...ajoutes);
})();
