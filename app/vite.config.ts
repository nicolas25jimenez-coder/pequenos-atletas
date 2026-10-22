import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // PDF y Excel se descargan solo cuando se usan; no se guardan para uso sin conexión.
      injectManifest: { maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, globIgnores: ['**/exceljs*.js', '**/informe-*.js'] },
      devOptions: { enabled: false },
      manifest: {
        name: 'Pequeños Atletas',
        short_name: 'P. Atletas',
        description: 'Seguimiento deportivo infantil · formación predeportiva 4–6 años',
        lang: 'es-CO',
        start_url: '/',
        display: 'standalone',
        background_color: '#0A0D12',
        theme_color: '#0A0D12',
        icons: [
          { src: '/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 2500 },
});
