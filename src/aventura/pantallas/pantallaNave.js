// =============================================================
// pantallaNave.js — EL VIAJE dentro de la nave (un jugador, 4 astronautas).
// - Hay 4 astronautas, cada uno en su sala: Piloto (cabina), Ingeniero
//   (ingeniería), Científico (laboratorio) y Comunicaciones.
// - Cada jugador maneja SOLO a su personaje (sin cambiar con teclas);
//   la cámara "vuela" suavemente hasta el elegido.
// - Los que no controlas trabajan en sus consolas.
// - Cada emergencia es de UN rol: un aviso grande dice qué pasó, a quién le
//   toca, qué tecla pulsar y por qué; el panel de ese rol brilla.
// - E junto a la consola con "!" abre el minijuego.
// (La versión en red de esta pantalla quedó guardada en pantallaNaveRed.js.)
// =============================================================
import * as THREE from 'three';
import { crearLuces } from '../engine/luces.js';
import { MundoFisico } from '../engine/fisica.js';
import { crearNaveInterior } from '../escenarios/naveInterior.js';
import { JugadorLocal } from '../entities/JugadorLocal.js';
import { TIERRA, DESTINOS, ROLES, colorRol } from '../datos3d.js';
import { ambiente, efecto } from '../audio.js';
import { abrirMinijuego } from '../minijuegos/index.js';
import { crearEfectosViaje } from './efectosViaje.js';
import { TRIPULACION, miembro, colorDe, hexDe } from '../tripulacion.js';
import emergenciasJSON from '../../data/emergencias3d.json';
import diagnosticosJSON from '../../data/diagnosticos.json';
import { mostrarDiagnostico, mostrarTarjeta } from '../ui/tarjetas.js';
import hechosJSON from '../../data/hechos_reales.json';
import personajesJSON from '../../data/personajes.json';
import { crearEtiqueta } from '../entities/AstronautaRemoto.js';

const PERSONAJES = personajesJSON.personajes;

const HECHOS = hechosJSON.hechos;
import { retrasoSenal } from '../../compartido/recomendaciones.js';
import { aviso } from '../ui/avisos.js';
import { estaPausado, alCambiarPausa } from '../pausa.js';
import { reducirMovimiento } from '../ui/movimiento.js';

const DIAGNOSTICOS = diagnosticosJSON.diagnosticos;

const DISTANCIA_CONSOLA = 2.4; // metros para poder usar una consola

/** Color del primer rol de un jugador (lo usan otras pantallas). */
export function colorDeJugador(j) {
  const rol = ROLES.find((r) => r.id === (j && j.roles[0]));
  return rol ? colorRol(rol) : 0xdfe6f5;
}

const porQueDe = (id) => emergenciasJSON.emergencias.find((x) => x.id === id)?.porQue || '';

/** ctx = { motor, hud, control, conexionActiva, colorPlaneta, irA, tutorial? } */
export function iniciarPantallaNave(ctx) {
  const { motor } = ctx;
  const conexion = ctx.conexionActiva;
  const estado = conexion.estado;
  // Por el ventanal se ve el destino elegido (su color sale de destinos.json)
  const destino = DESTINOS.find((d) => d.id === estado.destinoId);
  const colorPlaneta = destino ? parseInt(destino.color.replace('#', ''), 16) : ctx.colorPlaneta;
  const esc = crearNaveInterior({ colorPlaneta, particulas: motor.calidad.sombras, calidad: motor.nivelCalidad });
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(esc.colorFondo);
  const luces = crearLuces(escena, { sombras: false, intensidad: 0.55, intensidadSol: 0.25 });
  escena.add(esc.raiz);
  motor.cambiarEscena(escena);
  const mundo = new MundoFisico(esc.colisiones, TIERRA.gravedad); // gravedad artificial de la nave
  esc.puertas.forEach((p) => mundo.dinamicos.push(p));
  // Las puertas entre las áreas quedan cerradas con llave (luz roja y candado):
  // cada astronauta trabaja en su sala. La de la esclusa solo se abre al salir a la superficie.
  // Las puertas entre salas se abren y se cierran con E (en multijugador, para todos).
  // La de la esclusa solo se abre al salir a la superficie.
  esc.puertas.forEach((p, i) => { if (p.centro.z > 6) p.bloquear('🚪'); else { p.manual = true; p.abierta = !!(estado.puertas || {})[i]; } });
  motor.camara.fov = 70;
  motor.camara.updateProjectionMatrix();
  ambiente(true);
  const efectos = crearEfectosViaje(escena, esc, luces, motor.camara, motor.calidad.sombras);
  const escalaPlaneta = esc.planeta ? esc.planeta.scale.x : 1;

  // ---- Los 4 astronautas ----
  // Cada uno empieza en su "puesto": frente a la primera consola de su rol.
  // Personajes: el traje de cada astronauta tiene el color de su personaje
  // (el que eligió su jugador o el del bot). Ver src/data/personajes.json.
  let bots = estado.bots || []; // cambia si alguien se desconecta (su puesto pasa a un bot)
  const pjDe = (rol) => PERSONAJES.find((p) => p.id === (estado.personajesPorRol || {})[rol]);
  const yoJ = estado.jugadores.find((j) => j.id === conexion.id);
  // MODO UN JUGADOR (Jugar solo o sala con 1 jugador): manejas SOLO a tu personaje y
  // te llegan TODAS las emergencias; los otros 3 trabajan de fondo en sus salas.
  const modoSolo = estado.jugadores.length === 1;
  const esMio = (rol) => !!(yoJ && yoJ.roles.includes(rol));
  const astronautas = TRIPULACION.map((m) => {
    const consolaRol = esc.consolas.find((c) => c.rol === m.rol);
    const pos = new THREE.Vector3();
    consolaRol.grupo.getWorldPosition(pos);
    const sala = Object.values(esc.salas).find((s) => s.nombre === m.sala);
    const haciaCentro = sala.centro.clone().sub(pos).setY(0).setLength(1.4);
    const puesto = pos.clone().add(haciaCentro).setY(0.05);
    esc.puntoInicio = puesto;
    const pj = pjDe(m.rol);
    const j = new JugadorLocal(escena, mundo, esc, motor.camara, ctx.control, colorDe(m.rol), pj?.id); // traje del color del ROL
    // Tu personaje recorre TODA la nave (también en multijugador, para visitar a los
    // compañeros); los que no maneja nadie se quedan trabajando en su sala.
    j.limitarA(esMio(m.rol) ? null : m.limites);
    j.astronauta.raiz.rotation.y = Math.atan2(-haciaCentro.x, -haciaCentro.z); // mira a la consola
    j.anguloAnterior = j.astronauta.raiz.rotation.y;
    j.camara.yaw = j.astronauta.raiz.rotation.y + Math.PI; // la cámara empieza detrás
    return { ...m, jugador: j, puesto, consolaPos: pos, bot: bots.includes(m.rol), personaje: pj };
  });
  // MULTIJUGADOR: el nombre de cada jugador flota sobre la cabeza de su personaje
  if (conexion.enRed) {
    for (const a of astronautas) {
      const duenio = estado.jugadores.find((x) => x.roles.includes(a.rol));
      if (!duenio) continue;
      const et = crearEtiqueta(duenio.id === conexion.id ? `${duenio.nombre} (tú)` : duenio.nombre, colorDe(a.rol));
      et.position.y = 2.35;
      a.jugador.astronauta.raiz.add(et);
    }
  }
  // El jugador empieza con SU astronauta (el de su puesto en la sala)
  const propio = Math.max(0, TRIPULACION.findIndex((m) => yoJ && yoJ.roles.includes(m.rol)));
  let activo = propio;
  let vuelo = 0; // segundos que quedan del "vuelo" de la cámara al cambiar de astronauta
  const actual = () => astronautas[activo];

  // ---- HUD ----
  // Panel de arriba a la izquierda (debajo de la vida de la nave):
  //  - un jugador: solo MI personaje y MI rol (no se puede cambiar de personaje)
  //  - multijugador: cada jugador con su personaje y su rol (sin números)
  function htmlRetratos() {
    const porRol = estado.personajesPorRol || {};
    const tarjeta = (rol, titulo, sub) => {
      const m = miembro(rol);
      return `<div class="panel retrato" data-rol="${rol}" style="border-color:${hexDe(rol)}"><span class="r-icono">${m.icono}</span><span class="r-txt"><strong>${titulo}</strong><small class="r-quien">${sub}</small></span></div>`;
    };
    if (modoSolo) {
      const a = astronautas[propio];
      return tarjeta(a.rol, `${a.personaje?.nombre || ''} <small>${a.personaje?.especie || ''}</small>`, `Tu rol: ${a.corto}`);
    }
    return estado.jugadores.map((j) => {
      const rol = j.roles[0];
      const pj = PERSONAJES.find((p) => p.id === (j.personaje || porRol[rol]));
      return tarjeta(rol, `${j.nombre}${j.id === conexion.id ? ' (tú)' : ''}`, `${pj?.nombre || ''} · ${miembro(rol).corto}`);
    }).join('');
  }
  const hud = document.createElement('div');
  hud.innerHTML = `
    <div class="panel titulo sala-actual"></div>
    <div class="panel hud-viaje">
      <div class="hv-fila"><span>❤ Nave</span><div class="hv-barra"><div class="hv-vida"></div></div><b class="hv-num"></b></div>
      <div class="hv-fila"><span>🕒 Llegada</span><b class="hv-tiempo"></b></div>
      <div class="hv-proxima"></div>
    </div>
    <div class="retratos">${htmlRetratos()}</div>
    <div class="alertas"></div>
    <div class="panel recarga-empujon"></div>
    <div class="velocidad" hidden></div>
    <div class="panel senal-tierra" hidden></div>
    <div class="panel aviso-e"></div>
    <div class="avisos"></div>
    <div class="vineta"></div>`;
  ctx.hud.appendChild(hud);
  const $ = (s) => hud.querySelector(s);

  // Avisos pequeños arriba a la derecha (ui/avisos.js): 3 s, máximo 3 a la vez
  function avisar(texto, clase = '', ms = 3000, largo = false) {
    aviso(texto, { ms, clase, largo });
  }

  // Casilleros, cajones, paneles y ventanas: se abren con E y muestran lo que hay adentro
  const NOMBRE_OBJETO = { casillero: 'el casillero', cajon: 'el cajón', panel: 'el panel', ventana: 'la ventana' };
  function abrirObjeto(o) {
    const abierto = o.alternar();
    efecto(abierto ? 'compra' : 'clic');
    if (!abierto) return;
    avisar(o.contenido.texto, 'amable', o.contenido.tipo === 'dato' ? 9000 : 3000, o.contenido.tipo === 'dato');
    if (o.contenido.tipo === 'brillante' && actual().jugador.astronauta.id === 'tuerca') actual().jugador.astronauta.decir('¡Para mi colección!');
  }

  /** Cambia el astronauta que controla el jugador; la cámara vuela hasta él. */
  // MULTIJUGADOR: astronautas que maneja OTRO jugador (rol → su posición)
  let remotos = {};
  const quitarPos = conexion.enRed ? conexion.alPosiciones((pos) => {
    const r = {};
    for (const [id, p] of Object.entries(pos)) if (id !== conexion.id && p && p.rol) r[p.rol] = p;
    remotos = r;
  }) : () => {};
  const deOtroJugador = (rol) => {
    if (!conexion.enRed) return null;
    const e = conexion.estado;
    const duenio = e.jugadores.find((j) => j.id !== conexion.id && j.roles.includes(rol));
    if (duenio) return duenio.nombre;
    const usando = Object.entries(conexion.posiciones || {}).find(([id, p]) => id !== conexion.id && p && p.rol === rol);
    return usando ? (e.jugadores.find((j) => j.id === usando[0])?.nombre || 'otro jugador') : null;
  };
  let tiempoEnvio = 0;
  function cambiarA(i) {
    if (i === activo || consola || final) return;
    if (modoSolo) { avisar(`Tú manejas a <b>${actual().personaje?.nombre || 'tu personaje'}</b> y resuelves todas las emergencias. Los demás trabajan solos.`, 'amable'); return; }
    const otro = deOtroJugador(TRIPULACION[i].rol);
    if (otro) { avisar(`Ese astronauta lo maneja <b>${otro}</b>`, 'amable'); efecto('error'); return; }
    const antes = actual().jugador.camara;
    activo = i;
    const cam = actual().jugador.camara;
    cam.objetivo.copy(antes.objetivo); // empieza donde estaba la cámara anterior…
    cam.primera = false;
    cam.distancia = antes.distancia;
    cam.pitch = antes.pitch;
    vuelo = 1.2;                       // …y viaja despacio durante 1,2 s
    efecto('clic');
    ctx.guia?.evento('cambio', actual().rol);
  }
  // Ya no se cambia de astronauta con teclas (ni en un jugador ni en multijugador):
  // cada uno maneja SOLO a su personaje. Las emergencias de los bots las resuelve
  // cualquier jugador que vaya a esa consola.
  const teclaCambio = (ev) => {
    if (window.consolaAbierta) return;
    if (ev.code === 'Tab') ev.preventDefault();
    if (ev.code === 'KeyF' && !ev.repeat) empujar();
  };
  // ---- EMPUJÓN (tecla F): al compañero que está delante, a menos de 1,8 m ----
  // Al que lo recibe: queda mareado 2 s y, si estaba en una consola, se le cierra
  // (para "trollear" las misiones). Una vez cada 4 s por jugador.
  let ultimoEmpujon = -99;
  let aturdidoHasta = 0;        // mi cámara se tambalea mientras estoy aturdido
  const empujados = [];         // retrocesos en curso: { a, dx, dz, t }
  const rayo = new THREE.Raycaster();
  const ocupado = () => !!consola || estaPausado() || final; // minijuego, pregunta o tarjeta
  function hayParedEntre(p1, p2) {
    const origen = new THREE.Vector3(p1.x, 1, p1.z);
    const hacia = new THREE.Vector3(p2.x - p1.x, 0, p2.z - p1.z);
    const d = hacia.length(); hacia.normalize();
    rayo.set(origen, hacia); rayo.far = d - 0.3;
    if (rayo.intersectObject(esc.colisiones, true).length) return true;
    return esc.puertas.some((p) => p.cerrada && rayo.ray.intersectsBox(p.bloqueo) && rayo.ray.distanceToPoint(p.centro.clone().setY(1)) < d);
  }
  function empujar() {
    const ahora = performance.now() / 1000;
    if (ocupado()) return;
    if (ahora - ultimoEmpujon < 4) { avisar(`👊 Recargando: ${(4 - (ahora - ultimoEmpujon)).toFixed(1)} s`, '', 1200); return; }
    const yoA = actual();
    const pies = yoA.jugador.pies; const ry = yoA.jugador.astronauta.raiz.rotation.y;
    const frente = { x: Math.sin(ry), z: Math.cos(ry) };
    // Hasta 2,5 m, solo en un cono de 45° hacia adelante, y sin paredes en el medio
    const objetivo = astronautas.filter((a) => a !== yoA).map((a) => {
      const dx = a.jugador.pies.x - pies.x; const dz = a.jugador.pies.z - pies.z; const d = Math.hypot(dx, dz) || 1;
      return { a, d, coseno: (dx * frente.x + dz * frente.z) / d };
    }).filter((o) => o.d < 2.5 && o.coseno > Math.cos(Math.PI / 8)).sort((p, q) => p.d - q.d)
      .find((o) => !hayParedEntre(pies, o.a.jugador.pies));
    yoA.jugador.astronauta.reproducir('golpear', 0.6);
    efecto('fuush');
    if (!objetivo) { avisar('👊 No hay nadie delante para empujar', '', 1500); return; }
    if (remotos[objetivo.a.rol]?.ocupado) { avisar('🧩 Está en un minijuego o leyendo: ahora no se lo puede empujar', '', 2000); return; }
    ultimoEmpujon = ahora;
    conexion.accion('golpe', { rol: objetivo.a.rol }).then((r) => { if (r && r.error) { ultimoEmpujon = -99; avisar(`👊 ${r.error}`, '', 2000); } });
  }
  // Al pausarse (tarjeta, pregunta, menú) el juego deja de enviar la posición: se avisa
  // ENSEGUIDA que estoy ocupado, para que nadie me pueda empujar mientras leo
  const quitarAvisoPausa = alCambiarPausa(() => { if (conexion.enRed) conexion.enviarPosicion({ ...actual().jugador.estadoRed(), rol: actual().rol, ocupado: ocupado() }, true); });
  let ultimoGolpe = estado.golpe ? estado.golpe.n : 0;
  function recibirGolpe(g) {
    const a = astronautas.find((x) => x.rol === g.rol);
    if (!a) return;
    a.jugador.astronauta.mareado?.(1.5);
    efecto('boing');
    // Sale disparado un poco hacia atrás (lejos del que empujó). Lo mueve quien lo
    // controla: yo si es mi personaje, o cada pantalla si es un personaje de fondo.
    const de = astronautas.find((x) => x.rol === g.deRol);
    if (de && (a === actual() || !remotos[a.rol])) {
      const dx = a.jugador.pies.x - de.jugador.pies.x; const dz = a.jugador.pies.z - de.jugador.pies.z; const d = Math.hypot(dx, dz) || 1;
      empujados.push({ a, dx: dx / d, dz: dz / d, t: 0 });
    }
    const quien = a.personaje?.nombre || miembro(g.rol).corto;
    if (g.de === conexion.id) { avisar(`👊 ¡Empujón a <b>${quien}</b>!`, 'amable', 2000); return; }
    if (a === actual()) {
      // ¡Me empujaron a mí! Aturdido 1,5 s: no me puedo mover y la cámara se tambalea suave
      a.jugador.bloqueado = true;
      aturdidoHasta = performance.now() / 1000 + 1.5;
      setTimeout(() => { if (!consola) a.jugador.bloqueado = false; }, 1500);
      avisar(`💫 ¡<b>${g.deNombre}</b> te dio un empujón!`, 'amable', 2500);
    }
  }
  window.addEventListener('keydown', teclaCambio);

  // ---- Estado de la partida ----
  let viaje = estado.viaje;
  let consola = null; // minijuego abierto: { uid, cerrar }
  let final = null;
  let ultimoMensaje = estado.mensajes.length ? estado.mensajes[estado.mensajes.length - 1].n : 0;
  const quitarEstado = conexion.alEstado((e) => {
    if (!['viaje', 'llegada', 'fracaso'].includes(e.fase)) { ctx.irA('juego'); return; }
    bots = e.bots || [];
    if (e.golpe && e.golpe.n > ultimoGolpe) { ultimoGolpe = e.golpe.n; recibirGolpe(e.golpe); }
    // Puertas abiertas o cerradas por cualquier jugador
    esc.puertas.forEach((p, i) => { if (p.manual) p.abierta = !!(e.puertas || {})[i]; });
    for (const m of e.mensajes) {
      if (m.n > ultimoMensaje) {
        ultimoMensaje = m.n;
        if (m.texto.startsWith('⚠')) { efecto('alarma'); astronautas.forEach((a) => a.jugador.astronauta.alarma?.()); } // cada personaje reacciona a su manera
        else avisar(m.texto);
      }
    }
    const antes = viaje;
    viaje = e.viaje;
    // Si la emergencia se venció mientras jugaba el minijuego, se cierra la consola
    if (consola && viaje && !viaje.emergencias.some((x) => x.uid === consola.uid)) consola.cerrar();
    if (antes && viaje && viaje.vida < antes.vida) {
      $('.vineta').classList.add('golpe');
      setTimeout(() => $('.vineta').classList.remove('golpe'), 600);
    }
    // Avisar al tutorial / aprendizaje de lo que se resolvió
    if (antes && viaje) {
      for (const r of viaje.registro.slice(antes.registro.length)) {
        if (r.resultado === 'resuelta') ctx.guia?.evento('resuelta');
        // Mostrarlo en el mundo: el mensaje a la Tierra viaja con cuenta regresiva
        if (r.resultado === 'resuelta' && r.rol === 'comunicaciones') enviarSenal();
        // Si resolviste la emergencia de un BOT, vuelves solo a tu astronauta
        if (r.resultado === 'resuelta' && bots.includes(r.rol) && activo !== propio) setTimeout(() => cambiarA(propio), 1500);
        ctx.alResolver?.(r);
      }
    }
    if ((e.fase === 'llegada' || e.fase === 'fracaso') && !final) {
      if (e.fase === 'llegada') ctx.aprendizaje?.evento('llegada', e.destinoId);
      mostrarFinal(e);
    }
  });

  // ---- Mensaje a la Tierra: se ve viajar, con el retraso real de la señal ----
  // Luna: ~1,3 s (se muestra tal cual). Marte: entre unos 4 y 24 minutos según la distancia;
  // en el juego 1 minuto real = 1 segundo, para que se vea sin esperar tanto.
  let senal = null;
  function enviarSenal() {
    astronautas.forEach((a) => a.jugador.astronauta.senal?.()); // las orejas de Zuri captan la señal
    const r = retrasoSenal(destino);
    const segundosReales = r.min + Math.random() * (r.max - r.min);
    const enJuego = segundosReales < 60 ? segundosReales : segundosReales / 60;
    const texto = segundosReales < 60 ? `${segundosReales.toFixed(1)} s` : `${Math.round(segundosReales / 60)} min`;
    senal = { total: Math.max(1.3, enJuego), resta: Math.max(1.3, enJuego), texto, minutos: segundosReales >= 60 };
    $('.senal-tierra').hidden = false;
  }
  function actualizarSenal(dt) {
    if (!senal) return;
    senal.resta = Math.max(0, senal.resta - dt);
    const f = 1 - senal.resta / senal.total;
    $('.senal-tierra').innerHTML = `📡 Mensaje a la Tierra: tarda <b>${senal.texto}</b>${senal.minutos ? ' <small>(1 min = 1 s en el juego)</small>' : ''}
      <div class="st-camino"><span>🚀</span><div class="st-pulso" style="left:${f * 100}%"></div><span>🌍</span></div>
      <div class="st-cuenta">${senal.resta > 0 ? `Llega en ${senal.resta.toFixed(1)} s` : '✅ ¡Llegó!'}</div>`;
    if (senal.resta <= 0) { senal.fin = (senal.fin || 0) + dt; if (senal.fin > 2.5) { senal = null; $('.senal-tierra').hidden = true; } }
  }

  // Paso 2 de cada emergencia: el DIAGNÓSTICO (una sola vez por emergencia)
  const diagnosticadas = new Set();
  async function abrir(emergencia) {
    const j = actual().jugador;
    j.bloqueado = true;
    consola = { uid: emergencia.uid, cerrar: () => {} };
    const diag = DIAGNOSTICOS[emergencia.id];
    if (diag && !diagnosticadas.has(emergencia.uid)) {
      await mostrarDiagnostico(diag, emergencia.nombre); // pausa real hasta acertar
      diagnosticadas.add(emergencia.uid);
      if (!viaje || !viaje.emergencias.some((x) => x.uid === emergencia.uid)) { consola = null; j.bloqueado = false; return; }
    }
    // Paso 3: la solución (minijuego)
    j.astronauta.reproducir('reparar', 1);
    const c = abrirMinijuego(emergencia, colorDe(emergencia.rol), async (resultado) => {
      consola = null;
      j.bloqueado = false;
      if (resultado === null) return;
      // Paso 4: resultado → "📜 Esto pasó de verdad" (con pausa real) → después la tarjeta de aprendizaje
      const h = HECHOS[emergencia.minijuego];
      if (resultado && h) mostrarTarjeta({ etiqueta: '📜 Esto pasó de verdad', icono: h.icono, titulo: `${h.mision} (${h.anio})`, frase: h.frase, detalle: `“${h.cita}”`, fuente: h.fuente });
      conexion.accion('resolver', { uid: emergencia.uid, exito: resultado });
    }, destino.id);
    if (consola) consola.cerrar = c.cerrar;
  }

  // ---- Final: llegada o fracaso ----
  function mostrarFinal(e) {
    final = e.fase;
    if (consola) consola.cerrar();
    efectos.apagarTodo();
    $('.alertas').innerHTML = '';
    const v = e.viaje;
    const resueltas = v.registro.filter((r) => r.resultado === 'resuelta').length;
    const fallidas = v.registro.filter((r) => r.resultado === 'fallida');
    if (final === 'fracaso') {
      // Fracaso caricaturesco: los 4 se desmayan y la nave queda a oscuras
      astronautas.forEach((a) => a.jugador.astronauta.reproducir('desmayarse'));
      luces.hemisferica.intensity *= 0.2;
      efecto('error');
    } else efecto('exito');
    const panel = document.createElement('div');
    panel.className = 'panel final';
    panel.innerHTML = `
      <h1>${final === 'llegada' ? '🪐 ¡Llegamos!' : '💫 ¡Misión fallida!'}</h1>
      <p>${final === 'llegada' ? `La nave llegó con <b>${v.vida}</b> de vida.` : '¡La tripulación quedó mareada en el piso! 😵'}</p>
      <p>Resueltas: <b>${resueltas}</b> · sin resolver: <b>${fallidas.length}</b></p>
      <p class="nota">${final === 'llegada' ? '🛬 Preparando el aterrizaje…' : 'Preparando el informe…'}</p>`;
    hud.appendChild(panel);
    if (document.pointerLockElement) {
      window.consolaAbierta = true;
      document.exitPointerLock();
      setTimeout(() => { window.consolaAbierta = false; }, 200);
    }
  }

  // Las tarjetas "¿Qué aprendiste?" nunca aparecen durante una emergencia
  // (tampoco mientras el mensaje a la Tierra está viajando: primero se ve llegar)
  ctx.aprendizaje?.alPoderMostrar(() => !consola && !senal && !(viaje && viaje.emergencias.length && !final));

  const adelante = new THREE.Vector3();
  const derecha = new THREE.Vector3();
  const mirarA = new THREE.Vector3();
  let refrescoHud = 0;
  let alertasPrevias = '';
  if (estado.fase === 'llegada' || estado.fase === 'fracaso') mostrarFinal(estado);

  return {
    escena, esc, mundo, astronautas,
    get jugador() { return actual().jugador; },
    get activo() { return activo; },
    get viaje() { return viaje; },
    cambiarA,
    /** Para pruebas: abrir directamente el minijuego de una emergencia. */
    abrirEmergencia(uid) { const e = viaje?.emergencias.find((x) => x.uid === uid); if (e) abrir(e); },
    actualizar(dt, t) {
      // Vuelo de la cámara al cambiar de astronauta (sigue despacio y sin chocar paredes)
      const cam = actual().jugador.camara;
      if (vuelo > 0) { vuelo -= dt; cam.suavidad = 3; cam.sinParedes = true; } else { cam.suavidad = 18; cam.sinParedes = false; }

      let entrada = null;
      astronautas.forEach((a, i) => {
        const j = a.jugador;
        if (i === activo) { entrada = j.actualizar(dt, true); return; }
        // Lo maneja otro jugador: sigue su posición recibida por la red
        if (remotos[a.rol]) { j.seguirRemoto(dt, remotos[a.rol]); return; }
        // Los demás trabajan: si están cerca de su puesto miran la consola y "teclean"
        j.actualizar(dt, false);
        if (!final && j.pies.distanceTo(a.puesto) < 2.5) {
          mirarA.copy(a.consolaPos).sub(j.pies);
          j.astronauta.raiz.rotation.y = Math.atan2(mirarA.x, mirarA.z);
          // Trabajan en su sala: el ingeniero repara, el científico revisa las plantas y
          // muestras, los demás escriben en las consolas. A ratos descansan (y hacen su gag).
          const ciclo = Math.sin(t * 0.5 + i * 2);
          const trabajo = { ingeniero: 'reparar', cientifico: 'recoger' }[a.rol] || 'interactuar';
          if (ciclo > -0.55) j.astronauta.mantener(ciclo > 0.3 ? trabajo : 'interactuar');
        }
      });
      const yo = actual();
      if (consola) yo.jugador.astronauta.mantener('reparar');
      // Empujones: se les da un IMPULSO físico (la física lo frena y lo para en las paredes)
      while (empujados.length) { const em = empujados.pop(); em.a.jugador.cuerpo.empujar(em.dx * 5, em.dz * 5); }
      // Los personajes no se atraviesan: si dos cápsulas se tocan, se separan (solo se mueven
      // las que maneja esta computadora: la mía y las de fondo; las de otros jugadores las mueve su dueño)
      for (let i = 0; i < astronautas.length; i++) for (let k = i + 1; k < astronautas.length; k++) {
        const A1 = astronautas[i]; const B1 = astronautas[k];
        const dx = B1.jugador.pies.x - A1.jugador.pies.x; const dz = B1.jugador.pies.z - A1.jugador.pies.z;
        const d = Math.hypot(dx, dz);
        if (d >= 0.7 || d < 1e-4 || Math.abs(B1.jugador.pies.y - A1.jugador.pies.y) > 1.2) continue;
        const muevoA = !remotos[A1.rol]; const muevoB = !remotos[B1.rol];
        if (!muevoA && !muevoB) continue;
        const falta = 0.7 - d; const parte = muevoA && muevoB ? falta / 2 : falta;
        if (muevoA) { A1.jugador.cuerpo.capsula.translate(new THREE.Vector3(-dx / d * parte, 0, -dz / d * parte)); A1.jugador.cuerpo.pies(A1.jugador.pies); }
        if (muevoB) { B1.jugador.cuerpo.capsula.translate(new THREE.Vector3(dx / d * parte, 0, dz / d * parte)); B1.jugador.cuerpo.pies(B1.jugador.pies); }
      }
      // Aturdido: la cámara se tambalea y gira SUAVE (sin giros completos ni sacudidas)
      const ahoraS = performance.now() / 1000;
      if (ahoraS < aturdidoHasta && !reducirMovimiento()) motor.camara.rotation.z += Math.sin(ahoraS * 4) * 0.05 * ((aturdidoHasta - ahoraS) / 1.5);
      // Indicador de recarga del empujón
      const falta = 4 - (ahoraS - ultimoEmpujon);
      const rec = $('.recarga-empujon');
      if (rec) { rec.textContent = falta > 0 ? `👊 ${falta.toFixed(1)} s` : '👊 F listo'; rec.classList.toggle('lista', falta <= 0); }
      // MULTIJUGADOR: mi posición (y qué astronauta manejo) unas 10 veces por segundo
      tiempoEnvio += dt;
      if (conexion.enRed && tiempoEnvio >= 0.1) { tiempoEnvio = 0; conexion.enviarPosicion({ ...yo.jugador.estadoRed(), rol: yo.rol, ocupado: ocupado() }); } // ocupado: no se lo puede empujar
      esc.puertas.forEach((p) => p.actualizar(dt, astronautas.map((a) => a.jugador.pies)));
      // Al pasar por una puerta, a Faro se le traban los cuernos
      for (const a of astronautas) {
        const cerca = esc.puertas.some((p) => Math.hypot(p.centro.x - a.jugador.pies.x, p.centro.z - a.jugador.pies.z) < 0.9);
        if (cerca && !a.enPuerta) a.jugador.astronauta.puerta?.();
        a.enPuerta = cerca;
      }
      esc.actualizar(dt, t);
      (esc.objetos || []).forEach((o) => o.actualizar(dt));
      actualizarSenal(dt);
      const activas = !final && viaje ? viaje.emergencias : [];
      efectos.actualizar(dt, t, activas, modoSolo ? TRIPULACION.map((m) => m.rol) : [yo.rol, ...bots]);
      if (activas.length) ctx.guia?.evento('emergencia');

      // El planeta de la ventana se acerca con cada emergencia superada;
      // al llegar, se agranda del todo (animación corta de llegada)
      if (esc.planeta && viaje) {
        const hechas = viaje.registro.length;
        const progreso = hechas / ((hechas + (viaje.pendientes ?? 0) + viaje.emergencias.length) || 1);
        const meta = escalaPlaneta * (final === 'llegada' ? 4.5 : 0.5 + progreso * 2);
        const s = esc.planeta.scale.x + (meta - esc.planeta.scale.x) * (1 - Math.exp(-(final ? 1.5 : 2) * dt));
        esc.planeta.scale.setScalar(s);
      }

      // ¿Este astronauta está cerca de una consola con una emergencia SUYA? → E
      // Mías: en un jugador, todas; en multijugador, las de mi rol y las de los bots
      const esDeMi = (e) => modoSolo || e.rol === yo.rol || bots.includes(e.rol);
      const mias = activas.filter(esDeMi);
      let cercana = null;
      for (const e of mias) {
        const p = efectos.posicionConsola(e.consola);
        if (p && Math.hypot(p.x - yo.jugador.pies.x, p.z - yo.jugador.pies.z) < DISTANCIA_CONSOLA) cercana = e;
      }
      // ¿Algo para abrir con E? (las consolas con emergencia tienen prioridad)
      let abrible = null;
      if (!cercana && !consola) {
        const pies = yo.jugador.pies;
        const obj = (esc.objetos || []).find((o) => Math.hypot(o.posicion.x - pies.x, o.posicion.z - pies.z) < 1.6);
        if (obj) abrible = { texto: obj.abierto ? 'Cerrar' : `Abrir ${NOMBRE_OBJETO[obj.tipo]}`, fn: () => abrirObjeto(obj) };
        else {
          const i = esc.puertas.findIndex((p) => p.manual && Math.hypot(p.centro.x - pies.x, p.centro.z - pies.z) < 2.4);
          if (i >= 0) {
            const p = esc.puertas[i];
            abrible = { texto: p.abierta ? 'Cerrar la puerta' : 'Abrir la puerta', fn: () => { p.abierta = !p.abierta; efecto('clic'); conexion.accion('puerta', { i, abierta: p.abierta }); } };
          }
        }
      }
      const avisoE = $('.aviso-e');
      avisoE.style.display = (cercana || abrible) && !consola ? 'block' : 'none';
      if (cercana && !consola) avisoE.innerHTML = `<span class="tecla">E</span> ${cercana.nombre}`;
      else if (abrible) avisoE.innerHTML = `<span class="tecla">E</span> ${abrible.texto}`;
      if (entrada && entrada.interactuarPulsado && !consola) {
        if (cercana) abrir(cercana);
        else if (abrible) abrible.fn();
        else {
          // Tarea de OTRO jugador: se le dice con amabilidad a quién le toca
          const ajena = activas.find((e) => !esDeMi(e) && (() => { const p = efectos.posicionConsola(e.consola); return p && Math.hypot(p.x - yo.jugador.pies.x, p.z - yo.jugador.pies.z) < DISTANCIA_CONSOLA; })());
          if (ajena) { const m = miembro(ajena.rol); avisar(`Esta tarea le toca a <b>${deOtroJugador(ajena.rol) || m.corto}</b> (${m.corto})`, 'amable'); efecto('clic'); }
        }
      }

      // HUD (unas 8 veces por segundo para no gastar)
      refrescoHud -= dt;
      if (refrescoHud > 0) return;
      refrescoHud = 0.12;
      $('.sala-actual').innerHTML = `${yo.icono} ${yo.corto} · ${yo.sala}`;
      if (viaje) {
        $('.hv-vida').style.width = `${viaje.vida}%`;
        $('.hv-vida').style.background = viaje.vida > 50 ? '#3cc46e' : viaje.vida > 25 ? '#f2c14e' : '#e5484d';
        $('.hv-num').textContent = viaje.vida;
        $('.hv-tiempo').textContent = `${Math.floor(viaje.restante / 60)}:${String(viaje.restante % 60).padStart(2, '0')}`;
        // Cuenta regresiva hasta la próxima emergencia (para no esperar sin saber)
        $('.hv-proxima').innerHTML = !final && viaje.proxima !== null && viaje.proxima !== undefined
          ? `⏱ Próxima emergencia en <b>${viaje.proxima} s</b>` : '';
        // Animación de llegada: líneas de velocidad mientras el planeta se agranda
        $('.velocidad').hidden = final !== 'llegada';
      }
      // Retratos: el activo resaltado; el que tiene una emergencia parpadea
      hud.querySelectorAll('.retrato').forEach((b) => {
        b.classList.toggle('activo', b.dataset.rol === yo.rol);
        b.classList.toggle('alerta', activas.some((e) => modoSolo || e.rol === b.dataset.rol));
      });
      // Avisos grandes de emergencia: qué pasó, a quién le toca, qué tecla y por qué
      motor.camara.getWorldDirection(adelante); adelante.y = 0; adelante.normalize();
      derecha.set(-adelante.z, 0, adelante.x);
      const html = activas.map((e) => {
        const m = miembro(e.rol);
        const esMia = esDeMi(e);
        let flecha = '';
        if (esMia) {
          const p = efectos.posicionConsola(e.consola);
          const dx = p.x - yo.jugador.pies.x; const dz = p.z - yo.jugador.pies.z;
          const ang = Math.atan2(dx * derecha.x + dz * derecha.z, dx * adelante.x + dz * adelante.z);
          flecha = `<span class="flecha" style="transform:rotate(${ang.toFixed(2)}rad)">⬆</span>`;
        }
        return `<div class="panel alerta-grande ${e.restante <= 10 ? 'urgente' : ''}" style="border-color:${hexDe(e.rol)}">
          <div class="ag-titulo">⚠ ¡${e.nombre}! ${esMia ? `${flecha} <span class="ag-tecla">Ve a ${modoSolo || e.rol !== yo.rol ? `<b>${m.sala}</b>, ` : ''}${bots.includes(e.rol) && !modoSolo ? '(puesto de un bot: puede ir cualquiera) ' : ''}a la consola con <span class="tecla">!</span> y pulsa <span class="tecla">E</span></span>` : `Le toca a <b>${deOtroJugador(e.rol) || m.corto}</b> (${m.corto})`}</div>
          <div class="ag-porque">${porQueDe(e.id)} · ⏱ ${e.restante} s</div></div>`;
      }).join('');
      if (html !== alertasPrevias) { $('.alertas').innerHTML = html; alertasPrevias = html; }
    },
    salir() {
      if (consola) consola.cerrar();
      window.removeEventListener('keydown', teclaCambio);
      ctx.aprendizaje?.alPoderMostrar(null);
      hud.remove(); ambiente(false); quitarEstado(); quitarPos(); quitarAvisoPausa();
    }
  };
}
