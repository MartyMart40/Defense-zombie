'use strict';
/* ================= Robot-joueur du RTS « Guerre des robots » (simulateur d'équilibrage) ================= */
// Injecté dans la vraie page du jeu par outils/simulateur.js, après outils/sim-bot.js (jamais chargé par index.html).
// Il passe par les vraies fonctions du jeu, comme un joueur : rtsBuild (pose sur le quadrillage), rtsBuy, rtsUpgBuy,
// rtsTurretUp, rtsSelect + rtsOrder (ordres de marche et d'attaque), rtsHold (« Tenir »), rtsRallySet (point de ralliement).
// Il ne pilote jamais une unité lui-même : le pilotage n'est pas mesuré.
//
// Stratégies (SIM.rts({ strategie })) :
//   tourelles : l'ancien robot-joueur (usine lourde, beaucoup de tourelles, l'unité la plus forte qu'il peut payer)
//   blindes   : garage de blindés et tanks, quelques mitrailleurs devant
//   air       : héliport et aérodromes (Apache, Warthog, AC-130, chasseur), une armée au sol qui retient les zombies
//   mixte     : ce qu'un bon joueur ferait : récupérateurs, atelier, armée variée, améliorations, nids au bon rythme
// Pour toutes sauf « tourelles » : point de ralliement devant la base, une garde qui reste à la base (les unités
// à longue portée « tiennent » la ligne), un groupe d'attaque qui part sur le nid le plus proche quand il est assez
// fort et revient s'il fond ou si un boss approche de la base, les unités abîmées envoyées à l'atelier, les pertes remplacées.
//
// Banc des appuis (SIM.rtsBanc) : une armée au sol fixe, plus un appui d'un seul type, même flot de zombies, menace fixe.

(function(){
  if (!window.SIM) throw new Error('outils/sim-bot.js doit être chargé avant outils/sim-bot-rts.js');
  const SIM = window.SIM, BOT = SIM.BOT;
  // Laisser respirer la page sans setTimeout (le simulateur l'a remplacé par son horloge)
  const pause = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
  const min1 = t => Math.round(t / 6) / 10;

  /* ---------- Suivi du danger : qui frappe quoi, quand ---------- */
  const SUIVI = { on:false, now:() => RTS.t };
  function suiviDebut(){
    Object.assign(SUIVI, { on:true, now:() => RTS.t, premUnite:null, premTourelle:null, premBat:null, premQG:null, coupsQG:[], degatsBat:0, pertes:[], batsPerdus:[] });
  }
  // Cause d'un coup sur le QG : un boss tout près dont les dégâts correspondent (coup, piétinement à 50 %, acide à 60 %), sinon les zombies
  function causeQG(T, dmg){
    for (const z of zombies){
      if (z.dead || !z.rtsBoss) continue;
      const d = Math.hypot(z.g.position.x - T.x, z.g.position.z - T.z);
      if (d > 12 + T.r + 4 && z.type !== 'behemoth') continue;
      if (d > 40) continue;
      const k = dmg / (z.dmg || 1);
      if (Math.abs(k - 1) < .01 || Math.abs(k - .5) < .01 || Math.abs(k - .6) < .01) return 'boss';
    }
    return 'zombies';
  }
  const _dmg = window.rtsDmgTarget, _udie = window.rtsUnitDie, _bdie = window.rtsBldDie;
  window.rtsDmgTarget = function(T, dmg){
    if (SUIVI.on && T && !T.dead) try {
      const t = SUIVI.now();
      if (T.B){
        SUIVI.degatsBat += Math.min(dmg, Math.max(0, T.hp));
        if (T === RTS.base){ if (SUIVI.premQG == null) SUIVI.premQG = t; SUIVI.coupsQG.push({ t, d:Math.min(dmg, Math.max(0, T.hp)), c:causeQG(T, dmg) }); }
      }
    } catch (e) { errNote(e); }
    return _dmg.apply(this, arguments);
  };
  window.rtsUnitDie = function(u){
    if (SUIVI.on && u && !u.dead) try { const t = SUIVI.now(); if (SUIVI.premUnite == null) SUIVI.premUnite = t; SUIVI.pertes.push({ t, type:u.type, cout:u.U.cost, role:u.simRole || '' }); } catch (e) { errNote(e); }
    return _udie.apply(this, arguments);
  };
  window.rtsBldDie = function(o, sold){
    if (SUIVI.on && o && !o.dead && !sold) try {
      const t = SUIVI.now();
      if (o.B.turret){ if (SUIVI.premTourelle == null) SUIVI.premTourelle = t; }
      else if (o.type !== 'hq' && SUIVI.premBat == null) SUIVI.premBat = t;
      SUIVI.batsPerdus.push({ t, type:o.type });
    } catch (e) { errNote(e); }
    return _bdie.apply(this, arguments);
  };

  /* ---------- Outils du joueur ---------- */
  const argent = () => S.money;
  const vivants = () => RTS.units.filter(u => !u.dead);
  const nb = t => RTS.blds.filter(o => !o.dead && o.type === t).length;
  const nbU = t => RTS.units.filter(u => !u.dead && u.type === t).length;
  const tourelles = () => RTS.blds.filter(o => !o.dead && o.B.turret);
  const nidsDetruits = () => RTS.nests.filter(n => n.dead).length;
  const ACH = { unites:{}, bats:{}, depUnites:0, depBats:0, depAmel:0, depTour:0 };
  function achatsDebut(){ Object.assign(ACH, { unites:{}, bats:{}, depUnites:0, depBats:0, depAmel:0, depTour:0 }); }
  // Pose sur le quadrillage de 2 m : tourelles devant (au nord), le reste derrière ; comme le joueur, essaie des places libres
  function poser(type){
    const B = RTS_BLD[type], R = RTS.baseR, tour = !!B.turret;
    if (S.money < B.cost) return null;
    for (let k = 0; k < 160; k++){
      const a = (tour ? -Math.PI / 2 : Math.PI / 2) + (Math.random() - .5) * (tour ? 2.2 : 3.6);
      const d = (tour ? .55 + Math.random() * .4 : .2 + Math.random() * .75) * (R - B.size - 1);
      const x = Math.round(Math.cos(a) * d / 2) * 2, z = Math.round(Math.sin(a) * d / 2) * 2;
      if (!rtsBldOk(type, x, z)){
        const o = rtsBuild(type, x, z, 0);
        if (o){ ACH.bats[type] = (ACH.bats[type] || 0) + 1; if (tour) ACH.depTour += B.cost; else ACH.depBats += B.cost; }
        return o;
      }
    }
    return null;
  }
  function acheter(type, reserve){
    const U = RTS_UNITS[type];
    if (!U || S.money < U.cost + (reserve || 0) || !rtsFactoryFor(type)) return null;
    if (vivants().length >= RTS_CFG.maxUnits) return null;
    if (U.kind === 'air' && rtsAirRoom() <= 0) return null;
    const u = rtsBuy(type);
    if (u){ ACH.unites[type] = (ACH.unites[type] || 0) + 1; ACH.depUnites += U.cost; }
    return u;
  }
  // Améliorations : la moins chère de la liste [type, clé], tant qu'il reste la réserve
  function ameliorer(liste, reserve){
    for (let n = 0; n < 6; n++){
      let best = null, bc = 1e18;
      for (const [t, k] of liste){
        if (!nbU(t)) continue;
        const D = rtsUpgDef(t, k); if (!D || rtsLv(t, k) >= D.max) continue;
        const c = rtsUpgCost(t, k); if (c < bc){ bc = c; best = [t, k]; }
      }
      if (!best || S.money - bc < reserve) return;
      if (!rtsUpgBuy(best[0], best[1])) return;
      ACH.depAmel += bc;
    }
  }
  function monterTourelles(reserve){
    const L = tourelles().filter(o => o.lv < RTS_TMAX).sort((a, b) => a.lv - b.lv);
    for (const o of L){ const c = rtsTCost(o); if (S.money - c < reserve) return; if (rtsTurretUp(o)) ACH.depTour += c; }
  }
  // Ordres : comme le joueur, choisir les unités puis toucher la carte ou un nid
  function ordre(units, p){
    units = units.filter(u => !u.dead); if (!units.length) return;
    rtsSelect(units, false); rtsOrder(p); RTS.sel.length = 0;
  }
  function tenir(units, on){
    units = units.filter(u => !u.dead && !!u.hold !== on); if (!units.length) return;
    rtsSelect(units, false); rtsHold(); RTS.sel.length = 0;
  }
  const atelier = () => RTS.blds.find(o => !o.dead && o.B.heal);

  /* ---------- Commandement (blindes, air, mixte) ---------- */
  const CMD = { att:null, ral:{ x:0, z:-22 } };
  const LONGUE = { sniper:1, rocket:1, heavy:1 }; // ces unités « tiennent » la ligne (sinon elles reculent et se dispersent)
  const fortU = u => u.U.cost * (u.hp / u.maxHp);
  function bossPres(r){ for (const z of zombies) if (!z.dead && z.rtsBoss && Math.hypot(z.g.position.x, z.g.position.z) < r) return z; return null; }
  function commander(cfg){
    const tous = vivants(), sol = tous.filter(u => u.U.kind !== 'air');
    // Nouvelles unités : garde ou groupe d'attaque, selon la part voulue (en valeur)
    let vg = 0, vt = 0; sol.forEach(u => { vt += u.U.cost; if (u.simRole === 'g') vg += u.U.cost; });
    sol.forEach(u => {
      if (u.simRole) return;
      const veut = cfg.garde[u.type] != null ? cfg.garde[u.type] : cfg.partGarde;
      u.simRole = vg < veut * vt || veut >= 1 ? 'g' : 'a'; if (u.simRole === 'g') vg += u.U.cost;
    });
    // Unités abîmées : à l'atelier (ordre de marche), puis retour à leur place une fois réparées
    const A = atelier();
    sol.forEach(u => {
      if (!A) return;
      if (!u.simSoin && u.hp < u.maxHp * .4 && u.U.kind === 'ground'){
        u.simSoin = true; if (u.hold) tenir([u], false); ordre([u], { x:A.x + rand(-3, 3), z:A.z - A.r - 2 });
      } else if (u.simSoin && u.hp > u.maxHp * .85){
        u.simSoin = false; ordre([u], { x:CMD.ral.x + rand(-10, 10), z:CMD.ral.z + rand(-3, 3) });
      }
    });
    // Garde : à la ligne de ralliement ; les unités à longue portée tiennent la position
    const garde = sol.filter(u => u.simRole === 'g' && !u.simSoin);
    tenir(garde.filter(u => LONGUE[u.type] && u.cmd === 'idle' && Math.hypot(u.g.position.x - u.hx, u.g.position.z - u.hz) < 3), true);
    // Groupe d'attaque. Essayé : le faire « tenir » pendant l'attaque (une unité qui tient va quand même au nid, sans reculer) :
    // il arrive au nid, mais fond (115 unités perdues en 19 min au lieu de 13 en 20 min) ; laissé sans « Tenir ».
    const att = sol.filter(u => u.simRole === 'a' && !u.simSoin);
    const force = att.reduce((s, u) => s + fortU(u), 0), nd = nidsDetruits();
    const danger = bossPres(25) || (RTS.base && RTS.base.hp < RTS.base.maxHp * .85);
    if (CMD.att){
      const vis = CMD.att.units.filter(u => !u.dead && !u.simSoin);
      const f = vis.reduce((s, u) => s + fortU(u), 0);
      const n = CMD.att.nid;
      if (danger || f < CMD.att.f0 * .4 || !vis.length){ // il fond ou la base est en danger : retour
        CMD.journal.push({ min:min1(RTS.t), fin:danger ? 'rappel (danger à la base)' : 'retraite (groupe fondu)', f:Math.round(f), f0:Math.round(CMD.att.f0), nid:Math.round(100 * n.hp / n.maxHp), d:Math.round(Math.hypot(n.x, n.z)) });
        tenir(vis, false); ordre(vis, { x:CMD.ral.x, z:CMD.ral.z - 4 }); CMD.att = null; CMD.repos = RTS.t + 20;
      } else if (n.dead){
        const suiv = nidProche(); if (suiv && f > cfg.seuil(nd) * .7){ CMD.journal.push({ min:min1(RTS.t), fin:'nid détruit, au suivant', f:Math.round(f) }); ordre(vis, { nest:suiv }); CMD.att.nid = suiv; CMD.att.f0 = Math.max(f, CMD.att.f0 * .8); }
        else { CMD.journal.push({ min:min1(RTS.t), fin:'nid détruit, retour', f:Math.round(f), f0:Math.round(CMD.att.f0) }); tenir(vis, false); ordre(vis, { x:CMD.ral.x, z:CMD.ral.z - 4 }); CMD.att = null; CMD.repos = RTS.t + 10; }
      } else {
        // Les renforts du groupe d'attaque rejoignent l'attaque
        const neufs = att.filter(u => CMD.att.units.indexOf(u) < 0 && u.cmd !== 'attack'); if (neufs.length){ ordre(neufs, { nest:n }); CMD.att.units.push(...neufs); }
      }
    } else if (!danger && att.length >= cfg.minAtt && force >= cfg.seuil(nd) && RTS.t > (CMD.repos || 0)){
      const n = nidProche(); if (n){ ordre(att, { nest:n }); CMD.att = { nid:n, units:att.slice(), f0:force, t:RTS.t }; CMD.nAtt = (CMD.nAtt || 0) + 1; CMD.journal.push({ min:min1(RTS.t), debut:att.length + ' unités', f0:Math.round(force), d:Math.round(Math.hypot(n.x, n.z)) }); }
    }
  }
  function nidProche(){ let best = null, bd = 1e9; RTS.nests.forEach(n => { if (!n.dead){ const d = Math.hypot(n.x, n.z); if (d < bd){ bd = d; best = n; } } }); return best; }

  /* ---------- Stratégies ---------- */
  const TOUR_CYCLE = ['t_mg', 't_mg', 't_cannon', 't_tesla', 't_mg', 't_flame', 't_cannon', 't_tesla'];
  function tourellesVoulues(n, reserve){
    const L = tourelles(); if (L.length >= n) return;
    const t = TOUR_CYCLE[L.length % TOUR_CYCLE.length];
    if (S.money >= RTS_BLD[t].cost + reserve) poser(t);
  }
  // Achat selon une liste de priorités [type, combien en voulu] : bâtit l'usine qui manque
  function composer(liste, reserve){
    for (const [t, voulu] of liste){
      if (nbU(t) >= voulu) continue;
      const U = RTS_UNITS[t];
      // Usine ou aérodrome qui manque : il le bâtit ; s'il n'y a pas la place, il passe à la priorité suivante
      if (!nb(U.fac)){ if (S.money < RTS_BLD[U.fac].cost + 100 || poser(U.fac)) return; continue; }
      if (U.kind === 'air' && rtsAirRoom() <= 0){ if (S.money < RTS_BLD.airfield.cost + 200 || poser('airfield')) return; continue; }
      if (acheter(t, reserve)) return;
      return; // on attend d'avoir l'argent pour la priorité
    }
  }
  function ouverture(nScrap){
    if (nb('scrap') < nScrap && S.money >= RTS_BLD.scrap.cost + 150 && (nb('scrap') < 1 || vivants().length >= 4)) poser('scrap');
    if (!nb('repair') && vivants().length >= 6 && S.money >= RTS_BLD.repair.cost + 250) poser('repair');
  }
  const STRATS = {
    tourelles: {
      nom:'Tourelles et robots (l’ancien robot-joueur)',
      desc:'usine lourde, récupérateur, atelier, tourelles devant la base (5, plus 2 par nid détruit, plus une toutes les 3 minutes), l’unité la plus forte qu’il peut payer, des améliorations dès qu’il a de l’argent en trop, attaque le nid le plus proche avec toute l’armée au sol dès qu’elle compte 8 unités',
      decider(){
        const m = argent, nd = nidsDetruits();
        if (!nb('heavyfac') && m() >= RTS_BLD.heavyfac.cost + 200) poser('heavyfac');
        if (nb('heavyfac') && !nb('repair') && m() >= RTS_BLD.repair.cost + 600) poser('repair');
        if (!nb('scrap') && m() >= RTS_BLD.scrap.cost + 400) poser('scrap');
        if (tourelles().length < 5 + 2 * nd + Math.floor(RTS.t / 180) && m() >= 600) poser(RTS.t > 240 && Math.random() < .5 ? 't_cannon' : 't_mg');
        const voulu = Math.min(RTS_CFG.maxUnits, 10 + nd * 3 + Math.floor(RTS.t / 90));
        if (vivants().length < voulu){
          const t = ['heavy', 'rocket', 'gunner', 'rifle'].find(t => rtsFactoryFor(t) && m() >= RTS_UNITS[t].cost + 150);
          if (t) acheter(t, 0);
          if (t && m() > 3000){ const t2 = ['heavy', 'rocket', 'gunner'].find(x => rtsFactoryFor(x) && m() >= RTS_UNITS[x].cost + 150); if (t2) acheter(t2, 0); }
        }
        if (vivants().length >= 8 && m() > 1800){
          const types = [...new Set(vivants().map(u => u.type))];
          for (const t of types) for (const k of ['arm', 'hp', 'rate']){ const c = rtsUpgCost(t, k); if (c < m() - 800 && rtsUpgBuy(t, k)) ACH.depAmel += c; }
        }
        tourelles().forEach(o => { if (m() > 1000){ const c = rtsTCost(o); if (rtsTurretUp(o)) ACH.depTour += c; } });
        const sol = vivants().filter(u => u.U.kind === 'ground');
        if (sol.length >= 8){ const n = nidProche(); if (n) sol.forEach(u => { if (u.cmd !== 'attack' && !u.retreat){ u.nest = n; u.cmd = 'attack'; } }); }
      }
    },
    blindes: {
      nom:'Blindés', desc:'2 récupérateurs, garage de blindés et tanks (un de plus toutes les 90 s, 24 au plus), 3 à 8 mitrailleurs et 2 fantassins devant, atelier, 4 tourelles plus une par nid ; améliorations des tanks d’abord',
      cmd:{ partGarde:.4, garde:{ gunner:1, rifle:1 }, minAtt:2, seuil:nd => 3600 + 1800 * nd },
      decider(){
        const nd = nidsDetruits(), mn = RTS.t / 60;
        ouverture(2);
        composer([['gunner', 3], ['tank', 1], ['gunner', 4], ['rifle', 2], ['tank', Math.min(24, 2 + Math.floor(mn / 1.5))], ['gunner', Math.min(8, 4 + Math.floor(mn / 4))]], 50);
        tourellesVoulues(4 + nd, 300);
        ameliorer([['tank', 'arm'], ['tank', 'hp'], ['tank', 'reactive'], ['tank', 'coax'], ['tank', 'he'], ['tank', 'rate'], ['gunner', 'arm'], ['gunner', 'hp']], 1900);
        if (S.money > 4000) monterTourelles(3000);
      }
    },
    air: {
      nom:'Air', desc:'2 récupérateurs, une armée au sol de mitrailleurs et de fantassins qui retient les zombies (jusqu’à 22), atelier, héliport et Apaches (un de plus toutes les 2 minutes, 8 au plus), aérodromes (Warthog, AC-130, chasseur à tour de rôle : 2 avions par aérodrome, 3 aérodromes au plus), 5 tourelles plus une par nid ; améliorations de l’Apache et des avions',
      cmd:{ partGarde:.55, garde:{ rifle:1 }, minAtt:3, seuil:nd => 3000 + 1500 * nd },
      decider(){
        const nd = nidsDetruits(), mn = RTS.t / 60, avions = nbU('jet') + nbU('warthog') + nbU('bomber');
        ouverture(2);
        const L = [['gunner', 4], ['rifle', 2], ['heli', 1], ['gunner', 6], ['heli', Math.min(8, 1 + Math.floor(mn / 2))]];
        if (nbU('heli') >= 2 && avions < 6){ const P2 = ['warthog', 'bomber', 'jet']; L.push([P2[avions % 3], nbU(P2[avions % 3]) + 1]); }
        L.push(['gunner', Math.min(14, 6 + Math.floor(mn / 2))], ['rifle', Math.min(8, 2 + Math.floor(mn / 4))]);
        if (avions >= 2 && rtsAirRoom() <= 0 && avions < 6 && nb('airfield') < 3 && S.money >= RTS_BLD.airfield.cost + 600) poser('airfield');
        composer(L, 50);
        tourellesVoulues(5 + nd, 300);
        ameliorer([['heli', 'arm'], ['heli', 'chaingun'], ['heli', 'hellfire'], ['heli', 'hp'], ['warthog', 'arm'], ['bomber', 'arm'], ['bomber', 'cal105'], ['jet', 'arm'], ['gunner', 'arm'], ['gunner', 'hp'], ['gunner', 'rate']], 2200);
        if (S.money > 5000) monterTourelles(3500);
      }
    },
    mixte: {
      nom:'Mixte (bon joueur)', desc:'3 récupérateurs tôt, atelier, armée variée qui grandit avec le temps jusqu’au plafond de 40 (mitrailleurs, fantassins, tireurs d’élite, lance-roquettes, mechs lourds, puis tanks, Apaches et Mechs de combat), 4 tourelles plus une par nid et toutes les 5 minutes, améliorations des 4 types qui pèsent le plus dans l’armée',
      cmd:{ partGarde:.35, garde:{ sniper:1 }, minAtt:6, seuil:nd => 4000 + 1500 * nd },
      decider(){
        const nd = nidsDetruits(), t = RTS.t, mn = t / 60, f = (a, b, k) => Math.max(0, Math.min(b, Math.floor(a + mn / k)));
        ouverture(3);
        const L = [['gunner', 3], ['rifle', 2], ['gunner', 5], ['sniper', 1], ['rocket', 2], ['heavy', 1]];
        L.push(['heavy', f(1, 8, 3)], ['rocket', f(2, 6, 4)], ['tank', f(0, 6, 2.5)], ['gunner', f(3, 8, 2)], ['sniper', f(1, 4, 5)], ['heli', f(-2, 3, 4)], ['mech', f(-2, 3, 5)]);
        composer(L, 50);
        tourellesVoulues(4 + nd + Math.floor(t / 300), 250);
        // Améliorations : les types qui pèsent le plus dans l'armée
        const val = {}; vivants().forEach(u => { val[u.type] = (val[u.type] || 0) + u.U.cost; });
        const top = Object.keys(val).sort((a, b) => val[b] - val[a]).slice(0, 4), L2 = [];
        top.forEach(ty => { ['arm', 'hp', 'rate'].forEach(k => L2.push([ty, k])); if (ty === 'tank') L2.push(['tank', 'reactive']); if (ty === 'heli') L2.push(['heli', 'hellfire']); });
        ameliorer(L2, 1600);
        if (S.money > 4000) monterTourelles(3000);
      }
    }
  };

  /* ---------- Une partie complète ---------- */
  async function rts(opts){
    SIM.preparer(); SIM.hasard(opts.graine || 7);
    const st = STRATS[opts.strategie] || STRATS.tourelles;
    const dt = 1 / 20, maxT = (opts.maxMin || 60) * 60, pas = [], courbe = [];
    rtsStart(); suiviDebut(); achatsDebut(); CMD.att = null; CMD.repos = 0; CMD.nAtt = 0; CMD.journal = [];
    if (st.cmd) rtsRallySet(CMD.ral.x, CMD.ral.z);
    let t = 0, n = 0, dec = 0, mark = 0, markC = 0, qgHaut = 0;
    const pres = () => { let k = 0; for (const z of zombies) if (!z.dead && Math.hypot(z.g.position.x, z.g.position.z) < 45) k++; return k; };
    const photo = () => ({ min:min1(RTS.t), nids:nidsDetruits(), unites:vivants().length, tourelles:tourelles().length, batiments:RTS.blds.filter(o => !o.dead && !o.B.turret).length,
      argent:Math.round(S.money), menace:Math.round(RTS.threat * 10) / 10, qg:RTS.base ? Math.max(0, Math.round(100 * RTS.base.hp / RTS.base.maxHp)) : 0,
      zombies:zAliveCount(), pres:pres(), boss:zombies.filter(z => !z.dead && z.rtsBoss).map(z => z.type).join(' '), tues:RTS.kills, perdues:RTS.lost, bossTues:RTS.bossKills });
    while (t < maxT && state === 'rts'){
      dec -= dt; if (dec <= 0){ dec = 2; try { st.decider(); if (st.cmd) commander(st.cmd); } catch (e) { errNote(e); } }
      visuals(dt); t += dt; SIM.horloge(dt);
      if (RTS.base && RTS.base.hp >= RTS.base.maxHp * .9) qgHaut = RTS.t;
      if (t >= markC){ courbe.push(photo()); markC += 30; }
      if (t >= mark){ pas.push(photo()); mark += 300; }
      if (++n % 400 === 0) await pause();
    }
    const fin = photo(); fin.tombe = state === 'rtsover';
    SUIVI.on = false;
    // L'écroulement : les 2 dernières minutes avant la fin
    const t1 = RTS.t, der = SUIVI.coupsQG.filter(c => c.t > t1 - 120), tot = der.reduce((s, c) => s + c.d, 0) || 1;
    const bossD = der.filter(c => c.c === 'boss').reduce((s, c) => s + c.d, 0);
    const totAll = SUIVI.coupsQG.reduce((s, c) => s + c.d, 0) || 1, bossAll = SUIVI.coupsQG.filter(c => c.c === 'boss').reduce((s, c) => s + c.d, 0);
    const res = {
      strategie:opts.strategie, nom:st.nom, desc:st.desc, graine:opts.graine, pas, courbe, fin,
      cles:{ premUnite:SUIVI.premUnite, premTourelle:SUIVI.premTourelle, premBat:SUIVI.premBat, premQG:SUIVI.premQG, qg90:qgHaut, chute:fin.tombe ? Math.round(t1 - qgHaut) : null },
      chute:{ partBoss2min:Math.round(100 * bossD / tot), partBoss:Math.round(100 * bossAll / totAll), avant:courbe.slice(-5) },
      pertesParType:SUIVI.pertes.reduce((o, p) => { o[p.type] = (o[p.type] || 0) + 1; return o; }, {}), batsPerdus:SUIVI.batsPerdus.length,
      achats:JSON.parse(JSON.stringify(ACH)), attaques:CMD.nAtt || 0, journal:CMD.journal
    };
    try { if (RTS.on) rtsQuit(); } catch (e) { errNote(e); }
    return res;
  }

  /* ---------- Banc des appuis ---------- */
  // Une armée au sol fixe (6 mitrailleurs, 4 fantassins, 2 lance-roquettes devant la base, les 3 tourelles du départ et 2 canons),
  // plus un lot d'appui d'un seul type ; bâtiment requis posé gratuitement (son prix est compté à part dans le rapport).
  // Menace fixe (les tués ne la font pas monter), nids invulnérables qui ne pondent pas : le flot vient du banc lui-même,
  // calqué sur le jeu (6 nids virtuels à 90-140 m au nord, une horde toutes les 45 s, un Titan avec la 2e horde).
  const REF = { gunner:6, rifle:4, rocket:2 };
  const BAT_REQ = { factory:0, heavyfac:1, vehdepot:1, heliport:1, airfield:1 };
  function bancLot(L){
    // L : { unites:{ type:n }, amel:{ type:{ k:niveau } } } ; rend les bâtiments requis et le prix
    let prixU = 0, prixA = 0; const req = {};
    Object.keys(L.unites || {}).forEach(t => { const U = RTS_UNITS[t], n = L.unites[t]; prixU += U.cost * n; if (U.fac !== 'factory') req[U.fac] = Math.max(req[U.fac] || 0, U.kind === 'air' ? Math.ceil(n / RTS_AIR_CAP) : 1); });
    Object.keys(L.amel || {}).forEach(t => Object.keys(L.amel[t]).forEach(k => { for (let l = 0; l < L.amel[t][k]; l++){ RTS.upg[t] = RTS.upg[t] || {}; const c = rtsUpgCost(t, k); prixA += c; RTS.upg[t][k] = l + 1; } RTS.upg[t][k] = 0; }));
    const prixB = Object.keys(req).reduce((s, f) => s + RTS_BLD[f].cost * req[f], 0);
    return { req, prixU, prixA, prixB };
  }
  async function rtsBanc(o){
    SIM.preparer(); SIM.hasard(o.graine || 1);
    const dt = 1 / 20, duree = o.duree || 150, menace = o.menace || 5;
    rtsStart(); clearZombies();
    RTS.nests.forEach(n => { n.spawnT = 1e12; n.hp = n.maxHp = 1e12; });
    RTS.hordeT = 1e12; RTS.baseR = 60; rtsBaseSize();
    rtsPlaceBld('t_cannon', -16, -18, true); rtsPlaceBld('t_cannon', 18, -16, true);
    const info = bancLot(o.lot);
    // Bâtiments requis, posés derrière (gratuits : leur prix est dit à part)
    const PL = { heavyfac:[[22, 10]], vehdepot:[[-24, 12]], heliport:[[24, 14]], airfield:[[-20, 34], [20, 36], [0, 46]] };
    if (REF.rocket) rtsPlaceBld('heavyfac', 22, 10, true);
    Object.keys(info.req).forEach(f => { for (let i = (f === 'heavyfac' && REF.rocket ? 1 : 0); i < info.req[f]; i++){ const p = (PL[f] || [[0, 30]])[i]; rtsPlaceBld(f, p[0], p[1], true); } });
    // Armée au sol de référence : une ligne à 20 m devant le QG
    RTS.units.slice().forEach(u => { u.dead = true; rtsRoot.remove(u.g); }); RTS.units.length = 0;
    const ligne = []; Object.keys(REF).forEach(t => { for (let i = 0; i < REF[t]; i++) ligne.push(t); });
    const poste = (u, x, z) => { u.tx = u.hx = x; u.tz = u.hz = z; u.cmd = 'idle'; u.simRole = 'ref'; };
    ligne.forEach((t, i) => { const x = -22 + 44 * i / (ligne.length - 1), z = -20 - (t === 'rocket' ? -4 : 0); poste(rtsSpawnUnit(t, x, z), x, z); });
    // Appui
    Object.keys(o.lot.unites || {}).forEach(t => {
      const U = RTS_UNITS[t], n = o.lot.unites[t];
      for (let i = 0; i < n; i++){
        const x = n > 1 ? -18 + 36 * i / (n - 1) : 0, z = U.kind === 'ground' ? -26 : -14;
        const u = rtsSpawnUnit(t, x, z); poste(u, x, z); u.simRole = 'appui'; if (U.kind === 'air') u.head = Math.PI;
      }
    });
    Object.keys(o.lot.amel || {}).forEach(t => Object.keys(o.lot.amel[t]).forEach(k => {
      RTS.upg[t] = RTS.upg[t] || {}; RTS.upg[t][k] = o.lot.amel[t][k];
      if (k === 'hp') RTS.units.forEach(u => { if (u.type === t){ u.maxHp = u.hp = rtsStat(u, 'hp'); } });
    }));
    // Menace fixe
    const tFix = (menace - 1) * RTS_THREAT.t;
    const fixer = () => { RTS.t = tFix - RTS.kills * RTS_THREAT.t / RTS_THREAT.tues; rtsThreat(); };
    fixer(); suiviDebut();
    const nids = [-90, -100, -110, -120, -130, -140].map((z, i) => ({ x:-50 + 20 * i + rand(-6, 6), z, idx:3, pow:1.36, t:rand(1, 5) }));
    const k0 = RTS.kills, val0 = RTS.units.reduce((s, u) => s + u.U.cost, 0);
    let t = 0, n = 0, horde = 45, hN = 0, tombe = null; SUIVI.now = () => t;
    while (t < duree){
      if (state !== 'rts'){ tombe = t; break; }
      fixer();
      for (const N of nids){ N.t -= dt; if (N.t <= 0){ N.t = Math.max(1.6, rand(6, 9) / Math.sqrt(RTS.threat) / N.pow); rtsSpawnAt(N.x, N.z + 6, 1 + Math.floor(RTS.threat * .8 + N.idx / 3)); } }
      horde -= dt;
      if (horde <= 0){
        horde = 45; hN++;
        const R0 = 130, tot = 10 + Math.round(RTS.threat * 5), ng = 3 + Math.floor(Math.random() * 3); let E = null;
        for (let gi = 0; gi < ng; gi++){ const a = (-1 + 2 * (gi + rand(.15, .85)) / ng) * Math.PI / 4, zz = -R0 * Math.cos(a), m = rtsValleyX(zz) - 6, xx = clamp(R0 * Math.sin(a), -m, m); rtsSpawnAt(xx, zz, Math.ceil(tot / ng), 7); if (!E || Math.random() < .4) E = [xx, zz]; }
        if (hN === 2 && o.boss !== false) rtsSpawnAt(E[0], E[1] + 6, 1, 2, 'titan');
      }
      visuals(dt); t += dt; SIM.horloge(dt);
      if (++n % 400 === 0) await pause();
    }
    SUIVI.on = false;
    const perte = r => SUIVI.pertes.filter(p => p.role === r);
    const res = {
      lot:o.lot.nom, menace, graine:o.graine, duree, tombe,
      tues:RTS.kills - k0, degatsBase:Math.round(SUIVI.degatsBat), qg:RTS.base ? Math.max(0, Math.round(100 * RTS.base.hp / RTS.base.maxHp)) : 0,
      pertesRef:perte('ref').length, pertesAppui:perte('appui').length, nAppui:Object.keys(o.lot.unites || {}).reduce((s, k) => s + o.lot.unites[k], 0),
      dollarsPerdus:SUIVI.pertes.reduce((s, p) => s + p.cout, 0), tourellesPerdues:SUIVI.batsPerdus.filter(b => RTS_BLD[b.type].turret).length,
      qgBoss:Math.round(100 * SUIVI.coupsQG.filter(c => c.c === 'boss').reduce((a, c) => a + c.d, 0) / (SUIVI.coupsQG.reduce((a, c) => a + c.d, 0) || 1)), premQG:SUIVI.premQG == null ? null : Math.round(SUIVI.premQG),
      prixUnites:info.prixU, prixAmel:info.prixA, prixBat:info.prixB, batiments:info.req, valeurDepart:val0
    };
    try { if (RTS.on) rtsQuit(); } catch (e) { errNote(e); }
    return res;
  }

  // Une décision du robot-joueur (pour les tests : sans faire avancer le temps)
  function rtsTour(strategie){ const st = STRATS[strategie] || STRATS.tourelles; st.decider(); if (st.cmd) commander(st.cmd); return JSON.parse(JSON.stringify(ACH)); }
  Object.assign(SIM, { rts, rtsBanc, rtsTour, STRATS_RTS:STRATS, RTS_REF:REF, SUIVI_RTS:SUIVI });
})();
