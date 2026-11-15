// =============================================================
// Registro de los minijuegos. El campo "minijuego" de cada emergencia
// (emergencias3d.json) usa estos nombres. Los pasos de cada uno dependen
// del DESTINO (dificultad.json → minijuegosPorDestino: Luna media, Marte difícil).
//
// Cada minijuego tiene 3 textos que se ven SIEMPRE en la consola:
//   objetivo  🎯 qué tienes que lograr
//   controles 🎮 qué teclas o clics usar
//   gana      🏆 cómo ganas
// "rol" sirve para el Modo prueba y para PRUEBAS.md.
// "activo: false" desactiva un minijuego (sin borrarlo) si no funciona bien.
// =============================================================
import { abrirConsola } from './base.js';
import { esquivar, rumbo } from './comandante.js';
import { fuga, interruptores, paneles, deslizadores } from './ingeniero.js';
import { filtro, equilibrio, huerto, secuencia } from './cientifico.js';
import { unidades, retraso, tormenta } from './comunicaciones.js';
import configDificultad from '../../data/dificultad.json';

export const MINIJUEGOS = {
  esquivar: { fn: esquivar, rol: 'comandante', nombre: 'Esquivar basura espacial',
    objetivo: 'Que no te choquen los objetos marcados con aro rojo.',
    controles: 'Flechas ← → ↑ ↓ (o WASD) mueven la mira verde.',
    gana: 'Aguantas hasta que el reloj llega a 0.' },
  rumbo: { fn: rumbo, rol: 'comandante', nombre: 'Corregir el rumbo',
    objetivo: 'Que la línea punteada pase por el planeta.',
    controles: '← → giran la nave. Cada giro gasta combustible; la nave se desvía sola.',
    gana: 'La línea queda sobre el planeta unos segundos (se pone verde).' },
  fuga: { fn: fuga, rol: 'ingeniero', nombre: 'Cazar la fuga de aire',
    objetivo: 'Encontrar y sellar la fuga antes de que la presión llegue a 60%.',
    controles: 'Paso 1: clic donde se juntan las partículas. Paso 2: mantén el clic (o Espacio) sobre el aro rojo.',
    gana: 'La barra amarilla del sellado se llena.' },
  interruptores: { fn: interruptores, rol: 'ingeniero', nombre: 'Apagón: interruptores',
    objetivo: 'Reiniciar el interruptor cuyos 2 sistemas están en ROJO.',
    controles: 'Clic en un interruptor. Tienes 3 intentos.',
    gana: 'Todos los sistemas vuelven a verde.' },
  paneles: { fn: paneles, rol: 'ingeniero', nombre: 'Paneles con polvo',
    objetivo: 'Llenar la batería antes de que se vacíe.',
    controles: 'Pasa el mouse sobre un panel para limpiarlo. Clic (o 1-4) para elegir un panel y ← → para girarlo hacia el Sol.',
    gana: 'La batería llega a 100%.' },
  deslizadores: { fn: deslizadores, rol: 'ingeniero', nombre: 'Estabilizar el motor',
    objetivo: 'Poner cada barra sobre su marca amarilla.',
    controles: 'Arrastra cada barra con el mouse y pulsa "Confirmar".',
    gana: 'Todas las barras quedan sobre su marca al confirmar.' },
  filtro: { fn: filtro, rol: 'cientifico', nombre: 'Filtro improvisado (Apolo 13)',
    objetivo: 'Armar el adaptador antes de que el CO₂ llegue a 100%.',
    controles: 'Clic en un objeto y después clic en el paso donde va.',
    gana: 'Los 3 pasos quedan con ✅.' },
  equilibrio: { fn: equilibrio, rol: 'cientifico', nombre: 'Equilibrar el oxígeno',
    objetivo: 'Que la PRODUCCIÓN sea igual al CONSUMO para que el O₂ quede en verde.',
    controles: 'Barra de abajo o ↑ ↓. La producción tarda un poco en cambiar.',
    gana: 'El O₂ se queda en la zona verde el tiempo pedido.' },
  huerto: { fn: huerto, rol: 'cientifico', nombre: 'Huerto espacial',
    objetivo: 'Que cada planta crezca hasta 100%.',
    controles: 'Clic en una planta y pon sus barras de luz y agua en la zona verde.',
    gana: 'Todas las plantas llegan a ✅.' },
  secuencia: { fn: secuencia, rol: 'cientifico', nombre: 'Analizar una muestra',
    objetivo: 'Repetir la secuencia de colores del analizador.',
    controles: 'Mira los colores y después haz clic en el mismo orden. Los destellos grises no cuentan.',
    gana: 'Repites toda la secuencia sin errores.' },
  unidades: { fn: unidades, rol: 'comunicaciones', nombre: 'Unidades mezcladas',
    objetivo: 'Enviar cada orden en el sistema MÉTRICO.',
    controles: 'Lee la unidad de la orden y haz clic en el valor correcto.',
    gana: 'Envías bien todas las órdenes.' },
  retraso: { fn: retraso, rol: 'comunicaciones', nombre: 'Orden con retraso',
    objetivo: 'Que el rover frene en la zona verde, antes del cráter.',
    controles: 'Espacio (o el botón) envía "¡Frena!". Envíala cuando el rover cruce la línea amarilla.',
    gana: 'El rover se detiene dentro de la zona verde.' },
  tormenta: { fn: tormenta, rol: 'comunicaciones', nombre: 'Contacto perdido',
    objetivo: 'Recuperar una señal fuerte y mantenerla.',
    controles: 'Paso 1: ← → giran la antena hasta que diga "alineada". Paso 2: ↑ ↓ mueven la frecuencia hasta el pico más alto.',
    gana: 'La barra de señal se pone verde el tiempo pedido.' }
};

/** Minijuegos activos (los desactivados no se usan en emergencias ni en el Modo prueba). */
export const minijuegosActivos = () => Object.entries(MINIJUEGOS).filter(([, m]) => m.activo !== false).map(([id, m]) => ({ id, ...m }));

/**
 * Abre el minijuego de una emergencia. alTerminar(resultado): true, false o null (cerrado).
 * destinoId elige los valores: Luna (media) o Marte (difícil).
 * o = { extraTiempo: 1.5 } para dar tiempo extra (primer intento, Modo prueba).
 */
export function abrirMinijuego(emergencia, colorHex, alTerminar, destinoId = 'luna', o = {}) {
  let m = MINIJUEGOS[emergencia.minijuego];
  // Si este minijuego está desactivado, se usa otro del MISMO rol que funcione
  if (m.activo === false) {
    const reemplazo = minijuegosActivos().find((x) => x.rol === m.rol);
    emergencia = { ...emergencia, minijuego: reemplazo.id };
    m = MINIJUEGOS[reemplazo.id];
  }
  const valores = configDificultad.minijuegosPorDestino[destinoId] || configDificultad.minijuegosPorDestino.luna;
  const opciones = { ...(valores[emergencia.minijuego] || {}), destinoId };
  return abrirConsola({
    id: emergencia.minijuego,
    titulo: emergencia.nombre,
    instrucciones: emergencia.descripcion,
    objetivo: m.objetivo,
    controles: m.controles,
    gana: m.gana,
    color: `#${colorHex.toString(16).padStart(6, '0')}`,
    segundos: Math.max(20, emergencia.restante) * (o.extraTiempo ?? 1),
    iniciar: m.fn,
    opciones,
    alTerminar
  });
}
