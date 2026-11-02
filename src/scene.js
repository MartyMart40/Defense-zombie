// Scène, caméra, éclairage et sol.
window.Jeu = window.Jeu || {};
Jeu.scene = (function () {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1f24);
  scene.fog = new THREE.Fog(0x1a1f24, 10, 60);

  const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 1.7, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x8899aa, 0x222211, 0.9));
  const soleil = new THREE.DirectionalLight(0xffffff, 0.6);
  soleil.position.set(10, 20, 5);
  scene.add(soleil);

  const sol = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshLambertMaterial({ color: 0x3b4a2f })
  );
  sol.rotation.x = -Math.PI / 2;
  scene.add(sol);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  return { scene, camera, renderer };
})();
