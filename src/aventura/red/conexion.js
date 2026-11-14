// =============================================================
// conexion.js — Conexión con la partida. Dos formas, con la MISMA interfaz:
//   - conectarServidor(): en red local, con Socket.IO, al servidor del anfitrión.
//   - crearConexionLocal(): para jugar solo sin servidor (la sala corre aquí mismo).
//
// Interfaz común:
//   conexion.crear(nombre) · conexion.unirse(codigo, nombre)  → Promise({ ok | error })
//   conexion.accion(tipo, datos)                              → Promise({ ok | error })
//   conexion.enviarPosicion(p)
//   conexion.alEstado(fn) · conexion.alPosiciones(fn)
//   conexion.id · conexion.estado (último estado recibido) · conexion.enRed
// =============================================================
import { io } from 'socket.io-client';
import { Sala } from '../../compartido/sala.js';
import { datosParaSala } from './datosSala.js';

function base() {
  const oyentesEstado = new Set();
  const oyentesPos = new Set();
  return {
    estado: null,
    posiciones: {},
    alEstado(fn) { oyentesEstado.add(fn); return () => oyentesEstado.delete(fn); },
    alPosiciones(fn) { oyentesPos.add(fn); return () => oyentesPos.delete(fn); },
    _emitirEstado(e) { this.estado = e; oyentesEstado.forEach((f) => f(e)); },
    _emitirPos(p) { this.posiciones = p; oyentesPos.forEach((f) => f(p)); }
  };
}

/**
 * Intenta conectarse al servidor que sirvió esta página.
 * Devuelve la conexión, o null si no hay servidor (por ejemplo, con vite preview).
 */
export function conectarServidor(espera = 1500) {
  return new Promise((resolver) => {
    const socket = io({ reconnectionAttempts: 3, timeout: espera });
    const c = base();
    c.enRed = true;
    const fallo = setTimeout(() => { socket.close(); resolver(null); }, espera);
    socket.on('connect', () => { clearTimeout(fallo); c.id = socket.id; resolver(c); });
    socket.on('connect_error', () => { /* el temporizador decide */ });
    socket.on('estado', (e) => c._emitirEstado(e));
    socket.on('posiciones', (p) => c._emitirPos(p));
    const pedir = (evento, datos) => new Promise((r) => socket.timeout(4000).emit(evento, datos, (err, resp) => r(err ? { error: 'Sin respuesta del servidor.' } : resp)));
    c.crear = (nombre) => pedir('crear', { nombre });
    c.unirse = (codigo, nombre) => pedir('unirse', { codigo, nombre });
    c.accion = (tipo, datos) => pedir('accion', { tipo, datos });
    c.enviarPosicion = (p) => socket.volatile.emit('pos', p);
    c.infoServidor = () => fetch('api/info').then((r) => r.json()).catch(() => null);
  });
}

/** Partida local (un solo jugador, sin red): la sala corre en el navegador. */
export function crearConexionLocal() {
  const c = base();
  c.enRed = false;
  c.id = 'local';
  let sala = null;
  let version = -1;
  const PERIODO = 1000 / 15;
  setInterval(() => {
    if (!sala) return;
    // Con el menú o el diario abiertos, el tiempo de la misión se detiene
    if (!window.juegoPausado) sala.tick(PERIODO / 1000);
    if (sala.version !== version) { version = sala.version; c._emitirEstado(sala.estadoPublico()); }
    c._emitirPos(sala.posicionesPublicas());
  }, PERIODO);
  c.crear = async (nombre) => {
    sala = new Sala('SOLO', datosParaSala());
    const r = sala.unir(c.id, nombre);
    c._emitirEstado(sala.estadoPublico());
    return { ...r, codigo: 'SOLO', id: c.id };
  };
  c.unirse = async () => ({ error: 'Sin servidor no se puede unir a otra partida.' });
  c.accion = async (tipo, datos) => {
    const r = sala.accion(c.id, tipo, datos);
    if (sala.version !== version) { version = sala.version; c._emitirEstado(sala.estadoPublico()); }
    return r;
  };
  c.enviarPosicion = (p) => sala && sala.posicion(c.id, p);
  c.infoServidor = async () => null;
  c.sala = () => sala; // para depurar y para las pruebas automáticas
  return c;
}
