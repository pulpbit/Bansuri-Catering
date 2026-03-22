import { PACKAGE_OPTIONS } from './data/packages.js';
import { renderStep, renderStepper } from './components/renderers.js';
import { validateStep } from './utils/validators.js';
import { $, formatPackageLabel } from './utils/helpers.js';
import { clearLeadDraft, loadLeadDraft, saveLeadDraft } from './services/store.js';
import { suggestMenuForLead } from './utils/menu-engine.js';

const STEP_LABELS = ['Basics', 'Guests', 'Package', 'Menu', 'Review'];

export function initWizard() {
  const contentRoot = $('#wizard-content');
  const stepperRoot = $('#stepper');
  const prevBtn = $('#prev-btn');
  const nextBtn = $('#next-btn');
  const form = $('#planning-form');

  let step = 0;
  let state = loadLeadDraft();

  function setError(message = '') {
    const errorNode = $('#step-error');
    if (errorNode) errorNode.textContent = message;
  }

  function paint() {
    renderStepper(stepperRoot, step, STEP_LABELS);
    renderStep(contentRoot, step, state);
    prevBtn.disabled = step === 0;
    nextBtn.textContent = step === STEP_LABELS.length - 1 ? 'Submit Details' : 'Continue';
    bindDynamicEvents();
  }

  function updateField(field, value) {
    state = saveLeadDraft({ [field]: value });
    setError('');
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
      const selectPackage = () => {
        const packageId = card.dataset.packageId;
        updateField('packageId', packageId);
        state = saveLeadDraft({ menu: '', menuSelections: {} });
        paint();
      };
      card.addEventListener('click', selectPackage);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectPackage();
        }
      });
    });

    contentRoot.querySelector('[data-apply-suggestion="true"]')?.addEventListener('click', () => {
      const suggestion = suggestMenuForLead(state);
      state = saveLeadDraft({
        menu: suggestion.label,
        menuSelections: suggestion.selections
      });
      paint();
    });

    contentRoot.querySelectorAll('[data-menu-section]').forEach((select) => {
      select.addEventListener('change', (event) => {
        const key = event.target.dataset.menuSection;
        state = saveLeadDraft({
          menuSelections: {
            ...(state.menuSelections || {}),
            [key]: event.target.value
          }
        });
        setError('');
      });
    });
  }

  prevBtn.addEventListener('click', () => {
    if (step > 0) {
      step -= 1;
      paint();
    }
  });

  nextBtn.addEventListener('click', () => {
    const error = validateStep(step, state);
    if (error) {
      setError(error);
      return;
    }

    if (step < STEP_LABELS.length - 1) {
      step += 1;
      paint();
      return;
    }

    const selectedPackage = PACKAGE_OPTIONS.find((pkg) => pkg.id === state.packageId);
    console.info('Lead ready for API submission:', {
      ...state,
      packageLabel: formatPackageLabel(selectedPackage)
    });

    form.replaceWith($('#thank-you-template').content.cloneNode(true));
    $('#restart-btn')?.addEventListener('click', () => {
      state = clearLeadDraft();
      step = 0;
      window.location.reload();
    });
  });

  paint();
}
