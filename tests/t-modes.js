'use strict';
/* Tests du registre des modes (Jeu, js/00-base.js) et de ses branchements (js/90-branchements.js) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __jeu === "object" && typeof __jeu.mode === "function"') !== true) ignorer('Registre des modes absent (js/00-base.js, js/90-branchements.js)'); };

  test('Modes : le robot et le RTS sont inscrits, aucun mode actif sur le toit', () => {
    exiger(); reset();
    const r = J(function(){
      var o = { noms: Object.keys(__jeu.modes).sort().join(',') };
      o.champs = ['robot', 'rts'].every(function(n){ var m = __jeu.modes[n]; return m && typeof m.actif === 'function' && typeof m.etape === 'function' && typeof m.image === 'function' && m.etats.jeu; });
      o.actif = __jeu.actif() ? __jeu.actif().nom : null;
      return o;
    });
    ok(/robot/.test(r.noms) && /rts/.test(r.noms), 'Modes inscrits : ' + r.noms);
    ok(r.champs, 'Chaque mode a actif, etape, image et etats.jeu');
    egal(r.actif, null, 'Mode actif hors des modes');
  });

  test('Modes : en RTS, le mode actif avance par etape, compte les tués et choisit la musique', () => {
    exiger(); reset();
    const r = J(function(){
      __rts.rtsStart(); var R = __rts.RTS, o = {};
      R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies();
      o.actif = __jeu.actif() && __jeu.actif().nom;
      var t0 = R.t; visuals(1 / 30); visuals(1 / 30); o.avance = R.t > t0;
      var k0 = R.kills; __rts.rtsSpawnAt(0, -60, 1); var z = zombies[zombies.length - 1]; kill(z, false); o.tues = R.kills - k0;
      kill(z, false); o.deuxFois = R.kills - k0;
      o.musique = ambMusicState();
      R.paused = true; var t1 = R.t; visuals(1 / 30); o.pause = R.t === t1; R.paused = false;
      __rts.rtsQuit();
      o.apres = __jeu.actif() ? __jeu.actif().nom : null;
      return o;
    });
    egal(r.actif, 'rts', 'Mode actif');
    ok(r.avance, 'Le temps du RTS doit avancer avec visuals');
    egal(r.tues, 1, 'Tués comptés'); egal(r.deuxFois, 1, 'Un zombie déjà mort ne compte pas deux fois');
    ok(r.musique === 'wave' || r.musique === 'boss', 'Musique du RTS : ' + r.musique);
    ok(r.pause, 'En pause, le RTS ne doit pas avancer');
    egal(r.apres, null, 'Plus de mode actif après Quitter');
  });

  test('Modes : Jeu.on et Jeu.emit, une erreur dans un écouteur ne casse pas les autres', () => {
    exiger();
    const r = J(function(){
      var vu = [], f1 = function(){ throw new Error('exprès'); }, f2 = function(a, b){ vu.push(a + b); };
      var ce = console.error; console.error = function(){};
      __jeu.on('essai', f1); __jeu.on('essai', f2); __jeu.emit('essai', 2, 3);
      __jeu.off('essai', f1); __jeu.off('essai', f2); __jeu.emit('essai', 1, 1);
      console.error = ce;
      var img = 0, fi = function(){ img++; }; __jeu.on('image', fi); visuals(1 / 30); __jeu.off('image', fi);
      return { vu: vu.join(','), img: img };
    });
    egal(r.vu, '5', 'Écouteurs appelés');
    egal(r.img, 1, 'L’événement image passe à chaque image');
  });
})();
