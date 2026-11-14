// =============================================================
// controlesGlobales.js — Dos botoncitos arriba a la derecha en TODAS las
// pantallas: 🔬 Modo experto (muestra todos los números) y 🔊 sonido.
// Se instalan solos desde main.js cuando cada escena termina de crearse.
// Las escenas que quieran reaccionar al modo experto pueden escuchar
// el evento 'modoExperto' de la escena (escena.events.on('modoExperto', ...)).
// =============================================================
import { ANCHO, COLORES, FUENTE } from './ui.js';
import { esModoExperto, setModoExperto, estaSilenciado, setSilencio } from '../systems/preferencias.js';

const PROFUNDIDAD = 3000;

function botonRedondo(escena, x, y, icono, alClic) {
  const fondo = escena.add.circle(x, y, 15, 0x1a2342).setStrokeStyle(2, 0x3a4a7a).setDepth(PROFUNDIDAD);
  const txt = escena.add.text(x, y, icono, { fontFamily: FUENTE, fontSize: '16px' }).setOrigin(0.5).setDepth(PROFUNDIDAD + 1);
  fondo.setInteractive({ useHandCursor: true });
  fondo.on('pointerover', () => escena.tweens.add({ targets: [fondo, txt], scale: 1.15, duration: 100 }));
  fondo.on('pointerout', () => escena.tweens.add({ targets: [fondo, txt], scale: 1, duration: 100 }));
  fondo.on('pointerdown', alClic);
  return { fondo, txt };
}

/** Muestra un aviso cortito que desaparece solo. */
function aviso(escena, mensaje) {
  const t = escena.add.text(ANCHO - 10, 48, mensaje, {
    fontFamily: FUENTE, fontSize: '13px', color: '#ffffff', backgroundColor: '#1a2342', padding: { x: 8, y: 4 }
  }).setOrigin(1, 0).setDepth(PROFUNDIDAD + 2);
  escena.tweens.add({ targets: t, alpha: 0, delay: 1800, duration: 400, onComplete: () => t.destroy() });
}

export function instalarControlesGlobales(escena) {
  const experto = botonRedondo(escena, ANCHO - 56, 18, '🔬', () => {
    setModoExperto(!esModoExperto());
    pintar();
    aviso(escena, esModoExperto() ? 'Modo experto: verás todos los números' : 'Modo simple: frases y dibujos');
    escena.events.emit('modoExperto', esModoExperto());
  });
  const sonido = botonRedondo(escena, ANCHO - 20, 18, '🔊', () => {
    setSilencio(!estaSilenciado());
    pintar();
  });
  function pintar() {
    experto.fondo.setStrokeStyle(2, esModoExperto() ? 0x7cf3ff : 0x3a4a7a);
    experto.fondo.setFillStyle(esModoExperto() ? 0x24508a : 0x1a2342);
    sonido.txt.setText(estaSilenciado() ? '🔇' : '🔊');
  }
  pintar();
  return { experto, sonido, colorActivo: COLORES.acento };
}
