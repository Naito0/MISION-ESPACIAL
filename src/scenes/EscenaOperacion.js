// =============================================================
// ESCENA 6 — OPERACIÓN en la superficie (por turnos).
// Cada turno: los paneles cargan la batería y la nave gasta su consumo fijo.
// El jugador decide qué instrumentos usar (gastan energía y llenan la memoria)
// y cuándo transmitir (la antena define cuántos datos llegan a la Tierra).
// Guarda en el estado: operacion (datos generados, transmitidos, perdidos...).
// =============================================================
import * as Phaser from 'phaser';
import { CONFIG, NAVE_BASE } from '../systems/datos.js';
import { estado, destinoActual, misionActual, balanceEnergia, registrar } from '../systems/estadoMision.js';
import { ANCHO, COLORES, texto, titulo, panel, boton, estrellas } from '../ui/ui.js';

export default class EscenaOperacion extends Phaser.Scene {
  constructor() {
    super('Operacion');
  }

  create() {
    estrellas(this, 50);
    const destino = destinoActual();
    const mision = misionActual();
    const nave = estado.nave;
    const r = estado.recursos;
    titulo(this, `Operación en ${destino.nombre}`, `Paso 6 de 7 — ${mision.objetivo}`);

    // ---- Valores reales después de los daños del viaje ----
    const energia = balanceEnergia(nave, nave.efectos, r.factorPaneles);
    this.op = {
      turno: 1,
      turnosTotales: CONFIG.operacion.turnos,
      bateria: r.bateriaMax,               // empieza cargada
      bateriaMax: r.bateriaMax,
      generacionPorTurno: energia.generacion,
      consumoFijo: energia.consumoFijo,
      tasaTransmision: Math.max(1, Math.round(nave.tasaAntena * r.factorAntena * destino.juego.factorComunicacion)),
      memoria: [],                          // cola de paquetes { id, cantidad }
      memoriaMax: NAVE_BASE.memoriaDatos,
      datosGenerados: {},
      datosTransmitidos: {},
      datosPerdidosMemoria: 0,
      datosSinTransmitir: 0,
      transmisiones: 0,
      turnosSinEnergia: 0,
      energiaDesperdiciada: 0,
      usadosEsteTurno: [],
      transmisionesEsteTurno: 0,
      modoSeguro: false
    };
    nave.instrumentos.forEach((i) => {
      this.op.datosGenerados[i.id] = 0;
      this.op.datosTransmitidos[i.id] = 0;
    });

    // ---- Panel de estado (izquierda) ----
    panel(this, 20, 95, 400, 400);
    this.textoEstado = texto(this, 35, 105, '', { tam: 16, ancho: 370 });
    this.add.rectangle(35, 470, 370, 18, 0x333a4d).setOrigin(0, 0.5);
    this.barraEnergia = this.add.rectangle(35, 470, 370, 18, 0xffd166).setOrigin(0, 0.5);

    // ---- Botones de acciones (centro) ----
    texto(this, 450, 100, 'Acciones de este turno', { tam: 20, negrita: true });
    this.botonesInst = {};
    nave.instrumentos.forEach((inst, i) => {
      const req = inst.id === mision.instrumentoRequerido ? '★ ' : '';
      this.botonesInst[inst.id] = boton(this, 620, 160 + i * 62, 340, 52,
        `${req}Usar ${inst.nombre}\n+${inst.datos} datos · -${inst.energia} E`,
        () => this.usarInstrumento(inst), { tam: 15 });
    });
    const yTx = 160 + nave.instrumentos.length * 62 + 10;
    this.botonTransmitir = boton(this, 620, yTx, 340, 52,
      `📡 Transmitir a la Tierra\nhasta ${this.op.tasaTransmision} datos · -${nave.energiaAntena} E`,
      () => this.transmitir(), { tam: 15 });
    this.botonTurno = boton(this, 620, 660, 340, 52, 'Terminar turno ▶', () => this.terminarTurno(), { tam: 18 });

    // ---- Bitácora (derecha) ----
    panel(this, 810, 95, 450, 590);
    texto(this, 825, 105, 'Bitácora', { tam: 20, negrita: true, color: COLORES.acento });
    this.lineasLog = [];
    this.textoLog = texto(this, 825, 140, '', { tam: 14, ancho: 420, color: COLORES.texto });

    this.log(`Llegaste con la batería en ${this.op.bateria} E.`);
    this.log(`Cada turno: paneles +${this.op.generacionPorTurno} E, computadora y calefacción -${this.op.consumoFijo} E.`);
    if (r.instrumentosDanados.length) {
      this.log(`Instrumentos dañados en el viaje: ${r.instrumentosDanados.length}.`);
    }
    this.actualizar();
  }

  log(linea) {
    this.lineasLog.push(`T${this.op.turno}: ${linea}`);
    if (this.lineasLog.length > 18) this.lineasLog.shift();
    this.textoLog.setText(this.lineasLog.join('\n'));
  }

  datosEnMemoria() {
    return this.op.memoria.reduce((s, p) => s + p.cantidad, 0);
  }

  usarInstrumento(inst) {
    const op = this.op;
    op.bateria -= inst.energia;
    op.usadosEsteTurno.push(inst.id);
    op.datosGenerados[inst.id] += inst.datos;

    // Si la memoria se llena, los datos que no caben se pierden
    const libre = op.memoriaMax - this.datosEnMemoria();
    const guardados = Math.min(libre, inst.datos);
    const perdidos = inst.datos - guardados;
    if (guardados > 0) op.memoria.push({ id: inst.id, cantidad: guardados });
    op.datosPerdidosMemoria += perdidos;
    this.log(`${inst.nombre}: +${guardados} datos en memoria` + (perdidos ? ` (${perdidos} perdidos: memoria llena)` : '') + '.');
    this.actualizar();
  }

  transmitir() {
    const op = this.op;
    op.bateria -= estado.nave.energiaAntena;
    op.transmisionesEsteTurno++;
    op.transmisiones++;

    // Se envían los datos en el orden en que se generaron (cola)
    let capacidad = op.tasaTransmision;
    let enviados = 0;
    while (capacidad > 0 && op.memoria.length > 0) {
      const paquete = op.memoria[0];
      const n = Math.min(capacidad, paquete.cantidad);
      paquete.cantidad -= n;
      capacidad -= n;
      enviados += n;
      op.datosTransmitidos[paquete.id] += n;
      if (paquete.cantidad === 0) op.memoria.shift();
    }
    this.log(`Transmisión: llegaron ${enviados} datos a la Tierra.`);
    this.actualizar();
  }

  terminarTurno() {
    const op = this.op;
    if (op.turno >= op.turnosTotales) {
      this.finalizar();
      return;
    }
    op.turno++;
    op.usadosEsteTurno = [];
    op.transmisionesEsteTurno = 0;

    // Balance de energía del nuevo turno
    let bateria = op.bateria + op.generacionPorTurno - op.consumoFijo;
    if (bateria > op.bateriaMax) {
      op.energiaDesperdiciada += bateria - op.bateriaMax;
      bateria = op.bateriaMax;
    }
    if (bateria < 0) {
      // Sin energía: la nave entra en modo seguro y pierde el turno
      bateria = 0;
      op.modoSeguro = true;
      op.turnosSinEnergia++;
      this.log('⚠ ¡Sin energía! Modo seguro: este turno no se puede hacer nada.');
    } else {
      op.modoSeguro = false;
      this.log(`Nuevo turno. Batería: ${Math.round(bateria)} E.`);
    }
    op.bateria = bateria;
    this.actualizar();
  }

  actualizar() {
    const op = this.op;
    const mision = misionActual();
    const req = mision.instrumentoRequerido;
    const danados = estado.recursos.instrumentosDanados;

    // Habilitar o no cada acción
    estado.nave.instrumentos.forEach((inst) => {
      const b = this.botonesInst[inst.id];
      if (danados.includes(inst.id)) {
        b.setTexto(`${inst.nombre}\n(dañado en el viaje)`);
        b.setHabilitado(false);
        return;
      }
      b.setHabilitado(!op.modoSeguro && !op.usadosEsteTurno.includes(inst.id) && op.bateria >= inst.energia);
    });
    this.botonTransmitir.setHabilitado(
      !op.modoSeguro &&
      op.transmisionesEsteTurno < CONFIG.operacion.transmisionesPorTurno &&
      op.bateria >= estado.nave.energiaAntena &&
      this.datosEnMemoria() > 0
    );
    this.botonTurno.setTexto(op.turno >= op.turnosTotales ? 'Terminar misión ▶' : 'Terminar turno ▶');

    const totalTx = Object.values(op.datosTransmitidos).reduce((s, n) => s + n, 0);
    const objetivoTx = op.datosTransmitidos[req] || 0;
    this.textoEstado.setText(
      `Turno ${op.turno} de ${op.turnosTotales}\n\n` +
      `Batería: ${Math.round(op.bateria)} / ${op.bateriaMax} E\n` +
      `Por turno: +${op.generacionPorTurno} E (paneles) −${op.consumoFijo} E (fijo)\n\n` +
      `Memoria: ${this.datosEnMemoria()} / ${op.memoriaMax} datos\n` +
      `Datos en la Tierra: ${totalTx}\n` +
      `Antena: ${op.tasaTransmision} datos por transmisión\n\n` +
      `OBJETIVO: ${objetivoTx} / ${mision.datosObjetivo} datos del instrumento ★\n` +
      (objetivoTx >= mision.datosObjetivo ? '✔ ¡Objetivo cumplido!' : '') +
      (op.modoSeguro ? '\n\n⚠ MODO SEGURO (sin energía)' : '')
    );
    this.barraEnergia.scaleX = op.bateriaMax > 0 ? Math.max(0, op.bateria / op.bateriaMax) : 0;
  }

  finalizar() {
    const op = this.op;
    op.datosSinTransmitir = this.datosEnMemoria();
    estado.operacion = {
      turnos: op.turnosTotales,
      turnosSinEnergia: op.turnosSinEnergia,
      generacionPorTurno: op.generacionPorTurno,
      consumoFijo: op.consumoFijo,
      tasaTransmision: op.tasaTransmision,
      memoriaMax: op.memoriaMax,
      datosGenerados: op.datosGenerados,
      datosTransmitidos: op.datosTransmitidos,
      datosPerdidosMemoria: op.datosPerdidosMemoria,
      datosSinTransmitir: op.datosSinTransmitir,
      transmisiones: op.transmisiones,
      energiaDesperdiciada: Math.round(op.energiaDesperdiciada)
    };
    registrar('operacion', `Operación terminada: ${op.transmisiones} transmisiones.`);
    this.scene.start('Resultados');
  }
}
