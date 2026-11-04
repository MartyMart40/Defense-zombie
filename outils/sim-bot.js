'use strict';
/* ================= Robot-joueur du simulateur d'équilibrage ================= */
// Injecté dans la vraie page du jeu par outils/simulateur.js (jamais chargé par index.html).
// Il joue avec les vraies règles du jeu, en accéléré (pas de rendu) :
//   - toit : vise le zombie le plus proche de la barricade avec une erreur de visée réglable, tire, recharge ;
//            entre les vagues : répare, achète des armes et des améliorations, place ses talents, achète des défenses ;
//   - RTS : bâtit (usine lourde, tourelles), achète des unités, des améliorations, attaque le nid le plus proche.
// Il lance ses pouvoirs (grenade, Molotov, frappe aérienne) dans les groupes serrés, comme un joueur.
// Il ne se sert pas des accessoires, des compagnons ni du contrôle des tourelles : un vrai joueur fait donc un peu mieux que lui.

(function(){
  // Hasard fixé (même partie à chaque lancement avec la même graine)
  let graine = 1;
  const R0 = Math.random;
  function hasard(n){ graine = (n || 1) % 2147483647; if (graine <= 0) graine += 2147483646; Math.random = function(){ graine = graine * 16807 % 2147483647; return (graine - 1) / 2147483646; }; }
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const pause = () => new Promise(r => setTimeout(r, 0));

  // Joueurs : erreur de visée (radians, écart type), part des tirs visés à la tête, temps pour changer de cible
  const JOUEURS = {
    parfait:  { nom:'Parfait',  err:0,    tete:0,  reflexe:.2 }, // pour vérifier le robot-joueur lui-même
    debutant: { nom:'Débutant', err:.010, tete:.1, reflexe:.6 },
    moyen:    { nom:'Moyen',    err:.006, tete:.3, reflexe:.4 },
    bon:      { nom:'Bon',      err:.003, tete:.6, reflexe:.25 }
  };

  // Le jeu ne tourne plus tout seul : c'est le simulateur qui fait avancer le temps
  function preparer(){
    window.requestAnimationFrame = () => 0;
    try { canvas.requestPointerLock = function(){}; } catch (e) {}
    try { Snd.on = false; if (Snd.master) Snd.master.gain.value = 0; } catch (e) {}
    try { window.toast = function(){}; } catch (e) {}
  }
  // Profil de départ : copie du profil au moment où le robot-joueur est installé (une page neuve = le profil par défaut,
  // avec les champs ajoutés par chaque système, ex. P.mech, P.comp), remis à zéro pour la progression
  const P0 = JSON.parse(JSON.stringify(P));
  function profilNeuf(){
    Object.keys(P).forEach(k => delete P[k]);
    Object.assign(P, JSON.parse(JSON.stringify(P0)), { xp:0, level:1, pts:0, talents:{}, unlocked:1, best:{}, wins:{}, last:0, intensity:1, scrap:0 });
    P.slots = DEF_SLOTS.map(() => null);
    // Seulement les clés du jeu (dt_) : la page de tests garde sa copie de secours sous un autre nom
    try { const ks = []; for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (k && k.indexOf('dt_') === 0) ks.push(k); } ks.forEach(k => localStorage.removeItem(k)); } catch (e) {}
    saveP();
  }

  /* ---------- Toit ---------- */
  const v3 = new THREE.Vector3();
  const vise = { z:null, t:0, ex:0, ey:0, tete:false };
  function cible(){
    let best = null, bz = -1e9;
    for (const z of zombies){
      if (z.dead || !z.g) continue;
      const p = z.g.position; if (p.z > BAR_Z + 2 || p.z < -140) continue;
      const k = p.z + (z.type === 'boss' ? 6 : 0); // le boss d'abord quand il approche
      if (k > bz){ bz = k; best = z; }
    }
    return best;
  }
  // Pouvoirs : au plus un lancer toutes les 0,7 s, dans le groupe le plus serré (grenade ≥ 5 zombies, Molotov ≥ 6 près de la barricade, frappe ≥ 12)
  const POUV = { t:0, n:0 };
  const SEUIL = { grenade:{ n:5, r:4.5, zMin:-70 }, molotov:{ n:6, r:3.6, zMin:-35 }, strike:{ n:12, r:9, zMin:-90 } };
  function pouvoirs(dt){
    if (typeof powUse !== 'function') return;
    POUV.t -= dt; if (POUV.t > 0) return; POUV.t = .7;
    const vivants = zombies.filter(z => !z.dead && z.g && z.g.position.z < BAR_Z + 1);
    for (const id of ['strike', 'grenade', 'molotov']){
      if (!pwUnlocked(id) || !pwS[id] || pwS[id].ch < 1) continue;
      const S2 = SEUIL[id]; let best = null, bn = 0;
      for (const a of vivants){
        const pa = a.g.position; if (pa.z < S2.zMin) continue;
        let n = 0; for (const b of vivants){ const pb = b.g.position; if (Math.abs(pb.x - pa.x) < S2.r && Math.abs(pb.z - pa.z) < S2.r) n++; }
        if (n > bn){ bn = n; best = pa; }
      }
      if (best && bn >= S2.n && powUse(id, { x:best.x, y:0, z:best.z })){ POUV.n++; return; }
    }
  }
  function viser(J, dt){
    vise.t -= dt;
    if (!vise.z || vise.z.dead || vise.t <= 0){
      vise.z = cible(); vise.t = J.reflexe; vise.tete = Math.random() < J.tete || (!!vise.z && vise.z.type === 'boss'); // la tête du boss, comme le dit le jeu
    }
    // Erreur tirée à chaque image : le joueur tremble et corrige, il ne rate pas toujours du même côté
    vise.ex = gauss() * J.err; vise.ey = gauss() * J.err;
    const z = vise.z; if (!z){ firing = false; return; }
    z.g.updateMatrixWorld(true);
    ((vise.tete && z.head) ? z.head : (z.meshes && z.meshes[0]) || z.g).getWorldPosition(v3);
    const dx = v3.x - EYE.x, dy = v3.y - EYE.y, dz = v3.z - EYE.z;
    __game.setAim(Math.atan2(-dx, -dz) + vise.ex, Math.atan2(dy, Math.hypot(dx, dz)) + vise.ey);
    firing = true;
  }
  const PRIO_TALENTS = ['marksman', 'carpenter', 'headhunter', 'hands', 'trigger', 'scavenger', 'student', 'savings'];
  function talents(){
    let n = 0;
    while (P.pts > 0 && n++ < 100){
      const k = PRIO_TALENTS.find(t => T(t) < TALENTS[t].max); if (!k) break;
      P.talents[k] = T(k) + 1; P.pts--;
    }
    saveP();
  }
  // Ferraille : moitié pour les défenses, moitié pour les pouvoirs (charges et dégâts de la grenade et du Molotov d'abord)
  function pouvoirsAtelier(){
    if (typeof pwUpgrade !== 'function') return;
    for (let n = 0; n < 30; n++){
      let best = null, bc = 1e18;
      ['grenade', 'molotov', 'strike'].forEach(id => { if (!pwUnlocked(id)) return; ['ch', 'dmg', 'cd'].forEach(k => { const l = pwLv(id)[k]; if (l >= PW_MAX[k]) return; const c = pwUpgCost(id, k, l); if (c < bc){ bc = c; best = [id, k]; } }); });
      if (!best || P.scrap < bc * 2 || !pwUpgrade(best[0], best[1])) break;
    }
  }
  function defenses(){
    pouvoirsAtelier();
    if (typeof defBuy !== 'function') return;
    for (let i = 0; i < DEF_SLOTS.length; i++) if (!P.slots[i]){ const t = DEF_ORDER.slice().reverse().find(t => P.scrap >= DEF_TYPES[t].price && t !== 'nuke'); if (t) defBuy(i, t); }
    for (let n = 0; n < 50; n++){
      let bi = -1, bl = null, bc = 1e18;
      P.slots.forEach((s, i) => { if (!s) return; ['dmg', 'rate'].forEach(l => { const c = defUpgCost(s.type, s.lv[l]); if (c < bc){ bc = c; bi = i; bl = l; } }); });
      if (bi < 0 || P.scrap < bc || !defUpgrade(bi, bl)) break;
    }
  }
  const prixArme = id => WEAPONS[id].price || 0;
  // Stratégies d'achat des armes (SIM.BOT.strategie) :
  //   boutique : l'arme suivante de la boutique dès qu'on peut la payer
  //   patient  : améliore l'arme en main ; l'arme suivante seulement avec deux fois son prix en poche,
  //              en sautant les armes de près (fusil à pompe, lance-flammes), faibles au bout de la rue
  //   pistolet : garde le pistolet et n'achète que des améliorations
  //   pompe    : achète le fusil à pompe dès qu'on peut, puis seulement des améliorations
  const BOT = { armes:null, strategie:'patient' };
  const PRES = ['shotgun', 'flamer'];
  const STRAT = { boutique:{ k:1 }, patient:{ k:2, sauf:PRES }, pistolet:{ k:1, armes:[] }, pompe:{ k:1, armes:['shotgun'] } };
  function boutique(){
    talents(); defenses();
    if (S.bar < S.barMax * .8 && S.money >= repairCost()){ S.money -= repairCost(); S.bar = S.barMax; }
    // Arme suivante (dans l'ordre choisi, sinon celui de la boutique) dès qu'on peut, en gardant de quoi réparer
    const st = STRAT[BOT.strategie] || STRAT.patient;
    for (const id of (BOT.armes || st.armes || WORDER).filter(id => !(st.sauf && st.sauf.indexOf(id) >= 0))){
      if (S.owned[id]) continue;
      if (S.money >= prixArme(id) * st.k + 150){ S.money -= prixArme(id); S.owned[id] = true; S.ammo[id] = magSize(id); }
      break;
    }
    const best = WORDER.filter(id => S.owned[id] && !(st.sauf && st.sauf.indexOf(id) >= 0)).sort((a, b) => prixArme(b) - prixArme(a))[0]; if (best && best !== S.cur) equip(best);
    // Améliorations : toujours la moins chère, tant qu'il reste une réserve pour réparer
    for (let n = 0; n < 200; n++){
      const opts = [];
      ['dmg', 'reload', 'mag', 'wall'].forEach(k => { const U = UPG[k]; if (S.upg[k] < U.max) opts.push({ c:U.cost(S.upg[k]), f(){ S.money -= this.c; S.upg[k]++; if (k === 'wall'){ S.barMax = barMaxCalc(); S.bar = S.barMax; } if (k === 'mag') refillAll(); } }); });
      const W = WEAPONS[S.cur]; (W.upg || []).forEach(k => { const U = WUPG[k], l = wl(S.cur, k); if (l < U.max) opts.push({ c:wupgCost(S.cur, k, l), f(){ wupgBuy(S.cur, k); } }); });
      opts.sort((a, b) => a.c - b.c);
      const o = opts[0]; if (!o || S.money - o.c < 120) break;
      o.f();
    }
    if (S.bar < S.barMax && S.money >= repairCost()){ S.money -= repairCost(); S.bar = S.barMax; }
  }
  // Une partie sur le toit (campagne ou mode infini). Rend le résultat.
  async function partieToit(idx, J, inf, maxMin){
    const dt = 1 / 30, maxT = (maxMin || 40) * 60;
    const wins0 = P.wins[LOCS[idx].id] || 0;
    if (inf) infStart(idx, true); else startLocation(idx);
    let t = 0, n = 0, barMin = 1, vagues = [];
    vise.z = null; POUV.n = 0; POUV.t = 0;
    while (t < maxT){
      if (state === 'shop'){ boutique(); startWave(); continue; }
      if (state !== 'playing') break;
      viser(J, dt); if (BOT.pouvoirs !== false) pouvoirs(dt); visuals(dt); update(dt); t += dt;
      if (S.barMax > 0) barMin = Math.min(barMin, S.bar / S.barMax);
      if (endT > 0 && endT < dt * 1.5) vagues.push({ v:S.wave, bar:Math.round(100 * S.bar / S.barMax), argent:Math.round(S.money) });
      if (++n % 1500 === 0) await pause();
    }
    firing = false;
    const gagne = !inf && (P.wins[LOCS[idx].id] || 0) > wins0;
    return { ville:LOCS[idx].name, inf:!!inf, gagne, vague:S.wave, tenues:gagne ? curLoc.waves : Math.max(0, S.wave - 1), sur:curLoc.waves,
      bar:Math.round(100 * Math.max(0, S.bar) / S.barMax), barMin:Math.round(100 * barMin), argent:Math.round(S.money), abattus:S.kills,
      minutes:Math.round(t / 6) / 10, pouvoirs:POUV.n, niveau:P.level, ferraille:Math.round(P.scrap), arme:WEAPONS[S.cur].name, finTemps:t >= maxT, vagues };
  }
  // Campagne complète : chaque ville jusqu'à la victoire (essais au plus), en gardant le profil comme un vrai joueur
  async function campagne(opts){
    preparer(); hasard(opts.graine || 1); profilNeuf(); if (opts.strategie) BOT.strategie = opts.strategie;
    const J = JOUEURS[opts.joueur] || JOUEURS.moyen, res = [];
    for (let i = 0; i < LOCS.length; i++){
      let essai = 0, r;
      do { essai++; r = await partieToit(i, J, false, opts.maxMin); r.essai = essai; res.push(r); } while (!r.gagne && essai < (opts.essais || 3));
      if (!r.gagne) break;
    }
    return { joueur:J.nom, strategie:BOT.strategie, parties:res, niveau:P.level, ferraille:Math.round(P.scrap) };
  }
  // Mode infini dans chaque ville, avec le profil de fin de campagne
  async function infini(opts){
    const J = JOUEURS[opts.joueur] || JOUEURS.moyen, res = [];
    for (const i of (opts.villes || [0])){ hasard((opts.graine || 1) + 100 + i); res.push(await partieToit(i, J, true, opts.maxMin || 60)); }
    return { joueur:J.nom, parties:res };
  }

  /* ---------- RTS ---------- */
  function rtsPlace(type){
    const B = RTS_BLD[type], R = RTS.baseR;
    for (let k = 0; k < 120; k++){
      // Tourelles devant (au nord), le reste derrière
      const a = (type.indexOf('t_') === 0 ? -Math.PI / 2 : Math.PI / 2) + (Math.random() - .5) * (type.indexOf('t_') === 0 ? 2.2 : 3.4);
      const d = (type.indexOf('t_') === 0 ? .55 + Math.random() * .4 : .25 + Math.random() * .6) * (R - B.size - 1);
      const x = Math.round(Math.cos(a) * d / 2) * 2, z = Math.round(Math.sin(a) * d / 2) * 2;
      if (!rtsBldOk(type, x, z)) return rtsBuild(type, x, z, 0);
    }
    return null;
  }
  const nb = t => RTS.blds.filter(o => !o.dead && o.type === t).length;
  const armee = () => RTS.units.filter(u => !u.dead);
  function rtsDecide(){
    const m = () => S.money, nd = RTS.nests.filter(n => n.dead).length;
    if (!nb('heavyfac') && m() >= RTS_BLD.heavyfac.cost + 200) rtsPlace('heavyfac');
    if (nb('heavyfac') && !nb('repair') && m() >= RTS_BLD.repair.cost + 600) rtsPlace('repair');
    if (!nb('scrap') && m() >= RTS_BLD.scrap.cost + 400) rtsPlace('scrap');
    const tour = RTS.blds.filter(o => !o.dead && o.B.turret).length;
    if (tour < 5 + 2 * nd + Math.floor(RTS.t / 180) && m() >= 600) rtsPlace(RTS.t > 240 && Math.random() < .5 ? 't_cannon' : 't_mg');
    // Unités : du plus fort qu'on peut se payer
    const voulu = Math.min(RTS_CFG.maxUnits, 10 + nd * 3 + Math.floor(RTS.t / 90));
    if (armee().length < voulu){
      const t = ['heavy', 'rocket', 'gunner', 'rifle'].find(t => rtsFactoryFor(t) && m() >= RTS_UNITS[t].cost + 150);
      if (t) rtsBuy(t);
      if (t && m() > 3000){ const t2 = ['heavy', 'rocket', 'gunner'].find(x => rtsFactoryFor(x) && m() >= RTS_UNITS[x].cost + 150); if (t2) rtsBuy(t2); }
    }
    // Améliorations quand l'armée est là
    if (armee().length >= 8 && m() > 1800){
      const types = [...new Set(armee().map(u => u.type))];
      for (const t of types) for (const k of ['arm', 'hp', 'rate']){ if (rtsUpgCost(t, k) < m() - 800) rtsUpgBuy(t, k); }
    }
    // Tourelles plus fortes
    RTS.blds.filter(o => !o.dead && o.B.turret).forEach(o => { if (m() > 1000) rtsTurretUp(o); });
    // Attaque : le nid vivant le plus proche, quand l'armée au sol est assez grosse
    const sol = armee().filter(u => u.U.kind === 'ground');
    if (BOT.rtsAttaque !== false && sol.length >= 8){
      let best = null, bd = 1e9; RTS.nests.forEach(n => { if (!n.dead){ const d = Math.hypot(n.x, n.z); if (d < bd){ bd = d; best = n; } } });
      if (best) sol.forEach(u => { if (u.cmd !== 'attack' && !u.retreat){ u.nest = best; u.cmd = 'attack'; } });
    }
  }
  async function rts(opts){
    preparer(); hasard(opts.graine || 7); BOT.rtsAttaque = opts.attaque !== false;
    const dt = 1 / 20, maxT = (opts.maxMin || 30) * 60, pas = [];
    rtsStart(); let t = 0, n = 0, dec = 0, mark = 0;
    const photo = () => ({ min:Math.round(RTS.t / 6) / 10, nids:RTS.nests.filter(n => n.dead).length, unites:armee().length, tourelles:RTS.blds.filter(o => !o.dead && o.B.turret).length,
      argent:Math.round(S.money), menace:Math.round(RTS.threat * 10) / 10, qg:RTS.base ? Math.max(0, Math.round(100 * RTS.base.hp / RTS.base.maxHp)) : 0, zombies:zAliveCount(), tues:RTS.kills, perdues:RTS.lost, boss:RTS.bossKills });
    while (t < maxT && state === 'rts'){
      dec -= dt; if (dec <= 0){ dec = 2; rtsDecide(); }
      visuals(dt); t += dt;
      if (t >= mark){ pas.push(photo()); mark += 300; }
      if (++n % 400 === 0) await pause();
    }
    const fin = photo(); fin.tombe = state === 'rtsover';
    try { if (RTS.on) rtsQuit(); } catch (e) {}
    return { pas, fin };
  }

  // Comparaison rapide : chaque stratégie d'achat, une partie dans une ville
  async function comparer(opts){
    const J = JOUEURS[opts.joueur] || JOUEURS.moyen, res = [];
    for (const st of Object.keys(STRAT)){
      hasard(opts.graine || 1); profilNeuf(); BOT.strategie = st;
      const r = await partieToit(opts.ville || 0, J, false, 30); r.strategie = st; res.push(r);
    }
    BOT.strategie = 'patient';
    return { joueur:J.nom, parties:res };
  }
  window.SIM = { BOT, STRAT, comparer, JOUEURS, partieToit, boutique, campagne, infini, rts, preparer, profilNeuf, hasard, remettre(){ Math.random = R0; } };
})();
