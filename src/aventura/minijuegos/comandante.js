// =============================================================
// Minijuegos del PILOTO (segmento de lanzamiento). Inspirados en hechos reales
// (ver src/data/hechos_reales.json):
//   esquivar · Esquivar basura espacial y micrometeoritos (la Estación Espacial
//              hace maniobras para esquivar basura).
//   rumbo    · Corregir el rumbo: apuntar la trayectoria al planeta gastando
//              el menor combustible posible.
// (El tercero, "Aterrizar con alarmas" como el Apolo 11, está en pantallaAterrizaje.js.)
// Cada uno recibe (area, terminar, op): op = valores del destino (dificultad.json →
// minijuegosPorDestino). terminar(true) o terminar(false, 'por qué falló').
// =============================================================
import { lienzo, teclas, azar, texto } from './base.js';

/**
 * ESQUIVAR — vista desde la cabina. Los objetos salen del centro y se acercan.
 * La BASURA (gris, con forma rara) y los MICROMETEORITOS (puntos naranjas) son
 * peligrosos; las ESTRELLAS lejanas (blancas, quietas) no: hay que pensar qué
 * esquivar y no moverse de más.
 */
export function esquivar(area, terminar, op = {}) {
  const duracion = op.segundos ?? 16;
  const vel = op.velocidad ?? 1;
  const { c, g } = lienzo(area, 420, 260);
  const t = teclas();
  let nx = 210; let ny = 150; let escudo = op.escudo ?? 3; let tiempo = 0; let golpe = 0; let esquivados = 0;
  const objetos = [];
  const estrellas = Array.from({ length: 40 }, () => ({ x: Math.random() * 420, y: Math.random() * 260 }));
  let anterior = performance.now();
  let id = requestAnimationFrame(cuadro);
  function nuevo() {
    // Cada objeto apunta a un punto de la pantalla (a veces justo donde está la nave)
    const apuntado = Math.random() < (op.apuntados ?? 0.35);
    const meteorito = Math.random() < 0.4;
    objetos.push({
      tx: apuntado ? nx + azar(-30, 30) : azar(30, 390), ty: apuntado ? ny + azar(-25, 25) : azar(30, 230),
      z: 0, v: azar(0.28, 0.42) * vel, meteorito, giro: Math.random() * 6, forma: Math.floor(Math.random() * 3)
    });
  }
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    tiempo += dt;
    const dx = (t.s.has('ArrowRight') || t.s.has('KeyD') ? 1 : 0) - (t.s.has('ArrowLeft') || t.s.has('KeyA') ? 1 : 0);
    const dy = (t.s.has('ArrowDown') || t.s.has('KeyS') ? 1 : 0) - (t.s.has('ArrowUp') || t.s.has('KeyW') ? 1 : 0);
    nx = Math.max(30, Math.min(390, nx + dx * 230 * dt));
    ny = Math.max(40, Math.min(225, ny + dy * 200 * dt));
    if (Math.random() < (0.9 + tiempo * 0.04) * (op.basura ?? 1) * dt * 2) nuevo();
    // Dibujo: cabina
    g.fillStyle = '#020611'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#cfd8ff';
    for (const s of estrellas) g.fillRect(s.x, s.y, 1.5, 1.5);
    for (const o of [...objetos]) {
      o.z += o.v * dt;
      o.giro += dt * 2;
      // Perspectiva: desde el centro hacia su punto, cada vez más grande
      const x = 210 + (o.tx - 210) * o.z; const y = 130 + (o.ty - 130) * o.z;
      const r = (o.meteorito ? 6 : 11) * (0.2 + o.z * 2.2);
      if (o.meteorito) { g.fillStyle = '#ff9b4a'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
      else {
        g.save(); g.translate(x, y); g.rotate(o.giro); g.fillStyle = '#8f96a8';
        if (o.forma === 0) g.fillRect(-r, -r * 0.4, r * 2, r * 0.8);
        else if (o.forma === 1) { g.beginPath(); g.moveTo(-r, -r * 0.6); g.lineTo(r, -r * 0.2); g.lineTo(r * 0.3, r); g.lineTo(-r * 0.8, r * 0.5); g.fill(); }
        else { g.fillRect(-r * 0.3, -r, r * 0.6, r * 2); g.fillRect(-r, -r * 0.2, r * 2, r * 0.4); }
        g.restore();
      }
      // Aro rojo: este objeto VA A CHOCAR si la mira se queda donde está
      const rFinal = (o.meteorito ? 6 : 11) * 2.4;
      if (o.z > 0.25 && Math.hypot(o.tx - nx, o.ty - ny) < rFinal + 18) {
        g.strokeStyle = '#ff3b3b'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r + 6, 0, 7); g.stroke();
      }
      if (o.z >= 1) {
        objetos.splice(objetos.indexOf(o), 1);
        if (Math.hypot(x - nx, y - ny) < r + 18) {
          escudo--; golpe = 0.4;
          window.dispatchEvent(new CustomEvent('impacto-meteorito')); // para el logro "Piloto de élite"
        } else esquivados++;
      }
    }
    // Marco de la ventana de la cabina y la mira de la nave
    g.strokeStyle = '#3fd0ff'; g.lineWidth = 6; g.strokeRect(3, 3, 414, 254);
    g.strokeStyle = golpe > 0 ? '#ff5050' : '#5be08a'; g.lineWidth = 3;
    g.beginPath(); g.arc(nx, ny, 18, 0, 7); g.moveTo(nx - 28, ny); g.lineTo(nx - 10, ny); g.moveTo(nx + 10, ny); g.lineTo(nx + 28, ny); g.stroke();
    golpe -= dt;
    if (op.pista) Object.assign(op.pista, { lienzo: c, mira: { x: nx, y: ny }, peligros: objetos.filter((o) => o.z > 0.25 && Math.hypot(o.tx - nx, o.ty - ny) < (o.meteorito ? 6 : 11) * 2.4 + 18) });
    texto(g, `Escudo ${'❤'.repeat(Math.max(0, escudo))}   ⏱ ${Math.max(0, duracion - tiempo).toFixed(0)} s`, 12, 24, '#fff', 17);
    if (escudo <= 0) return terminar(false, 'Los objetos que vienen hacia el CENTRO de tu mira son los que chocan: muévete solo cuando algo gris o naranja crece justo delante. Las estrellas no hacen daño.');
    if (tiempo >= duracion) return terminar(true);
    id = requestAnimationFrame(cuadro);
  }
  return () => { cancelAnimationFrame(id); t.quitar(); };
}

/**
 * RUMBO — se ven la nave, el planeta y una línea punteada con la trayectoria.
 * ← → giran la nave: cada corrección GASTA combustible (se ve en la barra).
 * La nave se desvía sola de a poco (deriva). Hay que apuntar la línea al planeta
 * y mantenerla unos segundos, sin gastar todo el combustible.
 */
export function rumbo(area, terminar, op = {}) {
  const meta = op.segundos ?? 2;
  const { c, g } = lienzo(area, 420, 260);
  const t = teclas();
  let combustible = op.combustible ?? 100;
  const total = combustible;
  // El planeta está en un lugar distinto cada vez y se mueve en su órbita
  let py = azar(50, 210); let pv = azar(-12, 12);
  const px = azar(330, 390);
  const nave = { x: 50, y: 130 };
  let ang = Math.atan2(py - nave.y, px - nave.x) + (Math.random() < 0.5 ? -1 : 1) * azar(0.5, 0.9);
  let deriva = (Math.random() < 0.5 ? -1 : 1) * (op.deriva ?? 0.35);
  let alineado = 0;
  let anterior = performance.now();
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    const giro = (t.s.has('ArrowLeft') || t.s.has('KeyA') ? -1 : 0) + (t.s.has('ArrowRight') || t.s.has('KeyD') ? 1 : 0);
    if (giro && combustible > 0) { ang += giro * (op.giro ?? 1.2) * dt; combustible = Math.max(0, combustible - 22 * dt); }
    ang += deriva * 0.25 * dt;
    if (Math.random() < 0.006) deriva = -deriva;
    py += pv * dt; if (py < 40 || py > 220) pv = -pv;
    // ¿La línea pasa por el planeta? distancia del planeta a la recta de la trayectoria
    const vx = Math.cos(ang); const vy = Math.sin(ang);
    const rx = px - nave.x; const ry = py - nave.y;
    const distLinea = Math.abs(rx * vy - ry * vx);
    const adelante = rx * vx + ry * vy > 0;
    const acierta = adelante && distLinea < 20;
    alineado = acierta ? alineado + dt : Math.max(0, alineado - dt * 2);
    if (op.pista) Object.assign(op.pista, { lienzo: c, angulo: ang, anguloPlaneta: Math.atan2(py - nave.y, px - nave.x) });
    // Dibujo
    g.fillStyle = '#04101f'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#d2693c'; g.beginPath(); g.arc(px, py, 20, 0, 7); g.fill();
    g.strokeStyle = acierta ? '#5be08a' : 'rgba(124,243,255,0.8)'; g.lineWidth = 2; g.setLineDash([8, 7]);
    g.beginPath(); g.moveTo(nave.x, nave.y); g.lineTo(nave.x + vx * 480, nave.y + vy * 480); g.stroke(); g.setLineDash([]);
    g.save(); g.translate(nave.x, nave.y); g.rotate(ang);
    g.fillStyle = '#dfe6f5'; g.beginPath(); g.moveTo(20, 0); g.lineTo(-12, -10); g.lineTo(-12, 10); g.fill();
    if (giro && combustible > 0) { g.fillStyle = '#ffa040'; g.beginPath(); g.moveTo(-12, -5); g.lineTo(-24 - Math.random() * 6, 0); g.lineTo(-12, 5); g.fill(); }
    g.restore();
    // Barra de combustible (cada corrección la vacía)
    g.fillStyle = '#1a2342'; g.fillRect(12, 232, 180, 14);
    g.fillStyle = combustible / total > 0.3 ? '#ffd166' : '#e5484d'; g.fillRect(12, 232, 180 * combustible / total, 14);
    texto(g, '⛽ Combustible', 200, 244, '#fff', 14);
    texto(g, acierta ? `¡En rumbo! ${Math.max(0, meta - alineado).toFixed(1)} s` : 'Apunta la línea al planeta', 12, 24, acierta ? '#5be08a' : '#fff', 17);
    texto(g, `La nave se desvía sola ${deriva > 0 ? '↻' : '↺'}: corrige con toques cortos`, 12, 46, '#ffd166', 13);
    if (alineado >= meta) return terminar(true);
    if (combustible <= 0 && !acierta) return terminar(false, 'Te quedaste sin combustible. Cada corrección gasta: haz giros cortos y espera a ver hacia dónde va la línea antes de corregir otra vez.');
    id = requestAnimationFrame(cuadro);
  }
  return () => { cancelAnimationFrame(id); t.quitar(); };
}
