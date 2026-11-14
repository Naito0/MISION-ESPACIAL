// =============================================================
// datosSala.js — Los datos que necesita la sala (los mismos JSON que
// lee el servidor en server/index.js), para el modo "jugar solo".
// =============================================================
import destinos from '../../data/destinos.json';
import misionesReales from '../../data/misiones_reales.json';
import emergencias from '../../data/emergencias3d.json';

export function datosParaSala() {
  return { destinos: destinos.destinos, misionesReales: misionesReales.misiones, emergencias };
}
