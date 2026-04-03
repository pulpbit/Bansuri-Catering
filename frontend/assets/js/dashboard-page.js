import { initDashboard } from './dashboard.js';
import { getToken } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  if (!getToken()) {
    const modal = document.getElementById('login-modal');
    modal?.classList.add('is-open');
  } else {
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.remove('is-open');
    initDashboard({ redirectAfterLogin: false, scrollOnShow: true });
  }
  // Initialize dashboard once; if login succeeds, the handler will show it.
  initDashboard({ redirectAfterLogin: false, scrollOnShow: true });
});
