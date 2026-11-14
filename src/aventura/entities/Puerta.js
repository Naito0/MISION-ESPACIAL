// =============================================================
// Puerta.js — Puerta corrediza que se abre SOLA cuando un astronauta
// se acerca. Mientras está cerrada es sólida (la física la tiene en
// cuenta como un "obstáculo dinámico"); abierta, se puede pasar.
// =============================================================
import * as THREE from 'three';

export class Puerta {
  /**
   * @param esc escenario (se agrega a esc.visual)
   * @param x, z centro del hueco · @param orientacion 'x' (la puerta corre a lo largo de x) o 'z'
   * @param colorHex color de la franja de luz de la sala
   */
  constructor(esc, x, z, orientacion, colorHex = 0x7cc4ff, ancho = 2.4, alto = 2.8) {
    this.centro = new THREE.Vector3(x, 0, z);
    this.orientacion = orientacion;
    this.ancho = ancho;
    this.apertura = 0; // 0 = cerrada, 1 = abierta
    const mat = new THREE.MeshStandardMaterial({ color: 0x8892ad, metalness: 0.6, roughness: 0.35 });
    const luz = new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 1.8 });
    this.hojas = [-1, 1].map((lado) => {
      const g = new THREE.Group();
      const hoja = new THREE.Mesh(new THREE.BoxGeometry(ancho / 2, alto, 0.15), mat);
      hoja.castShadow = true;
      const franja = new THREE.Mesh(new THREE.BoxGeometry(0.06, alto * 0.7, 0.17), luz);
      franja.position.x = -lado * (ancho / 4 - 0.08);
      g.add(hoja, franja);
      g.position.set(x, alto / 2, z);
      if (orientacion === 'z') g.rotation.y = Math.PI / 2;
      esc.visual.add(g);
      return { g, lado };
    });
    // Caja que bloquea el paso cuando está cerrada
    this.bloqueo = new THREE.Box3();
    const mitad = orientacion === 'x' ? new THREE.Vector3(ancho / 2, alto / 2, 0.2) : new THREE.Vector3(0.2, alto / 2, ancho / 2);
    this.bloqueo.setFromCenterAndSize(new THREE.Vector3(x, alto / 2, z), mitad.multiplyScalar(2));
  }

  /** ¿Bloquea el paso? (casi cerrada) */
  get cerrada() {
    return this.apertura < 0.6;
  }

  /** @param posiciones lista de THREE.Vector3 (pies de los astronautas) */
  actualizar(dt, posiciones) {
    const cerca = posiciones.some((p) => p.distanceTo(this.centro) < 3.2);
    this.apertura = THREE.MathUtils.clamp(this.apertura + (cerca ? 3 : -2) * dt, 0, 1);
    for (const { g, lado } of this.hojas) {
      const desplazamiento = lado * (this.ancho / 4 + this.apertura * this.ancho / 2);
      if (this.orientacion === 'x') g.position.x = this.centro.x + desplazamiento;
      else g.position.z = this.centro.z + desplazamiento;
    }
  }
}
