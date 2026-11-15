// =============================================================
// logros.js (aventura) — Medallas en el juego:
// - Aviso PEQUEÑO en una esquina cuando se gana una (no interrumpe ni tapa nada).
// - Lista de logros de la misión (para el informe).
// - "Sala de trofeos" en el menú: todas las medallas; las bloqueadas en gris con su pista.
// - El progreso se guarda en localStorage. Las condiciones están en src/data/logros.json.
// =============================================================
import datos from '../data/logros.json';
import { nuevosLogros } from '../compartido/logros.js';
import { efecto } from './audio.js';

const CLAVE = 'misionEspacial.logros';
export const LOGROS = datos.logros;
export const CONFIG_ESTRELLAS = datos.estrellas;

function leer() { try { return JSON.parse(localStorage.getItem(CLAVE) || '[]'); } catch { return []; } }
function guardar(l) { try { localStorage.setItem(CLAVE, JSON.stringify(l)); } catch { /* sin almacenamiento */ } }

export function crearLogros(hud) {
  let ganados = leer();
  let deEstaMision = [];
  let stats = { golpes: 0 }; // datos de la misión que se juntan mientras se juega
  const zona = document.createElement('div');
  zona.className = 'logros-avisos';
  hud.appendChild(zona);

  function avisar(id) {
    const l = LOGROS.find((x) => x.id === id);
    const d = document.createElement('div');
    d.className = 'panel logro-aviso';
    d.innerHTML = `<span class="la-icono">${l.icono}</span><div><small>🏅 ¡Medalla nueva!</small><br><b>${l.nombre}</b></div>`;
    zona.appendChild(d);
    efecto('exito');
    setTimeout(() => d.classList.add('saliendo'), 4000);
    setTimeout(() => d.remove(), 4600);
  }

  /** Revisa los datos y otorga los logros nuevos. Devuelve la lista de ids nuevos. */
  function revisar(m) {
    const nuevos = nuevosLogros(m, LOGROS, ganados);
    if (!nuevos.length) return [];
    ganados = [...ganados, ...nuevos];
    deEstaMision = [...deEstaMision, ...nuevos];
    guardar(ganados);
    nuevos.forEach((id, i) => setTimeout(() => avisar(id), i * 700));
    return nuevos;
  }

  // Minijuegos ganados (los manda cada minijuego): fuga rápida, filtro, golpes de micrometeoritos…
  // (las demostraciones y el Modo prueba no cuentan: window.sinLogros)
  window.addEventListener('minijuego-ganado', (e) => { if (!window.sinLogros) revisar({ minijuego: e.detail }); });
  window.addEventListener('impacto-meteorito', () => { if (!window.sinLogros) stats.golpes++; });

  return {
    revisar,
    get stats() { return stats; },
    get deEstaMision() { return deEstaMision; },
    nuevaMision() { deEstaMision = []; stats = { golpes: 0 }; },
    /** Sala de trofeos: todas las medallas, las bloqueadas en gris con una pista. */
    abrirSala(alCerrar) {
      const capa = document.createElement('div');
      capa.className = 'consola-capa';
      capa.innerHTML = `
        <div class="panel diario trofeos">
          <h2>🏆 Sala de trofeos</h2>
          <p class="contador">Tienes <b>${ganados.length} de ${LOGROS.length}</b> medallas</p>
          <div class="trofeos-lista">${LOGROS.map((l) => ganados.includes(l.id)
            ? `<div class="trofeo"><span class="t-icono">${l.icono}</span><b>${l.nombre}</b><small>${l.pista}</small></div>`
            : `<div class="trofeo bloqueado"><span class="t-icono">🔒</span><b>${l.nombre}</b><small>Pista: ${l.pista}</small></div>`).join('')}</div>
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
