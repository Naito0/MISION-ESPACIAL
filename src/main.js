// =============================================================
// main.js — Punto de entrada: configura Phaser y registra las escenas.
// El orden del recorrido es: Mision → Taller → Lanzamiento → Viaje
//                            → Aterrizaje → Operacion → Resultados
// =============================================================
import * as Phaser from 'phaser';
import { ANCHO, ALTO, COLORES } from './ui/ui.js';

import EscenaMision from './scenes/EscenaMision.js';
import EscenaTaller from './scenes/EscenaTaller.js';
import EscenaLanzamiento from './scenes/EscenaLanzamiento.js';
import EscenaViaje from './scenes/EscenaViaje.js';
import EscenaAterrizaje from './scenes/EscenaAterrizaje.js';
import EscenaOperacion from './scenes/EscenaOperacion.js';
import EscenaResultados from './scenes/EscenaResultados.js';

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
    EscenaMision,
    EscenaTaller,
    EscenaLanzamiento,
    EscenaViaje,
    EscenaAterrizaje,
    EscenaOperacion,
    EscenaResultados
  ]
};

const juego = new Phaser.Game(config);

// Para depurar desde la consola del navegador: window.juego
window.juego = juego;
