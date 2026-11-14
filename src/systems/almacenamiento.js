// =============================================================
// almacenamiento.js — Récords y diseños guardados en localStorage.
// Si el navegador no permite localStorage (modo privado), el juego
// sigue funcionando: simplemente no guarda nada.
// =============================================================
import { CONFIG } from './datos.js';

function leer(clave, porDefecto) {
  try {
    const texto = localStorage.getItem(clave);
    return texto ? JSON.parse(texto) : porDefecto;
  } catch {
    return porDefecto;
  }
}

function escribir(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // sin localStorage: no se guarda
  }
}

/** Lista de récords ordenada de mayor a menor. */
export function cargarRecords() {
  const lista = leer(CONFIG.almacenamiento.claveRecords, []);
  return Array.isArray(lista) ? lista : [];
}

/** Guarda un récord. Devuelve { records, esRecord }. */
export function guardarRecord(entrada) {
  const anteriores = cargarRecords();
  const mejor = anteriores.length ? anteriores[0].puntaje : 0;
  const records = [...anteriores, { ...entrada, fecha: new Date().toLocaleDateString('es') }]
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, CONFIG.almacenamiento.cantidadRecords);
  escribir(CONFIG.almacenamiento.claveRecords, records);
  return { records, esRecord: entrada.puntaje > mejor };
}

/** Último diseño guardado para una misión (o null). */
export function cargarDiseno(misionId) {
  const disenos = leer(CONFIG.almacenamiento.claveDisenos, {});
  return disenos[misionId] || null;
}

/** Guarda el diseño (selección, órbita y cohete) de una misión. */
export function guardarDiseno(misionId, datos) {
  const disenos = leer(CONFIG.almacenamiento.claveDisenos, {});
  disenos[misionId] = datos;
  escribir(CONFIG.almacenamiento.claveDisenos, disenos);
}
