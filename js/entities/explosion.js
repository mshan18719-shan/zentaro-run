// * Phase 12: True object pool — Explosion instances are recycled

const FRAME_TICKS  = 4;
const RENDER_SIZE  = 65;

const SEQUENCE = [
    { sheet: 0, col: 0, row: 0 },
    { sheet: 0, col: 1, row: 0 },
    { sheet: 0, col: 0, row: 1 },
    { sheet: 0, col: 1, row: 1 },
    { sheet: 1, col: 0, row: 0 },
];

// * ── Shared sheet references (loaded once) ─────────────────────
let _sheet0 = null;
let _sheet1 = null;

function _ensureSheets() {
    if (!_sheet0) _sheet0 = document.getElementById("explosionImg0");
    if (!_sheet1) _sheet1 = document.getElementById("explosionImg1");
}

// * Pre-compute frame source dimensions once sheets are ready
let _frameW0 = 0, _frameH0 = 0;
let _frameW1 = 0, _frameH1 = 0;

function _computeFrameSizes() {
    if (_sheet0 && _sheet0.naturalWidth && !_frameW0) {
        _frameW0 = Math.floor(_sheet0.naturalWidth  / 2);
        _frameH0 = Math.floor(_sheet0.naturalHeight / 2);
    }
    if (_sheet1 && _sheet1.naturalWidth && !_frameW1) {
        _frameW1 = _sheet1.naturalWidth;
        _frameH1 = _sheet1.naturalHeight;
    }
}

// * ── Reusable Explosion slot ───────────────────────────────────
class Explosion {
    constructor() {
        this.cx         = 0;
        this.cy         = 0;
        this.frameIndex = 0;
        this.tick       = 0;
        this.active     = false; // Phase 12: pool flag instead of `done`
    }

    // * Re-initialise a recycled slot
    init(cx, cy) {
        this.cx         = cx;
        this.cy         = cy;
        this.frameIndex = 0;
        this.tick       = 0;
        this.active     = true;
    }

    // * Returns true when finished (caller should deactivate)
    update() {
        if (!this.active) return true;
        this.tick++;
        if (this.tick >= FRAME_TICKS) {
            this.tick = 0;
            this.frameIndex++;
            if (this.frameIndex >= SEQUENCE.length) {
                this.active = false;
                return true;
            }
        }
        return false;
    }

    draw(ctx, camera) {
        if (!this.active) return;

        _computeFrameSizes();

        const desc = SEQUENCE[this.frameIndex];
        let sheet, fw, fh;
        if (desc.sheet === 0) {
            sheet = _sheet0; fw = _frameW0; fh = _frameH0;
        } else {
            sheet = _sheet1; fw = _frameW1; fh = _frameH1;
        }
        if (!sheet || !sheet.complete || !fw) return;

        const sx      = desc.col * fw - 12;
        const sy      = desc.row * fh - 13;
        const screenX = Math.round(this.cx - camera.x) - RENDER_SIZE / 2;
        const screenY = Math.round(this.cy - camera.y) - RENDER_SIZE / 2;

        ctx.drawImage(sheet, sx, sy, fw, fh, screenX, screenY, RENDER_SIZE, RENDER_SIZE);
    }
}

// ? ExplosionManager  —  fixed-size object pool
const POOL_SIZE = 16; // max simultaneous explosions

export class ExplosionManager {
    constructor() {
        // * Pre-allocate pool
        this._pool = Array.from({ length: POOL_SIZE }, () => new Explosion());
        _ensureSheets();
    }

    // * Get an inactive slot from the pool. Returns null if pool full.
    spawn(cx, cy) {
        _ensureSheets();
        for (let i = 0; i < POOL_SIZE; i++) {
            if (!this._pool[i].active) {
                this._pool[i].init(cx, cy);
                return;
            }
        }
        // ! Pool exhausted — silently skip (rare with POOL_SIZE = 16)
    }

    update() {
        for (let i = 0; i < POOL_SIZE; i++) {
            if (this._pool[i].active) this._pool[i].update();
        }
    }

    draw(ctx, camera) {
        for (let i = 0; i < POOL_SIZE; i++) {
            if (this._pool[i].active) this._pool[i].draw(ctx, camera);
        }
    }

    // * Re-deactivate all slots (called on game reset)
    reset() {
        for (let i = 0; i < POOL_SIZE; i++) this._pool[i].active = false;
    }
}