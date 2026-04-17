import { EVENT_TYPES, PACKAGE_OPTIONS } from '../data/packages.js';
import { createElement, formatPackageLabel } from '../utils/helpers.js';
import { getMenuItems } from '../data/menus.js';
import { normalizeEventDate, toPickerDateValue } from '../utils/date.js';

function inputGroup(labelText, field) {
  const label = createElement('label', '', labelText);
  label.append(field);
  return label;
}

function createEventDateInput(value, placeholder) {
  const wrap = createElement('div', 'date-input-wrap');
  const field = createElement('input');
  field.type = 'text';
  field.dataset.field = 'eventDate';
  field.placeholder = placeholder;
  field.inputMode = 'numeric';
  field.autocomplete = 'off';
  field.maxLength = 10;
  field.value = normalizeEventDate(value) || '';

  const picker = createElement('input', 'date-input-native');
  picker.type = 'date';
  picker.tabIndex = -1;
  picker.setAttribute('aria-hidden', 'true');
  picker.value = toPickerDateValue(value);

  const pickerButton = createElement('button', 'btn btn--secondary btn--compact date-input-trigger', 'Pick date');
  pickerButton.type = 'button';

  const syncFromPicker = () => {
    const formatted = normalizeEventDate(picker.value);
    field.value = formatted;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const syncPickerFromField = () => {
    const formatted = normalizeEventDate(field.value);
    field.value = formatted || field.value.trim();
    picker.value = toPickerDateValue(formatted);
  };

  const openPicker = () => {
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
      return;
    }
    picker.focus();
    picker.click();
  };

  picker.addEventListener('change', syncFromPicker);
  field.addEventListener('blur', syncPickerFromField);
  pickerButton.addEventListener('click', openPicker);
  field.addEventListener('click', openPicker);

  wrap.append(field, pickerButton, picker);
  return wrap;
}

export function renderStepper(stepperRoot, activeStep, steps) {
  stepperRoot.innerHTML = '';
  steps.forEach((step, idx) => {
    const item = createElement('div', `stepper__item ${idx === activeStep ? 'is-active' : ''}`);
    const bullet = createElement('div', 'stepper__bullet', `${idx + 1}`);
    const label = createElement('span', 'stepper__label', step);
    item.append(bullet, label);
    stepperRoot.append(item);
  });
}

export function renderStep(contentRoot, step, state) {
  contentRoot.innerHTML = '';
  const section = createElement('section', 'step fade-in-up');

if (step === 0) {
    const order = ['name', 'phone', 'eventType', 'eventDate', 'guests', 'message'];
    const labels = {
      name: 'Your full name',
      phone: 'Best phone number',
      eventType: 'Event type',
      eventDate: 'Event date',
      guests: 'Number of guests',
      message: 'Any special request or message for us',
    };

    const derivedStage = order.findIndex((k) => !state[k]);
    const stage = Number.isFinite(state.basicsStage) ? state.basicsStage : (derivedStage === -1 ? order.length - 1 : derivedStage);
    const activeStage = Math.min(stage, order.length - 1);

    const chat = createElement('div', 'chat-intake');

    const completedWrap = createElement('div', 'chat-history');
    order.slice(0, activeStage).forEach((key) => {
      if (!state[key]) return;
      const bubble = createElement('div', 'chat-bubble is-summary');
      bubble.innerHTML = `<strong>${labels[key]}:</strong> ${state[key]}`;
      completedWrap.append(bubble);
    });
    if (completedWrap.children.length) chat.append(completedWrap);

    const prompt = createElement('div', 'chat-bubble is-question', `Let's plan your event! What's your ${labels[order[activeStage]].toLowerCase()}?`);
    chat.append(prompt);

    const inputWrap = createElement('div', 'chat-input');
    const key = order[activeStage];
    let field;
    if (key === 'eventType') {
      field = createElement('select');
      field.dataset.field = 'eventType';
      field.innerHTML = '<option value="">Select event type</option>';
      EVENT_TYPES.forEach((item) => {
        const option = createElement('option', '', item);
        option.value = item;
        option.selected = state.eventType === item;
        field.append(option);
      });
    } else {
      field = createElement('input');
      field.dataset.field = key;
      field.placeholder = labels[key];
      field.value = state[key] || '';
      if (key === 'phone') {
        field.type = 'tel';
      } else if (key === 'guests') {
        field.type = 'number';
        field.min = '20';
        field.step = '1';
      } else if (key === 'eventDate') {
        field = createEventDateInput(state[key], 'dd-mm-yyyy');
      } else if (key === 'message') {
        field = createElement('textarea');
        field.dataset.field = key;
        field.placeholder = labels[key];
        field.value = state[key] || '';
        field.rows = 3;
      } else {
        field.type = 'text';
      }
    }
    inputWrap.append(field);

    const ctaRow = createElement('div', 'chat-controls');
    if (activeStage < order.length - 1) {
      const nextFieldBtn = createElement('button', 'btn btn--secondary btn--compact', 'Next field');
      nextFieldBtn.type = 'button';
      nextFieldBtn.onclick = () => {
        const nextStage = Math.min(order.length - 1, activeStage + 1);
        document.dispatchEvent(new CustomEvent('requestAdvanceBasics', { detail: { currentKey: key, nextStage } }));
      };
      ctaRow.append(nextFieldBtn);
    } else {
      const doneNote = createElement('p', 'chat-done', 'All basics captured. Hit Continue to move ahead.');
      ctaRow.append(doneNote);
    }
    inputWrap.append(ctaRow);
    chat.append(inputWrap);

    const helper = createElement('p', 'chat-hint', 'We’ll auto-advance as you fill each field. Continue when everything is set.');
    section.append(chat, helper);
  }

  if (step === 1) {
    const wrap = createElement('div', 'package-grid');
    PACKAGE_OPTIONS.forEach((pkg) => {
      const card = createElement('article', `package-card ${state.packageId === pkg.id ? 'is-selected' : ''}`);
      card.dataset.packageId = pkg.id;
      card.tabIndex = 0;
      card.innerHTML = `
        <h4>${pkg.name} <small>(${pkg.tier})</small></h4>
        <ul>${pkg.highlights.map((item) => `<li>${item}</li>`).join('')}</ul>
        <p class="package-card__note">• Chef curated experience</p>
      `;
      wrap.append(card);
    });
    section.append(wrap);
  }

  if (step === 2) {
    const selectedPackage = PACKAGE_OPTIONS.find((pkg) => pkg.id === state.packageId);
    if (!selectedPackage) {
      section.append(createElement('p', 'error-text', 'Please go back and select a package first.'));
    } else {
      const menuWrap = createElement('div', 'menu-option-wrap');
      menuWrap.append(createElement('p', '', `Package selected: ${formatPackageLabel(selectedPackage)}`));
      
      const suggestions = selectedPackage.menuPlan || [];
      if (suggestions.length) {
        const suggestionGrid = createElement('div', 'menu-suggestion-grid');
        suggestions.forEach((entry) => {
          const menuItems = entry.category ? getMenuItems(entry.category) : entry.items || [];
          
          // Use shuffled selections from state if they exist, otherwise fallback
          const options = (state.selectedMenuItems && state.selectedMenuItems[entry.label]) 
            ? state.selectedMenuItems[entry.label]
            : menuItems.slice(0, entry.count || menuItems.length);
          
          if (!options.length) return;
          const card = createElement('article', 'menu-suggestion-card');
          const titleText = `${entry.label}${entry.count ? ` (${entry.count} ${entry.count > 1 ? 'options' : 'option'})` : ''}`;
          card.append(createElement('h4', 'menu-suggestion__title', titleText));
          if (entry.description) {
            card.append(createElement('p', 'menu-suggestion__description', entry.description));
          }
          const list = createElement('ul', 'menu-suggestion-list');
          options.forEach((item) => {
            const li = createElement('li');
            li.textContent = item;
            list.append(li);
          });
          card.append(list);
          suggestionGrid.append(card);
        });
        if (suggestionGrid.children.length) {
          menuWrap.append(createElement('h4', 'menu-suggestion-heading', 'Chef suggested pairings'));
          menuWrap.append(suggestionGrid);
        }
      } else {
        menuWrap.append(createElement('p', 'menu-summary-muted', 'Chef guidance is reserved for select packages.'));
      }
      section.append(menuWrap);
    }
  }

  if (step === 3) {
    const selectedPackage = PACKAGE_OPTIONS.find((pkg) => pkg.id === state.packageId);
    const list = createElement('div', 'review-list');
    const rows = [
      ['Name', state.name || '-'],
      ['Phone', state.phone || '-'],
      ['Event Type', state.eventType || '-'],
      ['Event Date', state.eventDate || '-'],
      ['Guests', state.guests || '-'],
      ['Package', formatPackageLabel(selectedPackage) || '-']
    ];
    rows.forEach(([label, value]) => {
      const item = createElement('div', 'review-item');
      item.innerHTML = `<strong>${label}</strong><strong>${value}</strong>`;
      list.append(item);
    });
    section.append(list);
    
    const menuPlan = selectedPackage?.menuPlan || [];
    const menuSummary = createElement('div', 'review-menu-summary');
    menuSummary.append(createElement('h4', '', 'Selected menu guidance'));
    if (menuPlan.length) {
      const summaryList = createElement('div', 'review-menu-summary__list');
      menuPlan.forEach((entry) => {
        const menuItems = entry.category ? getMenuItems(entry.category) : entry.items || [];
        
        // Use shuffled selections from state if they exist, otherwise fallback
        const values = (state.selectedMenuItems && state.selectedMenuItems[entry.label])
          ? state.selectedMenuItems[entry.label]
          : menuItems.slice(0, entry.count || menuItems.length);

        if (!values.length) return;
        const label = createElement('div', 'review-menu-summary__item');
        const descriptor = `${entry.label}${entry.count ? ` (${entry.count} ${entry.count > 1 ? 'choices' : 'choice'})` : ''}`;
        const detail = createElement('p', 'review-menu-summary__detail', descriptor);
        const itemsText = values.join(', ');
        const items = createElement('p', 'review-menu-summary__items', itemsText);
        label.append(detail, items);
        summaryList.append(label);
      });
      if (summaryList.children.length) {
        menuSummary.append(summaryList);
      } else {
        menuSummary.append(createElement('p', 'menu-summary-muted', 'Chef guidance will appear once the package is finalized.'));
      }
    } else {
      menuSummary.append(createElement('p', 'menu-summary-muted', 'Chef guidance is reserved for select packages.'));
    }
    section.append(menuSummary);
  }

  const error = createElement('p', 'error-text');
  error.id = 'step-error';
  section.append(error);
  contentRoot.append(section);
}
