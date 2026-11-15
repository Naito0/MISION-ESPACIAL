// =============================================================
// partidaLocal.js — La partida de UN jugador, que corre dentro del navegador.
// No usa red ni servidor: así el juego funciona como sitio estático
// (GitHub Pages, Netlify, Cloudflare…). Tiene la misma forma que la
// conexión en red de conexion.js (que quedó desactivada y no se carga).
//
//   partida.crear(nombre) · partida.accion(tipo, datos) → Promise({ ok | error })
//   partida.alEstado(fn) · partida.estado · partida.sala()
// =============================================================
import { Sala } from '../../compartido/sala.js';
import { datosParaSala } from './datosSala.js';
import { estaPausado } from '../pausa.js';

export function crearPartidaLocal() {
  const oyentesEstado = new Set();
  const oyentesPos = new Set();
  let sala = null;
  let version = -1;
  const c = {
    enRed: false,
    id: 'local',
    estado: null,
    posiciones: {},
    alEstado(fn) { oyentesEstado.add(fn); return () => oyentesEstado.delete(fn); },
    alPosiciones(fn) { oyentesPos.add(fn); return () => oyentesPos.delete(fn); },
    sala: () => sala // para depurar y para las pruebas automáticas
  };
  const emitir = () => {
    if (sala.version === version) return;
    version = sala.version;
    c.estado = sala.estadoPublico();
    oyentesEstado.forEach((f) => f(c.estado));
  };
  // El reloj de la partida: 15 veces por segundo. Con la PAUSA REAL (tarjetas,
  // menú, diagnósticos) el tiempo de la misión no avanza.
  const PERIODO = 1000 / 15;
  const reloj = setInterval(() => {
    if (!sala) return;
    if (!estaPausado()) sala.tick(PERIODO / 1000);
    emitir();
  }, PERIODO);

  c.crear = async (nombre) => {
    sala = new Sala('SOLO', datosParaSala());
    const r = sala.unir(c.id, nombre);
    emitir();
    return { ...r, codigo: 'SOLO', id: c.id };
  };
  c.unirse = async () => ({ error: 'El juego es de un solo jugador.' });
  c.accion = async (tipo, datos) => {
    const r = sala.accion(c.id, tipo, datos);
    emitir();
    return r;
  };
  c.enviarPosicion = (p) => sala && sala.posicion(c.id, p);
  c.infoServidor = async () => null;
  c.salir = () => { clearInterval(reloj); sala = null; }; // "Salir al menú": se detiene el reloj de la partida
  return c;
}
