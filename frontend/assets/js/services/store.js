const STORAGE_KEY = 'bansuriLeadDraft';

const DEFAULT_STATE = {
  name: '',
  phone: '',
  eventType: '',
  guests: '',
  packageId: '',
  menu: '',
  menuSelections: {}
};

export function loadLeadDraft() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveLeadDraft(partialState) {
  const current = loadLeadDraft();
  const next = { ...current, ...partialState };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearLeadDraft() {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_STATE };
}

export function getDefaultState() {
  return { ...DEFAULT_STATE };
}
