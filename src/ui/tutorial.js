// =============================================================
// tutorial.js — Tutorial corto guiado por Orbi.
// Cada paso es una frase. Un paso avanza:
//   - al pulsar el botón del globo (esperar: 'boton'), o
//   - cuando la escena avisa algo (esperar: 'piezaColocada' →
//     la escena hace escena.events.emit('tutorial', 'piezaColocada')).
// =============================================================

/**
 * @param pasos [{ texto, emocion, esperar: 'boton' | nombreDeEvento, boton }]
 * @param alTerminar se llama al final (por ejemplo, para guardar que ya se vio)
 */
export function iniciarTutorial(escena, orbi, pasos, alTerminar) {
  let indice = -1;

  function siguiente() {
    indice++;
    if (indice >= pasos.length) {
      escena.events.off('tutorial', alEvento);
      if (alTerminar) alTerminar();
      return;
    }
    const p = pasos[indice];
    const conBoton = p.esperar === 'boton' || !p.esperar;
    orbi.decir(p.texto, p.emocion || 'feliz', {
      ms: 0,
      boton: conBoton ? (p.boton || (indice === pasos.length - 1 ? '¡Vamos!' : 'Siguiente ▶')) : undefined,
      alPulsar: conBoton ? siguiente : undefined
    });
  }

  function alEvento(nombre) {
    const p = pasos[indice];
    if (p && p.esperar === nombre) siguiente();
  }

  escena.events.on('tutorial', alEvento);
  siguiente();
  return { saltar: () => { indice = pasos.length - 1; siguiente(); } };
}
