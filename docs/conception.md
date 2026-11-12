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
