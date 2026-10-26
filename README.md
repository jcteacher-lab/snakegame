# 🐍 Snake · 12 niveles

Juego de la serpiente clásico con **12 niveles de dificultad creciente**, obstáculos, **5 skins** y control por teclado o táctil. Está hecho con HTML5, CSS3 y JavaScript puro, **sin dependencias**, y su lógica está probada con una suite automatizada.

**Demo:** `https://jcteacher-lab.github.io/snakegame/` **

---

## Índice

1. [Características](#características)
2. [Cómo jugar](#cómo-jugar)
3. [Niveles](#niveles)
4. [Instalación y ejecución](#instalación-y-ejecución)
5. [Estructura del proyecto](#estructura-del-proyecto)
6. [Arquitectura](#arquitectura)
7. [Personalización](#personalización)
8. [Pruebas](#pruebas)
9. [Accesibilidad y compatibilidad](#accesibilidad-y-compatibilidad)
10. [Publicación en GitHub Pages](#publicación-en-github-pages)
11. [Limitaciones conocidas](#limitaciones-conocidas)
12. [Ideas para el futuro](#ideas-para-el-futuro)
13. [Contribuir](#contribuir)
14. [Licencia](#licencia)
15. [Otros proyectos](#otros-proyectos)
16. [Autor](#autor)

---

## Características

- **12 niveles**: cada uno es más rápido que el anterior y, a partir del nivel 3, añade obstáculos.
- **Obstáculos justos**: nunca aparecen cerca del punto de inicio ni encierran zonas del tablero.
- **5 skins**: Clásico, Neón, Candy, Bosque y Mono. Se cambian al instante.
- **Controles**: flechas, WASD o deslizar el dedo sobre el tablero.
- **Pausa**: con `P` o `Espacio`, y automática al cambiar de pestaña.
- **Persistencia**: se guardan la mejor puntuación y el skin elegido (`localStorage`).
- **Adaptable**: el tablero se ajusta al ancho de la pantalla (móvil y escritorio).
- **Accesible**: foco visible, navegación por teclado y anuncios para lectores de pantalla.
- **Sin dependencias**: no necesita instalación ni servidor.
- **Probado**: 28 pruebas automatizadas y un plan de pruebas basado en ISO/IEC/IEEE 29119.

## Cómo jugar

| Acción | Control |
|--------|---------|
| Mover | Flechas del teclado o `W` `A` `S` `D` |
| Mover en móvil | Deslizar sobre el tablero |
| Pausar / reanudar | `P` o `Espacio` |

**Reglas**

- Come **5 comidas** para completar un nivel.
- Cada comida suma 1 punto y alarga la serpiente.
- La partida termina si chocas con una pared, un obstáculo o tu propio cuerpo. La celda de la cola cuenta como libre, porque la cola avanza al mismo tiempo que la cabeza.
- No se puede girar 180° sobre uno mismo.
- Al completar el nivel 12 ganas la partida.
- «Reintentar» repite el nivel actual con el puntaje que tenías al iniciarlo.

**Truco para practicar:** abre `index.html?level=12` para empezar directamente en un nivel concreto (1 a 12).

## Niveles

| Nivel | Velocidad (ms por paso) | Obstáculos |
|:-----:|:-----------------------:|:----------:|
| 1 | 150 | 0 |
| 2 | 140 | 0 |
| 3 | 130 | 4 |
| 4 | 125 | 4 |
| 5 | 120 | 8 |
| 6 | 115 | 8 |
| 7 | 110 | 12 |
| 8 | 105 | 12 |
| 9 | 100 | 16 |
| 10 | 95 | 16 |
| 11 | 90 | 20 |
| 12 | 85 | 20 |

Un valor menor de velocidad significa que la serpiente se mueve más rápido.

## Instalación y ejecución

1. Descarga o copia el contenido del simulador en un archivo llamado `index.html`.
2. Ábrelo con doble clic en cualquier navegador moderno (Chrome, Firefox, Edge, Safari).
3. Listo. No requiere servidor web ni conexión a internet.

```bash
git clone https://github.com/jcteacher-lab/snakegame.git
cd snakegame
python3 -m http.server 8000
# Luego abre en tu navegador:
http://localhost:8000
```
```

## Estructura del proyecto

```text
snake-12-niveles/
├── index.html             # Estructura de la página y pantallas (menú, configuración, pausa, fin)
├── styles.css             # Estilos y diseño adaptable
├── main.js                # Interfaz: dibujo, teclado, táctil, temporizador y pantallas
├── snake-core.js          # Lógica pura del juego (sin DOM)
├── package.json           # Scripts de prueba
├── PLAN-DE-PRUEBAS.md     # Plan y casos de prueba (ISO/IEC/IEEE 29119-3)
└── tests/
    └── snake-core.test.js # Pruebas automatizadas
```

## Arquitectura

El proyecto separa la **lógica** de la **interfaz**:

- **`snake-core.js`** no usa DOM ni temporizadores. Expone `createGame()` con una API pequeña: `startGame`, `step`, `turn`, `togglePause`, `nextLevel`, `retry`, `reset` y `getState`. Acepta un generador aleatorio (`rng`) inyectable, lo que hace las pruebas deterministas. Funciona en el navegador (global `SnakeCore`) y en Node (`require`).
- **`main.js`** dibuja el estado en un `<canvas>`, traduce teclado y gestos en llamadas a `turn()`, y gestiona un único temporizador que invoca a `step()`.

```text
Teclado / táctil ──► main.js ──► game.turn() / game.step() ──► snake-core.js
                        ▲                                             │
                        └─────────── game.getState() ◄────────────────┘
                        │
                        └──► <canvas> + pantallas + anuncios (aria-live)
```

Estados del juego: `idle → playing ⇄ paused`, y desde `playing` a `levelComplete`, `gameOver` o `won`.

## Personalización

**Añadir un skin** (en `main.js`):

```js
const SKINS = {
  // ...
  Océano: { bg: '#06202b', grid: '#0b3042', snake: '#38bdf8', head: '#0ea5e9',
            food: '#fbbf24', wall: '#1e4d63' }
};
```

El botón del skin se genera automáticamente.

**Modificar los niveles** (en `snake-core.js`):

```js
const LEVELS = Object.freeze([
  { speed: 150, obs: 0 },   // speed = ms por paso · obs × 4 = celdas de obstáculo
  // ...
]);
```

Otras constantes: `GRID` (tamaño del tablero), `TARGET` (comidas por nivel) y `SAFE_RADIUS` (zona libre alrededor del inicio).

> Si cambias los valores de `LEVELS`, actualiza también `TC-16` en `tests/snake-core.test.js`, que comprueba la tabla de niveles.

## Pruebas

Requiere [Node.js](https://nodejs.org/) 18 o superior. No hay dependencias que instalar.

```bash
npm test            # ejecuta las pruebas
npm run coverage    # ejecuta las pruebas y muestra la cobertura
```

| Resumen | Resultado (23/10/2026, Node v22) |
|---------|----------------------------------|
| Pruebas automatizadas | 28, todas superadas |
| Cobertura de líneas del núcleo | 98,76 % |
| Defectos introducidos a propósito (mutación) | 10 de 10 detectados |

Cubren movimiento, giros, colisiones, comida, progresión de niveles, obstáculos, pausa, reintento y mejor puntuación, incluyendo pruebas de propiedades y de entradas aleatorias.

El documento [`PLAN-DE-PRUEBAS.md`](PLAN-DE-PRUEBAS.md) contiene los requisitos, la matriz de trazabilidad y **14 casos manuales** (M-01 a M-14) para validar la interfaz en un navegador real. Esos casos aún deben ejecutarse y registrarse en el plan.

## Accesibilidad y compatibilidad

- Navegación completa con teclado y foco visible en todos los botones.
- El foco pasa al primer botón de cada pantalla; el juego anuncia pausa, fin de nivel y fin de partida mediante una región `aria-live`.
- Respeta `prefers-reduced-motion`.
- Funciona en versiones actuales de Chrome, Edge, Firefox y Safari, en escritorio y móvil. Usa Canvas 2D y sintaxis moderna de JavaScript, por lo que los navegadores anteriores a 2020 aproximadamente pueden no ejecutarlo.

## Publicación en GitHub Pages

1. Sube los archivos a la rama `main`.
2. En el repositorio ve a **Settings → Pages**.
3. En **Source** elige **Deploy from a branch**, selecciona `main` y la carpeta `/ (root)`.
4. Guarda; en unos minutos el juego estará en `https://jcteacher-lab.github.io/snakegame/`.

## Limitaciones conocidas

- Solo hay un modo de juego (progresión de 12 niveles) y un jugador.
- No hay sonido.
- El tablero es fijo de 20×20.
- Los controles táctiles son por deslizamiento; no hay cruceta en pantalla.
- La mejor puntuación se guarda en el navegador, no se comparte entre dispositivos.

## Ideas para el futuro

- Cruceta táctil opcional.
- Efectos de sonido y vibración.
- Modo infinito y tabla de récords.
- Editor de niveles.
- Más tipos de comida (bonificaciones, comida temporal).

## Contribuir

1. Haz un *fork* del repositorio y crea una rama (`git checkout -b mi-mejora`).
2. Realiza tus cambios y ejecuta `npm test`.
3. Si modificas las reglas del juego, añade o ajusta pruebas en `tests/snake-core.test.js` y actualiza `PLAN-DE-PRUEBAS.md`.
4. Abre un *pull request* describiendo el cambio.

## Licencia

**Snake game**

Copyright (C) 2026

Este programa es **software libre**: puedes redistribuirlo y/o modificarlo bajo los términos de la **GNU General Public License** tal como la publica la Free Software Foundation, ya sea la **versión 3** de la Licencia, o (a tu elección) cualquier versión posterior.

Este programa se distribuye con la esperanza de que sea útil, pero **SIN NINGUNA GARANTÍA**; ni siquiera la garantía implícita de **COMERCIABILIDAD** o **IDONEIDAD PARA UN PROPÓSITO PARTICULAR**. Consulta la GNU General Public License para más detalles.

Deberías haber recibido una copia de la GNU General Public License junto con este programa. Si no es así, consulta <https://www.gnu.org/licenses/>.

### Resumen de la licencia

| | |
|---|---|
| **Licencia** | GNU General Public License v3.0 |
| **SPDX** | `GPL-3.0-or-later` |
| **Copyright** | (C) 2026 |
| **Texto legal completo** | [LICENSE](./LICENSE) · [gnu.org/licenses/gpl-3.0](https://www.gnu.org/licenses/gpl-3.0.txt) |

> **Importante**: para que el proyecto esté correctamente licenciado bajo GPL v3, además de este `README.md` debes incluir en la raíz del repositorio un archivo llamado `LICENSE` (sin extensión) con el texto legal completo. Puedes obtenerlo con:
>
> ```bash
> curl -o LICENSE https://www.gnu.org/licenses/gpl-3.0.txt
> ```

---

## Otros proyectos

- [Simulador de Tiro Parabólico](https://github.com/jcteacher-lab/tiroparabolico) —
  Simulador educativo de movimiento de proyectiles con Canvas 2D.
- [Analizador de parábolas](https://github.com/jcteacher-lab/analizadordeparabolas) —
  Herramienta didáctica para explorar la parábola: cambia a, h y k con deslizadores y observa cómo se traslada el vértice.
- [Graficador dinámico de parábolas](https://github.com/jcteacher-lab/Graficador_dinamico_parabolas) —
  Simulador educativo que construye la **gráfica y la ecuación de una parábola** a partir de sus elementos geométricos.
- [GSimulador del sistema solar](https://github.com/jcteacher-lab/Sistemasolar) —
  Simulador interactivo del Sistema Solar en un único archivo HTML

## Autor

**MTI. Juan Carlos Santiago Sánchez**
- GitHub: [@jcteacher-lab](https://github.com/jcteacher-lab)
- Correo: juancarlos.santiago.cb161@dgeti.sems.gob.mx

---

**Hecho con ❤️ y con libertad — GPL v3 garantiza que seguirá siendo libre.**

