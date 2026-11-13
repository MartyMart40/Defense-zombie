'use strict';
/* Tests : effets des armes du RTS (js/55-rts-effets.js, tâche 106) */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __rtsEffets === "object" && typeof rtsFxShot === "function"') !== true) ignorer('Effets des armes absents (js/55-rts-effets.js)'); };
  const calme = 'function calme(){ __rts.rtsStart(); var R = __rts.RTS; R.nests.forEach(function(n){ n.spawnT = 1e9; }); R.hordeT = 1e9; clearZombies(); S.money = 1e8; __rtsEffets.rfxClear(); return R; }';
  const fin = () => J(function(){ if (__rts.RTS.pilot) __rts.rtsUnpilot(); if (__rts.RTS.on) __rts.rtsQuit(); });
  // Les tirs de chaque arme (même fabrication que dans js/42-rts-combat.js)
  const tirs = `function tirs(){
    var L = [];
    ['rifle', 'gunner', 'sniper', 'flamebot', 'rocket', 'heavy', 'mech', 'tank', 'heli', 'jet', 'warthog', 'bomber'].forEach(function(t){
      var u = __rts.rtsSpawnUnit(t, 0, -10); L.push({ nom:t, S2:rtsS2(u) });
      if (RTS_UNITS[t].w2) L.push({ nom:t + ' (2e arme)', S2:rtsS2b(u) });
      if (RTS_GUNS[t]){ __rts.rtsUpgBuy(t, RTS_GUNS[t].k); L.push({ nom:t + ' (canon)', S2:rtsS25(u) }); }
    });
    L.push({ nom:'Hellfire', S2:{ fam:'missile', tier:0, dmg:300, splash:4, snd:'rocket' } });
    ['t_mg', 't_cannon', 't_flame', 't_mortar', 't_tesla'].forEach(function(t){ L.push({ nom:t, S2:Object.assign({}, RTS_BLD[t].turret, { tier:0 }) }); });
    return L;
  }`;

  test('RTS effets : chaque arme a son départ, son vol et son impact', () => {
    exiger(); reset();
    const r = J(new Function(calme + tirs + `
      var R = calme(), E = __rtsEffets, res = [];
      tirs().forEach(function(T){
        E.rfxClear(); clearZombies(); __rts.rtsSpawnAt(0, -40, 6, 1, 'walker'); zombies.forEach(function(z){ z.hp = z.maxHp = 1e7; z.speed = 0; });
        var z = zombies[0], from = new THREE.Vector3(0, 2.5, -14);
        rtsHit(from, z, 'z', T.S2);
        E.rtsFxFrame(1 / 60); var a = E.compte();
        var ondes = 0, impact = 0;
        for (var i = 0; i < 40; i++){ E.rtsFxFrame(1 / 60); var c = E.compte(); ondes = Math.max(ondes, c.ondes); impact = Math.max(impact, c.lueurs + c.fumee); }
        res.push({ nom:T.nom, fam:E.rfxFam(T.S2), depart:a.lueurs + a.rubans + a.projectiles + a.rayons, impact:impact, ondes:ondes, expl:!!T.S2.splash });
      });
      return res;
    `));
    fin();
    r.forEach(x => {
      ok(x.depart > 0, x.nom + ' (' + x.fam + ') : rien au départ du tir');
      ok(x.impact > 0, x.nom + ' (' + x.fam + ') : rien à l’impact');
      if (x.expl) ok(x.ondes > 0, x.nom + ' : explosion sans onde au sol');
    });
    const fams = {}; r.forEach(x => { fams[x.fam] = 1; });
    ['balle', 'elite', 'obus', 'obus105', 'roquette', 'missile', 'laser', 'tesla', 'feu', 'mortier', 'obusp'].forEach(f => ok(fams[f], 'Famille ' + f + ' jamais vue'));
  });

  test('RTS effets : l’onde et la marque ont le rayon réel des dégâts', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), E = __rtsEffets, o = {};
      [3.5, 6.5, 11].forEach(function(s){ E.rfxClear(); rtsFxBlast(0, -40, { splash:s, dmg:1, tier:0 }); E.rtsFxFrame(1 / 60);
        var on = E.RFX_RINGS.filter(function(x){ return x.life > 0; }).map(function(x){ return x.r; }), mq = E.RFX_DECS.filter(function(x){ return x.life > 0; }).map(function(x){ return x.r; });
        o[s] = { onde:Math.max.apply(null, on), marque:Math.max.apply(null, mq) }; });
      return o;
    `));
    fin();
    Object.keys(r).forEach(s => { egal(r[s].onde, +s, 'Onde pour un rayon de ' + s); ok(r[s].marque <= +s && r[s].marque >= +s * .8, 'Marque pour un rayon de ' + s + ' : ' + r[s].marque); });
  });

  test('RTS effets : les réserves ne grossissent pas et le plafond tient', () => {
    exiger(); reset();
    const r = J(new Function(calme + tirs + `
      var R = calme(), E = __rtsEffets, L = tirs(), max = 0, res0 = JSON.stringify(E.reserves()), b0 = E.RFX_BEAMS.length;
      __rts.rtsSpawnAt(0, -40, 30, 4, 'walker'); zombies.forEach(function(z){ z.hp = z.maxHp = 1e9; z.speed = 0; });
      var from = new THREE.Vector3(0, 2.5, -14);
      for (var f = 0; f < 120; f++){
        for (var k = 0; k < 40; k++){ var T = L[(f * 40 + k) % L.length]; rtsHit(from, zombies[k % zombies.length], 'z', T.S2); }
        E.rtsFxFrame(1 / 30); var c = E.compte(); max = Math.max(max, c.total);
        if (c.lueurs > E.RFX_CAP.glow || c.fumee > E.RFX_CAP.soft || c.projectiles > E.RFX_CAP.pj || c.rubans > E.reserves().rubans || c.corps > E.RFX_CAP.body) return { trop:JSON.stringify(c) };
      }
      var R2 = E.reserves(), cap = R2.lueurs + R2.fumee + R2.projectiles + R2.rayons + R2.marques + R2.ondes;
      return { max:max, cap:cap, pareil:JSON.stringify(E.reserves()) === res0 && E.RFX_BEAMS.length === b0, debit:E.RFX_DEBIT.trace };
    `));
    fin();
    ok(!r.trop, 'Plafond dépassé : ' + r.trop);
    ok(r.max > 0 && r.max <= r.cap, 'Effets en vie : ' + r.max + ' (plafond ' + r.cap + ')');
    ok(r.pareil, 'Les réserves ont changé de taille'); ok(r.debit > 0, 'Débit des traçantes');
  });

  test('RTS effets : les dégâts sont les mêmes avec ou sans effets', () => {
    exiger(); reset();
    const r = J(new Function(calme + tirs + `
      var R = calme(), L = tirs(), fx = rtsFxShot, fb = rtsFxBlast, out = {};
      function manche(){
        var tot = 0;
        L.forEach(function(T, i){
          clearZombies(); __rts.rtsSpawnAt(0, -40, 10, 2, 'walker'); zombies.forEach(function(z, j){ z.hp = z.maxHp = 1e6; z.speed = 0; z.g.position.set((j % 5) * 1.2 - 2.4, 0, -40 - Math.floor(j / 5) * 1.2); });
          rtsHit(new THREE.Vector3(0, 2.5, -14), zombies[0], 'z', Object.assign({}, T.S2));
          zombies.forEach(function(z){ tot += 1e6 - z.hp; });
        });
        return Math.round(tot);
      }
      out.avec = __t.graine(5, manche);
      try { rtsFxShot = null; rtsFxBlast = null; out.sans = __t.graine(5, manche); } finally { rtsFxShot = fx; rtsFxBlast = fb; }
      // Chiffres de base des armes (une copie : ils ne doivent pas bouger avec ce dossier)
      out.chiffres = ['rifle', 'gunner', 'sniper', 'flamebot', 'rocket', 'heavy', 'tank', 'heli', 'jet', 'warthog', 'mech', 'bomber'].map(function(t){ var U = RTS_UNITS[t]; return [t, U.dmg, U.rate, U.range, U.splash || 0].join(':'); }).join(' ')
        + ' ' + ['t_mg', 't_cannon', 't_flame', 't_mortar', 't_tesla'].map(function(t){ var T = RTS_BLD[t].turret; return [t, T.dmg, T.rate, T.range, T.splash || 0].join(':'); }).join(' ')
        + ' w2:' + RTS_UNITS.mech.w2.dmg + ':' + RTS_UNITS.mech.w2.splash + ':' + RTS_UNITS.bomber.w2.dmg + ':' + RTS_UNITS.bomber.w2.splash;
      return out;
    `));
    fin();
    ok(r.avec > 0, 'Des dégâts'); egal(r.avec, r.sans, 'Dégâts avec les effets et sans');
    egal(r.chiffres, 'rifle:26:3:18:0 gunner:12:12:16:0 sniper:150:0.6:42:0 flamebot:18:9:11:0 rocket:170:0.8:26:3.5 heavy:140:1.6:22:0 tank:900:0.33:38:6.5 heli:90:2.2:28:3 jet:150:10:36:0 warthog:110:22:30:0 mech:36:20:26:0 bomber:110:2.5:95:3 t_mg:26:8:24:0 t_cannon:130:0.9:28:0 t_flame:16:10:12:0 t_mortar:150:0.5:44:5 t_tesla:80:2:18:0 w2:380:4.5:1100:11', 'Chiffres des armes');
  });

  test('RTS effets : les paliers ajoutent par-dessus, tout s’efface en quittant', () => {
    exiger(); reset();
    const r = J(new Function(calme + `
      var R = calme(), E = __rtsEffets, o = {};
      function compte(T){ E.rfxClear(); E.rfxBoom(0, .5, -40, 4, T, {}); E.rtsFxFrame(1 / 60); var c = E.compte(); return c.lueurs + c.fumee; }
      o.n0 = __t.graine(3, function(){ return compte(0); }); o.n1 = __t.graine(3, function(){ return compte(1); });
      E.rfxClear(); var z = __rts.rtsSpawnAt(0, -40, 1, 1, 'walker'); rtsHit(new THREE.Vector3(0, 2, -14), zombies[0], 'z', { tier:0, dmg:1, splash:3.5, snd:'gl' });
      E.rtsFxFrame(1 / 60); o.avant = E.compte().total;
      __rts.rtsQuit(); E.rtsFxFrame(1 / 60); o.apres = E.compte().total;
      return o;
    `));
    fin();
    ok(r.n1 > r.n0 * 1.5, 'Plus de feu et de fumée au maximum : ' + r.n0 + ' puis ' + r.n1);
    ok(r.avant > 0, 'Une roquette en vol'); egal(r.apres, 0, 'Plus rien après la partie');
  });
})();
