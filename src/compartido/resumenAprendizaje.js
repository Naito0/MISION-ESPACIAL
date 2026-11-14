// =============================================================
// resumenAprendizaje.js — Resumen de lo aprendido al final de una misión
// (función pura, con pruebas). Elige de 3 a 5 conceptos conectados con lo
// que REALMENTE pasó en esa partida y arma una frase para cada uno.
//
// m = { destino (de destinos.json), informe (de calcularInforme), diseno,
//       aterrizaje ('suave'|'duro'|'choque'|null), muestras (0..3), registro (viaje) }
// conceptos = aprendizaje.json → conceptos
// =============================================================

export function resumenAprendizaje(m, conceptos) {
  const d = m.destino;
  const nombre = d.id === 'luna' ? 'la Luna' : 'Marte';
  const fallo = (id) => m.registro.some((r) => r.id === id && r.resultado === 'fallida');
  const resolvio = (ids) => m.registro.some((r) => ids.includes(r.id) && r.resultado === 'resuelta');
  const frases = [];
  const agregar = (id, texto) => {
    const c = conceptos.find((x) => x.id === id);
    if (c && !frases.some((f) => f.id === id)) frases.push({ id, titulo: c.titulo, texto, dato: c.dato, fuente: c.fuente });
  };

  // 1) Energía: si faltó margen de energía, o si es Marte (menos luz)
  if (!m.diseno.energia && d.id === 'marte') agregar('energia', `Tus paneles quedaron justos en Marte porque allí llega cerca del ${Math.round(d.juego.factorSolar * 100)}% de la luz solar que a la Tierra.`);
  else if (!m.diseno.energia) agregar('energia', 'La nave tuvo poca energía de sobra: por eso hubo más cortocircuitos y sobrecargas.');
  // 2) Aterrizaje y gravedad
  if (m.aterrizaje) {
    const como = { suave: 'aterrizaste suave', duro: 'aterrizaste fuerte', choque: 'el módulo chocó' }[m.aterrizaje];
    agregar('gravedad', `En ${nombre} la gravedad es de ${d.gravedad} m/s² y ${como}: frenar a tiempo depende de esa gravedad.`);
  }
  // 3) Micrometeoritos
  if (fallo('meteoritos') || fallo('fuga_casco')) agregar('micrometeoritos', m.diseno.blindaje ? 'Los micrometeoritos golpearon la nave: el blindaje ayudó, pero hay que reaccionar rápido.' : 'Sin blindaje, los micrometeoritos causaron más daño: un escudo en capas los frena.');
  else if (resolvio(['meteoritos', 'fuga_casco'])) agregar('micrometeoritos', 'Esquivaste o reparaste los daños de micrometeoritos: en el espacio la protección es clave.');
  // 4) Comunicaciones
  if (resolvio(['senal', 'frecuencia', 'paquetes']) || fallo('senal') || fallo('frecuencia')) {
    agregar('retraso', d.id === 'marte' ? 'Recuperaste la señal con la Tierra: desde Marte cada mensaje tarda entre 3 y 22 minutos.' : 'Recuperaste la señal con la Tierra: desde la Luna tarda solo 1,3 segundos.');
  }
  // 5) Oxígeno
  if (resolvio(['oxigeno', 'invernadero']) || fallo('oxigeno')) agregar('oxigeno', m.diseno.reciclador ? 'El reciclador de aire ayudó a mantener el oxígeno estable.' : 'Sin reciclador, el oxígeno tuvo problemas: en viajes largos el aire se recicla.');
  // 6) Ciencia
  if (m.muestras > 0) agregar('muestras', `Analizaste ${m.muestras} muestra${m.muestras > 1 ? 's' : ''} de ${nombre}: esa es la ciencia que justifica la misión.`);
  // Relleno (si hay menos de 3): conceptos del destino
  if (d.id === 'marte') agregar('polvo', 'En Marte las tormentas de polvo pueden tapar la luz del Sol: por eso se llevan paneles de sobra.');
  else agregar('noche', 'En la Luna la noche dura unos 14 días: las baterías tienen que aguantar mucho.');
  agregar('retraso', d.id === 'marte' ? 'Desde Marte una señal tarda entre 3 y 22 minutos en llegar a la Tierra.' : 'Desde la Luna una señal tarda unos 1,3 segundos en llegar a la Tierra.');
  agregar('masa', 'Cada pieza suma masa y el cohete tiene un límite: diseñar es elegir lo justo.');
  return frases.slice(0, 5);
}
