import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// import { testSupabaseConnection } from './test-supabase';

// Nettoyage du localStorage désactivé - utilisation de Supabase pour la session
// localStorage.clear();

// Tester la connexion Supabase au démarrage (en développement uniquement)
// Temporairement désactivé pour déboguer
// if (import.meta.env.DEV) {
//   testSupabaseConnection();
// }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
