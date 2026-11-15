// =============================================================
// CuadroPared.js — Un cuadro informativo colgado en la pared de la nave.
// Marco que brilla (color de la sala), un dibujo simple hecho con código y el
// título. Al acercarse aparece "E: Leer" (lo maneja pantallaNave.js).
// Datos en src/data/cuadros.json.
// =============================================================
import * as THREE from 'three';

/** Dibujos simples (canvas) según el tema del cuadro. */
const DIBUJOS = {
  planetas(g) { g.fillStyle = '#c8c8c8'; g.beginPath(); g.arc(70, 80, 30, 0, 7); g.fill(); g.fillStyle = '#d2693c'; g.beginPath(); g.arc(160, 80, 40, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 18px Arial'; g.fillText('Luna', 50, 136); g.fillText('Marte', 136, 136); },
  onda(g) { g.fillStyle = '#2d6fd6'; g.beginPath(); g.arc(40, 80, 24, 0, 7); g.fill(); g.strokeStyle = '#ff9fdc'; g.lineWidth = 4; g.beginPath(); for (let x = 70; x < 200; x += 2) g.lineTo(x, 80 + Math.sin(x / 8) * 14); g.stroke(); g.fillStyle = '#d2693c'; g.beginPath(); g.arc(216, 80, 18, 0, 7); g.fill(); },
  basura(g) { g.fillStyle = '#dfe6f5'; g.fillRect(90, 66, 70, 26); g.fillStyle = '#3d77d8'; g.fillRect(40, 70, 46, 18); g.fillRect(164, 70, 46, 18); g.fillStyle = '#8f96a8'; for (const [x, y] of [[60, 30], [200, 40], [130, 130], [30, 120]]) g.fillRect(x, y, 12, 8); g.strokeStyle = '#ffd166'; g.lineWidth = 3; g.beginPath(); g.moveTo(125, 100); g.lineTo(125, 125); g.stroke(); },
  sol(g) { g.fillStyle = '#ffd166'; g.beginPath(); g.arc(60, 70, 32, 0, 7); g.fill(); g.strokeStyle = '#ffd166'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(100, 50 + i * 10); g.lineTo(150, 60 + i * 6); g.stroke(); } g.fillStyle = '#d2693c'; g.beginPath(); g.arc(190, 90, 30, 0, 7); g.fill(); },
  luna(g) { g.fillStyle = '#c8c8c8'; g.beginPath(); g.arc(120, 80, 48, 0, 7); g.fill(); g.fillStyle = '#0a1028'; g.beginPath(); g.arc(144, 72, 46, 0, 7); g.fill(); g.fillStyle = '#fff'; for (const [x, y] of [[40, 30], [210, 40], [200, 130], [30, 120]]) g.fillRect(x, y, 3, 3); },
  termometro(g) { g.fillStyle = '#dfe6f5'; g.fillRect(112, 24, 26, 100); g.beginPath(); g.arc(125, 128, 20, 0, 7); g.fill(); g.fillStyle = '#e5484d'; g.fillRect(118, 60, 14, 70); g.beginPath(); g.arc(125, 128, 14, 0, 7); g.fill(); g.fillStyle = '#7cc4ff'; g.font = 'bold 22px Arial'; g.fillText('❄', 60, 120); g.fillStyle = '#ffd166'; g.fillText('☀', 170, 50); },
  aire(g) { g.fillStyle = '#8a6a3a'; g.fillRect(50, 50, 60, 60); g.fillStyle = '#7cc4ff'; g.beginPath(); g.arc(180, 80, 32, 0, 7); g.fill(); g.strokeStyle = '#ffd166'; g.lineWidth = 6; g.beginPath(); g.moveTo(112, 80); g.lineTo(146, 80); g.stroke(); },
  pesa(g) { g.fillStyle = '#9aa6c8'; g.fillRect(60, 74, 130, 12); g.fillStyle = '#3d77d8'; g.fillRect(48, 50, 22, 60); g.fillRect(180, 50, 22, 60); },
  planta(g) { g.fillStyle = '#8a6a3a'; g.fillRect(100, 100, 50, 34); g.fillStyle = '#3cc46e'; for (const [x, y, r] of [[110, 80, 20], [140, 75, 22], [125, 55, 20]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } g.fillStyle = '#d070ff'; g.fillRect(70, 20, 110, 6); },
  antena(g) { g.strokeStyle = '#dfe6f5'; g.lineWidth = 6; g.beginPath(); g.arc(120, 70, 44, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); g.fillStyle = '#9aa6c8'; g.fillRect(116, 110, 8, 30); g.fillStyle = '#2d6fd6'; g.beginPath(); g.arc(210, 40, 14, 0, 7); g.fill(); },
  regla(g) { g.fillStyle = '#ffd166'; g.fillRect(30, 70, 190, 30); g.fillStyle = '#1a1300'; for (let x = 40; x < 220; x += 12) g.fillRect(x, 70, 2, x % 36 === 4 ? 16 : 9); g.fillStyle = '#e5484d'; g.font = 'bold 22px Arial'; g.fillText('km ≠ millas', 58, 136); }
};

export class CuadroPared {
  /** c = cuadro de cuadros.json · color = color de la sala (marco que brilla) */
  constructor(esc, c, color = 0x7cc4ff) {
    this.datos = c;
    this.posicion = new THREE.Vector3(c.pos.x, 0, c.pos.z);
    this.grupo = new THREE.Group();
    this.grupo.position.set(c.pos.x, 1.6, c.pos.z);
    this.grupo.rotation.y = c.pos.rot;
    // Lienzo: dibujo + título
    const lienzo = document.createElement('canvas'); lienzo.width = 256; lienzo.height = 200;
    const g = lienzo.getContext('2d');
    g.fillStyle = '#0a1028'; g.fillRect(0, 0, 256, 200);
    (DIBUJOS[c.dibujo] || DIBUJOS.planetas)(g);
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 152, 256, 48);
    g.fillStyle = '#ffffff'; g.font = 'bold 19px Arial'; g.textAlign = 'center';
    g.fillText(c.titulo.length > 24 ? `${c.titulo.slice(0, 23)}…` : c.titulo, 128, 182);
    const tex = new THREE.CanvasTexture(lienzo); tex.colorSpace = THREE.SRGBColorSpace;
    const cuadro = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.78), new THREE.MeshBasicMaterial({ map: tex }));
    cuadro.position.z = 0.02;
    // Marco que brilla
    const marco = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.88), new THREE.MeshBasicMaterial({ color }));
    marco.position.z = 0.01;
    this.grupo.add(marco, cuadro);
    esc.visual.add(this.grupo);
  }
}
