// =============================================================
// textosSimples.js — Frases cortas y claras en lugar de jerga técnica.
// Ej.: "Margen de energía −13%" → "¡Tus paneles no alcanzan! 🪫"
// El término técnico se puede mostrar en pequeño debajo.
// Para cambiar cómo "habla" el juego, edita estas frases.
// =============================================================

// Frase según el recurso y su color (verde, amarillo, rojo)
const FRASES = {
  presupuesto: { verde: 'Te sobran monedas 🪙', amarillo: 'Casi sin monedas 🪙', rojo: '¡Te pasaste del presupuesto! 💸', tecnico: 'presupuesto' },
  masa: { verde: 'Nave liviana 🪶', amarillo: 'Pesada: el cohete se esfuerza', rojo: '¡Demasiado pesada! 🏋️', tecnico: 'masa vs. lo que aguanta la estructura' },
  energia: { verde: '¡Energía de sobra! ⚡', amarillo: 'Energía justa 🔋', rojo: '¡Tus paneles no alcanzan! 🪫', tecnico: 'margen de energía' },
  datos: { verde: 'Todos tus datos llegan 📦', amarillo: 'Tus datos apenas llegan 📦', rojo: '¡Se pierden datos! 📭', tecnico: 'datos generados vs. capacidad de envío' },
  bateria: { verde: 'La batería aguanta la sombra', amarillo: 'Batería justa para la sombra', rojo: '¡En la sombra se apaga todo! 🌑', tecnico: 'energía almacenada para el eclipse' },
  comunicaciones: { verde: 'Tu antena llega a la Tierra 📶', amarillo: 'Tu antena llega a la Tierra 📶', rojo: '¡Tu antena no llega tan lejos! 📵', tecnico: 'alcance del enlace' },
  desarrollo: { verde: 'Estará lista a tiempo', amarillo: 'Lista justo a tiempo', rojo: '¡No llega a tiempo! ⌛', tecnico: 'meses de desarrollo vs. plazo' },
  vida: { verde: 'Durará lo necesario', amarillo: 'Durará justo', rojo: '¡Se gastará antes de tiempo!', tecnico: 'vida útil' },
  riesgo: { verde: 'Pocas fallas probables 🍀', amarillo: 'Algo arriesgada', rojo: '¡Muy arriesgada! 🎲', tecnico: 'probabilidad de falla' },
  soporte: { verde: 'Hay aire y comida para todos', amarillo: 'Suministros justos', rojo: '¡No alcanza el oxígeno!', tecnico: 'días-persona de soporte vital' }
};

/** Frase simple de una barra de recursos. Devuelve { frase, tecnico }. */
export function fraseRecurso(barra) {
  const f = FRASES[barra.id];
  if (!f) return { frase: barra.nombre, tecnico: '' };
  return { frase: f[barra.nivel] || f.verde, tecnico: f.tecnico };
}

/** Costo como monedas: 🪙, 🪙🪙… (relativo al presupuesto de la misión). */
export function monedas(costo, presupuesto) {
  if (!costo) return 'gratis';
  const n = Math.max(1, Math.min(5, Math.ceil((costo / presupuesto) * 20)));
  return '🪙'.repeat(n);
}

/** Peso en palabras (relativo al tamaño de la nave: CubeSat o normal). */
export function pesoSimple(masa, esCubesat) {
  const ref = esCubesat ? 4 : 1000;
  const r = masa / ref;
  if (masa === 0) return 'sin peso';
  if (r < 0.04) return 'pluma 🪶';
  if (r < 0.12) return 'liviana';
  if (r < 0.3) return 'pesada';
  return 'muy pesada 🐘';
}

/** Etiquetas simples de lo que hace una pieza (para el tooltip). */
export function etiquetasSimples(op) {
  const e = [];
  if (op.energia > 0) e.push('☀️ da energía');
  if (op.energia < 0) e.push('🔌 gasta energía');
  if (op.datos) e.push('📦 junta datos');
  if (op.capacidadWh) e.push('🔋 guarda energía');
  if (op.tasa) e.push('📡 envía datos');
  if (op.combustible) e.push('⛽ lleva combustible');
  if (op.efectos && op.efectos.length) e.push('🛡️ protege');
  if (op.diasPersona) e.push('🧑‍🚀 aire y comida');
  e.push(op.confiabilidad === 'nuevo' ? '⚠ nueva: puede fallar' : '✓ probada en vuelo');
  return e.join('  ');
}
