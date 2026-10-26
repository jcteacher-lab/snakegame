/**
 * snake-core.js — Lógica pura del juego (sin DOM, sin temporizadores).
 * Funciona en navegador (global SnakeCore) y en Node (require), lo que permite
 * probarla de forma automatizada y determinista inyectando un generador `rng`.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SnakeCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const GRID = 20;                 // tablero GRID × GRID
  const TARGET = 5;                // comidas necesarias para pasar de nivel
  const OBSTACLES_PER_UNIT = 4;    // celdas de obstáculo por cada unidad de `obs`
  const SAFE_RADIUS = 3;           // zona libre alrededor del punto de inicio

  /** speed = ms por paso; obs = unidades de obstáculo */
  const LEVELS = Object.freeze([
    { speed: 150, obs: 0 }, { speed: 140, obs: 0 }, { speed: 130, obs: 1 }, { speed: 125, obs: 1 },
    { speed: 120, obs: 2 }, { speed: 115, obs: 2 }, { speed: 110, obs: 3 }, { speed: 105, obs: 3 },
    { speed: 100, obs: 4 }, { speed: 95, obs: 4 },  { speed: 90, obs: 5 },  { speed: 85, obs: 5 }
  ]);

  const keyOf = p => p.x + ',' + p.y;
  const copy = p => ({ x: p.x, y: p.y });

  function createGame(options = {}) {
    const rng = options.rng || Math.random;
    const size = options.size || GRID;
    const levels = options.levels || LEVELS;
    const target = options.target || TARGET;
    const spawn = { x: Math.floor(size / 2), y: Math.floor(size / 2) };

    const s = {
      status: 'idle',   // idle | playing | paused | levelComplete | gameOver | won
      level: 0, score: 0, levelStartScore: 0, foods: 0, best: options.best || 0,
      snake: [], dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 }, food: null, obstacles: []
    };

    const randInt = n => Math.min(n - 1, Math.floor(rng() * n));
    const inSafeZone = p => Math.abs(p.x - spawn.x) <= SAFE_RADIUS && Math.abs(p.y - spawn.y) <= SAFE_RADIUS;

    /** ¿Todas las celdas libres son alcanzables desde el inicio? (evita comida encerrada) */
    function allReachable(blocked) {
      const seen = new Set([keyOf(spawn)]);
      const queue = [spawn];
      while (queue.length) {
        const p = queue.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const q = { x: p.x + dx, y: p.y + dy };
          const k = keyOf(q);
          if (q.x < 0 || q.y < 0 || q.x >= size || q.y >= size || blocked.has(k) || seen.has(k)) continue;
          seen.add(k); queue.push(q);
        }
      }
      return seen.size === size * size - blocked.size;
    }

    function generateObstacles(count) {
      for (let attempt = 0; attempt < 50; attempt++) {
        const list = [], seen = new Set();
        let tries = 0;
        while (list.length < count && tries++ < 500) {
          const p = { x: randInt(size), y: randInt(size) };
          if (inSafeZone(p) || seen.has(keyOf(p))) continue;
          seen.add(keyOf(p)); list.push(p);
        }
        if (list.length === count && allReachable(seen)) return list;
      }
      return [];   // último recurso: nivel sin obstáculos (siempre jugable)
    }

    function placeFood() {
      const blocked = new Set(s.snake.concat(s.obstacles).map(keyOf));
      const free = [];
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!blocked.has(x + ',' + y)) free.push({ x, y });
      return free.length ? free[randInt(free.length)] : null;
    }

    function startLevel() {
      s.snake = [copy(spawn)];
      s.dir = { x: 1, y: 0 }; s.nextDir = { x: 1, y: 0 };
      s.foods = 0; s.levelStartScore = s.score;
      s.obstacles = generateObstacles(levels[s.level].obs * OBSTACLES_PER_UNIT);
      s.food = placeFood();
      s.status = 'playing';
    }

    return {
      /** Inicia una partida nueva desde `level` (0‑based, acotado al rango válido). */
      startGame(level = 0) {
        const n = Number.isInteger(level) ? level : 0;
        s.level = Math.max(0, Math.min(levels.length - 1, n));
        s.score = 0;
        startLevel();
      },
      reset() { Object.assign(s, { status: 'idle', snake: [], food: null, obstacles: [], foods: 0 }); },
      nextLevel() {
        if (s.status !== 'levelComplete') return false;
        s.level++; startLevel(); return true;
      },
      /** Reintenta el nivel actual restaurando el puntaje con el que se inició. */
      retry() {
        if (s.status !== 'gameOver') return false;
        s.score = s.levelStartScore; startLevel(); return true;
      },
      togglePause() {
        if (s.status === 'playing') s.status = 'paused';
        else if (s.status === 'paused') s.status = 'playing';
        return s.status;
      },
      /** Solicita un giro. Rechaza vectores no unitarios y la inversión de 180° respecto a la dirección actual. */
      turn(dx, dy) {
        if (s.status !== 'playing') return false;
        if (!Number.isInteger(dx) || !Number.isInteger(dy) || Math.abs(dx) + Math.abs(dy) !== 1) return false;
        if (dx === -s.dir.x && dy === -s.dir.y) return false;
        s.nextDir = { x: dx, y: dy };
        return true;
      },
      /** Avanza un tick. Devuelve: ignored | moved | ate | crashed | levelComplete | won */
      step() {
        if (s.status !== 'playing') return 'ignored';
        s.dir = s.nextDir;
        const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };
        const eats = !!s.food && head.x === s.food.x && head.y === s.food.y;
        const body = eats ? s.snake : s.snake.slice(0, -1);   // la cola se libera si no se come
        const crash = head.x < 0 || head.y < 0 || head.x >= size || head.y >= size ||
          s.obstacles.some(o => o.x === head.x && o.y === head.y) ||
          body.some(b => b.x === head.x && b.y === head.y);
        if (crash) { s.status = 'gameOver'; return 'crashed'; }

        s.snake.unshift(head);
        if (!eats) { s.snake.pop(); return 'moved'; }

        s.score++; s.foods++; s.best = Math.max(s.best, s.score);
        if (s.foods >= target) {
          s.status = s.level >= levels.length - 1 ? 'won' : 'levelComplete';
          return s.status;
        }
        s.food = placeFood();
        return 'ate';
      },
      /** Copia del estado (modificarla no afecta al juego). */
      getState() {
        return {
          status: s.status, level: s.level, score: s.score, foods: s.foods, best: s.best,
          target, levelCount: levels.length, speed: levels[s.level] ? levels[s.level].speed : 0,
          snake: s.snake.map(copy), dir: copy(s.dir), food: s.food && copy(s.food), obstacles: s.obstacles.map(copy)
        };
      },
      /** Solo para pruebas/depuración: fuerza partes del estado. */
      debugSetState(patch) {
        const p = JSON.parse(JSON.stringify(patch));
        if (p.dir && !p.nextDir) p.nextDir = { ...p.dir };
        Object.assign(s, p);
      }
    };
  }

  return { GRID, TARGET, OBSTACLES_PER_UNIT, SAFE_RADIUS, LEVELS, createGame };
});
