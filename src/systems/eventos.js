// =============================================================
// eventos.js — FUNCIÓN PURA para sortear los eventos de la misión.
// - Eventos del ambiente (tormentas, impactos, frío): se eligen 'cantidad'.
// - Fallas internas: cada una ocurre con una probabilidad que depende
//   del RIESGO del diseño (más componentes nuevos = más fallas).
// rng = función que devuelve un número entre 0 y 1 (Math.random por defecto).
// =============================================================

/**
 * @param eventos       lista de eventos.json
 * @param cantidad      cuántos eventos del ambiente ocurren (según el nivel)
 * @param duracionMeses duración de la misión
 * @param riesgo        riesgo del diseño (0 a 1)
 * @param multiplicador multiplicador de fallas (config.riesgo.multiplicadorFallas)
 * Devuelve la lista ordenada por mes: [{ ...evento, mes }]
 */
export function sortearEventos(eventos, cantidad, duracionMeses, riesgo, multiplicador = 1, rng = Math.random) {
  // 1) Eventos del ambiente: sorteo ponderado sin repetir
  const bolsa = eventos.filter((e) => !e.esFalla);
  const elegidos = [];
  while (elegidos.length < cantidad && bolsa.length > 0) {
    const total = bolsa.reduce((s, e) => s + e.probabilidad, 0);
    let r = rng() * total;
    let indice = bolsa.length - 1;
    for (let i = 0; i < bolsa.length; i++) {
      r -= bolsa[i].probabilidad;
      if (r <= 0) { indice = i; break; }
    }
    elegidos.push(bolsa.splice(indice, 1)[0]);
  }

  // 2) Fallas internas: dependen del riesgo
  for (const falla of eventos.filter((e) => e.esFalla)) {
    const probabilidad = Math.min(0.95, riesgo * multiplicador * falla.probabilidad);
    if (rng() < probabilidad) elegidos.push(falla);
  }

  // 3) Mes de cada evento: entre el mes 1 y el penúltimo
  const ultimoMes = Math.max(1, duracionMeses - 1);
  return elegidos
    .map((e) => ({ ...e, mes: 1 + Math.floor(rng() * ultimoMes) }))
    .sort((a, b) => a.mes - b.mes);
}
