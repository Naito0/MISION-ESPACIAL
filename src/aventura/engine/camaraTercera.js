// =============================================================
// camaraTercera.js — Cámara en TERCERA PERSONA.
// Sigue al personaje desde atrás y un poco por encima.
// - Gira con el mouse/stick (horizontal y vertical), zoom con la rueda.
// - Seguimiento suave (no se mueve "a los saltos").
// - No atraviesa paredes: si hay una pared entre el personaje y la
//   cámara, la cámara se acerca hasta quedar delante de la pared.
// =============================================================
import * as THREE from 'three';

export class CamaraTercera {
  /**
   * @param camara THREE.PerspectiveCamera
   * @param solidos THREE.Group con las paredes (para no atravesarlas)
   */
  constructor(camara, solidos) {
    this.camara = camara;
    this.solidos = solidos;
    this.yaw = 0;        // giro horizontal (radianes)
    this.pitch = 0.35;   // inclinación (radianes, positivo = desde arriba)
    this.distancia = 5;  // metros detrás del personaje
    this.sensibilidad = 1;
    this.objetivo = new THREE.Vector3();
    this.rayo = new THREE.Raycaster();
    this.posicionDeseada = new THREE.Vector3();
    this.primera = true;
  }

  /** Aplica la entrada del jugador (camaraX/Y en radianes, zoom en "pasos"). */
  girar(dx, dy, zoom = 0) {
    this.yaw -= dx * this.sensibilidad;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * this.sensibilidad, -0.25, 1.25);
    this.distancia = THREE.MathUtils.clamp(this.distancia + zoom * 0.6, 2.2, 10);
  }

  /** Dirección "hacia adelante" en el piso, según hacia dónde mira la cámara. */
  adelante(destino = new THREE.Vector3()) {
    return destino.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  derecha(destino = new THREE.Vector3()) {
    return destino.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  /** @param posicionCabeza punto a mirar (la cabeza del personaje) */
  actualizar(dt, posicionCabeza) {
    this.objetivo.lerp(posicionCabeza, this.primera ? 1 : 1 - Math.exp(-18 * dt));
    const desplazamiento = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    // ¿Hay una pared en el camino? Acortamos la distancia
    let distancia = this.distancia;
    this.rayo.set(this.objetivo, desplazamiento);
    this.rayo.far = this.distancia;
    const choque = this.rayo.intersectObjects(this.solidos.children, true)[0];
    if (choque) distancia = Math.max(0.6, choque.distance - 0.3);

    this.posicionDeseada.copy(this.objetivo).addScaledVector(desplazamiento, distancia);
    if (this.primera) this.camara.position.copy(this.posicionDeseada);
    else this.camara.position.lerp(this.posicionDeseada, 1 - Math.exp(-14 * dt));
    this.camara.lookAt(this.objetivo);
    this.primera = false;
  }
}
