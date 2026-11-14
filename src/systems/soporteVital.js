// =============================================================
// soporteVital.js — FUNCIÓN PURA: ¿alcanzan el oxígeno, el agua y la comida?
// Se mide en "días-persona": 1 astronauta durante 1 día.
// =============================================================

/**
 * @param p.tripulantes     cantidad de astronautas
 * @param p.diasViaje       días de viaje de ida (la vuelta tarda lo mismo)
 * @param p.diasSuperficie  días de estadía en el destino
 * @param p.diasExtra       días de demora por averías
 * @param p.diasPersona     suministros que lleva la nave
 * @param p.perdidos        días-persona perdidos por averías (fugas)
 */
export function calcularSoporte(p) {
  const diasMision = 2 * p.diasViaje + p.diasSuperficie + (p.diasExtra || 0); // ida + estadía + vuelta
  const necesario = p.tripulantes * diasMision;
  const disponible = (p.diasPersona || 0) - (p.perdidos || 0);
  return {
    diasMision,
    necesario,
    disponible,
    suficiente: disponible >= necesario,
    margen: necesario > 0 ? disponible / necesario - 1 : 0
  };
}
