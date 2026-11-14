// =============================================================
// ESCENA 1 — MISIÓN: elegir destino (Luna o Marte) y misión.
// Guarda en el estado: destinoId, misionId y presupuesto.
// =============================================================
import * as Phaser from 'phaser';
import { DESTINOS, MISIONES, buscarPieza } from '../systems/datos.js';
import { estado, reiniciarEstado, registrar } from '../systems/estadoMision.js';
import { cargarRecords } from '../systems/puntaje.js';
import { ANCHO, COLORES, texto, titulo, panel, boton, estrellas } from '../ui/ui.js';

export default class EscenaMision extends Phaser.Scene {
  constructor() {
    super('Mision');
  }

  create() {
    reiniciarEstado(); // cada partida empieza aquí con el estado limpio
    estrellas(this);
    titulo(this, 'Diseña tu misión espacial', 'Paso 1 de 7 — Elige un destino y una misión científica');

    // ---- Columna izquierda: destinos ----
    texto(this, 40, 100, 'Destino', { tam: 22, negrita: true });
    this.botonesDestino = DESTINOS.map((d, i) =>
      boton(this, 140 + i * 210, 160, 190, 60, d.nombre, () => this.elegirDestino(d.id), { tam: 24 })
    );
    panel(this, 40, 205, 410, 300);
    this.infoDestino = texto(this, 55, 218, 'Elige un destino para ver sus datos.', {
      tam: 15, ancho: 380, color: COLORES.textoSuave
    });

    // ---- Columna derecha: misiones del destino ----
    texto(this, 480, 100, 'Misión', { tam: 22, negrita: true });
    this.botonesMision = [];
    this.infoMision = null;

    // ---- Botón continuar ----
    this.botonContinuar = boton(this, ANCHO - 160, 660, 260, 54, 'Ir al taller ▶', () => this.continuar(), { tam: 22 });
    this.botonContinuar.setHabilitado(false);

    // ---- Récords guardados ----
    const records = cargarRecords();
    const textoRecords = records.length
      ? 'Récords: ' + records.slice(0, 3).map((r, i) => `${i + 1}) ${r.puntaje} pts — ${r.mision}`).join('   ')
      : 'Todavía no hay récords en esta computadora.';
    texto(this, 40, 650, textoRecords, { tam: 15, color: COLORES.aviso, ancho: 860 });
  }

  elegirDestino(id) {
    estado.destinoId = id;
    estado.misionId = null;
    this.botonContinuar.setHabilitado(false);
    DESTINOS.forEach((d, i) => this.botonesDestino[i].setSeleccionado(d.id === id));

    const d = DESTINOS.find((x) => x.id === id);
    this.infoDestino.setColor(COLORES.texto);
    this.infoDestino.setText(
      `${d.nombre}\n\n` +
      `Gravedad: ${d.gravedad} m/s² (Tierra: 9,81)\n` +
      `Atmósfera: ${d.atmosfera.descripcion}\n` +
      `Temperatura: de ${d.temperatura.minC} °C a ${d.temperatura.maxC} °C\n` +
      `Distancia: ${d.distanciaTexto}\n` +
      `Luz solar para los paneles: ${Math.round(d.juego.factorSolar * 100)}% de la terrestre\n\n` +
      `Fuente: ${d.fuente}`
    );
    this.mostrarMisiones();
  }

  mostrarMisiones() {
    // Borramos los botones de misión anteriores
    this.botonesMision.forEach((b) => b.destruir());
    if (this.infoMision) this.infoMision.destroy();

    const lista = MISIONES.filter((m) => m.destino === estado.destinoId);
    this.botonesMision = lista.map((m, i) =>
      boton(this, 480 + 190, 160 + i * 75, 380, 62,
        `${m.nombre}\nPresupuesto: ${m.presupuesto} M$`,
        () => this.elegirMision(m.id), { tam: 17 })
    );
    this.infoMision = texto(this, 880, 130, 'Elige una misión.', { tam: 16, ancho: 360, color: COLORES.textoSuave });
  }

  elegirMision(id) {
    const m = MISIONES.find((x) => x.id === id);
    estado.misionId = id;
    estado.presupuesto = m.presupuesto;
    const lista = MISIONES.filter((x) => x.destino === estado.destinoId);
    lista.forEach((x, i) => this.botonesMision[i].setSeleccionado(x.id === id));

    const inst = buscarPieza(m.instrumentoRequerido);
    this.infoMision.setColor(COLORES.texto);
    this.infoMision.setText(
      `${m.nombre}\n\n` +
      `Objetivo: ${m.objetivo}\n\n` +
      `Instrumento requerido: ${inst.nombre}\n` +
      `Meta: que lleguen ${m.datosObjetivo} datos del ${inst.nombre.toLowerCase()} a la Tierra.\n\n` +
      `Presupuesto total: ${m.presupuesto} M$ (piezas + cohete).\n` +
      (m.notaSolar ? `\nAtención: ${m.notaSolar}\n` : '') +
      `\n${m.inspiradoEn}`
    );
    this.botonContinuar.setHabilitado(true);
  }

  continuar() {
    registrar('mision', `Misión elegida: ${estado.misionId} (${estado.destinoId}).`);
    this.scene.start('Taller');
  }
}
