// =============================================================
// retrasoRover.js — Lógica pura del minijuego "Orden con retraso" (con prueba).
// D = retraso de la señal en segundos del juego. Luna: 1,3 s. Marte: 4 a 24 minutos
//     reales (dato de la NASA) → 1 minuto = 1/4 de segundo en el juego (1 a 6 s).
// La velocidad se elige para que el rover tarde en llegar a la zona verde
// 2 × D (lo que ves es de hace D y tu orden tarda D) + 3 a 5 s para reaccionar:
// así SIEMPRE se puede ganar.
// lineaEnvio = posición (de lo que VES) en la que conviene enviar la orden.
// =============================================================
export function parametrosRetraso(destinoId = 'luna', rng = Math.random) {
  const D = destinoId === 'marte' ? (4 + rng() * 20) / 4 : 1.3;
  const x0 = 20;
  const zona = { a: 300, b: 340 };
  const centro = (zona.a + zona.b) / 2;
  const v = (zona.a - x0) / (2 * D + 3 + rng() * 2);
  // El rover que ves cruza esta línea 2·D segundos antes de que el real llegue al centro de la zona
  const lineaEnvio = centro - v * 2 * D;
  return { D, v, x0, zona, lineaEnvio };
}

/**
 * Simula una ronda: el jugador envía la orden cuando el rover QUE VE cruza la
 * posición "xVisto". Devuelve dónde se detiene el rover real.
 */
export function dondeFrena({ D, v, x0 }, xVisto) {
  const tVisto = (xVisto - x0) / v; // momento en que el rover real pasó por xVisto
  const envio = tVisto + D;          // lo ves D segundos después y envías
  return x0 + v * (envio + D);       // la orden tarda otros D en llegar
}
