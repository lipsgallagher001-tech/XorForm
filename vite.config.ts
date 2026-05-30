import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      // Optimisations pour reduire la taille du bundle
      target: 'esnext',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true, // Supprimer les console.log en production
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          // Separer les gros modules en chunks separes
          manualChunks: {
            // React et React DOM dans un chunk separe
            'react-vendor': ['react', 'react-dom'],
            // jsPDF et ses dependances dans un chunk separe
            'pdf-vendor': ['jspdf', 'jspdf-autotable'],
            // Supabase dans un chunk separe
            'supabase-vendor': ['@supabase/supabase-js'],
            // Autres librairies
            'utils-vendor': ['date-fns', 'zod', 'motion'],
          },
          // Noms de fichiers avec hash pour le cache
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      // Augmenter la limite de warning a 1000 KB (au lieu de 500 KB par defaut)
      chunkSizeWarningLimit: 1000,
      // Optimiser les assets
      assetsInlineLimit: 4096, // Inline les assets < 4KB en base64
    },
  };
});
