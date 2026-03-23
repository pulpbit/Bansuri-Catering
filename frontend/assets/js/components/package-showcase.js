import { PACKAGE_OPTIONS } from '../data/packages.js';
import { createElement } from '../utils/helpers.js';

const showcaseRootId = 'package-showcase';
const gridRootId = 'package-showcase-grid';
const plannerSectionId = 'lead-form';

let packageSection;
let plannerSection;
let activePackageId = '';

function renderPackages() {
  const grid = document.getElementById(gridRootId);
  if (!grid) return;
  grid.innerHTML = '';
  PACKAGE_OPTIONS.forEach((pkg) => {
    const card = createElement('article', 'package-card package-showcase__card');
    if (pkg.id === activePackageId) card.classList.add('is-selected');
    card.dataset.packageShowcase = pkg.id;
    card.tabIndex = 0;
    card.innerHTML = `
      <h4>${pkg.name} <small>(${pkg.tier})</small></h4>
      <ul>${pkg.highlights.map((item) => `<li>${item}</li>`).join('')}</ul>
      <p class="package-card__note">Chef curated experience</p>
    `;
    card.addEventListener('click', () => selectPackage(pkg.id));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectPackage(pkg.id);
      }
    });
    grid.append(card);
  });
}

function selectPackage(packageId) {
  activePackageId = packageId;
  renderPackages();
}

function showPackageShowcase() {
  renderPackages();
  packageSection?.classList.add('is-visible');
  plannerSection?.classList.add('is-hidden');
  packageSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function hidePackageShowcase() {
  packageSection?.classList.remove('is-visible');
}

export function initPackageShowcase() {
  const button = document.querySelector('[data-show-packages]');
  packageSection = document.getElementById(showcaseRootId);
  plannerSection = document.getElementById(plannerSectionId);
  if (!button || !packageSection) return;

  button.addEventListener('click', () => {
    showPackageShowcase();
  });
}
