// =============================================================
// lanzamiento.js — FUNCIONES PURAS: compatibilidad cohete/órbita/masa,
// combustible para entrar en órbita y costo por retraso.
// =============================================================

/** ¿Puede este cohete llevar esta masa a esta órbita? Devuelve { ok, capacidad, motivo }. */
export function verificarCohete(cohete, orbita, masaTotal) {
  const capacidad = cohete.capacidad[orbita.id];
  if (capacidad === undefined) {
    return { ok: false, capacidad: 0, motivo: `No tiene potencia para llegar a ${orbita.nombre}.` };
  }
  if (masaTotal > capacidad) {
    return {
      ok: false, capacidad,
      motivo: `Lleva hasta ${capacidad} kg a esa órbita y tu nave pesa ${masaTotal} kg (${masaTotal - capacidad} kg de más).`
    };
  }
  return { ok: true, capacidad, motivo: `Puede llevar tu nave (${masaTotal} de ${capacidad} kg).` };
}

/** El cohete más barato que puede llevar la nave a la órbita (o null). */
export function coheteMasBarato(cohetes, orbita, masaTotal) {
  return [...cohetes]
    .sort((a, b) => a.costo - b.costo)
    .find((c) => verificarCohete(c, orbita, masaTotal).ok) || null;
}

/** Combustible para frenar/entrar en la órbita: proporcional a la masa de la nave. */
export function calcularInsercion(masaTotal, combustible, orbita) {
  const necesario = Math.round(masaTotal * orbita.factorCombustible);
  const gastado = Math.min(necesario, combustible);
  return { disponible: combustible, necesario, gastado, quedan: combustible - gastado, ok: combustible >= necesario };
}

/** Costo extra por cada mes de desarrollo que supera el plazo. */
export function costoRetraso(mesesDesarrollo, plazoMeses, costoPorMes) {
  return Math.max(0, mesesDesarrollo - plazoMeses) * costoPorMes;
}
