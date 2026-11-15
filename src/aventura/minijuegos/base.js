// =============================================================
// base.js — Marco "holográfico" de las consolas: título, objetivo, controles,
// área del minijuego, barra de tiempo y botones.
// Cada minijuego recibe (area, terminar, opciones) y llama terminar(true/false).
//
// "CÓMO SE JUEGA": la primera vez que aparece cada minijuego (y siempre con el
// botón "❓ Ver cómo se juega") se ve una DEMOSTRACIÓN: el minijuego real se
// juega solo unos segundos (ver demos.js). Después: "▶ Jugar" o "🔁 Ver otra vez".
// El reloj de la emergencia NO corre durante la demostración.
// =============================================================
import { efecto } from '../audio.js';
import { reproducirDemo, tieneBot } from './demos.js';

/**
 * o = { id, titulo, objetivo, controles, gana, color, segundos,
 *       iniciar(area, terminar, opciones) → limpiar(), opciones, alTerminar(resultado) }
 * resultado: true (logrado), false (falló), null (lo cerró).
 */
export function abrirConsola(o) {
  if (document.pointerLockElement) document.exitPointerLock();
  window.consolaAbierta = true;
  const capa = document.createElement('div');
  capa.className = 'consola-capa';
  capa.innerHTML = `
    <div class="consola panel" style="border-color:${o.color}">
      <div class="consola-cab" style="color:${o.color}">🛠 ${o.titulo}</div>
      ${o.objetivo
        ? `<div class="consola-objetivo">🎯 <b>${o.objetivo}</b></div>
           <div class="consola-controles">🎮 ${o.controles}</div>`
        : `<div class="consola-inst">${o.instrucciones}</div>`}
      <div class="consola-area"></div>
      <div class="consola-tiempo"><div style="background:${o.color}"></div></div>
      <div class="consola-botones">
        ${o.objetivo ? '<button class="consola-ayuda">❓ Ver cómo se juega</button>' : ''}
        <button class="consola-cerrar">Cerrar (Esc)</button>
      </div>
    </div>`;
  document.getElementById('hud').appendChild(capa);
  const area = capa.querySelector('.consola-area');
  const barra = capa.querySelector('.consola-tiempo > div');
  let terminado = false;
  let limpiar = null;
  let detenerDemo = null;
  // El tiempo solo corre mientras se JUEGA (no durante la demostración ni la tarjeta)
  let jugando = false;
  let transcurrido = 0;
  let ultimo = performance.now();
  const reloj = setInterval(() => {
    const ahora = performance.now();
    if (jugando) transcurrido += (ahora - ultimo) / 1000;
    ultimo = ahora;
    const f = 1 - transcurrido / o.segundos;
    barra.style.width = `${Math.max(0, f) * 100}%`;
    if (f <= 0) terminar(false);
  }, 100);
  const teclaEsc = (e) => { if (e.key === 'Escape') terminar(null); };
  window.addEventListener('keydown', teclaEsc);

  // El minijuego llama a esto con true (logrado) o false (falló) y, si falló, POR QUÉ.
  // Si falla y queda tiempo, se puede REINTENTAR enseguida en la misma consola.
  function intento(resultado, motivo = '') {
    if (terminado) return;
    if (resultado === false && !seAcaboElTiempo()) {
      if (limpiar) limpiar();
      limpiar = null;
      jugando = false;
      efecto('error');
      area.innerHTML = `<div class="consola-resultado">❌ No salió</div>
        ${motivo ? `<p class="consola-motivo">💡 ${motivo}</p>` : ''}
        <button class="consola-grande reintentar">🔁 Reintentar</button>`;
      area.querySelector('.reintentar').onclick = empezar;
      return;
    }
    terminar(resultado);
  }
  const seAcaboElTiempo = () => transcurrido >= o.segundos;

  function terminar(resultado) {
    if (terminado) return;
    terminado = true;
    jugando = false;
    clearInterval(reloj);
    window.removeEventListener('keydown', teclaEsc);
    if (detenerDemo) detenerDemo();
    if (limpiar) limpiar();
    efecto(resultado ? 'exito' : resultado === false ? 'error' : 'clic');
    const aviso = resultado ? '✅ ¡Resuelto!' : resultado === false ? '⏱ Se acabó el tiempo' : '';
    if (aviso) {
      area.innerHTML = `<div class="consola-resultado">${aviso}</div>`;
      setTimeout(cerrar, 900);
    } else cerrar();
    function cerrar() {
      capa.remove();
      window.consolaAbierta = false;
      o.alTerminar(resultado);
    }
  }

  function empezar() {
    area.innerHTML = '';
    jugando = true;
    limpiar = o.iniciar(area, intento, o.opciones || {});
  }

  // ---- "Cómo se juega" ----
  function tarjeta() {
    area.innerHTML = `<div class="demo-tarjeta">
      <p>🎯 <b>Objetivo:</b> ${o.objetivo}</p>
      <p>🎮 <b>Controles:</b> ${o.controles}</p>
      <p>🏆 <b>Cómo ganas:</b> ${o.gana}</p>
      <div class="fila">
        <button class="consola-grande jugar">▶ Jugar</button>
        <button class="consola-grande secundario otra-vez">🔁 Ver otra vez</button>
      </div></div>`;
    area.querySelector('.jugar').onclick = () => { efecto('clic'); empezar(); };
    area.querySelector('.otra-vez').onclick = () => { efecto('clic'); verDemo(); };
  }
  function verDemo() {
    if (limpiar) { limpiar(); limpiar = null; }
    jugando = false;
    if (!tieneBot(o.id)) { tarjeta(); return; } // sin jugador automático: solo la tarjeta
    window.sinLogros = true; // la demostración no da logros
    detenerDemo = reproducirDemo(o.id, area, o.iniciar, o.opciones || {}, () => {
      detenerDemo = null;
      window.sinLogros = o.sinLogros || false;
      if (!terminado) tarjeta();
    });
  }

  capa.querySelector('.consola-cerrar').onclick = () => terminar(null);
  const ayuda = capa.querySelector('.consola-ayuda');
  if (ayuda) ayuda.onclick = () => { if (!detenerDemo) { efecto('clic'); verDemo(); } };
  // La PRIMERA vez que aparece cada minijuego: demostración automática
  if (o.objetivo && !yaVioDemo(o.id)) { marcarDemo(o.id); verDemo(); } else empezar();
  return { cerrar: () => terminar(null), terminar };
}

const CLAVE_DEMOS = 'misionEspacial.demosVistas2';
function yaVioDemo(id) {
  try { return JSON.parse(localStorage.getItem(CLAVE_DEMOS) || '[]').includes(id); } catch { return false; }
}
function marcarDemo(id) {
  try {
    const l = JSON.parse(localStorage.getItem(CLAVE_DEMOS) || '[]');
    if (!l.includes(id)) l.push(id);
    localStorage.setItem(CLAVE_DEMOS, JSON.stringify(l));
  } catch { /* sin almacenamiento */ }
}

/** Número al azar entre a y b. */
export const azar = (a, b) => a + Math.random() * (b - a);

/** Texto grande dentro del lienzo (se lee bien al estirarse). */
export function texto(g, t, x, y, color = '#fff', tam = 16, alinear = 'left') {
  g.fillStyle = color; g.font = `bold ${tam}px Arial`; g.textAlign = alinear; g.fillText(t, x, y); g.textAlign = 'left';
}

/** Crea un canvas dentro del área. */
export function lienzo(area, ancho = 420, alto = 240) {
  const c = document.createElement('canvas');
  c.width = ancho; c.height = alto;
  c.className = 'consola-lienzo';
  area.appendChild(c);
  return { c, g: c.getContext('2d') };
}

/** Teclas mantenidas mientras la consola está abierta. */
export function teclas() {
  const s = new Set();
  const abajo = (e) => s.add(e.code);
  const arriba = (e) => s.delete(e.code);
  window.addEventListener('keydown', abajo);
  window.addEventListener('keyup', arriba);
  return { s, quitar() { window.removeEventListener('keydown', abajo); window.removeEventListener('keyup', arriba); } };
}

/** Mezcla una lista. */
export function mezclar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
