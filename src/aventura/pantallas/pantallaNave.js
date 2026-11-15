// =============================================================
// pantallaNave.js — EL VIAJE dentro de la nave (un jugador, 4 astronautas).
// - Hay 4 astronautas, cada uno en su sala: Piloto (cabina), Ingeniero
//   (ingeniería), Científico (laboratorio) y Comunicaciones.
// - El jugador cambia de astronauta con 1, 2, 3, 4, Tab o clic en los retratos;
//   la cámara "vuela" suavemente hasta el elegido.
// - Los que no controlas trabajan en sus consolas.
// - Cada emergencia es de UN rol: un aviso grande dice qué pasó, a quién le
//   toca, qué tecla pulsar y por qué; el retrato de ese rol parpadea.
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

const HECHOS = hechosJSON.hechos;
import { retrasoSenal } from '../../compartido/recomendaciones.js';

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
  const esc = crearNaveInterior({ colorPlaneta, particulas: motor.calidad.sombras });
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(esc.colorFondo);
  const luces = crearLuces(escena, { sombras: false, intensidad: 0.55, intensidadSol: 0.25 });
  escena.add(esc.raiz);
  motor.cambiarEscena(escena);
  const mundo = new MundoFisico(esc.colisiones, TIERRA.gravedad); // gravedad artificial de la nave
  esc.puertas.forEach((p) => mundo.dinamicos.push(p));
  // Las puertas entre las áreas quedan cerradas con llave (luz roja y candado):
  // cada astronauta trabaja en su sala. La de la esclusa solo se abre al salir a la superficie.
  esc.puertas.forEach((p) => p.bloquear(p.centro.z > 6 ? '🚪' : '🔒'));
  motor.camara.fov = 70;
  motor.camara.updateProjectionMatrix();
  ambiente(true);
  const efectos = crearEfectosViaje(escena, esc, luces, motor.camara, motor.calidad.sombras);
  const escalaPlaneta = esc.planeta ? esc.planeta.scale.x : 1;

  // ---- Los 4 astronautas ----
  // Cada uno empieza en su "puesto": frente a la primera consola de su rol.
  const astronautas = TRIPULACION.map((m) => {
    const consolaRol = esc.consolas.find((c) => c.rol === m.rol);
    const pos = new THREE.Vector3();
    consolaRol.grupo.getWorldPosition(pos);
    const sala = Object.values(esc.salas).find((s) => s.nombre === m.sala);
    const haciaCentro = sala.centro.clone().sub(pos).setY(0).setLength(1.4);
    const puesto = pos.clone().add(haciaCentro).setY(0.05);
    esc.puntoInicio = puesto;
    const j = new JugadorLocal(escena, mundo, esc, motor.camara, ctx.control, colorDe(m.rol));
    j.limitarA(m.limites);
    j.astronauta.raiz.rotation.y = Math.atan2(-haciaCentro.x, -haciaCentro.z); // mira a la consola
    j.anguloAnterior = j.astronauta.raiz.rotation.y;
    j.camara.yaw = j.astronauta.raiz.rotation.y + Math.PI; // la cámara empieza detrás
    return { ...m, jugador: j, puesto, consolaPos: pos };
  });
  let activo = 0;
  let vuelo = 0; // segundos que quedan del "vuelo" de la cámara al cambiar de astronauta
  const actual = () => astronautas[activo];

  // ---- HUD ----
  const hud = document.createElement('div');
  hud.innerHTML = `
    <div class="panel titulo sala-actual"></div>
    <div class="panel hud-viaje">
      <div class="hv-fila"><span>❤ Nave</span><div class="hv-barra"><div class="hv-vida"></div></div><b class="hv-num"></b></div>
      <div class="hv-fila"><span>🕒 Llegada</span><b class="hv-tiempo"></b></div>
    </div>
    <div class="retratos">${TRIPULACION.map((m, i) => `
      <button class="panel retrato" data-i="${i}" style="border-color:${hexDe(m.rol)}">
        <span class="r-icono">${m.icono}</span><span class="r-txt"><b>${m.tecla}</b> ${m.corto}</span>
      </button>`).join('')}</div>
    <div class="alertas"></div>
    <div class="panel senal-tierra" hidden></div>
    <div class="panel aviso-e"></div>
    <div class="avisos"></div>
    <div class="vineta"></div>`;
  ctx.hud.appendChild(hud);
  const $ = (s) => hud.querySelector(s);
  hud.querySelectorAll('.retrato').forEach((b) => { b.onclick = () => cambiarA(Number(b.dataset.i)); });

  function avisar(texto, clase = '') {
    const d = document.createElement('div');
    d.className = `panel aviso-flotante ${clase}`;
    d.innerHTML = texto;
    $('.avisos').appendChild(d);
    setTimeout(() => d.remove(), 4000);
  }

  /** Cambia el astronauta que controla el jugador; la cámara vuela hasta él. */
  function cambiarA(i) {
    if (i === activo || consola || final) return;
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
  const teclaCambio = (ev) => {
    if (window.consolaAbierta) return;
    const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'].indexOf(ev.code);
    if (n >= 0) cambiarA(n % 4);
    if (ev.code === 'Tab') { ev.preventDefault(); cambiarA((activo + 1) % 4); }
  };
  window.addEventListener('keydown', teclaCambio);

  // ---- Estado de la partida ----
  let viaje = estado.viaje;
  let consola = null; // minijuego abierto: { uid, cerrar }
  let final = null;
  let ultimoMensaje = estado.mensajes.length ? estado.mensajes[estado.mensajes.length - 1].n : 0;
  const quitarEstado = conexion.alEstado((e) => {
    if (!['viaje', 'llegada', 'fracaso'].includes(e.fase)) { ctx.irA('juego'); return; }
    for (const m of e.mensajes) {
      if (m.n > ultimoMensaje) {
        ultimoMensaje = m.n;
        if (m.texto.startsWith('⚠')) efecto('alarma'); // la emergencia ya se ve en el aviso grande
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
      <p class="nota">Preparando el informe…</p>`;
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
        // Los demás trabajan: si están cerca de su puesto miran la consola y "teclean"
        j.actualizar(dt, false);
        if (!final && j.pies.distanceTo(a.puesto) < 2.5) {
          mirarA.copy(a.consolaPos).sub(j.pies);
          j.astronauta.raiz.rotation.y = Math.atan2(mirarA.x, mirarA.z);
          j.astronauta.mantener(Math.sin(t * 0.7 + i * 2) > -0.3 ? 'interactuar' : 'reparar');
        }
      });
      const yo = actual();
      if (consola) yo.jugador.astronauta.mantener('reparar');
      esc.puertas.forEach((p) => p.actualizar(dt, astronautas.map((a) => a.jugador.pies)));
      esc.actualizar(dt, t);
      actualizarSenal(dt);
      const activas = !final && viaje ? viaje.emergencias : [];
      efectos.actualizar(dt, t, activas, [yo.rol]);
      if (activas.length) ctx.guia?.evento('emergencia');

      // El planeta de la ventana se acerca a medida que avanza el viaje
      if (esc.planeta && viaje) {
        const progreso = 1 - viaje.restante / viaje.duracion;
        esc.planeta.scale.setScalar(escalaPlaneta * (0.5 + progreso * 2.5));
      }

      // ¿Este astronauta está cerca de una consola con una emergencia SUYA? → E
      const mias = activas.filter((e) => e.rol === yo.rol);
      let cercana = null;
      for (const e of mias) {
        const p = efectos.posicionConsola(e.consola);
        if (p && Math.hypot(p.x - yo.jugador.pies.x, p.z - yo.jugador.pies.z) < DISTANCIA_CONSOLA) cercana = e;
      }
      const avisoE = $('.aviso-e');
      avisoE.style.display = cercana && !consola ? 'block' : 'none';
      if (cercana && !consola) avisoE.innerHTML = `<span class="tecla">E</span> ${cercana.nombre}`;
      if (entrada && entrada.interactuarPulsado && !consola) {
        if (cercana) abrir(cercana);
        else {
          // Astronauta equivocado: se le dice con amabilidad a quién le toca
          const otra = activas.find((e) => e.rol !== yo.rol);
          if (otra) { const m = miembro(otra.rol); avisar(`Esa tarea le toca a <b>${m.corto}</b>: pulsa <span class="tecla">${m.tecla}</span>`, 'amable'); efecto('clic'); }
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
      }
      // Retratos: el activo resaltado; el que tiene una emergencia parpadea
      hud.querySelectorAll('.retrato').forEach((b, i) => {
        b.classList.toggle('activo', i === activo);
        b.classList.toggle('alerta', activas.some((e) => e.rol === TRIPULACION[i].rol));
      });
      // Avisos grandes de emergencia: qué pasó, a quién le toca, qué tecla y por qué
      motor.camara.getWorldDirection(adelante); adelante.y = 0; adelante.normalize();
      derecha.set(-adelante.z, 0, adelante.x);
      const html = activas.map((e) => {
        const m = miembro(e.rol);
        const esMia = e.rol === yo.rol;
        let flecha = '';
        if (esMia) {
          const p = efectos.posicionConsola(e.consola);
          const dx = p.x - yo.jugador.pies.x; const dz = p.z - yo.jugador.pies.z;
          const ang = Math.atan2(dx * derecha.x + dz * derecha.z, dx * adelante.x + dz * adelante.z);
          flecha = `<span class="flecha" style="transform:rotate(${ang.toFixed(2)}rad)">⬆</span>`;
        }
        return `<div class="panel alerta-grande ${e.restante <= 10 ? 'urgente' : ''}" style="border-color:${hexDe(e.rol)}">
          <div class="ag-titulo">⚠ ¡${e.nombre}! ${esMia ? `${flecha} <span class="ag-tecla">Ve a la consola con <span class="tecla">!</span> y pulsa <span class="tecla">E</span></span>` : `Pulsa <span class="tecla">${m.tecla}</span> → ${m.corto}`}</div>
          <div class="ag-porque">${porQueDe(e.id)} · ⏱ ${e.restante} s</div></div>`;
      }).join('');
      if (html !== alertasPrevias) { $('.alertas').innerHTML = html; alertasPrevias = html; }
    },
    salir() {
      if (consola) consola.cerrar();
      window.removeEventListener('keydown', teclaCambio);
      ctx.aprendizaje?.alPoderMostrar(null);
      hud.remove(); ambiente(false); quitarEstado();
    }
  };
}
