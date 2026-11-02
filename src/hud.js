// Affichage tête haute : vie, vague, zombies tués.
Jeu.hud = (function () {
  const el = document.getElementById('hud');
  function maj() {
    const j = Jeu.joueur.etat, z = Jeu.zombies.etat;
    el.textContent = `Vie ${j.vie}  |  Vague ${z.vague}  |  Tués ${z.tues}`;
  }
  return { maj };
})();
