// =============================================================
// FASE 6 — INFORME DE MISIÓN: puntaje por categorías, requisitos,
// causas y efectos, comparación con el intento anterior y
// "Misiones reales parecidas a la tuya". Botón "Rediseñar".
// =============================================================
import * as Phaser from 'phaser';
import { CONFIG, MISIONES_REALES, buscarCohete } from '../systems/datos.js';
import {
  estado, analizarDiseno, misionActual, destinoActual, orbitaActual, coheteActual, esEquipo, nivel, nuevoIntento
} from '../systems/estadoMision.js';
import { evaluarRequisitos, calcularPuntaje } from '../systems/puntaje.js';
import { generarExplicaciones, misionesParecidas } from '../systems/informe.js';
import { guardarRecord } from '../systems/almacenamiento.js';
import { ANCHO, COLORES, texto, titulo, panel, boton, barra, estrellas, barraFases } from '../ui/ui.js';

const X_EXPL = 460;
const Y_EXPL = 128;
const ALTO_EXPL = 410;

export default class EscenaInforme extends Phaser.Scene {
  constructor() {
    super('Informe');
  }

  create() {
    estrellas(this, 50);
    barraFases(this, CONFIG.fases, 5);
    const mision = misionActual();

    if (!estado.resultado) this.calcularResultado();
    const { puntaje, requisitos, explicaciones, parecidas, anterior, esRecord } = estado.resultado;

    const exito = requisitos.every((r) => r.ok);
    titulo(this, exito ? '¡Misión cumplida!' : 'Informe de misión',
      `${mision.nombre} · Intento ${estado.intento} · ${requisitos.filter((r) => r.ok).length} de ${requisitos.length} requisitos cumplidos`);

    // ---- Columna izquierda: puntaje, requisitos y comparación ----
    panel(this, 15, 92, 430, 568);
    texto(this, 230, 98, `${puntaje.total} / ${puntaje.maximo} puntos`, { tam: 28, negrita: true, origen: [0.5, 0], color: COLORES.aviso });
    if (esRecord) texto(this, 230, 132, '★ ¡Nuevo récord en esta computadora! ★', { tam: 13, origen: [0.5, 0], color: COLORES.bien });

    puntaje.categorias.forEach((c, i) => {
      const y = 155 + i * 36;
      texto(this, 30, y, `${c.nombre}: ${c.puntos} / ${c.max}`, { tam: 13 });
      const f = c.puntos / c.max;
      barra(this, 30, y + 18, 400, 9).actualizar(f, f >= 0.7 ? 'verde' : f >= 0.4 ? 'amarillo' : 'rojo');
    });

    const yReq = 155 + puntaje.categorias.length * 36 + 6;
    texto(this, 30, yReq, 'Requisitos', { tam: 15, negrita: true, color: COLORES.acento });
    texto(this, 30, yReq + 22, requisitos.map((r) => `${r.ok ? '✔' : '✖'} ${r.texto}`).join('\n'), { tam: 12, ancho: 405 });

    texto(this, 30, 548, 'Comparación con el intento anterior', { tam: 14, negrita: true, color: COLORES.acento });
    texto(this, 30, 570, anterior ? this.textoComparacion(anterior, estado.resultado.actual) :
      'Es tu primer intento. Pulsa "Rediseñar" para mejorar la nave y comparar.', { tam: 12, ancho: 405 });

    // ---- Columna derecha: causas y efectos (paginadas) ----
    panel(this, X_EXPL - 10, 92, ANCHO - X_EXPL - 5, 470);
    texto(this, X_EXPL, 98, '¿Por qué pasó esto? Causas y efectos de tus decisiones', { tam: 16, negrita: true, color: COLORES.acento });
    this.paginas = this.armarPaginas(explicaciones);
    this.pagina = 0;
    this.textoPagina = texto(this, X_EXPL + 400, 545, '', { tam: 12, origen: [0.5, 0.5], color: COLORES.textoSuave });
    this.botonAnterior = boton(this, X_EXPL + 270, 545, 120, 26, '◀ Anterior', () => this.irA(this.pagina - 1), { tam: 12 });
    this.botonSiguiente = boton(this, X_EXPL + 530, 545, 120, 26, 'Siguiente ▶', () => this.irA(this.pagina + 1), { tam: 12 });
    this.irA(0);

    // ---- Misiones reales parecidas ----
    panel(this, X_EXPL - 10, 568, ANCHO - X_EXPL - 5, 92, 0x1b2a45);
    texto(this, X_EXPL, 573, 'Misiones reales parecidas a la tuya', { tam: 14, negrita: true, color: COLORES.aviso });
    texto(this, X_EXPL, 593, parecidas.map((m) => `• ${m.nombre} (${m.lanzamiento}): ${m.descripcion}`).join('\n'), {
      tam: 11, ancho: ANCHO - X_EXPL - 30
    });

    // ---- Botones ----
    boton(this, 150, 692, 260, 44, 'Rediseñar la nave ↺', () => { nuevoIntento(); this.scene.start('Diseno'); }, { tam: 17 });
    boton(this, 450, 692, 220, 44, 'Otra misión', () => this.scene.start('Mision'), { tam: 16 });
    boton(this, 680, 692, 160, 44, 'Inicio', () => this.scene.start('Inicio'), { tam: 16 });
  }

  /** Calcula puntaje, requisitos y explicaciones una sola vez por intento. */
  calcularResultado() {
    const mision = misionActual();
    const a = analizarDiseno();
    const resumen = estado.simulacion ? estado.simulacion.resumen : null;
    const L = estado.lanzamiento;

    const requisitos = evaluarRequisitos({
      mision, lanzamiento: L, aterrizaje: estado.aterrizaje, resumen, presupuesto: estado.presupuesto, soporte: a.soporte
    });
    const puntaje = calcularPuntaje({
      requisitos, resumen, mision, lanzamiento: L, presupuesto: estado.presupuesto,
      modoEquipo: esEquipo(), metasRoles: L.metas, config: CONFIG
    });
    const explicaciones = generarExplicaciones({
      mision, destino: destinoActual(), orbita: orbitaActual(), cohete: coheteActual(),
      coheteBarato: L.coheteBaratoId ? buscarCohete(L.coheteBaratoId) : null,
      diseno: a.diseno, ambiente: a.ambiente, lanzamiento: L, aterrizaje: estado.aterrizaje,
      viaje: estado.viaje, soporte: a.soporte,
      resumen, metasRoles: L.metas, modoEquipo: esEquipo(), presupuesto: estado.presupuesto, config: CONFIG
    });

    const actual = {
      intento: estado.intento,
      total: puntaje.total,
      categorias: puntaje.categorias.map((c) => ({ nombre: c.nombre, puntos: c.puntos })),
      costo: L.costoTotal,
      masa: L.masaTotal,
      datos: resumen ? resumen.datosEnviados : 0,
      valor: resumen ? resumen.valorCientifico : 0,
      requisitos: requisitos.filter((r) => r.ok).length
    };
    const anterior = estado.historial.length ? estado.historial[estado.historial.length - 1] : null;
    estado.historial.push(actual);

    const { esRecord } = guardarRecord({
      puntaje: puntaje.total,
      mision: mision.nombre,
      modo: esEquipo() ? `Equipo de ${estado.numJugadores}` : '1 jugador',
      nivel: nivel().nombre
    });

    estado.resultado = {
      puntaje, requisitos, explicaciones, actual, anterior, esRecord,
      parecidas: misionesParecidas(mision, MISIONES_REALES)
    };
  }

  textoComparacion(antes, ahora) {
    const r1 = (x) => Math.round(x * 10) / 10;
    const dif = (a, b, unidad = '') => {
      const d = r1(b - a);
      return `${r1(a)} → ${r1(b)}${unidad} (${d >= 0 ? '+' : ''}${d})`;
    };
    return [
      `Puntaje: ${dif(antes.total, ahora.total)}`,
      `Requisitos cumplidos: ${dif(antes.requisitos, ahora.requisitos)}`,
      `Costo: ${dif(antes.costo, ahora.costo, ' M$')} · Masa: ${dif(antes.masa, ahora.masa, ' kg')}`,
      `Datos en la Tierra: ${dif(antes.datos, ahora.datos, ' GB')}`,
      `Valor científico: ${dif(antes.valor, ahora.valor)}`
    ].join('\n');
  }

  /** Crea los textos y los reparte en páginas según su altura. */
  armarPaginas(explicaciones) {
    const paginas = [[]];
    let y = Y_EXPL;
    const iconos = { bien: '✔', mal: '✖', info: '•' };
    const colores = { bien: COLORES.bien, mal: COLORES.mal, info: COLORES.texto };
    for (const e of explicaciones) {
      const t = texto(this, X_EXPL, y, `${iconos[e.tipo]} ${e.texto}`, {
        tam: 13, ancho: ANCHO - X_EXPL - 30, color: colores[e.tipo]
      });
      if (y + t.height > Y_EXPL + ALTO_EXPL && paginas[paginas.length - 1].length > 0) {
        paginas.push([]);
        y = Y_EXPL;
        t.setY(y);
      }
      paginas[paginas.length - 1].push(t);
      y += t.height + 7;
    }
    return paginas;
  }

  irA(numero) {
    this.pagina = Phaser.Math.Clamp(numero, 0, this.paginas.length - 1);
    this.paginas.forEach((p, i) => p.forEach((t) => t.setVisible(i === this.pagina)));
    this.textoPagina.setText(`Página ${this.pagina + 1} de ${this.paginas.length}`);
    this.botonAnterior.setHabilitado(this.pagina > 0);
    this.botonSiguiente.setHabilitado(this.pagina < this.paginas.length - 1);
  }
}
