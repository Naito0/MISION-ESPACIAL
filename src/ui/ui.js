// =============================================================
// ui.js — Piezas de interfaz reutilizables (texto, botones, paneles).
// Gráficos provisionales hechos solo con formas de Phaser.
// =============================================================

export const ANCHO = 1280;
export const ALTO = 720;
export const FUENTE = 'Arial, Helvetica, sans-serif';

export const COLORES = {
  fondo: 0x0b1020,
  panel: 0x161f3a,
  borde: 0x3a4a7a,
  boton: 0x2b5cab,
  botonHover: 0x3d77d8,
  botonDeshabilitado: 0x3a3f4d,
  seleccionado: 0x2f9e5b,
  seleccionadoHover: 0x3bbd6e,
  // colores de texto (formato CSS)
  texto: '#e8ecff',
  textoSuave: '#9aa6c8',
  bien: '#5be08a',
  mal: '#ff6b6b',
  aviso: '#ffd166',
  acento: '#7cc4ff'
};

/** Crea un texto. opciones: tam, color, ancho (ajuste de línea), negrita, origen [x,y], align */
export function texto(escena, x, y, contenido, opciones = {}) {
  const estilo = {
    fontFamily: FUENTE,
    fontSize: `${opciones.tam || 18}px`,
    color: opciones.color || COLORES.texto,
    fontStyle: opciones.negrita ? 'bold' : 'normal',
    align: opciones.align || 'left',
    lineSpacing: 4
  };
  if (opciones.ancho) estilo.wordWrap = { width: opciones.ancho, useAdvancedWrap: true };
  const t = escena.add.text(x, y, contenido, estilo);
  const [ox, oy] = opciones.origen || [0, 0];
  t.setOrigin(ox, oy);
  return t;
}

/** Título grande centrado en la parte superior. */
export function titulo(escena, contenido, subtitulo) {
  texto(escena, ANCHO / 2, 22, contenido, { tam: 32, negrita: true, origen: [0.5, 0], color: COLORES.acento });
  if (subtitulo) {
    texto(escena, ANCHO / 2, 64, subtitulo, { tam: 16, origen: [0.5, 0], color: COLORES.textoSuave });
  }
}

/** Rectángulo de fondo para agrupar información (origen arriba a la izquierda). */
export function panel(escena, x, y, ancho, alto, color = COLORES.panel) {
  return escena.add.rectangle(x, y, ancho, alto, color).setOrigin(0, 0).setStrokeStyle(2, COLORES.borde);
}

/**
 * Crea un botón (x, y = centro). Devuelve un objeto con:
 *   setHabilitado(bool), setSeleccionado(bool), setTexto(str), destruir()
 * opciones: tam (tamaño de letra), alPasar (función al pasar el mouse)
 */
export function boton(escena, x, y, ancho, alto, etiqueta, alClic, opciones = {}) {
  const fondo = escena.add.rectangle(x, y, ancho, alto, COLORES.boton).setStrokeStyle(2, COLORES.borde);
  const txt = escena.add.text(x, y, etiqueta, {
    fontFamily: FUENTE,
    fontSize: `${opciones.tam || 18}px`,
    color: '#ffffff',
    align: 'center',
    wordWrap: { width: ancho - 10, useAdvancedWrap: true }
  }).setOrigin(0.5);

  const b = {
    fondo, txt,
    habilitado: true,
    seleccionado: false,
    refrescar(hover = false) {
      let color = COLORES.boton;
      if (!b.habilitado) color = COLORES.botonDeshabilitado;
      else if (b.seleccionado) color = hover ? COLORES.seleccionadoHover : COLORES.seleccionado;
      else if (hover) color = COLORES.botonHover;
      fondo.setFillStyle(color);
      txt.setColor(b.habilitado ? '#ffffff' : '#8a8f9c');
      fondo.setStrokeStyle(2, b.seleccionado ? 0x9dffc0 : COLORES.borde);
    },
    setHabilitado(valor) { b.habilitado = valor; b.refrescar(); return b; },
    setSeleccionado(valor) { b.seleccionado = valor; b.refrescar(); return b; },
    setTexto(valor) { txt.setText(valor); return b; },
    setVisible(valor) { fondo.setVisible(valor); txt.setVisible(valor); return b; },
    destruir() { fondo.destroy(); txt.destroy(); }
  };

  fondo.setInteractive({ useHandCursor: true });
  fondo.on('pointerover', () => {
    b.refrescar(true);
    if (opciones.alPasar) opciones.alPasar();
  });
  fondo.on('pointerout', () => b.refrescar(false));
  fondo.on('pointerdown', () => {
    if (b.habilitado && alClic) alClic();
  });
  b.refrescar();
  return b;
}

/** Fondo de estrellas simple (círculos al azar). */
export function estrellas(escena, cantidad = 120) {
  for (let i = 0; i < cantidad; i++) {
    const x = Math.random() * ANCHO;
    const y = Math.random() * ALTO;
    escena.add.circle(x, y, Math.random() < 0.9 ? 1 : 2, 0xffffff, 0.3 + Math.random() * 0.6);
  }
}
