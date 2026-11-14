// =============================================================
// Minijuego: UNIR CABLES por color.
// Haz clic en un cable de la izquierda y luego en el conector de la
// derecha del mismo color. Hay que conectar todos antes de que se acabe el tiempo.
// =============================================================
import { crearMarco, mezclar } from './base.js';

const COLORES_CABLE = [
  { nombre: 'rojo', color: 0xe5484d },
  { nombre: 'azul', color: 0x3d77d8 },
  { nombre: 'amarillo', color: 0xf2c14e },
  { nombre: 'verde', color: 0x3cc46e }
];

export function minijuegoCables(escena, opciones) {
  const m = crearMarco(escena, {
    ...opciones,
    titulo: 'Reconectar los cables de energía',
    instrucciones: 'Haz clic en un cable de la izquierda y después en el conector del MISMO color a la derecha.'
  });

  const lineas = m.agregar(escena.add.graphics());
  const izquierda = mezclar(COLORES_CABLE);
  const derecha = mezclar(COLORES_CABLE);
  let elegido = null;
  let conectados = 0;

  const crearNodo = (c, x, y, lado) => {
    const nodo = m.agregar(escena.add.rectangle(x, y, 90, 34, c.color).setStrokeStyle(3, 0x222222));
    nodo.datos = { ...c, lado, x, y, listo: false };
    nodo.setInteractive({ useHandCursor: true });
    nodo.on('pointerdown', () => alClic(nodo));
    return nodo;
  };
  const nodosIzq = izquierda.map((c, i) => crearNodo(c, 380, 230 + i * 85, 'izq'));
  derecha.forEach((c, i) => crearNodo(c, 900, 230 + i * 85, 'der'));

  function alClic(nodo) {
    if (!m.activo || nodo.datos.listo) return;
    if (nodo.datos.lado === 'izq') {
      nodosIzq.forEach((n) => { if (!n.datos.listo) n.setStrokeStyle(3, 0x222222); });
      elegido = nodo;
      nodo.setStrokeStyle(5, 0xffffff);
      return;
    }
    if (!elegido) return;
    if (elegido.datos.nombre === nodo.datos.nombre) {
      // ¡Conexión correcta!
      lineas.lineStyle(10, nodo.datos.color, 1);
      lineas.lineBetween(elegido.datos.x + 45, elegido.datos.y, nodo.datos.x - 45, nodo.datos.y);
      elegido.datos.listo = true;
      nodo.datos.listo = true;
      elegido.setStrokeStyle(3, 0xffffff);
      nodo.setStrokeStyle(3, 0xffffff);
      elegido = null;
      conectados++;
      if (conectados === COLORES_CABLE.length) escena.time.delayedCall(300, () => m.terminar(true));
    } else {
      // Color equivocado: parpadea en rojo
      nodo.setStrokeStyle(5, 0xff0000);
      escena.time.delayedCall(250, () => { if (!nodo.datos.listo && m.activo) nodo.setStrokeStyle(3, 0x222222); });
    }
  }

  return m;
}
