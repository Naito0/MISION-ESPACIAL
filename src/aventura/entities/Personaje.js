// =============================================================
// Personaje.js — Los 4 personajes ORIGINALES del equipo, hechos con formas 3D
// (sin modelos descargados): Kelvin (pingüino), Faro (venado), Zuri (zorra del
// desierto) y Tuerca (mapache). Datos en src/data/personajes.json.
//
// Estilo caricatura: cabeza grande y cuerpo chico, sombreado "toon" (3 tonos)
// y contorno negro (una copia de cada pieza, un poco más grande y por dentro).
// - El animal usa sus colores naturales; el TRAJE y la MOCHILA, el color del ROL.
// - Burbuja de casco transparente (más grande en Faro, por los cuernos).
// - Ojos que parpadean y boca con expresiones: feliz, asustado, dormido.
// - Estirar y aplastar al caminar y al saltar; con gravedad baja (Luna, Marte)
//   flota en el aire y aterriza más despacio.
// - Gag propio en reposo y reacción a las alarmas.
// - Emotes (teclas 5-8): saludar, bailar, reír y su gag.
//
// Tiene la misma "forma" que el astronauta viejo: raiz, reproducir(), mantener(),
// actualizar(dt, estado), accion y desmayado. Así el resto del juego no cambia.
// =============================================================
import * as THREE from 'three';
import personajesJSON from '../../data/personajes.json';

export const PERSONAJES = personajesJSON.personajes;
export const EMOTES = ['saludar', 'bailar', 'reir', 'gag'];

// ---------- Materiales (compartidos para no gastar memoria) ----------
const gradiente = (() => {
  const t = new THREE.DataTexture(new Uint8Array([95, 175, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
  return t;
})();
const materiales = new Map();
function toon(color) {
  const k = String(color);
  if (!materiales.has(k)) materiales.set(k, new THREE.MeshToonMaterial({ color: new THREE.Color(color), gradientMap: gradiente }));
  return materiales.get(k);
}
const CONTORNO = new THREE.MeshBasicMaterial({ color: 0x15131c, side: THREE.BackSide });
const NEGRO = new THREE.MeshBasicMaterial({ color: 0x15131c });
const BLANCO = new THREE.MeshBasicMaterial({ color: 0xffffff });
const VIDRIO = new THREE.MeshPhongMaterial({ color: 0xd6f1ff, transparent: true, opacity: 0.2, shininess: 140, specular: 0xffffff, depthWrite: false });
const ESFERA = new THREE.SphereGeometry(1, 20, 14);
const ESFERA_BAJA = new THREE.SphereGeometry(1, 12, 8);
const CAPSULA = new THREE.CapsuleGeometry(1, 1, 6, 12);

/** Una pieza con sombreado toon y contorno negro. */
function pieza(padre, geo, color, { pos = [0, 0, 0], esc = [1, 1, 1], rot = [0, 0, 0], contorno = 1.09, mat = null } = {}) {
  const m = new THREE.Mesh(geo, mat || toon(color));
  m.position.set(...pos);
  m.scale.set(...(Array.isArray(esc) ? esc : [esc, esc, esc]));
  m.rotation.set(...rot);
  m.castShadow = true;
  if (contorno) { const o = new THREE.Mesh(geo, CONTORNO); o.scale.setScalar(contorno); m.add(o); }
  padre.add(m);
  return m;
}
const suave = (actual, meta, k) => actual + (meta - actual) * k;
const azar = (a, b) => a + Math.random() * (b - a);

/** Cartelito de texto sobre la cabeza ("¡Achís!", "Brrr…"). */
function crearTexto() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(1.6, 0.3, 1);
  s.renderOrder = 11;
  s.visible = false;
  s.escribir = (t) => {
    const g = c.getContext('2d');
    g.clearRect(0, 0, 512, 96);
    g.font = 'bold 44px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const ancho = g.measureText(t).width;
    if (ancho > 440) g.font = `bold ${Math.floor(44 * 440 / ancho)}px Arial`; // frases largas: letra más chica
    const w = Math.min(500, g.measureText(t).width + 40);
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.roundRect(256 - w / 2, 8, w, 80, 30); g.fill();
    g.lineWidth = 5; g.strokeStyle = '#15131c'; g.stroke();
    g.fillStyle = '#15131c'; g.fillText(t, 256, 50);
    tex.needsUpdate = true;
  };
  return s;
}

export class Personaje {
  /** idPersonaje: 'kelvin' | 'faro' | 'zuri' | 'tuerca' · colorRol: color del traje y la mochila */
  constructor(idPersonaje, colorRol = 0x7cc4ff) {
    this.datos = PERSONAJES.find((p) => p.id === idPersonaje) || PERSONAJES[0];
    this.id = this.datos.id;
    const C = this.datos.colores;
    this.raiz = new THREE.Group();
    this.cuerpo = new THREE.Group(); // se estira y se aplasta desde los pies
    this.raiz.add(this.cuerpo);
    const traje = colorRol;
    const trajeOscuro = new THREE.Color(colorRol).multiplyScalar(0.55).getHex();
    const manos = this.id === 'kelvin' ? C.pelo : C.patas;

    // ---- Piernas y pies ----
    this.piernas = [-1, 1].map((s) => {
      const p = new THREE.Group(); p.position.set(0.12 * s, 0.33, 0); this.cuerpo.add(p);
      pieza(p, CAPSULA, traje, { pos: [0, -0.12, 0], esc: [0.075, 0.065, 0.075] });
      pieza(p, ESFERA_BAJA, C.patas, { pos: [0, -0.27, 0.05], esc: [0.095, 0.06, 0.14] });
      return p;
    });
    // ---- Cuerpo (traje), cinturón y mochila ----
    this.torso = pieza(this.cuerpo, ESFERA, traje, { pos: [0, 0.55, 0], esc: [0.29, 0.29, 0.25] });
    pieza(this.cuerpo, new THREE.TorusGeometry(0.27, 0.035, 8, 24), trajeOscuro, { pos: [0, 0.45, 0], rot: [Math.PI / 2, 0, 0], contorno: 0 });
    pieza(this.cuerpo, ESFERA_BAJA, 0xffffff, { pos: [0.1, 0.66, 0.23], esc: [0.05, 0.05, 0.02], contorno: 1.2 }); // parche
    this.mochila = new THREE.Group(); this.mochila.position.set(0, 0.6, -0.25); this.cuerpo.add(this.mochila);
    pieza(this.mochila, CAPSULA, traje, { esc: [0.16, 0.09, 0.1] });
    pieza(this.mochila, ESFERA_BAJA, trajeOscuro, { pos: [0, -0.02, -0.09], esc: [0.1, 0.12, 0.03], contorno: 0 });
    this.luces = [-1, 1].map((s) => pieza(this.mochila, ESFERA_BAJA, 0, { pos: [0.08 * s, 0.14, -0.08], esc: 0.025, contorno: 0, mat: new THREE.MeshBasicMaterial({ color: s > 0 ? 0x5be08a : 0xffd166 }) }));
    // ---- Brazos y manos ----
    this.brazos = [-1, 1].map((s) => {
      const b = new THREE.Group(); b.position.set(0.28 * s, 0.72, 0); this.cuerpo.add(b);
      pieza(b, CAPSULA, traje, { pos: [0, -0.14, 0], esc: [0.062, 0.065, 0.062] });
      pieza(b, ESFERA_BAJA, manos, { pos: [0, -0.31, 0], esc: 0.075 });
      return b;
    });
    this.mano = new THREE.Group(); this.mano.position.set(0, -0.36, 0.04); this.brazos[1].add(this.mano);
    // Objetos que puede tener en la mano: un tornillo brillante y una llave
    this.tornillo = new THREE.Group();
    pieza(this.tornillo, new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), 0xffd34d, { contorno: 1.3 });
    pieza(this.tornillo, new THREE.CylinderGeometry(0.04, 0.04, 0.025, 6), 0xffd34d, { pos: [0, 0.07, 0], contorno: 1.3 });
    this.llave = new THREE.Group();
    pieza(this.llave, new THREE.BoxGeometry(0.035, 0.2, 0.02), 0xc9d3e0, { contorno: 1.25 });
    pieza(this.llave, new THREE.TorusGeometry(0.045, 0.016, 6, 12, Math.PI * 1.6), 0xc9d3e0, { pos: [0, 0.12, 0], contorno: 1.3 });
    this.tornillo.visible = false; this.llave.visible = false;
    this.mano.add(this.tornillo, this.llave);
    // Cuello del traje (donde se apoya la burbuja)
    pieza(this.cuerpo, new THREE.TorusGeometry(0.19, 0.05, 8, 24), trajeOscuro, { pos: [0, 0.83, 0], rot: [Math.PI / 2, 0, 0] });

    // ---- Cabeza grande ----
    this.cabeza = new THREE.Group(); this.cabeza.position.set(0, 1.12, 0); this.cuerpo.add(this.cabeza);
    pieza(this.cabeza, ESFERA, C.pelo, { esc: [0.33, 0.31, 0.3] });
    // Ojos (blanco, pupila y brillo) y boca con 3 expresiones
    this.ojos = new THREE.Group(); this.ojos.position.set(0, 0.04, 0.24); this.cabeza.add(this.ojos);
    this.ojo = [-1, 1].map((s) => {
      const o = new THREE.Group(); o.position.set(0.11 * s, 0, 0); this.ojos.add(o);
      pieza(o, ESFERA, 0xffffff, { esc: [0.08, 0.09, 0.06], contorno: 1.15 });
      pieza(o, ESFERA_BAJA, 0, { pos: [0, -0.005, 0.045], esc: [0.045, 0.055, 0.03], contorno: 0, mat: NEGRO });
      pieza(o, ESFERA_BAJA, 0, { pos: [0.018, 0.025, 0.07], esc: 0.015, contorno: 0, mat: BLANCO });
      return o;
    });
    this.boca = new THREE.Group(); this.boca.position.set(0, -0.13, 0.27); this.cabeza.add(this.boca);
    this.bocas = {
      feliz: new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.013, 6, 14, Math.PI), NEGRO),
      asustado: new THREE.Mesh(ESFERA_BAJA, NEGRO),
      dormido: new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.01), NEGRO)
    };
    this.bocas.feliz.rotation.z = Math.PI;
    this.bocas.asustado.scale.set(0.035, 0.05, 0.02);
    Object.values(this.bocas).forEach((b) => this.boca.add(b));

    // ---- Lo propio de cada animal ----
    let radioBurbuja = 0.5; let altoBurbuja = 0.02;
    if (this.id === 'kelvin') {
      pieza(this.cabeza, ESFERA, C.cara, { pos: [0, -0.03, 0.17], esc: [0.25, 0.23, 0.15], contorno: 0 });
      pieza(this.cabeza, new THREE.ConeGeometry(0.06, 0.15, 10), C.pico, { pos: [0, -0.07, 0.34], rot: [Math.PI / 2, 0, 0] });
      this.boca.position.set(0, -0.16, 0.28);
      pieza(this.cabeza, new THREE.BoxGeometry(0.13, 0.04, 0.02), C.tirita, { pos: [0.16, 0.17, 0.22], rot: [-0.5, 0.4, 0.6], contorno: 1.2 }); // tirita
      pieza(this.cuerpo, new THREE.TorusGeometry(0.2, 0.055, 8, 20), C.bufanda, { pos: [0, 0.86, 0], rot: [Math.PI / 2, 0, 0] });
      pieza(this.cuerpo, new THREE.BoxGeometry(0.09, 0.22, 0.04), C.bufanda, { pos: [0.12, 0.75, 0.2], rot: [0.2, 0, 0.3] });
    } else if (this.id === 'faro') {
      pieza(this.cabeza, ESFERA, C.cara, { pos: [0, -0.1, 0.22], esc: [0.15, 0.12, 0.13] });
      pieza(this.cabeza, ESFERA_BAJA, C.nariz, { pos: [0, -0.06, 0.35], esc: 0.045, contorno: 0 });
      this.boca.position.set(0, -0.17, 0.32);
      [-1, 1].forEach((s) => pieza(this.cabeza, ESFERA, C.orejas, { pos: [0.31 * s, 0.07, -0.02], esc: [0.06, 0.14, 0.035], rot: [0, 0, -1.15 * s] }));
      this.cuernos = new THREE.Group(); this.cabeza.add(this.cuernos);
      [-1, 1].forEach((s) => {
        const tronco = new THREE.CylinderGeometry(0.018, 0.026, 0.32, 8);
        pieza(this.cuernos, tronco, C.cuernos, { pos: [0.13 * s, 0.4, 0], rot: [0, 0, -0.35 * s], contorno: 1.25 });
        pieza(this.cuernos, new THREE.CylinderGeometry(0.014, 0.02, 0.16, 8), C.cuernos, { pos: [0.16 * s, 0.44, 0.05], rot: [0.6, 0, 0.5 * s], contorno: 1.25 });
        pieza(this.cuernos, new THREE.CylinderGeometry(0.014, 0.02, 0.15, 8), C.cuernos, { pos: [0.24 * s, 0.53, -0.02], rot: [-0.3, 0, -0.9 * s], contorno: 1.25 });
      });
      radioBurbuja = 0.68; altoBurbuja = 0.14;
    } else if (this.id === 'zuri') {
      pieza(this.cabeza, new THREE.ConeGeometry(0.12, 0.22, 14), C.cara, { pos: [0, -0.09, 0.3], rot: [Math.PI / 2, 0, 0] });
      pieza(this.cabeza, ESFERA_BAJA, C.nariz, { pos: [0, -0.09, 0.42], esc: 0.035, contorno: 0 });
      this.boca.position.set(0, -0.2, 0.27);
      this.orejas = [-1, 1].map((s) => {
        const o = new THREE.Group(); o.position.set(0.16 * s, 0.2, -0.02); o.rotation.z = -0.35 * s; this.cabeza.add(o);
        pieza(o, new THREE.ConeGeometry(0.12, 0.4, 14), C.pelo, { pos: [0, 0.18, 0] });
        pieza(o, new THREE.ConeGeometry(0.08, 0.3, 12), C.orejas, { pos: [0, 0.15, 0.04], contorno: 0 });
        return o;
      });
      radioBurbuja = 0.6; altoBurbuja = 0.1;
      const cola = new THREE.Group(); cola.position.set(0, 0.32, -0.28); cola.rotation.x = -0.7; this.cuerpo.add(cola);
      pieza(cola, ESFERA, C.pelo, { pos: [0, 0, -0.18], esc: [0.1, 0.1, 0.22] });
      pieza(cola, ESFERA_BAJA, C.cola, { pos: [0, 0, -0.39], esc: [0.07, 0.07, 0.08] });
      this.cola = cola;
    } else if (this.id === 'tuerca') {
      pieza(this.cabeza, ESFERA, C.antifaz, { pos: [0, 0.05, 0.16], esc: [0.3, 0.1, 0.15], contorno: 0 });
      this.ojos.position.z = 0.27;
      pieza(this.cabeza, ESFERA, C.cara, { pos: [0, -0.11, 0.22], esc: [0.14, 0.1, 0.12] });
      pieza(this.cabeza, ESFERA_BAJA, C.nariz, { pos: [0, -0.07, 0.34], esc: 0.04, contorno: 0 });
      this.boca.position.set(0, -0.17, 0.31);
      [-1, 1].forEach((s) => {
        pieza(this.cabeza, ESFERA, C.pelo, { pos: [0.21 * s, 0.24, -0.02], esc: [0.085, 0.085, 0.04] });
        pieza(this.cabeza, ESFERA_BAJA, C.cara, { pos: [0.21 * s, 0.24, 0.015], esc: [0.05, 0.05, 0.02], contorno: 0 });
      });
      const cola = new THREE.Group(); cola.position.set(0, 0.32, -0.27); cola.rotation.x = -0.9; this.cuerpo.add(cola);
      for (let i = 0; i < 5; i++) pieza(cola, ESFERA_BAJA, i % 2 ? C.cola : C.pelo, { pos: [0, 0, -0.08 - i * 0.075], esc: [0.085, 0.085, 0.06] });
      this.cola = cola;
    }
    // ---- Burbuja de casco ----
    this.burbuja = new THREE.Mesh(ESFERA, VIDRIO);
    this.burbuja.scale.setScalar(radioBurbuja);
    this.burbuja.position.y = altoBurbuja;
    this.burbuja.renderOrder = 5;
    this.cabeza.add(this.burbuja);
    if (this.id === 'kelvin') { // escarcha: el casco se le congela de a poco
      this.escarcha = new THREE.Mesh(ESFERA, new THREE.MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0, depthWrite: false }));
      this.escarcha.scale.setScalar(radioBurbuja * 1.01);
      this.escarcha.position.y = altoBurbuja;
      this.escarcha.renderOrder = 6;
      this.cabeza.add(this.escarcha);
    }
    this.texto = crearTexto();
    this.texto.position.y = 2.05;
    this.raiz.add(this.texto);
    this.raiz.traverse((o) => { if (o.isMesh && o.material !== CONTORNO) o.castShadow = o.material !== VIDRIO; });

    // ---- Estado de la animación ----
    this.t = Math.random() * 10;
    this.fase = 0;
    this.accion = null;          // { nombre, tiempo, duracion }
    this.reaccion = null;        // alarma, señal, cuernos
    this.desmayado = false;
    this.gravedad = 9.81;        // la pone JugadorLocal (Luna 1,62 · Marte 3,71)
    this.apoyadoAntes = true;
    this.tAire = 0;
    this.aterrizaje = 0; this.durAterrizaje = 0.25;
    this.parpadeo = azar(1, 4);
    this.gagEn = azar(8, 14);
    this.textoHasta = 0;
    this.llaveHasta = 0;
    this.expresion('feliz');
  }

  // ---------- Lo que usa el resto del juego ----------
  reproducir(nombre, duracion = 0.8) {
    if (nombre === 'desmayarse') { this.desmayado = true; return; }
    if (nombre === 'levantarse') { this.desmayado = false; return; }
    this.accion = { nombre, tiempo: 0, duracion };
  }

  mantener(nombre) {
    if (!this.accion || this.accion.nombre !== nombre) this.accion = { nombre, tiempo: 0, duracion: 0.3 };
    else this.accion.duracion = Math.max(this.accion.duracion, this.accion.tiempo + 0.3);
  }

  /** Emote n = 0..3 (teclas 5-8): saludar, bailar, reír y su gag. */
  emote(n) {
    const e = EMOTES[n];
    if (!e || this.desmayado) return;
    this.reproducir(`emote:${e}`, e === 'gag' ? 2.4 : 2.2);
  }

  /** Animación corta de presentación (en la sala, al elegirlo). */
  presentar() { this.reproducir('emote:presentar', 2); }

  /** Suena una alarma: cada uno reacciona a su manera. */
  alarma() {
    if (this.desmayado) return;
    const dur = this.id === 'faro' ? 2.6 : 1.6;
    this.reaccion = { tipo: 'alarma', tiempo: 0, duracion: dur };
    if (this.id === 'faro') this.decir('😳 …');
    if (this.id === 'kelvin') this.decir('¡B-b-brrr!');
    if (this.id === 'tuerca') { this.decir('¡Tengo la pieza justa!'); this.llaveHasta = this.t + 6; }
    if (this.id === 'zuri') this.decir('¡Escucho algo!');
  }

  /** Llegó una señal: las orejas de Zuri giran como antenas. */
  senal() { if (this.id === 'zuri') { this.reaccion = { tipo: 'senal', tiempo: 0, duracion: 2.5 }; this.decir('📡 ¡Señal!'); } }

  /** Pasó por una puerta: a Faro se le traban los cuernos. */
  puerta() { if (this.id === 'faro' && !this.reaccion) { this.reaccion = { tipo: 'cuernos', tiempo: 0, duracion: 0.9 }; this.decir('¡Ay, mis cuernos!'); } }

  decir(t, segundos = 1.6) { this.texto.escribir(t); this.texto.visible = true; this.textoHasta = this.t + segundos; }

  expresion(nombre) {
    if (this.expresionActual === nombre) return;
    this.expresionActual = nombre;
    for (const [k, m] of Object.entries(this.bocas)) m.visible = k === nombre;
  }

  // ---------- Animación ----------
  actualizar(dt, e) {
    this.t += dt;
    const t = this.t;
    const k = 1 - Math.exp(-14 * dt);
    const bajo = this.gravedad < 5; // Luna o Marte: saltos flotantes
    const vel = e.velocidad || 0;
    if (this.textoHasta && t > this.textoHasta) { this.texto.visible = false; this.textoHasta = 0; }

    // Metas de la pose (luego se suavizan)
    const P = { piernas: [0, 0], brazosX: [0, 0], brazosZ: [-0.12, 0.12], cabX: 0, cabY: 0, cabZ: 0, cuerpoX: 0, cuerpoY: 0, cuerpoZ: 0 };
    let sy = 1; let by = 0; let ojos = 1; let boca = 'feliz'; let temblor = this.id === 'kelvin' ? 0.006 : 0;
    let congelado = false;
    this.tornillo.visible = false;
    this.llave.visible = this.t < this.llaveHasta;

    // Aire y aterrizaje (estirar y aplastar)
    if (!e.apoyado) this.tAire += dt;
    if (e.apoyado && !this.apoyadoAntes && this.tAire > 0.15) { this.durAterrizaje = bajo ? 0.45 : 0.25; this.aterrizaje = this.durAterrizaje; }
    if (e.apoyado) this.tAire = 0;
    this.apoyadoAntes = e.apoyado;

    if (this.desmayado) {
      // Desmayado: acostado de espaldas, dormido
      this.cuerpo.rotation.x = suave(this.cuerpo.rotation.x, -Math.PI / 2, k);
      this.cuerpo.position.y = suave(this.cuerpo.position.y, 0.28, k);
      this.expresion('dormido');
      this.ojo.forEach((o) => { o.scale.y = suave(o.scale.y, 0.1, k); });
      this.cuerpo.scale.set(1, 1, 1);
      return;
    }
    if (!e.apoyado) {
      const vv = e.velocidadVertical || 0;
      sy = 1 + THREE.MathUtils.clamp(vv * (bajo ? 0.02 : 0.035), -0.12, 0.18);
      if (bajo) { // flota: brazos abiertos que "nadan" y piernas en bicicleta lenta
        P.brazosZ = [-1.1 + Math.sin(t * 2) * 0.3, 1.1 - Math.sin(t * 2) * 0.3];
        P.piernas = [Math.sin(t * 3) * 0.4, -Math.sin(t * 3) * 0.4];
        boca = 'asustado'; ojos = 1.15;
      } else { P.brazosZ = [-2.2, 2.2]; P.piernas = [-0.4, -0.4]; }
    } else if (vel > 0.3) {
      // Caminar: pasos con rebote y un poco de aplastamiento
      const f = Math.min(1, vel / 3);
      this.fase += dt * (3.5 + vel * 1.8);
      const sw = Math.sin(this.fase) * 0.75 * f;
      P.piernas = [sw, -sw];
      P.brazosX = [-sw * 0.9, sw * 0.9];
      by = Math.abs(Math.sin(this.fase)) * 0.06 * f;
      sy = 1 + Math.cos(this.fase * 2) * 0.05 * f;
      P.cuerpoX = 0.12 * f;
      P.cabZ = Math.sin(this.fase) * 0.06 * f;
    } else {
      sy = 1 + Math.sin(t * 2.2) * 0.015; // respira
      // Orejas de Zuri: se mueven solas como antenas cada tanto
      if (this.orejas) { const tic = Math.sin(t * 0.9) > 0.97 ? Math.sin(t * 40) * 0.25 : 0; this.orejas.forEach((o, i) => { o.rotation.x = tic * (i ? 1 : -1); }); }
      // Gag de reposo cada 8-14 s
      if (!this.accion && !this.reaccion) {
        this.gagEn -= dt;
        if (this.gagEn <= 0) { this.gagEn = azar(9, 16); this.reproducir('emote:gag', 2.4); }
      }
    }
    if (this.aterrizaje > 0) {
      this.aterrizaje -= dt;
      sy *= 1 - 0.25 * Math.max(0, this.aterrizaje / this.durAterrizaje);
    }

    // Acciones (consolas, recoger, emotes)
    if (this.accion) {
      const a = this.accion;
      a.tiempo += dt;
      const tau = a.tiempo;
      const n = a.nombre;
      if (n === 'interactuar' || n === 'motor') {
        P.brazosX = [-1.25 + Math.sin(t * 14) * 0.15, -1.25 + Math.sin(t * 14 + 2) * 0.15]; P.brazosZ = [-0.25, 0.25];
      } else if (n === 'reparar') {
        P.brazosX = [-0.9, -1.7 + Math.sin(t * 12) * 0.5];
        if (this.id === 'tuerca') this.llave.visible = true;
      } else if (n === 'recoger') {
        P.cuerpoX = 0.5; P.brazosX = [-0.7, -0.7];
      } else if (n === 'emote:saludar') {
        P.brazosZ = [-0.15, 2.6 + Math.sin(t * 12) * 0.35]; P.cabZ = 0.12;
        if (tau < dt * 1.5) this.decir('¡Hola!');
      } else if (n === 'emote:bailar') {
        by = Math.abs(Math.sin(t * 8)) * 0.12;
        P.cuerpoY = Math.sin(t * 4) * 0.5;
        P.brazosZ = [-(1.2 + Math.sin(t * 8) * 0.6), 1.2 + Math.sin(t * 8 + 1) * 0.6];
        P.piernas = [Math.sin(t * 8) * 0.3, -Math.sin(t * 8) * 0.3];
        P.cabZ = Math.sin(t * 8) * 0.2;
      } else if (n === 'emote:reir') {
        P.cuerpoZ = Math.sin(t * 30) * 0.05; P.cabX = -0.3;
        P.brazosX = [-0.6, -0.6]; P.brazosZ = [0.5, -0.5];
        ojos = 0.35; boca = 'asustado'; // boca abierta de risa
        if (tau < dt * 1.5) this.decir('¡Ja, ja, ja!');
      } else if (n === 'emote:presentar') {
        by = Math.sin(Math.min(1, tau / 0.6) * Math.PI) * 0.25;
        if (tau > 0.5) P.brazosZ = [-0.15, 2.6 + Math.sin(t * 12) * 0.35];
        P.cuerpoY = tau < 0.6 ? tau / 0.6 * Math.PI * 2 : 0;
      } else if (n === 'emote:gag') {
        const r = this.gag(tau, P);
        if (r) ({ ojos = ojos, boca = boca, congelado = congelado, temblor = temblor } = r);
      }
      if (a.tiempo >= a.duracion) this.accion = null;
    }

    // Reacciones (alarma, señal, cuernos)
    if (this.reaccion) {
      const r = this.reaccion;
      r.tiempo += dt;
      if (r.tipo === 'alarma') {
        boca = 'asustado';
        if (this.id === 'faro') { congelado = true; ojos = 1.8; } // paralizado con ojos enormes
        if (this.id === 'kelvin') { temblor = 0.02; ojos = 1.3; }
        if (this.id === 'zuri') { ojos = 1.3; this.orejas.forEach((o, i) => { o.rotation.z = suave(o.rotation.z, 0.05 * (i ? -1 : 1), k); }); }
        if (this.id === 'tuerca') { ojos = 1.2; P.brazosX[1] = r.tiempo < 0.6 ? 1.2 : -2.3; boca = 'feliz'; }
      } else if (r.tipo === 'senal') {
        this.orejas.forEach((o, i) => { o.rotation.y = Math.sin(t * 10 + i) * 0.5; });
        ojos = 1.15; P.cabX = -0.15;
      } else if (r.tipo === 'cuernos') {
        P.cabZ = Math.sin(t * 25) * 0.25; boca = 'asustado'; ojos = 1.3;
      }
      if (r.tiempo >= r.duracion) { this.reaccion = null; if (this.orejas) this.orejas.forEach((o) => { o.rotation.y = 0; }); }
    }

    // Kelvin: el casco se congela de a poco (el gag lo limpia)
    if (this.escarcha) this.escarcha.material.opacity = Math.min(0.45, this.escarcha.material.opacity + dt * 0.02);

    // ---- Aplicar la pose ----
    this.cuerpo.position.y = suave(this.cuerpo.position.y, by, k * 1.5);
    this.cuerpo.position.x = Math.sin(t * 60) * temblor;
    const sx = 1 / Math.sqrt(sy);
    this.cuerpo.scale.set(sx, sy, sx);
    if (!congelado) {
      this.piernas.forEach((p, i) => { p.rotation.x = suave(p.rotation.x, P.piernas[i], k); });
      this.brazos.forEach((b, i) => { b.rotation.x = suave(b.rotation.x, P.brazosX[i], k); b.rotation.z = suave(b.rotation.z, P.brazosZ[i], k); });
      this.cabeza.rotation.x = suave(this.cabeza.rotation.x, P.cabX, k);
      this.cabeza.rotation.y = suave(this.cabeza.rotation.y, P.cabY, k);
      this.cabeza.rotation.z = suave(this.cabeza.rotation.z, P.cabZ, k);
      this.cuerpo.rotation.x = suave(this.cuerpo.rotation.x, P.cuerpoX, k);
      this.cuerpo.rotation.z = suave(this.cuerpo.rotation.z, P.cuerpoZ, k);
      // Giro del cuerpo (bailar, presentarse, estornudo): directo, para poder dar la vuelta entera
      this.cuerpo.rotation.y = P.cuerpoY ? P.cuerpoY : suave(this.cuerpo.rotation.y, 0, k);
    } else {
      this.cabeza.rotation.z = Math.sin(t * 40) * 0.03; // tiembla, quieto como estatua
    }
    if (this.cola) this.cola.rotation.y = Math.sin(t * (vel > 0.3 ? 9 : 2.5)) * 0.35;

    // Ojos: tamaño (sorpresa) y parpadeo
    this.parpadeo -= dt;
    let cierre = 1;
    if (this.parpadeo < 0) { cierre = 0.1; if (this.parpadeo < -0.12) this.parpadeo = azar(2, 5); }
    // ojos < 0.5 = entrecerrados (risa, estornudo); > 1 = ojos enormes (susto)
    const tam = suave(this.ojo[0].scale.x, ojos < 0.5 ? 1 : ojos, k);
    this.ojo.forEach((o) => { o.scale.set(tam, tam * Math.min(cierre, ojos < 0.5 ? ojos : 1), tam); });
    this.expresion(boca);
  }

  /** El gag propio de cada personaje (tau = segundos desde que empezó). */
  gag(tau, P) {
    if (this.id === 'kelvin') {
      // Se limpia el casco congelado con la aleta, tiritando
      if (tau < dt0) this.decir('Brrr… ¡qué frío!');
      P.brazosX[1] = -2.4; P.brazosZ[1] = 0.3 + Math.sin(this.t * 10) * 0.4;
      if (this.escarcha && tau > 0.5) this.escarcha.material.opacity = Math.max(0, this.escarcha.material.opacity - 0.02);
      return { temblor: 0.02, ojos: 0.8 };
    }
    if (this.id === 'faro') {
      // Se asusta de nada: paralizado con ojos enormes
      if (tau < dt0) this.decir('¡¿Qué fue eso?!');
      return { congelado: tau > 0.15, ojos: 1.8, boca: 'asustado' };
    }
    if (this.id === 'zuri') {
      // Estornudo que la hace girar
      if (tau < 0.5) { P.cabX = -0.45; return { ojos: 0.2 }; }
      if (tau < dt0 + 0.5) this.decir('¡A-ACHÍS!');
      if (tau < 1.2) { P.cuerpoY = (tau - 0.5) / 0.7 * Math.PI * 2; P.brazosZ = [-1.4, 1.4]; this.orejas.forEach((o) => { o.rotation.x = 0.6; }); return { ojos: 0.2, boca: 'asustado' }; }
      this.orejas.forEach((o) => { o.rotation.x = 0; });
      return { ojos: 1 };
    }
    if (this.id === 'tuerca') {
      // Saca un tornillo de la nave, lo mira brillar y lo guarda en la mochila
      if (tau < 0.8) { P.cuerpoX = 0.55; P.brazosX = [-0.4, -0.9]; return null; }
      if (tau < 1.6) {
        if (tau < 0.8 + dt0) this.decir('✨ ¡Brillante!');
        this.tornillo.visible = true; P.brazosX[1] = -1.9; P.brazosZ[1] = -0.3; P.cabX = 0.15;
        return { ojos: 1.3 };
      }
      this.tornillo.visible = tau < 2.1; P.brazosX[1] = 1.0; P.brazosZ[1] = -0.5; // a la mochila
      return null;
    }
    return null;
  }
}
const dt0 = 0.06; // "el primer cuadro" de un gag (para decir la frase una sola vez)
