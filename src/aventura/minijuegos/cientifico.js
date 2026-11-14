// =============================================================
// Minijuegos del CIENTÍFICO / MÉDICO (segmento de usuario):
//   nivel (oxígeno) · secuencia (analizar muestra) · regar (invernadero)
// =============================================================
import { lienzo } from './base.js';

/** Regular el oxígeno: mantener pulsado para subir el nivel y dejarlo en la zona verde 5 s. */
export function nivel(area, terminar) {
  const { c, g } = lienzo(area, 420, 200);
  const boton = document.createElement('button');
  boton.className = 'consola-grande';
  boton.textContent = '💨 Mantener para liberar oxígeno (Espacio)';
  area.appendChild(boton);
  let n = Math.random() < 0.5 ? 15 : 85; let enZona = 0; let subiendo = false;
  boton.onpointerdown = () => { subiendo = true; };
  boton.onpointerup = boton.onpointerleave = () => { subiendo = false; };
  const abajo = (e) => { if (e.code === 'Space') { e.preventDefault(); subiendo = true; } };
  const arriba = (e) => { if (e.code === 'Space') subiendo = false; };
  window.addEventListener('keydown', abajo); window.addEventListener('keyup', arriba);
  let anterior = performance.now();
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    n += (subiendo ? 38 : -26) * dt + (Math.random() - 0.5) * 20 * dt;
    n = Math.max(0, Math.min(100, n));
    enZona = n > 40 && n < 60 ? enZona + dt : Math.max(0, enZona - dt * 0.5);
    g.fillStyle = '#04101f'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#1a2342'; g.fillRect(180, 20, 60, 160);
    g.fillStyle = 'rgba(60,196,110,0.4)'; g.fillRect(180, 20 + 160 * 0.4, 60, 160 * 0.2);
    g.fillStyle = n > 40 && n < 60 ? '#5be08a' : '#7cc4ff'; g.fillRect(180, 180 - n * 1.6, 60, n * 1.6);
    g.fillStyle = '#fff'; g.font = '16px Arial';
    g.fillText(`O₂ estable: ${Math.min(5, enZona).toFixed(1)} / 5 s`, 260, 100);
    if (enZona >= 5) return terminar(true);
    id = requestAnimationFrame(cuadro);
  }
  return () => { cancelAnimationFrame(id); window.removeEventListener('keydown', abajo); window.removeEventListener('keyup', arriba); };
}

/** Analizar la muestra: mirar la secuencia de colores del analizador y repetirla. */
export function secuencia(area, terminar) {
  const colores = ['#e5484d', '#3d77d8', '#f2c14e', '#3cc46e'];
  const caja = document.createElement('div');
  caja.className = 'secuencia';
  caja.innerHTML = `<p class="consola-msg">Mira la secuencia…</p><div class="botones4">${colores.map((c, i) => `<button data-i="${i}" style="background:${c}"></button>`).join('')}</div>`;
  area.appendChild(caja);
  const botones = [...caja.querySelectorAll('button')];
  const msg = caja.querySelector('.consola-msg');
  let orden = []; let paso = 0; let mostrando = true;
  const timers = [];
  const iluminar = (i, ms) => { botones[i].classList.add('luz'); timers.push(setTimeout(() => botones[i].classList.remove('luz'), ms)); };
  function nuevaRonda() {
    orden = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4));
    paso = 0; mostrando = true; msg.textContent = 'Mira la secuencia…';
    orden.forEach((i, k) => timers.push(setTimeout(() => iluminar(i, 400), 500 + k * 650)));
    timers.push(setTimeout(() => { mostrando = false; msg.textContent = '¡Tu turno! Repite la secuencia.'; }, 500 + orden.length * 650));
  }
  botones.forEach((b) => {
    b.onclick = () => {
      if (mostrando) return;
      const i = Number(b.dataset.i);
      iluminar(i, 200);
      if (i === orden[paso]) { if (++paso === orden.length) terminar(true); }
      else { msg.textContent = '¡Ups! Otra vez…'; timers.push(setTimeout(nuevaRonda, 700)); mostrando = true; }
    };
  });
  nuevaRonda();
  return () => timers.forEach(clearTimeout);
}

/** Mantener el invernadero: regar (clic) las plantas antes de que se sequen, durante 8 s. */
export function regar(area, terminar) {
  const caja = document.createElement('div');
  caja.className = 'plantas';
  const agua = Array.from({ length: 6 }, () => 50 + Math.random() * 40);
  caja.innerHTML = agua.map((_, i) => `<button data-i="${i}"><span class="planta">🌱</span><div class="agua"><div></div></div></button>`).join('') + '<p class="consola-msg">Riega las plantas: ninguna puede secarse (8 s)</p>';
  area.appendChild(caja);
  const botones = [...caja.querySelectorAll('button')];
  botones.forEach((b) => { b.onclick = () => { agua[b.dataset.i] = Math.min(100, agua[b.dataset.i] + 35); }; });
  let tiempo = 0;
  let anterior = performance.now();
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    tiempo += dt;
    agua.forEach((a, i) => {
      agua[i] = a - (9 + i * 2.5) * dt;
      const barra = botones[i].querySelector('.agua > div');
      barra.style.width = `${Math.max(0, agua[i])}%`;
      barra.style.background = agua[i] > 30 ? '#3d77d8' : '#e5484d';
      botones[i].querySelector('.planta').textContent = agua[i] > 30 ? '🌱' : '🥀';
    });
    caja.querySelector('.consola-msg').textContent = `Riega las plantas: ninguna puede secarse (${Math.max(0, 8 - tiempo).toFixed(1)} s)`;
    if (agua.some((a) => a <= 0)) return terminar(false);
    if (tiempo >= 8) return terminar(true);
    id = requestAnimationFrame(cuadro);
  }
  return () => cancelAnimationFrame(id);
}
