// =============================================================
// FASE 2 — REQUISITOS: el juego deriva los requisitos mínimos del objetivo
// y los muestra como un CHECKLIST con iconos. Cada tarjeta se pone verde
// sola cuando el diseño la cumple. El detalle está en tooltips y en el "?".
// =============================================================
import * as Phaser from 'phaser';
import { CONFIG, CATEGORIAS, orbitasDe } from '../systems/datos.js';
import { estado, misionActual, destinoActual, opcionesDisponibles, analizarDiseno } from '../systems/estadoMision.js';
import { compatibilidadInstrumento } from '../systems/recursos.js';
import { generarChecklist } from '../systems/checklist.js';
import { crearChecklist } from '../ui/checklistUI.js';
import { botonAyuda, crearTooltip } from '../ui/ayuda.js';
import { ANCHO, COLORES, texto, titulo, boton, estrellas, barraFases } from '../ui/ui.js';

export default class EscenaRequisitos extends Phaser.Scene {
  constructor() {
    super('Requisitos');
  }

  create() {
    estrellas(this, 60);
    barraFases(this, CONFIG.fases, 1);
    const m = misionActual();
    titulo(this, 'Requisitos de la misión', 'Tu nave debe cumplir todo esto. Se marca en verde solo cuando tu diseño lo logra.');

    const tooltip = crearTooltip(this);
    const items = generarChecklist(analizarDiseno(), m, estado.presupuesto);
    const checklist = crearChecklist(this, { x: 40, y: 110, columnas: 2, anchoTarjeta: 590, altoTarjeta: 58, tooltip });
    const cumplidos = checklist.actualizar(items);

    const filas = Math.ceil(items.length / 2);
    const yInfo = 110 + filas * 68 + 10;
    texto(this, ANCHO / 2, yInfo,
      cumplidos === 0 ? 'Todavía no diseñaste la nave: pasa el mouse sobre cada tarjeta para ver qué se necesita.'
        : `Tu diseño actual cumple ${cumplidos} de ${items.length}.`,
      { tam: 15, origen: [0.5, 0], color: COLORES.textoSuave });

    // Detalle (instrumentos útiles, órbitas, etc.) detrás del botón "?"
    texto(this, ANCHO / 2 - 10, yInfo + 40, '¿Qué instrumentos sirven?', { tam: 15, origen: [1, 0.5], color: COLORES.acento });
    botonAyuda(this, ANCHO / 2 + 10, yInfo + 40, 'Instrumentos y detalles de la misión', () => this.textoDetalle(m));

    boton(this, 110, 680, 180, 44, '◀ Concepto', () => this.scene.start('Mision'), { tam: 16 });
    boton(this, ANCHO - 190, 680, 320, 50, 'Diseñar la nave ▶', () => this.scene.start('Diseno'), { tam: 18 });
  }

  /** Texto largo que aparece al pulsar "?". */
  textoDetalle(m) {
    const d = destinoActual();
    const instrumentos = opcionesDisponibles(CATEGORIAS.find((c) => c.id === 'instrumentos'));
    const utiles = [];
    const noUtiles = [];
    for (const inst of instrumentos) {
      const comp = compatibilidadInstrumento(m, inst.id);
      if (comp.ok) {
        const usos = m.objetivos.filter((o) => o.instrumentos[inst.id] !== undefined).map((o) => `×${o.instrumentos[inst.id]}`).join(' ');
        utiles.push(`✔ ${inst.nombre} (${usos})`);
      } else {
        noUtiles.push(`✖ ${inst.nombre}`);
      }
    }
    return `Sirven (el número multiplica su valor): ${utiles.join(', ') || '—'}.\n\n` +
      `No sirven: ${noUtiles.join(', ') || '—'}.\n\n` +
      (m.aterriza ? `Hay que aterrizar en ${d.nombre} (gravedad ${d.gravedad} m/s²).`
        : `Órbitas posibles: ${orbitasDe(m).map((o) => o.nombre).join(', ')}.`) +
      ` Viaje: ${d.juego.diasViaje} día(s).`;
  }
}
