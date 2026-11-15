// =============================================================
// preguntas.js — Elegir las preguntas del informe y mezclar sus opciones
// (lógica pura, con pruebas). Datos en src/data/preguntas.json.
// =============================================================

/** Mezcla una lista (Fisher-Yates) con el generador rng. */
export function mezclarLista(lista, rng = Math.random) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * Elige n preguntas al azar del destino SIN repetir las de la partida anterior
 * (excluir = ids). Si no alcanzan, completa con las excluidas.
 */
export function elegirPreguntas(pool, n = 3, excluir = [], rng = Math.random) {
  const nuevas = mezclarLista(pool.filter((p) => !excluir.includes(p.id)), rng);
  const viejas = mezclarLista(pool.filter((p) => excluir.includes(p.id)), rng);
  return [...nuevas, ...viejas].slice(0, n);
}

/** Pregunta lista para mostrar: opciones en orden AL AZAR y el índice de la correcta. */
export function prepararPregunta(p, rng = Math.random) {
  const opciones = mezclarLista([p.correcta, ...p.incorrectas], rng);
  return { id: p.id, texto: p.texto, opciones, correcta: opciones.indexOf(p.correcta), pista: p.pista, explicacion: p.explicacion };
}
