import { renderHome } from './views/home.js';
import { renderExplore, renderResults } from './views/explore.js';
import { renderDepartments } from './views/departments.js';
import { renderCompare } from './views/compare.js';
import { renderDetail } from './views/detail.js';
import { renderArtist } from './views/artist.js';

const views = {
  home: renderHome,
  explore: renderExplore,
  results: renderResults,
  departments: renderDepartments,
  compare: renderCompare,
  detail: renderDetail,
  artist: renderArtist,
};

function getRoute() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const [path, queryString = ''] = hash.split('?');
  const segments = path.split('/').filter(Boolean);
  const name = segments[0] || 'home';
  const param = segments[1] || '';
  const params = Object.fromEntries(new URLSearchParams(queryString).entries());

  return { name, param, params };
}

export function initRouter(rootElement) {
  window.addEventListener('hashchange', () => render(rootElement));
  render(rootElement);
}

async function render(rootElement) {
  const { name, param, params } = getRoute();
  const activeView = views[name] || renderHome;
  await activeView(rootElement, param, params);
  updateActiveNav(name);
}

function updateActiveNav(routeName) {
  document.querySelectorAll('[data-route]').forEach((link) => {
    link.classList.toggle('active', link.dataset.route === routeName);
  });
}