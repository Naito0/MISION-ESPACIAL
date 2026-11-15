// =============================================================
// informe.js — El INFORME de la misión (funciones puras, se pueden probar).
// Calcula créditos, puntaje y estrellas, arma la lista de "causa → efecto"
// a partir de lo que pasó en el viaje, y elige UNA misión real de la NASA
// parecida (de misiones_reales.json, con su fuente).
// =============================================================

// Qué protege cada pieza, dicho con palabras simples (para el informe)
const NOMBRE_PROTECCION = {
  blindaje: 'el blindaje', motor: 'el motor fuerte', energia: 'la energía de sobra', reciclador: 'el reciclador de oxígeno',
  laboratorio: 'el laboratorio', antena: 'una antena de largo alcance', computadora: 'la computadora estándar'
};

/**
 * r = { destinoId, viaje (con registro, vida, terminado), diseno, seleccion, muestras (0..3), aterrizaje ('suave'|'duro'|'choque'|null) }
 * datos = { emergencias (emergencias3d.json), misionesReales }
 */
export function calcularInforme(r, datos) {
  const v = r.viaje;
  const exito = v.terminado === 'llegada';
  const resueltas = v.registro.filter((x) => x.resultado === 'resuelta');
  const fallidas = v.registro.filter((x) => x.resultado === 'fallida');
  const muestras = r.muestras || 0;
  const base = datos.emergencias.config.creditosBase[r.destinoId] || 0;

  // Créditos: la recompensa del destino según cómo llegó la nave, más las muestras
  const vida = Math.round(v.vida); // con partes como 100/6 la vida puede tener decimales
  let creditos = exito ? Math.round(base * (0.5 + 0.5 * vida / 100)) : Math.round(base * 0.1);
  if (r.aterrizaje === 'choque') creditos = Math.round(creditos * 0.5);
  creditos += muestras * Math.round(base * 0.15);
  // Puntaje: vida, emergencias y ciencia
  const puntaje = Math.max(0, vida * 10 + resueltas.length * 50 - fallidas.length * 25 + muestras * 100 + (r.aterrizaje === 'suave' ? 200 : 0));
  const estrellas = !exito ? 0 : 1 + (vida >= 50 ? 1 : 0) + (muestras >= 2 && r.aterrizaje !== 'choque' ? 1 : 0);

  // Causas y efectos
  const causas = [];
  const catalogo = datos.emergencias.emergencias;
  const vistas = new Set();
  for (const f of fallidas) {
    const e = catalogo.find((x) => x.id === f.id);
    if (!e || vistas.has(e.id)) continue;
    vistas.add(e.id);
    causas.push({
      tipo: 'mal',
      causa: f.agravada ? `Faltó ${NOMBRE_PROTECCION[e.agravante] || e.agravante}` : `Nadie llegó a tiempo a "${e.nombre}"`,
      efecto: f.agravada ? `${e.causa} La nave perdió ${f.danio} de vida.` : `La nave perdió ${f.danio} de vida. ${e.causa}`
    });
  }
  for (const [k, protegido] of Object.entries(r.diseno || {})) {
    if (!protegido) continue;
    const evitadas = catalogo.filter((e) => e.agravante === k).map((e) => e.nombre);
    if (evitadas.length) causas.push({ tipo: 'bien', causa: `Llevaron ${NOMBRE_PROTECCION[k] || k}`, efecto: `Hubo menos emergencias de este tipo y dañaron menos: ${evitadas.join(', ')}.` });
  }
  if (resueltas.length) causas.push({ tipo: 'bien', causa: `Resolvieron ${resueltas.length} emergencias`, efecto: 'Cada emergencia resuelta a tiempo evitó que la nave perdiera vida.' });
  if (r.aterrizaje === 'choque') causas.push({ tipo: 'mal', causa: 'El aterrizaje fue muy rápido', efecto: 'La nave tocó el suelo demasiado fuerte y se dañó: hay que frenar antes de tocar el suelo.' });
  if (r.aterrizaje === 'suave') causas.push({ tipo: 'bien', causa: 'Aterrizaje suave', efecto: 'El comandante frenó a tiempo contra la gravedad del destino.' });
  if (muestras) causas.push({ tipo: 'bien', causa: `Analizaron ${muestras} muestra${muestras > 1 ? 's' : ''}`, efecto: 'La ciencia es el objetivo de la misión: cada muestra suma créditos.' });

  return { exito, creditos, puntaje, estrellas, resueltas: resueltas.length, fallidas: fallidas.length, vida, causas, mision: misionParecida(r, datos.misionesReales || []) };
}

/** Elige una misión real de la NASA parecida a la de la tripulación. */
export function misionParecida(r, misiones) {
  const ids = new Set(Object.values(r.seleccion || {}).flat());
  const delDestino = misiones.filter((m) => m.destino === r.destinoId);
  const buscar = (id) => delDestino.find((m) => m.id === id);
  let elegida = null;
  if (r.destinoId === 'luna') {
    if (ids.has('detector_neutrones')) elegida = buscar('lunar_prospector');
    else if ((r.muestras || 0) >= 2) elegida = buscar('apollo17');
    else elegida = buscar('apollo11');
  } else if (r.destinoId === 'marte') {
    if (r.aterrizaje && r.aterrizaje !== 'choque') elegida = buscar('phoenix');
    else if (ids.has('detector_neutrones')) elegida = buscar('mars_odyssey');
    else if (ids.has('radar') || ids.has('cam_alta')) elegida = buscar('mro');
    else elegida = buscar('phoenix');
  }
  return elegida || delDestino[0] || null;
}
