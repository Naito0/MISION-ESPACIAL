// =============================================================
// FASE 2 — REQUISITOS: el juego deriva los requisitos mínimos del objetivo
// (datos, vida útil, órbita o aterrizaje, instrumentos útiles, alcance...).
// =============================================================
import * as Phaser from 'phaser';
import { CONFIG, CATEGORIAS, orbitasDe } from '../systems/datos.js';
import { estado, misionActual, destinoActual, opcionesDisponibles } from '../systems/estadoMision.js';
import { compatibilidadInstrumento } from '../systems/recursos.js';
import { ANCHO, COLORES, texto, titulo, panel, boton, estrellas, barraFases } from '../ui/ui.js';

const NOMBRE_ALCANCE = { 1: 'una órbita terrestre', 2: 'la Luna', 3: 'Marte' };

export default class EscenaRequisitos extends Phaser.Scene {
  constructor() {
    super('Requisitos');
  }

  create() {
    estrellas(this, 60);
    barraFases(this, CONFIG.fases, 1);
    const m = misionActual();
    const d = destinoActual();
    titulo(this, 'Requisitos de la misión', `${m.nombre}: del objetivo científico salen estas exigencias para el diseño`);

    // ---- Columna izquierda: requisitos generales ----
    panel(this, 20, 95, 600, 540);
    texto(this, 35, 105, 'Lo que la misión DEBE lograr', { tam: 19, negrita: true, color: COLORES.acento });
    const orbitas = orbitasDe(m).map((o) => o.nombre).join(', ');
    const lineas = [
      `• Enviar al menos ${m.requisitos.datosMinimosGB} GB de datos científicos a la Tierra.`,
      `• Funcionar al menos ${m.requisitos.vidaMinMeses} meses (la misión dura ${m.duracionMeses}).`,
      m.aterriza
        ? `• Aterrizar en ${d.nombre} (gravedad ${d.gravedad} m/s²): necesitas un motor con empuje mayor que el peso y combustible para frenar.`
        : `• Trabajar desde una órbita de ${d.nombre}. Opciones: ${orbitas}.`,
      `• Comunicarse desde ${NOMBRE_ALCANCE[d.juego.alcanceRequerido]}: la antena debe tener ese alcance.`,
      `• Costar como máximo ${estado.presupuesto} M$ (nave + cohete).`,
      `• Estar lista en ${m.plazoMeses} meses de desarrollo.`,
      '',
      'Por cada objetivo científico:'
    ];
    for (const o of m.objetivos) {
      lineas.push(`• "${o.nombre}": alcanzar un valor científico de ${o.valorMinimo} durante la misión.`);
    }
    texto(this, 35, 140, lineas.join('\n'), { tam: 15, ancho: 570 });

    // ---- Columna derecha: instrumentos útiles y no útiles ----
    panel(this, 640, 95, 620, 540);
    texto(this, 655, 105, 'Instrumentos para el objetivo', { tam: 19, negrita: true, color: COLORES.acento });
    const instrumentos = opcionesDisponibles(CATEGORIAS.find((c) => c.id === 'instrumentos'));
    const utiles = [];
    const noUtiles = [];
    for (const inst of instrumentos) {
      const comp = compatibilidadInstrumento(m, inst.id);
      if (comp.ok) {
        const usos = m.objetivos.filter((o) => o.instrumentos[inst.id] !== undefined)
          .map((o) => `${o.nombre} ×${o.instrumentos[inst.id]}`).join(', ');
        utiles.push(`✔ ${inst.nombre}: ${usos}`);
      } else {
        noUtiles.push(`✖ ${inst.nombre}: ${comp.razon}`);
      }
    }
    texto(this, 655, 140,
      'Útiles (el número multiplica su valor científico):\n' + (utiles.join('\n') || '—') +
      '\n\nNo sirven para esta misión:\n' + (noUtiles.join('\n') || '—') +
      (m.objetivos.length > 1 ? '\n\nConsejo: un instrumento que sirve para varios objetivos aporta valor a cada uno.' : ''),
      { tam: 14, ancho: 590 });

    boton(this, 110, 680, 180, 44, '◀ Concepto', () => this.scene.start('Mision'), { tam: 16 });
    boton(this, ANCHO - 190, 680, 320, 50, 'Estudio de compensaciones ▶', () => this.scene.start('Diseno'), { tam: 18 });
  }
}
