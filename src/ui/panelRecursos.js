// =============================================================
// panelRecursos.js — Panel de recursos simplificado:
//   - 4 recursos principales en grande (presupuesto, masa, energía, datos)
//     con icono, barra de color y valor corto.
//   - El resto (batería, comunicaciones, tiempo, vida útil, riesgo, soporte)
//     en un desplegable "Ver más".
//   - Las barras se animan y aparece un texto flotante con cada cambio
//     (ej.: "+0.5 kg", "−2 W").
// El detalle completo de cada barra se ve en un tooltip al pasar el mouse.
// =============================================================
import { COLORES, COLOR_NIVEL, texto } from './ui.js';
import { conTooltip } from './ayuda.js';

const PRINCIPALES = [
  { id: 'presupuesto', icono: '💰', nombre: 'Presupuesto' },
  { id: 'masa', icono: '⚖️', nombre: 'Masa' },
  { id: 'energia', icono: '⚡', nombre: 'Energía' },
  { id: 'datos', icono: '📡', nombre: 'Datos' }
];
const ICONOS_SECUNDARIOS = {
  bateria: '🔋', comunicaciones: '📶', desarrollo: '⏳', vida: '🛰️', riesgo: '⚠️', soporte: '🧑‍🚀'
};
const COLOR_TEXTO = { verde: COLORES.bien, amarillo: COLORES.aviso, rojo: COLORES.mal };

const r1 = (n) => Math.round(n * 10) / 10;

/** Valor corto que se muestra al lado de cada barra. */
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
 * Crea el panel en (x, y) con un ancho dado. Devuelve:
 *   actualizar(barras)           → refresca todo (con animación de las barras)
 *   mostrarCambios(antes, ahora) → textos flotantes con la diferencia
 */
export function crearPanelRecursos(escena, x, y, ancho, tooltip) {
  const anchoBarra = ancho - 30;
  const filas = {};
  let barrasActuales = [];

  // ---- 4 principales ----
  PRINCIPALES.forEach((p, i) => {
    const yf = y + i * 66;
    const zona = escena.add.rectangle(x, yf - 4, ancho - 10, 60, 0xffffff, 0.001).setOrigin(0, 0);
    const icono = texto(escena, x, yf, p.icono, { tam: 24 });
    const nombre = texto(escena, x + 38, yf, p.nombre, { tam: 16, negrita: true });
    const valor = texto(escena, x + ancho - 20, yf + 2, '', { tam: 14, origen: [1, 0] });
    const fondo = escena.add.rectangle(x + 38, yf + 30, anchoBarra - 38, 14, 0x2a3150).setOrigin(0, 0);
    const relleno = escena.add.rectangle(x + 38, yf + 30, anchoBarra - 38, 14, COLOR_NIVEL.verde).setOrigin(0, 0);
    relleno.scaleX = 0;
    filas[p.id] = { zona, icono, nombre, valor, fondo, relleno, principal: true, yTexto: yf };
    conTooltip(zona, tooltip, () => textoTooltip(p.id));
  });

  // ---- Botón "Ver más" y recursos secundarios ----
  const yVerMas = y + PRINCIPALES.length * 66 + 2;
  const botonVerMas = texto(escena, x, yVerMas, '▸ Ver más recursos', { tam: 14, negrita: true, color: COLORES.acento });
  botonVerMas.setInteractive({ useHandCursor: true });
  let abierto = false;
  const secundarios = [];
  botonVerMas.on('pointerdown', () => {
    abierto = !abierto;
    botonVerMas.setText(abierto ? '▾ Ver menos' : '▸ Ver más recursos');
    secundarios.forEach((o) => o.setVisible(abierto));
  });

  function crearSecundaria(b, indice) {
    const yf = yVerMas + 26 + indice * 30;
    const zona = escena.add.rectangle(x, yf - 2, ancho - 10, 28, 0xffffff, 0.001).setOrigin(0, 0);
    const etiqueta = texto(escena, x, yf, `${ICONOS_SECUNDARIOS[b.id] || '•'} ${b.nombre}`, { tam: 12 });
    const valor = texto(escena, x + ancho - 20, yf, '', { tam: 12, origen: [1, 0] });
    const fondo = escena.add.rectangle(x, yf + 17, anchoBarra, 6, 0x2a3150).setOrigin(0, 0);
    const relleno = escena.add.rectangle(x, yf + 17, anchoBarra, 6, COLOR_NIVEL.verde).setOrigin(0, 0);
    relleno.scaleX = 0;
    conTooltip(zona, tooltip, () => textoTooltip(b.id));
    filas[b.id] = { zona, etiqueta, valor, fondo, relleno, principal: false };
    [zona, etiqueta, valor, fondo, relleno].forEach((o) => { o.setVisible(abierto); secundarios.push(o); });
  }

  function textoTooltip(id) {
    const b = barrasActuales.find((x) => x.id === id);
    if (!b) return '';
    return `${b.nombre}: ${b.texto}${b.nivel !== 'verde' ? `\n\n💡 ${b.ayuda}` : ''}`;
  }

  return {
    botonVerMas,
    /** Refresca las barras (se animan hasta el nuevo valor). */
    actualizar(barras) {
      barrasActuales = barras;
      let indiceSecundario = 0;
      for (const b of barras) {
        if (!filas[b.id]) {
          if (PRINCIPALES.some((p) => p.id === b.id)) continue;
          crearSecundaria(b, indiceSecundario);
        }
        if (!filas[b.id].principal) indiceSecundario++;
        const f = filas[b.id];
        f.valor.setText(valorCorto(b)).setColor(COLOR_TEXTO[b.nivel]);
        f.relleno.setFillStyle(COLOR_NIVEL[b.nivel]);
        escena.tweens.add({ targets: f.relleno, scaleX: Math.max(0, Math.min(1, b.ratio)), duration: 350, ease: 'Cubic.easeOut' });
        // Si una barra principal se pone roja, el icono "late" para llamar la atención
        if (f.principal && b.nivel === 'rojo') {
          escena.tweens.add({ targets: f.icono, scale: 1.3, duration: 150, yoyo: true });
        }
      }
    },

    /** Muestra textos flotantes con lo que cambió (antes y ahora = resultados de analizarDiseno). */
    mostrarCambios(antes, ahora) {
      const cambios = [
        ['presupuesto', ahora.costoTotal - antes.costoTotal, 'M$', false],
        ['masa', ahora.diseno.masaTotal - antes.diseno.masaTotal, 'kg', false],
        ['energia', (ahora.operativo.generacionMedia - ahora.diseno.consumo) - (antes.operativo.generacionMedia - antes.diseno.consumo), 'W', true],
        ['datos', ahora.operativo.datosGeneradosDia - antes.operativo.datosGeneradosDia, 'GB/día', true]
      ];
      cambios.forEach(([id, delta, unidad, masEsMejor], i) => {
        if (Math.abs(delta) < 0.05) return;
        const f = filas[id];
        const bueno = masEsMejor ? delta > 0 : delta < 0;
        const signo = delta > 0 ? '+' : '−';
        const flotante = texto(escena, f.nombre.x + 112, f.yTexto + 2, `${signo}${r1(Math.abs(delta))} ${unidad}`, {
          tam: 15, negrita: true, color: bueno ? COLORES.bien : COLORES.mal
        }).setDepth(900);
        escena.tweens.add({
          targets: flotante, y: f.yTexto - 26, alpha: 0, duration: 1300, delay: i * 80,
          ease: 'Cubic.easeOut', onComplete: () => flotante.destroy()
        });
      });
    }
  };
}
