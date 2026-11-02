// Arme : tir automatique tant que le clic est enfoncé, par lancer de rayon.
Jeu.arme = (function () {
  const { camera } = Jeu.scene;
  const rayon = new THREE.Raycaster();
  const centre = new THREE.Vector2(0, 0);
  const etat = { cadence: 8, degats: 25, enfonce: false, attente: 0 };

  addEventListener('mousedown', (e) => { if (e.button === 0) etat.enfonce = true; });
  addEventListener('mouseup', (e) => { if (e.button === 0) etat.enfonce = false; });

  function tirer() {
    rayon.setFromCamera(centre, camera);
    const touches = rayon.intersectObjects(Jeu.zombies.cibles(), false);
    if (touches.length) Jeu.zombies.toucher(touches[0].object, etat.degats);
  }

  function maj(dt) {
    etat.attente -= dt;
    if (etat.enfonce && Jeu.joueur.etat.verrouille && etat.attente <= 0) {
      tirer();
      etat.attente = 1 / etat.cadence;
    }
  }

  return { etat, maj };
})();
