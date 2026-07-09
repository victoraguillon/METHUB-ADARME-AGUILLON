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
  img.src = imgUrl;
  img.alt = artwork.title;
  img.onload = () => img.classList.add('loaded');
  img.onerror = () => {
    img.src = 'https://via.placeholder.com/280x280?text=Sin+Imagen';
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

export function formatValue(val, fallback) {
  return val ? val : fallback;
}

