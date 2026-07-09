import { fetchDepartments } from '../api.js';
import { createElement, createErrorState, createLoadingState } from './components.js';

const departmentDescriptions = {
  1: 'Artes Decorativas Americanas reúne mobiliario, cerámica y textiles de los Estados Unidos desde el período colonial hasta el siglo XX.',
  3: 'Arte del Cercano Oriente antiguo con piezas de Mesopotamia, Persia y regiones vecinas.',
  4: 'Armas y Armaduras concentra objetos marciales, cascos y blindajes de distintas épocas y culturas.',
  5: 'Artes de África, Oceanía y las Américas presenta esculturas, textiles y objetos rituales de culturas no europeas.',
  6: 'Arte Asiático muestra pintura, escultura y objetos de China, Japón, India y otros países del continente.',
  7: 'The Cloisters exhibe arte medieval europeo y objetos religiosos en un ambiente inspirado en los claustros antiguos.',
  8: 'The Costume Institute explora la historia de la moda con vestidos, textiles y vestuario emblemático.',
  9: 'Dibujos y Grabados ofrece piezas en papel como bocetos, estampas y obras de artistas de distintas épocas.',
  10: 'Arte Egipcio reúne esculturas, sarcófagos y artefactos de la civilización del antiguo Egipto.',
  11: 'Pintura Europea alberga obras maestras del Renacimiento, Barroco y siglo XIX.',
  12: 'Escultura y Artes Decorativas Europeas incluye objetos tallados, muebles y cerámica de tradición occidental.',
  13: 'Arte Griego y Romano presenta esculturas, cerámica y antigüedades clásicas del Mediterráneo antiguo.',
  14: 'Arte Islámico cubre cerámica, textiles y manuscritos de la vasta tradición del mundo islámico.',
  15: 'La Colección Robert Lehman es una selección privada de pintura, dibujo y artes decorativas donada al museo.',
  16: 'Las Bibliotecas contienen libros, manuscritos y materiales impresos de gran valor histórico y artístico.',
  17: 'Arte Medieval ofrece objetos, reliquias y arte religioso de la Edad Media europea.',
  18: 'Arte Moderno y Contemporáneo muestra pintura, escultura y diseño desde el siglo XX hasta hoy.',
  19: 'Instrumentos Musicales reúne instrumentos históricos usados en conciertos y ceremonias musicales.',
  20: 'The Met Breuer presenta arte moderno y contemporáneo en un espacio de exhibición dedicado.',
};

export async function renderDepartments(rootElement) {
  rootElement.innerHTML = '';
  rootElement.append(createLoadingState('Cargando departamentos...'));

  try {
    const data = await fetchDepartments();
    const departments = data.departments || [];

    const panel = createElement('section', 'panel');
    const title = createElement('h2', '', 'Departamentos curatoriales');
    const intro = createElement('p', '', 'Explora las áreas de la colección del museo con una vista más atractiva. Cada departamento muestra una obra representativa de su colección.');
    panel.append(title, intro);

    const grid = createElement('section', 'department-grid');
    departments.forEach((department) => {
      const card = createElement('article', 'department-card');
      const content = createElement('div', 'department-card-content');
      const name = createElement('h3', 'department-card-title', department.displayName || 'Departamento');
      const id = createElement('p', 'department-card-meta', `Área curatorial · ${department.departmentId || '—'}`);
      const description = createElement('p', 'department-card-description', departmentDescriptions[department.departmentId] || 'Este departamento agrupa piezas representativas de su colección.');
      const badge = createElement('span', 'department-card-badge', 'Explorar departamento');
      content.append(name, id, description, badge);

      card.append(content);
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