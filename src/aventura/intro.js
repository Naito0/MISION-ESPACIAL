// =============================================================
// intro.js — Cinemática de entrada de Garden Space (video de 30 s con música).
//
// 1) Portada: imagen de fondo + "▶ Ver intro" y "Saltar". Este clic hace falta
//    porque el navegador no deja reproducir video CON SONIDO sin un clic antes.
// 2) Video a pantalla completa con "Saltar ⏭" en la esquina (Esc, Enter y
//    Espacio también saltan).
// 3) Al terminar (o al saltar): fundido corto a negro → menú, y el <video> se
//    saca de la página.
// Mientras se ve, main3d.js no dibuja la escena 3D y el audio del juego se pausa.
// Si el video falla o no carga, se va directo al menú (nunca queda en negro).
// Los archivos están en public/intro/ (se copian tal cual a dist/intro/).
// =============================================================
import { pausarAudio } from './audio.js';

const BASE = import.meta.env.BASE_URL; // './' (funciona en GitHub Pages bajo /MISION-ESPACIAL/)
const VIDEO = `${BASE}intro/garden-space-intro.mp4`;
const IMAGEN = `${BASE}intro/garden-space-intro.jpg`;
const CLAVE = 'gardenSpace.introVista';
const FUNDIDO_MS = 450;

let activa = false;

/** true mientras la intro está en pantalla (main3d.js no dibuja el 3D). */
export const introActiva = () => activa;

/** ¿El jugador ya vio (o saltó) la intro alguna vez en este navegador? */
export function introYaVista() {
  try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; }
}
function marcarVista() {
  try { localStorage.setItem(CLAVE, '1'); } catch { /* sin almacenamiento: se verá otra vez */ }
}

/** ¿Entró con un enlace o código de sala (?sala=ABCD / ?codigo=ABCD / #sala=ABCD)? Entonces no hay intro. */
export function entraConSala() {
  try {
    const p = new URLSearchParams(location.search);
    return p.has('sala') || p.has('codigo') || /(^|[#&])(sala|codigo)=/i.test(location.hash);
  } catch { return false; }
}

/**
 * Muestra la intro.
 * @param o.portada true = primero la portada con "Ver intro" (al abrir el juego);
 *                  false = el video directo (botón del menú: ese clic ya permite el sonido)
 * @param o.alTerminar se llama una sola vez al final (visto, saltado o con error)
 */
export function mostrarIntro({ portada = true, alTerminar } = {}) {
  if (activa) return;
  activa = true;
  pausarAudio(true);

  const capa = document.createElement('div');
  capa.id = 'intro';
  capa.style.backgroundImage = `url("${IMAGEN}")`;
  const negro = document.createElement('div');
  negro.className = 'intro-negro';
  capa.appendChild(negro);
  document.body.appendChild(capa);

  let video = null;
  let terminado = false;
  let reloj = null;

  function terminar() {
    if (terminado) return;
    terminado = true;
    clearTimeout(reloj);
    window.removeEventListener('keydown', teclas, true);
    marcarVista();
    // Fundido a negro → se saca el video → la capa se desvanece y aparece el menú
    negro.classList.add('visible');
    setTimeout(() => {
      if (video) { video.pause(); video.removeAttribute('src'); video.load(); video.remove(); video = null; }
      capa.querySelectorAll('.intro-portada, .intro-saltar').forEach((x) => x.remove());
      capa.style.backgroundImage = 'none';
      activa = false;
      pausarAudio(false);
      capa.classList.add('saliendo');
      setTimeout(() => capa.remove(), FUNDIDO_MS);
      alTerminar?.();
    }, FUNDIDO_MS);
  }

  // Esc, Enter y Espacio saltan el video; en la portada, Esc salta (Enter/Espacio pulsan el botón con foco)
  function teclas(e) {
    if (!['Escape', 'Enter', ' ', 'Spacebar'].includes(e.key)) return;
    e.stopImmediatePropagation(); // que el juego no reaccione a esta tecla
    if (video || e.key === 'Escape') { e.preventDefault(); terminar(); }
  }
  window.addEventListener('keydown', teclas, true);

  function reproducir() {
    capa.querySelector('.intro-portada')?.remove();
    capa.style.backgroundImage = 'none';
    video = document.createElement('video');
    video.className = 'intro-video';
    video.src = VIDEO;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'auto';
    video.addEventListener('ended', terminar);
    video.addEventListener('error', terminar);
    // Si en 10 s no empezó (red lenta, archivo que no está), se va al menú
    reloj = setTimeout(terminar, 10000);
    video.addEventListener('playing', () => { clearTimeout(reloj); reloj = null; }, { once: true });
    // Seguro extra: si se traba a mitad, termina igual (duración + 5 s)
    video.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(video.duration)) setTimeout(() => { if (!terminado) terminar(); }, (video.duration + 5) * 1000);
    }, { once: true });
    capa.insertBefore(video, negro);

    const saltar = document.createElement('button');
    saltar.className = 'intro-boton intro-saltar';
    saltar.textContent = 'Saltar ⏭';
    saltar.onclick = terminar;
    capa.appendChild(saltar);

    const p = video.play();
    if (p && p.catch) p.catch(terminar); // el navegador no dejó reproducir: al menú
  }

  if (portada) {
    const caja = document.createElement('div');
    caja.className = 'intro-portada';
    caja.innerHTML = `
      <h1 class="solo-lectores">Garden Space</h1>
      <div class="intro-botones">
        <button class="intro-boton intro-ver">▶ Ver intro</button>
        <button class="intro-boton intro-secundario">Saltar</button>
      </div>`;
    caja.querySelector('.intro-ver').onclick = reproducir;
    caja.querySelector('.intro-secundario').onclick = terminar;
    capa.appendChild(caja);
    caja.querySelector('.intro-ver').focus();
  } else {
    reproducir();
  }
}
