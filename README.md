# Misión Espacial 3D (NASA Space Apps Challenge 2026)

Juego educativo **3D** para el desafío **"Juego de diseño de misiones espaciales"**. El jugador dirige a **4 astronautas** en una misión a la **Luna** o a **Marte**. Cada astronauta tiene un rol que corresponde a uno de los **4 segmentos de una misión de la NASA**:

| Tecla | Astronauta | Sala de la nave | Segmento NASA | En el hangar elige… | En el viaje resuelve… |
|---|---|---|---|---|---|
| **1** | Piloto (Comandante) | Cabina | Lanzamiento | Motor y combustible, escudo térmico | Trayectoria, maniobra de frenado, micrometeoritos |
| **2** | Ingeniero | Ingeniería | Espacial | Estructura y blindaje, paneles, baterías | Falla en los motores, cortocircuito, fuga en el casco |
| **3** | Científico / médico | Laboratorio | Usuario | Instrumentos, soporte vital y reciclador de O₂ | Oxígeno bajo, muestra contaminada, invernadero |
| **4** | Comunicaciones | Comunicaciones | Terrestre | Antena, red de estaciones, computadora | Pérdida de señal, tormenta solar, datos desordenados |

**Una partida dura unos 5 minutos:**

1. **Sistema solar 3D:** tarjetas con datos de la NASA. Se elige la Luna (fácil) o Marte (difícil, paga el doble). Aquí también se elige la **dificultad** (Fácil / Normal).
2. **Hangar:** se compran las piezas con un presupuesto. Cada categoría muestra una barra **Mínimo / Recomendado / Exagerado** calculada para ese destino; al pasar el mouse sobre una pieza se ve cómo cambiarían la masa, la energía y el dinero, y **Orbi** (el robot consejero) explica el porqué.
3. **Viaje (3 minutos):** los 4 astronautas trabajan en sus salas. Cuando hay una emergencia, un **aviso grande** dice qué pasó, a quién le toca, qué tecla pulsar y por qué; el retrato de ese rol parpadea. Se cambia de astronauta, se camina a la consola con **"!"** y se pulsa **E** para jugar el minijuego.
4. **Aterrizaje:** el Piloto frena con el motor contra la gravedad real del destino.
5. **Superficie:** se recogen 3 muestras y el Científico las analiza (el salto depende de la gravedad).
6. **Informe:** créditos, estrellas, causas y efectos, **lo que aprendiste en esta misión**, preguntas de repaso y una misión real de la NASA parecida.

La **primera misión a la Luna es un tutorial**: Orbi guía paso a paso con flechas. Durante el juego aparecen tarjetas **"¿Qué aprendiste?"** (nunca durante una emergencia) que se guardan en el diario **"Lo que aprendí"** del menú.

> **Este proyecto no está respaldado, patrocinado ni aprobado por la NASA.** Es un trabajo educativo de un equipo del NASA Space Apps Challenge.

---

## 1. Instalar (una sola vez)

Necesitas **Node.js** (versión LTS) y **Git**.

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```

Cierra y vuelve a abrir la terminal. Después, dentro de la carpeta del proyecto:

```powershell
npm install
```

> Si PowerShell dice *"la ejecución de scripts está deshabilitada"*, ejecuta una vez
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (o usa `npm.cmd` en lugar de `npm`).

## 2. Jugar

```powershell
npm run dev        # el juego en http://localhost:5173 (se recarga solo al guardar)
```

Para la demo (más liviano para la computadora):

```powershell
npm run build
npm run preview    # el juego en http://localhost:4173
```

Todo corre dentro del navegador: no hace falta servidor ni internet.

### Publicar en GitHub Pages

1. En GitHub: **Settings → Pages → Source: GitHub Actions** (una sola vez).
2. Cada `git push` a las ramas **main** o **juego-3d** publica el juego (pestaña **Actions**). Si GitHub dice que la rama no tiene permiso: **Settings → Environments → github-pages** → agregar `juego-3d` en *Deployment branches*.

### Otros comandos

```powershell
npm test           # pruebas de las reglas (hangar, viaje, recomendaciones, aprendizaje…)
```

---

## 3. Controles

| Acción | Teclado y mouse |
|---|---|
| Cambiar de astronauta | **1** Piloto · **2** Ingeniero · **3** Científico · **4** Comunicaciones · **Tab** el siguiente · o **clic en los retratos** |
| Moverse | **WASD** o **flechas** (cada astronauta solo se mueve en su sala) |
| Mirar alrededor | **Clic** en el juego y mover el mouse (Q / R también giran la cámara) |
| Correr / saltar | **Shift** / **Espacio** |
| Usar una consola, recoger o analizar | **E** |
| Aterrizar | Mantener **Espacio** (o **W**, o el botón "Motor") |
| Zoom de la cámara | Rueda del mouse |
| Menú | **Esc**: dificultad, **tamaño de texto (Normal / Grande)**, calidad gráfica, sensibilidad, sonido y **"📖 Lo que aprendí"** |

El texto viene en **Grande** por defecto, para leerse desde 2 metros o en un proyector. Si la computadora va lenta, elegir calidad **Baja** en el menú.

---

## 4. Estructura de carpetas

```
mision-espacial/
├── index.html
├── server/index.js              # (desactivado) servidor del modo en red
├── tests/                       # npm test
└── src/
    ├── compartido/              # REGLAS del juego (sin dibujo, con pruebas)
    │   ├── sala.js                # la partida: fases, dificultad, acciones
    │   ├── hangar.js              # compras y validación de masa/energía/antena
    │   ├── recomendaciones.js     # mínimo / recomendado / exagerado según el destino
    │   ├── viaje.js               # emergencias, vida de la nave, llegada o fracaso
    │   ├── superficie.js          # aterrizaje y muestras
    │   ├── informe.js             # créditos, puntaje, causas y efectos, misión real
    │   └── resumenAprendizaje.js  # lo que se aprendió en la partida
    ├── aventura/                # todo lo que se ve (Three.js)
    │   ├── main3d.js              # arranque y cambio de pantallas
    │   ├── tripulacion.js         # los 4 astronautas: tecla, sala y límites
    │   ├── tutorial.js            # Orbi guía la primera misión (Luna)
    │   ├── aprendizaje.js         # tarjetas "¿Qué aprendiste?" y diario
    │   ├── pantallas/             # sistema solar, hangar, nave, aterrizaje, superficie, informe
    │   ├── minijuegos/            # 12 minijuegos de consola (3 por rol)
    │   ├── escenarios/            # interior de la nave y superficie
    │   ├── entities/              # astronautas, nave del hangar, puertas
    │   ├── engine/                # motor 3D, física, cámara, controles
    │   ├── red/                   # partida local (y el modo en red, desactivado)
    │   └── ui/                    # estilos (tamaños de texto) y menú
    ├── systems/                 # preferencias y progreso (localStorage)
    └── data/                    # TODO el balance y los textos (JSON)
```

### ¿Qué archivo toco?

| Quiero cambiar… | Archivo |
|---|---|
| Dificultad: emergencias a la vez, tiempos, daño, presupuesto, pasos de los minijuegos | `src/data/dificultad.json` |
| Emergencias (nombre, rol, daño, frase "por qué le toca") | `src/data/emergencias3d.json` |
| Tarjetas de aprendizaje y preguntas de repaso | `src/data/aprendizaje.json` |
| Presupuesto base, capacidad del cohete, qué rol elige qué | `src/data/hangar3d.json` |
| Precios, masas y energía de las piezas | `src/data/componentes.json` |
| Datos de la Luna y Marte (gravedad, noche, polvo, distancias) | `src/data/destinos.json` |
| Fórmulas de las recomendaciones | `src/compartido/recomendaciones.js` |
| Pasos del tutorial | `src/aventura/tutorial.js` |
| Tamaños de texto | `src/aventura/ui/estilos.css` (variables al principio) |
| Un minijuego | `src/aventura/minijuegos/<rol>.js` |

Regla del equipo: **las reglas van en `src/compartido/`** (sin dibujo, con pruebas); lo visual va en `src/aventura/`. Después de cambiar un JSON, ejecuten `npm test`.

### Modo en red (desactivado)

El modo multijugador en red (lobby con código y servidor Socket.IO) **sigue en el código pero no se usa**: `pantallas/pantallaLobby.js`, `pantallas/pantallaNaveRed.js`, `red/conexion.js` (`conectarServidor`) y `server/`. El juego arranca directamente en modo de un jugador desde `src/aventura/main3d.js`.

---

## 5. Fuentes de los datos

- **Gravedad, radio, atmósfera, temperatura y distancia:** fichas técnicas de la NASA (NSSDC), con el enlace en el campo `"fuente"` de `src/data/destinos.json`:
  - Luna: https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
  - Marte: https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html
- **Luz solar en Marte (≈43% de la de la Tierra):** `destinos.json` → `juego.factorSolar`.
- **Retraso de la señal:** se **calcula** como distancia ÷ velocidad de la luz (299 792 km/s): Luna ≈ 1,3 s; Marte entre ≈ 3 y 22 minutos (con 55 y 400 millones de km).
- **Noche lunar (~14 días) y polvo en Marte:** `destinos.json` → `armado`, con su fuente.
- **Tarjetas de aprendizaje:** `src/data/aprendizaje.json`, cada una con su fuente.
- **Misiones reales del informe:** `src/data/misiones_reales.json`.
- **Piezas, presupuesto, capacidad del cohete, emergencias, dificultad y fórmulas de recomendación:** valores **simplificados** para el juego (marcados `"aproximado": true` o explicados en comentarios).

### ⚠ Datos a verificar antes de la demo

Al revisar las fichas de la NASA, la página no respondió, así que estos datos quedaron marcados con `"verificar"` en los JSON. Hay que abrir cada enlace y confirmarlos:

- `destinos.json` → Luna `armado.verificar` (periodo sinódico 29,53 días) y Marte `armado.verificar` (distancias mínima y máxima, frase sobre el polvo y los paneles, y que `factorPolvo` es un valor del juego).
- `aprendizaje.json` → campo `verificar` de cada tarjeta (sobre todo los enlaces generales `https://www.nasa.gov/` que hay que cambiar por la página exacta, y el consumo de oxígeno por astronauta).
- `misiones_reales.json` → campo `verificar` (que los enlaces sigan funcionando).

## 6. Recursos de la NASA usados

| Recurso | Cómo influyó en el juego |
|---|---|
| **Segmentos de una misión** (lanzamiento, espacial, usuario y terrestre) | Los 4 astronautas; cada uno elige y repara lo de su segmento. |
| **Mission Design Lab** (NASA Goddard) | Las piezas siguen sus disciplinas de ingeniería con masa, energía y costo. |
| **Concept Maturity Levels** (JPL) | El ciclo diseñar → probar → revisar el informe → mejorar el diseño. |
| **Fichas técnicas NSSDC** | Gravedad, temperatura, atmósfera y distancia de cada destino. |

Los minijuegos son mecánicas propias (unir cables, soldar, sintonizar, etc.); no copian personajes, arte ni niveles de ningún juego existente.

## 7. Créditos

Ver **[CREDITOS.md](CREDITOS.md)** (bibliotecas y modelos 3D, con sus licencias).

## 8. Uso de IA

Usamos Claude Code para generar el borrador inicial del código.

Claude Code (un asistente de programación con inteligencia artificial) escribió, a partir de nuestras instrucciones:

- El motor 3D, los escenarios, los astronautas y los 12 minijuegos.
- Las reglas del juego, las fórmulas de recomendación y las pruebas automáticas.
- Los textos de las tarjetas de aprendizaje y la documentación.

También probó cada cambio en un navegador automático. Los datos científicos salen de las fichas de la NASA citadas; lo que no se pudo confirmar quedó marcado "verificar" para revisarlo nosotros.

<!-- Completar: qué partes revisó, probó y modificó el equipo después, y quién lo hizo. -->
