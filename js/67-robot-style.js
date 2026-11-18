'use strict';
/* ================= Style graphique dans le mode robot (dossier 114) ================= */
// Le style Amélioré (js/57-graphismes.js) habille aussi la rue du robot : mêmes textures, vraies ombres du soleil,
// éclat et couleurs. La zone d'ombre qui suit le robot et le choix « Haute définition ou Ultra = Amélioré dans le robot »
// sont dans js/57. Ici, ce qui est propre au robot :
//   - les jambes (scène de la rue, js/40-robot-habitacle.js) projettent leur ombre sur la rue et en reçoivent ;
//     l'habitacle, les manettes et les bras sont dans la scène de l'arme en main, dessinée par-dessus sans effets ;
//   - le bouton « Style » dans la Pause du robot, qui dit en clair ce qu'on voit (ex. « Haute définition (Amélioré dans le robot) »).
// Purement visuel : aucun chiffre du robot ne change. Style Actuel : rien ne change.

const RSTY = { jambes:null };

// Jambes : ombres seulement quand le style tourne dans le robot (7 morceaux, coût négligeable)
function rstyJambes(on){
  if (typeof hbJ === 'undefined' || RSTY.jambes === on) return;
  RSTY.jambes = on;
  hbJ.traverse(o => { if (o.isMesh){ o.castShadow = on; o.receiveShadow = on; } });
}

// Bouton dans la Pause du robot (le panneau est refait à chaque pause : on le remet s'il manque), avant « Quitter le robot »
function rstyBouton(){
  if (typeof MECH === 'undefined' || !MECH.paused || typeof mechPanel === 'undefined' || mechPanel.classList.contains('hide') || $('mkStyle')) return;
  const bs = mechPanel.querySelector('.mk-btns'); if (!bs) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.id = 'mkStyle'; b.textContent = styleTexte();
  b.addEventListener('click', () => styleSuivant());
  bs.insertBefore(b, bs.lastElementChild);
}

Jeu.on('image', () => {
  try {
    rstyJambes(typeof styleIci === 'function' && styleIci() && styleRobot());
    rstyBouton();
  } catch (e) { errNote(e); }
});

// Accès pour les tests automatiques
window.__robotStyle = { RSTY, rstyJambes, rstyBouton };
