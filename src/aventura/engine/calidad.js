// =============================================================
// calidad.js — Configuración gráfica: Bajo, Medio y Alto.
// Cambia la resolución, el suavizado de bordes y las sombras.
// Bajo está pensado para computadoras de gama media o para 3-4 jugadores.
// =============================================================

export const NIVELES_CALIDAD = {
  bajo: {
    nombre: 'Bajo',
    escalaResolucion: 0.75, // dibuja a 75% de la resolución y estira (mucho más rápido)
    antialias: false,
    sombras: false,
    tamanoSombra: 512,
    niebla: true
  },
  medio: {
    nombre: 'Medio',
    escalaResolucion: 1,
    antialias: true,
    sombras: true,
    tamanoSombra: 1024,
    niebla: true
  },
  alto: {
    nombre: 'Alto',
    escalaResolucion: 1.5, // hasta 1,5× en pantallas de alta densidad
    antialias: true,
    sombras: true,
    tamanoSombra: 2048,
    niebla: true
  }
};

/** Devuelve la configuración de un nivel (o la de 'medio' si no existe). */
export function configCalidad(nivel) {
  return NIVELES_CALIDAD[nivel] || NIVELES_CALIDAD.medio;
}
