'use strict';
/* ================= RTS : des bâtiments qui vivent (dossier 129, suite de js/84-rts-anim.js), seulement visuel ================= */
//   Construction : le bâtiment monte dans un échafaudage, avec des étincelles en haut et de la poussière au pied, puis
//     l'échafaudage redescend (le bâtiment marche dès la pose, comme avant : rien n'attend la fin de l'animation).
//   Production : la porte de l'usine (robots, lourde, garage) se lève, un voyant clignote, la cheminée fume et l'unité sort
//     par la porte (js/84-rts-anim.js) ; l'Apache décolle de l'héliport et l'avion de l'aérodrome.
//   Tourelles : elles suivaient déjà leur cible (le jeu) ; la tête recule à chaque tir (le mortier s'enfonce).
//   QG : un radar qui tourne sur son toit.
//   Destruction : le bâtiment s'écroule en s'enfonçant, la tête d'une tourelle saute ; les gravats et la carcasse de
//     js/79-rts-vallee.js prennent le relais. Vendu : il disparaît comme avant.
// Je ne touche qu'à des propriétés que le jeu n'écrit jamais : o.m.scale (le temps de la construction), o.head.position
// (le jeu ne lit que sa rotation pour viser), et à mes pièces (porte, radar, échafaudages, fantômes).

const RA_BAT = { monte:1.6, chute:1.4, tete:1.0, radar:1.1, porte:1.9, voyant:.22,
  recul:{ t_mg:.13, t_cannon:.45, t_flame:.04, t_mortar:0, t_tesla:0 }, mortier:.32, reculT:.16, echafaudages:3 };
const RA_PORTE = { factory:1, heavyfac:1.25, vehdepot:1.35 }; // les bâtiments à porte (k : échelle de js/41-rts.js)

/* ---------- Pièces (géométries à moi, faites dans raCalme) ---------- */
const raPorteGeo = () => raGeo('porte', b => { // porte roulante, pivot en haut ; k = 1 (mise à l'échelle par la pièce)
  vmBox(b, 3.5, 2.5, .08, 0x6e6e66, 0, -1.25, 0, 0, 0, 0, 0);
  for (let i = 0; i < 6; i++) vmBox(b, 3.52, .07, .1, 0x8c8c82, 0, -.2 - i * .4, .01, 0, 0, 0, 0);
  for (let i = 0; i < 7; i++) vmBox(b, .5, .16, .1, i % 2 ? RTS_Y : RTS_DARK, -1.5 + i * .5, -2.42, .02, 0, 0, 0, 0); // bande d'avertissement
});
const raRadarGeo = () => raGeo('radar', b => { // radar du QG : mât, antenne parabolique penchée, cornet, contrepoids
  vmCyl(b, .22, .9, VC.steel, 0, .45, 0, Math.PI / 2, 0, 0, 8);
  vmBox(b, .5, .3, 1.4, 0x5a5d64, 0, .95, 0, 0, 0, 0, .05);
  vmCyl(b, 1.25, .16, 0xb4b4b8, 0, 1.55, .55, -.45, 0, 0, 14, .6);
  vmCyl(b, .05, 1.1, RTS_DARK, 0, 1.75, 1.1, -.45, 0, 0, 6); vmBox(b, .18, .18, .22, [2.6, .5, .3], 0, 1.98, 1.55, -.45, 0, 0, 0);
  vmBox(b, .55, .5, .45, RTS_DARK, 0, 1.0, -.85, 0, 0, 0, .05);
});
function raEchafaudageGeo(o){ // à la taille du bâtiment : montants tous les 2,5 m, lisses tous les 1,5 m, quelques diagonales
  return raGeo('ech_' + o.type, b => {
    const geo = o.m.geometry; if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox, x0 = bb.min.x - .45, x1 = bb.max.x + .45, z0 = bb.min.z - .45, z1 = bb.max.z + .45, h = Math.max(1.6, Math.min(9, bb.max.y + .4));
    const col = [1.7, 1.25, .35], t = .1, pl = 0x6a5030;
    const cote = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 2.5)), ang = Math.atan2(bx - ax, bz - az);
      for (let i = 0; i <= n; i++){ const k = i / n; vmBox(b, t, h, t, col, ax + (bx - ax) * k, h / 2, az + (bz - az) * k, 0, 0, 0, 0); }
      for (let y = 1.5; y < h + .01; y += 1.5) vmBox(b, t, t, L, col, (ax + bx) / 2, Math.min(y, h), (az + bz) / 2, 0, ang, 0, 0);
      vmBox(b, .5, .06, L, pl, (ax + bx) / 2, Math.min(1.5, h) + .06, (az + bz) / 2, 0, ang, 0, 0); // planches du premier palier
      const dz = h / Math.ceil(h / 1.5);
      vmPush(b, (ax + bx) / 2, 0, (az + bz) / 2, 0, ang, 0);
      for (let y = 0; y + dz <= h + .01; y += dz * 2) vmBox(b, t * .8, Math.hypot(Math.min(L, 2.5), dz), t * .8, col, 0, y + dz / 2, 0, Math.atan2(Math.min(L, 2.5), dz), 0, 0, 0);
      vmPop(b);
    };
    cote(x0, z0, x1, z0); cote(x1, z0, x1, z1); cote(x1, z1, x0, z1); cote(x0, z1, x0, z0);
  });
}

/* ---------- Un bâtiment ---------- */
function raBatAttacher(o){
  const st = { cd:o.cd, kick:0, monte:null, porte:-1, voyT:0, fumT:0, h0:o.head ? o.head.position.clone() : null, extras:[], ech:null };
  const k = RA_PORTE[o.type];
  if (k){ const p = new THREE.Mesh(raPorteGeo(), rtsMat); p.name = 'raPorte'; p.position.set(0, 2.7 * k, 3.06 * k + .16); p.scale.set(k, k, 1); o.m.add(p); st.porte3 = p; st.k = k; st.extras.push(p); }
  if (o.type === 'hq'){ const r = new THREE.Mesh(raRadarGeo(), rtsMat); r.name = 'raRadar'; r.position.set(-2, 7.55, 0); o.m.add(r); st.radar = r; st.extras.push(r); }
  RA.b.set(o, st); RA.bliste.add(o);
  return st;
}
function raBatDetacher(o, st){
  if (!st) return;
  st.extras.forEach(m => { if (m.parent) m.parent.remove(m); });
  o.m.scale.set(1, 1, 1); if (o.head && st.h0) o.head.position.copy(st.h0);
  if (st.ech){ st.ech.on = false; st.ech.m.visible = false; }
  RA.b.delete(o); RA.bliste.delete(o);
}
// Usine d'où sort une unité neuve (bâtiment de son type le plus proche, à moins de r + 6 m)
function raUsinePour(u){
  const gp = u.g.position; let best = null, bd = 1e9;
  for (const o of RTS.blds){ if (o.dead || o.type !== u.U.fac) continue; const d = Math.hypot(o.x - gp.x, o.z - gp.z); if (d < o.r + 6 && d < bd){ bd = d; best = o; } }
  return best;
}
// Pied de la porte dans le monde et direction vers l'extérieur
function raPorteDe(o){
  const k = RA_PORTE[o.type]; if (!k) return null;
  const a = o.m.rotation.y, nx = Math.sin(a), nz = Math.cos(a), d = 3.06 * k + .3;
  return { x:o.x + nx * d, z:o.z + nz * d, nx, nz };
}
function raPorteOuvrir(o){
  const st = RA.b.get(o); if (!st) return;
  st.porte = st.porte >= 0 && st.porte < RA_BAT.porte - .5 ? Math.min(st.porte, .35) : 0; // déjà ouverte : elle le reste
  st.fumT = 0; st.fum = 1.2;
}
function raConstruire(o, st){
  st.monte = { t:0 };
  let e = null; for (const q of RA.ech){ if (!q.on){ e = q; break; } }
  if (!e){ e = RA.ech[0]; for (const q of RA.ech) if (q.t > e.t) e = q; if (e.o && RA.b.get(e.o)) RA.b.get(e.o).ech = null; }
  e.m.geometry = raEchafaudageGeo(o); e.m.position.set(o.x, 0, o.z); e.m.rotation.y = o.m.rotation.y; e.on = true; e.t = 0; e.o = o; e.m.visible = true;
  st.ech = e;
}
function raEcroule(o){
  const P = raPart(), geo = o.m.geometry; if (!geo.boundingBox) geo.computeBoundingBox();
  const f = raFantome();
  if (f){
    f.m.geometry = geo; f.m.position.set(o.x, 0, o.z); f.m.scale.set(1, 1, 1); f.m.rotation.set(0, o.m.rotation.y, 0, 'YXZ');
    Object.assign(f, { on:true, t:0, T:RA_BAT.chute * (o.type === 'hq' ? 1.4 : 1), kind:'bat', h:geo.boundingBox.max.y, r:o.r, sx:raR(-1, 1), sz:raR(-1, 1), fumT:0 }); f.m.visible = true;
  }
  if (o.head){
    const t = raFantome();
    if (t && t !== f){
      t.m.geometry = o.head.geometry; t.m.position.set(o.x, o.head.position.y, o.z); t.m.scale.copy(o.head.scale); t.m.rotation.set(0, o.head.rotation.y, 0, 'YXZ');
      const a = raR(0, 6.28);
      Object.assign(t, { on:true, t:0, T:RA_BAT.tete, kind:'tete', y0:o.head.position.y, vx:Math.sin(a) * 2.2, vz:Math.cos(a) * 2.2, sens:raHasard() < .5 ? -1 : 1, fumT:0 }); t.m.visible = true;
    }
  }
}
function raFantomeBat(f, dt, k, P){
  const m = f.m;
  if (f.kind === 'bat'){ // il s'enfonce en s'écrasant et en penchant ; poussière au pied
    const e = Math.pow(k, 1.6);
    m.position.y = -f.h * .92 * e; m.scale.y = 1 - .3 * e; m.rotation.x = f.sz * .14 * k; m.rotation.z = f.sx * .14 * k;
    if (P && dt > 0 && k < .8){ f.fumT -= dt; if (f.fumT <= 0){ f.fumT = isTouch ? .07 : .035; const a = raR(0, 6.28), r = f.r * raR(.6, 1.1);
      rfxP(P.soft, m.position.x + Math.cos(a) * r, .6, m.position.z + Math.sin(a) * r, Math.cos(a) * raR(1, 3), raR(.6, 1.6), Math.sin(a) * raR(1, 3), raR(1.6, 2.6), 2, 4.5 + f.r * .4, RV_FUM.beton, RV_FUM.sableC, .55, 0, .9); } }
  } else { // tête de tourelle : elle saute et retombe à côté en roulant
    m.position.y = Math.max(-.3, f.y0 + 3.2 * k - 5.2 * k * k); m.position.x += f.vx * dt; m.position.z += f.vz * dt;
    m.rotation.x += f.sens * dt * 5; m.rotation.z += f.sens * dt * 3;
  }
}

/* ---------- Création, partie neuve, départ ---------- */
function raBatCreer(){
  RA.b = new WeakMap(); RA.bliste = new Set(); RA.ech = [];
  for (let i = 0; i < RA_BAT.echafaudages; i++){ const m = new THREE.Mesh(RA.geo.vide, rtsMat); m.visible = false; RA.root.add(m); RA.ech.push({ m, on:false, t:0, o:null }); }
}
function raBatNouvelle(){
  if (!RA.bliste) return;
  RA.bliste.clear();
  RA.ech.forEach(e => { e.on = false; e.o = null; e.m.visible = false; e.m.geometry = RA.geo.vide; });
}
function raBatQuitter(){
  if (!RA.bliste) return;
  RA.bliste.forEach(o => raBatDetacher(o, RA.b.get(o)));
  RA.bliste.clear();
  RA.ech.forEach(e => { e.on = false; e.o = null; e.m.visible = false; e.m.geometry = RA.geo.vide; });
}

/* ---------- Chaque image ---------- */
function raBatiments(dt, depart){
  if (!RA.b) return;
  const P = raPart(), ombre = typeof rstActif === 'function' && rstActif();
  for (const o of RTS.blds){
    if (o.dead){
      if (!RA.morts.has(o)){ RA.morts.add(o); const st = RA.b.get(o); if (st && st.ech){ st.ech.on = false; st.ech.m.visible = false; } if (o.hp <= 0 && RA.pret && dt > 0) raEcroule(o); RA.b.delete(o); RA.bliste.delete(o); }
      continue;
    }
    let st = RA.b.get(o);
    if (!st){ st = raCalme(() => raBatAttacher(o)); if (!depart && !RA.vus.has(o)) raCalme(() => raConstruire(o, st)); RA.vus.add(o); }
    // Porte et radar sans ombre projetée (js/72 la remet toutes les 0,25 s) : un appel de dessin de moins chacun en Amélioré
    if (st.porte3 && st.porte3.castShadow) st.porte3.castShadow = false;
    if (st.radar && st.radar.castShadow) st.radar.castShadow = false;
    if (dt <= 0) continue;
    const voit = raVisible(o.x, 2, o.z, o.r + 5);
    // Construction (elle avance même hors de la vue, pour finir à temps)
    if (st.monte){
      const M = st.monte; M.t += dt; const p = Math.min(1, M.t / RA_BAT.monte), e = 1 - Math.pow(1 - p, 2.2);
      o.m.scale.y = Math.max(.03, e);
      if (o.head && st.h0) o.head.position.y = st.h0.y * Math.max(.15, (p - .35) / .65);
      const E = st.ech;
      if (E){ E.t = M.t; E.m.castShadow = ombre; E.m.scale.y = Math.min(1, p * 4) * (p > .8 ? Math.max(.02, 1 - (M.t / RA_BAT.monte - .8) / .45) : 1); }
      if (P && voit && p < .95){
        const geo = o.m.geometry, hb = geo.boundingBox ? geo.boundingBox.max.y : 4, y = hb * e;
        if (raHasard() < dt * (isTouch ? 14 : 26)){ const a = raR(0, 6.28), r = o.r * raR(.4, .9); rfxP(P.glow, o.x + Math.cos(a) * r, y + .1, o.z + Math.sin(a) * r, raR(-2.5, 2.5), raR(1.5, 4), raR(-2.5, 2.5), raR(.25, .5), raR(.35, .7), .08, [1, .85, .5], RV_FUM.feu, .95, -9, .2); }
        if (p < .5 && raHasard() < dt * 10){ const a = raR(0, 6.28); rfxP(P.soft, o.x + Math.cos(a) * o.r, .4, o.z + Math.sin(a) * o.r, Math.cos(a) * 1.2, raR(.3, .8), Math.sin(a) * 1.2, raR(1.2, 2), 1.4, 3.4, RV_FUM.sable, RV_FUM.sableC, .4, 0, .6); }
      }
      if (M.t >= RA_BAT.monte + .45){ st.monte = null; o.m.scale.y = 1; if (o.head && st.h0) o.head.position.y = st.h0.y; if (E){ E.on = false; E.m.visible = false; E.m.geometry = RA.geo.vide; st.ech = null; } }
      continue; // pas de recul ni de porte pendant la construction
    }
    // Tourelle : la tête recule au tir (le jeu lit seulement sa rotation pour viser)
    if (o.head && st.h0){
      if (o.cd > st.cd + 1e-6) st.kick = 1; st.cd = o.cd;
      st.kick *= Math.exp(-dt / RA_BAT.reculT); if (st.kick < .003) st.kick = 0;
      if (RTS.pilot === o) o.head.position.copy(st.h0);
      else if (voit){
        const s = o.head.scale.x, r = (RA_BAT.recul[o.type] || 0) * st.kick * s, a = o.head.rotation.y;
        o.head.position.set(st.h0.x - Math.sin(a) * r, st.h0.y - (o.type === 't_mortar' ? RA_BAT.mortier * st.kick * s : 0), st.h0.z - Math.cos(a) * r);
      }
    }
    if (st.radar && voit) st.radar.rotation.y += dt * RA_BAT.radar;
    // Porte qui se lève pendant la production, voyant qui clignote, cheminée qui fume
    if (st.porte3 && st.porte >= 0){
      st.porte += dt; const T = RA_BAT.porte, t = st.porte;
      const ouv = t < .35 ? t / .35 : t < T - .5 ? 1 : Math.max(0, (T - t) / .5);
      st.porte3.scale.y = st.k * (1 - .92 * ouv);
      if (P && voit){
        const D = raPorteDe(o), hk = 2.85 * st.k;
        st.voyT -= dt; if (st.voyT <= 0){ st.voyT = RA_BAT.voyant; rfxP(P.glow, D.x, hk, D.z, 0, 0, 0, RA_BAT.voyant * .55, 1.1, .9, [1, .65, .15], [1, .4, .1], 1); }
        if (st.fum > 0){ st.fum -= dt; st.fumT -= dt; if (st.fumT <= 0){ st.fumT = isTouch ? .12 : .07; const a = o.m.rotation.y, lx = 2.5 * st.k, lz = -1.5 * st.k;
          rfxP(P.soft, o.x + lx * Math.cos(a) + lz * Math.sin(a), 5.5 * st.k + 1.6, o.z - lx * Math.sin(a) + lz * Math.cos(a), RV_REGL.vent.x * .5, raR(1.4, 2.2), RV_REGL.vent.z * .5, raR(2, 3), .9, 3, RV_FUM.grise, [.6, .58, .55], .55, 0, .2); } }
      }
      if (t >= T){ st.porte = -1; st.porte3.scale.y = st.k; }
    }
  }
}
