# 🎨 MetHub: Explorador de la colección del Met

**Aplicación web estática** creada con HTML, CSS y JavaScript para navegar, buscar y comparar obras de la colección abierta del Metropolitan Museum of Art.

---

## 🚀 Descripción
- Navega por la colección del museo usando una interfaz ligera en el navegador.
- Explora departamentos curatoriales con obras representativas.
- Busca obras por texto, departamento, siglo y otros filtros.
- Abre detalles enriquecidos de cada obra.
- Compara dos obras lado a lado con datos y visualizaciones.

---

## 🧭 Funcionamiento principal
- `index.html` es la base del sitio y carga la aplicación en el contenedor `#app`.
- `js/app.js` inicia el enrutador y define el punto de arranque.
- `js/router.js` transforma el hash de la URL en rutas y parámetros, y muestra la vista correspondiente.
- `js/api.js` centraliza las llamadas al servicio público del Met Museum y gestiona tiempo de espera, reintentos y resoluciones de datos.
- `js/views/components.js` define componentes reutilizables para tarjetas, estados de carga, errores y elementos comunes.
- Cada vista dentro de `js/views/` construye su propia interfaz y lógica:
  - Pantalla principal con resúmenes y galerías.
  - Explorador con filtros y paginación.
  - Departamentos con tarjetas representativas.
  - Comparador interactivo de obras.
  - Detalle de obra y búsqueda por artista.
- `css/styles.css` controla la apariencia global, la coherencia visual y la responsividad en móviles.

---

## 👥 Equipo
- **Victor M. Aguillón** — Gobernanza del flujo principal, vista de inicio, filtros de búsqueda y lógica de exploración.
- **Rubén Adarme** — Diseño visual, departamento y comparador, estilos CSS y presentación de resultados.

---

## 📌 Características destacadas
- Búsqueda con filtros por departamento, fechas, obras destacadas y presencia de imagen.
- Vista de departamento para explorar áreas curatoriales específicas.
- Detalle ampliado de cada obra con imágenes adicionales y metadatos.
- Comparador que muestra dos obras seleccionadas con datos lado a lado.
- Navegación SPA con hash en la URL para mantener el estado.

---

## ⚙️ Cómo usar
1. Abrir `index.html` en cualquier navegador moderno.
2. Navegar entre `Inicio`, `Explorar`, `Departamentos` y `Comparar`.
3. Seleccionar obras para ver sus detalles o iniciar una comparación.
4. Usar los filtros de `Explorar` para refinar resultados.

---

## 📝 Notas
- La app depende de la API pública del Met Museum (`collectionapi.metmuseum.org`).
- Las imágenes y datos se cargan en tiempo real desde el servicio externo.
- El diseño está pensado para una experiencia fluida en escritorio y móvil.

## 🛠️ Solución  para `failed to fetch`
Si aparece `failed to fetch`, prueba lo siguiente:
- Verifica que tienes conexión a internet.
- Asegúrate de que tu navegador no bloquea solicitudes a `https://collectionapi.metmuseum.org`.
- Refresca la página y vuelve a intentar.
- Si usas un servidor local, confirma que la dirección es correcta (por ejemplo `http://127.0.0.1:5500/METHUB/index.html`).
- Si persiste, espera unos minutos y vuelve a cargar; a veces la API pública está temporalmente no disponible.
