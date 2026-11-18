'use strict';
/* ================= Toit : décor vivant (fenêtres, bord du toit, barricade) ================= */
// Purement visuel : aucun chiffre de jeu, aucune collision, aucune cible de tir (fire() ne vise que hitMeshes).
// 1. Fenêtres : les façades n'ont plus de fenêtres allumées peintes dans la texture (js/03-scene.js, LIT = 0) ;
//    ici, une seule géométrie fusionnée (1 appel de dessin) pose une vitre lumineuse sur chaque fenêtre des façades
//    tournées vers la rue. Couleur par sommet, mélange additif : une fenêtre éteinte est noire, donc invisible.
//    La nuit, au crépuscule et à l'aube, 5 à 12 % des fenêtres sont allumées ; de jour, presque rien. De temps en temps
//    une fenêtre s'allume, s'éteint, ou vacille (ampoule qui faiblit) ; quelques-unes sont des bougies ou une télé.
//    Reste aussi dans le robot (même rue, même coût).
// 2. Bord du toit et barricade (toit seulement, cachés quand un mode est actif) : surface du toit en goudron,
//    corniche, sacs de sable bombés en couches, caisse de munitions, bidon, sacs en tas, bout de cheminée, et des
//    pieux croisés devant la barricade. Tout en une géométrie fusionnée (1 appel de dessin) ; les 18 sacs d'origine
//    (18 appels) sont cachés pendant ce temps.
// 3. État de la barricade : sous 60 % de vie, des planches penchent ; sous 30 %, d'autres manquent et des poteaux
//    penchent. Revient comme avant quand elle est réparée.
// Branché par Jeu.on('monde') (rue bâtie) et Jeu.on('image') (chaque image). Tout est ajouté à `world` :
// disposeWorld (js/03-scene.js) libère géométries et matériaux à chaque nouvelle rue.

const TD_REGL = {
  fen: {
    nuit: { base:.03, parLit:.8, min:.05, max:.12 }, // part allumée la nuit : base + L.lit × parLit, bornée (ville abandonnée)
    crepuscule:.6,   // part du crépuscule et de l'aube : × part de nuit
    jour:.012,       // de jour : presque rien
    force: { nuit:.85, crepuscule:.7, jour:.38 }, // éclat d'une fenêtre allumée
    fondu:1.6,       // secondes pour s'allumer ou s'éteindre
    evt:[1.2, 3.6],  // secondes entre deux changements
    bougie:.25, tele:.12, // part des fenêtres allumées qui sont des bougies (vacillent doucement) ou une télé (bleue)
    vacille:.15,     // chance qu'un changement soit une ampoule qui vacille un moment
    maj:15,          // mises à jour des couleurs par seconde
    max:2400         // fenêtres au plus (au-delà, on en saute)
  },
  bar: { penche:.6, casse:.3 } // vie de la barricade (part) sous laquelle des planches penchent, puis manquent
};
const TD = { L:null, fen:null, deco:null, sacs:[], bar:null, etat:0, t:0, acc:0, evtT:0, hd:null, gr:1 };

/* ---------- Hasard propre (ne touche pas Math.random : les tests à graine restent pareils) ---------- */
const tdRnd = () => { TD.gr = (TD.gr * 16807) % 2147483647; return (TD.gr - 1) / 2147483646; };
const tdGraine = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 2147483646; TD.gr = h + 1; };
const tdHash = i => { const h = Math.sin(i * 12.9898 + 4.1414) * 43758.5453; return h - Math.floor(h); };

/* ---------- Moment de la journée (météo de js/22-ambiance.js) ---------- */
function tdMoment(){
  const nom = typeof AMB !== 'undefined' ? AMB.weather : 'clair';
  const W = (typeof WEATHERS !== 'undefined' && WEATHERS[nom]) || {};
  if (W.night) return 'nuit';
  if (TD.L && TD.L.id === 'banlieue') return (nom === 'soleil' || nom === 'canicule') ? 'crepuscule' : 'nuit'; // ville de nuit
  if (nom === 'coucher' || nom === 'aube' || W.storm) return 'crepuscule';
  return 'jour';
}
function tdPart(){
  const F = TD_REGL.fen, m = tdMoment(), lit = TD.L && TD.L.lit != null ? TD.L.lit : .08;
  const nuit = clamp(F.nuit.base + lit * F.nuit.parLit, F.nuit.min, F.nuit.max);
  return m === 'nuit' ? nuit : m === 'crepuscule' ? nuit * F.crepuscule : F.jour;
}

/* ---------- Fenêtres : relevé des emplacements sur les façades ---------- */
// La façade d'origine (facadeMat) : 128 x 256, fenêtres de 18 x 20 à x = 8 + 30 k et y = 10 + 32 r, répétée selon map.repeat.
// Chaque fenêtre devient 4 carreaux (les croisillons des styles restent sombres).
const TD_V = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
function tdFaces(o){
  const geo = o.geometry, idx = geo.index, pos = geo.attributes.position, uv = geo.attributes.uv, nor = geo.attributes.normal;
  if (!idx || !uv || !nor || !geo.groups.length) return [];
  const faces = [];
  geo.groups.forEach(g => {
    const vu = new Set(); for (let i = g.start; i < g.start + g.count; i++) vu.add(idx.array[i]);
    let a = -1, b = -1, c = -1;
    vu.forEach(v => { const s = uv.getX(v), t = uv.getY(v); if (s < .01 && t < .01) a = v; else if (s > .99 && t < .01) b = v; else if (s < .01 && t > .99) c = v; });
    if (a < 0 || b < 0 || c < 0) return;
    const n = new THREE.Vector3(nor.getX(a), nor.getY(a), nor.getZ(a)).transformDirection(o.matrixWorld);
    if (Math.abs(n.y) > .5) return;
    const A = new THREE.Vector3(pos.getX(a), pos.getY(a), pos.getZ(a)).applyMatrix4(o.matrixWorld);
    const B = new THREE.Vector3(pos.getX(b), pos.getY(b), pos.getZ(b)).applyMatrix4(o.matrixWorld);
    const C = new THREE.Vector3(pos.getX(c), pos.getY(c), pos.getZ(c)).applyMatrix4(o.matrixWorld);
    const ex = B.clone().sub(A), ey = C.clone().sub(A);
    const centre = A.clone().addScaledVector(ex, .5).addScaledVector(ey, .5);
    if (n.dot(EYE.clone().sub(centre)) <= 0 || ex.length() < 2) return; // seulement les faces tournées vers le toit
    faces.push({ A, ex, ey, n });
  });
  return faces;
}
function tdFenetres(L){
  const F = TD_REGL.fen, slots = [];
  world.updateMatrixWorld(true);
  world.traverse(o => {
    if (!o.isMesh || !o.geometry || o.geometry.type !== 'BoxGeometry' || Array.isArray(o.material)) return;
    const m = o.material, t = m && (m.map || m.emissiveMap);
    if (!m || !m.emissiveMap || !t) return; // façades seulement (facadeMat et ses versions des styles)
    const rx = t.repeat.x, ry = t.repeat.y;
    tdFaces(o).forEach(f => {
      for (let tx = 0; tx < Math.ceil(rx); tx++) for (let k = 0; k < 4; k++){
        const u0 = (tx + (8 + 30 * k) / 128) / rx, u1 = u0 + 18 / 128 / rx; if (u1 > 1) continue;
        for (let ty = 0; ty < Math.ceil(ry); ty++) for (let r = 0; r < 8; r++){
          const y0 = 10 + 32 * r, v0 = (ty + 1 - (y0 + 20) / 256) / ry, v1 = (ty + 1 - y0 / 256) / ry; if (v1 > 1) continue;
          slots.push([f, u0, u1, v0, v1]);
        }
      }
    });
  });
  // Trop de fenêtres : on en saute au hasard (même choix pour une même ville)
  let liste = slots;
  if (slots.length > F.max){ const p = F.max / slots.length; liste = slots.filter(() => tdRnd() < p).slice(0, F.max); }
  const n = liste.length; if (!n) return null;
  const NV = 16, P = new Float32Array(n * NV * 3), C = new Uint8Array(n * NV * 3), I = (n * NV > 65535) ? new Uint32Array(n * 24) : new Uint16Array(n * 24);
  const fen = [];
  // Carreaux : en pixels de la fenêtre (18 x 20, y vers le bas), croisillons de 1 pixel au milieu
  const CX = [[0, 8.5], [9.5, 18]], CY = [[0, 9.5], [10.5, 20]];
  liste.forEach((s, i) => {
    const f = s[0], du = s[2] - s[1], dv = s[4] - s[3];
    let q = 0;
    CY.forEach(cy => CX.forEach(cx => {
      const ua = s[1] + du * cx[0] / 18, ub = s[1] + du * cx[1] / 18, vb = s[4] - dv * cy[0] / 20, va = s[4] - dv * cy[1] / 20;
      const coins = [[ua, va], [ub, va], [ub, vb], [ua, vb]], base = i * NV + q * 4;
      coins.forEach((c, j) => {
        const v = TD_V[0].copy(f.A).addScaledVector(f.ex, c[0]).addScaledVector(f.ey, c[1]).addScaledVector(f.n, .035);
        P[(base + j) * 3] = v.x; P[(base + j) * 3 + 1] = v.y; P[(base + j) * 3 + 2] = v.z;
      });
      const o6 = i * 24 + q * 6; I[o6] = base; I[o6 + 1] = base + 1; I[o6 + 2] = base + 2; I[o6 + 3] = base; I[o6 + 4] = base + 2; I[o6 + 5] = base + 3;
      q++;
    }));
    const centre = f.A.clone().addScaledVector(f.ex, (s[1] + s[2]) / 2).addScaledVector(f.ey, (s[3] + s[4]) / 2);
    // Sorte : ampoule chaude (teinte de la ville), bougie (plus orange) ou télé (bleutée)
    const r = tdRnd(), sorte = r < F.tele ? 'tele' : r < F.tele + F.bougie ? 'bougie' : 'lampe';
    const w = new THREE.Color(L.win || '#ffb35a'), chaud = new THREE.Color(1, .62 + tdRnd() * .18, .28 + tdRnd() * .16);
    const col = sorte === 'tele' ? new THREE.Color(.55, .7, 1) : sorte === 'bougie' ? new THREE.Color(1, .55, .2) : w.lerp(chaud, .5);
    fen.push({ i, x:centre.x, y:centre.y, z:centre.z, col:[col.r, col.g, col.b], sorte, ph:tdRnd() * 50, lvl:0, cible:0, vac:0, b:0 });
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(C, 3, true));
  geo.setIndex(new THREE.BufferAttribute(I, 1));
  geo.computeBoundingSphere();
  const mat = new THREE.MeshBasicMaterial({ vertexColors:true, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false,
    polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 });
  const mesh = new THREE.Mesh(geo, mat); mesh.name = 'toitFenetres'; mesh.renderOrder = 1;
  world.add(mesh);
  const o = { mesh, col:geo.attributes.color, fen, actifs:new Set(), allumees:0 };
  // Au départ : la bonne part déjà allumée, sans fondu
  const N = Math.round(tdPart() * n);
  for (let k = 0; k < N; k++){ const w = fen[Math.floor(tdRnd() * n)]; if (!w.cible){ w.cible = 1; w.lvl = 1; o.allumees++; o.actifs.add(w); } }
  return o;
}

/* ---------- Fenêtres : allumer, éteindre, vaciller ---------- */
function tdAuHasard(o, allumee){
  for (let essai = 0; essai < 30; essai++){ const w = o.fen[Math.floor(tdRnd() * o.fen.length)]; if (!!w.cible === allumee) return w; }
  return null;
}
function tdBascule(o, w, on){ if (!w || !!w.cible === on) return; w.cible = on ? 1 : 0; o.allumees += on ? 1 : -1; o.actifs.add(w); }
function tdEvenement(o){
  const F = TD_REGL.fen, N = Math.round(tdPart() * o.fen.length), ecart = N - o.allumees;
  const k = Math.max(1, Math.ceil(Math.abs(ecart) / 6));
  for (let j = 0; j < k; j++){
    if (o.allumees < N) tdBascule(o, tdAuHasard(o, false), true);
    else if (o.allumees > N) tdBascule(o, tdAuHasard(o, true), false);
    else if (tdRnd() < F.vacille){ const w = tdAuHasard(o, true); if (w){ w.vac = 1 + tdRnd() * 1.5; o.actifs.add(w); } }
    else if (o.allumees > 0){ tdBascule(o, tdAuHasard(o, true), false); tdBascule(o, tdAuHasard(o, false), true); }
  }
  return Math.abs(ecart) > 8 ? .35 : F.evt[0] + tdRnd() * (F.evt[1] - F.evt[0]); // la nuit qui tombe : rattrape plus vite
}
function tdFenetresPas(o, dt){
  const F = TD_REGL.fen;
  TD.evtT -= dt; if (TD.evtT <= 0) TD.evtT = tdEvenement(o);
  const m = tdMoment(), force = F.force[m] || .5, t = TD.t;
  const fog = scene.fog, near = fog ? fog.near : 1e3, far = fog ? Math.max(fog.near + 1, fog.far) : 2e3, cp = camera.position;
  const hd = typeof styleHD === 'function' && typeof styleToit === 'function' && styleHD() && styleToit(); // couleurs linéaires en Haute définition
  const arr = o.col.array; let change = false;
  if (hd !== TD.hd){ TD.hd = hd; o.fen.forEach(w => { if (w.lvl > 0) { w.b = -1; o.actifs.add(w); } }); }
  o.actifs.forEach(w => {
    if (w.lvl !== w.cible){ w.lvl = w.cible ? Math.min(1, w.lvl + dt / F.fondu) : Math.max(0, w.lvl - dt / F.fondu); }
    let fl = 1;
    if (w.sorte === 'bougie') fl = .78 + .14 * Math.sin(t * 7.3 + w.ph) + .08 * Math.sin(t * 17.1 + w.ph * 2);
    else if (w.sorte === 'tele') fl = .55 + .45 * (.5 + .5 * Math.sin(t * 2.3 + w.ph)) * (.5 + .5 * Math.sin(t * 5.9 + w.ph * 1.7));
    if (w.vac > 0){ w.vac -= dt; fl *= Math.sin(t * 29 + w.ph) > .1 ? 1 : .12; }
    const d = Math.hypot(w.x - cp.x, w.y - cp.y, w.z - cp.z), brume = 1 - clamp((d - near) / (far - near), 0, 1);
    const b = w.lvl * force * fl * brume;
    if (Math.abs(b - w.b) > .004){
      w.b = b; change = true;
      let r = w.col[0], g = w.col[1], bl = w.col[2];
      if (hd){ r = Math.pow(r, 2.2); g = Math.pow(g, 2.2); bl = Math.pow(bl, 2.2); }
      const R = clamp(r * b * 255, 0, 255) | 0, G = clamp(g * b * 255, 0, 255) | 0, B = clamp(bl * b * 255, 0, 255) | 0;
      for (let v = w.i * 48, fin = v + 48; v < fin; v += 3){ arr[v] = R; arr[v + 1] = G; arr[v + 2] = B; }
    }
    if (w.lvl === 0 && w.cible === 0 && w.vac <= 0 && w.b === 0) o.actifs.delete(w);
  });
  if (change) o.col.needsUpdate = true;
}

/* ---------- Bord du toit, objets de toit et pieux : une seule géométrie à couleurs par sommet ---------- */
const TD_C = new THREE.Color();
function tdPousse(list, g, col, vari, x, y, z, rx, ry, rz){
  const ng = g.index ? g.toNonIndexed() : g; if (ng !== g) g.dispose();
  if (rx) ng.rotateX(rx); if (rz) ng.rotateZ(rz); if (ry) ng.rotateY(ry);
  ng.translate(x, y, z); ng.computeVertexNormals();
  const n = ng.attributes.position.count, C = new Float32Array(n * 3);
  for (let f = 0; f < n; f += 3){
    const k = 1 + (tdRnd() - .5) * (vari || 0); TD_C.setHex(col);
    for (let j = 0; j < 3 && f + j < n; j++){ C[(f + j) * 3] = TD_C.r * k; C[(f + j) * 3 + 1] = TD_C.g * k; C[(f + j) * 3 + 2] = TD_C.b * k; }
  }
  ng.setAttribute('color', new THREE.BufferAttribute(C, 3));
  if (ng.attributes.uv) ng.deleteAttribute('uv');
  list.push(ng);
}
const tdBoite = (list, w, h, d, col, vari, x, y, z, rx, ry, rz) => tdPousse(list, new THREE.BoxGeometry(w, h, d), col, vari, x, y, z, rx, ry, rz);
// Sac de sable bombé : boîte subdivisée, pincée aux bords
function tdSac(list, x, y, z, ry, col){
  const w = .7, h = .27, d = .4, g = new THREE.BoxGeometry(w, h, d, 3, 1, 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++){
    const ax = Math.abs(p.getX(i)) / (w / 2), az = Math.abs(p.getZ(i)) / (d / 2), e = Math.max(ax, az);
    p.setY(i, p.getY(i) * (1 - .5 * e * e));
    p.setX(i, p.getX(i) * (1 - .1 * Math.abs(p.getY(i)) / (h / 2)));
  }
  tdPousse(list, g, col, .22, x, y, z, 0, ry, (tdRnd() - .5) * .06);
}
function tdDecor(L){
  const list = [], sable = [0x7d6c4a, 0x6c5e42, 0x8a7a58, 0x746448, 0x5f553e];
  // Surface du toit : goudron et gravier (cache le dessus de l'immeuble, qui avait des fenêtres)
  tdPousse(list, new THREE.PlaneGeometry(30, 24, 15, 12), 0x3a3631, .3, 0, 8.61, 8.1, -Math.PI / 2, 0, 0);
  for (let i = 0; i < 7; i++) tdBoite(list, .6 + tdRnd() * 1.4, .012, .5 + tdRnd() * 1.2, 0x2a2724, .1, -8 + tdRnd() * 16, 8.615, -2.6 + tdRnd() * 6, 0, tdRnd() * 3, 0); // rapiéçages
  // Corniche : bande claire au haut de la façade, chaperon du muret (rien ne dépasse la ligne vers le pied de la barricade)
  tdBoite(list, 30.3, .3, .2, 0x8e8a80, .08, 0, 8.45, -3.92);
  tdBoite(list, 30.3, .05, .3, 0x9d988c, .08, 0, 8.635, -3.83);
  tdBoite(list, 30.3, .04, .04, 0x24201c, 0, 0, 8.28, -4.02); // ombre sous la corniche
  // Sacs de sable : une rangée devant (même hauteur qu'avant au centre), deux couches et une rangée derrière sur les côtés
  for (let x = -6; x <= 6.01; x += .66) tdSac(list, x + (tdRnd() - .5) * .08, 8.74, -3.76, (tdRnd() - .5) * .22, sable[Math.floor(tdRnd() * 5)]);
  [-1, 1].forEach(sd => {
    for (let x = 2.1; x <= 5.6; x += .66) tdSac(list, sd * x + (tdRnd() - .5) * .08, 8.97, -3.72, (tdRnd() - .5) * .3, sable[Math.floor(tdRnd() * 5)]);
    for (let x = 2.4; x <= 5.2; x += .66) tdSac(list, sd * x, 8.74, -3.34, (tdRnd() - .5) * .3, sable[Math.floor(tdRnd() * 5)]);
  });
  tdSac(list, 1.75, 8.74, -3.36, .9, sable[Math.floor(tdRnd() * 5)]); // un sac de travers au bout, à droite
  // À gauche : caisse de munitions (vert armée, couvercle, bande jaune), chargeurs dessus, bidon rouge
  const cx = -1.25, cz = -3.36, cr = .2, cs = Math.cos(cr), sn = Math.sin(cr), loc = (lx, lz) => [cx + lx * cs + lz * sn, cz - lx * sn + lz * cs];
  tdBoite(list, .78, .34, .42, 0x4b5530, .1, cx, 8.78, cz, 0, cr, 0);
  tdBoite(list, .82, .05, .45, 0x3a4226, .06, cx, 8.97, cz, 0, cr, 0);
  let p = loc(.22, 0); tdBoite(list, .12, .345, .43, 0x9a8a2a, .05, p[0], 8.78, p[1], 0, cr, 0);
  for (let i = 0; i < 3; i++){ p = loc(-.2 + i * .1, .05); tdBoite(list, .05, .17, .1, 0x26282b, .1, p[0], 9.08, p[1], (tdRnd() - .5) * .3, cr, (tdRnd() - .5) * .3); }
  tdBoite(list, .32, .42, .16, 0x8a2a1e, .08, -1.95, 8.82, -3.05, 0, .5, 0);
  tdBoite(list, .14, .05, .05, 0x5a1a14, 0, -1.95, 9.06, -3.05, 0, .5, 0);
  // À droite, au bout des sacs : bout de cheminée en briques avec son chapeau
  tdBoite(list, .7, .9, .7, 0x6a3a2a, .14, 6.8, 9.05, -3.4);
  tdBoite(list, .86, .08, .86, 0x5a5a56, .06, 6.8, 9.54, -3.4);
  tdBoite(list, .4, .02, .4, 0x0e0c0b, 0, 6.8, 9.585, -3.4);
  // Pieux croisés devant la barricade (bois neuf, plus clair : la ligne se lit de loin)
  for (let x = -11.7; x <= 11.71; x += 2.6){
    const z = BAR_Z - .6, j = (tdRnd() - .5) * .3;
    tdBoite(list, .1, 2.4, .1, 0x9a7646, .16, x - .1, 1.0, z, -.38, 0, .5 + j);
    tdBoite(list, .1, 2.4, .1, 0x8a6a40, .16, x + .1, 1.0, z, -.38, 0, -.5 + j);
    tdBoite(list, 1.4, .09, .09, 0x7a5a36, .12, x, .7, z + .15, 0, 0, (tdRnd() - .5) * .2);
  }
  const geo = treeMerge(list); // même fusion que les arbres (js/03-scene.js)
  const base = geo.attributes.color.array.slice();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors:true }));
  mesh.name = 'toitDecor'; world.add(mesh);
  mesh.userData.base = base;
  return mesh;
}
// Haute définition : couleurs par sommet passées en linéaire (sinon tout paraît délavé)
function tdDecorHD(on){
  const m = TD.deco; if (!m || m.userData.hd === on) return;
  const a = m.geometry.attributes.color, b = m.userData.base;
  for (let i = 0; i < b.length; i++) a.array[i] = on ? Math.pow(b[i], 2.2) : b[i];
  a.needsUpdate = true; m.userData.hd = on;
}

/* ---------- Barricade : planches qui penchent puis manquent ---------- */
function tdBarricadeLire(){
  const g = world && world.children.find(o => o.userData && o.userData.barricade);
  if (!g) return null;
  const planches = [], poteaux = [];
  g.children.forEach(o => {
    const p = o.geometry && o.geometry.parameters; if (!p) return;
    const r = { o, y:o.position.y, rz:o.rotation.z, h:tdHash(planches.length + poteaux.length * 7 + 1) };
    if (Math.abs(p.width - 3.6) < .01) planches.push(r); else if (Math.abs(p.height - 1.6) < .01) poteaux.push(r);
  });
  return { planches, poteaux };
}
function tdBarricadeEtat(frac){
  const B = TD.bar; if (!B) return;
  const R = TD_REGL.bar, e = frac < R.casse ? 2 : frac < R.penche ? 1 : 0;
  if (e === TD.etat) return;
  TD.etat = e;
  B.planches.forEach(r => {
    const o = r.o, penche = e >= 1 && (r.h < .4 || (e === 2 && r.h < .7)), manque = e === 2 && r.h < .3;
    o.visible = !manque;
    o.rotation.z = penche ? r.rz + (r.h * 10 % 1 < .5 ? .6 : -.6) : r.rz;
    o.position.y = penche ? r.y - .14 : r.y;
  });
  B.poteaux.forEach(r => { r.o.rotation.z = e === 2 && r.h < .45 ? (r.h < .22 ? .2 : -.2) : r.rz; });
}

/* ---------- Nouvelle rue ---------- */
function tdMonde(L){
  TD.L = L; TD.fen = null; TD.deco = null; TD.bar = null; TD.etat = 0; TD.hd = null; TD.evtT = 1;
  if (!world) return;
  tdGraine((L && L.id) || 'rue');
  try { TD.fen = tdFenetres(L); } catch (e) { errNote(e); }
  try { TD.deco = tdDecor(L); } catch (e) { errNote(e); }
  try { TD.bar = tdBarricadeLire(); } catch (e) { errNote(e); }
  // Les 18 sacs d'origine (un appel de dessin chacun) : remplacés par les sacs fusionnés sur le toit
  TD.sacs = [];
  world.children.forEach(o => { if (o.isMesh && o !== TD.deco && Math.abs(o.position.y - 8.74) < .01 && Math.abs(o.position.z + 3.75) < .01 && Math.abs(o.position.x) < 6.5) TD.sacs.push(o); });
  tdImage(0);
}
function tdImage(dt){
  if (!world) return;
  TD.t += dt || 0;
  const toit = !Jeu.actif();
  if (TD.deco){ TD.deco.visible = toit; tdDecorHD(!!(toit && typeof styleHD === 'function' && styleHD() && typeof styleToit === 'function' && styleToit())); }
  if (TD.deco) TD.sacs.forEach(o => { o.visible = !toit; });
  tdBarricadeEtat(toit && typeof S !== 'undefined' && S && S.barMax > 0 ? S.bar / S.barMax : 1);
  const o = TD.fen; if (!o) return;
  o.mesh.castShadow = false; o.mesh.receiveShadow = false; // les styles mettent des ombres partout : pas aux vitres
  TD.acc += dt || 0;
  if (TD.acc < 1 / TD_REGL.fen.maj && dt) return;
  const pas = TD.acc; TD.acc = 0;
  tdFenetresPas(o, Math.min(pas, .5));
}
Jeu.on('monde', L => tdMonde(L));
Jeu.on('image', dt => tdImage(dt));
// La rue du titre est déjà bâtie (js/15-boucle.js) : on la décore tout de suite
try { if (typeof curLoc !== 'undefined' && curLoc && world && !TD.L) tdMonde(curLoc); } catch (e) { errNote(e); }

// Accès pour les tests automatiques et les captures (avance : fait passer le temps des fenêtres d'un coup)
window.__toitDecor = { TD, TD_REGL, tdMoment, tdPart, tdMonde, tdBarricadeEtat,
  avance(s){ for (let t = 0; t < s; t += .1){ TD.t += .1; if (TD.fen) tdFenetresPas(TD.fen, .1); } } };
