# Misión Espacial 3D (NASA Space Apps Challenge 2026)

Juego educativo **3D y cooperativo** para el desafío **"Juego de diseño de misiones espaciales"**. De 1 a 4 jugadores, cada uno en su computadora y en la misma red, forman la tripulación de una misión a la **Luna** o a **Marte**. Cada jugador tiene un rol que corresponde a uno de los **4 segmentos de una misión de la NASA**:

| Rol | Segmento NASA | En el hangar compra… | En el viaje resuelve… |
|---|---|---|---|
| **Comandante / Piloto** | Lanzamiento | Motor y combustible, escudo térmico | Trayectoria, propulsores, micrometeoritos |
| **Ingeniero de sistemas** | Espacial | Estructura y blindaje, paneles, baterías | Cortocircuitos, fugas en el casco, sobrecarga de energía |
| **Especialista científico / médico** | Usuario | Instrumentos, soporte vital y reciclador de O₂ | Oxígeno, muestras, invernadero |
| **Oficial de comunicaciones** | Terrestre | Antena, red de estaciones, computadora | Frecuencia, antena desalineada, paquetes de datos |

**Una partida dura unos 5 minutos:**

1. **Sala de espera:** el anfitrión crea la partida (código de 4 letras). Cada jugador elige uno o más roles. No se empieza hasta que los 4 roles tienen dueño (si juegas solo, tomas los 4).
2. **Sistema solar 3D:** tarjetas con datos de la NASA. Se puede elegir la Luna (más fácil) o Marte (paga el doble y es más difícil). El resto dice "Próximamente".
3. **Hangar:** cada rol compra sus piezas con un **presupuesto compartido** y las piezas aparecen en la nave. Un holograma muestra la masa contra la capacidad del cohete, la energía y el dinero. Todos pulsan "¡Listo!"; si la nave no puede despegar, el juego explica por qué.
4. **Viaje (3 minutos):** caminan por la nave en tercera persona. Aparecen emergencias (alarmas, vapor, apagones, tormenta solar): cada una es de **un rol**, y se resuelve con la tecla **E** en la consola de su sala, con un **minijuego holográfico**. La nave tiene **vida compartida**; si llega a 0, la misión fracasa. **Las piezas que faltaron hacen que algunas emergencias salgan más seguido y dañen más.**
5. **Informe:** créditos, puntaje, estrellas, **causas y efectos**, y una **misión real de la NASA parecida** (con su enlace). Después se vuelve al hangar para mejorar la nave. El progreso se guarda en la computadora del anfitrión.

> **Este proyecto no está respaldado, patrocinado ni aprobado por la NASA.** Es un trabajo educativo de un equipo del NASA Space Apps Challenge.

---

## 1. Instalar (una sola vez)

Necesitas **Node.js** (versión LTS) y, para trabajar en equipo, **Git**.

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

---

## 2. Jugar

### El anfitrión (una sola computadora)

```powershell
npm run servidor
```

Esto compila el juego y arranca el servidor en el **puerto 3000**. En la terminal aparece algo así:

```
🚀 Servidor de Misión Espacial 3D listo
   En esta computadora:  http://localhost:3000
   Los demás jugadores:  http://192.168.1.25:3000
```

1. El anfitrión abre **http://localhost:3000**, escribe su nombre y pulsa **Crear partida**.
2. En la pantalla aparecen el **código de 4 letras** y la **dirección** para los demás.

### Los demás jugadores

1. Abren en el navegador la dirección que muestra el anfitrión, por ejemplo **http://192.168.1.25:3000**.
2. Escriben su nombre y el **código**, y pulsan **Unirse**.

También se puede probar con **varias pestañas** en la misma computadora (cada pestaña es un jugador).

### Jugar solo

En la pantalla de inicio, **"Jugar solo"**: tomas los 4 roles. Funciona incluso sin el servidor (por ejemplo con `npm run dev` o en GitHub Pages), porque la partida corre dentro del navegador.

### Si los demás no pueden entrar: firewall de Windows

La primera vez que se ejecuta `npm run servidor`, Windows pregunta si Node.js puede usar la red. **Marca "Redes privadas" y pulsa "Permitir acceso".** Además:

1. La red Wi-Fi debe estar como **privada**: *Configuración → Red e Internet → Wi-Fi → (tu red) → Tipo de perfil de red → **Privada***.
2. Si cerraste la ventana sin permitir, abre **PowerShell como administrador** y ejecuta:
   ```powershell
   New-NetFirewallRule -DisplayName "Mision Espacial 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
   ```
3. Comprueba que todos estén en **la misma red Wi-Fi**.

### Plan B: hotspot del celular

Muchas redes de escuelas, hoteles o eventos **no dejan que las computadoras se vean entre sí**. Si nadie puede entrar aunque el firewall esté bien:

1. Un celular activa su **punto de acceso / hotspot** (no hace falta que tenga datos: solo se usa como red local).
2. **Todas** las computadoras se conectan a ese hotspot (y en Windows lo marcan como red **privada**).
3. El anfitrión vuelve a ejecutar `npm run servidor` y comparte la **nueva** dirección que aparece (la IP cambia al cambiar de red).

### Para programar

```powershell
npm run dev        # el juego en http://localhost:5173 (se recarga solo al guardar)
node server/index.js   # en otra terminal, si quieres probar el modo en red con npm run dev
npm test           # pruebas de la lógica (sala, hangar, viaje, informe)
npm run build      # genera la versión final en dist/
```

---

## 3. Controles

| Acción | Teclado y mouse |
|---|---|
| Moverse | **WASD** o **flechas** |
| Mirar alrededor | **Clic** en el juego y mover el mouse (Q / R también giran la cámara) |
| Correr | **Shift** |
| Saltar | **Espacio** |
| Usar una consola | **E** (cerca de la consola con el **!**) |
| Zoom de la cámara | Rueda del mouse |
| Menú (calidad, sensibilidad, sonido) | **Esc** |

En el menú se puede elegir **calidad Baja** (sin sombras y con menos partículas) si la computadora va lenta. En el viaje, la tarjeta **"Mis tareas"** (arriba a la derecha) tiene una **flecha** que apunta a la consola donde te necesitan.

---

## 4. Estructura de carpetas

```
mision-espacial/
├── index.html
├── server/index.js              # servidor del anfitrión (Express + Socket.IO, puerto 3000)
├── tests/                       # npm test
└── src/
    ├── compartido/              # REGLAS del juego: las usa el servidor y el modo solo
    │   ├── sala.js                # la partida: jugadores, roles, fases (única fuente de verdad)
    │   ├── hangar.js              # compras, validación de masa/energía/antena
    │   ├── viaje.js               # emergencias, vida de la nave, llegada o fracaso
    │   └── informe.js             # créditos, puntaje, causas y efectos, misión real
    ├── aventura/                # todo lo que se ve (Three.js)
    │   ├── main3d.js              # arranque y cambio de pantallas
    │   ├── pantallas/             # lobby, sistema solar, hangar, nave (viaje), informe
    │   ├── minijuegos/            # 12 minijuegos de consola (3 por rol)
    │   ├── escenarios/            # interior de la nave (salas, consolas, puertas)
    │   ├── entities/              # astronautas, jugador, nave del hangar, puertas
    │   ├── engine/                # motor 3D, física, cámara, controles, luces
    │   ├── red/                   # conexión con el servidor (o partida local)
    │   ├── ui/                    # estilos y menú de pausa
    │   └── audio.js               # sonidos generados (sin archivos)
    ├── systems/                 # preferencias y progreso guardados (localStorage)
    └── data/                    # TODO el balance del juego (JSON)
```

### ¿Qué archivo toco?

| Quiero cambiar… | Archivo |
|---|---|
| Emergencias del viaje (daño, tiempos, duración del viaje, créditos) | `src/data/emergencias3d.json` |
| Presupuesto, capacidad del cohete, qué rol compra qué | `src/data/hangar3d.json` |
| Precios, masas y energía de las piezas | `src/data/componentes.json` |
| Datos de la Luna y Marte | `src/data/destinos.json` |
| Misiones reales del informe | `src/data/misiones_reales.json` |
| Un minijuego | `src/aventura/minijuegos/<rol>.js` |
| Cómo se ve una pieza en la nave del hangar | `src/aventura/entities/naveModelo.js` |
| Salas y consolas de la nave | `src/aventura/escenarios/naveInterior.js` |
| Textos de causa y efecto | `src/compartido/informe.js` |

Regla del equipo: **las reglas van en `src/compartido/`** (sin dibujo, con pruebas); lo visual va en `src/aventura/`. Después de cambiar un JSON, ejecuten `npm test`.

---

## 5. Fuentes de los datos

- **Gravedad, radio, atmósfera, temperatura y distancia:** fichas técnicas de la NASA (NSSDC). Cada destino tiene su enlace en el campo `"fuente"` de `src/data/destinos.json`:
  - Luna: https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html
  - Marte: https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html
  - Tierra: https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
- **Luz solar en Marte (43% de la de la Tierra):** `destinos.json` → `juego.factorSolar`. Por eso en Marte los paneles rinden menos.
- **Misiones reales del informe:** `src/data/misiones_reales.json`, cada una con su enlace. El campo `"verificar"` indica qué hay que comprobar antes de la demo (sobre todo, que los enlaces sigan funcionando).
- **Piezas, presupuesto, capacidad del cohete y emergencias:** valores **simplificados** para que el juego esté balanceado (marcados `"aproximado": true`). Los cohetes son ficticios.
- El **sistema solar** no está a escala (se aclara en pantalla).

## 6. Recursos de la NASA usados

| Recurso | Cómo influyó en el juego |
|---|---|
| **Segmentos de una misión** (lanzamiento, espacial, usuario y terrestre) | Los 4 roles; cada uno compra y repara lo de su segmento. |
| **Mission Design Lab** (NASA Goddard) | Las piezas siguen sus disciplinas de ingeniería (energía, propulsión, térmica, estructura, aviónica, comunicaciones e instrumentos) con masa, energía y costo. |
| **Concept Maturity Levels** (JPL) | El ciclo diseñar → probar → revisar el informe → mejorar el diseño. |
| **Fichas técnicas NSSDC** | Gravedad, temperatura, atmósfera y distancia de cada destino. |

Los minijuegos son mecánicas propias (unir cables, soldar, sintonizar, etc.) inspiradas en el género de "tareas cooperativas contra reloj"; no copian personajes, arte ni niveles de ningún juego existente.

## 7. Créditos

Ver **[CREDITOS.md](CREDITOS.md)** (bibliotecas y modelos 3D, con sus licencias).

## 8. Uso de IA

Usamos Claude Code para generar el borrador inicial del código.

<!-- Completar: qué partes revisó y modificó el equipo después. -->
