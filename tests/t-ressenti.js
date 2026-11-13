'use strict';
/* =====================================================================
   Tests du ressenti du tir (62-ressenti.js) : recul, impacts, sursaut, mort poussée, réglage Secousses
   À charger APRÈS tests.js dans tests/index.html (avant t-journal.js).
   Réutilise test(), J(), lire(), ok(), egal(), reset(), ignorer() de tests.js.
   ===================================================================== */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __ressenti === "object" && typeof __ressenti.rsSetSecousses === "function"') !== true) ignorer('Ressenti absent (62-ressenti.js)'); };
  // Partie à Saint-Clou, apparitions gelées, sans largage ni survivant
  const partie = () => {
    reset(); J('startLocation(0)');
    J(function(){
      __t.geler(); clearZombies(); if (typeof RUE === 'object' && RUE){ RUE.crateAt = []; RUE.civAt = -1; }
      state = 'playing'; S.bar = S.barMax = 1e9; shake = 0; recoilAcc = 0;
      __ressenti.rsStop(); __ressenti.rsSetSecousses(true);
      window.__trs = {
        // Tire avec l'arme id sur le torse (ou la tête) du zombie z
        tirer: function(id, z, tete){
          S.owned[id] = true; if (S.cur !== id) equip(id);
          __t.viser(z, tete); reloadT = 0; cool = 0; S.ammo[id] = 99; spin = 1; return fire();
        },
        gros: function(x, zp){ var z = __t.placer('brute', x || 0, zp || -30); z.hp = z.maxHp = 1e7; z.speed = 0; return z; },
        // Fait voler carreaux et roquettes jusqu'à la cible
        voler: function(n){ for (var i = 0; i < (n || 60); i++){ update(1 / 60); state = 'playing'; } }
      };
    });
  };

  test('Ressenti : chaque arme donne un recul (caméra, arme en main) et un impact sur le zombie', () => {
    exiger(); partie();
    const r = J(function(){
      var R = __ressenti.RS, out = {};
      Object.keys(WEAPONS).forEach(function(id){
        clearZombies(); var z = __trs.gros(0, -24);
        R.cp = R.vp = 0; kick = 0;
        var n0 = R.parArme[id] || 0, i0 = R.n.impact + R.n.sursaut + R.n.mort, ok = false;
        // le lance-flammes ne porte pas loin : zombie tout près
        if (WEAPONS[id].kind === 'flame'){ z.g.position.z = BAR_Z - 6; z.g.updateMatrixWorld(true); }
        for (var k = 0; k < 3; k++) ok = __trs.tirer(id, z) !== false || ok;
        var recul = (R.parArme[id] || 0) - n0, cam = R.cp + R.vp, kk = kick;
        if (WEAPONS[id].kind === 'bolt' || WEAPONS[id].kind === 'rocket') __trs.voler(90);
        else { update(1 / 60); state = 'playing'; }
        out[id] = { tir: ok, recul: recul, cam: cam, kick: kk, impact: R.n.impact + R.n.sursaut + R.n.mort - i0 };
      });
      state = 'test';
      return out;
    });
    Object.keys(r).forEach(id => {
      const o = r[id];
      ok(o.tir, id + ' : le tir part');
      ok(o.recul >= 1, id + ' : recul compté (' + o.recul + ')');
      ok(o.cam > 0, id + ' : la caméra monte au tir (' + o.cam + ')');
      ok(o.kick > 0, id + ' : l’arme en main recule (' + o.kick + ')');
      ok(o.impact >= 1, id + ' : un impact sur le zombie (' + o.impact + ')');
    });
  });

  test('Ressenti : le coup de caméra ne change pas où vont les balles', () => {
    exiger(); partie();
    const r = J(function(){
      var z = __trs.gros(0, -30), dirs = [];
      var set0 = ray.set;
      ray.set = function(o, d){ dirs.push([d.x, d.y, d.z]); return set0.apply(this, arguments); };
      try {
        [true, false].forEach(function(on){
          __ressenti.rsSetSecousses(on);
          __trs.tirer('pistol', z); // un premier tir : lance le coup de caméra
          // l'image pose le décalage sur la caméra, puis le tir suivant part
          __t.viser(z); shake = 0; recoilAcc = 0; pitch = camera.rotation.x; yaw = camera.rotation.y;
          visuals(1 / 60); shake = 0;
          dirs.length = 0;
          __t.graine(5, function(){ cool = 0; reloadT = 0; S.ammo.pistol = 9; fire(); });
          on ? (window.__d1 = dirs.slice()) : (window.__d0 = dirs.slice());
        });
      } finally { ray.set = set0; }
      var a = window.__d1[0], b = window.__d0[0];
      state = 'test';
      return { a: a, b: b };
    });
    ok(r.a && r.b, 'Directions lues');
    if (r.a && r.b) ok(Math.abs(r.a[0] - r.b[0]) < 1e-9 && Math.abs(r.a[1] - r.b[1]) < 1e-9 && Math.abs(r.a[2] - r.b[2]) < 1e-9, 'Même direction avec ou sans secousses : ' + r.a + ' / ' + r.b);
  });

  test('Ressenti : le sursaut ne bouge pas les cibles du zombie (pose remise après l’image)', () => {
    exiger(); partie();
    const r = J(function(){
      var z = __trs.gros(0, -26);
      __trs.tirer('shotgun', z);
      var o = { suivi: !!(z.rsFl && z.rsFl.z === z), avant: [z.body.rotation.x, z.body.rotation.z, z.head ? z.head.rotation.x : 0] };
      visuals(1 / 60); visuals(1 / 60);
      o.apres = [z.body.rotation.x, z.body.rotation.z, z.head ? z.head.rotation.x : 0];
      o.inst = !!z.inst;
      state = 'test';
      return o;
    });
    ok(r.suivi, 'Le zombie touché a un sursaut');
    ok(r.inst, 'Zombie dessiné par instances');
    egal(r.apres.join(','), r.avant.join(','), 'Pose remise après la copie des instances');
  });

  test('Ressenti : mort poussée dans le sens du tir, marqueur de tué et de tête', () => {
    exiger(); partie();
    const r = J(function(){
      var R = __ressenti.RS, o = {};
      var z = __t.placer('walker', 0, -26); z.speed = 0;
      var m0 = R.n.mort;
      __trs.tirer('sniper', z, true);
      o.mort = R.n.mort - m0; o.dead = !!z.dead; o.mk = R.mk; o.tete = R.mkHead;
      var b0 = z.body.position.z, el = document.getElementById('hitm');
      visuals(1 / 60); o.cls = el ? el.className : '';
      for (var i = 0; i < 20; i++) visuals(1 / 60);
      o.recule = z.body.position.z - b0; // la caméra regarde vers -z : le corps part vers -z
      o.clsFin = el ? el.className : '';
      state = 'test';
      return o;
    });
    ok(r.dead, 'Le zombie meurt');
    egal(r.mort, 1, 'Une mort poussée');
    egal(r.mk, 3, 'Marqueur de tué');
    ok(r.tete, 'Tué à la tête');
    ok(r.recule < -.1, 'Le corps part vers l’arrière : ' + r.recule);
    ok(/rs-tue/.test(r.cls) && /rs-tete/.test(r.cls), 'Classes du marqueur : ' + r.cls);
    ok(!/rs-tue|rs-tete/.test(r.clsFin), 'Le marqueur s’efface : ' + r.clsFin);
  });

  test('Ressenti : les pools ne grossissent pas après 500 tirs', () => {
    exiger(); partie();
    const r = J(function(){
      var X = __ressenti, o = { n0: [X.RS_PUFF.length, X.RS_GOUT.length, X.RS_FL.length], sc0: scene.children.length };
      var zs = []; for (var k = 0; k < 6; k++) zs.push(__trs.gros(-6 + k * 2.4, -22 - k * 3));
      ['minigun', 'shotgun', 'rifle', 'laser', 'mg50'].forEach(function(id, j){
        for (var i = 0; i < 100; i++){
          __trs.tirer(id, zs[(i + j) % zs.length], i % 3 === 0);
          if (i % 4 === 0){ update(1 / 60); state = 'playing'; visuals(1 / 60); }
        }
      });
      o.n1 = [X.RS_PUFF.length, X.RS_GOUT.length, X.RS_FL.length]; o.sc1 = scene.children.length;
      o.g = X.gouttes; o.e = X.eclats; o.s = X.sursauts; o.N = [X.RS_GOUT_N, X.RS_PUFF_N, X.RS_FL_N];
      state = 'test';
      return o;
    });
    egal(r.n1.join(','), r.n0.join(','), 'Taille des pools');
    egal(r.sc1, r.sc0, 'Rien d’ajouté à la scène');
    ok(r.g <= r.N[0] && r.e <= r.N[1] && r.s <= r.N[2], 'Actifs sous les plafonds : ' + [r.g, r.e, r.s].join(' / '));
  });

  test('Ressenti : rien ne se déclenche hors du toit (robot, RTS)', () => {
    exiger(); partie();
    const r = J(function(){
      var R = __ressenti.RS, z = __trs.gros(0, -26), o = {};
      var c0 = JSON.stringify(R.n);
      ['mech', 'rts'].forEach(function(st){
        state = st;
        damage(z, 10, true, z.g.position.clone());
        damage(z, 10, false, z.g.position.clone());
        __jeu.emit('image', 1 / 60);
      });
      o.memes = JSON.stringify(R.n) === c0; o.actif = R.actif; o.cam = R.camOn;
      // Un mode inscrit qui se dit actif coupe aussi les effets, même si state vaut 'playing'
      var m = __jeu.mode('essaiRessenti', { actif: function(){ return true; } });
      state = 'playing';
      damage(z, 10, false, z.g.position.clone());
      o.mode = JSON.stringify(R.n) === c0;
      delete __jeu.modes.essaiRessenti;
      state = 'test';
      return o;
    });
    ok(r.memes, 'Aucun effet compté en robot ou en RTS');
    ok(!r.actif && !r.cam, 'Rien d’actif, caméra intacte');
    ok(r.mode, 'Aucun effet quand un autre mode est actif');
  });

  test('Ressenti : le réglage Secousses coupe le coup de caméra et le gel, et il est sauvegardé', () => {
    exiger(); partie();
    const r = J(function(){
      var R = __ressenti.RS, o = {};
      var b = document.getElementById('btnSecousses');
      __ressenti.rsSetSecousses(false);
      o.saved = localStorage.getItem('dt_secousses'); o.btn = b ? b.textContent : null;
      var z = __t.placer('walker', 0, -26); z.speed = 0;
      R.cp = R.vp = 0; R.gel = 0; R.gelCd = 0;
      __trs.tirer('sniper', z, true);
      o.cam = R.cp + R.vp; o.gel = R.gel;
      visuals(1 / 60); o.camOn = R.camOn;
      if (b && b.click) b.click(); else __ressenti.rsSetSecousses(true);
      o.apres = R.on; o.saved2 = localStorage.getItem('dt_secousses');
      // Activé : le gel part sur un tir à la tête qui tue
      var z2 = __t.placer('walker', 1, -28); z2.speed = 0; R.gelCd = 0;
      __trs.tirer('sniper', z2, true); o.gelOn = R.gel;
      state = 'test';
      return o;
    });
    egal(r.saved, 'false', 'Réglage sauvegardé (dt_secousses)');
    ok(r.btn === null || /Secousses : coupées/.test(r.btn), 'Texte du bouton : ' + r.btn);
    egal(r.cam, 0, 'Pas de coup de caméra');
    egal(r.gel, 0, 'Pas de gel');
    ok(!r.camOn, 'Caméra intacte');
    ok(r.apres === true && r.saved2 === 'true', 'Réactivé par le bouton');
    ok(r.gelOn > 0, 'Gel sur un tir à la tête qui tue (réglage activé) : ' + r.gelOn);
  });
})();
