// =============================================================
// ESCENA 5 — ATERRIZAJE (tipo Lunar Lander) con gravedad real del destino.
//
// Física (unidades reales: metros, segundos, kg, newtons):
//   aceleración del motor = empuje / masa total   (en la dirección de la nave)
//   aceleración vertical  = componente vertical del motor − gravedad
//   En Marte se suma un leve frenado atmosférico: a = −k · v · |v|
//   El combustible se gasta al empujar, y la nave se hace más liviana.
// Controles: ↑ o ESPACIO = motor · ← → = girar
// =============================================================
import * as Phaser from 'phaser';
import { CONFIG } from '../systems/datos.js';
import { estado, destinoActual, registrar } from '../systems/estadoMision.js';
import { ANCHO, ALTO, COLORES, texto, panel, boton, estrellas } from '../ui/ui.js';

const SUELO_Y = 650;      // altura en pantalla de la superficie
const MARGEN_SUPERIOR = 120;
const PIES = 24;          // distancia del centro de la nave a sus patas (px)

export default class EscenaAterrizaje extends Phaser.Scene {
  constructor() {
    super('Aterrizaje');
  }

  create() {
    estrellas(this, 80);
    const destino = destinoActual();
    const params = destino.juego.aterrizaje;
    this.cfg = CONFIG.aterrizaje;

    // ---- Variables físicas ----
    this.g = destino.gravedad;
    this.k = params.frenadoAtmosferico;
    this.altitudInicial = params.altitudInicial;
    this.altitud = params.altitudInicial;            // m
    this.vy = -params.velocidadVerticalInicial;      // m/s (negativo = cae)
    this.vx = Phaser.Math.FloatBetween(-params.velocidadHorizontalMax, params.velocidadHorizontalMax);
    this.angulo = 0;                                 // grados (0 = vertical, + = inclinada a la derecha)
    this.masaSeca = estado.nave.masaSeca;
    this.combustible = estado.recursos.combustible;  // kg (lo que quedó del viaje)
    this.empuje = estado.nave.empuje;                // N
    this.consumo = estado.nave.consumoMotor;         // kg/s
    this.tiempo = 0;
    this.tiempoMotor = 0;
    this.sinCombustibleEnVuelo = false;

    // Escala: toda la altitud inicial entra en la pantalla
    this.pxPorMetro = (SUELO_Y - PIES - MARGEN_SUPERIOR) / this.altitudInicial;
    this.anchoMundo = ANCHO / this.pxPorMetro;       // m
    this.x = this.anchoMundo / 2;

    // Datos que se guardan para la pantalla de resultados
    this.masaInicial = Math.round(this.masaSeca + this.combustible);
    this.combustibleInicial = this.combustible;
    this.empujePeso = this.empuje / (this.masaInicial * this.g);

    this.dibujarEscenario(destino);
    this.dibujarNave();
    this.crearHud(destino);

    // ---- Teclado ----
    this.cursores = this.input.keyboard.createCursorKeys();
    this.teclaEspacio = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.fase = 'espera'; // 'espera' → 'volando' → 'fin'
    this.mensaje = texto(this, ANCHO / 2, 300,
      'Pulsa ↑ o ESPACIO para comenzar\n(↑/ESPACIO = motor · ← → = girar)',
      { tam: 24, origen: [0.5, 0.5], align: 'center', color: COLORES.aviso });
    this.actualizarDibujo();
  }

  dibujarEscenario(destino) {
    const color = parseInt(destino.color.replace('#', ''), 16);
    if (destino.juego.aterrizaje.frenadoAtmosferico > 0) {
      // Cielo rojizo tenue para Marte
      this.add.rectangle(0, 0, ANCHO, SUELO_Y, 0x3a1d14, 0.5).setOrigin(0, 0);
    }
    this.add.rectangle(0, SUELO_Y, ANCHO, ALTO - SUELO_Y, color).setOrigin(0, 0);
    // Algunos cráteres decorativos
    for (let i = 0; i < 8; i++) {
      this.add.ellipse(80 + i * 160 + Math.random() * 40, SUELO_Y + 30 + Math.random() * 30, 60, 14, 0x000000, 0.15);
    }
  }

  dibujarNave() {
    this.naveGrafica = this.add.container(0, 0);
    const cuerpo = this.add.rectangle(0, 0, 34, 26, 0xdfe6f5).setStrokeStyle(2, 0x9aa6c8);
    const cabina = this.add.rectangle(0, -17, 18, 8, 0xffd166);
    const pataIzq = this.add.rectangle(-16, 16, 4, 18, 0xbfc7d9).setAngle(25);
    const pataDer = this.add.rectangle(16, 16, 4, 18, 0xbfc7d9).setAngle(-25);
    const pieIzq = this.add.rectangle(-21, PIES, 12, 3, 0xbfc7d9);
    const pieDer = this.add.rectangle(21, PIES, 12, 3, 0xbfc7d9);
    this.llama = this.add.triangle(0, 14, -9, 0, 9, 0, 0, 34, 0xff9f43);
    this.llama.setOrigin(0.5, 0);
    this.naveGrafica.add([this.llama, pataIzq, pataDer, pieIzq, pieDer, cuerpo, cabina]);
  }

  crearHud(destino) {
    panel(this, 15, 15, 330, 200);
    this.hud = texto(this, 28, 25, '', { tam: 16 });
    texto(this, ANCHO - 20, 20,
      `${destino.nombre} · gravedad ${destino.gravedad} m/s²` + (this.k > 0 ? ' · atmósfera delgada' : ''),
      { tam: 16, origen: [1, 0], color: COLORES.textoSuave });
    texto(this, ANCHO - 20, 45,
      `Para aterrizar: vertical < ${this.cfg.velocidadMaxVertical} m/s · horizontal < ${this.cfg.velocidadMaxHorizontal} m/s · inclinación < ${this.cfg.anguloMaxGrados}°`,
      { tam: 14, origen: [1, 0], color: COLORES.textoSuave });
    // Barra de combustible
    this.add.rectangle(28, 195, 300, 12, 0x333a4d).setOrigin(0, 0.5);
    this.barraCombustible = this.add.rectangle(28, 195, 300, 12, 0x5be08a).setOrigin(0, 0.5);
  }

  update(_tiempo, deltaMs) {
    const motorPulsado = this.cursores.up.isDown || this.teclaEspacio.isDown;

    if (this.fase === 'espera') {
      if (motorPulsado) {
        this.fase = 'volando';
        this.mensaje.setVisible(false);
      }
      return;
    }
    if (this.fase !== 'volando') return;

    // Paso de tiempo (limitado para que no "salte" si el navegador se traba)
    const dt = Math.min(deltaMs / 1000, 0.05) * this.cfg.escalaTiempo;
    this.tiempo += dt;

    // ---- Rotación ----
    if (this.cursores.left.isDown) this.angulo -= this.cfg.velocidadRotacionGrados * dt;
    if (this.cursores.right.isDown) this.angulo += this.cfg.velocidadRotacionGrados * dt;
    this.angulo = Phaser.Math.Clamp(this.angulo, -90, 90);

    // ---- Fuerzas ----
    const masa = this.masaSeca + this.combustible;
    const empujando = motorPulsado && this.combustible > 0;
    let ax = 0;
    let ay = -this.g; // la gravedad tira hacia abajo

    if (empujando) {
      const aMotor = this.empuje / masa; // aceleración = empuje / masa total
      const rad = Phaser.Math.DegToRad(this.angulo);
      ax += aMotor * Math.sin(rad);
      ay += aMotor * Math.cos(rad);
      this.combustible = Math.max(0, this.combustible - this.consumo * dt);
      this.tiempoMotor += dt;
      if (this.combustible === 0) this.sinCombustibleEnVuelo = true;
    }

    // Frenado atmosférico (solo si k > 0, por ejemplo en Marte)
    if (this.k > 0) {
      const v = Math.hypot(this.vx, this.vy);
      ax -= this.k * this.vx * v;
      ay -= this.k * this.vy * v;
    }

    // ---- Integración simple (Euler) ----
    this.vx += ax * dt;
    this.vy += ay * dt;
    this.x += this.vx * dt;
    this.altitud += this.vy * dt;

    // La pantalla "da la vuelta" a los lados
    if (this.x < 0) this.x += this.anchoMundo;
    if (this.x > this.anchoMundo) this.x -= this.anchoMundo;
    // Techo: no dejamos que la nave se escape de la pantalla
    const techo = this.altitudInicial * 1.05;
    if (this.altitud > techo) { this.altitud = techo; this.vy = Math.min(this.vy, 0); }

    this.llama.setVisible(empujando);
    if (empujando) this.llama.setScale(1, 0.8 + Math.random() * 0.5);

    if (this.altitud <= 0) {
      this.altitud = 0;
      this.tocarSuelo();
    }
    this.actualizarDibujo();
  }

  actualizarDibujo() {
    this.naveGrafica.x = this.x * this.pxPorMetro;
    this.naveGrafica.y = SUELO_Y - PIES - this.altitud * this.pxPorMetro;
    this.naveGrafica.setAngle(this.angulo);

    const vVertical = -this.vy;
    const ok = (v, max) => (Math.abs(v) <= max ? '✔' : '✖');
    const masa = this.masaSeca + this.combustible;
    this.hud.setText(
      `Altitud: ${this.altitud.toFixed(0)} m\n` +
      `Vel. vertical: ${vVertical.toFixed(1)} m/s ${vVertical > 0 ? '↓' : '↑'} ${ok(vVertical > 0 ? vVertical : 0, this.cfg.velocidadMaxVertical)}\n` +
      `Vel. horizontal: ${this.vx.toFixed(1)} m/s ${ok(this.vx, this.cfg.velocidadMaxHorizontal)}\n` +
      `Inclinación: ${this.angulo.toFixed(0)}° ${ok(this.angulo, this.cfg.anguloMaxGrados)}\n` +
      `Masa: ${masa.toFixed(0)} kg · Empuje/peso: ${(this.empuje / (masa * this.g)).toFixed(2)}\n` +
      `Combustible: ${this.combustible.toFixed(0)} kg`
    );
    const fraccion = this.combustibleInicial > 0 ? this.combustible / this.combustibleInicial : 0;
    this.barraCombustible.scaleX = Math.max(0, fraccion);
    this.barraCombustible.setFillStyle(fraccion > 0.25 ? 0x5be08a : 0xff6b6b);
  }

  /** Evalúa el contacto con el suelo y guarda el resultado en el estado. */
  tocarSuelo() {
    this.fase = 'fin';
    this.llama.setVisible(false);
    const vVertical = Math.max(0, -this.vy);
    const vHorizontal = Math.abs(this.vx);
    const angulo = this.angulo;

    let motivo = null;
    if (vVertical > this.cfg.velocidadMaxVertical) {
      motivo = this.combustible <= 0 ? 'combustible' : 'vertical';
    } else if (vHorizontal > this.cfg.velocidadMaxHorizontal) {
      motivo = 'horizontal';
    } else if (Math.abs(angulo) > this.cfg.anguloMaxGrados) {
      motivo = 'angulo';
    }
    const exito = motivo === null;

    estado.aterrizaje = {
      exito,
      motivo,
      vVertical,
      vHorizontal,
      angulo,
      tiempo: this.tiempo,
      tiempoMotor: this.tiempoMotor,
      combustibleInicial: this.combustibleInicial,
      combustibleFinal: this.combustible,
      masaInicial: this.masaInicial,
      empujePeso: this.empujePeso,
      sinCombustibleEnVuelo: this.sinCombustibleEnVuelo
    };
    estado.recursos.combustible = Math.round(this.combustible);
    registrar('aterrizaje', exito
      ? `Aterrizaje exitoso a ${vVertical.toFixed(1)} m/s.`
      : `Choque a ${vVertical.toFixed(1)} m/s (motivo: ${motivo}).`);

    if (!exito) {
      // "Explosión" simple con círculos
      for (let i = 0; i < 14; i++) {
        const c = this.add.circle(this.naveGrafica.x, this.naveGrafica.y, 6, i % 2 ? 0xff6b6b : 0xffd166);
        this.tweens.add({
          targets: c,
          x: c.x + Phaser.Math.Between(-90, 90),
          y: c.y + Phaser.Math.Between(-90, 10),
          alpha: 0,
          duration: 900
        });
      }
      this.naveGrafica.setVisible(false);
    }

    panel(this, 390, 250, 500, 190, exito ? 0x15361f : 0x3a1620);
    texto(this, 640, 268, exito ? '¡Aterrizaje exitoso!' : 'La nave se estrelló', {
      tam: 30, negrita: true, origen: [0.5, 0], color: exito ? COLORES.bien : COLORES.mal
    });
    texto(this, 640, 315,
      `Velocidad vertical: ${vVertical.toFixed(1)} m/s · horizontal: ${vHorizontal.toFixed(1)} m/s\n` +
      `Inclinación: ${angulo.toFixed(0)}° · Combustible restante: ${this.combustible.toFixed(0)} kg`,
      { tam: 16, origen: [0.5, 0], align: 'center' });
    boton(this, 640, 400, 300, 46,
      exito ? 'Comenzar operación ▶' : 'Ver resultados ▶',
      () => this.scene.start(exito ? 'Operacion' : 'Resultados'), { tam: 20 });
  }
}
