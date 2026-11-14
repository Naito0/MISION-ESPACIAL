// =============================================================
// construccion.js — Herramientas para armar escenarios 3D con piezas simples.
// Cada escenario tiene dos grupos:
//   - visual: todo lo que se ve.
//   - colisiones: lo que es "sólido" (paredes, pisos, cajas). Con este grupo
//     se arma el Octree de la física (ver fisica.js).
// =============================================================
import * as THREE from 'three';

/** Textura de cuadrícula hecha con un canvas (sin imágenes externas). */
export function texturaCuadricula(colorFondo = '#2a3350', colorLinea = '#3f4d75', repeticiones = 10) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = colorFondo;
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = colorLinea;
  g.lineWidth = 4;
  g.strokeRect(2, 2, 124, 124);
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 128); g.moveTo(0, 64); g.lineTo(128, 64); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeticiones, repeticiones);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Material "metálico" estándar (PBR). */
export function material(color, o = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: o.rugosidad ?? 0.6, metalness: o.metal ?? 0.3,
    emissive: o.emisivo ?? 0x000000, emissiveIntensity: o.intensidadEmisiva ?? 1,
    map: o.textura ?? null, transparent: o.transparente ?? false, opacity: o.opacidad ?? 1
  });
}

/** Crea un "escenario" vacío: { raiz, visual, colisiones, interactivos }. */
export function nuevoEscenario() {
  const raiz = new THREE.Group();
  const visual = new THREE.Group();
  const colisiones = new THREE.Group();
  raiz.add(visual, colisiones);
  return { raiz, visual, colisiones, interactivos: [], puertas: [] };
}

/**
 * Agrega una caja. Si o.solida (por defecto true) va al grupo de colisiones
 * (y también se ve). Devuelve la malla.
 */
export function caja(esc, ancho, alto, prof, mat, x, y, z, o = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, prof), mat);
  m.position.set(x, y, z);
  if (o.rotY) m.rotation.y = o.rotY;
  if (o.rotX) m.rotation.x = o.rotX;
  if (o.rotZ) m.rotation.z = o.rotZ;
  m.castShadow = o.sombra ?? true;
  m.receiveShadow = true;
  (o.solida === false ? esc.visual : esc.colisiones).add(m);
  return m;
}

/** Agrega un cilindro (columnas, tanques...). */
export function cilindro(esc, radio, alto, mat, x, y, z, o = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(o.radioArriba ?? radio, radio, alto, o.lados ?? 16), mat);
  m.position.set(x, y, z);
  if (o.rotZ) m.rotation.z = o.rotZ;
  if (o.rotX) m.rotation.x = o.rotX;
  m.castShadow = true;
  m.receiveShadow = true;
  (o.solida === false ? esc.visual : esc.colisiones).add(m);
  return m;
}

/**
 * Habitación rectangular con piso, techo opcional y 4 paredes.
 * huecos: lista de { lado: 'norte'|'sur'|'este'|'oeste', ancho } → deja una puerta en el centro de ese lado.
 */
export function habitacion(esc, cx, cz, ancho, prof, alto, matPared, matPiso, o = {}) {
  const grosor = 0.3;
  caja(esc, ancho, 0.2, prof, matPiso, cx, -0.1, cz, { sombra: false });
  if (o.techo) caja(esc, ancho, 0.2, prof, matPared, cx, alto + 0.1, cz, { sombra: false });
  const huecos = Object.fromEntries((o.huecos || []).map((h) => [h.lado, h.ancho]));
  const pared = (lado, largo, px, pz, vertical) => {
    if ((o.sinPared || []).includes(lado)) return; // ese lado lo pone otra pieza (ej. el pasillo)
    const hueco = huecos[lado];
    if (!hueco) {
      caja(esc, vertical ? grosor : largo, alto, vertical ? largo : grosor, matPared, px, alto / 2, pz);
      return;
    }
    // Dos tramos de pared, uno a cada lado del hueco, y un dintel arriba
    const tramo = (largo - hueco) / 2;
    const desp = hueco / 2 + tramo / 2;
    if (vertical) {
      caja(esc, grosor, alto, tramo, matPared, px, alto / 2, pz - desp);
      caja(esc, grosor, alto, tramo, matPared, px, alto / 2, pz + desp);
      caja(esc, grosor, alto - 3, hueco, matPared, px, alto - (alto - 3) / 2, pz);
    } else {
      caja(esc, tramo, alto, grosor, matPared, px - desp, alto / 2, pz);
      caja(esc, tramo, alto, grosor, matPared, px + desp, alto / 2, pz);
      caja(esc, hueco, alto - 3, grosor, matPared, px, alto - (alto - 3) / 2, pz);
    }
  };
  pared('norte', ancho, cx, cz - prof / 2, false);
  pared('sur', ancho, cx, cz + prof / 2, false);
  pared('oeste', prof, cx - ancho / 2, cz, true);
  pared('este', prof, cx + ancho / 2, cz, true);
}

/** Luz de techo (punto de luz + una lámpara que brilla). */
export function lampara(esc, x, y, z, color = 0xbfd8ff, intensidad = 18, alcance = 14) {
  const luz = new THREE.PointLight(color, intensidad, alcance, 2);
  luz.position.set(x, y, z);
  esc.visual.add(luz);
  const foco = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2 }));
  foco.position.set(x, y + 0.05, z);
  esc.visual.add(foco);
  return luz;
}
