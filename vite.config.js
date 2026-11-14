import { defineConfig } from 'vite';

// base relativa ('./') para que el juego funcione servido desde el anfitrión
// (server/) o desde cualquier carpeta.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000
  },
  server: {
    // En desarrollo, la conexión en tiempo real va al servidor del juego (puerto 3000)
    proxy: { '/socket.io': { target: 'http://localhost:3000', ws: true } }
  }
});
