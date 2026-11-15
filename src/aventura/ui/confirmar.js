// =============================================================
// confirmar.js — Ventana de confirmación DENTRO del juego (no la del navegador).
// confirmarEnJuego('¿Seguro…?', 'detalle') → Promise<true | false>
// Esc o "No" = false. Mientras está abierta, el juego de un jugador queda en pausa.
// =============================================================
import { pausar, reanudar } from '../pausa.js';
import { efecto } from '../audio.js';

export function confirmarEnJuego(pregunta, detalle = '', { si = 'Sí, salir', no = 'No, seguir jugando' } = {}) {
  return new Promise((resolver) => {
    if (document.pointerLockElement) document.exitPointerLock();
    pausar('confirmar');
    window.consolaAbierta = true; // que Esc no abra el menú de pausa al mismo tiempo
    const capa = document.createElement('div');
    capa.className = 'confirmar-capa';
    capa.innerHTML = `
      <div class="panel confirmar">
        <h2>${pregunta}</h2>
        ${detalle ? `<p>${detalle}</p>` : ''}
        <div class="fila">
          <button class="boton confirmar-si">${si}</button>
          <button class="boton secundario confirmar-no">${no}</button>
        </div>
      </div>`;
    document.getElementById('hud').appendChild(capa);
    const cerrar = (r) => {
      capa.remove();
      window.removeEventListener('keydown', tecla, true);
      window.consolaAbierta = false;
      reanudar('confirmar');
      efecto('clic');
      resolver(r);
    };
    const tecla = (e) => { if (e.key === 'Escape') { e.stopPropagation(); cerrar(false); } };
    window.addEventListener('keydown', tecla, true);
    capa.querySelector('.confirmar-si').onclick = () => cerrar(true);
    capa.querySelector('.confirmar-no').onclick = () => cerrar(false);
    capa.querySelector('.confirmar-no').focus();
  });
}
