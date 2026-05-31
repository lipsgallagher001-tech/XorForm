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
          passes: 2, // Deux passes de compression pour meilleur résultat
        },
        mangle: {
          safari10: true, // Compatibilité Safari
        },
      },
      rollupOptions: {
        output: {
          // Separer les gros modules en chunks separes
          manualChunks: (id) => {
            // React et React DOM dans un chunk separe (doit être avant vendor)
            if (id.includes('node_modules/react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/react')) {
              return 'react-vendor';
            }
            // jsPDF et ses dependances dans un chunk separe
            if (id.includes('node_modules/jspdf')) {
              return 'pdf-vendor';
            }
            // Supabase dans un chunk separe
            if (id.includes('node_modules/@supabase')) {
              return 'supabase-vendor';
            }
            // Google Generative AI dans un chunk separe
            if (id.includes('node_modules/@google/genai')) {
              return 'genai-vendor';
            }
            // Lucide icons dans un chunk separe
            if (id.includes('node_modules/lucide-react')) {
              return 'icons-vendor';
            }
            // Autres librairies
            if (id.includes('node_modules/date-fns')) {
              return 'utils-vendor';
            }
            if (id.includes('node_modules/zod')) {
              return 'utils-vendor';
            }
            if (id.includes('node_modules/motion')) {
              return 'utils-vendor';
            }
          },
          // Noms de fichiers avec hash pour le cache
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      // Augmenter la limite de warning a 1500 KB pour éviter les warnings Vercel
      chunkSizeWarningLimit: 1500,
      // Optimiser les assets
      assetsInlineLimit: 4096, // Inline les assets < 4KB en base64
      // Optimiser le sourcemap pour production
      sourcemap: false, // Désactiver les sourcemaps en production pour réduire la taille
    },
  };
});
