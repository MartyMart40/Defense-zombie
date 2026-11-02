// Affichage tête haute : barre de vie, vague, zombies tués, zombies restants.
Jeu.hud = (function () {
  const el = document.getElementById('hud');
  function maj() {
    const j = Jeu.joueur.etat, z = Jeu.zombies.etat;
    const restants = z.restantsAApparaitre + Jeu.zombies.cibles().length;
    el.innerHTML =
      `<div class="barre"><div style="width:${(j.vie / j.vieMax) * 100}%"></div></div>` +
      `Vie ${j.vie} &nbsp;·&nbsp; Vague ${z.vague} &nbsp;·&nbsp; Tués ${z.tues} &nbsp;·&nbsp; Restants ${restants}`;
  }
  return { maj };
})();
