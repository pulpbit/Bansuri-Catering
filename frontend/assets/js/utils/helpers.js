export const $ = (selector, scope = document) => scope.querySelector(selector);

export function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (typeof text === 'string') element.textContent = text;
  return element;
}

export function formatPackageLabel(selectedPackage) {
  if (!selectedPackage) return '-';
  return `${selectedPackage.name} (${selectedPackage.tier})`;
}
