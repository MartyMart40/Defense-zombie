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
| 70 | Journal des erreurs cachées : les 227 `catch (e) {}` du jeu notent maintenant les vraies erreurs de programmation dans JOURNAL (errNote, js/00-base.js) ; les refus du navigateur et les sauvegardes illisibles sont ignorés ; tests/t-journal.js (chargé en dernier) échoue s’il y en a. Aucune trouvée dans les tests ni dans une partie de chaque mode | 2026-11-04 |
| 69 | Robot : course gardée au début de chaque rue, « ▶ Continuer le robot (rue N) » sur l’écran titre (js/50-robot-sauvegarde.js) ; 5 succès pour le robot et le RTS : Briseur de rues, Broyeur, Démolisseur de nids, Tenir le fort, Chasseur de colosses (js/51-succes-modes.js) ; le point de ralliement vise toujours le sol ; tests t-robot-sauvegarde.js et t-succes-modes.js | 2026-11-04 |
| 68 | RTS commandement : mini-carte (nids, unités, zombies, zone vue ; toucher pour y aller), point de ralliement (bouton « 📍 Ralliement », les unités achetées y vont, gardé dans la sauvegarde), alerte « Base attaquée » quand un bâtiment hors de l’écran perd de la vie (toucher pour y aller), « ✋ Tenir » (ni poursuite, ni recul, ni retraite ; gardé dans la sauvegarde), mode photo dans la pause (jeu figé, menus cachés, image à enregistrer ou partager) (js/49-rts-commandement.js, tests/t-rts-commandement.js) | 2026-11-04 |
| 67 | Équilibrage avec le simulateur : fusil à pompe renforcé (30 dégâts par plomb au lieu de 17, 8 plombs, dispersion 0,03 au lieu de 0,055, 8 cartouches, cadence 1,5, recharge 1,5 s, plombs qui traversent 2 zombies) ; menace du RTS surtout liée au temps et aux nids (RTS_THREAT) ; le robot-joueur lance ses pouvoirs et dépense mieux au RTS ; Banlieue Nord pas changée (voir À valider) ; tests/t-equilibrage.js | 2026-11-04 |
| 66 | RTS : choisir les unités une par une. Au doigt : toucher une unité la choisit seule (au lieu de l’ajouter au groupe), retoucher la relâche, appui long pour l’ajouter au groupe ; plus besoin de toucher le modèle exactement (34 pixels autour du doigt). Rangée « Unités » (une pastille par unité avec sa vie ; toucher = choisir seule et y aller). Ordi : Tab (suivante), double-clic (même type à l’écran), Maj+clic ajoute ou retire. Astuces à jour (js/44-rts-interface.js, js/48-rts-liste.js, tests/t-rts-selection.js) | 2026-11-04 |
| 65 | RTS : astuces des premières parties (10 bulles, une fois chacune, au bon moment, texte cell ou ordi ; « Plus d’astuces » ; « Revoir les astuces » dans la pause) (js/47-rts-astuces.js) ; simulateur d’équilibrage : un robot-joueur joue le vrai jeu en accéléré (campagne, stratégies d’achat, mode infini, RTS) et écrit docs/equilibrage.md (outils/simulateur.js, outils/sim-bot.js) ; tests t-rts-astuces.js et t-simulateur.js ; deux autres tests instables réparés (forme du colosse : hasard fixé ; obus de 105 de l’AC-130 : canon rechargé avant le tir) | 2026-11-04 |
| 64 | Partie RTS sauvée (toutes les 30 s, à la pause, quand le cell met le jeu de côté ; « Continuer la guerre » à l’écran titre ; « Sauver et quitter » et « Abandonner » à la pause ; confirmation avant une nouvelle partie) (js/45-rts-sauvegarde.js) ; jeu installable sur le cell et l’ordi, plein écran, marche sans réseau (manifest.webmanifest, sw.js, icones/, js/46-application.js, bouton « Installer le jeu ») ; tests sur GitHub à chaque push (.github/workflows/tests.yml, outils/lancer-tests.js) ; outils/version.sh pour les ?v= ; tests t-rts-sauvegarde.js et t-application.js | 2026-11-04 |
| 63 | Structure pour les gros ajouts : registre des modes `Jeu` (js/00-base.js) branché une seule fois dans js/90-branchements.js ; le robot et le RTS s’y inscrivent (`Jeu.mode`) au lieu de remplacer visuals, kill et la musique ; documentation : docs/architecture.md (plages de numéros, registre, ajouter un mode), une fiche par mode (docs/robot.md, docs/rts.md), carte du code et règles à jour dans AGENTS.md, conception à jour, vieilles tâches dans docs/historique.md ; tests/t-modes.js | 2026-11-04 |
| 62 | Cell et solidité : écran titre avec l’aide repliée sous « Comment jouer » (les trois modes visibles sans défiler) ; RTS : menu du bas repliable (bouton ▾, choix gardé), une seule rangée qui défile de côté au cell couché, caméra de départ plus proche au cell couché ; sable plat sous la base (les bosses ne coupent plus la dalle) ; Three.js r128 copié dans lib/ (secours sur cdnjs) ; tests du mitrailleur et de la roquette avec un hasard fixé (__t.graine) ; js/41-rts.js découpé en 4 fichiers (41 données et vallée, 42 unités et partie, 43 pilotage, 44 interface) sans rien changer au jeu ; tests/t-cell.js | 2026-11-04 |
| 61 | RTS : améliorations du tank (mitrailleuse coaxiale, obus explosifs, obus perforants, blindage réactif) et de l'hélicoptère (canon de 30 mm, missiles Hellfire, leurres et blindage, viseur infrarouge) ; hélices de l'AC-130 qui tournent (avec disque flou) ; contrôle des tourelles (bouton « 🎮 Contrôler » : on vise et on tire, la tête suit) et du mortier (rond jaune là où l'obus tombera, entre sa portée mini et maxi, l'obus met un instant à retomber) | 2026-11-04 |

## À valider par Martin

- RTS : sur certaines formes de la vieille route (tirées au hasard), un zombie qui la suit coupe les virages et s’en écarte jusqu’à 10 m. Mineur ; à corriger si ça se voit en jouant (test fixé sur une route normale).

- Simulateur (docs/equilibrage.md) : à Banlieue Nord, avec le même profil, « pistolet seulement + améliorations » libère la ville (7/7) alors que celui qui achète le fusil d’assaut, le sniper ou le fusil à pompe perd à la vague 5. Changer d’arme coûte cher : les améliorations sont propres à chaque arme et un pistolet amélioré (balles qui traversent) bat une arme neuve. Idée à décider : garder une partie des améliorations en changeant d’arme, ou des armes neuves plus fortes au départ.

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
