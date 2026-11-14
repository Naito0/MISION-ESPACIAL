// =============================================================
// datos3d.js — Datos que la aventura 3D toma de los MISMOS JSON del
// modo clásico (no se copian ni se inventan): gravedad, luz solar, etc.
// =============================================================
import destinos from '../data/destinos.json';
import roles from '../data/roles.json';

export const DESTINOS = destinos.destinos;
export const TIERRA = DESTINOS.find((d) => d.id === 'tierra');
export const LUNA = DESTINOS.find((d) => d.id === 'luna');
export const MARTE = DESTINOS.find((d) => d.id === 'marte');
export const ROLES = roles.roles;

/** Color de un rol como número (ej. "#7cc4ff" → 0x7cc4ff). */
export const colorRol = (rol) => parseInt(rol.color.replace('#', ''), 16);
