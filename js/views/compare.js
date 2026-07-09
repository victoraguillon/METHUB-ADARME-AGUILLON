import { fetchDepartments, getObjectById, resolveArtworkIds, searchObjects } from '../api.js';
import { createElement, createErrorState, createLoadingState, formatValue, showFullscreenImage } from './components.js';

function createResultCard(artwork, onSelect, selected, disabled) {
  const card = createElement('article', `result-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`);
  const title = createElement('strong', '', formatValue(artwork.title, 'Sin título'));
  const artist = createElement('p', 'card-meta', formatValue(artwork.artistDisplayName, 'Artista desconocido'));
  const info = createElement('p', 'result-meta', formatValue(artwork.objectDate, 'Fecha desconocida'));
  card.append(title, artist, info);
  if (!disabled) {
    card.addEventListener('click', () => onSelect(artwork));
  }
  return card;
}

function compareValues(a, b) {
  return a === b;
}

export async function renderCompare(rootElement, _param, params = {}) {
  rootElement.innerHTML = '';
  rootElement.append(createLoadingState('Preparando comparador...'));

  let active = true;
  const cancelPendingRequests = () => {
    active = false;
  };
  const handleHashChange = () => {
    if (!window.location.hash.startsWith('#compare')) {
      cancelPendingRequests();
    }
  };
  window.addEventListener('hashchange', handleHashChange);

  try {
    const panel = createElement('section', 'panel');
    const title = createElement('h2', '', 'Comparador interactivo');
    const intro = createElement('p', '', 'Elige dos obras desde departamentos distintos y observa sus diferencias de forma inmediata.');
    const actions = createElement('div', 'compare-actions');
    const clearButton = createElement('button', 'button secondary', 'Limpiar comparación');
    clearButton.type = 'button';
    clearButton.addEventListener('click', () => {
      if (state.abortControllerA) {
        state.abortControllerA.abort();
      }
      if (state.abortControllerB) {
        state.abortControllerB.abort();
      }
      state.a = null;
      state.b = null;
      state.resultsA = [];
      state.resultsB = [];
      state.loadingA = false;
      state.loadingB = false;
      state.errorA = '';
      state.errorB = '';
      state.queryA = '';
      state.queryB = '';
      state.departmentA = null;
      state.departmentB = null;
      state.activeRequestA += 1;
      state.activeRequestB += 1;
      state.abortControllerA = null;
      state.abortControllerB = null;
      render();
    });
    actions.append(clearButton);
    panel.append(title, intro, actions);

    const state = {
      a: null,
      b: null,
      departments: [],
      departmentA: null,
      departmentB: null,
      resultsA: [],
      resultsB: [],
      loadingA: false,
      loadingB: false,
      loadingDepartments: false,
      errorA: '',
      errorB: '',
      errorDepartments: '',
      queryA: '',
      queryB: '',
      activeRequestA: 0,
      activeRequestB: 0,
      abortControllerA: null,
      abortControllerB: null,
      abortControllerDepartments: null
    };

    const fetchDepartmentsList = async () => {
      state.loadingDepartments = true;
      state.errorDepartments = '';
      render();
      try {
        const data = await fetchDepartments();
        state.departments = data.departments || [];
      } catch (error) {
        if (error.name === 'AbortError' || !active) return;
        state.errorDepartments = error.message || 'No se pudieron cargar los departamentos';
      } finally {
        if (!active) return;
        state.loadingDepartments = false;
        render();
      }
    };

    const loadRandomArtwork = async (targetKey, departmentId = null) => {
      const loadingKey = targetKey === 'a' ? 'loadingA' : 'loadingB';
      const errorKey = targetKey === 'a' ? 'errorA' : 'errorB';
      const queryKey = targetKey === 'a' ? 'queryA' : 'queryB';
      const resultsKey = targetKey === 'a' ? 'resultsA' : 'resultsB';
      const requestKey = targetKey === 'a' ? 'activeRequestA' : 'activeRequestB';
      const controllerKey = targetKey === 'a' ? 'abortControllerA' : 'abortControllerB';
      const otherKey = targetKey === 'a' ? 'b' : 'a';

      if (state[controllerKey]) {
        state[controllerKey].abort();
      }
      const controller = new AbortController();
      state[controllerKey] = controller;
      state[requestKey] += 1;
      const requestId = state[requestKey];

      state[loadingKey] = true;
      state[errorKey] = '';
      render();

      try {
        const randomQueries = ['painting', 'sculpture', 'statue', 'portrait', 'vase', 'bronze'];
        const params = {
          q: randomQueries[Math.floor(Math.random() * randomQueries.length)],
          hasImages: true,
          size: 10,
        };
        if (departmentId) {
          params.departmentId = departmentId;
        }
        const data = await searchObjects(params, { signal: controller.signal });
        if (!active || controller.signal.aborted || requestId !== state[requestKey]) return;

        const ids = (data.objectIDs || []).filter((id) => id !== state[otherKey]?.objectID);
        if (!ids.length) {
          throw new Error('No se encontró una obra aleatoria disponible.');
        }

        const randomId = ids[Math.floor(Math.random() * ids.length)];
        const artwork = await getObjectById(randomId, { signal: controller.signal });
        if (!active || controller.signal.aborted || requestId !== state[requestKey]) return;

        if (targetKey === 'a') {
          state.a = artwork;
        } else {
          state.b = artwork;
        }
        state[queryKey] = artwork.title || '';
        state[resultsKey] = [];
      } catch (error) {
        if (error.name === 'AbortError' || !active) {
          return;
        }
        state[resultsKey] = [];
        state[errorKey] = error.message || 'No se pudo cargar una obra aleatoria';
      } finally {
        if (!active || controller.signal.aborted || requestId !== state[requestKey]) return;
        state[loadingKey] = false;
        render();
      }
    };

    const loadDepartmentArtworks = async (targetKey) => {
      const loadingKey = targetKey === 'a' ? 'loadingA' : 'loadingB';
      const errorKey = targetKey === 'a' ? 'errorA' : 'errorB';
      const resultsKey = targetKey === 'a' ? 'resultsA' : 'resultsB';
      const queryKey = targetKey === 'a' ? 'queryA' : 'queryB';
      const departmentKey = targetKey === 'a' ? 'departmentA' : 'departmentB';
      const requestKey = targetKey === 'a' ? 'activeRequestA' : 'activeRequestB';
      const controllerKey = targetKey === 'a' ? 'abortControllerA' : 'abortControllerB';

      if (!state[departmentKey]) {
        state[resultsKey] = [];
        render();
        return;
      }

      if (state[controllerKey]) {
        state[controllerKey].abort();
      }
      const controller = new AbortController();
      state[controllerKey] = controller;
      state[requestKey] += 1;
      const requestId = state[requestKey];

      state[loadingKey] = true;
      state[errorKey] = '';
      render();

      try {
        const term = state[queryKey]?.trim() || 'a';
        const data = await searchObjects({ q: term, departmentId: state[departmentKey], hasImages: true, size: 20 }, { signal: controller.signal });
        if (!active || controller.signal.aborted || requestId !== state[requestKey]) return;

        const ids = (data.objectIDs || []).slice(0, 15);
        const artworks = ids.length ? await resolveArtworkIds(ids) : [];
        if (!active || controller.signal.aborted || requestId !== state[requestKey]) return;

        state[resultsKey] = artworks;
      } catch (error) {
        if (error.name === 'AbortError' || !active) {
          return;
        }
        state[resultsKey] = [];
        state[errorKey] = error.message || 'No se pudo buscar obras en este departamento';
      } finally {
        if (!active || controller.signal.aborted || requestId !== state[requestKey]) return;
        state[loadingKey] = false;
        render();
      }
    };

    const render = () => {
      const compareGrid = createElement('section', 'compare-grid');

      const buildPanel = (targetKey) => {
        const panelKey = targetKey === 'a' ? 'A' : 'B';
        const card = createElement('article', 'card');
        const heading = createElement('h3', '', `Elige obra ${panelKey}`);
        const departmentKey = targetKey === 'a' ? 'departmentA' : 'departmentB';
        const queryKey = targetKey === 'a' ? 'queryA' : 'queryB';
        const loadingKey = targetKey === 'a' ? 'loadingA' : 'loadingB';
        const errorKey = targetKey === 'a' ? 'errorA' : 'errorB';
        const resultsKey = targetKey === 'a' ? 'resultsA' : 'resultsB';

        const departmentLabel = createElement('label', 'label', 'Departamento');
        departmentLabel.htmlFor = `dept-${panelKey}`;
        const departmentSelect = createElement('select', 'select');
        departmentSelect.id = `dept-${panelKey}`;
        departmentSelect.setAttribute('aria-label', 'Selecciona un departamento');
        const defaultOption = createElement('option', '', 'Selecciona un departamento');
        defaultOption.value = '';
        departmentSelect.append(defaultOption);
        state.departments.forEach((department) => {
          const option = createElement('option', '', department.displayName);
          option.value = department.departmentId;
          if (department.departmentId === state[departmentKey]) {
            option.selected = true;
          }
          departmentSelect.append(option);
        });
        departmentSelect.addEventListener('change', () => {
          state[departmentKey] = departmentSelect.value ? Number(departmentSelect.value) : null;
          state[resultsKey] = [];
          state[errorKey] = '';
          state[queryKey] = '';
          if (state[departmentKey]) {
            loadDepartmentArtworks(targetKey);
          } else {
            render();
          }
        });

        const inputLabel = createElement('label', 'label', 'Buscar obra');
        inputLabel.htmlFor = `search-${panelKey}`;
        const input = createElement('input', 'input');
        input.id = `search-${panelKey}`;
        input.placeholder = state[departmentKey]
          ? 'Busca por título o artista en el departamento'
          : 'Primero selecciona un departamento';
        input.value = state[queryKey];
        input.disabled = !state[departmentKey];

        const actionsRow = createElement('div', 'compare-actions');
        const searchButton = createElement('button', 'button secondary', 'Buscar obras');
        searchButton.type = 'button';
        searchButton.disabled = !state[departmentKey];
        searchButton.addEventListener('click', () => loadDepartmentArtworks(targetKey));
        const randomButton = createElement('button', 'button secondary', 'Obra aleatoria');
        randomButton.type = 'button';
        randomButton.disabled = !state[departmentKey];
        randomButton.addEventListener('click', () => loadRandomArtwork(targetKey, state[departmentKey]));
        actionsRow.append(searchButton, randomButton);

        const resultsContainer = createElement('div', 'artwork-grid');
        const selectionPreview = createElement('div');
        const selectedArtwork = targetKey === 'a' ? state.a : state.b;
        if (selectedArtwork) {
          const selectedBox = createElement('div', 'selected-preview');
          selectedBox.append(createElement('strong', '', 'Seleccionada: '));
          selectedBox.append(createElement('span', '', formatValue(selectedArtwork.title, 'Sin título')));
          selectionPreview.append(selectedBox);
        }

        let debounceTimer;
        const controllerKey = targetKey === 'a' ? 'abortControllerA' : 'abortControllerB';
        const requestKey = targetKey === 'a' ? 'activeRequestA' : 'activeRequestB';
        input.addEventListener('input', () => {
          const term = input.value.trim();
          state[queryKey] = input.value;
          clearTimeout(debounceTimer);
          debounceTimer = window.setTimeout(async () => {
            if (!active) return;

            if (!term) {
              state[resultsKey] = [];
              state[errorKey] = '';
              render();
              return;
            }

            if (state[controllerKey]) {
              state[controllerKey].abort();
            }
            const controller = new AbortController();
            state[controllerKey] = controller;
            state[requestKey] += 1;
            const requestId = state[requestKey];

            state[loadingKey] = true;
            state[errorKey] = '';
            render();

            try {
              const params = {
                q: term,
                hasImages: true,
                size: 20,
              };
              if (state[departmentKey]) {
                params.departmentId = state[departmentKey];
              }
              const data = await searchObjects(params, { signal: controller.signal });
              if (!active || controller.signal.aborted || requestId !== state[requestKey]) return;

              const ids = data.objectIDs || [];
              const resolved = await Promise.allSettled(ids.slice(0, 15).map((id) => getObjectById(id, { signal: controller.signal })));
              if (!active || controller.signal.aborted || requestId !== state[requestKey]) return;

              const artworks = resolved.filter((item) => item.status === 'fulfilled').map((item) => item.value).filter(Boolean);
              state[resultsKey] = artworks;
            } catch (error) {
              if (error.name === 'AbortError' || !active) {
                return;
              }
              state[resultsKey] = [];
              state[errorKey] = error.message || 'No se pudo buscar';
            } finally {
              if (!active || controller.signal.aborted || requestId !== state[requestKey]) return;
              state[loadingKey] = false;
              render();
            }
          }, 400);
        });

        const selectArtwork = (artwork) => {
          const otherKey = targetKey === 'a' ? 'b' : 'a';
          if (state[otherKey]?.objectID === artwork.objectID) {
            state[errorKey] = 'Ya está seleccionada en el otro panel';
            render();
            return;
          }

          if (targetKey === 'a') {
            state.a = artwork;
          } else {
            state.b = artwork;
          }

          if (state.a && state.b) {
            window.location.hash = `#compare?a=${state.a.objectID}&b=${state.b.objectID}`;
            return;
          }
          render();
        };

        if (state.loadingDepartments) {
          resultsContainer.append(createElement('p', 'state-text', 'Cargando departamentos...'));
        } else if (state.errorDepartments) {
          resultsContainer.append(createElement('p', 'state-text', state.errorDepartments));
        } else if (!state[departmentKey]) {
          resultsContainer.append(createElement('p', 'state-text', 'Selecciona un departamento para ver las obras disponibles.'));
        } else if (state[loadingKey]) {
          resultsContainer.append(createElement('p', 'state-text', 'Buscando obras...'));
        } else if (state[errorKey]) {
          resultsContainer.append(createElement('p', 'state-text', state[errorKey]));
        } else if (!state[resultsKey].length) {
          resultsContainer.append(createElement('p', 'state-text', 'No se encontraron obras. Ajusta la búsqueda o prueba otro departamento.'));
        } else {
          state[resultsKey].forEach((artwork) => {
            const otherKey = targetKey === 'a' ? 'b' : 'a';
            const disabled = Boolean(state[otherKey]?.objectID === artwork.objectID);
            resultsContainer.append(createResultCard(artwork, selectArtwork, selectedArtwork?.objectID === artwork.objectID, disabled));
          });
        }

        const helperText = createElement('p', 'helper-text', state[departmentKey]
          ? 'Puedes buscar en este departamento o elegir una obra disponible.'
          : 'Selecciona un departamento para acceder a las obras de ese sector.');

        card.append(heading, departmentLabel, departmentSelect, helperText, inputLabel, input, actionsRow, selectionPreview, resultsContainer);
        return card;
      };

      const buildComparisonView = () => {
        const compareView = createElement('section', 'compare-result');
        const summaryRow = createElement('div', 'comparison-summary');

        const buildSideCard = (artwork, label) => {
          const sideCard = createElement('article', 'comparison-card');
          sideCard.append(createElement('h3', '', label));
          const image = createElement('img', 'result-image');
          image.src = artwork.primaryImageSmall || artwork.primaryImage || '';
          image.alt = artwork.title || 'Obra';
          sideCard.append(image);
          sideCard.append(createElement('h4', '', formatValue(artwork.title, 'Sin título')));
          sideCard.append(createElement('p', 'card-meta', formatValue(artwork.artistDisplayName, 'Artista desconocido')));
          image.style.cursor = 'pointer';
          image.addEventListener('click', () => {
            showFullscreenImage(image.src, image.alt);
          });
          const infoList = createElement('div', 'result-details');
          infoList.append(createElement('p', '', `Año: ${formatValue(artwork.objectDate, '—')}`));
          infoList.append(createElement('p', '', `Departamento: ${formatValue(artwork.department, '—')}`));
          infoList.append(createElement('p', '', `Técnica: ${formatValue(artwork.medium, '—')}`));
          infoList.append(createElement('p', '', `Cultura: ${formatValue(artwork.culture, '—')}`));
          sideCard.append(infoList);
          return sideCard;
        };

        summaryRow.append(buildSideCard(state.a, 'Obra A'), buildSideCard(state.b, 'Obra B'));
        compareView.append(summaryRow);

        const tableCard = createElement('section', 'table-card');
        const table = createElement('table', 'data-table');
        const tbody = createElement('tbody');
        const rows = [
          ['Artista', formatValue(state.a.artistDisplayName, 'Artista desconocido'), formatValue(state.b.artistDisplayName, 'Artista desconocido')],
          ['Año', formatValue(state.a.objectDate, '—'), formatValue(state.b.objectDate, '—')],
          ['Departamento', formatValue(state.a.department, '—'), formatValue(state.b.department, '—')],
          ['Técnica', formatValue(state.a.medium, '—'), formatValue(state.b.medium, '—')],
          ['Clasificación', formatValue(state.a.classification, '—'), formatValue(state.b.classification, '—')],
          ['Cultura', formatValue(state.a.culture, '—'), formatValue(state.b.culture, '—')],
          ['Destacada', state.a.isHighlight ? 'Sí' : 'No', state.b.isHighlight ? 'Sí' : 'No'],
          ['Dominio público', state.a.isPublicDomain ? 'Sí' : 'No', state.b.isPublicDomain ? 'Sí' : 'No']
        ];
        rows.forEach(([label, leftValue, rightValue]) => {
          const tr = createElement('tr');
          if (!compareValues(leftValue, rightValue)) {
            tr.className = 'highlight';
          }
          tr.append(createElement('td', '', label), createElement('td', '', leftValue), createElement('td', '', rightValue));
          tbody.append(tr);
        });
        table.append(tbody);
        tableCard.append(table);

        const actions = createElement('div', 'compare-actions');
        const backButton = createElement('button', 'button secondary', 'Volver al comparador');
        backButton.type = 'button';
        backButton.addEventListener('click', () => {
          window.location.hash = '#compare';
        });
        actions.append(backButton);

        compareView.append(tableCard, actions);
        return compareView;
      };

      const isCompareMode = Boolean(params.a && params.b);

      if (isCompareMode && state.a && state.b) {
        const comparisonView = buildComparisonView();
        rootElement.innerHTML = '';
        rootElement.append(panel, comparisonView);
        return;
      }

      compareGrid.append(buildPanel('a'), buildPanel('b'));
      rootElement.innerHTML = '';
      rootElement.append(panel, compareGrid);
    };

    await fetchDepartmentsList();

    const selectedAId = params.a || params.preselectA;
    const selectedBId = params.b;
    if (selectedAId || selectedBId) {
      try {
        const requests = [];
        if (selectedAId) requests.push(getObjectById(selectedAId, { signal: state.abortControllerA?.signal }));
        if (selectedBId) requests.push(getObjectById(selectedBId, { signal: state.abortControllerB?.signal }));
        const results = await Promise.all(requests);
        if (!active) return;
        if (selectedAId) state.a = results.shift();
        if (selectedBId) state.b = results.shift();
      } catch (error) {
        if (error.name === 'AbortError' || !active) {
          return;
        }
        state.errorA = error.message || 'No se pudo cargar la comparación';
      }
    }

    render();
  } catch (error) {
    if (error.name === 'AbortError' || !active) {
      return;
    }
    rootElement.innerHTML = '';
    rootElement.append(createErrorState(error.message || 'No se pudo cargar el comparador', () => renderCompare(rootElement, _param, params)));
  } finally {
    window.removeEventListener('hashchange', handleHashChange);
  }
}