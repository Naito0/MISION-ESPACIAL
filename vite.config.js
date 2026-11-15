import { defineConfig } from 'vite';

// base relativa ('./') para que el juego funcione servido desde el anfitrión
// (server/) o desde cualquier carpeta.
export default defineConfig({
  base: './',
  // Versión visible en el menú (para saber si el navegador muestra la última)
  define: {
    __VERSION__: JSON.stringify(`v11 · ${new Date().toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}`) // hora local del equipo (UTC-5)
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000
  },
  server: {
    // En desarrollo, la conexión en tiempo real va al servidor del juego (puerto 3000)
    proxy: { '/socket.io': { target: 'http://localhost:3000', ws: true } }
  }
});
