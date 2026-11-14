// =============================================================
// main.js — Punto de entrada: configura Phaser y registra las escenas.
//
// Recorrido (fases de maduración de una misión, como en la NASA):
//   Inicio
//   1. Concepto ............ EscenaMision
//   2. Requisitos .......... EscenaRequisitos
//   3. Compensaciones ...... EscenaDiseno
//   4. Diseño puntual ...... EscenaDisenoPuntual
//   5. Lanzamiento y viaje . EscenaLanzamiento → EscenaViaje (averías + minijuegos de reparación)
//   6. Operación ........... EscenaAterrizaje (si aterriza) → EscenaSimulacion → EscenaInforme
// =============================================================
import * as Phaser from 'phaser';
import { ANCHO, ALTO, COLORES } from './ui/ui.js';

import EscenaInicio from './scenes/EscenaInicio.js';
import EscenaMision from './scenes/EscenaMision.js';
import EscenaRequisitos from './scenes/EscenaRequisitos.js';
import EscenaDiseno from './scenes/EscenaDiseno.js';
import EscenaDisenoPuntual from './scenes/EscenaDisenoPuntual.js';
import EscenaLanzamiento from './scenes/EscenaLanzamiento.js';
import EscenaViaje from './scenes/EscenaViaje.js';
import EscenaAterrizaje from './scenes/EscenaAterrizaje.js';
import EscenaSimulacion from './scenes/EscenaSimulacion.js';
import EscenaInforme from './scenes/EscenaInforme.js';

const config = {
  type: Phaser.AUTO,
  parent: 'juego',
  width: ANCHO,
  height: ALTO,
  backgroundColor: COLORES.fondo,
  scale: {
    mode: Phaser.Scale.FIT,           // se adapta al tamaño de la ventana
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  // La primera escena de la lista es la que arranca
  scene: [
    EscenaInicio,
    EscenaMision,
    EscenaRequisitos,
    EscenaDiseno,
    EscenaDisenoPuntual,
    EscenaLanzamiento,
    EscenaViaje,
    EscenaAterrizaje,
    EscenaSimulacion,
    EscenaInforme
  ]
};

const juego = new Phaser.Game(config);

// Para depurar desde la consola del navegador: window.juego
window.juego = juego;
