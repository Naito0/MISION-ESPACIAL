// =============================================================
// viaje.js — Reglas del VIAJE (funciones puras, se pueden probar).
// - La nave tiene vida compartida.
// - Cada cierto tiempo aparece una emergencia para un rol, en una consola.
// - Si no se resuelve a tiempo, la nave pierde vida.
// - Si falta la pieza "agravante" del diseño, esa emergencia sale el doble
//   de seguido y daña 50% más.
// - Al terminar el tiempo de viaje con vida > 0 → se llega al destino.
//   Si la vida llega a 0 → la misión fracasa.
// =============================================================

/** Estado inicial del viaje. diseno = { blindaje, motor, energia, reciclador, laboratorio, antena, computadora } (true = protegido) */
export function nuevoViaje(config, diseno = {}) {
  return {
    duracion: config.duracionViaje,
    restante: config.duracionViaje,
    vida: config.vidaInicial,
    emergencias: [],          // activas: { uid, id, nombre, rol, consola, minijuego, efecto, restante, limite, danio }
    registro: [],             // historia para el informe: { id, nombre, rol, resultado, agravada, t }
    proxima: 6,               // segundos hasta la próxima emergencia
    ultimaPorRol: {},         // para no repetir la misma tarea dos veces seguidas
    contador: 0,
    diseno,
    terminado: null           // null | 'llegada' | 'fracaso'
  };
}

/** ¿Esta emergencia está agravada por el diseño (falta su pieza protectora)? */
export function estaAgravada(emergencia, diseno) {
  return !!emergencia.agravante && !diseno[emergencia.agravante];
}

/** Elige una emergencia al azar respetando las reglas. Devuelve null si no hay ninguna posible. */
export function elegirEmergencia(v, catalogo, rng = Math.random) {
  const ocupadas = new Set(v.emergencias.map((e) => e.consola));
  const candidatas = catalogo.filter((e) =>
    !ocupadas.has(e.consola) &&                    // una emergencia por consola
    v.ultimaPorRol[e.rol] !== e.id &&               // no repetir la misma tarea seguida en un rol
    !v.emergencias.some((a) => a.rol === e.rol));   // un rol no recibe dos a la vez
  if (!candidatas.length) return null;
  const pesos = candidatas.map((e) => (estaAgravada(e, v.diseno) ? 2 : 1));
  let r = rng() * pesos.reduce((s, p) => s + p, 0);
  for (let i = 0; i < candidatas.length; i++) {
    r -= pesos[i];
    if (r <= 0) return candidatas[i];
  }
  return candidatas[candidatas.length - 1];
}

/**
 * Avanza el viaje dt segundos. Devuelve una lista de "sucesos" (para avisar a los jugadores).
 */
export function avanzarViaje(v, dt, catalogo, config, rng = Math.random) {
  const sucesos = [];
  if (v.terminado) return sucesos;
  v.restante = Math.max(0, v.restante - dt);

  // ¿Aparece una emergencia nueva?
  v.proxima -= dt;
  // Si ya está el máximo de emergencias, la siguiente espera: así, al resolver una,
  // hay un respiro antes de la próxima (no aparece otra al instante)
  if (v.emergencias.length >= config.maxSimultaneas) v.proxima = Math.max(v.proxima, config.intervaloMin * 0.5);
  if (v.proxima <= 0 && v.emergencias.length < config.maxSimultaneas && v.restante > 12) {
    const e = elegirEmergencia(v, catalogo, rng);
    if (e) {
      const agravada = estaAgravada(e, v.diseno);
      v.contador++;
      v.emergencias.push({
        uid: v.contador, id: e.id, nombre: e.nombre, rol: e.rol, consola: e.consola, minijuego: e.minijuego,
        efecto: e.efecto, descripcion: e.descripcion, limite: config.tiempoParaResolver, restante: config.tiempoParaResolver,
        // factorDanio (dificultad): en Fácil la vida baja más lento
        danio: Math.max(1, Math.round(e.danio * (agravada ? 1.5 : 1) * (config.factorDanio ?? 1))), agravada
      });
      v.ultimaPorRol[e.rol] = e.id;
      sucesos.push({ tipo: 'nueva', nombre: e.nombre, rol: e.rol });
    }
    // Sin la pieza protectora, las emergencias llegan más seguido
    const agravantes = catalogo.filter((c) => estaAgravada(c, v.diseno)).length / catalogo.length;
    const factor = 1 - agravantes * 0.35;
    v.proxima = (config.intervaloMin + rng() * (config.intervaloMax - config.intervaloMin)) * factor;
  }

  // Tiempo de cada emergencia: si se acaba, la nave pierde vida
  for (const e of [...v.emergencias]) {
    e.restante -= dt;
    if (e.restante <= 0) {
      v.vida = Math.max(0, v.vida - e.danio);
      v.emergencias = v.emergencias.filter((x) => x.uid !== e.uid);
      v.registro.push({ id: e.id, nombre: e.nombre, rol: e.rol, resultado: 'fallida', agravada: e.agravada, danio: e.danio, t: v.duracion - v.restante });
      sucesos.push({ tipo: 'fallida', nombre: e.nombre, danio: e.danio });
    }
  }

  if (v.vida <= 0) { v.terminado = 'fracaso'; sucesos.push({ tipo: 'fracaso' }); }
  else if (v.restante <= 0) { v.terminado = 'llegada'; sucesos.push({ tipo: 'llegada' }); }
  return sucesos;
}

/** Un jugador resolvió (o falló) el minijuego de una emergencia. */
export function resolverEmergencia(v, uid, rolesDelJugador, exito) {
  const e = v.emergencias.find((x) => x.uid === uid);
  if (!e) return { error: 'Esa emergencia ya no está activa.' };
  if (!rolesDelJugador.includes(e.rol)) return { error: 'Esa tarea es de otro rol.' };
  if (!exito) return { ok: true, sigue: true }; // puede volver a intentarlo mientras quede tiempo
  v.emergencias = v.emergencias.filter((x) => x.uid !== uid);
  v.registro.push({ id: e.id, nombre: e.nombre, rol: e.rol, resultado: 'resuelta', agravada: e.agravada, danio: 0, t: v.duracion - v.restante });
  return { ok: true };
}
