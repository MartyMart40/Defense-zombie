'use strict';
/* Tests des vibrations (js/38-vibrations.js) : la vibration réelle est remplacée par un journal */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  test('Vibrations : tirs selon l’arme, explosions plus fortes, minigun espacée, réglage coupé', () => {
    if (lire('typeof __vib === "object"') !== true) ignorer('Vibrations absentes (js/38-vibrations.js)');
    reset(); J('startLocation(0)');
    const r = J(function(){
      var V = __vib.VIB, log = [], send0 = V.send, on0 = V.on, o = {};
      V.send = function(p){ log.push(p); }; V.on = true; V.until = 0; V.last = -10; V.force = 0;
      __t.geler(); clearZombies(); S.owned.sniper = true; S.owned.minigun = true;
      equip('pistol'); camera.position.copy(EYE); reloadT = 0; cool = 0; fire(); o.pistol = log[log.length - 1];
      V.last = -10; V.until = 0; equip('sniper'); reloadT = 0; cool = 0; fire(); o.sniper = log[log.length - 1];
      V.last = -10; V.until = 0; Snd.boom(1); o.boom = log[log.length - 1];
      V.last = -10; V.until = 0; var n0 = log.length; for (var i = 0; i < 10; i++) __vib.vibShot('minigun'); o.mini = log.length - n0;
      V.last = -10; V.until = 0; Snd.boom(2.5); o.ogive = log[log.length - 1];
      __vib.vibSet(false); var n1 = log.length; V.last = -10; V.until = 0; Snd.boom(1); __vib.vibShot('rocket'); o.coupe = log.length - n1; o.sauve = store.get('dt_vib', null);
      V.send = send0; __vib.vibSet(on0);
      return o;
    });
    ok(r.pistol > 0 && r.sniper > r.pistol, 'Pistolet ' + r.pistol + ' ms, sniper ' + r.sniper + ' ms');
    ok(r.boom > r.sniper, 'Explosion plus forte qu’un tir : ' + JSON.stringify(r.boom));
    ok(Array.isArray(r.ogive), 'Grosse explosion : vibration en deux temps');
    egal(r.mini, 1, 'Minigun : vibrations espacées (10 tirs le même instant)');
    egal(r.coupe, 0, 'Réglage coupé : aucune vibration'); egal(r.sauve, false, 'Réglage sauvegardé');
  });
})();
