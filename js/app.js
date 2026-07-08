import { initRouter } from './router.js';

const appRoot = document.getElementById('app');

if (appRoot) {
  initRouter(appRoot);
}