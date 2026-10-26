'use strict';
/**
 * Pruebas automatizadas de snake-core.js
 * Documentación: ISO/IEC/IEEE 29119-3 · Técnicas: ISO/IEC/IEEE 29119-4
 * Cada nombre sigue el formato  TC-xx [Rxx] descripción  (ver PLAN-DE-PRUEBAS.md).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createGame, LEVELS, GRID, TARGET, OBSTACLES_PER_UNIT } = require('../snake-core.js');

/* ---------- Utilidades ---------- */
function rngFrom(seed) {                       // mulberry32: determinista
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const P = (x, y) => ({ x, y });
function newGame(seed = 1, level = 0, opts = {}) {
  const g = createGame({ rng: rngFrom(seed), ...opts });
  g.startGame(level);
  return g;
}
/** Coloca la serpiente (cabeza primero), dirección y comida; sin obstáculos salvo que se indiquen. */
function setup(g, patch) { g.debugSetState({ obstacles: [], food: P(0, 0), ...patch }); return g; }
/** Come `n` veces seguidas colocando la comida delante de la cabeza. */
function eat(g, n = 1) {
  let ev;
  for (let i = 0; i < n; i++) {
    const s = g.getState(), h = s.snake[0];
    g.debugSetState({ food: P(h.x + s.dir.x, h.y + s.dir.y), obstacles: [] });
    ev = g.step();
  }
  return ev;
}
const cells = list => new Set(list.map(p => p.x + ',' + p.y));
function reachable(obstacles) {               // oráculo independiente del código bajo prueba
  const blocked = cells(obstacles), seen = new Set(['10,10']), q = [P(10, 10)];
  while (q.length) {
    const p = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = P(p.x + dx, p.y + dy), k = n.x + ',' + n.y;
      if (n.x < 0 || n.y < 0 || n.x >= GRID || n.y >= GRID || blocked.has(k) || seen.has(k)) continue;
      seen.add(k); q.push(n);
    }
  }
  return seen.size === GRID * GRID - blocked.size;
}

/* ---------- R01 · Estado inicial ---------- */
test('TC-01 [R01] estado inicial de una partida nueva', () => {
  const s = newGame().getState();
  assert.equal(GRID, 20);
  assert.equal(s.status, 'playing');
  assert.deepEqual([s.level, s.score, s.foods], [0, 0, 0]);
  assert.deepEqual(s.snake, [P(10, 10)]);
  assert.deepEqual(s.dir, { x: 1, y: 0 });
  assert.ok(s.food);
  assert.equal(s.obstacles.length, 0);
});

/* ---------- R02 · Movimiento ---------- */
test('TC-02 [R02] cada tick avanza una celda en la dirección actual', () => {
  const g = setup(newGame(), { snake: [P(10, 10)], dir: { x: 1, y: 0 } });
  assert.equal(g.step(), 'moved');
  assert.deepEqual(g.getState().snake, [P(11, 10)]);
});

test('TC-02b [R02] una serpiente larga se desplaza completa sin crecer', () => {
  const g = setup(newGame(), { snake: [P(10, 10), P(9, 10), P(8, 10)], dir: { x: 1, y: 0 } });
  g.step();
  assert.deepEqual(g.getState().snake, [P(11, 10), P(10, 10), P(9, 10)]);
});

/* ---------- R03 · Giros (partición de equivalencia) ---------- */
test('TC-03 [R03] giros perpendiculares válidos desde dirección horizontal y vertical', () => {
  for (const [dx, dy, ex, ey] of [[0, -1, 10, 9], [0, 1, 10, 11]]) {
    const g = setup(newGame(), { snake: [P(10, 10)], dir: { x: 1, y: 0 } });
    assert.equal(g.turn(dx, dy), true); g.step();
    assert.deepEqual(g.getState().snake[0], P(ex, ey));
  }
  for (const [dx, dy, ex, ey] of [[1, 0, 11, 10], [-1, 0, 9, 10]]) {
    const g = setup(newGame(), { snake: [P(10, 10)], dir: { x: 0, y: -1 } });
    assert.equal(g.turn(dx, dy), true); g.step();
    assert.deepEqual(g.getState().snake[0], P(ex, ey));
  }
});

test('TC-04 [R03] la inversión de 180° se rechaza en las 4 direcciones', () => {
  for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const g = setup(newGame(), { snake: [P(10, 10)], dir: { x: d[0], y: d[1] } });
    assert.equal(g.turn(-d[0], -d[1]), false);
    g.step();
    assert.deepEqual(g.getState().snake[0], P(10 + d[0], 10 + d[1]));
  }
});

test('TC-05 [R03] giro doble rápido no permite suicidio por inversión', () => {
  const g = setup(newGame(), { snake: [P(10, 10), P(9, 10), P(8, 10)], dir: { x: 1, y: 0 } });
  assert.equal(g.turn(0, -1), true);
  assert.equal(g.turn(-1, 0), false);       // se compara contra la dirección vigente (derecha)
  assert.equal(g.step(), 'moved');
  assert.deepEqual(g.getState().snake[0], P(10, 9));
});

test('TC-06 [R03] vectores inválidos se rechazan (diagonal, nulo, módulo > 1, no entero, NaN)', () => {
  const g = setup(newGame(), { snake: [P(10, 10)], dir: { x: 1, y: 0 } });
  for (const [dx, dy] of [[1, 1], [0, 0], [2, 0], [0.5, 0.5], [NaN, 0], [0, Infinity]]) {
    assert.equal(g.turn(dx, dy), false, `turn(${dx},${dy})`);
  }
});

/* ---------- R05/R06/R07 · Colisiones (análisis de valores límite) ---------- */
test('TC-07 [R05] paredes: la última celda interior es válida y la siguiente es choque', () => {
  const casos = [
    [P(18, 10), [1, 0], 'moved'],  [P(19, 10), [1, 0], 'crashed'],
    [P(1, 10), [-1, 0], 'moved'],  [P(0, 10), [-1, 0], 'crashed'],
    [P(10, 1), [0, -1], 'moved'],  [P(10, 0), [0, -1], 'crashed'],
    [P(10, 18), [0, 1], 'moved'],  [P(10, 19), [0, 1], 'crashed']
  ];
  for (const [head, d, esperado] of casos) {
    const g = setup(newGame(), { snake: [head], dir: { x: d[0], y: d[1] } });
    assert.equal(g.step(), esperado, `desde (${head.x},${head.y}) hacia (${d})`);
  }
});

test('TC-08 [R06] chocar con un obstáculo termina la partida', () => {
  const g = setup(newGame(), { snake: [P(10, 10)], dir: { x: 1, y: 0 }, obstacles: [P(11, 10)] });
  assert.equal(g.step(), 'crashed');
  assert.equal(g.getState().status, 'gameOver');
});

test('TC-09 [R07] chocar con el propio cuerpo termina la partida', () => {
  const g = setup(newGame(), { snake: [P(5, 5), P(5, 6), P(4, 6), P(4, 5), P(4, 4)], dir: { x: -1, y: 0 } });
  assert.equal(g.step(), 'crashed');
});

test('TC-10 [R07] entrar en la celda de la cola es válido porque la cola se libera', () => {
  const g = setup(newGame(), { snake: [P(5, 5), P(5, 6), P(4, 6), P(4, 5)], dir: { x: -1, y: 0 } });
  assert.equal(g.step(), 'moved');
  assert.equal(g.getState().snake.length, 4);
});

/* ---------- R04 / R11 · Comida ---------- */
test('TC-11 [R04] comer suma 1 punto, 1 de longitud y genera nueva comida', () => {
  const g = setup(newGame(), { snake: [P(10, 10)], dir: { x: 1, y: 0 }, food: P(11, 10) });
  assert.equal(g.step(), 'ate');
  const s = g.getState();
  assert.deepEqual([s.score, s.foods, s.snake.length], [1, 1, 2]);
  assert.notDeepEqual(s.food, P(11, 10));
});

test('TC-12 [R11] la comida nunca aparece sobre la serpiente ni sobre obstáculos (200 semillas)', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const g = newGame(seed, 11);                       // nivel con más obstáculos
    for (let i = 0; i < 3; i++) {
      const s = g.getState();
      const bloqueadas = cells(s.snake.concat(s.obstacles));
      assert.ok(s.food && !bloqueadas.has(s.food.x + ',' + s.food.y), `semilla ${seed}`);
      eat(g, 1);                                       // (limpia obstáculos para poder avanzar)
    }
  }
});

/* ---------- R08 · Progresión de niveles (transición de estados) ---------- */
test('TC-13 [R08] la 5ª comida completa el nivel', () => {
  const g = newGame();
  assert.equal(TARGET, 5);
  for (let i = 0; i < TARGET - 1; i++) assert.equal(eat(g), 'ate');
  assert.equal(eat(g), 'levelComplete');
  assert.equal(g.getState().status, 'levelComplete');
});

test('TC-14 [R08] nextLevel avanza, reinicia contadores y aplica la nueva velocidad', () => {
  const g = newGame(); eat(g, 5);
  assert.equal(g.nextLevel(), true);
  const s = g.getState();
  assert.deepEqual([s.status, s.level, s.foods, s.snake.length, s.speed], ['playing', 1, 0, 1, 140]);
  assert.equal(g.nextLevel(), false);                  // no permitido en 'playing'
});

test('TC-15 [R08] completar el nivel 12 produce victoria y no hay nivel 13', () => {
  const g = newGame(1, 11);
  assert.equal(eat(g, 5), 'won');
  assert.equal(g.getState().status, 'won');
  assert.equal(g.nextLevel(), false);
});

test('TC-15b [R08] startGame acota el nivel inicial al rango 0..11', () => {
  for (const [entrada, esperado] of [[99, 11], [-3, 0], ['x', 0], [3.5, 0], [11, 11], [0, 0]]) {
    const g = createGame({ rng: rngFrom(1) }); g.startGame(entrada);
    assert.equal(g.getState().level, esperado, `startGame(${entrada})`);
  }
});

/* ---------- R09 / R10 · Configuración y obstáculos ---------- */
test('TC-16 [R09] tabla de niveles: 12 niveles, velocidad no creciente, obstáculos no decrecientes', () => {
  assert.equal(LEVELS.length, 12);
  assert.deepEqual(LEVELS.map(l => l.obs), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  assert.equal(LEVELS[0].speed, 150); assert.equal(LEVELS[11].speed, 85);
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].speed <= LEVELS[i - 1].speed && LEVELS[i].obs >= LEVELS[i - 1].obs);
  }
});

test('TC-17 [R10] obstáculos: cantidad exacta, dentro del tablero, únicos, fuera de la zona segura y todo alcanzable', () => {
  for (let level = 0; level < LEVELS.length; level++) {
    for (let seed = 1; seed <= 40; seed++) {
      const o = newGame(seed, level).getState().obstacles;
      assert.equal(o.length, LEVELS[level].obs * OBSTACLES_PER_UNIT, `nivel ${level + 1}, semilla ${seed}`);
      assert.equal(cells(o).size, o.length, 'sin duplicados');
      for (const p of o) {
        assert.ok(p.x >= 0 && p.y >= 0 && p.x < GRID && p.y < GRID, 'dentro del tablero');
        assert.ok(Math.abs(p.x - 10) > 3 || Math.abs(p.y - 10) > 3, 'fuera de zona segura (7..13)');
      }
      assert.ok(reachable(o), `celdas encerradas en nivel ${level + 1}, semilla ${seed}`);
    }
  }
});

test('TC-17b [R10] un trazado que encierra celdas se descarta y se genera otro (rng guionizado)', () => {
  // 1er intento: (1,0) y (0,1) encierran la esquina (0,0). 2º intento: (15,15) y (16,15).
  const guion = [0.06, 0, 0, 0.06,   0.75, 0.75, 0.8, 0.75];
  let i = 0; const rng = () => (i < guion.length ? guion[i++] : 0.5);
  const g = createGame({ rng, levels: [{ speed: 100, obs: 0.5 }] });   // 0.5 × 4 = 2 obstáculos
  g.startGame(0);
  assert.deepEqual(g.getState().obstacles, [P(15, 15), P(16, 15)]);
});

/* ---------- R12 · Reintentar ---------- */
test('TC-18 [R12] reintentar restaura el puntaje del inicio del nivel y conserva el nivel', () => {
  const g = newGame(); eat(g, 5); g.nextLevel();       // score 5 al iniciar nivel 2
  eat(g, 1);                                           // score 6
  g.debugSetState({ snake: [P(19, 10)], dir: { x: 1, y: 0 } });
  assert.equal(g.step(), 'crashed');
  assert.equal(g.retry(), true);
  const s = g.getState();
  assert.deepEqual([s.status, s.level, s.score, s.foods], ['playing', 1, 5, 0]);
  assert.equal(g.retry(), false);                      // solo desde 'gameOver'
});

/* ---------- R13 · Pausa ---------- */
test('TC-19 [R13] en pausa no hay avance ni giros; al reanudar continúa', () => {
  const g = setup(newGame(), { snake: [P(10, 10)], dir: { x: 1, y: 0 } });
  assert.equal(g.togglePause(), 'paused');
  assert.equal(g.step(), 'ignored');
  assert.equal(g.turn(0, 1), false);
  assert.deepEqual(g.getState().snake, [P(10, 10)]);
  assert.equal(g.togglePause(), 'playing');
  assert.equal(g.step(), 'moved');
});

test('TC-19b [R13] togglePause no altera estados terminales ni inactivo', () => {
  const g = createGame({ rng: rngFrom(1) });
  assert.equal(g.togglePause(), 'idle');
  g.startGame(); g.debugSetState({ snake: [P(19, 10)] }); g.step();
  assert.equal(g.togglePause(), 'gameOver');
});

/* ---------- R14 · Mejor puntuación ---------- */
test('TC-20 [R14] la mejor puntuación solo aumenta y sobrevive a nuevas partidas', () => {
  const g = newGame(); eat(g, 3);
  assert.equal(g.getState().best, 3);
  g.startGame(); assert.deepEqual([g.getState().score, g.getState().best], [0, 3]);
  eat(g, 1); assert.equal(g.getState().best, 3);
  const h = newGame(1, 0, { best: 7 }); eat(h, 1);
  assert.equal(h.getState().best, 7);
});

/* ---------- Robustez ---------- */
test('TC-21 [R05] tras el fin de partida o sin iniciar, step se ignora y el estado no cambia', () => {
  const g = createGame({ rng: rngFrom(1) });
  assert.equal(g.step(), 'ignored');
  g.startGame(); g.debugSetState({ snake: [P(19, 10)] }); g.step();
  const antes = JSON.stringify(g.getState());
  assert.equal(g.step(), 'ignored');
  assert.equal(JSON.stringify(g.getState()), antes);
});

test('TC-22 [R10] misma semilla y mismas entradas producen el mismo estado (determinismo)', () => {
  const jugar = () => { const g = newGame(42, 8); for (let i = 0; i < 30; i++) { if (i % 7 === 3) g.turn(0, 1); if (i % 7 === 6) g.turn(1, 0); g.step(); } return JSON.stringify(g.getState()); };
  assert.equal(jugar(), jugar());
});

test('TC-23 [R01] reset deja el juego inactivo y vacío; getState devuelve copias', () => {
  const g = newGame();
  const s = g.getState(); s.snake.push(P(0, 0)); s.snake[0].x = 99;
  assert.deepEqual(g.getState().snake, [P(10, 10)]);
  g.reset();
  assert.deepEqual([g.getState().status, g.getState().snake.length], ['idle', 0]);
});

test('TC-24 [R01-R11] fuzz: invariantes del estado tras miles de pasos aleatorios', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const input = rngFrom(seed * 977);
    let g = newGame(seed, seed % 12), pasos = 0;
    while (pasos++ < 2000) {
      if (input() < 0.3) { const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(input() * 4)]; g.turn(d[0], d[1]); }
      const ev = g.step();
      if (ev === 'crashed') { g.startGame(Math.floor(input() * 12)); continue; }
      if (ev === 'levelComplete') { g.nextLevel(); continue; }
      if (ev === 'won') { g.startGame(Math.floor(input() * 12)); continue; }
      const s = g.getState(), body = cells(s.snake);
      assert.equal(body.size, s.snake.length, 'serpiente sin celdas repetidas');
      assert.equal(s.snake.length, 1 + s.foods, 'longitud = 1 + comidas del nivel');
      for (const p of s.snake) assert.ok(p.x >= 0 && p.y >= 0 && p.x < GRID && p.y < GRID);
      for (const o of s.obstacles) assert.ok(!body.has(o.x + ',' + o.y), 'serpiente sobre obstáculo');
      assert.ok(!s.food || !body.has(s.food.x + ',' + s.food.y), 'comida sobre la serpiente');
    }
  }
});
