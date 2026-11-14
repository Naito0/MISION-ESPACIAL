// =============================================================
// pantallaLobby.js — Sala de espera.
// 1) Elegir nombre y: crear partida / unirse con código / jugar solo.
// 2) En la sala: código de 4 letras y dirección para entrar, cada jugador
//    elige uno o más roles (los 4 segmentos de una misión NASA) y el
//    anfitrión pulsa "Empezar" cuando los 4 roles están cubiertos.
// De fondo: los 4 astronautas en 3D sobre una plataforma; se encienden
// cuando alguien toma su rol.
// =============================================================
import * as THREE from 'three';
import { crearLuces } from '../engine/luces.js';
import { cielo } from '../engine/decoracion.js';
import { nuevoEscenario, cilindro, material } from '../engine/construccion.js';
import { crearAstronauta } from '../entities/fabricaAstronautas.js';
import { crearEtiqueta } from '../entities/AstronautaRemoto.js';
import { ROLES, colorRol } from '../datos3d.js';
import { efecto } from '../audio.js';

// Qué compra y qué arregla cada rol (para que cada uno sepa qué le toca)
export const INFO_ROL = {
  comandante: { segmento: 'Segmento de lanzamiento', tareas: 'Motor, combustible, escudo térmico y aterrizaje' },
  ingeniero: { segmento: 'Segmento espacial', tareas: 'Paneles solares, baterías, blindaje y reparaciones' },
  cientifico: { segmento: 'Segmento de usuario', tareas: 'Instrumentos, laboratorio y reciclador de oxígeno' },
  comunicaciones: { segmento: 'Segmento terrestre', tareas: 'Antena, radar y red de estaciones en tierra' }
};

/** ctx = { motor, hud, conexion, conexionLocal, irA } */
export function iniciarPantallaLobby(ctx) {
  const { motor } = ctx;
  // ---- Fondo 3D: plataforma con los 4 astronautas ----
  const esc = nuevoEscenario();
  cielo(esc, 1200, 120);
  cilindro(esc, 4.2, 0.4, material(0x2a3350, { metal: 0.7, rugosidad: 0.3 }), 0, -0.2, 0, { solida: false, lados: 48 });
  const aro = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.06, 8, 64), new THREE.MeshStandardMaterial({ color: 0x3fd0ff, emissive: 0x3fd0ff, emissiveIntensity: 2 }));
  aro.rotation.x = Math.PI / 2;
  esc.visual.add(aro);
  const planeta = new THREE.Mesh(new THREE.SphereGeometry(14, 32, 24), new THREE.MeshStandardMaterial({ color: 0xd2693c, roughness: 0.9 }));
  planeta.position.set(18, 4, -40);
  esc.visual.add(planeta);
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x02030a);
  crearLuces(escena, { sombras: false, intensidad: 0.8, intensidadSol: 2.4, posicionSol: new THREE.Vector3(-6, 10, 8) });
  escena.add(esc.raiz);
  const figuras = ROLES.map((rol, i) => {
    const a = crearAstronauta(colorRol(rol));
    a.raiz.position.set(-3.3 + i * 2.2, 0, 0);
    a.raiz.rotation.y = 0.15 * (i - 1.5) * -1;
    escena.add(a.raiz);
    const foco = new THREE.PointLight(colorRol(rol), 0, 4);
    foco.position.set(-3.3 + i * 2.2, 2.6, 1);
    escena.add(foco);
    return { rol, a, foco, etiqueta: null };
  });
  motor.cambiarEscena(escena);
  motor.camara.fov = 50;
  motor.camara.updateProjectionMatrix();

  // ---- Interfaz ----
  const panel = document.createElement('div');
  panel.className = 'panel lobby';
  ctx.hud.appendChild(panel);
  let conexion = null;
  let codigoSala = null;
  let info = null;
  let quitarEstado = null;

  function vistaInicio(error = '') {
    const servidor = !!ctx.conexion;
    panel.innerHTML = `
      <h1>🚀 Misión Espacial 3D</h1>
      <p class="sub">Diseñen, viajen y exploren juntos una misión a la Luna o a Marte.</p>
      <label>Tu nombre <input id="nombre" maxlength="14" value="${localStorage.getItem('misionEspacial.nombre') || ''}" placeholder="Astronauta"></label>
      ${servidor ? `
        <button id="crear">✨ Crear partida</button>
        <div class="fila"><input id="codigo" maxlength="4" placeholder="CÓDIGO" style="text-transform:uppercase"><button id="unirse">Unirse</button></div>` :
        '<p class="nota">Sin servidor del anfitrión: solo se puede jugar en esta computadora. Para jugar en red, el anfitrión corre <b>npm run servidor</b>.</p>'}
      <button id="solo" class="secundario">🧑‍🚀 Jugar solo (tomas los 4 roles)</button>
      <p class="error">${error}</p>`;
    const nombre = () => {
      const n = panel.querySelector('#nombre').value.trim() || 'Astronauta';
      localStorage.setItem('misionEspacial.nombre', n);
      return n;
    };
    const entrar = async (c, promesa) => {
      const r = await promesa;
      if (r.error) { efecto('error'); return vistaInicio(r.error); }
      efecto('exito');
      conexion = c;
      codigoSala = r.codigo;
      ctx.conexionActiva = c;
      quitarEstado = c.alEstado(alEstado);
      if (!c.enRed) await c.accion('tomarLibres');
      info = c.enRed ? await c.infoServidor() : null;
      ctx.infoServidor = info;
      alEstado(c.estado);
    };
    panel.querySelector('#solo').onclick = () => { const c = ctx.conexionLocal(); entrar(c, c.crear(nombre())); };
    if (servidor) {
      panel.querySelector('#crear').onclick = () => entrar(ctx.conexion, ctx.conexion.crear(nombre()));
      panel.querySelector('#unirse').onclick = () => entrar(ctx.conexion, ctx.conexion.unirse(panel.querySelector('#codigo').value, nombre()));
    }
  }

  function alEstado(e) {
    if (!e) return;
    if (e.fase !== 'lobby') { ctx.irA('juego'); return; }
    const yo = e.jugadores.find((j) => j.id === conexion.id);
    // Astronautas del fondo: se encienden con el nombre de quien tomó el rol
    for (const f of figuras) {
      const duenio = e.jugadores.find((j) => j.roles.includes(f.rol.id));
      f.foco.intensity = duenio ? 14 : 0;
      if (f.etiqueta) { f.etiqueta.removeFromParent(); f.etiqueta = null; }
      if (duenio) { f.etiqueta = crearEtiqueta(duenio.nombre, colorRol(f.rol)); f.etiqueta.position.y = 2.25; f.a.raiz.add(f.etiqueta); }
    }
    const direccion = info && info.ips && info.ips.length ? `http://${info.ips[0]}:${info.puerto}` : null;
    panel.innerHTML = `
      <h1>Sala ${conexion.enRed ? `<span class="codigo">${e.codigo}</span>` : '(jugando solo)'}</h1>
      ${conexion.enRed && direccion ? `<p class="sub">Los demás abren <b>${direccion}</b> y escriben el código.</p>` : ''}
      <h3>Tripulación</h3>
      <ul class="jugadores">${e.jugadores.map((j) => `<li>${j.anfitrion ? '⭐ ' : ''}${j.nombre}${j.id === conexion.id ? ' (tú)' : ''}: ${j.roles.map((r) => ROLES.find((x) => x.id === r).nombre).join(', ') || '<i>sin rol</i>'}</li>`).join('')}</ul>
      <h3>Elige tu rol (puedes tomar varios)</h3>
      <div class="roles">${ROLES.map((r) => {
        const duenio = e.jugadores.find((j) => j.roles.includes(r.id));
        const mio = duenio && duenio.id === conexion.id;
        return `<button class="rol ${mio ? 'activo' : ''}" data-rol="${r.id}" ${duenio && !mio ? 'disabled' : ''} style="border-color:${r.color}">
          <b style="color:${r.color}">${r.nombre}</b><br><small>${INFO_ROL[r.id].segmento}</small><br><small>${INFO_ROL[r.id].tareas}</small>
          ${duenio && !mio ? `<br><small>👤 ${duenio.nombre}</small>` : ''}</button>`;
      }).join('')}</div>
      ${e.rolesLibres.length ? '<button id="libres" class="secundario">Tomar los roles libres</button>' : ''}
      ${yo && yo.anfitrion ? `<button id="empezar" ${e.puedeEmpezar ? '' : 'disabled'}>${e.puedeEmpezar ? '🚀 ¡Empezar misión!' : `Faltan roles: ${e.rolesLibres.length}`}</button>` : '<p class="nota">Esperando a que el anfitrión empiece…</p>'}
      <p class="error" id="error"></p>`;
    const mostrarError = (r) => { if (r && r.error) { efecto('error'); panel.querySelector('#error').textContent = r.error; } else efecto('clic'); };
    panel.querySelectorAll('[data-rol]').forEach((b) => { b.onclick = async () => mostrarError(await conexion.accion('rol', { rol: b.dataset.rol })); });
    const libres = panel.querySelector('#libres');
    if (libres) libres.onclick = async () => mostrarError(await conexion.accion('tomarLibres'));
    const empezar = panel.querySelector('#empezar');
    if (empezar) empezar.onclick = async () => mostrarError(await conexion.accion('empezar'));
  }

  // Si ya estamos en una sala (volvimos de una misión), se retoma directamente
  if (ctx.conexionActiva && ctx.conexionActiva.estado) {
    conexion = ctx.conexionActiva;
    info = ctx.infoServidor || null;
    quitarEstado = conexion.alEstado(alEstado);
    alEstado(conexion.estado);
  } else vistaInicio();
  return {
    actualizar(dt, t) {
      // La cámara gira despacio alrededor de la plataforma
      const ang = Math.sin(t * 0.15) * 0.5;
      motor.camara.position.set(Math.sin(ang) * 9, 2.6, Math.cos(ang) * 9);
      motor.camara.lookAt(0, 1.1, 0);
      aro.material.emissiveIntensity = 1.6 + Math.sin(t * 2) * 0.5;
      figuras.forEach((f, i) => f.a.actualizar(dt, { velocidad: 0, apoyado: true, velocidadVertical: 0, giro: 0 }) || (f.a.raiz.position.y = Math.sin(t * 1.5 + i) * 0.03));
    },
    salir() { panel.remove(); if (quitarEstado) quitarEstado(); }
  };
}
