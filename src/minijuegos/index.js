// =============================================================
// Registro de minijuegos de reparación. El campo "minijuego" de cada
// avería en eventos.json usa estos nombres.
// Para agregar uno nuevo: crea MinijuegoX.js (usa crearMarco de base.js)
// y regístralo aquí.
// =============================================================
import { minijuegoCables } from './MinijuegoCables.js';
import { minijuegoSoldadura } from './MinijuegoSoldadura.js';
import { minijuegoAntena } from './MinijuegoAntena.js';

export const MINIJUEGOS = {
  cables: minijuegoCables,
  soldadura: minijuegoSoldadura,
  antena: minijuegoAntena
};

/**
 * Inicia un minijuego. opciones = { segundos, etiquetaTiempo, alTerminar(exito) }
 * Devuelve el marco (tiene .terminar(exito) para terminarlo desde afuera).
 */
export function iniciarMinijuego(nombre, escena, opciones) {
  const fn = MINIJUEGOS[nombre] || MINIJUEGOS.cables;
  return fn(escena, opciones);
}
