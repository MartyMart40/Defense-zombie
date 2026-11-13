# Mode robot : « Robot de combat »

## Concept
On pilote un mech à deux pattes, vue du cockpit : minigun au bras gauche, lance-roquettes au bras droit. Le robot marche de rue en rue (les villes à la suite) et des bibites arrivent de tous les côtés. Ouvert dès le départ (avant : débloqué en tombant au mode infini ; changé à la demande de Martin le 2026-11-04).

## Fichiers
| Fichier | Contenu |
|---------|---------|
| `js/39-robot.js` | Robot, cockpit, armes, surchauffe, garage (améliorations permanentes en ferraille), rues, commandes ordi et cell, inscription du mode (`Jeu.mode('robot')`) |
| `js/40-robot-monstres.js` | Bibites monstrueuses (rôdeur, araignée, abomination), 3 boss avec barre de vie, vagues de tous les côtés, carrefours pour choisir la rue suivante |
| `js/50-robot-sauvegarde.js` | Course gardée au début de chaque rue ; « ▶ Continuer le robot » sur l'écran titre reprend au début de la rue |
| `tests/t-robot.js`, `tests/t-robot2.js`, `tests/t-robot-sauvegarde.js` | Tests |

## Chiffres actuels
- Rue de 140 m (`MECH_LEN`). Boss toutes les 3 rues.
- Blindage 1 500, +250 et réparation à chaque rue.
- Armes ×2,4, puis +16 % par rue ; zombies +22 % de vie et +12 % de dégâts par rue, fois la montée `MECH_RAMPE` (1,2 à la rue 1, +0,2 par rue, 2,6 à partir de la rue 8).
- La ville tirée au carrefour n'est que le décor : elle ne change plus la force des zombies ni la ferraille (2026-11-12 ; avant, une rue au Port frappait 5 fois plus fort qu'une rue à Saint-Clou, au hasard).
- Renforts (2026-11-12) : quand la horde d'une rue est épuisée, elle se reforme 35 % plus forte (vie et dégâts) à chaque fois ; à partir du 2e renfort, elle ne rapporte plus ni ferraille ni expérience. Mesuré avant : rester au début de la rue 1 tuait 1 400 zombies en 6 minutes sans perdre de blindage.
- Crachats (2026-11-12) : un cracheur vise le robot là où il est ; un pas de côté de plus de 2,6 m l'esquive (`SPIT_ESQUIVE`, `js/18-zombies-types.js`). Avant, chaque crachat touchait à coup sûr, peu importe où était le robot : c'était sa plus grosse source de dégâts.
- Les armes du robot gardent leurs dégâts d'avant le renforcement des armes du toit (facteur `k` dans `MECH_W`). Le canon électromagnétique a gagné son onde de choc en couloir (comme sur le toit).
- Vagues de tous les côtés toutes les 28 s.
- Garage : 9 améliorations permanentes (blindage, dégâts et refroidissement de la minigun, dégâts, cadence et salve des roquettes, jambes, réparation, nanorobots) et 5 armes de plus (lance-flammes lourd, laser lourd, lance-grenades, arc électrique, canon électromagnétique).

## Essai de Martin (2026-11-13)
« Les zombies nous apparaissent dessus et beaucoup trop proche. Juste à tirer sur le plancher avec les roquettes en avançant et on clenche les premières maps. Les petits zombies sont chiants à tirer avec le cellulaire, sur ordinateur c'est mieux. »
- Vagues de tous les côtés : derrière à 34 à 50 m, ruelles à 30 à 55 m devant (`MB_LOIN`, `js/40-robot-monstres.js`). Avant : 16 à 30 m derrière, 10 à 32 m devant.
- Bras droit : chargeur qui se refait (`ch`, `rg` dans `MECH_W`). Roquettes : 4, une aux 1,6 s. Lance-grenades : 8, une aux 0,6 s. La jauge du bas montre le chargeur (rouge quand il est vide). L'amélioration de cadence raccourcit aussi la recharge.
- Aide à la visée au cell seulement (`MECH_ASSIST` = 0,075 radian, environ 4 degrés) : le tir part vers le zombie le plus près du réticule, la vue ne bouge pas. Rien à la souris.
- Premières rues : `MECH_RAMPE` commence à 1,2 (1 avant) et les zombies sortent plus serrés (0,42 s moins 0,04 par rue ; 0,55 avant).
- Les tourelles du toit ne s'affichent plus dans la rue du robot (ni dans le RTS) : `defSurToit`, `js/17-defenses.js`.

## Succès
Briseur de rues (5, 15, 30 rues en une course) et Broyeur (500, 5 000, 25 000 zombies), cachés tant que le robot est verrouillé (`js/51-succes-modes.js`).

## À équilibrer en jouant
Longueur des rues, blindage, croissance des armes et des zombies.
