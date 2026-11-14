// =============================================================
// ayuda.js — Información que se descubre interactuando:
//   - botonAyuda(): botón redondo "?" que abre una ventana con la explicación larga.
//   - crearTooltip(): cartelito que sigue al mouse con una explicación corta.
//   - conTooltip(): hace que cualquier objeto muestre un tooltip al pasar el mouse.
// Así la pantalla muestra poco texto y el detalle aparece solo si el jugador lo pide.
// =============================================================
import { COLORES, FUENTE, ventana } from './ui.js';

const PROFUNDIDAD_TOOLTIP = 1500;

/**
 * Botón "?" (x, y = centro). Al hacer clic abre una ventana con el texto que
 * devuelve obtenerTexto() (se calcula en ese momento, así siempre está al día).
 */
export function botonAyuda(escena, x, y, titulo, obtenerTexto, radio = 13) {
  const circulo = escena.add.circle(x, y, radio, 0x2b5cab).setStrokeStyle(2, 0x9dd0ff);
  const signo = escena.add.text(x, y, '?', {
    fontFamily: FUENTE, fontSize: `${Math.round(radio * 1.3)}px`, color: '#ffffff', fontStyle: 'bold'
  }).setOrigin(0.5);
  circulo.setInteractive({ useHandCursor: true });
  circulo.on('pointerover', () => circulo.setFillStyle(0x3d77d8));
  circulo.on('pointerout', () => circulo.setFillStyle(0x2b5cab));
  circulo.on('pointerdown', () => ventana(escena, { tituloTexto: titulo, cuerpo: obtenerTexto(), textoBoton: 'Entendido' }));
  return {
    circulo, signo,
    setVisible(v) { circulo.setVisible(v); signo.setVisible(v); },
    destruir() { circulo.destroy(); signo.destroy(); }
  };
}

/** Crea un tooltip reutilizable (uno por escena). */
export function crearTooltip(escena) {
  const fondo = escena.add.rectangle(0, 0, 10, 10, 0x0b1328, 0.96).setOrigin(0, 0)
    .setStrokeStyle(1, 0x7cc4ff).setDepth(PROFUNDIDAD_TOOLTIP).setVisible(false);
  const txt = escena.add.text(0, 0, '', {
    fontFamily: FUENTE, fontSize: '13px', color: COLORES.texto, lineSpacing: 3,
    wordWrap: { width: 300, useAdvancedWrap: true }
  }).setDepth(PROFUNDIDAD_TOOLTIP + 1).setVisible(false);

  return {
    /** Muestra el texto cerca de (x, y), sin salirse de la pantalla. */
    mostrar(x, y, contenido) {
      txt.setText(contenido);
      const ancho = txt.width + 16;
      const alto = txt.height + 12;
      const px = Math.min(x + 14, escena.scale.width - ancho - 6);
      const py = Math.min(y + 14, escena.scale.height - alto - 6);
      fondo.setPosition(px, py).setSize(ancho, alto).setVisible(true);
      txt.setPosition(px + 8, py + 6).setVisible(true);
    },
    ocultar() {
      fondo.setVisible(false);
      txt.setVisible(false);
    }
  };
}

/**
 * Hace que 'objeto' muestre un tooltip al pasar el mouse.
 * obtenerTexto puede ser un texto o una función que lo devuelve.
 */
export function conTooltip(objeto, tooltip, obtenerTexto) {
  objeto.setInteractive({ useHandCursor: false });
  objeto.on('pointerover', (p) => tooltip.mostrar(p.x, p.y, typeof obtenerTexto === 'function' ? obtenerTexto() : obtenerTexto));
  objeto.on('pointermove', (p) => tooltip.mostrar(p.x, p.y, typeof obtenerTexto === 'function' ? obtenerTexto() : obtenerTexto));
  objeto.on('pointerout', () => tooltip.ocultar());
  return objeto;
}
