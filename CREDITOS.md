# Créditos

## Bibliotecas

| Biblioteca | Para qué | Licencia |
|---|---|---|
| [Three.js](https://threejs.org/) 0.187.0 | Gráficos 3D | MIT |
| [Socket.IO](https://socket.io/) 4.8.1 | Juego en red en tiempo real | MIT |
| [Express](https://expressjs.com/) 5.1.0 | Servidor del anfitrión | MIT |
| [Vite](https://vite.dev/) | Compilar el juego | MIT |

## Modelos 3D

**Por ahora el juego no usa modelos descargados.** Los astronautas, la nave, las salas y los planetas están hechos con formas simples de Three.js dentro del código (`src/aventura/entities/` y `src/aventura/escenarios/`). Los sonidos se generan con Web Audio (no hay archivos de audio).

### Opcional: astronauta en 3D descargado (CC0)

El juego busca el archivo **`public/models/astronauta.glb`**. Si existe, lo usa en lugar del astronauta hecho con formas; si no, sigue funcionando igual.

Opción sugerida (licencia **CC0**, de dominio público, se puede usar sin pedir permiso):

1. Abrir **Quaternius – Ultimate Space Kit**: https://quaternius.com/packs/ultimatespacekit.html
2. Pulsar el botón de descarga y elegir el formato **glTF**.
3. Dentro del ZIP, buscar un **personaje** (astronauta). *Antes de usarlo, comprobar que el paquete trae un astronauta con animaciones: no lo pudimos verificar sin descargarlo.*
4. Si el archivo es **`.glb`**: renombrarlo a `astronauta.glb` y copiarlo a `public/models/`.
   Si es **`.gltf`** (con un `.bin` aparte): convertirlo a un solo archivo con
   `npx gltf-pipeline -i personaje.gltf -o public/models/astronauta.glb`.
5. Ejecutar `npm run servidor` (o `npm run build`) y comprobar en el juego que se ve bien.
6. **Anotar aquí abajo** el nombre del paquete, el autor, el enlace y la licencia.

Otras fuentes CC0 revisadas: [Kenney – Space Kit](https://kenney.nl/assets/space-kit), Quaternius – Sci-Fi Essentials Kit y Modular Sci-Fi Megakit.

| Modelo | Autor | Enlace | Licencia |
|---|---|---|---|
| *(ninguno todavía)* | | | |

## Datos

Ver la sección **"Fuentes de los datos"** del [README](README.md) (fichas técnicas de la NASA, NSSDC, y misiones reales con sus enlaces).
