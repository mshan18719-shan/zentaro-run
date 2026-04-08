// ══════════════════════════════════════════════════════════════
//  world/levels/level5.js
//  Everything for Level 5: map, platforms, coins, boxes, stars, enemies.
//  ✦ Replace the stub createMap() below with your actual level 5 layout.
// ══════════════════════════════════════════════════════════════

import { FlyEnemy, WalkerEnemy, JumperEnemy, PatrolEnemy } from "../../entities/enemy.js";
import { Coin, TreasureBox, Star } from "../../entities/coin.js";
import { createPlatformsLevel1 } from "../platform.js"; // swap for createPlatformsLevel5 when ready

// ── Door position ─────────────────────────────────────────────
export const DOOR = { col: 147, midRow: 13, topRow: 12 };

// ── Platform factory ──────────────────────────────────────────
export { createPlatformsLevel1 as createLevelPlatforms };

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
    map[9][8] = 1; map[9][9] = 1; map[9][10] = 1;
    map[10][8] = 15; map[10][9] = 15; map[10][10] = 15;

    // Crystal & rock decorations
    map[12][9]  = 9;   // rock
    map[12][18] = 13;  // crystal

    // Gap 1 — black-hole floor cols 20–33
    for (let x = 20; x <= 33; x++) map[14][x] = 25;
    map[7][24] = 21; map[7][25] = 22; map[7][26] = 22; map[7][27] = 23;
    for (let x = 32; x <= 37; x++) map[4][x] = 1;
    for (let y = 5; y <= 14; y++) map[y][36] = 8;
    for (let y = 5; y <= 14; y++) map[y][37] = 8;

    // River cols 42–57
    for (let x = 42; x <= 57; x++) map[14][x] = 3;
    map[11][44] = 1; map[10][47] = 1; map[11][50] = 1; map[10][53] = 1;
    map[12][44] = 15; map[12][50] = 15;
    map[12][40] = 6; map[12][59] = 9;

    // Tower 1 — cols 63–64
    for (let y = 5; y <= 14; y++) map[y][63] = 8;
    for (let y = 5; y <= 14; y++) map[y][64] = 8;
    for (let x = 61; x <= 65; x++) map[4][x] = 1;
    map[5][61] = 15; map[5][62] = 15; map[5][65] = 15;

    // Mid platform between towers
    for (let x = 68; x <= 69; x++) map[11][x] = 1;

    // Tower 2 — cols 73–75
    for (let y = 6; y <= 14; y++) map[y][73] = 8;
    for (let y = 6; y <= 14; y++) map[y][74] = 8;
    for (let y = 6; y <= 14; y++) map[y][75] = 8;
    map[5][72] = 1; map[5][73] = 1; map[5][74] = 1; map[5][75] = 1; map[5][76] = 1;
    map[6][72] = 15; map[6][76] = 15;
    map[3][63] = 13; map[4][74] = 13;

    // Fortress floor cols 80–115
    for (let x = 80; x <= 115; x++) map[14][x] = 8;
    for (let x = 80; x <= 113; x++) map[13][x] = 1;
    for (let y = 9; y <= 13; y++) map[y][114] = 8;
    for (let y = 9; y <= 13; y++) map[y][115] = 8;
    map[8][114] = 1; map[8][115] = 1;

    for (let x = 129; x <= 131; x++) map[14][x] = 1;
    for (let x = 132; x <= 139; x++) map[14][x] = 3;

    for (let x = 143; x <= 149; x++) map[14][x] = 1;
    map[12][143] = 16; map[12][145] = 13; map[11][144] = 7;

    // Door
    map[12][146] = 24;
    map[12][147] = 5;
    map[13][147] = 4;

    return map;
}

// ══════════════════════════════════════════════════════════════
//  ENTITIES  ← put your Level 5 enemies / coins / stars here
// ══════════════════════════════════════════════════════════════
export function createLevelEntities(map, TILE, player) {
    const coinDefs = [
        { col: 9,  row: 5 },
        { col: 13, row: 11 }, { col: 14, row: 11 }, { col: 15, row: 11 },
        { col: 34, row: 2 },  { col: 36, row: 2 },
        { col: 34, row: 9 },  { col: 34, row: 11 },
        { col: 45, row: 6 },  { col: 47, row: 6 }, { col: 51, row: 7 }, { col: 53, row: 6 },
        { col: 59, row: 9 },  { col: 59, row: 11 },
        { col: 60, row: 8 },  { col: 60, row: 10 },
        { col: 63, row: 2 },  { col: 73, row: 3 },
        { col: 65, row: 9 },  { col: 65, row: 11 }, { col: 65, row: 13 },
        { col: 71, row: 9 },  { col: 71, row: 11 }, { col: 71, row: 13 },
        { col: 76, row: 9 },  { col: 76, row: 11 }, { col: 76, row: 13 },
        { col: 78, row: 10 }, { col: 78, row: 12 },
        { col: 87, row: 3 },  { col: 89, row: 3 },
        { col: 95, row: 9 },  { col: 97, row: 9 }, { col: 99, row: 9 },
        { col: 107, row: 9 }, { col: 109, row: 9 }, { col: 111, row: 9 },
        { col: 119, row: 10 }, { col: 121, row: 9 }, { col: 123, row: 10 },
        { col: 135, row: 9 }, { col: 135, row: 4 },
    ];
    const coins = coinDefs.map(({ col, row }) =>
        new Coin(col * TILE + (TILE - 28) / 2, row * TILE - 32)
    );

    const boxes = [
        new TreasureBox(86, 8, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(87, 8, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(88, 8, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(89, 8, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(90, 8, TILE, (pts) => { player.score += pts; }),
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

    const stars = [
        new Star(25 * TILE, 3 * TILE - 64),
        new Star(68 * TILE, 10 * TILE - 64),
        new Star(136 * TILE - 10, 13 * TILE - 64),
    ];

    const groundY = (map.length - 1) * TILE;
    const enemies = [
        new FlyEnemy(8 * TILE,   11 * TILE, map, TILE, { speed: 2.8, floatAmplitude: 24, floatSpeed: 0.055 }),
        new FlyEnemy(24 * TILE,  10 * TILE, map, TILE, { speed: 3.0, floatAmplitude: 28, floatSpeed: 0.060 }),
        new FlyEnemy(47 * TILE,  8 * TILE,  map, TILE, { speed: 3.2, floatAmplitude: 30, floatSpeed: 0.065 }),
        new FlyEnemy(63 * TILE,  2 * TILE,  map, TILE, { speed: 3.0, floatAmplitude: 22, floatSpeed: 0.060 }),
        new FlyEnemy(115 * TILE, 5 * TILE,  map, TILE, { speed: 3.5, floatAmplitude: 26, floatSpeed: 0.070 }),

        new WalkerEnemy(19 * TILE,  groundY,   map, TILE, { speed: 2.5, dir: -1 }),
        new WalkerEnemy(112 * TILE, 13 * TILE, map, TILE, { speed: 4.0, dir: -1 }),

        new JumperEnemy(13 * TILE,  groundY,   map, TILE, { jumpForce: -20, jumpInterval: 25 }),
        new JumperEnemy(34 * TILE,  groundY,   map, TILE, { jumpForce: -20, jumpInterval: 25 }),
        new JumperEnemy(47 * TILE,  10 * TILE, map, TILE, { jumpForce: -16, jumpInterval: 25 }),
        new JumperEnemy(53 * TILE,  10 * TILE, map, TILE, { jumpForce: -16, jumpInterval: 35 }),
        new JumperEnemy(61 * TILE,  2 * TILE,  map, TILE, { jumpForce: -11, jumpInterval: 25 }),
        new JumperEnemy(79 * TILE,  groundY,   map, TILE, { jumpForce: -17, jumpInterval: 45 }),
        new JumperEnemy(93 * TILE,  8 * TILE,  map, TILE, { jumpForce: -17, jumpInterval: 90 }),
        new JumperEnemy(112 * TILE, 8 * TILE,  map, TILE, { jumpForce: -17, jumpInterval: 90 }),
        new JumperEnemy(126 * TILE, groundY,   map, TILE, { jumpForce: -16, jumpInterval: 85 }),
        new JumperEnemy(141 * TILE, 11 * TILE, map, TILE, { jumpForce: -13, jumpInterval: 90 }),

        new PatrolEnemy(15 * TILE,  groundY,  map, TILE, { speed: 3.5, patrolLeft: 10 * TILE,  patrolRight: 19 * TILE }),
        new PatrolEnemy(24 * TILE,  7 * TILE, map, TILE, { speed: 3.5, patrolLeft: 24 * TILE,  patrolRight: 27 * TILE }),
        new PatrolEnemy(34 * TILE,  2 * TILE, map, TILE, { speed: 3.5, patrolLeft: 32 * TILE,  patrolRight: 38 * TILE }),
        new PatrolEnemy(60 * TILE,  3 * TILE, map, TILE, { speed: 3.5, patrolLeft: 58 * TILE,  patrolRight: 63 * TILE }),
        new PatrolEnemy(74 * TILE,  3 * TILE, map, TILE, { speed: 4.5, patrolLeft: 72 * TILE,  patrolRight: 77 * TILE }),
        new PatrolEnemy(73 * TILE,  groundY,  map, TILE, { speed: 10,  patrolLeft: 65 * TILE,  patrolRight: 76 * TILE }),
        new PatrolEnemy(88 * TILE,  7 * TILE, map, TILE, { speed: 4.5, patrolLeft: 86 * TILE,  patrolRight: 90 * TILE }),
        new PatrolEnemy(88 * TILE,  5 * TILE, map, TILE, { speed: 4.5, patrolLeft: 80 * TILE,  patrolRight: 97 * TILE }),
        new PatrolEnemy(100 * TILE, 5 * TILE, map, TILE, { speed: 4.5, patrolLeft: 95 * TILE,  patrolRight: 111 * TILE }),
        new PatrolEnemy(123 * TILE, 7 * TILE, map, TILE, { speed: 5,   patrolLeft: 117 * TILE, patrolRight: 129 * TILE }),
    ];

    return { coins, boxes, stars, enemies };
}