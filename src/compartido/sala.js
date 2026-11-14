// =============================================================
// sala.js — La "sala" de una partida: la ÚNICA fuente de verdad.
// La usa el servidor (server/index.js) y también el modo "jugar solo"
// (red/conexionLocal.js), así las reglas son las mismas en los dos casos.
//
// No usa nada del navegador ni de la red: solo recibe acciones
// (accion(idJugador, tipo, datos)) y avanza en el tiempo (tick(dt)).
// Cada vez que algo cambia, sube "version" y quien la use envía el estado.
// =============================================================

export const ROLES_ID = ['comandante', 'ingeniero', 'cientifico', 'comunicaciones'];

/** Código de 4 letras fácil de dictar (sin letras que se confunden como O/0, I/1). */
export function generarCodigo(existentes = new Set()) {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c;
  do {
    c = Array.from({ length: 4 }, () => letras[Math.floor(Math.random() * letras.length)]).join('');
  } while (existentes.has(c));
  return c;
}

export class Sala {
  /**
   * @param codigo código de la sala
   * @param datos  datos del juego que necesita la sala (los pasos siguientes agregan
   *               emergencias, tienda, etc.). Se pasan desde afuera para no leer archivos aquí.
   */
  constructor(codigo, datos = {}) {
    this.codigo = codigo;
    this.datos = datos;
    this.fase = 'lobby';
    this.jugadores = new Map(); // id → { id, nombre, roles: [], anfitrion }
    this.posiciones = new Map(); // id → { x, y, z, ry, v, ap, acc }
    this.version = 0;
    this.mensajes = []; // avisos cortos para mostrar a todos (ej. "Ana se unió")
  }

  cambio(mensaje) {
    this.version++;
    if (mensaje) {
      this.mensajes.push({ texto: mensaje, n: this.version });
      if (this.mensajes.length > 5) this.mensajes.shift();
    }
  }

  // ---------- Jugadores ----------
  unir(id, nombre) {
    if (this.jugadores.size >= 4) return { error: 'La sala está llena (máximo 4 jugadores).' };
    if (this.fase !== 'lobby') return { error: 'La partida ya empezó.' };
    const limpio = String(nombre || 'Astronauta').trim().slice(0, 14) || 'Astronauta';
    const anfitrion = this.jugadores.size === 0;
    this.jugadores.set(id, { id, nombre: limpio, roles: [], anfitrion });
    this.cambio(`${limpio} se unió`);
    return { ok: true };
  }

  salir(id) {
    const j = this.jugadores.get(id);
    if (!j) return;
    this.jugadores.delete(id);
    this.posiciones.delete(id);
    // Si se fue el anfitrión, el siguiente pasa a serlo
    if (j.anfitrion) {
      const siguiente = this.jugadores.values().next().value;
      if (siguiente) siguiente.anfitrion = true;
    }
    this.cambio(`${j.nombre} salió`);
  }

  get vacia() {
    return this.jugadores.size === 0;
  }

  /** Roles que nadie eligió todavía. */
  rolesLibres() {
    const tomados = new Set([...this.jugadores.values()].flatMap((j) => j.roles));
    return ROLES_ID.filter((r) => !tomados.has(r));
  }

  /** ¿Están los 4 roles cubiertos? (requisito para empezar) */
  puedeEmpezar() {
    return this.jugadores.size > 0 && this.rolesLibres().length === 0;
  }

  // ---------- Acciones de los jugadores ----------
  /** Punto de entrada único: devuelve { ok } o { error }. */
  accion(id, tipo, datos = {}) {
    const j = this.jugadores.get(id);
    if (!j) return { error: 'No estás en la sala.' };
    const manejador = this.acciones[tipo];
    if (!manejador) return { error: `Acción desconocida: ${tipo}` };
    return manejador.call(this, j, datos) || { ok: true };
  }

  acciones = {
    /** Tomar o soltar un rol. Un rol solo puede tenerlo una persona. */
    rol(j, { rol }) {
      if (this.fase !== 'lobby') return { error: 'Ya no se pueden cambiar los roles.' };
      if (!ROLES_ID.includes(rol)) return { error: 'Rol desconocido.' };
      if (j.roles.includes(rol)) {
        j.roles = j.roles.filter((r) => r !== rol);
      } else {
        const duenio = [...this.jugadores.values()].find((o) => o.roles.includes(rol));
        if (duenio) return { error: `Ese rol ya lo tiene ${duenio.nombre}.` };
        j.roles.push(rol);
      }
      this.cambio();
      return { ok: true };
    },
    /** Tomar todos los roles libres (para jugar solo o con pocos jugadores). */
    tomarLibres(j) {
      if (this.fase !== 'lobby') return { error: 'Ya empezó.' };
      j.roles.push(...this.rolesLibres());
      this.cambio();
      return { ok: true };
    },
    /** El anfitrión empieza la partida (con los 4 roles cubiertos). */
    empezar(j) {
      if (!j.anfitrion) return { error: 'Solo el anfitrión puede empezar.' };
      if (!this.puedeEmpezar()) return { error: `Faltan roles: ${this.rolesLibres().join(', ')}.` };
      this.fase = 'nave';
      this.cambio('¡Comienza la misión!');
      return { ok: true };
    }
  };

  /** Posición de un jugador (no sube la versión: se envía aparte, 15 veces por segundo). */
  posicion(id, p) {
    if (this.jugadores.has(id) && p && Number.isFinite(p.x)) this.posiciones.set(id, p);
  }

  /** Avanza el tiempo (lo usan los pasos siguientes: viaje, emergencias…). */
  tick(_dt) {}

  /** Estado que se envía a todos (sin posiciones). */
  estadoPublico() {
    return {
      codigo: this.codigo,
      fase: this.fase,
      version: this.version,
      jugadores: [...this.jugadores.values()],
      rolesLibres: this.rolesLibres(),
      puedeEmpezar: this.puedeEmpezar(),
      mensajes: this.mensajes
    };
  }

  posicionesPublicas() {
    return Object.fromEntries(this.posiciones);
  }
}
