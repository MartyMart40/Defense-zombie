# Conception : Dernier toit

Ce fichier garde le concept et les décisions de Martin pour le mode du toit. Les autres modes ont leur fiche : `docs/robot.md` (Robot de combat) et `docs/rts.md` (Guerre des robots). Le code : `docs/architecture.md`.

## Concept (Martin)
Je suis dans ma fenêtre de bunker ou sur un toit d'immeuble barricadé et je tire des zombies avec des guns. Plus j'en tue, plus je gagne d'argent. Viser avec un joystick sur le cell ou la souris sur l'ordi.

## Principes
- Position fixe, vue vers la rue (pas de 360 degrés).
- La barricade a des points de vie : si elle cède, la partie est finie.
- Argent par zombie (tête +50 %), boutique entre les vagues.
- Campagne de 5 villes, chaque ville débloque la suivante.
- Expérience gardée même à la défaite, talents permanents.

## Campagne (2026-11-02)
- Pas de choix au départ : « Jouer » lance la prochaine ville à libérer, dans l'ordre Saint-Clou, Val-des-Cendres, Banlieue Nord, Centre-ville, Port industriel.
- Vague 1 : 30 zombies, puis +30 par vague. Chaque ville : +15 % de zombies.
- Argent et XP par zombie réduits (×0,35) pour compenser le nombre.
- La carte reste disponible pour rejouer une ville libérée.

## Atelier, défenses et mode infini (bâtis le 2026-11-02)
- Atelier : 4 emplacements de défenses automatiques le long de la rue (2 près de la barricade, 2 plus loin). Vendre rembourse la moitié.
- Défenses : tourelle 250, mortier 900, laser 2 500, missiles 6 000, ogive nucléaire 40 000 (toutes les 30 s, compte à rebours).
- 4 lignes d'amélioration infinies par défense (dégâts, cadence, portée ou zone, spéciale). Chaque niveau coûte 15 % de plus et donne +10 %. Dégâts sans limite, cadence et recharge plafonnent doucement.
- Monnaie des défenses : ferraille, permanente, gagnée sur chaque zombie (même ceux tués par les défenses).
- Mode infini : débloqué dans les 5 villes après la campagne. Difficulté identique partout, seul le décor change. Départ avec 1 000 $, plafonds de dégâts et barricade retirés, record par ville. Depuis la tâche 47 : vie +18 % et dégâts +14 % par vague, argent +10 %.
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
