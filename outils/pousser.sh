#!/bin/bash
# Pousse le contenu du dossier du jeu vers GitHub (utilisé par Claude).
# Usage : bash outils/pousser.sh "message du commit"
set -e
D="$(cd "$(dirname "$0")/.." && pwd)"
T="$(cat "$D/.github-token")"
MSG="${1:-Mise à jour}"
W="$(mktemp -d)"
git clone -q "https://x-access-token:$T@github.com/MartyMart40/Defense-zombie.git" "$W/repo"
cd "$W/repo"
git config user.name "MartyMart40"
git config user.email "346562037+MartyMart40@users.noreply.github.com"
# Remplace le contenu par celui du dossier local (sauf la clé et .git)
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
tar -C "$D" --exclude=.git --exclude=.github-token -cf - . | tar -xf -
git add -A
if git diff --cached --quiet; then echo "Rien à pousser."; exit 0; fi
# Numéro de version sur les scripts pour forcer les navigateurs à recharger
V="$(date +%Y%m%d%H%M%S)"
for f in $(git ls-files -m -o --exclude-standard '*.html'; git ls-files '*.html'); do [ -f "$f" ] && sed -i -E "s#((js|css|src)/[A-Za-z0-9_-]+\.(js|css))(\?v=[0-9]+)?\"#\1?v=$V\"#g" "$f"; done
git add -A
git commit -q -m "$MSG"
git push -q origin main
git log --oneline -1
rm -rf "$W"
