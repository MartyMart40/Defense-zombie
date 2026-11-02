'use strict';
/* ================= Entrées : tactile ================= */
const aim = { id:null, lx:0, ly:0 };
$('aimZone').addEventListener('touchstart', e => {
  e.preventDefault(); Snd.init();
  for (const t of e.changedTouches){ if (aim.id === null){ aim.id = t.identifier; aim.lx = t.clientX; aim.ly = t.clientY; } }
}, { passive: false });
document.addEventListener('touchmove', e => {
  if (state !== 'playing') return;
  for (const t of e.changedTouches){
    if (t.identifier === aim.id){
      const f = camera.fov / baseFov;
      yaw -= (t.clientX - aim.lx) * .0055 * sens * f; pitch -= (t.clientY - aim.ly) * .0055 * sens * f;
      $('aimHint').classList.add('gone');
      aim.lx = t.clientX; aim.ly = t.clientY;
    }
  }
  if (e.cancelable) e.preventDefault();
}, { passive: false });
function touchEnd(e){
  for (const t of e.changedTouches){
    if (t.identifier === aim.id) aim.id = null;
  }
}
document.addEventListener('touchend', touchEnd); document.addEventListener('touchcancel', touchEnd);
function holdBtn(id, down, up){
  const el = $(id); let tid = null;
  el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); Snd.init(); tid = e.changedTouches[0].identifier; el.classList.add('down'); down(); }, { passive: false });
  const end = e => { for (const t of e.changedTouches) if (t.identifier === tid){ tid = null; el.classList.remove('down'); if (up) up(); } };
  el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
  el.addEventListener('click', e => { if (!isTouch){ down(); if (up) setTimeout(up, 120); } });
}
holdBtn('btnFire', () => { firing = true; }, () => { firing = false; });
holdBtn('btnReload', () => startReload());
holdBtn('btnSwap', () => swapNext(1));
holdBtn('btnZoom', () => { zoomed = !zoomed; });
