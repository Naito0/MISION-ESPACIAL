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
      <div class="consola-inst">${o.instrucciones}</div>
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

  // El minijuego llama a esto con true (logrado) o false (falló).
  // Si falla y queda tiempo, se puede REINTENTAR enseguida en la misma consola.
  function intento(resultado) {
    if (terminado) return;
    if (resultado === false && !seAcaboElTiempo()) {
      if (limpiar) limpiar();
      limpiar = null;
      efecto('error');
      area.innerHTML = `<div class="consola-resultado">❌ No salió… ¡no pasa nada!</div>
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
  empezar();
  return { cerrar: () => terminar(null), terminar };
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
