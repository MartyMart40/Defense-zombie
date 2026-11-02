'use strict';
/* ================= Arme en main ================= */
// L'arme est dessinée dans sa propre scène, avec sa propre caméra, par-dessus le décor :
// elle ne traverse jamais les sacs de sable et garde la même taille quand on vise.
const vmScene = new THREE.Scene();
const vmCam = new THREE.PerspectiveCamera(55, 1, 0.01, 10);
vmScene.add(vmCam);
vmScene.add(new THREE.HemisphereLight(0xffb070, 0x2a1a14, 0.9));
vmScene.add(new THREE.AmbientLight(0x503020, 0.45));
const vmSun = new THREE.DirectionalLight(0xff9a50, 0.5); vmSun.position.set(-1, 1, -2); vmScene.add(vmSun);
const vmMats = { metal: new THREE.MeshLambertMaterial({ color: 0x1c1d22 }), dark: new THREE.MeshLambertMaterial({ color: 0x18181b }), wood: new THREE.MeshLambertMaterial({ color: 0x6b4428 }),
  steel: new THREE.MeshLambertMaterial({ color: 0x4a4c52 }), olive: new THREE.MeshLambertMaterial({ color: 0x3d4a2a }), red: new THREE.MeshLambertMaterial({ color: 0x7a1e14 }), brass: new THREE.MeshLambertMaterial({ color: 0x8a6a2a }) };
Object.values(vmMats).forEach(m => { m.fog = false; m.emissive = new THREE.Color(0x0d0805); });
const sightMat = new THREE.MeshBasicMaterial({ color: 0xffa040, fog: false }); // pointe du guidon, bien visible
const vmRoot = new THREE.Group(); vmCam.add(vmRoot);
const VM_POS = new THREE.Vector3(0.22, -0.22, -0.48);
const VM_SCALE = .8;
vmRoot.position.copy(VM_POS); vmRoot.scale.setScalar(VM_SCALE);
const flashMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, fog: false, color: 0xffd090 });
const flash = new THREE.Sprite(flashMat); flash.visible = false; flash.renderOrder = 1001;
const muzzleLight = new THREE.PointLight(0xffb060, 0, 30, 2); camera.add(muzzleLight); muzzleLight.position.set(0.2, -0.1, -1.2);
const vmFlashLight = new THREE.PointLight(0xffb060, 0, 2, 2); vmCam.add(vmFlashLight); vmFlashLight.position.set(0, 0, -.7);
const VMS = {};
function vmPart(g, w, h, d, mat, x, y, z, rx){ const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (rx) m.rotation.x = rx; g.add(m); return m; }
function buildVM(){
  let g;
  // Pistolet : cran de mire à l'arrière, guidon orange à l'avant
  g = new THREE.Group();
  vmPart(g, .06, .07, .26, vmMats.metal, 0, 0, -.12); vmPart(g, .055, .15, .07, vmMats.dark, 0, -.09, -.01, .25);
  vmPart(g, .012, .02, .012, vmMats.dark, -.013, .045, -.02); vmPart(g, .012, .02, .012, vmMats.dark, .013, .045, -.02);
  vmPart(g, .006, .016, .008, sightMat, 0, .043, -.235);
  g.userData = { muzzle: -.27, sightY: .051, adsZ: -.30 }; VMS.pistol = g;
  // Fusil à pompe : bille à l'avant, cran sur la boîte de culasse
  g = new THREE.Group();
  vmPart(g, .055, .055, .72, vmMats.metal, 0, .02, -.34); vmPart(g, .08, .07, .22, vmMats.wood, 0, -.04, -.4); vmPart(g, .07, .12, .32, vmMats.wood, 0, -.04, .1); vmPart(g, .07, .08, .2, vmMats.dark, 0, 0, -.06);
  vmPart(g, .01, .022, .014, vmMats.dark, -.014, .052, -.1); vmPart(g, .01, .022, .014, vmMats.dark, .014, .052, -.1);
  vmPart(g, .012, .012, .012, sightMat, 0, .0535, -.68);
  g.userData = { muzzle: -.72, sightY: .0595, adsZ: -.24 }; VMS.shotgun = g;
  // Fusil d'assaut : œilleton à l'arrière, guidon sur le canon
  g = new THREE.Group();
  vmPart(g, .07, .11, .46, vmMats.dark, 0, 0, -.14); vmPart(g, .03, .03, .3, vmMats.metal, 0, .02, -.52); vmPart(g, .05, .17, .08, vmMats.metal, 0, -.12, -.12, .2); vmPart(g, .06, .1, .22, vmMats.dark, 0, -.01, .18);
  vmPart(g, .03, .02, .03, vmMats.dark, 0, .065, .02);
  vmPart(g, .008, .04, .012, vmMats.dark, -.013, .095, .02); vmPart(g, .008, .04, .012, vmMats.dark, .013, .095, .02);
  vmPart(g, .034, .006, .012, vmMats.dark, 0, .118, .02);
  vmPart(g, .02, .03, .02, vmMats.metal, 0, .05, -.6); vmPart(g, .006, .03, .008, sightMat, 0, .08, -.6);
  g.userData = { muzzle: -.68, sightY: .095, adsZ: -.2 }; VMS.rifle = g;
  // Sniper : lunette
  g = new THREE.Group();
  vmPart(g, .065, .085, .8, vmMats.wood, 0, 0, -.18); vmPart(g, .03, .03, .35, vmMats.metal, 0, .02, -.74); vmPart(g, .05, .05, .28, vmMats.dark, 0, .09, -.12); vmPart(g, .05, .14, .07, vmMats.dark, 0, -.1, .04, .3);
  g.userData = { muzzle: -.92, sightY: .09, adsZ: -.2 }; VMS.sniper = g;
  // Arbalète : crosse en bois, rail, arc en travers, carreau posé sur le rail
  g = new THREE.Group();
  vmPart(g, .06, .07, .5, vmMats.wood, 0, -.01, -.1); vmPart(g, .055, .14, .07, vmMats.dark, 0, -.1, .02, .3);
  vmPart(g, .03, .025, .5, vmMats.metal, 0, .03, -.36);
  vmPart(g, .52, .03, .04, vmMats.steel, 0, .035, -.58); vmPart(g, .05, .03, .06, vmMats.steel, -.27, .035, -.55); vmPart(g, .05, .03, .06, vmMats.steel, .27, .035, -.55);
  vmPart(g, .006, .006, .3, vmMats.dark, -.14, .04, -.43).rotation.y = -.75; vmPart(g, .006, .006, .3, vmMats.dark, .14, .04, -.43).rotation.y = .75; // corde
  const bolt = vmPart(g, .012, .012, .42, vmMats.brass, 0, .05, -.42); vmPart(bolt, .014, .03, .05, vmMats.red, 0, .012, .18);
  vmPart(g, .012, .03, .012, vmMats.dark, 0, .07, -.06); vmPart(g, .006, .016, .008, sightMat, 0, .075, -.6);
  g.userData = { muzzle: -.62, sightY: .083, adsZ: -.22, bolt }; VMS.crossbow = g;
  // Lance-flammes : réservoir sous l'arme, long tube, veilleuse orange au bout
  g = new THREE.Group();
  vmPart(g, .07, .08, .4, vmMats.olive, 0, 0, -.12); vmPart(g, .04, .04, .4, vmMats.steel, 0, .01, -.5); vmPart(g, .06, .06, .06, vmMats.dark, 0, .01, -.72);
  vmPart(g, .1, .12, .26, vmMats.red, 0, -.11, -.14); vmPart(g, .05, .15, .07, vmMats.dark, 0, -.1, .08, .25); vmPart(g, .04, .12, .05, vmMats.dark, 0, -.08, -.34, .1);
  vmPart(g, .025, .02, .025, vmMats.dark, 0, .05, -.02); vmPart(g, .01, .014, .01, sightMat, 0, .045, -.6);
  const pilot = vmPart(g, .022, .022, .022, sightMat, 0, -.025, -.76);
  g.userData = { muzzle: -.77, sightY: .052, adsZ: -.24, pilot }; VMS.flamer = g;
  // Minigun : six canons qui tournent, boîte de munitions, poignée de transport
  g = new THREE.Group();
  vmPart(g, .12, .12, .3, vmMats.dark, 0, -.01, -.02); vmPart(g, .1, .12, .14, vmMats.olive, -.1, -.08, .02);
  vmPart(g, .03, .05, .2, vmMats.metal, 0, .08, -.02); vmPart(g, .05, .14, .07, vmMats.dark, 0, -.12, .12, .25);
  const barrels = new THREE.Group(); barrels.position.set(0, 0, -.42); g.add(barrels);
  for (let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2; vmPart(barrels, .018, .018, .5, vmMats.steel, Math.cos(a) * .035, Math.sin(a) * .035, 0); }
  vmPart(barrels, .1, .1, .03, vmMats.metal, 0, 0, -.2); vmPart(barrels, .1, .1, .03, vmMats.metal, 0, 0, .1);
  vmPart(g, .012, .02, .012, sightMat, 0, .115, -.08);
  g.userData = { muzzle: -.7, sightY: .125, adsZ: -.26, barrels }; VMS.minigun = g;
  // Lance-roquettes : gros tube sur l'épaule, roquette verte qui dépasse
  g = new THREE.Group();
  vmPart(g, .11, .11, .9, vmMats.olive, 0, .02, -.22); vmPart(g, .13, .13, .06, vmMats.dark, 0, .02, -.67); vmPart(g, .13, .13, .06, vmMats.dark, 0, .02, .24);
  vmPart(g, .05, .14, .07, vmMats.dark, 0, -.1, -.02, .25); vmPart(g, .04, .1, .05, vmMats.dark, 0, -.08, -.3);
  vmPart(g, .03, .03, .1, vmMats.dark, 0, .09, -.06); vmPart(g, .008, .014, .008, sightMat, 0, .085, -.62);
  const warhead = vmPart(g, .07, .07, .14, vmMats.olive, 0, .02, -.74); vmPart(warhead, .04, .04, .06, vmMats.red, 0, 0, -.09);
  g.userData = { muzzle: -.8, sightY: .098, adsZ: -.2, warhead }; VMS.rocket = g;
  Object.values(VMS).forEach(v => { v.visible = false; vmRoot.add(v); });
}
buildVM();
let ads = 0; // 0 = arme à la hanche, 1 = arme à l'œil
