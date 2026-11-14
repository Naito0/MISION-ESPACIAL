// =============================================================
// recomendaciones.js — Mínimo / Recomendado / Exagerado de cada categoría
// del hangar, SEGÚN EL DESTINO (funciones puras, con pruebas).
//
// Cada categoría da una barra con zonas:
//   rojo     = por debajo del MÍNIMO (lo justo para que funcione)
//   verde    = desde el mínimo hasta EXAGERADO (con una marca en RECOMENDADO:
//              el mínimo más un margen de seguridad)
//   amarillo = EXAGERADO (suma masa y costo sin mejorar la misión)
// No prohíbe nada: solo explica. Los datos del destino salen de destinos.json.
// =============================================================
import { buscarOpcion } from './hangar.js';

const LUZ_KM_S = 299792; // velocidad de la luz en km/s (la radio viaja a esta velocidad)

/**
 * Segundos que tarda una señal de radio en llegar desde el destino.
 * Si destinos.json trae el retraso publicado por la NASA (armado.retrasoMinSeg/MaxSeg,
 * Marte: 4 a 24 minutos), se usa ese; si no, se calcula: distancia ÷ velocidad de la luz
 * (Luna: 384 400 km → ≈ 1,3 s).
 */
export function retrasoSenal(destino) {
  const a = destino.armado || {};
  if (a.retrasoMinSeg && a.retrasoMaxSeg) return { min: a.retrasoMinSeg, max: a.retrasoMaxSeg };
  const min = (destino.distanciaMinKm ?? destino.distanciaTierraKm) / LUZ_KM_S;
  const max = (destino.distanciaMaxKm ?? destino.distanciaTierraKm) / LUZ_KM_S;
  return { min, max };
}

/** "1.3 segundos" o "entre 4 y 24 minutos" */
export function textoRetraso(destino) {
  const r = retrasoSenal(destino);
  if (r.max < 60) return `${r.max.toFixed(1)} segundos`;
  return `entre ${Math.round(r.min / 60)} y ${Math.round(r.max / 60)} minutos`;
}

// Orden de "nivel" de las piezas (de menos a más) en las categorías que no tienen un número propio
const NIVELES = {
  estructura: ['estr_ligera', 'estr_reforzada', 'estr_blindada'],
  termica: ['term_pintura', 'term_manta', 'term_activa'],
  antena: ['ant_baja', 'ant_media', 'ant_alta'],
  estaciones: ['est_una', 'est_regional', 'est_global'],
  avionica: ['comp_basica', 'comp_estandar', 'comp_resistente'],
  soporte: ['sv_basico', 'sv_reserva', 'sv_reciclaje']
};
const CONSUMO_ESTIMADO = 60; // W: si todavía no eligieron equipos, se supone un consumo básico

/**
 * Datos del destino y de la nave que usan las fórmulas.
 * resumen = resumenDiseno(...) del hangar (costo, masa, generacion, consumo).
 */
function contexto(seleccion, catalogo, destino, resumen) {
  const op = (id) => buscarOpcion(catalogo, id)?.opcion;
  const elegida = (cat) => (seleccion[cat] || []).map(op).filter(Boolean);
  const arm = destino.armado || {};
  return {
    destino, elegida, op,
    marte: destino.id === 'marte',
    consumo: Math.max(resumen.consumo, CONSUMO_ESTIMADO),
    generacion: resumen.generacion,
    // Masa de la nave (en componentes.json la masa del motor NO incluye el combustible).
    // Si todavía hay pocas piezas, se supone una nave de 400 kg.
    masaSeca: Math.max(400, resumen.masa),
    factorPolvo: arm.factorPolvo ?? 1,
    horasReserva: arm.horasReservaBaterias ?? 4,
    diasViaje: destino.juego?.diasViaje ?? 1,
    rangoTemp: destino.temperatura.maxC - destino.temperatura.minC
  };
}

/** Estado según el valor y las zonas. */
function estadoDe(v, z) {
  if (v === null) return 'vacio';
  if (v < z.min) return 'bajo';
  if (v < z.rec) return 'justo';
  if (v >= z.exag) return 'exagerado';
  return 'ok';
}

/**
 * Calcula las zonas de UNA categoría.
 * Devuelve { tipo, unidad, valor, min, rec, exag, max, etiquetas?, porQue, bajo, estado }.
 */
function zonas(cat, c) {
  const d = c.destino;
  const nombreDestino = d.id === 'luna' ? 'la Luna' : d.nombre;
  const nivel = (lista) => {
    const id = (c.elegida(cat)[0] || {}).id;
    return id ? lista.indexOf(id) : null;
  };
  switch (cat) {
    case 'paneles': {
      // MÍNIMO: los paneles deben dar al menos lo que gastan los equipos.
      // RECOMENDADO: + margen. En Marte el margen cubre el polvo: consumo ÷ factorPolvo
      //   (con 0,75 → 33% más); en la Luna un 25% más.
      // EXAGERADO: más de 2,5 veces el consumo (paneles de sobra = masa y dinero de más).
      const min = c.consumo;
      const rec = c.marte ? c.consumo / c.factorPolvo : c.consumo * 1.25;
      return {
        tipo: 'numero', unidad: `W en ${nombreDestino}`, valor: c.elegida('paneles').length ? c.generacion : null,
        min, rec, exag: c.consumo * 2.5, max: c.consumo * 3.2,
        porQue: c.marte
          ? `A Marte llega el ${Math.round(d.juego.factorSolar * 100)}% de la luz que a la Tierra y el polvo tapa los paneles: hacen falta más paneles para la misma energía.`
          : 'En la Luna llega tanta luz como a la Tierra, pero hay que cubrir todo lo que gastan los equipos.',
        bajo: 'Sin energía suficiente la nave no puede despegar.'
      };
    }
    case 'baterias': {
      // Las baterías mantienen los equipos de noche: energía = consumo (W) × horas de reserva.
      // Las horas de reserva son un valor del juego que crece con la noche del destino
      // (noche lunar ≈ 14 días → más horas que en Marte, donde la noche dura ≈ 12 h).
      const min = c.consumo * c.horasReserva;
      const bat = c.elegida('baterias')[0];
      return {
        tipo: 'numero', unidad: 'Wh', valor: bat ? bat.capacidadWh : null,
        min, rec: min * 1.3, exag: min * 2.5, max: min * 3,
        porQue: `${d.armado?.nocheTexto || ''} Las baterías mantienen los equipos encendidos de noche.`,
        bajo: 'De noche se apagarían equipos: la misión corre peligro.'
      };
    }
    case 'propulsion': {
      // Combustible para frenar y aterrizar: cuanto más fuerte la gravedad, más hay que frenar.
      // MÍNIMO (kg) = masa de la nave × (gravedad del destino ÷ gravedad de la Tierra) × 0,7
      //   (0,7 es un valor del juego). RECOMENDADO: +40%. EXAGERADO: el triple del mínimo.
      //   Ej.: nave de 470 kg → Luna ≈ 54 kg, Marte ≈ 124 kg.
      const min = c.masaSeca * (d.gravedad / 9.81) * 0.7;
      const prop = c.elegida('propulsion')[0];
      return {
        tipo: 'numero', unidad: 'kg de combustible', valor: prop ? prop.combustible : null,
        min, rec: min * 1.4, exag: min * 3, max: Math.max(min * 3.5, 480),
        porQue: `La gravedad en ${nombreDestino} es de ${d.gravedad} m/s². ${c.marte ? 'Es más del doble que en la Luna: aterrizar en Marte necesita más combustible.' : 'Es baja: aterrizar necesita poco combustible.'}`,
        bajo: 'Te quedarías sin combustible para frenar al aterrizar.'
      };
    }
    case 'estructura': {
      // Blindaje según la duración del viaje: más días = más micrometeoritos.
      // Viaje de más de 30 días (Marte: 210) → se recomienda la blindada; si no, la reforzada.
      const rec = c.diasViaje > 30 ? 2 : 1;
      return {
        tipo: 'nivel', etiquetas: ['Ligera', 'Reforzada', 'Blindada'], valor: nivel(NIVELES.estructura),
        min: 0, rec, exag: rec === 2 ? 99 : 2, max: 2,
        porQue: `El viaje dura unos ${c.diasViaje} días (valor del juego): cuanto más largo, más micrometeoritos golpean la nave.`,
        bajo: ''
      };
    }
    case 'termica': {
      // Diferencia de temperatura entre el día y la noche del destino (destinos.json).
      // Más de 250 °C de diferencia (la Luna: 290 °C) → el control activo no es exagerado.
      const grande = c.rangoTemp > 250;
      return {
        tipo: 'nivel', etiquetas: ['Pintura', 'Manta', 'Activo'], valor: nivel(NIVELES.termica),
        min: 0, rec: 1, exag: grande ? 99 : 2, max: 2,
        porQue: `En ${nombreDestino} la temperatura va de ${d.temperatura.minC} °C a ${d.temperatura.maxC} °C: hay que proteger la nave del frío y del calor.`,
        bajo: ''
      };
    }
    case 'antena': {
      // La antena debe tener el alcance que pide el destino (destinos.json → alcanceRequerido):
      // Luna 2 = antena de baja ganancia; Marte 3 = media o alta.
      const min = d.juego.alcanceRequerido >= 3 ? 1 : 0;
      return {
        tipo: 'nivel', etiquetas: ['Baja', 'Media', 'Alta'], valor: nivel(NIVELES.antena),
        min, rec: min, exag: min === 0 ? 2 : 99, max: 2,
        porQue: `Una señal tarda ${textoRetraso(d)} en llegar desde ${nombreDestino} (distancia ÷ velocidad de la luz). ${c.marte ? 'Desde tan lejos la antena importa mucho.' : 'Está cerca: alcanza una antena sencilla.'}`,
        bajo: 'La señal no llegaría a la Tierra: perderían el contacto.'
      };
    }
    case 'estaciones': {
      const rec = c.marte ? 1 : 0;
      return {
        tipo: 'nivel', etiquetas: ['Una', 'Regional', 'Global'], valor: nivel(NIVELES.estaciones),
        min: 0, rec, exag: c.marte ? 99 : 2, max: 2,
        porQue: c.marte ? 'Desde Marte la señal llega débil: más antenas en la Tierra dan más tiempo de contacto.' : 'La Luna está cerca: con pocas antenas en la Tierra alcanza.',
        bajo: ''
      };
    }
    case 'avionica': {
      const rec = c.diasViaje > 30 ? 1 : 0;
      return {
        tipo: 'nivel', etiquetas: ['Básica', 'Estándar', 'Resistente'], valor: nivel(NIVELES.avionica),
        min: 0, rec, exag: rec ? 99 : 2, max: 2,
        porQue: c.diasViaje > 30 ? 'En un viaje largo la computadora guarda muchos datos y recibe más radiación.' : 'En un viaje corto alcanza una computadora básica.',
        bajo: ''
      };
    }
    case 'soporte': {
      const rec = c.diasViaje > 30 ? 2 : 0;
      return {
        tipo: 'nivel', etiquetas: ['Básico', 'Reserva', 'Reciclaje'], valor: nivel(NIVELES.soporte),
        min: 0, rec, exag: rec === 2 ? 99 : 2, max: 2,
        porQue: c.diasViaje > 30 ? 'En un viaje largo no se puede llevar todo el aire: hay que reciclarlo.' : 'El viaje a la Luna dura pocos días: alcanza con el aire que se lleva.',
        bajo: ''
      };
    }
    case 'instrumentos': {
      const n = c.elegida('instrumentos').length;
      return {
        tipo: 'nivel', etiquetas: ['0', '1', '2', '3'], valor: n || null,
        min: 1, rec: 2, exag: 99, max: 3,
        porQue: 'Los instrumentos son la razón de la misión: con dos o más se aprende mucho más.',
        bajo: 'Sin instrumentos no hay ciencia.'
      };
    }
    default: return null;
  }
}

/** Recomendaciones de todas las categorías: { categoriaId: {...zonas, estado, recomendadas: [nombres]} } */
export function recomendaciones(seleccion, catalogo, destino, resumen) {
  const c = contexto(seleccion, catalogo, destino, resumen);
  const out = {};
  for (const cat of catalogo) {
    const z = zonas(cat.id, c);
    if (!z) continue;
    z.estado = estadoDe(z.valor, z);
    // Qué opciones caen en la zona verde (para decir "te recomendamos…")
    z.recomendadas = cat.opciones.filter((o) => {
      const prueba = { ...seleccion, [cat.id]: [o.id] };
      const v = zonas(cat.id, { ...c, elegida: (k) => (prueba[k] || []).map(c.op).filter(Boolean), generacion: cat.id === 'paneles' ? Math.round(o.energia * destino.juego.factorSolar) : c.generacion }).valor;
      return v !== null && v >= z.rec && v < z.exag;
    }).map((o) => o.nombre);
    out[cat.id] = z;
  }
  return out;
}

/** Avisos cuando una pieza pide otra (dependencias). Devuelve una lista de frases. */
export function dependencias(seleccion, catalogo, destino, resumen) {
  const r = recomendaciones(seleccion, catalogo, destino, resumen);
  const op = (id) => buscarOpcion(catalogo, id)?.opcion;
  const ids = new Set(Object.values(seleccion).flat());
  const nombreDestino = destino.id === 'luna' ? 'la Luna' : 'Marte';
  const panelesRec = r.paneles?.recomendadas.join(' o ') || 'paneles más grandes';
  const avisos = [];
  const bat = (seleccion.baterias || []).map(op)[0];
  const pocaEnergia = r.paneles && (r.paneles.estado === 'bajo' || r.paneles.estado === 'justo' || r.paneles.estado === 'vacio');
  if (bat && bat.capacidadWh >= 600 && pocaEnergia) {
    avisos.push(`Compraste baterías grandes, pero tus paneles no alcanzan a cargarlas. Para ${nombreDestino} te recomendamos: ${panelesRec}.`);
  }
  for (const [id, texto] of [['ant_alta', 'La antena de alta ganancia'], ['sv_reciclaje', 'El reciclador de aire'], ['term_activa', 'El control térmico activo'], ['radar', 'El radar']]) {
    if (ids.has(id) && pocaEnergia) avisos.push(`${texto} gasta mucha energía (${Math.abs(op(id).energia)} W): necesitas más paneles. Te recomendamos: ${panelesRec}.`);
  }
  if (ids.has('prop_grande') && ids.has('estr_ligera')) avisos.push('El motor grande y su combustible pesan mucho: la estructura ligera podría no aguantar. Prueba la reforzada.');
  const datos = (seleccion.instrumentos || []).map(op).reduce((s, o) => s + (o?.datos || 0), 0);
  const ant = (seleccion.antena || []).map(op)[0];
  if (ant && datos > ant.tasa) avisos.push(`Tus instrumentos generan ${datos} GB por día y la antena envía ${ant.tasa}: los datos no llegarían todos. Elige una antena más potente.`);
  return avisos;
}
