# Suivi des tâches

Fichier tenu par Claude (coordonnateur). Statuts : À faire, En cours, Fait, Bloqué.

## En cours

| # | Tâche | Statut | Note |
|---|-------|--------|------|

## À faire

| # | Tâche | Ronde | Fichiers principaux |
|---|-------|-------|---------------------|
| 7 | Nouvelles armes (minigun, lance-roquettes, arbalète, lance-flammes) + améliorations par arme | 1 | 04, 06, 08, 10 |
| 8 | Synergies de défenses | 1 | 16, 17 |
| 9 | Pouvoirs à recharge (grenade, frappe aérienne, molotov) | 1 | 21-pouvoirs.js |
| 10 | Ambiance : météo, nuit, orage + musique dynamique | 1 | 22-ambiance.js, 01 |
| 11 | Rue : barils explosifs, caisses larguées, civils à sauver | 2 | 20-rue.js |
| 12 | Points faibles des zombies + combos | 2 | 18, 07 |
| 13 | Compagnon + défi du jour | 2 | 23-compagnon.js, 24-defi.js |
| 3 | Mode infini (sans choix de difficulté) | plus tard | |
| - | Missions et succès | à confirmer | |

Écarté par Martin : choisir 1 bonus parmi 3.

## Fait

| # | Tâche | Date |
|---|-------|------|
| 0 | Récupération de Dernier toit (5 villes, talents) depuis l'artifact claude.ai | 2026-11-02 |
| 5 | Zombies sauteur, volant, cracheur, colosse (js/18-zombies-types.js) | 2026-11-02 |
| 6 | Boss aux 5 vagues, un par ville (js/19-boss.js) | 2026-11-02 |
| 2 | Atelier, ferraille, 5 défenses (js/16-atelier.js, js/17-defenses.js) | 2026-11-02 |
| 4 | Page de tests tests/ : 42 sur 42 en ligne | 2026-11-02 |
| 1 | Jeu découpé en 16 fichiers js/ + css/, règles des agents (AGENTS.md) | 2026-11-02 |
| 0c | Campagne linéaire, 30 zombies en vague 1 (+30 par vague), retrait du choix du nombre de zombies | 2026-11-02 |
| 0b | Mise en ligne automatique sur GitHub Pages | 2026-11-02 |

## À valider par Martin

- Améliorations des défenses par emplacement (4 tourelles = 4 à améliorer séparément).
- Ogive : lignes Puissance, Retombées, Souffle, Recharge.
- Vente en deux touches (Vendre puis Confirmer).
- Ferraille : marcheur 0,5, coureur 0,7, costaud 4, × difficulté de la ville. Saint-Clou complet = environ 258.

- Boss : le corps ne prend que 60 % des dégâts, la tête fait environ 4 fois plus mal. Vague 5 de Saint-Clou = 151 zombies (boss compris).

## Idées en vrac
