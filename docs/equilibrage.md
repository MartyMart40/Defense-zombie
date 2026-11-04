# Équilibrage : résultats du simulateur

Rapport écrit par `outils/simulateur.js` le 2026-11-04 (graine 1). Un robot-joueur joue le vrai jeu en accéléré.
Il vise le zombie le plus proche de la barricade avec une erreur de visée selon le niveau du joueur, achète entre les vagues (l’arme suivante, puis toujours l’amélioration la moins chère), place ses talents et achète des défenses avec la ferraille.
Il ne se sert pas des pouvoirs, des accessoires, des compagnons ni du contrôle des tourelles : un vrai joueur fait un peu mieux.
Ces chiffres servent à comparer avant et après un changement d’équilibrage, pas à remplacer les essais de Martin.

- Débutant : erreur de visée d’environ 0,6° (à chaque coup), 10 % des tirs visés à la tête, 0,6 s pour changer de cible.
- Moyen : environ 0,35°, 30 % à la tête, 0,4 s.
- Bon : environ 0,17°, 60 % à la tête, 0,25 s.

## Saint-Clou selon la façon d’acheter les armes : joueur moyen

Une partie par stratégie, profil neuf.

| Stratégie | Résultat | Vagues | Barricade à la fin (plus bas) | Arme à la fin |
|---|---|---|---|---|
| l’arme suivante dès qu’on peut | Perdue | 2 / 5 | 0 % (0 %) | Fusil à pompe |
| l’arme suivante avec deux fois son prix en poche, sans les armes de près | Libérée | 5 / 5 | 68 % (68 %) | Pistolet |
| le pistolet seulement, et des améliorations | Perdue | 4 / 5 | 0 % (0 %) | Pistolet |

## Campagne : joueur moyen

Achat des armes : l’arme suivante avec deux fois son prix en poche, sans les armes de près. Jusqu’à 3 essais par ville, le profil (niveau, talents, ferraille, défenses) est gardé d’une partie à l’autre.

| Ville | Essai | Résultat | Vagues | Barricade à la fin (plus bas) | Argent à la fin | Niveau | Arme | Minutes de jeu |
|---|---|---|---|---|---|---|---|---|
| Saint-Clou | 1 | Libérée | 5 / 5 | 17 % (17 %) | 2 435 $ | 6 | Pistolet | 8 |
| Val-des-Cendres | 1 | Perdue | 4 / 6 | 0 % (0 %) | 2 344 $ | 9 | Pistolet | 7,5 |
| Val-des-Cendres | 2 | Perdue | 5 / 6 | 0 % (0 %) | 1 926 $ | 11 | Fusil d’assaut | 8,9 |
| Val-des-Cendres | 3 | Libérée | 6 / 6 | 83 % (48 %) | 2 382 $ | 13 | Fusil d’assaut | 9,4 |
| Banlieue Nord | 1 | Perdue | 4 / 7 | 0 % (0 %) | 1 397 $ | 14 | Fusil d’assaut | 6,4 |
| Banlieue Nord | 2 | Perdue | 3 / 7 | 0 % (0 %) | 1 943 $ | 14 | Fusil d’assaut | 5,3 |
| Banlieue Nord | 3 | Perdue | 3 / 7 | 0 % (0 %) | 1 602 $ | 15 | Fusil d’assaut | 5 |

Fin : niveau 15, 256 ferrailles.

### Mode infini (profil où la campagne s’est arrêtée, forcé même si le mode n’est pas débloqué)

| Ville | Vagues tenues | Zombies abattus | Arme | Minutes de jeu |
|---|---|---|---|---|
| Saint-Clou | 9 | 823 | Sniper | 11,8 |
| Port industriel | 10 | 988 | Sniper | 13,5 |

## Saint-Clou selon la façon d’acheter les armes : joueur bon

Une partie par stratégie, profil neuf.

| Stratégie | Résultat | Vagues | Barricade à la fin (plus bas) | Arme à la fin |
|---|---|---|---|---|
| l’arme suivante dès qu’on peut | Perdue | 2 / 5 | 0 % (0 %) | Fusil à pompe |
| l’arme suivante avec deux fois son prix en poche, sans les armes de près | Libérée | 5 / 5 | 88 % (88 %) | Pistolet |
| le pistolet seulement, et des améliorations | Libérée | 5 / 5 | 84 % (82 %) | Pistolet |

## Campagne : joueur bon

Achat des armes : l’arme suivante avec deux fois son prix en poche, sans les armes de près. Jusqu’à 3 essais par ville, le profil (niveau, talents, ferraille, défenses) est gardé d’une partie à l’autre.

| Ville | Essai | Résultat | Vagues | Barricade à la fin (plus bas) | Argent à la fin | Niveau | Arme | Minutes de jeu |
|---|---|---|---|---|---|---|---|---|
| Saint-Clou | 1 | Libérée | 5 / 5 | 68 % (68 %) | 2 810 $ | 6 | Pistolet | 7,4 |
| Val-des-Cendres | 1 | Perdue | 4 / 6 | 0 % (0 %) | 2 772 $ | 9 | Pistolet | 7 |
| Val-des-Cendres | 2 | Libérée | 6 / 6 | 100 % (6 %) | 2 775 $ | 12 | Fusil d’assaut | 9 |
| Banlieue Nord | 1 | Perdue | 4 / 7 | 0 % (0 %) | 2 309 $ | 13 | Fusil d’assaut | 7 |
| Banlieue Nord | 2 | Perdue | 4 / 7 | 0 % (0 %) | 1 706 $ | 14 | Fusil d’assaut | 6,7 |
| Banlieue Nord | 3 | Perdue | 4 / 7 | 0 % (0 %) | 863 $ | 15 | Fusil d’assaut | 6,2 |

Fin : niveau 15, 167 ferrailles.

### Mode infini (profil où la campagne s’est arrêtée, forcé même si le mode n’est pas débloqué)

| Ville | Vagues tenues | Zombies abattus | Arme | Minutes de jeu |
|---|---|---|---|---|
| Saint-Clou | 9 | 891 | Fusil d’assaut | 12,5 |
| Port industriel | 11 | 1 135 | Arbalète | 14,7 |

## Guerre des robots (RTS)

Le robot-joueur bâtit une usine lourde, un récupérateur, un atelier de réparation, des tourelles devant la base (4 plus une par nid détruit), achète l’unité la plus forte qu’il peut payer (8 unités plus 3 par nid détruit) et des améliorations. Deux façons de jouer : il attaque le nid le plus proche dès qu’il a 8 unités au sol, ou il garde toute son armée à la base. Une ligne toutes les 5 minutes de jeu. Rappel : menace = 1 + zombies tués / 160 + minutes / 2,5 + 0,4 par nid détruit.

### Il attaque les nids

| Minute | Nids détruits | Unités | Tourelles | Argent | Menace | Vie du QG | Zombies en vie | Zombies tués | Unités perdues | Boss abattus |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 4 | 3 | 350 $ | 1 | 100 % | 0 | 0 | 0 | 0 |
| 5 | 1 | 11 | 5 | 1 368 $ | 9,2 | 100 % | 501 | 933 | 2 | 0 |
| 7 | 1 | 11 | 1 | 672 $ | 13,9 | 0 % | 497 | 1544 | 5 | 0 |

**Le QG est tombé à 7 min.**

### Il reste à la base

| Minute | Nids détruits | Unités | Tourelles | Argent | Menace | Vie du QG | Zombies en vie | Zombies tués | Unités perdues | Boss abattus |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 4 | 3 | 350 $ | 1 | 100 % | 0 | 0 | 0 | 0 |
| 5 | 0 | 8 | 1 | 629 $ | 9,7 | 98 % | 500 | 1070 | 0 | 0 |
| 5,2 | 0 | 8 | 0 | 417 $ | 10 | 0 % | 500 | 1102 | 2 | 0 |

**Le QG est tombé à 5,2 min.**


_Simulation faite en 304 s._
