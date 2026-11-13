'use strict';
/* ================= Robot-joueur du mode « Robot de combat » (simulateur d'équilibrage) ================= */
// Injecté dans la vraie page du jeu par outils/simulateur.js, APRÈS outils/sim-bot.js (il se sert de son horloge,
// de sa graine du hasard, de ses niveaux de joueur et de son profil neuf). Jamais chargé par index.html.
// Il joue comme un joueur, par les vraies commandes du robot (MECH.mv, MECH.joy, MECH.mini, MECH.rocket, yaw, pitch) :
//   - avance dans la rue, s'arrête quand trop de zombies le frappent (selon son niveau), repart aux renforts ou sous 50 % de blindage ;
//   - vise avec une erreur selon son niveau : d'abord ceux qui le frappent, puis les cracheurs, le boss, le plus proche ;
//     les zombies derrière lui, il les voit seulement s'ils sont assez près (débutant : quand ils frappent) ;
//   - gère la surchauffe du bras gauche (le débutant tient la gâchette jusqu'au blocage) ;
//   - tire le bras droit dans les groupes (le débutant tire dès que c'est prêt), avec le chargeur de roquettes ;
//   - fait un pas de côté pour esquiver les crachats (plus ou moins souvent selon son niveau) ;
//   - choisit une rue au carrefour (le débutant au hasard ; sinon la rue calme quand il est amoché, la ferraille sinon) ;
//   - entre deux courses, dépense sa ferraille au garage selon une stratégie.
// Il ne touche jamais aux dégâts ni au blindage : il les mesure seulement (d'où viennent les dégâts encaissés).
// Limites face à un vrai joueur : il ne recule pas pour se dégager, ne vise pas les points faibles exprès,
// ne se sert pas du décor et voit les crachats sans les chercher des yeux.

(function(){
  if (typeof SIM !== 'object' || typeof MECH !== 'object') return;
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  // Rendre la main au navigateur sans passer par setTimeout (remplacé par l'horloge du simulateur)
  const pause = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
  const MZ = MECH_CAM.z;

  // Ce qui change avec le niveau, en plus de la visée (SIM.JOUEURS : erreur, tête, réflexe)
  //   voitDerriere : distance (m) à laquelle il remarque un zombie derrière lui ; esquive : part des crachats esquivés
  //   roqSeuil : zombies dans le groupe pour tirer le bras droit (chargeur pas plein) ; chaleur, reprise : il lâche
  //   la gâchette à cette chaleur et reprend à celle-là (1 : il tient jusqu'au blocage) ; arret : zombies qui le
  //   frappent pour qu'il arrête d'avancer ; avance : il tient compte de la vitesse de la cible pour les roquettes
  const NIV = {
    parfait:  { voitDerriere:60, esquive:1,   roqSeuil:4, chaleur:.85, reprise:.5,  arret:4,  avance:true,  carrefour:'malin' },
    debutant: { voitDerriere:4,  esquive:.3,  roqSeuil:1, chaleur:1,   reprise:0,   arret:7,  avance:false, carrefour:'hasard' },
    moyen:    { voitDerriere:15, esquive:.65, roqSeuil:3, chaleur:.92, reprise:.55, arret:5,  avance:true,  carrefour:'malin' },
    bon:      { voitDerriere:35, esquive:.9,  roqSeuil:4, chaleur:.86, reprise:.5,  arret:4,  avance:true,  carrefour:'malin' }
  };
  const BOSS_R = { titan:1, broodmother:1, behemoth:1, boss:1 };

  /* ---------- Mesure des dégâts encaissés (sans rien changer au jeu) ---------- */
  const SR = { actif:false, deg:{}, esq:0, crach:0, bossTues:0, roq:0 };
  const noter = (k, v) => { if (v > 0) SR.deg[k] = (SR.deg[k] || 0) + v; };
  let installe = false, srcCrachat = null;
  // Le son tire au hasard selon l'heure réelle (il saute des sons quand ils sont trop rapprochés) : il a donc son propre
  // hasard, sinon la même graine ne donnait pas la même course
  let g2 = 7;
  const hasardSon = () => { g2 = g2 * 16807 % 2147483647; return (g2 - 1) / 2147483646; };
  function sonAPart(o, k){
    const f = o[k]; if (typeof f !== 'function' || f.simSon) return;
    o[k] = function(){ if (!SR.actif) return f.apply(this, arguments); const m = Math.random; Math.random = hasardSon; try { return f.apply(this, arguments); } finally { Math.random = m; } };
    o[k].simSon = true;
  }
  function installer(){
    if (installe) return; installe = true;
    if (typeof Snd === 'object') Object.keys(Snd).forEach(k => { if (k !== 'init') sonAPart(Snd, k); });
    ['brSpot', 'brAt', 'brTink', 'brKill', 'brHorde', 'brCreak'].forEach(k => sonAPart(window, k)); // bruitages placés (js/37-bruitages.js)
    // Coups au corps à corps (et explosions des gonflés) : par type de zombie
    const _hb = hitBarricade;
    hitBarricade = function(z){ if (!SR.actif) return _hb.apply(this, arguments); const b0 = S.bar, r = _hb.apply(this, arguments); noter(z && z.type || 'autre', b0 - S.bar); return r; };
    // Crachats : qui les lance (cracheur ou Béhémoth), touchés ou esquivés
    const _sl = spitLaunch;
    spitLaunch = function(){ const o = _sl.apply(this, arguments); if (o) o.simSrc = srcCrachat || 'spitter'; return o; };
    const KB = ZKINDS.behemoth;
    if (KB){ const _u = KB.update; KB.update = function(){ srcCrachat = 'behemoth'; try { return _u.apply(this, arguments); } finally { srcCrachat = null; } }; }
    const _zf = zkFrame;
    zkFrame = function(){
      if (!SR.actif) return _zf.apply(this, arguments);
      const vol = __types.spits.filter(o => o.m.visible);
      const r = _zf.apply(this, arguments);
      vol.forEach(o => { if (o.m.visible) return; SR.crach++; if (Math.abs(MECH.x - o.b.x) > SPIT_ESQUIVE) SR.esq++; else noter('crachat ' + (o.simSrc === 'behemoth' ? 'du Béhémoth' : 'de cracheur'), o.dmg); });
      return r;
    };
    // Le Titan frappe le sol : onde de choc
    const KT = ZKINDS.titan;
    if (KT){ const _u = KT.update; KT.update = function(){ if (!SR.actif) return _u.apply(this, arguments); const b0 = S.bar, r = _u.apply(this, arguments); noter('onde du Titan', b0 - S.bar); return r; }; }
    Jeu.on('tue', (z, v) => { if (SR.actif && v && z && BOSS_R[z.type]) SR.bossTues++; });
  }

  /* ---------- Pilotage, à chaque image ---------- */
  const E = { z:null, t:0, tete:false, chaud:false, rueVue:0, vus:new WeakSet(), prec:new WeakMap() };
  const v3 = new THREE.Vector3();
  const oeil = () => v3.set(MECH.x, MECH_CAM.y, MZ);
  function zoneCoups(p){ return Math.abs(p.x - MECH.x) <= 6 && p.z <= MZ + 5 && p.z >= MZ - 14; }
  function visible(z, J){ const p = z.g.position; return !(p.z > MZ + 1 && Math.hypot(p.x - MECH.x, p.z - MZ) > J.voitDerriere); }
  // Qui viser au bras gauche : ceux qui le frappent, puis les cracheurs, le boss, sinon le plus proche
  function cible(J){
    let best = null, bs = -1e9;
    for (const z of zombies){
      if (z.dead || !z.g || !visible(z, J)) continue;
      const p = z.g.position, d = Math.hypot(p.x - MECH.x, p.z - MZ); if (d > 95) continue;
      let s = -d;
      if (zoneCoups(p)) s += 60;
      if (z.type === 'spitter' && d < 70) s += 30;
      if (BOSS_R[z.type]) s += 20;
      if (s > bs){ bs = s; best = z; }
    }
    return best;
  }
  function pointVise(z, tete, out){
    try { z.g.updateMatrixWorld(true); ((tete && z.head) ? z.head : (z.meshes && z.meshes[0]) || z.g).getWorldPosition(out); }
    catch (e) { out.copy(z.g.position); }
    if (out.y < .3) out.y = z.g.position.y + (z.aimY != null ? z.aimY : 1.1);
    return out;
  }
  const pv = new THREE.Vector3();
  function viserPoint(x, y, z, J){
    const o = oeil(), dx = x - o.x, dy = y - o.y, dz = z - o.z;
    yaw = Math.atan2(-dx, -dz) + gauss() * J.err; pitch = clamp(Math.atan2(dy, Math.hypot(dx, dz)) + gauss() * J.err, PITCH_MIN, .45);
    camera.rotation.set(pitch + recoilAcc, yaw, camera.rotation.z); camera.updateMatrixWorld(true); // le tir de cette image part dans cette direction
  }
  // Bras droit : le meilleur groupe (roquettes et grenades : zombies dans le rayon ; canon : zombies dans la file ; arc : en chaîne)
  function groupe(J, id){
    const W = WEAPONS[id], r = (W.radius || 5) * .7, rail = id === 'railgun', vivants = [];
    for (const z of zombies){ if (!z.dead && z.g && visible(z, J)){ const p = z.g.position, d = Math.hypot(p.x - MECH.x, p.z - MZ); if (d >= 9 && d <= 90) vivants.push(z); } }
    let best = null, bn = 0;
    for (const a of vivants){
      const pa = a.g.position; let n = BOSS_R[a.type] ? 6 : a.type === 'abomination' ? 3 : 0;
      for (const b of vivants){
        const pb = b.g.position;
        if (rail ? (Math.abs(pb.x - pa.x) < 2.2 && (pb.z - MZ) * (pa.z - MZ) > 0 && Math.abs(pb.z - MZ) >= Math.abs(pa.z - MZ)) : Math.hypot(pb.x - pa.x, pb.z - pa.z) < (id === 'arc' ? 8 : r)) n++;
      }
      if (n > bn){ bn = n; best = a; }
    }
    return { z:best, n:bn };
  }
  function piloter(J, dt){
    const idL = mW('L'), idR = mW('R'), WR = MECH_W[idR];
    // 1. Cible du bras gauche (temps de réaction pour en changer)
    E.t -= dt;
    if (!E.z || E.z.dead || E.t <= 0){ E.z = cible(J); E.t = J.reflexe; E.tete = Math.random() < J.tete; }
    const z = E.z;
    if (z) pointVise(z, E.tete, pv);
    // 2. Bras droit : prêt, et un groupe qui en vaut la peine (chargeur plein : il tire sur ce qu'il a)
    MECH.rocket = false;
    const pret = MECH.rcd <= 0 && (!WR.ch || (MECH.rch || 0) >= 1);
    let tirD = false;
    if (pret){
      const plein = !WR.ch || (MECH.rch || 0) >= WR.ch - .05;
      const g = groupe(J, idR);
      if (g.z && (g.n >= J.roqSeuil || plein)){
        const q = pointVise(g.z, false, new THREE.Vector3()), d = Math.hypot(q.x - MECH.x, q.z - MZ);
        if (J.avance && WEAPONS[idR].speed){ const pr = E.prec.get(g.z); if (pr){ const k = d / WEAPONS[idR].speed; q.x += pr.vx * k; q.z += pr.vz * k; } }
        if (WEAPONS[idR].kind === 'rocket') q.y = Math.max(.4, q.y - .6); // un peu bas : l'explosion prend le groupe même en ratant
        viserPoint(q.x, q.y, q.z, J); MECH.rocket = true; tirD = true; SR.roq++;
      }
    }
    if (!tirD && z) viserPoint(pv.x, pv.y, pv.z, J);
    // 3. Bras gauche : la gâchette selon la chaleur
    let tirG = !!z;
    if (z && idL === 'flamer' && z.g.position.z < BAR_Z - WEAPONS.flamer.range * accK('flamer', 'range') && !zoneCoups(z.g.position)) tirG = false; // hors de portée
    if (J.chaleur < 1){
      if (E.chaud){ if (MECH.heat <= J.reprise) E.chaud = false; }
      else if (MECH.heat >= J.chaleur) E.chaud = true;
      if (E.chaud) tirG = false;
    }
    MECH.mini = tirG && MECH.hot <= 0;
    // 4. Déplacement : pas de côté contre les crachats, sinon avancer (s'arrêter quand trop de zombies frappent)
    // Il remarque chaque crachat après son temps de réaction et décide une fois s'il l'esquive ; il va alors à l'endroit
    // le plus proche qui est loin de tous les crachats qu'il a vus venir
    const menaces = [];
    for (const o of __types.spits){
      if (!o.m.visible || o.t < J.reflexe * .5) continue;
      if (!E.vus.has(o)){ E.vus.add(o); if (Math.random() < J.esquive) E.prec.set(o, { esquive:true }); }
      const m = E.prec.get(o); if (m && m.esquive) menaces.push(o.b.x);
    }
    let vxW = 0, vzW = 0, but = null;
    if (menaces.length && menaces.some(bx => Math.abs(MECH.x - bx) <= SPIT_ESQUIVE + .3)){
      const marge = SPIT_ESQUIVE + .5, cands = [];
      menaces.forEach(bx => { cands.push(bx - marge, bx + marge); });
      cands.filter(x => x >= -9 && x <= 9 && menaces.every(bx => Math.abs(x - bx) >= marge - .01)).forEach(x => { if (but === null || Math.abs(x - MECH.x) < Math.abs(but - MECH.x)) but = x; });
    }
    if (but !== null) vxW = clamp((but - MECH.x) * 6, -1, 1) * MECH_STRAFE;
    else if (Math.abs(MECH.x) > 5) vxW = -Math.sign(MECH.x) * MECH_STRAFE * .5; // revient vers le milieu, pour avoir de la place
    let frappent = 0; for (const o of zombies) if (!o.dead && o.g && zoneCoups(o.g.position)) frappent++;
    const style = BOT_R.style;
    // Il s'arrête pour nettoyer quand trop de zombies le frappent, mais il repart quand les renforts arrivent (le jeu
    // lui dit « Avance ! ») ou quand son blindage passe sous la moitié : rester sur place, c'est mourir
    const presse = (MECH.renf || 0) > 0 || S.bar < S.barMax * .5;
    const avance = style === 'fonce' || (style !== 'reste' && (frappent < J.arret || presse));
    if (avance) vzW = -MECH_WALK * (1 + .08 * mUp('legs'));
    // Monde → commandes du robot (elles suivent la direction du regard)
    const sy = Math.sin(yaw), cy = Math.cos(yaw), spd = MECH_WALK * (1 + .08 * mUp('legs'));
    const fw = -sy * vxW - cy * vzW, st = cy * vxW - sy * vzW;
    MECH.joy.dy = -clamp(fw / (fw > 0 ? spd : spd * .6), -1, 1); MECH.joy.dx = clamp(st / MECH_STRAFE, -1, 1);
    // Vitesse des zombies (pour viser devant eux)
    if (J.avance) for (const o of zombies){ if (o.dead || !o.g) continue; const p = o.g.position, pr = E.prec.get(o); if (pr){ pr.vx = (p.x - pr.x) / dt; pr.vz = (p.z - pr.z) / dt; pr.x = p.x; pr.z = p.z; } else E.prec.set(o, { x:p.x, z:p.z, vx:0, vz:0 }); }
  }

  /* ---------- Carrefour ---------- */
  const DANGER = { calme:-.5, ruelle:1, avenue:1.6, nid:.8, tempete:.6, soleil:0 };
  function carrefour(J){
    const R = (__mb.MB.routes || []); if (!R.length) return false;
    let r = R[0];
    if (J.carrefour === 'hasard') r = R[Math.floor(Math.random() * R.length)];
    else {
      const a = clamp(S.bar / S.barMax, 0, 1); let bs = -1e9;
      R.forEach(x => { const s = (x.scrap || 1) + (x.prime ? x.prime / 400 : 0) - (DANGER[x.id] || 0) * (1 - a) * 3 + (x.repairFull ? (1 - a) * 2.5 : 0); if (s > bs){ bs = s; r = x; } });
    }
    BOT_R.routes[r.id] = (BOT_R.routes[r.id] || 0) + 1;
    __mb.mbGo(r);
    return true;
  }

  /* ---------- Une course ---------- */
  // o : { joueur, graine, maxMin, style ('normal', 'fonce', 'reste') } ; le profil (garage) est celui de P
  const BOT_R = { style:'normal', routes:{} };
  async function course(o){
    o = o || {};
    installer();
    if (typeof Snd === 'object') Snd.init(); // le son se prépare (il tire beaucoup au hasard la première fois) avant la graine
    groanT = 3; // minuterie des grognements : elle restait de la course d'avant
    if (o.graine) SIM.hasard(o.graine);
    // Pluie et neige gardent leurs gouttes d'une course à l'autre : remises en place avec la graine
    try {
      time = 0;
      if (ambRain) for (let i = 0; i < AMB_NRAIN; i++){ ambRain.spd[i] = rand(22, 30); ambDrop(ambRain.pos, i, rand(AMB_BOX.y0, AMB_BOX.y1)); }
      if (ambFlakes) for (let i = 0; i < AMB_NFLAKE; i++){ const p = ambFlakes.pos; p[i * 3] = rand(-AMB_BOX.x, AMB_BOX.x); p[i * 3 + 1] = rand(AMB_BOX.y0, AMB_BOX.y1); p[i * 3 + 2] = rand(AMB_BOX.z0, AMB_BOX.z1); ambFlakes.spd[i] = rand(.7, 1.3); ambFlakes.ph[i] = rand(0, 6.28); }
    } catch (e) { errNote(e); }
    const J = Object.assign({}, SIM.JOUEURS[o.joueur] || SIM.JOUEURS.moyen, NIV[o.joueur] || NIV.moyen);
    BOT_R.style = o.style || 'normal'; BOT_R.routes = {};
    const dt = o.dt || 1 / 30, maxT = (o.maxMin || 30) * 60;
    const scr0 = P.scrap || 0, xp0 = P.xp || 0;
    Object.assign(SR, { actif:true, deg:{}, esq:0, crach:0, bossTues:0, roq:0 });
    Object.assign(E, { z:null, t:0, chaud:false, rueVue:0, vus:new WeakSet(), prec:new WeakMap() });
    mechStart();
    let t = 0, n = 0, rue = MECH.street, t0 = 0, d0 = 0; const rues = [];
    const deg = () => Object.keys(SR.deg).reduce((a, k) => a + SR.deg[k], 0);
    while (t < maxT && state === 'mech'){
      if (MECH.choosing){ if (!carrefour(J)) break; continue; }
      if (!MECH.paused) piloter(J, dt);
      visuals(dt); SIM.horloge(dt); t += dt;
      // o.carrefour : montre le carrefour au bout de la rue. Dans le jeu (2026-11-13), la fin de rue de js/39-robot.js
      // lance le fondu dans la même image où le robot passe le bout de la rue, avant que js/40-robot-monstres.js
      // ait pu montrer le carrefour : il n'apparaît jamais. Cette option fait comme si c'était corrigé.
      if (o.carrefour && MECH.fade > 0 && MECH.fadeTo === 'street' && !MECH.choosing && E.rueVue !== MECH.street && MECH.dist >= MECH_LEN){ MECH.fade = 0; E.rueVue = MECH.street; mbCrossroads(); }
      if (MECH.street !== rue){ rues.push({ rue, s:Math.round(t - t0), deg:Math.round(deg() - d0) }); rue = MECH.street; t0 = t; d0 = deg(); }
      if (o.pauseN && ++n % o.pauseN === 0) await pause(); // sans pause : un chargement qui finit pendant la course tirerait au hasard
    }
    MECH.mini = MECH.rocket = false; MECH.joy.dx = MECH.joy.dy = 0; firing = false;
    const mort = state === 'mechover';
    const res = { joueur:J.nom, rue:MECH.street, rues:Math.round(100 * ((MECH.street - 1) + Math.min(1, MECH.dist / MECH_LEN))) / 100, mort,
      minutes:Math.round(t / 6) / 10, tues:MECH.kills, ferraille:Math.round((P.scrap || 0) - scr0), xp:Math.round((P.xp || 0) - xp0),
      deg:Object.fromEntries(Object.keys(SR.deg).map(k => [k, Math.round(SR.deg[k])])), degTotal:Math.round(deg()), blindage:Math.round(S.barMax),
      crachats:SR.crach, esquives:SR.esq, bossTues:SR.bossTues, routes:Object.assign({}, BOT_R.routes), parRue:rues.concat([{ rue, s:Math.round(t - t0), deg:Math.round(deg() - d0), fin:true }]) };
    SR.actif = false;
    SIM.horloge(10); // vide les minuteries en attente (panneau de fin)
    try { if (MECH.on) mechQuit(); } catch (e) { errNote(e); }
    return res;
  }

  // Profil neuf, avec des missions tirées avec une graine fixe (celles du profil de départ sont tirées au chargement de
  // la page, au hasard, et une mission réussie donne de la ferraille)
  function profil(){
    SIM.profilNeuf(); SIM.hasard(4242);
    try { delete P.miss; MS(); } catch (e) { errNote(e); }
    mechNorm(); saveP();
  }

  // Première course d'une page : des chargements finissent encore (ils tirent au hasard à un moment qui varie).
  // Une petite course jetable avant les mesures : ensuite, la même graine donne la même course.
  let chaud = false;
  async function prechauffer(){
    if (chaud) return; chaud = true;
    const p = JSON.stringify(P); profil();
    await course({ joueur:'moyen', graine:999, maxMin:.5 });
    // Ce que le jeu crée la première fois qu'il en a besoin (pluie, neige...) : tout créé ici, une fois
    try { Object.keys(WEATHERS).forEach(w => ambSet(w, true)); ambSet('soleil', true); } catch (e) { errNote(e); }
    Object.keys(P).forEach(k => delete P[k]); Object.assign(P, JSON.parse(p)); mechNorm(); saveP();
  }

  /* ---------- Garage ---------- */
  // Prix de tout ce qui reste à acheter
  function offres(){
    const o = [];
    MECH_UPG_ORDER.forEach(k => { const l = mUp(k); if (l < MECH_UPG[k].max) o.push({ type:'upg', k, c:mechUpgCost(k, l) }); });
    MECH_W_ORDER.forEach(id => { if (!P.mech.own[id]) o.push({ type:'arme', k:id, c:MECH_W[id].cost }); });
    return o;
  }
  function acheter(x){ return x.type === 'upg' ? mechUpgBuy(x.k) : mechWeapon(x.k); }
  // Stratégies : 'moinsCher' (toujours l'amélioration la moins chère), 'ligne:clé' (une seule ligne),
  // 'arme:id' (l'arme d'abord, équipée, puis le reste au moins cher), ou une liste de priorités (BOT_R.priorites)
  function garage(strat){
    mechNorm(); const achats = [];
    if (strat === 'rien') return achats;
    const arme = strat.indexOf('arme:') === 0 ? strat.slice(5) : null;
    if (arme && !P.mech.own[arme] && P.scrap >= MECH_W[arme].cost){ if (mechWeapon(arme)) achats.push(arme); }
    if (arme && P.mech.own[arme]) mechWeapon(arme);
    for (let n = 0; n < 200; n++){
      let o = offres().filter(x => x.type === 'upg');
      if (strat.indexOf('ligne:') === 0) o = o.filter(x => x.k === strat.slice(6));
      if (strat === 'malin'){
        // Un joueur qui veut avancer : les armes jugées les meilleures quand il peut se les payer, sinon le moins cher
        const w = (BOT_R.armesMalin || []).find(id => !P.mech.own[id]);
        if (w && P.scrap >= MECH_W[w].cost){ if (mechWeapon(w)) { achats.push(w); continue; } }
        const pr = BOT_R.priorites; if (pr) o = o.filter(x => pr.indexOf(x.k) >= 0).concat(o.filter(x => pr.indexOf(x.k) < 0).map(x => Object.assign(x, { c:x.c * 3 })));
        if (w && P.scrap < MECH_W[w].cost && P.scrap > MECH_W[w].cost * .6) break; // il garde sa ferraille pour l'arme
      }
      o.sort((a, b) => a.c - b.c);
      const x = o[0]; if (!x || P.scrap < mechUpgCost(x.k, mUp(x.k))) break;
      if (!acheter(x)) break; achats.push(x.k);
    }
    (BOT_R.armesMalin || []).forEach(id => { if (strat === 'malin' && P.mech.own[id]) mechWeapon(id); });
    return achats;
  }
  const lvCopie = () => Object.assign({}, P.mech.lv);

  // Profil neuf, ferraille donnée, une stratégie de garage, puis une course
  async function essai(o){
    profil(); P.scrap = o.budget || 0;
    const achats = garage(o.strat || 'moinsCher'), reste = Math.round(P.scrap);
    const lv = lvCopie(), armes = { L:mW('L'), R:mW('R') };
    const r = await course(o);
    r.reste = reste; r.lv = lv; r.armes = armes; r.achats = achats.length;
    return r;
  }
  // Banc à budget égal : chaque lot (stratégie) avec la même ferraille et les mêmes graines
  async function banc(o){
    SIM.preparer(); await prechauffer();
    const res = [];
    for (const L of o.lots){
      const rs = [];
      for (const g of (o.graines || [1, 2, 3])) rs.push(await essai({ budget:o.budget, strat:L.strat, joueur:o.joueur, graine:g, maxMin:o.maxMin || 25, style:o.style, carrefour:o.carrefour }));
      res.push({ nom:L.nom, strat:L.strat, courses:rs });
    }
    return { budget:o.budget, joueur:(SIM.JOUEURS[o.joueur] || SIM.JOUEURS.moyen).nom, lots:res };
  }
  // Plusieurs courses d'affilée sur le même profil : la ferraille gagnée est dépensée au garage entre chaque
  // Une course de la progression, puis le garage. o.P : le profil d'avant (texte JSON), absent pour un profil neuf.
  // Le simulateur ouvre une page neuve à chaque course (une seule page pour 12 longues courses manquait de mémoire).
  async function pas(o){
    SIM.preparer(); await prechauffer();
    if (o.P){ Object.keys(P).forEach(k => delete P[k]); Object.assign(P, JSON.parse(o.P)); mechNorm(); saveP(); } else profil();
    BOT_R.priorites = o.priorites || null; BOT_R.armesMalin = o.armes || null;
    const i = o.i || 0;
    const r = await course({ joueur:o.joueur, graine:(o.graine || 1) * 1000 + i, maxMin:o.maxMin || 25, style:o.style, carrefour:o.carrefour });
    const avant = Math.round(P.scrap);
    const achats = garage(o.strat || 'moinsCher');
    const prochain = offres().sort((a, b) => a.c - b.c)[0];
    return { ligne:{ n:i + 1, rue:r.rue, rues:r.rues, minutes:r.minutes, tues:r.tues, ferraille:r.ferraille, degTotal:r.degTotal, avant, achats, reste:Math.round(P.scrap),
      prochain:prochain ? { k:prochain.k, c:prochain.c } : null, lv:lvCopie(), armes:{ L:mW('L'), R:mW('R') }, deg:r.deg }, P:JSON.stringify(P) };
  }
  // Toute la progression dans la même page (pour un essai court)
  async function progression(o){
    const res = []; let p = null;
    for (let i = 0; i < (o.courses || 10); i++){ const x = await pas(Object.assign({}, o, { i, P:p })); res.push(x.ligne); p = x.P; }
    return { joueur:(SIM.JOUEURS[o.joueur] || SIM.JOUEURS.moyen).nom, strat:o.strat || 'moinsCher', courses:res };
  }
  // Profil neuf : plusieurs courses sans rien au garage
  async function neuf(o){
    SIM.preparer(); await prechauffer(); const rs = [];
    for (const g of (o.graines || [1, 2, 3])){ profil(); rs.push(await course({ joueur:o.joueur, graine:g, maxMin:o.maxMin || 25, style:o.style, carrefour:o.carrefour })); }
    return { joueur:(SIM.JOUEURS[o.joueur] || SIM.JOUEURS.moyen).nom, style:o.style || 'normal', courses:rs };
  }
  // Prix total de chaque chose du garage (pour « combien de courses pour se la payer »)
  function prix(){
    const o = {};
    MECH_UPG_ORDER.forEach(k => { let s = 0; const p = []; for (let l = 0; l < MECH_UPG[k].max; l++){ s += mechUpgCost(k, l); p.push(mechUpgCost(k, l)); } o[k] = { nom:MECH_UPG[k].name, max:MECH_UPG[k].max, premier:p[0], total:s, paliers:p }; });
    MECH_W_ORDER.forEach(id => { if (MECH_W[id].cost) o[id] = { nom:MECH_W[id].name, total:MECH_W[id].cost, arme:true }; });
    return o;
  }

  SIM.robot = { pas, profil, prechauffer, NIV, BOT_R, SR, course, garage, essai, banc, progression, neuf, prix, offres, installer };
})();
