'use strict';
/* ================= Succès du robot et du RTS ================= */
// Ajoutés à la liste des succès (ACH, js/30-missions.js) : même écran, mêmes paliers, ferraille à l'obtention.
// Compteurs à vie dans P.st (valeur par défaut 0, anciennes sauvegardes OK) :
//   mechStreet : record de rues traversées en une course ; mechKills : zombies abattus avec le robot
//   rtsNests : nids détruits (toutes parties) ; rtsMin : record de minutes tenues dans une partie ; rtsBoss : boss abattus au RTS
// Les succès du robot restent cachés tant que le robot n'est pas débloqué.

const ACH_MODES = [
  { id:'mechStreet', name:'Briseur de rues',     stat:'mechStreet', tiers:[[5, 200], [15, 800], [30, 2500]], hide:() => !(typeof mechUnlocked === 'function' && mechUnlocked()), desc:g => msN(g) + ' rues traversées en une course de robot' },
  { id:'mechKills',  name:'Broyeur',             stat:'mechKills',  tiers:[[500, 100], [5000, 600], [25000, 2000]], hide:() => !(typeof mechUnlocked === 'function' && mechUnlocked()), desc:g => msN(g) + ' zombies abattus avec le robot' },
  // Dossier 102 : course de 9 rues gagnée, tour réussi (js/40-robot-fin.js). Comptés à partir de P.mechFin, toujours à jour.
  { id:'mechWins',   name:'Course réussie',      stat:'mechWins',   tiers:[[1, 300], [5, 1000], [20, 3000]], hide:() => !(typeof mechUnlocked === 'function' && mechUnlocked()), desc:g => msN(g) + ' course' + (g > 1 ? 's' : '') + ' de robot réussie' + (g > 1 ? 's' : '') + ' (9 rues et le boss final)' },
  { id:'mechTour',   name:'Grimpeur de tours',   stat:'mechTour',   tiers:[[3, 800], [6, 2500], [10, 6000]], hide:() => !(typeof mechUnlocked === 'function' && mechUnlocked()), desc:g => 'Réussis le tour ' + msN(g) + ' de la course du robot' },
  { id:'rtsNests',   name:'Démolisseur de nids', stat:'rtsNests',   tiers:[[3, 150], [15, 700], [50, 2500]], desc:g => msN(g) + ' nids détruits dans la guerre des robots' },
  { id:'rtsMin',     name:'Tenir le fort',       stat:'rtsMin',     tiers:[[10, 150], [30, 600], [60, 2000]], desc:g => 'Tiens ' + msN(g) + ' minutes dans une même guerre des robots' },
  { id:'rtsBoss',    name:'Chasseur de colosses', stat:'rtsBoss',   tiers:[[1, 100], [10, 500], [30, 1500]], desc:g => msN(g) + ' boss abattu' + (g > 1 ? 's' : '') + ' dans la guerre des robots' }
];
ACH_MODES.forEach(a => { if (!ACH.some(b => b.id === a.id)){ ACH.push(a); (ACH_BY[a.stat] = ACH_BY[a.stat] || []).push(a); } });

// Compteurs : les tués du robot par l'événement commun 'tue' ; le reste en regardant l'état des modes à chaque image
const SM = { nests:0, boss:0, street:0, min:0, rtsOn:false, t:0 };
Jeu.on('tue', (z, was) => { if (was && state === 'mech' && MECH.on) msAdd('mechKills'); });
Jeu.on('image', () => {
  if (RTS.on){
    // Nouvelle partie (ou « Rejouer » : le temps repart à zéro) : on repart du compte actuel
    if (!SM.rtsOn || (RTS.t || 0) < SM.t){ SM.rtsOn = true; SM.nests = RTS.nests.filter(n => n.dead).length; SM.boss = RTS.bossKills || 0; SM.min = 0; }
    const nd = RTS.nests.filter(n => n.dead).length; if (nd > SM.nests){ msAdd('rtsNests', nd - SM.nests); SM.nests = nd; }
    if ((RTS.bossKills || 0) > SM.boss){ msAdd('rtsBoss', RTS.bossKills - SM.boss); SM.boss = RTS.bossKills; }
    const m = Math.floor((RTS.t || 0) / 60); if (m > SM.min){ SM.min = m; msMax('rtsMin', m); }
    SM.t = RTS.t || 0;
  } else SM.rtsOn = false;
  if (MECH.on){ const r = (MECH.street || 1) - 1; if (r !== SM.street){ SM.street = r; if (r > 0) msMax('mechStreet', r); } }
  else SM.street = 0;
});

// Course du robot réussie (appelé par mechWin, js/40-robot-fin.js)
function smMechWin(t){ msAdd('mechWins'); msMax('mechTour', t); msMax('mechStreet', MECH_FIN.rues); }
// Au chargement : les compteurs repris du profil du robot (P.st perd les compteurs qu'il ne connaît pas en se remettant en ordre)
try { const F = mechFinNorm(); msMax('mechWins', F.wins); msMax('mechTour', F.tour); } catch (e) { errNote(e); }

// Accès pour les tests automatiques
window.__succesModes = { ACH_MODES, SM, smMechWin };
