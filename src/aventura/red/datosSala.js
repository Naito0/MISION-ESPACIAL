// =============================================================
// datosSala.js — Los datos que necesita la sala (los mismos JSON que
// lee el servidor en server/index.js), para el modo "jugar solo".
// =============================================================
import destinos from '../../data/destinos.json';
import misionesReales from '../../data/misiones_reales.json';
import emergencias from '../../data/emergencias3d.json';
import componentes from '../../data/componentes.json';
import hangar from '../../data/hangar3d.json';
import dificultad from '../../data/dificultad.json';

export function datosParaSala() {
  return { destinos: destinos.destinos, misionesReales: misionesReales.misiones, emergencias, componentes, hangar, dificultad };
}
