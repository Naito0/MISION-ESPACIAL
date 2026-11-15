// =============================================================
// camaraTercera.js — Cámara en TERCERA PERSONA.
// Sigue al personaje desde atrás y un poco por encima.
// - Gira con el mouse/stick (horizontal y vertical), zoom con la rueda.
// - Límites: dentro de la nave zoom 1,8–6 m e inclinación −0,1–0,9 rad (el techo no
//   tapa); afuera (superficie) zoom hasta 9 m.
// - No atraviesa paredes, techo ni puertas cerradas: usa 5 rayos (centro y 4 bordes,
//   como una esfera pequeña). Se acerca RÁPIDO cuando choca y se aleja DESPACIO.
// - Si igual algo queda entre la cámara y el personaje, se vuelve semitransparente.
// - Apunta un poco por encima de la cabeza.
// =============================================================
import * as THREE from 'three';

const LIMITES = {
  interior: { zoomMin: 1.8, zoomMax: 6, pitchMin: -0.1, pitchMax: 0.9 },
  exterior: { zoomMin: 1.8, zoomMax: 9, pitchMin: -0.25, pitchMax: 1.25 }
};
const RADIO = 0.25; // "esfera" de la cámara: los 4 rayos de los bordes van a esta distancia

export class CamaraTercera {
  /**
   * @param camara THREE.PerspectiveCamera
   * @param solidos THREE.Group con las paredes (para no atravesarlas)
   * @param o { interior: true/false, puertas: lista de Puerta (las cerradas también frenan la cámara) }
   */
  constructor(camara, solidos, o = {}) {
    this.camara = camara;
    this.solidos = solidos;
    this.puertas = o.puertas || [];
    this.decorados = o.decorados || null; // lo que solo se ve (tuberías, anillos del motor…): no frena, pero se aclara
    this.cuadro = 0;
    this.limites = o.interior ? LIMITES.interior : LIMITES.exterior;
    this.yaw = 0;        // giro horizontal (radianes)
    this.pitch = 0.35;   // inclinación (radianes, positivo = desde arriba)
    this.distancia = 5;  // metros detrás del personaje (lo que pide el jugador)
    this.distanciaReal = 5; // la que se usa (se acorta si hay paredes)
    this.sensibilidad = 1;
    this.objetivo = new THREE.Vector3();
    this.rayo = new THREE.Raycaster();
    this.rayo.camera = camara; // necesario para revisar sprites (letreros, candados)
    this.posicionDeseada = new THREE.Vector3();
    this.primera = true;
    this.transparentes = new Map(); // malla → material original (paredes que tapan al personaje)
    this._d = new THREE.Vector3(); this._o = new THREE.Vector3(); this._lado = new THREE.Vector3(); this._arriba = new THREE.Vector3();
  }

  /** Aplica la entrada del jugador (camaraX/Y en radianes, zoom en "pasos"). */
  girar(dx, dy, zoom = 0) {
    const l = this.limites;
    this.yaw -= dx * this.sensibilidad;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * this.sensibilidad, l.pitchMin, l.pitchMax);
    this.distancia = THREE.MathUtils.clamp(this.distancia + zoom * 0.6, l.zoomMin, l.zoomMax);
  }

  /** Dirección "hacia adelante" en el piso, según hacia dónde mira la cámara. */
  adelante(destino = new THREE.Vector3()) {
    return destino.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  derecha(destino = new THREE.Vector3()) {
    return destino.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  /** Distancia libre en una dirección (5 rayos: centro y bordes de una esfera pequeña). */
  distanciaLibre(origen, dir, maximo) {
    let libre = maximo;
    this._lado.set(dir.z, 0, -dir.x).normalize().multiplyScalar(RADIO);
    this._arriba.crossVectors(dir, this._lado).normalize().multiplyScalar(RADIO);
    const desplazamientos = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [a, b] of desplazamientos) {
      this._o.copy(origen).addScaledVector(this._lado, a).addScaledVector(this._arriba, b);
      this.rayo.set(this._o, dir);
      this.rayo.far = maximo;
      const choque = this.rayo.intersectObjects(this.solidos.children, true)[0];
      if (choque) libre = Math.min(libre, choque.distance);
      for (const p of this.puertas) {
        if (!p.cerrada) continue;
        const punto = this.rayo.ray.intersectBox(p.bloqueo, this._d);
        if (punto) libre = Math.min(libre, punto.distanceTo(this._o));
      }
    }
    return libre;
  }

  /** Esferas que envuelven cada decoración (se calculan una vez: la nave no se mueve). */
  esferasDecorados() {
    if (!this._esferas && this.decorados) {
      this._esferas = [];
      const caja = new THREE.Box3();
      for (const hijo of this.decorados.children) {
        if (hijo.isLight || hijo.isSprite || hijo.isPoints) continue;
        caja.setFromObject(hijo);
        if (caja.isEmpty()) continue;
        const s = caja.getBoundingSphere(new THREE.Sphere());
        if (s.radius > 6) continue; // pisos, cielo y cosas enormes no
        this._esferas.push({ hijo, s });
      }
    }
    return this._esferas || [];
  }

  /**
   * Lo que tapa al personaje se vuelve semitransparente: paredes entre la cámara y el
   * personaje, decoraciones en el medio (tuberías, anillos del motor…) y decoraciones
   * que quedan MUY cerca de la cámara (para que la cámara nunca "esté adentro" de algo).
   */
  aclararParedes(desde, hasta) {
    this.cuadro++;
    if (this.cuadro % 3 !== 0 && this.transparentes.size === 0 && this._ultimoVacio) return; // cada 3 cuadros alcanza
    // El rayo sale DESDE EL PERSONAJE hacia la cámara: así encuentra la pared aunque la cámara
    // ya esté detrás de ella mientras se acerca (y esa pared se aclara en vez de tapar)
    const dir = this._d.subVectors(desde, hasta);
    const largo = dir.length();
    const tapan = new Set();
    if (largo > 0.3) {
      this.rayo.set(hasta, dir.normalize());
      this.rayo.far = largo + 0.3;
      for (const h of this.rayo.intersectObjects(this.solidos.children, true)) {
        if (h.face && h.face.normal.y > 0.7) continue; // el piso no
        tapan.add(h.object);
      }
      if (this.decorados) for (const h of this.rayo.intersectObjects(this.decorados.children, true)) {
        if (h.object.isMesh && !h.object.isSprite && !(h.object.material && h.object.material.transparent && h.object.material.opacity < 0.5)) tapan.add(h.object);
      }
    }
    for (const { hijo, s } of this.esferasDecorados()) {
      if (s.distanceToPoint(desde) < 0.35) hijo.traverse((m) => { if (m.isMesh) tapan.add(m); });
    }
    this._ultimoVacio = tapan.size === 0;
    for (const m of tapan) {
      if (this.transparentes.has(m) || !m.material || Array.isArray(m.material)) continue;
      this.transparentes.set(m, m.material);
      const mat = m.material.clone();
      mat.transparent = true; mat.opacity = 0.3; mat.depthWrite = false;
      m.material = mat;
    }
    for (const [m, original] of this.transparentes) {
      if (tapan.has(m)) continue;
      m.material.dispose();
      m.material = original;
      this.transparentes.delete(m);
    }
  }

  /** @param posicionCabeza punto de la cabeza del personaje (la cámara mira un poco más arriba) */
  actualizar(dt, posicionCabeza) {
    // suavidad: qué tan rápido sigue al personaje (más bajo = viaja más despacio,
    // se usa al cambiar de astronauta para que la cámara "vuele" hasta él)
    this._o.copy(posicionCabeza); this._o.y += 0.25; // un poco por encima de la cabeza
    this.objetivo.lerp(this._o, this.primera ? 1 : 1 - Math.exp(-(this.suavidad || 18) * dt));
    const desplazamiento = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    // Paredes, techo y puertas: se acerca RÁPIDO si choca y se aleja DESPACIO
    const libre = this.sinParedes ? this.distancia : Math.max(0.5, this.distanciaLibre(this.objetivo, desplazamiento, this.distancia) - 0.3);
    const meta = Math.min(this.distancia, libre);
    // Sin saltos: al chocar se acerca SUAVE (lo justo, a ritmo parejo) y se aleja más despacio;
    // si algo queda en el medio mientras tanto, se vuelve transparente (aclararParedes)
    if (this.primera) this.distanciaReal = meta;
    else if (meta < this.distanciaReal) this.distanciaReal += (meta - this.distanciaReal) * (1 - Math.exp(-8 * dt));
    else this.distanciaReal += (meta - this.distanciaReal) * (1 - Math.exp(-3 * dt));
    this.cambioCuadro = Math.abs(this.distanciaReal - (this._anterior ?? this.distanciaReal)); this._anterior = this.distanciaReal; this.maxCambio = Math.max(this.maxCambio || 0, this.cambioCuadro); // (para revisar saltos)

    this.posicionDeseada.copy(this.objetivo).addScaledVector(desplazamiento, this.distanciaReal);
    if (this.primera) this.camara.position.copy(this.posicionDeseada);
    else this.camara.position.lerp(this.posicionDeseada, 1 - Math.exp(-20 * dt));
    this.camara.lookAt(this.objetivo);
    if (!this.sinParedes) this.aclararParedes(this.camara.position, this.objetivo);
    this.primera = false;
  }

  /** Distancia entre la cámara y el personaje (para volverlo transparente si está muy cerca). */
  get cercania() { return this.camara.position.distanceTo(this.objetivo); }

  /** Devuelve las paredes a la normalidad (al cambiar de pantalla). */
  limpiar() { for (const [m, original] of this.transparentes) { m.material.dispose(); m.material = original; } this.transparentes.clear(); }
}
