// =============================================================
// datos.js — Carga los JSON de src/data y ofrece búsquedas por id.
// Las escenas leen los datos desde aquí. Las funciones puras
// (recursos, simulación, puntaje...) NO importan este archivo:
// reciben los datos por parámetro.
// =============================================================
import destinosJson from '../data/destinos.json';
import componentesJson from '../data/componentes.json';
import cohetesJson from '../data/cohetes.json';
import orbitasJson from '../data/orbitas.json';
import misionesJson from '../data/misiones.json';
import misionesRealesJson from '../data/misiones_reales.json';
import eventosJson from '../data/eventos.json';
import rolesJson from '../data/roles.json';
import configJson from '../data/config.json';

export const DESTINOS = destinosJson.destinos;
export const CATEGORIAS = componentesJson.categorias;
export const COHETES = cohetesJson.cohetes;
export const ORBITAS = orbitasJson.orbitas;
export const MISIONES = misionesJson.misiones;
export const MISIONES_REALES = misionesRealesJson.misiones;
export const EVENTOS = eventosJson.eventos;
export const ROLES = rolesJson.roles;
export const CONFIG = configJson;

const porId = (lista) => (id) => lista.find((x) => x.id === id) || null;
export const buscarDestino = porId(DESTINOS);
export const buscarCohete = porId(COHETES);
export const buscarOrbita = porId(ORBITAS);
export const buscarMision = porId(MISIONES);
export const buscarRol = porId(ROLES);
export const buscarCategoria = porId(CATEGORIAS);

/** Órbitas disponibles para una misión (las de su destino, o las permitidas). */
export function orbitasDe(mision) {
  return ORBITAS.filter((o) => o.destino === mision.destino &&
    (!mision.orbitasPermitidas || mision.orbitasPermitidas.includes(o.id)));
}

/** Rol (segmento) que decide una categoría de componentes. */
export function rolDeCategoria(categoriaId) {
  return ROLES.find((r) => r.categorias.includes(categoriaId)) || null;
}
