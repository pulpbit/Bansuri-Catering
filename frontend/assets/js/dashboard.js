import { login, logout, leadsApi, packagesApi, menuApi, getToken } from './api.js';
import { $ } from './utils/helpers.js';

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
  (leadModal.querySelector('[data-lead-phone]') || {}).textContent = lead?.phone || '-';
  (leadModal.querySelector('[data-lead-type]') || {}).textContent = lead?.eventType || '-';
  (leadModal.querySelector('[data-lead-date]') || {}).textContent = lead?.eventDate || '-';
  (leadModal.querySelector('[data-lead-guests]') || {}).textContent = lead?.guests || '-';
  (leadModal.querySelector('[data-lead-package]') || {}).textContent = lead?.package || '-';
  (leadModal.querySelector('[data-lead-status]') || {}).textContent = lead?.status || '-';
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
          const quote = await leadsApi.createQuote(id);
          alert(`Quote ready. PDF URL: ${quote.pdfUrl}`);
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
}
