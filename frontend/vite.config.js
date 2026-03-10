// vite.config.js — Vite configuration
//
// Configures:
//   - React plugin for JSX support
//   - Dev server proxy: /api requests forwarded to backend (localhost:8000)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
