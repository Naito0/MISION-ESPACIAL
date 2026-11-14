// =============================================================
// Minijuego: RECALIBRAR LA ANTENA.
// Gira la antena (botones o flechas ← →) hasta apuntar a la Tierra y
// mantén la señal fuerte durante 2 segundos. La antena se desvía sola.
// =============================================================
import * as Phaser from 'phaser';
import { crearMarco } from './base.js';
import { COLORES, texto, boton, barra } from '../ui/ui.js';

const CENTRO = { x: 640, y: 380 };
const RADIO = 150;
const SEGUNDOS_ESTABLE = 2;

export function minijuegoAntena(escena, opciones) {
  const m = crearMarco(escena, {
    ...opciones,
    titulo: 'Recalibrar la antena',
    instrucciones: 'Gira la antena con los botones o con las flechas ← → hasta que apunte a la Tierra (círculo azul). Mantén la señal en verde 2 segundos.'
  });

  // Dial y Tierra (objetivo)
  m.agregar(escena.add.circle(CENTRO.x, CENTRO.y, RADIO).setStrokeStyle(2, 0x7cc4ff, 0.6));
  const objetivo = Phaser.Math.Between(-150, -30); // grados (hacia arriba)
  const radObj = Phaser.Math.DegToRad(objetivo);
  m.agregar(escena.add.circle(CENTRO.x + Math.cos(radObj) * RADIO, CENTRO.y + Math.sin(radObj) * RADIO, 16, 0x2f6fd6));
  const aguja = m.agregar(escena.add.graphics());
  m.agregar(escena.add.circle(CENTRO.x, CENTRO.y, 14, 0xdfe6f5));

  let angulo = objetivo + (Math.random() < 0.5 ? -1 : 1) * Phaser.Math.Between(60, 110);
  let estable = 0;
  let deriva = (Math.random() < 0.5 ? -1 : 1) * 12; // grados por segundo que se desvía sola

  const etiqueta = m.agregar(texto(escena, 820, 250, 'Señal', { tam: 16, negrita: true }));
  const barraSenal = barra(escena, 820, 280, 220, 16);
  m.agregar(barraSenal.fondo);
  m.agregar(barraSenal.relleno);

  // Botones de giro (cada clic gira 6°)
  const bIzq = boton(escena, 470, 560, 120, 44, '◀ Girar', () => { angulo -= 6; }, { tam: 16 });
  const bDer = boton(escena, 810, 560, 120, 44, 'Girar ▶', () => { angulo += 6; }, { tam: 16 });
  [bIzq, bDer].forEach((b) => { m.agregar(b.fondo); m.agregar(b.txt); });
  const cursores = escena.input.keyboard.createCursorKeys();

  const bucle = escena.time.addEvent({
    delay: 50, loop: true,
    callback: () => {
      if (!m.activo) return;
      const dt = 0.05;
      if (cursores.left.isDown) angulo -= 70 * dt;
      if (cursores.right.isDown) angulo += 70 * dt;
      angulo += deriva * dt;
      if (Math.random() < 0.02) deriva = -deriva; // cambia de dirección de vez en cuando

      // Dibujar la antena
      const rad = Phaser.Math.DegToRad(angulo);
      aguja.clear();
      aguja.lineStyle(8, 0xffd166, 1);
      aguja.lineBetween(CENTRO.x, CENTRO.y, CENTRO.x + Math.cos(rad) * (RADIO - 10), CENTRO.y + Math.sin(rad) * (RADIO - 10));

      // Señal: 100% si apunta exacto, 0% si se desvía 60° o más
      const diferencia = Math.abs(Phaser.Math.Angle.ShortestBetween(angulo, objetivo));
      const senal = Math.max(0, 1 - diferencia / 60);
      const buena = senal >= 0.9;
      barraSenal.actualizar(senal, buena ? 'verde' : senal > 0.5 ? 'amarillo' : 'rojo');
      estable = buena ? estable + dt : 0;
      etiqueta.setText(`Señal: ${Math.round(senal * 100)}%${buena ? `  (estable ${estable.toFixed(1)} s)` : ''}`);
      etiqueta.setColor(buena ? COLORES.bien : COLORES.texto);
      if (estable >= SEGUNDOS_ESTABLE) m.terminar(true);
    }
  });
  m.alLimpiar = () => bucle.remove();

  return m;
}
