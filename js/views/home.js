import { fetchDepartments, searchObjects, resolveArtworkIds } from '../api.js';
import { createArtworkCard, createElement, createErrorState, createLoadingState } from './components.js';

function shuffleArray(array) {
  return array.slice().sort(() => Math.random() - 0.5);
}

function formatYearLabel(year) {
  if (year === null || year === undefined || Number.isNaN(Number(year))) {
    return 'Año desconocido';
  }
  const numeric = Number(year);
  const absYear = Math.abs(numeric);
  return numeric < 0 ? `${absYear} a.C.` : `${absYear} d.C.`;
}

function getArtworkYearRange(artworks) {
  const years = artworks.flatMap((artwork) => {
    const begin = Number(artwork.objectBeginDate);
    const end = Number(artwork.objectEndDate);
    const values = [];
    if (Number.isFinite(begin)) values.push(begin);
    if (Number.isFinite(end)) values.push(end);
    return values;
  }).filter((year) => Number.isFinite(year));

  if (!years.length) return null;
  return {
    from: Math.min(...years),
    to: Math.max(...years)
  };
}

export async function renderHome(rootElement) {
  rootElement.innerHTML = '';
  rootElement.append(createLoadingState('Cargando la página principal...'));

  try {
    const [departmentsData, museumData, highlightsData] = await Promise.all([
      fetchDepartments(),
      searchObjects({ q: 'a' }),
      searchObjects({ q: 'a', isHighlight: true, hasImages: true })
    ]);

    const departments = departmentsData.departments || [];
    const totalWorks = museumData.total || 0;
    const highlightIds = highlightsData.objectIDs || [];
    const selectedIds = shuffleArray(highlightIds).slice(0, 8);
    const artworks = await resolveArtworkIds(selectedIds);

    const hero = createElement('section', 'hero');
    hero.append(
      createElement('h1', '', 'MetHub: Explorando el Metropolitan Museum of Art'),
      createElement('p', '', 'Una entrada clara al Metropolitan Museum of Art: datos relevantes, departamentos de las obras y una selección de arte perfectamente curada.')
    );

    const heroActions = createElement('div', 'hero-actions');
    const exploreButton = createElement('button', 'button', 'Ir a explorar');
    exploreButton.type = 'button';
    exploreButton.addEventListener('click', () => {
      window.location.hash = '#explore';
    });
    heroActions.append(exploreButton);
    hero.append(heroActions);

    const overview = createElement('section', 'panel home-overview');
    overview.append(
      createElement('h2', '', '¿Qué es el Metropolitan Museum of Art?'),
      createElement('p', '', 'El Metropolitan Museum of Art es el museo más grande de arte del mundo, con una colección que abarca más de 5.000 años de historia. Desde arte antiguo hasta obras contemporáneas, el museo alberga más de 2 millones de piezas, incluyendo pinturas, esculturas, textiles, armas y armaduras, instrumentos musicales y mucho más. Su misión es preservar y exhibir estas obras para la educación y disfrute del público.'),
    );

    const yearRange = getArtworkYearRange(artworks);
    const stats = createElement('section', 'grid stats-grid');
    const departmentCard = createElement('article', 'stats-card');
    departmentCard.append(createElement('h3', '', 'Departamentos'), createElement('p', '', String(departments.length)));
    const worksCard = createElement('article', 'stats-card');
    worksCard.append(createElement('h3', '', 'Obras accesibles'), createElement('p', '', String(totalWorks)));
    const evolutionCard = createElement('article', 'stats-card');
    evolutionCard.append(
      createElement('h3', '', 'Evolución de obras'),
      createElement(
        'p',
        '',
        yearRange ? `Encontrarás obras desde ${formatYearLabel(yearRange.from)} hasta ${formatYearLabel(yearRange.to)}` : 'Rango de fechas no disponible'
      )
    );
    const refreshCard = createElement('article', 'stats-card');
    refreshCard.append(createElement('h3', '', 'Selección renovada'), createElement('p', '', '¡Haz clic para una nueva selección de obras!'));
    stats.append(departmentCard, worksCard, evolutionCard, refreshCard);

    const galleryTitle = createElement('h2', 'gallery-title', 'Selección fresca de obras');
    const gallery = createElement('section', 'grid');
    if (artworks.length > 0) {
      artworks.forEach((artwork) => {
        gallery.append(createArtworkCard(artwork, (id) => {
          window.location.hash = `#detail/${id}`;
        }));
      });
    } else {
      gallery.append(createElement('p', 'state-text', 'No se encontró ninguna obra para mostrar. Actualiza la página para intentar de nuevo.'));
    }

    rootElement.innerHTML = '';
    rootElement.append(hero, overview, stats, galleryTitle, gallery);
  } catch (error) {
    rootElement.innerHTML = '';
    rootElement.append(createErrorState(error.message || 'No se pudo cargar la vista de inicio', () => renderHome(rootElement)));
  }
}