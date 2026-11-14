// =============================================================
// main3d.js — Arranque de la AVENTURA 3D (Three.js).
// El modo clásico (Phaser) sigue en index.html y no se toca.
//
// Fase 1: motor, luces, escenario de prueba y una cámara orbital
// para recorrerlo (arrastrar con el mouse para girar, rueda para zoom).
// =============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Motor3D } from './engine/Motor3D.js';
import { crearLuces } from './engine/luces.js';
import { crearZonaPruebas } from './escenarios/zonaPruebas.js';
import { crearMenuPausa } from './ui/menuPausa.js';
import { calidad3D } from '../systems/preferencias.js';

const hud = document.getElementById('hud');
const motor = new Motor3D(document.getElementById('mundo3d'), calidad3D());

/** Carga un escenario en el motor: luces, niebla y fondo. */
function cargarEscenario(datos) {
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(datos.colorFondo);
  if (motor.calidad.niebla && datos.niebla) escena.fog = new THREE.Fog(...datos.niebla);
  crearLuces(escena, { sombras: motor.calidad.sombras, tamanoSombra: motor.calidad.tamanoSombra });
  escena.add(datos.raiz);
  motor.cambiarEscena(escena);
  return escena;
}

// ---- Escenario de prueba con cámara orbital (Fase 1) ----
const zona = crearZonaPruebas();
cargarEscenario(zona);
motor.camara.position.set(12, 10, 18);
const orbita = new OrbitControls(motor.camara, motor.renderer.domElement);
orbita.target.set(0, 1, 0);
orbita.enableDamping = true;
orbita.maxPolarAngle = Math.PI / 2 - 0.05; // no meterse debajo del piso
motor.alActualizar(() => orbita.update());

// ---- Interfaz ----
hud.innerHTML = `
  <div class="panel titulo">Misión Espacial · Aventura 3D (zona de pruebas)</div>
  <div class="panel ayuda">Arrastra con el mouse para girar · rueda para acercar · <span class="tecla">ESC</span> menú</div>
  <div class="fps"></div>`;
const menu = crearMenuPausa(hud, { alAbrir: () => { motor.pausado = true; }, alCerrar: () => { motor.pausado = false; } });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.alternar(); });

// Contador de cuadros por segundo (para medir el rendimiento)
let cuadros = 0;
let acumulado = 0;
const fps = hud.querySelector('.fps');
motor.alActualizar((dt) => {
  cuadros++; acumulado += dt;
  if (acumulado >= 1) { fps.textContent = `${cuadros} FPS · calidad ${motor.calidad.nombre}`; cuadros = 0; acumulado = 0; }
});

motor.iniciar();
window.aventura = { motor, THREE }; // para depurar desde la consola
