# Plan de pruebas y casos de prueba — Snake · 12 niveles

**Versión:** 1.1.0 · **Fecha:** 23/10/2026
**Estándar de referencia:** ISO/IEC/IEEE 29119-3 (documentación de pruebas), con técnicas de ISO/IEC/IEEE 29119-4 y atributos de calidad de ISO/IEC 25010. Esta estructura sustituye a IEEE 829, que 29119-3 reemplazó.

---

## 1. Identificación y alcance

| Elemento | Descripción |
|----------|-------------|
| Elemento bajo prueba | Juego Snake: `snake-core.js` (lógica), `main.js` (interfaz), `index.html`, `styles.css` |
| Dentro del alcance | Reglas del juego, 12 niveles, obstáculos, comida, pausa, puntuación, skins, persistencia local, entrada de teclado y táctil, accesibilidad básica |
| Fuera del alcance | Pruebas de carga, seguridad, localización a otros idiomas, audio (no existe) |
| Calidad evaluada (ISO/IEC 25010) | Adecuación funcional, fiabilidad, usabilidad, accesibilidad, portabilidad |

## 2. Requisitos verificables

| ID | Requisito |
|----|-----------|
| R01 | El tablero es de 20×20; la partida inicia con la serpiente de longitud 1 en (10,10) moviéndose a la derecha. |
| R02 | En cada tick la serpiente avanza una celda en su dirección. |
| R03 | Los giros son perpendiculares; se rechaza la inversión de 180° (también con pulsaciones rápidas) y las entradas no válidas. |
| R04 | Al comer: +1 punto, +1 de longitud y nueva comida. |
| R05 | Chocar con una pared termina la partida. |
| R06 | Chocar con un obstáculo termina la partida. |
| R07 | Chocar con el propio cuerpo termina la partida; la celda de la cola se considera libre porque la cola avanza. |
| R08 | 5 comidas completan el nivel; tras el nivel 12 hay victoria. |
| R09 | Hay 12 niveles con velocidad no creciente (150→85 ms) y obstáculos no decrecientes (0→20 celdas). |
| R10 | Los obstáculos son únicos, están dentro del tablero, fuera de la zona segura (7..13) y no encierran celdas libres. |
| R11 | La comida nunca aparece sobre la serpiente ni sobre un obstáculo. |
| R12 | «Reintentar» repite el nivel actual con el puntaje que tenía al iniciarlo. |
| R13 | En pausa no hay avance ni giros; se puede pausar con P o Espacio y automáticamente al ocultar la pestaña. |
| R14 | La mejor puntuación solo aumenta y se conserva entre sesiones. |
| R15 | La interfaz permite elegir skin (persistente), jugar con teclado y por deslizamiento, y es utilizable con teclado y lector de pantalla. |

## 3. Enfoque de prueba

| Nivel | Tipo | Herramienta | Casos |
|-------|------|-------------|-------|
| Unitario / componente | Automatizado, determinista (rng con semilla) | `node --test` (Node ≥ 18, sin dependencias) | TC-01 a TC-24 |
| Sistema (UI) | Manual guiado | Navegador | M-01 a M-14 |

**Técnicas (ISO/IEC/IEEE 29119-4):**

- **Partición de equivalencia:** giros válidos, inválidos y de inversión (TC-03 a TC-06, TC-15b).
- **Análisis de valores límite:** última celda interior y primera exterior de cada pared (TC-07), niveles 1 y 12 (TC-15, TC-16, TC-17), nivel fuera de rango (TC-15b).
- **Transición de estados:** `idle → playing ⇄ paused`, `playing → levelComplete / gameOver / won` (TC-13 a TC-21).
- **Basadas en propiedades y fuzz:** invariantes sobre 30 semillas × 2 000 pasos (TC-24); 12 niveles × 40 semillas para obstáculos (TC-17).
- **Pruebas de mutación (calidad de las pruebas):** 10 defectos introducidos a propósito en el código, ver sección 8.
- **Exploratoria:** M-13 y M-14.

## 4. Criterios

| Criterio | Definición |
|----------|------------|
| Entrada | Código en la versión 1.1.0; Node ≥ 18 disponible; navegador actual para pruebas manuales |
| Salida | 100 % de TC automatizados en «Pasa»; M-01 a M-12 en «Pasa»; sin incidencias críticas ni altas abiertas; cobertura de líneas del núcleo ≥ 95 % |
| Suspensión | Fallo en TC-01 a TC-02 (el juego no inicia ni avanza) o error de consola al cargar la página |

## 5. Entorno

- **Automatizado:** Node.js (se ejecutó con v22.22.2), sin dependencias externas.
- **Manual:** Chrome, Firefox, Edge y Safari actuales; un móvil o tableta; resoluciones de escritorio y 320 px de ancho.
- **Datos:** el nivel puede fijarse con `index.html?level=N` (1 a 12) para llegar al final sin jugar los anteriores.

## 6. Casos de prueba automatizados (28 pruebas en `tests/snake-core.test.js`)

Procedimiento: `npm test` (o `node --test`). Cobertura: `npm run coverage`.

| ID | Req. | Técnica | Precondición | Pasos | Resultado esperado |
|----|------|---------|--------------|-------|--------------------|
| TC-01 | R01 | Estado inicial | Partida nueva | `startGame()` | `playing`, nivel 0, puntos 0, serpiente [(10,10)], dirección (1,0), comida presente, 0 obstáculos |
| TC-02 | R02 | Funcional | Cabeza (10,10) → derecha | `step()` | `moved`; cabeza (11,10) |
| TC-02b | R02 | Funcional | Serpiente de 3 celdas | `step()` | Todo el cuerpo se desplaza; longitud 3 |
| TC-03 | R03 | Equivalencia | Dirección horizontal y vertical | `turn` perpendicular + `step()` | Giro aceptado; la cabeza va a la celda esperada (4 casos) |
| TC-04 | R03 | Equivalencia | Cada una de las 4 direcciones | `turn(opuesta)` | `false`; sigue en la dirección original |
| TC-05 | R03 | Valores límite | Va a la derecha | `turn(arriba)`, `turn(izquierda)`, `step()` | 1.º `true`, 2.º `false`; la cabeza sube a (10,9) |
| TC-06 | R03 | Equivalencia | Partida activa | `turn` con (1,1), (0,0), (2,0), (0.5,0.5), NaN, ∞ | Todos `false` |
| TC-07 | R05 | Valores límite | Cabeza junto a cada pared | `step()` desde x/y = 18, 19, 1, 0 | Penúltima celda `moved`; última hacia afuera `crashed` (8 casos) |
| TC-08 | R06 | Funcional | Obstáculo en (11,10) | `step()` | `crashed`; `gameOver` |
| TC-09 | R07 | Funcional | Cabeza a punto de entrar en un tramo intermedio del cuerpo | `step()` | `crashed` |
| TC-10 | R07 | Valores límite | Cabeza a punto de entrar en la celda de la cola | `step()` | `moved`; longitud 4 |
| TC-11 | R04 | Funcional | Comida en la celda siguiente | `step()` | `ate`; puntos 1, comidas 1, longitud 2, comida nueva en otro lugar |
| TC-12 | R11 | Propiedad | 200 semillas, nivel 12 | Comer 3 veces y revisar la comida | Nunca sobre serpiente ni obstáculo |
| TC-13 | R08 | Transición | Nivel 1 | Comer 5 veces | Las 4 primeras `ate`; la 5.ª `levelComplete` |
| TC-14 | R08 | Transición | Estado `levelComplete` | `nextLevel()` | `playing`, nivel 2, comidas 0, longitud 1, velocidad 140; segunda llamada `false` |
| TC-15 | R08 | Valores límite | Nivel 12, 4 comidas | Comer la 5.ª | `won`; `nextLevel()` devuelve `false` |
| TC-15b | R08 | Equivalencia | — | `startGame(99, -3, 'x', 3.5, 11, 0)` | Niveles 11, 0, 0, 0, 11, 0 |
| TC-16 | R09 | Funcional | — | Inspeccionar `LEVELS` | 12 niveles; obstáculos [0,0,1,1,2,2,3,3,4,4,5,5]; velocidad 150→85 no creciente |
| TC-17 | R10 | Propiedad | 12 niveles × 40 semillas | `startGame(n)` | Cantidad = obs×4; únicos; dentro del tablero; fuera de 7..13; todas las celdas alcanzables |
| TC-17b | R10 | Funcional | rng guionizado que primero encierra una esquina | `startGame()` | Se descarta el trazado encerrante y se usa el segundo |
| TC-18 | R12 | Transición | Nivel 2 con 5 puntos al iniciar y 6 al chocar | `retry()` | `playing`, nivel 2, puntos 5, comidas 0; segundo `retry()` `false` |
| TC-19 | R13 | Transición | Partida activa | `togglePause()`, `step()`, `turn()`, `togglePause()` | En pausa `ignored`/`false` sin cambios; al reanudar avanza |
| TC-19b | R13 | Transición | `idle` y `gameOver` | `togglePause()` | El estado no cambia |
| TC-20 | R14 | Funcional | Mejor inicial 0 y 7 | Comer 3 / comer 1 | Mejor = 3; con mejor previo 7 permanece 7 |
| TC-21 | R05 | Robustez | Sin iniciar y tras `crashed` | `step()` | `ignored`; el estado no cambia |
| TC-22 | R10 | Determinismo | Misma semilla y entradas | Dos ejecuciones | Estados idénticos |
| TC-23 | R01 | Funcional | Partida activa | Modificar la copia de `getState()`; `reset()` | El juego interno no cambia; `reset` deja `idle` y vacío |
| TC-24 | R01–R11 | Fuzz | 30 semillas × 2 000 pasos | Giros y avances aleatorios | Sin celdas repetidas; dentro del tablero; sin obstáculo bajo la serpiente; comida libre; longitud = 1 + comidas |

## 7. Casos de prueba manuales (para validar)

Marca cada caso con Pasa, Falla o Bloqueado y anota la evidencia. **Precondición general:** abrir `index.html` en el navegador; borrar el almacenamiento del sitio antes de M-01 y M-11.

| ID | Req. | Prioridad | Pasos | Resultado esperado |
|----|------|-----------|-------|--------------------|
| M-01 | R15 | Alta | Cargar la página. | Menú con «🐍 SNAKE», «12 niveles · skins», botones Jugar y Configuración. Sin errores en la consola. |
| M-02 | R01, R02 | Alta | Pulsar **Jugar**. | Desaparece el menú; HUD «Nv 1/12 0 pts 0/5»; la serpiente avanza sola hacia la derecha. |
| M-03 | R03 | Alta | Mover con flechas y con WASD; intentar girar 180° y pulsar dos teclas muy seguidas. | Responde a ambos esquemas; nunca se invierte sobre sí misma. |
| M-04 | R13 | Alta | Pulsar **P**, luego **Espacio** estando en pausa; usar «Continuar»; probar «Menú principal» desde la pausa. | Aparece la pantalla de pausa; el juego se detiene; Espacio/P/Continuar reanudan; «Menú principal» vuelve al menú. |
| M-05 | R13 | Media | Durante la partida, cambiar de pestaña y volver. | El juego queda en pausa al volver. |
| M-06 | R04, R08 | Alta | Comer 5 comidas en el nivel 1. | Aparece «✅ Nivel 1 completado»; «Siguiente nivel» inicia el nivel 2 y la serpiente vuelve a longitud 1. |
| M-07 | R05, R12 | Alta | Chocar con una pared; pulsar **Reintentar**. | «💀 GAME OVER» con puntos y mejor; «Reintentar» repite el mismo nivel con el puntaje que tenía al iniciarlo. |
| M-08 | R06, R10 | Media | Abrir `?level=12`; observar y chocar con un obstáculo. | Hay 20 obstáculos grises, ninguno cerca del inicio; chocar termina la partida. |
| M-09 | R08 | Media | Abrir `?level=12` y comer 5 veces. | «🏆 ¡GANASTE!» y botón «Menú principal». |
| M-10 | R15 | Media | Configuración → elegir cada skin; volver a Jugar; recargar la página. | Los colores cambian al instante; el skin elegido se conserva tras recargar; el botón activo se destaca. |
| M-11 | R14 | Media | Conseguir 3 puntos o más, perder, recargar y perder otra vez con menos puntos. | La mejor puntuación se conserva y no baja. |
| M-12 | R15 | Media | En un móvil o con el emulador táctil, deslizar sobre el tablero. | El juego gira según el deslizamiento y la página no se desplaza. |
| M-13 | R15 | Media | Usar solo teclado (Tab, Enter) y un lector de pantalla; ancho de 320 px. | Los botones muestran foco visible; el foco pasa al primer botón de cada pantalla; se anuncian pausa, fin de nivel y fin de partida; el tablero se ve completo y sin barra horizontal. |
| M-14 | R02 | Baja | Reiniciar 10 veces seguidas (Reintentar/Jugar) y observar la velocidad. | La velocidad no aumenta (no hay temporizadores duplicados). |

## 8. Resultados de ejecución

### 8.1 Automatizados

Ejecución del 23/10/2026 con Node v22.22.2, `node --test`:

| Métrica | Resultado |
|---------|-----------|
| Pruebas ejecutadas | 28 |
| Pasan / fallan | 28 / 0 |
| Cobertura de líneas de `snake-core.js` | 98,76 % |
| Cobertura de ramas | 93,33 % |
| Cobertura de funciones | 100 % |
| Líneas no cubiertas | 2: rama de carga en navegador y el último recurso de generación de obstáculos |

**Pruebas de mutación** (cada mutante se introdujo en `snake-core.js`, se ejecutó la suite y se restauró el original):

| Mutante | Defecto introducido | Resultado |
|---------|---------------------|-----------|
| M1 | Permitir inversión de 180° | Detectado (2 fallos) |
| M2 | Límite derecho desplazado una celda | Detectado (5 fallos) |
| M3 | La cola no se libera | Detectado (1 fallo) |
| M4 | Objetivo de nivel desplazado | Detectado (4 fallos) |
| M5 | Reintentar reinicia a 0 puntos | Detectado (1 fallo) |
| M6 | Sin zona segura de inicio | Detectado (1 fallo) |
| M7 | Sin comprobación de celdas encerradas | Detectado (1 fallo) |
| M8 | Comida puede caer sobre la serpiente | Detectado (2 fallos) |
| M9 | Mejor puntuación no es máximo | Detectado (1 fallo) |
| M10 | `step` no se ignora fuera de `playing` | Detectado (2 fallos) |

M6 y M7 sobrevivieron en la primera ronda; se reforzaron TC-17 (valor literal en lugar de la constante del código) y se añadió TC-17b. Tras ello fueron detectados.

### 8.2 Verificación auxiliar de la interfaz

Con un DOM simulado (jsdom, solo para esta verificación, no incluido en la entrega) se comprobaron 16 puntos: menú inicial, texto dinámico de niveles, 5 skins con `aria-pressed`, cambio y persistencia de skin, `?level=12`, pausa con P, pausa al ocultar la pestaña, Continuar, pantalla de game over, Reintentar y Menú principal. Los 16 pasaron. Esto **no sustituye** M-01 a M-14, que dependen de renderizado real, táctil y lector de pantalla.

### 8.3 Manuales

| Caso | Resultado | Fecha | Ejecutor | Evidencia / observaciones |
|------|-----------|-------|----------|---------------------------|
| M-01 a M-14 | **Pendiente** | | | |

## 9. Matriz de trazabilidad

| Req. | Casos automatizados | Casos manuales |
|------|---------------------|----------------|
| R01 | TC-01, TC-23, TC-24 | M-01, M-02 |
| R02 | TC-02, TC-02b | M-02, M-14 |
| R03 | TC-03, TC-04, TC-05, TC-06 | M-03 |
| R04 | TC-11 | M-06 |
| R05 | TC-07, TC-21 | M-07 |
| R06 | TC-08 | M-08 |
| R07 | TC-09, TC-10 | — |
| R08 | TC-13, TC-14, TC-15, TC-15b | M-06, M-09 |
| R09 | TC-16 | M-08 |
| R10 | TC-17, TC-17b, TC-22 | M-08 |
| R11 | TC-12, TC-24 | — |
| R12 | TC-18 | M-07 |
| R13 | TC-19, TC-19b | M-04, M-05 |
| R14 | TC-20 | M-11 |
| R15 | — | M-01, M-10, M-12, M-13 |

## 10. Plantilla de informe de incidencias

| Campo | Contenido |
|-------|-----------|
| ID | INC-001 |
| Caso asociado | (p. ej. M-07) |
| Severidad | Crítica / Alta / Media / Baja |
| Entorno | Navegador, versión, sistema operativo, dispositivo |
| Pasos para reproducir | 1… 2… 3… |
| Resultado obtenido | |
| Resultado esperado | |
| Evidencia | Captura o video, mensaje de consola |
| Estado | Abierta / En corrección / Verificada / Cerrada |

## 11. Hallazgos de la revisión del código original

| # | Hallazgo en `snake.html` | Cambio realizado | Cubierto por |
|---|--------------------------|------------------|--------------|
| H1 | `placeFood` reintentaba hasta 500 veces y podía dejar la comida sobre la serpiente u obstáculo | Se elige entre las celdas libres | TC-12, TC-24 |
| H2 | Obstáculos aleatorios podían encerrar celdas y dejar comida inalcanzable | Comprobación de conectividad con reintentos | TC-17, TC-17b |
| H3 | La cola contaba como cuerpo: chocar contra la celda que ella libera terminaba la partida | La cola se libera salvo que se coma | TC-10 |
| H4 | «Reintentar» ponía el puntaje en 0 aunque se estuviera en el nivel 8 (**cambio de comportamiento**) | Restaura el puntaje del inicio del nivel | TC-18 |
| H5 | Sin pausa, sin pausa automática y sin control táctil | P/Espacio, `visibilitychange`, deslizamiento | TC-19, M-04, M-05, M-12 |
| H6 | La lógica estaba mezclada con el DOM y no se podía probar | `snake-core.js` puro con `rng` inyectable | Toda la suite |
| H7 | Se dependía de variables globales creadas por los `id` (`next`, `over`, `menu`) y de nombres como `x` para el contexto | Código en un módulo con `const` locales | — |
| H8 | La mejor puntuación y el skin se perdían al recargar | `localStorage` con manejo de errores | M-10, M-11 |
| H9 | Tablero fijo de 400 px, sin foco visible ni anuncios | Diseño adaptable, `:focus-visible`, `role="status"`, `aria-pressed` | M-13 |
| H10 | El texto «12 niveles» estaba escrito a mano y las pantallas se ocultaban con una clase CSS ajena a la semántica | Texto generado desde la tabla de niveles; atributo `hidden` (también lo respetan los lectores de pantalla) | M-01 |
| H11 | La mejor puntuación solo se actualizaba al terminar | Se actualiza al comer | TC-20 |
| H12 | El código original ya detenía el temporizador antes de crear otro; al añadir pausa y pausa automática hay más rutas que lo reinician | Se mantiene un único temporizador; se verifica como regresión | M-14 |
