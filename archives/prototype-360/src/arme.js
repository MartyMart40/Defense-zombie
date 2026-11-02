// Arme : modèle visible, tir automatique, éclair de bouche, traçante et recul.
Jeu.arme = (function () {
  const { scene, camera } = Jeu.scene;
  const rayon = new THREE.Raycaster();
  const centre = new THREE.Vector2(0, 0);
  const etat = { cadence: 8, degats: 25, enfonce: false, attente: 0, recul: 0 };

  // Modèle simple de mitraillette attaché à la caméra.
  const modele = new THREE.Group();
  const matNoir = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const matBois = new THREE.MeshLambertMaterial({ color: 0x5a3a1e });
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.45), matNoir);
  const canon = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.35, 8), matNoir);
  canon.rotation.x = Math.PI / 2; canon.position.set(0, 0.02, -0.38);
  const crosse = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.22), matBois);
  crosse.position.set(0, -0.03, 0.3);
  const poignee = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.06), matBois);
  poignee.position.set(0, -0.1, 0.08); poignee.rotation.x = 0.3;
  const chargeur = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.06), matNoir);
  chargeur.position.set(0, -0.12, -0.08);
  modele.add(corps, canon, crosse, poignee, chargeur);
  const basePos = new THREE.Vector3(0.22, -0.22, -0.5);
  modele.position.copy(basePos);
  camera.add(modele);

  // Éclair de bouche.
  const eclair = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffcc55 })
  );
  eclair.position.set(0, 0.02, -0.58);
  eclair.visible = false;
  modele.add(eclair);
  const lumiere = new THREE.PointLight(0xffaa33, 0, 8);
  lumiere.position.set(0, 0.02, -0.6);
  modele.add(lumiere);

  // Traçantes.
  const tracantes = [];
  const matTrace = new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9 });

  addEventListener('mousedown', (e) => { if (e.button === 0) etat.enfonce = true; });
  addEventListener('mouseup', (e) => { if (e.button === 0) etat.enfonce = false; });

  function tirer() {
    rayon.setFromCamera(centre, camera);
    const touches = rayon.intersectObjects(Jeu.zombies.cibles(), true);
    const depart = new THREE.Vector3();
    eclair.getWorldPosition(depart);
    const fin = touches.length
      ? touches[0].point
      : rayon.ray.origin.clone().add(rayon.ray.direction.clone().multiplyScalar(80));
    if (touches.length) Jeu.zombies.toucher(touches[0].object, etat.degats);

    const geo = new THREE.BufferGeometry().setFromPoints([depart, fin]);
    const ligne = new THREE.Line(geo, matTrace);
    ligne.userData.vie = 0.05;
    scene.add(ligne);
    tracantes.push(ligne);

    eclair.visible = true;
    lumiere.intensity = 3;
    etat.recul = 1;
  }

  function maj(dt) {
    etat.attente -= dt;
    if (etat.enfonce && Jeu.joueur.etat.verrouille && etat.attente <= 0) {
      tirer();
      etat.attente = 1 / etat.cadence;
    } else if (etat.attente < 1 / etat.cadence - 0.04) {
      eclair.visible = false;
      lumiere.intensity = 0;
    }
    etat.recul = Math.max(0, etat.recul - dt * 12);
    modele.position.set(basePos.x, basePos.y + etat.recul * 0.01, basePos.z + etat.recul * 0.05);
    modele.rotation.x = etat.recul * 0.08;

    for (const l of [...tracantes]) {
      l.userData.vie -= dt;
      if (l.userData.vie <= 0) {
        scene.remove(l); l.geometry.dispose();
        tracantes.splice(tracantes.indexOf(l), 1);
      }
    }
  }

  return { etat, maj };
})();
