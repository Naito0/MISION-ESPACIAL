// =============================================================
// fisica.js — Física simple y estable para caminar por escenarios 3D.
// - MundoFisico: arma un Octree (árbol que acelera las colisiones) con
//   todo lo que esté en el grupo "colisiones" del escenario.
// - CuerpoJugador: el jugador es una CÁPSULA (como una pastilla) que
//   cae por la gravedad, choca con paredes y piso, sube rampas y salta.
// Usa Octree y Capsule de three/addons (sin otra dependencia).
// =============================================================
import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';
import { Capsule } from 'three/addons/math/Capsule.js';

export class MundoFisico {
  /** @param grupoColisiones THREE.Group con las mallas sólidas */
  constructor(grupoColisiones, gravedad = 9.81) {
    grupoColisiones.updateMatrixWorld(true);
    this.octree = new Octree();
    this.octree.fromGraphNode(grupoColisiones);
    this.gravedad = gravedad; // m/s² (Tierra 9,81 · Marte 3,71 · Luna 1,62, de destinos.json)
    // Obstáculos que se mueven (puertas): { bloqueo: THREE.Box3, cerrada: bool }
    this.dinamicos = [];
  }
}

const RADIO = 0.35;
const ALTURA = 1.75;
const PASOS = 4; // sub-pasos por cuadro: más estable a baja velocidad de cuadros

export class CuerpoJugador {
  constructor(mundo, posicionPies) {
    this.mundo = mundo;
    this.capsula = new Capsule(
      new THREE.Vector3(posicionPies.x, posicionPies.y + RADIO, posicionPies.z),
      new THREE.Vector3(posicionPies.x, posicionPies.y + ALTURA - RADIO, posicionPies.z),
      RADIO
    );
    this.inicio = posicionPies.clone();
    this.velocidad = new THREE.Vector3();
    this.enSuelo = false;
    this.tiempoEnAire = 0;
    this.velocidadCaminar = 3.4;
    this.velocidadCorrer = 6.5;
    this.fuerzaSalto = 5.2;
  }

  /** Posición de los pies (para dibujar al astronauta). */
  pies(destino = new THREE.Vector3()) {
    destino.copy(this.capsula.start);
    destino.y -= RADIO; // la parte de abajo de la cápsula
    return destino;
  }

  /** Teletransporta al jugador (por ejemplo, al cambiar de escenario). */
  ubicar(posicionPies) {
    const delta = posicionPies.clone().sub(this.pies());
    this.capsula.translate(delta);
    this.velocidad.set(0, 0, 0);
  }

  /** ¿Está apoyado (con un pequeño margen para que no "parpadee" al bajar rampas)? */
  get apoyado() {
    return this.tiempoEnAire < 0.12;
  }

  /**
   * @param dt segundos
   * @param deseo THREE.Vector3 horizontal (largo 0 a 1) hacia donde quiere ir
   * @param correr bool · @param saltar bool (recién pulsado)
   */
  actualizar(dt, deseo, correr, saltar) {
    const max = correr ? this.velocidadCorrer : this.velocidadCaminar;
    if (saltar && this.apoyado) {
      this.velocidad.y = this.fuerzaSalto;
      this.tiempoEnAire = 1; // ya no está apoyado
    }
    const paso = dt / PASOS;
    let tocoPiso = false;
    for (let i = 0; i < PASOS; i++) {
      // Aceleración horizontal hacia la velocidad deseada (menos control en el aire)
      const control = Math.min(1, (this.enSuelo ? 14 : 3) * paso);
      this.velocidad.x += (deseo.x * max - this.velocidad.x) * control;
      this.velocidad.z += (deseo.z * max - this.velocidad.z) * control;
      // La gravedad actúa SIEMPRE: así la cápsula sigue tocando el piso y sabemos que está apoyada
      this.velocidad.y -= this.mundo.gravedad * paso;
      this.capsula.translate(this.velocidad.clone().multiplyScalar(paso));
      if (this.resolverColisiones()) tocoPiso = true;
    }
    this.enSuelo = tocoPiso;
    this.tiempoEnAire = this.enSuelo ? 0 : this.tiempoEnAire + dt;
    // Red de seguridad: si se cae del mundo, vuelve al inicio
    if (this.capsula.start.y < -30) this.ubicar(this.inicio);
  }

  /** Puertas cerradas: empuja la cápsula fuera de su caja (mirando solo el plano del piso). */
  resolverDinamicos() {
    const c = this.capsula.start;
    for (const d of this.mundo.dinamicos) {
      if (!d.cerrada) continue;
      const b = d.bloqueo;
      if (c.y > b.max.y || this.capsula.end.y < b.min.y) continue;
      const px = THREE.MathUtils.clamp(c.x, b.min.x, b.max.x);
      const pz = THREE.MathUtils.clamp(c.z, b.min.z, b.max.z);
      const dx = c.x - px;
      const dz = c.z - pz;
      const dist = Math.hypot(dx, dz);
      if (dist >= RADIO) continue;
      // Dentro o tocando: se empuja hacia afuera por el lado más cercano
      let nx = dx; let nz = dz;
      if (dist < 1e-6) { const haciaX = Math.abs(c.x - (b.min.x + b.max.x) / 2) > Math.abs(c.z - (b.min.z + b.max.z) / 2); nx = haciaX ? Math.sign(c.x - (b.min.x + b.max.x) / 2) : 0; nz = haciaX ? 0 : Math.sign(c.z - (b.min.z + b.max.z) / 2); }
      const largo = Math.hypot(nx, nz) || 1;
      const empuje = RADIO - dist;
      this.capsula.translate(new THREE.Vector3((nx / largo) * empuje, 0, (nz / largo) * empuje));
    }
  }

  /** Empuja la cápsula fuera de lo que esté tocando. Devuelve true si tocó un PISO. */
  resolverColisiones() {
    this.resolverDinamicos();
    const r = this.mundo.octree.capsuleIntersect(this.capsula);
    if (!r) return false;
    const esPiso = r.normal.y > 0.5; // superficie casi horizontal = piso (también rampas suaves)
    if (esPiso) {
      if (this.velocidad.y < 0) this.velocidad.y = 0;
    } else {
      // Pared o techo: se pierde la velocidad que iba "hacia" la superficie
      this.velocidad.addScaledVector(r.normal, -r.normal.dot(this.velocidad));
    }
    if (r.depth >= 1e-10) this.capsula.translate(r.normal.multiplyScalar(r.depth));
    return esPiso;
  }
}
