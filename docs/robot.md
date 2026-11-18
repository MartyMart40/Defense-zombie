# Mode robot : « Robot de combat »

## Concept
On pilote un mech à deux pattes, vue du cockpit : minigun au bras gauche, lance-roquettes au bras droit. Le robot marche de rue en rue (les villes à la suite) et des bibites arrivent du bout de la rue et des ruelles, jamais de derrière (dossier 105). Ouvert dès le départ (avant : débloqué en tombant au mode infini ; changé à la demande de Martin le 2026-11-04).

**Une fin qu'on peut gagner (dossier 102, décidé avec Martin).** Une course = 9 rues. Au bout de chaque rue, un carrefour fait choisir la rue suivante. Au milieu de la rue 9 arrive le boss final, le « Titan roi » ; le bout de la rue reste fermé tant qu'il vit. Le battre : écran « Course réussie » (rues, zombies abattus, temps, prime de victoire, ferraille) avec « Tour suivant » et « Retour au garage ». Chaque victoire débloque le tour suivant : mêmes 9 rues, zombies plus forts, plus de ferraille. On choisit son tour au garage (◀ Tour N ▶, parmi ceux débloqués). Pendant la course : « Rue 4 sur 9 · Tour 1 » en haut à gauche. Le but après la dixième course : monter de tour.

## Fichiers
| Fichier | Contenu |
|---------|---------|
| `js/39-robot.js` | Robot, cockpit, armes, surchauffe, garage (améliorations permanentes en ferraille), rues, commandes ordi et cell, inscription du mode (`Jeu.mode('robot')`) |
| `js/40-robot-monstres.js` | Bibites monstrueuses (rôdeur, araignée, abomination), 3 boss avec barre de vie, vagues du bout de la rue et des ruelles, carrefours pour choisir la rue suivante |
| `js/40-robot-fin.js` | Course de 9 rues : boss final, victoire, tours (force, ferraille, prime), choix du tour au garage, progression affichée (`MECH_FIN`, profil `P.mechFin`) |
| `js/40-robot-habitacle.js` | Habitacle complet (vitre, tableau de bord, écrans, manettes et mains du pilote), jambes qui marchent, balancement des pas, réglage « Habitacle » de la Pause (dossier 105). Seulement visuel |
| `js/67-robot-style.js` | Style graphique Amélioré dans le robot (dossier 114) : ombres des jambes, bouton « Style » dans la Pause du robot. Le reste est dans `js/57-graphismes.js`. Seulement visuel |
| `js/70-robot-sons.js` | Sons de la machine (dossier 116) : pas sur le vrai pied, fond du moteur, armes vues de l'intérieur, tableau de bord, moments ; sons des trois monstres à parade (dossier 121). Seulement sonore |
| `js/73-robot-monstres2.js` | Trois monstres à la taille du robot, chacun avec sa parade (dossier 119) : Bélier, Grappin, Mortier vivant ; annonce à la première rencontre (`P.mr2Vus`), alertes sans son, monstre de la rue suivante au carrefour, « Monstres rencontrés » au garage |
| `js/50-robot-sauvegarde.js` | Course gardée au début de chaque rue ; « ▶ Continuer le robot » sur l'écran titre reprend au début de la rue |
| `tests/t-robot.js`, `tests/t-robot2.js`, `tests/t-robot-sauvegarde.js`, `tests/t-robot-fin.js`, `tests/t-robot-habitacle.js`, `tests/t-robot-style.js`, `tests/t-robot-sons.js`, `tests/t-robot-monstres2.js` | Tests |

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
- Vagues toutes les 18 s (28 avant le dossier 105), du bout de la rue et des ruelles.
- Garage : 9 améliorations permanentes (blindage, dégâts et refroidissement de la minigun, dégâts, cadence et salve des roquettes, jambes, réparation, nanorobots) et 5 armes de plus (lance-flammes lourd, laser lourd, lance-grenades, arc électrique, canon électromagnétique).

## Essai de Martin (2026-11-13)
« Les zombies nous apparaissent dessus et beaucoup trop proche. Juste à tirer sur le plancher avec les roquettes en avançant et on clenche les premières maps. Les petits zombies sont chiants à tirer avec le cellulaire, sur ordinateur c'est mieux. »
- (Remplacé au dossier 105 : plus rien derrière.) Vagues de tous les côtés : derrière à 34 à 50 m, ruelles à 30 à 55 m devant (`MB_LOIN`, `js/40-robot-monstres.js`). Avant : 16 à 30 m derrière, 10 à 32 m devant.
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
- Ce qui ne marche pas encore : l'adresse compte peu (dossier 119 : trois monstres à parade, voir plus bas) (le bon dépasse le moyen d'environ un tour au mieux, le débutant suit à un tour) ; le boss final est le principal mur (beaucoup de défaites à 8,99 rues) ; le canon électromagnétique reste l'arme la plus forte une fois le garage payé.

## Dossier 105 (2026-11-13) : tout vient de devant, habitacle, jambes
Martin : « Le robot dans la ville a encore des zombies qui spawn en arrière, il faut que ça vienne de la zone opposée. Aussi ce même robot j'aimerais des jambes visibles et un habitat complet avec joystick qui bouge à mesure que tu bouges. »

**Apparitions.** Plus aucun zombie n'apparaît derrière le robot. « Derrière » se compte dans le sens de la marche dans la rue (z plus grand que le robot, `mbDerriere`), pas selon le regard. Un zombie déjà dépassé reste derrière et revient vers le robot comme avant. Source par source :
- File de la rue, renforts, règles du carrefour (nid, ruelles) : `spawnZombie` les pose au bout de la rue, 95 à 113 m devant (inchangé).
- Vagues (`mbWave`, `MB_LOIN`) : 50 % au bout de la rue (55 à 90 m devant), 50 % dans les ruelles de côté (30 à 55 m devant, x = ±13). Avant : 50 % au bout (65 à 105 m), 30 % derrière (34 à 50 m), 20 % dans les ruelles.
- Appel de la horde du Titan roi à mi-vie : une vague, donc devant.
- Boss final : 70 m devant (inchangé). Boss des rues et chefs de meute : au bout de la rue (inchangé).
- Mère pondeuse et abomination : passées derrière le robot, elles ne pondent plus et rien ne sort de l'abomination tuée ; devant, comme avant.
- Test : `tests/t-robot-habitacle.js` fait sortir des centaines de zombies par chaque source et vérifie qu'aucun n'est derrière.

**Rééquilibrage (simulateur, joueur moyen, mêmes graines).** Tout devant rendait le robot plus facile à tenir : profil neuf, rue où l'on tombe (6 graines) 3,3 avant, 4,9 après. Donc vagues toutes les 18 s (28 avant) et bout de la rue plus proche (55 à 90 m) : 3,7. Garage de 7 500 ⚙ : 3 courses gagnées sur 6 avant, 3 sur 6 après ; 20 000 ⚙ : 5 sur 6 avant, 6 sur 6 après. Course après course (3 graines, « toujours le moins cher ») : première victoire aux courses 3, 3, 5 avant, 3, 3, 4 après ; tour 3 gagné aux courses 6 à 7 dans les deux cas.

**Habitacle (vue par défaut).** Dans la scène de l'arme en main, fixé au torse : il tourne avec la visée de côté mais pas quand on lève ou baisse les yeux (on voit le plancher vitré et les jambes en regardant en bas). Montants et toit vitré, vitre à reflets légers (additifs), tableau de bord avec deux écrans redessinés au plus 10 fois par seconde (blindage, rue et mètres restants, chaleur du bras gauche, chargeur du bras droit), voyants, bords, jambes du pilote. Deux manettes avec les mains du pilote : la gauche penche selon le déplacement (touches ou manette tactile), la droite selon la vitesse de la visée ; gâchette (bras gauche) et bouton du pouce (bras droit) qui s'enfoncent au tir. Au cell vertical, les manettes se rapprochent du centre et restent au-dessus des boutons tactiles ; les bras du robot se rapprochent aussi.
- Réglage dans la Pause : « Habitacle : complet » ou « dégagé » (l'ancienne vue, les bras seulement), gardé dans `dt_mech_vue`. Il n'y avait pas de vue de l'extérieur ; il n'y en a toujours pas.

**Jambes.** Dans la scène de la rue (pas dans `world`, qui défile) : bassin, cuisses, tibias, pieds, placés par cinématique inverse (genou vers l'avant). Le pied posé reste collé à la rue ; l'autre fait son pas vers l'endroit où il doit se poser selon la vitesse et la direction (avant, arrière, de côté) ; en tournant sur place, petits pas ; à l'arrêt, le pas en cours se finit et les pieds se remettent sous le robot. Foulée : 4,2 m par pas à pleine vitesse (`HB_J`). Le bruit et la secousse de pas (`mechStomp`) partent quand un pied se pose (`MECH.pasJambes`), plus avec `MECH.step`. Balancement de l'habitacle à chaque pas (`HB_BAL`) ; avec « Secousses » coupé (`dt_secousses`) : balancement réduit au tiers, sans roulis ni secousse.

**Retouches (tâche 107).** Selon la forme de l'écran (`HB_DISPO`, `js/40-robot-habitacle.js`) :
- Cell vertical : la poutre et le toit vitré (qui barraient le ciel) sont cachés ; le tableau de bord remonte (0,12 rad), décalé pour que l'écran du blindage soit au centre entre les deux manettes, au-dessus des boutons tactiles.
- Cell couché : tableau de bord remonté (0,1 rad), manettes entre la manette virtuelle et les boutons de tir ; le bouton Minigun se pousse vers le bord (110 px du bord droit, 16 px du bas).
- Au cell (les deux sens), en habitacle complet : les barres du bas (bras gauche, bras droit, prochaine rue) montent sous le blindage ; la barre du boss descend à 100 px. Tout revient comme avant en vue dégagée ou en quittant le robot.
- Regard vers le bas : plancher ouvert (plus de jambes du pilote, de bande du milieu ni de lèvre avant), bassin étroit et en arrière, hanches plus écartées (1,5 m), pieds 1,8 m de côté et 1,1 m devant l'œil : on voit cuisses, genoux, tibias et pieds, et le pas qui bouge.
- Test : `tests/t-robot-habitacle.js` vérifie, pour chaque forme d'écran, où se voient le haut des manettes et l'écran du blindage.

**Coût.** Appels de dessin à l'ordi (rue 1, à l'arrêt) : 175 avant, 180 après (186 au tir) ; en regardant en bas : 98 avant, 53 à 125 après. 9 objets dans l'habitacle, 7 pour les jambes, matériau de l'arme en main partagé (une copie pour la rue), une texture d'écrans, aucune lumière de plus.

## Dossier 114 (2026-11-18) : style Amélioré dans le robot
Le réglage « Style » (`dt_style`) marche maintenant dans le robot : textures de la rue et des façades, vraies ombres du soleil, éclat, couleurs, comme sur le toit. Haute définition et Ultra donnent Amélioré dans le robot ; le bouton « Style » est aussi dans la Pause du robot et le dit (« Style : Haute définition (Amélioré dans le robot) »). Actuel : rien ne change. Aucun chiffre de jeu ne change.
- La zone d'ombre du soleil suit la caméra pendant que la rue défile (140 m), recalée sur les texels (pas de scintillement).
- Les jambes projettent et reçoivent des ombres. L'habitacle, les manettes et les bras sont dessinés par-dessus, sans effets.
- Pas de fuite : textures et géométries stables sur 6 rues de suite (`tests/t-robot-style.js`).
- Coût (rendu logiciel swiftshader, une vague d'environ 100 zombies devant, Actuel et Amélioré en alternance ; les temps bougent beaucoup, d'autres programmes tournaient) :
  | | Appels de dessin Actuel → Amélioré | Temps par image Actuel → Amélioré (médiane) |
  |---|---|---|
  | Robot, cell 915 x 412 | 205 → 412 | 133 → 267 ms (+133) ; autre passage 133 → 300 |
  | Toit, cell 915 x 412 | 245 → 470 | 67 → 200 ms (+133) ; autre passage 50 → 150 |
  | Robot, ordi 1280 x 720 | 209 → 412 | 617 → 1 150 ms (+533) |
  | Toit, ordi 1280 x 720 | 75 → 300 | 300 → 800 ms (+500) |
  Amélioré ajoute environ 200 appels (le dessin de la carte d'ombre) dans le robot comme sur le toit, et à peu près le même temps. Rien n'a été allégé de plus. Une zone d'ombre plus courte derrière le robot a été essayée : aucun appel de moins, donc pas gardée. À mesurer pour de vrai sur le cell de Martin.

## Dossier 116 (2026-11-18) : les sons du robot
But : qu'on se sente dans une machine lourde. Seulement sonore (aucun chiffre de jeu, aucun visuel ne change), musique inchangée. Tout est dans `js/70-robot-sons.js`, branché par `Jeu.on('image')` qui lit l'état du robot ; un seul appel direct : le pas, dans `mechStomp` (`js/39-robot.js`). `js/01-son.js` et `js/37-bruitages.js` ne sont pas modifiés : le fichier se sert de `Snd._voix` (budget de 10 voix et priorités), `Snd._nz`, `Snd._osc` et des bus (`robot` pour la machine, `arme`, `ui`), et enveloppe `Snd.shot`, `Snd.mgTick` et `Snd.thud` comme le fait déjà `js/34-arsenal.js` (hors du robot, ces enveloppes laissent passer le son du toit).
- **Pas** : un coup sourd et lourd à chaque pied qui se pose (le vrai pied des jambes : `J.poses`, `js/40-robot-habitacle.js`), panoramique léger (pied gauche à gauche, droit à droite, ±0,28), plus fort en marchant vite ou en reculant vite (force 0,6 à 1,1). Grincement de vérin au milieu de chaque pas (7 fois sur 10). L'ancien bruit de pas de `mechStomp` ne joue plus quand ce fichier est là.
- **Machine** : fond fait une seule fois en entrant (moteur grave à 38 Hz et son octave, turbine en bruit bouclé, servomoteur), dont on règle les gains : il monte un peu en marchant ; les servos sifflent quand le torse tourne vite. Arrêté net en pause, en quittant le robot et à la fin de la course (à la mort, le moteur descend en 2 s). Au carrefour, il tourne au ralenti.
- **Armes** (à la place du son du toit, jamais par-dessus) : roquettes en salve (un départ par tube, 75 ms entre deux, la salve du garage compte), lance-grenades (« toump » et barillet), canon électromagnétique (claque métallique et décharge, puis sifflement de recharge pendant l'attente), lance-flammes lourd, laser lourd, arc électrique plus graves. Minigun : moteur plus grave et plus lent à lancer et à ralentir, rafale plus sourde (lecture du tampon à 0,84). Bras gauche à gauche, bras droit à droite.
- **Tableau de bord** : surchauffe, alarme au passage de 75 % de chaleur (une fois, réarmée sous 50 %) puis bips qui accélèrent (0,42 s à 0,11 s) et montent jusqu'à la coupure ; coupure : relais et vapeur ; déclic quand le bras revient. Blindage sous 30 % : alerte (trois coups de sirène) une fois, puis bip lent « bip-bop » clair (1,7 s à 1,05 s), différent du cœur grave du toit ; réarmée au-dessus de 40 %. Coup reçu : la coque sonne (métal, plus grave et plus long pour un gros coup, boulons qui tremblent), au plus un toutes les 70 ms sauf plus gros. Crachat qui touche la vitre : éclaboussure, petit coup sur le verre, acide qui grésille. Bras droit de nouveau prêt après un chargeur vide, canon rechargé : déclic et deux notes.
- **Moments** : démarrage (moteur qui s'allume) et début de rue (trois notes qui montent ; rue 9 : trois notes graves) ; carrefour (vérins qui soufflent, deux échos de radar) ; choix de rue ; « Renforts ! » (corne grave, deux coups) ; Titan roi : cor très grave en trois coups (55, 55, 41 Hz) qu'on reconnaît, frappe au sol qui fait trembler l'habitacle, hurlement à mi-vie ; course réussie (vapeur, moteur au ralenti, carillon doux, la fanfare de `js/40-robot-fin.js` joue aussi) ; robot détruit (extinction : moteur qui descend, relais qui lâchent, étincelles, dernier choc).
- Réglages en haut du fichier : `RSN_REGL` (pas, grincement, fond, seuils et rythmes des alarmes, niveau de chaque famille dans `niv`).
- Repères sans son : la surchauffe a déjà la bannière « Surchauffe ! », la barre rouge et l'écran SURCHAUFFE du tableau de bord ; le blindage bas, la barre rouge et les écrans rouges. Rien à ajouter.

**Niveaux mesurés** (hors ligne, OfflineAudioContext, après 0,5 s de chauffe du limiteur, comme la table de `js/01-son.js`, en dBFS ; « Court » : RMS le plus fort sur 50 ms ; « Moyen » : RMS pendant le son ; « Cell » : le court après un passe-haut à 300 Hz). Le hasard fait bouger les chiffres de 1 à 2 dB.

| Son | Crête | Court | Moyen | Cell |
|-----|-------|-------|-------|------|
| Pas, marche lente / course | -13 / -10 | -23 / -19 | -31 / -28 | -39 / -35 |
| Grincement de vérin | -40 | -53 | -57 | -53 |
| Fond à l'arrêt / en marche / torse qui tourne | -30 / -25 / -26 | -36 / -30 / -33 | -37 / -32 / -35 | -55 / -49 / -45 |
| Minigun du robot (continu) | -9 | -16 | -18 | -25 |
| Roquette / salve de 3 | -7 / -7 | -17 / -18 | -29 / -25 | -31 / -28 |
| Lance-grenades | -10 | -21 | -28 | -34 |
| Canon électromagnétique (coup et recharge) | -9 | -17 | -30 | -29 |
| Lance-flammes lourd (15 par seconde), laser, arc | -26 / -24 / -28 | -36 / -35 / -36 | -38 / -41 / -43 | -44 / -42 / -46 |
| Surchauffe : bip / coupure | -20 / -18 | -33 / -27 | -38 / -36 | -33 / -29 |
| Blindage bas : alerte / bip | -18 / -20 | -28 / -32 | -35 / -37 | -29 / -32 |
| Coque : petit coup (0,9) / gros coup (2,4) | -14 / -7 | -22 / -14 | -31 / -24 | -30 / -26 |
| Crachat sur la vitre, bras droit prêt | -19 / -24 | -33 / -37 | -40 / -41 | -33 / -37 |
| Début de rue, démarrage, choix, renforts | -19 / -19 / -20 / -16 | -29 / -29 / -32 / -27 | -35 / -37 / -39 / -34 | -29 / -29 / -33 / -31 |
| Carrefour | -16 | -23 | -34 | -31 |
| Titan roi : arrivée / appel | -8 / -14 | -17 / -26 | -21 / -28 | -28 / -27 |
| Titan : frappe seule / avec le boom qui existait | -12 / -1 | -18 / -10 | -27 / -20 | -33 / -21 |
| Course réussie / robot détruit | -19 / -13 | -28 / -19 | -37 / -34 | -29 / -34 |
| Toit, pour comparer : pompe, coup sur la barricade (marcheur), alarme, cœur, minigun | -3 / -14 / -18 / -9 / -9 | -14 / -21 / -27 / -20 / -15 | -28 / -29 / -32 / -28 / -17 | -25 / -30 / -27 / -34 / -25 |
| Pire cas : fond en marche, minigun, 4 pas, 3 alarmes, 6 gros coups, salve, canon, frappe, 2 explosions, Titan, renforts, 40 zombies | -0,7 (limiteur) | -9 | -15 | -21 |

Pire cas sans budget de voix : crête -0,6 dB, jamais au-dessus de 0,95 (limiteur et écrêtage doux de `js/01-son.js`). Test : `tests/t-robot-sons.js`.

**Coût** : 60 s simulées (marche, minigun qui surchauffe, blindage bas) : fond fait une fois, au plus 10 voix à la fois, environ 24 nœuds audio créés par seconde (pas, grincements, bips ; chacun s'arrête seul à la fin de son son). Son coupé : aucun nœud créé.

**À écouter en jouant** : le volume des pas au casque (un peu forts en courant ?) et au cell (ils passent surtout par le médium) ; le bip du blindage bas sur la durée ; le cor du Titan roi.

## Dossier 119 (2026-11-18) : trois monstres qui demandent un geste
Diagnostic : l'adresse comptait peu (le robot-joueur « bon » ne faisait pas mieux que le « moyen »), tout se réglait en tirant dans le tas. Trois monstres propres au robot, chacun avec une parade qui se sert du déplacement, du torse ou du choix de l'arme. Tout est dans `js/73-robot-monstres2.js` (réglages en haut : `MR2_BEL`, `MR2_GRA`, `MR2_MOR`, `MR2_PLAN`). Crochets : `mechPlan` et `damage` (calcul, comme js/40 et js/63), le reste par `Jeu.on('image')` et `Jeu.on('tue')`. Aucun autre fichier du jeu n'est modifié (une ligne dans `index.html`).

| Monstre | Vie, vitesse, dégâts (avant la force de la rue) | Ferraille, argent, XP | Ce qu'il fait | Parade |
|---|---|---|---|---|
| Bélier (masse brune, plaque frontale grise, cornes) | 900, 2,2, 45 | 8, 140, 40 | À 34 à 46 m, il gratte le sol 1,5 s (bande rouge pâle au sol qui suit le robot à 3 m/s), puis charge à 18 m/s, bande pleine. À 10 m du robot : robot dans la bande (2,6 m de rayon) = coup de 2 × ses dégâts, il recule et recommence 6 s plus tard ; hors de la bande = il dévie et s'écrase contre la façade de son côté, sonné 4 s, la bosse du dos luit | Un pas de côté quand il fonce, puis tirer pendant qu'il est sonné. De face (pas sonné), il ne prend que 20 % des dégâts ; sonné, 100 % et le dos ×3 |
| Grappin (petit, jaune, deux bras à crochets levés) | 140, 7, 10 | 1,5, 30, 8 | Il court en zigzag ; à 13 m, bond en cloche de 0,75 s sur la vitre. Accroché : visible de l'intérieur (habitacle complet et vue dégagée), il cache une partie de la vue, intouchable par les armes, ronge 0,75 × ses dégâts toutes les 0,5 s, lâche seul au bout de 10 s. Un seul accroché à la fois (les autres griffent les jambes) | Secouer le torse : 3 demi-tours rapides (au moins 0,4 rad en moins de 0,5 s, chacun à l'inverse du précédent ; le mouvement d'une image est plafonné, un saut de visée ne compte pas) ; ou 0,8 s de lance-flammes. Décroché, il tombe à côté, perd la moitié de sa vie, reste 2 s au sol. Ou l'abattre en plein saut |
| Mortier vivant (gros sac violet sur des racines, tube orange qui luit) | 650, 0,9, 40 | 6, 100, 30 | Il s'enracine à 55 à 72 m devant le robot, puis tire toutes les 4,5 s (pas plus près que 8 m, pas derrière le robot, 2 obus en vol au plus pour tous) : obus en cloche de 2 s vers l'endroit où est le robot au départ du tir, cercle rouge de 3,2 m au sol pendant tout le vol (collé à la rue qui défile). Touché : 2 × ses dégâts | Ne pas rester planté : avancer, reculer ou un pas de côté. Roquettes ou canon pour l'abattre de loin |

- Au cell (ou `MECH.assist`), fenêtres plus généreuses : élan 1,8 s, charge à 15 m/s, bande de 2,3 m, sonné 5 s ; 2 secousses suffisent, d'au moins 0,3 rad × la sensibilité si elle est sous 1 (`ampT`, dossier 121 : un glissé d'au moins 60 px), sonné 2,5 s au sol ; obus en vol 2,3 s, cercle de 2,9 m.
- Où ils sortent (`MR2_PLAN`, nombre dans la file de la rue : Bélier, Grappin, Mortier) : tour 1, rues 1 à 3 : aucun (début de course inchangé) ; rue 4 : 2 Béliers ; rue 5 : 4 Grappins ; rue 6 : 2 Mortiers ; rue 7 : 2, 3, 1 ; rue 8 : 2, 3, 2 ; rue 9 : 1, 2, 1. Tour 2 : rue 2 : 0, 1, 0 ; rue 3 : 1, 1, 0 ; rue 4 : 2, 1, 0 ; rue 5 : 1, 4, 0 ; rue 6 : 1, 1, 2 ; rue 7 : 2, 3, 1 ; rue 8 : 2, 3, 2 ; rue 9 : 1, 3, 1. Tours 3 et plus : +25 % par tour. Ils remplacent des marcheurs (au plus la moitié) : le total de la rue ne change pas. Les renforts en ont autant ; la horde qui se reforme pendant le combat contre le Titan roi n'en a pas. Ni le toit, ni le RTS.
- Repères sans son : bande et cercle au sol, alerte au centre de l'écran avec une barre de temps (élan, charge, sonné, Grappin avec le compte des secousses, obus), bords rouges sous un obus. Moments : `Jeu.emit('monstre', quoi, z)` avec `elan`, `charge`, `sonne`, `saut`, `accroche`, `decroche`, `tir`, `impact` (js/29 et js/37 n'y répondent que sur le toit).
- Annonce à la première rencontre (à 80 m) : bandeau qui dit la parade, une fois par profil (`P.mr2Vus`, `{}` par défaut). Carrefour : « ⚠ Rue 5 : des Grappins (secoue le torse s'ils s'accrochent). » Garage : « Monstres rencontrés », avec leur parade.
- Sons : chacun son propre son dans `js/70-robot-sons.js` (dossier 121, plus bas). Les sons d'emprunt de `Snd` (tone, boom, _nz, rugissement des bibites) ne jouent plus que si ce fichier est absent ; seul le coup du Bélier sur le robot garde son boom (la coque sonne aussi).
- Coût : 2 bandes, 3 obus, 3 cercles et 3 disques réservés au départ (aucun créé en jeu), un objet dans l'habitacle ; les monstres passent par le rendu par instances (matériaux `zmat`).

**Robot-joueur** (`outils/sim-bot-robot.js`) : nouveau champ `parade` (débutant 0,2, moyen 0,5, bon 0,9), une décision par charge, par Grappin accroché et par obus. Il sort de la bande ou du cercle (et s'arrête d'avancer le temps du pas de côté), ne s'y remet pas en se recentrant, secoue le torse (5 rad/s, demi-tour toutes les 0,16 s), vise en priorité le Bélier sonné, le Grappin en plein saut et les Mortiers, et ne gaspille plus ses tirs sur un Grappin accroché.

**Mesures** (simulateur, graines 1, 2, 3, mêmes graines avant et après ; « avant » : le jeu sans ce fichier ; « après » : le jeu et le robot-joueur qui pare) :

| | Avant | Après |
|---|---|---|
| Débutant, profil neuf : rues traversées | 2,85 · 3,7 · 2,91 (3,15) | 2,85 · 3,72 · 2,91 (3,16) |
| Moyen, profil neuf | 3,94 · 3,83 · 2,99 (3,59) | 5,74 · 3 · 4,62 (4,45) |
| Bon, profil neuf | 4,68 · 3,91 · 3,81 (4,13) | 4,99 · 4,57 · 3,6 (4,39) |
| Garage de 7 500 ⚙ : débutant, moyen, bon | 7,72 · 8,99 · ✔ ; 8,99 × 3 ; ✔ × 3 | 8,99 × 3 ; ✔ · 8,99 · ✔ ; 7,92 · ✔ · ✔ |
| Moyen, 12 courses : tour 1 gagné à la course | 3, 5, 3 | 4, 4, 4 |
| Moyen : tour 2, tour 3 gagnés à la course | 4, 6, 4 ; 5, 10, 5 | 5, 5, 5 ; 8, 8, 10 |
| Moyen : meilleur tour après 12 courses | 4, 3, 4 | 3, 3, 3 |
| Bon, 12 courses : tour 1 gagné à la course | 4, 3, 4 | 3, 4, 3 |
| Bon : tour 2, tour 3 gagnés à la course | 5, 4, 5 ; 7, 5, 6 | 4, 5, 4 ; 5, 6, 6 |
| Bon : tour 4 gagné à la course ; meilleur tour après 12 | 8, 7, 7 ; 4, 4, 4 | 9, -, 10 ; 4, 3, 4 |

Lecture : le moyen gagne le tour 1 à une course près comme avant ; le débutant ne bouge pas (les rues 1 à 3 sont les mêmes). L'écart grandit : avant, le bon arrivait au tour 3 à la même course que le moyen (6 contre 6,7 en moyenne) ; après, 5,7 contre 8,7. Le moyen monte plus lentement à partir du tour 2 (meilleur tour après 12 courses : 3 au lieu de 3,7). Deux premiers réglages essayés et écartés : charge à 24 m/s depuis 30 à 42 m avec un coup de 3 × (le bon encaissait presque autant que le moyen : moins d'une seconde pour réagir et faire 2,6 m de côté) ; puis tableau du tour 2 plus chargé (dès la rue 1, +30 % par tour) avec coups de 2,5 × : le moyen ne gagnait plus le tour 3 en 12 courses sur une graine sur trois.
- À regarder en jouant : vu au dossier 121 (bande et cercle bien visibles de nuit, Grappin replacé selon l'écran, geste au doigt mesuré).

## Dossier 121 (2026-11-18) : finitions des dossiers 116 et 119
Aucun chiffre de jeu ne change, sauf la fenêtre du geste au doigt contre le Grappin (au cell seulement). Simulateur du robot (`SIM_ROBOT=neuf SIM_COURSES=2 node outils/simulateur.js robot moyen`) : rapport identique avant et après (profil neuf 4,63 et 3 rues ; garage 7 500 ⚙ : ✔ et 7,92 ; 20 000 ⚙ : ✔ ✔).

**Sons des trois monstres** (`js/70-robot-sons.js`, section 6, `Jeu.on('monstre')`). Placés à gauche ou à droite selon le monstre par rapport au regard (±0,7), plus doux de loin (entier jusqu'à 12 m, 40 % à 75 m et plus) ; Grappin : du côté de la vitre où il est. Hasard propre (`rsnHasard`). Élan et charge ont la priorité la plus haute dans le budget de voix (ce sont les signaux de la parade). Réglages : `RSN_REGL.mons` (distances, grattement, sifflement) et `RSN_REGL.niv.mons`.
- Bélier : élan = sabot qui racle l'asphalte 3 à 4 fois et souffle rauque des naseaux, pendant tout l'élan ; charge = galop lourd « ta-tam » qui se rapproche et enfle jusqu'au robot ; sonné = fracas de tôle, briques qui tombent, puis râle qui tremble.
- Grappin : saut = cri aigu qui monte et tremble ; accroché = choc sur la vitre (verre qui sonne, crochets) ; tant qu'il est accroché, grattement et crissement en boucle (fait une fois par accroche, coupé net quand il lâche, en pause, au carrefour et en quittant ; refait à la reprise s'il est encore là) ; décroché = couinement puis sa chute au sol. Il lâche seul : la boucle s'arrête, sans couinement.
- Mortier vivant : tir = « toump » lointain et sourd ; pendant le vol, sifflement qui descend (2 700 à 700 Hz) et monte en volume, plus fort (×4) tant que le robot est dans le cercle, refait à la reprise après une pause ; impact = coup mou, éclaboussure, acide qui grésille et bouillonne, placé là où l'obus tombe.
- Sons en double retirés : l'explosion de `js/40-robot-monstres.js` à chaque frappe du Titan (seul le son de frappe reste ; visuel et dégâts inchangés) ; le petit souffle de `js/18-zombies-types.js` quand un crachat touche le robot (le toit le garde).

| Son (dossier 121) | Crête | Court | Moyen | Cell |
|-----|-------|-------|-------|------|
| Bélier : élan à 40 m / à 15 m | -8 / -6 | -18 / -16 | -26 / -24 | -26 / -24 |
| Bélier : charge (de 40 m), sonné (façade à 30 m) | -9 / -7 | -18 / -15 | -25 / -28 | -30 / -24 |
| Grappin : saut (13 m), choc sur la vitre, décroché | -17 / -11 / -14 | -22 / -22 / -24 | -26 / -29 / -35 | -22 / -29 / -29 |
| Grappin : grattement en boucle | -21 | -33 | -37 | -33 |
| Mortier : tir (60 m), impact sur le robot | -15 / -7 | -22 / -14 | -30 / -25 | -35 / -29 |
| Mortier : sifflement, obus qui vise le robot / qui tombe ailleurs | -23 / -36 | -26 / -39 | -31 / -44 | -26 / -39 |

Même méthode que la table du dossier 116 (les sons de référence redonnent ses chiffres à 1 dB près : pas en courant -9 / -19, petit coup sur la coque -13 / -22, crachat -19 / -33). Pire cas avec les monstres (le pire cas du dossier 116 plus le fracas du Bélier, un impact, un élan et le grattement) : crête 0,92 (-0,7 dB, limiteur), 10 voix au plus. Test : `tests/t-robot-sons.js`.

**Grappin sur la vitre** (`MR2_VITRE`, `js/73-robot-monstres2.js`, purement visuel). Avant : même place et même taille partout ; au cell vertical, il débordait de l'écran à gauche ou à droite et en couvrait près de la moitié. Maintenant, selon la forme de l'écran, centre à une part de la demi-largeur visible (ordi 0,45, couché 0,3, vertical 0,56), largeur au plus 26 %, 20 % et 38 % de l'écran, un peu plus bas que le milieu à l'ordi et couché (sous l'alerte « secoue le torse »), à mi-hauteur au cell vertical. Mesuré (boîte à l'écran, habitacle complet et dégagé) : 4 à 5 % de l'écran au cell vertical, 6 % couché, 8 à 9 % à l'ordi ; jamais sur le viseur, l'alerte, la manette virtuelle ni les boutons de tir (au plus quelques pixels du coin de sa boîte près du bouton Minigun en vue dégagée couchée).

**De nuit** (Banlieue Nord, météo « Nuit noire ») : la bande du Bélier et le cercle du Mortier se voient très bien (matériaux sans éclairage ni brouillard) : rien à changer.

**Secouer le torse avec un doigt** (test `tests/t-robot-monstres2.js`, vrais événements `touch` sur la zone de visée `#mkAim`, un aller-retour d'un quart de la largeur de l'écran en 0,3 s par sens). Le doigt tourne le torse de 0,005 rad par pixel × la sensibilité (`dt_sens`, de 0,3 à 2,5, 1 par défaut).
- Avant (0,4 rad par secousse au cell comme à la souris) : sensibilité 1 : décroché (0,52 rad au cell vertical, 1,14 couché) ; sensibilité 0,3 : jamais (0,15 rad au cell vertical, 0,34 couché).
- Après (`ampT` = 0,3 rad × la sensibilité si elle est sous 1) : décroché dans les 4 cas. La souris ne change pas (0,4 rad : des va-et-vient de 0,3 rad ne le décrochent pas, de 0,45 rad oui).

**Enrobage retiré** : `js/71-centrale.js` ne réaffecte plus `mbRoutes`. Une seule constante, `MECH_VILLES = 5` (`js/39-robot.js`) : la rue du robot (`LOCS[(rue - 1) % MECH_VILLES]`) et le tirage des carrefours (`LOCS.slice(0, MECH_VILLES)` dans `mbRoutes`), même tirage qu'avant.

## Succès
Briseur de rues (5, 15, 30 rues en une course) et Broyeur (500, 5 000, 25 000 zombies), cachés tant que le robot est verrouillé (`js/51-succes-modes.js`). Dossier 102 : Course réussie (1, 5, 20 courses) et Grimpeur de tours (tours 3, 6, 10), repris de `P.mechFin` au chargement.

## À équilibrer en jouant
Longueur des rues, blindage, croissance des armes et des zombies.
