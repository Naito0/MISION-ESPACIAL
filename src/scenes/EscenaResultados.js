// =============================================================
// ESCENA 7 — RESULTADOS: puntaje, récord y explicaciones de causa y efecto.
// Es la parte educativa más importante: las explicaciones salen de
// systems/explicaciones.js, que lee lo que realmente pasó en el estado.
// =============================================================
import * as Phaser from 'phaser';
import { estado, misionActual } from '../systems/estadoMision.js';
import { calcularPuntaje, guardarRecord, objetivoCumplido } from '../systems/puntaje.js';
import { generarExplicaciones } from '../systems/explicaciones.js';
import { ANCHO, COLORES, texto, titulo, panel, boton, estrellas } from '../ui/ui.js';

const X_EXPL = 450;
const Y_EXPL = 140;
const ALTO_EXPL = 470; // espacio vertical disponible para cada página

export default class EscenaResultados extends Phaser.Scene {
  constructor() {
    super('Resultados');
  }

  create() {
    estrellas(this, 50);
    const mision = misionActual();

    // Calculamos una sola vez (por si la escena se reinicia)
    if (!estado.resultado) {
      const puntaje = calcularPuntaje();
      const explicaciones = generarExplicaciones();
      const { records, esRecord } = guardarRecord(puntaje.total);
      estado.resultado = { puntaje, explicaciones, records, esRecord };
    }
    const { puntaje, explicaciones, records, esRecord } = estado.resultado;

    const aterrizo = estado.aterrizaje && estado.aterrizaje.exito;
    let veredicto = 'Misión perdida';
    if (aterrizo && objetivoCumplido()) veredicto = '¡Misión cumplida!';
    else if (aterrizo) veredicto = 'Misión parcial: aterrizaste, pero no se cumplió el objetivo';
    titulo(this, veredicto, `Paso 7 de 7 — ${mision.nombre}`);

    // ---- Columna izquierda: puntaje y desglose ----
    panel(this, 20, 95, 410, 590);
    texto(this, 225, 105, `${puntaje.total} puntos`, { tam: 36, negrita: true, origen: [0.5, 0], color: COLORES.aviso });
    if (esRecord) texto(this, 225, 150, '★ ¡Nuevo récord! ★', { tam: 18, origen: [0.5, 0], color: COLORES.bien });

    const lineas = puntaje.desglose.map((d) => `${d.puntos >= 0 ? '+' : ''}${d.puntos}  ${d.concepto}`);
    texto(this, 35, 185, 'Desglose:\n' + (lineas.join('\n') || 'Sin puntos.'), { tam: 14, ancho: 380 });

    texto(this, 35, 470, 'Récords en esta computadora:\n' +
      records.map((r, i) => `${i + 1}) ${r.puntaje} pts · ${r.mision} · ${r.fecha}`).join('\n'),
      { tam: 13, ancho: 380, color: COLORES.textoSuave });

    // ---- Columna derecha: explicaciones (paginadas) ----
    panel(this, X_EXPL - 15, 95, ANCHO - X_EXPL - 5, 590);
    texto(this, X_EXPL, 105, '¿Por qué pasó esto? Cada decisión tuvo consecuencias:', {
      tam: 18, negrita: true, color: COLORES.acento
    });
    this.paginas = this.armarPaginas(explicaciones);
    this.pagina = 0;
    this.textoPagina = texto(this, X_EXPL + 400, 640, '', { tam: 14, origen: [0.5, 0.5], color: COLORES.textoSuave });
    this.botonAnterior = boton(this, X_EXPL + 260, 640, 130, 34, '◀ Anterior', () => this.irA(this.pagina - 1), { tam: 14 });
    this.botonSiguiente = boton(this, X_EXPL + 540, 640, 130, 34, 'Siguiente ▶', () => this.irA(this.pagina + 1), { tam: 14 });
    this.irA(0);

    boton(this, ANCHO - 140, 700, 240, 32, 'Jugar de nuevo ↺', () => this.scene.start('Mision'), { tam: 16 });
  }

  /** Crea los textos y los reparte en páginas según su altura. */
  armarPaginas(explicaciones) {
    const paginas = [[]];
    let y = Y_EXPL;
    const iconos = { bien: '✔', mal: '✖', info: '•' };
    const colores = { bien: COLORES.bien, mal: COLORES.mal, info: COLORES.texto };
    for (const e of explicaciones) {
      const t = texto(this, X_EXPL, y, `${iconos[e.tipo]} ${e.texto}`, {
        tam: 15, ancho: ANCHO - X_EXPL - 40, color: colores[e.tipo]
      });
      if (y + t.height > Y_EXPL + ALTO_EXPL && paginas[paginas.length - 1].length > 0) {
        paginas.push([]);
        y = Y_EXPL;
        t.setY(y);
      }
      paginas[paginas.length - 1].push(t);
      y += t.height + 10;
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
