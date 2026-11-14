// =============================================================
// resumenAprendizaje.js — "Hoy aprendiste 3 cosas" (función pura, con pruebas).
// Devuelve los 3 conceptos de la misión (aprendizaje.json → porDestino),
// cada uno con una frase conectada con lo que REALMENTE pasó en la partida.
//
// m = { destino (destinos.json), diseno, aterrizaje ('suave'|'duro'|'choque'|null),
//       muestras, registro (viaje), estados (opcional: estado de las barras
//       de recomendación del hangar, ej. { paneles: 'bajo', baterias: 'ok' }),
//       prediccion (opcional: true si acertó la predicción del hangar) }
// datos = aprendizaje.json
// =============================================================

export function resumenAprendizaje(m, datos) {
  const ids = datos.porDestino[m.destino.id] || [];
  const est = m.estados || {};
  const comms = m.registro.filter((r) => r.rol === 'comunicaciones');
  const resolvioComms = comms.some((r) => r.resultado === 'resuelta');
  const como = { suave: 'aterrizaste suave', duro: 'aterrizaste fuerte', choque: 'el módulo chocó al aterrizar' }[m.aterrizaje] || 'no llegaste a aterrizar';
  const pred = m.prediccion === true ? ' ¡Y lo predijiste bien en el hangar!' : m.prediccion === false ? ' En el hangar lo predijiste al revés: ahora ya lo sabes.' : '';

  const frases = {
    gravedad_luna: () => `En la Luna la gravedad es baja (1,62 m/s²) y ${como}: con poca gravedad se frena con poco combustible.`,
    noche_luna: () => (est.baterias === 'bajo'
      ? `Llevaste pocas baterías: la noche lunar dura casi 15 días terrestres y los equipos se habrían apagado.${pred}`
      : `Llevaste baterías para aguantar la noche lunar, que dura casi 15 días terrestres.${pred}`),
    senal_luna: () => (resolvioComms
      ? 'Recuperaste el contacto con la Tierra: desde la Luna la señal tarda solo 1,3 segundos.'
      : 'Desde la Luna la señal tarda unos 1,3 segundos: por eso se puede hablar casi en vivo.'),
    luz_marte: () => (est.paneles === 'bajo' || est.paneles === 'justo' || !m.diseno.energia
      ? `Tus paneles quedaron justos en Marte porque allí llega cerca del 43% de la luz que a la Tierra.${pred}`
      : `Llevaste paneles de sobra: a Marte llega cerca del 43% de la luz que a la Tierra.${pred}`),
    senal_marte: () => (resolvioComms
      ? 'Recuperaste el contacto con la Tierra, pero cada mensaje desde Marte tarda entre unos 4 y 24 minutos.'
      : 'Desde Marte cada mensaje tarda entre unos 4 y 24 minutos: la nave tiene que decidir sola muchas cosas.'),
    atmosfera_marte: () => `El aire de Marte es muy delgado (cerca de 1/100 de la presión de la Tierra) y casi no frena: ${como}.`
  };

  return ids.map((id) => {
    const c = datos.conceptos.find((x) => x.id === id);
    return { id, icono: c.icono, titulo: c.titulo, texto: (frases[id] || (() => c.corta))(), pregunta: c.pregunta, fuente: c.fuente };
  });
}
