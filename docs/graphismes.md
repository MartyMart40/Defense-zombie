# Graphismes : les niveaux de style

Demande de Martin (2026-11-04) : des « degrés » de graphismes au choix, du jeu actuel jusqu'à un rendu très poussé. Les niveaux du haut peuvent être réservés à l'ordi. Il ne tient pas aux détails exacts des modèles, seulement au rendu final. On avance un niveau à la fois, en commençant par Saint-Clou.

## Les niveaux
| Niveau | Visée | Où | Statut |
|--------|-------|----|--------|
| Actuel | Le jeu tel qu'il était : couleurs unies, formes simples | Partout | Fait |
| Amélioré | Jeu 3D des années 2005 à 2010 (genre Half-Life 2, en plus simple) : textures, vraies ombres, éclat lumineux | Toit (cell récent et ordi) | Phase 1 faite (tâche 80) |
| Haute définition | Visée Modern Warfare : matériaux réalistes (rugosité, reflets), lumière HDR, ombres de contact, zombies plus détaillés, modèles téléchargés | Toit, ordi surtout | Séance 1 faite (tâche 82), séances 2 et 3 sans téléchargement faites (tâches 84 à 86) |
| Ultra | Ce qu'un ordi puissant peut donner : ombres douces partout, reflets, brume volumétrique | Ordi seulement | Séance 1 faite (tâche 87) |

Le choix : bouton « Style » dans Pause (clé `dt_style` : `actuel`, `ameliore`, `hd` ou `ultra`), un clic passe au suivant ; au cell, le bouton saute Ultra. Il change tout de suite, sans recommencer la partie. Il s'ajoute au réglage « Graphismes » (qualité : résolution et nombre d'effets, `js/36-rendu.js`) : en qualité basse, pas d'éclat et carte d'ombre de 512 ; moyenne (et cell) 1024 ; haute sur ordi 2048. Si un ordi lague en Amélioré, baisser « Graphismes ».

## Comment c'est fait (`js/57-graphismes.js`)
- Rien n'est refait dans `js/03-scene.js` : à la fin de `buildWorld`, l'événement `Jeu.emit('monde', L)` laisse le style habiller la rue. Chaque matériau est remplacé par une version détaillée, et l'original est gardé : revenir à « Actuel » remet les originaux.
- Textures dessinées par le code, une fois : asphalte (rapiéçages, taches d'huile, fissures, gravier), trottoir en dalles, gazon, bois, « crasse » pour le reste. Les façades sont redessinées en 256 x 512 à partir de l'originale : briques (ville, port) ou planches à clin (maisons), cadres, croisillons, allèges, coulures, saleté au pied des murs, les mêmes fenêtres allumées.
- Ombres : le soleil (bas, au fond de la rue) projette de vraies ombres sur les 100 premiers mètres. Carte d'ombre de 2048 sur ordi, 1024 au cell. Les zombies projettent leur ombre ; les taches sous eux (`js/36-rendu.js`) sont cachées.
- Effets d'image (copie de Three.js r128 dans `lib/three-effets.js`) : éclat lumineux (UnrealBloom : fenêtres, feux, soleil), lissage des bords (FXAA), couleurs (saturation 0,9, contraste 1,1, ombres un peu froides, lumières un peu chaudes), coins assombris et grain de film. La boucle (`js/15-boucle.js`) appelle `styleRendu()` ; l'arme en main est dessinée par-dessus, sans effets.
- Le style ne touche ni le robot ni le RTS pour l'instant.

## Actuel et Amélioré plus beaux (2026-11-13, ce que Martin voit au cell)
- Ciel peint, tous les styles (`js/36-rendu.js`, `gfxCielTex`) : le petit dégradé de chaque ville (et de chaque météo à dégradé, par `ambSkyTex` de `js/22-ambiance.js`, sans toucher à ce fichier) devient un ciel de 1024 x 512 dessiné une fois : longs nuages étirés, étoiles la nuit, grande lueur autour du soleil, bande de brume sous l'horizon (plus de ligne entre le sol et le ciel), silhouettes au loin (collines et arbres au village et en banlieue, tours avec quelques fenêtres en ville, grues au port), lueurs d'incendie et colonnes de fumée au Centre-ville (un peu à Val-des-Cendres). Même sphère, aucun coût par image. Seuls les ciels de la ville en cours sont gardés (`GFX_CIEL`).
- Feux de la rue, tous les styles : lueur orange au sol qui bat avec la lumière du feu, flamme dessinée (sprite) par-dessus les cônes, plus forte la nuit. Matériaux partagés.
- Style Actuel, couche légère (`js/57-graphismes.js`, `styleLegerAppliquer`) : asphalte, trottoir et gazon d'Amélioré (sans filtrage anisotrope), façades redessinées à la taille d'origine (cadres, croisillons, allèges, briques ou planches, saleté), conteneurs du port salis. Pas d'ombres ni d'effets d'image. Amélioré repart toujours des matériaux d'origine.
- Amélioré : ombres relevées dans l'étalonnage (`gam` 0,88, contraste 1,06, coins 0,3), la nuit et les rues étroites ne tombent plus au noir ; vitres éteintes qui reflètent un peu plus le ciel.
- Coût mesuré (swiftshader, 915 x 412, 150 zombies, 300 images, mesures alternées) : Actuel +1,5 % à Val-des-Cendres, +4 % à Saint-Clou (gazon) ; Amélioré à peu près pareil.
- Allure des zombies du toit, tous les styles (`js/07-zombies.js`, rien qui touche au jeu : vie, vitesse, places et cibles des tirs pareilles) :
  - Yeux : les deux yeux d'un humanoïde sont un seul morceau (`ZG.yeux`), un peu plus grands, enfants de la tête (ils suivent sa pente et partent avec elle sur un tir à la tête ; avant, ils restaient en l'air). Couleur « plus que pleine » (`zEyeMat`, rouge 3,2) : la brume et la nuit les mangent beaucoup moins. Au-delà de 55 m (modèle lointain), ils restent dessinés et grossissent avec la distance (`ZYEUX` : 1/42 par mètre, au plus 1,45 en largeur et 3 en hauteur) : on voit des paires de points rouges dans le brouillard. `eyeMat` des autres formes (18, 35, 40, 63) n'a pas changé.
  - Nuances : chaque zombie a sa peau (7 nuances mêlées de 25 à 60 % à la peau de son type : pâle, bleutée, jaunâtre, pourrie, violacée, rosée, verte) et ses vêtements plus ou moins clairs et sales (`ZTEINT`, `zTeinte`). Tiré du numéro du zombie avec des pas irrationnels : deux zombies apparus l'un après l'autre n'ont jamais la même peau. Passe par la couleur d'instance : aucun matériau ni appel de dessin de plus.
  - Bras : environ un zombie sur trois a un bras qui pend et balance plus (`zBras`), les autres l'ont un peu de travers, balancement plus ou moins ample. La tête ne bouge pas.
  - Les ombres sous les zombies existaient déjà en Actuel (`js/36-rendu.js`, qualité moyenne et haute).
- Pas fait : fenêtres qui s'allument et s'éteignent ; la barricade et le bord du toit ne se voient presque pas en visant normalement.

## Haute définition, séance 1 : la lumière (`js/58-graphismes-hd.js`)
- Part de la rue d'Amélioré : chaque matériau détaillé devient un matériau physique (MeshStandardMaterial). Cartes de relief et de rugosité tirées des textures dessinées : fissures et gravier en creux, taches d'huile lisses qui reflètent comme des flaques, briques et planches en relief, cadres de fenêtres en saillie, vitres lisses qui reflètent le ciel. Rugosités : `HD_SORTES`.
- Lumière d'ambiance et reflets : une vraie image HDR par ville (`hdri/`, Poly Haven, voir `hdri/LISEZMOI.md`), teintée à 60 % par la couleur du ciel de la ville, filtrée par PMREM. Le ciel peint de chaque ville reste affiché (il suit la météo et la brume) ; l'image HDR sert à la lumière et aux reflets.
- Couleurs linéaires : juste avant de dessiner, les couleurs du jeu (matériaux, lumières, brume) passent en linéaire, puis sont remises. Les textures de couleur sont lues en sRGB pendant ce style. La scène est dessinée en couleurs étendues (demi-flottants), puis exposition (1,15) et courbe filmique ACES, retour en sRGB, puis couleurs et grain plus doux qu'Amélioré. L'arme en main n'est pas touchée.
- Ombres de contact : SSAO de Three.js r128 (calculé à demi-résolution puis flouté), seulement les objets solides, effacé entre 30 et 60 m. Coupé en qualité basse, avec l'éclat.
- Ombre du soleil : carte de 4096 sur ordi en qualité haute.
- Les morceaux de Three.js (EXRLoader, SSAOPass) sont dans `lib/three-hd.js`, chargé seulement quand on choisit ce style. Tant qu'il n'est pas prêt, la rue est dessinée en Amélioré.
- Nuit (séance 2, tâche 84) : quand les lampadaires sont allumés (météo de nuit, ou Banlieue Nord), chaque lampadaire des 100 premiers mètres devient un projecteur tourné vers la rue (8 en tout) ; les 4 plus proches projettent des ombres (carte de 1024 sur ordi en qualité haute, 512 sinon). Un cône de brume éclairée, très léger et sans bord net, part de chaque lampe. Les lampes rondes d'origine sont éteintes pendant ce temps et rallumées en quittant le style. Réglages : `HD_NUIT`.
- Décor (séance 2, tâche 85, `js/59-graphismes-decor.js`) : Martin a dit d'improviser en attendant les textures photo. Autos : vraies roues (pneu et jante), vitres qui reflètent, phares, feux arrière, pare-chocs, rétroviseurs, calandre, carrosserie plus lisse et métallique (les carcasses brûlées : roues et pare-chocs seulement). Fils électriques qui pendent entre les lampadaires, deux qui traversent la rue. Débris dans les 100 premiers mètres, toujours aux mêmes places pour une ville : 40 papiers, 45 briques, 14 planches, 8 pneus, 14 sacs-poubelles (surtout sur le trottoir), 36 canettes (`DECOR.nb`), en instances (6 appels de dessin). Tout est retiré en quittant le style.
- Zombies et effets (séance 3, tâche 86, `js/60-graphismes-zombies.js`), en attendant les modèles téléchargés :
  - les zombies (instances) passent en matériaux physiques : crasse, sang séché et frais (brillant), griffures, relief ; la couleur de chaque zombie passe en linéaire dans le shader (sinon ils étaient délavés) ;
  - une flaque de sang reste où chaque zombie tombe (80 au plus, les plus vieilles réutilisées), effacée à chaque nouvelle rue ;
  - flou de profondeur en visant : net au point visé (centre de l'écran), doux devant et derrière ; pas avec la lunette du sniper ; coupé en qualité basse. Réglages : `ZHD.flou` (5 pixels), formule dans `ZHD_DOF`.

## Ultra, séance 1 (`js/61-graphismes-ultra.js`, ordi seulement)
- Part de la Haute définition (tout ce qui précède reste).
- Rue mouillée : un miroir caché (Reflector de r128, à demi-résolution, couleurs étendues) redessine la scène vue d'en dessous ; un masque dessiné par le code fait des flaques et des traces de pneus qui reflètent plus, la rue entière brille un peu. Effet de Fresnel (plus de reflet en regardant loin), petites ondes, s'efface après 55 m. Plus fort sous la pluie (+0,4).
- Rayons de soleil (ou de lune) : passe d'image qui étire la lumière du ciel vers le soleil, cachée par les maisons et les zombies (profondeur des ombres de contact).
- Ombres douces : ombres VSM (flou de 5) pour le soleil et les lampadaires.
- Ombres de contact en pleine résolution (au lieu de la moitié).
- Coût : une scène de plus à dessiner (le miroir), plus le reste. Si ça lague, revenir à Haute définition.

## Ressources téléchargées
Le réseau de la session ne laisse passer que GitHub et npm : les sites de textures et de modèles libres (polyhaven.com, ambientcg.com, kenney.nl, quaternius.com) sont encore bloqués (vérifié le 2026-11-04, séance 1). Les images HDR de Poly Haven viennent d'une copie sur npm (`@pmndrs/assets`, CC0). Pour les ajouter : réglages de l'environnement Claude Code, « Network access », ajouter ces domaines aux domaines permis. En attendant, tout est dessiné par le code.

## Prochaines étapes (plan accepté le 2026-11-04 : on passe au niveau « Haute définition », visée Modern Warfare, ordi puissant)
Martin a essayé Amélioré : pas de lag au cell (S24) ; sur un petit ordi, « Graphismes : basse » règle le lag.

Avant de commencer : permettre dans les réglages de l'environnement (Network access, domaines permis) `polyhaven.com`, `dl.polyhaven.org`, `ambientcg.com`, `kenney.nl`, `quaternius.com`. Sans eux, tout reste dessiné par le code (moins réaliste).

Niveau « Haute définition » (nouveau choix dans le bouton Style, ordi d'abord) :
1. Séance 1, la lumière (faite, tâche 82) : matériaux physiques (MeshStandardMaterial : rugosité, métal, cartes de relief), ciel et lumière d'ambiance tirés d'une image HDR (Poly Haven), rendu en couleurs étendues avec réglage d'exposition (tone mapping ACES), ombres de contact (SSAO, `SSAOPass` de r128), carte d'ombre 4096.
2. Séance 2, le décor (tâches 84 et 85 : lampadaires de nuit, autos détaillées, fils, débris ; textures photo en attente du réseau) : textures photo (asphalte, briques, béton, rouille) d'ambientCG, avec relief et rugosité ; débris, poteaux, fils, autos plus détaillées ; nuit : lampadaires et feux qui éclairent vraiment et projettent des ombres.
3. Séance 3, les zombies et les effets (tâche 86, sans téléchargement : zombies détaillés par le code, sang au sol, flou en visant ; modèles glTF, fumée et brume en attente) : modèles téléchargés (glTF, GLTFLoader de r128) avec animations, sang et impacts collés aux murs, fumée et feu plus épais, brume qui prend la lumière, profondeur de champ en visant.
4. Ultra, séance 1 (faite, tâche 87) : reflets de la rue mouillée, rayons de soleil, ombres douces, ombres de contact pleines. Ensuite : le même style pour le robot et le RTS.

Règles : Actuel et Amélioré ne changent pas ; Haute définition se choisit dans le même bouton ; on garde Three.js r128 (le changer toucherait tout le jeu) ; images par seconde à mesurer sur l'ordi de Martin après chaque séance.

## À équilibrer en jouant
- Ultra : force des reflets (0,5, +0,4 sous la pluie), rayons (0,5), flou des ombres (5), taille du miroir (moitié de l'écran) : `ULT.regl` dans `js/61-graphismes-ultra.js`.
- Zombies, tous les styles : force des nuances (`ZTEINT`), taille des yeux au loin (`ZYEUX`), part de bras qui pendent (`zBras`) dans `js/07-zombies.js`.
- Haute définition, zombies : force du flou en visant (5), couleur et taille des flaques de sang : `ZHD` dans `js/60-graphismes-zombies.js`.
- Haute définition, nuit : force des lampadaires (4,5), portée (30 m), cône de brume (0,16) : `HD_NUIT`.
- Haute définition : exposition (1,15), force de la lumière HDR (`env` 0,55), teinte de la ville (0,6), SSAO (rayon 0,7 m), éclat (0,5, seuil 0,92), lueurs et ciel (`sansOmbre`) : `HD_REGL` dans `js/58-graphismes-hd.js`. Images par seconde à mesurer sur l'ordi de Martin.
- Force de l'éclat (0,45), seuil (0,86), grain (0,035), coins (0,4) : `STYLE_GRADE` et `styleComposer` dans `js/57-graphismes.js`.
- Images par seconde au cell : si c'est lent, baisser la carte d'ombre ou retirer l'éclat au cell.
