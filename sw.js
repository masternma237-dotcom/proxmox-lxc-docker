/* ═══════════════════════════════════════════════════════════════════════════
   sw.js — Service worker du Guide Interactif Proxmox VE (CFP-CMD)
   GÉNÉRÉ PAR tools/build-sw.js — NE PAS ÉDITER À LA MAIN
   Cache : pv-guide-v1.0.0-fe66e562ea
   72 fichiers pré-cachés · mode hors ligne complet
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

var CACHE_NAME = 'pv-guide-v1.0.0-fe66e562ea';
var PRECACHE_URLS = [
  "./.DS_Store",
  "./.gitignore",
  "./.kilo/.gitignore",
  "./.kilo/worktrees/.metadata_never_index",
  "./.vscode/settings.json",
  "./ARCHITECTURE.md",
  "./README.md",
  "./assets/apple-touch-icon.png",
  "./assets/favicon-96x96.png",
  "./assets/favicon.ico",
  "./assets/favicon.svg",
  "./assets/site.webmanifest",
  "./assets/web-app-manifest-192x192.png",
  "./assets/web-app-manifest-512x512.png",
  "./css/styles.css",
  "./data/automatisation-1.js",
  "./data/backup-1.js",
  "./data/cluster-1.js",
  "./data/containers-1.js",
  "./data/core.js",
  "./data/diagrams-automatisation.js",
  "./data/diagrams-backup.js",
  "./data/diagrams-cluster.js",
  "./data/diagrams-containers.js",
  "./data/diagrams-fondamentaux.js",
  "./data/diagrams-labs.js",
  "./data/diagrams-monitoring.js",
  "./data/diagrams-reseau.js",
  "./data/diagrams-securite.js",
  "./data/diagrams-stockage.js",
  "./data/glossary-automatisation.js",
  "./data/glossary-backup.js",
  "./data/glossary-cluster.js",
  "./data/glossary-containers.js",
  "./data/glossary-fondamentaux.js",
  "./data/glossary-labs.js",
  "./data/glossary-monitoring.js",
  "./data/glossary-reseau.js",
  "./data/glossary-securite.js",
  "./data/glossary-stockage.js",
  "./data/labs.js",
  "./data/monitoring-1.js",
  "./data/quiz-automatisation.js",
  "./data/quiz-backup.js",
  "./data/quiz-cluster.js",
  "./data/quiz-containers.js",
  "./data/quiz-fondamentaux.js",
  "./data/quiz-labs.js",
  "./data/quiz-monitoring.js",
  "./data/quiz-reseau.js",
  "./data/quiz-securite.js",
  "./data/quiz-stockage.js",
  "./data/reseau-1.js",
  "./data/reseau-2.js",
  "./data/securite-1.js",
  "./data/securite-2.js",
  "./data/stockage-1.js",
  "./doc/.DS_Store",
  "./doc/CDC.md",
  "./doc/PROMPT.md",
  "./doc/deploy_lxc_proxmox.sh",
  "./doc/img.zip",
  "./doc/logo.png",
  "./doc/proxmox-guide-cfp-cmd.zip",
  "./index.html",
  "./js/app.js",
  "./js/diagrams.js",
  "./js/print-window.js",
  "./js/quiz.js",
  "./js/registry.js",
  "./pve-generator.js",
  "./site.webmanifest"
];

/* Installation : précache de tous les assets du guide */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* Activation : suppression des anciens caches */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) { return caches.delete(key); }
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* Fetch : cache-first pour les GET same-origin, réseau sinon */
self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') { return; }
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) { return; } /* cdnjs : réseau */

  event.respondWith(
    caches.match(request, { ignoreSearch: false }).then(function (cached) {
      if (cached) { return cached; }
      return fetch(request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, clone);
          });
        }
        return response;
      }).catch(function () {
        /* navigation hors ligne → index.html pré-caché */
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
