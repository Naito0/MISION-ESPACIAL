// =============================================================
// averias.js — FUNCIONES PURAS de las averías durante la travesía.
// Si la nave tiene la protección, la avería no pasa. Si no, se juega un
// minijuego de reparación: si se repara a tiempo no hay daño; si no, se aplica.
// =============================================================

/** Elige 'cantidad' averías distintas (las de tripulación solo si la misión es tripulada). */
export function sortearAverias(averias, cantidad, tripulada, rng = Math.random) {
  const bolsa = averias.filter((a) => tripulada || !a.soloTripulada);
  const elegidas = [];
  while (elegidas.length < cantidad && bolsa.length > 0) {
    const total = bolsa.reduce((s, a) => s + a.probabilidad, 0);
    let r = rng() * total;
    let indice = bolsa.length - 1;
    for (let i = 0; i < bolsa.length; i++) {
      r -= bolsa[i].probabilidad;
      if (r <= 0) { indice = i; break; }
    }
    elegidas.push(bolsa.splice(indice, 1)[0]);
  }
  return elegidas;
}

/** ¿La nave ya está protegida contra esta avería? */
export function estaMitigada(averia, efectosDiseno) {
  return !!averia.mitigadoPor && efectosDiseno.includes(averia.mitigadoPor);
}

/** Estado inicial de los daños del viaje (todo intacto). */
export function viajeIntacto() {
  return { perdidaCombustible: 0, factorPaneles: 1, factorAntena: 1, diasExtra: 0, soportePerdido: 0, averias: [] };
}

/**
 * Registra el resultado de una avería y, si no se reparó, aplica el daño.
 * Devuelve un objeto viaje NUEVO (no modifica el anterior).
 * @param resultado 'mitigada' | 'reparada' | 'fallida'
 */
export function registrarAveria(viaje, averia, resultado) {
  const v = { ...viaje, averias: [...viaje.averias] };
  if (resultado === 'fallida') {
    for (const d of averia.danio) {
      if (d.tipo === 'combustible') v.perdidaCombustible = 1 - (1 - v.perdidaCombustible) * (1 - d.porcentaje / 100);
      if (d.tipo === 'paneles') v.factorPaneles *= 1 - d.porcentaje / 100;
      if (d.tipo === 'antena') v.factorAntena *= 1 - d.porcentaje / 100;
      if (d.tipo === 'diasExtra') v.diasExtra += d.dias;
      if (d.tipo === 'soporte') v.soportePerdido += d.diasPersona;
    }
  }
  const textos = { mitigada: averia.textoMitigado, reparada: averia.textoReparado, fallida: averia.textoDanio };
  v.averias.push({
    id: averia.id, nombre: averia.nombre, minijuego: averia.minijuego, resultado,
    mitigadoPor: averia.mitigadoPor, texto: textos[resultado], explicacion: averia.explicacion
  });
  return v;
}

/** Aplica los daños del viaje a una copia del diseño (para la simulación). */
export function aplicarDaniosAlDiseno(diseno, viaje) {
  if (!viaje) return diseno;
  return {
    ...diseno,
    generacionNominal: diseno.generacionNominal * viaje.factorPaneles,
    tasaAntena: diseno.tasaAntena * viaje.factorAntena
  };
}
