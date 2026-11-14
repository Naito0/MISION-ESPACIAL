// =============================================================
// Minijuegos del COMANDANTE / PILOTO (segmento de lanzamiento):
//   trayectoria · ritmo (frenado) · esquivar (meteoritos)
// Cada minijuego recibe (area, terminar, op): "op" trae los pasos según la
// dificultad (dificultad.json → minijuegos). terminar(true/false).
// =============================================================
import { lienzo, teclas } from './base.js';

/** Corregir la trayectoria: girar la nave (← →) hasta apuntar al planeta y mantenerla unos segundos. */
export function trayectoria(area, terminar, op = {}) {
  const meta = op.segundos ?? 1.5;
  const { c, g } = lienzo(area);
  const t = teclas();
  const objetivo = (-60 + Math.random() * 120) * Math.PI / 180;
  let angulo = objetivo + (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 0.6);
  let alineado = 0;
  let deriva = (Math.random() < 0.5 ? -1 : 1) * 0.25;
  let anterior = performance.now();
  const botones = document.createElement('div');
  botones.className = 'consola-botones';
  botones.innerHTML = '<button data-d="-1">◀ Girar</button><button data-d="1">Girar ▶</button>';
  area.appendChild(botones);
  let pulsado = 0;
  botones.querySelectorAll('button').forEach((b) => {
    b.onpointerdown = () => { pulsado = Number(b.dataset.d); };
    b.onpointerup = b.onpointerleave = () => { pulsado = 0; };
  });
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    const giro = (t.s.has('ArrowLeft') || t.s.has('KeyA') ? -1 : 0) + (t.s.has('ArrowRight') || t.s.has('KeyD') ? 1 : 0) + pulsado;
    angulo += (giro * 1.3 + deriva) * dt;
    if (Math.random() < 0.01) deriva = -deriva;
    const dif = Math.abs(Math.atan2(Math.sin(angulo - objetivo), Math.cos(angulo - objetivo)));
    alineado = dif < 0.12 ? alineado + dt : 0;
    g.fillStyle = '#04101f'; g.fillRect(0, 0, c.width, c.height);
    const cx = 80; const cy = 120;
    const px = cx + Math.cos(objetivo) * 280; const py = cy + Math.sin(objetivo) * 280;
    g.fillStyle = '#d2693c'; g.beginPath(); g.arc(Math.min(px, 390), Math.max(30, Math.min(py, 210)), 22, 0, 7); g.fill();
    g.strokeStyle = 'rgba(124,243,255,0.4)'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(objetivo) * 400, cy + Math.sin(objetivo) * 400); g.stroke(); g.setLineDash([]);
    g.save(); g.translate(cx, cy); g.rotate(angulo);
    g.fillStyle = dif < 0.12 ? '#5be08a' : '#ffd166'; g.beginPath(); g.moveTo(26, 0); g.lineTo(-14, -12); g.lineTo(-14, 12); g.fill(); g.restore();
    g.fillStyle = '#fff'; g.font = '16px Arial'; g.fillText(dif < 0.12 ? `¡Alineado! ${Math.max(0, meta - alineado).toFixed(1)} s` : 'Apunta la nave al planeta', 150, 225);
    if (alineado >= meta) return terminar(true);
    id = requestAnimationFrame(cuadro);
  }
  return () => { cancelAnimationFrame(id); t.quitar(); };
}

/** Frenado: pulsar Espacio (o el botón) cuando la marca pasa por la zona verde, N veces. */
export function ritmo(area, terminar, op = {}) {
  const necesarios = op.aciertos ?? 3;
  const { c, g } = lienzo(area, 420, 120);
  const boton = document.createElement('button');
  boton.className = 'consola-grande';
  boton.textContent = '🔥 ¡Encender! (Espacio)';
  area.appendChild(boton);
  let pos = 0; let dir = 1; let aciertos = 0;
  let zona = 160 + Math.random() * 160;
  let mensaje = `Enciende en la zona verde (${necesarios} veces)`;
  let anterior = performance.now();
  const pulsar = () => {
    if (Math.abs(pos - zona) < 30) { aciertos++; mensaje = `¡Bien! ${aciertos} de ${necesarios}`; zona = 60 + Math.random() * 300; if (aciertos >= necesarios) terminar(true); }
    else { aciertos = Math.max(0, aciertos - 1); mensaje = 'Muy pronto o muy tarde…'; }
  };
  const tecla = (e) => { if (e.code === 'Space') { e.preventDefault(); pulsar(); } };
  window.addEventListener('keydown', tecla);
  boton.onclick = pulsar;
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    pos += dir * (200 + aciertos * 50) * dt;
    if (pos > 400 || pos < 20) dir = -dir;
    g.fillStyle = '#04101f'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#1a2342'; g.fillRect(20, 50, 380, 30);
    g.fillStyle = '#3cc46e'; g.fillRect(zona - 30, 50, 60, 30);
    g.fillStyle = '#ffd166'; g.fillRect(pos - 3, 40, 6, 50);
    g.fillStyle = '#fff'; g.font = '16px Arial'; g.fillText(mensaje, 20, 25);
    id = requestAnimationFrame(cuadro);
  }
  return () => { cancelAnimationFrame(id); window.removeEventListener('keydown', tecla); };
}

/** Esquivar micrometeoritos: mover la nave (← → o mouse) unos segundos. Si se acaba el escudo, falla. */
export function esquivar(area, terminar, op = {}) {
  const duracion = op.segundos ?? 8;
  const { c, g } = lienzo(area, 420, 260);
  const t = teclas();
  let x = 210; let vidas = op.escudo ?? 3; let tiempo = 0; let golpeado = 0;
  const rocas = [];
  let anterior = performance.now();
  c.onmousemove = (e) => { const r = c.getBoundingClientRect(); x = (e.clientX - r.left) * (c.width / r.width); };
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    tiempo += dt;
    x += ((t.s.has('ArrowRight') || t.s.has('KeyD') ? 1 : 0) - (t.s.has('ArrowLeft') || t.s.has('KeyA') ? 1 : 0)) * 260 * dt;
    x = Math.max(20, Math.min(400, x));
    if (Math.random() < 0.05 + tiempo * 0.005) rocas.push({ x: Math.random() * 420, y: -10, v: 110 + Math.random() * 110, r: 6 + Math.random() * 8 });
    g.fillStyle = '#04101f'; g.fillRect(0, 0, c.width, c.height);
    for (const r of rocas) {
      r.y += r.v * dt;
      g.fillStyle = '#b0a090'; g.beginPath(); g.arc(r.x, r.y, r.r, 0, 7); g.fill();
      if (!r.choco && Math.hypot(r.x - x, r.y - 230) < r.r + 14) { r.choco = true; vidas--; golpeado = 0.3; }
    }
    g.fillStyle = golpeado > 0 ? '#ff5a5a' : '#dfe6f5';
    golpeado -= dt;
    g.beginPath(); g.moveTo(x, 215); g.lineTo(x - 14, 245); g.lineTo(x + 14, 245); g.fill();
    g.fillStyle = '#fff'; g.font = '16px Arial';
    g.fillText(`Escudo: ${'❤'.repeat(Math.max(0, vidas))}   Aguanta: ${Math.max(0, duracion - tiempo).toFixed(1)} s`, 10, 20);
    if (vidas <= 0) return terminar(false);
    if (tiempo >= duracion) return terminar(true);
    id = requestAnimationFrame(cuadro);
  }
  return () => { cancelAnimationFrame(id); t.quitar(); };
}
