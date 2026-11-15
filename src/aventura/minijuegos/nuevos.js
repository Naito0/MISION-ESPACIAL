// =============================================================
// Minijuegos NUEVOS (v10), uno por rol. Cortos: 30 a 45 segundos.
// Inspirados en cosas reales de la Estación Espacial (ver hechos_reales.json):
//   acoplamiento (Piloto)          · acercar la nave despacio y alineada al puerto
//   termica      (Ingeniero)       · abrir/cerrar radiadores para que no haga calor ni frío
//   ejercicio    (Científico)      · ritmo: la tripulación hace ejercicio para cuidar músculos y huesos
//   ventana      (Comunicaciones)  · enviar los datos más importantes mientras se ve la estación terrena
// Cada uno deja su estado en op.pista para la demostración animada (demos.js).
// =============================================================
import { lienzo, teclas, azar, texto } from './base.js';

const ganado = (id, datos = {}) => window.dispatchEvent(new CustomEvent('minijuego-ganado', { detail: { id, ...datos } }));
const reloj = (fn) => { let anterior = performance.now(); let id = requestAnimationFrame(function cuadro(ahora) { const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora; if (fn(dt) !== false) id = requestAnimationFrame(cuadro); }); return () => cancelAnimationFrame(id); };

/**
 * ACOPLAMIENTO — la nave avanza hacia el puerto de la estación.
 * ↑ ↓ la alinean con la cruz del puerto; ← frena y → acelera.
 * Para acoplarse hay que llegar ALINEADA y DESPACIO (velocidad en verde). 3 intentos.
 */
export function acoplamiento(area, terminar, op = {}) {
  const { c, g } = lienzo(area, 420, 260);
  const t = teclas();
  const PUERTO = { x: 360, y: 130 };
  const vMax = op.velocidadMax ?? 14; // px/s permitidos al tocar el puerto
  let intento = 1; let aviso = 0; let textoAviso = '';
  let x; let y; let v; let deriva;
  const nueva = () => { x = op.inicioX ?? 40; y = PUERTO.y + (Math.random() < 0.5 ? -1 : 1) * azar(45, 80); v = 34; deriva = (Math.random() < 0.5 ? -1 : 1) * (op.deriva ?? 4); };
  nueva();
  const detener = reloj((dt) => {
    if (aviso > 0) { aviso -= dt; } else {
      const vert = (t.s.has('ArrowDown') || t.s.has('KeyS') ? 1 : 0) - (t.s.has('ArrowUp') || t.s.has('KeyW') ? 1 : 0);
      const acel = (t.s.has('ArrowRight') || t.s.has('KeyD') ? 1 : 0) - (t.s.has('ArrowLeft') || t.s.has('KeyA') ? 1 : 0);
      y = Math.max(30, Math.min(230, y + (vert * 40 + deriva) * dt));
      v = Math.max(4, Math.min(45, v + acel * 25 * dt));
      x += v * dt;
    }
    const alineada = Math.abs(y - PUERTO.y) < 10;
    const lenta = v <= vMax;
    if (op.pista) Object.assign(op.pista, { lienzo: c, y, yPuerto: PUERTO.y, v, vMax, x });
    // ---- Dibujo ----
    g.fillStyle = '#04081a'; g.fillRect(0, 0, c.width, c.height);
    // Estación: módulo con paneles y el puerto (cruz de alineación)
    g.fillStyle = '#9aa6c8'; g.fillRect(372, 70, 48, 120);
    g.fillStyle = '#3d77d8'; g.fillRect(380, 20, 32, 45); g.fillRect(380, 195, 32, 45);
    g.strokeStyle = alineada ? '#5be08a' : '#ffd166'; g.lineWidth = 3;
    g.beginPath(); g.arc(PUERTO.x + 6, PUERTO.y, 12, 0, 7); g.moveTo(PUERTO.x - 10, PUERTO.y); g.lineTo(PUERTO.x + 22, PUERTO.y); g.moveTo(PUERTO.x + 6, PUERTO.y - 16); g.lineTo(PUERTO.x + 6, PUERTO.y + 16); g.stroke();
    texto(g, 'Estación', 372, 64, '#fff', 12);
    // Guía punteada a la altura del puerto
    g.strokeStyle = 'rgba(91,224,138,0.35)'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(0, PUERTO.y); g.lineTo(PUERTO.x - 12, PUERTO.y); g.stroke(); g.setLineDash([]);
    // Nave
    g.fillStyle = '#dfe6f5'; g.beginPath(); g.moveTo(x + 22, y); g.lineTo(x - 14, y - 12); g.lineTo(x - 14, y + 12); g.fill();
    g.fillStyle = alineada ? '#5be08a' : '#ffd166'; g.fillRect(x + 18, y - 3, 8, 6);
    // Velocímetro con zona verde
    g.fillStyle = '#1a2342'; g.fillRect(20, 236, 200, 12);
    g.fillStyle = 'rgba(60,196,110,0.8)'; g.fillRect(20, 236, 200 * (vMax / 45), 12);
    g.fillStyle = lenta ? '#5be08a' : '#e5484d'; g.fillRect(20 + 200 * (v / 45) - 2, 230, 4, 24);
    texto(g, `Velocidad ${lenta ? '✅ lenta' : '⚠ muy rápida (←)'}`, 230, 247, lenta ? '#5be08a' : '#ffb0b0', 13);
    texto(g, alineada ? '✅ Alineada con el puerto' : '↑ ↓ alinea la nave con la cruz', 12, 22, '#fff', 15);
    texto(g, `Intento ${intento} de 3`, 12, 40, '#c8d2ec', 12);
    if (aviso > 0) { g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(30, 105, 360, 44); texto(g, textoAviso, 210, 133, '#ffd166', 14, 'center'); return; }
    if (x + 22 >= PUERTO.x - 4) {
      if (alineada && lenta) { ganado('acoplamiento'); terminar(true); return false; }
      const motivo = !alineada ? 'Llegó desalineada' : 'Llegó muy rápido';
      if (intento >= 3) { terminar(false, 'Primero alinea con ↑ ↓ hasta que la cruz se ponga verde, y frena con ← para llegar con la velocidad en verde.'); return false; }
      intento++; aviso = 1.8; textoAviso = `¡Rebotó! ${motivo}. Intento ${intento} de 3`; nueva();
    }
  });
  return () => { detener(); t.quitar(); };
}

/**
 * CONTROL TÉRMICO — los equipos calientan la estación; al Sol calienta más y a la
 * sombra menos. Abrir los RADIADORES expulsa calor (enfría); cerrarlos lo guarda.
 * Espacio (o el botón) abre/cierra. Mantén la temperatura en la zona verde.
 */
export function termica(area, terminar, op = {}) {
  const meta = op.segundos ?? 12;
  const { c, g } = lienzo(area, 420, 240);
  const boton = document.createElement('button');
  boton.className = 'consola-grande';
  area.appendChild(boton);
  let temp = 28; let abiertos = false; let enZona = 0; let tiempo = 0; let sol = true; let cambioSol = azar(5, 8);
  const ZONA = { a: 18, b: 26 };
  const alternar = () => { abiertos = !abiertos; };
  boton.onclick = alternar;
  const tecla = (e) => { if (e.code === 'Space') { e.preventDefault(); alternar(); } };
  window.addEventListener('keydown', tecla);
  const detener = reloj((dt) => {
    tiempo += dt;
    cambioSol -= dt; if (cambioSol <= 0) { sol = !sol; cambioSol = azar(5, 8); }
    const calor = (sol ? 2.6 : 1.0) * (op.calor ?? 1);   // equipos + Sol
    const frio = abiertos ? 4.5 : 0.3;                   // radiadores abiertos expulsan calor
    temp += (calor - frio) * dt;
    temp = Math.max(0, Math.min(45, temp));
    const bien = temp >= ZONA.a && temp <= ZONA.b;
    if (bien) enZona += dt;
    boton.textContent = abiertos ? '🧊 Cerrar radiadores (Espacio)' : '🌡 Abrir radiadores (Espacio)';
    if (op.pista) Object.assign(op.pista, { lienzo: c, temp, abiertos, zona: ZONA, boton });
    // ---- Dibujo ----
    g.fillStyle = '#04081a'; g.fillRect(0, 0, c.width, c.height);
    texto(g, sol ? '☀ Al Sol: calienta más' : '🌑 A la sombra: calienta menos', 150, 26, sol ? '#ffd166' : '#9fb4ff', 14);
    // Módulo y radiadores (se despliegan)
    g.fillStyle = '#9aa6c8'; g.fillRect(170, 100, 90, 50);
    const largo = abiertos ? 80 : 18;
    g.fillStyle = '#e8eef8';
    for (const lado of [-1, 1]) for (let k = 0; k < 3; k++) {
      const x0 = lado < 0 ? 170 - largo : 260; g.fillRect(x0, 104 + k * 15, largo, 9);
    }
    texto(g, abiertos ? 'Radiadores ABIERTOS: sale calor' : 'Radiadores cerrados', 160, 180, abiertos ? '#9fe0ff' : '#c8d2ec', 13);
    // Termómetro con zona verde
    const tx = 30; const ty = 40; const th = 170;
    g.fillStyle = '#1a2342'; g.fillRect(tx, ty, 24, th);
    g.fillStyle = 'rgba(60,196,110,0.8)'; g.fillRect(tx, ty + th - th * ZONA.b / 45, 24, th * (ZONA.b - ZONA.a) / 45);
    g.fillStyle = bien ? '#5be08a' : temp > ZONA.b ? '#e5484d' : '#7cc4ff';
    g.fillRect(tx + 6, ty + th - th * temp / 45, 12, th * temp / 45);
    texto(g, `${temp.toFixed(0)} °C`, tx - 4, ty + th + 18, '#fff', 13);
    // Progreso
    g.fillStyle = '#1a2342'; g.fillRect(300, 210, 100, 10);
    g.fillStyle = '#5be08a'; g.fillRect(300, 210, 100 * Math.min(1, enZona / meta), 10);
    texto(g, `En verde: ${Math.min(meta, enZona).toFixed(0)} / ${meta} s`, 290, 202, '#5be08a', 12);
    if (enZona >= meta) { ganado('termica'); terminar(true); return false; }
    if (tiempo > 45) { terminar(false, 'Si sube a rojo, abre los radiadores; si baja a azul, ciérralos. Al Sol calienta más: ábrelos antes.'); return false; }
  });
  return () => { detener(); window.removeEventListener('keydown', tecla); };
}

/**
 * EJERCICIO — juego de ritmo. Los círculos llegan al aro: pulsa ESPACIO (o clic)
 * cuando el círculo está DENTRO del aro. Cada acierto suma un paso de ejercicio.
 */
export function ejercicio(area, terminar, op = {}) {
  const total = op.pulsos ?? 14; const necesarios = op.aciertos ?? 9;
  const periodo = op.periodo ?? 1.25; const VEL = 150; const ARO = 320;
  const { c, g } = lienzo(area, 420, 240);
  const pulsos = Array.from({ length: total }, (_, i) => ({ t: 1.2 + i * periodo, estado: 'viene' }));
  let tiempo = 0; let aciertos = 0; let fallos = 0; let destello = 0; let ultimo = '';
  const posX = (p) => ARO - (p.t - tiempo) * VEL; // x del círculo en la pantalla
  const pulsar = () => {
    const p = pulsos.find((q) => q.estado === 'viene' && Math.abs(posX(q) - ARO) < 30);
    if (p) { p.estado = 'bien'; aciertos++; destello = 0.25; ultimo = '¡Bien!'; }
    else { fallos++; ultimo = 'Fuera de ritmo'; }
  };
  const tecla = (e) => { if (e.code === 'Space') { e.preventDefault(); pulsar(); } };
  window.addEventListener('keydown', tecla);
  c.onmousedown = pulsar;
  const detener = reloj((dt) => {
    tiempo += dt; destello = Math.max(0, destello - dt);
    for (const p of pulsos) if (p.estado === 'viene' && posX(p) > ARO + 30) { p.estado = 'mal'; ultimo = 'Se pasó'; }
    const proximo = pulsos.find((p) => p.estado === 'viene');
    if (op.pista) Object.assign(op.pista, { lienzo: c, distancia: proximo ? Math.abs(posX(proximo) - ARO) : 999 });
    // ---- Dibujo ----
    g.fillStyle = '#07112a'; g.fillRect(0, 0, c.width, c.height);
    // Astronauta en la cinta de correr (sujeto con arneses, como en la Estación)
    const paso = Math.sin(tiempo * 2 * Math.PI / periodo);
    g.fillStyle = '#3a4565'; g.fillRect(30, 200, 120, 10);
    g.strokeStyle = '#dfe6f5'; g.lineWidth = 6;
    g.beginPath(); g.arc(90, 120, 14, 0, 7); g.moveTo(90, 134); g.lineTo(90, 165);
    g.moveTo(90, 165); g.lineTo(90 + paso * 14, 198); g.moveTo(90, 165); g.lineTo(90 - paso * 14, 198); g.stroke();
    g.strokeStyle = '#ffd166'; g.lineWidth = 2; g.beginPath(); g.moveTo(90, 145); g.lineTo(60, 200); g.moveTo(90, 145); g.lineTo(120, 200); g.stroke();
    texto(g, 'Cinta de correr', 40, 228, '#c8d2ec', 12);
    // Pista de ritmo y aro
    g.fillStyle = '#1a2342'; g.fillRect(170, 92, 240, 36);
    g.strokeStyle = destello > 0 ? '#5be08a' : '#ffffff'; g.lineWidth = 4; g.beginPath(); g.arc(ARO, 110, 22, 0, 7); g.stroke();
    for (const p of pulsos) {
      if (p.estado !== 'viene') continue;
      const x = posX(p); if (x < 170 || x > 412) continue;
      g.fillStyle = '#ff9fdc'; g.beginPath(); g.arc(x, 110, 13, 0, 7); g.fill();
    }
    // Músculos y huesos
    g.fillStyle = '#1a2342'; g.fillRect(170, 170, 220, 14);
    g.fillStyle = '#5be08a'; g.fillRect(170, 170, 220 * Math.min(1, aciertos / necesarios), 14);
    texto(g, `💪 Músculos y huesos: ${aciertos} / ${necesarios}`, 170, 162, '#fff', 14);
    texto(g, 'Pulsa Espacio cuando el círculo está dentro del aro', 12, 24, '#fff', 15);
    if (ultimo) texto(g, ultimo, 300, 78, ultimo === '¡Bien!' ? '#5be08a' : '#ffd166', 14);
    if (aciertos >= necesarios) { ganado('ejercicio'); terminar(true); return false; }
    if (!proximo) { terminar(false, 'Mira el círculo, no el aro: pulsa justo cuando entra en el aro. Ve contando el ritmo en voz baja.'); return false; }
  });
  return () => { detener(); window.removeEventListener('keydown', tecla); };
}

/**
 * VENTANA DE CONTACTO — el satélite solo puede enviar datos mientras PASA sobre la
 * estación terrena. La ventana dura poco y no alcanza para todo: envía primero
 * los paquetes ★★★ (los más importantes). Clic en un paquete para enviarlo.
 */
export function ventana(area, terminar, op = {}) {
  const duracion = op.segundos ?? 16;
  const { c, g } = lienzo(area, 420, 150);
  const lista = document.createElement('div');
  lista.className = 'paquetes';
  area.appendChild(lista);
  const PAQ = [
    { nombre: 'Foto de un volcán', estrellas: 3, mb: 4 }, { nombre: 'Estado de las baterías', estrellas: 3, mb: 2 },
    { nombre: 'Datos del sensor de polvo', estrellas: 3, mb: 3 }, { nombre: 'Foto repetida', estrellas: 1, mb: 4 },
    { nombre: 'Registro de prueba', estrellas: 1, mb: 3 }, { nombre: 'Temperatura de la cámara', estrellas: 2, mb: 2 }
  ].sort(() => Math.random() - 0.5).map((p, i) => ({ ...p, id: i, estado: 'espera' }));
  const VEL = op.velocidad ?? 1.0; // MB por segundo: en 16 s caben 16 MB y hay 18 MB (no alcanza para todo)
  let tiempo = 0; let cola = []; let enviando = null; let progreso = 0;
  function dibujarLista() {
    lista.innerHTML = PAQ.map((p) => `<button class="boton paquete ${p.estado}" data-id="${p.id}" ${p.estado !== 'espera' ? 'disabled' : ''}>
      ${'★'.repeat(p.estrellas)}${'☆'.repeat(3 - p.estrellas)} ${p.nombre} <small>${p.mb} MB</small>${p.estado === 'cola' ? ' ⏳' : p.estado === 'enviado' ? ' ✅' : ''}</button>`).join('');
    lista.querySelectorAll('[data-id]').forEach((b) => { b.onclick = () => { const p = PAQ[Number(b.dataset.id)]; p.estado = 'cola'; cola.push(p); dibujarLista(); }; });
  }
  dibujarLista();
  const detener = reloj((dt) => {
    tiempo += dt;
    const visible = tiempo < duracion;
    if (visible) {
      if (!enviando && cola.length) { enviando = cola.shift(); progreso = 0; }
      if (enviando) { progreso += VEL * dt; if (progreso >= enviando.mb) { enviando.estado = 'enviado'; enviando = null; dibujarLista(); } }
    }
    if (op.pista) Object.assign(op.pista, { lienzo: c, lista, paquetes: PAQ });
    // ---- Dibujo: la estación terrena y el satélite que pasa por encima ----
    g.fillStyle = '#06102a'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#2f6a3a'; g.fillRect(0, 120, 420, 30);
    g.fillStyle = '#dfe6f5'; g.beginPath(); g.arc(210, 118, 14, Math.PI, 0); g.fill(); g.fillRect(208, 118, 4, 8);
    texto(g, 'Estación terrena', 160, 144, '#fff', 12);
    const f = Math.min(1, tiempo / duracion);
    const sx = 30 + f * 360; const sy = 50 - Math.sin(f * Math.PI) * 20;
    g.fillStyle = '#3d77d8'; g.fillRect(sx - 18, sy - 4, 12, 8); g.fillRect(sx + 6, sy - 4, 12, 8);
    g.fillStyle = '#dfe6f5'; g.fillRect(sx - 6, sy - 6, 12, 12);
    if (visible && enviando) { g.strokeStyle = 'rgba(91,224,138,0.7)'; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(sx, sy); g.lineTo(210, 110); g.stroke(); g.setLineDash([]); }
    texto(g, visible ? `📡 Contacto: quedan ${Math.max(0, duracion - tiempo).toFixed(0)} s` : 'Contacto terminado', 12, 20, visible ? '#5be08a' : '#ffd166', 15);
    texto(g, enviando ? `Enviando: ${enviando.nombre} (${Math.min(100, progreso / enviando.mb * 100).toFixed(0)}%)` : 'Clic en un paquete para enviarlo', 12, 40, '#c8d2ec', 13);
    const importantes = PAQ.filter((p) => p.estrellas === 3);
    if (importantes.every((p) => p.estado === 'enviado')) { ganado('ventana'); terminar(true); return false; }
    if (!visible) { terminar(false, 'No alcanza para todo: envía primero los ★★★ y deja para el próximo contacto los de ★.'); return false; }
  });
  return () => detener();
}
