// =============================================================
// hangar.js — Reglas del HANGAR (funciones puras, se pueden probar).
// Cada rol compra las piezas de sus categorías con un presupuesto
// COMPARTIDO. Antes de despegar se valida:
//   - masa total ≤ lo que el cohete puede llevar al destino
//   - masa total ≤ lo que aguanta la estructura
//   - energía: lo que generan los paneles (× luz solar del destino) ≥ lo que se consume
//   - la antena llega hasta el destino
//   - que no falte ninguna pieza obligatoria
// También calcula el "diseño": qué protecciones tiene la nave para el viaje.
// =============================================================

/** Arma el catálogo del hangar: categorías con sus opciones (solo escala normal). */
export function crearCatalogo(componentes, configHangar) {
  return configHangar.categorias.map((cat) => {
    const original = componentes.categorias.find((c) => c.id === cat.id);
    return {
      ...cat,
      porQueImporta: original?.porQueImporta || '',
      opciones: (original?.opciones || []).filter((o) => o.escala === 'normal')
    };
  });
}

/** Busca una opción por id en el catálogo. */
export function buscarOpcion(catalogo, idOpcion) {
  for (const c of catalogo) {
    const o = c.opciones.find((x) => x.id === idOpcion);
    if (o) return { categoria: c, opcion: o };
  }
  return null;
}

/** Selección inicial: nada comprado. seleccion = { categoriaId: [idsOpcion] } */
export function seleccionVacia(catalogo) {
  return Object.fromEntries(catalogo.map((c) => [c.id, []]));
}

/**
 * Resumen del diseño: costo, masa, energía y problemas (explicados con palabras simples).
 * destino = objeto de destinos.json · config = hangar3d.json
 */
export function resumenDiseno(seleccion, catalogo, destino, config) {
  const elegidas = Object.values(seleccion).flat().map((id) => buscarOpcion(catalogo, id)?.opcion).filter(Boolean);
  const suma = (f) => elegidas.reduce((s, o) => s + (f(o) || 0), 0);
  const costo = suma((o) => o.costo);
  const masa = Math.round(suma((o) => o.masa));
  const factorSolar = destino.juego?.factorSolar ?? 1;
  const generacion = Math.round(suma((o) => (o.energia > 0 ? o.energia : 0)) * factorSolar);
  const consumo = Math.round(-suma((o) => (o.energia < 0 ? o.energia : 0)));
  const presupuesto = config.presupuesto[destino.id];
  const capacidad = config.capacidadCohete[destino.id];
  const estructura = elegidas.find((o) => o.capacidadMasa);
  const antena = (seleccion.antena || []).map((id) => buscarOpcion(catalogo, id)?.opcion).find(Boolean);

  const problemas = [];
  for (const c of catalogo) {
    if (!seleccion[c.id] || !seleccion[c.id].length) problemas.push({ rol: c.rol, texto: `Falta elegir: ${c.nombre}.` });
  }
  if (costo > presupuesto) problemas.push({ rol: null, texto: `Se pasaron del presupuesto: ${costo} de ${presupuesto} M$. Cambien alguna pieza por una más barata.` });
  if (masa > capacidad) problemas.push({ rol: null, texto: `La nave pesa ${masa} kg y el cohete solo puede llevar ${capacidad} kg a ${destino.nombre}. Cada kilo extra necesita más combustible para despegar.` });
  if (estructura && masa > estructura.capacidadMasa) problemas.push({ rol: 'ingeniero', texto: `La estructura "${estructura.nombre}" aguanta ${estructura.capacidadMasa} kg y la nave pesa ${masa} kg: se rompería en el despegue.` });
  if (generacion < consumo) {
    const nota = factorSolar < 1 ? ` En ${destino.nombre} llega solo el ${Math.round(factorSolar * 100)}% de la luz del Sol que en la Tierra.` : '';
    problemas.push({ rol: 'ingeniero', texto: `Falta energía: los paneles dan ${generacion} W y los equipos usan ${consumo} W.${nota}` });
  }
  const alcance = destino.juego?.alcanceRequerido ?? 1;
  if (antena && antena.alcance < alcance) problemas.push({ rol: 'comunicaciones', texto: `La antena "${antena.nombre}" no llega hasta ${destino.nombre}: perderían el contacto con la Tierra.` });

  // Protecciones para el viaje (true = protegido)
  const tiene = (ids) => elegidas.some((o) => ids.includes(o.id));
  const diseno = Object.fromEntries(Object.entries(config.protege).map(([k, ids]) => [k, tiene(ids)]));
  diseno.energia = generacion - consumo >= config.margenEnergia;

  return { costo, masa, generacion, consumo, presupuesto, capacidad, factorSolar, problemas, diseno, cantidad: elegidas.length };
}

/**
 * Comprar / cambiar una pieza. Devuelve { ok } o { error }.
 * En categorías simples reemplaza la anterior; en "multiple" la agrega o la quita.
 */
export function comprar(seleccion, catalogo, rolesJugador, idOpcion, destino, config) {
  const b = buscarOpcion(catalogo, idOpcion);
  if (!b) return { error: 'Esa pieza no existe.' };
  const { categoria, opcion } = b;
  if (!rolesJugador.includes(categoria.rol)) return { error: `Eso lo compra el rol ${categoria.rol}.` };
  const actual = seleccion[categoria.id] || [];
  let nueva;
  if (categoria.multiple) {
    if (actual.includes(opcion.id)) nueva = actual.filter((x) => x !== opcion.id);
    else {
      if (actual.length >= (categoria.maximo || 99)) return { error: `Máximo ${categoria.maximo} en ${categoria.nombre}.` };
      nueva = [...actual, opcion.id];
    }
  } else nueva = actual[0] === opcion.id ? [] : [opcion.id];
  const prueba = { ...seleccion, [categoria.id]: nueva };
  const r = resumenDiseno(prueba, catalogo, destino, config);
  if (r.costo > r.presupuesto) return { error: `No alcanza el dinero: costaría ${r.costo} de ${r.presupuesto} M$.` };
  seleccion[categoria.id] = nueva;
  return { ok: true, quitada: nueva.length < actual.length };
}
