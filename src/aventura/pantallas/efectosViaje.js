// =============================================================
// efectosViaje.js — Cómo se VEN las emergencias dentro de la nave:
//   alarma → luz roja que late · apagon → se apagan las luces
//   tormenta → destellos violeta · vapor → nubes de vapor en la consola
//   reactor → luz naranja que late · meteoritos → la nave tiembla
// Además: marca "!" flotante sobre cada consola con una emergencia.
// =============================================================
import * as THREE from 'three';

function texturaSigno(texto, color) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = color; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 84px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(texto, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function crearEfectosViaje(escena, esc, luces, camara, conParticulas) {
  const alarma = new THREE.PointLight(0xff2020, 0, 60);
  alarma.position.set(0, 3.5, -10);
  escena.add(alarma);
  const tormenta = new THREE.PointLight(0xb070ff, 0, 80);
  tormenta.position.set(0, 4, -14);
  escena.add(tormenta);
  const base = { hemi: luces.hemisferica.intensity, sol: luces.sol.intensity };
  const texMia = texturaSigno('!', '#e5484d');
  const texOtra = texturaSigno('!', '#5b6275');

  // Por consola: marca "!", luz y vapor
  const porConsola = new Map();
  for (const c of esc.consolas) {
    const pos = new THREE.Vector3();
    c.grupo.getWorldPosition(pos);
    const marca = new THREE.Sprite(new THREE.SpriteMaterial({ map: texMia, depthTest: false, transparent: true }));
    marca.scale.set(0.6, 0.6, 1);
    marca.position.copy(pos).add(new THREE.Vector3(0, 2.3, 0));
    marca.renderOrder = 11;
    marca.visible = false;
    escena.add(marca);
    const luz = new THREE.PointLight(0xff3030, 0, 6);
    luz.position.copy(pos).add(new THREE.Vector3(0, 1.8, 0));
    escena.add(luz);
    // Vapor: unos cuantos puntos blancos que suben
    const n = conParticulas ? 40 : 15;
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(n * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const vapor = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xe8f0ff, size: 0.35, transparent: true, opacity: 0.55, depthWrite: false }));
    vapor.visible = false;
    escena.add(vapor);
    const semillas = Array.from({ length: n }, () => Math.random());
    porConsola.set(c.id, { pos, marca, luz, vapor, arr, geo, semillas });
  }

  let inicioAlarma = null; // cuándo empezó la alarma (para el pulso único)
  return {
    /** emergencias: lista activa del servidor; misRoles: mis roles */
    actualizar(dt, t, emergencias, misRoles) {
      // SIN DESTELLOS (regla del juego: nada destella más de 3 veces por segundo, por las
      // personas sensibles y porque se proyecta): al llegar una emergencia hay UN pulso
      // suave de luz y después queda un brillo fijo y tenue. Sin parpadeos ni sacudidas.
      const efectos = new Set(emergencias.map((e) => e.efecto));
      const hayAlarma = efectos.has('alarma') || efectos.has('meteoritos') || efectos.has('reactor');
      if (hayAlarma && inicioAlarma === null) inicioAlarma = t;
      if (!hayAlarma) inicioAlarma = null;
      const k = inicioAlarma === null ? 0 : Math.min(1, (t - inicioAlarma) / 1.2);
      const pulso = Math.sin(k * Math.PI); // sube y baja UNA vez en 1,2 s
      alarma.intensity = hayAlarma ? 5 + 15 * pulso : 0;
      alarma.color.setHex(efectos.has('reactor') && !efectos.has('alarma') ? 0xff8a20 : 0xff2020);
      // Apagón: las luces bajan (fijas, sin parpadear)
      const apagon = efectos.has('apagon');
      luces.hemisferica.intensity = apagon ? base.hemi * 0.35 : base.hemi;
      luces.sol.intensity = apagon ? base.sol * 0.35 : base.sol;
      // Tormenta solar: un brillo violeta suave que cambia muy despacio
      tormenta.intensity = efectos.has('tormenta') ? 10 + 4 * Math.sin(t * 1.2) : 0;
      const latido = 0.5; // las luces de las consolas quedan fijas
      for (const [id, o] of porConsola) {
        const e = emergencias.find((x) => x.consola === id);
        o.marca.visible = !!e;
        o.luz.intensity = e ? 6 + 6 * latido : 0;
        o.vapor.visible = !!e && e.efecto === 'vapor';
        if (e) {
          o.marca.material.map = misRoles.includes(e.rol) ? texMia : texOtra;
          o.marca.position.y = o.pos.y + 2.3 + Math.sin(t * 3) * 0.12;
        }
        if (o.vapor.visible) {
          o.semillas.forEach((s, i) => {
            const k = (t * 0.6 + s) % 1;
            o.arr[i * 3] = o.pos.x + Math.sin(s * 40 + t) * (0.3 + k);
            o.arr[i * 3 + 1] = o.pos.y + 0.8 + k * 2.4;
            o.arr[i * 3 + 2] = o.pos.z + Math.cos(s * 30 + t) * (0.3 + k);
          });
          o.geo.attributes.position.needsUpdate = true;
        }
      }
    },
    posicionConsola(id) { return porConsola.get(id)?.pos; },
    apagarTodo() {
      alarma.intensity = 0; tormenta.intensity = 0;
      luces.hemisferica.intensity = base.hemi; luces.sol.intensity = base.sol;
      for (const o of porConsola.values()) { o.marca.visible = false; o.luz.intensity = 0; o.vapor.visible = false; }
    }
  };
}
