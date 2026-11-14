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

/** Título centrado debajo de la barra de fases. */
export function titulo(escena, contenido, subtitulo) {
  texto(escena, ANCHO / 2, 42, contenido, { tam: 24, negrita: true, origen: [0.5, 0], color: COLORES.acento });
  if (subtitulo) {
    texto(escena, ANCHO / 2, 71, subtitulo, { tam: 13, origen: [0.5, 0], color: COLORES.textoSuave });
  }
}

/**
 * Barra de progreso con las fases de maduración de una misión (arriba de la pantalla).
 * @param fases  lista { nombre, explicacion } (config.json → fases)
 * @param actual índice de la fase actual (0 a 5)
 */
export function barraFases(escena, fases, actual) {
  const ancho = ANCHO / fases.length;
  fases.forEach((f, i) => {
    const color = i < actual ? 0x1f5a3a : i === actual ? COLORES.boton : 0x1a2038;
    escena.add.rectangle(i * ancho + 2, 2, ancho - 4, 34, color).setOrigin(0, 0)
      .setStrokeStyle(1, i === actual ? 0x9dd0ff : COLORES.borde);
    texto(escena, i * ancho + ancho / 2, 4, `${i < actual ? '✔ ' : ''}${i + 1}. ${f.nombre}`, {
      tam: 12, negrita: true, origen: [0.5, 0], color: i <= actual ? '#ffffff' : COLORES.textoSuave
    });
    texto(escena, i * ancho + ancho / 2, 20, f.explicacion, {
      tam: 10, origen: [0.5, 0], color: i === actual ? '#dbe9ff' : COLORES.textoSuave
    });
  });
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
      if (!b.habilitado) color = b.seleccionado ? 0x24553a : COLORES.botonDeshabilitado;
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
  fondo.on('pointerout', () => {
    b.refrescar(false);
    if (opciones.alSalir) opciones.alSalir();
  });
  fondo.on('pointerdown', () => {
    if (b.habilitado && alClic) alClic();
  });
  b.refrescar();
  return b;
}

/** Colores de las barras de recursos según su nivel. */
export const COLOR_NIVEL = { verde: 0x3cc46e, amarillo: 0xf2c14e, rojo: 0xe5484d };

/**
 * Barra de progreso horizontal (x, y = esquina superior izquierda).
 * Devuelve { actualizar(fraccion 0-1+, nivel 'verde'|'amarillo'|'rojo') }.
 */
export function barra(escena, x, y, ancho, alto = 12) {
  const fondo = escena.add.rectangle(x, y, ancho, alto, 0x2a3150).setOrigin(0, 0);
  const relleno = escena.add.rectangle(x, y, ancho, alto, COLOR_NIVEL.verde).setOrigin(0, 0);
  return {
    fondo,
    relleno,
    actualizar(fraccion, nivel = 'verde') {
      relleno.scaleX = Math.max(0, Math.min(1, fraccion));
      relleno.setFillStyle(COLOR_NIVEL[nivel] ?? nivel);
    }
  };
}

/**
 * Ventana emergente centrada con título, texto y un botón.
 * Devuelve una función para cerrarla.
 */
export function ventana(escena, { tituloTexto, cuerpo, colorFondo = COLORES.panel, colorTitulo = COLORES.acento, textoBoton = 'Continuar', alCerrar }) {
  const elementos = [];
  elementos.push(escena.add.rectangle(0, 0, ANCHO, ALTO, 0x000000, 0.55).setOrigin(0, 0).setInteractive());
  elementos.push(panel(escena, 240, 170, 800, 380, colorFondo));
  elementos.push(texto(escena, 640, 190, tituloTexto, { tam: 26, negrita: true, origen: [0.5, 0], color: colorTitulo, ancho: 760, align: 'center' }));
  elementos.push(texto(escena, 270, 250, cuerpo, { tam: 17, ancho: 740 }));
  const cerrar = () => {
    elementos.forEach((e) => e.destroy());
    b.destruir();
  };
  const b = boton(escena, 640, 510, 240, 46, textoBoton, () => {
    cerrar();
    if (alCerrar) alCerrar();
  }, { tam: 18 });
  // La ventana siempre queda por encima de todo lo demás
  [...elementos, b.fondo, b.txt].forEach((e) => e.setDepth(1000));
  return cerrar;
}

/** Fondo de estrellas simple (círculos al azar). */
export function estrellas(escena, cantidad = 120) {
  for (let i = 0; i < cantidad; i++) {
    const x = Math.random() * ANCHO;
    const y = Math.random() * ALTO;
    escena.add.circle(x, y, Math.random() < 0.9 ? 1 : 2, 0xffffff, 0.3 + Math.random() * 0.6);
  }
}
