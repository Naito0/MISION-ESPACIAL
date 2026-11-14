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
import { mostrarTarjeta } from '../ui/tarjetas.js';
import hechosJSON from '../../data/hechos_reales.json';
import dificultadJSON from '../../data/dificultad.json';

const HECHOS = hechosJSON.hechos;
const azar = (a, b) => a + Math.random() * (b - a);
const CLAVE_DEMO = 'misionEspacial.demoAterrizaje';
const yaVioDemoAterrizaje = () => { try { return localStorage.getItem(CLAVE_DEMO) === '1'; } catch { return false; } };
const marcarDemoAterrizaje = () => { try { localStorage.setItem(CLAVE_DEMO, '1'); } catch { /* sin almacenamiento */ } };

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
  const valoresMinijuego = dificultadJSON.minijuegosPorDestino[destino.id] || {};
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

  // ---- "Aterrizar con alarmas" (inspirado en el Apolo 11, 1969) ----
  // Debajo hay un campo de ROCAS: hay que moverse (← →) hasta la zona plana (círculo verde).
  // Durante el descenso suenan alarmas de la computadora (1202, 1201) que NO son graves:
  // hay que ignorarlas. La alarma de combustible bajo sí es seria.
  const vm = valoresMinijuego.aterrizaje || {};
  let x = 0; let vx = 0;
  const padX = (Math.random() < 0.5 ? -1 : 1) * azar(vm.distanciaZona?.[0] ?? 9, vm.distanciaZona?.[1] ?? 13);
  const rocas = new THREE.Group();
  const matRoca = new THREE.MeshStandardMaterial({ color: destino.id === 'marte' ? 0x6a3220 : 0x555555, roughness: 1, flatShading: true });
  for (let i = 0; i < 26; i++) {
    const rx = azar(-8, 8); if (Math.abs(rx - padX) < 4) continue;
    const s = azar(0.5, 1.4);
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), matRoca);
    r.position.set(rx, s * 0.4, azar(-3, 3));
    rocas.add(r);
  }
  esc.raiz.add(rocas);
  const pad = new THREE.Mesh(new THREE.RingGeometry(2.6, 3, 40), new THREE.MeshBasicMaterial({ color: 0x5be08a, side: THREE.DoubleSide }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(padX, 0.06, 0);
  esc.raiz.add(pad);
  const alturasAlarma = Array.from({ length: vm.alarmas ?? 2 }, (_, i) => ALTURA_INICIAL * (0.8 - i * 0.22));
  let alarma = null; let alarmasBien = 0; let alarmasMal = 0;
  let demo = yaVioDemoAterrizaje() ? 0 : 3.5; // la primera vez: 3 s de "así se juega"
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
    <div class="panel alarma-aterrizaje" hidden></div>
    <div class="panel demo-aterrizaje" hidden>
      <div class="demo-titulo">👀 Así se juega</div>
      <div class="demo-teclas"><span class="tecla demo-tecla">Espacio</span> frenar · <span class="tecla demo-tecla">←</span><span class="tecla demo-tecla">→</span> ir a la zona verde · <span class="tecla demo-tecla">I</span> ignorar alarma</div>
      <p>Evita las rocas, aterriza despacio en el círculo verde.</p></div>
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
    $('.alarma-aterrizaje').hidden = true;
    const enRocas = Math.abs(x - padX) > 3;
    let v = Math.abs(vel);
    if (enRocas) v = Math.max(v, config.aterrizajeDuro + 1); // sobre las rocas, el módulo se daña
    const tipo = v <= config.aterrizajeSuave ? 'suave' : v <= config.aterrizajeDuro ? 'duro' : 'choque';
    const texto = { suave: '✅ ¡Aterrizaje suave!', duro: '⚠ Aterrizaje duro', choque: '💥 ¡Choque!' }[tipo];
    $('.resultado-aterrizaje').innerHTML = `${texto}<br><small>${enRocas ? 'Bajaste sobre las rocas: había que llegar al círculo verde' : `Tocaste el suelo a ${Math.abs(vel).toFixed(1)} m/s`}</small>`;
    $('.resultado-aterrizaje').style.display = 'block';
    efecto(tipo === 'choque' ? 'error' : 'exito');
    ctx.aprendizaje?.evento('aterrizaje', destino.id);
    setTimeout(async () => {
      if (tipo !== 'choque') {
        window.dispatchEvent(new CustomEvent('minijuego-ganado', { detail: { id: 'aterrizaje', alarmasBien, alarmasMal } }));
        // 📜 Esto pasó de verdad: el Apolo 11 aterrizó con alarmas y a mano
        const h = HECHOS.aterrizaje;
        await mostrarTarjeta({ etiqueta: '📜 Esto pasó de verdad', icono: h.icono, titulo: `${h.mision} (${h.anio})`, frase: h.frase, detalle: `“${h.cita}”`, fuente: h.fuente });
      }
      conexion.accion('aterrizar', { velocidad: v });
    }, 1800);
  }

  /** Muestra una alarma de la computadora: ¿ignorar o abortar? */
  function sonarAlarma() {
    const codigo = Math.random() < 0.5 ? '1202' : '1201';
    alarma = { codigo, t: 0 };
    efecto('alarma');
    const caja = $('.alarma-aterrizaje');
    caja.hidden = false;
    caja.innerHTML = `<b>🚨 ALARMA ${codigo}</b><br>La computadora tiene demasiados datos para procesar.
      <div class="fila"><button class="boton al-ign">Ignorar (I)</button><button class="boton al-abo">Abortar (O)</button></div>`;
    caja.querySelector('.al-ign').onclick = () => responder(true);
    caja.querySelector('.al-abo').onclick = () => responder(false);
  }
  function responder(ignorar) {
    if (!alarma) return;
    const caja = $('.alarma-aterrizaje');
    if (ignorar) { alarmasBien++; caja.innerHTML = '✅ Bien: esa alarma no era grave. ¡Sigue bajando!'; efecto('exito'); }
    else { alarmasMal++; combustible = Math.max(0, combustible - 1.5); caja.innerHTML = '❌ Abortar gastó combustible: la alarma solo decía que la computadora tenía muchos datos. No era grave.'; efecto('error'); }
    alarma = null;
    setTimeout(() => { if (!alarma && !combustibleBajoVisible) caja.hidden = true; }, 2200);
  }
  let combustibleBajoVisible = false;
  const teclaAlarma = (ev) => { if (ev.code === 'KeyI') responder(true); if (ev.code === 'KeyO') responder(false); };
  window.addEventListener('keydown', teclaAlarma);

  return {
    actualizar(dt, t) {
      esc.actualizar(dt, t);
      // La primera vez: 3 segundos de "así se juega" antes de empezar a caer
      if (demo > 0) {
        demo -= dt;
        $('.demo-aterrizaje').hidden = demo <= 0;
        if (demo <= 0) marcarDemoAterrizaje();
      } else if (soyComandante && !tocado) {
        encendido = (teclas.has('Space') || teclas.has('KeyW') || teclas.has('ArrowUp') || botonPulsado) && combustible > 0;
        if (encendido) combustible = Math.max(0, combustible - dt);
        // Física: a = empuje − g − (frenado del aire en Marte)
        const a = (encendido ? empuje : 0) - g + k * vel * vel * (vel < 0 ? 1 : -1);
        vel += a * dt;
        altura += vel * dt;
        // Movimiento lateral (← →): también gasta un poco de combustible
        const lado = (teclas.has('ArrowRight') || teclas.has('KeyD') ? 1 : 0) - (teclas.has('ArrowLeft') || teclas.has('KeyA') ? 1 : 0);
        if (lado && combustible > 0) { vx += lado * 4 * dt; combustible = Math.max(0, combustible - 0.3 * dt); }
        vx *= 1 - Math.min(1, 0.8 * dt);
        x += vx * dt;
        // Alarmas de la computadora a ciertas alturas
        if (alturasAlarma.length && altura < alturasAlarma[0]) { alturasAlarma.shift(); sonarAlarma(); }
        if (!combustibleBajoVisible && combustible < COMBUSTIBLE * 0.3 && !alarma) {
          combustibleBajoVisible = true;
          const caja = $('.alarma-aterrizaje');
          caja.hidden = false;
          caja.innerHTML = '<b>⛽ COMBUSTIBLE BAJO</b><br>Esta alarma SÍ es seria: ¡aterriza ya!';
          efecto('alarma');
        }
        if (altura <= 0) { altura = 0; tocarSuelo(); }
        tiempoEnvio += dt;
        if (tiempoEnvio > 1 / 15) { tiempoEnvio = 0; conexion.enviarPosicion({ x: 0, y: +altura.toFixed(2), z: 0, ry: 0, v: +vel.toFixed(2), ap: 0, acc: encendido ? 'motor' : null, lander: 1 }); }
      }
      // Módulo y llama
      modulo.position.set(x, altura, 0);
      modulo.rotation.y += dt * 0.05;
      llama.visible = encendido && !tocado;
      llama.scale.setScalar(0.8 + Math.random() * 0.4);
      // Cámara: de costado, siguiendo al módulo
      // (se aleja con la altura para que siempre se vean el módulo, las rocas y la zona verde)
      const lejos = 18 + altura * 0.9;
      const medio = (x + padX) / 2;
      motor.camara.position.set(medio, Math.max(4, altura * 0.55), lejos);
      motor.camara.lookAt(medio, Math.max(1.5, altura * 0.45), 0);
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
      window.removeEventListener('keydown', teclaAlarma);
      window.removeEventListener('keydown', abajo);
      window.removeEventListener('keyup', arriba);
    }
  };
}

