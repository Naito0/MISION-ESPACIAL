// =============================================================
// informe.js — FUNCIONES PURAS del informe final:
//   - generarExplicaciones(): causas y efectos a partir de lo que REALMENTE pasó.
//   - misionesParecidas(): misiones reales de la NASA parecidas a la del jugador.
//
// Cada explicación: { tipo: 'bien' | 'mal' | 'info', texto }
// Para agregar una nueva: lee un dato de 'c' y llama a bien(), mal() o info().
// =============================================================

const NOMBRE_PROTECCION = {
  aislamiento: 'un control térmico (manta, calefactor o control activo)',
  impactos: 'una estructura blindada',
  radiacion: 'una estructura blindada o una computadora resistente a radiación',
  redundancia: 'baterías redundantes'
};

const r1 = (n) => Math.round(n * 10) / 10;
const pct = (x) => `${Math.round(x * 100)}%`;

/**
 * c = { mision, destino, orbita, cohete, coheteBarato, diseno, ambiente, lanzamiento,
 *       aterrizaje, resumen, metasRoles, modoEquipo, presupuesto, config }
 */
export function generarExplicaciones(c) {
  const lista = [];
  const bien = (texto) => lista.push({ tipo: 'bien', texto });
  const mal = (texto) => lista.push({ tipo: 'mal', texto });
  const info = (texto) => lista.push({ tipo: 'info', texto });

  const { mision, destino, orbita, cohete, diseno: d, lanzamiento: L, resumen: R } = c;
  const op = L.operativo;

  // ---------- Presupuesto y plazos ----------
  const sobrante = r1(c.presupuesto - L.costoTotal);
  const textoCosto = `Gastaste ${L.costoTotal} de ${c.presupuesto} M$: ${L.costoComponentes} M$ en componentes y ${L.costoCohete} M$ en el cohete` +
    (L.costoRetraso > 0 ? `, más ${L.costoRetraso} M$ por retrasos.` : '.');
  if (sobrante < 0) mal(`${textoCosto} Te pasaste ${-sobrante} M$: la agencia tuvo que pedir más fondos.`);
  else bien(`${textoCosto} Te sobraron ${sobrante} M$.`);
  if (L.mesesDesarrollo > mision.plazoMeses) {
    mal(`Construir la nave tomó ${L.mesesDesarrollo} meses y el plazo era ${mision.plazoMeses}. ` +
      'Los componentes avanzados tardan más; cada mes de retraso costó dinero extra.');
  }

  // ---------- Segmento de lanzamiento ----------
  const textoCohete = `Tu nave pesaba ${L.masaTotal} kg (${d.masaSeca} kg de equipos + ${d.combustible} kg de combustible). ` +
    `El ${cohete.nombre.toLowerCase()} lleva hasta ${cohete.capacidad[orbita.id]} kg a ${orbita.nombre.toLowerCase()} ` +
    `(margen de ${pct(Math.max(0, L.margenes.cohete))}).`;
  if (c.coheteBarato && c.coheteBarato.id !== cohete.id) {
    info(`${textoCohete} El ${c.coheteBarato.nombre.toLowerCase()} también podía, y costaba ${cohete.costo - c.coheteBarato.costo} M$ menos.`);
  } else {
    bien(`${textoCohete} Era el cohete más barato posible para esa masa y esa órbita.`);
  }
  info(`Órbita elegida: ${orbita.nombre}. ${orbita.explicacion}`);

  const ins = L.insercion;
  if (!ins.ok) {
    mal(`Para entrar en ${orbita.nombre.toLowerCase()} hacían falta ${ins.necesario} kg de combustible ` +
      `(${pct(orbita.factorCombustible)} de la masa de la nave), pero solo había ${d.combustible} kg. ` +
      (mision.aterriza ? 'La nave llegó sin combustible para frenar el descenso.' : 'La nave no pudo quedarse en órbita y se perdió la misión.') +
      ' Hacía falta más combustible, una nave más liviana o una órbita más fácil de alcanzar.');
  } else if (ins.necesario > 0) {
    info(`Entrar en la órbita gastó ${ins.gastado} kg de combustible (quedaron ${r1(ins.quedan)} kg).`);
  }

  // ---------- Aterrizaje ----------
  const at = c.aterrizaje;
  if (mision.aterriza && at) {
    const cfg = c.config.aterrizaje;
    const relacion = at.empujePeso.toFixed(2);
    const fisica = `Con ${at.masaInicial} kg y ${d.empuje} N de empuje, el motor daba ${r1(d.empuje / at.masaInicial)} m/s² ` +
      `contra una gravedad de ${destino.gravedad} m/s² (relación empuje/peso ${relacion}).`;
    if (at.exito) {
      bien(`Aterrizaste a ${at.vVertical.toFixed(1)} m/s (el límite era ${cfg.velocidadMaxVertical} m/s). ${fisica}`);
    } else {
      const causas = {
        combustible: at.combustibleInicial <= 0
          ? 'Empezaste el descenso sin combustible: el motor nunca pudo frenar.'
          : `El combustible se acabó durante el descenso (tenías ${Math.round(at.combustibleInicial)} kg y el motor gasta ${d.consumoMotor} kg/s).`,
        vertical: `Tocaste el suelo a ${at.vVertical.toFixed(1)} m/s; las patas aguantan hasta ${cfg.velocidadMaxVertical} m/s.`,
        horizontal: `Ibas de lado a ${at.vHorizontal.toFixed(1)} m/s (límite ${cfg.velocidadMaxHorizontal} m/s) y la nave volcó.`,
        angulo: `La nave estaba inclinada ${Math.abs(at.angulo).toFixed(0)}° (límite ${cfg.anguloMaxGrados}°) y volcó.`
      };
      mal(`La nave se estrelló. ${causas[at.motivo] || ''} ${fisica}`);
    }
    if (at.empujePeso < 1.5) {
      mal(`El motor apenas superaba el peso de la nave (empuje/peso ${relacion}): frenar era lento y gastaba mucho combustible.`);
    }
    if (orbita.aterrizaje) {
      info(`Desde ${orbita.nombre.toLowerCase()} el descenso empezó a ${orbita.aterrizaje.altitudInicial} m y ${orbita.aterrizaje.velocidadVerticalInicial} m/s.`);
    }
  }

  if (!R || R.mesesOperativos === 0) {
    mal('Como la nave nunca llegó a operar, no se generaron datos científicos.');
    agregarMetas(c, bien, mal);
    info('Recuerda: no hay una única solución. Prueba otra combinación de componentes, órbita y cohete y compara.');
    return lista;
  }

  // ---------- Segmento espacial: energía ----------
  const lugar = mision.aterriza ? `en la superficie de ${destino.nombre}` : `en ${orbita.nombre.toLowerCase()}`;
  if (op.fraccionEnergia < 1) {
    mal(`Tus paneles generaban en promedio ${r1(op.generacionMedia)} W ${lugar}, pero la nave consumía ${r1(d.consumo)} W. ` +
      `Los instrumentos solo pudieron trabajar el ${pct(op.fraccionEnergia)} del tiempo.`);
  } else {
    bien(`Energía suficiente: los paneles generaban ${r1(op.generacionMedia)} W en promedio y la nave consumía ${r1(d.consumo)} W.`);
  }
  if (c.ambiente.factorSolar < 1) {
    info(`${lugar.charAt(0).toUpperCase() + lugar.slice(1)} llega solo el ${pct(c.ambiente.factorSolar)} de la luz solar que en la órbita terrestre, por eso los paneles rinden menos.`);
  }
  if (op.fraccionBateria < 1) {
    mal(`Durante las ${c.ambiente.horasSombra} h de sombra la nave necesitaba ${r1(op.bateriaNecesariaWh)} Wh, ` +
      `pero la batería guardaba ${d.capacidadBateriaWh} Wh: los instrumentos se apagaban a la sombra.`);
  }

  // ---------- Segmento terrestre: datos ----------
  if (!op.enlaceOk) {
    mal(`Tu antena no tiene alcance para comunicarse desde ${destino.nombre}: ningún dato llegó a la Tierra. Hacía falta una antena de mayor ganancia.`);
  } else {
    const perdidos = R.datosPerdidos + R.datosBorrados;
    const fraccionPerdida = R.datosGenerados > 0 ? perdidos / R.datosGenerados : 0;
    const textoDatos = `Tus instrumentos generaban ${r1(op.datosGeneradosDia)} GB/día y tu antena, con tus estaciones en tierra ` +
      `(contacto ${pct(op.contactoReal)} del tiempo), podía enviar ${r1(op.capacidadEnvioDia)} GB/día`;
    if (fraccionPerdida > 0.05) {
      mal(`${textoDatos}: perdiste el ${pct(fraccionPerdida)} de los datos (${r1(perdidos)} GB). ` +
        'Una antena mejor, más estaciones en tierra, más memoria o una órbita con más contacto lo habrían evitado.');
    } else {
      bien(`${textoDatos}: llegaron a la Tierra ${r1(R.datosEnviados)} GB, casi todo lo generado.`);
    }
    if (op.datosGeneradosDia < op.capacidadEnvioDia * 0.3) {
      info('Tu sistema de comunicaciones podía enviar mucho más de lo que generabas: una antena o red más simple habría ahorrado dinero.');
    }
  }

  // ---------- Vida útil ----------
  if (R.murioPor === 'vida') {
    mal(`La nave dejó de funcionar en el mes ${R.mesesOperativos + 1} (se esperaban ${L.vidaEsperada} meses). ` +
      'El desgaste depende de la estructura, el control térmico y la órbita.');
  } else {
    bien(`La nave funcionó los ${R.mesesOperativos} meses de la misión (vida esperada: ${L.vidaEsperada} meses).`);
  }
  if (orbita.factorVida < 1 && !mision.aterriza) {
    info(`En ${orbita.nombre.toLowerCase()} la nave se desgasta más rápido (vida ×${orbita.factorVida}).`);
  }

  // ---------- Riesgo y eventos ----------
  const fallas = R.eventos.filter((e) => e.esFalla);
  if (d.componentesNuevos.length) {
    const t = `Tu diseño tenía ${d.componentesNuevos.length} componentes nuevos (${d.componentesNuevos.join(', ')}), ` +
      `con un riesgo de falla de ${pct(d.riesgo)}.`;
    if (fallas.length) mal(`${t} Hubo ${fallas.length} falla(s) interna(s). Los equipos probados en vuelo fallan menos.`);
    else info(`${t} Esta vez no hubo fallas internas, pero era una apuesta.`);
  } else {
    bien(`Usaste solo componentes probados en vuelo: riesgo bajo (${pct(d.riesgo)}).`);
  }
  for (const ev of R.eventos) {
    const cuando = `Mes ${ev.mes} · ${ev.nombre}:`;
    if (ev.mitigado) bien(`${cuando} ${ev.texto} Elegir esa protección valió la pena.`);
    else if (ev.mitigadoPor) mal(`${cuando} ${ev.texto} Se evitaba con ${NOMBRE_PROTECCION[ev.mitigadoPor] || ev.mitigadoPor}.`);
    else info(`${cuando} ${ev.texto} ${ev.explicacion}`);
  }

  // ---------- Segmento usuario: ciencia por objetivo ----------
  for (const obj of mision.objetivos) {
    const valor = R.valorObjetivos[obj.id] || 0;
    const utiles = d.instrumentos.filter((i) => obj.instrumentos[i.id] !== undefined);
    const conQue = utiles.length
      ? `con ${utiles.map((i) => `${i.nombre} (×${obj.instrumentos[i.id]})`).join(', ')}`
      : 'sin ningún instrumento útil para este objetivo';
    const t = `Objetivo "${obj.nombre}": valor ${Math.round(valor)} de ${obj.valorMinimo} necesarios, ${conQue}.`;
    if (valor >= obj.valorMinimo) bien(t);
    else mal(t);
  }
  if (d.precision < 1) {
    mal(`Tu control de actitud apunta con ${pct(d.precision)} de calidad: los datos valen menos. Un sistema más preciso aumenta el valor científico.`);
  } else if (d.precision > 1) {
    bien(`El control de actitud de alta precisión aumentó el valor de tus datos (×${d.precision}).`);
  }
  if (c.ambiente.factorDatos !== 1) {
    info(`La órbita multiplicó la cantidad y el detalle de tus datos por ${c.ambiente.factorDatos}.`);
  }

  agregarMetas(c, bien, mal);
  info('Recuerda: no hay una única solución. Prueba otra combinación de componentes, órbita y cohete y compara los resultados.');
  return lista;
}

function agregarMetas(c, bien, mal) {
  if (!c.modoEquipo || !c.metasRoles) return;
  for (const m of c.metasRoles) {
    const texto = `Meta del ${m.nombre}: ${m.texto} (${m.detalle})`;
    if (m.ok) bien(texto);
    else mal(texto);
  }
}

/**
 * Misiones reales parecidas: las que lista la misión o, si no hay,
 * las del mismo destino. Devuelve hasta 2.
 */
export function misionesParecidas(mision, reales) {
  const porId = (mision.misionesReales || []).map((id) => reales.find((r) => r.id === id)).filter(Boolean);
  const lista = porId.length ? porId : reales.filter((r) => r.destino === mision.destino);
  return lista.slice(0, 2);
}
