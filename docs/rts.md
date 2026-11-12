# Mode RTS : « Guerre des robots »

## Concept
Vue de dessus d'une base militaire au fond d'une vallée du désert. Montagnes au sud et sur les côtés, ouverture de 90° au nord. Les zombies viennent du nord, de tout le secteur, en partie le long d'une vieille route d'asphalte à moitié détruite. On achète et on place des bâtiments, des tourelles et des unités, et on détruit les nids. La partie est sans fin : on la perd quand le QG tombe.

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
| `js/49-rts-commandement.js` | Mini-carte (toucher pour y aller), point de ralliement, alerte « Base attaquée », « ✋ Tenir » (u.hold), mode photo (dans la pause) |
| `tests/t-rts.js`, `tests/t-cell.js`, `tests/t-rts-sauvegarde.js`, `tests/t-rts-astuces.js`, `tests/t-rts-selection.js`, `tests/t-rts-commandement.js` | Tests |

## Règles et chiffres actuels
- Départ : 900 $, QG, usine de robots, 3 tourelles mitrailleuses, 3 fantassins.
- Toujours 6 nids actifs. Chaque nid détruit (+500 $) en fait apparaître un plus solide et plus rapide, plus loin au nord ; la vallée s'allonge par tronçons de 100 m.
- La base grandit de 8 m par nid détruit (rayon 30 m au départ, 70 m au plus). Le sable est plat sous la base jusqu'à 74 m.
- Hordes toutes les 45 s ; boss (Titan, Mère pondeuse, Béhémoth ailé) toutes les 3 hordes, à 25 % de leur vie du mode robot, +1 500 $.
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
- Tank : canon de 120 mm, un obus toutes les 3 s, 560 dégâts, grosse explosion ; mitrailleuse coaxiale en amélioration. Poste : le gros canon devant soi, qui recule à chaque tir.
- Apache (l'hélicoptère) : canon rotatif de 30 mm sous le nez et missiles Hellfire dès l'achat (les améliorations les renforcent), roquettes Hydra. Poste : vue du casque, verrière, écrans, canon qui tourne quand il tire, Hellfire sur les ailettes qui disparaissent quand ils partent.
- Chasseur : canon de 20 mm (75 dégâts, 10 coups/s), 200 obus ; Warthog : canon de 30 mm, 660 obus. AC-130 : 100 obus de 40 mm et 20 de 105 mm. À sec, l'avion retourne à l'aérodrome le plus proche refaire le plein (3 à 6 s au-dessus). Piloté : on y retourne soi-même, le viseur donne la distance.
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
Démolisseur de nids (3, 15, 50), Tenir le fort (10, 30, 60 minutes dans une partie), Chasseur de colosses (1, 10, 30 boss) (`js/51-succes-modes.js`).

## Sauvegarde de la partie
- Gardé : argent, temps, menace, hordes, boss, améliorations, taille de la base, la route, tous les nids (détruits compris), bâtiments (niveau, vie, rotation), unités (vie, poste).
- Pas gardé : les zombies en vie, les obus en vol, le pilotage. La partie reprend sur la carte avec un instant de calme.
- Pause : « Sauver et quitter » ou « Abandonner (efface la partie) ». La sauvegarde est aussi effacée quand le QG tombe.
- Commencer une nouvelle partie quand une partie est sauvée demande une confirmation (deuxième clic).

## À équilibrer en jouant
- Menace (tâche 67) : 1 + minutes / 4 + 0,5 par nid détruit + tués / 600 (`RTS_THREAT`).
- Boss (tâche 91) : leurs dégâts montent moins vite que ceux des autres zombies (dégâts de base × multiplicateur de la menace à la puissance 0,6, `RTS_BOSS_DMG`). Avant, la partie finissait toujours de la même façon : un Titan arrivait (un toutes les 7 minutes environ) et rasait en 20 secondes une base dont le QG était à 100 %. Les tués comptent encore pour les deux tiers de la menace après 20 minutes : essayé à 900 et 1 200, mais la durée des parties dépendait surtout du Titan, donc laissé à 600. Avant : 1 + minutes / 2,5 + 0,4 par nid + tués / 160, qui s'emballait (mieux on se défendait, plus il en venait). Simulateur, même robot-joueur : la base tenait 6 à 8 min, elle tient maintenant 16 à 30 min.
- Prix des véhicules et des avions, force des boss.
- Pilotage au doigt sur un vrai cell, plafond de 300 zombies au cell.
