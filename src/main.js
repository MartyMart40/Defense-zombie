// Boucle principale et gestion des écrans (début, fin de partie).
(function () {
  const { scene, camera, renderer } = Jeu.scene;
  const ecran = document.getElementById('ecran');
  const texte = document.getElementById('ecran-texte');
  let enJeu = false, dernier = performance.now();

  function nouvellePartie() {
    Jeu.zombies.vider();
    Jeu.joueur.reinitialiser();
    Jeu.zombies.demarrerVague(1);
    enJeu = true;
  }

  ecran.addEventListener('click', () => {
    if (!enJeu) nouvellePartie();
    Jeu.joueur.verrouiller();
  });
  document.addEventListener('pointerlockchange', () => {
    ecran.style.display = Jeu.joueur.etat.verrouille ? 'none' : 'flex';
    if (enJeu && !Jeu.joueur.etat.verrouille) texte.textContent = 'Pause. Cliquer pour continuer';
  });

  function boucle(t) {
    const dt = Math.min(0.05, (t - dernier) / 1000);
    dernier = t;
    if (enJeu && Jeu.joueur.etat.verrouille) {
      Jeu.arme.maj(dt);
      Jeu.zombies.maj(dt);
      if (Jeu.joueur.etat.vie <= 0) {
        enJeu = false;
        texte.textContent = `Partie terminée : vague ${Jeu.zombies.etat.vague}, ${Jeu.zombies.etat.tues} tués. Cliquer pour rejouer`;
        document.exitPointerLock();
      }
    }
    Jeu.hud.maj();
    renderer.render(scene, camera);
    requestAnimationFrame(boucle);
  }
  requestAnimationFrame(boucle);
})();
