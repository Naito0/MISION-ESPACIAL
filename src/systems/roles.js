// =============================================================
// roles.js — FUNCIONES PURAS del modo equipo: reparto de roles
// (Comandante, Ingeniero, Científico/médico, Comunicaciones y recursos)
// y evaluación de sus metas, que chocan entre sí a propósito.
// =============================================================

/**
 * Reparte los roles entre N jugadores (con menos de 4, alguien toma varios).
 * Devuelve [{ jugador: 1, roles: ['comandante', 'cientifico'] }, ...]
 */
export function asignarRoles(roles, numJugadores) {
  const jugadores = Array.from({ length: numJugadores }, (_, i) => ({ jugador: i + 1, roles: [] }));
  roles.forEach((rol, i) => jugadores[i % numJugadores].roles.push(rol.id));
  return jugadores;
}

/**
 * Evalúa la meta de cada rol con los números actuales del diseño.
 * c = { margenes: { cohete, masa, energia }, valorMes, metaValorMensual, operativo,
 *       costoTotal, presupuesto, soporte (o null si no hay tripulación) }
 * Devuelve [{ rolId, nombre, abreviatura, texto, ok, detalle }]
 */
export function evaluarMetas(roles, c) {
  const pct = (x) => `${Math.round(x * 100)}%`;
  return roles.map((rol) => {
    const m = rol.meta;
    let ok = false;
    let detalle = '';
    switch (m.tipo) {
      case 'cohete':
        ok = c.margenes.cohete >= m.minimo;
        detalle = c.margenes.cohete > -1
          ? `Margen de capacidad del cohete: ${pct(c.margenes.cohete)} (mínimo ${pct(m.minimo)})`
          : 'Ningún cohete puede llevar la nave a esa órbita';
        break;
      case 'margenes':
        ok = c.margenes.masa >= m.minimo && c.margenes.energia >= m.minimo;
        detalle = `Margen de masa ${pct(c.margenes.masa)} · de energía ${pct(c.margenes.energia)} (mínimo ${pct(m.minimo)})`;
        break;
      case 'ciencia': {
        const soporteOk = !c.soporte || c.soporte.suficiente;
        ok = c.valorMes >= c.metaValorMensual && soporteOk;
        detalle = `Valor científico ${c.valorMes.toFixed(1)} de ${c.metaValorMensual} por mes` +
          (c.soporte ? ` · soporte vital ${c.soporte.disponible}/${c.soporte.necesario} días-persona` : '');
        break;
      }
      case 'datosPresupuesto': {
        const datosOk = c.operativo.enlaceOk && c.operativo.datosGeneradosDia > 0 &&
          c.operativo.capacidadEnvioDia >= c.operativo.datosGeneradosDia;
        ok = datosOk && c.costoTotal <= c.presupuesto;
        detalle = `Envía ${c.operativo.capacidadEnvioDia.toFixed(2)} de ${c.operativo.datosGeneradosDia.toFixed(2)} GB/día · costo ${c.costoTotal}/${c.presupuesto} M$`;
        break;
      }
      default:
        detalle = 'Meta desconocida';
    }
    return { rolId: rol.id, nombre: rol.nombre, abreviatura: rol.abreviatura, texto: m.texto, ok, detalle };
  });
}
