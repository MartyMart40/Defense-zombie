# Conception : Dernier toit

Ce fichier garde le concept et les décisions de Martin pour le mode du toit. Les autres modes ont leur fiche : `docs/robot.md` (Robot de combat) et `docs/rts.md` (Guerre des robots). Le code : `docs/architecture.md`.

## Concept (Martin)
Je suis dans ma fenêtre de bunker ou sur un toit d'immeuble barricadé et je tire des zombies avec des guns. Plus j'en tue, plus je gagne d'argent. Viser avec un joystick sur le cell ou la souris sur l'ordi.

## Principes
- Position fixe, vue vers la rue (pas de 360 degrés).
- La barricade a des points de vie : si elle cède, la partie est finie.
- Argent par zombie (tête +50 %), boutique entre les vagues.
- Campagne de 6 villes (5 jusqu'au dossier 117, puis la Centrale), chaque ville débloque la suivante.
- Expérience gardée même à la défaite, talents permanents.

## Campagne (2026-11-02)
- Pas de choix au départ : « Jouer » lance la prochaine ville à libérer, dans l'ordre Saint-Clou, Val-des-Cendres, Banlieue Nord, Centre-ville, Port industriel, la Centrale.
- Vague 1 : 30 zombies, puis +30 par vague. Chaque ville : +15 % de zombies.
- Argent et XP par zombie réduits (×0,35) pour compenser le nombre.
- La carte reste disponible pour rejouer une ville libérée.

## Atelier, défenses et mode infini (bâtis le 2026-11-02)
- Atelier : 4 emplacements de défenses automatiques le long de la rue (2 près de la barricade, 2 plus loin). Vendre rembourse la moitié.
- Défenses : tourelle 250, mortier 900, laser 2 500, missiles 6 000, ogive nucléaire 40 000 (toutes les 30 s, compte à rebours).
- 4 lignes d'amélioration infinies par défense (dégâts, cadence, portée ou zone, spéciale). Chaque niveau coûte 15 % de plus et donne +10 %. Dégâts sans limite, cadence et recharge plafonnent doucement.
- Monnaie des défenses : ferraille, permanente, gagnée sur chaque zombie (même ceux tués par les défenses).
- Mode infini : débloqué en libérant les 5 premières villes (la Centrale n'est pas demandée, voir plus bas), jouable dans les 6. Difficulté identique partout, seul le décor change. Départ avec 1 000 $, plafonds de dégâts et barricade retirés, record par ville. Depuis la tâche 47 : vie +18 % et dégâts +14 % par vague, argent +10 %.
- ANNULÉ (2026-11-02) : pas de Niveau de horde ni de choix du nombre de zombies. Le joueur ne choisit pas la difficulté : elle monte avec les vagues, et il y répond en achetant des améliorations.

## Zombies (2026-11-02)
- Marcheur, coureur, costaud, sauteur (bonds), volant (ailes, plonge sur la barricade), cracheur (crache de loin), colosse (géant lent, très rare).
- Arrivée graduelle à partir de Saint-Clou vague 2. Le total par vague ne change pas : les nouveaux types remplacent des marcheurs.
- Boss toutes les 5 vagues, un par ville (Le Fossoyeur, Le Colosse des Cendres, L'Ogre de minuit, Le Titan de béton, Le Docker, Le Léviathan du port). Lance des autos, frappe la barricade, faible à la tête.

## Ajouts du 2026-11-02 (soir)
- Mode infini après les 5 villes : boss aux 5 vagues (chiffres de force : voir plus haut).
- Repères visuels pour jouer sans son, sous-titres, réglages dans Pause.
- Succès (37) et missions (3 actives parmi 21), récompensés en ferraille.
- Ralenti à la mort du boss et sur gros combos ; chiffres de dégâts en option (pool de 24, regroupés, format compact) ; écran de fin détaillé.
- 12 tenues selon la ville ; clown zombie environ 1 sur 10 000 zombies (compteur à vie).

## Autres modes (2026-11-04)
- Robot de combat : débloqué en tombant au mode infini. Fiche : `docs/robot.md`.
- Guerre des robots (RTS) : sur l'écran titre, sans condition. Fiche : `docs/rts.md`.
- Écran titre : Jouer, Robot de combat et Guerre des robots en haut ; l'aide des commandes est repliée sous « Comment jouer ».
- Tutoriel (2026-11-04, Martin : « seulement si on veut, et on peut le passer ») : proposé une seule fois à un nouveau joueur, jamais à un joueur qui a déjà joué ; « Revoir le tutoriel » dans Comment jouer.
- Armes (2026-11-04, Martin) : une arme neuve repart à zéro pour ses propres améliorations, mais elle est plus forte au départ ; les améliorations générales (dégâts, recharge, chargeurs, barricade) restent. Leur force est un autre dossier, à voir.

## Équilibrage des armes (2026-11-12)
Martin : « vas-y, essai-erreur, pas besoin d'autorisation ». Mesuré avec le duel à budget égal du simulateur (`docs/equilibrage.md`).
- Règle : une arme plus chère doit faire au moins aussi bien que « garder l'arme d'avant et l'améliorer », ou être nettement meilleure contre le boss. Avant, ce n'était vrai pour aucune arme après le fusil d'assaut.
- Rôles, affichés dans la boutique (« Bon contre ») : fusil d'assaut, lance-flammes, minigun et mitrailleuse .50 pour la horde ; sniper, arbalète et canon électromagnétique pour les boss ; roquettes et grenades pour les groupes.
- Prix inchangés. Difficulté des villes inchangée (le robot-joueur est plus faible qu'un vrai joueur dans les dernières villes : on ne s'y fie pas pour ça).
- Chiffres : sniper 450 dégâts, 1,2 tir/s, chargeur 6 ; arbalète 260, 1,8 tir/s, chargeur 8, traverse 4, tête ×1,8 ; lance-flammes 13 et brûlure 40, portée 36 m ; minigun 34, dispersion 0,026 ; lance-roquettes 1 000, 4 par chargeur, 1,2 tir/s, rayon 6,5 m ; fusil à pompe 32 par plomb, pleine force jusqu'à 25 m puis 30 % à 60 m ; mitrailleuse .50 136 à 10 tirs/s, canon électromagnétique 2 080, lance-grenades 480, arc 416 ; laser inchangé (déjà le plus fort).
- Roquette en plein sur un zombie : tous ses dégâts, peu importe sa taille (avant, un boss n'en prenait qu'environ 40 %).
- Robot de combat : ses armes gardent leurs anciens dégâts (facteur `k` dans `MECH_W`). Seul changement pour lui : la roquette de plein fouet et un rayon d'explosion un peu plus grand.
- À surveiller : le lance-roquettes reste derrière le minigun dans les mains du robot-joueur (il vise un seul zombie, pas le milieu du groupe) ; le canon électromagnétique ne sert que contre les boss.

## Tour des trois modes (2026-11-12)
Martin : « trouve ce qui cloche et change sans me demander ». Trouvé en faisant jouer des robots-joueurs en accéléré.
- Autos du boss : destructibles en vol (3 balles, ou une roquette), 1,9 s de vol. Le bandeau du boss le dit.
- Arsenal : le canon électromagnétique couche un couloir sur toute la rue (`tube` dans `ARS_W`) ; lance-grenades et mitrailleuse .50 renforcés. Le laser reste le plus fort pour son prix.
- Robot et RTS : voir `docs/robot.md` et `docs/rts.md`.

## Défenses de l'atelier (2026-11-12)
Banc du simulateur : le joueur ne tire pas, même ferraille dans un seul type de défense, barricade infinie.
- Avant : 4 tourelles de base avec le reste en améliorations battaient le mortier, le laser et les missiles dans presque toutes les situations (une amélioration coûte 40 % du prix de la défense pour +10 % : les tourelles à 250 montent le moins cher).
- Mortier 120 dégâts (70 avant), laser 80 par seconde et brûlure 20 (45 et 12), missiles 250 (160). Tourelle et ogive inchangées.
- Après (essayé avec ×1,6, ×2,2 et ×1,5 ; les chiffres retenus sont un peu différents et n'ont pas été remesurés un par un) : tourelles les meilleures jusqu'à environ 3 000 ferrailles, laser et mortier vers 7 000 à 12 000, missiles à 25 000.
- Constat laissé tel quel : 4 tourelles de base (1 000 ferrailles) tiennent seules la vague 4 de Saint-Clou. Les défenses pèsent lourd dans la campagne ; le simulateur les ignorait jusqu'au 12 novembre (elles étaient achetées mais ne tiraient pas).

## Villes plus dures (2026-11-13)
Martin : « oui, je veux que tu rendes ça plus difficile pour les villes ».
- Un chiffre par ville, `dur` dans `js/02-villes.js` : il multiplie la vie et les dégâts des zombies. Saint-Clou 1, Val-des-Cendres 1,35, Banlieue Nord 1,6, Centre-ville 1,4, Port 1,25. Pas le mode infini, ni le robot.
- Essayé avant : monter seulement `diff` (aucun effet visible) et monter `CITY_SCALE` à 1,45 (rien aux villes 2 et 3, mur au Port).
- Au simulateur (défenses actives) : débutant, 2 essais à Banlieue Nord, Centre-ville et Port ; moyen, 1 ou 2 à Centre-ville et au Port ; bon, tout du premier coup mais de justesse (23 % de barricade à Centre-ville).

## Ressenti du tir (tâche 94, 2026-11-13)
Martin : « ça brasse pas assez ». Fichier `js/62-ressenti.js`, réglages en haut du fichier (`RS_ARME` par arme, puis `RS_CAM_MAX`, `RS_MK`, tailles des pools).
- Recul : coup de caméra par arme (le sniper, le fusil à pompe et le lance-roquettes brassent, le pistolet et le fusil d'assaut à peine), retour par ressort ; recul et roulis de l'arme en main, éclair de bouche dosés par arme.
- Impact : gerbe de sang dans le sens du tir, poussière au sol ou étincelles sur les façades quand on rate, marqueur au réticule (losange rouge, or pour la tête, croix rouge pour un tué), gel d'environ 0,05 s des zombies sur un tir à la tête qui tue, un gros zombie abattu ou 3 zombies d'une explosion.
- Zombies : sursaut (torse et tête vers l'arrière), corps poussé à la mort (fort au pompe, au sniper, aux explosions).
- Son : « toc » pour la tête, coup sec pour le tué, coup grave sous les grosses armes, impacts dans la chair espacés d'au moins 0,05 s.
- Décision : seulement visuel et sonore. La caméra est décalée pour l'image seulement, la pose des zombies seulement pendant leur dessin : les balles, les zombies et le simulateur ne changent pas. Réglage « Secousses » dans Pause (coup de caméra et gel).

## Monstres du toit ajoutés le 2026-11-13 (tâche 98)
Martin : « continue d'améliorer : graphisme, sons, monstres ». Règle suivie : un monstre change ce que le joueur doit faire, il n'est pas juste plus solide.
- Hurleur (85 de vie) : s'arrête à 40 à 50 m, hurle toutes les 3,2 s, zombies à moins de 16 m 1,4 fois plus vite pendant 6 s. Parade : le tuer en premier.
- Fouisseur (120 de vie) : sous terre environ 5 s, intouchable (tirs, explosions, défenses), ressort à 9 à 15 m. Parade : avant qu'il creuse, ou à la sortie (dégâts ×2 pendant 1,5 s).
- Revenant (130 de vie) : à genoux 2,8 s sur un coup mortel au corps, se relève une fois avec la moitié de sa vie. Parade : la tête, ou l'achever à terre.
- Le « porteur d'explosifs » envisagé existait déjà (le Gonflé de `js/35-monstres.js`).
- Ils remplacent des marcheurs (au plus la moitié de ceux qui restent). Port, vague 10 : environ 10 revenants, 5 hurleurs et 7 fouisseurs sur 480 zombies.
- Finitions (tâche 110) : voix propres dans `js/37-bruitages.js`, repères sans son dans `js/29-reperes.js`, hurleur à gorge orange et longs bras pâles. Les monstres annoncent leurs moments (`cri`, `creuse`, `sort`, `chute`, `releve`) par `Jeu.emit('monstre', quoi, z)`.
- Fichier `js/63-monstres-toit.js` : il enveloppe `wavePlan`, `damage` et `defHit` (comme `19-boss.js` et `35-monstres.js`).

## Moments de crise (tâche 100, 2026-11-13)
Constat : les zombies sortaient à un rythme plat ; on était soit en sécurité, soit mort (au simulateur, 75 à 90 % des vagues tenues sans que la barricade descende sous 90 %). Martin a accepté l'idée ; il avait refusé « choisir 1 bonus parmi 3 » : rien n'arrête le jeu. Fichier `js/64-crise.js`, tous les réglages dans `CRISE` en haut du fichier.
- Assauts : dès la vague 2, 1 par vague (Saint-Clou, Val-des-Cendres), 1 ou 2 (Banlieue Nord, Centre-ville, une chance sur deux), 2 (Port, mode infini). 3 s d'avertissement (bandeau « ASSAUT ! », sirène, sous-titre et bords rouges pour jouer sans son), puis 15 à 25 % des zombies de la vague sortent 4 fois plus serrés, puis 6 s de creux (sorties 2,5 fois plus espacées). Le total de la vague ne change pas : ce sont les zombies suivants de la file. Le plafond de zombies en vie reste respecté. Jamais dans les 10 premières secondes, ni avec le boss en vie, ni si le boss serait dans le paquet, ni pendant une bulle du tutoriel. Au plus un fouisseur par paquet (les autres sont échangés avec des zombies plus loin dans la file).
- Brèche (dernier souffle) : une fois par partie (mode infini : rechargée à chaque boss abattu). Quand la barricade tombe à 0 : « BRÈCHE ! Tiens bon ! », ralenti court (s'il est activé), 10 s où elle ne peut plus descendre, chaque zombie abattu répare 1,5 % (35 % au plus). Ce qui est réparé reste acquis pendant la brèche (essayé d'abord sans : les coups mangeaient la réparation et seule 1 brèche sur 4 sauvait la partie chez le débutant). Sous 5 % à la fin, elle cède. Deuxième chute : fin. Petit cœur à côté de « Barricade » : rouge si disponible, gris si utilisé.
- Danger : sous 30 % le bord rouge bat, la barre clignote, battement de cœur ; sous 15 % plus vite et plus fort. Seulement des classes CSS (opacité), léger au cell.
- Mesure : `node outils/mesure-crise.js` (8 campagnes par joueur, jusqu'à 4 essais par ville, hasard et horloge fixés : même graine = même campagne). « Vague chaude » : la barricade passe sous 30 % et la vague est tenue quand même. Avec les monstres de la tâche 98 :

| Joueur | Vagues chaudes avant | après | Essais Centre-ville avant | après | Essais Port avant | après |
|---|---|---|---|---|---|---|
| Débutant | 2,1 % | 8,6 % | 2,13 | 1,88 | 3 (7 sur 8 libérées) | 3,25 (6 sur 8) |
| Moyen | 1,8 % | 6,7 % | 1,25 | 1,5 | 2,63 (8 sur 8) | 2,5 (7 sur 8) |
| Bon | 1,6 % | 5 % | 1,38 | 1,25 | 1,38 | 1,5 |

Les trois premières villes restent du premier coup. Les brèches sauvent la partie environ 7 fois sur 10.

## Visée et armes en main (tâche 104, 2026-11-13)
Martin : « certaines armes comme le scope sur le laser ne change rien quand tu vises, c'est juste que tu vois le design d'un scope sans approcher la vision ».
- Cause : la lunette ×4 n'avait pas de cadre de lunette (seul le sniper en avait un). En visant, on voyait le tube de la lunette en 3D devant l'œil, avec un trou de moins de 5 % de l'écran, et des mires fixes (fusil d'assaut, arbalète, lance-roquettes) cachaient en plus le point rouge ou la lunette.
- Règle de visée (`js/66-visee.js`, réglages dans `VISEE`) :
  - lunette (celle d'origine du sniper, ou la lunette ×4 achetée) : vrai cadre de lunette, l'arme disparaît, zoom net. La lunette ×4 divise le champ de vision par 4 sur toutes les armes, avec son réticule (point rouge au centre, trait ouvert, poteau du bas) ;
  - point rouge : champ des mires × 0,88, on vise par le point rouge ; les mires se rabattent ;
  - sans optique : on aligne les mires, champ entre 60 % et 90 % du champ au repos (×1,1 à ×1,67).
- Zooms changés (champ en visée, au repos 70°) : lunette ×4 sur le fusil d'assaut 27,5° → 17,5°, arbalète 18,7° → 17,5°, .50 24,2° → 17,5°, laser 22° → 17,5°, canon électromagnétique 11° → 17,5° ; sans optique : arbalète 34° → 42°, canon électromagnétique 20° → 42°, laser 40° → 42° ; point rouge : arbalète 30° → 37°, laser 35,2° → 37°. Les autres ne bougent pas. Aucun chiffre de dégâts, cadence ou dispersion n'a changé.
- Armes en main : chaque pièce a sa matière (métal qui brille, polymère satiné, bois et gants mats, verre), sans appel de dessin de plus ; les pièces d'énergie (laser, canon électromagnétique, arc) s'illuminent au tir et faiblissent puis remontent pendant la recharge. Lumières plus neutres. Fusil laser refait ; point rouge et lunette ×4 refaits ; détails ajoutés à la .50 et au lance-grenades. Tests : `tests/t-visee.js`.
- Deuxième ronde (tâche 108) : tous les modèles refaits (pistolet, fusil à pompe, fusil d'assaut, sniper, arbalète, lance-flammes, minigun, lance-roquettes à garde de bois, canon électromagnétique, arc), coupés en `js/04-arme-modeles.js` et `js/04-arme-modeles2.js`. L'arme au repos est plus grande et plus près du centre (`VM_POS` de (0,22 ; -0,22 ; -0,48) à (0,19 ; -0,19 ; -0,42), échelle 0,8 inchangée ; la visée ne bouge pas). Le rayon du laser et du canon électromagnétique part fin du canon (cône) au lieu d'une grande vitre. Le coup de caméra se calme dans toute lunette (`js/62-ressenti.js`, par `viseeLunette`). Aucun chiffre d'équilibrage ni de zoom n'a changé.

## La Centrale, 6e ville (dossier 117, 2026-11-18)
Martin : plus de contenu. Une 6e ville après le Port : la centrale électrique abandonnée d'où vient la contamination. Code : `LOCS` (`js/02-villes.js`), décor `centraleRue` et `centraleFond` (`js/03-scene.js`), le reste dans `js/71-centrale.js` (réglages `CTR` en haut).
- Chiffres : 12 vagues, `diff` 4,2, `off` 5 (+75 % de zombies, 4 101 en tout), `dur` 1 (pas de durcissement à part : le Port a 1,25), argent de départ 6 000 $, XP ×6,4. Par zombie, 1,15 fois la vie et les dégâts du Port à la même vague (le test de difficulté demande ×1,12 pour elle, ×1,26 pour les autres).
- Décor : route de service entre deux clôtures grillagées (panneaux « danger »), salles des machines en béton et bureaux, cours de transformateurs, pylônes à haute tension et fils, gros tuyaux et passerelle qui traverse la rue, gyrophares qui tournent ; au bout, mur d'enceinte, bâtiment du réacteur fissuré qui luit, cheminée et deux tours de refroidissement qui fument. Nuit bleu-vert, cendres qui tombent. Météo : surtout nuit claire, cendres, neige.
- L'irradié (95 de vie, vitesse 1,25, dégâts 7) : ouvrier en combinaison, peau à vif qui luit en vert. En mourant, il laisse une flaque 6 s ; à moins de 3,2 m de la barricade, elle la ronge (0,8 × ses dégâts par seconde, par coups de 0,5 s). Parade : l'abattre loin. Seulement à la Centrale (campagne) : de 3,5 % des zombies à la vague 1 jusqu'à 10 % (vague 12 : 63), à la place de marcheurs et de coureurs. Bandeau à la première rencontre, sous-titre sans son.
- Boss : « le Liquidateur » aux vagues 5 et 10 (boss ordinaire, vie ×1,25) ; « le Cœur » à la vague 12 (vie ×1,8, taille 9, torse fissuré qui luit). Tant qu'un des 3 transformateurs de la rue tient (arcs électriques jusqu'à lui), il ne prend que 30 % des dégâts et regagne 0,6 % de sa vie par seconde et par transformateur. Les transformateurs ne sont des cibles que pendant ce combat (8 % de la vie du Cœur chacun ; balles, carreaux et roquettes). Les trois détruits : « à nu », son corps prend tous les dégâts (ses plaques ne servent plus). Il lance toujours des autos.
- Mesures (duel à budget égal, joueur moyen, 45 000 $) : le Cœur tombe en 12 s (.50, sniper + .50), 15 s (canon électromagnétique + minigun), 19 s (minigun), 33 s (lance-roquettes), dont environ 5 s pour les transformateurs. Les boss du Port tombent en 8 à 14 s.
- Simulateur (`node outils/simulateur.js centrale debutant,moyen,bon G`, graines 1 à 3, profil de sortie du Port) : bon libère la Centrale au 2e, 1er et 2e essai (35 à 67 % de barricade, souvent après une brèche) ; moyen au 2e, 3e et 2e ; débutant pas en 4 essais (graine 1, jusqu'à la vague 11), et ne libère pas le Port en 3 essais aux graines 2 et 3.
- Ce qui ne change pas : le mode infini reste débloqué par les 5 premières villes (`INF_VILLES`, `js/28-infini.js`) ; la Centrale s'y ajoute comme décor (pas d'irradié ni de Cœur). Le robot garde ses 5 décors : rue `(rue - 1) % 5` (`js/39-robot.js`) et carrefours tirés sans la Centrale (`mbRoutes`, enveloppé dans `js/71-centrale.js`). Le défi du jour tire toujours sa ville parmi les 5 premières (`DEFI_VILLES`) : aucun défi ne change. Un joueur qui avait déjà libéré le Port voit la Centrale débloquée.
- Succès : « Courant coupé » (libérer la Centrale, 1 500 ⚙) et « Arrêt du cœur » (abattre le Cœur, 800 ⚙).

## Sons de la Centrale (dossier 123, 2026-11-18)
Seulement sonore, rien ne change dans le jeu. Fichier `js/76-centrale-sons.js`, réglages `CTS_REGL` en haut. Tout par synthèse Web Audio, dans la chaîne de `Snd` (limiteur, son coupé, budget de voix) ; seulement à la Centrale (`ctrIci`), pas dans le robot ni le RTS. Hasard propre (`ctsHasard`) : aucun appel à `Math.random` (vérifié par `tests/t-centrale-sons.js`), l'empreinte du duel et la partie `centrale` du simulateur ne changent pas.
- Fond du lieu (bus ambiance) : bourdonnement des transformateurs (50, 100 et 150 Hz, 100 Hz doublé à 100,8 Hz pour un léger battement, une pointe de grésillement vers 400 Hz pour les petits haut-parleurs), souffle des tours de refroidissement qui va et vient en 14 s, claquement d'arc à gauche ou à droite toutes les 7 à 18 s. Joue pendant la vague et à la boutique (comme la météo), s'arrête net en pause, à la fin de la partie et en quittant la ville. Pendant le Cœur, le bourdonnement monte (×1,3 avec 3 transformateurs) et baisse d'un cran à chaque transformateur détruit (×1, ×0,7, ×0,4), ×0,25 après sa mort.
- Irradié : compteur Geiger de 1,5 à 26 coups par seconde selon la distance du plus proche à la barricade (55 m), un peu plus quand ils sont plusieurs, placé de son côté ; flaque qui se forme (éclaboussure, « bloup », chuintement, le compteur qui s'affole) ; grésillement acide qui bouillonne tant qu'une flaque ronge la barricade.
- Le Cœur : arrivée (montée électrique, coup grave), pulsation double de 1,3 s à 0,45 s selon sa vie, « tic-zzt » quand un tir est absorbé par le bouclier (au plus un toutes les 0,11 s, plus rien quand il est à nu), transformateur détruit (arc, explosion, sifflement qui tombe), bouclier qui tombe (décharge, verre, deux notes claires), mort (grande extinction).
- Gyrophares : alarme courte et lointaine au début des vagues de boss (5, 10 et 12) seulement. La sirène d'emprunt de `js/71` (toutes les 22 à 34 s) et son son de transformateur détruit se taisent quand ce fichier est là (`ctsEmprunt`) ; la minuterie de la sirène tire toujours son nombre, pour garder le hasard du jeu.
- Niveaux mesurés hors ligne (`node outils/mesure-sons-centrale.js`, même chaîne et même méthode que la table de `js/01-son.js`, son au maximum, dBFS ; court : RMS le plus fort sur 50 ms ; moyen : RMS de la partie qui s'entend ; cell : court après un passe-haut à 300 Hz) :

| Son | Groupe | Crête | Court | Moyen | Cell |
|---|---|---|---|---|---|
| Fond du lieu (bourdonnement et souffle) | Fond | -32,7 | -39,3 | -42,2 | -51,9 |
| Fond pendant le Cœur, 3 transformateurs | Fond | -30,8 | -37,1 | -40,1 | -51,5 |
| Arc électrique au loin | Fond | -32,2 | -42,5 | -48,4 | -47,8 |
| Geiger, irradié loin (50 m) | Irradié | -16,1 | -39,9 | -41,7 | -39,9 |
| Geiger, irradié à la barricade | Irradié | -10,7 | -32,1 | -35,9 | -32,1 |
| Flaque qui se forme (loin) | Irradié | -18,9 | -28,5 | -35,5 | -31 |
| Flaque qui se forme (contre la barricade) | Irradié | -17,7 | -27,9 | -34,6 | -30,5 |
| Grésillement : une flaque ronge la barricade | Irradié | -10,5 | -27,7 | -29,4 | -27,7 |
| Cœur : arrivée | Cœur | -6,8 | -12,5 | -23,1 | -27,7 |
| Cœur : un battement (bouclier) | Cœur | -15,1 | -21,8 | -27,8 | -37,8 |
| Cœur : tir absorbé | Cœur | -13,5 | -25,6 | -28,6 | -25,8 |
| Cœur : transformateur détruit | Cœur | -8,8 | -14,3 | -22,7 | -26,2 |
| Cœur : le bouclier tombe | Cœur | -6,5 | -14,1 | -22,5 | -20,6 |
| Cœur : mort | Cœur | -5,8 | -11,1 | -18,7 | -27 |
| Alarme des gyrophares (vague de boss) | Moment | -24 | -32,1 | -33,4 | -32,2 |
| Toit : pistolet | Toit | -7,9 | -22,6 | -29,5 | -26,6 |
| Toit : fusil d’assaut | Toit | -8,4 | -23,9 | -29,8 | -30,2 |
| Toit : fusil à pompe | Toit | -3,4 | -14,2 | -22,8 | -24,5 |
| Toit : grognement de marcheur | Toit | -17 | -30,2 | -37 | -31,5 |
| Fusil d’assaut seul, 8 coups/s pendant 4 s | Mélange | -6 | -22,2 | -27,6 | -27,1 |
| Pire cas de la Centrale, sans arme | Mélange | -9,1 | -20,4 | -25,3 | -23,5 |
| Pire cas de la Centrale, avec le fusil d’assaut | Mélange | -3,9 | -18,3 | -23,4 | -21,9 |

- Le fond reste 17 dB sous le fusil d'assaut (court) et 22 dB au cell ; le Geiger au plus fort, 8 dB sous le fusil (2 au cell) ; le grésillement de la flaque est à peu près au niveau d'un tir de fusil au cell : on l'entend. Pire cas réaliste (vague 12, Cœur et 3 transformateurs, fond, Geiger au plus fort, flaque qui ronge, battements rapides, tirs absorbés) mêlé au fusil d'assaut qui tire 8 coups par seconde : crête -3,9, court -18,3, cell -21,9 dBFS (fusil seul : -6, -22,2, -27,1), sans saturer (limiteur de `Snd`).
- Personne n'a encore écouté ces sons : à juger à l'oreille (cell et ordi), réglages dans `CTS_REGL`.

## Mise en scène des boss du toit (dossier 128, 2026-11-18)
Seulement visuel et sonore : vie, dégâts, vitesse, moment d'apparition, récompense et boîtes de tir ne changent pas, aucune pause du jeu. Fichiers `js/82-boss-scene.js` (réglages `BS_REGL`, interrupteur `on`) et `js/82-boss-sons.js` (réglages `BSS_REGL`). Branchés seulement par `Jeu.on('image')` et `Jeu.on('tue')` : aucune fonction du jeu n'est réaffectée, rien n'a changé dans `js/19`, `js/35`, `js/09` ni `js/11`. Sur le toit seulement (aucun mode `Jeu` actif) : le Titan du robot et les zombies du RTS n'en ont rien. Le Cœur de la Centrale garde sa propre mise en scène (`js/71`, `js/76`) ; le Liquidateur (Centrale, vagues 5 et 10) a un profil simple (contre-jour vert, vapeur).

Pour tous : un contre-jour (lueur sans brouillard derrière le boss, que son corps découpe en silhouette) pendant 4,6 s, une gerbe à l'apparition, un sous-titre de menace sous son nom dans la barre de vie (le nom arrive en se resserrant, la barre se déroule), un cri propre à chacun, un grondement grave (bus ambiance) qui monte à mesure qu'il approche de la barricade. Sous 50 % de vie, la lueur des yeux et de la plaie rougit et bat lentement, fumée des blessures ; sous 25 %, elle bat vite jusqu'au blanc, braises, la barre de vie clignote, un beuglement marque chaque palier. Chaque coup reçu fait des étincelles et des éclats sur sa plaque. À la mort : il titube, plie les genoux (ou non), tombe toujours vers l'arrière (loin de la caméra, le corps ne cache jamais la rue devant la barricade), anneau de poussière au ras du sol, l'image tremble une fois (ressort de `js/62`, coupé avec « Secousses »), boum grave et gravats, les yeux s'éteignent ; le bandeau « Boss abattu ! » et la récompense entrent avec un rebond doré. Le cadavre reste 3 s puis s'enfonce en 2,2 s (si `js/07` range le corps avant, ce fichier remet le même groupe dans la scène le temps de finir). Le ralenti reste celui qui existait (`pkSlow('boss')`, `js/31`) : rien de neuf sur le temps de jeu.

| Boss | Arrivée | Présence | Mort |
|---|---|---|---|
| Le Fossoyeur (Saint-Clou) | Mottes de terre qui jaillissent, corbeaux qui s'envolent des toits, contre-jour de lanterne ; râle et pelle qui racle | Mottes à chaque pas, lampadaires qui clignotent à son passage | Tourne sur lui-même en tombant à genoux, s'effondre ; cloche au loin |
| Le Colosse des Cendres (Val-des-Cendres) | Nuage de cendres et braises, contre-jour de feu ; rugissement qui crépite | Fumée qui monte de ses épaules, braises toujours | Tombe raide sur le dos, gerbe de braises ; braises qui sifflent |
| L'Ogre de minuit (Banlieue Nord) | Contre-jour de lune, corbeaux ; hurlement qui monte | Il éteint les lampadaires sur son passage (lueurs de `js/36` et lampes de nuit de `js/22`), ils restent éteints | Part de côté en titubant, tombe en biais ; les lampadaires se rallument un à un |
| Le Titan de béton (Centre-ville) | Poussière de béton et éclats, pigeons, contre-jour gris ; béton qui grince | Chaque pas fait trembler l'image (dosé par la distance), grosse poussière, coup sourd | À genoux, puis s'écroule en arrière ; béton qui s'effrite |
| Le Docker (Port industriel, vague 5) | Vapeur, mouettes, contre-jour de phare ; corne de brume | Vapeur qui monte de lui | Tombe sur le derrière puis sur le dos ; la corne s'éteint |
| Le Léviathan du port (vague 10) | Vapeur, mouettes, contre-jour rouge ; deux cornes de brume et un rugissement | Pas qui font trembler l'image, lampadaires éteints | Le plus long : titube, genoux, chute lente avec un gros rebond ; corne qui s'éteint |

- Version abrégée dès le 2e boss d'une partie (mode infini surtout, défi « Boss pressé ») : contre-jour plus court et plus faible, pas d'oiseaux ni de légende, barre en 1,2 s, cri raccourci, chute un peu plus courte.
- Légendes pour jouer sans le son (`rpCaption`, `js/29`) à la première arrivée.
- Abandonné : la boiterie (la pose d'un boss vivant déplace sa tête, qui est une cible : on n'y touche pas) ; les zombies ordinaires qui s'écartent ou marquent un temps (ils sont dessinés par instances : il faudrait envelopper `zInstSync`, risqué pour l'identité du jeu et le coût) ; la silhouette qui sort de terre (même raison que la boiterie).
- Hasard : jamais `Math.random`. Réserves faites au chargement dans `bsCalme` (Three.js tire ses uuid dans le hasard propre), sons avec leur propre hasard. Mesures : `node outils/mesure-boss-scene.js` (identité en pages neuves, appels de dessin, sons) ; `tests/t-boss-scene.js` (sonde : aucun tirage et aucun changement d'état pendant les deux fichiers, 6 boss, 900 images ; dessins ; paliers ; mort ; sons).
- Les sons courts prennent la priorité la plus basse du budget de voix de `Snd` : ils ne font jamais refuser un autre son (un cri peut être coupé par un tir quand les 10 voix sont prises).
- Mesures (2026-11-18) : empreinte du duel `SIM_DUELS=1,3 node outils/simulateur.js duel` identique avant et après (993/30,45/22,4029/13 ; 40680/36,14950/25,15571/42,10278/16). Identité du jeu en pages neuves (heure et hasard fixés), 900 images par boss, fichier coupé puis allumé : mêmes tirages et même empreinte des positions, vies, barricade et argent pour les 6 boss. Appels de dessin pendant l'arrivée : +3 (145 à 148 à Saint-Clou, 159 à 162 au Centre-ville).
- Niveaux des sons (`node outils/mesure-boss-scene.js adresse sons`, même méthode que les sons de la Centrale, dBFS) :

| Son | Groupe | Crête | Court | Moyen | Cell |
|---|---|---|---|---|---|
| Le Fossoyeur : cri d’arrivée | Cri | -14,8 | -22,5 | -29,6 | -30,2 |
| Le Fossoyeur : chute | Mort | -10,6 | -17,5 | -27,8 | -35,8 |
| Le Colosse des Cendres : cri d’arrivée | Cri | -14,6 | -22,7 | -29,3 | -28,4 |
| Le Colosse des Cendres : chute | Mort | -12,3 | -17,5 | -24,5 | -35,1 |
| L’Ogre de minuit : cri d’arrivée | Cri | -14,4 | -21,7 | -29 | -23,8 |
| L’Ogre de minuit : chute | Mort | -11,8 | -17,8 | -24,7 | -36,5 |
| Le Titan de béton : cri d’arrivée | Cri | -16,2 | -24,4 | -29,7 | -34,6 |
| Le Titan de béton : chute | Mort | -12,1 | -17,5 | -25,1 | -34,8 |
| Le Docker : cri d’arrivée | Cri | -17,1 | -24,2 | -31,1 | -31,4 |
| Le Docker : chute | Mort | -12,3 | -17,5 | -25,3 | -36 |
| Le Léviathan du port : cri d’arrivée | Cri | -17,4 | -25,3 | -31,4 | -32,5 |
| Le Léviathan du port : chute | Mort | -11,9 | -17,7 | -25,1 | -37,2 |
| Cri abrégé (2e boss de la partie) | Cri | -14,7 | -22,7 | -29,4 | -28,4 |
| Pas du Titan (tout près) | Pas | -18,7 | -24,7 | -30,8 | -52 |
| Palier de vie (sous 25 %) | Moment | -16,9 | -25,4 | -32,1 | -29,7 |
| Râle de la mort | Mort | -15,4 | -24 | -30,6 | -30,5 |
| Râle de la mort de l’Ogre | Mort | -15,5 | -23,1 | -29,1 | -26,1 |
| Nappe, boss loin | Nappe | -39,8 | -47,1 | -51,5 | -64,1 |
| Nappe, boss à la barricade | Nappe | -24,4 | -31,4 | -36 | -48,1 |
| Toit : fusil d’assaut | Toit | -9,1 | -25,1 | -31,1 | -30,8 |
| Toit : fusil à pompe | Toit | -2,3 | -12,8 | -20,7 | -22,9 |
| Pire cas : Titan à la barricade, pas, chute, fusil d’assaut | Mélange | -5,7 | -17,5 | -26 | -27,1 |

- Les cris sont au niveau d'un tir de fusil d'assaut (court -22 à -25), la chute un peu au-dessus (-17,5, sous le fusil à pompe à -12,8), les pas du Titan 6 dB sous le fusil et presque rien au cell, la nappe 6 dB sous le fusil quand le boss est à la barricade et presque muette quand il arrive. Personne ne les a encore écoutés : à juger à l'oreille, réglages dans `BSS_REGL`.
- En Haute définition, la poussière (matériau sans éclairage) ressort un peu plus claire et chaude, comme les autres lueurs de ce style.

## Explosions et pouvoirs du toit (dossier 130, 2026-11-18)
Seulement visuel et sonore : dégâts, rayons, durées, recharges, moments et argent ne changent pas. Fichiers `js/85-explosions.js` (réglages `EX_REGL`, interrupteur `on`) et `js/85-explosions-sons.js` (réglages `EXS_REGL`). Branchés seulement par `Jeu.on('image')` : aucune fonction du jeu n'est réaffectée et aucun autre fichier du jeu n'est touché. À chaque image, le fichier lit les réserves du jeu (`pwBooms`, `pwPuddles`, `pwStrikes`, `pwPlane` de `js/21` ; `ARM.booms` de `js/20` ; `RUE.fires` de `js/23` ; `bossCars` de `js/19` ; `arsBeams` de `js/34`) et reconnaît ce qui vient de naître. Sur le toit seulement (rien quand un mode `Jeu` est actif), figé en pause, rangé hors de la partie. Ce qui existait reste (éclair en sprite, lumière ponctuelle qui éclaire le décor, particules de `js/05`, secousse du jeu) ; seuls les cônes de flamme des nappes du Molotov sont cachés pendant que ce fichier dessine leur feu.

- Grenade, bombes de la frappe, roquette et lance-grenades, baril, auto du boss abattue en l'air : éclair blanc, boule de feu qui gonfle vite, freine et monte, fumée qui prend le relais et monte 3 à 4 s en s'éclaircissant (noire pour le baril), étincelles en traits, débris qui retombent et restent un moment au sol (le couvercle jaune du baril monte haut), poussière soufflée au ras du sol, onde de choc et lueur au sol, trace brûlée qui s'efface en 16 s. Une explosion en l'air (auto, volant) n'a ni onde ni brûlure.
- Cocktail Molotov : verre qui éclate, souffle de feu bas et large, puis des langues de feu (bouffées rondes et traits étirés vers le haut) qui vivent sur toute la nappe, fumée sombre, braises, lueur qui bat ; quand la nappe s'éteint d'elle-même, des volutes grises. Même feu, plus petit, sur ce que laisse un baril (4 s).
- Frappe aérienne : pendant l'attente, anneau rouge qui bat sur la cible et gerbe d'étincelles rouges de la fusée (en plus de la fumée rouge d'avant) ; au passage, traînées blanches au bout des ailes et lueur des moteurs ; puis le chapelet d'explosions.
- Canon électromagnétique : air ionisé qui scintille le long du rayon, éclair et gerbe bleue au point d'impact, anneau bleu et petite brûlure au sol. Le rayon part dans l'axe de la vue : on voit surtout l'impact.
- Sons, par-dessus `Snd.boom` (gardé avec sa réverbération) : coup grave (55 à 26 Hz), queue qui roule dans la rue (3 à 4 s ; une seule pour tout le chapelet de la frappe), débris, couvercle du baril qui sonne, tôle de l'auto ; placés à gauche ou à droite, plus faibles, plus sourds et un peu en retard de loin. Molotov : verre et souffle, puis crépitement tant qu'une nappe brûle (bus ambiance, plus fort de près). Frappe : deux bips de radio à l'annonce, souffle de l'avion qui passe. Canon : grésillement à l'impact. Budget de voix à part (6), jamais dans `Snd.voix` : un son du jeu refusé ou coupé à cause d'eux changerait ses tirages de `Math.random` (vu en mesurant). Coupés net en pause.
- Deux appels de dessin au plus : toutes les bouffées dans une géométrie par instances (fumée et débris d'abord, puis le feu, en un seul mélange prémultiplié qui fait l'alpha et l'additif), tout ce qui est au sol dans une deuxième. Réserves fixes : 260 bouffées et 40 marques à l'ordi, 150 et 24 au cell (et 60 % des bouffées) ; moins encore si les images par seconde tombent. Haute définition et Ultra : couleurs passées en linéaire dans le nuanceur, lueurs au sol baissées (l'exposition et l'éclat les blanchissaient).
- Hasard : jamais `Math.random` (générateurs propres, objets créés dans `exCalme`).
- Abandonné : les autos garées qui sautent (le jeu n'en fait pas sauter ; en ajouter changerait le jeu) ; une vraie lumière de plus (celles du jeu éclairent déjà le décor) ; un mouvement de caméra de plus (la secousse du jeu suffit, et « Secousses » n'a rien de neuf à couper).
- Mesures (2026-11-18) : empreinte du duel `SIM_DUELS=1,3 node outils/simulateur.js duel` identique avant et après (993/30,45/22,4029/13 ; 40680/36,14950/25,15571/42,10278/16). Identité du jeu en pages neuves, sans puis avec les fichiers 85 (requêtes bloquées), 900 images avec grenades, Molotov, frappe, baril, roquette, canon et auto du boss abattue : mêmes tirages (1 407 590), même empreinte des positions, vies, barricade et argent (`node outils/mesure-explosions.js adresse identite`). Appels de dessin : rue calme inchangée (93 ordi, 89 cell) ; au plus fort (frappe, nappe et baril ensemble) +2 (159 à 161 ordi, 136 à 138 cell). Temps de l'écouteur au plus fort : 0,02 ms à l'ordi, 0,11 ms au cell (processeur ralenti ×4) ; le coût de remplissage des grandes bouffées sur une vraie carte de cell n'est pas mesuré.
- Niveaux des sons (`node outils/mesure-explosions.js adresse sons`, même méthode que les sons de la Centrale, dBFS) :

| Son | Crête | Court | Moyen | Cell |
|---|---|---|---|---|
| Grenade à 15 m, `Snd.boom` seul (avant) | -2,2 | -11,2 | -18,7 | -20,3 |
| Grenade à 15 m, avec grave et queue | -1,7 | -10,6 | -18,3 | -21,5 |
| Grenade à 60 m | -2,5 | -11,4 | -19,3 | -21,3 |
| Baril à 25 m (avant) | -1,7 | -9,9 | -16,5 | -19,8 |
| Baril à 25 m | -1,7 | -8,5 | -15,3 | -19,7 |
| Roquette à 30 m | -1,6 | -9 | -16,1 | -20,6 |
| Auto abattue à 25 m (couche ajoutée seule) | -12,6 | -17,6 | -26,5 | -42,8 |
| Cocktail Molotov à 20 m | -17,3 | -24,1 | -31,1 | -42 |
| Feu d'une nappe à 15 m | -21,9 | -40,3 | -49,5 | -40,5 |
| Frappe : annonce | -26,6 | -38,9 | -42,9 | -39 |
| Frappe : passage de l'avion | -19,1 | -28,9 | -35,5 | -29,2 |
| Canon électromagnétique : impact à 30 m | -31 | -41,1 | -49,5 | -44,5 |
| Toit : fusil d'assaut | -8,4 | -23,4 | -29,3 | -29,6 |
| Pire cas avant : 7 bombes, baril, fusil d'assaut | -1,2 | -8,1 | -15,5 | -18 |
| Pire cas après : + annonce, avion, nappe, graves et queues | -1,3 | -7,3 | -15,4 | -18,2 |

- Le limiteur de `Snd` tient tout sous la saturation (crête du pire cas -1,3 comme avant -1,2). Le grave se sent plus qu'il ne s'entend (il ne passe presque pas au cell). Personne ne les a encore écoutés : à juger à l'oreille, réglages dans `EXS_REGL`.
