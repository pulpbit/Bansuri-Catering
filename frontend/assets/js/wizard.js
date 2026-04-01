import { PACKAGE_OPTIONS } from './data/packages.js';
import { renderStep, renderStepper } from './components/renderers.js';
import { validateStep } from './utils/validators.js';
import { $, formatPackageLabel } from './utils/helpers.js';
import { clearLeadDraft, loadLeadDraft, saveLeadDraft } from './services/store.js';
import { getMenuItems } from './data/menus.js';

const STEP_LABELS = ['Basics', 'Package', 'Menu', 'Review'];

export function initWizard() {
  const contentRoot = $('#wizard-content');
  const stepperRoot = $('#stepper');
  const prevBtn = $('#prev-btn');
  const nextBtn = $('#next-btn');
  const shuffleBtn = $('#shuffle-menu-btn');
  
  let state = loadLeadDraft();
  let step = 0;

  function setError(message = '') {
    const errorNode = $('#step-error');
    if (errorNode) errorNode.textContent = message;
  }

  function paint() {
    if (state.completed) {
      renderThankYou();
      return;
    }

    renderStepper(stepperRoot, step, STEP_LABELS);
    renderStep(contentRoot, step, state);
    
    // Update navigation buttons
    if (prevBtn) {
      prevBtn.disabled = step === 0;
      prevBtn.onclick = () => {
        if (step > 0) {
          step -= 1;
          paint();
        }
      };
    }
    
    if (nextBtn) {
      nextBtn.textContent = step === STEP_LABELS.length - 1 ? 'Submit Details' : 'Continue';
      nextBtn.onclick = () => handleNext();
    }

    // Update sticky shuffle button
    if (shuffleBtn) {
      // Step 2 is 'Menu' (0-indexed: Basics=0, Package=1, Menu=2, Review=3)
      if (step === 2 && state.packageId) {
        shuffleBtn.style.display = 'inline-flex';
        shuffleBtn.onclick = (e) => {
          e.preventDefault();
          shuffleSelections();
          paint();
        };
      } else {
        shuffleBtn.style.display = 'none';
      }
    }
    
    bindDynamicEvents();
  }

  function renderThankYou() {
    const template = $('#thank-you-template');
    const form = $('#planning-form');
    const actions = $('.wizard__actions');
    if (template && form) {
      form.replaceWith(template.content.cloneNode(true));
      if (actions) actions.style.display = 'none'; // Hide sticky bar on thank you
      
      const restart = $('#restart-btn');
      if (restart) {
        restart.onclick = () => resetWizard();
      }
    }
  }

  function resetWizard() {
    state = clearLeadDraft();
    step = 0;
    window.location.reload();
  }

  function handleNext() {
    const error = validateStep(step, state);
    if (error) {
      setError(error);
      return;
    }

    if (step < STEP_LABELS.length - 1) {
      if (step === 1 && (!state.selectedMenuItems || Object.keys(state.selectedMenuItems).length === 0)) {
        shuffleSelections();
      }
      step += 1;
      paint();
      window.scrollTo({ top: $('#lead-form').offsetTop - 80, behavior: 'smooth' });
      return;
    }

    state = saveLeadDraft({ completed: true });
    renderThankYou();
  }

  function updateField(field, value) {
    state = saveLeadDraft({ [field]: value });
    setError('');
  }

  function shuffleSelections() {
    const selectedPackage = PACKAGE_OPTIONS.find((pkg) => pkg.id === state.packageId);
    if (!selectedPackage) return;
    const menuPlan = selectedPackage.menuPlan || [];
    const newSelections = {};

    menuPlan.forEach((entry) => {
      const items = entry.category ? getMenuItems(entry.category) : entry.items || [];
      if (!items.length) return;
      const count = entry.count || 1;
      
      const shuffled = [...items].sort(() => 0.5 - Math.random());
      newSelections[entry.label] = shuffled.slice(0, count);
    });

    updateField('selectedMenuItems', newSelections);
  }

  function bindDynamicEvents() {
    contentRoot.querySelectorAll('[data-field]').forEach((field) => {
      field.addEventListener('input', (event) => {
        updateField(event.target.dataset.field, event.target.value);
      });
      field.addEventListener('change', (event) => {
        updateField(event.target.dataset.field, event.target.value);
      });
    });

    contentRoot.querySelectorAll('[data-package-id]').forEach((card) => {
      card.onclick = () => {
        const packageId = card.dataset.packageId;
        updateField('packageId', packageId);
        shuffleSelections();
        paint();
      };
    });
  }

  paint();
}
