// =============================================================
// superficie.js — Reglas del ATERRIZAJE y la EXPLORACIÓN (puras, con pruebas).
// - Aterrizaje: lo pilota el Comandante; se clasifica por la velocidad al tocar el suelo.
// - Superficie: hay 3 muestras. Cualquiera las recoge; solo el Científico
//   las analiza (en el laboratorio del módulo). Hay un tiempo límite.
// =============================================================

/** Velocidad de contacto (m/s, positiva) → 'suave' | 'duro' | 'choque'. */
export function clasificarAterrizaje(velocidad, config) {
  const v = Math.abs(velocidad);
  if (v <= config.aterrizajeSuave) return 'suave';
  if (v <= config.aterrizajeDuro) return 'duro';
  return 'choque';
}

/** Crea la exploración: 3 muestras repartidas alrededor del módulo (en (0,0)). */
export function nuevaSuperficie(config, rng = Math.random) {
  const muestras = [];
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + rng() * 1.2;
    const dist = config.distanciaMuestras[0] + rng() * (config.distanciaMuestras[1] - config.distanciaMuestras[0]);
    muestras.push({ i, x: +(Math.cos(ang) * dist).toFixed(2), z: +(Math.sin(ang) * dist).toFixed(2), estado: 'suelo', por: null });
  }
  return { restante: config.segundosSuperficie, muestras };
}

/** Recoger una muestra del suelo (cualquier rol). */
export function recogerMuestra(sup, i, nombre) {
  const m = sup.muestras[i];
  if (!m) return { error: 'Esa muestra no existe.' };
  if (m.estado !== 'suelo') return { error: 'Esa muestra ya fue recogida.' };
  m.estado = 'recogida';
  m.por = nombre;
  return { ok: true };
}

/** Analizar una muestra recogida (solo el Científico). */
export function analizarMuestra(sup, i, roles, exito) {
  const m = sup.muestras[i];
  if (!m) return { error: 'Esa muestra no existe.' };
  if (!roles.includes('cientifico')) return { error: 'Solo el Científico puede analizar muestras.' };
  if (m.estado !== 'recogida') return { error: m.estado === 'suelo' ? 'Primero hay que recogerla.' : 'Ya fue analizada.' };
  if (exito) m.estado = 'analizada';
  return { ok: true };
}

export const analizadas = (sup) => sup.muestras.filter((m) => m.estado === 'analizada').length;
