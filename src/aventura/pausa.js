// =============================================================
// pausa.js — La PAUSA REAL del juego.
// Mientras se ve una tarjeta, una explicación, un diagnóstico o el menú,
// TODO se congela: el movimiento, los cronómetros y las emergencias nuevas.
// Varias cosas pueden pedir pausa a la vez: el juego sigue cuando todas la sueltan.
//   const soltar = pausar('tarjeta');  …  soltar();
// =============================================================
const motivos = new Set();
const oyentes = new Set();

export function pausar(motivo) {
  motivos.add(motivo);
  avisar();
  return () => reanudar(motivo);
}
export function reanudar(motivo) {
  motivos.delete(motivo);
  avisar();
}
export const estaPausado = () => motivos.size > 0;
export const motivosPausa = () => [...motivos];

/** fn(pausado) cada vez que cambia. */
export function alCambiarPausa(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }
function avisar() {
  window.juegoPausado = motivos.size > 0; // compatibilidad con el código anterior
  oyentes.forEach((f) => f(motivos.size > 0));
}
