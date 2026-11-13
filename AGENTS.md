# Règles pour les agents qui travaillent sur Dernier toit

Lire ce fichier au complet avant de toucher au code. Pour un gros ajout, lire aussi `docs/architecture.md`.

## Le jeu
Jeu de tir défensif 3D en navigateur (Three.js r128, copie locale dans `lib/`), en ligne sur GitHub Pages : https://martymart40.github.io/Defense-zombie/
Trois modes : le toit (campagne de 5 villes et mode infini), le robot de combat, et le RTS « Guerre des robots ».

## Documentation
| Fichier | Quoi |
|---------|------|
| `docs/architecture.md` | Comment le code est bâti : ordre des fichiers, plages de numéros, registre des modes, ajouter un mode |
| `docs/conception.md` | Concept et décisions de Martin pour le toit |
| `docs/robot.md`, `docs/rts.md` | Une fiche par mode : concept, fichiers, chiffres, décisions, à équilibrer |
| `docs/graphismes.md` | Niveaux de style graphique (Actuel, Amélioré, Haute définition, Ultra) : feuille de route |
| `TACHES.md` | En cours, à faire, à valider par Martin, dernières tâches faites |
| `docs/historique.md` | Toutes les tâches faites plus anciennes |
| `tests/LISEZMOI.md` | Comment marchent les tests |
| `docs/equilibrage.md` | Dernier rapport du simulateur d'équilibrage (`node outils/simulateur.js`) |

## Carte du code
- `index.html` : écrans, HUD, boutons et la liste des scripts, dans l'ordre. `css/style.css` : tout le style.
- `lib/three.min.js` : Three.js r128 (ne pas modifier ; secours sur cdnjs si absent). `lib/three-effets.js` : effets d'image de r128 (éclat, FXAA), ne pas modifier. `lib/three-hd.js` : EXRLoader, SSAO et Reflector de r128 pour la Haute définition et Ultra, ne pas modifier. `hdri/` : images HDR (Poly Haven, CC0).
- `manifest.webmanifest`, `sw.js`, `icones/` : application installable. `sw.js` sert la copie en cache seulement sans réseau.
- `outils/` : `lancer-tests.js` (toute la suite dans Chromium), `version.sh` (change les ?v= avant une mise en ligne), `simulateur.js` et `sim-bot.js` (simulateur d'équilibrage, rapport dans `docs/equilibrage.md`). `.github/workflows/tests.yml` lance les tests sur GitHub à chaque push.
- `js/NN-nom.js`, chargés dans l'ordre du numéro :

| Fichiers | Rôle |
|----------|------|
| 00 base | Outils (`$`, `store`, `fmt`, `rand`, `clamp`), journal des erreurs cachées (`errNote`, `JOURNAL`), registre des modes `Jeu` |
| 01 son | Sons et musique (`Snd`) |
| 02 villes | Les 5 villes (`LOCS`) |
| 03 scène | Scène, caméra, rendu, décor de la rue (`buildWorld`) |
| 04 arme en main, modèles, anim | Arme tenue : base et mains (`04-arme-en-main`), les modèles (`04-arme-modeles` : pistolet, pompe, assaut, sniper ; `04-arme-modeles2` : arbalète, lance-flammes, minigun, lance-roquettes, canon électromagnétique, arc), douilles et animations (`04-arme-anim`) |
| 05 particules | Particules |
| 06 données | Armes, améliorations, difficulté (`WEAPONS`, `WUPG`, `CITY_SCALE`) |
| 07 zombies | Zombies de base, apparition, `damage`, `kill` |
| 08 tir | `fire()` |
| 09 vagues | Vagues, écrans, fin de partie |
| 10 boutique | Boutique entre les vagues |
| 11 HUD, 12 souris, 13 tactile, 14 menus | Interface et entrées |
| 15 boucle | Boucle du jeu (`update`, `visuals`) |
| 16 atelier, 17 défenses | Ferraille et défenses automatiques |
| 18 types, 19 boss, 35 monstres | Zombies spéciaux, boss, monstres |
| 20 armes, 34 arsenal | Armes spéciales, armes lourdes et accessoires |
| 21 pouvoirs | Grenade, molotov, frappe aérienne |
| 22 ambiance, 36 rendu | Météo, musique, qualité graphique |
| 23 rue, 23 survivants, 24 compagnon | Barils, caisses, civils (`23-rue`) ; survivants tireurs (`23-survivants`) ; compagnons |
| 25 défi, 26 combos, 28 infini, 30 missions | Défi du jour, combos, mode infini, succès et missions |
| 27 perf | Rendu des foules, images par seconde |
| 29 repères, 31 punch, 33 écritures | Repères sans son, ralenti et chiffres, textes à gauche |
| 32 sauvegarde | Sauvegarde dans un fichier |
| 37 bruitages, 38 vibrations | Sons placés, vibrations du cell |
| 39 à 40 | Mode robot (`docs/robot.md`) : 39 robot, 40-robot-monstres vagues et carrefour, 40-robot-fin course de 9 rues et tours, 40-robot-habitacle habitacle, manettes et jambes (réglage dt_mech_vue) |
| 41 à 44 | Mode RTS (`docs/rts.md`) : 41 données et vallée, 42 unités et partie, 42-rts-combat zombies, IA et boucle, 43 pilotage, 44 interface |
| 45 sauvegarde RTS | Partie RTS en cours gardée (dt_rts_partie), bouton « Continuer la guerre » |
| 46 application | Jeu installable (avec `manifest.webmanifest`, `sw.js`, `icones/`) : plein écran, marche sans réseau |
| 47 astuces RTS | Bulles d'astuces des premières parties RTS, une fois chacune (dt_rts_astuces) |
| 48 liste RTS | Choisir les unités une par une (rangée « Unités » repliable, dt_rts_liste ; Tab, double-clic) |
| 49 commandement RTS | Mini-carte, point de ralliement, alerte « Base attaquée », Tenir la position, mode photo |
| 50 sauvegarde robot | Course du robot gardée au début de chaque rue (dt_mech_partie), « Continuer le robot » |
| 51 succès des modes | Succès du robot et du RTS (ajoutés à ACH) |
| 52 statistiques | Écran « 📊 Statistiques » : temps par mode, combat, records, arme préférée (P.vie) |
| 53 tutoriel | Tutoriel du toit facultatif : proposé une fois à un nouveau joueur, 6 bulles, « Passer », « Revoir » dans Comment jouer (P.tuto) |
| 54 postes RTS | Postes de pilotage des véhicules (tank, Apache, chasseur, AC-130 à 3 postes), munitions des avions, 2 avions par aérodrome |
| 55 niveaux RTS | Les armes des véhicules embellissent avec leurs améliorations : traînée, son, explosion, recul, éclair, détails du modèle (3 paliers) |
| 56 postes des robots | Poste de pilotage des petits robots : visière et bras avec l'arme de chaque robot, détails selon les améliorations |
| 57 graphismes | Style graphique (Pause, dt_style) : Actuel, Amélioré (textures, vraies ombres, éclat, couleurs), Haute définition ou Ultra sur le toit (`docs/graphismes.md`) |
| 58 graphismes HD | Style Haute définition : matériaux physiques, lumière HDR (`hdri/`), couleurs linéaires, ACES, SSAO, lampadaires de nuit qui éclairent (`lib/three-hd.js` chargé au besoin) |
| 59 décor HD | Haute définition : autos détaillées (roues, vitres, phares), fils électriques, débris dans la rue (autos marquées dans `03-scene` : `userData.auto`) |
| 60 zombies HD | Haute définition : zombies en matériaux physiques (crasse, sang, relief), sang au sol, flou de profondeur en visant |
| 61 ultra | Style Ultra (ordi seulement) : rue mouillée qui reflète (Reflector), rayons de soleil, ombres douces (VSM), ombres de contact pleines |
| 62 ressenti | Ressenti du tir sur le toit : coup de caméra et recul dosés par arme, sang et poussière aux impacts, marqueur tête et tué, sursaut et mort poussée des zombies, sons tête et tué, gel sur un gros coup ; réglage « Secousses » (dt_secousses). Seulement visuel et sonore |
| 63 monstres du toit | Hurleur, fouisseur, revenant : 3 monstres du toit avec chacun sa parade (`docs/conception.md`) |
| 64 crise | Moments de crise sur le toit : assauts annoncés (paquet serré puis creux, total de la vague inchangé), brèche (dernier souffle une fois par partie, rechargé par boss en infini), danger sous 30 % (bord rouge, barre qui clignote, cœur). Réglages : `CRISE` en haut du fichier ; mesure : `node outils/mesure-crise.js` |
| 65 Ruche RTS | But du RTS et danger qui monte : la Ruche (8 nids détruits la font sortir, la détruire libère la vallée), vallées (P.rtsVallee, P.rtsLib), sièges annoncés ; réglages dans `RTS_REGL` (`js/41-rts.js`) |
| 66 visée | Visée du toit : zoom selon l'optique (mires, point rouge, lunette ×4, lunette du sniper), cadre de lunette pour toute lunette ; réglages dans `VISEE` (`docs/conception.md`) |
| 90 branchements | Branche le registre `Jeu` sur le jeu commun ; toujours le dernier |

Les const, let et function de haut niveau sont partagés entre tous les fichiers (portée globale). Un fichier peut appeler une fonction d'un fichier plus loin **seulement à l'intérieur d'une fonction**, jamais au chargement. Chaque fichier commence par `'use strict';`.

## Travail à plusieurs dossiers (décidé avec Martin le 2026-11-13)
Martin parle à une seule conversation, le chef de chantier. Lui seul fusionne et met en ligne.
- Un seul chef de chantier à la fois. La nuit du 12 au 13 novembre 2026, deux conversations ont dirigé le chantier en même temps sans le savoir : un dossier (le feeling du tir) a été fait en double et jeté. Avant d'ouvrir un dossier : `git fetch`, puis lire « En cours » dans `TACHES.md` sur `origin/main`. Si un commit de main ne vient pas de toi, quelqu'un d'autre pousse : arrête-toi et dis-le à Martin avant de continuer.
- Si deux conversations doivent quand même pousser sur main : fusionner `origin/main` dans sa branche, relancer toute la suite, puis pousser en avance rapide seulement, jamais de push forcé ; chacun ajoute ses lignes dans `TACHES.md` sans réécrire celles de l'autre.
- Un dossier = un sous-agent sur Opus (`model: opus`), dans sa propre copie du dépôt (`isolation: worktree`). Trois dossiers à la fois au plus (4 processeurs, chaque agent lance les tests).
- Des dossiers qui touchent des fichiers différents : un par mode (toit, robot, RTS) va bien ; jamais deux dossiers sur le même mode en même temps.
- Les sous-agents ne touchent pas à `TACHES.md`, `docs/historique.md`, `index.html`, ni au numéro de version, et ne poussent rien. Ils rendent : ce qui est fait, les fichiers touchés, le résultat des tests, ce qui n'est pas vérifié.
- Chaque sous-agent sert le jeu sur son propre port (8766, 8767, 8768) : `python3 -m http.server 8766` dans sa copie, puis `node outils/lancer-tests.js http://localhost:8766/`.
- Le chef de chantier écrit la consigne (but, fichiers, ce qui est déjà écarté, comment vérifier), relit le résultat, fusionne un dossier à la fois, relance toute la suite, met `TACHES.md` et la fiche du mode à jour, puis met en ligne.
- Dossier flou (« trouve ce qui cloche ») : le chef de chantier fait d'abord le diagnostic lui-même avec le simulateur, puis délègue l'exécution.
- Pour juger un chiffre : `node outils/simulateur.js duel` (armes du toit) et les bancs décrits dans `docs/rts.md`, `docs/robot.md` et `docs/conception.md`. Les campagnes complètes varient trop d'une partie à l'autre.

## Règles
1. Touche d'abord les fichiers de ta tâche. Si tu dois en toucher un autre, garde le changement minimal et dis-le dans ton rapport.
2. Nouveau système = nouveau fichier `js/NN-nom.js`, ajouté au bon endroit dans `index.html`. Nouveau gros mode = une dizaine libre (50 à 59, puis 60 à 69...). Couper un fichier qui dépasse environ 700 lignes.
3. Un mode s'inscrit avec `Jeu.mode(...)` et écoute avec `Jeu.on(...)` (voir `docs/architecture.md`). Pas de nouveau crochet par réaffectation de `visuals`, `kill` ou `ambMusicState`.
4. Français partout dans l'interface et la documentation, sans tiret quadratin.
5. Sauvegarde : `store.get` / `store.set` (localStorage, avec try/catch). Le profil permanent est `P`, sauvé par `saveP()`. Ne casse pas les sauvegardes existantes : ajoute des champs avec une valeur par défaut.
6. Doit marcher sur cell (tactile, vertical et horizontal) et sur ordi (souris).
7. Un `try` qui protège un crochet finit par `catch (e) { errNote(e); }`, jamais `catch (e) {}` : l'erreur est gardée dans `JOURNAL` et le test `tests/t-journal.js` (chargé en dernier) échoue s'il en reste.
8. Vérifie la syntaxe : `cat js/*.js > /tmp/all.js && node --check /tmp/all.js`.
9. Tests : `tests/` (page en ligne /tests/, résultat dans window.RESULTATS). Ajoute des tests pour ce que tu bâtis, de façon défensive (typeof). Lance toute la suite avant de pousser : `python3 -m http.server 8765` puis `node outils/lancer-tests.js`.
10. Mise en ligne : seulement si Martin l'a autorisé dans la session (il le fait d'habitude). Avant le commit, `bash outils/version.sh` (sinon les navigateurs gardent les vieux fichiers). Puis push sur la branche de travail, puis sur main (GitHub Pages). Les tests roulent aussi sur GitHub (onglet Actions) : vérifie qu'ils sont verts. Ne lis pas et ne copie pas `.github-token`.
11. Chaque tâche faite est ajoutée en haut de la table « Fait » de `TACHES.md`, avec un numéro qui suit. Quand la table dépasse 10 lignes, déplace les plus vieilles dans `docs/historique.md`. Mets aussi à jour la fiche du mode touché (`docs/*.md`) si des chiffres ou des décisions changent.
12. Termine par un rapport court, en français simple : ce qui est fait, ce qui n'est pas vérifié.
