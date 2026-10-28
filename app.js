(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Reinicia una animación CSS de entrada en un elemento. */
  function replayEntrance(el, className = 'is-entering') {
    if (reducedMotion.matches) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }

  /* ── Pestañas accesibles (patrón WAI-ARIA, activación automática) ── */
  function initTabs(root) {
    const tabs = $$('[role="tab"]', root);
    if (!tabs.length) return;

    function select(tab, { focus = false } = {}) {
      tabs.forEach((other) => {
        const on = other === tab;
        other.setAttribute('aria-selected', String(on));
        other.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(other.getAttribute('aria-controls'));
        if (!panel) return;
        panel.hidden = !on;
        if (on) replayEntrance(panel);
      });
      if (focus) tab.focus();
      root.dispatchEvent(new CustomEvent('tabchange', { detail: { tab } }));
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (event) => {
        const last = tabs.length - 1;
        const moves = {
          ArrowRight: index === last ? 0 : index + 1,
          ArrowDown: index === last ? 0 : index + 1,
          ArrowLeft: index === 0 ? last : index - 1,
          ArrowUp: index === 0 ? last : index - 1,
          Home: 0,
          End: last,
        };
        if (!(event.key in moves)) return;
        event.preventDefault();
        select(tabs[moves[event.key]], { focus: true });
      });
    });

    root.selectTab = (tab) => select(tab);
  }

  $$('[data-tabs]').forEach(initTabs);

  /* ── Caja negra: la pregunta activa ilumina su punto en el diagrama ── */
  const box = $('.box');
  if (box) {
    const spots = $$('.bb-spot', box);
    const syncSpot = (tab) => {
      spots.forEach((spot) => spot.classList.toggle('is-on', spot.dataset.spot === tab.dataset.spot));
    };
    box.addEventListener('tabchange', (event) => syncSpot(event.detail.tab));
    const initial = $('[role="tab"][aria-selected="true"]', box);
    if (initial) syncSpot(initial);

    spots.forEach((spot) => {
      spot.style.cursor = 'pointer';
      spot.addEventListener('click', () => {
        const tab = $(`.q[data-spot="${spot.dataset.spot}"]`, box);
        if (tab && box.selectTab) box.selectTab(tab);
      });
    });
  }

  /* ── Hero: volver a trazar los dos caminos ── */
  const replay = $('#replay');
  replay?.addEventListener('click', () => {
    $$('.routes').forEach((svg) => replayEntrance(svg, 'is-drawing'));
  });

  /* ── Simulación: ¿qué haces con la duda? ── */
  const outcomes = {
    esfuerzo: {
      title: 'Te quedas con la fricción.',
      gain: [
        'El proceso de prueba y error que lleva al razonamiento analítico',
        'Un criterio propio para contrastar después lo que diga un modelo',
      ],
      loss: ['Tiempo y algo de frustración: justo lo que el asistente está diseñado para evitarte'],
      note: 'El MIT considera el esfuerzo productivo condición del aprendizaje duradero. Contrastar después con varios modelos es la estrategia que defiende la revisión.',
    },
    rendicion: {
      title: 'Obtienes la respuesta al instante.',
      gain: [
        'La solución correcta en segundos',
        'Una tarea mejor calificada: en el estudio con 26\u00a0000 estudiantes, las tareas subieron un 18\u00a0%',
      ],
      loss: [
        'El esfuerzo productivo que lleva al razonamiento analítico',
        'Resultados en el examen presencial: en ese mismo estudio, cayeron un 20\u00a0%',
        'El recuerdo de lo producido: la deuda cognitiva',
      ],
      note: 'El MIT llama a esto rendición cognitiva: recurrir a la IA al primer indicio de dificultad. La respuesta correcta puede crear la ilusión de aprendizaje.',
    },
  };

  const simChoices = $('#sim-choices');
  const simResult = $('#sim-result');
  const simTitle = $('#sim-title');

  function fillList(list, items) {
    list.replaceChildren(...items.map((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    }));
  }

  function showOutcome(path) {
    const outcome = outcomes[path];
    if (!outcome) return;
    simTitle.textContent = outcome.title;
    fillList($('#sim-gain'), outcome.gain);
    fillList($('#sim-loss'), outcome.loss);
    $('#sim-note').textContent = outcome.note;
    simResult.dataset.path = path;
    simChoices.hidden = true;
    simResult.hidden = false;
    replayEntrance(simResult);
    simTitle.focus({ preventScroll: true });
  }

  simChoices?.addEventListener('click', (event) => {
    const choice = event.target.closest('.choice');
    if (choice) showOutcome(choice.dataset.path);
  });
  $('#sim-other')?.addEventListener('click', () => {
    showOutcome(simResult.dataset.path === 'rendicion' ? 'esfuerzo' : 'rendicion');
  });
  $('#sim-reset')?.addEventListener('click', () => {
    simResult.hidden = true;
    simChoices.hidden = false;
    $('.choice', simChoices)?.focus();
  });

  /* ── Fuentes desplegables ── */
  $$('.src-btn').forEach((button) => {
    const target = document.getElementById(button.getAttribute('aria-controls'));
    if (!target) return;
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      target.hidden = open;
    });
  });

  /* ── Revelado al hacer scroll ── */
  const revealables = [...$$('[data-reveal]'), ...$$('.bars')];
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const revealer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealables.forEach((el) => revealer.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('is-in'));
  }

  /* ── Capítulo actual y progreso de lectura ── */
  const links = $$('.nav a');
  const nowN = $('#now-n');
  const nowT = $('#now-t');
  const chapters = [$('#top'), ...links.map((a) => $(a.getAttribute('href')))].filter(Boolean);

  function setCurrent(section) {
    const id = `#${section.id}`;
    const link = links.find((a) => a.getAttribute('href') === id);
    links.forEach((a) => {
      if (a === link) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    if (!nowN || !nowT) return;
    nowN.textContent = link ? link.querySelector('span').textContent : '00';
    nowT.textContent = link ? link.textContent.replace(/^\d+/, '') : 'Inicio';
  }

  if ('IntersectionObserver' in window) {
    const tracker = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setCurrent(entry.target);
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    chapters.forEach((section) => tracker.observe(section));
  }

  const bar = $('#progress-bar');
  let ticking = false;
  function paintProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.transform = `scaleX(${ratio})`;
    ticking = false;
  }
  if (bar) {
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(paintProgress);
    }, { passive: true });
    paintProgress();
  }
})();
