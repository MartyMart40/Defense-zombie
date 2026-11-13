# Mode RTS : « Guerre des robots »

## Concept
Vue de dessus d'une base militaire au fond d'une vallée du désert. Montagnes au sud et sur les côtés, ouverture de 90° au nord. Les zombies viennent du nord, de tout le secteur, en partie le long d'une vieille route d'asphalte à moitié détruite. On achète et on place des bâtiments, des tourelles et des unités, et on détruit les nids. But (tâche 101) : détruire 8 nids fait sortir la Ruche (le nid mère) au fond de la vallée ; la détruire libère la vallée et débloque la suivante, plus dure. On perd quand le QG tombe. Après une victoire, « Continuer sans fin » garde la partie sans fin d'avant.

## Fichiers
| Fichier | Contenu |
|---------|---------|
| `js/41-rts.js` | Données (unités, bâtiments, améliorations, boss, réglages `RTS_CFG`), modèles 3D, vallée (sable, montagnes, route, ruines, épaves) |
| `js/42-rts-unites.js` | Unités, bâtiments, nids, début et fin de partie |
| `js/42-rts-combat.js` | Zombies (route, cibles, boss), combat et IA des unités, boucle `rtsStep` |
| `js/43-rts-pilotage.js` | Pilotage à la première personne de n'importe quelle unité, tourelles et mortier contrôlés, vue du canonnier de l'AC-130 |
| `js/44-rts-interface.js` | Menus du bas (onglets, menu repliable), panneaux, pose des bâtiments sur quadrillage, commandes (souris, clavier, doigt), inscription du mode (`Jeu.mode('rts')`) |
| `js/45-rts-sauvegarde.js` | Partie en cours gardée toutes les 30 s, à la pause et quand le cell met le jeu de côté ; reprise par « Continuer la guerre » |
| `js/47-rts-astuces.js` | Astuces des premières parties : une bulle à la fois, au bon moment, une fois chacune ; « Plus d’astuces » les coupe, la pause permet de les revoir |
| `js/54-rts-postes.js` | Postes de pilotage (ce qu'on voit quand on pilote un véhicule), munitions des avions et retour à l'aérodrome, 2 avions par aérodrome |
| `js/55-rts-niveaux.js` | Les armes embellissent avec leurs améliorations (niveau visuel de 0 à 1 par arme) |
| `js/56-rts-postes-robots.js` | Poste des petits robots : visière, bras et arme propre à chaque robot, recul, éclair, détails selon les améliorations |
| `js/48-rts-liste.js` | Choisir les unités une par une : rangée « Unités » repliable (fermée : une pastille « 👥 Unités · N » et les groupes ; ouverte : une pastille par unité avec sa vie ; choix gardé dans `dt_rts_liste`), Tab pour la suivante, double-clic pour le même type ; groupes enregistrés (5 au plus) |
| `js/49-rts-commandement.js` | Mini-carte (toucher pour y aller), point de ralliement, alerte « Base attaquée » à paliers, « ✋ Tenir » (u.hold), mode photo (dans la pause) |
| `js/65-rts-ruche.js` | La Ruche (modèle, garde, ponte, victoire « Vallée libérée ! »), les vallées (choix sur l'écran titre), les sièges (annonce, bandeau, pastille sur la mini-carte). Réglages : `RTS_REGL` dans `js/41-rts.js` |
| `tests/t-rts.js`, `tests/t-rts-ruche.js`, `tests/t-cell.js`, `tests/t-rts-sauvegarde.js`, `tests/t-rts-astuces.js`, `tests/t-rts-selection.js`, `tests/t-rts-commandement.js` | Tests |

## Règles et chiffres actuels
- Départ : 900 $, QG, usine de robots, 3 tourelles mitrailleuses, 3 fantassins.
- Toujours 6 nids actifs. Chaque nid détruit (+500 $) en fait apparaître un plus solide et plus rapide, plus loin au nord ; la vallée s'allonge par tronçons de 100 m. La Ruche ne compte pas parmi les 6.
- La base grandit de 8 m par nid détruit (rayon 30 m au départ, 70 m au plus). Le sable est plat sous la base jusqu'à 74 m.
- Hordes toutes les 45 s ; boss (Titan, Mère pondeuse, Béhémoth ailé) toutes les 3 hordes, à 25 % de leur vie du mode robot, +1 500 $. Le boss arrive avec un siège (voir plus bas).
- Plafond de zombies en vie : 500 sur ordi, 300 au cell. 40 unités au plus.

### Unités
| Unité | Prix | Bâtiment requis |
|-------|------|-----------------|
| Fantassin | 150 $ | Usine de robots |
| Mitrailleur | 400 $ | Usine de robots |
| Robot lance-flammes | 450 $ | Usine de robots |
| Tireur d'élite | 500 $ | Usine de robots |
| Lance-roquettes | 700 $ | Usine lourde |
| Mech lourd | 1 500 $ | Usine lourde |
| Mech de combat | 6 000 $ | Usine lourde |
| Tank | 1 800 $ | Garage de blindés |
| Apache | 2 200 $ | Héliport |
| Chasseur | 3 000 $ | Aérodrome |
| Warthog | 3 800 $ | Aérodrome |
| AC-130 | 4 500 $ | Aérodrome |

### Bâtiments
Usine de robots 500 $, usine lourde 1 200 $, garage de blindés 1 500 $, héliport 1 800 $, aérodrome 3 000 $, récupérateur 400 $, atelier de réparation 700 $, barricade 60 $. Tourelles : mitrailleuse 250 $, lance-flammes 400 $, canon 450 $, mortier 600 $, Tesla 700 $ (6 niveaux chacune).

Les prix exacts sont dans `RTS_UNITS` et `RTS_BLD` (`js/41-rts.js`) : si un chiffre change dans le code, changer ce tableau aussi.

## Véhicules et postes de pilotage (2026-11-04, demande de Martin : « chaque arme représentative de la vraie vie »)
- Tank : canon de 120 mm, un obus toutes les 3 s, 900 dégâts (560 avant le 2026-11-12), explosion de 6,5 m, 8 000 de vie (3 200 avant) ; mitrailleuse coaxiale en amélioration. Poste : le gros canon devant soi, qui recule à chaque tir.
- Apache (l'hélicoptère) : canon rotatif de 30 mm sous le nez et missiles Hellfire dès l'achat (les améliorations les renforcent), roquettes Hydra. Poste : vue du casque, verrière, écrans, canon qui tourne quand il tire, Hellfire sur les ailettes qui disparaissent quand ils partent.
- Chasseur : canon de 20 mm (150 dégâts, 10 coups/s ; 75 avant le 2026-11-13), 300 obus (200 avant) ; Warthog : canon de 30 mm, 110 dégâts (55 avant), 660 obus. AC-130 : 100 obus de 40 mm et 20 de 105 mm. À sec, l'avion retourne à l'aérodrome le plus proche refaire le plein (3 à 6 s au-dessus). Piloté : on y retourne soi-même, le viseur donne la distance.
- 2 avions par aérodrome : pour plus d'avions, il faut plus d'aérodromes.
- AC-130 : vole à 60 m (il était à 30 m : le sol défilait trop vite pour viser), portée 95 m, zoom 30° au 40 mm et 20° au 105 mm.
- 2e arme (Hellfire, 105 mm, roquettes du Mech) : gros texte au centre quand elle part ; si on appuie avant qu'elle soit prête, le temps restant ou « À SEC ». Les petits robots n'ont qu'une arme.
- À l'ordi : clic gauche = 1re arme, clic droit ou touche E = 2e arme ; les deux marchent ensemble (le clic droit pendant qu'on tient le clic gauche est lu dans l'état des boutons).
- Les tirs du joueur partent du bout du canon qu'on voit à l'écran (canon du tank, coaxiale, canon rotatif et nacelles de l'Apache, canon du chasseur, 40 mm et 105 mm).
- Apache : canon rotatif de 30 mm à 26 coups/s, montée en régime, grondement continu du minigun, poste et écran qui vibrent.
- AC-130 : il ne tire que par son flanc gauche (aussi quand l'ordinateur le pilote). En pilotage, la visée reste fixée au sol pendant que l'avion tourne, dans un champ de 34° de chaque côté du flanc ; au bord du champ, elle est entraînée avec l'avion.
- AC-130 : 3 postes. Tirer le 40 mm amène à son poste (caméra noir et blanc), tirer le 105 mm au sien (thermique « blanc chaud », plus de zoom), le bouton « Vue » (touche V) passe aussi au cockpit. Le 105 mm : 1 100 dégâts, zone de 11 m, grosse boule de feu, fumée et secousse.

## Les armes embellissent avec les améliorations (2026-11-04, demande de Martin)
- Chaque arme d'une unité a un niveau visuel de 0 à 1 : les améliorations achetées qui la concernent (Armes + ses améliorations propres ; ex. 105 mm : Armes, rechargement, obus incendiaires, capteurs), divisées par leur maximum (`RTS_TIER`).
- Au début : petit « pew pew », traînée fine, petite explosion, presque pas de recul. En montant : traînée plus large avec un cœur blanc, son plus lourd, explosion plus grosse (poussière, fumée, boule de feu du 105 mm), écran qui tremble plus, recul et éclair plus forts.
- Dans le poste, le modèle gagne des détails à 1/3, 2/3 et au maximum (frein de bouche, manchons, cylindres de recul, canons en plus sur l'Apache, métal rougi).
- Les dégâts ne changent pas : seule la mise en scène suit les améliorations.

## Petits robots (2026-11-04, demande de Martin)
- Les jambes sont des pièces à part (`rtsLegGeo`) : elles font des pas pendant la marche (une devant, l'autre derrière) et reviennent droites à l'arrêt.
- Pilotés, ils ont leur poste : visière et bras droit avec leur arme (fusil, 4 canons qui tournent, long fusil à lunette, buse et veilleuse, 4 tubes, canon laser à anneaux). Simple au départ ; Armes et Cadence ajoutent 3 paliers de détails, plus de recul et un plus gros éclair. Le viseur affiche « ARME n % ».
- Les mains et l'arme du toit ne s'affichent plus pendant le RTS (elles restaient visibles en pilotage).

## Décisions prises
- Groupes enregistrés : « ＋ Groupe » enregistre les unités choisies, « G1 »... les choisit (retoucher : la caméra y va), appui long ou clic droit : remplacer (ou supprimer sans choix). Ordi : Ctrl+1 à 5 enregistre, Maj+1 à 5 rappelle ; les chiffres seuls achètent toujours des robots. Gardés dans la sauvegarde.
- Choisir les unités : au doigt, toucher une unité la choisit seule (retoucher la relâche), un appui long l'ajoute au groupe ou l'en retire ; un toucher à moins de 34 pixels d'une unité la prend (19 pixels quand des unités sont déjà choisies, pour pouvoir les déplacer juste à côté). À la souris : clic = seule, Maj+clic = ajoute ou retire, glisser = cadre, double-clic = même type à l'écran, Tab = suivante.
- Les avions ne sont attaqués que par les zombies volants.
- Pose des bâtiments sur un quadrillage de 2 m, rotation par quarts de tour (R ou bouton), gardée pour le suivant.
- Le bombardier est devenu un AC-130 : il tourne en virage à gauche autour de la zone visée.
- Au cell, le menu du bas se replie (choix gardé dans `dt_rtsFold`) ; au cell couché, une seule rangée qui défile de côté.

## Succès
Démolisseur de nids (3, 15, 50), Tenir le fort (10, 30, 60 minutes dans une partie), Chasseur de colosses (1, 10, 30 boss), Libérateur (1, 3, 5 vallées libérées) (`js/51-succes-modes.js`).

## Sauvegarde de la partie
- Gardé : argent, temps, menace, hordes, boss, améliorations, taille de la base, la route, tous les nids (détruits compris), bâtiments (niveau, vie, rotation), unités (vie, poste).
- Pas gardé : les zombies en vie, les obus en vol, le pilotage. La partie reprend sur la carte avec un instant de calme.
- Pause : « Sauver et quitter » ou « Abandonner (efface la partie) ». La sauvegarde est aussi effacée quand le QG tombe.
- Commencer une nouvelle partie quand une partie est sauvée demande une confirmation (deuxième clic).

## Banc des unités (2026-11-12)
Mesuré à budget égal (6 000 $ d'un seul type d'unité, même flot de zombies, 150 s) : tout tenait entre 1 000 et 1 550 zombies tués, sauf le tank (280, les trois détruits).
- Défaut corrigé : au repos, une unité à explosion (tank, lance-roquettes, Apache) visait le plus gros groupe dans sa portée + 6 m, donc souvent hors de portée, et restait sans tirer avec des zombies à ses pieds. Un tank tirait aux 7,5 s au lieu d'aux 3 s. Une cible déjà à portée passe maintenant avant (`rtsPickTarget`). Lance-roquettes : 8 survivants sur 8 au lieu de 2.
- Tank : 900 dégâts et 8 000 de vie. Il ne recule pas devant les zombies comme les robots : il lui faut le blindage pour tenir. Après : environ 1 050 tués au même banc.
- Tourelles (3 000 $ d'un seul type) : la mitrailleuse (14 dégâts, portée 20 m) et la Tesla tombaient là où le canon et le lance-flammes tenaient. Mitrailleuse : 26 dégâts, portée 24 m. Tesla : 80 dégâts, 2 tirs/s. Le mortier seul ne tient pas (il ne tire pas à moins de 8 m) : c'est une arme d'appui, laissé tel quel.
- La durée des parties n'a pas changé au simulateur (23 à 28 min).
- Pas mesuré : le pilotage. Les appuis et les améliorations ont été mesurés le 2026-11-13 (section suivante).

## Robot-joueur et banc des appuis (2026-11-13, tâche 96)
Commandes : `node outils/simulateur.js rts [tourelles,blindes,air,mixte] [graines] [minutes]` et `node outils/simulateur.js rts-banc [menaces] [graines] [secondes] [unités]`. Le robot-joueur est dans `outils/sim-bot-rts.js`.
- Quatre stratégies : tourelles (l'ancien robot-joueur), blindés (garage, jusqu'à 24 tanks), air (héliport, aérodromes, armée au sol qui retient), mixte (récupérateurs, atelier, armée variée, améliorations). Il passe par les vraies fonctions (pose, achat, ordres, « Tenir », ralliement, retour à l'atelier sous 40 % de vie). Il ne pilote pas, réagit sans délai, pose ses bâtiments au hasard dans la bonne zone, ne vend rien. Une partie varie beaucoup d'une graine à l'autre.
- Constat principal : avec un joueur correct, le QG ne prend pas un seul coup en 60 minutes (11 parties sur 12). Seul l'ancien robot-joueur est tombé (43 min).
- Menace : 9 à 11 à 10 min, environ 30 à 30 min, 44 à 57 à 60 min. Les tués en font les deux tiers. Le plafond de 500 zombies est atteint dès la 4e minute et y reste : ce n'est plus le nombre qui monte, c'est la force (à menace 43, un marcheur frappe 18 fois plus fort qu'au départ).
- La chute, quand elle arrive : les tourelles tombent pendant 2 à 3 minutes (seul signe avant-coureur), puis le QG passe de 90 % à 0 en 3 secondes. 87 % des dégâts au QG viennent des zombies ordinaires, 13 % des boss. La base est soit intouchable, soit rasée d'un coup.
- Banc des appuis : armée de référence (6 mitrailleurs, 4 fantassins, 2 lance-roquettes, 3 tourelles mitrailleuses, 2 tourelles canon) plus 9 000 $ au plus d'un seul type, bâtiment requis posé gratuitement, 150 s, 2 graines. Temps tenu par le QG à menace 14 : référence seule 29 s ; mitrailleurs 72 s ; lance-roquettes 84 s ; tanks 96 s ; Apaches 101 s (le meilleur par dollar) ; AC-130 34 s (il tue beaucoup mais ne protège pas, laissé tel quel).
- Corrigé (ils ne valaient pas leur prix : 43 à 47 s à menace 14) : Mech lourd 140 dégâts et 2 600 de vie (95 et 1 600) : 82 s après ; Mech de combat minigun 36, roquettes 380, 8 000 de vie (16, 260, 5 000) : 64 s après ; chasseur 150 dégâts et 300 obus : 73 s après ; Warthog 110 dégâts : 72 s après.
- Améliorations : 2 000 $ d'améliorations valent à peu près 2 000 $ d'unités au banc ; en partie elles valent plus (elles touchent toutes les unités du type).
- À surveiller : le tank avec Blindage 5, Blindage réactif 3 et l'atelier ne meurt presque plus (0 perte en 60 min).
- Pas vérifié : le pilotage, le cell (plafond de 300), le banc refait seulement pour les unités changées, les parties longues « après » sur une seule graine.

## La Ruche, les vallées et le danger qui monte (2026-11-13, tâche 101)
Demande de Martin : « pas assez de challenge ? un but manquant ? ». Deux idées acceptées : une fin qu'on peut gagner, et un danger qui monte au lieu d'une base à 100 % qui s'écroule d'un coup. Tous les chiffres sont dans `RTS_REGL` (`js/41-rts.js`), le code dans `js/65-rts-ruche.js`.

### La Ruche (but)
- Annoncé dès le départ (bandeau et astuce « but ») ; compteur en haut : « ⛰ V1 · 🏚 Nids 3 / 8 → Ruche », puis « 👑 Ruche 62 % ».
- Au 8e nid détruit, la Ruche sort à 400 m au nord (430 m en vallée 2, 460 m en vallée 3), près de la route : dôme de chair à étages, pustules vertes, couronne de cornes, tentacules. 👑 violet sur la mini-carte, qui s'allonge jusqu'à elle.
- Elle est rangée avec les nids (`n.ruche`) : on l'attaque comme un nid (ordre, tirs, explosions, pilotage), mais elle ne compte pas parmi les 6 nids actifs ni dans les nids détruits.
- Elle pond (2 + menace × 0,35 zombies toutes les 10 s, vers la base) ; garde : 20 zombies (+6 par vallée) et un boss qui restent autour d'elle (ils voient à 30 m) ; attaquée, elle appelle 4 zombies (+2 par vallée) toutes les 8 s.
- Vie : 160 000 en vallée 1 (+50 % par vallée). Elle encaisse 60 % des dégâts des explosions (`blindage`) : sans ça, 20 tanks la rasaient en 30 secondes.
- Détruite : « Vallée libérée ! » (temps, nids, tués, pertes, récompense : 300 ⚙ +150 par vallée, 3 000 $), la vallée suivante est débloquée. Deux boutons : « Vallée suivante » (nouvelle partie) et « Continuer sans fin » (la partie reprend sans Ruche, comme avant).
- Vallées : `P.rtsVallee` (la plus haute débloquée), `P.rtsLib` (la plus haute libérée). Chaque vallée de plus : +1 à la menace de départ, le temps fait monter la menace 30 % plus vite, +600 $ au départ, nids +25 % de vie, Ruche +50 %. Sur l'écran titre, sous « Guerre des robots », un choix ◀ Vallée n ▶ (seulement après une vallée libérée) permet de rejouer une vallée déjà libérée. Record dans les statistiques (« vallées libérées »). Succès « Libérateur » (1, 3, 5 vallées).
- Sauvegarde : `vallee`, `libre`, `ruche` (position, vie) dans `dt_rts_partie` ; une vieille sauvegarde se charge en vallée 1 (si 8 nids y sont déjà détruits, la Ruche sort).

### Les sièges
- Toutes les 3 hordes (avec le boss), pas avant 5 minutes de jeu (en vallée 2, un siège à 2 minutes rasait la base de départ) : annonce 10 s d'avance (gros bandeau, sirène, bandeau en haut avec le compte à rebours, point rouge qui clignote sur la mini-carte du côté d'où il vient : gauche, nord ou droite).
- Au moment de la horde : une grosse horde d'un seul côté, à 55 m du bord de la base (4 fois une horde normale), puis un flot (2 + menace × 1,2 zombies toutes les 2,5 s) pendant 40 s. Les zombies du siège ont 1,7 fois la vie et 1,3 fois les dégâts, foncent vers le QG et n'attaquent que ce qui est à moins de 9 m. Chaque siège est 4 % plus gros et plus solide que le précédent. Ils peuvent dépasser le plafond de zombies de 300 (120 au cell).
- Puis 30 s d'accalmie (bandeau vert) : les nids pondent 3 fois moins et le QG se répare de 0,5 % de sa vie par seconde (15 % par accalmie). Entre les sièges, les nids pondent à 60 % et les hordes sont à 60 % d'avant.

### Les bâtiments ne s'écroulent plus d'un coup
- Contre un bâtiment, les dégâts d'un zombie ordinaire suivent la même règle que les boss : dégâts de base × multiplicateur de la menace à la puissance 0,6 (à menace 43 : 9,5 fois au lieu de 18).
- Place autour d'un bâtiment : au plus un zombie par 2,5 m de tour le frappe à la fois (QG : 18, tourelle : 7). Avant, des centaines s'entassaient au même endroit.
- La vie du QG monte avec la menace (+40 % de 6 000 par point : 51 600 à menace 20), en gardant sa part de vie.
- Mesure : le QG de l'ancien robot-joueur « tourelles » passe de 90 % à 0 en 2 à 10 minutes au lieu de 3 à 6 secondes.

### Menace
1 + (vallée − 1) + secondes / 200 × (1 + 0,3 × (vallée − 1)) + 0,8 par nid détruit + tués / 2 400. Avant : 1 + minutes / 4 + 0,5 par nid + tués / 600 (les tués en faisaient les deux tiers). À 25 minutes en vallée 1 avec 8 nids et 10 000 tués : 1 + 7,5 + 6,4 + 4,2 = 19 (temps et nids : 14 sur 18).

### Alerte à paliers
Du moins grave au plus grave : bâtiment attaqué hors de l'écran (comme avant), tourelle ou bâtiment perdu, 6 zombies ou plus dans la base, QG attaqué, QG sous 50 %, QG sous 25 % (couleur et son plus forts). Une alerte plus grave passe tout de suite ; une moins grave attend que la précédente soit finie ; chaque palier a son délai (15 à 30 s), les deux derniers ne repassent que si le QG est remonté (60 %, 35 %). Toucher l'alerte amène la caméra.

### Mesures (simulateur, robot-joueur, une partie à la fois)
Le robot-joueur va à la Ruche quand elle sort (groupe d'attaque assez fort, il envoie alors le gros de l'armée), s'arrête à la victoire ; « tourelles » n'y va jamais. Son signal de danger est devenu « QG touché dans les 20 dernières secondes » (avant : QG sous 85 %, il restait chez lui pour toujours une fois le QG entamé). Commande : `node outils/simulateur.js rts [stratégies] [graines] [minutes] [vallées]`.

Avant (jeu d'avant la tâche 101, mêmes outils de mesure) :

| Stratégie | Graine 1 (60 min) | Graine 2 (45 min) |
|---|---|---|
| tourelles | QG tombé à 59,8 min, de 90 % à 0 en 5 s | tient, QG touché à 41,7 min (95 %) |
| blindés | tient, 12 nids, QG jamais touché | tient, 16 nids, QG jamais touché |
| air | tient, 5 nids, QG jamais touché | pas mesuré |
| mixte | tient, 9 nids, QG à 16 % à la fin | tient, 9 nids, QG jamais touché |

Après, vallée 1 (réglages retenus) :

| Stratégie | Graine | Fin | Ruche sortie | 1re unité perdue | 1re tourelle perdue | 1er coup au QG |
|---|---|---|---|---|---|---|
| mixte | 1 | victoire à 34,3 min | 22,7 min | 7,4 min | 9,9 min | 17,4 min |
| mixte | 2 | victoire à 18,8 min | 16,1 min | 6,9 min | 8,1 min | jamais |
| blindés | 1 | victoire à 28,5 min | 17,6 min | 10 min | 7,2 min | jamais |
| blindés | 2 | victoire à 28,6 min | 17,7 min | jamais | 9,9 min | jamais |
| tourelles | 1 | QG tombé à 11,2 min (90 % à 0 en 17 s ; 1re tourelle perdue 4,2 min avant) | non | 6,8 min | 7 min | 9,4 min |
| tourelles | 2 | QG tombé à 24,8 min (90 % à 0 en 19 s ; 1re tourelle perdue 17,8 min avant) | non | 13,8 min | 7 min | 8,7 min |

Essai d'avant (Ruche 220 000, blindage 0,35, sièges +6 %) : mixte gagne à 27,6 min après un QG descendu à 51 % pendant un siège à 18 min, puis sauvé ; tourelles tombe à 26,6 et 28,8 min, de 90 % à 0 en 139 et 248 s. Avant la place autour des bâtiments et la vie du QG qui monte : 90 % à 0 en 5 à 24 s. Air (essai avec Ruche 160 000, sans les derniers réglages) : n'arrive pas à 8 nids en 60 min (5 et 7), QG jamais touché.

Vallées 2 et 3 (graine 1, 50 min) : vallée 2 : mixte tombe à 50 min (Ruche sortie à 22,7 min, assauts ratés), blindés gagne à 18,5 min ; vallée 3 : mixte tombe à 40,2 min, blindés tient 50 min sans détruire la Ruche (sortie à 23,8 min). Avec 3 de menace de départ par vallée, la vallée 3 tombait en 3 minutes : réglé à +1 et +600 $ de départ par vallée.

Ce qui reste loin de la cible : un bon joueur (mixte, blindés) a rarement chaud (QG touché dans 1 partie sur 4) ; la chute du QG peut encore être rapide (17 à 19 s dans les 2 dernières parties de « tourelles », 139 à 284 s dans les essais d'avant) ; une partie varie beaucoup d'une graine à l'autre (mixte gagne à 18,8 ou à 34,3 min). Écarté : Ruche à 90 000 sans blindage (blindés la rasait en 30 s), Ruche à 220 000 avec blindage 0,35 (assaut de 12 à 22 min), sièges sans dépasser le plafond (le plafond de 500 était déjà plein : le siège n'ajoutait presque rien), menace de départ +3 par vallée.

## À équilibrer en jouant
- Menace : voir la section de la tâche 101 (`RTS_REGL.menace`, `RTS_THREAT` en est un nom court). Avant la tâche 101 (tâche 67) : 1 + minutes / 4 + 0,5 par nid détruit + tués / 600.
- Boss (tâche 91) : leurs dégâts montent moins vite que ceux des autres zombies (dégâts de base × multiplicateur de la menace à la puissance 0,6, `RTS_BOSS_DMG`). Avant, la partie finissait toujours de la même façon : un Titan arrivait (un toutes les 7 minutes environ) et rasait en 20 secondes une base dont le QG était à 100 %. Les tués comptent encore pour les deux tiers de la menace après 20 minutes : essayé à 900 et 1 200, mais la durée des parties dépendait surtout du Titan, donc laissé à 600. Avant : 1 + minutes / 2,5 + 0,4 par nid + tués / 160, qui s'emballait (mieux on se défendait, plus il en venait). Simulateur, même robot-joueur : la base tenait 6 à 8 min, elle tient maintenant 16 à 30 min.
- Prix des véhicules et des avions, force des boss.
- Pilotage au doigt sur un vrai cell, plafond de 300 zombies au cell.
