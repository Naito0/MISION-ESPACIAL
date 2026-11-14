// =============================================================
// checklistUI.js — Dibuja el checklist de requisitos como tarjetas con icono.
// Cada tarjeta se pone verde sola cuando el diseño cumple ese requisito
// (con un pequeño "salto" para que se note). El detalle está en el tooltip.
// =============================================================
import { COLORES, texto } from './ui.js';
import { conTooltip } from './ayuda.js';

/**
 * @param o.x, o.y        esquina superior izquierda
 * @param o.columnas      cantidad de columnas
 * @param o.anchoTarjeta  ancho de cada tarjeta
 * @param o.altoTarjeta   alto de cada tarjeta
 * @param o.tooltip       tooltip creado con crearTooltip()
 * @param o.profundidad   (opcional) para usarlo dentro de una ventana
 * Devuelve { actualizar(items), destruir() }
 */
export function crearChecklist(escena, o) {
  const tarjetas = {};
  const todos = [];
  const sep = 10;

  function crearTarjeta(item, i) {
    const col = i % o.columnas;
    const fila = Math.floor(i / o.columnas);
    const x = o.x + col * (o.anchoTarjeta + sep);
    const y = o.y + fila * (o.altoTarjeta + sep);
    const fondo = escena.add.rectangle(x, y, o.anchoTarjeta, o.altoTarjeta, 0x1a2342).setOrigin(0, 0).setStrokeStyle(2, 0x3a4a7a);
    const icono = texto(escena, x + 12, y + o.altoTarjeta / 2, item.icono, { tam: 22, origen: [0, 0.5] });
    const etiqueta = texto(escena, x + 50, y + o.altoTarjeta / 2, item.texto, { tam: 14, origen: [0, 0.5], ancho: o.anchoTarjeta - 100 });
    const marca = escena.add.circle(x + o.anchoTarjeta - 24, y + o.altoTarjeta / 2, 14, 0x3a3f4d);
    const simbolo = texto(escena, x + o.anchoTarjeta - 24, y + o.altoTarjeta / 2, '', { tam: 16, negrita: true, origen: [0.5, 0.5] });
    const t = { fondo, icono, etiqueta, marca, simbolo, item, ok: null };
    conTooltip(fondo, o.tooltip, () => `${t.item.texto}\n${t.item.detalle}`);
    [fondo, icono, etiqueta, marca, simbolo].forEach((obj) => {
      if (o.profundidad) obj.setDepth(o.profundidad);
      todos.push(obj);
    });
    tarjetas[item.id] = t;
  }

  return {
    actualizar(items) {
      items.forEach((item, i) => {
        if (!tarjetas[item.id]) crearTarjeta(item, i);
        const t = tarjetas[item.id];
        t.item = item;
        const cambio = t.ok !== null && t.ok !== item.ok;
        t.ok = item.ok;
        t.marca.setFillStyle(item.ok ? 0x3cc46e : 0x5a2a33);
        t.simbolo.setText(item.ok ? '✓' : '✗');
        t.fondo.setStrokeStyle(2, item.ok ? 0x3cc46e : 0x3a4a7a);
        t.etiqueta.setColor(item.ok ? COLORES.texto : COLORES.textoSuave);
        if (cambio) escena.tweens.add({ targets: [t.marca, t.simbolo], scale: 1.4, duration: 160, yoyo: true });
      });
      return items.filter((x) => x.ok).length;
    },
    destruir() {
      todos.forEach((obj) => obj.destroy());
    }
  };
}
