'use strict';
/* Tests de la visée du toit (js/66-visee.js, tâche 104) : chaque arme et chaque optique rapproche vraiment,
   une lunette donne le cadre de lunette et cache l'arme, le point rouge et les mires gardent l'arme à l'œil. */
(function(){
  if (typeof test !== 'function') return;
  const pret = () => lire('typeof viseeK === "function" && typeof viseeOptique === "function" && typeof __ars === "object"') === true;
  const exiger = () => { if (!pret()) ignorer('Visée absente (js/66-visee.js)'); };
  function partie(){
    reset(); J('startLocation(0)'); J('__t.geler()');
    J(function(){ clearZombies(); S.money = 1e8; WORDER.forEach(function(id){ S.owned[id] = true; S.ammo[id] = magSize(id); }); });
  }
  // Mesure, pour chaque arme et chaque optique qui s'y monte : champ au repos, champ en visée, cadre de lunette, arme visible
  function mesurer(){
    return J(function(){
      var res = [], st0 = state;
      state = 'playing';
      WORDER.forEach(function(id){
        ['', 'reddot', 'scope'].forEach(function(o){
          if (o && __ars.ACC[o].on.indexOf(id) < 0) return;
          S.acc = {}; __ars.accSync(id); if (o) __ars.accBuy(id, o);
          equip(id); reloadT = 0; zoomed = false;
          for (var i = 0; i < 40; i++) visuals(1 / 30);
          var repos = camera.fov;
          zoomed = true; for (var k = 0; k < 40; k++) visuals(1 / 30); updateHUD();
          res.push({ id: id, o: o || 'aucune', optique: viseeOptique(id), repos: repos, vise: camera.fov, cadre: document.getElementById('scope').classList.contains('on'),
            x4: document.getElementById('scope').classList.contains('x4'), arme: vmRoot.visible });
          zoomed = false; for (var j = 0; j < 40; j++) visuals(1 / 30); updateHUD();
        });
      });
      S.acc = {}; WORDER.forEach(function(id){ __ars.accSync(id); }); zoomed = false; state = st0; equip('pistol');
      return res;
    });
  }

  test('Visée : chaque arme et chaque optique rapproche vraiment (champ de vision au moins 10 % plus petit)', () => {
    exiger(); partie();
    const r = mesurer();
    ok(r.length >= 25, 'Cas mesurés : ' + r.length);
    r.forEach(c => {
      const k = c.vise / c.repos;
      ok(k <= .9, c.id + ' + ' + c.o + ' : champ en visée ' + c.vise.toFixed(1) + ' pour ' + c.repos.toFixed(1) + ' au repos');
      if (c.optique === 'lunette') ok(k <= .26, c.id + ' + lunette ×4 : zoom trop faible (' + (1 / k).toFixed(2) + ')');
      if (c.optique === 'origine') ok(k <= .3, c.id + ' : lunette d’origine trop faible');
      if (c.optique === 'mires') ok(k >= .55, c.id + ' sans optique : trop de zoom pour des mires (' + (1 / k).toFixed(2) + ')');
    });
    // Le point rouge rapproche plus que les mires de la même arme ; la lunette plus que le point rouge
    const par = {}; r.forEach(c => { par[c.id] = par[c.id] || {}; par[c.id][c.o] = c.vise; });
    Object.keys(par).forEach(id => {
      const p = par[id];
      if (p.reddot != null) ok(p.reddot < p.aucune, id + ' : le point rouge ne rapproche pas plus que les mires');
      if (p.scope != null) ok(p.scope < (p.reddot != null ? p.reddot : p.aucune), id + ' : la lunette ne rapproche pas plus');
    });
  });

  test('Visée : une lunette donne le cadre de lunette et cache l’arme ; point rouge et mires gardent l’arme à l’œil', () => {
    exiger(); partie();
    const r = mesurer();
    r.forEach(c => {
      const lun = c.optique === 'lunette' || c.optique === 'origine';
      egal(c.cadre, lun, c.id + ' + ' + c.o + ' : cadre de lunette');
      egal(c.arme, !lun, c.id + ' + ' + c.o + ' : arme en main visible');
      egal(c.x4, c.optique === 'lunette', c.id + ' + ' + c.o + ' : réticule de la lunette ×4');
    });
    ok(r.some(c => c.id === 'laser' && c.optique === 'lunette' && c.cadre), 'Le laser avec une lunette montre le cadre');
    // En sortant de la visée, le cadre s'en va
    const apres = J(function(){ state = 'playing'; S.acc = {}; __ars.accBuy('laser', 'scope'); equip('laser'); zoomed = true; for (var i = 0; i < 40; i++) visuals(1 / 30); updateHUD();
      var on = document.getElementById('scope').classList.contains('on'); zoomed = false; for (var k = 0; k < 40; k++) visuals(1 / 30); updateHUD();
      var o = { on: on, off: document.getElementById('scope').classList.contains('on'), arme: vmRoot.visible }; S.acc = {}; __ars.accSync('laser'); equip('pistol'); return o; });
    ok(apres.on && !apres.off && apres.arme, 'Le cadre part et l’arme revient en sortant de la visée');
  });

  test('Visée : au cell vertical (champ plus large), le zoom garde les mêmes rapports', () => {
    exiger(); partie();
    const r = J(function(){
      var b0 = baseFov, o = {}; baseFov = 88; camera.fov = 88; camera.updateProjectionMatrix(); state = 'playing';
      S.acc = {}; __ars.accBuy('rifle', 'scope'); equip('rifle'); zoomed = true; for (var i = 0; i < 40; i++) visuals(1 / 30);
      o.k = camera.fov / 88; zoomed = false; for (var k = 0; k < 40; k++) visuals(1 / 30);
      baseFov = b0; S.acc = {}; __ars.accSync('rifle'); equip('pistol'); for (var j = 0; j < 40; j++) visuals(1 / 30);
      return o;
    });
    ok(Math.abs(r.k - .25) < .02, 'Lunette ×4 au cell : rapport ' + r.k.toFixed(3));
  });

  test('Visée : les armes du toit ont leurs matières (reflets) et les armes à énergie s’illuminent au tir', () => {
    if (lire('typeof vmMatArme === "object" && typeof VM_LUEUR === "object"') !== true) ignorer('Matières des armes absentes');
    partie();
    const r = J(function(){
      var o = { sans: [] };
      Object.keys(VMS).forEach(function(id){ VMS[id].traverse(function(m){ if (m.isMesh && m.material !== vmMatArme && m.material !== vmFlameMat) o.sans.push(id); }); });
      state = 'playing'; equip('laser'); reloadT = 0; cool = 0; for (var i = 0; i < 30; i++) visuals(1 / 30);
      o.repos = VM_LUEUR.value; S.ammo.laser = magSize('laser'); cool = 0; fire(); visuals(1 / 60); o.tir = VM_LUEUR.value;
      var k = VMS.laser.children[0].geometry.getAttribute('vmk'); o.vmk = !!k; var lu = 0; if (k) for (var j = 2; j < k.array.length; j += 3) if (k.array[j] > 0) lu++;
      o.lumineux = lu; equip('pistol');
      return o;
    });
    egal(r.sans.length, 0, 'Pièces sans matière : ' + r.sans.join(','));
    ok(r.vmk && r.lumineux > 0, 'Le laser a des pièces d’énergie');
    ok(r.tir > r.repos * 2, 'Éclat au tir : ' + r.repos.toFixed(2) + ' puis ' + r.tir.toFixed(2));
  });
  test('Armes (tâche 108) : le rayon du laser et du canon électromagnétique part fin du canon (cône), pas en vitre', () => {
    if (lire('typeof ARS_BEAM_CONE === "object" && typeof arsBeams === "object"') !== true) ignorer('Rayon en cône absent');
    partie();
    const r = J(function(){
      var o = {}; state = 'playing';
      ['railgun', 'laser'].forEach(function(id){
        arsBeams.forEach(function(x){ x.m.visible = false; });
        equip(id); reloadT = 0; cool = 0; S.ammo[id] = magSize(id); fire();
        var v = arsBeams.filter(function(x){ return x.m.visible; });
        o[id] = v.length > 0 && v.every(function(x){ return x.m.geometry === ARS_BEAM_CONE; });
      });
      equip('pistol'); return o;
    });
    ok(r.railgun, 'Canon électromagnétique : rayon en cône');
    ok(r.laser, 'Laser : rayon en cône');
  });

  test('Armes (tâche 108) : modèles sous le budget, mires et points d’accroche gardés', () => {
    partie();
    const r = J(function(){
      var o = {};
      WORDER.forEach(function(id){ var u = VMS[id].userData; o[id] = { tris: u.tris, muzzle: typeof u.muzzle === 'number', sight: (u.sight || []).length, sightY: typeof u.sightY === 'number' }; });
      return o;
    });
    Object.keys(r).forEach(id => {
      ok(r[id].tris <= 2500, id + ' : ' + r[id].tris + ' triangles');
      ok(r[id].muzzle && r[id].sightY && r[id].sight >= 2, id + ' : points d’accroche');
    });
  });
})();
