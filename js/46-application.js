'use strict';
/* ================= Application installable (cell et ordi) ================= */
// manifest.webmanifest (nom, icônes, plein écran) et sw.js (service worker : marche sans réseau, voir ce fichier).
// - Le service worker n'est enregistré que sur la vraie page du jeu (pas dans la page de tests, pas en file://).
// - Android et ordi (Chrome, Edge) : le navigateur propose d'installer ; on montre aussi un bouton « Installer le jeu »
//   sur l'écran titre quand c'est possible. iPhone : Partager, puis « Sur l'écran d'accueil » (dit dans « Comment jouer »).

const APP = { invite:null, installe:false };
const appStandalone = () => { try { return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true; } catch (e) { return false; } };
const appIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function appRegister(){
  try {
    if (!('serviceWorker' in navigator) || window.top !== window || !/^https?:$/.test(location.protocol)) return false;
    if (location.pathname.indexOf('/tests/') >= 0) return false;
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
    return true;
  } catch (e) { return false; }
}
function appBtn(){
  let b = $('btnInstall');
  const ref = $('btnFullTitle');
  if (!b && ref && ref.parentNode){
    b = document.createElement('button'); b.className = 'ghost'; b.id = 'btnInstall'; b.type = 'button'; b.textContent = '📲 Installer le jeu sur cet appareil';
    ref.parentNode.insertBefore(b, ref);
    b.addEventListener('click', appInstall);
  }
  if (b) b.classList.toggle('hide', !APP.invite || APP.installe || appStandalone());
}
function appInstall(){
  const p = APP.invite; if (!p) return false;
  APP.invite = null; appBtn();
  try { p.prompt(); if (p.userChoice) p.userChoice.then(r => { if (r && r.outcome === 'accepted') APP.installe = true; appBtn(); }).catch(() => {}); } catch (e) {}
  return true;
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); APP.invite = e; appBtn(); });
window.addEventListener('appinstalled', () => { APP.installe = true; appBtn(); });

// Installé, le jeu est déjà en plein écran : les boutons « Plein écran » ne servent plus
(function(){
  appRegister(); appBtn();
  if (appStandalone()) ['btnFullTitle', 'btnFullPause'].forEach(id => { const el = $(id); if (el) el.classList.add('hide'); });
  const aide = $('ctrlHelp');
  if (aide && !appStandalone()) aide.innerHTML += appIOS()
    ? '<b>Installer (iPhone)</b><span>bouton Partager de Safari, puis « Sur l’écran d’accueil » : le jeu s’ouvre en plein écran, même sans réseau</span>'
    : '<b>Installer</b><span>bouton « Installer le jeu » ci-dessus, ou le menu du navigateur : « Installer l’application » ou « Ajouter à l’écran d’accueil »</span>';
})();

// Accès pour les tests automatiques
window.__app = { APP, appRegister, appBtn, appInstall, appStandalone, appIOS };
