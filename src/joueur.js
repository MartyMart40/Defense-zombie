// Joueur stationnaire : visée à la souris (pointer lock), points de vie, flash rouge quand blessé.
Jeu.joueur = (function () {
  const { camera, renderer } = Jeu.scene;
  const flash = document.getElementById('blessure');
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
  function blesser(degats) {
    etat.vie = Math.max(0, etat.vie - degats);
    flash.style.opacity = 0.6;
    setTimeout(() => (flash.style.opacity = 0), 150);
  }
  function reinitialiser() { etat.vie = etat.vieMax; lacet = 0; tangage = 0; camera.rotation.set(0, 0, 0); }

  return { etat, verrouiller, blesser, reinitialiser };
})();
