# Équilibrage : résultats du simulateur

Rapport écrit par `outils/simulateur.js` le 2026-11-04 (graine 1). Un robot-joueur joue le vrai jeu en accéléré.
Il vise le zombie le plus proche de la barricade avec une erreur de visée selon le niveau du joueur, achète entre les vagues (l’arme suivante, puis toujours l’amélioration la moins chère), place ses talents et achète des défenses avec la ferraille.
Il lance ses pouvoirs (grenade, Molotov, frappe aérienne) dans les groupes serrés et améliore les pouvoirs avec une partie de sa ferraille.
Il ne se sert pas des accessoires, des compagnons ni du contrôle des tourelles : un vrai joueur fait un peu mieux.
Ces chiffres servent à comparer avant et après un changement d’équilibrage, pas à remplacer les essais de Martin.

- Débutant : erreur de visée d’environ 0,6° (à chaque coup), 10 % des tirs visés à la tête, 0,6 s pour changer de cible.
- Moyen : environ 0,35°, 30 % à la tête, 0,4 s.
- Bon : environ 0,17°, 60 % à la tête, 0,25 s.

## Saint-Clou selon la façon d’acheter les armes : joueur moyen

Une partie par stratégie, profil neuf.

| Stratégie | Résultat | Vagues | Barricade à la fin (plus bas) | Arme à la fin |
|---|---|---|---|---|
| l’arme suivante dès qu’on peut | Perdue | 4 / 5 | 0 % (0 %) | Fusil d’assaut |
| l’arme suivante avec deux fois son prix en poche, sans les armes de près | Libérée | 5 / 5 | 84 % (84 %) | Pistolet |
| le pistolet seulement, et des améliorations | Libérée | 5 / 5 | 62 % (62 %) | Pistolet |
| le fusil à pompe dès qu’on peut, puis des améliorations | Libérée | 5 / 5 | 69 % (69 %) | Fusil à pompe |

## Campagne : joueur moyen

Achat des armes : l’arme suivante avec deux fois son prix en poche, sans les armes de près. Jusqu’à 3 essais par ville, le profil (niveau, talents, ferraille, défenses) est gardé d’une partie à l’autre.

| Ville | Essai | Résultat | Vagues | Barricade à la fin (plus bas) | Argent à la fin | Niveau | Arme | Pouvoirs lancés | Minutes de jeu |
|---|---|---|---|---|---|---|---|---|---|
| Saint-Clou | 1 | Perdue | 4 / 5 | 0 % (0 %) | 2 298 $ | 5 | Pistolet | 19 | 7,6 |
| Saint-Clou | 2 | Libérée | 5 / 5 | 84 % (84 %) | 2 435 $ | 8 | Pistolet | 19 | 7,5 |
| Val-des-Cendres | 1 | Libérée | 6 / 6 | 100 % (39 %) | 2 582 $ | 11 | Fusil d’assaut | 27 | 9,3 |
| Banlieue Nord | 1 | Perdue | 4 / 7 | 0 % (0 %) | 3 671 $ | 13 | Fusil d’assaut | 26 | 6,9 |
| Banlieue Nord | 2 | Perdue | 4 / 7 | 0 % (0 %) | 3 518 $ | 14 | Fusil d’assaut | 30 | 6,9 |
| Banlieue Nord | 3 | Perdue | 4 / 7 | 0 % (0 %) | 3 546 $ | 15 | Fusil d’assaut | 34 | 6,7 |

Fin : niveau 15, 483 ferrailles.

### Mode infini (profil où la campagne s’est arrêtée, forcé même si le mode n’est pas débloqué)

| Ville | Vagues tenues | Zombies abattus | Arme | Minutes de jeu |
|---|---|---|---|---|
| Saint-Clou | 9 | 886 | Sniper | 11,5 |
| Port industriel | 9 | 882 | Sniper | 10,8 |

## Saint-Clou selon la façon d’acheter les armes : joueur bon

Une partie par stratégie, profil neuf.

| Stratégie | Résultat | Vagues | Barricade à la fin (plus bas) | Arme à la fin |
|---|---|---|---|---|
| l’arme suivante dès qu’on peut | Perdue | 4 / 5 | 0 % (0 %) | Fusil d’assaut |
| l’arme suivante avec deux fois son prix en poche, sans les armes de près | Libérée | 5 / 5 | 84 % (84 %) | Pistolet |
| le pistolet seulement, et des améliorations | Libérée | 5 / 5 | 84 % (84 %) | Pistolet |
| le fusil à pompe dès qu’on peut, puis des améliorations | Libérée | 5 / 5 | 57 % (57 %) | Fusil à pompe |

## Campagne : joueur bon

Achat des armes : l’arme suivante avec deux fois son prix en poche, sans les armes de près. Jusqu’à 3 essais par ville, le profil (niveau, talents, ferraille, défenses) est gardé d’une partie à l’autre.

| Ville | Essai | Résultat | Vagues | Barricade à la fin (plus bas) | Argent à la fin | Niveau | Arme | Pouvoirs lancés | Minutes de jeu |
|---|---|---|---|---|---|---|---|---|---|
| Saint-Clou | 1 | Libérée | 5 / 5 | 88 % (88 %) | 2 873 $ | 6 | Pistolet | 7 | 7,4 |
| Val-des-Cendres | 1 | Libérée | 6 / 6 | 95 % (64 %) | 2 679 $ | 10 | Fusil d’assaut | 19 | 8,6 |
| Banlieue Nord | 1 | Perdue | 4 / 7 | 0 % (0 %) | 2 020 $ | 12 | Fusil d’assaut | 30 | 6,8 |
| Banlieue Nord | 2 | Perdue | 3 / 7 | 0 % (0 %) | 1 003 $ | 13 | Fusil d’assaut | 12 | 4,4 |
| Banlieue Nord | 3 | Perdue | 5 / 7 | 0 % (0 %) | 1 517 $ | 14 | Sniper | 36 | 8 |

Fin : niveau 14, 778 ferrailles.

### Mode infini (profil où la campagne s’est arrêtée, forcé même si le mode n’est pas débloqué)

| Ville | Vagues tenues | Zombies abattus | Arme | Minutes de jeu |
|---|---|---|---|---|
| Saint-Clou | 10 | 1 004 | Arbalète | 12,6 |
| Port industriel | 14 | 1 758 | Arbalète | 18,6 |

## Guerre des robots (RTS)

Le robot-joueur bâtit une usine lourde, un récupérateur, un atelier de réparation, des tourelles devant la base (5, plus 2 par nid détruit, plus une toutes les 3 minutes), achète l’unité la plus forte qu’il peut payer (10, plus 3 par nid détruit, plus une toutes les 90 secondes), des améliorations dès qu’il a de l’argent en trop. Deux façons de jouer : il attaque le nid le plus proche dès qu’il a 8 unités au sol, ou il garde toute son armée à la base. Une ligne toutes les 5 minutes de jeu. Rappel : menace = 1 + zombies tués / 160 + minutes / 2,5 + 0,4 par nid détruit.

### Il attaque les nids

| Minute | Nids détruits | Unités | Tourelles | Argent | Menace | Vie du QG | Zombies en vie | Zombies tués | Unités perdues | Boss abattus |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 4 | 3 | 350 $ | 1 | 100 % | 0 | 0 | 0 | 0 |
| 5 | 1 | 16 | 8 | 823 $ | 4,5 | 100 % | 495 | 1079 | 0 | 0 |
| 10 | 1 | 19 | 10 | 1 228 $ | 8,7 | 100 % | 500 | 2822 | 8 | 2 |
| 15 | 1 | 22 | 11 | 1 463 $ | 13,5 | 100 % | 501 | 4949 | 13 | 4 |
| 19,8 | 1 | 26 | 13 | 779 $ | 18,1 | 0 % | 498 | 6992 | 20 | 6 |

**Le QG est tombé à 19,8 min.**

### Il reste à la base

| Minute | Nids détruits | Unités | Tourelles | Argent | Menace | Vie du QG | Zombies en vie | Zombies tués | Unités perdues | Boss abattus |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 4 | 3 | 350 $ | 1 | 100 % | 0 | 0 | 0 | 0 |
| 5 | 0 | 13 | 6 | 685 $ | 4,1 | 100 % | 494 | 1100 | 0 | 0 |
| 10 | 0 | 16 | 8 | 575 $ | 8,5 | 100 % | 496 | 3029 | 0 | 2 |
| 15 | 0 | 19 | 9 | 780 $ | 13,7 | 100 % | 500 | 5351 | 0 | 4 |
| 20 | 0 | 18 | 2 | 230 $ | 18,6 | 0 % | 500 | 7572 | 12 | 6 |

**Le QG est tombé à 20 min.**


_Simulation faite en 361 s._
