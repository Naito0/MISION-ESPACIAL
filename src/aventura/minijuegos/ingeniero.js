// =============================================================
// Minijuegos del INGENIERO (segmento espacial):
//   cables (circuitos) · soldar (fuga en el casco) · deslizadores (energía)
// =============================================================
import { lienzo, mezclar } from './base.js';

const COLORES = ['#e5484d', '#3d77d8', '#f2c14e', '#3cc46e'];

/** Reconectar circuitos: clic en un cable de la izquierda y luego en el del mismo color a la derecha. */
export function cables(area, terminar) {
  const caja = document.createElement('div');
  caja.className = 'cables';
  const izq = mezclar(COLORES);
  const der = mezclar(COLORES);
  caja.innerHTML = `<div class="col">${izq.map((c) => `<button data-l="${c}" style="background:${c}"></button>`).join('')}</div>
    <svg class="lineas" width="200" height="200"></svg>
    <div class="col">${der.map((c) => `<button data-r="${c}" style="background:${c}"></button>`).join('')}</div>`;
  area.appendChild(caja);
  const svg = caja.querySelector('svg');
  let elegido = null; let hechos = 0;
  caja.querySelectorAll('[data-l]').forEach((b) => { b.onclick = () => { if (b.disabled) return; elegido = b; caja.querySelectorAll('[data-l]').forEach((x) => x.classList.toggle('elegido', x === b)); }; });
  caja.querySelectorAll('[data-r]').forEach((b) => {
    b.onclick = () => {
      if (!elegido || b.disabled) return;
      if (elegido.dataset.l === b.dataset.r) {
        const y1 = izq.indexOf(elegido.dataset.l) * 50 + 25;
        const y2 = der.indexOf(b.dataset.r) * 50 + 25;
        svg.innerHTML += `<line x1="0" y1="${y1}" x2="200" y2="${y2}" stroke="${b.dataset.r}" stroke-width="8"/>`;
        elegido.disabled = true; b.disabled = true; elegido.classList.remove('elegido'); elegido = null;
        if (++hechos === 4) setTimeout(() => terminar(true), 250);
      } else { b.classList.add('mal'); setTimeout(() => b.classList.remove('mal'), 250); }
    };
  });
  return () => {};
}

/** Sellar la fuga: hacer clic 3 veces sobre cada grieta del casco. */
export function soldar(area, terminar) {
  const { c, g } = lienzo(area, 420, 240);
  const grietas = Array.from({ length: 5 }, () => ({ x: 40 + Math.random() * 340, y: 30 + Math.random() * 180, a: Math.random() * 3, clics: 0 }));
  const chispas = [];
  c.onclick = (e) => {
    const r = c.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (c.width / r.width); const my = (e.clientY - r.top) * (c.height / r.height);
    for (const k of grietas) {
      if (k.clics < 3 && Math.hypot(mx - k.x, my - k.y) < 30) {
        k.clics++;
        for (let i = 0; i < 8; i++) chispas.push({ x: k.x, y: k.y, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.8) * 200, t: 0.4 });
        if (grietas.every((q) => q.clics >= 3)) setTimeout(() => terminar(true), 300);
        break;
      }
    }
  };
  let anterior = performance.now();
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    g.fillStyle = '#5b6275'; g.fillRect(0, 0, c.width, c.height);
    for (const k of grietas) {
      g.save(); g.translate(k.x, k.y); g.rotate(k.a);
      g.strokeStyle = k.clics >= 3 ? '#9aa0ad' : ['#ff5a36', '#ff8a5a', '#d6a090'][k.clics]; g.lineWidth = 7 - k.clics;
      g.beginPath(); g.moveTo(-30, 0); g.lineTo(-10, 6); g.lineTo(5, -5); g.lineTo(30, 3); g.stroke(); g.restore();
      if (k.clics < 3) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(k.x + 18, k.y - 12, 4 + Math.random() * 3, 0, 7); g.fill(); } // vapor
    }
    for (const s of chispas) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.t > 0) { g.fillStyle = '#ffe08a'; g.fillRect(s.x, s.y, 3, 3); } }
    id = requestAnimationFrame(cuadro);
  }
  return () => cancelAnimationFrame(id);
}

/** Redirigir la energía: llevar cada deslizador a su marca (±5) y confirmar. */
export function deslizadores(area, terminar) {
  const sistemas = ['Motor', 'Soporte vital', 'Escudos'];
  const metas = sistemas.map(() => 15 + Math.floor(Math.random() * 70));
  const caja = document.createElement('div');
  caja.className = 'deslizadores';
  caja.innerHTML = sistemas.map((s, i) => `
    <label>${s}<div class="riel"><div class="meta" style="left:${metas[i]}%"></div>
    <input type="range" min="0" max="100" value="${Math.random() < 0.5 ? 5 : 95}" data-i="${i}"></div></label>`).join('') +
    '<button class="consola-grande">⚡ Confirmar</button><p class="consola-msg"></p>';
  area.appendChild(caja);
  caja.querySelector('button').onclick = () => {
    const ok = [...caja.querySelectorAll('input')].every((inp) => Math.abs(Number(inp.value) - metas[inp.dataset.i]) <= 5);
    if (ok) terminar(true);
    else caja.querySelector('.consola-msg').textContent = 'Todavía no: cada barra debe quedar sobre su marca amarilla.';
  };
  return () => {};
}
