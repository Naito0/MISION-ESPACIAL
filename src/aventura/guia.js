// =============================================================
// guia.js — Indicaciones cortas de la PRIMERA misión (a la Luna).
// Sin personaje: una sola línea de texto, una flecha que apunta a lo que
// hay que tocar y ese objeto resaltado con un brillo.
// Cada pantalla avisa lo que pasa con
//   guia.pantalla('hangar')  y  guia.evento('completo')
// y la guía avanza al siguiente paso cuando llega el evento esperado.
// Al terminar el informe de la Luna se marca como hecha (localStorage).
// =============================================================

const CLAVE = 'misionEspacial.tutorialHecho';

// Pasos por pantalla. "hasta" = evento que pasa al paso siguiente;
// "resaltar" = selector CSS de lo que hay que mirar; "dura" = segundos y se oculta.
const PASOS = {
  sistema: [
    { texto: 'Primera misión: toca <b>"¡Vamos a la Luna!"</b>', resaltar: '#ir' }
  ],
  hangar: [
    { texto: 'Elige una pieza en cada categoría que dice <b>"falta"</b>', resaltar: '.categoria .falta', hasta: 'completo' },
    { texto: '¡Nave completa! Pulsa <b>"¡Listo!"</b>', resaltar: '#listo' }
  ],
  viaje: [
    { texto: 'Espera la primera emergencia: el aviso rojo dice qué pasó y adónde ir', hasta: 'emergencia' },
    { texto: 'Sigue la flecha ⬆ hasta la consola con <b>"!"</b> y pulsa <span class="tecla">E</span>', resaltar: '.alerta-grande', hasta: 'resuelta' },
    { texto: '¡Bien! Así se resuelven todas', dura: 4 }
  ],
  aterrizaje: [
    { texto: 'Mantén <span class="tecla">Espacio</span> para frenar y llega a la zona verde', resaltar: '.hud-aterrizaje' }
  ],
  superficie: [
    { texto: 'Pulsa <span class="tecla">E</span> para salir por la esclusa', resaltar: '.esclusa', hasta: 'esclusa' },
    { texto: 'Ve a la <b>columna de luz</b> y pulsa <span class="tecla">E</span>', hasta: 'recogida' },
    { texto: 'Lleva la muestra a la <b>pantalla verde</b> y pulsa <span class="tecla">E</span>', hasta: 'analizada' },
    { texto: '¡Muy bien! Sigue las flechas hasta las otras muestras', dura: 4 }
  ],
  informe: [
    { texto: '¡Tutorial terminado! Cuando quieras, prueba <b>Marte</b>', dura: 6 }
  ]
};

export function tutorialHecho() {
  try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; }
}

export function crearGuia(hud) {
  let activo = !tutorialHecho();
  let pasos = [];
  let i = 0;
  let ocultarEn = null;
  let resaltado = null;
  const linea = document.createElement('div');
  linea.className = 'panel guia';
  linea.style.display = 'none';
  hud.appendChild(linea);
  const flecha = document.createElement('div');
  flecha.className = 'flecha-guia';
  flecha.textContent = '⬇';
  flecha.style.display = 'none';
  hud.appendChild(flecha);

  function quitarResaltado() {
    if (resaltado) resaltado.classList.remove('resaltado-guia');
    resaltado = null;
  }

  function mostrar() {
    const p = pasos[i];
    quitarResaltado();
    if (!activo || !p) { linea.style.display = 'none'; flecha.style.display = 'none'; return; }
    linea.innerHTML = `➜ ${p.texto}`;
    linea.style.display = 'block';
    ocultarEn = p.dura ? performance.now() + p.dura * 1000 : null;
  }

  // Cada 0,25 s: ubica la flecha y el brillo sobre lo que hay que mirar
  // (la interfaz se redibuja seguido, así que se vuelve a buscar el objeto)
  setInterval(() => {
    // Con una consola o una tarjeta abierta, la guía se esconde para no tapar nada
    const oculto = !!window.consolaAbierta;
    linea.style.visibility = oculto ? 'hidden' : '';
    flecha.style.visibility = oculto ? 'hidden' : '';
    const p = pasos[i];
    if (ocultarEn && performance.now() > ocultarEn) { ocultarEn = null; i++; mostrar(); }
    if (!activo || !p || !p.resaltar || linea.style.display === 'none') { flecha.style.display = 'none'; quitarResaltado(); return; }
    const el = document.querySelector(p.resaltar);
    if (!el || !el.offsetParent) { flecha.style.display = 'none'; quitarResaltado(); return; }
    if (el !== resaltado) { quitarResaltado(); resaltado = el; el.classList.add('resaltado-guia'); }
    const r = el.getBoundingClientRect();
    flecha.style.display = 'block';
    flecha.style.left = `${r.left + r.width / 2 - 18}px`;
    flecha.style.top = `${Math.max(0, r.top - 52)}px`;
  }, 250);

  return {
    get activo() { return activo; },
    /** Una pantalla nueva: empieza su lista de pasos. */
    pantalla(nombre) { linea.dataset.pantalla = nombre; pasos = PASOS[nombre] || []; i = 0; mostrar(); },
    /** Algo pasó en el juego: si es lo que el paso esperaba, se avanza. */
    evento(nombre) {
      const p = pasos[i];
      if (activo && p && p.hasta === nombre) { i++; mostrar(); }
    },
    /** La guía solo acompaña la misión a la Luna: si eligen Marte, se apaga en esta misión. */
    desactivar() { activo = false; mostrar(); },
    reactivarSiFalta() { activo = !tutorialHecho(); },
    terminar() {
      try { localStorage.setItem(CLAVE, '1'); } catch { /* sin almacenamiento */ }
    }
  };
}
