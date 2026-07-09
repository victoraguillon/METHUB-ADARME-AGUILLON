import { fetchDepartments, searchObjects, resolveArtworkIds } from '../api.js';
import { createElement, createErrorState, createLoadingState } from './components.js';

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function getDepartmentPreviewArtworkId(departmentId) {
  const searchData = await searchObjects({ q: 'a', departmentId, hasImages: true, isPublicDomain: true });
  const ids = searchData.objectIDs || [];
  return ids.length ? ids[0] : null;
}

export async function renderDepartments(rootElement) {
  rootElement.innerHTML = '';
  rootElement.append(createLoadingState('Cargando departamentos...'));

  try {
    const data = await fetchDepartments();
    const departments = data.departments || [];

    const previewIds = await Promise.all(
      departments.map(async (department) => {
        try {
          return await getDepartmentPreviewArtworkId(department.departmentId);
        } catch {
          return null;
        }
      })
    );

    const previewArtworks = await resolveArtworkIds(previewIds.filter(Boolean));
    const artworkById = new Map(previewArtworks.map((art) => [art.objectID, art]));

    const panel = createElement('section', 'panel');
    const title = createElement('h2', '', 'Departamentos curatoriales');
    const intro = createElement('p', '', 'Explora las áreas de la colección del museo con una vista más atractiva. Cada departamento muestra una obra representativa de su colección.');
    panel.append(title, intro);

    const grid = createElement('section', 'department-grid');
    departments.forEach((department, index) => {
      const previewId = previewIds[index];
      const artwork = artworkById.get(previewId);

      const card = createElement('article', 'department-card');
      const imageWrapper = createElement('div', 'department-card-image-wrapper');
      const image = createElement('img', 'department-card-image');
      image.alt = artwork?.title || department.displayName || 'Departamento';
      image.src = artwork?.primaryImageSmall || artwork?.primaryImage || 'https://images.unsplash.com/photo-1504198266281-165ae646b3f5?auto=format&fit=crop&w=800&q=60';
      imageWrapper.append(image);

      const content = createElement('div', 'department-card-content');
      const name = createElement('h3', 'department-card-title', department.displayName || 'Departamento');
      const id = createElement('p', 'department-card-meta', `Área curatorial · ${department.departmentId || '—'}`);
      const badge = createElement('span', 'department-card-badge', 'Explorar departamento');
      content.append(name, id, badge);

      card.append(imageWrapper, content);
      card.addEventListener('click', () => {
        window.location.hash = `#explore?department=${department.departmentId}`;
      });
      grid.append(card);
    });

    rootElement.innerHTML = '';
    rootElement.append(panel, grid);
  } catch (error) {
    rootElement.innerHTML = '';
    rootElement.append(createErrorState(error.message || 'No se pudieron cargar los departamentos', () => renderDepartments(rootElement)));
  }
}

