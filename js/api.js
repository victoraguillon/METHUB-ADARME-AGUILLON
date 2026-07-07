const BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1';
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_RETRIES = 2;
const DEFAULT_CONCURRENCY = 8;

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function requestJson(url, options = {}, retries = DEFAULT_RETRIES) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = options.signal;

  const abortHandler = () => controller.abort();
  if (externalSignal) {
    externalSignal.addEventListener('abort', abortHandler, { once: true });
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: externalSignal || controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`La petición falló con estado ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      if (retries > 0) {
        await delay(500);
        return requestJson(url, options, retries - 1);
      }
      throw new Error('La petición tardó demasiado y se canceló.');
    }

    if (retries > 0 && (error.status >= 500 || error.name === 'TypeError')) {
      await delay(500 * (DEFAULT_RETRIES - retries + 1));
      return requestJson(url, options, retries - 1);
    }

    throw error;
  } finally {
    if (externalSignal) {
      externalSignal.removeEventListener('abort', abortHandler);
    }
    window.clearTimeout(timeoutId);
  }
}

export async function fetchDepartments() {
  const data = await requestJson(`${BASE_URL}/departments`);
  return data;
}

export async function searchObjects(params = {}, options = {}) {
  const normalized = { ...params };
  const hasExplicitQuery = Object.prototype.hasOwnProperty.call(normalized, 'q');

  if (!hasExplicitQuery || typeof normalized.q !== 'string') {
    normalized.q = 'a';
  } else if (!normalized.q.trim()) {
    normalized.q = '';
  }

  const query = new URLSearchParams(normalized).toString();
  const data = await requestJson(`${BASE_URL}/search?${query}`, options);
  return data;
}

export async function getObjectById(id, options = {}) {
  if (!id) {
    throw new Error('No se proporcionó un identificador de obra.');
  }

  const data = await requestJson(`${BASE_URL}/objects/${id}`, options);
  return data;
}

export async function resolveArtworkIds(ids = [], concurrency = DEFAULT_CONCURRENCY) {
  const results = [];
  for (let i = 0; i < ids.length; i += concurrency) {
    const chunk = ids.slice(i, i + concurrency);
    const settled = await Promise.allSettled(chunk.map((id) => getObjectById(id)));
    results.push(
      ...settled
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value)
        .filter(Boolean)
    );
  }

  return results;
}