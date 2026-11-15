// =============================================================
// pantallaHangar.js — El HANGAR: la tripulación arma la nave.
// - Izquierda: la tienda con las categorías de MIS roles (solo compro lo mío).
// - Centro: la nave en 3D; cada pieza comprada aparece en ella.
// - Derecha: holograma con presupuesto compartido, masa vs capacidad
//   del cohete, energía (generada vs usada) y qué falta.
// - Cada jugador pulsa "¡Listo!". Si la nave no puede despegar, se explica por qué.
// - Cada categoría tiene una barra Mínimo / Recomendado / Exagerado según el
//   destino (compartido/recomendaciones.js). Al pasar el mouse sobre una pieza
//   se ve cómo cambiarían las barras, y un consejo explica el porqué.
// =============================================================
import * as THREE from 'three';
import { crearLuces } from '../engine/luces.js';
import { cielo } from '../engine/decoracion.js';
import { nuevoEscenario, caja, cilindro, material } from '../engine/construccion.js';
import { NaveModelo } from '../entities/naveModelo.js';
import { crearAstronauta } from '../entities/fabricaAstronautas.js';
import { crearEtiqueta } from '../entities/AstronautaRemoto.js';
import { colorDeJugador } from './pantallaNave.js';
import { crearCatalogo, resumenDiseno } from '../../compartido/hangar.js';
import { recomendaciones, dependencias } from '../../compartido/recomendaciones.js';
import componentes from '../../data/componentes.json';
import configHangar from '../../data/hangar3d.json';
import { ROLES, DESTINOS, colorRol } from '../datos3d.js';
import { efecto } from '../audio.js';
import { mostrarPrediccion, mostrarTarjeta } from '../ui/tarjetas.js';
import { CONCEPTOS, PREDICCIONES } from '../aprendizaje.js';

const CATALOGO = crearCatalogo(componentes, configHangar);
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

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
    const a = crearAstronauta(colorDeJugador(j), j.personaje || (conexion.estado?.personajesPorRol || {})[j.roles[0]]);
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

  // ---- Barras del holograma (con vista previa: "valor actual → valor si compras") ----
  const barra = (valor, max, colorOk, texto, nuevo = null) => {
    const f = Math.min(1, valor / Math.max(1, max));
    const color = valor > max ? '#e5484d' : colorOk;
    const fn = nuevo === null ? null : Math.min(1, nuevo / Math.max(1, max));
    const cambio = nuevo === null || nuevo === valor ? '' : ` <span class="previa ${nuevo > max ? 'mal' : ''}">→ ${nuevo}</span>`;
    return `<div class="hg-dato"><span>${texto}</span><b>${valor}${cambio} / ${max}</b></div>
      <div class="hg-barra">${fn !== null ? `<div class="fantasma" style="width:${fn * 100}%"></div>` : ''}<div style="width:${f * 100}%;background:${color}"></div></div>`;
  };

  // ---- Barra de recomendación de una categoría: rojo / verde / amarillo y marcador ----
  const ESTADO_TXT = { vacio: '⚪ Elige una pieza', bajo: '🔴 Debajo del mínimo', justo: '🟢 Alcanza, sin margen', ok: '🟢 Recomendado', exagerado: '🟡 Exagerado' };
  function posicion(z, v) {
    if (z.tipo === 'nivel') return (v + 0.5) / (z.max + 1);
    return Math.min(1, v / z.max);
  }
  function limite(z, v) { // dónde empieza cada zona (0 a 1)
    if (z.tipo === 'nivel') return Math.min(1, v / (z.max + 1));
    return Math.min(1, v / z.max);
  }
  function barraCategoria(z, previa = null) {
    const rojo = limite(z, z.min) * 100;
    const amarillo = limite(z, z.exag) * 100;
    const rec = limite(z, z.rec) * 100;
    const marca = (v, clase) => (v === null || v === undefined ? '' : `<div class="${clase}" style="left:${posicion(z, v) * 100}%"></div>`);
    const etiquetas = z.tipo === 'nivel' && z.etiquetas ? `<div class="zb-etiquetas">${z.etiquetas.map((t) => `<span>${t}</span>`).join('')}</div>` : '';
    const numeros = z.tipo === 'numero'
      ? `<small>${z.valor !== null ? `Tienes ${Math.round(z.valor)} · ` : ''}mín. ${Math.round(z.min)} · rec. ${Math.round(z.rec)} ${z.unidad}</small>` : '';
    return `<div class="zona-barra">
        <div class="zb-fondo" style="background:linear-gradient(90deg,#b8323a 0 ${rojo}%,#2f9e5b ${rojo}% ${amarillo}%,#c9a227 ${amarillo}% 100%)">
          <div class="zb-rec" style="left:${rec}%"></div>${marca(previa, 'zb-previa')}${marca(z.valor, 'zb-marca')}
        </div>${etiquetas}
        <div class="zb-estado">${ESTADO_TXT[z.estado]} ${numeros}</div>
      </div>`;
  }

  let catFoco = null;     // categoría de la que habla el consejo
  let consejoExtra = '';  // consecuencia de la última compra
  const textoConsejo = (cat, z, extra = '') => {
    if (!z) return 'Pasa el mouse sobre una pieza y te explico si conviene para este destino.';
    const nombre = CATALOGO.find((c) => c.id === cat)?.nombre || '';
    const recom = z.recomendadas.length ? ` Te recomiendo: <b>${z.recomendadas.join(' o ')}</b>.` : '';
    return `<b>${nombre}:</b> ${z.porQue}${recom}${extra ? `<br>${extra}` : ''}`;
  };

  /** Selección "de prueba": cómo quedaría si tocas esta pieza (igual que la regla de compra). */
  function seleccionSi(seleccion, idOpcion) {
    const cat = CATALOGO.find((c) => c.opciones.some((o) => o.id === idOpcion));
    const actual = seleccion[cat.id] || [];
    let nueva;
    if (cat.multiple) nueva = actual.includes(idOpcion) ? actual.filter((x) => x !== idOpcion) : [...actual, idOpcion].slice(0, cat.maximo || 99);
    else nueva = actual[0] === idOpcion ? [] : [idOpcion];
    return { cat, prueba: { ...seleccion, [cat.id]: nueva } };
  }

  /** Consecuencia de una elección, en una frase. */
  function consecuencia(z, opcion) {
    if (z.estado === 'bajo') return `⚠ ${z.bajo || 'Por debajo de lo necesario para este destino.'}`;
    if (z.estado === 'exagerado') return `🟡 Exagerado: ${opcion ? `suma ${opcion.masa} kg y ${opcion.costo} M$` : 'suma masa y costo'} sin mejorar la misión.`;
    if (z.estado === 'justo') return 'Alcanza, pero sin margen de seguridad.';
    if (z.estado === 'ok') return '✅ Buena elección para este destino.';
    return '';
  }

  function dibujar(e) {
    const yo = e.jugadores.find((j) => j.id === conexion.id);
    const misRoles = yo ? [...yo.roles, ...(e.bots || [])] : []; // los míos y los de los bots
    const r = e.resumen;
    const destino = e.destinoId === 'luna' ? 'la Luna' : 'Marte';
    const destinoObj = DESTINOS.find((d) => d.id === e.destinoId);
    // Configuración con el presupuesto de la dificultad elegida (para la vista previa)
    const config = { ...configHangar, presupuesto: { ...configHangar.presupuesto, [e.destinoId]: r ? r.presupuesto : 0 } };
    const rec = r ? recomendaciones(e.seleccion, CATALOGO, destinoObj, r) : {};
    const deps = r ? dependencias(e.seleccion, CATALOGO, destinoObj, r) : [];
    const scroll = tienda.scrollTop; // que la tienda no salte arriba al comprar
    // Tienda: solo las categorías de mis roles, cada una con su barra mínimo/recomendado/exagerado
    tienda.innerHTML = `<h2>Tienda de piezas</h2><p class="sub">Viajamos a <b>${destino}</b>. Toca una pieza para comprarla; otra vez para devolverla.</p>` +
      CATALOGO.filter((c) => misRoles.includes(c.rol)).map((c) => {
        const elegidas = e.seleccion[c.id] || [];
        return `<div class="categoria" data-cat="${c.id}" style="border-color:${hex(colorRol(ROLES.find((x) => x.id === c.rol)))}">
          <h3>${c.icono} ${c.nombre} ${elegidas.length ? '✅' : '<span class="falta">falta</span>'}</h3>
          <div class="cat-barra">${rec[c.id] ? barraCategoria(rec[c.id]) : ''}</div>
          <div class="opciones">${c.opciones.map((o) => `
            <button class="opcion ${elegidas.includes(o.id) ? 'elegida' : ''} ${rec[c.id]?.recomendadas.includes(o.nombre) ? 'sugerida' : ''}" data-op="${o.id}">
              <b>${o.nombre}</b><span>${o.costo} M$ · ${o.masa} kg${o.energia ? ` · ${o.energia > 0 ? '+' : ''}${o.energia} W` : ''}</span>
              <small>${o.tooltip}</small>
            </button>`).join('')}</div></div>`;
      }).join('');
    tienda.scrollTop = scroll;

    // Vista previa al pasar el mouse: cómo cambiarían la masa, la energía, el dinero y la barra
    const vistaPrevia = (idOpcion) => {
      if (!r) return;
      if (!idOpcion) {
        holograma.querySelector('.hg-barras').innerHTML = barrasHolograma(r, null);
        holograma.querySelector('.consejo-txt').innerHTML = textoConsejo(catFoco, rec[catFoco], consejoExtra);
        tienda.querySelectorAll('.categoria').forEach((div) => { const z = rec[div.dataset.cat]; if (z) div.querySelector('.cat-barra').innerHTML = barraCategoria(z); });
        return;
      }
      const { cat, prueba } = seleccionSi(e.seleccion, idOpcion);
      const r2 = resumenDiseno(prueba, CATALOGO, destinoObj, config);
      const rec2 = recomendaciones(prueba, CATALOGO, destinoObj, r2);
      holograma.querySelector('.hg-barras').innerHTML = barrasHolograma(r, r2);
      const z2 = rec2[cat.id];
      const div = tienda.querySelector(`.categoria[data-cat="${cat.id}"]`);
      if (z2 && div) div.querySelector('.cat-barra').innerHTML = barraCategoria(rec[cat.id], z2.valor);
      const opcion = cat.opciones.find((o) => o.id === idOpcion);
      catFoco = cat.id;
      if (z2) holograma.querySelector('.consejo-txt').innerHTML = textoConsejo(cat.id, z2, `Con <b>${opcion.nombre}</b>: ${consecuencia(z2, opcion)}`);
    };
    tienda.querySelectorAll('[data-op]').forEach((b) => {
      b.onmouseenter = () => vistaPrevia(b.dataset.op);
      b.onmouseleave = () => vistaPrevia(null);
      b.onclick = async () => {
        const id = b.dataset.op;
        const res = await conexion.accion('comprar', { opcion: id });
        if (res.error) { efecto('error'); mensajeError = res.error; dibujar(conexion.estado); return; }
        efecto(res.quitada ? 'clic' : 'compra');
        mensajeError = '';
        // Se puede comprar fuera de lo recomendado: el consejo explica la consecuencia
        const e2 = conexion.estado;
        const rNuevo = recomendaciones(e2.seleccion, CATALOGO, destinoObj, e2.resumen);
        const cat = CATALOGO.find((c) => c.opciones.some((o) => o.id === id));
        catFoco = cat.id;
        consejoExtra = res.quitada ? '' : consecuencia(rNuevo[cat.id], cat.opciones.find((o) => o.id === id));
        // Elegir paneles, baterías o control térmico enseña un concepto
        if (!res.quitada) ctx.aprendizaje?.evento(`hangar:${cat.id}`, e.destinoId);
        dibujar(e2);
      };
    });

    // Holograma: números de la nave, consejero y avisos
    if (r) {
      const listo = e.listos.includes(conexion.id);
      const varios = e.jugadores.length > 1;
      holograma.innerHTML = `
        <h2>📊 Holograma de la nave</h2>
        <div class="hg-barras">${barrasHolograma(r, null)}</div>
        <button id="listo" class="${listo ? 'activo' : ''}">${listo ? '✋ Ya no estoy listo' : '🚀 ¡Listo!'}</button>
        <p class="error">${mensajeError}</p>
        <div class="consejo"><span class="consejo-icono">💡</span><div class="consejo-txt">${textoConsejo(catFoco, rec[catFoco], consejoExtra)}</div></div>
        ${deps.length ? `<h3>🔗 Ojo</h3><ul class="problemas">${deps.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
        ${r.problemas.length ? `<h3>⚠ Antes de despegar</h3><ul class="problemas">${r.problemas.map((p) => `<li>${p.texto}</li>`).join('')}</ul>` : '<p class="ok">✅ ¡La nave puede despegar!</p>'}
        <h3>Protecciones para el viaje</h3>
        <div class="protecciones">${Object.entries({ blindaje: '🧱 Blindaje', motor: '🔥 Motor fuerte', energia: '⚡ Energía de sobra', reciclador: '🫁 Reciclador O₂', laboratorio: '🔬 Laboratorio', antena: '📡 Antena', computadora: '💻 Computadora' })
          .map(([k, n]) => `<span class="${r.diseno[k] ? 'si' : 'no'}">${n}</span>`).join('')}</div>
        <p class="nota">Lo que no esté protegido hará que esas emergencias salgan más seguido y dañen más.</p>
        ${varios ? `<h3>Tripulación</h3><ul class="listos">${e.jugadores.map((j) => `<li>${e.listos.includes(j.id) ? '✅' : '⏳'} ${j.nombre}</li>`).join('')}</ul>` : ''}
        ${yo && yo.anfitrion ? '<button id="cambiarDestino" class="secundario">🪐 Cambiar destino</button>' : ''}`;
      const cambiar = holograma.querySelector('#cambiarDestino');
      if (cambiar) cambiar.onclick = () => conexion.accion('cambiarDestino');
      holograma.querySelector('#listo').onclick = async () => {
        const res = await conexion.accion('listo');
        if (res.error) { efecto('error'); mensajeError = `${res.error} ${(res.problemas || []).join(' ')}`; dibujar(conexion.estado); }
        else { efecto('clic'); ctx.aprendizaje?.evento('hangar:listo', e.destinoId); }
      };
      // Guía: cuando no falta ninguna categoría, pasa al paso "¡Listo!"
      if (!r.problemas.some((p) => p.texto.startsWith('Falta elegir'))) ctx.guia?.evento('completo');
      holo.material.color.setHex(r.masa > r.capacidad ? 0xe5484d : 0x5be08a);
      holo.geometry.dispose();
      holo.geometry = new THREE.RingGeometry(4.5, 4.9, 64, 1, 0, Math.max(0.01, Math.min(1, r.masa / r.capacidad)) * Math.PI * 2);
    }
    nave.sincronizar(e.seleccion);
    // Los astronautas que están listos saludan
    tripulacion.forEach((t) => { t.listo = e.listos.includes(t.id); });
  }

  /** Las 3 barras principales; r2 = cómo quedarían con la pieza bajo el mouse. */
  function barrasHolograma(r, r2) {
    return `${barra(r.costo, r.presupuesto, '#ffd166', '💰 Dinero (M$)', r2 ? r2.costo : null)}
      ${barra(r.masa, r.capacidad, '#5be08a', '⚖ Masa / cohete (kg)', r2 ? r2.masa : null)}
      ${barra(r.consumo, r.generacion, '#7cc4ff', `⚡ Energía usa / genera (W)`, r2 ? r2.consumo : null)}
      ${r2 && r2.generacion !== r.generacion ? `<small class="previa">Los paneles darían ${r2.generacion} W${r.factorSolar < 1 ? ` (sol al ${Math.round(r.factorSolar * 100)}%)` : ''}</small>` : ''}`;
  }

  const quitarEstado = conexion.alEstado((e) => {
    if (e.fase !== 'hangar') { ctx.irA('juego'); return; }
    dibujar(e);
  });
  dibujar(conexion.estado);

  // Mostrarlo en el mundo: en Marte los paneles de la nave brillan menos (llega menos luz)
  const destinoHangar = DESTINOS.find((d) => d.id === conexion.estado.destinoId);
  nave.luzSolar = destinoHangar?.juego?.factorSolar ?? 1;

  // Una misión nueva: sus 3 conceptos se pueden enseñar otra vez.
  // PREDECIR ANTES DE ACTUAR: una pregunta antes de comprar; después se ve si acertó.
  ctx.aprendizaje?.nuevaMision();
  ctx.logros?.nuevaMision();
  const pred = PREDICCIONES[conexion.estado.destinoId];
  if (pred && !ctx.prediccionHecha?.[conexion.estado.destinoId + conexion.estado.version]) {
    ctx.prediccionHecha = { [conexion.estado.destinoId + conexion.estado.version]: true };
    setTimeout(async () => {
      const acerto = await mostrarPrediccion(pred);
      ctx.prediccion = { destinoId: conexion.estado.destinoId, acerto };
      const c = CONCEPTOS.find((x) => x.id === pred.concepto);
      ctx.aprendizaje?.marcar(c.id);
      await mostrarTarjeta({
        etiqueta: acerto ? '✅ ¡Acertaste!' : '❌ Era al revés', icono: c.icono, titulo: c.titulo,
        frase: c.corta, detalle: c.detalle, fuente: c.fuente
      });
    }, 600);
  }

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
