// =============================================================
// pantallaMenu.js — Menú principal: "Jugar solo", "Crear sala" y "Unirse con código".
// De fondo, la plataforma con los 4 astronautas girando despacio.
// "Jugar solo" funciona siempre (sin internet): es una sala de 1 jugador con 3 bots.
// "Crear sala" y "Unirse" usan el multijugador (Firebase); si no está configurado,
// se explica con un mensaje y se puede seguir jugando solo.
// =============================================================
import * as THREE from 'three';
import { camaraPlataforma } from './camaraPlataforma.js';
import { crearLuces } from '../engine/luces.js';
import { cielo } from '../engine/decoracion.js';
import { nuevoEscenario, cilindro, material } from '../engine/construccion.js';
import { crearAstronauta } from '../entities/fabricaAstronautas.js';
import personajes from '../../data/personajes.json';
import { efecto } from '../audio.js';
import { MINIJUEGOS, minijuegosActivos, abrirMinijuego } from '../minijuegos/index.js';
import { TRIPULACION, colorDe, hexDe } from '../tripulacion.js';

const colorNum = (hex) => parseInt(hex.replace('#', ''), 16);

/** ctx = { motor, hud, irA, alJugarSolo(nombre), alCrearSala(nombre), alUnirse(codigo, nombre), multijugadorDisponible } */
export function iniciarPantallaMenu(ctx) {
  const { motor } = ctx;
  const esc = nuevoEscenario();
  cielo(esc, 1200, 120);
  cilindro(esc, 4.2, 0.4, material(0x2a3350, { metal: 0.7, rugosidad: 0.3 }), 0, -0.2, 0, { solida: false, lados: 48 });
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x02030a);
  crearLuces(escena, { sombras: false, intensidad: 0.8, intensidadSol: 2.4, posicionSol: new THREE.Vector3(-6, 10, 8) });
  escena.add(esc.raiz);
  const figuras = personajes.personajes.map((p, i) => {
    const a = crearAstronauta(colorDe(p.rolPorDefecto), p.id);
    a.raiz.position.set(-3.3 + i * 2.2, 0, 0);
    escena.add(a.raiz);
    return a;
  });
  motor.cambiarEscena(escena);
  let proximoEmote = 1.5;
  motor.camara.fov = 50;
  motor.camara.updateProjectionMatrix();

  const panel = document.createElement('div');
  panel.className = 'panel lobby menu-principal';
  ctx.hud.appendChild(panel);
  let nombreGuardado = '';
  try { nombreGuardado = localStorage.getItem('misionEspacial.nombre') || ''; } catch { /* sin almacenamiento */ }

  function dibujar(error = '', vistaUnirse = false) {
    panel.innerHTML = `
      <h1>🌱🚀 Garden Space</h1>
      <p class="sub">Diseña, viaja y explora una misión a la Luna o a Marte.</p>
      <label>Tu nombre <input id="nombre" maxlength="14" value="${nombreGuardado}" placeholder="Astronauta"></label>
      <button id="solo">🧑‍🚀 Jugar solo</button>
      <button id="crear" class="secundario">✨ Crear sala <small>(online)</small></button>
      ${vistaUnirse
        ? `<div class="fila"><input id="codigo" maxlength="4" placeholder="CÓDIGO"><button id="entrar">Entrar</button></div>`
        : '<button id="unirse" class="secundario">🔑 Unirse con código</button>'}
      <button id="prueba" class="secundario">🧪 Modo prueba (minijuegos)</button>
      <p class="error">${error}</p>
      <p class="version">Versión ${typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'local'} · si no es la última, pulsa Ctrl+F5</p>`;
    panel.querySelector('#prueba').onclick = () => { efecto('clic'); dibujarPrueba(); };
    const nombre = () => {
      const n = panel.querySelector('#nombre').value.trim() || 'Astronauta';
      nombreGuardado = n;
      try { localStorage.setItem('misionEspacial.nombre', n); } catch { /* sin almacenamiento */ }
      return n;
    };
    panel.querySelector('#solo').onclick = () => { efecto('clic'); ctx.alJugarSolo(nombre()); };
    const esperando = () => { panel.querySelectorAll('button').forEach((x) => { x.disabled = true; }); panel.querySelector('.error').innerHTML = '<span class="red-estado conectando">⏳ Conectando…</span>'; };
    panel.querySelector('#crear').onclick = async () => {
      efecto('clic');
      esperando();
      const r = await ctx.alCrearSala(nombre());
      if (r && r.error) { efecto('error'); dibujar(r.error); }
    };
    const unirse = panel.querySelector('#unirse');
    if (unirse) unirse.onclick = () => { efecto('clic'); nombre(); dibujar('', true); }; // nombre(): guarda lo escrito antes de redibujar
    const entrar = panel.querySelector('#entrar');
    if (entrar) entrar.onclick = async () => {
      const codigo = panel.querySelector('#codigo').value.trim().toUpperCase();
      if (codigo.length !== 4) { efecto('error'); return dibujar('El código tiene 4 letras.', true); }
      esperando();
      const r = await ctx.alUnirse(codigo, nombre());
      if (r && r.error) { efecto('error'); dibujar(r.error, true); }
    };
  }
  // ---- MODO PRUEBA: abrir cualquier minijuego directo, sin penalización ----
  let destinoPrueba = 'luna';
  function dibujarPrueba(resultado = '') {
    panel.className = 'panel lobby prueba';
    const lista = minijuegosActivos();
    panel.innerHTML = `
      <h1>🧪 Modo prueba</h1>
      <p class="sub">Abre cualquier minijuego para probarlo. No cuenta para la partida.</p>
      <div class="fila">
        <button class="secundario ${destinoPrueba === 'luna' ? 'activo' : ''}" data-destino="luna">🌕 Luna (media)</button>
        <button class="secundario ${destinoPrueba === 'marte' ? 'activo' : ''}" data-destino="marte">🔴 Marte (difícil)</button>
      </div>
      ${resultado ? `<div class="prueba-resultado">${resultado}</div>` : ''}
      ${TRIPULACION.map((m) => `
        <h3 style="color:${hexDe(m.rol)}">${m.icono} ${m.corto}</h3>
        <div class="prueba-lista">${lista.filter((j) => j.rol === m.rol).map((j) => `<button data-mj="${j.id}">${j.nombre}</button>`).join('')}</div>`).join('')}
      <button class="secundario" id="volver">⬅ Volver al menú</button>`;
    panel.querySelectorAll('[data-destino]').forEach((b) => { b.onclick = () => { destinoPrueba = b.dataset.destino; dibujarPrueba(); }; });
    panel.querySelector('#volver').onclick = () => { panel.className = 'panel lobby menu-principal'; dibujar(); };
    panel.querySelectorAll('[data-mj]').forEach((b) => {
      b.onclick = () => {
        const j = MINIJUEGOS[b.dataset.mj];
        panel.style.display = 'none';
        const emergencia = { minijuego: b.dataset.mj, nombre: `🧪 ${j.nombre}`, descripcion: j.objetivo, restante: 60 };
        abrirMinijuego(emergencia, colorDe(j.rol), (r) => {
          panel.style.display = '';
          dibujarPrueba(r === true ? `🏆 ¡Ganaste "${j.nombre}"!` : r === false ? `❌ Perdiste "${j.nombre}". ¡Prueba otra vez!` : `Cerraste "${j.nombre}".`);
        }, destinoPrueba, { extraTiempo: 1, sinLogros: true });
      };
    });
  }
  window.modoPrueba = dibujarPrueba; // para las pruebas automáticas
  // Mensaje al volver de una sala (ej.: "El anfitrión cerró la sala")
  dibujar(ctx.mensajeMenu || '');
  ctx.mensajeMenu = '';

  return {
    actualizar(dt, t) {
      camaraPlataforma(motor.camara, t); // personajes a la izquierda, sin que el panel los tape
      figuras.forEach((a) => a.actualizar(dt, { velocidad: 0, apoyado: true, velocidadVertical: 0, giro: 0 }));
      // De vez en cuando alguno saluda, baila o ríe
      proximoEmote -= dt;
      if (proximoEmote <= 0) { proximoEmote = 2.5 + Math.random() * 2; figuras[Math.floor(Math.random() * figuras.length)].emote(Math.floor(Math.random() * 3)); }
    },
    salir() { panel.remove(); }
  };
}
