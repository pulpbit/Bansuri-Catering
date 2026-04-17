import { isValidEventDate } from './date.js';

export function validateStep(step, formState) {
  switch (step) {
    case 0: // Basics + Guests
      if (!formState.name || formState.name.trim().length < 2) {
        return 'Please enter a valid name.';
      }
      if (!/^\+?[0-9\s-]{8,15}$/.test(formState.phone || '')) {
        return 'Please enter a valid phone number.';
      }
      if (!formState.eventType) {
        return 'Please select an event type.';
      }
      if (!isValidEventDate(formState.eventDate)) {
        return 'Please add your event date in dd-mm-yyyy format.';
      }
      if (!Number.isFinite(Number(formState.guests)) || Number(formState.guests) < 20) {
        return 'Please enter expected guests (minimum 20).';
      }
      return '';
    case 1: // Package
      if (!formState.packageId) {
        return 'Please select one package.';
      }
      return '';
    case 2: // Menu Guidance (No validation needed usually)
      return '';
    case 3: // Review (No validation needed)
      return '';
    default:
      return '';
  }
}
