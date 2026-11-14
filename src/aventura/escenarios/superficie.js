// =============================================================
// superficie.js (escenario) — El suelo del destino, low-poly:
//   Marte: suelo rojizo, rocas, cráteres, cielo naranja y polvo que vuela.
//   Luna: suelo gris, cráteres, cielo negro con estrellas y la Tierra a la vista.
// En el centro (0, 0) está el módulo de aterrizaje con su laboratorio.
// Devuelve el escenario { raiz, visual, colisiones, puntoInicio, modulo,
// posLaboratorio, colorCielo, actualizar(dt, t) }.
// =============================================================
import * as THREE from 'three';
import { nuevoEscenario, caja, material } from '../engine/construccion.js';
import { cielo, particulas } from '../engine/decoracion.js';

/** Módulo de aterrizaje low-poly (patas, cuerpo, tobera). */
export function crearModulo() {
  const g = new THREE.Group();
  const blanco = new THREE.MeshStandardMaterial({ color: 0xe8ecf4, metalness: 0.4, roughness: 0.4, flatShading: true });
  const oro = new THREE.MeshStandardMaterial({ color: 0xd8a640, metalness: 0.8, roughness: 0.3, flatShading: true });
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 2.0, 8), oro);
  cuerpo.position.y = 2.2;
  g.add(cuerpo);
  const cabina = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 1.4, 8), blanco);
  cabina.position.y = 3.9;
  g.add(cabina);
  const ventana = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x7cf3ff, emissive: 0x3fd0ff, emissiveIntensity: 1 }));
  ventana.position.set(0, 4.0, 1.3);
  g.add(ventana);
  const tobera = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.8, 0.8, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0x3a3f4c, metalness: 0.9, side: THREE.DoubleSide }));
  tobera.position.y = 0.9;
  g.add(tobera);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), blanco);
    pata.position.set(Math.cos(a) * 2.0, 1.0, Math.sin(a) * 2.0);
    pata.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45);
    g.add(pata);
    const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.1, 8), blanco);
    pie.position.set(Math.cos(a) * 2.5, 0.05, Math.sin(a) * 2.5);
    g.add(pie);
  }
  // Llama del motor (se ve al acelerar)
  const llama = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.2, 10), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.85 }));
  llama.rotation.x = Math.PI;
  llama.position.y = -0.4;
  llama.visible = false;
  g.add(llama);
  g.userData.llama = llama;
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function crearSuperficie(destino, o = {}) {
  const marte = destino.id === 'marte';
  const esc = nuevoEscenario();
  const colorSuelo = marte ? 0xb5532c : 0x8d8d8d;
  esc.colorCielo = marte ? 0xd99a62 : 0x000000;
  esc.niebla = marte ? { color: 0xd99a62, cerca: 25, lejos: 120 } : null;

  // Suelo (sólido) con un poco de relieve visual
  const suelo = caja(esc, 220, 1, 220, material(colorSuelo, { rugosidad: 1, metal: 0 }), 0, -0.5, 0);
  suelo.castShadow = false;
  const relieve = new THREE.Mesh(new THREE.PlaneGeometry(220, 220, 60, 60), new THREE.MeshStandardMaterial({ color: colorSuelo, roughness: 1, flatShading: true }));
  const pos = relieve.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i); const y = pos.getY(i);
    const lejos = Math.hypot(x, y) > 30 ? 1 : 0; // plano cerca del módulo, con lomas a lo lejos
    pos.setZ(i, lejos * (Math.sin(x * 0.08) * Math.cos(y * 0.07) * 2.5 + Math.random() * 0.4));
  }
  relieve.geometry.computeVertexNormals();
  relieve.rotation.x = -Math.PI / 2;
  relieve.position.y = 0.01;
  relieve.receiveShadow = true;
  esc.visual.add(relieve);

  // Cráteres (anillos, solo visuales)
  const colorBorde = marte ? 0x9c4524 : 0x777777;
  for (let i = 0; i < 14; i++) {
    const r = 1.5 + Math.random() * 5;
    const ang = Math.random() * Math.PI * 2;
    const d = 12 + Math.random() * 70;
    const cr = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.18, 5, 18), new THREE.MeshStandardMaterial({ color: colorBorde, roughness: 1, flatShading: true }));
    cr.rotation.x = Math.PI / 2;
    cr.scale.z = 0.35;
    cr.position.set(Math.cos(ang) * d, 0.05, Math.sin(ang) * d);
    esc.visual.add(cr);
    const fondo = new THREE.Mesh(new THREE.CircleGeometry(r, 18), new THREE.MeshStandardMaterial({ color: marte ? 0x8c3c1e : 0x666666, roughness: 1 }));
    fondo.rotation.x = -Math.PI / 2;
    fondo.position.set(cr.position.x, 0.03, cr.position.z);
    esc.visual.add(fondo);
  }

  // Rocas (sólidas: no se atraviesan), lejos del módulo
  const matRoca = new THREE.MeshStandardMaterial({ color: marte ? 0x7a3a22 : 0x5f5f5f, roughness: 1, flatShading: true });
  for (let i = 0; i < (o.muchasRocas === false ? 20 : 40); i++) {
    const s = 0.4 + Math.random() * 1.6;
    const ang = Math.random() * Math.PI * 2;
    const d = 7 + Math.random() * 60;
    const roca = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), matRoca);
    roca.position.set(Math.cos(ang) * d, s * 0.4, Math.sin(ang) * d);
    roca.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    roca.scale.y = 0.6 + Math.random() * 0.5;
    roca.castShadow = true;
    esc.colisiones.add(roca);
  }

  // Cielo
  if (marte) {
    const sol = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff4dd }));
    sol.position.set(-80, 70, -120);
    esc.visual.add(sol);
  } else {
    cielo(esc, 1500, 170);
    // La Tierra vista desde la Luna
    const tierra = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 24), new THREE.MeshStandardMaterial({ color: 0x2f6fd6, emissive: 0x0c2a66, emissiveIntensity: 0.6, roughness: 0.7 }));
    tierra.position.set(60, 70, -140);
    esc.visual.add(tierra);
    const nubes = new THREE.Mesh(new THREE.SphereGeometry(9.2, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
    tierra.add(nubes);
    esc.tierra = tierra;
  }

  // Polvo que vuela (solo Marte)
  const polvo = marte ? particulas(esc, { cantidad: o.particulas === false ? 80 : 260, centro: new THREE.Vector3(0, 3, 0), tamano: new THREE.Vector3(70, 6, 70), velocidad: 1.6, color: 0xe0a070, tam: 0.12, opacidad: 0.5 }) : null;

  // Módulo de aterrizaje (sólido) y mesa de laboratorio a su lado
  const modulo = crearModulo();
  esc.visual.add(modulo);
  esc.modulo = modulo;
  caja(esc, 3.2, 3.4, 3.2, material(0x000000, { transparente: true, opacidad: 0 }), 0, 1.7, 0, { sombra: false }).visible = false;
  const mesa = caja(esc, 1.6, 0.9, 0.9, material(0x2b2f3a, { metal: 0.6 }), 3.6, 0.45, 0);
  const pantalla = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.06), new THREE.MeshStandardMaterial({ color: 0x5be08a, emissive: 0x2f9e5b, emissiveIntensity: 1.2 }));
  pantalla.position.set(3.6, 1.35, -0.3);
  esc.visual.add(pantalla);
  esc.mesa = mesa;
  esc.posLaboratorio = new THREE.Vector3(3.6, 0, 0);
  // Paneles solares del módulo, al otro lado. Brillan según la luz del Sol del destino:
  // en Marte llega cerca del 43% de la luz, y además el polvo los cubre (más opacos).
  const brillo = (destino.juego?.factorSolar ?? 1) * (destino.armado?.factorPolvo ?? 1);
  const matPanel = new THREE.MeshStandardMaterial({ color: marte ? 0x5a4a5a : 0x1d3b8a, emissive: 0x2a6cff, emissiveIntensity: 0.15 + 1.2 * brillo * brillo, metalness: 0.5, roughness: marte ? 0.9 : 0.3 });
  for (const dz of [-1.1, 1.1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 1.8), matPanel);
    panel.position.set(-4.2, 1.3, dz); panel.rotation.z = 0.35;
    panel.castShadow = true;
    esc.visual.add(panel);
  }
  caja(esc, 0.15, 1.3, 0.15, material(0xaaaaaa), -4.2, 0.65, 0, { solida: false });
  esc.posPaneles = new THREE.Vector3(-4.2, 0, 0);
  esc.puntoInicio = new THREE.Vector3(0, 0.05, 4.5);

  esc.actualizar = (dt, t) => {
    if (polvo) polvo.actualizar(dt);
    if (esc.tierra) esc.tierra.rotation.y += dt * 0.05;
    pantalla.material.emissiveIntensity = 1 + Math.sin(t * 3) * 0.3;
  };
  return esc;
}

/** Luces de la superficie (sol fuerte en la Luna, luz cálida y difusa en Marte). */
export function lucesSuperficie(escena, destino, sombras) {
  const marte = destino.id === 'marte';
  escena.add(new THREE.HemisphereLight(marte ? 0xffd2a8 : 0x8899bb, marte ? 0x5a2a18 : 0x222222, marte ? 1.1 : 0.5));
  const sol = new THREE.DirectionalLight(0xfff2dd, marte ? 1.6 : 2.8);
  sol.position.set(-30, 40, 20);
  if (sombras) {
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, far: 150 });
  }
  escena.add(sol);
  return sol;
}
