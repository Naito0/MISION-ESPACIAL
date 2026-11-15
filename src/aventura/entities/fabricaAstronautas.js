// =============================================================
// fabricaAstronautas.js — Crea astronautas.
// 1) Si existe public/models/astronauta.glb (un modelo CC0 con animaciones,
//    ver CREDITOS.md), se usa ESE modelo con sus animaciones.
// 2) Si no existe, se usa el astronauta 3D procedural (Astronauta.js).
// Así el juego funciona siempre, y mejora solo cuando se agrega el archivo.
// Los dos tipos tienen la misma "forma": raiz, reproducir(), mantener(),
// actualizar(dt, estado) y desmayado.
// =============================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as clonarConEsqueleto } from 'three/addons/utils/SkeletonUtils.js';
import { Astronauta } from './Astronauta.js';
import { Personaje, PERSONAJES } from './Personaje.js';

// Ruta RELATIVA a donde está publicado el juego (BASE_URL = './'), así funciona
// aunque el link esté dentro de una subcarpeta (por ejemplo en GitHub Pages).
const RUTA_MODELO = `${import.meta.env.BASE_URL}models/astronauta.glb`;
let plantilla = null; // { scene, animations } cargado una sola vez

/**
 * Intenta cargar el modelo GLB. Devuelve true si hay modelo.
 * alProgreso(fraccion 0..1) se llama mientras baja el archivo (para la barra de carga).
 */
export async function prepararModelos(alProgreso = () => {}) {
  try {
    const r = await fetch(RUTA_MODELO, { method: 'HEAD' });
    const tipo = r.headers.get('content-type') || '';
    if (!r.ok || tipo.includes('html')) return false; // no está (el servidor devolvió la página)
    plantilla = await new GLTFLoader().loadAsync(RUTA_MODELO, (x) => { if (x.total) alProgreso(x.loaded / x.total); });
    return true;
  } catch {
    plantilla = null;
    return false;
  }
}

/**
 * Crea un tripulante: uno de los 4 PERSONAJES originales (Personaje.js) con el
 * traje del color del rol. Si no se dice cuál, se van turnando.
 * (El astronauta viejo, Astronauta.js / AstronautaGLB, queda en el código sin usarse.)
 */
let turno = 0;
export function crearAstronauta(colorRol, personajeId = null) {
  const id = personajeId || PERSONAJES[turno++ % PERSONAJES.length].id;
  return new Personaje(id, colorRol);
}
/** Versión vieja (no se usa): astronauta GLB o procedural. */
export function crearAstronautaViejo(colorRol) {
  return plantilla ? new AstronautaGLB(plantilla, colorRol) : new Astronauta(colorRol);
}

// Nombres de animación que buscamos dentro del GLB (cada paquete los llama distinto)
const BUSCAR = {
  quieto: /idle|stand/i,
  caminar: /walk/i,
  correr: /run|sprint/i,
  saltar: /jump/i,
  interactuar: /interact|use|punch|pick|wave|work/i,
  desmayado: /death|die|dead|fall/i
};

/** Astronauta hecho con un modelo GLB animado (THREE.AnimationMixer). */
class AstronautaGLB {
  constructor(gltf, colorRol) {
    this.raiz = new THREE.Group();
    const modelo = clonarConEsqueleto(gltf.scene);
    // Escala para que mida ~1,8 m y los pies queden en y = 0
    const caja = new THREE.Box3().setFromObject(modelo);
    const alto = caja.max.y - caja.min.y || 1;
    modelo.scale.setScalar(1.8 / alto);
    modelo.position.y = -caja.min.y * (1.8 / alto);
    modelo.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    this.raiz.add(modelo);
    // Anillo del color del rol (para reconocer a cada uno)
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 8, 24),
      new THREE.MeshStandardMaterial({ color: colorRol, emissive: colorRol, emissiveIntensity: 1.6 }));
    anillo.rotation.x = Math.PI / 2;
    anillo.position.y = 0.05;
    this.raiz.add(anillo);

    this.mezclador = new THREE.AnimationMixer(modelo);
    this.acciones = {};
    for (const [clave, patron] of Object.entries(BUSCAR)) {
      const clip = gltf.animations.find((a) => patron.test(a.name));
      if (clip) this.acciones[clave] = this.mezclador.clipAction(clip);
    }
    if (this.acciones.desmayado) { this.acciones.desmayado.setLoop(THREE.LoopOnce); this.acciones.desmayado.clampWhenFinished = true; }
    this.actual = null;
    this.accion = null;
    this.desmayado = false;
    this.cambiar('quieto');
  }

  cambiar(nombre) {
    const a = this.acciones[nombre] || this.acciones.quieto;
    if (!a || a === this.actual) return;
    a.reset().fadeIn(0.2).play();
    if (this.actual) this.actual.fadeOut(0.2);
    this.actual = a;
  }

  reproducir(nombre, duracion = 0.8) {
    if (nombre === 'desmayarse') { this.desmayado = true; return; }
    if (nombre === 'levantarse') { this.desmayado = false; return; }
    this.accion = { nombre, tiempo: 0, duracion };
  }

  mantener(nombre) {
    if (!this.accion || this.accion.nombre !== nombre) this.accion = { nombre, tiempo: 0, duracion: 0.3 };
    else this.accion.duracion = this.accion.tiempo + 0.3;
  }

  actualizar(dt, e) {
    let nombre = 'quieto';
    if (this.desmayado) nombre = 'desmayado';
    else if (this.accion) {
      this.accion.tiempo += dt;
      nombre = 'interactuar';
      if (this.accion.tiempo >= this.accion.duracion) this.accion = null;
    } else if (!e.apoyado) nombre = 'saltar';
    else if (e.velocidad > 4.5) nombre = 'correr';
    else if (e.velocidad > 0.3) nombre = 'caminar';
    this.cambiar(nombre);
    this.mezclador.update(dt);
  }
}
