export function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

export function createArtworkCard(artwork, onClick) {
  const card = createElement('div', 'card');
  const imgUrl = artwork.primaryImageSmall || artwork.primaryImage;
  
  const img = createElement('img', 'card-image');
  const placeholder = 'https://via.placeholder.com/280x280?text=Sin+Imagen';
  img.src = imgUrl || placeholder;
  img.alt = artwork.title || 'Sin título';
  img.loading = 'lazy';
  img.onload = () => img.classList.add('loaded');
  img.onerror = () => {
    if (img.src !== placeholder) {
      img.src = placeholder;
    }
  };
  
  card.append(img);
  card.append(createElement('div', 'card-title', artwork.title || 'Sin título'));
  card.append(createElement('div', 'card-meta', `${artwork.artistDisplayName || 'Autor desconocido'} (${artwork.objectDate || 'Fecha desconocida'})`));
  
  card.addEventListener('click', () => onClick(artwork.objectID));
  return card;
}

export function createLoadingState(text) {
  return createElement('div', 'state-box', text);
}

export function createEmptyState(text) {
  return createElement('div', 'state-box', text);
}

export function createErrorState(text, retry) {
  const div = createElement('div', 'state-box');
  div.append(createElement('p', '', text));
  const btn = createElement('button', 'button', 'Reintentar');
  btn.onclick = retry;
  div.append(btn);
  return div;
}

export function showFullscreenImage(src, alt = 'Imagen') {
  const overlay = createElement('div', 'image-fullscreen-overlay');
  const image = createElement('img', 'fullscreen-image');
  image.src = src;
  image.alt = alt;
  overlay.append(image);
  overlay.addEventListener('click', () => overlay.remove());
  document.body.append(overlay);
}

export function formatValue(val, fallback) {
  return val ? val : fallback;
}