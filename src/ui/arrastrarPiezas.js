// =============================================================
// arrastrarPiezas.js — Armar la nave ARRASTRANDO piezas.
// Convierte una tarjeta (un boton() de ui.js) en algo que se puede arrastrar.
//   - Si se suelta sobre la zona de la nave → alSoltar() (la pieza "encaja").
//   - Si casi no se movió → cuenta como un clic (también la elige).
//   - Si se suelta fuera → vuelve a su lugar con una animación.
// =============================================================

/**
 * @param carta  objeto devuelto por boton() (tiene fondo y txt)
 * @param zona   { x, y, ancho, alto } donde se puede soltar (la nave)
 * @param o.alSoltar   función que se llama al soltar en la zona (o al hacer clic)
 * @param o.alEmpezar  (opcional) al empezar a arrastrar
 * @param o.alTerminar (opcional) al terminar, se haya soltado donde se haya soltado
 */
export function hacerArrastrable(escena, carta, zona, o) {
  const { fondo, txt } = carta;
  const origen = { x: fondo.x, y: fondo.y };
  let movido = 0;
  escena.input.setDraggable(fondo);

  fondo.on('dragstart', () => {
    movido = 0;
    fondo.setDepth(800);
    txt.setDepth(801);
    if (o.alEmpezar) o.alEmpezar();
  });

  fondo.on('drag', (_p, x, y) => {
    movido = Math.max(movido, Math.hypot(x - origen.x, y - origen.y));
    fondo.setPosition(x, y);
    txt.setPosition(x, y);
    // Se achica un poco al acercarse a la nave, como si "quisiera" encajar
    const dentro = estaDentro(x, y, zona);
    fondo.setScale(dentro ? 0.85 : 1);
    txt.setScale(dentro ? 0.85 : 1);
  });

  fondo.on('dragend', (p) => {
    const volver = () => {
      escena.tweens.add({ targets: [fondo, txt], x: origen.x, y: origen.y, scale: 1, duration: 250, ease: 'Back.easeOut' });
      fondo.setDepth(0);
      txt.setDepth(0);
    };
    if (movido < 6) {
      // Fue un clic
      fondo.setPosition(origen.x, origen.y);
      txt.setPosition(origen.x, origen.y);
      if (o.alTerminar) o.alTerminar(false);
      o.alSoltar();
      return;
    }
    if (estaDentro(p.x, p.y, zona)) {
      // ¡Encaja! La tarjeta "entra" en la nave y desaparece
      escena.tweens.add({
        targets: [fondo, txt], x: zona.x + zona.ancho / 2, y: zona.y + zona.alto / 2, scale: 0.2, alpha: 0, duration: 200,
        onComplete: () => {
          if (o.alTerminar) o.alTerminar(true);
          o.alSoltar();
        }
      });
    } else {
      if (o.alTerminar) o.alTerminar(false);
      volver();
    }
  });
}

function estaDentro(x, y, z) {
  return x >= z.x && x <= z.x + z.ancho && y >= z.y && y <= z.y + z.alto;
}
