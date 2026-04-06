// ══════════════════════════════════════════════════════════════
//  enemy.js
//  Phase 12 optimizations:
//    • Sheet images cached in constructor (no getElementById per draw)
//    • ctx.save/restore removed from draw() — caller sets imageSmoothingEnabled
//    • rowIndex toggle replaced with XOR (FlyEnemy)
//    • Dead-check early return kept at top of update() (skip all math)
//    • _moveX / _moveY guard added: skip tile loop when velocity is zero
// ══════════════════════════════════════════════════════════════

import { isSolid } from "../world/map.js";

// ─────────────────────────────────────────────────────────────
//  BASE ENEMY
// ─────────────────────────────────────────────────────────────
export class Enemy {
    constructor(startX, startY, map, tileSize) {
        this.map      = map;
        this.tileSize = tileSize;

        this.width  = 44;
        this.height = 44;

        this.x = startX;
        this.y = startY - this.height;

        this.startX = startX;
        this.startY = startY;

        this.velX     = 0;
        this.velY     = 0;
        this.gravity  = 0.5;
        this.onGround = false;
        this.dead     = false;
        this.dir      = -1;

        // Extra solid surfaces (TreasureBoxes, MovingBridges) — injected from main.js
        this.extraSolids = [];

        // Activation flag — set to true by main.js once enemy enters camera view.
        // Subclasses that respect it (e.g. WalkerEnemy) stay frozen until then.
        this.activated = false;
    }

    /** Receive the same extraSolids array the player uses */
    setExtraSolids(solids) {
        this.extraSolids = Array.isArray(solids) ? solids : [];
    }

    _applyGravity() {
        this.velY += this.gravity;
        if (this.velY > 18) this.velY = 18;
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY - this.height;
        this.velX     = 0;
        this.velY     = 0;
        this.dead     = false;
        this.onGround = false;
        this.dir      = -1;
    }

    _moveX() {
        // Phase 12: skip tile loop when not moving horizontally
        if (this.velX === 0) return;

        this.x += this.velX;
        const ts  = this.tileSize;
        const col = this.velX > 0
            ? Math.floor((this.x + this.width) / ts)
            : Math.floor(this.x / ts);

        const topRow    = Math.floor(this.y / ts);
        const bottomRow = Math.floor((this.y + this.height - 1) / ts);

        for (let row = topRow; row <= bottomRow; row++) {
            if (isSolid(this.map, col, row)) {
                if (this.velX > 0) { this.x = col * ts - this.width; this.dir = -1; }
                else               { this.x = (col + 1) * ts;        this.dir =  1; }
                this.velX = 0;
                return;
            }
        }

        // Also block against sides of extraSolids (boxes / bridges)
        for (let i = 0; i < this.extraSolids.length; i++) {
            const solid = this.extraSolids[i];
            if (!solid || !solid.isSolid || !solid.isSolid()) continue;
            const b = solid.getBounds();
            // No vertical overlap — skip
            if (this.y + this.height <= b.y || this.y >= b.y + b.height) continue;
            if (this.velX > 0 && this.x + this.width > b.x && this.x < b.x) {
                this.x    = b.x - this.width;
                this.dir  = -1;
                this.velX = 0;
                return;
            }
            if (this.velX < 0 && this.x < b.x + b.width && this.x + this.width > b.x + b.width) {
                this.x    = b.x + b.width;
                this.dir  = 1;
                this.velX = 0;
                return;
            }
        }
    }

    _moveY() {
        if (this.velY === 0) return; // Phase 12: skip when idle

        const prevY = this.y;
        this.y += this.velY;
        const ts       = this.tileSize;
        const leftCol  = Math.floor(this.x / ts);
        const rightCol = Math.floor((this.x + this.width - 1) / ts);

        if (this.velY > 0) {
            // ── Falling: tile floor ───────────────────────────────────
            const row = Math.floor((this.y + this.height) / ts);
            for (let col = leftCol; col <= rightCol; col++) {
                if (isSolid(this.map, col, row)) {
                    this.y        = row * ts - this.height;
                    this.velY     = 0;
                    this.onGround = true;
                    return;
                }
            }

            // ── Falling: extraSolids top surface (boxes / bridges) ────
            const prevBottom = prevY + this.height;
            const currBottom = this.y + this.height;
            for (let i = 0; i < this.extraSolids.length; i++) {
                const solid = this.extraSolids[i];
                if (!solid || !solid.isSolid || !solid.isSolid()) continue;
                const b = solid.getBounds();
                if (this.x + this.width <= b.x + 2 || this.x >= b.x + b.width - 2) continue;
                if (prevBottom <= b.y && currBottom >= b.y) {
                    this.y        = b.y - this.height;
                    this.velY     = 0;
                    this.onGround = true;
                    return;
                }
            }
            this.onGround = false;

        } else {
            // ── Rising: tile ceiling ──────────────────────────────────
            const row = Math.floor(this.y / ts);
            for (let col = leftCol; col <= rightCol; col++) {
                if (isSolid(this.map, col, row)) {
                    this.y    = (row + 1) * ts;
                    this.velY = 0;
                    break;
                }
            }

            // ── Rising: blocked by extraSolid bottom (no phasing through) ──
            const prevTop = prevY;
            const currTop = this.y;
            for (let i = 0; i < this.extraSolids.length; i++) {
                const solid = this.extraSolids[i];
                if (!solid || !solid.isSolid || !solid.isSolid()) continue;
                const b         = solid.getBounds();
                const boxBottom = b.y + b.height;
                if (this.x + this.width <= b.x + 2 || this.x >= b.x + b.width - 2) continue;
                if (prevTop >= boxBottom && currTop <= boxBottom) {
                    this.y    = boxBottom;
                    this.velY = 0;
                    break;
                }
            }
        }

        // World-floor clamp
        const mapH = this.map.length * ts;
        if (this.y + this.height >= mapH) {
            this.y        = mapH - this.height;
            this.velY     = 0;
            this.onGround = true;
        }
    }

    overlaps(other) {
        return (
            this.x              < other.x + other.width  &&
            this.x + this.width > other.x                &&
            this.y              < other.y + other.height &&
            this.y + this.height> other.y
        );
    }

    update() {}
    draw()   {}
}

// ─────────────────────────────────────────────────────────────
//  FLY ENEMY
// ─────────────────────────────────────────────────────────────
export class FlyEnemy extends Enemy {
    constructor(startX, startY, map, tileSize, opts = {}) {
        super(startX, startY, map, tileSize);

        this.gravity    = 0;
        this.speed      = opts.speed          ?? 2;
        this.floatAmp   = opts.floatAmplitude ?? 32;
        this.floatSpd   = opts.floatSpeed     ?? 0.34;
        this.floatTimer = Math.random() * Math.PI * 2;

        this.dir      = -1;
        this._SW      = 69;
        this._SH      = 52;
        this.renderW  = 82;
        this.renderH  = 62;
        this.width    = 44;
        this.height   = 40;

        this.floatBaseY = startY - this.height;
        this.y          = this.floatBaseY;
        this.prevY      = this.y;
        this.rowIndex   = 0; // 0 or 1

        // Phase 12: cache sheet reference once
        this._sheet = document.getElementById("flySheet0");
    }

    update() {
        if (this.dead) return;

        this.x += this.speed * this.dir;

        const mapW = this.map[0].length * this.tileSize;
        if (this.x + this.width < 0) this.x = mapW;

        this.prevY = this.y;
        this.floatTimer += this.floatSpd;
        this.y = this.floatBaseY + Math.sin(this.floatTimer) * this.floatAmp;

        // Phase 12: XOR toggle is faster than branch
        this.rowIndex ^= 1;
    }

    reset() {
        super.reset();
        this.floatTimer = Math.random() * Math.PI * 2;
        this.floatBaseY = this.startY - this.height;
    }

    draw(ctx, camera) {
        if (this.dead) return;

        const drawX = Math.round(this.x - camera.x);
        const drawY = Math.round(this.y - camera.y);

        if (!this._sheet || !this._sheet.complete || !this._sheet.naturalWidth) {
            ctx.fillStyle = "#27ae60";
            ctx.fillRect(drawX, drawY, this.width, this.height);
            return;
        }

        const offX = Math.round((this.width  - this.renderW) / 2);
        const offY = Math.round((this.height - this.renderH) / 2);

        ctx.drawImage(
            this._sheet,
            0, this.rowIndex * this._SH, this._SW, this._SH,
            drawX + offX, drawY + offY, this.renderW, this.renderH
        );
    }
}

// ─────────────────────────────────────────────────────────────
//  WALKER ENEMY  (slime)
// ─────────────────────────────────────────────────────────────
export class WalkerEnemy extends Enemy {
    constructor(startX, startY, map, tileSize, opts = {}) {
        super(startX, startY, map, tileSize);

        this.speed        = opts.speed     ?? 1.5;
        this._COLS        = 1;
        this._ROWS        = 2;
        this._SW          = 52;
        this._SH          = 33;
        this._animTimer   = 0;
        this._animSpeed   = opts.animSpeed ?? 40;
        this._frame       = 0;
        this._totalFrames = this._COLS * this._ROWS;

        this.width        = 44;
        this.height       = 34;
        this.y            = startY - this.height;
        this.renderW      = 54;
        this.renderH      = 54;
        this.visualOffsetY= -4;

        // Phase 12: cache sheet once
        this._sheet = document.getElementById("slimeSheet0");
    }

    update() {
        if (this.dead) return;
        // Stay frozen until the camera has revealed this enemy
        if (!this.activated) return;

        this.velX = -this.speed;
        this._applyGravity();
        this._moveX();
        this._moveY();

        const mapW = this.map[0].length * this.tileSize;
        if (this.x + this.width < 0) this.x = mapW;

        this._animTimer++;
        if (this._animTimer >= this._animSpeed) {
            this._animTimer = 0;
            this._frame = (this._frame + 1) % this._totalFrames;
        }
    }

    reset() {
        super.reset();
        this._animTimer = 0;
        this._frame     = 0;
    }

    draw(ctx, camera) {
        if (this.dead) return;

        const drawX = Math.round(this.x - camera.x);
        const drawY = Math.round(this.y - camera.y);

        if (!this._sheet || !this._sheet.complete || !this._sheet.naturalWidth) {
            ctx.fillStyle = "#8e44ad";
            ctx.fillRect(drawX, drawY, this.width, this.height);
            return;
        }

        const col  = this._frame % this._COLS;
        const row  = Math.floor(this._frame / this._COLS);
        const srcX = col * this._SW;
        const srcY = row * this._SH;
        const offX = Math.round((this.width  - this.renderW) / 2);
        const offY = Math.round(this.height  - this.renderH + this.visualOffsetY);

        ctx.drawImage(
            this._sheet,
            srcX, srcY, this._SW, this._SH,
            drawX + offX, drawY + offY, this.renderW, this.renderH
        );
    }
}

// ─────────────────────────────────────────────────────────────
//  JUMPER ENEMY  (madblock)
// ─────────────────────────────────────────────────────────────
export class JumperEnemy extends Enemy {
    constructor(startX, startY, map, tileSize, opts = {}) {
        super(startX, startY, map, tileSize);

        this.jumpForce    = opts.jumpForce    ?? -12;
        this.jumpInterval = opts.jumpInterval ?? 120;
        this.jumpTimer    = 0;
        this.dir          = 1;

        this._COLS     = 2;
        this._ROWS     = 2;
        this._SW       = 54;
        this._SH       = 64;
        this._renderW  = 80;
        this._renderH  = 80;
        this._animTimer= 0;
        this._animSpeed= opts.animSpeed ?? 18;
        this._frame    = 0;

        this.GROUND_FRAMES = [
            { col: 0, row: 0 },
            { col: 1, row: 0 },
        ];
        this.JUMP_FRAME = { col: 0, row: 1 };

        this.width        = 54;
        this.height       = 54;
        this.y            = startY - this.height;
        this.spawnX       = startX;
        this.visualYOffset= -6;

        // Phase 12: cache sheet once
        this._sheet = document.getElementById("madblockSheet0");
    }

    update() {
        if (this.dead) return;

        this.x    = this.spawnX;
        this.velX = 0;

        if (this.onGround) {
            this.jumpTimer++;
            if (this.jumpTimer >= this.jumpInterval) {
                this.velY     = this.jumpForce;
                this.onGround = false;
                this.jumpTimer= 0;
            }
            this._animTimer++;
            if (this._animTimer >= this._animSpeed) {
                this._animTimer = 0;
                this._frame     = 1 - this._frame; // toggle 0↔1
            }
        } else {
            this._animTimer = 0;
        }

        this._applyGravity();
        this._moveY();
    }

    reset() {
        super.reset();
        this.jumpTimer  = 0;
        this._animTimer = 0;
        this._frame     = 0;
    }

    draw(ctx, camera) {
        if (this.dead) return;

        const drawX = Math.round(this.x - camera.x);
        const drawY = Math.round(this.y - camera.y);

        if (!this._sheet || !this._sheet.complete || !this._sheet.naturalWidth) {
            ctx.fillStyle = "#e67e22";
            ctx.fillRect(drawX, drawY, this.width, this.height);
            return;
        }

        const frame = this.onGround
            ? (this.GROUND_FRAMES[this._frame] || this.GROUND_FRAMES[0])
            : this.JUMP_FRAME;

        const srcX = frame.col * this._SW;
        const srcY = frame.row * this._SH;
        const offX = Math.round((this.width - this._renderW) / 2);
        const offY = this.height - this._renderH + this.visualYOffset;

        ctx.drawImage(
            this._sheet,
            srcX, srcY, this._SW, this._SH,
            drawX + offX, drawY + offY, this._renderW, this._renderH
        );
    }
}

// ─────────────────────────────────────────────────────────────
//  PATROL ENEMY  (madgreen)
// ─────────────────────────────────────────────────────────────
export class PatrolEnemy extends Enemy {
    constructor(startX, startY, map, tileSize, opts = {}) {
        super(startX, startY, map, tileSize);

        this.speed       = opts.speed       ?? 2.5;
        this.patrolLeft  = opts.patrolLeft  ?? (startX - 200);
        this.patrolRight = opts.patrolRight ?? (startX + 200);

        this._SW        = 58;
        this._SH        = 60;
        this._animTimer = 0;
        this._animSpeed = opts.animSpeed ?? 14;
        this._frame     = 0;

        this.renderW      = 70;
        this.renderH      = 74;
        this.visualYOffset= 0;
        this.width        = 44;
        this.height       = 48;
        this.y            = startY - this.height;

        // Phase 12: cache sheet once
        this._sheet = document.getElementById("madgreenSheet0");
    }

    update() {
        if (this.dead) return;

        if (this.x <= this.patrolLeft)              this.dir =  1;
        if (this.x + this.width >= this.patrolRight)this.dir = -1;

        this.velX = this.speed * this.dir;
        this._applyGravity();
        this._moveX();
        this._moveY();

        if (this.velX !== 0) {
            this._animTimer++;
            if (this._animTimer >= this._animSpeed) {
                this._animTimer = 0;
                this._frame     = 1 - this._frame;
            }
        } else {
            this._frame     = 0;
            this._animTimer = 0;
        }
    }

    reset() {
        super.reset();
        this._animTimer = 0;
        this._frame     = 0;
    }

    draw(ctx, camera) {
        if (this.dead) return;

        const drawX = Math.round(this.x - camera.x);
        const drawY = Math.round(this.y - camera.y);

        if (!this._sheet || !this._sheet.complete || !this._sheet.naturalWidth) {
            ctx.fillStyle = "#2ecc71";
            ctx.fillRect(drawX, drawY, this.width, this.height);
            return;
        }

        const srcX = this._frame * this._SW;
        const offX = Math.round((this.width  - this.renderW) / 2);
        const offY = Math.round( this.height - this.renderH + this.visualYOffset);

        if (this.dir === 1) {
            ctx.drawImage(
                this._sheet,
                srcX, 0, this._SW, this._SH,
                drawX + offX, drawY + offY, this.renderW, this.renderH
            );
        } else {
            // Flip horizontally without ctx.save/restore (Phase 12: skip state push)
            ctx.transform(-1, 0, 0, 1, drawX + offX + this.renderW, 0);
            ctx.drawImage(
                this._sheet,
                srcX, 0, this._SW, this._SH,
                0, drawY + offY, this.renderW, this.renderH
            );
            // Reset the horizontal flip with another transform
            ctx.transform(-1, 0, 0, 1, drawX + offX + this.renderW, 0);
        }
    }
}