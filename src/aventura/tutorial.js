// =============================================================
// tutorial.js — La PRIMERA misión (a la Luna) es un tutorial.
// Orbi, el robot guía, muestra un paso a la vez y resalta con una flecha
// lo que hay que tocar. Cada pantalla avisa lo que pasa con
//   tutorial.pantalla('hangar')  y  tutorial.evento('completo')
// y el tutorial avanza al siguiente paso cuando llega el evento esperado.
// Al terminar el informe de la Luna se marca como hecho (localStorage).
// =============================================================

const CLAVE = 'misionEspacial.tutorialHecho';

// Pasos por pantalla. "hasta" = evento que pasa al paso siguiente;
// "resaltar" = selector CSS de lo que hay que mirar; "dura" = segundos y se oculta.
const PASOS = {
  sistema: [
    { texto: '¡Hola! Soy Orbi. Tu primera misión es a la <b>Luna</b>: es la más fácil. Toca <b>"¡Vamos a la Luna!"</b>', resaltar: '#ir' }
  ],
  hangar: [
    { texto: 'Esta es la tienda. Las categorías que dicen <b>"falta"</b> necesitan una pieza. Toca una pieza para comprarla.', resaltar: '.categoria .falta', hasta: 'completo' },
    { texto: '¡Nave completa! Mira el holograma: dinero, masa y energía. Ahora pulsa <b>"¡Listo!"</b>', resaltar: '#listo' }
  ],
  viaje: [
    { texto: 'Controlas al <b>Piloto</b>. Pulsa <span class="tecla">2</span> para ir con el Ingeniero (o toca su retrato).', resaltar: '.retrato[data-i="1"]', hasta: 'cambio' },
    { texto: '¡Bien! Cada astronauta trabaja en su sala. Espera una emergencia: el aviso rojo dirá a quién le toca.', hasta: 'emergencia' },
    { texto: '¡Emergencia! Pulsa la tecla que dice el aviso, camina a la consola con <b>"!"</b> y pulsa <span class="tecla">E</span>. Primero piensas la causa y después la arreglas.', resaltar: '.alerta-grande', hasta: 'resuelta' },
    { texto: '¡Excelente! Así se resuelven todas. Aguanta hasta llegar a la Luna.', dura: 7 }
  ],
  aterrizaje: [
    { texto: 'Mantén <span class="tecla">Espacio</span> para encender el motor y frenar. Toca el suelo despacio: menos de 2.5 m/s (verde).', resaltar: '.hud-aterrizaje' }
  ],
  superficie: [
    { texto: 'Estás en la <b>esclusa</b> del módulo. Pulsa <span class="tecla">E</span> para despresurizar y salir.', hasta: 'esclusa' },
    { texto: 'Camina hasta la <b>columna de luz</b> y pulsa <span class="tecla">E</span> para recoger la muestra.', hasta: 'recogida' },
    { texto: 'Ahora ve a la <b>pantalla verde</b> junto al módulo y pulsa <span class="tecla">E</span> para analizarla.', hasta: 'analizada' },
    { texto: '¡Muy bien! Busca las otras muestras siguiendo las flechas.', dura: 6 }
  ],
  informe: [
    { texto: '¡Terminaste el tutorial! 🎉 Lee lo que aprendiste. Cuando quieras, prueba <b>Marte</b>: es más difícil.', dura: 12 }
  ]
};

export function tutorialHecho() {
  try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; }
}

export function crearTutorial(hud) {
  let activo = !tutorialHecho();
  let pasos = [];
  let i = 0;
  let ocultarEn = null;
  const caja = document.createElement('div');
  caja.className = 'panel guia';
  caja.style.display = 'none';
  hud.appendChild(caja);
  const flecha = document.createElement('div');
  flecha.className = 'flecha-guia';
  flecha.textContent = '⬇';
  flecha.style.display = 'none';
  hud.appendChild(flecha);

  function mostrar() {
    const p = pasos[i];
    if (!activo || !p) { caja.style.display = 'none'; flecha.style.display = 'none'; return; }
    caja.innerHTML = `<span class="guia-robot">🤖</span><div>${p.texto}</div>`;
    caja.style.display = 'flex';
    ocultarEn = p.dura ? performance.now() + p.dura * 1000 : null;
  }

  // Cada 0,25 s: ubica la flecha sobre lo que hay que mirar (la interfaz se redibuja seguido)
  setInterval(() => {
    // Con una consola o una tarjeta abierta, Orbi se esconde para no tapar nada
    caja.style.visibility = window.consolaAbierta ? 'hidden' : '';
    flecha.style.visibility = window.consolaAbierta ? 'hidden' : '';
    const p = pasos[i];
    if (ocultarEn && performance.now() > ocultarEn) { ocultarEn = null; i++; mostrar(); }
    if (!activo || !p || !p.resaltar || caja.style.display === 'none') { flecha.style.display = 'none'; return; }
    const el = document.querySelector(p.resaltar);
    if (!el || !el.offsetParent) { flecha.style.display = 'none'; return; }
    const r = el.getBoundingClientRect();
    flecha.style.display = 'block';
    flecha.style.left = `${r.left + r.width / 2 - 18}px`;
    flecha.style.top = `${Math.max(0, r.top - 52)}px`;
  }, 250);

  return {
    get activo() { return activo; },
    /** Una pantalla nueva: empieza su lista de pasos. */
    pantalla(nombre) { caja.dataset.pantalla = nombre; pasos = PASOS[nombre] || []; i = 0; mostrar(); },
    /** Algo pasó en el juego: si es lo que el paso esperaba, se avanza. */
    evento(nombre) {
      const p = pasos[i];
      if (activo && p && p.hasta === nombre) { i++; mostrar(); }
    },
    /** El tutorial solo vale para la Luna: si eligen Marte, se apaga en esta misión. */
    desactivar() { activo = false; mostrar(); },
    reactivarSiFalta() { activo = !tutorialHecho(); },
    terminar() {
      try { localStorage.setItem(CLAVE, '1'); } catch { /* sin almacenamiento */ }
    }
  };
}
