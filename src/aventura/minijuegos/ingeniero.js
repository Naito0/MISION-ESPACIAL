// =============================================================
// Minijuegos del INGENIERO (segmento espacial). Inspirados en hechos reales
// (ver src/data/hechos_reales.json):
//   fuga          · Cazar una fuga de aire siguiendo las partículas que flotan hacia ella
//                   (en 2020 la Estación Espacial buscó una pequeña fuga en el módulo Zvezda).
//   interruptores · Apagón: encontrar el interruptor correcto razonando qué sistemas
//                   se apagaron (el Apolo 12 fue alcanzado por rayos en el despegue, 1969).
//   paneles       · Paneles con polvo: limpiarlos y orientarlos al Sol antes de que se
//                   vacíe la batería (el polvo redujo la energía del módulo InSight en Marte).
//   deslizadores  · Estabilizar el motor repartiendo la energía.
// op = valores del destino (dificultad.json → minijuegosPorDestino).
// =============================================================
import { lienzo, mezclar, azar, texto } from './base.js';

const ganado = (id, datos = {}) => window.dispatchEvent(new CustomEvent('minijuego-ganado', { detail: { id, ...datos } }));

/**
 * FUGA — la presión baja. El aire que se escapa arrastra partículas HACIA el agujero.
 * Los ventiladores también mueven partículas, pero hacia afuera (distractor).
 * 1) Haz clic donde está la fuga. 2) Mantén apretado (o Espacio) para sellarla.
 */
export function fuga(area, terminar, op = {}) {
  const { c, g } = lienzo(area, 420, 260);
  const fx = azar(50, 370); const fy = azar(45, 215);
  const ventiladores = Array.from({ length: op.ventiladores ?? 1 }, () => {
    let v; do { v = { x: azar(40, 380), y: azar(40, 220) }; } while (Math.hypot(v.x - fx, v.y - fy) < 110);
    return v;
  });
  const parts = Array.from({ length: 70 }, () => ({ x: Math.random() * 420, y: Math.random() * 260 }));
  let presion = 100; let encontrada = false; let sellado = 0; let apretando = false; let tiempo = 0;
  let mx = 210; let my = 130; let aviso = '';
  const pos = (e) => { const r = c.getBoundingClientRect(); mx = (e.clientX - r.left) * (c.width / r.width); my = (e.clientY - r.top) * (c.height / r.height); };
  c.onmousemove = pos;
  c.onmousedown = (e) => {
    pos(e);
    if (!encontrada) {
      if (Math.hypot(mx - fx, my - fy) < 24) { encontrada = true; aviso = '¡Ahí está! Mantén apretado para sellar'; }
      else { presion -= 4; aviso = 'Ahí no hay fuga: mira hacia dónde van las partículas'; }
    }
    apretando = true;
  };
  c.onmouseup = c.onmouseleave = () => { apretando = false; };
  const tecla = (e) => { if (e.code === 'Space') { e.preventDefault(); apretando = e.type === 'keydown'; } };
  window.addEventListener('keydown', tecla); window.addEventListener('keyup', tecla);
  let anterior = performance.now();
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    tiempo += dt;
    if (sellado < 1) presion -= (op.caidaPresion ?? 2.2) * dt;
    if (op.pista) Object.assign(op.pista, { lienzo: c, fuga: { x: fx, y: fy }, encontrada });
    if (encontrada && apretando && Math.hypot(mx - fx, my - fy) < 30) sellado += dt / (op.sellar ?? 1.5);
    // Partículas: van hacia la fuga; los ventiladores las empujan hacia afuera
    for (const p of parts) {
      let vx = fx - p.x; let vy = fy - p.y; const d = Math.hypot(vx, vy) || 1;
      vx = vx / d * 38; vy = vy / d * 38;
      for (const v of ventiladores) {
        const dv = Math.hypot(p.x - v.x, p.y - v.y) || 1;
        if (dv < 120) { vx += (p.x - v.x) / dv * 70 * (1 - dv / 120); vy += (p.y - v.y) / dv * 70 * (1 - dv / 120); }
      }
      p.x += (vx + azar(-15, 15)) * dt; p.y += (vy + azar(-15, 15)) * dt;
      if (Math.hypot(p.x - fx, p.y - fy) < 8 || p.x < 0 || p.x > 420 || p.y < 0 || p.y > 260) { p.x = Math.random() * 420; p.y = Math.random() * 260; }
    }
    // Dibujo: pared del módulo
    g.fillStyle = '#4a5268'; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = '#5c6580'; g.lineWidth = 2;
    for (let x = 0; x < 420; x += 70) for (let y = 0; y < 260; y += 65) g.strokeRect(x, y, 70, 65);
    for (const v of ventiladores) { g.fillStyle = '#2b3042'; g.beginPath(); g.arc(v.x, v.y, 14, 0, 7); g.fill(); g.strokeStyle = '#9aa0ad'; g.beginPath(); for (let k = 0; k < 4; k++) { const a = tiempo * 8 + k * 1.57; g.moveTo(v.x, v.y); g.lineTo(v.x + Math.cos(a) * 12, v.y + Math.sin(a) * 12); } g.stroke(); }
    g.fillStyle = 'rgba(230,240,255,0.85)';
    for (const p of parts) g.fillRect(p.x, p.y, 2.5, 2.5);
    if (encontrada) {
      g.strokeStyle = sellado >= 1 ? '#5be08a' : '#ff5a36'; g.lineWidth = 4; g.beginPath(); g.arc(fx, fy, 16, 0, 7); g.stroke();
      g.fillStyle = '#ffd166'; g.fillRect(fx - 30, fy + 22, 60 * Math.min(1, sellado), 6);
    }
    g.strokeStyle = '#7cf3ff'; g.lineWidth = 2; g.beginPath(); g.arc(mx, my, 10, 0, 7); g.stroke();
    // Presión
    g.fillStyle = '#1a2342'; g.fillRect(150, 240, 150, 14);
    g.fillStyle = presion > 75 ? '#3cc46e' : '#e5484d'; g.fillRect(150, 240, 150 * Math.max(0, (presion - 60) / 40), 14);
    texto(g, `Presión ${presion.toFixed(0)}%`, 10, 252, '#fff', 15);
    texto(g, !encontrada ? `Paso 1: haz CLIC donde se juntan las partículas${aviso ? ' (ahí no)' : ''}`
      : 'Paso 2: MANTÉN apretado el clic (o Espacio) sobre el aro rojo', 10, 22, '#fff', 15);
    if (sellado >= 1) { ganado('fuga', { segundos: tiempo }); return terminar(true); }
    if (presion <= 60) return terminar(false, 'El aire que se escapa ARRASTRA las partículas hacia el agujero. Los ventiladores las empujan hacia afuera: busca el punto al que llegan, no del que salen.');
    id = requestAnimationFrame(cuadro);
  }
  return () => { cancelAnimationFrame(id); window.removeEventListener('keydown', tecla); window.removeEventListener('keyup', tecla); };
}

const SISTEMAS = ['Navegación', 'Radio', 'Luces', 'Calefacción', 'Computadora', 'Bombas de agua', 'Ventiladores', 'Sensores', 'Radar', 'Cámaras', 'Reciclador de aire', 'Pantallas', 'Motor', 'Antena', 'Frenos', 'Laboratorio', 'Refrigeración', 'Alarmas'];

/**
 * INTERRUPTORES — después del "rayo" los paneles se vuelven locos y algunos sistemas
 * se apagan. Cada interruptor (bus) alimenta 2 sistemas. Hay que REINICIAR solo el bus
 * cuyos sistemas están TODOS apagados. Reiniciar uno que funciona apaga cosas que andaban.
 */
export function interruptores(area, terminar, op = {}) {
  const nBuses = op.buses ?? 6;
  const sistemas = mezclar(SISTEMAS).slice(0, nBuses * 2);
  const buses = Array.from({ length: nBuses }, (_, i) => ({ nombre: `Bus ${String.fromCharCode(65 + i)}`, sistemas: [sistemas[i * 2], sistemas[i * 2 + 1]], falla: false }));
  mezclar(buses).slice(0, op.fallas ?? 1).forEach((b) => { b.falla = true; });
  let errores = 0; let locos = 1.6; // los primeros segundos todo parpadea
  const caja = document.createElement('div');
  caja.className = 'interruptores';
  area.appendChild(caja);
  const apagados = () => buses.filter((b) => b.falla).flatMap((b) => b.sistemas);
  function dibujar() {
    const off = new Set(apagados());
    const loco = locos > 0;
    caja.innerHTML = `
      <div class="int-estado"><b>Estado de los sistemas:</b> ${sistemas.map((s) => `<span class="int-sis ${loco ? (Math.random() < 0.5 ? 'off' : 'on') : off.has(s) ? 'off' : 'on'}">${s}</span>`).join('')}</div>
      <div class="int-buses">${buses.map((b, i) => `<button class="int-bus" data-i="${i}" ${loco ? 'disabled' : ''}><b>${b.nombre}</b><small>${b.sistemas.join(' + ')}</small></button>`).join('')}</div>
      <p class="consola-msg">${loco ? '⚡ ¡Los paneles se volvieron locos! Espera a que se estabilicen…' : `Reinicia el bus correcto. Errores: ${errores} de 3`}</p>`;
    caja.querySelectorAll('.int-bus').forEach((btn) => {
      btn.onclick = () => {
        const b = buses[btn.dataset.i];
        if (b.falla) { b.falla = false; if (!buses.some((x) => x.falla)) return terminar(true); }
        else {
          errores++;
          if (errores >= 3) return terminar(false, 'Busca el interruptor que alimenta SOLO sistemas apagados (en rojo). Si reinicias uno cuyos sistemas funcionan, apagas cosas que andaban bien.');
        }
        dibujar();
      };
    });
  }
  const reloj = setInterval(() => { if (locos > 0) { locos -= 0.25; dibujar(); } }, 250);
  dibujar();
  return () => clearInterval(reloj);
}

/**
 * PANELES — el polvo cubre los paneles y la batería se vacía.
 * Pasa el mouse por encima de un panel para LIMPIARLO; elige un panel (clic) y
 * gíralo con ← → para que mire al Sol. Energía = luz × limpieza × orientación.
 * Gana cuando la batería se llena; pierde si se vacía.
 */
export function paneles(area, terminar, op = {}) {
  const n = op.paneles ?? 3;
  const { c, g } = lienzo(area, 420, 260);
  const solAng = azar(-0.6, 0.6); // hacia dónde está el Sol
  const ps = Array.from({ length: n }, (_, i) => ({ x: 40 + i * (340 / n) + 10, polvo: azar(0.6, 1) * (op.polvo ?? 0.85), ang: solAng + (Math.random() < 0.5 ? -1 : 1) * azar(0.7, 1.2) }));
  let elegido = 0; let bateria = 45; let mx = -99; let my = -99; let teclaGiro = 0;
  const consumo = (op.descarga ?? 4.5);
  c.onmousemove = (e) => {
    const r = c.getBoundingClientRect(); mx = (e.clientX - r.left) * (c.width / r.width); my = (e.clientY - r.top) * (c.height / r.height);
    for (const p of ps) if (mx > p.x && mx < p.x + 70 && my > 120 && my < 200) p.polvo = Math.max(0, p.polvo - 0.025);
  };
  c.onclick = () => { ps.forEach((p, i) => { if (mx > p.x && mx < p.x + 70 && my > 100 && my < 220) elegido = i; }); };
  const tecla = (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') teclaGiro = e.type === 'keydown' ? -1 : 0;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') teclaGiro = e.type === 'keydown' ? 1 : 0;
    if (e.type === 'keydown' && /Digit[1234]/.test(e.code)) elegido = Math.min(n - 1, Number(e.code.slice(-1)) - 1);
  };
  window.addEventListener('keydown', tecla); window.addEventListener('keyup', tecla);
  let anterior = performance.now();
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    ps[elegido].ang += teclaGiro * 0.9 * dt;
    // Energía de cada panel: (1 - polvo) × coseno del ángulo con el Sol
    const gen = ps.reduce((s, p) => s + (1 - p.polvo) * Math.max(0, Math.cos(p.ang - solAng)), 0) * (12 / n) * 1.25;
    bateria = Math.max(0, Math.min(100, bateria + (gen - consumo) * dt * 2));
    // Dibujo
    g.fillStyle = '#c47a4a'; g.fillRect(0, 0, c.width, c.height); // cielo de Marte con polvo
    g.fillStyle = '#fff4dd'; const sx = 210 + Math.sin(solAng) * 190; g.beginPath(); g.arc(sx, 34, 16, 0, 7); g.fill();
    texto(g, '☀ Sol', sx - 18, 66, '#4a2010', 13);
    ps.forEach((p, i) => {
      g.save(); g.translate(p.x + 35, 160); g.rotate(p.ang);
      g.fillStyle = '#1d3b8a'; g.fillRect(-35, -30, 70, 60);
      g.fillStyle = `rgba(160,100,60,${p.polvo})`; g.fillRect(-35, -30, 70, 60);
      g.strokeStyle = i === elegido ? '#ffd166' : '#0b1328'; g.lineWidth = i === elegido ? 4 : 2; g.strokeRect(-35, -30, 70, 60);
      g.restore();
      texto(g, `${i + 1}`, p.x + 30, 236, i === elegido ? '#ffd166' : '#fff', 16);
    });
    g.fillStyle = '#1a2342'; g.fillRect(12, 8, 180, 14);
    g.fillStyle = bateria > 30 ? '#3cc46e' : '#e5484d'; g.fillRect(12, 8, 1.8 * bateria, 14);
    texto(g, `🔋 ${bateria.toFixed(0)}% · ${gen >= consumo ? '⬆ cargando' : '⬇ se vacía'}`, 200, 21, '#fff', 14);
    if (bateria >= 100) { ganado('paneles'); return terminar(true); }
    if (bateria <= 0) return terminar(false, 'Un panel da energía solo si está LIMPIO y MIRA AL SOL. Limpia pasando el mouse y gira cada panel (clic + ← →) hasta que apunte al Sol.');
    id = requestAnimationFrame(cuadro);
  }
  return () => { cancelAnimationFrame(id); window.removeEventListener('keydown', tecla); window.removeEventListener('keyup', tecla); };
}

/** Estabilizar el motor: llevar cada deslizador a su marca y confirmar (la marca se mueve si tardas). */
export function deslizadores(area, terminar, op = {}) {
  const tolerancia = op.tolerancia ?? 5;
  const sistemas = ['Motor', 'Soporte vital', 'Escudos'].slice(0, op.barras ?? 3);
  const metas = sistemas.map(() => 15 + Math.floor(Math.random() * 70));
  const caja = document.createElement('div');
  caja.className = 'deslizadores';
  caja.innerHTML = sistemas.map((s, i) => `
    <label>${s}<div class="riel"><div class="meta" style="left:${metas[i]}%"></div>
    <input type="range" min="0" max="100" value="${Math.random() < 0.5 ? 5 : 95}" data-i="${i}"></div></label>`).join('') +
    '<button class="consola-grande">⚡ Confirmar</button><p class="consola-msg"></p>';
  area.appendChild(caja);
  let fallos = 0;
  caja.querySelector('button').onclick = () => {
    const ok = [...caja.querySelectorAll('input')].every((inp) => Math.abs(Number(inp.value) - metas[inp.dataset.i]) <= tolerancia);
    if (ok) return terminar(true);
    fallos++;
    if (fallos >= 3) return terminar(false, 'Cada barra tiene que quedar SOBRE su marca amarilla: la energía debe repartirse justo lo que pide cada sistema.');
    caja.querySelector('.consola-msg').textContent = `Todavía no: cada barra va sobre su marca amarilla (${3 - fallos} intentos).`;
  };
  return () => {};
}
