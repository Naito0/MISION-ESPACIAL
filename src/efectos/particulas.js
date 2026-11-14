// =============================================================
// particulas.js — "Partículas" hechas con círculos de Phaser y tweens
// (fuego del motor, humo, chispas, explosiones). No usan imágenes.
// =============================================================
import * as Phaser from 'phaser';

/**
 * Lanza un puñado de partículas desde (x, y).
 * o = { cantidad, colores, angulo (grados, 90 = hacia abajo), apertura (grados),
 *       velocidad (px), duracion (ms), tam, profundidad, crecer (true = humo) }
 */
export function estallido(escena, x, y, o = {}) {
  const cantidad = o.cantidad ?? 8;
  const colores = o.colores ?? [0xffd166, 0xff9f43, 0xff6b6b];
  for (let i = 0; i < cantidad; i++) {
    const ang = Phaser.Math.DegToRad((o.angulo ?? 0) + Phaser.Math.FloatBetween(-(o.apertura ?? 180), o.apertura ?? 180));
    const dist = (o.velocidad ?? 60) * Phaser.Math.FloatBetween(0.5, 1);
    const c = escena.add.circle(x, y, o.tam ?? 4, colores[i % colores.length], o.alfa ?? 1);
    if (o.profundidad) c.setDepth(o.profundidad);
    escena.tweens.add({
      targets: c,
      x: x + Math.cos(ang) * dist,
      y: y + Math.sin(ang) * dist,
      alpha: 0,
      scale: o.crecer ? 3 : 0.3,
      duration: (o.duracion ?? 500) * Phaser.Math.FloatBetween(0.7, 1.2),
      onComplete: () => c.destroy()
    });
  }
}

/**
 * Fuego continuo de un motor. obtenerPosicion() devuelve { x, y, angulo }
 * (angulo en grados hacia donde sale el fuego). Devuelve { detener() }.
 */
export function fuegoDeMotor(escena, obtenerPosicion, o = {}) {
  const evento = escena.time.addEvent({
    delay: 35, loop: true,
    callback: () => {
      const p = obtenerPosicion();
      if (!p) return;
      estallido(escena, p.x, p.y, {
        cantidad: o.cantidad ?? 3, angulo: p.angulo, apertura: 14, velocidad: o.largo ?? 70,
        duracion: 320, tam: o.tam ?? 6, colores: [0xfff3b0, 0xffd166, 0xff9f43, 0xff6b3d], profundidad: o.profundidad
      });
      if (o.humo) {
        estallido(escena, p.x, p.y + 10, {
          cantidad: 1, angulo: p.angulo, apertura: 40, velocidad: 50, duracion: 1200, tam: 8,
          colores: [0xbfc4cc, 0x9aa0ad], alfa: 0.5, crecer: true, profundidad: (o.profundidad ?? 0) - 1
        });
      }
    }
  });
  return { detener: () => evento.remove() };
}
