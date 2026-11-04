# Suivi des tâches

Fichier tenu par Claude. Statuts : À faire, En cours, Fait, Bloqué.
Les 10 dernières tâches faites sont ici ; les plus anciennes sont dans `docs/historique.md`. Fiches des modes : `docs/robot.md`, `docs/rts.md`.

## En cours

| # | Tâche | Statut | Note |
|---|-------|--------|------|

## À faire

| # | Tâche | Priorité |
|---|-------|----------|
| - | Équilibrage après essais de Martin | Après essais |

Écarté par Martin : choisir 1 bonus parmi 3.

## Fait

| # | Tâche | Date |
|---|-------|------|
| 87 | Graphismes, style Ultra (ordi seulement, 4e choix du bouton Style ; sauté au cell) : rue mouillée qui reflète vraiment la scène (flaques, plus fort sous la pluie), rayons de soleil dans la brume, ombres douces (VSM), ombres de contact pleine résolution (js/61-graphismes-ultra.js, Reflector ajouté à lib/three-hd.js, tests/t-style.js) | 2026-11-04 |
| 86 | Graphismes, Haute définition séance 3 improvisée (sans téléchargement) : zombies en matériaux physiques (crasse, sang séché et frais, griffures, relief ; couleurs plus justes), flaque de sang où chaque zombie tombe, flou de profondeur en visant (net au point visé) (js/60-graphismes-zombies.js, tests/t-style.js) | 2026-11-04 |
| 85 | Graphismes, Haute définition, décor improvisé (sans téléchargement) : autos détaillées (vraies roues, vitres qui reflètent, phares, feux, pare-chocs, rétroviseurs), fils électriques entre les lampadaires, débris dans la rue (papiers, briques, planches, pneus, sacs, canettes) ; autos marquées dans js/03-scene.js (1 ligne) (js/59-graphismes-decor.js, tests/t-style.js) | 2026-11-04 |
| 84 | Graphismes, Haute définition séance 2 (partie sans téléchargement) : la nuit, les lampadaires éclairent vraiment la rue (8 projecteurs, ombres des 4 plus proches) avec un cône de brume éclairée ; textures photo encore en attente (sites bloqués par le réseau) (js/58-graphismes-hd.js, tests/t-style.js) | 2026-11-04 |
| 83 | RTS : la rangée « Unités » est repliée par défaut (une pastille « 👥 Unités · N » et les groupes) ; la toucher montre une pastille par unité à choisir une par une, la retoucher la referme (choix gardé, dt_rts_liste) (js/48-rts-liste.js, tests/t-rts-selection.js) | 2026-11-04 |
| 82 | Graphismes, Haute définition séance 1 (la lumière) : 3e choix du bouton Style. Matériaux physiques (relief et rugosité tirés des textures : flaques d’huile et vitres qui reflètent, briques en relief), lumière d’ambiance tirée d’une vraie image HDR par ville (Poly Haven, CC0, dossier `hdri/`), rendu en couleurs linéaires et étendues avec exposition et courbe ACES, ombres de contact (SSAO), ombre du soleil 4096 sur ordi (js/58-graphismes-hd.js, lib/three-hd.js, tests/t-style.js) | 2026-11-04 |
| 81 | Robot de combat ouvert dès le départ (plus besoin de tomber en mode infini ni de finir les villes). Style : bouton « Style » monté en haut de la pause (visible au cell couché sans défiler) ; en qualité basse, pas d’éclat et ombres moins fines (moins de lag sur un petit ordi) | 2026-11-04 |
| 80 | Graphismes, phase 1 : réglage « Style » dans Pause (Actuel, Amélioré ; dt_style). Amélioré sur le toit : vraies ombres du soleil (bâtiments, autos, zombies), textures dessinées par le code (asphalte fissuré, dalles, gazon, briques ou planches, cadres et allèges des fenêtres, bois, crasse), effets d’image (éclat lumineux, lissage FXAA, couleurs, coins assombris, grain). Effets de Three.js r128 dans `lib/three-effets.js`. Feuille de route : `docs/graphismes.md` | 2026-11-04 |
| 79 | RTS, petits robots : jambes qui font des pas en marchant ; poste de pilotage pour chaque robot (visière, bras et sa propre arme, recul, éclair, 3 paliers de détails avec Armes et Cadence, « ARME n % » dans le viseur) ; défaut corrigé : les mains et l’arme du toit restaient visibles pendant le pilotage (js/41-rts.js, js/42-rts-*.js, js/56-rts-postes-robots.js, tests/t-rts-robots.js) | 2026-11-04 |
| 78 | RTS : les armes des véhicules embellissent avec leurs améliorations : niveau visuel par arme (0 à 1), traînée, son, explosion, secousse, recul et éclair qui grossissent, détails du modèle du poste à 3 paliers ; au début, un petit « pew pew » (js/55-rts-niveaux.js, tests/t-rts-niveaux.js) | 2026-11-04 |

## À valider par Martin

- RTS (tâche 83) : liste des unités repliée par défaut. Dire si on veut qu’elle se referme seule après avoir choisi une unité.
- Style Ultra (tâche 87) : à essayer sur l’ordi (Pause, « Style » trois fois), surtout une nuit de pluie. Dire les images par seconde et si la rue brille trop.
- Zombies Haute définition (tâche 86) : dire si le flou en visant est trop fort ou pas assez, et si le sang au sol est de trop.
- Décor Haute définition (tâche 85) : dire s'il y a trop ou pas assez de débris dans la rue.
- Haute définition la nuit (tâche 84) : essayer une nuit (Banlieue Nord) en Haute définition, dire si les lampadaires sont trop forts ou trop faibles.

- Style Haute définition (tâche 82) : à essayer sur l’ordi en mode performance (Pause, « Style » deux fois ; en mode économie d’énergie, l’ordi lague). Dire combien d’images par seconde, et si c’est trop sombre, trop clair ou trop « délavé » (réglages `HD_REGL`). Les zombies et les textures photo viennent aux séances 2 et 3.

- Style Amélioré (tâche 80) : à essayer sur le S24 et l’ordi (Pause, « Style »). Dire si c’est trop sombre, trop flou ou trop granuleux, et combien d’images par seconde au cell.

- RTS véhicules (tâche 76) : à essayer en pilotant. Chiffres à ajuster au goût : tank 560 dégâts toutes les 3 s, chasseur 200 obus, Warthog 660, AC-130 100 + 20, 2 avions par aérodrome.


- Améliorations générales (autre dossier, à décider) : le simulateur montre que ce qui fait gagner Banlieue Nord, c’est la barricade (+100 par niveau : 300 → 1 000 au niveau 5) et les dégâts de toutes les armes (+12 % par niveau), pas l’arme. Celui qui garde le pistolet met tout là-dedans ; celui qui achète des armes finit avec une barricade de 550 à 650. Pistes : barricade +60 par niveau, ou prix qui montent plus vite.

- Améliorations des défenses par emplacement (4 tourelles = 4 à améliorer séparément).
- Ogive : lignes Puissance, Retombées, Souffle, Recharge.
- Vente en deux touches (Vendre puis Confirmer).
- Ferraille : marcheur 0,5, coureur 0,7, costaud 4, × difficulté de la ville. Saint-Clou complet = environ 258.

- Boss : le corps ne prend que 60 % des dégâts, la tête fait environ 4 fois plus mal. Vague 5 de Saint-Clou = 151 zombies (boss compris).

- Q lance maintenant la frappe aérienne (avant : changer d'arme). Molette, 1 à 8 et bouton Arme changent d'arme.
- Pouvoirs : charges pleines à chaque vague.
- Une explosion que le joueur cause tue un civil (pénalité) ; les défenses jamais.

- Mesurer les vraies images/s : ouvrir tests/perf.html sur l'ordi et le cell de Martin.
- Tests du mitrailleur et de la roquette sur un volant : hasard fixé depuis la tâche 62 (plus d’échec au hasard). Si l’un échoue encore, c’est un vrai changement de comportement.
- RTS au cell : menu repliable et rangée qui défile de côté, à essayer sur un vrai cell (vertical et couché).

- Infini : vie +18 % et dégâts +14 % par vague (vague 20 : vie ×23, dégâts ×12). À confirmer en jouant.
- Robot : rue de 140 m, blindage 1 500 (+250 et réparation à chaque rue), armes ×2,4 puis +16 % par rue, zombies +22 % de vie par rue. À équilibrer en jouant.
- Succès : environ 760 ferrailles d'un coup à la première victoire de Saint-Clou. À baisser si trop.

- Survivant : il meurt aux trois quarts du trajet si un poursuivant vit encore (plus de minuterie de 5 s). Poursuivants à 78 % de sa vitesse au départ, 94 % aux trois quarts.
- Météo : beau temps environ 70 % du temps, pluie et orage environ 7 à 10 %, tornade environ 1 à 2 %. À ajuster en jouant.
- Sons : écouter les tirs, la pluie, le vent, la grêle, les oiseaux et les cigales sur le cell (le volume des ambiances n'a pas été réglé à l'oreille).

- Tireurs survivants : 30 % d'un tireur d'élite de base, soit 1 tir aux 2,5 s, 33 dégâts × force de la vague, sans tir à la tête, portée 75 m.

- Arsenal : prix de 12 000 $ à 35 000 $ ; dans les villes courtes, ces armes seront surtout accessibles en mode infini. Accessoires achetés dans la boutique pour la partie (comme les améliorations de l'arme), à rendre permanents si Martin préfère.

- RTS : boss à 25 % de leur vie du mode robot, un toutes les 3 hordes (+1 500 $). Avions : seuls les zombies volants les attaquent. Prix : tank 1 800 $, hélicoptère 2 200 $, chasseur 3 000 $, Warthog 3 800 $, bombardier 4 500 $, aérodrome 3 000 $. À équilibrer en jouant ; le pilotage au doigt n'a pas été essayé sur un vrai cell.

- RTS sans fin : 500 zombies au plus sur ordi et 300 au cell (le plafond de l'appareil reste en vigueur pour le reste du jeu). À confirmer sur un vrai cell.

## Idées en vrac
