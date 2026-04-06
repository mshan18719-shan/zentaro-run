// ══════════════════════════════════════════════════════════════
//  coin.js  –  Coin, TreasureBox, Star
//  Phase 12 optimizations:
//    • Frame arrays are SHARED constants (not per-instance allocations)
//    • Sheet images cached at module level — not per-draw DOM lookup
//    • Coin.overlaps / Star.overlaps reuse player._pickupBounds (no new object)
//    • ctx.save/restore removed — caller (main.js) owns state
//    • PopCoin pool inside TreasureBox (max 4 popcoins, recycled)
// ══════════════════════════════════════════════════════════════

// ── Shared constants (allocated once at module load) ──────────
const COIN_FRAMES = Object.freeze([
    { sx:   0, sy:  8, sw: 42, sh: 43 },
    { sx:  42, sy:  4, sw: 40, sh: 47 },
    { sx:  86, sy:  0, sw: 30, sh: 51 },
    { sx: 136, sy: 10, sw: 30, sh: 41 },
    { sx: 172, sy: 10, sw: 40, sh: 41 },
    { sx:   8, sy: 53, sw: 26, sh: 47 },
    { sx:  52, sy: 56, sw: 24, sh: 44 },
    { sx:  88, sy: 58, sw: 26, sh: 42 },
]);

const POPCOIN_FRAMES = Object.freeze([
    { sx:   0, sy:  8, sw: 42, sh: 43 },
    { sx:  42, sy:  4, sw: 40, sh: 47 },
    { sx:  86, sy:  0, sw: 30, sh: 51 },
    { sx: 136, sy: 10, sw: 30, sh: 41 },
]);

// Phase 12: single DOM lookup at module load
let _coinSheet = null;
function getCoinSheet() {
    if (!_coinSheet) _coinSheet = document.getElementById("coinsSheet0");
    return _coinSheet;
}

let _starSheet = null;
function getStarSheet() {
    if (!_starSheet) _starSheet = document.getElementById("starSheet");
    return _starSheet;
}

// ──────────────────────────────────────────────────────────────
//  Coin
// ──────────────────────────────────────────────────────────────
export class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.collected  = false;
        this.bobTimer   = Math.random() * Math.PI * 2;

        // Phase 12: no per-instance frames array
        this.TOTAL_FRAMES = COIN_FRAMES.length;
        this.renderW    = 60;
        this.renderH    = 65;
        this.width      = 40;
        this.height     = 50;
        this.frameIndex = 0;
        this.animTimer  = 0;
        this.animSpeed  = 12;
    }

    update() {
        if (this.collected) return;
        this.bobTimer += 0.05;
        this.animTimer++;
        if (this.animTimer >= this.animSpeed) {
            this.animTimer  = 0;
            this.frameIndex = (this.frameIndex + 1) % this.TOTAL_FRAMES;
        }
    }

    overlaps(player) {
        const offsetX = (this.renderW - this.width)  / 2;
        const bob     = Math.sin(this.bobTimer) * 5;
        const cx      = this.x + offsetX;
        const cy      = this.y + (this.renderH - this.height) / 2 + bob;

        // Phase 12: reuse cached bounds — no object allocation
        const pb = player.getPickupBounds
            ? player.getPickupBounds()
            : { x: player.x, y: player.y, width: player.width, height: player.height };

        return (
            cx              < pb.x + pb.width  &&
            cx + this.width > pb.x             &&
            cy              < pb.y + pb.height &&
            cy + this.height> pb.y
        );
    }

    draw(ctx, camera) {
        if (this.collected) return;
        const bob   = Math.sin(this.bobTimer) * 5;
        const dx    = Math.round(this.x - camera.x);
        const dy    = Math.round(this.y - camera.y + bob);
        const sheet = getCoinSheet();

        if (sheet && sheet.complete && sheet.naturalWidth > 0) {
            const frame = COIN_FRAMES[this.frameIndex];
            // Phase 12: no ctx.save/restore — state managed by main.js
            ctx.drawImage(sheet, frame.sx, frame.sy, frame.sw, frame.sh,
                dx, dy, this.renderW, this.renderH);
        } else {
            const r = Math.min(this.renderW, this.renderH) / 2;
            ctx.fillStyle   = "#f1c40f";
            ctx.strokeStyle = "#e67e22";
            ctx.lineWidth   = 2;
            ctx.beginPath();
            ctx.arc(dx + this.renderW / 2, dy + this.renderH / 2, r - 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }
}

// ──────────────────────────────────────────────────────────────
//  PopCoin  (internal — not exported)
// ──────────────────────────────────────────────────────────────
class PopCoin {
    constructor() {
        this.x          = 0;
        this.y          = 0;
        this.velY       = -9;
        this.alpha      = 1;
        this.done       = false;
        this.frameIndex = 0;
        this.animTimer  = 0;
    }

    // Phase 12: re-init instead of new allocation
    init(x, y) {
        this.x          = x;
        this.y          = y;
        this.velY       = -9;
        this.alpha      = 1;
        this.done       = false;
        this.frameIndex = 0;
        this.animTimer  = 0;
    }

    update() {
        if (this.done) return;
        this.velY += 0.5;
        this.y    += this.velY;
        this.animTimer++;
        if (this.animTimer >= 6) {
            this.animTimer  = 0;
            this.frameIndex = (this.frameIndex + 1) % 4;
        }
        if (this.velY > 0) {
            this.alpha -= 0.035;
            if (this.alpha <= 0) this.done = true;
        }
    }

    draw(ctx, camera) {
        if (this.done) return;
        const sheet = getCoinSheet();
        const dx    = Math.round(this.x - camera.x);
        const dy    = Math.round(this.y - camera.y);

        const prevAlpha   = ctx.globalAlpha;
        ctx.globalAlpha   = Math.max(0, this.alpha);

        if (sheet && sheet.complete && sheet.naturalWidth > 0) {
            const f = POPCOIN_FRAMES[this.frameIndex];
            ctx.drawImage(sheet, f.sx, f.sy, f.sw, f.sh, dx - 20, dy, 40, 44);
        } else {
            ctx.fillStyle = "#f1c40f";
            ctx.beginPath();
            ctx.arc(dx, dy + 20, 14, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = prevAlpha; // restore without save/restore overhead
    }
}

// ──────────────────────────────────────────────────────────────
//  TreasureBox
// ──────────────────────────────────────────────────────────────
export class TreasureBox {
    static MAX_HITS = 3;

    constructor(col, row, tileSize, onCollect) {
        this.col       = col;
        this.row       = row;
        this.tileSize  = tileSize;
        this.onCollect = onCollect || (() => {});

        this.x = col * tileSize;
        this.y = row * tileSize;
        this.w = tileSize;
        this.h = tileSize;

        this.hitsLeft  = TreasureBox.MAX_HITS;
        this.exhausted = false;

        this._bumpOffset = 0;
        this._bumping    = false;
        this._bumpDir    = -1;
        this._BUMP_DIST  = 14;

        // Phase 12: fixed-size pool of 3 PopCoins (one per MAX_HIT)
        this._popPool = [new PopCoin(), new PopCoin(), new PopCoin()];
        this._popCoins= []; // active references (subset of _popPool)

        this._imgActive = document.getElementById("block14");
        this._ensureUsedImg();
    }

    _ensureUsedImg() {
        if (!document.getElementById("boxUsed")) {
            const img    = document.createElement("img");
            img.id       = "boxUsed";
            img.src      = "assets/boxitem-sheet1.png";
            img.hidden   = true;
            document.body.appendChild(img);
        }
        this._imgUsed = document.getElementById("boxUsed");
    }

    update(player) {
        // Update active pop-coins
        for (let i = 0; i < this._popCoins.length; i++) this._popCoins[i].update();
        // Remove done ones
        this._popCoins = this._popCoins.filter(pc => !pc.done);

        // Bump animation
        if (this._bumping) {
            const speed = 3;
            if (this._bumpDir === -1) {
                this._bumpOffset -= speed;
                if (this._bumpOffset <= -this._BUMP_DIST) this._bumpDir = 1;
            } else {
                this._bumpOffset += speed;
                if (this._bumpOffset >= 0) { this._bumpOffset = 0; this._bumping = false; }
            }
        }

        if (this.exhausted) return false;
        if (player.velY >= 0 || player.dead || player.sinking) return false;

        const px = player.x, py = player.y;
        const pw = player.width, ph = player.height;

        if (px + pw < this.x + 6 || px > this.x + this.w - 6) return false;

        const boxBottom = this.y + this.h;
        if (py > boxBottom || py < this.y - 4) return false;

        this._triggerHit(player);
        return true;
    }

    _triggerHit(player) {
        this.hitsLeft--;
        this._bumping   = true;
        this._bumpDir   = -1;
        this._bumpOffset= 0;

        // Phase 12: find an inactive pool slot instead of new PopCoin()
        let slot = null;
        for (let i = 0; i < this._popPool.length; i++) {
            if (this._popPool[i].done || !this._popCoins.includes(this._popPool[i])) {
                slot = this._popPool[i];
                break;
            }
        }
        if (slot) {
            slot.init(this.x + this.w / 2, this.y - 8);
            if (!this._popCoins.includes(slot)) this._popCoins.push(slot);
        }

        this.onCollect(50);
        if (this.hitsLeft <= 0) { this.hitsLeft = 0; this.exhausted = true; }
    }

    getBounds() {
        return { x: this.x, y: this.y + this._bumpOffset, width: this.w, height: this.h };
    }

    isSolid() { return true; }

    draw(ctx, camera) {
        const drawX = Math.round(this.x - camera.x);
        const drawY = Math.round(this.y - camera.y + this._bumpOffset);
        const ts    = this.tileSize;
        const img   = this.exhausted ? this._imgUsed : this._imgActive;

        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, drawX, drawY - 10, ts, ts + 10);
        } else {
            ctx.fillStyle   = this.exhausted ? "#8b7355" : "#f1c40f";
            ctx.strokeStyle = this.exhausted ? "#5a4a30" : "#e67e22";
            ctx.lineWidth   = 3;
            ctx.fillRect  (drawX + 3, drawY + 3, ts - 6, ts - 6);
            ctx.strokeRect(drawX + 3, drawY + 3, ts - 6, ts - 6);
            if (!this.exhausted) {
                ctx.fillStyle     = "#fff";
                ctx.font          = `bold ${Math.round(ts * 0.55)}px Arial`;
                ctx.textAlign     = "center";
                ctx.textBaseline  = "middle";
                ctx.fillText("?", drawX + ts / 2, drawY + ts / 2);
            }
        }

        for (let i = 0; i < this._popCoins.length; i++)
            this._popCoins[i].draw(ctx, camera);
    }
}

// ──────────────────────────────────────────────────────────────
//  Star
// ──────────────────────────────────────────────────────────────
export class Star {
    static COLS        = 3;
    static ROWS        = 3;
    static FRAME_COUNT = 9;
    static RENDER_W    = 50;
    static RENDER_H    = 50;
    static HIT_W       = 48;
    static HIT_H       = 48;

    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.collected  = false;
        this.bobTimer   = Math.random() * Math.PI * 2;
        this.frameIndex = 0;
        this.animTimer  = 0;
        this.animSpeed  = 14;

        // Phase 12: cache frameW/H once sheet is ready (lazy)
        this._frameW = 0;
        this._frameH = 0;
    }

    _ensureFrameSize(sheet) {
        if (!this._frameW && sheet && sheet.naturalWidth) {
            this._frameW = Math.floor(sheet.naturalWidth  / Star.COLS) - 5;
            this._frameH = Math.floor(sheet.naturalHeight / Star.ROWS) - 6;
        }
    }

    update() {
        if (this.collected) return;
        this.bobTimer += 0.04;
        this.animTimer++;
        if (this.animTimer >= this.animSpeed) {
            this.animTimer  = 0;
            this.frameIndex = (this.frameIndex + 1) % Star.FRAME_COUNT;
        }
    }

    overlaps(player) {
        const offsetX = (Star.RENDER_W - Star.HIT_W) / 2;
        const offsetY = (Star.RENDER_H - Star.HIT_H) / 2;
        const bob     = Math.sin(this.bobTimer) * 6;
        const sx      = this.x + offsetX;
        const sy      = this.y + offsetY + bob;

        const pb = player.getPickupBounds
            ? player.getPickupBounds()
            : { x: player.x, y: player.y, width: player.width, height: player.height };

        return (
            sx             < pb.x + pb.width  &&
            sx + Star.HIT_W> pb.x             &&
            sy             < pb.y + pb.height &&
            sy + Star.HIT_H> pb.y
        );
    }

    draw(ctx, camera) {
        if (this.collected) return;

        const bob   = Math.sin(this.bobTimer) * 6;
        const dx    = Math.round(this.x - camera.x);
        const dy    = Math.round(this.y - camera.y + bob);
        const sheet = getStarSheet();

        if (sheet && sheet.complete && sheet.naturalWidth > 0) {
            this._ensureFrameSize(sheet);
            const col  = this.frameIndex % Star.COLS;
            const row  = Math.floor(this.frameIndex / Star.COLS);
            const srcX = col * this._frameW;
            const srcY = row * this._frameH;

            ctx.drawImage(
                sheet,
                srcX, srcY, this._frameW, this._frameH,
                dx, dy, Star.RENDER_W, Star.RENDER_H
            );
        } else {
            ctx.fillStyle   = "#FFD700";
            ctx.strokeStyle = "#FFA500";
            ctx.lineWidth   = 2;
            _drawStarShape(ctx, dx + Star.RENDER_W / 2, dy + Star.RENDER_H / 2, 5, 22, 10);
            ctx.fill();
            ctx.stroke();
        }
    }
}

function _drawStarShape(ctx, cx, cy, points, outerR, innerR) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const r     = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI / points) * i - Math.PI / 2;
        i === 0
            ? ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
            : ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    }
    ctx.closePath();
}
