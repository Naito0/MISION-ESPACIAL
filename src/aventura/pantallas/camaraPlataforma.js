// =============================================================
// camaraPlataforma.js — Cámara del menú y de la sala.
// Los 4 personajes (de x = -3,3 a 3,3) se ven en la parte IZQUIERDA de la
// pantalla, para que el panel de la derecha no tape a ninguno.
// La distancia se ajusta a la forma de la ventana (ancha o angosta).
// =============================================================
import * as THREE from 'three';

export function camaraPlataforma(camara, t) {
  const tan = Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
  const aspecto = camara.aspect || 16 / 9;
  // Los personajes (7,4 m con margen) tienen que caber en el 55% izquierdo de la pantalla
  const d = Math.max(8, 7.4 / (0.55 * 2 * tan * aspecto));
  const ancho = 2 * d * tan * aspecto;   // metros que se ven de lado a lado
  const dx = 0.17 * ancho;               // el centro del grupo queda al 33% de la pantalla
  const ang = Math.sin(t * 0.15) * 0.1;  // se mueve apenas (si se mueve mucho, alguno se esconde)
  camara.position.set(dx + Math.sin(ang) * d, 2.4, Math.cos(ang) * d);
  camara.lookAt(dx, 1.0, 0);
}
