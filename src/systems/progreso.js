// =============================================================
// progreso.js — Lo que el jugador ya hizo, guardado en localStorage:
// tutorial visto, conceptos ya enseñados, categorías desbloqueadas vistas,
// misiones completadas, logros y cartas conseguidas, y estadísticas.
// =============================================================

const CLAVE = 'misionEspacial.progreso';

const VACIO = {
  tutorialVisto: false,
  misionesCompletadas: 0,     // misiones con todos los requisitos cumplidos
  lanzamientos: 0,
  conceptosVistos: [],        // mini-juegos de conceptos ya jugados (energia, masa, comunicaciones)
  avisosVistos: [],           // consejos de Orbi que solo se dicen una vez
  categoriasVistas: [],       // categorías que ya se mostraron como desbloqueadas
  logros: [],                 // ids de logros conseguidos
  cartas: [],                 // ids de cartas "¿Sabías que?" conseguidas
  estrellas: {},              // mejor cantidad de estrellas por misión
  reparaciones: 0
};

function cargar() {
  try {
    return { ...VACIO, ...JSON.parse(localStorage.getItem(CLAVE) || '{}') };
  } catch {
    return { ...VACIO };
  }
}

const progreso = cargar();

function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(progreso)); } catch { /* sin localStorage */ }
}

/** Devuelve una copia del progreso. */
export function obtenerProgreso() {
  return JSON.parse(JSON.stringify(progreso));
}

/** Cambia un valor simple (ej.: marcar('tutorialVisto', true)). */
export function marcar(clave, valor) {
  progreso[clave] = valor;
  guardar();
}

/** Suma a un contador (ej.: sumar('lanzamientos')). */
export function sumar(clave, cantidad = 1) {
  progreso[clave] = (progreso[clave] || 0) + cantidad;
  guardar();
  return progreso[clave];
}

/** Agrega un valor a una lista si no estaba. Devuelve true si es NUEVO. */
export function agregarA(lista, valor) {
  if (!Array.isArray(progreso[lista])) progreso[lista] = [];
  if (progreso[lista].includes(valor)) return false;
  progreso[lista].push(valor);
  guardar();
  return true;
}

/** ¿Ya está ese valor en la lista? */
export function contiene(lista, valor) {
  return Array.isArray(progreso[lista]) && progreso[lista].includes(valor);
}

/** Guarda la mejor cantidad de estrellas de una misión. */
export function guardarEstrellas(misionId, estrellas) {
  progreso.estrellas[misionId] = Math.max(progreso.estrellas[misionId] || 0, estrellas);
  guardar();
}
