# Équilibrage : résultats du simulateur

Rapport écrit par `outils/simulateur.js` le 2026-11-12 (graine 1). Un robot-joueur joue le vrai jeu en accéléré.
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
| aucune (pistolet) | Pistolet | 27 | 22 |
| Fusil d’assaut | Fusil d’assaut | **13** | 17 |
| Sniper, Fusil d’assaut | Fusil d’assaut | 91 | 12 |

### Banlieue Nord, vague 5, 4 500 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| aucune (pistolet) | Pistolet | 673 | 22 |
| Fusil d’assaut | Fusil d’assaut | **0** | 17 |
| Arbalète, Fusil d’assaut | Fusil d’assaut | 675 | 9 |
| Lance-flammes, Fusil d’assaut | Fusil d’assaut | 120 | 37 |

### Centre-ville, vague 5, 7 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| aucune (pistolet) | Pistolet | 9 866 | 27 |
| Fusil d’assaut | Fusil d’assaut | 330 | 19 |
| Lance-flammes, Fusil d’assaut | Fusil d’assaut | 213 | 30 |
| Minigun | Minigun | **200** | 13 |

### Centre-ville, vague 7, 11 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| Fusil d’assaut | Fusil d’assaut | 1 556 | 18 |
| Minigun | Minigun | **91** | 11 |
| Lance-roquettes | Lance-roquettes | 3 021 | 28 |

### Port industriel, vague 6, 14 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| Fusil d’assaut | Fusil d’assaut | 27 030 | 22 |
| Minigun | Minigun | **1 427** | 12 |
| Lance-roquettes | Lance-roquettes | 4 539 | 28 |

### Port industriel, vague 8, 22 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| Minigun | Minigun | 5 641 | 11 |
| Lance-roquettes | Lance-roquettes | 5 275 | 23 |
| Mitrailleuse .50 | Mitrailleuse .50 | **1 506** | 8 |
| Fusil laser | Fusil laser | 1 672 | 14 |

### Port industriel, vague 9, 30 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| Minigun | Minigun | 1 945 | 10 |
| Mitrailleuse .50 | Mitrailleuse .50 | 1 256 | 7 |
| Fusil laser | Fusil laser | **0** | 11 |
| Canon électromagnétique, Minigun | Minigun | 33 760 | 7 |

## Saint-Clou selon la façon d’acheter les armes : joueur moyen

Une partie par stratégie, profil neuf.

| Stratégie | Résultat | Vagues | Barricade à la fin (plus bas) | Arme à la fin |
|---|---|---|---|---|
| l’arme suivante dès qu’on peut | Libérée | 5 / 5 | 97 % (97 %) | Pistolet |
| l’arme suivante avec deux fois son prix en poche, sans les armes de près | Libérée | 5 / 5 | 100 % (100 %) | Pistolet |
| le pistolet seulement, et des améliorations | Libérée | 5 / 5 | 100 % (100 %) | Pistolet |
| le fusil à pompe dès qu’on peut, puis des améliorations | Libérée | 5 / 5 | 100 % (100 %) | Pistolet |
| selon le besoin : les armes de horde d’abord (fusil d’assaut, lance-flammes, minigun), le sniper pour les boss | Libérée | 5 / 5 | 100 % (100 %) | Fusil d’assaut |

## Campagne : joueur moyen

Achat des armes : selon le besoin : les armes de horde d’abord (fusil d’assaut, lance-flammes, minigun), le sniper pour les boss. Jusqu’à 3 essais par ville, le profil (niveau, talents, ferraille, défenses) est gardé d’une partie à l’autre.

| Ville | Essai | Résultat | Vagues | Barricade à la fin (plus bas) | Argent à la fin | Niveau | Arme | Pouvoirs lancés | Minutes de jeu |
|---|---|---|---|---|---|---|---|---|---|
| Saint-Clou | 1 | Libérée | 5 / 5 | 100 % (100 %) | 2 413 $ | 6 | Pistolet | 16 | 7,7 |
| Val-des-Cendres | 1 | Libérée | 6 / 6 | 100 % (100 %) | 2 264 $ | 10 | Fusil d’assaut | 10 | 8,4 |
| Banlieue Nord | 1 | Libérée | 7 / 7 | 100 % (100 %) | 4 140 $ | 14 | Fusil d’assaut | 29 | 9,9 |
| Centre-ville | 1 | Libérée | 8 / 8 | 100 % (100 %) | 6 839 $ | 17 | Minigun | 57 | 11,6 |
| Port industriel | 1 | Libérée | 10 / 10 | 74 % (55 %) | 15 419 $ | 21 | Mitrailleuse .50 | 107 | 15,2 |

Fin : niveau 21, 3674 ferrailles.

### Mode infini (profil de fin de campagne)

| Ville | Vagues tenues | Zombies abattus | Arme | Minutes de jeu |
|---|---|---|---|---|
| Saint-Clou | 24 | 5 114 | Minigun | 32 |
| Port industriel | 28 | 7 720 | Mitrailleuse .50 | 37,9 |

## Saint-Clou selon la façon d’acheter les armes : joueur bon

Une partie par stratégie, profil neuf.

| Stratégie | Résultat | Vagues | Barricade à la fin (plus bas) | Arme à la fin |
|---|---|---|---|---|
| l’arme suivante dès qu’on peut | Libérée | 5 / 5 | 100 % (100 %) | Fusil d’assaut |
| l’arme suivante avec deux fois son prix en poche, sans les armes de près | Libérée | 5 / 5 | 100 % (100 %) | Pistolet |
| le pistolet seulement, et des améliorations | Libérée | 5 / 5 | 100 % (100 %) | Pistolet |
| le fusil à pompe dès qu’on peut, puis des améliorations | Libérée | 5 / 5 | 100 % (100 %) | Pistolet |
| selon le besoin : les armes de horde d’abord (fusil d’assaut, lance-flammes, minigun), le sniper pour les boss | Libérée | 5 / 5 | 100 % (100 %) | Fusil d’assaut |

## Campagne : joueur bon

Achat des armes : selon le besoin : les armes de horde d’abord (fusil d’assaut, lance-flammes, minigun), le sniper pour les boss. Jusqu’à 3 essais par ville, le profil (niveau, talents, ferraille, défenses) est gardé d’une partie à l’autre.

| Ville | Essai | Résultat | Vagues | Barricade à la fin (plus bas) | Argent à la fin | Niveau | Arme | Pouvoirs lancés | Minutes de jeu |
|---|---|---|---|---|---|---|---|---|---|
| Saint-Clou | 1 | Libérée | 5 / 5 | 100 % (100 %) | 2 622 $ | 6 | Pistolet | 1 | 6,4 |
| Val-des-Cendres | 1 | Libérée | 6 / 6 | 100 % (100 %) | 3 039 $ | 10 | Fusil d’assaut | 5 | 7,7 |
| Banlieue Nord | 1 | Libérée | 7 / 7 | 100 % (100 %) | 4 341 $ | 14 | Fusil d’assaut | 8 | 9 |
| Centre-ville | 1 | Libérée | 8 / 8 | 100 % (100 %) | 8 352 $ | 17 | Minigun | 28 | 10,9 |
| Port industriel | 1 | Libérée | 10 / 10 | 100 % (73 %) | 16 054 $ | 21 | Minigun | 87 | 14,6 |

Fin : niveau 21, 3629 ferrailles.

### Mode infini (profil de fin de campagne)

| Ville | Vagues tenues | Zombies abattus | Arme | Minutes de jeu |
|---|---|---|---|---|
| Saint-Clou | 28 | 7 889 | Mitrailleuse .50 | 37,5 |
| Port industriel | 28 | 7 850 | Mitrailleuse .50 | 36,5 |

## Guerre des robots (RTS)

Le robot-joueur bâtit une usine lourde, un récupérateur, un atelier de réparation, des tourelles devant la base (5, plus 2 par nid détruit, plus une toutes les 3 minutes), achète l’unité la plus forte qu’il peut payer (10, plus 3 par nid détruit, plus une toutes les 90 secondes), des améliorations dès qu’il a de l’argent en trop. Deux façons de jouer : il attaque le nid le plus proche dès qu’il a 8 unités au sol, ou il garde toute son armée à la base. Une ligne toutes les 5 minutes de jeu. Rappel : menace = 1 + minutes / 4 + 0,5 par nid détruit + zombies tués / 600.

### Il attaque les nids

| Minute | Nids détruits | Unités | Tourelles | Argent | Menace | Vie du QG | Zombies en vie | Zombies tués | Unités perdues | Boss abattus |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 4 | 3 | 350 $ | 1 | 100 % | 0 | 0 | 0 | 0 |
| 5 | 1 | 16 | 8 | 783 $ | 4,6 | 100 % | 497 | 1098 | 0 | 0 |
| 10 | 1 | 19 | 10 | 1 825 $ | 8,5 | 100 % | 498 | 2691 | 7 | 2 |
| 15 | 1 | 22 | 11 | 2 500 $ | 13 | 100 % | 500 | 4678 | 10 | 4 |
| 20 | 1 | 26 | 13 | 368 $ | 17,6 | 100 % | 500 | 6633 | 16 | 6 |
| 25 | 1 | 29 | 15 | 2 121 $ | 22,3 | 100 % | 497 | 8737 | 17 | 9 |
| 30 | 1 | 32 | 16 | 8 259 $ | 27,8 | 100 % | 497 | 11269 | 19 | 11 |
| 35 | 1 | 36 | 18 | 26 886 $ | 33,2 | 100 % | 494 | 13756 | 28 | 13 |
| 40 | 1 | 39 | 20 | 29 721 $ | 38,2 | 100 % | 500 | 16034 | 37 | 16 |
| 45 | 1 | 40 | 21 | 52 811 $ | 43,5 | 100 % | 497 | 18422 | 44 | 18 |
| 50 | 1 | 40 | 23 | 30 819 $ | 48,5 | 100 % | 499 | 20692 | 49 | 20 |
| 55 | 1 | 40 | 15 | 655 $ | 53,6 | 100 % | 499 | 22987 | 89 | 22 |
| 56,5 | 1 | 17 | 1 | 548 $ | 54,9 | 0 % | 502 | 23541 | 119 | 22 |

**Le QG est tombé à 56,5 min.**

### Il reste à la base

| Minute | Nids détruits | Unités | Tourelles | Argent | Menace | Vie du QG | Zombies en vie | Zombies tués | Unités perdues | Boss abattus |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 4 | 3 | 350 $ | 1 | 100 % | 0 | 0 | 0 | 0 |
| 5 | 0 | 13 | 6 | 952 $ | 4 | 100 % | 496 | 1074 | 0 | 0 |
| 10 | 0 | 16 | 8 | 866 $ | 8,8 | 100 % | 500 | 3167 | 0 | 3 |
| 15 | 0 | 19 | 9 | 1 126 $ | 14,1 | 100 % | 488 | 5580 | 0 | 4 |
| 20 | 0 | 23 | 11 | 1 919 $ | 19,6 | 100 % | 497 | 8185 | 0 | 6 |
| 25 | 0 | 26 | 13 | 4 592 $ | 25,6 | 100 % | 500 | 11005 | 1 | 9 |
| 30 | 0 | 29 | 14 | 530 $ | 31,5 | 100 % | 494 | 13782 | 3 | 12 |
| 34,4 | 0 | 25 | 1 | 702 $ | 36,5 | 0 % | 500 | 16171 | 31 | 12 |

**Le QG est tombé à 34,4 min.**


_Simulation faite en 1066 s._
