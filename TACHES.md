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

- Infini : un joueur devrait céder vers les vagues 25 à 35 (dégâts +12 % par niveau contre zombies +10 % composés). À confirmer en jouant.
- Succès : environ 760 ferrailles d'un coup à la première victoire de Saint-Clou. À baisser si trop.

## Idées en vrac
