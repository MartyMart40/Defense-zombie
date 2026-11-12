'use strict';
/* ================= Simulateur d'équilibrage ================= */
// Fait jouer le robot-joueur (outils/sim-bot.js) dans le vrai jeu, en accéléré, et écrit un rapport :
//   docs/equilibrage.md (tableaux en français) et docs/equilibrage.json (les chiffres bruts).
// Usage :
//   python3 -m http.server 8765      (à la racine du dépôt, dans un autre terminal)
//   node outils/simulateur.js [quoi] [joueurs] [graine]
//     quoi    : tout (défaut), duel, toit, infini, rts
//     joueurs : liste séparée par des virgules parmi debutant, moyen, bon (défaut : moyen,bon)
//     graine  : nombre pour le hasard (défaut 1) ; même graine = mêmes parties
//     strategie : achat des armes pour la campagne : malin (défaut), boutique, patient, pistolet ou pompe (voir outils/sim-bot.js)
// Durée : quelques minutes par joueur. Le jeu n'est pas modifié.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const BASE = process.env.SIM_URL || 'http://localhost:8765/';
const quoi = process.argv[2] || 'tout';
const joueurs = (process.argv[3] || 'moyen,bon').split(',').filter(Boolean);
const graine = +process.argv[4] || 1;
const strategie = process.argv[5] || 'malin';
const NOM_STRAT = { malin:'selon le besoin : les armes de horde d’abord (fusil d’assaut, lance-flammes, minigun), le sniper pour les boss', boutique:'l’arme suivante dès qu’on peut', patient:'l’arme suivante avec deux fois son prix en poche, sans les armes de près', pistolet:'le pistolet seulement, et des améliorations', pompe:'le fusil à pompe dès qu’on peut, puis des améliorations' };

async function page(b){
  const p = await b.newPage();
  p.on('pageerror', e => console.log('  (erreur dans la page : ' + e.message + ')'));
  await p.goto(BASE);
  await p.waitForFunction(() => typeof startLocation === 'function' && typeof rtsStart === 'function');
  await p.addScriptTag({ path: path.join(__dirname, 'sim-bot.js') });
  await p.evaluate(() => SIM.preparer());
  await new Promise(r => setTimeout(r, 200));
  return p;
}
// Duel à budget égal : les situations mesurées (ville, vague, budget que le joueur a eu jusque-là, talents à ce moment)
const DUELS = [
  { ville:0, vague:4, budget:1300, lots:[['pistol'], ['pistol', 'shotgun'], ['pistol', 'rifle']] },
  { ville:1, vague:5, budget:2500, talents:{ marksman:4 }, lots:[['pistol'], ['pistol', 'rifle'], ['pistol', 'sniper', 'rifle']] },
  { ville:2, vague:5, budget:4500, talents:{ marksman:7 }, lots:[['pistol'], ['pistol', 'rifle'], ['pistol', 'crossbow', 'rifle'], ['pistol', 'flamer', 'rifle']] },
  { ville:3, vague:5, budget:7000, talents:{ marksman:10, carpenter:3 }, lots:[['pistol'], ['pistol', 'rifle'], ['pistol', 'flamer', 'rifle'], ['pistol', 'minigun']] },
  { ville:3, vague:7, budget:11000, talents:{ marksman:10, carpenter:3 }, lots:[['pistol', 'rifle'], ['pistol', 'minigun'], ['pistol', 'rocket']] },
  { ville:4, vague:6, budget:14000, talents:{ marksman:10, carpenter:6 }, lots:[['pistol', 'rifle'], ['pistol', 'minigun'], ['pistol', 'rocket']] },
  { ville:4, vague:8, budget:22000, talents:{ marksman:10, carpenter:6 }, lots:[['pistol', 'minigun'], ['pistol', 'rocket'], ['pistol', 'mg50'], ['pistol', 'laser']] },
  { ville:4, vague:9, budget:30000, talents:{ marksman:10, carpenter:6 }, lots:[['pistol', 'minigun'], ['pistol', 'mg50'], ['pistol', 'laser'], ['pistol', 'railgun', 'minigun']] }
];
const dollars = v => v.toLocaleString('fr-CA') + ' $';
function mdDuel(d){
  let h = '### ' + d.ville + ', vague ' + d.vague + ', ' + dollars(d.budget) + ' à dépenser\n\n| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |\n|---|---|---|---|\n';
  const mieux = Math.min.apply(null, d.lots.map(l => l.horde));
  d.lots.forEach(l => { h += '| ' + (l.armes.length > 1 ? l.armes.slice(1).join(', ') : 'aucune (pistolet)') + ' | ' + l.principale + ' | ' + (l.horde === mieux ? '**' + l.horde.toLocaleString('fr-CA') + '**' : l.horde.toLocaleString('fr-CA')) + ' | ' + l.boss + ' |\n'; });
  return h + '\n';
}
const pct = v => v + ' %';
const LOCS_N = 5;
function mdToit(c){
  let h = '| Ville | Essai | Résultat | Vagues | Barricade à la fin (plus bas) | Argent à la fin | Niveau | Arme | Pouvoirs lancés | Minutes de jeu |\n|---|---|---|---|---|---|---|---|---|---|\n';
  c.parties.forEach(r => {
    h += '| ' + r.ville + ' | ' + r.essai + ' | ' + (r.gagne ? 'Libérée' : r.finTemps ? 'Trop long' : 'Perdue') + ' | ' + r.tenues + ' / ' + r.sur + ' | ' + pct(r.bar) + ' (' + pct(r.barMin) + ') | '
      + r.argent.toLocaleString('fr-CA') + ' $ | ' + r.niveau + ' | ' + r.arme + ' | ' + r.pouvoirs + ' | ' + String(r.minutes).replace('.', ',') + ' |\n';
  });
  return h;
}
function mdInf(c){
  let h = '| Ville | Vagues tenues | Zombies abattus | Arme | Minutes de jeu |\n|---|---|---|---|---|\n';
  c.parties.forEach(r => { h += '| ' + r.ville + ' | ' + r.tenues + (r.finTemps ? ' (arrêté, trop long)' : '') + ' | ' + r.abattus.toLocaleString('fr-CA') + ' | ' + r.arme + ' | ' + String(r.minutes).replace('.', ',') + ' |\n'; });
  return h;
}
function mdRts(r){
  let h = '| Minute | Nids détruits | Unités | Tourelles | Argent | Menace | Vie du QG | Zombies en vie | Zombies tués | Unités perdues | Boss abattus |\n|---|---|---|---|---|---|---|---|---|---|---|\n';
  r.pas.concat([r.fin]).forEach(s => { h += '| ' + String(s.min).replace('.', ',') + ' | ' + s.nids + ' | ' + s.unites + ' | ' + s.tourelles + ' | ' + s.argent.toLocaleString('fr-CA') + ' $ | ' + String(s.menace).replace('.', ',') + ' | ' + pct(s.qg) + ' | ' + s.zombies + ' | ' + s.tues + ' | ' + s.perdues + ' | ' + s.boss + ' |\n'; });
  return h + '\n' + (r.fin.tombe ? '**Le QG est tombé à ' + String(r.fin.min).replace('.', ',') + ' min.**' : 'Le QG tient encore à la fin de la simulation (' + String(r.fin.min).replace('.', ',') + ' min).') + '\n';
}

(async () => {
  const t0 = Date.now();
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], executablePath: process.env.CHROMIUM_PATH || undefined });
  const out = { date: new Date().toISOString().slice(0, 10), graine, duel: null, toit: {}, infini: {}, rts: null };
  let md = '# Équilibrage : résultats du simulateur\n\n'
    + 'Rapport écrit par `outils/simulateur.js` le ' + out.date + ' (graine ' + graine + '). Un robot-joueur joue le vrai jeu en accéléré.\n'
    + 'Il vise comme un joueur qui connaît le jeu : le zombie à moins de 8 m de la barricade d’abord, sinon un cracheur arrêté, sinon la tête du boss, sinon le plus proche. '
    + 'Il a une erreur de visée selon son niveau, vise dans la mire de loin, retient une partie du recul et prend l’arme qui convient à la cible parmi celles qu’il possède. '
    + 'Entre les vagues, il achète ses armes selon une stratégie, puis toujours l’amélioration la moins chère (pour l’arme qu’il a le plus tenue), place ses talents et achète des défenses avec la ferraille.\n'
    + 'Il lance ses pouvoirs (grenade, Molotov, frappe aérienne) dans les groupes serrés et améliore les pouvoirs avec une partie de sa ferraille.\n'
    + 'Il ne se sert pas des accessoires, des compagnons ni du contrôle des tourelles : un vrai joueur fait mieux, surtout dans les dernières villes. Les campagnes varient beaucoup d’une partie à l’autre : pour juger une arme, se fier au duel à budget égal.\n'
    + 'Ces chiffres servent à comparer avant et après un changement d’équilibrage, pas à remplacer les essais de Martin.\n\n'
    + '- Débutant : erreur de visée d’environ 0,6° (à chaque coup), 10 % des tirs visés à la tête, 0,6 s pour changer de cible.\n- Moyen : environ 0,35°, 30 % à la tête, 0,4 s.\n- Bon : environ 0,17°, 60 % à la tête, 0,25 s.\n\n';
  if (quoi === 'tout' || quoi === 'duel'){
    console.log('Duel à budget égal (' + DUELS.length + ' situations, 4 à la fois)...');
    out.duel = [];
    for (let i = 0; i < DUELS.length; i += 4){
      const rs = await Promise.all(DUELS.slice(i, i + 4).map(async d => { const p = await page(b); const r = await p.evaluate(o => SIM.duel(o), Object.assign({ joueur:'moyen', graines:[graine, graine + 1] }, d)); await p.close(); return r; }));
      rs.forEach(r => { out.duel.push(r); console.log('  ' + r.ville + ' vague ' + r.vague + ' : ' + r.lots.map(l => l.armes.slice(1).join('+') || 'pistolet' ).map((n, k) => n + ' ' + r.lots[k].horde).join(' | ')); });
    }
    md += '## Duel à budget égal : est-ce que l’arme vaut son prix ?\n\nLa mesure la plus fiable de ce rapport. À une vague donnée, avec l’argent qu’un joueur a eu jusque-là, chaque ligne achète ses armes puis met tout le reste en améliorations (la moins chère d’abord). '
      + 'Joueur moyen, barricade infinie, sans pouvoirs ni défenses, moyenne de 2 parties. On mesure les dégâts que la barricade encaisse pendant la vague sans son boss (plus bas = mieux, le meilleur est en gras), et le temps pour tuer le boss seul. '
      + 'Règle visée : une arme plus chère doit faire au moins aussi bien que « garder l’arme d’avant et l’améliorer », ou être nettement meilleure contre le boss.\n\n' + out.duel.map(mdDuel).join('');
  }
  for (const j of joueurs){
    if (quoi === 'tout' || quoi === 'toit' || quoi === 'infini'){
      const p = await page(b);
      console.log('Saint-Clou, chaque stratégie d’achat, joueur ' + j + '...');
      const cmp = await p.evaluate(o => SIM.comparer(o), { joueur: j, graine, ville: 0 });
      out.toit[j + '_strategies'] = cmp;
      md += '## Saint-Clou selon la façon d’acheter les armes : joueur ' + cmp.joueur.toLowerCase() + '\n\nUne partie par stratégie, profil neuf.\n\n| Stratégie | Résultat | Vagues | Barricade à la fin (plus bas) | Arme à la fin |\n|---|---|---|---|---|\n'
        + cmp.parties.map(r => '| ' + NOM_STRAT[r.strategie] + ' | ' + (r.gagne ? 'Libérée' : 'Perdue') + ' | ' + r.tenues + ' / ' + r.sur + ' | ' + pct(r.bar) + ' (' + pct(r.barMin) + ') | ' + r.arme + ' |').join('\n') + '\n\n';
      cmp.parties.forEach(r => console.log('  ' + r.strategie + ' : ' + (r.gagne ? 'libérée' : 'perdue') + ', ' + r.tenues + '/' + r.sur));
      console.log('Campagne, joueur ' + j + ', stratégie ' + strategie + '...');
      const c = await p.evaluate(o => SIM.campagne(o), { joueur: j, graine, essais: 3, maxMin: 40, strategie });
      out.toit[j] = c;
      md += '## Campagne : joueur ' + c.joueur.toLowerCase() + '\n\nAchat des armes : ' + NOM_STRAT[c.strategie] + '. Jusqu’à 3 essais par ville, le profil (niveau, talents, ferraille, défenses) est gardé d’une partie à l’autre.\n\n' + mdToit(c) + '\nFin : niveau ' + c.niveau + ', ' + c.ferraille + ' ferrailles.\n\n';
      c.parties.forEach(r => console.log('  ' + r.ville + ' essai ' + r.essai + ' : ' + (r.gagne ? 'libérée' : 'perdue') + ', ' + r.tenues + '/' + r.sur + ' vagues, barricade ' + r.bar + ' %'));
      if (quoi === 'tout' || quoi === 'infini'){
        const fini = c.parties.filter(r => r.gagne).length === LOCS_N;
        console.log('Mode infini, joueur ' + j + '...');
        const inf = await p.evaluate(o => SIM.infini(o), { joueur: j, graine, villes: [0, 4], maxMin: 60 });
        out.infini[j] = inf;
        md += '### Mode infini (' + (fini ? 'profil de fin de campagne' : 'profil où la campagne s’est arrêtée, forcé même si le mode n’est pas débloqué') + ')\n\n' + mdInf(inf) + '\n';
        inf.parties.forEach(r => console.log('  infini ' + r.ville + ' : ' + r.tenues + ' vagues'));
      }
      await p.close();
    }
  }
  if (quoi === 'tout' || quoi === 'rts'){
    const p = await page(b);
    md += '## Guerre des robots (RTS)\n\nLe robot-joueur bâtit une usine lourde, un récupérateur, un atelier de réparation, des tourelles devant la base (5, plus 2 par nid détruit, plus une toutes les 3 minutes), '
      + 'achète l’unité la plus forte qu’il peut payer (10, plus 3 par nid détruit, plus une toutes les 90 secondes), des améliorations dès qu’il a de l’argent en trop. Deux façons de jouer : il attaque le nid le plus proche dès qu’il a 8 unités au sol, '
      + 'ou il garde toute son armée à la base. Une ligne toutes les 5 minutes de jeu. Rappel : menace = 1 + minutes / 4 + 0,5 par nid détruit + zombies tués / 600.\n\n';
    out.rts = {};
    for (const [cle, attaque, titre] of [['attaque', true, 'Il attaque les nids'], ['defense', false, 'Il reste à la base']]){
      const p2 = await page(b);
      console.log('RTS, ' + titre.toLowerCase() + ' (60 min de jeu au plus)...');
      const r = await p2.evaluate(o => SIM.rts(o), { graine, maxMin: 60, attaque });
      out.rts[cle] = r;
      md += '### ' + titre + '\n\n' + mdRts(r) + '\n';
      console.log('  fin : ' + r.fin.min + ' min, ' + r.fin.nids + ' nids détruits, ' + r.fin.tues + ' tués, QG ' + r.fin.qg + ' %' + (r.fin.tombe ? ' (tombé)' : ''));
      await p2.close();
    }
    await p.close();
  }
  await b.close();
  md += '\n_Simulation faite en ' + Math.round((Date.now() - t0) / 1000) + ' s._\n';
  fs.writeFileSync(path.join(RACINE, 'docs', 'equilibrage.md'), md);
  fs.writeFileSync(path.join(RACINE, 'docs', 'equilibrage.json'), JSON.stringify(out, null, 1));
  console.log('Rapport : docs/equilibrage.md');
})().catch(e => { console.error(e); process.exit(1); });
