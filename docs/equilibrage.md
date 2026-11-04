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
| l’arme suivante dès qu’on peut | Perdue | 3 / 5 | 0 % (0 %) | Fusil à pompe |
| l’arme suivante avec deux fois son prix en poche, sans les armes de près | Libérée | 5 / 5 | 56 % (56 %) | Pistolet |
| le pistolet seulement, et des améliorations | Libérée | 5 / 5 | 84 % (84 %) | Pistolet |
| le fusil à pompe dès qu’on peut, puis des améliorations | Libérée | 5 / 5 | 27 % (27 %) | Fusil à pompe |

## Campagne : joueur moyen

Achat des armes : l’arme suivante avec deux fois son prix en poche, sans les armes de près. Jusqu’à 3 essais par ville, le profil (niveau, talents, ferraille, défenses) est gardé d’une partie à l’autre.

| Ville | Essai | Résultat | Vagues | Barricade à la fin (plus bas) | Argent à la fin | Niveau | Arme | Pouvoirs lancés | Minutes de jeu |
|---|---|---|---|---|---|---|---|---|---|
| Saint-Clou | 1 | Libérée | 5 / 5 | 88 % (88 %) | 2 454 $ | 6 | Pistolet | 10 | 7,5 |
| Val-des-Cendres | 1 | Libérée | 6 / 6 | 68 % (68 %) | 2 536 $ | 10 | Fusil d’assaut | 26 | 9,4 |
| Banlieue Nord | 1 | Perdue | 4 / 7 | 0 % (0 %) | 1 976 $ | 12 | Fusil d’assaut | 27 | 7 |
| Banlieue Nord | 2 | Perdue | 4 / 7 | 0 % (0 %) | 2 329 $ | 13 | Fusil d’assaut | 29 | 6,9 |
| Banlieue Nord | 3 | Perdue | 4 / 7 | 0 % (0 %) | 4 005 $ | 14 | Fusil d’assaut | 32 | 6,7 |

Fin : niveau 14, 430 ferrailles.

### Mode infini (profil où la campagne s’est arrêtée, forcé même si le mode n’est pas débloqué)

| Ville | Vagues tenues | Zombies abattus | Arme | Minutes de jeu |
|---|---|---|---|---|
| Saint-Clou | 9 | 877 | Sniper | 11,6 |
| Port industriel | 18 | 2 863 | Mitrailleuse .50 | 27,9 |

## Saint-Clou selon la façon d’acheter les armes : joueur bon

Une partie par stratégie, profil neuf.

| Stratégie | Résultat | Vagues | Barricade à la fin (plus bas) | Arme à la fin |
|---|---|---|---|---|
| l’arme suivante dès qu’on peut | Perdue | 4 / 5 | 0 % (0 %) | Fusil d’assaut |
| l’arme suivante avec deux fois son prix en poche, sans les armes de près | Libérée | 5 / 5 | 68 % (68 %) | Pistolet |
| le pistolet seulement, et des améliorations | Libérée | 5 / 5 | 88 % (88 %) | Pistolet |
| le fusil à pompe dès qu’on peut, puis des améliorations | Libérée | 5 / 5 | 74 % (74 %) | Fusil à pompe |

## Campagne : joueur bon

Achat des armes : l’arme suivante avec deux fois son prix en poche, sans les armes de près. Jusqu’à 3 essais par ville, le profil (niveau, talents, ferraille, défenses) est gardé d’une partie à l’autre.

| Ville | Essai | Résultat | Vagues | Barricade à la fin (plus bas) | Argent à la fin | Niveau | Arme | Pouvoirs lancés | Minutes de jeu |
|---|---|---|---|---|---|---|---|---|---|
| Saint-Clou | 1 | Libérée | 5 / 5 | 77 % (77 %) | 3 009 $ | 6 | Pistolet | 11 | 7,5 |
| Val-des-Cendres | 1 | Libérée | 6 / 6 | 100 % (82 %) | 2 808 $ | 10 | Fusil d’assaut | 25 | 8,9 |
| Banlieue Nord | 1 | Perdue | 4 / 7 | 0 % (0 %) | 3 371 $ | 12 | Fusil d’assaut | 26 | 7,1 |
| Banlieue Nord | 2 | Perdue | 4 / 7 | 0 % (0 %) | 1 817 $ | 13 | Fusil d’assaut | 33 | 6,7 |
| Banlieue Nord | 3 | Perdue | 6 / 7 | 0 % (0 %) | 5 560 $ | 15 | Sniper | 58 | 10,6 |

Fin : niveau 15, 2024 ferrailles.

### Mode infini (profil où la campagne s’est arrêtée, forcé même si le mode n’est pas débloqué)

| Ville | Vagues tenues | Zombies abattus | Arme | Minutes de jeu |
|---|---|---|---|---|
| Saint-Clou | 9 | 866 | Fusil d’assaut | 11,9 |
| Port industriel | 9 | 883 | Fusil d’assaut | 12,1 |

## Guerre des robots (RTS)

Le robot-joueur bâtit une usine lourde, un récupérateur, un atelier de réparation, des tourelles devant la base (5, plus 2 par nid détruit, plus une toutes les 3 minutes), achète l’unité la plus forte qu’il peut payer (10, plus 3 par nid détruit, plus une toutes les 90 secondes), des améliorations dès qu’il a de l’argent en trop. Deux façons de jouer : il attaque le nid le plus proche dès qu’il a 8 unités au sol, ou il garde toute son armée à la base. Une ligne toutes les 5 minutes de jeu. Rappel : menace = 1 + zombies tués / 160 + minutes / 2,5 + 0,4 par nid détruit.

### Il attaque les nids

| Minute | Nids détruits | Unités | Tourelles | Argent | Menace | Vie du QG | Zombies en vie | Zombies tués | Unités perdues | Boss abattus |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 4 | 3 | 350 $ | 1 | 100 % | 0 | 0 | 0 | 0 |
| 5 | 1 | 16 | 8 | 595 $ | 4,6 | 100 % | 499 | 1090 | 0 | 0 |
| 10 | 1 | 19 | 10 | 732 $ | 8,4 | 100 % | 501 | 2656 | 17 | 2 |
| 15 | 1 | 22 | 11 | 1 362 $ | 13 | 100 % | 497 | 4677 | 20 | 4 |
| 20 | 1 | 26 | 12 | 415 $ | 17,7 | 88 % | 499 | 6702 | 36 | 6 |
| 20,2 | 1 | 26 | 11 | 544 $ | 17,8 | 0 % | 499 | 6769 | 37 | 6 |

**Le QG est tombé à 20,2 min.**

### Il reste à la base

| Minute | Nids détruits | Unités | Tourelles | Argent | Menace | Vie du QG | Zombies en vie | Zombies tués | Unités perdues | Boss abattus |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 4 | 3 | 350 $ | 1 | 100 % | 0 | 0 | 0 | 0 |
| 5 | 0 | 13 | 6 | 733 $ | 4,1 | 100 % | 499 | 1132 | 0 | 0 |
| 10 | 0 | 16 | 8 | 1 404 $ | 8,5 | 100 % | 500 | 2984 | 0 | 2 |
| 15 | 0 | 19 | 9 | 321 $ | 13,5 | 100 % | 500 | 5246 | 0 | 4 |
| 15,7 | 0 | 20 | 3 | 393 $ | 14,2 | 0 % | 500 | 5549 | 4 | 4 |

**Le QG est tombé à 15,7 min.**


_Simulation faite en 335 s._
