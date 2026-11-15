// =============================================================
// pantallaInforme.js — INFORME de la misión.
// - De fondo: la nave (con las piezas compradas) orbitando el destino si
//   llegó, o dando vueltas sin control con humo si fracasó.
// - Panel: estrellas, créditos, puntaje, causas → efectos y una misión real
//   de la NASA parecida (con su fuente).
// - El progreso se guarda en el navegador (localStorage) del ANFITRIÓN.
// =============================================================
import * as THREE from 'three';
import { cielo } from '../engine/decoracion.js';
import { nuevoEscenario } from '../engine/construccion.js';
import { NaveModelo } from '../entities/naveModelo.js';
import { DESTINOS } from '../datos3d.js';
import { efecto } from '../audio.js';
import { CONCEPTOS } from '../aprendizaje.js';
import { resumenAprendizaje } from '../../compartido/resumenAprendizaje.js';
import { recomendaciones } from '../../compartido/recomendaciones.js';
import { crearCatalogo, resumenDiseno } from '../../compartido/hangar.js';
import datosAprendizaje from '../../data/aprendizaje.json';
import dificultadJSON from '../../data/dificultad.json';
import emergenciasJSON from '../../data/emergencias3d.json';
import { estrellasMision } from '../../compartido/logros.js';
import { elegirPreguntas, prepararPregunta } from '../../compartido/preguntas.js';
import preguntasJSON from '../../data/preguntas.json';
import { LOGROS, CONFIG_ESTRELLAS } from '../logros.js';
import componentes from '../../data/componentes.json';
import configHangar from '../../data/hangar3d.json';

const CATALOGO = crearCatalogo(componentes, configHangar);

const CLAVE = 'misionEspacial.progreso3d';

/** Progreso de la tripulación (solo en la computadora del anfitrión). */
export function leerProgreso3d() {
  try { return { creditos: 0, misiones: [], mejorPuntaje: 0, ...JSON.parse(localStorage.getItem(CLAVE) || '{}') }; }
  catch { return { creditos: 0, misiones: [], mejorPuntaje: 0 }; }
}

function guardarInforme(inf) {
  const p = leerProgreso3d();
  if (p.misiones.some((m) => m.id === inf.id)) return p; // ya guardado
  p.creditos += inf.creditos;
  p.mejorPuntaje = Math.max(p.mejorPuntaje, inf.puntaje);
  p.misiones.push({ id: inf.id, destino: inf.destinoId, exito: inf.exito, puntaje: inf.puntaje, estrellas: inf.estrellas, fecha: new Date().toISOString().slice(0, 10) });
  if (p.misiones.length > 30) p.misiones.shift();
  try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch { /* sin almacenamiento: no pasa nada */ }
  return p;
}

/** ctx = { motor, hud, conexionActiva, irA } */
export function iniciarPantallaInforme(ctx) {
  const { motor } = ctx;
  const conexion = ctx.conexionActiva;
  const e = conexion.estado;
  const inf = e.informe;
  const destino = DESTINOS.find((d) => d.id === e.destinoId);

  // ---- Escena ----
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x01020a);
  const esc = nuevoEscenario();
  cielo(esc, 1200, 150);
  escena.add(esc.raiz);
  escena.add(new THREE.AmbientLight(0x5060a0, 0.6));
  const sol = new THREE.DirectionalLight(0xfff2d0, 2.4);
  sol.position.set(-20, 10, 15);
  escena.add(sol);
  const planeta = new THREE.Mesh(new THREE.SphereGeometry(9, 48, 32), new THREE.MeshStandardMaterial({ color: destino ? destino.color : '#888', roughness: 0.95, flatShading: true }));
  planeta.position.set(6, -4, -18);
  escena.add(planeta);
  const nave = new NaveModelo();
  nave.sincronizar(e.seleccion || {});
  nave.piezas.forEach((p) => { p.t = 1; p.grupo.scale.setScalar(1); });
  nave.raiz.scale.setScalar(0.45);
  escena.add(nave.raiz);
  // Humo (tenue) si fracasó
  let humo = null;
  if (!inf.exito) {
    const n = 60;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    humo = { puntos: new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x777777, size: 0.35, transparent: true, opacity: 0.3, depthWrite: false })), semillas: Array.from({ length: n }, () => Math.random()) };
    escena.add(humo.puntos);
  }
  motor.cambiarEscena(escena);
  motor.camara.fov = 50;
  motor.camara.updateProjectionMatrix();
  motor.camara.position.set(-6, 2, 9);
  motor.camara.lookAt(2, -1, -6);

  // ---- Panel del informe ----
  const yo = e.jugadores.find((j) => j.id === conexion.id);
  const soyAnfitrion = !!(yo && yo.anfitrion);
  const progreso = soyAnfitrion ? guardarInforme(inf) : null;
  // La primera misión a la Luna era el tutorial: queda marcado como hecho
  if (e.destinoId === 'luna' && ctx.guia?.activo) ctx.guia.terminar();
  // "Hoy aprendiste 3 cosas": los 3 conceptos de la misión conectados con lo que pasó
  const resumenHangar = resumenDiseno(e.seleccion || {}, CATALOGO, destino, configHangar);
  const zonas = recomendaciones(e.seleccion || {}, CATALOGO, destino, resumenHangar);
  const estados = Object.fromEntries(Object.entries(zonas).map(([k, z]) => [k, z.estado]));
  const resumen = resumenAprendizaje({
    destino, diseno: inf.diseno || e.diseno || {}, aterrizaje: inf.aterrizaje, muestras: inf.muestras || 0,
    registro: e.viaje ? e.viaje.registro : [], estados,
    prediccion: ctx.prediccion && ctx.prediccion.destinoId === destino.id ? ctx.prediccion.acerto : undefined
  }, datosAprendizaje);
  // 3 preguntas rápidas al azar del destino (preguntas.json), sin repetir las de la partida
  // anterior y con las opciones MEZCLADAS (la correcta no está siempre en el mismo lugar)
  const CLAVE_PREG = `misionEspacial.preguntasUltimas.${destino.id}`;
  let anteriores = [];
  try { anteriores = JSON.parse(localStorage.getItem(CLAVE_PREG) || '[]'); } catch { /* sin almacenamiento */ }
  const preguntas = elegirPreguntas(preguntasJSON[destino.id] || [], 3, anteriores).map((p) => prepararPregunta(p));
  try { localStorage.setItem(CLAVE_PREG, JSON.stringify(preguntas.map((p) => p.id))); } catch { /* sin almacenamiento */ }
  const ui = document.createElement('div');
  ui.className = 'panel informe';
  // ---- Estrellas y medallas ----
  // Tiempo: promedio de segundos para resolver las emergencias ÷ tiempo disponible
  const limite = (dificultadJSON.niveles[e.nivel] || {}).tiempoParaResolver || emergenciasJSON.config.tiempoParaResolver;
  const resueltasConTiempo = (e.viaje ? e.viaje.registro : []).filter((r) => r.resultado === 'resuelta' && r.segundos !== undefined);
  const fraccionTiempo = resueltasConTiempo.length ? resueltasConTiempo.reduce((s, r) => s + r.segundos, 0) / resueltasConTiempo.length / limite : 0;
  // Impactos: golpes en el minijuego de esquivar + emergencias de micrometeoritos sin resolver
  const impactos = (ctx.logros?.stats.golpes || 0) + (e.viaje ? e.viaje.registro : []).filter((r) => r.id === 'meteoritos' && r.resultado === 'fallida').length;
  const presupuestoReal = Math.round(configHangar.presupuesto[destino.id] * ((dificultadJSON.niveles[e.nivel] || {}).factorPresupuesto ?? 1));
  const datosLogros = {
    exito: inf.exito, destinoId: destino.id, vida: inf.vida, estados, costo: resumenHangar.costo, presupuesto: presupuestoReal,
    impactos, fraccionTiempo, aciertos: 0, aprendidos: ctx.aprendizaje?.cantidad || 0, totalConceptos: ctx.aprendizaje?.total || 0
  };
  const estrellasHtml = (n) => '⭐'.repeat(n) + '☆'.repeat(3 - n);
  const estrellas = estrellasHtml(estrellasMision(datosLogros, CONFIG_ESTRELLAS));
  const listaLogros = () => {
    const ids = ctx.logros ? ctx.logros.deEstaMision : [];
    return ids.length ? ids.map((id) => { const l = LOGROS.find((x) => x.id === id); return `<span class="logro-chip">${l.icono} ${l.nombre}</span>`; }).join('') : '<small>Ninguna nueva en esta misión. Mira las pistas en la Sala de trofeos (menú Esc).</small>';
  };
  ui.innerHTML = `
    <h1>${inf.exito ? '📋 ¡Misión cumplida!' : '📋 Informe: misión fallida'}</h1>
    <div class="estrellas">${estrellas}</div>
    <small class="estrellas-nota">⭐ misión cumplida · ⭐ vida ≥ ${CONFIG_ESTRELLAS.vidaMinima} · ⭐ rapidez o preguntas (las que respondes con 💡 pista no suman)</small>
    <h3>🏅 Medallas de esta misión</h3>
    <div class="logros-mision"></div>
    <div class="cifras">
      <div><span>Créditos</span><b>+${inf.creditos}</b></div>
      <div><span>Puntaje</span><b>${inf.puntaje}</b></div>
      <div><span>Vida de la nave</span><b>${inf.vida}</b></div>
      <div><span>Emergencias</span><b>✅ ${inf.resueltas} · ❌ ${inf.fallidas}</b></div>
    </div>
    <h3>💡 Hoy aprendiste 3 cosas</h3>
    <ul class="causas aprendido">${resumen.map((f) => `<li class="bien"><span class="ap-icono">${f.icono}</span> <b>${f.titulo}:</b> ${f.texto}</li>`).join('')}</ul>
    <h3>❓ 3 preguntas rápidas</h3>
    <div class="repaso">${preguntas.map((p, i) => `<div class="pregunta" data-q="${i}"><p><b>${i + 1}. ${p.texto}</b></p>
      <div class="fila">${p.opciones.map((o) => `<button class="boton respuesta" data-id="${o.id}">${o.texto}</button>`).join('')}</div><button class="secundario pista">💡 Pista</button><p class="texto-pista"></p><p class="explicacion"></p></div>`).join('')}
      <p class="resultado-repaso"></p></div>
    <h3>Causas y efectos</h3>
    <ul class="causas">${inf.causas.map((c) => `<li class="${c.tipo}"><b>${c.tipo === 'bien' ? '👍' : '⚠'} ${c.causa}</b> → ${c.efecto}</li>`).join('') || '<li>Viaje tranquilo, sin sorpresas.</li>'}</ul>
    ${inf.mision ? `<h3>🚀 Una misión real parecida</h3>
      <div class="mision-real"><b>${inf.mision.nombre}</b> (${inf.mision.lanzamiento}) · ${inf.mision.tipo}<br>${inf.mision.descripcion}<br>
      <small>Fuente: <a href="${inf.mision.fuente}" target="_blank" rel="noopener">${inf.mision.fuente}</a></small></div>` : ''}
    ${progreso ? `<p class="progreso">Créditos acumulados: <b>${progreso.creditos}</b> · misiones: ${progreso.misiones.length} · mejor puntaje: ${progreso.mejorPuntaje} · conceptos: ${ctx.aprendizaje?.cantidad ?? 0} de ${CONCEPTOS.length}</p>` : ''}
    ${soyAnfitrion ? '<button id="volver">🛠 Volver al hangar y mejorar la nave</button>' : '<p class="nota">Esperando al anfitrión…</p>'}`;
  ctx.hud.appendChild(ui);
  ctx.logros?.revisar(datosLogros);
  ui.querySelector('.logros-mision').innerHTML = listaLogros();
  // Preguntas: un toque, respuesta inmediata con explicación; el resultado va al diario
  let respondidas = 0;
  let aciertos = 0;
  let aciertosSinPista = 0; // la pista no quita la respuesta, pero esa pregunta no suma estrellas
  ui.querySelectorAll('.pregunta').forEach((div) => {
    const p = preguntas[div.dataset.q];
    let usoPista = false;
    div.querySelector('.pista').onclick = (ev) => {
      usoPista = true; ev.target.disabled = true; efecto('clic');
      div.querySelector('.texto-pista').textContent = `💡 ${p.pista}`;
    };
    div.querySelectorAll('.respuesta').forEach((b) => {
      b.onclick = () => {
        const bien = p.opciones.find((o) => o.id === b.dataset.id).correcta; // por id, no por posición
        div.querySelector('.pista').disabled = true;
        div.querySelectorAll('.respuesta').forEach((x) => { x.disabled = true; x.classList.toggle('correcta', p.opciones.find((o) => o.id === x.dataset.id).correcta); });
        if (!bien) b.classList.add('incorrecta');
        div.querySelector('.explicacion').innerHTML = `${bien ? '✅ ¡Correcto!' : '❌ Casi.'} ${p.explicacion}`;
        efecto(bien ? 'exito' : 'error');
        respondidas++;
        if (bien) aciertos++;
        if (bien && !usoPista) aciertosSinPista++;
        if (respondidas === preguntas.length) {
          ctx.aprendizaje?.guardarRepaso(destino.id, aciertos, preguntas.length);
          ui.querySelector('.resultado-repaso').innerHTML = `🎯 <b>${aciertos} de ${preguntas.length}</b> · guardado en "Lo que aprendí"`;
          window.dispatchEvent(new CustomEvent('repaso-terminado', { detail: { aciertos, total: preguntas.length, destinoId: destino.id } }));
          // Las preguntas también cuentan para las estrellas y las medallas
          const conPreguntas = { ...datosLogros, aciertos: aciertosSinPista, aprendidos: ctx.aprendizaje?.cantidad || 0 };
          ctx.logros?.revisar(conPreguntas);
          ui.querySelector('.estrellas').textContent = estrellasHtml(estrellasMision(conPreguntas, CONFIG_ESTRELLAS));
          ui.querySelector('.logros-mision').innerHTML = listaLogros();
        }
      };
    });
  });
  const volver = ui.querySelector('#volver');
  if (volver) volver.onclick = () => conexion.accion('reiniciar');
  efecto(inf.exito ? 'exito' : 'error');

  const quitarEstado = conexion.alEstado((x) => { if (x.fase !== 'informe') ctx.irA('juego'); });

  return {
    actualizar(dt, t) {
      planeta.rotation.y += dt * 0.05;
      if (inf.exito) {
        // Órbita tranquila alrededor del destino
        // La nave flota delante del planeta, girando despacio (en órbita)
        nave.raiz.position.set(-1.5 + Math.sin(t * 0.3) * 0.6, 0.2 + Math.sin(t * 0.8) * 0.2, -3.5);
        nave.raiz.rotation.set(0.3, t * 0.4, Math.PI / 2.4);
      } else {
        // Sin control: gira y se aleja con humo
        nave.raiz.position.set(-1 + Math.sin(t * 0.3) * 0.5, Math.cos(t * 0.4) * 0.5, -4 - t * 0.05);
        nave.raiz.rotation.set(t * 1.3, t * 0.7, t * 0.9);
        const arr = humo.puntos.geometry.attributes.position.array;
        humo.semillas.forEach((s, i) => {
          const k = (t * 0.4 + s) % 1;
          arr[i * 3] = nave.raiz.position.x + Math.sin(s * 50) * k * 2;
          arr[i * 3 + 1] = nave.raiz.position.y + Math.cos(s * 70) * k * 2;
          arr[i * 3 + 2] = nave.raiz.position.z + k * 3;
        });
        humo.puntos.geometry.attributes.position.needsUpdate = true;
      }
    },
    salir() { ui.remove(); quitarEstado(); }
  };
}
