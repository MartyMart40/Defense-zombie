'use strict';
/* Tests : choisir les unités du RTS une par une (js/44-rts-interface.js rtsTapUnit, rtsPick ; js/48-rts-liste.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __rtsListe === "object" && typeof __rts.rtsTapUnit === "function"') !== true) ignorer('Choix des unités une par une absent (js/48-rts-liste.js)'); };
  const calme = 'function calme(){ __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies(); return R; }';
  const fin = () => J(function(){ if (__rts.RTS.on) __rts.rtsQuit(); });

  test('RTS sélection : toucher une unité la choisit seule, appui long l’ajoute au groupe', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), u = R.units, T = __rts.rtsTapUnit, o = {};
      T(u[0], 'tap'); T(u[1], 'tap'); o.seule = R.sel.length === 1 && R.sel[0] === u[1];
      T(u[2], 'long'); o.groupe = R.sel.length === 2 && R.sel.indexOf(u[2]) >= 0;
      T(u[1], 'long'); o.retire = R.sel.length === 1 && R.sel[0] === u[2];
      T(u[2], 'tap'); o.relache = R.sel.length === 0;
      T(u[0], 'click'); T(u[1], 'add'); o.maj = R.sel.length === 2;
      T(u[1], 'add'); o.majRetire = R.sel.length === 1 && R.sel[0] === u[0];
      return o;
    `));
    fin();
    ok(r.seule, 'Toucher une autre unité doit la choisir seule');
    ok(r.groupe, 'Appui long : ajoutée au groupe'); ok(r.retire, 'Appui long sur une unité du groupe : retirée');
    ok(r.relache, 'Retoucher la seule unité choisie la relâche');
    ok(r.maj && r.majRetire, 'Maj+clic ajoute puis retire');
  });

  test('RTS sélection : pas besoin de toucher le modèle exactement', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), u = R.units[0], o = {};
      R.units.forEach(function(x){ if (x !== u){ x.g.position.set(25, 0, 10); x.tx = x.hx = 25; x.tz = x.hz = 10; } }); u.g.position.set(-3, 0, -12); u.cmd = 'idle';
      for (var i = 0; i < 3; i++) visuals(1 / 30);
      camera.updateMatrixWorld(); var v = u.g.position.clone().project(camera);
      var sx = (v.x + 1) / 2 * innerWidth, sy = (1 - v.y) / 2 * innerHeight;
      o.pres = __rts.rtsUnitNear(sx + 15, sy + 8, __rts.RTS_TAP_R) === u;
      o.loin = __rts.rtsUnitNear(sx + 200, sy + 200, __rts.RTS_TAP_R) === null || __rts.rtsUnitNear(sx + 200, sy + 200, __rts.RTS_TAP_R) !== u;
      return o;
    `));
    fin();
    ok(r.pres, 'Une unité à 17 pixels du doigt doit être prise');
    ok(r.loin, 'Une unité loin du doigt ne doit pas être prise');
  });

  test('RTS sélection : la rangée « Unités » montre chaque unité et la choisit seule', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), L = __rtsListe, o = {};
      S.money = 99999; __rts.rtsBuy('gunner'); __rts.rtsTab('rob'); (L.rtsRosterOuvrir ? L.rtsRosterOuvrir(true) : L.rtsRosterDraw(true));
      var el = document.getElementById('rtRoster'), btns = el.querySelectorAll('button[data-id]');
      o.visible = !el.classList.contains('hide'); o.n = btns.length; o.robots = R.units.filter(function(u){ return !u.dead && u.U.cat === 'rob'; }).length;
      o.txt = btns[0] ? btns[0].textContent : '';
      var loin = R.units[1]; loin.g.position.set(40, 0, -60);
      var b = [].slice.call(btns).filter(function(x){ return +x.dataset.id === L.rtsId(loin); })[0];
      b.click(); o.choisie = R.sel.length === 1 && R.sel[0] === loin; o.camera = Math.abs(R.cam.x - 40) < .01 && Math.abs(R.cam.z + 60) < .01;
      o.allume = !!document.querySelector('#rtRoster .rt-u.on');
      document.querySelector('#rtRoster button[data-id="' + L.rtsId(loin) + '"]').click(); o.relache = R.sel.length === 0;
      loin.hp = loin.maxHp * .2; L.rtsRosterDraw(true); o.bas = !!document.querySelector('#rtRoster b.bas');
      __rts.rtsTab('bat'); L.rtsRosterDraw(false); o.cacheBat = el.classList.contains('hide');
      __rts.rtsTab('rob'); __rts.rtsFold(true); o.cachePlie = getComputedStyle(el).display === 'none'; __rts.rtsFold(false);
      return o;
    `));
    fin();
    ok(r.visible, 'La rangée doit être visible dans l’onglet Robots');
    egal(r.n, r.robots, 'Une pastille par robot');
    ok(/Fantassin 1/.test(r.txt), 'Texte de la pastille : ' + r.txt);
    ok(r.choisie, 'Toucher la pastille choisit l’unité seule'); ok(r.camera, 'La caméra va sur l’unité, même loin');
    ok(r.allume, 'La pastille choisie est allumée'); ok(r.relache, 'Retoucher la pastille relâche l’unité');
    ok(r.bas, 'Vie basse en rouge'); ok(r.cacheBat, 'Pas de rangée dans l’onglet Bâtiments'); ok(r.cachePlie, 'Pas de rangée quand le menu est replié');
  });

  test('RTS sélection : Tab passe d’une unité à l’autre, double-clic prend le même type', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), L = __rtsListe, o = {};
      for (var i = 0; i < 3; i++) visuals(1 / 30);
      var a = L.rtsCycle(1), b = L.rtsCycle(1), c = L.rtsCycle(-1);
      o.cycle = a !== b && c === a && R.sel.length === 1 && R.sel[0] === a;
      document.dispatchEvent(new KeyboardEvent('keydown', { code:'Tab', bubbles:true })); o.tab = R.sel.length === 1 && R.sel[0] === b;
      S.money = 99999; __rts.rtsBuy('gunner'); for (var j = 0; j < 3; j++) visuals(1 / 30);
      var lst = L.rtsSameType(R.units[0]);
      o.meme = lst.length >= 2 && lst.every(function(u){ return u.type === 'rifle'; }) && R.sel.every(function(u){ return u.type === 'rifle'; });
      return o;
    `));
    fin();
    ok(r.cycle, 'Unité suivante puis précédente'); ok(r.tab, 'La touche Tab passe à la suivante');
    ok(r.meme, 'Même type : seulement les fantassins');
  });

  test('RTS sélection : groupes enregistrés (pastilles, touches, sauvegarde)', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), L = __rtsListe, o = {};
      S.money = 99999; __rts.rtsBuy('gunner'); __rts.rtsBuy('sniper'); __rts.rtsTab('rob');
      var u = R.units;
      __rts.rtsSelect([u[0], u[1]], false); L.rtsRosterDraw(true);
      var plus = document.querySelector('#rtRoster button[data-gplus]'); o.plus = !!plus; plus.click();
      o.g1 = L.rtsGrpOf(0).length === 2;
      __rts.rtsSelect([u[3]], false);
      document.dispatchEvent(new KeyboardEvent('keydown', { code:'Digit2', ctrlKey:true, bubbles:true })); o.ctrl = L.rtsGrpOf(1).length === 1 && L.rtsGrpOf(1)[0] === u[3];
      var argent = S.money; document.dispatchEvent(new KeyboardEvent('keydown', { code:'Digit1', shiftKey:true, bubbles:true }));
      o.maj = R.sel.length === 2 && R.sel.indexOf(u[0]) >= 0 && R.sel.indexOf(u[1]) >= 0 && S.money === argent;
      L.rtsRosterDraw(true); var b = document.querySelector('#rtRoster button[data-g="0"]'); o.allume = !!b && b.classList.contains('on');
      u[0].g.position.set(30, 0, -50); u[1].g.position.set(10, 0, -50); b.click(); o.camera = Math.abs(R.cam.x - 20) < .01 && Math.abs(R.cam.z + 50) < .01;
      R.sel.length = 0; L.rtsGroupSave(1); o.supprime = L.rtsGrpOf(1).length === 0;
      u[1].hp = 0; u[1].dead = true; o.mort = L.rtsGrpOf(0).length === 1;
      u[1].dead = false; u[1].hp = u[1].maxHp;
      __rtsSave.rtsSave(); __rts.rtsQuit(); __rts.rtsStart(__rtsSave.rtsSaveGet()); R = __rts.RTS;
      o.repris = L.rtsGrpOf(0).length === 2 && L.rtsGrpOf(0).every(function(x){ return x.type === 'rifle'; });
      return o;
    `));
    fin();
    ok(r.plus, 'Pastille ＋ Groupe'); ok(r.g1, 'Groupe 1 enregistré'); ok(r.ctrl, 'Ctrl+2 enregistre le groupe 2');
    ok(r.maj, 'Maj+1 rappelle le groupe 1 sans rien acheter'); ok(r.allume, 'Pastille du groupe choisi allumée');
    ok(r.camera, 'Retoucher le groupe : la caméra va au milieu du groupe'); ok(r.supprime, 'Sans unité choisie, le groupe est supprimé');
    ok(r.mort, 'Une unité morte sort du groupe'); ok(r.repris, 'Les groupes sont gardés dans la sauvegarde');
  });

  test('RTS sélection : la liste des unités est fermée par défaut et s\'ouvre avec « Unités »', () => {
    exiger(); reset();
    if (lire('typeof __rtsListe.rtsRosterOuvrir') !== 'function') ignorer('Liste repliable absente');
    const r = J(new Function(calme + `
      var R = calme(), L = __rtsListe, o = {};
      L.rtsRosterOuvrir(false);
      S.money = 99999; for (var i = 0; i < 6; i++) __rts.rtsBuy('rifle'); __rts.rtsTab('rob'); L.rtsRosterDraw(true);
      var el = document.getElementById('rtRoster'), tog = el.querySelector('button[data-tog]');
      o.tog = !!tog; o.txt = tog && tog.textContent; o.fermee = el.querySelectorAll('button[data-id]').length;
      tog.click(); o.ouverte = el.querySelectorAll('button[data-id]').length; o.garde = store.get('dt_rts_liste', null);
      el.querySelector('button[data-id]').click(); o.choisi = R.sel.length === 1; o.resteOuverte = el.querySelectorAll('button[data-id]').length;
      el.querySelector('button[data-tog]').click(); o.refermee = el.querySelectorAll('button[data-id]').length;
      return o;
    `));
    fin();
    ok(r.tog && /Unités · \d+/.test(r.txt), 'Pastille « Unités » avec le nombre : ' + r.txt);
    egal(r.fermee, 0, 'Fermée : aucune pastille d\'unité');
    ok(r.ouverte >= 6, 'Ouverte : une pastille par unité (' + r.ouverte + ')');
    egal(r.garde, true, 'Ouverte gardée (dt_rts_liste)');
    ok(r.choisi && r.resteOuverte >= 6, 'Toucher une unité la choisit, la liste reste ouverte');
    egal(r.refermee, 0, 'Retoucher « Unités » referme la liste');
  });
})();

