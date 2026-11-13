# Mode robot : « Robot de combat »

## Concept
On pilote un mech à deux pattes, vue du cockpit : minigun au bras gauche, lance-roquettes au bras droit. Le robot marche de rue en rue (les villes à la suite) et des bibites arrivent de tous les côtés. Ouvert dès le départ (avant : débloqué en tombant au mode infini ; changé à la demande de Martin le 2026-11-04).

**Une fin qu'on peut gagner (dossier 102, décidé avec Martin).** Une course = 9 rues. Au bout de chaque rue, un carrefour fait choisir la rue suivante. Au milieu de la rue 9 arrive le boss final, le « Titan roi » ; le bout de la rue reste fermé tant qu'il vit. Le battre : écran « Course réussie » (rues, zombies abattus, temps, prime de victoire, ferraille) avec « Tour suivant » et « Retour au garage ». Chaque victoire débloque le tour suivant : mêmes 9 rues, zombies plus forts, plus de ferraille. On choisit son tour au garage (◀ Tour N ▶, parmi ceux débloqués). Pendant la course : « Rue 4 sur 9 · Tour 1 » en haut à gauche. Le but après la dixième course : monter de tour.

## Fichiers
| Fichier | Contenu |
|---------|---------|
| `js/39-robot.js` | Robot, cockpit, armes, surchauffe, garage (améliorations permanentes en ferraille), rues, commandes ordi et cell, inscription du mode (`Jeu.mode('robot')`) |
| `js/40-robot-monstres.js` | Bibites monstrueuses (rôdeur, araignée, abomination), 3 boss avec barre de vie, vagues de tous les côtés, carrefours pour choisir la rue suivante |
| `js/40-robot-fin.js` | Course de 9 rues : boss final, victoire, tours (force, ferraille, prime), choix du tour au garage, progression affichée (`MECH_FIN`, profil `P.mechFin`) |
| `js/50-robot-sauvegarde.js` | Course gardée au début de chaque rue ; « ▶ Continuer le robot » sur l'écran titre reprend au début de la rue |
| `tests/t-robot.js`, `tests/t-robot2.js`, `tests/t-robot-sauvegarde.js`, `tests/t-robot-fin.js` | Tests |

## Chiffres actuels
- Rue de 140 m (`MECH_LEN`). Course de 9 rues. Boss aux rues 3 et 6, boss final à la rue 9.
- Blindage 1 500, +250 et réparation à chaque rue.
- Courbe (dossier 102, `MECH_COURBE` dans `js/39-robot.js`) : la force d'une rue suit un indice e = 3 + 0,7 × (rue - 1) qui remplace le numéro de la rue dans tous les calculs (nombre et sorties des zombies, vie, dégâts, force des armes, ferraille). La rue 1 vaut l'ancienne rue 3, la rue 9 l'ancienne rue 8,6. Avant : e = rue (rues 1 à 3 sans aucun dégât, puis un mur ×7 à la rue 6).
- Armes ×2,4, puis +16 % par point de e ; zombies +22 % de vie et +12 % de dégâts par point de e, fois la montée `MECH_RAMPE` (1,2 à e = 1, +0,2 par point, 2,6 à partir de e = 8 ; entre deux points, la valeur entre les deux).
- Tours (`MECH_FIN`, `js/40-robot-fin.js`) : vie des zombies ×1,35 et dégâts ×1,2 par tour (tour 3 : ×1,82 et ×1,44) ; ferraille +15 % par tour ; prime de victoire 1 000 ⚙ × tour. Toute la ferraille du robot ×0,8 (`ferBase`).
- Boss final : un Titan de la rue 9 (même vie, dégâts ×1,2, ×3 de récompense) ; il apparaît à 45 % de la rue, 70 m devant, s'arrête à 22 m et frappe le sol de là (onde de choc, 35 % de ses dégâts toutes les 5 s environ). À mi-vie, il appelle une vague. Pendant le combat, la horde est réduite de moitié (en vie à la fois et sorties) et ne devient plus plus forte (pas de renfort de plus). Mesuré avant ces deux règles : au corps à corps, le Titan enlevait 400 de blindage par seconde et la horde complète tuait le robot en 13 s, même avec 20 000 ⚙ au garage.
- Carrefour (réparé au dossier 102) : la fin de rue de `js/39-robot.js` ne lance plus le fondu quand `js/40-robot-monstres.js` est là ; c'est le carrefour qui le lance après le choix. Ferraille des rues : ruelles ×1,5 (×2 avant), nid et orage ×1,25 (×1,5 avant). Si le verrouillage de la souris arrive après l'ouverture d'un panneau du robot, il est relâché (sinon les boutons ne recevaient pas les clics).
- Sauvegarde : `P.mechFin = { tour, wins, choix }` (meilleur tour réussi, courses réussies, tour choisi ; une vieille sauvegarde donne 0, 0, 1). La course en cours (`dt_mech_partie`) garde aussi `tour` et `temps` (sans eux : tour 1).
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
- Bogue trouvé (corrigé au dossier 102) : le carrefour n’apparaît jamais. `mechStep` (js/39) lance le fondu dans la même image où le robot passe le bout de la rue, donc le crochet de js/40 ne voit jamais la fin de rue. Avec le carrefour (ruelles à ferraille ×2), le joueur moyen gagne 3 809 ⚙ par course au lieu de 1 540. À corriger dans le dossier « fin gagnable ».
- À équilibrer : lance-flammes lourd (k 1,2 mesuré : 10,1 rues à 7 500 ⚙ ; il faut changer `tests/t-equilibrage.js` en même temps), lance-grenades et arc encore sous « toujours le moins cher » ; canon très fort une fois tout le garage acheté (23 à 27 rues contre 15,7) ; blindage et nanorobots valent peu seuls ; un but après la course 10.

## Fin gagnable : mesures (dossier 102, 2026-11-13)
Simulateur, 3 graines par ligne, mêmes graines avant et après.
- Lance-flammes lourd : k 1,2 (0,76 avant), mesuré au dossier 95 : un vrai choix au garage.
- Profil neuf, joueur moyen : tombe à la rue 5,5 (5 à 5,9) ; avant 5,8 sur une course sans fin. Dégâts par rue : 11, 76, 961, 760, 2 052, 2 057 (avant : 0, 0, 16, 147, 607, puis 4 100). Débutant : 3,6 rues ; bon : 4,2 (le robot-joueur « bon » ne fait pas mieux que le moyen sur un profil neuf).
- Garage de 7 500 ⚙ : le moyen gagne le tour 1 deux fois sur trois ; 20 000 ⚙ : toujours.
- Course après course (12 courses, garage « toujours le moins cher ») : le moyen gagne le tour 1 à la course 4 (4, 4, 4), le tour 2 à la course 5, le tour 3 aux courses 6 à 8, le tour 4 à la course 10 (2 graines sur 3). Le bon : tour 1 aux courses 3 ou 4, tour 4 aux courses 6 à 8. Améliorations toutes au maximum aux courses 7 à 9 (avant : 7 à 9 aussi). Une course rapporte 1 400 à 3 500 ⚙ au début, 9 000 à 12 500 au moment des victoires.
- Plafond avec tout le garage : moyen tour 2,7 (minigun et roquettes) ou 4,3 (minigun et canon) ; bon 3,7 ou 4 ; débutant 2 ou 3,7.
- Avant (course sans fin, même joueur) : 9 rues atteintes pour la première fois aux courses 4 à 6, puis 13 à 27 rues ; rien à viser une fois le garage payé.
- Ce qui ne marche pas encore : l'adresse compte peu (le bon dépasse le moyen d'environ un tour au mieux, le débutant suit à un tour) ; le boss final est le principal mur (beaucoup de défaites à 8,99 rues) ; le canon électromagnétique reste l'arme la plus forte une fois le garage payé.

## Succès
Briseur de rues (5, 15, 30 rues en une course) et Broyeur (500, 5 000, 25 000 zombies), cachés tant que le robot est verrouillé (`js/51-succes-modes.js`). Dossier 102 : Course réussie (1, 5, 20 courses) et Grimpeur de tours (tours 3, 6, 10), repris de `P.mechFin` au chargement.

## À équilibrer en jouant
Longueur des rues, blindage, croissance des armes et des zombies.
