'use strict';
/* ================= Une page du jeu pour le simulateur ================= */
// Utilisé par outils/simulateur.js et outils/mesure-crise.js. Chaque page :
//   - a son propre contexte de navigateur : sa propre sauvegarde (localStorage), jamais lue ni écrite par une autre
//     page lancée en même temps ;
//   - reçoit outils/sim-horloge.js avant le premier script du jeu : heure, horloge audio et hasard du chargement fixés,
//     boucle du jeu arrêtée ;
//   - attend que tout soit chargé (réseau au repos), pour qu'aucun chargement ne finisse au milieu d'une partie.
// page.close() ferme aussi son contexte.
const path = require('path');

async function nouvellePage(b, base, scripts){
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.addInitScript({ path: path.join(__dirname, 'sim-horloge.js') });
  p.on('pageerror', e => console.log('  (erreur dans la page : ' + e.message + ')'));
  await p.goto(base, { waitUntil: 'networkidle', timeout: 180000 }); // machine chargée : le délai de 30 s ne suffit pas toujours
  await p.waitForFunction(() => typeof startLocation === 'function' && typeof rtsStart === 'function', null, { timeout: 180000 });
  for (const f of scripts || []) await p.addScriptTag({ path: path.join(__dirname, f) });
  const fermer = p.close.bind(p);
  p.close = async () => { await fermer().catch(() => {}); await ctx.close().catch(() => {}); };
  return p;
}
module.exports = { nouvellePage };
