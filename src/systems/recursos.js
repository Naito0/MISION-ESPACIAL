// =============================================================
// recursos.js — FUNCIONES PURAS para calcular el diseño de la nave
// y sus recursos (masa, energía, datos, presupuesto, tiempo, riesgo).
//
// "Pura" = no lee archivos ni el estado global: todo entra por
// parámetros y sale como resultado. Así se puede probar fácilmente
// (ver tests/) y usar desde cualquier escena.
// =============================================================

const r1 = (n) => Math.round(n * 10) / 10;

/** Devuelve la lista de componentes elegidos (objetos completos + id de categoría). */
export function componentesElegidos(seleccion, categorias) {
  const lista = [];
  for (const cat of categorias) {
    const valor = seleccion[cat.id];
    const ids = Array.isArray(valor) ? valor : valor ? [valor] : [];
    for (const id of ids) {
      const op = cat.opciones.find((o) => o.id === id);
      if (op) lista.push({ ...op, categoria: cat.id });
    }
  }
  return lista;
}

/**
 * Resume el diseño: totales de costo, masa, energía, datos, riesgo, etc.
 * @param seleccion  { categoriaId: idComponente | [ids] }
 * @param categorias lista de categorías de componentes.json
 * @param riesgoCfg  { probado, nuevo } probabilidad de falla por componente (config.json)
 */
export function calcularDiseno(seleccion, categorias, riesgoCfg = { probado: 0.02, nuevo: 0.08 }) {
  const comps = componentesElegidos(seleccion, categorias);
  const de = (catId) => comps.find((c) => c.categoria === catId) || null;
  const suma = (campo, lista = comps) => lista.reduce((s, c) => s + (c[campo] || 0), 0);

  const estructura = de('estructura');
  const bateria = de('baterias');
  const antena = de('antena');
  const estaciones = de('estaciones');
  const avionica = de('avionica');
  const actitud = de('actitud');
  const propulsion = de('propulsion');
  const termica = de('termica');
  const soporte = de('soporte');
  const instrumentos = comps.filter((c) => c.categoria === 'instrumentos');

  // Qué falta para poder lanzar
  const faltantes = categorias
    .filter((cat) => cat.obligatoria && !comps.some((c) => c.categoria === cat.id))
    .map((cat) => cat.nombre);
  if (instrumentos.length === 0) faltantes.push('al menos un instrumento científico');

  // Riesgo: probabilidad de que falle al menos un componente
  const nuevos = comps.filter((c) => c.confiabilidad === 'nuevo');
  const probabilidadSinFallas = comps.reduce((p, c) => p * (1 - (riesgoCfg[c.confiabilidad] ?? riesgoCfg.probado)), 1);

  const combustible = propulsion ? propulsion.combustible : 0;
  const masaSeca = r1(suma('masa'));

  return {
    componentes: comps,
    costoComponentes: r1(suma('costo')),
    masaSeca,
    combustible,
    masaTotal: r1(masaSeca + combustible),
    generacionNominal: comps.filter((c) => c.energia > 0).reduce((s, c) => s + c.energia, 0), // W con sol pleno
    consumo: comps.filter((c) => c.energia < 0).reduce((s, c) => s - c.energia, 0),          // W
    capacidadBateriaWh: bateria ? bateria.capacidadWh : 0,
    tasaAntena: antena ? antena.tasa : 0,
    alcanceAntena: antena ? antena.alcance : 0,
    factorEstaciones: estaciones ? estaciones.factorContacto : 0,
    almacenamientoGB: avionica ? avionica.almacenamientoGB : 0,
    precision: actitud ? actitud.precision : 0.5,
    capacidadMasa: estructura ? estructura.capacidadMasa : 0,
    vidaBaseMeses: (estructura ? estructura.vidaMeses : 0) * (termica ? termica.factorVida : 0.8) +
      (propulsion ? propulsion.bonusVidaMeses || 0 : 0),
    riesgo: 1 - probabilidadSinFallas,
    componentesNuevos: nuevos.map((c) => c.nombre),
    mesesDesarrollo: Math.max(0, ...comps.map((c) => c.mesesDesarrollo || 0)),
    efectos: [...new Set(comps.flatMap((c) => c.efectos || []))],
    empuje: propulsion ? propulsion.empuje : 0,
    consumoMotor: propulsion ? propulsion.consumo : 0,
    instrumentos: instrumentos.map((i) => ({
      id: i.id, nombre: i.nombre, datos: i.datos, valorCientifico: i.valorCientifico, energia: -i.energia
    })),
    datosDia: suma('datos', instrumentos),
    diasPersona: soporte ? soporte.diasPersona : 0, // soporte vital (solo misiones tripuladas)
    faltantes
  };
}

/**
 * ¿Sirve este instrumento para algún objetivo de la misión?
 * Devuelve { ok, razon }.
 */
export function compatibilidadInstrumento(mision, idInstrumento) {
  if (mision.incompatibles && mision.incompatibles[idInstrumento]) {
    return { ok: false, razon: mision.incompatibles[idInstrumento] };
  }
  const sirve = mision.objetivos.some((o) => o.instrumentos[idInstrumento] !== undefined);
  return sirve
    ? { ok: true, razon: '' }
    : { ok: false, razon: 'No aporta a ningún objetivo de esta misión.' };
}

/**
 * Condiciones donde opera la nave: la órbita elegida o, si la misión
 * aterriza, la superficie definida en la misión.
 */
export function ambienteDe(mision, destino, orbita) {
  const base = mision.aterriza && mision.superficie ? mision.superficie : orbita;
  return {
    factorSolar: base.factorSolar ?? destino.juego.factorSolar,
    eclipse: base.eclipse,
    horasSombra: base.horasSombra,
    contacto: base.contacto,
    factorDatos: base.factorDatos ?? 1,
    factorVida: base.factorVida ?? 1,
    factorComunicacion: destino.juego.factorComunicacion,
    alcanceRequerido: destino.juego.alcanceRequerido
  };
}

/**
 * Balance de energía y datos en operación.
 * fraccionOperacion (0 a 1) = qué parte del tiempo pueden trabajar los instrumentos.
 */
export function balanceOperativo(diseno, ambiente) {
  // Energía promedio: los paneles solo generan fuera de la sombra
  const generacionMedia = diseno.generacionNominal * ambiente.factorSolar * (1 - ambiente.eclipse);
  const fraccionEnergia = diseno.consumo > 0 ? Math.min(1, generacionMedia / diseno.consumo) : 1;

  // La batería debe cubrir el consumo durante las horas de sombra
  const bateriaNecesariaWh = diseno.consumo * ambiente.horasSombra;
  const fraccionBateria = bateriaNecesariaWh > 0 ? Math.min(1, diseno.capacidadBateriaWh / bateriaNecesariaWh) : 1;
  const fraccionOperacion = fraccionEnergia * (1 - ambiente.eclipse * (1 - fraccionBateria));

  // Datos: lo que generan los instrumentos vs. lo que se puede enviar.
  // Contacto real = contacto de la órbita × estaciones en tierra (máximo 100%).
  const enlaceOk = diseno.alcanceAntena >= ambiente.alcanceRequerido;
  const contactoReal = Math.min(1, ambiente.contacto * diseno.factorEstaciones);
  const datosGeneradosDia = diseno.datosDia * fraccionOperacion * ambiente.factorDatos;
  const capacidadEnvioDia = enlaceOk ? diseno.tasaAntena * contactoReal * ambiente.factorComunicacion : 0;

  return {
    generacionMedia, fraccionEnergia, bateriaNecesariaWh, fraccionBateria, fraccionOperacion,
    enlaceOk, contactoReal, datosGeneradosDia, capacidadEnvioDia
  };
}

/**
 * Valor científico por mes para cada objetivo (antes de descontar datos que no llegan).
 * Devuelve { total, porObjetivo: { idObjetivo: valor } }.
 */
export function valorPorObjetivo(diseno, ambiente, objetivos, fraccionOperacion) {
  const factor = fraccionOperacion * ambiente.factorDatos * diseno.precision;
  const porObjetivo = {};
  let total = 0;
  for (const obj of objetivos) {
    const v = diseno.instrumentos.reduce((s, i) => {
      const mult = obj.instrumentos[i.id];
      return mult === undefined ? s : s + i.valorCientifico * mult;
    }, 0) * factor;
    porObjetivo[obj.id] = v;
    total += v;
  }
  return { total, porObjetivo };
}

/** Vida útil esperada en meses. */
export function vidaEsperada(diseno, ambiente) {
  return Math.round(diseno.vidaBaseMeses * ambiente.factorVida);
}

/** Márgenes (0.1 = 10% de margen; negativo = excedido). */
export function calcularMargenes(diseno, operativo, capacidadCohete) {
  return {
    masa: diseno.capacidadMasa > 0 ? 1 - diseno.masaTotal / diseno.capacidadMasa : -1,
    energia: diseno.consumo > 0 ? operativo.generacionMedia / diseno.consumo - 1 : 1,
    cohete: capacidadCohete > 0 ? 1 - diseno.masaTotal / capacidadCohete : -1
  };
}

/** Color de una barra según cuánto se usa del límite. */
export function nivelBarra(ratio, umbralAmarillo) {
  if (ratio > 1) return 'rojo';
  if (ratio > umbralAmarillo) return 'amarillo';
  return 'verde';
}

const NOMBRE_ALCANCE = { 1: 'Tierra', 2: 'Luna', 3: 'Marte' };

/**
 * Barras del panel de recursos. Cada una: uso / límite (ratio > 1 = problema).
 * a = { diseno, operativo, costoTotal, presupuesto, plazoMeses, vidaEsperada, vidaMinMeses,
 *       alcanceRequerido, riesgoMaximo, umbralAmarillo }
 */
export function construirBarras(a) {
  const d = a.diseno;
  const op = a.operativo;
  const barra = (id, nombre, usado, limite, texto, ayuda) => {
    const ratio = limite > 0 ? usado / limite : usado > 0 ? 2 : 0;
    return { id, nombre, usado, limite, ratio, texto, ayuda, nivel: nivelBarra(ratio, a.umbralAmarillo) };
  };
  const lista = [
    barra('masa', 'Masa', d.masaTotal, d.capacidadMasa,
      `${d.masaTotal} / ${d.capacidadMasa} kg que aguanta la estructura`,
      'La nave pesa demasiado para su estructura: elige una más fuerte o quita peso (combustible, instrumentos).'),
    barra('energia', 'Energía', d.consumo, op.generacionMedia,
      `consume ${r1(d.consumo)} W / genera ${r1(op.generacionMedia)} W (promedio)`,
      'Los equipos gastan más de lo que generan los paneles: agrega paneles o quita consumo.'),
    barra('bateria', 'Batería (sombra)', op.bateriaNecesariaWh, d.capacidadBateriaWh,
      `necesita ${r1(op.bateriaNecesariaWh)} / guarda ${d.capacidadBateriaWh} Wh`,
      'La batería no alcanza para las horas de sombra: los instrumentos se apagarán. Usa una batería mayor.'),
    barra('presupuesto', 'Presupuesto', a.costoTotal, a.presupuesto,
      `${a.costoTotal} / ${a.presupuesto} M$ (con cohete)`,
      'Te pasaste del presupuesto: cambia componentes avanzados por simples o elige otra órbita/cohete.'),
    barra('datos', 'Datos', op.datosGeneradosDia, op.capacidadEnvioDia,
      `genera ${r1(op.datosGeneradosDia)} / envía ${r1(op.capacidadEnvioDia)} GB por día`,
      'Se generan más datos de los que se pueden enviar: mejora la antena, agrega estaciones en tierra o elige otra órbita.'),
    // Comunicaciones: si la antena alcanza, la barra va en verde (al 50%); si no, en rojo
    barra('comunicaciones', 'Comunicaciones', op.enlaceOk ? 1 : 2, 2,
      `alcance hasta ${NOMBRE_ALCANCE[d.alcanceAntena] || '—'} (necesitas ${NOMBRE_ALCANCE[a.alcanceRequerido]}) · contacto ${Math.round(op.contactoReal * 100)}%`,
      'La antena no tiene alcance para comunicarse desde ese destino: no llegará ningún dato.'),
    barra('desarrollo', 'Tiempo', d.mesesDesarrollo, a.plazoMeses,
      `${d.mesesDesarrollo} / ${a.plazoMeses} meses de desarrollo · viaje de ${a.diasViaje ?? '?'} días`,
      'Construir la nave tarda más que el plazo: los componentes avanzados demoran más.'),
    barra('vida', 'Vida útil', a.vidaMinMeses, a.vidaEsperada,
      `dura ~${a.vidaEsperada} meses (se piden ${a.vidaMinMeses})`,
      'La nave no durará lo que pide la misión: usa una estructura más resistente, mejor control térmico u otra órbita.'),
    barra('riesgo', 'Riesgo', d.riesgo, a.riesgoMaximo,
      `${Math.round(d.riesgo * 100)}% de probabilidad de alguna falla (${d.componentesNuevos.length} componentes nuevos)`,
      'Demasiados componentes nuevos (sin vuelos previos): cambia algunos por equipos probados en vuelo.')
  ];
  // Soporte vital: solo en misiones tripuladas
  if (a.soporte) {
    lista.push(barra('soporte', 'Soporte vital', a.soporte.necesario, a.soporte.disponible,
      `necesita ${a.soporte.necesario} / lleva ${a.soporte.disponible} días-persona (oxígeno y comida)`,
      'Los suministros no alcanzan para la ida, la estadía y la vuelta: elige más soporte vital o acorta la misión.'));
  }
  return lista;
}
