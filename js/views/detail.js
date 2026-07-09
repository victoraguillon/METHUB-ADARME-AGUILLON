import { getObjectById } from '../api.js';
import { createElement, createErrorState, createLoadingState, formatValue, showFullscreenImage } from './components.js';

export async function renderDetail(rootElement, id) {
  rootElement.innerHTML = '';
  rootElement.append(createLoadingState('Cargando detalle...'));

  try {
    const artwork = await getObjectById(id);

    const panel = createElement('section', 'panel');
    const title = createElement('h2', '', formatValue(artwork.title, 'Sin título'));
    const artistLink = createElement('a', 'artist-link', formatValue(artwork.artistDisplayName, 'Artista desconocido'));
    artistLink.href = artwork.artistDisplayName ? `#artist/${encodeURIComponent(artwork.artistDisplayName)}` : '#';
    artistLink.addEventListener('click', (event) => {
      if (!artwork.artistDisplayName) event.preventDefault();
    });
    const artistBio = artwork.artistDisplayBio ? createElement('p', 'state-text', artwork.artistDisplayBio) : null;
    const meta = createElement('p', 'state-text', `${formatValue(artwork.objectDate, '—')} · ${formatValue(artwork.department, '—')}`);

    const layout = createElement('div', 'detail-layout');
    const media = createElement('div', 'detail-media');
    const mainImageWrapper = createElement('div', 'detail-image-wrapper');
    const mainImage = createElement('img', 'detail-image');
    const initialImage = artwork.primaryImage || artwork.primaryImageSmall || 'https://via.placeholder.com/640x480?text=Sin+imagen';
    mainImage.src = initialImage;
    mainImage.alt = artwork.title || 'Obra';
    mainImage.loading = 'lazy';
    mainImage.style.cursor = 'pointer';
    mainImage.addEventListener('click', () => {
      showFullscreenImage(mainImage.src, mainImage.alt);
    });
    mainImageWrapper.append(mainImage);
    media.append(mainImageWrapper);

    if (Array.isArray(artwork.additionalImages) && artwork.additionalImages.length) {
      const thumbnails = createElement('div', 'thumbnail-list');
      const images = [initialImage, ...artwork.additionalImages.slice(0, 8)];
      images.forEach((imgSrc, index) => {
        const thumb = createElement('img', 'thumbnail-item');
        thumb.src = imgSrc;
        thumb.alt = `Vista ${index + 1}`;
        thumb.loading = 'lazy';
        thumb.addEventListener('click', () => {
          mainImage.src = imgSrc;
        });
        thumbnails.append(thumb);
      });
      media.append(thumbnails);
    }

    const info = createElement('div', 'list-stack');
    const actions = createElement('div', 'status-row');
    const back = createElement('button', 'button secondary', '← Volver');
    back.addEventListener('click', () => window.history.back());
    const compare = createElement('button', 'button', 'Comparar');
    compare.addEventListener('click', () => {
      window.location.hash = `#compare?preselectA=${artwork.objectID}`;
    });
    actions.append(back, compare);

    const relatedButton = createElement('button', 'button secondary', 'Obras relacionadas');
    const artistButton = createElement('button', 'button', 'Obras del artista');
    if (artwork.artistDisplayName) {
      relatedButton.addEventListener('click', () => {
        const query = new URLSearchParams({
          related: 'true',
          objectId: artwork.objectID,
          departmentId: String(artwork.departmentId || ''),
        });
        window.location.hash = `#artist/${encodeURIComponent(artwork.artistDisplayName)}?${query.toString()}`;
      });
      artistButton.addEventListener('click', () => {
        window.location.hash = `#artist/${encodeURIComponent(artwork.artistDisplayName)}`;
      });
    } else {
      relatedButton.disabled = true;
      artistButton.disabled = true;
    }
    actions.append(relatedButton, artistButton);

    const rows = [
      ['Artista', formatValue(artwork.artistDisplayName, 'Artista desconocido')],
      ['Fecha', formatValue(artwork.objectDate, '—')],
      ['Técnica', formatValue(artwork.medium, '—')],
      ['Dimensiones', formatValue(artwork.dimensions, '—')],
      ['Departamento', formatValue(artwork.department, '—')],
      ['Cultura', formatValue(artwork.culture, '—')],
      ['Periodo', formatValue(artwork.period, '—')],
      ['Clasificación', formatValue(artwork.classification, '—')],
      ['Adquisición', formatValue(artwork.creditLine, '—')],
      ['Dominio público', artwork.isPublicDomain ? 'Sí' : 'No']
    ];

    rows.forEach(([label, value]) => {
      const row = createElement('div');
      row.append(createElement('strong', '', `${label}: `), createElement('span', '', value));
      info.append(row);
    });

    if (Array.isArray(artwork.tags) && artwork.tags.length) {
      const tagWrap = createElement('div');
      tagWrap.append(createElement('strong', '', 'Tags: '));
      const tagList = createElement('div', 'tag-list');
      artwork.tags.slice(0, 12).forEach((tag) => {
        tagList.append(createElement('span', '', tag.term || 'Etiqueta'));
      });
      tagWrap.append(tagList);
      info.append(tagWrap);
    }

    if (artwork.objectURL) {
      const link = createElement('a');
      link.href = artwork.objectURL;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Ver en el museo';
      info.append(link);
    }

    layout.append(media, info);
    if (artistBio) {
      panel.append(title, artistLink, artistBio, meta, actions, layout);
    } else {
      panel.append(title, artistLink, meta, actions, layout);
    }
    rootElement.innerHTML = '';
    rootElement.append(panel);
  } catch (error) {
    rootElement.innerHTML = '';
    const message = error.message.includes('404') ? 'La obra solicitada no existe.' : error.message || 'No se pudo cargar el detalle';
    rootElement.append(createErrorState(message, () => renderDetail(rootElement, id)));
  }
}