import { FlyEnemy, WalkerEnemy, JumperEnemy, PatrolEnemy } from "../../entities/enemy.js";
import { Coin, TreasureBox, Star } from "../../entities/coin.js";
import { createPlatformsLevel2 } from "../platform.js";

// * ── Door position ───
export const DOOR = { col: 147, midRow: 13, topRow: 12 };

// * ── Platform factory ───
export { createPlatformsLevel2 as createLevelPlatforms };

// * MAP
export function createMap() {
    const rows = 15;
    const cols = 150;

    const map = Array.from({ length: rows }, () => new Int8Array(cols));

    // * Ground floor
    for (let x = 0; x < cols; x++) map[14][x] = 1;

    // * SECTION 1 — Opening ground / safe intro

    map[12][5] = 12;  // * Starting Board

    map[5][24] = 21; map[5][25] = 22; map[5][26] = 22; map[5][27] = 22; map[5][28] = 23;

    map[12][24] = 1; map[12][25] = 1; map[12][26] = 1; map[12][27] = 1;
    map[13][24] = 15; map[13][25] = 15; map[13][26] = 15; map[13][27] = 15;

    map[9][30] = 1; map[9][31] = 1; map[9][32] = 1; map[9][33] = 1;
    map[10][30] = 15; map[10][31] = 15; map[10][32] = 15; map[10][33] = 15;

    // * SECTION 2 — First staircase / elevation
    map[13][40] = 1; map[13][41] = 1; map[14][41] = 8; map[14][40] = 8;
    map[12][42] = 8; map[13][42] = 8; map[14][42] = 8;
    map[11][42] = 1; map[11][43] = 1; map[12][43] = 8; map[13][43] = 8; map[14][43] = 8;
    map[10][44] = 1; map[11][44] = 8; map[12][44] = 8; map[13][44] = 8; map[14][44] = 8;

    // ? Water
    for (let x = 45; x <= 50; x++) map[14][x] = 3;

    // * SECTION 3 — Long river with bridge crossings
    for (let x = 58; x <= 84; x++) map[14][x] = 3;

    // * Bridge / stepping crossing 1
    map[11][60] = 1; map[11][61] = 1;
    map[10][65] = 1; map[10][66] = 1;
    map[11][70] = 1; map[11][71] = 1;

    // * SECTION 4 — After river: mixed hurdles
    map[4][87] = 1; map[4][89] = 1; map[4][91] = 1; map[4][93] = 1; map[4][95] = 1;
    map[5][87] = 15; map[5][91] = 15; map[5][95] = 15;

    map[9][86] = 1; map[9][88] = 1; map[9][90] = 1; map[9][92] = 1; map[9][94] = 1;
    map[10][86] = 15; map[10][90] = 15; map[10][94] = 15;

    // * SECTION 5 — Broken floor + narrow safe spaces
    for (let x = 104; x <= 119; x++) map[14][x] = 3;

    map[8][102] = 1; map[8][103] = 1;
    for (let y = 9; y <= 14; y++) map[y][102] = 8;
    for (let y = 9; y <= 14; y++) map[y][103] = 8;

    map[8][119] = 1; map[8][120] = 1;
    for (let y = 9; y <= 14; y++) map[y][119] = 8;
    for (let y = 9; y <= 14; y++) map[y][120] = 8;

    for (let y = 0; y <= 4; y++) map[y][117] = 8;
    for (let y = 0; y <= 4; y++) map[y][118] = 8;
    for (let x = 102; x <= 118; x++) map[4][x] = 8;
    for (let x = 102; x <= 116; x++) map[3][x] = 1;

    // * SECTION 6 — Final staircase to end zone
    for (let x = 121; x <= 141; x++) map[14][x] = 25; // black-hole floor
    for (let x = 123; x <= 137; x++) map[10][x] = 1;

    // * Safe ground strip before door
    for (let x = 142; x <= 149; x++) map[14][x] = 1;

    // todo: Decoration
    // * Mashrooms
    map[2][91] = 10; map[2][95] = 11; map[1][107] = 11;
    map[7][88] = 11; map[7][92] = 10; 
    // * Rock
    map[12][7] = 9; map[3][24] = 9;
    map[12][98] = 9; map[12][100] = 9;
    map[9][42] = 9; map[8][130] = 9;
    // * Grass
    map[3][26] = 16; map[12][38] = 16;
    map[12][15] = 16; map[7][32] = 16; map[12][96] = 16;
    map[1][103] = 16; map[1][104] = 16; map[1][105] = 16; 
    map[8][129] = 16; map[8][132] = 16; map[12][143] = 16;
    // * Cactus
    map[12][4] = 6; map[12][19] = 6;
    map[12][33] = 6; map[12][54] = 6; map[12][86] = 6;
    map[1][113] = 6; map[12][142] = 6;
    map[8][125] = 6; map[8][135] = 6;
    // * Crystal
    map[12][11] = 13; map[12][36] = 13;
    map[12][56] = 13; map[12][52] = 13;  map[12][89] = 13; map[1][111] = 13;

    // ! Door at col 147
    map[12][145] = 24;
    map[12][147] = 5;
    map[13][147] = 4;

    return map;
}

export function createLevelEntities(map, TILE, player) {
    const coinDefs = [
        { col: 12, row: 12 }, { col: 13, row: 12 }, { col: 14, row: 12 },
        { col: 24, row: 4 }, { col: 25, row: 4 }, { col: 26, row: 4 }, { col: 27, row: 4 },
        { col: 24, row: 8 }, { col: 24, row: 9 }, { col: 24, row: 10 },
        { col: 27, row: 8 }, { col: 27, row: 9 }, { col: 27, row: 10 },
        { col: 33, row: 3 }, { col: 33, row: 4 },
        { col: 47, row: 7 }, { col: 48, row: 8 }, { col: 49, row: 9 }, { col: 50, row: 10 },
        { col: 108, row: 2 }, { col: 109, row: 2 }, { col: 110, row: 2 }, { col: 111, row: 2 },
        { col: 126, row: 3 }, { col: 126, row: 4 }, { col: 126, row: 5 },
        { col: 133, row: 3 }, { col: 133, row: 4 }, { col: 133, row: 5 },
        { col: 53, row: 10 }, { col: 54, row: 9 },
    ];
    const coins = coinDefs.map(({ col, row }) =>
        new Coin(col * TILE + (TILE - 28) / 2, row * TILE - 32)
    );

    const boxes = [
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

    const stars = [
        new Star(26 * TILE, 9 * TILE - 64),
        new Star(76 * TILE, 2 * TILE - 64),
        new Star(115 * TILE - 10, 10 * TILE - 64),
    ];

    const groundY = (map.length - 1) * TILE;
    const enemies = [
        new FlyEnemy(25 * TILE,  7 * TILE,  map, TILE, { speed: 2.2, floatAmplitude: 28, floatSpeed: 0.04 }),
        new FlyEnemy(55 * TILE,  5 * TILE,  map, TILE, { speed: 2.5, floatAmplitude: 28, floatSpeed: 0.09 }),
        new FlyEnemy(80 * TILE,  8 * TILE,  map, TILE, { speed: 2,   floatAmplitude: 28, floatSpeed: 0.04 }),
        new FlyEnemy(100 * TILE, 11 * TILE, map, TILE, { speed: 2,   floatAmplitude: 28, floatSpeed: 0.04 }),
        new FlyEnemy(130 * TILE, 6 * TILE,  map, TILE, { speed: 2,   floatAmplitude: 28, floatSpeed: 0.07 }),

        new WalkerEnemy(27 * TILE, 12 * TILE, map, TILE, { speed: 2, dir: 1 }),

        new JumperEnemy(18 * TILE, groundY,      map, TILE, { jumpForce: -17, jumpInterval: 100 }),
        new JumperEnemy(43 * TILE, TILE * 10,    map, TILE, { jumpForce: -14, jumpInterval: 100 }),
        new JumperEnemy(60 * TILE, TILE * 10,    map, TILE, { jumpForce: -13, jumpInterval: 70 }),
        new JumperEnemy(66 * TILE, TILE * 10,    map, TILE, { jumpForce: -13, jumpInterval: 50 }),
        new JumperEnemy(70 * TILE, TILE * 10,    map, TILE, { jumpForce: -13, jumpInterval: 35 }),
        new JumperEnemy(99 * TILE, groundY,      map, TILE, { jumpForce: -22, jumpInterval: 35 }),

        new PatrolEnemy(16 * TILE,  8 * TILE, map, TILE, { speed: 2.5, patrolLeft: 12 * TILE, patrolRight: 22 * TILE }),
        new PatrolEnemy(32 * TILE,  8 * TILE, map, TILE, { speed: 2.8, patrolLeft: 30 * TILE, patrolRight: 33 * TILE }),
        new PatrolEnemy(35 * TILE,  groundY,  map, TILE, { speed: 3.5, patrolLeft: 28 * TILE, patrolRight: 41 * TILE }),
        new PatrolEnemy(54 * TILE,  groundY,  map, TILE, { speed: 4,   patrolLeft: 51 * TILE, patrolRight: 57 * TILE }),
        new PatrolEnemy(87 * TILE,  3 * TILE, map, TILE, { speed: 4.5, patrolLeft: 87 * TILE, patrolRight: 97 * TILE }),
        new PatrolEnemy(86 * TILE,  7 * TILE, map, TILE, { speed: 3.5, patrolLeft: 86 * TILE, patrolRight: 96 * TILE }),
        new PatrolEnemy(96 * TILE,  7 * TILE, map, TILE, { speed: 3.5, patrolLeft: 86 * TILE, patrolRight: 96 * TILE }),
        new PatrolEnemy(85 * TILE,  7 * TILE, map, TILE, { speed: 4,   patrolLeft: 85 * TILE, patrolRight: 102 * TILE }),
        new PatrolEnemy(102 * TILE, 7 * TILE, map, TILE, { speed: 4,   patrolLeft: 85 * TILE, patrolRight: 102 * TILE }),
        new PatrolEnemy(102 * TILE, 2 * TILE, map, TILE, { speed: 4.5, patrolLeft: 102 * TILE, patrolRight: 116 * TILE }),
        new PatrolEnemy(116 * TILE, 2 * TILE, map, TILE, { speed: 4.5, patrolLeft: 102 * TILE, patrolRight: 116 * TILE }),
        new PatrolEnemy(123 * TILE, 2 * TILE, map, TILE, { speed: 4.5, patrolLeft: 123 * TILE, patrolRight: 137 * TILE }),
    ];

    return { coins, boxes, stars, enemies };
}