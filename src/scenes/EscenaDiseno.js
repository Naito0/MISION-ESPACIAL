// =============================================================
// FASE 3 — ESTUDIO DE COMPENSACIONES (diseño de la nave)
// Izquierda: categorías. Centro: piezas y DIBUJO de la nave que se arma.
// Derecha: 4 recursos principales (el resto en "Ver más"), checklist de
// requisitos y, en modo equipo, las metas de cada rol como ✓/✗.
// Poco texto a la vista: los detalles están en tooltips y botones "?".
// Abajo: guardar diseños A y B y compararlos lado a lado.
// =============================================================
import * as Phaser from 'phaser';
import { CATEGORIAS, CONFIG, rolDeCategoria } from '../systems/datos.js';
import {
  estado, analizarDiseno, nivel, misionActual, esEquipo, opcionesDisponibles, categoriasVisibles,
  puedeEditarCategoria, pasarTurno, textoTurno, anularAprobaciones, guardarComoAB, usarDisenoAB
} from '../systems/estadoMision.js';
import { compatibilidadInstrumento } from '../systems/recursos.js';
import { generarChecklist } from '../systems/checklist.js';
import { cargarDiseno } from '../systems/almacenamiento.js';
import { crearPanelRecursos } from '../ui/panelRecursos.js';
import { crearDibujoNave } from '../ui/dibujoNave.js';
import { crearChecklist } from '../ui/checklistUI.js';
import { botonAyuda, crearTooltip, conTooltip } from '../ui/ayuda.js';
import { ANCHO, ALTO, COLORES, texto, titulo, panel, boton, ventana, barraFases } from '../ui/ui.js';
import { monedas, pesoSimple, etiquetasSimples } from '../ui/textosSimples.js';
import { esModoExperto } from '../systems/preferencias.js';
import { fraseRecurso } from '../ui/textosSimples.js';
import { crearOrbi } from '../ui/orbi.js';
import { iniciarTutorial } from '../ui/tutorial.js';
import { obtenerProgreso, marcar } from '../systems/progreso.js';

// Tutorial de la primera misión: Orbi explica lo básico en pocas frases
const PASOS_TUTORIAL = [
  { texto: '¡Hola! Soy Orbi 🤖. Vamos a armar tu primera nave: un CubeSat.', emocion: 'feliz' },
  { texto: 'Elige unos paneles solares: arrástralos hasta la nave (o haz clic).', emocion: 'feliz', esperar: 'piezaColocada' },
  { texto: '¡Encajó! A la derecha ves si te alcanzan las monedas 🪙 y la energía ⚡.', emocion: 'feliz' },
  { texto: 'Si algo se pone rojo, pasa el mouse por encima y te digo cómo arreglarlo.', emocion: 'neutral' },
  { texto: 'Cuando la nave esté lista, toca «Diseño puntual ▶». ¡Tú puedes!', emocion: 'feliz' }
];

const X_CARTA = [385, 705];
const Y_CARTA = 178;
const PASO_CARTA = 51;

export default class EscenaDiseno extends Phaser.Scene {
  constructor() {
    super('Diseno');
  }

  create() {
    const mision = misionActual();
    barraFases(this, CONFIG.fases, 2);
    titulo(this, 'Diseña tu nave', `${mision.nombre} · Intento ${estado.intento}`);
    this.tooltip = crearTooltip(this);
    this.aplicarSeleccionPorDefecto();

    // ---- Categorías (izquierda) — soporte vital solo aparece si hay tripulación ----
    this.categorias = categoriasVisibles();
    this.botonesCategoria = this.categorias.map((cat, i) =>
      boton(this, 110, 112 + i * 45, 180, 40, '', () => this.mostrarCategoria(cat), { tam: 13 })
    );

    // ---- Centro: categoría (una frase) + botón "?" con la explicación larga ----
    this.textoCategoria = texto(this, 230, 94, '', { tam: 19, negrita: true, color: COLORES.acento });
    this.textoAyudaCat = texto(this, 230, 122, '', { tam: 12, ancho: 600, color: COLORES.textoSuave });
    botonAyuda(this, 850, 106, '¿Por qué importa esto?', () => this.textoPorQueImporta());
    this.cartas = [];

    // ---- Centro: dibujo de la nave ----
    panel(this, 225, 308, 640, 274, 0x0e1530);
    texto(this, 237, 314, 'Tu nave', { tam: 12, color: COLORES.textoSuave });
    this.nave = crearDibujoNave(this, 545, 452);
    this.textoEstado = texto(this, 545, 590, '', { tam: 14, origen: [0.5, 0], color: COLORES.aviso, ancho: 630, align: 'center' });

    // ---- Estudio de compensaciones: A y B ----
    this.botonA = boton(this, 330, 632, 170, 32, 'Guardar como A', () => { guardarComoAB('A'); this.actualizar(); }, { tam: 13 });
    this.botonB = boton(this, 510, 632, 170, 32, 'Guardar como B', () => { guardarComoAB('B'); this.actualizar(); }, { tam: 13 });
    this.botonComparar = boton(this, 700, 632, 190, 32, 'Comparar A y B', () => this.comparar(), { tam: 13 });

    // ---- Derecha: recursos ----
    panel(this, 875, 88, 390, 622);
    texto(this, 890, 94, 'Recursos', { tam: 18, negrita: true, color: COLORES.acento });
    if (nivel().ayudas) {
      this.botonConsejo = boton(this, 1215, 106, 80, 26, '💡 Pista', () => this.mostrarConsejo(), { tam: 12 });
    }
    this.panelRecursos = crearPanelRecursos(this, 890, 130, 370, this.tooltip);

    // Checklist de requisitos (se abre en una ventana)
    this.botonChecklist = boton(this, 1070, 628, 360, 34, '', () => this.abrirChecklist(), { tam: 14 });

    // Metas de los roles: solo en modo equipo, como ✓/✗ (detalle en tooltip)
    this.chipsMeta = [];
    if (esEquipo()) {
      texto(this, 890, 655, 'Metas:', { tam: 12, color: COLORES.textoSuave });
      const a = analizarDiseno();
      this.chipsMeta = a.metas.map((m, i) => {
        const x = 940 + i * 80;
        const fondo = this.add.rectangle(x, 673, 74, 26, 0x24304f).setOrigin(0, 0.5).setStrokeStyle(1, 0x3a4a7a);
        const t = texto(this, x + 37, 673, '', { tam: 13, negrita: true, origen: [0.5, 0.5] });
        conTooltip(fondo, this.tooltip, () => {
          const meta = analizarDiseno().metas[i];
          return `${meta.nombre}\n${meta.texto}\n${meta.detalle}`;
        });
        return { fondo, t };
      });
    }

    // ---- Botones inferiores ----
    boton(this, 110, 680, 170, 40, '◀ Requisitos', () => this.scene.start('Requisitos'), { tam: 15 });
    const guardado = cargarDiseno(estado.misionId);
    const bCargar = boton(this, 300, 680, 190, 40, 'Cargar último lanzado', () => this.cargarGuardado(guardado), { tam: 13 });
    bCargar.setHabilitado(!!guardado);
    if (esEquipo()) {
      boton(this, 510, 680, 190, 40, 'Pasar turno ▶', () => { pasarTurno(); this.mostrarCategoria(this.categoriaActual); }, { tam: 15 });
    }
    this.botonContinuar = boton(this, 735, 680, 240, 46, 'Diseño puntual ▶', () => this.scene.start('DisenoPuntual'), { tam: 17 });

    this.categoriaActual = this.categorias[0];
    this.mostrarCategoria(this.categoriaActual);

    // Si el jugador cambia a modo experto (o vuelve al simple), se redibujan las piezas y el panel
    this.events.on('modoExperto', () => this.mostrarCategoria(this.categoriaActual));

    // ---- Orbi, el robot guía ----
    this.orbi = crearOrbi(this, 262, 538, { escala: 0.75 });
    this.tutorialActivo = false;
    if (!obtenerProgreso().tutorialVisto && misionActual().id === 'cubesat_tierra') {
      this.tutorialActivo = true;
      iniciarTutorial(this, this.orbi, PASOS_TUTORIAL, () => {
        this.tutorialActivo = false;
        marcar('tutorialVisto', true);
      });
    } else {
      this.time.delayedCall(400, () => this.orbi.decir('¡A armar la nave! Si algo se pone rojo, te ayudo.', 'feliz'));
    }
  }

  /** Orbi reacciona a la pieza elegida: se preocupa si algo se pone rojo y festeja si se arregla. */
  reaccionarOrbi(antes, ahora) {
    if (this.tutorialActivo) return;
    const principales = ['presupuesto', 'masa', 'energia', 'datos', 'comunicaciones', 'soporte'];
    const nivelAntes = Object.fromEntries(antes.barras.map((b) => [b.id, b.nivel]));
    const empeoro = ahora.barras.find((b) => principales.includes(b.id) && b.nivel === 'rojo' && nivelAntes[b.id] !== 'rojo');
    const mejoro = ahora.barras.find((b) => principales.includes(b.id) && b.nivel !== 'rojo' && nivelAntes[b.id] === 'rojo');
    const checklist = generarChecklist(ahora, misionActual(), estado.presupuesto);
    if (empeoro) this.orbi.decir(`¡Uy! ${fraseRecurso(empeoro).frase}`, 'preocupado');
    else if (mejoro) this.orbi.decir(`¡Bien! ${fraseRecurso(mejoro).frase}`, 'feliz');
    else if (checklist.every((i) => i.ok)) this.orbi.decir('¡Tu nave cumple todo! Ya puedes seguir. 🚀', 'feliz');
    else this.orbi.emocion('neutral');
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

  /** Texto del botón "?": por qué importa la categoría, quién la decide y la disciplina. */
  textoPorQueImporta() {
    const cat = this.categoriaActual;
    const rol = rolDeCategoria(cat.id);
    return `${cat.porQueImporta || cat.ayuda}\n\nDisciplina de ingeniería: ${cat.disciplina}.` +
      (esEquipo() && rol ? `\nEn el equipo la decide: ${rol.nombre}.` : '') +
      '\n\nPasa el mouse sobre cada pieza para ver todos sus datos.';
  }

  mostrarCategoria(cat) {
    this.categoriaActual = cat;
    this.cartas.forEach((c) => c.destruir());
    this.cartas = [];
    this.tooltip.ocultar();

    const editable = puedeEditarCategoria(cat);
    const rol = rolDeCategoria(cat.id);
    this.textoCategoria.setText(`${cat.nombre}${cat.multiple ? ' (puedes elegir varios)' : ''}`);
    this.textoAyudaCat.setText(cat.ayuda + (esEquipo() && rol && !editable ? `  🔒 La decide: ${rol.nombre}.` : ''));

    const mision = misionActual();
    opcionesDisponibles(cat).forEach((op, i) => {
      const x = X_CARTA[i % 2];
      const y = Y_CARTA + Math.floor(i / 2) * PASO_CARTA;
      const comp = cat.id === 'instrumentos' ? compatibilidadInstrumento(mision, op.id) : { ok: true };
      const carta = boton(this, x, y, 310, 46, this.etiquetaCarta(op, comp), () => this.elegir(cat, op.id), {
        tam: 13,
        alPasar: () => {
          const p = this.input.activePointer;
          this.tooltip.mostrar(p.x, p.y, this.textoTooltip(op, comp));
        },
        alSalir: () => this.tooltip.ocultar()
      });
      carta.setHabilitado(editable && comp.ok);
      carta.opcionId = op.id;
      this.cartas.push(carta);
    });
    this.actualizar();
  }

  /** Etiqueta corta de cada pieza. Modo simple: monedas y peso en palabras; experto: números. */
  etiquetaCarta(op, comp) {
    const marca = !comp.ok ? '🚫 ' : op.confiabilidad === 'nuevo' ? '⚠ ' : '';
    if (esModoExperto()) return `${marca}${op.nombre}\n${op.costo} M$ · ${op.masa} kg`;
    return `${marca}${op.nombre}\n${monedas(op.costo, estado.presupuesto)} · ${pesoSimple(op.masa, op.escala === 'cubesat')}`;
  }

  /** Detalle de una pieza para el tooltip (simple o con todos los números). */
  textoTooltip(op, comp) {
    if (!comp.ok) return `🚫 ${op.nombre}: no sirve en esta misión.\n${comp.razon}`;
    if (!esModoExperto()) return `${op.nombre}\n${op.tooltip}\n\n${etiquetasSimples(op)}`;
    const extra = [`${op.costo} M$`, `${op.masa} kg`];
    if (op.energia) extra.push(op.energia > 0 ? `genera ${op.energia} W` : `consume ${-op.energia} W`);
    if (op.datos) extra.push(`${op.datos} GB/día`);
    if (op.valorCientifico) extra.push(`valor científico ${op.valorCientifico}/mes`);
    if (op.capacidadMasa) extra.push(`aguanta ${op.capacidadMasa} kg`, `vida ${op.vidaMeses} meses`);
    if (op.capacidadWh) extra.push(`${op.capacidadWh} Wh`);
    if (op.tasa) extra.push(`${op.tasa} GB/día con contacto pleno`);
    if (op.factorContacto) extra.push(`contacto ×${op.factorContacto}`);
    if (op.almacenamientoGB) extra.push(`memoria ${op.almacenamientoGB} GB`);
    if (op.combustible) extra.push(`${op.combustible} kg de combustible`, `${op.empuje} N`);
    if (op.precision) extra.push(`precisión ${Math.round(op.precision * 100)}%`);
    if (op.diasPersona) extra.push(`${op.diasPersona} días-persona`);
    if (op.mesesDesarrollo) extra.push(`${op.mesesDesarrollo} meses de desarrollo`);
    if (op.efectos && op.efectos.length) extra.push(`protege: ${op.efectos.join(', ')}`);
    return `${op.nombre}${op.nivel === 'avanzado' ? ' [avanzado]' : ''}\n${op.tooltip}\n\n${extra.join(' · ')}\n` +
      (op.confiabilidad === 'nuevo' ? '⚠ Componente NUEVO: más riesgo de falla.' : '✓ Probado en vuelo: poco riesgo.');
  }

  elegir(cat, id) {
    if (!puedeEditarCategoria(cat)) return;
    const antes = analizarDiseno();
    if (cat.multiple) {
      const lista = estado.seleccion[cat.id];
      const pos = lista.indexOf(id);
      if (pos >= 0) lista.splice(pos, 1);
      else lista.push(id);
    } else {
      estado.seleccion[cat.id] = id;
    }
    anularAprobaciones(); // cualquier cambio obliga a volver a aprobar
    const ahora = this.actualizar();
    this.panelRecursos.mostrarCambios(antes, ahora); // textos flotantes: "+0.5 kg", "−2 W"...
    this.reaccionarOrbi(antes, ahora);
    this.events.emit('tutorial', 'piezaColocada'); // avisa al tutorial (si está activo)
  }

  /** Recalcula todo y refresca la pantalla. Devuelve el análisis actual. */
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

    // Recursos, dibujo de la nave y checklist
    this.panelRecursos.actualizar(a.barras);
    this.nave.actualizar(a.diseno);
    this.checklist = generarChecklist(a, misionActual(), estado.presupuesto);
    const ok = this.checklist.filter((x) => x.ok).length;
    this.botonChecklist.setTexto(`📋 Requisitos cumplidos: ${ok} de ${this.checklist.length}`);

    // Pista: late si hay algún recurso en rojo
    if (this.botonConsejo && a.barras.some((b) => b.nivel === 'rojo')) {
      this.tweens.add({ targets: [this.botonConsejo.fondo, this.botonConsejo.txt], scale: 1.15, duration: 180, yoyo: true });
    }

    // Metas de rol (modo equipo)
    a.metas.forEach((m, i) => {
      const chip = this.chipsMeta[i];
      if (!chip) return;
      chip.t.setText(`${m.abreviatura} ${m.ok ? '✓' : '✗'}`).setColor(m.ok ? COLORES.bien : COLORES.mal);
      chip.fondo.setStrokeStyle(1, m.ok ? 0x3cc46e : 0xe5484d);
    });

    // Una sola línea de estado: turno o lo que falta
    const lineas = [];
    if (esEquipo()) lineas.push(`${textoTurno()} · El presupuesto es de todos: ¡negocien!`);
    if (a.diseno.faltantes.length) lineas.push(`Falta elegir: ${a.diseno.faltantes.join(', ')}`);
    this.textoEstado.setText(lineas.join('\n'));

    // A/B
    this.botonA.setTexto(estado.disenosAB.A ? 'Guardar como A ✔' : 'Guardar como A');
    this.botonB.setTexto(estado.disenosAB.B ? 'Guardar como B ✔' : 'Guardar como B');
    this.botonComparar.setHabilitado(!!(estado.disenosAB.A && estado.disenosAB.B));

    this.botonContinuar.setHabilitado(a.diseno.faltantes.length === 0);
    return a;
  }

  /** Pista: el consejo del recurso con más problemas. */
  mostrarConsejo() {
    const a = analizarDiseno();
    const problema = a.barras.find((b) => b.nivel === 'rojo') || a.barras.find((b) => b.nivel === 'amarillo');
    ventana(this, {
      tituloTexto: '💡 Pista',
      cuerpo: problema ? `${problema.nombre}: ${problema.ayuda}`
        : '¡Todo en verde! Guarda este diseño como A, prueba una alternativa como B y compáralos.',
      textoBoton: 'Entendido'
    });
  }

  /** Ventana con el checklist de requisitos (se actualiza con el diseño actual). */
  abrirChecklist() {
    const capa = [];
    capa.push(this.add.rectangle(0, 0, ANCHO, ALTO, 0x000000, 0.6).setOrigin(0, 0).setInteractive().setDepth(1000));
    capa.push(panel(this, 170, 100, 940, 520).setDepth(1000));
    capa.push(texto(this, 640, 112, '📋 Requisitos de la misión', { tam: 22, negrita: true, origen: [0.5, 0], color: COLORES.acento }).setDepth(1000));
    capa.push(texto(this, 640, 146, 'Pasa el mouse sobre cada tarjeta para ver cuánto te falta.', { tam: 13, origen: [0.5, 0], color: COLORES.textoSuave }).setDepth(1000));
    const lista = crearChecklist(this, { x: 195, y: 180, columnas: 2, anchoTarjeta: 440, altoTarjeta: 50, tooltip: this.tooltip, profundidad: 1001 });
    lista.actualizar(this.checklist);
    const b = boton(this, 640, 585, 200, 40, 'Cerrar', () => {
      capa.forEach((o) => o.destroy());
      lista.destruir();
      b.destruir();
      this.tooltip.ocultar();
    }, { tam: 16 });
    b.fondo.setDepth(1001);
    b.txt.setDepth(1001);
  }

  /** Ventana con la comparación lado a lado de los diseños A y B. */
  comparar() {
    const A = analizarDiseno(estado.disenosAB.A);
    const B = analizarDiseno(estado.disenosAB.B);
    const pct = (x) => `${Math.round(x * 100)}%`;
    const r1 = (x) => Math.round(x * 10) / 10;
    // [nombre, valorA, valorB, ¿mayor es mejor?, formato]
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
    elementos.forEach((e) => e.setDepth(1000));
    const botones = [];
    const cerrar = () => {
      elementos.forEach((e) => e.destroy());
      botones.forEach((b) => b.destruir());
    };
    botones.push(boton(this, 450, 610, 200, 44, 'Usar diseño A', () => { usarDisenoAB('A'); cerrar(); this.mostrarCategoria(this.categoriaActual); }, { tam: 16 }));
    botones.push(boton(this, 680, 610, 200, 44, 'Usar diseño B', () => { usarDisenoAB('B'); cerrar(); this.mostrarCategoria(this.categoriaActual); }, { tam: 16 }));
    botones.push(boton(this, 900, 610, 160, 44, 'Cerrar', cerrar, { tam: 16 }));
    botones.forEach((b) => { b.fondo.setDepth(1001); b.txt.setDepth(1001); });
  }
}
