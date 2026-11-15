// =============================================================
// preguntas.js — Opciones de TODAS las preguntas de opción múltiple
// (diagnósticos, predicciones del hangar y preguntas finales).
// Lógica pura, con pruebas (tests/juego3d.test.js).
//
// Regla: la respuesta correcta se reconoce por su ID, nunca por su posición,
// y las opciones se mezclan (Fisher-Yates) CADA VEZ que se muestra la pregunta.
// =============================================================

/** Mezcla una lista (Fisher-Yates) con el generador rng. Devuelve una copia. */
export function mezclarLista(lista, rng = Math.random) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * Opciones listas para mostrar: cada una con id, texto y si es la correcta,
 * en un orden NUEVO al azar. lista = [{ id, texto, correcta, ... }]
 */
export function prepararOpciones(lista, rng = Math.random) {
  if (lista.filter((o) => o.correcta).length !== 1) throw new Error('Cada pregunta necesita exactamente 1 opción correcta');
  return mezclarLista(lista.map((o) => ({ ...o })), rng);
}

/** Diagnóstico (diagnosticos.json): opciones [{ texto, correcta, porque }] → con id y mezcladas. */
export const opcionesDiagnostico = (d, rng = Math.random) =>
  prepararOpciones(d.opciones.map((o, i) => ({ ...o, id: `o${i}`, correcta: !!o.correcta })), rng);

/** Predicción (aprendizaje.json): opciones ['texto', ...] y correcta = índice en el JSON. */
export const opcionesPrediccion = (p, rng = Math.random) =>
  prepararOpciones(p.opciones.map((texto, i) => ({ id: `o${i}`, texto, correcta: i === p.correcta })), rng);

/**
 * Elige n preguntas al azar del destino SIN repetir las de la partida anterior
 * (excluir = ids). Si no alcanzan, completa con las excluidas.
 */
export function elegirPreguntas(pool, n = 3, excluir = [], rng = Math.random) {
  const nuevas = mezclarLista(pool.filter((p) => !excluir.includes(p.id)), rng);
  const viejas = mezclarLista(pool.filter((p) => excluir.includes(p.id)), rng);
  return [...nuevas, ...viejas].slice(0, n);
}

/** Pregunta final (preguntas.json) lista para mostrar: opciones con id, mezcladas. */
export function prepararPregunta(p, rng = Math.random) {
  const lista = [{ id: 'correcta', texto: p.correcta, correcta: true }, ...p.incorrectas.map((texto, i) => ({ id: `i${i}`, texto, correcta: false }))];
  return { id: p.id, texto: p.texto, opciones: prepararOpciones(lista, rng), pista: p.pista, explicacion: p.explicacion };
}
