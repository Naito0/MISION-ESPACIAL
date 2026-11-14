// =============================================================
// Minijuego: SOLDAR GRIETAS del casco.
// Cada grieta necesita 3 clics de soldadura. Hay que sellarlas todas
// antes de que se acabe el tiempo (o el oxígeno).
// =============================================================
import * as Phaser from 'phaser';
import { crearMarco } from './base.js';

/** Mezcla dos colores 0xRRGGBB (f = 0 → a, f = 1 → b). */
function mezclarColor(a, b, f) {
  const canal = (c, s) => (c >> s) & 0xff;
  const mix = (s) => Math.round(canal(a, s) + (canal(b, s) - canal(a, s)) * f) << s;
  return mix(16) | mix(8) | mix(0);
}

const CANTIDAD_GRIETAS = 5;
const CLICS_POR_GRIETA = 3;

export function minijuegoSoldadura(escena, opciones) {
  const m = crearMarco(escena, {
    ...opciones,
    titulo: 'Soldar las grietas del casco',
    instrucciones: `Haz clic ${CLICS_POR_GRIETA} veces sobre cada grieta roja para soldarla.`
  });

  // Placa del casco
  m.agregar(escena.add.rectangle(640, 390, 760, 330, 0x5b6275).setStrokeStyle(4, 0x2a2f3a));
  for (let i = 0; i < 6; i++) m.agregar(escena.add.circle(280 + i * 145, 245, 6, 0x3a3f4d)); // remaches

  let selladas = 0;
  for (let i = 0; i < CANTIDAD_GRIETAS; i++) {
    const x = Phaser.Math.Between(320, 960);
    const y = Phaser.Math.Between(280, 520);
    const grieta = m.agregar(escena.add.rectangle(x, y, 90, 14, 0xff5a36).setAngle(Phaser.Math.Between(-50, 50)));
    grieta.clics = 0;
    grieta.setInteractive({ useHandCursor: true });
    grieta.on('pointerdown', () => {
      if (!m.activo || grieta.clics >= CLICS_POR_GRIETA) return;
      grieta.clics++;
      chispas(x, y);
      // Va cambiando de rojo a gris a medida que se suelda
      grieta.setFillStyle(mezclarColor(0xff5a36, 0x9aa0ad, grieta.clics / CLICS_POR_GRIETA));
      if (grieta.clics === CLICS_POR_GRIETA) {
        grieta.setScale(1, 0.6);
        selladas++;
        if (selladas === CANTIDAD_GRIETAS) escena.time.delayedCall(300, () => m.terminar(true));
      }
    });
  }

  function chispas(x, y) {
    for (let i = 0; i < 6; i++) {
      const c = m.agregar(escena.add.circle(x, y, 3, 0xffe08a));
      escena.tweens.add({
        targets: c, x: x + Phaser.Math.Between(-40, 40), y: y + Phaser.Math.Between(-40, 20), alpha: 0, duration: 350
      });
    }
  }

  return m;
}
