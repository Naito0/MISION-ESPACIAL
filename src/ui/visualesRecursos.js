// =============================================================
// visualesRecursos.js — Metáforas visuales en lugar de números:
//   ⚡ energía     → una batería que se llena o se vacía
//   🪙 presupuesto → una fila de monedas (las que te quedan brillan)
//   🚀 masa        → un cohete que tiembla y echa más humo si pesa mucho
//   📦 datos       → paquetes que viajan hacia la Tierra (o se caen)
// Cada visual tiene actualizar(barra) con una barra de construirBarras().
// =============================================================
import { COLOR_NIVEL } from './ui.js';

const ORO = 0xf2c14e;
const GRIS = 0x3a3f4d;

/** Crea el visual de un recurso en (x, y) con un ancho dado. */
export function crearVisual(escena, tipo, x, y, ancho) {
  const fabricas = { energia: bateria, presupuesto: monedas, masa: cohete, datos: paquetes };
  return (fabricas[tipo] || bateria)(escena, x, y, ancho);
}

// ---------- ⚡ Batería ----------
function bateria(escena, x, y) {
  const cuerpo = escena.add.rectangle(x, y, 120, 26, 0x1a2140).setOrigin(0, 0).setStrokeStyle(2, 0xdfe6f5);
  const punta = escena.add.rectangle(x + 121, y + 8, 6, 10, 0xdfe6f5).setOrigin(0, 0);
  const carga = escena.add.rectangle(x + 3, y + 3, 114, 20, COLOR_NIVEL.verde).setOrigin(0, 0);
  carga.scaleX = 0;
  const rayo = escena.add.text(x + 60, y + 13, '⚡', { fontSize: '16px' }).setOrigin(0.5);
  let parpadeo = null;
  return {
    objetos: [cuerpo, punta, carga, rayo],
    actualizar(b) {
      // Nivel: generación / consumo. Si consume más de lo que genera, la batería se vacía
      const nivel = b.ratio > 0 ? Math.max(0.05, Math.min(1, 1 / b.ratio / 1.5)) : 1;
      escena.tweens.add({ targets: carga, scaleX: nivel, duration: 400, ease: 'Cubic.easeOut' });
      carga.setFillStyle(COLOR_NIVEL[b.nivel]);
      if (parpadeo) { parpadeo.stop(); parpadeo = null; carga.setAlpha(1); }
      if (b.nivel === 'rojo') parpadeo = escena.tweens.add({ targets: carga, alpha: 0.3, duration: 350, yoyo: true, repeat: -1 });
    }
  };
}

// ---------- 🪙 Monedas ----------
function monedas(escena, x, y) {
  const lista = [];
  for (let i = 0; i < 10; i++) {
    const m = escena.add.circle(x + 12 + i * 26, y + 13, 10, ORO).setStrokeStyle(2, 0xb8892a);
    lista.push(m);
  }
  return {
    objetos: lista,
    actualizar(b) {
      // Monedas que te quedan = presupuesto sin gastar
      const quedan = Math.max(0, Math.round((1 - b.ratio) * 10));
      lista.forEach((m, i) => {
        const llena = i < quedan;
        m.setFillStyle(b.nivel === 'rojo' ? 0x7a2a2a : llena ? ORO : GRIS);
        m.setStrokeStyle(2, llena ? 0xb8892a : 0x2a2f3a);
      });
      if (b.nivel === 'rojo') escena.tweens.add({ targets: lista, y: y + 9, duration: 80, yoyo: true, repeat: 2 });
    }
  };
}

// ---------- 🚀 Cohete que se esfuerza ----------
function cohete(escena, x, y, ancho) {
  const cx = x + 60;
  const cuerpo = escena.add.rectangle(cx, y + 13, 30, 14, 0xe8ecff).setStrokeStyle(1, 0x9aa6c8);
  const nariz = escena.add.triangle(cx + 22, y + 13, 0, 0, 0, 14, 14, 7, 0xff6b6b);
  const llama = escena.add.triangle(cx - 22, y + 13, 14, 0, 14, 14, 0, 7, 0xffb347);
  const pista = escena.add.rectangle(x + 100, y + 13, ancho - 130, 4, 0x2a3150).setOrigin(0, 0.5);
  const humo = [];
  let nivel = 0;
  let ratio = 0;
  // Humo y temblor según cuánto pesa la nave
  const evento = escena.time.addEvent({
    delay: 120, loop: true,
    callback: () => {
      if (!cuerpo.visible) return;
      const intensidad = Math.min(1.5, ratio);
      cuerpo.y = nariz.y = llama.y = y + 13 + (Math.random() - 0.5) * 6 * intensidad;
      llama.setScale(0.6 + intensidad * 0.8, 1);
      if (Math.random() < intensidad * 0.8) {
        const h = escena.add.circle(cx - 30, y + 13, 3 + intensidad * 3, 0xbfc4cc, 0.6);
        humo.push(h);
        escena.tweens.add({ targets: h, x: h.x - 15 - intensidad * 10, scale: 2, alpha: 0, duration: 600, onComplete: () => h.destroy() });
      }
    }
  });
  return {
    objetos: [cuerpo, nariz, llama, pista],
    actualizar(b) { ratio = b.ratio; nivel = b.nivel; return nivel; },
    destruir() { evento.remove(); }
  };
}

// ---------- 📦 Paquetes de datos ----------
function paquetes(escena, x, y, ancho) {
  const nave = escena.add.rectangle(x + 8, y + 13, 14, 10, 0xdfe6f5);
  const tierra = escena.add.circle(x + ancho - 30, y + 13, 11, 0x2f6fd6);
  let ratio = 0;
  let generan = false;
  const evento = escena.time.addEvent({
    delay: 450, loop: true,
    callback: () => {
      if (!nave.visible || !generan) return;
      // Si se genera más de lo que se puede enviar, algunos paquetes se caen
      const seCae = ratio > 1 && Math.random() < Math.min(0.8, ratio - 0.8);
      const p = escena.add.rectangle(nave.x + 10, nave.y, 7, 7, seCae ? 0xe5484d : 0x7cf3ff).setAngle(45);
      escena.tweens.add(seCae
        ? { targets: p, x: p.x + (tierra.x - p.x) * 0.45, y: p.y + 22, alpha: 0, duration: 800, onComplete: () => p.destroy() }
        : { targets: p, x: tierra.x - 10, duration: 1000, onComplete: () => p.destroy() });
    }
  });
  return {
    objetos: [nave, tierra],
    actualizar(b) { ratio = b.ratio; generan = b.usado > 0; },
    destruir() { evento.remove(); }
  };
}
