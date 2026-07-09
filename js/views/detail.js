import { getObjectById } from '../api.js';
import { createElement, createErrorState, createLoadingState, formatValue } from './components.js';

export async function renderDetail(rootElement, id) {
  rootElement.innerHTML = '';
  rootElement.append(createLoadingState('Cargando detalle...'));

  try {
    const artwork = await getObjectById(id);

    const panel = createElement('section', 'panel');
    const title = createElement('h2', '', formatValue(artwork.title, 'Sin título'));
    const artist = createElement('p', 'state-text', formatValue(artwork.artistDisplayName, 'Artista desconocido'));
    const meta = createElement('p', 'state-text', `${formatValue(artwork.objectDate, '—')} · ${formatValue(artwork.department, '—')}`);

    const layout = createElement('div', 'detail-layout');
    const media = createElement('div');
    const image = createElement('img', 'detail-image');
    image.src = artwork.primaryImage || artwork.primaryImageSmall || 'https://via.placeholder.com/640x480?text=Sin+imagen';
    image.alt = artwork.title || 'Obra';
    media.append(image);

    if (Array.isArray(artwork.additionalImages) \&\& artwork.additionalImages.length) {
      const smallImages = createElement('div', 'small-images');
      artwork.additionalImages.slice(0, 8).forEach((img) => {
        const thumb = createElement('img');
        thumb.src = img;
        thumb.alt = 'Detalle adicional';
        smallImages.append(thumb);
      });
      media.append(smallImages);
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

    const artistButton = createElement('button', 'button secondary', 'Ver más obras del artista');
    if (artwork.artistDisplayName) {
      artistButton.addEventListener('click', () => {
        window.location.hash = `#artist/${encodeURIComponent(artwork.artistDisplayName)}`;
      });
    } else {
      artistButton.disabled = true;
    }
    actions.append(artistButton);

    const rows = \[
      \['Artista', formatValue(artwork.artistDisplayName, 'Artista desconocido')],
      \['Fecha', formatValue(artwork.objectDate, '—')],
      \['Técnica', formatValue(artwork.medium, '—')],
      \['Dimensiones', formatValue(artwork.dimensions, '—')],
      \['Departamento', formatValue(artwork.department, '—')],
      \['Cultura', formatValue(artwork.culture, '—')],
      \['Periodo', formatValue(artwork.period, '—')],
      \['Clasificación', formatValue(artwork.classification, '—')],
      \['Adquisición', formatValue(artwork.creditLine, '—')],
      \['Dominio público', artwork.isPublicDomain ? 'Sí' : 'No']
    ];

    rows.forEach((\[label, value]) => {
      const row = createElement('div');
      row.append(createElement('strong', '', `${label}: `), createElement('span', '', value));
      info.append(row);
    });

    if (Array.isArray(artwork.tags) \&\& artwork.tags.length) {
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
      link.target = '\_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Ver en el museo';
      info.append(link);
    }

    layout.append(media, info);
    panel.append(title, artist, meta, actions, layout);
    rootElement.innerHTML = '';
    rootElement.append(panel);
  } catch (error) {
    rootElement.innerHTML = '';
    const message = error.message.includes('404') ? 'La obra solicitada no existe.' : error.message || 'No se pudo cargar el detalle';
    rootElement.append(createErrorState(message, () => renderDetail(rootElement, id)));
  }
}

