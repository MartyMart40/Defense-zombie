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
| 65 | RTS : astuces des premières parties (10 bulles, une fois chacune, au bon moment, texte cell ou ordi ; « Plus d’astuces » ; « Revoir les astuces » dans la pause) (js/47-rts-astuces.js) ; simulateur d’équilibrage : un robot-joueur joue le vrai jeu en accéléré (campagne, stratégies d’achat, mode infini, RTS) et écrit docs/equilibrage.md (outils/simulateur.js, outils/sim-bot.js) ; tests t-rts-astuces.js et t-simulateur.js | 2026-11-04 |
| 64 | Partie RTS sauvée (toutes les 30 s, à la pause, quand le cell met le jeu de côté ; « Continuer la guerre » à l’écran titre ; « Sauver et quitter » et « Abandonner » à la pause ; confirmation avant une nouvelle partie) (js/45-rts-sauvegarde.js) ; jeu installable sur le cell et l’ordi, plein écran, marche sans réseau (manifest.webmanifest, sw.js, icones/, js/46-application.js, bouton « Installer le jeu ») ; tests sur GitHub à chaque push (.github/workflows/tests.yml, outils/lancer-tests.js) ; outils/version.sh pour les ?v= ; tests t-rts-sauvegarde.js et t-application.js | 2026-11-04 |
| 63 | Structure pour les gros ajouts : registre des modes `Jeu` (js/00-base.js) branché une seule fois dans js/90-branchements.js ; le robot et le RTS s’y inscrivent (`Jeu.mode`) au lieu de remplacer visuals, kill et la musique ; documentation : docs/architecture.md (plages de numéros, registre, ajouter un mode), une fiche par mode (docs/robot.md, docs/rts.md), carte du code et règles à jour dans AGENTS.md, conception à jour, vieilles tâches dans docs/historique.md ; tests/t-modes.js | 2026-11-04 |
| 62 | Cell et solidité : écran titre avec l’aide repliée sous « Comment jouer » (les trois modes visibles sans défiler) ; RTS : menu du bas repliable (bouton ▾, choix gardé), une seule rangée qui défile de côté au cell couché, caméra de départ plus proche au cell couché ; sable plat sous la base (les bosses ne coupent plus la dalle) ; Three.js r128 copié dans lib/ (secours sur cdnjs) ; tests du mitrailleur et de la roquette avec un hasard fixé (__t.graine) ; js/41-rts.js découpé en 4 fichiers (41 données et vallée, 42 unités et partie, 43 pilotage, 44 interface) sans rien changer au jeu ; tests/t-cell.js | 2026-11-04 |
| 61 | RTS : améliorations du tank (mitrailleuse coaxiale, obus explosifs, obus perforants, blindage réactif) et de l'hélicoptère (canon de 30 mm, missiles Hellfire, leurres et blindage, viseur infrarouge) ; hélices de l'AC-130 qui tournent (avec disque flou) ; contrôle des tourelles (bouton « 🎮 Contrôler » : on vise et on tire, la tête suit) et du mortier (rond jaune là où l'obus tombera, entre sa portée mini et maxi, l'obus met un instant à retomber) | 2026-11-04 |
| 60 | RTS : améliorations propres à l'AC-130 (gatling de 25 mm sur 3 niveaux, rechargement du 105 mm, obus incendiaires, capteurs infrarouges) ; zombies qui arrivent de tout le secteur de 90° au nord : nids étalés sur toute la largeur, hordes en 3 à 5 groupes, 3 zombies sur 10 seulement suivent la vieille route, les autres coupent tout droit vers la base | 2026-11-04 |
| 59 | RTS : rotation des bâtiments par quarts de tour (bouton « ↻ Tourner » ou touche R, gardée pour le suivant) ; Mech de combat mis en avant (étoile) et bâtiment requis affiché sur chaque unité ; le bombardier devient un AC-130 : il tourne en virage à gauche autour de la zone visée et tire du flanc avec un canon de 40 mm et un obusier de 105 mm ; piloté, vue du canonnier (zoom, noir et blanc, cadre de visée), la manette déplace la zone visée | 2026-11-04 |
| 58 | RTS : pose des bâtiments sur un quadrillage de 2 m (zone de la base), emprise verte ou rouge avec la raison affichée, cases occupées en gris ; au cell, toucher ou glisser le fantôme puis « Poser ici » ; onglets qui passent à la ligne sur cell | 2026-11-04 |
| 57 | RTS sans fin : toujours 6 nids actifs, chaque nid détruit en fait apparaître un plus solide et plus rapide, plus loin au nord (la route et la vallée s'allongent par tronçons de 100 m) ; jusqu'à 500 zombies sur la carte (300 au cell) ; record de nids détruits. Mech de combat (6 000 $, Usine lourde) : même allure, minigun et roquettes, même cockpit et mêmes sons que le mode robot quand on le pilote. IA des unités : recul devant un zombie trop proche, garde de leur poste, retraite à l'atelier quand elles sont abîmées, cibles choisies (le plus gros pour le tireur d'élite, le groupe le plus serré pour les explosifs). Sortie du pilotage plus sûre, barres de vie et traînées cachées près des yeux | 2026-11-04 |
| 56 | RTS : jet de flammes bien visible (robot et tourelle lance-flammes) ; avions sans ordre qui vont d'eux-mêmes au-dessus des zombies, bombardier qui repasse droit sur la cible ; Piloter marche avec un groupe choisi (prend l'unité la plus près du centre) et vide la sélection au retour ; changer d'onglet, acheter une unité ou ouvrir les améliorations annule la pose d'un bâtiment. Correction : un chef de meute ne fait plus dépasser le plafond de zombies en vie | 2026-11-04 |

## À valider par Martin

- Simulateur (docs/equilibrage.md) : le robot-joueur (sans pouvoirs ni compagnons) libère Saint-Clou et Val-des-Cendres, mais bloque à la vague 4 de Banlieue Nord même en visant parfaitement. Acheter le fusil à pompe tôt fait perdre Saint-Clou (17 dégâts par plomb, grosse dispersion). RTS : le QG tombe vers 5 à 7 min, la menace monte avec chaque zombie tué. À comparer avec tes essais.

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
