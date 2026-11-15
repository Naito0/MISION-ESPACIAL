// =============================================================
// avisos.js — Avisos pequeños ("toasts") arriba a la derecha.
// - Máximo 320 px de ancho, fondo oscuro semitransparente, bordes redondeados,
//   icono y UNA línea (los datos largos, como los de la NASA, hasta 3 líneas).
// - Entran deslizándose, duran 3 s (o lo que se pida) y se ven como máximo 3:
//   el más viejo se va solo.
// Las tarjetas de aprendizaje y las preguntas NO usan esto: siguen al centro.
// =============================================================
const MAXIMO = 3;

function contenedor() {
  let c = document.querySelector('#hud > .toasts');
  if (!c) {
    c = document.createElement('div');
    c.className = 'toasts';
    document.getElementById('hud').appendChild(c);
  }
  return c;
}

// Si el texto empieza con un emoji, ese es el icono; si no, uno por defecto
const EMOJI = /^\s*(\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*)\s*/u;

/**
 * aviso('💫 ¡Ana te dio un empujón!', { ms: 3000, largo: false, clase: '' })
 * largo = true permite hasta 3 líneas (datos de la NASA).
 */
export function aviso(texto, { ms = 3000, largo = false, clase = '' } = {}) {
  const c = contenedor();
  const m = String(texto).match(EMOJI);
  const icono = m ? m[1] : 'ℹ️';
  const cuerpo = m ? String(texto).slice(m[0].length) : String(texto);
  const t = document.createElement('div');
  t.className = `toast ${largo ? 'largo' : ''} ${clase}`;
  t.innerHTML = `<span class="toast-icono">${icono}</span><span class="toast-texto">${cuerpo}</span>`;
  c.prepend(t); // el más nuevo arriba
  while (c.children.length > MAXIMO) c.lastElementChild.remove(); // los más viejos se van
  setTimeout(() => { t.classList.add('saliendo'); setTimeout(() => t.remove(), 350); }, ms);
  return t;
}
