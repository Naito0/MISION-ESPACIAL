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

const EMERG = JSON.parse(readFileSync(new URL('../src/data/emergencias3d.json', import.meta.url), 'utf8'));
const datos = { emergencias: EMERG, destinos: [], misionesReales: [] };

test('cada rol tiene 3 emergencias distintas', () => {
  for (const rol of ROLES_ID) {
    const delRol = EMERG.emergencias.filter((e) => e.rol === rol);
    assert.equal(delRol.length, 3, rol);
    assert.equal(new Set(delRol.map((e) => e.minijuego)).size, 3, `${rol}: minijuegos repetidos`);
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
  assert.equal(n.configViaje.maxSimultaneas, 2);
  assert.ok(n.configViaje.tiempoParaResolver < s.configViaje.tiempoParaResolver);
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
  assert.equal(textoRetraso(marte), 'entre 3 y 22 minutos');
  // Dependencia: baterías grandes con paneles que no alcanzan
  const sel2 = { ...sel, baterias: ['bat_grande'] };
  assert.ok(dependencias(sel2, s.catalogo, marte, resumenDiseno(sel2, s.catalogo, marte, datosCompletos.hangar)).some((t) => t.includes('baterías grandes')));
});

test('aprendizaje: 12 conceptos con fuente y momento; el resumen da 3 a 5 conceptos de lo que pasó', () => {
  const AP = leerJSON('aprendizaje.json');
  assert.equal(AP.conceptos.length, 12);
  for (const c of AP.conceptos) {
    assert.ok(c.titulo && c.explicacion && c.dato && c.fuente.startsWith('https://') && c.momento.length, c.id);
  }
  const marte = leerJSON('destinos.json').destinos.find((d) => d.id === 'marte');
  const r = resumenAprendizaje({
    destino: marte, diseno: { energia: false, blindaje: false }, aterrizaje: 'choque', muestras: 2,
    registro: [{ id: 'meteoritos', resultado: 'fallida' }, { id: 'senal', resultado: 'resuelta' }]
  }, AP.conceptos);
  assert.ok(r.length >= 3 && r.length <= 5);
  assert.match(r[0].texto, /43%/, 'los paneles en Marte, conectado con lo que pasó');
  assert.ok(r.some((f) => f.id === 'gravedad' && f.texto.includes('3.71')));
  assert.ok(r.some((f) => f.id === 'micrometeoritos' && f.texto.includes('Sin blindaje')));
  // Una partida tranquila en la Luna también da al menos 3
  const luna = leerJSON('destinos.json').destinos.find((d) => d.id === 'luna');
  assert.ok(resumenAprendizaje({ destino: luna, diseno: { energia: true }, aterrizaje: null, muestras: 0, registro: [] }, AP.conceptos).length >= 3);
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
