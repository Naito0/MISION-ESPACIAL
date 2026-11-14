// =============================================================
// AstronautaRemoto.js — El astronauta de OTRO jugador.
// Recibe su posición ~15 veces por segundo y la "interpola": se mueve
// suavemente hacia el último dato recibido, así no avanza a saltos.
// Lleva un cartel con el nombre del jugador sobre la cabeza.
// =============================================================
import * as THREE from 'three';
import { crearAstronauta } from './fabricaAstronautas.js';

/** Cartel con texto que siempre mira a la cámara (sprite). */
export function crearEtiqueta(texto, colorHex = 0x7cc4ff) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(8, 14, 32, 0.75)';
  g.beginPath(); g.roundRect(4, 8, 248, 48, 14); g.fill();
  g.strokeStyle = `#${colorHex.toString(16).padStart(6, '0')}`; g.lineWidth = 4; g.stroke();
  g.fillStyle = '#ffffff'; g.font = 'bold 28px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(texto, 128, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(1.2, 0.3, 1);
  s.renderOrder = 10;
  return s;
}

export class AstronautaRemoto {
  constructor(escena, nombre, colorRol) {
    this.astronauta = crearAstronauta(colorRol);
    this.etiqueta = crearEtiqueta(nombre, colorRol);
    this.etiqueta.position.y = 2.25;
    this.astronauta.raiz.add(this.etiqueta);
    escena.add(this.astronauta.raiz);
    this.objetivo = null; // último dato recibido
    this.pies = new THREE.Vector3();
    this.accionAnterior = null;
  }

  /** Nuevo dato de red: { x, y, z, ry, v, ap, acc } */
  recibir(p) {
    if (!this.objetivo) this.pies.set(p.x, p.y, p.z); // la primera vez aparece directo
    this.objetivo = p;
  }

  actualizar(dt) {
    const p = this.objetivo;
    if (!p) return;
    const k = 1 - Math.exp(-12 * dt);
    this.pies.x += (p.x - this.pies.x) * k;
    this.pies.y += (p.y - this.pies.y) * k;
    this.pies.z += (p.z - this.pies.z) * k;
    const a = this.astronauta;
    a.raiz.position.copy(this.pies);
    let dif = p.ry - a.raiz.rotation.y;
    dif = Math.atan2(Math.sin(dif), Math.cos(dif));
    a.raiz.rotation.y += dif * k;
    if (p.acc && p.acc !== this.accionAnterior) a.reproducir(p.acc, 0.6);
    if (p.acc) a.mantener(p.acc);
    this.accionAnterior = p.acc;
    a.actualizar(dt, { velocidad: p.v, apoyado: !!p.ap, velocidadVertical: 0, giro: 0 });
  }

  quitar() {
    this.astronauta.raiz.removeFromParent();
  }
}
