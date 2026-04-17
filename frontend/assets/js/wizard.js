import { PACKAGE_OPTIONS } from './data/packages.js';
import { renderStep, renderStepper } from './components/renderers.js';
import { validateStep } from './utils/validators.js';
import { $, formatPackageLabel } from './utils/helpers.js';
import { clearLeadDraft, loadLeadDraft, saveLeadDraft } from './services/store.js';
import { getMenuItems } from './data/menus.js';
import { createLeadPublic } from './api.js';
import { isValidEventDate, normalizeEventDate } from './utils/date.js';

const STEP_LABELS = ['Basics', 'Package', 'Menu', 'Review'];
const BASICS_ORDER = ['name', 'phone', 'eventType', 'eventDate', 'guests', 'message'];
let externalReset = null;

export function initWizard() {
  const contentRoot = $('#wizard-content');
  const stepperRoot = $('#stepper');
  const prevBtn = $('#prev-btn');
  const nextBtn = $('#next-btn');
  const shuffleBtn = $('#shuffle-menu-btn');
  
  let state = loadLeadDraft();
  let step = 0;

  function getBasicsStage(currentState) {
    if (Number.isFinite(currentState.basicsStage)) return currentState.basicsStage;
    const idx = BASICS_ORDER.findIndex((key) => !currentState[key]);
    return idx === -1 ? BASICS_ORDER.length - 1 : idx;
  }

  function setBasicsStage(nextStage) {
    const clamped = Math.min(BASICS_ORDER.length - 1, Math.max(0, nextStage));
    state = saveLeadDraft({ basicsStage: clamped });
    paint();
  }

  function setError(message = '') {
    const errorNode = $('#step-error');
    if (errorNode) errorNode.textContent = message;
  }

  function isBasicsFieldValid(key, value) {
    if (!value) return false;
    switch (key) {
      case 'name':
        return value.trim().length >= 2;
      case 'phone':
        return /^\+?[0-9\s-]{8,15}$/.test(value);
      case 'eventType':
        return Boolean(value);
      case 'eventDate':
        return isValidEventDate(value);
      case 'guests':
        return Number.isFinite(Number(value)) && Number(value) >= 20;
      case 'message':
        return true;
      default:
        return false;
    }
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
      if (step === 0) {
        const basicsStage = getBasicsStage(state);
        prevBtn.disabled = basicsStage === 0;
        prevBtn.onclick = () => {
          if (basicsStage > 0) {
            setBasicsStage(basicsStage - 1);
          }
        };
      } else {
        prevBtn.disabled = step === 0;
        prevBtn.onclick = () => {
          if (step > 0) {
            step -= 1;
            paint();
          }
        };
      }
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
    setError('');
    paint();
    window.scrollTo({ top: $('#lead-form').offsetTop - 80, behavior: 'smooth' });
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

    submitLead();
  }

  async function submitLead() {
    try {
      const selectedPackage = PACKAGE_OPTIONS.find((pkg) => pkg.id === state.packageId);
      const payload = {
        name: state.name,
        phone: state.phone,
        eventType: state.eventType,
        eventDate: state.eventDate,
        guests: Number(state.guests),
        message: state.message || '',
        package: formatPackageLabel(selectedPackage),
        selectedMenu: state.selectedMenuItems ? JSON.stringify(state.selectedMenuItems) : '',
        status: 'new',
      };
      await createLeadPublic(payload);
      state = saveLeadDraft({ completed: true });
      renderThankYou();
    } catch (err) {
      setError('Unable to submit right now. Please try again.');
    }
  }

  function updateField(field, value) {
    const nextValue = field === 'eventDate' ? normalizeEventDate(value) || value : value;
    state = saveLeadDraft({ [field]: nextValue });
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
    const basicsStage = getBasicsStage(state);
    const activeKey = BASICS_ORDER[Math.min(basicsStage, BASICS_ORDER.length - 1)];

    contentRoot.querySelectorAll('[data-field]').forEach((field) => {
      const advanceIfValid = (event) => {
        updateField(event.target.dataset.field, event.target.value);
        if (step === 0 && event.target.dataset.field === activeKey && isBasicsFieldValid(activeKey, event.target.value)) {
          setBasicsStage(basicsStage + 1);
        }
      };

      field.addEventListener('input', (event) => {
        updateField(event.target.dataset.field, event.target.value);
      });

      field.addEventListener('change', advanceIfValid);

      field.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          advanceIfValid(event);
        }
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

  document.addEventListener('updateBasicsStage', (event) => {
    const nextStage = Number.isFinite(event.detail) ? event.detail : getBasicsStage(state) + 1;
    setBasicsStage(nextStage);
  });

  document.addEventListener('requestAdvanceBasics', (event) => {
    const { currentKey, nextStage } = event.detail || {};
    const value = state[currentKey];
    if (!isBasicsFieldValid(currentKey, value)) {
      setError('Please complete this field before moving to the next one.');
      return;
    }
    setError('');
    setBasicsStage(Number.isFinite(nextStage) ? nextStage : getBasicsStage(state) + 1);
  });

  externalReset = resetWizard;
  paint();
}

export function resetWizardState() {
  if (typeof externalReset === 'function') {
    externalReset();
  }
}
