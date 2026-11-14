// =============================================================
// checklist.js — FUNCIÓN PURA: convierte los requisitos de la misión en
// un checklist que se marca solo según el diseño actual.
// Es una ESTIMACIÓN (sin eventos al azar): sirve para guiar al jugador
// mientras diseña. El resultado real se ve después de la simulación.
// =============================================================
import { calcularInsercion } from './lanzamiento.js';

const r1 = (n) => Math.round(n * 10) / 10;

/**
 * @param a       resultado de analizarDiseno() (diseño, operativo, órbita, costos...)
 * @param mision  misión actual
 * @param presupuesto presupuesto de la partida
 * Devuelve [{ id, icono, texto, ok, detalle }]
 */
export function generarChecklist(a, mision, presupuesto) {
  const d = a.diseno;
  const op = a.operativo;
  const req = mision.requisitos;
  const mesesUtiles = Math.min(mision.duracionMeses, a.vidaEsperada);
  const fraccionEnviada = op.datosGeneradosDia > 0 ? Math.min(1, op.capacidadEnvioDia / op.datosGeneradosDia) : 0;
  const datosEstimados = Math.min(op.datosGeneradosDia, op.capacidadEnvioDia) * 30 * mesesUtiles;
  const ins = calcularInsercion(d.masaTotal, d.combustible, a.orbita);
  const items = [];

  items.push({
    id: 'datos', icono: '📡', texto: `Enviar ${req.datosMinimosGB} GB a la Tierra`,
    ok: datosEstimados >= req.datosMinimosGB,
    detalle: `Con este diseño llegarían unos ${r1(datosEstimados)} GB (${r1(op.capacidadEnvioDia)} GB/día durante ${mesesUtiles} meses).`
  });
  items.push({
    id: 'vida', icono: '⏳', texto: `Durar ${req.vidaMinMeses} meses`,
    ok: a.vidaEsperada >= req.vidaMinMeses,
    detalle: `Vida esperada: ${a.vidaEsperada} meses. Depende de la estructura, el control térmico y la órbita.`
  });
  if (mision.aterriza) {
    const empujePeso = d.masaTotal > 0 ? d.empuje / ((d.masaSeca + ins.quedan) * a.destino.gravedad) : 0;
    items.push({
      id: 'aterrizaje', icono: '🛬', texto: `Poder aterrizar en ${a.destino.nombre}`,
      ok: ins.ok && ins.quedan > 0 && empujePeso >= 1.5,
      detalle: `Combustible para el descenso: ${r1(ins.quedan)} kg. Empuje/peso al llegar: ${r1(empujePeso)} (conviene más de 1,5).`
    });
  } else {
    items.push({
      id: 'orbita', icono: '🛰️', texto: 'Entrar en la órbita',
      ok: ins.ok,
      detalle: `Hacen falta ${ins.necesario} kg de combustible y la nave lleva ${d.combustible} kg.`
    });
  }
  items.push({
    id: 'alcance', icono: '📶', texto: 'Comunicarse con la Tierra',
    ok: op.enlaceOk,
    detalle: op.enlaceOk ? 'La antena tiene alcance suficiente.' : `La antena no llega desde ${a.destino.nombre}: elige una de mayor ganancia.`
  });
  items.push({
    id: 'presupuesto', icono: '💰', texto: `Costar ≤ ${presupuesto} M$`,
    ok: a.costoTotal <= presupuesto,
    detalle: `Costo estimado con cohete: ${a.costoTotal} M$.`
  });
  items.push({
    id: 'plazo', icono: '🗓️', texto: `Estar lista en ${mision.plazoMeses} meses`,
    ok: d.mesesDesarrollo <= mision.plazoMeses,
    detalle: `Desarrollo: ${d.mesesDesarrollo} meses (lo que tarde el componente más lento).`
  });
  for (const obj of mision.objetivos) {
    const valor = (a.valorObjetivos[obj.id] || 0) * mesesUtiles * fraccionEnviada;
    items.push({
      id: `objetivo_${obj.id}`, icono: '🔬', texto: obj.nombre,
      ok: valor >= obj.valorMinimo,
      detalle: `Valor científico estimado: ${Math.round(valor)} de ${obj.valorMinimo}. Usa instrumentos útiles para este objetivo.`
    });
  }
  if (a.soporte) {
    items.push({
      id: 'soporte', icono: '🧑‍🚀', texto: 'Mantener viva a la tripulación',
      ok: a.soporte.suficiente,
      detalle: `Soporte vital: lleva ${a.soporte.disponible} de ${a.soporte.necesario} días-persona necesarios.`
    });
  }
  return items;
}
