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

  /**
   * Cierra la puerta con llave: luz roja, un candado arriba y no se abre al pasar.
   * (Las puertas entre las áreas de los astronautas quedan así: cada uno en su sala.)
   */
  bloquear(texto = '🔒') {
    this.bloqueada = true;
    this.apertura = 0;
    const rojo = new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff2020, emissiveIntensity: 2.2 });
    for (const { g } of this.hojas) g.children[1].material = rojo;
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(60,0,0,0.85)'; ctx.beginPath(); ctx.arc(64, 64, 58, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ff4040'; ctx.lineWidth = 6; ctx.stroke();
    ctx.font = '70px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(texto, 64, 70);
    const tex = new THREE.CanvasTexture(c);
    const candado = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    candado.scale.set(0.7, 0.7, 1);
    candado.position.set(this.centro.x, 3.2, this.centro.z);
    this.hojas[0].g.parent.add(candado);
    const luz = new THREE.PointLight(0xff2020, 3, 4);
    luz.position.set(this.centro.x, 2.6, this.centro.z);
    this.hojas[0].g.parent.add(luz);
    return this;
  }

  /** @param posiciones lista de THREE.Vector3 (pies de los astronautas) */
  actualizar(dt, posiciones) {
    const cerca = !this.bloqueada && posiciones.some((p) => p.distanceTo(this.centro) < 3.2);
    this.apertura = THREE.MathUtils.clamp(this.apertura + (cerca ? 3 : -2) * dt, 0, 1);
    for (const { g, lado } of this.hojas) {
      const desplazamiento = lado * (this.ancho / 4 + this.apertura * this.ancho / 2);
      if (this.orientacion === 'x') g.position.x = this.centro.x + desplazamiento;
      else g.position.z = this.centro.z + desplazamiento;
    }
  }
}
