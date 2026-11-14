// =============================================================
// aprendizaje.js — Tarjetas "¿Qué aprendiste?" y diario "Lo que aprendí".
// - Cuando el jugador VIVE un concepto (un evento del juego, ver "momento"
//   en src/data/aprendizaje.json), aparece una tarjeta corta con la
//   explicación y un dato de la NASA. Solo la primera vez.
// - Nunca durante una emergencia: si hay una, la tarjeta espera en una cola.
// - El diario reúne todas las tarjetas con un contador (localStorage).
// =============================================================
import datos from '../data/aprendizaje.json';
import { efecto } from './audio.js';

const CLAVE = 'misionEspacial.aprendido';
export const CONCEPTOS = datos.conceptos;
export const PREGUNTAS = datos.preguntas;

function leer() {
  try { return new Set(JSON.parse(localStorage.getItem(CLAVE) || '[]')); } catch { return new Set(); }
}
function guardar(set) {
  try { localStorage.setItem(CLAVE, JSON.stringify([...set])); } catch { /* sin almacenamiento */ }
}

const dominio = (url) => { try { return new URL(url).hostname; } catch { return url; } };

export function crearAprendizaje(hud) {
  const aprendidos = leer();
  const cola = [];
  let visible = null;
  let puedeMostrar = () => true; // cada pantalla puede decir "ahora no" (ej. durante una emergencia)

  const tarjeta = document.createElement('div');
  tarjeta.className = 'panel tarjeta-aprendizaje';
  tarjeta.style.display = 'none';
  hud.appendChild(tarjeta);

  function mostrar(c) {
    visible = c;
    tarjeta.innerHTML = `
      <h3>💡 ¿Qué aprendiste?</h3>
      <h4>${c.titulo}</h4>
      <p>${c.explicacion}</p>
      <p class="dato">🚀 <b>Dato de la NASA:</b> ${c.dato}</p>
      <small>Fuente: ${dominio(c.fuente)} · ${aprendidos.size} de ${CONCEPTOS.length} conceptos</small>
      <button class="boton">¡Entendido!</button>`;
    tarjeta.style.display = 'block';
    tarjeta.querySelector('button').onclick = cerrar;
    efecto('exito');
    clearTimeout(mostrar.t);
    mostrar.t = setTimeout(cerrar, 16000);
  }
  function cerrar() { tarjeta.style.display = 'none'; visible = null; }

  // Revisa la cola: si se puede mostrar y no hay otra tarjeta, muestra la siguiente
  setInterval(() => {
    // Si empieza una emergencia con una tarjeta abierta, se esconde y vuelve a la cola
    // (lo mismo si se abre una consola o el diario)
    if (visible && (!puedeMostrar() || window.consolaAbierta)) { cola.unshift(visible); cerrar(); return; }
    if (visible || !cola.length || window.consolaAbierta) return;
    if (!puedeMostrar()) return;
    mostrar(cola.shift());
  }, 500);

  return {
    /** Algo pasó en el juego (ej. 'resuelta:oxigeno'). destinoId filtra los conceptos de un destino. */
    evento(nombre, destinoId) {
      for (const c of CONCEPTOS) {
        if (!c.momento.includes(nombre)) continue;
        if (c.destino && c.destino !== destinoId) continue;
        if (aprendidos.has(c.id) || cola.includes(c) || visible === c) continue;
        aprendidos.add(c.id);
        guardar(aprendidos);
        cola.push(c);
      }
    },
    /** La pantalla actual dice cuándo se puede interrumpir (función que devuelve true/false). */
    alPoderMostrar(fn) { puedeMostrar = fn || (() => true); },
    get cantidad() { return aprendidos.size; },
    /** Diario "Lo que aprendí": todas las tarjetas, con las aprendidas a la vista. */
    abrirDiario(alCerrar) {
      const capa = document.createElement('div');
      capa.className = 'consola-capa';
      capa.innerHTML = `
        <div class="panel diario">
          <h2>📖 Lo que aprendí</h2>
          <p class="contador">Has aprendido <b>${aprendidos.size} de ${CONCEPTOS.length}</b> conceptos</p>
          <div class="diario-lista">${CONCEPTOS.map((c) => aprendidos.has(c.id)
            ? `<div class="diario-item"><h4>✅ ${c.titulo}</h4><p>${c.explicacion}</p><p class="dato">🚀 ${c.dato}</p><small>Fuente: ${dominio(c.fuente)}</small></div>`
            : `<div class="diario-item bloqueado"><h4>🔒 ???</h4><p>Sigue jugando para descubrirlo.</p></div>`).join('')}</div>
          <button class="boton cerrar-diario">Cerrar</button>
        </div>`;
      hud.appendChild(capa);
      window.consolaAbierta = true;
      const fin = () => { capa.remove(); window.consolaAbierta = false; window.removeEventListener('keydown', esc); alCerrar?.(); };
      const esc = (e) => { if (e.key === 'Escape') fin(); };
      window.addEventListener('keydown', esc);
      capa.querySelector('.cerrar-diario').onclick = fin;
    }
  };
}
