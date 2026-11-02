'use strict';
/* ================= HUD ================= */
const hudCache = {};
function setTxt(id, t){ if (hudCache[id] !== t){ hudCache[id] = t; $(id).textContent = t; } }
function updateHUD(){
  setTxt('locName', curLoc.name);
  setTxt('wave', 'Vague ' + S.wave + ' / ' + curLoc.waves);
  setTxt('money', fmt(S.money));
  setTxt('kills', fmtN(S.kills) + ' abattus');
  const pct = clamp(S.bar / S.barMax, 0, 1);
  const w = Math.round(pct * 100) + '%'; if (hudCache.bar !== w){ hudCache.bar = w; $('barFill').style.width = w; $('barFill').classList.toggle('low', pct < .3); $('vignette').classList.toggle('on', pct < .3 && state === 'playing'); }
  setTxt('wname', cur().name);
  setTxt('ammo', reloadT > 0 ? 'Recharge' : (WEAPONS[S.cur].spin && firing && spin < 1 && S.ammo[S.cur] > 0) ? 'Lancement ' + Math.round(spin * 100) + ' %' : S.ammo[S.cur] + ' / ' + magSize(S.cur));
  $('rl').classList.toggle('on', reloadT > 0);
  if (reloadT > 0) $('rlFill').style.width = Math.round((1 - reloadT / reloadDur) * 100) + '%';
  $('cross').classList.toggle('hit', hitmT > 0);
  $('hitm').classList.toggle('show', hitmT > 0);
  const scopeOn = S.cur === 'sniper' && ads > .85 && state === 'playing';
  $('scope').classList.toggle('on', scopeOn);
  $('cross').style.opacity = Math.max(0, 1 - ads * 1.6).toFixed(2);
  $('btnZoom').classList.toggle('on', zoomed);
  if (typeof defHUD === 'function') defHUD(); // ferraille et ogive (17-defenses.js)
}
const projV = new THREE.Vector3();
function floatText(txt, pos, head){
  if ($('floats').childElementCount > 18) return;
  projV.copy(pos).project(camera);
  if (projV.z > 1) return;
  const el = document.createElement('div'); el.className = 'fl' + (head ? ' head' : '');
  el.textContent = txt;
  el.style.left = ((projV.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - projV.y) / 2 * innerHeight - 20) + 'px';
  $('floats').appendChild(el); setTimeout(() => el.remove(), 950);
}
