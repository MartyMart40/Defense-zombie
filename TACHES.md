# Suivi des tâches

Fichier tenu par Claude (coordonnateur). Statuts : À faire, En cours, Fait, Bloqué.

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
| 46 | Améliorations des armes sans plafond (coût qui monte plus vite après l'ancien maximum, gains qui diminuent pour recharge, précision, montée en régime ; plombs plafonnés puis +8 % de dégâts) | 2026-11-04 |
| 45 | 22 accessoires propres aux autres armes (2 par arme), visibles ; un seul accessoire au bout du canon ; silencieux qui étouffe le tir ; meutes et nuées sous le plafond de zombies en vie | 2026-11-04 |
| 44 | Vibrations du cellulaire : tirs selon l'arme, explosions, gros coups sur la barricade ; réglage dans Pause (js/38-vibrations.js) | 2026-11-03 |
| 43 | Graphismes niveau 3 : débris dans la rue, halos des lampadaires, braises des feux ; .50 : poignée sur le côté et mires rabattues sous une optique | 2026-11-03 |
| 42 | Bruitages : son placé gauche-droite et selon la distance (grognements, coups sur la barricade), douilles qui tintent, corps qui tombent, craquement à la tête, murmure de la horde, barricade qui craque (js/37-bruitages.js) | 2026-11-03 |
| 41 | Graphismes : réglage de qualité (auto, basse, moyenne, haute) ; nuages, brume au sol, flaques à la pluie, ombres sous les zombies (un appel de dessin), fumée des feux et des explosions (js/36-rendu.js) | 2026-11-03 |
| 40 | 5 nouveaux monstres : rampant (meute de 5), gonflé (explose), gargouille (volant de pierre), corbeaux (nuée), bouclier anti-émeute (js/35-monstres.js) | 2026-11-03 |
| 39 | Accessoires du lance-roquettes (ogive tandem ou à fragmentation, propulseur, tube jumelé, guidage laser) ; douilles éjectées vers la droite pour toutes les armes à balles (pool de 48, douilles de .50, de grenade et sabot du canon) | 2026-11-03 |
| 38 | Accessoires du lance-flammes : réservoir dorsal, buse large ou buse longue portée, mélange au napalm, pompe haute pression | 2026-11-03 |
| 37 | Secousse de l'écran par arme (grosses armes plus fortes) ; minigun plus intense : environ 70 coups/s, coup grave, deux lectures gauche-droite, compresseur, grognement grave | 2026-11-03 |
| 36 | Accessoires : compatibilité réaliste (pas de trépied sur les armes légères, pas de lunette sur une arme de près, pas de tambour sur une arme à bande, rien sur le lance-flammes ; bipied du sniper) | 2026-11-03 |
| 35 | Sons : minigun en continu (moteur qui monte en régime, rafale d'environ 55 coups/s, écho), réverbération de rue, explosions, impacts, recharge, grognements (js/01-son.js) | 2026-11-03 |
| 34 | Armes en main : reflets métalliques, éclairage en trois points, éclair de bouche en étoile, traçantes (js/04-arme-en-main.js, js/34-arsenal.js) | 2026-11-03 |
| 33 | Difficulté : chaque ville 20 % plus dure que la précédente, vie et dégâts des zombies (CITY_SCALE, js/06-donnees.js) | 2026-11-03 |
| 32 | Arsenal : 5 armes lourdes (mitrailleuse .50, fusil laser, canon électromagnétique, lance-grenades auto, fusil à arc électrique) et 7 accessoires visibles sur l'arme (point rouge, lunette ×4, trépied, pointeur laser, chargeur tambour, poignée avant, canon long) (js/34-arsenal.js) | 2026-11-03 |
| 31 | Écritures du jeu (Tête !, +15 $, Point faible...) dans une colonne à gauche au lieu d'au-dessus du viseur (js/33-ecritures.js) | 2026-11-03 |
| 30 | Chaque survivant devient un tireur sur le rebord du toit (js/23-rue.js) | 2026-11-03 |
| 29 | Survivants : revenu passé de 1 $ à 10 $ par minute chacun (js/23-rue.js) | 2026-11-03 |
| 28 | Sauvegarde dans un fichier (OneDrive) : écran Sauvegarde sur l'écran titre, enregistrer (partage sur cell, téléchargement sur ordi) et charger avec vérification (js/32-sauvegarde.js) | 2026-11-03 |
| 25 | Survivant : invincible jusqu'aux trois quarts du trajet, attrapé là seulement si un poursuivant vit encore ; poursuivants plus lents au départ ; flèche et halo verts visibles de loin (js/23-rue.js) | 2026-11-03 |
| 26 | Sons : vraie pluie (bruit rose et brun longs, filtres qui dérivent, gouttes au hasard), tirs en couches différents à chaque coup et par arme, ambiances météo (js/01-son.js) | 2026-11-03 |
| 27 | Météo : grand soleil, canicule, coucher de soleil, aube, vent fort, grêle, tempête de poussière, nuit claire, tornade au loin ; beau temps fréquent, pluie et orage rares, AMB_KEEP 0,15 (js/22-ambiance.js) | 2026-11-03 |
| 0 | Récupération de Dernier toit (5 villes, talents) depuis l'artifact claude.ai | 2026-11-02 |
| 16 | Armes en main détaillées (js/04-arme-en-main.js) | 2026-11-02 |
| 17 | Performances des hordes : instances, plafonds 400 ordi / 180 cell, hordePlan(), compteur d'images/s, tests/perf.html | 2026-11-02 |
| 3 | Mode infini : +10 % par vague, boss aux 5 vagues, records par ville, grands nombres compacts (js/28-infini.js) | 2026-11-02 |
| 20 | Repères visuels sans son : flèches hors champ, flash de barricade, sous-titres (js/29-reperes.js) | 2026-11-02 |
| 21 | 37 succès et 21 missions en ferraille (js/30-missions.js) | 2026-11-02 |
| 22 | Ralenti, chiffres de dégâts en option, écran de fin détaillé (js/31-punch.js) | 2026-11-02 |
| 23 | 12 tenues de zombies selon la ville, clown zombie environ 1 sur 10 000 | 2026-11-02 |
| 24 | Viseur : petit point vert | 2026-11-02 |
| 18 | Survivants : 2-3 poursuivants à abattre en 5 s, survivant qui reste sur le toit, +1 $/min chacun | 2026-11-02 |
| 19 | Pouvoirs : cercle d'impact en visant, jusqu'à 6 charges | 2026-11-02 |
| 15 | Arbres détaillés : sapins à étages et feuillus en grappes, nuances, ombres, tous fusionnés (03-scene.js) | 2026-11-02 |
| 7 | Nouvelles armes : arbalète, lance-flammes, minigun, lance-roquettes + améliorations par arme (js/20-armes.js) | 2026-11-02 |
| 8 | Synergies de défenses (même type et combinaisons) | 2026-11-02 |
| 9 | Pouvoirs : grenade (G), molotov (F), frappe aérienne (Q) (js/21-pouvoirs.js) | 2026-11-02 |
| 10 | Météo, nuit, orage, musique dynamique (js/22-ambiance.js) | 2026-11-02 |
| 11 | Barils, caisses larguées, civils (js/23-rue.js) | 2026-11-02 |
| 12 | Points faibles et combos (js/26-combos.js) | 2026-11-02 |
| 13 | Compagnons : tireur d'élite, chien, mitrailleur (js/24-compagnon.js) | 2026-11-02 |
| 14 | Défi du jour (js/25-defi.js) | 2026-11-02 |
| 5 | Zombies sauteur, volant, cracheur, colosse (js/18-zombies-types.js) | 2026-11-02 |
| 6 | Boss aux 5 vagues, un par ville (js/19-boss.js) | 2026-11-02 |
| 2 | Atelier, ferraille, 5 défenses (js/16-atelier.js, js/17-defenses.js) | 2026-11-02 |
| 4 | Page de tests tests/ : 159 tests | 2026-11-02 |
| 1 | Jeu découpé en 16 fichiers js/ + css/, règles des agents (AGENTS.md) | 2026-11-02 |
| 0c | Campagne linéaire, 30 zombies en vague 1 (+30 par vague), retrait du choix du nombre de zombies | 2026-11-02 |
| 0b | Mise en ligne automatique sur GitHub Pages | 2026-11-02 |

## À valider par Martin

- Améliorations des défenses par emplacement (4 tourelles = 4 à améliorer séparément).
- Ogive : lignes Puissance, Retombées, Souffle, Recharge.
- Vente en deux touches (Vendre puis Confirmer).
- Ferraille : marcheur 0,5, coureur 0,7, costaud 4, × difficulté de la ville. Saint-Clou complet = environ 258.

- Boss : le corps ne prend que 60 % des dégâts, la tête fait environ 4 fois plus mal. Vague 5 de Saint-Clou = 151 zombies (boss compris).

- Q lance maintenant la frappe aérienne (avant : changer d'arme). Molette, 1 à 8 et bouton Arme changent d'arme.
- Pouvoirs : charges pleines à chaque vague.
- Une explosion que le joueur cause tue un civil (pénalité) ; les défenses jamais.

- Mesurer les vraies images/s : ouvrir tests/perf.html sur l'ordi et le cell de Martin.
- Test du mitrailleur parfois instable (90 % de précision au hasard).
- Test « la roquette touche un volant en hauteur » : échoue environ 1 fois sur 6 séries complètes, jamais seul ; le message d'échec donne maintenant la distance la plus courte entre la roquette et le volant pour trouver la cause.

- Infini : un joueur devrait céder vers les vagues 25 à 35 (dégâts +12 % par niveau contre zombies +10 % composés). À confirmer en jouant.
- Succès : environ 760 ferrailles d'un coup à la première victoire de Saint-Clou. À baisser si trop.

- Survivant : il meurt aux trois quarts du trajet si un poursuivant vit encore (plus de minuterie de 5 s). Poursuivants à 78 % de sa vitesse au départ, 94 % aux trois quarts.
- Météo : beau temps environ 70 % du temps, pluie et orage environ 7 à 10 %, tornade environ 1 à 2 %. À ajuster en jouant.
- Sons : écouter les tirs, la pluie, le vent, la grêle, les oiseaux et les cigales sur le cell (le volume des ambiances n'a pas été réglé à l'oreille).

- Tireurs survivants : 30 % d'un tireur d'élite de base, soit 1 tir aux 2,5 s, 33 dégâts × force de la vague, sans tir à la tête, portée 75 m.

- Arsenal : prix de 12 000 $ à 35 000 $ ; dans les villes courtes, ces armes seront surtout accessibles en mode infini. Accessoires achetés dans la boutique pour la partie (comme les améliorations de l'arme), à rendre permanents si Martin préfère.

## Idées en vrac
