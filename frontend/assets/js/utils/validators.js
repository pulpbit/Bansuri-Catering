import { isMenuComplete } from './menu-engine.js';

export function validateStep(step, formState) {
  switch (step) {
    case 0:
      if (!formState.name || formState.name.trim().length < 2) {
        return 'Please enter a valid name.';
      }
      if (!/^\+?[0-9\s-]{8,15}$/.test(formState.phone || '')) {
        return 'Please enter a valid phone number.';
      }
      if (!formState.eventType) {
        return 'Please select an event type.';
      }
      return '';
    case 1:
      if (!Number.isFinite(Number(formState.guests)) || Number(formState.guests) < 20) {
        return 'Please enter expected guests (minimum 20).';
      }
      return '';
    case 2:
      if (!formState.packageId) {
        return 'Please select one package.';
      }
      return '';
    case 3:
      if (!isMenuComplete(formState.packageId, formState.menuSelections)) {
        return 'Please complete menu selections for all required sections.';
      }
      return '';
    default:
      return '';
  }
}
