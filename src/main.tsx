import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { cleanupCache } from './lib/cache';

// ⚡ OPTIMISATION: Nettoyer le cache corrompu au démarrage
cleanupCache();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
