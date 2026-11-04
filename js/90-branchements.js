'use strict';
/* ================= Branchements des modes sur le jeu commun ================= */
// Chargé en DERNIER. C'est le seul endroit où le registre Jeu (js/00-base.js) est branché sur les fonctions communes.
// Les modes (robot, RTS, et les prochains : js/50-..., js/60-...) s'inscrivent avec Jeu.mode(...) et Jeu.on(...),
// sans remplacer visuals, kill ou ambMusicState eux-mêmes. Voir docs/architecture.md.
// Ces branchements enveloppent tous les autres crochets (fichiers 04 à 44), donc :
//   etape(dt) du mode actif passe avant tout le rendu commun, image(dt) passe après tout le reste.

// Chaque image : etape du mode actif (dans son état de jeu), rendu commun, puis image du mode et l'événement 'image'
try {
  const _b = visuals;
  visuals = function(dt){
    const m = Jeu.actif();
    if (m && m.etape && state === m.etats.jeu) m.etape(dt);
    const r = _b.apply(this, arguments);
    if (m && m.image) m.image(dt);
    Jeu.emit('image', dt);
    return r;
  };
} catch (e) {}

// Zombie tué : le mode actif est prévenu, puis l'événement 'tue' (z, etaitVivant)
try {
  const _b = kill;
  kill = function(z){
    const was = !!z && !z.dead;
    const r = _b.apply(this, arguments);
    const m = Jeu.actif();
    if (m && m.tue) m.tue(z, was);
    Jeu.emit('tue', z, was);
    return r;
  };
} catch (e) {}

// Musique : le mode actif choisit, sinon le jeu du toit choisit
try {
  if (typeof ambMusicState === 'function'){
    const _b = ambMusicState;
    ambMusicState = function(){
      const m = Jeu.actif();
      if (m && m.musique){ const v = m.musique(); if (v) return v; }
      return _b.apply(this, arguments);
    };
  }
} catch (e) {}

// Accès pour les tests automatiques
window.__jeu = Jeu;
