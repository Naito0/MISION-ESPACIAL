// =============================================================
// astronautasFondo.js — Los otros 3 astronautas en la superficie.
// El jugador controla a uno; los demás trabajan "de fondo" con rutas simples:
//   🔧 el Ingeniero TALADRA el suelo para sacar muestras,
//   📡 Comunicaciones va y viene INSTALANDO una antena (que crece de a poco),
//   👨‍✈️ el Piloto MANEJA un rover por un camino.
// No tienen física (no están en el grupo de colisiones): nunca bloquean al jugador.
// =============================================================
import * as THREE from 'three';
import { crearAstronauta } from './fabricaAstronautas.js';
import { crearEtiqueta } from './AstronautaRemoto.js';
import { colorDe } from '../tripulacion.js';

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: o.metal ?? 0.5, roughness: o.rug ?? 0.5, flatShading: true, emissive: o.emisivo ?? 0, emissiveIntensity: o.ei ?? 1 });

export function crearAstronautasFondo(escena) {
  const tareas = [];

  // ---- 🔧 Ingeniero: taladro ----
  {
    const pos = new THREE.Vector3(7, 0, -4);
    const taladro = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.8), mat(0x555a66));
    base.position.y = 0.15;
    const torre = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.8, 0.15), mat(0xffd166));
    torre.position.y = 1.1;
    const broca = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.02, 0.9, 6), mat(0xcfd8e8, { metal: 0.9 }));
    broca.position.set(0.25, 0.5, 0);
    taladro.add(base, torre, broca);
    taladro.position.copy(pos);
    escena.add(taladro);
    const a = crearAstronauta(colorDe('ingeniero'));
    a.raiz.position.set(pos.x - 1, 0, pos.z);
    a.raiz.rotation.y = Math.PI / 2;
    const et = crearEtiqueta('🔧 Taladrando', colorDe('ingeniero')); et.position.y = 2.25; a.raiz.add(et);
    escena.add(a.raiz);
    tareas.push((dt, t) => {
      broca.rotation.y += dt * 20;
      broca.position.y = 0.45 + Math.sin(t * 1.5) * 0.15; // sube y baja
      taladro.position.x = pos.x + (Math.random() - 0.5) * 0.01; // vibra
      a.mantener('reparar');
      a.actualizar(dt, { velocidad: 0, apoyado: true, velocidadVertical: 0, giro: 0 });
    });
  }

  // ---- 📡 Comunicaciones: instala una antena (va y viene con piezas) ----
  {
    const sitio = new THREE.Vector3(-8, 0, -6);
    const deposito = new THREE.Vector3(-3, 0, -2.5);
    const mastil = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 6), mat(0xaaaaaa));
    mastil.position.set(sitio.x, 1.3, sitio.z - 0.8);
    const plato = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 8, 0, Math.PI * 2, 0, Math.PI / 3), mat(0xf4f4f4, { rug: 0.3 }));
    plato.rotation.x = Math.PI * 0.75;
    plato.position.set(sitio.x, 2.6, sitio.z - 0.8);
    escena.add(mastil, plato);
    const caja = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.6), mat(0x7cc4ff));
    caja.position.copy(deposito).setY(0.2);
    escena.add(caja);
    const a = crearAstronauta(colorDe('comunicaciones'));
    a.raiz.position.copy(deposito);
    const et = crearEtiqueta('📡 Instalando antena', colorDe('comunicaciones')); et.position.y = 2.25; a.raiz.add(et);
    escena.add(a.raiz);
    let fase = 'ir'; let espera = 0; let progreso = 0.25;
    tareas.push((dt) => {
      const destino = fase === 'ir' ? sitio : deposito;
      const d = destino.clone().sub(a.raiz.position).setY(0);
      let vel = 0;
      if (fase === 'trabajar' || fase === 'cargar') {
        espera -= dt;
        a.mantener(fase === 'trabajar' ? 'reparar' : 'recoger');
        if (fase === 'trabajar') progreso = Math.min(1, progreso + dt * 0.04);
        if (espera <= 0) fase = fase === 'trabajar' ? 'volver' : 'ir';
      } else if (d.length() > 0.3) {
        vel = 1.6;
        d.setLength(vel * dt);
        a.raiz.position.add(d);
        a.raiz.rotation.y = Math.atan2(d.x, d.z);
      } else {
        fase = fase === 'ir' ? 'trabajar' : 'cargar';
        espera = fase === 'trabajar' ? 5 : 2;
      }
      // La antena crece mientras la instala
      mastil.scale.y = progreso; mastil.position.y = 1.3 * progreso;
      plato.visible = progreso > 0.6;
      a.actualizar(dt, { velocidad: vel, apoyado: true, velocidadVertical: 0, giro: 0 });
    });
  }

  // ---- 👨‍✈️ Piloto: maneja un rover por un camino ----
  {
    const rover = new THREE.Group();
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 1.2), mat(0xdfe6f5));
    cuerpo.position.y = 0.7;
    rover.add(cuerpo);
    const ruedas = [];
    for (const [x, z] of [[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6]]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10), mat(0x333333));
      r.rotation.x = Math.PI / 2;
      r.position.set(x, 0.3, z);
      rover.add(r); ruedas.push(r);
    }
    const antena = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), mat(0xff9fdc, { emisivo: 0xff9fdc, ei: 0.6 }));
    antena.position.set(-0.6, 1.3, 0.4);
    rover.add(antena);
    escena.add(rover);
    const a = crearAstronauta(colorDe('comandante'));
    a.raiz.scale.setScalar(0.85);
    a.raiz.position.set(0.2, 0.9, 0);
    a.raiz.rotation.y = Math.PI / 2;
    rover.add(a.raiz);
    const et = crearEtiqueta('👨‍✈️ Manejando el rover', colorDe('comandante')); et.position.y = 2.4; a.raiz.add(et);
    // Camino: una elipse lejos del módulo (no pasa por la esclusa ni por el laboratorio)
    const centro = new THREE.Vector3(2, 0, -16); const rx = 11; const rz = 5;
    let ang = 0;
    tareas.push((dt) => {
      ang += dt * 0.12;
      const x = centro.x + Math.cos(ang) * rx; const z = centro.z + Math.sin(ang) * rz;
      const dx = -Math.sin(ang) * rx; const dz = Math.cos(ang) * rz;
      rover.position.set(x, 0, z);
      rover.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
      ruedas.forEach((r) => { r.rotation.y += dt * 4; });
      a.actualizar(dt, { velocidad: 0, apoyado: true, velocidadVertical: 0, giro: 0 });
    });
  }

  return { actualizar(dt, t) { tareas.forEach((f) => f(dt, t)); } };
}
