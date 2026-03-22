import { initWizard } from './wizard.js';

function initScrollTriggers() {
  document.querySelectorAll('[data-scroll-to-form]').forEach((button) => {
    button.addEventListener('click', () => {
      document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function bootstrap() {
  initScrollTriggers();
  initWizard();
}

document.addEventListener('DOMContentLoaded', bootstrap);
