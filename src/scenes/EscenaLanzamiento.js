// =============================================================
// FASE 5 — LANZAMIENTO: animación en vista lateral (unos 7 segundos).
//   1) cuenta regresiva  2) encendido y despegue con fuego y humo
//   3) separación de etapas  4) giro y llegada a la órbita
// Todo con formas, tweens y "partículas" hechas con círculos.
// Hay un botón para saltarla. Después: la travesía (EscenaViaje).
// =============================================================
import * as Phaser from 'phaser';
import { CONFIG } from '../systems/datos.js';
import { estado, coheteActual, orbitaActual } from '../systems/estadoMision.js';
import { estallido, fuegoDeMotor } from '../efectos/particulas.js';
import { ANCHO, ALTO, COLORES, texto, boton, barraFases } from '../ui/ui.js';

const X0 = ANCHO / 2;
const Y_ETAPA1 = 560; // centro de la primera etapa en la plataforma

export default class EscenaLanzamiento extends Phaser.Scene {
  constructor() {
    super('Lanzamiento');
  }

  create() {
    this.terminado = false;

    // ---- Fondo: espacio negro con estrellas, tapado por el cielo azul ----
    this.estrellas = this.add.container(0, 0).setAlpha(0);
    for (let i = 0; i < 150; i++) {
      this.estrellas.add(this.add.circle(Math.random() * ANCHO, Math.random() * ALTO, Math.random() < 0.85 ? 1 : 2, 0xffffff, 0.4 + Math.random() * 0.6));
    }
    this.cielo = this.add.rectangle(0, 0, ANCHO, ALTO, 0x2a5fa8).setOrigin(0, 0);
    this.horizonte = this.add.rectangle(0, ALTO - 260, ANCHO, 200, 0x6fa3d8, 0.6).setOrigin(0, 0);

    // ---- Curva de la Tierra (aparece al llegar al espacio) ----
    this.tierra = this.add.circle(X0, ALTO + 1500, 1450, 0x2f6fd6).setStrokeStyle(10, 0x7cc4ff, 0.5).setAlpha(0);

    // ---- Suelo y torre ----
    this.suelo = this.add.container(0, 0);
    this.suelo.add(this.add.rectangle(0, ALTO - 80, ANCHO, 80, 0x3d4a3a).setOrigin(0, 0));
    this.suelo.add(this.add.rectangle(X0 + 70, ALTO - 260, 14, 360, 0x555b6e));
    for (let i = 0; i < 6; i++) this.suelo.add(this.add.rectangle(X0 + 50, ALTO - 400 + i * 50, 40, 4, 0x555b6e));

    // ---- Cohete de dos etapas ----
    this.etapa1 = this.add.container(X0, Y_ETAPA1);
    this.etapa1.add(this.add.rectangle(0, 0, 38, 140, 0xe8ecff).setStrokeStyle(2, 0x9aa6c8));
    this.etapa1.add(this.add.rectangle(0, -20, 38, 10, 0x2b5cab));
    this.etapa1.add(this.add.triangle(-24, 58, 0, 24, 14, 0, 14, 24, 0x9aa6c8));
    this.etapa1.add(this.add.triangle(24, 58, 0, 0, 0, 24, 14, 24, 0x9aa6c8));
    this.etapa1.add(this.add.rectangle(0, 76, 22, 12, 0x6c7385));

    this.etapa2 = this.add.container(X0, Y_ETAPA1 - 102);
    this.etapa2.add(this.add.rectangle(0, 0, 32, 64, 0xe8ecff).setStrokeStyle(2, 0x9aa6c8));
    this.etapa2.add(this.add.triangle(0, -50, 0, 36, 32, 36, 16, 0, 0xff6b6b));
    this.etapa2.add(this.add.rectangle(0, 36, 16, 8, 0x6c7385));

    // ---- Textos y botón para saltar (por encima de todo) ----
    barraFases(this, CONFIG.fases, 4);
    this.titulo = texto(this, X0, 50, `${coheteActual().nombre} → ${orbitaActual().nombre}`, {
      tam: 18, negrita: true, origen: [0.5, 0], color: '#ffffff'
    });
    this.mensaje = texto(this, X0, 200, '3', { tam: 72, negrita: true, origen: [0.5, 0.5], color: COLORES.aviso });
    this.etiqueta = texto(this, 40, ALTO - 50, `Masa de la nave: ${estado.lanzamiento.masaTotal} kg`, { tam: 15, color: '#ffffff' });
    boton(this, ANCHO - 90, 70, 150, 36, 'Saltar ⏭', () => this.terminar(), { tam: 15 });

    // ---- Línea de tiempo de la animación ----
    this.time.delayedCall(500, () => this.mensaje.setText('2'));
    this.time.delayedCall(1000, () => this.mensaje.setText('1'));
    this.time.delayedCall(1500, () => this.despegar());
    this.time.delayedCall(4000, () => this.separarEtapas());
    this.time.delayedCall(6300, () => this.llegarAOrbita());
    this.time.delayedCall(7600, () => this.terminar());
  }

  /** Punto de la tobera de una etapa (para que el fuego salga del lugar correcto). */
  tobera(etapa, distancia) {
    // El punto (0, distancia) de la etapa, girado según su ángulo
    const rad = Phaser.Math.DegToRad(etapa.angle);
    return {
      x: etapa.x - distancia * Math.sin(rad),
      y: etapa.y + distancia * Math.cos(rad),
      angulo: 90 + etapa.angle // el fuego sale hacia "atrás" del cohete
    };
  }

  despegar() {
    this.mensaje.setText('¡Despegue!');
    this.tweens.add({ targets: this.mensaje, alpha: 0, delay: 600, duration: 400 });
    this.cameras.main.shake(2400, 0.004);
    this.fuego1 = fuegoDeMotor(this, () => this.tobera(this.etapa1, 84), { humo: true, largo: 90, tam: 7 });

    // El cohete sube, el suelo baja y el cielo se oscurece hasta el negro del espacio
    this.tweens.add({ targets: [this.etapa1, this.etapa2], y: '-=270', duration: 2500, ease: 'Quad.easeIn' });
    this.tweens.add({ targets: this.suelo, y: 800, duration: 2500, ease: 'Quad.easeIn' });
    this.tweens.add({ targets: this.horizonte, y: ALTO + 200, duration: 2500, ease: 'Quad.easeIn' });
    this.tweens.add({ targets: this.cielo, alpha: 0, duration: 2600, ease: 'Sine.easeIn' });
    this.tweens.add({ targets: this.estrellas, alpha: 1, delay: 1200, duration: 1500 });
  }

  separarEtapas() {
    if (this.terminado) return;
    this.fuego1.detener();
    const union = { x: this.etapa1.x, y: this.etapa1.y - 72 };
    estallido(this, union.x, union.y, { cantidad: 14, velocidad: 50, tam: 4, colores: [0xffffff, 0xffd166] });
    this.etiqueta.setText('Separación de etapas: la primera etapa, ya vacía, se suelta para no cargar peso inútil.');
    // La primera etapa cae girando
    this.tweens.add({ targets: this.etapa1, y: '+=420', angle: -35, alpha: 0, duration: 1800, ease: 'Quad.easeIn' });
    // La segunda etapa enciende su motor y gira para ponerse en órbita
    this.fuego2 = fuegoDeMotor(this, () => this.tobera(this.etapa2, 42), { largo: 55, tam: 5, cantidad: 2 });
    this.tweens.add({ targets: this.etapa2, angle: 75, x: X0 + 220, y: '-=40', duration: 2200, ease: 'Sine.easeInOut' });
    // Aparece la curva de la Tierra abajo
    this.tweens.add({ targets: this.tierra, alpha: 1, y: ALTO + 1330, duration: 2200, ease: 'Sine.easeOut' });
  }

  llegarAOrbita() {
    if (this.terminado) return;
    this.fuego2.detener();
    this.etiqueta.setText('En órbita: el motor se apaga y la nave sigue moviéndose sola, cayendo alrededor de la Tierra.');
    this.mensaje.setText('¡En órbita!').setAlpha(1).setFontSize(48);
    // La nave se separa del cohete y abre sus paneles
    const nave = this.add.container(this.etapa2.x + 30, this.etapa2.y - 10);
    nave.add(this.add.rectangle(0, 0, 18, 14, 0xd9b44a));
    const izq = this.add.rectangle(-9, 0, 2, 10, 0x1d3f8f).setOrigin(1, 0.5);
    const der = this.add.rectangle(9, 0, 2, 10, 0x1d3f8f).setOrigin(0, 0.5);
    nave.add([izq, der]);
    this.tweens.add({ targets: nave, x: '+=90', y: '-=30', duration: 1200 });
    this.tweens.add({ targets: [izq, der], scaleX: 13, duration: 700, delay: 300 });
  }

  terminar() {
    if (this.terminado) return;
    this.terminado = true;
    if (this.fuego1) this.fuego1.detener();
    if (this.fuego2) this.fuego2.detener();
    this.scene.start('Viaje');
  }
}
