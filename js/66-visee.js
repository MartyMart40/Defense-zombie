'use strict';
/* ================= Visée du toit : optiques, zoom et cadre de lunette (tâche 104) ================= */
// Règle (docs/conception.md, « Visée ») :
//   - lunette (la lunette d'origine du sniper, ou la lunette ×4 achetée) : vrai cadre de lunette, l'arme disparaît,
//     zoom net (×4 pour la lunette ×4) ;
//   - point rouge : rapproche un peu plus que les mires, on vise par le point rouge ;
//   - sans optique : rapproche un peu en alignant les mires (jamais plus que ×1,67, jamais moins que ×1,1).
// Avant : la lunette ×4 n'avait pas de cadre. On voyait le tube de la lunette en 3D devant l'œil, avec un petit trou
// au milieu (moins de 5 % de l'écran), et le zoom restait celui de l'arme × 0,55 (×3,2 au laser, ×2,5 au fusil d'assaut).
// Le zoom touche la jouabilité : chiffres dans VISEE, mesurés par tests/t-visee.js.
const VISEE = {
  lunette: 4,      // lunette ×4 : champ de vision divisé par 4
  point: .88,      // point rouge : champ des mires × 0,88
  miresMin: .6,    // sans optique : champ au moins 60 % du champ au repos (×1,67 au plus)
  miresMax: .9,    // sans optique : champ au plus 90 % du champ au repos (rapproche toujours un peu)
  cadre: .85       // le cadre de lunette apparaît quand l'arme est à 85 % du chemin vers l'œil
};
const visAcc = (id, k) => typeof accOwned === 'function' && accOwned(id, k);
// Optique de l'arme : 'origine' (lunette du sniper), 'lunette' (×4), 'point' (point rouge) ou 'mires'
function viseeOptique(id){
  if (!id || !WEAPONS[id]) return 'mires';
  if (id === 'sniper') return 'origine';
  if (visAcc(id, 'scope')) return 'lunette';
  if (visAcc(id, 'reddot')) return 'point';
  return 'mires';
}
// Champ de vision en visée divisé par le champ au repos (plus petit = plus de zoom)
function viseeK(id){
  const W = WEAPONS[id]; if (!W) return 1;
  const o = viseeOptique(id), base = (W.zoomFov || 56) / 70;
  if (o === 'origine') return base;
  if (o === 'lunette') return 1 / VISEE.lunette;
  const m = clamp(base, VISEE.miresMin, VISEE.miresMax);
  return o === 'point' ? m * VISEE.point : m;
}
// Champ visé par la caméra cette image (15-boucle.js)
function viseeFov(){
  if (!(zoomed && state === 'playing' && S)) return baseFov;
  return baseFov * viseeK(S.cur);
}
// Une lunette est à l'œil : cadre noir, arme cachée, pas de flou de profondeur (60-graphismes-zombies.js)
function viseeLunette(){
  if (!S || state !== 'playing' || ads <= VISEE.cadre) return false;
  const o = viseeOptique(S.cur); return o === 'origine' || o === 'lunette';
}
// Cadre de lunette (#scope) : réticule fin du sniper, réticule ×4 avec point rouge et graduations pour la lunette ×4
function viseeHUD(){
  const sc = $('scope'); if (!sc) return;
  const on = viseeLunette(), x4 = on && viseeOptique(S.cur) === 'lunette';
  if (VISEE._on !== on){ VISEE._on = on; sc.classList.toggle('on', on); }
  if (VISEE._x4 !== x4){ VISEE._x4 = x4; sc.classList.toggle('x4', x4); }
}

window.__visee = { VISEE, viseeOptique, viseeK, viseeFov, viseeLunette };
