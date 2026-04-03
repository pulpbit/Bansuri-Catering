import { login, logout, leadsApi, packagesApi, menuApi, getToken } from './api.js';
import { $ } from './utils/helpers.js';

let currentQuoteLead = null;
let currentQuoteUrl = '';
let currentPdfBlobUrl = '';

function triggerQuotePrint() {
  if (!currentQuoteLead) return;
  const quoteModal = document.getElementById('quote-modal');
  const food = quoteModal?.querySelector('[data-quote-food-total]')?.textContent || '₹0';
  const service = quoteModal?.querySelector('[data-quote-service-total]')?.textContent || '₹0';
  const transport = quoteModal?.querySelector('[data-quote-transport-total]')?.textContent || '₹0';
  const grand = quoteModal?.querySelector('[data-quote-grand]')?.textContent || '₹0';
  const menuItems = (() => {
    const raw = currentQuoteLead.selectedMenu;
    if (!raw) return [];
    let data = raw;
    if (typeof data === 'string') {
      const trimmed = data.trim();
      try { data = JSON.parse(trimmed); } catch { data = trimmed.split('|'); }
    }
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      return Object.entries(data).map(([label, items]) => {
        const list = Array.isArray(items) ? items.join(', ') : String(items);
        return `${label}: ${list}`;
      });
    }
    return [String(data)];
  })();
  const menuListHtml = menuItems.length
    ? menuItems.map((item) => `<li>${item}</li>`).join('')
    : '<li>-</li>';
  const win = window.open('', '_blank');
  if (!win) return;
  const styles = `
    :root { --primary:#d62976; --accent:#f49b38; --bg:#fdf7fb; --card:#ffffff; --muted:#5e6173; }
    body { font-family: 'Inter', Arial, sans-serif; margin: 0; background: var(--bg); color: #1e1f2b; }
    .wrap { max-width: 960px; margin: 0 auto; padding: 28px; }
    .hero { background: linear-gradient(120deg, #fdeaee, #fff5f7); border-radius: 18px; padding: 22px; display: flex; justify-content: space-between; gap: 12px; align-items: center; }
    .hero h1 { margin: 0; font-size: 1.9rem; }
    .pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; background: #fff; color: var(--primary); font-weight: 700; border: 1px solid rgba(0,0,0,0.05); }
    .meta { margin: 18px 0; display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .card { background: var(--card); border-radius: 14px; padding: 14px; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 12px 30px rgba(0,0,0,0.05); }
    .card h2 { margin: 0 0 10px; }
    .menu { line-height: 1.6; color: var(--muted); }
    .summary { display: grid; gap: 8px; }
    .summary div { display: flex; justify-content: space-between; font-size: 1rem; }
    .summary div span:last-child { font-weight: 700; }
    .grand { border-top: 1px dashed rgba(0,0,0,0.1); padding-top: 8px; font-size: 1.1rem; }
    .branding { margin-top: 18px; color: var(--muted); line-height: 1.5; }
    a { color: var(--primary); text-decoration: none; }
    @media print { body { background: #fff; } .hero, .card { box-shadow: none; } }
  `;
  win.document.write(`
    <html><head><title>Quote</title><style>${styles}</style></head><body>
      <div class="wrap">
        <div class="hero">
          <div>
            <h1>Bansuri Catering</h1>
            <div class="pill">PDF Link</div>
            <p style="margin:6px 0 0;color:var(--muted);">${currentQuoteUrl || 'Generated locally'}</p>
          </div>
          <div class="pill">Guests: ${currentQuoteLead.guests || '-'}</div>
        </div>

        <div class="meta">
          <div class="card"><strong>Name:</strong> ${currentQuoteLead.name || '-'}<br/><strong>Phone:</strong> ${currentQuoteLead.phone || '-'}</div>
          <div class="card"><strong>Event Type:</strong> ${currentQuoteLead.eventType || '-'}<br/><strong>Event Date:</strong> ${currentQuoteLead.eventDate || '-'}</div>
          <div class="card"><strong>Package:</strong> ${currentQuoteLead.package || '-'}</div>
        </div>

        <div class="card">
          <h2>Menu guidance</h2>
          <ul class="menu">${menuListHtml}</ul>
        </div>

        <div class="card">
          <h2>Totals</h2>
          <div class="summary">
            <div><span>Food total</span><span>${food}</span></div>
            <div><span>Service fee</span><span>${service}</span></div>
            <div><span>Transport</span><span>${transport}</span></div>
            <div class="grand"><span>Grand Total</span><span>${grand}</span></div>
          </div>
        </div>

        <div class="branding">
          <p><strong>Bansuri Catering</strong><br/>
          +91-70464 45444<br/>
          bansuricatering@gmail.com<br/>
          SHOP NO 50, THIRD FLOOR, AAKASH BUSINESS CENTER,<br/>
          OPP. BHAGYALAXMI SOCIETY, PIPLOD<br/>
          Surat – 395007, Gujarat</p>
        </div>
      </div>
    </body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 200);
}

async function generatePdfAndDownload() {
  if (!currentQuoteLead) return;
  const quoteModal = document.getElementById('quote-modal');
  const food = quoteModal?.querySelector('[data-quote-food-total]')?.textContent || '₹0';
  const service = quoteModal?.querySelector('[data-quote-service-total]')?.textContent || '₹0';
  const transport = quoteModal?.querySelector('[data-quote-transport-total]')?.textContent || '₹0';
  const grand = quoteModal?.querySelector('[data-quote-grand]')?.textContent || '₹0';
  const menuItems = Array.from(quoteModal?.querySelectorAll('[data-quote-menu] li') || []).map((li) => li.textContent || '');

  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pad = 32;
    let y = 50;

    doc.setFillColor(253, 234, 238);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 120, 'F');
    doc.setFontSize(20);
    doc.setTextColor(29, 29, 46);
    doc.text('Bansuri Catering', pad, y);
    doc.setFontSize(11);
    y += 18;
    doc.text(`PDF Link: ${currentQuoteUrl || 'Generated locally'}`, pad, y);
    y += 24;

    doc.setFontSize(13);
    const metaLeft = [
      `Name: ${currentQuoteLead.name || '-'}`,
      `Phone: ${currentQuoteLead.phone || '-'}`,
      `Event Type: ${currentQuoteLead.eventType || '-'}`
    ];
    const metaRight = [
      `Event Date: ${currentQuoteLead.eventDate || '-'}`,
      `Guests: ${currentQuoteLead.guests || '-'}`,
      `Package: ${currentQuoteLead.package || '-'}`
    ];
    metaLeft.forEach((t, i) => doc.text(t, pad, y + i * 16));
    metaRight.forEach((t, i) => doc.text(t, pad + 250, y + i * 16));
    y += 70;

    doc.setFontSize(14);
    doc.text('Menu guidance', pad, y);
    y += 14;
    doc.setFontSize(11);
    const list = menuItems.length ? menuItems : ['-'];
    list.forEach((item) => {
      const lines = doc.splitTextToSize(`• ${item}`, 530);
      doc.text(lines, pad, y);
      y += lines.length * 14;
    });

    y += 10;
    doc.setFontSize(14);
    doc.text('Totals', pad, y);
    y += 14;
    doc.setFontSize(12);
    const totals = [
      ['Food total', food],
      ['Service fee', service],
      ['Transport', transport],
      ['Grand Total', grand]
    ];
    totals.forEach(([label, val], idx) => {
      doc.text(label, pad, y + idx * 16);
      doc.text(String(val), pad + 400, y + idx * 16, { align: 'right' });
    });
    y += totals.length * 16 + 20;

    doc.setFontSize(11);
    doc.setTextColor(94, 98, 115);
    doc.text(
      [
        'Bansuri Catering',
        '+91-70464 45444',
        'bansuricatering@gmail.com',
        'SHOP NO 50, THIRD FLOOR, AAKASH BUSINESS CENTER,',
        'OPP. BHAGYALAXMI SOCIETY, PIPLOD',
        'Surat – 395007, Gujarat'
      ],
      pad,
      y
    );

    currentPdfBlobUrl = doc.output('bloburl');
    doc.save('bansuri-quote.pdf');
  } catch (e) {
    triggerQuotePrint(); // fallback
  }
}

function renderStatusPill(status) {
  const map = {
    new: 'New lead',
    quote: 'Quote Sent',
    follow: 'Follow Up',
    closed: 'Closed'
  };
  const cls = status || 'new';
  return `<span class="status-pill ${cls}">${map[cls] || 'New lead'}</span>`;
}

function formatMenu(selectedMenu) {
  if (!selectedMenu) return '-';
  let data = selectedMenu;
  // First parse if it's a stringified JSON
  if (typeof data === 'string') {
    const trimmed = data.trim();
    try {
      data = JSON.parse(trimmed);
    } catch {
      // Sometimes we get a JSON string inside a string, try one more level
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || trimmed.startsWith('{')) {
        try { data = JSON.parse(JSON.parse(trimmed)); } catch { return trimmed; }
      } else {
        return trimmed;
      }
    }
  }
  if (Array.isArray(data)) {
    return data.join(', ') || '-';
  }
  if (data && typeof data === 'object') {
    const parts = Object.entries(data).map(([label, items]) => {
      const list = Array.isArray(items) ? items.join(', ') : String(items);
      return `${label}: ${list}`;
    });
    return parts.join(' | ') || '-';
  }
  return String(data);
}

function attachLeadModal(lead) {
  const leadModal = document.getElementById('lead-modal');
  if (!leadModal) return;
  leadModal.classList.add('is-open');
  (leadModal.querySelector('[data-lead-name]') || {}).textContent = lead?.name || '-';
  (leadModal.querySelector('[data-lead-id]') || {}).textContent = lead?.id || '-';
  (leadModal.querySelector('[data-lead-phone]') || {}).textContent = lead?.phone || '-';
  (leadModal.querySelector('[data-lead-type]') || {}).textContent = lead?.eventType || '-';
  (leadModal.querySelector('[data-lead-date]') || {}).textContent = lead?.eventDate || '-';
  (leadModal.querySelector('[data-lead-guests]') || {}).textContent = lead?.guests || '-';
  (leadModal.querySelector('[data-lead-package]') || {}).textContent = lead?.package || '-';
  const statusEl = leadModal.querySelector('[data-lead-status]');
  if (statusEl) {
    statusEl.textContent = renderStatusPill(lead?.status).replace(/<[^>]+>/g, '');
    statusEl.className = `status-pill ${lead?.status || 'new'}`;
  }
  (leadModal.querySelector('[data-lead-created]') || {}).textContent = lead?.created_at || '-';
  const menuList = leadModal.querySelector('[data-lead-menu]');
  if (menuList) {
    menuList.innerHTML = '';
    const menuText = formatMenu(lead?.selectedMenu);
    if (menuText && menuText !== '-') {
      menuText.split('|').forEach((segment) => {
        const li = document.createElement('li');
        li.textContent = segment.trim();
        menuList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'No guidance available';
      menuList.appendChild(li);
    }
  }
}

function attachQuoteModal({ lead, pdfUrl }) {
  const quoteModal = document.getElementById('quote-modal');
  if (!quoteModal) return;
  quoteModal.classList.add('is-open');
  currentQuoteLead = lead;
  currentQuoteUrl = pdfUrl || '';
  (quoteModal.querySelector('[data-quote-lead-name]') || {}).textContent = lead?.name || '-';
  (quoteModal.querySelector('[data-quote-lead-phone]') || {}).textContent = lead?.phone || '-';
  (quoteModal.querySelector('[data-quote-lead-type]') || {}).textContent = lead?.eventType || '-';
  (quoteModal.querySelector('[data-quote-lead-date]') || {}).textContent = lead?.eventDate || '-';
  (quoteModal.querySelector('[data-quote-lead-package]') || {}).textContent = lead?.package || '-';
  (quoteModal.querySelector('[data-quote-guests]') || {}).textContent = lead?.guests || '-';
  const menuList = quoteModal.querySelector('[data-quote-menu]');
  if (menuList) {
    menuList.innerHTML = '';
    const menuText = formatMenu(lead?.selectedMenu);
    if (menuText && menuText !== '-') {
      menuText.split('|').forEach((segment) => {
        const li = document.createElement('li');
        li.textContent = segment.trim();
        menuList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'No guidance available';
      menuList.appendChild(li);
    }
  }
  const linkEl = quoteModal.querySelector('[data-quote-link]');
  if (linkEl) {
    linkEl.href = pdfUrl || '#';
  }
  // Prefill calculators
  const priceInput = quoteModal.querySelector('[data-quote-price]');
  const serviceInput = quoteModal.querySelector('[data-quote-service]');
  const transportInput = quoteModal.querySelector('[data-quote-transport]');

  const foodTotalEl = quoteModal.querySelector('[data-quote-food-total]');
  const serviceTotalEl = quoteModal.querySelector('[data-quote-service-total]');
  const transportTotalEl = quoteModal.querySelector('[data-quote-transport-total]');
  const grandEl = quoteModal.querySelector('[data-quote-grand]');

  const guests = Number(lead?.guests || 0);

  function recalc() {
    const price = Number(priceInput?.value || 0);
    const service = Number(serviceInput?.value || 0);
    const transport = Number(transportInput?.value || 0);
    const foodTotal = price * guests;
    const grand = foodTotal + service + transport;
    if (foodTotalEl) foodTotalEl.textContent = `₹${foodTotal.toLocaleString('en-IN')}`;
    if (serviceTotalEl) serviceTotalEl.textContent = `₹${service.toLocaleString('en-IN')}`;
    if (transportTotalEl) transportTotalEl.textContent = `₹${transport.toLocaleString('en-IN')}`;
    if (grandEl) grandEl.textContent = `₹${grand.toLocaleString('en-IN')}`;
  }

  [priceInput, serviceInput, transportInput].forEach((input) => {
    if (input) {
      input.value = input.value || 0;
      input.oninput = recalc;
      input.onchange = recalc;
    }
  });
  recalc();

  const downloadBtn = quoteModal.querySelector('[data-quote-download]');
  if (downloadBtn) {
    downloadBtn.onclick = () => generatePdfAndDownload();
  }
  const copyBtn = quoteModal.querySelector('[data-copy-quote-link]');
  if (copyBtn) {
    copyBtn.onclick = async () => {
      if (pdfUrl && navigator.clipboard) {
        await navigator.clipboard.writeText(pdfUrl);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy Link'; }, 1200);
      }
    };
  }
  const emailBtn = quoteModal.querySelector('[data-quote-email]');
  if (emailBtn) {
    emailBtn.onclick = () => {
      const subject = encodeURIComponent('Your Bansuri Catering quote');
      const link = currentPdfBlobUrl || currentQuoteUrl || '';
      const body = encodeURIComponent(`Hi,\n\nHere is your catering quote.\n${link ? `Download: ${link}` : 'Please see attached PDF.'}\n\nThank you!`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };
  }
  const waBtn = quoteModal.querySelector('[data-quote-whatsapp]');
  if (waBtn) {
    waBtn.onclick = () => {
      const link = currentPdfBlobUrl || currentQuoteUrl || '';
      const text = encodeURIComponent(`Here is your catering quote${link ? ': ' + link : ''}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    };
  }
}

function leadsTable(leads = []) {
  if (!leads.length) return '<p class="menu-summary-muted">No leads yet.</p>';
  const rows = leads.map((lead) => `
    <tr data-lead-id="${lead.id}">
      <td>${lead.name || '-'}</td>
      <td>${lead.phone || '-'}</td>
      <td>${lead.eventType || '-'}</td>
      <td>${lead.eventDate || '-'}</td>
      <td>${lead.guests || '-'}</td>
      <td>${lead.package || '-'}</td>
      <td class="text-muted">See “View”</td>
      <td>
        <div class="status-cell">
          ${renderStatusPill(lead.status)}
          <select data-status>
            <option value="new" ${lead.status === 'new' ? 'selected' : ''}>New lead</option>
            <option value="quote" ${lead.status === 'quote' ? 'selected' : ''}>Quote Sent</option>
            <option value="follow" ${lead.status === 'follow' ? 'selected' : ''}>Follow Up</option>
            <option value="closed" ${lead.status === 'closed' ? 'selected' : ''}>Closed</option>
          </select>
        </div>
      </td>
      <td class="action-cell">
        <button class="btn btn--ghost btn--compact" data-view>View</button>
        <button class="btn btn--secondary btn--compact" data-quote>Generate Quote</button>
      </td>
    </tr>
  `);
  return `<table>
    <thead>
      <tr>
        <th>Name</th><th>Phone</th><th>Event</th><th>Date</th><th>Guests</th><th>Package</th><th>Menu Guidance</th><th>Status</th><th>Actions</th>
      </tr>
    </thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

function simpleTable(items = [], cols = []) {
  if (!items.length) return '<p class="menu-summary-muted">Nothing here yet.</p>';
  const header = cols.map((c) => `<th>${c.label}</th>`).join('');
  const body = items.map((item) => `<tr>${cols.map((c) => `<td>${item[c.key] ?? '-'}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

export function initDashboard(options = {}) {
  const { redirectAfterLogin = false, scrollOnShow = false } = options;
  const dashboard = $('#dashboard');
  const loginModal = $('#login-modal');
  const leadsTableEl = $('#leads-table');
  const packagesTableEl = $('#packages-table');
  const menuTableEl = $('#menu-table');
  const loginError = $('#login-error');

  function openModal() {
    loginModal?.classList.add('is-open');
  }
  function closeModal() {
    loginModal?.classList.remove('is-open');
    loginError.textContent = '';
  }

  document.querySelectorAll('[data-open-login]').forEach((btn) => btn.addEventListener('click', openModal));
  document.querySelectorAll('[data-close-login]').forEach((btn) => btn.addEventListener('click', closeModal));

  $('#login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#login-email').value;
    const password = $('#login-password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const prevText = submitBtn?.textContent;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';
    }
    try {
      await login(email, password);
      closeModal();
      if (redirectAfterLogin) {
        window.location.href = '/dashboard.html';
        return;
      }
      showDashboard(true);
      await loadAll();
    } catch (err) {
      loginError.textContent = err?.message || 'Login failed. Please try again.';
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = prevText;
      }
    }
  });

  $('[data-logout]')?.addEventListener('click', () => {
    logout();
    dashboard?.classList.add('is-hidden');
  });

  document.querySelectorAll('.dash-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.dash-tab').forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const target = tab.dataset.dashTab;
      document.querySelectorAll('.dashboard__panel').forEach((panel) => {
        panel.classList.toggle('is-hidden', panel.dataset.dashPanel !== target);
      });
    });
  });

  async function loadLeads() {
    try {
      const leads = await leadsApi.list();
      leadsTableEl.innerHTML = leadsTable(leads);
      leadsTableEl.querySelectorAll('select[data-status]').forEach((select) => {
        select.addEventListener('change', async (e) => {
          const row = e.target.closest('tr');
          const id = row?.dataset.leadId;
          const value = e.target.value;
          await leadsApi.updateStatus(id, value);
          await loadLeads();
        });
      });
      leadsTableEl.querySelectorAll('[data-quote]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const row = e.target.closest('tr');
          const id = row?.dataset.leadId;
          const lead = leads.find((l) => l.id === id);
          const quote = await leadsApi.createQuote(id);
          attachQuoteModal({ lead, pdfUrl: quote.pdfUrl });
        });
      });
      leadsTableEl.querySelectorAll('[data-view]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const row = e.target.closest('tr');
          const id = row?.dataset.leadId;
          const lead = leads.find((l) => l.id === id);
          attachLeadModal(lead);
        });
      });
    } catch {
      leadsTableEl.innerHTML = '<p class="error-text">Failed to load leads.</p>';
    }
  }

  async function loadPackages() {
    try {
      const list = await packagesApi.list();
      packagesTableEl.innerHTML = simpleTable(list, [
        { key: 'name', label: 'Name' },
        { key: 'tier', label: 'Tier' },
        { key: 'price', label: 'Price' }
      ]);
    } catch {
      packagesTableEl.innerHTML = '<p class="error-text">Failed to load packages.</p>';
    }
  }

  async function loadMenu() {
    try {
      const list = await menuApi.list();
      const rows = list.map((cat) => ({
        name: cat.name,
        items: (cat.items || []).join(', ')
      }));
      menuTableEl.innerHTML = simpleTable(rows, [
        { key: 'name', label: 'Category' },
        { key: 'items', label: 'Items' }
      ]);
    } catch {
      menuTableEl.innerHTML = '<p class="error-text">Failed to load menu.</p>';
    }
  }

  async function loadAll() {
    await Promise.all([loadLeads(), loadPackages(), loadMenu()]);
  }

  function showDashboard(shouldScroll = false) {
    dashboard?.classList.remove('is-hidden');
    if ((shouldScroll || scrollOnShow) && dashboard) {
      dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Auto show if token already exists
  if (getToken()) {
    showDashboard();
    loadAll();
  }

  document.querySelectorAll('[data-close-lead]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const leadModal = document.getElementById('lead-modal');
      leadModal?.classList.remove('is-open');
    });
  });

  document.querySelectorAll('[data-close-quote]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const quoteModal = document.getElementById('quote-modal');
      quoteModal?.classList.remove('is-open');
    });
  });

}
