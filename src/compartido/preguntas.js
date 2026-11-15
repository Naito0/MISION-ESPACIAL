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
 * INTERCALADO: la posición de la respuesta correcta va rotando de una pregunta a la
 * siguiente (B, C, A, B, C… en las de 3 opciones; B, A, B… en las de 2) y la
 * PRIMERA pregunta nunca la tiene en la A. Así no hay "siempre es la A" ni rachas
 * por azar. Las opciones incorrectas se mezclan (Fisher-Yates).
 */
let ultima = 0; // posición de la correcta en la pregunta anterior (0 = A)
export function posicionIntercalada(n) { ultima = (ultima + 1) % n; return ultima; } // siempre la letra siguiente
export function reiniciarIntercalado() { ultima = 0; }

/**
 * Opciones listas para mostrar: cada una con id, texto y si es la correcta.
 * lista = [{ id, texto, correcta, ... }]; posicion = dónde va la correcta (0 = A).
 */
export function prepararOpciones(lista, rng = Math.random, posicion = posicionIntercalada(lista.length)) {
  if (lista.filter((o) => o.correcta).length !== 1) throw new Error('Cada pregunta necesita exactamente 1 opción correcta');
  const correcta = { ...lista.find((o) => o.correcta) };
  const resto = mezclarLista(lista.filter((o) => !o.correcta).map((o) => ({ ...o })), rng);
  resto.splice(Math.min(posicion, resto.length), 0, correcta);
  return resto;
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
