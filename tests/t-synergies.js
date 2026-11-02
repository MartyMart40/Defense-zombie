'use strict';
/* =====================================================================
   Tests des synergies de défenses (js/16-atelier.js et js/17-defenses.js)
   À charger APRÈS tests.js dans tests/index.html :
     <script src="t-synergies.js"></script>
   Utilise l'API de tests.js : test(), J(), lire(), ok(), egal(), ignorer(), reset().
   Les tests sont placés avant le test final « Erreurs ».
   ===================================================================== */
(function(){
  if (typeof test !== 'function' || typeof TESTS === 'undefined') return;
  const avant = TESTS.length;
  const pret = () => lire('typeof __syn === "object" && typeof defSynergies === "function" && typeof defStatsSyn === "function"') === true;
  const exiger = () => { if (!pret()) ignorer('Synergies absentes (__syn, defSynergies ou defStatsSyn introuvable)'); };
  const proche = (a, b) => Math.abs(a - b) < 1e-9;
  // Profil propre, partie lancée et gelée, emplacements vides
  function preparer(){
    reset(); J('startLocation(0)'); J('__t.geler()');
    J(function(){ clearZombies(); P.scrap = 1e7; P.slots = [null, null, null, null]; defRebuild(); });
  }

  test('Synergies : 2, 3 et 4 défenses du même type donnent les bons multiplicateurs', () => {
    exiger();
    preparer();
    const r = J(function(){
      var out = {}, base = defStats('turret', {});
      [1, 2, 3, 4].forEach(function(n){
        for (var i = 0; i < 4; i++) P.slots[i] = i < n ? { type:'turret', paid:250, lv:{ dmg:0, rate:0, range:0, spec:0 } } : null;
        defRebuild();
        out[n] = { dmg: RT[0].st.dmg / base.dmg, rate: RT[0].st.rate / base.rate, dernier: RT[n - 1].st.dmg / base.dmg };
      });
      out.table = { 2: SYN_SAME[2], 3: SYN_SAME[3], 4: SYN_SAME[4] };
      // Ogive : dégâts seulement, la recharge ne raccourcit pas
      var nb = defStats('nuke', {}), q = [0, 1, 2, 3].map(function(){ return { type:'nuke', paid:40000, lv:{} }; });
      var n4 = defStatsSyn('nuke', {}, q);
      out.nuke = { dmg: n4.dmg / nb.dmg, reload: n4.reload / nb.reload, attendu: SYN_SAME_NUKE[4].dmg };
      P.slots = [null, null, null, null]; defRebuild();
      return out;
    });
    ok(proche(r[1].dmg, 1) && proche(r[1].rate, 1), 'Une seule tourelle ne devrait avoir aucun bonus : ' + JSON.stringify(r[1]));
    [2, 3, 4].forEach(n => {
      ok(proche(r[n].dmg, r.table[n].dmg), n + ' tourelles : dégâts ×' + r[n].dmg + ', attendu ×' + r.table[n].dmg);
      ok(proche(r[n].rate, r.table[n].rate), n + ' tourelles : cadence ×' + r[n].rate + ', attendu ×' + r.table[n].rate);
      ok(proche(r[n].dernier, r.table[n].dmg), n + ' tourelles : la dernière n’a pas le même bonus');
    });
    ok(r.table[2].dmg > 1 && r.table[3].dmg > r.table[2].dmg && r.table[4].dmg > r.table[3].dmg, 'Les paliers doivent monter : ' + JSON.stringify(r.table));
    ok(r.table[4].dmg <= 1.6 && r.table[4].rate <= 1.4, 'Bonus maximal trop fort : ' + JSON.stringify(r.table[4]));
    ok(proche(r.nuke.dmg, r.nuke.attendu) && r.nuke.attendu <= 1.3, 'Ogive ×4 : dégâts ×' + r.nuke.dmg);
    ok(proche(r.nuke.reload, 1), 'Ogive ×4 : la recharge ne doit pas raccourcir (×' + r.nuke.reload + ')');
  });

  test('Synergies : Marquage (Tourelle + Missiles) s’active à l’achat et se désactive à la vente', () => {
    exiger();
    preparer();
    const r = J(function(){
      var out = {};
      defBuy(0, 'turret'); defRebuild();
      out.avant = defSynergies().combos.length;
      defBuy(3, 'missile'); defRebuild();
      out.actives = defSynergies().combos.map(function(c){ return c.id; });
      out.marque = RT[0].st.syn.mark; out.chasse = RT[3].st.syn.hunt; out.liens = __syn.synLinks;
      out.halo = !!RT[0].synGlow && !!RT[3].synGlow;
      defSell(3); defRebuild();
      out.apres = defSynergies().combos.map(function(c){ return c.id; });
      out.marqueApres = RT[0].st.syn.mark; out.liensApres = __syn.synLinks; out.haloApres = !!RT[0].synGlow;
      return out;
    });
    egal(r.avant, 0, 'Synergies de combinaison avec une tourelle seule');
    ok(r.actives.indexOf('mark') >= 0, 'Marquage absent après l’achat des missiles : ' + JSON.stringify(r.actives));
    ok(r.marque && r.chasse, 'Effets du Marquage : tourelle ' + r.marque + ', missiles ' + r.chasse);
    ok(r.liens >= 1 && r.halo, 'Effet visuel absent (liens ' + r.liens + ', halo ' + r.halo + ')');
    egal(r.apres.indexOf('mark'), -1, 'Marquage encore actif après la vente');
    ok(!r.marqueApres, 'La tourelle marque encore après la vente');
    egal(r.liensApres, 0, 'Liens lumineux après la vente');
    ok(!r.haloApres, 'Halo encore là après la vente');
  });

  test('Synergies : Napalm et Pluie de feu changent brûlure et rayon', () => {
    exiger();
    preparer();
    const r = J(function(){
      P.slots = [{ type:'mortar', paid:900, lv:{} }, { type:'laser', paid:2500, lv:{} }, { type:'missile', paid:6000, lv:{} }, null].map(defNormSlot);
      defRebuild();
      var out = { ids: defSynergies().combos.map(function(c){ return c.id; }),
        mortR: RT[0].st.radius / defStats('mortar', {}).radius, misR: RT[2].st.radius / defStats('missile', {}).radius,
        burnT: RT[1].st.burnT, base: BURN_T, napalm: RT[0].st.syn.napalm };
      P.slots = [null, null, null, null]; defRebuild();
      return out;
    });
    ok(r.ids.indexOf('napalm') >= 0 && r.ids.indexOf('firerain') >= 0, 'Synergies actives : ' + JSON.stringify(r.ids));
    ok(r.mortR > 1.2 && r.misR > 1.2, 'Rayons : mortier ×' + r.mortR + ', missiles ×' + r.misR);
    ok(r.burnT > r.base, 'Brûlure du laser : ' + r.burnT + ' s (base ' + r.base + ' s)');
    ok(r.napalm, 'Les obus du mortier devraient être incendiaires');
  });

  test('Synergies : une tourelle en synergie tue plus vite qu’une tourelle seule', () => {
    exiger();
    preparer();
    const r = J(function(){
      function essai(n){
        clearZombies();
        for (var i = 0; i < 4; i++) P.slots[i] = i < n ? { type:'turret', paid:250, lv:{ dmg:0, rate:0, range:0, spec:0 } } : null;
        defRebuild();
        var z = __t.placer('walker', -16.5, -32); z.hp = z.maxHp = 400; z.speed = 0;
        var rt = RT[0], dt = 1 / 30, t = 0; rt.cd = 0;
        // Seule la tour 0 tire : on compare la même tour avec et sans synergie
        while (!z.dead && t < 60){ __syn.TICK.turret(rt, dt); t += dt; }
        return { t: t, mort: !!z.dead };
      }
      var seule = essai(1), groupe = essai(4);
      clearZombies(); P.slots = [null, null, null, null]; defRebuild();
      return { seule: seule, groupe: groupe };
    });
    ok(r.seule.mort && r.groupe.mort, 'Le zombie n’est pas mort : ' + JSON.stringify(r));
    ok(r.groupe.t < r.seule.t * .8, 'En synergie : ' + r.groupe.t.toFixed(2) + ' s, seule : ' + r.seule.t.toFixed(2) + ' s');
  });

  test('Synergies : section « Synergies actives » dans l’atelier', () => {
    exiger();
    preparer();
    const r = J(function(){
      openAtelier('scrTitle');
      var box = document.getElementById('atSyn'), vide = box ? box.innerHTML : '';
      defBuy(0, 'laser'); defBuy(1, 'mortar'); defRebuild(); atSel = 0; renderAtelier();
      var plein = document.getElementById('atSyn').innerHTML, detail = document.getElementById('atDetail').innerHTML;
      showScreen('scrTitle');
      P.slots = [null, null, null, null]; defRebuild();
      return { existe: !!box, vide: vide, plein: plein, detail: detail };
    });
    ok(r.existe, 'Élément #atSyn absent de l’écran Atelier');
    ok(r.vide.indexOf('Synergies actives') >= 0, 'Titre « Synergies actives » absent');
    ok(r.vide.indexOf('syn off') >= 0 && r.vide.indexOf('Il faut') >= 0, 'Les synergies possibles (grisées, avec ce qu’il faut) ne sont pas listées');
    ok(r.plein.indexOf('syn on') >= 0 && r.plein.indexOf('Napalm') >= 0, 'Napalm n’est pas listé comme actif');
    ok(r.detail.indexOf('synergie') >= 0, 'Le détail de la défense ne montre pas le bonus de synergie');
    ok(r.vide.indexOf('\u2014') < 0 && r.plein.indexOf('\u2014') < 0, 'Tiret quadratin dans la section');
  });

  test('Synergies : rien de nouveau dans la sauvegarde des emplacements', () => {
    exiger();
    preparer();
    const r = J(function(){
      defBuy(0, 'turret'); defBuy(1, 'turret'); defRebuild();
      var s = null; try { s = JSON.parse(localStorage.getItem('dt_prof')); } catch (e) {}
      var cles = s && s.slots && s.slots[0] ? Object.keys(s.slots[0]).sort().join(',') : '';
      P.slots = [null, null, null, null]; defRebuild();
      return cles;
    });
    egal(r, 'lv,paid,type', 'Champs d’un emplacement sauvé');
  });

  // Les tests ajoutés passent avant le test final « Erreurs »
  const ajoutes = TESTS.splice(avant);
  const iErr = TESTS.findIndex(t => t.nom.indexOf('Erreurs') === 0);
  TESTS.splice(iErr < 0 ? TESTS.length : iErr, 0, ...ajoutes);
})();
