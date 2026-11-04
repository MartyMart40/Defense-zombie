# Mode RTS : « Guerre des robots »

## Concept
Vue de dessus d'une base militaire au fond d'une vallée du désert. Montagnes au sud et sur les côtés, ouverture de 90° au nord. Les zombies viennent du nord, de tout le secteur, en partie le long d'une vieille route d'asphalte à moitié détruite. On achète et on place des bâtiments, des tourelles et des unités, et on détruit les nids. La partie est sans fin : on la perd quand le QG tombe.

## Fichiers
| Fichier | Contenu |
|---------|---------|
| `js/41-rts.js` | Données (unités, bâtiments, améliorations, boss, réglages `RTS_CFG`), modèles 3D, vallée (sable, montagnes, route, ruines, épaves) |
| `js/42-rts-unites.js` | Unités, bâtiments, nids, début et fin de partie, zombies (route, cibles, boss), IA des unités, boucle `rtsStep` |
| `js/43-rts-pilotage.js` | Pilotage à la première personne de n'importe quelle unité, tourelles et mortier contrôlés, vue du canonnier de l'AC-130 |
| `js/44-rts-interface.js` | Menus du bas (onglets, menu repliable), panneaux, pose des bâtiments sur quadrillage, commandes (souris, clavier, doigt), inscription du mode (`Jeu.mode('rts')`) |
| `js/45-rts-sauvegarde.js` | Partie en cours gardée toutes les 30 s, à la pause et quand le cell met le jeu de côté ; reprise par « Continuer la guerre » |
| `js/47-rts-astuces.js` | Astuces des premières parties : une bulle à la fois, au bon moment, une fois chacune ; « Plus d’astuces » les coupe, la pause permet de les revoir |
| `js/48-rts-liste.js` | Choisir les unités une par une : rangée « Unités » (pastilles avec la vie), Tab pour la suivante, double-clic pour le même type |
| `tests/t-rts.js`, `tests/t-cell.js`, `tests/t-rts-sauvegarde.js`, `tests/t-rts-astuces.js`, `tests/t-rts-selection.js` | Tests |

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
| Hélicoptère | 2 200 $ | Héliport |
| Chasseur | 3 000 $ | Aérodrome |
| Warthog | 3 800 $ | Aérodrome |
| AC-130 | 4 500 $ | Aérodrome |

### Bâtiments
Usine de robots 500 $, usine lourde 1 200 $, garage de blindés 1 500 $, héliport 1 800 $, aérodrome 3 000 $, récupérateur 400 $, atelier de réparation 700 $, barricade 60 $. Tourelles : mitrailleuse 250 $, lance-flammes 400 $, canon 450 $, mortier 600 $, Tesla 700 $ (6 niveaux chacune).

Les prix exacts sont dans `RTS_UNITS` et `RTS_BLD` (`js/41-rts.js`) : si un chiffre change dans le code, changer ce tableau aussi.

## Décisions prises
- Choisir les unités : au doigt, toucher une unité la choisit seule (retoucher la relâche), un appui long l'ajoute au groupe ou l'en retire ; un toucher à moins de 34 pixels d'une unité la prend (19 pixels quand des unités sont déjà choisies, pour pouvoir les déplacer juste à côté). À la souris : clic = seule, Maj+clic = ajoute ou retire, glisser = cadre, double-clic = même type à l'écran, Tab = suivante.
- Les avions ne sont attaqués que par les zombies volants.
- Pose des bâtiments sur un quadrillage de 2 m, rotation par quarts de tour (R ou bouton), gardée pour le suivant.
- Le bombardier est devenu un AC-130 : il tourne en virage à gauche autour de la zone visée.
- Au cell, le menu du bas se replie (choix gardé dans `dt_rtsFold`) ; au cell couché, une seule rangée qui défile de côté.

## Sauvegarde de la partie
- Gardé : argent, temps, menace, hordes, boss, améliorations, taille de la base, la route, tous les nids (détruits compris), bâtiments (niveau, vie, rotation), unités (vie, poste).
- Pas gardé : les zombies en vie, les obus en vol, le pilotage. La partie reprend sur la carte avec un instant de calme.
- Pause : « Sauver et quitter » ou « Abandonner (efface la partie) ». La sauvegarde est aussi effacée quand le QG tombe.
- Commencer une nouvelle partie quand une partie est sauvée demande une confirmation (deuxième clic).

## À équilibrer en jouant
- Simulateur (`docs/equilibrage.md`, 2026-11-04) : avec la stratégie simple du robot-joueur, le QG tombe vers 5 à 7 minutes, avec environ 500 zombies en vie dès la 5e minute. La menace monte avec chaque zombie tué (1 + tués / 160 + minutes / 2,5 + 0,4 par nid), donc mieux on se défend, plus il en vient : à vérifier en jouant.
- Prix des véhicules et des avions, force des boss.
- Pilotage au doigt sur un vrai cell, plafond de 300 zombies au cell.
