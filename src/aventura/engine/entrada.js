// =============================================================
// entrada.js — Controles de cada jugador, con una misma "forma" de leerlos:
//   leer() → { moverX, moverY, camaraX, camaraY, zoom, correr,
//              saltar (recién pulsado), interactuar (mantenido),
//              interactuarPulsado (recién pulsado) }
//
// Distribuciones de teclado (sin teclas repetidas entre jugadores):
//   teclado1: WASD mover · mouse cámara · Espacio saltar · Shift izq. correr · E interactuar
//   teclado2: flechas mover · Numpad 4/6/8/5 cámara · Numpad 0 saltar · Shift der. correr · Enter interactuar
// Mandos (Gamepad API): stick izq. mover · stick der. cámara · A saltar · X interactuar · LB/gatillo correr
// =============================================================

const teclasPulsadas = new Set();
const teclasRecien = new Set();
window.addEventListener('keydown', (e) => {
  if (!teclasPulsadas.has(e.code)) teclasRecien.add(e.code);
  teclasPulsadas.add(e.code);
  // Que las flechas, el espacio y el numpad no muevan la página
  if (e.code.startsWith('Arrow') || e.code === 'Space' || e.code.startsWith('Numpad')) e.preventDefault();
});
window.addEventListener('keyup', (e) => teclasPulsadas.delete(e.code));
window.addEventListener('blur', () => teclasPulsadas.clear());

/** Se llama al final de cada cuadro para olvidar las teclas "recién pulsadas". */
export function finDeCuadro() {
  teclasRecien.clear();
}

const DISTRIBUCIONES = {
  teclado1: {
    nombre: 'Teclado (WASD + mouse)',
    arriba: 'KeyW', abajo: 'KeyS', izquierda: 'KeyA', derecha: 'KeyD',
    camIzq: 'KeyQ', camDer: 'KeyR', camArriba: null, camAbajo: null,
    saltar: 'Space', correr: 'ShiftLeft', interactuar: 'KeyE', usaMouse: true
  },
  teclado2: {
    nombre: 'Teclado (flechas + numpad)',
    arriba: 'ArrowUp', abajo: 'ArrowDown', izquierda: 'ArrowLeft', derecha: 'ArrowRight',
    camIzq: 'Numpad4', camDer: 'Numpad6', camArriba: 'Numpad8', camAbajo: 'Numpad5',
    saltar: 'Numpad0', correr: 'ShiftRight', interactuar: 'Enter', usaMouse: false
  }
};

/** Control de teclado (y mouse si la distribución lo usa). */
export function crearControlTeclado(distribucion = 'teclado1', elementoMouse = null) {
  const d = DISTRIBUCIONES[distribucion];
  let mouseX = 0;
  let mouseY = 0;
  let rueda = 0;
  if (d.usaMouse && elementoMouse) {
    // Clic en el juego → el mouse queda "capturado" para girar la cámara
    elementoMouse.addEventListener('click', () => { if (!document.pointerLockElement) elementoMouse.requestPointerLock?.(); });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === elementoMouse) { mouseX += e.movementX; mouseY += e.movementY; }
    });
    elementoMouse.addEventListener('wheel', (e) => { rueda += Math.sign(e.deltaY); }, { passive: true });
  }
  const p = (codigo) => (codigo ? teclasPulsadas.has(codigo) : false);
  const r = (codigo) => (codigo ? teclasRecien.has(codigo) : false);
  return {
    tipo: 'teclado', nombre: d.nombre,
    leer() {
      const lectura = {
        moverX: (p(d.derecha) ? 1 : 0) - (p(d.izquierda) ? 1 : 0),
        moverY: (p(d.arriba) ? 1 : 0) - (p(d.abajo) ? 1 : 0),
        // El mouse da píxeles; las teclas dan una velocidad fija
        camaraX: mouseX * 0.0025 + ((p(d.camDer) ? 1 : 0) - (p(d.camIzq) ? 1 : 0)) * 0.035,
        camaraY: mouseY * 0.0025 + ((p(d.camAbajo) ? 1 : 0) - (p(d.camArriba) ? 1 : 0)) * 0.025,
        zoom: rueda,
        correr: p(d.correr),
        saltar: r(d.saltar),
        interactuar: p(d.interactuar),
        interactuarPulsado: r(d.interactuar)
      };
      mouseX = 0; mouseY = 0; rueda = 0;
      return lectura;
    }
  };
}

/** Control de un mando (Gamepad API). indice = número de mando (0 a 3). */
export function crearControlMando(indice) {
  let antes = { saltar: false, interactuar: false };
  const zonaMuerta = (v) => (Math.abs(v) < 0.18 ? 0 : v);
  return {
    tipo: 'mando', nombre: `Mando ${indice + 1}`,
    conectado: () => !!(navigator.getGamepads && navigator.getGamepads()[indice]),
    leer() {
      const g = navigator.getGamepads ? navigator.getGamepads()[indice] : null;
      if (!g) return { moverX: 0, moverY: 0, camaraX: 0, camaraY: 0, zoom: 0, correr: false, saltar: false, interactuar: false, interactuarPulsado: false };
      const boton = (i) => !!(g.buttons[i] && g.buttons[i].pressed);
      const saltar = boton(0);       // A / Cruz
      const interactuar = boton(2);  // X / Cuadrado
      const lectura = {
        moverX: zonaMuerta(g.axes[0] || 0),
        moverY: -zonaMuerta(g.axes[1] || 0),
        camaraX: zonaMuerta(g.axes[2] || 0) * 0.05,
        camaraY: zonaMuerta(g.axes[3] || 0) * 0.04,
        zoom: (boton(13) ? 1 : 0) - (boton(12) ? 1 : 0),
        correr: boton(4) || boton(6) || boton(10),
        saltar: saltar && !antes.saltar,
        interactuar,
        interactuarPulsado: interactuar && !antes.interactuar
      };
      antes = { saltar, interactuar };
      return lectura;
    }
  };
}

export { DISTRIBUCIONES };
