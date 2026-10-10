# Guide Interactif Proxmox VE — CFP-CMD

Guide d'apprentissage interactif **HTML/CSS/JS** couvrant **Proxmox VE de A à Z** :
virtualisation (KVM/LXC), réseau (bridges, bonds, VLANs, SDN), sécurité (pare-feu,
RBAC, 2FA, Suricata), clustering HA, stockage avancé (ZFS, Ceph), Docker & Portainer,
monitoring (Prometheus, Grafana, SNMP), sauvegarde (vzdump, PBS, S3) et automatisation
(API REST, Terraform, Ansible).

**Public** : étudiants CFP-CMD — MASTER NMA « Infrastructure & Sécurité Réseaux ».
**Langue** : français, terminologie technique anglaise conservée.

## Contenu

| Parcours | Sections | Quiz |
|---|---|---|
| Fondamentaux | 00 → 07 | 32 questions |
| Réseau | 08 → 14 | 34 |
| Sécurité | 15 → 22 | 32 |
| Clustering & HA | 23 → 29 | 28 |
| Stockage avancé | 30 → 35 | 24 |
| Docker & LXC | 36 → 42 | 28 |
| Monitoring | 43 → 49 | 28 |
| Sauvegarde | 50 → 56 | 28 |
| Automatisation & API | 57 → 63 | 28 |
| Labs & évaluation | 64 → 70 | 29 |

**Total : 71 sections · 73 diagrammes SVG · 235 termes de glossaire · 291 questions de quiz.**

## Démarrage

### Ouverture directe (mode `file://`)
Double-cliquez sur `index.html` : le guide fonctionne sans serveur et sans connexion
(via le splash screen animé de ~8 s, skippable). Le service worker n'est actif qu'en HTTP(S).

### Serveur local (PWA + mode hors ligne)
```bash
cd proxmox-guide
python3 -m http.server 8080
# → http://localhost:8080  (installez la PWA depuis le navigateur)
```

## Fonctionnalités

- **Splash screen 8 s** avec animations du logo (anneaux radar, orbes, barre de progression, bouton « Passer »)
- **Navigation** : 10 parcours repliables, filtre par niveau (débutant/intermédiaire/avancé), badges et progression persistante
- **Recherche instantanée** (touche `/`) : sections, commandes, concepts et glossaire, avec surlignage
- **Blocs CLI** : copie unitaire ou « tout copier », fallback presse-papiers en `file://`
- **Procédures GUI** avec chemins de menu surlignés (`wb-path`)
- **Glossaire contextuel** : panneau droit alimenté par la terminologie de la section courante, recherche intégrale
- **Quiz** : QCM par section, mélange questions/options, explications, seuil de 70 %, meilleur score mémorisé
- **Quiz final** (menu Outils 🔧) : 20 questions tirées des 291 disponibles
- **Générateur de configuration** (menu Outils 🔧) : formulaire → script d'installation Proxmox complet, avec validation stricte (IP/CIDR, chevauchements, secrets ≥ 16 caractères, anti-injection, placeholders non quotés)
- **Labs 0→5** : déroulé numéroté + checklists persistantes
- **Export PDF** par section (popup d'impression + fallback local)
- **Thème sombre/clair** mémorisé, **mode hors ligne** (PWA), **accessibilité** (skip-link, `aria-*`, focus visible, navigation clavier : `/` recherche, `Échap` fermeture, `Alt+←/→` sections)

## Maintenance

### Ajouter une section
1. Créez `data/mon-parcours.js` (ou ajoutez à un fichier existant) :
   ```js
   window.PV.addSections([{
     id: 'ma-section',            // kebab-case, unique
     track: 'reseau',             // track existante
     level: 'intermediaire',      // debutant | intermediaire | avance
     title: 'Mon titre', icon: 'fa-solid fa-network-wired', step: '15',
     requires: ['vlans'],         // ids existants et ANTÉRIEURS
     description: 'Texte clair de 3-5 phrases…',
     cliCommands: [`# commandes`],
     guiSteps: ["<span class='wb-path'>Node → System → Network</span> → …"],
     diagram: 'net-ma-section',   // id défini dans un diagrams-*.js
     terminology: ['VLAN'],       // termes définis dans un glossary-*.js
     concepts: [{ term: '…', def: '…' }],
     alerts: [{ type: 'info', icon: 'fa-circle-info', text: '…' }],
     table: { headers: ['A', 'B'], rows: [['x', 'y']] }
   }]);
   ```
2. Câblez le fichier dans `index.html` **après** `js/quiz.js` et **avant** `js/app.js`.
3. Validez et régénérez le service worker :
   ```bash
   node tools/validate.js
   node tools/build-sw.js
   ```

### Outils

| Commande | Rôle |
|---|---|
| `node tools/validate.js` | Vérifie ids/steps/prérequis/diagrammes/terminologie/quiz/labs + cohérence `index.html` |
| `node tools/build-sw.js` | Régénère `sw.js` (précache complet, hash de version) |
| `node tools/test-generator.js` | 63 tests unitaires du générateur (injections, CIDR, secrets…) |

### Conventions
- **IDs** : kebab-case, jamais d'index numérique.
- **Diagrammes** : préfixés par track (`fd-`, `net-`, `sec-`, `clu-`, `sto-`, `ctn-`, `mon-`, `bak-`, `aut-`, `lab-`) + `base-`.
- **Glossaire** : un terme = une seule définition dans tout le projet (`PV.addGlossary` ignore les doublons avec avertissement).
- **CSP** : `script-src 'self' https://cdnjs.cloudflare.com` — **aucun script inline**, tout via `addEventListener`.
- **Secrets** : jamais en dur ; placeholders `<MOT_DE_PASSE_FORT_ADMIN>` non quotés dans les scripts générés.

Voir `docs/ARCHITECTURE.md` pour la conception détaillée.
