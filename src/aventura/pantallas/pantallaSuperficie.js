// =============================================================
// pantallaSuperficie.js — EXPLORACIÓN en la Luna o en Marte.
// - Caminan con la gravedad REAL del destino: en la Luna se salta mucho más alto.
// - Hay 3 muestras brillantes en el suelo: cualquiera las recoge con E.
// - Las muestras recogidas van al laboratorio del módulo; allí el CIENTÍFICO
//   las analiza con E (minijuego de secuencia).
// - Termina al analizar las 3, al acabarse el tiempo o si el anfitrión vuelve a casa.
// =============================================================
import * as THREE from 'three';
import { MundoFisico } from '../engine/fisica.js';
import { crearSuperficie, lucesSuperficie } from '../escenarios/superficie.js';
import { JugadorLocal } from '../entities/JugadorLocal.js';
import { AstronautaRemoto } from '../entities/AstronautaRemoto.js';
import { colorDeJugador } from './pantallaNave.js';
import { DESTINOS, TIERRA } from '../datos3d.js';
import { abrirMinijuego } from '../minijuegos/index.js';
import { ambiente, efecto } from '../audio.js';

const CERCA = 2.2;

/** ctx = { motor, hud, control, conexionActiva, irA } */
export function iniciarPantallaSuperficie(ctx) {
  const { motor } = ctx;
  const conexion = ctx.conexionActiva;
  const e0 = conexion.estado;
  const destino = DESTINOS.find((d) => d.id === e0.destinoId);
  const yo = e0.jugadores.find((j) => j.id === conexion.id);
  const misRoles = yo ? yo.roles : [];
  const soyCientifico = misRoles.includes('cientifico');

  const esc = crearSuperficie(destino, { particulas: motor.calidad.sombras });
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(esc.colorCielo);
  if (esc.niebla) escena.fog = new THREE.Fog(esc.niebla.color, esc.niebla.cerca, esc.niebla.lejos);
  lucesSuperficie(escena, destino, motor.calidad.sombras);
  escena.add(esc.raiz);
  motor.cambiarEscena(escena);
  motor.camara.fov = 70;
  motor.camara.updateProjectionMatrix();

  // Gravedad real del destino: el mismo impulso de salto llega más alto
  const mundo = new MundoFisico(esc.colisiones, destino.gravedad);
  const indice = Math.max(0, e0.jugadores.indexOf(yo));
  esc.puntoInicio = new THREE.Vector3(-1.5 + indice * 1.2, 0.05, 4.5);
  const jugador = new JugadorLocal(escena, mundo, esc, motor.camara, ctx.control, colorDeJugador(yo));
  ambiente(true);
  ctx.aprendizaje?.evento('superficie:llegada', destino.id); // en Marte: tormentas de polvo

  // ---- Muestras (cristales que brillan) ----
  const mallas = e0.superficie.muestras.map((m) => {
    const g = new THREE.Group();
    const cristal = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), new THREE.MeshStandardMaterial({ color: 0x7cf3ff, emissive: 0x3fd0ff, emissiveIntensity: 1.5, flatShading: true }));
    cristal.position.y = 0.5;
    g.add(cristal);
    const luz = new THREE.PointLight(0x7cf3ff, 8, 6);
    luz.position.y = 1;
    g.add(luz);
    const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 12, 6), new THREE.MeshBasicMaterial({ color: 0x7cf3ff, transparent: true, opacity: 0.35 }));
    haz.position.y = 6;
    g.add(haz); // columna de luz para encontrarla desde lejos
    g.position.set(m.x, 0, m.z);
    escena.add(g);
    return { g, cristal, luz, haz };
  });

  // ---- Otros jugadores ----
  const remotos = new Map();
  const quitarPos = conexion.alPosiciones((pos) => {
    const e = conexion.estado;
    for (const [id, p] of Object.entries(pos)) {
      if (id === conexion.id || p.lander) continue;
      if (!remotos.has(id)) {
        const j = e.jugadores.find((x) => x.id === id);
        if (!j) continue;
        remotos.set(id, new AstronautaRemoto(escena, j.nombre, colorDeJugador(j)));
      }
      remotos.get(id).recibir(p);
    }
  });

  // ---- HUD ----
  const ui = document.createElement('div');
  ui.innerHTML = `
    <div class="panel titulo">🪨 Exploración ${destino.id === 'luna' ? 'de la Luna' : `de ${destino.nombre}`} · gravedad ${destino.gravedad} m/s² (${Math.round(destino.gravedad / TIERRA.gravedad * 100)}% de la Tierra)</div>
    <div class="panel hud-viaje">
      <div class="hv-fila"><span>🕒 Tiempo</span><b class="hv-tiempo"></b></div>
      <div class="hs-muestras"></div>
      <small>${soyCientifico ? 'Eres el Científico: analiza las muestras en el laboratorio del módulo (pantalla verde).' : 'Recoge muestras con E; el Científico las analiza en el módulo.'}</small>
      ${yo && yo.anfitrion ? '<button class="boton" id="volverCasa">🚀 Volver a casa</button>' : ''}
    </div>
    <div class="panel hud-tareas"><h4>Objetivo</h4><div class="hv-lista"></div></div>
    <div class="panel aviso-e"></div>
    <div class="avisos"></div>`;
  ctx.hud.appendChild(ui);
  const $ = (s) => ui.querySelector(s);
  const volver = $('#volverCasa');
  if (volver) volver.onclick = () => conexion.accion('volverACasa');

  let ultimoMensaje = e0.mensajes.length ? e0.mensajes[e0.mensajes.length - 1].n : 0;
  let sup = e0.superficie;
  let consola = null;
  const quitarEstado = conexion.alEstado((e) => {
    if (e.fase !== 'superficie') { ctx.irA('juego'); return; }
    sup = e.superficie;
    if (sup.muestras.some((m) => m.estado !== 'suelo')) ctx.tutorial?.evento('recogida');
    if (sup.muestras.some((m) => m.estado === 'analizada')) {
      ctx.tutorial?.evento('analizada');
      ctx.aprendizaje?.evento('superficie:analizada', destino.id);
    }
    for (const m of e.mensajes) {
      if (m.n > ultimoMensaje) {
        ultimoMensaje = m.n;
        const d = document.createElement('div');
        d.className = 'panel aviso-flotante';
        d.textContent = m.texto;
        $('.avisos').appendChild(d);
        setTimeout(() => d.remove(), 3500);
      }
    }
  });

  function analizar(m) {
    jugador.bloqueado = true;
    jugador.astronauta.reproducir('interactuar', 1);
    consola = true;
    abrirMinijuego({ nombre: 'Analizar muestra', descripcion: 'El analizador del módulo estudia de qué está hecha la roca.', minijuego: 'secuencia', restante: 30 }, 0x5be08a, (res) => {
      consola = null;
      jugador.bloqueado = false;
      if (res !== null) conexion.accion('analizar', { i: m.i, exito: res });
    });
  }

  const adelante = new THREE.Vector3();
  const derecha = new THREE.Vector3();
  let refresco = 0;
  let tiempoEnvio = 0;
  return {
    escena, esc, jugador, remotos, mundo,
    actualizar(dt, t) {
      const entrada = jugador.actualizar(dt);
      // Un salto alto (gravedad baja) enseña el concepto del salto
      if (jugador.pies.y > 1.2) ctx.aprendizaje?.evento('superficie:salto', destino.id);
      // Enviar mi posición unas 15 veces por segundo
      tiempoEnvio += dt;
      if (tiempoEnvio > 1 / 15) { tiempoEnvio = 0; conexion.enviarPosicion(jugador.estadoRed()); }
      if (consola) jugador.astronauta.mantener('interactuar');
      remotos.forEach((r) => r.actualizar(dt));
      esc.actualizar(dt, t);

      // Muestras: en el suelo giran; recogidas aparecen sobre la mesa del laboratorio
      sup.muestras.forEach((m, i) => {
        const o = mallas[i];
        o.cristal.rotation.y += dt * 1.5;
        if (m.estado === 'suelo') { o.g.position.set(m.x, Math.sin(t * 2 + i) * 0.1, m.z); o.haz.visible = true; }
        else { o.g.position.set(esc.posLaboratorio.x - 0.5 + i * 0.5, 0.55, esc.posLaboratorio.z); o.haz.visible = false; }
        const color = m.estado === 'analizada' ? 0x5be08a : 0x7cf3ff;
        o.cristal.material.emissive.setHex(color);
        o.luz.color.setHex(color);
        o.g.scale.setScalar(m.estado === 'suelo' ? 1 : 0.6);
      });

      // ¿Qué puedo hacer con E?
      let accion = null;
      for (const m of sup.muestras) {
        if (m.estado === 'suelo' && Math.hypot(m.x - jugador.pies.x, m.z - jugador.pies.z) < CERCA) accion = { texto: 'Recoger muestra', fn: () => { jugador.astronauta.reproducir('recoger', 0.8); efecto('compra'); conexion.accion('recoger', { i: m.i }); } };
      }
      const enLab = Math.hypot(esc.posLaboratorio.x - jugador.pies.x, esc.posLaboratorio.z - jugador.pies.z) < CERCA + 0.6;
      const porAnalizar = sup.muestras.find((m) => m.estado === 'recogida');
      if (!accion && enLab && soyCientifico && porAnalizar) accion = { texto: 'Analizar muestra', fn: () => analizar(porAnalizar) };
      $('.aviso-e').style.display = accion && !consola ? 'block' : 'none';
      if (accion && !consola) {
        $('.aviso-e').innerHTML = `<span class="tecla">E</span> ${accion.texto}`;
        if (entrada && entrada.interactuarPulsado) accion.fn();
      }

      // HUD
      refresco -= dt;
      if (refresco > 0) return;
      refresco = 0.12;
      $('.hv-tiempo').textContent = `${Math.floor(sup.restante / 60)}:${String(sup.restante % 60).padStart(2, '0')}`;
      $('.hs-muestras').innerHTML = sup.muestras.map((m) => `<span class="muestra ${m.estado}">${m.estado === 'analizada' ? '✅' : m.estado === 'recogida' ? '🧪' : '🪨'}</span>`).join(' ') + ` <small>${sup.muestras.filter((m) => m.estado === 'analizada').length} de 3 analizadas</small>`;
      motor.camara.getWorldDirection(adelante); adelante.y = 0; adelante.normalize();
      derecha.set(-adelante.z, 0, adelante.x);
      const flecha = (x, z) => {
        const dx = x - jugador.pies.x; const dz = z - jugador.pies.z;
        const ang = Math.atan2(dx * derecha.x + dz * derecha.z, dx * adelante.x + dz * adelante.z);
        return { html: `<span class="flecha" style="transform:rotate(${ang.toFixed(2)}rad)">⬆</span>`, d: Math.round(Math.hypot(dx, dz)) };
      };
      const objetivos = [];
      for (const m of sup.muestras.filter((x) => x.estado === 'suelo')) { const f = flecha(m.x, m.z); objetivos.push({ ...f, texto: 'Muestra en el suelo' }); }
      if (soyCientifico && porAnalizar) { const f = flecha(esc.posLaboratorio.x, esc.posLaboratorio.z); objetivos.push({ ...f, texto: 'Laboratorio: analizar' }); }
      objetivos.sort((a, b) => a.d - b.d);
      $('.hv-lista').innerHTML = objetivos.length
        ? objetivos.slice(0, 3).map((o) => `<div class="tarea">${o.html}<div><b>${o.texto}</b><br><small>${o.d} m</small></div></div>`).join('')
        : '<small>Esperando al Científico… 🔬</small>';
    },
    salir() { ui.remove(); ambiente(false); quitarPos(); quitarEstado(); }
  };
}
