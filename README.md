# Défense Zombie 3D

Jeu de tir à la première personne dans le navigateur. Le joueur est stationnaire, des hordes de zombies approchent et il mitraille le plus longtemps possible, avec des évolutions entre les vagues.

## Jouer

Ouvrir `index.html` dans Chrome ou Edge. Cliquer dans la fenêtre pour verrouiller la souris.

- Souris : viser
- Clic gauche : tirer
- Échap : libérer la souris

## Technique

- Three.js (chargé depuis un CDN, aucune installation)
- JavaScript simple, un fichier par système dans `src/`

## Structure

```
index.html            écrans et liste des scripts
css/style.css         style
js/NN-nom.js          code, un fichier par système, chargés dans l'ordre
docs/conception.md    conception du jeu
TACHES.md             suivi des tâches
AGENTS.md             règles pour les agents
archives/             anciennes versions
outils/pousser.sh     mise en ligne sur GitHub
```
