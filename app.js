(() => {
  'use strict';

  const STORAGE_KEY = 'salesPulse.sales.v1';
  const MONTHLY_GOAL = 50000;

  const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2, useGrouping: 'always' });
  const eurShort = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });
  const dateFmt = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  const monthFmt = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

  const $ = (id) => document.getElementById(id);

  // ---------- Utilidades de fecha (siempre en hora local) ----------
  const pad = (n) => String(n).padStart(2, '0');
  const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISODate = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const isCurrentMonth = (iso) => {
    const d = parseISODate(iso);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  // ---------- Datos de ejemplo (fechadas dentro del mes actual) ----------
  function seedSales() {
    const today = new Date();
    const dayInMonth = (offset) => {
      const d = new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - offset));
      return toISODate(d);
    };
    return [
      { client: 'Grupo Norte S.A.',      product: 'Licencia Enterprise anual', rep: 'Laura Gómez',   amount: 8400,  date: dayInMonth(0) },
      { client: 'Café Aurora',           product: 'Plan Pro (12 meses)',       rep: 'Diego Martín',  amount: 1290,  date: dayInMonth(2) },
      { client: 'Logística Mediterráneo', product: 'Integración ERP',          rep: 'Laura Gómez',   amount: 5750,  date: dayInMonth(4) },
      { client: 'Clínica Vitalis',       product: 'Pack Formación',            rep: 'Sofía Ruiz',    amount: 2380,  date: dayInMonth(7) },
      { client: 'Estudio Arquia',        product: 'Plan Business',             rep: 'Diego Martín',  amount: 3960,  date: dayInMonth(10) },
    ].map((s, i) => ({ id: `seed-${i + 1}`, createdAt: Date.now() - i * 1000, ...s }));
  }

  // ---------- Persistencia ----------
  function loadSales() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) { /* almacenamiento no disponible o corrupto */ }
    return seedSales();
  }

  function saveSales() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sales)); } catch (_) { /* ignorar */ }
  }

  let sales = loadSales();
  saveSales();

  // ---------- Render ----------
  const AVATAR_COLORS = ['#4f46e5', '#0d9488', '#d97706', '#e11d48', '#7c3aed', '#0284c7', '#16a34a'];
  const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const colorFor = (name) => {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  };
  const escapeHTML = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const sortedSales = () =>
    [...sales].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));

  function setText(id, value, animate) {
    const el = $(id);
    if (el.textContent !== value) {
      el.textContent = value;
      if (animate) {
        el.classList.remove('bump');
        void el.offsetWidth; // reinicia la animación
        el.classList.add('bump');
      }
    }
  }

  function renderDashboard(animate = false) {
    const total = sales.reduce((sum, s) => sum + Number(s.amount), 0);
    const count = sales.length;
    const avg = count ? total / count : 0;
    const monthTotal = sales.filter((s) => isCurrentMonth(s.date)).reduce((sum, s) => sum + Number(s.amount), 0);
    const pct = (monthTotal / MONTHLY_GOAL) * 100;
    const pctLabel = `${pct.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
    const done = pct >= 100;

    setText('kpi-revenue', eurShort.format(total), animate);
    setText('kpi-count', count.toLocaleString('es-ES'), animate);
    setText('kpi-avg', eurShort.format(avg), animate);
    setText('kpi-goal', pctLabel, animate);

    $('goal-text').textContent = `${eur.format(monthTotal)} de ${eurShort.format(MONTHLY_GOAL)} este mes`;
    $('goal-badge').textContent = pctLabel;
    $('goal-badge').classList.toggle('is-done', done);
    $('goal-bar').style.width = `${Math.min(pct, 100)}%`;
    $('goal-bar').classList.toggle('is-done', done);
    $('goal-progress').setAttribute('aria-valuenow', String(Math.round(Math.min(pct, 100))));
    $('goal-remaining').textContent = done
      ? '🎉 ¡Objetivo del mes conseguido!'
      : `Faltan ${eur.format(MONTHLY_GOAL - monthTotal)} para alcanzar el objetivo.`;
  }

  function renderTable(highlightId) {
    const rows = sortedSales();
    $('sales-body').innerHTML = rows.map((s) => `
      <tr data-id="${escapeHTML(s.id)}" class="${s.id === highlightId ? 'row-new' : ''}">
        <td data-label="Cliente" class="client">${escapeHTML(s.client)}</td>
        <td data-label="Producto">${escapeHTML(s.product)}</td>
        <td data-label="Comercial">
          <span class="rep">
            <span class="avatar" style="background:${colorFor(s.rep)}">${escapeHTML(initials(s.rep))}</span>
            ${escapeHTML(s.rep)}
          </span>
        </td>
        <td data-label="Importe" class="num">${eur.format(s.amount)}</td>
        <td data-label="Fecha">${dateFmt.format(parseISODate(s.date))}</td>
        <td class="actions">
          <button class="icon-btn icon-btn--danger" type="button" data-delete="${escapeHTML(s.id)}"
                  aria-label="Eliminar venta de ${escapeHTML(s.client)}" title="Eliminar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>
          </button>
        </td>
      </tr>`).join('');

    $('empty-state').hidden = rows.length > 0;
    $('table-count').textContent = rows.length === 1 ? '1 venta' : `${rows.length} ventas`;

    const reps = [...new Set(sales.map((s) => s.rep))].sort();
    $('reps').innerHTML = reps.map((r) => `<option value="${escapeHTML(r)}"></option>`).join('');
  }

  function render({ animate = false, highlightId } = {}) {
    renderDashboard(animate);
    renderTable(highlightId);
  }

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  // ---------- Modal / formulario ----------
  const modal = $('sale-modal');
  const form = $('sale-form');
  const errorEl = $('form-error');

  function openModal() {
    form.reset();
    form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
    errorEl.hidden = true;
    $('f-date').value = toISODate(new Date());
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
    $('f-client').focus();
  }

  function closeModal() {
    if (typeof modal.close === 'function') modal.close();
    else modal.removeAttribute('open');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const values = {
      client: String(data.client || '').trim(),
      product: String(data.product || '').trim(),
      rep: String(data.rep || '').trim(),
      amount: Math.round(parseFloat(String(data.amount).replace(',', '.')) * 100) / 100,
      date: String(data.date || ''),
    };

    const invalid = [];
    if (!values.client) invalid.push('f-client');
    if (!values.product) invalid.push('f-product');
    if (!values.rep) invalid.push('f-rep');
    if (!(values.amount > 0)) invalid.push('f-amount');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) invalid.push('f-date');

    form.querySelectorAll('input').forEach((el) => el.classList.toggle('invalid', invalid.includes(el.id)));
    if (invalid.length) {
      errorEl.textContent = 'Revisa los campos marcados: todos son obligatorios y el importe debe ser mayor que 0.';
      errorEl.hidden = false;
      $(invalid[0]).focus();
      return;
    }

    const sale = {
      id: (crypto.randomUUID && crypto.randomUUID()) || `s-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
      ...values,
    };
    sales.push(sale);
    saveSales();
    closeModal();
    render({ animate: true, highlightId: sale.id });
    toast(`Venta añadida: ${eur.format(sale.amount)}`);
  });

  $('btn-new').addEventListener('click', openModal);
  $('btn-close').addEventListener('click', closeModal);
  $('btn-cancel').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // ---------- Confirmación en la propia página ----------
  const confirmModal = $('confirm-modal');
  let confirmAction = null;
  function askConfirm(title, text, okLabel, onConfirm) {
    $('confirm-title').textContent = title;
    $('confirm-text').textContent = text;
    $('confirm-ok').textContent = okLabel;
    confirmAction = onConfirm;
    if (typeof confirmModal.showModal === 'function') confirmModal.showModal();
    else confirmModal.setAttribute('open', '');
    $('confirm-cancel').focus();
  }
  function closeConfirm() {
    confirmAction = null;
    if (typeof confirmModal.close === 'function') confirmModal.close();
    else confirmModal.removeAttribute('open');
  }
  $('confirm-cancel').addEventListener('click', closeConfirm);
  confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) closeConfirm(); });
  $('confirm-ok').addEventListener('click', () => {
    const action = confirmAction;
    closeConfirm();
    if (action) action();
  });

  // ---------- Eliminar ----------
  $('sales-body').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-delete]');
    if (!btn) return;
    const id = btn.dataset.delete;
    const sale = sales.find((s) => s.id === id);
    if (!sale) return;
    askConfirm('Eliminar venta', `Se eliminará la venta de "${sale.client}" por ${eur.format(sale.amount)}.`, 'Eliminar', () => {
      sales = sales.filter((s) => s.id !== id);
      saveSales();
      render({ animate: true });
      toast('Venta eliminada');
    });
  });

  // ---------- Restaurar ejemplo ----------
  $('btn-reset').addEventListener('click', () => {
    askConfirm('Restaurar datos de ejemplo', 'Se borrarán tus ventas y se cargarán las 5 ventas de ejemplo.', 'Restaurar', () => {
      sales = seedSales();
      saveSales();
      render({ animate: true });
      toast('Datos de ejemplo restaurados');
    });
  });

  // ---------- Inicio ----------
  const month = monthFmt.format(new Date());
  $('current-month').textContent = month.charAt(0).toUpperCase() + month.slice(1);
  render();
})();
