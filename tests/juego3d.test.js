// Pruebas de la lógica compartida del juego 3D (sala y viaje). Ejecutar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Sala, generarCodigo, ROLES_ID } from '../src/compartido/sala.js';
import { nuevoViaje, avanzarViaje, resolverEmergencia, elegirEmergencia, estaAgravada } from '../src/compartido/viaje.js';
import { calcularInforme } from '../src/compartido/informe.js';

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
  assert.equal(s.fase, 'informe');
  const inf = s.estadoPublico().informe;
  assert.equal(inf.exito, true);
  assert.ok(inf.creditos > 0);
  assert.ok(inf.mision && inf.mision.destino === 'marte' && inf.mision.fuente.startsWith('https://'));
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
