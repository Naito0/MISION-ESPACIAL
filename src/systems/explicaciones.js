// =============================================================
// explicaciones.js — La parte educativa: genera frases de causa y efecto
// a partir de lo que REALMENTE pasó (guardado en estado).
//
// Cada explicación es { tipo: 'bien' | 'mal' | 'info', texto }.
// Para agregar una explicación nueva: lee algún dato del estado y haz push.
// =============================================================
import { CONFIG, buscarCohete, buscarPieza, TIERRA } from './datos.js';
import { estado, destinoActual, misionActual } from './estadoMision.js';
import { objetivoCumplido } from './puntaje.js';
import { rutaActual } from './eventos.js';

const NOMBRE_PROTECCION = {
  aislamiento: 'un aislamiento térmico (manta térmica, escudo térmico o blindaje integral)',
  impactos: 'un escudo contra impactos (Whipple o blindaje integral)',
  radiacion: 'un blindaje contra radiación (blindaje integral)',
  entradaAtmosferica: 'un escudo térmico de entrada (escudo térmico o blindaje integral)'
};

export function generarExplicaciones() {
  const lista = [];
  const bien = (texto) => lista.push({ tipo: 'bien', texto });
  const mal = (texto) => lista.push({ tipo: 'mal', texto });
  const info = (texto) => lista.push({ tipo: 'info', texto });

  const destino = destinoActual();
  const mision = misionActual();
  const nave = estado.nave;
  const motor = buscarPieza(estado.seleccion.motor);
  const instReq = buscarPieza(mision.instrumentoRequerido);

  // ---------- 1. Presupuesto ----------
  const costoCohete = estado.lanzamiento.costoCohete;
  const gastado = nave.costo + costoCohete;
  const sobrante = estado.presupuesto - gastado;
  info(`Gastaste ${gastado} M$ de ${estado.presupuesto} M$: ${nave.costo} M$ en la nave y ${costoCohete} M$ en el cohete. ` +
    (sobrante > 0 ? `Te sobraron ${sobrante} M$ (el ahorro suma puntos solo si la nave aterriza).` : 'Usaste todo el presupuesto.'));

  // ---------- 2. Masa y cohete ----------
  const cohete = buscarCohete(estado.lanzamiento.coheteId);
  const masMasBarato = estado.lanzamiento.coheteMasBarato;
  let textoCohete = `Tu nave pesaba ${nave.masaTotal} kg al despegar (${nave.masaSeca} kg de nave + ${nave.capacidadCombustible} kg de combustible), ` +
    `así que necesitaste el ${cohete.nombre.toLowerCase()} (lleva hasta ${cohete.capacidad[destino.id]} kg a ${destino.nombre}).`;
  if (masMasBarato && masMasBarato !== cohete.id) {
    const barato = buscarCohete(masMasBarato);
    textoCohete += ` Podías usar el ${barato.nombre.toLowerCase()}, que costaba ${cohete.costo - barato.costo} M$ menos.`;
    info(textoCohete);
  } else {
    bien(textoCohete + ' Era el cohete más barato posible para esa masa.');
  }

  // ---------- 3. Ruta y combustible ----------
  const ruta = rutaActual();
  const nombreRuta = ruta.nombre.charAt(0).toLowerCase() + ruta.nombre.slice(1); // "Ruta lenta" → "ruta lenta"
  const v = estado.viaje;
  if (v.faltoCombustibleRuta) {
    mal(`La ${nombreRuta} necesitaba ${v.combustibleNecesario} kg de combustible para una nave de ${nave.masaTotal} kg, ` +
      `pero el tanque solo tenía ${v.combustibleAntes} kg. Llegaste sin combustible para frenar: hacía falta un tanque más grande, una nave más liviana o la ruta lenta.`);
  } else {
    info(`La ${nombreRuta} (${ruta.dias} días) gastó ${v.combustibleRuta} kg de combustible: ` +
      `es proporcional a la masa (${nave.masaTotal} kg × ${ruta.factorCombustible}). Cada kg extra de nave cuesta combustible.`);
  }

  // ---------- 4. Eventos del viaje ----------
  for (const ev of v.eventos) {
    if (ev.mitigado) {
      bien(`${ev.nombre}: ${ev.texto} Elegir esa protección valió la pena.`);
    } else if (ev.mitigadoPor) {
      mal(`${ev.nombre}: ${ev.texto} Se evitaba con ${NOMBRE_PROTECCION[ev.mitigadoPor] || ev.mitigadoPor}. ${ev.explicacion}`);
    } else {
      info(`${ev.nombre}: ${ev.texto} ${ev.explicacion}`);
    }
  }

  // ---------- 5. Aterrizaje ----------
  const at = estado.aterrizaje;
  if (at) {
    const cfgAt = CONFIG.aterrizaje;
    const relacion = at.empujePeso.toFixed(2);
    const textoFisica = `Con ${at.masaInicial} kg y un ${motor.nombre.toLowerCase()} de ${motor.empuje} N, la aceleración máxima del motor era ` +
      `${(motor.empuje / at.masaInicial).toFixed(2)} m/s² contra una gravedad de ${destino.gravedad} m/s² ` +
      `(relación empuje/peso = ${relacion}).`;

    if (at.exito) {
      bien(`Aterrizaste a ${at.vVertical.toFixed(1)} m/s (el límite era ${cfgAt.velocidadMaxVertical} m/s). ${textoFisica} ` +
        `Te quedaron ${Math.round(at.combustibleFinal)} kg de combustible.`);
    } else {
      let causa = '';
      switch (at.motivo) {
        case 'combustible':
          causa = at.combustibleInicial <= 0
            ? 'Empezaste el descenso sin combustible, así que el motor nunca pudo frenar la caída.'
            : `El combustible se acabó durante el descenso (tenías ${Math.round(at.combustibleInicial)} kg y el motor gasta ${motor.consumo} kg/s).`;
          break;
        case 'vertical':
          causa = `Tocaste el suelo a ${at.vVertical.toFixed(1)} m/s hacia abajo; el tren de aterrizaje aguanta hasta ${cfgAt.velocidadMaxVertical} m/s.`;
          break;
        case 'horizontal':
          causa = `Te desplazabas de lado a ${at.vHorizontal.toFixed(1)} m/s; el límite era ${cfgAt.velocidadMaxHorizontal} m/s y la nave volcó.`;
          break;
        case 'angulo':
          causa = `La nave estaba inclinada ${Math.abs(at.angulo).toFixed(0)}°; con más de ${cfgAt.anguloMaxGrados}° se vuelca al tocar el suelo.`;
          break;
        default:
          causa = 'La nave tocó el suelo demasiado rápido.';
      }
      mal(`La nave se estrelló. ${causa} ${textoFisica}`);
    }

    if (at.empujePeso < 1) {
      mal(`El motor NO podía sostener la nave: su empuje era menor que el peso en ${destino.nombre}. Hacía falta un motor más potente o una nave más liviana.`);
    } else if (at.empujePeso < 1.5) {
      mal(`El motor apenas superaba el peso de la nave (empuje/peso ${relacion}): frenar era lento y gastaba mucho combustible. Con una relación mayor a 1,5 es mucho más fácil.`);
    } else if (at.empujePeso > 4) {
      info(`Tu motor tenía mucho más empuje del necesario (empuje/peso ${relacion}). Uno más chico habría ahorrado masa y dinero.`);
    }

    if (destino.juego.aterrizaje.frenadoAtmosferico > 0) {
      info(`En ${destino.nombre} la atmósfera delgada frena un poco la nave, pero no lo suficiente: la mayor parte del frenado la hace el motor.`);
    }
    info(`La gravedad de ${destino.nombre} (${destino.gravedad} m/s²) es ${(destino.gravedad / TIERRA.gravedad * 100).toFixed(0)}% de la terrestre: ` +
      `cuanto más fuerte es la gravedad, más empuje y combustible necesitas para aterrizar.`);
  }

  // ---------- 6. Operación en la superficie ----------
  const op = estado.operacion;
  if (!op) {
    mal(`Como la nave no sobrevivió al aterrizaje, el ${instReq.nombre.toLowerCase()} nunca pudo trabajar y no llegaron datos a la Tierra.`);
  } else {
    if (op.generacionPorTurno <= op.consumoFijo) {
      mal(`Tus paneles generaban ${op.generacionPorTurno} E por turno, pero la nave gastaba ${op.consumoFijo} E solo en mantenerse viva ` +
        `(computadora y calefacción). Sin energía extra, los instrumentos dependían de la batería.`);
    } else {
      bien(`Tus paneles generaban ${op.generacionPorTurno} E por turno y la nave gastaba ${op.consumoFijo} E fijos: ` +
        `te sobraban ${op.generacionPorTurno - op.consumoFijo} E por turno para ciencia.`);
    }
    const solar = estado.misionId && mision.notaSolar;
    if (solar) info(mision.notaSolar);
    if (destino.juego.factorSolar < 1) {
      info(`En ${destino.nombre} llega solo el ${Math.round(destino.juego.factorSolar * 100)}% de la luz solar que en la Tierra, por eso los paneles rinden menos.`);
    }
    if (op.turnosSinEnergia > 0) {
      mal(`Pasaste ${op.turnosSinEnergia} turno(s) en modo seguro por falta de energía: más paneles o una batería más grande lo habrían evitado.`);
    }
    if (op.energiaDesperdiciada > 20) {
      info(`Se desperdiciaron ${op.energiaDesperdiciada} E porque la batería ya estaba llena. Podías usar más instrumentos o tener una batería mayor.`);
    }

    if (estado.recursos.instrumentosDanados.includes(mision.instrumentoRequerido)) {
      mal(`El ${instReq.nombre.toLowerCase()} (instrumento principal) se dañó en el viaje, por eso no pudo cumplir el objetivo.`);
    }

    const generados = Object.values(op.datosGenerados).reduce((s, n) => s + n, 0);
    const transmitidos = Object.values(op.datosTransmitidos).reduce((s, n) => s + n, 0);
    info(`Tus instrumentos generaron ${generados} datos y llegaron ${transmitidos} a la Tierra. ` +
      `Tu antena enviaba ${op.tasaTransmision} datos por transmisión` +
      (destino.juego.factorComunicacion < 1 ? ` (la distancia a ${destino.nombre} reduce la señal al ${Math.round(destino.juego.factorComunicacion * 100)}%).` : '.'));
    if (op.datosSinTransmitir > 0) {
      mal(`${op.datosSinTransmitir} datos quedaron en la memoria sin enviar. Una antena de mayor ganancia o transmitir más seguido los habría salvado.`);
    }
    if (op.datosPerdidosMemoria > 0) {
      mal(`${op.datosPerdidosMemoria} datos se perdieron porque la memoria (${op.memoriaMax}) estaba llena: había que transmitir antes.`);
    }

    const recibidosObjetivo = op.datosTransmitidos[mision.instrumentoRequerido] || 0;
    if (objetivoCumplido()) {
      bien(`¡Objetivo cumplido! Llegaron ${recibidosObjetivo} datos del ${instReq.nombre.toLowerCase()} (se pedían ${mision.datosObjetivo}).`);
    } else {
      mal(`Objetivo no cumplido: llegaron ${recibidosObjetivo} de ${mision.datosObjetivo} datos del ${instReq.nombre.toLowerCase()}.`);
    }
  }

  return lista;
}
