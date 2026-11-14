// =============================================================
// Minijuegos del CIENTÍFICO / MÉDICO (segmento de usuario). Inspirados en hechos
// reales (ver src/data/hechos_reales.json):
//   filtro     · Filtro de aire improvisado: el repuesto es cuadrado y la entrada redonda
//                (Apolo 13, 1970: se usaron bolsas de plástico, cartón y cinta).
//   equilibrio · Equilibrar el oxígeno: producir tanto como consume la tripulación.
//   huerto     · Huerto espacial: luz y agua justas (en la Estación Espacial se cultiva lechuga).
//   secuencia  · Analizar una muestra (se usa en la superficie): secuencia larga con distractores.
// op = valores del destino (dificultad.json → minijuegosPorDestino).
// =============================================================
import { lienzo, mezclar, azar, texto } from './base.js';

const ganado = (id, datos = {}) => window.dispatchEvent(new CustomEvent('minijuego-ganado', { detail: { id, ...datos } }));

/**
 * FILTRO — sube el CO₂. El filtro de repuesto es CUADRADO y la entrada es REDONDA:
 * no encaja. Arma un adaptador con lo que hay a bordo: elige una pieza y después
 * el paso donde va. Hay objetos que no sirven (distractores).
 */
export function filtro(area, terminar, op = {}) {
  const pasos = [
    { id: 'forma', texto: '1. Dar forma para unir lo cuadrado con lo redondo', correcta: 'Cartón' },
    { id: 'cubrir', texto: '2. Cubrir para que el aire pase por el filtro', correcta: 'Bolsa de plástico' },
    { id: 'sellar', texto: '3. Sellar los bordes para que no se escape el aire', correcta: 'Cinta' }
  ];
  const porQueNo = {
    'Cartón': 'El cartón sirve para dar forma, no para eso.',
    'Bolsa de plástico': 'La bolsa cubre, pero no da forma ni sella los bordes.',
    'Cinta': 'La cinta pega y sella, pero sola no da forma ni cubre.',
    'Tijeras': 'Las tijeras cortan, pero no tapan ni sellan nada.',
    'Cuaderno': 'El papel se rompe y deja pasar el aire.',
    'Guante': 'Un guante no tiene la forma ni el tamaño justos.',
    'Linterna': 'La linterna no sirve para armar un adaptador.',
    'Cuchara': 'Una cuchara no tapa ni sella.',
    'Calcetín': 'La tela deja pasar el aire por todos lados.'
  };
  const distractores = mezclar(['Tijeras', 'Cuaderno', 'Guante', 'Linterna', 'Cuchara', 'Calcetín']).slice(0, op.distractores ?? 3);
  const objetos = mezclar(['Cartón', 'Bolsa de plástico', 'Cinta', ...distractores]);
  let co2 = 30; let elegido = null; const colocado = {}; let errores = 0;
  const caja = document.createElement('div');
  caja.className = 'filtro';
  area.appendChild(caja);
  function dibujar(msg = 'Elige un objeto y después el paso donde va.') {
    caja.innerHTML = `
      <div class="co2"><span>CO₂</span><div class="hv-barra"><div style="width:${co2}%;background:${co2 > 70 ? '#e5484d' : '#f2c14e'}"></div></div><b>${co2.toFixed(0)}%</b></div>
      <p class="filtro-idea">⬛ filtro cuadrado → ⚫ entrada redonda: no encaja</p>
      <div class="filtro-objetos">${objetos.map((o) => `<button class="boton f-obj ${elegido === o ? 'elegido' : ''}" data-o="${o}" ${Object.values(colocado).includes(o) ? 'disabled' : ''}>${o}</button>`).join('')}</div>
      <div class="filtro-pasos">${pasos.map((p) => `<button class="boton f-paso ${colocado[p.id] ? 'listo' : ''}" data-p="${p.id}">${p.texto}${colocado[p.id] ? ` ✅ ${colocado[p.id]}` : ''}</button>`).join('')}</div>
      <p class="consola-msg">${msg}</p>`;
    caja.querySelectorAll('.f-obj').forEach((b) => { b.onclick = () => { elegido = b.dataset.o; dibujar(`Elegiste: ${elegido}. ¿En qué paso va?`); }; });
    caja.querySelectorAll('.f-paso').forEach((b) => {
      b.onclick = () => {
        if (!elegido) return dibujar('Primero elige un objeto.');
        const p = pasos.find((x) => x.id === b.dataset.p);
        if (colocado[p.id]) return;
        if (elegido === p.correcta) {
          colocado[p.id] = elegido; elegido = null;
          if (pasos.every((x) => colocado[x.id])) { ganado('filtro'); return terminar(true); }
          dibujar('¡Bien! Sigue con el próximo paso.');
        } else {
          errores++; co2 = Math.min(100, co2 + 8);
          const m = porQueNo[elegido]; elegido = null;
          dibujar(`❌ ${m}`);
        }
      };
    });
  }
  dibujar();
  const reloj = setInterval(() => {
    co2 = Math.min(100, co2 + (op.subidaCO2 ?? 2.4) * 0.25);
    const barra = caja.querySelector('.co2 .hv-barra > div');
    if (barra) { barra.style.width = `${co2}%`; caja.querySelector('.co2 b').textContent = `${co2.toFixed(0)}%`; }
    if (co2 >= 100) { clearInterval(reloj); terminar(false, 'Piensa para qué sirve cada cosa: algo para DAR FORMA, algo para CUBRIR y algo para SELLAR. En el Apolo 13 se usaron bolsas de plástico, cartón y cinta.'); }
  }, 250);
  return () => clearInterval(reloj);
}

/**
 * EQUILIBRIO — el oxígeno sube si produces más de lo que se consume y baja si produces menos.
 * El consumo cambia (ejercicio, descanso). La producción tarda en responder (retardo).
 * Mantén el nivel en la zona segura (verde) el tiempo pedido.
 */
export function equilibrio(area, terminar, op = {}) {
  const meta = op.segundos ?? 12;
  const retardo = op.retardo ?? 0.6;
  const { c, g } = lienzo(area, 420, 220);
  const ctrl = document.createElement('input');
  ctrl.type = 'range'; ctrl.min = 0; ctrl.max = 10; ctrl.step = 0.1; ctrl.value = 2; ctrl.className = 'dial';
  area.appendChild(ctrl);
  const actividades = [
    { nombre: '😴 Descansando', consumo: 3 }, { nombre: '🧑‍🔬 Trabajando', consumo: 5 }, { nombre: '🏋 Haciendo ejercicio', consumo: 8 }
  ];
  let act = actividades[1]; let nivel = 50; let produccion = 2; let enZona = 0; let cambios = 0; let proxCambio = azar(3, 5);
  const tecla = (e) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') ctrl.value = Math.min(10, Number(ctrl.value) + 0.5);
    if (e.code === 'ArrowDown' || e.code === 'KeyS') ctrl.value = Math.max(0, Number(ctrl.value) - 0.5);
  };
  window.addEventListener('keydown', tecla);
  let anterior = performance.now();
  let id = requestAnimationFrame(cuadro);
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - anterior) / 1000); anterior = ahora;
    proxCambio -= dt;
    if (proxCambio <= 0 && cambios < (op.cambios ?? 2)) { act = actividades[(actividades.indexOf(act) + 1 + Math.floor(Math.random() * 2)) % 3]; cambios++; proxCambio = azar(3, 5); }
    // La producción real sigue al control con retardo
    produccion += (Number(ctrl.value) - produccion) * Math.min(1, dt / retardo);
    nivel += (produccion - act.consumo) * 2.2 * dt;
    nivel = Math.max(0, Math.min(100, nivel));
    const seguro = nivel > 40 && nivel < 60;
    enZona = seguro ? enZona + dt : enZona;
    // Dibujo
    g.fillStyle = '#04101f'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#1a2342'; g.fillRect(30, 20, 60, 180);
    g.fillStyle = 'rgba(60,196,110,0.35)'; g.fillRect(30, 20 + 180 * 0.4, 60, 180 * 0.2);
    g.fillStyle = seguro ? '#5be08a' : nivel < 20 || nivel > 80 ? '#e5484d' : '#7cc4ff'; g.fillRect(30, 200 - nivel * 1.8, 60, nivel * 1.8);
    texto(g, 'O₂', 46, 214, '#fff', 14);
    texto(g, `Tripulación: ${act.nombre}`, 110, 40, '#ffd166', 16);
    texto(g, `Consumo: ${act.consumo.toFixed(1)}`, 110, 75, '#ff9f9f', 18);
    texto(g, `Producción: ${produccion.toFixed(1)}`, 110, 105, '#9fe0ff', 18);
    texto(g, produccion > act.consumo + 0.4 ? '⬆ sube' : produccion < act.consumo - 0.4 ? '⬇ baja' : '➡ estable', 110, 135, '#fff', 18);
    texto(g, `Zona segura: ${Math.min(meta, enZona).toFixed(1)} / ${meta} s`, 110, 175, '#5be08a', 16);
    if (enZona >= meta) { ganado('equilibrio'); return terminar(true); }
    if (nivel <= 15 || nivel >= 85) return terminar(false, nivel <= 15 ? 'El oxígeno bajó demasiado: la PRODUCCIÓN tiene que ser igual al CONSUMO. Cuando la tripulación hace ejercicio, consume más.' : 'Demasiado oxígeno también es peligroso: baja la producción hasta igualar el consumo.');
    id = requestAnimationFrame(cuadro);
  }
  return () => { cancelAnimationFrame(id); window.removeEventListener('keydown', tecla); };
}

/**
 * HUERTO — cada planta necesita luz y agua en su rango (zona verde de cada barra).
 * Elige una planta y ajusta sus controles. Crece solo si las DOS cosas están bien;
 * demasiada agua ahoga las raíces.
 */
export function huerto(area, terminar, op = {}) {
  const nombres = mezclar(['🥬 Lechuga', '🌱 Rábano', '🍅 Tomate', '🌿 Albahaca']).slice(0, op.plantas ?? 2);
  const plantas = nombres.map((n) => {
    const l = azar(20, 60); const a = azar(20, 60);
    return { n, luz: azar(0, 100), agua: azar(0, 100), lMin: l, lMax: l + 22, aMin: a, aMax: a + 22, crec: 0 };
  });
  let sel = 0;
  const caja = document.createElement('div');
  caja.className = 'huerto';
  area.appendChild(caja);
  function dibujar() {
    caja.innerHTML = `
      <div class="fila">${plantas.map((p, i) => `<button class="boton h-planta ${i === sel ? 'activo' : ''}" data-i="${i}">${p.n} ${p.crec >= 100 ? '✅' : `${p.crec.toFixed(0)}%`}</button>`).join('')}</div>
      ${['luz', 'agua'].map((k) => {
        const p = plantas[sel];
        const min = k === 'luz' ? p.lMin : p.aMin; const max = k === 'luz' ? p.lMax : p.aMax;
        return `<label>${k === 'luz' ? '💡 Luz' : '💧 Agua'}<div class="riel"><div class="zona" style="left:${min}%;width:${max - min}%"></div>
          <input type="range" min="0" max="100" value="${p[k]}" data-k="${k}"></div></label>`;
      }).join('')}
      <p class="consola-msg"></p>`;
    caja.querySelectorAll('.h-planta').forEach((b) => { b.onclick = () => { sel = Number(b.dataset.i); dibujar(); }; });
    caja.querySelectorAll('input').forEach((inp) => { inp.oninput = () => { plantas[sel][inp.dataset.k] = Number(inp.value); }; });
  }
  dibujar();
  const reloj = setInterval(() => {
    let msg = '';
    for (const p of plantas) {
      const luzOk = p.luz >= p.lMin && p.luz <= p.lMax;
      const aguaOk = p.agua >= p.aMin && p.agua <= p.aMax;
      if (luzOk && aguaOk) p.crec = Math.min(100, p.crec + 100 / ((op.segundos ?? 8) * 4));
      else { p.crec = Math.max(0, p.crec - 1.5); if (p.agua > p.aMax + 15 && p === plantas[sel]) msg = '💧 ¡Demasiada agua! Las raíces se ahogan.'; }
    }
    caja.querySelectorAll('.h-planta').forEach((b, i) => { b.textContent = `${plantas[i].n} ${plantas[i].crec >= 100 ? '✅' : `${plantas[i].crec.toFixed(0)}%`}`; });
    caja.querySelector('.consola-msg').textContent = msg || 'Pon cada barra en su zona verde. Cada planta necesita algo distinto.';
    if (plantas.every((p) => p.crec >= 100)) { clearInterval(reloj); ganado('huerto'); terminar(true); }
  }, 250);
  return () => clearInterval(reloj);
}

/**
 * SECUENCIA — analizar una muestra: mira la secuencia de colores y repítela.
 * Es larga (7 a 9), los botones cambian de lugar en cada ronda y hay destellos
 * grises que NO son parte de la secuencia (distractores).
 */
export function secuencia(area, terminar, op = {}) {
  const largo = op.largo ?? 7;
  const colores = mezclar(['#e5484d', '#3d77d8', '#f2c14e', '#3cc46e']);
  const caja = document.createElement('div');
  caja.className = 'secuencia';
  caja.innerHTML = `<p class="consola-msg">Mira la secuencia… (los destellos grises no cuentan)</p><div class="botones4">${colores.map((c, i) => `<button data-i="${i}" style="background:${c}"></button>`).join('')}</div>`;
  area.appendChild(caja);
  const botones = [...caja.querySelectorAll('button')];
  const msg = caja.querySelector('.consola-msg');
  let orden = []; let paso = 0; let mostrando = true; let fallos = 0;
  const timers = [];
  const iluminar = (i, ms, gris = false) => { const b = botones[i]; b.classList.add(gris ? 'gris' : 'luz'); timers.push(setTimeout(() => b.classList.remove('luz', 'gris'), ms)); };
  function nuevaRonda() {
    orden = Array.from({ length: largo }, () => Math.floor(Math.random() * 4));
    paso = 0; mostrando = true; msg.textContent = `Mira la secuencia de ${largo} colores… (los grises no cuentan)`;
    let tt = 500;
    orden.forEach((i) => {
      timers.push(setTimeout(() => iluminar(i, 380), tt));
      tt += 600;
      if (Math.random() < 0.3) { const k = Math.floor(Math.random() * 4); timers.push(setTimeout(() => iluminar(k, 200, true), tt - 150)); }
    });
    timers.push(setTimeout(() => { mostrando = false; msg.textContent = '¡Tu turno! Repite la secuencia (solo los colores).'; }, tt));
  }
  botones.forEach((b) => {
    b.onclick = () => {
      if (mostrando) return;
      const i = Number(b.dataset.i);
      iluminar(i, 180);
      if (i === orden[paso]) { if (++paso === orden.length) { ganado('secuencia'); terminar(true); } }
      else {
        fallos++;
        if (fallos >= 2) return terminar(false, 'Ve diciendo los colores en voz baja mientras aparecen ("rojo, azul, azul…") e ignora los destellos grises: son ruido del analizador.');
        msg.textContent = `¡Ups! Ese era el paso ${paso + 1}. Mira otra vez…`; mostrando = true; timers.push(setTimeout(nuevaRonda, 900));
      }
    };
  });
  nuevaRonda();
  return () => timers.forEach(clearTimeout);
}
