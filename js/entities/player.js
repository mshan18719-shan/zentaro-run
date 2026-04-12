// * Phase 12 optimizations:
// *  • Sheet images cached once in constructor (no DOM lookup per frame)
// *  • getPickupBounds() result cached each frame (called by every coin/star)
// *  • ctx.save/restore removed — caller (main.js) owns imageSmoothingEnabled
// *  • Math.round() called once per axis, not separately for anchorX/finalX

import { isKeyDown } from "../core/input.js";
import { isSolid, isHazard } from "../world/map.js";

const SPRITE_W = 90;
const SPRITE_H = 164;
const MAX_AIR_JUMPS = 1;
const RUN_ANIM_SPEED = 7;
const IDLE_ANIM_SPEED = 50;

const FRAMES = {
    jumpUp: { sheet: "jump", sx: 8, sy: 0, sw: 65, sh: 100, ox: 0, oy: 0 },
    jumpDown: { sheet: "jump", sx: 81, sy: 0, sw: 68, sh: 100, ox: 0, oy: 0 },
    run: [
        { sheet: "jump", sx: 0, sy: 107, sw: 65, sh: 100, ox: 0, oy: -4 },
        { sheet: "jump", sx: 65, sy: 108, sw: 65, sh: 100, ox: 0, oy: -2 },
        { sheet: "jump", sx: 153, sy: 108, sw: 65, sh: 100, ox: 0, oy: 0 },
    ],
    idle: [
        { sheet: "walk", sx: 0, sy: 104, sw: 65, sh: 100, ox: 0, oy: 1 },
        { sheet: "walk", sx: 130, sy: 98, sw: 65, sh: 100, ox: 0, oy: 4 },
    ],
};

export class Player {
    constructor(map, tileSize) {
        // * Phase 12: cache sheets at construction time — not per draw call
        this.jumpSheet = document.getElementById("heroSheet0");
        this.walkSheet = document.getElementById("heroSheet1");

        this.map = map;
        this.tileSize = tileSize;

        this.width = 75;
        this.height = 150;
        this.speed = 5;
        this.velX = 0;
        this.velY = 0;
        this.gravity = 0.55;
        this.jumpForce = -14;
        this.onGround = false;
        this.jumpsLeft = MAX_AIR_JUMPS;
        this.jumpWasDown = false;

        const groundRow = map.length - 1;
        this.x = 270;
        this.y = groundRow * tileSize - this.height;

        this.facing = 1;
        this.frameIndex = 0;
        this.animTimer = 0;
        this.isMoving = false;
        this.isJumping = false;

        this.health = 3;
        this.score = 0;
        this.dead = false;
        this.invincible = 0;

        this.sinking = false;
        this.sinkSpeed = 2.2;
        this.sinkAccel = 0.12;

        this.extraSolids = [];

        this.onBridge = false;

        // ! Phase 12: pre-allocate pickup bounds object to avoid GC per frame
        this._pickupBounds = { x: 0, y: 0, width: 0, height: 0 };

    }

    update() {
        // ! Reset bridge-riding flag; MovingBridge.carryPlayer() sets it back
        // ! to true each frame if the player is still standing on a bridge.
        this.onBridge = false;

        if (this.sinking) {
            this.velX = 0;
            this.velY = 0;
            this.y += this.sinkSpeed;
            this.sinkSpeed += this.sinkAccel;
            this.isMoving = false;
            this.isJumping = false;
            return;
        }

        if (this.dead) return;
        if (this.invincible > 0) this.invincible--;

        // * ── Horizontal movement ──
        this.velX = 0;
        if (isKeyDown("ArrowRight") || isKeyDown("d") || isKeyDown("D")) {
            this.velX = this.speed;
            this.facing = 1;
            this.isMoving = true;
        } else if (isKeyDown("ArrowLeft") || isKeyDown("a") || isKeyDown("A")) {
            this.velX = -this.speed;
            this.facing = -1;
            this.isMoving = true;
        } else {
            this.isMoving = false;
        }

        // ! ── Multi-jump ───
        const jumpKeyDown =
            isKeyDown("ArrowUp") || isKeyDown("w") || isKeyDown("W") || isKeyDown(" ");

        if (jumpKeyDown && !this.jumpWasDown) {
            if (this.onGround || this.jumpsLeft > 0) {
                const wasOnGround = this.onGround;
                this.velY = this.jumpForce;
                this.onGround = false;
                if (!wasOnGround) this.jumpsLeft = Math.max(0, this.jumpsLeft - 1);
            }
        }
        this.jumpWasDown = jumpKeyDown;

        // ? ── Gravity ───
        this.isJumping = !this.onGround;
        this.velY += this.gravity;
        if (this.velY > 18) this.velY = 18;

        this.moveX();
        this.moveY();
        this.isJumping = !this.onGround;
        this.checkHazards();

        // todo: ── Animation ───
        // * isJumping is true when not on ground, but if the player is riding
        // * a moving bridge we must show as grounded for animation purposes.
        const animInAir = this.isJumping && !this.onBridge;
        if (animInAir) {
            this.frameIndex = 0;
        } else if (this.isMoving) {
            this.animTimer++;
            if (this.animTimer >= RUN_ANIM_SPEED) {
                this.animTimer = 0;
                this.frameIndex = (this.frameIndex + 1) % FRAMES.run.length;
            }
        } else {
            this.animTimer++;
            if (this.animTimer >= IDLE_ANIM_SPEED) {
                this.animTimer = 0;
                this.frameIndex = (this.frameIndex + 1) % FRAMES.idle.length;
            }
        }
    }

    // * Phase 12: mutates cached object — no allocation per frame
    getPickupBounds() {
        const offsetX = Math.round((this.width - SPRITE_W) / 2);
        const offsetY = this.height - SPRITE_H;
        this._pickupBounds.x = this.x + offsetX + 8;
        this._pickupBounds.y = this.y + offsetY + 6;
        this._pickupBounds.width = SPRITE_W - 16;
        this._pickupBounds.height = SPRITE_H - 12;
        return this._pickupBounds;
    }

    hit(damage = 1) {
        if (this.invincible > 0 || this.dead || this.sinking) return;
        this.health -= damage;
        this.invincible = 90;
        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
        }
    }

    checkHazards() {
        if (this.dead || this.sinking) return;

        const ts = this.tileSize;

        // ── WATER ─────────────────────────────────────────────────────────
        const FOOT_HEIGHT = 28;
        const waterLeft = this.x + 18;
        const waterRight = this.x + this.width - 18;
        const waterTop = this.y + this.height - FOOT_HEIGHT;
        const waterBottom = this.y + this.height;

        const wL = Math.floor(waterLeft / ts);
        const wR = Math.floor((waterRight - 1) / ts);
        const wT = Math.floor(waterTop / ts);
        const wB = Math.floor((waterBottom - 1) / ts);

        outer:
        for (let r = wT; r <= wB; r++) {
            for (let c = wL; c <= wR; c++) {
                if (r < 0 || r >= this.map.length || c < 0 || c >= this.map[0].length) continue;
                if (isHazard(this.map, c, r) === "water") {
                    this.health = 0;
                    this.dead = true;
                    this.sinking = true;
                    this.onGround = false;
                    this.velX = 0;
                    this.velY = 0;
                    this.sinkSpeed = Math.max(2.2, this.sinkSpeed);
                    break outer;
                }
            }
        }
        if (this.sinking) return;

        // ── SPIKES ────────────────────────────────────────────────────────
        if (this.invincible > 0) return;

        const bodyLeft = this.x + 8;
        const bodyRight = this.x + this.width - 8;
        const bodyTop = this.y;

        const lC = Math.floor(bodyLeft / ts);
        const rC = Math.floor((bodyRight - 1) / ts);
        const tR = Math.floor(bodyTop / ts);
        const hR = Math.floor((bodyTop + 35) / ts);

        let touchingSpike = false;
        loop:
        for (let r = tR; r <= hR; r++) {
            for (let c = lC; c <= rC; c++) {
                if (r < 0 || r >= this.map.length || c < 0 || c >= this.map[0].length) continue;
                if (isHazard(this.map, c, r) === "spike") { touchingSpike = true; break loop; }
            }
        }
        if (touchingSpike) this.hit(1);
    }

    setExtraSolids(solids) {
        this.extraSolids = Array.isArray(solids) ? solids : [];
    }

    moveX() {
        if (this.velX === 0) return; // Phase 12: skip tile scan when still

        this.x += this.velX;
        const ts = this.tileSize;
        const col = this.velX > 0
            ? Math.floor((this.x + this.width) / ts)
            : Math.floor(this.x / ts);

        const topRow = Math.floor(this.y / ts);
        const bottomRow = Math.floor((this.y + this.height - 1) / ts);

        for (let row = topRow; row <= bottomRow; row++) {
            if (isSolid(this.map, col, row)) {
                if (this.velX > 0) this.x = col * ts - this.width;
                else this.x = (col + 1) * ts;
                this.velX = 0;
                break;
            }
        }

        // Block player from passing through sides of extraSolids (boxes / bridges)
        if (this.velX !== 0) {
            for (let i = 0; i < this.extraSolids.length; i++) {
                const solid = this.extraSolids[i];
                if (!solid || !solid.isSolid || !solid.isSolid()) continue;
                const b = solid.getBounds();
                // No vertical overlap with this solid — skip
                if (this.y + this.height <= b.y || this.y >= b.y + b.height) continue;
                // Moving right: player walked into left face of box
                if (this.velX > 0 && this.x + this.width > b.x && this.x < b.x) {
                    this.x = b.x - this.width;
                    this.velX = 0;
                    break;
                }
                // Moving left: player walked into right face of box
                if (this.velX < 0 && this.x < b.x + b.width && this.x + this.width > b.x + b.width) {
                    this.x = b.x + b.width;
                    this.velX = 0;
                    break;
                }
            }
        }

        const mapW = this.map[0].length * ts;
        this.x = Math.max(0, Math.min(this.x, mapW - this.width));
    }

    moveY() {
        const prevY = this.y;
        this.y += this.velY;

        const ts = this.tileSize;
        const leftCol = Math.floor(this.x / ts);
        const rightCol = Math.floor((this.x + this.width - 1) / ts);

        if (this.velY > 0) {
            const row = Math.floor((this.y + this.height) / ts);
            for (let col = leftCol; col <= rightCol; col++) {
                if (isSolid(this.map, col, row)) {
                    this.y = row * ts - this.height;
                    this.velY = 0;
                    this.onGround = true;
                    this.jumpsLeft = MAX_AIR_JUMPS;
                    return;
                }
            }

            const prevBottom = prevY + this.height;
            const currBottom = this.y + this.height;

            for (let i = 0; i < this.extraSolids.length; i++) {
                const solid = this.extraSolids[i];
                if (!solid || !solid.isSolid || !solid.isSolid()) continue;

                const b = solid.getBounds();
                if (this.x + this.width <= b.x + 4 || this.x >= b.x + b.width - 4) continue;
                if (prevBottom <= b.y && currBottom >= b.y) {
                    this.y = b.y - this.height;
                    this.velY = 0;
                    this.onGround = true;
                    this.jumpsLeft = MAX_AIR_JUMPS;
                    return;
                }
            }
            this.onGround = false;

        } else if (this.velY < 0) {
            const prevTop = prevY;
            const currTop = this.y;

            for (let i = 0; i < this.extraSolids.length; i++) {
                const solid = this.extraSolids[i];
                if (!solid || !solid.isSolid || !solid.isSolid()) continue;

                const b = solid.getBounds();
                const boxBottom = b.y + b.height;
                if (this.x + this.width <= b.x + 4 || this.x >= b.x + b.width - 4) continue;
                if (prevTop >= boxBottom && currTop <= boxBottom) {
                    this.y = boxBottom;
                    this.velY = 0;
                    if (!solid.exhausted && typeof solid._triggerHit === "function")
                        solid._triggerHit(this);
                    return;
                }
            }

            const row = Math.floor(this.y / ts);
            for (let col = leftCol; col <= rightCol; col++) {
                if (isSolid(this.map, col, row)) {
                    this.y = (row + 1) * ts;
                    this.velY = 0;
                    return;
                }
            }
        }

        const mapH = this.map.length * ts;
        if (this.y + this.height >= mapH) {
            this.y = mapH - this.height;
            this.velY = 0;
            this.onGround = true;
            this.jumpsLeft = MAX_AIR_JUMPS;
        }
    }

    getCurrentFrame() {
        if (this.isJumping && !this.onBridge)
            return this.velY < 0 ? FRAMES.jumpUp : FRAMES.jumpDown;
        if (this.isMoving)
            return FRAMES.run[this.frameIndex] || FRAMES.run[0];
        return FRAMES.idle[this.frameIndex] || FRAMES.idle[0];
    }

    draw(ctx, camera) {
        // * Invincibility flicker
        if (!this.sinking && this.dead) {
            // * Static dead pose — fall through to draw below
        } else if (this.invincible > 0 && Math.floor(this.invincible / 5) % 2 === 0) {
            return;
        }

        const frame = this.getCurrentFrame();
        const sheet = frame.sheet === "jump" ? this.jumpSheet : this.walkSheet;
        if (!sheet) return;

        const drawX = Math.round(this.x - camera.x);
        const drawY = Math.round(this.y - camera.y);

        const anchorX = drawX + (this.width >> 1); // width/2 via bit-shift
        const bridgeVisualDrop = this.onBridge ? 13 : 3;
        const anchorY = drawY + this.height - 6 + bridgeVisualDrop;

        const finalX = Math.round(anchorX - SPRITE_W / 2 + (frame.ox || 0));
        const finalY = Math.round(anchorY - SPRITE_H + (frame.oy || 0));

        // * Phase 12: no ctx.save/restore — caller sets imageSmoothingEnabled = false
        if (this.facing === -1) {
            ctx.transform(-1, 0, 0, 1, anchorX * 2, 0);
            ctx.drawImage(
                sheet,
                frame.sx, frame.sy, frame.sw, frame.sh,
                Math.round(anchorX - SPRITE_W / 2 - (frame.ox || 0)) - anchorX * 2 + anchorX * 2,
                finalY, SPRITE_W, SPRITE_H
            );
            // Undo the flip
            ctx.transform(-1, 0, 0, 1, anchorX * 2, 0);
        } else {
            ctx.drawImage(
                sheet,
                frame.sx, frame.sy, frame.sw, frame.sh,
                finalX, finalY, SPRITE_W, SPRITE_H
            );
        }

    }
}