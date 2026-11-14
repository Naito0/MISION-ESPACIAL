// =============================================================
// Minijuegos de COMUNICACIONES (segmento terrestre). Inspirados en hechos reales
// (ver src/data/hechos_reales.json):
//   unidades · Error de unidades: convertir antes de enviar una orden
//              (la Mars Climate Orbiter se perdió en 1999 por mezclar unidades).
//   retraso  · La señal tarda: enviar la orden de frenar CON ANTICIPACIÓN.
//   tormenta · Contacto perdido: alinear la antena y encontrar la frecuencia
//              entre el ruido (el rover Opportunity perdió el contacto en 2018).
// op = valores del destino (dificultad.json → minijuegosPorDestino).
// =============================================================
import { lienzo, mezclar, azar, texto, teclas } from './base.js';

const ganado = (id, datos = {}) => window.dispatchEvent(new CustomEvent('minijuego-ganado', { detail: { id, ...datos } }));

// Factores de conversión (valores estándar de conversión de unidades)
const MAGNITUDES = [
  { que: 'impulso del propulsor', ingles: 'libras-fuerza·s', metrico: 'newtons·s', factor: 4.448, rango: [20, 90] },
  { que: 'distancia de la maniobra', ingles: 'millas', metrico: 'km', factor: 1.609, rango: [40, 300] },
  { que: 'masa de combustible', ingles: 'libras', metrico: 'kg', factor: 0.4536, rango: [50, 400] }
];
const num = (x) => x.toLocaleString('es', { maximumFractionDigits: 1 });

/**
 * UNIDADES — la computadora de la nave usa el sistema MÉTRICO. Llegan órdenes con
 * números en sistema inglés (hay que convertir) o ya en métrico (¡no convertir!).
 * Elige el valor correcto para enviar.
 */
export function unidades(area, terminar, op = {}) {
  const rondas = op.rondas ?? 2;
  let ronda = 0;
  const caja = document.createElement('div');
  caja.className = 'unidades';
  area.appendChild(caja);
  function nueva() {
    const m = MAGNITUDES[Math.floor(Math.random() * MAGNITUDES.length)];
    const valor = Math.round(azar(...m.rango));
    const yaMetrico = Math.random() < 0.3; // a veces ya viene en métrico: no hay que convertir
    const correcto = yaMetrico ? valor : valor * m.factor;
    const opciones = mezclar([
      { v: correcto, ok: true },
      { v: yaMetrico ? valor * m.factor : valor, motivo: yaMetrico ? 'Ese valor ya estaba en sistema métrico: al convertirlo de nuevo, la orden quedó mal.' : 'Enviaste el número SIN CONVERTIR: la nave lo leyó como si fuera métrico y se desvió. Así se perdió la Mars Climate Orbiter.' },
      { v: valor / m.factor, motivo: 'Dividiste en vez de multiplicar: revisa la tabla de conversión.' }
    ]);
    caja.innerHTML = `
      <div class="u-tabla">📏 1 libra-fuerza = 4,448 newtons · 1 milla = 1,609 km · 1 libra = 0,4536 kg</div>
      <p class="u-orden">Orden ${ronda + 1} de ${rondas}: <b>${m.que}</b> = <b>${num(valor)} ${yaMetrico ? m.metrico : m.ingles}</b></p>
      <p>La computadora de la nave necesita el valor en <b>${m.metrico}</b>. ¿Qué número envías?</p>
      <div class="fila">${opciones.map((o, i) => `<button class="boton u-op" data-i="${i}">${num(o.v)} ${m.metrico}</button>`).join('')}</div>`;
    caja.querySelectorAll('.u-op').forEach((b) => {
      b.onclick = () => {
        const o = opciones[b.dataset.i];
        if (!o.ok) return terminar(false, o.motivo);
        ronda++;
        if (ronda >= rondas) { ganado('unidades'); return terminar(true); }
        nueva();
      };
    });
  }
  nueva();
  return () => {};
}

/**
 * RETRASO — controlas un rover desde la Tierra. Lo que ves en tu pantalla pasó hace
 * unos segundos, y tu orden tarda lo mismo en llegar. Pulsa ESPACIO (o el botón) para
 * enviar "¡Frena!" con anticipación: el rover debe frenar en la zona verde, antes del cráter.
 * Luna: ~1,3 s. Marte: entre 4 y 24 minutos (en el juego, 1 minuto = 1/3 de segundo).
 */
export function retraso(area, terminar, op = {}) {
  const destinoId = op.destinoId || 'luna';
  const rondas = op.rondas ?? 1;
  const { c, g } = lienzo(area, 420, 220);
  const boton = document.createElement('button');
  boton.className = 'consola-grande';
  boton.textContent = '📡 Enviar "¡Frena!" (Espacio)';
  area.appendChild(boton);
  let ronda = 0;
  let D; let v; let x0; let t; let enviada; let llegada; let paradoEn; let zona;
  function nueva() {
    // Retraso de la señal (ida). Marte: 4 a 24 min → 1,3 a 8 s en el juego
    D = destinoId === 'marte' ? azar(4, 24) / 3 : 1.3;
    v = azar(28, 40);
    x0 = 20; t = 0; enviada = null; llegada = null; paradoEn = null;
    zona = { a: 300, b: 340 };
  }
  nueva();
  const posReal = (tt) => { const tope = paradoEn ?? Infinity; return x0 + v * Math.min(tt, tope); };
  const enviar = () => { if (enviada === null) { enviada = t; llegada = t + D; } };
  boton.onclick = enviar;
  const tecla = (e) => { if (e.code === 'Space') { e.preventDefault(); enviar(); } };
  window.addEventListener('keydown', tecla);
  let anterior = performance.now();
  let fin = 0;
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    t += dt;
    if (llegada !== null && paradoEn === null && t >= llegada) paradoEn = llegada;
    const visto = posReal(Math.max(0, t - D)); // lo que ves en la Tierra: el pasado
    // Dibujo
    g.fillStyle = '#c47a4a'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(60,196,110,0.6)'; g.fillRect(zona.a, 120, zona.b - zona.a, 40);
    g.fillStyle = '#3a1a0a'; g.fillRect(350, 115, 70, 60); texto(g, 'Cráter', 357, 190, '#fff', 13);
    g.fillStyle = '#dfe6f5'; g.fillRect(visto - 14, 128, 28, 18); g.fillStyle = '#333'; g.beginPath(); g.arc(visto - 8, 148, 5, 0, 7); g.arc(visto + 8, 148, 5, 0, 7); g.fill();
    if (enviada !== null && t < llegada) { const f = (t - enviada) / D; texto(g, '📡', 30 + f * 340, 60, '#fff', 22); }
    texto(g, `Lo que ves pasó hace ${D.toFixed(1)} s · tu orden tarda ${D.toFixed(1)} s en llegar`, 10, 22, '#fff', 14);
    texto(g, `Ronda ${ronda + 1} de ${rondas}`, 10, 210, '#fff', 13);
    const real = posReal(t);
    if (paradoEn !== null && t - D >= paradoEn) {
      fin += dt;
      if (fin > 0.6) {
        if (real >= zona.a - 14 && real <= zona.b + 14) {
          ronda++; fin = 0;
          if (ronda >= rondas) { ganado('retraso'); return terminar(true); }
          nueva();
        } else return terminar(false, `La orden llegó ${real < zona.a ? 'demasiado pronto' : 'tarde'}. Lo que ves ya pasó hace ${D.toFixed(1)} s y tu orden tarda otros ${D.toFixed(1)} s: hay que enviarla cuando el rover todavía está lejos de la zona verde.`);
      }
    }
    if (real > 360 && paradoEn === null) return terminar(false, `El rover cayó al cráter: la orden tarda ${D.toFixed(1)} s en llegar. Envíala ANTES de que el rover llegue a la zona verde.`);
    id = requestAnimationFrame(cuadro);
  }
  return () => { cancelAnimationFrame(id); window.removeEventListener('keydown', tecla); };
}

/**
 * TORMENTA — se perdió el contacto. Hay que ALINEAR la antena (← →) y encontrar la
 * FRECUENCIA (↑ ↓) entre el ruido. Hay picos falsos: la señal verdadera solo es
 * fuerte cuando la antena está bien alineada. Mantén la señal fuerte unos segundos.
 */
export function tormenta(area, terminar, op = {}) {
  const meta = op.segundos ?? 2;
  const { c, g } = lienzo(area, 420, 240);
  const t = teclas();
  const fReal = azar(15, 85); const angReal = azar(-60, 60);
  const falsos = Array.from({ length: op.picosFalsos ?? 2 }, () => { let f; do { f = azar(8, 92); } while (Math.abs(f - fReal) < 12); return f; });
  let f = azar(5, 95); let ang = angReal + (Math.random() < 0.5 ? -1 : 1) * azar(40, 70); let fuerte = 0; let tiempo = 0;
  let anterior = performance.now();
  let id = requestAnimationFrame(cuadro);
  const espectro = (x) => {
    const alin = Math.max(0, Math.cos((ang - angReal) * Math.PI / 180 * 1.5));
    let s = Math.exp(-((x - fReal) ** 2) / 18) * (0.25 + 0.75 * alin ** 2);
    for (const k of falsos) s = Math.max(s, Math.exp(-((x - k) ** 2) / 12) * 0.5);
    return s;
  };
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    tiempo += dt;
    ang += ((t.s.has('ArrowRight') || t.s.has('KeyD') ? 1 : 0) - (t.s.has('ArrowLeft') || t.s.has('KeyA') ? 1 : 0)) * 40 * dt;
    f = Math.max(0, Math.min(100, f + ((t.s.has('ArrowUp') || t.s.has('KeyW') ? 1 : 0) - (t.s.has('ArrowDown') || t.s.has('KeyS') ? 1 : 0)) * 18 * dt));
    const senal = espectro(f) + azar(-0.04, 0.04);
    fuerte = senal > 0.85 ? fuerte + dt : Math.max(0, fuerte - dt);
    // Dibujo: espectro con ruido
    g.fillStyle = '#04101f'; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = '#7cc4ff'; g.lineWidth = 2; g.beginPath();
    for (let x = 0; x <= 100; x += 1) g.lineTo(20 + x * 2.6, 170 - (espectro(x) + Math.random() * 0.12) * 120);
    g.stroke();
    g.strokeStyle = senal > 0.85 ? '#5be08a' : '#ffd166'; g.lineWidth = 3; g.beginPath(); g.moveTo(20 + f * 2.6, 40); g.lineTo(20 + f * 2.6, 175); g.stroke();
    texto(g, 'Frecuencia (↑ ↓)', 20, 196, '#fff', 13);
    // Antena: dial de orientación
    g.save(); g.translate(370, 90); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 32, Math.PI, 0); g.stroke();
    g.rotate((ang - 90) * Math.PI / 180); g.strokeStyle = '#ff9fdc'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(30, 0); g.stroke(); g.restore();
    texto(g, 'Antena (← →)', 325, 140, '#fff', 13);
    g.fillStyle = '#1a2342'; g.fillRect(20, 210, 380, 14);
    g.fillStyle = senal > 0.85 ? '#5be08a' : '#f2c14e'; g.fillRect(20, 210, 380 * Math.max(0, Math.min(1, senal)), 14);
    texto(g, senal > 0.85 ? `¡Señal clara! ${Math.max(0, meta - fuerte).toFixed(1)} s` : 'Busca un pico… ¿es el verdadero? Alinea la antena y fíjate si crece', 20, 24, '#fff', 14);
    if (fuerte >= meta) { ganado('tormenta'); return terminar(true); }
    if (tiempo > 45) return terminar(false, 'Los picos falsos nunca pasan de la mitad. El verdadero crece cuando ALINEAS la antena: primero gira la antena hasta que un pico suba, después ajusta la frecuencia.');
    id = requestAnimationFrame(cuadro);
  }
  return () => { cancelAnimationFrame(id); t.quitar(); };
}
