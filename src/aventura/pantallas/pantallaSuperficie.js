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
import { mostrarTarjeta } from '../ui/tarjetas.js';
import { crearAstronautasFondo } from '../entities/astronautasFondo.js';
import { colorDe } from '../tripulacion.js';
import hechosJSON from '../../data/hechos_reales.json';
import { aviso } from '../ui/avisos.js';
import { texturaPunto } from '../engine/decoracion.js';

const HECHOS = hechosJSON.hechos;

const CERCA = 2.2;

/** ctx = { motor, hud, control, conexionActiva, irA } */
export function iniciarPantallaSuperficie(ctx) {
  const { motor } = ctx;
  const conexion = ctx.conexionActiva;
  const e0 = conexion.estado;
  const destino = DESTINOS.find((d) => d.id === e0.destinoId);
  const yo = e0.jugadores.find((j) => j.id === conexion.id);
  const misRoles = yo ? [...yo.roles, ...(e0.bots || [])] : []; // los míos y los de los bots
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
  // Empieza junto a la escotilla del módulo (en la esclusa)
  esc.puntoInicio = new THREE.Vector3(-0.6 + indice * 1.2, 0.05, 2.8);
  // En la superficie el jugador controla al CIENTÍFICO (analiza las muestras);
  // los otros 3 trabajan de fondo (astronautasFondo.js)
  const jugador = new JugadorLocal(escena, mundo, esc, motor.camara, ctx.control, soyCientifico ? colorDe('cientifico') : colorDeJugador(yo),
    yo.personaje || (e0.personajesPorRol || {})[yo.roles[0]]); // siempre TU personaje
  ambiente(true);
  ctx.aprendizaje?.evento('superficie:llegada', destino.id); // en Marte: tormentas de polvo

  // ---- La ESCLUSA: el astronauta empieza adentro del módulo ----
  // Pulsa E → despresurización (se iguala la presión con la de afuera) → se abre la escotilla.
  let enEsclusa = true;
  let despresurizando = 0; // segundos que faltan de la animación
  jugador.bloqueado = true;
  jugador.camara.yaw = 0; // mirando hacia el módulo
  const escotilla = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.9, 0.12), new THREE.MeshStandardMaterial({ color: 0xc9d0dc, metalness: 0.6, roughness: 0.4 }));
  escotilla.position.set(0, 1.05, 1.85);
  esc.modulo.add(escotilla);
  const luzEsclusa = new THREE.PointLight(0xffb020, 6, 6);
  luzEsclusa.position.set(0, 2.3, 2.6);
  escena.add(luzEsclusa);
  // Vapor de la despresurización: MUY suave (antes eran 60 partículas grises grandes justo
  // delante de la cámara, que llenaban la pantalla de gris y mareaban). Ahora son pocas,
  // chicas, casi transparentes y salen solo junto a la escotilla.
  const vapor = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(20 * 3), 3)),
    new THREE.PointsMaterial({ color: 0xdfefff, size: 0.12, transparent: true, opacity: 0.25, depthWrite: false, map: texturaPunto(), sizeAttenuation: true }));
  vapor.visible = false;
  escena.add(vapor);
  const semillasVapor = Array.from({ length: 20 }, () => [Math.random() * 6.28, Math.random()]);
  const afuera = destino.id === 'luna' ? 'el vacío de la Luna' : 'el aire muy delgado de Marte';
  ctx.aprendizaje?.alPoderMostrar(() => !enEsclusa); // primero se sale; después, las tarjetas
  const CLAVE_ESCLUSA = 'misionEspacial.esclusaExplicada';

  // ---- Los otros 3 astronautas trabajan de fondo (sin física: no bloquean) ----
  // De fondo, solo los personajes de los BOTS (cada personaje aparece una sola vez)
  const fondo = crearAstronautasFondo(escena, (e0.bots || []).map((rol) => ({ rol, id: (e0.personajesPorRol || {})[rol] })).filter((p) => p.id));

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
        remotos.set(id, new AstronautaRemoto(escena, j.nombre, colorDeJugador(j), j.personaje || (conexion.estado.personajesPorRol || {})[j.roles[0]], destino.gravedad));
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
    <div class="panel esclusa"><b>🚪 Estás en la esclusa del módulo</b><br>Pulsa <span class="tecla">E</span> para despresurizar y salir.</div>
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
    if (sup.muestras.some((m) => m.estado !== 'suelo')) ctx.guia?.evento('recogida');
    if (sup.muestras.some((m) => m.estado === 'analizada')) {
      ctx.guia?.evento('analizada');
      ctx.aprendizaje?.evento('superficie:analizada', destino.id);
    }
    for (const m of e.mensajes) {
      if (m.n > ultimoMensaje) {
        ultimoMensaje = m.n;
        aviso(m.texto.replace(/</g, '&lt;')); // aviso pequeño arriba a la derecha
      }
    }
  });

  function analizar(m) {
    jugador.bloqueado = true;
    jugador.astronauta.reproducir('interactuar', 1);
    consola = true;
    abrirMinijuego({ nombre: 'Analizar muestra', descripcion: 'El analizador del módulo estudia de qué está hecha la roca.', minijuego: 'secuencia', restante: 45 }, 0x5be08a, (res) => {
      consola = null;
      jugador.bloqueado = false;
      if (res !== null) conexion.accion('analizar', { i: m.i, exito: res });
    }, destino.id);
  }

  // En Marte: el polvo cubre los paneles del módulo (como le pasó a InSight).
  // Tarea del ingeniero: limpiarlos y orientarlos al Sol (minijuego "paneles").
  let panelesListos = destino.id !== 'marte';
  function limpiarPaneles() {
    jugador.bloqueado = true;
    consola = true;
    abrirMinijuego({ nombre: 'Polvo en los paneles', descripcion: 'El polvo de Marte tapó los paneles del módulo y la batería se vacía.', minijuego: 'paneles', restante: 60 }, 0x7cc4ff, async (res) => {
      consola = null;
      jugador.bloqueado = false;
      if (res) {
        panelesListos = true;
        const h = HECHOS.paneles;
        await mostrarTarjeta({ etiqueta: '📜 Esto pasó de verdad', icono: h.icono, titulo: `${h.mision} (${h.anio})`, frase: h.frase, detalle: `“${h.cita}”`, fuente: h.fuente });
      }
    }, destino.id);
  }

  const adelante = new THREE.Vector3();
  const derecha = new THREE.Vector3();
  let refresco = 0;
  let tiempoEnvio = 0;
  return {
    escena, esc, jugador, remotos, mundo,
    actualizar(dt, t) {
      const entrada = jugador.actualizar(dt);
      fondo.actualizar(dt, t);
      // ---- Esclusa: pulsar E, despresurizar y salir ----
      if (enEsclusa) {
        const panel = ui.querySelector('.esclusa');
        if (despresurizando > 0) {
          despresurizando -= dt;
          const f = 1 - Math.max(0, despresurizando) / 3;
          panel.innerHTML = `<b>🚪 Despresurizando…</b><div class="hv-barra"><div style="width:${(1 - f) * 100}%;background:#7cc4ff"></div></div>
            <small>Se saca el aire de la esclusa hasta igualar ${afuera}.</small>`;
          vapor.visible = true;
          const arr = vapor.geometry.attributes.position.array;
          semillasVapor.forEach(([a, s], i) => { const k = (f + s) % 1; arr[i * 3] = Math.cos(a) * (0.3 + k * 0.5); arr[i * 3 + 1] = 0.6 + s * 1.4 + k * 0.4; arr[i * 3 + 2] = 2.0 + Math.sin(a) * 0.2; });
          vapor.geometry.attributes.position.needsUpdate = true;
          luzEsclusa.intensity = 6; // luz fija (antes latía)
          if (despresurizando <= 0) {
            escotilla.position.y = 3.2; // la escotilla se abre
            vapor.visible = false;
            luzEsclusa.color.setHex(0x5be08a);
            enEsclusa = false;
            jugador.bloqueado = false;
            ctx.guia?.evento('esclusa');
            panel.remove();
            efecto('exito');
            // La primera vez: tarjeta que explica para qué sirve una esclusa
            let vista = false; try { vista = localStorage.getItem(CLAVE_ESCLUSA) === '1'; } catch { /* sin almacenamiento */ }
            if (!vista) {
              try { localStorage.setItem(CLAVE_ESCLUSA, '1'); } catch { /* sin almacenamiento */ }
              mostrarTarjeta({
                etiqueta: '💡 ¿Para qué sirve una esclusa?', icono: '🚪', titulo: 'La esclusa',
                frase: 'Es una sala con dos puertas: se iguala la presión antes de salir, así no se pierde el aire de la nave.',
                detalle: `Primero se cierra la puerta de adentro. Después se saca el aire de la esclusa (despresurizar) hasta igualar la presión de afuera: ${afuera}. Recién ahí se abre la puerta de afuera. Para volver se hace al revés.`
              });
            }
          }
        } else if (entrada && entrada.interactuarPulsado) {
          despresurizando = 3;
          efecto('alarma');
        }
      }
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
      const enPaneles = esc.posPaneles && Math.hypot(esc.posPaneles.x - jugador.pies.x, esc.posPaneles.z - jugador.pies.z) < CERCA + 0.8;
      if (!accion && enPaneles && !panelesListos) accion = { texto: 'Limpiar los paneles del módulo', fn: limpiarPaneles };
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
