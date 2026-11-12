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
| Fusil à pompe | Fusil à pompe | 5 | 15 |
| Fusil d’assaut | Fusil d’assaut | **0** | 18 |

### Val-des-Cendres, vague 5, 2 500 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| aucune (pistolet) | Pistolet | 44 | 22 |
| Fusil d’assaut | Fusil d’assaut | **0** | 17 |
| Sniper, Fusil d’assaut | Fusil d’assaut | 141 | 12 |

### Banlieue Nord, vague 5, 4 500 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| aucune (pistolet) | Pistolet | 894 | 22 |
| Fusil d’assaut | Fusil d’assaut | **0** | 17 |
| Arbalète, Fusil d’assaut | Fusil d’assaut | 1 293 | 9 |
| Lance-flammes, Fusil d’assaut | Fusil d’assaut | 110 | 36 |

### Centre-ville, vague 5, 7 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| aucune (pistolet) | Pistolet | 11 008 | 26 |
| Fusil d’assaut | Fusil d’assaut | **91** | 19 |
| Lance-flammes, Fusil d’assaut | Fusil d’assaut | 252 | 31 |
| Minigun | Minigun | 151 | 13 |

### Centre-ville, vague 7, 11 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| Fusil d’assaut | Fusil d’assaut | 234 | 18 |
| Minigun | Minigun | **122** | 11 |
| Lance-roquettes | Lance-roquettes | 11 121 | 28 |

### Port industriel, vague 6, 14 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| Fusil d’assaut | Fusil d’assaut | 19 060 | 22 |
| Minigun | Minigun | **1 906** | 12 |
| Lance-roquettes | Lance-roquettes | 8 007 | 27 |

### Port industriel, vague 8, 22 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| Minigun | Minigun | 1 760 | 11 |
| Lance-roquettes | Lance-roquettes | 5 576 | 23 |
| Mitrailleuse .50 | Mitrailleuse .50 | **445** | 8 |
| Fusil laser | Fusil laser | 1 141 | 14 |

### Port industriel, vague 9, 30 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| Minigun | Minigun | 3 569 | 10 |
| Mitrailleuse .50 | Mitrailleuse .50 | 3 247 | 7 |
| Fusil laser | Fusil laser | **0** | 11 |
| Canon électromagnétique, Minigun | Minigun | 21 652 | 7 |

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
| Saint-Clou | 1 | Libérée | 5 / 5 | 100 % (100 %) | 2 398 $ | 6 | Pistolet | 13 | 7,8 |
| Val-des-Cendres | 1 | Libérée | 6 / 6 | 100 % (100 %) | 2 811 $ | 10 | Fusil d’assaut | 11 | 8,1 |
| Banlieue Nord | 1 | Libérée | 7 / 7 | 100 % (100 %) | 3 921 $ | 14 | Fusil d’assaut | 41 | 10,8 |
| Centre-ville | 1 | Perdue | 4 / 8 | 0 % (0 %) | 5 423 $ | 15 | Lance-flammes | 34 | 6,5 |
| Centre-ville | 2 | Libérée | 8 / 8 | 100 % (82 %) | 7 169 $ | 18 | Minigun | 73 | 12,4 |
| Port industriel | 1 | Perdue | 4 / 10 | 0 % (0 %) | 2 946 $ | 19 | Lance-flammes | 41 | 6,2 |
| Port industriel | 2 | Perdue | 4 / 10 | 0 % (0 %) | 3 904 $ | 19 | Fusil d’assaut | 42 | 6,3 |
| Port industriel | 3 | Perdue | 4 / 10 | 0 % (0 %) | 5 567 $ | 20 | Fusil d’assaut | 41 | 6,6 |

Fin : niveau 20, 1001 ferrailles.

### Mode infini (profil où la campagne s’est arrêtée, forcé même si le mode n’est pas débloqué)

| Ville | Vagues tenues | Zombies abattus | Arme | Minutes de jeu |
|---|---|---|---|---|
| Saint-Clou | 34 | 14 093 | Canon électromagnétique | 51,8 |
| Port industriel | 25 | 5 793 | Lance-grenades auto | 34,5 |

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
| Saint-Clou | 1 | Libérée | 5 / 5 | 100 % (100 %) | 2 538 $ | 6 | Pistolet | 2 | 6,3 |
| Val-des-Cendres | 1 | Libérée | 6 / 6 | 100 % (100 %) | 2 767 $ | 10 | Fusil d’assaut | 6 | 7,4 |
| Banlieue Nord | 1 | Libérée | 7 / 7 | 100 % (100 %) | 4 394 $ | 14 | Fusil d’assaut | 16 | 9,4 |
| Centre-ville | 1 | Libérée | 8 / 8 | 97 % (97 %) | 7 024 $ | 17 | Minigun | 53 | 11,4 |
| Port industriel | 1 | Libérée | 10 / 10 | 100 % (73 %) | 15 306 $ | 21 | Minigun | 103 | 15,2 |

Fin : niveau 21, 3468 ferrailles.

### Mode infini (profil de fin de campagne)

| Ville | Vagues tenues | Zombies abattus | Arme | Minutes de jeu |
|---|---|---|---|---|
| Saint-Clou | 24 | 5 217 | Lance-grenades auto | 31,4 |
| Port industriel | 27 | 7 117 | Lance-grenades auto | 35,8 |

## Guerre des robots (RTS)

Le robot-joueur bâtit une usine lourde, un récupérateur, un atelier de réparation, des tourelles devant la base (5, plus 2 par nid détruit, plus une toutes les 3 minutes), achète l’unité la plus forte qu’il peut payer (10, plus 3 par nid détruit, plus une toutes les 90 secondes), des améliorations dès qu’il a de l’argent en trop. Deux façons de jouer : il attaque le nid le plus proche dès qu’il a 8 unités au sol, ou il garde toute son armée à la base. Une ligne toutes les 5 minutes de jeu. Rappel : menace = 1 + minutes / 4 + 0,5 par nid détruit + zombies tués / 600.

### Il attaque les nids

| Minute | Nids détruits | Unités | Tourelles | Argent | Menace | Vie du QG | Zombies en vie | Zombies tués | Unités perdues | Boss abattus |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 4 | 3 | 350 $ | 1 | 100 % | 0 | 0 | 0 | 0 |
| 5 | 1 | 16 | 8 | 1 049 $ | 4,5 | 100 % | 498 | 1053 | 1 | 0 |
| 10 | 1 | 19 | 10 | 1 150 $ | 8,6 | 100 % | 498 | 2732 | 5 | 3 |
| 15 | 1 | 22 | 11 | 818 $ | 13,3 | 100 % | 500 | 4850 | 14 | 4 |
| 20 | 1 | 26 | 13 | 458 $ | 18,6 | 100 % | 496 | 7268 | 25 | 7 |
| 25 | 1 | 29 | 15 | 3 237 $ | 25,4 | 100 % | 501 | 10561 | 38 | 9 |
| 29,4 | 1 | 28 | 0 | 364 $ | 30,2 | 0 % | 500 | 12836 | 77 | 10 |

**Le QG est tombé à 29,4 min.**

### Il reste à la base

| Minute | Nids détruits | Unités | Tourelles | Argent | Menace | Vie du QG | Zombies en vie | Zombies tués | Unités perdues | Boss abattus |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 4 | 3 | 350 $ | 1 | 100 % | 0 | 0 | 0 | 0 |
| 5 | 0 | 13 | 6 | 851 $ | 4,1 | 100 % | 504 | 1089 | 0 | 0 |
| 10 | 0 | 16 | 7 | 1 106 $ | 8,5 | 100 % | 502 | 2983 | 0 | 2 |
| 15 | 0 | 19 | 9 | 974 $ | 13,5 | 100 % | 500 | 5234 | 0 | 4 |
| 20 | 0 | 23 | 11 | 659 $ | 18,7 | 100 % | 500 | 7647 | 4 | 7 |
| 24,3 | 0 | 25 | 4 | 194 $ | 22,9 | 0 % | 500 | 9475 | 14 | 9 |

**Le QG est tombé à 24,3 min.**


_Simulation faite en 226 s._
