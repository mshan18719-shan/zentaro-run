// ══════════════════════════════════════════════════════════════
//  world/levels/level5.js
//  Everything for Level 5: map, platforms, coins, boxes, stars, enemies.
//  ✦ Replace the stub createMap() below with your actual level 5 layout.
// ══════════════════════════════════════════════════════════════

import { FlyEnemy, WalkerEnemy, JumperEnemy, PatrolEnemy } from "../../entities/enemy.js";
import { Coin, TreasureBox, Star } from "../../entities/coin.js";
import { createPlatformsLevel5 } from "../platform.js"; // swap for createPlatformsLevel5 when ready

// ── Door position ─────────────────────────────────────────────
export const DOOR = { col: 147, midRow: 13, topRow: 12 };

// ── Platform factory ──────────────────────────────────────────
export { createPlatformsLevel5 as createLevelPlatforms };

// ══════════════════════════════════════════════════════════════
//  MAP  ← put your Level 5 tile layout here
// ══════════════════════════════════════════════════════════════
export function createMap() {
    const rows = 15;
    const cols = 150;

    const map = Array.from({ length: rows }, () => new Int8Array(cols));

    // Ground floor
    for (let x = 0; x < cols; x++) map[14][x] = 1;

    // Starting board + big cactus landmark
    map[12][1] = 12;
    map[11][3] = 7;

    // Two small platforms player can hop to for safety
    map[9][15] = 1; map[9][16] = 1; map[9][17] = 1; map[9][18] = 1; map[9][19] = 1;
    map[10][16] = 15; map[10][17] = 15; map[10][18] = 15;

    // Crystal & rock decorations
    map[12][9] = 9;   // rock
    map[12][18] = 13;  // crystal

    // River cols 42–57
    for (let x = 40; x <= 46; x++) map[12][x] = 1;
    for (let y = 13; y <= 14; y++) map[y][40] = 8;
    for (let y = 13; y <= 14; y++) map[y][41] = 8;
    for (let y = 13; y <= 14; y++) map[y][42] = 8;
    for (let y = 13; y <= 14; y++) map[y][43] = 8;
    for (let y = 13; y <= 14; y++) map[y][44] = 8;
    for (let y = 13; y <= 14; y++) map[y][45] = 8;
    for (let y = 13; y <= 14; y++) map[y][46] = 8;

    // Tower 1 — cols 63–64
    for (let x = 47; x <= 63; x++) map[13][x] = 1;
    for (let x = 47; x <= 63; x++) map[14][x] = 8;
    map[8][70] = 21; map[8][71] = 22; map[8][72] = 22; map[8][73] = 22; map[8][74] = 23;
    for (let x = 64; x <= 100; x++) map[14][x] = 3;

    // Fortress floor cols 80–115
    for (let x = 110; x <= 135; x++) map[14][x] = 25;
    for (let x = 115; x <= 117; x++) map[9][x] = 1;
    for (let x = 123; x <= 125; x++) map[9][x] = 1;
    for (let x = 130; x <= 132; x++) map[9][x] = 1;

    // Door
    map[12][145] = 24;
    map[12][147] = 5;
    map[13][147] = 4;

    return map;
}

// ══════════════════════════════════════════════════════════════
//  ENTITIES  ← put your Level 5 enemies / coins / stars here
// ══════════════════════════════════════════════════════════════
export function createLevelEntities(map, TILE, player) {
    const coinDefs = [
        { col: 17, row: 3 },
        { col: 16, row: 7 }, { col: 18, row: 7 },
        { col: 41, row: 6 }, { col: 43, row: 6 }, { col: 45, row: 6 },
        { col: 28, row: 10 },  { col: 30, row: 10 }, { col: 32, row: 10 }, { col: 34, row: 10 },
        { col: 49, row: 11 }, { col: 51, row: 11 },
        { col: 53, row: 4 }, { col: 55, row: 4 },
        { col: 57, row: 11 }, { col: 59, row: 11 }, { col: 61, row: 11 },
        { col: 71, row: 7 }, { col: 73, row: 7 },
        { col: 79, row: 3 },  { col: 81, row: 3 }, { col: 83, row: 3 },
        { col: 86, row: 9 },  { col: 86, row: 11 },
        { col: 91, row: 3 }, { col: 93, row: 3 }, { col: 95, row: 3 },
        { col: 102, row: 11 },  { col: 104, row: 9 }, { col: 106, row: 11 },
        { col: 116, row: 8 },  { col: 116, row: 6 }, { col: 116, row: 4 },
        { col: 124, row: 6 },  { col: 124, row: 8 },
        { col: 131, row: 8 },  { col: 131, row: 6 }, { col: 131, row: 4 },
        { col: 137, row: 11 },  { col: 139, row: 9 }, { col: 141, row: 11 },
        { col: 136, row: 4 }, { col: 138, row: 4 },
    ];
    const coins = coinDefs.map(({ col, row }) =>
        new Coin(col * TILE + (TILE - 28) / 2, row * TILE - 32)
    );

    const boxes = [
        new TreasureBox(15, 5, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(16, 5, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(17, 5, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(18, 5, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(19, 5, TILE, (pts) => { player.score += pts; }),

        new TreasureBox(40, 8, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(41, 8, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(42, 8, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(43, 8, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(44, 8, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(45, 8, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(46, 8, TILE, (pts) => { player.score += pts; }),

        new TreasureBox(101, 7, TILE, (pts) => { player.score += pts; }),
    ];

    const stars = [
        new Star(72 * TILE, 4 * TILE - 64),
        new Star( 86 * TILE, 7 * TILE - 64),
        new Star(124 * TILE, 4 * TILE - 64),
    ];

    const groundY = (map.length - 1) * TILE;
    const enemies = [
        new FlyEnemy(8 * TILE,   11 * TILE, map, TILE, { speed: 2.8, floatAmplitude: 24, floatSpeed: 0.055 }),
        new FlyEnemy(24 * TILE,  10 * TILE, map, TILE, { speed: 3.0, floatAmplitude: 28, floatSpeed: 0.060 }),
        new FlyEnemy(47 * TILE,  8 * TILE,  map, TILE, { speed: 3.2, floatAmplitude: 30, floatSpeed: 0.065 }),
        new FlyEnemy(63 * TILE,  2 * TILE,  map, TILE, { speed: 3.0, floatAmplitude: 22, floatSpeed: 0.060 }),
        new FlyEnemy(115 * TILE, 5 * TILE,  map, TILE, { speed: 3.5, floatAmplitude: 26, floatSpeed: 0.070 }),

        new WalkerEnemy(39 * TILE,  groundY,   map, TILE, { speed: 2.5, dir: -1 }),
        new WalkerEnemy(62 * TILE, 13 * TILE, map, TILE, { speed: 4.0, dir: -1 }),


        new JumperEnemy(33 * TILE,  groundY,   map, TILE, { jumpForce: -20, jumpInterval: 25 }),
        new JumperEnemy(60 * TILE,  13 * TILE, map, TILE, { jumpForce: -16, jumpInterval: 25 }),
        new JumperEnemy(72 * TILE,  8 * TILE, map, TILE, { jumpForce: -16, jumpInterval: 35 }),
        new JumperEnemy(139 * TILE,  groundY,   map, TILE, { jumpForce: -20, jumpInterval: 25 }),
        new JumperEnemy(103 * TILE,  groundY,   map, TILE, { jumpForce: -17, jumpInterval: 45 }),
        
        new PatrolEnemy(25 * TILE,  groundY,  map, TILE, { speed: 3.5, patrolLeft: 15 * TILE,  patrolRight: 25 * TILE }),
        new PatrolEnemy(15 * TILE,  9 * TILE, map, TILE, { speed: 3.5, patrolLeft: 15 * TILE,  patrolRight: 20 * TILE }),
        new PatrolEnemy(46 * TILE,  12 * TILE, map, TILE, { speed: 3.5, patrolLeft: 40 * TILE,  patrolRight: 47 * TILE }),
        new PatrolEnemy(40 * TILE,  8 * TILE, map, TILE, { speed: 3.5, patrolLeft: 40 * TILE,  patrolRight: 47 * TILE }),
        new PatrolEnemy(58 * TILE,  3 * TILE, map, TILE, { speed: 4.5, patrolLeft: 50 * TILE,  patrolRight: 62 * TILE }),
        new PatrolEnemy(72 * TILE,  8 * TILE, map, TILE, { speed: 4.5, patrolLeft: 70 * TILE,  patrolRight: 75 * TILE }),
        new PatrolEnemy(101 * TILE,  groundY,  map, TILE, { speed: 6,  patrolLeft: 101 * TILE,  patrolRight: 110 * TILE }),
        new PatrolEnemy(136 * TILE,  groundY,  map, TILE, { speed: 6,  patrolLeft: 136 * TILE,  patrolRight: 143 * TILE }),
    ];

    return { coins, boxes, stars, enemies };
}