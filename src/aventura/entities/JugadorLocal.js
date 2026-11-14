// =============================================================
// JugadorLocal.js — El astronauta que controla ESTA computadora.
// Junta: controles (entrada) → física (cápsula) → modelo 3D → cámara.
// - Movimiento relativo a la cámara, con aceleración y frenado suaves.
// - El astronauta gira hacia donde camina.
// =============================================================
import * as THREE from 'three';
import { CuerpoJugador } from '../engine/fisica.js';
import { CamaraTercera } from '../engine/camaraTercera.js';
import { crearAstronauta } from './fabricaAstronautas.js';
import { sensibilidad3D } from '../../systems/preferencias.js';

export class JugadorLocal {
  /**
   * @param escena THREE.Scene · @param mundo MundoFisico · @param escenario (con colisiones y puntoInicio)
   * @param camara THREE.PerspectiveCamera · @param control (entrada.js) · @param colorRol
   */
  constructor(escena, mundo, escenario, camara, control, colorRol) {
    this.astronauta = crearAstronauta(colorRol);
    escena.add(this.astronauta.raiz);
    this.cuerpo = new CuerpoJugador(mundo, escenario.puntoInicio);
    this.camara = new CamaraTercera(camara, escenario.colisiones);
    this.camara.distancia = escenario.interior ? 3.6 : 5;
    this.control = control;
    this.bloqueado = false; // true mientras usa una consola (no camina)
    this.pies = new THREE.Vector3();
    // Empieza mirando hacia -z (hacia la cabina), de espaldas a la cámara
    this.astronauta.raiz.rotation.y = Math.PI;
    this.anguloAnterior = Math.PI;
    this._deseo = new THREE.Vector3();
    this._adelante = new THREE.Vector3();
    this._derecha = new THREE.Vector3();
    this._cabeza = new THREE.Vector3();
    this.ultimaEntrada = null;
  }

  /** Datos para enviar a los demás jugadores. */
  estadoRed() {
    const a = this.astronauta;
    return {
      x: +this.pies.x.toFixed(2), y: +this.pies.y.toFixed(2), z: +this.pies.z.toFixed(2),
      ry: +a.raiz.rotation.y.toFixed(2),
      v: +Math.hypot(this.cuerpo.velocidad.x, this.cuerpo.velocidad.z).toFixed(1),
      ap: this.cuerpo.apoyado ? 1 : 0,
      acc: a.accion ? a.accion.nombre : null
    };
  }

  /**
   * Límites del área donde puede moverse (rectángulo en el piso).
   * l = { xMin, xMax, zMin, zMax } o null (sin límites).
   */
  limitarA(l) { this.limites = l; }

  /**
   * @param activo true = lo controla el jugador (teclado y cámara);
   *               false = está "en espera" trabajando en su área (no mueve la cámara).
   */
  actualizar(dt, activo = true) {
    const e = activo ? this.control.leer() : null;
    this.ultimaEntrada = e;
    if (activo) {
      this.camara.sensibilidad = sensibilidad3D();
      this.camara.girar(e.camaraX, e.camaraY, e.zoom);
    }

    this.camara.adelante(this._adelante);
    this.camara.derecha(this._derecha);
    const d = this._deseo.set(0, 0, 0);
    if (e && !this.bloqueado && !this.astronauta.desmayado) {
      d.addScaledVector(this._adelante, e.moverY).addScaledVector(this._derecha, e.moverX);
      if (d.lengthSq() > 1) d.normalize();
    }
    this.cuerpo.actualizar(dt, d, e ? e.correr : false, !!(e && e.saltar && !this.bloqueado));

    this.cuerpo.pies(this.pies);
    // No puede salir de su área: si se pasa del borde, vuelve al borde y frena
    if (this.limites) {
      const l = this.limites;
      const x = THREE.MathUtils.clamp(this.pies.x, l.xMin, l.xMax);
      const z = THREE.MathUtils.clamp(this.pies.z, l.zMin, l.zMax);
      if (x !== this.pies.x || z !== this.pies.z) {
        this.cuerpo.capsula.translate(this._deseo.set(x - this.pies.x, 0, z - this.pies.z));
        if (x !== this.pies.x) this.cuerpo.velocidad.x = 0;
        if (z !== this.pies.z) this.cuerpo.velocidad.z = 0;
        this.cuerpo.pies(this.pies);
      }
    }
    const a = this.astronauta;
    a.raiz.position.copy(this.pies);
    const vel = Math.hypot(this.cuerpo.velocidad.x, this.cuerpo.velocidad.z);
    let giro = 0;
    if (vel > 0.2) {
      const objetivo = Math.atan2(this.cuerpo.velocidad.x, this.cuerpo.velocidad.z);
      let dif = objetivo - a.raiz.rotation.y;
      dif = Math.atan2(Math.sin(dif), Math.cos(dif));
      a.raiz.rotation.y += dif * Math.min(1, 10 * dt);
      giro = (a.raiz.rotation.y - this.anguloAnterior) / Math.max(dt, 1e-3);
    }
    this.anguloAnterior = a.raiz.rotation.y;
    a.actualizar(dt, { velocidad: vel, apoyado: this.cuerpo.apoyado, velocidadVertical: this.cuerpo.velocidad.y, giro });

    this._cabeza.copy(this.pies).y += 1.55;
    if (activo) this.camara.actualizar(dt, this._cabeza);
    return e;
  }
}
