// =============================================================
// FASE 3 — ESTUDIO DE COMPENSACIONES (diseño de la nave)
// Izquierda: categorías por disciplina. Centro: componentes.
// Derecha: panel de recursos (barras verde/amarillo/rojo) y metas de cada rol.
// Abajo: guardar diseños A y B y compararlos lado a lado.
// En modo equipo cada jugador solo cambia las categorías de su rol.
// =============================================================
import * as Phaser from 'phaser';
import { CATEGORIAS, CONFIG, rolDeCategoria } from '../systems/datos.js';
import {
  estado, analizarDiseno, nivel, misionActual, esEquipo, opcionesDisponibles, categoriasVisibles,
  puedeEditarCategoria, pasarTurno, textoTurno, anularAprobaciones, guardarComoAB, usarDisenoAB
} from '../systems/estadoMision.js';
import { compatibilidadInstrumento } from '../systems/recursos.js';
import { cargarDiseno } from '../systems/almacenamiento.js';
import { ANCHO, ALTO, COLORES, texto, titulo, panel, boton, barra, barraFases } from '../ui/ui.js';

const X_CARTA = [385, 705];
const Y_CARTA = 228;
const PASO_CARTA = 72;

export default class EscenaDiseno extends Phaser.Scene {
  constructor() {
    super('Diseno');
  }

  create() {
    const mision = misionActual();
    barraFases(this, CONFIG.fases, 2);
    titulo(this, 'Estudio de compensaciones: diseña la nave',
      `${mision.nombre} · Presupuesto ${estado.presupuesto} M$ · Intento ${estado.intento} · Cada mejora empeora otra cosa: busca el equilibrio`);

    this.aplicarSeleccionPorDefecto();

    // ---- Categorías (izquierda) — soporte vital solo aparece si hay tripulación ----
    this.categorias = categoriasVisibles();
    this.botonesCategoria = this.categorias.map((cat, i) =>
      boton(this, 110, 112 + i * 45, 180, 40, '', () => this.mostrarCategoria(cat), { tam: 13 })
    );

    // ---- Centro: título de la categoría, cartas y descripción ----
    this.textoCategoria = texto(this, 230, 96, '', { tam: 19, negrita: true, color: COLORES.acento });
    this.textoAyudaCat = texto(this, 230, 124, '', { tam: 13, ancho: 630, color: COLORES.textoSuave });
    this.cartas = [];

    panel(this, 225, 415, 640, 98);
    this.textoTooltip = texto(this, 238, 422, 'Pasa el mouse sobre un componente para ver qué hace.', {
      tam: 13, ancho: 615, color: COLORES.textoSuave
    });
    this.textoConsejo = texto(this, 238, 482, '', { tam: 13, ancho: 615, color: COLORES.aviso });
    this.textoTurno = texto(this, 230, 520, '', { tam: 14, ancho: 630, color: COLORES.aviso });

    // ---- Estudio de compensaciones: A y B ----
    this.botonA = boton(this, 320, 610, 175, 36, 'Guardar como A', () => { guardarComoAB('A'); this.actualizar(); }, { tam: 14 });
    this.botonB = boton(this, 505, 610, 175, 36, 'Guardar como B', () => { guardarComoAB('B'); this.actualizar(); }, { tam: 14 });
    this.botonComparar = boton(this, 705, 610, 205, 36, 'Comparar A y B', () => this.comparar(), { tam: 14 });

    // ---- Panel de recursos (derecha) ----
    panel(this, 875, 88, 390, 622);
    texto(this, 890, 92, 'Recursos', { tam: 18, negrita: true, color: COLORES.acento });
    const a = analizarDiseno();
    this.barras = a.barras.map((b, i) => {
      const y = 118 + i * 35;
      return { etiqueta: texto(this, 890, y, '', { tam: 12 }), barra: barra(this, 890, y + 16, 360, 8) };
    });
    texto(this, 890, 466, esEquipo() ? 'Metas de cada rol' : 'Metas de cada rol (consejos)', {
      tam: 16, negrita: true, color: COLORES.acento
    });
    this.textosMeta = a.metas.map(() => texto(this, 890, 490, '', { tam: 11, ancho: 365 }));

    // ---- Botones inferiores ----
    boton(this, 110, 675, 170, 44, '◀ Requisitos', () => this.scene.start('Requisitos'), { tam: 15 });
    const guardado = cargarDiseno(estado.misionId);
    const bCargar = boton(this, 300, 675, 190, 44, 'Cargar último lanzado', () => this.cargarGuardado(guardado), { tam: 14 });
    bCargar.setHabilitado(!!guardado);
    if (esEquipo()) {
      boton(this, 510, 675, 190, 44, 'Pasar turno ▶', () => { pasarTurno(); this.mostrarCategoria(this.categoriaActual); }, { tam: 16 });
    }
    this.botonContinuar = boton(this, 735, 675, 240, 50, 'Diseño puntual ▶', () => this.scene.start('DisenoPuntual'), { tam: 18 });

    this.categoriaActual = this.categorias[0];
    this.mostrarCategoria(this.categoriaActual);
  }

  /** Tarjeta "¿Por qué importa esto?" de la categoría (se ve hasta pasar el mouse por un componente). */
  mostrarPorQueImporta(cat) {
    this.textoTooltip.setColor(COLORES.acento);
    this.textoTooltip.setText(`¿Por qué importa esto? ${cat.porQueImporta || ''}`);
  }

  /** La primera vez, elige la opción más simple de cada categoría obligatoria. */
  aplicarSeleccionPorDefecto() {
    for (const cat of CATEGORIAS) {
      const opciones = opcionesDisponibles(cat);
      if (cat.multiple) {
        if (!Array.isArray(estado.seleccion[cat.id])) estado.seleccion[cat.id] = [];
      } else if (!opciones.some((o) => o.id === estado.seleccion[cat.id]) && cat.obligatoria && opciones.length) {
        estado.seleccion[cat.id] = opciones[0].id;
      }
    }
  }

  cargarGuardado(guardado) {
    if (!guardado) return;
    // Solo se cargan los componentes permitidos en esta misión y nivel
    for (const cat of CATEGORIAS) {
      const permitidos = new Set(opcionesDisponibles(cat).map((o) => o.id));
      const v = guardado.seleccion[cat.id];
      if (Array.isArray(v)) estado.seleccion[cat.id] = v.filter((id) => permitidos.has(id));
      else if (v && permitidos.has(v)) estado.seleccion[cat.id] = v;
    }
    if (guardado.orbitaId) estado.orbitaId = guardado.orbitaId;
    if (guardado.coheteId) estado.coheteId = guardado.coheteId;
    anularAprobaciones();
    this.mostrarCategoria(this.categoriaActual);
  }

  mostrarCategoria(cat) {
    this.categoriaActual = cat;
    this.cartas.forEach((c) => c.destruir());
    this.cartas = [];

    const editable = puedeEditarCategoria(cat);
    const rol = rolDeCategoria(cat.id);
    this.textoCategoria.setText(`${cat.nombre}${cat.multiple ? ' (puedes elegir varios)' : ''}`);
    this.textoAyudaCat.setText(`Disciplina: ${cat.disciplina}. ${cat.ayuda}` +
      (esEquipo() && rol ? `\nLa decide: ${rol.nombre}.${editable ? '' : ' (Ahora no es tu turno para esta categoría.)'}` : ''));

    this.mostrarPorQueImporta(cat);
    const mision = misionActual();
    opcionesDisponibles(cat).forEach((op, i) => {
      const x = X_CARTA[i % 2];
      const y = Y_CARTA + Math.floor(i / 2) * PASO_CARTA;
      const comp = cat.id === 'instrumentos' ? compatibilidadInstrumento(mision, op.id) : { ok: true };
      const carta = boton(this, x, y, 310, 64, this.etiquetaCarta(op, comp), () => this.elegir(cat, op.id), {
        tam: 12, alPasar: () => this.mostrarTooltip(op, comp)
      });
      carta.setHabilitado(editable && comp.ok);
      carta.opcionId = op.id;
      this.cartas.push(carta);
    });
    this.actualizar();
  }

  etiquetaCarta(op, comp) {
    const partes = [`${op.costo} M$`, `${op.masa} kg`];
    if (op.energia) partes.push(`${op.energia > 0 ? '+' : ''}${op.energia} W`);
    if (op.datos) partes.push(`${op.datos} GB/d`);
    const conf = op.confiabilidad === 'nuevo' ? '⚠ nuevo' : '✓ probado en vuelo';
    const extra = comp.ok ? conf : 'NO SIRVE PARA ESTA MISIÓN';
    return `${op.nombre}${op.nivel === 'avanzado' ? ' [avanzado]' : ''}\n${partes.join(' · ')}\n${extra}`;
  }

  mostrarTooltip(op, comp) {
    if (!comp.ok) {
      this.textoTooltip.setColor(COLORES.mal);
      this.textoTooltip.setText(`${op.nombre}: no se puede usar en esta misión.\n${comp.razon}`);
      return;
    }
    const extra = [];
    if (op.valorCientifico) extra.push(`valor científico ${op.valorCientifico}/mes`);
    if (op.capacidadMasa) extra.push(`aguanta ${op.capacidadMasa} kg`, `vida ${op.vidaMeses} meses`);
    if (op.capacidadWh) extra.push(`${op.capacidadWh} Wh`);
    if (op.tasa) extra.push(`${op.tasa} GB/día con contacto pleno`);
    if (op.factorContacto) extra.push(`contacto ×${op.factorContacto}`);
    if (op.almacenamientoGB) extra.push(`memoria ${op.almacenamientoGB} GB`);
    if (op.combustible) extra.push(`${op.combustible} kg de combustible`, `${op.empuje} N`);
    if (op.precision) extra.push(`precisión ${Math.round(op.precision * 100)}%`);
    if (op.mesesDesarrollo) extra.push(`${op.mesesDesarrollo} meses de desarrollo`);
    if (op.efectos && op.efectos.length) extra.push(`protege: ${op.efectos.join(', ')}`);
    extra.push(op.confiabilidad === 'nuevo' ? 'componente NUEVO: más riesgo de falla' : 'probado en vuelo: poco riesgo');
    this.textoTooltip.setColor(COLORES.texto);
    this.textoTooltip.setText(`${op.nombre}: ${op.tooltip}\n${extra.join(' · ')}${op.aproximado ? '  (valores aproximados)' : ''}`);
  }

  elegir(cat, id) {
    if (!puedeEditarCategoria(cat)) return;
    if (cat.multiple) {
      const lista = estado.seleccion[cat.id];
      const pos = lista.indexOf(id);
      if (pos >= 0) lista.splice(pos, 1);
      else lista.push(id);
    } else {
      estado.seleccion[cat.id] = id;
    }
    anularAprobaciones(); // cualquier cambio obliga a volver a aprobar
    this.actualizar();
  }

  /** Recalcula todo y refresca la pantalla. */
  actualizar() {
    const a = analizarDiseno();

    // Botones de categorías (con el rol en modo equipo)
    this.categorias.forEach((cat, i) => {
      const b = this.botonesCategoria[i];
      const rol = rolDeCategoria(cat.id);
      const lapiz = esEquipo() && puedeEditarCategoria(cat) ? '✎ ' : '';
      b.setTexto(esEquipo() && rol ? `${lapiz}${rol.abreviatura} · ${cat.nombre}` : cat.nombre);
      b.setSeleccionado(cat.id === this.categoriaActual.id);
    });

    // Cartas seleccionadas
    const sel = estado.seleccion[this.categoriaActual.id];
    this.cartas.forEach((c) => c.setSeleccionado(Array.isArray(sel) ? sel.includes(c.opcionId) : sel === c.opcionId));

    // Barras de recursos
    a.barras.forEach((b, i) => {
      const color = { verde: COLORES.bien, amarillo: COLORES.aviso, rojo: COLORES.mal }[b.nivel];
      this.barras[i].etiqueta.setText(`${b.nombre}: ${b.texto}`).setColor(color);
      this.barras[i].barra.actualizar(b.ratio, b.nivel);
    });

    // Metas de cada rol
    // (cada texto se ubica debajo del anterior según su altura, para que no se encimen)
    let yMeta = 490;
    a.metas.forEach((m, i) => {
      const t = this.textosMeta[i];
      t.setText(`${m.ok ? '✔' : '✖'} ${m.abreviatura}: ${m.texto}\n   ${m.detalle}`);
      t.setColor(m.ok ? COLORES.bien : COLORES.mal);
      t.setY(yMeta);
      yMeta += t.height + 3;
    });

    // Consejo (solo con ayudas)
    if (nivel().ayudas) {
      const problema = a.barras.find((b) => b.nivel === 'rojo') || a.barras.find((b) => b.nivel === 'amarillo');
      this.textoConsejo.setText(problema ? `Consejo: ${problema.ayuda}` : 'Consejo: ¡todo en verde! Guarda este diseño como A y prueba una alternativa como B.');
    }

    // Turno y faltantes
    const lineas = [];
    if (esEquipo()) lineas.push(`${textoTurno()}. Puedes cambiar las categorías marcadas con ✎. El presupuesto es de todos: ¡negocien!`);
    if (a.diseno.faltantes.length) lineas.push(`Falta elegir: ${a.diseno.faltantes.join(', ')}.`);
    this.textoTurno.setText(lineas.join('\n'));

    // A/B
    this.botonA.setTexto(estado.disenosAB.A ? 'Guardar como A ✔' : 'Guardar como A');
    this.botonB.setTexto(estado.disenosAB.B ? 'Guardar como B ✔' : 'Guardar como B');
    this.botonComparar.setHabilitado(!!(estado.disenosAB.A && estado.disenosAB.B));

    this.botonContinuar.setHabilitado(a.diseno.faltantes.length === 0);
  }

  /** Ventana con la comparación lado a lado de los diseños A y B. */
  comparar() {
    const A = analizarDiseno(estado.disenosAB.A);
    const B = analizarDiseno(estado.disenosAB.B);
    const pct = (x) => `${Math.round(x * 100)}%`;
    const r1 = (x) => Math.round(x * 10) / 10;
    // [nombre, valorA, valorB, ¿mayor es mejor?, texto A, texto B]
    const filas = [
      ['Costo total (M$)', A.costoTotal, B.costoTotal, false],
      ['Masa (kg)', A.diseno.masaTotal, B.diseno.masaTotal, false],
      ['Margen de energía', A.margenes.energia, B.margenes.energia, true, pct],
      ['Datos generados (GB/día)', A.operativo.datosGeneradosDia, B.operativo.datosGeneradosDia, true, r1],
      ['Datos que se pueden enviar (GB/día)', A.operativo.capacidadEnvioDia, B.operativo.capacidadEnvioDia, true, r1],
      ['Vida esperada (meses)', A.vidaEsperada, B.vidaEsperada, true],
      ['Riesgo de falla', A.diseno.riesgo, B.diseno.riesgo, false, pct],
      ['Valor científico por mes', A.valorMes, B.valorMes, true, r1],
      ['Desarrollo (meses)', A.diseno.mesesDesarrollo, B.diseno.mesesDesarrollo, false],
      ['Metas de rol cumplidas', A.metas.filter((m) => m.ok).length, B.metas.filter((m) => m.ok).length, true, (x) => `${x} de 4`]
    ];

    const elementos = [];
    elementos.push(this.add.rectangle(0, 0, ANCHO, ALTO, 0x000000, 0.6).setOrigin(0, 0).setInteractive());
    elementos.push(panel(this, 190, 90, 900, 560));
    elementos.push(texto(this, 640, 102, 'Comparación de diseños A y B', { tam: 24, negrita: true, origen: [0.5, 0], color: COLORES.acento }));
    elementos.push(texto(this, 640, 136, 'En verde, el mejor en cada fila. Ningún diseño gana en todo: eso es una compensación.', {
      tam: 14, origen: [0.5, 0], color: COLORES.textoSuave
    }));
    elementos.push(texto(this, 640, 170, 'A', { tam: 20, negrita: true, origen: [0.5, 0] }));
    elementos.push(texto(this, 880, 170, 'B', { tam: 20, negrita: true, origen: [0.5, 0] }));
    filas.forEach(([nombre, va, vb, mayorMejor, fmt = (x) => x], i) => {
      const y = 205 + i * 34;
      const mejorA = mayorMejor ? va > vb : va < vb;
      const mejorB = mayorMejor ? vb > va : vb < va;
      elementos.push(texto(this, 215, y, nombre, { tam: 15 }));
      elementos.push(texto(this, 640, y, String(fmt(va)), { tam: 15, origen: [0.5, 0], color: mejorA ? COLORES.bien : COLORES.texto }));
      elementos.push(texto(this, 880, y, String(fmt(vb)), { tam: 15, origen: [0.5, 0], color: mejorB ? COLORES.bien : COLORES.texto }));
    });
    const botones = [];
    const cerrar = () => {
      elementos.forEach((e) => e.destroy());
      botones.forEach((b) => b.destruir());
    };
    botones.push(boton(this, 450, 610, 200, 44, 'Usar diseño A', () => { usarDisenoAB('A'); cerrar(); this.mostrarCategoria(this.categoriaActual); }, { tam: 16 }));
    botones.push(boton(this, 680, 610, 200, 44, 'Usar diseño B', () => { usarDisenoAB('B'); cerrar(); this.mostrarCategoria(this.categoriaActual); }, { tam: 16 }));
    botones.push(boton(this, 900, 610, 160, 44, 'Cerrar', cerrar, { tam: 16 }));
  }
}
