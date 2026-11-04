# Mode robot : « Robot de combat »

## Concept
On pilote un mech à deux pattes, vue du cockpit : minigun au bras gauche, lance-roquettes au bras droit. Le robot marche de rue en rue (les villes à la suite) et des bibites arrivent de tous les côtés. Débloqué en tombant au mode infini.

## Fichiers
| Fichier | Contenu |
|---------|---------|
| `js/39-robot.js` | Robot, cockpit, armes, surchauffe, garage (améliorations permanentes en ferraille), rues, commandes ordi et cell, inscription du mode (`Jeu.mode('robot')`) |
| `js/40-robot-monstres.js` | Bibites monstrueuses (rôdeur, araignée, abomination), 3 boss avec barre de vie, vagues de tous les côtés, carrefours pour choisir la rue suivante |
| `tests/t-robot.js`, `tests/t-robot2.js` | Tests |

## Chiffres actuels
- Rue de 140 m (`MECH_LEN`). Boss toutes les 3 rues.
- Blindage 1 500, +250 et réparation à chaque rue.
- Armes ×2,4, puis +16 % par rue ; zombies +22 % de vie par rue.
- Vagues de tous les côtés toutes les 28 s.
- Garage : 9 améliorations permanentes (blindage, dégâts et refroidissement de la minigun, dégâts, cadence et salve des roquettes, jambes, réparation, nanorobots) et 5 armes de plus (lance-flammes lourd, laser lourd, lance-grenades, arc électrique, canon électromagnétique).

## À équilibrer en jouant
Longueur des rues, blindage, croissance des armes et des zombies.
