// =============================================================
// Registro de los minijuegos. El campo "minijuego" de cada emergencia
// (emergencias3d.json) usa estos nombres. Los pasos de cada uno dependen
// del DESTINO (dificultad.json → minijuegosPorDestino: Luna media, Marte difícil).
// "demo" = la animación de 3 segundos que se ve la primera vez.
// =============================================================
import { abrirConsola } from './base.js';
import { esquivar, rumbo } from './comandante.js';
import { fuga, interruptores, paneles, deslizadores } from './ingeniero.js';
import { filtro, equilibrio, huerto, secuencia } from './cientifico.js';
import { unidades, retraso, tormenta } from './comunicaciones.js';
import configDificultad from '../../data/dificultad.json';

export const MINIJUEGOS = {
  esquivar: { fn: esquivar, inst: 'Mueve la mira con las flechas. Esquiva la BASURA gris y los MICROMETEORITOS naranjas que crecen delante de ti; las estrellas no hacen daño.',
    demo: { teclas: ['↑', '↓', '←', '→'], texto: 'Si algo gris o naranja crece justo en tu mira, muévete.' } },
  rumbo: { fn: rumbo, inst: 'Gira con ← → hasta que la línea punteada pase por el planeta y mantenla. Cada corrección gasta combustible.',
    demo: { teclas: ['←', '→'], texto: 'Giros cortos: espera a ver hacia dónde va la línea.' } },
  fuga: { fn: fuga, inst: 'Las partículas flotan HACIA la fuga. Haz clic donde está el agujero y mantén apretado para sellarlo.',
    demo: { teclas: ['🖱 clic', 'mantener'], texto: 'Los ventiladores empujan partículas hacia afuera: no te confundas.' } },
  interruptores: { fn: interruptores, inst: 'Cada interruptor alimenta 2 sistemas. Reinicia SOLO el que alimenta sistemas apagados (en rojo).',
    demo: { teclas: ['🖱 clic'], texto: 'Espera a que los paneles se calmen y lee qué sistemas están en rojo.' } },
  paneles: { fn: paneles, inst: 'Pasa el mouse sobre los paneles para limpiarlos. Elige uno (clic o 1-4) y gíralo con ← → hacia el Sol.',
    demo: { teclas: ['🖱 limpiar', '←', '→'], texto: 'Energía = panel limpio + mirando al Sol.' } },
  deslizadores: { fn: deslizadores, inst: 'Lleva cada barra a su marca amarilla y pulsa Confirmar.' },
  filtro: { fn: filtro, inst: 'El filtro es cuadrado y la entrada redonda. Elige un objeto y después el paso donde va.',
    demo: { teclas: ['🖱 objeto', '🖱 paso'], texto: 'Necesitas algo para dar forma, algo para cubrir y algo para sellar.' } },
  equilibrio: { fn: equilibrio, inst: 'Ajusta la producción (barra o ↑ ↓) para que sea igual al consumo de la tripulación y el O₂ quede en verde.',
    demo: { teclas: ['↑', '↓'], texto: 'La producción tarda en cambiar: anticípate.' } },
  huerto: { fn: huerto, inst: 'Elige cada planta y pon su luz y su agua en la zona verde hasta que crezca.',
    demo: { teclas: ['🖱 planta', '🖱 barras'], texto: 'Cada planta necesita algo distinto; demasiada agua las ahoga.' } },
  secuencia: { fn: secuencia, inst: 'Mira la secuencia de colores del analizador y repítela. Los destellos grises no cuentan.',
    demo: { teclas: ['🖱 colores'], texto: 'Dila en voz baja: "rojo, azul, azul…"' } },
  unidades: { fn: unidades, inst: 'La nave usa el sistema métrico. Convierte los valores en sistema inglés antes de enviar (¡y no conviertas los que ya son métricos!).',
    demo: { teclas: ['🖱 elegir'], texto: 'Mira la unidad de cada orden antes de responder.' } },
  retraso: { fn: retraso, inst: 'Lo que ves ya pasó y tu orden tarda en llegar: envía "¡Frena!" con anticipación para que el rover pare en la zona verde.',
    demo: { teclas: ['Espacio'], texto: 'Envía la orden cuando el rover todavía está lejos.' } },
  tormenta: { fn: tormenta, inst: 'Alinea la antena (← →) y busca la frecuencia (↑ ↓). Solo el pico verdadero se vuelve fuerte con la antena alineada.',
    demo: { teclas: ['←', '→', '↑', '↓'], texto: 'Primero gira la antena hasta que un pico crezca.' } }
};

/**
 * Abre el minijuego de una emergencia. alTerminar(resultado): true, false o null (cerrado).
 * destinoId elige los valores: Luna (media) o Marte (difícil).
 */
export function abrirMinijuego(emergencia, colorHex, alTerminar, destinoId = 'luna') {
  const m = MINIJUEGOS[emergencia.minijuego];
  const valores = configDificultad.minijuegosPorDestino[destinoId] || configDificultad.minijuegosPorDestino.luna;
  const opciones = { ...(valores[emergencia.minijuego] || {}), destinoId };
  return abrirConsola({
    id: emergencia.minijuego,
    titulo: emergencia.nombre,
    instrucciones: `${emergencia.descripcion}<br><b>${m.inst}</b>`,
    color: `#${colorHex.toString(16).padStart(6, '0')}`,
    segundos: Math.max(20, emergencia.restante),
    iniciar: m.fn,
    opciones,
    demo: m.demo,
    alTerminar
  });
}
