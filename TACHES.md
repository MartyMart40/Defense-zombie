# Suivi des tâches

Fichier tenu par Claude. Statuts : À faire, En cours, Fait, Bloqué.
Les 10 dernières tâches faites sont ici ; les plus anciennes sont dans `docs/historique.md`. Fiches des modes : `docs/robot.md`, `docs/rts.md`.

## En cours

| # | Tâche | Statut | Note |
|---|-------|--------|------|
| 101 | Dossier RTS : un but et un danger qui monte. La Ruche (8 nids détruits la débusquent, la détruire libère la vallée, vallées de plus en plus dures), sièges annoncés toutes les 3 hordes, fin de la chute du QG en 3 secondes. Accepté par Martin | En cours | Sous-agent, ouvert le 2026-11-13 |

## À faire

| # | Tâche | Priorité |
|---|-------|----------|
| - | Équilibrage après essais de Martin | Après essais |
| 102 | Dossier robot : une fin qu’on peut gagner (9 rues, boss final, « course réussie », 2e tour plus dur), carrefour réparé, un but après la course 10, premières rues moins gratuites et mur de la rue 5 adouci, lance-flammes lourd. Accepté par Martin le 2026-11-13 | Suivant (robot) |
| - | Simulateur reproductible : les pages du duel lancées en parallèle partagent la même sauvegarde et le son lit l’horloge réelle (trouvé au dossier 94 : le même duel donne 444 à 1 849 d’un lancement à l’autre). À faire quand les dossiers 95 et 96 sont fusionnés (mêmes fichiers) | Suivant (outils) |
| - | Dossier performance au cell : mesurer la boucle du jeu (`tests/perf.html`) et alléger ce qui coûte | À choisir par Martin |

Écarté par Martin : choisir 1 bonus parmi 3.

## Fait

| # | Tâche | Date |
|---|-------|------|
| 95 | Robot au simulateur : robot-joueur du mode robot (`outils/sim-bot-robot.js`, choix `robot`), banc du garage à ferraille égale, progression sur 12 courses. Trouvé : rues 1 à 3 sans aucun dégât, mur à la rue 5 ou 6 quel que soit le niveau du joueur ; aucune ligne du garage ne passe le mur seule, le mélange oui ; tout le garage est payé en 9 ou 10 courses, ensuite plus rien à acheter ; le carrefour n’apparaît jamais (bogue, pas corrigé). Corrigé : la minigun surchauffe après 12 s de tir (55 s avant : le refroidissement ne servait à rien), canon électromagnétique aux 1,9 s (1,3 avant, il écrasait tout), arc électrique aux 0,18 s (0,35 avant). Détails dans `docs/robot.md` | 2026-11-13 |
| 100 | Toit, moments de crise (js/64-crise.js). Assauts : dès la vague 2, 3 s d’avertissement (bandeau « ASSAUT ! », sirène, sous-titre), puis 15 à 25 % des zombies de la vague sortent 4 fois plus serrés, puis 6 s de creux ; le total de la vague ne change pas ; 1 assaut par vague dans les 2 premières villes, jusqu’à 2 au Port et en infini ; jamais avec le boss, ni plus d’un fouisseur par assaut. Brèche : une fois par partie (rechargée à chaque boss en infini), quand la barricade tombe à 0 elle tient 10 s, chaque zombie abattu la répare de 1,5 % (35 % au plus), et elle cède si elle est sous 5 % à la fin ; petit cœur à côté de « Barricade ». Danger : sous 30 % la barre clignote et le cœur bat, plus fort sous 15 %. Mesuré sur 8 campagnes par joueur : vagues chaudes de 2 % à 5 à 9 %, essais par ville à peu près pareils. Outil `outils/mesure-crise.js`, 10 tests | 2026-11-13 |
| 99 | Toit, graphismes des styles Actuel et Amélioré (ceux qu’on voit au cell). Partout : ciel peint (nuages étirés, lueur du soleil, étoiles la nuit, brume à l’horizon, silhouettes au loin : collines, tours, grues ; incendie au Centre-ville) ; les feux de la rue éclairent le sol. Actuel : asphalte fissuré, dalles, gazon, façades redessinées (cadres, briques ou planches, saleté), conteneurs salis ; coût mesuré : +1,5 à +4 % par image. Amélioré : la nuit et les rues étroites ne tombent plus au noir (js/36-rendu.js, 57-graphismes.js, tests, docs/graphismes.md) | 2026-11-13 |
| 96 | RTS au simulateur : robot-joueur à 4 stratégies (tourelles, blindés, air, mixte) qui bâtit garage, héliport et aérodromes et se sert du ralliement, de « Tenir » et de l’atelier ; banc des appuis à budget égal (`rts-banc`). Trouvé : avec un joueur correct le QG ne prend pas un coup en 60 min, puis tombe de 90 % à 0 en 3 s ; la menace vient aux deux tiers des tués. Corrigé, ce qui ne valait pas son prix : Mech lourd 140 dégâts et 2 600 de vie, Mech de combat minigun 36, roquettes 380 et 8 000 de vie, chasseur 150 dégâts et 300 obus, Warthog 110 dégâts (js/41-rts.js, 54-rts-postes.js, outils/sim-bot-rts.js, outils/simulateur.js, tests/t-equilibrage.js) | 2026-11-13 |
| 98 | Toit, 3 nouveaux monstres, chacun avec sa parade (js/63-monstres-toit.js). Hurleur : s’arrête loin et hurle, les zombies autour vont 1,4 fois plus vite tant qu’il vit ; le tuer en premier. Fouisseur : s’enfonce dans l’asphalte vers 55 m (intouchable 5 s, une bosse de terre le suit) et ressort à 9 à 15 m de la barricade ; l’abattre avant qu’il creuse, ou quand il sort (dégâts doublés 1,5 s). Revenant : un coup mortel au corps le met à genoux 2,8 s, puis il se relève une fois ; viser la tête ou l’achever à terre. Ils remplacent des marcheurs (total des vagues inchangé), jamais à Saint-Clou, rares au début ; aussi en mode infini. Un bandeau donne la parade à la première rencontre (P.mtVus) (tests/t-monstres-toit.js) | 2026-11-13 |
| 97 | Toit, sons : une voix par type de zombie (coureur qui crie aigu, costaud et colosse qui grondent grave, gargouillis du cracheur juste avant le crachat, volant, sauteur), cri d’un zombie dangereux quand il approche ; coup sur la barricade proportionné aux dégâts, alarme puis battement de cœur sous 30 % ; achat plus net ; signatures de début de vague, de dernière vague, de fin de vague et de victoire ; mixage : 10 sons courts à la fois au plus, limiteur en sortie (le pire cas saturait à +18 dB), minigun et vent plus bas, grognements, recharge et chargeur vide plus forts (js/01-son.js, 37-bruitages.js, tests/t-sons.js) | 2026-11-13 |
| 94 | Toit, ressenti du tir (« ça brasse pas assez ») : coup de caméra et recul de l’arme dosés par arme (le sniper, le fusil à pompe et les roquettes brassent, le pistolet à peine), éclair de bouche selon l’arme ; gerbe de sang dans le sens du tir, poussière ou étincelles quand on rate ; marqueur au réticule (or pour la tête, croix rouge pour un tué) ; zombies qui sursautent quand ils encaissent et corps poussés à la mort ; son « toc » pour la tête et coup sec pour le tué, impacts du minigun qui ne saturent plus ; très court gel sur un gros coup. Seulement visuel et sonore : dégâts, balles et zombies inchangés. Réglage « Secousses » dans la Pause (js/62-ressenti.js, css/style.css, tests/t-ressenti.js) | 2026-11-13 |
| 93 | D’après l’essai de Martin. Robot : les zombies des vagues sortent plus loin (derrière 34 à 50 m, ruelles 30 à 55 m devant ; avant, parfois à 4 m du robot) ; roquettes et lance-grenades avec un chargeur qui se refait (4 roquettes, une aux 1,6 s : fini le tir sans arrêt au plancher) ; aide à la visée au cell (le tir part vers le zombie quand le réticule passe à moins de 4 degrés, la vue ne bouge pas) ; premières rues plus dures (force 1,2 dès la rue 1, zombies qui sortent plus serrés). Les tourelles du toit ne s’affichent plus dans le robot ni dans le RTS. Campagne plus dure : vie et dégâts des zombies ×1,35 à Val-des-Cendres, ×1,6 à Banlieue Nord, ×1,4 à Centre-ville, ×1,25 au Port (js/02-villes.js, 06-donnees.js, 17-defenses.js, 39-robot.js, 40-robot-monstres.js, tests) | 2026-11-13 |
| 92 | Suite du tour des modes, mesuré à budget égal. RTS : une unité à explosion (tank, lance-roquettes, Apache) visait un groupe juste hors de sa portée et restait sans tirer, des zombies à ses pieds (un tank tirait aux 7,5 s au lieu d’aux 3 s) : une cible à portée passe maintenant avant ; tank 900 dégâts et 8 000 de vie (560 et 3 200 : trois tanks tuaient 4 fois moins que le même prix en n’importe quoi d’autre) ; tourelle mitrailleuse 26 dégâts et portée 24 m (14 et 20 m), Tesla 80 dégâts à 2 tirs/s. Toit, défenses : à ferraille égale, 4 tourelles de base améliorées battaient mortier, laser et missiles presque partout ; mortier 120 dégâts (70), laser 80 par seconde et brûlure 20 (45 et 12), missiles 250 (160). Simulateur : les défenses achetées par le robot-joueur ne tiraient jamais, corrigé (js/16-atelier.js, 41-rts.js, 42-rts-combat.js, outils/sim-bot.js, tests/t-equilibrage.js) | 2026-11-12 |
| 91 | Tour des trois modes au simulateur, ce qui clochait est corrigé. Toit : les autos lancées par le boss se détruisent en vol (3 balles ou une roquette ; avant, elles enlevaient à coup sûr près de la moitié d’une barricade de base) ; canon électromagnétique : onde de choc qui couche un couloir de 4,4 m sur toute la rue, 1 tir/s, chargeur 6 ; lance-grenades 600 dégâts, rayon 5,5 m, barillet de 16 ; mitrailleuse .50 150 dégâts. Robot : la force des zombies suit la rue (montée douce sur 9 rues), plus la ville tirée au carrefour (avant : 1 à 5 fois plus fort au hasard) ; « Renforts ! » quand la horde d’une rue se reforme (+35 % chaque fois, plus de ferraille ni d’expérience au 2e), pour qu’on ne puisse plus camper au début de la rue sans risque. Un pas de côté esquive maintenant les crachats (avant : ils touchaient toujours). RTS : les dégâts des boss montent moins vite que ceux des autres zombies (un Titan rasait une base intacte en 20 secondes) (js/19-boss.js, 20-armes.js, 34-arsenal.js, 39-robot.js, 40-robot-monstres.js, 42-rts-combat.js, outils/, tests) | 2026-11-12 |

## À valider par Martin

- Robot (tâche 95) : la minigun surchauffe maintenant après environ 12 s de tir sans arrêt (55 s avant). Un profil neuf perd environ une rue au simulateur : dire si c’est trop (sinon 0,009 au lieu de 0,011, `MECH_HEAT`). Le canon électromagnétique tire aux 1,9 s au lieu de 1,3 : dire s’il reste plaisant.

- Moments de crise (tâche 100) : à essayer sur le toit avec le son. Dire si l’assaut donne chaud, si 3 s d’avertissement c’est assez, si la brèche sauve trop souvent (au simulateur : 25 sur 35 chez le débutant, 11 sur 13 chez le bon joueur) et si la sirène et le cœur sont agréables (personne ne les a écoutés). Les 3 premières villes chauffent encore peu. Réglages en haut de `js/64-crise.js` (`CRISE`).

- Graphismes (tâche 99) : à regarder au cell dans les 5 villes, de jour et de nuit, en Actuel puis en Amélioré. Dire si c’est plus beau, si ça ralentit (mesuré seulement en rendu logiciel : +1,5 à +4 % en Actuel), et si le nouveau ciel va bien dans le robot et le RTS (pas regardé). Pas faits : yeux et teintes des zombies, fenêtres qui s’allument, bout de la rue en ville.

- RTS (tâche 96) : Mech lourd, Mech de combat, chasseur et Warthog sont plus forts ; essayer une partie avec eux, et en piloter un (le chasseur et le Warthog font deux fois plus mal aussi quand on les pilote). Dire si le tank amélioré au maximum est trop solide (il ne meurt presque plus au simulateur).
- Nouveaux monstres (tâche 98) : hurleur (dès Val-des-Cendres vague 4), revenant (Val-des-Cendres vague 2), fouisseur (Banlieue Nord vague 2). Dire s’ils se reconnaissent bien de loin au cell (le hurleur est sombre : on le voit surtout à ses anneaux orange), si les parades se comprennent avec le bandeau, et si le fouisseur qui ressort près de la barricade est juste ou frustrant.

- Sons (tâche 97) : personne n’a pu écouter, tous les niveaux viennent de mesures. À écouter au cell : reconnaît-on le coureur, le costaud, le colosse et le gargouillis du cracheur sans regarder ? Le battement de cœur sous 30 % de barricade est-il pénible ? Le minigun, plus bas, garde-t-il sa force ? Entend-on tout baisser quand le minigun tire (« pompage ») ? Les signatures de vague sont-elles trop fortes ou trop longues (2,5 s pour la dernière vague) ?

- Ressenti du tir (tâche 94) : à essayer sur le toit, au cell et à l’ordi, avec le son. Dire arme par arme si ça brasse trop ou pas assez (une ligne par arme dans `RS_ARME`, `js/62-ressenti.js`), si le gel sur un gros coup dérange, et si le sang est de trop. « Secousses » dans la Pause coupe le coup de caméra et le gel. Proposé, pas fait : un zombie qui titube pour vrai sous le pompe, le sniper ou la .50 (ça changerait l’équilibrage).
- RTS (tâche 83) : liste des unités repliée par défaut. Dire si on veut qu’elle se referme seule après avoir choisi une unité.
- Style Ultra (tâche 87) : à essayer sur l’ordi (Pause, « Style » trois fois), surtout une nuit de pluie. Dire les images par seconde et si la rue brille trop.
- Zombies Haute définition (tâche 86) : dire si le flou en visant est trop fort ou pas assez, et si le sang au sol est de trop.
- Décor Haute définition (tâche 85) : dire s'il y a trop ou pas assez de débris dans la rue.
- Haute définition la nuit (tâche 84) : essayer une nuit (Banlieue Nord) en Haute définition, dire si les lampadaires sont trop forts ou trop faibles.

- Style Haute définition (tâche 82) : à essayer sur l’ordi en mode performance (Pause, « Style » deux fois ; en mode économie d’énergie, l’ordi lague). Dire combien d’images par seconde, et si c’est trop sombre, trop clair ou trop « délavé » (réglages `HD_REGL`). Les zombies et les textures photo viennent aux séances 2 et 3.

- Style Amélioré (tâche 80) : à essayer sur le S24 et l’ordi (Pause, « Style »). Dire si c’est trop sombre, trop flou ou trop granuleux, et combien d’images par seconde au cell.

- RTS véhicules (tâche 76) : à essayer en pilotant. Chiffres à ajuster au goût : tank 560 dégâts toutes les 3 s, chasseur 200 obus, Warthog 660, AC-130 100 + 20, 2 avions par aérodrome.


- Villes plus dures (tâche 93) : au simulateur, le débutant a maintenant besoin de 2 essais à Banlieue Nord, à Centre-ville et au Port ; le joueur moyen de 1 ou 2 à Centre-ville et au Port ; le bon joueur passe tout du premier coup mais de justesse. Val-des-Cendres reste facile pour les robots-joueurs. Dire si c’est assez, ou trop : un chiffre par ville, `dur` dans `js/02-villes.js`.
- Robot (tâche 93) : dire si les zombies sortent maintenant assez loin, si 4 roquettes d’affilée c’est bien, si l’aide à la visée au cell aide assez pour les petits zombies (`MECH_ASSIST`, js/39-robot.js) et si les premières rues sont encore trop faciles.

- Défenses du toit (tâche 92) : mortier, laser et missiles sont plus forts. Si tu en as déjà, les villes seront plus faciles : dire si c’est trop. Au simulateur, 4 tourelles de base (1 000 ferrailles) tiennent seules la vague 4 de Saint-Clou sans que le joueur tire : à dire si c’est voulu.
- RTS (tâche 92) : tank et tourelles mitrailleuse et Tesla renforcés ; essayer une partie avec des tanks. Au simulateur, la base du robot-joueur (qui bâtit beaucoup de tourelles mitrailleuses) tient maintenant 34 à 56 min au lieu de 24 à 29 : dire si c’est trop long.

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
