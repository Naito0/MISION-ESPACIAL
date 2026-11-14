// =============================================================
// pantallaNave.js — Dentro de la nave: el jugador camina por las salas.
// (En los pasos siguientes se suman los demás jugadores, las emergencias
//  y las tareas en las consolas.)
// =============================================================
import * as THREE from 'three';
import { crearLuces } from '../engine/luces.js';
import { MundoFisico } from '../engine/fisica.js';
import { crearNaveInterior } from '../escenarios/naveInterior.js';
import { JugadorLocal } from '../entities/JugadorLocal.js';
import { TIERRA } from '../datos3d.js';
import { ambiente } from '../audio.js';

/** ctx = { motor, hud, control, colorRol, colorPlaneta } */
export function iniciarPantallaNave(ctx) {
  const { motor } = ctx;
  const esc = crearNaveInterior({ colorPlaneta: ctx.colorPlaneta, particulas: motor.calidad.sombras });
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(esc.colorFondo);
  // Adentro: luz ambiente suave, sin sol (las luces de cada sala hacen el resto)
  crearLuces(escena, { sombras: false, intensidad: 0.55, intensidadSol: 0.25 });
  escena.add(esc.raiz);
  motor.cambiarEscena(escena);

  const mundo = new MundoFisico(esc.colisiones, TIERRA.gravedad); // gravedad artificial de la nave
  esc.puertas.forEach((p) => mundo.dinamicos.push(p));
  const jugador = new JugadorLocal(escena, mundo, esc, motor.camara, ctx.control, ctx.colorRol);
  motor.camara.fov = 70;
  motor.camara.updateProjectionMatrix();
  ambiente(true);

  // HUD: en qué sala estoy
  const cartel = document.createElement('div');
  cartel.className = 'panel titulo';
  ctx.hud.appendChild(cartel);

  /** Sala en la que está un punto (la más cercana a su centro, si está dentro de 6 m). */
  const salaDe = (p) => {
    let mejor = null;
    let dist = Infinity;
    for (const s of Object.values(esc.salas)) {
      const d = Math.hypot(p.x - s.centro.x, p.z - s.centro.z);
      if (d < dist) { dist = d; mejor = s; }
    }
    return Math.abs(p.x) < 2.2 && p.z > -24 && p.z < 8 ? esc.salas.pasillo : mejor;
  };

  return {
    escena, esc, mundo, jugador,
    actualizar(dt, t) {
      jugador.actualizar(dt);
      esc.puertas.forEach((p) => p.actualizar(dt, [jugador.pies, ...(ctx.otrasPosiciones?.() || [])]));
      esc.actualizar(dt, t);
      const s = salaDe(jugador.pies);
      cartel.textContent = `📍 ${s ? s.nombre : 'Nave'}`;
    },
    salir() { cartel.remove(); ambiente(false); }
  };
}
