'use strict';
/* Mode RTS, suite de js/42-rts-unites.js : zombies (route, cibles, boss), combat et IA des unités, boucle rtsStep */
/* ---------- Zombies : la route, les cibles, les boss ---------- */
const RTS_SPAWN = [['walker', 0], ['runner', 1.2], ['crawler', 1.4], ['spider', 2], ['bloater', 2.2], ['brute', 2.6], ['stalker', 3], ['shield', 3.4], ['spitter', 1.8], ['flyer', 2.4], ['abomination', 4.2]];
function rtsPickType(){
  const ok = RTS_SPAWN.filter(e => RTS.threat >= e[1] && ZTYPES[e[0]]);
  return Math.random() < .45 ? 'walker' : ok[Math.floor(Math.random() * ok.length)][0];
}
function rtsSpawnAt(x, z, n, spread, type){
  let alive = zAliveCount(), k = 0; spread = spread || 3;
  for (let i = 0; i < n && (alive < plan.maxAlive || type); i++){
    const t = type || rtsPickType(), zz = spawnZombie(t); if (!zz) continue;
    zz.g.position.set(x + rand(-spread, spread), zz.g.position.y, z + rand(-spread, spread)); zz.rtsT = 0; zz.wp = null; zz.useRoad = Math.random() < .3; alive++; k++; // 3 sur 10 suivent la vieille route, les autres coupent tout droit
    if (RTS_BOSS.indexOf(t) >= 0){ zz.maxHp = zz.hp = zz.maxHp * RTS_CFG.bossHp; zz.rtsBoss = true; zz.abT = 3; }
  }
  return k;
}
const RTS_THREAT = { t:240, nid:.5, tues:600 }; // menace : +1 toutes les 4 minutes, +0,5 par nid détruit, +1 tous les 600 tués
function rtsThreat(){
  const killed = RTS.nests.filter(n => n.dead).length;
  // Surtout le temps et les nids détruits ; un peu les tués (avant : tués / 160, ce qui emballait tout :
  // mieux on se défendait, plus il en venait). Voir docs/equilibrage.md.
  RTS.threat = 1 + RTS.t / RTS_THREAT.t + killed * RTS_THREAT.nid + RTS.kills / RTS_THREAT.tues;
  plan.hpMult = 1 + .55 * (RTS.threat - 1); plan.dmgMult = 1 + .4 * (RTS.threat - 1); plan.spdMult = Math.min(1.5, 1 + .05 * (RTS.threat - 1));
}
const RTS_FLY = { flyer:1, gargoyle:1, crow:1, behemoth:1 };
// Cible d'un zombie : unité ou bâtiment le plus proche (à 16 m) ; seuls les volants s'en prennent aux hélicoptères et aux avions
function rtsTargetOfZombie(z){
  const gp = z.g.position, fly = RTS_FLY[z.type]; let best = null, bd = 16 * 16;
  for (const u of RTS.units){ if (u.dead || (rtsIsAir(u) && !fly)) continue; const dx = u.g.position.x - gp.x, dz = u.g.position.z - gp.z, d = dx * dx + dz * dz; if (d < bd){ bd = d; best = u; } }
  for (const o of RTS.blds){ if (o.dead) continue; const dx = o.x - gp.x, dz = o.z - gp.z, d = Math.max(0, Math.hypot(dx, dz) - o.r); if (d * d < bd){ bd = d * d; best = o; } }
  return best;
}
const rtsPos = T => (T.B ? rtsV2.set(T.x, 0, T.z) : T.g.position);
// Prochain point de la route vers la base (la route va du nord, index élevé, vers la base, index 0)
function rtsRoadNext(z){
  const gp = z.g.position;
  if (z.wp == null){
    let bi = 0, bd = 1e9; RTS_ROAD.forEach((p, i) => { const d = Math.hypot(p[0] - gp.x, p[1] - gp.z); if (d < bd){ bd = d; bi = i; } });
    if (bi > 0 && RTS_ROAD[bi][1] < gp.z - 2) bi--;                  // ce point est derrière lui (plus au nord) : on prend le suivant
    z.wp = bi;
  }
  const P2 = RTS_ROAD[z.wp];
  if (P2 && Math.hypot(P2[0] - gp.x, P2[1] - gp.z) < 4) z.wp--;
  return z.wp >= 0 ? RTS_ROAD[z.wp] : null;
}
function rtsDmgTarget(T, dmg){
  if (T.type && T.U) dmg *= Math.max(.4, 1 - .15 * rtsLv(T.type, 'reactive'));
  T.hp -= dmg; if (T.hpb) rtsHpSet(T.hpb, T.hp / T.maxHp);
  if (T.hp <= 0){ if (T.B) rtsBldDie(T); else rtsUnitDie(T); }
}
function rtsBossAbility(z, dt){
  z.abT -= dt; if (z.abT > 0) return;
  const gp = z.g.position;
  if (z.type === 'titan'){                        // piétinement : tout ce qui est au sol autour
    z.abT = rand(4.5, 6);
    shake = Math.max(shake, .5); rtsV.set(gp.x, .3, gp.z); burst(rtsV, 'dust', 26, 8); if (typeof Snd === 'object' && Snd.boom) Snd.boom(1.2);
    RTS.units.slice().forEach(u => { if (!u.dead && !rtsIsAir(u) && Math.hypot(u.g.position.x - gp.x, u.g.position.z - gp.z) < 12) rtsDmgTarget(u, z.dmg * .5); });
    RTS.blds.slice().forEach(o => { if (!o.dead && Math.hypot(o.x - gp.x, o.z - gp.z) < 12 + o.r) rtsDmgTarget(o, z.dmg * .5); });
  } else if (z.type === 'broodmother'){           // elle pond des araignées ou des rampants
    z.abT = rand(5, 7); rtsSpawnAt(gp.x, gp.z, 3, 3, Math.random() < .5 && ZTYPES.spider ? 'spider' : 'crawler');
  } else if (z.type === 'behemoth'){              // crachat d'acide sur la cible la plus proche (avions compris)
    z.abT = rand(2.5, 3.5);
    let best = null, bd = 34 * 34;
    RTS.units.forEach(u => { if (u.dead) return; const d = (u.g.position.x - gp.x) ** 2 + (u.g.position.z - gp.z) ** 2; if (d < bd){ bd = d; best = u; } });
    RTS.blds.forEach(o => { if (o.dead) return; const d = (o.x - gp.x) ** 2 + (o.z - gp.z) ** 2; if (d < bd){ bd = d; best = o; } });
    if (best){
      const tp = rtsPos(best), to = new THREE.Vector3(tp.x, best.B ? 2 : best.g.position.y + 1, tp.z);
      if (typeof arsBeam === 'function') arsBeam(rtsV.set(gp.x, gp.y + 2, gp.z), to, 0x8aff40, .35, .25);
      burst(to, PMATS.acid ? 'acid' : 'dust', 9, 2.4);
      rtsDmgTarget(best, z.dmg * .6);
    }
  }
}
function rtsZombies(dt){
  for (let i = zombies.length - 1; i >= 0; i--){
    const z = zombies[i];
    if (z.flashT > 0) z.flashT -= dt;
    if (z.dead){
      z.deadT += dt; z.body.rotation.x = -Math.min(1, z.deadT / .45) * Math.PI / 2;
      if (z.deadT <= 1.6 && z.g.position.y > 0){ z.fallV = (z.fallV || 0) + 22 * dt; z.g.position.y = Math.max(0, z.g.position.y - z.fallV * dt); }
      if (z.deadT > 1.6) z.g.position.y -= dt * 1.2;
      if (z.deadT > (z.rtsBoss ? 5 : 2.8)){ disposeZombie(z); zombies.splice(i, 1); }
      continue;
    }
    if (z.burnT > 0){ z.burnT -= dt; z.burnTick = (z.burnTick || .25) - dt; if (z.burnTick <= 0){ z.burnTick = .25; damage(z, (z.burnDps || 20) * .25, false, z.g.position); if (z.dead) continue; } }
    if (z.rtsBoss){ rtsBossAbility(z, dt); if (state !== 'rts') return; }
    z.rtsT = (z.rtsT || 0) - dt;
    if (z.rtsT <= 0 || (z.rtsTgt && z.rtsTgt.dead)){ z.rtsT = rand(.3, .6); z.rtsTgt = rtsTargetOfZombie(z); }
    const gp = z.g.position, fly = !!RTS_FLY[z.type];
    // Sans cible proche, il suit la vieille route jusqu'à la base, puis va vers le QG
    let T = z.rtsTgt, tp;
    if (T) tp = rtsPos(T);
    else { const P2 = fly || !z.useRoad ? null : rtsRoadNext(z); if (P2) tp = rtsV3.set(P2[0], 0, P2[1]); else { T = RTS.base; if (!T) continue; tp = rtsPos(T); } }
    const dx = tp.x - gp.x, dz = tp.z - gp.z, d = Math.hypot(dx, dz);
    const reach = T ? (T.r || 1) + .9 * ((ZTYPES[z.type] || {}).scale || 1) : 0;
    z.g.rotation.y = Math.atan2(dx, dz);
    z.phase += dt * Math.max(2, z.speed * 3);
    const s = Math.sin(z.phase);
    if (z.legL){ z.legL.rotation.x = s * .6; z.legR.rotation.x = -s * .6; }
    if (z.armL){ z.armL.rotation.x = -1.35 + s * .2; z.armR.rotation.x = -1.35 - s * .2; }
    const R = z.rig;
    if (R && R.legs) R.legs.forEach((l, k) => { l.rotation.x = Math.sin(z.phase + k * 1.3) * .5; });
    if (R && R.wing){ const a = Math.sin(z.phase * 2.5); R.wing[0].rotation.z = -a * .7; R.wing[1].rotation.z = a * .7; }
    if (fly){ const want = T && !T.B && rtsIsAir(T) ? T.g.position.y : (z.alt || 5) * .6; gp.y += (want - gp.y) * Math.min(1, dt * 2); }
    if (!T || d > reach){ const v = z.speed * dt / Math.max(d, .01); gp.x += dx * v; gp.z += dz * v; }
    else {
      z.atkT -= dt;
      if (z.atkT <= 0){
        z.atkT = rand(.9, 1.3);
        rtsV.set(tp.x, 1.2, tp.z); burst(rtsV, 'wood', 2, 1.5);
        rtsDmgTarget(T, z.dmg);
        if (state !== 'rts') return;
      }
    }
    if (!fly) rtsClampValley(gp, false);
  }
  zFrame++;
}
function rtsUnitDie(u){
  if (u.dead) return; u.dead = true; RTS.lost++;
  rtsV.copy(u.g.position); rtsV.y = Math.max(1.5, rtsV.y);
  if (typeof rueBoom === 'function') rueBoom(rtsV.x, rtsV.y, rtsV.z, rtsIsAir(u) ? 12 : 7);
  burst(rtsV, 'dust', 12, 4); if (typeof Snd === 'object' && Snd.boom) Snd.boom(rtsIsAir(u) ? 1 : .6);
  rtsRoot.remove(u.g); const i = RTS.sel.indexOf(u); if (i >= 0) RTS.sel.splice(i, 1);
  if (RTS.pilot === u){ rtsUnpilot(); if (typeof toast === 'function') toast('Ton unité est détruite : retour à la carte'); }
}
function rtsBldDie(o, sold){
  if (o.dead) return; o.dead = true;
  rtsV.set(o.x, 2, o.z);
  if (!sold){ if (typeof rueBoom === 'function') rueBoom(o.x, 2.5, o.z, o.r * 4); if (typeof Snd === 'object' && Snd.boom) Snd.boom(1); burst(rtsV, 'dust', 20, 6); }
  if (RTS.pilot === o) rtsUnpilot();
  rtsRoot.remove(o.g); if (RTS.bsel === o){ RTS.bsel = null; rtsInfoShow(); }
  if (o.type === 'hq' && state === 'rts') rtsEnd(false);
}
function rtsShotSnd(id){ if (RTS.sndT > 0 || typeof Snd !== 'object') return; RTS.sndT = .07; try { Snd.shot(id); } catch (e) { errNote(e); } }
// Explosion au sol (roquettes, obus, bombes)
function rtsBlast(x, z, S2){
  for (const zz of zombies){ if (zz.dead) continue; const d = Math.hypot(zz.g.position.x - x, zz.g.position.z - z); if (d < S2.splash){ damage(zz, S2.dmg * (1 - .5 * d / S2.splash), false, zz.g.position.clone()); if (S2.burn && !zz.dead){ zz.burnT = 5; zz.burnDps = 45; } } }
  if (S2.burn) burst(rtsV.set(x, .6, z), PMATS.ember ? 'ember' : 'dust', 10, 3);
  for (const n of RTS.nests){ if (n.dead) continue; if (Math.hypot(n.x - x, n.z - z) < S2.splash + n.r){ n.hp -= S2.dmg * .8; rtsHpSet(n.hpb, n.hp / n.maxHp); if (n.hp <= 0) rtsNestDie(n); } }
  if (typeof rtsTierBlast === 'function') rtsTierBlast(x, z, S2); // explosion selon le niveau de l'arme (js/55-rts-niveaux.js)
  else {
  if (typeof rueBoom === 'function') rueBoom(x, 1.2, z, S2.splash * 2.4);
  if (S2.big){ // obus de 105 mm : grosse boule de feu, colonne de fumée, la terre tremble
    if (typeof rueBoom === 'function'){ rueBoom(x, 4, z, S2.splash * 3.2); rueBoom(x, 9, z, S2.splash * 1.8); }
    burst(rtsV.set(x, 1, z), 'dust', 40, 10); if (typeof gfxBoomSmoke === 'function') gfxBoomSmoke(x, 2, z, S2.splash * .8);
    shake = Math.max(shake, RTS.pilot ? .9 : .5); if (typeof Snd === 'object' && Snd.boom) Snd.boom(2.4);
  } else if (typeof Snd === 'object' && Snd.boom && Math.random() < .5) Snd.boom(S2.bomb ? 1 : .45);
  }
}
// En pilotage, une traînée qui passe à moins de 2,5 m des yeux boucherait tout l'écran : on ne la dessine pas
function rtsBeamOk(a, b){
  if (!RTS.pilot) return true;
  const c = camera.position, abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z, L2 = abx * abx + aby * aby + abz * abz || 1;
  const t = clamp(((c.x - a.x) * abx + (c.y - a.y) * aby + (c.z - a.z) * abz) / L2, 0, 1);
  return Math.hypot(a.x + abx * t - c.x, a.y + aby * t - c.y, a.z + abz * t - c.z) > 2.5;
}
// Un tir (robot, véhicule, avion ou tourelle) vers un zombie ('z'), un nid ('nest') ou un point du sol ('pt', { x, z })
function rtsHit(from, tgt, kind, S2){
  const to = kind === 'nest' ? rtsV2.set(tgt.x, 3 + rand(-1, 2), tgt.z) : kind === 'pt' ? rtsV2.set(tgt.x, .5, tgt.z) : rtsV2.set(tgt.g.position.x, tgt.g.position.y + (tgt.aimY || 1.1), tgt.g.position.z);
  const clear = rtsBeamOk(from, to);
  if (typeof rtsTierBeam === 'function') rtsTierBeam(from, to, S2, clear); // traînée selon le niveau de l'arme (js/55-rts-niveaux.js)
  else if (S2.beam && clear && typeof arsBeam === 'function') arsBeam(from, to, S2.beam, S2.pierce ? .14 : .05, S2.pierce ? .12 : .05);
  if (S2.chain && typeof arsBolt === 'function') arsBolt(from, to);
  if (typeof rtsTierBeam !== 'function' && !S2.beam && !S2.chain && !S2.flame && clear && typeof arsBeam === 'function') arsBeam(from, to, 0xffa040, .12, .08); // traînée de roquette, d'obus ou de bombe
  if (S2.snd !== null || S2.tsnd) rtsShotSnd(S2.tsnd || S2.snd); // son plus lourd en montant de niveau
  if (kind === 'nest'){
    tgt.hp -= S2.dmg * (S2.splash ? 1.6 : 1); rtsHpSet(tgt.hpb, tgt.hp / tgt.maxHp); burst(to, 'dust', 2, 2);
    if (S2.splash && typeof rueBoom === 'function') rueBoom(to.x, to.y, to.z, 6);
    if (tgt.hp <= 0) rtsNestDie(tgt);
    return;
  }
  if (S2.splash){
    if (S2.pierce2 && kind === 'z'){ // obus perforant : il traverse la file, puis explose
      const ax = from.x, az = from.z, bx = to.x - ax, bz = to.z - az, L2 = bx * bx + bz * bz || 1;
      for (const z of zombies){ if (z.dead || z === tgt) continue; const px = z.g.position.x - ax, pz = z.g.position.z - az, t = clamp((px * bx + pz * bz) / L2, 0, 1.6), qx = px - bx * t, qz = pz - bz * t; if (qx * qx + qz * qz < 1.6) damage(z, S2.dmg * .7, false, z.g.position.clone()); }
    }
    rtsBlast(to.x, to.z, S2); return;
  }
  if (kind === 'pt'){ burst(to, 'dust', 2, 1.5); return; }
  if (S2.pierce){
    const ax = from.x, az = from.z, bx = to.x - ax, bz = to.z - az, L2 = bx * bx + bz * bz || 1;
    for (const z of zombies){
      if (z.dead) continue; const px = z.g.position.x - ax, pz = z.g.position.z - az, t = clamp((px * bx + pz * bz) / L2, 0, 1.4);
      const qx = px - bx * t, qz = pz - bz * t; if (qx * qx + qz * qz < 1.4) damage(z, S2.dmg, false, z.g.position.clone());
    }
  } else if (S2.chain){
    let cur = tgt; const hit = [tgt]; damage(tgt, S2.dmg, false, to.clone());
    for (let k = 0; k < S2.chain; k++){
      let best = null, bd = 49;
      for (const z of zombies){ if (z.dead || hit.indexOf(z) >= 0) continue; const d = (z.g.position.x - cur.g.position.x) ** 2 + (z.g.position.z - cur.g.position.z) ** 2; if (d < bd){ bd = d; best = z; } }
      if (!best) break;
      if (typeof arsBolt === 'function') arsBolt(rtsV.set(cur.g.position.x, 1.2, cur.g.position.z), rtsV3.set(best.g.position.x, 1.2, best.g.position.z));
      damage(best, S2.dmg * .8, false, best.g.position.clone()); hit.push(best); cur = best;
    }
  } else if (S2.flame){
    for (const z of zombies){ if (z.dead) continue; const d = Math.hypot(z.g.position.x - from.x, z.g.position.z - from.z); if (d < S2.range + 1 && (z.g.position.x - from.x) * (to.x - from.x) + (z.g.position.z - from.z) * (to.z - from.z) > 0){ damage(z, S2.dmg, false, z.g.position.clone()); z.burnT = 3; z.burnDps = S2.dmg * 2; } }
    // Jet de flammes bien visible : deux traits (orange large, jaune au cœur) et des braises le long
    if (clear && typeof arsBeam === 'function'){ arsBeam(from, to, 0xff6a1a, .9, .1); arsBeam(from, to, 0xffd040, .35, .07); }
    for (let k = 0; k < 2; k++){ rtsV.copy(from).lerp(to, rand(.3, 1)); burst(rtsV, PMATS.ember ? 'ember' : 'dust', 2, 2.5); }
  } else damage(tgt, S2.dmg, false, to.clone());
}
function rtsNestDie(n){
  if (n.dead) return; n.dead = true;
  const bounty = RTS_CFG.bounty + 250 * n.idx; S.money += bounty;
  rtsV.set(n.x, 4, n.z);
  if (typeof rueBoom === 'function'){ rueBoom(n.x, 4, n.z, 26); rueBoom(n.x, 8, n.z, 16); }
  burst(rtsV, 'dust', 30, 8); burst(rtsV, 'blood', 20, 6);
  if (typeof Snd === 'object' && Snd.boom) Snd.boom(2);
  shake = Math.max(shake, .6);
  n.g.scale.y = .25; n.g.position.y = -.5; n.hpb.bg.visible = n.hpb.fg.visible = false;
  RTS.baseR = Math.min(70, RTS.baseR + RTS_CFG.baseRStep); rtsBaseSize();
  // Toujours RTS_CFG.nests nids actifs : un nouveau apparaît plus loin au nord, plus fort
  P.scrap = (P.scrap || 0) + 40 + 10 * n.idx; addXP(30 + 5 * n.idx);
  let nn = null; while (rtsNestsAlive().length < RTS_CFG.nests) nn = rtsAddNest(null, rtsFront() - rand(35, 55));
  const nd = RTS.nests.filter(x => x.dead).length;
  banner('Nid détruit ! (' + nd + ')', '+' + fmt(bounty) + (nn ? ' · nouveau nid repéré au nord, niveau ' + (nn.idx + 1) : ''), 2600);
}
const rtsS2 = u => ({ tier:(typeof rtsTier === 'function' ? rtsTier(u, 'w1') : .5), tsnd:(typeof rtsTierSndFor === 'function' ? rtsTierSndFor(u, 'w1') : null), dmg:rtsStat(u, 'dmg'), snd:u.U.snd, beam:u.U.beam, pierce:u.U.pierce, splash:u.U.splash && u.U.splash * (1 + .1 * rtsLv(u.type, 'sensor') + .25 * rtsLv(u.type, 'he')), pierce2:rtsLv(u.type, 'apfsds') > 0, flame:u.U.flame, bomb:u.U.bomb, range:rtsStat(u, 'range') });
const rtsMuzzle = (u, out) => { const p = u.g.position; return out.set(p.x, u.U.big ? 5.2 : u.U.kind === 'ground' ? (u.U.cat === 'rob' ? (u.type === 'heavy' ? 3.4 : 2.2) * RTS_SC : 2) : p.y - .5, p.z); };
// Arme secondaire (roquettes du Mech de combat) : mêmes améliorations d'armes et de cadence
const rtsS2b = u => { const W = u.U.w2, k = 1 + RTS_UPG.arm.k * rtsLv(u.type, 'arm'), se = rtsLv(u.type, 'sensor'); return { tier:(typeof rtsTier === 'function' ? rtsTier(u, 'w2') : .5), tsnd:(typeof rtsTierSndFor === 'function' ? rtsTierSndFor(u, 'w2') : null), big:!!W.big, dmg:W.dmg * k, snd:W.snd, splash:W.splash * (1 + .1 * se), range:W.range * (1 + .06 * rtsLv(u.type, 'spd') + .15 * se), burn:rtsLv(u.type, 'fire') > 0 }; };
const rtsRate2 = u => u.U.w2.rate * (1 + RTS_UPG.rate.k * rtsLv(u.type, 'rate')) * (1 + .2 * rtsLv(u.type, 'cal105'));
// Gatling de 25 mm de l'AC-130 (amélioration) : rafales traçantes rapides
const rtsS25 = u => { const G = RTS_GUNS[u.type], l = rtsLv(u.type, G.k) + (G.base ? 1 : 0); return { tier:(typeof rtsTier === 'function' ? rtsTier(u, 'gat') : .5), tsnd:(typeof rtsTierSndFor === 'function' ? rtsTierSndFor(u, 'gat') : null), dmg:G.dmg * (1 + .35 * (l - 1)) * (1 + RTS_UPG.arm.k * rtsLv(u.type, 'arm')), snd:G.snd, beam:0xffd890, range:rtsStat(u, 'range') }; };
// Missile Hellfire de l'hélicoptère (amélioration)
function rtsHellfire(u, dt, tgt, pilot){
  const l = rtsLv(u.type, 'hellfire') + (u.type === 'heli' ? 1 : 0); if (!l) return; // l'Apache a ses Hellfire dès l'achat
  u.cd4 = (u.cd4 || 0) - dt; if (u.cd4 > 0 || !tgt) return;
  u.cd4 = 3; const S4 = { tier:(typeof rtsTier === 'function' ? rtsTier(u, 'w2') : .5), tsnd:(typeof rtsTierSndFor === 'function' ? rtsTierSndFor(u, 'w2') : null), dmg:300 * (1 + .4 * (l - 1)) * (1 + RTS_UPG.arm.k * rtsLv(u.type, 'arm')), splash:4, snd:'rocket', range:rtsStat(u, 'range') + 8 };
  if (pilot){ rtsPilotShot(u, S4, 1.5, 'w2'); if (typeof rtsPosteShot === 'function') rtsPosteShot(u, 'w2'); } else rtsHit(rtsMuzzle(u, new THREE.Vector3()), tgt, tgt.g ? 'z' : 'nest', S4);
}
function rtsGat(u, dt, tgt, pilot){
  const G = RTS_GUNS[u.type]; if (!G || !(rtsLv(u.type, G.k) + (G.base ? 1 : 0))) return;
  u.cd3 = (u.cd3 || 0) - dt; if (u.cd3 > 0 || !tgt) return;
  const iv = 1 / (G.rate * (1 + RTS_UPG.rate.k * rtsLv(u.type, 'rate'))); u.cd3 = Math.max(u.cd3, -iv) + iv; // le reste d'une image passe à la suivante (cadence élevée)
  if (pilot){ const S5 = rtsS25(u); if (u.type === 'heli') S5.snd = S5.tsnd = null; /* le grondement continu vient de rtsApacheGun */ rtsPilotShot(u, S5, -1, 'gat'); } else rtsHit(rtsMuzzle(u, new THREE.Vector3()), tgt, tgt.g ? 'z' : 'nest', rtsS25(u));
}
// Choix de la cible : tireur d'élite = le plus gros ; explosifs = là où ils sont le plus serrés ; sinon le plus proche
function rtsPickTarget(u, r, splash){
  const gp = u.g.position, r2 = r * r; let best = null, bs = -1e9, n = 0;
  for (const q of zombies){
    if (q.dead) continue; const dx = q.g.position.x - gp.x, dz = q.g.position.z - gp.z, d2 = dx * dx + dz * dz; if (d2 > r2) continue;
    let sc = -d2;
    if (u.type === 'sniper') sc = q.maxHp * 10 - Math.sqrt(d2);
    else if (splash && n++ < 14){ let c = 0; for (const o of zombies) if (!o.dead && Math.abs(o.g.position.x - q.g.position.x) < splash && Math.abs(o.g.position.z - q.g.position.z) < splash) c++; sc = c * 100 - Math.sqrt(d2); }
    if (sc > bs){ bs = sc; best = q; }
  }
  return best;
}
// Lieu de réparation le plus proche (atelier, sinon le QG)
function rtsHealSpot(u){
  const gp = u.g.position; let best = null, bd = 1e9;
  for (const o of RTS.blds){ if (o.dead || !o.B.heal) continue; const d = Math.hypot(o.x - gp.x, o.z - gp.z); if (d < bd){ bd = d; best = o; } }
  return best || RTS.base;
}
function rtsNearestZ(x, z, r, fwdX, fwdZ, cos){
  let best = null, bd = r * r;
  for (const q of zombies){
    if (q.dead) continue; const dx = q.g.position.x - x, dz = q.g.position.z - z, d = dx * dx + dz * dz;
    if (d >= bd) continue;
    if (fwdX != null){ const L = Math.sqrt(d) || 1; if ((dx * fwdX + dz * fwdZ) / L < cos) continue; }
    bd = d; best = q;
  }
  return best;
}
// Avions : ils tournent autour d'un point (ordre, nid visé, ou au-dessus de la route) et attaquent ce qui passe devant
function rtsAir(u, dt){
  if (typeof rtsRearmAI === 'function' && rtsRearmAI(u, dt)) return; // à sec : il va refaire le plein (js/54-rts-postes.js)
  const U = u.U, gp = u.g.position, spd = rtsStat(u, 'speed');
  let cx = 0, cz = -40;
  if (u.nest && !u.nest.dead){ cx = u.nest.x; cz = u.nest.z; } else if (u.cmd === 'move' || u.cmd === 'patrol'){ cx = u.tx; cz = u.tz; u.cmd = 'patrol'; }
  else { // sans ordre : il va tourner au-dessus des zombies les plus proches de la base
    u.huntT = (u.huntT || 0) - dt;
    if (u.huntT <= 0){ u.huntT = 1; const q = rtsNearestZ(0, -10, 150); u.hunt = q ? [q.g.position.x, q.g.position.z] : null; }
    if (u.hunt){ cx = u.hunt[0]; cz = u.hunt[1]; }
  }
  u.oc = [cx, cz];
  if (U.gunship){ rtsGunship(u, dt, cx, cz); return; }
  const dx = cx - gp.x, dz = cz - gp.z, d = Math.hypot(dx, dz), R = U.orbit;
  let want = Math.atan2(dx, dz);
  if (d < R) want += Math.PI / 2 * (1 - d / R) * 1.1;                     // tangente : il tourne en rond (le bombardier, lui, repasse droit dessus)
  const df = Math.atan2(Math.sin(want - u.head), Math.cos(want - u.head));
  u.head += clamp(df, -U.turn * dt, U.turn * dt);
  const fx = Math.sin(u.head), fz = Math.cos(u.head);
  gp.x += fx * spd * dt; gp.z += fz * spd * dt; gp.y += (U.alt - gp.y) * Math.min(1, dt);
  u.g.rotation.set(0, u.head, -clamp(df, -.6, .6) * .8);
  rtsClampValley(gp, true);
  if (u.cd > 0) return;
  const S2 = rtsS2(u);
  if (U.bomb){ // bombes : quand il passe au-dessus de zombies ou du nid visé
    const n = u.nest && !u.nest.dead && Math.hypot(u.nest.x - gp.x, u.nest.z - gp.z) < 8 ? u.nest : null;
    if (rtsNearestZ(gp.x, gp.z, 8) || n){ u.cd = 1 / rtsStat(u, 'rate'); rtsHit(rtsMuzzle(u, new THREE.Vector3()), { x:gp.x + rand(-1, 1), z:gp.z + rand(-1, 1) }, 'pt', S2); }
    return;
  }
  const t = rtsNearestZ(gp.x, gp.z, rtsStat(u, 'range') + U.alt, fx, fz, -.3);
  const am = () => typeof rtsAmmoUse !== 'function' || rtsAmmoUse(u, 'w1'); // munitions comptées
  if (t && am()){ u.cd = 1 / rtsStat(u, 'rate'); rtsHit(rtsMuzzle(u, new THREE.Vector3()), t, 'z', S2); }
  else if (!t && u.nest && !u.nest.dead){ const n = u.nest, nd = Math.hypot(n.x - gp.x, n.z - gp.z) || 1; if (nd < S2.range + n.r + U.alt && ((n.x - gp.x) * fx + (n.z - gp.z) * fz) / nd > -.3 && am()){ u.cd = 1 / rtsStat(u, 'rate'); rtsHit(rtsMuzzle(u, new THREE.Vector3()), n, 'nest', S2); } }
}
// AC-130 : il tourne en virage à gauche autour d'un point, les canons du flanc gauche pointés vers le centre
function rtsGunshipFly(u, dt, cx, cz){
  const U = u.U, gp = u.g.position, spd = rtsStat(u, 'speed'), R = U.orbit;
  const a = Math.atan2(gp.x - cx, gp.z - cz), d = Math.hypot(gp.x - cx, gp.z - cz);
  const aim = d > R * 1.6 ? null : a - .35;            // un point un peu plus loin sur le cercle (sens des aiguilles vu de haut = virage à gauche)
  const tx = aim == null ? cx : cx + Math.sin(aim) * R, tz = aim == null ? cz : cz + Math.cos(aim) * R;
  const want = Math.atan2(tx - gp.x, tz - gp.z), df = Math.atan2(Math.sin(want - u.head), Math.cos(want - u.head));
  u.head += clamp(df, -U.turn * dt, U.turn * dt);
  gp.x += Math.sin(u.head) * spd * dt; gp.z += Math.cos(u.head) * spd * dt; gp.y += (U.alt - gp.y) * Math.min(1, dt);
  u.g.rotation.set(0, u.head, d < R * 1.6 ? .32 : 0);    // il penche vers le centre
  rtsClampValley(gp, true);
}
function rtsGunship(u, dt, cx, cz){
  rtsGunshipFly(u, dt, cx, cz);
  const gp = u.g.position, from = rtsMuzzle(u, new THREE.Vector3());
  u.scanT = (u.scanT || 0) - dt;
  if (u.scanT <= 0){ u.scanT = .3; u.tgt = rtsPickTarget(u, rtsStat(u, 'range'), 6); }
  const flanc = q => typeof rtsAcFlanc !== 'function' || rtsAcFlanc(u, q.g ? q.g.position.x : q.x, q.g ? q.g.position.z : q.z); // seulement du côté des canons
  const t = u.tgt && !u.tgt.dead && flanc(u.tgt) ? u.tgt : null, n = u.nest && !u.nest.dead && Math.hypot(u.nest.x - gp.x, u.nest.z - gp.z) < rtsStat(u, 'range') && flanc(u.nest) ? u.nest : null;
  const am = k => typeof rtsAmmoUse !== 'function' || rtsAmmoUse(u, k);
  if (u.cd <= 0 && (t || n) && am('w1')){ u.cd = 1 / rtsStat(u, 'rate'); rtsHit(from, t || n, t ? 'z' : 'nest', rtsS2(u)); }
  if (u.cd2 <= 0 && (t || n) && am('w2')){ u.cd2 = 1 / rtsRate2(u); rtsHit(from, t || n, t ? 'z' : 'nest', rtsS2b(u)); }
  rtsGat(u, dt, t || n, false);
}
// Pas des petits robots : les jambes se balancent en sens contraire pendant la marche, puis reviennent droites à l'arrêt
function rtsLegsStep(u, dt, marche){
  const a = marche ? Math.sin(u.step * 1.6) * .55 : 0;
  u.legs.forEach((l, i) => { const want = i ? a : -a; l.rotation.x += (want - l.rotation.x) * Math.min(1, dt * (marche ? 18 : 8)); });
}
function rtsUnits(dt){
  for (const u of RTS.units){
    if (u.dead) continue;
    u.ring.visible = RTS.sel.indexOf(u) >= 0 && RTS.pilot !== u;
    if (u.rotor){ u.rotor.rotation.y += dt * 30; if (u.g.userData.tail) u.g.userData.tail.rotation.x += dt * 40; }
    if (u.g.userData.props) u.g.userData.props.forEach((pr, i) => { pr.rotation.z += dt * (i % 2 ? 23 : 25); });
    u.cd -= dt; u.cd2 -= dt;
    if (RTS.pilot === u) continue;                           // piloté par le joueur
    if (u.U.kind === 'air'){ rtsAir(u, dt); continue; }
    const U = u.U, gp = u.g.position, rng = rtsStat(u, 'range'), spd = rtsStat(u, 'speed');
    u.scanT -= dt;
    let nest = u.nest && !u.nest.dead ? u.nest : null;
    if (u.scanT <= 0){
      u.scanT = rand(.2, .35);
      u.tgt = rtsPickTarget(u, rng + (u.cmd === 'idle' ? 6 : 0), U.splash); u.autoNest = null;
      if (!nest && !u.tgt && u.cmd === 'idle') for (const n of RTS.nests){ if (!n.dead && Math.hypot(n.x - gp.x, n.z - gp.z) < rng + n.r){ u.autoNest = n; break; } }
      // Danger : le zombie au sol le plus proche (les hélicoptères ne craignent que les volants)
      u.near = null; u.nearD = 1e9;
      for (const q of zombies){ if (q.dead || (U.kind === 'heli') !== !!RTS_FLY[q.type]) continue; const d = Math.hypot(q.g.position.x - gp.x, q.g.position.z - gp.z); if (d < u.nearD){ u.nearD = d; u.near = q; } }
      // Trop abîmé : retraite vers l'atelier (ou le QG) ; il revient au combat une fois réparé
      const shop = RTS.blds.some(o => !o.dead && o.B.heal);
      if (!u.retreat && u.hp < u.maxHp * .3 && shop) u.retreat = true;
      else if (u.retreat && (u.hp > u.maxHp * .75 || !shop)) u.retreat = false;
    }
    nest = nest || (u.autoNest && !u.autoNest.dead ? u.autoNest : null);
    // Où aller : retraite > recul devant un zombie trop proche > nid visé > ordre de marche > garde de son poste
    // u.hold (« Tenir la position », js/49-rts-commandement.js) : ni retraite, ni recul, ni poursuite ; elle tire d'où elle est
    let tx = u.tx, tz = u.tz, go = false, back = false;
    const kite = RTS_KITE[u.type] || 0;
    if (u.retreat && !u.hold){ const h = rtsHealSpot(u); if (h){ const want = (h.B.heal ? h.B.healR * .5 : h.r + 5); if (Math.hypot(h.x - gp.x, h.z - gp.z) > want){ tx = h.x; tz = h.z; go = true; } } }
    else if (kite && !u.hold && u.near && !u.near.dead && u.nearD < kite){
      // Recule : à l'opposé du zombie, un peu vers son poste (et vers la base)
      const ax = gp.x - u.near.g.position.x, az = gp.z - u.near.g.position.z, al = Math.hypot(ax, az) || 1;
      const hx = u.hx - gp.x, hz = u.hz + 6 - gp.z, hl = Math.hypot(hx, hz) || 1;
      tx = gp.x + (ax / al + hx / hl * .35) * 4; tz = gp.z + (az / al + hz / hl * .35) * 4; go = true; back = true;
    }
    else if (u.nest && !u.nest.dead){ const dn = Math.hypot(u.nest.x - gp.x, u.nest.z - gp.z); if (dn > rng + u.nest.r - 2){ tx = u.nest.x; tz = u.nest.z; go = true; } }
    else if (u.cmd === 'move'){ go = true; }
    else if (u.tgt && !u.tgt.dead && !u.hold){
      // Garde : il ne poursuit pas trop loin de son poste
      const tp = u.tgt.g.position, dz = Math.hypot(tp.x - gp.x, tp.z - gp.z);
      if (dz > rng && Math.hypot(tp.x - u.hx, tp.z - u.hz) < RTS_LEASH + rng){ tx = tp.x; tz = tp.z; go = true; }
    } else if (Math.hypot(u.hx - gp.x, u.hz - gp.z) > 2.5){ tx = u.hx; tz = u.hz; go = true; }
    if (go){
      const dx = tx - gp.x, dz = tz - gp.z, d = Math.hypot(dx, dz);
      if (d < .8){ if (u.cmd === 'move'){ u.cmd = 'idle'; u.hx = u.tx; u.hz = u.tz; } }
      else {
        const v = Math.min(d, spd * (back ? .85 : 1) * dt); gp.x += dx / d * v; gp.z += dz / d * v;
        if (!back){ u.head = Math.atan2(dx, dz); u.g.rotation.y = u.head; }
        const was = Math.sin(u.step); u.step += dt * U.speed * 1.6;
        if (U.big && was > 0 !== Math.sin(u.step) > 0 && camera.position.distanceTo(gp) < 45 && typeof mechStomp === 'function') mechStomp();
      }
    }
    if (U.kind === 'ground'){
      for (const o of RTS.units){ if (o === u || o.dead || o.U.kind !== 'ground') continue; const dx = gp.x - o.g.position.x, dz = gp.z - o.g.position.z, d = Math.hypot(dx, dz), m = u.r + o.r; if (d > 0 && d < m){ gp.x += dx / d * (m - d) * .5; gp.z += dz / d * (m - d) * .5; } }
      for (const o of RTS.blds){ if (o.dead) continue; const dx = gp.x - o.x, dz = gp.z - o.z, d = Math.hypot(dx, dz), m = u.r + o.r; if (d > 0 && d < m){ gp.x += dx / d * (m - d); gp.z += dz / d * (m - d); } }
      rtsClampValley(gp, false);
      if (U.cat === 'rob'){ u.m.position.y = Math.abs(Math.sin(u.step * 2)) * (U.big ? .15 : .08); u.m.rotation.z = Math.sin(u.step) * .04; }
      if (u.legs) rtsLegsStep(u, dt, go && Math.hypot(tx - gp.x, tz - gp.z) >= .8); // les jambes font des pas
    } else { gp.y = U.alt + Math.sin(RTS.t * 1.5 + u.head) * .3; rtsClampValley(gp, true); }
    const tgt = u.tgt && !u.tgt.dead ? u.tgt : null;
    if (u.cd <= 0){
      const S2 = rtsS2(u);
      if (tgt && Math.hypot(tgt.g.position.x - gp.x, tgt.g.position.z - gp.z) <= rng){ u.cd = 1 / rtsStat(u, 'rate'); u.head = Math.atan2(tgt.g.position.x - gp.x, tgt.g.position.z - gp.z); u.g.rotation.y = u.head; rtsHit(rtsMuzzle(u, new THREE.Vector3()), tgt, 'z', S2); }
      else if (nest && Math.hypot(nest.x - gp.x, nest.z - gp.z) <= rng + nest.r){ u.cd = 1 / rtsStat(u, 'rate'); u.head = Math.atan2(nest.x - gp.x, nest.z - gp.z); u.g.rotation.y = u.head; rtsHit(rtsMuzzle(u, new THREE.Vector3()), nest, 'nest', S2); }
    }
    if (RTS_GUNS[u.type] && u.type !== 'bomber'){ const g2 = rtsNearestZ(gp.x, gp.z, rng); rtsGat(u, dt, g2, false); rtsHellfire(u, dt, tgt || g2 || nest, false); }
    // Arme secondaire : roquettes là où les zombies sont serrés, sinon sur le nid
    if (U.w2 && u.cd2 <= 0){
      const S3 = rtsS2b(u), t2 = rtsPickTarget(u, S3.range, S3.splash);
      if (t2){ u.cd2 = 1 / rtsRate2(u); rtsHit(rtsMuzzle(u, new THREE.Vector3()), t2, 'z', S3); }
      else if (nest && Math.hypot(nest.x - gp.x, nest.z - gp.z) <= S3.range + nest.r){ u.cd2 = 1 / rtsRate2(u); rtsHit(rtsMuzzle(u, new THREE.Vector3()), nest, 'nest', S3); }
    }
  }
}
function rtsBuildings(dt){
  for (const o of RTS.blds){
    if (o.dead) continue;
    o.ring.visible = RTS.bsel === o;
    const B = o.B;
    if (B.turret && RTS.pilot === o) continue;
    if (B.turret){
      o.cd -= dt; o.scanT -= dt;
      const rng = rtsTStat(o, 'range'), mn = B.turret.min || 0;
      if (o.scanT <= 0){ o.scanT = rand(.15, .3); let best = null, bd = rng * rng; for (const z of zombies){ if (z.dead) continue; const d = (z.g.position.x - o.x) ** 2 + (z.g.position.z - o.z) ** 2; if (d < bd && d > mn * mn){ bd = d; best = z; } } o.tgt = best; }
      const t = o.tgt && !o.tgt.dead ? o.tgt : null;
      if (t){
        const want = Math.atan2(t.g.position.x - o.x, t.g.position.z - o.z), cur = o.head.rotation.y, df = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
        o.head.rotation.y = cur + clamp(df, -dt * 5, dt * 5);
        if (o.cd <= 0 && Math.abs(df) < .3){ o.cd = 1 / rtsTStat(o, 'rate'); rtsHit(new THREE.Vector3(o.x, 2.2, o.z), t, 'z', Object.assign({}, B.turret, { dmg:rtsTStat(o, 'dmg'), range:rng })); }
      }
    } else if (B.heal){
      o.healT = (o.healT || 0) - dt;
      if (o.healT <= 0){ o.healT = .5; const h = B.heal * .5;
        RTS.units.forEach(u => { if (!u.dead && u.hp < u.maxHp && Math.hypot(u.g.position.x - o.x, u.g.position.z - o.z) < B.healR){ u.hp = Math.min(u.maxHp, u.hp + h); rtsHpSet(u.hpb, u.hp / u.maxHp); } });
        RTS.blds.forEach(b => { if (!b.dead && b !== o && b.hp < b.maxHp && Math.hypot(b.x - o.x, b.z - o.z) < B.healR + b.r){ b.hp = Math.min(b.maxHp, b.hp + h * 2); rtsHpSet(b.hpb, b.hp / b.maxHp); } });
      }
    }
  }
  RTS.incT -= dt;
  if (RTS.incT <= 0){ RTS.incT = 5; const n = RTS.blds.filter(o => !o.dead && o.B.income).length; if (n) S.money += n * RTS_BLD.scrap.income; }
}
function rtsStep(dt){
  if (!RTS.on || RTS.paused || state !== 'rts') return;
  RTS.t += dt; RTS.sndT -= dt;
  rtsThreat();
  for (const n of RTS.nests){
    if (n.dead) continue;
    n.spawnT -= dt;
    if (n.spawnT <= 0){ n.spawnT = Math.max(1.6, rand(6, 9) / Math.sqrt(RTS.threat) / n.pow); const a = Math.atan2(-n.z, -n.x); rtsSpawnAt(n.x + Math.cos(a) * 6, n.z + Math.sin(a) * 6, 1 + Math.floor(RTS.threat * .8 + n.idx / 3)); }
    n.m.scale.setScalar(1 + Math.sin(RTS.t * 2.2 + n.idx) * .015);
  }
  // Hordes : du nord, réparties sur tout le secteur de 90° ; un boss toutes les RTS_CFG.bossEvery hordes
  RTS.hordeT -= dt;
  if (RTS.hordeT <= 0){
    RTS.hordeT = RTS_CFG.hordeEvery; RTS.hordeN++;
    // Plusieurs groupes répartis sur tout le secteur de 90° devant la base (pas seulement par la route)
    const R0 = -rtsFront() + 30, tot = 10 + Math.round(RTS.threat * 5), ng = 3 + Math.floor(Math.random() * 3); let n = 0, E = null;
    for (let gi = 0; gi < ng; gi++){
      const a = (-1 + 2 * (gi + rand(.15, .85)) / ng) * Math.PI / 4, zz = -R0 * Math.cos(a), m = rtsValleyX(zz) - 6, xx = clamp(R0 * Math.sin(a), -m, m);
      n += rtsSpawnAt(xx, zz, Math.ceil(tot / ng), 7); if (!E || Math.random() < .4) E = [xx, zz];
    }
    let sub = n + ' zombies arrivent de partout au nord';
    if (RTS.hordeN % RTS_CFG.bossEvery === 0){ const bt = RTS_BOSS[RTS.bossN++ % RTS_BOSS.length]; if (ZTYPES[bt] && rtsSpawnAt(E[0], E[1] + 6, 1, 2, bt)) sub = 'Un boss arrive : ' + ZTYPES[bt].name + ' !'; }
    banner('Horde n° ' + RTS.hordeN + ' !', sub, 2400);
    if (typeof Snd === 'object' && Snd.groan) Snd.groan();
  }
  for (let i = RTS.shells.length - 1; i >= 0; i--){ const sh = RTS.shells[i]; sh.t -= dt; if (sh.t <= 0){ RTS.shells.splice(i, 1); rtsBlast(sh.x, sh.z, sh.S2); } }
  rtsUnits(dt); rtsBuildings(dt); rtsZombies(dt);
  if (RTS.pilot && state === 'rts') rtsPilotStep(dt);
  groanT -= dt; if (groanT <= 0){ groanT = rand(1.5, 3.5); if (zAliveCount() > 0 && typeof Snd === 'object') Snd.groan(); }
}
function rtsCamStep(dt){
  const C = RTS.cam, k = RTS.keys, sp = C.h * .9 * dt;
  C.x += ((k.r ? 1 : 0) - (k.l ? 1 : 0)) * sp; C.z += ((k.b ? 1 : 0) - (k.f ? 1 : 0)) * sp;
  C.x = clamp(C.x, -170, 170); C.z = clamp(C.z, RTS.zMin, 30); C.h = clamp(C.h, 24, 100);
  camera.position.set(C.x, C.h, C.z + C.h * .38);
  camera.lookAt(C.x, 0, C.z);
}
function rtsFrame(dt){
  if (!RTS.on) return;
  if (RTS.pilot) rtsPilotCam(); else if (state === 'rts' || state === 'rtsover') rtsCamStep(dt);
  if (RTS.pilot && RTS.pilot.U && RTS.pilot.U.gunship){ // zoom et filtre du poste de l'AC-130 (js/54-rts-postes.js ; le zoom du jeu ne s'en mêle pas)
    const fv = (typeof rtsPosteFov === 'function' && rtsPosteFov(RTS.pilot)) || 38;
    if (camera.fov !== fv){ camera.fov = fv; camera.updateProjectionMatrix(); }
    canvas.classList.toggle('rt-ac', fv < 50); canvas.classList.toggle('rt-ac105', fv < 30);
  }
  if (RTS.sky) RTS.sky.position.set(camera.position.x, 0, camera.position.z); // le ciel suit la caméra
  // En pilotage, les barres de vie trop proches des yeux sont cachées (sinon elles bouchent la vue)
  if (RTS.pilot || RTS.hpHid){
    RTS.hpHid = !!RTS.pilot;
    for (const u of RTS.units){ if (u.dead || u === RTS.pilot) continue; const v = !RTS.pilot || camera.position.distanceTo(u.g.position) > 12; u.hpb.bg.visible = u.hpb.fg.visible = v; }
    for (const o of RTS.blds){ if (o.dead) continue; const v = !RTS.pilot || Math.hypot(camera.position.x - o.x, camera.position.z - o.z) > 12 + o.r; o.hpb.bg.visible = o.hpb.fg.visible = v; }
  }
  if (RTS.pilot && RTS.pilot.U && RTS.pilot.U.big && typeof mechCk !== 'undefined'){ // même cockpit que le mode « Robot de combat »
    mechCk.visible = true; Object.keys(mechArmsG).forEach(k => { mechArmsG[k].visible = k === 'minigun' || k === 'rocket'; });
    mechBarrels.rotation.z += dt * 28 * RTS.spin; mechCk.position.y = -Math.sin(RTS.pilot.step * 2) * .03;
    mechFlashL.visible = RTS.spin >= 1 && (RTS.pv.fire || (isTouch && RTS.pv.aim.id !== null)); if (mechFlashL.visible) mechFlashL.material.rotation = Math.random() * 6;
  }
  Object.keys(VMS).forEach(k => { VMS[k].visible = false; });
  if (typeof vmRoot !== 'undefined') vmRoot.visible = false; // pas de mains ni d'arme du toit pendant le RTS : le poste de pilotage les remplace
  if (typeof rtsPosteFrame === 'function') rtsPosteFrame(dt);
  rtsHUD();
}
