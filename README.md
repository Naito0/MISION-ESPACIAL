# Misión Espacial — Borrador (NASA Space Apps Challenge 2026)

Juego educativo para el navegador, con un toque arcade, para el desafío **"Juego de diseño de misiones espaciales"**. El jugador lleva una misión desde la idea hasta la operación siguiendo las fases que usa la NASA para madurar un concepto de misión:

1. **Concepto:** elegir el objetivo científico.
2. **Requisitos:** el juego deriva los requisitos mínimos (datos, vida útil, órbita o aterrizaje, instrumentos útiles).
3. **Estudio de compensaciones:** diseñar la nave por disciplinas, guardar dos diseños (A y B) y compararlos.
4. **Diseño puntual:** elegir la órbita (con diagrama 2D) y el cohete, y revisar la lista final de equipos.
5. **Lanzamiento y viaje:** animación del despegue y **travesía por días** con averías. Si el diseño no las evita, el equipo las repara con **minijuegos contra reloj** (unir cables por color, soldar grietas del casco, recalibrar la antena). Si no llegan a tiempo, se pierde combustible, energía, señal o días.
6. **Operación y resultados:** aterrizaje tipo Lunar Lander (si la misión aterriza), simulación mes a mes con línea de tiempo de eventos, e informe con causas y efectos, comparación con el intento anterior y misiones reales parecidas.

Hay **modo individual** y **modo equipo** (de 2 a 4 jugadores en la misma computadora) con 4 roles: **Comandante / Piloto** (órbita, cohete, propulsión, actitud), **Ingeniero de sistemas** (estructura, energía, térmica; lidera las reparaciones), **Especialista científico / médico** (instrumentos y soporte vital) y **Oficial de comunicaciones y recursos** (antena, estaciones, computadora y presupuesto). Hay **3 niveles**: 1) tutorial con un CubeSat, 2) misiones con un objetivo (Tierra, Luna, Marte y una **expedición tripulada** con soporte vital: oxígeno, agua y comida por día) y 3) misiones con varios objetivos a la vez.

> Es un **borrador jugable**: los gráficos son formas simples y todos los números de balance se pueden cambiar en los archivos JSON.
> **Este proyecto no está respaldado por la NASA.** Es un trabajo educativo de un equipo del NASA Space Apps Challenge.

---

## 1. Requisitos

| Programa | Para qué sirve | Versión |
|---|---|---|
| **Node.js** | Ejecutar Vite e instalar Phaser | LTS (la recomendada) |
| **Git** | Control de versiones y subir a GitHub | Cualquier versión reciente |
| **Visual Studio Code** (recomendado) | Editar el código | Cualquiera |

### Instalar en Windows

**Opción A, con la terminal (PowerShell):**

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```

Después **cierra y vuelve a abrir** la terminal (o VS Code) para que reconozca los comandos. Para comprobarlo:

```powershell
node -v
npm -v
git --version
```

**Opción B, con el instalador:**

- Node.js: https://nodejs.org → botón **LTS** → instalar con las opciones por defecto.
- Git: https://git-scm.com/download/win → instalar con las opciones por defecto.

> Si PowerShell muestra *"la ejecución de scripts está deshabilitada"* al usar `npm`, ejecuta una sola vez
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (o usa `npm.cmd` en lugar de `npm`).

### Visual Studio Code

1. **Archivo → Abrir carpeta…** y elige la carpeta del proyecto.
2. Acepta las **extensiones recomendadas** (`.vscode/extensions.json`): ESLint, Prettier, Error Lens, Path Intellisense y el corrector en español.
3. **No uses Live Server**: este proyecto necesita Vite.
4. Para jugar: **Terminal → Ejecutar tarea… → "Jugar (npm run dev)"**.

---

## 2. Comandos

```powershell
npm install        # solo la primera vez (o cuando cambie package.json)
npm run dev        # abre el juego en modo desarrollo: http://localhost:5173
npm test           # prueba la lógica (simulación, puntaje, compatibilidades...)
npm run build      # genera la versión final en la carpeta dist/
npm run preview    # prueba localmente la versión de dist/
```

Con `npm run dev` abierto, cada vez que guardas un archivo el navegador se recarga solo. **Antes de subir cambios al balance, ejecuta `npm test`**: comprueba, entre otras cosas, que el CubeSat tutorial todavía se puede ganar.

### Publicar en GitHub Pages

1. Crea un repositorio en GitHub y sube el proyecto:
   ```powershell
   git remote add origin https://github.com/USUARIO/REPOSITORIO.git
   git branch -M main
   git push -u origin main
   ```
2. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada `git push` a `main` ejecuta `.github/workflows/deploy.yml`, que compila y publica el juego en `https://USUARIO.github.io/REPOSITORIO/` (lo ves en la pestaña **Actions**).

`vite.config.js` usa `base: './'`, así que funciona con cualquier nombre de repositorio.

---

## 3. Estructura de carpetas

```
mision-espacial/
├── index.html
├── vite.config.js                 # base relativa para GitHub Pages
├── package.json
├── .github/workflows/deploy.yml   # publicación automática
├── .vscode/                       # extensiones y tareas recomendadas
├── tests/logica.test.js           # pruebas de la lógica pura (npm test)
└── src/
    ├── main.js                    # configura Phaser y registra las escenas
    ├── scenes/                    # UNA escena (pantalla) por archivo
    │   ├── EscenaInicio.js          # modo (1 jugador / equipo) y nivel
    │   ├── EscenaMision.js          # fase 1: Concepto
    │   ├── EscenaRequisitos.js      # fase 2: Requisitos
    │   ├── EscenaDiseno.js          # fase 3: Estudio de compensaciones (A/B)
    │   ├── EscenaDisenoPuntual.js   # fase 4: órbita (diagrama 2D), cohete, aprobación
    │   ├── EscenaLanzamiento.js     # fase 5: animación del despegue
    │   ├── EscenaViaje.js           # fase 5: travesía por días con averías
    │   ├── EscenaAterrizaje.js      # fase 6: minijuego tipo Lunar Lander
    │   ├── EscenaSimulacion.js      # fase 6: simulación con línea de tiempo
    │   └── EscenaInforme.js         # fase 6: informe, rediseño y misiones reales
    ├── systems/                   # lógica (sin dibujo)
    │   ├── datos.js                 # carga los JSON
    │   ├── estadoMision.js          # EL estado compartido + funciones "pegamento"
    │   ├── recursos.js              # PURA: masa, energía, datos, riesgo, barras
    │   ├── lanzamiento.js           # PURA: cohete/órbita, combustible, retrasos
    │   ├── eventos.js               # PURA: sorteo de eventos (según el riesgo)
    │   ├── simulacion.js            # PURA: simulación mes a mes
    │   ├── roles.js                 # PURA: segmentos del modo equipo y sus metas
    │   ├── puntaje.js               # PURA: requisitos y puntaje por categorías
    │   ├── informe.js               # PURA: causas y efectos, misiones parecidas
    │   ├── averias.js               # PURA: averías del viaje y sus daños
    │   ├── soporteVital.js          # PURA: oxígeno/comida en días-persona
    │   └── almacenamiento.js        # récords y diseños en localStorage
    ├── minijuegos/                # minijuegos de reparación (uno por archivo)
    │   ├── base.js                  # marco común: panel, cronómetro, cierre
    │   ├── MinijuegoCables.js       # unir cables por color
    │   ├── MinijuegoSoldadura.js    # soldar grietas del casco
    │   ├── MinijuegoAntena.js       # recalibrar la antena
    │   └── index.js                 # registro de minijuegos
    ├── ui/ui.js                   # botones, barras, ventanas, barra de fases
    └── data/                      # TODO el balance del juego
        ├── destinos.json            # gravedad, atmósfera, temperatura (NASA)
        ├── componentes.json         # componentes por disciplina
        ├── orbitas.json             # órbitas por destino
        ├── cohetes.json
        ├── misiones.json            # escenarios por nivel y sus objetivos
        ├── misiones_reales.json     # misiones reales de la NASA (con fuente)
        ├── eventos.json
        ├── roles.json               # los 4 segmentos y sus metas
        └── config.json              # fases, niveles, umbrales y puntaje
```

### Cómo se conectan las escenas

Todas importan el mismo objeto `estado` de `src/systems/estadoMision.js`. Cada escena **escribe** ahí lo que se decidió y lo que pasó (por ejemplo `estado.lanzamiento.insercion` o `estado.simulacion.resumen`), y el informe **lee** todo eso para explicar el resultado. Regla del equipo: *si tu escena produce algo importante, guárdalo en `estado`.*

Las funciones marcadas como **PURA** no usan Phaser ni leen el estado: reciben datos y devuelven resultados. Por eso se pueden probar con `npm test`.

---

## 4. ¿Qué archivo toco? (reparto del trabajo)

| Quiero cambiar… | Archivo | Perfil |
|---|---|---|
| Precios, masas, energía, confiabilidad de componentes | `src/data/componentes.json` | No programador |
| Misiones, objetivos, presupuestos, instrumentos útiles | `src/data/misiones.json` | No programador |
| Órbitas (detalle, contacto, vida, sombra) | `src/data/orbitas.json` | No programador |
| Cohetes y capacidades | `src/data/cohetes.json` | No programador |
| Eventos de la simulación y averías del viaje | `src/data/eventos.json` (`eventos` y `averiasViaje`) | No programador |
| Días de viaje y cantidad de averías por destino | `src/data/destinos.json` (`diasViaje`, `averiasViaje`) | No programador |
| Segundos de cada minijuego por nivel | `src/data/config.json` (`segundosMinijuego`) | No programador |
| Roles y sus metas | `src/data/roles.json` (+ `src/systems/roles.js`) | No programador / principiante |
| Minijuegos de reparación (o agregar uno nuevo) | `src/minijuegos/` | Principiante / intermedio |
| Travesía y averías | `src/scenes/EscenaViaje.js` + `src/systems/averias.js` | Intermedio |
| Soporte vital | `src/systems/soporteVital.js` + categoría `soporte` en `componentes.json` | Principiante |
| Fases, niveles, límites, puntaje | `src/data/config.json` | No programador |
| Misiones reales del informe | `src/data/misiones_reales.json` | No programador |
| Textos de causa y efecto | `src/systems/informe.js` | Principiante |
| Fórmulas de energía, datos y riesgo | `src/systems/recursos.js` | Intermedio |
| Simulación mes a mes | `src/systems/simulacion.js` | Intermedio |
| Puntaje | `src/systems/puntaje.js` | Principiante |
| Pantallas de concepto y requisitos | `EscenaMision.js`, `EscenaRequisitos.js` | Principiante |
| Diseño de la nave y comparación A/B | `EscenaDiseno.js` | Intermedio |
| Órbita, diagrama 2D y aprobación | `EscenaDisenoPuntual.js` | Intermedio |
| Animación de lanzamiento | `EscenaLanzamiento.js` | Principiante |
| Aterrizaje (física y controles) | `EscenaAterrizaje.js` | Intermedio |
| Simulación visual y línea de tiempo | `EscenaSimulacion.js` | Intermedio |
| Informe final | `EscenaInforme.js` | Principiante |
| Colores, botones y estilo | `src/ui/ui.js` | Principiante |

Para no pisarse: cada persona trabaja en **su archivo** en una rama de Git (`git checkout -b aterrizaje`) y los cambios a `estadoMision.js` se avisan al equipo.

---

## 5. Fuentes de los datos

- **Gravedad, radio, atmósfera y temperatura:** fichas técnicas de la NASA (NSSDC):
  - Tierra: https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
  - Luna: https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
  - Marte: https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html
  
  Cada destino tiene su fuente en el campo `"fuente"` de `src/data/destinos.json`.
- **Misiones reales:** `src/data/misiones_reales.json` (Landsat 9, Terra/MODIS, LCROSS, Lunar Prospector, MRO, Mars Odyssey, Phoenix, ELaNa y MarCO), cada una con su enlace. El campo `"verificar"` indica qué datos hay que comprobar antes de la demo (sobre todo, que los enlaces sigan funcionando).
- **Componentes, órbitas, cohetes, eventos y misiones:** valores **simplificados** para que el juego esté balanceado. Lo inspirado en datos reales lleva `"aproximado": true`. Los cohetes son ficticios.
- **Física del aterrizaje:** aceleración = empuje / masa total − gravedad. En Marte se suma un frenado atmosférico leve (a = k·v²).

---

## 6. Recursos de la NASA usados

| Recurso | Cómo influyó en el juego |
|---|---|
| **Design and Develop Science Missions** (NASA Science) | Idea central: una misión parte de un objetivo científico y de ahí salen los requisitos. Por eso las fases de Concepto y Requisitos, y por eso los instrumentos dependen del objetivo. |
| **Concept Maturity Levels** (JPL) | Las 6 fases de la barra de progreso (concepto, requisitos, estudio de compensaciones, diseño puntual, lanzamiento y operación) y la comparación de diseños A y B. |
| **Mission Design Lab** (NASA Goddard) | Las categorías de componentes siguen sus disciplinas de ingeniería (energía, propulsión, térmica, estructura, aviónica, comunicaciones, control de actitud e instrumentos) y la lista final de equipos con masa, energía y costo. |
| **Juego de diseño de telescopios de la NASA** | Instrumentos desactivados con una explicación cuando no sirven para el objetivo, 3 niveles de complejidad (el 3 con varios objetivos a la vez) y "Misiones reales parecidas a la tuya" en el informe. |
| **CubeSat 101** (NASA CubeSat Launch Initiative) | El nivel 1 (tutorial) es un CubeSat en órbita baja: barato, pequeño, con poca energía, que viaja como carga secundaria y usa estaciones terrenas simples. |
| **GMAT** (General Mission Analysis Tool) y **Mission Viz** | Referencia para las órbitas: altitudes, tiempo a la sombra, contacto con la Tierra y la idea de mostrar la órbita en un diagrama 2D simple. |

Cada rol del modo equipo corresponde a uno de los 4 segmentos de una misión (lanzamiento, espacial, usuario y terrestre); el campo `segmentoNasa` de `roles.json` lo indica.

Los minijuegos de reparación son mecánicas propias (unir cables, soldar, apuntar una antena) inspiradas en el género de "tareas cooperativas contra reloj"; no copian personajes, arte ni niveles de ningún juego existente.

Datos de soporte vital (aproximados, a verificar): cada astronauta consume por día alrededor de 0,8 kg de oxígeno y cerca de 2 kg de comida y agua para beber.

**Este proyecto no está respaldado, patrocinado ni aprobado por la NASA.** No usa logos ni imágenes oficiales.

---

## 7. Uso de IA

Usamos Claude Code para generar el borrador inicial del código.

<!-- Completar: qué partes revisó y modificó el equipo después. -->
