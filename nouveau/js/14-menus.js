'use strict';
/* ================= Menus ================= */
function pause(){
  if (state !== 'playing') return;
  state = 'paused'; firing = false; zoomed = false; setPlayingUI(false); wantLock = false;
  $('hud').classList.remove('hide');
  showScreen('scrPause');
}
function resume(){ state = 'playing'; showScreen(null); setPlayingUI(true); lockPointer(); }
$('btnPause').addEventListener('click', pause);
$('btnPause').addEventListener('touchstart', e => { e.preventDefault(); pause(); }, { passive: false });
function syncMute(){ $('btnMute').textContent = Snd.on ? '🔊' : '🔇'; $('btnSound').textContent = 'Son : ' + (Snd.on ? 'activé' : 'coupé'); }
const toggleMute = () => { Snd.init(); Snd.setOn(!Snd.on); syncMute(); };
$('btnMute').addEventListener('click', toggleMute);
$('btnMute').addEventListener('touchstart', e => { e.preventDefault(); toggleMute(); }, { passive: false });
$('btnSound').addEventListener('click', toggleMute);
const sensFmt = v => v.toFixed(1).replace('.', ',');
$('sens').value = sens; $('sensVal').textContent = sensFmt(sens);
$('sens').addEventListener('input', e => { sens = parseFloat(e.target.value); $('sensVal').textContent = sensFmt(sens); store.set('dt_sens', sens); });
$('btnResume').addEventListener('click', resume);
$('btnQuit').addEventListener('click', () => { gameOver(); });
$('btnMapTitle').addEventListener('click', () => { Snd.init(); goMap(); });
$('btnStart').addEventListener('click', () => { Snd.init(); startLocation(campaignIdx()); });
$('btnNext').addEventListener('click', () => { Snd.init(); startWave(); });
$('btnAgain').addEventListener('click', () => { const i = LOCS.indexOf(curLoc); startLocation(againNext && i + 1 < LOCS.length ? i + 1 : i); });
$('ctrlHelp').innerHTML = isTouch
  ? '<b>Glisser le doigt</b><span>viser, n’importe où sur l’écran</span><b>Feu</b><span>garde le doigt dessus pour tirer</span><b>Viser</b><span>amène l’arme à l’œil, aligne la pointe orange sur ta cible</span><b>Arme, Recharger</b><span>boutons à droite</span>'
  : '<b>Souris</b><span>viser</span><b>Clic gauche</b><span>tirer (garde enfoncé)</span><b>Clic droit</b><span>viser avec l’arme à l’œil (garde enfoncé)</span><b>R</b><span>recharger</span><b>1 à 4 ou molette</b><span>changer d’arme</span><b>Échap</b><span>pause</span>';
$('btnStart').textContent = 'Jouer : ' + LOCS[campaignIdx()].name;
$('bestTxt').textContent = P.level > 1 || P.unlocked > 1 ? 'Niveau ' + P.level + ' · ' + P.unlocked + ' ville' + (P.unlocked > 1 ? 's' : '') + ' débloquée' + (P.unlocked > 1 ? 's' : '') : '';
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

const fsEl = document.documentElement;
const canFS = !!(fsEl.requestFullscreen || fsEl.webkitRequestFullscreen) && (document.fullscreenEnabled !== false || document.webkitFullscreenEnabled);
const isFS = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function toggleFS(){
  try{
    if (isFS()){ (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const p = (fsEl.requestFullscreen || fsEl.webkitRequestFullscreen).call(fsEl, { navigationUI:'hide' });
    if (p && p.catch) p.catch(() => {});
  }catch(e){}
}
function syncFS(){ const on = isFS(); $('btnFull').textContent = on ? '✕' : '⛶'; $('btnFullTitle').textContent = $('btnFullPause').textContent = on ? 'Quitter le plein écran' : 'Plein écran'; }
['btnFull', 'btnFullTitle', 'btnFullPause'].forEach(id => {
  const el = $(id); if (!canFS){ el.classList.add('hide'); return; }
  el.addEventListener('click', toggleFS);
});
$('btnFull').addEventListener('touchstart', e => { e.preventDefault(); toggleFS(); }, { passive: false });
['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => { syncFS(); setTimeout(resize, 120); }));
function updateRotateHint(){}
function resize(){
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // À la verticale, on élargit le champ de vision pour garder la largeur de la rue
  baseFov = w < h ? clamp(2 * Math.atan(Math.tan(27.5 * Math.PI / 180) / (w / h)) * 180 / Math.PI, 70, 95) : 70;
  camera.updateProjectionMatrix();
  vmCam.aspect = w / h; vmCam.fov = w < h ? 78 : 55; vmCam.updateProjectionMatrix();
  updateRotateHint();
}
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();
