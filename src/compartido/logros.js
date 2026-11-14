// =============================================================
// logros.js — Estrellas y medallas (funciones puras, con pruebas).
// Las condiciones están en src/data/logros.json.
//
// m = {
//   exito, destinoId, vida,
//   estados: { categoria: 'ok'|'justo'|'bajo'|'exagerado'|'vacio' } (barras del hangar),
//   costo, presupuesto,
//   impactos (micrometeoritos que golpearon la nave),
//   minijuego: { id, segundos } (cuando se acaba de ganar uno),
//   aciertos, totalPreguntas (preguntas finales),
//   aprendidos, totalConceptos,
//   fraccionTiempo (tiempo promedio para resolver emergencias ÷ tiempo disponible; 0..1)
// }
// =============================================================

/** Estrellas de una misión: 1 base si se cumplió, +1 por vida, +1 por rapidez, +1 por preguntas (máx. 3). */
export function estrellasMision(m, cfg) {
  if (!m.exito) return 0;
  let e = 1;
  if (m.vida >= cfg.vidaMinima) e++;
  if ((m.fraccionTiempo ?? 1) <= cfg.tiempoMaximo) e++;
  if ((m.aciertos ?? 0) >= cfg.aciertosMinimos) e++;
  return Math.min(3, e);
}

/** ¿Se cumple la condición de un logro con estos datos? */
export function cumple(logro, m) {
  const c = logro.condicion;
  switch (c.tipo) {
    case 'mision': return !!m.exito && m.destinoId === c.destino;
    case 'vida': return !!m.exito && m.vida > c.minimo;
    case 'diseno': {
      const estados = Object.values(m.estados || {});
      return !!m.exito && estados.length > 0 && estados.every((s) => s === 'ok');
    }
    case 'presupuesto': return !!m.exito && m.presupuesto > 0 && m.costo < m.presupuesto * c.maximo;
    case 'impactos': return !!m.exito && (m.impactos ?? 0) <= c.maximo;
    case 'minijuego': return !!m.minijuego && m.minijuego.id === c.id && (c.segundosMax === undefined || m.minijuego.segundos < c.segundosMax);
    case 'preguntas': return (m.aciertos ?? 0) >= c.aciertos;
    case 'coleccion': return m.totalConceptos > 0 && m.aprendidos >= m.totalConceptos;
    default: return false;
  }
}

/** Logros NUEVOS que se ganan con estos datos (los que ya se tenían no se repiten). */
export function nuevosLogros(m, logros, yaGanados = []) {
  return logros.filter((l) => !yaGanados.includes(l.id) && cumple(l, m)).map((l) => l.id);
}
