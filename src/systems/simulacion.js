// =============================================================
// simulacion.js — FUNCIÓN PURA que simula la misión mes a mes.
//
// En cada mes calcula: energía disponible, datos generados, enviados y
// perdidos, valor científico por objetivo, desgaste (vida restante) y
// los eventos. La escena de Simulación solo "reproduce" el resultado.
// =============================================================
import { balanceOperativo, valorPorObjetivo } from './recursos.js';

/**
 * @param p.diseno         resultado de calcularDiseno()
 * @param p.ambiente       resultado de ambienteDe()
 * @param p.vidaEsperada   meses que debería durar la nave
 * @param p.duracionMeses  meses que dura la misión
 * @param p.eventos        resultado de sortearEventos() (con .mes)
 * @param p.insercionOk    ¿alcanzó el combustible para entrar en órbita?
 * @param p.objetivos      objetivos de la misión (con sus instrumentos útiles)
 * @param p.diasPorMes     normalmente 30
 * @param p.rng            función aleatoria (para elegir qué instrumento se daña)
 */
export function simularMision(p) {
  const rng = p.rng || Math.random;
  const diasPorMes = p.diasPorMes || 30;
  const pasos = [];
  const eventosResueltos = [];
  const valorObjetivos = Object.fromEntries(p.objetivos.map((o) => [o.id, 0]));

  if (!p.insercionOk) {
    return { pasos, resumen: crearResumen({ murioPor: 'insercion', duracionMeses: p.duracionMeses, valorObjetivos }) };
  }

  // Copia del diseño que los eventos pueden dañar (no tocamos el original)
  const d = { ...p.diseno, instrumentos: [...p.diseno.instrumentos], efectos: [...p.diseno.efectos] };
  const sim = { vidaRestante: p.vidaEsperada, buffer: 0, instrumentosDanados: [] };
  const tot = { generados: 0, enviados: 0, perdidos: 0, valor: 0, sumaOperacion: 0, mesesEnergiaBaja: 0, borrados: 0 };
  let mesesVivo = 0;
  let murioPor = null;
  const operativoInicial = balanceOperativo(d, p.ambiente);

  for (let mes = 1; mes <= p.duracionMeses; mes++) {
    // 1) Eventos de este mes
    const eventosMes = [];
    for (const ev of p.eventos.filter((e) => e.mes === mes)) {
      const mitigado = ev.mitigadoPor ? d.efectos.includes(ev.mitigadoPor) : false;
      const perdidas = [];
      if (!mitigado) {
        for (const danio of ev.danio) {
          const texto = aplicarDanio(danio, d, sim, tot, rng);
          if (texto) perdidas.push(texto);
        }
      }
      const r = {
        id: ev.id, nombre: ev.nombre, mes, mitigado, mitigadoPor: ev.mitigadoPor, esFalla: !!ev.esFalla,
        descripcion: ev.descripcion, texto: mitigado ? ev.textoMitigado : ev.textoDanio,
        explicacion: ev.explicacion, perdidas
      };
      eventosMes.push(r);
      eventosResueltos.push(r);
    }

    // 2) ¿Sigue viva la nave?
    if (sim.vidaRestante < 1) {
      murioPor = 'vida';
      pasos.push({ mes, vivo: false, eventos: eventosMes, acumulado: { ...tot } });
      break;
    }

    // 3) Energía y datos del mes
    const op = balanceOperativo(d, p.ambiente);
    const generados = op.datosGeneradosDia * diasPorMes;
    const capacidad = op.capacidadEnvioDia * diasPorMes;
    const disponible = sim.buffer + generados;
    const enviados = Math.min(disponible, capacidad);
    const resto = disponible - enviados;
    sim.buffer = Math.min(resto, d.almacenamientoGB); // lo que cabe en la memoria espera al mes siguiente
    const perdidos = resto - sim.buffer;              // lo que no cabe se pierde

    // 4) Valor científico: solo cuenta lo que llega a la Tierra
    const fraccionEnviada = generados > 0 ? Math.min(1, enviados / generados) : 0;
    const v = valorPorObjetivo(d, p.ambiente, p.objetivos, op.fraccionOperacion);
    for (const id of Object.keys(v.porObjetivo)) valorObjetivos[id] += v.porObjetivo[id] * fraccionEnviada;
    const valor = v.total * fraccionEnviada;

    tot.generados += generados;
    tot.enviados += enviados;
    tot.perdidos += perdidos;
    tot.valor += valor;
    tot.sumaOperacion += op.fraccionOperacion;
    if (op.fraccionOperacion < 0.9) tot.mesesEnergiaBaja++;

    // 5) Desgaste
    sim.vidaRestante -= 1;
    mesesVivo++;

    pasos.push({
      mes, vivo: true, fraccionOperacion: op.fraccionOperacion,
      generados, enviados, perdidos, buffer: sim.buffer, valor,
      vidaRestante: sim.vidaRestante, eventos: eventosMes, acumulado: { ...tot }
    });
  }

  return {
    pasos,
    resumen: crearResumen({
      murioPor,
      duracionMeses: p.duracionMeses,
      mesesOperativos: mesesVivo,
      datosGenerados: tot.generados,
      datosEnviados: tot.enviados,
      datosPerdidos: tot.perdidos,
      datosBorrados: tot.borrados,
      datosSinEnviar: sim.buffer,
      valorCientifico: tot.valor,
      valorObjetivos,
      fraccionOperacionMedia: mesesVivo ? tot.sumaOperacion / mesesVivo : 0,
      mesesEnergiaBaja: tot.mesesEnergiaBaja,
      eventos: eventosResueltos,
      instrumentosDanados: sim.instrumentosDanados,
      operativoInicial
    })
  };
}

function crearResumen(datos) {
  return {
    murioPor: null, duracionMeses: 0, mesesOperativos: 0,
    datosGenerados: 0, datosEnviados: 0, datosPerdidos: 0, datosBorrados: 0, datosSinEnviar: 0,
    valorCientifico: 0, valorObjetivos: {}, fraccionOperacionMedia: 0, mesesEnergiaBaja: 0,
    eventos: [], instrumentosDanados: [], operativoInicial: null,
    ...datos
  };
}

/** Aplica un daño al diseño simulado. Devuelve un texto corto con la pérdida. */
function aplicarDanio(danio, d, sim, tot, rng) {
  const f = 1 - (danio.porcentaje || 0) / 100;
  switch (danio.tipo) {
    case 'paneles':
      d.generacionNominal *= f;
      return `paneles: -${danio.porcentaje}%`;
    case 'bateria':
      d.capacidadBateriaWh *= f;
      return `batería: -${danio.porcentaje}%`;
    case 'antena':
      d.tasaAntena *= f;
      return `antena: -${danio.porcentaje}%`;
    case 'vida':
      sim.vidaRestante *= f;
      return `vida restante: -${danio.porcentaje}%`;
    case 'datos': {
      const borrados = sim.buffer * (1 - f);
      sim.buffer -= borrados;
      tot.borrados += borrados;
      return `${Math.round(borrados * 10) / 10} GB borrados de la memoria`;
    }
    case 'instrumento': {
      if (d.instrumentos.length === 0) return null;
      const i = Math.floor(rng() * d.instrumentos.length);
      const roto = d.instrumentos.splice(i, 1)[0];
      d.datosDia -= roto.datos;
      d.consumo -= roto.energia; // un instrumento apagado ya no consume
      sim.instrumentosDanados.push(roto.nombre);
      return `${roto.nombre} fuera de servicio`;
    }
    default:
      return null;
  }
}
