// =============================================================
// pantallaNave.js — EL VIAJE dentro de la nave.
// - Cada jugador camina por las salas y ve a los demás (sincronizado por red).
// - El servidor manda emergencias: cada una es de un ROL y está en una CONSOLA.
// - Si es tuya, vas a la consola (sigue la flecha), pulsas E y juegas el minijuego.
// - HUD: vida de la nave, tiempo de viaje y "mis tareas" con flecha.
// - Al final: llegada al destino o fracaso (vida 0).
// =============================================================
import * as THREE from 'three';
import { crearLuces } from '../engine/luces.js';
import { MundoFisico } from '../engine/fisica.js';
import { crearNaveInterior } from '../escenarios/naveInterior.js';
import { JugadorLocal } from '../entities/JugadorLocal.js';
import { AstronautaRemoto } from '../entities/AstronautaRemoto.js';
import { TIERRA, DESTINOS, ROLES, colorRol } from '../datos3d.js';
import { ambiente, efecto } from '../audio.js';
import { abrirMinijuego } from '../minijuegos/index.js';
import { crearEfectosViaje } from './efectosViaje.js';

const DISTANCIA_CONSOLA = 2.4; // metros para poder usar una consola

/** Color del primer rol de un jugador. */
export function colorDeJugador(j) {
  const rol = ROLES.find((r) => r.id === (j && j.roles[0]));
  return rol ? colorRol(rol) : 0xdfe6f5;
}

const nombreRol = (id) => ROLES.find((r) => r.id === id)?.nombre || id;
const colorDeRol = (id) => colorRol(ROLES.find((r) => r.id === id));
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

/** ctx = { motor, hud, control, conexionActiva, colorPlaneta, irA } */
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
  // Adentro: luz ambiente suave, sin sol (las luces de cada sala hacen el resto)
  const luces = crearLuces(escena, { sombras: false, intensidad: 0.55, intensidadSol: 0.25 });
  escena.add(esc.raiz);
  motor.cambiarEscena(escena);

  const mundo = new MundoFisico(esc.colisiones, TIERRA.gravedad); // gravedad artificial de la nave
  esc.puertas.forEach((p) => mundo.dinamicos.push(p));

  // Cada jugador aparece en un lugar distinto del pasillo
  const yo = estado.jugadores.find((j) => j.id === conexion.id);
  const misRoles = yo ? yo.roles : [];
  const indice = Math.max(0, estado.jugadores.indexOf(yo));
  esc.puntoInicio = new THREE.Vector3(-1 + (indice % 2) * 2, 0.05, 3 + Math.floor(indice / 2) * 1.6);
  const jugador = new JugadorLocal(escena, mundo, esc, motor.camara, ctx.control, colorDeJugador(yo));
  motor.camara.fov = 70;
  motor.camara.updateProjectionMatrix();
  ambiente(true);
  const efectos = crearEfectosViaje(escena, esc, luces, motor.camara, motor.calidad.sombras);
  const escalaPlaneta = esc.planeta ? esc.planeta.scale.x : 1;

  // ---- Otros jugadores ----
  const remotos = new Map(); // id → AstronautaRemoto
  const quitarPos = conexion.alPosiciones((pos) => {
    const e = conexion.estado;
    for (const [id, p] of Object.entries(pos)) {
      if (id === conexion.id) continue;
      if (!remotos.has(id)) {
        const j = e.jugadores.find((x) => x.id === id);
        if (!j) continue;
        remotos.set(id, new AstronautaRemoto(escena, j.nombre, colorDeJugador(j)));
      }
      remotos.get(id).recibir(p);
    }
    // Los que se fueron de la sala desaparecen
    for (const [id, r] of remotos) {
      if (!e.jugadores.some((j) => j.id === id)) { r.quitar(); remotos.delete(id); }
    }
  });
  let tiempoEnvio = 0;

  // ---- HUD ----
  const hud = document.createElement('div');
  hud.innerHTML = `
    <div class="panel titulo sala-actual"></div>
    <div class="panel hud-viaje">
      <div class="hv-fila"><span>❤ Nave</span><div class="hv-barra"><div class="hv-vida"></div></div><b class="hv-num"></b></div>
      <div class="hv-fila"><span>🕒 Llegada en</span><b class="hv-tiempo"></b></div>
      <div class="hv-roles">Tus roles: ${misRoles.map((r) => `<b style="color:${hex(colorDeRol(r))}">${nombreRol(r)}</b>`).join(', ')}</div>
    </div>
    <div class="panel hud-tareas"><h4>Mis tareas</h4><div class="hv-lista"></div></div>
    <div class="panel aviso-e"></div>
    <div class="avisos"></div>
    <div class="vineta"></div>`;
  ctx.hud.appendChild(hud);
  const $ = (s) => hud.querySelector(s);

  const salaDe = (p) => {
    if (Math.abs(p.x) < 2.2 && p.z > -24 && p.z < 8) return esc.salas.pasillo;
    let mejor = null; let dist = Infinity;
    for (const s of Object.values(esc.salas)) {
      const d = Math.hypot(p.x - s.centro.x, p.z - s.centro.z);
      if (d < dist) { dist = d; mejor = s; }
    }
    return mejor;
  };
  const salaDeConsola = (id) => esc.consolas.find((c) => c.id === id)?.sala || '';

  // Avisos cortos (mensajes del servidor)
  let ultimoMensaje = estado.mensajes.length ? estado.mensajes[estado.mensajes.length - 1].n : 0;
  function avisar(texto) {
    const d = document.createElement('div');
    d.className = 'panel aviso-flotante';
    d.textContent = texto;
    $('.avisos').appendChild(d);
    setTimeout(() => d.remove(), 3500);
  }

  // ---- Estado que manda el servidor ----
  let viaje = estado.viaje;
  let consola = null; // minijuego abierto: { uid, cerrar }
  let final = null;
  const quitarEstado = conexion.alEstado((e) => {
    if (e.fase === 'lobby' || e.fase === 'hangar') { ctx.irA('juego'); return; }
    for (const m of e.mensajes) {
      if (m.n > ultimoMensaje) {
        ultimoMensaje = m.n;
        avisar(m.texto);
        if (m.texto.startsWith('⚠')) efecto('alarma');
      }
    }
    const antes = viaje;
    viaje = e.viaje;
    // Si la emergencia se venció mientras jugaba el minijuego, se cierra la consola
    if (consola && viaje && !viaje.emergencias.some((x) => x.uid === consola.uid)) consola.cerrar();
    // La pantalla se pone roja un momento cuando la nave recibe daño
    if (antes && viaje && viaje.vida < antes.vida) {
      $('.vineta').classList.add('golpe');
      setTimeout(() => $('.vineta').classList.remove('golpe'), 600);
    }
    if ((e.fase === 'llegada' || e.fase === 'fracaso') && !final) mostrarFinal(e);
  });

  function abrir(emergencia) {
    jugador.bloqueado = true;
    jugador.astronauta.reproducir('reparar', 1);
    consola = { uid: emergencia.uid, cerrar: () => {} };
    const c = abrirMinijuego(emergencia, colorDeRol(emergencia.rol), (resultado) => {
      consola = null;
      jugador.bloqueado = false;
      if (resultado !== null) conexion.accion('resolver', { uid: emergencia.uid, exito: resultado });
    });
    if (consola) consola.cerrar = c.cerrar;
  }

  // ---- Final: llegada o fracaso ----
  function mostrarFinal(e) {
    final = e.fase;
    if (consola) consola.cerrar();
    efectos.apagarTodo();
    const v = e.viaje;
    const resueltas = v.registro.filter((r) => r.resultado === 'resuelta').length;
    const fallidas = v.registro.filter((r) => r.resultado === 'fallida');
    if (final === 'fracaso') {
      // Fracaso caricaturesco: todos se desmayan y la nave queda a oscuras
      jugador.astronauta.reproducir('desmayarse');
      remotos.forEach((r) => r.astronauta.reproducir('desmayarse'));
      luces.hemisferica.intensity *= 0.2;
      efecto('error');
    } else efecto('exito');
    const soyAnfitrion = e.jugadores.find((j) => j.id === conexion.id)?.anfitrion;
    const panel = document.createElement('div');
    panel.className = 'panel final';
    panel.innerHTML = `
      <h1>${final === 'llegada' ? '🪐 ¡Llegamos!' : '💫 ¡Misión fallida!'}</h1>
      <p>${final === 'llegada' ? `La nave llegó con <b>${v.vida}</b> de vida.` : 'La nave se quedó sin vida… ¡los astronautas quedaron mareados en el piso! 😵'}</p>
      <p>Emergencias resueltas: <b>${resueltas}</b> · no resueltas: <b>${fallidas.length}</b></p>
      ${fallidas.length ? `<h3>Qué falló</h3><ul>${[...new Set(fallidas.map((f) => f.nombre))].map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}
      ${soyAnfitrion ? '<button class="boton" id="otra">Volver a la base</button>' : '<p class="nota">Esperando al anfitrión…</p>'}`;
    hud.appendChild(panel);
    const b = panel.querySelector('#otra');
    if (b) b.onclick = () => conexion.accion('reiniciar');
    // Soltar el mouse sin abrir el menú de pausa
    if (document.pointerLockElement) {
      window.consolaAbierta = true;
      document.exitPointerLock();
      setTimeout(() => { window.consolaAbierta = false; }, 200);
    }
  }

  const adelante = new THREE.Vector3();
  const derecha = new THREE.Vector3();
  let refrescoHud = 0;
  if (estado.fase === 'llegada' || estado.fase === 'fracaso') mostrarFinal(estado);

  return {
    escena, esc, mundo, jugador, remotos,
    get viaje() { return viaje; },
    /** Para pruebas: abrir directamente el minijuego de una emergencia. */
    abrirEmergencia(uid) { const e = viaje?.emergencias.find((x) => x.uid === uid); if (e) abrir(e); },
    actualizar(dt, t) {
      const entrada = jugador.actualizar(dt);
      // Enviar mi posición unas 15 veces por segundo
      tiempoEnvio += dt;
      if (tiempoEnvio >= 1 / 15) { tiempoEnvio = 0; conexion.enviarPosicion(jugador.estadoRed()); }
      if (consola) jugador.astronauta.mantener('reparar');
      remotos.forEach((r) => r.actualizar(dt));
      esc.puertas.forEach((p) => p.actualizar(dt, [jugador.pies, ...[...remotos.values()].map((r) => r.pies)]));
      esc.actualizar(dt, t);
      const activas = !final && viaje ? viaje.emergencias : [];
      efectos.actualizar(dt, t, activas, misRoles);

      // El planeta de la ventana se acerca a medida que avanza el viaje
      if (esc.planeta && viaje) {
        const progreso = 1 - viaje.restante / viaje.duracion;
        esc.planeta.scale.setScalar(escalaPlaneta * (0.5 + progreso * 2.5));
      }

      // ¿Estoy cerca de una consola con una emergencia mía? → E para resolver
      const mias = activas.filter((e) => misRoles.includes(e.rol));
      let cercana = null;
      for (const e of mias) {
        const p = efectos.posicionConsola(e.consola);
        if (p && Math.hypot(p.x - jugador.pies.x, p.z - jugador.pies.z) < DISTANCIA_CONSOLA) cercana = e;
      }
      const avisoE = $('.aviso-e');
      avisoE.style.display = cercana && !consola ? 'block' : 'none';
      if (cercana && !consola) {
        avisoE.innerHTML = `<span class="tecla">E</span> ${cercana.nombre}`;
        if (entrada && entrada.interactuarPulsado) abrir(cercana);
      }

      // HUD (unas 8 veces por segundo para no gastar)
      refrescoHud -= dt;
      if (refrescoHud > 0) return;
      refrescoHud = 0.12;
      const s = salaDe(jugador.pies);
      $('.sala-actual').textContent = `📍 ${s ? s.nombre : 'Nave'}`;
      if (viaje) {
        $('.hv-vida').style.width = `${viaje.vida}%`;
        $('.hv-vida').style.background = viaje.vida > 50 ? '#3cc46e' : viaje.vida > 25 ? '#f2c14e' : '#e5484d';
        $('.hv-num').textContent = viaje.vida;
        $('.hv-tiempo').textContent = `${Math.floor(viaje.restante / 60)}:${String(viaje.restante % 60).padStart(2, '0')}`;
      }
      // Flecha: ángulo hacia la consola, visto desde donde mira la cámara
      motor.camara.getWorldDirection(adelante); adelante.y = 0; adelante.normalize();
      derecha.set(-adelante.z, 0, adelante.x);
      let html = mias.length ? mias.map((e) => {
        const p = efectos.posicionConsola(e.consola);
        const dx = p.x - jugador.pies.x; const dz = p.z - jugador.pies.z;
        const ang = Math.atan2(dx * derecha.x + dz * derecha.z, dx * adelante.x + dz * adelante.z);
        return `<div class="tarea ${e.restante <= 10 ? 'urgente' : ''}"><span class="flecha" style="transform:rotate(${ang.toFixed(2)}rad)">⬆</span>
          <div><b>${e.nombre}</b><br><small>${salaDeConsola(e.consola)} · ${Math.round(Math.hypot(dx, dz))} m · ⏱ ${e.restante} s</small></div></div>`;
      }).join('') : '<small>Todo en orden ✅ Vigila la nave.</small>';
      const otras = activas.filter((e) => !misRoles.includes(e.rol));
      if (otras.length) html += `<small class="otras">Otros: ${otras.map((e) => `${e.nombre} (${nombreRol(e.rol)})`).join(' · ')}</small>`;
      $('.hv-lista').innerHTML = html;
    },
    salir() {
      if (consola) consola.cerrar();
      hud.remove(); ambiente(false); quitarPos(); quitarEstado();
    }
  };
}
