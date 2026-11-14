// =============================================================
// orbi.js — Orbi, el robot guía (personaje original, dibujado con formas).
// - Flota suavemente y parpadea la luz de su antena.
// - Habla con globos de diálogo de UNA frase: orbi.decir('¡Hola!', 'feliz').
// - Cambia de carita: 'neutral', 'feliz', 'preocupado', 'sorprendido'.
// =============================================================
import { FUENTE } from './ui.js';

const CYAN = 0x7cf3ff;
const CUERPO = 0xdfe6f5;

/**
 * Crea a Orbi en (x, y). o.escala (tamaño), o.lado ('derecha' o 'izquierda':
 * hacia dónde sale el globo), o.profundidad.
 */
export function crearOrbi(escena, x, y, o = {}) {
  const escala = o.escala ?? 1;
  const lado = o.lado ?? 'derecha';
  const prof = o.profundidad ?? 1200;
  const cont = escena.add.container(x, y).setScale(escala).setDepth(prof);

  // ---- Antena con luz ----
  const palo = escena.add.rectangle(0, -38, 3, 14, 0x9aa6c8);
  const luz = escena.add.circle(0, -46, 5, 0xff6b6b);
  escena.tweens.add({ targets: luz, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

  // ---- Cabeza, visor y cuerpo ----
  const cuerpo = escena.add.graphics();
  cuerpo.fillStyle(CUERPO, 1).fillRoundedRect(-30, -31, 60, 46, 14);
  cuerpo.fillStyle(0x1a2342, 1).fillRoundedRect(-23, -24, 46, 30, 9);
  cuerpo.fillStyle(CUERPO, 1).fillRoundedRect(-16, 18, 32, 20, 8);
  cuerpo.fillStyle(0x7cc4ff, 1).fillCircle(0, 28, 4);
  const brazoIzq = escena.add.rectangle(-21, 26, 12, 5, 0x9aa6c8).setOrigin(1, 0.5);
  const brazoDer = escena.add.rectangle(21, 26, 12, 5, 0x9aa6c8).setOrigin(0, 0.5);
  const cara = escena.add.graphics();
  cont.add([palo, luz, brazoIzq, brazoDer, cuerpo, cara]);

  // Flota suavemente
  escena.tweens.add({ targets: cont, y: y - 6, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  // ---- Caritas ----
  function dibujarCara(emocion) {
    cara.clear();
    cara.lineStyle(3, CYAN, 1);
    cara.fillStyle(CYAN, 1);
    if (emocion === 'feliz') {
      // Ojos ^ ^ y sonrisa
      cara.beginPath(); cara.arc(-9, -9, 5, Math.PI, 0); cara.strokePath();
      cara.beginPath(); cara.arc(9, -9, 5, Math.PI, 0); cara.strokePath();
      cara.beginPath(); cara.arc(0, -2, 8, 0.15 * Math.PI, 0.85 * Math.PI); cara.strokePath();
    } else if (emocion === 'preocupado') {
      cara.fillStyle(0xffd166, 1);
      cara.fillCircle(-9, -10, 3);
      cara.fillCircle(9, -10, 3);
      cara.lineStyle(3, 0xffd166, 1);
      cara.lineBetween(-14, -17, -5, -15);
      cara.lineBetween(14, -17, 5, -15);
      cara.beginPath(); cara.arc(0, 4, 7, 1.15 * Math.PI, 1.85 * Math.PI); cara.strokePath();
    } else if (emocion === 'sorprendido') {
      cara.strokeCircle(-9, -10, 5);
      cara.strokeCircle(9, -10, 5);
      cara.strokeCircle(0, 0, 3);
    } else {
      cara.fillCircle(-9, -10, 4);
      cara.fillCircle(9, -10, 4);
      cara.lineBetween(-6, 0, 6, 0);
    }
  }
  dibujarCara('neutral');

  // ---- Globo de diálogo ----
  let globo = null;
  let temporizador = null;
  function cerrarGlobo() {
    if (temporizador) { temporizador.remove(); temporizador = null; }
    if (globo) { globo.forEach((g) => g.destroy()); globo = null; }
  }

  const orbi = {
    contenedor: cont,
    /** Cambia la carita (y saluda con los brazos si está feliz). */
    emocion(e) {
      dibujarCara(e);
      if (e === 'feliz') escena.tweens.add({ targets: [brazoIzq, brazoDer], angle: { from: 0, to: -30 }, duration: 150, yoyo: true, repeat: 2 });
      if (e === 'sorprendido') escena.tweens.add({ targets: cont, scale: escala * 1.15, duration: 120, yoyo: true });
    },
    /**
     * Dice una frase. op.ms = cuánto dura (0 = no se cierra sola),
     * op.boton = texto de un botón dentro del globo, op.alPulsar = qué hace.
     */
    decir(frase, emocion = 'neutral', op = {}) {
      cerrarGlobo();
      orbi.emocion(emocion);
      const anchoMax = op.ancho ?? 300;
      const txt = escena.add.text(0, 0, frase, {
        fontFamily: FUENTE, fontSize: '15px', color: '#13203d', lineSpacing: 3,
        wordWrap: { width: anchoMax, useAdvancedWrap: true }
      }).setDepth(prof + 2);
      const altoBoton = op.boton ? 30 : 0;
      const ancho = Math.max(txt.width, op.boton ? 120 : 0) + 24;
      const alto = txt.height + 18 + altoBoton;
      const gx = lado === 'derecha' ? x + 42 * escala : x - 42 * escala - ancho;
      const gy = y - 40 * escala - alto / 2;
      const fondo = escena.add.graphics().setDepth(prof + 1);
      fondo.fillStyle(0xf4f7ff, 1).fillRoundedRect(gx, gy, ancho, alto, 12);
      fondo.lineStyle(2, 0x7cc4ff, 1).strokeRoundedRect(gx, gy, ancho, alto, 12);
      // Colita del globo hacia Orbi
      const colaX = lado === 'derecha' ? gx : gx + ancho;
      const dir = lado === 'derecha' ? -1 : 1;
      fondo.fillStyle(0xf4f7ff, 1).fillTriangle(colaX, gy + alto - 22, colaX, gy + alto - 8, colaX + dir * 12, gy + alto - 4);
      txt.setPosition(gx + 12, gy + 9);
      globo = [fondo, txt];
      if (op.boton) {
        const bx = gx + ancho - 12;
        const by = gy + alto - 22;
        const b = escena.add.text(bx, by, op.boton, {
          fontFamily: FUENTE, fontSize: '14px', color: '#ffffff', backgroundColor: '#2b5cab', padding: { x: 10, y: 4 }
        }).setOrigin(1, 0.5).setDepth(prof + 3).setInteractive({ useHandCursor: true });
        b.on('pointerdown', () => { cerrarGlobo(); if (op.alPulsar) op.alPulsar(); });
        globo.push(b);
      }
      // Aparece con un pequeño "pop"
      globo.forEach((g) => { g.setAlpha(0); escena.tweens.add({ targets: g, alpha: 1, duration: 200 }); });
      const ms = op.ms ?? 4500;
      if (ms > 0) temporizador = escena.time.delayedCall(ms, cerrarGlobo);
    },
    callar: cerrarGlobo,
    setVisible(v) { cont.setVisible(v); if (!v) cerrarGlobo(); }
  };
  return orbi;
}
