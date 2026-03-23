import { EVENT_TYPES, PACKAGE_OPTIONS } from '../data/packages.js';
import { createElement, formatPackageLabel } from '../utils/helpers.js';
import { getMenuItems } from '../data/menus.js';

function inputGroup(labelText, field) {
  const label = createElement('label', '', labelText);
  label.append(field);
  return label;
}

export function renderStepper(stepperRoot, activeStep, steps) {
  stepperRoot.innerHTML = '';
  steps.forEach((step, idx) => {
    const item = createElement('div', `stepper__item ${idx === activeStep ? 'is-active' : ''}`, `${idx + 1}. ${step}`);
    stepperRoot.append(item);
  });
}

export function renderStep(contentRoot, step, state) {
  contentRoot.innerHTML = '';
  const section = createElement('section', 'step fade-in-up');

  if (step === 0) {
    section.append(createElement('h3', '', 'Tell us about your event'));
    const grid = createElement('div', 'grid-2');

    const name = createElement('input');
    name.type = 'text';
    name.placeholder = 'Your full name';
    name.value = state.name;
    name.dataset.field = 'name';

    const phone = createElement('input');
    phone.type = 'tel';
    phone.placeholder = 'Phone number';
    phone.value = state.phone;
    phone.dataset.field = 'phone';

    const eventType = createElement('select');
    eventType.dataset.field = 'eventType';
    eventType.innerHTML = '<option value="">Select event type</option>';
    EVENT_TYPES.forEach((item) => {
      const option = createElement('option', '', item);
      option.value = item;
      option.selected = state.eventType === item;
      eventType.append(option);
    });

    grid.append(inputGroup('Name', name), inputGroup('Phone', phone), inputGroup('Event Type', eventType));
    section.append(grid);
  }

  if (step === 1) {
    section.append(createElement('h3', '', 'How many guests are expected?'));
    const guests = createElement('input');
    guests.type = 'number';
    guests.min = '20';
    guests.step = '1';
    guests.placeholder = 'e.g. 150';
    guests.value = state.guests;
    guests.dataset.field = 'guests';
    section.append(inputGroup('Number of Guests', guests));
  }

  if (step === 2) {
    section.append(createElement('h3', '', 'Choose one package'));
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

  if (step === 3) {
    section.append(createElement('h3', '', 'Chef curated menu for your package'));
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
          const options = menuItems.slice(0, entry.count || menuItems.length);
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

  if (step === 4) {
    section.append(createElement('h3', '', 'Review details before submit'));
    const selectedPackage = PACKAGE_OPTIONS.find((pkg) => pkg.id === state.packageId);
    const list = createElement('div', 'review-list');
    const rows = [
      ['Name', state.name || '-'],
      ['Phone', state.phone || '-'],
      ['Event Type', state.eventType || '-'],
      ['Guests', state.guests || '-'],
      ['Package', formatPackageLabel(selectedPackage)],
      ['Menu', state.menu || '-']
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
        const values = menuItems.slice(0, entry.count || menuItems.length);
        if (!values.length) return;
        const label = createElement('div', 'review-menu-summary__item');
        const descriptor = `${entry.label}${entry.count ? ` (${entry.count} ${entry.count > 1 ? 'choices' : 'choice'})` : ''}`;
        const detail = createElement('p', 'review-menu-summary__detail', descriptor);
        const itemsText = entry.count ? values.join(', ') : values.join(', ');
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
