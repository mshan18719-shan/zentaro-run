// ══════════════════════════════════════════════════════════════
//  platforms.js
//  Animated platform objects that live alongside the tile map:
//
//  ① AnimatedWater  — overlays water tiles with a side-scrolling
//                     wave texture so water looks alive.
//
//  ② MovingBridge   — a horizontal platform that slides left/right
//                     (or up/down). Player can stand on it.
//                     Image: metalblocks-sheet0.png  (#metalBob)
//                     Wait — that's the hazard. Bridge uses
//                     movbridge-sheet0.png  (#movingBridge).
//
//  ③ MetalBob       — a spiked/metal hazard sphere that patrols
//                     left/right OR up/down. Touching it deals 1
//                     damage. Image: metalblocks-sheet0.png (#metalBob).
//
//  Image sizes (measured from the assets):
//    movbridge-sheet0.png  → rendered at 192 × 40 px  (3 tiles wide, thin)
//    metalblocks-sheet0.png→ rendered at 64  × 64 px  (1 tile)
//
//  All sizes are exposed as constants so you can tweak them easily.
// ══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
//  Tuneable constants  (edit these to resize / retime things)
// ─────────────────────────────────────────────────────────────
export const BRIDGE_W = 150;   // px — rendered width  of the bridge sprite
export const BRIDGE_H = 40;   // px — rendered height of the bridge sprite
export const METALBOB_SIZE = 170;   // px — rendered size   of the metal bob (square)

// Water animation
const WATER_SCROLL_SPEED = 0.6;   // px/frame — how fast the wave pattern scrolls
const WATER_TILE_W = 64;   // must match map.js tile-2 render width
const WATER_TILE_H = 90;   // must match map.js tile-2 render height

// ─────────────────────────────────────────────────────────────
//  Lazy image cache
// ─────────────────────────────────────────────────────────────
let _bridgeImg = null;
let _bobImg = null;
let _waterImg = null;   // same as tile 2/3 — reused from DOM

function _getImg(id) {
    return document.getElementById(id);
}

// ══════════════════════════════════════════════════════════════
//  ① AnimatedWater
//  Call updateWater() each frame, then drawWater() after drawMap().
//  It scans the map for tile-2 and tile-3 cells that are inside
//  the camera view and re-draws them with a horizontally scrolling
//  offset, giving the illusion of moving water.
// ══════════════════════════════════════════════════════════════
let _waterScrollX = 0;

export function updateWater() {
    _waterScrollX += WATER_SCROLL_SPEED;
    // Reset when we've scrolled one full tile width to avoid float drift
    if (_waterScrollX >= WATER_TILE_W) _waterScrollX -= WATER_TILE_W;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Int8Array[]} map
 * @param {number} tileSize
 * @param {{ x:number, y:number, viewW:number, viewH:number }} camera
 */
export function drawWater(ctx, map, tileSize, camera) {
    if (!_waterImg) _waterImg = _getImg("block3");   // water tile image
    const img = _waterImg;
    if (!img) return;

    const startCol = Math.max(0, Math.floor(camera.x / tileSize));
    const endCol = Math.min(map[0].length - 1,
        startCol + Math.ceil(camera.viewW / tileSize) + 2);
    const startRow = Math.max(0, Math.floor(camera.y / tileSize));
    const endRow = Math.min(map.length - 1,
        startRow + Math.ceil(camera.viewH / tileSize) + 2);

    ctx.save();

    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            const t = map[row][col];
            if (t !== 2 && t !== 3) continue;

            // world-space top-left of this tile
            const wx = col * tileSize;
            const wy = row * tileSize - 23 // offset matches map.js

            const screenX = Math.round(wx - camera.x);
            const screenY = Math.round(wy - camera.y);

            // Use a clip rect so the scrolling texture doesn't bleed outside the tile
            ctx.save();
            ctx.beginPath();
            ctx.rect(screenX, screenY, WATER_TILE_W, WATER_TILE_H);
            ctx.clip();

            // Draw two copies side-by-side so the scroll seam is always covered
            const offset = Math.round(_waterScrollX);
            ctx.drawImage(img, screenX - offset, screenY, WATER_TILE_W, WATER_TILE_H);
            ctx.drawImage(img, screenX - offset + WATER_TILE_W, screenY, WATER_TILE_W, WATER_TILE_H);

            ctx.restore();
        }
    }

    ctx.restore();
}

// ══════════════════════════════════════════════════════════════
//  ② MovingBridge
//  A platform that slides left↔right OR up↕down.
//  Player can stand on it (it acts as an extraSolid).
//
//  constructor(worldX, worldY, options)
//    worldX / worldY  — initial world-space position (top-left)
//    options:
//      axis        : "x" | "y"   (default "x")
//      range       : pixels the bridge travels from its start (default 128)
//      speed       : pixels/frame                             (default 1.5)
//      startOffset : 0–1 phase offset so multiple bridges are out of sync
// ══════════════════════════════════════════════════════════════
export class MovingBridge {
    /**
     * @param {number} worldX
     * @param {number} worldY
     * @param {{ axis?:"x"|"y", range?:number, speed?:number, startOffset?:number }} [opts]
     */
    constructor(worldX, worldY, opts = {}) {
        this.startX = worldX;
        this.startY = worldY;
        this.x = worldX;
        this.y = worldY;
        this.width = BRIDGE_W;
        this.height = BRIDGE_H;

        this.axis = opts.axis || "x";
        this.range = opts.range !== undefined ? opts.range : 128;
        this.speed = opts.speed !== undefined ? opts.speed : 1.5;

        // Internal travel state: goes 0 → range → 0 → ...
        const phase = (opts.startOffset || 0) * this.range * 2;
        this._t = phase;          // current position in the [0, range*2] cycle
        this._dir = 1;              // +1 = moving toward range, -1 = returning

        // Player-carry: how much the bridge moved this frame
        this._deltaX = 0;
        this._deltaY = 0;
    }

    update() {
        const prevX = this.x;
        const prevY = this.y;

        this._t += this.speed * this._dir;

        if (this._t >= this.range) {
            this._t = this.range;
            this._dir = -1;
        } else if (this._t <= 0) {
            this._t = 0;
            this._dir = 1;
        }

        if (this.axis === "x") {
            this.x = this.startX + this._t;
            this.y = this.startY;
        } else {
            this.x = this.startX;
            this.y = this.startY + this._t;
        }

        this._deltaX = this.x - prevX;
        this._deltaY = this.y - prevY;
    }

    // ── extraSolid interface (matches TreasureBox API used in player.js) ──

    isSolid() { return true; }

    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    /**
     * Call this after player.update() to carry the player if they're standing on top.
     * @param {import('../entities/player.js').Player} player
     */
    carryPlayer(player) {
        if (player.dead || player.sinking) return;

        const pBot = player.y + player.height;
        const pLeft = player.x;
        const pRight = player.x + player.width;

        const bTop = this.y;
        const bLeft = this.x;
        const bRight = this.x + this.width;

        // Horizontal overlap check (shrink by 4px each side to avoid edge-snapping)
        const hOver = pRight > bLeft + 4 && pLeft < bRight - 4;
        if (!hOver) return;

        // Only land on top — player must be coming from above (velY >= 0)
        // and their feet must be within a small window above/at the bridge top.
        // This prevents jumping through from below.
        const withinSnap = pBot >= bTop - 2 && pBot <= bTop + Math.abs(this._deltaY) + 8;
        const fromAbove = (player.velY ?? 0) >= -0.5;   // allow tiny negative for carry

        if (withinSnap && fromAbove) {
            // Snap feet flush to bridge surface — always, including downward travel.
            // This is the key fix: we snap AFTER any deltaY carry so there is
            // never a gap between the player's feet and the bridge top.
            player.x += this._deltaX;
            player.y  = bTop - player.height;   // pixel-perfect flush snap every frame

            // Keep player grounded so jumping still works
            player.velY    = 0;
            player.onGround = true;
            player.jumpsLeft = 2;

            // Tell the player they are on a bridge so animation stays in
            // idle/run mode and never switches to the falling sprite.
            player.onBridge = true;
        }
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{ x:number, y:number }} camera
     */
    draw(ctx, camera) {
        if (!_bridgeImg) _bridgeImg = _getImg("movingBridge");
        const img = _bridgeImg;

        const sx = Math.round(this.x - camera.x);
        const sy = Math.round(this.y - camera.y);

        if (img && img.complete && img.naturalWidth) {
            ctx.drawImage(img, sx, sy, this.width, this.height);
        } else {
            // Canvas fallback: brown plank
            ctx.fillStyle = "#8B5E3C";
            ctx.strokeStyle = "#5C3A1E";
            ctx.lineWidth = 3;
            ctx.fillRect(sx, sy, this.width, this.height);
            ctx.strokeRect(sx, sy, this.width, this.height);
            // Plank lines
            ctx.strokeStyle = "#6B4226";
            ctx.lineWidth = 1;
            for (let i = 1; i < 3; i++) {
                const lx = sx + (this.width / 3) * i;
                ctx.beginPath();
                ctx.moveTo(lx, sy);
                ctx.lineTo(lx, sy + this.height);
                ctx.stroke();
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════
//  ③ MetalBob
//  A hazard that moves left↔right OR up↕down. Touching it deals
//  1 point of damage to the player (with invincibility frames).
//  It is NOT a platform — the player cannot stand on it.
//
//  constructor(worldX, worldY, options)
//    options:
//      axis        : "x" | "y"          (default "x")
//      range       : travel distance px  (default 96)
//      speed       : px/frame            (default 2)
//      startOffset : 0–1 phase           (default 0)
// ══════════════════════════════════════════════════════════════
export class MetalBob {
    /**
     * @param {number} worldX
     * @param {number} worldY
     * @param {{ axis?:"x"|"y", range?:number, speed?:number, startOffset?:number }} [opts]
     */
    constructor(worldX, worldY, opts = {}) {
        this.startX = worldX;
        this.startY = worldY;
        this.x = worldX;
        this.y = worldY;
        this.width = METALBOB_SIZE;
        this.height = METALBOB_SIZE;

        this.axis = opts.axis || "x";
        this.range = opts.range !== undefined ? opts.range : 96;
        this.speed = opts.speed !== undefined ? opts.speed : 2;

        const phase = (opts.startOffset || 0) * this.range * 2;
        this._t = phase;
        this._dir = 1;

        // Spin animation
        this._angle = 0;
    }

    update() {
        this._t += this.speed * this._dir;

        if (this._t >= this.range) {
            this._t = this.range;
            this._dir = -1;
        } else if (this._t <= 0) {
            this._t = 0;
            this._dir = 1;
        }

        if (this.axis === "x") {
            this.x = this.startX + this._t;
            this.y = this.startY;
        } else {
            this.x = this.startX;
            this.y = this.startY + this._t;
        }

        // Rotate as it moves (visual only)
        this._angle += 0.05 * this._dir;
    }

    /**
     * AABB overlap check with the player's visible body.
     * Uses getPickupBounds() if available, otherwise raw rect.
     * @param {import('../entities/player.js').Player} player
     * @returns {boolean}
     */
    overlaps(player) {
        const pb = typeof player.getPickupBounds === "function"
            ? player.getPickupBounds()
            : { x: player.x, y: player.y, width: player.width, height: player.height };

        // Shrink bob hitbox slightly so it feels fair
        const margin = 10;
        return (
            this.x + margin < pb.x + pb.width &&
            this.x + this.width - margin > pb.x &&
            this.y + margin < pb.y + pb.height &&
            this.y + this.height - margin > pb.y
        );
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{ x:number, y:number }} camera
     */
    draw(ctx, camera) {
        if (!_bobImg) _bobImg = _getImg("metalBob");
        const img = _bobImg;

        const cx = Math.round(this.x + this.width / 2 - camera.x);
        const cy = Math.round(this.y + this.height / 2 - camera.y);
        const hw = this.width / 2;
        const hh = this.height / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this._angle);

        if (img && img.complete && img.naturalWidth) {
            ctx.drawImage(img, -hw, -hh, this.width, this.height);
        } else {
            // Canvas fallback: grey spiked circle
            ctx.fillStyle = "#888";
            ctx.strokeStyle = "#444";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, hw - 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Spikes
            const SPIKES = 8;
            ctx.strokeStyle = "#666";
            ctx.lineWidth = 4;
            for (let i = 0; i < SPIKES; i++) {
                const a = (i / SPIKES) * Math.PI * 2;
                const r1 = hw - 4;
                const r2 = hw + 8;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
                ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}

// ══════════════════════════════════════════════════════════════
//  Factory helpers — called from main.js per level
// ══════════════════════════════════════════════════════════════

/**
 * Returns default platform layout for Level 1.
 * @param {number} TILE
 * @returns {{ bridges: MovingBridge[], bobs: MetalBob[] }}
 */
export function createPlatformsLevel1(TILE) {
    return {
        bridges: [
            // Over the water pit at cols 101-104, row 11 area
            // new MovingBridge(99  * TILE, 10 * TILE, { axis: "x", range: 3 * TILE, speed: 1.4 }),
            // Between the two raised platforms at cols 64-76, row 7
            new MovingBridge(8 * TILE, 11 * TILE, { axis: "x", range: 4 * TILE, speed: 1.8, startOffset: 0.4 }),
            // new MovingBridge(68  * TILE,  6 * TILE, { axis: "x", range: 3 * TILE, speed: 1.6, startOffset: 0.5 }),
            // Vertical bob-platform near the tall wall (col 119)
            new MovingBridge(88 * TILE, 8 * TILE, { axis: "y", range: 5 * TILE, speed: 1.2, startOffset: 0.3 }),
        ],
        bobs: [
            // Patrol above the spikes at row 10, col 21-24
            // new MetalBob(21 * TILE,  8 * TILE, { axis: "x", range: 3 * TILE, speed: 2.2 }),
            // Patrol over the elevated section col 45-55
            // new MetalBob(44 * TILE,  7 * TILE, { axis: "x", range: 4 * TILE, speed: 2,   startOffset: 0.5 }),
            // Vertical patrol near the stone wall
            new MetalBob(118 * TILE, 3 * TILE, { axis: "y", range: 6 * TILE, speed: 2.5, startOffset: 0.2 }),
        ],
    };
}

/**
 * Returns default platform layout for Level 2.
 * @param {number} TILE
 * @returns {{ bridges: MovingBridge[], bobs: MetalBob[] }}
 */
export function createPlatformsLevel2(TILE) {
    return {
        bridges: [
            // Over water cols 14-19
            // new MovingBridge(13 * TILE, 10 * TILE, { axis: "x", range: 4 * TILE, speed: 1.5 }),
            // Over the big water gap cols 70-78
            new MovingBridge(75 * TILE, 10 * TILE, { axis: "x", range: 4 * TILE, speed: 1.8, startOffset: 0.4 }),
            new MovingBridge(82 * TILE, 4 * TILE, { axis: "y", range: 3 * TILE, speed: 1.3, startOffset: 0.6 }),
            // Vertical lift after staircase col 100
            new MovingBridge(110 * TILE, 8 * TILE, { axis: "y", range: 3 * TILE, speed: 1.3, startOffset: 0.6 }),
        ],
        bobs: [
            // Spike-trap area cols 24-26
            new MetalBob(22 * TILE, 7 * TILE, { axis: "x", range: 5 * TILE, speed: 2.5 }),
            // Mid-level elevated section
            new MetalBob(47 * TILE, 0 * TILE, { axis: "y", range: 5 * TILE, speed: 3, startOffset: 0.2 }),
            // Pre-door area
            new MetalBob(123 * TILE, 2 * TILE, { axis: "y", range: 5 * TILE, speed: 3, startOffset: 0.3 }),
            new MetalBob(129 * TILE, 3 * TILE, { axis: "y", range: 5 * TILE, speed: 3, startOffset: 0.2 }),
            new MetalBob(135 * TILE, 2 * TILE, { axis: "y", range: 5 * TILE, speed: 3, startOffset: 0.5 }),
        ],
    };
}

/**
 * Returns default platform layout for Level 3.
 * @param {number} TILE
 * @returns {{ bridges: MovingBridge[], bobs: MetalBob[] }}
 */
export function createPlatformsLevel3(TILE) {
    return {
        bridges: [
            // ── Zone 2: Bridge over Gap 1 (cols 20-24) ──────────────────
            // Moves sideways, player must time the jump onto it
            new MovingBridge(26 * TILE, 11 * TILE, { axis: "x", range: 4 * TILE, speed: 2.0 }),

        ],
        bobs: [
            // ── Zone 1: Low horizontal sweep over spike field ────────────
            // Forces player to jump + navigate spikes at same time
            new MetalBob( 1 * TILE, 8 * TILE, { axis: "x", range: 3 * TILE, speed: 2.8 }),
            new MetalBob( 20 * TILE,  0 * TILE, { axis: "y", range: 4 * TILE, speed: 3.5, startOffset: 0.5 }),
        ],
    };
}