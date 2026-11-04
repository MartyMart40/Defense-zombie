# Graphismes : les niveaux de style

Demande de Martin (2026-11-04) : des « degrés » de graphismes au choix, du jeu actuel jusqu'à un rendu très poussé. Les niveaux du haut peuvent être réservés à l'ordi. Il ne tient pas aux détails exacts des modèles, seulement au rendu final. On avance un niveau à la fois, en commençant par Saint-Clou.

## Les niveaux
| Niveau | Visée | Où | Statut |
|--------|-------|----|--------|
| Actuel | Le jeu tel qu'il était : couleurs unies, formes simples | Partout | Fait |
| Amélioré | Jeu 3D des années 2005 à 2010 (genre Half-Life 2, en plus simple) : textures, vraies ombres, éclat lumineux | Toit (cell récent et ordi) | Phase 1 faite (tâche 80) |
| Haute définition | Matériaux réalistes (rugosité, reflets), éclairage plus riche, zombies plus détaillés, modèles téléchargés | Toit, ordi surtout | À faire |
| Ultra | Ce qu'un ordi puissant peut donner : ombres douces partout, reflets, brume volumétrique | Ordi seulement | Plus tard |

Le choix : bouton « Style » dans Pause (clé `dt_style` : `actuel` ou `ameliore`). Il change tout de suite, sans recommencer la partie. Il s'ajoute au réglage « Graphismes » (qualité : résolution et nombre d'effets, `js/36-rendu.js`) : en qualité basse, pas d'éclat et carte d'ombre de 512 ; moyenne (et cell) 1024 ; haute sur ordi 2048. Si un ordi lague en Amélioré, baisser « Graphismes ».

## Comment c'est fait (`js/57-graphismes.js`)
- Rien n'est refait dans `js/03-scene.js` : à la fin de `buildWorld`, l'événement `Jeu.emit('monde', L)` laisse le style habiller la rue. Chaque matériau est remplacé par une version détaillée, et l'original est gardé : revenir à « Actuel » remet les originaux.
- Textures dessinées par le code, une fois : asphalte (rapiéçages, taches d'huile, fissures, gravier), trottoir en dalles, gazon, bois, « crasse » pour le reste. Les façades sont redessinées en 256 x 512 à partir de l'originale : briques (ville, port) ou planches à clin (maisons), cadres, croisillons, allèges, coulures, saleté au pied des murs, les mêmes fenêtres allumées.
- Ombres : le soleil (bas, au fond de la rue) projette de vraies ombres sur les 100 premiers mètres. Carte d'ombre de 2048 sur ordi, 1024 au cell. Les zombies projettent leur ombre ; les taches sous eux (`js/36-rendu.js`) sont cachées.
- Effets d'image (copie de Three.js r128 dans `lib/three-effets.js`) : éclat lumineux (UnrealBloom : fenêtres, feux, soleil), lissage des bords (FXAA), couleurs (saturation 0,9, contraste 1,1, ombres un peu froides, lumières un peu chaudes), coins assombris et grain de film. La boucle (`js/15-boucle.js`) appelle `styleRendu()` ; l'arme en main est dessinée par-dessus, sans effets.
- Le style ne touche ni le robot ni le RTS pour l'instant.

## Ressources téléchargées
Le réseau de cette session ne laisse passer que GitHub et npm : les sites de textures et de modèles libres (polyhaven.com, ambientcg.com, kenney.nl, quaternius.com) sont bloqués. Pour les ajouter : réglages de l'environnement Claude Code, « Network access », ajouter ces domaines aux domaines permis. En attendant, tout est dessiné par le code.

## Prochaines étapes (plan accepté le 2026-11-04 : on passe au niveau « Haute définition », visée Modern Warfare, ordi puissant)
Martin a essayé Amélioré : pas de lag au cell (S24) ; sur un petit ordi, « Graphismes : basse » règle le lag.

Avant de commencer : permettre dans les réglages de l'environnement (Network access, domaines permis) `polyhaven.com`, `dl.polyhaven.org`, `ambientcg.com`, `kenney.nl`, `quaternius.com`. Sans eux, tout reste dessiné par le code (moins réaliste).

Niveau « Haute définition » (nouveau choix dans le bouton Style, ordi d'abord) :
1. Séance 1, la lumière : matériaux physiques (MeshStandardMaterial : rugosité, métal, cartes de relief), ciel et lumière d'ambiance tirés d'une image HDR (Poly Haven), rendu en couleurs étendues avec réglage d'exposition (tone mapping ACES), ombres de contact (SSAO, `SSAOPass` de r128), carte d'ombre 4096.
2. Séance 2, le décor : textures photo (asphalte, briques, béton, rouille) d'ambientCG, avec relief et rugosité ; débris, poteaux, fils, autos plus détaillées ; nuit : lampadaires et feux qui éclairent vraiment et projettent des ombres.
3. Séance 3, les zombies et les effets : modèles téléchargés (glTF, GLTFLoader de r128) avec animations, sang et impacts collés aux murs, fumée et feu plus épais, brume qui prend la lumière, profondeur de champ en visant.
4. Ensuite, « Ultra » (ordi seulement) et le même style pour le robot et le RTS.

Règles : Actuel et Amélioré ne changent pas ; Haute définition se choisit dans le même bouton ; on garde Three.js r128 (le changer toucherait tout le jeu) ; images par seconde à mesurer sur l'ordi de Martin après chaque séance.

## À équilibrer en jouant
- Force de l'éclat (0,45), seuil (0,86), grain (0,035), coins (0,4) : `STYLE_GRADE` et `styleComposer` dans `js/57-graphismes.js`.
- Images par seconde au cell : si c'est lent, baisser la carte d'ombre ou retirer l'éclat au cell.
