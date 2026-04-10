// ══════════════════════════════════════════════════════════════
//  world/map.js  —  Tile engine only
//
//  ✦ NO level data lives here anymore.
//  ✦ Each level defines its own createMap() inside
//    world/levels/levelN.js.
//
//  Phase 12 optimizations:
//    • Block images cached in an array at first draw
//    • tileRenderSettings flattened into parallel arrays (cache-friendly)
//    • drawMap inner loop uses cached image refs
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
    'block26',  // Bridge
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
const NON_SOLID = new Set([2, 3, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 24, 25]); // 2, 3, 

// Phase 12: flat parallel arrays instead of object per tile type (cache-friendly)
const _rW  = new Int16Array(BLOCK_COUNT); // draw width  (0 = use tileSize)
const _rH  = new Int16Array(BLOCK_COUNT); // draw height (0 = use tileSize)
const _rOX = new Int16Array(BLOCK_COUNT); // offsetX
const _rOY = new Int16Array(BLOCK_COUNT); // offsetY

(function _initRenderSettings() {
    const S = [
        // [tileType, w, h, ox, oy]
        [1,  64,  75,   0, -10],
        [2,  70,   0,   0,  42],  // h=0 means use tileSize
        [3,  70,  60,   0,   0],
        [4,  100, 100,  0, -22],
        [5,  100, 100,  0, -56],
        [6,  110, 130, -14, -12],
        [7,  70,  200, -29, -16],
        [8,  64,  70,   0,   0],
        [9,  0,    0,  35,  56],  // w/h=0 means use tileSize
        [10, 60,  80,  -9,  40],
        [11, 60,  80,  -9,  40],
        [12, 80,  100, -9,  19],
        [13, 80,  80, -30,  38],
        [14, 64,  80,   0, -10],
        [15, 64,  70,   0,   -2],
        [16, 90,  90,   0,  28],
        [17, 90,  90,   0,  32],
        [18, 90,  90,   0,  32],
        [19, 100, 100,  0, -50],
        [20, 100, 100,  0, -18],
        [21, 64,  80,   0, -10],
        [22, 64,  80,   0, -10],
        [23, 64,  80,   0, -10],
        [24, 80,  100, -9,  19],
        [25, 64,  80,   0, -10],
    ];
    for (const [t, w, h, ox, oy] of S) {
        _rW[t]  = w;
        _rH[t]  = h;
        _rOX[t] = ox;
        _rOY[t] = oy;
    }
})();

// ─────────────────────────────────────────────────────────────
//  DRAW MAP
// ─────────────────────────────────────────────────────────────
export function drawMap(ctx, map, tileSize, camera) {
    if (!_cacheReady) _buildImageCache();

    const startCol = Math.max(0, Math.floor(camera.x / tileSize));
    const endCol   = Math.min(map[0].length - 1, startCol + Math.ceil(camera.viewW / tileSize) + 2);
    const startRow = Math.max(0, Math.floor(camera.y / tileSize));
    const endRow   = Math.min(map.length - 1,    startRow + Math.ceil(camera.viewH / tileSize) + 2);

    for (let y = startRow; y <= endRow; y++) {
        const row = map[y];
        for (let x = startCol; x <= endCol; x++) {
            const t = row[x];
            if (t === 0) continue;

            const img = _imgCache[t];
            if (!img) continue;

            const dw = _rW[t]  || tileSize;
            const dh = _rH[t]  || tileSize;
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