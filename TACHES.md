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
| 92 | Suite du tour des modes, mesuré à budget égal. RTS : une unité à explosion (tank, lance-roquettes, Apache) visait un groupe juste hors de sa portée et restait sans tirer, des zombies à ses pieds (un tank tirait aux 7,5 s au lieu d’aux 3 s) : une cible à portée passe maintenant avant ; tank 900 dégâts et 8 000 de vie (560 et 3 200 : trois tanks tuaient 4 fois moins que le même prix en n’importe quoi d’autre) ; tourelle mitrailleuse 26 dégâts et portée 24 m (14 et 20 m), Tesla 80 dégâts à 2 tirs/s. Toit, défenses : à ferraille égale, 4 tourelles de base améliorées battaient mortier, laser et missiles presque partout ; mortier 120 dégâts (70), laser 80 par seconde et brûlure 20 (45 et 12), missiles 250 (160). Simulateur : les défenses achetées par le robot-joueur ne tiraient jamais, corrigé (js/16-atelier.js, 41-rts.js, 42-rts-combat.js, outils/sim-bot.js, tests/t-equilibrage.js) | 2026-11-12 |
| 91 | Tour des trois modes au simulateur, ce qui clochait est corrigé. Toit : les autos lancées par le boss se détruisent en vol (3 balles ou une roquette ; avant, elles enlevaient à coup sûr près de la moitié d’une barricade de base) ; canon électromagnétique : onde de choc qui couche un couloir de 4,4 m sur toute la rue, 1 tir/s, chargeur 6 ; lance-grenades 600 dégâts, rayon 5,5 m, barillet de 16 ; mitrailleuse .50 150 dégâts. Robot : la force des zombies suit la rue (montée douce sur 9 rues), plus la ville tirée au carrefour (avant : 1 à 5 fois plus fort au hasard) ; « Renforts ! » quand la horde d’une rue se reforme (+35 % chaque fois, plus de ferraille ni d’expérience au 2e), pour qu’on ne puisse plus camper au début de la rue sans risque. Un pas de côté esquive maintenant les crachats (avant : ils touchaient toujours). RTS : les dégâts des boss montent moins vite que ceux des autres zombies (un Titan rasait une base intacte en 20 secondes) (js/19-boss.js, 20-armes.js, 34-arsenal.js, 39-robot.js, 40-robot-monstres.js, 42-rts-combat.js, outils/, tests) | 2026-11-12 |
| 90 | Équilibrage des armes du toit, mesuré au simulateur (« duel à budget égal ») : avant, tout achat après le fusil d’assaut rendait plus faible que d’améliorer le fusil d’assaut. Sniper 450 dégâts (au lieu de 240), plus rapide ; arbalète 260, plus rapide, traverse 4 ; lance-flammes porte à 36 m (au lieu de 30 : il n’atteignait pas les cracheurs), 13 dégâts ; minigun 34 (au lieu de 24), plus précis ; lance-roquettes 1 000, 4 par chargeur, plus rapide, et une roquette en plein sur un gros zombie fait tous ses dégâts (avant : environ 40 %) ; arsenal ×1,6 sauf le laser ; plombs du fusil à pompe moins forts de loin (30 % à 60 m) ; étiquette « Bon contre » sur chaque arme de la boutique ; le robot de combat garde ses anciens dégâts (facteur k). Simulateur : robot-joueur refait (priorités de visée, mire, recul, choix de l’arme, horloge des minuteries), stratégie « malin », section duel (js/06-donnees.js, 08-tir.js, 10-boutique.js, 20-armes.js, 34-arsenal.js, 39-robot.js, outils/, tests/t-equilibrage.js) | 2026-11-12 |
| 89 | RTS : AC-130 deux fois plus haut (60 m au lieu de 30, portée 95 m, zoom des postes resserré : 30° et 20°) pour viser plus calmement ; la 2e arme se voit (gros texte « HELLFIRE ! », « 105 MM ! », « ROQUETTES ! » au tir, temps restant ou « À SEC » si on appuie trop tôt, état dans le bandeau du poste et sur le bouton jaune au cell) ; les 4 tours du toit ne restent plus dans la vallée du RTS | 2026-11-04 |
| 88 | RTS, pilotage à l’ordi : la 2e arme (Hellfire de l’Apache, 105 mm de l’AC-130, roquettes du Mech) ne partait pas si on tenait déjà le clic gauche (le navigateur n’envoie pas de « bouton enfoncé » pour le 2e bouton). Corrigé ; touche E pour la 2e arme ; aide du pilotage mise à jour | 2026-11-04 |
| 87 | Graphismes, style Ultra (ordi seulement, 4e choix du bouton Style ; sauté au cell) : rue mouillée qui reflète vraiment la scène (flaques, plus fort sous la pluie), rayons de soleil dans la brume, ombres douces (VSM), ombres de contact pleine résolution (js/61-graphismes-ultra.js, Reflector ajouté à lib/three-hd.js, tests/t-style.js) | 2026-11-04 |
| 86 | Graphismes, Haute définition séance 3 improvisée (sans téléchargement) : zombies en matériaux physiques (crasse, sang séché et frais, griffures, relief ; couleurs plus justes), flaque de sang où chaque zombie tombe, flou de profondeur en visant (net au point visé) (js/60-graphismes-zombies.js, tests/t-style.js) | 2026-11-04 |
| 85 | Graphismes, Haute définition, décor improvisé (sans téléchargement) : autos détaillées (vraies roues, vitres qui reflètent, phares, feux, pare-chocs, rétroviseurs), fils électriques entre les lampadaires, débris dans la rue (papiers, briques, planches, pneus, sacs, canettes) ; autos marquées dans js/03-scene.js (1 ligne) (js/59-graphismes-decor.js, tests/t-style.js) | 2026-11-04 |
| 84 | Graphismes, Haute définition séance 2 (partie sans téléchargement) : la nuit, les lampadaires éclairent vraiment la rue (8 projecteurs, ombres des 4 plus proches) avec un cône de brume éclairée ; textures photo encore en attente (sites bloqués par le réseau) (js/58-graphismes-hd.js, tests/t-style.js) | 2026-11-04 |
| 83 | RTS : la rangée « Unités » est repliée par défaut (une pastille « 👥 Unités · N » et les groupes) ; la toucher montre une pastille par unité à choisir une par une, la retoucher la referme (choix gardé, dt_rts_liste) (js/48-rts-liste.js, tests/t-rts-selection.js) | 2026-11-04 |

## À valider par Martin

- RTS (tâche 83) : liste des unités repliée par défaut. Dire si on veut qu’elle se referme seule après avoir choisi une unité.
- Style Ultra (tâche 87) : à essayer sur l’ordi (Pause, « Style » trois fois), surtout une nuit de pluie. Dire les images par seconde et si la rue brille trop.
- Zombies Haute définition (tâche 86) : dire si le flou en visant est trop fort ou pas assez, et si le sang au sol est de trop.
- Décor Haute définition (tâche 85) : dire s'il y a trop ou pas assez de débris dans la rue.
- Haute définition la nuit (tâche 84) : essayer une nuit (Banlieue Nord) en Haute définition, dire si les lampadaires sont trop forts ou trop faibles.

- Style Haute définition (tâche 82) : à essayer sur l’ordi en mode performance (Pause, « Style » deux fois ; en mode économie d’énergie, l’ordi lague). Dire combien d’images par seconde, et si c’est trop sombre, trop clair ou trop « délavé » (réglages `HD_REGL`). Les zombies et les textures photo viennent aux séances 2 et 3.

- Style Amélioré (tâche 80) : à essayer sur le S24 et l’ordi (Pause, « Style »). Dire si c’est trop sombre, trop flou ou trop granuleux, et combien d’images par seconde au cell.

- RTS véhicules (tâche 76) : à essayer en pilotant. Chiffres à ajuster au goût : tank 560 dégâts toutes les 3 s, chasseur 200 obus, Warthog 660, AC-130 100 + 20, 2 avions par aérodrome.


- Défenses du toit (tâche 92) : mortier, laser et missiles sont plus forts. Si tu en as déjà, les villes seront plus faciles : dire si c’est trop. Au simulateur, 4 tourelles de base (1 000 ferrailles) tiennent seules la vague 4 de Saint-Clou sans que le joueur tire : à dire si c’est voulu.
- RTS (tâche 92) : tank et tourelles mitrailleuse et Tesla renforcés ; essayer une partie avec des tanks. Au simulateur, la base du robot-joueur (qui bâtit beaucoup de tourelles mitrailleuses) tient maintenant 34 à 56 min au lieu de 24 à 29 : dire si c’est trop long.
- Campagne (constat du simulateur, rien de changé) : avec des défenses, même le robot-joueur débutant libère les 4 premières villes du premier coup, avant comme après les tâches 90 à 92 ; seul le Port demande 2 ou 3 essais. Dire si tu veux les villes 2 à 4 plus dures.

- Robot (tâche 91) : à essayer. Dire si la montée de rue en rue est bonne (au simulateur, un profil neuf tombe vers la rue 5 ou 6), et si « Renforts ! » arrive trop vite quand on prend son temps dans une rue. Essayer d’esquiver les crachats verts en faisant des pas de côté.
- RTS (tâche 91) : les boss frappent moins fort quand la menace est haute. La durée des parties a peu changé au simulateur (24 à 29 min pour le robot-joueur, 20 avant) : la base tient à 100 % puis s’écroule en moins d’une minute quand la horde devient trop forte. Dire si cette fin est frustrante ; si oui, la piste est de faire monter la menace moins vite avec les tués (`RTS_THREAT.tues`, essayé à 900 et 1 200 : parties de 30 à 55 min).
- Autos du boss (tâche 91) : dire si 3 balles en 1,9 s de vol, c’est faisable au cell.

- Armes du toit (tâche 90) : à essayer en jouant. Dire si le sniper, le minigun et le lance-roquettes valent maintenant leur prix, si le fusil à pompe est devenu trop faible de loin, et si les dernières villes sont devenues trop faciles (au simulateur, le joueur moyen qui achète bien finit le Port au 2e essai ; avant, il n’y arrivait pas en 3). Tous les chiffres sont dans `js/06-donnees.js` et `docs/equilibrage.md`.

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
