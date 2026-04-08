// ══════════════════════════════════════════════════════════════
//  world/levels/level4.js
//  Everything for Level 4: map, platforms, coins, boxes, stars, enemies.
//  ✦ Replace the stub createMap() below with your actual level 4 layout.
// ══════════════════════════════════════════════════════════════

import { FlyEnemy, WalkerEnemy, JumperEnemy, PatrolEnemy } from "../../entities/enemy.js";
import { Coin, TreasureBox, Star } from "../../entities/coin.js";
import { createPlatformsLevel4 } from "../platform.js"; // swap for createPlatformsLevel4 when ready

// ── Door position ─────────────────────────────────────────────
export const DOOR = { col: 148, midRow: 13, topRow: 12 };

// ── Platform factory ──────────────────────────────────────────
export { createPlatformsLevel4 as createLevelPlatforms };

// ══════════════════════════════════════════════════════════════
//  MAP  ← put your Level 4 tile layout here
// ══════════════════════════════════════════════════════════════
export function createMap() {
    const rows = 15;
    const cols = 150;

    const map = Array.from({ length: rows }, () => new Int8Array(cols));

    // Ground floor
    for (let x = 0; x < cols; x++) map[14][x] = 1;

    // Starting board + big cactus landmark
    map[12][7] = 12;
    map[11][3] = 7;

    // Two small platforms player can hop to for safety
    map[7][1] = 1; map[7][2] = 1; map[7][3] = 1;
    map[8][1] = 15; map[8][2] = 15; map[8][3] = 15;

    // Crystal & rock decorations
    map[12][9] = 9;   // rock
    map[12][12] = 6;   // cactus
    map[12][13] = 9;   // rock
    map[12][17] = 17;  // fence
    map[12][18] = 18;  // fence brokem
    map[12][22] = 16;  // grass
    map[12][27] = 6;  // cactus
    map[12][29] = 13;  // crystal

    map[9][15] = 1; map[9][17] = 1; map[9][19] = 1; map[9][21] = 1; map[9][23] = 1;

    // River cols 42–57
    map[12][40] = 6; map[12][42] = 9;
    map[3][65] = 10; map[3][67] = 11;
    for (let x = 31; x <= 37; x++) map[14][x] = 3;
    for (let x = 44; x <= 50; x++) map[14][x] = 3;
    for (let x = 57; x <= 110; x++) map[14][x] = 3;
    map[5][65] = 1; map[5][66] = 1; map[5][67] = 1;
    map[10][64] = 21; map[10][65] = 22; map[10][66] = 22; map[10][67] = 22; map[10][68] = 23;
    for (let x = 73; x <= 76; x++) map[7][x] = 1;
    for (let x = 84; x <= 88; x++) map[7][x] = 1;
    for (let x = 97; x <= 99; x++) map[7][x] = 1;
    for (let y = 8; y <= 10; y++) map[y][97] = 8;
    for (let y = 8; y <= 10; y++) map[y][99] = 8;
    for (let y = 8; y <= 10; y++) map[y][98] = 8;

    for (let x = 100; x <= 116; x++) map[3][x] = 1;
    for (let y = 4; y <= 10; y++) map[y][115] = 8;
    for (let y = 4; y <= 10; y++) map[y][116] = 8;

    for (let x = 117; x <= 120; x++) map[9][x] = 1;
    map[10][117] = 8; map[10][118] = 8; map[10][119] = 8; map[10][120] = 8;
    for (let y = 0; y <= 10; y++) map[y][121] = 8;
    for (let y = 0; y <= 10; y++) map[y][122] = 8;

    for (let x = 111; x <= 112; x++) map[8][x] = 1;
    for (let y = 9; y <= 14; y++) map[y][111] = 8;
    for (let y = 9; y <= 14; y++) map[y][112] = 8;

    for (let y = 5; y <= 14; y++) map[y][128] = 8;
    for (let y = 5; y <= 14; y++) map[y][129] = 8;
    for (let y = 5; y <= 14; y++) map[y][130] = 8;
    for (let x = 128; x <= 130; x++) map[4][x] = 1;

    map[8][123] = 1; map[8][124] = 1;

    for (let x = 133; x <= 144; x++) map[14][x] = 25;

    for (let x = 138; x <= 142; x++) map[10][x] = 1;


    // Door
    map[12][146] = 24;
    map[12][148] = 5;
    map[13][148] = 4;

    return map;
}

// ══════════════════════════════════════════════════════════════
//  ENTITIES  ← put your Level 4 enemies / coins / stars here
// ══════════════════════════════════════════════════════════════
export function createLevelEntities(map, TILE, player) {
    const coinDefs = [
        { col: 20, row: 7 },  { col: 23, row: 7 },
        { col: 26, row: 11 },  { col: 24, row: 11 }, { col: 22, row: 11 }, { col: 20, row: 11 },
        { col: 39, row: 10 },  { col: 41, row: 10 },
        { col: 66, row: 9 },  { col: 54, row: 12 },
        { col: 74, row: 3 },  { col: 76, row: 3 },
        { col: 85, row: 3 },  { col: 87, row: 3 },
        { col: 104, row: 7 }, { col: 104, row: 9 }, { col: 104, row: 11 },
        { col: 109, row: 2 },  { col: 107, row: 2 }, { col: 105, row: 2 }, { col: 103, row: 2 },
        { col: 111, row: 2 },  { col: 113, row: 2 }, { col: 115, row: 2 },
        { col: 117, row: 8 },  { col: 117, row: 6 }, { col: 117, row: 4 }, { col: 117, row: 2 },
        { col: 118, row: 8 },  { col: 118, row: 6 }, { col: 118, row: 4 }, { col: 118, row: 2 },
        { col: 115, row: 13 }, { col: 117, row: 13 }, { col: 119, row: 13 },
        { col: 121, row: 13 }, { col: 123, row: 13 }, { col: 125, row: 13 },
        { col: 129, row: 2 },
        { col: 139, row: 8 }, { col: 141, row: 8 }, { col: 134, row: 6 },
    ];
    const coins = coinDefs.map(({ col, row }) =>
        new Coin(col * TILE + (TILE - 28) / 2, row * TILE - 32)
    );

    const boxes = [
        new TreasureBox(14, 9, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(16, 9, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(18, 9, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(20, 9, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(22, 9, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(64, 5, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(68, 5, TILE, (pts) => { player.score += pts; }),
    ];

    const stars = [
        new Star(2 * TILE, 4 * TILE - 64),
        new Star(66 * TILE, 4 * TILE - 64),
        new Star(132 * TILE - 10, 13 * TILE - 64),
    ];

    const groundY = (map.length - 1) * TILE;
    const enemies = [
        new FlyEnemy(8 * TILE,   11 * TILE, map, TILE, { speed: 2.8, floatAmplitude: 24, floatSpeed: 0.055 }),
        new FlyEnemy(24 * TILE,  10 * TILE, map, TILE, { speed: 3.0, floatAmplitude: 28, floatSpeed: 0.060 }),
        new FlyEnemy(47 * TILE,  8 * TILE,  map, TILE, { speed: 3.2, floatAmplitude: 30, floatSpeed: 0.065 }),
        new FlyEnemy(63 * TILE,  2 * TILE,  map, TILE, { speed: 3.0, floatAmplitude: 22, floatSpeed: 0.060 }),
        new FlyEnemy(115 * TILE, 5 * TILE,  map, TILE, { speed: 3.5, floatAmplitude: 26, floatSpeed: 0.070 }),

        new WalkerEnemy(126 * TILE,  groundY,   map, TILE, { speed: 2.5, dir: -1 }),
        new WalkerEnemy(29 * TILE, groundY, map, TILE, { speed: 4.0, dir: -1 }),

        new JumperEnemy(28 * TILE,  groundY,   map, TILE, { jumpForce: -20, jumpInterval: 55 }),
        new JumperEnemy(55 * TILE,  groundY,   map, TILE, { jumpForce: -17, jumpInterval: 45 }),
        new JumperEnemy(41 * TILE,  groundY,   map, TILE, { jumpForce: -20, jumpInterval: 25 }),
        new JumperEnemy(85 * TILE, 6 * TILE,  map, TILE, { jumpForce: -17, jumpInterval: 90 }),
        new JumperEnemy(126 * TILE, groundY,   map, TILE, { jumpForce: -18, jumpInterval: 85 }),
        new JumperEnemy(128 * TILE, 3 * TILE, map, TILE, { jumpForce: -9, jumpInterval: 90 }),

        new PatrolEnemy(14 * TILE,  9 * TILE,  map, TILE, { speed: 3.5, patrolLeft: 14 * TILE,  patrolRight: 24 * TILE }),
        new PatrolEnemy(20 * TILE,  groundY, map, TILE, { speed: 3.5, patrolLeft: 15 * TILE,  patrolRight: 25 * TILE }),
        new PatrolEnemy(38 * TILE,  3 * TILE, map, TILE, { speed: 4.5, patrolLeft: 38 * TILE,  patrolRight: 44 * TILE }),
        new PatrolEnemy(73 * TILE,  6 * TILE, map, TILE, { speed: 4.5, patrolLeft: 73 * TILE,  patrolRight: 77 * TILE }),
        new PatrolEnemy(100 * TILE, 2 * TILE, map, TILE, { speed: 4.5, patrolLeft: 100 * TILE,  patrolRight: 116 * TILE }),
        new PatrolEnemy(116 * TILE,  2 * TILE, map, TILE, { speed: 4.5, patrolLeft: 100 * TILE,  patrolRight: 116 * TILE }),
        new PatrolEnemy(118 * TILE,  groundY,  map, TILE, { speed: 6,  patrolLeft: 112 * TILE,  patrolRight: 128 * TILE }),
        new PatrolEnemy(138 * TILE, 9 * TILE, map, TILE, { speed: 5, patrolLeft: 138 * TILE, patrolRight: 142 * TILE }),
    ];

    return { coins, boxes, stars, enemies };
}