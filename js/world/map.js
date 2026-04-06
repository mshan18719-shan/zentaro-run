// ══════════════════════════════════════════════════════════════
//  map.js
//  Phase 12 optimizations:
//    • Block images cached in an array at first draw (no getElementById per tile)
//    • tileRenderSettings flattened into parallel arrays (cache-friendly)
//    • drawMap inner loop uses cached image refs and avoids object creation
//    • isSolid / isHazard unchanged (already very tight)
// ══════════════════════════════════════════════════════════════

const blockIds = [
    null,       // 0
    'block1',   // groundgrass
    'block2',   // water
    'block3',   // watertop
    'block4',   // door
    'block5',   // topdoor
    'block6',   // cactus
    'block7',   // bigcactus
    'block8',   // ground
    'block9',   // rock
    'block10',  // mushroom
    'block11',  // mushroom1
    'block12',  // Starting Board
    'block13',  // Crystal
    'block14',  // treasure box
    'block15',  // Spikes
    'block16',  // Grass
    'block17',  // Fence Sheet
    'block18',  // Fence
    'block19',  // Top Door 2
    'block20',  // Door 2
    'block21',  // top ground left
    'block22',  // top ground middle
    'block23',  // top ground right
    'block24',  // Exit Door
    'block25',  // Black Hole
];
const BLOCK_COUNT = blockIds.length;

// Phase 12: image cache populated on first draw (lazy, stable after that)
const _imgCache = new Array(BLOCK_COUNT).fill(null);
let _cacheReady = false;

function _buildImageCache() {
    for (let i = 1; i < BLOCK_COUNT; i++) {
        if (blockIds[i]) _imgCache[i] = document.getElementById(blockIds[i]);
    }
    _cacheReady = true;
}

// Non-solid tile IDs
const NON_SOLID = new Set([2, 3, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 24, 25]);

// Phase 12: flat parallel arrays instead of object per tile type (cache-friendly)
// Index 0 = tile type 0 (empty), etc.
// [width, height, offsetX, offsetY]  — null means "use tileSize default"
const _rW = new Int16Array(BLOCK_COUNT); // draw width  (0 = use tileSize)
const _rH = new Int16Array(BLOCK_COUNT); // draw height (0 = use tileSize)
const _rOX = new Int16Array(BLOCK_COUNT); // offsetX
const _rOY = new Int16Array(BLOCK_COUNT); // offsetY

(function _initRenderSettings() {
    const S = [
        // [tileType, w, h, ox, oy]
        [1, 64, 80, 0, -10],
        [2, 70, 0, 0, 42],  // h=0 means use tileSize
        [3, 70, 60, 0, 0],
        [4, 100, 100, 0, -22],
        [5, 100, 100, 0, -56],
        [6, 110, 130, -14, -12],
        [7, 70, 200, -29, -16],
        [8, 64, 70, 0, 0],
        [9, 0, 0, 35, 56],  // w/h=0 means use tileSize
        [10, 60, 80, -9, 40],
        [11, 60, 80, -9, 40],
        [12, 80, 100, -9, 19],
        [13, 80, 80, -30, 38],
        [14, 64, 80, 0, -10],
        [15, 64, 70, 0, 4],
        [16, 90, 90, 0, 28],
        [17, 90, 90, 0, 32],
        [18, 90, 90, 0, 32],
        [19, 100, 100, 0, -50],
        [20, 100, 100, 0, -18],
        [21, 64, 80, 0, -10],
        [22, 64, 80, 0, -10],
        [23, 64, 80, 0, -10],
        [24, 80, 100, -9, 19],
        [25, 64, 80, 0, -10],
    ];
    for (const [t, w, h, ox, oy] of S) {
        _rW[t] = w;
        _rH[t] = h;
        _rOX[t] = ox;
        _rOY[t] = oy;
    }
})();

// ─────────────────────────────────────────────────────────────
//  CREATE MAP  (Level 1 — extended to 140 columns)
// ─────────────────────────────────────────────────────────────
export function createMap() {
    const rows = 15;
    const cols = 140;

    const map = Array.from({ length: rows }, () => new Int8Array(cols));

    // Ground floor
    for (let x = 0; x < cols; x++) map[14][x] = 1;

    // ── Original section (cols 0-99) ─────────────────────────
    map[12][8] = 13;
    map[9][21] = 1; map[9][22] = 1; map[9][23] = 1; map[9][24] = 1;
    map[10][21] = 15; map[10][22] = 15; map[10][23] = 15; map[10][24] = 15;  // * Spikes

    map[6][30] = 1; map[6][31] = 1; map[6][32] = 1; map[6][33] = 1; map[6][34] = 1;
    map[7][30] = 15; map[7][31] = 15; map[7][32] = 15; map[7][33] = 15; map[7][34] = 15;  // * Spikes

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

    map[8][93] = 1; map[8][94] = 1
    for (let y = 9; y <= 14; y++) map[y][93] = 8;
    for (let y = 9; y <= 14; y++) map[y][94] = 8;

    // ── Extended section (cols 100-139) ──────────────────────
    for (let y = 0; y <= 9; y++) map[y][102] = 8;
    for (let y = 0; y <= 9; y++) map[y][103] = 8;
    // Stepping platforms over the water
    for (let x = 97; x <= 101; x++) map[9][x] = 1;
    for (let x = 98; x <= 103; x++) map[10][x] = 15;

    // Raised platform chain
    map[9][108] = 1; map[9][109] = 1; map[9][110] = 1;
    map[10][108] = 15; map[10][109] = 15; map[10][110] = 15;

    map[7][113] = 1; map[7][114] = 1; map[7][115] = 1; map[7][116] = 1;
    map[8][113] = 15; map[8][114] = 15; map[8][115] = 15; map[8][116] = 15;

    // Tall stone wall column
    map[9][119] = 1; map[9][120] = 1;
    for (let y = 10; y <= 14; y++) map[y][119] = 8;
    for (let y = 10; y <= 14; y++) map[y][120] = 8;

    // Big cactus near the end
    map[11][136] = 7;
    // * Cactus
    map[12][13] = 6; map[12][28] = 6; map[12][47] = 6;
    map[6][56] = 6; map[12][63] = 6; map[12][123] = 6;

    // * Rocks
    map[12][14] = 9; map[12][54] = 9; map[12][78] = 9; map[12][98] = 9;

    // * Crystals
    map[12][19] = 13; map[12][32] = 13; map[12][43] = 13;
    map[12][49] = 13; map[12][66] = 13;
    map[12][126] = 13;

    // * Grass
    map[12][22] = 16; map[12][37] = 16; map[12][71] = 16;
    map[12][77] = 16; map[12][95] = 16; map[12][133] = 16;

    // ? Level Over Door at col 138
    map[12][135] = 24;
    map[12][138] = 5;
    map[13][138] = 4;

    return map;
}

// ─────────────────────────────────────────────────────────────
//  CREATE MAP 2  (Level 2 — desert / cave theme, 130 columns)
// ─────────────────────────────────────────────────────────────
export function createMap2() {
    const rows = 15;
    const cols = 150;

    const map = Array.from({ length: rows }, () => new Int8Array(cols));

    // Ground floor
    for (let x = 0; x < cols; x++) map[14][x] = 1;

    // ═════════════════════════════════════════════════════════════
    // SECTION 1 — Opening ground / safe intro like level 1
    // ═════════════════════════════════════════════════════════════
    map[12][4] = 6;    // cactus
    map[12][7] = 9;    // rock
    map[12][11] = 13;  // crystal
    map[12][15] = 16;  // grass
    map[12][19] = 6;   // cactus

    map[5][24] = 21; map[5][25] = 22; map[5][26] = 22; map[5][27] = 22; map[5][28] = 23;

    // Small first spike lesson
    map[12][24] = 1; map[12][25] = 1; map[12][26] = 1; map[12][27] = 1;
    map[13][24] = 15; map[13][25] = 15; map[13][26] = 15; map[13][27] = 15;

    // Small upper platform after intro
    map[9][30] = 1; map[9][31] = 1; map[9][32] = 1; map[9][33] = 1;
    map[10][30] = 15; map[10][31] = 15; map[10][32] = 15; map[10][33] = 15;

    // Landing area
    map[12][36] = 13;
    map[12][38] = 16;

    // ═════════════════════════════════════════════════════════════
    // SECTION 2 — First staircase / elevation setup
    // ═════════════════════════════════════════════════════════════
    map[13][41] = 1; map[14][41] = 8;
    map[12][42] = 1; map[13][42] = 8; map[14][42] = 8;
    map[11][43] = 1; map[12][43] = 8; map[13][43] = 8; map[14][43] = 8;
    map[10][44] = 1; map[11][44] = 8; map[12][44] = 8; map[14][44] = 8; map[13][44] = 8;

    // Water
    for (let x = 45; x <= 50; x++) map[14][x] = 3;

    // ═════════════════════════════════════════════════════════════
    // SECTION 3 — LONG RIVER with bridge crossings
    // ═════════════════════════════════════════════════════════════
    // Long water pit
    for (let x = 58; x <= 84; x++) map[14][x] = 3;

    // Bridge / stepping crossing 1
    map[11][60] = 1; map[11][61] = 1;
    map[10][65] = 1; map[10][66] = 1;
    map[11][70] = 1; map[11][71] = 1;

    // Side decorations before/after river
    map[12][56] = 13;
    map[12][86] = 6;

    // ═════════════════════════════════════════════════════════════
    // SECTION 4 — After river: mixed hurdles
    // ═══════════════════════════════════

    map[4][87] = 1; map[4][89] = 1; map[4][91] = 1; map[4][93] = 1; map[4][95] = 1;
    map[5][87] = 15; map[5][89] = 15; map[5][91] = 15; map[5][93] = 15; map[5][95] = 15;

    map[9][86] = 1; map[9][88] = 1; map[9][90] = 1; map[9][92] = 1; map[9][94] = 1;
    map[10][86] = 15; map[10][88] = 15; map[10][90] = 15; map[10][92] = 15; map[10][94] = 15;

    // ═════════════════════════════════════════════════════════════
    // SECTION 5 — Broken floor + narrow safe spaces
    // ═════════════════════════════════════════════════════════════
    for (let x = 104; x <= 119; x++) map[14][x] = 3;

    // Safe columns / bridge posts
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

    // ═════════════════════════════════════════════════════════════
    // SECTION 6 — Final staircase to end zone
    // ═════════════════════════════════════════════════════════════

    // Black-hole floor across the whole gauntlet zone
    for (let x = 121; x <= 141; x++) map[14][x] = 25;

    for (let x = 123; x <= 137; x++) map[10][x] = 1;

    // ── Safe ground strip before door ────────────────────────
    for (let x = 142; x <= 149; x++) map[14][x] = 1;
    map[12][143] = 16;  // grass deco
    map[12][145] = 13;  // crystal deco

    // ── Door at col 147 ──────────────────────────────────────
    map[12][146] = 24;  // Exit sign
    map[12][147] = 5;   // top door sprite
    map[13][147] = 4;   // bottom door sprite

    return map;
}

// ─────────────────────────────────────────────────────────────
//  CREATE MAP 3  (Level 3 — "Inferno Fortress" — 150 columns)
//
//  ZONE LAYOUT
//  ──────────────────────────────────────────────────────────
//  Z1  cols   0-18  : Spike-minefield intro  (ground gaps + spikes + bob)
//  Z2  cols  19-38  : Double-gap void run     (ground holes + moving bridge)
//  Z3  cols  39-59  : Water river crossing    (river + tiny platforms + fly enemies)
//  Z4  cols  60-79  : Castle twin-tower climb (stone walls + spike tops + patrol)
//  Z5  cols  80-104 : Black-hole valley       (black hole floor + pillars + treasure boxes)
//  Z6  cols 105-131 : Fortress battlements    (elevated platform + spike gauntlet + bobs + jumpers)
//  Z7  cols 132-149 : Final descent & door    (water pit + black holes + tiny hops + door)
// ─────────────────────────────────────────────────────────────
export function createMap3() {
    const rows = 15;
    const cols = 150;

    const map = Array.from({ length: rows }, () => new Int8Array(cols));

    // ══════════════════════════════════════════════════════════
    // GROUND FLOOR  (laid first, then holes punched in)
    // ══════════════════════════════════════════════════════════
    for (let x = 0; x < cols; x++) map[14][x] = 1;

    // Starting board + big cactus landmark
    map[12][1] = 12;   // starting board
    map[11][3] = 7;    // big cactus (non-solid decoration)

    // Two small platforms player can hop to for safety
    map[9][8] = 1; map[9][9] = 1; map[9][10] = 1;
    map[10][8] = 15; map[10][9] = 15; map[10][10] = 15;

    // Crystal & rock decorations
    map[12][9] = 9;    // rock
    map[12][18] = 13;   // crystal


    // Gap 1 — cols 20-24 (5 tiles wide, 2 rows deep)
    for (let x = 20; x <= 33; x++) map[14][x] = 25;
    map[7][24] = 21; map[7][25] = 22; map[7][26] = 22; map[7][27] = 23;
    for (let x = 32; x <= 37; x++) map[4][x] = 1;
    for (let y = 5; y <= 14; y++) map[y][36] = 8;
    for (let y = 5; y <= 14; y++) map[y][37] = 8;


    // River (2 rows deep so swimming logic triggers)
    for (let x = 42; x <= 57; x++) map[14][x] = 3;

    // Tiny 1-tile stepping stones mid-river
    map[11][44] = 1;   // stone 1
    map[10][47] = 1;   // stone 2  (higher — forces bigger jump)
    map[11][50] = 1;   // stone 3
    map[10][53] = 1;   // stone 4  (higher again)

    // Spike on stone 1 and 3 tops — can't stand still!
    map[12][44] = 15;
    map[12][50] = 15;

    // Bank decorations
    map[12][40] = 6;   // cactus
    map[12][59] = 9;   // rock on far bank

    // Tower 1 — cols 62-64  (rows 5-13)
    for (let y = 5; y <= 14; y++) map[y][63] = 8;
    for (let y = 5; y <= 14; y++) map[y][64] = 8;
    // Tower 1 roof platform
    for (let x = 61; x <= 65; x++) map[4][x] = 1;
    map[5][61] = 15; map[5][62] = 15; map[5][65] = 15;  // spikes on edges

    // Mid platform between towers (player must land here from bridge)
    for (let x = 68; x <= 69; x++) map[11][x] = 1;

    // Tower 2 — cols 73-75  (rows 6-13)
    for (let y = 6; y <= 14; y++) map[y][73] = 8;
    for (let y = 6; y <= 14; y++) map[y][74] = 8;
    for (let y = 6; y <= 14; y++) map[y][75] = 8;
    // Tower 2 roof platform
    map[5][72] = 1; map[5][73] = 1; map[5][74] = 1; map[5][75] = 1; map[5][76] = 1;
    map[6][72] = 15; map[6][76] = 15;

    // Crystals & decorations on tower tops
    map[3][63] = 13;    // crystal on tower 1
    map[4][74] = 13;    // crystal on tower 2

    for (let x = 80; x <= 115; x++) {
        map[14][x] = 8;
    }

    for (let x = 80; x <= 113; x++) {
        map[13][x] = 1;
    }

    for (let y = 9; y <=13; y++) map[y][114] = 8;
    for (let y = 9; y <=13; y++) map[y][115] = 8;
    map[8][114] = 1; map[8][115] = 1;


    // Safe landing strip off fortress
    for (let x = 129; x <= 131; x++) map[14][x] = 1;

    // Water pit  cols 132-138 (2 rows deep)
    for (let x = 132; x <= 139; x++) map[14][x] = 3;


    // Final safe ground before door
    for (let x = 143; x <= 149; x++) map[14][x] = 1;
    map[12][143] = 16;   // grass
    map[12][145] = 13;   // crystal
    map[11][144] = 7;    // big cactus (victory landmark)

    // Exit sign + Door at col 147
    map[12][146] = 24;   // exit sign
    map[12][147] = 5;    // top door sprite
    map[13][147] = 4;    // bottom door sprite

    return map;
}

// ─────────────────────────────────────────────────────────────
//  DRAW MAP
// ─────────────────────────────────────────────────────────────
export function drawMap(ctx, map, tileSize, camera) {
    // Phase 12: build image cache on first call
    if (!_cacheReady) _buildImageCache();

    const startCol = Math.max(0, Math.floor(camera.x / tileSize));
    const endCol = Math.min(map[0].length - 1, startCol + Math.ceil(camera.viewW / tileSize) + 2);
    const startRow = Math.max(0, Math.floor(camera.y / tileSize));
    const endRow = Math.min(map.length - 1, startRow + Math.ceil(camera.viewH / tileSize) + 2);

    for (let y = startRow; y <= endRow; y++) {
        const row = map[y];
        for (let x = startCol; x <= endCol; x++) {
            const t = row[x];
            if (t === 0) continue;

            const img = _imgCache[t];
            if (!img) continue;

            // Phase 12: read from flat arrays instead of object property lookup
            const dw = _rW[t] || tileSize;
            const dh = _rH[t] || tileSize;
            const ox = _rOX[t];
            const oy = _rOY[t];

            const drawX = Math.round(x * tileSize - camera.x + ox);
            const drawY = Math.round(y * tileSize - camera.y + oy);

            ctx.drawImage(img, drawX, drawY, dw, dh);
        }
    }
}

// ─────────────────────────────────────────────────────────────
//  TILE COLLISION
// ─────────────────────────────────────────────────────────────
export function isSolid(map, col, row) {
    if (row < 0 || row >= map.length || col < 0 || col >= map[0].length) return false;
    const tile = map[row][col];
    if (tile === 0) return false;
    return !NON_SOLID.has(tile);
}

// ─────────────────────────────────────────────────────────────
//  HAZARD DETECTION
// ─────────────────────────────────────────────────────────────
export function isHazard(map, col, row) {
    if (row < 0 || row >= map.length || col < 0 || col >= map[0].length) return null;
    const tile = map[row][col];
    if (tile === 15) return "spike";
    if (tile === 2 || tile === 3 || tile === 25) return "water";
    return null;
}