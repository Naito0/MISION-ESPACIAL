// =============================================================
// FASE 6 — OPERACIÓN: simulación en tiempo acelerado (mes a mes) con
// una línea de tiempo visual de los eventos de la misión.
// Los cálculos los hace la función pura simularMision(); esta escena
// solo reproduce el resultado con animaciones.
// =============================================================
import * as Phaser from 'phaser';
import { CONFIG, EVENTOS } from '../systems/datos.js';
import { estado, analizarDiseno, misionActual, destinoActual, orbitaActual, nivel } from '../systems/estadoMision.js';
import { sortearEventos } from '../systems/eventos.js';
import { simularMision } from '../systems/simulacion.js';
import { aplicarDaniosAlDiseno } from '../systems/averias.js';
import { crearEnlaceDatos } from '../efectos/enlaceDatos.js';
import { ANCHO, COLORES, texto, titulo, panel, boton, barra, ventana, estrellas, barraFases } from '../ui/ui.js';

const LINEA = { x0: 60, x1: 1220, y: 610 };
const PLANETA = { x: 300, y: 330, r: 90 };

export default class EscenaSimulacion extends Phaser.Scene {
  constructor() {
    super('Simulacion');
  }

  create() {
    estrellas(this, 100);
    barraFases(this, CONFIG.fases, 5);
    const mision = misionActual();
    const destino = destinoActual();
    titulo(this, 'Operación de la misión', `${mision.nombre} · ${mision.duracionMeses} meses en tiempo acelerado`);

    // ---- Simulación (una sola vez por intento) ----
    if (!estado.simulacion) {
      const a = analizarDiseno();
      const eventos = sortearEventos(EVENTOS, nivel().eventos, mision.duracionMeses, a.diseno.riesgo, CONFIG.riesgo.multiplicadorFallas);
      estado.simulacion = simularMision({
        diseno: aplicarDaniosAlDiseno(a.diseno, estado.viaje), // las averías no reparadas del viaje cuentan
        ambiente: a.ambiente, vidaEsperada: a.vidaEsperada,
        duracionMeses: mision.duracionMeses, eventos, insercionOk: estado.lanzamiento.insercion.ok,
        objetivos: mision.objetivos, diasPorMes: CONFIG.simulacion.diasPorMes
      });
    }
    this.sim = estado.simulacion;

    // ---- Dibujo: planeta y nave ----
    this.add.circle(PLANETA.x, PLANETA.y, PLANETA.r, parseInt(destino.color.replace('#', ''), 16));
    if (mision.aterriza) {
      this.nave = this.add.rectangle(PLANETA.x, PLANETA.y - PLANETA.r - 6, 14, 12, 0xffffff);
      texto(this, PLANETA.x, PLANETA.y + PLANETA.r + 12, `En la superficie de ${destino.nombre}`, { tam: 14, origen: [0.5, 0], color: COLORES.textoSuave });
    } else {
      const rOrbita = PLANETA.r + 45;
      this.add.circle(PLANETA.x, PLANETA.y, rOrbita).setStrokeStyle(1, 0x7cc4ff, 0.6);
      this.nave = this.add.rectangle(0, 0, 12, 8, 0xffffff);
      this.anguloNave = 0;
      this.rOrbita = rOrbita;
      texto(this, PLANETA.x, PLANETA.y + rOrbita + 10, orbitaActual().nombre, { tam: 14, origen: [0.5, 0], color: COLORES.textoSuave });
    }

    // ---- Estaciones terrenas y paquetes de datos (ver efectos/enlaceDatos.js) ----
    const analisis = analizarDiseno();
    const f = analisis.diseno.factorEstaciones;
    this.enlace = crearEnlaceDatos(this, {
      planeta: PLANETA,
      esTierra: mision.destino === 'tierra',
      cantidadEstaciones: f <= 0.6 ? 1 : f <= 1.0 ? 3 : 5,
      enlaceOk: analisis.operativo.enlaceOk
    });

    // ---- Panel de estado (derecha) ----
    panel(this, 560, 95, 700, 440);
    this.textoMes = texto(this, 580, 105, '', { tam: 22, negrita: true, color: COLORES.acento });
    this.textoEstado = texto(this, 580, 145, '', { tam: 15, ancho: 660 });
    texto(this, 580, 330, 'Energía disponible para los instrumentos', { tam: 13 });
    this.barraEnergia = barra(this, 580, 350, 640, 12);
    texto(this, 580, 372, 'Vida útil restante', { tam: 13 });
    this.barraVida = barra(this, 580, 392, 640, 12);
    this.textosObjetivo = mision.objetivos.map((o, i) => ({
      etiqueta: texto(this, 580, 414 + i * 44, '', { tam: 13 }),
      barra: barra(this, 580, 434 + i * 44, 640, 10)
    }));

    // ---- Línea de tiempo con los eventos ----
    this.dibujarLineaDeTiempo(mision.duracionMeses);

    // ---- Botones ----
    this.botonSaltar = boton(this, 420, 680, 220, 44, 'Saltar al final ⏭', () => this.saltar(), { tam: 16 });
    this.botonInforme = boton(this, 1100, 680, 260, 48, 'Ver informe ▶', () => this.scene.start('Informe'), { tam: 18 });
    this.botonInforme.setHabilitado(false);

    // ---- Reproducción ----
    this.indice = 0;
    this.pausado = false;
    this.terminado = false;
    this.acumulado = { generados: 0, enviados: 0, perdidos: 0, valor: 0 };
    this.vidaInicial = estado.lanzamiento.vidaEsperada;

    if (this.sim.pasos.length === 0) {
      this.mostrarEstadoFinal();
      ventana(this, {
        tituloTexto: 'La nave no llegó a operar',
        cuerpo: `Para entrar en ${orbitaActual().nombre} hacían falta ${estado.lanzamiento.insercion.necesario} kg de combustible ` +
          `y solo había ${Math.round(estado.lanzamiento.insercion.disponible * 10) / 10} kg. Revisa el informe para ver qué cambiar.`,
        colorFondo: 0x3a1620, colorTitulo: COLORES.mal, textoBoton: 'Ver informe', alCerrar: () => this.scene.start('Informe')
      });
      return;
    }
    this.temporizador = this.time.addEvent({ delay: CONFIG.simulacion.msPorMes, loop: true, callback: () => this.avanzar() });
  }

  dibujarLineaDeTiempo(meses) {
    const { x0, x1, y } = LINEA;
    texto(this, x0, y - 70, 'Línea de tiempo de la misión', { tam: 14, negrita: true });
    this.add.rectangle(x0, y, x1 - x0, 8, 0x2a3150).setOrigin(0, 0.5);
    this.progreso = this.add.rectangle(x0, y, x1 - x0, 8, 0x3d77d8).setOrigin(0, 0.5);
    this.progreso.scaleX = 0;
    const paso = (x1 - x0) / meses;
    const cadaCuanto = meses > 12 ? 6 : 1;
    for (let m = 0; m <= meses; m += cadaCuanto) {
      this.add.rectangle(x0 + m * paso, y + 8, 2, 8, 0x9aa6c8);
      texto(this, x0 + m * paso, y + 14, `${m}`, { tam: 11, origen: [0.5, 0], color: COLORES.textoSuave });
    }
    texto(this, x1, y + 28, 'meses', { tam: 11, origen: [1, 0], color: COLORES.textoSuave });

    // Marcas de los eventos (grises hasta que ocurren)
    this.marcas = [];
    const eventos = this.sim.resumen.eventos;
    eventos.forEach((ev, i) => {
      const x = x0 + (ev.mes - 0.5) * paso;
      const marca = this.add.circle(x, y, 8, 0x666c80).setStrokeStyle(2, 0xffffff);
      const etiqueta = texto(this, x, y - 30 - (i % 2) * 14, `${ev.nombre}`, { tam: 11, origen: [0.5, 0], color: COLORES.textoSuave });
      this.marcas.push({ ev, marca, etiqueta });
    });
  }

  update(_t, delta) {
    if (this.rOrbita && !this.terminado) {
      this.anguloNave += delta / 600;
      this.nave.setPosition(PLANETA.x + Math.cos(this.anguloNave) * this.rOrbita, PLANETA.y + Math.sin(this.anguloNave) * this.rOrbita);
    }
    // Paquetes de datos hacia las estaciones (solo mientras la misión está operando)
    const operando = !this.terminado && !this.pausado && this.sim.pasos.length > 0;
    this.enlace.actualizar(delta, { x: this.nave.x, y: this.nave.y }, this.rOrbita ? this.anguloNave : null, operando);
  }

  avanzar() {
    if (this.pausado || this.terminado) return;
    const paso = this.sim.pasos[this.indice];
    if (!paso) {
      this.finalizar();
      return;
    }
    this.indice++;
    this.mostrarPaso(paso);

    // Eventos de este mes: pausa y ventana
    if (paso.eventos.length) {
      this.pausado = true;
      this.mostrarEventos([...paso.eventos], () => {
        this.pausado = false;
        if (!paso.vivo) this.finalizar();
      });
    } else if (!paso.vivo) {
      this.finalizar();
    }
  }

  mostrarEventos(lista, alTerminar) {
    const ev = lista.shift();
    if (!ev) {
      alTerminar();
      return;
    }
    const titular = ev.mitigado ? '✔ Sin daños: ' : '✖ ';
    ventana(this, {
      tituloTexto: `Mes ${ev.mes} · ${ev.nombre}${ev.esFalla ? ' (falla interna)' : ''}`,
      cuerpo: `${ev.descripcion}\n\n${titular}${ev.texto}\n\n${ev.explicacion}`,
      colorFondo: ev.mitigado ? 0x15361f : 0x3a1620,
      colorTitulo: ev.mitigado ? COLORES.bien : COLORES.mal,
      alCerrar: () => this.mostrarEventos(lista, alTerminar)
    });
  }

  mostrarPaso(paso) {
    const mision = misionActual();
    const meses = mision.duracionMeses;
    this.progreso.scaleX = paso.mes / meses;
    this.marcas.filter((m) => m.ev.mes <= paso.mes).forEach((m) => {
      m.marca.setFillStyle(m.ev.mitigado ? 0x3cc46e : 0xe5484d);
      m.etiqueta.setColor(m.ev.mitigado ? COLORES.bien : COLORES.mal);
    });
    if (!paso.vivo) {
      this.textoMes.setText(`Mes ${paso.mes}: la nave dejó de funcionar`);
      this.textoMes.setColor(COLORES.mal);
      return;
    }
    const ac = paso.acumulado;
    const r1 = (x) => Math.round(x * 10) / 10;
    this.textoMes.setText(`Mes ${paso.mes} de ${meses}`);
    this.textoEstado.setText(
      `Instrumentos funcionando: ${Math.round(paso.fraccionOperacion * 100)}% del tiempo\n` +
      `Datos generados: ${r1(ac.generados)} GB\n` +
      `Datos que llegaron a la Tierra: ${r1(ac.enviados)} GB (meta: ${mision.requisitos.datosMinimosGB} GB)\n` +
      `Datos perdidos: ${r1(ac.perdidos + ac.borrados)} GB · En memoria esperando: ${r1(paso.buffer)} GB\n` +
      `Valor científico acumulado: ${Math.round(ac.valor)}\n` +
      `Vida útil restante: ~${Math.max(0, Math.round(paso.vidaRestante))} meses`
    );
    this.barraEnergia.actualizar(paso.fraccionOperacion, paso.fraccionOperacion >= 0.9 ? 'verde' : paso.fraccionOperacion >= 0.6 ? 'amarillo' : 'rojo');
    const vida = this.vidaInicial > 0 ? paso.vidaRestante / this.vidaInicial : 0;
    this.barraVida.actualizar(vida, vida > 0.3 ? 'verde' : 'amarillo');
    this.actualizarObjetivos(paso.mes / meses);
  }

  /** Progreso de cada objetivo (estimado de forma proporcional hasta el final). */
  actualizarObjetivos(fraccionTiempo) {
    const mision = misionActual();
    const final = this.sim.resumen.valorObjetivos;
    mision.objetivos.forEach((o, i) => {
      const v = (final[o.id] || 0) * fraccionTiempo;
      const t = this.textosObjetivo[i];
      t.etiqueta.setText(`Objetivo "${o.nombre}": ${Math.round(v)} de ${o.valorMinimo}`);
      t.barra.actualizar(v / o.valorMinimo, v >= o.valorMinimo ? 'verde' : 'amarillo');
    });
  }

  saltar() {
    // Sin ventanas: los eventos se ven igual en la línea de tiempo y en el informe
    this.pausado = true;
    const ultimo = this.sim.pasos[this.sim.pasos.length - 1];
    this.indice = this.sim.pasos.length;
    if (ultimo) this.mostrarPaso(ultimo);
    this.finalizar();
  }

  finalizar() {
    if (this.terminado) return;
    this.terminado = true;
    if (this.temporizador) this.temporizador.remove();
    this.mostrarEstadoFinal();
  }

  mostrarEstadoFinal() {
    const r = this.sim.resumen;
    const pasoFinal = this.sim.pasos[this.sim.pasos.length - 1];
    if (pasoFinal && pasoFinal.vivo) this.actualizarObjetivos(1);
    const texto2 = r.murioPor === 'insercion' ? 'La nave no entró en órbita.'
      : r.murioPor === 'vida' ? `Misión terminada antes de tiempo: funcionó ${r.mesesOperativos} meses.`
        : `¡Misión completada! Funcionó los ${r.mesesOperativos} meses.`;
    texto(this, 580, 500, texto2, { tam: 16, negrita: true, color: r.murioPor ? COLORES.mal : COLORES.bien });
    this.botonSaltar.setHabilitado(false);
    this.botonInforme.setHabilitado(true);
  }
}
