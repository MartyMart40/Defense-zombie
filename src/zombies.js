// Zombies : apparition en cercle autour du joueur, marche vers le centre, attaque au contact.
Jeu.zombies = (function () {
  const { scene } = Jeu.scene;
  const liste = [];
  const geo = new THREE.BoxGeometry(0.8, 1.8, 0.5);
  const etat = { tues: 0, vague: 1, restantsAApparaitre: 0, minuterie: 0 };

  function creer() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 35 + Math.random() * 10;
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x5f7f3a }));
    mesh.position.set(Math.cos(angle) * dist, 0.9, Math.sin(angle) * dist);
    mesh.userData = { vie: 50, vitesse: 1.5 + etat.vague * 0.2 + Math.random() * 0.5 };
    scene.add(mesh);
    liste.push(mesh);
  }

  function demarrerVague(n) {
    etat.vague = n;
    etat.restantsAApparaitre = 5 + n * 3;
  }

  function toucher(mesh, degats) {
    mesh.userData.vie -= degats;
    mesh.material.color.setHex(0xaa3333);
    setTimeout(() => mesh.material && mesh.material.color.setHex(0x5f7f3a), 60);
    if (mesh.userData.vie <= 0) retirer(mesh, true);
  }

  function retirer(mesh, tue) {
    scene.remove(mesh);
    mesh.material.dispose();
    liste.splice(liste.indexOf(mesh), 1);
    if (tue) etat.tues++;
  }

  function maj(dt) {
    etat.minuterie -= dt;
    if (etat.restantsAApparaitre > 0 && etat.minuterie <= 0) {
      creer();
      etat.restantsAApparaitre--;
      etat.minuterie = Math.max(0.3, 1.5 - etat.vague * 0.1);
    }
    for (const z of [...liste]) {
      const p = z.position;
      const d = Math.hypot(p.x, p.z);
      if (d < 1.2) { Jeu.joueur.blesser(10); retirer(z, false); continue; }
      p.x -= (p.x / d) * z.userData.vitesse * dt;
      p.z -= (p.z / d) * z.userData.vitesse * dt;
      z.lookAt(0, 0.9, 0);
    }
    if (etat.restantsAApparaitre === 0 && liste.length === 0) demarrerVague(etat.vague + 1);
  }

  function vider() { for (const z of [...liste]) retirer(z, false); etat.tues = 0; }

  return { etat, maj, toucher, demarrerVague, vider, cibles: () => liste };
})();
