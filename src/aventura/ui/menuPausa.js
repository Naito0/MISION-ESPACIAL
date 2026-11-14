// =============================================================
// menuPausa.js — Menú que se abre con ESC: continuar, tamaño de texto,
// calidad gráfica, sensibilidad del mouse, sonido y botones extra
// (por ejemplo el diario "Lo que aprendí").
// Cambiar la calidad recarga la página (el renderizador se crea con ella).
// =============================================================
import { NIVELES_CALIDAD } from '../engine/calidad.js';
import {
  calidad3D, setCalidad3D, sensibilidad3D, setSensibilidad3D, estaSilenciado, setSilencio,
  tamanoTexto, setTamanoTexto
} from '../../systems/preferencias.js';

/** Aplica el tamaño de texto guardado (clase en <html>, ver estilos.css). */
export function aplicarTamanoTexto() {
  document.documentElement.classList.toggle('texto-normal', tamanoTexto() === 'normal');
}

/**
 * Crea el menú dentro de #hud. alAbrir/alCerrar pausan y reanudan el juego.
 * extras = [{ texto, accion }] botones adicionales.
 * Devuelve { abrir, cerrar, alternar, abierto }.
 */
export function crearMenuPausa(hud, { alAbrir, alCerrar, extras = [] }) {
  aplicarTamanoTexto();
  const menu = document.createElement('div');
  menu.className = 'panel menu';
  const botonesCalidad = Object.entries(NIVELES_CALIDAD)
    .map(([id, c]) => `<button data-calidad="${id}" class="${calidad3D() === id ? 'activo' : ''}">${c.nombre}</button>`).join('');
  menu.innerHTML = `
    <h2>⏸ Pausa</h2>
    <button data-accion="continuar">▶ Continuar</button>
    ${extras.map((x, i) => `<button data-extra="${i}">${x.texto}</button>`).join('')}
    <h3>Tamaño de texto</h3>
    <div class="fila"><button data-texto="normal">Normal</button><button data-texto="grande">Grande</button></div>
    <h3>Calidad gráfica</h3>
    <div class="fila">${botonesCalidad}</div>
    <h3>Sensibilidad del mouse: <span data-valor>${sensibilidad3D().toFixed(1)}</span></h3>
    <input type="range" min="0.3" max="2.5" step="0.1" value="${sensibilidad3D()}" style="width:100%; height:28px">
    <button data-accion="sonido">🔊 Sonido: sí / no</button>`;
  hud.appendChild(menu);

  const marcarTexto = () => menu.querySelectorAll('[data-texto]').forEach((b) => b.classList.toggle('activo', b.dataset.texto === tamanoTexto()));
  marcarTexto();
  menu.querySelectorAll('[data-texto]').forEach((b) => {
    b.onclick = () => { setTamanoTexto(b.dataset.texto); aplicarTamanoTexto(); marcarTexto(); };
  });

  const estado = { abierto: false };
  const abrir = () => { estado.abierto = true; menu.style.display = 'block'; if (document.pointerLockElement) document.exitPointerLock(); alAbrir?.(); };
  const cerrar = () => { estado.abierto = false; menu.style.display = 'none'; alCerrar?.(); };

  menu.querySelector('[data-accion="continuar"]').onclick = cerrar;
  menu.querySelector('[data-accion="sonido"]').onclick = () => { setSilencio(!estaSilenciado()); };
  menu.querySelectorAll('[data-extra]').forEach((b) => { b.onclick = () => { cerrar(); extras[b.dataset.extra].accion(); }; });
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
