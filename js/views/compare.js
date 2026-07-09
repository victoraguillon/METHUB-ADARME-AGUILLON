import { getObjectById, searchObjects } from '../api.js';
import { createElement, createErrorState, createLoadingState, formatValue } from './components.js';

function createResultCard(artwork, onSelect, selected, disabled) {
  const card = createElement('article', `result-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`);
  const title = createElement('strong', '', formatValue(artwork.title, 'Sin título'));
  const artist = createElement('p', 'card-meta', formatValue(artwork.artistDisplayName, 'Artista desconocido'));
  card.append(title, artist);
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
    const intro = createElement('p', '', 'Elige dos obras y observa sus diferencias de forma inmediata.');
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
      resultsA: [],
      resultsB: [],
      loadingA: false,
      loadingB: false,
      errorA: '',
      errorB: '',
      queryA: '',
      queryB: '',
      activeRequestA: 0,
      activeRequestB: 0,
      abortControllerA: null,
      abortControllerB: null
    };

    const loadRandomArtwork = async (targetKey) => {
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
        const data = await searchObjects({ q: randomQueries[Math.floor(Math.random() * randomQueries.length)], hasImages: true, size: 5 }, { signal: controller.signal });
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

    const render = () => {
      const compareGrid = createElement('section', 'compare-grid');

      const buildPanel = (targetKey) => {
        const card = createElement('article', 'card');
        const heading = createElement('h3', '', targetKey === 'a' ? 'Obra A' : 'Obra B');
        const input = createElement('input', 'input');
        input.placeholder = 'Busca una obra por título o artista';
        input.value = targetKey === 'a' ? state.queryA : state.queryB;
        const actionsRow = createElement('div', 'compare-actions');
        const randomButton = createElement('button', 'button secondary', 'Obra aleatoria');
        randomButton.type = 'button';
        randomButton.addEventListener('click', () => loadRandomArtwork(targetKey));
        actionsRow.append(randomButton);
        const resultsContainer = createElement('div', 'list-stack');
        const selectionPreview = createElement('div');
        const selectedArtwork = targetKey === 'a' ? state.a : state.b;
        if (selectedArtwork) {
          selectionPreview.append(createElement('strong', '', 'Seleccionada: '), createElement('span', '', formatValue(selectedArtwork.title, 'Sin título')));
        }

        let debounceTimer;
        input.addEventListener('input', () => {
          const queryKey = targetKey === 'a' ? 'queryA' : 'queryB';
          const loadingKey = targetKey === 'a' ? 'loadingA' : 'loadingB';
          const errorKey = targetKey === 'a' ? 'errorA' : 'errorB';
          const resultsKey = targetKey === 'a' ? 'resultsA' : 'resultsB';
          const requestKey = targetKey === 'a' ? 'activeRequestA' : 'activeRequestB';
          const controllerKey = targetKey === 'a' ? 'abortControllerA' : 'abortControllerB';

          state[queryKey] = input.value;
          clearTimeout(debounceTimer);
          debounceTimer = window.setTimeout(async () => {
            if (!active) return;

            const term = input.value.trim();
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
              const data = await searchObjects({ q: term, hasImages: true, size: 5 }, { signal: controller.signal });
              if (!active || controller.signal.aborted || requestId !== state[requestKey]) return;

              const ids = data.objectIDs || [];
              const resolved = await Promise.allSettled(ids.map((id) => getObjectById(id, { signal: controller.signal })));
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
            const errorKey = targetKey === 'a' ? 'errorA' : 'errorB';
            state[errorKey] = 'Ya está seleccionada en el otro panel';
            render();
            return;
          }

          if (targetKey === 'a') {
            state.a = artwork;
          } else {
            state.b = artwork;
          }
          render();
        };

        const loadingKey = targetKey === 'a' ? 'loadingA' : 'loadingB';
        const errorKey = targetKey === 'a' ? 'errorA' : 'errorB';
        const resultsKey = targetKey === 'a' ? 'resultsA' : 'resultsB';

        if (state[loadingKey]) {
          resultsContainer.append(createElement('p', 'state-text', 'Buscando...'));
        } else if (state[errorKey]) {
          resultsContainer.append(createElement('p', 'state-text', state[errorKey]));
        } else {
          state[resultsKey].forEach((artwork) => {
            const otherKey = targetKey === 'a' ? 'b' : 'a';
            const disabled = Boolean(state[otherKey]?.objectID === artwork.objectID);
            resultsContainer.append(createResultCard(artwork, selectArtwork, selectedArtwork?.objectID === artwork.objectID, disabled));
          });
        }

        card.append(heading, input, actionsRow, selectionPreview, resultsContainer);
        return card;
      };

      compareGrid.append(buildPanel('a'), buildPanel('b'));

      if (state.a && state.b) {
        const tableCard = createElement('section', 'table-card');
        const table = createElement('table');
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
        compareGrid.append(tableCard);
      }

      rootElement.innerHTML = '';
      rootElement.append(panel, compareGrid);
    };

    if (params.preselectA) {
      try {
        const preselected = await getObjectById(params.preselectA, { signal: state.abortControllerA?.signal });
        if (!active) return;
        state.a = preselected;
      } catch (error) {
        if (error.name === 'AbortError' || !active) {
          return;
        }
        state.errorA = error.message || 'No se pudo cargar la obra preseleccionada';
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

