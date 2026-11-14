// =============================================================
// comparadorDestinos.js — FUNCIONES PURAS: prueba la MISMA nave en
// otros destinos con una simulación rápida (sin animaciones) y explica
// con una frase por qué cambió el resultado en cada uno.
//
// Los eventos al azar usan una "semilla" fija: así todos los destinos
// reciben los mismos sorteos y la comparación es justa.
// =============================================================
import { calcularDiseno, ambienteDe, balanceOperativo, vidaEsperada, calcularMargenes } from './recursos.js';
import { coheteMasBarato, calcularInsercion, costoRetraso } from './lanzamiento.js';
import { sortearEventos } from './eventos.js';
import { simularMision } from './simulacion.js';
import { evaluarRequisitos, calcularPuntaje } from './puntaje.js';
import { calcularSoporte } from './soporteVital.js';

const r1 = (n) => Math.round(n * 10) / 10;
const pct = (x) => `${Math.round(x * 100)}%`;

/** Generador de números al azar con semilla (mismo resultado cada vez). */
export function azarConSemilla(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Estima si se puede aterrizar: el motor debe superar el peso y el combustible
 * debe alcanzar para frenar desde la velocidad de caída.
 */
export function estimarAterrizaje(diseno, combustibleDisponible, destino, params, margen) {
  const masa = diseno.masaSeca + combustibleDisponible;
  const g = destino.gravedad;
  const empujePeso = masa > 0 ? diseno.empuje / (masa * g) : 0;
  const aceleracionNeta = diseno.empuje / masa - g;
  if (aceleracionNeta <= 0) {
    return { exito: false, motivo: 'motor', empujePeso, combustibleNecesario: Infinity };
  }
  // Velocidad que tendría al llegar al suelo sin frenar, y tiempo de motor para frenarla
  const velocidad = Math.sqrt(params.velocidadVerticalInicial ** 2 + 2 * g * params.altitudInicial);
  const combustibleNecesario = r1((velocidad / aceleracionNeta) * diseno.consumoMotor * margen);
  return {
    exito: combustibleDisponible >= combustibleNecesario,
    motivo: combustibleDisponible >= combustibleNecesario ? null : 'combustible',
    empujePeso, combustibleNecesario
  };
}

/**
 * Simula la nave en una órbita/destino.
 * p = { mision, seleccion, orbita, destino, categorias, cohetes, eventos, config, presupuesto }
 */
export function simularEnDestino(p) {
  const { mision, orbita, destino, config } = p;
  const cfg = config.comparacion;
  const esOriginal = destino.id === mision.destino;
  const diseno = calcularDiseno(p.seleccion, p.categorias, config.riesgo);

  // Si no es el destino de la misión: superficie genérica y "ciencia general"
  const misionLocal = esOriginal ? mision : {
    ...mision,
    superficie: destino.juego.superficie,
    objetivos: mision.objetivos.map((o) => ({
      ...o,
      instrumentos: Object.fromEntries(Object.entries(o.instrumentos).map(([id, m]) => [id, m * cfg.factorOtroDestino]))
    }))
  };
  const ambiente = ambienteDe(misionLocal, destino, orbita);
  const operativo = balanceOperativo(diseno, ambiente);
  const base = { orbita, destino, esOriginal, diseno, operativo, ambiente, riesgo: diseno.riesgo };

  // 1) ¿Hay cohete?
  const cohete = coheteMasBarato(p.cohetes, orbita, diseno.masaTotal);
  if (!cohete) {
    const r = { ...base, llego: false, motivo: 'cohete', datosEnviados: 0, vida: 0, valor: 0, puntaje: 0 };
    return { ...r, explicacion: explicarDestino(r, mision) };
  }

  // 2) Costo, entrada en órbita y (si corresponde) aterrizaje
  const porMes = mision.costoPorMesRetraso ?? config.presupuesto.costoPorMesRetraso;
  const costoTotal = r1(diseno.costoComponentes + cohete.costo + costoRetraso(diseno.mesesDesarrollo, mision.plazoMeses, porMes));
  const insercion = calcularInsercion(diseno.masaTotal, diseno.combustible, orbita);
  let aterrizaje = null;
  if (mision.aterriza) {
    const params = orbita.aterrizaje || { altitudInicial: 800, velocidadVerticalInicial: 30 };
    aterrizaje = estimarAterrizaje(diseno, insercion.quedan, destino, params, cfg.margenAterrizaje);
  }
  const soporte = mision.tripulada ? calcularSoporte({
    tripulantes: mision.tripulantes, diasViaje: destino.juego.diasViaje,
    diasSuperficie: mision.diasSuperficie, diasPersona: diseno.diasPersona
  }) : null;
  const llego = insercion.ok && (!mision.aterriza || aterrizaje.exito);

  // 3) Simulación rápida de la operación
  const azar = azarConSemilla(cfg.semilla);
  const eventos = sortearEventos(p.eventos, cfg.eventos, mision.duracionMeses, diseno.riesgo, config.riesgo.multiplicadorFallas, azar);
  const sim = simularMision({
    diseno, ambiente, vidaEsperada: vidaEsperada(diseno, ambiente), duracionMeses: mision.duracionMeses,
    eventos, insercionOk: llego, objetivos: misionLocal.objetivos, diasPorMes: config.simulacion.diasPorMes, rng: azar
  });
  const resumen = llego ? sim.resumen : null;

  // 4) Requisitos y puntaje (con las mismas reglas que el informe)
  const lanzamiento = {
    costoTotal, insercion,
    margenes: calcularMargenes(diseno, operativo, cohete.capacidad[orbita.id])
  };
  const requisitos = evaluarRequisitos({
    mision: misionLocal, lanzamiento, aterrizaje: aterrizaje && { exito: aterrizaje.exito }, resumen, presupuesto: p.presupuesto, soporte
  });
  const puntaje = calcularPuntaje({ requisitos, resumen, mision: misionLocal, lanzamiento, presupuesto: p.presupuesto, modoEquipo: false, config });

  const r = {
    ...base, cohete, costoTotal, insercion, aterrizaje, soporte, resumen, requisitos,
    llego, motivo: !insercion.ok ? 'insercion' : aterrizaje && !aterrizaje.exito ? 'aterrizaje' : null,
    datosEnviados: resumen ? resumen.datosEnviados : 0,
    vida: resumen ? resumen.mesesOperativos : 0,
    valor: resumen ? resumen.valorCientifico : 0,
    puntaje: puntaje.total
  };
  return { ...r, explicacion: explicarDestino(r, mision, cfg.factorOtroDestino) };
}

/** Una frase que explica por qué el resultado cambió en ese destino. */
export function explicarDestino(r, mision, factorOtroDestino = 0.5) {
  const d = r.destino;
  const nombre = d.nombre;
  if (r.motivo === 'cohete') {
    return `${nombre}: ningún cohete puede llevar ${r.diseno.masaTotal} kg a ${r.orbita.nombre.toLowerCase()}; cuanto más lejos, menos carga puede llevar cada cohete.`;
  }
  if (r.motivo === 'insercion') {
    return `${nombre}: para frenar y quedarse en órbita hacían falta ${r.insercion.necesario} kg de combustible y la nave lleva ${r.diseno.combustible} kg.`;
  }
  if (r.motivo === 'aterrizaje') {
    return r.aterrizaje.motivo === 'motor'
      ? `${nombre}: con su gravedad (${d.gravedad} m/s²) tu motor ni siquiera puede sostener el peso de la nave.`
      : `${nombre}: con su gravedad (${d.gravedad} m/s²) frenar el descenso necesitaría unos ${r.aterrizaje.combustibleNecesario} kg de combustible y solo quedan ${r1(r.insercion.quedan)} kg.`;
  }
  if (!r.operativo.enlaceOk) {
    const km = d.distanciaTierraKm ? ` (unos ${Math.round(d.distanciaTierraKm / 1e6) >= 1 ? `${Math.round(d.distanciaTierraKm / 1e6)} millones de km` : `${Math.round(d.distanciaTierraKm / 1000)} mil km`})` : '';
    return `${nombre}: tu antena no alcanza; la distancia a la Tierra es muchísimo mayor${km}.`;
  }
  if (r.soporte && !r.soporte.suficiente) {
    return `${nombre}: el viaje dura ${d.juego.diasViaje} días de ida; la tripulación necesitaría ${r.soporte.necesario} días-persona de suministros y llevas ${r.soporte.disponible}.`;
  }
  if (r.operativo.fraccionEnergia < 0.9) {
    return `${nombre}: llega solo el ${pct(r.ambiente.factorSolar)} de la luz solar y hay ${pct(r.ambiente.eclipse)} de sombra: tus paneles no alcanzan para todo.`;
  }
  const perdidos = r.resumen && r.resumen.datosGenerados > 0 ? (r.resumen.datosPerdidos + r.resumen.datosBorrados) / r.resumen.datosGenerados : 0;
  if (perdidos > 0.2) {
    return `${nombre}: desde ahí la señal es más débil (×${d.juego.factorComunicacion}) y se pierde el ${pct(perdidos)} de los datos.`;
  }
  if (r.resumen && r.resumen.murioPor === 'vida') {
    return `${nombre}: la nave se desgasta antes de terminar la misión (vida ×${r.ambiente.factorVida} en esta órbita).`;
  }
  if (!r.esOriginal) {
    return `${nombre}: la nave funciona, pero el objetivo de la misión está en otro lugar: aquí solo hace ciencia general (valor ×${factorOtroDestino}).`;
  }
  return `${nombre}: es el destino para el que diseñaste la nave; todo funciona como esperabas.`;
}

/** Marca, para cada fila de la tabla, qué columnas tienen el mejor valor. */
export function mejoresPorFila(resultados) {
  const filas = {
    llego: (r) => (r.llego ? 1 : 0),
    datosEnviados: (r) => r.datosEnviados,
    vida: (r) => r.vida,
    valor: (r) => r.valor,
    riesgo: (r) => -r.riesgo,
    puntaje: (r) => r.puntaje
  };
  const mejores = {};
  for (const [fila, f] of Object.entries(filas)) {
    const valores = resultados.map(f);
    const max = Math.max(...valores);
    const todosIguales = valores.every((v) => v === valores[0]);
    // En verde: el mejor valor (si todos son iguales, ninguno se destaca)
    mejores[fila] = valores.map((v) => !todosIguales && v === max && (fila !== 'datosEnviados' || v > 0));
  }
  return mejores;
}
