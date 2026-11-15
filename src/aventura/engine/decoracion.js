// =============================================================
// decoracion.js — Piezas para que los escenarios NO se vean vacíos:
// pantallas que brillan, consolas, tuberías, cajas, franjas de luz,
// partículas de polvo y chispas, y un cielo de estrellas.
// Todo con geometrías simples (low-poly) para que ande en cualquier laptop.
// =============================================================
import * as THREE from 'three';
import { caja, cilindro, material } from './construccion.js';

/** Textura de pantalla "holográfica" dibujada con canvas (gráficos y texto). */
export function texturaPantalla(colorHex, titulo = '', tipo = 'grafico') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  const color = `#${colorHex.toString(16).padStart(6, '0')}`;
  g.fillStyle = '#04101f'; g.fillRect(0, 0, 256, 160);
  g.strokeStyle = color; g.lineWidth = 3; g.strokeRect(4, 4, 248, 152);
  g.fillStyle = color; g.font = 'bold 18px Arial'; g.fillText(titulo, 14, 28);
  g.globalAlpha = 0.85;
  if (tipo === 'grafico') {
    g.beginPath();
    for (let x = 0; x <= 228; x += 6) g.lineTo(14 + x, 110 - Math.sin(x / 18) * 25 - Math.random() * 12);
    g.stroke();
    for (let i = 0; i < 6; i++) g.fillRect(150 + i * 15, 140 - (20 + Math.random() * 50), 10, 20 + Math.random() * 50);
  } else if (tipo === 'radar') {
    g.beginPath(); g.arc(128, 92, 55, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(128, 92, 30, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 5; i++) g.fillRect(90 + Math.random() * 80, 60 + Math.random() * 60, 5, 5);
  } else {
    for (let i = 0; i < 6; i++) g.fillRect(14, 45 + i * 17, 60 + Math.random() * 160, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Pantalla que brilla (plano con textura emisiva). */
export function pantalla(esc, ancho, alto, colorHex, titulo, tipo, x, y, z, rotY = 0, inclinacion = 0) {
  const tex = texturaPantalla(colorHex, titulo, tipo);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto),
    new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.1, roughness: 0.3 }));
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.rotation.x = inclinacion;
  esc.visual.add(m);
  return m;
}

/** Consola de trabajo: mueble + pantalla inclinada + botones de colores. Devuelve la pantalla. */
export function consola(esc, x, z, rotY, colorHex, titulo, tipo = 'grafico') {
  const grupo = new THREE.Group();
  grupo.position.set(x, 0, z);
  grupo.rotation.y = rotY;
  esc.colisiones.add(grupo);
  const mueble = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 0.8), material(0x39425e, { metal: 0.5, rugosidad: 0.4 }));
  mueble.position.y = 0.5;
  mueble.castShadow = true;
  grupo.add(mueble);
  const tapa = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.95), material(0x4b5677, { metal: 0.6, rugosidad: 0.3 }));
  tapa.position.set(0, 1.02, 0.05);
  tapa.rotation.x = 0.25;
  grupo.add(tapa);
  const colores = [0xff5a5a, 0xffd166, 0x5be08a, colorHex];
  colores.forEach((c, i) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10),
      new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.5 }));
    b.position.set(-0.55 + i * 0.18, 1.08, 0.3);
    b.rotation.x = 0.25;
    grupo.add(b);
  });
  const tex = texturaPantalla(colorHex, titulo, tipo);
  const pant = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.8),
    new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.2 }));
  pant.position.set(0, 1.55, -0.25);
  pant.rotation.x = -0.15;
  grupo.add(pant);
  return { grupo, pantalla: pant };
}

/** Franja de luz (tubo emisivo), en techo o pared. */
export function franjaLuz(esc, largo, colorHex, x, y, z, rotY = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(largo, 0.06, 0.18),
    new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 2.2 }));
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  esc.visual.add(m);
  return m;
}

/** Tubería horizontal a lo largo de una pared. */
export function tuberia(esc, largo, radio, colorHex, x, y, z, rotY = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, largo, 10), material(colorHex, { metal: 0.7, rugosidad: 0.35 }));
  m.rotation.z = Math.PI / 2;
  const g = new THREE.Group();
  g.add(m);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  esc.visual.add(g);
  return g;
}

/** Varias cajas apiladas con InstancedMesh (un solo dibujo para todas). Son sólidas. */
export function pilaCajas(esc, posiciones, colorHex = 0x8a6a3a) {
  const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  const mat = material(colorHex, { rugosidad: 0.8, metal: 0.1 });
  const inst = new THREE.InstancedMesh(geo, mat, posiciones.length);
  inst.castShadow = true;
  const m = new THREE.Matrix4();
  posiciones.forEach(([x, y, z, r = 0], i) => {
    m.makeRotationY(r).setPosition(x, y + 0.45, z);
    inst.setMatrixAt(i, m);
    // Copia invisible para la física (el Octree no entiende instancias)
    caja(esc, 0.9, 0.9, 0.9, mat, x, y + 0.45, z, { rotY: r }).visible = false;
  });
  esc.visual.add(inst);
  return inst;
}

/** Cielo de estrellas (puntos en una esfera grande). */
export function cielo(esc, cantidad = 1500, radio = 180) {
  const pos = new Float32Array(cantidad * 3);
  for (let i = 0; i < cantidad; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(radio * (0.85 + Math.random() * 0.15));
    pos.set([v.x, v.y, v.z], i * 3);
  }
  // Dos capas: la mitad de las estrellas titila con un ritmo y la otra mitad con otro (suave y lento)
  let p = null;
  [0, 1].forEach((capa) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos.slice(capa * Math.floor(cantidad / 2) * 3, (capa + 1) * Math.floor(cantidad / 2) * 3), 3));
    const m = new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, sizeAttenuation: true, fog: false, transparent: true });
    const capaPts = new THREE.Points(g, m);
    capaPts.onBeforeRender = () => { m.opacity = 0.7 + 0.3 * Math.sin(performance.now() / 1000 * (0.9 + capa * 0.4) + capa * 2); };
    esc.visual.add(capaPts);
    p = p || capaPts;
  });
  return p;
}

/**
 * Partículas que flotan en una caja (polvo) o que saltan (chispas).
 * Devuelve { puntos, actualizar(dt) }.
 */
export function particulas(esc, o) {
  const n = o.cantidad ?? 120;
  const pos = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3);
  const reiniciar = (i) => {
    pos[i * 3] = o.centro.x + (Math.random() - 0.5) * o.tamano.x;
    pos[i * 3 + 1] = o.centro.y + (Math.random() - 0.5) * o.tamano.y;
    pos[i * 3 + 2] = o.centro.z + (Math.random() - 0.5) * o.tamano.z;
    const v = o.velocidad ?? 0.1;
    vel[i * 3] = (Math.random() - 0.5) * v;
    vel[i * 3 + 1] = o.chispas ? Math.random() * v * 3 : (Math.random() - 0.5) * v;
    vel[i * 3 + 2] = (Math.random() - 0.5) * v;
  };
  for (let i = 0; i < n; i++) reiniciar(i);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const puntos = new THREE.Points(g, new THREE.PointsMaterial({
    color: o.color ?? 0xbfd8ff, size: o.tam ?? 0.05, transparent: true, opacity: o.opacidad ?? 0.6, depthWrite: false
  }));
  esc.visual.add(puntos);
  return {
    puntos,
    actualizar(dt) {
      for (let i = 0; i < n; i++) {
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (o.chispas) vel[i * 3 + 1] -= 4 * dt;
        const fuera = Math.abs(pos[i * 3 + 1] - o.centro.y) > o.tamano.y || Math.abs(pos[i * 3] - o.centro.x) > o.tamano.x;
        if (fuera) reiniciar(i);
      }
      g.attributes.position.needsUpdate = true;
    }
  };
}

export { cilindro };
