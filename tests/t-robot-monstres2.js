'use strict';
/* Tests des monstres du robot (js/73-robot-monstres2.js, dossier 119) : Bélier, Grappin, Mortier vivant et leurs parades */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const exiger = () => { if (lire('typeof __mr2 === "object" && typeof __mech === "object" && typeof __mb === "object"') !== true) ignorer('Monstres du robot absents (js/73-robot-monstres2.js)'); };
  const fin = () => J(function(){ if (MECH.on) mechQuit(); if (typeof __mechSave === 'object') __mechSave.mechSaveClear(); });
  // Dans le jeu : départ du robot à une rue donnée, sans zombies ni vagues, blindage énorme
  const PREP = 'window.__mr2t = { prep:function(rue, tour){ mechStart(); if (tour) MECH.tour = tour; __mb.MB.waveT = 1e9; MECH.street = rue; mechStreet(false); clearZombies(); __mb.MB.waveT = 1e9; plan.queue = []; S.bar = S.barMax = 1e7; },'
    + ' pas:function(n){ for (var i = 0; i < n; i++){ spawnT = 1e9; plan.queue = [\'walker\']; __mb.MB.waveT = 1e9; visuals(1 / 30); } } };';

  test('Robot monstres : jamais aux rues 1 à 3 du tour 1, un genre par rue d’abord, ni sur le toit', () => {
    exiger(); reset();
    const r = J(function(){
      var o = { t1:[], t2:[] }, M2 = __mr2;
      for (var rue = 1; rue <= 9; rue++){ o.t1.push(M2.mr2Compte(rue, 1)); o.t2.push(M2.mr2Compte(rue, 2)); }
      mechStart(); __mb.MB.waveT = 1e9;
      o.file = [];
      for (rue = 1; rue <= 6; rue++){ MECH.street = rue; MECH.tour = 1; var p = mechPlan(); o.file.push(M2.MR2_TYPES.map(function(t){ return p.queue.filter(function(x){ return x === t; }).length; })); }
      MECH.street = 3; MECH.tour = 2; var p2 = mechPlan(); o.tour2 = p2.queue.filter(function(x){ return M2.MR2_TYPES.indexOf(x) >= 0; }).length;
      mechQuit();
      // Le toit : aucune vague d'aucune ville n'en contient
      o.toit = 0;
      for (var v = 0; v < LOCS.length; v++) for (var w = 1; w <= 10; w++){ var q = wavePlan(w, LOCS[v]).queue; o.toit += q.filter(function(x){ return M2.MR2_TYPES.indexOf(x) >= 0; }).length; }
      o.annonceToit = M2.mr2Annonce('belier');
      return o;
    });
    fin();
    [0, 1, 2].forEach(i => egal(r.t1[i].belier + r.t1[i].grappin + r.t1[i].mortier, 0, 'Tour 1, rue ' + (i + 1) + ' : aucun nouveau monstre'));
    ok(r.t1[3].belier > 0 && !r.t1[3].grappin && !r.t1[3].mortier, 'Rue 4 : le Bélier seul');
    ok(r.t1[4].grappin > 0 && !r.t1[4].belier && !r.t1[4].mortier, 'Rue 5 : le Grappin seul');
    ok(r.t1[5].mortier > 0 && !r.t1[5].belier && !r.t1[5].grappin, 'Rue 6 : le Mortier vivant seul');
    ok(r.t1[6].belier && r.t1[6].grappin && r.t1[6].mortier, 'Rue 7 : mélangés');
    ok(r.t2[1].grappin > 0 && r.t2[8].belier >= r.t1[8].belier && r.t2[8].grappin > r.t1[8].grappin, 'Tour 2 : dès la rue 2 et plus nombreux');
    egal(JSON.stringify(r.file.slice(0, 3)), JSON.stringify([[0, 0, 0], [0, 0, 0], [0, 0, 0]]), 'File des rues 1 à 3 du tour 1 inchangée');
    egal(r.file[3][0], r.t1[3].belier, 'File de la rue 4 : les Béliers prévus'); egal(r.file[5][2], r.t1[5].mortier, 'File de la rue 6 : les Mortiers prévus');
    ok(r.tour2 > 0, 'Tour 2, rue 3 : quelques-uns dans la file');
    egal(r.toit, 0, 'Aucun dans les vagues du toit'); egal(r.annonceToit, false, 'Pas d’annonce hors du robot');
  });

  test('Robot monstres : budget de la rue constant (ils remplacent des marcheurs)', () => {
    exiger(); reset();
    const r = J(function(){
      var o = {}, M2 = __mr2, T1 = M2.MR2_PLAN.t1, sauve = T1[7];
      mechStart(); __mb.MB.waveT = 1e9; MECH.street = 7; MECH.tour = 1;
      var a = __t.graine(5, function(){ return mechPlan(); });
      T1[7] = [0, 0, 0];
      var b = __t.graine(5, function(){ return mechPlan(); });
      T1[7] = sauve;
      var n = function(p, t){ return p.queue.filter(function(x){ return x === t; }).length; };
      o.la = a.queue.length; o.lb = b.queue.length; o.mon = n(a, 'belier') + n(a, 'grappin') + n(a, 'mortier');
      o.wa = n(a, 'walker'); o.wb = n(b, 'walker'); o.autres = ['runner', 'spider', 'stalker', 'abomination', 'crawler'].every(function(t){ return n(a, t) === n(b, t); });
      mechQuit();
      return o;
    });
    fin();
    egal(r.la, r.lb, 'Même nombre de zombies dans la rue');
    ok(r.mon > 0, 'Des nouveaux monstres dans la rue 7'); egal(r.wb - r.wa, r.mon, 'Autant de marcheurs en moins');
    ok(r.autres, 'Les autres zombies ne changent pas');
  });

  test('Robot monstres : Bélier, la charge frappe dans la bande, un pas de côté le sonne et offre son dos', () => {
    exiger(); reset();
    J(PREP);
    const r = J(function(){
      var o = {}, M2 = __mr2, B = M2.MR2_BEL, T = __mr2t; T.prep(4);
      var z = spawnZombie('belier'); z.g.position.set(0, 0, MECH_CAM.z - 40); z.mrX = 0; z.mrCd = 0; z.mrDist = 40;
      var i, c0 = M2.MR2.coups, el = false, ch = false, ligne = false;
      for (i = 0; i < 200 && z.mr !== 'recul'; i++){ T.pas(1); if (z.mr === 'elan'){ el = true; ligne = ligne || M2.MR2_LIGNES[0].visible; } if (z.mr === 'charge') ch = true; }
      o.elan = el; o.charge = ch; o.ligne = ligne; o.coup = M2.MR2.coups - c0; o.bar = 1e7 - S.bar;
      // Blindé de face : un cinquième des dégâts
      var h = z.hp; damage(z, 100, false, z.g.position.clone()); o.face = (h - z.hp);
      // Deuxième charge : pas de côté quand elle part
      S.bar = 1e7; z.mrCd = 0; var dodge = false, e0 = M2.MR2.esquives;
      for (i = 0; i < 600 && z.mr !== 'sonne'; i++){
        if (z.mr === 'charge' && !dodge){ MECH.mv.r = 1; dodge = true; }
        if (dodge && MECH.x > 4) MECH.mv.r = 0;
        T.pas(1);
      }
      MECH.mv.r = 0;
      o.sonne = z.mr === 'sonne'; o.esq = M2.MR2.esquives - e0; o.bar2 = 1e7 - S.bar; o.bosse = z.rig.bosse.visible;
      o.mur = Math.abs(z.g.position.x) > 10; o.alerte = document.getElementById('mr2AlTx').textContent;
      h = z.hp; damage(z, 100, false, z.g.position.clone()); o.dos = (h - z.hp);
      o.evts = JSON.stringify(M2.MR2.evts);
      T.pas(Math.ceil(M2.mr2Rgl(B, 'sonne') * 30) + 5); o.reprise = z.mr !== 'sonne' && !z.rig.bosse.visible;
      mechQuit();
      return o;
    });
    fin();
    ok(r.elan && r.ligne, 'Il prend son élan, bande rouge au sol'); ok(r.charge, 'Puis il charge');
    egal(r.coup, 1, 'Robot dans la bande : un coup'); ok(r.bar > 0, 'Le coup enlève du blindage : ' + Math.round(r.bar));
    ok(r.sonne, 'Après un pas de côté : sonné'); egal(r.esq, 1, 'Charge esquivée comptée'); egal(r.bar2, 0, 'Esquivé : aucun dégât');
    ok(r.mur, 'Écrasé contre une façade'); ok(r.bosse, 'Dos lumineux visible'); ok(/sonné/.test(r.alerte), 'Alerte « sonné » : ' + r.alerte);
    ok(r.dos > r.face * 4, 'Sonné, il prend bien plus que de face : ' + Math.round(r.face) + ' puis ' + Math.round(r.dos));
    ok(/"elan"/.test(r.evts) && /"charge"/.test(r.evts) && /"sonne"/.test(r.evts), 'Moments annoncés (Jeu.emit monstre) : ' + r.evts);
    ok(r.reprise, 'Il se reprend après le temps sonné');
  });

  test('Robot monstres : Grappin, saute sur la vitre, intouchable, décroché en secouant le torse', () => {
    exiger(); reset();
    J(PREP);
    const r = J(function(){
      var o = {}, M2 = __mr2, G = M2.MR2_GRA, T = __mr2t; T.prep(5);
      var g = spawnZombie('grappin'); g.g.position.set(1, 0, MECH_CAM.z - 25);
      var i, saut = false, enl = 0;
      for (i = 0; i < 240 && g.mr !== 'accroche'; i++){ T.pas(1); if (g.mr === 'saut'){ saut = true; enl = Math.max(enl, g.g.position.y); } }
      o.saut = saut; o.enl = enl; o.accroche = g.mr === 'accroche'; o.vitre = M2.mr2Vitre.visible; o.cible = hitMeshes.indexOf(g.proxy) >= 0;
      var h = g.hp; damage(g, 1000, false, g.g.position.clone()); o.intouchable = g.hp === h && !g.dead;
      T.pas(30); o.ronge = 1e7 - S.bar; o.alerte = document.getElementById('mr2AlTx').textContent;
      // Petits mouvements de visée : il reste accroché
      for (i = 0; i < 30; i++){ yaw += (i % 2 ? -1 : 1) * .05; T.pas(1); }
      o.resteVise = g.mr === 'accroche';
      // Un saut de visée d'un seul coup ne compte pas pour une secousse
      var n0 = M2.MR2.secousse.n; yaw += 1.2; T.pas(1); yaw -= 1.2; T.pas(1); o.sautVisee = M2.MR2.secousse.n - n0 <= 1 && g.mr === 'accroche';
      T.pas(60);
      // Secousses : torse de gauche à droite (5 rad/s, demi-tour toutes les 0,16 s)
      var dir = 1, t = 0, d0 = M2.MR2.decroches;
      for (i = 0; i < 120 && g.mr === 'accroche'; i++){ t += 1 / 30; if (t > .16){ t = 0; dir = -dir; } yaw += dir * 5 / 30; T.pas(1); }
      o.decroche = g.mr !== 'accroche' && M2.MR2.decroches - d0 === 1;
      T.pas(30);
      o.tombe = g.dead || (g.mr === 'sonne' && g.g.position.y === 0 && g.hp <= g.maxHp * (1 - G.chute) + 1e-6);
      o.cible2 = g.dead || hitMeshes.indexOf(g.proxy) >= 0; o.vitre2 = M2.mr2Vitre.visible;
      // Abattu en plein saut
      clearZombies(); var g2 = spawnZombie('grappin'); g2.g.position.set(-1, 0, MECH_CAM.z - 14);
      for (i = 0; i < 60 && g2.mr !== 'saut'; i++) T.pas(1);
      T.pas(5); o.enVol = g2.mr === 'saut'; kill(g2, false, g2.g.position.clone()); T.pas(40); o.vitre3 = M2.mr2Vitre.visible;
      mechQuit();
      return o;
    });
    fin();
    ok(r.saut && r.enl > 3, 'Bond en cloche (' + r.enl.toFixed(1) + ' m)'); ok(r.accroche && r.vitre, 'Accroché, visible dans l’habitacle');
    ok(!r.cible && r.intouchable, 'Sur la vitre : les armes ne l’atteignent pas'); ok(r.ronge > 0, 'Il ronge le blindage');
    ok(/secoue le torse/.test(r.alerte), 'Alerte qui dit la parade : ' + r.alerte);
    ok(r.resteVise, 'De petits mouvements de visée ne le décrochent pas'); ok(r.sautVisee, 'Un saut de visée d’un coup ne compte pas');
    ok(r.decroche, 'Torse secoué : décroché'); ok(r.tombe, 'Il tombe et perd une part de sa vie'); ok(r.cible2, 'De nouveau une cible'); ok(!r.vitre2, 'Plus rien sur la vitre');
    ok(r.enVol && !r.vitre3, 'Abattu en plein saut : il n’arrive jamais sur la vitre');
  });

  // Dossier 121 : un va-et-vient du doigt sur la zone de visée (vrais événements touch, comme au cell) décroche le Grappin.
  // Un quart de la largeur de l'écran en 0,3 s par sens (9 images à 30 par seconde), cell vertical (412) et couché (915),
  // sensibilité par défaut (1) et la plus basse du réglage (0,3). MECH.assist : les fenêtres du cell sur un ordi.
  test('Robot monstres : Grappin, un va-et-vient du doigt le décroche (tactile, sensibilité 1 et 0,3), la souris ne change pas', () => {
    exiger(); reset({ mr2Vus:{ belier:true, grappin:true, mortier:true } });
    J(PREP);
    const r = J(function(){
      var o = { cas:[] }, M2 = __mr2, T = __mr2t, aim = document.getElementById('mkAim'), sens0 = sens, as0 = MECH.assist;
      o.zone = !!aim;
      if (!aim) return o;
      var toucher = function(type, x, y){
        var t, ev;
        try { t = new Touch({ identifier:7, target:aim, clientX:x, clientY:y }); } catch (e) { t = { identifier:7, target:aim, clientX:x, clientY:y }; }
        try { ev = new TouchEvent(type, { changedTouches:[t], touches:type === 'touchend' ? [] : [t], bubbles:true, cancelable:true }); }
        catch (e) { ev = new Event(type, { bubbles:true, cancelable:true }); Object.defineProperty(ev, 'changedTouches', { value:[t] }); }
        aim.dispatchEvent(ev);
      };
      var essai = function(largeur, s){
        sens = s; MECH.assist = true; T.prep(5);
        var g = spawnZombie('grappin'); g.g.position.set(0, 0, MECH_CAM.z - 12);
        for (var i = 0; i < 120 && g.mr !== 'accroche'; i++) T.pas(1);
        var acc = g.mr === 'accroche', d0 = M2.MR2.decroches, ymin = yaw, ymax = yaw, x = largeur * .6, y = 400, dx = largeur / 4, n = 9, k, a;
        toucher('touchstart', x, y);
        for (a = 0; a < 2 && g.mr === 'accroche'; a++){
          for (k = 0; k < n; k++){ x += (a % 2 ? 1 : -1) * dx / n; toucher('touchmove', x, y); T.pas(1); ymin = Math.min(ymin, yaw); ymax = Math.max(ymax, yaw); }
        }
        toucher('touchend', x, y);
        var res = { largeur:largeur, sens:s, accroche:acc, decroche:M2.MR2.decroches - d0 === 1 && g.mr !== 'accroche', amp:ymax - ymin };
        mechQuit(); return res;
      };
      // Souris (fenêtres de l'ordi) : un va-et-vient de 0,3 rad ne compte pas, 0,45 rad oui (inchangé)
      var souris = function(amp){
        sens = 1; MECH.assist = false; T.prep(5);
        var g = spawnZombie('grappin'); g.g.position.set(0, 0, MECH_CAM.z - 12);
        for (var i = 0; i < 120 && g.mr !== 'accroche'; i++) T.pas(1);
        for (var a = 0; a < 3 && g.mr === 'accroche'; a++) for (var k = 0; k < 9; k++){ yaw += (a % 2 ? 1 : -1) * amp / 9; T.pas(1); }
        var dec = g.mr !== 'accroche'; mechQuit(); return dec;
      };
      try {
        [412, 915].forEach(function(L){ [1, .3].forEach(function(s){ o.cas.push(essai(L, s)); }); });
        o.souris03 = souris(.3); o.souris045 = souris(.45);
      } finally { sens = sens0; MECH.assist = as0; }
      o.amp = M2.MR2_GRA.amp;
      return o;
    });
    fin();
    ok(r.zone, 'Zone de visée tactile du robot (#mkAim)');
    (r.cas || []).forEach(c => {
      const nom = (c.largeur === 412 ? 'cell vertical' : 'cell couché') + ', sensibilité ' + String(c.sens).replace('.', ',');
      ok(c.accroche, nom + ' : accroché');
      ok(c.decroche, nom + ' : un aller-retour du doigt (un quart de l’écran, 0,3 s par sens) le décroche (torse tourné de ' + c.amp.toFixed(2) + ' rad)');
    });
    egal(r.amp, .4, 'Souris : amplitude d’une secousse inchangée (0,4 rad)');
    ok(!r.souris03, 'Souris : des va-et-vient de 0,3 rad ne le décrochent pas'); ok(r.souris045, 'Souris : des va-et-vient de 0,45 rad le décrochent');
  });

  test('Robot monstres : les carrefours ne tirent que les villes du robot (jamais la Centrale), sans enrobage', () => {
    exiger(); reset();
    const r = J(function(){
      var o = { ids:{} };
      o.n = typeof MECH_VILLES === 'number' ? MECH_VILLES : -1;
      o.src = String(__mb.mbRoutes); o.meme = __mb.mbRoutes === mbRoutes;
      __t.graine(11, function(){ for (var k = 0; k < 300; k++) mbRoutes().forEach(function(x){ o.ids[x.loc.id] = (o.ids[x.loc.id] || 0) + 1; }); });
      o.attendu = LOCS.slice(0, o.n > 0 ? o.n : 5).map(function(L){ return L.id; });
      o.centrale = LOCS.some(function(L){ return L.id === 'centrale'; });
      o.locs = LOCS.length;
      return o;
    });
    egal(r.n, 5, 'Une seule constante : MECH_VILLES = 5');
    ok(r.meme && /MECH_VILLES/.test(r.src) && !/splice/.test(r.src), 'mbRoutes est celle de js/40 (aucun enrobage qui retire la Centrale de LOCS)');
    ok(!r.ids.centrale, 'Jamais la Centrale en 300 carrefours' + (r.centrale ? '' : ' (pas de Centrale dans LOCS)'));
    egal(Object.keys(r.ids).sort().join(','), r.attendu.slice().sort().join(','), 'Les 5 villes du robot sortent toutes');
    ok(r.locs >= 5, 'LOCS garde ses ' + r.locs + ' villes');
  });

  test('Robot monstres : Grappin, le lance-flammes le fait lâcher', () => {
    exiger(); reset();
    J(PREP);
    const r = J(function(){
      var o = {}, M2 = __mr2, T = __mr2t; P.mech.own.flamer = true; P.mech.L = 'flamer'; mechArms(); T.prep(5);
      var g = spawnZombie('grappin'); g.g.position.set(0, 0, MECH_CAM.z - 12);
      for (var i = 0; i < 120 && g.mr !== 'accroche'; i++) T.pas(1);
      o.accroche = g.mr === 'accroche'; MECH.mini = true;
      for (i = 0; i < 60 && g.mr === 'accroche'; i++) T.pas(1);
      MECH.mini = false; o.lache = g.dead || g.mr !== 'accroche';
      P.mech.L = 'minigun'; mechArms(); mechQuit();
      return o;
    });
    fin();
    ok(r.accroche, 'Accroché'); ok(r.lache, 'Lance-flammes : il lâche la vitre');
  });

  test('Robot monstres : Mortier vivant, l’obus tombe là où était le robot ; bouger l’esquive', () => {
    exiger(); reset();
    J(PREP);
    const r = J(function(){
      var o = {}, M2 = __mr2, MM = M2.MR2_MOR, T = __mr2t; T.prep(6);
      var m = spawnZombie('mortier'); m.g.position.set(-2, 0, MECH_CAM.z - 75);
      var i;
      for (i = 0; i < 900 && M2.MR2_OBUS.every(function(x){ return !x.actif; }); i++) T.pas(1);
      var ob = M2.MR2_OBUS.filter(function(x){ return x.actif; })[0];
      o.plante = m.mr === 'plante'; o.loin = MECH_CAM.z - m.g.position.z >= MM.plante[0] - 1;
      o.obus = !!ob; o.cercle = !!ob && ob.c.visible && Math.abs(ob.x - MECH.x) < 1e-6 && Math.abs(ob.z - MECH_CAM.z) < 1e-6;
      o.vol = ob ? ob.T : 0; o.alerte = document.getElementById('mr2AlTx').textContent;
      o.bord = +document.getElementById('mr2Bord').style.opacity > 0;
      // Robot planté : touché
      var i0 = M2.MR2.impacts;
      for (i = 0; i < 200 && M2.MR2.impacts === i0; i++) T.pas(1);
      o.touche = 1e7 - S.bar;
      // Robot qui avance : esquivé (le cercle reste collé à la rue qui défile)
      S.bar = 1e7; i0 = M2.MR2.impacts; var z0 = null;
      for (i = 0; i < 400 && M2.MR2.impacts === i0; i++){ var a = M2.MR2_OBUS.filter(function(x){ return x.actif; })[0]; if (a){ MECH.mv.f = 1; if (z0 === null) z0 = a.z; } T.pas(1); }
      MECH.mv.f = 0; o.esq = 1e7 - S.bar; o.recule = z0 !== null;
      mechQuit(); o.rien = M2.MR2_OBUS.every(function(x){ return !x.actif && !x.c.visible && !x.m.visible; });
      return o;
    });
    fin();
    ok(r.plante && r.loin, 'Il s’enracine loin au bout de la rue'); ok(r.obus && r.cercle, 'Obus tiré, cercle rouge là où est le robot');
    ok(r.vol >= 1.5, 'Au moins 1,5 s de vol : ' + r.vol); ok(/Obus/.test(r.alerte) && r.bord, 'Alerte et bords rouges sans son');
    ok(r.touche > 0, 'Robot planté dans le cercle : touché'); ok(r.recule, 'Un deuxième obus suivi'); egal(r.esq, 0, 'Robot qui bouge : obus esquivé');
    ok(r.rien, 'Plus aucun obus ni cercle en quittant le robot');
  });

  test('Robot monstres : annonce une seule fois par profil, gardée dans P', () => {
    exiger(); reset();
    J(PREP);
    const r = J(function(){
      var o = {}, M2 = __mr2, T = __mr2t; delete P.mr2Vus; M2.mr2Norm(); T.prep(4);
      var a0 = M2.MR2.annonces;
      var z = spawnZombie('belier'); z.g.position.set(0, 0, MECH_CAM.z - 60); T.pas(2);
      o.une = M2.MR2.annonces - a0; o.titre = document.getElementById('bTitle').textContent; o.vus = !!P.mr2Vus.belier;
      var z2 = spawnZombie('belier'); z2.g.position.set(3, 0, MECH_CAM.z - 60); T.pas(2);
      mechQuit(); mechStart(); __mb.MB.waveT = 1e9; MECH.street = 4; mechStreet(false); clearZombies();
      var z3 = spawnZombie('belier'); z3.g.position.set(0, 0, MECH_CAM.z - 60); T.pas(2);
      o.total = M2.MR2.annonces - a0;
      mechQuit();
      return o;
    });
    fin();
    egal(r.une, 1, 'Première rencontre annoncée'); egal(r.titre, 'Bélier !', 'Bandeau du Bélier'); ok(r.vus, 'Gardé dans le profil (P.mr2Vus)');
    egal(r.total, 1, 'Plus jamais annoncé ensuite');
  });

  test('Robot monstres : rien ne fuit après 5 rues, course sauvegardée puis reprise', () => {
    exiger(); reset({ mech:{ unlocked:true } });
    J(PREP);
    const r = J(function(){
      var o = {}, M2 = __mr2, T = __mr2t;
      mechStart(); __mb.MB.waveT = 1e9; S.bar = S.barMax = 1e7;
      // Le décor tiré au hasard fait varier le compte d'une rue à l'autre : base = le plus gros de 4 rues 9, fin = le plus petit de 4 rues 9
      var n0 = 0, v0 = vmCam.children.length, h0 = hitMeshes.length, q;
      for (q = 0; q < 4; q++){ MECH.street = 9; mechStreet(false); T.pas(2); n0 = Math.max(n0, scene.children.length); }
      for (var rue = 4; rue <= 8; rue++){
        MECH.street = rue; mechStreet(false); __mb.MB.waveT = 1e9; S.bar = 1e7;
        M2.MR2_TYPES.forEach(function(t, k){ var z = spawnZombie(t); z.g.position.set(-4 + 4 * k, 0, MECH_CAM.z - 30 - 10 * k); });
        for (var i = 0; i < 150; i++){ spawnT = 1e9; plan.queue = ['walker']; __mb.MB.waveT = 1e9; visuals(1 / 30); }
      }
      var n1 = 1e9;
      for (q = 0; q < 4; q++){ MECH.street = 9; mechStreet(false); T.pas(2); n1 = Math.min(n1, scene.children.length); }
      o.scene = n1 - n0; o.vm = vmCam.children.length - v0;
      o.obus = M2.MR2_OBUS.filter(function(x){ return x.actif; }).length; o.lignes = M2.MR2_LIGNES.filter(function(l){ return l.visible; }).length;
      o.vitre = M2.mr2Vitre.visible; o.zombies = zombies.length;
      // Sauvegarde à la rue 5, reprise : la file a les Grappins de la rue 5
      MECH.street = 5; mechStreet(false); if (typeof __mechSave === 'object') __mechSave.mechSave();
      mechQuit(); o.alerte = document.getElementById('mr2Alerte').style.display === 'none';
      o.repris = typeof __mechSave === 'object' ? __mechSave.mechResumeRun() : false;
      o.rue = MECH.street; o.gr = plan.queue.filter(function(x){ return x === 'grappin'; }).length; o.prevu = M2.mr2Compte(5, MECH.tour || 1).grappin;
      mechQuit();
      return o;
    });
    fin();
    ok(r.scene <= 0, 'Pas d’objet de plus dans la scène : ' + r.scene); egal(r.vm, 0, 'Pas d’objet de plus dans l’habitacle');
    egal(r.obus, 0, 'Plus d’obus en vol dans une rue neuve'); egal(r.lignes, 0, 'Plus de bande au sol'); ok(!r.vitre, 'Plus rien sur la vitre');
    ok(r.alerte, 'Alerte cachée en quittant'); ok(r.repris, 'Course reprise'); egal(r.rue, 5, 'Reprise à la rue 5'); egal(r.gr, r.prevu, 'Les Grappins de la rue 5 sont dans la file');
  });

  test('Robot monstres : carrefour qui annonce le monstre de la rue suivante, garage', () => {
    exiger(); reset({ mech:{ unlocked:true }, mr2Vus:{ belier:true } });
    const r = J(function(){
      var o = {}; mechNorm(); mechStart(); __mb.MB.waveT = 1e9; MECH.street = 3; mechStreet(false); clearZombies();
      __mb.mbCrossroads(); visuals(1 / 30);
      var p = document.getElementById('mr2Carrefour'); o.carrefour = p ? p.textContent : '';
      document.querySelectorAll('#mechPanel button[data-i]')[0].click();
      mechQuit(); P.mr2Vus = { belier:true }; mechGarage(); visuals(1 / 30);
      var g = document.getElementById('mr2Garage'); o.garage = g ? g.textContent : '';
      document.getElementById('mechPanel').classList.add('hide'); showScreen('scrTitle');
      return o;
    });
    fin();
    ok(/Rue 4/.test(r.carrefour) && /Bélier/.test(r.carrefour), 'Carrefour : ' + r.carrefour);
    ok(/Bélier/.test(r.garage) && !/Grappin/.test(r.garage), 'Garage : seulement les monstres rencontrés');
  });
})();
