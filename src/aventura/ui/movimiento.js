// =============================================================
// movimiento.js — Opción "Reducir movimiento": quita el tambaleo de la cámara
// cuando te empujan (las estrellitas se quedan). Se guarda en el navegador.
// =============================================================
const CLAVE = 'misionEspacial.reducirMovimiento';
export function reducirMovimiento() {
  try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; }
}
export function alternarReducirMovimiento() {
  const nuevo = !reducirMovimiento();
  try { localStorage.setItem(CLAVE, nuevo ? '1' : '0'); } catch { /* sin almacenamiento */ }
  return nuevo;
}
