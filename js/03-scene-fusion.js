'use strict';
/* ================= Décor fusionné : moins d'appels de dessin, même image (dossier 120) ================= */
// buildWorld (js/03-scene.js) bâtit la rue pièce par pièce comme avant (même hasard, dans le même ordre), puis fusionMonde
// réunit les pièces marquées fixe() en une seule géométrie par matériau : un appel de dessin par matériau au lieu d'un par
// boîte. Les pièces gardent leurs matériaux (mêmes objets ou copies identiques réunies) : les styles (js/57 à js/61)
// remplacent les matériaux par matériau, ils habillent donc les pièces fusionnées comme avant.
// Règles pour un futur décor :
//   - fixe(m) seulement pour ce qui ne bouge pas, n'est pas une cible (hitMeshes) et n'est lu par personne d'autre.
//   - Une pièce fixe() doit avoir position, normal et uv (toutes les géométries de base de Three.js en ont).
//   - Ne pas marquer : façades (facadeMat, lues par js/68 pour les fenêtres), sol, trottoirs, gazon (js/57 lit leurs
//     dimensions), sacs de sable (js/68), cônes des feux (animés), tout ce qu'un autre fichier retrouve par sa position.
// Cas particuliers :
//   - Autos (userData.auto, js/59) : les 4 roues d'une auto deviennent un seul maillage, à la place de la 3e pièce (js/59
//     cache les pièces 2 à 5 en Haute définition : c'est alors ce maillage des roues qui est caché).
//   - Barricade (userData.barricade) : les blocs de béton sont fusionnés ; les planches et les poteaux que js/68 fait
//     pencher ou tomber (userData.bouge) restent des objets à part, mais passent sur la couche 1 (jamais dessinée) ;
//     une copie fusionnée par matériau, sur la couche 0, est refaite seulement quand l'une d'elles change (fusionSuivre,
//     appelée au début de chaque rendu de la scène). Les tests et js/68 voient donc les mêmes planches qu'avant.
//   - Têtes de lampadaires : le maillage fusionné est posé sur la première tête (js/22 y retrouve le matériau à allumer la
//     nuit) ; world.userData.tetes garde toutes les positions (halos de js/36).
//   - Tours de défense (js/17) : le pied de chaque tour (montants, plancher, sacs) est fusionné dans defRoot.
// FUSION.on = false : buildWorld bâtit la rue sans fusion (comparaison d'images et tests).
const FUSION = { on:true, bar:[], tri:0 };
// Three.js tire 4 nombres de Math.random pour l'identifiant (uuid) de chaque géométrie, matériau ou objet créé : la fusion
// ne doit pas décaler le hasard du jeu (tests à graine, simulateur). Pendant la fusion, Math.random est prêté à un
// générateur à part, puis remis tel quel : la suite des nombres du jeu est exactement celle d'avant le dossier 120.
let fusionS = 911;
const fusionHasard = () => { fusionS = fusionS * 16807 % 2147483647; return (fusionS - 1) / 2147483646; };
function fusionCalme(fn){ const R = Math.random; Math.random = fusionHasard; try { return fn(); } finally { Math.random = R; } }
const fixe = (m, bouge) => { m.userData.fixe = true; if (bouge) m.userData.bouge = true; return m; };
const _fM = new THREE.Matrix4(), _fI = new THREE.Matrix4();
// Signature d'un matériau : deux copies identiques (même couleur, mêmes réglages) donnent la même image et sont réunies
function fusionSig(m){
  return [m.type, m.color ? m.color.getHex() : '', m.emissive ? m.emissive.getHex() : '', m.map ? m.map.uuid : '', m.side, m.fog, m.transparent, m.opacity,
    m.vertexColors, m.depthWrite, m.blending, m.userData && m.userData.keep ? 1 : 0].join('|');
}
// Géométrie non indexée, placée par la matrice mat (copie : la géométrie d'origine n'est pas touchée)
function fusionPiece(geo, mat){
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.applyMatrix4(mat); return g;
}
// Réunit des pièces sous parent : un maillage par matériau, posé à la place de la première pièce.
// Les pièces sont retirées et leurs géométries libérées, sauf garder (géométrie partagée, ex. js/17). Rend les maillages créés.
function fusionPieces(pieces, parent, opt){
  opt = opt || {};
  const out = [], grp = new Map();
  parent.updateMatrixWorld(true);
  _fI.copy(parent.matrixWorld).invert();
  pieces.forEach(o => { const k = fusionSig(o.material); if (!grp.has(k)) grp.set(k, []); grp.get(k).push(o); });
  const fant = new Set();
  grp.forEach(list => {
    const mat = list[0].material, p0 = new THREE.Vector3().setFromMatrixPosition(_fM.multiplyMatrices(_fI, list[0].matrixWorld));
    const geos = list.map(o => {
      _fM.multiplyMatrices(_fI, o.matrixWorld); _fM.elements[12] -= p0.x; _fM.elements[13] -= p0.y; _fM.elements[14] -= p0.z;
      return fusionPiece(o.geometry, _fM);
    });
    const m = new THREE.Mesh(cFusion(geos), mat); m.position.copy(p0); m.userData.fusion = true;
    if (opt.index != null){ parent.children.splice(opt.index, 0, m); m.parent = parent; m.dispatchEvent({ type:'added' }); } else parent.add(m);
    out.push(m);
    list.forEach(o => {
      // Copie de matériau réunie à une autre : une pièce reste, cachée (fantôme), pour que les styles (js/57, js/58) voient
      // toujours le même nombre de matériaux et en fassent autant de copies (chacune tire son uuid dans Math.random)
      if (o.material !== mat && !fant.has(o.material)){ fant.add(o.material); o.visible = false; o.userData.fantome = true; return; }
      if (o.parent) o.parent.remove(o); if (!opt.garder) o.geometry.dispose();
    });
  });
  return out;
}
/* ---------- Barricade : copies fusionnées des planches et poteaux qui bougent ---------- */
function fusionBarricade(g){
  const bouge = g.children.filter(o => o.isMesh && o.userData.bouge);
  if (!bouge.length) return;
  const grp = new Map();
  bouge.forEach(o => { const k = fusionSig(o.material); if (!grp.has(k)) grp.set(k, []); grp.get(k).push(o); });
  grp.forEach(list => {
    const base = list.map(o => o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()); // sommets de chaque pièce, chez elle
    let n = 0; base.forEach(b => n += b.attributes.position.count);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const U = new Float32Array(n * 2); let o2 = 0; base.forEach(b => { U.set(b.attributes.uv.array, o2); o2 += b.attributes.uv.count * 2; });
    geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    const m = new THREE.Mesh(geo, list[0].material); m.position.copy(list[0].position); m.userData.fusion = true; m.userData.copie = true;
    g.add(m); m.updateMatrix();
    list.forEach(o => o.layers.set(1)); // l'original n'est plus dessiné (ni dans les ombres) : la copie le remplace
    FUSION.bar.push({ m, list, base, inv:new THREE.Matrix4().copy(m.matrix).invert(), etat:new Float64Array(list.length * 8).fill(NaN) });
  });
  fusionSuivre();
}
// Au début de chaque rendu de la scène : une pièce a bougé (js/68), sa copie est refaite. Sinon, rien.
const _fN = new THREE.Matrix3();
function fusionSuivre(){
  for (let b = 0; b < FUSION.bar.length; b++){
    const B = FUSION.bar[b], E = B.etat; let change = false;
    for (let i = 0; i < B.list.length; i++){
      const o = B.list[i], p = o.position, r = o.rotation, s = o.scale, k = i * 8, v = o.visible ? 1 : 0;
      if (E[k] !== v || E[k + 1] !== p.x || E[k + 2] !== p.y || E[k + 3] !== p.z || E[k + 4] !== r.x || E[k + 5] !== r.y || E[k + 6] !== r.z || E[k + 7] !== s.x * 7 + s.y * 3 + s.z){
        E[k] = v; E[k + 1] = p.x; E[k + 2] = p.y; E[k + 3] = p.z; E[k + 4] = r.x; E[k + 5] = r.y; E[k + 6] = r.z; E[k + 7] = s.x * 7 + s.y * 3 + s.z; change = true;
      }
    }
    if (!change) continue;
    const P = B.m.geometry.attributes.position, N = B.m.geometry.attributes.normal; let off = 0;
    for (let i = 0; i < B.list.length; i++){
      const o = B.list[i], bp = B.base[i].attributes.position.array, bn = B.base[i].attributes.normal.array, c = bp.length;
      if (!o.visible){ P.array.fill(0, off, off + c); N.array.fill(0, off, off + c); off += c; continue; } // tombée : triangles vides
      o.updateMatrix(); _fM.multiplyMatrices(B.inv, o.matrix); _fN.getNormalMatrix(_fM);
      const e = _fM.elements, q = _fN.elements;
      for (let j = 0; j < c; j += 3){
        const x = bp[j], y = bp[j + 1], z = bp[j + 2];
        P.array[off + j] = e[0] * x + e[4] * y + e[8] * z + e[12]; P.array[off + j + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; P.array[off + j + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
        const nx = bn[j], ny = bn[j + 1], nz = bn[j + 2];
        let a = q[0] * nx + q[3] * ny + q[6] * nz, bb = q[1] * nx + q[4] * ny + q[7] * nz, cc = q[2] * nx + q[5] * ny + q[8] * nz; const l = Math.hypot(a, bb, cc) || 1;
        N.array[off + j] = a / l; N.array[off + j + 1] = bb / l; N.array[off + j + 2] = cc / l;
      }
      off += c;
    }
    P.needsUpdate = true; N.needsUpdate = true; B.m.geometry.computeBoundingSphere();
  }
}
scene.onBeforeRender = function(){ try { if (FUSION.bar.length) fusionSuivre(); } catch (e) { errNote(e); } };
/* ---------- La rue ---------- */
// Fin de buildWorld, avant Jeu.emit('monde') (les styles habillent ensuite les maillages fusionnés)
function fusionMonde(){ fusionCalme(fusionMondeIci); }
function fusionMondeIci(){
  FUSION.bar.forEach(B => B.base.forEach(g => g.dispose())); FUSION.bar = [];
  if (!world) return;
  const libres = [], autos = [], bars = [];
  world.traverse(o => { if (o.userData.auto) autos.push(o); else if (o.userData.barricade) bars.push(o); });
  // Autos : roues réunies, à la place de la 3e pièce
  autos.forEach(g => { const r = g.children.filter(o => o.isMesh && o.userData.fixe); if (r.length > 1) fusionPieces(r, g, { index:2, racine:world }); });
  // Barricade : béton fusionné, planches et poteaux suivis
  bars.forEach(g => {
    const b = g.children.filter(o => o.isMesh && o.userData.fixe && !o.userData.bouge);
    if (b.length > 1) fusionPieces(b, g, { racine:world });
    fusionBarricade(g);
  });
  // Tout le reste de la rue : un maillage par matériau, ajouté à world
  world.traverse(o => { if (o.isMesh && o.userData.fixe && !o.userData.bouge && !o.userData.fusion) libres.push(o); });
  const vides = new Set(); libres.forEach(o => { if (o.parent !== world) vides.add(o.parent); });
  fusionPieces(libres, world, { racine:world });
  vides.forEach(g => { if (!g.children.length && g.parent) g.parent.remove(g); }); // groupes des toits devenus vides
}
