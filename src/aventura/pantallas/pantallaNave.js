// =============================================================
// pantallaNave.js — Dentro de la nave: cada jugador camina por las salas
// y ve a los demás astronautas moviéndose (sincronizados por la red).
// =============================================================
import * as THREE from 'three';
import { crearLuces } from '../engine/luces.js';
import { MundoFisico } from '../engine/fisica.js';
import { crearNaveInterior } from '../escenarios/naveInterior.js';
import { JugadorLocal } from '../entities/JugadorLocal.js';
import { AstronautaRemoto } from '../entities/AstronautaRemoto.js';
import { TIERRA, ROLES, colorRol } from '../datos3d.js';
import { ambiente } from '../audio.js';

/** Color del primer rol de un jugador. */
export function colorDeJugador(j) {
  const rol = ROLES.find((r) => r.id === (j && j.roles[0]));
  return rol ? colorRol(rol) : 0xdfe6f5;
}

/** ctx = { motor, hud, control, conexionActiva, colorPlaneta } */
export function iniciarPantallaNave(ctx) {
  const { motor } = ctx;
  const conexion = ctx.conexionActiva;
  const estado = conexion.estado;
  const esc = crearNaveInterior({ colorPlaneta: ctx.colorPlaneta, particulas: motor.calidad.sombras });
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(esc.colorFondo);
  // Adentro: luz ambiente suave, sin sol (las luces de cada sala hacen el resto)
  crearLuces(escena, { sombras: false, intensidad: 0.55, intensidadSol: 0.25 });
  escena.add(esc.raiz);
  motor.cambiarEscena(escena);

  const mundo = new MundoFisico(esc.colisiones, TIERRA.gravedad); // gravedad artificial de la nave
  esc.puertas.forEach((p) => mundo.dinamicos.push(p));

  // Cada jugador aparece en un lugar distinto del pasillo
  const yo = estado.jugadores.find((j) => j.id === conexion.id);
  const indice = Math.max(0, estado.jugadores.indexOf(yo));
  esc.puntoInicio = new THREE.Vector3(-1 + (indice % 2) * 2, 0.05, 3 + Math.floor(indice / 2) * 1.6);
  const jugador = new JugadorLocal(escena, mundo, esc, motor.camara, ctx.control, colorDeJugador(yo));
  motor.camara.fov = 70;
  motor.camara.updateProjectionMatrix();
  ambiente(true);

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

  // HUD: en qué sala estoy
  const cartel = document.createElement('div');
  cartel.className = 'panel titulo';
  ctx.hud.appendChild(cartel);
  const salaDe = (p) => {
    if (Math.abs(p.x) < 2.2 && p.z > -24 && p.z < 8) return esc.salas.pasillo;
    let mejor = null;
    let dist = Infinity;
    for (const s of Object.values(esc.salas)) {
      const d = Math.hypot(p.x - s.centro.x, p.z - s.centro.z);
      if (d < dist) { dist = d; mejor = s; }
    }
    return mejor;
  };

  return {
    escena, esc, mundo, jugador, remotos,
    actualizar(dt, t) {
      jugador.actualizar(dt);
      // Enviar mi posición unas 15 veces por segundo
      tiempoEnvio += dt;
      if (tiempoEnvio >= 1 / 15) { tiempoEnvio = 0; conexion.enviarPosicion(jugador.estadoRed()); }
      remotos.forEach((r) => r.actualizar(dt));
      esc.puertas.forEach((p) => p.actualizar(dt, [jugador.pies, ...[...remotos.values()].map((r) => r.pies)]));
      esc.actualizar(dt, t);
      const s = salaDe(jugador.pies);
      cartel.textContent = `📍 ${s ? s.nombre : 'Nave'}`;
    },
    salir() { cartel.remove(); ambiente(false); quitarPos(); }
  };
}
