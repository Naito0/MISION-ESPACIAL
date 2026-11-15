// =============================================================
// pantallaSala.js — La SALA antes de empezar.
// - Código de 4 letras en grande, con botón para copiarlo (en multijugador).
// - Los 4 puestos: Piloto, Ingeniero, Científico y Comunicaciones.
// - Cada jugador elige UN puesto y UN personaje (no se repiten) y pulsa "¡Listo!".
// - El anfitrión inicia cuando todos están listos. Los puestos libres los
//   ocupan BOTS con su personaje por defecto.
// De fondo: los astronautas sobre la plataforma, con el nombre de quien los usa.
// =============================================================
import * as THREE from 'three';
import { camaraPlataforma } from './camaraPlataforma.js';
import { crearLuces } from '../engine/luces.js';
import { cielo } from '../engine/decoracion.js';
import { nuevoEscenario, cilindro, material } from '../engine/construccion.js';
import { crearAstronauta } from '../entities/fabricaAstronautas.js';
import { crearEtiqueta } from '../entities/AstronautaRemoto.js';
import { TRIPULACION, hexDe, colorDe } from '../tripulacion.js';
import personajesJSON from '../../data/personajes.json';
import { efecto } from '../audio.js';

const PERSONAJES = personajesJSON.personajes;

/** ctx = { motor, hud, conexionActiva, irA, alSalirDeSala() } */
export function iniciarPantallaSala(ctx) {
  const { motor } = ctx;
  const conexion = ctx.conexionActiva;
  // ---- Fondo 3D ----
  const esc = nuevoEscenario();
  cielo(esc, 1200, 120);
  cilindro(esc, 4.2, 0.4, material(0x2a3350, { metal: 0.7, rugosidad: 0.3 }), 0, -0.2, 0, { solida: false, lados: 48 });
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x02030a);
  crearLuces(escena, { sombras: false, intensidad: 0.8, intensidadSol: 2.4, posicionSol: new THREE.Vector3(-6, 10, 8) });
  escena.add(esc.raiz);
  motor.cambiarEscena(escena);
  motor.camara.fov = 50;
  motor.camara.updateProjectionMatrix();
  const figuras = TRIPULACION.map((m, i) => ({ m, i, a: null, etiqueta: null, clave: '' }));

  // ---- Interfaz ----
  const panel = document.createElement('div');
  panel.className = 'panel lobby sala';
  ctx.hud.appendChild(panel);
  let error = '';
  let presentar = null; // personaje que se presenta al elegirlo
  let fraseActual = null;
  const pintarFrase = () => {
    const el = panel.querySelector('.frase-pj');
    if (el && fraseActual) el.innerHTML = `💬 <b>${fraseActual.nombre}</b> (${fraseActual.especie}): «${fraseActual.frase}»<br><small>${fraseActual.gag}</small>`;
  };

  function dibujarFondo(e) {
    const porRol = e.personajesPorRol || {};
    for (const f of figuras) {
      const duenio = e.jugadores.find((j) => j.roles.includes(f.m.rol));
      const pj = PERSONAJES.find((p) => p.id === (duenio ? duenio.personaje : porRol[f.m.rol])) || PERSONAJES[f.i];
      const texto = duenio ? duenio.nombre : `🤖 ${pj.nombre}`;
      const clave = `${pj.id}|${texto}`;
      if (clave === f.clave) continue;
      f.clave = clave;
      if (f.a) f.a.raiz.removeFromParent();
      f.a = crearAstronauta(colorDe(f.m.rol), pj.id); // traje del color del rol
      // Si es el personaje que ACABO de elegir: presentación con su frase
      if (presentar === pj.id) { f.a.presentar(); f.a.decir('¡Hola!'); fraseActual = pj; presentar = null; pintarFrase(); }
      f.a.raiz.position.set(-3.3 + f.i * 2.2, 0, 0);
      f.etiqueta = crearEtiqueta(texto, colorDe(f.m.rol));
      f.etiqueta.position.y = 2.6;
      f.a.raiz.add(f.etiqueta);
      escena.add(f.a.raiz);
    }
  }

  function dibujar(e) {
    if (!e) return;
    const yo = e.jugadores.find((j) => j.id === conexion.id);
    if (!yo) return;
    const soyAnfitrion = !!yo.anfitrion;
    const enRed = !!conexion.enRed;
    const listosTodos = e.jugadores.every((j) => j.roles.length && j.listo);
    panel.innerHTML = `
      <h1>${enRed ? `Sala <span class="codigo">${e.codigo}</span>` : '🧑‍🚀 Jugar solo'}</h1>
      ${enRed ? `<div class="red-estado"></div>` : ''}
      ${enRed ? `<button class="secundario copiar">📋 Copiar código</button><p class="sub">Los demás abren el juego, eligen <b>"Unirse con código"</b> y escriben <b>${e.codigo}</b>.</p>` : '<p class="sub">Tú eliges un puesto; los otros 3 los ocupan bots. En una emergencia de un bot, tomas su control con 1-4.</p>'}
      <h3>1. Elige tu puesto</h3>
      <div class="roles">${TRIPULACION.map((m) => {
        const duenio = e.jugadores.find((j) => j.roles.includes(m.rol));
        const mio = duenio && duenio.id === yo.id;
        return `<button class="rol ${mio ? 'activo' : ''}" data-rol="${m.rol}" ${duenio && !mio ? 'disabled' : ''} style="border-color:${hexDe(m.rol)}">
          <b style="color:${hexDe(m.rol)}">${m.icono} ${m.corto}</b><br>
          <small>${duenio ? `${duenio.listo ? '✅' : '⏳'} ${duenio.nombre}${mio ? ' (tú)' : ''}` : '🤖 bot'}</small></button>`;
      }).join('')}</div>
      <h3>2. Elige tu personaje</h3>
      <div class="personajes">${PERSONAJES.map((p) => {
        const duenio = e.jugadores.find((j) => j.personaje === p.id);
        const mio = duenio && duenio.id === yo.id;
        return `<button class="personaje ${mio ? 'activo' : ''}" data-pj="${p.id}" ${duenio && !mio ? 'disabled' : ''}>
          <span class="pj-color" style="background:${p.color}"></span><span>${p.nombre} <small>${p.especie}</small></span>${duenio && !mio ? `<small> · ${duenio.nombre}</small>` : ''}</button>`;
      }).join('')}</div>
      <p class="frase-pj"></p>
      <h3>3. ¿Listo?</h3>
      <button id="listo" class="${yo.listo ? 'activo' : ''}">${yo.listo ? '✋ Ya no estoy listo' : '✅ ¡Listo!'}</button>
      ${soyAnfitrion
        ? `<button id="iniciar" ${listosTodos ? '' : 'disabled'}>🚀 Iniciar partida${listosTodos ? '' : ' (faltan listos)'}</button>`
        : '<p class="nota">El anfitrión inicia cuando todos están listos.</p>'}
      <button class="secundario" id="volver">⬅ Volver al menú</button>
      <p class="error">${error}</p>`;
    const responder = async (p) => { const r = await p; if (r && r.error) { error = r.error; efecto('error'); dibujar(conexion.estado); } else { error = ''; efecto('clic'); } };
    panel.querySelectorAll('[data-rol]').forEach((b) => { b.onclick = () => responder(conexion.accion('puesto', { rol: b.dataset.rol })); });
    panel.querySelectorAll('[data-pj]').forEach((b) => { b.onclick = () => { presentar = b.dataset.pj; responder(conexion.accion('personaje', { id: b.dataset.pj })); }; });
    panel.querySelector('#listo').onclick = () => responder(conexion.accion('listoSala'));
    const iniciar = panel.querySelector('#iniciar');
    if (iniciar) iniciar.onclick = () => responder(conexion.accion('empezarConBots'));
    panel.querySelector('#volver').onclick = () => ctx.alSalirDeSala?.();
    const copiar = panel.querySelector('.copiar');
    if (copiar) copiar.onclick = () => {
      navigator.clipboard?.writeText(e.codigo).then(() => { copiar.textContent = '✅ ¡Copiado!'; }, () => { copiar.textContent = `Código: ${e.codigo}`; });
    };
    dibujarFondo(e);
    pintarFrase();
    pintarRed();
  }
  // Indicador de conexión: "Conectando…", "Conectado" o "Error: …" (en español)
  function pintarRed() {
    const el = panel.querySelector('.red-estado');
    if (!el || !conexion.red) return;
    const { estado, mensaje } = conexion.red;
    el.className = `red-estado ${estado}`;
    el.textContent = estado === 'conectado' ? `🟢 ${mensaje}` : estado === 'error' ? `🔴 Error: ${mensaje}` : `⏳ ${mensaje}`;
  }
  const quitarRed = conexion.alRed ? conexion.alRed(pintarRed) : () => {};

  const quitarEstado = conexion.alEstado((e) => {
    if (e.fase !== 'lobby') { ctx.irA(); return; }
    dibujar(e);
  });
  dibujar(conexion.estado);

  return {
    actualizar(dt, t) {
      camaraPlataforma(motor.camara, t); // personajes a la izquierda, sin que el panel los tape
      figuras.forEach((f) => f.a && f.a.actualizar(dt, { velocidad: 0, apoyado: true, velocidadVertical: 0, giro: 0 }));
    },
    salir() { panel.remove(); quitarEstado(); quitarRed(); }
  };
}
