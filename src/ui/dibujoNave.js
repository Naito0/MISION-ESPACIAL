// =============================================================
// dibujoNave.js — Dibujo 2D de la nave hecho solo con formas de Phaser.
// Cambia a medida que se agregan piezas: aparecen los paneles, la antena,
// los instrumentos, el motor, la cabina... Las piezas nuevas "brotan"
// con una pequeña animación.
//
// Uso:
//   const nave = crearDibujoNave(escena, x, y);
//   nave.actualizar(diseno);     // diseno = resultado de calcularDiseno()
//   nave.partes.paneles          // para resaltar piezas (por ejemplo, en averías)
// =============================================================

// Colores de cada tipo de pieza
const C = {
  casco: 0xc9d1e0, manta: 0xd9b44a, blindaje: 0x6c7385, panel: 0x1d3f8f, rejilla: 0x3a6fd8,
  antena: 0xe8ecff, motor: 0x8a8f9c, tanque: 0xa9b3c7, bateria: 0x3cc46e, chip: 0x2a2f3a,
  cabina: 0xdfe6f5, ventana: 0x7cc4ff
};
const COLOR_INSTRUMENTO = {
  cam_simple: 0x222831, cam_alta: 0x111111, termometro: 0xe5484d, espectrometro: 0x9b6bd6,
  detector_neutrones: 0x3cc46e, radar: 0xb0b8c8, cs_camara: 0x222831, cs_multi: 0x9b6bd6, cs_radiacion: 0xf2c14e
};

export function crearDibujoNave(escena, x, y) {
  const contenedor = escena.add.container(x, y);
  let piezasAnteriores = new Set();
  const nave = { contenedor, partes: {}, ancho: 0, alto: 0 };

  /** Redibuja la nave según el diseño. */
  nave.actualizar = (diseno) => {
    contenedor.removeAll(true);
    const partes = { paneles: [], instrumentos: [] };
    const de = (cat) => diseno.componentes.find((c) => c.categoria === cat) || null;
    const piezas = []; // { clave, objetos }
    const agregar = (clave, ...objetos) => {
      objetos.forEach((o) => contenedor.add(o));
      piezas.push({ clave, objetos });
      return objetos[0];
    };

    const est = de('estructura');
    const cubesat = est ? est.escala === 'cubesat' : false;
    // El CubeSat se dibuja más grande para que se vea bien (es una nave de 30 cm)
    contenedor.setScale(cubesat ? 1.7 : 1);

    // ---- Tamaño del cuerpo según la estructura ----
    let ancho = 90;
    let alto = 70;
    if (est) {
      if (cubesat) { ancho = est.capacidadMasa > 5 ? 60 : 36; alto = 80; }
      else { ancho = 80 + est.capacidadMasa / 30; alto = 60 + est.capacidadMasa / 50; }
    }
    nave.ancho = ancho;
    nave.alto = alto;
    const arriba = -alto / 2;
    const abajo = alto / 2;

    // ---- Propulsión: tobera debajo del cuerpo ----
    const prop = de('propulsion');
    if (prop && prop.combustible > 0) {
      const t = Math.min(40, 10 + prop.empuje / 300);
      partes.motor = agregar(`motor_${prop.id}`, escena.add.triangle(0, abajo + t / 2, -t / 2, t, t / 2, t, 0, 0, C.motor));
    }

    // ---- Paneles solares: alas a los costados (o franjas sobre el cuerpo en el CubeSat) ----
    const pan = de('paneles');
    if (pan) {
      if (pan.id === 'cs_pan_cuerpo') {
        for (let i = 0; i < 3; i++) {
          partes.paneles.push(agregar(`panel_${i}`, escena.add.rectangle(0, arriba + 14 + i * 24, ancho - 8, 16, C.panel).setStrokeStyle(1, C.rejilla)));
        }
      } else {
        const largo = cubesat ? 55 : 30 + 28 * Math.log2(1 + pan.energia / 60);
        const altoAla = alto * 0.55;
        for (const lado of [-1, 1]) {
          const cx = lado * (ancho / 2 + 6 + largo / 2);
          const brazo = escena.add.rectangle(lado * (ancho / 2 + 3), 0, 6, 4, C.motor);
          const ala = escena.add.rectangle(cx, 0, largo, altoAla, C.panel).setStrokeStyle(1, C.rejilla);
          const lineas = [];
          for (let k = 1; k < 4; k++) {
            lineas.push(escena.add.rectangle(cx - largo / 2 + (largo / 4) * k, 0, 1, altoAla, C.rejilla));
          }
          partes.paneles.push(agregar(`ala_${lado}_${pan.id}`, ala, brazo, ...lineas));
        }
      }
    }

    // ---- Cuerpo (casco) ----
    const termica = de('termica');
    const aislado = termica && (termica.efectos || []).includes('aislamiento');
    const blindado = est && (est.efectos || []).includes('impactos');
    const cuerpo = escena.add.rectangle(0, 0, ancho, alto, aislado ? C.manta : C.casco)
      .setStrokeStyle(blindado ? 6 : 2, blindado ? C.blindaje : 0x8a8f9c);
    partes.casco = agregar(`casco_${est ? est.id : 'x'}_${aislado}`, cuerpo);
    if (cubesat) {
      // Líneas que marcan las "unidades" (U) del CubeSat
      const unidades = Math.round(alto / 27);
      for (let i = 1; i < unidades; i++) agregar(`u_${i}`, escena.add.rectangle(0, arriba + (alto / unidades) * i, ancho, 1, 0x8a8f9c));
    }

    // ---- Interior visible: batería, computadora, tanque, ruedas ----
    const bat = de('baterias');
    if (bat) agregar(`bat_${bat.id}`, escena.add.rectangle(-ancho / 4, abajo - 12, Math.min(ancho / 3, 8 + bat.capacidadWh / 40), 8, C.bateria));
    const avi = de('avionica');
    if (avi) agregar(`avi_${avi.id}`, escena.add.rectangle(ancho / 4, abajo - 12, 10, 8, C.chip).setStrokeStyle(1, 0x7cc4ff));
    if (prop && prop.combustible > 1) {
      agregar(`tanque_${prop.id}`, escena.add.circle(0, 4, Math.min(alto / 2.6, 6 + Math.sqrt(prop.combustible)), C.tanque).setStrokeStyle(1, 0x6c7385));
    }
    const act = de('actitud');
    if (act && act.precision >= 1) {
      agregar(`act_${act.id}`, escena.add.rectangle(ancho / 2 - 6, arriba + 10, 8, 12, act.precision > 1 ? 0xf2c14e : 0x9aa6c8));
    }

    // ---- Cabina de la tripulación (soporte vital) ----
    let techo = arriba;
    const sop = de('soporte');
    if (sop) {
      const altoCabina = 34;
      const cabina = escena.add.rectangle(0, arriba - altoCabina / 2, ancho * 0.8, altoCabina, C.cabina).setStrokeStyle(2, 0x8a8f9c);
      const ventanas = [-1, 0, 1].map((k) => escena.add.circle(k * ancho * 0.22, arriba - altoCabina / 2, 5, C.ventana));
      partes.cabina = agregar(`cabina_${sop.id}`, cabina, ...ventanas);
      techo = arriba - altoCabina;
    }

    // ---- Antena arriba ----
    const ant = de('antena');
    if (ant) {
      if (ant.id === 'cs_uhf') {
        partes.antena = agregar(`ant_${ant.id}`, escena.add.rectangle(ancho / 3, techo - 20, 2, 40, C.antena));
      } else {
        const tam = cubesat ? 16 : 14 + ant.tasa / 2;
        const mastil = escena.add.rectangle(0, techo - 10, 4, 20, C.antena);
        const plato = escena.add.ellipse(0, techo - 20 - tam / 6, tam * 1.6, tam / 2.2, C.antena).setStrokeStyle(1, 0x9aa6c8);
        partes.antena = agregar(`ant_${ant.id}`, plato, mastil);
      }
    }

    // ---- Instrumentos: debajo del cuerpo, uno al lado del otro ----
    const instrumentos = diseno.componentes.filter((c) => c.categoria === 'instrumentos');
    instrumentos.forEach((inst, i) => {
      const sep = Math.min(26, (ancho - 10) / Math.max(1, instrumentos.length));
      const ix = (i - (instrumentos.length - 1) / 2) * sep;
      const color = COLOR_INSTRUMENTO[inst.id] || 0xffffff;
      const forma = inst.id.includes('cam') || inst.id === 'termometro'
        ? escena.add.circle(ix, abajo + 6, cubesat ? 4 : 7, color).setStrokeStyle(2, 0xe8ecff)
        : escena.add.rectangle(ix, abajo + 6, cubesat ? 8 : 14, cubesat ? 6 : 10, color).setStrokeStyle(1, 0xe8ecff);
      partes.instrumentos.push(agregar(`inst_${inst.id}`, forma));
    });

    // ---- Animación: las piezas nuevas "brotan" ----
    const clavesNuevas = new Set(piezas.map((p) => p.clave));
    for (const p of piezas) {
      if (piezasAnteriores.size > 0 && !piezasAnteriores.has(p.clave)) {
        p.objetos.forEach((o) => {
          const sx = o.scaleX;
          const sy = o.scaleY;
          o.setScale(0.1);
          escena.tweens.add({ targets: o, scaleX: sx, scaleY: sy, duration: 350, ease: 'Back.easeOut' });
        });
      }
    }
    piezasAnteriores = clavesNuevas;
    nave.partes = partes;
  };

  /** Posición en pantalla de una pieza (para efectos como el escudo o los paquetes de datos). */
  nave.posicionDe = (objeto) => {
    const m = objeto.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  };

  return nave;
}
