// Zombies : silhouette humanoïde, apparition en cercle, marche vers le joueur, attaque au contact.
Jeu.zombies = (function () {
  const { scene } = Jeu.scene;
  const liste = [];
  const etat = { tues: 0, vague: 1, restantsAApparaitre: 0, minuterie: 0 };

  const geoCorps = new THREE.BoxGeometry(0.6, 0.8, 0.35);
  const geoTete = new THREE.BoxGeometry(0.38, 0.38, 0.38);
  const geoBras = new THREE.BoxGeometry(0.16, 0.16, 0.7);
  const geoJambe = new THREE.BoxGeometry(0.2, 0.85, 0.22);
  const geoOeil = new THREE.BoxGeometry(0.07, 0.05, 0.02);
  const matOeil = new THREE.MeshBasicMaterial({ color: 0xff2200 });
  const COUL_PEAU = 0x9fb58a, COUL_TOUCHE = 0xff3030;

  function creer() {
    const angle = Math.random() * Math.PI * 2;
    const dist = 28 + Math.random() * 8;
    const peau = new THREE.MeshLambertMaterial({ color: COUL_PEAU });
    const habit = new THREE.MeshLambertMaterial({ color: [0x4a3b5c, 0x5c3b3b, 0x3b4d5c][Math.floor(Math.random() * 3)] });

    const z = new THREE.Group();
    const corps = new THREE.Mesh(geoCorps, habit); corps.position.y = 1.25;
    const tete = new THREE.Mesh(geoTete, peau); tete.position.y = 1.85;
    const oeilG = new THREE.Mesh(geoOeil, matOeil); oeilG.position.set(-0.09, 1.9, 0.2);
    const oeilD = oeilG.clone(); oeilD.position.x = 0.09;
    const brasG = new THREE.Mesh(geoBras, peau); brasG.position.set(-0.38, 1.45, 0.3);
    const brasD = brasG.clone(); brasD.position.x = 0.38;
    const jambeG = new THREE.Mesh(geoJambe, habit); jambeG.position.set(-0.15, 0.43, 0);
    const jambeD = jambeG.clone(); jambeD.position.x = 0.15;
    z.add(corps, tete, oeilG, oeilD, brasG, brasD, jambeG, jambeD);

    z.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
    z.userData = {
      vie: 50, peau, jambeG, jambeD, brasG, brasD,
      vitesse: 1.6 + etat.vague * 0.2 + Math.random() * 0.6,
      phase: Math.random() * 6,
    };
    scene.add(z);
    liste.push(z);
  }

  function demarrerVague(n) {
    etat.vague = n;
    etat.restantsAApparaitre = 5 + n * 3;
    etat.minuterie = 0;
  }

  function racine(obj) {
    while (obj && !liste.includes(obj)) obj = obj.parent;
    return obj;
  }

  function toucher(obj, degats) {
    const z = racine(obj);
    if (!z) return;
    z.userData.vie -= degats;
    z.userData.peau.color.setHex(COUL_TOUCHE);
    setTimeout(() => z.userData.peau.color.setHex(COUL_PEAU), 70);
    if (z.userData.vie <= 0) retirer(z, true);
  }

  function retirer(z, tue) {
    const i = liste.indexOf(z);
    if (i < 0) return;
    liste.splice(i, 1);
    scene.remove(z);
    if (tue) etat.tues++;
  }

  function maj(dt) {
    etat.minuterie -= dt;
    if (etat.restantsAApparaitre > 0 && etat.minuterie <= 0) {
      creer();
      etat.restantsAApparaitre--;
      etat.minuterie = Math.max(0.3, 1.2 - etat.vague * 0.08);
    }
    for (const z of [...liste]) {
      const p = z.position, u = z.userData;
      const d = Math.hypot(p.x, p.z);
      if (d < 2.6) { Jeu.joueur.blesser(10); retirer(z, false); continue; }
      p.x -= (p.x / d) * u.vitesse * dt;
      p.z -= (p.z / d) * u.vitesse * dt;
      z.lookAt(0, 0, 0);
      u.phase += dt * u.vitesse * 3;
      u.jambeG.rotation.x = Math.sin(u.phase) * 0.5;
      u.jambeD.rotation.x = -Math.sin(u.phase) * 0.5;
      u.brasG.rotation.x = -0.2 + Math.sin(u.phase * 0.5) * 0.15;
      u.brasD.rotation.x = -0.2 - Math.sin(u.phase * 0.5) * 0.15;
    }
    if (etat.restantsAApparaitre === 0 && liste.length === 0) demarrerVague(etat.vague + 1);
  }

  function vider() { for (const z of [...liste]) retirer(z, false); etat.tues = 0; }

  return { etat, maj, toucher, demarrerVague, vider, cibles: () => liste };
})();
