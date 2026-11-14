// =============================================================
// Pruebas de la lógica pura (sin Phaser ni navegador).
// Ejecutar con:  npm test
// Sirven para comprobar que un cambio en los JSON o en las fórmulas
// no rompe el juego (por ejemplo, que el diseño tutorial pueda ganar).
// =============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { calcularDiseno, ambienteDe, balanceOperativo, vidaEsperada, calcularMargenes, compatibilidadInstrumento } from '../src/systems/recursos.js';
import { verificarCohete, coheteMasBarato, calcularInsercion } from '../src/systems/lanzamiento.js';
import { sortearEventos } from '../src/systems/eventos.js';
import { simularMision } from '../src/systems/simulacion.js';
import { evaluarRequisitos, calcularPuntaje } from '../src/systems/puntaje.js';
import { asignarRoles } from '../src/systems/roles.js';
import { generarExplicaciones, misionesParecidas } from '../src/systems/informe.js';
import { calcularSoporte } from '../src/systems/soporteVital.js';
import { sortearAverias, viajeIntacto, registrarAveria, estaMitigada } from '../src/systems/averias.js';

import { generarChecklist } from '../src/systems/checklist.js';
import { valorPorObjetivo } from '../src/systems/recursos.js';

test('checklist: el CubeSat bien diseñado cumple todos los requisitos estimados', () => {
  const { mision, destino, orbita, diseno, ambiente } = prepararCubesat();
  const operativo = balanceOperativo(diseno, ambiente);
  const a = {
    diseno, operativo, orbita, destino,
    vidaEsperada: vidaEsperada(diseno, ambiente),
    costoTotal: diseno.costoComponentes + 1,
    valorObjetivos: valorPorObjetivo(diseno, ambiente, mision.objetivos, operativo.fraccionOperacion).porObjetivo,
    soporte: null
  };
  const items = generarChecklist(a, mision, mision.presupuesto);
  assert.deepEqual(items.filter((i) => !i.ok).map((i) => i.texto), []);
});

import { simularEnDestino, mejoresPorFila } from '../src/systems/comparadorDestinos.js';

function compararCubesat(orbitaId) {
  const mision = MISIONES.find((m) => m.id === 'cubesat_tierra');
  const orbita = ORBITAS.find((o) => o.id === orbitaId);
  return simularEnDestino({
    mision, seleccion: SELECCION_CUBESAT, orbita, destino: DESTINOS.find((d) => d.id === orbita.destino),
    categorias: CATEGORIAS, cohetes: COHETES, eventos: EVENTOS, config: CONFIG, presupuesto: mision.presupuesto
  });
}

test('comparación de destinos: el CubeSat funciona en la Tierra pero no llega a la Luna', () => {
  const tierra = compararCubesat('tierra_leo');
  const luna = compararCubesat('luna_alta');
  assert.equal(tierra.llego, true);
  assert.ok(tierra.datosEnviados > 0);
  assert.equal(luna.llego, false);
  assert.match(luna.explicacion, /Luna/);
  const mejores = mejoresPorFila([tierra, luna]);
  assert.deepEqual(mejores.llego, [true, false]);
});

test('comparación de destinos: siempre es igual con la misma semilla', () => {
  assert.equal(compararCubesat('tierra_sso').puntaje, compararCubesat('tierra_sso').puntaje);
});

test('cada destino de prueba de cada misión existe en orbitas.json', () => {
  for (const m of MISIONES) {
    for (const id of m.destinosPrueba || []) assert.ok(ORBITAS.some((o) => o.id === id), `${m.id}: ${id}`);
    assert.ok((m.destinosPrueba || []).length >= 2, `${m.id} necesita al menos 2 destinos de prueba`);
  }
});

const AVERIAS = JSON.parse(readFileSync(new URL('../src/data/eventos.json', import.meta.url), 'utf8')).averiasViaje;

test('soporte vital: ida + estadía + vuelta por tripulante', () => {
  const s = calcularSoporte({ tripulantes: 2, diasViaje: 4, diasSuperficie: 7, diasPersona: 30 });
  assert.equal(s.necesario, 30);
  assert.equal(s.suficiente, true);
  const conDemora = calcularSoporte({ tripulantes: 2, diasViaje: 4, diasSuperficie: 7, diasExtra: 1, diasPersona: 30 });
  assert.equal(conDemora.suficiente, false); // un día de demora ya no alcanza: hace falta reserva
});

test('averías: las de tripulación solo aparecen en misiones tripuladas', () => {
  const sinTripulacion = sortearAverias(AVERIAS, 10, false);
  assert.ok(sinTripulacion.every((a) => !a.soloTripulada));
  assert.equal(sortearAverias(AVERIAS, 10, true).length, AVERIAS.length);
});

test('averías: reparar evita el daño, fallar lo aplica', () => {
  const grieta = AVERIAS.find((a) => a.id === 'grieta_casco');
  const reparada = registrarAveria(viajeIntacto(), grieta, 'reparada');
  assert.equal(reparada.perdidaCombustible, 0);
  const fallida = registrarAveria(viajeIntacto(), grieta, 'fallida');
  assert.ok(fallida.perdidaCombustible > 0);
  assert.equal(estaMitigada(grieta, ['impactos']), true);
});

test('la expedición tripulada a la Luna tiene un diseño posible', () => {
  const mision = MISIONES.find((m) => m.id === 'luna_tripulada');
  const orbita = ORBITAS.find((o) => o.id === mision.orbitaSugerida);
  const diseno = calcularDiseno({
    estructura: 'estr_reforzada', paneles: 'pan_grandes', baterias: 'bat_grande', propulsion: 'prop_media',
    termica: 'term_manta', avionica: 'comp_estandar', actitud: 'act_ruedas', antena: 'ant_media',
    estaciones: 'est_regional', instrumentos: ['espectrometro'], soporte: 'sv_reserva'
  }, CATEGORIAS, CONFIG.riesgo);
  assert.ok(diseno.masaTotal <= diseno.capacidadMasa, `masa ${diseno.masaTotal} > ${diseno.capacidadMasa}`);
  const cohete = coheteMasBarato(COHETES, orbita, diseno.masaTotal);
  assert.ok(cohete, 'ningún cohete la lleva');
  assert.ok(diseno.costoComponentes + cohete.costo <= mision.presupuesto);
  const s = calcularSoporte({ tripulantes: mision.tripulantes, diasViaje: 4, diasSuperficie: mision.diasSuperficie, diasPersona: diseno.diasPersona });
  assert.equal(s.suficiente, true);
  assert.ok(diseno.empuje / (diseno.masaTotal * 1.62) > 1.5, 'el motor no alcanza para aterrizar');
});

const leer = (nombre) => JSON.parse(readFileSync(new URL(`../src/data/${nombre}`, import.meta.url), 'utf8'));
const CATEGORIAS = leer('componentes.json').categorias;
const MISIONES = leer('misiones.json').misiones;
const ORBITAS = leer('orbitas.json').orbitas;
const COHETES = leer('cohetes.json').cohetes;
const DESTINOS = leer('destinos.json').destinos;
const EVENTOS = leer('eventos.json').eventos;
const ROLES = leer('roles.json').roles;
const REALES = leer('misiones_reales.json').misiones;
const CONFIG = leer('config.json');

// Un diseño razonable para el CubeSat tutorial
const SELECCION_CUBESAT = {
  estructura: 'cs_chasis3u', paneles: 'cs_pan_despl', baterias: 'cs_bat20', propulsion: 'cs_sin_prop',
  termica: 'cs_calefactor', avionica: 'cs_obc', actitud: 'cs_magnet', antena: 'cs_banda_s',
  estaciones: 'cs_est_red', instrumentos: ['cs_camara']
};

function prepararCubesat(seleccion = SELECCION_CUBESAT) {
  const mision = MISIONES.find((m) => m.id === 'cubesat_tierra');
  const destino = DESTINOS.find((d) => d.id === mision.destino);
  const orbita = ORBITAS.find((o) => o.id === mision.orbitaSugerida);
  const diseno = calcularDiseno(seleccion, CATEGORIAS, CONFIG.riesgo);
  const ambiente = ambienteDe(mision, destino, orbita);
  return { mision, destino, orbita, diseno, ambiente };
}

test('todos los componentes tienen los campos básicos', () => {
  for (const cat of CATEGORIAS) {
    for (const op of cat.opciones) {
      for (const campo of ['id', 'nombre', 'nivel', 'escala', 'confiabilidad', 'costo', 'masa', 'tooltip']) {
        assert.ok(op[campo] !== undefined, `${op.id} no tiene "${campo}"`);
      }
    }
  }
});

test('cada misión tiene opciones en todas las categorías obligatorias', () => {
  for (const m of MISIONES) {
    for (const cat of CATEGORIAS.filter((c) => c.obligatoria)) {
      assert.ok(cat.opciones.some((o) => o.escala === m.escala), `${m.id} no tiene opciones de ${cat.id}`);
    }
  }
});

test('el CubeSat tutorial bien diseñado cabe en el viaje compartido y en el presupuesto', () => {
  const { mision, orbita, diseno } = prepararCubesat();
  assert.deepEqual(diseno.faltantes, []);
  const cohete = coheteMasBarato(COHETES, orbita, diseno.masaTotal);
  assert.equal(cohete.id, 'compartido');
  assert.ok(diseno.costoComponentes + cohete.costo <= mision.presupuesto);
});

test('el CubeSat tutorial bien diseñado cumple todos los requisitos', () => {
  const { mision, orbita, diseno, ambiente } = prepararCubesat();
  const operativo = balanceOperativo(diseno, ambiente);
  const sim = simularMision({
    diseno, ambiente, vidaEsperada: vidaEsperada(diseno, ambiente), duracionMeses: mision.duracionMeses,
    eventos: [], insercionOk: true, objetivos: mision.objetivos
  });
  const lanzamiento = {
    costoTotal: diseno.costoComponentes + 1,
    insercion: calcularInsercion(diseno.masaTotal, diseno.combustible, orbita),
    margenes: calcularMargenes(diseno, operativo, 12)
  };
  const requisitos = evaluarRequisitos({ mision, lanzamiento, aterrizaje: null, resumen: sim.resumen, presupuesto: mision.presupuesto });
  const fallidos = requisitos.filter((r) => !r.ok).map((r) => r.texto);
  assert.deepEqual(fallidos, []);
  const puntaje = calcularPuntaje({ requisitos, resumen: sim.resumen, mision, lanzamiento, presupuesto: mision.presupuesto, modoEquipo: false, config: CONFIG });
  assert.ok(puntaje.total > 500, `puntaje bajo: ${puntaje.total}`);
});

test('con antena UHF y una sola estación, el CubeSat pierde datos (compensación del segmento terrestre)', () => {
  const { diseno, ambiente } = prepararCubesat({ ...SELECCION_CUBESAT, antena: 'cs_uhf', estaciones: 'cs_est_uni' });
  const op = balanceOperativo(diseno, ambiente);
  assert.ok(op.capacidadEnvioDia < op.datosGeneradosDia);
});

test('los paneles en el cuerpo no alcanzan para el CubeSat (compensación de energía)', () => {
  const { diseno, ambiente } = prepararCubesat({ ...SELECCION_CUBESAT, paneles: 'cs_pan_cuerpo' });
  const op = balanceOperativo(diseno, ambiente);
  assert.ok(op.fraccionEnergia < 1);
});

test('los componentes nuevos aumentan el riesgo', () => {
  const probado = calcularDiseno(SELECCION_CUBESAT, CATEGORIAS, CONFIG.riesgo).riesgo;
  const nuevo = calcularDiseno({ ...SELECCION_CUBESAT, avionica: 'cs_obc_plus', instrumentos: ['cs_multi'] }, CATEGORIAS, CONFIG.riesgo).riesgo;
  assert.ok(nuevo > probado);
});

test('los instrumentos incompatibles se detectan con su explicación', () => {
  const mision = MISIONES.find((m) => m.id === 'cubesat_tierra');
  const r = compatibilidadInstrumento(mision, 'cs_radiacion');
  assert.equal(r.ok, false);
  assert.ok(r.razon.length > 0);
  assert.equal(compatibilidadInstrumento(mision, 'cs_camara').ok, true);
});

test('un cohete que no llega a la órbita lo explica', () => {
  const ligero = COHETES.find((c) => c.id === 'ligero');
  const geo = ORBITAS.find((o) => o.id === 'tierra_geo');
  const v = verificarCohete(ligero, geo, 300);
  assert.equal(v.ok, false);
  assert.match(v.motivo, /no tiene potencia/i);
});

test('sin combustible suficiente la inserción falla y la simulación no opera', () => {
  const marteBaja = ORBITAS.find((o) => o.id === 'marte_baja');
  const ins = calcularInsercion(800, 100, marteBaja);
  assert.equal(ins.ok, false);
  const { diseno, ambiente, mision } = prepararCubesat();
  const sim = simularMision({ diseno, ambiente, vidaEsperada: 10, duracionMeses: 12, eventos: [], insercionOk: false, objetivos: mision.objetivos });
  assert.equal(sim.resumen.murioPor, 'insercion');
  assert.equal(sim.pasos.length, 0);
});

test('sortearEventos respeta la cantidad de eventos del ambiente', () => {
  const lista = sortearEventos(EVENTOS, 2, 12, 0, 1);
  assert.equal(lista.length, 2); // con riesgo 0 no hay fallas internas
  assert.ok(lista.every((e) => e.mes >= 1 && e.mes <= 11));
});

test('los roles se reparten entre 2 jugadores', () => {
  const r = asignarRoles(ROLES, 2);
  assert.equal(r.length, 2);
  assert.equal(r[0].roles.length + r[1].roles.length, 4);
});

test('cada misión muestra 1 o 2 misiones reales parecidas', () => {
  for (const m of MISIONES) {
    const p = misionesParecidas(m, REALES);
    assert.ok(p.length >= 1 && p.length <= 2, `${m.id}: ${p.length}`);
  }
});

test('el informe genera explicaciones aunque la nave no opere', () => {
  const { mision, destino, orbita, diseno, ambiente } = prepararCubesat();
  const operativo = balanceOperativo(diseno, ambiente);
  const lista = generarExplicaciones({
    mision, destino, orbita, cohete: COHETES[0], coheteBarato: COHETES[0], diseno, ambiente,
    lanzamiento: {
      masaTotal: diseno.masaTotal, costoComponentes: diseno.costoComponentes, costoCohete: 1, costoRetraso: 0,
      costoTotal: diseno.costoComponentes + 1, mesesDesarrollo: diseno.mesesDesarrollo,
      insercion: { ok: false, necesario: 5, gastado: 0, quedan: 0 },
      margenes: calcularMargenes(diseno, operativo, 12), vidaEsperada: 10, operativo
    },
    aterrizaje: null, resumen: null, modoEquipo: false, presupuesto: mision.presupuesto, config: CONFIG
  });
  assert.ok(lista.length >= 3);
});
