// =============================================================
// enlaceDatos.js — Estaciones terrenas en el diagrama de la operación.
// Cuando la nave pasa sobre una estación (o, lejos de la Tierra, cuando
// la Tierra está a la vista), se ven paquetes de datos viajando hacia ella.
// Si la antena no tiene alcance, los paquetes se pierden a mitad de camino.
// =============================================================
import { enviarPaquete } from './paquetesDatos.js';
import { texto, COLORES } from '../ui/ui.js';

/**
 * @param o.planeta           { x, y, r } del planeta dibujado
 * @param o.esTierra          true si la misión orbita la Tierra (estaciones en el planeta)
 * @param o.cantidadEstaciones 1, 3 o 5 según las estaciones elegidas
 * @param o.enlaceOk          ¿la antena tiene alcance?
 * Devuelve { actualizar(deltaMs, posNave, anguloNave, activo) }
 */
export function crearEnlaceDatos(escena, o) {
  const estaciones = [];

  if (o.esTierra) {
    // Estaciones repartidas sobre el borde del planeta
    for (let i = 0; i < o.cantidadEstaciones; i++) {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / o.cantidadEstaciones;
      const x = o.planeta.x + Math.cos(ang) * o.planeta.r;
      const y = o.planeta.y + Math.sin(ang) * o.planeta.r;
      const icono = escena.add.triangle(x, y, 0, 12, 12, 12, 6, 0, 0xffd166).setAngle((ang * 180) / Math.PI + 90);
      estaciones.push({ x, y, ang, icono });
    }
  } else {
    // Lejos de la Tierra: los datos viajan hacia la Tierra (dibujada en una esquina)
    const x = o.planeta.x + 200;
    const y = o.planeta.y - 190;
    const icono = escena.add.circle(x, y, 16, 0x2f6fd6).setStrokeStyle(2, 0x7cc4ff);
    texto(escena, x, y + 20, 'Tierra', { tam: 11, origen: [0.5, 0], color: COLORES.textoSuave });
    estaciones.push({ x, y, ang: Math.atan2(y - o.planeta.y, x - o.planeta.x), icono, lejana: true });
  }

  let acumulado = 0;
  return {
    actualizar(deltaMs, posNave, anguloNave, activo) {
      if (!activo) return;
      acumulado += deltaMs;
      if (acumulado < 220) return;
      acumulado = 0;
      for (const e of estaciones) {
        // ¿La estación está "a la vista" de la nave?
        let visible = true;
        if (anguloNave !== null) {
          const diferencia = Math.abs(Math.atan2(Math.sin(anguloNave - e.ang), Math.cos(anguloNave - e.ang)));
          visible = diferencia < (e.lejana ? Math.PI / 2 : 0.45);
        }
        if (!visible) continue;
        enviarPaquete(escena, posNave, e, !o.enlaceOk);
        if (o.enlaceOk) escena.tweens.add({ targets: e.icono, scale: 1.4, duration: 120, yoyo: true });
      }
    }
  };
}
