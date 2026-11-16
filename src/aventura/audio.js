// =============================================================
// audio.js — Sonidos generados con Web Audio API (sin archivos).
//   ambiente(): zumbido grave de la nave (motor y ventilación).
//   efecto('clic' | 'exito' | 'error' | 'alarma' | 'compra' | 'salto')
// El navegador solo permite sonar después del primer clic o tecla.
// =============================================================
import { estaSilenciado, alCambiarPreferencias } from '../systems/preferencias.js';

let ctx = null;
let general = null;
let zumbido = null;

let audioPausado = false; // true mientras se ve la intro (intro.js)
let huboGesto = false; // el navegador no deja crear el audio antes del primer clic o tecla (avisa en la consola)
function asegurar(ev) {
  if (ev && ev.isTrusted !== false) huboGesto = true;
  if (!huboGesto || audioPausado) return null;
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    general = ctx.createGain();
    general.gain.value = estaSilenciado() ? 0 : 0.5;
    general.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Pausa (true) o reactiva (false) todos los sonidos del juego (se usa durante la intro en video). */
export function pausarAudio(pausado) {
  audioPausado = pausado;
  if (!ctx) return;
  if (pausado) ctx.suspend();
  else if (huboGesto) ctx.resume();
}

alCambiarPreferencias((p) => { if (general) general.gain.value = p.silencio ? 0 : 0.5; });
function alGesto(ev) { asegurar(ev); if (ambientePendiente && ctx) ambiente(true); }
window.addEventListener('pointerdown', alGesto);
window.addEventListener('keydown', alGesto);

/** Zumbido de fondo de la nave (se puede encender o apagar). */
let ambientePendiente = false; // pedido antes del primer clic: suena apenas se pueda
export function ambiente(encendido = true) {
  const c = asegurar();
  if (!c) { ambientePendiente = encendido; return; }
  ambientePendiente = false;
  if (!encendido) { if (zumbido) { zumbido.forEach((n) => n.stop?.()); zumbido = null; } return; }
  if (zumbido) return;
  const bajo = c.createOscillator();
  bajo.type = 'sawtooth'; bajo.frequency.value = 48;
  const filtro = c.createBiquadFilter();
  filtro.type = 'lowpass'; filtro.frequency.value = 140;
  const vol = c.createGain(); vol.gain.value = 0.06;
  // Ruido suave de ventilación
  const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const datos = buffer.getChannelData(0);
  for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
  const ruido = c.createBufferSource(); ruido.buffer = buffer; ruido.loop = true;
  const filtroRuido = c.createBiquadFilter(); filtroRuido.type = 'bandpass'; filtroRuido.frequency.value = 500;
  const volRuido = c.createGain(); volRuido.gain.value = 0.015;
  bajo.connect(filtro).connect(vol).connect(general);
  ruido.connect(filtroRuido).connect(volRuido).connect(general);
  bajo.start(); ruido.start();
  zumbido = [bajo, ruido];
}

/** Tono corto. */
function tono(frecuencia, duracion, tipo = 'sine', volumen = 0.25, retraso = 0) {
  const c = asegurar();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  const t0 = c.currentTime + retraso;
  o.type = tipo;
  o.frequency.setValueAtTime(frecuencia, t0);
  g.gain.setValueAtTime(volumen, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duracion);
  o.connect(g).connect(general);
  o.start(t0);
  o.stop(t0 + duracion);
}

export function efecto(nombre) {
  switch (nombre) {
    case 'clic': tono(660, 0.06, 'square', 0.08); break;
    case 'exito': [523, 659, 784].forEach((f, i) => tono(f, 0.18, 'triangle', 0.2, i * 0.09)); break;
    case 'error': tono(180, 0.3, 'sawtooth', 0.15); break;
    case 'alarma': [880, 660, 880, 660].forEach((f, i) => tono(f, 0.15, 'square', 0.12, i * 0.16)); break;
    case 'compra': tono(988, 0.08, 'square', 0.12); tono(1319, 0.15, 'square', 0.12, 0.08); break;
    case 'salto': tono(330, 0.12, 'sine', 0.1); break;
    case 'fuush': tono(520, 0.1, 'sine', 0.06); tono(320, 0.16, 'sine', 0.05, 0.05); break; // empujón (suave)
    case 'boing': tono(420, 0.1, 'triangle', 0.08); tono(260, 0.18, 'triangle', 0.07, 0.08); break; // rebote del empujado
    default: break;
  }
}
