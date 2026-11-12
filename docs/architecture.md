# Architecture du code : Dernier toit

À lire avant d'ajouter un gros morceau (nouveau mode, nouveau système). Les règles courtes sont dans `AGENTS.md`.

## Principe
- Pas de compilation : `index.html` charge `lib/three.min.js` (Three.js r128) puis les fichiers `js/NN-nom.js` dans l'ordre du numéro. GitHub Pages sert le dépôt tel quel.
- Scripts classiques (pas de modules) : les `const`, `let` et `function` de haut niveau sont partagés par tous les fichiers.
- Un fichier ne peut appeler une fonction d'un fichier **plus loin** qu'à l'intérieur d'une fonction (jamais au chargement).
- Une seule boucle (`js/15-boucle.js`) : `update(dt)` seulement quand `state === 'playing'` (le toit), puis `visuals(dt)` et le rendu, à chaque image.
- La variable `state` dit où on est : `'title'`, `'playing'`, `'paused'`, `'shop'`, `'over'`, `'mech'`, `'mechover'`, `'rts'`, `'rtsover'`, etc.

## Plages de numéros
| Plage | Contenu |
|-------|---------|
| 00 à 15 | Base du jeu : outils, son, villes, scène, arme en main, zombies, tir, vagues, boutique, HUD, entrées, menus, boucle |
| 16 à 38 | Systèmes du toit : atelier, défenses, types de zombies, boss, armes, pouvoirs, ambiance, rue, compagnons, défi, combos, perf, infini, repères, missions, punch, sauvegarde, écritures, arsenal, monstres, rendu, bruitages, vibrations |
| 39 à 40 | Mode robot |
| 41 à 44 | Mode RTS « Guerre des robots » |
| 45 à 49 | Petits ajouts : 45 sauvegarde de la partie RTS, 46 application installable, 47 astuces du RTS, 48 liste des unités du RTS, 49 commandement du RTS (plage pleine) |
| 50 à 59 | Ajouts généraux : 50 sauvegarde du robot, 51 succès du robot et du RTS, 52 statistiques à vie, 53 tutoriel du toit, 54 postes de pilotage du RTS, 55 niveaux visuels des armes du RTS, 56 postes des petits robots, 57 style graphique ; 58 et 59 libres |
| 60 à 89 | Prochains gros modes (une dizaine chacun) |
| 90 | `90-branchements.js` : branche le registre des modes sur le jeu commun. Toujours le dernier. |

Un fichier coupé garde son numéro : `04-arme-en-main`, `04-arme-modeles`, `04-arme-anim` se chargent dans l'ordre de `index.html` (c'est cet ordre qui compte, pas l'ordre alphabétique).

Un gros ajout prend sa propre dizaine, même s'il n'a besoin que de 2 ou 3 fichiers au départ : il pourra grandir sans renuméroter. Un fichier ne doit pas dépasser environ 700 lignes : au-delà, le couper par thème (comme le RTS : données, unités, pilotage, interface).

## Registre des modes (`Jeu`, dans `js/00-base.js`)
Un mode de jeu s'inscrit au lieu de remplacer `visuals`, `kill` ou `ambMusicState` lui-même :

```js
Jeu.mode('nom', {
  etats: { jeu:'xjeu', fin:'xfin' },       // valeurs de state pendant la partie et à l'écran de fin
  actif: () => X.on || state === 'xjeu' || state === 'xfin',
  etape: dt => xStep(dt),    // logique, à chaque image quand state === etats.jeu, AVANT le rendu commun
  image: dt => xFrame(dt),   // caméra, effets, interface, quand le mode est actif, APRÈS le rendu commun
  tue: (z, etaitVivant) => { ... },   // un zombie vient d'être tué
  musique: () => 'wave',     // 'menu', 'wave' ou 'boss', ou undefined pour laisser le jeu choisir
  demarrer: () => xStart(), quitter: () => xQuit()
});
```

- Un seul mode est actif à la fois (`Jeu.actif()`). Sur le toit, aucun mode n'est actif.
- Événements communs, pour n'importe quel fichier : `Jeu.on('image', fn)` (chaque image, `fn(dt)`), `Jeu.on('tue', fn)` (`fn(z, etaitVivant)`), `Jeu.on('monde', fn)` (`fn(L)`, une rue du toit vient d'être bâtie par `buildWorld`). `Jeu.off` retire un écouteur. Une erreur dans un écouteur est affichée dans la console sans casser les autres.
- Le branchement est fait **une seule fois** dans `js/90-branchements.js`. Pour un nouvel événement (ex. « nouvelle partie »), l'ajouter là avec `Jeu.emit('nom', ...)` et le documenter ici.
- Inscrits aujourd'hui : `robot` (`js/39-robot.js`) et `rts` (`js/44-rts-interface.js`).
- Tests : `tests/t-modes.js` ; accès dans le jeu par `window.__jeu`.

## Les anciens crochets (toit)
Les fichiers 04 à 38 se branchent encore par **réaffectation** : `const _b = visuals; visuals = function(dt){ const r = _b.apply(this, arguments); monTruc(dt); return r; };`. Chaque fichier enveloppe la version précédente. Ça marche et c'est couvert par les tests, mais :
- l'ordre dépend du numéro des fichiers ;
- une erreur dans un `try { } catch (e) {}` passe en silence ;
- chaque enveloppe tourne à chaque image, même hors du toit.

Les `catch (e) {}` sont devenus `catch (e) { errNote(e); }` (tâche 70) : une erreur de programmation n'est plus avalée en silence, elle va dans `JOURNAL` (`js/00-base.js`) et `tests/t-journal.js` la signale.

Règle : **pas de nouveau crochet par réaffectation pour un mode**. Utiliser `Jeu.mode` et `Jeu.on`. Déjà convertis à `Jeu.on('image')` : repères (29), rendu (36), bruitages (37). On convertit les autres petit à petit, quand on touche le fichier, avec les tests comme filet. Les crochets qui changent un calcul (ex. le robot qui multiplie `damage`, ou `hitBarricade`) restent des réaffectations pour l'instant.

## Ajouter un nouveau mode : liste à suivre
1. Choisir une dizaine libre (ex. 60 à 69) et créer `js/50-nom.js` (données, modèles), puis d'autres fichiers au besoin.
2. Un objet d'état propre au mode (ex. `const TOUR = { on:false, ... }`) et des noms préfixés (`tourStart`, `tourStep`...) pour éviter les collisions entre fichiers.
3. Nouvelles valeurs de `state` pour la partie et la fin.
4. `Jeu.mode('nom', {...})` à la fin du dernier fichier du mode.
5. Bouton sur l'écran titre, inséré après `btnRts` (voir la fin de `js/44-rts-interface.js`).
6. Sauvegarde : un champ dans `P` avec une valeur par défaut (voir `js/39-robot.js`, `P.mech`), ou `store` avec une clé `dt_...` pour un simple réglage.
7. `window.__nom = { ... }` pour les tests, un fichier `tests/t-nom.js`, ajouté dans `tests/index.html`.
8. Une fiche `docs/nom.md` (modèle : `docs/rts.md`) et une ligne dans la carte du code de `AGENTS.md`.

## Application installable et cache
- `manifest.webmanifest` (nom, icônes de `icones/`, plein écran) et `sw.js` (service worker), enregistré par `js/46-application.js`.
- `sw.js` va au réseau d'abord et garde une copie de chaque fichier ; sans réseau, il sert la copie (en ignorant le `?v=`). La page de tests passe toujours par le réseau. Changer `CACHE` dans `sw.js` jette toutes les vieilles copies.
- Les `?v=...` dans `index.html` forcent les navigateurs à recharger : `bash outils/version.sh` avant chaque mise en ligne.

## Sauvegardes
- Profil permanent `P` (`dt_prof`), réglages `dt_...` : `store.get` / `store.set`. Toutes les clés `dt_` partent dans le fichier de sauvegarde OneDrive (`js/32-sauvegarde.js`).
- Statistiques à vie : `P.vie = { temps:{ toit, robot, rts }, armes:{ id:n } }` (`js/52-statistiques.js`).
- Course du robot : `dt_mech_partie` (`js/50-robot-sauvegarde.js`).
- Partie RTS en cours : `dt_rts_partie` (`js/45-rts-sauvegarde.js`), avec un numéro de version `v`. Changer le format : monter `RTS_SAVE_V` et accepter l'ancien, ou l'ignorer (une sauvegarde illisible est ignorée sans erreur).

## Simulateur d'équilibrage
- `outils/sim-bot.js` : un robot-joueur injecté dans la vraie page du jeu (jamais chargé par `index.html`). Il arrête la boucle du jeu et fait avancer le temps lui-même, sans rendu, donc très vite.
- `outils/simulateur.js` : le fait jouer et écrit `docs/equilibrage.md` (et `docs/equilibrage.json`). `python3 -m http.server 8765`, puis `node outils/simulateur.js [tout|toit|infini|rts] [moyen,bon] [graine] [patient|boutique|pistolet]`. Environ 5 minutes pour tout.
- Pour juger une arme ou un prix : `node outils/simulateur.js duel` (environ 5 minutes). Le duel à budget égal compare, à une vague donnée et avec le même argent, « acheter l'arme » et « améliorer celle qu'on a ». Les campagnes complètes varient trop d'une partie à l'autre pour ça. Situations mesurées : `DUELS` dans `outils/simulateur.js`.
- Joueurs : `debutant`, `moyen`, `bon`, `parfait` (erreur de visée tirée à chaque coup, part de tirs à la tête, temps pour changer de cible). Il vise toujours la tête d'un boss.
- Les résultats varient un peu d'un lancement à l'autre (le hasard est fixé, mais pas tout le minutage) : comparer plusieurs lancements avant de conclure.
- Après un changement de chiffres (vie, dégâts, prix), relancer et comparer avec le rapport d'avant (git garde les anciens).

## Tests
- `tests/index.html` charge le jeu dans un iframe et lance tous les `tests/t-*.js`. Résultat dans `window.RESULTATS`.
- `__t.graine(n, fn)` fixe le hasard pour un test qui en dépend.
- Pour les lancer sans téléphone : `python3 -m http.server 8765` puis `node outils/lancer-tests.js` (Chromium avec Playwright). Code de sortie 1 si un test échoue.
- Sur GitHub : `.github/workflows/tests.yml` lance la même chose à chaque push ; résultat dans l'onglet Actions du dépôt.
