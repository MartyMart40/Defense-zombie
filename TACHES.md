# Suivi des tâches

Fichier tenu par Claude. Statuts : À faire, En cours, Fait, Bloqué.
Les 10 dernières tâches faites sont ici ; les plus anciennes sont dans `docs/historique.md`. Fiches des modes : `docs/robot.md`, `docs/rts.md`.

## En cours

| # | Tâche | Statut | Note |
|---|-------|--------|------|

## À faire

| # | Tâche | Priorité |
|---|-------|----------|
| - | Équilibrage après essais de Martin | Après essais |

Écarté par Martin : choisir 1 bonus parmi 3.

## Fait

| # | Tâche | Date |
|---|-------|------|
| 75 | Tutoriel du toit facultatif : proposé une fois à un nouveau joueur (« Première partie ? » Oui / Non merci), 6 bulles au bon moment (viser, tirer, recharger, barricade, boutique, grenade) avec « Passer le tutoriel », « Revoir le tutoriel » dans Comment jouer ; rien n’est mis en pause (js/53-tutoriel.js, tests/t-tutoriel.js) | 2026-11-04 |
| 74 | RTS : groupes d’unités enregistrés (5 au plus) : pastille « ＋ Groupe » et « G1 »... dans la rangée Unités, appui long ou clic droit pour remplacer, Ctrl+1 à 5 et Maj+1 à 5 à l’ordi, gardés dans la sauvegarde ; astuce ajoutée | 2026-11-04 |
| 73 | Armes neuves plus fortes au départ (leurs améliorations repartent toujours à zéro) : fusil d’assaut 30 dégâts et traverse 2 zombies, sniper 240 dégâts, 1 tir/s, traverse 5, minigun 24 dégâts et traverse 2, lance-roquettes 800 dégâts et recharge 2,6 s, canon électromagnétique 1 300, arc électrique 260. Défaut corrigé : les explosions (roquettes, grenades, pouvoirs, mortier) ne blessaient presque pas le boss ni le colosse (distance mesurée jusqu’au centre de leur gros corps). Test de la vieille route réparé (seul le trajet compte, pas l’arrivée près du QG) | 2026-11-04 |
| 72 | Statistiques à vie : bouton « 📊 Statistiques » sur l’écran titre (temps de jeu par mode, zombies, têtes, boss, survivants, vagues, records de chaque mode, arme préférée avec barres) ; temps et zombies par arme comptés par le registre Jeu (P.vie) (js/52-statistiques.js, tests/t-statistiques.js) | 2026-11-04 |
| 71 | Code : trois gros fichiers coupés sans rien changer (04-arme-en-main en 3 : base, modèles, animations ; 23-rue en 2 : rue, survivants ; 42-rts-unites en 2 : unités et partie, combat) ; crochets d’image des repères, du rendu et des bruitages passés au registre Jeu.on('image') ; les erreurs des écouteurs vont au journal | 2026-11-04 |
| 70 | Journal des erreurs cachées : les 227 `catch (e) {}` du jeu notent maintenant les vraies erreurs de programmation dans JOURNAL (errNote, js/00-base.js) ; les refus du navigateur et les sauvegardes illisibles sont ignorés ; tests/t-journal.js (chargé en dernier) échoue s’il y en a. Aucune trouvée dans les tests ni dans une partie de chaque mode | 2026-11-04 |
| 69 | Robot : course gardée au début de chaque rue, « ▶ Continuer le robot (rue N) » sur l’écran titre (js/50-robot-sauvegarde.js) ; 5 succès pour le robot et le RTS : Briseur de rues, Broyeur, Démolisseur de nids, Tenir le fort, Chasseur de colosses (js/51-succes-modes.js) ; le point de ralliement vise toujours le sol ; tests t-robot-sauvegarde.js et t-succes-modes.js | 2026-11-04 |
| 68 | RTS commandement : mini-carte (nids, unités, zombies, zone vue ; toucher pour y aller), point de ralliement (bouton « 📍 Ralliement », les unités achetées y vont, gardé dans la sauvegarde), alerte « Base attaquée » quand un bâtiment hors de l’écran perd de la vie (toucher pour y aller), « ✋ Tenir » (ni poursuite, ni recul, ni retraite ; gardé dans la sauvegarde), mode photo dans la pause (jeu figé, menus cachés, image à enregistrer ou partager) (js/49-rts-commandement.js, tests/t-rts-commandement.js) | 2026-11-04 |
| 67 | Équilibrage avec le simulateur : fusil à pompe renforcé (30 dégâts par plomb au lieu de 17, 8 plombs, dispersion 0,03 au lieu de 0,055, 8 cartouches, cadence 1,5, recharge 1,5 s, plombs qui traversent 2 zombies) ; menace du RTS surtout liée au temps et aux nids (RTS_THREAT) ; le robot-joueur lance ses pouvoirs et dépense mieux au RTS ; Banlieue Nord pas changée (voir À valider) ; tests/t-equilibrage.js | 2026-11-04 |
| 66 | RTS : choisir les unités une par une. Au doigt : toucher une unité la choisit seule (au lieu de l’ajouter au groupe), retoucher la relâche, appui long pour l’ajouter au groupe ; plus besoin de toucher le modèle exactement (34 pixels autour du doigt). Rangée « Unités » (une pastille par unité avec sa vie ; toucher = choisir seule et y aller). Ordi : Tab (suivante), double-clic (même type à l’écran), Maj+clic ajoute ou retire. Astuces à jour (js/44-rts-interface.js, js/48-rts-liste.js, tests/t-rts-selection.js) | 2026-11-04 |

## À valider par Martin


- Améliorations générales (autre dossier, à décider) : le simulateur montre que ce qui fait gagner Banlieue Nord, c’est la barricade (+100 par niveau : 300 → 1 000 au niveau 5) et les dégâts de toutes les armes (+12 % par niveau), pas l’arme. Celui qui garde le pistolet met tout là-dedans ; celui qui achète des armes finit avec une barricade de 550 à 650. Pistes : barricade +60 par niveau, ou prix qui montent plus vite.

- Améliorations des défenses par emplacement (4 tourelles = 4 à améliorer séparément).
- Ogive : lignes Puissance, Retombées, Souffle, Recharge.
- Vente en deux touches (Vendre puis Confirmer).
- Ferraille : marcheur 0,5, coureur 0,7, costaud 4, × difficulté de la ville. Saint-Clou complet = environ 258.

- Boss : le corps ne prend que 60 % des dégâts, la tête fait environ 4 fois plus mal. Vague 5 de Saint-Clou = 151 zombies (boss compris).

- Q lance maintenant la frappe aérienne (avant : changer d'arme). Molette, 1 à 8 et bouton Arme changent d'arme.
- Pouvoirs : charges pleines à chaque vague.
- Une explosion que le joueur cause tue un civil (pénalité) ; les défenses jamais.

- Mesurer les vraies images/s : ouvrir tests/perf.html sur l'ordi et le cell de Martin.
- Tests du mitrailleur et de la roquette sur un volant : hasard fixé depuis la tâche 62 (plus d’échec au hasard). Si l’un échoue encore, c’est un vrai changement de comportement.
- RTS au cell : menu repliable et rangée qui défile de côté, à essayer sur un vrai cell (vertical et couché).

- Infini : vie +18 % et dégâts +14 % par vague (vague 20 : vie ×23, dégâts ×12). À confirmer en jouant.
- Robot : rue de 140 m, blindage 1 500 (+250 et réparation à chaque rue), armes ×2,4 puis +16 % par rue, zombies +22 % de vie par rue. À équilibrer en jouant.
- Succès : environ 760 ferrailles d'un coup à la première victoire de Saint-Clou. À baisser si trop.

- Survivant : il meurt aux trois quarts du trajet si un poursuivant vit encore (plus de minuterie de 5 s). Poursuivants à 78 % de sa vitesse au départ, 94 % aux trois quarts.
- Météo : beau temps environ 70 % du temps, pluie et orage environ 7 à 10 %, tornade environ 1 à 2 %. À ajuster en jouant.
- Sons : écouter les tirs, la pluie, le vent, la grêle, les oiseaux et les cigales sur le cell (le volume des ambiances n'a pas été réglé à l'oreille).

- Tireurs survivants : 30 % d'un tireur d'élite de base, soit 1 tir aux 2,5 s, 33 dégâts × force de la vague, sans tir à la tête, portée 75 m.

- Arsenal : prix de 12 000 $ à 35 000 $ ; dans les villes courtes, ces armes seront surtout accessibles en mode infini. Accessoires achetés dans la boutique pour la partie (comme les améliorations de l'arme), à rendre permanents si Martin préfère.

- RTS : boss à 25 % de leur vie du mode robot, un toutes les 3 hordes (+1 500 $). Avions : seuls les zombies volants les attaquent. Prix : tank 1 800 $, hélicoptère 2 200 $, chasseur 3 000 $, Warthog 3 800 $, bombardier 4 500 $, aérodrome 3 000 $. À équilibrer en jouant ; le pilotage au doigt n'a pas été essayé sur un vrai cell.

- RTS sans fin : 500 zombies au plus sur ordi et 300 au cell (le plafond de l'appareil reste en vigueur pour le reste du jeu). À confirmer sur un vrai cell.

## Idées en vrac
