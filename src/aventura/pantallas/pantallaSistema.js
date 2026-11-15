// =============================================================
// pantallaSistema.js — Mini sistema solar en 3D para ELEGIR EL DESTINO.
// - Los planetas giran alrededor del Sol (tamaños y distancias NO están a escala).
// - Clic en un planeta (o en la lista) → tarjeta con datos de la NASA.
// - Solo la Luna y Marte se pueden elegir; los demás dicen "Próximamente".
// - Los datos de las tarjetas salen de destinos.json (fichas de la NASA, NSSDC).
// =============================================================
import * as THREE from 'three';
import { cielo } from '../engine/decoracion.js';
import { nuevoEscenario } from '../engine/construccion.js';
import { DESTINOS, TIERRA } from '../datos3d.js';
import emergencias from '../../data/emergencias3d.json';
import configHangar from '../../data/hangar3d.json';
import { efecto } from '../audio.js';
import configDificultad from '../../data/dificultad.json';
import { dificultad, setDificultad } from '../../systems/preferencias.js';
import { tutorialHecho } from '../guia.js';

// Solo aspecto visual (colores, tamaño en pantalla y órbita del dibujo): no son datos científicos.
const CUERPOS = [
  { id: 'mercurio', nombre: 'Mercurio', color: 0x9a8f86, r: 0.35, orbita: 5, vel: 0.9 },
  { id: 'venus', nombre: 'Venus', color: 0xe3c07a, r: 0.6, orbita: 7.5, vel: 0.6 },
  { id: 'tierra', nombre: 'Tierra', color: 0x2f6fd6, r: 0.65, orbita: 10.5, vel: 0.4 },
  { id: 'marte', nombre: 'Marte', color: 0xd2693c, r: 0.5, orbita: 14, vel: 0.3, elegible: true },
  { id: 'jupiter', nombre: 'Júpiter', color: 0xd9b38c, r: 1.6, orbita: 19.5, vel: 0.15 },
  { id: 'saturno', nombre: 'Saturno', color: 0xe8d3a0, r: 1.3, orbita: 25, vel: 0.1, anillo: true }
];

/** ctx = { motor, hud, conexionActiva, irA } */
export function iniciarPantallaSistema(ctx) {
  const { motor } = ctx;
  const conexion = ctx.conexionActiva;
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x01020a);
  const esc = nuevoEscenario();
  cielo(esc, 1500, 160);
  escena.add(esc.raiz);
  escena.add(new THREE.AmbientLight(0x404a70, 0.6));
  const luzSol = new THREE.PointLight(0xfff2d0, 900, 0, 1.6);
  escena.add(luzSol);
  const sol = new THREE.Mesh(new THREE.SphereGeometry(2.4, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffc94a }));
  escena.add(sol);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(3.1, 32, 24), new THREE.MeshBasicMaterial({ color: 0xff9a2a, transparent: true, opacity: 0.25 }));
  escena.add(halo);

  const clicables = [];
  const cuerpos = CUERPOS.map((c, i) => {
    // Órbita dibujada
    const anillo = new THREE.Mesh(new THREE.RingGeometry(c.orbita - 0.03, c.orbita + 0.03, 128), new THREE.MeshBasicMaterial({ color: c.elegible ? 0xd2693c : 0x2a3560, side: THREE.DoubleSide, transparent: true, opacity: c.elegible ? 0.9 : 0.6 }));
    anillo.rotation.x = -Math.PI / 2;
    escena.add(anillo);
    const pivote = new THREE.Group();
    escena.add(pivote);
    const malla = new THREE.Mesh(new THREE.SphereGeometry(c.r, 24, 16), new THREE.MeshStandardMaterial({ color: c.color, roughness: 0.8, emissive: c.color, emissiveIntensity: 0.08 }));
    malla.position.x = c.orbita;
    malla.userData.id = c.id;
    pivote.add(malla);
    pivote.rotation.y = i * 1.3;
    clicables.push(malla);
    if (c.anillo) {
      const a = new THREE.Mesh(new THREE.RingGeometry(c.r * 1.4, c.r * 2.2, 48), new THREE.MeshStandardMaterial({ color: 0xcdb98a, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
      a.rotation.x = -Math.PI / 2.4;
      malla.add(a);
    }
    let luna = null;
    if (c.id === 'tierra') {
      luna = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshStandardMaterial({ color: 0xc8c8c8, roughness: 0.9, emissive: 0xc8c8c8, emissiveIntensity: 0.1 }));
      luna.userData.id = 'luna';
      malla.add(luna);
      clicables.push(luna);
    }
    // Marca de "elegible" (aro que late)
    let marca = null;
    if (c.elegible || c.id === 'tierra') {
      marca = new THREE.Mesh(new THREE.TorusGeometry(c.id === 'tierra' ? 1.9 : c.r * 2, 0.04, 6, 48), new THREE.MeshBasicMaterial({ color: 0x5be08a }));
      marca.position.copy(malla.position);
      if (c.id === 'tierra') marca.visible = false; // la marca va en la Luna (ver abajo)
      pivote.add(marca);
    }
    return { ...c, pivote, malla, luna, marca };
  });
  const marcaLuna = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 6, 32), new THREE.MeshBasicMaterial({ color: 0x5be08a }));
  escena.add(marcaLuna);

  motor.cambiarEscena(escena);
  motor.camara.fov = 50;
  motor.camara.updateProjectionMatrix();

  // ---- Interfaz ----
  const ui = document.createElement('div');
  ui.innerHTML = `
    <div class="panel titulo">🪐 Elijan el destino de la misión</div>
    <div class="panel lista-planetas"></div>
    <div class="panel tarjeta-planeta"></div>
    <div class="nota-escala">Tamaños y distancias no están a escala.</div>`;
  ctx.hud.appendChild(ui);
  const lista = ui.querySelector('.lista-planetas');
  const tarjeta = ui.querySelector('.tarjeta-planeta');
  // En la primera misión (tutorial) se propone la Luna, que es la más fácil
  let seleccionado = ctx.guia?.activo || !tutorialHecho() ? 'luna' : 'marte';
  let mensaje = '';

  const nombres = [...CUERPOS.slice(0, 3), { id: 'luna', nombre: 'Luna', elegible: true }, ...CUERPOS.slice(3)];
  function dibujarLista() {
    lista.innerHTML = `<h3>Destinos</h3>${nombres.filter((c) => c.id !== 'tierra').map((c) => `
      <button data-p="${c.id}" class="${c.id === seleccionado ? 'activo' : ''} ${c.elegible ? '' : 'pronto'}">${c.nombre}${c.elegible ? '' : ' <small>🔒</small>'}</button>`).join('')}
      <h3>Dificultad</h3>
      <div class="fila">${Object.entries(configDificultad.niveles).map(([id, n]) => `<button data-nivel="${id}" class="${dificultad() === id ? 'activo' : ''}">${n.nombre}</button>`).join('')}</div>`;
    lista.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => elegir(b.dataset.p); });
    lista.querySelectorAll('[data-nivel]').forEach((b) => {
      b.onclick = () => {
        setDificultad(b.dataset.nivel);
        window.dispatchEvent(new CustomEvent('cambio-dificultad'));
        efecto('clic');
        setTimeout(() => { dibujarLista(); dibujarTarjeta(); }, 50);
      };
    });
  }
  /** Presupuesto del hangar con el ajuste de la dificultad (dificultad.json → factorPresupuesto). */
  const presupuestoDe = (id) => Math.round(configHangar.presupuesto[id] * (configDificultad.niveles[dificultad()]?.factorPresupuesto ?? 1));

  function dibujarTarjeta() {
    const e = conexion.estado;
    const soyAnfitrion = e.jugadores.find((j) => j.id === conexion.id)?.anfitrion;
    const d = DESTINOS.find((x) => x.id === seleccionado);
    const visual = nombres.find((x) => x.id === seleccionado);
    if (!d || !['luna', 'marte'].includes(seleccionado)) {
      tarjeta.innerHTML = `<h2>${visual.nombre}</h2><p class="pronto-txt">🔒 Próximamente</p>
        <p>Por ahora la tripulación solo puede viajar a la <b>Luna</b> o a <b>Marte</b>.</p>`;
      return;
    }
    const relGrav = (d.gravedad / TIERRA.gravedad);
    const marte = d.id === 'marte';
    tarjeta.innerHTML = `
      <h2 style="color:${d.color}">${d.nombre}</h2>
      <div class="ficha">
        <div><span>Gravedad</span><b>${d.gravedad} m/s²</b><small>${Math.round(relGrav * 100)}% de la Tierra: ¡saltarás ${(1 / relGrav).toFixed(1)} veces más alto!</small></div>
        <div><span>Radio</span><b>${d.radioKm.toLocaleString('es')} km</b></div>
        <div><span>Distancia</span><b>${d.distanciaTexto}</b></div>
        <div><span>Temperatura</span><b>${d.temperatura.minC} °C a ${d.temperatura.maxC} °C</b></div>
        <div><span>Atmósfera</span><b>${d.atmosfera.descripcion}</b></div>
        ${d.juego?.factorSolar < 1 ? `<div><span>Luz del Sol</span><b>${Math.round(d.juego.factorSolar * 100)}% de la que llega a la Tierra</b></div>` : ''}
      </div>
      <h3>${marte ? '🔴 Difícil' : '🟢 Para empezar'}</h3>
      <ul>
        <li>Recompensa: <b>${emergencias.config.creditosBase[d.id]} créditos</b></li>
        <li>Presupuesto: <b>${presupuestoDe(d.id)} M$</b> · el cohete lleva <b>${configHangar.capacidadCohete[d.id]} kg</b></li>
        ${marte ? '<li>Los paneles dan menos energía y hace falta una antena de largo alcance.</li>' : '<li>Cerca de casa: alcanza una antena sencilla.</li>'}
      </ul>
      <p class="fuente">Fuente: ${d.fuente.split(':')[0]}</p>
      ${soyAnfitrion ? `<button id="ir">🚀 ¡Vamos a ${d.id === 'luna' ? 'la Luna' : d.nombre}!</button>` : '<p class="nota">El anfitrión confirma el destino (¡opinen en voz alta!).</p>'}
      <p class="error">${mensaje}</p>`;
    const ir = tarjeta.querySelector('#ir');
    if (ir) ir.onclick = async () => {
      // El tutorial solo acompaña la misión a la Luna
      if (d.id === 'luna') ctx.guia?.reactivarSiFalta(); else ctx.guia?.desactivar();
      const r = await conexion.accion('destino', { id: d.id });
      if (r.error) { mensaje = r.error; efecto('error'); dibujarTarjeta(); } else efecto('exito');
    };
  }

  function elegir(id) {
    seleccionado = id;
    mensaje = '';
    efecto('clic');
    dibujarLista();
    dibujarTarjeta();
  }

  // Clic en los planetas (rayo desde la cámara)
  const rayo = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  const alClic = (ev) => {
    const r = motor.renderer.domElement.getBoundingClientRect();
    puntero.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(puntero, motor.camara);
    const hit = rayo.intersectObjects(clicables, false)[0];
    if (hit && hit.object.userData.id !== 'tierra') elegir(hit.object.userData.id);
  };
  motor.renderer.domElement.addEventListener('click', alClic);

  const quitarEstado = conexion.alEstado((e) => { if (e.fase !== 'sistema') ctx.irA('juego'); });
  dibujarLista();
  dibujarTarjeta();

  const objetivo = new THREE.Vector3();
  const mirar = new THREE.Vector3();
  return {
    elegir,
    actualizar(dt, t) {
      for (const c of cuerpos) {
        c.pivote.rotation.y += c.vel * dt * 0.25;
        c.malla.rotation.y += dt * 0.5;
        if (c.marca) c.marca.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
        if (c.luna) c.luna.position.set(Math.cos(t * 0.8) * 1.3, 0, Math.sin(t * 0.8) * 1.3);
      }
      const tierra = cuerpos.find((c) => c.id === 'tierra');
      tierra.luna.getWorldPosition(marcaLuna.position);
      marcaLuna.lookAt(motor.camara.position);
      marcaLuna.scale.setScalar(1 + Math.sin(t * 3) * 0.1);
      halo.scale.setScalar(1 + Math.sin(t * 2) * 0.04);
      // La cámara se acerca al destino elegido
      const elegido = seleccionado === 'luna' ? tierra.luna : cuerpos.find((c) => c.id === seleccionado)?.malla;
      if (elegido) elegido.getWorldPosition(objetivo);
      mirar.lerp(objetivo.clone().multiplyScalar(0.6), 1 - Math.exp(-2 * dt));
      motor.camara.position.lerp(new THREE.Vector3(mirar.x * 0.6, 16, mirar.z * 0.6 + 26), 1 - Math.exp(-1.5 * dt));
      motor.camara.lookAt(mirar);
    },
    salir() { ui.remove(); quitarEstado(); motor.renderer.domElement.removeEventListener('click', alClic); }
  };
}
