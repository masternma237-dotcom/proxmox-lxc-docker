# Architecture — Guide Interactif Proxmox VE (CFP-CMD)

## Vue d'ensemble

SPA statique **sans build ni framework** : HTML + CSS + JS vanilla, compatible
`file://` (aucun fetch dynamique, service worker optionnel), CSP stricte. Le
projet reproduit l'ergonomie et l'architecture des guides MikroTik et FortiGate
précédents, avec le registre `PV` en remplacement de `MK`/`FG`.

```
index.html                Shell + splash + chargement ordonné des scripts
sw.js                     Service worker (généré par tools/build-sw.js)
site.webmanifest          Manifeste PWA
assets/                   Logo/favicon/icônes PWA
css/styles.css            Thèmes (dark/light), splash animé, composants, print
js/
  registry.js             Registre global PV + utilitaires sûrs
  diagrams.js             Helpers SVG + schémas de base
  quiz.js                 Moteur de quiz (section + final)
  app.js                  Moteur SPA (routeur, recherche, rendu, outils…)
  print-window.js         Impression de la popup d'export PDF
  tools/pve-generator.js  Générateur de configuration (validateurs + UI)
data/
  core.js … labs.js       Sections (10 tracks, 71 sections)
  diagrams-*.js           Banques de schémas SVG par track
  glossary-*.js           Glossaires par track (235 termes)
  quiz-*.js               Banques de questions (291)
tools/
  validate.js             Validation intégrale des données
  build-sw.js             Génération du service worker
  test-generator.js       Tests unitaires du générateur
docs/                     README.md + ARCHITECTURE.md
```

## Flux de démarrage

1. Le navigateur parse `index.html` : CSP appliquée, splash visible immédiatement (CSS pur).
2. Les scripts se chargent dans l'ordre : `registry.js` → `diagrams.js` → `quiz.js` →
   42 fichiers `data/*.js` (enregistrement déclaratif) → `tools/pve-generator.js` → `app.js`.
3. `app.js` démarre : thème mémorisé, sidebar construite depuis `PV.sections` (triées par
   `step`), index de recherche, outils enregistrés (générateur, quiz final, glossaire).
4. Le splash dure **≈ 8 s** (rAF + barre CSS synchrones) ou se ferme via « Passer » :
   `body.app-ready` révèle le shell, la dernière section visitée est restaurée
   (routeur `#/section-id`), le focus est posé sur `main`.

## Registre PV (js/registry.js)

Point d'entrée unique des données — aucun fichier data ne touche au DOM :

| API | Rôle |
|---|---|
| `PV.addSections([...])` | Valide (kebab-case, doublons, track/level) et indexe les sections |
| `PV.addGlossary({...})` | Fusionne les glossaires, ignore les doublons (warn) |
| `PV.addDiagrams({...})` | Enregistre les générateurs de schémas (doublon = erreur) |
| `PV.addQuiz({...})` | Valide la structure des banques `[q, opts, idx, expl]` |
| `PV.addTool({...})` | Enregistre les outils (générateur, quiz final, glossaire complet) |
| `PV.util` | `safeStorage` (localStorage protégé), `escapeRegExp`, `escapeHTML`, `shuffle` |

## Moteur SPA (js/app.js)

- **Routeur** : `#/section-id` → `renderSection()` (badges, description, diagramme,
  GUI steps, blocs CLI copiables, alertes, concepts, table, steps/checklist labs,
  terminologie, quiz, nav précédent/suivant). Toute insertion passe par
  `textContent`/`escapeHTML` sauf les `guiSteps`/diagrammes (contenu de dépôt, de confiance).
- **Recherche** : index précalculé (titre, description, CLI, concepts, glossaire),
  scoring simple, snippets avec `<mark>` et `escapeRegExp`.
- **Progression** : sections visitées (`pv.visited`), barre topbar + pastilles sidebar.
- **Persistance** (`safeStorage` avec fallback mémoire si localStorage indisponible) :
  thème, filtre de niveau, dernière section, visited, checklists (`pv.check.<id>`),
  scores quiz (`pv.quiz.<id>`), préférence glossaire.
- **Accessibilité** : skip-link, focus visible, piège de focus dans la modale,
  `aria-expanded/pressed/valuenow`, navigation clavier (`/`, `Échap`, `Alt+←/→`).
- **Export PDF** : popup document.write + `js/print-window.js` (auto-print), fallback
  `window.print()` si popup bloquée ; CSS `@media print` isole le contenu.
- **PWA** : `sw.js` enregistré uniquement en HTTP(S) — jamais en `file://`.

## Splash screen (8 s)

Composé en CSS pur dans `index.html` (#splash) + pilotage JS dans `initSplash()` :
- animation d'entrée du logo (pop + rotation), anneaux radar pulsants, anneau pointillé
  rotatif, satellite orbital, respiration lumineuse du logo, orbes flottants, trame grille ;
- barre de progression CSS (`progress-fill 8s`) synchronisée avec un compteur rAF (`#splash-pct`) ;
- messages de statut cycliques (`aria-live="polite"`), bouton « Passer » accessible ;
- `prefers-reduced-motion` : animations neutralisées, minuterie conservée ;
- fermeture : classe `.splash-hide` (fondu + zoom) puis retrait du DOM.

## Générateur de configuration (js/tools/pve-generator.js)

Trois couches testables indépendamment (exportées pour Node via `module.exports`) :
1. **Validateurs purs** : hostname/cluster/iface/VNet/zone (listes blanches regex),
   IPv4 (octets 0-255), CIDR (préfixe 0-32, calcul réseau/broadcast en entier 32 bits),
   `checkOverlaps` (détection de chevauchements), secrets (≥ 16 caractères, anti-injection
   `;"\`$\\<>\|&`, échappement shell), e-mail, port, nb nœuds.
2. **generateScript(cfg)** : fonction pure → script bash commenté (dépôts, réseau,
   cluster/QDevice, SDN, ZFS/LVM-Thin/NFS/Ceph, RBAC/2FA/pare-feu/ACME, PBS/S3,
   monitoring). Secrets vides → placeholders **non quotés** `<MOT_DE_PASSE_FORT_ADMIN>`.
3. **UI** (`PV.addTool`) : formulaire en fieldsets, erreurs par champ, résumé des
   chevauchements, sortie `<pre>` + copie presse-papiers.

## Sécurité

- CSP : `script-src 'self' https://cdnjs.cloudflare.com` ; pas de script inline nulle part.
- Aucune évaluation dynamique (`eval`/`new Function` absents), aucun secret en dur.
- Entrées utilisateur (recherche, filtres, formulaire) systématiquement échappées.
- Le générateur refuse les injections et produit des placeholders explicites à relire.

## Extension

Ajout d'une section/track, d'un terme de glossaire ou d'un diagramme : voir
`docs/README.md` ( Maintenance). Toute modification doit passer :
`node tools/validate.js && node tools/test-generator.js && node tools/build-sw.js`.
