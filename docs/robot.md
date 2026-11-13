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

## Simulateur (2026-11-13, tâche 95)
`node outils/simulateur.js robot [joueurs] [graine]` fait jouer un robot-joueur (`outils/sim-bot-robot.js`) par les vraies commandes du robot : profil neuf par niveau, banc du garage à ferraille égale, progression course après course. Le banc complet prend environ 1 h 30. Mesures à 3 graines par ligne : le hasard d’une course reste d’environ une rue.
- Profil neuf : rues 1 à 3 sans dégâts (26 s chacune), mur à la rue 5 ou 6 (142 zombies en vie, renforts sans fin, Béhémoth). Dégâts par rue du joueur moyen : 0, 0, 16, 147, 607, puis 4 100. Le joueur tombe vers la rue 5 quel que soit son niveau : c’est le garage qui fait progresser, pas l’adresse.
- Une course rapporte 1 500 à 2 300 ⚙ au début, puis 7 000 à 15 000 avec du garage. Le décollage arrive vers la course 4 ou 5 (environ 8 000 ⚙ dépensés). Tout le garage (59 428 ⚙) est payé en 9 ou 10 courses ; ensuite la ferraille s’empile sans rien à acheter.
- Garage : aucune ligne seule ne passe le mur (4,9 à 6 rues à n’importe quel budget) ; le mélange des améliorations, si (9,5 rues à 7 500 ⚙, 13,9 à 20 000 ⚙).
- Surchauffe : 0,011 par balle (0,0065 avant). La minigun surchauffe après environ 12 s de tir sans arrêt, jamais avec le refroidissement au niveau 8. Avant, elle surchauffait après 55 s et le refroidissement ne servait à rien. Coût : un profil neuf perd environ une rue (5,8 à 4,9). Pour adoucir : essayer 0,009.
- Canon électromagnétique : un tir aux 1,9 s (1,3 avant). Il menait à 14 rues à 7 500 ⚙ contre 9 pour le reste. Arc électrique : un tir aux 0,18 s (0,35 avant).
- Bogue trouvé, pas corrigé : le carrefour n’apparaît jamais. `mechStep` (js/39) lance le fondu dans la même image où le robot passe le bout de la rue, donc le crochet de js/40 ne voit jamais la fin de rue. Avec le carrefour (ruelles à ferraille ×2), le joueur moyen gagne 3 809 ⚙ par course au lieu de 1 540. À corriger dans le dossier « fin gagnable ».
- À équilibrer : lance-flammes lourd (k 1,2 mesuré : 10,1 rues à 7 500 ⚙ ; il faut changer `tests/t-equilibrage.js` en même temps), lance-grenades et arc encore sous « toujours le moins cher » ; canon très fort une fois tout le garage acheté (23 à 27 rues contre 15,7) ; blindage et nanorobots valent peu seuls ; un but après la course 10.

## Succès
Briseur de rues (5, 15, 30 rues en une course) et Broyeur (500, 5 000, 25 000 zombies), cachés tant que le robot est verrouillé (`js/51-succes-modes.js`).

## À équilibrer en jouant
Longueur des rues, blindage, croissance des armes et des zombies.
