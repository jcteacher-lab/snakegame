/* main.js — Interfaz: dibujo, entrada, temporizador y pantallas. La lógica vive en snake-core.js */
(function () {
  'use strict';

  const { createGame, LEVELS, GRID } = SnakeCore;
  const CELL = 20;

  /* === SKINS (añade los que quieras aquí) === */
  const SKINS = {
    Clásico: { bg: '#111',    grid: '#1a1a1a', snake: '#4ade80', head: '#22c55e', food: '#ef4444', wall: '#444' },
    Neón:    { bg: '#0b0b1f', grid: '#151530', snake: '#00e5ff', head: '#ff00e5', food: '#ffe600', wall: '#3a3a70' },
    Candy:   { bg: '#fff0f6', grid: '#ffe0ec', snake: '#ff6fb5', head: '#c026d3', food: '#38bdf8', wall: '#bbb' },
    Bosque:  { bg: '#1b2a1b', grid: '#243a24', snake: '#a3e635', head: '#65a30d', food: '#f97316', wall: '#3d5a3d' },
    Mono:    { bg: '#1a1a1a', grid: '#242424', snake: '#e5e5e5', head: '#ffffff', food: '#a3a3a3', wall: '#3a3a3a' }
  };

  const $ = id => document.getElementById(id);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* almacenamiento no disponible */ } }
  };

  const canvas = $('board'), ctx = canvas.getContext('2d');
  canvas.width = canvas.height = GRID * CELL;
  const screens = { menu: $('menu'), cfg: $('cfg'), pause: $('pause'), over: $('over') };

  const game = createGame({ best: Number(store.get('snake.best')) || 0 });
  let skinName = SKINS[store.get('snake.skin')] ? store.get('snake.skin') : 'Clásico';
  let timer = null, overAction = 'retry';

  /* Depuración: index.html?level=12 inicia directamente en ese nivel */
  const q = Number(new URLSearchParams(location.search).get('level'));
  const firstLevel = Number.isInteger(q) && q >= 1 && q <= LEVELS.length ? q - 1 : 0;

  /* === Pantallas === */
  function show(name) {
    for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
    if (name) screens[name].querySelector('button').focus();
  }
  const announce = msg => { $('status').textContent = msg; };

  /* === Temporizador (siempre a lo sumo uno activo) === */
  function stopTimer() { clearInterval(timer); timer = null; }
  function startTimer() { stopTimer(); timer = setInterval(tick, game.getState().speed); }

  function tick() {
    const ev = game.step();
    draw();
    const s = game.getState();
    if (ev === 'crashed') end('💀 GAME OVER', `Puntos: ${s.score}  ·  Mejor: ${s.best}`, 'retry');
    else if (ev === 'levelComplete') end(`✅ Nivel ${s.level + 1} completado`, `Puntos: ${s.score}`, 'next');
    else if (ev === 'won') end('🏆 ¡GANASTE!', `Completaste los ${s.levelCount} niveles · Puntos: ${s.score}`, 'win');
  }

  function end(title, text, action) {
    stopTimer();
    store.set('snake.best', game.getState().best);
    overAction = action;
    $('ovTitle').textContent = title;
    $('ovText').textContent = text;
    $('next').textContent = { next: 'Siguiente nivel', retry: 'Reintentar', win: 'Menú principal' }[action];
    show('over');
    announce(`${title}. ${text}`);
  }

  /* === Flujo del juego === */
  function begin() {
    game.startGame(firstLevel);
    resumeLoop();
    announce('Nivel ' + (game.getState().level + 1));
  }
  function resumeLoop() { show(null); startTimer(); draw(); }

  function goMenu() { stopTimer(); game.reset(); draw(); show('menu'); }

  function togglePause() {
    const status = game.togglePause();
    if (status === 'paused') { stopTimer(); draw(); show('pause'); announce('Pausa'); }
    else if (status === 'playing') { resumeLoop(); announce('Continuar'); }
  }

  /* === Dibujo === */
  function draw() {
    const skin = SKINS[skinName], s = game.getState(), size = GRID * CELL;
    ctx.fillStyle = skin.bg; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = skin.grid;
    for (let i = 1; i < GRID; i++) { ctx.fillRect(i * CELL, 0, 1, size); ctx.fillRect(0, i * CELL, size, 1); }
    ctx.fillStyle = skin.wall;
    s.obstacles.forEach(o => ctx.fillRect(o.x * CELL + 1, o.y * CELL + 1, CELL - 2, CELL - 2));
    if (s.food) { ctx.fillStyle = skin.food; ctx.fillRect(s.food.x * CELL + 3, s.food.y * CELL + 3, CELL - 6, CELL - 6); }
    s.snake.forEach((p, i) => {
      ctx.fillStyle = i ? skin.snake : skin.head;
      ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2);
    });
    if (s.status === 'playing' || s.status === 'paused') {
      ctx.fillStyle = skin.head; ctx.font = 'bold 14px system-ui';
      ctx.fillText(`Nv ${s.level + 1}/${s.levelCount}   ${s.score} pts   ${s.foods}/${s.target}`, 8, 20);
    }
  }

  /* === Entrada: teclado === */
  const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
                 w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };

  addEventListener('keydown', e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const status = game.getState().status;
    const onButton = e.target instanceof HTMLButtonElement;

    if (k === 'p' || (k === ' ' && !onButton)) {
      if (status === 'playing' || status === 'paused') { e.preventDefault(); togglePause(); }
      return;
    }
    const d = DIRS[k];
    if (d && status === 'playing') { e.preventDefault(); game.turn(d[0], d[1]); }
  });

  /* === Entrada: deslizar en pantallas táctiles === */
  let touch = null;
  canvas.addEventListener('touchstart', e => {
    const t = e.changedTouches[0]; touch = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  canvas.addEventListener('touchend', e => {
    if (!touch) return;
    const t = e.changedTouches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    touch = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) game.turn(Math.sign(dx), 0); else game.turn(0, Math.sign(dy));
  }, { passive: true });

  /* Pausa automática si se oculta la pestaña */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.getState().status === 'playing') togglePause();
  });

  /* === Botones === */
  $('play').onclick = begin;
  $('cfgBtn').onclick = () => show('cfg');
  $('back').onclick = () => show('menu');
  $('resume').onclick = togglePause;
  $('pauseMenu').onclick = goMenu;
  $('menuBtn').onclick = goMenu;
  $('next').onclick = () => {
    if (overAction === 'next') game.nextLevel();
    else if (overAction === 'retry') game.retry();
    else { goMenu(); return; }
    resumeLoop();
    announce('Nivel ' + (game.getState().level + 1));
  };

  /* Botones de skins generados desde SKINS */
  const skinsEl = $('skins');
  Object.keys(SKINS).forEach(name => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = name;
    b.setAttribute('aria-pressed', String(name === skinName));
    b.onclick = () => {
      skinName = name; store.set('snake.skin', name);
      [...skinsEl.children].forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      draw();
    };
    skinsEl.appendChild(b);
  });

  /* === Arranque === */
  $('menuInfo').textContent = `${LEVELS.length} niveles · skins`;
  draw();
})();
