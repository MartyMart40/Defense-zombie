'use strict';
/* ================= Entrées : souris ================= */
let plock = false, wantLock = false;
const canLock = !isTouch && !!canvas.requestPointerLock;
function lockPointer(){
  if (!canLock) return;
  wantLock = true;
  try{ const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); }catch(e){}
}
function unlockPointer(){ wantLock = false; if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock(); }
document.addEventListener('pointerlockchange', () => {
  const was = plock; plock = document.pointerLockElement === canvas;
  if (was && !plock && state === 'playing' && wantLock) pause();
});
document.addEventListener('mousemove', e => {
  if (state !== 'playing' || isTouch) return;
  const f = camera.fov / baseFov;
  if (plock){ yaw -= e.movementX * .0022 * sens * f; pitch -= e.movementY * .0022 * sens * f; }
  else if (e.target === canvas){
    // Mode de secours sans verrouillage : la position de la souris dirige la visée
    yaw = -((e.clientX / innerWidth) * 2 - 1) * YAW_MAX;
    pitch = PITCH_MAX - (e.clientY / innerHeight) * (PITCH_MAX - PITCH_MIN);
  }
});
canvas.addEventListener('mousedown', e => {
  if (state !== 'playing') return;
  Snd.init();
  if (canLock && !plock) lockPointer();
  if (e.button === 0) firing = true;
  if (e.button === 2) zoomed = true;
});
document.addEventListener('mouseup', e => { if (e.button === 0) firing = false; if (e.button === 2) zoomed = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('wheel', e => { if (state === 'playing') swapNext(e.deltaY > 0 ? 1 : -1); }, { passive: true });
document.addEventListener('keydown', e => {
  if (state === 'playing'){
    if (e.code === 'KeyR') startReload();
    else if (e.code === 'Digit1') equip('pistol'); else if (e.code === 'Digit2') equip('shotgun');
    else if (e.code === 'Digit3') equip('rifle'); else if (e.code === 'Digit4') equip('sniper');
    else if (e.code === 'KeyQ') swapNext(1);
    else if (e.code === 'Escape' || e.code === 'KeyP') pause();
  } else if (state === 'paused' && e.code === 'KeyP') resume();
});
