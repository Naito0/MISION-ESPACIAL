// =============================================================
// luces.js — Iluminación base de un escenario:
//   - luz de "cielo" (hemisférica) para que nada quede negro,
//   - una luz direccional (como el Sol o los focos del hangar) con sombras.
// =============================================================
import * as THREE from 'three';

/**
 * Agrega las luces a la escena. o = { colorCielo, colorSuelo, intensidad, colorSol, posicionSol, sombras, tamanoSombra, area }
 * Devuelve { hemisferica, sol }.
 */
export function crearLuces(escena, o = {}) {
  const hemisferica = new THREE.HemisphereLight(o.colorCielo ?? 0xbcd4ff, o.colorSuelo ?? 0x202838, o.intensidad ?? 1.1);
  escena.add(hemisferica);

  const sol = new THREE.DirectionalLight(o.colorSol ?? 0xffffff, o.intensidadSol ?? 2.2);
  sol.position.copy(o.posicionSol ?? new THREE.Vector3(12, 22, 8));
  sol.castShadow = !!o.sombras;
  if (o.sombras) {
    const area = o.area ?? 30; // tamaño de la zona que recibe sombras (metros)
    sol.shadow.mapSize.set(o.tamanoSombra ?? 1024, o.tamanoSombra ?? 1024);
    Object.assign(sol.shadow.camera, { left: -area, right: area, top: area, bottom: -area, near: 1, far: 80 });
    sol.shadow.bias = -0.0005;
    sol.shadow.normalBias = 0.02;
  }
  escena.add(sol);
  escena.add(sol.target);
  return { hemisferica, sol };
}
