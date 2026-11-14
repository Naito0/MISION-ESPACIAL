// =============================================================
// FASE 5 — TRAVESÍA: el viaje avanza por días y ocurren averías.
// Si el diseño ya protege contra la avería, no pasa nada. Si no, el
// equipo juega un minijuego de reparación contra reloj (cables, soldadura
// o antena). Si falla, se pierde combustible, energía, señal o días.
// En misiones tripuladas, el reloj es el oxígeno de la cabina.
// =============================================================
import * as Phaser from 'phaser';
import { CONFIG, AVERIAS_VIAJE } from '../systems/datos.js';
import {
  estado, analizarDiseno, misionActual, destinoActual, orbitaActual, nivel, liderReparaciones
} from '../systems/estadoMision.js';
import { sortearAverias, estaMitigada, viajeIntacto, registrarAveria } from '../systems/averias.js';
import { calcularInsercion } from '../systems/lanzamiento.js';
import { iniciarMinijuego } from '../minijuegos/index.js';
import { ANCHO, COLORES, texto, titulo, panel, barra, ventana, estrellas, barraFases } from '../ui/ui.js';

const X_TIERRA = 130;
const X_DESTINO = ANCHO - 130;
const Y_RUTA = 250;

export default class EscenaViaje extends Phaser.Scene {
  constructor() {
    super('Viaje');
  }

  create() {
    estrellas(this, 120);
    barraFases(this, CONFIG.fases, 4);
    const mision = misionActual();
    const destino = destinoActual();
    this.diasViaje = destino.juego.diasViaje;
    titulo(this, `Travesía hacia ${mision.destino === 'tierra' ? 'la órbita' : destino.nombre}`,
      `${this.diasViaje} día(s) de viaje · las averías se reparan con minijuegos contra reloj`);

    // Dibujo: Tierra, destino y ruta
    this.add.circle(X_TIERRA, Y_RUTA, 55, 0x2f6fd6);
    texto(this, X_TIERRA, Y_RUTA + 65, 'Tierra', { tam: 15, origen: [0.5, 0] });
    const colorDestino = mision.destino === 'tierra' ? 0x7cc4ff : parseInt(destino.color.replace('#', ''), 16);
    this.add.circle(X_DESTINO, Y_RUTA, mision.destino === 'tierra' ? 14 : 40, colorDestino);
    texto(this, X_DESTINO, Y_RUTA + 65, mision.destino === 'tierra' ? orbitaActual().nombre : destino.nombre, { tam: 15, origen: [0.5, 0] });
    for (let x = X_TIERRA + 70; x < X_DESTINO - 50; x += 22) this.add.rectangle(x, Y_RUTA, 9, 2, 0x7cc4ff, 0.6);
    this.nave = this.add.triangle(X_TIERRA + 75, Y_RUTA, 0, 0, 0, 22, 34, 11, 0xffffff);

    // Panel de estado
    panel(this, 240, 360, 800, 230);
    this.textoDia = texto(this, 260, 372, '', { tam: 22, negrita: true, color: COLORES.acento });
    this.textoEstado = texto(this, 260, 410, '', { tam: 15, ancho: 760 });
    this.tripulada = !!mision.tripulada;
    if (this.tripulada) {
      texto(this, 260, 530, 'Soporte vital (oxígeno y comida)', { tam: 13 });
      this.barraSoporte = barra(this, 260, 552, 760, 14);
    }

    // Preparación
    estado.viaje = viajeIntacto();
    this.analisis = analizarDiseno();
    this.averias = sortearAverias(AVERIAS_VIAJE, destino.juego.averiasViaje, this.tripulada);
    this.indice = 0;
    this.dia = 0;
    this.minijuego = null; // el minijuego activo (las pruebas pueden terminarlo con .terminar())
    this.actualizarEstado();

    this.time.delayedCall(700, () => this.siguienteTramo());
  }

  /** Avanza la nave hasta la próxima avería (o hasta el destino). */
  siguienteTramo() {
    const total = this.averias.length + 1;
    const fraccion = (this.indice + 1) / total;
    const diaObjetivo = Math.max(1, Math.round(this.diasViaje * fraccion));
    const diaInicial = this.dia;
    this.tweens.add({
      targets: this.nave,
      x: X_TIERRA + 75 + (X_DESTINO - X_TIERRA - 170) * fraccion,
      duration: 1200,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        this.dia = Math.round(diaInicial + (diaObjetivo - diaInicial) * tween.progress);
        this.actualizarEstado();
      },
      onComplete: () => {
        this.dia = diaObjetivo;
        if (this.indice < this.averias.length) this.averia(this.averias[this.indice++]);
        else this.llegada();
      }
    });
  }

  averia(a) {
    if (estaMitigada(a, this.analisis.diseno.efectos)) {
      estado.viaje = registrarAveria(estado.viaje, a, 'mitigada');
      ventana(this, {
        tituloTexto: `Día ${this.dia} · ${a.nombre}`,
        cuerpo: `${a.descripcion}\n\n✔ ${a.textoMitigado}\n\n${a.explicacion}`,
        colorFondo: 0x15361f, colorTitulo: COLORES.bien,
        alCerrar: () => this.siguienteTramo()
      });
      return;
    }
    const segundos = nivel().segundosMinijuego;
    const lider = liderReparaciones();
    ventana(this, {
      tituloTexto: `¡Avería! Día ${this.dia} · ${a.nombre}`,
      cuerpo: `${a.descripcion}\n\n${lider ? `${lider}: tú lideras la reparación (los demás pueden ayudar).\n\n` : ''}` +
        `Tienes ${segundos} segundos para repararla. Si no lo logras, ${a.consecuencia || a.textoDanio}`,
      colorFondo: 0x3a1620, colorTitulo: COLORES.mal, textoBoton: '¡A reparar! 🔧',
      alCerrar: () => {
        this.minijuego = iniciarMinijuego(a.minijuego, this, {
          segundos,
          etiquetaTiempo: this.tripulada ? 'Oxígeno de reserva' : 'Tiempo',
          alTerminar: (exito) => this.resultadoReparacion(a, exito)
        });
      }
    });
  }

  resultadoReparacion(a, exito) {
    this.minijuego = null;
    estado.viaje = registrarAveria(estado.viaje, a, exito ? 'reparada' : 'fallida');
    this.actualizarEstado();
    ventana(this, {
      tituloTexto: exito ? '¡Reparado!' : 'No se pudo reparar a tiempo',
      cuerpo: `${exito ? a.textoReparado : a.textoDanio}\n\n${a.explicacion}`,
      colorFondo: exito ? 0x15361f : 0x3a1620, colorTitulo: exito ? COLORES.bien : COLORES.mal,
      alCerrar: () => this.siguienteTramo()
    });
  }

  actualizarEstado() {
    const v = estado.viaje;
    const d = this.analisis.diseno;
    const combustible = Math.round(d.combustible * (1 - v.perdidaCombustible) * 10) / 10;
    this.textoDia.setText(`Día ${this.dia} de ${this.diasViaje}`);
    this.textoEstado.setText(
      `Combustible: ${combustible} de ${d.combustible} kg\n` +
      `Paneles solares: ${Math.round(v.factorPaneles * 100)}% · Antena: ${Math.round(v.factorAntena * 100)}%\n` +
      `Averías: ${v.averias.length} de ${this.averias.length}` +
      (v.averias.length ? ` (${v.averias.filter((x) => x.resultado !== 'fallida').length} resueltas)` : '') +
      (v.diasExtra ? `\nDemora acumulada: ${v.diasExtra} día(s)` : '')
    );
    if (this.tripulada) {
      const m = misionActual();
      const total = d.diasPersona - v.soportePerdido;
      const usado = m.tripulantes * this.dia;
      const f = d.diasPersona > 0 ? (total - usado) / d.diasPersona : 0;
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
