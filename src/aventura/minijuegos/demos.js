// =============================================================
// demos.js — "Cómo se juega" ANIMADO: el minijuego REAL se juega solo.
// No hay videos: se abre el minijuego de verdad y un "jugador automático"
// pulsa teclas y mueve el mouse con eventos normales del navegador
// (los mismos que usa una persona). Así la demo siempre coincide con el juego.
//
// Cada minijuego con demo deja su estado en op.pista (dónde está la fuga,
// hacia dónde apunta la nave, etc.) y aquí cada bot decide qué hacer.
// io = { mantener(codigo, si/no), pulsar(codigo), raton(x, y, tipo) }
// Los minijuegos sin bot muestran solo la tarjeta con las 3 líneas.
// =============================================================

const angulo = (a) => Math.atan2(Math.sin(a), Math.cos(a)); // entre -π y π

export const BOTS = {
  esquivar(p, io) {
    if (!p.mira) return;
    io.cursor(p.mira.x, p.mira.y);
    const peligro = p.peligros?.[0];
    if (!peligro) { io.mantener('ArrowLeft', false); io.mantener('ArrowRight', false); io.mantener('ArrowUp', false); io.mantener('ArrowDown', false); return; }
    // Se aleja del punto al que va el objeto (si hay pared, va para el otro lado)
    let dx = Math.sign(p.mira.x - peligro.tx) || 1; let dy = Math.sign(p.mira.y - peligro.ty) || 1;
    if (p.mira.x < 60) dx = 1; if (p.mira.x > 360) dx = -1;
    if (p.mira.y < 60) dy = 1; if (p.mira.y > 205) dy = -1;
    io.mantener('ArrowRight', dx > 0); io.mantener('ArrowLeft', dx < 0);
    io.mantener('ArrowDown', dy > 0); io.mantener('ArrowUp', dy < 0);
  },
  rumbo(p, io) {
    if (p.angulo === undefined) return;
    const d = angulo(p.anguloPlaneta - p.angulo);
    io.mantener('ArrowRight', d > 0.03); io.mantener('ArrowLeft', d < -0.03);
  },
  fuga(p, io, t) {
    if (!p.fuga) return;
    // 1,5 s: el cursor "busca" siguiendo a las partículas; después clic y mantener
    const f = Math.min(1, t / 1.5);
    const x = 210 + (p.fuga.x - 210) * f; const y = 130 + (p.fuga.y - 130) * f;
    io.raton(x, y, 'mousemove');
    if (f >= 1 && !p.apretado) { p.apretado = true; io.raton(x, y, 'mousedown'); io.marcar('Clic', true); }
  },
  equilibrio(p, io, t) {
    if (p.consumo === undefined) return;
    if (t - (p.ultimo || 0) < 0.25) return;
    p.ultimo = t;
    // Primero vuelve el O₂ al centro de la zona verde; después iguala producción y consumo
    const meta = p.consumo + (p.nivel < 45 ? 1 : p.nivel > 55 ? -1 : 0);
    if (p.control < meta - 0.3) io.pulsar('ArrowUp');
    else if (p.control > meta + 0.3) io.pulsar('ArrowDown');
  },
  retraso(p, io) {
    if (p.visto === undefined) return;
    if (p.boton) { const r = p.boton.getBoundingClientRect(); io.cursorPantalla(r.left + r.width / 2, r.top + r.height / 2); }
    if (!p.enviada && p.visto >= p.lineaEnvio) io.pulsar('Space');
  },
  acoplamiento(p, io) {
    if (p.y === undefined) return;
    io.mantener('ArrowUp', p.y > p.yPuerto + 3); io.mantener('ArrowDown', p.y < p.yPuerto - 3);
    io.mantener('ArrowLeft', p.v > p.vMax - 4);
  },
  termica(p, io, t) {
    if (p.temp === undefined || t - (p.ultimo || 0) < 0.6) return;
    if (p.boton) { const r = p.boton.getBoundingClientRect(); io.cursorPantalla(r.left + r.width / 2, r.top + r.height / 2); }
    if ((p.temp > 23 && !p.abiertos) || (p.temp < 20 && p.abiertos)) { p.ultimo = t; io.pulsar('Space'); }
  },
  ejercicio(p, io, t) {
    if (p.distancia === undefined) return;
    if (p.distancia < 9 && t - (p.ultimo || 0) > 0.4) { p.ultimo = t; io.pulsar('Space'); }
  },
  ventana(p, io, t) {
    if (!p.lista || t < 0.8 || p.hecho) return;
    // Hace clic, de a uno, en los paquetes ★★★
    const b = [...p.lista.querySelectorAll('[data-id]:not([disabled])')].find((x) => x.textContent.trim().startsWith('★★★'));
    if (!b) { p.hecho = true; return; }
    if (t - (p.ultimo || 0) < 0.7) return;
    p.ultimo = t;
    const r = b.getBoundingClientRect(); io.cursorPantalla(r.left + 30, r.top + r.height / 2); io.marcar('Clic', true); setTimeout(() => io.marcar('Clic', false), 250);
    b.click();
  },
  tormenta(p, io) {
    if (p.antena === undefined) return;
    const da = p.antenaBuena - p.antena;
    if (Math.abs(da) > 3) { io.mantener('ArrowRight', da > 0); io.mantener('ArrowLeft', da < 0); io.mantener('ArrowUp', false); io.mantener('ArrowDown', false); return; }
    io.mantener('ArrowRight', false); io.mantener('ArrowLeft', false);
    const df = p.frecuenciaBuena - p.frecuencia;
    io.mantener('ArrowUp', df > 1); io.mantener('ArrowDown', df < -1);
  }
};

const NOMBRE_TECLA = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Espacio', Clic: '🖱 Clic' };
const TECLAS_DE = {
  esquivar: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'], rumbo: ['ArrowLeft', 'ArrowRight'],
  fuga: ['Clic'], equilibrio: ['ArrowUp', 'ArrowDown'], retraso: ['Space'],
  acoplamiento: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], termica: ['Space'], ejercicio: ['Space'], ventana: ['Clic'], tormenta: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']
};

/**
 * Reproduce la demo de un minijuego dentro de "area" durante "segundos".
 * iniciar = la función del minijuego; opciones = sus valores del destino.
 * alTerminar() se llama al acabar (por tiempo o porque el bot ganó).
 * Devuelve detener().
 */
// Demos que necesitan más tiempo para verse completas (el rover y el satélite)
const DURACION = { retraso: 15, tormenta: 11, acoplamiento: 17, termica: 16, ejercicio: 15, ventana: 12 };

export function reproducirDemo(id, area, iniciar, opciones, alTerminar, segundos = 7) {
  const bot = BOTS[id];
  segundos = DURACION[id] ?? segundos;
  // El rover se muestra con el retraso de la Luna (corto) para que se vea entero
  if (id === 'retraso') opciones = { ...opciones, destinoId: 'luna', rondas: 1 };
  if (id === 'acoplamiento') opciones = { ...opciones, inicioX: 240 }; // la nave empieza más cerca para que la demo se vea entera
  if (id === 'termica') opciones = { ...opciones, segundos: 8 };
  if (id === 'ejercicio') opciones = { ...opciones, aciertos: 6 };
  if (id === 'ventana') opciones = { ...opciones, velocidad: 2.2 };
  area.innerHTML = '';
  area.classList.add('en-demo');
  const banda = document.createElement('div');
  banda.className = 'demo-banda';
  banda.textContent = '▶ DEMOSTRACIÓN: mira cómo se juega';
  area.appendChild(banda);
  const pista = {};
  let terminado = false;
  const limpiarJuego = iniciar(area, () => { setTimeout(fin, 600); }, { ...opciones, pista });
  const fila = document.createElement('div');
  fila.className = 'demo-teclas';
  fila.innerHTML = (TECLAS_DE[id] || []).map((k) => `<span class="tecla demo-tecla" data-k="${k}">${NOMBRE_TECLA[k]}</span>`).join('');
  area.appendChild(fila);
  const mano = document.createElement('div');
  mano.className = 'demo-mano';
  mano.textContent = '👆';
  area.appendChild(mano);
  mano.hidden = true;

  const mantenidas = new Set();
  const marcar = (k, si) => fila.querySelector(`[data-k="${k}"]`)?.classList.toggle('activa', si);
  const evento = (tipo, code) => window.dispatchEvent(new KeyboardEvent(tipo, { code, key: code === 'Space' ? ' ' : code, bubbles: true }));
  const aPantalla = (x, y) => {
    const c = pista.lienzo; const r = c.getBoundingClientRect();
    return [r.left + x * r.width / c.width, r.top + y * r.height / c.height];
  };
  const io = {
    mantener(code, si) {
      if (si && !mantenidas.has(code)) { mantenidas.add(code); evento('keydown', code); marcar(code, true); }
      if (!si && mantenidas.has(code)) { mantenidas.delete(code); evento('keyup', code); marcar(code, false); }
    },
    pulsar(code) { evento('keydown', code); evento('keyup', code); marcar(code, true); setTimeout(() => marcar(code, false), 220); },
    marcar,
    cursorPantalla(px, py) {
      const ra = area.getBoundingClientRect();
      mano.hidden = false; mano.style.left = `${px - ra.left}px`; mano.style.top = `${py - ra.top}px`;
    },
    cursor(x, y) { if (pista.lienzo) io.cursorPantalla(...aPantalla(x, y)); },
    raton(x, y, tipo) {
      if (!pista.lienzo) return;
      const [px, py] = aPantalla(x, y);
      io.cursorPantalla(px, py);
      pista.lienzo.dispatchEvent(new MouseEvent(tipo, { clientX: px, clientY: py, bubbles: true }));
    }
  };
  const inicio = performance.now();
  const reloj = setInterval(() => {
    const t = (performance.now() - inicio) / 1000;
    if (bot) bot(pista, io, t);
    if (t >= segundos) fin();
  }, 50);

  function fin() {
    if (terminado) return;
    terminado = true;
    clearInterval(reloj);
    for (const k of [...mantenidas]) io.mantener(k, false);
    if (pista.lienzo && pista.apretado) pista.lienzo.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    if (limpiarJuego) limpiarJuego();
    area.classList.remove('en-demo');
    area.innerHTML = '';
    alTerminar();
  }
  return fin;
}

export const tieneBot = (id) => !!BOTS[id];
