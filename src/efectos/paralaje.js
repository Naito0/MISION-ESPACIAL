// =============================================================
// paralaje.js — Fondo de estrellas en varias capas que se mueven a
// distinta velocidad: las lejanas despacio y las cercanas rápido.
// Eso da sensación de profundidad (efecto "paralaje").
// =============================================================
import * as Phaser from 'phaser';
import { ANCHO, ALTO } from '../ui/ui.js';

const CAPAS_POR_DEFECTO = [
  { cantidad: 90, velocidad: 12, tam: [0.6, 1.2], alfa: [0.25, 0.5] },  // muy lejanas
  { cantidad: 50, velocidad: 40, tam: [1, 1.8], alfa: [0.4, 0.8] },     // medias
  { cantidad: 18, velocidad: 120, tam: [1.6, 2.6], alfa: [0.7, 1] }      // cercanas
];

/**
 * Crea el fondo. Devuelve { actualizar(deltaMs, factor) } — factor = 0 lo detiene,
 * 1 es la velocidad normal.
 */
export function crearFondoParalaje(escena, capas = CAPAS_POR_DEFECTO, profundidad = -10) {
  const estrellas = [];
  for (const capa of capas) {
    for (let i = 0; i < capa.cantidad; i++) {
      const e = escena.add.circle(
        Math.random() * ANCHO, Math.random() * ALTO,
        Phaser.Math.FloatBetween(capa.tam[0], capa.tam[1]), 0xffffff,
        Phaser.Math.FloatBetween(capa.alfa[0], capa.alfa[1])
      ).setDepth(profundidad);
      e.velocidad = capa.velocidad;
      estrellas.push(e);
    }
  }
  return {
    actualizar(deltaMs, factor = 1) {
      const dt = deltaMs / 1000;
      for (const e of estrellas) {
        e.x -= e.velocidad * dt * factor;
        if (e.x < -4) { e.x = ANCHO + 4; e.y = Math.random() * ALTO; }
      }
    }
  };
}
