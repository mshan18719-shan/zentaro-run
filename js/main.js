// ══════════════════════════════════════════════════════════════
//  main.js  –  Entry point: scene router + game loop
//  PHASE 12 OPTIMIZATIONS:
//    • Object pooling for explosions (pre-allocated, recycled)
//    • Viewport culling for coins, stars, enemies, boxes
//    • Draw-call batching via single ctx.save/restore per frame
//    • Checkpoint save throttled (every 60 frames) to reduce JSON work
//    • Removed redundant per-frame camera.update mid-loop
//
//  LEVEL STRUCTURE:
//    Each level's map, platforms, coins, stars, enemies and boxes
//    live in their own file under world/levels/levelN.js.
//    To add a new level:
//      1. Create world/levels/levelN.js  (copy any existing file as template)
//      2. Add it to LEVEL_REGISTRY below
//      3. Done — main.js needs no other changes.
// ══════════════════════════════════════════════════════════════

import { canvas, ctx, width, height, dpr, resizeCanvas, getLogical } from "./core/canvas.js";
import { Player } from "./entities/player.js";
import { Coin, TreasureBox, Star } from "./entities/coin.js";
import { Camera } from "./system/camera.js";
import { drawMap } from "./world/map.js";
import { createClouds, drawClouds } from "./world/cloud.js";
import { drawBackground } from "./world/background.js";
import { updateWater, drawWater } from "./world/platform.js";
import { HUD } from "./UI/hud.js";
import { SoundManager } from "./system/sound.js";
import { saveLevelCheckpoint, loadLevelCheckpoint, completeLevel, clearLevelCheckpoint } from "./system/progress.js";
import { ExplosionManager } from "./entities/explosion.js";
import { setupTouchControls, drawTouchControls, resetVirtualKeys } from "./core/input.js";

import { SCENE, sceneState, MainMenuScene } from "./scene/scenes.js";
import { LevelSelectScene } from "./scene/levelSelectScene.js";

// ── Level registry — add new levels here only ─────────────────
import * as Level1 from "./world/levels/level1.js";
import * as Level2 from "./world/levels/level2.js";
import * as Level3 from "./world/levels/level3.js";
import * as Level4 from "./world/levels/level4.js";
import * as Level5 from "./world/levels/level5.js";
import * as Level6 from "./world/levels/level6.js";
import * as Level7 from "./world/levels/level7.js";

const LEVEL_REGISTRY = {
    1: Level1,
    2: Level2,
    3: Level3,
    4: Level4,
    5: Level5,
    6: Level6,
    7: Level7,
};
const MAX_LEVEL = Object.keys(LEVEL_REGISTRY).length;

// ═══════════════════════════════════════════════════════════════
//  Scene instances
// ═══════════════════════════════════════════════════════════════
const mainMenu = new MainMenuScene(canvas);
const levelSelect = new LevelSelectScene(canvas);

setupTouchControls(canvas, () => sceneState.current, SCENE.GAME_PLAYING);

// ═══════════════════════════════════════════════════════════════
//  Game world state
// ═══════════════════════════════════════════════════════════════
const TILE = 64;
let gameReady = false;

// ── Click debounce — prevents double-fire on desktop ──────────
let _lastClickTime = 0;
const CLICK_DEBOUNCE_MS = 300;

let map, clouds, player, camera, hud, coins, enemies, boxes, stars, explosions;
let bridges = [], bobs = [];

let _prevHealth = 3;
let _gameOverSoundPlayed = false;
let starsCollected = 0;

let CURRENT_LEVEL = 1;

// ── Door state (loaded from current level module) ─────────────
let DOOR_COL, DOOR_MID_ROW, DOOR_TOP_ROW;
let doorActivated = false;

// ── Fresh-start flag ──────────────────────────────────────────
let _startFresh = false;

// ── Checkpoint throttle ───────────────────────────────────────
let _checkpointTimer = 0;
const CHECKPOINT_INTERVAL = 60; // save once per second @ 60fps

// ══════════════════════════════════════════════════════════════
//  Viewport-culling helper
// ══════════════════════════════════════════════════════════════
const CULL_MARGIN = 128;
function inView(wx, wy, w, h) {
    return (
        wx + w > camera.x - CULL_MARGIN &&
        wx < camera.x + camera.viewW + CULL_MARGIN &&
        wy + h > camera.y - CULL_MARGIN &&
        wy < camera.y + camera.viewH + CULL_MARGIN
    );
}

// ──────────────────────────────────────────────────────────────
function initGame() {
    // ── Load the level module ─────────────────────────────────
    const level = LEVEL_REGISTRY[CURRENT_LEVEL] ?? LEVEL_REGISTRY[1];

    // ── Door position ─────────────────────────────────────────
    DOOR_COL     = level.DOOR.col;
    DOOR_MID_ROW = level.DOOR.midRow;
    DOOR_TOP_ROW = level.DOOR.topRow;

    // ── Map & world ───────────────────────────────────────────
    map    = level.createMap();
    clouds = createClouds(map[0].length, TILE);

    player     = new Player(map, TILE);
    camera     = new Camera(canvas, map, TILE);
    hud        = new HUD();
    explosions = new ExplosionManager();

    _prevHealth         = player.health;
    _gameOverSoundPlayed = false;
    starsCollected      = 0;
    doorActivated       = false;
    _checkpointTimer    = 0;

    // ── Entities (coins, boxes, stars, enemies) from level file ──
    ({ coins, boxes, stars, enemies } = level.createLevelEntities(map, TILE, player));
    player.setExtraSolids(boxes);

    // ── Moving platforms & hazards ────────────────────────────
    const { bridges: b, bobs: m } = level.createLevelPlatforms(TILE);
    bridges = b;
    bobs    = m;

    const extraSolidsArr = [...boxes, ...bridges];
    player.setExtraSolids(extraSolidsArr);
    for (let i = 0; i < enemies.length; i++) {
        if (typeof enemies[i].setExtraSolids === "function")
            enemies[i].setExtraSolids(extraSolidsArr);
    }

    // ── HUD callbacks ─────────────────────────────────────────
    hud.onRestart   = () => { _lastClickTime = Date.now(); _resetGameWorld();  SoundManager.resumeMusic(); };
    hud.onMenu      = () => { _lastClickTime = Date.now(); _fullHudReset();    SoundManager.pauseMusic();  sceneState.goto(SCENE.LEVEL_SELECT); };
    hud.onMainMenu  = () => { _lastClickTime = Date.now(); _resetGameWorld();  SoundManager.stopMusic();   sceneState.goto(SCENE.MAIN_MENU); };
    hud.onNextLevel = () => {
        const nextLevel = CURRENT_LEVEL + 1;
        if (nextLevel <= MAX_LEVEL) {
            CURRENT_LEVEL = nextLevel;
            gameReady    = false;
            _startFresh  = true;
            _fullHudReset();
            SoundManager.resumeMusic();
        } else {
            _fullHudReset();
            SoundManager.pauseMusic();
            sceneState.goto(SCENE.LEVEL_SELECT);
        }
    };

    // ── Checkpoint restore ────────────────────────────────────
    if (_startFresh) {
        _startFresh = false;
        clearLevelCheckpoint(CURRENT_LEVEL);
        gameReady = true;
        return;
    }

    const saved = loadLevelCheckpoint(CURRENT_LEVEL);
    if (saved && saved.checkpoint) {
        player.score  = saved.checkpoint.score  ?? 0;
        player.health = saved.checkpoint.health ?? 3;
        player.x      = saved.checkpoint.x      ?? 100;
        if ((saved.checkpoint.y ?? 0) > 0) player.y = saved.checkpoint.y;

        starsCollected = saved.checkpoint.starsCollected ?? 0;
        doorActivated  = !!saved.checkpoint.doorActivated;

        if (Array.isArray(saved.world?.coins))
            coins.forEach((c, i) => { c.collected = !!saved.world.coins[i]; });
        if (Array.isArray(saved.world?.stars))
            stars.forEach((s, i) => { s.collected = !!saved.world.stars[i]; });
        if (Array.isArray(saved.world?.boxes)) {
            boxes.forEach((b, i) => {
                const d = saved.world.boxes[i];
                if (!d) return;
                b.hitsLeft  = typeof d.hitsLeft === "number" ? d.hitsLeft : TreasureBox.MAX_HITS;
                b.exhausted = !!d.exhausted;
            });
        }
        if (doorActivated) {
            map[DOOR_MID_ROW][DOOR_COL] = 20;
            map[DOOR_TOP_ROW][DOOR_COL] = 19;
        }
    }

    gameReady = true;
}

// ──────────────────────────────────────────────────────────────
function _resetGameWorld() {
    clearLevelCheckpoint(CURRENT_LEVEL);
    gameReady   = false;
    _startFresh = true;
    _fullHudReset();
    resetVirtualKeys();
    initGame();
}

// ──────────────────────────────────────────────────────────────
function _fullHudReset() {
    if (!hud) return;
    hud.paused             = false;
    hud.panelSlide         = 0;
    hud.panelAnimDir       = 0;
    hud.gameOver           = false;
    hud.gameOverSlide      = 0;
    hud.gameOverAnimDir    = 0;
    hud.levelCleared       = false;
    hud.levelClearedSlide  = 0;
    hud.levelClearedAnimDir = 0;
    resetVirtualKeys();
}

// ── Door overlap check ────────────────────────────────────────
function _playerAtDoor() {
    const playerRight  = player.x + player.width;
    const playerBottom = player.y + player.height;
    const doorLeft     = DOOR_COL     * TILE;
    const doorTop      = DOOR_TOP_ROW * TILE;
    const doorBot      = (DOOR_MID_ROW + 1) * TILE;
    return (
        playerRight >= doorLeft  &&
        player.x    <  doorLeft  &&
        playerBottom >= doorTop  &&
        player.y    <= doorBot
    );
}

// ═══════════════════════════════════════════════════════════════
//  Click routing
// ═══════════════════════════════════════════════════════════════
canvas.addEventListener("click", e => {
    const now = Date.now();
    if (now - _lastClickTime < CLICK_DEBOUNCE_MS) return;
    _lastClickTime = now;

    const rect = canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;

    const activeScene = sceneState.current;

    switch (activeScene) {
        case SCENE.MAIN_MENU: {
            mainMenu.handleClick(mx, my);
            if (sceneState.current === SCENE.LEVEL_SELECT)
                SoundManager.startMusic();
            break;
        }
        case SCENE.LEVEL_SELECT:
            levelSelect.handleClick(mx, my);
            if (sceneState.current === SCENE.GAME_PLAYING) {
                const chosen = typeof sceneState.selectedLevel === "number"
                    ? sceneState.selectedLevel
                    : (typeof levelSelect.selectedLevel === "number" ? levelSelect.selectedLevel : 1);
                CURRENT_LEVEL = chosen;
                gameReady     = false;
                _startFresh   = true;
                initGame();
                SoundManager.resumeMusic();
            }
            break;

        case SCENE.GAME_PLAYING:
            if (hud) {
                const hudScale = camera ? camera.scale : 1;
                const action   = hud.handleClick(mx / hudScale, my / hudScale);
                if (action === "sound") SoundManager.setMuted(!hud.soundOn);
                if (action === "pause") hud.paused ? SoundManager.pauseMusic() : SoundManager.resumeMusic();
                if (action === "play")  SoundManager.resumeMusic();
            }
            break;
    }
});

// ═══════════════════════════════════════════════════════════════
//  Game loop
// ═══════════════════════════════════════════════════════════════
function loop(ts) {
    requestAnimationFrame(loop);

    const { w: vw, h: vh } = getLogical();
    ctx.clearRect(0, 0, vw, vh);

    switch (sceneState.current) {

        case SCENE.MAIN_MENU:
            mainMenu.update(vw, vh);
            mainMenu.draw(ctx, vw, vh);
            break;

        case SCENE.LEVEL_SELECT:
            levelSelect.update();
            levelSelect.draw(ctx, vw, vh);
            break;

        case SCENE.GAME_PLAYING: {
            if (!gameReady) initGame();

            const scale = camera ? camera.scale : 1;
            const worldFrozen = hud.gameOver && !player.sinking;

            if (!hud.paused) {
                player.update();
                camera.update(player);
                for (const cloud of clouds) cloud.update(camera.x, camera.viewW);
                updateWater();

                if (!worldFrozen) {
                    // ── Moving bridges ───────────────────────────────────
                    for (let i = 0; i < bridges.length; i++) {
                        bridges[i].update();
                        bridges[i].carryPlayer(player);
                        for (let j = 0; j < enemies.length; j++) {
                            if (!enemies[j].dead) bridges[i].carryPlayer(enemies[j]);
                        }
                    }

                    // ── Metal bobs ───────────────────────────────────────
                    for (let i = 0; i < bobs.length; i++) {
                        bobs[i].update();
                        if (!player.dead && bobs[i].overlaps(player)) {
                            player.hit(1);
                            SoundManager.play("damage");
                        }
                    }

                    // ── Enemies ──────────────────────────────────────────
                    for (let i = 0; i < enemies.length; i++) {
                        const enemy = enemies[i];
                        if (!enemy.activated && inView(enemy.x, enemy.y, enemy.width, enemy.height)) {
                            enemy.activated = true;
                        }
                        enemy.update();

                        if (!enemy.dead && enemy.overlaps(player)) {
                            if (player.velY > 0 &&
                                player.y + player.height < enemy.y + enemy.height * 0.6) {
                                enemy.dead = true;
                                player.velY = -12;
                                player.score += 100;
                                SoundManager.play("stomp");
                                explosions.spawn(
                                    enemy.x + enemy.width / 2,
                                    enemy.y + enemy.height / 2
                                );
                            } else {
                                player.hit(1);
                            }
                        }
                    }

                    // ── Explosions ───────────────────────────────────────
                    explosions.update();

                    // ── Coins ────────────────────────────────────────────
                    for (let i = 0; i < coins.length; i++) {
                        const coin = coins[i];
                        if (coin.collected) continue;
                        if (inView(coin.x, coin.y, coin.renderW, coin.renderH)) {
                            coin.update();
                            if (coin.overlaps(player)) {
                                coin.collected = true;
                                player.score  += 30;
                                SoundManager.play("coin");
                            }
                        }
                    }

                    // ── Treasure Boxes ───────────────────────────────────
                    for (let i = 0; i < boxes.length; i++) {
                        const hit = boxes[i].update(player);
                        if (hit) SoundManager.play("coin");
                    }

                    // ── Stars ────────────────────────────────────────────
                    for (let i = 0; i < stars.length; i++) {
                        const star = stars[i];
                        if (star.collected) continue;
                        if (inView(star.x, star.y, 50, 50)) {
                            star.update();
                            if (star.overlaps(player)) {
                                star.collected = true;
                                starsCollected++;
                                player.score += 200;
                                SoundManager.play("star");
                            }
                        }
                    }

                    // ── Door / Level Clear ────────────────────────────────
                    if (!doorActivated && !player.dead && _playerAtDoor()) {
                        doorActivated = true;
                        map[DOOR_MID_ROW][DOOR_COL] = 20;
                        map[DOOR_TOP_ROW][DOOR_COL] = 19;
                        SoundManager.play("win");
                        SoundManager.pauseMusic();
                        hud.showLevelCleared(player.score, starsCollected, stars.length);
                        completeLevel(CURRENT_LEVEL, player.score, starsCollected);
                    }
                } // end !worldFrozen

                // ── Health change detection ────────────────────────────
                if (player.health < _prevHealth) {
                    if (player.health <= 0) {
                        if (!_gameOverSoundPlayed) {
                            _gameOverSoundPlayed = true;
                            SoundManager.pauseMusic();
                            SoundManager.play("die");
                            setTimeout(() => SoundManager.play("lose"), 900);
                        }
                    } else {
                        SoundManager.play("damage");
                    }
                }
                _prevHealth = player.health;

                // ── Throttled checkpoint save ──────────────────────────
                if (!worldFrozen) {
                    _checkpointTimer++;
                    if (_checkpointTimer >= CHECKPOINT_INTERVAL) {
                        _checkpointTimer = 0;
                        saveLevelCheckpoint(CURRENT_LEVEL, {
                            score:          player.score,
                            health:         player.health,
                            x:              player.x,
                            y:              player.y,
                            starsCollected,
                            doorActivated,
                            coins: coins.map(c => c.collected),
                            stars: stars.map(s => s.collected),
                            boxes: boxes.map(b => ({ hitsLeft: b.hitsLeft, exhausted: b.exhausted })),
                        });
                    }
                }
            } // end !hud.paused

            // ── Draw ──────────────────────────────────────────────────
            ctx.save();
            ctx.scale(scale, scale);

            drawBackground(ctx, camera);
            drawClouds(ctx, clouds, camera.x);
            drawMap(ctx, map, TILE, camera);
            drawWater(ctx, map, TILE, camera);

            for (let i = 0; i < boxes.length; i++) boxes[i].draw(ctx, camera);

            ctx.imageSmoothingEnabled = false;

            for (let i = 0; i < bridges.length; i++) {
                if (inView(bridges[i].x, bridges[i].y, bridges[i].width, bridges[i].height))
                    bridges[i].draw(ctx, camera);
            }
            for (let i = 0; i < bobs.length; i++) {
                if (inView(bobs[i].x, bobs[i].y, bobs[i].width, bobs[i].height))
                    bobs[i].draw(ctx, camera);
            }

            for (let i = 0; i < coins.length; i++) {
                const c = coins[i];
                if (!c.collected && inView(c.x, c.y, c.renderW, c.renderH))
                    c.draw(ctx, camera);
            }
            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                if (!s.collected && inView(s.x, s.y, 50, 50))
                    s.draw(ctx, camera);
            }
            for (let i = 0; i < enemies.length; i++) {
                const e = enemies[i];
                if (!e.dead && inView(e.x, e.y, e.width + 64, e.height + 64))
                    e.draw(ctx, camera);
            }

            explosions.draw(ctx, camera);
            player.draw(ctx, camera);

            ctx.imageSmoothingEnabled = true;

            const svw = vw / scale;
            const svh = vh / scale;
            hud.draw(ctx, svw, svh, player.score, player.health);

            ctx.restore();

            drawTouchControls(ctx, vw, vh);
            break;
        }
    }
}

requestAnimationFrame(loop);
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// ── Public exports ────────────────────────────────────────────
export function getStarsCollected() { return starsCollected; }
export function getTotalStars()     { return stars ? stars.length : 3; }