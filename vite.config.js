import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// base relativa ('./') para que el juego funcione en GitHub Pages
// sin importar el nombre del repositorio.
// Dos páginas:
//   index.html    → modo clásico (Phaser, 2D)
//   aventura.html → aventura 3D (Three.js)
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    // Phaser y Three.js son librerías grandes; subimos el límite del aviso de tamaño.
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        clasico: resolve(import.meta.dirname, 'index.html'),
        aventura: resolve(import.meta.dirname, 'aventura.html')
      }
    }
  }
});
