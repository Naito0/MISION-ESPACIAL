// =============================================================
// tripulacion.js — Los 4 astronautas que controla el jugador.
// Cada uno vive en SU sala de la nave y solo se mueve dentro de ella.
// (Ya no se cambia de astronauta con teclas: cada jugador maneja solo a su personaje.)
//
// Los límites son rectángulos en el piso, medidos de las salas que arma
// escenarios/naveInterior.js (centro de la sala ± la mitad de su tamaño,
// menos ~0,6 m para no meterse en la pared). El lado que da al pasillo
// se corta en el borde de la sala, así nadie sale al pasillo.
// =============================================================
import { ROLES, colorRol } from './datos3d.js';

export const TRIPULACION = [
  { rol: 'comandante', tecla: '1', corto: 'Piloto', icono: '👨‍✈️', sala: 'Cabina',
    limites: { xMin: -5.4, xMax: 5.4, zMin: -35.2, zMax: -24.8 } },
  { rol: 'ingeniero', tecla: '2', corto: 'Ingeniero', icono: '🔧', sala: 'Ingeniería',
    limites: { xMin: -11.4, xMax: -2.7, zMin: -20.4, zMax: -11.6 } },
  { rol: 'cientifico', tecla: '3', corto: 'Científico', icono: '🔬', sala: 'Laboratorio',
    limites: { xMin: 2.7, xMax: 11.4, zMin: -20.4, zMax: -11.6 } },
  { rol: 'comunicaciones', tecla: '4', corto: 'Comunicaciones', icono: '📡', sala: 'Comunicaciones',
    limites: { xMin: -11.4, xMax: -2.7, zMin: -8.4, zMax: 0.4 } }
];

export const miembro = (rol) => TRIPULACION.find((m) => m.rol === rol);
export const colorDe = (rol) => colorRol(ROLES.find((r) => r.id === rol));
export const hexDe = (rol) => `#${colorDe(rol).toString(16).padStart(6, '0')}`;
