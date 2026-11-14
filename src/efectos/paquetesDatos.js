// =============================================================
// paquetesDatos.js — Paquetes de datos que viajan de la nave a una
// estación terrena (o a la Tierra). Si el enlace falla, el paquete
// se pierde a mitad de camino (en rojo).
// =============================================================

/**
 * Envía un paquete desde 'desde' hasta 'hasta' ({ x, y }).
 * perdido = true → el paquete se desvanece a mitad de camino.
 */
export function enviarPaquete(escena, desde, hasta, perdido = false, profundidad = 5) {
  const p = escena.add.rectangle(desde.x, desde.y, 6, 6, perdido ? 0xe5484d : 0x7cf3ff).setDepth(profundidad);
  p.setAngle(45);
  const destinoX = perdido ? desde.x + (hasta.x - desde.x) * 0.5 : hasta.x;
  const destinoY = perdido ? desde.y + (hasta.y - desde.y) * 0.5 : hasta.y;
  escena.tweens.add({
    targets: p, x: destinoX, y: destinoY,
    alpha: perdido ? 0 : 0.9,
    duration: 700,
    ease: 'Sine.easeIn',
    onComplete: () => {
      if (!perdido) {
        // Pequeño destello al llegar
        const brillo = escena.add.circle(hasta.x, hasta.y, 4, 0x7cf3ff, 0.8).setDepth(profundidad);
        escena.tweens.add({ targets: brillo, scale: 3, alpha: 0, duration: 300, onComplete: () => brillo.destroy() });
      }
      p.destroy();
    }
  });
}
