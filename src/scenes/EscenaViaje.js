// =============================================================
// ESCENA 4 — VIAJE: consumo de la ruta y 2 o 3 eventos al azar.
// Las piezas elegidas deciden si cada evento causa daño (ver systems/eventos.js).
// =============================================================
import * as Phaser from 'phaser';
import { estado, destinoActual } from '../systems/estadoMision.js';
import { aplicarConsumoRuta, generarEventosViaje, resolverEvento, rutaActual } from '../systems/eventos.js';
import { ANCHO, ALTO, COLORES, texto, titulo, panel, boton, estrellas } from '../ui/ui.js';

const X_TIERRA = 120;
const X_DESTINO = ANCHO - 120;
const Y_RUTA = 260;

export default class EscenaViaje extends Phaser.Scene {
  constructor() {
    super('Viaje');
  }

  create() {
    estrellas(this);
    const destino = destinoActual();
    const ruta = rutaActual();
    titulo(this, `Viaje a ${destino.nombre}`, `Paso 4 de 7 — ${ruta.nombre} · ${ruta.dias} días`);

    // Dibujo: Tierra, destino y línea de la ruta
    this.add.circle(X_TIERRA, Y_RUTA, 50, 0x2f6fd6);
    texto(this, X_TIERRA, Y_RUTA + 60, 'Tierra', { tam: 16, origen: [0.5, 0] });
    const colorDestino = parseInt(destino.color.replace('#', ''), 16); // "#d2693c" → 0xd2693c
    this.add.circle(X_DESTINO, Y_RUTA, destino.id === 'luna' ? 30 : 40, colorDestino);
    texto(this, X_DESTINO, Y_RUTA + 60, destino.nombre, { tam: 16, origen: [0.5, 0] });
    for (let x = X_TIERRA + 60; x < X_DESTINO - 50; x += 20) {
      this.add.rectangle(x, Y_RUTA, 8, 2, 0x7cc4ff, 0.6);
    }
    this.nave = this.add.triangle(X_TIERRA + 70, Y_RUTA, 0, 0, 0, 20, 30, 10, 0xffffff);

    // Consumo de combustible de la ruta (se aplica una sola vez)
    const c = aplicarConsumoRuta();
    let textoComb = `La ruta gastó ${c.gastado} kg de combustible. Quedan ${c.quedan} kg para aterrizar.`;
    if (c.necesario > c.antes) textoComb += `  ¡Faltaron ${c.necesario - c.antes} kg! Llegarás sin combustible.`;
    this.textoEstado = texto(this, ANCHO / 2, 340, textoComb, {
      tam: 17, origen: [0.5, 0], ancho: 1000, align: 'center',
      color: c.necesario > c.antes ? COLORES.mal : COLORES.texto
    });

    // Lista de eventos y avance paso a paso
    this.eventos = generarEventosViaje();
    this.indice = 0;
    this.time.delayedCall(900, () => this.siguienteEvento());
  }

  /** Mueve la nave y muestra el próximo evento (o el final del viaje). */
  siguienteEvento() {
    const total = this.eventos.length + 1;
    const fraccion = (this.indice + 1) / total;
    const xObjetivo = X_TIERRA + 70 + (X_DESTINO - X_TIERRA - 160) * fraccion;

    this.tweens.add({
      targets: this.nave,
      x: xObjetivo,
      duration: 1100,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.indice < this.eventos.length) {
          const resultado = resolverEvento(this.eventos[this.indice]);
          this.indice++;
          this.mostrarEvento(resultado);
        } else {
          this.finDelViaje();
        }
      }
    });
  }

  /** Ventana con el evento y su resultado. */
  mostrarEvento(r) {
    const elementos = [];
    const evento = this.eventos[this.indice - 1];
    elementos.push(panel(this, 240, 390, 800, 270, r.mitigado ? 0x15361f : 0x3a1620));
    elementos.push(texto(this, 260, 402, `Evento ${this.indice} de ${this.eventos.length}: ${r.nombre}`, { tam: 22, negrita: true }));
    elementos.push(texto(this, 260, 440, evento.descripcion, { tam: 16, ancho: 760 }));
    const titular = r.mitigado ? '✔ Sin daños: ' : (r.mitigadoPor ? '✖ Daño: ' : '• ');
    elementos.push(texto(this, 260, 490, titular + r.texto, {
      tam: 17, ancho: 760, negrita: true, color: r.mitigado ? COLORES.bien : COLORES.mal
    }));
    elementos.push(texto(this, 260, 550, r.explicacion, { tam: 14, ancho: 760, color: COLORES.textoSuave }));

    const b = boton(this, 640, 625, 200, 42, 'Continuar', () => {
      elementos.forEach((e) => e.destroy());
      b.destruir();
      this.actualizarEstado();
      this.siguienteEvento();
    }, { tam: 18 });
  }

  actualizarEstado() {
    const r = estado.recursos;
    const danados = r.instrumentosDanados.length ? ` · Instrumentos dañados: ${r.instrumentosDanados.length}` : '';
    this.textoEstado.setColor(COLORES.texto);
    this.textoEstado.setText(
      `Combustible: ${r.combustible} kg · Paneles: ${Math.round(r.factorPaneles * 100)}% · ` +
      `Antena: ${Math.round(r.factorAntena * 100)}%${danados}`
    );
  }

  finDelViaje() {
    const destino = destinoActual();
    this.actualizarEstado();
    panel(this, 340, 420, 600, 185);
    texto(this, 640, 440, `¡Llegaste a ${destino.nombre}!`, { tam: 26, negrita: true, origen: [0.5, 0], color: COLORES.bien });
    texto(this, 640, 485,
      `Combustible para el descenso: ${estado.recursos.combustible} kg.\n` +
      'Usa ↑ o ESPACIO para encender el motor y ← → para girar.',
      { tam: 16, origen: [0.5, 0], align: 'center', ancho: 560 });
    boton(this, 640, ALTO - 148, 260, 46, 'Iniciar descenso ▼', () => this.scene.start('Aterrizaje'), { tam: 20 });
  }
}
