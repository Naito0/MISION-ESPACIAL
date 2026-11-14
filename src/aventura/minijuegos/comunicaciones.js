// =============================================================
// Minijuegos de COMUNICACIONES (segmento terrestre):
//   sintonizar (frecuencia) · apuntar (antena a la Tierra) · ordenar (paquetes)
// =============================================================
import { lienzo, mezclar } from './base.js';

/** Sintonizar: mover el dial hasta que tu onda coincida con la de la Tierra y mantenerla 1,5 s. */
export function sintonizar(area, terminar) {
  const { c, g } = lienzo(area, 420, 180);
  const dial = document.createElement('input');
  dial.type = 'range'; dial.min = 1; dial.max = 10; dial.step = 0.05; dial.value = Math.random() < 0.5 ? 1.5 : 9.5;
  dial.className = 'dial';
  area.appendChild(dial);
  const meta = 3 + Math.random() * 5;
  let sintonizado = 0;
  let anterior = performance.now();
  let fase = 0;
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    fase += dt * 3;
    const f = Number(dial.value);
    const cerca = Math.abs(f - meta) < 0.18;
    sintonizado = cerca ? sintonizado + dt : 0;
    g.fillStyle = '#04101f'; g.fillRect(0, 0, c.width, c.height);
    const onda = (frec, color, ruido) => {
      g.strokeStyle = color; g.lineWidth = 3; g.beginPath();
      for (let x = 0; x < 420; x += 3) g.lineTo(x, 90 + Math.sin(x / 420 * frec * Math.PI * 2 + fase) * 40 + (Math.random() - 0.5) * ruido);
      g.stroke();
    };
    onda(meta, 'rgba(124,243,255,0.5)', 0);
    onda(f, cerca ? '#5be08a' : '#ff9fdc', cerca ? 0 : 14);
    g.fillStyle = '#fff'; g.font = '16px Arial';
    g.fillText(cerca ? `¡Señal clara! ${(1.5 - sintonizado).toFixed(1)} s` : 'Mueve el dial hasta que las ondas coincidan', 10, 20);
    if (sintonizado >= 1.5) return terminar(true);
    id = requestAnimationFrame(cuadro);
  }
  return () => cancelAnimationFrame(id);
}

/** Apuntar la antena: seguir a la Tierra con la mira (mouse) hasta juntar 2 s de señal. */
export function apuntar(area, terminar) {
  const { c, g } = lienzo(area, 420, 260);
  let mx = 210; let my = 130; let señal = 0; let t = 0;
  c.onmousemove = (e) => { const r = c.getBoundingClientRect(); mx = (e.clientX - r.left) * (c.width / r.width); my = (e.clientY - r.top) * (c.height / r.height); };
  let anterior = performance.now();
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    t += dt;
    const tx = 210 + Math.sin(t * 0.9) * 150; const ty = 130 + Math.sin(t * 1.4) * 80;
    const dentro = Math.hypot(mx - tx, my - ty) < 26;
    señal = dentro ? señal + dt : Math.max(0, señal - dt * 0.3);
    g.fillStyle = '#04101f'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#2f6fd6'; g.beginPath(); g.arc(tx, ty, 16, 0, 7); g.fill();
    g.strokeStyle = dentro ? '#5be08a' : '#ff9fdc'; g.lineWidth = 2;
    g.beginPath(); g.arc(mx, my, 26, 0, 7); g.moveTo(mx - 34, my); g.lineTo(mx + 34, my); g.moveTo(mx, my - 34); g.lineTo(mx, my + 34); g.stroke();
    g.fillStyle = '#fff'; g.font = '16px Arial'; g.fillText(`Sigue a la Tierra con la mira · señal ${Math.min(2, señal).toFixed(1)} / 2 s`, 10, 20);
    if (señal >= 2) return terminar(true);
    id = requestAnimationFrame(cuadro);
  }
  return () => cancelAnimationFrame(id);
}

/** Ordenar paquetes: hacer clic en los paquetes en orden, del 1 al 6. */
export function ordenar(area, terminar) {
  const caja = document.createElement('div');
  caja.className = 'paquetes';
  const numeros = mezclar([1, 2, 3, 4, 5, 6]);
  caja.innerHTML = `${numeros.map((n) => `<button data-n="${n}">📦 ${n}</button>`).join('')}<p class="consola-msg">Toca los paquetes en orden: 1, 2, 3…</p>`;
  area.appendChild(caja);
  let siguiente = 1;
  caja.querySelectorAll('button').forEach((b) => {
    b.onclick = () => {
      if (Number(b.dataset.n) === siguiente) {
        b.disabled = true; b.classList.add('ok');
        if (++siguiente > 6) terminar(true);
      } else {
        siguiente = 1;
        caja.querySelectorAll('button').forEach((x) => { x.disabled = false; x.classList.remove('ok'); });
        caja.querySelector('.consola-msg').textContent = '¡Desordenado! Empieza otra vez desde el 1.';
      }
    };
  });
  return () => {};
}
