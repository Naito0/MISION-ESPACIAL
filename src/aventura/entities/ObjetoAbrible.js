// =============================================================
// ObjetoAbrible.js — Casilleros, cajones, paneles y ventanas que se abren con E.
// Adentro hay algo: un DATO de la NASA (de hechos_reales.json, con su misión y
// año), una herramienta o una pieza brillante. Simple y rápido: se abre, se lee
// y se puede cerrar otra vez con E.
// =============================================================
import * as THREE from 'three';
import hechosJSON from '../../data/hechos_reales.json';

// Solo los datos ya verificados (los que tienen "verificar" quedan fuera)
const DATOS = Object.values(hechosJSON.hechos).filter((h) => !h.verificar);
const HERRAMIENTAS = ['🔧 Una llave inglesa de repuesto.', '🪛 Un destornillador con imán (para que los tornillos no salgan flotando).', '🩹 Cinta adhesiva gris: arregla casi todo.', '🔦 Una linterna de emergencia.'];
const BRILLANTES = ['✨ ¡Una pieza brillante! Un tornillo dorado.', '✨ ¡Una arandela que brilla como una estrella!', '✨ ¡Un engranaje plateado reluciente!'];

const metal = new THREE.MeshStandardMaterial({ color: 0x9aa6c8, metalness: 0.6, roughness: 0.35 });
const oscuro = new THREE.MeshStandardMaterial({ color: 0x2a3150, metalness: 0.4, roughness: 0.5 });

let cuenta = 0;
/** Elige qué hay adentro: se van turnando dato, herramienta, dato y pieza brillante. */
function contenidoNuevo() {
  const n = cuenta++;
  if (n % 4 === 0 || n % 4 === 2) { // la mitad: un dato de la NASA
    const d = DATOS[Math.floor(Math.random() * DATOS.length)];
    return { tipo: 'dato', texto: `${d.icono} <b>Dato de la NASA</b> (${d.mision}, ${d.anio}): ${d.frase}` };
  }
  if (n % 4 === 1) return { tipo: 'herramienta', texto: HERRAMIENTAS[Math.floor(Math.random() * HERRAMIENTAS.length)] };
  return { tipo: 'brillante', texto: BRILLANTES[Math.floor(Math.random() * BRILLANTES.length)] };
}

export class ObjetoAbrible {
  /**
   * tipo: 'casillero' | 'cajon' | 'panel' | 'ventana'
   * (x, z) = lugar junto a la pared · rotY = hacia dónde mira el frente · y = altura (paneles y ventanas)
   */
  constructor(esc, tipo, x, z, rotY = 0, y = 0) {
    this.tipo = tipo;
    this.abierto = false;
    this.apertura = 0;
    this.contenido = contenidoNuevo(); // en la ventana, junto a las estrellas hay una nota con un dato
    this.grupo = new THREE.Group();
    this.grupo.position.set(x, y, z);
    this.grupo.rotation.y = rotY;
    this.posicion = new THREE.Vector3(x, 0, z);
    const color = new THREE.MeshStandardMaterial({ color: { casillero: 0x4f7fc4, cajon: 0xc98a3c, panel: 0x7a8396, ventana: 0x5a6481 }[tipo], metalness: 0.4, roughness: 0.45 });
    const caja = (w, h, d, mat, px, py, pz, padre = this.grupo) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(px, py, pz); m.castShadow = true; padre.add(m); return m; };
    this.pivote = new THREE.Group();
    if (tipo === 'casillero') {
      caja(0.8, 2, 0.5, oscuro, 0, 1, 0);                    // cuerpo (abierto por delante)
      this.pivote.position.set(-0.4, 1, 0.26);                // bisagra a la izquierda
      caja(0.8, 1.96, 0.04, color, 0.4, 0, 0, this.pivote);   // puerta
      for (let i = 0; i < 3; i++) caja(0.5, 0.03, 0.02, oscuro, 0.4, 0.6 - i * 0.08, 0.03, this.pivote); // rejilla
    } else if (tipo === 'cajon') {
      caja(0.9, 0.8, 0.6, metal, 0, 0.4, 0);
      this.pivote.position.set(0, 0.55, 0.05);
      caja(0.84, 0.3, 0.55, color, 0, 0, 0, this.pivote);     // cajón que sale hacia adelante
      caja(0.3, 0.05, 0.05, oscuro, 0, 0, 0.3, this.pivote);  // manija
    } else if (tipo === 'panel') {
      caja(0.9, 0.7, 0.06, oscuro, 0, 0, 0);
      this.pivote.position.set(0, -0.35, 0.05);               // bisagra abajo
      caja(0.9, 0.7, 0.04, color, 0, 0.35, 0, this.pivote);
      const luz = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
      luz.position.set(0.3, 0.6, 0.03); this.pivote.add(luz);
    } else { // ventana redonda (ojo de buey) con persiana
      const aro = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 10, 28), metal);
      this.grupo.add(aro);
      const c = document.createElement('canvas'); c.width = 128; c.height = 128;
      const g = c.getContext('2d'); g.fillStyle = '#02030a'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`; g.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5); }
      const cielo = new THREE.Mesh(new THREE.CircleGeometry(0.44, 28), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
      cielo.position.z = -0.02; this.grupo.add(cielo);
      this.pivote.position.set(0, 0, 0.03);
      caja(0.86, 0.86, 0.03, color, 0, 0, 0, this.pivote);    // persiana que sube
    }
    this.grupo.add(this.pivote);
    esc.visual.add(this.grupo);
  }

  alternar() { this.abierto = !this.abierto; return this.abierto; }

  actualizar(dt) {
    this.apertura = THREE.MathUtils.clamp(this.apertura + (this.abierto ? 4 : -4) * dt, 0, 1);
    const a = this.apertura;
    if (this.tipo === 'casillero') this.pivote.rotation.y = -a * 1.8;
    else if (this.tipo === 'cajon') this.pivote.position.z = 0.05 + a * 0.45;
    else if (this.tipo === 'panel') this.pivote.rotation.x = a * 1.4;
    else this.pivote.position.y = a * 0.9;
  }
}
