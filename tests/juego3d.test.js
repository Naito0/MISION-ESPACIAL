// Pruebas de la lógica compartida del juego 3D (sala y viaje). Ejecutar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Sala, generarCodigo, ROLES_ID } from '../src/compartido/sala.js';
import { nuevoViaje, avanzarViaje, resolverEmergencia, elegirEmergencia, estaAgravada } from '../src/compartido/viaje.js';

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
  assert.equal(s.fase, 'viaje');
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
