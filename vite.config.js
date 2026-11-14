import { defineConfig } from 'vite';

// base relativa ('./') para que el juego funcione en GitHub Pages
// sin importar el nombre del repositorio.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    // Phaser es una librería grande; subimos el límite del aviso de tamaño.
    chunkSizeWarningLimit: 2000
  }
});
