// =============================================================
// pantallaAterrizaje.js — Minijuego del COMANDANTE: aterrizar el módulo.
// Física simple con la gravedad REAL del destino (destinos.json):
//   aceleración = empuje − gravedad (− frenado del aire en Marte, a = k·v²)
// Mantener Espacio (o W / ↑) enciende el motor. Hay poco combustible.
// Hay que tocar el suelo despacio. Los demás jugadores ven el descenso en vivo
// (el Comandante envía la altura por la red, como si fuera su posición).
// =============================================================
import * as THREE from 'three';
import { crearSuperficie, lucesSuperficie } from '../escenarios/superficie.js';
import { DESTINOS } from '../datos3d.js';
import emergencias from '../../data/emergencias3d.json';
import componentes from '../../data/componentes.json';
import configHangar from '../../data/hangar3d.json';
import { crearCatalogo, resumenDiseno } from '../../compartido/hangar.js';
import { recomendaciones } from '../../compartido/recomendaciones.js';
import { efecto } from '../audio.js';

const ALTURA_INICIAL = 60;   // m (valores del juego)
const VELOCIDAD_INICIAL = -6; // m/s (negativa = bajando)
const COMBUSTIBLE_BASE = 10;  // segundos de motor con el combustible recomendado
const CATALOGO = crearCatalogo(componentes, configHangar);

/** ctx = { motor, hud, conexionActiva, irA } */
export function iniciarPantallaAterrizaje(ctx) {
  const { motor } = ctx;
  const conexion = ctx.conexionActiva;
  const e = conexion.estado;
  const destino = DESTINOS.find((d) => d.id === e.destinoId);
  const g = destino.gravedad;
  const k = destino.juego?.frenadoAtmosferico || 0;
  const empuje = g * 2.5; // el motor puede frenar 1,5 veces la gravedad del destino
  const yo = e.jugadores.find((j) => j.id === conexion.id);
  const soyComandante = !!(yo && yo.roles.includes('comandante'));
  const comandante = e.jugadores.find((j) => j.roles.includes('comandante'));
  const config = emergencias.config;
  // El combustible depende de lo que se compró en el hangar comparado con lo recomendado
  // para este destino (compartido/recomendaciones.js): menos combustible = menos segundos de motor.
  const resumen = resumenDiseno(e.seleccion, CATALOGO, destino, configHangar);
  const zProp = recomendaciones(e.seleccion, CATALOGO, destino, resumen).propulsion;
  const COMBUSTIBLE = zProp && zProp.valor ? COMBUSTIBLE_BASE * Math.min(1.2, Math.max(0.5, zProp.valor / zProp.rec)) : COMBUSTIBLE_BASE;

  const esc = crearSuperficie(destino, { particulas: motor.calidad.sombras });
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(esc.colorCielo);
  if (esc.niebla) escena.fog = new THREE.Fog(esc.niebla.color, esc.niebla.cerca * 3, esc.niebla.lejos * 2);
  lucesSuperficie(escena, destino, motor.calidad.sombras);
  escena.add(esc.raiz);
  motor.cambiarEscena(escena);
  motor.camara.fov = 60;
  motor.camara.updateProjectionMatrix();
  const modulo = esc.modulo;
  const llama = modulo.userData.llama;

  // ---- Estado del descenso ----
  let altura = ALTURA_INICIAL;
  let vel = VELOCIDAD_INICIAL;
  let combustible = COMBUSTIBLE;
  let tocado = false;
  let encendido = false;
  let tiempoEnvio = 0;
  const teclas = new Set();
  const abajo = (ev) => { teclas.add(ev.code); if (ev.code === 'Space') ev.preventDefault(); };
  const arriba = (ev) => teclas.delete(ev.code);
  window.addEventListener('keydown', abajo);
  window.addEventListener('keyup', arriba);

  // ---- HUD ----
  const ui = document.createElement('div');
  ui.innerHTML = `
    <div class="panel titulo">🛬 Aterrizaje en ${destino.id === 'luna' ? 'la Luna' : destino.nombre} · gravedad ${g} m/s²</div>
    <div class="panel hud-aterrizaje">
      <div class="ha-fila"><span>Altura</span><b class="ha-alt"></b></div>
      <div class="ha-fila"><span>Velocidad</span><b class="ha-vel"></b></div>
      <div class="ha-fila"><span>Combustible</span><div class="hv-barra"><div class="ha-comb"></div></div></div>
      <p class="ha-ayuda">${soyComandante
        ? 'Mantén <span class="tecla">Espacio</span> (o <span class="tecla">W</span>) para encender el motor. Toca el suelo a menos de <b>' + config.aterrizajeSuave + ' m/s</b>.'
        : `👨‍✈️ <b>${comandante ? comandante.nombre : 'El Comandante'}</b> está pilotando el aterrizaje. ¡Denle ánimo!`}</p>
    </div>
    ${soyComandante ? '<button class="panel boton-motor">🔥 Motor (mantener)</button>' : ''}
    <div class="panel resultado-aterrizaje"></div>`;
  ctx.hud.appendChild(ui);
  const $ = (s) => ui.querySelector(s);
  let botonPulsado = false;
  const boton = $('.boton-motor');
  if (boton) {
    boton.onpointerdown = () => { botonPulsado = true; };
    boton.onpointerup = boton.onpointerleave = () => { botonPulsado = false; };
  }

  const quitarPos = conexion.alPosiciones((pos) => {
    if (soyComandante || !comandante) return;
    const p = pos[comandante.id];
    if (p && p.lander) { altura = p.y; vel = p.v; encendido = !!p.acc; }
  });
  const quitarEstado = conexion.alEstado((x) => { if (x.fase !== 'aterrizaje') ctx.irA('juego'); });

  function tocarSuelo() {
    tocado = true;
    const v = Math.abs(vel);
    const tipo = v <= config.aterrizajeSuave ? 'suave' : v <= config.aterrizajeDuro ? 'duro' : 'choque';
    const texto = { suave: '✅ ¡Aterrizaje suave!', duro: '⚠ Aterrizaje duro', choque: '💥 ¡Choque!' }[tipo];
    $('.resultado-aterrizaje').innerHTML = `${texto}<br><small>Tocaste el suelo a ${v.toFixed(1)} m/s</small>`;
    $('.resultado-aterrizaje').style.display = 'block';
    efecto(tipo === 'choque' ? 'error' : 'exito');
    ctx.aprendizaje?.evento('aterrizaje', destino.id);
    // Se espera un momento para ver el resultado y luego se avisa a la sala
    setTimeout(() => conexion.accion('aterrizar', { velocidad: v }), 1800);
  }

  return {
    actualizar(dt, t) {
      esc.actualizar(dt, t);
      if (soyComandante && !tocado) {
        encendido = (teclas.has('Space') || teclas.has('KeyW') || teclas.has('ArrowUp') || botonPulsado) && combustible > 0;
        if (encendido) combustible = Math.max(0, combustible - dt);
        // Física: a = empuje − g − (frenado del aire en Marte)
        const a = (encendido ? empuje : 0) - g + k * vel * vel * (vel < 0 ? 1 : -1);
        vel += a * dt;
        altura += vel * dt;
        if (altura <= 0) { altura = 0; tocarSuelo(); }
        tiempoEnvio += dt;
        if (tiempoEnvio > 1 / 15) { tiempoEnvio = 0; conexion.enviarPosicion({ x: 0, y: +altura.toFixed(2), z: 0, ry: 0, v: +vel.toFixed(2), ap: 0, acc: encendido ? 'motor' : null, lander: 1 }); }
      }
      // Módulo y llama
      modulo.position.y = altura;
      modulo.rotation.y += dt * 0.05;
      llama.visible = encendido && !tocado;
      llama.scale.setScalar(0.8 + Math.random() * 0.4);
      // Cámara: de costado, siguiendo al módulo
      // (se aleja con la altura para que siempre se vean el módulo y el suelo)
      const lejos = 16 + altura * 0.9;
      motor.camara.position.set(lejos * 0.6, Math.max(3, altura * 0.55), lejos);
      motor.camara.lookAt(0, Math.max(1.5, altura * 0.45), 0);
      // HUD
      const v = Math.abs(vel);
      $('.ha-alt').textContent = `${altura.toFixed(1)} m`;
      $('.ha-vel').textContent = `${v.toFixed(1)} m/s ${vel < 0 ? '↓' : '↑'}`;
      $('.ha-vel').style.color = v <= config.aterrizajeSuave ? '#5be08a' : v <= config.aterrizajeDuro ? '#ffd166' : '#ff6b6b';
      $('.ha-comb').style.width = `${(combustible / COMBUSTIBLE) * 100}%`;
      $('.ha-comb').style.background = combustible > 3 ? '#ffd166' : '#e5484d';
    },
    salir() {
      ui.remove(); quitarPos(); quitarEstado();
      window.removeEventListener('keydown', abajo);
      window.removeEventListener('keyup', arriba);
    }
  };
}

