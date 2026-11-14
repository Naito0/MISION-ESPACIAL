// =============================================================
// puntaje.js — FUNCIONES PURAS: requisitos de la misión y puntaje
// por categorías (éxito, valor científico, eficiencia y colaboración).
// Los pesos están en src/data/config.json → "puntaje".
// =============================================================

const limitar = (x, min, max) => Math.max(min, Math.min(max, x));

/**
 * Lista de requisitos con ok/no ok.
 * p = { mision, lanzamiento, aterrizaje, resumen, presupuesto }
 */
export function evaluarRequisitos(p) {
  const { mision, lanzamiento, aterrizaje, resumen, presupuesto } = p;
  const req = mision.requisitos;
  const enviados = resumen ? resumen.datosEnviados : 0;
  const meses = resumen ? resumen.mesesOperativos : 0;
  const lista = [
    { id: 'presupuesto', ok: lanzamiento.costoTotal <= presupuesto,
      texto: `Costo dentro del presupuesto (${lanzamiento.costoTotal} de ${presupuesto} M$)` },
    { id: 'insercion', ok: lanzamiento.insercion.ok,
      texto: mision.aterriza ? 'Llegar a la órbita de descenso con combustible' : 'Entrar en la órbita elegida' }
  ];
  if (mision.aterriza) {
    lista.push({ id: 'aterrizaje', ok: !!(aterrizaje && aterrizaje.exito), texto: 'Aterrizar sin estrellarse' });
  }
  lista.push(
    { id: 'datos', ok: enviados >= req.datosMinimosGB,
      texto: `Enviar al menos ${req.datosMinimosGB} GB a la Tierra (llegaron ${Math.round(enviados * 10) / 10} GB)` },
    { id: 'vida', ok: meses >= req.vidaMinMeses,
      texto: `Funcionar al menos ${req.vidaMinMeses} meses (funcionó ${meses})` }
  );
  // Un requisito por cada objetivo científico
  for (const obj of mision.objetivos) {
    const valor = resumen ? resumen.valorObjetivos[obj.id] || 0 : 0;
    lista.push({ id: `objetivo_${obj.id}`, ok: valor >= obj.valorMinimo,
      texto: `Objetivo "${obj.nombre}": valor ${Math.round(valor)} de ${obj.valorMinimo}` });
  }
  return lista;
}

/**
 * Puntaje por categorías.
 * p = { requisitos, resumen, mision, lanzamiento, presupuesto, modoEquipo, metasRoles, config }
 */
export function calcularPuntaje(p) {
  const cfg = p.config.puntaje;
  const r = p.resumen;

  // 1) Éxito: proporción de requisitos cumplidos
  const cumplidos = p.requisitos.filter((x) => x.ok).length;
  const exito = Math.round(cfg.maxExito * cumplidos / p.requisitos.length);

  // 2) Valor científico: comparado con el valor de referencia de la misión
  const valor = r ? r.valorCientifico : 0;
  const ciencia = Math.round(cfg.maxCiencia * limitar(valor / p.mision.valorReferencia, 0, cfg.topeCiencia));

  // 3) Eficiencia: promedio de 4 factores entre 0 y 1
  //    (el ahorro solo cuenta si la misión llegó a operar)
  const ahorroRelativo = (p.presupuesto - p.lanzamiento.costoTotal) / p.presupuesto;
  const factores = {
    ahorro: r && r.mesesOperativos > 0 ? limitar(ahorroRelativo / cfg.ahorroIdeal, 0, 1) : 0,
    datosAprovechados: r && r.datosGenerados > 0 ? limitar(r.datosEnviados / r.datosGenerados, 0, 1) : 0,
    margenMasa: limitar(p.lanzamiento.margenes.masa / 0.1, 0, 1),
    margenEnergia: limitar(p.lanzamiento.margenes.energia / 0.1, 0, 1)
  };
  const promedio = Object.values(factores).reduce((s, x) => s + x, 0) / 4;
  const eficiencia = Math.round(cfg.maxEficiencia * promedio);

  const categorias = [
    { id: 'exito', nombre: 'Éxito de la misión', puntos: exito, max: cfg.maxExito },
    { id: 'ciencia', nombre: 'Valor científico', puntos: ciencia, max: cfg.maxCiencia },
    { id: 'eficiencia', nombre: 'Uso eficiente de recursos', puntos: eficiencia, max: cfg.maxEficiencia }
  ];

  // 4) Colaboración (solo modo equipo): metas de rol cumplidas al lanzar
  if (p.modoEquipo) {
    const metas = p.metasRoles || [];
    const ok = metas.filter((m) => m.ok).length;
    categorias.push({
      id: 'colaboracion', nombre: 'Colaboración (metas de segmento)',
      puntos: metas.length ? Math.round(cfg.maxColaboracion * ok / metas.length) : 0,
      max: cfg.maxColaboracion
    });
  }

  return {
    categorias,
    total: categorias.reduce((s, c) => s + c.puntos, 0),
    maximo: categorias.reduce((s, c) => s + c.max, 0),
    factoresEficiencia: factores
  };
}
