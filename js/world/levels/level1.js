// ══════════════════════════════════════════════════════════════
//  world/levels/level1.js
//  Everything for Level 1: map, platforms, coins, boxes, stars, enemies.
//  To edit this level just work in this file — nothing else needs changing.
// ══════════════════════════════════════════════════════════════

import { FlyEnemy, WalkerEnemy, JumperEnemy, PatrolEnemy } from "../../entities/enemy.js";
import { Coin, TreasureBox, Star } from "../../entities/coin.js";
import { createPlatformsLevel1 } from "../platform.js";

// ── Door position ─────────────────────────────────────────────
export const DOOR = { col: 138, midRow: 13, topRow: 12 };

// ── Platform factory ──────────────────────────────────────────
export { createPlatformsLevel1 as createLevelPlatforms };

// ══════════════════════════════════════════════════════════════
//  MAP
// ══════════════════════════════════════════════════════════════
export function createMap() {
    const rows = 15;
    const cols = 140;

    const map = Array.from({ length: rows }, () => new Int8Array(cols));

    // Ground floor
    for (let x = 0; x < cols; x++) map[14][x] = 1;

    // ── Original section (cols 0–99) ─────────────────────────
    map[12][8] = 13;
    map[9][21] = 1; map[9][22] = 1; map[9][23] = 1; map[9][24] = 1;
    map[10][21] = 15; map[10][22] = 15; map[10][23] = 15; map[10][24] = 15; // Spikes

    map[6][30] = 1; map[6][31] = 1; map[6][32] = 1; map[6][33] = 1; map[6][34] = 1;
    map[7][30] = 15; map[7][31] = 15; map[7][32] = 15; map[7][33] = 15; map[7][34] = 15; // Spikes

    map[6][45] = 17; map[6][46] = 18;
    for (let x = 42; x <= 57; x++) map[8][x] = 1;
    map[9][56] = 8; map[9][57] = 8;
    map[10][56] = 8; map[10][57] = 8;
    map[11][56] = 8; map[11][57] = 8;
    map[12][56] = 8; map[12][57] = 8;
    map[13][56] = 8; map[13][57] = 8;

    map[7][64] = 1; map[7][65] = 1; map[7][66] = 1; map[7][67] = 1;
    map[7][73] = 1; map[7][74] = 1; map[7][75] = 1; map[7][76] = 1;

    for (let x = 82; x <= 92; x++) map[14][x] = 3;

    map[11][2] = 7;
    map[12][6] = 12;

    map[6][50] = 10; map[6][53] = 11;

    map[8][93] = 1; map[8][94] = 1;
    for (let y = 9; y <= 14; y++) map[y][93] = 8;
    for (let y = 9; y <= 14; y++) map[y][94] = 8;

    // ── Extended section (cols 100–139) ──────────────────────
    for (let y = 0; y <= 9; y++) map[y][102] = 8;
    for (let y = 0; y <= 9; y++) map[y][103] = 8;

    for (let x = 97; x <= 101; x++) map[9][x] = 1;
    for (let x = 98; x <= 103; x++) map[10][x] = 15;

    map[9][108] = 1; map[9][109] = 1; map[9][110] = 1;
    map[10][108] = 15; map[10][109] = 15; map[10][110] = 15;

    map[7][113] = 1; map[7][114] = 1; map[7][115] = 1; map[7][116] = 1;
    map[8][113] = 15; map[8][114] = 15; map[8][115] = 15; map[8][116] = 15;

    map[9][119] = 1; map[9][120] = 1;
    for (let y = 10; y <= 14; y++) map[y][119] = 8;
    for (let y = 10; y <= 14; y++) map[y][120] = 8;

    map[11][136] = 7; // Big cactus near end

    // Cactus decorations
    map[12][13] = 6; map[12][28] = 6; map[12][47] = 6;
    map[6][56] = 6;  map[12][63] = 6; map[12][123] = 6;

    // Rocks
    map[12][14] = 9; map[12][54] = 9; map[12][78] = 9; map[12][98] = 9;

    // Crystals
    map[12][19] = 13; map[12][32] = 13; map[12][43] = 13;
    map[12][49] = 13; map[12][66] = 13; map[12][126] = 13;

    // Grass
    map[12][22] = 16; map[12][37] = 16; map[12][71] = 16;
    map[12][77] = 16; map[12][95] = 16; map[12][133] = 16;

    // Door
    map[12][135] = 24;
    map[12][138] = 5;
    map[13][138] = 4;

    return map;
}

// ══════════════════════════════════════════════════════════════
//  ENTITIES  (coins, boxes, stars, enemies)
// ══════════════════════════════════════════════════════════════
export function createLevelEntities(map, TILE, player) {
    const coinDefs = [
        { col: 15, row: 12 }, { col: 16, row: 12 }, { col: 17, row: 12 },
        { col: 34, row: 12 }, { col: 35, row: 12 }, { col: 36, row: 12 },
        { col: 44, row: 12 }, { col: 45, row: 12 }, { col: 46, row: 12 },
        { col: 51, row: 12 }, { col: 52, row: 12 },
        { col: 47, row: 7 },  { col: 49, row: 7 },  { col: 51, row: 7 },
        { col: 53, row: 7 },  { col: 55, row: 7 },
        { col: 62, row: 12 }, { col: 63, row: 12 }, { col: 64, row: 12 },
        { col: 65, row: 12 }, { col: 73, row: 12 }, { col: 74, row: 12 },
        { col: 75, row: 12 }, { col: 76, row: 12 },
        { col: 21, row: 7 },  { col: 22, row: 7 },  { col: 23, row: 7 },
        { col: 31, row: 5 },  { col: 32, row: 5 },  { col: 33, row: 5 },
        { col: 83, row: 10 }, { col: 84, row: 10 }, { col: 85, row: 10 },
        { col: 86, row: 10 },
        { col: 65, row: 5 },  { col: 66, row: 5 },
        { col: 64, row: 6 },  { col: 65, row: 6 },  { col: 66, row: 6 },
        { col: 67, row: 6 },  { col: 74, row: 5 },  { col: 75, row: 5 },
        { col: 73, row: 6 },  { col: 74, row: 6 },  { col: 75, row: 6 },
        { col: 76, row: 6 },  { col: 90, row: 12 }, { col: 91, row: 12 },
        // Extended section
        { col: 102, row: 10 }, { col: 103, row: 10 },
        { col: 109, row: 8 },  { col: 110, row: 8 },
        { col: 114, row: 6 },  { col: 115, row: 6 },
        { col: 122, row: 12 }, { col: 123, row: 12 }, { col: 124, row: 12 },
        { col: 129, row: 4 },  { col: 130, row: 4 },  { col: 131, row: 4 },
        { col: 133, row: 12 }, { col: 134, row: 12 },
    ];
    const coins = coinDefs.map(({ col, row }) =>
        new Coin(col * TILE + (TILE - 28) / 2, row * TILE - 32)
    );

    const boxes = [
        new TreasureBox(20, 9, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(25, 9, TILE, (pts) => { player.score += pts; }),
    ];

    const stars = [
        new Star(54 * TILE, 11 * TILE - 64),
        new Star(84 * TILE - 10, 5 * TILE - 64),
        new Star(119 * TILE, 2 * TILE - 64),
    ];

    const groundY = (map.length - 1) * TILE;
    const enemies = [
        new FlyEnemy(50 * TILE, 10 * TILE, map, TILE, { speed: 2, floatAmplitude: 28, floatSpeed: 0.04 }),
        new FlyEnemy(70 * TILE, 6 * TILE,  map, TILE, { speed: 2, floatAmplitude: 28, floatSpeed: 0.04 }),
        new FlyEnemy(120 * TILE, 10 * TILE, map, TILE, { speed: 2, floatAmplitude: 28, floatSpeed: 0.04 }),

        new WalkerEnemy(30 * TILE, groundY, map, TILE, { speed: 1.8, dir: -1 }),
        new WalkerEnemy(80 * TILE, groundY, map, TILE, { speed: 1.8, dir: -1 }),
        new WalkerEnemy(115 * TILE, groundY, map, TILE, { speed: 2,   dir: -1 }),

        new JumperEnemy(30 * TILE, groundY,      map, TILE, { jumpForce: -13, jumpInterval: 120 }),
        new JumperEnemy(45 * TILE, TILE * 7,     map, TILE, { jumpForce: -13, jumpInterval: 120 }),
        new JumperEnemy(70 * TILE, groundY,      map, TILE, { jumpForce: -13, jumpInterval: 150 }),
        new JumperEnemy(110 * TILE, TILE * 4,    map, TILE, { jumpForce: -13, jumpInterval: 130 }),

        new PatrolEnemy(32 * TILE, 6 * TILE,  map, TILE, { speed: 2.5, patrolLeft: 30 * TILE, patrolRight: 35 * TILE }),
        new PatrolEnemy(21 * TILE, groundY,   map, TILE, { speed: 2,   patrolLeft: 19 * TILE, patrolRight: 25 * TILE }),
        new PatrolEnemy(65 * TILE, groundY,   map, TILE, { speed: 2,   patrolLeft: 59 * TILE, patrolRight: 70 * TILE }),
        new PatrolEnemy(108 * TILE, 8 * TILE, map, TILE, { speed: 2.5, patrolLeft: 107 * TILE, patrolRight: 117 * TILE }),
    ];

    return { coins, boxes, stars, enemies };
}