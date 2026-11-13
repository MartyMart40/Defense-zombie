# Équilibrage : résultats du simulateur

Rapport écrit par `outils/simulateur.js` le 2026-11-13 (graine 1). Un robot-joueur joue le vrai jeu en accéléré.
Il vise comme un joueur qui connaît le jeu : le zombie à moins de 8 m de la barricade d’abord, sinon un cracheur arrêté, sinon la tête du boss, sinon le plus proche. Il a une erreur de visée selon son niveau, vise dans la mire de loin, retient une partie du recul et prend l’arme qui convient à la cible parmi celles qu’il possède. Entre les vagues, il achète ses armes selon une stratégie, puis toujours l’amélioration la moins chère (pour l’arme qu’il a le plus tenue), place ses talents et achète des défenses avec la ferraille.
Il lance ses pouvoirs (grenade, Molotov, frappe aérienne) dans les groupes serrés et améliore les pouvoirs avec une partie de sa ferraille.
Il ne se sert pas des accessoires, des compagnons ni du contrôle des tourelles : un vrai joueur fait mieux, surtout dans les dernières villes. Les campagnes varient beaucoup d’une partie à l’autre : pour juger une arme, se fier au duel à budget égal.
Ces chiffres servent à comparer avant et après un changement d’équilibrage, pas à remplacer les essais de Martin.

- Débutant : erreur de visée d’environ 0,6° (à chaque coup), 10 % des tirs visés à la tête, 0,6 s pour changer de cible.
- Moyen : environ 0,35°, 30 % à la tête, 0,4 s.
- Bon : environ 0,17°, 60 % à la tête, 0,25 s.

## Duel à budget égal : est-ce que l’arme vaut son prix ?

La mesure la plus fiable de ce rapport. À une vague donnée, avec l’argent qu’un joueur a eu jusque-là, chaque ligne achète ses armes puis met tout le reste en améliorations (la moins chère d’abord). Joueur moyen, barricade infinie, sans pouvoirs ni défenses, moyenne de 2 parties. On mesure les dégâts que la barricade encaisse pendant la vague sans son boss (plus bas = mieux, le meilleur est en gras), et le temps pour tuer le boss seul. Règle visée : une arme plus chère doit faire au moins aussi bien que « garder l’arme d’avant et l’améliorer », ou être nettement meilleure contre le boss.

### Saint-Clou, vague 4, 1 300 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| aucune (pistolet) | Pistolet | **0** | 22 |
| Fusil à pompe | Fusil à pompe | **0** | 15 |
| Fusil d’assaut | Fusil d’assaut | **0** | 18 |

### Val-des-Cendres, vague 5, 2 500 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| aucune (pistolet) | Pistolet | 955 | 30 |
| Fusil d’assaut | Fusil d’assaut | **18** | 22 |
| Sniper, Fusil d’assaut | Fusil d’assaut | 3 094 | 13 |

### Banlieue Nord, vague 5, 4 500 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| aucune (pistolet) | Pistolet | 13 187 | 34 |
| Fusil d’assaut | Fusil d’assaut | **494** | 25 |
| Arbalète, Fusil d’assaut | Fusil d’assaut | 10 687 | 14 |
| Lance-flammes, Fusil d’assaut | Fusil d’assaut | 8 883 | 55 |

### Centre-ville, vague 5, 7 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| aucune (pistolet) | Pistolet | 41 206 | 36 |
| Fusil d’assaut | Fusil d’assaut | 9 349 | 25 |
| Lance-flammes, Fusil d’assaut | Fusil d’assaut | **1 446** | 41 |
| Minigun | Minigun | 3 548 | 16 |

### Centre-ville, vague 7, 11 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| Fusil d’assaut | Fusil d’assaut | 23 521 | 24 |
| Minigun | Minigun | **577** | 14 |
| Lance-roquettes | Lance-roquettes | 15 005 | 36 |

### Port industriel, vague 6, 14 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| Fusil d’assaut | Fusil d’assaut | 60 325 | 27 |
| Minigun | Minigun | **7 961** | 14 |
| Lance-roquettes | Lance-roquettes | 13 453 | 34 |

### Port industriel, vague 8, 22 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| Minigun | Minigun | 20 892 | 13 |
| Lance-roquettes | Lance-roquettes | 13 634 | 29 |
| Mitrailleuse .50 | Mitrailleuse .50 | **2 532** | 9 |
| Fusil laser | Fusil laser | 26 921 | 17 |

### Port industriel, vague 9, 30 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| Minigun | Minigun | 20 398 | 11 |
| Mitrailleuse .50 | Mitrailleuse .50 | 2 040 | 8 |
| Fusil laser | Fusil laser | **826** | 13 |
| Canon électromagnétique, Minigun | Minigun | 45 047 | 8 |

## Saint-Clou selon la façon d’acheter les armes : joueur moyen

Une partie par stratégie, profil neuf.

| Stratégie | Résultat | Vagues | Barricade à la fin (plus bas) | Arme à la fin |
|---|---|---|---|---|
| l’arme suivante dès qu’on peut | Libérée | 5 / 5 | 100 % (100 %) | Fusil d’assaut |
| l’arme suivante avec deux fois son prix en poche, sans les armes de près | Libérée | 5 / 5 | 100 % (100 %) | Pistolet |
| le pistolet seulement, et des améliorations | Libérée | 5 / 5 | 95 % (95 %) | Pistolet |
| le fusil à pompe dès qu’on peut, puis des améliorations | Libérée | 5 / 5 | 100 % (100 %) | Pistolet |
| selon le besoin : les armes de horde d’abord (fusil d’assaut, lance-flammes, minigun), le sniper pour les boss | Libérée | 5 / 5 | 100 % (100 %) | Pistolet |

## Campagne : joueur moyen

Achat des armes : selon le besoin : les armes de horde d’abord (fusil d’assaut, lance-flammes, minigun), le sniper pour les boss. Jusqu’à 3 essais par ville, le profil (niveau, talents, ferraille, défenses) est gardé d’une partie à l’autre.

| Ville | Essai | Résultat | Vagues | Barricade à la fin (plus bas) | Argent à la fin | Niveau | Arme | Pouvoirs lancés | Minutes de jeu |
|---|---|---|---|---|---|---|---|---|---|
| Saint-Clou | 1 | Libérée | 5 / 5 | 84 % (84 %) | 2 278 $ | 6 | Fusil d’assaut | 14 | 7,9 |
| Val-des-Cendres | 1 | Libérée | 6 / 6 | 100 % (100 %) | 2 543 $ | 10 | Fusil d’assaut | 24 | 9 |
| Banlieue Nord | 1 | Libérée | 7 / 7 | 100 % (46 %) | 3 878 $ | 14 | Fusil d’assaut | 46 | 10,9 |
| Centre-ville | 1 | Libérée | 8 / 8 | 71 % (60 %) | 7 336 $ | 17 | Minigun | 69 | 12,2 |
| Port industriel | 1 | Perdue | 4 / 10 | 0 % (0 %) | 5 332 $ | 18 | Fusil d’assaut | 35 | 5,9 |
| Port industriel | 2 | Libérée | 10 / 10 | 82 % (28 %) | 19 225 $ | 21 | Minigun | 107 | 15,5 |

Fin : niveau 21, 4882 ferrailles.

### Mode infini (profil de fin de campagne)

| Ville | Vagues tenues | Zombies abattus | Arme | Minutes de jeu |
|---|---|---|---|---|
| Saint-Clou | 23 | 4 768 | Mitrailleuse .50 | 30,4 |
| Port industriel | 25 | 5 904 | Mitrailleuse .50 | 33,2 |

## Saint-Clou selon la façon d’acheter les armes : joueur bon

Une partie par stratégie, profil neuf.

| Stratégie | Résultat | Vagues | Barricade à la fin (plus bas) | Arme à la fin |
|---|---|---|---|---|
| l’arme suivante dès qu’on peut | Libérée | 5 / 5 | 100 % (100 %) | Pistolet |
| l’arme suivante avec deux fois son prix en poche, sans les armes de près | Libérée | 5 / 5 | 100 % (100 %) | Pistolet |
| le pistolet seulement, et des améliorations | Libérée | 5 / 5 | 100 % (100 %) | Pistolet |
| le fusil à pompe dès qu’on peut, puis des améliorations | Libérée | 5 / 5 | 100 % (100 %) | Pistolet |
| selon le besoin : les armes de horde d’abord (fusil d’assaut, lance-flammes, minigun), le sniper pour les boss | Libérée | 5 / 5 | 100 % (100 %) | Fusil d’assaut |

## Campagne : joueur bon

Achat des armes : selon le besoin : les armes de horde d’abord (fusil d’assaut, lance-flammes, minigun), le sniper pour les boss. Jusqu’à 3 essais par ville, le profil (niveau, talents, ferraille, défenses) est gardé d’une partie à l’autre.

| Ville | Essai | Résultat | Vagues | Barricade à la fin (plus bas) | Argent à la fin | Niveau | Arme | Pouvoirs lancés | Minutes de jeu |
|---|---|---|---|---|---|---|---|---|---|
| Saint-Clou | 1 | Libérée | 5 / 5 | 100 % (100 %) | 2 379 $ | 6 | Pistolet | 1 | 6,4 |
| Val-des-Cendres | 1 | Libérée | 6 / 6 | 100 % (100 %) | 2 976 $ | 10 | Fusil d’assaut | 9 | 7,8 |
| Banlieue Nord | 1 | Libérée | 7 / 7 | 100 % (100 %) | 4 221 $ | 14 | Fusil d’assaut | 34 | 10,1 |
| Centre-ville | 1 | Libérée | 8 / 8 | 87 % (67 %) | 6 110 $ | 17 | Minigun | 62 | 11,7 |
| Port industriel | 1 | Perdue | 4 / 10 | 0 % (0 %) | 7 488 $ | 18 | Lance-flammes | 27 | 5,9 |
| Port industriel | 2 | Libérée | 10 / 10 | 95 % (66 %) | 15 320 $ | 21 | Mitrailleuse .50 | 101 | 15,3 |

Fin : niveau 21, 3485 ferrailles.

### Mode infini (profil de fin de campagne)

| Ville | Vagues tenues | Zombies abattus | Arme | Minutes de jeu |
|---|---|---|---|---|
| Saint-Clou | 27 | 7 102 | Lance-grenades auto | 35,3 |
| Port industriel | 27 | 7 214 | Mitrailleuse .50 | 34,9 |

## Guerre des robots (RTS)

Le robot-joueur bâtit une usine lourde, un récupérateur, un atelier de réparation, des tourelles devant la base (5, plus 2 par nid détruit, plus une toutes les 3 minutes), achète l’unité la plus forte qu’il peut payer (10, plus 3 par nid détruit, plus une toutes les 90 secondes), des améliorations dès qu’il a de l’argent en trop. Deux façons de jouer : il attaque le nid le plus proche dès qu’il a 8 unités au sol, ou il garde toute son armée à la base. Une ligne toutes les 5 minutes de jeu. Rappel : menace = 1 + minutes / 4 + 0,5 par nid détruit + zombies tués / 600.

### Il attaque les nids

| Minute | Nids détruits | Unités | Tourelles | Argent | Menace | Vie du QG | Zombies en vie | Zombies tués | Unités perdues | Boss abattus |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 4 | 3 | 350 $ | 1 | 100 % | 0 | 0 | 0 | 0 |
| 5 | 1 | 16 | 8 | 913 $ | 4,6 | 100 % | 494 | 1122 | 0 | 0 |
| 10 | 1 | 19 | 10 | 1 761 $ | 8,8 | 100 % | 498 | 2866 | 7 | 3 |
| 15 | 1 | 22 | 11 | 1 151 $ | 13,6 | 100 % | 501 | 4981 | 10 | 4 |
| 20 | 1 | 26 | 13 | 2 736 $ | 18,3 | 100 % | 500 | 7092 | 13 | 7 |
| 25 | 1 | 29 | 15 | 1 288 $ | 23,2 | 100 % | 500 | 9298 | 15 | 9 |
| 30 | 1 | 32 | 16 | 5 688 $ | 28,5 | 100 % | 500 | 11683 | 20 | 12 |
| 35 | 1 | 36 | 18 | 16 892 $ | 33,8 | 100 % | 500 | 14116 | 29 | 13 |
| 40 | 1 | 40 | 20 | 6 482 $ | 38,9 | 100 % | 507 | 16449 | 37 | 16 |
| 45 | 1 | 40 | 21 | 31 292 $ | 44,1 | 100 % | 500 | 18783 | 43 | 18 |
| 50 | 1 | 40 | 23 | 18 767 $ | 49 | 100 % | 499 | 21017 | 56 | 20 |
| 55 | 1 | 34 | 6 | 305 $ | 53,8 | 77 % | 500 | 23101 | 107 | 22 |
| 55,1 | 1 | 27 | 4 | 331 $ | 53,9 | 0 % | 500 | 23144 | 116 | 22 |

**Le QG est tombé à 55,1 min.**

### Il reste à la base

| Minute | Nids détruits | Unités | Tourelles | Argent | Menace | Vie du QG | Zombies en vie | Zombies tués | Unités perdues | Boss abattus |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 4 | 3 | 350 $ | 1 | 100 % | 0 | 0 | 0 | 0 |
| 5 | 0 | 13 | 6 | 823 $ | 4,1 | 100 % | 492 | 1094 | 0 | 0 |
| 10 | 0 | 16 | 8 | 1 644 $ | 8,7 | 100 % | 501 | 3147 | 0 | 3 |
| 15 | 0 | 19 | 9 | 1 641 $ | 14 | 100 % | 494 | 5542 | 0 | 4 |
| 20 | 0 | 23 | 11 | 2 724 $ | 19,2 | 100 % | 500 | 7897 | 1 | 7 |
| 25 | 0 | 26 | 13 | 3 582 $ | 24,4 | 100 % | 500 | 10298 | 1 | 9 |
| 30 | 0 | 29 | 14 | 2 362 $ | 30,1 | 100 % | 500 | 12956 | 2 | 12 |
| 35 | 0 | 33 | 12 | 441 $ | 35,6 | 100 % | 500 | 15507 | 28 | 13 |
| 36 | 0 | 24 | 2 | 238 $ | 36,6 | 0 % | 499 | 15980 | 45 | 13 |

**Le QG est tombé à 36 min.**


_Simulation faite en 985 s._
