import { resolveArtworkIds, searchObjects } from '../api.js';
import { createArtworkCard, createElement, createEmptyState, createErrorState, createLoadingState } from './components.js';

const PAGE\_SIZE = 12;

export async function renderArtist(rootElement, name) {
  const artistName = decodeURIComponent(name || '');
  rootElement.innerHTML = '';
  rootElement.append(createLoadingState('Buscando obras del artista...'));

  try {
    const searchData = await searchObjects({ q: artistName, artistOrCulture: true, hasImages: true, size: 100 });
    const ids = searchData.objectIDs || \[];
    const artworks = await resolveArtworkIds(ids.slice(0, PAGE\_SIZE));

    const panel = createElement('section', 'panel');
    const title = createElement('h2', '', `Obras de ${artistName || 'el artista'}`);
    const count = createElement('p', 'state-text', `${ids.length} obras asociadas encontradas`);
    panel.append(title, count);

    const gallery = createElement('section', 'grid');
    if (!artworks.length) {
      gallery.append(createEmptyState('No se encontraron obras asociadas a este artista.'));
    } else {
      artworks.forEach((artwork) => {
        gallery.append(createArtworkCard(artwork, (id) => {
          window.location.hash = `#detail/${id}`;
        }));
      });
    }

    rootElement.innerHTML = '';
    rootElement.append(panel, gallery);
  } catch (error) {
    rootElement.innerHTML = '';
    rootElement.append(createErrorState(error.message || 'No se pudieron cargar las obras del artista', () => renderArtist(rootElement, name)));
  }
}

