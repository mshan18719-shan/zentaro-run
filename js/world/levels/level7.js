import { FlyEnemy, WalkerEnemy, JumperEnemy, PatrolEnemy } from "../../entities/enemy.js";
import { Coin, TreasureBox, Star } from "../../entities/coin.js";
import { createPlatformsLevel7 } from "../platform.js";

// * ── Door is HIGH UP this time (row 2/3), not at ground level ──
export const DOOR = { col: 147, midRow: 3, topRow: 2 };

// * ── Platform factory ───
export { createPlatformsLevel7 as createLevelPlatforms };

export function createMap() {
    const rows = 15;
    const cols = 150;

    const map = Array.from({ length: rows }, () => new Int8Array(cols));

    // * Default ground
    for (let x = 0; x < cols; x++) map[14][x] = 1;

    // * ZONE 1 — Sky Start  (cols 0–22)

    // * Roof — spawn platform
    for (let x = 15; x <= 23; x++) map[4][x] = 1;
    for (let x = 16; x <= 22; x++) map[5][x] = 15;
    map[12][3] = 12;   // starting board on the roof

    // * Floor A (row 5) — gap at col 11 (right side)
    for (let x = 0; x <= 8; x++) map[6][x] = 1;
    map[5][11] = 0;
    map[8][5] = 0;

    // * Floor C (row 11) — gap at col 17 (far right again)
    for (let x = 0; x <= 18; x++) map[10][x] = 1;
    map[11][17] = 0;

    // * Right wall sealing zone 1
    for (let y = 5; y <= 14; y++) map[y][22] = 8;
    for (let y = 5; y <= 14; y++) map[y][23] = 8;

    // * ZONE 2 — Checkerboard Hell  (cols 24–55)

    for (let x = 24; x <= 34; x++) map[14][x] = 3;

    // * Mid-zone wall 1 (col 35–36), with shelf above
    for (let y = 7; y <= 14; y++) map[y][35] = 8;
    for (let y = 7; y <= 14; y++) map[y][36] = 8;
    for (let x = 33; x <= 37; x++) map[6][x] = 1;
    map[7][33] = 15; map[7][37] = 15;

    // * Mid-zone wall 2 (col 46–47), with shelf above
    for (let y = 7; y <= 14; y++) map[y][46] = 8;
    for (let y = 7; y <= 14; y++) map[y][47] = 8;
    for (let x = 44; x <= 48; x++) map[6][x] = 1;
    map[7][44] = 15; map[7][48] = 15;

    // * Extreme high coin-bait platform (row 3, between walls)
    map[3][40] = 1; map[3][41] = 1;
    map[4][40] = 15; map[4][41] = 15;

    // * Right wall sealing zone 2
    map[5][55] = 1; map[5][56] = 1;
    for (let y = 6; y <= 14; y++) map[y][55] = 8;
    for (let y = 6; y <= 14; y++) map[y][56] = 8;

    // * ZONE 3 — Reverse Climb  (cols 57–80)

    // * Ledge 1 — low (row 11, entry side)
    map[11][57] = 1; map[11][58] = 1; map[11][59] = 1;

    // * Ledge 2 — mid (row 8)
    map[7][61] = 1; map[7][62] = 1; map[7][63] = 1;
    map[8][63] = 15;
    map[8][62] = 15;
    map[8][64] = 15;

    // * Wall B (row 0–9, col 64)
    for (let y = 0; y <= 7; y++) map[y][64] = 8;

    // * Ledge 3 — high (row 5)
    map[5][65] = 1; map[5][66] = 1; map[5][67] = 1;
    map[6][65] = 15; map[6][66] = 15;

    // * Ledge 4 — mid-down (row 8)
    map[9][69] = 1; map[9][70] = 1;
    map[10][69] = 15; map[10][70] = 15; map[10][71] = 15;

    // * Wall D (row 0–9, col 71)
    for (let y = 5; y <= 9; y++) map[y][71] = 8;

    for (let x = 71; x <= 77; x++) map[4][x] = 1;

    // * Ledge 6 — high exit shelf (row 4)
    map[5][75] = 15; map[5][76] = 15; map[5][77] = 15;

    // * ZONE 4 — Bridge-Only Void  (cols 81–110)

    for (let x = 81; x <= 137; x++) map[14][x] = 25;
    for (let x = 93; x <= 94; x++) map[7][x] = 1;
    for (let x = 100; x <= 101; x++) map[7][x] = 1;

    // * Entry shelf
    for (let x = 81; x <= 85; x++) map[10][x] = 1;
    map[11][81] = 15; map[11][85] = 15;

    // Exit shelf
    for (let x = 106; x <= 110; x++) map[11][x] = 1;
    map[11][111] = 8; map[10][111] = 8;
    for (let x = 107; x <= 111; x++) map[12][x] = 15;

    // * ZONE 5 — Underground Tunnel  (cols 111–135)

    // * Tunnel ceiling
    for (let x = 111; x <= 135; x++) map[9][x] = 1;
    // * Spike ceiling hanging below
    for (let x = 112; x <= 134; x++) map[10][x] = 15;

    // * Exit shaft — opens upward at right end of tunnel
    for (let y = 5; y <= 9; y++) map[y][135] = 8;
    for (let y = 5; y <= 9; y++) map[y][136] = 8;
    for (let x = 134; x <= 137; x++) map[4][x] = 1;
    map[5][134] = 15; map[5][137] = 15;

    // * ZONE 6 — Final Eruption  (cols 137–149)

    // * Tiny spike-topped stepping stones
    map[10][139] = 1;
    map[10][143] = 1; map[10][144] = 1;

    // * Mid platform (bridge destination)
    map[7][140] = 1; map[7][141] = 1; map[7][142] = 1;
    map[8][140] = 15; map[8][142] = 15;

    // * Door platform — elevated at row 4
    for (let x = 144; x <= 149; x++) map[4][x] = 1;
    map[5][144] = 15; map[5][149] = 15;

    // todo: Decoration

    // * Fences
    map[7][118] = 17; map[7][119] = 18;

    // * Mashrooms
    map[3][66] = 10; map[7][70] = 11;
     map[9][58] = 11; map[5][62] = 10;
    map[7][124] = 10; map[7][125] = 10;
    map[7][132] = 11; map[7][133] = 11;

    // * Cactus decorations
    map[12][19] = 6; map[12][75] = 6;
    map[3][4] = 7; map[11][148] = 7;

    // * Rocks
    map[13][3] = 9; map[12][57] = 9;
    map[7][121] = 9;
    map[8][84] = 9;

    // * Crystals
    map[12][12] = 13; map[8][2] = 13; map[8][8] = 13;  map[8][14] = 13;  map[2][18] = 13; 
     map[4][35] = 13; map[4][46] = 13; map[2][76] = 13; map[2][77] = 13; map[9][109] = 13;
    map[8][82] = 13; map[12][144] = 13;

    // * Grass
    map[12][1] = 16; map[12][38] = 16; map[12][43] = 16; map[12][51] = 16;  
    map[12][66] = 16; map[12][67] = 16;  map[12][73] = 16; map[12][58] = 16;
    map[7][113] = 16; map[12][140] = 16;

    // ! Door (high up — col 147, rows 2–3)
    map[2][145] = 24;
    map[2][147] = 5;
    map[3][147] = 4;

    return map;
}

export function createLevelEntities(map, TILE, player) {

    const coinDefs = [
        // * Zone 1 — between each falling floor
        { col: 2, row: 3 }, { col: 5, row: 3 }, { col: 15, row: 3 }, { col: 20, row: 3 },  // roof
        { col: 6, row: 8 }, { col: 3, row: 8 }, { col: 15, row: 8 },   // A→B gap
        { col: 9, row: 12 }, { col: 15, row: 12 },  // B→C gap
        { col: 4, row: 12 }, { col: 19, row: 12 },  // ground

        // * Zone 2 — floating above the checkerboard
        { col: 26, row: 11 }, { col: 28, row: 11 }, { col: 31, row: 11 },
        { col: 34, row: 4 }, { col: 36, row: 4 },   // shelf 1
        { col: 39, row: 1 }, { col: 40, row: 1 },   // extreme height bait
        { col: 42, row: 11 }, { col: 44, row: 11 },
        { col: 49, row: 4 }, { col: 51, row: 4 },   // shelf 2

        // * Zone 3 — on each zigzag ledge
        { col: 58, row: 9 },
        { col: 62, row: 6 },
        { col: 66, row: 3 },
        { col: 69, row: 6 },
        { col: 73, row: 9 },
        { col: 76, row: 2 }, { col: 77, row: 2 },

        // * Zone 4 — void crossing
        { col: 83, row: 8 }, { col: 84, row: 8 },
        { col: 91, row: 5 }, { col: 94, row: 5 }, { col: 97, row: 5 },
        { col: 100, row: 5 }, { col: 103, row: 5 },
        { col: 107, row: 8 }, { col: 109, row: 8 },

        // * Zone 5 — tunnel cells (floor level, risky)
        { col: 113, row: 7 },
        { col: 120, row: 7 },
        { col: 127, row: 7 },
        { col: 133, row: 7 },

        // * Zone 6 — ascent to door
        { col: 138, row: 8 }, { col: 140, row: 5 }, { col: 142, row: 5 },
        { col: 145, row: 2 }, { col: 147, row: 2 },
    ];
    const coins = coinDefs.map(({ col, row }) =>
        new Coin(col * TILE + (TILE - 28) / 2, row * TILE - 32)
    );

    const boxes = [
        // Zone 1 — roof reward
        new TreasureBox(4, 1, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(5, 1, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(11, 6, TILE, (pts) => { player.score += pts; }),

        // Zone 4 — entry shelf
        new TreasureBox(82, 6, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(83, 6, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(84, 6, TILE, (pts) => { player.score += pts; }),
    ];

    const stars = [
        new Star(39 * TILE, -1 * TILE),   // Zone 2 — extreme height above void
        new Star(74 * TILE, 6 * TILE),   // Zone 3 — top of exit ledge
        new Star(147 * TILE, 5 * TILE),   // Zone 6 — door platform summit
    ];

    const groundY = (map.length - 1) * TILE;
    const enemies = [
        // * ── Zone 1: Sky Start ─────────────────────────────────────
        new FlyEnemy(6 * TILE, 3 * TILE, map, TILE, { speed: 3.5, floatAmplitude: 18, floatSpeed: 0.06 }),
        new FlyEnemy(14 * TILE, 6 * TILE, map, TILE, { speed: 3.5, floatAmplitude: 18, floatSpeed: 0.06 }),
        new PatrolEnemy(2 * TILE, 6 * TILE, map, TILE, { speed: 4.5, patrolLeft: 0 * TILE, patrolRight: 9 * TILE }),
        new PatrolEnemy(15 * TILE, 4 * TILE, map, TILE, { speed: 4.5, patrolLeft: 15 * TILE, patrolRight: 23 * TILE }),
        new PatrolEnemy(11 * TILE, 10 * TILE, map, TILE, { speed: 4.5, patrolLeft: 6 * TILE, patrolRight: 21 * TILE }),
        new PatrolEnemy(3 * TILE, 10 * TILE, map, TILE, { speed: 5.0, patrolLeft: 0 * TILE, patrolRight: 16 * TILE }),
        new PatrolEnemy(17 * TILE, groundY, map, TILE, { speed: 4.0, patrolLeft: 0 * TILE, patrolRight: 21 * TILE }),
        new JumperEnemy(8 * TILE, 5 * TILE, map, TILE, { jumpForce: -16, jumpInterval: 30 }),
        new JumperEnemy(13 * TILE, 10 * TILE, map, TILE, { jumpForce: -16, jumpInterval: 28 }),

        // * ── Zone 2: Checkerboard Hell ─────────────────────────────
        new FlyEnemy(29 * TILE, 9 * TILE, map, TILE, { speed: 4.0, floatAmplitude: 24, floatSpeed: 0.07 }),
        new FlyEnemy(43 * TILE, 9 * TILE, map, TILE, { speed: 4.0, floatAmplitude: 24, floatSpeed: 0.07 }),
        new FlyEnemy(35 * TILE, 4 * TILE, map, TILE, { speed: 4.5, floatAmplitude: 20, floatSpeed: 0.07 }),
        new FlyEnemy(47 * TILE, 4 * TILE, map, TILE, { speed: 4.5, floatAmplitude: 20, floatSpeed: 0.07 }),
        new PatrolEnemy(34 * TILE, 5 * TILE, map, TILE, { speed: 5.0, patrolLeft: 33 * TILE, patrolRight: 37 * TILE }),
        new PatrolEnemy(45 * TILE, 5 * TILE, map, TILE, { speed: 5.5, patrolLeft: 44 * TILE, patrolRight: 48 * TILE }),
        new PatrolEnemy(39 * TILE, groundY, map, TILE, { speed: 5.5, patrolLeft: 39 * TILE, patrolRight: 45 * TILE }),
        new PatrolEnemy(49 * TILE, groundY, map, TILE, { speed: 5.5, patrolLeft: 49 * TILE, patrolRight: 54 * TILE }),

        // * ── Zone 3: Reverse Climb ─────────────────────────────────
        new PatrolEnemy(57 * TILE, 10 * TILE, map, TILE, { speed: 5.0, patrolLeft: 57 * TILE, patrolRight: 60 * TILE }),
        new PatrolEnemy(61 * TILE, 7 * TILE, map, TILE, { speed: 5.5, patrolLeft: 61 * TILE, patrolRight: 64 * TILE }),
        new PatrolEnemy(65 * TILE, 4 * TILE, map, TILE, { speed: 6.0, patrolLeft: 65 * TILE, patrolRight: 68 * TILE }),
        new PatrolEnemy(72 * TILE, groundY, map, TILE, { speed: 5.5, patrolLeft: 63 * TILE, patrolRight: 74 * TILE }),
        new PatrolEnemy(75 * TILE, 3 * TILE, map, TILE, { speed: 6.5, patrolLeft: 71 * TILE, patrolRight: 78 * TILE }),
        new FlyEnemy(63 * TILE, 7 * TILE, map, TILE, { speed: 4.5, floatAmplitude: 20, floatSpeed: 0.08 }),
        new JumperEnemy(69 * TILE, 9 * TILE, map, TILE, { jumpForce: -17, jumpInterval: 40 }),

        // * ── Zone 4: Bridge-Only Void ──────────────────────────────
        new JumperEnemy(81 * TILE, 9 * TILE, map, TILE, { jumpForce: -17, jumpInterval: 40 }),
        new JumperEnemy(107 * TILE, 9 * TILE, map, TILE, { jumpForce: -17, jumpInterval: 40 }),
        new FlyEnemy(92 * TILE, 5 * TILE, map, TILE, { speed: 5.0, floatAmplitude: 30, floatSpeed: 0.08 }),
        new FlyEnemy(101 * TILE, 5 * TILE, map, TILE, { speed: 5.5, floatAmplitude: 30, floatSpeed: 0.09 }),

        // * ── Zone 5: Underground Tunnel — low jumpers in each cell ──
        new JumperEnemy(115 * TILE, 8 * TILE, map, TILE, { jumpForce: -16, jumpInterval: 30 }),
        new JumperEnemy(122 * TILE, 8 * TILE, map, TILE, { jumpForce: -17, jumpInterval: 28 }),
        new JumperEnemy(129 * TILE, 8 * TILE, map, TILE, { jumpForce: -15, jumpInterval: 25 }),

        // * ── Zone 6: Final Eruption ────────────────────────────────
        new FlyEnemy(141 * TILE, 5 * TILE, map, TILE, { speed: 5.5, floatAmplitude: 22, floatSpeed: 0.09 }),
        new WalkerEnemy(135 * TILE, 9 * TILE, map, TILE, { speed: 5.0, dir: -1 }),
        new PatrolEnemy(135 * TILE, 9, map, TILE, { speed: 7.0, patrolLeft: 111 * TILE, patrolRight: 135 * TILE }),
        new PatrolEnemy(145 * TILE, groundY, map, TILE, { speed: 7.0, patrolLeft: 138 * TILE, patrolRight: 149 * TILE }),
    ];

    return { coins, boxes, stars, enemies };
}