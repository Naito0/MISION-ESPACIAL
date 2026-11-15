// =============================================================
// base.js — Marco "holográfico" de las consolas: título, instrucciones,
// área del minijuego, barra de tiempo y botón para cerrar.
// Cada minijuego recibe (area, terminar) y llama terminar(true/false).
// =============================================================
import { efecto } from '../audio.js';

/**
 * o = { titulo, instrucciones, color, segundos, iniciar(area, terminar, ctx) → limpiar(), alTerminar(resultado) }
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
      <button class="consola-cerrar">Cerrar (Esc)</button>
    </div>`;
  document.getElementById('hud').appendChild(capa);
  const area = capa.querySelector('.consola-area');
  const barra = capa.querySelector('.consola-tiempo > div');
  let terminado = false;
  let limpiar = null;
  const inicio = performance.now();
  const reloj = setInterval(() => {
    const f = 1 - (performance.now() - inicio) / 1000 / o.segundos;
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
      efecto('error');
      area.innerHTML = `<div class="consola-resultado">❌ No salió</div>
        ${motivo ? `<p class="consola-motivo">💡 ${motivo}</p>` : ''}
        <button class="consola-grande reintentar">🔁 Reintentar</button>`;
      area.querySelector('.reintentar').onclick = empezar;
      return;
    }
    terminar(resultado);
  }
  const seAcaboElTiempo = () => (performance.now() - inicio) / 1000 >= o.segundos;

  function terminar(resultado) {
    if (terminado) return;
    terminado = true;
    clearInterval(reloj);
    window.removeEventListener('keydown', teclaEsc);
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
    limpiar = o.iniciar(area, intento, o.opciones || {});
  }

  capa.querySelector('.consola-cerrar').onclick = () => terminar(null);
  // La PRIMERA vez que aparece cada minijuego: 3 segundos de demostración con las teclas
  if (o.demo && !yaVioDemo(o.id)) {
    marcarDemo(o.id);
    area.innerHTML = `<div class="demo">
      <div class="demo-titulo">👀 Así se juega</div>
      <div class="demo-teclas">${o.demo.teclas.map((t) => `<span class="tecla demo-tecla">${t}</span>`).join('')}</div>
      <p>${o.demo.texto}</p>
      <div class="demo-cuenta">3</div></div>`;
    let n = 3;
    const cuenta = setInterval(() => {
      n--;
      const el = area.querySelector('.demo-cuenta');
      if (el) el.textContent = n > 0 ? n : '¡Ya!';
      if (n <= 0) { clearInterval(cuenta); setTimeout(() => { if (!terminado) empezar(); }, 300); }
    }, 1000);
  } else empezar();
  return { cerrar: () => terminar(null), terminar };
}

const CLAVE_DEMOS = 'misionEspacial.demosVistas';
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
