// =============================================================
// base.js — Marco común de los minijuegos de reparación:
// fondo oscuro, panel, título, instrucciones y cronómetro.
// Cada minijuego agrega sus piezas con marco.agregar(objeto) y llama
// marco.terminar(true/false). Si se acaba el tiempo, termina en fallo.
// =============================================================
import { ANCHO, ALTO, COLORES, texto, panel, barra } from '../ui/ui.js';

const PROFUNDIDAD = 2000; // por encima de todo lo demás

/**
 * @param escena   escena de Phaser
 * @param o.titulo        título del minijuego
 * @param o.instrucciones qué hay que hacer
 * @param o.segundos      tiempo límite
 * @param o.etiquetaTiempo 'Tiempo' u 'Oxígeno de la cabina'
 * @param o.alTerminar    función(exito) que se llama una sola vez al final
 */
export function crearMarco(escena, o) {
  const elementos = [];
  let terminado = false;
  let restante = o.segundos;

  const marco = {
    escena,
    activo: true,
    /** Agrega un objeto al minijuego (se dibuja encima y se borra al final). */
    agregar(obj) {
      obj.setDepth(PROFUNDIDAD + 1);
      elementos.push(obj);
      return obj;
    },
    /** Termina el minijuego (exito = true si se reparó). */
    terminar(exito) {
      if (terminado) return;
      terminado = true;
      marco.activo = false;
      reloj.remove();
      if (marco.alLimpiar) marco.alLimpiar();
      elementos.forEach((e) => e.destroy());
      o.alTerminar(exito);
    }
  };

  // Fondo que bloquea los clics a lo que está detrás
  marco.agregar(escena.add.rectangle(0, 0, ANCHO, ALTO, 0x000000, 0.7).setOrigin(0, 0).setInteractive());
  marco.agregar(panel(escena, 170, 90, 940, 560, 0x101a33));
  marco.agregar(texto(escena, ANCHO / 2, 100, `🔧 ${o.titulo}`, { tam: 26, negrita: true, origen: [0.5, 0], color: COLORES.aviso }));
  marco.agregar(texto(escena, ANCHO / 2, 140, o.instrucciones, { tam: 15, origen: [0.5, 0], align: 'center', ancho: 880, color: COLORES.texto }));

  // Cronómetro
  const etiqueta = marco.agregar(texto(escena, 200, 600, '', { tam: 15, negrita: true }));
  const b = barra(escena, 200, 625, 880, 14);
  marco.agregar(b.fondo);
  marco.agregar(b.relleno);

  const actualizarReloj = () => {
    const f = restante / o.segundos;
    etiqueta.setText(`${o.etiquetaTiempo}: ${Math.ceil(restante)} s`);
    etiqueta.setColor(f > 0.3 ? COLORES.texto : COLORES.mal);
    b.actualizar(f, f > 0.5 ? 'verde' : f > 0.25 ? 'amarillo' : 'rojo');
  };
  actualizarReloj();
  const reloj = escena.time.addEvent({
    delay: 100, loop: true,
    callback: () => {
      restante -= 0.1;
      actualizarReloj();
      if (restante <= 0) marco.terminar(false);
    }
  });

  return marco;
}

/** Mezcla una lista (copia) al azar. */
export function mezclar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
