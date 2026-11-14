// =============================================================
// FASE 1 — CONCEPTO: elegir el objetivo científico (la misión) del nivel.
// =============================================================
import * as Phaser from 'phaser';
import { MISIONES, CONFIG, buscarDestino } from '../systems/datos.js';
import { estado, elegirMision, nivel } from '../systems/estadoMision.js';
import { ANCHO, COLORES, texto, titulo, panel, boton, estrellas, barraFases } from '../ui/ui.js';

export default class EscenaMision extends Phaser.Scene {
  constructor() {
    super('Mision');
  }

  create() {
    estrellas(this, 100);
    barraFases(this, CONFIG.fases, 0);
    titulo(this, 'Concepto: ¿qué quieres descubrir?',
      `${nivel().nombre} · ${estado.modo === 'equipo' ? `Equipo de ${estado.numJugadores}` : '1 jugador'}`);

    this.misiones = MISIONES.filter((m) => String(m.nivel) === String(estado.nivelId));
    const ancho = Math.min(400, (ANCHO - 60) / this.misiones.length - 20);
    this.botones = this.misiones.map((m, i) => {
      const destino = buscarDestino(m.destino);
      const x = ANCHO / 2 + (i - (this.misiones.length - 1) / 2) * (ancho + 20);
      return boton(this, x, 140, ancho, 70,
        `${m.nombre}\n${m.tipoNave} · ${destino.nombre} · ${Math.round(m.presupuesto * nivel().factorPresupuesto)} M$`,
        () => this.elegir(m.id), { tam: 17 });
    });

    panel(this, 20, 190, ANCHO - 40, 440);
    this.textoMision = texto(this, 40, 205, 'Elige una misión para ver su objetivo científico.', { tam: 17, ancho: 760, color: COLORES.textoSuave });
    this.textoDestino = texto(this, 840, 205, '', { tam: 14, ancho: 400, color: COLORES.textoSuave });

    boton(this, 110, 680, 180, 44, '◀ Inicio', () => this.scene.start('Inicio'), { tam: 16 });
    this.botonContinuar = boton(this, ANCHO - 170, 680, 280, 50, 'Ver requisitos ▶', () => this.scene.start('Requisitos'), { tam: 20 });
    this.botonContinuar.setHabilitado(false);

    if (this.misiones.length === 1) this.elegir(this.misiones[0].id);
  }

  elegir(id) {
    elegirMision(id);
    const m = this.misiones.find((x) => x.id === id);
    const d = buscarDestino(m.destino);
    this.misiones.forEach((x, i) => this.botones[i].setSeleccionado(x.id === id));

    const objetivos = m.objetivos.map((o, i) => `  ${i + 1}. ${o.nombre}: ${o.descripcion}`).join('\n');
    this.textoMision.setColor(COLORES.texto);
    this.textoMision.setText(
      `${m.nombre} (${m.tipoNave})\n\n${m.resumen}\n\n` +
      `${m.objetivos.length > 1 ? 'Objetivos científicos (¡todos a la vez!)' : 'Objetivo científico'}:\n${objetivos}\n\n` +
      `Destino: ${d.nombre} · ${m.aterriza ? 'La nave debe ATERRIZAR (tendrás que pilotarla).' : 'La nave trabaja desde una órbita.'}\n` +
      `Presupuesto: ${estado.presupuesto} M$ (nave + cohete) · Plazo: ${m.plazoMeses} meses · Duración: ${m.duracionMeses} meses\n\n` +
      `${m.inspiradoEn}`
    );
    this.textoDestino.setColor(COLORES.texto);
    this.textoDestino.setText(
      `Sobre ${d.nombre}\n\n` +
      `Gravedad: ${d.gravedad} m/s² (Tierra: 9,81)\n` +
      `Radio: ${d.radioKm} km\n` +
      `Atmósfera: ${d.atmosfera.descripcion}\n` +
      `Temperatura: de ${d.temperatura.minC} °C a ${d.temperatura.maxC} °C\n` +
      `Distancia: ${d.distanciaTexto}\n` +
      `Luz solar: ${Math.round(d.juego.factorSolar * 100)}% de la que llega a la Tierra\n\n` +
      `Fuente: ${d.fuente}`
    );
    this.botonContinuar.setHabilitado(true);
  }
}
