/* Piensa primero — flujo de la experiencia.
   Todo el estado vive en memoria: sin localStorage, sin red, sin registro. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var steps = Array.prototype.slice.call(document.querySelectorAll('.px-step'));

  var CLAIMS = [
    { t: 'El criterio principal debe ser qué competencia mide el examen: si evalúa razonamiento propio, la IA invalida la medición.',
      hint: null },
    { t: 'Los estudios demuestran que los estudiantes que usan IA siempre rinden peor, por lo que prohibirla es la única opción segura.',
      hint: 'afirma “siempre” y “demuestran” sin citar nada, y salta de ahí a “la única opción”.' },
    { t: 'Una alternativa es dividir el examen: una parte sin IA y otra donde se evalúe cómo se usa y se verifica su respuesta.',
      hint: null },
    { t: 'En cualquier caso, la decisión es técnica y no necesita consultar a estudiantes ni docentes.',
      hint: 'da por hecho, sin decirlo, que la decisión es solo técnica.' }
  ];
  var CHOICES = [
    ['mantengo', 'La mantengo'],
    ['cambio', 'La cambio'],
    ['dudo', 'No sé si es cierta']
  ];
  var CHOICE_TEXT = { mantengo: 'la mantuviste', cambio: 'la cambiarías', dudo: 'dudaste' };

  var state = { guess: 0, mine: '', marks: {}, recall: '', origin: '' };

  function go(n) {
    steps.forEach(function (s) { s.hidden = Number(s.dataset.step) !== n; });
    var cur = steps[n];
    $('px-steps').textContent = cur.dataset.label;
    window.scrollTo({ top: 0, behavior: 'auto' });
    var h = cur.querySelector('h1, h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    if (n === 4) buildCompare();
    if (n === 5) buildSummary();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]');
    if (b) go(Number(b.dataset.go));
  });

  /* 1 · Adivina */
  var guess = $('guess');
  function fmt(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n) + ' %'; }
  guess.addEventListener('input', function () { $('guess-out').textContent = fmt(Number(guess.value)); });
  $('guess-btn').addEventListener('click', function () {
    state.guess = Number(guess.value);
    guess.disabled = true;
    $('guess-btn').hidden = true;
    $('reveal-guess').textContent = fmt(state.guess);
    var gap = Math.abs(state.guess - (-17));
    $('guess-q').textContent = state.guess > 0
      ? 'Esperabas una mejora. ¿De dónde viene esa expectativa: de lo que has vivido o de lo que has leído?'
      : gap <= 8
        ? 'Tu estimación se acercó. ¿Lo sabías o lo intuiste?'
        : 'La distancia entre lo que creías y lo que pasó es el dato que importa. ¿A qué se debe?';
    $('guess-reveal').hidden = false;
  });

  /* 2 · Tu idea */
  var mine = $('mine');
  mine.addEventListener('input', function () { $('mine-btn').disabled = mine.value.trim().length < 3; });
  $('mine-btn').addEventListener('click', function () {
    state.mine = mine.value.trim();
    mine.disabled = true;
    go(3);
  });

  /* 3 · Frases */
  var list = $('claims');
  CLAIMS.forEach(function (c, i) {
    var li = document.createElement('li');
    li.className = 'px-claim';
    var p = document.createElement('p');
    p.textContent = c.t;
    var box = document.createElement('div');
    box.className = 'px-choices';
    box.setAttribute('role', 'radiogroup');
    box.setAttribute('aria-label', 'Qué haces con la frase ' + (i + 1));
    CHOICES.forEach(function (ch) {
      var l = document.createElement('label');
      var inp = document.createElement('input');
      inp.type = 'radio'; inp.name = 'claim' + i; inp.value = ch[0];
      inp.addEventListener('change', function () {
        state.marks[i] = ch[0];
        var done = Object.keys(state.marks).length === CLAIMS.length;
        $('claims-btn').disabled = !done;
        $('claims-hint').hidden = done;
      });
      var s = document.createElement('span');
      s.textContent = ch[1];
      l.appendChild(inp); l.appendChild(s);
      box.appendChild(l);
    });
    li.appendChild(p); li.appendChild(box);
    list.appendChild(li);
  });
  $('claims-btn').addEventListener('click', function () { go(4); });

  /* 4 · Comparar y recordar */
  function buildCompare() {
    $('sbs-mine').textContent = state.mine;
    $('sbs-bot').textContent = CLAIMS.map(function (c) { return c.t; }).join('\n\n');
    var tr = $('trace');
    tr.textContent = '';
    var flagged = CLAIMS.map(function (c, i) { return { c: c, i: i }; })
      .filter(function (x) { return x.c.hint; });
    var intro = document.createElement('p');
    intro.textContent = 'Dos de las cuatro frases traían una pista:';
    tr.appendChild(intro);
    flagged.forEach(function (x) {
      var p = document.createElement('p');
      p.textContent = 'Frase ' + (x.i + 1) + ' (' + CHOICE_TEXT[state.marks[x.i]] + '): ' + x.c.hint;
      tr.appendChild(p);
    });
    var outro = document.createElement('p');
    outro.textContent = 'Si no las notaste, no es un fallo: el texto es fluido y seguro de sí mismo, y eso es justo lo que vuelve difícil dudar.';
    tr.appendChild(outro);
  }
  $('cover-btn').addEventListener('click', function () {
    $('sbs').classList.add('is-covered');
    $('trace').hidden = true;
    $('cover-btn').hidden = true;
    $('recall').hidden = false;
    $('recall-text').focus();
  });
  function recallReady() {
    $('recall-btn').disabled = !($('recall-text').value.trim().length >= 3 &&
      document.querySelector('input[name="origin"]:checked'));
  }
  $('recall-text').addEventListener('input', recallReady);
  Array.prototype.forEach.call(document.querySelectorAll('input[name="origin"]'),
    function (r) { r.addEventListener('change', recallReady); });
  $('recall-btn').addEventListener('click', function () {
    state.recall = $('recall-text').value.trim();
    state.origin = document.querySelector('input[name="origin"]:checked').value;
    go(5);
  });

  /* 5 · Cierre */
  function summaryLines() {
    var changed = CLAIMS.map(function (c, i) { return state.marks[i]; })
      .filter(function (m) { return m !== 'mantengo'; }).length;
    return [
      'Estimaste ' + fmt(state.guess) + ' en el examen; el dato real fue −17 %.',
      'De las 4 frases del chatbot, ' + (4 - changed) + ' las mantuviste tal cual y ' + changed + ' las cambiarías o pusiste en duda.',
      'Al explicarlo sin mirar, dijiste que fue ' + state.origin + '.'
    ];
  }
  function buildSummary() {
    var ul = $('summary');
    ul.textContent = '';
    summaryLines().forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    });
  }
  $('copy-btn').addEventListener('click', function () {
    var text = 'Piensa primero — mi recorrido\n' + summaryLines().join('\n') +
      '\n\nMi idea inicial: ' + state.mine + '\nLo que expliqué sin mirar: ' + state.recall;
    var ok = function () { $('copy-status').textContent = 'Copiado. Pégalo donde quieras compartirlo.'; };
    var fail = function () { $('copy-status').textContent = 'No se pudo copiar automáticamente.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, fail);
    } else { fail(); }
  });
  $('restart-btn').addEventListener('click', function () { window.location.reload(); });
})();
