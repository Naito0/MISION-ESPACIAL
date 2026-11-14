// =============================================================
// tarjetas.js — Tarjetas con PAUSA REAL.
// Mientras una tarjeta está en pantalla, todo se congela (pausa.js):
// el movimiento, los cronómetros y las emergencias nuevas. El juego sigue
// cuando el jugador pulsa "Entendido". Nunca hay dos tarjetas a la vez:
// si se piden varias, esperan en fila.
//
//   await mostrarTarjeta({ etiqueta, icono, titulo, frase, detalle, fuente })
//   await mostrarDiagnostico(diagnostico)  → cuando acierta
// =============================================================
import { pausar } from '../pausa.js';
import { efecto } from '../audio.js';

let cadena = Promise.resolve(); // fila: cada tarjeta espera a la anterior
const dominio = (url) => { try { return new URL(url).hostname; } catch { return url || ''; } };

/** Crea el fondo oscuro y la caja; devuelve { capa, caja, cerrar }. */
function modal(clase) {
  if (document.pointerLockElement) { window.consolaAbierta = true; document.exitPointerLock(); }
  const soltar = pausar(`tarjeta-${clase}`);
  const capa = document.createElement('div');
  capa.className = 'consola-capa capa-tarjeta';
  const caja = document.createElement('div');
  caja.className = `panel tarjeta-modal ${clase}`;
  capa.appendChild(caja);
  document.getElementById('hud').appendChild(capa);
  window.consolaAbierta = true;
  return {
    capa, caja,
    cerrar() { capa.remove(); window.consolaAbierta = false; soltar(); }
  };
}

/**
 * Tarjeta corta: UNA idea (icono + frase con un número). El detalle va en "Ver más".
 * t = { etiqueta: '💡 ¿Qué aprendiste?' | '📜 Esto pasó de verdad', icono, titulo, frase, detalle?, fuente?, boton? }
 */
export function mostrarTarjeta(t) {
  cadena = cadena.then(() => new Promise((listo) => {
    const m = modal('corta');
    m.caja.innerHTML = `
      <div class="tm-etiqueta">${t.etiqueta || ''}</div>
      <div class="tm-icono">${t.icono || '💡'}</div>
      ${t.titulo ? `<h3>${t.titulo}</h3>` : ''}
      <p class="tm-frase">${t.frase}</p>
      ${t.detalle ? `<button class="tm-mas">Ver más ▾</button><div class="tm-detalle" hidden>${t.detalle}${t.fuente ? `<br><small>Fuente: ${dominio(t.fuente)}</small>` : ''}</div>` : ''}
      <button class="boton tm-ok">${t.boton || '¡Entendido!'}</button>`;
    efecto('exito');
    const mas = m.caja.querySelector('.tm-mas');
    if (mas) mas.onclick = () => { const d = m.caja.querySelector('.tm-detalle'); d.hidden = !d.hidden; mas.textContent = d.hidden ? 'Ver más ▾' : 'Ver menos ▴'; };
    const ok = m.caja.querySelector('.tm-ok');
    ok.focus();
    ok.onclick = () => { m.cerrar(); listo(); };
  }));
  return cadena;
}

/**
 * Diagnóstico: una pregunta para pensar antes de arreglar.
 * Si la respuesta es incorrecta, explica por qué y deja elegir otra.
 * Se resuelve (Promise) cuando acierta y pulsa "¡A arreglarlo!".
 */
export function mostrarDiagnostico(d, titulo = 'Diagnóstico') {
  cadena = cadena.then(() => new Promise((listo) => {
    const m = modal('diagnostico');
    const letras = ['A', 'B', 'C', 'D'];
    m.caja.innerHTML = `
      <div class="tm-etiqueta">🔎 ${titulo}: piensa antes de arreglar</div>
      <h3>${d.pregunta}</h3>
      <div class="dg-opciones">${d.opciones.map((o, i) => `<button class="boton dg-op" data-i="${i}"><b>${letras[i]})</b> ${o.texto}</button>`).join('')}</div>
      <p class="dg-explica"></p>
      <button class="boton tm-ok" hidden>🛠 ¡A arreglarlo!</button>`;
    let intentos = 0;
    m.caja.querySelectorAll('.dg-op').forEach((b) => {
      b.onclick = () => {
        const o = d.opciones[Number(b.dataset.i)];
        intentos++;
        const p = m.caja.querySelector('.dg-explica');
        if (o.correcta) {
          b.classList.add('correcta');
          m.caja.querySelectorAll('.dg-op').forEach((x) => { x.disabled = true; });
          p.innerHTML = `✅ <b>¡Bien pensado!</b> ${o.porque}`;
          efecto('exito');
          const ok = m.caja.querySelector('.tm-ok');
          ok.hidden = false;
          ok.focus();
          ok.onclick = () => { m.cerrar(); listo({ intentos }); };
        } else {
          b.classList.add('incorrecta');
          b.disabled = true;
          p.innerHTML = `❌ <b>No es eso.</b> ${o.porque} <i>Prueba con otra.</i>`;
          efecto('error');
        }
      };
    });
  }));
  return cadena;
}

/**
 * Predicción: una sola pregunta con botones grandes ANTES de actuar.
 * Se resuelve con true (acertó) o false.
 */
export function mostrarPrediccion(p) {
  cadena = cadena.then(() => new Promise((listo) => {
    const m = modal('prediccion');
    m.caja.innerHTML = `
      <div class="tm-etiqueta">🤔 Antes de comprar: ¿qué crees?</div>
      <h3>${p.pregunta}</h3>
      <div class="pr-opciones">${p.opciones.map((o, i) => `<button class="boton pr-op" data-i="${i}">${o}</button>`).join('')}</div>`;
    m.caja.querySelectorAll('.pr-op').forEach((b) => {
      b.onclick = () => { m.cerrar(); listo(Number(b.dataset.i) === p.correcta); };
    });
  }));
  return cadena;
}

/** ¿Hay alguna tarjeta abierta? */
export const hayTarjeta = () => !!document.querySelector('.capa-tarjeta');
