// =============================================================
// ESCENA 2 — TALLER: comprar piezas con el presupuesto.
// Muestra en vivo presupuesto restante, masa total y balance de energía.
// Guarda en el estado: seleccion y nave (resumen calculado).
// =============================================================
import * as Phaser from 'phaser';
import { CATEGORIAS, COHETES, NAVE_BASE, buscarPieza } from '../systems/datos.js';
import {
  estado, calcularNave, destinoActual, misionActual, balanceEnergia, registrar
} from '../systems/estadoMision.js';
import { ANCHO, COLORES, texto, titulo, panel, boton } from '../ui/ui.js';

const ANCHO_OPCION = 122;
const SEPARACION = 128;
const X_OPCIONES = 180;
const Y_INICIAL = 118;
const ALTO_FILA = 60;

export default class EscenaTaller extends Phaser.Scene {
  constructor() {
    super('Taller');
  }

  create() {
    const mision = misionActual();
    titulo(this, 'Taller de la nave', `Paso 2 de 7 — ${mision.nombre} · Presupuesto ${estado.presupuesto} M$ (también debe alcanzar para el cohete)`);

    // Selección por defecto: la primera opción de cada categoría única
    // y el instrumento requerido ya marcado.
    for (const cat of CATEGORIAS) {
      if (cat.multiple) {
        if (estado.seleccion[cat.id].length === 0) estado.seleccion[cat.id] = [mision.instrumentoRequerido];
      } else if (!estado.seleccion[cat.id]) {
        estado.seleccion[cat.id] = cat.opciones[0].id;
      }
    }

    // ---- Filas de categorías con sus opciones ----
    this.botones = {}; // botones[idPieza] = botón
    CATEGORIAS.forEach((cat, fila) => {
      const y = Y_INICIAL + fila * ALTO_FILA;
      texto(this, 20, y, cat.nombre + (cat.multiple ? '\n(varios)' : ''), { tam: 16, negrita: true, origen: [0, 0.5] });
      cat.opciones.forEach((op, i) => {
        const req = op.id === mision.instrumentoRequerido ? '★ ' : '';
        const etiqueta = `${req}${op.nombre}\n${op.costo} M$ · ${op.masa} kg`;
        this.botones[op.id] = boton(this, X_OPCIONES + i * SEPARACION, y, ANCHO_OPCION, 52, etiqueta,
          () => this.elegir(cat, op.id),
          { tam: 12, alPasar: () => this.mostrarInfo(op) });
      });
    });

    // ---- Panel de descripción (abajo) ----
    panel(this, 20, 548, 890, 112);
    this.textoInfo = texto(this, 32, 558, 'Pasa el mouse sobre una pieza para ver qué hace. ★ = instrumento requerido por la misión.', {
      tam: 15, ancho: 866, color: COLORES.textoSuave
    });

    // ---- Panel de resumen (derecha) ----
    panel(this, 930, 95, 330, 565);
    texto(this, 945, 105, 'Resumen de la nave', { tam: 20, negrita: true, color: COLORES.acento });
    this.textoResumen = texto(this, 945, 138, '', { tam: 13, ancho: 305 });
    this.textoAvisos = texto(this, 945, 482, '', { tam: 13, ancho: 305, color: COLORES.aviso });

    // ---- Botones de navegación ----
    boton(this, 110, 690, 180, 40, '◀ Volver', () => this.scene.start('Mision'), { tam: 16 });
    this.botonContinuar = boton(this, ANCHO - 150, 690, 240, 44, 'Ir al lanzamiento ▶', () => this.continuar(), { tam: 18 });

    this.actualizar();
  }

  /** Selecciona (o alterna, si es múltiple) una pieza. */
  elegir(cat, idPieza) {
    if (cat.multiple) {
      const lista = estado.seleccion[cat.id];
      const pos = lista.indexOf(idPieza);
      if (pos >= 0) lista.splice(pos, 1);
      else lista.push(idPieza);
    } else {
      estado.seleccion[cat.id] = idPieza;
    }
    this.actualizar();
  }

  mostrarInfo(op) {
    const partes = [`${op.nombre}: ${op.efecto}`];
    const datos = [`Costo ${op.costo} M$`, `Masa ${op.masa} kg`];
    if (op.empuje) datos.push(`Empuje ${op.empuje} N`, `Consumo ${op.consumo} kg/s`);
    if (op.capacidad !== undefined && op.id.startsWith('tanque')) datos.push(`Combustible ${op.capacidad} kg`);
    if (op.capacidad !== undefined && op.id.startsWith('bateria')) datos.push(`Almacena ${op.capacidad} E`);
    if (op.energia) datos.push(op.energia > 0 ? `Aporta ${op.energia} E/turno` : `Gasta ${-op.energia} E por uso`);
    if (op.datos) datos.push(`${op.datos} datos por uso`);
    if (op.tasa) datos.push(`${op.tasa} datos por transmisión`);
    partes.push(datos.join(' · '));
    if (op.aproximado) partes.push('(valores aproximados, simplificados para el juego)');
    this.textoInfo.setColor(COLORES.texto);
    this.textoInfo.setText(partes.join('\n'));
  }

  /** Recalcula todo y refresca botones y resumen. */
  actualizar() {
    const mision = misionActual();
    const destino = destinoActual();

    // Estado visual de los botones
    for (const cat of CATEGORIAS) {
      for (const op of cat.opciones) {
        const sel = cat.multiple ? estado.seleccion[cat.id].includes(op.id) : estado.seleccion[cat.id] === op.id;
        this.botones[op.id].setSeleccionado(sel);
      }
    }

    const nave = calcularNave();
    const restante = estado.presupuesto - nave.costo;
    const energia = balanceEnergia(nave, nave.efectos);
    const pesoDestino = nave.masaTotal * destino.gravedad;
    const empujePeso = pesoDestino > 0 ? nave.empuje / pesoDestino : 0;

    // Cohete más barato que puede llevar esta masa
    const posibles = COHETES.filter((c) => c.capacidad[destino.id] >= nave.masaTotal).sort((a, b) => a.costo - b.costo);
    const cohete = posibles[0];

    const lineas = [
      `Presupuesto: ${estado.presupuesto} M$`,
      `Piezas (incluye nave base ${NAVE_BASE.costo} M$): ${nave.costo} M$`,
      `Queda para el cohete: ${restante} M$`,
      '',
      `Masa seca: ${nave.masaSeca} kg`,
      `Combustible: ${nave.capacidadCombustible} kg`,
      `MASA TOTAL al lanzar: ${nave.masaTotal} kg`,
      `Empuje/peso en ${destino.nombre}: ${empujePeso.toFixed(2)}`,
      '',
      `Energía por turno en ${destino.nombre}:`,
      `  Paneles: +${energia.generacion} E`,
      `  Computadora + calefacción: -${energia.consumoFijo} E`,
      `  Balance fijo: ${energia.neto >= 0 ? '+' : ''}${energia.neto} E`,
      `  Usar todos los instrumentos 1 vez: -${nave.consumoInstrumentos} E`,
      `  Transmitir 1 vez: -${nave.energiaAntena} E`,
      `  Batería: ${nave.bateriaMax} E`,
      '',
      cohete
        ? `Cohete más barato posible: ${cohete.nombre} (${cohete.costo} M$)`
        : 'Ningún cohete puede llevar esta masa.'
    ];
    this.textoResumen.setText(lineas.join('\n'));

    // Avisos (no bloquean, salvo los marcados)
    const avisos = [];
    const tieneRequerido = estado.seleccion.instrumentos.includes(mision.instrumentoRequerido);
    if (!tieneRequerido) avisos.push(`✖ Falta el instrumento requerido: ${buscarPieza(mision.instrumentoRequerido).nombre}.`);
    if (restante < 0) avisos.push('✖ Te pasaste del presupuesto.');
    if (!cohete) avisos.push('⚠ Ningún cohete puede lanzar esta masa: quita peso.');
    else if (cohete.costo > restante) avisos.push(`⚠ No te alcanza para el cohete más barato (${cohete.costo} M$).`);
    if (empujePeso < 1) avisos.push(`⚠ El motor no puede sostener la nave en ${destino.nombre} (empuje/peso < 1).`);
    if (destino.juego.requiereEscudoEntrada && !nave.efectos.includes('entradaAtmosferica')) {
      avisos.push('⚠ Marte tiene atmósfera: sin escudo térmico la entrada dañará la nave.');
    }
    if (energia.neto < 0) avisos.push('⚠ Los paneles no cubren ni el consumo fijo: dependerás de la batería.');
    this.textoAvisos.setText(avisos.join('\n'));

    // Solo bloquean: falta el instrumento requerido o presupuesto excedido.
    this.botonContinuar.setHabilitado(tieneRequerido && restante >= 0);
  }

  continuar() {
    estado.nave = calcularNave();
    // Los recursos empiezan con el tanque lleno y sin daños.
    estado.recursos.combustible = estado.nave.capacidadCombustible;
    estado.recursos.factorPaneles = 1;
    estado.recursos.factorAntena = 1;
    estado.recursos.bateriaMax = estado.nave.bateriaMax;
    estado.recursos.instrumentosDanados = [];
    registrar('taller', `Nave armada: ${estado.nave.masaTotal} kg, ${estado.nave.costo} M$.`);
    this.scene.start('Lanzamiento');
  }
}
