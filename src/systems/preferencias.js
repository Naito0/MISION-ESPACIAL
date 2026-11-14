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

/** Calidad gráfica de la aventura 3D: 'bajo' | 'medio' | 'alto'. */
export const calidad3D = () => prefs.calidad3D || 'medio';
export function setCalidad3D(valor) {
  prefs.calidad3D = valor;
  guardar();
}

/** Sensibilidad del mouse en la aventura 3D (1 = normal). */
export const sensibilidad3D = () => prefs.sensibilidad3D || 1;
export function setSensibilidad3D(valor) {
  prefs.sensibilidad3D = valor;
  guardar();
}

/** Tamaño del texto: 'grande' (por defecto, para proyector) o 'normal'. */
export const tamanoTexto = () => prefs.tamanoTexto || 'grande';
export function setTamanoTexto(valor) {
  prefs.tamanoTexto = valor === 'normal' ? 'normal' : 'grande';
  guardar();
}

/** Dificultad: 'facil' (por defecto) o 'normal'. Los valores están en src/data/dificultad.json. */
export const dificultad = () => prefs.dificultad || 'facil';
export function setDificultad(valor) {
  prefs.dificultad = valor === 'normal' ? 'normal' : 'facil';
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
