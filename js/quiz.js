/* ═══════════════════════════════════════════════════════════════════════════
   quiz.js — Moteur de quiz du guide Proxmox VE (CFP-CMD)
   QCM par section + quiz final. Scores mémorisés (seuil 70 %).
   Le rendu se fait dans un conteneur fourni par app.js (modale ou page).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var PV = window.PV;
  var PASS_THRESHOLD = 70;

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (html !== undefined) { n.innerHTML = html; }
    return n;
  }

  /**
   * QuizEngine.start(options)
   *  - title      : titre affiché
   *  - bank       : [[question, [options], correctIdx, explanation], ...]
   *  - storageKey : clé localStorage des scores (ex. 'pv.quiz.intro' / 'pv.quiz.final')
   *  - container  : noeud DOM cible
   *  - onFinish   : callback optionnel (score, total, pct, passed)
   */
  function start(options) {
    var container = options.container;
    var bank = (options.bank || []).slice();
    var storageKey = options.storageKey || 'pv.quiz.misc';
    if (!bank.length) {
      container.appendChild(el('p', 'glossary-empty', 'Aucune question disponible pour ce quiz.'));
      return;
    }

    /* Mélange : questions puis options (en conservant l'index de la bonne réponse) */
    var questions = PV.util.shuffle(bank).map(function (q) {
      var opts = q[1].map(function (text, i) { return { text: text, correct: i === q[2] }; });
      opts = PV.util.shuffle(opts);
      var correctIdx = opts.findIndex(function (o) { return o.correct; });
      return { q: q[0], opts: opts, correct: correctIdx, expl: q[3] };
    });

    var state = { idx: 0, score: 0, answered: false };
    var keys = ['A', 'B', 'C', 'D', 'E', 'F'];

    function renderIntro() {
      container.innerHTML = '';
      var wrap = el('div', 'quiz-intro');
      var best = PV.util.safeStorage.get(storageKey, null);
      var bestHtml = best !== null
        ? '<span class="quiz-score-best"><i class="fa-solid fa-trophy" aria-hidden="true"></i> Meilleur score : ' + best + ' %</span><br>'
        : '';
      wrap.innerHTML =
        '<i class="fa-solid fa-circle-question" aria-hidden="true"></i>' +
        '<h3>' + (options.title || 'Quiz') + '</h3>' +
        '<p>' + questions.length + ' questions · seuil de réussite ' + PASS_THRESHOLD + ' % · questions et réponses mélangées</p>' +
        bestHtml;
      var btn = el('button', 'btn btn-primary');
      btn.type = 'button';
      btn.innerHTML = '<i class="fa-solid fa-play" aria-hidden="true"></i> Démarrer le quiz';
      btn.addEventListener('click', function () { renderQuestion(); });
      wrap.appendChild(btn);
      container.appendChild(wrap);
      var focusables = wrap.querySelectorAll('button');
      if (focusables.length) { focusables[0].focus(); }
    }

    function renderQuestion() {
      container.innerHTML = '';
      state.answered = false;
      var cur = questions[state.idx];

      var head = el('div', 'quiz-head');
      var barWrap = el('div', 'quiz-progress');
      barWrap.setAttribute('role', 'progressbar');
      barWrap.setAttribute('aria-valuemin', '0');
      barWrap.setAttribute('aria-valuemax', String(questions.length));
      barWrap.setAttribute('aria-valuenow', String(state.idx + 1));
      var bar = el('div', 'quiz-progress-bar');
      bar.style.width = ((state.idx) / questions.length * 100) + '%';
      barWrap.appendChild(bar);
      var count = el('span', 'quiz-count', (state.idx + 1) + ' / ' + questions.length);
      head.appendChild(barWrap);
      head.appendChild(count);
      container.appendChild(head);

      container.appendChild(el('p', 'quiz-q', PV.util.escapeHTML(cur.q)));

      var optsWrap = el('div', 'quiz-opts');
      optsWrap.setAttribute('role', 'group');
      optsWrap.setAttribute('aria-label', 'Réponses possibles');
      cur.opts.forEach(function (opt, i) {
        var b = el('button', 'quiz-opt');
        b.type = 'button';
        b.innerHTML = '<span class="qo-key" aria-hidden="true">' + keys[i] + '</span><span>' + PV.util.escapeHTML(opt.text) + '</span>';
        b.addEventListener('click', function () { answer(i, optsWrap, cur); });
        optsWrap.appendChild(b);
      });
      container.appendChild(optsWrap);
      bar.style.width = ((state.idx + 1) / questions.length * 100) + '%';

      var explBox = null;
      var nextBtn = el('button', 'btn btn-primary');
      nextBtn.type = 'button';
      nextBtn.style.display = 'none';
      nextBtn.innerHTML = (state.idx + 1 < questions.length
        ? '<i class="fa-solid fa-arrow-right" aria-hidden="true"></i> Question suivante'
        : '<i class="fa-solid fa-flag-checkered" aria-hidden="true"></i> Voir le résultat');
      nextBtn.addEventListener('click', function () {
        state.idx += 1;
        if (state.idx < questions.length) { renderQuestion(); } else { renderResult(); }
      });
      container.appendChild(nextBtn);

      function answer(i, wrap, curQ) {
        if (state.answered) { return; }
        state.answered = true;
        var buttons = wrap.querySelectorAll('.quiz-opt');
        Array.prototype.forEach.call(buttons, function (b, j) {
          b.disabled = true;
          if (j === curQ.correct) { b.classList.add('is-correct'); }
          if (j === i && i !== curQ.correct) { b.classList.add('is-wrong'); }
        });
        if (i === curQ.correct) { state.score += 1; }
        explBox = el('div', 'quiz-expl');
        explBox.innerHTML = '<i class="fa-solid fa-lightbulb" aria-hidden="true"></i><div><strong>' +
          (i === curQ.correct ? 'Bonne réponse ! ' : 'Réponse incorrecte. ') +
          '</strong>' + PV.util.escapeHTML(curQ.expl) + '</div>';
        container.insertBefore(explBox, nextBtn);
        nextBtn.style.display = '';
        nextBtn.focus();
      }
    }

    function renderResult() {
      container.innerHTML = '';
      var total = questions.length;
      var pct = Math.round(state.score / total * 100);
      var passed = pct >= PASS_THRESHOLD;
      var best = PV.util.safeStorage.get(storageKey, 0);
      if (pct > (best || 0)) { PV.util.safeStorage.set(storageKey, pct); best = pct; }

      var box = el('div', 'quiz-result ' + (passed ? 'is-pass' : 'is-fail'));
      box.innerHTML =
        '<div class="qr-ring" style="--p:' + pct + '" role="img" aria-label="Score ' + pct + ' pour cent">' +
        '<span class="qr-val">' + pct + '%</span></div>' +
        '<h3>' + (passed ? 'Réussi ! 🎉' : 'Non validé') + '</h3>' +
        '<p>' + state.score + ' / ' + total + ' bonnes réponses · seuil ' + PASS_THRESHOLD + ' %' +
        (passed ? '' : '<br>Relisez la section puis retentez votre chance !') + '</p>';

      var retry = el('button', 'btn');
      retry.type = 'button';
      retry.innerHTML = '<i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Recommencer';
      retry.addEventListener('click', function () {
        state.idx = 0; state.score = 0;
        renderIntro();
      });
      box.appendChild(retry);

      if (options.onFinish) {
        options.onFinish(state.score, total, pct, passed);
      }
      container.appendChild(box);
      retry.focus();
    }

    renderIntro();
  }

  /* Quiz final : banque globale construite à partir de toutes les sections */
  function buildFinalBank(count) {
    var all = [];
    Object.keys(PV.quiz).forEach(function (sid) {
      PV.quiz[sid].forEach(function (q) { all.push(q); });
    });
    var mixed = PV.util.shuffle(all);
    count = count || Math.min(20, mixed.length);
    return mixed.slice(0, count);
  }

  window.QuizEngine = {
    start: start,
    PASS_THRESHOLD: PASS_THRESHOLD,
    buildFinalBank: buildFinalBank,
    bestScore: function (storageKey) { return PV.util.safeStorage.get(storageKey, null); }
  };
})();
