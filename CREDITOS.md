# Créditos

## Bibliotecas

| Biblioteca | Para qué | Licencia |
|---|---|---|
| [Three.js](https://threejs.org/) 0.187.0 | Gráficos 3D | MIT |
| [PeerJS](https://peerjs.com/) 1.5.4 | Multijugador online (con su servidor gratuito en la nube) | MIT |
| [Socket.IO](https://socket.io/) 4.8.1 | Modo en red viejo (desactivado) | MIT |
| [Express](https://expressjs.com/) 5.1.0 | Servidor del anfitrión | MIT |
| [Vite](https://vite.dev/) | Compilar el juego | MIT |

## Personajes y modelos 3D

**El juego no usa modelos descargados.** Todo está hecho con formas simples de Three.js dentro del código (`src/aventura/entities/` y `src/aventura/escenarios/`). Los sonidos se generan con Web Audio (no hay archivos de audio).

Los 4 tripulantes son **personajes originales del equipo**: no copian a personajes de series, películas ni videojuegos.

| Personaje | Animal | Su gag |
|---|---|---|
| **Kelvin** | pingüino | Siempre tiene frío: tiembla, lleva bufanda y una tirita, y se le congela el casco. Su nombre viene de la escala de temperatura Kelvin. |
| **Faro** | venado | Con una alarma se queda paralizado con ojos enormes; sus cuernos se traban en las puertas. |
| **Zuri** | zorra del desierto | Sus orejas enormes se mueven como antenas al captar señales; su estornudo la hace girar. |
| **Tuerca** | mapache | Colecciona cosas brillantes: saca tornillos de la nave; en las emergencias saca de la mochila la pieza justa. |

Están en `src/aventura/entities/Personaje.js` (formas, sombreado tipo caricatura, contorno, ojos, bocas y animaciones) y sus datos en `src/data/personajes.json` (nombre, colores, frase y gag). El astronauta viejo (`Astronauta.js`) quedó en el código sin usarse.
## Datos

Ver la sección **"Fuentes de los datos"** del [README](README.md) (fichas técnicas de la NASA, NSSDC, y misiones reales con sus enlaces).
