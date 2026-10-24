import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

// Turkish letters (ı, ş, ğ, İ) are in Geist's latin-ext file, which the browser only requests once such
// text is on screen; the first screen's largest text nearly always has them, so it is fetched up front.
const preloadTurkishFont: Plugin = {
  name: 'preload-turkish-font',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (_html, context) => {
      const font = Object.keys(context.bundle ?? {}).find((file) => /geist-latin-ext-wght-normal-[\w-]+\.woff2$/.test(file));
      if (!font) throw new Error('Geist latin-ext font is missing from the build');
      return [{ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `/${font}` }, injectTo: 'head' }];
    },
  },
};

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), preloadTurkishFont],
  // One API base for the app and index.html's early session refresh: '/api' unless the build sets VITE_API_BASE_URL.
  define: {
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(loadEnv(mode, root, 'VITE_').VITE_API_BASE_URL || '/api'),
  },
  // Prebundle the linked contracts workspace during development.
  optimizeDeps: { include: ['@study-tracker/contracts'] },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: 'localhost',
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Icons are tiny and shared by many routes; one chunk avoids dozens of round trips.
        manualChunks: (id: string) => (id.includes('/lucide-react/') ? 'icons' : undefined),
      },
    },
  },
}));
