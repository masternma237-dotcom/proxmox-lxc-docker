/* ═══════════════════════════════════════════════════════════════════════════
   registry.js — Registre global PV (Proxmox VE) — Guide Interactif CFP-CMD
   Remplace MK (MikroTik) / FG (FortiGate) des guides précédents.
   Toutes les données s'enregistrent via PV.addSections / addGlossary /
   addDiagrams / addQuiz / addTool — jamais par index numérique.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Utilitaires sûrs (partagés par tous les modules) ─────────────────── */
  var safeStorage = {
    ok: (function () {
      try {
        var t = '__pv_test__';
        window.localStorage.setItem(t, '1');
        window.localStorage.removeItem(t);
        return true;
      } catch (e) { return false; }
    })(),
    _mem: {},
    get: function (key, fallback) {
      try {
        if (this.ok) {
          var raw = window.localStorage.getItem(key);
          return raw === null ? fallback : JSON.parse(raw);
        }
        return Object.prototype.hasOwnProperty.call(this._mem, key) ? this._mem[key] : fallback;
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try {
        if (this.ok) { window.localStorage.setItem(key, JSON.stringify(value)); }
        else { this._mem[key] = value; }
      } catch (e) { /* quota dépassé ou mode privé : silencieux */ }
      return value;
    },
    remove: function (key) {
      try {
        if (this.ok) { window.localStorage.removeItem(key); }
        else { delete this._mem[key]; }
      } catch (e) { /* ignoré */ }
    }
  };

  function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /* ── Métadonnées des parcours ─────────────────────────────────────────── */
  var TRACKS = {
    fondamentaux:   { label: 'Fondamentaux',          icon: 'fa-solid fa-rocket',          color: '#E57000' },
    reseau:         { label: 'Réseau',                icon: 'fa-solid fa-network-wired',   color: '#3498db' },
    securite:       { label: 'Sécurité',              icon: 'fa-solid fa-shield-halved',   color: '#e74c3c' },
    cluster:        { label: 'Clustering & HA',       icon: 'fa-solid fa-server',          color: '#9b59b6' },
    stockage:       { label: 'Stockage avancé',       icon: 'fa-solid fa-database',        color: '#16a085' },
    containers:     { label: 'Docker & LXC',          icon: 'fa-solid fa-cubes',           color: '#2980b9' },
    monitoring:     { label: 'Monitoring',            icon: 'fa-solid fa-chart-line',      color: '#27ae60' },
    backup:         { label: 'Sauvegarde',            icon: 'fa-solid fa-cloud-arrow-up',  color: '#f39c12' },
    automatisation: { label: 'Automatisation & API',  icon: 'fa-solid fa-gears',           color: '#8e44ad' },
    labs:           { label: 'Labs & évaluation',     icon: 'fa-solid fa-flask',           color: '#c0392b' }
  };

  var LEVELS = {
    debutant:       { label: 'Débutant',      rank: 1 },
    intermediaire:  { label: 'Intermédiaire', rank: 2 },
    avance:         { label: 'Avancé',        rank: 3 }
  };

  var KEbab_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  /* ── Registre ─────────────────────────────────────────────────────────── */
  var PV = {
    version: '1.0.0',
    appName: 'Guide Interactif Proxmox VE',
    appSub: 'CFP-CMD · MASTER NMA — Infrastructure & Sécurité Réseaux',
    tracks: TRACKS,
    levels: LEVELS,

    sections: [],      /* ordre d'enregistrement ; trié par step pour l'affichage */
    sectionById: {},   /* id -> section                                           */
    glossary: {},      /* terme -> définition                                     */
    diagrams: {},      /* id -> function () => html                               */
    quiz: {},          /* sectionId -> [ [question, options[], correctIdx, expl] ]*/
    tools: [],         /* { id, name, icon, description, render(container) }      */

    /* Utilitaires exposés */
    util: {
      safeStorage: safeStorage,
      escapeRegExp: escapeRegExp,
      escapeHTML: escapeHTML,
      shuffle: shuffle
    },

    addSections: function (list) {
      if (!Array.isArray(list)) { throw new Error('PV.addSections : un tableau est requis'); }
      list.forEach(function (s) {
        if (!s || typeof s !== 'object') { throw new Error('PV.addSections : section invalide'); }
        if (!KEbab_RE.test(s.id)) { throw new Error('PV.addSections : id non kebab-case → ' + s.id); }
        if (PV.sectionById[s.id]) { throw new Error('PV.addSections : id en doublon → ' + s.id); }
        if (!TRACKS[s.track]) { throw new Error('PV.addSections : track inconnue → ' + s.track); }
        if (!LEVELS[s.level]) { throw new Error('PV.addSections : niveau inconnu → ' + s.level); }
        if (!s.title) { throw new Error('PV.addSections : titre manquant → ' + s.id); }
        s.requires = Array.isArray(s.requires) ? s.requires : [];
        s.cliCommands = Array.isArray(s.cliCommands) ? s.cliCommands : [];
        s.guiSteps = Array.isArray(s.guiSteps) ? s.guiSteps : [];
        s.terminology = Array.isArray(s.terminology) ? s.terminology : [];
        s.concepts = Array.isArray(s.concepts) ? s.concepts : [];
        s.alerts = Array.isArray(s.alerts) ? s.alerts : [];
        s.steps = Array.isArray(s.steps) ? s.steps : [];
        s.checklist = Array.isArray(s.checklist) ? s.checklist : [];
        PV.sections.push(s);
        PV.sectionById[s.id] = s;
      });
      PV.sections.sort(function (a, b) { return String(a.step).localeCompare(String(b.step), 'en', { numeric: true }); });
      return PV;
    },

    addGlossary: function (obj) {
      Object.keys(obj || {}).forEach(function (term) {
        if (Object.prototype.hasOwnProperty.call(PV.glossary, term)) {
          if (window.console && window.console.warn) {
            window.console.warn('[PV] Terme de glossaire redéfini (ignoré) : ' + term);
          }
          return;
        }
        PV.glossary[term] = String(obj[term]);
      });
      return PV;
    },

    addDiagrams: function (obj) {
      Object.keys(obj || {}).forEach(function (id) {
        if (PV.diagrams[id]) { throw new Error('PV.addDiagrams : diagramme en doublon → ' + id); }
        if (typeof obj[id] !== 'function') { throw new Error('PV.addDiagrams : le diagramme doit être une fonction → ' + id); }
        PV.diagrams[id] = obj[id];
      });
      return PV;
    },

    addQuiz: function (obj) {
      Object.keys(obj || {}).forEach(function (sectionId) {
        if (PV.quiz[sectionId]) { throw new Error('PV.addQuiz : banque en doublon → ' + sectionId); }
        var bank = obj[sectionId];
        if (!Array.isArray(bank) || bank.length === 0) {
          throw new Error('PV.addQuiz : banque vide → ' + sectionId);
        }
        bank.forEach(function (q, i) {
          if (!Array.isArray(q) || q.length < 4) {
            throw new Error('PV.addQuiz : question mal formée [' + sectionId + '][' + i + ']');
          }
          if (!Array.isArray(q[1]) || q[1].length < 2) {
            throw new Error('PV.addQuiz : options insuffisantes [' + sectionId + '][' + i + ']');
          }
          if (typeof q[2] !== 'number' || q[2] < 0 || q[2] >= q[1].length) {
            throw new Error('PV.addQuiz : index de bonne réponse invalide [' + sectionId + '][' + i + ']');
          }
        });
        PV.quiz[sectionId] = bank;
      });
      return PV;
    },

    addTool: function (tool) {
      if (!tool || !tool.id || typeof tool.render !== 'function') {
        throw new Error('PV.addTool : outil invalide (id + render requis)');
      }
      PV.tools.push(tool);
      return PV;
    },

    /* Sections filtrées par niveau (pour la sidebar) */
    sectionsByTrack: function (trackId) {
      return PV.sections.filter(function (s) { return s.track === trackId; });
    }
  };

  window.PV = PV;
})();
