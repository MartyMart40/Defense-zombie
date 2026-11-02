# Règles pour les agents qui travaillent sur Dernier toit

Lire ce fichier au complet avant de toucher au code.

## Le jeu
Jeu de tir défensif 3D en navigateur (Three.js r128 chargé depuis cdnjs). Concept et décisions : `docs/conception.md`. Suivi : `TACHES.md` (tenu par le coordonnateur, ne pas le modifier).

## Structure du code
- `index.html` : le HTML (écrans, HUD, boutons) et la liste des scripts, dans l'ordre.
- `css/style.css` : tout le style.
- `js/NN-nom.js` : scripts classiques (pas de modules), chargés dans l'ordre du numéro.
  Les `const`, `let` et `function` de haut niveau sont partagés entre tous les fichiers (portée globale).
  Conséquence : un fichier peut appeler une fonction d'un fichier plus loin **seulement à l'intérieur d'une fonction**, jamais au chargement.
- Chaque fichier commence par `'use strict';`.

## Règles
1. Ne touche qu'aux fichiers nommés dans ta tâche. Si tu dois en toucher un autre, garde le changement minimal et dis-le dans ton rapport.
2. Nouveau système = nouveau fichier `js/NN-nom.js`, ajouté au bon endroit dans `index.html`.
3. Français partout dans l'interface, sans tiret quadratin.
4. Sauvegarde : `store.get` / `store.set` (localStorage, avec try/catch). Le profil permanent est `P`, sauvé par `saveP()`. Ne casse pas les sauvegardes existantes : ajoute des champs avec une valeur par défaut.
5. Doit marcher sur cell (tactile, vertical et horizontal) et sur ordi (souris).
6. Vérifie la syntaxe : `cat js/*.js > /tmp/all.js && node --check /tmp/all.js`.
7. **Ne pousse jamais sur GitHub.** Ne lis pas et ne copie pas `.github-token`. Le coordonnateur pousse et teste en ligne.
8. Tests : `tests/` (page en ligne /tests/, résultat dans window.RESULTATS). Ajoute des tests pour ce que tu bâtis, de façon défensive (typeof).
9. Termine par un rapport court : fichiers touchés, ce qui marche, ce qui n'est pas vérifié.
