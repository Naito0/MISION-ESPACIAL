// =============================================================
// Motor3D.js — El "corazón" de la aventura 3D (Three.js).
//   - Crea el renderizador (el que dibuja) según la calidad elegida.
//   - Tiene la escena actual y la cámara.
//   - Corre el bucle del juego: cada cuadro llama a las funciones
//     registradas con alActualizar(fn) y después dibuja.
// =============================================================
import * as THREE from 'three';
import { configCalidad } from './calidad.js';

export class Motor3D {
  /**
   * @param contenedor elemento HTML donde va el canvas
   * @param nivelCalidad 'bajo' | 'medio' | 'alto'
   */
  constructor(contenedor, nivelCalidad = 'medio') {
    this.contenedor = contenedor;
    this.calidad = configCalidad(nivelCalidad);
    this.nivelCalidad = nivelCalidad;

    this.renderer = new THREE.WebGLRenderer({ antialias: this.calidad.antialias, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = this.calidad.sombras;
    // Sombras: Medio = simples (más rápidas); Alto = suaves
    this.renderer.shadowMap.type = nivelCalidad === 'alto' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.renderer.toneMappingExposure = 1.1; // colores un poco más vivos
    contenedor.appendChild(this.renderer.domElement);

    this.escena = new THREE.Scene();
    this.camara = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
    this.reloj = new THREE.Clock();
    this.actualizadores = new Set();
    this.pausado = false;

    this.ajustarTamano = this.ajustarTamano.bind(this);
    window.addEventListener('resize', this.ajustarTamano);
    this.ajustarTamano();
  }

  /** Ajusta el canvas al tamaño de la ventana y a la resolución de la calidad elegida. */
  ajustarTamano() {
    const ancho = window.innerWidth;
    const alto = window.innerHeight;
    // Resolución interna máxima: Bajo 1 · Medio 1,5 · Alto 2 (más no se nota y calienta la PC)
    const tope = this.calidad.pixelRatioMax ?? 1.5;
    const pr = Math.min(window.devicePixelRatio || 1, 2) * this.calidad.escalaResolucion;
    this.renderer.setPixelRatio(Math.max(0.5, Math.min(pr, tope)));
    this.renderer.setSize(ancho, alto);
    this.camara.aspect = ancho / alto;
    this.camara.updateProjectionMatrix();
  }

  /** Registra una función que se llama cada cuadro con dt (segundos). Devuelve otra para quitarla. */
  alActualizar(fn) {
    this.actualizadores.add(fn);
    return () => this.actualizadores.delete(fn);
  }

  /** Cambia la escena que se dibuja (y vacía los actualizadores de la anterior). */
  cambiarEscena(escena) {
    this.liberar(this.escena);
    this.escena = escena;
    this.actualizadores.clear();
  }

  /** Libera la memoria de la GPU de una escena que ya no se usa. */
  liberar(escena) {
    escena.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
      mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
  }

  /** Arranca el bucle del juego. */
  iniciar() {
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.reloj.getDelta(), 0.05); // máximo 50 ms por cuadro (evita "saltos")
      if (!this.pausado) this.actualizadores.forEach((fn) => fn(dt));
      if (this.dibujar) this.dibujar(); // la pantalla dividida reemplaza esta función
      else this.renderer.render(this.escena, this.camara);
    });
  }
}
