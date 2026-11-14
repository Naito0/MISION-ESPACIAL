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
import { iniciarPantallaLobby } from './pantallas/pantallaLobby.js';
import { iniciarPantallaHangar } from './pantallas/pantallaHangar.js';
import { iniciarPantallaSistema } from './pantallas/pantallaSistema.js';
import { iniciarPantallaInforme } from './pantallas/pantallaInforme.js';
import { iniciarPantallaAterrizaje } from './pantallas/pantallaAterrizaje.js';
import { iniciarPantallaSuperficie } from './pantallas/pantallaSuperficie.js';
import { conectarServidor, crearConexionLocal } from './red/conexion.js';
import { abrirMinijuego } from './minijuegos/index.js';
import { calidad3D } from '../systems/preferencias.js';
import { MARTE } from './datos3d.js';

const hud = document.getElementById('hud');
const motor = new Motor3D(document.getElementById('mundo3d'), calidad3D());
const control = crearControlTeclado('teclado1', motor.renderer.domElement);

// ---- Interfaz fija: ayuda de controles, FPS y menú ----
hud.innerHTML = `
  <div class="panel ayuda">
    Clic + mouse: cámara · <span class="tecla">WASD</span> moverse ·
    <span class="tecla">Shift</span> correr · <span class="tecla">Espacio</span> saltar ·
    <span class="tecla">E</span> usar · <span class="tecla">Esc</span> menú
  </div>
  <div class="fps"></div>
  <div class="cargando">Cargando…</div>`;
const capa = document.createElement('div'); // capa de cada pantalla
hud.appendChild(capa);
const menu = crearMenuPausa(hud, { alAbrir: () => { motor.pausado = true; }, alCerrar: () => { motor.pausado = false; } });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !document.pointerLockElement && !window.consolaAbierta) menu.alternar(); });
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
  // 'juego' = la pantalla que corresponde a la fase actual de la sala
  const fase = ctx.conexionActiva?.estado?.fase;
  if (nombre === 'lobby' || fase === 'lobby' || !fase) pantalla = iniciarPantallaLobby(ctx);
  else if (fase === 'sistema') pantalla = iniciarPantallaSistema(ctx);
  else if (fase === 'hangar') pantalla = iniciarPantallaHangar(ctx);
  else if (fase === 'informe') pantalla = iniciarPantallaInforme(ctx);
  else if (fase === 'aterrizaje') pantalla = iniciarPantallaAterrizaje(ctx);
  else if (fase === 'superficie') pantalla = iniciarPantallaSuperficie(ctx);
  else pantalla = iniciarPantallaNave(ctx); // viaje, llegada o fracaso
  window.aventura.pantalla = pantalla;
  // El mouse solo se captura donde se camina (nave y superficie)
  window.capturarMouse = !!pantalla.jugador;
  hud.querySelector('.ayuda').style.display = window.capturarMouse ? '' : 'none';
}
ctx.conexionLocal = crearConexionLocal;
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

window.aventura = { motor, THREE, irA, ctx, abrirMinijuego };
// Primero se intenta cargar el modelo GLB del astronauta (si existe) y después arranca el juego
Promise.all([prepararModelos(), conectarServidor()]).then(([hayModelo, conexion]) => {
  hud.querySelector('.cargando').remove();
  window.aventura.modeloGLB = hayModelo;
  ctx.conexion = conexion; // null si no hay servidor (entonces solo se puede jugar solo)
  irA('lobby');
});
