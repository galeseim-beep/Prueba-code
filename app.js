(() => {
  'use strict';

  const STORAGE_KEY = 'dragon.entries.v1';
  const PROFILE_KEY = 'dragon.profile.v1';
  const $ = (id) => document.getElementById(id);

  // ---------- Categorías ----------
  const CATS = {
    hambre:  { icon: '🍕', name: 'Modo hambre',        desc: 'Qué come, cuándo, y qué ocurre si no come a tiempo.' },
    humo:    { icon: '🔥', name: 'Alertas de humo',    desc: 'Señales de que está a punto de escupir fuego.' },
    cueva:   { icon: '🛋️', name: 'Territorio y cueva', desc: 'Su lado del sofá, sus mantas, su mando. Sus normas.' },
    tesoros: { icon: '💎', name: 'Tesoros y sobornos', desc: 'Lo que le amansa al instante. Usar con cabeza.' },
  };
  const CAT_KEYS = Object.keys(CATS);

  // ---------- Fechas ----------
  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return toISO(d); };
  const daysBetween = (iso) => Math.max(0, Math.floor((new Date().setHours(0, 0, 0, 0) - parseISO(iso)) / 86400000));
  const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });

  // ---------- Datos de ejemplo ----------
  function seedEntries() {
    return [
      { cat: 'hambre',  level: 4, date: daysAgo(1), title: 'Hambre crítica a partir de las 14:15', note: 'Sin comer, cualquier pregunta se interpreta como un ataque. Llevar frutos secos de emergencia.' },
      { cat: 'hambre',  level: 3, date: daysAgo(3), title: 'Dice «no tengo hambre» y luego se come tus patatas', note: 'Pedir siempre ración doble de patatas. No es negociable.' },
      { cat: 'humo',    level: 5, date: daysAgo(6), title: '«No pasa nada» significa que pasa algo', note: 'Respuestas de una palabra y volumen bajo. Activar protocolo de escucha, no de soluciones.' },
      { cat: 'humo',    level: 4, date: daysAgo(9), title: 'Spoiler de su serie favorita', note: 'Contarle un final equivale a traición de nivel ancestral. Ni insinuarlo.' },
      { cat: 'cueva',   level: 3, date: daysAgo(2), title: 'El lado izquierdo del sofá es zona sagrada', note: 'Ocuparlo aunque sea dos minutos provoca un gruñido grave.' },
      { cat: 'cueva',   level: 2, date: daysAgo(5), title: 'Todas las mantas son suyas', note: 'Las reclama en cuanto la casa baja de 20 °C.' },
      { cat: 'tesoros', level: 5, date: daysAgo(4), title: 'Croquetas caseras', note: 'Efecto calmante inmediato. Duración estimada: 3 horas.' },
      { cat: 'tesoros', level: 4, date: daysAgo(0), title: '«Te he guardado el último trozo»', note: 'Funciona incluso en días de humo. Mejor si es de tarta.' },
    ].map((e, i) => ({ id: `seed-${i + 1}`, createdAt: Date.now() - i * 1000, ...e }));
  }
  const DEFAULT_PROFILE = { name: 'Álex', pron: 'o' };

  // ---------- Persistencia ----------
  function load(key, fallback, check) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) { const v = JSON.parse(raw); if (check(v)) return v; }
    } catch (_) { /* almacenamiento no disponible */ }
    return fallback();
  }
  function store(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* ignorar */ } }

  let entries = load(STORAGE_KEY, seedEntries, Array.isArray);
  let profile = load(PROFILE_KEY, () => ({ ...DEFAULT_PROFILE }), (v) => v && typeof v.name === 'string');
  let filter = 'all';
  const saveEntries = () => store(STORAGE_KEY, entries);
  const saveProfile = () => store(PROFILE_KEY, profile);
  saveEntries();

  // Género gramatical: g('tranquil') -> tranquilo / tranquila / tranquile
  const g = (stem) => stem + profile.pron;
  const sumLevels = (cat) => entries.filter((e) => e.cat === cat).reduce((s, e) => s + Number(e.level), 0);
  const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ---------- Métricas ----------
  function metrics() {
    const tame = Math.max(0, Math.min(100, Math.round(40 + sumLevels('tesoros') * 3 + sumLevels('cueva') + sumLevels('hambre') - sumLevels('humo') * 2)));

    const fires = entries.filter((e) => e.cat === 'humo' && e.level >= 4).map((e) => daysBetween(e.date));
    const daysNoFire = fires.length ? Math.min(...fires) : null;

    const h = new Date().getHours() + new Date().getMinutes() / 60;
    const hungryHour = (h >= 13.5 && h < 15) || (h >= 20.5 && h < 22);
    const recentSmoke = entries.filter((e) => e.cat === 'humo' && daysBetween(e.date) <= 7).reduce((s, e) => s + Number(e.level), 0);
    const riskScore = recentSmoke + (hungryHour ? 4 : 0);
    const risk = riskScore >= 9 ? 'high' : riskScore >= 4 ? 'mid' : 'low';
    const riskHint = hungryHour ? 'Hora de comer cerca: peligro de hambre' : recentSmoke ? `${recentSmoke}🔥 de humo en los últimos 7 días` : 'Sin alertas recientes';

    return { tame, daysNoFire, risk, riskHint, points: sumLevels('tesoros') * 10 };
  }

  // ---------- Render ----------
  function setText(id, value, animate) {
    const el = $(id);
    if (el.textContent === value) return;
    el.textContent = value;
    if (animate) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  }

  function renderProfile() {
    $('dragon-name').textContent = profile.name;
    const species = { o: 'Draco sofaensis', a: 'Draca sofaensis', e: 'Drace sofaensis' }[profile.pron];
    $('dragon-meta').innerHTML = `Especie: <em>${species}</em> · IA entrenada con ${entries.length} fichas`;
  }

  function renderDashboard(animate = false) {
    const m = metrics();
    const RISK = { low: 'Bajo', mid: 'Medio', high: 'Alto' };
    setText('kpi-tame', `${m.tame} %`, animate);
    setText('kpi-risk', RISK[m.risk], animate);
    $('kpi-risk').className = `kpi__value is-${m.risk}`;
    $('kpi-risk-hint').textContent = m.riskHint;
    setText('kpi-days', m.daysNoFire === null ? '∞' : String(m.daysNoFire), animate);
    setText('kpi-points', m.points.toLocaleString('es-ES'), animate);

    const mood = { low: `😌 ${g('Tranquil')}`, mid: '😤 Con humo', high: '🔥 Escupe fuego' }[m.risk];
    $('mood-pill').textContent = mood;
    $('mood-pill').className = `mood is-${m.risk}`;

    $('goal-badge').textContent = `${m.tame} %`;
    $('goal-bar').style.width = `${m.tame}%`;
    $('goal-progress').setAttribute('aria-valuenow', String(m.tame));
    $('goal-text').textContent = m.tame >= 100
      ? `${profile.name} está ${g('domesticad')} del todo. Disfrútalo mientras dure.`
      : `Te faltan ${100 - m.tame} puntos. Registra tesoros que funcionen para subir.`;
    $('ai-trained').textContent = `Entrenada con ${entries.length} fichas`;
  }

  function renderCats() {
    $('cats').innerHTML = CAT_KEYS.map((k) => `
      <button class="cat ${filter === k ? 'is-active' : ''}" type="button" data-cat="${k}" data-filter="${k}" aria-pressed="${filter === k}">
        <span class="cat__top"><span class="cat__icon" aria-hidden="true">${CATS[k].icon}</span><span class="cat__count">${entries.filter((e) => e.cat === k).length}</span></span>
        <span class="cat__name">${CATS[k].name}</span>
        <span class="cat__desc">${CATS[k].desc}</span>
      </button>`).join('');

    $('filters').innerHTML = [['all', 'Todas'], ...CAT_KEYS.map((k) => [k, `${CATS[k].icon} ${CATS[k].name}`])]
      .map(([k, label]) => `<button class="filter" type="button" role="tab" data-filter="${k}" aria-selected="${filter === k}">${label}</button>`).join('');
  }

  const flamesHTML = (n) => Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? '' : 'off'}">🔥</span>`).join('');

  function renderList(highlightId) {
    const rows = entries
      .filter((e) => filter === 'all' || e.cat === filter)
      .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));

    $('entries').innerHTML = rows.map((e) => `
      <li class="entry ${e.id === highlightId ? 'row-new' : ''}" data-cat="${e.cat}">
        <span class="entry__icon" aria-hidden="true">${CATS[e.cat].icon}</span>
        <p class="entry__title">${escapeHTML(e.title)}</p>
        <button class="icon-btn" type="button" data-delete="${escapeHTML(e.id)}" aria-label="Eliminar ficha: ${escapeHTML(e.title)}" title="Eliminar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>
        </button>
        ${e.note ? `<p class="entry__note">${escapeHTML(e.note)}</p>` : '<span></span>'}
        <div class="entry__meta">
          <span class="tag">${CATS[e.cat].name}</span>
          <span class="level" aria-label="Intensidad ${e.level} de 5">${flamesHTML(e.level)}</span>
          <span>${dateFmt.format(parseISO(e.date))}</span>
        </div>
      </li>`).join('');

    $('empty-state').hidden = rows.length > 0;
    $('list-count').textContent = rows.length === 1 ? '1 ficha' : `${rows.length} fichas`;
  }

  function render({ animate = false, highlightId } = {}) {
    renderProfile();
    renderDashboard(animate);
    renderCats();
    renderList(highlightId);
  }

  // ---------- Filtros ----------
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    const k = btn.dataset.filter;
    filter = btn.classList.contains('cat') && filter === k ? 'all' : k;
    renderCats();
    renderList();
  });

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  // ---------- Modales ----------
  const openModal = (m) => (typeof m.showModal === 'function' ? m.showModal() : m.setAttribute('open', ''));
  const closeModal = (m) => (typeof m.close === 'function' ? m.close() : m.removeAttribute('open'));
  document.querySelectorAll('dialog').forEach((m) => {
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) closeModal(m); });
  });

  // Confirmación propia (sin confirm() del navegador)
  let confirmAction = null;
  function askConfirm(title, text, okLabel, onConfirm) {
    $('confirm-title').textContent = title;
    $('confirm-text').textContent = text;
    $('confirm-ok').textContent = okLabel;
    confirmAction = onConfirm;
    openModal($('confirm-modal'));
  }
  $('confirm-ok').addEventListener('click', () => {
    const action = confirmAction;
    confirmAction = null;
    closeModal($('confirm-modal'));
    if (action) action();
  });

  // ---------- Nueva ficha ----------
  const form = $('entry-form');
  $('cat-pick').innerHTML = CAT_KEYS.map((k, i) => `
    <span data-cat="${k}"><input type="radio" name="cat" id="cat-${k}" value="${k}" ${i === 0 ? 'checked' : ''} /><label for="cat-${k}">${CATS[k].icon} ${CATS[k].name}</label></span>`).join('');

  function paintFlames() {
    const v = Number(form.querySelector('input[name="level"]:checked')?.value || 0);
    form.querySelectorAll('#flames label').forEach((l, i) => l.classList.toggle('off', i >= v));
  }
  $('flames').addEventListener('change', paintFlames);

  $('btn-new').addEventListener('click', () => {
    form.reset();
    form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
    $('form-error').hidden = true;
    if (filter !== 'all') $(`cat-${filter}`).checked = true;
    $('f-date').value = toISO(new Date());
    paintFlames();
    openModal($('entry-modal'));
    $('f-title').focus();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const entry = {
      cat: String(fd.get('cat') || ''),
      title: String(fd.get('title') || '').trim(),
      note: String(fd.get('note') || '').trim(),
      level: Number(fd.get('level') || 3),
      date: String(fd.get('date') || ''),
    };
    const bad = [];
    if (!entry.title) bad.push('f-title');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) bad.push('f-date');
    ['f-title', 'f-date'].forEach((id) => $(id).classList.toggle('invalid', bad.includes(id)));
    if (!CATS[entry.cat] || bad.length) {
      $('form-error').textContent = 'Escribe qué has descubierto y elige una fecha.';
      $('form-error').hidden = false;
      if (bad[0]) $(bad[0]).focus();
      return;
    }
    const full = { id: (crypto.randomUUID && crypto.randomUUID()) || `e-${Date.now()}`, createdAt: Date.now(), ...entry };
    entries.push(full);
    saveEntries();
    closeModal($('entry-modal'));
    render({ animate: true, highlightId: full.id });
    toast(`Ficha guardada. DragónGPT ya lo sabe.`);
  });

  // ---------- Eliminar ----------
  $('entries').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-delete]');
    if (!btn) return;
    const entry = entries.find((x) => x.id === btn.dataset.delete);
    if (!entry) return;
    askConfirm('Eliminar ficha', `Se eliminará «${entry.title}». DragónGPT lo olvidará.`, 'Eliminar', () => {
      entries = entries.filter((x) => x.id !== entry.id);
      saveEntries();
      render({ animate: true });
      toast('Ficha eliminada');
    });
  });

  // ---------- Editar dragón ----------
  $('btn-edit').addEventListener('click', () => {
    $('f-name').value = profile.name;
    $('f-pron').value = profile.pron;
    $('f-name').classList.remove('invalid');
    openModal($('edit-modal'));
    $('f-name').focus();
  });
  $('edit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('f-name').value.trim();
    if (!name) { $('f-name').classList.add('invalid'); $('f-name').focus(); return; }
    profile = { name, pron: $('f-pron').value };
    saveProfile();
    closeModal($('edit-modal'));
    render();
    resetChat();
    toast('Dragón actualizado');
  });

  // ---------- Restaurar ----------
  $('btn-reset').addEventListener('click', () => {
    askConfirm('Restaurar dragón de ejemplo', 'Se borrarán tus fichas y se cargará el dragón de ejemplo.', 'Restaurar', () => {
      entries = seedEntries();
      profile = { ...DEFAULT_PROFILE };
      filter = 'all';
      saveEntries();
      saveProfile();
      render({ animate: true });
      resetChat();
      toast('Dragón de ejemplo restaurado');
    });
  });

  // ---------- Botón del pánico ----------
  const GENERIC_STEPS = [
    'No digas «cálmate». Nunca en la historia ha funcionado.',
    'Baja la voz un 30 % y asiente despacio.',
    'Retírate a una distancia prudencial (otra habitación sirve).',
    'Pregunta «¿quieres que te escuche o que te ayude?» y respeta la respuesta.',
    'Pon agua a calentar. Una infusión es una bandera blanca.',
    'Recuerda en voz alta algo que hizo bien esta semana.',
  ];
  function buildPanic() {
    const steps = [];
    const treasure = entries.filter((e) => e.cat === 'tesoros').sort((a, b) => b.level - a.level);
    const hunger = entries.filter((e) => e.cat === 'hambre');
    if (hunger.length) steps.push(`Descarta hambre primero: «${pick(hunger).title}».`);
    steps.push(pick(GENERIC_STEPS));
    if (treasure.length) steps.push(`Despliega tesoro: ${treasure[0].title.replace(/[«»]/g, '')} (${treasure[0].level}🔥 de eficacia).`);
    else steps.push('No tienes tesoros registrados. Improvisa con chocolate.');
    let extra;
    do { extra = pick(GENERIC_STEPS); } while (steps.includes(extra));
    steps.push(extra);
    $('panic-intro').textContent = `Protocolo generado con las ${entries.length} fichas de ${profile.name}. Sigue los pasos en orden.`;
    $('panic-steps').innerHTML = steps.map((s) => `<li>${escapeHTML(s)}</li>`).join('');
  }
  $('btn-panic').addEventListener('click', () => { buildPanic(); openModal($('panic-modal')); });
  $('panic-again').addEventListener('click', buildPanic);

  // ---------- DragónGPT (IA local de demostración) ----------
  const INTENTS = [
    { cat: 'hambre',  re: /(com|cena|almuerz|desayun|hambre|merienda|pizza|restaurante|pedir)/i },
    { cat: 'humo',    re: /(enfad|callad|serio|mosque|humor|discut|pasa algo|molest|triste|pelea|spoiler|perdón|perdon)/i },
    { cat: 'tesoros', re: /(regal|sorpres|premi|cumple|aniversario|soborn|contentar|animar|perdón|perdon)/i },
    { cat: 'cueva',   re: /(sof[aá]|manta|tele|mando|serie|f[uú]tbol|partido|casa|cama|fr[ií]o|calor)/i },
  ];
  const OPENERS = ['Según mis datos', 'Analizando sus patrones', 'Con un 87 % de confianza', 'Cruzando sus fichas'];
  const CLOSERS = {
    hambre: ['Regla de oro: primero comida, luego conversación.', 'Ante la duda, pide más patatas.'],
    humo: ['Escucha más de lo que hablas durante los próximos 20 minutos.', 'Hoy no es día para opinar sobre su familia.'],
    tesoros: ['Combinado con un mensaje bonito, el efecto se duplica.', 'No abuses: un tesoro usado a diario deja de ser tesoro.'],
    cueva: ['Respeta el territorio y el territorio te respetará.', 'Negocia con tiempo, nunca con el partido ya empezado.'],
  };

  function answer(q) {
    const hits = INTENTS.filter((it) => it.re.test(q)).map((it) => it.cat);
    const cats = hits.length ? [...new Set(hits)] : [pick(CAT_KEYS)];
    const used = [];
    const parts = cats.slice(0, 2).map((cat) => {
      const pool = entries.filter((e) => e.cat === cat).sort((a, b) => b.level - a.level);
      if (!pool.length) return `Aún no tengo fichas de «${CATS[cat].name}». Enséñame algo con «Nueva ficha».`;
      const e = pool[0];
      used.push(e);
      return `${CATS[cat].icon} ${pick(OPENERS)}, ${profile.name}: «${e.title}».${e.note ? ` ${e.note}` : ''}`;
    });
    const intro = hits.length ? '' : 'No tengo una ficha exacta para eso, pero te dejo lo más útil que sé:\n';
    const tip = pick(CLOSERS[cats[0]]);
    return { text: `${intro}${parts.join('\n\n')}\n\n👉 ${tip}`, source: used.length ? `Basado en ${used.length} ficha${used.length > 1 ? 's' : ''} de tu dragón` : '' };
  }

  const log = $('ai-log');
  function addMsg(who, text, source) {
    const el = document.createElement('div');
    el.className = `msg msg--${who}`;
    el.textContent = text;
    if (source) { const s = document.createElement('span'); s.className = 'msg__src'; s.textContent = source; el.appendChild(s); }
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }
  function ask(q) {
    q = q.trim();
    if (!q) return;
    addMsg('me', q);
    const typing = document.createElement('div');
    typing.className = 'msg msg--ai';
    typing.innerHTML = '<span class="typing" aria-label="Escribiendo"><i></i><i></i><i></i></span>';
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;
    setTimeout(() => { typing.remove(); const a = answer(q); addMsg('ai', a.text, a.source); }, 700 + Math.random() * 500);
  }
  function resetChat() {
    log.innerHTML = '';
    addMsg('ai', `Hola. Soy DragónGPT y conozco a ${profile.name} mejor que su madre. Pregúntame qué hacer y te respondo con sus fichas.`);
    // Conversación de ejemplo para ver cómo responde
    const q = '¿Qué pedimos de cena?';
    addMsg('me', q);
    const a = answer(q);
    addMsg('ai', a.text, a.source);
  }

  const SUGGESTIONS = ['¿Qué pedimos de cena?', 'Está muy callad?, ¿qué hago?', '¿Qué le regalo?', '¿Puedo ver el fútbol hoy?', 'Le he hecho spoiler, ayuda'];
  function renderSuggestions() {
    $('ai-suggest').innerHTML = SUGGESTIONS.map((s) => s.replace('?,', `${profile.pron},`))
      .map((s) => `<button class="chip" type="button" data-q="${escapeHTML(s)}">${escapeHTML(s)}</button>`).join('');
  }
  $('ai-suggest').addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) ask(b.dataset.q); });
  $('ai-form').addEventListener('submit', (e) => { e.preventDefault(); ask($('ai-input').value); $('ai-input').value = ''; });

  // ---------- Inicio ----------
  render();
  renderSuggestions();
  resetChat();
  // Las sugerencias dependen del género gramatical del dragón
  $('edit-form').addEventListener('submit', renderSuggestions);
})();
