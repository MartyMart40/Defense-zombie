'use strict';
/* ================= Boutique ================= */
function pips(l, max){ let h = '<span class="pips">'; for (let i = 0; i < max; i++) h += '<i' + (i < l ? ' class="f"' : '') + '></i>'; return h + '</span>'; }
function repairCost(){ return Math.max(10, Math.ceil((S.barMax - S.bar) * .5)); }
function renderShop(){
  if (S.wave === 0){
    $('shopTitle').textContent = 'Préparation';
    $('shopStats').innerHTML = '<span><strong>' + curLoc.name + '</strong>, ' + curLoc.waves + ' vagues à tenir</span><span>Argent de départ : <strong>' + fmt(S.money) + '</strong></span>';
  } else {
    $('shopTitle').textContent = 'Vague ' + S.wave + ' / ' + curLoc.waves + ' tenue';
    $('shopStats').innerHTML = '<span><strong>' + S.waveKills + '</strong> zombies abattus</span><span>Bonus de vague : <strong>' + fmt(lastBonus) + '</strong></span>';
  }
  $('shopMoney').textContent = fmt(S.money);
  let h = '';
  WORDER.forEach(id => {
    const W = WEAPONS[id], own = S.owned[id], on = S.cur === id;
    let b;
    if (own) b = on ? '<button disabled>En main</button>' : '<button data-act="equip" data-id="' + id + '">Prendre en main</button>';
    else b = '<button data-act="buy" data-id="' + id + '"' + (S.money < W.price ? ' disabled' : '') + '>Acheter ' + fmt(W.price) + '</button>';
    h += '<div class="card' + (on ? ' on' : '') + '"><div class="cname">' + W.name + '</div><div class="cdesc">' + W.desc + '</div>' + b + '</div>';
  });
  $('shopWeapons').innerHTML = h;
  h = '';
  ['dmg', 'reload', 'mag'].forEach(k => {
    const U = UPG[k], l = S.upg[k], max = l >= U.max, c = max ? 0 : U.cost(l);
    h += '<div class="row"><div class="info"><div class="nm">' + U.name + pips(l, U.max) + '</div><div class="ds">' + U.desc + '</div></div><button data-act="upg" data-id="' + k + '"' + (max || S.money < c ? ' disabled' : '') + '>' + (max ? 'Max' : fmt(c)) + '</button></div>';
  });
  $('shopUpg').innerHTML = h;
  const U = UPG.wall, l = S.upg.wall, max = l >= U.max, c = max ? 0 : U.cost(l), rc = repairCost(), full = S.bar >= S.barMax;
  $('shopWall').innerHTML =
    '<div class="row"><div class="info"><div class="nm">Réparer</div><div class="ds">Solidité : ' + Math.ceil(S.bar) + ' / ' + S.barMax + '</div></div><button data-act="repair"' + (full || S.money < rc ? ' disabled' : '') + '>' + (full ? 'Intacte' : fmt(rc)) + '</button></div>' +
    '<div class="row"><div class="info"><div class="nm">' + U.name + pips(l, U.max) + '</div><div class="ds">' + U.desc + '</div></div><button data-act="upg" data-id="wall"' + (max || S.money < c ? ' disabled' : '') + '>' + (max ? 'Max' : fmt(c)) + '</button></div>';
  $('btnNext').textContent = S.wave + 1 === curLoc.waves ? 'Lancer la dernière vague' : 'Lancer la vague ' + (S.wave + 1);
}
$('scrShop').addEventListener('click', e => {
  const b = e.target.closest('button[data-act]'); if (!b || b.disabled) return;
  const act = b.dataset.act, id = b.dataset.id;
  if (act === 'buy'){ const W = WEAPONS[id]; if (S.money < W.price) return; S.money -= W.price; S.owned[id] = true; S.ammo[id] = magSize(id); equip(id); Snd.buy(); }
  else if (act === 'equip') equip(id);
  else if (act === 'upg'){
    const U = UPG[id], c = U.cost(S.upg[id]); if (S.upg[id] >= U.max || S.money < c) return;
    S.money -= c; S.upg[id]++;
    if (id === 'wall'){ S.barMax = barMaxCalc(); S.bar = S.barMax; }
    if (id === 'mag') refillAll();
    Snd.buy();
  }
  else if (act === 'repair'){ const c = repairCost(); if (S.money < c) return; S.money -= c; S.bar = S.barMax; Snd.buy(); }
  renderShop();
});
