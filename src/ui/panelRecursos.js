// =============================================================
// panelRecursos.js — Panel de recursos con dos modos:
//   - SIMPLE (por defecto): frase corta + metáfora visual
//       ⚡ batería · 🪙 monedas · 🚀 cohete que se esfuerza · 📦 paquetes
//   - EXPERTO (interruptor 🔬): barras con todos los números.
// Los recursos secundarios (batería, comunicaciones, tiempo, vida útil,
// riesgo, soporte) van en el desplegable "Ver más".
// Al elegir una pieza aparecen textos flotantes con el cambio.
// =============================================================
import { COLORES, COLOR_NIVEL, texto } from './ui.js';
import { conTooltip } from './ayuda.js';
import { fraseRecurso } from './textosSimples.js';
import { crearVisual } from './visualesRecursos.js';
import { esModoExperto } from '../systems/preferencias.js';

const PRINCIPALES = [
  { id: 'presupuesto', icono: '🪙', nombre: 'Presupuesto' },
  { id: 'masa', icono: '🚀', nombre: 'Masa' },
  { id: 'energia', icono: '⚡', nombre: 'Energía' },
  { id: 'datos', icono: '📦', nombre: 'Datos' }
];
const ICONOS_SECUNDARIOS = {
  bateria: '🔋', comunicaciones: '📶', desarrollo: '⏳', vida: '🛰️', riesgo: '⚠️', soporte: '🧑‍🚀'
};
const COLOR_TEXTO = { verde: COLORES.bien, amarillo: COLORES.aviso, rojo: COLORES.mal };

const r1 = (n) => Math.round(n * 10) / 10;

/** Valor con números (modo experto). */
function valorCorto(b) {
  switch (b.id) {
    case 'presupuesto': return `${r1(b.usado)} / ${r1(b.limite)} M$`;
    case 'masa': return `${r1(b.usado)} / ${r1(b.limite)} kg`;
    case 'energia': return `usa ${r1(b.usado)} de ${r1(b.limite)} W`;
    case 'datos': return `${r1(b.usado)} / ${r1(b.limite)} GB/día`;
    case 'comunicaciones': return b.nivel === 'rojo' ? 'sin alcance' : 'con alcance';
    case 'riesgo': return `${Math.round(b.usado * 100)}%`;
    case 'vida': return `~${r1(b.limite)} meses`;
    case 'desarrollo': return `${b.usado} / ${b.limite} meses`;
    default: return `${r1(b.usado)} / ${r1(b.limite)}`;
  }
}

/**
 * Crea el panel en (x, y). Devuelve:
 *   actualizar(barras)           → refresca todo (con animación)
 *   mostrarCambios(antes, ahora) → textos flotantes con la diferencia
 *   aplicarModo()                → cambia entre modo simple y experto
 */
export function crearPanelRecursos(escena, x, y, ancho, tooltip) {
  const anchoBarra = ancho - 30;
  const filas = {};
  let barrasActuales = [];

  // ---- 4 principales ----
  PRINCIPALES.forEach((p, i) => {
    const yf = y + i * 66;
    const zona = escena.add.rectangle(x, yf - 4, ancho - 10, 62, 0xffffff, 0.001).setOrigin(0, 0);
    const icono = texto(escena, x, yf, p.icono, { tam: 24 });
    // Modo experto: nombre + valor + barra
    const nombre = texto(escena, x + 38, yf, p.nombre, { tam: 16, negrita: true });
    const valor = texto(escena, x + ancho - 20, yf + 2, '', { tam: 14, origen: [1, 0] });
    const fondo = escena.add.rectangle(x + 38, yf + 30, anchoBarra - 38, 14, 0x2a3150).setOrigin(0, 0);
    const relleno = escena.add.rectangle(x + 38, yf + 30, anchoBarra - 38, 14, COLOR_NIVEL.verde).setOrigin(0, 0);
    relleno.scaleX = 0;
    // Modo simple: frase + término técnico chiquito + metáfora visual
    const frase = texto(escena, x + 38, yf, '', { tam: 15, negrita: true });
    const tecnico = texto(escena, x + 38, yf + 19, '', { tam: 10, color: COLORES.textoSuave });
    const visual = crearVisual(escena, p.id, x + 38, yf + 31, ancho - 50);
    filas[p.id] = {
      zona, icono, nombre, valor, fondo, relleno, frase, tecnico, visual, principal: true, yTexto: yf,
      experto: [nombre, valor, fondo, relleno], simple: [frase, tecnico, ...visual.objetos]
    };
    conTooltip(zona, tooltip, () => textoTooltip(p.id));
  });

  // ---- "Ver más" y recursos secundarios ----
  const yVerMas = y + PRINCIPALES.length * 66 + 2;
  const botonVerMas = texto(escena, x, yVerMas, '▸ Ver más', { tam: 14, negrita: true, color: COLORES.acento });
  botonVerMas.setInteractive({ useHandCursor: true });
  let abierto = false;
  const secundarios = [];
  botonVerMas.on('pointerdown', () => {
    abierto = !abierto;
    botonVerMas.setText(abierto ? '▾ Ver menos' : '▸ Ver más');
    aplicarModo();
  });

  function crearSecundaria(b, indice) {
    const yf = yVerMas + 26 + indice * 30;
    const zona = escena.add.rectangle(x, yf - 2, ancho - 10, 28, 0xffffff, 0.001).setOrigin(0, 0);
    const etiqueta = texto(escena, x, yf, '', { tam: 12 });
    const valor = texto(escena, x + ancho - 20, yf, '', { tam: 12, origen: [1, 0] });
    const fondo = escena.add.rectangle(x, yf + 17, anchoBarra, 6, 0x2a3150).setOrigin(0, 0);
    const relleno = escena.add.rectangle(x, yf + 17, anchoBarra, 6, COLOR_NIVEL.verde).setOrigin(0, 0);
    relleno.scaleX = 0;
    conTooltip(zona, tooltip, () => textoTooltip(b.id));
    filas[b.id] = { zona, etiqueta, valor, fondo, relleno, principal: false };
    secundarios.push(zona, etiqueta, valor, fondo, relleno);
  }

  function textoTooltip(id) {
    const b = barrasActuales.find((x) => x.id === id);
    if (!b) return '';
    const { frase, tecnico } = fraseRecurso(b);
    if (esModoExperto()) return `${b.nombre}: ${b.texto}${b.nivel !== 'verde' ? `\n\n💡 ${b.ayuda}` : ''}`;
    return `${frase}\n(${tecnico})${b.nivel !== 'verde' ? `\n\n💡 ${b.ayuda}` : ''}`;
  }

  /** Muestra las piezas del modo actual y oculta las del otro. */
  function aplicarModo() {
    const experto = esModoExperto();
    for (const p of PRINCIPALES) {
      const f = filas[p.id];
      f.experto.forEach((o) => o.setVisible(experto));
      f.simple.forEach((o) => o.setVisible(!experto));
    }
    secundarios.forEach((o) => o.setVisible(abierto));
    if (barrasActuales.length) refrescarTextos();
  }

  function refrescarTextos() {
    const experto = esModoExperto();
    for (const b of barrasActuales) {
      const f = filas[b.id];
      if (!f) continue;
      const { frase, tecnico } = fraseRecurso(b);
      if (f.principal) {
        f.valor.setText(valorCorto(b)).setColor(COLOR_TEXTO[b.nivel]);
        f.frase.setText(frase).setColor(COLOR_TEXTO[b.nivel]);
        f.tecnico.setText(tecnico);
      } else {
        f.etiqueta.setText(`${ICONOS_SECUNDARIOS[b.id] || '•'} ${experto ? b.nombre : frase}`)
          .setColor(experto ? COLORES.texto : COLOR_TEXTO[b.nivel]);
        f.valor.setText(experto ? valorCorto(b) : '').setColor(COLOR_TEXTO[b.nivel]);
      }
    }
  }

  return {
    botonVerMas,
    aplicarModo,
    /** Refresca las barras y los visuales (se animan hasta el nuevo valor). */
    actualizar(barras) {
      barrasActuales = barras;
      let indiceSecundario = 0;
      for (const b of barras) {
        if (!filas[b.id]) {
          if (PRINCIPALES.some((p) => p.id === b.id)) continue;
          crearSecundaria(b, indiceSecundario);
          [filas[b.id].zona, filas[b.id].etiqueta, filas[b.id].valor, filas[b.id].fondo, filas[b.id].relleno].forEach((o) => o.setVisible(abierto));
        }
        if (!filas[b.id].principal) indiceSecundario++;
        const f = filas[b.id];
        f.relleno.setFillStyle(COLOR_NIVEL[b.nivel]);
        escena.tweens.add({ targets: f.relleno, scaleX: Math.max(0, Math.min(1, b.ratio)), duration: 350, ease: 'Cubic.easeOut' });
        if (f.visual) f.visual.actualizar(b);
        if (f.principal && b.nivel === 'rojo') {
          escena.tweens.add({ targets: f.icono, scale: 1.3, duration: 150, yoyo: true });
        }
      }
      refrescarTextos();
      aplicarModo();
    },

    /** Textos flotantes con lo que cambió (antes y ahora = resultados de analizarDiseno). */
    mostrarCambios(antes, ahora) {
      const experto = esModoExperto();
      const cambios = [
        ['presupuesto', ahora.costoTotal - antes.costoTotal, 'M$', false, '🪙'],
        ['masa', ahora.diseno.masaTotal - antes.diseno.masaTotal, 'kg', false, '⚖️'],
        ['energia', (ahora.operativo.generacionMedia - ahora.diseno.consumo) - (antes.operativo.generacionMedia - antes.diseno.consumo), 'W', true, '⚡'],
        ['datos', ahora.operativo.datosGeneradosDia - antes.operativo.datosGeneradosDia, 'GB/día', true, '📦']
      ];
      cambios.forEach(([id, delta, unidad, masEsMejor, icono], i) => {
        if (Math.abs(delta) < 0.05) return;
        const f = filas[id];
        const bueno = masEsMejor ? delta > 0 : delta < 0;
        const signo = delta > 0 ? '+' : '−';
        // En modo simple: solo flechas y el icono; en experto, el número
        const contenido = experto ? `${signo}${r1(Math.abs(delta))} ${unidad}` : `${icono} ${delta > 0 ? '▲' : '▼'}`;
        const flotante = texto(escena, x + ancho - 70, f.yTexto + 2, contenido, {
          tam: 15, negrita: true, color: bueno ? COLORES.bien : COLORES.mal
        }).setDepth(900);
        escena.tweens.add({
          targets: flotante, y: f.yTexto - 24, alpha: 0, duration: 1300, delay: i * 80,
          ease: 'Cubic.easeOut', onComplete: () => flotante.destroy()
        });
      });
    }
  };
}
