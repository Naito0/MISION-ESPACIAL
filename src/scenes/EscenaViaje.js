// =============================================================
// FASE 5 — TRAVESÍA: la nave avanza sobre un fondo de estrellas con
// paralaje y una barra de progreso del viaje (en días).
// Averías interactivas: la pantalla tiembla o destella, el viaje se pausa y
//   - si la nave lleva la protección, aparece un ESCUDO que bloquea el evento
//     y una frase que explica por qué;
//   - si no, la pieza dañada parpadea en rojo: hay que hacer clic en ella
//     antes de que se acabe el tiempo para abrir el minijuego de reparación.
// En misiones tripuladas, el reloj del minijuego es el oxígeno de la cabina.
// =============================================================
import * as Phaser from 'phaser';
import { CONFIG, AVERIAS_VIAJE } from '../systems/datos.js';
import {
  estado, analizarDiseno, misionActual, destinoActual, orbitaActual, nivel, liderReparaciones
} from '../systems/estadoMision.js';
import { sortearAverias, estaMitigada, viajeIntacto, registrarAveria } from '../systems/averias.js';
import { calcularInsercion } from '../systems/lanzamiento.js';
import { iniciarMinijuego } from '../minijuegos/index.js';
import { crearFondoParalaje } from '../efectos/paralaje.js';
import { estallido } from '../efectos/particulas.js';
import { crearDibujoNave } from '../ui/dibujoNave.js';
import { ANCHO, ALTO, COLORES, texto, titulo, barra, ventana, barraFases } from '../ui/ui.js';

const NAVE = { x: 560, y: 340 };

export default class EscenaViaje extends Phaser.Scene {
  constructor() {
    super('Viaje');
  }

  create() {
    const mision = misionActual();
    const destino = destinoActual();
    this.diasViaje = destino.juego.diasViaje;
    this.tripulada = !!mision.tripulada;
    this.fondo = crearFondoParalaje(this);

    barraFases(this, CONFIG.fases, 4);
    titulo(this, `Travesía hacia ${mision.destino === 'tierra' ? orbitaActual().nombre : destino.nombre}`);

    // ---- Barra de progreso del viaje ----
    this.textoDia = texto(this, ANCHO / 2, 76, '', { tam: 14, origen: [0.5, 0], color: COLORES.textoSuave });
    this.barraViaje = barra(this, ANCHO / 2 - 350, 98, 700, 10);
    this.marcasAverias = [];

    // ---- Planetas: la Tierra se aleja, el destino se acerca ----
    this.tierra = this.add.circle(150, NAVE.y, 80, 0x2f6fd6);
    const colorDestino = mision.destino === 'tierra' ? 0x7cc4ff : parseInt(destino.color.replace('#', ''), 16);
    this.destino = this.add.circle(ANCHO + 150, NAVE.y, mision.destino === 'tierra' ? 30 : 90, colorDestino);

    // ---- La nave (el mismo dibujo del diseño) ----
    this.analisis = analizarDiseno();
    this.nave = crearDibujoNave(this, NAVE.x, NAVE.y);
    this.nave.actualizar(this.analisis.diseno);
    this.nave.contenedor.setScale(this.nave.contenedor.scale * 0.85);
    this.tweens.add({ targets: this.nave.contenedor, y: NAVE.y - 8, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ---- Estado (una línea) y soporte vital ----
    this.textoEstado = texto(this, ANCHO / 2, 600, '', { tam: 15, origen: [0.5, 0] });
    if (this.tripulada) {
      texto(this, ANCHO / 2 - 300, 632, '🧑‍🚀 Soporte vital', { tam: 13 });
      this.barraSoporte = barra(this, ANCHO / 2 - 160, 636, 460, 10);
    }
    this.mensaje = texto(this, ANCHO / 2, 470, '', { tam: 18, negrita: true, origen: [0.5, 0], align: 'center', ancho: 900 });

    // ---- Preparación del viaje ----
    estado.viaje = viajeIntacto();
    this.averias = sortearAverias(AVERIAS_VIAJE, destino.juego.averiasViaje, this.tripulada);
    this.paradas = this.averias.map((_, i) => (i + 1) / (this.averias.length + 1));
    this.paradas.forEach((f) => {
      this.marcasAverias.push(this.add.circle(ANCHO / 2 - 350 + 700 * f, 103, 6, 0x666c80).setStrokeStyle(1, 0xffffff));
    });
    this.progreso = 0;
    this.indice = 0;
    this.pausado = false;
    this.llego = false;
    this.minijuego = null; // minijuego activo (las pruebas pueden terminarlo con .terminar())
    this.reaccion = null;  // avería esperando que el jugador haga clic en la pieza
    this.duracionTotal = CONFIG.viaje.msPorTramo * (this.averias.length + 1);
    this.actualizarEstado();
  }

  update(_t, delta) {
    this.fondo.actualizar(delta, this.pausado ? 0.05 : 1);
    if (this.pausado || this.llego) return;

    this.progreso = Math.min(1, this.progreso + delta / this.duracionTotal);
    if (this.indice < this.averias.length && this.progreso >= this.paradas[this.indice]) {
      this.progreso = this.paradas[this.indice];
      this.averia(this.averias[this.indice++]);
    } else if (this.progreso >= 1) {
      this.llego = true;
      this.llegada();
    }
    this.actualizarEstado();
  }

  // ---------------- Averías ----------------

  averia(a) {
    this.pausado = true;
    this.efectoDeAveria(a);
    if (estaMitigada(a, this.analisis.diseno.efectos)) {
      this.escudo(a);
      return;
    }
    this.pedirReaccion(a);
  }

  /** La pantalla tiembla o destella según el tipo de evento. */
  efectoDeAveria(a) {
    const cam = this.cameras.main;
    if (a.efecto === 'impacto') {
      // Piedritas que llegan desde la derecha y golpean la nave
      for (let i = 0; i < 6; i++) {
        const roca = this.add.circle(ANCHO + 20, NAVE.y + Phaser.Math.Between(-60, 60), Phaser.Math.Between(2, 4), 0xb0a090);
        this.tweens.add({
          targets: roca, x: NAVE.x + 20, duration: 350 + i * 40,
          onComplete: () => { estallido(this, roca.x, roca.y, { cantidad: 5, velocidad: 30, colores: [0xffd166, 0xffffff] }); roca.destroy(); }
        });
      }
      this.time.delayedCall(380, () => cam.shake(400, 0.015));
    } else if (a.efecto === 'tormenta') {
      cam.flash(500, 255, 220, 120);
      cam.shake(500, 0.006);
    } else {
      cam.flash(250, 255, 80, 80);
      cam.shake(300, 0.008);
    }
  }

  /** Si la nave tiene la protección: aparece un escudo y una frase que explica por qué. */
  escudo(a) {
    const radio = Math.max(this.nave.ancho, this.nave.alto) * this.nave.contenedor.scale + 50;
    const burbuja = this.add.circle(this.nave.contenedor.x, this.nave.contenedor.y, radio, 0x7cf3ff, 0.12).setStrokeStyle(4, 0x7cf3ff);
    burbuja.setScale(0.5);
    this.tweens.add({ targets: burbuja, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: burbuja, alpha: 0, delay: 2400, duration: 500, onComplete: () => burbuja.destroy() });
    this.mensaje.setColor(COLORES.bien).setText(`🛡️ ${a.nombre}: bloqueado.\n${a.textoMitigado}`);
    estado.viaje = registrarAveria(estado.viaje, a, 'mitigada');
    this.marcasAverias[this.indice - 1].setFillStyle(0x3cc46e);
    this.time.delayedCall(2900, () => { this.mensaje.setText(''); this.pausado = false; });
  }

  /** La pieza dañada parpadea: hay que hacer clic en ella antes de que se acabe el tiempo. */
  pedirReaccion(a) {
    const partes = this.nave.partes;
    let piezas = partes[a.pieza] || partes.casco;
    if (!Array.isArray(piezas)) piezas = [piezas];
    if (!piezas.length) piezas = [partes.casco];

    // Anillos rojos sobre la pieza dañada (también se puede hacer clic en ellos)
    const anillos = piezas.map((p) => {
      const pos = this.nave.posicionDe(p);
      const anillo = this.add.circle(pos.x, pos.y, 30, 0xff3b3b, 0.15).setStrokeStyle(3, 0xff5a5a);
      this.tweens.add({ targets: anillo, scale: 1.35, alpha: 0.5, duration: 450, yoyo: true, repeat: -1 });
      return anillo;
    });
    const segundos = CONFIG.viaje.segundosReaccion;
    let restante = segundos;
    const lider = liderReparaciones();
    const textoBase = `⚠ ${a.nombre}\n${lider ? `${lider}: ` : ''}¡Haz clic en la pieza dañada para repararla!`;
    this.mensaje.setColor(COLORES.mal).setText(`${textoBase} (${restante} s)`);

    const limpiar = () => {
      reloj.remove();
      anillos.forEach((an) => an.destroy());
      piezas.forEach((p) => p.removeAllListeners('pointerdown'));
      this.mensaje.setText('');
      this.reaccion = null;
    };
    const reparar = () => {
      if (!this.reaccion) return;
      limpiar();
      this.minijuego = iniciarMinijuego(a.minijuego, this, {
        segundos: nivel().segundosMinijuego,
        etiquetaTiempo: this.tripulada ? 'Oxígeno de reserva' : 'Tiempo',
        alTerminar: (exito) => this.resultadoReparacion(a, exito)
      });
    };
    const reloj = this.time.addEvent({
      delay: 1000, repeat: segundos - 1,
      callback: () => {
        restante -= 1;
        this.mensaje.setText(`${textoBase} (${restante} s)`);
        if (restante <= 0 && this.reaccion) {
          limpiar();
          this.resultadoReparacion(a, false, true);
        }
      }
    });
    [...anillos, ...piezas].forEach((obj) => {
      obj.setInteractive({ useHandCursor: true });
      obj.on('pointerdown', reparar);
    });
    this.reaccion = { averia: a, reparar };
  }

  resultadoReparacion(a, exito, sinReaccion = false) {
    this.minijuego = null;
    estado.viaje = registrarAveria(estado.viaje, a, exito ? 'reparada' : 'fallida');
    this.marcasAverias[this.indice - 1].setFillStyle(exito ? 0x3cc46e : 0xe5484d);
    this.actualizarEstado();
    ventana(this, {
      tituloTexto: exito ? '¡Reparado!' : sinReaccion ? '¡No llegaste a tiempo!' : 'No se pudo reparar a tiempo',
      cuerpo: `${exito ? a.textoReparado : a.textoDanio}\n\n${a.explicacion}`,
      colorFondo: exito ? 0x15361f : 0x3a1620, colorTitulo: exito ? COLORES.bien : COLORES.mal,
      alCerrar: () => { this.pausado = false; }
    });
  }

  // ---------------- Estado y llegada ----------------

  actualizarEstado() {
    const v = estado.viaje;
    const d = this.analisis.diseno;
    const dia = Math.round(this.diasViaje * this.progreso);
    this.textoDia.setText(`Día ${dia} de ${this.diasViaje}`);
    this.barraViaje.actualizar(this.progreso, 'verde');

    // La Tierra se aleja hacia la izquierda; el destino aparece por la derecha al final
    this.tierra.x = 150 - this.progreso * 500;
    this.destino.x = ANCHO + 150 - Math.max(0, (this.progreso - 0.6) / 0.4) * 320;

    const combustible = Math.round(d.combustible * (1 - v.perdidaCombustible) * 10) / 10;
    this.textoEstado.setText(
      `⛽ ${combustible} kg   ☀️ paneles ${Math.round(v.factorPaneles * 100)}%   📡 antena ${Math.round(v.factorAntena * 100)}%` +
      (v.diasExtra ? `   ⏱️ +${v.diasExtra} día(s)` : '')
    );
    if (this.tripulada) {
      const m = misionActual();
      const total = d.diasPersona - v.soportePerdido;
      const f = d.diasPersona > 0 ? (total - m.tripulantes * dia) / d.diasPersona : 0;
      this.barraSoporte.actualizar(f, f > 0.5 ? 'verde' : f > 0.25 ? 'amarillo' : 'rojo');
    }
  }

  /** Fin del viaje: recalcula el combustible para entrar en órbita y sigue. */
  llegada() {
    const a = this.analisis;
    const v = estado.viaje;
    const combustible = a.diseno.combustible * (1 - v.perdidaCombustible);
    const masa = a.diseno.masaSeca + combustible;
    estado.lanzamiento.insercion = calcularInsercion(masa, combustible, a.orbita);
    const ins = estado.lanzamiento.insercion;
    const mision = misionActual();
    ventana(this, {
      tituloTexto: ins.ok ? `¡Llegada a ${a.orbita.nombre}!` : 'Llegada con problemas',
      cuerpo: `Averías resueltas: ${v.averias.filter((x) => x.resultado !== 'fallida').length} de ${v.averias.length}.\n` +
        (ins.necesario > 0 ? `Para entrar en la órbita hacían falta ${ins.necesario} kg de combustible y había ${Math.round(combustible * 10) / 10} kg.\n` : '') +
        (ins.ok ? (mision.aterriza ? `Quedan ${Math.round(ins.quedan)} kg de combustible para el descenso.` : 'La nave entró en su órbita y empieza a trabajar.')
          : '⚠ No alcanzó el combustible para entrar en la órbita.'),
      colorFondo: ins.ok ? 0x15361f : 0x3a1620, colorTitulo: ins.ok ? COLORES.bien : COLORES.mal,
      textoBoton: mision.aterriza ? 'Iniciar descenso ▼' : 'Comenzar operación ▶',
      alCerrar: () => this.scene.start(mision.aterriza ? 'Aterrizaje' : 'Simulacion')
    });
  }
}
