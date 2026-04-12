//  world/levels/level6.js  —  "The Gauntlet"

import { FlyEnemy, WalkerEnemy, JumperEnemy, PatrolEnemy } from "../../entities/enemy.js";
import { Coin, TreasureBox, Star } from "../../entities/coin.js";
import { createPlatformsLevel6 } from "../platform.js";

// ── Door position ─────────────────────────────────────────────
export const DOOR = { col: 148, midRow: 13, topRow: 12 };

// ── Platform factory ──────────────────────────────────────────
export { createPlatformsLevel6 as createLevelPlatforms };

export function createMap() {
    const rows = 15;
    const cols = 150;

    const map = Array.from({ length: rows }, () => new Int8Array(cols));

    // ── Ground floor (standard, will be overridden in hazard zones) ─
    for (let x = 0; x < cols; x++) map[14][x] = 1;

    // * ZONE 1 — Descent Alley  (cols 0–25)

    // Starting board + big cactus
    map[12][1] = 12;
    map[11][3] = 7;

    // Upper road — player starts high
    for (let x = 0; x <= 7; x++) map[6][x] = 1;
    map[7][0] = 15; map[7][1] = 15; map[7][2] = 15; // spike ceiling under upper road

    // First drop ledge
    for (let x = 9; x <= 13; x++) map[8][x] = 1;
    map[9][9] = 15; map[9][10] = 15; map[9][11] = 15;

    // Second drop ledge
    for (let x = 15; x <= 19; x++) map[10][x] = 1;


    // Cactus + rock decorations
    map[12][4] = 6;   // cactus
    map[12][22] = 9;   // rock
    map[12][24] = 13;  // crystal
    map[5][6] = 16;  // grass on upper road

    // Long left wall — forces player to navigate around it
    for (let y = 0; y <= 8; y++) map[y][25] = 8;
    for (let y = 0; y <= 8; y++) map[y][26] = 8;

    // * ZONE 2 — River of Doom  (cols 27–55)

    // Replace ground with water for the whole zone
    for (let x = 27; x <= 54; x++) map[14][x] = 3;  // water tile (top)

    // Left bank decoration
    map[12][25] = 6;                      // cactus on bank

    // Raised platform over water — reward for going high
    for (let x = 37; x <= 40; x++) map[8][x] = 1;
    map[9][37] = 15; map[9][40] = 15;   // spike on platform ends

    // Right bank spikes + wall
    map[9][55] = 1;
    for (let y = 10; y <= 14; y++) map[y][55] = 8;  // right bank wall

    // * ZONE 3 — The Labyrinth  (cols 56–85)

    // Corridor 1: low ceiling passageway (rows 10–14, cols 56–65)
    for (let x = 56; x <= 66; x++) map[10][x] = 1;  // ceiling
    for (let x = 57; x <= 64; x++) map[11][x] = 15; // spike ceiling (under the floor above)
    // Right wall sealing corridor 1
    map[11][65] = 8; map[11][66] = 8;

    // Upper path above corridor 1
    for (let x = 56; x <= 66; x++) map[4][x] = 1;
    map[5][56] = 15; map[5][65] = 15;  // spike hazards on upper path

    // Corridor 2: mid height (rows 7–9, cols 68–78)
    for (let x = 69; x <= 78; x++) map[7][x] = 1;   // upper wall
    for (let x = 72; x <= 78; x++) map[9][x] = 1;   // lower wall (narrow gap)
    map[8][78] = 15;

    // Wall sealing corridor 2 on the right
    for (let y = 0; y <= 9; y++) map[y][78] = 8;
    for (let y = 0; y <= 9; y++) map[y][79] = 8;
    for (let x = 76; x <= 79; x++) map[10][x] = 15;

    // High reward shelf
    for (let x = 80; x <= 84; x++) map[3][x] = 1;

    // * ZONE 4 — Black Hole Valley  (cols 86–110)

    for (let x = 85; x <= 110; x++) map[14][x] = 25; // black hole floor

    // Stepped floating platforms
    map[9][86] = 1; map[9][87] = 1; map[9][88] = 1;
    map[6][91] = 1; map[6][92] = 1; map[6][93] = 1;
    map[4][96] = 1; map[4][97] = 1;                   // highest point
    map[6][100] = 1; map[6][101] = 1; map[6][102] = 1;
    map[9][105] = 1; map[9][106] = 1; map[9][107] = 1;
    // Spike traps on platforms
    map[10][86] = 15;
    map[7][93] = 15;
    map[10][107] = 15;

    // Ledge above the void to tempt a risky jump
    for (let x = 108; x <= 110; x++) map[11][x] = 1;
    map[12][108] = 15; map[12][110] = 15;

    // Crystal & big-cactus visible near the black hole edge
    map[12][84] = 7;   // big cactus silhouette before void

    // * ZONE 5 — Sky Fortress  (cols 111–135)

    // Lower ground restored here
    for (let x = 111; x <= 149; x++) map[14][x] = 1;

    // Upper road — long elevated highway
    for (let x = 111; x <= 118; x++) map[4][x] = 1;
    for (let x = 122; x <= 126; x++) map[4][x] = 1;
    for (let x = 130; x <= 135; x++) map[4][x] = 1;

    // Vertical walls creating the "fortress" feel
    for (let y = 5; y <= 14; y++) map[y][114] = 8;
    for (let y = 5; y <= 14; y++) map[y][115] = 8;

    for (let y = 5; y <= 14; y++) map[y][122] = 8;
    for (let y = 5; y <= 14; y++) map[y][123] = 8;

    for (let y = 5; y <= 14; y++) map[y][130] = 8;
    for (let y = 5; y <= 14; y++) map[y][131] = 8;

    // Drop-down slots in upper road (two-tile gaps between walls)
    // Slot 1: col 116 (between walls 115 and 122) — gap in upper road already implicit
    // Add a mid-ledge to break the fall
    map[9][118] = 1; map[9][119] = 1;

    // Slot 2: col 124 gap — mid ledge
    map[9][126] = 1; map[9][127] = 1;


    // Decorations
    map[3][112] = 13;  // crystal near fort entrance
    map[3][133] = 16;  // grass at upper road end
    map[12][132] = 6;  // cactus below
    map[12][135] = 9;  // rock near end

    // Safe stepping stones through the spikes
    map[10][136] = 1; map[10][137] = 1;
    map[10][140] = 1; map[10][141] = 1;

    // Door setup
    map[12][146] = 24;  // exit sign
    map[12][148] = 5;   // door top
    map[13][148] = 4;   // door body

    return map;
}

// ══════════════════════════════════════════════════════════════
//  ENTITIES
// ══════════════════════════════════════════════════════════════
export function createLevelEntities(map, TILE, player) {

    // * ── Coins ─────────────────────────────────────────────────
    const coinDefs = [
        // Zone 1 — descent ledges
        { col: 2, row: 4 }, { col: 4, row: 4 }, { col: 6, row: 4 },
        { col: 10, row: 6 }, { col: 12, row: 6 },
        { col: 16, row: 8 }, { col: 18, row: 8 },
        { col: 22, row: 11 }, { col: 23, row: 11 },

        // Zone 2 — river crossing
        { col: 33, row: 10 }, { col: 34, row: 10 },
        { col: 37, row: 6 }, { col: 38, row: 6 }, { col: 39, row: 6 },
        { col: 44, row: 10 }, { col: 45, row: 10 },
        { col: 48, row: 4 }, { col: 50, row: 4 }, { col: 52, row: 4 },

        // Zone 3 — labyrinth corridors
        { col: 58, row: 9 }, { col: 60, row: 9 }, { col: 62, row: 9 },
        { col: 58, row: 2 }, { col: 60, row: 2 }, { col: 63, row: 2 },
        { col: 70, row: 5 }, { col: 72, row: 5 }, { col: 74, row: 5 },
        { col: 71, row: 11 }, { col: 73, row: 11 },
        { col: 81, row: 1 }, { col: 82, row: 1 }, { col: 83, row: 1 },

        // Zone 4 — black hole valley
        { col: 87, row: 7 }, { col: 88, row: 7 },
        { col: 92, row: 4 },
        { col: 97, row: 2 }, { col: 98, row: 2 },         // highest platform reward
        { col: 100, row: 4 }, { col: 102, row: 4 },
        { col: 105, row: 7 }, { col: 107, row: 7 },
        { col: 109, row: 9 }, { col: 110, row: 9 },

        // Zone 5 — sky fortress
        { col: 112, row: 2 }, { col: 114, row: 2 },
        { col: 116, row: 2 }, { col: 118, row: 2 }, { col: 120, row: 2 },
        { col: 117, row: 7 }, { col: 119, row: 7 },
        { col: 124, row: 2 }, { col: 126, row: 2 }, { col: 128, row: 2 },
        { col: 125, row: 7 }, { col: 127, row: 7 },
        { col: 132, row: 2 }, { col: 134, row: 2 },

        // Zone 6 — final sprint
        { col: 136, row: 8 }, { col: 137, row: 8 },
        { col: 140, row: 8 }, { col: 141, row: 8 },
        { col: 144, row: 2 }, { col: 146, row: 2 },
    ];
    const coins = coinDefs.map(({ col, row }) =>
        new Coin(col * TILE + (TILE - 28) / 2, row * TILE - 32)
    );

    // * ── Treasure Boxes ────────────────────────────────────────
    const boxes = [
        // Zone 1 — top of the descent, guarded by spike corridor
        new TreasureBox(2, 5, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(3, 5, TILE, (pts) => { player.score += pts; }),

        // Zone 4 — floating on the highest void platform
        new TreasureBox(96, 3, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(97, 3, TILE, (pts) => { player.score += pts; }),

        // Zone 5 — fortress upper road, late zone reward
        new TreasureBox(132, 3, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(133, 3, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(134, 3, TILE, (pts) => { player.score += pts; }),
    ];

    // * ── Stars ─────────────────────────────────────────────────
    const stars = [
        new Star(38 * TILE, 5 * TILE - 64),   // Zone 2 — elevated river platform
        new Star(97 * TILE, 1 * TILE - 64),   // Zone 4 — top of the void
        new Star(133 * TILE - 10, 1 * TILE - 64),   // Zone 5 — fortress summit
    ];

    // * ── Enemies ───────────────────────────────────────────────
    const groundY = (map.length - 1) * TILE;
    const enemies = [

        // ── FlyEnemies — patrol above gaps & spike zones ────────
        new FlyEnemy( 5 * TILE,   4 * TILE,  map, TILE, { speed: 3.2, floatAmplitude: 22, floatSpeed: 0.060 }),
        new FlyEnemy(17 * TILE,   7 * TILE,  map, TILE, { speed: 3.5, floatAmplitude: 26, floatSpeed: 0.065 }),
        new FlyEnemy(35 * TILE,   6 * TILE,  map, TILE, { speed: 3.8, floatAmplitude: 28, floatSpeed: 0.070 }),
        new FlyEnemy(48 * TILE,   9 * TILE,  map, TILE, { speed: 4.0, floatAmplitude: 30, floatSpeed: 0.075 }),
        new FlyEnemy(70 * TILE,   4 * TILE,  map, TILE, { speed: 4.0, floatAmplitude: 24, floatSpeed: 0.070 }),
        new FlyEnemy(92 * TILE,   2 * TILE,  map, TILE, { speed: 4.5, floatAmplitude: 32, floatSpeed: 0.080 }),
        new FlyEnemy(120 * TILE,  1 * TILE,  map, TILE, { speed: 4.5, floatAmplitude: 28, floatSpeed: 0.080 }),
        new FlyEnemy(140 * TILE,  7 * TILE,  map, TILE, { speed: 5.0, floatAmplitude: 26, floatSpeed: 0.085 }),

        // ── WalkerEnemies — fast ground threats ─────────────────
        new WalkerEnemy( 22 * TILE, groundY,      map, TILE, { speed: 3.5, dir:  1 }),
        new WalkerEnemy(147 * TILE, groundY, map, TILE, { speed: 5.0, dir: -1 }),

        // ── JumperEnemies — unpredictable launch threats ─────────
        new JumperEnemy(  8 * TILE, groundY,      map, TILE, { jumpForce: -18, jumpInterval: 40 }),
        new JumperEnemy( 87 * TILE, 8  * TILE,    map, TILE, { jumpForce: -18, jumpInterval: 50 }),
        new JumperEnemy(106 * TILE, 8  * TILE,    map, TILE, { jumpForce: -18, jumpInterval: 50 }),
        new JumperEnemy(120 * TILE, groundY, map, TILE, { jumpForce: -20, jumpInterval: 35 }),
        new JumperEnemy(128 * TILE, groundY, map, TILE, { jumpForce: -22, jumpInterval: 30 }),

        // ── PatrolEnemies — tight corridor guards ────────────────
        // Zone 1 — descent corridor guards
        new PatrolEnemy(  4 * TILE,  5 * TILE,  map, TILE, { speed: 4.0, patrolLeft:  0 * TILE, patrolRight:  7 * TILE }),
        new PatrolEnemy( 10 * TILE,  7 * TILE,  map, TILE, { speed: 4.0, patrolLeft:  9 * TILE, patrolRight: 13 * TILE }),
        new PatrolEnemy( 19 * TILE,  groundY,  map, TILE, { speed: 4.0, patrolLeft:  12 * TILE, patrolRight: 19 * TILE }),

        // Zone 3 — labyrinth corridor guards
        new PatrolEnemy( 60 * TILE,  9 * TILE,  map, TILE, { speed: 5.0, patrolLeft: 57 * TILE, patrolRight: 64 * TILE }),
        new PatrolEnemy( 57 * TILE,  4 * TILE,  map, TILE, { speed: 5.0, patrolLeft: 56 * TILE, patrolRight: 65 * TILE }),
        new PatrolEnemy( 70 * TILE,  6 * TILE,  map, TILE, { speed: 5.5, patrolLeft: 69 * TILE, patrolRight: 78 * TILE }),
        new PatrolEnemy( 68 * TILE,  8 * TILE,  map, TILE, { speed: 5.0, patrolLeft: 68 * TILE, patrolRight: 79 * TILE }),
        new PatrolEnemy( 82 * TILE,  2 * TILE,  map, TILE, { speed: 4.5, patrolLeft: 80 * TILE, patrolRight: 84 * TILE }),

        // Zone 4 — black hole valley, floating platform guards
        new PatrolEnemy( 91 * TILE,  5 * TILE,  map, TILE, { speed: 4, patrolLeft: 91 * TILE, patrolRight: 94 * TILE }),
        new PatrolEnemy(100 * TILE,  5 * TILE,  map, TILE, { speed: 4, patrolLeft: 100 * TILE, patrolRight: 103 * TILE }),

        // Zone 5 — sky fortress upper road
        new PatrolEnemy(113 * TILE,  3 * TILE,  map, TILE, { speed: 3.5, patrolLeft: 111 * TILE, patrolRight: 117 * TILE }),
        new PatrolEnemy(118 * TILE,  3 * TILE,  map, TILE, { speed: 4, patrolLeft: 116 * TILE, patrolRight: 122 * TILE }),
        new PatrolEnemy(126 * TILE,  3 * TILE,  map, TILE, { speed: 6.0, patrolLeft: 124 * TILE, patrolRight: 130 * TILE }),

        // Zone 6 — final sprint double-guard
        new PatrolEnemy(137 * TILE, 9 * TILE, map, TILE, { speed: 6.0, patrolLeft: 136 * TILE, patrolRight: 141 * TILE }),
        new PatrolEnemy(144 * TILE, 3 * TILE, map, TILE, { speed: 7.0, patrolLeft: 143 * TILE, patrolRight: 149 * TILE }),
    ];

    return { coins, boxes, stars, enemies };
}