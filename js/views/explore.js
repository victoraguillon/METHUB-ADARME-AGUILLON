import { fetchDepartments, resolveArtworkIds, searchObjects } from '../api.js';
import { createArtworkCard, createElement, createEmptyState, createErrorState, createLoadingState, formatValue } from './components.js';

const PAGE_SIZE = 12;
const YEAR_MIN = -5000;
const YEAR_MAX = new Date().getFullYear();

function getFiltersFromParams(params = {}) {
  return {
    q: params.q || '',
    department: params.department || '',
    yearFrom: params.yearFrom || '',
    yearTo: params.yearTo || '',
    highlightOnly: params.highlightOnly === 'true',
    hasImagesOnly: params.hasImagesOnly === 'true',
    page: Number(params.page || 1)
  };
}

function buildHash(filters, route = 'explore') {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.department) params.set('department', filters.department);
  if (filters.yearFrom) params.set('yearFrom', filters.yearFrom);
  if (filters.yearTo) params.set('yearTo', filters.yearTo);
  if (filters.highlightOnly) params.set('highlightOnly', 'true');
  if (filters.hasImagesOnly) params.set('hasImagesOnly', 'true');
  if (filters.page > 1) params.set('page', String(filters.page));
  
  const queryString = params.toString();
  return `#${route}${queryString ? `?${queryString}` : ''}`;
}

function createMetric(label, value) {
  const item = createElement('div', 'stats-card');
  item.append(createElement('h4', '', label), createElement('p', '', formatValue(value, '—')));
  return item;
}

function getCenturyLabel(beginDate, endDate) {
  const value = Number(endDate || beginDate || 0);
  if (!value) return '—';
  const normalized = value < 0 ? Math.ceil(value / 100) : Math.floor(value / 100) + 1;
  return `${normalized}° siglo`;
}

function buildAggregates(artworks) {
  const counts = artworks.reduce((acc, artwork) => {
    const dept = formatValue(artwork.department, 'Sin dato');
    acc.departments[dept] = (acc.departments[dept] || 0) + 1;
    const culture = formatValue(artwork.culture, 'Sin dato');
    acc.cultures[culture] = (acc.cultures[culture] || 0) + 1;
    const century = getCenturyLabel(artwork.objectBeginDate, artwork.objectEndDate);
    acc.centuries[century] = (acc.centuries[century] || 0) + 1;
    return acc;
  }, { departments: {}, cultures: {}, centuries: {} });

  const dominantDepartment = Object.entries(counts.departments).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  const dominantCentury = Object.entries(counts.centuries).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  const dominantCulture = Object.entries(counts.cultures).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  
  return { dominantDepartment, dominantCentury, dominantCulture };
}

export async function renderExplore(rootElement, _param, params = {}) {
  const filters = getFiltersFromParams(params);
  rootElement.innerHTML = '';
  rootElement.append(createLoadingState('Consultando la colección...'));

  try {
    const departmentsData = await fetchDepartments();
    const departments = departmentsData.departments || [];

    const searchParams = {
      q: filters.q.trim()
    };

    if (filters.department) searchParams.departmentId = filters.department;
    if (filters.highlightOnly) searchParams.isHighlight = true;
    if (filters.hasImagesOnly) searchParams.hasImages = true;
    
    if (filters.yearFrom || filters.yearTo) {
      searchParams.dateBegin = filters.yearFrom ? Number(filters.yearFrom) : YEAR_MIN;
      searchParams.dateEnd = filters.yearTo ? Number(filters.yearTo) : YEAR_MAX;
    }

    const searchData = await searchObjects(searchParams);
    const allIds = searchData.objectIDs || [];
    const totalResults = searchData.total || 0;

    const startIndex = (filters.page - 1) * PAGE_SIZE;
    const pageIds = allIds.slice(startIndex, startIndex + PAGE_SIZE);
    
    const artworks = await resolveArtworkIds(pageIds);

    const panel = createElement('section', 'panel');
    const title = createElement('h2', '', 'Explorar colección');
    const intro = createElement('p', '', 'Busca, filtra y navega por la colección del Met. Los resultados se adaptan a cualquier combinación de filtros.');
    panel.append(title, intro);

    const controls = createElement('section', 'filter-box');
    const controlTitle = createElement('h3', '', 'Filtros avanzados');
    controls.append(controlTitle);

    const formGrid = createElement('div', 'form-grid');
    
    const searchInput = createElement('input', 'input');
    searchInput.placeholder = 'Buscar por título, artista o tema (opcional)';
    searchInput.value = filters.q;
    searchInput.autocomplete = 'off';

    const submitSearch = () => {
      const nextFilters = { ...filters, q: searchInput.value.trim(), page: 1 };
      window.location.hash = buildHash(nextFilters);
    };

    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const nextFilters = { ...filters, q: searchInput.value.trim(), page: 1 };
        window.location.hash = buildHash(nextFilters, 'results');
      }
    });

    const searchButton = createElement('button', 'button', 'Buscar');
    searchButton.type = 'button';
    searchButton.addEventListener('click', () => {
      const nextFilters = { ...filters, q: searchInput.value.trim(), page: 1 };
      window.location.hash = buildHash(nextFilters, 'results');
    });

    const deptSelect = createElement('select', 'select');
    const defaultOption = createElement('option', '', 'Todos los departamentos');
    defaultOption.value = '';
    deptSelect.append(defaultOption);

    departments.forEach((department) => {
      const option = createElement('option', '', department.displayName || 'Departamento');
      option.value = department.departmentId;
      if (String(filters.department) === String(department.departmentId)) {
        option.selected = true;
      }
      deptSelect.append(option);
    });

    deptSelect.addEventListener('change', () => {
      const nextFilters = { ...filters, department: deptSelect.value, page: 1 };
      window.location.hash = buildHash(nextFilters);
    });

    function getEraOptions(selectedYear) {
      const era = Number(selectedYear) < 0 ? 'BC' : 'AD';
      const absoluteYear = selectedYear ? String(Math.abs(Number(selectedYear))) : '';
      return { era, absoluteYear };
    }

    function createEraSelect(selectedEra) {
      const select = createElement('select', 'select');
      const options = [
        { value: 'AD', label: 'd.C.' },
        { value: 'BC', label: 'a.C.' }
      ];

      options.forEach((optionData) => {
        const option = createElement('option', '', optionData.label);
        option.value = optionData.value;
        if (optionData.value === selectedEra) option.selected = true;
        select.append(option);
      });

      return select;
    }

    const { era: yearFromEra, absoluteYear: yearFromValue } = getEraOptions(filters.yearFrom);
    const yearFromInput = createElement('input', 'input');
    yearFromInput.type = 'number';
    yearFromInput.placeholder = 'Año';
    yearFromInput.value = yearFromValue;

    const yearFromSelect = createEraSelect(yearFromEra);
    const yearFromWrapper = createElement('div', 'year-row');
    yearFromWrapper.append(yearFromInput, yearFromSelect);

    const { era: yearToEra, absoluteYear: yearToValue } = getEraOptions(filters.yearTo);
    const yearToInput = createElement('input', 'input');
    yearToInput.type = 'number';
    yearToInput.placeholder = 'Año';
    yearToInput.value = yearToValue;

    const yearToSelect = createEraSelect(yearToEra);
    const yearToWrapper = createElement('div', 'year-row');
    yearToWrapper.append(yearToInput, yearToSelect);

    function buildYearValue(input, era) {
      const value = Number(input.value);
      if (!input.value || Number.isNaN(value)) return '';
      return era === 'BC' ? -Math.abs(value) : Math.abs(value);
    }

    const watchYears = () => {
      const nextFilters = {
        ...filters,
        yearFrom: buildYearValue(yearFromInput, yearFromSelect.value),
        yearTo: buildYearValue(yearToInput, yearToSelect.value),
        page: 1
      };
      window.location.hash = buildHash(nextFilters);
    };

    yearFromInput.addEventListener('change', watchYears);
    yearFromSelect.addEventListener('change', watchYears);
    yearToInput.addEventListener('change', watchYears);
    yearToSelect.addEventListener('change', watchYears);

    const highlightBox = createElement('label', 'checkbox-row');
    const highlightCheckbox = createElement('input');
    highlightCheckbox.type = 'checkbox';
    highlightCheckbox.checked = filters.highlightOnly;
    highlightCheckbox.addEventListener('change', () => {
      const nextFilters = { ...filters, highlightOnly: highlightCheckbox.checked, page: 1 };
      window.location.hash = buildHash(nextFilters);
    });
    highlightBox.append(highlightCheckbox, createElement('span', '', 'Solo obras destacadas'));

    const imageBox = createElement('label', 'checkbox-row');
    const imageCheckbox = createElement('input');
    imageCheckbox.type = 'checkbox';
    imageCheckbox.checked = filters.hasImagesOnly;
    imageCheckbox.addEventListener('change', () => {
      const nextFilters = { ...filters, hasImagesOnly: imageCheckbox.checked, page: 1 };
      window.location.hash = buildHash(nextFilters);
    });
    imageBox.append(imageCheckbox, createElement('span', '', 'Solo con imagen'));

    const clearButton = createElement('button', 'button secondary', 'Limpiar filtros');
    clearButton.type = 'button';
    clearButton.addEventListener('click', () => {
      window.location.hash = '#explore';
    });

    formGrid.append(
      searchInput,
      deptSelect,
      yearFromWrapper,
      yearToWrapper,
      highlightBox,
      imageBox,
      clearButton,
      searchButton
    );
    controls.append(controlTitle, formGrid);

    rootElement.innerHTML = '';
    rootElement.append(panel, controls);
  } catch (error) {
    rootElement.innerHTML = '';
    rootElement.append(createErrorState(error.message || 'Error de conexión con el museo', () => renderExplore(rootElement, _param, params)));
  }
}

export async function renderResults(rootElement, _param, params = {}) {
  const filters = getFiltersFromParams(params);
  rootElement.innerHTML = '';
  rootElement.append(createLoadingState('Cargando resultados...'));

  try {
    const searchParams = {
      q: filters.q.trim()
    };

    if (filters.department) searchParams.departmentId = filters.department;
    if (filters.highlightOnly) searchParams.isHighlight = true;
    if (filters.hasImagesOnly) searchParams.hasImages = true;
    if (filters.yearFrom || filters.yearTo) {
      searchParams.dateBegin = filters.yearFrom ? Number(filters.yearFrom) : YEAR_MIN;
      searchParams.dateEnd = filters.yearTo ? Number(filters.yearTo) : YEAR_MAX;
    }

    const searchData = await searchObjects(searchParams);
    const allIds = searchData.objectIDs || [];
    const totalResults = searchData.total || 0;
    const startIndex = (filters.page - 1) * PAGE_SIZE;
    const pageIds = allIds.slice(startIndex, startIndex + PAGE_SIZE);
    const artworks = await resolveArtworkIds(pageIds);

    const panel = createElement('section', 'panel results-panel');
    const header = createElement('div', 'results-header');
    const headerInfo = createElement('div', 'results-header-info');
    const title = createElement('h2', '', 'Resultados de búsqueda');
    const summary = createElement('p', 'results-subtitle', 'Navega entre las obras que coinciden con tus filtros.');
    headerInfo.append(title, summary);

    const headerActions = createElement('div', 'results-header-actions');
    const backButton = createElement('button', 'button secondary', 'Volver al explorador');
    backButton.type = 'button';
    backButton.addEventListener('click', () => {
      window.location.hash = '#explore';
    });
    headerActions.append(backButton);
    header.append(headerInfo, headerActions);
    panel.append(header);

    const stats = createElement('section', 'stats-grid results-stats');
    const aggregates = buildAggregates(artworks);
    stats.append(
      createMetric('Total de resultados', totalResults),
      createMetric('Departamento dominante', aggregates.dominantDepartment),
      createMetric('Siglo más frecuente', aggregates.dominantCentury),
      createMetric('Cultura dominante', aggregates.dominantCulture)
    );

    const gallery = createElement('section', 'grid results-gallery');
    if (!artworks.length) {
      gallery.append(createEmptyState('No se encontraron obras con los filtros aplicados. Intenta ampliar la búsqueda.'));
    } else {
      artworks.forEach((artwork) => {
        gallery.append(createArtworkCard(artwork, (id) => {
          window.location.hash = `#detail/${id}`;
        }));
      });
    }

    const pagination = createElement('div', 'pagination');
    const prevButton = createElement('button', 'button secondary', 'Anterior');
    prevButton.disabled = filters.page === 1;
    prevButton.addEventListener('click', () => {
      const nextFilters = { ...filters, page: Math.max(1, filters.page - 1) };
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.location.hash = buildHash(nextFilters, 'results');
    });

    const nextButton = createElement('button', 'button secondary', 'Siguiente');
    nextButton.disabled = filters.page >= Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
    nextButton.addEventListener('click', () => {
      const nextFilters = { ...filters, page: filters.page + 1 };
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.location.hash = buildHash(nextFilters, 'results');
    });

    pagination.append(prevButton, nextButton);

    rootElement.innerHTML = '';
    rootElement.append(panel, stats, gallery);
    pagination.classList.add('results-pagination');
    rootElement.append(pagination);
  } catch (error) {
    rootElement.innerHTML = '';
    rootElement.append(createErrorState(error.message || 'Error de conexión con el museo', () => renderResults(rootElement, _param, params)));
  }
}
