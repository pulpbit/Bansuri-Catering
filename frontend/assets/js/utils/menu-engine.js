import { MENU_CATALOG, PACKAGE_MENU_BLUEPRINT, SECTION_LABELS } from '../data/menu-catalog.js';

function hashSeed(input) {
  return [...(input || '')].reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export function getSectionsForPackage(packageId) {
  return PACKAGE_MENU_BLUEPRINT[packageId] || [];
}

export function suggestMenuForLead({ packageId, eventType, guests }) {
  const sections = getSectionsForPackage(packageId);
  if (!sections.length) {
    return { label: '', selections: {} };
  }

  const seed = hashSeed(`${eventType}-${guests}-${packageId}`);
  const selections = {};

  sections.forEach((section, idx) => {
    const options = MENU_CATALOG[section] || [];
    selections[section] = options[(seed + idx) % options.length] || '';
  });

  return {
    label: `${eventType || 'Event'} Chef Suggestion`,
    selections
  };
}

export function isMenuComplete(packageId, selections = {}) {
  return getSectionsForPackage(packageId).every((section) => Boolean(selections[section]));
}

export function summarizeSelections(selections = {}) {
  return Object.entries(selections)
    .filter(([, value]) => value)
    .map(([section, value]) => `${SECTION_LABELS[section] || section}: ${value}`)
    .join(' • ');
}
