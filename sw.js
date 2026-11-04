'use strict';
/* Service worker de Dernier toit : le jeu s'installe sur le cell et marche sans réseau.
   Stratégie : réseau d'abord (on a toujours la dernière version en ligne), copie en cache à chaque réponse ;
   sans réseau, on sert la copie (en ignorant le ?v= des fichiers). Les autres sites (polices Google) passent tout droit.
   Changer CACHE seulement pour jeter toutes les vieilles copies. */
const CACHE = 'dernier-toit-1';
const BASE = ['./', 'index.html', 'css/style.css', 'lib/three.min.js', 'manifest.webmanifest', 'icones/icone-192.png', 'icones/icone-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/tests/') >= 0) return; // la page de tests va toujours au réseau
  e.respondWith(
    fetch(req).then(rep => {
      if (rep && rep.ok && rep.type === 'basic'){ const copie = rep.clone(); caches.open(CACHE).then(c => c.put(req, copie)).catch(() => {}); }
      return rep;
    }).catch(() => caches.match(req).then(r => r || caches.match(req, { ignoreSearch:true })).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined)).then(r => r || Response.error()))
  );
});
