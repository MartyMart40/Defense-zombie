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
| Fusil à pompe | Fusil à pompe | **0** | 14 |
| Fusil d’assaut | Fusil d’assaut | **0** | 17 |

### Val-des-Cendres, vague 5, 2 500 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| aucune (pistolet) | Pistolet | 97 | 21 |
| Fusil d’assaut | Fusil d’assaut | **0** | 16 |
| Sniper, Fusil d’assaut | Fusil d’assaut | 219 | 11 |

### Banlieue Nord, vague 5, 4 500 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| aucune (pistolet) | Pistolet | 1 475 | 21 |
| Fusil d’assaut | Fusil d’assaut | **0** | 17 |
| Arbalète, Fusil d’assaut | Fusil d’assaut | 997 | 9 |
| Lance-flammes, Fusil d’assaut | Fusil d’assaut | 50 | 34 |

### Centre-ville, vague 5, 7 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| aucune (pistolet) | Pistolet | 12 179 | 25 |
| Fusil d’assaut | Fusil d’assaut | **85** | 19 |
| Lance-flammes, Fusil d’assaut | Fusil d’assaut | 183 | 28 |
| Minigun | Minigun | 212 | 13 |

### Centre-ville, vague 7, 11 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| Fusil d’assaut | Fusil d’assaut | 1 280 | 18 |
| Minigun | Minigun | **93** | 11 |
| Lance-roquettes | Lance-roquettes | 7 884 | 27 |

### Port industriel, vague 6, 14 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| Fusil d’assaut | Fusil d’assaut | 28 729 | 22 |
| Minigun | Minigun | **837** | 12 |
| Lance-roquettes | Lance-roquettes | 9 123 | 27 |

### Port industriel, vague 8, 22 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| Minigun | Minigun | 3 182 | 11 |
| Lance-roquettes | Lance-roquettes | 5 634 | 23 |
| Mitrailleuse .50 | Mitrailleuse .50 | **2 279** | 8 |
| Fusil laser | Fusil laser | 4 414 | 14 |

### Port industriel, vague 9, 30 000 $ à dépenser

| Armes achetées | Arme améliorée avec le reste | Dégâts encaissés face à la horde | Secondes pour tuer le boss |
|---|---|---|---|
| Minigun | Minigun | 1 905 | 10 |
| Mitrailleuse .50 | Mitrailleuse .50 | 3 227 | 8 |
| Fusil laser | Fusil laser | **68** | 11 |
| Canon électromagnétique, Minigun | Minigun | 74 536 | 11 |

## Saint-Clou selon la façon d’acheter les armes : joueur moyen

Une partie par stratégie, profil neuf.

| Stratégie | Résultat | Vagues | Barricade à la fin (plus bas) | Arme à la fin |
|---|---|---|---|---|
| l’arme suivante dès qu’on peut | Libérée | 5 / 5 | 84 % (84 %) | Fusil d’assaut |
| l’arme suivante avec deux fois son prix en poche, sans les armes de près | Libérée | 5 / 5 | 84 % (84 %) | Pistolet |
| le pistolet seulement, et des améliorations | Libérée | 5 / 5 | 84 % (84 %) | Pistolet |
| le fusil à pompe dès qu’on peut, puis des améliorations | Libérée | 5 / 5 | 84 % (84 %) | Pistolet |
| selon le besoin : les armes de horde d’abord (fusil d’assaut, lance-flammes, minigun), le sniper pour les boss | Libérée | 5 / 5 | 84 % (84 %) | Fusil d’assaut |

## Campagne : joueur moyen

Achat des armes : selon le besoin : les armes de horde d’abord (fusil d’assaut, lance-flammes, minigun), le sniper pour les boss. Jusqu’à 3 essais par ville, le profil (niveau, talents, ferraille, défenses) est gardé d’une partie à l’autre.

| Ville | Essai | Résultat | Vagues | Barricade à la fin (plus bas) | Argent à la fin | Niveau | Arme | Pouvoirs lancés | Minutes de jeu |
|---|---|---|---|---|---|---|---|---|---|
| Saint-Clou | 1 | Libérée | 5 / 5 | 84 % (84 %) | 2 376 $ | 6 | Fusil d’assaut | 9 | 7,3 |
| Val-des-Cendres | 1 | Libérée | 6 / 6 | 100 % (100 %) | 2 867 $ | 10 | Fusil d’assaut | 12 | 8,7 |
| Banlieue Nord | 1 | Libérée | 7 / 7 | 100 % (73 %) | 4 634 $ | 14 | Fusil d’assaut | 43 | 10,3 |
| Centre-ville | 1 | Libérée | 8 / 8 | 97 % (78 %) | 7 306 $ | 17 | Minigun | 80 | 12,7 |
| Port industriel | 1 | Perdue | 4 / 10 | 0 % (0 %) | 6 727 $ | 18 | Fusil d’assaut | 40 | 6,2 |
| Port industriel | 2 | Libérée | 10 / 10 | 100 % (64 %) | 17 242 $ | 21 | Minigun | 124 | 16,7 |

Fin : niveau 21, 4551 ferrailles.

### Mode infini (profil de fin de campagne)

| Ville | Vagues tenues | Zombies abattus | Arme | Minutes de jeu |
|---|---|---|---|---|
| Saint-Clou | 23 | 4 721 | Minigun | 33,3 |
| Port industriel | 25 | 5 882 | Mitrailleuse .50 | 36,7 |

## Saint-Clou selon la façon d’acheter les armes : joueur bon

Une partie par stratégie, profil neuf.

| Stratégie | Résultat | Vagues | Barricade à la fin (plus bas) | Arme à la fin |
|---|---|---|---|---|
| l’arme suivante dès qu’on peut | Libérée | 5 / 5 | 84 % (84 %) | Pistolet |
| l’arme suivante avec deux fois son prix en poche, sans les armes de près | Libérée | 5 / 5 | 84 % (84 %) | Pistolet |
| le pistolet seulement, et des améliorations | Libérée | 5 / 5 | 84 % (84 %) | Pistolet |
| le fusil à pompe dès qu’on peut, puis des améliorations | Libérée | 5 / 5 | 84 % (84 %) | Pistolet |
| selon le besoin : les armes de horde d’abord (fusil d’assaut, lance-flammes, minigun), le sniper pour les boss | Libérée | 5 / 5 | 84 % (84 %) | Fusil d’assaut |

## Campagne : joueur bon

Achat des armes : selon le besoin : les armes de horde d’abord (fusil d’assaut, lance-flammes, minigun), le sniper pour les boss. Jusqu’à 3 essais par ville, le profil (niveau, talents, ferraille, défenses) est gardé d’une partie à l’autre.

| Ville | Essai | Résultat | Vagues | Barricade à la fin (plus bas) | Argent à la fin | Niveau | Arme | Pouvoirs lancés | Minutes de jeu |
|---|---|---|---|---|---|---|---|---|---|
| Saint-Clou | 1 | Libérée | 5 / 5 | 84 % (84 %) | 2 203 $ | 6 | Fusil d’assaut | 4 | 6,3 |
| Val-des-Cendres | 1 | Libérée | 6 / 6 | 100 % (82 %) | 2 541 $ | 10 | Fusil d’assaut | 4 | 7,5 |
| Banlieue Nord | 1 | Libérée | 7 / 7 | 100 % (81 %) | 5 395 $ | 14 | Fusil d’assaut | 23 | 9,5 |
| Centre-ville | 1 | Libérée | 8 / 8 | 100 % (77 %) | 8 558 $ | 17 | Minigun | 49 | 11,5 |
| Port industriel | 1 | Libérée | 10 / 10 | 82 % (38 %) | 16 822 $ | 21 | Minigun | 117 | 15,3 |

Fin : niveau 21, 3396 ferrailles.

### Mode infini (profil de fin de campagne)

| Ville | Vagues tenues | Zombies abattus | Arme | Minutes de jeu |
|---|---|---|---|---|
| Saint-Clou | 24 | 5 351 | Minigun | 33,5 |
| Port industriel | 23 | 4 761 | Lance-roquettes | 30,8 |

## Guerre des robots (RTS)

Le robot-joueur bâtit une usine lourde, un récupérateur, un atelier de réparation, des tourelles devant la base (5, plus 2 par nid détruit, plus une toutes les 3 minutes), achète l’unité la plus forte qu’il peut payer (10, plus 3 par nid détruit, plus une toutes les 90 secondes), des améliorations dès qu’il a de l’argent en trop. Deux façons de jouer : il attaque le nid le plus proche dès qu’il a 8 unités au sol, ou il garde toute son armée à la base. Une ligne toutes les 5 minutes de jeu. Rappel : menace = 1 + zombies tués / 160 + minutes / 2,5 + 0,4 par nid détruit.

### Il attaque les nids

| Minute | Nids détruits | Unités | Tourelles | Argent | Menace | Vie du QG | Zombies en vie | Zombies tués | Unités perdues | Boss abattus |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 4 | 3 | 350 $ | 1 | 100 % | 0 | 0 | 0 | 0 |
| 5 | 1 | 16 | 8 | 689 $ | 4,6 | 100 % | 498 | 1110 | 0 | 0 |
| 10 | 1 | 19 | 10 | 1 076 $ | 8,5 | 100 % | 500 | 2704 | 23 | 2 |
| 15 | 1 | 22 | 11 | 1 755 $ | 13 | 100 % | 500 | 4622 | 30 | 4 |
| 20 | 1 | 26 | 10 | 536 $ | 17,6 | 100 % | 499 | 6647 | 45 | 6 |
| 23,2 | 1 | 27 | 6 | 579 $ | 20,5 | 0 % | 499 | 7895 | 60 | 7 |

**Le QG est tombé à 23,2 min.**

### Il reste à la base

| Minute | Nids détruits | Unités | Tourelles | Argent | Menace | Vie du QG | Zombies en vie | Zombies tués | Unités perdues | Boss abattus |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 4 | 3 | 350 $ | 1 | 100 % | 0 | 0 | 0 | 0 |
| 5 | 0 | 13 | 6 | 601 $ | 4,1 | 100 % | 502 | 1110 | 0 | 0 |
| 10 | 0 | 16 | 8 | 1 464 $ | 8,5 | 100 % | 500 | 2999 | 0 | 3 |
| 15 | 0 | 19 | 8 | 422 $ | 13,5 | 100 % | 499 | 5261 | 1 | 4 |
| 19,5 | 0 | 12 | 1 | 371 $ | 18,2 | 0 % | 499 | 7369 | 20 | 6 |

**Le QG est tombé à 19,5 min.**


_Simulation faite en 791 s._
