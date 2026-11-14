// =============================================================
// Registro de los 12 minijuegos (3 por rol). El campo "minijuego" de
// cada emergencia en emergencias3d.json usa estos nombres.
// =============================================================
import { abrirConsola } from './base.js';
import configDificultad from '../../data/dificultad.json';
import { dificultad } from '../../systems/preferencias.js';
import { trayectoria, ritmo, esquivar } from './comandante.js';
import { cables, soldar, deslizadores } from './ingeniero.js';
import { nivel, secuencia, regar } from './cientifico.js';
import { sintonizar, apuntar, ordenar } from './comunicaciones.js';

export const MINIJUEGOS = {
  trayectoria: { fn: trayectoria, inst: 'Gira la nave con ← → (o los botones) hasta que apunte al planeta y mantenla 1,5 s.' },
  ritmo: { fn: ritmo, inst: 'Pulsa Espacio (o el botón) justo cuando la marca amarilla esté en la zona verde. 3 veces.' },
  esquivar: { fn: esquivar, inst: 'Mueve la nave con ← → o el mouse y esquiva los micrometeoritos durante 8 s.' },
  cables: { fn: cables, inst: 'Toca un cable de la izquierda y después el del MISMO color a la derecha.' },
  soldar: { fn: soldar, inst: 'Haz clic 3 veces sobre cada grieta para soldarla.' },
  deslizadores: { fn: deslizadores, inst: 'Lleva cada barra a su marca amarilla y pulsa Confirmar.' },
  nivel: { fn: nivel, inst: 'Mantén pulsado para liberar oxígeno. Deja el nivel en la zona verde 5 s.' },
  secuencia: { fn: secuencia, inst: 'Mira la secuencia de colores del analizador y repítela.' },
  regar: { fn: regar, inst: 'Haz clic en las plantas para regarlas: ninguna puede secarse en 8 s.' },
  sintonizar: { fn: sintonizar, inst: 'Mueve el dial hasta que tu onda coincida con la de la Tierra.' },
  apuntar: { fn: apuntar, inst: 'Sigue a la Tierra con la mira del mouse hasta juntar 2 s de señal.' },
  ordenar: { fn: ordenar, inst: 'Toca los paquetes de datos en orden, del 1 al 6.' }
};

/**
 * Abre el minijuego de una emergencia. alTerminar(resultado): true, false o null (cerrado).
 * Los pasos de cada minijuego (cuántos cables, cuántas grietas…) salen de
 * dificultad.json según la dificultad elegida.
 */
export function abrirMinijuego(emergencia, colorHex, alTerminar) {
  const m = MINIJUEGOS[emergencia.minijuego];
  const nivel = configDificultad.niveles[dificultad()] || configDificultad.niveles[configDificultad.porDefecto];
  const opciones = nivel.minijuegos[emergencia.minijuego] || {};
  return abrirConsola({
    titulo: emergencia.nombre,
    instrucciones: `${emergencia.descripcion}<br><b>${instruccion(emergencia.minijuego, opciones)}</b>`,
    color: `#${colorHex.toString(16).padStart(6, '0')}`,
    segundos: Math.max(8, emergencia.restante),
    iniciar: m.fn,
    opciones,
    alTerminar
  });
}

/** Instrucción con los números de la dificultad (ej. "durante 5 s" en Fácil). */
function instruccion(id, op) {
  const t = MINIJUEGOS[id].inst;
  const reemplazos = {
    trayectoria: ['1,5 s', `${op.segundos ?? 1.5} s`], ritmo: ['3 veces', `${op.aciertos ?? 3} veces`],
    esquivar: ['8 s', `${op.segundos ?? 8} s`], nivel: ['5 s', `${op.segundos ?? 5} s`],
    regar: ['8 s', `${op.segundos ?? 8} s`], apuntar: ['2 s', `${op.segundos ?? 2} s`],
    ordenar: ['del 1 al 6', `del 1 al ${op.paquetes ?? 6}`]
  }[id];
  return reemplazos ? t.replace(reemplazos[0], reemplazos[1]) : t;
}
