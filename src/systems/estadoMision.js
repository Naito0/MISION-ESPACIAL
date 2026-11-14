// =============================================================
// estadoMision.js — EL objeto de estado compartido entre todas las escenas.
//
// Cada escena lee y escribe aquí sus decisiones y lo que pasó.
// La pantalla de Resultados usa toda esta información para explicar
// causa y efecto. Si agregas algo nuevo a una escena, guárdalo aquí.
// =============================================================
import {
  NAVE_BASE, CATEGORIAS, CONFIG,
  buscarDestino, buscarMision, buscarPieza
} from './datos.js';

// Único objeto de estado (se importa con: import { estado } from '../systems/estadoMision.js')
export const estado = {};

/** Deja el estado limpio para empezar una misión nueva. */
export function reiniciarEstado() {
  // Borramos todo lo que hubiera y volvemos a crear la estructura.
  for (const clave of Object.keys(estado)) delete estado[clave];

  Object.assign(estado, {
    // 1. Misión
    destinoId: null,
    misionId: null,
    presupuesto: 0,

    // 2. Taller: id de la pieza elegida por categoría (instrumentos es una lista)
    seleccion: {
      motor: null, tanque: null, escudo: null, paneles: null,
      bateria: null, antena: null, instrumentos: []
    },
    nave: null, // resumen calculado con calcularNave()

    // 3. Lanzamiento
    lanzamiento: { coheteId: null, rutaId: null, costoCohete: 0, coheteMasBarato: null },

    // Recursos que cambian durante el viaje (los eventos los dañan)
    recursos: {
      combustible: 0,
      factorPaneles: 1,
      factorAntena: 1,
      bateriaMax: 0,
      instrumentosDanados: []
    },

    // 4. Viaje
    viaje: {
      combustibleAntes: 0,
      combustibleRuta: 0,
      faltoCombustibleRuta: false,
      eventos: [] // { id, nombre, mitigado, texto, explicacion, perdidas }
    },

    // 5. Aterrizaje
    aterrizaje: null, // { exito, motivo, vVertical, vHorizontal, angulo, combustibleInicial, combustibleFinal, ... }

    // 6. Operación
    operacion: null, // { datosGenerados, datosTransmitidos, datosPerdidosMemoria, ... }

    // 7. Resultados (se calcula al final)
    resultado: null,

    // Bitácora general: lista de textos con lo que fue pasando
    bitacora: []
  });
}

/** Agrega una línea a la bitácora de la misión. */
export function registrar(fase, texto) {
  estado.bitacora.push({ fase, texto });
}

/** Atajos para obtener el destino y la misión actuales. */
export function destinoActual() {
  return buscarDestino(estado.destinoId);
}
export function misionActual() {
  return buscarMision(estado.misionId);
}

/** Lista de piezas elegidas (objetos completos), sin contar la nave base. */
export function piezasElegidas(seleccion = estado.seleccion) {
  const lista = [];
  for (const cat of CATEGORIAS) {
    const valor = seleccion[cat.id];
    if (Array.isArray(valor)) {
      valor.forEach((id) => lista.push(buscarPieza(id)));
    } else if (valor) {
      lista.push(buscarPieza(valor));
    }
  }
  return lista.filter(Boolean);
}

/**
 * Calcula el resumen de la nave a partir de la selección del taller.
 * Se usa en vivo en el Taller y se guarda en estado.nave al continuar.
 */
export function calcularNave(seleccion = estado.seleccion) {
  const piezas = piezasElegidas(seleccion);
  const pieza = (cat) => (seleccion[cat] ? buscarPieza(seleccion[cat]) : null);

  const motor = pieza('motor');
  const tanque = pieza('tanque');
  const escudo = pieza('escudo');
  const paneles = pieza('paneles');
  const bateria = pieza('bateria');
  const antena = pieza('antena');
  const instrumentos = seleccion.instrumentos.map(buscarPieza).filter(Boolean);

  const costo = NAVE_BASE.costo + piezas.reduce((s, p) => s + p.costo, 0);
  const masaSeca = NAVE_BASE.masa + piezas.reduce((s, p) => s + p.masa, 0);
  const capacidadCombustible = tanque ? tanque.capacidad : 0;

  return {
    costo,
    masaSeca,
    capacidadCombustible,
    masaTotal: masaSeca + capacidadCombustible, // con el tanque lleno
    empuje: motor ? motor.empuje : 0,
    consumoMotor: motor ? motor.consumo : 0,
    efectos: escudo ? [...escudo.efectos] : [],
    generacion: paneles ? paneles.energia : 0, // E por turno con sol pleno
    bateriaMax: NAVE_BASE.bateriaInterna + (bateria ? bateria.capacidad : 0),
    tasaAntena: antena ? antena.tasa : 0,
    energiaAntena: antena ? Math.abs(antena.energia) : 0,
    instrumentos: instrumentos.map((i) => ({
      id: i.id, nombre: i.nombre, datos: i.datos, energia: Math.abs(i.energia)
    })),
    consumoInstrumentos: instrumentos.reduce((s, i) => s + Math.abs(i.energia), 0)
  };
}

/** ¿La nave tiene un efecto de protección? ('aislamiento', 'impactos', ...) */
export function tieneEfecto(efecto) {
  return !!estado.nave && estado.nave.efectos.includes(efecto);
}

/** Factor solar de la misión (si la misión lo define) o del destino. */
export function factorSolarActual() {
  const m = misionActual();
  if (m && typeof m.factorSolar === 'number') return m.factorSolar;
  return destinoActual().juego.factorSolar;
}

/**
 * Balance de energía por turno en la superficie.
 * Lo usan el Taller (vista previa) y la Operación (valores reales tras los daños).
 */
export function balanceEnergia(nave, efectos, factorPaneles = 1) {
  const destino = destinoActual();
  const generacion = Math.round(nave.generacion * factorSolarActual() * factorPaneles);
  let calefaccion = destino.juego.consumoCalefaccion;
  if (efectos.includes('aislamiento')) {
    calefaccion = Math.round(calefaccion * CONFIG.operacion.reduccionCalefaccionConAislamiento);
  }
  const consumoFijo = NAVE_BASE.consumoPorTurno + calefaccion;
  return { generacion, calefaccion, consumoFijo, neto: generacion - consumoFijo };
}

// Al cargar el módulo dejamos el estado listo.
reiniciarEstado();
