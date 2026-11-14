// =============================================================
// PROBAR EN OTROS DESTINOS (parte de la fase 4, Diseño puntual).
// Simula la MISMA nave en cada destino permitido por la misión
// (misiones.json → destinosPrueba) con una simulación rápida, y muestra
// una tabla comparativa (el mejor de cada fila en verde) y una frase
// por destino que explica por qué cambió el resultado.
// =============================================================
import * as Phaser from 'phaser';
import { CONFIG, CATEGORIAS, COHETES, EVENTOS, buscarOrbita, buscarDestino } from '../systems/datos.js';
import { estado, misionActual } from '../systems/estadoMision.js';
import { simularEnDestino, mejoresPorFila } from '../systems/comparadorDestinos.js';
import { ANCHO, COLORES, texto, titulo, panel, boton, estrellas, barraFases } from '../ui/ui.js';

const r1 = (n) => Math.round(n * 10) / 10;

export default class EscenaComparacionDestinos extends Phaser.Scene {
  constructor() {
    super('ComparacionDestinos');
  }

  create() {
    estrellas(this, 80);
    barraFases(this, CONFIG.fases, 3);
    const mision = misionActual();
    titulo(this, '🌍 Probar en otros destinos', 'La misma nave, simulada rápido en cada destino. En verde, el mejor de cada fila.');

    // ---- Simulación rápida en cada destino ----
    const orbitas = (mision.destinosPrueba || [estado.orbitaId]).map(buscarOrbita).filter(Boolean);
    const resultados = orbitas.map((orbita) => simularEnDestino({
      mision, seleccion: estado.seleccion, orbita, destino: buscarDestino(orbita.destino),
      categorias: CATEGORIAS, cohetes: COHETES, eventos: EVENTOS, config: CONFIG, presupuesto: estado.presupuesto
    }));
    estado.comparacionDestinos = resultados; // queda guardado por si otra pantalla lo quiere usar
    const mejores = mejoresPorFila(resultados);

    // ---- Tabla ----
    const xEtiquetas = 40;
    const x0 = 260;
    const anchoCol = Math.min(240, (ANCHO - x0 - 30) / resultados.length);
    const filas = [
      ['¿Llegó?', 'llego', (r) => (r.llego ? '✓ Sí' : '✗ No')],
      ['Datos enviados', 'datosEnviados', (r) => `${r1(r.datosEnviados)} GB`],
      ['Vida útil', 'vida', (r) => `${r.vida} ${r.vida === 1 ? 'mes' : 'meses'}`],
      ['Valor científico', 'valor', (r) => `${Math.round(r.valor)}`],
      ['Riesgo', 'riesgo', (r) => `${Math.round(r.riesgo * 100)}%`],
      ['Puntaje', 'puntaje', (r) => `${r.puntaje}`]
    ];
    panel(this, 25, 95, ANCHO - 50, 330);
    resultados.forEach((r, j) => {
      const cx = x0 + j * anchoCol + anchoCol / 2;
      const esOriginal = r.destino.id === mision.destino;
      this.add.circle(cx - 60, 120, 9, parseInt(r.destino.color.replace('#', ''), 16));
      texto(this, cx - 45, 110, r.destino.nombre + (esOriginal ? ' ★' : ''), { tam: 17, negrita: true });
      texto(this, cx, 134, r.orbita.nombre, { tam: 11, origen: [0.5, 0], color: COLORES.textoSuave, ancho: anchoCol - 10, align: 'center' });
    });
    filas.forEach(([nombre, clave, formato], i) => {
      const y = 180 + i * 40;
      this.add.rectangle(40, y - 6, ANCHO - 80, 34, i % 2 ? 0x18213d : 0x141c35).setOrigin(0, 0);
      texto(this, xEtiquetas + 10, y, nombre, { tam: 15, negrita: true });
      resultados.forEach((r, j) => {
        const cx = x0 + j * anchoCol + anchoCol / 2;
        let color = COLORES.texto;
        if (clave === 'llego') color = r.llego ? COLORES.bien : COLORES.mal;
        else if (mejores[clave][j]) color = COLORES.bien;
        texto(this, cx, y, formato(r), { tam: 15, origen: [0.5, 0], color, negrita: !!mejores[clave][j] });
      });
    });
    texto(this, 40, 428, '★ = destino para el que se pensó la misión', { tam: 12, color: COLORES.textoSuave });

    // ---- ¿Por qué cambió? Una frase por destino ----
    texto(this, 40, 455, '¿Por qué cambió el resultado?', { tam: 17, negrita: true, color: COLORES.acento });
    let y = 485;
    resultados.forEach((r) => {
      const t = texto(this, 40, y, `${r.llego ? '•' : '✗'} ${r.explicacion}`, {
        tam: 14, ancho: ANCHO - 80, color: r.llego ? COLORES.texto : COLORES.mal
      });
      y += t.height + 8;
    });

    boton(this, 190, 685, 320, 44, '◀ Volver al diseño puntual', () => this.scene.start('DisenoPuntual'), { tam: 16 });
    boton(this, ANCHO - 190, 685, 320, 44, 'Cambiar la nave', () => this.scene.start('Diseno'), { tam: 16 });
  }
}
