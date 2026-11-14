// =============================================================
// main3d.js — Arranque del juego 3D (Three.js).
// Maneja las "pantallas" del juego (lobby, sistema solar, hangar, nave,
// superficie, informe). Cada pantalla tiene actualizar(dt, t) y salir().
// =============================================================
import * as THREE from 'three';
import { Motor3D } from './engine/Motor3D.js';
import { crearControlTeclado, finDeCuadro } from './engine/entrada.js';
import { prepararModelos } from './entities/fabricaAstronautas.js';
import { crearMenuPausa } from './ui/menuPausa.js';
import { iniciarPantallaNave } from './pantallas/pantallaNave.js';
import { calidad3D } from '../systems/preferencias.js';
import { MARTE } from './datos3d.js';

const hud = document.getElementById('hud');
const motor = new Motor3D(document.getElementById('mundo3d'), calidad3D());
const control = crearControlTeclado('teclado1', motor.renderer.domElement);

// ---- Interfaz fija: ayuda de controles, FPS y menú ----
hud.innerHTML = `
  <div class="panel ayuda">
    Clic: controlar la cámara con el mouse ·
    <span class="tecla">WASD</span>/<span class="tecla">flechas</span> moverse ·
    <span class="tecla">Shift</span> correr · <span class="tecla">Espacio</span> saltar ·
    <span class="tecla">E</span> interactuar · rueda: zoom · <span class="tecla">ESC</span> menú
  </div>
  <div class="fps"></div>
  <div class="cargando">Cargando…</div>`;
const capa = document.createElement('div'); // capa de cada pantalla
hud.appendChild(capa);
const menu = crearMenuPausa(hud, { alAbrir: () => { motor.pausado = true; }, alCerrar: () => { motor.pausado = false; } });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !document.pointerLockElement) menu.alternar(); });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && !menu.abierto && !window.consolaAbierta) menu.abrir(); });

let cuadros = 0;
let acumulado = 0;
const fps = hud.querySelector('.fps');

// ---- Pantallas ----
let pantalla = null;
const ctx = { motor, hud: capa, control, colorRol: 0x7cc4ff, colorPlaneta: parseInt(MARTE.color.replace('#', ''), 16) };

function irA(nombre) {
  if (pantalla) pantalla.salir();
  capa.innerHTML = '';
  if (nombre === 'nave') pantalla = iniciarPantallaNave(ctx);
  window.aventura.pantalla = pantalla;
}
ctx.irA = irA;

motor.alActualizarGlobal = true;
const reloj = new THREE.Clock();
motor.renderer.setAnimationLoop(() => {
  const dt = Math.min(reloj.getDelta(), 0.05);
  const t = reloj.elapsedTime;
  if (!motor.pausado && pantalla) pantalla.actualizar(dt, t);
  finDeCuadro();
  motor.renderer.render(motor.escena, motor.camara);
  cuadros++; acumulado += dt;
  if (acumulado >= 1) { fps.textContent = `${cuadros} FPS · calidad ${motor.calidad.nombre}`; cuadros = 0; acumulado = 0; }
});

window.aventura = { motor, THREE, irA };
// Primero se intenta cargar el modelo GLB del astronauta (si existe) y después arranca el juego
prepararModelos().then((hayModelo) => {
  hud.querySelector('.cargando').remove();
  window.aventura.modeloGLB = hayModelo;
  irA('nave');
});
