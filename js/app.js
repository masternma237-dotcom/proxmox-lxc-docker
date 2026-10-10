/* ═══════════════════════════════════════════════════════════════════════════
   app.js — Moteur SPA du Guide Interactif Proxmox VE (CFP-CMD)
   Splash 8 s → routeur hash → sidebar filtrable → recherche → glossaire
   → quiz → checklist labs → outils → export PDF → PWA. Aucun script inline.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var PV = window.PV;
  var U = PV.util;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var STORAGE = {
    theme: 'pv.theme',
    visited: 'pv.visited',
    last: 'pv.last',
    filter: 'pv.filter',
    glossaryHidden: 'pv.glossaryHidden',
    checkPrefix: 'pv.check.',
    quizPrefix: 'pv.quiz.'
  };

  var COPY_REGISTRY = {};   /* id -> texte brut à copier */
  var copyCounter = 0;

  /* ═══════════════════════ 1. SPLASH SCREEN (≈ 8 s) ═══════════════════════ */
  var SPLASH_DURATION = 8000;

  var splashStatuses = [
    'Initialisation du moteur…',
    'Chargement des 10 parcours pédagogiques…',
    'Indexation du glossaire et des quiz…',
    'Préparation des laboratoires pratiques…',
    'Génération des schémas réseau et stockage…',
    'Finalisation de l\'environnement…'
  ];

  function initSplash() {
    var splash = $('#splash');
    if (!splash) { finishBoot(true); return; }

    var statusEl = $('#splash-status');
    var pctEl = $('#splash-pct');
    var barEl = $('#splash-progress');
    var skipBtn = $('#splash-skip');
    var start = performance.now();
    var done = false;
    var statusIdx = 0;

    var statusTimer = window.setInterval(function () {
      statusIdx = (statusIdx + 1) % splashStatuses.length;
      if (statusEl) { statusEl.textContent = splashStatuses[statusIdx]; }
    }, 1350);

    function tick(now) {
      if (done) { return; }
      var elapsed = now - start;
      var ratio = Math.min(1, elapsed / SPLASH_DURATION);
      var pct = Math.round(ratio * 100);
      if (pctEl) { pctEl.textContent = pct + ' %'; }
      if (barEl) { barEl.setAttribute('aria-valuenow', String(pct)); }
      if (elapsed >= SPLASH_DURATION) { finishSplash(); return; }
      window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);

    function finishSplash() {
      if (done) { return; }
      done = true;
      window.clearInterval(statusTimer);
      if (pctEl) { pctEl.textContent = '100 %'; }
      splash.classList.add('splash-hide');
      finishBoot(false);
      window.setTimeout(function () {
        if (splash.parentNode) { splash.parentNode.removeChild(splash); }
      }, 800);
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', finishSplash);
      skipBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finishSplash(); }
      });
    }
  }

  function finishBoot(immediate) {
    document.body.classList.add('app-ready');
    var app = $('#app');
    if (app) { app.setAttribute('aria-busy', 'false'); }
    var initial = currentSectionId() || U.safeStorage.get(STORAGE.last, null) || (PV.sections[0] && PV.sections[0].id);
    if (initial && PV.sectionById[initial]) {
      /* restaure l'URL sans créer d'entrée d'historique, puis rend la section */
      try { window.history.replaceState(null, '', '#/' + initial); } catch (err) { /* file:// : ignoré */ }
      renderSection(initial, { silentHash: true });
    }
    if (!immediate) {
      var main = $('#main');
      if (main) { window.setTimeout(function () { main.focus({ preventScroll: true }); }, 850); }
    }
  }

  /* ═══════════════════════ 2. THÈME SOMBRE / CLAIR ════════════════════════ */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = $('#btn-theme');
    if (btn) {
      btn.setAttribute('aria-pressed', String(theme === 'light'));
      btn.innerHTML = '<i class="fa-solid fa-' + (theme === 'light' ? 'sun' : 'moon') + '" aria-hidden="true"></i>';
    }
  }

  function initTheme() {
    applyTheme(U.safeStorage.get(STORAGE.theme, 'dark'));
    var btn = $('#btn-theme');
    if (btn) {
      btn.addEventListener('click', function () {
        var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        U.safeStorage.set(STORAGE.theme, next);
        applyTheme(next);
        toast('Thème ' + (next === 'light' ? 'clair' : 'sombre') + ' activé.', 'info');
      });
    }
  }

  /* ═══════════════════════ 3. TOASTS ══════════════════════════════════════ */
  var TOAST_ICONS = {
    success: 'fa-circle-check', error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation', info: 'fa-circle-info'
  };

  function toast(message, type, duration) {
    window.toastHelper = toast; /* utilisé aussi par le générateur */
    type = type || 'info';
    var root = $('#toast-root');
    if (!root) { return; }
    var t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.innerHTML = '<i class="fa-solid ' + (TOAST_ICONS[type] || TOAST_ICONS.info) + '" aria-hidden="true"></i><span></span>';
    t.querySelector('span').textContent = message;
    root.appendChild(t);
    window.setTimeout(function () {
      t.classList.add('toast-out');
      window.setTimeout(function () { if (t.parentNode) { t.parentNode.removeChild(t); } }, 350);
    }, duration || 3200);
  }

  /* ═══════════════════════ 4. MODALE GÉNÉRIQUE ════════════════════════════ */
  var modalState = { lastFocus: null, open: false };

  function openModal(title, icon, bodyBuilder) {
    var root = $('#modal-root');
    if (!root) { return null; }
    modalState.lastFocus = document.activeElement;
    $('#modal-title').innerHTML =
      (icon ? '<i class="' + icon + '" aria-hidden="true"></i> ' : '') + escapeHTMLText(title);
    var body = $('#modal-body');
    body.innerHTML = '';
    if (typeof bodyBuilder === 'function') { bodyBuilder(body); }
    root.hidden = false;
    modalState.open = true;
    var first = body.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (first) { first.focus(); }
    return body;
  }

  function closeModal() {
    var root = $('#modal-root');
    if (!root || root.hidden) { return; }
    root.hidden = true;
    modalState.open = false;
    $('#modal-body').innerHTML = '';
    if (modalState.lastFocus && modalState.lastFocus.focus) { modalState.lastFocus.focus(); }
  }

  function initModal() {
    var root = $('#modal-root');
    if (!root) { return; }
    $$('[data-modal-close]', root).forEach(function (elx) {
      elx.addEventListener('click', closeModal);
    });
    document.addEventListener('keydown', function (e) {
      if (!modalState.open) { return; }
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key === 'Tab') { /* piège de focus simple */
        var focusables = $$('#modal-root button, #modal-root [href], #modal-root input, #modal-root select, #modal-root textarea, #modal-root [tabindex]:not([tabindex="-1"])')
          .filter(function (n) { return !n.disabled && n.offsetParent !== null; });
        if (!focusables.length) { return; }
        var first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ═══════════════════════ 5. COPIE CLIPBOARD ═════════════════════════════ */
  function copyText(text, okMsg) {
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        toast(ok ? (okMsg || 'Copié dans le presse-papiers.') : 'Copie impossible dans ce contexte.', ok ? 'success' : 'error');
      } catch (err) {
        toast('Copie impossible dans ce contexte.', 'error');
      }
    }
    if (navigator.clipboard && window.isSecureContext !== false && location.protocol.indexOf('http') === 0) {
      navigator.clipboard.writeText(text).then(function () {
        toast(okMsg || 'Copié dans le presse-papiers.', 'success');
      }, fallback);
    } else {
      fallback();
    }
  }

  function registerCopyText(rawText) {
    var id = 'copy-' + (++copyCounter);
    COPY_REGISTRY[id] = rawText;
    return id;
  }

  function initCopyDelegation() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-copy-id]') : null;
      if (!btn) { return; }
      var text = COPY_REGISTRY[btn.getAttribute('data-copy-id')];
      if (typeof text === 'string') { copyText(text, btn.getAttribute('data-copy-msg') || undefined); }
    });
  }

  /* ═══════════════════════ 6. PROGRESSION / VISITES ═══════════════════════ */
  function getVisited() {
    var v = U.safeStorage.get(STORAGE.visited, []);
    return Array.isArray(v) ? v : [];
  }
  function markVisited(id) {
    var v = getVisited();
    if (v.indexOf(id) === -1) {
      v.push(id);
      U.safeStorage.set(STORAGE.visited, v);
    }
    updateProgress();
  }
  function updateProgress() {
    var total = PV.sections.length || 1;
    var pct = Math.round(getVisited().length / total * 100);
    var bar = $('#global-progress-bar');
    var wrap = $('#global-progress');
    if (bar) { bar.style.width = pct + '%'; }
    if (wrap) { wrap.setAttribute('aria-valuenow', String(pct)); }
  }

  /* ═══════════════════════ 7. SIDEBAR (tracks + filtre) ═══════════════════ */
  var currentFilter = 'all';

  function initFilter() {
    currentFilter = U.safeStorage.get(STORAGE.filter, 'all');
    var wrap = $('#level-filters');
    if (!wrap) { return; }
    $$('.chip', wrap).forEach(function (chip) {
      var lvl = chip.getAttribute('data-level');
      chip.classList.toggle('is-active', lvl === currentFilter);
      chip.setAttribute('aria-pressed', String(lvl === currentFilter));
      chip.addEventListener('click', function () {
        currentFilter = lvl;
        U.safeStorage.set(STORAGE.filter, lvl);
        $$('.chip', wrap).forEach(function (c) {
          var on = c.getAttribute('data-level') === lvl;
          c.classList.toggle('is-active', on);
          c.setAttribute('aria-pressed', String(on));
        });
        applyFilter();
      });
    });
  }

  function applyFilter() {
    $$('#nav-tree .nav-link').forEach(function (link) {
      var lvl = link.getAttribute('data-level');
      var hide = currentFilter !== 'all' && lvl !== currentFilter;
      link.classList.toggle('is-filtered-out', hide);
    });
  }

  function buildSidebar() {
    var tree = $('#nav-tree');
    if (!tree) { return; }
    tree.innerHTML = '';
    Object.keys(PV.tracks).forEach(function (trackId) {
      var track = PV.tracks[trackId];
      var secs = PV.sectionsByTrack(trackId);
      if (!secs.length) { return; }

      var box = document.createElement('div');
      box.className = 'nav-track';
      box.setAttribute('data-track', trackId);

      var head = document.createElement('button');
      head.type = 'button';
      head.className = 'nav-track-head';
      head.setAttribute('aria-expanded', 'false');
      head.innerHTML =
        '<i class="' + track.icon + ' nt-ico" aria-hidden="true"></i>' +
        '<span>' + escapeHTMLText(track.label) + '</span>' +
        '<span class="nt-count">' + secs.length + '</span>' +
        '<i class="fa-solid fa-chevron-right nt-caret" aria-hidden="true"></i>';
      head.addEventListener('click', function () {
        var open = box.classList.toggle('open');
        head.setAttribute('aria-expanded', String(open));
      });
      box.appendChild(head);

      var body = document.createElement('div');
      body.className = 'nav-track-body';
      secs.forEach(function (s) {
        var a = document.createElement('a');
        a.className = 'nav-link';
        a.href = '#/' + s.id;
        a.setAttribute('data-section', s.id);
        a.setAttribute('data-level', s.level);
        var visited = getVisited().indexOf(s.id) !== -1;
        if (visited) { a.classList.add('is-visited'); }
        a.innerHTML =
          '<span class="nl-step" aria-hidden="true">' + escapeHTMLText(String(s.step)) + '</span>' +
          '<span class="nl-title">' + escapeHTMLText(s.title) + '</span>' +
          '<span class="nl-lvl ' + s.level + '" title="' + PV.levels[s.level].label + '" aria-hidden="true"></span>';
        body.appendChild(a);
      });
      box.appendChild(body);
      tree.appendChild(box);
    });
    applyFilter();
  }

  function syncSidebarActive(id) {
    $$('#nav-tree .nav-link').forEach(function (link) {
      var active = link.getAttribute('data-section') === id;
      link.classList.toggle('is-active', active);
      if (active) {
        link.classList.add('is-visited');
        var track = link.closest('.nav-track');
        if (track && !track.classList.contains('open')) {
          track.classList.add('open');
          var head = track.querySelector('.nav-track-head');
          if (head) { head.setAttribute('aria-expanded', 'true'); }
        }
      }
    });
  }

  function initSidebarToggle() {
    var sidebar = $('#sidebar');
    var burger = $('#btn-sidebar');
    var backdrop = $('#sidebar-backdrop');
    if (!sidebar || !burger || !backdrop) { return; }
    function close() {
      sidebar.classList.remove('is-open');
      backdrop.hidden = true;
      burger.setAttribute('aria-expanded', 'false');
    }
    burger.addEventListener('click', function () {
      var open = sidebar.classList.toggle('is-open');
      backdrop.hidden = !open;
      burger.setAttribute('aria-expanded', String(open));
    });
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('is-open')) { close(); }
    });
    sidebar.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.nav-link') && window.innerWidth <= 980) { close(); }
    });
  }

  function initResetProgress() {
    var btn = $('#btn-reset-progress');
    if (!btn) { return; }
    btn.addEventListener('click', function () {
      openModal('Réinitialiser la progression ?', 'fa-solid fa-triangle-exclamation', function (body) {
        var p = document.createElement('p');
        p.textContent = 'Cette action efface les sections visitées, les filtres, les scores de quiz et les checklists mémorisées. Le thème est conservé.';
        body.appendChild(p);
        var row = document.createElement('div');
        row.className = 'sec-actions';
        var yes = document.createElement('button');
        yes.type = 'button';
        yes.className = 'btn btn-danger';
        yes.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i> Réinitialiser';
        yes.addEventListener('click', function () {
          [STORAGE.visited, STORAGE.last, STORAGE.filter].forEach(function (k) { U.safeStorage.remove(k); });
          Object.keys(window.localStorage || {}).forEach(function (k) {
            if (k.indexOf(STORAGE.checkPrefix) === 0 || k.indexOf(STORAGE.quizPrefix) === 0) {
              try { window.localStorage.removeItem(k); } catch (err) { /* ignoré */ }
            }
          });
          currentFilter = 'all';
          initFilter();
          buildSidebar();
          updateProgress();
          closeModal();
          toast('Progression réinitialisée.', 'success');
        });
        var no = document.createElement('button');
        no.type = 'button';
        no.className = 'btn';
        no.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i> Annuler';
        no.addEventListener('click', closeModal);
        row.appendChild(yes);
        row.appendChild(no);
        body.appendChild(row);
      });
    });
  }

  /* ═══════════════════════ 8. RECHERCHE ═══════════════════════════════════ */
  var searchIndex = [];

  function buildSearchIndex() {
    searchIndex = [];
    PV.sections.forEach(function (s) {
      var hay = [s.title, s.description || ''];
      (s.concepts || []).forEach(function (c) { hay.push(c.term, c.def); });
      (s.cliCommands || []).forEach(function (c) { hay.push(c); });
      (s.terminology || []).forEach(function (t) { hay.push(t); });
      (s.guiSteps || []).forEach(function (g) { hay.push(g.replace(/<[^>]+>/g, ' ')); });
      searchIndex.push({
        kind: 'section', id: s.id, title: s.title, step: String(s.step),
        track: s.track, text: hay.join(' \n ').toLowerCase()
      });
    });
    Object.keys(PV.glossary).forEach(function (term) {
      searchIndex.push({
        kind: 'term', id: term, title: term, step: '',
        track: null, text: (term + ' ' + PV.glossary[term]).toLowerCase()
      });
    });
  }

  function makeSnippet(text, query) {
    var idx = text.indexOf(query);
    if (idx === -1) { return text.slice(0, 90) + (text.length > 90 ? '…' : ''); }
    var from = Math.max(0, idx - 34);
    var raw = text.slice(from, from + 96) + (from + 96 < text.length ? '…' : '');
    var safe = escapeHTMLText(raw);
    var re = new RegExp('(' + U.escapeRegExp(escapeHTMLText(query)) + ')', 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  }

  function runSearch(query) {
    var box = $('#search-results');
    var input = $('#search-input');
    if (!box || !input) { return; }
    var q = query.trim().toLowerCase();
    if (q.length < 2) {
      box.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      box.innerHTML = '';
      return;
    }
    var scored = [];
    searchIndex.forEach(function (item) {
      var pos = item.text.indexOf(q);
      if (pos === -1) { return; }
      var score = 0;
      if (item.title.toLowerCase().indexOf(q) === 0) { score += 60; }
      else if (item.title.toLowerCase().indexOf(q) !== -1) { score += 30; }
      if (pos < 40) { score += 10; }
      if (item.kind === 'section') { score += 6; }
      scored.push({ item: item, score: score, pos: pos });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    var top = scored.slice(0, 14);

    box.innerHTML = '';
    if (!top.length) {
      box.appendChild(document.createElement('div')).className = 'search-empty';
      box.lastChild.textContent = 'Aucun résultat pour « ' + query.trim() + ' ».';
    } else {
      top.forEach(function (hit) {
        var item = hit.item;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'search-result';
        b.setAttribute('role', 'option');
        var label = item.kind === 'section'
          ? '<span class="sr-title"><i class="fa-solid fa-bookmark" aria-hidden="true"></i> ' +
            escapeHTMLText('' + item.step + ' · ' + item.title) + '</span>'
          : '<span class="sr-title"><i class="fa-solid fa-book" aria-hidden="true"></i> ' + escapeHTMLText(item.title) +
            ' <small style="opacity:.6">(glossaire)</small></span>';
        var snippetSource = item.kind === 'section' ? item.text : item.text;
        b.innerHTML = label + '<span class="sr-snippet">' + makeSnippet(snippetSource, q) + '</span>';
        b.addEventListener('click', function () {
          if (item.kind === 'section') {
            window.location.hash = '#/' + item.id;
          } else {
            openGlossaryAt(item.id);
          }
          box.hidden = true;
          input.setAttribute('aria-expanded', 'false');
          input.value = '';
        });
        box.appendChild(b);
      });
    }
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function initSearch() {
    var input = $('#search-input');
    var box = $('#search-results');
    if (!input || !box) { return; }
    input.addEventListener('input', function () { runSearch(input.value); });
    input.addEventListener('focus', function () { if (input.value.trim().length >= 2) { runSearch(input.value); } });
    document.addEventListener('click', function (e) {
      if (!e.target.closest || (!e.target.closest('.topbar-search'))) {
        box.hidden = true;
        input.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement &&
          !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !modalState.open) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  /* ═══════════════════════ 9. ROUTEUR + RENDU DE SECTION ══════════════════ */
  function currentSectionId() {
    var m = window.location.hash.match(/^#\/([a-z0-9-]+)$/);
    return m ? m[1] : null;
  }

  function escapeHTMLText(str) {
    return U.escapeHTML(String(str === undefined || str === null ? '' : str));
  }

  function renderSection(id, opts) {
    opts = opts || {};
    var sec = PV.sectionById[id];
    if (!sec) { sec = PV.sections[0]; }
    if (!sec) { return; }
    if (!opts.silentHash && currentSectionId() !== sec.id) {
      window.location.hash = '#/' + sec.id;
      return; /* le hashchange relancera le rendu */
    }

    var root = $('#section-content');
    if (!root) { return; }
    root.innerHTML = '';
    COPY_REGISTRY = {};

    /* — En-tête — */
    var head = document.createElement('header');
    head.className = 'sec-head';
    var idx = PV.sections.indexOf(sec);
    var prev = idx > 0 ? PV.sections[idx - 1] : null;
    var next = idx < PV.sections.length - 1 ? PV.sections[idx + 1] : null;

    var badges = document.createElement('div');
    badges.className = 'sec-badges';
    var track = PV.tracks[sec.track];
    badges.innerHTML =
      '<span class="badge badge-track"><i class="' + track.icon + '" aria-hidden="true"></i> ' + escapeHTMLText(track.label) + '</span>' +
      '<span class="badge badge-' + sec.level + '"><i class="fa-solid fa-gauge" aria-hidden="true"></i> ' + escapeHTMLText(PV.levels[sec.level].label) + '</span>' +
      '<span class="badge badge-step"><i class="fa-solid fa-hashtag" aria-hidden="true"></i> Section ' + escapeHTMLText(String(sec.step)) + ' / ' + String(PV.sections.length - 1).padStart(2, '0') + '</span>';
    head.appendChild(badges);

    var h1 = document.createElement('h1');
    h1.className = 'sec-title';
    h1.innerHTML = '<i class="' + (sec.icon || 'fa-solid fa-circle-nodes') + '" aria-hidden="true"></i><span></span>';
    h1.querySelector('span').textContent = sec.title;
    h1.setAttribute('tabindex', '-1');
    head.appendChild(h1);

    if (sec.description) {
      var desc = document.createElement('p');
      desc.className = 'sec-desc';
      desc.textContent = sec.description;
      head.appendChild(desc);
    }

    if (sec.requires && sec.requires.length) {
      var req = document.createElement('div');
      req.className = 'sec-requires';
      req.innerHTML = '<i class="fa-solid fa-link" aria-hidden="true"></i> <strong>Prérequis :</strong>';
      sec.requires.forEach(function (rid) {
        var r = PV.sectionById[rid];
        if (!r) { return; }
        var a = document.createElement('a');
        a.className = 'req-link';
        a.href = '#/' + r.id;
        a.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> ' + escapeHTMLText('' + r.step + ' ' + r.title);
        req.appendChild(a);
      });
      head.appendChild(req);
    }
    root.appendChild(head);

    /* — Diagramme — */
    if (sec.diagram && PV.diagrams[sec.diagram]) {
      var dwrap = document.createElement('div');
      dwrap.className = 'sec-block';
      dwrap.innerHTML = '<h2><i class="fa-solid fa-diagram-project" aria-hidden="true"></i> Schéma</h2>';
      var dbox = document.createElement('div');
      try { dbox.innerHTML = PV.diagrams[sec.diagram](); } catch (err) { dbox.textContent = '[diagramme indisponible]'; }
      dwrap.appendChild(dbox);
      root.appendChild(dwrap);
    }

    /* — Étapes GUI — */
    if (sec.guiSteps && sec.guiSteps.length) {
      var gw = document.createElement('div');
      gw.className = 'sec-block';
      gw.innerHTML = '<h2><i class="fa-solid fa-computer-mouse" aria-hidden="true"></i> Procédure via l\'interface Web (GUI)</h2>' +
        '<ol class="gui-steps">' + sec.guiSteps.map(function (g) { return '<li>' + g + '</li>'; }).join('') + '</ol>';
      root.appendChild(gw);
    }

    /* — Commandes CLI — */
    if (sec.cliCommands && sec.cliCommands.length) {
      var cw = document.createElement('div');
      cw.className = 'sec-block';
      cw.innerHTML = '<h2><i class="fa-solid fa-terminal" aria-hidden="true"></i> Commandes CLI</h2>';
      var group = document.createElement('div');
      group.className = 'cli-group';
      sec.cliCommands.forEach(function (cmd, i) {
        var block = document.createElement('div');
        block.className = 'cli-block';
        var ch = document.createElement('div');
        ch.className = 'cli-head';
        var cid = registerCopyText(cmd);
        ch.innerHTML = '<i class="fa-solid fa-code" aria-hidden="true"></i> Bloc ' + (i + 1) +
          '<span class="cli-actions"><button type="button" class="cli-copy" data-copy-id="' + cid + '">' +
          '<i class="fa-solid fa-copy" aria-hidden="true"></i> Copier</button></span>';
        var pre = document.createElement('pre');
        var code = document.createElement('code');
        code.textContent = cmd;
        pre.appendChild(code);
        block.appendChild(ch);
        block.appendChild(pre);
        group.appendChild(block);
      });
      cw.appendChild(group);
      var copyAllWrap = document.createElement('div');
      copyAllWrap.className = 'copy-all-wrap';
      var copyAll = document.createElement('button');
      copyAll.type = 'button';
      copyAll.className = 'cli-copy';
      var allId = registerCopyText(sec.cliCommands.join('\n\n'));
      copyAll.setAttribute('data-copy-id', allId);
      copyAll.setAttribute('data-copy-msg', 'Tous les blocs CLI de la section ont été copiés.');
      copyAll.innerHTML = '<i class="fa-solid fa-clipboard-list" aria-hidden="true"></i> Tout copier (section)';
      copyAllWrap.appendChild(copyAll);
      cw.appendChild(copyAllWrap);
      root.appendChild(cw);
    }

    /* — Alertes — */
    if (sec.alerts && sec.alerts.length) {
      sec.alerts.forEach(function (al) {
        var type = ['warning', 'info', 'danger', 'success'].indexOf(al.type) !== -1 ? al.type : 'info';
        var d = document.createElement('div');
        d.className = 'alert alert-' + type;
        d.setAttribute('role', type === 'warning' || type === 'danger' ? 'alert' : 'note');
        d.innerHTML = '<i class="' + (al.icon || 'fa-circle-info') + '" aria-hidden="true"></i><div></div>';
        d.lastElementChild.textContent = al.text || '';
        root.appendChild(d);
      });
    }

    /* — Concepts clés — */
    if (sec.concepts && sec.concepts.length) {
      var kw = document.createElement('div');
      kw.className = 'sec-block';
      kw.innerHTML = '<h2><i class="fa-solid fa-key" aria-hidden="true"></i> Concepts clés</h2>';
      var dl = document.createElement('dl');
      dl.className = 'concepts';
      sec.concepts.forEach(function (c) {
        var div = document.createElement('div');
        div.className = 'concept';
        var dt = document.createElement('dt');
        dt.textContent = c.term;
        var dd = document.createElement('dd');
        dd.textContent = c.def;
        div.appendChild(dt);
        div.appendChild(dd);
        dl.appendChild(div);
      });
      kw.appendChild(dl);
      root.appendChild(kw);
    }

    /* — Tableau récapitulatif — */
    if (sec.table && Array.isArray(sec.table.headers) && Array.isArray(sec.table.rows)) {
      var tw = document.createElement('div');
      tw.className = 'sec-block';
      tw.innerHTML = '<h2><i class="fa-solid fa-table-list" aria-hidden="true"></i> Tableau récapitulatif</h2>';
      var wrapT = document.createElement('div');
      wrapT.className = 'table-wrap';
      var table = document.createElement('table');
      table.className = 'pv-table';
      var thead = document.createElement('thead');
      var trh = document.createElement('tr');
      sec.table.headers.forEach(function (hcell) {
        var th = document.createElement('th');
        th.scope = 'col';
        th.textContent = hcell;
        trh.appendChild(th);
      });
      thead.appendChild(trh);
      var tbody = document.createElement('tbody');
      sec.table.rows.forEach(function (row) {
        var tr = document.createElement('tr');
        row.forEach(function (cell) {
          var td = document.createElement('td');
          td.textContent = cell;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(thead);
      table.appendChild(tbody);
      wrapT.appendChild(table);
      tw.appendChild(wrapT);
      root.appendChild(tw);
    }

    /* — Labs : étapes numérotées — */
    if (sec.steps && sec.steps.length) {
      var lw = document.createElement('div');
      lw.className = 'sec-block';
      lw.innerHTML = '<h2><i class="fa-solid fa-flask" aria-hidden="true"></i> Déroulé du laboratoire</h2>';
      var ol = document.createElement('ol');
      ol.className = 'lab-steps';
      sec.steps.forEach(function (st) {
        var li = document.createElement('li');
        var h4 = document.createElement('h4');
        h4.textContent = st.title || '';
        var p = document.createElement('p');
        p.textContent = st.detail || '';
        li.appendChild(h4);
        li.appendChild(p);
        ol.appendChild(li);
      });
      lw.appendChild(ol);
      root.appendChild(lw);
    }

    /* — Checklist (labs) — */
    if (sec.checklist && sec.checklist.length) {
      var ck = document.createElement('div');
      ck.className = 'sec-block';
      ck.innerHTML = '<h2><i class="fa-solid fa-list-check" aria-hidden="true"></i> Checklist de validation</h2>';
      var ul = document.createElement('ul');
      ul.className = 'checklist';
      var saved = U.safeStorage.get(STORAGE.checkPrefix + sec.id, []);
      sec.checklist.forEach(function (item, i) {
        var li = document.createElement('li');
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = 'ck-' + sec.id + '-' + i;
        cb.checked = saved.indexOf(i) !== -1;
        cb.addEventListener('change', function () {
          var arr = U.safeStorage.get(STORAGE.checkPrefix + sec.id, []);
          var at = arr.indexOf(i);
          if (cb.checked && at === -1) { arr.push(i); }
          if (!cb.checked && at !== -1) { arr.splice(at, 1); }
          U.safeStorage.set(STORAGE.checkPrefix + sec.id, arr);
          if (cb.checked) { toast('Étape validée ✔', 'success', 1500); }
        });
        var span = document.createElement('span');
        span.textContent = item;
        li.appendChild(cb);
        li.appendChild(span);
        li.addEventListener('click', function (e) {
          if (e.target !== cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }
        });
        ul.appendChild(li);
      });
      ck.appendChild(ul);
      root.appendChild(ck);
    }

    /* — Terminologie — */
    if (sec.terminology && sec.terminology.length) {
      var tm = document.createElement('div');
      tm.className = 'sec-block';
      tm.innerHTML = '<h2><i class="fa-solid fa-book-open" aria-hidden="true"></i> Terminologie de la section</h2>';
      var chips = document.createElement('div');
      chips.className = 'terminology';
      sec.terminology.forEach(function (term) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'term-chip';
        b.innerHTML = '<i class="fa-solid fa-book" aria-hidden="true"></i> ' + escapeHTMLText(term);
        b.setAttribute('aria-label', 'Voir la définition de ' + term + ' dans le glossaire');
        b.addEventListener('click', function () { openGlossaryAt(term); });
        chips.appendChild(b);
      });
      tm.appendChild(chips);
      root.appendChild(tm);
    }

    /* — Actions : quiz + outils — */
    var actions = document.createElement('div');
    actions.className = 'sec-actions';
    if (PV.quiz[sec.id]) {
      var qbtn = document.createElement('button');
      qbtn.type = 'button';
      qbtn.className = 'btn btn-primary';
      qbtn.innerHTML = '<i class="fa-solid fa-circle-question" aria-hidden="true"></i> Tester mes connaissances (' + PV.quiz[sec.id].length + ' questions)';
      var best = U.safeStorage.get(STORAGE.quizPrefix + sec.id, null);
      if (best !== null) { qbtn.title = 'Meilleur score : ' + best + ' %'; }
      qbtn.addEventListener('click', function () {
        openModal('Quiz — ' + sec.title, 'fa-solid fa-circle-question', function (body) {
          window.QuizEngine.start({
            title: 'Quiz · ' + sec.title,
            bank: PV.quiz[sec.id],
            storageKey: STORAGE.quizPrefix + sec.id,
            container: body
          });
        });
      });
      actions.appendChild(qbtn);
    }
    var pdfBtn = document.createElement('button');
    pdfBtn.type = 'button';
    pdfBtn.className = 'btn';
    pdfBtn.innerHTML = '<i class="fa-solid fa-file-pdf" aria-hidden="true"></i> Exporter en PDF';
    pdfBtn.addEventListener('click', exportSectionPDF);
    actions.appendChild(pdfBtn);
    root.appendChild(actions);

    /* — Navigation précédent / suivant — */
    var nav = document.createElement('nav');
    nav.className = 'sec-nav';
    nav.setAttribute('aria-label', 'Navigation entre sections');
    nav.innerHTML =
      (prev ? '<a href="#/' + prev.id + '" class="sn-prev"><span class="sn-label"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Précédent</span>' +
        '<span class="sn-title">' + escapeHTMLText(String(prev.step)) + ' ' + escapeHTMLText(prev.title) + '</span></a>' : '<span></span>') +
      (next ? '<a href="#/' + next.id + '" class="sn-next"><span class="sn-label">Suivant <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>' +
        '<span class="sn-title">' + escapeHTMLText(String(next.step)) + ' ' + escapeHTMLText(next.title) + '</span></a>' : '<span></span>');
    root.appendChild(nav);

    /* — Post-rendu — */
    markVisited(sec.id);
    U.safeStorage.set(STORAGE.last, sec.id);
    syncSidebarActive(sec.id);
    updateContextualGlossary(sec);
    if (!opts.keepScroll) {
      var mainEl = $('#main');
      if (mainEl) { mainEl.scrollTop = 0; window.scrollTo({ top: 0, behavior: 'auto' }); }
    }
    if (!opts.silentHash) { document.title = '' + sec.step + ' ' + sec.title + ' — Guide Proxmox VE'; }
  }

  /* ═══════════════════════ 10. GLOSSAIRE CONTEXTUEL ═══════════════════════ */
  function glossaryPanelOpen() {
    var panel = $('#glossary-panel');
    return panel && !panel.hidden;
  }

  function openGlossaryPanel() {
    var panel = $('#glossary-panel');
    if (!panel) { return; }
    panel.hidden = false;
    panel.classList.add('is-open');
    U.safeStorage.set(STORAGE.glossaryHidden, false);
  }

  function openGlossaryAt(term) {
    openGlossaryPanel();
    renderGlossary($('#glossary-search') ? $('#glossary-search').value : '');
    window.setTimeout(function () {
      var target = $('#glossary-list [data-term="' + CSS.escape(term) + '"]');
      if (target) {
        target.classList.add('is-highlight');
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 60);
  }

  function renderGlossary(filterText, contextTerms) {
    var list = $('#glossary-list');
    if (!list) { return; }
    var q = (filterText || '').trim().toLowerCase();
    var terms;
    if (!q && contextTerms && contextTerms.length) {
      terms = contextTerms.slice();
    } else {
      terms = Object.keys(PV.glossary).sort(function (a, b) { return a.localeCompare(b, 'fr'); });
      if (q) {
        terms = terms.filter(function (t) {
          return t.toLowerCase().indexOf(q) !== -1 || PV.glossary[t].toLowerCase().indexOf(q) !== -1;
        });
      }
    }
    list.innerHTML = '';
    if (!terms.length) {
      list.innerHTML = '<p class="glossary-empty">Aucun terme ne correspond.</p>';
      return;
    }
    terms.forEach(function (term) {
      var def = PV.glossary[term];
      if (def === undefined) { return; }
      var item = document.createElement('div');
      item.className = 'glossary-item';
      item.setAttribute('data-term', term);
      item.innerHTML = '<dt><i class="fa-solid fa-angles-right" aria-hidden="true"></i> ' + escapeHTMLText(term) + '</dt>' +
        '<dd>' + escapeHTMLText(def) + '</dd>';
      list.appendChild(item);
    });
  }

  function updateContextualGlossary(sec) {
    renderGlossary('', sec.terminology || []);
  }

  function initGlossaryPanel() {
    var panel = $('#glossary-panel');
    if (!panel) { return; }
    var closeBtn = $('#glossary-close');
    var search = $('#glossary-search');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        panel.hidden = true;
        panel.classList.remove('is-open');
        U.safeStorage.set(STORAGE.glossaryHidden, true);
      });
    }
    if (search) {
      search.addEventListener('input', function () { renderGlossary(search.value); });
    }
    /* Grand écran : panneau ouvert par défaut sauf si l'utilisateur l'a fermé */
    if (window.innerWidth > 1280 && U.safeStorage.get(STORAGE.glossaryHidden, false) === false) {
      openGlossaryPanel();
    }
  }

  /* ═══════════════════════ 11. OUTILS ═════════════════════════════════════ */
  function registerFinalQuizTool() {
    PV.addTool({
      id: 'final-quiz',
      name: 'Quiz final',
      icon: 'fa-solid fa-graduation-cap',
      description: 'Évaluation complète : 20 questions tirées de l\'ensemble du guide. Seuil de réussite : 70 %.',
      render: function (body) {
        window.QuizEngine.start({
          title: 'Quiz final — Proxmox VE de A à Z',
          bank: window.QuizEngine.buildFinalBank(20),
          storageKey: STORAGE.quizPrefix + 'final',
          container: body
        });
      }
    });
    PV.addTool({
      id: 'full-glossary',
      name: 'Glossaire complet',
      icon: 'fa-solid fa-book-open-reader',
      description: 'Tous les termes du guide (' + Object.keys(PV.glossary).length + ' entrées) avec recherche instantanée.',
      render: function (body) {
        var input = document.createElement('input');
        input.type = 'search';
        input.placeholder = 'Filtrer les termes…';
        input.setAttribute('aria-label', 'Filtrer les termes du glossaire');
        input.style.cssText = 'width:100%;height:38px;padding:0 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-code);color:var(--fg);margin-bottom:12px;';
        var listEl = document.createElement('div');
        listEl.style.cssText = 'max-height:56vh;overflow-y:auto;';
        function fill() {
          var q = input.value.trim().toLowerCase();
          listEl.innerHTML = '';
          var keys = Object.keys(PV.glossary).sort(function (a, b) { return a.localeCompare(b, 'fr'); });
          if (q) { keys = keys.filter(function (t) { return t.toLowerCase().indexOf(q) !== -1 || PV.glossary[t].toLowerCase().indexOf(q) !== -1; }); }
          keys.forEach(function (t) {
            var item = document.createElement('div');
            item.className = 'glossary-item';
            item.innerHTML = '<dt><i class="fa-solid fa-angles-right" aria-hidden="true"></i> ' + escapeHTMLText(t) + '</dt><dd>' + escapeHTMLText(PV.glossary[t]) + '</dd>';
            listEl.appendChild(item);
          });
          if (!keys.length) { listEl.innerHTML = '<p class="glossary-empty">Aucun terme trouvé.</p>'; }
        }
        input.addEventListener('input', fill);
        body.appendChild(input);
        body.appendChild(listEl);
        fill();
      }
    });
  }

  function initToolsMenu() {
    var btn = $('#btn-tools');
    if (!btn) { return; }
    btn.addEventListener('click', function () {
      openModal('Outils du guide', 'fa-solid fa-toolbox', function (body) {
        var menu = document.createElement('div');
        menu.className = 'tools-menu';
        PV.tools.forEach(function (tool) {
          var card = document.createElement('button');
          card.type = 'button';
          card.className = 'tool-card';
          card.innerHTML = '<i class="' + tool.icon + '" aria-hidden="true"></i><strong>' + escapeHTMLText(tool.name) + '</strong><span>' + escapeHTMLText(tool.description || '') + '</span>';
          card.addEventListener('click', function () {
            openModal(tool.name, tool.icon, tool.render);
          });
          menu.appendChild(card);
        });
        body.appendChild(menu);
      });
    });
  }

  /* ═══════════════════════ 12. EXPORT PDF ═════════════════════════════════ */
  function exportSectionPDF() {
    var sec = PV.sectionById[currentSectionId()] || PV.sections[0];
    if (!sec) { return; }
    var cssURL = new URL('css/styles.css', window.location.href).href;
    var faURL = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';
    var printJS = new URL('js/print-window.js', window.location.href).href;
    var popup = null;
    try { popup = window.open('', '_blank', 'width=900,height=700'); } catch (err) { popup = null; }
    if (!popup) {
      toast('Fenêtre bloquée : la boîte d\'impression locale s\'ouvre à la place.', 'warning');
      window.print();
      return;
    }
    var doc = popup.document;
    doc.open();
    doc.write('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
      '<title>' + U.escapeHTML('' + sec.step + ' ' + sec.title) + ' — Guide Proxmox VE</title>' +
      '<link rel="stylesheet" href="' + U.escapeHTML(faURL) + '">' +
      '<link rel="stylesheet" href="' + U.escapeHTML(cssURL) + '">' +
      '<script src="' + U.escapeHTML(printJS) + '"><\/script>' +
      '</head><body><div class="app-shell"><main class="main" style="max-width:none">' +
      '<div class="section-content">' + $('#section-content').innerHTML + '</div>' +
      '</main></div></body></html>');
    doc.close();
    toast('Fenêtre d\'export ouverte : utilisez « Imprimer → Enregistrer au format PDF ».', 'info', 4200);
  }

  /* ═══════════════════════ 13. NAVIGATION CLAVIER + ROUTAGE ═══════════════ */
  function initKeyboardNav() {
    document.addEventListener('keydown', function (e) {
      if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !modalState.open) {
        var cur = PV.sectionById[currentSectionId()];
        if (!cur) { return; }
        var idx = PV.sections.indexOf(cur);
        var target = e.key === 'ArrowRight' ? PV.sections[idx + 1] : PV.sections[idx - 1];
        if (target) {
          e.preventDefault();
          window.location.hash = '#/' + target.id;
        }
      }
    });
  }

  function initRouter() {
    window.addEventListener('hashchange', function () {
      var id = currentSectionId();
      if (id && PV.sectionById[id]) {
        renderSection(id);
      }
    });
  }

  /* ═══════════════════════ 14. PWA ════════════════════════════════════════ */
  function initServiceWorker() {
    if (!('serviceWorker' in navigator)) { return; }
    if (location.protocol.indexOf('http') !== 0) { return; } /* file:// : pas de SW */
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function () {
        toast('Mode hors ligne disponible (PWA).', 'info', 2600);
      }, function () { /* SW indisponible : silencieux */ });
    });
  }

  /* ═══════════════════════ 15. BOOT ═══════════════════════════════════════ */
  function boot() {
    var verEl = $('#footer-version');
    if (verEl) { verEl.textContent = 'v' + PV.version; }

    initTheme();
    initModal();
    initCopyDelegation();
    initFilter();
    buildSidebar();
    updateProgress();
    initSidebarToggle();
    initResetProgress();
    buildSearchIndex();
    initSearch();
    initGlossaryPanel();
    registerFinalQuizTool();
    initToolsMenu();
    initKeyboardNav();
    initRouter();
    initServiceWorker();

    document.title = PV.appName + ' — CFP-CMD';
    initSplash();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();