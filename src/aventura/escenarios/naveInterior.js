// =============================================================
// naveInterior.js — El interior 3D de la nave.
//
//                    [ CABINA (Comandante) ]  ← ventanal al espacio
//                              |
//   [ INGENIERÍA ] ——— pasillo ——— [ LABORATORIO ]
//   [ COMUNICAC. ] ———    |    ——— [ ENFERMERÍA/BODEGA ]
//                              |
//                        [ ESCLUSA ]
//
// Cada sala tiene la luz del color de su rol, consolas, pantallas y objetos.
// Las puertas se abren solas. Devuelve el escenario con:
//   consolas (para las tareas), puertas, salas y actualizar(dt, t).
// =============================================================
import * as THREE from 'three';
import { nuevoEscenario, caja, cilindro, material, texturaCuadricula, habitacion } from '../engine/construccion.js';
import { consola, pantalla, franjaLuz, tuberia, pilaCajas, cielo, particulas } from '../engine/decoracion.js';
import { Puerta } from '../entities/Puerta.js';
import { ObjetoAbrible } from '../entities/ObjetoAbrible.js';
import { texturasNave, vestirPared, agregarDetallesNave } from './detallesNave.js';

const ALTO = 3.4;
// Colores de cada rol (los mismos de roles.json)
export const COLOR_SALA = { comandante: 0xffd166, ingeniero: 0x7cc4ff, cientifico: 0x5be08a, comunicaciones: 0xff9fdc, neutro: 0xdfe6f5 };

/**
 * @param o.colorPlaneta color del planeta de destino (se ve por el ventanal)
 * @param o.particulas mostrar partículas (según la calidad)
 */
export function crearNaveInterior(o = {}) {
  const esc = nuevoEscenario();
  esc.consolas = [];
  esc.salas = {};
  const animados = []; // cosas que se mueven cada cuadro

  // Piso de rejilla metálica y paredes con paneles (texturas hechas con código, compartidas)
  const calidad = o.calidad || 'medio';
  const texPiso = texturasNave().piso.clone(); texPiso.repeat.set(24, 24); texPiso.needsUpdate = true;
  const piso = material(0xffffff, { textura: texPiso, rugosidad: 0.55, metal: 0.55 });
  const pared = vestirPared(material(0x7d88a6, { rugosidad: 0.55, metal: 0.45 }), calidad, [4, 1]);
  const paredClara = vestirPared(material(0xa4aecb, { rugosidad: 0.5, metal: 0.35 }), calidad, [6, 1]);

  // ---------- Pasillo central (z de -24 a 8) ----------
  caja(esc, 4, 0.2, 32, piso, 0, -0.1, -8, { sombra: false });
  caja(esc, 4, 0.2, 32, pared, 0, ALTO + 0.1, -8, { sombra: false });
  // Paredes del pasillo con huecos para las puertas laterales (z = -16 y z = -4)
  for (const x of [-2, 2]) {
    for (const [z0, z1] of [[-24, -17.2], [-14.8, -5.2], [-2.8, 8]]) {
      caja(esc, 0.3, ALTO, z1 - z0, paredClara, x, ALTO / 2, (z0 + z1) / 2);
    }
    for (const zc of [-16, -4]) caja(esc, 0.3, ALTO - 2.9, 2.4, paredClara, x, 2.9 + (ALTO - 2.9) / 2, zc);
  }
  // Franjas de luz del techo y líneas guía en el piso
  for (let z = -22; z <= 6; z += 4) franjaLuz(esc, 2.6, 0xbfd8ff, 0, ALTO - 0.05, z, Math.PI / 2);
  franjaLuz(esc, 30, 0x2b5cab, -1.6, 0.02, -8, Math.PI / 2);
  franjaLuz(esc, 30, 0x2b5cab, 1.6, 0.02, -8, Math.PI / 2);
  tuberia(esc, 30, 0.08, 0x9aa6c8, -1.75, 2.9, -8, Math.PI / 2);
  tuberia(esc, 30, 0.06, 0xd9b44a, 1.75, 3.0, -8, Math.PI / 2);
  luzSala(esc, 0, -18, 0xbfd8ff, 10);
  luzSala(esc, 0, -6, 0xbfd8ff, 10);
  luzSala(esc, 0, 4, 0xbfd8ff, 10);
  esc.salas.pasillo = { nombre: 'Pasillo', centro: new THREE.Vector3(0, 0, -8) };

  // ---------- Puertas ----------
  esc.puertas.push(
    new Puerta(esc, -2, -16, 'z', COLOR_SALA.ingeniero),
    new Puerta(esc, 2, -16, 'z', COLOR_SALA.cientifico),
    new Puerta(esc, -2, -4, 'z', COLOR_SALA.comunicaciones),
    new Puerta(esc, 2, -4, 'z', COLOR_SALA.neutro),
    new Puerta(esc, 0, -24, 'x', COLOR_SALA.comandante),
    new Puerta(esc, 0, 8, 'x', COLOR_SALA.neutro)
  );

  // ---------- CABINA (Comandante) ----------
  const cabina = { cx: 0, cz: -30 };
  habitacion(esc, cabina.cx, cabina.cz, 12, 12, ALTO, pared, piso, { techo: true, huecos: [{ lado: 'sur', ancho: 2.4 }], sinPared: ['norte'] });
  // Ventanal: marco + vidrio sólido (no se puede atravesar)
  caja(esc, 12, 0.9, 0.3, pared, 0, 0.45, -36);
  caja(esc, 12, 0.5, 0.3, pared, 0, ALTO - 0.25, -36);
  caja(esc, 0.4, ALTO, 0.3, pared, -5.8, ALTO / 2, -36);
  caja(esc, 0.4, ALTO, 0.3, pared, 5.8, ALTO / 2, -36);
  const vidrio = caja(esc, 11.2, ALTO - 1.4, 0.05, new THREE.MeshStandardMaterial({ color: 0x88aaff, transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0.9 }), 0, 0.9 + (ALTO - 1.4) / 2, -36, { sombra: false });
  vidrio.castShadow = false;
  // Asientos de piloto
  for (const x of [-1.6, 1.6]) {
    caja(esc, 0.9, 0.5, 0.9, material(0x2a3150), x, 0.45, -32.2);
    caja(esc, 0.9, 1.1, 0.2, material(0x2a3150), x, 1.0, -31.7);
  }
  const cmd = consola(esc, 0, -34.4, 0, COLOR_SALA.comandante, 'NAVEGACIÓN', 'grafico');
  esc.consolas.push({ id: 'cabina', rol: 'comandante', sala: 'Cabina', grupo: cmd.grupo, pantalla: cmd.pantalla });
  const cmd2 = consola(esc, -4, -33.5, Math.PI / 5, COLOR_SALA.comandante, 'PROPULSORES', 'texto');
  esc.consolas.push({ id: 'propulsores', rol: 'comandante', sala: 'Cabina', grupo: cmd2.grupo, pantalla: cmd2.pantalla });
  pantalla(esc, 3, 1.2, COLOR_SALA.comandante, 'TRAYECTORIA', 'grafico', -5.85, 2.2, -28, Math.PI / 2);
  luzSala(esc, 0, -29, COLOR_SALA.comandante, 22);
  esc.salas.cabina = { nombre: 'Cabina', rol: 'comandante', centro: new THREE.Vector3(0, 0, -30) };

  // ---------- INGENIERÍA / SALA DE MÁQUINAS (Ingeniero) ----------
  habitacion(esc, -7, -16, 10, 10, ALTO, pared, piso, { techo: true, sinPared: ['este'] });
  // Reactor: núcleo que brilla + anillos que giran
  const nucleo = cilindro(esc, 0.7, 2.6, new THREE.MeshStandardMaterial({ color: 0x7cf3ff, emissive: 0x3fd0ff, emissiveIntensity: 2.2 }), -8.5, 1.3, -16);
  const anillos = [0.9, 1.15].map((r, i) => {
    const a = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 8, 32), material(0x9aa6c8, { metal: 0.8, rugosidad: 0.2 }));
    a.position.set(-8.5, 0.8 + i * 1.2, -16);
    a.rotation.x = Math.PI / 2;
    esc.visual.add(a);
    return a;
  });
  animados.push((dt, t) => {
    anillos[0].rotation.z += dt * 1.4;
    anillos[1].rotation.z -= dt * 0.9;
    nucleo.material.emissiveIntensity = 1.8 + Math.sin(t * 3) * 0.5;
  });
  for (const z of [-20, -12]) tuberia(esc, 9, 0.15, 0xd9b44a, -7, 2.6, z, 0);
  tuberia(esc, 9, 0.1, 0x9aa6c8, -11.8, 1.0, -16, Math.PI / 2);
  const ing = consola(esc, -5, -19.8, 0, COLOR_SALA.ingeniero, 'ENERGÍA', 'grafico');
  esc.consolas.push({ id: 'energia', rol: 'ingeniero', sala: 'Ingeniería', grupo: ing.grupo, pantalla: ing.pantalla });
  const ing2 = consola(esc, -11.4, -12.6, Math.PI / 2, COLOR_SALA.ingeniero, 'CASCO', 'texto');
  esc.consolas.push({ id: 'casco', rol: 'ingeniero', sala: 'Ingeniería', grupo: ing2.grupo, pantalla: ing2.pantalla });
  pilaCajas(esc, [[-4, 0, -12], [-4, 0.9, -12], [-3.9, 0, -13]], 0x6a5a3a);
  luzSala(esc, -7, -16, COLOR_SALA.ingeniero, 22);
  esc.salas.ingenieria = { nombre: 'Ingeniería', rol: 'ingeniero', centro: new THREE.Vector3(-7, 0, -16) };

  // ---------- LABORATORIO / INVERNADERO (Científico) ----------
  habitacion(esc, 7, -16, 10, 10, ALTO, pared, piso, { techo: true, sinPared: ['oeste'] });
  // Mesas de laboratorio con tubos que brillan
  for (const z of [-19, -13]) {
    caja(esc, 3, 0.9, 1, material(0xdfe6f5, { metal: 0.2 }), 8, 0.45, z);
    for (let i = 0; i < 4; i++) {
      const tubo = cilindro(esc, 0.07, 0.4, new THREE.MeshStandardMaterial({ color: 0x5be08a, emissive: 0x5be08a, emissiveIntensity: 1.5, transparent: true, opacity: 0.8 }), 7 + i * 0.6, 1.1, z, { solida: false });
      tubo.castShadow = false;
    }
  }
  // Invernadero: estantes con plantas
  for (let i = 0; i < 3; i++) {
    caja(esc, 0.5, 2.4, 3, material(0x39425e), 11.6, 1.2, -18 + i * 2.2 + 0.5);
    for (let j = 0; j < 3; j++) {
      const planta = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), material(0x3cc46e, { rugosidad: 0.9, metal: 0 }));
      planta.position.set(11.2, 0.6 + j * 0.8, -18 + i * 2.2 + 0.5);
      esc.visual.add(planta);
    }
  }
  franjaLuz(esc, 3, 0xd070ff, 11.0, 2.6, -16, Math.PI / 2); // luz de crecimiento (violeta)
  const cie = consola(esc, 5, -12.2, Math.PI, COLOR_SALA.cientifico, 'OXÍGENO', 'grafico');
  esc.consolas.push({ id: 'oxigeno', rol: 'cientifico', sala: 'Laboratorio', grupo: cie.grupo, pantalla: cie.pantalla });
  const cie2 = consola(esc, 5, -19.8, 0, COLOR_SALA.cientifico, 'MUESTRAS', 'texto');
  esc.consolas.push({ id: 'muestras', rol: 'cientifico', sala: 'Laboratorio', grupo: cie2.grupo, pantalla: cie2.pantalla });
  luzSala(esc, 7, -16, COLOR_SALA.cientifico, 22);
  esc.salas.laboratorio = { nombre: 'Laboratorio', rol: 'cientifico', centro: new THREE.Vector3(7, 0, -16) };

  // ---------- COMUNICACIONES (Comunicaciones) ----------
  habitacion(esc, -7, -4, 10, 10, ALTO, pared, piso, { techo: true, sinPared: ['este'] });
  const pantRadar = pantalla(esc, 3.2, 1.8, COLOR_SALA.comunicaciones, 'RADAR', 'radar', -11.8, 1.9, -4, Math.PI / 2);
  // Línea del radar que gira sobre la pantalla
  const barrido = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.03), new THREE.MeshBasicMaterial({ color: 0xff9fdc }));
  barrido.position.set(-11.78, 1.82, -4);
  barrido.rotation.y = Math.PI / 2;
  esc.visual.add(barrido);
  animados.push((dt) => { barrido.rotation.x += dt * 2; });
  // Antena de plato a escala
  const plato = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3), material(0xdfe6f5, { metal: 0.6, rugosidad: 0.3 }));
  plato.material.side = THREE.DoubleSide;
  plato.position.set(-8, 2.2, -0.2);
  plato.rotation.x = -0.6;
  esc.visual.add(plato);
  cilindro(esc, 0.08, 2, material(0x9aa6c8), -8, 1, -0.2);
  animados.push((dt) => { plato.rotation.z += dt * 0.3; });
  const com = consola(esc, -5, -7.8, 0, COLOR_SALA.comunicaciones, 'ENLACE TIERRA', 'grafico');
  esc.consolas.push({ id: 'antena', rol: 'comunicaciones', sala: 'Comunicaciones', grupo: com.grupo, pantalla: com.pantalla });
  const com2 = consola(esc, -9.5, -7.8, 0, COLOR_SALA.comunicaciones, 'DATOS', 'texto');
  esc.consolas.push({ id: 'datos', rol: 'comunicaciones', sala: 'Comunicaciones', grupo: com2.grupo, pantalla: com2.pantalla });
  luzSala(esc, -7, -4, COLOR_SALA.comunicaciones, 22);
  esc.salas.comunicaciones = { nombre: 'Comunicaciones', rol: 'comunicaciones', centro: new THREE.Vector3(-7, 0, -4) };

  // ---------- ENFERMERÍA y BODEGA ----------
  habitacion(esc, 7, -4, 10, 10, ALTO, pared, piso, { techo: true, sinPared: ['oeste'] });
  caja(esc, 2.2, 0.6, 1, material(0xdfe6f5), 9.5, 0.5, -7.5); // camilla
  caja(esc, 0.6, 0.15, 0.8, material(0x7cc4ff), 10.3, 0.85, -7.5);
  pantalla(esc, 1.6, 1, 0x5be08a, 'SIGNOS VITALES', 'grafico', 11.8, 1.8, -7.5, -Math.PI / 2);
  for (let i = 0; i < 4; i++) cilindro(esc, 0.25, 1.6, material(0x7cc4ff, { metal: 0.5 }), 11.2, 0.8, -1.5 + i * 0.6); // tanques de oxígeno
  pilaCajas(esc, [[5, 0, 0], [6, 0, 0], [5.5, 0.9, 0], [8, 0, 0.3, 0.3]], 0x8a6a3a);
  luzSala(esc, 7, -4, 0xdfe6f5, 18);
  esc.salas.enfermeria = { nombre: 'Enfermería', rol: null, centro: new THREE.Vector3(7, 0, -4) };

  // ---------- ESCLUSA ----------
  habitacion(esc, 0, 12, 6, 8, ALTO, pared, piso, { techo: true, huecos: [{ lado: 'norte', ancho: 2.4 }] });
  const escotilla = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.15, 10, 28), material(0xffd166, { metal: 0.6 }));
  escotilla.position.set(0, 1.5, 15.8);
  esc.visual.add(escotilla);
  luzSala(esc, 0, 12, 0xff6b6b, 10);
  esc.salas.esclusa = { nombre: 'Esclusa', rol: null, centro: new THREE.Vector3(0, 0, 12) };

  // ---------- Cosas que se abren con E (casilleros, cajones, paneles y ventanas) ----------
  esc.objetos = [
    new ObjetoAbrible(esc, 'casillero', 5.5, -26, -Math.PI / 2),          // Cabina
    new ObjetoAbrible(esc, 'cajon', -11.5, -19, Math.PI / 2),             // Ingeniería
    new ObjetoAbrible(esc, 'panel', -8.5, -20.8, 0, 1.4),                  // Ingeniería
    new ObjetoAbrible(esc, 'cajon', 10.4, -11.45, Math.PI),               // Laboratorio
    new ObjetoAbrible(esc, 'ventana', -11.8, -0.8, Math.PI / 2, 1.8),     // Comunicaciones
    new ObjetoAbrible(esc, 'casillero', 5, -8.6, 0),                      // Enfermería
    new ObjetoAbrible(esc, 'ventana', 1.85, 2, -Math.PI / 2, 1.7),        // Pasillo (pegada a la cara de la pared)
    new ObjetoAbrible(esc, 'panel', -1.85, -10, Math.PI / 2, 1.3)         // Pasillo (pegado a la cara de la pared)
  ];

  // ---------- Afuera: estrellas y el planeta de destino (por el ventanal) ----------
  cielo(esc);
  const planeta = new THREE.Mesh(new THREE.SphereGeometry(18, 32, 24),
    new THREE.MeshStandardMaterial({ color: o.colorPlaneta ?? 0xd2693c, roughness: 0.95, emissive: o.colorPlaneta ?? 0xd2693c, emissiveIntensity: 0.12 }));
  planeta.position.set(-20, 8, -150);
  esc.visual.add(planeta);
  esc.planeta = planeta;

  // ---------- Partículas: polvo en el pasillo y chispas en el reactor ----------
  if (o.particulas !== false) {
    const polvo = particulas(esc, { cantidad: 140, centro: new THREE.Vector3(0, 1.6, -8), tamano: new THREE.Vector3(3.6, 3, 30), velocidad: 0.08, tam: 0.035 });
    const chispas = particulas(esc, { cantidad: 40, centro: new THREE.Vector3(-8.5, 1.5, -16), tamano: new THREE.Vector3(1.6, 1.4, 1.6), velocidad: 0.8, chispas: true, color: 0x7cf3ff, tam: 0.06, opacidad: 0.9 });
    animados.push((dt) => { polvo.actualizar(dt); chispas.actualizar(dt); });
  }

  esc.puntoInicio = new THREE.Vector3(0, 0.05, 2);
  esc.colorFondo = 0x02030a;
  esc.niebla = null;
  // ---- Detalles: luces LED, paneles de luz, tuberías y cables, marcos de puerta, letreros y rincones ----
  agregarDetallesNave(esc, {
    calidad, alto: ALTO,
    salas: [
      { cx: 0, cz: -30, ancho: 12, prof: 12, color: COLOR_SALA.comandante, tuberias: { x: 5.65, z: -30, largo: 10, eje: 'z' } },
      { cx: -7, cz: -16, ancho: 10, prof: 10, color: COLOR_SALA.ingeniero, tuberias: { x: -11.65, z: -16, largo: 9, eje: 'z' } },
      { cx: 7, cz: -16, ancho: 10, prof: 10, color: COLOR_SALA.cientifico, tuberias: { x: 11.65, z: -16, largo: 9, eje: 'z' } },
      { cx: -7, cz: -4, ancho: 10, prof: 10, color: COLOR_SALA.comunicaciones, tuberias: { x: -7, z: -8.65, largo: 9, eje: 'x' } },
      { cx: 7, cz: -4, ancho: 10, prof: 10, color: COLOR_SALA.neutro, tuberias: { x: 11.65, z: -4, largo: 9, eje: 'z' } },
      { cx: 0, cz: 12, ancho: 6, prof: 8, color: 0xff6b6b },
      { cx: 0, cz: -8, ancho: 4, prof: 32, color: 0x2b5cab }
    ],
    puertas: [
      { puerta: esc.puertas[0], texto: '🔧 INGENIERÍA', color: COLOR_SALA.ingeniero, haciaX: 1, haciaZ: 0 },
      { puerta: esc.puertas[1], texto: '🔬 LABORATORIO', color: COLOR_SALA.cientifico, haciaX: -1, haciaZ: 0 },
      { puerta: esc.puertas[2], texto: '📡 COMUNICACIONES', color: COLOR_SALA.comunicaciones, haciaX: 1, haciaZ: 0 },
      { puerta: esc.puertas[3], texto: '🩺 ENFERMERÍA', color: COLOR_SALA.neutro, haciaX: -1, haciaZ: 0 },
      { puerta: esc.puertas[4], texto: '👨‍✈️ CABINA', color: COLOR_SALA.comandante, haciaX: 0, haciaZ: 1 },
      { puerta: esc.puertas[5], texto: '🚪 ESCLUSA', color: 0xff6b6b, haciaX: 0, haciaZ: -1 }
    ]
  });
  esc.interior = true;
  esc.actualizar = (dt, t) => animados.forEach((f) => f(dt, t));
  return esc;
}

/** Luz de sala del color del rol (sin sombras: es mucho más rápido). */
function luzSala(esc, x, z, color, intensidad) {
  const luz = new THREE.PointLight(color, intensidad, 13, 1.6);
  luz.position.set(x, ALTO - 0.4, z);
  esc.visual.add(luz);
  const plafon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 16),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6 }));
  plafon.position.set(x, ALTO - 0.03, z);
  esc.visual.add(plafon);
  return luz;
}
