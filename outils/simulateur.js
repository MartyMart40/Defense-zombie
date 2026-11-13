'use strict';
/* ================= Simulateur d'équilibrage ================= */
// Fait jouer le robot-joueur (outils/sim-bot.js) dans le vrai jeu, en accéléré, et écrit un rapport :
//   docs/equilibrage.md (tableaux en français) et docs/equilibrage.json (les chiffres bruts).
// Usage :
//   python3 -m http.server 8765      (à la racine du dépôt, dans un autre terminal)
//   node outils/simulateur.js [quoi] [joueurs] [graine]
//     quoi    : tout (défaut), duel, toit, infini, rts, rts-banc, robot
//     joueurs : liste séparée par des virgules parmi debutant, moyen, bon (défaut : moyen,bon)
//     graine  : nombre pour le hasard (défaut 1) ; même graine = mêmes parties
//     strategie : achat des armes pour la campagne : malin (défaut), boutique, patient, pistolet ou pompe (voir outils/sim-bot.js)
// Durée : quelques minutes par joueur. Le jeu n'est pas modifié.
// RTS (robot-joueur : outils/sim-bot-rts.js) :
//   node outils/simulateur.js rts [stratégies] [graines] [minutes]
//     stratégies : tourelles, blindes, air, mixte, séparées par des virgules (défaut : les quatre)
//     graines : ex. 1,2 (défaut 1,2) ; minutes : durée de jeu au plus (défaut 60)
//   node outils/simulateur.js rts-banc [menaces] [graines] [secondes] [unités]
//     banc des appuis : une armée au sol fixe plus 9 000 $ d'un seul type, menaces ex. 5,8,14 (défaut), graines 1,2, 150 s
//     [unités] : seulement les lots qui contiennent ces unités, ex. jet,warthog (sans le banc des améliorations)
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
/* ---------- RTS : rapport ---------- */
const RTS_SIM = { strategies:['tourelles', 'blindes', 'air', 'mixte'], graines:[1, 2], maxMin:60, menaces:[5, 8, 14], duree:150, lots:null };
if (quoi === 'rts' || quoi === 'rts-banc'){
  const liste = (i, f) => (process.argv[i] || '').split(',').filter(Boolean).map(f);
  if (quoi === 'rts'){
    if (process.argv[3]) RTS_SIM.strategies = liste(3, String);
    if (process.argv[4]) RTS_SIM.graines = liste(4, Number);
    if (process.argv[5]) RTS_SIM.maxMin = +process.argv[5];
  } else {
    if (process.argv[3]) RTS_SIM.menaces = liste(3, Number);
    if (process.argv[4]) RTS_SIM.graines = liste(4, Number);
    if (process.argv[5]) RTS_SIM.duree = +process.argv[5];
    if (process.argv[6]) RTS_SIM.lots = liste(6, String); // seulement les lots qui contiennent ces unités (et la référence)
  }
}
async function pageRts(b){
  const p = await page(b);
  await p.addScriptTag({ path: path.join(__dirname, 'sim-bot-rts.js') });
  return p;
}
const v1 = x => String(x).replace('.', ',');
const mn = s => s == null ? 'jamais' : v1(Math.round(s / 6) / 10) + ' min';
const nf = x => Math.round(x).toLocaleString('fr-CA');
function mdRtsResume(parties){
  let h = '| Stratégie | Graine | Fin | Nids détruits | Tués | Unités perdues | 1re unité perdue | 1re tourelle perdue | 1er coup au QG | QG de 90 % à 0 | Part des boss dans les dégâts au QG | Dépenses : unités, bâtiments, tourelles, améliorations |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n';
  parties.forEach(r => {
    const A = r.achats;
    h += '| ' + r.nom + ' | ' + r.graine + ' | ' + (r.fin.tombe ? '**QG tombé à ' + v1(r.fin.min) + ' min**' : 'tient à ' + v1(r.fin.min) + ' min') + ' | ' + r.fin.nids + ' | ' + nf(r.fin.tues) + ' | ' + r.fin.perdues + ' | '
      + mn(r.cles.premUnite) + ' | ' + mn(r.cles.premTourelle) + ' | ' + mn(r.cles.premQG) + ' | ' + (r.cles.chute == null ? '' : r.cles.chute + ' s') + ' | ' + (r.cles.premQG == null ? '' : r.chute.partBoss + ' %') + ' | '
      + [A.depUnites, A.depBats, A.depTour, A.depAmel].map(x => nf(x / 1000) + ' k$').join(', ') + ' |\n';
  });
  return h;
}
function mdRtsCourbe(r){
  let h = '| Minute | Nids détruits | Unités | Tourelles | Argent | Menace | Vie du QG | Zombies en vie | À moins de 45 m du QG | Boss en vie | Tués | Unités perdues |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n';
  const L = r.courbe.filter(s => (s.min % 5 === 0 || s.min > r.fin.min - 2.6) && s.min < r.fin.min);
  L.concat([r.fin]).forEach(s => { h += '| ' + v1(s.min) + ' | ' + s.nids + ' | ' + s.unites + ' | ' + s.tourelles + ' | ' + nf(s.argent) + ' $ | ' + v1(s.menace) + ' | ' + pct(s.qg) + ' | ' + s.zombies + ' | ' + s.pres + ' | ' + (s.boss || 'aucun') + ' | ' + nf(s.tues) + ' | ' + s.perdues + ' |\n'; });
  return h;
}
// Banc des appuis : les lots mesurés (9 000 $ au plus en unités d'un seul type ; le bâtiment requis est posé gratuitement et dit à part)
const BANC_LOTS = [
  { nom:'Référence seule', unites:{} },
  { nom:'Mitrailleurs', unites:{ gunner:22 } },
  { nom:'Lance-roquettes', unites:{ rocket:12 } },
  { nom:'Mechs lourds', unites:{ heavy:6 } },
  { nom:'Mech de combat', unites:{ mech:1 } },
  { nom:'Tanks', unites:{ tank:5 } },
  { nom:'Apaches', unites:{ heli:4 } },
  { nom:'Chasseurs', unites:{ jet:3 } },
  { nom:'Warthogs', unites:{ warthog:2 } },
  { nom:'AC-130', unites:{ bomber:2 } }
];
// Améliorations contre unités, à la menace du milieu : même somme
const BANC_AMEL = [
  { nom:'5 mitrailleurs de plus (2 000 $)', unites:{ gunner:5 } },
  { nom:'Améliorations des mitrailleurs (1 984 $ : Armes 2, Blindage 2, Cadence 1)', unites:{}, amel:{ gunner:{ arm:2, hp:2, rate:1 } } },
  { nom:'4 tanks (7 200 $)', unites:{ tank:4 } },
  { nom:'3 tanks et Armes 1 (6 840 $)', unites:{ tank:3 }, amel:{ tank:{ arm:1 } } },
  { nom:'3 tanks et Blindage réactif 1 (7 200 $)', unites:{ tank:3 }, amel:{ tank:{ reactive:1 } } }
];
const BAT_NOM = { heavyfac:'usine lourde', vehdepot:'garage', heliport:'héliport', airfield:'aérodrome' };
function mdBanc(lignes, menaces){
  let h = '| Appui | Prix des unités | Bâtiment requis (à part) | ' + menaces.map(m => 'Menace ' + v1(m)).join(' | ') + ' |\n|---|---|---|' + menaces.map(() => '---').join('|') + '|\n';
  lignes.forEach(L => {
    const r0 = L.res[0], bat = Object.keys(r0.batiments).map(f => (r0.batiments[f] > 1 ? r0.batiments[f] + ' ' : '') + BAT_NOM[f] + (f === 'heavyfac' ? ' (déjà dans la référence)' : '')).join(', ');
    h += '| ' + L.nom + ' | ' + nf(r0.prixUnites + r0.prixAmel) + ' $ | ' + (bat ? bat + ' ' + nf(r0.prixBat) + ' $' : 'aucun') + ' | ';
    h += menaces.map(m => {
      const R = L.res.filter(r => r.menace === m); if (!R.length) return '';
      const moy = k => R.reduce((s, r) => s + r[k], 0) / R.length, tenu = R.reduce((s, r) => s + (r.tombe != null ? r.tombe : r.duree), 0) / R.length;
      const nt = R.filter(r => r.tombe == null).length;
      return (nt === R.length ? '**tient**' : nf(tenu) + ' s' + (nt ? ' (tient ' + nt + ' fois sur ' + R.length + ')' : '')) + ' · ' + nf(moy('tues')) + ' tués · ' + nf(moy('degatsBase')) + ' de dégâts · ' + v1(Math.round(moy('pertesAppui') * 10) / 10) + ' sur ' + r0.nAppui + ' perdus';
    }).join(' | ') + ' |\n';
  });
  return h + '\nDans chaque case : combien de temps le QG a tenu (moyenne ; « tient » : debout au bout du banc), zombies tués, dégâts encaissés par les bâtiments, unités d’appui perdues.\n';
}

/* ---------- Mode robot (outils/sim-bot-robot.js) ---------- */
// node outils/simulateur.js robot [joueurs] [graine]   (joueurs par défaut : debutant,moyen,bon)
// Variables d'environnement : SIM_ROBOT = parties à faire, parmi neuf,banc,progression,plafond (défaut : neuf,banc,progression) ;
//   SIM_COURSES = courses par ligne, donc graines (défaut 4) ; SIM_PAGES = pages en même temps (défaut 2) ;
//   SIM_PROG_N = courses de la progression (défaut 12) ; SIM_PROG_STRATS = moinsCher,canon (défaut : les deux).
// Une course : 9 rues et un boss final (js/40-robot-fin.js). La progression part au tour suivant après une victoire.
// « plafond » : tout le garage acheté, les tours l'un après l'autre jusqu'à la première défaite (minigun et roquettes, puis
//   minigun et canon électromagnétique).
const ROBOT_BUDGETS = [2500, 7500, 20000]; // ferraille d'environ 1, 3 et 7 courses
const ROBOT_LOTS = [{ nom:'rien (ferraille gardée)', strat:'rien' }, { nom:'toujours le moins cher', strat:'moinsCher' }]
  .concat(['armor', 'mdmg', 'cool', 'rdmg', 'rrate', 'salvo', 'legs', 'repair', 'regen'].map(k => ({ ligne:k, strat:'ligne:' + k })))
  .concat(['flamer', 'laser', 'gl', 'arc', 'railgun'].map(id => ({ arme:id, strat:'arme:' + id })));
const NOM_LIGNE = { armor:'Blindage', mdmg:'Bras gauche : dégâts', cool:'Bras gauche : refroidissement', rdmg:'Bras droit : dégâts', rrate:'Bras droit : cadence', salvo:'Salve', legs:'Jambes', repair:'Réparation', regen:'Nanorobots' };
const NOM_ARME_R = { minigun:'Minigun', rocket:'Roquettes', flamer:'Lance-flammes lourd', laser:'Laser lourd', gl:'Lance-grenades', arc:'Arc électrique', railgun:'Canon électromagnétique' };
const nomLot = L => L.nom || (L.ligne ? 'tout en « ' + NOM_LIGNE[L.ligne] + ' »' : NOM_ARME_R[L.arme] + ', le reste au moins cher');
const vir = v => String(v).replace('.', ',');
// Niveau maximum de chaque amélioration du garage (MECH_UPG, js/39-robot.js) : « garage au complet » (les armes à part)
const MAX_LV = { armor:10, mdmg:10, cool:8, rdmg:10, rrate:8, salvo:2, legs:6, repair:5, regen:5 };
const lvMax = c => !!c.lv && Object.keys(MAX_LV).every(k => (c.lv[k] || 0) >= MAX_LV[k]);
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
  if (r.neuf && r.neuf.some(l => l.courses.some(c => c.parRue))){
    h += '### Dégâts par rue, profil neuf\n\nMoyenne des courses de chaque joueur (rue : dégâts encaissés).\n\n| Joueur | Rue 1 | Rue 2 | Rue 3 | Rue 4 | Rue 5 | Rue 6 | Rue 7 | Rue 8 | Rue 9 |\n|---|---|---|---|---|---|---|---|---|---|\n';
    r.neuf.filter(l => l.profil === 'profil neuf').forEach(l => {
      const cs = []; for (let k = 1; k <= 9; k++){ const v = l.courses.map(c => (c.parRue || []).find(x => x.rue === k)).filter(Boolean); cs.push(v.length ? Math.round(moy(v, x => x.deg)) + (v.length < l.courses.length ? ' (' + v.length + ')' : '') : '-'); }
      h += '| ' + l.joueur + ' | ' + cs.join(' | ') + ' |\n';
    });
    h += '\n';
  }
  if (r.plafond){
    h += '### Plafond avec tout le garage\n\nTout le garage acheté, les tours l’un après l’autre jusqu’à la première défaite. « Meilleur tour » : le dernier tour gagné.\n\n| Joueur | Armes | Meilleur tour (par graine) | Moyenne |\n|---|---|---|---|\n';
    r.plafond.forEach(l => { h += '| ' + l.joueur + ' | ' + (NOM_ARME_R[l.armes.L] || l.armes.L) + ', ' + (NOM_ARME_R[l.armes.R] || l.armes.R) + ' | ' + l.res.map(x => x.best).join(', ') + ' | ' + vir(Math.round(10 * moy(l.res, x => x.best)) / 10) + ' |\n'; });
    h += '\n';
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
  if (r.progression && r.progression[0] && r.progression[0].graines){
    h += '### Course après course\n\nUn profil neuf par graine ; après chaque course, la ferraille est dépensée au garage. Après une victoire, il part au tour suivant ; après une défaite, il refait le même tour. '
      + 'Chaque case : tour joué, ✔ gagné ou rues traversées, pour chaque graine.\n\n';
    r.progression.forEach(p => {
      const N = Math.max.apply(null, p.graines.map(g => g.courses.length));
      h += '#### Joueur ' + p.joueur.toLowerCase() + ', garage « ' + p.nom + ' »\n\n| Course | ' + p.graines.map(g => 'Graine ' + g.graine).join(' | ') + ' | Ferraille gagnée (moyenne) |\n|---' + p.graines.map(() => '|---').join('') + '|---|\n';
      for (let i = 0; i < N; i++){
        const cs = p.graines.map(g => g.courses[i]).filter(Boolean);
        h += '| ' + (i + 1) + ' | ' + p.graines.map(g => { const c = g.courses[i]; return c ? 'T' + c.tour + ' ' + (c.gagne ? '✔' : vir(c.rues)) : '-'; }).join(' | ') + ' | ' + Math.round(moy(cs, c => c.ferraille)).toLocaleString('fr-CA') + ' |\n';
      }
      const prem = p.graines.map(g => { const k = g.courses.findIndex(c => c.gagne); return k < 0 ? '-' : k + 1; });
      h += '\nPremière victoire à la course : ' + prem.join(', ') + '. Meilleur tour réussi après ' + N + ' courses : ' + p.graines.map(g => g.courses.length ? g.courses[g.courses.length - 1].meilleurTour : 0).join(', ')
        + '. Améliorations toutes au maximum à la course : ' + p.graines.map(g => { const k = g.courses.findIndex(lvMax); return k < 0 ? '-' : k + 1; }).join(', ') + '.\n\n';
    });
  }
  if (r.progression && r.progression[0] && !r.progression[0].graines){
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
  const parts = (process.env.SIM_ROBOT || 'neuf,banc,progression').split(','), n = +process.env.SIM_COURSES || 4, np = +process.env.SIM_PAGES || 2;
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
  const court = r => r.courses.map(c => c.gagne ? '✔' + (c.tour > 1 ? c.tour : '') : vir(c.rues)).join(' ');
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
  if (parts.includes('plafond')){
    console.log('Robot : plafond avec tout le garage...');
    const AR = [{ L:'minigun', R:'rocket' }, { L:'minigun', R:'railgun' }], t = [];
    js.forEach(j => AR.forEach(a => gs.forEach(g => t.push({ j, a, g, o:{ joueur:j, graine:g, armes:a }, f:o => SIM.robot.plafond(o), log:r => r.joueur + ', ' + r.armes.L + ' + ' + r.armes.R + ', graine ' + g + ' : tour ' + r.best + ' (' + r.courses.map(c => c.gagne ? '✔' : vir(c.rues)).join(' ') + ')' }))));
    const rs = await lot(t);
    data.plafond = [];
    js.forEach(j => AR.forEach(a => { const res = rs.filter((r, k) => r && t[k].j === j && t[k].a === a); if (res.length) data.plafond.push({ joueur:res[0].joueur, armes:a, res }); }));
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
    const P2 = [{ id:'moinsCher', nom:'toujours le moins cher', strat:'moinsCher' }, { id:'canon', nom:'le canon électromagnétique dès qu’il peut, puis le moins cher', strat:'malin', armes:['railgun'] }]
      .filter(s => !process.env.SIM_PROG_STRATS || process.env.SIM_PROG_STRATS.split(',').includes(s.id));
    const NP = +process.env.SIM_PROG_N || 12, jp = process.argv[3] ? joueurs : ['moyen'];
    // Une page neuve par course (le profil passe d'une page à l'autre) ; chaque suite (joueur, stratégie, graine) à part,
    // au plus SIM_PAGES suites en même temps
    const suites = []; jp.forEach(j => P2.forEach(s => gs.forEach(g => suites.push({ j, s, g }))));
    const res = new Array(suites.length); let ix = 0;
    await Promise.all(Array.from({ length:Math.min(np, suites.length) }, async () => {
      while (ix < suites.length){
        const k = ix++, { j, s, g } = suites[k], courses = []; let pr = null;
        for (let i = 0; i < NP; i++){
          const p = await page(b);
          try {
            const x = await p.evaluate(o => SIM.robot.pas(o), { joueur:j, graine:g, i, P:pr, strat:s.strat, armes:s.armes });
            courses.push(x.ligne); pr = x.P;
            console.log('  ' + j + ', ' + s.id + ', graine ' + g + ', course ' + (i + 1) + ' : tour ' + x.ligne.tour + (x.ligne.gagne ? ' gagné' : ', ' + vir(x.ligne.rues) + ' rues') + ', ' + x.ligne.ferraille + ' ⚙, meilleur tour ' + x.ligne.meilleurTour + (lvMax(x.ligne) ? ', améliorations au maximum' : ''));
          } catch (e) { console.log('  (course perdue : ' + e.message.split('\n')[0] + ')'); }
          await p.close().catch(() => {});
        }
        res[k] = { graine:g, courses };
      }
    }));
    data.progression = [];
    jp.forEach(j => P2.forEach(s => { const gr = suites.map((x, k) => x.j === j && x.s === s ? res[k] : null).filter(Boolean); data.progression.push({ joueur:j.charAt(0).toUpperCase() + j.slice(1), strat:s.strat, nom:s.nom, graines:gr }); }));
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
    md += '## Guerre des robots (RTS)\n\nLe robot-joueur du RTS (`outils/sim-bot-rts.js`) passe par les vraies fonctions du jeu : pose sur le quadrillage, achat, améliorations, ordres de marche et d’attaque, « Tenir », point de ralliement. '
      + 'Il ne pilote jamais : le pilotage n’est pas mesuré. Il décide toutes les 2 secondes de jeu, sans hésiter : un vrai joueur est plus lent à réagir, mais il voit mieux le danger.\n\n'
      + 'Pour blindés, air et mixte : point de ralliement devant la base ; une garde qui reste à la base (les tireurs d’élite, lance-roquettes et mechs lourds de la garde « tiennent » la ligne) ; '
      + 'un groupe d’attaque qui part sur le nid le plus proche quand il est assez fort, revient s’il fond ou si un boss arrive à 25 m du QG ou que le QG passe sous 85 % ; les unités sous 40 % de vie envoyées à l’atelier, puis renvoyées à la ligne ; les pertes remplacées.\n\n'
      + 'Rappel : menace = 1 + minutes / 4 + 0,5 par nid détruit + zombies tués / 600.\n\n';
    const parties = [];
    for (const g of RTS_SIM.graines) for (const st of RTS_SIM.strategies){
      const p2 = await pageRts(b);
      console.log('RTS, stratégie ' + st + ', graine ' + g + ' (' + RTS_SIM.maxMin + ' min de jeu au plus)...');
      const r = await p2.evaluate(o => SIM.rts(o), { strategie: st, graine: g, maxMin: RTS_SIM.maxMin });
      parties.push(r);
      console.log('  fin : ' + r.fin.min + ' min, ' + r.fin.nids + ' nids, ' + r.fin.tues + ' tués, ' + r.fin.perdues + ' perdues, QG ' + r.fin.qg + ' %' + (r.fin.tombe ? ' (tombé, de 90 % à 0 en ' + r.cles.chute + ' s)' : ''));
      await p2.close();
    }
    out.rts = { parties };
    const noms = {}; parties.forEach(r => { noms[r.strategie] = r; });
    md += '### Une ligne par partie\n\n' + mdRtsResume(parties) + '\n';
    md += 'Ce que fait chaque stratégie :\n\n' + Object.keys(noms).map(k => '- ' + noms[k].nom + ' : ' + (noms[k].desc || '')).join('\n') + '\n\n';
    const ex = parties.find(r => r.strategie === 'mixte' && r.fin.tombe) || parties.find(r => r.fin.tombe) || parties[parties.length - 1];
    md += '### Courbe d’une partie : ' + ex.nom.toLowerCase() + ', graine ' + ex.graine + '\n\nUne ligne toutes les 5 minutes, puis toutes les 30 s pendant les 2 dernières minutes et demie.\n\n' + mdRtsCourbe(ex) + '\n';
  }
  if (quoi === 'rts-banc'){
    md += '## Banc des appuis du RTS\n\nUne armée au sol fixe (6 mitrailleurs, 4 fantassins, 2 lance-roquettes en ligne à 20 m devant le QG, les 3 tourelles mitrailleuses du départ et 2 tourelles canon), sans amélioration, '
      + 'plus un appui d’un seul type (9 000 $ au plus ; le bâtiment requis est posé gratuitement, son prix est dit à part). Même flot de zombies pour tous, calqué sur le jeu : 6 nids virtuels à 90-140 m qui pondent comme de vrais nids, '
      + 'une horde toutes les 45 s, un Titan avec la 2e horde, plafond de 500 zombies. Menace fixe pendant ' + RTS_SIM.duree + ' s (les tués ne la font pas monter). Moyenne de ' + RTS_SIM.graines.length + ' graines. '
      + 'Dégâts à la base : tout ce que les bâtiments (QG, tourelles, usines) ont encaissé. Repères, d’après les parties du robot-joueur qui tient bien : menace 5 vers 6 min de jeu, 8 vers 9 min, 14 vers 15 min, 50 vers 60 min (les tués font les deux tiers de la menace).\n\n';
    const lignes = [];
    for (const L of BANC_LOTS.filter(L => !RTS_SIM.lots || !Object.keys(L.unites).length || Object.keys(L.unites).some(t => RTS_SIM.lots.indexOf(t) >= 0))){
      const res = [];
      for (const m of RTS_SIM.menaces) for (const g of RTS_SIM.graines){
        const p2 = await pageRts(b);
        const r = await p2.evaluate(o => SIM.rtsBanc(o), { lot: L, menace: m, graine: g, duree: RTS_SIM.duree });
        res.push(r); await p2.close();
        console.log('  ' + L.nom + ', menace ' + m + ', graine ' + g + ' : ' + r.tues + ' tués, ' + r.degatsBase + ' dégâts à la base, pertes ' + r.pertesRef + ' + ' + r.pertesAppui + (r.tombe != null ? ', QG tombé à ' + Math.round(r.tombe) + ' s' : ''));
      }
      lignes.push({ nom: L.nom, res });
    }
    md += mdBanc(lignes, RTS_SIM.menaces) + '\n';
    const mMid = RTS_SIM.menaces[Math.floor(RTS_SIM.menaces.length / 2)], amel = [];
    for (const L of (RTS_SIM.lots ? [] : BANC_AMEL)){
      const res = [];
      for (const g of RTS_SIM.graines){
        const p2 = await pageRts(b);
        const r = await p2.evaluate(o => SIM.rtsBanc(o), { lot: L, menace: mMid, graine: g, duree: RTS_SIM.duree });
        res.push(r); await p2.close();
        console.log('  ' + L.nom + ', menace ' + mMid + ', graine ' + g + ' : ' + r.tues + ' tués, ' + r.degatsBase + ' dégâts à la base, pertes ' + r.pertesRef + ' + ' + r.pertesAppui);
      }
      amel.push({ nom: L.nom, res });
    }
    md += '### Améliorations contre unités (même banc, menace ' + v1(mMid) + ')\n\n' + mdBanc(amel, [mMid]) + '\n';
    out.rtsBanc = { lots: lignes, amel };
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
