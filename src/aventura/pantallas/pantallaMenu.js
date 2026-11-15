// =============================================================
// pantallaMenu.js — Menú principal: "Jugar solo", "Crear sala" y "Unirse con código".
// De fondo, la plataforma con los 4 astronautas girando despacio.
// "Jugar solo" funciona siempre (sin internet): es una sala de 1 jugador con 3 bots.
// "Crear sala" y "Unirse" usan el multijugador (Firebase); si no está configurado,
// se explica con un mensaje y se puede seguir jugando solo.
// =============================================================
import * as THREE from 'three';
import { crearLuces } from '../engine/luces.js';
import { cielo } from '../engine/decoracion.js';
import { nuevoEscenario, cilindro, material } from '../engine/construccion.js';
import { crearAstronauta } from '../entities/fabricaAstronautas.js';
import personajes from '../../data/personajes.json';
import { efecto } from '../audio.js';

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
    const a = crearAstronauta(colorNum(p.color));
    a.raiz.position.set(-3.3 + i * 2.2, 0, 0);
    escena.add(a.raiz);
    return a;
  });
  motor.cambiarEscena(escena);
  motor.camara.fov = 50;
  motor.camara.updateProjectionMatrix();

  const panel = document.createElement('div');
  panel.className = 'panel lobby menu-principal';
  ctx.hud.appendChild(panel);
  let nombreGuardado = '';
  try { nombreGuardado = localStorage.getItem('misionEspacial.nombre') || ''; } catch { /* sin almacenamiento */ }

  function dibujar(error = '', vistaUnirse = false) {
    panel.innerHTML = `
      <h1>🚀 Misión Espacial 3D</h1>
      <p class="sub">Diseña, viaja y explora una misión a la Luna o a Marte.</p>
      <label>Tu nombre <input id="nombre" maxlength="14" value="${nombreGuardado}" placeholder="Astronauta"></label>
      <button id="solo">🧑‍🚀 Jugar solo</button>
      <button id="crear" class="secundario">✨ Crear sala</button>
      ${vistaUnirse
        ? `<div class="fila"><input id="codigo" maxlength="4" placeholder="CÓDIGO"><button id="entrar">Entrar</button></div>`
        : '<button id="unirse" class="secundario">🔑 Unirse con código</button>'}
      <p class="error">${error}</p>`;
    const nombre = () => {
      const n = panel.querySelector('#nombre').value.trim() || 'Astronauta';
      nombreGuardado = n;
      try { localStorage.setItem('misionEspacial.nombre', n); } catch { /* sin almacenamiento */ }
      return n;
    };
    panel.querySelector('#solo').onclick = () => { efecto('clic'); ctx.alJugarSolo(nombre()); };
    panel.querySelector('#crear').onclick = async () => {
      efecto('clic');
      const r = await ctx.alCrearSala(nombre());
      if (r && r.error) { efecto('error'); dibujar(r.error); }
    };
    const unirse = panel.querySelector('#unirse');
    if (unirse) unirse.onclick = () => { efecto('clic'); dibujar('', true); };
    const entrar = panel.querySelector('#entrar');
    if (entrar) entrar.onclick = async () => {
      const codigo = panel.querySelector('#codigo').value.trim().toUpperCase();
      if (codigo.length !== 4) { efecto('error'); return dibujar('El código tiene 4 letras.', true); }
      const r = await ctx.alUnirse(codigo, nombre());
      if (r && r.error) { efecto('error'); dibujar(r.error, true); }
    };
  }
  dibujar();

  return {
    actualizar(dt, t) {
      const ang = Math.sin(t * 0.15) * 0.5;
      motor.camara.position.set(Math.sin(ang) * 9, 2.6, Math.cos(ang) * 9);
      motor.camara.lookAt(0, 1.1, 0);
      figuras.forEach((a) => a.actualizar(dt, { velocidad: 0, apoyado: true, velocidadVertical: 0, giro: 0 }));
    },
    salir() { panel.remove(); }
  };
}
