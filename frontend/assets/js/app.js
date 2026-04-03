import { hidePackageShowcase, initPackageShowcase } from './components/package-showcase.js';
import { initWizard, resetWizardState } from './wizard.js';
import { initDashboard } from './dashboard.js';

function initScrollTriggers() {
  const plannerSection = document.getElementById('lead-form');
  document.querySelectorAll('[data-scroll-to-form]').forEach((button) => {
    button.addEventListener('click', () => {
      resetWizardState();
      plannerSection?.classList.remove('is-hidden');
      hidePackageShowcase();
      document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function bootstrap() {
  initScrollTriggers();
  initWizard();
  initPackageShowcase();
  initDashboard();
}

document.addEventListener('DOMContentLoaded', bootstrap);
