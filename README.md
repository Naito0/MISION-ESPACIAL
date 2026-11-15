# Space Garden (NASA Space Apps Challenge 2026)

> Antes se llamaba "Misión Espacial 3D". El repositorio y la carpeta conservan ese nombre.

Juego educativo **3D** para el desafío **"Juego de diseño de misiones espaciales"**. El jugador dirige a **4 astronautas** en una misión a la **Luna** o a **Marte**. Cada astronauta tiene un rol que corresponde a uno de los **4 segmentos de una misión de la NASA**:

| Tecla | Astronauta | Sala de la nave | Segmento NASA | En el hangar elige… | En el viaje resuelve… |
|---|---|---|---|---|---|
| **1** | Piloto (Comandante) | Cabina | Lanzamiento | Motor y combustible, escudo térmico | Esquivar basura y micrometeoritos, corregir el rumbo · y aterrizar con alarmas (Apolo 11) |
| **2** | Ingeniero | Ingeniería | Espacial | Estructura y blindaje, paneles, baterías | Cazar una fuga de aire, apagón (interruptores), falla en los motores · y limpiar paneles en Marte (InSight) |
| **3** | Científico / médico | Laboratorio | Usuario | Instrumentos, soporte vital y reciclador de O₂ | Filtro improvisado (Apolo 13), equilibrar el oxígeno, huerto espacial |
| **4** | Comunicaciones | Comunicaciones | Terrestre | Antena, red de estaciones, computadora | Unidades mezcladas (Mars Climate Orbiter), orden con retraso, contacto perdido (Opportunity) |

**Una partida dura unos 5 a 8 minutos:**

1. **Sistema solar 3D:** tarjetas con datos de la NASA. Se elige la Luna (dificultad media) o Marte (difícil, paga el doble) y la **dificultad** del viaje (Fácil / Normal).
2. **Hangar:** primero una **predicción** ("¿necesitarás más o menos paneles?"). Después se compran las piezas: cada categoría muestra una barra **Mínimo / Recomendado / Exagerado** calculada para ese destino, una vista previa al pasar el mouse y un consejo que explica el porqué. En Marte los paneles brillan menos.
3. **Viaje:** solo **3 emergencias en la Luna y 4 en Marte**, una por rol, con 30 a 45 segundos de calma entre ellas. Cada una tiene pasos: **aviso** (qué pasó y a quién le toca) → **diagnóstico** (una pregunta para pensar la causa) → **minijuego** → **"📜 Esto pasó de verdad"** → tarjeta **"💡 ¿Qué aprendiste?"**. Mientras se lee una tarjeta, **todo se congela**. Las puertas entre las salas están cerradas con llave.
4. **Aterrizaje:** el Piloto frena con la gravedad real, esquiva las rocas hasta la zona verde e ignora las alarmas que no son graves.
5. **Superficie:** se sale por la **esclusa** (despresurización), se recogen 3 muestras y el Científico las analiza. Los otros 3 astronautas trabajan de fondo (taladro, antena y rover).
6. **Informe:** estrellas, **medallas**, **"Hoy aprendiste 3 cosas"** con 3 preguntas rápidas, causas y efectos y una misión real de la NASA parecida.

La **primera misión a la Luna es un tutorial**: una línea de texto con una flecha indica qué hacer en cada paso. Lo aprendido queda en el diario **"Lo que aprendí"** y las medallas en la **"Sala de trofeos"** (menú Esc).

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

Todo corre dentro del navegador: no hace falta servidor ni internet. El juego compilado es un **sitio estático**: la carpeta `dist` (pesa menos de 1 MB) es todo lo que hay que subir.

**Link publicado:** https://naito0.github.io/MISION-ESPACIAL/

### Personajes
Cuatro animales astronautas originales: **Kelvin** (pingüino friolento), **Faro** (venado asustadizo), **Zuri** (zorra del desierto con orejas-antena) y **Tuerca** (mapache coleccionista). Cualquiera puede tener cualquier puesto: el traje y la mochila toman el color del puesto. Se eligen en la sala; al elegirlo, se presenta con su frase. Ver [CREDITOS.md](CREDITOS.md).

### Jugar solo
Escribe tu nombre → **🧑‍🚀 Jugar solo** → elige tu puesto y tu personaje → **¡Listo!** → **Iniciar partida**. Funciona **sin internet**.

En el modo de un jugador (también una sala online con 1 sola persona) manejas **solo a tu personaje** y te llegan **todas las emergencias**: el aviso dice a qué sala ir y una flecha te guía. Los otros 3 personajes trabajan de fondo en sus salas. Cada viaje tiene 5 (Luna) o 6 (Marte) emergencias de roles variados; la primera llega a los pocos segundos y, al resolver la última, la nave llega y pasa directo al aterrizaje.

**Preguntas del informe:** al final salen 3 preguntas al azar del destino (hay 10 de la Luna y 10 de Marte, en `src/data/preguntas.json`, hechas solo con datos de los JSON del juego). Las opciones se mezclan y no se repiten las de la partida anterior. El botón **💡 Pista** ayuda, pero esa pregunta no suma para la estrella.

**Sin destellos:** nada en el juego destella más de 3 veces por segundo (para personas sensibles a los destellos y para proyectar).

### Jugar con amigos (online, 2 a 4 jugadores)
1. **Crear sala:** una persona (el *anfitrión*) escribe su nombre y pulsa **✨ Crear sala**. Aparece un código de 4 letras (ej. `MCFS`) y el botón **📋 Copiar código**.
2. **Unirse:** los demás abren el mismo link, escriben su nombre, pulsan **🔑 Unirse con código**, escriben las 4 letras y pulsan **Entrar**.
3. Cada uno elige **un puesto** y **un personaje** (no se repiten) y pulsa **¡Listo!**.
4. Cuando todos están listos, el anfitrión pulsa **🚀 Iniciar partida**. Los puestos libres los ocupan bots; en una emergencia de un bot, cualquiera toma su control con 1-4.

Arriba en la sala se ve el estado: **⏳ Conectando…**, **🟢 Conectado** o **🔴 Error: …** (con el problema explicado).

**Cómo funciona:** usamos **PeerJS** con su servidor gratuito en la nube (sin cuenta ni claves) solo para "presentar" a las computadoras; después se hablan directo. El **anfitrión manda**: la partida corre en su navegador, recibe las acciones de los demás y les envía el estado 10 veces por segundo. Todo el código de red está en un solo archivo: `src/red/conexion.js`.

**Si alguien se va:** si se desconecta un jugador, su puesto pasa a ser un bot. Si se va el anfitrión (o cierra la pestaña), la partida termina y todos vuelven al menú con un mensaje.

### Problemas de conexión
| Mensaje | Qué hacer |
|---|---|
| "Ese código no existe" | Revisa las 4 letras. La sala solo existe mientras el anfitrión tiene el juego abierto. |
| "No se pudo llegar al servidor de PeerJS, revisa el internet" | Revisa el internet. Algunas redes de colegios o empresas bloquean PeerJS: prueben con los datos del celular. |
| "No se pudo abrir la conexión directa" | La red bloquea las conexiones entre computadoras. Prueben otra red (por ejemplo, el celular como punto de acceso). |
| "El anfitrión cerró la sala" / "Se perdió la conexión" | El anfitrión se fue o se le cortó el internet: creen una sala nueva. |

Si el online falla en la demo, usen **Jugar solo**: no depende de internet.

### Minijuegos
Cada rol tiene 3 o 4 emergencias, cada una con su minijuego; en cada viaje se eligen al azar y el mismo rol no repite la misma dos veces seguidas. Nuevos en la v10 (cortos, de 30 a 45 s): **Acoplarse a la estación** (Piloto), **Control térmico** con radiadores (Ingeniero), **Ejercicio de la tripulación**, un juego de ritmo (Científico) y **Ventana de contacto** (Comunicaciones). Sus hechos reales vienen de páginas de la NASA; las citas están marcadas "verificar" en `src/data/hechos_reales.json` hasta confirmar el texto exacto.

### Modo prueba (minijuegos)
**🧪 Modo prueba** en el menú: abre cualquier minijuego en Luna o Marte, sin penalización. La tabla para anotar los resultados está en [PRUEBAS.md](PRUEBAS.md).

## 3. Publicar: un link para que cualquiera juegue

Antes de publicar, siempre:

```powershell
npm run build      # crea la carpeta dist
npm run preview    # abrir http://localhost:4173 y comprobar que el juego carga
```

### Opción A: GitHub Pages (con el workflow que ya existe)

Requiere que el repositorio de GitHub sea **público** (en cuentas gratuitas, Pages no funciona con repositorios privados). Se publica el código y el juego.

1. Sube el proyecto a GitHub (una sola vez):
   ```powershell
   git remote add origin https://github.com/USUARIO/REPOSITORIO.git
   git push -u origin juego-3d
   ```
2. En GitHub, en el repositorio: **Settings → Pages → Build and deployment → Source: "GitHub Actions"**.
3. Si GitHub dice que la rama no tiene permiso: **Settings → Environments → github-pages → Deployment branches** → agregar `juego-3d`.
4. Cada `git push` a `main` o a `juego-3d` compila y publica el juego. Mira el avance en la pestaña **Actions** (círculo amarillo = trabajando, ✔ verde = listo).
5. El link queda así: `https://USUARIO.github.io/REPOSITORIO/`.

### Opción B: subir solo el juego compilado (el código NO se publica)

Sirve aunque el repositorio sea privado: solo se sube la carpeta `dist`.

**Netlify Drop:**
1. Ejecuta `npm run build`.
2. Abre https://app.netlify.com/drop en el navegador.
3. Abre el Explorador de archivos de Windows, entra a la carpeta del proyecto y **arrastra la carpeta `dist`** completa a la página.
4. Al terminar, Netlify muestra el link del juego (algo como `https://nombre-al-azar.netlify.app`). Si te pide crear una cuenta gratuita para conservar el sitio, créala.
5. Para actualizar el juego: `npm run build` y vuelve a arrastrar `dist` en la página de tu sitio (pestaña **Deploys**).

**Cloudflare Pages (subida directa):**
1. Ejecuta `npm run build`.
2. Entra a https://dash.cloudflare.com (cuenta gratuita) → **Workers & Pages** → **Create** → pestaña **Pages** → **Upload assets** (subir archivos).
3. Escribe un nombre para el proyecto y **arrastra la carpeta `dist`**. Pulsa **Deploy**.
4. El link queda así: `https://nombre-del-proyecto.pages.dev`.

> Todas las rutas del juego son relativas (`base: './'` en `vite.config.js`), así que funciona en cualquier carpeta o subcarpeta.

### Otros comandos

```powershell
npm test           # pruebas de las reglas (hangar, viaje, recomendaciones, aprendizaje…)
```

---

## 4. Controles

| Acción | Teclado y mouse |
|---|---|
| Cambiar de astronauta (solo multijugador, para tomar un bot) | **1** Piloto · **2** Ingeniero · **3** Científico · **4** Comunicaciones · **Tab** el siguiente · o **clic en los retratos** |
| Moverse | **WASD** o **flechas** (en multijugador, cada astronauta se mueve en su sala) |
| Mirar alrededor | **Clic** en el juego y mover el mouse (Q / R también giran la cámara) |
| Correr / saltar | **Shift** / **Espacio** |
| Usar una consola, recoger, analizar, salir por la esclusa | **E** |
| Abrir y cerrar puertas, casilleros, cajones, paneles y ventanas | **E** (adentro hay datos de la NASA, herramientas o piezas brillantes; en multijugador las puertas se abren para todos) |
| Aterrizar | Mantener **Espacio** (o **W**, o el botón "Motor") para frenar · **← →** para ir a la zona verde · **I** ignorar una alarma (**O** abortar) |
| Minijuegos | La primera vez se ve una demostración (el minijuego se juega solo) o una tarjeta con objetivo, controles y cómo ganar; después, botón **❓ Ver cómo se juega** |
| Tarjetas y diagnóstico | Clic en la respuesta · **"¡Entendido!"** para seguir (mientras tanto el juego está en pausa) |
| Emotes (se ven en multijugador) | **5** saludar · **6** bailar · **7** reír · **8** el gag de tu personaje |
| Zoom de la cámara | Rueda del mouse |
| Menú | **Esc**: **"📖 Lo que aprendí"**, **"🏆 Sala de trofeos"**, dificultad, **tamaño de texto (Normal / Grande)**, calidad gráfica, sensibilidad y sonido |

El texto viene en **Grande** por defecto, para leerse desde 2 metros o en un proyector. Si la computadora va lenta, elegir calidad **Baja** en el menú.

---

## 5. Estructura de carpetas

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
    │   ├── resumenAprendizaje.js  # "Hoy aprendiste 3 cosas"
    │   └── logros.js              # estrellas y medallas
    ├── aventura/                # todo lo que se ve (Three.js)
    │   ├── main3d.js              # arranque y cambio de pantallas
    │   ├── tripulacion.js         # los 4 astronautas: tecla, sala y límites
    │   ├── guia.js                # indicaciones de la primera misión (línea + flecha)
    │   ├── aprendizaje.js         # tarjetas "¿Qué aprendiste?" y diario
    │   ├── logros.js              # avisos de medallas y Sala de trofeos
    │   ├── pausa.js               # pausa real (tarjetas, diagnósticos, menú)
    │   ├── pantallas/             # sistema solar, hangar, nave, aterrizaje, superficie, informe
    │   ├── minijuegos/            # minijuegos basados en hechos reales (3 por rol)
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
| Dificultad: tiempos, daño, presupuesto · pasos de los minijuegos por destino (`minijuegosPorDestino`) | `src/data/dificultad.json` |
| Emergencias (nombre, rol, daño, "por qué le toca") y cuántas por viaje y la calma entre ellas | `src/data/emergencias3d.json` |
| Preguntas de diagnóstico de cada emergencia | `src/data/diagnosticos.json` |
| Hechos reales ("📜 Esto pasó de verdad") | `src/data/hechos_reales.json` |
| Los 3 conceptos por destino, preguntas y predicciones | `src/data/aprendizaje.json` |
| Medallas y criterios de las estrellas | `src/data/logros.json` |
| Presupuesto base, capacidad del cohete, qué rol elige qué | `src/data/hangar3d.json` |
| Precios, masas y energía de las piezas | `src/data/componentes.json` |
| Datos de la Luna y Marte (gravedad, noche, polvo, distancias) | `src/data/destinos.json` |
| Fórmulas de las recomendaciones | `src/compartido/recomendaciones.js` |
| Pasos de la guía de la primera misión | `src/aventura/guia.js` |
| Tamaños de texto | `src/aventura/ui/estilos.css` (variables al principio) |
| Un minijuego | `src/aventura/minijuegos/<rol>.js` |

Regla del equipo: **las reglas van en `src/compartido/`** (sin dibujo, con pruebas); lo visual va en `src/aventura/`. Después de cambiar un JSON, ejecuten `npm test`.

### Multijugador

La red pasa **solo** por `src/red/conexion.js` (PeerJS). La versión vieja con servidor Socket.IO sigue en el código pero **desactivada**: `pantallas/pantallaLobby.js`, `pantallas/pantallaNaveRed.js`, `aventura/red/conexion.js` y `server/`. No hay código de Firebase: ese plan se cambió por PeerJS antes de programarlo.

---

## 6. Fuentes de los datos

Cada dato y cada hecho real está en un JSON con su **fuente** (página de la NASA) y, cuando se pudo, una **cita** de esa página:

- **Gravedad, radio, temperatura y distancia:** fichas técnicas de la NASA (NSSDC), en `src/data/destinos.json`.
- **Noche lunar de casi 15 días terrestres:** https://www.nasa.gov/lunar-surface-technology/
- **Señal Luna 1,3 s:** https://science.nasa.gov/mission/voyager/voyager-1/voyager-1-what-is-a-light-day/
- **Señal Marte de 4 a 24 minutos:** https://www.nasa.gov/missions/tech-demonstration/space-communications-7-things-you-need-to-know/
- **Atmósfera de Marte (≈1/100 de la presión de la Tierra):** https://science.nasa.gov/resource/wind-flow-on-mars/
- **Hechos reales de los minijuegos** (`src/data/hechos_reales.json`): Estación Espacial y la basura espacial (2024), Apolo 11 (1969), Apolo 12 (1969), Apolo 13 (1970), InSight (2022), Veggie en la Estación Espacial (2018), Mars Climate Orbiter (1999) y Opportunity (2018), cada uno con su enlace y su cita.
- **Piezas, presupuesto, capacidad del cohete, emergencias, dificultad, logros y fórmulas de recomendación:** valores **simplificados** para el juego (marcados `"aproximado": true` o explicados en comentarios).

### ⚠ Datos a verificar antes de la demo

Algunas páginas no se pudieron abrir al revisarlas (las fichas NSSDC de la NASA no respondieron). Esos datos quedaron marcados con `"verificar"` en los JSON:

- **43% de luz solar en Marte** (`aprendizaje.json` → `luz_marte`): confirmar en la ficha de Marte la irradiancia solar de Marte y de la Tierra.
- **Fuga de aire de 2020** (`hechos_reales.json` → `fuga`): abrir el enlace y confirmar la cita. El juego **no** menciona las "hojas de té", porque ninguna página de la NASA revisada lo dice.
- `destinos.json` → `armado.verificar` (distancias a Marte, `factorPolvo` que es un valor del juego) y `misiones_reales.json` → `verificar` (que los enlaces sigan funcionando).

## 7. Recursos de la NASA usados

| Recurso | Cómo influyó en el juego |
|---|---|
| **Segmentos de una misión** (lanzamiento, espacial, usuario y terrestre) | Los 4 astronautas; cada uno elige y repara lo de su segmento. |
| **Mission Design Lab** (NASA Goddard) | Las piezas siguen sus disciplinas de ingeniería con masa, energía y costo. |
| **Concept Maturity Levels** (JPL) | El ciclo diseñar → probar → revisar el informe → mejorar el diseño. |
| **Fichas técnicas NSSDC** | Gravedad, temperatura, atmósfera y distancia de cada destino. |

Los minijuegos son mecánicas propias inspiradas en hechos reales de la NASA; no copian personajes, arte ni niveles de ningún juego existente.

## 8. Créditos

Ver **[CREDITOS.md](CREDITOS.md)** (bibliotecas y modelos 3D, con sus licencias).

## 9. Uso de IA

Usamos Claude Code para generar el borrador inicial del código.

Claude Code (un asistente de programación con inteligencia artificial) escribió, a partir de nuestras instrucciones:

- El motor 3D, los escenarios, los astronautas y los minijuegos.
- Las reglas del juego (viaje, hangar, recomendaciones, logros) y las pruebas automáticas.
- El multijugador con PeerJS, el Modo prueba y las demostraciones animadas de los minijuegos.
- Los 4 personajes (Kelvin, Faro, Zuri y Tuerca) dibujados con formas 3D, a partir de las ideas del equipo (animal, nombre, frase y gag).
- Los textos de las tarjetas, los diagnósticos y la documentación.

También buscó en páginas de la NASA los datos y los hechos reales, y guardó cada uno con su enlace y una cita. Lo que no pudo confirmar quedó marcado "verificar" o se quitó, para que lo revisemos nosotros. Probó cada cambio en un navegador automático.

<!-- Completar: qué partes revisó, probó y modificó el equipo después, y quién lo hizo. -->
