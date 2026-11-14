// =============================================================
// naveModelo.js — La nave del hangar, armada con las piezas compradas.
// Cada pieza comprada aparece en la nave con una pequeña animación.
// Todo es low-poly hecho con formas simples de Three.js.
// =============================================================
import * as THREE from 'three';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: o.metal ?? 0.4, roughness: o.rug ?? 0.5, emissive: o.emisivo ?? 0x000000, emissiveIntensity: o.ei ?? 1, flatShading: true });

/** Crea las piezas de una opción. Devuelve un THREE.Group (o null si no se ve en la nave). */
function piezaDe(id) {
  const g = new THREE.Group();
  const add = (geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const me = new THREE.Mesh(geo, m);
    me.position.set(x, y, z); me.rotation.set(rx, ry, rz);
    me.castShadow = true;
    g.add(me);
    return me;
  };
  // ---- Estructura (cuerpo de la nave) ----
  if (id.startsWith('estr_')) {
    const color = id === 'estr_blindada' ? 0x8a93a8 : id === 'estr_reforzada' ? 0xc9d0dc : 0xe8ecf4;
    add(new THREE.CylinderGeometry(1.1, 1.3, 3.2, 8), mat(color), 0, 2.6, 0);
    add(new THREE.ConeGeometry(1.1, 1.3, 8), mat(color), 0, 4.85, 0);
    if (id === 'estr_blindada') {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        add(new THREE.BoxGeometry(0.75, 2.6, 0.12), mat(0x5b6275, { metal: 0.8 }), Math.sin(a) * 1.3, 2.6, Math.cos(a) * 1.3, 0, a, 0);
      }
    }
    if (id === 'estr_reforzada') for (const y of [1.4, 2.6, 3.8]) add(new THREE.TorusGeometry(1.22, 0.07, 6, 16), mat(0x7a8296), 0, y, 0, Math.PI / 2);
    return g;
  }
  // ---- Propulsión: tobera más grande cuanto más potente ----
  if (id.startsWith('prop_')) {
    const k = id === 'prop_grande' ? 1.35 : id === 'prop_media' ? 1.1 : 0.85;
    add(new THREE.CylinderGeometry(0.45 * k, 0.95 * k, 1.2 * k, 10, 1, true), mat(0x3a3f4c, { metal: 0.9, rug: 0.3 }), 0, 0.95 - 0.6 * k + 0.6, 0);
    add(new THREE.CylinderGeometry(0.8 * k, 0.8 * k, 0.5, 10), mat(0xffd166, { emisivo: 0xff8a20, ei: 0.4 }), 0, 1.05, 0);
    return g;
  }
  // ---- Escudo térmico ----
  if (id.startsWith('term_')) {
    const color = id === 'term_manta' ? 0xd8a640 : id === 'term_activa' ? 0xd8a640 : 0xf4f4f4;
    add(new THREE.CylinderGeometry(1.36, 1.36, 0.25, 12), mat(color, { metal: 0.7, rug: 0.25 }), 0, 1.2, 0);
    if (id === 'term_activa') for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.1, 1.6, 0.9), mat(0xe8ecf4), s * 1.25, 3.1, 0);
    return g;
  }
  // ---- Paneles solares: alas a los lados ----
  if (id.startsWith('pan_')) {
    const largo = { pan_chicos: 1.6, pan_medianos: 2.6, pan_grandes: 3.6, pan_desplegables: 3.2 }[id] || 2;
    const m = mat(0x1d3b8a, { metal: 0.6, rug: 0.2, emisivo: 0x0b2a7a, ei: 0.4 });
    for (const s of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), mat(0xaaaaaa), s * 1.4, 3.2, 0, 0, 0, Math.PI / 2);
      add(new THREE.BoxGeometry(largo, 0.06, 1.1), m, s * (1.7 + largo / 2), 3.2, 0);
    }
    g.userData.panel = m; // su brillo depende de la luz del Sol del destino (ver luzSolar)
    return g;
  }
  // ---- Baterías ----
  if (id.startsWith('bat_')) {
    const n = id === 'bat_chica' ? 1 : 2;
    for (let i = 0; i < n; i++) add(new THREE.BoxGeometry(0.55, 0.7, 0.4), mat(0x2f9e5b, { emisivo: 0x1a6b3a, ei: 0.5 }), -0.5 + i * 1.0, 2.0, 1.2);
    return g;
  }
  // ---- Soporte vital: módulo de tripulación arriba ----
  if (id.startsWith('sv_')) {
    add(new THREE.CylinderGeometry(0.95, 1.1, 1.2, 10), mat(0xf2f2f2), 0, 5.9, 0);
    add(new THREE.SphereGeometry(0.45, 10, 8), mat(0x7cf3ff, { emisivo: 0x3fd0ff, ei: 0.6, metal: 0.1, rug: 0.1 }), 0, 6.1, 0.85);
    if (id === 'sv_reciclaje') add(new THREE.SphereGeometry(0.7, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x5be08a, { emisivo: 0x2f9e5b, ei: 0.5 }), 0, 6.5, 0);
    if (id === 'sv_reserva') for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.25, 0.25, 1, 8), mat(0xdfe6f5), s * 1.0, 5.7, -0.5);
    return g;
  }
  // ---- Antena: plato más grande cuanto más ganancia ----
  if (id.startsWith('ant_')) {
    const r = { ant_baja: 0.35, ant_media: 0.7, ant_alta: 1.05 }[id] || 0.5;
    add(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), mat(0xaaaaaa), 0, 7.0, 0);
    add(new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 3), mat(0xf4f4f4, { metal: 0.5, rug: 0.3 }), 0, 7.7, 0, Math.PI, 0, 0);
    add(new THREE.ConeGeometry(0.06, 0.4, 6), mat(0xff9fdc, { emisivo: 0xff9fdc, ei: 0.8 }), 0, 7.9, 0);
    return g;
  }
  // ---- Computadora ----
  if (id.startsWith('comp_')) {
    add(new THREE.BoxGeometry(0.6, 0.4, 0.4), mat(0x2b2f3a), 0.6, 4.0, 1.0);
    add(new THREE.BoxGeometry(0.4, 0.05, 0.3), mat(0x7cf3ff, { emisivo: 0x3fd0ff, ei: 1 }), 0.6, 4.22, 1.0);
    return g;
  }
  // ---- Instrumentos ----
  const pos = { cam_simple: [-1.1, 1.8, 0.7], cam_alta: [-1.1, 1.8, 0.7], termometro: [1.1, 1.8, 0.7], espectrometro: [0, 1.6, -1.3], detector_neutrones: [-1.0, 3.8, -0.8], radar: [1.0, 3.8, -0.8] }[id];
  if (pos) {
    const [x, y, z] = pos;
    if (id === 'radar') add(new THREE.BoxGeometry(1.4, 0.08, 0.6), mat(0x9aa0ad), x + 0.6, y, z);
    else if (id === 'espectrometro') add(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 8), mat(0x5be08a, { emisivo: 0x2f9e5b, ei: 0.4 }), x, y, z, Math.PI / 2);
    else if (id === 'detector_neutrones') add(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 8), mat(0xffd166), x, y, z);
    else {
      add(new THREE.BoxGeometry(0.4, 0.4, 0.5), mat(id === 'cam_alta' ? 0x1b1f2a : 0x404858), x, y, z);
      add(new THREE.CylinderGeometry(0.12, 0.15, 0.25, 10), mat(0x111111, { emisivo: 0x223355, ei: 0.6 }), x, y, z + 0.35, Math.PI / 2);
    }
    return g;
  }
  return null; // estaciones en tierra: no van en la nave
}

export class NaveModelo {
  constructor() {
    this.raiz = new THREE.Group();
    this.piezas = new Map(); // id → { grupo, t }
  }

  /** Sincroniza la nave con la selección { categoria: [ids] }. */
  sincronizar(seleccion) {
    const ids = new Set(Object.values(seleccion).flat());
    for (const [id, p] of this.piezas) {
      if (!ids.has(id)) { p.grupo.removeFromParent(); this.piezas.delete(id); }
    }
    for (const id of ids) {
      if (this.piezas.has(id)) continue;
      const g = piezaDe(id);
      if (!g) continue;
      g.scale.setScalar(0.01);
      this.raiz.add(g);
      this.piezas.set(id, { grupo: g, t: 0 });
    }
  }

  /** Animación de "aparecer" de las piezas nuevas (rebote) y brillo de los paneles. */
  actualizar(dt) {
    // Los paneles brillan según la luz del Sol del destino: en Marte (~43%) brillan menos
    const luz = this.luzSolar ?? 1;
    for (const p of this.piezas.values()) {
      if (p.grupo.userData.panel) { p.grupo.userData.panel.emissive.setHex(0x2a6cff); p.grupo.userData.panel.emissiveIntensity = 0.1 + 1.3 * luz * luz; }
    }
    for (const p of this.piezas.values()) {
      if (p.t >= 1) continue;
      p.t = Math.min(1, p.t + dt * 2.2);
      const s = 1 + Math.sin(p.t * Math.PI) * 0.25 * (1 - p.t);
      p.grupo.scale.setScalar(Math.max(0.01, p.t * s));
    }
  }
}
