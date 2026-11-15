// =============================================================
// viaje.js — Reglas del VIAJE (funciones puras, se pueden probar).
// - La nave tiene vida compartida.
// - Hay POCAS emergencias por viaje (config.emergenciasPorViaje: 3 o 4),
//   como máximo UNA por rol, y siempre de a una.
// - Después de cada emergencia hay CALMA (config.calmaMin..calmaMax segundos,
//   30 a 45) para explorar sin eventos.
// - Mientras hay una emergencia, el reloj de llegada se detiene: así cada
//   emergencia se puede resolver con calma (aviso → diagnóstico → minijuego).
// - Si no se resuelve a tiempo, la nave pierde vida. Si falta la pieza
//   "agravante" del diseño, esa emergencia es más probable y daña 50% más.
// - Al terminar el tiempo de viaje con vida > 0 → se llega al destino.
//   Si la vida llega a 0 → la misión fracasa.
// (Si la config no trae emergenciasPorViaje, funciona como antes: emergencias
//  cada intervaloMin..intervaloMax segundos.)
// =============================================================

/** Estado inicial del viaje. diseno = { blindaje, motor, energia, reciclador, laboratorio, antena, computadora } (true = protegido) */
export function nuevoViaje(config, diseno = {}) {
  return {
    duracion: config.duracionViaje,
    restante: config.duracionViaje,
    vida: config.vidaInicial,
    emergencias: [],          // activas: { uid, id, nombre, rol, consola, minijuego, efecto, restante, limite, danio }
    registro: [],             // historia para el informe: { id, nombre, rol, resultado, agravada, t }
    proxima: config.primeraEmergencia ?? 6, // segundos hasta la próxima emergencia
    ultimaPorRol: {},         // para no repetir la misma tarea dos veces seguidas
    rolesUsados: [],          // modo misión: cada rol recibe como máximo una emergencia por viaje
    lanzadas: 0,
    total: config.emergenciasPorViaje ?? null,
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
    !(v.total && v.rolesUsados.includes(e.rol)) &&  // modo misión: una por rol en todo el viaje
    !(v.leyendo || []).includes(e.rol) &&           // multijugador: su jugador todavía está leyendo una tarjeta
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

/** Segundos de calma después de una emergencia. */
function calma(config, rng) {
  if (config.calmaMin === undefined) return config.intervaloMin * 0.5;
  return config.calmaMin + rng() * (config.calmaMax - config.calmaMin);
}

/**
 * Avanza el viaje dt segundos. Devuelve una lista de "sucesos" (para avisar a los jugadores).
 */
export function avanzarViaje(v, dt, catalogo, config, rng = Math.random) {
  const sucesos = [];
  if (v.terminado) return sucesos;
  const modoMision = !!v.total;
  const hayEmergencia = v.emergencias.length > 0;

  // El reloj de llegada se detiene durante una emergencia (modo misión).
  // Si ya no quedan emergencias por venir, el viaje avanza más rápido (sin tiempo muerto).
  const sinPendientes = modoMision && v.lanzadas >= v.total;
  v.acelerado = sinPendientes && !hayEmergencia;
  const ritmo = v.acelerado ? (config.aceleracionFinal ?? 1) : 1;
  if (!(modoMision && hayEmergencia)) v.restante = Math.max(0, v.restante - dt * ritmo);

  if (modoMision) {
    // Una emergencia a la vez; la siguiente llega después de la calma
    if (!hayEmergencia) v.proxima -= dt;
    if (v.esperarCalma) { v.proxima = calma(config, rng); v.esperarCalma = false; }
    if (!hayEmergencia && v.proxima <= 0 && v.lanzadas < v.total && v.restante > 12) lanzar();
  } else {
    v.proxima -= dt;
    // Si ya está el máximo de emergencias, la siguiente espera: así, al resolver una,
    // hay un respiro antes de la próxima (no aparece otra al instante)
    if (v.emergencias.length >= config.maxSimultaneas) v.proxima = Math.max(v.proxima, calma(config, rng));
    if (v.proxima <= 0 && v.emergencias.length < config.maxSimultaneas && v.restante > 12) {
      lanzar();
      // Sin la pieza protectora, las emergencias llegan más seguido
      const agravantes = catalogo.filter((c) => estaAgravada(c, v.diseno)).length / catalogo.length;
      v.proxima = (config.intervaloMin + rng() * (config.intervaloMax - config.intervaloMin)) * (1 - agravantes * 0.35);
    }
  }

  function lanzar() {
    const e = elegirEmergencia(v, catalogo, rng);
    if (!e) { v.proxima = 5; return; }
    const agravada = estaAgravada(e, v.diseno);
    v.contador++;
    v.lanzadas++;
    v.rolesUsados.push(e.rol);
    v.emergencias.push({
      uid: v.contador, id: e.id, nombre: e.nombre, rol: e.rol, consola: e.consola, minijuego: e.minijuego,
      efecto: e.efecto, descripcion: e.descripcion, limite: config.tiempoParaResolver, restante: config.tiempoParaResolver,
      // factorDanio (dificultad): en Fácil la vida baja más lento
      danio: Math.max(1, Math.round(e.danio * (agravada ? 1.5 : 1) * (config.factorDanio ?? 1))), agravada
    });
    v.ultimaPorRol[e.rol] = e.id;
    sucesos.push({ tipo: 'nueva', nombre: e.nombre, rol: e.rol });
  }

  // Tiempo de cada emergencia: si se acaba, la nave pierde vida
  for (const e of [...v.emergencias]) {
    e.restante -= dt;
    if (e.restante <= 0) {
      v.vida = Math.max(0, v.vida - e.danio);
      v.emergencias = v.emergencias.filter((x) => x.uid !== e.uid);
      v.registro.push({ id: e.id, nombre: e.nombre, rol: e.rol, resultado: 'fallida', agravada: e.agravada, danio: e.danio, t: v.duracion - v.restante });
      v.esperarCalma = true;
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
  v.registro.push({ id: e.id, nombre: e.nombre, rol: e.rol, resultado: 'resuelta', agravada: e.agravada, danio: 0, t: v.duracion - v.restante, segundos: Math.round(e.limite - e.restante) });
  v.esperarCalma = true; // después de resolverla, calma antes de la siguiente
  return { ok: true };
}
