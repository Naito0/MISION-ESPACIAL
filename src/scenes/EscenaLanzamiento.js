// =============================================================
// FASE 5 — LANZAMIENTO: animación corta del despegue.
// Después: la travesía (EscenaViaje).
// =============================================================
import * as Phaser from 'phaser';
import { CONFIG } from '../systems/datos.js';
import { estado, coheteActual, orbitaActual } from '../systems/estadoMision.js';
import { ANCHO, ALTO, COLORES, texto, titulo, barraFases, estrellas } from '../ui/ui.js';

export default class EscenaLanzamiento extends Phaser.Scene {
  constructor() {
    super('Lanzamiento');
  }

  create() {
    estrellas(this, 120);
    barraFases(this, CONFIG.fases, 4);
    const cohete = coheteActual();
    titulo(this, 'Lanzamiento', `${cohete.nombre} rumbo a ${orbitaActual().nombre}`);

    // Suelo, torre y cohete hechos con formas
    this.add.rectangle(0, ALTO - 60, ANCHO, 60, 0x2b3a2b).setOrigin(0, 0);
    this.add.rectangle(ANCHO / 2 + 50, ALTO - 210, 12, 300, 0x555b6e);
    this.cohete = this.add.container(ANCHO / 2, ALTO - 140);
    this.cohete.add(this.add.rectangle(0, 0, 34, 150, 0xdfe6f5));
    this.cohete.add(this.add.triangle(0, -95, 0, 40, 34, 40, 17, 0, 0xff6b6b));
    this.cohete.add(this.add.rectangle(-22, 60, 10, 30, 0x9aa6c8));
    this.cohete.add(this.add.rectangle(22, 60, 10, 30, 0x9aa6c8));
    this.llama = this.add.triangle(0, 100, 0, 0, 26, 0, 13, 60, 0xffb347).setVisible(false);
    this.cohete.add(this.llama);

    this.cuenta = texto(this, ANCHO / 2, 250, '3', { tam: 72, negrita: true, origen: [0.5, 0.5], color: COLORES.aviso });
    this.textoEstado = texto(this, ANCHO / 2, 330, `Masa de la nave: ${estado.lanzamiento.masaTotal} kg`, {
      tam: 18, origen: [0.5, 0.5], color: COLORES.textoSuave
    });

    // Cuenta regresiva 3, 2, 1 y despegue
    let n = 3;
    this.time.addEvent({
      delay: 600, repeat: 2,
      callback: () => {
        n -= 1;
        if (n > 0) this.cuenta.setText(String(n));
        else this.despegar();
      }
    });
  }

  despegar() {
    this.cuenta.setText('¡Despegue!');
    this.llama.setVisible(true);
    // Humo: círculos que se agrandan y desaparecen
    this.time.addEvent({
      delay: 80, repeat: 20,
      callback: () => {
        const humo = this.add.circle(this.cohete.x + Phaser.Math.Between(-30, 30), ALTO - 50, 12, 0xcccccc, 0.6);
        this.tweens.add({ targets: humo, scale: 3, alpha: 0, duration: 1200, onComplete: () => humo.destroy() });
      }
    });
    this.tweens.add({
      targets: this.cohete,
      y: -250,
      duration: 2400,
      ease: 'Quad.easeIn',
      onUpdate: () => this.llama.setScale(1, 0.8 + Math.random() * 0.5),
      onComplete: () => {
        this.textoEstado.setText('Separación exitosa: comienza la travesía.');
        this.textoEstado.setColor(COLORES.bien);
        this.time.delayedCall(1200, () => this.scene.start('Viaje'));
      }
    });
  }
}
