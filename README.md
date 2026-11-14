# Misión Espacial — Borrador (NASA Space Apps Challenge 2026)

Juego arcade educativo para el navegador: diseña una misión a la **Luna** o a **Marte**, compra las piezas de la nave, elige cohete y ruta, sobrevive al viaje, aterriza con la gravedad real del destino, opera los instrumentos en la superficie y, al final, descubre **cómo cada decisión afectó el resultado**.

> Es un **borrador jugable**: los gráficos son formas simples (rectángulos, círculos, texto) y todos los números de balance se pueden cambiar en los archivos JSON.

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

> Si PowerShell muestra el error *"la ejecución de scripts está deshabilitada"* al usar `npm`, ejecuta una sola vez:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### Visual Studio Code

1. Abre la carpeta del proyecto: **Archivo → Abrir carpeta…**
2. VS Code ofrecerá instalar las **extensiones recomendadas** (están en `.vscode/extensions.json`): ESLint, Prettier, Error Lens, Path Intellisense y el corrector en español. Acepta.
3. **No uses Live Server**: este proyecto necesita Vite (`npm run dev`).
4. Para jugar: **Terminal → Ejecutar tarea… → "Jugar (npm run dev)"**, o abre una terminal (`` Ctrl+` ``) y sigue la sección 2.

---

## 2. Comandos

```powershell
npm install        # solo la primera vez (o cuando cambie package.json)
npm run dev        # abre el juego en modo desarrollo: http://localhost:5173
npm run build      # genera la versión final en la carpeta dist/
npm run preview    # prueba localmente la versión de dist/
```

Con `npm run dev` abierto, cada vez que guardas un archivo el navegador se recarga solo.

### Publicar en GitHub Pages

1. Crea un repositorio en GitHub y sube el proyecto:
   ```powershell
   git remote add origin https://github.com/USUARIO/REPOSITORIO.git
   git branch -M main
   git push -u origin main
   ```
2. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada `git push` a `main` ejecuta `.github/workflows/deploy.yml`, que compila y publica el juego en
   `https://USUARIO.github.io/REPOSITORIO/` (lo ves en la pestaña **Actions**).

`vite.config.js` usa `base: './'`, así que funciona con cualquier nombre de repositorio.

---

## 3. Estructura de carpetas

```
mision-espacial/
├── index.html                  # Página que carga el juego
├── vite.config.js              # Configuración de Vite (base relativa)
├── package.json
├── .github/workflows/deploy.yml  # Publicación automática en GitHub Pages
├── .vscode/                    # Extensiones y tareas recomendadas para VS Code
└── src/
    ├── main.js                 # Configura Phaser y registra las escenas
    ├── scenes/                 # UNA escena por archivo (una pantalla del juego)
    │   ├── EscenaMision.js       # 1. Elegir destino y misión
    │   ├── EscenaTaller.js       # 2. Comprar piezas
    │   ├── EscenaLanzamiento.js  # 3. Cohete y ruta
    │   ├── EscenaViaje.js        # 4. Eventos del viaje
    │   ├── EscenaAterrizaje.js   # 5. Aterrizaje tipo Lunar Lander
    │   ├── EscenaOperacion.js    # 6. Instrumentos y transmisión
    │   └── EscenaResultados.js   # 7. Puntaje y explicaciones
    ├── systems/                # Lógica compartida (sin dibujo)
    │   ├── datos.js              # Carga los JSON
    │   ├── estadoMision.js       # EL estado compartido de la misión
    │   ├── eventos.js            # Combustible de la ruta y eventos
    │   ├── puntaje.js            # Puntaje y récords (localStorage)
    │   └── explicaciones.js      # Textos de causa y efecto
    ├── ui/ui.js                # Botones, textos y paneles reutilizables
    └── data/                   # TODO el balance del juego
        ├── destinos.json
        ├── piezas.json
        ├── cohetes.json
        ├── misiones.json
        ├── eventos.json
        └── config.json           # Umbrales de aterrizaje, turnos, puntaje
```

### Cómo se conectan las escenas

Todas importan el mismo objeto `estado` de `src/systems/estadoMision.js`. Cada escena **escribe** ahí lo que eligió el jugador y lo que pasó (por ejemplo `estado.aterrizaje.vVertical`). Al final, `explicaciones.js` **lee** ese estado para explicar el resultado. Regla del equipo: *si tu escena produce algo importante, guárdalo en `estado`.*

---

## 4. ¿Qué archivo toco? (reparto del trabajo)

| Quiero cambiar… | Archivo | Perfil |
|---|---|---|
| Precios, masas, empuje, energía de piezas | `src/data/piezas.json` | No programador |
| Misiones, presupuestos, objetivos | `src/data/misiones.json` | No programador |
| Cohetes y capacidades | `src/data/cohetes.json` | No programador |
| Gravedad, rutas, condiciones de aterrizaje | `src/data/destinos.json` | No programador |
| Eventos del viaje y sus daños | `src/data/eventos.json` | No programador |
| Límites de aterrizaje, turnos, puntaje | `src/data/config.json` | No programador |
| Textos educativos del final | `src/systems/explicaciones.js` | Principiante |
| Pantalla de elección de misión | `src/scenes/EscenaMision.js` | Principiante |
| Taller (compra de piezas) | `src/scenes/EscenaTaller.js` | Intermedio |
| Lanzamiento y ruta | `src/scenes/EscenaLanzamiento.js` | Principiante |
| Viaje y ventanas de eventos | `src/scenes/EscenaViaje.js` + `src/systems/eventos.js` | Intermedio |
| Física y controles del aterrizaje | `src/scenes/EscenaAterrizaje.js` | Intermedio |
| Operación en la superficie | `src/scenes/EscenaOperacion.js` | Intermedio |
| Pantalla final y récords | `src/scenes/EscenaResultados.js` + `src/systems/puntaje.js` | Principiante |
| Colores, botones, estilo general | `src/ui/ui.js` | Principiante |

Para no pisarse: cada persona trabaja en **su escena** en una rama de Git (`git checkout -b aterrizaje`) y los cambios a `estadoMision.js` se avisan al equipo.

---

## 5. Fuentes de los datos

- Gravedad, atmósfera y temperaturas: fichas técnicas de la NASA (NSSDC, National Space Science Data Center):
  - Tierra: https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
  - Luna: https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
  - Marte: https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html
- La fuente de cada destino está en el campo `"fuente"` de `src/data/destinos.json`.
- Piezas, cohetes, rutas, eventos y misiones usan **valores simplificados** para que el juego esté balanceado. Lo que está inspirado en datos reales lleva `"aproximado": true`. Los cohetes son ficticios y no representan productos reales.
- Física del aterrizaje: aceleración = empuje / masa total − gravedad; en Marte se suma un frenado atmosférico leve (a = k·v²).

---

## 6. Uso de IA

Usamos Claude Code para generar el borrador inicial del código.

<!-- Completar: qué partes revisó y modificó el equipo después. -->
