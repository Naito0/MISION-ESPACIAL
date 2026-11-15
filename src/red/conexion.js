// =============================================================
// src/red/conexion.js — LA ÚNICA PUERTA DE RED DEL JUEGO.
// El resto del juego solo usa estas funciones y no sabe qué servicio hay detrás.
// Hoy se usa PeerJS (conexión directa entre navegadores con el servidor
// gratuito de PeerJS en la nube: sin cuenta ni claves).
//
//   crearPartidaSolo()                       → partida de 1 jugador, SIN internet
//   crearSalaEnRed(nombre)                   → { conexion } | { error }   (anfitrión)
//   unirseASalaEnRed(codigo, nombre)         → { conexion } | { error }   (invitado)
//
// Todas las conexiones tienen la misma forma:
//   conexion.accion(tipo, datos) → Promise({ ok | error })
//   conexion.alEstado(fn) · conexion.alPosiciones(fn) · conexion.enviarPosicion(p)
//   conexion.estado · conexion.id · conexion.enRed
//   conexion.red = { estado: 'conectando'|'conectado'|'error', mensaje } · conexion.alRed(fn)
//   conexion.alFin = (motivo) => …   (el anfitrión se fue o se cortó la conexión)
//   conexion.salir()
//
// EL ANFITRIÓN MANDA: la sala (src/compartido/sala.js) corre en su navegador.
// Los invitados le mandan acciones y posiciones; él responde y envía el
// estado unas 10 veces por segundo.
// (La versión con Firebase se descartó: no hay código de Firebase en el proyecto.
//  La versión vieja con Socket.IO sigue desactivada en src/aventura/red/conexion.js.)
// =============================================================
import { Sala, generarCodigo } from '../compartido/sala.js';
import { datosParaSala } from '../aventura/red/datosSala.js';
import { crearPartidaLocal } from '../aventura/red/partidaLocal.js';

export const PREFIJO = 'misionespacial-';
const PERIODO = 100; // ms → 10 veces por segundo

export const crearPartidaSolo = crearPartidaLocal;

// PeerJS se carga SOLO al usar el multijugador: "Jugar solo" funciona sin internet
const cargarPeer = () => import('peerjs').then((m) => m.Peer || m.default);

/** Explica en español los errores de PeerJS. */
export function explicarError(err) {
  const tipo = err && err.type;
  if (tipo === 'peer-unavailable') return 'Ese código no existe (o la sala ya se cerró). Revisa las 4 letras.';
  if (tipo === 'unavailable-id') return 'Ese código ya está en uso.';
  if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(tipo)) return 'No se pudo llegar al servidor de PeerJS. Revisa el internet.';
  if (tipo === 'browser-incompatible') return 'Este navegador no permite el multijugador. Prueba con Chrome, Edge o Firefox.';
  if (tipo === 'webrtc') return 'No se pudo abrir la conexión directa entre las computadoras (red bloqueada).';
  return `Error de conexión${tipo ? ` (${tipo})` : ''}: ${err && err.message ? err.message : 'desconocido'}`;
}

function base() {
  const oyentesEstado = new Set(); const oyentesPos = new Set(); const oyentesRed = new Set();
  return {
    enRed: true, estado: null, posiciones: {}, red: { estado: 'conectando', mensaje: 'Conectando…' },
    alEstado(fn) { oyentesEstado.add(fn); return () => oyentesEstado.delete(fn); },
    alPosiciones(fn) { oyentesPos.add(fn); return () => oyentesPos.delete(fn); },
    alRed(fn) { oyentesRed.add(fn); return () => oyentesRed.delete(fn); },
    _estado(e) { this.estado = e; oyentesEstado.forEach((f) => f(e)); },
    _pos(p) { this.posiciones = p; oyentesPos.forEach((f) => f(p)); },
    _red(estado, mensaje) { this.red = { estado, mensaje }; oyentesRed.forEach((f) => f(this.red)); },
    alFin: null,
    _fin(motivo) { if (this._terminada) return; this._terminada = true; this.salir(true); this.alFin?.(motivo); }
  };
}

/** Abre un Peer con un ID; devuelve { peer } o { error, tipo }. */
function abrirPeer(Peer, id, espera = 12000) {
  return new Promise((resolver) => {
    const peer = id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 });
    const reloj = setTimeout(() => { peer.destroy(); resolver({ error: 'No se pudo llegar al servidor de PeerJS. Revisa el internet.' }); }, espera);
    peer.once('open', () => { clearTimeout(reloj); resolver({ peer }); });
    peer.once('error', (err) => { clearTimeout(reloj); peer.destroy(); resolver({ error: explicarError(err), tipo: err.type }); });
  });
}

// ---------------------------------------------------------------- ANFITRIÓN
export async function crearSalaEnRed(nombre) {
  let Peer;
  try { Peer = await cargarPeer(); } catch { return { error: 'No se pudo cargar el multijugador. Revisa el internet.' }; }
  // Si el código ya está ocupado por otra sala, se prueba con otro
  let abierto = null; let codigo = '';
  for (let intento = 0; intento < 5; intento++) {
    codigo = generarCodigo();
    abierto = await abrirPeer(Peer, PREFIJO + codigo);
    if (abierto.peer || abierto.tipo !== 'unavailable-id') break;
  }
  if (!abierto.peer) return { error: abierto.error };
  const peer = abierto.peer;
  const c = base();
  c.id = peer.id;
  c.codigo = codigo;
  c.anfitrion = true;
  const sala = new Sala(codigo, datosParaSala());
  sala.unir(c.id, nombre);
  c.sala = () => sala;
  const invitados = new Map(); // id → conexión de PeerJS
  const ultimoLatido = new Map(); // id → último mensaje recibido (si calla 6 s, se fue)
  let version = -1;
  const enviarATodos = (m) => invitados.forEach((conn) => { if (conn.open) conn.send(m); });

  function emitir(forzar = false) {
    if (forzar || sala.version !== version) {
      version = sala.version;
      const e = sala.estadoPublico();
      c._estado(e);
      enviarATodos({ t: 'estado', e });
    }
  }
  const conn0 = (id) => invitados.get(id);
  function seFue(id) {
    if (!invitados.has(id)) return;
    invitados.delete(id);
    ultimoLatido.delete(id);
    try { conn0(id)?.close(); } catch { /* ya cerrada */ }
    sala.salir(id); // en partida, su rol pasa a ser un bot (sala.js)
    emitir();
  }

  peer.on('connection', (conn) => {
    conn.on('data', (m) => {
      if (!m || typeof m !== 'object') return;
      ultimoLatido.set(conn.peer, performance.now());
      if (m.t === 'unirse') {
        const r = sala.unir(conn.peer, m.nombre);
        conn.send({ t: 'resp', n: m.n, r });
        if (r.error) { setTimeout(() => conn.close(), 500); return; }
        invitados.set(conn.peer, conn);
        emitir(true);
      } else if (m.t === 'accion' && invitados.has(conn.peer)) {
        const r = sala.accion(conn.peer, m.tipo, m.datos);
        conn.send({ t: 'resp', n: m.n, r });
        emitir();
      } else if (m.t === 'pos' && invitados.has(conn.peer)) sala.posicion(conn.peer, m.p);
    });
    conn.on('close', () => seFue(conn.peer));
    conn.on('error', () => seFue(conn.peer));
  });
  peer.on('disconnected', () => { c._red('error', 'Se cortó la conexión con el servidor de PeerJS. Los que ya están en la sala siguen jugando; nadie nuevo puede entrar.'); try { peer.reconnect(); } catch { /* sin red */ } });
  peer.on('open', () => c._red('conectado', `Conectado · ${invitados.size + 1} jugador(es)`));
  peer.on('error', (err) => { if (err.type !== 'peer-unavailable') c._red('error', explicarError(err)); });

  const reloj = setInterval(() => {
    sala.tick(PERIODO / 1000);
    emitir();
    const pos = sala.posicionesPublicas();
    c._pos(pos);
    enviarATodos({ t: 'pos', p: pos });
    if (c.red.estado !== 'error') c._red('conectado', `Conectado · ${invitados.size + 1} jugador(es)`);
    // Invitados que no mandan nada hace 6 s (cerraron la pestaña o se cortó el internet)
    const ahora = performance.now();
    for (const [id, t] of ultimoLatido) if (ahora - t > 6000) seFue(id);
  }, PERIODO);

  c.accion = async (tipo, datos) => { const r = sala.accion(c.id, tipo, datos); emitir(); return r; };
  c.enviarPosicion = (p) => sala.posicion(c.id, p);
  c.salir = () => {
    clearInterval(reloj);
    window.removeEventListener('pagehide', c.salir);
    enviarATodos({ t: 'fin', motivo: 'El anfitrión cerró la sala.' });
    setTimeout(() => peer.destroy(), 300);
  };
  window.addEventListener('pagehide', c.salir); // cerrar la pestaña = cerrar la sala
  c._red('conectado', 'Conectado · 1 jugador(es)');
  emitir(true);
  return { conexion: c };
}

// ---------------------------------------------------------------- INVITADO
export async function unirseASalaEnRed(codigo, nombre) {
  let Peer;
  try { Peer = await cargarPeer(); } catch { return { error: 'No se pudo cargar el multijugador. Revisa el internet.' }; }
  const abierto = await abrirPeer(Peer, null);
  if (!abierto.peer) return { error: abierto.error };
  const peer = abierto.peer;
  const c = base();
  c.id = peer.id;
  c.codigo = codigo;
  let n = 0;
  const pendientes = new Map(); // n → resolver
  let conn = null;
  let ultimoDelAnfitrion = performance.now();

  const conectado = await new Promise((resolver) => {
    const reloj = setTimeout(() => resolver({ error: 'El anfitrión no responde. ¿Sigue abierta la sala?' }), 12000);
    peer.on('error', (err) => { clearTimeout(reloj); resolver({ error: explicarError(err) }); });
    conn = peer.connect(PREFIJO + codigo, { reliable: true });
    conn.on('open', () => {
      const id = ++n;
      pendientes.set(id, (r) => { clearTimeout(reloj); resolver(r); });
      conn.send({ t: 'unirse', n: id, nombre });
    });
    conn.on('data', (m) => {
      if (!m || typeof m !== 'object') return;
      ultimoDelAnfitrion = performance.now();
      if (m.t === 'resp') { const f = pendientes.get(m.n); pendientes.delete(m.n); f?.(m.r); }
      else if (m.t === 'estado') c._estado(m.e);
      else if (m.t === 'pos') c._pos(m.p);
      else if (m.t === 'fin') c._fin(m.motivo);
    });
  });
  if (conectado.error) { peer.destroy(); return { error: conectado.error }; }

  // Esperar el primer estado de la sala antes de entrar
  for (let k = 0; k < 40 && !c.estado; k++) await new Promise((r) => setTimeout(r, 100));
  if (!c.estado) { peer.destroy(); return { error: 'El anfitrión no envió la sala. Prueba otra vez.' }; }
  conn.on('close', () => c._fin('Se perdió la conexión con el anfitrión.'));
  // Latido: 1 vez por segundo le aviso al anfitrión que sigo aquí; si él calla 6 s, se fue
  const latido = setInterval(() => {
    if (conn.open) conn.send({ t: 'ping' });
    if (performance.now() - ultimoDelAnfitrion > 6000) c._fin('Se perdió la conexión con el anfitrión (¿cerró el juego o se cortó el internet?).');
  }, 1000);
  window.addEventListener('pagehide', () => c.salir());
  peer.on('error', (err) => c._red('error', explicarError(err)));
  c._red('conectado', 'Conectado');

  c.accion = (tipo, datos) => new Promise((resolver) => {
    if (!conn.open) return resolver({ error: 'Sin conexión con el anfitrión.' });
    const id = ++n;
    const reloj = setTimeout(() => { pendientes.delete(id); resolver({ error: 'El anfitrión no respondió.' }); }, 6000);
    pendientes.set(id, (r) => { clearTimeout(reloj); resolver(r); });
    conn.send({ t: 'accion', n: id, tipo, datos });
  });
  let ultimoEnvio = 0;
  c.enviarPosicion = (p) => {
    const ahora = performance.now();
    if (ahora - ultimoEnvio < PERIODO || !conn.open) return;
    ultimoEnvio = ahora;
    conn.send({ t: 'pos', p });
  };
  c.salir = () => { c._terminada = true; clearInterval(latido); try { conn.close(); } catch { /* ya cerrada */ } setTimeout(() => peer.destroy(), 200); };
  return { conexion: c };
}
