// Joueur stationnaire : visée à la souris (pointer lock) et points de vie.
Jeu.joueur = (function () {
  const { camera, renderer } = Jeu.scene;
  let lacet = 0, tangage = 0;
  const etat = { vie: 100, vieMax: 100, verrouille: false };

  document.addEventListener('pointerlockchange', () => {
    etat.verrouille = document.pointerLockElement === renderer.domElement;
  });
  document.addEventListener('mousemove', (e) => {
    if (!etat.verrouille) return;
    lacet -= e.movementX * 0.002;
    tangage -= e.movementY * 0.002;
    tangage = Math.max(-1.4, Math.min(1.4, tangage));
    camera.rotation.set(tangage, lacet, 0, 'YXZ');
  });

  function verrouiller() { renderer.domElement.requestPointerLock(); }
  function blesser(degats) { etat.vie = Math.max(0, etat.vie - degats); }
  function reinitialiser() { etat.vie = etat.vieMax; }

  return { etat, verrouiller, blesser, reinitialiser };
})();
