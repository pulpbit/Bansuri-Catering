const DISPLAY_DATE_RE = /^(\d{2})-(\d{2})-(\d{4})$/;
const PICKER_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDate(day, month, year) {
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

export function normalizeEventDate(value) {
  if (!value) return '';
  const trimmed = String(value).trim();

  let match = trimmed.match(PICKER_DATE_RE);
  if (match) {
    const [, yearText, monthText, dayText] = match;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    return isRealDate(day, month, year) ? `${dayText}-${monthText}-${yearText}` : '';
  }

  match = trimmed.replace(/\//g, '-').match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return '';

  const [, dayRaw, monthRaw, yearText] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearText);
  if (!isRealDate(day, month, year)) return '';

  return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${yearText}`;
}

export function toPickerDateValue(value) {
  const normalized = normalizeEventDate(value);
  if (!normalized) return '';
  const [, day, month, year] = normalized.match(DISPLAY_DATE_RE);
  return `${year}-${month}-${day}`;
}

export function isValidEventDate(value) {
  return Boolean(normalizeEventDate(value));
}
