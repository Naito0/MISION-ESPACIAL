// =============================================================
// eventos.js — Consumo de combustible de la ruta y eventos del viaje.
// Las piezas elegidas (efectos de los escudos) deciden si un evento hace daño.
// =============================================================
import { EVENTOS, EVENTOS_FIJOS } from './datos.js';
import { estado, destinoActual, tieneEfecto, registrar } from './estadoMision.js';

/** Datos de la ruta elegida ('rapida' o 'lenta') para el destino actual. */
export function rutaActual() {
  return destinoActual().juego.rutas[estado.lanzamiento.rutaId];
}

/**
 * Combustible que gasta una ruta: proporcional a la masa de la nave
 * (más masa → más combustible para acelerar y frenar).
 */
export function combustibleDeRuta(masaTotal, ruta) {
  return Math.round(masaTotal * ruta.factorCombustible);
}

/** Descuenta el combustible de la ruta. Se llama una vez al empezar el viaje. */
export function aplicarConsumoRuta() {
  const ruta = rutaActual();
  const necesario = combustibleDeRuta(estado.nave.masaTotal, ruta);
  const antes = estado.recursos.combustible;
  const gastado = Math.min(necesario, antes);

  estado.recursos.combustible = antes - gastado;
  estado.viaje.combustibleAntes = antes;
  estado.viaje.combustibleRuta = gastado;
  estado.viaje.combustibleNecesario = necesario;
  estado.viaje.faltoCombustibleRuta = necesario > antes;

  registrar('viaje', `La ruta gastó ${gastado} kg de combustible (quedan ${estado.recursos.combustible} kg).`);
  return { antes, gastado, necesario, quedan: estado.recursos.combustible };
}

/** Elige N eventos al azar (sin repetir), según su probabilidad. */
function sortearEventos(cantidad) {
  const bolsa = [...EVENTOS];
  const elegidos = [];
  while (elegidos.length < cantidad && bolsa.length > 0) {
    const total = bolsa.reduce((s, e) => s + e.probabilidad, 0);
    let r = Math.random() * total;
    let indice = 0;
    for (let i = 0; i < bolsa.length; i++) {
      r -= bolsa[i].probabilidad;
      if (r <= 0) { indice = i; break; }
    }
    elegidos.push(bolsa.splice(indice, 1)[0]);
  }
  return elegidos;
}

/** Lista de eventos del viaje: los sorteados + los fijos del destino (ej. entrada en Marte). */
export function generarEventosViaje() {
  const ruta = rutaActual();
  const sorteados = sortearEventos(ruta.eventos);
  const fijos = EVENTOS_FIJOS.filter((e) => e.soloEn.includes(estado.destinoId));
  return [...sorteados, ...fijos];
}

/**
 * Resuelve un evento: si la nave tiene la protección, no pasa nada;
 * si no, aplica el daño a estado.recursos. Devuelve lo que ocurrió.
 */
export function resolverEvento(evento) {
  const mitigado = evento.mitigadoPor ? tieneEfecto(evento.mitigadoPor) : false;
  const perdidas = [];
  let texto = evento.textoMitigado;

  if (!mitigado) {
    texto = evento.textoDanio;
    for (const d of evento.danio) {
      perdidas.push(aplicarDanio(d));
    }
  }

  const resultado = {
    id: evento.id,
    nombre: evento.nombre,
    mitigado,
    mitigadoPor: evento.mitigadoPor,
    texto,
    explicacion: evento.explicacion,
    perdidas: perdidas.filter(Boolean)
  };
  estado.viaje.eventos.push(resultado);
  registrar('viaje', `${evento.nombre}: ${texto}`);
  return resultado;
}

/** Aplica un daño concreto a los recursos. Devuelve un texto corto con la pérdida. */
function aplicarDanio(danio) {
  const r = estado.recursos;
  const f = 1 - (danio.porcentaje || 0) / 100;

  switch (danio.tipo) {
    case 'combustible': {
      const antes = r.combustible;
      r.combustible = Math.round(r.combustible * f);
      return `-${antes - r.combustible} kg de combustible`;
    }
    case 'paneles':
      r.factorPaneles *= f;
      return `paneles al ${Math.round(r.factorPaneles * 100)}%`;
    case 'antena':
      r.factorAntena *= f;
      return `antena al ${Math.round(r.factorAntena * 100)}%`;
    case 'bateria':
      r.bateriaMax = Math.round(r.bateriaMax * f);
      return `batería máxima ${r.bateriaMax} E`;
    case 'instrumento': {
      const sanos = estado.nave.instrumentos.filter((i) => !r.instrumentosDanados.includes(i.id));
      if (sanos.length === 0) return null;
      const roto = sanos[Math.floor(Math.random() * sanos.length)];
      r.instrumentosDanados.push(roto.id);
      return `${roto.nombre} fuera de servicio`;
    }
    default:
      return null;
  }
}
