# Suivi des tâches

Fichier tenu par Claude. Statuts : À faire, En cours, Fait, Bloqué.
Les 10 dernières tâches faites sont ici ; les plus anciennes sont dans `docs/historique.md`. Fiches des modes : `docs/robot.md`, `docs/rts.md`.

## En cours

| # | Tâche | Statut | Note |
|---|-------|--------|------|
| 117 | Toit : une sixième ville, « La Centrale » (décor, vagues, zombie propre à la ville, boss « le Cœur ») | En cours | Sous-agent, lancé le 2026-11-18 |

## À faire

| # | Tâche | Priorité |
|---|-------|----------|
| - | Équilibrage après essais de Martin | Après essais |
| - | Dossier performance au cell : mesurer la boucle du jeu (`tests/perf.html`) et alléger ce qui coûte | À choisir par Martin |

Écarté par Martin : choisir 1 bonus parmi 3.

## Fait

| # | Tâche | Date |
|---|-------|------|
| 116 | Robot, les sons d’une machine lourde (js/70-robot-sons.js). Pas : un coup sourd à chaque vrai pied posé, gauche et droite, plus fort en courant, grincement de vérin. Fond de machine (moteur, turbine, servos quand le torse tourne). Armes vues de l’habitacle : roquettes en salve (un départ par tube), canon électromagnétique qui claque puis siffle pendant sa recharge, minigun plus grave. Tableau de bord : alarme de surchauffe à 75 % puis bips qui accélèrent jusqu’à la coupure, alerte de blindage sous 30 %, coque qui sonne comme du métal, crachat sur la vitre. Moments : démarrage, début de rue, carrefour, « Renforts ! », cor du Titan roi, sa frappe et son cri à mi-vie, course réussie, extinction du robot détruit. Le craquement de bois de la barricade ne joue plus dans le robot (js/37-bruitages.js). Aucun chiffre ni visuel changé. Détails dans `docs/robot.md` | 2026-11-18 |
| 115 | RTS, les sons (js/69-rts-sons.js). Un son par famille d’arme : fusil, mitrailleuse, minigun, « brrrt » des avions, tir d’élite, canon du tank, 40 mm, roquette, Hellfire, mortier (départ puis sifflement de chute), 105 mm, laser, Tesla, lance-flammes, crachat du Béhémoth, onde du Titan ; avant, presque tout faisait le même « boom ». Sons placés : plus faibles et plus sourds de loin, à gauche ou à droite, explosions lointaines en retard. Mixage : 18 voix au plus (10 au cell), jamais saturé dans un scénario de 40 unités. Moments : alerte « Base attaquée », sirène puis cor et tambours du siège, cri grave de la Ruche, nid détruit, « Vallée libérée », bâtiment posé, unité produite, bip d’ordre, unité perdue. Moteur en pilotant (tank, Apache, chasseur, AC-130, Mech, petit robot). Aucun chiffre ni visuel changé. Mesure : `node outils/mesure-sons-rts.js`. Détails dans `docs/rts.md` | 2026-11-18 |
| 113 | Toit, décor vivant (js/68-toit-decor.js). Fenêtres : la nuit, 5 à 12 % des fenêtres des façades sont allumées selon la ville (60 % de cette part au crépuscule, à l’aube et en orage, 1,2 % de jour) ; toutes les 1,2 à 3,6 s une fenêtre s’allume, s’éteint ou vacille, en fondu ; un quart sont des bougies, 12 % des télés bleutées. Bord du toit : dessus en goudron, corniche, sacs de sable bombés, caisse de munitions, cheminée, cachés dans le robot. Barricade : pieux croisés en bois clair devant ; sous 60 % de vie des planches penchent, sous 30 % il en manque et des poteaux penchent, tout revient à la réparation. Rien n’est une cible de tir, aucun chiffre changé. 2 appels de dessin de plus en regardant devant, 5 de moins vers le bas. Réglages : `TD_REGL`. Limite : le bord du toit ne peut pas se voir en regardant droit devant sans cacher les zombies à la barricade (œil à 1,4 m du toit et 0,6 m du bord) ; on le voit en regardant vers le bas ou sur les côtés | 2026-11-18 |
| 114 | Robot, le style Amélioré marche maintenant dans le robot (js/67-robot-style.js, js/57-graphismes.js) : textures, vraies ombres du soleil, éclat et couleurs, comme sur le toit. La zone d’ombre suit le robot le long de la rue ; les jambes, les monstres et le boss projettent leur ombre ; l’habitacle et les manettes sont dessinés par-dessus, sans effets. Haute définition et Ultra restent pour le toit : dans le robot, ils donnent Amélioré, et le bouton le dit (« Style : Haute définition (Amélioré dans le robot) »). Bouton « Style » ajouté dans la Pause du robot. Défaut corrigé : avec Haute définition choisie, le robot recevait les matériaux de ce style sans leur lumière. En Actuel, rien ne change. Le RTS reste comme avant. Aucun chiffre de jeu changé. Coût mesuré en rendu logiciel : environ 200 appels de dessin de plus, comme sur le toit | 2026-11-18 |
| 112 | Outils, simulateur reproductible : avec la même graine, le même banc donne maintenant exactement les mêmes chiffres d’un lancement à l’autre, même sur une machine chargée (avant : le même duel donnait 1 061 puis 2 524, ou 18 211 puis 7 342). Causes : la boucle du jeu tournait seule en temps réel avant le départ du banc, et le hasard du chargement n’avait pas de graine. Nouveaux `outils/sim-horloge.js` (heure, horloge du son et hasard fixés, boucle arrêtée) et `outils/sim-page.js` (une page isolée par banc). Vérifié : duel du toit, campagne du toit, robot, banc et partie du RTS. `SIM_DUELS=1,3` lance seulement certaines situations ; ligne « Empreinte du duel » pour comparer deux lancements. Aucun fichier du jeu touché. Les chiffres ne se comparent plus à ceux des anciens rapports : relancer l’avant et l’après. Pas relancé : `outils/mesure-crise.js`, mode infini, parties RTS de 60 min | 2026-11-18 |
| 108 | Toit, deuxième ronde des armes : les 10 modèles restants refaits (pistolet, fusil à pompe, fusil d’assaut, sniper dans js/04-arme-modeles.js ; arbalète, lance-flammes, minigun, lance-roquettes, canon électromagnétique, arc dans le nouveau js/04-arme-modeles2.js), points d’accroche gardés, 1 416 à 2 348 triangles par arme. Arme plus présente au repos (`VM_POS` 0,22 ; -0,22 ; -0,48 devient 0,19 ; -0,19 ; -0,42), ramenée vers le centre au cell vertical pour ne plus sortir de l’écran. Rayon du laser et du canon électromagnétique en cône fin (plus de grande vitre bleue près de l’arme). Coup de caméra calmé dans toute lunette, aussi la ×4. Aucun chiffre d’équilibrage ni de zoom changé | 2026-11-13 |
| 106 | RTS, le visuel de toutes les armes monte d’un cran dès le niveau 0 (js/55-rts-effets.js). Roquettes et Hellfire : corps, flamme, traînée de fumée, boule de feu, débris, marque au sol, onde (avant : une ligne sans explosion). Balles : traçantes qui filent, éclair de bouche, sang ou poussière (avant : 8 traits au plus pour tout le jeu). Obus : éclair et fumée au départ, explosion avec terre soulevée ; mortier en arc. 105 mm : chute visible, colonne de feu. Laser : rayon avec cœur et halo. Tesla : éclair ramifié. Lance-flammes : jet qui grossit, sol qui brûle. Béhémoth : crachat en arc ; Titan : onde au vrai rayon. Les paliers d’amélioration ajoutent par-dessus. L’onde et la marque ont le rayon réel des dégâts. Aucun chiffre de dégâts changé (vérifié par un test). 6 appels de dessin en tout, réserves de taille fixe, plafonds plus bas au cell | 2026-11-13 |
| 107 | Robot, retouches de l’habitacle d’après les captures. Cell vertical : plus de bande sombre dans le ciel, tableau de bord remonté au-dessus des boutons tactiles, écran du blindage au centre entre les deux manettes. Cell couché : manettes placées entre la manette virtuelle et les boutons de tir. Au cell, les barres Minigun, Roquettes et « Prochaine rue » montent sous la barre du blindage. Regard vers le bas : plancher ouvert, on voit les cuisses, genoux, tibias et pieds du robot et le pied qui se lève | 2026-11-13 |
| 104 | Toit, visée et armes en main (js/66-visee.js). La visée suit l’optique : une lunette (celle du sniper ou la ×4) donne un vrai cadre de lunette, l’arme disparaît et le champ de vision est divisé par 4 (la ×4 a son réticule) ; un point rouge rapproche un peu plus que les mires, qui se rabattent ; sans optique on aligne les mires. Avant, la lunette ×4 montrait seulement son tube devant l’œil. Zooms changés : fusil d’assaut, .50 et laser avec lunette à 17,5° ; canon électromagnétique sans optique de 20° à 42° et avec lunette de 11° à 17,5° ; arbalète sans optique de 34° à 42°. Armes : matières par pièce (métal, polymère, bois, verre) sans appel de dessin de plus, lumières de l’arme plus neutres, armes à énergie qui s’illuminent au tir, fusil laser refait, .50 et lance-grenades détaillés, point rouge et lunette ×4 refaits. Aucun chiffre de dégâts changé | 2026-11-13 |
| 105 | Robot (js/40-robot-habitacle.js). Plus aucun zombie n’apparaît derrière le robot : les vagues sortent moitié au bout de la rue (55 à 90 m devant), moitié dans les ruelles de côté (30 à 55 m devant) ; avant, 30 % sortaient derrière. Pour garder la difficulté : une vague aux 18 s au lieu de 28. Habitacle complet par défaut : montants, vitre, tableau de bord à deux écrans qui vivent (blindage, rue, chaleur, chargeur), deux manettes avec les mains (la gauche suit le déplacement, la droite la visée, gâchette et bouton qui s’enfoncent) ; réglage « Habitacle : complet ou dégagé » dans la Pause (dt_mech_vue). Jambes qui marchent pour vrai (pied posé collé à la rue, pas selon la vitesse et la direction), visibles en regardant vers le bas. Détails dans `docs/robot.md` | 2026-11-13 |

## À valider par Martin

- Sons du RTS (tâche 115) : personne n’a pu écouter, tout vient de mesures. À écouter dans l’ordre : un siège (sirène, puis cor et tambours) ; la sortie de la Ruche au 8e nid ; une bataille vue de haut avec tanks, lance-roquettes et Warthog (distingue-t-on le canon, la roquette et le « brrrt », sent-on la gauche et la droite ?) ; le moteur en pilotant le tank puis l’Apache. Au cell, le moteur du tank et le départ du 105 mm sont presque seulement des graves : dire si on les entend.
- Sons du robot (tâche 116) : personne n’a pu écouter. À écouter dans l’ordre : les pas en marchant puis en courant, au cell et au casque (peut-être trop forts au casque, `RSN_REGL`) ; le cor du Titan roi à la rue 9 ; la minigun jusqu’à la surchauffe ; le bip du blindage bas sur la durée (pénible ou pas). Deux sons d’avant jouent encore sous les nouveaux : l’explosion à chaque frappe du Titan et le petit souffle quand un crachat touche.

- Décor du toit (tâche 113) : regarder une nuit à Banlieue Nord et un jour à Saint-Clou. Dire s’il y a trop ou pas assez de fenêtres allumées (`TD_REGL.fen`), si les sacs de sable sont trop clairs ou prennent trop de place quand on regarde vers le bas au cell, et si l’état de la barricade se lit. À décider : le bord du toit ne se voit pas en regardant droit devant ; pour le voir il faudrait monter l’œil ou changer la visée de départ, ce qui change le jeu. Pas vérifié : Ultra, un vrai cell, un zombie juste devant les pieux.

- Robot en style Amélioré (tâche 114) : à essayer au cell et à l’ordi (Pause du robot, « Style »). Dire combien d’images par seconde, si les ombres scintillent quand le robot marche, si elles sont correctes en se retournant, et si le Titan roi se voit bien. Mesuré seulement en rendu logiciel.

- Modèles des armes du toit (tâche 108) : à regarder arme par arme. Dire lesquelles sont réussies et lesquelles sont à reprendre, si l’arme est maintenant trop grosse ou encore trop petite, et surtout au cell vertical : l’arme y est ramenée vers le centre et couvre le bas de la rue. À la recharge, la crosse remplit un instant le coin en bas à droite. Pas vérifié : un vrai cell, les accessoires « Tube jumelé » et « Propulseur renforcé » sur le nouveau tube plus fin du lance-roquettes.

- Armes du RTS (tâche 106) : à essayer, en vue du RTS et en pilotant. Dire si les tirs se lisent bien de haut, si c’est trop chargé quand tout le monde tire, et si ça ralentit sur ton ordi avec tout amélioré (mesuré sans carte graphique : environ 14 % de temps en plus par image dans ce cas, rien de plus au cell). Les dégâts restent instantanés : un zombie peut tomber un instant avant que la roquette qu’on voit le touche ; dire si ça dérange. Pas vérifié : un vrai cell, les sons, les styles Amélioré et Haute définition.

- Visée et armes du toit (tâche 104) : à essayer. Dire si la lunette ×4 rapproche assez, si le canon électromagnétique zoome maintenant trop peu (sans optique, il est passé de ×3,5 à ×1,67), et si les armes ont meilleure mine. Pas regardé en Amélioré, Haute définition ni Ultra, ni sur un vrai cell.

- Robot, habitacle et jambes (tâche 105) : à essayer au cell et à l’ordi. Dire si l’habitacle cache trop la rue, si les manettes se voient assez (au cell, les boutons tactiles les couvrent en partie), si les jambes se voient assez, et si les vagues aux 18 s venues de devant vont bien. Pas essayé sur un vrai cell ni en Haute définition.

- RTS, la Ruche (tâche 101) : à essayer. Personne n’y a joué à la main. Dire si le but se comprend dès le départ, si les sièges donnent chaud (au simulateur, un bon joueur voit son QG touché dans 1 partie sur 4 seulement), si la Ruche est trop longue ou trop courte à abattre, et si le QG tombe encore d’un coup (17 à 19 s dans la dernière série). Pas vérifié : un vrai cell, le pilotage contre la Ruche, un ordi lent avec 800 zombies pendant un siège, la stratégie « air ».

- Robot, fin gagnable (tâche 102) : à essayer. Personne n’y a joué à la main. Dire si le carrefour se choisit bien au cell, si le Titan roi est battable et plaisant (au simulateur, beaucoup de défaites juste devant lui), si les premières rues font maintenant assez mal, et si monter de tour donne le goût de repartir. La ferraille du robot est baissée de 20 % pour compenser les ruelles : dire si le garage avance trop lentement.

- Allure des zombies et finitions des monstres (tâches 110 et 111) : dire si les yeux rouges au loin sont bien ou de trop, si les nuances de peau se voient assez (`ZTEINT.peauMax`, js/07-zombies.js), si les étiquettes au-dessus des monstres encombrent l’écran du cell, et si le revenant en dit trop (un texte à gauche plus un sous-titre quand il tombe).

- Robot (tâche 95) : la minigun surchauffe maintenant après environ 12 s de tir sans arrêt (55 s avant). Un profil neuf perd environ une rue au simulateur : dire si c’est trop (sinon 0,009 au lieu de 0,011, `MECH_HEAT`). Le canon électromagnétique tire aux 1,9 s au lieu de 1,3 : dire s’il reste plaisant.

- Moments de crise (tâche 100) : à essayer sur le toit avec le son. Dire si l’assaut donne chaud, si 3 s d’avertissement c’est assez, si la brèche sauve trop souvent (au simulateur : 25 sur 35 chez le débutant, 11 sur 13 chez le bon joueur) et si la sirène et le cœur sont agréables (personne ne les a écoutés). Les 3 premières villes chauffent encore peu. Réglages en haut de `js/64-crise.js` (`CRISE`).

- Graphismes (tâche 99) : à regarder au cell dans les 5 villes, de jour et de nuit, en Actuel puis en Amélioré. Dire si c’est plus beau, si ça ralentit (mesuré seulement en rendu logiciel : +1,5 à +4 % en Actuel), et si le nouveau ciel va bien dans le robot et le RTS (pas regardé). Pas faits : yeux et teintes des zombies, fenêtres qui s’allument, bout de la rue en ville.

- RTS (tâche 96) : Mech lourd, Mech de combat, chasseur et Warthog sont plus forts ; essayer une partie avec eux, et en piloter un (le chasseur et le Warthog font deux fois plus mal aussi quand on les pilote). Dire si le tank amélioré au maximum est trop solide (il ne meurt presque plus au simulateur).
- Nouveaux monstres (tâche 98) : hurleur (dès Val-des-Cendres vague 4), revenant (Val-des-Cendres vague 2), fouisseur (Banlieue Nord vague 2). Dire s’ils se reconnaissent bien de loin au cell (le hurleur est sombre : on le voit surtout à ses anneaux orange), si les parades se comprennent avec le bandeau, et si le fouisseur qui ressort près de la barricade est juste ou frustrant.

- Sons (tâche 97) : personne n’a pu écouter, tous les niveaux viennent de mesures. À écouter au cell : reconnaît-on le coureur, le costaud, le colosse et le gargouillis du cracheur sans regarder ? Le battement de cœur sous 30 % de barricade est-il pénible ? Le minigun, plus bas, garde-t-il sa force ? Entend-on tout baisser quand le minigun tire (« pompage ») ? Les signatures de vague sont-elles trop fortes ou trop longues (2,5 s pour la dernière vague) ?

- Ressenti du tir (tâche 94) : à essayer sur le toit, au cell et à l’ordi, avec le son. Dire arme par arme si ça brasse trop ou pas assez (une ligne par arme dans `RS_ARME`, `js/62-ressenti.js`), si le gel sur un gros coup dérange, et si le sang est de trop. « Secousses » dans la Pause coupe le coup de caméra et le gel. Proposé, pas fait : un zombie qui titube pour vrai sous le pompe, le sniper ou la .50 (ça changerait l’équilibrage).
- RTS (tâche 83) : liste des unités repliée par défaut. Dire si on veut qu’elle se referme seule après avoir choisi une unité.
- Style Ultra (tâche 87) : à essayer sur l’ordi (Pause, « Style » trois fois), surtout une nuit de pluie. Dire les images par seconde et si la rue brille trop.
- Zombies Haute définition (tâche 86) : dire si le flou en visant est trop fort ou pas assez, et si le sang au sol est de trop.
- Décor Haute définition (tâche 85) : dire s'il y a trop ou pas assez de débris dans la rue.
- Haute définition la nuit (tâche 84) : essayer une nuit (Banlieue Nord) en Haute définition, dire si les lampadaires sont trop forts ou trop faibles.

- Style Haute définition (tâche 82) : à essayer sur l’ordi en mode performance (Pause, « Style » deux fois ; en mode économie d’énergie, l’ordi lague). Dire combien d’images par seconde, et si c’est trop sombre, trop clair ou trop « délavé » (réglages `HD_REGL`). Les zombies et les textures photo viennent aux séances 2 et 3.

- Style Amélioré (tâche 80) : à essayer sur le S24 et l’ordi (Pause, « Style »). Dire si c’est trop sombre, trop flou ou trop granuleux, et combien d’images par seconde au cell.

- RTS véhicules (tâche 76) : à essayer en pilotant. Chiffres à ajuster au goût : tank 560 dégâts toutes les 3 s, chasseur 200 obus, Warthog 660, AC-130 100 + 20, 2 avions par aérodrome.


- Villes plus dures (tâche 93) : au simulateur, le débutant a maintenant besoin de 2 essais à Banlieue Nord, à Centre-ville et au Port ; le joueur moyen de 1 ou 2 à Centre-ville et au Port ; le bon joueur passe tout du premier coup mais de justesse. Val-des-Cendres reste facile pour les robots-joueurs. Dire si c’est assez, ou trop : un chiffre par ville, `dur` dans `js/02-villes.js`.
- Robot (tâche 93) : dire si les zombies sortent maintenant assez loin, si 4 roquettes d’affilée c’est bien, si l’aide à la visée au cell aide assez pour les petits zombies (`MECH_ASSIST`, js/39-robot.js) et si les premières rues sont encore trop faciles.

- Défenses du toit (tâche 92) : mortier, laser et missiles sont plus forts. Si tu en as déjà, les villes seront plus faciles : dire si c’est trop. Au simulateur, 4 tourelles de base (1 000 ferrailles) tiennent seules la vague 4 de Saint-Clou sans que le joueur tire : à dire si c’est voulu.
- RTS (tâche 92) : tank et tourelles mitrailleuse et Tesla renforcés ; essayer une partie avec des tanks. Au simulateur, la base du robot-joueur (qui bâtit beaucoup de tourelles mitrailleuses) tient maintenant 34 à 56 min au lieu de 24 à 29 : dire si c’est trop long.

- Robot (tâche 91) : à essayer. Dire si la montée de rue en rue est bonne (au simulateur, un profil neuf tombe vers la rue 5 ou 6), et si « Renforts ! » arrive trop vite quand on prend son temps dans une rue. Essayer d’esquiver les crachats verts en faisant des pas de côté.
- RTS (tâche 91) : les boss frappent moins fort quand la menace est haute. La durée des parties a peu changé au simulateur (24 à 29 min pour le robot-joueur, 20 avant) : la base tient à 100 % puis s’écroule en moins d’une minute quand la horde devient trop forte. Dire si cette fin est frustrante ; si oui, la piste est de faire monter la menace moins vite avec les tués (`RTS_THREAT.tues`, essayé à 900 et 1 200 : parties de 30 à 55 min).
- Autos du boss (tâche 91) : dire si 3 balles en 1,9 s de vol, c’est faisable au cell.

- Armes du toit (tâche 90) : à essayer en jouant. Dire si le sniper, le minigun et le lance-roquettes valent maintenant leur prix, si le fusil à pompe est devenu trop faible de loin, et si les dernières villes sont devenues trop faciles (au simulateur, le joueur moyen qui achète bien finit le Port au 2e essai ; avant, il n’y arrivait pas en 3). Tous les chiffres sont dans `js/06-donnees.js` et `docs/equilibrage.md`.

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
