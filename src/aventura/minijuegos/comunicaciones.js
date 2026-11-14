// =============================================================
// Minijuegos de COMUNICACIONES (segmento terrestre):
//   sintonizar (frecuencia) · apuntar (señal con la Tierra) · ordenar (paquetes)
// "op" trae los pasos según la dificultad (dificultad.json → minijuegos).
// =============================================================
import { lienzo, mezclar } from './base.js';

/** Sintonizar: mover el dial hasta que tu onda coincida con la de la Tierra y mantenerla. */
export function sintonizar(area, terminar, op = {}) {
  const tolerancia = op.tolerancia ?? 0.18;
  const meta = op.segundos ?? 1.5;
  const { c, g } = lienzo(area, 420, 180);
  const dial = document.createElement('input');
  dial.type = 'range'; dial.min = 1; dial.max = 10; dial.step = 0.05; dial.value = Math.random() < 0.5 ? 1.5 : 9.5;
  dial.className = 'dial';
  area.appendChild(dial);
  const frecuencia = 3 + Math.random() * 5;
  let sintonizado = 0;
  let anterior = performance.now();
  let fase = 0;
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    fase += dt * 3;
    const f = Number(dial.value);
    const cerca = Math.abs(f - frecuencia) < tolerancia;
    sintonizado = cerca ? sintonizado + dt : 0;
    g.fillStyle = '#04101f'; g.fillRect(0, 0, c.width, c.height);
    const onda = (frec, color, ruido) => {
      g.strokeStyle = color; g.lineWidth = 3; g.beginPath();
      for (let x = 0; x < 420; x += 3) g.lineTo(x, 90 + Math.sin(x / 420 * frec * Math.PI * 2 + fase) * 40 + (Math.random() - 0.5) * ruido);
      g.stroke();
    };
    onda(frecuencia, 'rgba(124,243,255,0.5)', 0);
    onda(f, cerca ? '#5be08a' : '#ff9fdc', cerca ? 0 : 14);
    g.fillStyle = '#fff'; g.font = '16px Arial';
    g.fillText(cerca ? `¡Señal clara! ${Math.max(0, meta - sintonizado).toFixed(1)} s` : 'Mueve el dial hasta que las ondas coincidan', 10, 20);
    if (sintonizado >= meta) return terminar(true);
    id = requestAnimationFrame(cuadro);
  }
  return () => cancelAnimationFrame(id);
}

/** Recuperar la señal: seguir a la Tierra con la mira (mouse) hasta juntar unos segundos de señal. */
export function apuntar(area, terminar, op = {}) {
  const radio = op.radio ?? 26;
  const meta = op.segundos ?? 2;
  const { c, g } = lienzo(area, 420, 260);
  let mx = 210; let my = 130; let señal = 0; let t = 0;
  c.onmousemove = (e) => { const r = c.getBoundingClientRect(); mx = (e.clientX - r.left) * (c.width / r.width); my = (e.clientY - r.top) * (c.height / r.height); };
  let anterior = performance.now();
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    t += dt;
    const tx = 210 + Math.sin(t * 0.8) * 150; const ty = 130 + Math.sin(t * 1.2) * 80;
    const dentro = Math.hypot(mx - tx, my - ty) < radio;
    señal = dentro ? señal + dt : Math.max(0, señal - dt * 0.3);
    g.fillStyle = '#04101f'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#2f6fd6'; g.beginPath(); g.arc(tx, ty, 16, 0, 7); g.fill();
    g.strokeStyle = dentro ? '#5be08a' : '#ff9fdc'; g.lineWidth = 2;
    g.beginPath(); g.arc(mx, my, radio, 0, 7); g.moveTo(mx - radio - 8, my); g.lineTo(mx + radio + 8, my); g.moveTo(mx, my - radio - 8); g.lineTo(mx, my + radio + 8); g.stroke();
    g.fillStyle = '#fff'; g.font = '16px Arial'; g.fillText(`Sigue a la Tierra · señal ${Math.min(meta, señal).toFixed(1)} / ${meta} s`, 10, 20);
    if (señal >= meta) return terminar(true);
    id = requestAnimationFrame(cuadro);
  }
  return () => cancelAnimationFrame(id);
}

/** Ordenar paquetes: hacer clic en los paquetes en orden, del 1 al N. */
export function ordenar(area, terminar, op = {}) {
  const n = op.paquetes ?? 6;
  const caja = document.createElement('div');
  caja.className = 'paquetes';
  const numeros = mezclar(Array.from({ length: n }, (_, i) => i + 1));
  caja.innerHTML = `${numeros.map((k) => `<button data-n="${k}">📦 ${k}</button>`).join('')}<p class="consola-msg">Toca en orden: 1, 2, 3…</p>`;
  area.appendChild(caja);
  let siguiente = 1;
  caja.querySelectorAll('button').forEach((b) => {
    b.onclick = () => {
      if (Number(b.dataset.n) === siguiente) {
        b.disabled = true; b.classList.add('ok');
        if (++siguiente > n) terminar(true);
      } else {
        siguiente = 1;
        caja.querySelectorAll('button').forEach((x) => { x.disabled = false; x.classList.remove('ok'); });
        caja.querySelector('.consola-msg').textContent = '¡Desordenado! Otra vez desde el 1.';
      }
    };
  });
  return () => {};
}
