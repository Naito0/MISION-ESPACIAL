# PLAN_3D — Misión Espacial: aventura 3D cooperativa

> Fase 0 (auditoría). Este documento se escribe **antes** de tocar la arquitectura.
> No se implementa nada hasta que el equipo lo apruebe.

## 1. Estado actual (auditoría)

| Punto | Resultado |
|---|---|
| Tecnología | JavaScript, Vite 8.3.8, Phaser 4.2.1 (solo 2D) |
| Pruebas (`npm test`) | 22 de 22 pasan (lógica pura de `src/systems/`) |
| Build (`npm run build`) | Compila. Bundle ≈ 1,5 MB (≈ 417 KB gzip) |
| Git | Árbol limpio. Último commit: "Juego divertido 3 (parcial)" |
| Código | 57 archivos en `src/`: 13 escenas Phaser, 17 sistemas, 9 de UI, 5 de efectos, 6 minijuegos y 10 JSON |
| Pendiente del pedido anterior | "Juego divertido" 3 (falta el aviso de desbloqueo y contar misiones), 4, 5, 6 y 7 sin hacer |

**Qué se puede reutilizar tal cual en 3D** (no depende de Phaser):
- `src/data/*.json`: destinos (gravedad, luz y temperatura de Marte, con fuente NASA), misiones, componentes, eventos, roles.
- Lógica pura: `recursos.js`, `soporteVital.js`, `averias.js`, `simulacion.js`, `puntaje.js`, `roles.js`, `informe.js`.
- Persistencia: `progreso.js`, `preferencias.js` y `almacenamiento.js` (localStorage).

**Qué no sirve para 3D:** las escenas, el UI y los efectos de Phaser. Phaser 4 es un motor 2D: no tiene cámaras 3D, mallas, luces dinámicas, sombras ni colisiones 3D. Forzarlo iría contra la regla "no simular 3D con 2D".

## 2. Motor 3D recomendado: **Three.js** (0.187.0)

| Criterio | Three.js | Babylon.js 9 |
|---|---|---|
| Tamaño en el navegador | Chico (≈ 150-200 KB gzip con lo que usaríamos) | Más grande (≈ 0,8-1,5 MB gzip con tree-shaking) |
| GLTF/GLB y animación con esqueleto | Sí (`GLTFLoader`, `AnimationMixer`) | Sí |
| PBR, sombras, niebla, partículas | Sí | Sí |
| Colisiones 3D sin otra dependencia | Sí: `Octree` + `Capsule` (vienen en `three/addons`, como en el ejemplo oficial de primera persona) | Sí (colisiones integradas) |
| Pantalla dividida (2-4 jugadores) | Sí (`setViewport` / `setScissor`) | Sí (varias cámaras) |
| Con Vite y GitHub Pages | Sin configuración extra | Sin configuración extra |
| Documentación y ejemplos para principiantes | Enorme | Muy buena |

**Decisión: Three.js.** Es liviano, encaja con Vite y GitHub Pages sin configuración, y trae todo lo pedido sin sumar más dependencias: GLTF, esqueletos, PBR, sombras y colisiones con `Octree` + `Capsule`. Babylon trae más cosas integradas, pero pesa varias veces más, y en computadoras de gama media eso se nota.

**Física:** cápsula del personaje contra un `Octree` de la geometría del nivel. Alcanza para gravedad, salto, suelo, paredes y puertas. Rapier o Cannon recién se considerarían si hiciera falta física de objetos sueltos, y antes se preguntaría al equipo.

**Dependencia nueva:** solo `three`. Necesita aprobación.

## 3. Cómo se integra con lo que existe

- **Dos modos, sin borrar el clásico.** Vite permite varias páginas:
  - `index.html`: el modo clásico (Phaser) queda igual. En Inicio se agrega un botón "Aventura 3D".
  - `aventura.html`: el nuevo modo 3D, con Three.js en su propio canvas.
- **HUD y paneles en HTML/CSS** superpuestos al canvas 3D. Es más simple y nítido que meter Phaser encima.
- **Minijuegos de las consolas:** al interactuar con una consola se abre un panel 2D. Los que ya existen en Phaser se reutilizan montando un Phaser chico dentro de ese panel; los nuevos pueden ser HTML/canvas.
- **Datos y lógica compartidos:** el 3D importa los mismos `src/data/` y `src/systems/`, sin copiarlos. La economía, la vida y las tareas nuevas van en `src/systems/` como funciones puras, con sus pruebas.

## 4. Cooperación local (1 a 4) — decisión de cámara

- **Una cámara compartida no sirve:** los jugadores van a estar en habitaciones distintas de la nave y la cámara no puede encuadrar a todos.
- **Pantalla dividida dinámica:**
  - 1 jugador: pantalla completa, con el mouse controlando la cámara (pointer lock).
  - 2 jugadores: pantalla partida al medio en vertical.
  - 3 o 4 jugadores: cuatro cuadrantes. La calidad "Bajo" se activa sola (sin sombras en las vistas secundarias y menos resolución).
- **Controles sin conflictos:**
  - Jugador 1: WASD, el mouse (o Q/E para girar la cámara), F para interactuar y Espacio para saltar.
  - Jugador 2: flechas, el teclado numérico (4/6 para la cámara, 0 para interactuar y Enter para saltar) y Shift derecho para correr.
  - Jugadores 3 y 4: mandos por la Gamepad API (stick izquierdo para moverse, stick derecho para la cámara, A para saltar y X para interactuar).
  - Cualquier jugador puede usar mando si hay uno conectado. Hay una pantalla de asignación de controles.
- **Costo:** con 4 vistas, la escena se dibuja 4 veces. Por eso las escenas tienen que ser de baja poligonización y con instancing.

## 5. Personajes

- **Astronauta procedural 3D:** hecho con geometrías de Three.js (cápsulas, esferas, cajas). Tiene casco con visor, mochila de soporte vital y brazos y piernas articulados en jerarquía (hombro → codo, cadera → rodilla). El color del traje es el del rol.
- **Animaciones por código:** idle, caminar, correr, saltar, girar, interactuar, reparar, recoger, reanimar y desmayarse.
- **Preparado para GLB:** la clase `Astronauta` tiene una interfaz `reproducir('caminar')`. Si después el equipo consigue un GLB con esqueleto, se cambia por un `AnimationMixer` sin tocar el resto del juego.
- **Aclaración honesta:** no hay modelos GLB animados en el proyecto y no los puedo generar con calidad artística. La primera versión usa articulaciones procedurales, no esqueletos de un GLB.

## 6. Archivos que se crearán / modificarán

**Modificar (poco):**
- `package.json`: agregar `three`.
- `vite.config.js`: dos páginas (clásico y aventura).
- `src/scenes/EscenaInicio.js`: botón "Aventura 3D".
- `README.md`: sección del modo 3D.

**Crear:**
```
aventura.html
src/aventura/
  main3d.js                  # arranque del modo 3D
  engine/  Motor3D.js · camaraTercera.js · luces.js · fisica.js (Octree+Capsule) · calidad.js · pantallaDividida.js · entrada.js (teclado/mouse/mando)
  entities/ Astronauta.js · NaveModelo.js · ObjetoInteractivo.js · Puerta.js
  escenarios/ base.js · interiorNave.js · marte.js · espacio.js   # geometría modular + instancing
  ui/ hud.js · panelConsola.js · tienda.js · menuPausa.js · asignarControles.js
  minijuegos3d/ (paneles por rol: 2 por rol como mínimo)
src/systems/ vida.js · economia.js · mejoras.js · tareas.js · emergencias.js   # PUROS, con pruebas
src/data/ tareas.json · mejoras.json · economia.json · emergencias.json
tests/ aventura.test.js
```
No se duplica nada: `roles.json`, `misiones.json` y `destinos.json` se amplían, no se copian.

## 7. Fases (con criterio de "terminado")

| Fase | Entrega | Criterio jugable |
|---|---|---|
| 1 Motor | Three.js + Vite, cámara, luces, sombras, suelo y objetos de prueba, calidad Bajo/Medio/Alto | Se recorre un escenario 3D |
| 2 Astronauta | Modelo procedural, WASD, cámara en 3ª persona con zoom y sin atravesar paredes, gravedad, salto, colisiones | Se camina y salta sin atravesar nada |
| 3 Base | Hangar con la nave 3D y 9 zonas (puente, ingeniería, laboratorio, enfermería, comunicaciones, tienda, panel de misiones, plataforma), puertas, consolas con E | Se explora toda la base |
| 4 Cooperación | 1-4 jugadores, pantalla dividida, controles independientes, colores por rol | 4 jugadores exploran a la vez |
| 5 Nave | 7 habitaciones conectadas con pasillos y esclusa | La nave se recorre completa |
| 6 Vida y emergencias | Salud, oxígeno y energía por tripulante; recursos de la nave; 8 emergencias con efectos 3D; 4 tareas y 2 minijuegos por rol; reanimar (E 3 s) | El viaje exige cooperar |
| 7 Economía | Créditos compartidos, XP por rol, 4 tiendas, mejoras que cambian estadísticas y el modelo 3D de la nave | Se compra, se ve y se guarda |
| 8 Marte | Terreno con cráteres y rocas, polvo, cielo marciano, aterrizaje, muestras, regreso y recompensas | Se completa la misión tripulada |
| 9 Pulido | Rendimiento, accesibilidad, sonido, pruebas, docs, GitHub Pages | Funciona publicado |

Al final de cada fase: `npm test`, `npm run build`, prueba en el navegador y un commit.

## 8. Riesgos técnicos

1. **Tamaño del trabajo.** Esto equivale a un juego nuevo: son varias semanas, no una sesión. Cada fase entrega algo jugable, pero las 9 juntas no caben en un fin de semana. Hay que **definir qué fase llega a la demo**.
2. **Pantalla dividida con 4 jugadores:** puede bajar a menos de 30 FPS en computadoras de gama media. Se mitiga con calidad "Bajo" automática, instancing, sombras solo en la vista principal y menos resolución.
3. **Animaciones:** sin artistas, los personajes son procedurales. Se verán "de juguete", aunque correctamente 3D.
4. **Controles:** cuatro jugadores en un solo teclado no caben. Los jugadores 3 y 4 necesitan mando, y no todos los teclados permiten tantas teclas simultáneas (ghosting).
5. **Equipo principiante:** Three.js es más difícil que Phaser. Se mitiga con módulos chicos, comentarios en español y la lógica pura separada y probada.
6. **Memoria:** esta computadora ya se quedó sin memoria con el servidor de desarrollo abierto. El 3D usa más RAM y GPU, así que hay que probar en las computadoras de la demo.
7. **Datos científicos:** solo se usan los de `destinos.json` y `misiones_reales.json` (fuentes NASA). Los consumos de oxígeno, agua y comida quedan marcados "aproximado/verificar".
8. **Pedido anterior sin terminar** ("Juego divertido" 3 a 7): hay que decidir si se abandona o se completa en el modo clásico.

## 9. Registro de avance

| Fase | Estado | Cómo se comprobó |
|---|---|---|
| 0 Auditoría | ✔ Hecha | 22/22 pruebas, build correcto |
| 1 Motor | ✔ Hecha | Build con dos páginas; escena 3D con sombras, niebla, menú ESC y calidad, sin errores en el navegador |
| 2 Astronauta | ✔ Hecha | Teclas reales en el navegador: camina, corre, salta (sube ~0,7 m y vuelve a apoyarse), se detiene contra la pared (z = −19,45) y contra una caja (z = −2,65); la cámara gira y no atraviesa paredes |
| 3 Base espacial | Reemplazada por la versión hackatón (abajo) | — |

### Versión hackatón (rama `juego-3d`, todo en 3D, sin 2D)

| Paso | Estado | Cómo se comprobó |
|---|---|---|
| 1 Movimiento y nave decorada | ✔ Hecho | Navegador: cruza puertas automáticas, sin errores |
| 2 Red local (Socket.IO) | ✔ Hecho | Dos navegadores: crear, unirse con código, roles, ver al otro moverse |
| 3 Viaje con emergencias y tareas | ✔ Hecho | Navegador: emergencia → flecha → E → minijuego → resuelta; los 12 minijuegos abren sin errores; fracaso y llegada |
| 4 Hangar | ✔ Hecho | Navegador: comprar, problemas explicados (energía en Marte), todos listos → despega; pruebas de reglas |
| 5 Sistema solar | ✔ Hecho | Navegador: tarjetas NASA, "Próximamente", elegir Luna → presupuesto de la Luna |
| 6 Informe | ✔ Hecho | Navegador: informe de fracaso y de éxito, progreso guardado en localStorage |
| 7 Aterrizaje y superficie | ✔ Hecho | Navegador (Marte y Luna): motor con Espacio, aterrizaje clasificado, salto 3,6 m en Marte y 8,3 m en la Luna (gravedad real), recoger con E, analizar con E (solo Científico), informe |

### Cambios v3 (un jugador con 4 astronautas, armado guiado y aprendizaje)

| Cambio | Estado | Cómo se comprobó |
|---|---|---|
| 1 Textos grandes | ✔ Hecho | Capturas: texto ≥ 18 px, títulos 30 px; menú Normal / Grande |
| 2 Cambio de astronauta | ✔ Hecho | Navegador: teclas 1-4 y clic en retratos, límites de sala, aviso grande por rol, aviso amable con el astronauta equivocado |
| 3 Misiones más fáciles | ✔ Hecho | Pruebas (máx. 1 emergencia en Fácil) y navegador: tutorial en la Luna paso a paso, 3 cables en Fácil, "Reintentar" |
| 4 Armado con recomendaciones | ✔ Hecho | Pruebas de fórmulas por destino y navegador: barras, vista previa, Orbi, dependencias |
| 5 Aprendizaje | ✔ Hecho | Pruebas del resumen y navegador: tarjetas (nunca durante emergencias), diario 6/12, resumen y repaso en el informe |

Nota de rendimiento: en el navegador de prueba (sin GPU, render por software) va a 20-45 FPS en calidad Media; con una GPU real debería ir mucho más rápido.

## 10. Decisiones que necesito del equipo antes de empezar

1. ¿Aprueban **Three.js** (única dependencia nueva)?
2. ¿Qué fase tiene que estar lista para la demo? Mi recomendación: fases 1 a 3 (caminar por la base 3D) es lo realista para mostrar.
3. ¿Seguimos con lo pendiente de "Juego divertido" en el modo clásico, o lo pausamos?
