'use strict';
/* ================= HUD ================= */
const hudCache = {};
function setTxt(id, t){ if (hudCache[id] !== t){ hudCache[id] = t; $(id).textContent = t; } }
// Classe et style écrits seulement quand ils changent (dossier 120 : aucune écriture DOM inchangée à chaque image)
function setCls(id, cls, on){ const k = id + '.' + cls; if (hudCache[k] !== on){ hudCache[k] = on; $(id).classList.toggle(cls, on); } }
function setSty(id, prop, v){ const k = id + ':' + prop; if (hudCache[k] !== v){ hudCache[k] = v; $(id).style[prop] = v; } }
// Texte refait seulement si sa valeur de départ change (pas de chaîne neuve à chaque image)
function setVal(id, v, f){ const k = id + '#'; if (hudCache[k] !== v){ hudCache[k] = v; setTxt(id, f(v)); } }
const hudVague = w => 'Vague ' + w + ' / ' + curLoc.waves, hudTues = n => fmtN(n) + ' abattus';
function updateHUD(){
  setTxt('locName', curLoc.name);
  setVal('wave', S.wave * 1000 + curLoc.waves, () => hudVague(S.wave));
  setVal('money', S.money, fmt);
  setVal('kills', S.kills, hudTues);
  const pct = clamp(S.bar / S.barMax, 0, 1);
  const w = Math.round(pct * 100) + '%'; if (hudCache.bar !== w){ hudCache.bar = w; $('barFill').style.width = w; $('barFill').classList.toggle('low', pct < .3); $('vignette').classList.toggle('on', pct < .3 && state === 'playing'); }
  setTxt('wname', cur().name);
  setTxt('ammo', reloadT > 0 ? 'Recharge' : (WEAPONS[S.cur].spin && firing && spin < 1 && S.ammo[S.cur] > 0) ? 'Lancement ' + Math.round(spin * 100) + ' %' : S.ammo[S.cur] + ' / ' + magSize(S.cur));
  setCls('rl', 'on', reloadT > 0);
  if (reloadT > 0) setSty('rlFill', 'width', Math.round((1 - reloadT / reloadDur) * 100) + '%');
  setCls('cross', 'hit', hitmT > 0);
  setCls('hitm', 'show', hitmT > 0);
  if (typeof viseeHUD === 'function') viseeHUD(); // cadre de lunette : sniper et lunette ×4 (66-visee.js)
  else $('scope').classList.toggle('on', S.cur === 'sniper' && ads > .85 && state === 'playing');
  setSty('cross', 'opacity', ads > 0 ? Math.max(0, 1 - ads * 1.6).toFixed(2) : '1.00');
  setCls('btnZoom', 'on', !!zoomed);
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
