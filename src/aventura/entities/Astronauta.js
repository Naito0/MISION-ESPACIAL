// =============================================================
// Astronauta.js — Astronauta 3D PROCEDURAL (hecho con geometrías).
// Tiene volumen y articulaciones reales en jerarquía:
//   cadera → torso → hombros → codos   y   cadera → muslos → rodillas
// con casco, visor, mochila de soporte vital y el color de su rol.
//
// Animaciones (por código): idle, caminar, correr, saltar, girar,
// interactuar, reparar, recoger, reanimar y desmayarse.
//
// PREPARADO PARA GLB: el resto del juego solo usa
//   astronauta.raiz, astronauta.reproducir(nombre) y astronauta.actualizar(dt, estado).
// Si el equipo consigue un modelo GLB con esqueleto, se puede crear otra clase
// con la misma interfaz que use THREE.AnimationMixer, sin tocar nada más.
// =============================================================
import * as THREE from 'three';

const BLANCO_TRAJE = 0xe8ecf5;

/** Crea una malla de cápsula (para brazos, piernas y torso). */
function capsula(radio, largo, mat) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(radio, largo, 6, 12), mat);
  m.castShadow = true;
  return m;
}

/** Un "hueso": un grupo que gira, con la pieza colgando hacia abajo. */
function articulacion(x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  return g;
}

export class Astronauta {
  /**
   * @param colorRol color del rol (ej. 0x7cc4ff); se usa en pecho, hombros y rodillas
   * @param nombre texto que se muestra (opcional)
   */
  constructor(colorRol = 0x7cc4ff) {
    this.raiz = new THREE.Group();       // se mueve con la física (pies en y = 0)
    this.cuerpo = new THREE.Group();     // se inclina, se agacha, se desmaya
    this.raiz.add(this.cuerpo);

    const traje = new THREE.MeshStandardMaterial({ color: BLANCO_TRAJE, roughness: 0.7, metalness: 0.05 });
    const rol = new THREE.MeshStandardMaterial({ color: colorRol, roughness: 0.5, metalness: 0.2, emissive: colorRol, emissiveIntensity: 0.15 });
    const gris = new THREE.MeshStandardMaterial({ color: 0x6c7385, roughness: 0.6, metalness: 0.4 });
    // Visor dorado y reflectante, como el de los trajes reales
    const visor = new THREE.MeshStandardMaterial({ color: 0xd9a63a, roughness: 0.12, metalness: 1, emissive: 0x3a2400, emissiveIntensity: 0.5 });

    // ---- Cadera y torso ----
    this.cadera = articulacion(0, 0.95, 0);
    this.cuerpo.add(this.cadera);
    this.torso = articulacion(0, 0, 0);
    this.cadera.add(this.torso);
    const pecho = capsula(0.26, 0.42, traje);
    pecho.position.y = 0.38;
    pecho.scale.set(1.15, 1, 0.85);
    this.torso.add(pecho);
    const placa = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.08), rol);
    placa.position.set(0, 0.48, 0.21);
    this.torso.add(placa);
    const cinturon = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.04, 8, 20), gris);
    cinturon.rotation.x = Math.PI / 2;
    cinturon.position.y = 0.12;
    this.torso.add(cinturon);

    // Mochila de soporte vital con dos tanques
    const mochila = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.22), traje);
    mochila.position.set(0, 0.45, -0.3);
    mochila.castShadow = true;
    this.torso.add(mochila);
    for (const lado of [-0.12, 0.12]) {
      const tanque = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 12), gris);
      tanque.position.set(lado, 0.45, -0.43);
      this.torso.add(tanque);
    }
    this.luzMochila = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8),
      new THREE.MeshStandardMaterial({ color: colorRol, emissive: colorRol, emissiveIntensity: 2 }));
    this.luzMochila.position.set(0.16, 0.66, -0.42);
    this.torso.add(this.luzMochila);

    // ---- Casco con visor ----
    this.cabeza = articulacion(0, 0.78, 0);
    this.torso.add(this.cabeza);
    const casco = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 16), traje);
    casco.castShadow = true;
    this.cabeza.add(casco);
    // Visor: una esfera aplastada que asoma por el frente del casco
    const vidrio = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), visor);
    vidrio.scale.set(0.92, 0.75, 0.75);
    vidrio.position.set(0, 0.01, 0.135); // asoma ~3 cm por delante del casco (sin "pelearse" con él)
    this.cabeza.add(vidrio);
    // Luz del casco y mangueras de la mochila al casco
    const lampara = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3c0, emissiveIntensity: 2 }));
    lampara.position.set(0.16, 0.13, 0.13);
    this.cabeza.add(lampara);
    for (const lado of [-1, 1]) {
      const manguera = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 12, Math.PI), gris);
      manguera.position.set(lado * 0.2, 0.62, -0.12);
      manguera.rotation.y = Math.PI / 2;
      this.torso.add(manguera);
    }
    const anilloCuello = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 8, 20), rol);
    anilloCuello.rotation.x = Math.PI / 2;
    anilloCuello.position.y = -0.2;
    this.cabeza.add(anilloCuello);

    // ---- Brazos (hombro → codo → guante) ----
    const crearBrazo = (lado) => {
      const hombro = articulacion(lado * 0.36, 0.62, 0);
      this.torso.add(hombro);
      const hombrera = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), rol);
      hombro.add(hombrera);
      const brazo = capsula(0.085, 0.22, traje);
      brazo.position.y = -0.2;
      hombro.add(brazo);
      const codo = articulacion(0, -0.38, 0);
      hombro.add(codo);
      const antebrazo = capsula(0.08, 0.2, traje);
      antebrazo.position.y = -0.17;
      codo.add(antebrazo);
      const guante = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), gris);
      guante.position.y = -0.36;
      codo.add(guante);
      return { hombro, codo };
    };
    this.brazoIzq = crearBrazo(-1);
    this.brazoDer = crearBrazo(1);

    // ---- Piernas (cadera → rodilla → bota) ----
    const crearPierna = (lado) => {
      const muslo = articulacion(lado * 0.14, 0, 0);
      this.cadera.add(muslo);
      const pierna = capsula(0.11, 0.26, traje);
      pierna.position.y = -0.22;
      muslo.add(pierna);
      const rodilla = articulacion(0, -0.45, 0);
      muslo.add(rodilla);
      const rodillera = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), rol);
      rodillera.position.z = 0.07;
      rodilla.add(rodillera);
      const canilla = capsula(0.1, 0.24, traje);
      canilla.position.y = -0.2;
      rodilla.add(canilla);
      const bota = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.32), gris);
      bota.position.set(0, -0.44, 0.05);
      bota.castShadow = true;
      rodilla.add(bota);
      return { muslo, rodilla };
    };
    this.piernaIzq = crearPierna(-1);
    this.piernaDer = crearPierna(1);

    // ---- Estado de la animación ----
    this.fase = 0;            // avanza al caminar (ciclo de pasos)
    this.accion = null;       // animación de una sola vez: { nombre, tiempo, duracion }
    this.desmayado = false;
    this.giroSuave = 0;
  }

  /**
   * Reproduce una animación de acción: 'interactuar', 'reparar', 'recoger',
   * 'reanimar' (duran un rato) o 'desmayarse' / 'levantarse'.
   */
  reproducir(nombre, duracion = 0.8) {
    if (nombre === 'desmayarse') { this.desmayado = true; return; }
    if (nombre === 'levantarse') { this.desmayado = false; return; }
    this.accion = { nombre, tiempo: 0, duracion };
  }

  /** Mantiene una acción mientras se llame (ej. reparar mientras se mantiene E). */
  mantener(nombre) {
    if (!this.accion || this.accion.nombre !== nombre) this.accion = { nombre, tiempo: 0, duracion: 0.3 };
    else this.accion.duracion = this.accion.tiempo + 0.3;
  }

  /**
   * @param e = { velocidad (m/s horizontal), apoyado (bool), velocidadVertical, giro (rad/s) }
   */
  actualizar(dt, e) {
    const t = performance.now() / 1000;
    const L = (a, b, k) => a + (b - a) * Math.min(1, k * dt); // suavizado
    const b = { hIzq: 0, hDer: 0, cIzq: 0, cDer: 0, mIzq: 0, mDer: 0, rIzq: 0, rDer: 0, torsoX: 0, alturaCadera: 0.95, cuerpoX: 0, abrirBrazos: 0 };

    // ---- Locomoción: idle / caminar / correr ----
    const v = e.velocidad;
    if (e.apoyado && v > 0.3) {
      const corriendo = v > 4.5;
      this.fase += dt * (corriendo ? 11 : 7.5) * Math.min(1.3, v / (corriendo ? 6.5 : 3.4));
      const amp = corriendo ? 0.9 : 0.55;
      const s = Math.sin(this.fase);
      b.mIzq = s * amp; b.mDer = -s * amp;
      b.rIzq = Math.max(0, -s) * amp * 1.3; b.rDer = Math.max(0, s) * amp * 1.3;
      b.hIzq = -s * amp * 0.9; b.hDer = s * amp * 0.9;
      b.cIzq = b.cDer = corriendo ? -1.2 : -0.35;
      b.torsoX = corriendo ? 0.22 : 0.06;
      b.alturaCadera = 0.95 + Math.abs(Math.cos(this.fase)) * (corriendo ? 0.07 : 0.035);
    } else if (e.apoyado) {
      // Idle: respira y mueve un poquito los brazos
      b.hIzq = Math.sin(t * 1.6) * 0.04; b.hDer = -Math.sin(t * 1.6) * 0.04;
      b.cIzq = b.cDer = -0.12;
      b.alturaCadera = 0.95 + Math.sin(t * 2) * 0.008;
      b.abrirBrazos = 0.08;
    } else {
      // En el aire: piernas recogidas y brazos arriba
      const subiendo = e.velocidadVertical > 0;
      b.mIzq = 0.6; b.mDer = subiendo ? 0.2 : 0.5;
      b.rIzq = 1.0; b.rDer = subiendo ? 0.4 : 0.8;
      b.hIzq = b.hDer = -2.3; b.cIzq = b.cDer = -0.4;
      b.abrirBrazos = 0.35;
    }

    // ---- Acciones (se mezclan sobre la locomoción) ----
    if (this.accion) {
      const a = this.accion;
      a.tiempo += dt;
      const ciclo = Math.sin(a.tiempo * 10);
      if (a.nombre === 'interactuar') {
        b.hDer = -1.4 + ciclo * 0.15; b.cDer = -0.3;
      } else if (a.nombre === 'reparar') {
        b.hIzq = -1.3; b.cIzq = -0.6; b.hDer = -1.2 + ciclo * 0.35; b.cDer = -0.9 + ciclo * 0.4;
        b.torsoX = 0.25;
      } else if (a.nombre === 'recoger') {
        const k = Math.sin(Math.min(1, a.tiempo / a.duracion) * Math.PI);
        b.alturaCadera = 0.95 - k * 0.35; b.mIzq = b.mDer = -k * 1.0; b.rIzq = b.rDer = k * 1.8;
        b.torsoX = k * 0.7; b.hDer = -k * 1.2;
      } else if (a.nombre === 'reanimar') {
        b.alturaCadera = 0.6; b.mIzq = -1.4; b.rIzq = 2.2; b.mDer = 0.2; b.rDer = 1.6;
        b.torsoX = 0.5; b.hIzq = b.hDer = -1.1 + ciclo * 0.2; b.cIzq = b.cDer = -0.2;
      }
      if (a.tiempo >= a.duracion) this.accion = null;
    }

    // ---- Giro: se inclina un poco hacia el lado al doblar ----
    this.giroSuave = L(this.giroSuave, THREE.MathUtils.clamp(e.giro || 0, -6, 6), 8);

    // ---- Desmayo: el cuerpo cae acostado ----
    b.cuerpoX = this.desmayado ? -Math.PI / 2 : 0;

    // Aplicar con suavidad
    const bi = this.brazoIzq;
    const bd = this.brazoDer;
    bi.hombro.rotation.x = L(bi.hombro.rotation.x, b.hIzq, 14);
    bd.hombro.rotation.x = L(bd.hombro.rotation.x, b.hDer, 14);
    bi.hombro.rotation.z = L(bi.hombro.rotation.z, -b.abrirBrazos, 10);
    bd.hombro.rotation.z = L(bd.hombro.rotation.z, b.abrirBrazos, 10);
    bi.codo.rotation.x = L(bi.codo.rotation.x, b.cIzq, 14);
    bd.codo.rotation.x = L(bd.codo.rotation.x, b.cDer, 14);
    this.piernaIzq.muslo.rotation.x = L(this.piernaIzq.muslo.rotation.x, -b.mIzq, 16);
    this.piernaDer.muslo.rotation.x = L(this.piernaDer.muslo.rotation.x, -b.mDer, 16);
    this.piernaIzq.rodilla.rotation.x = L(this.piernaIzq.rodilla.rotation.x, b.rIzq, 16);
    this.piernaDer.rodilla.rotation.x = L(this.piernaDer.rodilla.rotation.x, b.rDer, 16);
    this.torso.rotation.x = L(this.torso.rotation.x, b.torsoX, 10);
    this.torso.rotation.z = -this.giroSuave * 0.03;
    this.cadera.position.y = L(this.cadera.position.y, b.alturaCadera, 14);
    this.cuerpo.rotation.x = L(this.cuerpo.rotation.x, b.cuerpoX, 5);
    this.cuerpo.position.y = this.desmayado ? L(this.cuerpo.position.y, 0.3, 5) : L(this.cuerpo.position.y, 0, 5);
    // La luz de la mochila parpadea
    this.luzMochila.material.emissiveIntensity = 1.5 + Math.sin(t * 4) * 0.8;
  }
}
