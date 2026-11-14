// =============================================================
// menuPausa.js — Menú que se abre con ESC: continuar, calidad gráfica,
// sensibilidad del mouse y volver al modo clásico.
// Cambiar la calidad recarga la página (el renderizador se crea con ella).
// =============================================================
import { NIVELES_CALIDAD } from '../engine/calidad.js';
import { calidad3D, setCalidad3D, sensibilidad3D, setSensibilidad3D, estaSilenciado, setSilencio } from '../../systems/preferencias.js';

/**
 * Crea el menú dentro de #hud. alAbrir/alCerrar pausan y reanudan el juego.
 * Devuelve { abrir, cerrar, alternar, abierto }.
 */
export function crearMenuPausa(hud, { alAbrir, alCerrar }) {
  const menu = document.createElement('div');
  menu.className = 'panel menu';
  const botonesCalidad = Object.entries(NIVELES_CALIDAD)
    .map(([id, c]) => `<button data-calidad="${id}" class="${calidad3D() === id ? 'activo' : ''}">${c.nombre}</button>`).join('');
  menu.innerHTML = `
    <h2>⏸ Pausa</h2>
    <button data-accion="continuar">▶ Continuar</button>
    <p>Calidad gráfica</p>
    <div class="fila">${botonesCalidad}</div>
    <p>Sensibilidad del mouse: <span data-valor>${sensibilidad3D().toFixed(1)}</span></p>
    <input type="range" min="0.3" max="2.5" step="0.1" value="${sensibilidad3D()}" style="width:100%">
    <button data-accion="sonido">🔊 Sonido: sí / no</button>`;
  hud.appendChild(menu);

  const estado = { abierto: false };
  const abrir = () => { estado.abierto = true; menu.style.display = 'block'; if (document.pointerLockElement) document.exitPointerLock(); alAbrir?.(); };
  const cerrar = () => { estado.abierto = false; menu.style.display = 'none'; alCerrar?.(); };

  menu.querySelector('[data-accion="continuar"]').onclick = cerrar;
  menu.querySelector('[data-accion="sonido"]').onclick = () => { setSilencio(!estaSilenciado()); };
  menu.querySelectorAll('[data-calidad]').forEach((b) => {
    b.onclick = () => { setCalidad3D(b.dataset.calidad); window.location.reload(); };
  });
  const deslizador = menu.querySelector('input');
  deslizador.oninput = () => {
    setSensibilidad3D(Number(deslizador.value));
    menu.querySelector('[data-valor]').textContent = Number(deslizador.value).toFixed(1);
  };

  return { abrir, cerrar, alternar: () => (estado.abierto ? cerrar() : abrir()), get abierto() { return estado.abierto; } };
}
