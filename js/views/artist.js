import { getObjectById, resolveArtworkIds, searchObjects } from '../api.js';
import { createArtworkCard, createElement, createEmptyState, createErrorState, createLoadingState } from './components.js';

const PAGE_SIZE = 12;

export async function renderArtist(rootElement, name, params = {}) {
  const artistName = decodeURIComponent(name || '');
  const showRelated = params.related === 'true';
  rootElement.innerHTML = '';
  rootElement.append(createLoadingState(showRelated ? 'Buscando obras relacionadas...' : 'Buscando obras del artista...'));

  try {
    const currentPage = Number(params.page || 1) || 1;
    const offset = (currentPage - 1) * PAGE_SIZE;
    let displayArtworks = [];
    let totalCount = 0;
    let summaryText = '';

    if (showRelated) {
      const referenceId = params.objectId;
      const departmentId = params.departmentId ? Number(params.departmentId) : undefined;
      const referenceArtwork = referenceId ? await getObjectById(referenceId) : null;
      const searchParams = { hasImages: true, size: 100 };

      if (departmentId) {
        searchParams.departmentId = departmentId;
      } else if (referenceArtwork?.department) {
        searchParams.q = referenceArtwork.department;
      } else {
        searchParams.q = artistName;
      }

      const relatedSearch = await searchObjects(searchParams);
      const relatedIds = (relatedSearch.objectIDs || []).filter((id) => String(id) !== String(referenceId));
      const relatedArtworks = await resolveArtworkIds(relatedIds.slice(0, 100));
      displayArtworks = relatedArtworks.slice(offset, offset + PAGE_SIZE);
      totalCount = relatedArtworks.length;
      summaryText = referenceArtwork
        ? `Obras parecidas por departamento: ${referenceArtwork.department || 'Desconocido'}`
        : 'Obras relacionadas con criterios similares';
    } else {
      const searchData = await searchObjects({ q: artistName, artistOrCulture: true, hasImages: true, size: 100 });
      const ids = searchData.objectIDs || [];
      const artworks = await resolveArtworkIds(ids.slice(0, 100));
      const normalizedArtist = artistName.trim().toLowerCase();
      const exactArtistWorks = artworks.filter((art) => String(art.artistDisplayName || '').trim().toLowerCase() === normalizedArtist);
      totalCount = exactArtistWorks.length;
      displayArtworks = exactArtistWorks.slice(offset, offset + PAGE_SIZE);
      summaryText = `Obras del artista ${artistName}`;
    }

    const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const panel = createElement('section', 'panel');
    const title = createElement('h2', '', showRelated ? 'Obras relacionadas' : `Obras del artista ${artistName}`);
    const count = createElement('p', 'state-text', `${displayArtworks.length} de ${totalCount} obras encontradas`);
    const summary = createElement('p', 'state-text', summaryText);
    panel.append(title, count, summary);

    const gallery = createElement('section', 'grid');
    if (!displayArtworks.length) {
      gallery.append(createEmptyState(showRelated ? 'No se encontraron obras relacionadas para este artista.' : 'No se encontraron obras para este artista.'));
    } else {
      displayArtworks.forEach((artwork) => {
        gallery.append(createArtworkCard(artwork, (id) => {
          window.location.hash = `#detail/${id}`;
        }));
      });
    }

    const pagination = createElement('div', 'pagination');
    const prevButton = createElement('button', 'button secondary', 'Anterior');
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
      const query = new URLSearchParams();
      if (showRelated) query.set('related', 'true');
      query.set('page', String(Math.max(1, currentPage - 1)));
      window.location.hash = `#artist/${encodeURIComponent(artistName)}?${query.toString()}`;
    });
    const pageLabel = createElement('span', '', `Página ${currentPage} de ${pageCount}`);
    const nextButton = createElement('button', 'button secondary', 'Siguiente');
    nextButton.disabled = currentPage >= pageCount;
    nextButton.addEventListener('click', () => {
      const query = new URLSearchParams();
      if (showRelated) query.set('related', 'true');
      query.set('page', String(Math.min(pageCount, currentPage + 1)));
      window.location.hash = `#artist/${encodeURIComponent(artistName)}?${query.toString()}`;
    });
    pagination.append(prevButton, pageLabel, nextButton);

    rootElement.innerHTML = '';
    rootElement.append(panel, gallery, pagination);
  } catch (error) {
    rootElement.innerHTML = '';
    rootElement.append(createErrorState(error.message || 'No se pudieron cargar las obras del artista', () => renderArtist(rootElement, name, params)));
  }
}