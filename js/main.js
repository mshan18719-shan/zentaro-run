// ══════════════════════════════════════════════════════════════
//  main.js  –  Entry point: scene router + game loop
//  PHASE 12 OPTIMIZATIONS:
//    • Object pooling for explosions (pre-allocated, recycled)
//    • Viewport culling for coins, stars, enemies, boxes
//    • Draw-call batching via single ctx.save/restore per frame
//    • Checkpoint save throttled (every 60 frames) to reduce JSON work
//    • Removed redundant per-frame camera.update mid-loop
// ══════════════════════════════════════════════════════════════

import { canvas, ctx, width, height, dpr, resizeCanvas, getLogical } from "./core/canvas.js";
import { Player } from "./entities/player.js";
import { FlyEnemy, WalkerEnemy, JumperEnemy, PatrolEnemy } from "./entities/enemy.js";
import { Coin, TreasureBox, Star } from "./entities/coin.js";
import { Camera } from "./system/camera.js";
import { createMap, createMap2, createMap3, drawMap } from "./world/map.js";
import { createClouds, drawClouds } from "./world/cloud.js";
import { drawBackground } from "./world/background.js";
import { updateWater, drawWater, MovingBridge, MetalBob, createPlatformsLevel1, createPlatformsLevel2, createPlatformsLevel3,} from "./world/platform.js";
import { HUD } from "./UI/hud.js";
import { SoundManager } from "./system/sound.js";
import { saveLevelCheckpoint, loadLevelCheckpoint, completeLevel, clearLevelCheckpoint } from "./system/progress.js";
import { ExplosionManager } from "./entities/explosion.js";
import { setupTouchControls, drawTouchControls, resetVirtualKeys } from "./core/input.js";

import { SCENE, sceneState, MainMenuScene } from "./scene/scenes.js";
import { LevelSelectScene } from "./scene/levelSelectScene.js";

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

// ── Click debounce (Phase 13) — prevents double-fire on desktop ──
// touchend + click both fire on desktop; stamp time to skip duplicates.
let _lastClickTime = 0;
const CLICK_DEBOUNCE_MS = 300;
let map, clouds, player, camera, hud, coins, enemies, boxes, stars, explosions;
let bridges = [], bobs = [];   // moving platforms & hazards

let _prevHealth = 3;
let _gameOverSoundPlayed = false;
let starsCollected = 0;

let CURRENT_LEVEL = 1;

// ── Per-level door positions (col, midRow, topRow) ────────────
const LEVEL_DOOR = {
    1: { col: 138, midRow: 13, topRow: 12 },
    2: { col: 147, midRow: 13, topRow: 12 },
    3: { col: 147, midRow: 13, topRow: 12 },
};
// ── Door state (set per level in initGame) ────────────────────
let DOOR_COL, DOOR_MID_ROW, DOOR_TOP_ROW;
let doorActivated  = false;

// ── Fresh-start flag ──────────────────────────────────────────
let _startFresh = false;

// ── Checkpoint throttle (Phase 12: avoid serialising every frame) ─
let _checkpointTimer = 0;
const CHECKPOINT_INTERVAL = 60; // save once per second @ 60fps

// ══════════════════════════════════════════════════════════════
//  Viewport-culling helper
//  Returns true when the world-space rect [wx, wy, w, h] is
//  visible in the current camera view (with a small margin).
// ══════════════════════════════════════════════════════════════
const CULL_MARGIN = 128; // extra pixels so sprites don't pop
function inView(wx, wy, w, h) {
    return (
        wx + w  > camera.x - CULL_MARGIN &&
        wx       < camera.x + camera.viewW + CULL_MARGIN &&
        wy + h  > camera.y - CULL_MARGIN &&
        wy       < camera.y + camera.viewH + CULL_MARGIN
    );
}

// ──────────────────────────────────────────────────────────────
function initGame() {
    // ── Set door position for this level ─────────────────────
    const doorCfg  = LEVEL_DOOR[CURRENT_LEVEL] || LEVEL_DOOR[1];
    DOOR_COL     = doorCfg.col;
    DOOR_MID_ROW = doorCfg.midRow;
    DOOR_TOP_ROW = doorCfg.topRow;

    // ── Choose map factory ────────────────────────────────────
    const mapFactory = CURRENT_LEVEL === 3 ? createMap3
                     : CURRENT_LEVEL === 2 ? createMap2
                     : createMap;
    map    = mapFactory();
    clouds = createClouds(map[0].length, TILE);

    player     = new Player(map, TILE);
    camera     = new Camera(canvas, map, TILE);
    hud        = new HUD();
    explosions = new ExplosionManager();

    _prevHealth          = player.health;
    _gameOverSoundPlayed = false;
    starsCollected       = 0;
    doorActivated        = false;
    _checkpointTimer     = 0;

    // ── Level entities ────────────────────────────────────────
    if (CURRENT_LEVEL === 2) {
        // ── Level 2 Coins ──────────────────────────────────────
        const coinDefs = [
            { col:  12, row: 12 }, { col:  13, row: 12 }, { col:  14, row: 12 },
            { col:  24, row: 4 }, { col:  25, row: 4 }, { col:  26, row: 4 }, { col:  27, row: 4 },
            { col: 24, row: 8 }, { col: 24, row: 9 }, { col: 24, row: 10 },
            { col: 27, row: 8 }, { col: 27, row: 9 }, { col: 27, row: 10 },
            { col: 33, row: 3 }, { col: 33, row: 4 },
            { col: 47, row:  7 }, { col: 48, row:  8 }, { col: 49, row:  9 }, { col: 50, row:  10 },
            { col: 108, row:  2 }, { col: 109, row:  2 }, { col: 110, row:  2 }, { col: 111, row:  2 },
            { col: 126, row:  3 }, { col: 126, row:  4 }, { col: 126, row:  5 },
            { col: 133, row:  3 }, { col: 133, row:  4 }, { col: 133, row:  5 },
            { col: 53, row:  10 }, { col: 54, row:  9 },
        ];
        coins = coinDefs.map(({ col, row }) =>
            new Coin(col * TILE + (TILE - 28) / 2, row * TILE - 32)
        );

        boxes = [
            new TreasureBox(19, 9, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(20, 9, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(21, 9, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(62, 5, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(68, 5, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(87, 9, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(89, 9, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(91, 9, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(93, 9, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(95, 9, TILE, (pts) => { player.score += pts; }),

            new TreasureBox(88, 4, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(90, 4, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(92, 4, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(94, 4, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(96, 4, TILE, (pts) => { player.score += pts; }),
        ];
        player.setExtraSolids(boxes);

        stars = [
            new Star(26 * TILE, 9 * TILE - 64),
            new Star(76 * TILE, 2 * TILE - 64),
            new Star(115 * TILE - 10, 10 * TILE - 64),
        ];

        const groundY = (map.length - 1) * TILE;
        enemies = [
            new FlyEnemy(25 * TILE,  7 * TILE, map, TILE, { speed: 2.2, floatAmplitude: 28, floatSpeed: 0.04 }),
            new FlyEnemy(55 * TILE,  5 * TILE, map, TILE, { speed: 2.5, floatAmplitude: 28, floatSpeed: 0.09 }),
            new FlyEnemy(80 * TILE,  8 * TILE, map, TILE, { speed: 2,   floatAmplitude: 28, floatSpeed: 0.04 }),
            new FlyEnemy(100 * TILE,  11 * TILE, map, TILE, { speed: 2,   floatAmplitude: 28, floatSpeed: 0.04 }),
            new FlyEnemy(130 * TILE,  6 * TILE, map, TILE, { speed: 2,   floatAmplitude: 28, floatSpeed: 0.07 }),

            new WalkerEnemy(27 * TILE, 12 * TILE, map, TILE, { speed: 2,   dir:  1 }),
            // new WalkerEnemy(42 * TILE, groundY, map, TILE, { speed: 2,   dir: -1 }),
            // new WalkerEnemy(85 * TILE, groundY, map, TILE, { speed: 2.2, dir: -1 }),

            new JumperEnemy(18 * TILE, groundY, map, TILE, { jumpForce: -17, jumpInterval: 100 }),
            new JumperEnemy(43 * TILE, TILE * 10, map, TILE, { jumpForce: -14, jumpInterval: 100 }),
            new JumperEnemy(60 * TILE, TILE * 10, map, TILE, { jumpForce: -13, jumpInterval: 70 }),
            new JumperEnemy(66 * TILE, TILE * 10, map, TILE, { jumpForce: -13, jumpInterval: 50 }),
            new JumperEnemy(70 * TILE, TILE * 10, map, TILE, { jumpForce: -13, jumpInterval: 35 }),
            new JumperEnemy(99 * TILE, groundY, map, TILE, { jumpForce: -22, jumpInterval: 35 }),

            new PatrolEnemy(16 * TILE, 8 * TILE,  map, TILE, { speed: 2.5, patrolLeft: 12*TILE, patrolRight: 22*TILE }),
            new PatrolEnemy(32 * TILE, 8 * TILE,  map, TILE, { speed: 2.8, patrolLeft: 30*TILE, patrolRight: 33*TILE }),
            new PatrolEnemy(35* TILE, groundY, map, TILE, { speed: 3.5, patrolLeft: 28*TILE, patrolRight: 41*TILE }),
            new PatrolEnemy(54* TILE, groundY, map, TILE, { speed: 4,   patrolLeft:51*TILE, patrolRight:57*TILE }),
            new PatrolEnemy(87* TILE, 3 * TILE, map, TILE, { speed: 4.5,   patrolLeft:87*TILE, patrolRight:97*TILE }),
            new PatrolEnemy(86* TILE, 7 * TILE, map, TILE, { speed: 3.5,   patrolLeft:86*TILE, patrolRight:96*TILE }),
            new PatrolEnemy(96* TILE, 7 * TILE,   map, TILE, { speed: 3.5,   patrolLeft:86*TILE, patrolRight:96*TILE }),
            new PatrolEnemy(85* TILE, 7 * TILE,   map, TILE, { speed: 4,   patrolLeft:85*TILE, patrolRight:102*TILE }),
            new PatrolEnemy(102* TILE, 7 * TILE,   map, TILE, { speed: 4,   patrolLeft:85*TILE, patrolRight:102*TILE }),
            new PatrolEnemy(102* TILE, 2 * TILE,   map, TILE, { speed: 4.5,   patrolLeft:102*TILE, patrolRight:116*TILE }),
            new PatrolEnemy(116* TILE, 2 * TILE,   map, TILE, { speed: 4.5,   patrolLeft:102*TILE, patrolRight:116*TILE }),
            new PatrolEnemy(123* TILE, 2 * TILE,   map, TILE, { speed: 4.5,   patrolLeft:123*TILE, patrolRight:137*TILE }),
        ];

    } else if (CURRENT_LEVEL === 3) {
        // ── Level 3 Coins — scattered across all 7 zones ───────
        const coinDefs = [
            // Zone 1 — spike minefield
            { col: 9, row:  5 },
            { col:  13, row:  11 }, { col:  14, row:  11 }, { col:  15, row:  11 },
            { col: 34, row:  2 }, { col: 36, row:  2 },
            { col: 34, row:  9 }, { col: 34, row:  11 },
            // Zone 2 — void gaps
            { col: 45, row: 6 }, { col: 47, row: 6 }, { col: 51, row: 7 }, { col: 53, row: 6 },
            { col: 59, row:  9 }, { col: 59, row:  11 },
            { col: 60, row:  8 }, { col: 60, row:  10 },
            // Zone 3 — river stepping stones
            { col: 63, row:  2 }, { col: 73, row:  3 },
            { col: 65, row: 9 }, { col: 65, row:  11 }, { col: 65, row: 13 },
            { col: 71, row: 9 }, { col: 71, row:  11 }, { col: 71, row:  13 },
            { col:76, row:  9 }, { col:76, row:  11 }, { col:76, row: 13 },
            { col:78, row:  10 }, { col:78, row:  12 },
            // Zone 4 — tower tops
            { col: 87, row:  3 }, { col: 89, row:  3 },
            // Zone 5 — black-hole valley pillars
            { col:95, row:  9 }, { col:97, row:  9 }, { col:99, row:  9 },
            { col:107, row:  9 }, { col:109, row:  9 }, { col:111, row:  9 },
            // Zone 7 — final descent
            { col:119, row: 10 }, { col:121, row:  9 }, { col:123, row: 10 },
            { col:135, row: 9 }, { col:135, row: 4 },
        ];
        coins = coinDefs.map(({ col, row }) =>
            new Coin(col * TILE + (TILE - 28) / 2, row * TILE - 32)
        );

        // Treasure boxes — placed on/above fortress platform and black-hole pillars
        boxes = [
            // Zone 5 black-hole valley — reward hovering above pillar 2 & 3
            new TreasureBox( 86,  8, TILE, (pts) => { player.score += pts; }),
            new TreasureBox( 87,  8, TILE, (pts) => { player.score += pts; }),
            new TreasureBox( 88,  8, TILE, (pts) => { player.score += pts; }),
            new TreasureBox( 89,  8, TILE, (pts) => { player.score += pts; }),
            new TreasureBox( 90,  8, TILE, (pts) => { player.score += pts; }),
            // Zone 6 fortress — reward above each spike cluster
            new TreasureBox(129, 13, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(130, 13, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(130, 12, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(131, 13, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(131, 12, TILE, (pts) => { player.score += pts; }),

            new TreasureBox(140, 13, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(140, 12, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(141, 13, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(141, 12, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(142, 13, TILE, (pts) => { player.score += pts; }),
        ];
        player.setExtraSolids(boxes);

        // Stars — one in each brutal section
        stars = [
            new Star(25 * TILE, 3 * TILE - 64),   // Zone 2 mid-platform
            new Star(68 * TILE, 10 * TILE - 64),   // Zone 5 first safe pillar
            new Star(136 * TILE - 10,  13 * TILE - 64),   // Zone 6 fortress mid
        ];

        const groundY = (map.length - 1) * TILE;
        enemies = [
            // ── FlyEnemies — fast, float over hazards ──────────
            // Z1: patrols low over spike field
            new FlyEnemy(  8 * TILE, 11 * TILE, map, TILE, { speed: 2.8, floatAmplitude: 24, floatSpeed: 0.055 }),
            // Z2: patrols over the double gap — must time jump AND duck
            new FlyEnemy( 24 * TILE, 10 * TILE, map, TILE, { speed: 3.0, floatAmplitude: 28, floatSpeed: 0.060 }),
            // Z3: river — forces precise stone hops
            new FlyEnemy( 47 * TILE,  8 * TILE, map, TILE, { speed: 3.2, floatAmplitude: 30, floatSpeed: 0.065 }),
            // Z4: tower tops — hunts player on tight platforms
            new FlyEnemy( 63 * TILE,  2 * TILE, map, TILE, { speed: 3.0, floatAmplitude: 22, floatSpeed: 0.060 }),
            // Z6: fortress — fast wide sweep
            new FlyEnemy(115 * TILE,  5 * TILE, map, TILE, { speed: 3.5, floatAmplitude: 26, floatSpeed: 0.070 }),

            // ── WalkerEnemies — slow grind pressure ────────────
            new WalkerEnemy( 19 * TILE, groundY, map, TILE, { speed: 2.5, dir: -1 }),
            new WalkerEnemy(112 * TILE, 13 * TILE, map, TILE, { speed: 4.0, dir: -1 }),

            // ── JumperEnemies — vertical surprise ──────────────
            new JumperEnemy( 13 * TILE, groundY,     map, TILE, { jumpForce: -20, jumpInterval:  25 }),
            // Z3: near bank pre-river
            new JumperEnemy( 34 * TILE, groundY,     map, TILE, { jumpForce: -20, jumpInterval:  25 }),
            new JumperEnemy( 47 * TILE, 10 * TILE,     map, TILE, { jumpForce: -16, jumpInterval:  25 }),
            new JumperEnemy( 53 * TILE, 10* TILE,     map, TILE, { jumpForce: -16, jumpInterval:  35 }),
            // Z5: on safe pillar 4 — jumps at player crossing black hole
            new JumperEnemy( 61 * TILE, 2 * TILE,     map, TILE, { jumpForce: -11, jumpInterval:  25 }),
            new JumperEnemy( 79 * TILE, groundY,     map, TILE, { jumpForce: -17, jumpInterval:  45 }),
            new JumperEnemy( 93 * TILE,  8 * TILE,   map, TILE, { jumpForce: -17, jumpInterval: 90 }),
            new JumperEnemy( 112 * TILE,  8 * TILE,   map, TILE, { jumpForce: -17, jumpInterval: 90 }),
            // Z7: over water pit
            new JumperEnemy(126 * TILE,  groundY,     map, TILE, { jumpForce: -16, jumpInterval:  85 }),
            new JumperEnemy(141 * TILE, 11 * TILE,     map, TILE, { jumpForce: -13, jumpInterval:  90 }),

            // ── PatrolEnemies — tight corridor enforcers ────────
            new PatrolEnemy( 15 * TILE, groundY, map, TILE, { speed: 3.5, patrolLeft: 10*TILE, patrolRight: 19*TILE }),
            new PatrolEnemy( 24 * TILE, 7 * TILE, map, TILE, { speed: 3.5, patrolLeft: 24*TILE, patrolRight: 27*TILE }),
            // Z2: patrols the mid-platform between gaps
            new PatrolEnemy( 34 * TILE, 2 * TILE, map, TILE, { speed: 3.5, patrolLeft: 32*TILE, patrolRight: 38*TILE }),
            // Z4: tower 1 roof — only 5 tiles wide
            new PatrolEnemy( 60 * TILE, 3 * TILE, map, TILE, { speed: 3.5, patrolLeft: 58*TILE, patrolRight: 63*TILE }),
            new PatrolEnemy( 74 * TILE, 3 * TILE, map, TILE, { speed: 4.5, patrolLeft: 72*TILE, patrolRight: 77*TILE }),
            new PatrolEnemy( 73 * TILE, groundY, map, TILE, { speed: 10, patrolLeft: 65*TILE, patrolRight: 76*TILE }),
            // Z4: tower 2 roof — same tight patrol
            new PatrolEnemy( 88 * TILE,  7 * TILE, map, TILE, { speed: 4.5, patrolLeft: 86*TILE, patrolRight: 90*TILE }),
            new PatrolEnemy( 88 * TILE,  5 * TILE, map, TILE, { speed: 4.5, patrolLeft: 80*TILE, patrolRight: 97*TILE }),
            new PatrolEnemy( 100 * TILE,  5 * TILE, map, TILE, { speed: 4.5, patrolLeft: 95*TILE, patrolRight: 111*TILE }),
            // Z6: fortress full-width sweep — 24 tiles, relentless
            new PatrolEnemy(123 * TILE,  7 * TILE, map, TILE, { speed: 5, patrolLeft:117*TILE, patrolRight:129*TILE }),
        ];

    } else {
        // ── Level 1 Coins (original + extended section) ────────
        const coinDefs = [
        { col: 15, row: 12 }, { col: 16, row: 12 }, { col: 17, row: 12 },
        { col: 34, row: 12 }, { col: 35, row: 12 }, { col: 36, row: 12 },
        { col: 44, row: 12 }, { col: 45, row: 12 }, { col: 46, row: 12 },
        { col: 51, row: 12 }, { col: 52, row: 12 },
        { col: 47, row:  7 }, { col: 49, row:  7 }, { col: 51, row:  7 },
        { col: 53, row:  7 }, { col: 55, row:  7 },
        { col: 62, row: 12 }, { col: 63, row: 12 }, { col: 64, row: 12 },
        { col: 65, row: 12 }, { col: 73, row: 12 }, { col: 74, row: 12 },
        { col: 75, row: 12 }, { col: 76, row: 12 },
        { col: 21, row:  7 }, { col: 22, row:  7 }, { col: 23, row:  7 },
        { col: 31, row:  5 }, { col: 32, row:  5 }, { col: 33, row:  5 },
        { col: 83, row: 10 }, { col: 84, row: 10 }, { col: 85, row: 10 },
        { col: 86, row: 10 },
        { col: 65, row:  5 }, { col: 66, row:  5 },
        { col: 64, row:  6 }, { col: 65, row:  6 }, { col: 66, row:  6 },
        { col: 67, row:  6 }, { col: 74, row:  5 }, { col: 75, row:  5 },
        { col: 73, row:  6 }, { col: 74, row:  6 }, { col: 75, row:  6 },
        { col: 76, row:  6 }, { col: 90, row: 12 }, { col: 91, row: 12 },
        // Extended section coins
        { col:102, row: 10 }, { col:103, row: 10 },
        { col:109, row:  8 }, { col:110, row:  8 },
        { col:114, row:  6 }, { col:115, row:  6 },
        { col:122, row: 12 }, { col:123, row: 12 }, { col:124, row: 12 },
        { col:129, row:  4 }, { col:130, row:  4 }, { col:131, row:  4 },
        { col:133, row: 12 }, { col:134, row: 12 },
    ];
        coins = coinDefs.map(({ col, row }) =>
            new Coin(col * TILE + (TILE - 28) / 2, row * TILE - 32)
        );

        // ── Treasure Boxes ──────────────────────────────────────
        boxes = [
            new TreasureBox(20, 9, TILE, (pts) => { player.score += pts; }),
            new TreasureBox(25, 9, TILE, (pts) => { player.score += pts; }),
        ];
        player.setExtraSolids(boxes);

        // ── Stars ───────────────────────────────────────────────
        stars = [
            new Star( 54 * TILE, 11 * TILE - 64),
            new Star( 84 * TILE - 10,  5 * TILE - 64),
            new Star( 119 * TILE, 2 * TILE - 64),
        ];

        // ── Enemies ─────────────────────────────────────────────
        const groundY = (map.length - 1) * TILE;
        enemies = [
            new FlyEnemy( 50 * TILE, 10 * TILE, map, TILE, { speed: 2, floatAmplitude: 28, floatSpeed: 0.04 }),
            new FlyEnemy( 70 * TILE,  6 * TILE, map, TILE, { speed: 2, floatAmplitude: 28, floatSpeed: 0.04 }),
            new FlyEnemy(120 * TILE, 10 * TILE, map, TILE, { speed: 2, floatAmplitude: 28, floatSpeed: 0.04 }),

            new WalkerEnemy( 30 * TILE, groundY, map, TILE, { speed: 1.8, dir: -1 }),
            new WalkerEnemy( 80 * TILE, groundY, map, TILE, { speed: 1.8, dir: -1 }),
            new WalkerEnemy(115 * TILE, groundY, map, TILE, { speed: 2,   dir: -1 }),

            new JumperEnemy( 30 * TILE, groundY,       map, TILE, { jumpForce: -13, jumpInterval: 120 }),
            new JumperEnemy( 45 * TILE, TILE * 7,      map, TILE, { jumpForce: -13, jumpInterval: 120 }),
            new JumperEnemy( 70 * TILE, groundY,       map, TILE, { jumpForce: -13, jumpInterval: 150 }),
            new JumperEnemy(110 * TILE, TILE * 4,      map, TILE, { jumpForce: -13, jumpInterval: 130 }),

            new PatrolEnemy( 32 * TILE, 6 * TILE, map, TILE, { speed: 2.5, patrolLeft:  30*TILE, patrolRight:  35*TILE }),
            new PatrolEnemy( 21 * TILE, groundY,  map, TILE, { speed: 2,   patrolLeft:  19*TILE, patrolRight:  25*TILE }),
            new PatrolEnemy( 65 * TILE, groundY,  map, TILE, { speed: 2,   patrolLeft:  59*TILE, patrolRight:  70*TILE }),
            new PatrolEnemy(108 * TILE, 8 * TILE, map, TILE, { speed: 2.5, patrolLeft: 107*TILE, patrolRight: 117*TILE }),
        ];
    } // end level entity selection

    // ── Moving platforms & hazards ────────────────────────────
    {
        const factory = CURRENT_LEVEL === 3 ? createPlatformsLevel3
                      : CURRENT_LEVEL === 2 ? createPlatformsLevel2
                      : createPlatformsLevel1;
        const { bridges: b, bobs: m } = factory(TILE);
        bridges = b;
        bobs    = m;
        // Register bridges as extra solids so player.moveY() lands on them
        const extraSolidsArr = [...boxes, ...bridges];
        player.setExtraSolids(extraSolidsArr);
        // Give every enemy the same solid surfaces (boxes + bridges)
        for (let i = 0; i < enemies.length; i++) {
            if (typeof enemies[i].setExtraSolids === 'function')
                enemies[i].setExtraSolids(extraSolidsArr);
        }
    }

    // ── HUD callbacks ─────────────────────────────────────────
    // Phase 13: each callback stamps _lastClickTime so the scene-switch
    // cannot be re-triggered by the tail of the same click event.
    hud.onRestart  = () => { _lastClickTime = Date.now(); _resetGameWorld(); SoundManager.resumeMusic(); };
    hud.onMenu     = () => { _lastClickTime = Date.now(); _fullHudReset();   SoundManager.pauseMusic();  sceneState.goto(SCENE.LEVEL_SELECT); };
    hud.onMainMenu = () => { _lastClickTime = Date.now(); _resetGameWorld(); SoundManager.stopMusic();   sceneState.goto(SCENE.MAIN_MENU); };
    hud.onNextLevel= () => {
        const nextLevel = CURRENT_LEVEL + 1;
        if (nextLevel <= 3) {
            CURRENT_LEVEL = nextLevel;
            gameReady = false;        // force full reinit for new level
            _startFresh = true;
            _fullHudReset();
            SoundManager.resumeMusic();
        } else {
            // No more levels — go to level select
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
    // Full reinit is the safest path — ensures the correct map,
    // entities and door coords are rebuilt for the current level.
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
    hud.levelClearedAnimDir= 0;
    resetVirtualKeys();
}

// ── Door overlap check ────────────────────────────────────────
function _playerAtDoor() {
    const playerRight  = player.x + player.width;
    const playerBottom = player.y + player.height;
    const doorLeft     = DOOR_COL * TILE;
    const doorTop      = DOOR_TOP_ROW * TILE;
    const doorBot      = (DOOR_MID_ROW + 1) * TILE;
    return (
        playerRight  >= doorLeft &&
        player.x      < doorLeft &&
        playerBottom  >= doorTop &&
        player.y      <= doorBot
    );
}

// ═══════════════════════════════════════════════════════════════
//  Click routing
//
//  Bug fixes (Phase 13):
//  1. Double-fire: on desktop, touchend listeners (touch controls) +
//     the "click" event both fire for a single mouse press.
//     Guard with a 300 ms debounce so only one action is processed.
//  2. Scene-switch re-entry: when onMenu() changes sceneState to
//     LEVEL_SELECT mid-handler, the same click must NOT be processed
//     by the new scene. We snapshot the scene BEFORE any handleClick
//     and only act on the scene that was active when the click began.
// ═══════════════════════════════════════════════════════════════
canvas.addEventListener("click", e => {
    // ── Debounce: ignore clicks within CLICK_DEBOUNCE_MS of previous one.
    // Catches touchend→click double-fires on desktop (mouse + touch events).
    const now = Date.now();
    if (now - _lastClickTime < CLICK_DEBOUNCE_MS) return;
    _lastClickTime = now;

    const rect = canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;

    // ── Snapshot the scene BEFORE any handler can change it.
    // This prevents the click being re-processed by the new scene.
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
                gameReady   = false;
                _startFresh = true;
                initGame();
                SoundManager.resumeMusic();
            }
            break;

        case SCENE.GAME_PLAYING:
            if (hud) {
                // Unproject click coords from screen-space to virtual space
                // so hit-rects (stored in virtual coords) match correctly.
                const hudScale = camera ? camera.scale : 1;
                const action = hud.handleClick(mx / hudScale, my / hudScale);
                if (action === "sound") SoundManager.setMuted(!hud.soundOn);
                if (action === "pause") hud.paused ? SoundManager.pauseMusic() : SoundManager.resumeMusic();
                if (action === "play")  SoundManager.resumeMusic();
                // "menu" and "restart" are handled via hud.onMenu / hud.onRestart callbacks.
                // Nothing extra needed here — the callbacks already change scene.
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

            // ── Phase 13: responsive scale ─────────────────────────
            // All world content is drawn inside a scaled context so
            // tiles/enemies/player shrink on small screens exactly like
            // the reference game. HUD + touch controls are drawn AFTER
            // restore so they always render in true screen pixels.
            const scale = camera ? camera.scale : 1;

            const worldFrozen = hud.gameOver && !player.sinking;

            if (!hud.paused) {
                // ── Always update player & camera first ────────────────
                player.update();
                camera.update(player);
                for (const cloud of clouds) cloud.update(camera.x, camera.viewW);
                updateWater();  // water scrolls even when world is frozen

                if (!worldFrozen) {
                    // ── Moving bridges ───────────────────────────────────
                    for (let i = 0; i < bridges.length; i++) {
                        bridges[i].update();
                        bridges[i].carryPlayer(player);
                        // Carry enemies riding this bridge
                        for (let j = 0; j < enemies.length; j++) {
                            if (!enemies[j].dead) bridges[i].carryPlayer(enemies[j]);
                        }
                    }

                    // ── Metal bobs — update & hazard check ───────────────
                    for (let i = 0; i < bobs.length; i++) {
                        bobs[i].update();
                        if (!player.dead && bobs[i].overlaps(player)) {
                            player.hit(1);
                            SoundManager.play("damage");
                        }
                    }

                    // ── Enemies — update all; only collision-check live ones ──
                    // Phase 12: dead enemies skipped immediately inside enemy.update()
                    for (let i = 0; i < enemies.length; i++) {
                        const enemy = enemies[i];
                        // Activate enemy the first time the camera reveals it
                        if (!enemy.activated && inView(enemy.x, enemy.y, enemy.width, enemy.height)) {
                            enemy.activated = true;
                        }
                        enemy.update();

                        if (!enemy.dead && enemy.overlaps(player)) {
                            if (player.velY > 0 &&
                                player.y + player.height < enemy.y + enemy.height * 0.6) {
                                enemy.dead = true;
                                player.velY = -8;
                                player.score += 100;
                                SoundManager.play("stomp");
                                explosions.spawn(
                                    enemy.x + enemy.width  / 2,
                                    enemy.y + enemy.height / 2
                                );
                            } else {
                                player.hit(1);
                            }
                        }
                    }

                    // ── Explosions (pooled) ───────────────────────────────
                    explosions.update();

                    // ── Coins — viewport-culled update & collection ───────
                    for (let i = 0; i < coins.length; i++) {
                        const coin = coins[i];
                        if (coin.collected) continue;
                        // Only animate coins near the camera
                        if (inView(coin.x, coin.y, coin.renderW, coin.renderH)) {
                            coin.update();
                            if (coin.overlaps(player)) {
                                coin.collected = true;
                                player.score += 30;
                                SoundManager.play("coin");
                            }
                        }
                    }

                    // ── Treasure Boxes ───────────────────────────────────
                    for (let i = 0; i < boxes.length; i++) {
                        const hit = boxes[i].update(player);
                        if (hit) SoundManager.play("coin");
                    }

                    // ── Stars — viewport-culled ───────────────────────────
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
                // Phase 12: Serialise at most once per second to cut JSON overhead
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
                            coins:  coins.map(c => c.collected),
                            stars:  stars.map(s => s.collected),
                            boxes:  boxes.map(b => ({ hitsLeft: b.hitsLeft, exhausted: b.exhausted })),
                        });
                    }
                }
            } // end !hud.paused

            // ── Draw ──────────────────────────────────────────────────
            // Phase 13: scale the entire world so it fits small screens.
            // ctx.save/restore keeps the transform isolated.
            ctx.save();
            ctx.scale(scale, scale);

            drawBackground(ctx, camera);
            drawClouds(ctx, clouds, camera.x);
            drawMap(ctx, map, TILE, camera);

            // Animated water overlay (draws on top of static water tiles)
            drawWater(ctx, map, TILE, camera);

            // Boxes — always draw (near player, no culling needed)
            for (let i = 0; i < boxes.length; i++) boxes[i].draw(ctx, camera);

            // Phase 12: single imageSmoothingEnabled = false, then batch draws
            ctx.imageSmoothingEnabled = false;

            // Moving bridges — draw before enemies/player so they appear behind
            for (let i = 0; i < bridges.length; i++) {
                if (inView(bridges[i].x, bridges[i].y, bridges[i].width, bridges[i].height))
                    bridges[i].draw(ctx, camera);
            }

            // Metal bobs
            for (let i = 0; i < bobs.length; i++) {
                if (inView(bobs[i].x, bobs[i].y, bobs[i].width, bobs[i].height))
                    bobs[i].draw(ctx, camera);
            }

            // Coins — viewport-culled draw
            for (let i = 0; i < coins.length; i++) {
                const c = coins[i];
                if (!c.collected && inView(c.x, c.y, c.renderW, c.renderH))
                    c.draw(ctx, camera);
            }

            // Stars — viewport-culled draw
            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                if (!s.collected && inView(s.x, s.y, 50, 50))
                    s.draw(ctx, camera);
            }

            // Enemies — viewport-culled draw
            for (let i = 0; i < enemies.length; i++) {
                const e = enemies[i];
                if (!e.dead && inView(e.x, e.y, e.width + 64, e.height + 64))
                    e.draw(ctx, camera);
            }

            explosions.draw(ctx, camera);
            player.draw(ctx, camera);

            ctx.imageSmoothingEnabled = true;

            // Phase 13: HUD panels (game over, pause, level clear) are drawn
            // INSIDE the scale transform so they size relative to the virtual
            // viewport — not the raw screen. Pass virtual dims (vw/scale, vh/scale).
            const svw = vw / scale;
            const svh = vh / scale;
            hud.draw(ctx, svw, svh, player.score, player.health);

            ctx.restore(); // end scaled world

            // Touch controls stay in TRUE screen-space so d-pad buttons
            // are always the right physical size to tap on mobile.
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