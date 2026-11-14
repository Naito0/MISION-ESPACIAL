// =============================================================
// FASE 4 — DISEÑO PUNTUAL: órbita (con diagrama 2D), cohete, lista final
// de equipos con masa, energía y costo, y aprobación de cada rol.
// El juego verifica que la masa y la órbita sean compatibles con el cohete
// y explica por qué no.
// =============================================================
import * as Phaser from 'phaser';
import { COHETES, ROLES, CONFIG, orbitasDe } from '../systems/datos.js';
import {
  estado, analizarDiseno, misionActual, destinoActual, esEquipo, puedeElegirOrbita,
  pasarTurno, textoTurno, anularAprobaciones, rolesDelJugadorActual
} from '../systems/estadoMision.js';
import { verificarCohete, calcularInsercion } from '../systems/lanzamiento.js';
import { guardarDiseno } from '../systems/almacenamiento.js';
import { COLORES, texto, titulo, panel, boton, estrellas, barraFases } from '../ui/ui.js';

const DIAGRAMA = { x: 220, y: 478, radioPlaneta: 42 };

export default class EscenaDisenoPuntual extends Phaser.Scene {
  constructor() {
    super('DisenoPuntual');
  }

  create() {
    estrellas(this, 60);
    barraFases(this, CONFIG.fases, 3);
    const mision = misionActual();
    const destino = destinoActual();
    titulo(this, 'Diseño puntual: órbita, cohete y diseño final', `${mision.nombre} · destino: ${destino.nombre}`);

    // ---- Órbitas ----
    texto(this, 20, 92, mision.aterriza ? 'Órbita de llegada (antes de descender)' : 'Órbita', { tam: 17, negrita: true });
    this.orbitas = orbitasDe(mision);
    this.botonesOrbita = this.orbitas.map((o, i) =>
      boton(this, 220, 150 + i * 78, 400, 70, '', () => this.elegirOrbita(o.id), {
        tam: 12, alPasar: () => this.textoExplicacion.setText(`${o.nombre}: ${o.explicacion}`)
      })
    );

    // ---- Diagrama 2D de la órbita ----
    const colorPlaneta = parseInt(destino.color.replace('#', ''), 16);
    this.add.circle(DIAGRAMA.x, DIAGRAMA.y, DIAGRAMA.radioPlaneta, colorPlaneta);
    this.graficoOrbita = this.add.graphics();
    this.satelite = this.add.circle(0, 0, 5, 0xffffff);
    this.anguloSatelite = 0;
    texto(this, DIAGRAMA.x, DIAGRAMA.y + 131, 'Diagrama aproximado (distancias no a escala)', {
      tam: 11, origen: [0.5, 0], color: COLORES.textoSuave
    });
    this.textoExplicacion = texto(this, 20, 626, '', { tam: 12, ancho: 400, color: COLORES.textoSuave });

    // ---- Cohetes ----
    texto(this, 440, 92, 'Cohete', { tam: 17, negrita: true });
    this.botonesCohete = COHETES.map((c, i) =>
      boton(this, 640, 140 + i * 66, 400, 58, '', () => this.elegirCohete(c.id), { tam: 12 })
    );

    // ---- Lista final de equipos ----
    texto(this, 440, 405, 'Lista de equipos', { tam: 15, negrita: true, color: COLORES.acento });
    this.textoEquipos = texto(this, 440, 428, '', { tam: 11, ancho: 400 });

    // ---- Resumen y problemas ----
    panel(this, 860, 88, 405, 520);
    texto(this, 875, 95, 'Resumen', { tam: 18, negrita: true, color: COLORES.acento });
    this.textoResumen = texto(this, 875, 122, '', { tam: 13, ancho: 375 });
    this.textoProblemas = texto(this, 875, 300, '', { tam: 13, ancho: 375 });

    // ---- Aprobaciones (modo equipo) ----
    this.textoTurno = texto(this, 440, 630, '', { tam: 13, ancho: 400, color: COLORES.aviso });
    this.botonesAprobar = [];
    if (esEquipo()) {
      texto(this, 875, 470, 'Aprobar diseño (cada rol, en su turno):', { tam: 13, negrita: true });
      this.botonesAprobar = ROLES.map((r, i) =>
        boton(this, 970 + (i % 2) * 190, 515 + Math.floor(i / 2) * 50, 182, 44, '', () => this.aprobar(r.id), { tam: 12 })
      );
    }

    // ---- Botones inferiores ----
    boton(this, 950, 640, 170, 40, '◀ Compensaciones', () => this.scene.start('Diseno'), { tam: 14 });
    if (esEquipo()) {
      boton(this, 1160, 640, 190, 40, 'Pasar turno ▶', () => { pasarTurno(); this.actualizar(); }, { tam: 15 });
    }
    this.botonLanzar = boton(this, 1060, 690, 390, 46, '¡Aprobado: a lanzar! 🚀', () => this.lanzar(), { tam: 19 });
    // Probar la misma nave en otros destinos (simulación rápida y tabla comparativa)
    this.botonDestinos = boton(this, 640, 693, 400, 40, '🌍 Probar en otros destinos', () => this.scene.start('ComparacionDestinos'), { tam: 16 });

    this.actualizar();
    const o = this.orbitas.find((x) => x.id === estado.orbitaId);
    if (o) this.textoExplicacion.setText(`${o.nombre}: ${o.explicacion}`);
  }

  /** Radio del dibujo de la órbita (escala logarítmica para que entren todas). */
  radioOrbita(orbita) {
    const r = DIAGRAMA.radioPlaneta;
    return r + 12 + 75 * Math.log10(1 + orbita.altitudKm / 100) / Math.log10(1 + 36000 / 100);
  }

  dibujarOrbita(orbita) {
    const g = this.graficoOrbita;
    g.clear();
    // Las otras órbitas, tenues
    for (const o of this.orbitas) {
      g.lineStyle(1, 0x3a4a7a, 0.6);
      g.strokeCircle(DIAGRAMA.x, DIAGRAMA.y, this.radioOrbita(o));
    }
    // La órbita elegida, resaltada
    g.lineStyle(2, 0x7cc4ff, 1);
    g.strokeCircle(DIAGRAMA.x, DIAGRAMA.y, this.radioOrbita(orbita));
    // Zona de sombra (eclipse): sector oscuro detrás del planeta
    g.fillStyle(0x000000, 0.35);
    g.slice(DIAGRAMA.x, DIAGRAMA.y, this.radioOrbita(orbita) + 6,
      Math.PI - orbita.eclipse * Math.PI, Math.PI + orbita.eclipse * Math.PI, false);
    g.fillPath();
    // Si la misión aterriza: flecha de descenso
    if (misionActual().aterriza) {
      g.lineStyle(2, 0xffd166, 1);
      g.lineBetween(DIAGRAMA.x + this.radioOrbita(orbita), DIAGRAMA.y, DIAGRAMA.x + DIAGRAMA.radioPlaneta + 2, DIAGRAMA.y);
    }
    this.radioActual = this.radioOrbita(orbita);
  }

  update(_t, delta) {
    // El satélite da vueltas: más rápido en órbitas bajas
    if (!this.radioActual) return;
    this.anguloSatelite += (delta / 1000) * (120 / this.radioActual);
    this.satelite.setPosition(
      DIAGRAMA.x + Math.cos(this.anguloSatelite) * this.radioActual,
      DIAGRAMA.y + Math.sin(this.anguloSatelite) * this.radioActual
    );
  }

  elegirOrbita(id) {
    if (!puedeElegirOrbita()) return;
    estado.orbitaId = id;
    anularAprobaciones();
    this.actualizar();
  }

  elegirCohete(id) {
    if (!puedeElegirOrbita()) return;
    estado.coheteId = id;
    anularAprobaciones();
    this.actualizar();
  }

  aprobar(rolId) {
    estado.aprobaciones[rolId] = !estado.aprobaciones[rolId];
    this.actualizar();
  }

  /** Revisa todo lo que impide lanzar. Devuelve { bloqueos, avisos, insercion }. */
  revisar(a) {
    const bloqueos = [];
    const avisos = [];
    if (a.diseno.faltantes.length) bloqueos.push(`Falta elegir: ${a.diseno.faltantes.join(', ')}.`);
    if (!estado.coheteId) bloqueos.push('Elige un cohete.');
    else {
      const v = verificarCohete(a.cohete, a.orbita, a.diseno.masaTotal);
      if (!v.ok) bloqueos.push(`${a.cohete.nombre}: ${v.motivo}`);
    }
    if (!a.coheteBarato) bloqueos.push(`Ningún cohete puede llevar ${a.diseno.masaTotal} kg a ${a.orbita.nombre}. Quita masa o elige otra órbita.`);
    const tope = Math.round(estado.presupuesto * (1 + CONFIG.presupuesto.sobrecostoMaximo) * 10) / 10;
    if (a.costoTotal > tope) bloqueos.push(`Cuesta ${a.costoTotal} M$: la agencia no aprueba más de ${tope} M$.`);
    else if (a.costoTotal > estado.presupuesto) avisos.push(`Te pasas ${Math.round((a.costoTotal - estado.presupuesto) * 10) / 10} M$ del presupuesto (se permite, pero baja el puntaje).`);
    if (esEquipo()) {
      const faltan = ROLES.filter((r) => !estado.aprobaciones[r.id]).map((r) => r.abreviatura);
      if (faltan.length) bloqueos.push(`Falta la aprobación de: ${faltan.join(', ')}.`);
    }
    const ins = calcularInsercion(a.diseno.masaTotal, a.diseno.combustible, a.orbita);
    if (!ins.ok) avisos.push(`El combustible no alcanza para entrar en esta órbita: necesitas ${ins.necesario} kg y tienes ${a.diseno.combustible} kg.`);
    a.barras.filter((b) => b.nivel === 'rojo' && b.id !== 'presupuesto').forEach((b) => avisos.push(`${b.nombre}: ${b.ayuda}`));
    return { bloqueos, avisos, insercion: ins };
  }

  actualizar() {
    const a = analizarDiseno();
    const editable = puedeElegirOrbita();

    // Órbitas
    this.orbitas.forEach((o, i) => {
      const comb = Math.round(a.diseno.masaTotal * o.factorCombustible);
      this.botonesOrbita[i].setTexto(
        `${o.nombre}\nDetalle ×${o.factorDatos} · contacto ${Math.round(o.contacto * 100)}% · vida ×${o.factorVida} · sombra ${Math.round(o.eclipse * 100)}%\n` +
        `Combustible para entrar: ${comb} kg (tienes ${a.diseno.combustible})`
      );
      this.botonesOrbita[i].setSeleccionado(o.id === estado.orbitaId);
      this.botonesOrbita[i].setHabilitado(editable);
    });
    this.dibujarOrbita(a.orbita);

    // Cohetes
    COHETES.forEach((c, i) => {
      const v = verificarCohete(c, a.orbita, a.diseno.masaTotal);
      this.botonesCohete[i].setTexto(`${c.nombre} — ${c.costo} M$\n${v.ok ? '✔' : '✖'} ${v.motivo}`);
      this.botonesCohete[i].setSeleccionado(c.id === estado.coheteId);
      this.botonesCohete[i].setHabilitado(editable);
    });

    // Lista de equipos
    this.textoEquipos.setText(a.diseno.componentes.map((c) => {
      const e = c.energia ? ` · ${c.energia > 0 ? '+' : ''}${c.energia} W` : '';
      return `• ${c.nombre} — ${c.costo} M$ · ${c.masa} kg${e}${c.confiabilidad === 'nuevo' ? ' · ⚠ nuevo' : ''}`;
    }).join('\n'));

    // Resumen
    const r = this.revisar(a);
    this.textoResumen.setText(
      `Masa: ${a.diseno.masaSeca} kg + ${a.diseno.combustible} kg de combustible = ${a.diseno.masaTotal} kg\n` +
      `Energía: genera ${Math.round(a.operativo.generacionMedia * 10) / 10} W, consume ${Math.round(a.diseno.consumo * 10) / 10} W\n` +
      `Costo: componentes ${a.diseno.costoComponentes} + cohete ${estado.coheteId ? a.costoCohete : '—'}` +
      (a.retraso ? ` + retraso ${a.retraso}` : '') + ` = ${a.costoTotal} de ${estado.presupuesto} M$\n` +
      `Datos: genera ${a.operativo.datosGeneradosDia.toFixed(2)} / envía ${a.operativo.capacidadEnvioDia.toFixed(2)} GB/día\n` +
      `Vida esperada: ${a.vidaEsperada} meses (se piden ${a.mision.requisitos.vidaMinMeses})\n` +
      `Riesgo de falla: ${Math.round(a.diseno.riesgo * 100)}% · Valor científico: ${a.valorMes.toFixed(1)}/mes` +
      (a.soporte ? `\nSoporte vital: lleva ${a.soporte.disponible} de ${a.soporte.necesario} días-persona necesarios` : '')
    );
    this.textoProblemas.setText(
      [...r.bloqueos.map((t) => `✖ ${t}`), ...r.avisos.map((t) => `⚠ ${t}`)].slice(0, 6).join('\n') || '✔ ¡Todo listo para lanzar!'
    );
    this.textoProblemas.setColor(r.bloqueos.length ? COLORES.mal : r.avisos.length ? COLORES.aviso : COLORES.bien);

    // Turno y aprobaciones
    if (esEquipo()) {
      const misRoles = rolesDelJugadorActual().map((x) => x.id);
      this.textoTurno.setText(`${textoTurno()}. ${editable ? 'Tú eliges órbita y cohete.' : 'La órbita y el cohete los elige el Comandante / Piloto.'}`);
      ROLES.forEach((rol, i) => {
        const meta = a.metas.find((m) => m.rolId === rol.id);
        const b = this.botonesAprobar[i];
        b.setTexto(`${estado.aprobaciones[rol.id] ? '✔ Aprobado' : 'Aprobar'} · ${rol.abreviatura}\nmeta ${meta.ok ? 'cumplida' : 'NO cumplida'}`);
        b.setSeleccionado(!!estado.aprobaciones[rol.id]);
        b.setHabilitado(misRoles.includes(rol.id));
      });
    }

    this.botonLanzar.setHabilitado(r.bloqueos.length === 0);
    this.botonDestinos.setHabilitado(a.diseno.faltantes.length === 0);
  }

  lanzar() {
    const a = analizarDiseno();
    const r = this.revisar(a);
    if (r.bloqueos.length) return;

    // Guardamos todo lo decidido: el informe lo usa para explicar el resultado
    estado.lanzamiento = {
      masaTotal: a.diseno.masaTotal,
      costoComponentes: a.diseno.costoComponentes,
      costoCohete: a.costoCohete,
      costoRetraso: a.retraso,
      costoTotal: a.costoTotal,
      mesesDesarrollo: a.diseno.mesesDesarrollo,
      insercion: r.insercion,
      margenes: a.margenes,
      vidaEsperada: a.vidaEsperada,
      operativo: a.operativo,
      valorMes: a.valorMes,
      riesgo: a.diseno.riesgo,
      metas: a.metas,
      coheteBaratoId: a.coheteBarato ? a.coheteBarato.id : null
    };
    guardarDiseno(estado.misionId, {
      seleccion: JSON.parse(JSON.stringify(estado.seleccion)),
      orbitaId: estado.orbitaId,
      coheteId: estado.coheteId
    });
    this.scene.start('Lanzamiento');
  }
}
