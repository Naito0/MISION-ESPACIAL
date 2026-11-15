// =============================================================
// main3d.js — Arranque del juego 3D (Three.js).
// Maneja las "pantallas" del juego (sistema solar, hangar, nave,
// aterrizaje, superficie, informe). Cada pantalla tiene actualizar(dt, t) y salir().
//
// El juego es un SITIO ESTÁTICO: todo corre en el navegador, sin servidor.
// (El modo en red quedó en el código pero NO se carga: pantallaLobby.js,
//  pantallaNaveRed.js, red/conexion.js y server/.)
// =============================================================
import * as THREE from 'three';
import { Motor3D } from './engine/Motor3D.js';
import { crearControlTeclado, finDeCuadro } from './engine/entrada.js';
import { prepararModelos } from './entities/fabricaAstronautas.js';
import { crearMenuPausa } from './ui/menuPausa.js';
import { iniciarPantallaNave } from './pantallas/pantallaNave.js';
import { iniciarPantallaHangar } from './pantallas/pantallaHangar.js';
import { iniciarPantallaMenu } from './pantallas/pantallaMenu.js';
import { iniciarPantallaSala } from './pantallas/pantallaSala.js';
import { iniciarPantallaSistema } from './pantallas/pantallaSistema.js';
import { iniciarPantallaInforme } from './pantallas/pantallaInforme.js';
import { iniciarPantallaAterrizaje } from './pantallas/pantallaAterrizaje.js';
import { iniciarPantallaSuperficie } from './pantallas/pantallaSuperficie.js';
import { crearPartidaSolo, crearSalaEnRed, unirseASalaEnRed } from '../red/conexion.js';
import { abrirMinijuego, nuevaMisionMinijuegos } from './minijuegos/index.js';
import { crearGuia } from './guia.js';
import { crearAprendizaje } from './aprendizaje.js';
import { crearLogros } from './logros.js';
import { pausar, reanudar, estaPausado } from './pausa.js';
import { calidad3D, dificultad } from '../systems/preferencias.js';
import { MARTE } from './datos3d.js';

// ---- Pantalla de carga (está en index.html): barra de progreso ----
const carga = document.getElementById('carga');
function progresoCarga(fraccion, texto) {
  if (!carga) return;
  carga.querySelector('.relleno').style.width = `${Math.round(Math.min(1, fraccion) * 100)}%`;
  if (texto) carga.querySelector('.texto').textContent = texto;
}
progresoCarga(0.35, 'Preparando el motor 3D…'); // si llegamos aquí, el código del juego ya bajó

const hud = document.getElementById('hud');
const motor = new Motor3D(document.getElementById('mundo3d'), calidad3D());
const control = crearControlTeclado('teclado1', motor.renderer.domElement);

// ---- Interfaz fija: ayuda de controles, FPS y menú ----
hud.innerHTML = `
  <div class="panel ayuda">
    Clic + mouse: cámara · <span class="tecla">WASD</span> moverse ·
    <span class="tecla">Shift</span> correr · <span class="tecla">Espacio</span> saltar ·
    <span class="tecla">E</span> usar · <span class="tecla">1-4</span> astronauta · <span class="tecla">5-8</span> saludar, bailar, reír, gag · <span class="tecla">Esc</span> menú
  </div>
  <div class="fps"></div>`;
const capa = document.createElement('div'); // capa de cada pantalla
hud.appendChild(capa);
// Tarjetas "¿Qué aprendiste?" y diario "Lo que aprendí"
const aprendizaje = crearAprendizaje(hud);
// Medallas: aviso pequeño en una esquina, lista en el informe y Sala de trofeos
const logros = crearLogros(hud);
const menu = crearMenuPausa(hud, {
  alAbrir: () => pausar('menu'),
  alCerrar: () => reanudar('menu'),
  extras: [
    { texto: '📖 Lo que aprendí', accion: () => { pausar('diario'); aprendizaje.abrirDiario(() => reanudar('diario')); } },
    { texto: '🏆 Sala de trofeos', accion: () => { pausar('trofeos'); logros.abrirSala(() => reanudar('trofeos')); } }
  ]
});
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !document.pointerLockElement && !window.consolaAbierta) menu.alternar(); });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && !menu.abierto && !window.consolaAbierta) menu.abrir(); });

let cuadros = 0;
let acumulado = 0;
const fps = hud.querySelector('.fps');

// ---- Pantallas ----
let pantalla = null;
const ctx = { motor, hud: capa, control, colorRol: 0x7cc4ff, colorPlaneta: parseInt(MARTE.color.replace('#', ''), 16) };

function irA() {
  if (pantalla) pantalla.salir();
  capa.innerHTML = '';
  // La pantalla que corresponde a la fase actual de la partida
  const fase = ctx.conexionActiva?.estado?.fase;
  if (!ctx.conexionActiva) pantalla = iniciarPantallaMenu(ctx);
  else if (fase === 'lobby') pantalla = iniciarPantallaSala(ctx);
  else if (fase === 'hangar') pantalla = iniciarPantallaHangar(ctx);
  else if (fase === 'informe') pantalla = iniciarPantallaInforme(ctx);
  else if (fase === 'aterrizaje') pantalla = iniciarPantallaAterrizaje(ctx);
  else if (fase === 'superficie') pantalla = iniciarPantallaSuperficie(ctx);
  else if (['viaje', 'llegada', 'fracaso'].includes(fase)) pantalla = iniciarPantallaNave(ctx);
  else pantalla = iniciarPantallaSistema(ctx);
  window.aventura.pantalla = pantalla;
  // La guía (una línea con flecha) muestra los pasos de esta pantalla
  const nombreTutorial = { sistema: 'sistema', hangar: 'hangar', viaje: 'viaje', llegada: 'viaje', fracaso: 'viaje', aterrizaje: 'aterrizaje', superficie: 'superficie', informe: 'informe' }[fase];
  if (nombreTutorial && nombreTutorial !== ultimaPantallaTutorial) ctx.guia.pantalla(nombreTutorial);
  ultimaPantallaTutorial = nombreTutorial;
  // El mouse solo se captura donde se camina (nave y superficie)
  window.capturarMouse = !!pantalla.jugador;
  hud.querySelector('.ayuda').style.display = window.capturarMouse ? '' : 'none';
}
ctx.guia = crearGuia(hud);
ctx.aprendizaje = aprendizaje;
ctx.logros = logros;
// Cada emergencia resuelta puede enseñar un concepto (ej. 'resuelta:oxigeno')
ctx.alResolver = (r) => {
  if (r.resultado !== 'resuelta') return;
  const destinoId = ctx.conexionActiva?.estado?.destinoId;
  aprendizaje.evento(`resuelta:${r.id}`, destinoId);
  aprendizaje.evento(`resuelta:${r.rol}`, destinoId);
};
let ultimaPantallaTutorial = null;
ctx.irA = irA;

// ---- Menú principal ----
// "Jugar solo": una sala local de 1 jugador; los otros 3 puestos los ocupan bots.
ctx.alJugarSolo = async (nombre) => {
  nuevaMisionMinijuegos(); // tiempo extra en el primer intento de cada minijuego
  const partida = crearPartidaSolo();
  await partida.crear(nombre);
  await partida.accion('puesto', { rol: 'comandante' });
  await partida.accion('personaje', { id: 'faro' });
  await partida.accion('dificultad', { nivel: dificultad() });
  ctx.conexionActiva = partida;
  irA(); // → sala
};
// "Crear sala" y "Unirse": multijugador con PeerJS (todo pasa por src/red/conexion.js)
function entrarEnRed(r) {
  if (r.error) return r;
  nuevaMisionMinijuegos();
  const c = r.conexion;
  // Si el anfitrión se va o se corta la conexión: todos vuelven al menú con un mensaje
  c.alFin = (motivo) => {
    if (ctx.conexionActiva !== c) return;
    if (window.consolaAbierta) document.querySelector('.consola-cerrar')?.click();
    ctx.conexionActiva = null;
    ctx.mensajeMenu = `⚠ ${motivo}`;
    irA();
  };
  ctx.conexionActiva = c;
  irA(); // → sala
  return { ok: true };
}
ctx.alCrearSala = async (nombre) => {
  const r = await crearSalaEnRed(nombre);
  if (!r.error) await r.conexion.accion('dificultad', { nivel: dificultad() });
  return entrarEnRed(r);
};
ctx.alUnirse = async (codigo, nombre) => entrarEnRed(await unirseASalaEnRed(codigo, nombre));
ctx.alSalirDeSala = () => { const c = ctx.conexionActiva; ctx.conexionActiva = null; c?.salir?.(); irA(); };

const reloj = new THREE.Clock();
motor.renderer.setAnimationLoop(() => {
  const dt = Math.min(reloj.getDelta(), 0.05);
  const t = reloj.elapsedTime;
  // PAUSA REAL: con una tarjeta, una explicación o el menú abiertos, el mundo no se mueve
  if (!estaPausado() && pantalla) pantalla.actualizar(dt, t);
  finDeCuadro();
  motor.renderer.render(motor.escena, motor.camara);
  cuadros++; acumulado += dt;
  if (acumulado >= 1) { fps.textContent = `${cuadros} FPS · calidad ${motor.calidad.nombre}`; cuadros = 0; acumulado = 0; }
});

window.aventura = { motor, THREE, irA, ctx, abrirMinijuego };

// ---- Arranque: modelos → partida → primera pantalla ----
(async () => {
  progresoCarga(0.45, 'Cargando los astronautas…');
  const hayModelo = await prepararModelos((f) => progresoCarga(0.45 + f * 0.35, 'Cargando los astronautas…'));
  window.aventura.modeloGLB = hayModelo;
  progresoCarga(0.85, 'Preparando la misión…');
  // Si el jugador cambia la dificultad (menú o sistema solar), se avisa a la partida
  window.addEventListener('cambio-dificultad', () => ctx.conexionActiva?.accion('dificultad', { nivel: dificultad() }));
  irA(); // menú principal
  progresoCarga(0.95, 'Encendiendo los motores…');
  motor.renderer.compile(motor.escena, motor.camara); // prepara los gráficos para que no se trabe al empezar
  progresoCarga(1, '¡Listo!');
  setTimeout(() => { carga.style.opacity = '0'; setTimeout(() => carga.remove(), 600); }, 250);
})();
