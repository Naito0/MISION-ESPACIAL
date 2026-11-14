// =============================================================
// preferencias.js — Opciones del jugador que se guardan en localStorage:
//   - modoExperto: muestra todos los números y términos técnicos.
//   - silencio: apaga los sonidos.
// Las escenas pueden "escuchar" los cambios con alCambiarPreferencias().
// =============================================================

const CLAVE = 'misionEspacial.preferencias';
const oyentes = new Set();

function cargar() {
  try {
    return { modoExperto: false, silencio: false, ...JSON.parse(localStorage.getItem(CLAVE) || '{}') };
  } catch {
    return { modoExperto: false, silencio: false };
  }
}

const prefs = cargar();

function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(prefs)); } catch { /* sin localStorage */ }
  oyentes.forEach((fn) => fn({ ...prefs }));
}

export const esModoExperto = () => prefs.modoExperto;
export const estaSilenciado = () => prefs.silencio;

export function setModoExperto(valor) {
  prefs.modoExperto = !!valor;
  guardar();
}

export function setSilencio(valor) {
  prefs.silencio = !!valor;
  guardar();
}

/** Llama a fn cada vez que cambia una preferencia. Devuelve una función para dejar de escuchar. */
export function alCambiarPreferencias(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}
