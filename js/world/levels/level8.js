//  world/levels/level8.js  —  "The Abyss"

import { FlyEnemy, WalkerEnemy, JumperEnemy, PatrolEnemy } from "../../entities/enemy.js";
import { Coin, TreasureBox, Star } from "../../entities/coin.js";
import { createPlatformsLevel8 } from "../platform.js";

// * ── Door is HIGH — row 2/3 ────────────────────────────────────
export const DOOR = { col: 148, midRow: 9, topRow: 8 };

// * ── Platform factory ──────────────────────────────────────────
export { createPlatformsLevel8 as createLevelPlatforms };

export function createMap() {
    const rows = 15;
    const cols = 150;

    const map = Array.from({ length: rows }, () => new Int8Array(cols));

    // * Default ground — will be overridden zone by zone
    for (let x = 0; x < cols; x++) map[14][x] = 1;

    // * ZONE 1 — Spike Gauntlet  (cols 0–20)
    map[12][1] = 12;  // * starting board
    map[11][3] = 7;   // * big cactus

    // * Four safe 1-tile stepping stones sitting above the spike floor
    map[11][4] = 1;
    map[11][13] = 1;
    map[11][18] = 1;

    // * Low ceiling forces player to run along bottom, can't jump high
    for (let x = 0; x <= 18; x++) map[5][x] = 1;
    for (let x = 1; x <= 17; x++) map[6][x] = 15; // spike ceiling

    // * Right wall sealing zone 1
    map[10][21] = 1;
    map[10][22] = 1;
    for (let y = 11; y <= 14; y++) map[y][21] = 8;
    for (let y = 11; y <= 14; y++) map[y][22] = 8;


    // * ZONE 2 — Triple-Floor Descent  (cols 23–45)
    for (let x = 23; x <= 44; x++) map[4][x] = 1;
    map[4][35] = 0; map[4][36] = 0; map[4][37] = 0; map[4][38] = 0; map[4][39] = 0;
    map[5][23] = 15; map[5][34] = 15; map[5][46] = 15; map[5][45] = 15;

    // * Floor B — row 7, gap at col 25 (left side)
    for (let y = 5; y <= 9; y++) map[y][40] = 8;
    for (let x = 33; x <= 39; x++) map[9][x] = 1;
    for (let x = 36; x <= 40; x++) map[10][x] = 15;

    // * Floor C — row 10, gap at col 40 (right-center)
    for (let x = 23; x <= 28; x++) map[10][x] = 1;
    map[11][23] = 15;

    // * Right wall sealing zone 2
    for (let y = 0; y <= 4; y++) map[y][45] = 8;
    for (let y = 0; y <= 4; y++) map[y][46] = 8;

    // * ZONE 3 — Water & Stone  (cols 47–68)
    for (let x = 47; x <= 68; x++) map[14][x] = 3; // ? water

    // * Four 1-tile stone islands (row 11 — player must hop between them)
    map[11][50] = 1;
    map[11][54] = 1;
    map[11][59] = 1;
    map[11][64] = 1;

    // * Spike trap under every island (makes missing = instant death)
    map[12][50] = 15;
    map[12][54] = 15;
    map[12][59] = 15;
    map[12][64] = 15;

    // * High reward platform (row 5) over the middle of the river
    map[6][57] = 1; map[6][58] = 1;
    map[7][57] = 15; map[7][58] = 15;

    // * Right wall sealing zone 3
    map[6][68] = 1; map[6][69] = 1;
    for (let y = 7; y <= 14; y++) map[y][68] = 8;
    for (let y = 7; y <= 14; y++) map[y][69] = 8;

    // * ZONE 4 — Void Labyrinth  (cols 70–100)
    // Black hole floor — entire zone
    for (let x = 70; x <= 100; x++) map[14][x] = 25;

    // * Platform 1 — low  (row 9, cols 71–72)
    map[9][71] = 1; map[9][72] = 1;
    map[10][71] = 15;

    // * Platform 2 — mid  (row 6, cols 77–78)
    map[6][77] = 1; map[6][78] = 1; map[6][79] = 1; map[6][80] = 1;
    map[7][77] = 15; map[7][78] = 15; map[7][79] = 15; map[7][80] = 15;

    // * Platform 3 — high  (row 3, cols 83–84)
    map[3][84] = 1; map[3][85] = 1;
    map[4][84] = 15; map[4][85] = 15;


    // * Platform 4 — descending mid  (row 6, cols 89–90)
    map[6][89] = 1; map[6][90] = 1; map[6][91] = 1;
    map[7][89] = 15; map[7][91] = 15;

    // * Exit shelf (row 9, cols 98–100) — safe landing before zone 5
    map[9][96] = 1; map[9][97] = 1; map[9][98] = 1;
    map[10][96] = 15;

    // * ZONE 5 — Spike Corridor  (cols 101–120)
    // * Exit shaft — upward opening at right end of tunnel
    for (let y = 3; y <= 14; y++) map[y][120] = 8;
    for (let y = 3; y <= 14; y++) map[y][121] = 8;
    // * Exit platform above shaft
    map[4][119] = 15; map[4][122] = 15;

    // * ZONE 6 — Sky Pillars  (cols 122–140)
    // * Spike floor under the pillar section
    for (let x = 122; x <= 149; x++) map[14][x] = 25;

    // * Landing shelf after exit shaft (cols 123–127, row 3)
    for (let x = 119; x <= 127; x++) map[3][x] = 1;
    map[4][123] = 15; map[4][127] = 15;
    // * Toehold ledge on left face of pillar 1 (col 127, row 8) — 1 tile
    map[8][127] = 1;
    map[9][127] = 15; // spike under toehold

    // * Pillar 2 — wall (cols 134–135, rows 4–12)
    for (let y = 6; y <= 14; y++) map[y][134] = 8;
    for (let y = 6; y <= 14; y++) map[y][135] = 8;
    // * Toehold ledge on left face of pillar 2 (col 133, row 8) — 1 tile
    map[8][133] = 1;
    map[9][133] = 15;

    // * Landing pad right of pillar 2 (cols 136–138, row 4) — leads to zone 7
    for (let x = 134; x <= 138; x++) map[5][x] = 1;
    map[6][136] = 15; map[6][138] = 15;

    // * ZONE 7 — Final Altar  (cols 139–149)
    for (let x = 144; x <= 149; x++) map[10][x] = 1;
    map[11][144] = 15; map[11][145] = 15;

    // * Door platform (row 3, cols 144–149) — elevated
    for (let x = 144; x <= 149; x++) map[3][x] = 1;
    map[4][144] = 15; map[4][149] = 15;

    // todo: Decoration

    // * Fences
    map[12][110] = 17; map[12][111] = 18;

    // * Mashrooms
    map[3][16] = 10; map[2][43] = 11; map[7][35] = 11;
    map[2][27] = 10; map[2][31] = 11; map[1][147] = 11;

    // * Cactus decorations
    map[3][7] = 6; map[12][45] = 6; map[12][43] = 6; map[12][118] = 6;

    // * Rocks
    map[12][10] = 9; map[12][25] = 9; map[12][26] = 9; map[8][24] = 9;
    map[4][78] = 9; map[12][102] = 9;

    // * Crystals
    map[12][16] = 13; map[3][6] = 13; map[3][9] = 13; map[12][116] = 13;
    map[1][123] = 13; map[1][124] = 13; map[3][136] = 13;

    // * Grass
    map[12][9] = 16; map[8][25] = 16; map[12][42] = 16;
    map[12][108] = 16; map[12][113] = 16;

    // ! Exit sign + Door (col 147, rows 2–3)
    map[8][146] = 24;  // exit sign
    map[8][148] = 5;   // door top
    map[9][148] = 4;   // door body

    return map;
}

export function createLevelEntities(map, TILE, player) {

    // * ── Coins ───
    const coinDefs = [
        // * Zone 1 — above each safe stone (reward for perfect hops)
        { col: 4, row: 9 },
        { col: 8, row: 9 },
        { col: 13, row: 9 },
        { col: 18, row: 9 },

        { col: 4, row: 3 }, { col: 8, row: 3 }, { col: 13, row: 3 },

        // * Zone 2 — one coin in each chamber between floors
        { col: 27, row: 2 }, { col: 33, row: 2 }, { col: 41, row: 2 }, // on floor A
        { col: 26, row: 7 }, { col: 32, row: 7 }, { col: 37, row: 7 }, // between A and B
        { col: 28, row: 8 }, { col: 35, row: 8 }, { col: 43, row: 8 }, // between B and C

        // * Zone 3 — above each island
        { col: 50, row: 9 },
        { col: 54, row: 9 },
        { col: 59, row: 9 },
        { col: 64, row: 9 },
        { col: 57, row: 3 }, { col: 58, row: 3 }, // high reward platform

        // * Zone 4 — on each floating platform
        { col: 71, row: 7 },
        { col: 77, row: 4 }, { col: 79, row: 4 },
        { col: 84, row: 1 }, { col: 85, row: 1 }, // highest point
        { col: 90, row: 4 },
        { col: 96, row: 7 },

        // * Zone 5 — above each safe floor tile (risky to reach)
        { col: 104, row: 10 },
        { col: 110, row: 10 },
        { col: 117, row: 10 },

        // * Zone 6 — on ledge toeholds and landing pads
        { col: 127, row: 6 },
        { col: 130, row: 2 }, { col: 131, row: 2 },
        { col: 133, row: 6 },
        { col: 136, row: 2 }, { col: 137, row: 2 }, { col: 138, row: 2 },

        // * Zone 7 — ascent to door
        { col: 141, row: 8 },
        { col: 144, row: 8 }, { col: 145, row: 8 },
        { col: 146, row: 1 }, { col: 147, row: 1 },
    ];
    const coins = coinDefs.map(({ col, row }) =>
        new Coin(col * TILE + (TILE - 28) / 2, row * TILE - 32)
    );

    // * ── Treasure Boxes ───
    const boxes = [
        // * Zone 2 — top chamber, very hard to reach
        new TreasureBox(24, 2, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(25, 2, TILE, (pts) => { player.score += pts; }),

        // * Zone 6 — top of pillar landing pads
        new TreasureBox(136, 0, TILE, (pts) => { player.score += pts; }),
        new TreasureBox(137, 0, TILE, (pts) => { player.score += pts; }),
    ];

    // * ── Stars ───
    const stars = [
        new Star(58 * TILE - 25, 2 * TILE - 64),
        new Star(84 * TILE + 16, 0 * TILE - 32),
        new Star(147 * TILE, 1 * TILE - 64),
    ];

    // * ── Enemies ───
    const groundY = (map.length - 1) * TILE;
    const enemies = [

        // * ══ Zone 1: Spike Gauntlet ═══
        // ! Two fly enemies sweep the ceiling passage — force precision
        new FlyEnemy(5  * TILE, 8 * TILE, map, TILE, { speed: 3.5, floatAmplitude: 18, floatSpeed: 0.065 }),
        new FlyEnemy(14 * TILE, 8 * TILE, map, TILE, { speed: 4.0, floatAmplitude: 20, floatSpeed: 0.070 }),

        // * Patrol on the ceiling road — guards the escape route
        new PatrolEnemy(3  * TILE, 5 * TILE, map, TILE, { speed: 5.0, patrolLeft: 0 * TILE,  patrolRight: 10 * TILE }),
        new PatrolEnemy(14 * TILE, 5 * TILE, map, TILE, { speed: 5.5, patrolLeft: 10 * TILE, patrolRight: 18 * TILE }),

        // ? Jumper on safe stone 2 — bounces to block the path
        new JumperEnemy(8 * TILE, groundY, map, TILE, { jumpForce: -15, jumpInterval: 28 }),

        // * ══ Zone 2: Triple-Floor Descent ═══
        // * Patrol on each floor — can't just rush through the gap
        new PatrolEnemy(28 * TILE, 3 * TILE, map, TILE, { speed: 5.0, patrolLeft: 23 * TILE, patrolRight: 35 * TILE }),
        new PatrolEnemy(34 * TILE, 9 * TILE, map, TILE, { speed: 5.5, patrolLeft: 33 * TILE, patrolRight: 39 * TILE }),
        new PatrolEnemy(24 * TILE, 10 * TILE, map, TILE, { speed: 6.0, patrolLeft: 21 * TILE, patrolRight: 28 * TILE }),
        new PatrolEnemy(35 * TILE, groundY, map, TILE, { speed: 6.0, patrolLeft: 26 * TILE, patrolRight: 42 * TILE }),

        // ? Jumper at ground level — punishes slow descenders
        new JumperEnemy(30 * TILE, groundY, map, TILE, { jumpForce: -19, jumpInterval: 30 }),
        new JumperEnemy(44 * TILE, groundY, map, TILE, { jumpForce: -17, jumpInterval: 35 }),

        // ! Fly enemy hovers near gap of floor A
        new FlyEnemy(36 * TILE, 2 * TILE, map, TILE, { speed: 4.0, floatAmplitude: 22, floatSpeed: 0.075 }),

        // * ══ Zone 3: Water & Stone ═══
        // ! Fast fly enemies between each island — force timed jumps
        new FlyEnemy(52 * TILE, 7 * TILE, map, TILE, { speed: 4.5, floatAmplitude: 26, floatSpeed: 0.080 }),
        new FlyEnemy(56 * TILE, 3 * TILE, map, TILE, { speed: 4.5, floatAmplitude: 20, floatSpeed: 0.075 }),
        new FlyEnemy(61 * TILE, 7 * TILE, map, TILE, { speed: 5.0, floatAmplitude: 26, floatSpeed: 0.085 }),
        new FlyEnemy(66 * TILE, 7 * TILE, map, TILE, { speed: 5.0, floatAmplitude: 24, floatSpeed: 0.080 }),

        // * ══ Zone 4: Void Labyrinth ═══
        // * Patrol on each floating platform — can't stand still to plan
        new PatrolEnemy(77 * TILE, 5 * TILE, map, TILE, { speed: 5.0, patrolLeft: 77 * TILE, patrolRight: 80 * TILE }),
        new PatrolEnemy(89 * TILE, 5 * TILE, map, TILE, { speed: 5.5, patrolLeft: 89 * TILE, patrolRight: 92 * TILE }),

        // ? Jumpers at entry/exit of void — blocks any misjump recovery
        new JumperEnemy(71 * TILE, 8 * TILE, map, TILE, { jumpForce: -17, jumpInterval: 40 }),
        new JumperEnemy(96 * TILE, 8 * TILE, map, TILE, { jumpForce: -17, jumpInterval: 40 }),

        // ! Fly enemy guards the highest platform
        new FlyEnemy(83 * TILE, 0 * TILE, map, TILE, { speed: 5.0, floatAmplitude: 28, floatSpeed: 0.090 }),

        // * ══ Zone 6: Sky Pillars ══════
        // * Fast patrol on landing pad — must land and immediately move
        new PatrolEnemy(124 * TILE, 2 * TILE, map, TILE, { speed: 6.0, patrolLeft: 120 * TILE, patrolRight: 127 * TILE }),
        new PatrolEnemy(136 * TILE, 3 * TILE, map, TILE, { speed: 7.0, patrolLeft: 134 * TILE, patrolRight: 139 * TILE }),

        // ! Fly enemy sweeps above pillar 2 toehold
        new FlyEnemy(133 * TILE, 5 * TILE, map, TILE, { speed: 5.0, floatAmplitude: 22, floatSpeed: 0.090 }),

        // * ══ Zone 7: Final Altar ════
        new JumperEnemy(144 * TILE, 10 * TILE, map, TILE, { jumpForce: -12, jumpInterval: 20 }),
        new PatrolEnemy(146 * TILE, 3 * TILE, map, TILE, { speed: 7.5, patrolLeft: 144 * TILE, patrolRight: 150 * TILE }),

        // ! Fly enemy hovers at door level
        new FlyEnemy(143 * TILE, 1 * TILE, map, TILE, { speed: 5.5, floatAmplitude: 20, floatSpeed: 0.095 }),
    ];

    return { coins, boxes, stars, enemies };
}