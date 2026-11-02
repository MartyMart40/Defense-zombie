// Scène, caméra, éclairage, sol et décor.
window.Jeu = window.Jeu || {};
Jeu.scene = (function () {
  const scene = new THREE.Scene();
  const ciel = 0x55606e;
  scene.background = new THREE.Color(ciel);
  scene.fog = new THREE.Fog(ciel, 25, 110);

  const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 300);
  camera.position.set(0, 1.7, 0);
  scene.add(camera); // nécessaire pour afficher l'arme attachée à la caméra

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xb0c0d0, 0x302a20, 0.8));
  const lune = new THREE.DirectionalLight(0xfff2dd, 0.8);
  lune.position.set(20, 40, 10);
  scene.add(lune);

  // Sol : terre brune avec des taches pour donner du relief visuel.
  const sol = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshLambertMaterial({ color: 0x4a3f30 })
  );
  sol.rotation.x = -Math.PI / 2;
  scene.add(sol);
  const matTache = new THREE.MeshLambertMaterial({ color: 0x3a4a28 });
  for (let i = 0; i < 120; i++) {
    const t = new THREE.Mesh(new THREE.CircleGeometry(1 + Math.random() * 3, 7), matTache);
    t.rotation.x = -Math.PI / 2;
    t.position.set((Math.random() - 0.5) * 160, 0.01, (Math.random() - 0.5) * 160);
    scene.add(t);
  }

  // Barricade de sacs de sable autour du joueur.
  const matSac = new THREE.MeshLambertMaterial({ color: 0x8a7a55 });
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const sac = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.45), matSac);
    sac.position.set(Math.cos(a) * 2.2, 0.25, Math.sin(a) * 2.2);
    sac.rotation.y = -a;
    scene.add(sac);
    const sac2 = sac.clone();
    sac2.position.y = 0.72;
    sac2.rotation.y = -a + 0.13;
    scene.add(sac2);
  }

  // Arbres morts et rochers au loin, pour avoir des repères.
  const matTronc = new THREE.MeshLambertMaterial({ color: 0x2b2118 });
  const matRoche = new THREE.MeshLambertMaterial({ color: 0x6b6b66 });
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 18 + Math.random() * 70;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.random() < 0.6) {
      const h = 3 + Math.random() * 5;
      const tronc = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, h, 6), matTronc);
      tronc.position.set(x, h / 2, z);
      tronc.rotation.z = (Math.random() - 0.5) * 0.3;
      scene.add(tronc);
      const branche = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, h * 0.4, 5), matTronc);
      branche.position.set(x + 0.4, h * 0.7, z);
      branche.rotation.z = -0.8;
      scene.add(branche);
    } else {
      const r = 0.5 + Math.random() * 1.2;
      const roche = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), matRoche);
      roche.position.set(x, r * 0.5, z);
      roche.rotation.set(Math.random(), Math.random(), Math.random());
      scene.add(roche);
    }
  }

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  return { scene, camera, renderer };
})();
