import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true, // Esto desbloquea el acceso para Render y los smartphones
    host: true,
    port: 5173
  }
});
