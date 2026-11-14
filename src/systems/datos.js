// =============================================================
// datos.js — Carga los JSON de src/data y ofrece funciones de búsqueda.
// Todas las escenas leen los datos desde aquí (nunca valores fijos en el código).
// =============================================================
import destinosJson from '../data/destinos.json';
import piezasJson from '../data/piezas.json';
import cohetesJson from '../data/cohetes.json';
import misionesJson from '../data/misiones.json';
import eventosJson from '../data/eventos.json';
import configJson from '../data/config.json';

export const TIERRA = destinosJson.tierra;
export const DESTINOS = destinosJson.destinos;
export const NAVE_BASE = piezasJson.naveBase;
export const CATEGORIAS = piezasJson.categorias;
export const COHETES = cohetesJson.cohetes;
export const MISIONES = misionesJson.misiones;
export const EVENTOS = eventosJson.eventos;
export const EVENTOS_FIJOS = eventosJson.eventosFijos;
export const CONFIG = configJson;

/** Devuelve el destino por id ('luna' o 'marte'). */
export function buscarDestino(id) {
  return DESTINOS.find((d) => d.id === id);
}

/** Devuelve la misión por id. */
export function buscarMision(id) {
  return MISIONES.find((m) => m.id === id);
}

/** Devuelve la categoría de piezas por id ('motor', 'tanque', ...). */
export function buscarCategoria(id) {
  return CATEGORIAS.find((c) => c.id === id);
}

/** Devuelve una pieza (opción) buscándola en todas las categorías. */
export function buscarPieza(idPieza) {
  for (const cat of CATEGORIAS) {
    const p = cat.opciones.find((o) => o.id === idPieza);
    if (p) return p;
  }
  return null;
}

/** Devuelve el cohete por id. */
export function buscarCohete(id) {
  return COHETES.find((c) => c.id === id);
}
