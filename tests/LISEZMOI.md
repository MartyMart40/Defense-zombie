# Tests automatiques de Dernier toit

- En ligne : ouvrir https://martymart40.github.io/Defense-zombie/tests/ ; les tests partent seuls, le total s'affiche en haut et le détail de chaque échec en dessous (résultat lisible par un outil dans `window.RESULTATS`, avec `fini: true` à la fin).
- Filtre : `?filtre=mot` ne lance que les tests dont le nom contient ce mot (ex. `tests/?filtre=atelier`, `?filtre=boutique`). Secours sans srcdoc : `?mode=ecrire`.
- Sauvegarde : les clés `dt_` du joueur sont mises de côté avant les tests (copie de secours sous `tests_secours_dt`) puis remises exactement à la fin, même en cas d'erreur ; si la page est fermée en plein test, la copie est remise à la prochaine ouverture.
- Les tests appellent directement les fonctions du jeu (`update(dt)`, `fire()`, etc.) via `iframe.contentWindow.eval`, sans attendre le temps réel ; les noms de l'atelier cherchés sont dans `CAND` en haut de la section Atelier de `tests.js`.
