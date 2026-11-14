// =============================================================
// ESCENA 3 — LANZAMIENTO Y RUTA
// Elegir cohete según la masa (si ninguno alcanza, no se puede lanzar)
// y la ruta: rápida (más combustible) o lenta (más eventos).
// Guarda en el estado: lanzamiento.coheteId, rutaId, costoCohete.
// =============================================================
import * as Phaser from 'phaser';
import { COHETES, buscarCohete } from '../systems/datos.js';
import { estado, destinoActual, registrar } from '../systems/estadoMision.js';
import { combustibleDeRuta } from '../systems/eventos.js';
import { ANCHO, ALTO, COLORES, texto, titulo, panel, boton, estrellas } from '../ui/ui.js';

export default class EscenaLanzamiento extends Phaser.Scene {
  constructor() {
    super('Lanzamiento');
  }

  create() {
    estrellas(this, 60);
    const destino = destinoActual();
    const nave = estado.nave;
    const restante = estado.presupuesto - nave.costo;
    estado.lanzamiento.coheteId = null;
    estado.lanzamiento.rutaId = null;

    titulo(this, 'Lanzamiento y ruta',
      `Paso 3 de 7 — Tu nave pesa ${nave.masaTotal} kg · Te quedan ${restante} M$ para el cohete`);

    // ---------- Cohetes ----------
    texto(this, 40, 100, 'Cohete', { tam: 22, negrita: true });
    const ordenados = [...COHETES].sort((a, b) => a.costo - b.costo);
    // El más barato que puede con la masa (sirve para la explicación final)
    const masBarato = ordenados.find((c) => c.capacidad[destino.id] >= nave.masaTotal);
    estado.lanzamiento.coheteMasBarato = masBarato ? masBarato.id : null;

    this.botonesCohete = {};
    let algunoValido = false;
    ordenados.forEach((c, i) => {
      const cap = c.capacidad[destino.id];
      const alcanzaMasa = cap >= nave.masaTotal;
      const alcanzaDinero = c.costo <= restante;
      let estadoTxt = '✔ Puede llevar tu nave';
      if (!alcanzaMasa) estadoTxt = `✖ Tu nave pesa ${nave.masaTotal - cap} kg de más`;
      else if (!alcanzaDinero) estadoTxt = `✖ Faltan ${c.costo - restante} M$`;
      const b = boton(this, 230, 160 + i * 80, 380, 66,
        `${c.nombre} — ${c.costo} M$\nLleva hasta ${cap} kg a ${destino.nombre}\n${estadoTxt}`,
        () => this.elegirCohete(c.id), { tam: 15 });
      b.setHabilitado(alcanzaMasa && alcanzaDinero);
      if (alcanzaMasa && alcanzaDinero) algunoValido = true;
      this.botonesCohete[c.id] = b;
    });

    if (!algunoValido) {
      panel(this, 40, 410, 380, 120, 0x3a1620);
      texto(this, 55, 422,
        'No puedes lanzar: ningún cohete que puedas pagar lleva una nave tan pesada. ' +
        'Vuelve al taller y quita masa (tanque, escudo, motor) o ahorra dinero.',
        { tam: 16, ancho: 350, color: COLORES.mal });
    }

    // ---------- Rutas ----------
    texto(this, 470, 100, 'Ruta', { tam: 22, negrita: true });
    this.botonesRuta = {};
    Object.entries(destino.juego.rutas).forEach(([id, ruta], i) => {
      const gasto = combustibleDeRuta(nave.masaTotal, ruta);
      const quedan = Math.max(0, nave.capacidadCombustible - gasto);
      const aviso = gasto > nave.capacidadCombustible ? '\n✖ ¡No alcanza el combustible!' : '';
      this.botonesRuta[id] = boton(this, 660, 175 + i * 120, 380, 104,
        `${ruta.nombre}\n${ruta.dias} días · ${ruta.eventos} eventos al azar\n` +
        `Gasta ~${gasto} kg de combustible → llegas con ${quedan} kg${aviso}`,
        () => this.elegirRuta(id),
        { tam: 15, alPasar: () => this.textoRuta.setText(ruta.descripcion) });
    });
    this.textoRuta = texto(this, 470, 420, 'Pasa el mouse sobre una ruta para ver su descripción.', {
      tam: 15, ancho: 380, color: COLORES.textoSuave
    });
    texto(this, 470, 480,
      'El combustible del viaje depende de la masa: una nave más pesada gasta más para acelerar y frenar. ' +
      'Lo que sobre es lo que tendrás para aterrizar.',
      { tam: 14, ancho: 380, color: COLORES.textoSuave });

    // ---------- Plataforma y cohete (dibujo simple) ----------
    this.add.rectangle(1050, ALTO - 120, 260, 20, 0x555b6e);
    this.cohete = this.add.container(1050, ALTO - 200);
    this.cohete.add(this.add.rectangle(0, 0, 36, 140, 0xdfe6f5));
    this.cohete.add(this.add.triangle(0, -90, 0, 0, 36, 0, 18, -40, 0xff6b6b).setOrigin(0.5, 0));
    this.cohete.add(this.add.rectangle(-24, 55, 12, 30, 0x9aa6c8));
    this.cohete.add(this.add.rectangle(24, 55, 12, 30, 0x9aa6c8));
    this.llama = this.add.triangle(0, 90, -14, 0, 14, 0, 0, 50, 0xffb347).setOrigin(0.5, 0).setVisible(false);
    this.cohete.add(this.llama);

    // ---------- Navegación ----------
    boton(this, 110, 690, 180, 40, '◀ Taller', () => this.scene.start('Taller'), { tam: 16 });
    this.botonLanzar = boton(this, ANCHO - 150, 690, 240, 44, '¡Lanzar! 🚀', () => this.lanzar(), { tam: 20 });
    this.botonLanzar.setHabilitado(false);
  }

  elegirCohete(id) {
    estado.lanzamiento.coheteId = id;
    Object.entries(this.botonesCohete).forEach(([cid, b]) => b.setSeleccionado(cid === id));
    this.revisar();
  }

  elegirRuta(id) {
    estado.lanzamiento.rutaId = id;
    Object.entries(this.botonesRuta).forEach(([rid, b]) => b.setSeleccionado(rid === id));
    this.revisar();
  }

  revisar() {
    this.botonLanzar.setHabilitado(!!estado.lanzamiento.coheteId && !!estado.lanzamiento.rutaId);
  }

  lanzar() {
    const cohete = buscarCohete(estado.lanzamiento.coheteId);
    estado.lanzamiento.costoCohete = cohete.costo;
    registrar('lanzamiento', `Cohete: ${cohete.nombre}. Ruta: ${estado.lanzamiento.rutaId}.`);
    this.botonLanzar.setHabilitado(false);

    // Animación simple del despegue y luego pasamos al viaje.
    this.llama.setVisible(true);
    this.tweens.add({
      targets: this.cohete,
      y: -250,
      duration: 2200,
      ease: 'Quad.easeIn',
      onComplete: () => this.scene.start('Viaje')
    });
  }
}
