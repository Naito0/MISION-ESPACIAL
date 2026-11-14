// =============================================================
// aprendizaje.js — "¿Qué aprendiste?", diario "Lo que aprendí" y repaso.
// - SOLO 3 conceptos por misión (aprendizaje.json → porDestino).
// - Cuando el jugador VIVE un concepto (un evento del juego: 'aterrizaje',
//   'prediccion', 'resuelta:comunicaciones'…) se muestra su tarjeta corta.
// - La tarjeta congela el juego (pausa real) hasta pulsar "Entendido".
// - Nunca durante una emergencia ni con una consola abierta: espera en fila.
// - El diario reúne todo, con contador y el resultado del último repaso.
// =============================================================
import datos from '../data/aprendizaje.json';
import { mostrarTarjeta, hayTarjeta } from './ui/tarjetas.js';

const CLAVE = 'misionEspacial.aprendido';
const CLAVE_REPASO = 'misionEspacial.repaso';
export const CONCEPTOS = datos.conceptos;
export const POR_DESTINO = datos.porDestino;
export const PREDICCIONES = datos.predicciones;
export const conceptosDe = (destinoId) => (POR_DESTINO[destinoId] || []).map((id) => CONCEPTOS.find((c) => c.id === id));

function leer(clave, vacio) {
  try { return JSON.parse(localStorage.getItem(clave) || 'null') ?? vacio; } catch { return vacio; }
}
function guardar(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
}
const dominio = (url) => { try { return new URL(url).hostname; } catch { return url; } };

/** Tarjeta corta de un concepto (una idea + "Ver más"). */
export function tarjetaConcepto(c) {
  return mostrarTarjeta({ etiqueta: '💡 ¿Qué aprendiste?', icono: c.icono, titulo: c.titulo, frase: c.corta, detalle: c.detalle, fuente: c.fuente });
}

export function crearAprendizaje(hud) {
  const aprendidos = new Set(leer(CLAVE, []));
  let vistosMision = new Set(); // conceptos ya mostrados en ESTA misión
  const cola = [];
  let puedeMostrar = () => true; // la pantalla dice "ahora no" (ej. durante una emergencia)

  // Revisa la fila: si no hay emergencia, consola ni otra tarjeta, muestra la siguiente
  setInterval(() => {
    if (!cola.length || window.consolaAbierta || hayTarjeta() || !puedeMostrar()) return;
    tarjetaConcepto(cola.shift());
  }, 400);

  return {
    /** Algo pasó en el juego (ej. 'resuelta:comunicaciones'). Solo cuentan los conceptos del destino. */
    evento(nombre, destinoId) {
      for (const c of conceptosDe(destinoId)) {
        if (!c || !c.momento.includes(nombre) || vistosMision.has(c.id)) continue;
        vistosMision.add(c.id);
        aprendidos.add(c.id);
        guardar(CLAVE, [...aprendidos]);
        cola.push(c);
      }
    },
    /** Empieza una misión nueva: los 3 conceptos se pueden volver a mostrar. */
    nuevaMision() { vistosMision = new Set(); cola.length = 0; },
    /** Marca un concepto como visto sin mostrar tarjeta (ej. cuando ya se explicó en la predicción). */
    marcar(id) { vistosMision.add(id); aprendidos.add(id); guardar(CLAVE, [...aprendidos]); },
    alPoderMostrar(fn) { puedeMostrar = fn || (() => true); },
    get cantidad() { return aprendidos.size; },
    get total() { return CONCEPTOS.length; },
    /** Guarda el resultado de las preguntas finales (para el diario y los logros). */
    guardarRepaso(destinoId, aciertos, total) {
      const r = leer(CLAVE_REPASO, {});
      r[destinoId] = { aciertos, total, fecha: new Date().toISOString().slice(0, 10) };
      guardar(CLAVE_REPASO, r);
    },
    /** Diario "Lo que aprendí": todas las tarjetas, con las aprendidas a la vista. */
    abrirDiario(alCerrar) {
      const repaso = leer(CLAVE_REPASO, {});
      const capa = document.createElement('div');
      capa.className = 'consola-capa';
      const bloque = (destinoId, nombre) => `<h3>${nombre}${repaso[destinoId] ? ` <small>· último repaso: ${repaso[destinoId].aciertos} de ${repaso[destinoId].total}</small>` : ''}</h3>
        <div class="diario-lista">${conceptosDe(destinoId).map((c) => aprendidos.has(c.id)
          ? `<div class="diario-item"><h4>${c.icono} ${c.titulo}</h4><p>${c.corta}</p><details><summary>Ver más</summary><p>${c.detalle}</p><small>Fuente: ${dominio(c.fuente)}</small></details></div>`
          : '<div class="diario-item bloqueado"><h4>🔒 ???</h4><p>Juega esta misión para descubrirlo.</p></div>').join('')}</div>`;
      capa.innerHTML = `
        <div class="panel diario">
          <h2>📖 Lo que aprendí</h2>
          <p class="contador">Has aprendido <b>${aprendidos.size} de ${CONCEPTOS.length}</b> conceptos</p>
          ${bloque('luna', '🌙 Luna')}${bloque('marte', '🔴 Marte')}
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
