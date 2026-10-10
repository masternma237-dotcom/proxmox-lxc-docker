#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   tools/build-sw.js — Génère sw.js (service worker) avec précache complet
   Usage : node tools/build-sw.js   (à relancer après toute modification)
   Stratégie : cache-first pour les GET same-origin, fallback index.html.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['tools', 'docs', '.git', 'node_modules']);
const SKIP_FILES = new Set(['sw.js']);

function walk(dir, base) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.join(base, entry.name).split(path.sep).join('/');
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out = out.concat(walk(abs, rel));
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name)) continue;
      out.push('./' + rel);
    }
  }
  return out;
}

const files = walk(ROOT, '.');
const versionInput = files
  .map(f => fs.statSync(path.join(ROOT, f.replace('./', ''))).mtimeMs + ':' + f)
  .join('|');
const hash = crypto.createHash('sha256').update(versionInput).digest('hex').slice(0, 10);
const cacheName = `pv-guide-v1.0.0-${hash}`;

const sw = `/* ═══════════════════════════════════════════════════════════════════════════
   sw.js — Service worker du Guide Interactif Proxmox VE (CFP-CMD)
   GÉNÉRÉ PAR tools/build-sw.js — NE PAS ÉDITER À LA MAIN
   Cache : ${cacheName}
   ${files.length} fichiers pré-cachés · mode hors ligne complet
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

var CACHE_NAME = '${cacheName}';
var PRECACHE_URLS = ${JSON.stringify(files, null, 2)};

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
`;

fs.writeFileSync(path.join(ROOT, 'sw.js'), sw);
console.log(`✓ sw.js généré : cache "${cacheName}", ${files.length} fichiers pré-cachés`);
