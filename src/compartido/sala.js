// =============================================================
// sala.js — La "sala" de una partida: la ÚNICA fuente de verdad.
// La usa el servidor (server/index.js) y también el modo "jugar solo"
// (red/conexionLocal.js), así las reglas son las mismas en los dos casos.
//
// No usa nada del navegador ni de la red: solo recibe acciones
// (accion(idJugador, tipo, datos)) y avanza en el tiempo (tick(dt)).
// Cada vez que algo cambia, sube "version" y quien la use envía el estado.
// =============================================================

import { nuevoViaje, avanzarViaje, resolverEmergencia } from './viaje.js';
import { crearCatalogo, seleccionVacia, resumenDiseno, comprar } from './hangar.js';
import { calcularInforme } from './informe.js';
import { clasificarAterrizaje, nuevaSuperficie, recogerMuestra, analizarMuestra, analizadas } from './superficie.js';

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
    this.destinoId = 'marte';
    this.diseno = {};   // protecciones de la nave (true = protegido), sale del hangar
    this.viaje = null;
    this.acumulado = 0;
    // Hangar: catálogo de piezas, lo comprado y quién está listo
    this.catalogo = datos.componentes && datos.hangar ? crearCatalogo(datos.componentes, datos.hangar) : [];
    this.seleccion = seleccionVacia(this.catalogo);
    this.listos = new Set();
    // Dificultad ('facil' | 'normal'), valores en dificultad.json
    this.nivel = datos.dificultad ? datos.dificultad.porDefecto : null;
  }

  get destino() {
    return (this.datos.destinos || []).find((d) => d.id === this.destinoId);
  }

  /** Valores de la dificultad elegida (o null si no hay dificultad.json). */
  get valoresNivel() {
    return this.datos.dificultad ? this.datos.dificultad.niveles[this.nivel] : null;
  }

  /** Configuración del viaje: la base de emergencias3d.json con los valores de la dificultad. */
  get configViaje() {
    const config = this.datos.emergencias.config;
    // Modo misión: pocas emergencias por viaje según el destino (emergencias3d.json)
    const porViaje = config.emergenciasPorDestino ? config.emergenciasPorDestino[this.destinoId] : undefined;
    const base = { ...config, emergenciasPorViaje: porViaje };
    const d = this.valoresNivel;
    if (!d) return base;
    return { ...base, maxSimultaneas: d.maxSimultaneas, tiempoParaResolver: d.tiempoParaResolver, intervaloMin: d.intervaloMin, intervaloMax: d.intervaloMax, factorDanio: d.factorDanio };
  }

  /** Configuración del hangar: el presupuesto se multiplica según la dificultad. */
  get configHangar() {
    const base = this.datos.hangar;
    const d = this.valoresNivel;
    if (!base || !d) return base;
    const presupuesto = Object.fromEntries(Object.entries(base.presupuesto).map(([k, v]) => [k, Math.round(v * d.factorPresupuesto)]));
    return { ...base, presupuesto };
  }

  resumen() {
    return this.destino && this.datos.hangar ? resumenDiseno(this.seleccion, this.catalogo, this.destino, this.configHangar) : null;
  }

  /** Abre el hangar (sin compras y sin nadie listo). */
  abrirHangar() {
    this.fase = 'hangar';
    this.seleccion = seleccionVacia(this.catalogo);
    this.listos.clear();
    this.cambio(`🛠 Hangar: armen la nave para ir a ${this.destino ? this.destino.nombre : 'su destino'}`);
  }

  /** Empieza el viaje con el diseño actual. */
  iniciarViaje() {
    const r = this.resumen();
    if (r) this.diseno = r.diseno;
    this.viaje = nuevoViaje(this.configViaje, this.diseno);
    this.puertas = {}; // las puertas empiezan cerradas
    this.fase = 'viaje';
    this.cambio('🚀 ¡Despegamos! Atentos a las emergencias.');
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
    // Si la partida ya empezó, sus puestos los ocupan BOTS
    if (this.fase !== 'lobby' && j.roles.length) this.bots = [...new Set([...(this.bots || []), ...j.roles])];
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

  /** Sala con bots: ¿todos los humanos eligieron un puesto y están listos? */
  puedeEmpezarConBots() {
    const js = [...this.jugadores.values()];
    return js.length > 0 && js.every((j) => j.roles.length > 0 && j.listo);
  }

  /**
   * Roles que un jugador puede usar: los suyos y los de los BOTS.
   * (Cuando hay una emergencia del rol de un bot, un humano toma ese astronauta.)
   */
  rolesDe(j) {
    return [...new Set([...j.roles, ...(this.bots || [])])];
  }

  /** Personaje de cada rol: el que eligió su jugador o, si es un bot, uno libre por defecto. */
  personajesPorRol() {
    const lista = this.datos.personajes || [];
    const out = {};
    const usados = new Set();
    for (const j of this.jugadores.values()) for (const r of j.roles) { out[r] = j.personaje || null; if (j.personaje) usados.add(j.personaje); }
    for (const r of ROLES_ID) {
      if (out[r]) continue;
      const libre = lista.find((p) => p.rolPorDefecto === r && !usados.has(p.id)) || lista.find((p) => !usados.has(p.id));
      out[r] = libre ? libre.id : null;
      if (libre) usados.add(libre.id);
    }
    return out;
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
    /** Sala: elegir UN puesto (rol). No se puede repetir: si otro lo tiene, error. */
    puesto(j, { rol }) {
      if (this.fase !== 'lobby') return { error: 'Ya no se pueden cambiar los puestos.' };
      if (!ROLES_ID.includes(rol)) return { error: 'Puesto desconocido.' };
      const duenio = [...this.jugadores.values()].find((o) => o !== j && o.roles.includes(rol));
      if (duenio) return { error: `Ese puesto ya lo tiene ${duenio.nombre}.` };
      j.roles = [rol];
      j.listo = false;
      this.cambio();
      return { ok: true };
    },
    /** Sala: elegir un personaje (no se puede repetir entre jugadores). */
    personaje(j, { id }) {
      if (this.fase !== 'lobby') return { error: 'Ya empezó.' };
      if (this.datos.personajes && !this.datos.personajes.some((p) => p.id === id)) return { error: 'Personaje desconocido.' };
      const duenio = [...this.jugadores.values()].find((o) => o !== j && o.personaje === id);
      if (duenio) return { error: `Ese personaje ya lo eligió ${duenio.nombre}.` };
      j.personaje = id;
      this.cambio();
      return { ok: true };
    },
    /** Sala: "¡Listo!" (o ya no). Hace falta un puesto elegido. */
    listoSala(j) {
      if (this.fase !== 'lobby') return { error: 'Ya empezó.' };
      if (!j.roles.length) return { error: 'Primero elige un puesto.' };
      j.listo = !j.listo;
      this.cambio();
      return { ok: true };
    },
    /** El anfitrión inicia: los puestos libres los ocupan BOTS. */
    empezarConBots(j) {
      if (!j.anfitrion) return { error: 'Solo el anfitrión puede iniciar la partida.' };
      if (!this.puedeEmpezarConBots()) return { error: 'Todos tienen que elegir un puesto y pulsar "¡Listo!".' };
      this.bots = this.rolesLibres();
      this.fase = 'sistema';
      this.cambio(this.bots.length ? `🤖 ${this.bots.length} bot${this.bots.length > 1 ? 's' : ''} completan la tripulación` : '🪐 Elijan el destino de la misión');
      return { ok: true };
    },
    /** El anfitrión empieza la partida (con los 4 roles cubiertos). */
    empezar(j) {
      if (!j.anfitrion) return { error: 'Solo el anfitrión puede empezar.' };
      if (!this.puedeEmpezar()) return { error: `Faltan roles: ${this.rolesLibres().join(', ')}.` };
      this.fase = 'sistema';
      this.cambio('🪐 Elijan el destino de la misión');
      return { ok: true };
    },
    /** Sistema solar: el anfitrión elige el destino (solo Luna o Marte por ahora). */
    destino(j, { id }) {
      if (this.fase !== 'sistema') return { error: 'Ahora no se elige destino.' };
      if (!j.anfitrion) return { error: 'El anfitrión elige el destino (pueden discutirlo juntos).' };
      if (!['luna', 'marte'].includes(id)) return { error: 'Ese destino llegará próximamente.' };
      this.destinoId = id;
      this.abrirHangar();
      return { ok: true };
    },
    /** Desde el hangar, volver a elegir destino. */
    cambiarDestino(j) {
      if (this.fase !== 'hangar') return { error: 'Solo desde el hangar.' };
      if (!j.anfitrion) return { error: 'Solo el anfitrión.' };
      this.fase = 'sistema';
      this.cambio('🪐 Elijan otro destino');
      return { ok: true };
    },
    /** Elegir la dificultad ('facil' o 'normal'); se aplica en el próximo hangar y viaje. */
    dificultad(j, { nivel }) {
      if (!this.datos.dificultad || !this.datos.dificultad.niveles[nivel]) return { error: 'Dificultad desconocida.' };
      if (this.fase === 'viaje') return { error: 'Se puede cambiar al terminar el viaje.' };
      this.nivel = nivel;
      this.cambio();
      return { ok: true };
    },
    /** Hangar: comprar, cambiar o quitar una pieza (solo las de tus roles). */
    comprar(j, { opcion }) {
      if (this.fase !== 'hangar') return { error: 'Ahora no se puede comprar.' };
      const r = comprar(this.seleccion, this.catalogo, this.rolesDe(j), opcion, this.destino, this.configHangar);
      if (r.ok) { this.listos.clear(); this.cambio(); } // si cambia la nave, todos revisan de nuevo
      return r;
    },
    /** Hangar: "¡Listo!". Si la nave no puede despegar, explica por qué. Cuando todos están listos, despega. */
    listo(j) {
      if (this.fase !== 'hangar') return { error: 'No estamos en el hangar.' };
      if (this.listos.has(j.id)) { this.listos.delete(j.id); this.cambio(); return { ok: true }; }
      const r = this.resumen();
      if (r.problemas.length) return { error: 'La nave todavía no puede despegar:', problemas: r.problemas.map((p) => p.texto) };
      this.listos.add(j.id);
      this.cambio(`✔ ${j.nombre} está listo`);
      if ([...this.jugadores.keys()].every((id) => this.listos.has(id))) this.iniciarViaje();
      return { ok: true };
    },
    /** Volver a la sala de espera (después de llegar o fracasar). Se conservan los roles. */
    reiniciar(j) {
      if (!j.anfitrion) return { error: 'Solo el anfitrión puede reiniciar.' };
      if (this.fase === 'lobby' || this.fase === 'hangar') return { ok: true };
      this.viaje = null;
      this.informe = null;
      this.muestras = 0;
      this.aterrizaje = null;
      this.superficie = null;
      this.posiciones.clear();
      this.abrirHangar(); // de vuelta al hangar para mejorar la nave
      return { ok: true };
    },
    /** Aterrizaje: el Comandante informa la velocidad con la que tocó el suelo. */
    aterrizar(j, { velocidad }) {
      if (this.fase !== 'aterrizaje') return { error: 'No estamos aterrizando.' };
      if (j.id !== this.aterrizadorId()) return { error: 'El aterrizaje lo pilota el Piloto (o el anfitrión si el Piloto es un bot).' };
      const config = this.datos.emergencias.config;
      this.aterrizaje = clasificarAterrizaje(Number(velocidad) || 99, config);
      if (this.aterrizaje === 'choque') this.viaje.vida = Math.max(0, this.viaje.vida - config.danioChoque);
      this.superficie = nuevaSuperficie(config);
      this.fase = 'superficie';
      this.posiciones.clear();
      const texto = { suave: '✅ ¡Aterrizaje suave!', duro: '⚠ Aterrizaje duro, pero estamos bien', choque: `💥 ¡Choque! La nave perdió ${config.danioChoque} de vida` }[this.aterrizaje];
      this.cambio(`${texto} Busquen las 3 muestras.`);
      return { ok: true, resultado: this.aterrizaje };
    },
    /** Superficie: recoger una muestra (cualquiera). */
    recoger(j, { i }) {
      if (this.fase !== 'superficie') return { error: 'No estamos en la superficie.' };
      const r = recogerMuestra(this.superficie, i, j.nombre);
      if (r.ok) this.cambio(`🪨 ${j.nombre} recogió una muestra: ¡al laboratorio del módulo!`);
      return r;
    },
    /** Superficie: analizar una muestra (solo el Científico). */
    analizar(j, { i, exito }) {
      if (this.fase !== 'superficie') return { error: 'No estamos en la superficie.' };
      const r = analizarMuestra(this.superficie, i, this.rolesDe(j), !!exito);
      if (r.ok && exito) {
        this.cambio(`🔬 Muestra analizada (${analizadas(this.superficie)} de 3)`);
        if (analizadas(this.superficie) === 3) this.terminarExploracion();
      }
      return r;
    },
    /** El anfitrión termina la exploración antes de tiempo. */
    volverACasa(j) {
      if (this.fase !== 'superficie') return { error: 'No estamos en la superficie.' };
      if (!j.anfitrion) return { error: 'Solo el anfitrión.' };
      this.terminarExploracion();
      return { ok: true };
    },
    /** Resultado del minijuego de una emergencia. */
    /**
     * Multijugador: el jugador está leyendo una tarjeta (o terminó de leer).
     * El reloj compartido no se congela, pero sus roles no reciben emergencias nuevas mientras lee.
     */
    leyendo(j, { activo }) {
      if (!this.viaje) return { ok: true };
      const otros = (this.viaje.leyendo || []).filter((r) => !j.roles.includes(r));
      this.viaje.leyendo = activo ? [...otros, ...j.roles] : otros;
      return { ok: true };
    },
    /** Abrir o cerrar una puerta de la nave con E (todos la ven igual). */
    /** Empujón (tecla F): el astronauta de ese rol queda mareado 2 s y, si estaba en una consola, se le cierra. */
    golpe(j, { rol }) {
      if (!ROLES_ID.includes(rol)) return { error: 'Rol desconocido.' };
      if (this.fase !== 'viaje') return { error: 'Solo se puede empujar dentro de la nave.' };
      const ahora = Date.now();
      this.tiempoGolpes = this.tiempoGolpes || {};
      this.inmunes = this.inmunes || {};
      // 4 s de espera entre empujones de un mismo jugador
      if (ahora - (this.tiempoGolpes[j.id] || 0) < 4000) return { error: 'Espera un poco para volver a empujar.' };
      // Aturdido (1,5 s) + 3 s de inmunidad: no se lo puede aturdir en cadena
      if ((this.inmunes[rol] || 0) > ahora) return { error: 'Todavía está aturdido o protegido: espera un poco.' };
      // No se empuja a quien está en un minijuego o leyendo una tarjeta
      const duenio = [...this.jugadores.values()].find((x) => x.roles.includes(rol));
      if (duenio && this.posiciones.get(duenio.id)?.ocupado) return { error: 'Está en un minijuego o leyendo: no se lo puede empujar.' };
      this.tiempoGolpes[j.id] = ahora;
      this.inmunes[rol] = ahora + 4500;
      this.golpe = { n: ((this.golpe && this.golpe.n) || 0) + 1, de: j.id, deNombre: j.nombre, deRol: j.roles[0] || null, rol };
      this.cambio();
      return { ok: true };
    },
    puerta(j, { i, abierta }) {
      return this.abrirPuerta(i, abierta);
    },
    resolver(j, { uid, exito }) {
      if (this.fase !== 'viaje' || !this.viaje) return { error: 'No hay viaje en curso.' };
      const r = resolverEmergencia(this.viaje, uid, this.rolesDe(j), !!exito);
      if (r.ok && exito) this.cambio(`✅ ${j.nombre} resolvió una emergencia`);
      return r;
    }
  };

  /** Después del viaje: si llegamos, aterrizaje; si no, directo al informe. */
  despuesDelViaje() {
    if (this.viaje && this.viaje.terminado === 'llegada') {
      this.fase = 'aterrizaje';
      this.aterrizaje = null;
      this.cambio('🛬 ¡El Comandante debe aterrizar!');
    } else this.cerrarMision();
  }

  /** Termina la exploración: cuenta las muestras analizadas y va al informe. */
  terminarExploracion() {
    this.muestras = this.superficie ? analizadas(this.superficie) : 0;
    this.cerrarMision();
  }

  /** Calcula el informe final de la misión y pasa a la fase "informe". */
  cerrarMision() {
    this.informe = calcularInforme({
      destinoId: this.destinoId, viaje: this.viaje, diseno: this.diseno, seleccion: this.seleccion,
      muestras: this.muestras || 0, aterrizaje: this.aterrizaje || null
    }, this.datos);
    this.informe.id = `${this.codigo}-${this.version}`; // para que el anfitrión lo guarde una sola vez
    this.informe.destinoId = this.destinoId;
    this.informe.muestras = this.muestras || 0;
    this.informe.aterrizaje = this.aterrizaje || null;
    this.informe.diseno = { ...this.diseno };
    this.fase = 'informe';
    this.cambio('📋 Informe de la misión');
  }

  /**
   * Quién aterriza la nave: el jugador HUMANO que es Piloto (comandante).
   * Si el Piloto es un bot, aterriza el anfitrión. En un jugador, siempre el jugador.
   */
  aterrizadorId() {
    const js = [...this.jugadores.values()];
    const piloto = js.find((j) => j.roles.includes('comandante'));
    return (piloto || js.find((j) => j.anfitrion) || js[0] || {}).id ?? null;
  }

  /** Puertas de la nave abiertas con E: { índice: true/false } (se sincroniza para todos). */
  abrirPuerta(i, abierta) {
    if (!Number.isInteger(i) || i < 0 || i > 20) return { error: 'Puerta desconocida.' };
    this.puertas = { ...(this.puertas || {}), [i]: !!abierta };
    this.cambio();
    return { ok: true };
  }

  /** Posición de un jugador (no sube la versión: se envía aparte, 15 veces por segundo). */
  posicion(id, p) {
    if (this.jugadores.has(id) && p && Number.isFinite(p.x)) this.posiciones.set(id, p);
  }

  /** Avanza el tiempo: emergencias del viaje, vida de la nave, llegada o fracaso. */
  tick(dt, rng = Math.random) {
    // Después de llegar o fracasar se muestra la escena unos segundos y luego el informe
    if (this.fase === 'llegada' || this.fase === 'fracaso') {
      this.esperaFinal = (this.esperaFinal || 0) + dt;
      if (this.esperaFinal >= this.datos.emergencias.config.segundosFinal) this.despuesDelViaje();
      return;
    }
    // Exploración con tiempo límite
    if (this.fase === 'superficie' && this.superficie) {
      this.superficie.restante = Math.max(0, this.superficie.restante - dt);
      if (this.superficie.restante <= 0) { this.terminarExploracion(); return; }
      this.acumulado += dt;
      if (this.acumulado >= 1) { this.acumulado = 0; this.cambio(); }
      return;
    }
    if (this.fase !== 'viaje' || !this.viaje) return;
    const sucesos = avanzarViaje(this.viaje, dt, this.datos.emergencias.emergencias, this.configViaje, rng);
    for (const s of sucesos) {
      if (s.tipo === 'nueva') this.cambio(`⚠ ${s.nombre}`);
      if (s.tipo === 'fallida') this.cambio(`💥 ${s.nombre}: la nave perdió ${s.danio} de vida`);
    }
    if (this.viaje.terminado) {
      this.fase = this.viaje.terminado; // 'llegada' o 'fracaso'
      this.esperaFinal = 0;
      this.cambio(this.fase === 'llegada' ? '🪐 ¡Llegamos al destino!' : '💫 La nave se quedó sin vida…');
      return;
    }
    // Una vez por segundo se avisa el tiempo que queda (para el HUD)
    this.acumulado += dt;
    if (this.acumulado >= 1) { this.acumulado = 0; this.cambio(); }
  }

  /** Estado que se envía a todos (sin posiciones). */
  estadoPublico() {
    return {
      codigo: this.codigo,
      fase: this.fase,
      version: this.version,
      jugadores: [...this.jugadores.values()],
      rolesLibres: this.rolesLibres(),
      puedeEmpezar: this.puedeEmpezar(),
      mensajes: this.mensajes,
      destinoId: this.destinoId,
      diseno: this.diseno,
      seleccion: this.seleccion,
      listos: [...this.listos],
      resumen: this.fase === 'hangar' ? this.resumen() : null,
      nivel: this.nivel,
      informe: this.fase === 'informe' ? this.informe : null,
      bots: this.bots || [],
      puertas: this.puertas || {},
      aterrizador: this.aterrizadorId(),
      golpe: this.golpe || null,
      personajesPorRol: this.personajesPorRol(),
      aterrizaje: this.aterrizaje || null,
      superficie: this.fase === 'superficie' && this.superficie ? { restante: Math.ceil(this.superficie.restante), muestras: this.superficie.muestras } : null,
      viaje: this.viaje && {
        duracion: this.viaje.duracion, restante: Math.ceil(this.viaje.restante), vida: Math.round(this.viaje.vida),
        total: this.viaje.total || null, // emergencias del viaje (la barra de vida se divide en esa cantidad de partes)
        // Para la cuenta regresiva "Próxima emergencia en N s" y el viaje acelerado
        proxima: this.viaje.emergencias.length || this.viaje.lanzadas >= (this.viaje.total ?? Infinity) ? null : Math.max(0, Math.ceil(this.viaje.proxima)),
        pendientes: this.viaje.total ? this.viaje.total - this.viaje.lanzadas : null,
        acelerado: !!this.viaje.acelerado,
        emergencias: this.viaje.emergencias.map((e) => ({ ...e, restante: Math.ceil(e.restante) })),
        // copia: en el modo de un jugador el estado no viaja por la red, y sin copia
        // la pantalla vería la misma lista y no notaría lo que se agregó
        registro: [...this.viaje.registro], terminado: this.viaje.terminado
      }
    };
  }

  posicionesPublicas() {
    return Object.fromEntries(this.posiciones);
  }
}
