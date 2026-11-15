// =============================================================
// detallesNave.js — Detalles visuales del interior de la nave (v13).
// Solo se VEN: no cambian las colisiones ni la forma de las salas.
//   - Texturas hechas con código (canvas), compartidas por todas las salas:
//     paneles de pared (uniones, remaches, rejillas, franja de advertencia) con
//     mapa de relieve, y piso de rejilla metálica.
//   - Tiras de luz LED en las uniones del piso y del techo (color de cada sala)
//     y paneles de luz en el techo.
//   - Tuberías y mazos de cables en las paredes, con instancing (1 malla para todos).
//   - Marcos de puerta con luz y letreros en cada puerta (con el icono del rol).
//   - Rincones un poco más oscuros (planos de sombra) para dar profundidad.
// Calidad: en Bajo no hay relieve ni tuberías/cables extra.
// =============================================================
import * as THREE from 'three';

// ---------- Texturas compartidas (se crean una sola vez) ----------
let texturas = null;
export function texturasNave() {
  if (texturas) return texturas;
  // Paneles de pared: color y relieve se dibujan juntos (el relieve en escala de grises)
  const dibujarPanel = (relieve) => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = relieve ? '#808080' : '#d9deea'; g.fillRect(0, 0, 256, 256);
    // Uniones entre paneles (2 × 2)
    g.fillStyle = relieve ? '#303030' : '#8d96ad';
    g.fillRect(0, 126, 256, 4); g.fillRect(126, 0, 4, 256); g.fillRect(0, 0, 256, 3); g.fillRect(0, 0, 3, 256);
    // Remaches en las esquinas de cada panel
    g.fillStyle = relieve ? '#e0e0e0' : '#aab2c6';
    for (const x of [12, 116, 140, 244]) for (const y of [12, 116, 140, 244]) { g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); }
    // Rejilla de ventilación en un panel
    g.fillStyle = relieve ? '#202020' : '#5c6580';
    for (let i = 0; i < 6; i++) g.fillRect(150, 36 + i * 11, 80, 5);
    // Franja de advertencia abajo (amarillo y negro)
    if (!relieve) {
      for (let x = -40; x < 296; x += 28) { g.fillStyle = '#e8b931'; g.beginPath(); g.moveTo(x, 256); g.lineTo(x + 14, 256); g.lineTo(x + 34, 230); g.lineTo(x + 20, 230); g.fill(); }
      g.fillStyle = 'rgba(20,20,30,0.85)'; g.fillRect(0, 226, 256, 4);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (!relieve) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  // Piso de rejilla metálica
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#3a4258'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#1c2133';
  for (let x = 0; x < 128; x += 16) for (let y = 0; y < 128; y += 16) g.fillRect(x + 3, y + 3, 10, 10);
  g.strokeStyle = '#59627d'; g.lineWidth = 2; g.strokeRect(1, 1, 126, 126);
  const piso = new THREE.CanvasTexture(c);
  piso.wrapS = piso.wrapT = THREE.RepeatWrapping; piso.colorSpace = THREE.SRGBColorSpace; piso.anisotropy = 4;
  // Sombra de los rincones (degradado negro → transparente)
  const s = document.createElement('canvas'); s.width = 64; s.height = 4;
  const gs = s.getContext('2d'); const grad = gs.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  gs.fillStyle = grad; gs.fillRect(0, 0, 64, 4);
  texturas = { panel: dibujarPanel(false), relieve: dibujarPanel(true), piso, sombra: new THREE.CanvasTexture(s) };
  return texturas;
}

/** Aplica los paneles (y el relieve si la calidad lo permite) a un material de pared. */
export function vestirPared(mat, calidad, repetir = [3, 1]) {
  const t = texturasNave();
  mat.map = t.panel.clone(); mat.map.repeat.set(...repetir); mat.map.needsUpdate = true;
  if (calidad !== 'bajo') { mat.bumpMap = t.relieve.clone(); mat.bumpMap.repeat.set(...repetir); mat.bumpMap.needsUpdate = true; mat.bumpScale = 1.2; }
  mat.needsUpdate = true;
  return mat;
}

/** Letrero con texto (canvas) para poner sobre una puerta. */
function letrero(texto, color) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 112;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(8,14,32,0.92)'; g.beginPath(); g.roundRect(4, 4, 504, 104, 18); g.fill();
  g.lineWidth = 6; g.strokeStyle = `#${color.toString(16).padStart(6, '0')}`; g.stroke();
  g.fillStyle = '#ffffff'; g.font = 'bold 54px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texto, 256, 58);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.42), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
}

/**
 * Agrega los detalles. salas = [{ cx, cz, ancho, prof, color }], puertas = [{ puerta, texto, color, haciaX, haciaZ }]
 */
export function agregarDetallesNave(esc, { calidad = 'medio', alto, salas, puertas }) {
  const visual = esc.visual;
  const bajo = calidad === 'bajo';
  // ---- Tiras LED (piso y techo) y paneles de luz en el techo ----
  const geoTira = new THREE.BoxGeometry(1, 0.05, 0.05);
  const matsLuz = new Map();
  const matLuz = (color) => { if (!matsLuz.has(color)) matsLuz.set(color, new THREE.MeshBasicMaterial({ color })); return matsLuz.get(color); };
  for (const s of salas) {
    const m = matLuz(s.color);
    const bordes = [
      [s.cx, s.cz - s.prof / 2 + 0.2, s.ancho - 0.4, 0], [s.cx, s.cz + s.prof / 2 - 0.2, s.ancho - 0.4, 0],
      [s.cx - s.ancho / 2 + 0.2, s.cz, s.prof - 0.4, Math.PI / 2], [s.cx + s.ancho / 2 - 0.2, s.cz, s.prof - 0.4, Math.PI / 2]
    ];
    for (const [x, z, largo, rot] of bordes) for (const y of [0.04, alto - 0.06]) {
      const tira = new THREE.Mesh(geoTira, m);
      tira.scale.x = largo; tira.position.set(x, y, z); tira.rotation.y = rot;
      visual.add(tira);
    }
    // Paneles de luz en el techo
    const panelLuz = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(2.4, s.ancho * 0.35), 0.5), new THREE.MeshBasicMaterial({ color: 0xe8f0ff }));
    panelLuz.rotation.x = Math.PI / 2;
    for (const dz of s.prof > 12 ? [-8, 0, 8] : [-s.prof / 4, s.prof / 4]) {
      const p = panelLuz.clone(); p.position.set(s.cx, alto - 0.03, s.cz + dz); visual.add(p);
    }
    // Rincones más oscuros: planos de sombra en las 4 esquinas
    const t = texturasNave();
    const matSombra = new THREE.MeshBasicMaterial({ map: t.sombra, transparent: true, depthWrite: false });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      for (const eje of ['x', 'z']) {
        const plano = new THREE.Mesh(new THREE.PlaneGeometry(1.2, alto), matSombra);
        const x = s.cx + sx * (s.ancho / 2 - 0.17); const z = s.cz + sz * (s.prof / 2 - 0.17);
        if (eje === 'x') { plano.position.set(x - sx * 0.01, alto / 2, z - sz * 0.6); plano.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; plano.scale.x = sz > 0 ? 1 : -1; }
        else { plano.position.set(x - sx * 0.6, alto / 2, z - sz * 0.01); plano.rotation.y = sz > 0 ? Math.PI : 0; plano.scale.x = sx > 0 ? -1 : 1; }
        visual.add(plano);
      }
    }
  }
  // ---- Tuberías y mazos de cables con INSTANCING (no en Bajo) ----
  if (!bajo) {
    const tramos = salas.filter((s) => s.tuberias).map((s) => s.tuberias);
    const geoTubo = new THREE.CylinderGeometry(1, 1, 1, 10);
    const tubos = new THREE.InstancedMesh(geoTubo, new THREE.MeshStandardMaterial({ color: 0x9aa6c8, metalness: 0.7, roughness: 0.3 }), tramos.length * 3);
    const cables = new THREE.InstancedMesh(geoTubo, new THREE.MeshStandardMaterial({ color: 0x2b2f3d, roughness: 0.8 }), tramos.length * 5);
    const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler();
    let it = 0; let ic = 0;
    for (const tr of tramos) {
      // tr = { x, z, largo, eje: 'x'|'z' } : a lo largo de una pared, cerca del techo
      e.set(tr.eje === 'x' ? 0 : Math.PI / 2, 0, tr.eje === 'x' ? Math.PI / 2 : 0); q.setFromEuler(e);
      [0.09, 0.07, 0.11].forEach((r, k) => {
        m4.compose(new THREE.Vector3(tr.x, alto - 0.35 - k * 0.25, tr.z), q, new THREE.Vector3(r, tr.largo, r));
        tubos.setMatrixAt(it++, m4);
      });
      for (let k = 0; k < 5; k++) {
        const off = (k - 2) * 0.05;
        m4.compose(new THREE.Vector3(tr.x + (tr.eje === 'z' ? 0 : 0), alto - 1.15 + off, tr.z), q, new THREE.Vector3(0.025, tr.largo, 0.025));
        cables.setMatrixAt(ic++, m4);
      }
    }
    tubos.instanceMatrix.needsUpdate = true; cables.instanceMatrix.needsUpdate = true;
    visual.add(tubos, cables);
  }
  // ---- Marcos de puerta con luz y letreros ----
  for (const d of puertas) {
    const p = d.puerta; const mat = matLuz(d.color);
    const ancho = p.ancho; const altoPuerta = 2.85;
    const vertical = p.orientacion === 'z';
    const lado = (offset) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, altoPuerta, 0.36), mat); b.position.set(p.centro.x + (vertical ? 0 : offset), altoPuerta / 2, p.centro.z + (vertical ? offset : 0)); if (!vertical) b.rotation.y = Math.PI / 2; visual.add(b); };
    lado(-ancho / 2 - 0.04); lado(ancho / 2 + 0.04);
    const dintel = new THREE.Mesh(new THREE.BoxGeometry(ancho + 0.16, 0.08, 0.36), mat);
    dintel.position.set(p.centro.x, altoPuerta, p.centro.z); if (vertical) dintel.rotation.y = Math.PI / 2;
    visual.add(dintel);
    if (d.texto) {
      const l = letrero(d.texto, d.color);
      l.position.set(p.centro.x + d.haciaX * 0.17, 3.12, p.centro.z + d.haciaZ * 0.17);
      l.rotation.y = Math.atan2(d.haciaX, d.haciaZ);
      visual.add(l);
    }
  }
}
