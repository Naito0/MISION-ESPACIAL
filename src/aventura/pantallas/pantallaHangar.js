// =============================================================
// pantallaHangar.js — El HANGAR: la tripulación arma la nave.
// - Izquierda: la tienda con las categorías de MIS roles (solo compro lo mío).
// - Centro: la nave en 3D; cada pieza comprada aparece en ella.
// - Derecha: holograma con presupuesto compartido, masa vs capacidad
//   del cohete, energía (generada vs usada) y qué falta.
// - Cada jugador pulsa "¡Listo!". Si la nave no puede despegar, se explica por qué.
// =============================================================
import * as THREE from 'three';
import { crearLuces } from '../engine/luces.js';
import { cielo } from '../engine/decoracion.js';
import { nuevoEscenario, caja, cilindro, material } from '../engine/construccion.js';
import { NaveModelo } from '../entities/naveModelo.js';
import { crearAstronauta } from '../entities/fabricaAstronautas.js';
import { crearEtiqueta } from '../entities/AstronautaRemoto.js';
import { colorDeJugador } from './pantallaNave.js';
import { crearCatalogo } from '../../compartido/hangar.js';
import componentes from '../../data/componentes.json';
import configHangar from '../../data/hangar3d.json';
import { ROLES, colorRol } from '../datos3d.js';
import { efecto } from '../audio.js';

const CATALOGO = crearCatalogo(componentes, configHangar);
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
const nombreRol = (id) => ROLES.find((r) => r.id === id)?.nombre || id;

/** ctx = { motor, hud, conexionActiva, irA } */
export function iniciarPantallaHangar(ctx) {
  const { motor } = ctx;
  const conexion = ctx.conexionActiva;

  // ---- Escena: hangar con plataforma, grúas y la nave ----
  const esc = nuevoEscenario();
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x070b18);
  escena.fog = new THREE.Fog(0x070b18, 30, 70);
  crearLuces(escena, { sombras: motor.calidad.sombras, intensidad: 0.7, intensidadSol: 1.6, posicionSol: new THREE.Vector3(6, 14, 8) });
  escena.add(esc.raiz);
  caja(esc, 40, 0.2, 40, material(0x1a2238, { rugosidad: 0.8 }), 0, -0.1, 0, { solida: false });
  cilindro(esc, 4, 0.3, material(0x2a3350, { metal: 0.7, rugosidad: 0.3 }), 0, 0.15, 0, { solida: false, lados: 32 });
  const aro = new THREE.Mesh(new THREE.TorusGeometry(4, 0.05, 6, 64), new THREE.MeshStandardMaterial({ color: 0x3fd0ff, emissive: 0x3fd0ff, emissiveIntensity: 2 }));
  aro.rotation.x = Math.PI / 2; aro.position.y = 0.32;
  esc.visual.add(aro);
  // Paredes y torres de servicio
  for (const [x, z, w, d] of [[0, -16, 40, 0.5], [-16, 0, 0.5, 40], [16, 0, 0.5, 40]]) caja(esc, w, 14, d, material(0x232c47), x, 7, z, { solida: false });
  for (const s of [-1, 1]) {
    caja(esc, 0.5, 12, 0.5, material(0xffd166, { metal: 0.6 }), s * 9, 6, -9, { solida: false });
    caja(esc, 3, 0.3, 0.4, material(0xffd166, { metal: 0.6 }), s * 7.7, 9, -9, { solida: false });
  }
  // Focos que iluminan la nave desde varios lados
  for (const [x, z, c] of [[6, 6, 0xffffff], [-6, 4, 0x9dd0ff], [0, -7, 0xffe0b0]]) {
    const f = new THREE.PointLight(c, 60, 25);
    f.position.set(x, 7, z);
    escena.add(f);
  }
  for (let i = 0; i < 6; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(6, 0.15, 0.6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xcfe8ff, emissiveIntensity: 1.5 }));
    l.position.set(-10 + i * 4, 13.5, -4 + (i % 2) * 6);
    esc.visual.add(l);
  }
  cielo(esc, 400, 60);
  motor.cambiarEscena(escena);
  motor.camara.fov = 50;
  motor.camara.updateProjectionMatrix();

  const nave = new NaveModelo();
  nave.raiz.position.y = 0.3;
  escena.add(nave.raiz);
  // Holograma de capacidad: anillo que se llena según la masa
  const holo = new THREE.Mesh(new THREE.RingGeometry(4.5, 4.9, 64, 1, 0, Math.PI * 2), new THREE.MeshBasicMaterial({ color: 0x5be08a, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  holo.rotation.x = -Math.PI / 2; holo.position.y = 0.35;
  escena.add(holo);

  // Astronautas de la tripulación alrededor de la plataforma
  const tripulacion = [];
  conexion.estado.jugadores.forEach((j, i) => {
    const a = crearAstronauta(colorDeJugador(j));
    const ang = Math.PI * 0.75 + i * 0.5;
    a.raiz.position.set(Math.sin(ang) * 5.2, 0, Math.cos(ang) * 5.2);
    a.raiz.rotation.y = ang + Math.PI;
    const et = crearEtiqueta(j.nombre, colorDeJugador(j));
    et.position.y = 2.25;
    a.raiz.add(et);
    escena.add(a.raiz);
    tripulacion.push({ id: j.id, a });
  });

  // ---- Interfaz ----
  const ui = document.createElement('div');
  ui.innerHTML = `
    <div class="panel tienda"></div>
    <div class="panel holograma"></div>
    <div class="panel titulo">🛠 Hangar</div>`;
  ctx.hud.appendChild(ui);
  const tienda = ui.querySelector('.tienda');
  const holograma = ui.querySelector('.holograma');
  let mensajeError = '';

  const barra = (valor, max, colorOk, texto) => {
    const f = Math.min(1, valor / Math.max(1, max));
    const color = valor > max ? '#e5484d' : colorOk;
    return `<div class="hg-dato"><span>${texto}</span><b>${valor} / ${max}</b></div><div class="hg-barra"><div style="width:${f * 100}%;background:${color}"></div></div>`;
  };

  function dibujar(e) {
    const yo = e.jugadores.find((j) => j.id === conexion.id);
    const misRoles = yo ? yo.roles : [];
    const r = e.resumen;
    const destino = e.destinoId === 'luna' ? 'la Luna' : 'Marte';
    // Tienda: solo las categorías de mis roles
    tienda.innerHTML = `<h2>Tienda de piezas</h2><p class="sub">Viajamos a <b>${destino}</b>. Toca una pieza para comprarla; tócala otra vez para devolverla.</p>` +
      CATALOGO.filter((c) => misRoles.includes(c.rol)).map((c) => {
        const elegidas = e.seleccion[c.id] || [];
        return `<div class="categoria" style="border-color:${hex(colorRol(ROLES.find((x) => x.id === c.rol)))}">
          <h3>${c.icono} ${c.nombre} ${elegidas.length ? '✅' : '<span class="falta">falta</span>'}</h3>
          <div class="opciones">${c.opciones.map((o) => `
            <button class="opcion ${elegidas.includes(o.id) ? 'elegida' : ''}" data-op="${o.id}" title="${o.tooltip}">
              <b>${o.nombre}</b><span>${o.costo} M$ · ${o.masa} kg${o.energia ? ` · ${o.energia > 0 ? '+' : ''}${o.energia} W` : ''}</span>
              <small>${o.tooltip}</small>
            </button>`).join('')}</div></div>`;
      }).join('');
    tienda.querySelectorAll('[data-op]').forEach((b) => {
      b.onclick = async () => {
        const res = await conexion.accion('comprar', { opcion: b.dataset.op });
        if (res.error) { efecto('error'); mensajeError = res.error; dibujar(conexion.estado); }
        else { efecto(res.quitada ? 'clic' : 'compra'); mensajeError = ''; }
      };
    });
    // Holograma: números de la nave
    if (r) {
      const listo = e.listos.includes(conexion.id);
      holograma.innerHTML = `
        <h2>📊 Holograma de la nave</h2>
        ${barra(r.costo, r.presupuesto, '#ffd166', '💰 Presupuesto (M$)')}
        ${barra(r.masa, r.capacidad, '#5be08a', '⚖ Masa vs. cohete (kg)')}
        ${barra(r.consumo, r.generacion, '#7cc4ff', `⚡ Energía usada / generada (W)${r.factorSolar < 1 ? ` · sol al ${Math.round(r.factorSolar * 100)}%` : ''}`)}
        <h3>Protecciones para el viaje</h3>
        <div class="protecciones">${Object.entries({ blindaje: '🧱 Blindaje', motor: '🔥 Motor fuerte', energia: '⚡ Energía de sobra', reciclador: '🫁 Reciclador O₂', laboratorio: '🔬 Laboratorio', antena: '📡 Antena', computadora: '💻 Computadora' })
          .map(([k, n]) => `<span class="${r.diseno[k] ? 'si' : 'no'}">${n}</span>`).join('')}</div>
        <p class="nota">Lo que no esté protegido hará que esas emergencias salgan más seguido y dañen más.</p>
        ${r.problemas.length ? `<h3>⚠ Antes de despegar</h3><ul class="problemas">${r.problemas.map((p) => `<li>${p.rol ? `<b>${nombreRol(p.rol)}:</b> ` : ''}${p.texto}</li>`).join('')}</ul>` : '<p class="ok">✅ ¡La nave puede despegar!</p>'}
        <h3>Tripulación</h3>
        <ul class="listos">${e.jugadores.map((j) => `<li>${e.listos.includes(j.id) ? '✅' : '⏳'} ${j.nombre}</li>`).join('')}</ul>
        <button id="listo" class="${listo ? 'activo' : ''}">${listo ? '✋ Ya no estoy listo' : '🚀 ¡Listo!'}</button>
        <p class="error">${mensajeError}</p>`;
      holograma.querySelector('#listo').onclick = async () => {
        const res = await conexion.accion('listo');
        if (res.error) { efecto('error'); mensajeError = `${res.error} ${(res.problemas || []).join(' ')}`; dibujar(conexion.estado); }
        else efecto('clic');
      };
      holo.material.color.setHex(r.masa > r.capacidad ? 0xe5484d : 0x5be08a);
      holo.geometry.dispose();
      holo.geometry = new THREE.RingGeometry(4.5, 4.9, 64, 1, 0, Math.max(0.01, Math.min(1, r.masa / r.capacidad)) * Math.PI * 2);
    }
    nave.sincronizar(e.seleccion);
    // Los astronautas que están listos saludan
    tripulacion.forEach((t) => { t.listo = e.listos.includes(t.id); });
  }

  const quitarEstado = conexion.alEstado((e) => {
    if (e.fase !== 'hangar') { ctx.irA('juego'); return; }
    dibujar(e);
  });
  dibujar(conexion.estado);

  return {
    nave,
    actualizar(dt, t) {
      const ang = t * 0.12;
      motor.camara.position.set(Math.sin(ang) * 15, 7.5, Math.cos(ang) * 15);
      motor.camara.lookAt(0, 3.4, 0);
      nave.actualizar(dt);
      aro.material.emissiveIntensity = 1.5 + Math.sin(t * 2) * 0.5;
      holo.material.opacity = 0.45 + Math.sin(t * 3) * 0.15;
      for (const tr of tripulacion) {
        if (tr.listo) tr.a.mantener('interactuar');
        tr.a.actualizar(dt, { velocidad: 0, apoyado: true, velocidadVertical: 0, giro: 0 });
      }
    },
    salir() { ui.remove(); quitarEstado(); }
  };
}
