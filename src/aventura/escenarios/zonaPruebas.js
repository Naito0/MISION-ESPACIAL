// =============================================================
// zonaPruebas.js — Escenario de prueba (Fase 1 y 2): un patio de
// entrenamiento con paredes, cajas, una rampa, escalones y columnas.
// Sirve para probar la cámara, el movimiento y las colisiones.
// =============================================================
import * as THREE from 'three';
import { nuevoEscenario, caja, cilindro, material, texturaCuadricula } from '../engine/construccion.js';

export function crearZonaPruebas() {
  const esc = nuevoEscenario();
  const piso = material(0xffffff, { textura: texturaCuadricula('#26304a', '#3d4c74', 20), rugosidad: 0.8, metal: 0.1 });
  const metal = material(0x8a95b0, { rugosidad: 0.4, metal: 0.6 });
  const naranja = material(0xe0823d, { rugosidad: 0.5, metal: 0.2 });
  const azul = material(0x3d77d8, { rugosidad: 0.5, metal: 0.3 });

  // Piso de 40 × 40 m y paredes alrededor
  caja(esc, 40, 0.2, 40, piso, 0, -0.1, 0, { sombra: false });
  caja(esc, 40, 3, 0.4, metal, 0, 1.5, -20);
  caja(esc, 40, 3, 0.4, metal, 0, 1.5, 20);
  caja(esc, 0.4, 3, 40, metal, -20, 1.5, 0);
  caja(esc, 0.4, 3, 40, metal, 20, 1.5, 0);

  // Cajas para saltar y esconderse
  caja(esc, 2, 1, 2, naranja, 5, 0.5, -4);
  caja(esc, 2, 2, 2, naranja, 8, 1, -4);
  caja(esc, 1.2, 0.6, 1.2, azul, -4, 0.3, 3);

  // Rampa inclinada
  caja(esc, 4, 0.3, 8, azul, -9, 1.2, -8, { rotX: -0.3 });
  caja(esc, 4, 2.4, 4, azul, -9, 1.2, -14);

  // Escalones
  for (let i = 0; i < 5; i++) caja(esc, 3, 0.25 * (i + 1), 1, metal, 10, 0.125 * (i + 1), 6 + i);

  // Columnas
  for (const [x, z] of [[-6, 10], [0, 12], [6, 10]]) cilindro(esc, 0.6, 3, metal, x, 1.5, z);

  // Decoración (no sólida): luces de colores en el piso, hechas con InstancedMesh (un solo dibujo para muchas)
  const n = 40;
  const balizas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x7cf3ff, emissive: 0x7cf3ff, emissiveIntensity: 2 }), n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    m.makeTranslation(Math.cos(ang) * 15, 0.12, Math.sin(ang) * 15);
    balizas.setMatrixAt(i, m);
  }
  esc.visual.add(balizas);

  return { ...esc, puntoInicio: new THREE.Vector3(0, 1, 4), colorFondo: 0x0b1020, niebla: [0x0b1020, 20, 70] };
}
