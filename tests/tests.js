'use strict';
/* =====================================================================
   Tests automatiques de Dernier toit
   - Charge ../index.html dans un iframe (même site), puis appelle les
     fonctions du jeu directement (update(dt) en boucle, etc.).
   - Les variables du jeu sont des const/let de haut niveau : on y accède
     avec iframe.contentWindow.eval(...). Les fonctions passées à J() sont
     converties en texte et exécutées DANS le jeu : elles peuvent donc
     utiliser S, P, state, update, zombies...
   - La sauvegarde du joueur (clés dt_*) est mise de côté et remise à la fin.
   - Résultat lisible par un outil : window.RESULTATS
   ===================================================================== */

const PREFIXE = 'dt_';
const CLE_SECOURS = 'tests_secours_dt'; // copie de la sauvegarde si la page est fermée en plein test
const DELAI_CHARGEMENT = 25000;  // ms
const DELAI_TEST = 15000;        // ms, pour les tests asynchrones

window.RESULTATS = { total: 0, reussis: 0, echecs: [], ignores: [], fini: false };

const params = new URLSearchParams(location.search);
const FILTRE = (params.get('filtre') || '').trim().toLowerCase();

let cadre = document.getElementById('cadre');
// ?mode=ecrire : charge le jeu par document.write au lieu de srcdoc
const MODE_ECRIRE = params.get('mode') === 'ecrire' || !('srcdoc' in document.createElement('iframe'));
const liste = document.getElementById('liste');
const elTotal = document.getElementById('total');
const elEtat = document.getElementById('etat');
document.getElementById('btnRelancer').addEventListener('click', () => location.reload());

function etat(t){ elEtat.textContent = t; }

/* ---------------- Sauvegarde du joueur ---------------- */
let sauvegarde = null; // { cle: valeur brute }
let restauree = false;

function lireClesDt(){
  const o = {};
  for (let i = 0; i < localStorage.length; i++){
    const k = localStorage.key(i);
    if (k && k.indexOf(PREFIXE) === 0) o[k] = localStorage.getItem(k);
  }
  return o;
}
function ecrireClesDt(o){
  Object.keys(lireClesDt()).forEach(k => localStorage.removeItem(k));
  Object.keys(o).forEach(k => localStorage.setItem(k, o[k]));
}
function mettreDeCote(){
  // Une exécution précédente a été interrompue : on remet d'abord sa copie.
  const vieille = localStorage.getItem(CLE_SECOURS);
  if (vieille){
    try { ecrireClesDt(JSON.parse(vieille)); } catch (e) {}
    localStorage.removeItem(CLE_SECOURS);
  }
  sauvegarde = lireClesDt();
  localStorage.setItem(CLE_SECOURS, JSON.stringify(sauvegarde));
  Object.keys(sauvegarde).forEach(k => localStorage.removeItem(k));
}
function restaurer(){
  if (restauree || !sauvegarde) return;
  try {
    ecrireClesDt(sauvegarde);
    const verif = lireClesDt();
    const pareil = Object.keys(sauvegarde).length === Object.keys(verif).length && Object.keys(sauvegarde).every(k => verif[k] === sauvegarde[k]);
    if (pareil){ localStorage.removeItem(CLE_SECOURS); restauree = true; }
  } catch (e) {
    console.error('Restauration impossible', e);
  }
}
addEventListener('pagehide', () => { arreterJeu(); restaurer(); });
addEventListener('beforeunload', () => { arreterJeu(); restaurer(); });

/* ---------------- Outils de test ---------------- */
class Echec extends Error {}
class Ignore extends Error {}
function ok(cond, msg){ if (!cond) throw new Echec(msg); }
function egal(obtenu, attendu, msg){
  if (obtenu !== attendu) throw new Echec(msg + ' : attendu ' + JSON.stringify(attendu) + ', obtenu ' + JSON.stringify(obtenu));
}
function ignorer(raison){ throw new Ignore(raison); }

let win = null; // fenêtre du jeu

// Exécute une fonction (ou un texte) dans le jeu.
function J(fn){
  if (!win) throw new Echec('Le jeu n’est pas chargé');
  const args = Array.prototype.slice.call(arguments, 1);
  if (typeof fn === 'string') return win.eval(fn);
  return win.eval('(' + fn.toString() + ')').apply(null, args);
}
// Lit une expression du jeu, undefined si elle n'existe pas.
function lire(expr){ try { return J(expr); } catch (e) { return undefined; } }

function arreterJeu(){
  try { if (win) win.eval('state = "test"; firing = false;'); } catch (e) {}
}

/* ---------------- Chargement du jeu ---------------- */
// On lit ../index.html, on ajoute un capteur d'erreurs tout en haut et une
// balise <base> pour que les chemins relatifs marchent, puis on le met dans
// l'iframe (srcdoc garde le même site, donc le même localStorage).
let erreursAnciennes = []; // erreurs des chargements précédents (rechargement du test Sauvegarde)
async function chargerJeu(){
  if (win){
    try { erreursAnciennes = erreursAnciennes.concat(win.__erreurs || []); } catch (e) {}
  }
  win = null;
  const urlJeu = new URL('../', location.href).href;
  const rep = await fetch(urlJeu + 'index.html?t=' + Date.now(), { cache: 'no-store' });
  if (!rep.ok) throw new Echec('Lecture de ../index.html impossible (HTTP ' + rep.status + ')');
  let html = await rep.text();
  const v = Date.now();
  // Évite les vieux fichiers en cache après une mise en ligne
  html = html.replace(/(src|href)="((?:js|css)\/[^"?]+)"/g, (m, a, p) => a + '="' + p + '?v=' + v + '"');
  const capteur = '<base href="' + urlJeu + '">'
    + '<script>window.__erreurs=[];'
    + 'window.addEventListener("error",function(e){var t=e.target;'
    + 'if(t&&t!==window&&(t.src||t.href)){window.__erreurs.push("Fichier introuvable : "+(t.src||t.href));return;}'
    + 'window.__erreurs.push((e.message||"Erreur")+" ("+String(e.filename||"").split("/").pop()+":"+(e.lineno||0)+")");},true);'
    + 'window.addEventListener("unhandledrejection",function(e){window.__erreurs.push("Promesse rejetée : "+(e.reason&&e.reason.message||e.reason));});'
    + '<\/script>';
  html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + capteur) : capteur + html;

  // Nouvel iframe à chaque chargement : nouvelle fenêtre, donc les const/let du jeu repartent à neuf
  const neuf = document.createElement('iframe');
  neuf.id = 'cadre'; neuf.title = 'Jeu sous test';
  cadre.replaceWith(neuf); cadre = neuf;

  await new Promise((resolve, reject) => {
    const fin = Date.now() + DELAI_CHARGEMENT;
    if (MODE_ECRIRE){
      // Secours (navigateurs ou outils sans srcdoc) : écriture directe dans l'iframe vide
      const d = cadre.contentWindow.document; d.open(); d.write(html); d.close();
    } else {
      cadre.srcdoc = html;
    }
    (function attendre(){
      let w = null;
      try { w = cadre.contentWindow; } catch (e) {}
      let pret = false;
      try {
        pret = !!w && w.document.readyState === 'complete' && Array.isArray(w.__erreurs)
          && w.eval('typeof update === "function" && typeof startLocation === "function" && typeof S !== "undefined" && typeof P === "object"');
      } catch (e) { pret = false; }
      if (pret){ win = w; resolve(); return; }
      if (Date.now() > fin){
        let errs = [];
        let diag = '';
        try {
          errs = (w && w.__erreurs) || [];
          diag = '\nÉtat : document ' + (w ? w.document.readyState : 'absent') + ', capteur ' + (w && w.__erreurs ? 'installé' : 'absent')
            + ', ' + ['THREE', 'update', 'startLocation', 'S', 'P'].map(n => n + ' ' + (w ? w.eval('typeof ' + n) : '?')).join(', ');
        } catch (e) { diag = '\nÉtat illisible : ' + e.message; }
        reject(new Echec('Le jeu n’est pas prêt après ' + (DELAI_CHARGEMENT / 1000) + ' s.' + diag + (errs.length ? '\nErreurs : ' + errs.join('\n') : '')));
        return;
      }
      setTimeout(attendre, 100);
    })();
  });
  J(outilsJeu);
}

/* ---------------- Outils installés DANS le jeu ---------------- */
// Cette fonction est convertie en texte et exécutée dans l'iframe.
function outilsJeu(){
  // Pas de verrouillage de la souris ni de son pendant les tests
  try { canvas.requestPointerLock = function(){}; } catch (e) {}
  Snd.on = false; if (Snd.master) Snd.master.gain.value = 0;
  var o = {};
  // Remet un profil propre et arrête toute partie
  o.reset = function(defauts, profil){
    state = 'test'; firing = false; zoomed = false; reloadT = 0;
    try { clearZombies(); } catch (e) {}
    // Pas de partie RTS sauvée d'un test à l'autre (le bouton Guerre des robots demanderait une confirmation)
    try { localStorage.removeItem('dt_rts_partie'); if (typeof rtsSaveBtn === 'function') rtsSaveBtn(); } catch (e) {}
    Object.keys(P).forEach(function(k){ delete P[k]; });
    Object.assign(P, JSON.parse(JSON.stringify(defauts)), profil || {});
    saveP();
    Snd.on = false; if (Snd.master) Snd.master.gain.value = 0;
  };
  // Fait avancer le jeu de "sec" secondes, par pas de dt, tant que state === 'playing'
  o.sim = function(sec, dt, arret){
    dt = dt || 1 / 30;
    var n = Math.ceil(sec / dt), i = 0, max = 0;
    while (i < n && state === 'playing'){
      update(dt); i++;
      var v = 0; for (var k = 0; k < zombies.length; k++) if (!zombies[k].dead) v++;
      if (v > max) max = v;
      if (arret && arret()) break;
    }
    return { pas: i, temps: i * dt, maxVivants: max };
  };
  // Empêche les apparitions et la fin de vague
  o.geler = function(){ plan.queue = ['walker']; spawnT = 1e9; };
  // Fait apparaître un zombie à une position précise
  o.placer = function(type, x, zPos){
    spawnZombie(type || 'walker');
    var z = zombies[zombies.length - 1];
    z.g.position.set(x || 0, 0, zPos);
    z.g.updateMatrixWorld(true);
    return z;
  };
  // Pointe la caméra sur le torse ou la tête d'un zombie
  o.viser = function(z, tete){
    z.g.updateMatrixWorld(true);
    var cible = new THREE.Vector3();
    (tete ? z.head : z.meshes[0]).getWorldPosition(cible);
    camera.position.copy(EYE);
    camera.lookAt(cible);
    camera.updateMatrixWorld(true);
    zoomed = false; recoilAcc = 0;
  };
  o.visible = function(id){ var el = document.getElementById(id); return !!el && !el.classList.contains('hide') && !el.closest('.hide'); };
  o.vivants = function(){ return zombies.filter(function(z){ return !z.dead; }).length; };
  // Lance fn avec un hasard fixé (même suite de nombres à chaque fois), puis remet le vrai hasard.
  // Sert aux tests qui dépendent du hasard (précision, dispersion) pour qu'ils donnent toujours le même résultat.
  o.graine = function(n, fn){
    var R0 = Math.random, s = (n || 1) % 2147483647; if (s <= 0) s += 2147483646;
    Math.random = function(){ s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
    try { return fn(); } finally { Math.random = R0; }
  };
  window.__t = o;
}

let defautsP = null; // profil par défaut lu au premier chargement (sans sauvegarde)
function reset(profil){ J(function(d, p){ __t.reset(d, p); }, defautsP, profil || null); }

/* ---------------- Atelier (détection défensive) ---------------- */
// Noms possibles, à ajuster quand l'atelier sera bâti.
const CAND = {
  ferraille: ['P.ferraille', 'P.scrap', 'P.ferr', 'P.ferrailles', 'ferraille', 'scrap'],
  defs: ['DEFENSES', 'DEFS', 'DEF_TYPES', 'TOURELLES', 'ATELIER_DEFS', 'DEFENCES'],
  acheter: ['defBuy', 'acheterDefense', 'buyDefense', 'placerDefense', 'placeDefense', 'atelierAcheter', 'buyDef', 'acheterDef'],
  vendre: ['defSell', 'vendreDefense', 'sellDefense', 'atelierVendre', 'sellDef', 'vendreDef', 'retirerDefense']
};
function trouver(liste, type){
  for (const e of liste){ const v = lire('typeof ' + e + ' === "undefined" ? undefined : ' + e); if (v !== undefined && (!type || typeof v === type)) return e; }
  return null;
}
function detecterAtelier(){
  const a = { ferraille: trouver(CAND.ferraille, 'number'), defs: trouver(CAND.defs, 'object'), acheter: trouver(CAND.acheter, 'function'), vendre: trouver(CAND.vendre, 'function') };
  a.manque = Object.keys(a).filter(k => k !== 'manque' && !a[k]);
  return a;
}
const ferr = a => lire(a.ferraille);
const setFerr = (a, n) => J(a.ferraille + ' = ' + Number(n));
// Défense la moins chère : { cle, prix }
function moinsChere(a){
  return J(function(nom){
    var D = (0, eval)(nom), best = null;
    var prixDe = function(d){ return d ? (d.price != null ? d.price : d.prix != null ? d.prix : d.cost != null ? d.cost : d.cout) : undefined; };
    var ent = Array.isArray(D) ? D.map(function(d, i){ return [d.id != null ? d.id : i, d]; }) : Object.keys(D).map(function(k){ return [k, D[k]]; });
    ent.forEach(function(e){ var p = prixDe(e[1]); if (typeof p === 'number' && (!best || p < best.prix)) best = { cle: e[0], prix: p }; });
    return best;
  }, a.defs);
}
// Devine les arguments d'après le nom des paramètres : type de défense et emplacement 0
function argsPour(fnNom, cle){
  const src = String(lire(fnNom));
  const m = src.match(/^[^(]*\(([^)]*)\)/);
  const noms = m ? m[1].split(',').map(s => s.trim().split('=')[0].trim()).filter(Boolean) : [];
  if (!noms.length) return [[cle, 0], [0, cle]];
  const args = noms.map(n => /type|id|kind|def|nom|key|^k$|^t$/i.test(n) ? cle : /slot|emp|place|idx|index|pos|^i$|^n$|^s$/i.test(n) ? 0 : undefined);
  if (args.every(x => x !== undefined)) return [args];
  return [[cle, 0], [0, cle]];
}
function appeler(fnNom, args){ return J(function(nom, a){ return (0, eval)(nom).apply(null, a); }, fnNom, args); }
function preparerAtelier(){
  const a = detecterAtelier();
  if (!a.ferraille) ignorer('Atelier absent : aucune ferraille trouvée (cherché : ' + CAND.ferraille.join(', ') + ')');
  return a;
}
function acheterUne(a, d){
  const essais = argsPour(a.acheter, d.cle);
  for (const args of essais){
    const avant = ferr(a);
    try { appeler(a.acheter, args); } catch (e) { continue; }
    if (ferr(a) !== avant) return { args, avant, apres: ferr(a) };
  }
  return { args: essais[0], avant: ferr(a), apres: ferr(a), rate: true };
}

/* ---------------- Les tests ---------------- */
const TESTS = [];
const test = (nom, fn) => TESTS.push({ nom, fn });
let erreursAuChargement = [];

test('Chargement : le jeu se charge sans erreur JavaScript', () => {
  ok(win, 'Le jeu n’a pas pu être chargé');
  egal(erreursAuChargement.length, 0, 'Erreurs au chargement : ' + erreursAuChargement.join(' | ') + '\nNombre');
  ok(J('typeof THREE') === 'object', 'Three.js n’est pas chargé');
});

test('Campagne : sans sauvegarde, « Jouer : Saint-Clou » lance la ville 0', () => {
  // Le texte du bouton est calculé au chargement, qui s'est fait sans sauvegarde
  egal(J("$('btnStart').textContent.trim()"), 'Jouer : Saint-Clou', 'Texte du bouton titre');
  reset();
  egal(J('campaignIdx()'), 0, 'campaignIdx() sans victoire');
  J("$('btnStart').click()");
  egal(J('LOCS.indexOf(curLoc)'), 0, 'Ville lancée');
  egal(J('curLoc.name'), 'Saint-Clou', 'Nom de la ville');
  egal(J('state'), 'playing', 'État après le clic (Saint-Clou n’a pas d’argent de départ)');
  egal(J('S.wave'), 1, 'Vague en cours');
});

test('Campagne : campaignIdx() avance quand une ville est gagnée', () => {
  reset();
  egal(J('campaignIdx()'), 0, 'Départ');
  J("P.wins[LOCS[0].id] = 1"); egal(J('campaignIdx()'), 1, 'Après Saint-Clou');
  J("P.wins[LOCS[1].id] = 1"); egal(J('campaignIdx()'), 2, 'Après Val-des-Cendres');
  J("LOCS.forEach(function(L){ P.wins[L.id] = 1; })");
  egal(J('campaignIdx()'), J('LOCS.length - 1'), 'Toutes gagnées : reste sur la dernière');
});

test('Vagues : Saint-Clou vague 1 = 30 zombies, vague 2 = 60', () => {
  egal(J('wavePlan(1, LOCS[0]).total'), 30, 'Vague 1');
  egal(J('wavePlan(2, LOCS[0]).total'), 60, 'Vague 2');
  egal(J('wavePlan(3, LOCS[0]).total'), 90, 'Vague 3');
  egal(J('wavePlan(1, LOCS[0]).queue.length'), 30, 'Longueur de la file de la vague 1');
});

test('Vagues : chaque ville suivante a +15 % de zombies', () => {
  const n = J('LOCS.length');
  const tot = []; for (let i = 0; i < n; i++) tot.push(J('wavePlan(1, LOCS[' + i + ']).total'));
  for (let i = 0; i < n; i++){
    const attendu = Math.round(30 * (1 + .15 * i));
    egal(tot[i], attendu, 'Vague 1 de la ville ' + i + ' (30 × ' + (1 + .15 * i).toFixed(2) + ')');
    if (i) ok(tot[i] > tot[i - 1], 'La ville ' + i + ' devrait avoir plus de zombies que la ville ' + (i - 1));
  }
  egal(J('wavePlan(2, LOCS[1]).total'), Math.round(60 * 1.15), 'Vague 2 de Val-des-Cendres');
});

test('Vagues : le choix du nombre de zombies n’existe plus', () => {
  const vis = J(function(){ var el = document.getElementById('intVal'); return !!el && el.offsetParent !== null && !el.closest('.hide'); });
  ok(!vis, 'Un élément #intVal est visible');
  egal(J('INT()'), 1, 'INT() doit valoir 1');
});

test('Apparition : des zombies apparaissent et la file diminue', () => {
  reset(); J('startLocation(0)');
  egal(J('state'), 'playing', 'État au début de la vague 1');
  const file0 = J('plan.queue.length');
  egal(file0, 30, 'File au départ');
  const r = J(function(){ return __t.sim(12); });
  const vivants = J('__t.vivants()'), file = J('plan.queue.length');
  ok(vivants > 0, 'Aucun zombie vivant après ' + r.temps.toFixed(1) + ' s');
  ok(file < file0, 'La file n’a pas diminué (' + file + ')');
  egal(J('zombies.length') + file, file0, 'Zombies en jeu + file');
  ok(r.maxVivants <= J('plan.maxAlive'), 'Plus de zombies que maxAlive : ' + r.maxVivants);
});

test('Apparition : jamais plus que plan.maxAlive en vie', () => {
  reset(); J('startLocation(0)');
  const r = J(function(){ plan.maxAlive = 4; plan.interval = .05; spawnT = 0; return __t.sim(20); });
  egal(r.maxVivants, 4, 'Maximum de zombies vivants en même temps (limite forcée à 4)');
  ok(J('plan.queue.length') > 0, 'La file devrait attendre');
});

test('Tir : un zombie visé perd de la vie puis meurt, argent, abattus et XP montent', () => {
  reset(); J('startLocation(0)'); J('__t.geler()');
  const r = J(function(){
    clearZombies();
    var z = __t.placer('walker', 0, -20);
    __t.viser(z, false);
    var av = { hp: z.hp, money: S.money, kills: S.kills, xp: S.xpGained, ammo: S.ammo[S.cur] };
    fire();
    var hp1 = z.hp, coups = 1;
    while (!z.dead && coups < 12){ __t.viser(z, false); fire(); coups++; }
    return { av: av, hp1: hp1, mort: !!z.dead, coups: coups, money: S.money, kills: S.kills, xp: S.xpGained, ammo: S.ammo[S.cur] };
  });
  ok(r.hp1 < r.av.hp, 'Le zombie n’a pas perdu de vie au premier tir (vie ' + r.av.hp + ' puis ' + r.hp1 + ')');
  ok(r.mort, 'Le zombie n’est pas mort après ' + r.coups + ' tirs');
  egal(r.kills, r.av.kills + 1, 'Abattus');
  ok(r.money > r.av.money, 'L’argent n’a pas monté (' + r.av.money + ' puis ' + r.money + ')');
  ok(r.xp > r.av.xp, 'L’XP de la partie n’a pas monté');
  egal(r.ammo, r.av.ammo - r.coups, 'Munitions après ' + r.coups + ' tirs');
});

test('Tir : un tir à la tête rapporte plus', () => {
  reset(); J('startLocation(0)'); J('__t.geler()');
  const r = J(function(){
    clearZombies();
    var a = __t.placer('walker', 0, -20); __t.viser(a, false);
    var m0 = S.money, n = 0; while (!a.dead && n < 12){ __t.viser(a, false); fire(); n++; }
    var corps = S.money - m0;
    clearZombies();
    var b = __t.placer('walker', 0, -20); __t.viser(b, true);
    var m1 = S.money; n = 0; while (!b.dead && n < 12){ __t.viser(b, true); fire(); n++; }
    return { corps: corps, tete: S.money - m1, morts: a.dead && b.dead, sansTete: !!b.headGone };
  });
  ok(r.morts, 'Un des deux zombies n’est pas mort');
  ok(r.sansTete, 'Le zombie tué à la tête devrait perdre sa tête');
  ok(r.tete > r.corps, 'Tête : ' + r.tete + ' $, corps : ' + r.corps + ' $');
});

test('Armes : les munitions baissent quand on tire avec update()', () => {
  reset(); J('startLocation(0)'); J('__t.geler()');
  const r = J(function(){
    clearZombies(); var a0 = S.ammo.pistol; firing = true; cool = 0;
    __t.sim(1, 1 / 30, function(){ return S.ammo.pistol < a0 - 1; });
    firing = false; return { a0: a0, a1: S.ammo.pistol };
  });
  ok(r.a1 < r.a0, 'Munitions : ' + r.a0 + ' puis ' + r.a1);
});

test('Armes : la recharge remplit le chargeur', () => {
  reset(); J('startLocation(0)'); J('__t.geler()');
  const r = J(function(){
    clearZombies(); fire(); fire(); fire();
    var avant = S.ammo.pistol; startReload(); var enCours = reloadT > 0;
    __t.sim(3, 1 / 30, function(){ return reloadT <= 0; });
    return { avant: avant, enCours: enCours, apres: S.ammo.pistol, plein: magSize('pistol') };
  });
  egal(r.avant, r.plein - 3, 'Munitions après 3 tirs');
  ok(r.enCours, 'La recharge n’a pas démarré');
  egal(r.apres, r.plein, 'Munitions après la recharge');
});

test('Armes : changement d’arme', () => {
  reset(); J('startLocation(0)'); J('__t.geler()');
  const r = J(function(){
    var res = {};
    equip('rifle'); res.nonPossede = S.cur;
    S.owned.shotgun = true; equip('shotgun'); res.apres = S.cur; res.ammo = S.ammo.shotgun; res.mag = magSize('shotgun');
    swapNext(1); res.swap = S.cur;
    return res;
  });
  egal(r.nonPossede, 'pistol', 'Une arme non achetée ne doit pas être prise en main');
  egal(r.apres, 'shotgun', 'Arme après equip(shotgun)');
  egal(r.ammo, r.mag, 'Chargeur du fusil à pompe');
  egal(r.swap, 'pistol', 'Arme après swapNext(1)');
});

test('Boutique : achat du fusil à pompe refusé sans assez d’argent', () => {
  reset(); J('startLocation(0)'); J("state = 'shop'");
  const r = J(function(){
    S.money = 100; renderShop();
    var b = document.querySelector('#shopWeapons button[data-act="buy"][data-id="shotgun"]');
    if (!b) return { pasDeBouton: true };
    var desactive = b.disabled; b.click();
    b = document.querySelector('#shopWeapons button[data-act="buy"][data-id="shotgun"]');
    if (b){ b.disabled = false; b.click(); } // même en forçant, le jeu doit refuser
    return { desactive: desactive, possede: !!S.owned.shotgun, money: S.money };
  });
  ok(!r.pasDeBouton, 'Bouton d’achat du fusil à pompe introuvable');
  ok(r.desactive, 'Le bouton devrait être désactivé avec 100 $');
  ok(!r.possede, 'Le fusil à pompe a été acheté sans assez d’argent');
  egal(r.money, 100, 'Argent');
});

test('Boutique : achat du fusil à pompe avec assez d’argent', () => {
  reset(); J('startLocation(0)'); J("state = 'shop'");
  const r = J(function(){
    S.money = 1000; renderShop();
    var b = document.querySelector('#shopWeapons button[data-act="buy"][data-id="shotgun"]');
    if (!b) return { pasDeBouton: true };
    b.click();
    return { possede: !!S.owned.shotgun, money: S.money, prix: WEAPONS.shotgun.price, cur: S.cur };
  });
  ok(!r.pasDeBouton, 'Bouton d’achat introuvable');
  ok(r.possede, 'Le fusil à pompe n’est pas acheté');
  egal(r.money, 1000 - r.prix, 'Argent après l’achat');
  egal(r.cur, 'shotgun', 'Arme en main après l’achat');
});

test('Boutique : améliorations dégâts et chargeur', () => {
  reset(); J('startLocation(0)'); J("state = 'shop'");
  const r = J(function(){
    S.money = 5000; renderShop();
    var res = { dmg0: dmgMult(), mag0: magSize('pistol') };
    var c = UPG.dmg.cost(S.upg.dmg), m = S.money;
    document.querySelector('#shopUpg button[data-act="upg"][data-id="dmg"]').click();
    res.dmg1 = dmgMult(); res.coutDmg = m - S.money; res.prixDmg = c;
    document.querySelector('#shopUpg button[data-act="upg"][data-id="mag"]').click();
    res.mag1 = magSize('pistol'); res.ammo = S.ammo.pistol;
    return res;
  });
  ok(r.dmg1 > r.dmg0, 'Dégâts : ' + r.dmg0 + ' puis ' + r.dmg1);
  ok(Math.abs(r.dmg1 / r.dmg0 - 1.12) < 1e-9, 'Dégâts +12 % attendus, obtenu ×' + (r.dmg1 / r.dmg0));
  egal(r.coutDmg, r.prixDmg, 'Prix payé pour l’amélioration des dégâts');
  ok(r.mag1 > r.mag0, 'Chargeur : ' + r.mag0 + ' puis ' + r.mag1);
  egal(r.ammo, r.mag1, 'Le chargeur agrandi est rempli');
});

test('Boutique : réparer la barricade', () => {
  reset(); J('startLocation(0)'); J("state = 'shop'");
  const r = J(function(){
    S.money = 1000; S.bar = 100; renderShop();
    var c = repairCost(), m = S.money;
    var b = document.querySelector('#shopWall button[data-act="repair"]');
    if (!b) return { pasDeBouton: true };
    b.click();
    return { bar: S.bar, max: S.barMax, paye: m - S.money, cout: c };
  });
  ok(!r.pasDeBouton, 'Bouton Réparer introuvable');
  egal(r.bar, r.max, 'Barricade après réparation');
  egal(r.paye, r.cout, 'Prix payé');
  ok(r.cout > 0, 'La réparation devrait coûter quelque chose');
});

test('Barricade : des zombies qui l’atteignent la font baisser', () => {
  reset(); J('startLocation(0)'); J('__t.geler()');
  const r = J(function(){
    clearZombies();
    for (var i = 0; i < 5; i++){ var z = __t.placer('walker', -8 + i * 4, -30); z.g.position.z = z.stopZ - .05; }
    var b0 = S.bar; __t.sim(4);
    return { b0: b0, b1: S.bar, attaque: zombies.filter(function(z){ return z.st === 'attack'; }).length };
  });
  ok(r.attaque > 0, 'Aucun zombie en train d’attaquer');
  ok(r.b1 < r.b0, 'Barricade : ' + r.b0 + ' puis ' + r.b1);
});

test('Barricade : à 0, la partie est finie (écran de fin)', () => {
  reset(); J('startLocation(0)'); J('__t.geler()');
  const r = J(function(){
    clearZombies();
    var z = __t.placer('walker', 0, -30); z.g.position.z = z.stopZ - .05;
    S.bar = 1; var t = __t.sim(15);
    return { state: state, temps: t.temps, fin: __t.visible('scrOver'), titre: $('overTitle').textContent };
  });
  egal(r.state, 'over', 'État après ' + r.temps.toFixed(1) + ' s');
  ok(r.fin, 'L’écran de fin n’est pas visible');
  egal(r.titre, 'La barricade a cédé', 'Titre de l’écran de fin');
});

test('Victoire : gagner la dernière vague débloque la ville suivante', () => {
  reset(); J('startLocation(0)');
  const r = J(function(){
    S.wave = curLoc.waves - 1; startWave();
    var vague = S.wave;
    plan.queue.length = 0; clearZombies();
    var t = __t.sim(6);
    var res = { vague: vague, waves: curLoc.waves, state: state, temps: t.temps, unlocked: P.unlocked, gagne: P.wins[LOCS[0].id] || 0,
      bouton: $('btnAgain').textContent.trim(), fin: __t.visible('scrOver'), titre: $('overTitle').textContent, idx: campaignIdx() };
    try { res.sauve = JSON.parse(localStorage.getItem('dt_prof')).unlocked; } catch (e) { res.sauve = null; }
    $('btnAgain').click();
    res.ville = curLoc.name;
    return res;
  });
  egal(r.vague, r.waves, 'Numéro de la dernière vague');
  egal(r.state, 'over', 'État après ' + r.temps.toFixed(1) + ' s');
  ok(r.fin, 'L’écran de fin n’est pas visible');
  egal(r.titre, 'Saint-Clou libérée !', 'Titre de victoire');
  egal(r.unlocked, 2, 'P.unlocked');
  egal(r.sauve, 2, 'unlocked dans dt_prof');
  egal(r.gagne, 1, 'Victoires à Saint-Clou');
  egal(r.idx, 1, 'campaignIdx() après la victoire');
  egal(r.bouton, 'Continuer : Val-des-Cendres', 'Bouton de l’écran de fin');
  egal(r.ville, 'Val-des-Cendres', 'Ville lancée par « Continuer »');
});

test('Talents : placer un point augmente les dégâts, remise à zéro rend les points', () => {
  reset({ pts: 2, talents: {} }); J('newGame()');
  const r = J(function(){
    var res = { d0: dmgMult() };
    openTalents('scrMap');
    var b = document.querySelector('#talList button[data-tal="marksman"]');
    if (!b) return { pasDeBouton: true };
    b.click();
    res.d1 = dmgMult(); res.pts1 = P.pts; res.niv = P.talents.marksman || 0;
    try { res.sauve = JSON.parse(localStorage.getItem('dt_prof')).talents.marksman; } catch (e) { res.sauve = null; }
    $('btnRespec').click();
    res.d2 = dmgMult(); res.pts2 = P.pts; res.niv2 = P.talents.marksman || 0;
    showScreen(null);
    return res;
  });
  ok(!r.pasDeBouton, 'Bouton du talent Tireur aguerri introuvable');
  egal(r.niv, 1, 'Niveau du talent après un point');
  egal(r.pts1, 1, 'Points restants');
  egal(r.sauve, 1, 'Talent sauvé dans dt_prof');
  ok(Math.abs(r.d1 / r.d0 - 1.06) < 1e-9, 'Dégâts +6 % attendus, obtenu ×' + (r.d1 / r.d0));
  egal(r.niv2, 0, 'Talent après remise à zéro');
  egal(r.pts2, 2, 'Points rendus');
  ok(Math.abs(r.d2 - r.d0) < 1e-9, 'Dégâts après remise à zéro');
});

test('Atelier : achat d’une défense avec assez de ferraille', () => {
  const a = preparerAtelier();
  if (!a.defs || !a.acheter) ignorer('Atelier incomplet, manque : ' + a.manque.join(', '));
  reset(); J('startLocation(0)'); J("state = 'shop'");
  const d = moinsChere(a);
  ok(d, 'Aucun prix trouvé dans ' + a.defs + ' (champs cherchés : price, prix, cost, cout)');
  setFerr(a, d.prix * 3);
  const r = acheterUne(a, d);
  ok(!r.rate, a.acheter + '(' + JSON.stringify(r.args) + ') n’a pas changé la ferraille (' + r.avant + '). Si la signature est autre, ajuste CAND ou argsPour dans tests/tests.js');
  egal(r.apres, d.prix * 3 - d.prix, 'Ferraille après l’achat de ' + d.cle);
});

test('Atelier : achat refusé sans assez de ferraille', () => {
  const a = preparerAtelier();
  if (!a.defs || !a.acheter) ignorer('Atelier incomplet, manque : ' + a.manque.join(', '));
  reset(); J('startLocation(0)'); J("state = 'shop'");
  const d = moinsChere(a);
  ok(d, 'Aucun prix trouvé dans ' + a.defs);
  const peu = Math.max(0, d.prix - 1);
  setFerr(a, peu);
  for (const args of argsPour(a.acheter, d.cle)){ try { appeler(a.acheter, args); } catch (e) {} }
  egal(ferr(a), peu, 'Ferraille après une tentative d’achat sans assez de ferraille');
});

test('Atelier : la vente rembourse la moitié', () => {
  const a = preparerAtelier();
  if (!a.defs || !a.acheter || !a.vendre) ignorer('Atelier incomplet, manque : ' + a.manque.join(', '));
  reset(); J('startLocation(0)'); J("state = 'shop'");
  const d = moinsChere(a);
  ok(d, 'Aucun prix trouvé dans ' + a.defs);
  setFerr(a, d.prix * 3);
  const r = acheterUne(a, d);
  ok(!r.rate, 'L’achat préalable n’a pas marché avec ' + a.acheter + '(' + JSON.stringify(r.args) + ')');
  const avant = ferr(a);
  const essais = argsPour(a.vendre, d.cle).concat([[0], [d.cle]]);
  let gain = 0, utilise = null;
  for (const args of essais){ try { appeler(a.vendre, args); } catch (e) { continue; } gain = ferr(a) - avant; if (gain){ utilise = args; break; } }
  ok(utilise, a.vendre + ' n’a rien remboursé (essais : ' + JSON.stringify(essais) + ')');
  ok(Math.abs(gain - d.prix / 2) <= 1, 'Remboursement attendu ' + (d.prix / 2) + ', obtenu ' + gain);
});

test('Atelier : ferraille gagnée à la mort d’un zombie', () => {
  const a = preparerAtelier();
  reset(); J('startLocation(0)'); J('__t.geler()');
  setFerr(a, 0);
  const r = J(function(){
    clearZombies(); var z = __t.placer('walker', 0, -20);
    damage(z, 1e9, false, z.g.position.clone());
    return { mort: !!z.dead };
  });
  ok(r.mort, 'Le zombie n’est pas mort');
  ok(ferr(a) > 0, 'Ferraille (' + a.ferraille + ') après la mort d’un zombie : ' + ferr(a));
});

test('Sauvegarde : XP et talents gardés après une défaite, profil relu au rechargement', async () => {
  reset({ talents: { marksman: 2 }, pts: 1 });
  J('startLocation(0)'); J('__t.geler()');
  J('addXP(50)');
  const av = J(function(){ return { xp: P.xp, level: P.level }; });
  const r = J(function(){
    clearZombies(); var z = __t.placer('walker', 0, -30); z.g.position.z = z.stopZ - .05;
    S.bar = 1; __t.sim(15);
    return { state: state, xp: P.xp, level: P.level, tal: P.talents.marksman, pts: P.pts };
  });
  egal(r.state, 'over', 'La partie devrait être perdue');
  ok(r.level > av.level || r.xp >= av.xp, 'XP perdue après la défaite : ' + JSON.stringify(av) + ' puis ' + JSON.stringify(r));
  egal(r.tal, 2, 'Talent après la défaite');
  let sauve = null; try { sauve = JSON.parse(localStorage.getItem('dt_prof')); } catch (e) {}
  ok(sauve, 'dt_prof absent ou illisible');
  egal(sauve.xp, r.xp, 'XP dans dt_prof');
  egal(sauve.level, r.level, 'Niveau dans dt_prof');
  egal(sauve.talents && sauve.talents.marksman, 2, 'Talent dans dt_prof');
  // On marque Saint-Clou comme gagnée, puis on recharge le jeu
  J("P.wins[LOCS[0].id] = 1; P.unlocked = 2; saveP(); state = 'test';");
  await chargerJeu();
  const p = J(function(){ return { xp: P.xp, level: P.level, tal: P.talents.marksman, pts: P.pts, unlocked: P.unlocked, bouton: $('btnStart').textContent.trim() }; });
  egal(p.xp, r.xp, 'XP relue');
  egal(p.level, r.level, 'Niveau relu');
  egal(p.tal, 2, 'Talent relu');
  egal(p.pts, r.pts, 'Points relus');
  egal(p.unlocked, 2, 'Villes débloquées relues');
  egal(p.bouton, 'Jouer : Val-des-Cendres', 'Bouton titre après une ville gagnée');
});

test('Erreurs : aucune erreur JavaScript pendant les tests', () => {
  const errs = erreursAnciennes.concat(lire('window.__erreurs') || []);
  egal(errs.length, 0, 'Erreurs : ' + errs.join(' | ') + '\nNombre');
});

/* ---------------- Exécution ---------------- */
function ajouterLigne(nom, statut, detail){
  const li = document.createElement('li'); li.className = statut;
  const marque = { reussi: 'Réussi', echec: 'Échec', ignore: 'Ignoré' }[statut];
  li.innerHTML = '<span class="marque"></span><span class="nom"></span>';
  li.querySelector('.marque').textContent = marque;
  li.querySelector('.nom').textContent = nom;
  if (detail){ const d = document.createElement('div'); d.className = 'detail'; d.textContent = detail; li.appendChild(d); }
  liste.appendChild(li);
}
function majTotal(fini){
  const R = window.RESULTATS;
  let t = R.reussis + ' / ' + R.total + ' réussis';
  if (R.echecs.length) t += ', ' + R.echecs.length + ' échec' + (R.echecs.length > 1 ? 's' : '');
  if (R.ignores.length) t += ', ' + R.ignores.length + ' ignoré' + (R.ignores.length > 1 ? 's' : '');
  if (!fini) t += ' (en cours…)';
  elTotal.textContent = t;
  elTotal.className = fini ? (R.echecs.length ? 'ko' : 'ok') : '';
}
const pause = ms => new Promise(r => setTimeout(r, ms));
function avecDelai(p, ms){
  let to; return Promise.race([p, new Promise((_, rej) => { to = setTimeout(() => rej(new Echec('Délai dépassé (' + ms / 1000 + ' s)')), ms); })]).finally(() => clearTimeout(to));
}
function texteErreur(e){
  if (!e) return 'Erreur inconnue';
  if (e instanceof Echec || e instanceof Ignore) return e.message;
  // Erreur venant du jeu (autre fenêtre : instanceof ne marche pas)
  return (e.name || 'Erreur') + ' : ' + (e.message || String(e)) + (e.stack ? '\n' + String(e.stack).split('\n').slice(0, 3).join('\n') : '');
}

async function lancer(){
  const R = window.RESULTATS;
  try {
    mettreDeCote();
    etat('Chargement du jeu…');
    let erreurChargement = null;
    try { await chargerJeu(); } catch (e) { erreurChargement = e; }
    if (win){
      erreursAuChargement = (lire('window.__erreurs') || []).slice();
      try { defautsP = JSON.parse(JSON.stringify(J('P'))); } catch (e) { defautsP = {}; }
    }
    const choisis = TESTS.filter(t => !FILTRE || t.nom.toLowerCase().indexOf(FILTRE) >= 0);
    if (!choisis.length) etat('Aucun test ne contient « ' + FILTRE + ' ».');
    for (let i = 0; i < choisis.length; i++){
      const t = choisis[i];
      etat('Test ' + (i + 1) + ' / ' + choisis.length + ' : ' + t.nom);
      await pause(0); // laisse l'affichage se mettre à jour
      let statut = 'reussi', detail = '';
      try {
        if (!win){
          if (t.nom.indexOf('Chargement') === 0) throw new Echec(texteErreur(erreurChargement));
          throw new Echec('Jeu non chargé : ' + texteErreur(erreurChargement));
        }
        const res = t.fn();
        if (res && typeof res.then === 'function') await avecDelai(res, DELAI_TEST);
      } catch (e) {
        if (e instanceof Ignore){ statut = 'ignore'; detail = e.message; }
        else { statut = 'echec'; detail = texteErreur(e); }
      } finally {
        arreterJeu();
      }
      if (statut === 'ignore') R.ignores.push({ nom: t.nom, detail });
      else {
        R.total++;
        if (statut === 'reussi') R.reussis++; else R.echecs.push({ nom: t.nom, detail });
      }
      ajouterLigne(t.nom, statut, detail);
      majTotal(false);
    }
  } catch (e) {
    R.echecs.push({ nom: 'Banc de test', detail: texteErreur(e) }); R.total++;
    ajouterLigne('Banc de test', 'echec', texteErreur(e));
  } finally {
    // On arrête le jeu avant de remettre la sauvegarde, pour qu'il ne la réécrive pas
    arreterJeu();
    try { const vide = document.createElement('iframe'); vide.id = 'cadre'; vide.title = 'Jeu arrêté'; cadre.replaceWith(vide); cadre = vide; } catch (e) {}
    win = null;
    restaurer();
    if (!restauree){
      R.echecs.push({ nom: 'Restauration de la sauvegarde', detail: 'La sauvegarde n’a pas pu être remise. Une copie reste dans localStorage sous ' + CLE_SECOURS + ' et sera remise à la prochaine ouverture.' });
      R.total++;
      ajouterLigne('Restauration de la sauvegarde', 'echec', R.echecs[R.echecs.length - 1].detail);
    }
    majTotal(true);
    etat('Terminé' + (FILTRE ? ' (filtre : « ' + FILTRE + ' »)' : '') + '. Sauvegarde ' + (restauree ? 'remise comme avant.' : 'NON remise, voir ci-dessus.'));
    R.fini = true;
  }
}

lancer();
