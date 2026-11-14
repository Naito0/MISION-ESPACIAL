// =============================================================
// server/index.js — Servidor del ANFITRIÓN (Node.js + Express + Socket.IO).
//
// Uso:   npm run servidor
// - Sirve el juego compilado (carpeta dist/) en http://IP:3000
// - Mantiene las salas (código de 4 letras) y es la única fuente de verdad
//   de la misión (ver src/compartido/sala.js).
// - Reenvía la posición de cada jugador a los demás 15 veces por segundo.
// =============================================================
import express from 'express';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { Server } from 'socket.io';
import { Sala, generarCodigo } from '../src/compartido/sala.js';

const PUERTO = Number(process.env.PORT) || 3000;
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpetaJuego = join(raiz, 'dist');

/** Lee un JSON de src/data (los mismos datos que usa el navegador). */
const leer = (nombre) => JSON.parse(readFileSync(join(raiz, 'src', 'data', nombre), 'utf8'));
export function datosDelJuego() {
  return { destinos: leer('destinos.json').destinos, misionesReales: leer('misiones_reales.json').misiones };
}

/** IPs de esta computadora en la red local (para que los demás se conecten). */
function ipsLocales() {
  return Object.values(networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

const app = express();
if (!existsSync(join(carpetaJuego, 'index.html'))) {
  console.warn('⚠ No existe dist/. Ejecuta primero:  npm run build');
}
app.use(express.static(carpetaJuego));
app.get('/api/info', (_req, res) => res.json({ ips: ipsLocales(), puerto: PUERTO }));

const http = createServer(app);
const io = new Server(http);
const salas = new Map(); // código → Sala
const datos = datosDelJuego();

io.on('connection', (socket) => {
  let sala = null;

  const entrar = (s, nombre, responder) => {
    const r = s.unir(socket.id, nombre);
    if (r.error) return responder?.(r);
    sala = s;
    socket.join(s.codigo);
    responder?.({ ok: true, codigo: s.codigo, id: socket.id });
    io.to(s.codigo).emit('estado', s.estadoPublico());
  };

  socket.on('crear', ({ nombre } = {}, responder) => {
    const s = new Sala(generarCodigo(new Set(salas.keys())), datos);
    salas.set(s.codigo, s);
    entrar(s, nombre, responder);
  });

  socket.on('unirse', ({ codigo, nombre } = {}, responder) => {
    const s = salas.get(String(codigo || '').toUpperCase().trim());
    if (!s) return responder?.({ error: 'No existe una partida con ese código.' });
    entrar(s, nombre, responder);
  });

  socket.on('accion', ({ tipo, datos: d } = {}, responder) => {
    if (!sala) return responder?.({ error: 'No estás en una sala.' });
    const r = sala.accion(socket.id, tipo, d);
    responder?.(r);
  });

  socket.on('pos', (p) => { if (sala) sala.posicion(socket.id, p); });

  socket.on('disconnect', () => {
    if (!sala) return;
    sala.salir(socket.id);
    if (sala.vacia) salas.delete(sala.codigo);
  });
});

// Bucle del servidor: 15 veces por segundo avanza las salas y envía posiciones y cambios
const PERIODO = 1000 / 15;
const versiones = new Map();
setInterval(() => {
  for (const s of salas.values()) {
    s.tick(PERIODO / 1000);
    if (versiones.get(s.codigo) !== s.version) {
      versiones.set(s.codigo, s.version);
      io.to(s.codigo).emit('estado', s.estadoPublico());
    }
    io.to(s.codigo).volatile.emit('posiciones', s.posicionesPublicas());
  }
}, PERIODO);

http.listen(PUERTO, '0.0.0.0', () => {
  console.log('\n🚀 Servidor de Misión Espacial 3D listo');
  console.log(`   En esta computadora:  http://localhost:${PUERTO}`);
  for (const ip of ipsLocales()) console.log(`   Los demás jugadores:  http://${ip}:${PUERTO}`);
  console.log('   (Si no pueden entrar, revisa el firewall de Windows: ver README)\n');
});
