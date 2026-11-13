'use strict';
/* ================= Simulateur d'équilibrage ================= */
// Fait jouer le robot-joueur (outils/sim-bot.js) dans le vrai jeu, en accéléré, et écrit un rapport :
//   docs/equilibrage.md (tableaux en français) et docs/equilibrage.json (les chiffres bruts).
// Usage :
//   python3 -m http.server 8765      (à la racine du dépôt, dans un autre terminal)
//   node outils/simulateur.js [quoi] [joueurs] [graine]
//     quoi    : tout (défaut), duel, toit, infini, rts, robot
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
  await p.addScriptTag({ path: path.join(__dirname, 'sim-bot-robot.js') }); // mode robot (SIM.robot)
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

/* ---------- Mode robot (outils/sim-bot-robot.js) ---------- */
// node outils/simulateur.js robot [joueurs] [graine]   (joueurs par défaut : debutant,moyen,bon)
// Variables d'environnement : SIM_ROBOT = parties à faire, parmi neuf,carrefour,banc,progression (défaut : toutes) ;
//   SIM_COURSES = courses par ligne (défaut 4) ; SIM_PAGES = pages en même temps (défaut 2).
const ROBOT_BUDGETS = [2500, 7500, 20000]; // ferraille d'environ 1, 3 et 7 courses
const ROBOT_LOTS = [{ nom:'rien (ferraille gardée)', strat:'rien' }, { nom:'toujours le moins cher', strat:'moinsCher' }]
  .concat(['armor', 'mdmg', 'cool', 'rdmg', 'rrate', 'salvo', 'legs', 'repair', 'regen'].map(k => ({ ligne:k, strat:'ligne:' + k })))
  .concat(['flamer', 'laser', 'gl', 'arc', 'railgun'].map(id => ({ arme:id, strat:'arme:' + id })));
const NOM_LIGNE = { armor:'Blindage', mdmg:'Bras gauche : dégâts', cool:'Bras gauche : refroidissement', rdmg:'Bras droit : dégâts', rrate:'Bras droit : cadence', salvo:'Salve', legs:'Jambes', repair:'Réparation', regen:'Nanorobots' };
const NOM_ARME_R = { minigun:'Minigun', rocket:'Roquettes', flamer:'Lance-flammes lourd', laser:'Laser lourd', gl:'Lance-grenades', arc:'Arc électrique', railgun:'Canon électromagnétique' };
const nomLot = L => L.nom || (L.ligne ? 'tout en « ' + NOM_LIGNE[L.ligne] + ' »' : NOM_ARME_R[L.arme] + ', le reste au moins cher');
const vir = v => String(v).replace('.', ',');
const moy = (a, f) => a.reduce((s, x) => s + f(x), 0) / a.length;
function stat(a, f, dec){ const v = a.map(f), k = Math.pow(10, dec || 0), r = x => vir(Math.round(x * k) / k); return r(moy(a, f)) + ' (' + r(Math.min.apply(null, v)) + ' à ' + r(Math.max.apply(null, v)) + ')'; }
function sources(cs){
  const s = {}; let tot = 0; cs.forEach(c => Object.keys(c.deg).forEach(k => { s[k] = (s[k] || 0) + c.deg[k]; tot += c.deg[k]; }));
  const NOMS = { stalker:'rôdeur', spider:'araignée', abomination:'abomination', walker:'marcheur', runner:'coureur', crawler:'rampant', bloater:'gonflé', shield:'bouclier', jumper:'sauteur', flyer:'volant', brute:'brute', colossus:'colosse', titan:'Titan', broodmother:'Mère pondeuse', behemoth:'Béhémoth' };
  return Object.keys(s).sort((a, b) => s[b] - s[a]).slice(0, 4).map(k => (NOMS[k] || k) + ' ' + Math.round(100 * s[k] / Math.max(1, tot)) + ' %').join(', ');
}
const ligneRobot = (nom, cs) => '| ' + nom + ' | ' + stat(cs, c => c.rues, 1) + ' | ' + stat(cs, c => c.minutes, 1) + ' | ' + stat(cs, c => c.tues) + ' | ' + stat(cs, c => c.degTotal) + ' | ' + stat(cs, c => c.ferraille) + ' | ' + sources(cs) + ' |\n';
const ENTETE_R = '| Joueur et profil | Rues traversées | Minutes | Zombies tués | Dégâts encaissés | Ferraille gagnée | D’où viennent les dégâts |\n|---|---|---|---|---|---|---|\n';
function mdRobot(r){
  let h = '## Robot de combat\n\nLe robot-joueur (`outils/sim-bot-robot.js`) pilote le robot par ses vraies commandes : il avance dans la rue, s’arrête quand trop de zombies le frappent et repart quand les renforts arrivent ou que son blindage passe sous la moitié, '
    + 'vise d’abord ceux qui le frappent, puis les cracheurs, le boss, le plus proche (derrière lui, il ne voit que ceux qui sont assez près : 4 m pour le débutant, 15 m pour le moyen, 35 m pour le bon), '
    + 'lâche la gâchette avant la surchauffe (le débutant tient jusqu’au blocage), tire le bras droit dans les groupes (le débutant dès que c’est prêt), '
    + 'fait un pas de côté contre les crachats (30 %, 65 % ou 90 % des fois selon le niveau). Moyenne de ' + r.courses + ' courses par ligne (plus bas et plus haut entre parenthèses). '
    + '« Rues traversées » compte la rue où il tombe en partie (5,5 = tombé au milieu de la 6e rue).\n\n';
  if (r.neuf){
    h += '### Par niveau de joueur\n\n« Garage » : ferraille donnée à un profil neuf, dépensée toujours dans l’amélioration la moins chère (sans arme).\n\n' + ENTETE_R;
    r.neuf.forEach(l => { h += ligneRobot(l.joueur + ', ' + l.profil, l.courses); });
    h += '\n';
  }
  if (r.carrefour){
    h += '### Avec le carrefour\n\nDans le jeu, le carrefour n’apparaît jamais (la fin de rue lance le fondu avant lui). Même joueur moyen, profil neuf, si le carrefour était montré '
      + '(rue calme quand il est amoché, sinon la rue qui rapporte le plus) :\n\n' + ENTETE_R + ligneRobot('Moyen, profil neuf, sans carrefour (le jeu)', r.carrefour.sans) + ligneRobot('Moyen, profil neuf, avec carrefour', r.carrefour.avec) + '\n';
  }
  if (r.banc){
    h += '### Garage à ferraille égale\n\nProfil neuf, joueur moyen, même graine pour chaque ligne. Chaque ligne met toute la ferraille dans une seule amélioration (jusqu’à son maximum ; le reste est gardé), '
      + 'ou achète une arme et met le reste dans l’amélioration la moins chère. Règle : un achat plus cher doit faire au moins aussi bien que « toujours le moins cher » avec la même ferraille, ou avoir un rôle clair.\n\n';
    r.banc.forEach(b => {
      h += '#### ' + b.budget.toLocaleString('fr-CA') + ' ⚙\n\n| Achat | Niveaux | Ferraille gardée | Rues traversées | Dégâts encaissés | Zombies tués | Boss abattus |\n|---|---|---|---|---|---|---|\n';
      const ref = Math.max.apply(null, b.lots.map(l => moy(l.courses, c => c.rues)));
      b.lots.forEach(l => {
        const c0 = l.courses[0], niv = Object.keys(c0.lv).filter(k => c0.lv[k]).map(k => k + ' ' + c0.lv[k]).join(', ') || '-';
        const m = moy(l.courses, c => c.rues), r1 = stat(l.courses, c => c.rues, 1);
        h += '| ' + nomLot(l) + ' | ' + niv + ' | ' + c0.reste.toLocaleString('fr-CA') + ' | ' + (m === ref ? '**' + r1 + '**' : r1) + ' | ' + stat(l.courses, c => c.degTotal) + ' | ' + stat(l.courses, c => c.tues) + ' | ' + vir(Math.round(10 * moy(l.courses, c => c.bossTues)) / 10) + ' |\n';
      });
      h += '\n';
    });
  }
  if (r.progression){
    r.progression.forEach(p => {
      h += '### Course après course : joueur ' + p.joueur.toLowerCase() + ', garage « ' + p.nom + ' »\n\nUn seul profil ; après chaque course, la ferraille est dépensée au garage.\n\n'
        + '| Course | Rues traversées | Minutes | Ferraille gagnée | Achats | Ferraille gardée | Prochain achat |\n|---|---|---|---|---|---|---|\n';
      p.courses.forEach(c => {
        const a = {}; c.achats.forEach(k => { a[k] = (a[k] || 0) + 1; });
        h += '| ' + c.n + ' | ' + vir(c.rues) + ' | ' + vir(c.minutes) + ' | ' + c.ferraille.toLocaleString('fr-CA') + ' | ' + (Object.keys(a).map(k => (NOM_ARME_R[k] || NOM_LIGNE[k]) + (a[k] > 1 ? ' ×' + a[k] : '')).join(', ') || '-') + ' | '
          + c.reste.toLocaleString('fr-CA') + ' | ' + (c.prochain ? (NOM_ARME_R[c.prochain.k] || NOM_LIGNE[c.prochain.k]) + ', ' + c.prochain.c.toLocaleString('fr-CA') + ' ⚙' : 'tout est acheté') + ' |\n';
      });
      h += '\n';
    });
  }
  return h;
}
// Toutes les mesures du robot : rend { md, data }
async function simRobot(b){
  const parts = (process.env.SIM_ROBOT || 'neuf,carrefour,banc,progression').split(','), n = +process.env.SIM_COURSES || 4, np = +process.env.SIM_PAGES || 2;
  const gs = Array.from({ length:n }, (_, i) => graine + i), js = process.argv[3] ? joueurs : ['debutant', 'moyen', 'bon'];
  const data = { courses:n };
  // Fait les tâches au plus np à la fois, une page chacune
  async function lot(taches){
    const res = new Array(taches.length); let i = 0;
    await Promise.all(Array.from({ length:Math.min(np, taches.length) }, async () => {
      while (i < taches.length){ const k = i++, p = await page(b); try { res[k] = await p.evaluate(taches[k].f, taches[k].o); if (taches[k].log) console.log('  ' + taches[k].log(res[k])); } catch (e) { console.log('  (tâche perdue : ' + e.message.split('\n')[0] + ')'); res[k] = null; } await p.close().catch(() => {}); }
    }));
    return res;
  }
  const court = r => r.courses.map(c => vir(c.rues)).join(' ');
  if (parts.includes('neuf')){
    console.log('Robot : par niveau de joueur...');
    const t = [];
    js.forEach(j => {
      t.push({ o:{ joueur:j, graines:gs }, f:o => SIM.robot.neuf(o), log:r => r.joueur + ', profil neuf : ' + court(r), profil:'profil neuf', j });
      [7500, 20000].forEach(bu => t.push({ o:{ joueur:j, budget:bu, lots:[{ strat:'moinsCher' }], graines:gs }, f:o => SIM.robot.banc(o).then(r => ({ joueur:r.joueur, courses:r.lots[0].courses })), log:r => r.joueur + ', garage ' + bu + ' : ' + court(r), profil:'garage de ' + bu.toLocaleString('fr-CA') + ' ⚙', j }));
    });
    const rs = await lot(t);
    data.neuf = rs.map((r, k) => r && ({ joueur:r.joueur, profil:t[k].profil, courses:r.courses })).filter(Boolean);
  }
  if (parts.includes('carrefour')){
    console.log('Robot : avec et sans carrefour...');
    const rs = await lot([false, true].map(c => ({ o:{ joueur:'moyen', graines:gs, carrefour:c }, f:o => SIM.robot.neuf(o), log:r => (c ? 'avec' : 'sans') + ' carrefour : ' + court(r) })));
    if (rs[0] && rs[1]) data.carrefour = { sans:rs[0].courses, avec:rs[1].courses };
  }
  if (parts.includes('banc')){
    console.log('Robot : garage à ferraille égale...');
    data.banc = [];
    // SIM_BUDGETS=7500,20000 et SIM_LOTS=moinsCher,ligne:cool,arme:railgun : seulement ces budgets et ces lignes
    const BUD = process.env.SIM_BUDGETS ? process.env.SIM_BUDGETS.split(',').map(Number) : ROBOT_BUDGETS;
    const LOTS = process.env.SIM_LOTS ? ROBOT_LOTS.filter(L => process.env.SIM_LOTS.split(',').includes(L.strat)) : ROBOT_LOTS;
    for (const bu of BUD){
      const rs = await lot(LOTS.map(L => ({ o:{ joueur:'moyen', budget:bu, lots:[L], graines:gs }, f:o => SIM.robot.banc(o), log:r => bu + ' ⚙, ' + nomLot(L) + ' : ' + court(r.lots[0]) })));
      data.banc.push({ budget:bu, lots:rs.map((r, k) => r && Object.assign({}, LOTS[k], { courses:r.lots[0].courses })).filter(Boolean) });
    }
  }
  if (parts.includes('progression')){
    console.log('Robot : course après course...');
    const P2 = [{ nom:'toujours le moins cher', strat:'moinsCher' }, { nom:'le canon électromagnétique dès qu’il peut, puis le moins cher', strat:'malin', armes:['railgun'] }];
    // Une page neuve par course (le profil passe d'une page à l'autre), les stratégies en même temps
    const rs = await Promise.all(P2.map(async s => {
      const courses = []; let pr = null;
      for (let i = 0; i < 12; i++){
        const p = await page(b);
        const x = await p.evaluate(o => SIM.robot.pas(o), { joueur:'moyen', graine, i, P:pr, strat:s.strat, armes:s.armes });
        await p.close(); courses.push(x.ligne); pr = x.P;
        console.log('  ' + s.nom + ', course ' + (i + 1) + ' : ' + vir(x.ligne.rues) + ' rues, ' + x.ligne.ferraille + ' ⚙');
      }
      return { joueur:'Moyen', strat:s.strat, courses };
    }));
    data.progression = rs.map((r, k) => Object.assign(r, { nom:P2[k].nom }));
  }
  return { md:mdRobot(data), data };
}

(async () => {
  const t0 = Date.now();
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], executablePath: process.env.CHROMIUM_PATH || undefined });
  const out = { date: new Date().toISOString().slice(0, 10), graine, duel: null, toit: {}, infini: {}, rts: null, robot: null };
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
  if (quoi === 'tout' || quoi === 'robot'){ const r = await simRobot(b); out.robot = r.data; md += r.md; }
  await b.close();
  md += '\n_Simulation faite en ' + Math.round((Date.now() - t0) / 1000) + ' s._\n';
  // SIM_SORTIE=/chemin/nom : écrit nom.md et nom.json là, au lieu de docs/equilibrage.* (pour les essais)
  const sortie = process.env.SIM_SORTIE || path.join(RACINE, 'docs', 'equilibrage');
  fs.writeFileSync(sortie + '.md', md);
  fs.writeFileSync(sortie + '.json', JSON.stringify(out, null, 1));
  console.log('Rapport : ' + sortie + '.md');
})().catch(e => { console.error(e); process.exit(1); });
