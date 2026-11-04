#!/bin/bash
# Change le numéro de version (?v=...) des scripts et du style dans les pages HTML,
# pour que les navigateurs rechargent les fichiers modifiés au lieu de garder une vieille copie.
# À lancer juste avant chaque commit qui part en ligne : bash outils/version.sh
set -e
D="$(cd "$(dirname "$0")/.." && pwd)"
V="$(date +%Y%m%d%H%M%S)"
for f in "$D/index.html" "$D"/tests/*.html; do
  [ -f "$f" ] && sed -i -E "s#(src|href)=\"([A-Za-z0-9_./-]+\.(js|css))(\?v=[0-9]+)?\"#\1=\"\2?v=$V\"#g" "$f"
done
echo "Version : $V"
