// =============================================================
// estadoMision.js — EL objeto de estado compartido entre escenas
// + funciones "pegamento" que juntan el estado con los datos JSON
// y las funciones puras (recursos, lanzamiento, roles...).
//
// Regla del equipo: si tu escena produce algo importante, guárdalo en `estado`.
// =============================================================
import {
  CATEGORIAS, COHETES, ROLES, CONFIG,
  buscarMision, buscarDestino, buscarOrbita, buscarCohete, buscarRol
} from './datos.js';
import {
  calcularDiseno, ambienteDe, balanceOperativo, valorPorObjetivo, vidaEsperada,
  calcularMargenes, construirBarras
} from './recursos.js';
import { coheteMasBarato, costoRetraso } from './lanzamiento.js';
import { asignarRoles, evaluarMetas } from './roles.js';
import { calcularSoporte } from './soporteVital.js';
import { obtenerProgreso } from './progreso.js';
import { esModoExperto } from './preferencias.js';

// Único objeto de estado: import { estado } from '../systems/estadoMision.js'
export const estado = {};

/** Empieza una partida nueva desde la pantalla de Inicio. */
export function nuevaPartida({ modo, numJugadores, nivelId }) {
  for (const k of Object.keys(estado)) delete estado[k];
  Object.assign(estado, {
    modo,                       // 'individual' | 'equipo'
    numJugadores,
    nivelId,                    // '1' | '2' | '3'
    asignacion: modo === 'equipo' ? asignarRoles(ROLES, numJugadores) : [],
    jugadorActual: 0,           // índice en asignacion (modo equipo)
    misionId: null,
    presupuesto: 0,
    seleccion: {},              // { categoriaId: idComponente | [ids] }
    orbitaId: null,
    coheteId: null,
    disenosAB: { A: null, B: null }, // estudio de compensaciones
    aprobaciones: {},           // { rolId: true } (modo equipo)
    intento: 1,
    historial: [],              // resultados de intentos anteriores (para comparar)
    ...resultadosVacios()
  });
}

function resultadosVacios() {
  return {
    lanzamiento: null,  // lo que se decidió al lanzar (masa, costos, inserción, metas...)
    viaje: null,        // averías de la travesía y sus daños (ver systems/averias.js)
    aterrizaje: null,   // resultado del minijuego
    simulacion: null,   // { pasos, resumen } de simularMision()
    resultado: null     // puntaje y explicaciones del informe
  };
}

/** Elige la misión: ajusta el presupuesto según el nivel y limpia el diseño. */
export function elegirMision(id) {
  const m = buscarMision(id);
  estado.misionId = id;
  estado.presupuesto = Math.round(m.presupuesto * nivel().factorPresupuesto);
  estado.seleccion = {};
  estado.orbitaId = m.orbitaSugerida;
  estado.coheteId = null;
  estado.disenosAB = { A: null, B: null };
  estado.aprobaciones = {};
  estado.intento = 1;
  estado.historial = [];
  Object.assign(estado, resultadosVacios());
}

/** "Rediseñar": conserva la nave, la órbita y el cohete, y borra los resultados. */
export function nuevoIntento() {
  estado.intento += 1;
  estado.aprobaciones = {};
  Object.assign(estado, resultadosVacios());
}

// ---------- Atajos ----------
export const nivel = () => CONFIG.niveles[estado.nivelId];
export const misionActual = () => buscarMision(estado.misionId);
export const destinoActual = () => buscarDestino(misionActual().destino);
export const orbitaActual = () => buscarOrbita(estado.orbitaId);
export const coheteActual = () => (estado.coheteId ? buscarCohete(estado.coheteId) : null);
export const esEquipo = () => estado.modo === 'equipo';

/** Opciones de una categoría que se pueden usar en esta misión y este nivel. */
export function opcionesDisponibles(categoria) {
  const m = misionActual();
  if (categoria.soloTripulada && !m.tripulada) return [];
  return categoria.opciones.filter((o) => o.escala === m.escala && nivel().nivelesComponentes.includes(o.nivel));
}

/**
 * ¿El jugador ya puede tocar esta categoría? Depende de cuántas misiones
 * completó (config.json → desbloqueo). El modo experto desbloquea todo.
 */
export function categoriaDesbloqueada(categoria) {
  if (esModoExperto()) return true;
  const completadas = obtenerProgreso().misionesCompletadas;
  const paso = CONFIG.desbloqueo.pasos.find((p) => p.categorias.includes(categoria.id));
  return !paso || completadas >= paso.tras;
}

/** Cuántas misiones hay que completar para desbloquear una categoría. */
export function misionesParaDesbloquear(categoria) {
  const paso = CONFIG.desbloqueo.pasos.find((p) => p.categorias.includes(categoria.id));
  return paso ? paso.tras : 0;
}

/** Pieza que usa la misión en una categoría bloqueada (o la primera disponible). */
export function piezaPorDefecto(categoria) {
  const m = misionActual();
  const opciones = opcionesDisponibles(categoria);
  const id = m.piezasPorDefecto && m.piezasPorDefecto[categoria.id];
  return (opciones.find((o) => o.id === id) || opciones[0] || null);
}

/** Categorías que se muestran en el diseño (soporte vital solo si hay tripulación). */
export function categoriasVisibles() {
  return CATEGORIAS.filter((c) => opcionesDisponibles(c).length > 0);
}

/** Soporte vital de la misión actual (null si no es tripulada). */
export function soporteDe(diseno) {
  const m = misionActual();
  if (!m.tripulada) return null;
  return calcularSoporte({
    tripulantes: m.tripulantes,
    diasViaje: destinoActual().juego.diasViaje,
    diasSuperficie: m.diasSuperficie,
    diasExtra: estado.viaje ? estado.viaje.diasExtra : 0,
    diasPersona: diseno.diasPersona,
    perdidos: estado.viaje ? estado.viaje.soportePerdido : 0
  });
}

/**
 * Análisis completo de un diseño (por defecto, el actual): lo usan el panel
 * de recursos, las metas de rol, la comparación A/B, el lanzamiento y el informe.
 * @param config { seleccion, orbitaId, coheteId } opcional
 */
export function analizarDiseno(config = {}) {
  const seleccion = config.seleccion || estado.seleccion;
  const mision = misionActual();
  const destino = destinoActual();
  const orbita = buscarOrbita(config.orbitaId || estado.orbitaId);
  const coheteElegido = buscarCohete(config.coheteId === undefined ? estado.coheteId : config.coheteId);

  const diseno = calcularDiseno(seleccion, CATEGORIAS, CONFIG.riesgo);
  if (mision.tripulada && !diseno.diasPersona) diseno.faltantes.push('Soporte vital');
  const soporte = soporteDe(diseno);
  const ambiente = ambienteDe(mision, destino, orbita);
  const operativo = balanceOperativo(diseno, ambiente);
  const valor = valorPorObjetivo(diseno, ambiente, mision.objetivos, operativo.fraccionOperacion);

  // Si todavía no se eligió cohete, estimamos con el más barato posible
  const barato = coheteMasBarato(COHETES, orbita, diseno.masaTotal);
  const cohete = coheteElegido || barato;
  const capacidadCohete = cohete ? cohete.capacidad[orbita.id] || 0 : 0;
  const costoCohete = cohete ? cohete.costo : 0;
  const porMes = mision.costoPorMesRetraso ?? CONFIG.presupuesto.costoPorMesRetraso;
  const retraso = costoRetraso(diseno.mesesDesarrollo, mision.plazoMeses, porMes);
  const costoTotal = Math.round((diseno.costoComponentes + costoCohete + retraso) * 10) / 10;
  const vida = vidaEsperada(diseno, ambiente);
  const margenes = calcularMargenes(diseno, operativo, capacidadCohete);

  const barras = construirBarras({
    diseno, operativo, costoTotal, presupuesto: estado.presupuesto,
    plazoMeses: mision.plazoMeses, vidaEsperada: vida, vidaMinMeses: mision.requisitos.vidaMinMeses,
    alcanceRequerido: ambiente.alcanceRequerido, riesgoMaximo: CONFIG.riesgo.maximoAceptable,
    umbralAmarillo: CONFIG.barras.amarillo, diasViaje: destino.juego.diasViaje, soporte
  });

  const metas = evaluarMetas(ROLES, {
    margenes, valorMes: valor.total, metaValorMensual: mision.metaValorMensual, operativo,
    costoTotal, presupuesto: estado.presupuesto, soporte
  });

  return {
    mision, destino, orbita, diseno, ambiente, operativo, soporte, valorMes: valor.total, valorObjetivos: valor.porObjetivo,
    cohete, coheteBarato: barato, capacidadCohete, costoCohete, retraso, costoTotal,
    vidaEsperada: vida, margenes, barras, metas
  };
}

// ---------- Estudio de compensaciones (diseños A y B) ----------

/** Guarda una copia del diseño actual como 'A' o 'B'. */
export function guardarComoAB(letra) {
  estado.disenosAB[letra] = {
    seleccion: JSON.parse(JSON.stringify(estado.seleccion)),
    orbitaId: estado.orbitaId,
    coheteId: estado.coheteId
  };
}

/** Recupera el diseño 'A' o 'B' como diseño actual. */
export function usarDisenoAB(letra) {
  const d = estado.disenosAB[letra];
  if (!d) return;
  estado.seleccion = JSON.parse(JSON.stringify(d.seleccion));
  estado.orbitaId = d.orbitaId;
  estado.coheteId = d.coheteId;
  anularAprobaciones();
}

// ---------- Modo equipo ----------

/** Roles (objetos) del jugador que tiene el turno (individual: todos). */
export function rolesDelJugadorActual() {
  if (!esEquipo()) return ROLES;
  return estado.asignacion[estado.jugadorActual].roles.map(buscarRol);
}

/** ¿El jugador actual puede modificar esta categoría? (individual: siempre) */
export function puedeEditarCategoria(categoria) {
  if (!esEquipo()) return true;
  return rolesDelJugadorActual().some((r) => r.categorias.includes(categoria.id));
}

/** ¿El jugador actual puede elegir órbita y cohete? */
export function puedeElegirOrbita() {
  if (!esEquipo()) return true;
  return rolesDelJugadorActual().some((r) => r.controlaOrbita);
}

export function pasarTurno() {
  estado.jugadorActual = (estado.jugadorActual + 1) % estado.numJugadores;
}

/** Nombre del jugador que lidera las reparaciones (modo equipo), o null. */
export function liderReparaciones() {
  if (!esEquipo()) return null;
  const rol = ROLES.find((r) => r.lideraReparaciones);
  const j = estado.asignacion.find((a) => a.roles.includes(rol.id));
  return `Jugador ${j.jugador} (${rol.nombre})`;
}

/** Texto tipo "Turno del Jugador 2: Ingeniero de sistemas". */
export function textoTurno() {
  const a = estado.asignacion[estado.jugadorActual];
  return `Turno del Jugador ${a.jugador}: ${a.roles.map((id) => buscarRol(id).nombre).join(', ')}`;
}

/** Cualquier cambio en el diseño anula las aprobaciones. */
export function anularAprobaciones() {
  estado.aprobaciones = {};
}
