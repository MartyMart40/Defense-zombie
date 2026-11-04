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
| `TACHES.md` | En cours, à faire, à valider par Martin, dernières tâches faites |
| `docs/historique.md` | Toutes les tâches faites plus anciennes |
| `tests/LISEZMOI.md` | Comment marchent les tests |
| `docs/equilibrage.md` | Dernier rapport du simulateur d'équilibrage (`node outils/simulateur.js`) |

## Carte du code
- `index.html` : écrans, HUD, boutons et la liste des scripts, dans l'ordre. `css/style.css` : tout le style.
- `lib/three.min.js` : Three.js r128 (ne pas modifier ; secours sur cdnjs si absent).
- `manifest.webmanifest`, `sw.js`, `icones/` : application installable. `sw.js` sert la copie en cache seulement sans réseau.
- `outils/` : `lancer-tests.js` (toute la suite dans Chromium), `version.sh` (change les ?v= avant une mise en ligne), `simulateur.js` et `sim-bot.js` (simulateur d'équilibrage, rapport dans `docs/equilibrage.md`). `.github/workflows/tests.yml` lance les tests sur GitHub à chaque push.
- `js/NN-nom.js`, chargés dans l'ordre du numéro :

| Fichiers | Rôle |
|----------|------|
| 00 base | Outils (`$`, `store`, `fmt`, `rand`, `clamp`), journal des erreurs cachées (`errNote`, `JOURNAL`), registre des modes `Jeu` |
| 01 son | Sons et musique (`Snd`) |
| 02 villes | Les 5 villes (`LOCS`) |
| 03 scène | Scène, caméra, rendu, décor de la rue (`buildWorld`) |
| 04 arme en main | Modèles des armes tenues |
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
| 23 rue, 24 compagnon | Barils, caisses, civils, survivants tireurs ; compagnons |
| 25 défi, 26 combos, 28 infini, 30 missions | Défi du jour, combos, mode infini, succès et missions |
| 27 perf | Rendu des foules, images par seconde |
| 29 repères, 31 punch, 33 écritures | Repères sans son, ralenti et chiffres, textes à gauche |
| 32 sauvegarde | Sauvegarde dans un fichier |
| 37 bruitages, 38 vibrations | Sons placés, vibrations du cell |
| 39 à 40 | Mode robot (`docs/robot.md`) |
| 41 à 44 | Mode RTS (`docs/rts.md`) |
| 45 sauvegarde RTS | Partie RTS en cours gardée (dt_rts_partie), bouton « Continuer la guerre » |
| 46 application | Jeu installable (avec `manifest.webmanifest`, `sw.js`, `icones/`) : plein écran, marche sans réseau |
| 47 astuces RTS | Bulles d'astuces des premières parties RTS, une fois chacune (dt_rts_astuces) |
| 48 liste RTS | Choisir les unités une par une (rangée « Unités », Tab, double-clic) |
| 49 commandement RTS | Mini-carte, point de ralliement, alerte « Base attaquée », Tenir la position, mode photo |
| 50 sauvegarde robot | Course du robot gardée au début de chaque rue (dt_mech_partie), « Continuer le robot » |
| 51 succès des modes | Succès du robot et du RTS (ajoutés à ACH) |
| 90 branchements | Branche le registre `Jeu` sur le jeu commun ; toujours le dernier |

Les const, let et function de haut niveau sont partagés entre tous les fichiers (portée globale). Un fichier peut appeler une fonction d'un fichier plus loin **seulement à l'intérieur d'une fonction**, jamais au chargement. Chaque fichier commence par `'use strict';`.

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
