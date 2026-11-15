# Pruebas de los minijuegos

**Cómo probar:** abre el juego → **🧪 Modo prueba (minijuegos)** → elige **Luna** o **Marte** → haz clic en un minijuego. Al terminar aparece "Ganaste" o "Perdiste". No cuenta para la partida.

Prueba cada minijuego **en Luna y en Marte**, y escribe ✅ / ❌ / ⚠ (más o menos) en cada columna.

| Minijuego | Rol | ¿Funciona? | ¿Se entiende? | ¿Se puede ganar? | Notas (quién probó, qué pasó) |
|---|---|---|---|---|---|
| Esquivar basura espacial | Piloto | | | | |
| Corregir el rumbo | Piloto | | | | |
| Aterrizar con alarmas (pantalla de aterrizaje, no está en el Modo prueba) | Piloto | | | | |
| Cazar la fuga de aire | Ingeniero | | | | |
| Apagón: interruptores | Ingeniero | | | | |
| Estabilizar el motor | Ingeniero | | | | |
| Paneles con polvo | Ingeniero | | | | |
| Filtro improvisado (Apolo 13) | Científico | | | | |
| Equilibrar el oxígeno | Científico | | | | |
| Huerto espacial | Científico | | | | |
| Analizar una muestra | Científico | | | | |
| Unidades mezcladas | Comunicaciones | | | | |
| Orden con retraso | Comunicaciones | | | | |
| Contacto perdido | Comunicaciones | | | | |

## Si un minijuego no funciona

En `src/aventura/minijuegos/index.js`, agrega `activo: false` a ese minijuego (no se borra nada). Sus emergencias pasan solas a otro minijuego del mismo rol, y desaparece del Modo prueba.

## Pruebas automáticas (`npm test`)

- "Orden con retraso" siempre se puede ganar, en la Luna y en Marte. Se comprueba enviando la orden en la línea amarilla con los retrasos mínimos y máximos.
- Cada emergencia usa un minijuego que existe y que tiene su objetivo, sus controles y cómo se gana.
- Los demás minijuegos se controlan con el teclado y el mouse en el navegador. Para eso está esta tabla.
