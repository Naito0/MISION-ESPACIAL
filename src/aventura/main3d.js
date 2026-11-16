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
import { Motor3D, crearReloj } from './engine/Motor3D.js';
import { mostrarIntro, introActiva, introYaVista, entraConSala } from './intro.js';
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
import { mostrarDiagnostico, mostrarPrediccion } from './ui/tarjetas.js';
import { crearGuia } from './guia.js';
import { crearAprendizaje } from './aprendizaje.js';
import { crearLogros } from './logros.js';
import { pausar, reanudar, estaPausado, motivosPausa } from './pausa.js';
import { confirmarEnJuego } from './ui/confirmar.js';
import { aviso } from './ui/avisos.js';
import { alternarReducirMovimiento } from './ui/movimiento.js';
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
    <span class="tecla">E</span> usar · <span class="tecla">5-8</span> saludar, bailar, reír, gag · <span class="tecla">F</span> empujar · <span class="tecla">Esc</span> menú
  </div>
  <div class="fps"></div>
  <button class="panel salir-menu" hidden>🚪 Salir al menú</button>`;
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
    { texto: '🏆 Sala de trofeos', accion: () => { pausar('trofeos'); logros.abrirSala(() => reanudar('trofeos')); } },
    { texto: '🎢 Reducir movimiento (sí / no)', accion: () => { const si = alternarReducirMovimiento(); aviso(si ? '🎢 Reducir movimiento: SÍ (la cámara no se tambalea)' : '🎢 Reducir movimiento: NO'); } },
    { texto: '🚪 Salir al menú', accion: () => pedirSalida() }
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
  // Botón "Salir al menú": durante la partida (no en el menú ni en la sala, que ya tiene "Volver")
  hud.querySelector('.salir-menu').hidden = !ctx.conexionActiva || fase === 'lobby';
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
  // La guía del aterrizaje ("Mantén Espacio…") solo para quien aterriza; los demás miran la transmisión
  const soloMira = fase === 'aterrizaje' && ctx.conexionActiva?.estado?.aterrizador !== ctx.conexionActiva?.id;
  if (nombreTutorial && !soloMira && nombreTutorial !== ultimaPantallaTutorial) ctx.guia.pantalla(nombreTutorial);
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
// Botón "Ver intro" del menú principal (el clic ya permite el sonido: va directo al video)
ctx.verIntro = () => mostrarIntro({ portada: false });

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

// ---- Salir al menú (botón del HUD y menú de Esc), con confirmación dentro del juego ----
// Un jugador: vuelve al menú. Invitado: su puesto pasa a un bot (la sala lo detecta al
// cerrarse la conexión). Anfitrión: la partida termina y todos vuelven al menú con un mensaje.
async function pedirSalida() {
  const c = ctx.conexionActiva;
  if (!c) return;
  const yo = c.estado?.jugadores?.find((j) => j.id === c.id);
  const detalle = !c.enRed ? 'Vas a volver al menú principal y se pierde esta misión.'
    : yo?.anfitrion ? 'Eres el anfitrión: la partida terminará para todos.'
      : 'Tu puesto lo ocupará un bot y la partida sigue para los demás.';
  if (!(await confirmarEnJuego('¿Seguro que quieres salir?', detalle))) return;
  if (window.consolaAbierta) document.querySelector('.consola-cerrar')?.click();
  ctx.alSalirDeSala();
}
hud.querySelector('.salir-menu').onclick = () => pedirSalida();

const reloj = crearReloj();
// ---- Usar bien la tarjeta gráfica sin forzar la PC ----
// - Máximo 60 FPS (las pantallas de 144-166 Hz harían trabajar de más a la GPU)
// - Con la pestaña oculta no se dibuja nada
// - En la esquina: FPS y si dibuja la tarjeta gráfica dedicada o la integrada
const FPS_MAX = 60;
let ultimoCuadro = 0;
const tarjeta = (() => {
  try {
    const gl = motor.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const nombre = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    if (!nombre) return 'GPU ?';
    if (/swiftshader|llvmpipe|software/i.test(nombre)) return 'sin GPU (software)';
    return /nvidia|geforce|rtx|gtx|radeon rx|amd radeon(?! graphics)|arc a/i.test(nombre) ? 'GPU dedicada' : 'GPU integrada';
  } catch { return 'GPU ?'; }
})();
window.aventura_gpu = tarjeta;
// Brillo (bloom) suave en pantallas, luces y propulsores: SOLO en calidad Alta
// (en Medio baja los FPS). Se carga aparte para no pesar en Bajo y Medio.
let composer = null;
if (motor.calidad.bloom) {
  Promise.all([
    import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'),
    import('three/addons/postprocessing/UnrealBloomPass.js'), import('three/addons/postprocessing/OutputPass.js')
  ]).then(([{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }]) => {
    const c = new EffectComposer(motor.renderer);
    c.pasoEscena = new RenderPass(motor.escena, motor.camara);
    c.addPass(c.pasoEscena);
    c.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.4, 0.85));
    c.addPass(new OutputPass());
    window.addEventListener('resize', () => c.setSize(window.innerWidth, window.innerHeight));
    composer = c;
  }).catch(() => { composer = null; });
}
motor.renderer.setAnimationLoop((ahora) => {
  if (document.hidden || introActiva()) { reloj.getDelta(); return; } // pestaña oculta o intro en video: no se dibuja el 3D
  if (ahora - ultimoCuadro < 1000 / FPS_MAX - 1) return; // límite de 60 FPS
  ultimoCuadro = ahora;
  const dt = Math.min(reloj.getDelta(), 0.05);
  const t = reloj.elapsedTime;
  // PAUSA REAL: con una tarjeta, una explicación o el menú abiertos, el mundo no se mueve
  if (!estaPausado() && pantalla) pantalla.actualizar(dt, t);
  finDeCuadro();
  if (composer) { composer.pasoEscena.scene = motor.escena; composer.pasoEscena.camera = motor.camara; composer.render(); }
  else motor.renderer.render(motor.escena, motor.camara);
  cuadros++; acumulado += dt;
  if (acumulado >= 1) { fps.textContent = `${cuadros} FPS · ${tarjeta} · calidad ${motor.calidad.nombre}`; window.aventura_fps = cuadros; cuadros = 0; acumulado = 0; }
});

window.aventura = { motor, THREE, irA, ctx, abrirMinijuego, mostrarDiagnostico, mostrarPrediccion, motivosPausa }; // (para probar)

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
  // Intro en video: la primera vez, salvo que entre con un enlace o código de sala
  if (!introYaVista() && !entraConSala()) mostrarIntro({ portada: true });
  setTimeout(() => { carga.style.opacity = '0'; setTimeout(() => carga.remove(), 600); }, 250);
})();
