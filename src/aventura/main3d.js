// =============================================================
// main3d.js — Arranque de la AVENTURA 3D (Three.js).
// El modo clásico (Phaser) sigue en index.html y no se toca.
//
// Fase 2: un astronauta 3D que camina, corre y salta por la zona de
// pruebas, con física (gravedad y colisiones) y cámara en tercera persona.
// =============================================================
import * as THREE from 'three';
import { Motor3D } from './engine/Motor3D.js';
import { crearLuces } from './engine/luces.js';
import { MundoFisico, CuerpoJugador } from './engine/fisica.js';
import { CamaraTercera } from './engine/camaraTercera.js';
import { crearControlTeclado, finDeCuadro } from './engine/entrada.js';
import { Astronauta } from './entities/Astronauta.js';
import { crearZonaPruebas } from './escenarios/zonaPruebas.js';
import { crearMenuPausa } from './ui/menuPausa.js';
import { calidad3D, sensibilidad3D } from '../systems/preferencias.js';
import { TIERRA } from './datos3d.js';

const hud = document.getElementById('hud');
const motor = new Motor3D(document.getElementById('mundo3d'), calidad3D());

/** Carga un escenario en el motor: luces, niebla, fondo y física. */
function cargarEscenario(datos, gravedad) {
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(datos.colorFondo);
  if (motor.calidad.niebla && datos.niebla) escena.fog = new THREE.Fog(...datos.niebla);
  crearLuces(escena, { sombras: motor.calidad.sombras, tamanoSombra: motor.calidad.tamanoSombra });
  escena.add(datos.raiz);
  motor.cambiarEscena(escena);
  return { escena, mundo: new MundoFisico(datos.colisiones, gravedad) };
}

// ---- Escenario y jugador ----
const zona = crearZonaPruebas();
const { escena, mundo } = cargarEscenario(zona, TIERRA.gravedad);
const astronauta = new Astronauta(0x7cc4ff);
escena.add(astronauta.raiz);
const cuerpo = new CuerpoJugador(mundo, zona.puntoInicio);
const control = crearControlTeclado('teclado1', motor.renderer.domElement);
const camara = new CamaraTercera(motor.camara, zona.colisiones);

const deseo = new THREE.Vector3();
const adelante = new THREE.Vector3();
const derecha = new THREE.Vector3();
const pies = new THREE.Vector3();
const cabeza = new THREE.Vector3();
let anguloAnterior = 0;

motor.alActualizar((dt) => {
  const e = control.leer();
  camara.sensibilidad = sensibilidad3D();
  camara.girar(e.camaraX, e.camaraY, e.zoom);

  // Movimiento relativo a la cámara: "adelante" es hacia donde mira la cámara
  camara.adelante(adelante);
  camara.derecha(derecha);
  deseo.set(0, 0, 0).addScaledVector(adelante, e.moverY).addScaledVector(derecha, e.moverX);
  if (deseo.lengthSq() > 1) deseo.normalize();
  if (astronauta.desmayado) deseo.set(0, 0, 0);
  cuerpo.actualizar(dt, deseo, e.correr, e.saltar);

  // El astronauta sigue a la física y mira hacia donde camina
  cuerpo.pies(pies);
  astronauta.raiz.position.copy(pies);
  const velHorizontal = Math.hypot(cuerpo.velocidad.x, cuerpo.velocidad.z);
  let giro = 0;
  if (velHorizontal > 0.2) {
    const objetivo = Math.atan2(cuerpo.velocidad.x, cuerpo.velocidad.z);
    let diferencia = objetivo - astronauta.raiz.rotation.y;
    diferencia = Math.atan2(Math.sin(diferencia), Math.cos(diferencia));
    astronauta.raiz.rotation.y += diferencia * Math.min(1, 12 * dt);
    giro = (astronauta.raiz.rotation.y - anguloAnterior) / dt;
  }
  anguloAnterior = astronauta.raiz.rotation.y;
  if (e.interactuarPulsado) astronauta.reproducir('interactuar', 0.9);
  astronauta.actualizar(dt, { velocidad: velHorizontal, apoyado: cuerpo.apoyado, velocidadVertical: cuerpo.velocidad.y, giro });

  // La cámara sigue la cabeza del astronauta
  cabeza.copy(pies).y += 1.6;
  camara.actualizar(dt, cabeza);
  finDeCuadro();
});

// ---- Interfaz ----
hud.innerHTML = `
  <div class="panel titulo">Misión Espacial · Aventura 3D (zona de pruebas)</div>
  <div class="panel ayuda">
    Haz clic para controlar la cámara con el mouse ·
    <span class="tecla">W</span><span class="tecla">A</span><span class="tecla">S</span><span class="tecla">D</span> moverse ·
    <span class="tecla">Shift</span> correr · <span class="tecla">Espacio</span> saltar · <span class="tecla">E</span> interactuar ·
    rueda: zoom · <span class="tecla">ESC</span> menú
  </div>
  <div class="fps"></div>`;
const menu = crearMenuPausa(hud, { alAbrir: () => { motor.pausado = true; }, alCerrar: () => { motor.pausado = false; } });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !document.pointerLockElement) menu.alternar(); });
// Al salir del modo "mouse capturado" con ESC, el navegador no avisa la tecla: abrimos el menú igual
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && !menu.abierto) menu.abrir(); });

// Contador de cuadros por segundo (para medir el rendimiento)
let cuadros = 0;
let acumulado = 0;
const fps = hud.querySelector('.fps');
motor.alActualizar((dt) => {
  cuadros++; acumulado += dt;
  if (acumulado >= 1) { fps.textContent = `${cuadros} FPS · calidad ${motor.calidad.nombre}`; cuadros = 0; acumulado = 0; }
});

motor.iniciar();
window.aventura = { motor, THREE, cuerpo, astronauta, camara }; // para depurar y para las pruebas
