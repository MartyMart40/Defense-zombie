// Boucle principale et menus (début, pause, fin de partie).
(function () {
  const { scene, camera, renderer } = Jeu.scene;
  const ecran = document.getElementById('ecran');
  const titre = document.getElementById('ecran-titre');
  const texte = document.getElementById('ecran-texte');
  const btnJouer = document.getElementById('btn-jouer');
  const btnRecommencer = document.getElementById('btn-recommencer');
  let enJeu = false, dernier = performance.now();

  function nouvellePartie() {
    Jeu.zombies.vider();
    Jeu.joueur.reinitialiser();
    Jeu.zombies.demarrerVague(1);
    enJeu = true;
    Jeu.joueur.verrouiller();
  }

  function menu(t, msg, txtBouton, montrerRecommencer) {
    titre.textContent = t;
    texte.textContent = msg;
    btnJouer.textContent = txtBouton;
    btnRecommencer.style.display = montrerRecommencer ? 'inline-block' : 'none';
    ecran.style.display = 'flex';
  }

  btnJouer.addEventListener('click', () => { if (enJeu) Jeu.joueur.verrouiller(); else nouvellePartie(); });
  btnRecommencer.addEventListener('click', nouvellePartie);

  document.addEventListener('pointerlockchange', () => {
    if (Jeu.joueur.etat.verrouille) { ecran.style.display = 'none'; return; }
    if (enJeu) menu('Pause', 'Échap pour libérer la souris.', 'Reprendre', true);
  });

  function boucle(t) {
    const dt = Math.min(0.05, (t - dernier) / 1000);
    dernier = t;
    if (enJeu && Jeu.joueur.etat.verrouille) {
      Jeu.arme.maj(dt);
      Jeu.zombies.maj(dt);
      if (Jeu.joueur.etat.vie <= 0) {
        enJeu = false;
        document.exitPointerLock();
        menu('Partie terminée', `Vague ${Jeu.zombies.etat.vague}, ${Jeu.zombies.etat.tues} zombies tués.`, 'Rejouer', false);
      }
    }
    Jeu.hud.maj();
    renderer.render(scene, camera);
    requestAnimationFrame(boucle);
  }

  menu('Défense Zombie', 'Souris : viser · Clic gauche maintenu : tirer · Échap : pause', 'Jouer', false);
  requestAnimationFrame(boucle);
})();
