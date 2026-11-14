// =============================================================
// puntaje.js — Cálculo del puntaje y récords en localStorage.
// Todos los pesos del puntaje están en src/data/config.json → "puntaje".
// =============================================================
import { CONFIG } from './datos.js';
import { estado, misionActual, destinoActual } from './estadoMision.js';

/** ¿Se cumplió el objetivo científico de la misión? */
export function objetivoCumplido() {
  const op = estado.operacion;
  if (!op) return false;
  const m = misionActual();
  return (op.datosTransmitidos[m.instrumentoRequerido] || 0) >= m.datosObjetivo;
}

/** Calcula el puntaje con su desglose (para mostrarlo en Resultados). */
export function calcularPuntaje() {
  const p = CONFIG.puntaje;
  const m = misionActual();
  const desglose = [];
  const sumar = (concepto, puntos) => {
    if (puntos !== 0) desglose.push({ concepto, puntos: Math.round(puntos) });
  };

  const at = estado.aterrizaje;
  if (at && at.exito) {
    sumar('Aterrizaje exitoso', p.bonusAterrizaje);
    // Cuanto más suave el toque, más puntos de precisión.
    const suavidad = 1 - at.vVertical / CONFIG.aterrizaje.velocidadMaxVertical;
    sumar('Precisión del aterrizaje', p.bonusPrecisionAterrizaje * Math.max(0, suavidad));
    sumar('Combustible sobrante', at.combustibleFinal * p.porKgCombustibleRestante);
  }

  const op = estado.operacion;
  if (op) {
    for (const [id, cantidad] of Object.entries(op.datosTransmitidos)) {
      const mult = id === m.instrumentoRequerido ? p.multiplicadorInstrumentoObjetivo : 1;
      const nombre = estado.nave.instrumentos.find((i) => i.id === id)?.nombre || id;
      sumar(`Datos de ${nombre} en la Tierra (${cantidad})`, cantidad * p.porDato * mult);
    }
    if (objetivoCumplido()) sumar('Objetivo científico cumplido', p.bonusObjetivoCumplido);
    sumar('Turnos sin energía', -op.turnosSinEnergia * p.penalizacionTurnoSinEnergia);
  }

  // El ahorro solo premia si la misión llegó a la superficie
  // (si no, estrellar una nave barata daría puntos).
  if (at && at.exito) {
    const sobrante = estado.presupuesto - estado.nave.costo - estado.lanzamiento.costoCohete;
    sumar(`Presupuesto sin gastar (${sobrante} M$)`, Math.max(0, sobrante) * p.porMillonSobrante);
  }

  const total = Math.max(0, desglose.reduce((s, d) => s + d.puntos, 0));
  return { total, desglose };
}

// ---------------- Récords (localStorage) ----------------

/** Lee los récords guardados. Si localStorage no está disponible, devuelve []. */
export function cargarRecords() {
  try {
    const texto = localStorage.getItem(CONFIG.records.claveLocalStorage);
    const lista = texto ? JSON.parse(texto) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

/** Guarda el puntaje si entra en el top. Devuelve { records, esRecord }. */
export function guardarRecord(puntaje) {
  const anteriores = cargarRecords();
  const mejorAnterior = anteriores.length ? anteriores[0].puntaje : 0;
  const nuevo = {
    puntaje,
    mision: misionActual().nombre,
    destino: destinoActual().nombre,
    fecha: new Date().toLocaleDateString('es')
  };
  const records = [...anteriores, nuevo]
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, CONFIG.records.cantidadGuardada);
  try {
    localStorage.setItem(CONFIG.records.claveLocalStorage, JSON.stringify(records));
  } catch {
    // Sin localStorage (modo privado): el juego sigue funcionando sin récords.
  }
  return { records, esRecord: puntaje > mejorAnterior };
}
