// =============================================================
// INICIO: elegir modo (1 jugador o equipo de 2 a 4) y nivel (1, 2 o 3).
// =============================================================
import * as Phaser from 'phaser';
import { CONFIG, ROLES } from '../systems/datos.js';
import { nuevaPartida } from '../systems/estadoMision.js';
import { asignarRoles } from '../systems/roles.js';
import { cargarRecords } from '../systems/almacenamiento.js';
import { ANCHO, COLORES, texto, panel, boton, estrellas } from '../ui/ui.js';

export default class EscenaInicio extends Phaser.Scene {
  constructor() {
    super('Inicio');
  }

  create() {
    estrellas(this, 150);
    this.modo = { modo: 'individual', numJugadores: 1 };
    this.nivelId = '1';

    texto(this, ANCHO / 2, 30, 'MISIÓN ESPACIAL', { tam: 46, negrita: true, origen: [0.5, 0], color: COLORES.acento });
    texto(this, ANCHO / 2, 88,
      'Lleva una misión desde la idea hasta la operación, como en la NASA: concepto, requisitos, compensaciones, diseño, lanzamiento y operación.',
      { tam: 17, origen: [0.5, 0], color: COLORES.textoSuave, ancho: 1100, align: 'center' });

    // ---- Modo de juego ----
    texto(this, 60, 150, 'Modo de juego', { tam: 22, negrita: true });
    const opcionesModo = [
      { etiqueta: '1 jugador', modo: 'individual', numJugadores: 1 },
      { etiqueta: 'Equipo de 2', modo: 'equipo', numJugadores: 2 },
      { etiqueta: 'Equipo de 3', modo: 'equipo', numJugadores: 3 },
      { etiqueta: 'Equipo de 4', modo: 'equipo', numJugadores: 4 }
    ];
    this.botonesModo = opcionesModo.map((o, i) =>
      boton(this, 140 + i * 175, 205, 160, 50, o.etiqueta, () => this.elegirModo(o, i), { tam: 18 })
    );
    panel(this, 60, 245, 690, 215);
    this.textoModo = texto(this, 75, 255, '', { tam: 15, ancho: 660 });

    // ---- Nivel ----
    texto(this, 790, 150, 'Nivel', { tam: 22, negrita: true });
    const ids = Object.keys(CONFIG.niveles);
    this.botonesNivel = ids.map((id, i) =>
      boton(this, 860 + i * 145, 205, 135, 50, `Nivel ${id}`, () => this.elegirNivel(id), { tam: 18 })
    );
    panel(this, 790, 245, 430, 215);
    this.textoNivel = texto(this, 805, 255, '', { tam: 15, ancho: 400 });

    // ---- Récords ----
    const records = cargarRecords();
    texto(this, 60, 480, 'Récords en esta computadora', { tam: 18, negrita: true, color: COLORES.aviso });
    texto(this, 60, 510,
      records.length
        ? records.slice(0, 5).map((r, i) => `${i + 1}) ${r.puntaje} pts · ${r.mision} · ${r.modo} · ${r.nivel} · ${r.fecha}`).join('\n')
        : 'Todavía no hay récords. ¡Sé el primero!',
      { tam: 15, color: COLORES.textoSuave });

    texto(this, 60, 660, 'Proyecto educativo para el NASA Space Apps Challenge. No está respaldado por la NASA.', {
      tam: 12, color: COLORES.textoSuave
    });
    boton(this, ANCHO - 170, 640, 280, 60, 'Comenzar ▶', () => this.comenzar(), { tam: 24 });

    this.elegirModo(opcionesModo[0], 0);
    this.elegirNivel('1');
  }

  elegirModo(o, indice) {
    this.modo = o;
    this.botonesModo.forEach((b, i) => b.setSeleccionado(i === indice));
    if (o.modo === 'individual') {
      this.textoModo.setText(
        'Juegas tú solo y decides todo el diseño.\n\n' +
        'Verás las metas de los 4 segmentos de una misión (lanzamiento, espacial, terrestre y usuario) como consejos: ' +
        'muchas veces chocan entre sí y tendrás que buscar un equilibrio.'
      );
    } else {
      const reparto = asignarRoles(ROLES, o.numJugadores)
        .map((j) => `Jugador ${j.jugador}: ${j.roles.map((id) => ROLES.find((r) => r.id === id).nombre).join(' + ')}`)
        .join('\n');
      this.textoModo.setText(
        `Juegan ${o.numJugadores} personas en esta computadora, por turnos. Cada uno maneja un segmento de la misión ` +
        'y solo cambia su parte. El presupuesto es compartido: ¡negocien! Antes de lanzar, todos deben aprobar el diseño.\n\n' + reparto
      );
    }
  }

  elegirNivel(id) {
    this.nivelId = id;
    const ids = Object.keys(CONFIG.niveles);
    this.botonesNivel.forEach((b, i) => b.setSeleccionado(ids[i] === id));
    this.textoNivel.setText(`${CONFIG.niveles[id].nombre}\n\n${CONFIG.niveles[id].descripcion}`);
  }

  comenzar() {
    nuevaPartida({ modo: this.modo.modo, numJugadores: this.modo.numJugadores, nivelId: this.nivelId });
    this.scene.start('Mision');
  }
}
