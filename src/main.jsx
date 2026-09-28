import React from 'react';
import ReactDOM from 'react-dom/client';
import { setWorkerUrl } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import App from './AppRoutes.jsx';
import './index.css';
import { recoverStaleChunk } from './lib/pageRecovery.js';
setWorkerUrl(mapWorkerUrl);

window.addEventListener('vite:preloadError', event => {
  recoverStaleChunk(event.payload);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
