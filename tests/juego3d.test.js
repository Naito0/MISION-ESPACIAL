// Pruebas de la lógica compartida del juego 3D (sala y viaje). Ejecutar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Sala, generarCodigo, ROLES_ID } from '../src/compartido/sala.js';
import { nuevoViaje, avanzarViaje, resolverEmergencia, elegirEmergencia, estaAgravada } from '../src/compartido/viaje.js';
import { calcularInforme } from '../src/compartido/informe.js';
import { clasificarAterrizaje } from '../src/compartido/superficie.js';
import { recomendaciones, dependencias, retrasoSenal, textoRetraso } from '../src/compartido/recomendaciones.js';
import { resumenDiseno, seleccionVacia } from '../src/compartido/hangar.js';
const seleccionVaciaDe = (s) => seleccionVacia(s.catalogo);
import { resumenAprendizaje } from '../src/compartido/resumenAprendizaje.js';
import { estrellasMision, nuevosLogros } from '../src/compartido/logros.js';
import { parametrosRetraso, dondeFrena } from '../src/compartido/retrasoRover.js';
import { elegirPreguntas, prepararPregunta } from '../src/compartido/preguntas.js';

const EMERG = JSON.parse(readFileSync(new URL('../src/data/emergencias3d.json', import.meta.url), 'utf8'));
const datos = { emergencias: EMERG, destinos: [], misionesReales: [] };

test('cada rol tiene emergencias con minijuegos distintos, diagnóstico y hecho real cuando corresponde', () => {
  const DIAG = leerJSON('diagnosticos.json').diagnosticos;
  const HECHOS = leerJSON('hechos_reales.json').hechos;
  for (const rol of ROLES_ID) {
    const delRol = EMERG.emergencias.filter((e) => e.rol === rol);
    // El piloto tiene 2 en el viaje; su tercer minijuego es el aterrizaje con alarmas
    assert.ok(delRol.length >= 2, rol);
    assert.equal(new Set(delRol.map((e) => e.minijuego)).size, delRol.length, `${rol}: minijuegos repetidos`);
  }
  for (const e of EMERG.emergencias) {
    const d = DIAG[e.id];
    assert.ok(d && d.opciones.filter((o) => o.correcta).length === 1, `${e.id}: diagnóstico con una sola correcta`);
  }
  for (const [id, h] of Object.entries(HECHOS)) {
    assert.ok(h.mision && h.anio && h.frase && h.fuente.startsWith('https://') && h.cita, `hecho ${id}`);
  }
});

test('código de 4 letras sin repetir', () => {
  const c = generarCodigo(new Set(['ABCD']));
  assert.match(c, /^[A-Z]{4}$/);
  assert.notEqual(c, 'ABCD');
});

test('lobby: no se puede empezar sin los 4 roles y un rol es de una sola persona', () => {
  const s = new Sala('TEST', datos);
  s.unir('a', 'Ana');
  s.unir('b', 'Beto');
  assert.equal(s.accion('a', 'empezar').error !== undefined, true);
  s.accion('a', 'rol', { rol: 'comandante' });
  assert.ok(s.accion('b', 'rol', { rol: 'comandante' }).error, 'el rol ya era de Ana');
  s.accion('b', 'tomarLibres');
  assert.equal(s.puedeEmpezar(), true);
  assert.ok(s.accion('b', 'empezar').error, 'solo el anfitrión empieza');
  assert.deepEqual(s.accion('a', 'empezar'), { ok: true });
  assert.equal(s.fase, 'sistema');
});

test('sistema solar: solo Luna y Marte se pueden elegir, y lo elige el anfitrión', () => {
  const s = new Sala('SIS', { emergencias: EMERG, destinos: [], misionesReales: [] });
  s.unir('a', 'Ana'); s.unir('b', 'Beto');
  s.accion('a', 'tomarLibres');
  s.accion('a', 'empezar');
  assert.ok(s.accion('a', 'destino', { id: 'jupiter' }).error);
  assert.ok(s.accion('b', 'destino', { id: 'luna' }).error);
  assert.deepEqual(s.accion('a', 'destino', { id: 'luna' }), { ok: true });
  assert.equal(s.destinoId, 'luna');
  assert.equal(s.fase, 'hangar');
});

// ---------- Hangar ----------
const leerJSON = (n) => JSON.parse(readFileSync(new URL(`../src/data/${n}`, import.meta.url), 'utf8'));
const datosCompletos = {
  emergencias: EMERG, misionesReales: leerJSON('misiones_reales.json').misiones,
  destinos: leerJSON('destinos.json').destinos, componentes: leerJSON('componentes.json'), hangar: leerJSON('hangar3d.json')
};
function salaEnHangar() {
  const s = new Sala('HANG', datosCompletos);
  s.unir('a', 'Ana'); s.unir('b', 'Beto');
  s.accion('a', 'rol', { rol: 'comandante' }); s.accion('a', 'rol', { rol: 'ingeniero' });
  s.accion('b', 'tomarLibres');
  s.accion('a', 'empezar');
  s.accion('a', 'destino', { id: 'marte' });
  return s;
}
const NAVE_MARTE_OK = {
  a: ['prop_chica', 'term_pintura', 'estr_ligera', 'pan_grandes', 'bat_chica'],
  b: ['cam_simple', 'sv_basico', 'ant_media', 'est_una', 'comp_basica']
};

test('hangar: cada rol solo compra sus piezas y el presupuesto es compartido', () => {
  const s = salaEnHangar();
  assert.ok(s.accion('b', 'comprar', { opcion: 'prop_chica' }).error, 'el motor es del comandante');
  assert.deepEqual(s.accion('a', 'comprar', { opcion: 'prop_chica' }), { ok: true, quitada: false });
  assert.equal(s.resumen().costo, 15);
  // Volver a tocar la misma pieza la quita
  assert.equal(s.accion('a', 'comprar', { opcion: 'prop_chica' }).quitada, true);
  assert.equal(s.resumen().costo, 0);
});

test('hangar: no se puede despegar si falta algo, y explica por qué', () => {
  const s = salaEnHangar();
  const r = s.accion('a', 'listo');
  assert.ok(r.error);
  assert.ok(r.problemas.some((p) => p.includes('Falta elegir')));
});

test('hangar: en Marte los paneles chicos no alcanzan (llega 43% de la luz)', () => {
  const s = salaEnHangar();
  for (const o of NAVE_MARTE_OK.a) s.accion('a', 'comprar', { opcion: o });
  for (const o of NAVE_MARTE_OK.b) s.accion('b', 'comprar', { opcion: o });
  assert.deepEqual(s.resumen().problemas, []);
  s.accion('a', 'comprar', { opcion: 'pan_chicos' }); // reemplaza los grandes
  const p = s.resumen().problemas.map((x) => x.texto).join(' ');
  assert.match(p, /Falta energía/);
  assert.match(p, /43%/);
});

test('hangar: con todo en orden y todos listos, despega con el diseño calculado', () => {
  const s = salaEnHangar();
  for (const o of NAVE_MARTE_OK.a) s.accion('a', 'comprar', { opcion: o });
  for (const o of NAVE_MARTE_OK.b) s.accion('b', 'comprar', { opcion: o });
  assert.deepEqual(s.accion('a', 'listo'), { ok: true });
  assert.equal(s.fase, 'hangar', 'falta Beto');
  assert.deepEqual(s.accion('b', 'listo'), { ok: true });
  assert.equal(s.fase, 'viaje');
  assert.equal(s.diseno.blindaje, false, 'sin estructura blindada');
  assert.equal(s.diseno.antena, true, 'antena media');
});

test('informe: al terminar el viaje, después de unos segundos aparece el informe con una misión real', () => {
  const s = salaEnHangar();
  for (const o of NAVE_MARTE_OK.a) s.accion('a', 'comprar', { opcion: o });
  for (const o of NAVE_MARTE_OK.b) s.accion('b', 'comprar', { opcion: o });
  s.accion('a', 'listo'); s.accion('b', 'listo');
  s.viaje.restante = 0.1;
  s.tick(0.2);
  assert.equal(s.fase, 'llegada');
  s.tick(EMERG.config.segundosFinal + 0.1);
  assert.equal(s.fase, 'aterrizaje');
  assert.ok(s.accion('b', 'aterrizar', { velocidad: 1 }).error, 'solo el Comandante aterriza');
  assert.deepEqual(s.accion('a', 'aterrizar', { velocidad: 1.8 }), { ok: true, resultado: 'suave' });
  assert.equal(s.fase, 'superficie');
  // 3 muestras: cualquiera las recoge; solo el Científico (Beto) las analiza
  assert.ok(s.accion('b', 'analizar', { i: 0, exito: true }).error, 'primero hay que recogerla');
  for (const i of [0, 1, 2]) s.accion('a', 'recoger', { i });
  assert.ok(s.accion('a', 'analizar', { i: 0, exito: true }).error, 'Ana no es científica');
  for (const i of [0, 1, 2]) s.accion('b', 'analizar', { i, exito: true });
  assert.equal(s.fase, 'informe');
  const inf = s.estadoPublico().informe;
  assert.equal(inf.exito, true);
  assert.equal(inf.estrellas, 3);
  assert.ok(inf.creditos > 600);
  assert.ok(inf.mision && inf.mision.id === 'phoenix' && inf.mision.fuente.startsWith('https://'));
  // Sin blindaje y con meteoritos fallidos → aparece la causa
  assert.deepEqual(s.accion('a', 'reiniciar'), { ok: true });
  assert.equal(s.fase, 'hangar');
});

test('informe: una emergencia fallida y agravada explica la causa', () => {
  const inf = calcularInforme({
    destinoId: 'luna', diseno: { blindaje: false }, seleccion: {}, muestras: 0,
    viaje: { terminado: 'fracaso', vida: 0, registro: [{ id: 'meteoritos', nombre: 'Lluvia de micrometeoritos', resultado: 'fallida', agravada: true, danio: 30 }] }
  }, { emergencias: EMERG, misionesReales: leerJSON('misiones_reales.json').misiones });
  assert.equal(inf.exito, false);
  assert.equal(inf.estrellas, 0);
  assert.match(inf.causas[0].causa, /blindaje/);
  assert.equal(inf.mision.id, 'apollo11');
});

test('aterrizaje: se clasifica por la velocidad al tocar el suelo', () => {
  const c = EMERG.config;
  assert.equal(clasificarAterrizaje(-2, c), 'suave');
  assert.equal(clasificarAterrizaje(4, c), 'duro');
  assert.equal(clasificarAterrizaje(9, c), 'choque');
});

test('superficie: si se acaba el tiempo, el informe cuenta solo las muestras analizadas', () => {
  const s = salaEnHangar();
  for (const o of NAVE_MARTE_OK.a) s.accion('a', 'comprar', { opcion: o });
  for (const o of NAVE_MARTE_OK.b) s.accion('b', 'comprar', { opcion: o });
  s.accion('a', 'listo'); s.accion('b', 'listo');
  s.viaje.restante = 0.1; s.tick(0.2); s.tick(EMERG.config.segundosFinal + 0.1);
  s.accion('a', 'aterrizar', { velocidad: 9 });
  assert.equal(s.aterrizaje, 'choque');
  assert.equal(s.viaje.vida, 100 - EMERG.config.danioChoque);
  s.accion('a', 'recoger', { i: 1 });
  s.accion('b', 'analizar', { i: 1, exito: true });
  s.tick(EMERG.config.segundosSuperficie + 1);
  assert.equal(s.fase, 'informe');
  assert.equal(s.muestras, 1);
  assert.ok(s.informe.causas.some((c) => c.causa.includes('muy rápido')));
});

test('dificultad: Fácil da 1 emergencia a la vez, más tiempo, menos daño y más presupuesto', () => {
  const DIF = leerJSON('dificultad.json');
  const s = new Sala('DIF', { ...datosCompletos, dificultad: DIF });
  s.unir('a', 'Ana'); s.accion('a', 'tomarLibres');
  assert.equal(s.nivel, 'facil');
  s.accion('a', 'empezar'); s.accion('a', 'destino', { id: 'marte' });
  assert.equal(s.resumen().presupuesto, Math.round(270 * DIF.niveles.facil.factorPresupuesto));
  for (const o of [...NAVE_MARTE_OK.a, ...NAVE_MARTE_OK.b]) s.accion('a', 'comprar', { opcion: o });
  s.accion('a', 'listo');
  assert.equal(s.fase, 'viaje');
  for (let i = 0; i < 400; i++) { s.tick(0.25); assert.ok(s.viaje.emergencias.length <= 1, 'nunca más de 1 a la vez'); if (s.fase !== 'viaje') break; }
  const e = s.viaje.registro[0] || s.viaje.emergencias[0];
  assert.ok(e, 'hubo al menos una emergencia');
  // Normal permite 2 y se puede cambiar fuera del viaje
  const n = new Sala('DIF2', { ...datosCompletos, dificultad: DIF });
  n.unir('a', 'Ana');
  assert.deepEqual(n.accion('a', 'dificultad', { nivel: 'normal' }), { ok: true });
  assert.equal(n.configViaje.maxSimultaneas, 1);
  assert.ok(n.configViaje.tiempoParaResolver < s.configViaje.tiempoParaResolver);
});

test('viaje (modo misión): 5-6 emergencias repartidas entre los roles, de a una, la primera antes de 20 s', () => {
  for (const [destino, total] of [['luna', 5], ['marte', 6]]) {
    assert.equal(EMERG.config.emergenciasPorDestino[destino], total);
    const config = { ...EMERG.config, emergenciasPorViaje: total, maxSimultaneas: 1 };
    const v = nuevoViaje(config, {});
    let ultimaFin = null; let primera = null;
    const calmas = [];
    let t = 0;
    while (!v.terminado && t < 1000) {
      avanzarViaje(v, 0.5, EMERG.emergencias, config, Math.random);
      t += 0.5;
      assert.ok(v.emergencias.length <= 1, 'de a una');
      // Resolver enseguida cada emergencia (como si el jugador fuera rápido)
      if (v.emergencias.length) {
        if (primera === null) primera = t;
        if (ultimaFin !== null) calmas.push(t - ultimaFin);
        resolverEmergencia(v, v.emergencias[0].uid, [v.emergencias[0].rol], true);
        ultimaFin = t;
      }
    }
    assert.equal(v.terminado, 'llegada');
    assert.equal(v.registro.length, total, `${destino}: hubo ${v.registro.length}`);
    assert.ok(primera < 20, `la primera llegó a los ${primera} s`);
    // Roles variados: los 4 roles reciben al menos una y ninguno más de 2
    const porRol = {};
    for (const r of v.registro) porRol[r.rol] = (porRol[r.rol] || 0) + 1;
    assert.equal(Object.keys(porRol).length, 4, JSON.stringify(porRol));
    assert.ok(Object.values(porRol).every((n) => n <= 2), JSON.stringify(porRol));
    for (const c of calmas) assert.ok(c >= 8 && c <= 13, `calma de ${c} s`);
  }
});
test('viaje: sin tiempo muerto (se llega 1,5 s después de la última emergencia); un rol que está leyendo no recibe emergencias', () => {
  const config = { ...EMERG.config, emergenciasPorViaje: 1, maxSimultaneas: 1, tiempoParaResolver: 60 };
  const v = nuevoViaje(config, {});
  // Mientras lee el comandante, la emergencia no puede ser del comandante
  v.leyendo = ['comandante'];
  while (!v.emergencias.length) avanzarViaje(v, 0.5, EMERG.emergencias, config);
  assert.notEqual(v.emergencias[0].rol, 'comandante');
  resolverEmergencia(v, v.emergencias[0].uid, [v.emergencias[0].rol], true);
  avanzarViaje(v, 1, EMERG.emergencias, config);
  assert.equal(v.terminado, null, 'todavía muestra el "Resuelto"');
  avanzarViaje(v, 1, EMERG.emergencias, config);
  assert.equal(v.terminado, 'llegada', 'llega sin esperar el resto del viaje');
  assert.ok(v.restante === 0);
});
test('recomendaciones: dependen del destino (paneles, combustible, baterías, antena)', () => {
  const DEST = leerJSON('destinos.json').destinos;
  const luna = DEST.find((d) => d.id === 'luna');
  const marte = DEST.find((d) => d.id === 'marte');
  const s = new Sala('REC', datosCompletos);
  const sel = { ...seleccionVaciaDe(s), propulsion: ['prop_chica'], paneles: ['pan_chicos'], baterias: ['bat_chica'], antena: ['ant_baja'], soporte: ['sv_basico'], instrumentos: ['cam_simple'], avionica: ['comp_basica'] };
  const resM = resumenDiseno(sel, s.catalogo, marte, datosCompletos.hangar);
  const resL = resumenDiseno(sel, s.catalogo, luna, datosCompletos.hangar);
  const rM = recomendaciones(sel, s.catalogo, marte, resM);
  const rL = recomendaciones(sel, s.catalogo, luna, resL);
  // Mismos paneles: en Marte no alcanzan (43% de luz), en la Luna sí
  assert.equal(rM.paneles.estado, 'bajo');
  assert.notEqual(rL.paneles.estado, 'bajo');
  // Aterrizar en Marte pide más combustible que en la Luna
  assert.ok(rM.propulsion.min > rL.propulsion.min * 2);
  assert.equal(rM.propulsion.estado, 'bajo');
  // La noche lunar es más larga: la Luna pide más baterías
  assert.ok(rL.baterias.min > rM.baterias.min);
  // Antena de baja ganancia: alcanza en la Luna, no en Marte
  assert.equal(rM.antena.estado, 'bajo');
  assert.notEqual(rL.antena.estado, 'bajo');
  // Retraso de la señal: Luna ~1,3 s; Marte entre ~3 y ~22 minutos
  assert.ok(Math.abs(retrasoSenal(luna).max - 1.28) < 0.05);
  assert.equal(textoRetraso(marte), 'entre 4 y 24 minutos'); // dato publicado por la NASA
  // Dependencia: baterías grandes con paneles que no alcanzan
  const sel2 = { ...sel, baterias: ['bat_grande'] };
  assert.ok(dependencias(sel2, s.catalogo, marte, resumenDiseno(sel2, s.catalogo, marte, datosCompletos.hangar)).some((t) => t.includes('baterías grandes')));
});

test('aprendizaje: 3 conceptos por destino, con fuente, momento y pregunta; "Hoy aprendiste 3 cosas"', () => {
  const AP = leerJSON('aprendizaje.json');
  for (const d of ['luna', 'marte']) assert.equal(AP.porDestino[d].length, 3, d);
  for (const c of AP.conceptos) {
    assert.ok(c.titulo && c.corta && c.detalle && c.fuente.startsWith('https://') && c.momento.length, c.id);
    assert.ok(c.pregunta && c.pregunta.opciones[c.pregunta.correcta], `${c.id}: pregunta`);
  }
  const marte = leerJSON('destinos.json').destinos.find((d) => d.id === 'marte');
  const r = resumenAprendizaje({
    destino: marte, diseno: { energia: false }, aterrizaje: 'choque', muestras: 2, prediccion: true,
    registro: [{ id: 'senal', rol: 'comunicaciones', resultado: 'resuelta' }], estados: { paneles: 'bajo' }
  }, AP);
  assert.equal(r.length, 3);
  assert.match(r.find((f) => f.id === 'luz_marte').texto, /43%.*predijiste bien/);
  assert.match(r.find((f) => f.id === 'senal_marte').texto, /Recuperaste/);
  assert.match(r.find((f) => f.id === 'atmosfera_marte').texto, /chocó/);
  const luna = leerJSON('destinos.json').destinos.find((d) => d.id === 'luna');
  const rl = resumenAprendizaje({ destino: luna, diseno: { energia: true }, aterrizaje: 'suave', muestras: 0, registro: [], estados: { baterias: 'bajo' } }, AP);
  assert.deepEqual(rl.map((f) => f.id), ['gravedad_luna', 'noche_luna', 'senal_luna']);
  assert.match(rl[1].texto, /pocas baterías/);
});

test('logros: estrellas por vida, tiempo y preguntas; medallas por buenas decisiones', () => {
  const L = leerJSON('logros.json');
  const base = { exito: true, destinoId: 'luna', vida: 95, estados: { paneles: 'ok', baterias: 'ok' }, costo: 150, presupuesto: 300, impactos: 0, fraccionTiempo: 0.3, aciertos: 3, aprendidos: 6, totalConceptos: 6 };
  assert.equal(estrellasMision(base, L.estrellas), 3);
  assert.equal(estrellasMision({ ...base, vida: 40, fraccionTiempo: 0.9, aciertos: 0 }, L.estrellas), 1);
  assert.equal(estrellasMision({ ...base, exito: false }, L.estrellas), 0);
  const ids = nuevosLogros(base, L.logros, []);
  for (const id of ['primer_alunizaje', 'sin_rasgunos', 'diseno_perfecto', 'presupuesto_sobra', 'piloto_elite', 'tripulacion_sabia', 'coleccionista']) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes('rumbo_marte'));
  // Algo exagerado: no hay "Diseño perfecto"; gastar el 90%: no hay "Presupuesto de sobra"
  const peor = nuevosLogros({ ...base, estados: { paneles: 'exagerado' }, costo: 270 }, L.logros, []);
  assert.ok(!peor.includes('diseno_perfecto') && !peor.includes('presupuesto_sobra'));
  // Minijuegos: fuga en menos de 30 s y el filtro del Apolo 13
  assert.deepEqual(nuevosLogros({ minijuego: { id: 'fuga', segundos: 22 } }, L.logros, []), ['cazador_fugas']);
  assert.deepEqual(nuevosLogros({ minijuego: { id: 'fuga', segundos: 40 } }, L.logros, []), []);
  assert.deepEqual(nuevosLogros({ minijuego: { id: 'filtro' } }, L.logros, []), ['apolo13']);
  // No se repiten
  assert.deepEqual(nuevosLogros({ minijuego: { id: 'filtro' } }, L.logros, ['apolo13']), []);
});

test('sala con bots: puestos y personajes sin repetir, listos, y los bots ocupan los puestos libres', () => {
  const PJ = leerJSON('personajes.json').personajes;
  const s = new Sala('BOTS', { ...datosCompletos, personajes: PJ });
  s.unir('a', 'Ana'); s.unir('b', 'Beto');
  assert.deepEqual(s.accion('a', 'puesto', { rol: 'ingeniero' }), { ok: true });
  assert.ok(s.accion('b', 'puesto', { rol: 'ingeniero' }).error, 'puesto repetido');
  s.accion('b', 'puesto', { rol: 'cientifico' });
  s.accion('a', 'personaje', { id: 'zuri' });
  assert.ok(s.accion('b', 'personaje', { id: 'zuri' }).error, 'personaje repetido');
  assert.ok(s.accion('a', 'empezarConBots').error, 'faltan listos');
  s.accion('a', 'listoSala'); s.accion('b', 'listoSala');
  assert.ok(s.accion('b', 'empezarConBots').error, 'solo el anfitrión inicia');
  assert.deepEqual(s.accion('a', 'empezarConBots'), { ok: true });
  assert.deepEqual(s.bots.sort(), ['comandante', 'comunicaciones']);
  // Un humano puede usar los roles de los bots (por ejemplo, el aterrizaje del Piloto bot)
  assert.ok(s.rolesDe(s.jugadores.get('b')).includes('comandante'));
  // Cada rol tiene un personaje y no se repiten
  const pj = Object.values(s.personajesPorRol());
  assert.equal(new Set(pj).size, 4);
  assert.equal(s.personajesPorRol().ingeniero, 'zuri');
  // Si Beto se desconecta en plena partida, su puesto pasa a ser un bot
  s.salir('b');
  assert.deepEqual([...s.bots].sort(), ['cientifico', 'comandante', 'comunicaciones']);
  assert.ok(s.rolesDe(s.jugadores.get('a')).includes('cientifico'));
});

test('minijuego "Orden con retraso": siempre se puede ganar, en la Luna y en Marte', () => {
  for (const destino of ['luna', 'marte']) {
    for (let i = 0; i <= 20; i++) {
      // Recorre los extremos del azar: retraso mínimo y máximo, rover rápido y lento
      const valores = [i / 20, (i * 7 % 21) / 20];
      let k = 0;
      const p = parametrosRetraso(destino, () => valores[k++ % 2]);
      assert.ok(p.lineaEnvio > p.x0 + 10, `${destino}: la línea amarilla tiene que estar después de la salida`);
      const frena = dondeFrena(p, p.lineaEnvio);
      assert.ok(frena >= p.zona.a && frena <= p.zona.b, `${destino}: enviando en la línea amarilla, el rover frena en la zona verde`);
      if (destino === 'marte') assert.ok(p.D >= 1 && p.D <= 6, 'Marte: 4 a 24 min → 1 a 6 s');
      // Margen: aunque se envíe medio segundo antes o después de la línea, igual se gana
      for (const error of [-0.5, 0.5]) {
        const f2 = dondeFrena(p, p.lineaEnvio + error * p.v);
        assert.ok(f2 >= p.zona.a && f2 <= p.zona.b, `: con ${error} s de error frena en ${f2.toFixed(0)}`);
      }
    }
  }
});

test('minijuegos: cada emergencia usa un minijuego que existe y tiene objetivo/controles', () => {
  const src = readFileSync(new URL('../src/aventura/minijuegos/index.js', import.meta.url), 'utf8');
  const usados = new Set(JSON.stringify(EMERG).match(/"minijuego":"(\w+)"/g).map((s) => s.match(/"(\w+)"$/)[1]));
  assert.ok(usados.size >= 8);
  for (const id of usados) {
    assert.match(src, new RegExp(`\\b${id}: \\{ fn: ${id}, rol: '\\w+', nombre: '[^']+',\\s*objetivo: '[^']+',\\s*controles: '[^']+',\\s*gana: '[^']+'`), `falta "${id}" con sus textos`);
  }
});

test('puertas con E: la sala guarda cuáles están abiertas (se sincroniza para todos)', () => {
  const s = new Sala('PUER', datosCompletos);
  s.unir('a', 'Ana'); s.unir('b', 'Beto');
  assert.deepEqual(s.accion('b', 'puerta', { i: 2, abierta: true }), { ok: true });
  assert.equal(s.estadoPublico().puertas[2], true);
  s.accion('a', 'puerta', { i: 2, abierta: false });
  assert.equal(s.estadoPublico().puertas[2], false);
  assert.ok(s.accion('a', 'puerta', { i: 'x', abierta: true }).error);
});

test('preguntas: al menos 8 por destino y cada respuesta correcta coincide con los datos de los JSON', () => {
  const PREG = leerJSON('preguntas.json');
  const archivos = { 'destinos.json': leerJSON('destinos.json'), 'hechos_reales.json': leerJSON('hechos_reales.json') };
  const leer = (archivo, ruta) => {
    const partes = ruta.split('.');
    let x = archivos[archivo];
    if (archivo === 'destinos.json') { const id = partes.shift(); x = x.destinos.find((d) => d.id === id); }
    for (const k of partes) x = x[k];
    return x;
  };
  const numero = (s) => Number(String(s).replace(/\s/g, '').replace(',', '.'));
  for (const destino of ['luna', 'marte']) {
    assert.ok(PREG[destino].length >= 8, `${destino}: ${PREG[destino].length} preguntas`);
    assert.equal(new Set(PREG[destino].map((p) => p.id)).size, PREG[destino].length, 'ids sin repetir');
    for (const p of PREG[destino]) {
      assert.ok(p.pista && p.explicacion && p.incorrectas.length === 3, p.id);
      assert.ok(!p.incorrectas.includes(p.correcta), `${p.id}: la correcta no puede estar entre las incorrectas`);
      assert.ok(p.correcta.includes(p.enRespuesta), `${p.id}: la respuesta dice "${p.enRespuesta}"`);
      const v = leer(p.dato.archivo, p.dato.ruta);
      assert.ok(v !== undefined, `${p.id}: no existe ${p.dato.ruta}`);
      if (p.dato.valor !== undefined) {
        assert.equal(v, p.dato.valor, `${p.id}: el JSON dice ${v}`);
        if (/\d/.test(p.enRespuesta)) assert.equal(numero(p.enRespuesta.replace(/[^\d,\s-]/g, '')), p.dato.ruta.endsWith('retrasoMaxSeg') ? v / 60 : v, `${p.id}: número de la respuesta`);
      }
      if (p.dato.contiene) assert.ok(String(v).toLowerCase().includes(p.dato.contiene.toLowerCase()), `${p.id}: "${p.dato.contiene}" no está en ${p.dato.ruta}`);
      if (p.dato.menorQue) for (const r of p.dato.menorQue) assert.ok(v < leer(p.dato.archivo, r), `${p.id}: ${p.dato.ruta} < ${r}`);
    }
  }
});

test('preguntas: 3 al azar sin repetir las de la partida anterior y con las opciones mezcladas', () => {
  const pool = leerJSON('preguntas.json').luna;
  const primera = elegirPreguntas(pool, 3);
  assert.equal(primera.length, 3);
  const segunda = elegirPreguntas(pool, 3, primera.map((p) => p.id));
  assert.ok(segunda.every((p) => !primera.some((q) => q.id === p.id)), 'no se repiten');
  // La correcta no queda siempre en el mismo lugar, y siempre se la encuentra
  const lugares = new Set();
  for (let i = 0; i < 200; i++) {
    const q = prepararPregunta(pool[0]);
    assert.equal(q.opciones[q.correcta], pool[0].correcta);
    lugares.add(q.correcta);
  }
  assert.equal(lugares.size, 4, 'la correcta aparece en las 4 posiciones');
});

test('hangar: no deja pasarse del presupuesto', () => {  
  const s = salaEnHangar();
  s.accion('b', 'comprar', { opcion: 'sv_reciclaje' }); // 120
  s.accion('a', 'comprar', { opcion: 'estr_blindada' }); // 45
  s.accion('a', 'comprar', { opcion: 'prop_grande' }); // 45
  s.accion('b', 'comprar', { opcion: 'radar' }); // 35 → 245
  const r = s.accion('b', 'comprar', { opcion: 'ant_alta' }); // 30 → 275 > 270
  assert.ok(r.error && r.error.includes('No alcanza'));
});

test('viaje: aparecen emergencias, se resuelven y, si no, la nave pierde vida', () => {
  const v = nuevoViaje(EMERG.config, {});
  let t = 0;
  while (!v.emergencias.length && t < 30) { avanzarViaje(v, 0.5, EMERG.emergencias, EMERG.config, () => 0.3); t += 0.5; }
  assert.ok(v.emergencias.length > 0, 'debería aparecer una emergencia');
  const e = v.emergencias[0];
  assert.ok(resolverEmergencia(v, e.uid, ['otro_rol'], true).error, 'otro rol no puede resolverla');
  assert.deepEqual(resolverEmergencia(v, e.uid, [e.rol], true), { ok: true });
  // Ahora dejamos que una venza
  while (!v.emergencias.length) avanzarViaje(v, 0.5, EMERG.emergencias, EMERG.config, () => 0.3);
  const vidaAntes = v.vida;
  avanzarViaje(v, EMERG.config.tiempoParaResolver + 1, EMERG.emergencias, EMERG.config, () => 0.99);
  assert.ok(v.vida < vidaAntes, 'la nave pierde vida');
  assert.ok(v.registro.some((r) => r.resultado === 'fallida'));
});

test('viaje: sin blindaje, los meteoritos están agravados; con blindaje, no', () => {
  const met = EMERG.emergencias.find((e) => e.id === 'meteoritos');
  assert.equal(estaAgravada(met, {}), true);
  assert.equal(estaAgravada(met, { blindaje: true }), false);
});

test('viaje: la misma tarea no se repite dos veces seguidas en un rol', () => {
  const v = nuevoViaje(EMERG.config, {});
  v.ultimaPorRol.comandante = 'trayectoria';
  for (let i = 0; i < 50; i++) {
    const e = elegirEmergencia(v, EMERG.emergencias, Math.random);
    assert.notEqual(e.id, 'trayectoria');
  }
});

test('viaje: al terminar el tiempo con vida se llega; con vida 0 fracasa', () => {
  const v = nuevoViaje(EMERG.config, {});
  avanzarViaje(v, EMERG.config.duracionViaje + 1, EMERG.emergencias, EMERG.config, () => 0.5);
  assert.equal(v.terminado, 'llegada');
  const w = nuevoViaje(EMERG.config, {});
  w.vida = 0;
  avanzarViaje(w, 0.1, EMERG.emergencias, EMERG.config);
  assert.equal(w.terminado, 'fracaso');
});
