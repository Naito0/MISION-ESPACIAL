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
import { parametrosRetraso } from '../../compartido/retrasoRover.js';

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

/** Dibujos simples que se reconocen sin leer: la Tierra, el rover, el satélite. */
function dibujarTierra(g, x, y, r = 22) {
  g.fillStyle = '#2d6fd6'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.fillStyle = '#3cc46e';
  g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.2, r * 0.45, r * 0.3, 0.5, 0, 7); g.fill();
  g.beginPath(); g.ellipse(x + r * 0.35, y + r * 0.35, r * 0.35, r * 0.22, -0.4, 0, 7); g.fill();
  g.strokeStyle = '#bfe0ff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
}
function dibujarRover(g, x, y, alfa = 1) {
  g.globalAlpha = alfa;
  g.fillStyle = '#dfe6f5'; g.fillRect(x - 18, y - 14, 36, 14);
  g.fillStyle = '#9aa6c8'; g.fillRect(x - 6, y - 26, 3, 12); g.fillRect(x - 10, y - 30, 11, 5); // mástil con cámara
  g.fillStyle = '#333'; for (const dx of [-12, 0, 12]) { g.beginPath(); g.arc(x + dx, y + 3, 5, 0, 7); g.fill(); }
  g.globalAlpha = 1;
}

/**
 * RETRASO — manejas un rover en Marte (o la Luna) DESDE LA TIERRA.
 * Se ve todo: la Tierra con tu antena arriba a la izquierda, el rover que avanza,
 * la zona verde (segura) y el cráter. Al pulsar ESPACIO, la señal "¡Frena!" viaja
 * desde la Tierra hasta el rover: tarda unos segundos, por eso hay que enviarla
 * ANTES, cuando el rover cruza la línea amarilla. 3 intentos.
 * Luna: ~1,3 s. Marte: entre 4 y 24 minutos (en el juego, 1 minuto = 1/4 de segundo).
 */
export function retraso(area, terminar, op = {}) {
  const destinoId = op.destinoId || 'luna';
  const rondas = op.rondas ?? 1;
  const { c, g } = lienzo(area, 420, 240);
  const boton = document.createElement('button');
  boton.className = 'consola-grande';
  boton.textContent = '📡 Enviar "¡Frena!" (Espacio)';
  area.appendChild(boton);
  const marte = destinoId === 'marte';
  let ronda = 0; let intento = 1; let aviso = 0; let textoAviso = '';
  let D; let v; let x0; let t; let enviada; let llegada; let paradoEn; let zona; let lineaEnvio;
  function nueva() {
    ({ D, v, x0, zona, lineaEnvio } = parametrosRetraso(destinoId));
    t = 0; enviada = null; llegada = null; paradoEn = null;
  }
  nueva();
  const posReal = (tt) => { const tope = paradoEn ?? Infinity; return x0 + v * Math.min(tt, tope); };
  const enviar = () => { if (enviada === null && aviso <= 0) { enviada = t; llegada = t + D; } };
  boton.onclick = enviar;
  const tecla = (e) => { if (e.code === 'Space') { e.preventDefault(); enviar(); } };
  window.addEventListener('keydown', tecla);
  function fallo(corto, motivo) {
    if (intento >= 3) { terminar(false, motivo); return true; }
    intento++; aviso = 2; textoAviso = `¡Casi! ${corto}. Intento ${intento} de 3`;
    nueva();
    return false;
  }
  let anterior = performance.now();
  let fin = 0;
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    if (aviso > 0) aviso -= dt; else t += dt;
    if (llegada !== null && paradoEn === null && t >= llegada) paradoEn = llegada;
    const visto = posReal(Math.max(0, t - D)); // lo que ves en la Tierra: lo que pasó hace D s
    if (op.pista) Object.assign(op.pista, { lienzo: c, visto, lineaEnvio, enviada: enviada !== null, boton });
    // ---- Dibujo ----
    g.fillStyle = '#060a18'; g.fillRect(0, 0, c.width, 110);                 // espacio
    g.fillStyle = marte ? '#c47a4a' : '#9a9aa2'; g.fillRect(0, 110, c.width, 130); // suelo
    dibujarTierra(g, 36, 40);
    texto(g, 'Tierra (tú)', 6, 80, '#bfe0ff', 12);
    // Zona segura y cráter
    g.fillStyle = 'rgba(60,196,110,0.75)'; g.fillRect(zona.a, 150, zona.b - zona.a, 26);
    texto(g, 'Zona segura', zona.a + 4, 196, '#0b3a1c', 13);
    g.fillStyle = '#2a1408'; g.beginPath(); g.ellipse(395, 165, 30, 20, 0, 0, 7); g.fill();
    texto(g, 'Cráter', 374, 200, '#fff', 13);
    // Línea amarilla: cuando el rover cruza esta línea, envía la orden
    g.strokeStyle = '#ffd166'; g.lineWidth = 3; g.setLineDash([6, 5]);
    g.beginPath(); g.moveTo(lineaEnvio, 118); g.lineTo(lineaEnvio, 185); g.stroke(); g.setLineDash([]);
    texto(g, '¡Envía aquí!', lineaEnvio - 36, 128, '#ffd166', 13);
    dibujarRover(g, visto, 165);
    // La señal viaja desde la Tierra hasta el rover
    if (enviada !== null && t < llegada) {
      const f = (t - enviada) / D;
      const sx = 36 + (posReal(t) - 36) * f; const sy = 40 + (150 - 40) * f;
      g.strokeStyle = 'rgba(255,159,220,0.5)'; g.setLineDash([4, 6]); g.beginPath(); g.moveTo(36, 40); g.lineTo(sx, sy); g.stroke(); g.setLineDash([]);
      texto(g, '📡', sx - 10, sy + 8, '#fff', 20);
    }
    texto(g, `La señal tarda ${D.toFixed(1)} s en llegar al rover`, 74, 24, '#fff', 15);
    texto(g, `Intento ${intento} de 3${rondas > 1 ? ` · Ronda ${ronda + 1} de ${rondas}` : ''}`, 74, 46, '#c8d2ec', 13);
    if (aviso > 0) {
      g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(20, 90, 380, 44);
      texto(g, textoAviso, 210, 118, '#ffd166', 14, 'center');
      id = requestAnimationFrame(cuadro);
      return;
    }
    const real = posReal(t);
    if (paradoEn !== null && t - D >= paradoEn) {
      fin += dt;
      if (fin > 0.6) {
        fin = 0;
        if (real >= zona.a - 14 && real <= zona.b + 14) {
          ronda++;
          if (ronda >= rondas) { ganado('retraso'); return terminar(true); }
          nueva();
        } else if (fallo(real < zona.a ? 'Frenó antes' : 'Frenó tarde', 'Envía la orden justo cuando el rover cruce la línea amarilla: la señal tarda en llegar.')) return;
      }
    }
    if (real > 365 && paradoEn === null && fallo('Cayó al cráter', 'La orden tarda en llegar: envíala cuando el rover cruce la línea amarilla.')) return;
    id = requestAnimationFrame(cuadro);
  }
  return () => { cancelAnimationFrame(id); window.removeEventListener('keydown', tecla); };
}

/**
 * CONTACTO PERDIDO — el satélite perdió la comunicación con la Tierra.
 * Paso 1: gira la ANTENA del satélite (← →) hasta que su rayo apunte a la Tierra.
 * Paso 2: mueve la AGUJA de la frecuencia (↑ ↓) a la zona verde y quédate ahí unos segundos.
 * Movimiento lento, zona verde grande y 3 intentos (de 25 s cada uno).
 */
export function tormenta(area, terminar, op = {}) {
  const meta = op.segundos ?? 2;
  const { c, g } = lienzo(area, 420, 240);
  const t = teclas();
  const SAT = { x: 80, y: 115 };
  const estrellas = Array.from({ length: 40 }, () => [Math.random() * 420, Math.random() * 180]);
  let intento = 1; let aviso = 0; let textoAviso = '';
  let tierraY; let angReal; let fReal; let ang; let f; let fuerte; let tiempo;
  function nueva() {
    tierraY = azar(45, 165);
    angReal = Math.atan2(tierraY - SAT.y, 360 - SAT.x) * 180 / Math.PI;
    fReal = azar(20, 80);
    ang = angReal + (Math.random() < 0.5 ? -1 : 1) * azar(35, 55);
    f = fReal + (Math.random() < 0.5 ? -1 : 1) * azar(25, 40); f = Math.max(0, Math.min(100, f));
    fuerte = 0; tiempo = 0;
  }
  nueva();
  let anterior = performance.now();
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    if (aviso > 0) aviso -= dt;
    else {
      tiempo += dt;
      ang += ((t.s.has('ArrowRight') || t.s.has('KeyD') ? 1 : 0) - (t.s.has('ArrowLeft') || t.s.has('KeyA') ? 1 : 0)) * 25 * dt;
      ang = Math.max(-80, Math.min(80, ang));
      f = Math.max(0, Math.min(100, f + ((t.s.has('ArrowUp') || t.s.has('KeyW') ? 1 : 0) - (t.s.has('ArrowDown') || t.s.has('KeyS') ? 1 : 0)) * 14 * dt));
    }
    if (op.pista) Object.assign(op.pista, { lienzo: c, antena: ang, antenaBuena: angReal, frecuencia: f, frecuenciaBuena: fReal });
    const alineada = Math.abs(ang - angReal) < 7;
    const enZona = alineada && Math.abs(f - fReal) < 8;
    fuerte = enZona ? fuerte + dt : Math.max(0, fuerte - dt * 0.5);
    // ---- Dibujo ----
    g.fillStyle = '#04081a'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#cfd8ff'; for (const [x, y] of estrellas) g.fillRect(x, y, 1.5, 1.5);
    dibujarTierra(g, 370, tierraY, 26);
    texto(g, 'Tierra', 352, tierraY + 42, '#bfe0ff', 12);
    // Rayo de la antena
    const rad = ang * Math.PI / 180;
    g.strokeStyle = alineada ? '#5be08a' : 'rgba(255,209,102,0.8)'; g.lineWidth = alineada ? 4 : 2; g.setLineDash(alineada ? [] : [8, 6]);
    g.beginPath(); g.moveTo(SAT.x, SAT.y); g.lineTo(SAT.x + Math.cos(rad) * 330, SAT.y + Math.sin(rad) * 330); g.stroke(); g.setLineDash([]);
    // Satélite: cuerpo, paneles solares y antena de plato que gira
    g.fillStyle = '#3d77d8'; g.fillRect(SAT.x - 52, SAT.y - 9, 30, 18);
    g.fillStyle = '#dfe6f5'; g.fillRect(SAT.x - 22, SAT.y - 13, 24, 26);
    g.save(); g.translate(SAT.x, SAT.y); g.rotate(rad);
    g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.beginPath(); g.arc(4, 0, 14, -1.1, 1.1); g.stroke();
    g.fillStyle = '#ff9fdc'; g.beginPath(); g.arc(14, 0, 3, 0, 7); g.fill();
    g.restore();
    texto(g, 'Satélite', SAT.x - 40, SAT.y + 34, '#fff', 12);
    // Frecuencia: aguja y zona verde (la zona aparece cuando la antena apunta a la Tierra)
    const bx = 40; const bw = 340; const by = 205;
    g.fillStyle = '#1a2342'; g.fillRect(bx, by, bw, 16);
    if (alineada) { g.fillStyle = 'rgba(60,196,110,0.85)'; g.fillRect(bx + (fReal - 8) / 100 * bw, by, 16 / 100 * bw, 16); }
    const ax = bx + f / 100 * bw;
    g.fillStyle = enZona ? '#5be08a' : '#ffd166'; g.beginPath(); g.moveTo(ax, by - 2); g.lineTo(ax - 7, by - 14); g.lineTo(ax + 7, by - 14); g.fill();
    g.fillRect(ax - 1.5, by, 3, 16);
    texto(g, 'Frecuencia', bx, by - 18, '#c8d2ec', 12);
    // Barra de "señal recibida"
    g.fillStyle = '#1a2342'; g.fillRect(170, 32, 120, 10);
    g.fillStyle = '#5be08a'; g.fillRect(170, 32, 120 * Math.min(1, fuerte / meta), 10);
    texto(g, '📶 Señal', 110, 42, '#fff', 12);
    texto(g, enZona ? `¡Conectado! Mantén… ${Math.max(0, meta - fuerte).toFixed(1)} s`
      : alineada ? 'Paso 2: ↑ ↓ lleva la aguja a la zona verde' : 'Paso 1: ← → apunta la antena a la Tierra', 10, 22, '#fff', 15);
    texto(g, `Intento ${intento} de 3`, 10, 40, '#c8d2ec', 12);
    if (aviso > 0) {
      g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(20, 95, 380, 44);
      texto(g, textoAviso, 210, 123, '#ffd166', 14, 'center');
    }
    if (fuerte >= meta) { ganado('tormenta'); return terminar(true); }
    if (aviso <= 0 && tiempo > 25) {
      if (intento >= 3) return terminar(false, 'Primero apunta la antena a la Tierra (el rayo se pone verde); después lleva la aguja a la zona verde y quédate quieto ahí.');
      intento++; aviso = 2; textoAviso = `Se acabó el intento. Intento ${intento} de 3`;
      nueva();
    }
    id = requestAnimationFrame(cuadro);
  }
  return () => { cancelAnimationFrame(id); t.quitar(); };
}